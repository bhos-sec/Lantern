import { Server, Socket } from "socket.io";
import { registerUserHandlers } from "./handlers/userHandler";
import { registerRoomHandlers } from "./handlers/roomHandler";
import { registerChatHandlers } from "./handlers/chatHandler";
import { registerWebRTCHandlers } from "./handlers/webrtcHandler";
import { OWNER_KEY } from "../config.js";

/** Attach all domain-scoped event handlers to every new socket connection. */
export function initSocketHandlers(io: Server): void {
  io.on("connection", (socket: Socket) => {
    const { deviceId, ownerKey } = socket.handshake.auth as {
      deviceId?: string;
      ownerKey?: string;
    };

    socket.data.deviceId = deviceId ?? null;
    // Developer bypass: only active when OWNER_KEY is configured and matches
    socket.data.isDeveloper = Boolean(OWNER_KEY) && ownerKey === OWNER_KEY;

    console.log(
      `User connected: ${socket.id}` +
        (socket.data.isDeveloper ? " [DEVELOPER]" : "")
    );

    registerUserHandlers(socket, io);
    registerRoomHandlers(socket, io);
    registerChatHandlers(socket, io);
    registerWebRTCHandlers(socket);
  });
}
