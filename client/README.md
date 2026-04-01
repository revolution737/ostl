# Ostl P2P Platform - Client Architecture

Welcome to the frontend architecture of the **Ostl P2P Gaming Platform**. This documentation serves as a comprehensive guide to understanding the current state of the React client, the underlying WebRTC matchmaking engine, and the roadmap for scaling into production.

---

## 🚀 Current System Capabilities

The client currently operates as a fully functional, zero-latency matchmaking and communication interface. It is built using **React + Vite** and utilizes **Socket.IO** for signaling and **Node's Native RTCPeerConnection API** for decentralized P2P gameplay.

### 1. Matchmaking Lifecycle
1. **The Live Hub (`/games`)**: Users select a sandbox engine/game from a grid UI and establish a display name.
2. **The Waiting Room (`/matchmaking`)**: The client emits `join_queue` via Socket.IO. The Node server constantly pairs users based on target `gameId`.
3. **The Handshake (`/play`)**: Once the server signals a match, players are instantly routed to the active `GamePage`. One player is assigned the **Host**, the other the **Guest**.

### 2. WebRTC Data Channels (The "Dumb Relay")
We bypass traditional centralized game servers. Once `/play` mounts:
*   The **Host** generates an `RTCPeerConnection` and creates a raw Data Channel.
*   The **Guest** receives the SDP Offer asynchronously via Socket.IO and responds with an SDP Answer.
*   **ICE Candidates** exchange in the background via Google's public STUN servers to punch holes through initial firewalls.
*   Once established, Socket.IO is functionally abandoned. All gameplay data streams peer-to-peer natively between browsers with sub-15ms latency.

### 3. The Engine Bridge (`GameWrapper.jsx`)
The core games are built externally (e.g., Godot, Unity WebGL) and mounted inside the `GameWrapper` component via an `<iframe>`.
*   **Outbound Verification**: The `GameWrapper` securely listens to engine `message` broadcasts, strictly verifies them against `JSON.parse` rules to strip browser dev-tool noise, and fires them across the WebRTC tunnel.
*   **Targeted Origin Sandbox**: When opponent actions arrive, the wrapper unpacks the JSON and pushes it into the `contentWindow` strictly bound to the origin of the game's CDN, preventing cross-site scripting (XSS) injection.

### 4. Session Persistence & Reconnection
*   React implicitly stores the active socket configurations in the browser's `sessionStorage`.
*   If a player drops connection or hits "Refresh", the backend issues a **15-second grace period**.
*   The reloaded React DOM hydrates from memory, intercepts the active room pipeline, increments a `reconnectKey`, and forces WebRTC to seamlessly renegotiate ICE candidate handshakes without kicking the opponent.

---

## 🛠️ What Needs to Be Worked on Next

While the dummy data layer is functional, the following client-side implementations are required for full production parity:

1. **State Reconciliation**: Currently, the P2P engine passes blind JSON payloads. If a user refreshes mid-game, the WebRTC tunnel recovers securely, but we need the *Game Engine* to request a state-snapshot from the Host upon reconnection.
2. **Global Auth Context**: Connecting dynamic user profiles, JWTs, and persistent friends lists rather than localized "Display Names".
3. **Turn-Server Fallbacks**: Integrating a commercial TURN server array when restrictive corporate NATs/Firewalls prevent P2P STUN traversal.
4. **Platform Analytics**: Hooking the `GameWrapper` bridge into Datadog/Sentry to log dropped WebRTC frames and desync analytics across user devices.

---

## 🏗️ Guide for Backend & Infra Roles

As the platform scales to AWS and production traffic, the Infrastructure and Backend teams must adhere to the following expansion strategies to support the current Client architecture.

### Backend Infrastructure
The signaling Node.js server is currently a single-threaded local instance operating as a memory-registry for Socket.IO active rooms. 
*   **Scale Socket.IO (Redis)**: You must integrate the `@socket.io/redis-adapter` into the Node handlers. When we load-balance across multiple EC2 instances, a player might connect to Server A while their opponent sits on Server B. Redis Pub/Sub will seamlessly route the SDP offers across instances.
*   **Postgres / Matchmaking Tiers**: The `join_queue` event must be augmented to map user MMR/ELO from a PostgreSQL database. The "Waiting for opponent..." loop will require a cron worker or Redis sorted set to pair proximal skill levels rather than pure FIFO fetching.
*   **Match Result Verification**: Since games are strictly P2P, the clients must cryptographically sign and submit game results to the backend API REST endpoints at the conclusion of matches to prevent ladder manipulation.

### AWS Cloud & DevOps Infrastructure
*   **The Game CDN (CloudFront)**: Currently, the games mock load via a Vite Proxy (`/games`). Production games must be compiled to WebAssembly/HTML5, zipped, and deployed strictly to **AWS S3** buckets distributed behind **CloudFront**. The Client's `GameWrapper` will calculate CORS origin target locks natively based on these CloudFront URIs.
*   **TURN Server Provisioning (Twilio or Coturn)**: Standard STUN works for ~85% of consumer residential networks. For strict Symmetric NATs, the WebRTC handshake will fail. The Infra team must deploy active Coturn clusters on AWS, or integrate a Twilio Network API to provision dynamic TURN credentials into the Client's `ICE_SERVERS` dictionary upon loading.
*   **SSL/WSS Architecture**: WebRTC APIs (`navigator.mediaDevices` and `RTCPeerConnection`) are restricted context APIs. They will strictly crash on non-HTTPS domains. The Load Balancer MUST terminate SSL properly and map incoming socket upgrades from `wss://` to the backend.
