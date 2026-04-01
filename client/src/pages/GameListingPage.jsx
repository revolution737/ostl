import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Gamepad2, Settings2, Video, VideoOff, Mic, MicOff, Play, X } from 'lucide-react';
import { useSocket } from '../context/SocketProvider';

const MOCK_GAMES = [
  {
    id: 'ostl_alpha',
    title: 'Ostl Sandbox Engine',
    description: 'The premier benchmark test for the Dumb Relay WebRTC data channels.',
    players: 142,
    image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=600&auto=format&fit=crop'
  },
  {
    id: 'space_invaders_p2p',
    title: 'Void Drifter',
    description: 'A WASM-compiled deterministic physics shooter.',
    players: 89,
    image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=600&auto=format&fit=crop'
  },
  {
    id: 'chess_gl',
    title: 'Quantum Chess GL',
    description: 'High stakes strategy with sub-10ms move verification.',
    players: 315,
    image: 'https://images.unsplash.com/photo-1580541832626-2a7131ee809f?q=80&w=600&auto=format&fit=crop'
  }
];

const RANDOM_NAMES = ['Anonymous Hippo', 'Neon Tiger', 'Quantum Gecko', 'Ephemeral Hawk', 'Plasma Wolf'];

export function GameListingPage() {
  const [selectedGame, setSelectedGame] = useState(null);
  const [displayName, setDisplayName] = useState('');
  
  const navigate = useNavigate();
  const { socket, isConnected } = useSocket();

  const handlePlayNow = () => {
    if (!socket || !isConnected || !selectedGame) return;
    
    const finalName = displayName.trim() || RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
    
    navigate('/matchmaking', { 
      state: { 
        gameId: selectedGame.id, 
        displayName: finalName
      } 
    });
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-12">
      <div className="mb-12">
        <h1 className="text-4xl font-extrabold text-white mb-4">Live Hub</h1>
        <p className="text-slate-400">Select a game to enter the matchmaking queue.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {MOCK_GAMES.map((game) => (
          <motion.div
            key={game.id}
            layoutId={`card-${game.id}`}
            onClick={() => setSelectedGame(game)}
            className="group cursor-pointer rounded-2xl overflow-hidden glass-panel bg-slate-900/60 border border-slate-700/50 hover:border-indigo-500/50 transition-colors"
          >
            <div className="h-48 overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent z-10"></div>
              <motion.img 
                layoutId={`image-${game.id}`}
                src={game.image} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                alt={game.title} 
              />
            </div>
            <div className="p-6 relative z-20 -mt-6">
              <div className="flex justify-between items-start mb-2">
                <motion.h3 layoutId={`title-${game.id}`} className="text-xl font-bold text-white group-hover:text-indigo-400 transition-colors">
                  {game.title}
                </motion.h3>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  {game.players}
                </div>
              </div>
              <p className="text-sm text-slate-400 line-clamp-2">{game.description}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Expanded Modal View */}
      <AnimatePresence>
        {selectedGame && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedGame(null)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            ></motion.div>
            
            <motion.div 
              layoutId={`card-${selectedGame.id}`}
              className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden shadow-2xl relative z-10 flex flex-col md:flex-row"
            >
              <button 
                onClick={() => setSelectedGame(null)}
                className="absolute top-4 right-4 p-2 bg-slate-950/50 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white z-30 transition-colors"
              >
                <X size={20} />
              </button>

              <div className="md:w-1/2 h-64 md:h-auto relative">
                <div className="absolute inset-0 bg-indigo-500/20 mix-blend-overlay z-10"></div>
                <motion.img 
                  layoutId={`image-${selectedGame.id}`}
                  src={selectedGame.image} 
                  className="w-full h-full object-cover" 
                  alt={selectedGame.title} 
                />
              </div>

              <div className="p-8 md:w-1/2 flex flex-col bg-gradient-to-br from-slate-900 to-slate-950">
                <motion.h3 layoutId={`title-${selectedGame.id}`} className="text-2xl font-bold text-white mb-2">
                  {selectedGame.title}
                </motion.h3>
                <p className="text-sm text-slate-400 mb-8">{selectedGame.description}</p>
                
                <div className="mb-6">
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Display Name</label>
                  <input 
                    type="text" 
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Neon Tiger (Leave blank for random)"
                    className="w-full bg-slate-950/70 border border-slate-700 focus:border-indigo-500 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors placeholder:text-slate-600"
                  />
                </div>



                <button 
                  onClick={handlePlayNow}
                  className="mt-auto w-full group relative inline-flex items-center justify-center px-6 py-4 text-base font-bold text-white transition-all duration-300 bg-indigo-600 rounded-xl hover:bg-indigo-500 focus:outline-none overflow-hidden"
                >
                  <span className="absolute inset-0 w-full h-full -mt-1 rounded-lg opacity-30 bg-gradient-to-b from-transparent via-transparent to-black"></span>
                  <span className="relative flex items-center justify-center gap-2">
                    <Play fill="currentColor" size={16} /> Play Now
                  </span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
