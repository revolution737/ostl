import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useSocket } from '../context/SocketProvider';

export function MatchFindingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { socket, isConnected } = useSocket();
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  
  // Safe extraction of params
  const gameId = location.state?.gameId || 'dummy-game';
  const displayName = location.state?.displayName || 'Player';
  const playUrl = location.state?.playUrl;

  useEffect(() => {
    // Always wipe any leftover match session when entering matchmaking
    // (README §4: LocalStorage State Hydration — clear stale session on fresh queue entry)
    localStorage.removeItem('ostl_match_state');

    const interval = setInterval(() => {
      setSecondsElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!socket || !isConnected) return;
    
    socket.emit('find_match', { gameId, displayName });
    console.log(`[matchmaking] Enqueued for ${gameId} as ${displayName}`);

    const handleMatchFound = ({ roomId, isHost, opponentName }) => {
      navigate('/play', { 
        state: { roomId, isHost, gameId, playUrl, displayName, opponentName },
        replace: true 
      });
    };

    socket.on('match_found', handleMatchFound);
    return () => { socket.off('match_found', handleMatchFound); };
  }, [socket, isConnected, gameId, displayName, navigate]);

  const handleCancel = () => {
    if (socket) socket.emit('leave_queue');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 flex flex-col items-center justify-center px-6">
      <div className="text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="relative inline-block">
            {/* Animated rings */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 -m-8"
            >
              <div className="w-32 h-32 border-4 border-blue-200 border-t-blue-600 dark:border-blue-900 dark:border-t-blue-500 rounded-full" />
            </motion.div>
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 -m-12"
            >
              <div className="w-40 h-40 border-4 border-blue-100 border-t-blue-400 dark:border-blue-950 dark:border-t-blue-400 rounded-full" />
            </motion.div>
            
            {/* Center icon */}
            <div className="relative z-10 bg-gradient-to-br from-blue-600 to-blue-500 rounded-full p-8 shadow-xl">
              <Loader2 className="w-16 h-16 text-white animate-spin" />
            </div>
          </div>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-3xl mb-4 text-gray-800 dark:text-gray-100 font-bold"
        >
          Finding Your Opponent
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-xl text-gray-600 dark:text-gray-400 mb-2"
        >
          Queue: {gameId}
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm font-mono text-gray-400 dark:text-gray-500 mb-8"
        >
          Elapsed: {secondsElapsed}s
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex items-center justify-center gap-2 mb-8"
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.2,
              }}
              className="w-3 h-3 bg-blue-600 dark:bg-blue-500 rounded-full"
            />
          ))}
        </motion.div>
        
        <button
          onClick={handleCancel}
          className="px-6 py-2 rounded-full text-sm font-medium border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30 transition-colors"
        >
          Cancel Search
        </button>
      </div>
    </div>
  );
}
