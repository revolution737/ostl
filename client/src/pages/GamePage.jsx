import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useWebRTC } from '../hooks/useWebRTC';
import { useSocket } from '../context/SocketProvider';
import { GameWrapper } from '../components/GameWrapper';
import { Send, LogOut, MessageSquareOff, RefreshCw, Home, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function GamePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { socket } = useSocket();
  
  // 1. Session Persistence & Hydration
  const [sessionContext, setSessionContext] = useState(() => {
    let context = location.state;
    if (context) {
      sessionStorage.setItem('ostl_match_state', JSON.stringify(context));
      return context;
    }
    const stored = sessionStorage.getItem('ostl_match_state');
    if (stored) {
      return JSON.parse(stored);
    }
    return null;
  });

  const roomId = sessionContext?.roomId || '';
  const isHost = sessionContext?.isHost || false;
  const playUrl = sessionContext?.playUrl || '';
  const opponentName = sessionContext?.opponentName || 'Opponent';
  const displayName = sessionContext?.displayName || 'Unknown Player';

  useEffect(() => {
    if (!sessionContext || !sessionContext.roomId) {
      navigate('/games');
    }
  }, [sessionContext, navigate]);

  // 2. State & Hooks
  const [chatInput, setChatInput] = useState('');
  const [chatEnabled, setChatEnabled] = useState(true);
  const [opponentChatDisabled, setOpponentChatDisabled] = useState(false);
  const scrollRef = useRef(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectKey, setReconnectKey] = useState(0);

  const { status, messages, sendMessage } = useWebRTC(socket, roomId, isHost, reconnectKey);

  // Lock Document Scrolling
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'auto'; };
  }, []);

  // 3. Graceful Reconnection Listeners
  useEffect(() => {
    if (!socket) return;
    
    socket.on('opponent_reconnecting', ({ opponentName }) => {
       console.warn(`[game] Opponent ${opponentName} disconnected. Reconnecting window opened...`);
       setIsReconnecting(true);
    });

    socket.on('opponent_rejoined', ({ opponentName }) => {
       console.log(`[game] Opponent ${opponentName} reconnected! Resuming match.`);
       setIsReconnecting(false);
       setReconnectKey(prev => prev + 1); // Triggers useWebRTC reboot to renegotiate connections flawlessly
    });

    socket.on('opponent_disconnected', () => {
       setIsReconnecting('failed');
    });

    return () => {
       socket.off('opponent_reconnecting');
       socket.off('opponent_rejoined');
       socket.off('opponent_disconnected');
    };
  }, [socket]);

  // Intercept incoming Data Channel events for UI actions
  useEffect(() => {
    let recent = messages[messages.length - 1];
    if (recent && recent.sender === 'opponent') {
       try {
         const d = JSON.parse(recent.data);
         if (d.type === 'SYS_CHAT_STATUS') {
           setOpponentChatDisabled(d.disabled);
         }
       } catch(e) {}
    }
  }, [messages]);

  const toggleChat = () => {
    const nextState = !chatEnabled;
    setChatEnabled(nextState);
    sendMessage(JSON.stringify({ type: 'SYS_CHAT_STATUS', disabled: !nextState }));
  };

  const leaveMatch = () => {
    socket.emit('match_ended', { roomId });
    sessionStorage.removeItem('ostl_match_state');
    navigate('/');
  };

  const handleChatSend = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !chatEnabled) return;
    
    sendMessage(JSON.stringify({ 
      type: 'SYS_CHAT', 
      author: displayName, 
      text: chatInput 
    }));
    setChatInput('');
  };

  const chatHistory = messages.filter(msg => {
    try {
      const parsed = JSON.parse(msg.data);
      return parsed.type === 'SYS_CHAT';
    } catch (e) {
      return false;
    }
  }).map(msg => ({
    id: msg.id,
    sender: msg.sender,
    data: JSON.parse(msg.data)
  }));

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const ChatBubble = ({ msg }) => {
    const isMe = msg.sender === 'me';
    return (
      <div className={`flex flex-col mb-4 ${isMe ? 'items-end' : 'items-start'}`}>
        <span className="text-[10px] text-slate-500 font-mono tracking-wider uppercase mb-1 px-1">
          {isMe ? 'You' : msg.data.author}
        </span>
        <div className={`px-4 py-2.5 rounded-2xl text-sm max-w-[85%] shadow-md ${
          isMe 
            ? 'bg-indigo-600/90 text-indigo-50 rounded-br-none border border-indigo-500/50' 
            : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700'
        }`}>
          {msg.data.text}
        </div>
      </div>
    );
  };

  if (!roomId) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex overflow-hidden font-sans">
      <AnimatePresence>
        {isReconnecting === true && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md"
          >
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl flex flex-col items-center max-w-sm w-full text-center">
               <RefreshCw size={48} className="text-amber-500 animate-spin mb-6" />
               <h2 className="text-xl font-bold text-white mb-2">Connection Lost</h2>
               <p className="text-slate-400 text-sm">{opponentName} disconnected...</p>
               <p className="text-slate-500 text-xs mt-4">Waiting 15 seconds for reconnection...</p>
            </div>
          </motion.div>
        )}
        
        {isReconnecting === 'failed' && (
           <motion.div 
             initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
             className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md"
           >
             <div className="bg-slate-900 border border-red-500/30 p-8 rounded-3xl shadow-2xl flex flex-col items-center max-w-md w-full text-center">
                <WifiOff size={48} className="text-red-500 mb-6" />
                <h2 className="text-2xl font-bold text-white mb-2">Opponent Abandoned Match</h2>
                <p className="text-slate-400 text-sm mb-8">The 15 second grace period expired. The match has been terminated.</p>
                
                <div className="flex gap-4 w-full">
                  <button onClick={() => { sessionStorage.removeItem('ostl_match_state'); navigate('/'); }} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors">
                    <Home size={18} /> Back To Home
                  </button>
                  <button onClick={() => { sessionStorage.removeItem('ostl_match_state'); navigate('/matchmaking', { state: { gameId: sessionContext?.gameId || 'dummy-game', displayName }}); }} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors">
                    <RefreshCw size={18} /> Play Again
                  </button>
                </div>
             </div>
           </motion.div>
        )}
      </AnimatePresence>

      <GameWrapper 
        roomId={roomId}
        isHost={isHost}
        gamePath={playUrl || `/games/${sessionContext?.gameId || 'dummy-game'}/index.html`}
        onDisconnect={leaveMatch}
        status={status}
        messages={messages}
        sendMessage={sendMessage}
        isReconnecting={isReconnecting}
      />


      {/* RIGHT COLUMN: EXPANDED CHAT HUB */}
      <div className="flex-[1] flex flex-col min-w-[320px] max-w-[400px] h-full bg-slate-900 shadow-2xl relative z-20">
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-900 border-l border-slate-800 relative">
          
          <div className="px-5 py-4 bg-slate-950/50 border-b border-slate-800 flex justify-between items-center z-10">
            <h3 className="text-sm font-bold text-slate-200 tracking-wider">Match Chat</h3>
            <button 
              onClick={toggleChat}
              className="text-slate-500 hover:text-slate-300 transition-colors z-30"
            >
              {chatEnabled ? <MessageSquareOff size={16} /> : <MessageSquareOff size={16} className="opacity-50" />}
            </button>
          </div>

          {!chatEnabled && (
             <div className="absolute bottom-0 left-0 right-0 top-[53px] z-20 bg-slate-900/80 backdrop-blur-md flex flex-col items-center justify-center">
                <MessageSquareOff size={32} className="text-slate-600 mb-2" />
                <p className="text-sm font-medium text-slate-400">You Disabled Chat</p>
             </div>
          )}

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 custom-scrollbar relative">
            {chatHistory.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600 h-full">
                 <MessageSquareOff size={32} className="mb-3 opacity-20" />
                 <p className="text-xs font-mono uppercase tracking-widest opacity-50">No Messages Yet</p>
              </div>
            ) : (
              chatHistory.map(msg => <ChatBubble key={msg.id} msg={msg} />)
            )}
          </div>

          <div className="p-3 bg-slate-950/50 border-t border-slate-800 flex-shrink-0 z-10">
            <form onSubmit={handleChatSend} className="relative">
              <input 
                type="text" 
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder={!chatEnabled ? "Chat disabled" : opponentChatDisabled ? `${opponentName} disabled chat` : status === 'connected' ? 'Type message...' : 'Waiting...'}
                disabled={status !== 'connected' || !chatEnabled || isReconnecting || opponentChatDisabled}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-full pl-4 pr-12 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                maxLength={200}
              />
              <button 
                type="submit"
                disabled={status !== 'connected' || !chatEnabled || isReconnecting || opponentChatDisabled || !chatInput.trim()}
                className="absolute right-1.5 top-1.5 bottom-1.5 aspect-square flex items-center justify-center rounded-full bg-indigo-600 text-white hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 transition-colors"
              >
                <Send size={14} className="ml-0.5" />
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}
