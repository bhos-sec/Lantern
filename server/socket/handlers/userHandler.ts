import { Socket, Server } from "socket.io";
import { userRepository } from "../../repositories/userRepository.js";
import { broadcastPresence } from "../../services/presenceService.js";

/** Handles user identity events: set-name and visibility toggles. */
export function registerUserHandlers(socket: Socket, io: Server): void {
  socket.on("set-name", (userName: string) => {
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
