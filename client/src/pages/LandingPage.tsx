import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Users, X } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { useMetrics } from "../hooks/useMetrics";
import { ThemeToggle } from "../components/ui/ThemeToggle";

export function LandingPage() {
  const [selectedGame, setSelectedGame] = useState<any>(null);
  const [playerName, setPlayerName] = useState("");
  const navigate = useNavigate();
  const { games, totalActiveNow, loading } = useMetrics();

  const RANDOM_NAMES = [
    "Anonymous Hippo",
    "Neon Tiger",
    "Quantum Gecko",
    "Ephemeral Hawk",
    "Plasma Wolf",
  ];

  const handlePlayNow = () => {
    if (selectedGame) {
      const finalName = playerName.trim() || RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
      navigate(`/matchmaking/${selectedGame.slug}`, { state: { gameId: selectedGame.slug, playUrl: selectedGame.playUrl, displayName: finalName } });
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 transition-colors">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-100 dark:border-slate-800">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 bg-clip-text text-transparent">
            ostl.
          </h1>
          <div className="flex items-center gap-4">
             <ThemeToggle />
             <Button
               onClick={() => navigate("/developers")}
               className="bg-blue-600 hover:bg-blue-700 text-white"
             >
               For Developers
             </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="container mx-auto text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-5xl md:text-6xl mb-6 font-bold text-gray-900 dark:text-white"
          >
            
            <span className="bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 bg-clip-text text-transparent">
              Omni Session Trivial Link.
            </span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-8"
          >
            Connect with players worldwide in real-time multiplayer games. Choose your game and start playing instantly.
          </motion.p>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold"
          >
             <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
             {loading ? '...' : totalActiveNow} players active now
          </motion.div>
        </div>
      </section>

      {/* Game Catalogue */}
      <section className="pb-20 px-6">
        <div className="container mx-auto">
          <motion.h3
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-3xl mb-12 text-center text-gray-800 dark:text-gray-100 font-bold"
          >
            Choose Your Game
          </motion.h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {loading ? (
               <div className="col-span-full text-center text-gray-500 py-10">Loading catalog...</div>
            ) : games.length === 0 ? (
               <div className="col-span-full text-center text-gray-500 py-10">No games found online.</div>
            ) : (
              games.map((game: any, index: number) => (
                <GameCard
                  key={game.id}
                  game={game}
                  index={index}
                  onClick={() => setSelectedGame(game)}
                />
              ))
            )}
          </div>
        </div>
      </section>

      {/* Game Detail Modal */}
      <AnimatePresence>
        {selectedGame && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedGame(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 50 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg mx-4"
            >
              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-gray-100 dark:border-slate-800">
                <div className="relative h-64">
                  <img
                    src={selectedGame.image}
                    alt={selectedGame.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />
                  <button
                    onClick={() => setSelectedGame(null)}
                    className="absolute top-4 right-4 bg-black/40 hover:bg-black/60 text-white rounded-full p-2 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <div className="absolute bottom-4 left-4 flex gap-2">
                     <span className="bg-blue-600/90 backdrop-blur-md text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                       <Users className="w-4 h-4" />
                       {selectedGame.activePlayers}
                     </span>
                  </div>
                </div>
                <div className="p-8">
                  <h3 className="text-2xl font-bold mb-3 text-gray-900 dark:text-white">
                    {selectedGame.name}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm">
                    {selectedGame.description}
                  </p>
                  <div className="space-y-4">
                    <Input
                      type="text"
                      placeholder="e.g. Neon Tiger (Leave blank for random)"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-slate-800/50"
                      onKeyDown={(e) => { if(e.key === 'Enter') handlePlayNow(); }}
                    />
                    <Button
                      onClick={handlePlayNow}
                      className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white py-6 text-lg shadow-lg shadow-blue-500/25"
                    >
                      Play Now
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function GameCard({ game, index, onClick }: { game: any, index: number, onClick: () => void }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={onClick}
      className="relative cursor-pointer group overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 dark:border-slate-800"
    >
      <div className="relative h-80">
        <img
          src={game.image}
          alt={game.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent transition-opacity duration-300" />
        
        {/* Active Players Badge */}
        <div className="absolute top-4 right-4 bg-blue-600/90 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-lg">
          <Users className="w-3.5 h-3.5" />
          {game.activePlayers}
        </div>

        {/* Game Info */}
        <motion.div
          initial={false}
          animate={{ y: isHovered ? -20 : 0 }}
          transition={{ duration: 0.3 }}
          className="absolute bottom-0 left-0 right-0 p-6"
        >
          <h4 className="text-2xl font-bold text-white mb-2 tracking-wide">{game.name}</h4>
          <motion.p
            initial={false}
            animate={{ opacity: isHovered ? 1 : 0, height: isHovered ? "auto" : 0 }}
            transition={{ duration: 0.3 }}
            className="text-white/80 text-sm overflow-hidden"
          >
            {game.description}
          </motion.p>
        </motion.div>
      </div>
    </motion.div>
  );
}
