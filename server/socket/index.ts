import { Server, Socket } from 'socket.io';
import { registerUserHandlers } from './handlers/userHandler';
import { registerRoomHandlers } from './handlers/roomHandler';
import { registerChatHandlers } from './handlers/chatHandler';
import { registerWebRTCHandlers } from './handlers/webrtcHandler';
import { registerEngagementHandlers } from './handlers/engagementHandler';
import { deviceSessionRepository } from '../repositories/deviceSessionRepository.js';
import { clearLimiter } from '../lib/rateLimiter.js';
import { IS_PROD } from '../config.js';

/** Attach all domain-scoped event handlers to every new socket connection. */
export function initSocketHandlers(io: Server): void {
  io.on('connection', (socket: Socket) => {
    console.log(`User connected: ${socket.id}`);

    // ── Device-session enforcement (production only) ──────────────────────
    // The client sends a stable deviceId in the socket handshake auth object.
    // In production we allow only one live session per device.
    // In development (npm run dev) the check is skipped so developers can
    // open multiple tabs freely while testing.
    const deviceId = socket.handshake.auth?.deviceId as string | undefined;
    socket.data.deviceId = deviceId ?? null;
    socket.data.isDuplicate = false;

    if (IS_PROD && deviceId) {
      const existingSocketId = deviceSessionRepository.tryRegister(deviceId, socket.id);
      if (existingSocketId) {
        // Another tab/window on the same device is already connected.
        socket.data.isDuplicate = true;
        socket.emit('duplicate-session');
        console.log(`Duplicate session blocked – device: ${deviceId}, socket: ${socket.id}`);
      }
    }

    // Register all domain handlers (they individually guard against duplicates)
    registerUserHandlers(socket, io);
    registerRoomHandlers(socket, io);
    registerChatHandlers(socket, io);
    registerWebRTCHandlers(socket);
    registerEngagementHandlers(socket, io);

    // ── Take-over: let the new tab claim the session ──────────────────────
    // When the user clicks "Use This Tab" on the DuplicateSessionPage,
    // the client emits this event.  We kick the old socket and grant the
    // new one a clean session.
    socket.on('take-over-session', () => {
      if (!IS_PROD || !deviceId) return;

      const oldSocketId = deviceSessionRepository.getByDeviceId(deviceId);
      if (oldSocketId && oldSocketId !== socket.id) {
        // Notify the old tab so it can display a "taken over" screen
        io.to(oldSocketId).emit('session-taken-over');
        // Give the old tab a moment to react before forcibly disconnecting it
        setTimeout(() => {
          io.sockets.sockets.get(oldSocketId)?.disconnect(true);
        }, 600);
      }

      deviceSessionRepository.forceRegister(deviceId, socket.id);
      socket.data.isDuplicate = false;
      socket.emit('take-over-granted');
      console.log(`Session taken over – device: ${deviceId}, new socket: ${socket.id}`);
    });

    // ── Clean up on disconnect ────────────────────────────────────────────
    socket.on('disconnect', () => {
      if (deviceId) {
        deviceSessionRepository.unregisterBySocket(socket.id);
      }
      // Release any rate-limiter state held for this socket
      clearLimiter(socket.id);
    });
  });
}
