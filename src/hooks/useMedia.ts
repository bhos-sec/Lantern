import { useState, useEffect, useRef, useCallback } from 'react';
import { socket } from '../lib/socket';
import { SOCKET_EVENTS } from '@shared/events';

interface MediaPreferences {
  selectedAudioDevice: string;
  selectedVideoDevice: string;
  startMuted: boolean;
  startVideoOff: boolean;
  backgroundBlurEnabled: boolean;
}

export interface UseMediaReturn extends MediaPreferences {
  audioDevices: MediaDeviceInfo[];
  videoDevices: MediaDeviceInfo[];
  localStream: MediaStream | null;
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  setSelectedAudioDevice: (id: string) => void;
  setSelectedVideoDevice: (id: string) => void;
  setStartMuted: (v: boolean) => void;
  setStartVideoOff: (v: boolean) => void;
  setBackgroundBlurEnabled: (v: boolean) => void;
  acquireMedia: () => Promise<MediaStream | null>;
  stopAllTracks: () => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  toggleScreenShare: (peers: Record<string, RTCPeerConnection>) => Promise<void>;
}

/** Manages all local media: device enumeration, track toggling, and screen sharing. */
export function useMedia(): UseMediaReturn {
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState('');
  const [selectedVideoDevice, setSelectedVideoDevice] = useState('');
  const [startMuted, setStartMuted] = useState(false);
  const [startVideoOff, setStartVideoOff] = useState(false);
  const [backgroundBlurEnabled, setBackgroundBlurEnabled] = useState(false);

  // Canvas + animation-frame refs for the blur pipeline
  const blurCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const blurAnimRef = useRef<number>(0);
  const blurVideoRef = useRef<HTMLVideoElement | null>(null);
  // Stores the raw (pre-blur) camera stream so blur can be toggled live
  const rawStreamRef = useRef<MediaStream | null>(null);
  // Tracks latest isVideoOff to avoid stale closures in the blur toggle effect
  const isVideoOffRef = useRef(isVideoOff);
  isVideoOffRef.current = isVideoOff;

  // Enumerate available devices once on mount
  useEffect(() => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    navigator.mediaDevices
      .enumerateDevices()
      .then(devices => {
        setAudioDevices(devices.filter(d => d.kind === 'audioinput'));
        setVideoDevices(devices.filter(d => d.kind === 'videoinput'));
      })
      .catch(console.error);
  }, []);

  // Listen for force-mute from host
  useEffect(() => {
    const handleForceMuted = () => {
      if (localStream) {
        localStream.getAudioTracks().forEach(t => (t.enabled = false));
        setIsMuted(true);
      }
    };
    const handleForceUnmuted = () => {
      if (localStream) {
        localStream.getAudioTracks().forEach(t => (t.enabled = true));
        setIsMuted(false);
      }
    };
    const handleForceCameraOff = () => {
      if (localStream) {
        localStream.getVideoTracks().forEach(t => (t.enabled = false));
        setIsVideoOff(true);
        // Disable blur so the blur pipeline doesn't run on a black frame
        setBackgroundBlurEnabled(false);
      }
    };

    socket.on(SOCKET_EVENTS.FORCE_MUTED, handleForceMuted);
    socket.on(SOCKET_EVENTS.FORCE_UNMUTED, handleForceUnmuted);
    socket.on(SOCKET_EVENTS.FORCE_CAMERA_OFF, handleForceCameraOff);
    return () => {
      socket.off(SOCKET_EVENTS.FORCE_MUTED, handleForceMuted);
      socket.off(SOCKET_EVENTS.FORCE_UNMUTED, handleForceUnmuted);
      socket.off(SOCKET_EVENTS.FORCE_CAMERA_OFF, handleForceCameraOff);
    };
  }, [localStream]);

  /**
   * Starts a CSS `filter: blur()` pipeline on a hidden <video> → <canvas> and
   * returns the canvas capture as a blurred video track.
   */
  const applyBlur = useCallback(
    (rawStream: MediaStream): MediaStream => {
      // Re-use or create the offscreen canvas + video elements
      if (!blurCanvasRef.current) {
        blurCanvasRef.current = document.createElement('canvas');
      }
      if (!blurVideoRef.current) {
        blurVideoRef.current = document.createElement('video');
        blurVideoRef.current.muted = true;
        blurVideoRef.current.playsInline = true;
      }

      const canvas = blurCanvasRef.current;
      const hiddenVideo = blurVideoRef.current;
      hiddenVideo.srcObject = rawStream;

      hiddenVideo.onloadedmetadata = () => {
        canvas.width = hiddenVideo.videoWidth || 640;
        canvas.height = hiddenVideo.videoHeight || 480;
        hiddenVideo.play();
      };

      const ctx = canvas.getContext('2d')!;
      const draw = () => {
        if (hiddenVideo.readyState >= 2) {
          ctx.filter = 'blur(10px)';
          ctx.drawImage(hiddenVideo, 0, 0, canvas.width, canvas.height);
          // Restore person silhouette with a slightly-blurred foreground pass
          ctx.filter = 'blur(2px)';
          ctx.drawImage(hiddenVideo, 0, 0, canvas.width, canvas.height);
          ctx.filter = 'none';
        }
        blurAnimRef.current = requestAnimationFrame(draw);
      };
      cancelAnimationFrame(blurAnimRef.current);
      blurAnimRef.current = requestAnimationFrame(draw);

      // Combine canvas video track with original audio tracks
      const canvasStream = (canvas as any).captureStream(30) as MediaStream;
      return new MediaStream([...canvasStream.getVideoTracks(), ...rawStream.getAudioTracks()]);
    },
    [],
  );

  const stopBlur = useCallback(() => {
    cancelAnimationFrame(blurAnimRef.current);
    if (blurVideoRef.current) {
      blurVideoRef.current.srcObject = null;
    }
  }, []);

  // Live blur toggle: re-process the raw stream when backgroundBlurEnabled changes
  // after media has already been acquired (rawStreamRef is populated).
  useEffect(() => {
    if (!rawStreamRef.current) return;
    if (backgroundBlurEnabled) {
      const blurred = applyBlur(rawStreamRef.current);
      // Sync video-off state onto the new canvas track
      blurred.getVideoTracks().forEach(t => (t.enabled = !isVideoOffRef.current));
      setLocalStream(blurred);
    } else {
      stopBlur();
      const raw = rawStreamRef.current;
      // Raw audio tracks were shared with the blurred stream — enabled state is current.
      // Raw video track was bypassed by the canvas and needs its state restored.
      raw.getVideoTracks().forEach(t => (t.enabled = !isVideoOffRef.current));
      setLocalStream(raw);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backgroundBlurEnabled]);

  /**
   * Tries to acquire camera+mic, then falls back to audio-only, then video-only.
   * Returns the stream or null on full failure.
   */
  const acquireMedia = async (): Promise<MediaStream | null> => {
    if (!navigator.mediaDevices?.getUserMedia) {
      console.error('Media devices are not available. Use HTTPS or localhost.');
      return null;
    }

    const constraints = {
      video: selectedVideoDevice ? { deviceId: { exact: selectedVideoDevice } } : true,
      audio: selectedAudioDevice ? { deviceId: { exact: selectedAudioDevice } } : true,
    };

    let stream: MediaStream | null = null;

    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
        setIsVideoOff(true);
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          setIsMuted(true);
        } catch {
          console.error('Permission denied or no media devices found.');
          return null;
        }
      }
    }

    // Apply pre-join preferences
    stream.getAudioTracks().forEach(t => (t.enabled = !startMuted));
    stream.getVideoTracks().forEach(t => (t.enabled = !startVideoOff));
    setIsMuted(startMuted);
    setIsVideoOff(startVideoOff);

    // Store the raw stream so the live blur toggle can switch back without re-acquiring
    rawStreamRef.current = stream;
    // Apply background blur if requested
    const finalStream = backgroundBlurEnabled ? applyBlur(stream) : stream;
    setLocalStream(finalStream);
    return finalStream;
  };

  const stopAllTracks = () => {
    stopBlur();
    localStream?.getTracks().forEach(t => t.stop());
    setLocalStream(null);
    setIsScreenSharing(false);
  };

  const toggleMute = () => {
    if (!localStream) return;
    localStream.getAudioTracks().forEach(t => (t.enabled = !t.enabled));
    setIsMuted(prev => !prev);
  };

  const toggleVideo = () => {
    if (!localStream) return;
    localStream.getVideoTracks().forEach(t => (t.enabled = !t.enabled));
    setIsVideoOff(prev => !prev);
    // If turning camera off while blur is active, turn blur off too
    if (!isVideoOff && backgroundBlurEnabled) {
      setBackgroundBlurEnabled(false);
    }
  };

  const toggleScreenShare = async (peers: Record<string, RTCPeerConnection>) => {
    if (!isScreenSharing) {
      try {
        if (!navigator.mediaDevices?.getDisplayMedia) return;
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];

        // Replace the video sender in every active peer connection
        Object.values(peers).forEach(pc => {
          pc.getSenders()
            .find(s => s.track?.kind === 'video')
            ?.replaceTrack(screenTrack);
        });

        screenTrack.onended = () => stopScreenShare(peers);

        setLocalStream(prev => {
          if (!prev) return screenStream;
          return new MediaStream([screenTrack, ...prev.getAudioTracks()]);
        });
        setIsScreenSharing(true);
      } catch (err) {
        console.error('Screen share error:', err);
      }
    } else {
      stopScreenShare(peers);
    }
  };

  const stopScreenShare = async (peers: Record<string, RTCPeerConnection>) => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) return;
      const camStream = await navigator.mediaDevices.getUserMedia({ video: true });
      const camTrack = camStream.getVideoTracks()[0];

      Object.values(peers).forEach(pc => {
        pc.getSenders()
          .find(s => s.track?.kind === 'video')
          ?.replaceTrack(camTrack);
      });

      setLocalStream(prev => {
        if (!prev) return camStream;
        prev.getVideoTracks().forEach(t => t.stop());
        return new MediaStream([camTrack, ...prev.getAudioTracks()]);
      });
      setIsScreenSharing(false);
    } catch (err) {
      console.error('Stop screen share error:', err);
    }
  };

  return {
    audioDevices,
    videoDevices,
    localStream,
    isMuted,
    isVideoOff,
    isScreenSharing,
    selectedAudioDevice,
    selectedVideoDevice,
    startMuted,
    startVideoOff,
    backgroundBlurEnabled,
    setSelectedAudioDevice,
    setSelectedVideoDevice,
    setStartMuted,
    setStartVideoOff,
    setBackgroundBlurEnabled,
    acquireMedia,
    stopAllTracks,
    toggleMute,
    toggleVideo,
    toggleScreenShare,
  };
}
