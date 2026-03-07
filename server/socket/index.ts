import { Server, Socket } from "socket.io";
import { registerUserHandlers } from "./handlers/userHandler";
import { registerRoomHandlers } from "./handlers/roomHandler";
import { registerChatHandlers } from "./handlers/chatHandler";
import { registerWebRTCHandlers } from "./handlers/webrtcHandler";

/** Attach all domain-scoped event handlers to every new socket connection. */
export function initSocketHandlers(io: Server): void {
  io.on("connection", (socket: Socket) => {
    console.log(`User connected: ${socket.id}`);
    registerUserHandlers(socket, io);
    registerRoomHandlers(socket, io);
    registerChatHandlers(socket, io);
    registerWebRTCHandlers(socket);
  });
}
