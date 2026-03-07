import React from 'react';
import { Message } from '../types';
import { Chat } from './Chat';
import { Users, MessageSquare, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface SidebarProps {
  activeTab: 'chat' | 'room' | 'all';
  onTabChange: (tab: 'chat' | 'room' | 'all') => void;
  messages: Message[];
  onSendMessage: (text: string, toUserId?: string) => void;
  currentUserId: string;
  currentRoomId?: string;
  onlineUsers: { id: string; name: string; roomId: string | null; actualRoomId?: string | null }[];
  onClose?: () => void;
  onJoinRoom: (
    roomId: string,
    password?: string,
    isPrivate?: boolean,
    isCreating?: boolean,
  ) => void;
  onPlaySound?: (type: 'click' | 'message' | 'join') => void;
  isRoomPage?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  messages,
  onSendMessage,
  currentUserId,
  currentRoomId,
  onlineUsers,
  onClose,
  onJoinRoom,
  onPlaySound,
  isRoomPage,
}) => {
  const [privateRecipient, setPrivateRecipient] = React.useState<{
    id: string;
    name: string;
  } | null>(null);
  const roomUsers = onlineUsers.filter(u => u.actualRoomId === currentRoomId);

  return (
    <div className="flex flex-col h-full bg-zinc-900/95 backdrop-blur-2xl border-l border-white/5">
      {/* Tabs Header */}
      <div className="flex items-center border-b border-white/5 p-1">
        <button
          onClick={() => {
            onPlaySound?.('click');
            onTabChange('chat');
          }}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-bold transition-all',
            activeTab === 'chat'
              ? 'bg-emerald-500/10 text-emerald-500'
              : 'text-zinc-500 hover:text-zinc-300',
          )}
        >
          <MessageSquare size={14} />
          Chat
        </button>
        <button
          onClick={() => {
            onPlaySound?.('click');
            onTabChange('room');
          }}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-bold transition-all',
            activeTab === 'room'
              ? 'bg-emerald-500/10 text-emerald-500'
              : 'text-zinc-500 hover:text-zinc-300',
          )}
        >
          <Users size={14} />
          Room
          <span className="bg-zinc-800 text-zinc-400 px-1 py-0.5 rounded text-[9px]">
            {roomUsers.length}
          </span>
        </button>
        <button
          onClick={() => {
            onPlaySound?.('click');
            onTabChange('all');
          }}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-bold transition-all',
            activeTab === 'all'
              ? 'bg-emerald-500/10 text-emerald-500'
              : 'text-zinc-500 hover:text-zinc-300',
          )}
        >
          <Users size={14} />
          All
          <span className="bg-zinc-800 text-zinc-400 px-1 py-0.5 rounded text-[9px]">
            {onlineUsers.length}
          </span>
        </button>
        {onClose && (
          <button
            onClick={() => {
              onPlaySound?.('click');
              onClose();
            }}
            className="p-2 text-zinc-500 hover:text-white xl:hidden ml-1"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {activeTab === 'chat' ? (
            <motion.div
              key="chat"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="h-full"
            >
              <Chat
                messages={messages}
                onSendMessage={text => onSendMessage(text, privateRecipient?.id)}
                currentUserId={currentUserId}
                hideHeader
                privateRecipient={privateRecipient}
                onClearPrivateRecipient={() => setPrivateRecipient(null)}
              />
            </motion.div>
          ) : activeTab === 'room' ? (
            <motion.div
              key="room"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="h-full flex flex-col p-4 space-y-4 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent"
            >
              <div className="space-y-1 mb-2">
                <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-600">
                  In this Room
                </h3>
              </div>
              {roomUsers.map(user => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 bg-zinc-800/30 border border-white/5 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-8 h-8 bg-zinc-700 rounded-full flex items-center justify-center text-zinc-400 text-xs font-bold">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-zinc-900 rounded-full" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-zinc-200">
                        {user.name} {user.id === currentUserId && '(You)'}
                      </span>
                    </div>
                  </div>
                  {user.id !== currentUserId && (
                    <button
                      onClick={() => {
                        onPlaySound?.('click');
                        setPrivateRecipient({ id: user.id, name: user.name });
                        onTabChange('chat');
                      }}
                      className="p-2 text-zinc-500 hover:text-emerald-500 transition-colors"
                      title="Send Private Message"
                    >
                      <MessageSquare size={16} />
                    </button>
                  )}
                </div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="all"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="h-full flex flex-col p-4 space-y-4 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent"
            >
              <div className="space-y-1 mb-2">
                <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-600">
                  All Online
                </h3>
              </div>
              {onlineUsers.map(user => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 bg-zinc-800/30 border border-white/5 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-8 h-8 bg-zinc-700 rounded-full flex items-center justify-center text-zinc-400 text-xs font-bold">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-zinc-900 rounded-full" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-zinc-200">
                        {user.name} {user.id === currentUserId && '(You)'}
                      </span>
                      <span className="text-[10px] text-zinc-500">
                        {user.roomId
                          ? `In: ${user.roomId}`
                          : user.actualRoomId
                            ? 'In Private Room'
                            : 'In Lobby'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {user.id !== currentUserId && (
                      <button
                        onClick={() => {
                          onPlaySound?.('click');
                          setPrivateRecipient({ id: user.id, name: user.name });
                          onTabChange('chat');
                        }}
                        className="p-2 text-zinc-500 hover:text-emerald-500 transition-colors"
                        title="Send Private Message"
                      >
                        <MessageSquare size={16} />
                      </button>
                    )}
                    {user.actualRoomId &&
                      user.id !== currentUserId &&
                      user.actualRoomId !== currentRoomId &&
                      !user.isRoomPrivate &&
                      !isRoomPage && (
                        <button
                          onClick={() =>
                            onJoinRoom(user.actualRoomId!, undefined, undefined, false)
                          }
                          className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white rounded-lg text-[10px] font-bold transition-all border border-emerald-500/20"
                        >
                          Join
                        </button>
                      )}
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
