import { io, Socket } from "socket.io-client";
import { getDeviceId } from "./deviceId";

// Single socket instance for the whole app.
// Created once at module load so HMR doesn't open extra connections.

// Stable per-browser-profile device ID — used to enforce one session per device.
const deviceId = getDeviceId();

// VITE_OWNER_KEY is set in .env.local on the developer's machine only.
// Matching the server-side OWNER_KEY bypasses the multi-tab restriction.
const ownerKey = import.meta.env.VITE_OWNER_KEY ?? "";

export const socket: Socket = io({ auth: { deviceId, ownerKey } });
