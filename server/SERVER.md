# ostl. — Server Documentation

## Overview

The server is the **matchmaker, signaling relay, game catalog, and match logger** for ostl. It does five things:

1. **Matches players** — accepts queue requests, pairs two players, assigns a room
2. **Relays WebRTC signaling** — forwards offer, answer, and ICE candidates between matched players so they can establish a direct peer-to-peer connection
3. **Manages room lifecycle** — tracks who's in what room, handles disconnections with a 15-second grace period, and cleans up when a match ends
4. **Serves the game catalog** — REST API for listing/uploading games, static file serving for game builds loaded in iframes
5. **Logs match history** — records every completed match to PostgreSQL (duration, players, game, winner)

The server **never** sees game data. Once two players establish their WebRTC connection, all game communication flows directly between them. The server just stays alive to handle disconnects and cleanup.

---

## How to Run

```bash
cd server
npm install
npm run dev      # development (auto-restarts on file changes)
npm start        # production
```

Server starts on port `3000` (configurable via `PORT` in `.env`).

The test harness is at `http://localhost:3000` — a two-panel page that simulates two players in one browser window. Use it to verify the entire flow works.

---

## Environment Variables

All configuration is in `server/.env`:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3000` | HTTP server port |
| `DATABASE_URL` | No | — | PostgreSQL connection string (e.g. `postgres://user:pass@localhost:5432/ostl`). If unset, match history is not persisted and the games REST API will fail. |
| `REDIS_URL` | No | `redis://localhost:6379` | Redis connection string. If unset or unreachable, matchmaking queues fall back to in-memory and Socket.IO runs single-instance. |

The server starts cleanly **with or without** Redis and PostgreSQL — both are optional for local development.

---

## File Structure

```
server/
├── index.js                # entry point — Express + Socket.IO + Redis adapter bootstrap
├── handlers.js             # main Socket.IO event orchestrator
├── players.js              # UUID ↔ socket ID mapping
├── matchmaking.js          # per-game queues + pairing (Redis or in-memory)
├── rooms.js                # active room registry + disconnect timers
├── signaling.js            # WebRTC signaling relay
├── matchLog.js             # match duration tracking + PostgreSQL insert
├── redis.js                # ioredis client + connection helper
├── db/
│   ├── pool.js             # PostgreSQL connection pool (pg)
│   └── schema.sql          # DDL: game_catalog + match_history tables
├── routes/
│   └── games.js            # REST API: list, get, upload games
├── middleware/
│   └── gameServing.js      # static file middleware for game builds
├── uploads/
│   └── games/              # extracted game ZIPs live here (auto-created)
├── public/
│   └── index.html          # two-panel test harness (dev tool only)
├── package.json
├── .env                    # PORT, DATABASE_URL, REDIS_URL
└── .gitignore
```

---

## Architecture

### Player Identity

There are no accounts. The client (React app) generates a UUID and stores it in `localStorage`. When the Socket.IO connection opens, the client emits a `register` event with that UUID. The server maps the UUID to the socket ID in a bidirectional map:

```
UUID  →  socket ID
socket ID  →  UUID
```

This is how the server identifies players across the entire session. If a player disconnects and reconnects with the same UUID, the server recognizes them.

**Module:** `players.js`

### Matchmaking

When a player wants to play, the client emits `find_match` with a `gameId` and `displayName`. The server pushes their entry into a per-game queue. When two players are in the same queue, the server:

1. Pops both entries from the queue
2. Generates a room ID (`crypto.randomUUID()`)
3. Creates a room record
4. Joins both sockets to a Socket.IO room
5. Emits `match_found` to both — the first player queued is the **host** (`isHost: true`), the second is the **guest** (`isHost: false`)
6. Records the match start time for duration tracking

**Storage modes:**
- **Redis (preferred):** uses `RPUSH`/`LPOP` on key `ostl:queue:<gameId>`. Queues survive server restarts. Required for multi-instance deployments.
- **In-memory fallback:** used automatically when Redis is unavailable. Fine for local dev, but queues are lost on restart.

The host/guest distinction matters for WebRTC — the host is the one who creates the offer.

**Module:** `matchmaking.js`

### WebRTC Signaling Relay

After `match_found`, the two players need to establish a direct WebRTC connection. They can't find each other directly, so the server acts as a middleman for the signaling handshake:

```
Host                      Server                     Guest
  │                          │                          │
  │── send_offer ──────────▶│                          │
  │                          │──── receive_offer ─────▶│
  │                          │                          │
  │                          │◀──── send_answer ───────│
  │◀── receive_answer ──────│                          │
  │                          │                          │
  │── ice_candidate ───────▶│                          │
  │                          │── receive_ice_candidate ▶│
  │                          │                          │
  │◀─ receive_ice_candidate ─│◀──── ice_candidate ─────│
  │                          │                          │
  ╚══════════ direct P2P connection established ═══════╝
```

The server uses the `roomId` to look up who the opponent is, gets their socket ID, and forwards the message. That's all it does — it never inspects the offer, answer, or ICE candidate payloads.

After this handshake completes, the two browsers talk directly. The server is out of the loop for all game data.

**Module:** `signaling.js`

### Room State & Reconnection

Every active match is tracked in a room registry:

```
roomId → { players: [uuid1, uuid2], gameId }
```

There's also a reverse lookup (`uuid → roomId`) for fast access.

**Disconnect handling:**

When a player's socket disconnects, the server does NOT immediately kill the match. Instead:

1. Removes the player from any matchmaking queue they were in
2. Emits `opponent_reconnecting` to the room so the remaining player's UI shows a reconnecting overlay
3. Starts a **15-second timer**
4. If the player reconnects (emits `register` with the same UUID) within 15 seconds:
   - Timer is cancelled
   - Player is re-joined to the Socket.IO room
   - Server emits `rejoin` to the reconnected player with the `roomId`
   - Server emits `opponent_rejoined` to the other player
5. If the timer expires:
   - Server emits `opponent_disconnected` to the other player
   - Room is deleted

**Module:** `rooms.js`

### Match Logging (PostgreSQL)

When a match starts, the server records the timestamp in an in-memory map. When the match ends (`match_ended` event), it calculates the duration and inserts a row into the `match_history` table:

```sql
INSERT INTO match_history
  (room_id, game_slug, player1_uuid, player2_uuid, started_at, ended_at, duration_ms, winner_uuid)
```

If `DATABASE_URL` is not set, the insert is skipped and a console log is emitted instead. This is non-blocking — the server never crashes due to a failed log.

**Module:** `matchLog.js`

### Redis Integration

Redis serves two purposes:

1. **`@socket.io/redis-adapter`** — enables Socket.IO to work across multiple Node.js instances. When load-balanced behind a reverse proxy, a player on Server A can be matched with a player on Server B because Redis Pub/Sub routes the events.

2. **Persistent matchmaking queues** — queues are stored in Redis lists (`ostl:queue:<gameId>`) so they survive server restarts. Without Redis, restarting the server drops everyone from the queue.

On startup, the server tests the Redis connection. If Redis is available, it wires the adapter and uses Redis-backed queues. If not, it logs a warning and falls back to in-memory — no configuration needed to run locally.

**Module:** `redis.js`

### Teardown

When the game ends (either player emits `match_ended` with the `roomId`), the server:
1. Logs the match to PostgreSQL (if configured)
2. Emits `opponent_disconnected` to the other player
3. Removes the room from the registry and cleans up all mappings

---

## REST API

All routes are under `/api/games`. The API requires PostgreSQL (`DATABASE_URL` must be set).

### GET `/api/games`

List all active games in the catalog.

**Response:**
```json
{
  "games": [
    {
      "id": 1,
      "slug": "dummy-game",
      "title": "Ostl Sandbox Engine",
      "description": "Move your square with WASD / Arrow Keys.",
      "thumbnail_url": "https://...",
      "min_players": 2,
      "max_players": 2,
      "created_at": "2026-04-09T...",
      "total_plays": 42
    }
  ]
}
```

### GET `/api/games/:slug`

Get a single game with play statistics.

**Response:**
```json
{
  "game": { /* same fields as above */ },
  "stats": {
    "total_plays": 42,
    "unique_players": 18
  }
}
```

### POST `/api/games`

Upload a new game build. Accepts a multipart form with a `.zip` file.

**Request (multipart/form-data):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `gameZip` | File (.zip) | Yes | ZIP file containing the game build (max 50MB). Must contain `index.html` at root. |
| `title` | String | Yes | Display title for the game |
| `description` | String | No | Short description |
| `thumbnail_url` | String | No | URL to a thumbnail image |

**Example:**
```bash
curl -X POST http://localhost:3000/api/games \
  -F "gameZip=@my-game.zip" \
  -F "title=My Awesome Game" \
  -F "description=A fast-paced 1v1 battle game"
```

**Response (201):**
```json
{
  "message": "Game published successfully",
  "game": { "slug": "my-awesome-game", "title": "My Awesome Game", ... },
  "playUrl": "/games/my-awesome-game/index.html"
}
```

**What happens on upload:**
1. The ZIP is validated — must contain `index.html`, no path traversal
2. A slug is generated from the title (e.g. "My Awesome Game" → `my-awesome-game`)
3. The ZIP is extracted to `server/uploads/games/<slug>/`
4. A row is inserted into `game_catalog` in PostgreSQL
5. The game is immediately playable at `/games/<slug>/index.html`

**Module:** `routes/games.js`

---

## Game Serving

Games are served as static files under the `/games/` URL prefix.

Two directories are checked, in order:
1. `server/uploads/games/<slug>/` — games uploaded via the REST API
2. `../games/<slug>/` — games placed directly in the repo-level `games/` directory (backward compatibility for `dummy-game`)

The middleware also sets correct MIME types for `.wasm` and `.pck` files (needed for Godot/Unity WebGL exports).

**Module:** `middleware/gameServing.js`

---

## Socket.IO Event Contract

This is the agreed interface between the client and server. All communication happens over Socket.IO.

### Events the Client Sends → Server

| Event | Payload | When to Emit |
|-------|---------|--------------|
| `register` | `{ uuid }` | Immediately after `socket.connect()`. Must be the first event. |
| `find_match` | `{ gameId, displayName }` | When the user clicks Play. `gameId` is the game slug (e.g. `"dummy-game"`). `displayName` is the player's chosen name. |
| `leave_queue` | — | When the user cancels matchmaking before a match is found. |
| `send_offer` | `{ roomId, offer }` | Host only. After receiving `match_found`, create an `RTCPeerConnection`, call `createOffer()`, and send the offer SDP here. |
| `send_answer` | `{ roomId, answer }` | Guest only. After receiving `receive_offer`, call `createAnswer()` and send the answer SDP here. |
| `ice_candidate` | `{ roomId, candidate }` | Both players. Every time `onicecandidate` fires on the `RTCPeerConnection`, send the candidate here. |
| `match_ended` | `{ roomId }` | When the game is over or the player wants to leave. Tells the server to clean up the room. |

### Events the Server Sends → Client

| Event | Payload | What It Means |
|-------|---------|---------------|
| `match_found` | `{ roomId, isHost, opponentName }` | Two players were paired. `roomId` is the match identifier. `isHost` tells the client whether to create the WebRTC offer (`true`) or wait for one (`false`). `opponentName` is the other player's display name. |
| `receive_offer` | `{ offer }` | Guest receives this. Contains the SDP offer from the host. Call `setRemoteDescription(offer)` then `createAnswer()`. |
| `receive_answer` | `{ answer }` | Host receives this. Contains the SDP answer from the guest. Call `setRemoteDescription(answer)`. |
| `receive_ice_candidate` | `{ candidate }` | Both players receive this. Call `addIceCandidate(candidate)` on the `RTCPeerConnection`. |
| `opponent_reconnecting` | `{ roomId }` | The other player's socket dropped. They have 15 seconds to reconnect. Show a reconnecting overlay. |
| `opponent_rejoined` | `{ roomId }` | The other player reconnected within the grace period. Dismiss the overlay and renegotiate WebRTC. |
| `opponent_disconnected` | `{ roomId }` | The other player disconnected and didn't come back within 15 seconds. The match is over. |
| `rejoin` | `{ roomId }` | You reconnected to an active match. Resume the game using this `roomId`. |

---

## Integration Guide — For the Client Developer

### 1. Connect and Register

```javascript
import { io } from 'socket.io-client'

// get or create a persistent UUID
let uuid = localStorage.getItem('ostl-uuid')
if (!uuid) {
  uuid = crypto.randomUUID()
  localStorage.setItem('ostl-uuid', uuid)
}

const socket = io('http://localhost:3000')

socket.on('connect', () => {
  // MUST be the first thing you emit
  socket.emit('register', { uuid })
})
```

### 2. Find a Match

```javascript
// when user clicks Play — gameId is the slug from the catalog
socket.emit('find_match', { gameId: 'dummy-game', displayName: 'Neon Tiger' })

socket.on('match_found', ({ roomId, isHost, opponentName }) => {
  console.log(`Matched against ${opponentName}! Room: ${roomId}, I am ${isHost ? 'host' : 'guest'}`)
  // now set up WebRTC — see step 3
})
```

### 3. WebRTC Signaling

```javascript
const pc = new RTCPeerConnection({
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
})

// send ICE candidates to the server as they're discovered
pc.onicecandidate = (e) => {
  if (e.candidate) {
    socket.emit('ice_candidate', { roomId, candidate: e.candidate })
  }
}

// receive ICE candidates from the server
socket.on('receive_ice_candidate', async ({ candidate }) => {
  await pc.addIceCandidate(new RTCIceCandidate(candidate))
})

if (isHost) {
  // host creates a data channel and sends an offer
  const dc = pc.createDataChannel('game')
  const offer = await pc.createOffer()
  await pc.setLocalDescription(offer)
  socket.emit('send_offer', { roomId, offer })

  // host receives the answer
  socket.on('receive_answer', async ({ answer }) => {
    await pc.setRemoteDescription(new RTCSessionDescription(answer))
  })
} else {
  // guest waits for the offer
  socket.on('receive_offer', async ({ offer }) => {
    await pc.setRemoteDescription(new RTCSessionDescription(offer))
    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)
    socket.emit('send_answer', { roomId, answer })
  })

  // guest receives the data channel
  pc.ondatachannel = (e) => {
    const dc = e.channel
    // use dc to send/receive game data
  }
}
```

### 4. During the Game

The server is **not involved**. All game data flows over the WebRTC data channel directly between the two browsers. The game inside the iframe sends inputs to React via `postMessage`, React sends them over the data channel, and the other side feeds them back into their iframe.

The socket connection to the server stays open only so the server can detect disconnects.

### 5. Game Over

```javascript
// when the game ends
socket.emit('match_ended', { roomId })

// clean up WebRTC
dc.close()
pc.close()
```

### 6. Handle Disconnections

```javascript
// opponent is trying to reconnect (show overlay)
socket.on('opponent_reconnecting', ({ roomId }) => {
  // show "Opponent reconnecting..." UI
})

// opponent came back (dismiss overlay, renegotiate WebRTC)
socket.on('opponent_rejoined', ({ roomId }) => {
  // dismiss reconnecting UI, set up new RTCPeerConnection
})

// opponent left for good (15s expired)
socket.on('opponent_disconnected', ({ roomId }) => {
  // show "Opponent left" screen, clean up
})
```

### 7. Handle Rejoin (Your Own Reconnection)

```javascript
socket.on('rejoin', ({ roomId }) => {
  // you reconnected to an active match
  // re-establish WebRTC connection using the roomId
})
```

### 8. Cancel Matchmaking

```javascript
// user clicks "Cancel" in the queue screen
socket.emit('leave_queue')
```

---

## Game Developer Guide

Games run inside a sandboxed `<iframe>`. Communication with the platform uses `window.postMessage`.

### The Bridge Protocol

Games send and receive JSON messages. The React wrapper handles all networking — the game just sends/receives state:

**Outbound (game → platform → opponent):**
```javascript
// from inside the game iframe
window.parent.postMessage(JSON.stringify({ type: 'MOVE', x: 150, y: 300 }), '*')
```

**Inbound (opponent → platform → game):**
```javascript
// the game listens for messages
window.addEventListener('message', (event) => {
  const data = JSON.parse(event.data)
  if (data.type === 'MOVE') {
    opponent.position = { x: data.x, y: data.y }
  }
})
```

### Reserved Message Types

These are used internally by the React client for match chat. Games should NOT use them:
- `SYS_CHAT` — text chat messages
- `SYS_CHAT_STATUS` — chat enable/disable toggle

### Godot Template

A ready-to-use Godot 4.x bridge script is at `games/godot-template/ostl_bridge.gd`. See `games/godot-template/PUBLISHING_GUIDE.md` for the full step-by-step guide covering export, bridge integration, ZIP packaging, and upload.

### Dummy Game

A minimal HTML5 canvas game is at `games/dummy-game/index.html`. It demonstrates the `postMessage` bridge with WASD movement — one blue square (you) and one red square (opponent).

---

## Database Setup

### 1. Create the Database

```bash
# PostgreSQL
createdb ostl
# or
psql -U postgres -c "CREATE DATABASE ostl;"
```

### 2. Run the Schema

```bash
psql -U postgres -d ostl -f server/db/schema.sql
```

This creates:
- `game_catalog` — every published game on the platform
- `match_history` — every completed match with duration and player UUIDs
- Required indexes for common queries
- Seeds the `dummy-game` entry

### 3. Set the Connection String

Add to `server/.env`:
```
DATABASE_URL=postgres://postgres:password@localhost:5432/ostl
```

### Schema Reference

```sql
-- game_catalog
id, slug (unique), title, description, thumbnail_url,
min_players, max_players, created_at, updated_at, is_active

-- match_history
id, room_id, game_slug (FK → game_catalog.slug),
player1_uuid, player2_uuid, started_at, ended_at,
duration_ms, winner_uuid
```

---

## Client Architecture (Reference)

The React client is a separate Vite app in `client/`. Backend devs don't need to modify it, but it helps to understand what consumes the server API.

### Routes

| Route | Component | What it does |
|-------|-----------|-------------|
| `/` | `LandingPage` | Marketing hero page |
| `/games` | `GameListingPage` | Fetches `GET /api/games`, displays game cards, modal with display name input |
| `/matchmaking` | `MatchFindingPage` | Emits `find_match`, shows queue timer, routes to `/play` on `match_found` |
| `/play` | `GamePage` | Full game session — WebRTC + iframe + chat sidebar + reconnection overlays |

### Key Components

| Component | Role |
|-----------|------|
| `SocketProvider` | React context — auto-connects Socket.IO, registers ephemeral UUID on connect |
| `useWebRTC` | Hook — full WebRTC lifecycle (offer/answer/ICE/data channel) with reconnect support |
| `GameWrapper` | iframe bridge — relays game `postMessage` ↔ WebRTC data channel. Validates JSON. |

---

## What's NOT Implemented Yet

| Feature | Status | Notes |
|---------|--------|-------|
| Redis-backed queues | ✅ Done | Uses `RPUSH`/`LPOP` with in-memory fallback. Requires `REDIS_URL`. |
| Socket.IO Redis adapter | ✅ Done | `@socket.io/redis-adapter` wired for multi-instance support. |
| PostgreSQL match logging | ✅ Done | Logs on `match_ended`. Requires `DATABASE_URL`. |
| Game catalog REST API | ✅ Done | CRUD + ZIP upload at `/api/games`. |
| TURN server fallback | Not started | Needed for corporate networks / symmetric NATs. Add a TURN URL to `iceServers` on the client side. |
| Authentication / JWT | Not started | Currently ephemeral UUIDs only. No persistent accounts. |
| MMR / ELO matchmaking | Not started | Queue is FIFO. Could use Redis sorted sets for skill-based matching. |
| Match result verification | Not started | P2P clients currently self-report. Need cryptographic signing for ranked play. |

---

## Testing

Open `http://localhost:3000` while the server is running. The test page has two panels — each simulates a player. Click Connect → Find Match on both → watch the full signaling flow happen → send a test message through the data channel.

This page is a **dev tool only**. It is not part of the client deliverable.
