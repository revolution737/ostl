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
  const iframeRef  = useRef(null);
  const overlayRef = useRef(null);

  // --- A. HANDSHAKE (Platform -> Engine) ---
  // When connected, keep sending START until the game acknowledges via READY
  useEffect(() => {
    if (status !== 'connected' || !iframeRef.current || isReconnecting) return;

    const startSignal = JSON.stringify({ type: 'START', isHost: !!isHost });

    const send = () => {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.postMessage(startSignal, '*');
      }
    };
    send();
    const iv = setInterval(send, 1000);
    const timeout = setTimeout(() => clearInterval(iv), 10000);

    return () => { clearInterval(iv); clearTimeout(timeout); };
  }, [status, isHost, isReconnecting]);

  // --- DYNAMIC ENGINE PAUSING ---
  // Fires lifecycle events natively to the game engines telling them to stall internal mechanics
  useEffect(() => {
    if (!iframeRef.current || !iframeRef.current.contentWindow) return;
    
    if (isReconnecting === true) {
      iframeRef.current.contentWindow.postMessage(JSON.stringify({ type: 'PAUSE_GAME' }), '*');
    } else if (isReconnecting === false) {
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

      // If the game says READY, respond with START
      if (data.type === 'READY') {
        if (status === 'connected' && iframeRef.current && iframeRef.current.contentWindow) {
          iframeRef.current.contentWindow.postMessage(
            JSON.stringify({ type: 'START', isHost: !!isHost }), '*'
          );
        }
        return;
      }

      // If the game emits a GAME_OVER status, relay to platform UI
      if (data.type === 'GAME_OVER') {
        if (onGameOver) onGameOver(data);
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
  useEffect(() => {
    if (!setOnGameData) return;

    setOnGameData((rawPayload) => {
      if (!iframeRef.current || !iframeRef.current.contentWindow) return;
      // rawPayload is a JSON string — forward directly to the game iframe
      iframeRef.current.contentWindow.postMessage(rawPayload, '*');
    });

    return () => setOnGameData(null);
  }, [setOnGameData]);

  // --- D. TOUCH → MOUSE BRIDGE (mobile only) ---
  // A transparent overlay div sits on top of the iframe on mobile screens.
  // It captures all touch events and translates them into synthetic MouseEvents
  // dispatched directly into the iframe's document, making desktop-only
  // HTML5 game engines fully playable with finger taps and drags.
  // Long-press (500ms) fires a right-click / contextmenu for rotate mechanics.
  useEffect(() => {
    const overlay = overlayRef.current;
    const iframe  = iframeRef.current;
    if (!overlay || !iframe) return;

    let longPressTimer = null;

    const getIframeDoc = () => {
      try { return iframe.contentDocument || iframe.contentWindow?.document; }
      catch (e) { return null; }
    };

    // Convert a Touch's page coordinates to iframe-local coordinates
    const iframePoint = (touch) => {
      const rect = iframe.getBoundingClientRect();
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    };

    // Dispatch a synthetic MouseEvent at the element underneath the finger
    const fire = (type, touch, button = 0) => {
      const doc = getIframeDoc();
      if (!doc) return;
      const { x, y } = iframePoint(touch);
      const el = doc.elementFromPoint(x, y) || doc.body;
      el.dispatchEvent(new MouseEvent(type, {
        bubbles: true, cancelable: true,
        view: iframe.contentWindow,
        clientX: x, clientY: y,
        screenX: touch.screenX, screenY: touch.screenY,
        button,
        buttons: (type === 'mouseup' || type === 'click') ? 0
               : button === 2 ? 2 : 1,
      }));
    };

    const onTouchStart = (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      fire('mousemove', touch);
      fire('mousedown', touch);

      // Long-press (500ms) → right-click / contextmenu
      longPressTimer = setTimeout(() => {
        fire('mouseup',     touch);
        fire('contextmenu', touch, 2);
      }, 500);
    };

    const onTouchMove = (e) => {
      e.preventDefault();
      clearTimeout(longPressTimer);
      fire('mousemove', e.touches[0]);
    };

    const onTouchEnd = (e) => {
      e.preventDefault();
      clearTimeout(longPressTimer);
      const touch = e.changedTouches[0];
      fire('mouseup', touch);
      fire('click',   touch);
    };

    overlay.addEventListener('touchstart', onTouchStart, { passive: false });
    overlay.addEventListener('touchmove',  onTouchMove,  { passive: false });
    overlay.addEventListener('touchend',   onTouchEnd,   { passive: false });

    return () => {
      clearTimeout(longPressTimer);
      overlay.removeEventListener('touchstart', onTouchStart);
      overlay.removeEventListener('touchmove',  onTouchMove);
      overlay.removeEventListener('touchend',   onTouchEnd);
    };
  }, [gameKey]); // re-attach when iframe remounts on new game / rematch

  return (
    <div className="flex flex-col flex-1 h-full w-full bg-slate-900 overflow-hidden relative border-r border-slate-800 shadow-2xl">
      {/* Header & Status Bar */}
      <div className="absolute top-0 left-0 w-full px-3 py-2 md:p-4 flex justify-between items-center bg-gradient-to-b from-slate-950/90 to-transparent z-10 pointer-events-none">

        <div className="pointer-events-auto flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-2 py-1 md:px-3 md:py-1.5 rounded-full bg-slate-800/80 border border-slate-700 backdrop-blur text-slate-300 text-[10px] md:text-xs font-semibold shadow-black/50">
            <span className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full flex-shrink-0 ${status === 'connected' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.9)] animate-pulse' : 'bg-amber-500 animate-pulse'}`}></span>
            <span className="hidden xs:inline">P2P: </span>{status.toUpperCase()}
          </div>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10px] font-mono tracking-widest uppercase backdrop-blur">
            <MonitorPlay size={12} />
            {isHost ? 'Host' : 'Guest'}
          </div>
        </div>

        <button
          onClick={onDisconnect}
          className="pointer-events-auto flex items-center gap-1.5 text-[10px] md:text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30 px-3 py-1.5 md:px-4 md:py-2 rounded-full transition-all shadow-lg hover:shadow-rose-500/20"
        >
          <LogOut size={12} /> <span className="hidden sm:inline">Leave Match</span><span className="sm:hidden">Leave</span>
        </button>
      </div>

      {/* Embedded Iframe Container */}
      <div className="flex-1 w-full relative bg-slate-950 overflow-hidden">
        {status !== 'connected' && !isReconnecting && (
          <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center z-20 backdrop-blur-md">
            <div className="w-10 h-10 md:w-12 md:h-12 border-4 border-indigo-500 border-b-transparent rounded-full animate-spin mb-4 shadow-[0_0_15px_rgba(99,102,241,0.5)]"></div>
            <div className="text-slate-200 font-bold uppercase tracking-widest text-xs md:text-sm mb-1">Authenticating Payload</div>
            <div className="text-slate-500 text-[10px] font-mono tracking-widest uppercase">Waiting for Engine Pipe...</div>
          </div>
        )}

        <iframe
          key={gameKey}
          ref={iframeRef}
          src={gamePath}
          className={`w-full h-full border-0 focus:outline-none transition-opacity duration-300 ${isReconnecting ? 'opacity-20 blur-sm pointer-events-none' : 'opacity-100'}`}
          style={{ display: 'block' }}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          title="Sandbox Engine"
          allow="fullscreen"
        />

        {/* Touch bridge overlay — mobile only (hidden on md+).
            Sits above the iframe, captures touch events, translates to
            synthetic mouse events dispatched into the iframe's document. */}
        <div
          ref={overlayRef}
          className={`absolute inset-0 md:hidden ${isReconnecting ? 'pointer-events-none' : ''}`}
          style={{ touchAction: 'none', zIndex: 5 }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
