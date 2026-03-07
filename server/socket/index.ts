import { Server, Socket } from "socket.io";
import { registerUserHandlers } from "./handlers/userHandler";
import { registerRoomHandlers } from "./handlers/roomHandler";
import { registerChatHandlers } from "./handlers/chatHandler";
import { registerWebRTCHandlers } from "./handlers/webrtcHandler";
import { OWNER_KEY, IS_PROD } from "../config.js";

/** Attach all domain-scoped event handlers to every new socket connection. */
export function initSocketHandlers(io: Server): void {
  io.on("connection", (socket: Socket) => {
    const { deviceId, ownerKey } = socket.handshake.auth as {
      deviceId?: string;
      ownerKey?: string;
    };

    socket.data.deviceId = deviceId ?? null;
    // In development all connections bypass the multi-tab restriction so every
    // developer can work freely without any configuration.
    // In production the bypass requires a matching OWNER_KEY.
    socket.data.isDeveloper =
      !IS_PROD || (Boolean(OWNER_KEY) && ownerKey === OWNER_KEY);

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
