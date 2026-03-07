import { Socket, Server } from 'socket.io';
import type { SendMessagePayload, SendPrivateMessagePayload } from '@shared/types';
import { checkRate } from '../../lib/rateLimiter.js';
import { MSG_RATE_MAX, MSG_RATE_WINDOW_MS, MAX_MSG_LENGTH } from '../../config.js';

/** Strips leading/trailing whitespace and collapses internal whitespace runs. */
function sanitize(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

/** Handles room broadcast messages and private (DM) messages. */
export function registerChatHandlers(socket: Socket, io: Server): void {
  socket.on('send-message', ({ roomId, message, userName }: SendMessagePayload) => {
    // ── Anti-spam: rate limit ────────────────────────────────────────────
    if (!checkRate(socket.id, 'chat', MSG_RATE_MAX, MSG_RATE_WINDOW_MS)) {
      socket.emit('rate-limited', {
        action: 'chat',
        retryAfterMs: MSG_RATE_WINDOW_MS,
        message: `Slow down — max ${MSG_RATE_MAX} messages per ${MSG_RATE_WINDOW_MS / 1000}s.`,
      });
      return;
    }

    // ── Anti-spam: length cap ────────────────────────────────────────────
    const text = sanitize(message);
    if (!text || text.length > MAX_MSG_LENGTH) {
      socket.emit('error', `Message must be 1–${MAX_MSG_LENGTH} characters.`);
      return;
    }

    io.to(roomId).emit('receive-message', {
      id: Math.random().toString(36).substring(2, 11),
      text,
      sender: userName,
      senderId: socket.id,
      timestamp: new Date().toISOString(),
    });
  });

  socket.on(
    'send-private-message',
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
      io.to(toUserId).emit('receive-message', msg); // To recipient
      socket.emit('receive-message', msg); // Echo back to sender
    },
  );
}
