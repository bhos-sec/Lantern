import { useState, useCallback } from "react";
import { Socket } from "socket.io-client";
import type { Message } from "../../shared/types";

interface UseRoomProps {
  socket: Socket;
  userName: string;
  roomId: string;
}

/** Manages room-scoped chat messages and exposes send helpers. */
export function useRoom({ socket, userName, roomId }: UseRoomProps) {
  const [messages, setMessages] = useState<Message[]>([]);

  const addMessage = useCallback((msg: Message) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const sendMessage = useCallback(
    (text: string, toUserId?: string) => {
      if (toUserId) {
        socket.emit("send-private-message", { toUserId, message: text, userName });
      } else {
        socket.emit("send-message", { roomId, message: text, userName });
      }
    },
    [socket, roomId, userName]
  );

  return { messages, addMessage, clearMessages, sendMessage };
}
