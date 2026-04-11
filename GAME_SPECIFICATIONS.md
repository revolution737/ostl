# Game Integration Specifications

Welcome to the OSTL Multiplayer Gaming Platform! This guide outlines the technical specifications and architectural requirements for developing and publishing games on our network. 

Our platform handles matchmaking, WebRTC bridging, and peer-to-peer connection management. As a developer, your game only needs to focus on managing state and communicating with the parent browser window via standard HTML5 `postMessage`.

## 1. Packaging & File Structure

To be successfully ingested by our platform, your game payload must meet the following structural guidelines:

- **Format**: Must be provided as a compressed `.zip` archive.
- **Maximum File Size**: 50 MB.
- **Root Document**: The archive **must contain an `index.html` file**. This can either be at the absolute root of the zip file or inside a single top-level directory wrapper.
- **Asset References**: All game assets (images, sounds, scripts, CSS) must use relative paths in your HTML (e.g., `<script src="./game.js"></script>`). Absolute paths or external unapproved CDNs may fail to load due to platform sandbox restrictions.
- **Security Check**: ZIP files containing path traversal attempts (`..`) will be rejected by our automated parser.

When uploading via the publisher API, you will also need to provide:
- **Title**: Required string (will be slugified automatically).
- **Description**: Optional text describing your game.
- **Thumbnail URL**: Optional image URL to be displayed on the platform hub.

## 2. Platform Architecture (Iframe Sandbox)

Your game runs entirely within an isolated `<iframe>` on the client application securely hosted on Supabase Storage Edge network. You interact with the platform natively over cross-document messaging API.

- **Sandbox Environment**: Your iframe is sandboxed but configured with `allow-scripts allow-same-origin allow-forms allow-popups`.
- **Responsive Layout**: Your `index.html` must be capable of resizing to `100vw` by `100vh`. The platform provides a full-viewport container, so adapt your layout via CSS or handle `window.addEventListener('resize', ...)` appropriately.
- **CSS Pre-requisites**: Strip out browser defaults such as `body { margin: 0; padding: 0; overflow: hidden; }` to prevent double scrollbars.

## 3. Multiplayer Communication Protocol

Our platform seamlessly routes your game's data to the opponent via a low-latency WebRTC data channel. You do not need to integrate any WebRTC or WebSocket libraries in your game. Instead, follow this simple Handshake & Sync sequence:

### A. Handshake Sequence

1. **Signal Ready**: When your game finishes loading its assets and is ready to play, send a `READY` action to the parent window.
```javascript
window.parent.postMessage(JSON.stringify({ type: 'READY' }), '*');
```

2. **Wait for Start**: The platform will reply with a `START` payload once the remote peer is connected and matched. Wait for this message before proceeding to gameplay logic.
```javascript
window.addEventListener('message', (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'START') {
    // The match has begun!
    const isHost = data.isHost; 
    // isHost (boolean): Useful for authoritative logic (spawning items, AI enemies, etc.)
  }
});
```

> **Note on `isHost`**: In every match, one peer is guaranteed strictly designated as `isHost: true`, and the other is `isHost: false`. Rely on this variable to prevent race conditions or duplicate game events.

### B. In-Game State Sync (Outbound Relay)

Whenever the local player performs an action (e.g., moving, shooting, scoring), format the action as a dictionary/object assigning a standard `type` value, stringify it, and emit it to the parent window.
```javascript
function emitLocalMove(x, y) {
  const payload = {
    type: 'MOVE',
    x: x,
    y: y
  };
  // Only execute if not top-level
  if (window.parent !== window) {
    window.parent.postMessage(JSON.stringify(payload), '*');
  }
}
```
*Any payload containing a `type` property (excluding `type: 'READY'`) will immediately be broadcast over WebRTC to your remote opponent.*

### C. In-Game State Sync (Inbound Relay)

You will receive actions performed by your opponent natively as `message` events dispatched to your `window`. Filter these by the payload's `type` field and update your local opponent coordinates/states accordingly.

```javascript
window.addEventListener('message', (event) => {
  try {
    const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
    
    switch (data.type) {
      case 'MOVE':
        // Update opponent character to data.x, data.y
        updateOpponentPosition(data.x, data.y);
        break;
      case 'SHOOT':
        // Trigger opponent firing mechanism
        break;
      // ... handle other custom events
    }
  } catch (e) {
    // Ignore non-JSON or unrelated messages (like injected DevTools/Hot-Reload pings)
  }
});
```

## 4. Minimum Working Example (Boilerplate)

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Integration Boilerplate</title>
    <style> body { margin: 0; overflow: hidden; background: #000; color: #fff; } </style>
</head>
<body>
    <h1>Waiting for Opponent...</h1>
    
    <script>
        let isHost = false;

        // 1. Tell platform we are ready
        window.parent.postMessage(JSON.stringify({ type: 'READY' }), '*');

        // 2. Listen for platform inbound messages & opponent relay
        window.addEventListener('message', (event) => {
            try {
                const data = JSON.parse(event.data);
                
                // Handshake Start Event
                if (data.type === 'START') {
                    isHost = data.isHost;
                    document.querySelector('h1').innerText = isHost ? "Match Started [HOST]" : "Match Started [GUEST]";
                    startGameLoop();
                }

                // Opponent Action Relay
                if (data.type === 'PLAYER_JUMP') {
                    console.log('Opponent Jumped at height:', data.height);
                }
            } catch(e) {}
        });

        function startGameLoop() {
            // Emitting our action
            document.addEventListener('click', () => {
                const payload = { type: 'PLAYER_JUMP', height: 100 };
                window.parent.postMessage(JSON.stringify(payload), '*');
            });
        }
    </script>
</body>
</html>
```

Welcome aboard, and happy hacking!
