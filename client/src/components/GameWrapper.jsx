import { useEffect, useRef } from 'react';
import { LogOut, MonitorPlay } from 'lucide-react';

export function GameWrapper({
  roomId,
  isHost,
  gamePath,
  onDisconnect,
  status,
  messages,
  sendMessage,
  isReconnecting,
  setOnGameData,
  gameKey,
  onGameOver
}) {
  const iframeRef    = useRef(null);
  // --- A. HANDSHAKE (Platform -> Engine) ---
  // The Game Engines natively blast their own `READY` telemetry pulses on a 1000ms loop infinitely until they successfully ingest the `START` configuration payload. We defer completely to their pulse loops instead of aggressively polling blindly into uninitialized iframes.

  // --- DYNAMIC ENGINE PAUSING ---
  // Fires lifecycle events natively to the game engines telling them to stall internal mechanics
  useEffect(() => {
    if (!iframeRef.current || !iframeRef.current.contentWindow) return;
    
    if (isReconnecting === "reconnecting") {
      iframeRef.current.contentWindow.postMessage(JSON.stringify({ type: 'PAUSE_GAME' }), '*');
    } else if (isReconnecting === "idle") {
      iframeRef.current.contentWindow.postMessage(JSON.stringify({ type: 'RESUME_GAME' }), '*');
    }
  }, [isReconnecting]);

  // --- B. OUTBOUND RELAY (Game Iframe -> WebRTC to Opponent) ---
  useEffect(() => {
    const handleIframeMessage = (event) => {
      let data = event.data;
      if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch (e) { return; }
      }
      if (!data || !data.type) return;

      // If the game says READY, actively reply directly to its pulse loop with START ruleset.
      if (data.type === 'READY') {
        if (status === 'connected' && iframeRef.current?.contentWindow) {
          iframeRef.current.contentWindow.postMessage(JSON.stringify({ type: 'START', isHost: !!isHost }), '*');
        }
        return;
      }

      // If the game emits a GAME_OVER status, relay to platform UI
      if (data.type === 'GAME_OVER') {
        if (onGameOver) onGameOver(data);
        return;
      }

      // Relay all game messages to the opponent via WebRTC
      if (status === 'connected' && isReconnecting === "idle") {
        sendMessage(JSON.stringify(data));
      }
    };

    window.addEventListener('message', handleIframeMessage);
    return () => window.removeEventListener('message', handleIframeMessage);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, sendMessage, isReconnecting, gameKey]);

  // --- C. INBOUND RELAY (WebRTC from Opponent -> Game Iframe) ---
  // This uses a DIRECT CALLBACK from the WebRTC data channel,
  // completely bypassing React state batching.
  useEffect(() => {
    if (!setOnGameData) return;

    setOnGameData((rawPayload) => {
      if (!iframeRef.current || !iframeRef.current.contentWindow) return;
      // rawPayload is a JSON string — forward directly to the game iframe
      iframeRef.current.contentWindow.postMessage(rawPayload, '*');
    });

    return () => setOnGameData(null);
  }, [setOnGameData]);

  // --- D. DEPRECATED TOUCH MOUSE BRIDGE ---
  // The synthetic DOM MouseEvent proxy pipeline was completely removed as it mathematically breaks down against strictly enforced CORS security layers during web deployments of foreign `<iframe />` source paths. 
  // Mobile Touch tracking has instead been naturally delegated to directly trigger on standard `touchstart/touchmove/touchend` listeners inside the proprietary Game Engines natively.

  return (
    <div className="flex flex-col flex-1 h-full w-full bg-slate-900 overflow-hidden relative border-r border-slate-800 shadow-2xl">
      {/* Embedded Iframe Container */}
      <div className="flex-1 w-full relative bg-slate-950 overflow-hidden">
        {status !== 'connected' && isReconnecting === "idle" && (
          <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center z-20 backdrop-blur-md">
            {status === 'failed' ? (
              <>
                <div className="w-10 h-10 md:w-12 md:h-12 border-4 border-red-500 rounded-full mb-4 shadow-[0_0_15px_rgba(239,68,68,0.5)] flex items-center justify-center text-red-500 font-bold">X</div>
                <div className="text-red-400 font-bold uppercase tracking-widest text-xs md:text-sm mb-1">NAT Traversal Failed</div>
                <div className="text-red-500 text-[10px] font-mono tracking-widest uppercase">Strict Firewall/Mobile Network block</div>
              </>
            ) : (
              <>
                <div className="w-10 h-10 md:w-12 md:h-12 border-4 border-indigo-500 border-b-transparent rounded-full animate-spin mb-4 shadow-[0_0_15px_rgba(99,102,241,0.5)]"></div>
                <div className="text-slate-200 font-bold uppercase tracking-widest text-xs md:text-sm mb-1">Authenticating Payload</div>
                <div className="text-slate-500 text-[10px] font-mono tracking-widest uppercase">Waiting for Engine Pipe...</div>
              </>
            )}
          </div>
        )}

        <iframe
          key={gameKey}
          ref={iframeRef}
          src={gamePath}
          className={`w-full h-full border-0 focus:outline-none transition-opacity duration-300 ${isReconnecting !== "idle" ? 'opacity-20 blur-sm pointer-events-none' : 'opacity-100'}`}
          style={{ display: 'block' }}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          title="Sandbox Engine"
          allow="fullscreen"
        />

      </div>
    </div>
  );
}
