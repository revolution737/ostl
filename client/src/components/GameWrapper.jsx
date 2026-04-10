import { useEffect, useRef, useState } from 'react';
import { LogOut, MonitorPlay } from 'lucide-react';

export function GameWrapper({ 
  roomId, 
  isHost, 
  gamePath, 
  onDisconnect, 
  // WebRTC Injections from Parent (GamePage handles the AV streams)
  status, 
  messages, 
  sendMessage, 
  isReconnecting 
}) {
  const iframeRef = useRef(null);
  const [targetOrigin, setTargetOrigin] = useState('*');

  // Compute secure target origin from the provided game path for production readiness
  useEffect(() => {
    try {
      const url = new URL(gamePath, window.location.origin);
      setTargetOrigin(url.origin);
    } catch (e) {
      console.warn("Invalid gamePath format, falling back to window.location.origin");
      setTargetOrigin(window.location.origin);
    }
  }, [gamePath]);

  // --- A. HANDSHAKE (Platform -> Engine) ---
  useEffect(() => {
    if (status === 'connected' && iframeRef.current && !isReconnecting) {
      const startSignal = { type: 'START', isHost: !!isHost };
      setTimeout(() => {
        if (iframeRef.current) {
          iframeRef.current.contentWindow.postMessage(JSON.stringify(startSignal), targetOrigin);
        }
      }, 500); // Give iframe a moment to settle
    }
  }, [status, isHost, targetOrigin, isReconnecting]);

  // --- B. OUTBOUND RELAY (Iframe -> WebRTC) ---
  useEffect(() => {
    const handleIframeMessage = (event) => {
      if (typeof event.data === 'string') {
        try {
          const parsed = JSON.parse(event.data);
          
          if (parsed.type === 'READY' && status === 'connected') {
            iframeRef.current.contentWindow.postMessage(JSON.stringify({ type: 'START', isHost: !!isHost }), targetOrigin);
            return;
          }

          if (status === 'connected' && !isReconnecting) {
            sendMessage(JSON.stringify(parsed));
          }
        } catch (error) {}
      }
    };

    window.addEventListener('message', handleIframeMessage);
    return () => window.removeEventListener('message', handleIframeMessage);
  }, [status, sendMessage, isReconnecting, isHost, targetOrigin]);

  // --- B. INBOUND RELAY (WebRTC -> Iframe) ---
  useEffect(() => {
    if (!iframeRef.current || messages.length === 0 || isReconnecting) return;

    const latestMessage = messages[messages.length - 1];

    if (latestMessage.sender === 'opponent') {
      try {
        // Enforce JSON parity internally before pushing to engine
        JSON.parse(latestMessage.data);
        iframeRef.current.contentWindow.postMessage(latestMessage.data, targetOrigin);
      } catch (e) {
        console.warn("Discarded invalid JSON inbound payload from WebRTC.", latestMessage.data);
      }
    }
  }, [messages, isReconnecting, targetOrigin]);

  return (
    <div className="flex flex-col flex-1 h-full w-full bg-slate-900 overflow-hidden relative border-r border-slate-800 shadow-2xl">
      {/* Sleek Header & Status Bar */}
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
          sandbox="allow-scripts allow-same-origin"
          title="Sandbox Engine"
        />
      </div>
    </div>
  );
}
