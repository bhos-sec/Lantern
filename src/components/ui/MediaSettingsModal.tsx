import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Settings, X, Video, VideoOff, Mic, MicOff } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Props {
  open: boolean;
  onClose: () => void;
  audioDevices: MediaDeviceInfo[];
  videoDevices: MediaDeviceInfo[];
  selectedAudioDevice: string;
  selectedVideoDevice: string;
  startMuted: boolean;
  startVideoOff: boolean;
  onAudioDeviceChange: (id: string) => void;
  onVideoDeviceChange: (id: string) => void;
  onStartMutedChange: (v: boolean) => void;
  onStartVideoOffChange: (v: boolean) => void;
}

/** Modal for selecting camera/mic and setting join-time media defaults. */
export function MediaSettingsModal({
  open,
  onClose,
  audioDevices,
  videoDevices,
  selectedAudioDevice,
  selectedVideoDevice,
  startMuted,
  startVideoOff,
  onAudioDeviceChange,
  onVideoDeviceChange,
  onStartMutedChange,
  onStartVideoOffChange,
}: Props) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-3xl overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="p-6 border-b border-zinc-200 dark:border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Settings className="text-emerald-500" size={20} />
                <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Media Settings</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Device selectors */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 px-1">
                    Camera
                  </label>
                  <select
                    value={selectedVideoDevice}
                    onChange={e => onVideoDeviceChange(e.target.value)}
                    className="w-full bg-zinc-800 border border-white/5 rounded-xl px-4 py-3 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  >
                    <option value="">Default Camera</option>
                    {videoDevices.map(d => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label || `Camera ${d.deviceId.slice(0, 5)}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 px-1">
                    Microphone
                  </label>
                  <select
                    value={selectedAudioDevice}
                    onChange={e => onAudioDeviceChange(e.target.value)}
                    className="w-full bg-zinc-800 border border-white/5 rounded-xl px-4 py-3 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  >
                    <option value="">Default Microphone</option>
                    {audioDevices.map(d => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label || `Microphone ${d.deviceId.slice(0, 5)}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Join preferences */}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 px-1">
                  Join Preferences
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => onStartVideoOffChange(!startVideoOff)}
                    className={cn(
                      'flex items-center justify-center gap-2 p-4 rounded-2xl border transition-all text-sm font-medium',
                      startVideoOff
                        ? 'bg-red-500/10 border-red-500/50 text-red-500'
                        : 'bg-zinc-800 border-white/5 text-zinc-300',
                    )}
                  >
                    {startVideoOff ? <VideoOff size={18} /> : <Video size={18} />}
                    Video {startVideoOff ? 'Off' : 'On'}
                  </button>
                  <button
                    onClick={() => onStartMutedChange(!startMuted)}
                    className={cn(
                      'flex items-center justify-center gap-2 p-4 rounded-2xl border transition-all text-sm font-medium',
                      startMuted
                        ? 'bg-red-500/10 border-red-500/50 text-red-500'
                        : 'bg-zinc-800 border-white/5 text-zinc-300',
                    )}
                  >
                    {startMuted ? <MicOff size={18} /> : <Mic size={18} />}
                    Mic {startMuted ? 'Off' : 'On'}
                  </button>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-emerald-600/20"
              >
                Save Settings
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
