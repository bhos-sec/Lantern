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

export type AppStep = 'name' | 'lobby' | 'room';

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
    socket.on('presence-update', setOnlineUsers);

    socket.on('name-set-success', () => {
      setStep('lobby');
      setError(null);
      sound('join');
      addNotification('Welcome to Lantern!', 'success');
    });

    socket.on('error', (msg: string) => {
      setError(msg);
      addNotification(msg, 'error');
    });

    // ── Rate-limit feedback ───────────────────────────────────────────────
    socket.on('rate-limited', ({ message }: RateLimitedPayload) => {
      setError(message);
      addNotification(message, 'error');
    });

    // ── Device-session events ─────────────────────────────────────────────
    // Server tells this tab it's a duplicate (another tab is already active).
    socket.on('duplicate-session', () => {
      setIsDuplicateSession(true);
    });

    // Server tells this tab its session was claimed by a newer tab.
    socket.on('session-taken-over', () => {
      setIsSessionTakenOver(true);
    });

    // Server grants the take-over — clear the blocked state and resume.
    socket.on('take-over-granted', () => {
      setIsDuplicateSession(false);
    });

    return () => {
      socket.off('presence-update', setOnlineUsers);
      socket.off('name-set-success');
      socket.off('error');
      socket.off('rate-limited');
      socket.off('duplicate-session');
      socket.off('session-taken-over');
      socket.off('take-over-granted');
    };
  }, [sound, addNotification]);

  /** Ask the server to evict the existing session and grant this tab. */
  const takeOverSession = useCallback(() => {
    socket.emit('take-over-session');
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
