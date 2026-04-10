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
  setOnGameData
}) {
  const iframeRef = useRef(null);

  // --- A. HANDSHAKE (Platform -> Engine) ---
  // When connected, keep sending START until the game acknowledges via READY
  useEffect(() => {
    if (status !== 'connected' || !iframeRef.current || isReconnecting) return;

    const startSignal = JSON.stringify({ type: 'START', isHost: !!isHost });

    // Send immediately and then every second until game responds
    const send = () => {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.postMessage(startSignal, '*');
      }
    };
    send();
    const iv = setInterval(send, 1000);

    // Stop after 10 seconds — if it hasn't worked by then, something else is wrong
    const timeout = setTimeout(() => clearInterval(iv), 10000);

    return () => { clearInterval(iv); clearTimeout(timeout); };
  }, [status, isHost, isReconnecting]);

  // --- B. OUTBOUND RELAY (Game Iframe -> WebRTC to Opponent) ---
  useEffect(() => {
    const handleIframeMessage = (event) => {
      let data = event.data;
      if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch (e) { return; }
      }
      if (!data || !data.type) return;

      // If the game says READY, respond with START
      if (data.type === 'READY') {
        if (status === 'connected' && iframeRef.current && iframeRef.current.contentWindow) {
          iframeRef.current.contentWindow.postMessage(
            JSON.stringify({ type: 'START', isHost: !!isHost }), '*'
          );
        }
        return;
      }

      // Relay all game messages to the opponent via WebRTC
      if (status === 'connected' && !isReconnecting) {
        sendMessage(JSON.stringify(data));
      }
    };

    window.addEventListener('message', handleIframeMessage);
    return () => window.removeEventListener('message', handleIframeMessage);
  }, [status, sendMessage, isReconnecting, isHost]);

  // --- C. INBOUND RELAY (WebRTC from Opponent -> Game Iframe) ---
  // This uses a DIRECT CALLBACK from the WebRTC data channel,
  // completely bypassing React state batching.
  // This is the fix for the "moves not showing up" bug.
  useEffect(() => {
    if (!setOnGameData) return;

    setOnGameData((rawPayload) => {
      if (!iframeRef.current || !iframeRef.current.contentWindow) return;
      // rawPayload is a JSON string — forward directly to the game iframe
      iframeRef.current.contentWindow.postMessage(rawPayload, '*');
    });

    return () => setOnGameData(null);
  }, [setOnGameData]);

  return (
    <div className="flex flex-col flex-1 h-full w-full bg-slate-900 overflow-hidden relative border-r border-slate-800 shadow-2xl">
      {/* Header & Status Bar */}
      <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-center bg-gradient-to-b from-slate-950/90 to-transparent z-10 pointer-events-none">

        <div className="pointer-events-auto flex items-center gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700 backdrop-blur text-slate-300 text-xs font-semibold shadow-black/50">
            <span className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.9)] animate-pulse' : 'bg-amber-500 animate-pulse'}`}></span>
            P2P Link: {status.toUpperCase()}
          </div>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10px] font-mono tracking-widest uppercase backdrop-blur">
            <MonitorPlay size={12} />
            {isHost ? 'Host Data' : 'Guest Data'}
          </div>
        </div>

        <button
          onClick={onDisconnect}
          className="pointer-events-auto flex items-center gap-2 text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30 px-4 py-2 rounded-full transition-all shadow-lg hover:shadow-rose-500/20"
        >
          <LogOut size={14} /> Leave Match
        </button>
      </div>

      {/* Embedded Iframe Container */}
      <div className="flex-1 w-full relative bg-slate-950">
        {status !== 'connected' && !isReconnecting && (
          <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center z-20 backdrop-blur-md">
            <div className="w-12 h-12 border-4 border-indigo-500 border-b-transparent rounded-full animate-spin mb-4 shadow-[0_0_15px_rgba(99,102,241,0.5)]"></div>
            <div className="text-slate-200 font-bold uppercase tracking-widest text-sm mb-1">Authenticating Payload</div>
            <div className="text-slate-500 text-[10px] font-mono tracking-widest uppercase">Waiting for Engine Pipe...</div>
          </div>
        )}
        <iframe
          ref={iframeRef}
          src={gamePath}
          className={`w-full h-full border-0 focus:outline-none transition-opacity duration-300 ${isReconnecting ? 'opacity-20 blur-sm pointer-events-none' : 'opacity-100'}`}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          title="Sandbox Engine"
        />
      </div>
    </div>
  );
}
