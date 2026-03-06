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
