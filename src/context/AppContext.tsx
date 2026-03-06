import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { socket } from "../lib/socket";
import { useNotifications } from "../hooks/useNotifications";
import { playSound } from "../lib/sounds";
import type { PresenceUser } from "../../shared/types";

export type AppStep = "name" | "lobby" | "room";

interface AppContextValue {
  // Navigation
  step: AppStep;
  setStep: (step: AppStep) => void;

  // Identity
  userName: string;
  setUserName: (name: string) => void;
  userId: string; // socket.id

  // Presence
  onlineUsers: PresenceUser[];

  // UI sounds
  soundEnabled: boolean;
  setSoundEnabled: (v: boolean) => void;
  sound: (type: "click" | "message" | "join") => void;

  // Notifications
  notifications: ReturnType<typeof useNotifications>["notifications"];
  addNotification: ReturnType<typeof useNotifications>["addNotification"];

  // Error banner
  error: string | null;
  setError: (msg: string | null) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [step, setStep] = useState<AppStep>("name");
  const [userName, setUserName] = useState("");
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { notifications, addNotification } = useNotifications();

  const sound = useCallback(
    (type: "click" | "message" | "join") => playSound(type, soundEnabled),
    [soundEnabled]
  );

  // Auto-dismiss error banner after 5 s
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 5000);
    return () => clearTimeout(t);
  }, [error]);

  // Global socket listeners that affect top-level app state
  useEffect(() => {
    socket.on("presence-update", setOnlineUsers);

    socket.on("name-set-success", () => {
      setStep("lobby");
      setError(null);
      sound("join");
      addNotification("Welcome to Nexus!", "success");
    });

    socket.on("error", (msg: string) => {
      setError(msg);
      addNotification(msg, "error");
    });

    return () => {
      socket.off("presence-update", setOnlineUsers);
      socket.off("name-set-success");
      socket.off("error");
    };
  }, [sound, addNotification]);

  const value: AppContextValue = {
    step,
    setStep,
    userName,
    setUserName,
    userId: socket.id ?? "",
    onlineUsers,
    soundEnabled,
    setSoundEnabled,
    sound,
    notifications,
    addNotification,
    error,
    setError,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

/** Must be used inside <AppProvider>. */
export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used inside <AppProvider>");
  return ctx;
}
