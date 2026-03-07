const DEVICE_ID_KEY = "lantern_device_id";

/**
 * Returns a stable, per-device UUID persisted in localStorage.
 * Generated once per browser profile and reused across sessions.
 */
export function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}
