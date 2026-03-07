import { useState, useCallback } from 'react';

export interface Notification {
  id: string;
  message: string;
  type: 'info' | 'success' | 'error';
}

/** Manages the toast queue. Each notification auto-dismisses after 4 s. */
export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((message: string, type: Notification['type'] = 'info') => {
    const id = Math.random().toString(36).substring(2, 11);
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000);
  }, []);

  return { notifications, addNotification };
}
