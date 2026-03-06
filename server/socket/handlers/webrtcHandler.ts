import { Socket } from "socket.io";
import type {
  OfferPayload,
  AnswerPayload,
  IceCandidatePayload,
} from "../../../../shared/types.js";

/**
 * Relays WebRTC signaling messages between peers.
 * The server never inspects media bytes — it only routes offer/answer/ICE.
 */
export function registerWebRTCHandlers(socket: Socket): void {
  socket.on("offer", ({ to, offer, fromName }: OfferPayload) => {
    socket.to(to).emit("offer", { from: socket.id, offer, fromName });
  });

  socket.on("answer", ({ to, answer }: AnswerPayload) => {
    socket.to(to).emit("answer", { from: socket.id, answer });
  });

  socket.on("ice-candidate", ({ to, candidate }: IceCandidatePayload) => {
    socket.to(to).emit("ice-candidate", { from: socket.id, candidate });
  });
}
