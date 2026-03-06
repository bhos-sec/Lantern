import React, { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Hash,
  Shield,
  Zap,
  Users,
  Settings,
  Volume2,
  VolumeX,
} from "lucide-react";
import { socket } from "../lib/socket";
import { useAppContext } from "../context/AppContext";
import { useMedia } from "../hooks/useMedia";
import { MediaSettingsModal } from "../components/ui/MediaSettingsModal";
import { cn } from "../lib/utils";

interface LobbyPageProps {
  /** Called when the user successfully acquires media + emits join-room. */
  onJoinRoom: (
    idToJoin: string,
    password?: string,
    isPrivate?: boolean,
    isCreating?: boolean
  ) => Promise<void>;
}

/**
 * Step 2 — Lobby.
 * Users can create or join a room, see active public rooms, and browse online users.
 */
export function LobbyPage({ onJoinRoom }: LobbyPageProps) {
  const {
    userName,
    onlineUsers,
    soundEnabled,
    setSoundEnabled,
    sound,
    setStep,
    error,
  } = useAppContext();

  const media = useMedia();

  const [roomId, setRoomId] = useState("");
  const [roomPassword, setRoomPassword] = useState("");
  const [isPrivateRoom, setIsPrivateRoom] = useState(false);
  const [sessionTab, setSessionTab] = useState<"create" | "join">("create");
  const [lobbyTab, setLobbyTab] = useState<"rooms" | "people">("rooms");
  const [showSettings, setShowSettings] = useState(false);

  // Unique public rooms visible to this client
  const activeRooms = [
    ...new Set(onlineUsers.map((u) => u.roomId).filter(Boolean)),
  ] as string[];

  const handleJoin = (id: string, pw?: string, priv?: boolean, creating?: boolean) => {
    sound("click");
    onJoinRoom(id, pw, priv, creating);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-4xl space-y-8"
      >
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-white">Nexus Lobby</h1>
            <p className="text-zinc-500 text-sm">
              You are online as{" "}
              <span className="text-emerald-500 font-bold">{userName}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { sound("click"); setSoundEnabled(!soundEnabled); }}
              className={cn(
                "p-2 rounded-xl border transition-all",
                soundEnabled
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                  : "bg-zinc-800 border-white/5 text-zinc-500"
              )}
              title={soundEnabled ? "Mute sounds" : "Unmute sounds"}
            >
              {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
            <button
              onClick={() => { sound("click"); setShowSettings(true); }}
              className="p-2 bg-zinc-900 text-zinc-400 hover:text-white rounded-xl border border-white/5 transition-all"
              title="Media Settings"
            >
              <Settings size={18} />
            </button>
            <button
              onClick={() => { sound("click"); setStep("name"); }}
              className="px-4 py-2 bg-zinc-900 text-zinc-400 hover:text-white rounded-xl border border-white/5 transition-all text-sm"
            >
              Change Name
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Create / Join panel */}
          <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/5 p-8 rounded-3xl shadow-2xl space-y-6">
            <div className="flex items-center gap-1 bg-zinc-800/50 p-1 rounded-2xl">
              {(["create", "join"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => { sound("click"); setSessionTab(tab); }}
                  className={cn(
                    "flex-1 py-2 rounded-xl text-xs font-bold transition-all capitalize",
                    sessionTab === tab
                      ? "bg-zinc-700 text-white"
                      : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              <div className="space-y-3">
                {/* Room ID input */}
                <div className="relative">
                  <Hash className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
                  <input
                    type="text"
                    placeholder="Room ID"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    className="w-full bg-zinc-800 border border-white/5 rounded-2xl pl-12 pr-5 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all placeholder:text-zinc-600 text-sm"
                  />
                </div>

                {/* Password input */}
                <div className="relative">
                  <Shield className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
                  <input
                    type="password"
                    placeholder="Password (Optional)"
                    value={roomPassword}
                    onChange={(e) => setRoomPassword(e.target.value)}
                    className="w-full bg-zinc-800 border border-white/5 rounded-2xl pl-12 pr-5 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all placeholder:text-zinc-600 text-sm"
                  />
                </div>

                {sessionTab === "create" && (
                  <label className="flex items-center gap-3 p-4 bg-zinc-800/50 border border-white/5 rounded-2xl cursor-pointer hover:bg-zinc-800 transition-all group">
                    <div
                      className={cn(
                        "w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
                        isPrivateRoom
                          ? "bg-emerald-500 border-emerald-500"
                          : "border-zinc-600 group-hover:border-zinc-500"
                      )}
                    >
                      {isPrivateRoom && <Zap size={12} className="text-white fill-current" />}
                    </div>
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={isPrivateRoom}
                      onChange={(e) => { sound("click"); setIsPrivateRoom(e.target.checked); }}
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-zinc-200">Private Room</span>
                      <span className="text-[10px] text-zinc-500">
                        Don't show to others in lobby
                      </span>
                    </div>
                  </label>
                )}
              </div>

              {error && (
                <p className="text-xs text-red-500 bg-red-500/10 p-3 rounded-xl border border-red-500/20">
                  {error}
                </p>
              )}

              <button
                onClick={() =>
                  handleJoin(roomId, roomPassword, isPrivateRoom, sessionTab === "create")
                }
                disabled={!roomId.trim()}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold py-4 rounded-2xl transition-all shadow-lg shadow-emerald-600/20"
              >
                {sessionTab === "create" ? "Create & Join" : "Join Room"}
              </button>
            </div>
          </div>

          {/* Rooms / People tabs */}
          <div className="lg:col-span-2 bg-zinc-900/50 backdrop-blur-xl border border-white/5 p-8 rounded-3xl shadow-2xl flex flex-col">
            <div className="flex items-center gap-1 bg-zinc-800/50 p-1 rounded-2xl mb-6">
              <button
                onClick={() => { sound("click"); setLobbyTab("rooms"); }}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all",
                  lobbyTab === "rooms"
                    ? "bg-emerald-600 text-white shadow-lg"
                    : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                <Hash size={18} />
                Active Rooms
              </button>
              <button
                onClick={() => { sound("click"); setLobbyTab("people"); }}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all",
                  lobbyTab === "people"
                    ? "bg-emerald-600 text-white shadow-lg"
                    : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                <Users size={18} />
                People Online
              </button>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[400px] pr-2 scrollbar-thin">
              <AnimatePresence mode="wait">
                {lobbyTab === "rooms" ? (
                  <motion.div
                    key="rooms"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-3"
                  >
                    {activeRooms.length === 0 ? (
                      <div className="col-span-full h-48 flex flex-col items-center justify-center text-zinc-600 border-2 border-dashed border-white/5 rounded-2xl">
                        <Hash size={40} className="mb-3 opacity-20" />
                        <p className="text-sm">No public rooms active</p>
                      </div>
                    ) : (
                      activeRooms.map((room) => (
                        <div
                          key={room}
                          className="flex items-center justify-between p-4 bg-zinc-800/50 border border-white/5 rounded-2xl group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-500/10 rounded-lg">
                              <Hash size={18} className="text-emerald-500" />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-medium text-zinc-200">{room}</span>
                              <span className="text-[10px] text-zinc-500">
                                {onlineUsers.filter((u) => u.roomId === room).length} People
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleJoin(room, undefined, undefined, false)}
                            className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white rounded-xl text-xs font-bold transition-all border border-emerald-500/20"
                          >
                            Join
                          </button>
                        </div>
                      ))
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="people"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-3"
                  >
                    {onlineUsers.filter((u) => u.id !== socket.id).length === 0 ? (
                      <div className="col-span-full h-48 flex flex-col items-center justify-center text-zinc-600 border-2 border-dashed border-white/5 rounded-2xl">
                        <Users size={40} className="mb-3 opacity-20" />
                        <p className="text-sm">You're the only one here!</p>
                      </div>
                    ) : (
                      onlineUsers
                        .filter((u) => u.id !== socket.id)
                        .map((user) => (
                          <div
                            key={user.id}
                            className="flex items-center justify-between p-4 bg-zinc-800/50 border border-white/5 rounded-2xl"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-zinc-700 rounded-full flex items-center justify-center text-zinc-400 font-bold">
                                {user.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-medium text-zinc-200">{user.name}</span>
                                <span className="text-[10px] text-zinc-500">
                                  {user.roomId
                                    ? `In: ${user.roomId}`
                                    : user.actualRoomId
                                    ? "In Private Room"
                                    : "In Lobby"}
                                </span>
                              </div>
                            </div>
                            {user.actualRoomId && !user.isRoomPrivate && (
                              <button
                                onClick={() =>
                                  handleJoin(user.actualRoomId!, undefined, undefined, false)
                                }
                                className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white rounded-lg text-xs font-bold transition-all border border-emerald-500/20"
                              >
                                Join
                              </button>
                            )}
                          </div>
                        ))
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Footer badge row */}
        <div className="p-4 bg-zinc-900/50 border border-white/5 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <Shield size={14} className="text-emerald-500" />
              <span>P2P Encryption</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <Zap size={14} className="text-emerald-500" />
              <span>Low Latency</span>
            </div>
          </div>
          <p className="text-[11px] text-zinc-600 italic">
            Nexus Stream — serverless-style private media sharing
          </p>
        </div>
      </motion.div>

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
