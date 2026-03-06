import { Socket, Server } from "socket.io";
import type {
  SendMessagePayload,
  SendPrivateMessagePayload,
} from "../../../../shared/types.js";

/** Handles room broadcast messages and private (DM) messages. */
export function registerChatHandlers(socket: Socket, io: Server): void {
  socket.on("send-message", ({ roomId, message, userName }: SendMessagePayload) => {
    io.to(roomId).emit("receive-message", {
      id: Math.random().toString(36).substring(2, 11),
      text: message,
      sender: userName,
      senderId: socket.id,
      timestamp: new Date().toISOString(),
    });
  });

  socket.on("send-private-message", ({ toUserId, message, userName }: SendPrivateMessagePayload) => {
    const msg = {
      id: Math.random().toString(36).substring(2, 11),
      text: message,
      sender: userName,
      senderId: socket.id,
      toId: toUserId,
      timestamp: new Date().toISOString(),
      isPrivate: true,
    };
    io.to(toUserId).emit("receive-message", msg); // To recipient
    socket.emit("receive-message", msg);           // Echo back to sender
  });
}
