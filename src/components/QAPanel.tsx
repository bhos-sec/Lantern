import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircleQuestion, ThumbsUp, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';
import type { QAQuestion } from '@shared/types';

interface QAPanelProps {
  questions: QAQuestion[];
  currentUserId: string;
  currentUserName: string;
  isAdmin: boolean;
  onSubmitQuestion: (text: string) => void;
  onUpvote: (questionId: string) => void;
  onAnswered: (questionId: string) => void;
}

/** Q&A panel — participants submit and upvote questions; host marks them answered. */
export function QAPanel({
  questions,
  currentUserId,
  currentUserName,
  isAdmin,
  onSubmitQuestion,
  onUpvote,
  onAnswered,
}: QAPanelProps) {
  const [inputText, setInputText] = useState('');
  const [showAnswered, setShowAnswered] = useState(false);

  const visible = questions.filter(q => showAnswered || !q.answered);
  const sorted = [...visible].sort(
    (a, b) => b.upvotes.length - a.upvotes.length,
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSubmitQuestion(inputText.trim());
    setInputText('');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-800 scrollbar-track-transparent">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-600 flex items-center gap-1.5">
            <MessageCircleQuestion size={14} />
            Q&amp;A
            <span className="bg-zinc-200 dark:bg-zinc-800 text-zinc-500 px-1 py-0.5 rounded text-[9px]">
              {questions.filter(q => !q.answered).length}
            </span>
          </h3>
          <button
            onClick={() => setShowAnswered(v => !v)}
            className="text-[10px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
          >
            {showAnswered ? 'Hide answered' : 'Show answered'}
          </button>
        </div>

        {sorted.length === 0 && (
          <p className="text-xs text-zinc-400 dark:text-zinc-600 text-center py-6">
            No questions yet. Ask one below!
          </p>
        )}

        <AnimatePresence>
          {sorted.map(q => {
            const hasUpvoted = q.upvotes.includes(currentUserId);
            return (
              <motion.div
                key={q.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className={cn(
                  'p-3 rounded-xl border space-y-2',
                  q.answered
                    ? 'border-zinc-200 dark:border-white/5 opacity-50'
                    : 'border-zinc-200 dark:border-white/5 bg-zinc-50 dark:bg-zinc-800/30',
                )}
              >
                <p className="text-sm text-zinc-800 dark:text-zinc-200 leading-snug">
                  {q.text}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                    {q.userName}
                  </span>
                  <div className="flex items-center gap-2">
                    {q.answered && (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-500">
                        <CheckCircle2 size={12} /> Answered
                      </span>
                    )}
                    {!q.answered && isAdmin && (
                      <button
                        onClick={() => onAnswered(q.id)}
                        className="text-[10px] text-zinc-400 hover:text-emerald-500 transition-colors flex items-center gap-1"
                      >
                        <CheckCircle2 size={12} /> Mark answered
                      </button>
                    )}
                    {!q.answered && (
                      <button
                        onClick={() => onUpvote(q.id)}
                        className={cn(
                          'flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] transition-all',
                          hasUpvoted
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                            : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-white/5 text-zinc-500',
                        )}
                      >
                        <ThumbsUp size={11} />
                        {q.upvotes.length}
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Submit input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-zinc-200 dark:border-white/5 flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={e => setInputText(e.target.value.slice(0, 300))}
          placeholder="Ask a question…"
          className="flex-1 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-white/5 rounded-full px-4 py-2 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-full text-xs font-semibold transition-all"
        >
          Ask
        </button>
      </form>
    </div>
  );
}
