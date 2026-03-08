# Lantern

A private, real-time media sharing and video conferencing platform built on a peer-to-peer WebRTC mesh. Rooms are ephemeral — no sign-up, no persistent storage, no media bytes touch the server.

---

## Features

### Conferencing
- **Video & audio conferencing** — full P2P WebRTC mesh (up to ~5 participants)
- **Screen sharing** — replace your video feed with your screen in one click
- **Background blur** — live canvas-based blur pipeline; toggled instantly without re-acquiring the camera
- **Speaking detection** — green glow border highlights whoever is talking
- **Pre-join preview** — adjust camera, mic, blur, and mute preferences before entering the room

### Rooms
- **Room isolation** — each room has its own ID; no room persists after everyone leaves
- **Password-protected rooms** — optional room passwords with inline prompts in the lobby
- **Private / public rooms** — admins can hide their room from the public lobby at any time
- **Duplicate session detection** — opening the same session in a second tab shows a takeover prompt

### Host Controls
- **Mute participants** — admin can mute any participant or mute everyone at once
- **Disable camera** — admin can turn off a participant's camera (user must re-enable it themselves)
- **Kick participants** — admin can remove anyone from the room
- **Privacy guarantee** — the host can never force-unmute or force-re-enable a camera; only the participant can lift those restrictions

### Chat & Messaging
- **Live chat** — room broadcast messages visible to everyone
- **Private messages** — DM any participant directly; toast notification on receipt
- **Presence system** — see who is online, which room they are in, and their mute/camera status

### Engagement
- **Raise hand** — signal you want to speak; count badge on the hand button shows how many hands are up; badge also shows on your own video tile
- **Emoji reactions** — send floating emoji reactions visible to everyone
- **Polls** — any participant can create a poll; creator or host can close it; live vote counts update in real time
- **Q&A** — submit questions, upvote others', and mark them answered; activity dot on the Q&A button when there are unanswered questions
- **Activity dots** — emerald indicator dot on Polls and Q&A footer buttons when there is unread activity
- **Notifications** — toasts for new polls, new questions, and incoming private messages

### General
- **Sound effects** — subtle audio cues for join, message, and click events
- **PWA** — installable on mobile and desktop; works offline for the app shell
- **Dark / light mode** — system preference respected; togglable in-room

---

## Tech Stack

| Layer         | Technology                                    |
| ------------- | --------------------------------------------- |
| Frontend      | React 19, TypeScript, Vite 6                  |
| Styling       | Tailwind CSS v4, `motion` (Framer Motion v12) |
| Icons         | Lucide React                                  |
| Real-time     | Socket.IO v4 (client + server)                |
| Video / Audio | WebRTC (browser-native, P2P mesh)             |
| Backend       | Node.js, Express 4                            |
| Dev server    | `tsx` (no compile step in development)        |
| PWA           | `vite-plugin-pwa`                             |

---

## Project Structure

```
lantern/
├── shared/
│   ├── types.ts                  # Domain models & socket payload types (shared by server + client)
│   └── events.ts                 # All socket event name constants (shared by server + client)
│
├── server/                       # Node.js / Express / Socket.IO backend
│   ├── index.ts                  # Entry point — HTTP server + Vite middleware wiring
│   ├── config.ts                 # PORT, NODE_ENV, rate-limit tuning
│   ├── repositories/
│   │   ├── userRepository.ts     # In-memory user store (swap for DB adapter here)
│   │   └── roomRepository.ts     # In-memory room metadata store
│   ├── services/
│   │   ├── presenceService.ts    # Builds + broadcasts the presence snapshot
│   │   └── roomService.ts        # Leave-room logic + room cleanup
│   ├── lib/
│   │   └── rateLimiter.ts        # Per-socket rolling-window rate limiter
│   └── socket/
│       ├── index.ts              # Wires all handlers onto the io instance
│       └── handlers/
│           ├── userHandler.ts    # set-name, toggle-room-visibility
│           ├── roomHandler.ts    # join-room, leave-room, privacy, host controls, disconnect
│           ├── chatHandler.ts    # send-message, send-private-message
│           ├── engagementHandler.ts  # raise-hand, reactions, polls, Q&A
│           └── webrtcHandler.ts  # offer / answer / ice-candidate relay
│
└── src/                          # React frontend
    ├── main.tsx                  # React root — wraps App in AppProvider
    ├── App.tsx                   # Thin orchestrator: hooks → pages router
    ├── context/
    │   └── AppContext.tsx        # Global state: step, userName, presence, notifications
    ├── hooks/
    │   ├── useMedia.ts           # Camera/mic/screen capture, blur pipeline, track toggles
    │   ├── useWebRTC.ts          # Peer connection lifecycle, offer/answer/ICE
    │   ├── useRoom.ts            # Chat message state + send helpers
    │   ├── useEngagement.ts      # Raise hand, reactions, polls, Q&A state + socket events
    │   └── useNotifications.ts   # Toast queue with auto-dismiss
    ├── pages/
    │   ├── NameEntryPage.tsx     # Step 1 — set display name
    │   ├── PreJoinPage.tsx       # Step 2 — camera/mic preview + device settings
    │   ├── LobbyPage.tsx         # Step 3 — create / join rooms, browse online users
    │   └── RoomPage.tsx          # Step 4 — video grid, controls, sidebar
    ├── components/
    │   ├── VideoPlayer.tsx       # Video tile with speaking detection, fullscreen, zoom/pan
    │   ├── Chat.tsx              # Message list + input (supports private DMs)
    │   ├── Sidebar.tsx           # Tabbed panel: Chat / Room users / All online
    │   ├── EngagementToolbar.tsx # Raise-hand button (with count badge) + emoji picker
    │   ├── ReactionsOverlay.tsx  # Floating emoji reactions layer
    │   ├── PollPanel.tsx         # Create polls, vote, view results
    │   ├── QAPanel.tsx           # Submit questions, upvote, mark answered
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

Copy the example file and edit as needed:

```bash
cp .env.example .env.local
```

| Variable            | Default | Description                                              |
| ------------------- | ------- | -------------------------------------------------------- |
| `PORT`              | `3000`  | Port the server listens on                               |
| `NODE_ENV`          | `development` | Set to `production` to serve the Vite build        |
| `MSG_RATE_MAX`      | `10`    | Max chat messages per socket per window                  |
| `MSG_RATE_WINDOW_MS`| `5000`  | Rolling window duration (ms) for the message rate limit  |
| `MAX_MSG_LENGTH`    | `500`   | Hard cap on chat message length (characters)             |
| `JOIN_COOLDOWN_MS`  | `3000`  | Min ms between consecutive join-room attempts per socket |
| `GEMINI_API_KEY`    | —       | Google Gemini key (reserved for future AI features)      |

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

| Action                       | How                                                           |
| ---------------------------- | ------------------------------------------------------------- |
| Fullscreen a video tile      | Click the expand icon (hover to reveal)                       |
| Zoom / pan in fullscreen     | Scroll wheel to zoom, drag to pan                             |
| Send a private message       | Click the DM icon next to a user in the Room or All tab       |
| Mute yourself                | `Mic` button in footer                                        |
| Turn off camera              | `Video` button in footer                                      |
| Share your screen            | `Share` button in footer                                      |
| Toggle background blur       | `Blur BG` button in footer (disabled when camera is off)      |
| Raise / lower your hand      | Hand button in footer; count badge shows total raised hands   |
| Send an emoji reaction       | Smile button → picker in footer                               |
| Create a poll                | Polls panel → New Poll (any participant can create)           |
| Close a poll                 | Polls panel → Close Poll (creator or host only)               |
| Submit / upvote a question   | Q&A panel → type a question or click the upvote arrow         |
| Open Host Controls           | Shield icon in header (admin only)                            |

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

| Branch                               | Description                    |
| ------------------------------------ | ------------------------------ |
| `main`                               | Stable baseline                |
| `refactor/separate-backend-frontend` | Layered architecture (current) |

---

## License

MIT
