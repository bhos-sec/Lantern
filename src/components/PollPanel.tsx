import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, ChevronUp, BarChart2, X, Plus, Check } from 'lucide-react';
import { cn } from '../lib/utils';
import type { Poll } from '@shared/types';

interface PollPanelProps {
  polls: Poll[];
  currentUserId: string;
  isAdmin: boolean;
  onCreatePoll: (question: string, options: string[]) => void;
  onVote: (pollId: string, optionId: string) => void;
  onClosePoll: (pollId: string) => void;
}

/** Poll panel — shows active polls, lets users vote, and lets the host create/close polls. */
export function PollPanel({
  polls,
  currentUserId,
  isAdmin,
  onCreatePoll,
  onVote,
  onClosePoll,
}: PollPanelProps) {
  const [creating, setCreating] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [newOptions, setNewOptions] = useState(['', '']);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const handleCreate = () => {
    const validOptions = newOptions.map(o => o.trim()).filter(Boolean);
    if (!newQuestion.trim() || validOptions.length < 2) return;
    onCreatePoll(newQuestion.trim(), validOptions);
    setNewQuestion('');
    setNewOptions(['', '']);
    setCreating(false);
  };

  const toggleExpanded = (id: string) =>
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  const activePollCount = polls.filter(p => !p.closed).length;

  return (
    <div className="flex flex-col gap-4 p-4 overflow-y-auto h-full scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-800 scrollbar-track-transparent">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-600 flex items-center gap-1.5">
          <BarChart2 size={14} />
          Polls
          {activePollCount > 0 && (
            <span className="bg-emerald-500 text-white text-[9px] px-1.5 py-0.5 rounded-full">
              {activePollCount}
            </span>
          )}
        </h3>
        <button
          onClick={() => setCreating(v => !v)}
          className="flex items-center gap-1 text-xs px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white rounded-lg border border-emerald-500/20 transition-all"
        >
          {creating ? <X size={12} /> : <Plus size={12} />}
          {creating ? 'Cancel' : 'New Poll'}
        </button>
      </div>

      {/* Create poll form */}
      <AnimatePresence>
        {creating && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-white/5 rounded-xl p-3"
          >
            <input
              className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-white/5 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              placeholder="Poll question…"
              value={newQuestion}
              onChange={e => setNewQuestion(e.target.value.slice(0, 200))}
            />
            {newOptions.map((opt, i) => (
              <div key={i} className="flex gap-2">
                <input
                  className="flex-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-white/5 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  placeholder={`Option ${i + 1}`}
                  value={opt}
                  onChange={e => {
                    const next = [...newOptions];
                    next[i] = e.target.value.slice(0, 100);
                    setNewOptions(next);
                  }}
                />
                {newOptions.length > 2 && (
                  <button
                    onClick={() => setNewOptions(prev => prev.filter((_, j) => j !== i))}
                    className="p-2 text-zinc-400 hover:text-red-500"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
            {newOptions.length < 6 && (
              <button
                onClick={() => setNewOptions(prev => [...prev, ''])}
                className="text-xs text-emerald-500 hover:text-emerald-400 flex items-center gap-1"
              >
                <Plus size={12} /> Add option
              </button>
            )}
            <button
              onClick={handleCreate}
              disabled={!newQuestion.trim() || newOptions.filter(o => o.trim()).length < 2}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-all"
            >
              Launch Poll
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Polls list */}
      {polls.length === 0 && (
        <p className="text-xs text-zinc-400 dark:text-zinc-600 text-center py-4">
          No polls yet.
        </p>
      )}
      {[...polls].reverse().map(poll => {
        const totalVotes = poll.options.reduce((s, o) => s + o.votes.length, 0);
        const myVote = poll.options.find(o => o.votes.includes(currentUserId));
        const isOpen = expanded[poll.id] ?? true;

        return (
          <div
            key={poll.id}
            className={cn(
              'border rounded-xl overflow-hidden',
              poll.closed
                ? 'border-zinc-200 dark:border-white/5 opacity-60'
                : 'border-emerald-500/20',
            )}
          >
            <div
              className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/30 cursor-pointer"
              onClick={() => toggleExpanded(poll.id)}
            >
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-200 flex-1 mr-2">
                {poll.question}
              </span>
              <div className="flex items-center gap-2">
                {poll.closed && (
                  <span className="text-[9px] px-1.5 py-0.5 bg-zinc-200 dark:bg-zinc-700 text-zinc-500 rounded-full">
                    Closed
                  </span>
                )}
                {isOpen ? <ChevronUp size={14} className="text-zinc-400" /> : <ChevronDown size={14} className="text-zinc-400" />}
              </div>
            </div>
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  exit={{ height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-3 space-y-2">
                    {poll.options.map(option => {
                      const pct = totalVotes > 0 ? Math.round((option.votes.length / totalVotes) * 100) : 0;
                      const isMyVote = myVote?.id === option.id;

                      return (
                        <button
                          key={option.id}
                          disabled={poll.closed || !!myVote}
                          onClick={() => !poll.closed && onVote(poll.id, option.id)}
                          className={cn(
                            'w-full text-left relative overflow-hidden rounded-lg border transition-all',
                            isMyVote
                              ? 'border-emerald-500/50 bg-emerald-500/10'
                              : 'border-zinc-200 dark:border-white/5 hover:border-zinc-300 dark:hover:border-white/10',
                          )}
                        >
                          {/* Progress fill */}
                          <div
                            className="absolute inset-0 bg-zinc-100 dark:bg-zinc-700/30 transition-all"
                            style={{ width: `${pct}%` }}
                          />
                          <div className="relative flex items-center justify-between px-3 py-2">
                            <div className="flex items-center gap-1.5">
                              {isMyVote && <Check size={12} className="text-emerald-500" />}
                              <span className="text-xs text-zinc-700 dark:text-zinc-200">
                                {option.text}
                              </span>
                            </div>
                            <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                              {pct}%
                            </span>
                          </div>
                        </button>
                      );
                    })}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-zinc-400">
                        {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
                      </span>
                      {(isAdmin || poll.createdBy === currentUserId) && !poll.closed && (
                        <button
                          onClick={() => onClosePoll(poll.id)}
                          className="text-[10px] text-zinc-400 hover:text-red-500 transition-colors"
                        >
                          Close Poll
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
