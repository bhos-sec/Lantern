import { Socket, Server } from 'socket.io';
import { userRepository } from '../../repositories/userRepository';
import { roomRepository } from '../../repositories/roomRepository';
import { broadcastPresence } from '../../services/presenceService';
import { handleLeaveRoom } from '../../services/roomService';
import { SOCKET_MESSAGE } from '@shared/socketEvents';
import type { JoinRoomPayload } from '@shared/types';

/** Handles room lifecycle: create, join, leave, privacy toggling, and cleanup on disconnect. */
export function registerRoomHandlers(socket: Socket, io: Server): void {
  socket.on(SOCKET_MESSAGE.JOIN_ROOM, (payload: JoinRoomPayload) => {
    const { roomId, userName, password, isPrivate, isCreating } = payload;
    const existingMeta = roomRepository.get(roomId);

    if (isCreating) {
      if (existingMeta) {
        socket.emit(
          SOCKET_MESSAGE.ERROR,
          'A room with this ID already exists. Please choose a different ID.',
        );
        return;
      }
      roomRepository.create(roomId, {
        password,
        isPrivate: isPrivate ?? false,
        adminId: socket.id,
      });
    } else {
      if (!existingMeta) {
        socket.emit(
          SOCKET_MESSAGE.ERROR,
          'Room not found. Please check the ID or create a new room.',
        );
        return;
      }
      if (existingMeta.isPrivate && existingMeta.adminId !== socket.id) {
        socket.emit(SOCKET_MESSAGE.ERROR, 'This room is private and cannot be joined.');
        return;
      }
      if (existingMeta.password && existingMeta.password !== password) {
        socket.emit(SOCKET_MESSAGE.ERROR, 'Invalid room password.');
        return;
      }
    }

    socket.join(roomId);
    socket.emit(SOCKET_MESSAGE.JOIN_ROOM_SUCCESS, roomId);

    // Update or create the user record with the new roomId
    if (userRepository.exists(socket.id)) {
      userRepository.update(socket.id, { roomId });
    } else {
      if (userRepository.isNameTaken(userName)) {
        socket.emit(SOCKET_MESSAGE.ERROR, 'This name is already taken. Please choose another.');
        return;
      }
      userRepository.add(socket.id, { name: userName, roomId, showRoom: true });
    }

    broadcastPresence(io);
    socket.to(roomId).emit(SOCKET_MESSAGE.USER_JOINED, { userId: socket.id, userName });
    console.log(`User "${userName}" (${socket.id}) joined room "${roomId}"`);
  });

  socket.on(SOCKET_MESSAGE.LEAVE_ROOM, (roomId: string) => {
    handleLeaveRoom(socket, io, roomId);
  });

  socket.on(SOCKET_MESSAGE.TOGGLE_ROOM_PRIVACY, (isPrivate: boolean) => {
    const user = userRepository.get(socket.id);
    if (!user?.roomId) return;

    const meta = roomRepository.get(user.roomId);
    if (meta?.adminId !== socket.id) return; // Only admins can change privacy

    roomRepository.update(user.roomId, { isPrivate });
    broadcastPresence(io);
  });

  // ── Host Controls (Issue #10) ──────────────────────────────────────────────────
  socket.on('mute-user', ({ roomId, targetUserId }: MuteUserPayload) => {
    const admin = userRepository.get(socket.id);
    if (!admin?.roomId || admin.roomId !== roomId) return;

    const meta = roomRepository.get(roomId);
    if (meta?.adminId !== socket.id) return; // Only admins can mute

    const targetUser = userRepository.get(targetUserId);
    if (!targetUser || targetUser.roomId !== roomId) return;

    userRepository.update(targetUserId, { isMuted: true });
    io.to(targetUserId).emit('force-muted', { reason: 'Admin muted your microphone' });
    broadcastPresence(io);
  });

  socket.on('unmute-user', ({ roomId, targetUserId }: UnmuteUserPayload) => {
    const admin = userRepository.get(socket.id);
    if (!admin?.roomId || admin.roomId !== roomId) return;

    const meta = roomRepository.get(roomId);
    if (meta?.adminId !== socket.id) return; // Only admins can unmute

    const targetUser = userRepository.get(targetUserId);
    if (!targetUser || targetUser.roomId !== roomId) return;

    userRepository.update(targetUserId, { isMuted: false });
    io.to(targetUserId).emit('force-unmuted', { reason: 'Admin unmuted your microphone' });
    broadcastPresence(io);
  });

  socket.on('mute-all', ({ roomId }: MuteAllPayload) => {
    const admin = userRepository.get(socket.id);
    if (!admin?.roomId || admin.roomId !== roomId) return;

    const meta = roomRepository.get(roomId);
    if (meta?.adminId !== socket.id) return; // Only admins can mute all

    // Mute all participants except the admin
    userRepository.entries().forEach(([userId, user]) => {
      if (user.roomId === roomId && userId !== socket.id) {
        userRepository.update(userId, { isMuted: true });
        io.to(userId).emit('force-muted', { reason: 'Admin muted all participants' });
      }
    });
    broadcastPresence(io);
  });

  socket.on('kick-user', ({ roomId, targetUserId }: KickUserPayload) => {
    const admin = userRepository.get(socket.id);
    if (!admin?.roomId || admin.roomId !== roomId) return;

    const meta = roomRepository.get(roomId);
    if (meta?.adminId !== socket.id) return; // Only admins can kick

    const targetSocket = io.sockets.sockets.get(targetUserId);
    if (!targetSocket) return;

    io.to(targetUserId).emit('kicked', { reason: 'You were removed by the host' });
    handleLeaveRoom(targetSocket, io, roomId);
    targetSocket.disconnect(true);
  });

  // Clean up when the socket disconnects without explicitly leaving
  socket.on('disconnecting', () => {
    for (const room of socket.rooms) {
      if (room !== socket.id) {
        handleLeaveRoom(socket, io, room);
      }
    }
  });

  socket.on('disconnect', () => {
    userRepository.remove(socket.id);
    broadcastPresence(io);
    console.log(`User disconnected: ${socket.id}`);
  });
}
