import { Socket, Server } from 'socket.io';
import type { SendMessagePayload, SendPrivateMessagePayload } from '@shared/types';
import { SOCKET_MESSAGE } from '@shared/socketEvents';

/** Handles room broadcast messages and private (DM) messages. */
export function registerChatHandlers(socket: Socket, io: Server): void {
  socket.on(SOCKET_MESSAGE.SEND_MESSAGE, ({ roomId, message, userName }: SendMessagePayload) => {
    io.to(roomId).emit(SOCKET_MESSAGE.RECEIVE_MESSAGE, {
      id: Math.random().toString(36).substring(2, 11),
      text,
      sender: userName,
      senderId: socket.id,
      timestamp: new Date().toISOString(),
    });
  });

  socket.on(
    SOCKET_MESSAGE.SEND_PRIVATE_MESSAGE,
    ({ toUserId, message, userName }: SendPrivateMessagePayload) => {
      // ── Anti-spam: same rate bucket as room messages ─────────────────
      if (!checkRate(socket.id, 'chat', MSG_RATE_MAX, MSG_RATE_WINDOW_MS)) {
        socket.emit('rate-limited', {
          action: 'chat',
          retryAfterMs: MSG_RATE_WINDOW_MS,
          message: `Slow down — max ${MSG_RATE_MAX} messages per ${MSG_RATE_WINDOW_MS / 1000}s.`,
        });
        return;
      }

      const text = sanitize(message);
      if (!text || text.length > MAX_MSG_LENGTH) {
        socket.emit('error', `Message must be 1–${MAX_MSG_LENGTH} characters.`);
        return;
      }

      const msg = {
        id: Math.random().toString(36).substring(2, 11),
        text,
        sender: userName,
        senderId: socket.id,
        toId: toUserId,
        timestamp: new Date().toISOString(),
        isPrivate: true,
      };
      io.to(toUserId).emit(SOCKET_MESSAGE.RECEIVE_MESSAGE, msg); // To recipient
      socket.emit(SOCKET_MESSAGE.RECEIVE_MESSAGE, msg); // Echo back to sender
    },
  );
}
