import React, { useState, useEffect, useCallback } from 'react';
import { socket } from './lib/socket';
import { useAppContext } from './context/AppContext';
import { useMedia } from './hooks/useMedia';
import { useWebRTC } from './hooks/useWebRTC';
import { useRoom } from './hooks/useRoom';
import { NotificationToast } from './components/ui/NotificationToast';
import { NameEntryPage } from './pages/NameEntryPage';
import { LobbyPage } from './pages/LobbyPage';
import { RoomPage } from './pages/RoomPage';

/**
 * Root component — thin orchestrator.
 *
 * Owns the three cross-cutting hooks (media, WebRTC, room/chat) so their
 * state and refs persist across the lobby → room transition.
 * Pure UI lives in src/pages/; business logic lives in hooks/ and context/.
 */
export default function App() {
  const { step, setStep, userName, notifications, addNotification, sound } = useAppContext();
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

  // Listen for incoming chat messages and play a sound for others' messages
  useEffect(() => {
    const handleMessage = (msg: any) => {
      addMessage(msg);
      if (msg.senderId !== socket.id) sound('message');
    };
    socket.on('receive-message', handleMessage);
    return () => { socket.off('receive-message', handleMessage); };
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
        _ = audio; _ = video; // already set inside acquireMedia
      }
    };
    socket.on('join-room-success', handleJoinSuccess);
    return () => { socket.off('join-room-success', handleJoinSuccess); };
  }, [media.localStream, setStep]);

  // Server closes the room (admin left)
  useEffect(() => {
    const handleRoomClosed = () => {
      leaveRoom();
      addNotification('The room was closed by the admin.', 'info');
    };
    socket.on('room-closed', handleRoomClosed);
    return () => { socket.off('room-closed', handleRoomClosed); };
  }, []);

  /** Acquire media then ask the server to join/create the room. */
  const joinRoom = useCallback(
    async (
      idToJoin: string,
      password?: string,
      isPrivate?: boolean,
      isCreating?: boolean,
    ) => {
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
