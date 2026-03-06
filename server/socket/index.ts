import { Server, Socket } from "socket.io";
import { registerUserHandlers } from "./handlers/userHandler.js";
import { registerRoomHandlers } from "./handlers/roomHandler.js";
import { registerChatHandlers } from "./handlers/chatHandler.js";
import { registerWebRTCHandlers } from "./handlers/webrtcHandler.js";

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
