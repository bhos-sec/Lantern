import { io, Socket } from 'socket.io-client';

/**
 * Returns a stable device identifier that persists across page reloads and
 * tabs on the same browser/device.  In private-browsing contexts where
 * localStorage may be unavailable the function falls back to a session-scoped
 * value so the app still works.
 */
function getDeviceId(): string {
  const KEY = 'lantern_device_id';
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    // Private-browsing / storage blocked – fall back to a session-only id
    return crypto.randomUUID();
  }
}

// Single socket instance for the whole app.
// Created once at module load so HMR doesn't open extra connections.
// The deviceId is sent in the handshake auth so the server can enforce
// the single-session-per-device rule in production (npm run user).
const deviceId: string = getDeviceId();
export const socket: Socket = io({
  auth: { deviceId },
});

/** Expose the device id so other modules can reference it if needed. */
export { deviceId };
