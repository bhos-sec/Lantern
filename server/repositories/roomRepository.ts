// In-memory store for room metadata.
// Swap the Map for a SQLite/DB adapter here when persistence is needed.

export interface RoomRecord {
  password?: string;
  isPrivate: boolean;
  adminId: string;
}

const store = new Map<string, RoomRecord>();

export const roomRepository = {
  create(roomId: string, record: RoomRecord) {
    store.set(roomId, record);
  },

  get(roomId: string): RoomRecord | undefined {
    return store.get(roomId);
  },

  update(roomId: string, patch: Partial<RoomRecord>) {
    const existing = store.get(roomId);
    if (existing) store.set(roomId, { ...existing, ...patch });
  },

  remove(roomId: string) {
    store.delete(roomId);
  },

  exists(roomId: string): boolean {
    return store.has(roomId);
  },
};
