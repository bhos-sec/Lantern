import { Socket, Server } from 'socket.io';
import type { SendMessagePayload, SendPrivateMessagePayload } from '@shared/types';
import { SOCKET_MESSAGE } from '@shared/socketEvents';


/** Handles room broadcast messages and private (DM) messages. */
export function registerChatHandlers(socket: Socket, io: Server): void {
  socket.on(SOCKET_MESSAGE.SEND_MESSAGE, ({ roomId, message, userName }: SendMessagePayload) => {
    io.to(roomId).emit(SOCKET_MESSAGE.RECEIVE_MESSAGE, {
      id: Math.random().toString(36).substring(2, 11),
      text: message,
      sender: userName,
      senderId: socket.id,
      timestamp: new Date().toISOString(),
    });
  });

  socket.on(
    SOCKET_MESSAGE.SEND_PRIVATE_MESSAGE,
    ({ toUserId, message, userName }: SendPrivateMessagePayload) => {
      const msg = {
        id: Math.random().toString(36).substring(2, 11),
        text: message,
        sender: userName,
        senderId: socket.id,
        toId: toUserId,
        timestamp: new Date().toISOString(),
        isPrivate: true,
      };
      io.to(toUserId).emit(SOCKET_MESSAGE.RECEIVE_MESSAGE, msg); // To recipient
      socket.emit(SOCKET_MESSAGE.RECEIVE_MESSAGE, msg); // Echo back to sender
    },
  );
}
