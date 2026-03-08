import { Socket, Server } from 'socket.io';
import type { SendMessagePayload, SendPrivateMessagePayload } from '@shared/types';
import { SOCKET_EVENTS } from '@shared/events';
import { checkRate } from '../../lib/rateLimiter.js';
import { MSG_RATE_MAX, MSG_RATE_WINDOW_MS, MAX_MSG_LENGTH } from '../../config.js';

/** Strips leading/trailing whitespace and collapses internal whitespace runs. */
function sanitize(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

/** Handles room broadcast messages and private (DM) messages. */
export function registerChatHandlers(socket: Socket, io: Server): void {
  socket.on(SOCKET_EVENTS.SEND_MESSAGE, ({ roomId, message, userName }: SendMessagePayload) => {
    // ── Anti-spam: rate limit ────────────────────────────────────────────
    if (!checkRate(socket.id, 'chat', MSG_RATE_MAX, MSG_RATE_WINDOW_MS)) {
      socket.emit(SOCKET_EVENTS.RATE_LIMITED, {
        action: 'chat',
        retryAfterMs: MSG_RATE_WINDOW_MS,
        message: `Slow down — max ${MSG_RATE_MAX} messages per ${MSG_RATE_WINDOW_MS / 1000}s.`,
      });
      return;
    }

    // ── Anti-spam: length cap ────────────────────────────────────────────
    const text = sanitize(message);
    if (!text || text.length > MAX_MSG_LENGTH) {
      socket.emit(SOCKET_EVENTS.ERROR, `Message must be 1–${MAX_MSG_LENGTH} characters.`);
      return;
    }

    io.to(roomId).emit(SOCKET_EVENTS.RECEIVE_MESSAGE, {
      id: Math.random().toString(36).substring(2, 11),
      text,
      sender: userName,
      senderId: socket.id,
      timestamp: new Date().toISOString(),
    });
  });

  socket.on(
    SOCKET_EVENTS.SEND_PRIVATE_MESSAGE,
    ({ toUserId, message, userName }: SendPrivateMessagePayload) => {
      // ── Anti-spam: same rate bucket as room messages ─────────────────
      if (!checkRate(socket.id, 'chat', MSG_RATE_MAX, MSG_RATE_WINDOW_MS)) {
        socket.emit(SOCKET_EVENTS.RATE_LIMITED, {
          action: 'chat',
          retryAfterMs: MSG_RATE_WINDOW_MS,
          message: `Slow down — max ${MSG_RATE_MAX} messages per ${MSG_RATE_WINDOW_MS / 1000}s.`,
        });
        return;
      }

      const text = sanitize(message);
      if (!text || text.length > MAX_MSG_LENGTH) {
        socket.emit(SOCKET_EVENTS.ERROR, `Message must be 1–${MAX_MSG_LENGTH} characters.`);
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
      io.to(toUserId).emit(SOCKET_EVENTS.RECEIVE_MESSAGE, msg); // To recipient
      socket.emit(SOCKET_EVENTS.RECEIVE_MESSAGE, msg); // Echo back to sender
    },
  );
}
