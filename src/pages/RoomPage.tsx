import React, { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
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
} from "lucide-react";
import { socket } from "../lib/socket";
import { useAppContext } from "../context/AppContext";
import { VideoPlayer } from "../components/VideoPlayer";
import { Sidebar } from "../components/Sidebar";
import { MediaSettingsModal } from "../components/ui/MediaSettingsModal";
import { cn } from "../lib/utils";
import type { UseMediaReturn } from "../hooks/useMedia";
import type { RemoteStream } from "../hooks/useWebRTC";
import type { Message } from "../../shared/types";

interface RoomPageProps {
  roomId: string;
  media: UseMediaReturn;
  remoteStreams: Record<string, RemoteStream>;
  messages: Message[];
  onSendMessage: (text: string, toUserId?: string) => void;
  onLeaveRoom: () => void;
  onTogglePrivacy: (isPrivate: boolean) => void;
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
}: RoomPageProps) {
  const {
    onlineUsers,
    soundEnabled,
    setSoundEnabled,
    sound,
    userId,
  } = useAppContext();

  const [showChat, setShowChat] = useState(false);
  const [activeSidebarTab, setActiveSidebarTab] = useState<"chat" | "room" | "all">("chat");
  const [showSettings, setShowSettings] = useState(false);
  const [fullscreenUserId, setFullscreenUserId] = useState<string | null>(null);

  const currentUser = onlineUsers.find((u) => u.id === userId);
  const isAdmin = currentUser?.isAdmin ?? false;
  const isRoomPrivate = currentUser?.isRoomPrivate ?? false;

  const toggleFullscreen = (id: string) =>
    setFullscreenUserId((prev) => (prev === id ? null : id));

  // Responsive grid class based on number of participants
  const gridClass = cn(
    "grid gap-4 md:gap-6 auto-rows-fr",
    Object.keys(remoteStreams).length === 0
      ? "grid-cols-1 max-w-4xl mx-auto"
      : Object.keys(remoteStreams).length === 1
      ? "grid-cols-1 md:grid-cols-2"
      : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
  );

  return (
    <div className="h-screen flex flex-col md:flex-row bg-zinc-950 overflow-hidden">
      {/* ── Main Area ──────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-4 md:px-6 border-b border-white/5 bg-zinc-900/30 backdrop-blur-md z-20">
          <div className="flex items-center gap-2 md:gap-4">
            {/* Room ID badge */}
            <div className="flex items-center gap-2 px-3 py-1 bg-zinc-800 rounded-full border border-white/5">
              <Hash size={14} className="text-emerald-500" />
              <span className="text-xs md:text-sm font-semibold text-zinc-200 truncate max-w-[80px] md:max-w-none">
                {roomId}
              </span>
            </div>

            {/* Privacy toggle (admin) or badge (member) */}
            {isAdmin ? (
              <button
                onClick={() => { sound("click"); onTogglePrivacy(!isRoomPrivate); }}
                className={cn(
                  "flex items-center gap-2 px-3 py-1 rounded-full border transition-all text-[10px] font-medium",
                  isRoomPrivate
                    ? "bg-red-500/10 border-red-500/50 text-red-500"
                    : "bg-emerald-500/10 border-emerald-500/50 text-emerald-500"
                )}
                title={isRoomPrivate ? "Room is private" : "Room is public"}
              >
                {isRoomPrivate ? <Shield size={12} /> : <Zap size={12} />}
                <span className="hidden sm:inline">{isRoomPrivate ? "Private" : "Public"}</span>
              </button>
            ) : (
              <div
                className={cn(
                  "flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-medium opacity-60",
                  isRoomPrivate
                    ? "bg-red-500/10 border-red-500/20 text-red-500"
                    : "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                )}
              >
                {isRoomPrivate ? <Shield size={12} /> : <Zap size={12} />}
                <span className="hidden sm:inline">{isRoomPrivate ? "Private" : "Public"}</span>
              </div>
            )}

            <div className="hidden sm:block h-4 w-px bg-white/10" />

            <button
              onClick={() => { sound("click"); setSoundEnabled(!soundEnabled); }}
              className={cn(
                "p-2 rounded-lg transition-all border",
                soundEnabled
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                  : "bg-zinc-800 border-white/5 text-zinc-500"
              )}
              title={soundEnabled ? "Mute sounds" : "Unmute sounds"}
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>

            <button
              onClick={() => { sound("click"); setShowSettings(true); }}
              className="p-2 bg-zinc-900 text-zinc-400 hover:text-white rounded-lg border border-white/5 transition-all"
              title="Media Settings"
            >
              <Settings size={16} />
            </button>

            <div className="hidden sm:block h-4 w-px bg-white/10" />

            {/* Participant count */}
            <div className="flex items-center gap-2 text-zinc-400">
              <Users size={16} />
              <span className="text-[10px] md:text-xs font-medium">
                {Object.keys(remoteStreams).length + 1}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            {/* Mobile chat toggle */}
            <button
              onClick={() => { sound("click"); setShowChat((v) => !v); }}
              className={cn(
                "p-2 rounded-full transition-all border border-white/5 xl:hidden",
                showChat
                  ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/50"
                  : "bg-zinc-800 text-zinc-400"
              )}
            >
              <Users size={18} />
            </button>

            <button
              onClick={() => { sound("click"); onLeaveRoom(); }}
              className="flex items-center gap-2 px-3 md:px-4 py-2 bg-zinc-800 hover:bg-red-500/10 hover:text-red-500 text-zinc-400 rounded-full text-xs md:text-sm font-medium transition-all border border-white/5"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Leave</span>
            </button>
          </div>
        </header>

        {/* Video Grid */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto relative">
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
              userName={useAppContext().userName}
              isLocal
              isFullscreen={fullscreenUserId === "local"}
              onToggleFullscreen={() => toggleFullscreen("local")}
            />
            {Object.entries(remoteStreams).map(([id, data]) => (
              <VideoPlayer
                key={id}
                stream={data.stream}
                userName={data.name}
                isFullscreen={fullscreenUserId === id}
                onToggleFullscreen={() => toggleFullscreen(id)}
              />
            ))}
          </div>
        </main>

        {/* Mobile Sidebar Overlay */}
        <AnimatePresence>
          {showChat && (
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
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
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer Controls */}
        <footer className="h-20 md:h-24 flex items-center justify-center px-4 md:px-6 border-t border-white/5 bg-zinc-900/30 backdrop-blur-md">
          <div className="flex items-center gap-2 md:gap-4">
            <button
              onClick={() => { sound("click"); media.toggleMute(); }}
              className={cn(
                "p-3 md:p-4 rounded-xl md:rounded-2xl transition-all border",
                media.isMuted
                  ? "bg-red-500/10 border-red-500/50 text-red-500"
                  : "bg-zinc-800 border-white/5 text-zinc-200 hover:bg-zinc-700"
              )}
            >
              {media.isMuted ? <MicOff size={20} /> : <Mic size={20} />}
            </button>

            <button
              onClick={() => { sound("click"); media.toggleVideo(); }}
              className={cn(
                "p-3 md:p-4 rounded-xl md:rounded-2xl transition-all border",
                media.isVideoOff
                  ? "bg-red-500/10 border-red-500/50 text-red-500"
                  : "bg-zinc-800 border-white/5 text-zinc-200 hover:bg-zinc-700"
              )}
            >
              {media.isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
            </button>

            <div className="w-px h-6 md:h-8 bg-white/10 mx-1 md:mx-2" />

            <button
              onClick={() => { sound("click"); media.toggleScreenShare({}); }}
              className={cn(
                "flex items-center gap-2 md:gap-3 px-4 md:px-6 py-3 md:py-4 rounded-xl md:rounded-2xl transition-all border font-semibold",
                media.isScreenSharing
                  ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-500"
                  : "bg-zinc-800 border-white/5 text-zinc-200 hover:bg-zinc-700"
              )}
            >
              <Monitor size={20} />
              <span className="text-xs md:text-sm">
                {media.isScreenSharing ? "Sharing" : "Share"}
              </span>
            </button>
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
        onAudioDeviceChange={media.setSelectedAudioDevice}
        onVideoDeviceChange={media.setSelectedVideoDevice}
        onStartMutedChange={media.setStartMuted}
        onStartVideoOffChange={media.setStartVideoOff}
      />
    </div>
  );
}
