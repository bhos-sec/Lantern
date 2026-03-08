import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Hand, Smile } from 'lucide-react';
import { cn } from '../lib/utils';

const REACTIONS = ['👍', '👏', '❤️', '😂', '😮', '🎉', '🔥', '🙌', '👀', '💯'];

interface EngagementToolbarProps {
  isHandRaised: boolean;
  onRaiseHand: () => void;
  onLowerHand: () => void;
  onSendReaction: (emoji: string) => void;
  /** Total number of participants with their hand raised (including self). */
  raisedHandCount?: number;
}

/**
 * Footer toolbar additions: raise-hand toggle + emoji reaction picker.
 */
export function EngagementToolbar({
  isHandRaised,
  onRaiseHand,
  onLowerHand,
  onSendReaction,
  raisedHandCount = 0,
}: EngagementToolbarProps) {
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close the picker if the user clicks outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="flex items-center gap-2 md:gap-4">
      {/* Raise Hand */}
      <div className="relative">
        <button
          onClick={isHandRaised ? onLowerHand : onRaiseHand}
          className={cn(
            'p-3 md:p-4 rounded-xl md:rounded-2xl transition-all border',
            isHandRaised
              ? 'bg-yellow-400/10 border-yellow-400/50 text-yellow-400'
              : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-white/5 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700',
          )}
          title={isHandRaised ? 'Lower hand' : 'Raise hand'}
        >
          <Hand size={20} className={isHandRaised ? 'animate-bounce' : ''} />
        </button>
        {raisedHandCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-yellow-400 text-yellow-900 text-[10px] font-bold rounded-full leading-none pointer-events-none">
            {raisedHandCount}
          </span>
        )}
      </div>

      {/* Reaction Picker */}
      <div className="relative" ref={pickerRef}>
        <button
          onClick={() => setShowPicker(v => !v)}
          className={cn(
            'p-3 md:p-4 rounded-xl md:rounded-2xl transition-all border',
            showPicker
              ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-500'
              : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-white/5 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700',
          )}
          title="Send reaction"
        >
          <Smile size={20} />
        </button>

        <AnimatePresence>
          {showPicker && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-2xl shadow-xl p-2 flex flex-wrap gap-1 w-44"
            >
              {REACTIONS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => {
                    onSendReaction(emoji);
                  }}
                  className="text-2xl hover:scale-125 transition-transform p-1 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  {emoji}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
