/**
 * Socket event name constants shared between client and server.
 * Use these instead of magic strings to ensure consistency and enable refactoring.
 */

export const SOCKET_MESSAGE = {
  // Chat events
  SEND_MESSAGE: 'send-message',
  SEND_PRIVATE_MESSAGE: 'send-private-message',
  RECEIVE_MESSAGE: 'receive-message',

  // Room events
  JOIN_ROOM: 'join-room',
  JOIN_ROOM_SUCCESS: 'join-room-success',
  LEAVE_ROOM: 'leave-room',
  ROOM_CLOSED: 'room-closed',
  TOGGLE_ROOM_PRIVACY: 'toggle-room-privacy',
  USER_JOINED: 'user-joined',
  USER_LEFT: 'user-left',

  // WebRTC events
  OFFER: 'offer',
  ANSWER: 'answer',
  ICE_CANDIDATE: 'ice-candidate',

  // User/presence events
  SET_NAME: 'set-name',
  SET_NAME_SUCCESS: 'set-name-success',
  PRESENCE_UPDATE: 'presence-update',

  // Device session events
  DUPLICATE_SESSION: 'duplicate-session',
  SESSION_TAKEN_OVER: 'session-taken-over',
  TAKE_OVER_SESSION: 'take-over-session',
  TAKE_OVER_GRANTED: 'take-over-granted',

  // Error event
  ERROR: 'error',
} as const;
