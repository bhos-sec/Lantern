import { io, Socket } from "socket.io-client";

// Single socket instance for the whole app.
// Created once at module load so HMR doesn't open extra connections.
export const socket: Socket = io();
