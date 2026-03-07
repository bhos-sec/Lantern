import { Socket, Server } from "socket.io";
import { userRepository } from "../../repositories/userRepository.js";
import { broadcastPresence } from "../../services/presenceService.js";

/** Handles user identity events: set-name and visibility toggles. */
export function registerUserHandlers(socket: Socket, io: Server): void {
  socket.on("set-name", (userName: string) => {
    // Block duplicate-session sockets from registering a name.
    // The client is already showing the DuplicateSessionPage; this is
    // a server-side guard in case the event is sent anyway.
    if (socket.data.isDuplicate) {
      socket.emit("duplicate-session");
      return;
    }

    if (userRepository.isNameTaken(userName)) {
      socket.emit("error", "This name is already taken. Please choose another.");
      return;
    }
    userRepository.add(socket.id, { name: userName, roomId: null, showRoom: true });
    socket.emit("name-set-success");
    broadcastPresence(io);
  });

  socket.on("toggle-room-visibility", (showRoom: boolean) => {
    userRepository.update(socket.id, { showRoom });
    broadcastPresence(io);
  });
}
