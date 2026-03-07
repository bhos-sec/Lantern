import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Zap, Settings, Volume2, VolumeX, Sun, Moon } from 'lucide-react';
import { socket } from '../lib/socket';
import { useAppContext } from '../context/AppContext';
import { useTheme } from '../hooks/useTheme';
import { MediaSettingsModal } from '../components/ui/MediaSettingsModal';
import type { UseMediaReturn } from '../hooks/useMedia';
import { cn } from '../lib/utils';

/**
 * Step 1 — Name entry.
 * The user sets their display name; on success the server emits "name-set-success"
 * and AppContext transitions to the lobby.
 */
export function NameEntryPage({ media }: { media: UseMediaReturn }) {
  const { userName, setUserName, onlineUsers, soundEnabled, setSoundEnabled, sound, error } =
    useAppContext();
  const { isDark, toggleTheme } = useTheme();

  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Re-enable the button whenever the server responds with an error
  useEffect(() => {
    if (error) {
      setHasSubmitted(false);
    }
  }, [error]);

  // Also re-enable the button whenever the user edits their name
  useEffect(() => {
    setHasSubmitted(false);
  }, [userName]);

  const enterLobby = () => {
    if (!userName.trim()) return;
    sound('click');
    setHasSubmitted(true);
    socket.emit('set-name', userName);
  };

  return (
    <div className="min-h-dvh flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-6 relative">
      {/* Top-right controls */}
      <div className="absolute top-6 right-6 flex items-center gap-2">
        <button
          onClick={toggleTheme}
          className="p-3 bg-zinc-100 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-2xl border border-zinc-200 dark:border-white/5 transition-all"
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        <button
          onClick={() => {
            sound('click');
            setSoundEnabled(!soundEnabled);
          }}
          className={cn(
            'p-3 rounded-2xl border transition-all',
            soundEnabled
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
              : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-white/5 text-zinc-500',
          )}
          title={soundEnabled ? 'Mute sounds' : 'Unmute sounds'}
        >
          {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
        </button>
        <button
          onClick={() => {
            sound('click');
            setShowSettings(true);
          }}
          className="p-3 bg-zinc-100 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-2xl border border-zinc-200 dark:border-white/5 transition-all"
          title="Media Settings"
        >
          <Settings size={20} />
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-8"
      >
        {/* Brand */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 mb-4">
            <Zap className="text-emerald-500" size={32} />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Lantern
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400">Private real-time media sharing</p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-zinc-900/50 backdrop-blur-xl border border-zinc-200 dark:border-white/5 p-8 rounded-3xl shadow-lg dark:shadow-2xl space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 ml-1">
                Your Name
              </label>
              <input
                type="text"
                placeholder="Enter your name"
                value={userName}
                onChange={e => setUserName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && enterLobby()}
                className="w-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-white/5 rounded-2xl px-5 py-4 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
              />
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-red-500 bg-red-500/10 p-3 rounded-xl border border-red-500/20"
              >
                {error}
              </motion.p>
            )}
          </div>

          <button
            onClick={enterLobby}
            disabled={!userName.trim() || hasSubmitted}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-2xl transition-all shadow-lg shadow-emerald-600/20 active:scale-[0.98]"
          >
            Enter Lantern
          </button>

          {/* Preview of who's online */}
          {onlineUsers.length > 0 && (
            <div className="pt-4 border-t border-zinc-200 dark:border-white/5 space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                  People Online
                </span>
                <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  {onlineUsers.length}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {onlineUsers.slice(0, 5).map(user => (
                  <div
                    key={user.id}
                    className="flex items-center gap-2 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-white/5 rounded-xl text-[10px] text-zinc-700 dark:text-zinc-300"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {user.name}
                  </div>
                ))}
                {onlineUsers.length > 5 && (
                  <div className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-white/5 rounded-xl text-[10px] text-zinc-400 dark:text-zinc-500 italic">
                    +{onlineUsers.length - 5} more
                  </div>
                )}
              </div>
            </div>
          )}
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
