import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '../../lib/utils';
import type { Notification } from '../../hooks/useNotifications';

interface Props {
  notifications: Notification[];
}

/** Fixed top-right toast stack. Renders outside the normal document flow. */
export function NotificationToast({ notifications }: Props) {
  return (
    <div className="fixed top-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence>
        {notifications.map(n => (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className={cn(
              'px-6 py-4 rounded-2xl shadow-2xl border backdrop-blur-xl pointer-events-auto min-w-[280px] flex items-center gap-3',
              n.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                : n.type === 'error'
                  ? 'bg-red-500/10 border-red-500/20 text-red-500'
                  : 'bg-white dark:bg-zinc-900/90 border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-200',
            )}
          >
            <div
              className={cn(
                'w-2 h-2 rounded-full flex-shrink-0',
                n.type === 'success'
                  ? 'bg-emerald-500'
                  : n.type === 'error'
                    ? 'bg-red-500'
                    : 'bg-zinc-400 dark:bg-zinc-500',
              )}
            />
            <p className="text-sm font-medium">{n.message}</p>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
