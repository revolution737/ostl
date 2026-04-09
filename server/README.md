# ostl. Platform Lead — Technical Architecture

This document outlines the infrastructure, data pipelines, and engine bridges built for the ostl. platform.

## 🚀 Accomplishments

### 1. Publisher API (`/api/publish`)
Built a standard REST endpoint that allows game developers to upload their game engines (Godot, Unity WebGL, etc.) as `.zip` files.
- **Validation**: Automatically checks for `index.html` at the root and scans for security vulnerabilities (e.g., path traversal).
- **Extraction**: Files are extracted to the local server disk and served via static middleware.
- **Serving**: Games are dynamically available at `/games/[slug]/index.html`.

### 2. Database & Match Analytics
Implemented a PostgreSQL foundation to track the life of every game and match.
- **Catalog**: Stores game metadata, player limits, and thumbnail URLs.
- **Match History**: Logs every completed match, including roomId, players, duration, and winner.
- **Logging Pipeline**: Integrated a background logger that triggers whenever a Socket.IO room is closed.

### 3. Godot Engine Bridge
Created a standard GDScript `JavaScriptBridge` template (`ostl_bridge.gd`).
- **P2P Relay**: Allows the game to send custom data (movement, scoring) to the React wrapper without knowing anything about WebRTC.
- **Event Signals**: Simplifies receiving opponent data through a unified `data_received` signal.

---

## 🏗 Storage (Supabase)

We have transitioned the platform to **Supabase Storage** for hosting game assets.
- **Bucket**: `game-assets` (Public)
- **Pipeline**: When a game is published, the backend extracts the ZIP locally, syncs the files to Supabase, and stores the public URL in the database.

---

## 🛠 Running the Backend

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Supabase Setup**:
   - Create a project on [supabase.com](https://supabase.com).
   - Create a **Public Bucket** named `game-assets`.
   - Add your credentials to your `.env` file (`DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`).

3. **Database**:
   - Run `server/db/schema.sql` in the Supabase **SQL Editor**.

4. **Dev Mode**:
   ```bash
   npm run dev
   ```

---

## 🛰️ STUN/TURN Deployment (COTURN)

To ensure users behind strict firewalls can still play, you must deploy a TURN server.

### 1. Installation (Ubuntu/Linux)
```bash
sudo apt update && sudo apt install coturn -y
```

### 2. Basic Configuration (`/etc/turnserver.conf`)
- **listening-port**: 3478
- **fingerprint**: Enabled
- **lt-cred-mech**: Enabled
- **static-auth-secret**: [Generated Random Hex]
- **realm**: yourdomain.com

### 3. Client Integration
In the React Frontend WebRTC config, add:
```javascript
{
  urls: 'turn:yourdomain.com:3478',
  username: 'ostl_user',
  credential: 'DYNAMIC_GENERATED_CREDENTIAL'
}
```
