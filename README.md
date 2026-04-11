# ostl.

**An open multiplayer gaming platform** — matchmake players, stream games, and connect them peer-to-peer via WebRTC. Developers can upload their own games; players find opponents and play instantly in-browser.

Live: [ostl.vercel.app](https://ostl.vercel.app) · Server: [ostl-production.up.railway.app](https://ostl-production.up.railway.app)

---

## What It Does

ostl. is a browser-based multiplayer gaming hub. Players open the site, pick a game, enter a display name, and are automatically paired with another player waiting for the same game. Once matched, a direct WebRTC data channel is established between their browsers — the server is only needed for the initial handshake (signaling). After that, all game state flows peer-to-peer with near-zero latency.

Developers can register, upload HTML5 game zips via an authenticated dashboard, and track plays through a built-in analytics panel.

---

## Architecture

```
┌─────────────────────────────┐        ┌──────────────────────────────┐
│     Client (React/Vite)     │        │     Server (Node/Express)    │
│  ostl.vercel.app            │◄──────►│  ostl-production.railway.app │
│                             │ WS     │                              │
│  SocketProvider (Socket.IO) │        │  Socket.IO + Redis Adapter   │
│  useWebRTC (WebRTC P2P)     │        │  Matchmaking (queue/pair)    │
│  Pages: Games, Matchmaking, │        │  Signaling (offer/answer/ICE)│
│         Game, Dev Dashboard │        │  REST API (/api/games, auth) │
└─────────────────────────────┘        └──────────────┬───────────────┘
                                                      │
                    ┌─────────────────────────────────┼──────────────┐
                    │                                 │              │
             ┌──────▼──────┐                  ┌──────▼──────┐       │
             │  PostgreSQL  │                  │    Redis    │       │
             │  (Supabase)  │                  │  (Upstash)  │       │
             │  Game catalog│                  │  Match queues│      │
             │  Match logs  │                  │  (optional) │       │
             └─────────────┘                  └─────────────┘       │
```

### Connection Flow

1. Player opens the app → Socket.IO connects to Railway server
2. Player selects a game and clicks **Play Now** → server receives `find_match`
3. When two players queue for the same game → server emits `match_found` to both with a shared `roomId`
4. The **host** player creates a WebRTC `RTCPeerConnection`, generates an SDP offer, sends it via `send_offer`
5. Server relays the offer to the opponent via `receive_offer`
6. Opponent generates an answer → `send_answer` → server relays → host sets remote description
7. ICE candidates are exchanged the same way via `ice_candidate` / `receive_ice_candidate`
8. WebRTC data channel opens → game state flows **directly between browsers**, server is no longer in the loop

---

## Project Structure

```
ostl/
├── client/                  # React frontend (Vite)
│   └── src/
│       ├── App.jsx           # Routes
│       ├── context/
│       │   └── SocketProvider.jsx   # Socket.IO connection + UUID management
│       ├── hooks/
│       │   └── useWebRTC.js  # WebRTC peer connection + data channel
│       └── pages/
│           ├── LandingPage.jsx
│           ├── GameListingPage.jsx      # Browse & select games
│           ├── MatchFindingPage.jsx     # Waiting for opponent
│           ├── GamePage.jsx             # Loads game in iframe over WebRTC
│           ├── DeveloperAuthPage.jsx
│           ├── DeveloperDashboard.jsx
│           ├── DeveloperUploadPage.jsx
│           └── DeveloperAnalyticsPage.jsx
│
└── server/                  # Node.js backend (Express + Socket.IO)
    ├── index.js              # App entry point, server boot
    ├── handlers.js           # Socket.IO event orchestrator
    ├── signaling.js          # WebRTC signaling relay (offer/answer/ICE)
    ├── matchmaking.js        # Queue logic — Redis-backed or in-memory fallback
    ├── rooms.js              # Active room tracking + disconnect timers
    ├── players.js            # UUID ↔ socket ID registry
    ├── matchLog.js           # Match start/end persistence
    ├── redis.js              # ioredis client with graceful fallback
    ├── db/
    │   ├── pool.js           # PostgreSQL connection pool
    │   ├── migrate.js        # Auto-migration on startup
    │   └── schema.sql        # Table definitions
    ├── routes/
    │   ├── games.js          # GET /api/games, POST upload, analytics
    │   └── auth.js           # Developer registration & login
    ├── services/
    │   └── supabaseService.js
    └── middleware/
        └── gameServing.js    # Serves uploaded game zips as static assets
```

---

## Key Components

### `SocketProvider` (`client/src/context/SocketProvider.jsx`)
Establishes the Socket.IO connection on app load. Generates an ephemeral `uuid` per browser session (stored in `sessionStorage` so separate tabs are treated as different players). Exposes `socket`, `uuid`, and `isConnected` via React context.

### `useWebRTC` (`client/src/hooks/useWebRTC.js`)
Manages the full WebRTC lifecycle:
- Creates `RTCPeerConnection` with Google STUN servers
- Host creates the data channel and SDP offer; guest receives it and answers
- ICE candidates are exchanged through the signaling server
- `sendMessage(payload)` — sends arbitrary JSON through the data channel
- `setOnGameData(callback)` — registers a direct callback that fires **immediately** on incoming data, bypassing React state batching for latency-sensitive game inputs

### Matchmaking (`server/matchmaking.js`)
Per-game FIFO queues. When Redis is available, queues are backed by Redis lists (`ostl:queue:<gameId>`) for persistence across restarts and multi-instance deployments. Without Redis, an in-memory `Map` is used as a fallback — matches still work, but are lost on restart.

### Signaling (`server/signaling.js`)
Pure relay — the server never interprets WebRTC payloads, it just looks up the opponent's socket ID and forwards `offer`, `answer`, and `ice_candidate` events.

### Reconnection
If a player disconnects mid-match, the server starts a grace-period timer. If the same UUID reconnects before the timer fires, they are automatically rejoined to their room and the opponent is notified via `opponent_rejoined`.

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/games` | List all active games in the catalog |
| `POST` | `/api/games` | Upload a new game (multipart, auth required) |
| `GET` | `/api/games/:id/analytics` | Play count and match stats for a game |
| `POST` | `/api/auth/register` | Register a developer account |
| `POST` | `/api/auth/login` | Login and receive a session token |
| `GET` | `/api/debug` | Snapshot of active players, queues, and rooms |

---

## Socket.IO Events

### Client → Server
| Event | Payload | Description |
|-------|---------|-------------|
| `register` | `{ uuid }` | Identify this socket with a UUID |
| `find_match` | `{ gameId, displayName }` | Join the matchmaking queue |
| `leave_queue` | — | Cancel matchmaking |
| `send_offer` | `{ roomId, offer }` | Send WebRTC offer to opponent |
| `send_answer` | `{ roomId, answer }` | Send WebRTC answer to opponent |
| `ice_candidate` | `{ roomId, candidate }` | Send ICE candidate to opponent |
| `match_ended` | `{ roomId }` | Signal match is over |

### Server → Client
| Event | Payload | Description |
|-------|---------|-------------|
| `match_found` | `{ roomId, isHost, opponentName }` | Match paired, start WebRTC |
| `receive_offer` | `{ offer }` | Relayed SDP offer from host |
| `receive_answer` | `{ answer }` | Relayed SDP answer from guest |
| `receive_ice_candidate` | `{ candidate }` | Relayed ICE candidate |
| `rejoin` | `{ roomId }` | Reconnected to existing room |
| `opponent_rejoined` | `{ roomId }` | Opponent came back after disconnect |
| `opponent_disconnected` | `{ roomId }` | Opponent left permanently |

---

## Running Locally

### Prerequisites
- Node.js 18+
- A Supabase project (for game catalog + auth)
- Redis (optional — matches work without it)

### Server

```bash
cd server
cp .env.example .env   # fill in your credentials
npm install
npm run dev            # nodemon / node --watch
```

**`server/.env`**
```env
PORT=3000
DATABASE_URL=postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
REDIS_URL=redis://localhost:6379   # optional
```

### Client

```bash
cd client
npm install
npm run dev
```

The client auto-detects the hostname and connects to port 3000 in development, so it works on LAN devices too (e.g. phone on the same WiFi).

---

## Deployment

| Service | Purpose | URL |
|---------|---------|-----|
| [Vercel](https://vercel.com) | React frontend (Static Site) | `ostl.vercel.app` |
| [Railway](https://railway.app) | Node server (Web Service) | `ostl-production.up.railway.app` |
| [Upstash](https://upstash.com) | Redis (optional) | managed |
| [Supabase](https://supabase.com) | PostgreSQL + Auth | managed |

### Vercel Environment Variables
```
VITE_SERVER_URL=https://ostl-production.up.railway.app
```

### Railway Environment Variables
```
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
DATABASE_URL=...
REDIS_URL=...          # optional, from Upstash
NODE_ENV=production
```

> **Note:** `PORT` is set automatically by Railway — do not add it manually.

### Deploy Steps
1. Push to `main` — Vercel and Railway auto-deploy from GitHub
2. Railway: set root directory to `server`, build command `npm install`, start `npm start`
3. Vercel: set root directory to `client`, build command `npm run build`, output `dist`

---

## Developer Portal

Developers can register at `/developers`, log in, and access:
- **Dashboard** — list of uploaded games with play counts
- **Upload** — drag-and-drop a zipped HTML5 game with metadata (title, description, thumbnail)
- **Analytics** — per-game match history and engagement stats

Uploaded games are extracted on the server and served at `/games/<slug>/index.html`, then embedded in the matchmaking flow via the `play_url` field.

---

## Notes

- WebRTC requires a **secure context** (HTTPS or localhost). LAN play over plain HTTP will fail in most browsers due to this restriction.
- The server uses Google STUN servers. For connections across strict NATs, a TURN server would be needed (not currently configured).
- Redis is fully optional — the server degrades gracefully to in-memory queues with a console warning.
- Each browser tab gets its own UUID via `sessionStorage`, so you can test two-player locally by opening two tabs.
