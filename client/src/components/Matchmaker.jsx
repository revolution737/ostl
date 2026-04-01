import { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketProvider';
import { Loader2 } from 'lucide-react';

export function Matchmaker({ onMatchFound }) {
  const { socket, uuid, isConnected } = useSocket();
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!socket) return;

    const handleMatchFound = ({ roomId, isHost }) => {
      console.log('[matchmaker] Match found:', { roomId, isHost });
      setIsSearching(false);
      onMatchFound(roomId, isHost);
    };

    const handleRejoin = ({ roomId }) => {
      console.log('[matchmaker] Rejoined room:', roomId);
      // We don't know the exact host status on rejoin currently without extra backend logic, 
      // but assuming guest is safer or we can rely on P2P handshake fallback.
      // For now, let's treat rejoin as guest to listen to offers.
      setIsSearching(false);
      onMatchFound(roomId, false);
    };

    socket.on('match_found', handleMatchFound);
    socket.on('rejoin', handleRejoin);

    return () => {
      socket.off('match_found', handleMatchFound);
      socket.off('rejoin', handleRejoin);
    };
  }, [socket, onMatchFound]);

  const handleFindMatch = () => {
    if (!socket || !isConnected) return;
    setIsSearching(true);
    socket.emit('find_match', { gameId: 'ostl_alpha' }); // Emitting generic game ID for now
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl glass-panel max-w-sm w-full text-center">
        <div className="mb-6">
          <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500">
            Lobby Ready
          </h2>
          <p className="text-slate-400 mt-2 text-sm">
            {isConnected ? 'Connected to signaling server.' : 'Connecting...'}
          </p>
          <p className="text-xs text-slate-600 mt-1 uppercase tracking-widest break-all">
            ID: {uuid}
          </p>
        </div>

        <button
          onClick={handleFindMatch}
          disabled={!isConnected || isSearching}
          className={`w-full py-3 px-6 rounded-lg font-semibold text-white transition-all duration-300 flex items-center justify-center
            ${
              isSearching 
              ? 'bg-slate-700 cursor-not-allowed'
              : !isConnected
              ? 'bg-slate-800 opacity-50 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-500 hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:-translate-y-1'
            }`}
        >
          {isSearching ? (
            <>
              <Loader2 className="animate-spin mr-2 h-5 w-5" />
              Searching...
            </>
          ) : (
            'Find Match'
          )}
        </button>
      </div>
    </div>
  );
}
