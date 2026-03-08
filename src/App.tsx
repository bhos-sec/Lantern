import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { MonitorX } from 'lucide-react';
import { socket } from './lib/socket';
import { useAppContext } from './context/AppContext';
import { useMedia } from './hooks/useMedia';
import { useWebRTC } from './hooks/useWebRTC';
import { useRoom } from './hooks/useRoom';
import { NotificationToast } from './components/ui/NotificationToast';
import { NameEntryPage } from './pages/NameEntryPage';
import { LobbyPage } from './pages/LobbyPage';
import { RoomPage } from './pages/RoomPage';
import { DuplicateSessionPage } from './pages/DuplicateSessionPage';

/**
 * Root component — thin orchestrator.
 *
 * Owns the three cross-cutting hooks (media, WebRTC, room/chat) so their
 * state and refs persist across the lobby → room transition.
 * Pure UI lives in src/pages/; business logic lives in hooks/ and context/.
 */
export default function App() {
  const {
    step,
    setStep,
    userName,
    notifications,
    addNotification,
    sound,
    isDuplicateSession,
    isSessionTakenOver,
    takeOverSession,
  } = useAppContext();
  const [roomId, setRoomId] = useState('');

  const media = useMedia();
  const { peersRef, remoteStreams, closeAllPeers } = useWebRTC({
    socket,
    localStream: media.localStream,
    userName,
  });
  const { messages, addMessage, clearMessages, sendMessage } = useRoom({
    socket,
    userName,
    roomId,
  });

  // Clean up resources when session is taken over by another tab
  useEffect(() => {
    if (!isSessionTakenOver) return;
    media.stopAllTracks();
    closeAllPeers();
    clearMessages();
    socket.disconnect();
  }, [isSessionTakenOver, media, closeAllPeers, clearMessages]);

  // Listen for incoming chat messages and play a sound for others' messages
  useEffect(() => {
    const handleMessage = (msg: any) => {
      addMessage(msg);
      if (msg.senderId !== socket.id) sound('message');
    };
    socket.on('receive-message', handleMessage);
    return () => {
      socket.off('receive-message', handleMessage);
    };
  }, [addMessage, sound]);

  // Transition into the room view once the server confirms the join
  useEffect(() => {
    const handleJoinSuccess = (id: string) => {
      setRoomId(id);
      setStep('room');
      // Sync mute/video UI with the actual track states acquired during join
      if (media.localStream) {
        const audio = media.localStream.getAudioTracks()[0];
        const video = media.localStream.getVideoTracks()[0];
        // The useMedia hook keeps isMuted / isVideoOff in sync via acquireMedia
        _ = audio;
        _ = video; // already set inside acquireMedia
      }
    };
    socket.on('join-room-success', handleJoinSuccess);
    return () => {
      socket.off('join-room-success', handleJoinSuccess);
    };
  }, [media.localStream, setStep]);

  // Server closes the room (admin left)
  useEffect(() => {
    const handleRoomClosed = () => {
      leaveRoom();
      addNotification('The room was closed by the admin.', 'info');
    };
    socket.on('room-closed', handleRoomClosed);
    return () => {
      socket.off('room-closed', handleRoomClosed);
    };
  }, []);

  /** Acquire media then ask the server to join/create the room. */
  const joinRoom = useCallback(
    async (idToJoin: string, password?: string, isPrivate?: boolean, isCreating?: boolean) => {
      if (!idToJoin || !userName) return;
      const stream = await media.acquireMedia();
      if (!stream) return; // Permission denied — acquireMedia shows the alert
      socket.emit('join-room', {
        roomId: idToJoin,
        userName,
        password,
        isPrivate,
        isCreating,
      });
    },
    [userName, media],
  );

  /** Stop tracks, close peers, clear messages, go back to lobby. */
  const leaveRoom = useCallback(() => {
    sound('click');
    media.stopAllTracks();
    closeAllPeers();
    clearMessages();
    socket.emit('leave-room', roomId);
    setStep('lobby');
  }, [media, closeAllPeers, clearMessages, roomId, sound, setStep]);

  const toggleRoomPrivacy = (isPrivate: boolean) => {
    sound('click');
    socket.emit('toggle-room-privacy', isPrivate);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  // Session taken over by a newer tab on the same device (production only).
  if (isSessionTakenOver) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-zinc-950 p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md text-center space-y-6"
        >
          <div className="inline-flex p-4 bg-zinc-800/60 rounded-2xl border border-white/5">
            <MonitorX className="text-zinc-400" size={36} />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white">Session moved</h2>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Your Lantern session was opened in another tab. Close this window or refresh to start
              a new session.
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 border border-white/5 text-white text-sm font-medium rounded-2xl transition-all"
          >
            Refresh &amp; reconnect
          </button>
        </motion.div>
      </div>
    );
  }

  // This tab tried to connect but another tab on the same device is active.
  if (isDuplicateSession) {
    return <DuplicateSessionPage onTakeOver={takeOverSession} />;
  }

  return (
    <>
      <NotificationToast notifications={notifications} />

      {step === 'name' && <NameEntryPage media={media} />}

      {step === 'lobby' && <LobbyPage media={media} onJoinRoom={joinRoom} />}

      {step === 'room' && (
        <RoomPage
          roomId={roomId}
          media={media}
          remoteStreams={remoteStreams}
          messages={messages}
          onSendMessage={sendMessage}
          onLeaveRoom={leaveRoom}
          onTogglePrivacy={toggleRoomPrivacy}
        />
      )}

      {step !== 'name' && step !== 'lobby' && step !== 'room' && (
        <div className="min-h-dvh flex items-center justify-center bg-zinc-950">
          <button
            onClick={() => setStep('name')}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            Return to start
          </button>
        </div>
      )}
    </>
  );
}

// Silence TS "variable declared but never read" for the sync block above
declare let _: any;
