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

export interface RoomState {
  id: string;
  users: User[];
  messages: Message[];
}
