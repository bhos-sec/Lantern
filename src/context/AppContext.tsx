import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { socket } from '../lib/socket';
import { useNotifications } from '../hooks/useNotifications';
import { playSound } from '../lib/sounds';
import type { PresenceUser, RateLimitedPayload } from '@shared/types';
import { SOCKET_EVENTS } from '@shared/events';

export type AppStep = 'name' | 'lobby' | 'pre-join' | 'room';

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
  sound: (type: 'click' | 'message' | 'join') => void;

  // Notifications
  notifications: ReturnType<typeof useNotifications>['notifications'];
  addNotification: ReturnType<typeof useNotifications>['addNotification'];

  // Error banner
  error: string | null;
  setError: (msg: string | null) => void;

  // ── Pre-join pending room ───────────────────────────────────────────────
  /** The room ID the user intends to join — set before entering pre-join screen. */
  pendingRoomId: string | null;
  setPendingRoomId: (id: string | null) => void;
  /** The room password (if any) for the pending join. */
  pendingRoomPassword: string | undefined;
  setPendingRoomPassword: (pw: string | undefined) => void;
  /** Whether the pending room is being created (true) or joined (false). */
  pendingIsCreating: boolean;
  setPendingIsCreating: (v: boolean) => void;
  /** Whether the pending room should be private. */
  pendingIsPrivate: boolean;
  setPendingIsPrivate: (v: boolean) => void;

  // ── Single-session enforcement ──────────────────────────────────────────
  /** True when the server detected a duplicate session from the same device. */
  isDuplicateSession: boolean;
  /** True when another tab claimed this device's session via "Use This Tab". */
  isSessionTakenOver: boolean;
  /** Emit "take-over-session" to claim the current tab as the active session. */
  takeOverSession: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [step, setStep] = useState<AppStep>('name');
  const [userName, setUserName] = useState('');
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDuplicateSession, setIsDuplicateSession] = useState(false);
  const [isSessionTakenOver, setIsSessionTakenOver] = useState(false);

  // Pre-join pending room state
  const [pendingRoomId, setPendingRoomId] = useState<string | null>(null);
  const [pendingRoomPassword, setPendingRoomPassword] = useState<string | undefined>(undefined);
  const [pendingIsCreating, setPendingIsCreating] = useState(false);
  const [pendingIsPrivate, setPendingIsPrivate] = useState(false);

  const { notifications, addNotification } = useNotifications();

  const sound = useCallback(
    (type: 'click' | 'message' | 'join') => playSound(type, soundEnabled),
    [soundEnabled],
  );

  // Auto-dismiss error banner after 5 s
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 5000);
    return () => clearTimeout(t);
  }, [error]);

  // Global socket listeners that affect top-level app state
  useEffect(() => {
    socket.on(SOCKET_EVENTS.PRESENCE_UPDATE, setOnlineUsers);

    socket.on(SOCKET_EVENTS.NAME_SET_SUCCESS, () => {
      setStep('lobby');
      setError(null);
      sound('join');
      addNotification('Welcome to Lantern!', 'success');
    });

    socket.on(SOCKET_EVENTS.ERROR, (msg: string) => {
      setError(msg);
      addNotification(msg, 'error');
    });

    // ── Rate-limit feedback ───────────────────────────────────────────────
    socket.on(SOCKET_EVENTS.RATE_LIMITED, ({ message }: RateLimitedPayload) => {
      setError(message);
      addNotification(message, 'error');
    });

    // ── Host control feedback ─────────────────────────────────────────────
    socket.on(SOCKET_EVENTS.FORCE_MUTED, ({ reason }: { reason?: string }) => {
      addNotification(reason || 'You were muted by the host', 'info');
    });

    socket.on(SOCKET_EVENTS.FORCE_UNMUTED, ({ reason }: { reason?: string }) => {
      addNotification(reason || 'You were unmuted', 'info');
    });

    socket.on(SOCKET_EVENTS.FORCE_CAMERA_OFF, ({ reason }: { reason?: string }) => {
      addNotification(reason || 'Your camera was disabled by the host', 'info');
    });

    socket.on(SOCKET_EVENTS.KICKED, ({ reason }: { reason?: string }) => {
      setError(reason || 'You were removed from the room by the host');
      addNotification(reason || 'You were removed from the room', 'error');
      // Optionally: go back to lobby after a brief delay
      setTimeout(() => setStep('lobby'), 2000);
    });

    // ── Device-session events ─────────────────────────────────────────────
    // Server tells this tab it's a duplicate (another tab is already active).
    socket.on(SOCKET_EVENTS.DUPLICATE_SESSION, () => {
      setIsDuplicateSession(true);
    });

    // Server tells this tab its session was claimed by a newer tab.
    socket.on(SOCKET_EVENTS.SESSION_TAKEN_OVER, () => {
      setIsSessionTakenOver(true);
    });

    // Server grants the take-over — clear the blocked state and resume.
    socket.on(SOCKET_EVENTS.TAKE_OVER_GRANTED, () => {
      setIsDuplicateSession(false);
    });

    return () => {
      socket.off(SOCKET_EVENTS.PRESENCE_UPDATE, setOnlineUsers);
      socket.off(SOCKET_EVENTS.NAME_SET_SUCCESS);
      socket.off(SOCKET_EVENTS.ERROR);
      socket.off(SOCKET_EVENTS.RATE_LIMITED);
      socket.off(SOCKET_EVENTS.FORCE_MUTED);
      socket.off(SOCKET_EVENTS.FORCE_UNMUTED);
      socket.off(SOCKET_EVENTS.FORCE_CAMERA_OFF);
      socket.off(SOCKET_EVENTS.KICKED);
      socket.off(SOCKET_EVENTS.DUPLICATE_SESSION);
      socket.off(SOCKET_EVENTS.SESSION_TAKEN_OVER);
      socket.off(SOCKET_EVENTS.TAKE_OVER_GRANTED);
    };
  }, [sound, addNotification]);

  /** Ask the server to evict the existing session and grant this tab. */
  const takeOverSession = useCallback(() => {
    socket.emit(SOCKET_EVENTS.TAKE_OVER_SESSION);
  }, []);

  const value: AppContextValue = {
    step,
    setStep,
    userName,
    setUserName,
    userId: socket.id ?? '',
    onlineUsers,
    soundEnabled,
    setSoundEnabled,
    sound,
    notifications,
    addNotification,
    error,
    setError,
    pendingRoomId,
    setPendingRoomId,
    pendingRoomPassword,
    setPendingRoomPassword,
    pendingIsCreating,
    setPendingIsCreating,
    pendingIsPrivate,
    setPendingIsPrivate,
    isDuplicateSession,
    isSessionTakenOver,
    takeOverSession,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

/** Must be used inside <AppProvider>. */
export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used inside <AppProvider>');
  return ctx;
}
