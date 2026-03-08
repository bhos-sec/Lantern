import { Socket } from 'socket.io';
import { SOCKET_MESSAGE } from '@shared/socketEvents';
import type { OfferPayload, AnswerPayload, IceCandidatePayload } from '@shared/types';

/**
 * Relays WebRTC signaling messages between peers.
 * The server never inspects media bytes — it only routes offer/answer/ICE.
 */
export function registerWebRTCHandlers(socket: Socket): void {
  socket.on(SOCKET_MESSAGE.OFFER, ({ to, offer, fromName }: OfferPayload) => {
    socket.to(to).emit(SOCKET_MESSAGE.OFFER, { from: socket.id, offer, fromName });
  });

  socket.on(SOCKET_MESSAGE.ANSWER, ({ to, answer }: AnswerPayload) => {
    socket.to(to).emit(SOCKET_MESSAGE.ANSWER, { from: socket.id, answer });
  });

  socket.on(SOCKET_MESSAGE.ICE_CANDIDATE, ({ to, candidate }: IceCandidatePayload) => {
    socket.to(to).emit(SOCKET_MESSAGE.ICE_CANDIDATE, { from: socket.id, candidate });
  });
}
