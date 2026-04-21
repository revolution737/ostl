<div align="center">
  <img src="https://via.placeholder.com/150x150/1e293b/4f46e5?text=OSTL" alt="OSTL Logo" width="150" height="150" style="border-radius: 20px" />
  <br/>
  <h1>Omni Session Trivial Link (OSTL)</h1>
  <p><strong>A Next-Generation Decentralized P2P Web Gaming Platform</strong></p>
</div>

<br/>

## 📖 Overview

**OSTL** is a highly ambitious platform designed bridging web-based game engines with pure, native **WebRTC peer-to-peer telemetry**. Historically, multiplayer games required developers to host and maintain highly expensive WebSockets/UDP servers. 

OSTL solves this by letting developers securely package and upload **fully offline `index.html` games**, which the platform natively injects into an isolated `iframe` sandbox. Then, our React-driven architecture wraps that Sandbox in a high-speed HTTP/WebRTC pipeline, allowing entirely separate computers to connect globally, perfectly synchronizing their game loops directly through their browsers—zero game servers required!

---

## 🏗️ Core Architecture Overview

Below is the deep-dive analysis of the complex machinery that drives the platform.

### 1. The Developer Side (Game Uploading & Hosting)
OSTL embraces a proprietary "Bring Your Own Engine" philosophy. Developers do not write complex networking code. Instead:
- Developers wrap their local game project into a simple `.zip` file containing an `index.html`.
- Authenticated via **Supabase**, they upload their `.zip` file through the Developer Dashboard.
- OSTL unzips this on the cloud infrastructure and provisions a dedicated **Supabase Storage Bucket** routing path for it, appending it instantly to the global Game Catalog database utilizing `PostgreSQL`.

#### Dashboard Telemetry
As players discover and play the uploaded games, the `match_history` table organically tracks every session. The Developer Analytics Dashboard parses this database utilizing mathematical SQL groupings natively returning dynamically interactive **Player Growth**, **Unique Entrants**, and **Average Session Duration KPIs**.

---

### 2. Matchmaking & WebRTC Signaling
The absolute trickiest part of Peer-to-Peer infrastructure is finding the "Peer". If players want to join a specific web-game, OSTL employs an Express `Socket.io` Node.js server strictly for **Signaling**. 

When two players click "Play" on *Galactic Pong*:
1. **The Handshake:** Player A requests a match from the Node Server. Player B requests the same. 
2. **Room Creation:** The Node Server links them together into a `Socket.IO Room`, dynamically assigning Player A as the `Host` and Player B as the `Guest`. 
3. **ICE Negotiation:** Behind the scenes, Player A generates an SDPOffer (a mathematical string detailing their internal IP routing configurations). This String is physically routed through the Socket server to Player B. Player B answers with an SDPAnswer. Both computers trade ICE Candidates through the `TURN/STUN` servers.
4. **P2P Ignition:** Once the browsers map a physical route to one another, the WebRTC `RTCDataChannel` forcefully latches. The connection is forged. **From this moment onwards, all game inputs completely bypass the OSTL server and travel at light-speed directly between the two physical computers.**

---

### 3. The Isolated Game Iframe 
Rather than hardcoding every single game directly into React, OSTL acts as an operating system. When the WebRTC connection ignites, the React `<GameWrapper />` component dynamically injects an automated `<iframe>` downloading the specific developer's game assets from the Supabase bucket.

#### The `postMessage()` Sandbox
How does a separate random game communicate with OSTL's WebRTC network? 
**Through a custom `window.postMessage` bridge!**

- **Outbound Relay:** When Player A shoots a laser in the iframe, the iframe triggers `window.parent.postMessage({ action: "FIRE" })`. Our React `<GameWrapper />` natively intercepts this array buffer and instantly blasts it down the WebRTC data tunnel to Player B.
- **Inbound Relay:** Player B's browser receives the packet natively over WebRTC. The `<GameWrapper />` catches it, and instantly injects it **down** into Player B's iframe via `iframe.contentWindow.postMessage()`. Thus, Player B's screen visually renders the laser perfectly in-sync.

*Developers only have to write two lines of code—sending and listening to postMessages. OSTL handles literally the entire networking stack invisibly underneath.*

---

### 4. Global 90-Second Disconnection Recovery (State Hydration)
What happens if Player A's browser crashes mid-game? Peer-to-peer games usually spectacularly crash. **Not OSTL.**

OSTL possesses one of the most advanced web-recovery architectures:
- **Disconnection Trap:** If Player A drops, the backend server detects the socket closure and instantly starts a strict `90,000ms` (90 Seconds) Grace Timer.
- **The Engine Pause:** Player B's React wrapper detects the opponent lost signal and physically blasts a `{ type: "PAUSE_GAME" }` message down into the `iframe`. It then overlays a massive visual UI obscuring Player B's screen preventing them from playing unfair moves while Player A is gone.
- **LocalStorage State Hydration:** When Player A first joins any match, their browser secretly stores an encrypted JSON payload into `localStorage` representing their active game `RoomId` and IP routing profile.
- **The Perfect Resurrection:** If Player A restarts their computer and simply types in `omnisessiontriviallink.com`, the overarching `<MainApp />` component actively scans their `localStorage` immediately upon boot. Detecting the missing session, OSTL physically rips Player A directly back into the `/play` React router organically, forces a socket `rejoin` ping, and silently resynchronizes the WebRTC SDP channels mid-game! Player B's screen triggers `{ type: "RESUME_GAME" }`, and the battle flawlessly continues.

---

## 🛠️ Tech Stack & Technologies

1. **Frontend Core:** React, Vite, React Router DOM v6
2. **Styling & UI:** TailwindCSS, Framer Motion, Lucide Icons
3. **P2P Networking:** WebRTC API native channels, Simple-Peer implementation structures
4. **Signaling Server:** Node.js, Express, Socket.IO
5. **Database & Auth:** Supabase (PostgreSQL), Supreme Row Level Security
6. **Data Storage:** Supabase Edge Buckets (Game ZIP Extractions)
7. **Cloud Analytics:** Recharts charting engine parsing mathematical groupings

---

### Environment Setup (`.env` Config):

```env
# Client (.env)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
VITE_API_URL=http://localhost:3000

# Server (.env)
PORT=3000
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role
```
