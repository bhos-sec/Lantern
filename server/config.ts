import 'dotenv/config';

export const PORT = Number(process.env.PORT) || 3000;
export const IS_PROD = process.env.NODE_ENV === 'production';

// ── Abuse-prevention / rate-limiting ─────────────────────────────────────────
/** Maximum chat messages (room + DM combined) allowed per socket within the window. */
export const MSG_RATE_MAX = Number(process.env.MSG_RATE_MAX) || 10;
/** Rolling window duration in ms for the message rate limit. */
export const MSG_RATE_WINDOW_MS = Number(process.env.MSG_RATE_WINDOW_MS) || 5_000;
/** Hard cap on chat message length (characters). */
export const MAX_MSG_LENGTH = Number(process.env.MAX_MSG_LENGTH) || 500;
/** Minimum ms a socket must wait between consecutive join-room attempts. */
export const JOIN_COOLDOWN_MS = Number(process.env.JOIN_COOLDOWN_MS) || 3_000;
