import { useState, useEffect } from 'react';

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

    socket.on('force-muted', handleForceMuted);
    socket.on('force-unmuted', handleForceUnmuted);
    return () => {
      socket.off('force-muted', handleForceMuted);
      socket.off('force-unmuted', handleForceUnmuted);
    };
  }, [localStream]);

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

    // Apply background blur if requested
    const finalStream = backgroundBlurEnabled ? applyBlur(stream) : stream;
    setLocalStream(finalStream);
    return finalStream;
  };

  const stopAllTracks = () => {
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
