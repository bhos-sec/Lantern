import React, { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Mic, MicOff, Video, VideoOff, ChevronRight, ChevronLeft } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { cn } from '../lib/utils';
import type { UseMediaReturn } from '../hooks/useMedia';

interface PreJoinPageProps {
  media: UseMediaReturn;
  /** Called when the user clicks "Join Now" — proceeds to the real join flow. */
  onConfirmJoin: () => Promise<void>;
  /** Called when the user clicks "Back to Lobby". */
  onBack: () => void;
}

/**
 * Pre-join screen (Issue #8).
 * Lets users preview their camera/mic, choose input devices, toggle background
 * blur, and configure mute/video-off before entering the meeting.
 */
export function PreJoinPage({ media, onConfirmJoin, onBack }: PreJoinPageProps) {
  const { sound } = useAppContext();
  const videoRef = useRef<HTMLVideoElement>(null);

  // Acquire a preview stream as soon as the page mounts
  useEffect(() => {
    let previewStream: MediaStream | null = null;
    (async () => {
      previewStream = await media.acquireMedia();
    })();
    return () => {
      // Stop the preview when leaving, unless the user confirmed (App will manage the stream)
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the <video> element in sync with localStream
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = media.localStream;
    }
  }, [media.localStream]);

  const handleJoin = async () => {
    sound('click');
    await onConfirmJoin();
  };

  return (
    <div className={cn('min-h-dvh flex items-center justify-center p-4 md:p-8', 'bg-zinc-950')}>
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25 }}
        className="w-full max-w-3xl space-y-6"
      >
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-white">
            Ready to join?
          </h1>
          <p className="text-zinc-500 text-sm">Configure your devices before entering.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Camera Preview */}
          <div className="relative rounded-2xl overflow-hidden bg-zinc-900 aspect-video border border-zinc-200 dark:border-white/5 shadow-lg">
            {media.isVideoOff ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-zinc-500">
                <VideoOff size={40} />
                <span className="text-sm">Camera is off</span>
              </div>
            ) : (
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            )}

            {/* Overlay badges */}
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    sound('click');
                    media.toggleMute();
                  }}
                  className={cn(
                    'p-2 rounded-xl border transition-all',
                    media.isMuted
                      ? 'bg-red-500/20 border-red-500/50 text-red-400'
                      : 'bg-black/40 border-white/10 text-white backdrop-blur-sm',
                  )}
                  title={media.isMuted ? 'Unmute' : 'Mute'}
                >
                  {media.isMuted ? <MicOff size={16} /> : <Mic size={16} />}
                </button>
                <button
                  onClick={() => {
                    sound('click');
                    media.toggleVideo();
                  }}
                  className={cn(
                    'p-2 rounded-xl border transition-all',
                    media.isVideoOff
                      ? 'bg-red-500/20 border-red-500/50 text-red-400'
                      : 'bg-black/40 border-white/10 text-white backdrop-blur-sm',
                  )}
                  title={media.isVideoOff ? 'Turn on camera' : 'Turn off camera'}
                >
                  {media.isVideoOff ? <VideoOff size={16} /> : <Video size={16} />}
                </button>
              </div>
            </div>
          </div>

          {/* Settings Panel */}
          <div className="flex flex-col gap-4 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-white/5 rounded-2xl p-6 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
              Device Settings
            </h2>

            {/* Microphone */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                <Mic size={12} />
                Microphone
              </label>
              <select
                value={media.selectedAudioDevice}
                onChange={e => media.setSelectedAudioDevice(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/5 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              >
                <option value="">Default Microphone</option>
                {media.audioDevices.map(d => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Microphone ${d.deviceId.slice(0, 6)}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Camera */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                <Video size={12} />
                Camera
              </label>
              <select
                value={media.selectedVideoDevice}
                onChange={e => media.setSelectedVideoDevice(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/5 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              >
                <option value="">Default Camera</option>
                {media.videoDevices.map(d => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Camera ${d.deviceId.slice(0, 6)}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Join Preferences */}
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Join preferences
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    sound('click');
                    media.setStartMuted(!media.startMuted);
                  }}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border text-xs font-medium transition-all',
                    media.startMuted
                      ? 'bg-red-500/10 border-red-500/30 text-red-500'
                      : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-white/5 text-zinc-600 dark:text-zinc-400',
                  )}
                >
                  {media.startMuted ? <MicOff size={13} /> : <Mic size={13} />}
                  {media.startMuted ? 'Muted' : 'Mic On'}
                </button>
                <button
                  onClick={() => {
                    sound('click');
                    media.setStartVideoOff(!media.startVideoOff);
                  }}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border text-xs font-medium transition-all',
                    media.startVideoOff
                      ? 'bg-red-500/10 border-red-500/30 text-red-500'
                      : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-white/5 text-zinc-600 dark:text-zinc-400',
                  )}
                >
                  {media.startVideoOff ? <VideoOff size={13} /> : <Video size={13} />}
                  {media.startVideoOff ? 'Video Off' : 'Video On'}
                </button>
              </div>
            </div>

            <div className="flex-1" />

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  sound('click');
                  onBack();
                }}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-white/5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-xl text-sm font-medium transition-all"
              >
                <ChevronLeft size={16} />
                Back
              </button>
              <button
                onClick={handleJoin}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-emerald-500/20"
              >
                Join Now
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
