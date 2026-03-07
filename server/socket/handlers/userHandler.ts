import { Socket, Server } from "socket.io";
import { userRepository } from "../../repositories/userRepository.js";
import { deviceSessionRepository } from "../../repositories/deviceSessionRepository.js";
import { broadcastPresence } from "../../services/presenceService.js";

/** Handles user identity events: set-name and visibility toggles. */
export function registerUserHandlers(socket: Socket, io: Server): void {
  socket.on("set-name", (userName: string) => {
    const deviceId = socket.data.deviceId as string | null;
    const isDeveloper = socket.data.isDeveloper as boolean;

    // Block if this device already has an active session in another tab.
    // Developers (matched by OWNER_KEY) are exempt from this restriction.
    if (deviceId && !isDeveloper) {
      if (deviceSessionRepository.hasActiveSession(deviceId)) {
        socket.emit(
          "error",
          "You already have an active Lantern session open in another tab. " +
            "Please close that tab before joining here."
        );
        return;
      }
    }

    if (userRepository.isNameTaken(userName)) {
      socket.emit("error", "This name is already taken. Please choose another.");
      return;
    }

    // Register the device → socket mapping so subsequent tabs are blocked.
    if (deviceId) {
      deviceSessionRepository.register(deviceId, socket.id);
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
