import { Socket, Server } from "socket.io";
import { userRepository } from "../../repositories/userRepository";
import { roomRepository } from "../../repositories/roomRepository";
import { deviceSessionRepository } from "../../repositories/deviceSessionRepository";
import { broadcastPresence } from "../../services/presenceService";
import { handleLeaveRoom } from "../../services/roomService";
import type { JoinRoomPayload } from "@shared/types";

/** Handles room lifecycle: create, join, leave, privacy toggling, and cleanup on disconnect. */
export function registerRoomHandlers(socket: Socket, io: Server): void {
  socket.on("join-room", (payload: JoinRoomPayload) => {
    const { roomId, userName, password, isPrivate, isCreating } = payload;
    const existingMeta = roomRepository.get(roomId);

    if (isCreating) {
      if (existingMeta) {
        socket.emit("error", "A room with this ID already exists. Please choose a different ID.");
        return;
      }
      roomRepository.create(roomId, {
        password,
        isPrivate: isPrivate ?? false,
        adminId: socket.id,
      });
    } else {
      if (!existingMeta) {
        socket.emit("error", "Room not found. Please check the ID or create a new room.");
        return;
      }
      if (existingMeta.isPrivate && existingMeta.adminId !== socket.id) {
        socket.emit("error", "This room is private and cannot be joined.");
        return;
      }
      if (existingMeta.password && existingMeta.password !== password) {
        socket.emit("error", "Invalid room password.");
        return;
      }
    }

    socket.join(roomId);
    socket.emit("join-room-success", roomId);

    // Update or create the user record with the new roomId
    if (userRepository.exists(socket.id)) {
      userRepository.update(socket.id, { roomId });
    } else {
      if (userRepository.isNameTaken(userName)) {
        socket.emit("error", "This name is already taken. Please choose another.");
        return;
      }
      userRepository.add(socket.id, { name: userName, roomId, showRoom: true });
    }

    broadcastPresence(io);
    socket.to(roomId).emit("user-joined", { userId: socket.id, userName });
    console.log(`User "${userName}" (${socket.id}) joined room "${roomId}"`);
  });

  socket.on("leave-room", (roomId: string) => {
    handleLeaveRoom(socket, io, roomId);
  });

  socket.on("toggle-room-privacy", (isPrivate: boolean) => {
    const user = userRepository.get(socket.id);
    if (!user?.roomId) return;

    const meta = roomRepository.get(user.roomId);
    if (meta?.adminId !== socket.id) return; // Only admins can change privacy

    roomRepository.update(user.roomId, { isPrivate });
    broadcastPresence(io);
  });

  // Clean up when the socket disconnects without explicitly leaving
  socket.on("disconnecting", () => {
    for (const room of socket.rooms) {
      if (room !== socket.id) {
        handleLeaveRoom(socket, io, room);
      }
    }
  });

  socket.on("disconnect", () => {
    // Free the device session slot so the user can rejoin from a new tab.
    deviceSessionRepository.removeBySocketId(socket.id);
    userRepository.remove(socket.id);
    broadcastPresence(io);
    console.log(`User disconnected: ${socket.id}`);
  });
}
