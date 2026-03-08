import { Socket, Server } from 'socket.io';
import { userRepository } from '../repositories/userRepository';
import { roomRepository } from '../repositories/roomRepository';
import { broadcastPresence } from '../services/presenceService';
import { SOCKET_EVENTS } from '@shared/events';

/**
 * Handles room leave + cleanup for a given socket.
 * Exported so it can be reused by the "disconnecting" handler.
 */
export function handleLeaveRoom(socket: Socket, io: Server, roomId: string): void {
  socket.leave(roomId);

  const meta = roomRepository.get(roomId);
  if (meta?.adminId === socket.id) {
    // Admin left — close the room for everyone
    io.to(roomId).emit(SOCKET_EVENTS.ERROR, 'The room has been closed by the admin.');
    io.to(roomId).emit(SOCKET_EVENTS.ROOM_CLOSED);
    roomRepository.remove(roomId);
  }

  userRepository.update(socket.id, { roomId: null });
  socket.to(roomId).emit(SOCKET_EVENTS.USER_LEFT, socket.id);

  // Clean up room metadata if everyone has left
  if (userRepository.countByRoom(roomId) === 0) {
    roomRepository.remove(roomId);
    console.log(`Room "${roomId}" cleaned up — no users left`);
  }

  broadcastPresence(io);
}
