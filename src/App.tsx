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
import { PreJoinPage } from './pages/PreJoinPage';
import { RoomPage } from './pages/RoomPage';
import { DuplicateSessionPage } from './pages/DuplicateSessionPage';
import { SOCKET_EVENTS } from '@shared/events';

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
    pendingRoomId,
    setPendingRoomId,
    pendingRoomPassword,
    setPendingRoomPassword,
    pendingIsCreating,
    setPendingIsCreating,
    pendingIsPrivate,
    setPendingIsPrivate,
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

  // Listen for incoming chat messages and play a sound for others' messages
  useEffect(() => {
    const handleMessage = (msg: any) => {
      addMessage(msg);
      if (msg.senderId !== socket.id) {
        sound('message');
        if (msg.isPrivate) {
          addNotification(`${msg.sender} sent you a private message`, 'info');
        }
      }
    };
    socket.on(SOCKET_EVENTS.RECEIVE_MESSAGE, handleMessage);
    return () => {
      socket.off(SOCKET_EVENTS.RECEIVE_MESSAGE, handleMessage);
    };
  }, [addMessage, sound]);

  // Transition into the room view once the server confirms the join
  useEffect(() => {
    const handleJoinSuccess = (id: string) => {
      setRoomId(id);
      setStep('room');
    };
    socket.on(SOCKET_EVENTS.JOIN_ROOM_SUCCESS, handleJoinSuccess);
    return () => {
      socket.off(SOCKET_EVENTS.JOIN_ROOM_SUCCESS, handleJoinSuccess);
    };
  }, [media.localStream, setStep]);

  // Server closes the room (admin left)
  useEffect(() => {
    const handleRoomClosed = () => {
      leaveRoom();
      addNotification('The room was closed by the admin.', 'info');
    };
    socket.on(SOCKET_EVENTS.ROOM_CLOSED, handleRoomClosed);
    return () => {
      socket.off(SOCKET_EVENTS.ROOM_CLOSED, handleRoomClosed);
    };
  }, []);

  /** Acquire media then ask the server to join/create the room. */
  const joinRoom = useCallback(
    async (idToJoin: string, password?: string, isPrivate?: boolean, isCreating?: boolean) => {
      if (!idToJoin || !userName) return;
      const stream = await media.acquireMedia();
      if (!stream) return; // Permission denied — acquireMedia shows the alert
      socket.emit(SOCKET_EVENTS.JOIN_ROOM, {
        roomId: idToJoin,
        userName,
        password,
        isPrivate,
        isCreating,
      });
    },
    [userName, media],
  );

  /**
   * Called by LobbyPage. Instead of joining immediately, stash the room
   * details and navigate to the pre-join screen for device preview.
   */
  const goToPreJoin = useCallback(
    async (idToJoin: string, password?: string, isPrivate?: boolean, isCreating?: boolean) => {
      if (!idToJoin || !userName) return;
      setPendingRoomId(idToJoin);
      setPendingRoomPassword(password);
      setPendingIsPrivate(isPrivate ?? false);
      setPendingIsCreating(isCreating ?? false);
      setStep('pre-join');
    },
    [userName, setPendingRoomId, setPendingRoomPassword, setPendingIsPrivate, setPendingIsCreating, setStep],
  );

  /** Called from PreJoinPage "Join Now" — actually performs the join. */
  const confirmPreJoin = useCallback(async () => {
    if (!pendingRoomId) return;
    await joinRoom(pendingRoomId, pendingRoomPassword, pendingIsPrivate, pendingIsCreating);
  }, [pendingRoomId, pendingRoomPassword, pendingIsPrivate, pendingIsCreating, joinRoom]);

  /** Stop tracks, close peers, clear messages, go back to lobby. */
  const leaveRoom = useCallback(() => {
    sound('click');
    media.stopAllTracks();
    closeAllPeers();
    clearMessages();
    socket.emit(SOCKET_EVENTS.LEAVE_ROOM, roomId);
    setStep('lobby');
  }, [media, closeAllPeers, clearMessages, roomId, sound, setStep]);

  const handleToggleScreenShare = useCallback(async () => {
    await media.toggleScreenShare(peersRef.current ?? {});
  }, [media]);

  const toggleRoomPrivacy = (isPrivate: boolean) => {
    sound('click');
    socket.emit(SOCKET_EVENTS.TOGGLE_ROOM_PRIVACY, isPrivate);
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

      {step === 'lobby' && <LobbyPage media={media} onJoinRoom={goToPreJoin} />}

      {step === 'pre-join' && (
        <PreJoinPage
          media={media}
          onConfirmJoin={confirmPreJoin}
          onBack={() => {
            media.stopAllTracks();
            setStep('lobby');
          }}
        />
      )}

      {step === 'room' && (
        <RoomPage
          roomId={roomId}
          media={media}
          remoteStreams={remoteStreams}
          messages={messages}
          onSendMessage={sendMessage}
          onLeaveRoom={leaveRoom}
          onTogglePrivacy={toggleRoomPrivacy}
          onToggleScreenShare={handleToggleScreenShare}
        />
      )}

      {step !== 'name' && step !== 'lobby' && step !== 'pre-join' && step !== 'room' && (
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


