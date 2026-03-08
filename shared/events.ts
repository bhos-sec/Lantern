/**
 * Centralized socket event name constants shared between the server and client.
 * Import from '@shared/events' in both server/ and src/ to keep a single source
 * of truth — this prevents string-typo bugs and makes event renaming safe.
 *
 * Usage:
 *   import { SOCKET_EVENTS } from '@shared/events';
 *   socket.emit(SOCKET_EVENTS.JOIN_ROOM, payload);
 *   socket.on(SOCKET_EVENTS.JOIN_ROOM_SUCCESS, handler);
 */
export const SOCKET_EVENTS = {
  // ── User identity ──────────────────────────────────────────────────────────
  /** Client → Server: register a display name for the socket. */
  SET_NAME: 'set-name',
  /** Server → Client: name accepted, transition to lobby. */
  NAME_SET_SUCCESS: 'name-set-success',
  /** Client → Server: toggle whether the user's room is shown in the presence list. */
  TOGGLE_ROOM_VISIBILITY: 'toggle-room-visibility',

  // ── Room lifecycle ─────────────────────────────────────────────────────────
  /** Client → Server: join or create a room. */
  JOIN_ROOM: 'join-room',
  /** Server → Client: room join confirmed, carry the room ID. */
  JOIN_ROOM_SUCCESS: 'join-room-success',
  /** Client → Server: voluntarily leave the current room. */
  LEAVE_ROOM: 'leave-room',
  /** Client → Server: toggle public/private visibility of the room (admin only). */
  TOGGLE_ROOM_PRIVACY: 'toggle-room-privacy',
  /** Server → Client (room broadcast): admin left — room is closing. */
  ROOM_CLOSED: 'room-closed',

  // ── Participant events ─────────────────────────────────────────────────────
  /** Server → Client (room broadcast): a new peer joined and wants to connect. */
  USER_JOINED: 'user-joined',
  /** Server → Client (room broadcast): a peer left the room. */
  USER_LEFT: 'user-left',

  // ── Chat ───────────────────────────────────────────────────────────────────
  /** Client → Server: send a message to the whole room. */
  SEND_MESSAGE: 'send-message',
  /** Client → Server: send a direct message to one participant. */
  SEND_PRIVATE_MESSAGE: 'send-private-message',
  /** Server → Client: deliver an incoming message (room or DM). */
  RECEIVE_MESSAGE: 'receive-message',

  // ── WebRTC signaling ───────────────────────────────────────────────────────
  /** Bidirectional relay: SDP offer for peer connection setup. */
  OFFER: 'offer',
  /** Bidirectional relay: SDP answer for peer connection setup. */
  ANSWER: 'answer',
  /** Bidirectional relay: ICE candidate for NAT traversal. */
  ICE_CANDIDATE: 'ice-candidate',

  // ── Host controls ──────────────────────────────────────────────────────────
  /** Client → Server: mute one participant (admin only). */
  MUTE_USER: 'mute-user',
  /** Client → Server: unmute one participant (admin only). */
  UNMUTE_USER: 'unmute-user',
  /** Client → Server: mute all participants except self (admin only). */
  MUTE_ALL: 'mute-all',
  /** Client → Server: remove a participant from the room (admin only). */
  KICK_USER: 'kick-user',
  /** Server → Client: you have been force-muted by the admin. */
  FORCE_MUTED: 'force-muted',
  /** Server → Client: you have been force-unmuted by the admin. */
  FORCE_UNMUTED: 'force-unmuted',
  /** Server → Client: you have been removed from the room by the admin. */
  KICKED: 'kicked',
  /** Client → Server: disable a participant's camera (admin only). */
  DISABLE_CAMERA: 'disable-camera',
  /** Server → Client: your camera has been forcibly disabled by the admin. */
  FORCE_CAMERA_OFF: 'force-camera-off',
  /** Client → Server: broadcast own camera enabled/disabled state so the server can track it. */
  CAMERA_STATE_UPDATE: 'camera-state-update',
  /** Client → Server: broadcast own mute state so the server can track it. */
  MUTE_STATE_UPDATE: 'mute-state-update',

  // ── Engagement ─────────────────────────────────────────────────────────────
  /** Client → Server: raise or lower hand. */
  RAISE_HAND: 'raise-hand',
  /** Server → Client (room broadcast): a participant's hand state changed. */
  HAND_RAISED: 'hand-raised',
  /** Client → Server: send an emoji reaction. */
  SEND_REACTION: 'send-reaction',
  /** Server → Client (room broadcast): an emoji reaction was received. */
  REACTION_RECEIVED: 'reaction-received',
  /** Client → Server: create a new poll (admin only). */
  CREATE_POLL: 'create-poll',
  /** Server → Client (room broadcast): a new poll was created. */
  POLL_CREATED: 'poll-created',
  /** Server → Client (room broadcast): a poll's votes or closed state changed. */
  POLL_UPDATED: 'poll-updated',
  /** Client → Server: cast a vote on a poll option. */
  VOTE_POLL: 'vote-poll',
  /** Client → Server: close a poll so no further votes are accepted (admin only). */
  CLOSE_POLL: 'close-poll',
  /** Client → Server: submit a Q&A question. */
  SUBMIT_QUESTION: 'submit-question',
  /** Server → Client (room broadcast): a new question was submitted. */
  QUESTION_SUBMITTED: 'question-submitted',
  /** Client → Server: upvote an existing question. */
  UPVOTE_QUESTION: 'upvote-question',
  /** Client → Server: mark a question as answered (admin only). */
  ANSWER_QUESTION: 'answer-question',
  /** Server → Client (room broadcast): a question's upvotes or answered state changed. */
  QUESTION_UPDATED: 'question-updated',
  /** Client → Server: request the current polls + Q&A state (sent on room join). */
  REQUEST_ENGAGEMENT_STATE: 'request-engagement-state',
  /** Server → Client: full engagement state snapshot sent on request. */
  ENGAGEMENT_STATE: 'engagement-state',

  // ── Presence ───────────────────────────────────────────────────────────────
  /** Server → Client (global broadcast): updated list of online users. */
  PRESENCE_UPDATE: 'presence-update',

  // ── System ─────────────────────────────────────────────────────────────────
  /** Server → Client: a server-side error message to display to the user. */
  ERROR: 'error',
  /** Server → Client: a rate-limit was hit; carry retry information. */
  RATE_LIMITED: 'rate-limited',
  /** Server → Client: another tab on the same device is already active. */
  DUPLICATE_SESSION: 'duplicate-session',
  /** Server → Client: a newer tab claimed this device's session. */
  SESSION_TAKEN_OVER: 'session-taken-over',
  /** Client → Server: claim this tab as the active session, evicting the old one. */
  TAKE_OVER_SESSION: 'take-over-session',
  /** Server → Client: take-over granted — this tab is now the active session. */
  TAKE_OVER_GRANTED: 'take-over-granted',
} as const;

/** Union type of all socket event name strings. */
export type SocketEvent = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];
