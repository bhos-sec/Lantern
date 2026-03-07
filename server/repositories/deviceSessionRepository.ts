// In-memory store mapping a stable deviceId to the active socketId.
// Enforces a single active session per physical device/browser profile.

const store = new Map<string, string>(); // deviceId → socketId

export const deviceSessionRepository = {
  /** Register a device → socket mapping when a user successfully sets their name. */
  register(deviceId: string, socketId: string): void {
    store.set(deviceId, socketId);
  },

  /** Returns true if this deviceId already has an active session. */
  hasActiveSession(deviceId: string): boolean {
    return store.has(deviceId);
  },

  /** Remove a session by its deviceId (e.g. explicit cleanup). */
  removeByDeviceId(deviceId: string): void {
    store.delete(deviceId);
  },

  /** Remove a session by its socketId (used on disconnect). */
  removeBySocketId(socketId: string): void {
    for (const [deviceId, sid] of store.entries()) {
      if (sid === socketId) {
        store.delete(deviceId);
        break;
      }
    }
  },
};
