import { Server } from "socket.io";
import { userRepository } from "../repositories/userRepository.js";
import { roomRepository } from "../repositories/roomRepository.js";
import type { PresenceUser } from "../../shared/types.js";

/**
 * Build and broadcast the full presence snapshot to every connected client.
 * Called after any user/room state change.
 */
export function broadcastPresence(io: Server): void {
  const userList: PresenceUser[] = userRepository.entries().map(([id, data]) => {
    const meta = data.roomId ? roomRepository.get(data.roomId) : undefined;
    const isRoomVisible = data.showRoom && meta && !meta.isPrivate;

    return {
      id,
      name: data.name,
      roomId: isRoomVisible ? data.roomId : null,
      actualRoomId: data.roomId,
      isAdmin: meta ? meta.adminId === id : false,
      isRoomPrivate: meta ? meta.isPrivate : false,
    };
  });

  io.emit("presence-update", userList);
}
