import { Socket, Server } from 'socket.io';
import { userRepository } from '../../repositories/userRepository';
import { roomRepository } from '../../repositories/roomRepository';
import { broadcastPresence } from '../../services/presenceService';
import { handleLeaveRoom } from '../../services/roomService';
import { checkCooldown } from '../../lib/rateLimiter.js';
import { JOIN_COOLDOWN_MS } from '../../config.js';
import type { JoinRoomPayload, MuteUserPayload, UnmuteUserPayload, MuteAllPayload, KickUserPayload, DisableCameraPayload, CameraStateUpdatePayload, MuteStateUpdatePayload } from '@shared/types';
import { SOCKET_EVENTS } from '@shared/events';

/** Handles room lifecycle: create, join, leave, privacy toggling, and cleanup on disconnect. */
export function registerRoomHandlers(socket: Socket, io: Server): void {
  socket.on(SOCKET_EVENTS.JOIN_ROOM, (payload: JoinRoomPayload) => {
    // ── Join throttling ────────────────────────────────────────────────────────
    if (!checkCooldown(socket.id, 'join-room', JOIN_COOLDOWN_MS)) {
      socket.emit(SOCKET_EVENTS.RATE_LIMITED, {
        action: 'join-room',
        retryAfterMs: JOIN_COOLDOWN_MS,
        message: `Please wait ${JOIN_COOLDOWN_MS / 1000}s before joining another room.`,
      });
      return;
    }

    const { roomId, userName, password, isPrivate, isCreating } = payload;
    const existingMeta = roomRepository.get(roomId);

    if (isCreating) {
      if (existingMeta) {
        socket.emit(SOCKET_EVENTS.ERROR, 'A room with this ID already exists. Please choose a different ID.');
        return;
      }
      roomRepository.create(roomId, {
        password,
        isPrivate: isPrivate ?? false,
        adminId: socket.id,
      });
    } else {
      if (!existingMeta) {
        socket.emit(SOCKET_EVENTS.ERROR, 'Room not found. Please check the ID or create a new room.');
        return;
      }
      if (existingMeta.isPrivate && existingMeta.adminId !== socket.id) {
        socket.emit(SOCKET_EVENTS.ERROR, 'This room is private and cannot be joined.');
        return;
      }
      if (existingMeta.password && existingMeta.password !== password) {
        socket.emit(SOCKET_EVENTS.ERROR, 'Invalid room password.');
        return;
      }
    }

    socket.join(roomId);
    socket.emit(SOCKET_EVENTS.JOIN_ROOM_SUCCESS, roomId);

    // Update or create the user record with the new roomId
    if (userRepository.exists(socket.id)) {
      userRepository.update(socket.id, { roomId });
    } else {
      if (userRepository.isNameTaken(userName)) {
        socket.emit(SOCKET_EVENTS.ERROR, 'This name is already taken. Please choose another.');
        return;
      }
      userRepository.add(socket.id, { name: userName, roomId, showRoom: true });
    }

    broadcastPresence(io);
    socket.to(roomId).emit(SOCKET_EVENTS.USER_JOINED, { userId: socket.id, userName });
    console.log(`User "${userName}" (${socket.id}) joined room "${roomId}"`);
  });

  socket.on(SOCKET_EVENTS.LEAVE_ROOM, (roomId: string) => {
    handleLeaveRoom(socket, io, roomId);
  });

  socket.on(SOCKET_EVENTS.TOGGLE_ROOM_PRIVACY, (isPrivate: boolean) => {
    const user = userRepository.get(socket.id);
    if (!user?.roomId) return;

    const meta = roomRepository.get(user.roomId);
    if (meta?.adminId !== socket.id) return; // Only admins can change privacy

    roomRepository.update(user.roomId, { isPrivate });
    broadcastPresence(io);
  });

  // ── Host Controls (Issue #10) ──────────────────────────────────────────────────
  socket.on(SOCKET_EVENTS.MUTE_USER, ({ roomId, targetUserId }: MuteUserPayload) => {
    const admin = userRepository.get(socket.id);
    if (!admin?.roomId || admin.roomId !== roomId) return;

    const meta = roomRepository.get(roomId);
    if (meta?.adminId !== socket.id) return; // Only admins can mute

    const targetUser = userRepository.get(targetUserId);
    if (!targetUser || targetUser.roomId !== roomId) return;

    userRepository.update(targetUserId, { isMuted: true });
    io.to(targetUserId).emit(SOCKET_EVENTS.FORCE_MUTED, { reason: 'Admin muted your microphone' });
    broadcastPresence(io);
  });

  socket.on(SOCKET_EVENTS.UNMUTE_USER, ({ roomId, targetUserId }: UnmuteUserPayload) => {
    const admin = userRepository.get(socket.id);
    if (!admin?.roomId || admin.roomId !== roomId) return;

    const meta = roomRepository.get(roomId);
    if (meta?.adminId !== socket.id) return; // Only admins can unmute

    const targetUser = userRepository.get(targetUserId);
    if (!targetUser || targetUser.roomId !== roomId) return;

    userRepository.update(targetUserId, { isMuted: false });
    io.to(targetUserId).emit(SOCKET_EVENTS.FORCE_UNMUTED, { reason: 'Admin unmuted your microphone' });
    broadcastPresence(io);
  });

  socket.on(SOCKET_EVENTS.MUTE_ALL, ({ roomId }: MuteAllPayload) => {
    const admin = userRepository.get(socket.id);
    if (!admin?.roomId || admin.roomId !== roomId) return;

    const meta = roomRepository.get(roomId);
    if (meta?.adminId !== socket.id) return; // Only admins can mute all

    // Mute all participants except the admin
    userRepository.entries().forEach(([userId, user]) => {
      if (user.roomId === roomId && userId !== socket.id) {
        userRepository.update(userId, { isMuted: true });
        io.to(userId).emit(SOCKET_EVENTS.FORCE_MUTED, { reason: 'Admin muted all participants' });
      }
    });
    broadcastPresence(io);
  });

  socket.on(SOCKET_EVENTS.KICK_USER, ({ roomId, targetUserId }: KickUserPayload) => {
    const admin = userRepository.get(socket.id);
    if (!admin?.roomId || admin.roomId !== roomId) return;

    const meta = roomRepository.get(roomId);
    if (meta?.adminId !== socket.id) return; // Only admins can kick

    const targetSocket = io.sockets.sockets.get(targetUserId);
    if (!targetSocket) return;

    io.to(targetUserId).emit(SOCKET_EVENTS.KICKED, { reason: 'You were removed by the host' });
    handleLeaveRoom(targetSocket, io, roomId);
    targetSocket.disconnect(true);
  });

  socket.on(SOCKET_EVENTS.DISABLE_CAMERA, ({ roomId, targetUserId }: DisableCameraPayload) => {
    const admin = userRepository.get(socket.id);
    if (!admin?.roomId || admin.roomId !== roomId) return;

    const meta = roomRepository.get(roomId);
    if (meta?.adminId !== socket.id) return;

    const targetUser = userRepository.get(targetUserId);
    if (!targetUser || targetUser.roomId !== roomId) return;

    userRepository.update(targetUserId, { isCameraOff: true });
    io.to(targetUserId).emit(SOCKET_EVENTS.FORCE_CAMERA_OFF, { reason: 'Admin disabled your camera' });
    broadcastPresence(io);
  });

  socket.on(SOCKET_EVENTS.CAMERA_STATE_UPDATE, ({ isVideoOff }: CameraStateUpdatePayload) => {
    const user = userRepository.get(socket.id);
    if (!user) return;
    userRepository.update(socket.id, { isCameraOff: isVideoOff });
    broadcastPresence(io);
  });

  socket.on(SOCKET_EVENTS.MUTE_STATE_UPDATE, ({ isMuted }: MuteStateUpdatePayload) => {
    const user = userRepository.get(socket.id);
    if (!user) return;
    userRepository.update(socket.id, { isMuted });
    broadcastPresence(io);
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
