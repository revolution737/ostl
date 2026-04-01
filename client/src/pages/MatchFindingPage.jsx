import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, XCircle, AlertTriangle } from 'lucide-react';
import { useSocket } from '../context/SocketProvider';

export function MatchFindingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { socket, isConnected } = useSocket();
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  
  // Safe extraction of params (defaulting back if user navigates directly to this route)
  const gameId = location.state?.gameId || 'ostl_alpha';
  const displayName = location.state?.displayName || 'Player';

  // Timer loop
  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Matchmaking hook system
  useEffect(() => {
    if (!socket || !isConnected) return;

    // 1. Instantly enter the matchmaking queue
    socket.emit('find_match', { gameId, displayName });
    console.log(`[matchmaking] Enqueued for ${gameId} as ${displayName}`);

    // 2. Listen for the match
    const handleMatchFound = ({ roomId, isHost, opponentName }) => {
      console.log(`[matchmaking] Matched! Room ${roomId}, Host: ${isHost}`);
      // Push context directly to the Game Page
      navigate('/play', { 
        state: { roomId, isHost, gameId, displayName, opponentName },
        replace: true // don't allow "back" into matchmaking 
      });
    };

    socket.on('match_found', handleMatchFound);

    return () => {
      socket.off('match_found', handleMatchFound);
    };
  }, [socket, isConnected, gameId, displayName, navigate]);

  const handleCancel = () => {
    if (socket) {
      socket.emit('leave_queue');
    }
    navigate('/games');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="p-10 rounded-3xl bg-slate-900/60 border border-slate-700/50 shadow-2xl glass-panel max-w-md w-full text-center relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-slate-800">
           <motion.div 
             className="h-full bg-indigo-500"
             animate={{ x: ['-100%', '100%'] }}
             transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
           ></motion.div>
        </div>

        <div className="mb-8 relative flex items-center justify-center">
          <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full"></div>
          <Loader2 className="animate-spin text-indigo-400 relative z-10 drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]" size={80} strokeWidth={1.5} />
        </div>
        
        <h2 className="text-2xl font-bold text-white mb-2">Searching for Opponent</h2>
        <p className="text-slate-400 text-sm mb-6 uppercase tracking-wider font-mono">
          Queue: {gameId}
        </p>

        <div className="flex flex-col items-center justify-center space-y-4 mb-8">
          <div className="text-4xl font-extrabold font-mono text-slate-100 flex items-baseline gap-1">
             <span className="text-indigo-400">{secondsElapsed}</span>
             <span className="text-xl text-slate-500 font-medium">sec</span>
          </div>
          
          <AnimatePresence>
            {secondsElapsed > 30 && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-left"
              >
                <AlertTriangle className="text-amber-400 shrink-0 mt-0.5" size={18} />
                <p className="text-xs text-amber-200/80 leading-relaxed">
                  Matchmaking is taking longer than usual. You can stay in queue or cancel and try another game.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button
          onClick={handleCancel}
          className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-xl font-bold text-slate-300 bg-slate-800/80 hover:bg-red-500/10 hover:text-red-400 border border-slate-700 hover:border-red-500/30 transition-all duration-300 group"
        >
          <XCircle size={18} className="group-hover:scale-110 transition-transform" />
          Cancel Search
        </button>
      </motion.div>
    </div>
  );
}
