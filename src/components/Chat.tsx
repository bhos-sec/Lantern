import React, { useState, useRef, useEffect } from 'react';
import { Send, LogOut, X, Lock } from 'lucide-react';
import { Message } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface ChatProps {
  messages: Message[];
  onSendMessage: (text: string) => void;
  currentUserId: string;
  onClose?: () => void;
  hideHeader?: boolean;
  privateRecipient?: { id: string; name: string } | null;
  onClearPrivateRecipient?: () => void;
}

export const Chat: React.FC<ChatProps> = ({ messages, onSendMessage, currentUserId, onClose, hideHeader, privateRecipient, onClearPrivateRecipient }) => {
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      onSendMessage(inputText);
      setInputText('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-transparent">
      {!hideHeader && (
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Live Chat</h3>
          {onClose && (
            <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white xl:hidden">
              <LogOut size={18} className="rotate-180" />
            </button>
          )}
        </div>
      )}
      
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex flex-col ${msg.senderId === currentUserId ? 'items-end' : 'items-start'}`}
            >
              <span className="text-[10px] text-zinc-500 mb-1 px-1 flex items-center gap-1">
                {msg.isPrivate && <Lock size={10} className="text-emerald-500" />}
                {msg.senderId === currentUserId && msg.isPrivate ? `To ${msg.toId === currentUserId ? 'You' : msg.toId}` : msg.sender}
              </span>
              <div
                className={`max-w-[85%] px-4 py-2 rounded-2xl text-sm ${
                  msg.senderId === currentUserId
                    ? 'bg-emerald-600 text-white rounded-tr-none'
                    : msg.isPrivate 
                    ? 'bg-emerald-900/40 border border-emerald-500/30 text-emerald-100 rounded-tl-none'
                    : 'bg-zinc-800 text-zinc-200 rounded-tl-none'
                }`}
              >
                {msg.text}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t border-white/5 flex flex-col gap-2">
        {privateRecipient && (
          <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg">
            <div className="flex items-center gap-2 text-xs text-emerald-500">
              <Lock size={12} />
              <span>Private message to <strong>{privateRecipient.name}</strong></span>
            </div>
            <button 
              type="button" 
              onClick={onClearPrivateRecipient}
              className="text-emerald-500 hover:text-emerald-400"
            >
              <X size={14} />
            </button>
          </div>
        )}
        <div className="relative">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={privateRecipient ? `Message ${privateRecipient.name}...` : "Type a message..."}
            className="w-full bg-zinc-800 border border-white/5 rounded-full py-3 pl-5 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-emerald-600 hover:bg-emerald-500 rounded-full transition-colors"
          >
            <Send size={16} className="text-white" />
          </button>
        </div>
      </form>
    </div>
  );
};
