import { useRef, useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { ICE_SERVERS } from '../lib/constants';
import { SOCKET_EVENTS } from '@shared/events';
import type {
  UserJoinedPayload,
  IncomingOfferPayload,
  IncomingAnswerPayload,
  IncomingIceCandidatePayload,
} from '@shared/types';

export interface RemoteStream {
  stream: MediaStream;
  name: string;
}

interface UseWebRTCProps {
  socket: Socket;
  localStream: MediaStream | null;
  userName: string;
}

/**
 * Manages the full WebRTC peer mesh:
 * - Creates RTCPeerConnection per remote user
 * - Handles offer/answer/ICE exchange via socket relay
 * - Exposes remote streams for rendering
 */
export function useWebRTC({ socket, localStream, userName }: UseWebRTCProps) {
  const peersRef = useRef<Record<string, RTCPeerConnection>>({});
  const [remoteStreams, setRemoteStreams] = useState<Record<string, RemoteStream>>({});

  const createPeerConnection = (userId: string, remoteUserName: string): RTCPeerConnection => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    peersRef.current[userId] = pc;

    // Add all local tracks so the remote peer can receive them
    localStream?.getTracks().forEach(track => pc.addTrack(track, localStream));

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) socket.emit(SOCKET_EVENTS.ICE_CANDIDATE, { to: userId, candidate });
    };

    pc.ontrack = ({ streams }) => {
      setRemoteStreams(prev => ({
        ...prev,
        [userId]: { stream: streams[0], name: remoteUserName },
      }));
    };

    return pc;
  };

  const closeAllPeers = () => {
    Object.values(peersRef.current).forEach((pc: RTCPeerConnection) => pc.close());
    peersRef.current = {};
    setRemoteStreams({});
  };

  useEffect(() => {
    const handleUserJoined = async ({ userId, userName: joinedName }: UserJoinedPayload) => {
      const pc = createPeerConnection(userId, joinedName);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit(SOCKET_EVENTS.OFFER, { to: userId, offer, fromName: userName });
    };

    const handleOffer = async ({ from, offer, fromName }: IncomingOfferPayload) => {
      const pc = createPeerConnection(from, fromName);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit(SOCKET_EVENTS.ANSWER, { to: from, answer });
    };

    const handleAnswer = async ({ from, answer }: IncomingAnswerPayload) => {
      const pc = peersRef.current[from];
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
    };

    const handleIceCandidate = async ({ from, candidate }: IncomingIceCandidatePayload) => {
      const pc = peersRef.current[from];
      if (pc) await pc.addIceCandidate(new RTCIceCandidate(candidate));
    };

    const handleUserLeft = (userId: string) => {
      peersRef.current[userId]?.close();
      delete peersRef.current[userId];
      setRemoteStreams(prev => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    };

    socket.on(SOCKET_EVENTS.USER_JOINED, handleUserJoined);
    socket.on(SOCKET_EVENTS.OFFER, handleOffer);
    socket.on(SOCKET_EVENTS.ANSWER, handleAnswer);
    socket.on(SOCKET_EVENTS.ICE_CANDIDATE, handleIceCandidate);
    socket.on(SOCKET_EVENTS.USER_LEFT, handleUserLeft);

    return () => {
      socket.off(SOCKET_EVENTS.USER_JOINED, handleUserJoined);
      socket.off(SOCKET_EVENTS.OFFER, handleOffer);
      socket.off(SOCKET_EVENTS.ANSWER, handleAnswer);
      socket.off(SOCKET_EVENTS.ICE_CANDIDATE, handleIceCandidate);
      socket.off(SOCKET_EVENTS.USER_LEFT, handleUserLeft);
    };
  }, [socket, localStream, userName]);

  return { peersRef, remoteStreams, closeAllPeers };
}
