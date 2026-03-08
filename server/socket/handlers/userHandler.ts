import { Socket, Server } from 'socket.io';
import { userRepository } from '../../repositories/userRepository.js';
import { broadcastPresence } from '../../services/presenceService.js';
import { SOCKET_MESSAGE } from '@shared/socketEvents';

/** Handles user identity events: set-name and visibility toggles. */
export function registerUserHandlers(socket: Socket, io: Server): void {
  socket.on(SOCKET_MESSAGE.SET_NAME, (userName: string) => {
    // Block duplicate-session sockets from registering a name.
    // The client is already showing the DuplicateSessionPage; this is
    // a server-side guard in case the event is sent anyway.
    if (socket.data.isDuplicate) {
      socket.emit(SOCKET_MESSAGE.DUPLICATE_SESSION);
      return;
    }

    if (userRepository.isNameTaken(userName)) {
      socket.emit(SOCKET_MESSAGE.ERROR, 'This name is already taken. Please choose another.');
      return;
    }
    userRepository.add(socket.id, { name: userName, roomId: null, showRoom: true });
    socket.emit(SOCKET_MESSAGE.SET_NAME_SUCCESS);
    broadcastPresence(io);
  });

  socket.on(SOCKET_MESSAGE.TOGGLE_ROOM_VISIBILITY, (showRoom: boolean) => {
    userRepository.update(socket.id, { showRoom });
    broadcastPresence(io);
  });
}
