import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { EngagementReaction } from '../hooks/useEngagement';

interface ReactionsOverlayProps {
  reactions: EngagementReaction[];
}

/** Floating emoji reactions that appear over the video grid and fade out. */
export function ReactionsOverlay({ reactions }: ReactionsOverlayProps) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-30">
      <AnimatePresence>
        {reactions.map(r => (
          <motion.div
            key={r.key}
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: -500 }}
            exit={{ opacity: 0, scale: 1.5 }}
            transition={{ duration: 3, ease: 'easeOut' }}
            className="absolute bottom-24 text-4xl select-none"
            style={{ left: `${r.left}%` }}
          >
            {r.emoji}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
