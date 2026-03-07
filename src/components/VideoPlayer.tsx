import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Maximize, Minimize, ZoomIn, ZoomOut, Hand } from 'lucide-react';

interface VideoPlayerProps {
  stream: MediaStream | null;
  userName: string;
  isLocal?: boolean;
  isMuted?: boolean;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  /** Whether this participant has their hand raised (shown as a badge). */
  handRaised?: boolean;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  stream,
  userName,
  isLocal,
  isMuted,
  isFullscreen,
  onToggleFullscreen,
  handRaised,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    if (!isFullscreen) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
  }, [isFullscreen]);

  useEffect(() => {
    if (!stream || stream.getAudioTracks().length === 0) return;

    let audioContext: AudioContext;
    let analyser: AnalyserNode;
    let microphone: MediaStreamAudioSourceNode;
    let javascriptNode: ScriptProcessorNode;

    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      analyser = audioContext.createAnalyser();
      microphone = audioContext.createMediaStreamSource(stream);
      javascriptNode = audioContext.createScriptProcessor(2048, 1, 1);

      analyser.smoothingTimeConstant = 0.8;
      analyser.fftSize = 1024;

      microphone.connect(analyser);
      analyser.connect(javascriptNode);
      javascriptNode.connect(audioContext.destination);

      javascriptNode.onaudioprocess = () => {
        const array = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(array);
        let values = 0;

        const length = array.length;
        for (let i = 0; i < length; i++) {
          values += array[i];
        }

        const average = values / length;
        if (average > 15) {
          // Threshold for speaking
          setIsSpeaking(true);
        } else {
          setIsSpeaking(false);
        }
      };
    } catch (e) {
      console.error('AudioContext error', e);
    }

    return () => {
      if (javascriptNode) {
        javascriptNode.disconnect();
        javascriptNode.onaudioprocess = null;
      }
      if (analyser) analyser.disconnect();
      if (microphone) microphone.disconnect();
      if (audioContext && audioContext.state !== 'closed') audioContext.close();
    };
  }, [stream]);

  const handleWheel = (e: React.WheelEvent) => {
    if (!isFullscreen) return;
    setZoom(prev => {
      const newZoom = prev - e.deltaY * 0.005;
      const clampedZoom = Math.min(Math.max(1, newZoom), 5);
      if (clampedZoom === 1) setPan({ x: 0, y: 0 });
      return clampedZoom;
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isFullscreen || zoom <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !isFullscreen || zoom <= 1) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoom(prev => Math.min(prev + 0.5, 5));
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoom(prev => {
      const newZoom = Math.max(prev - 0.5, 1);
      if (newZoom === 1) setPan({ x: 0, y: 0 });
      return newZoom;
    });
  };

  return (
    <div
      className={`relative group bg-zinc-200 dark:bg-zinc-900 rounded-2xl overflow-hidden border shadow-2xl transition-all duration-300 ${
        isFullscreen ? 'fixed inset-4 z-50' : 'aspect-video'
      } ${isSpeaking ? 'border-emerald-500 shadow-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'border-zinc-300 dark:border-white/5'}`}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal || isMuted}
        className={`w-full h-full ${isFullscreen ? 'object-contain' : 'object-cover'}`}
        style={{
          transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
          cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
          transition: isDragging ? 'none' : 'transform 0.2s ease-out',
        }}
      />
      <div className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-full border border-white/10">
        <div
          className={
            isLocal
              ? 'w-2 h-2 rounded-full bg-emerald-500 animate-pulse'
              : 'w-2 h-2 rounded-full bg-blue-500'
          }
        />
        <span className="text-xs font-medium text-white">
          {userName} {isLocal && '(You)'}
        </span>
      </div>

      {/* Raised hand badge */}
      {handRaised && (
        <div className="absolute top-4 left-4 flex items-center gap-1.5 px-2.5 py-1.5 bg-yellow-400/90 backdrop-blur-md rounded-full border border-yellow-300/50 animate-bounce">
          <Hand size={14} className="text-yellow-900" />
          <span className="text-xs font-semibold text-yellow-900">Hand Raised</span>
        </div>
      )}

      {isFullscreen && (
        <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-black/40 backdrop-blur-md rounded-lg border border-white/10 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleZoomOut}
            disabled={zoom <= 1}
            className="p-1.5 text-white hover:bg-white/20 rounded-md disabled:opacity-50 disabled:hover:bg-transparent"
            title="Zoom Out"
          >
            <ZoomOut size={16} />
          </button>
          <span className="text-xs font-medium text-white w-12 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            disabled={zoom >= 5}
            className="p-1.5 text-white hover:bg-white/20 rounded-md disabled:opacity-50 disabled:hover:bg-transparent"
            title="Zoom In"
          >
            <ZoomIn size={16} />
          </button>
        </div>
      )}

      {onToggleFullscreen && (
        <button
          onClick={onToggleFullscreen}
          className="absolute top-4 right-4 p-2 bg-black/40 backdrop-blur-md rounded-lg border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity text-white hover:bg-black/60"
        >
          {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
        </button>
      )}
    </div>
  );
};
