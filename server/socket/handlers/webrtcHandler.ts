import { Socket } from 'socket.io';
import type { OfferPayload, AnswerPayload, IceCandidatePayload } from '@shared/types';
import { SOCKET_EVENTS } from '@shared/events';

/**
 * Relays WebRTC signaling messages between peers.
 * The server never inspects media bytes — it only routes offer/answer/ICE.
 */
export function registerWebRTCHandlers(socket: Socket): void {
  socket.on(SOCKET_EVENTS.OFFER, ({ to, offer, fromName }: OfferPayload) => {
    socket.to(to).emit(SOCKET_EVENTS.OFFER, { from: socket.id, offer, fromName });
  });

  socket.on(SOCKET_EVENTS.ANSWER, ({ to, answer }: AnswerPayload) => {
    socket.to(to).emit(SOCKET_EVENTS.ANSWER, { from: socket.id, answer });
  });

  socket.on(SOCKET_EVENTS.ICE_CANDIDATE, ({ to, candidate }: IceCandidatePayload) => {
    socket.to(to).emit(SOCKET_EVENTS.ICE_CANDIDATE, { from: socket.id, candidate });
  });
}
