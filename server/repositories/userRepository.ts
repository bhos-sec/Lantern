// In-memory store for connected users.
// Replace Map operations here with a DB adapter if persistence is needed later.

export interface UserRecord {
  name: string;
  roomId: string | null;
  showRoom: boolean;
  isMuted?: boolean; // Force-muted by the room admin
}

const store = new Map<string, UserRecord>();

export const userRepository = {
  add(socketId: string, record: UserRecord) {
    store.set(socketId, record);
  },

  get(socketId: string): UserRecord | undefined {
    return store.get(socketId);
  },

  update(socketId: string, patch: Partial<UserRecord>) {
    const existing = store.get(socketId);
    if (existing) store.set(socketId, { ...existing, ...patch });
  },

  remove(socketId: string) {
    store.delete(socketId);
  },

  exists(socketId: string): boolean {
    return store.has(socketId);
  },

  isNameTaken(name: string): boolean {
    return Array.from(store.values()).some(u => u.name.toLowerCase() === name.toLowerCase());
  },

  entries(): [string, UserRecord][] {
    return Array.from(store.entries());
  },

  countByRoom(roomId: string): number {
    return Array.from(store.values()).filter(u => u.roomId === roomId).length;
  },
};
