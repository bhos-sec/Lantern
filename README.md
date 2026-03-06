# Lantern

A private, real-time media sharing and video conferencing platform built on a peer-to-peer WebRTC mesh. Rooms are ephemeral — no sign-up, no persistent storage, no media bytes touch the server.

---

## Features

- **Video & audio conferencing** — up to ~5 participants via a full P2P WebRTC mesh
- **Screen sharing** — replace your video feed with your screen with one click
- **Room isolation** — each room has its own ID; optional password protection
- **Private / public rooms** — admins can hide rooms from the public lobby at any time
- **Live chat** — room broadcast messages and encrypted direct (private) messages
- **Presence system** — see who is online and what room they are in
- **Speaking detection** — green glow border lights up when a participant is speaking
- **PWA** — installable on mobile and desktop; works offline for the shell
- **Sound effects** — subtle audio cues for join, message, and click events

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite 6 |
| Styling | Tailwind CSS v4, `motion` (Framer Motion v12) |
| Icons | Lucide React |
| Real-time | Socket.IO v4 (client + server) |
| Video / Audio | WebRTC (browser-native, P2P mesh) |
| Backend | Node.js, Express 4 |
| Dev server | `tsx` (no compile step in development) |
| PWA | `vite-plugin-pwa` |

---

## Project Structure

```
lantern/
├── shared/
│   └── types.ts                  # Domain models & socket payload types (shared by server + client)
│
├── server/                       # Node.js / Express / Socket.IO backend
│   ├── index.ts                  # Entry point — HTTP server + Vite middleware wiring
│   ├── config.ts                 # PORT, NODE_ENV
│   ├── repositories/
│   │   ├── userRepository.ts     # In-memory user store (swap for DB adapter here)
│   │   └── roomRepository.ts     # In-memory room metadata store
│   ├── services/
│   │   ├── presenceService.ts    # Builds + broadcasts the presence snapshot
│   │   └── roomService.ts        # Leave-room logic + room cleanup
│   └── socket/
│       ├── index.ts              # Wires all handlers onto the io instance
│       └── handlers/
│           ├── userHandler.ts    # set-name, toggle-room-visibility
│           ├── roomHandler.ts    # join-room, leave-room, toggle-room-privacy, disconnect
│           ├── chatHandler.ts    # send-message, send-private-message
│           └── webrtcHandler.ts  # offer / answer / ice-candidate relay
│
└── src/                          # React frontend
    ├── main.tsx                  # React root — wraps App in AppProvider
    ├── App.tsx                   # Thin orchestrator: hooks → pages router
    ├── context/
    │   └── AppContext.tsx        # Global state: step, userName, presence, notifications
    ├── hooks/
    │   ├── useMedia.ts           # Camera/mic/screen capture, device selection, track toggles
    │   ├── useWebRTC.ts          # Peer connection lifecycle, offer/answer/ICE
    │   ├── useRoom.ts            # Chat message state + send helpers
    │   └── useNotifications.ts   # Toast queue with auto-dismiss
    ├── pages/
    │   ├── NameEntryPage.tsx     # Step 1 — set display name
    │   ├── LobbyPage.tsx         # Step 2 — create / join rooms, browse online users
    │   └── RoomPage.tsx          # Step 3 — video grid, controls, sidebar
    ├── components/
    │   ├── VideoPlayer.tsx       # Video tile with speaking detection, fullscreen, zoom/pan
    │   ├── Chat.tsx              # Message list + input (supports private DMs)
    │   ├── Sidebar.tsx           # Tabbed panel: Chat / Room users / All online
    │   └── ui/
    │       ├── NotificationToast.tsx   # Fixed top-right toast stack
    │       └── MediaSettingsModal.tsx  # Camera / mic picker + join preferences
    └── lib/
        ├── socket.ts             # Socket.IO singleton
        ├── sounds.ts             # UI sound effect helper
        ├── constants.ts          # ICE server config
        └── utils.ts              # cn() Tailwind class merge helper
```

---

## Getting Started

### Prerequisites

- **Node.js** >= 18
- A browser with WebRTC support (Chrome, Firefox, Edge, Safari 15+)

### Installation

```bash
git clone <repo-url>
cd lantern
npm install
```

### Environment Variables

Copy the example file and fill in your values:

```bash
cp .env.example .env.local
```

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | No | Google Gemini key (reserved for future AI features) |
| `PORT` | No | Server port — defaults to `3000` |

### Development

```bash
npm run dev
```

Starts the Express + Socket.IO server on `http://localhost:3000`. Vite runs in middleware mode so HMR works out of the box.

### Production Build

```bash
npm run build                     # Vite bundles the frontend into dist/
NODE_ENV=production npm run dev   # Serves dist/ via Express
```

---

## How It Works

### Architecture

```
Browser A                    Server                    Browser B
   |-- set-name -----------> |                             |
   |-- join-room ----------> | <-- join-room ------------ |
   |<-- user-joined -------- | ---- user-joined --------> |

   WebRTC Signaling (server is a relay only — no media bytes):
   |-- offer -------------> | ---- offer ---------------> |
   |<-- answer ------------ | <--- answer ---------------  |
   |-- ice-candidate -------> | ---- ice-candidate -------> |

   After ICE:  A <============== P2P Media ==============> B
```

- The server only relays WebRTC signaling messages (offer / answer / ICE candidates).
- All audio and video travel **directly between browsers** via DTLS-SRTP encrypted P2P streams.
- Chat messages are routed through the server via Socket.IO (not stored).

### Room Lifecycle

1. A user picks a **Room ID** and clicks **Create & Join** — the server registers the room and marks that socket as admin.
2. Other users **Join** with the same ID (and optional password).
3. Each new joiner triggers a **WebRTC offer** from every existing participant, growing the mesh.
4. When the **admin leaves**, the server broadcasts `room-closed` and all peers return to the lobby.
5. If a non-admin leaves, only their peer connections are torn down.

---

## Tips & Shortcuts

| Action | How |
|---|---|
| Fullscreen a video tile | Click the expand icon (hover to reveal) |
| Zoom / pan in fullscreen | Scroll wheel to zoom, drag to pan |
| Send a private message | Click the DM icon next to a user in the Room or All tab |
| Mute yourself | `Mic` button in footer |
| Turn off camera | `Video` button in footer |
| Share your screen | `Share` button in footer |

---

## Extending the Project

### Adding a Database

All state lives in two in-memory Maps. Swap them for a SQLite (or other DB) adapter without touching any service or handler code:

- **`server/repositories/userRepository.ts`** — replace `Map` operations with DB queries
- **`server/repositories/roomRepository.ts`** — same pattern

`better-sqlite3` is already installed.

### Adding AI Features

`@google/genai` is already installed. Set `GEMINI_API_KEY` in `.env.local` and import the client anywhere in the server layer.

---

## Branch Strategy

| Branch | Description |
|---|---|
| `main` | Stable baseline |
| `refactor/separate-backend-frontend` | Layered architecture (current) |

---

## License

MIT
