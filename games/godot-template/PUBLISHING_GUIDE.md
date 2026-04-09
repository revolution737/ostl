# Publishing Games to ostl.

## Overview

ostl. runs your game inside a sandboxed `<iframe>`. Your game communicates with the platform through `window.postMessage`. The platform handles all networking (matchmaking, WebRTC peer-to-peer connections) — your game just needs to send and receive JSON messages.

```
┌──────────────────────────────────────────────────────────┐
│                    Browser Window                         │
│  ┌─────────────────────┐   WebRTC    ┌────────────────┐  │
│  │  React Wrapper       │◄──────────►│  Opponent's    │  │
│  │  (handles networking)│            │  Browser       │  │
│  │  ┌────────────────┐  │            └────────────────┘  │
│  │  │ <iframe>       │  │                                │
│  │  │  YOUR GAME     │  │  ◄── postMessage bridge        │
│  │  │  (Godot WASM)  │  │                                │
│  │  └────────────────┘  │                                │
│  └─────────────────────┘                                 │
└──────────────────────────────────────────────────────────┘
```

---

## Step 1: Export from Godot

1. Open your Godot 4.x project
2. Go to **Project → Export → Add → Web**
3. Export settings:
   - **Export Type:** `HTML5`
   - **HTML Shell:** use the default (or a custom one)
   - **Threads:** `Disabled` (for maximum browser compatibility)
   - **VRAM Texture Compression:** enable both `For Desktop` and `For Mobile`
4. Export the project — you'll get a folder with:
   ```
   your-game/
   ├── index.html        ← REQUIRED (entry point)
   ├── your-game.js
   ├── your-game.wasm
   ├── your-game.pck
   └── your-game.png     (favicon, optional)
   ```

---

## Step 2: Add the Bridge Script

Copy `ostl_bridge.gd` into your project and register it as an **AutoLoad**:

1. Copy `ostl_bridge.gd` to your project's `scripts/` folder
2. Go to **Project → Project Settings → Autoload**
3. Add the script with the name `OstlBridge`

---

## Step 3: Send Data to Opponent

When your local player does something (moves, shoots, scores), send it:

```gdscript
# Send player position
func _physics_process(delta):
    # ... your movement code ...
    OstlBridge.send_move(player.position.x, player.position.y)

# Send any custom event
func on_player_scored():
    OstlBridge.send_event("SCORE", { "player": 1, "points": 10 })
```

---

## Step 4: Receive Opponent Data

Connect to the bridge signal to handle incoming opponent actions:

```gdscript
func _ready():
    OstlBridge.data_received.connect(_on_opponent_data)

func _on_opponent_data(data: Dictionary):
    match data.get("type", ""):
        "MOVE":
            opponent_sprite.position = Vector2(data.x, data.y)
        "SCORE":
            update_scoreboard(data.player, data.points)
```

---

## Step 5: Package & Upload

1. **ZIP your export folder** (the folder containing `index.html` and all assets):
   ```bash
   cd your-game-export/
   zip -r my-game.zip .
   ```

2. **Upload via the API** (or the creator portal when available):
   ```bash
   curl -X POST http://localhost:3000/api/publish \
     -F "gameZip=@my-game.zip" \
     -F "title=My Awesome Game" \
     -F "description=A fast-paced 1v1 battle game" \
     -F "thumbnail_url=https://example.com/thumb.png"
   ```

3. Your game is now live at: `http://localhost:3000/games/my-awesome-game/index.html`

---

## Message Protocol

All messages are JSON strings sent via `postMessage`. The platform expects this format:

### Movement (most common)
```json
{ "type": "MOVE", "x": 150.5, "y": 300.2 }
```

### Custom Events
```json
{ "type": "YOUR_EVENT_NAME", "key": "value", ... }
```

### Reserved Types (used by the platform)
These are handled by the React wrapper — your game should NOT use them:
- `SYS_CHAT` — text chat messages
- `SYS_CHAT_STATUS` — chat enable/disable toggle

---

## Important Rules

1. **`index.html` must be at the root** of your ZIP — not nested in a subfolder
2. **No external network requests** — all game assets must be bundled. The platform handles networking.
3. **Keep it lightweight** — ZIP files must be under **50MB**
4. **Test standalone first** — your game should work locally in a browser before uploading
5. **Disable threads in Godot export** — `SharedArrayBuffer` requires special headers that may not be configured

---

## Testing Without the Platform

You can test your bridge locally by simulating the parent window messages:

```html
<!-- test-harness.html — put next to your export -->
<iframe id="game" src="index.html" width="800" height="600"></iframe>
<script>
  const iframe = document.getElementById('game');
  
  // Simulate receiving opponent data
  setInterval(() => {
    iframe.contentWindow.postMessage(JSON.stringify({
      type: 'MOVE',
      x: Math.random() * 800,
      y: Math.random() * 600
    }), '*');
  }, 100);
  
  // Listen for data your game sends
  window.addEventListener('message', (e) => {
    console.log('Game sent:', e.data);
  });
</script>
```
