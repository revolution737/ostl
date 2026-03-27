# ostl. — Server Documentation

## Overview

The server is the **matchmaker and signaling relay** for ostl. It does three things:

1. **Matches players** — accepts queue requests, pairs two players, assigns a room
2. **Relays WebRTC signaling** — forwards offer, answer, and ICE candidates between matched players so they can establish a direct peer-to-peer connection
3. **Manages room lifecycle** — tracks who's in what room, handles disconnections with a 15-second grace period, and cleans up when a match ends

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

## File Structure

```
server/
├── index.js          # entry point — Express + Socket.IO bootstrap
├── handlers.js       # main Socket.IO event orchestrator
├── players.js        # UUID ↔ socket ID mapping
├── matchmaking.js    # per-game queues + pairing logic
├── rooms.js          # active room registry + disconnect timers
├── signaling.js      # WebRTC signaling relay
├── public/
│   └── index.html    # two-panel test harness (dev tool only)
├── package.json
├── .env              # PORT=3000
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

When a player wants to play, the client emits `find_match` with a `gameId`. The server pushes their UUID into a per-game queue (a plain array). When two players are in the same queue, the server:

1. Pops both UUIDs from the queue
2. Generates a room ID (`crypto.randomUUID()`)
3. Creates a room record
4. Joins both sockets to a Socket.IO room
5. Emits `match_found` to both — the first player queued is the **host** (`isHost: true`), the second is the **guest** (`isHost: false`)

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
2. Starts a **15-second timer**
3. If the player reconnects (emits `register` with the same UUID) within 15 seconds:
   - Timer is cancelled
   - Player is re-joined to the Socket.IO room
   - Server emits `rejoin` to the player with the `roomId`
4. If the timer expires:
   - Server emits `opponent_disconnected` to the other player
   - Room is deleted

**Module:** `rooms.js`

### Teardown

When the game ends (either player emits `match_ended` with the `roomId`), the server removes the room from the registry and cleans up all mappings. That's it.

Future addition: log the match to PostgreSQL before deleting (not implemented yet).

---

## Socket.IO Event Contract

This is the agreed interface between the client and server. All communication happens over Socket.IO.

### Events the Client Sends → Server

| Event | Payload | When to Emit |
|-------|---------|--------------|
| `register` | `{ uuid }` | Immediately after `socket.connect()`. Must be the first event. |
| `find_match` | `{ gameId }` | When the user clicks Play. `gameId` identifies which game (e.g. `"bomberman"`). |
| `send_offer` | `{ roomId, offer }` | Host only. After receiving `match_found`, create an `RTCPeerConnection`, call `createOffer()`, and send the offer SDP here. |
| `send_answer` | `{ roomId, answer }` | Guest only. After receiving `receive_offer`, call `createAnswer()` and send the answer SDP here. |
| `ice_candidate` | `{ roomId, candidate }` | Both players. Every time `onicecandidate` fires on the `RTCPeerConnection`, send the candidate here. |
| `match_ended` | `{ roomId }` | When the game is over or the player wants to leave. Tells the server to clean up the room. |

### Events the Server Sends → Client

| Event | Payload | What It Means |
|-------|---------|---------------|
| `match_found` | `{ roomId, isHost }` | Two players were paired. `roomId` is the match identifier. `isHost` tells the client whether to create the WebRTC offer (`true`) or wait for one (`false`). |
| `receive_offer` | `{ offer }` | Guest receives this. Contains the SDP offer from the host. Call `setRemoteDescription(offer)` then `createAnswer()`. |
| `receive_answer` | `{ answer }` | Host receives this. Contains the SDP answer from the guest. Call `setRemoteDescription(answer)`. |
| `receive_ice_candidate` | `{ candidate }` | Both players receive this. Call `addIceCandidate(candidate)` on the `RTCPeerConnection`. |
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
// when user clicks Play
socket.emit('find_match', { gameId: 'bomberman' })

socket.on('match_found', ({ roomId, isHost }) => {
  console.log(`Matched! Room: ${roomId}, I am ${isHost ? 'host' : 'guest'}`)
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

The server is **not involved**. All game data flows over the WebRTC data channel directly between the two browsers. The Godot game inside the iframe sends inputs to React via `JavaScriptBridge`, React sends them over the data channel, and the other side feeds them back into their iframe via `postMessage`.

The socket connection to the server stays open only so the server can detect disconnects.

### 5. Game Over

```javascript
// when the game ends
socket.emit('match_ended', { roomId })

// clean up WebRTC
dc.close()
pc.close()
```

### 6. Handle Opponent Disconnect

```javascript
socket.on('opponent_disconnected', ({ roomId }) => {
  // the other player left and didn't come back in 15 seconds
  // show a "your opponent left" screen, clean up WebRTC
})
```

### 7. Handle Rejoin (Optional)

```javascript
socket.on('rejoin', ({ roomId }) => {
  // you reconnected to an active match
  // re-establish WebRTC connection using the roomId
})
```

---

## What's NOT Implemented Yet

| Feature | Status | Notes |
|---------|--------|-------|
| Redis-backed queues | Not started | Swap `matchmaking.js` arrays to Redis `RPUSH`/`LPOP`. Same logic, persistent storage. |
| PostgreSQL match logging | Not started | Log match results in `match_ended` before deleting the room. |
| TURN server fallback | Not started | Needed if university WiFi or corporate networks block peer-to-peer UDP. Add a TURN server URL to the `iceServers` config on the client side. |

---

## Testing

Open `http://localhost:3000` while the server is running. The test page has two panels — each simulates a player. Click Connect → Find Match on both → watch the full signaling flow happen → send a test message through the data channel.

This page is a **dev tool only**. It is not part of the client deliverable.
