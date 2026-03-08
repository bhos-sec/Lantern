import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Hash,
  Shield,
  Zap,
  Users,
  LogOut,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  Settings,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  BarChart2,
  MessageCircleQuestion,
  Aperture,
  ShieldCheck,
  X,
} from 'lucide-react';
import { socket } from '../lib/socket';
import { SOCKET_EVENTS } from '@shared/events';
import { useAppContext } from '../context/AppContext';
import { useTheme } from '../hooks/useTheme';
import { useEngagement } from '../hooks/useEngagement';
import { VideoPlayer } from '../components/VideoPlayer';
import { Sidebar } from '../components/Sidebar';
import { EngagementToolbar } from '../components/EngagementToolbar';
import { ReactionsOverlay } from '../components/ReactionsOverlay';
import { PollPanel } from '../components/PollPanel';
import { QAPanel } from '../components/QAPanel';
import { MediaSettingsModal } from '../components/ui/MediaSettingsModal';
import { cn } from '../lib/utils';
import type { UseMediaReturn } from '../hooks/useMedia';
import type { RemoteStream } from '../hooks/useWebRTC';
import type { Message } from '@shared/types';

interface RoomPageProps {
  roomId: string;
  media: UseMediaReturn;
  remoteStreams: Record<string, RemoteStream>;
  messages: Message[];
  onSendMessage: (text: string, toUserId?: string) => void;
  onLeaveRoom: () => void;
  onTogglePrivacy: (isPrivate: boolean) => void;
  onToggleScreenShare: () => Promise<void>;
}

/**
 * Step 3 — Room.
 * Full video-conferencing view with header, video grid, sidebar, and footer controls.
 */
export function RoomPage({
  roomId,
  media,
  remoteStreams,
  messages,
  onSendMessage,
  onLeaveRoom,
  onTogglePrivacy,
  onToggleScreenShare,
}: RoomPageProps) {
  const { onlineUsers, soundEnabled, setSoundEnabled, sound, userId, userName, addNotification } = useAppContext();
  const { isDark, toggleTheme } = useTheme();
  const engagement = useEngagement(roomId);

  const [showChat, setShowChat] = useState(false);
  const [activeSidebarTab, setActiveSidebarTab] = useState<'chat' | 'room' | 'all'>('chat');
  const [showSettings, setShowSettings] = useState(false);
  const [fullscreenUserId, setFullscreenUserId] = useState<string | null>(null);
  const [engagementPanel, setEngagementPanel] = useState<'polls' | 'qa' | null>(null);
  const [showHostPanel, setShowHostPanel] = useState(false);

  // Request existing polls/Q&A when entering the room
  useEffect(() => {
    engagement.requestEngagementState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // Notifications for new polls and questions from others
  useEffect(() => {
    const handlePollCreated = () => {
      if (engagementPanel !== 'polls') {
        addNotification('A poll has been started', 'info');
        sound('message');
      }
    };
    const handleQuestionSubmitted = (q: any) => {
      if (q.userId !== userId && engagementPanel !== 'qa') {
        addNotification('A question has been asked', 'info');
        sound('message');
      }
    };
    socket.on(SOCKET_EVENTS.POLL_CREATED, handlePollCreated);
    socket.on(SOCKET_EVENTS.QUESTION_SUBMITTED, handleQuestionSubmitted);
    return () => {
      socket.off(SOCKET_EVENTS.POLL_CREATED, handlePollCreated);
      socket.off(SOCKET_EVENTS.QUESTION_SUBMITTED, handleQuestionSubmitted);
    };
  }, [userId, engagementPanel, addNotification, sound]);

  const currentUser = onlineUsers.find(u => u.id === userId);
  const isAdmin = currentUser?.isAdmin ?? false;
  const isRoomPrivate = currentUser?.isRoomPrivate ?? false;

  const handleMuteUser = (userId: string) => {
    socket.emit(SOCKET_EVENTS.MUTE_USER, { targetUserId: userId, roomId });
  };

  const handleUnmuteUser = (userId: string) => {
    socket.emit(SOCKET_EVENTS.UNMUTE_USER, { targetUserId: userId, roomId });
  };

  const handleMuteAll = () => {
    socket.emit(SOCKET_EVENTS.MUTE_ALL, { roomId });
  };

  const handleKickUser = (userId: string) => {
    socket.emit(SOCKET_EVENTS.KICK_USER, { targetUserId: userId, roomId });
  };

  const handleDisableCamera = (targetUserId: string) => {
    socket.emit(SOCKET_EVENTS.DISABLE_CAMERA, { targetUserId, roomId });
  };

  // Sync own camera state to server so the host panel reflects it accurately
  useEffect(() => {
    if (!roomId) return;
    socket.emit(SOCKET_EVENTS.CAMERA_STATE_UPDATE, { isVideoOff: media.isVideoOff });
  }, [media.isVideoOff, roomId]);

  // Sync own mute state to server so the host panel reflects it accurately
  useEffect(() => {
    if (!roomId) return;
    socket.emit(SOCKET_EVENTS.MUTE_STATE_UPDATE, { isMuted: media.isMuted });
  }, [media.isMuted, roomId]);

  const toggleFullscreen = (id: string) => setFullscreenUserId(prev => (prev === id ? null : id));

  // Responsive grid class based on number of participants
  const gridClass = cn(
    'grid gap-4 md:gap-6 auto-rows-fr',
    Object.keys(remoteStreams).length === 0
      ? 'grid-cols-1 max-w-4xl mx-auto'
      : Object.keys(remoteStreams).length === 1
        ? 'grid-cols-1 md:grid-cols-2'
        : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  );

  return (
    <div className="h-screen flex flex-col md:flex-row bg-zinc-50 dark:bg-zinc-950 overflow-hidden">
      {/* ── Main Area ──────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-4 md:px-6 border-b border-zinc-200 dark:border-white/5 bg-white/80 dark:bg-zinc-900/30 backdrop-blur-md z-20">
          <div className="flex items-center gap-2 md:gap-4">
            {/* Room ID badge */}
            <div className="flex items-center gap-2 px-3 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-full border border-zinc-200 dark:border-white/5">
              <Hash size={14} className="text-emerald-500" />
              <span className="text-xs md:text-sm font-semibold text-zinc-700 dark:text-zinc-200 truncate max-w-[80px] md:max-w-none">
                {roomId}
              </span>
            </div>

            {/* Privacy toggle (admin) or badge (member) */}
            {isAdmin ? (
              <button
                onClick={() => {
                  sound('click');
                  onTogglePrivacy(!isRoomPrivate);
                }}
                className={cn(
                  'flex items-center gap-2 px-3 py-1 rounded-full border transition-all text-[10px] font-medium',
                  isRoomPrivate
                    ? 'bg-red-500/10 border-red-500/50 text-red-500'
                    : 'bg-emerald-500/10 border-emerald-500/50 text-emerald-500',
                )}
                title={isRoomPrivate ? 'Room is private' : 'Room is public'}
              >
                {isRoomPrivate ? <Shield size={12} /> : <Zap size={12} />}
                <span className="hidden sm:inline">{isRoomPrivate ? 'Private' : 'Public'}</span>
              </button>
            ) : (
              <div
                className={cn(
                  'flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-medium opacity-60',
                  isRoomPrivate
                    ? 'bg-red-500/10 border-red-500/20 text-red-500'
                    : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500',
                )}
              >
                {isRoomPrivate ? <Shield size={12} /> : <Zap size={12} />}
                <span className="hidden sm:inline">{isRoomPrivate ? 'Private' : 'Public'}</span>
              </div>
            )}

            <div className="hidden sm:block h-4 w-px bg-zinc-200 dark:bg-white/10" />

            <button
              onClick={() => {
                sound('click');
                setSoundEnabled(!soundEnabled);
              }}
              className={cn(
                'p-2 rounded-lg transition-all border',
                soundEnabled
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                  : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-white/5 text-zinc-500',
              )}
              title={soundEnabled ? 'Mute sounds' : 'Unmute sounds'}
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>

            <button
              onClick={() => {
                sound('click');
                setShowSettings(true);
              }}
              className="p-2 bg-zinc-100 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-lg border border-zinc-200 dark:border-white/5 transition-all"
              title="Media Settings"
            >
              <Settings size={16} />
            </button>

            <button
              onClick={toggleTheme}
              className="p-2 bg-zinc-100 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-lg border border-zinc-200 dark:border-white/5 transition-all"
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <div className="hidden sm:block h-4 w-px bg-zinc-200 dark:bg-white/10" />

            {/* Participant count */}
            <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
              <Users size={16} />
              <span className="text-[10px] md:text-xs font-medium">
                {Object.keys(remoteStreams).length + 1}
              </span>
            </div>

            {isAdmin && (
              <>
                <div className="hidden sm:block h-4 w-px bg-zinc-200 dark:bg-white/10" />
                <button
                  onClick={() => { sound('click'); setShowHostPanel(v => !v); }}
                  className={cn(
                    'p-2 rounded-lg transition-all border',
                    showHostPanel
                      ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-500'
                      : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-white/5 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white',
                  )}
                  title="Host Controls"
                >
                  <ShieldCheck size={16} />
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            {/* Mobile chat toggle */}
            <button
              onClick={() => {
                sound('click');
                setShowChat(v => !v);
              }}
              className={cn(
                'p-2 rounded-full transition-all border border-zinc-200 dark:border-white/5 xl:hidden',
                showChat
                  ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/50'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400',
              )}
            >
              <Users size={18} />
            </button>

            <button
              onClick={() => {
                sound('click');
                onLeaveRoom();
              }}
              className="flex items-center gap-2 px-3 md:px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-red-500/10 hover:text-red-500 text-zinc-500 dark:text-zinc-400 rounded-full text-xs md:text-sm font-medium transition-all border border-zinc-200 dark:border-white/5"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Leave</span>
            </button>
          </div>
        </header>

        {/* Video Grid */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto relative">
          {/* Floating emoji reactions overlay */}
          <ReactionsOverlay reactions={engagement.reactions} />

          {/* Fullscreen backdrop */}
          {fullscreenUserId && (
            <div
              className="fixed inset-0 z-40 bg-black/90 backdrop-blur-sm"
              onClick={() => setFullscreenUserId(null)}
            />
          )}

          <div className={gridClass}>
            <VideoPlayer
              stream={media.localStream}
              userName={userName}
              isLocal
              isFullscreen={fullscreenUserId === 'local'}
              onToggleFullscreen={() => toggleFullscreen('local')}
              handRaised={engagement.isHandRaised}
            />
            {Object.entries(remoteStreams).map(([id, data]) => (
              <VideoPlayer
                key={id}
                stream={data.stream}
                userName={data.name}
                isFullscreen={fullscreenUserId === id}
                onToggleFullscreen={() => toggleFullscreen(id)}
                handRaised={engagement.raisedHands[id]}
              />
            ))}
          </div>

          {/* Engagement panel (polls / Q&A) — floating panel */}
          <AnimatePresence>
            {engagementPanel && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="absolute top-4 right-4 w-80 h-[calc(100%-2rem)] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 rounded-2xl shadow-2xl overflow-hidden z-20"
              >
                {engagementPanel === 'polls' ? (
                  <PollPanel
                    polls={engagement.polls}
                    currentUserId={userId}
                    isAdmin={isAdmin}
                    onCreatePoll={engagement.createPoll}
                    onVote={engagement.votePoll}
                    onClosePoll={engagement.closePoll}
                  />
                ) : (
                  <QAPanel
                    questions={engagement.questions}
                    currentUserId={userId}
                    currentUserName={userName}
                    isAdmin={isAdmin}
                    onSubmitQuestion={text => engagement.submitQuestion(text, userName)}
                    onUpvote={engagement.upvoteQuestion}
                    onAnswered={engagement.answerQuestion}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Host controls panel (admin only) */}
          <AnimatePresence>
            {showHostPanel && isAdmin && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="absolute top-4 left-4 w-72 max-h-[calc(100%-2rem)] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 rounded-2xl shadow-2xl overflow-hidden z-20 flex flex-col"
              >
                <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-white/5 shrink-0">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={16} className="text-emerald-500" />
                    <span className="text-sm font-bold text-zinc-900 dark:text-white">Host Controls</span>
                  </div>
                  <button
                    onClick={() => setShowHostPanel(false)}
                    className="p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-lg transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="p-4 space-y-3 overflow-y-auto">
                  <button
                    onClick={() => { sound('click'); handleMuteAll(); }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl border border-red-500/20 text-sm font-medium transition-all"
                  >
                    <MicOff size={14} />
                    Mute All
                  </button>
                  <div className="space-y-2">
                    {onlineUsers
                      .filter(u => u.actualRoomId === roomId && u.id !== userId)
                      .map(user => (
                        <div
                          key={user.id}
                          className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-white/5 rounded-xl"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-7 h-7 bg-zinc-200 dark:bg-zinc-700 rounded-full flex items-center justify-center text-xs font-bold text-zinc-600 dark:text-zinc-300 shrink-0">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm text-zinc-700 dark:text-zinc-200 truncate">{user.name}</span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {/* Mic — can only mute, never force-unmute (privacy) */}
                            {user.isMuted ? (
                              <div
                                className="p-1.5 rounded-lg border bg-red-500/10 text-red-500 border-red-500/20 cursor-default"
                                title="User is muted (user must unmute themselves)"
                              >
                                <MicOff size={13} />
                              </div>
                            ) : (
                              <button
                                onClick={() => { sound('click'); handleMuteUser(user.id); }}
                                className="p-1.5 rounded-lg border text-zinc-400 border-zinc-200 dark:border-white/5 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20 transition-all"
                                title="Mute"
                              >
                                <Mic size={13} />
                              </button>
                            )}
                            {/* Camera — can only disable, never force-enable (privacy) */}
                            {user.isCameraOff ? (
                              <div
                                className="p-1.5 rounded-lg border bg-red-500/10 text-red-500 border-red-500/20 cursor-default"
                                title="Camera off (user must re-enable themselves)"
                              >
                                <VideoOff size={13} />
                              </div>
                            ) : (
                              <button
                                onClick={() => { sound('click'); handleDisableCamera(user.id); }}
                                className="p-1.5 rounded-lg border text-zinc-400 border-zinc-200 dark:border-white/5 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20 transition-all"
                                title="Disable Camera"
                              >
                                <Video size={13} />
                              </button>
                            )}
                            <button
                              onClick={() => { sound('click'); handleKickUser(user.id); }}
                              className="p-1.5 text-zinc-400 hover:text-red-500 rounded-lg border border-zinc-200 dark:border-white/5 hover:border-red-500/20 hover:bg-red-500/10 transition-all"
                              title="Kick"
                            >
                              <LogOut size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    {onlineUsers.filter(u => u.actualRoomId === roomId && u.id !== userId).length === 0 && (
                      <p className="text-center text-xs text-zinc-400 dark:text-zinc-600 py-4">
                        No other participants yet
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Mobile Sidebar Overlay */}
        <AnimatePresence>
          {showChat && (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute inset-0 z-30 xl:hidden"
            >
              <Sidebar
                activeTab={activeSidebarTab}
                onTabChange={setActiveSidebarTab}
                messages={messages}
                onSendMessage={onSendMessage}
                currentUserId={userId}
                currentRoomId={roomId}
                onlineUsers={onlineUsers}
                onJoinRoom={() => {}} // Join is only available in lobby
                onClose={() => setShowChat(false)}
                onPlaySound={sound}
                isRoomPage
                isAdmin={isAdmin}
                onMuteUser={handleMuteUser}
                onMuteAll={handleMuteAll}
                onKickUser={handleKickUser}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer Controls */}
        <footer className="h-20 md:h-24 flex items-center justify-center px-4 md:px-6 border-t border-zinc-200 dark:border-white/5 bg-white/80 dark:bg-zinc-900/30 backdrop-blur-md">
          <div className="flex items-center gap-2 md:gap-4">
            <button
              onClick={() => {
                sound('click');
                media.toggleMute();
              }}
              className={cn(
                'p-3 md:p-4 rounded-xl md:rounded-2xl transition-all border',
                media.isMuted
                  ? 'bg-red-500/10 border-red-500/50 text-red-500'
                  : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-white/5 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700',
              )}
            >
              {media.isMuted ? <MicOff size={20} /> : <Mic size={20} />}
            </button>

            <button
              onClick={() => {
                sound('click');
                media.toggleVideo();
              }}
              className={cn(
                'p-3 md:p-4 rounded-xl md:rounded-2xl transition-all border',
                media.isVideoOff
                  ? 'bg-red-500/10 border-red-500/50 text-red-500'
                  : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-white/5 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700',
              )}
            >
              {media.isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
            </button>

            <div className="w-px h-6 md:h-8 bg-zinc-200 dark:bg-white/10 mx-1 md:mx-2" />

            <button
              onClick={() => {
                sound('click');
                onToggleScreenShare();
              }}
              className={cn(
                'flex items-center gap-2 md:gap-3 px-4 md:px-6 py-3 md:py-4 rounded-xl md:rounded-2xl transition-all border font-semibold',
                media.isScreenSharing
                  ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-500'
                  : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-white/5 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700',
              )}
            >
              <Monitor size={20} />
              <span className="text-xs md:text-sm">
                {media.isScreenSharing ? 'Sharing' : 'Share'}
              </span>
            </button>

            <button
              onClick={() => {
                sound('click');
                if (!media.isVideoOff) media.setBackgroundBlurEnabled(!media.backgroundBlurEnabled);
              }}
              disabled={media.isVideoOff}
              className={cn(
                'p-3 md:p-4 rounded-xl md:rounded-2xl transition-all border',
                media.isVideoOff
                  ? 'opacity-40 cursor-not-allowed bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-white/5 text-zinc-400 dark:text-zinc-600'
                  : media.backgroundBlurEnabled
                    ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-500'
                    : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-white/5 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700',
              )}
              title={media.isVideoOff ? 'Camera is off' : 'Toggle background blur'}
            >
              <Aperture size={20} />
            </button>

            <div className="w-px h-6 md:h-8 bg-zinc-200 dark:bg-white/10 mx-1 md:mx-2" />

            {/* Engagement toolbar: raise hand + reactions */}
            <EngagementToolbar
              isHandRaised={engagement.isHandRaised}
              onRaiseHand={engagement.raiseHand}
              onLowerHand={engagement.lowerHand}
              onSendReaction={engagement.sendReaction}
              raisedHandCount={Object.values(engagement.raisedHands).filter(Boolean).length}
            />

            <div className="w-px h-6 md:h-8 bg-zinc-200 dark:bg-white/10 mx-1 md:mx-2" />

            {/* Polls toggle */}
            <div className="relative">
              <button
                onClick={() => {
                  sound('click');
                  setEngagementPanel(p => (p === 'polls' ? null : 'polls'));
                }}
                className={cn(
                  'p-3 md:p-4 rounded-xl md:rounded-2xl transition-all border',
                  engagementPanel === 'polls'
                    ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-500'
                    : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-white/5 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700',
                )}
                title="Polls"
              >
                <BarChart2 size={20} />
              </button>
              {engagement.polls.filter(p => !p.closed).length > 0 && engagementPanel !== 'polls' && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white dark:border-zinc-900 pointer-events-none" />
              )}
            </div>

            {/* Q&A toggle */}
            <div className="relative">
              <button
                onClick={() => {
                  sound('click');
                  setEngagementPanel(p => (p === 'qa' ? null : 'qa'));
                }}
                className={cn(
                  'p-3 md:p-4 rounded-xl md:rounded-2xl transition-all border',
                  engagementPanel === 'qa'
                    ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-500'
                    : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-white/5 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700',
                )}
                title="Q&A"
              >
                <MessageCircleQuestion size={20} />
              </button>
              {engagement.questions.filter(q => !q.answered).length > 0 && engagementPanel !== 'qa' && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white dark:border-zinc-900 pointer-events-none" />
              )}
            </div>
          </div>
        </footer>
      </div>

      {/* Desktop Sidebar */}
      <aside className="w-80 hidden xl:block">
        <Sidebar
          activeTab={activeSidebarTab}
          onTabChange={setActiveSidebarTab}
          messages={messages}
          onSendMessage={onSendMessage}
          currentUserId={userId}
          currentRoomId={roomId}
          onlineUsers={onlineUsers}
          onJoinRoom={() => {}}
          onPlaySound={sound}
          isRoomPage
          isAdmin={isAdmin}
          onMuteUser={handleMuteUser}
          onMuteAll={handleMuteAll}
          onKickUser={handleKickUser}
        />
      </aside>

      <MediaSettingsModal
        open={showSettings}
        onClose={() => setShowSettings(false)}
        audioDevices={media.audioDevices}
        videoDevices={media.videoDevices}
        selectedAudioDevice={media.selectedAudioDevice}
        selectedVideoDevice={media.selectedVideoDevice}
        startMuted={media.startMuted}
        startVideoOff={media.startVideoOff}
        backgroundBlurEnabled={media.backgroundBlurEnabled}
        onAudioDeviceChange={media.setSelectedAudioDevice}
        onVideoDeviceChange={media.setSelectedVideoDevice}
        onStartMutedChange={media.setStartMuted}
        onStartVideoOffChange={media.setStartVideoOff}
        onBackgroundBlurChange={media.setBackgroundBlurEnabled}
      />
    </div>
  );
}
