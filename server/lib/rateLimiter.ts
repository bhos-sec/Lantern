/**
 * Lightweight token-bucket rate limiter for Socket.IO events.
 *
 * All state is held in a two-level Map:
 *   socketId → actionName → Bucket
 *
 * This is intentionally simple and in-memory; for multi-process deployments
 * replace with a Redis-backed implementation.
 */

interface Bucket {
  /** Number of events counted in the current window. */
  count: number;
  /** Timestamp (ms) when the current window started. */
  windowStart: number;
  /** Timestamp (ms) of the last accepted event — used for cooldown checks. */
  lastEventTime: number;
}

const store = new Map<string, Map<string, Bucket>>();

function getOrCreateBucket(socketId: string, action: string): Bucket {
  if (!store.has(socketId)) store.set(socketId, new Map());
  const socketBuckets = store.get(socketId)!;
  if (!socketBuckets.has(action)) {
    const bucket: Bucket = { count: 0, windowStart: Date.now(), lastEventTime: 0 };
    socketBuckets.set(action, bucket);
  }
  return socketBuckets.get(action)!;
}

/**
 * Sliding-window rate check.
 * Returns `true` if the event is within limits and the counter is incremented.
 * Returns `false` if the socket has exceeded `maxCount` events in `windowMs`.
 */
export function checkRate(
  socketId: string,
  action: string,
  maxCount: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  const bucket = getOrCreateBucket(socketId, action);

  // Reset window if it has expired
  if (now - bucket.windowStart >= windowMs) {
    bucket.count = 0;
    bucket.windowStart = now;
  }

  if (bucket.count >= maxCount) return false;

  bucket.count++;
  bucket.lastEventTime = now;
  return true;
}

/**
 * Cooldown check — enforces a minimum gap between consecutive events.
 * Returns `true` if enough time has passed since the last event.
 * Returns `false` if the cooldown has not yet elapsed.
 */
export function checkCooldown(socketId: string, action: string, cooldownMs: number): boolean {
  const now = Date.now();
  const bucket = getOrCreateBucket(socketId, action);

  if (now - bucket.lastEventTime < cooldownMs) return false;

  bucket.lastEventTime = now;
  return true;
}

/** Remove all limiter state for a socket when it disconnects. */
export function clearLimiter(socketId: string): void {
  store.delete(socketId);
}
