// Shared types used by both the server and client.
// Import from here in both server/ and src/ to keep a single source of truth.

// ─── Domain Models ───────────────────────────────────────────────────────────

export interface Message {
  id: string;
  text: string;
  sender: string;
  senderId: string;
  timestamp: string;
  isPrivate?: boolean;
  toId?: string;
}

export interface User {
  id: string;
  name: string;
}

/** Snapshot sent to all clients via "presence-update" */
export interface PresenceUser {
  id: string;
  name: string;
  /** Visible room ID (null when private or hidden) */
  roomId: string | null;
  /** Actual room ID, used for room-tab filtering on the client */
  actualRoomId: string | null;
  isAdmin: boolean;
  isRoomPrivate: boolean;
}

// ─── Socket Event Payloads (Client → Server) ─────────────────────────────────

export interface JoinRoomPayload {
  roomId: string;
  userName: string;
  password?: string;
  isPrivate?: boolean;
  isCreating?: boolean;
}

export interface SendMessagePayload {
  roomId: string;
  message: string;
  userName: string;
}

export interface SendPrivateMessagePayload {
  toUserId: string;
  message: string;
  userName: string;
}

export interface OfferPayload {
  to: string;
  offer: RTCSessionDescriptionInit;
  fromName: string;
}

export interface AnswerPayload {
  to: string;
  answer: RTCSessionDescriptionInit;
}

export interface IceCandidatePayload {
  to: string;
  candidate: RTCIceCandidateInit;
}

// ─── Socket Event Payloads (Server → Client) ─────────────────────────────────

export interface UserJoinedPayload {
  userId: string;
  userName: string;
}

export interface IncomingOfferPayload {
  from: string;
  offer: RTCSessionDescriptionInit;
  fromName: string;
}

export interface IncomingAnswerPayload {
  from: string;
  answer: RTCSessionDescriptionInit;
}

export interface IncomingIceCandidatePayload {
  from: string;
  candidate: RTCIceCandidateInit;
}

// ─── Meeting Engagement Tools (Issue #9) ────────────────────────────────────

/** A raised-hand event broadcasted to the room. */
export interface RaiseHandPayload {
  userId: string;
  userName: string;
  raised: boolean; // true = raised, false = lowered
}

/** An emoji reaction sent by a participant. */
export interface ReactionPayload {
  userId: string;
  userName: string;
  emoji: string;
}

/** A poll option. */
export interface PollOption {
  id: string;
  text: string;
  votes: string[]; // array of voter userIds
}

/** A full poll object. */
export interface Poll {
  id: string;
  roomId: string;
  createdBy: string;
  question: string;
  options: PollOption[];
  closed: boolean;
  createdAt: string;
}

/** Client → Server: create a new poll. */
export interface CreatePollPayload {
  roomId: string;
  question: string;
  options: string[]; // option texts
}

/** Client → Server: cast a vote on a poll option. */
export interface VotePollPayload {
  roomId: string;
  pollId: string;
  optionId: string;
}

/** A Q&A question submitted by a participant. */
export interface QAQuestion {
  id: string;
  roomId: string;
  userId: string;
  userName: string;
  text: string;
  upvotes: string[]; // userIds who upvoted
  answered: boolean;
  createdAt: string;
}

/** Client → Server: submit a question. */
export interface SubmitQuestionPayload {
  roomId: string;
  text: string;
  userName: string;
}

/** Client → Server: upvote a question. */
export interface UpvoteQuestionPayload {
  roomId: string;
  questionId: string;
}

/** Client → Server: mark a question as answered (host only). */
export interface AnswerQuestionPayload {
  roomId: string;
  questionId: string;
}

// ─── Abuse Prevention (Server → Client) ──────────────────────────────────────

/**
 * Emitted when a socket exceeds a rate limit.
 * The client should surface the `message` to the user and optionally
 * disable the relevant UI control for `retryAfterMs` ms.
 */
export interface RateLimitedPayload {
  /** Which action was throttled (e.g. 'chat', 'join-room'). */
  action: string;
  /** How long the client should wait before retrying (ms). */
  retryAfterMs: number;
  /** Human-readable explanation to show in the UI. */
  message: string;
}

// ─── Device Session Events (Server → Client) ──────────────────────────────────

/**
 * Emitted to a socket when the server detects that another socket from the
 * same physical device is already connected (production-only check).
 * The client should render the DuplicateSessionPage and optionally let the
 * user emit "take-over-session" to claim this tab.
 */
export type DuplicateSessionEvent = 'duplicate-session';

/**
 * Emitted to the *old* tab when a newer tab from the same device exercises
 * the "Use This Tab" / take-over action.  The old tab should render a
 * "session moved" screen and stop interacting with the server.
 */
export type SessionTakenOverEvent = 'session-taken-over';

/**
 * Emitted back to the *new* tab after the server grants the take-over.
 * The client clears the duplicate-session state and proceeds normally.
 */
export type TakeOverGrantedEvent = 'take-over-granted';
