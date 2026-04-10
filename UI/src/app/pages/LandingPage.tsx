import { useState } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Users, X } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

interface Game {
  id: string;
  name: string;
  description: string;
  detailedDescription: string;
  image: string;
  activePlayers: number;
}

const games: Game[] = [
  {
    id: "chess",
    name: "Chess Master",
    description: "Classic strategy game",
    detailedDescription: "Test your strategic thinking in this timeless game of chess. Battle against players worldwide and improve your skills with every match.",
    image: "https://images.unsplash.com/photo-1654741755763-b4cee51feb9a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaGVzcyUyMGJvYXJkJTIwZ2FtZXxlbnwxfHx8fDE3NzU4MzM4OTF8MA&ixlib=rb-4.1.0&q=80&w=1080",
    activePlayers: 1247,
  },
  {
    id: "tictactoe",
    name: "Tic Tac Toe",
    description: "Quick strategy game",
    detailedDescription: "A fast-paced classic game perfect for quick matches. Simple rules, endless fun. Challenge your opponent to a battle of wits.",
    image: "https://images.unsplash.com/photo-1734352749150-f333c6276342?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0aWMlMjB0YWMlMjB0b2UlMjBnYW1lfGVufDF8fHx8MTc3NTczMTkxOXww&ixlib=rb-4.1.0&q=80&w=1080",
    activePlayers: 892,
  },
  {
    id: "poker",
    name: "Poker Night",
    description: "Bluff and win big",
    detailedDescription: "Experience the thrill of poker with real-time matches. Test your poker face and strategic thinking against skilled opponents.",
    image: "https://images.unsplash.com/photo-1560327317-031f46d0e995?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwb2tlciUyMGNhcmRzJTIwZ2FtZXxlbnwxfHx8fDE3NzU4MzM4OTJ8MA&ixlib=rb-4.1.0&q=80&w=1080",
    activePlayers: 2156,
  },
  {
    id: "racing",
    name: "Speed Racer",
    description: "Fast-paced racing action",
    detailedDescription: "Race against opponents in heart-pounding matches. Master the tracks, perfect your timing, and cross the finish line first.",
    image: "https://images.unsplash.com/photo-1602940819863-2905852243ad?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyYWNpbmclMjBnYW1lfGVufDF8fHx8MTc3NTc1MDkwNHww&ixlib=rb-4.1.0&q=80&w=1080",
    activePlayers: 1678,
  },
  {
    id: "puzzle",
    name: "Puzzle Challenge",
    description: "Mind-bending puzzles",
    detailedDescription: "Compete to solve puzzles faster than your opponent. Each round brings new challenges that test your problem-solving skills.",
    image: "https://images.unsplash.com/photo-1612385763901-68857dd4c43c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwdXp6bGUlMjBnYW1lJTIwY29sb3JmdWx8ZW58MXx8fHwxNzc1ODMzODkzfDA&ixlib=rb-4.1.0&q=80&w=1080",
    activePlayers: 743,
  },
  {
    id: "trivia",
    name: "Trivia Master",
    description: "Test your knowledge",
    detailedDescription: "Challenge your intellect with trivia questions across various categories. Race against the clock and your opponent to prove your knowledge.",
    image: "https://images.unsplash.com/photo-1661353047947-ff735c58c683?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0cml2aWElMjBxdWl6JTIwZ2FtZXxlbnwxfHx8fDE3NzU3NjQyNjV8MA&ixlib=rb-4.1.0&q=80&w=1080",
    activePlayers: 1034,
  },
];

export function LandingPage() {
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [playerName, setPlayerName] = useState("");
  const navigate = useNavigate();

  const handlePlayNow = () => {
    if (selectedGame && playerName.trim()) {
      navigate(`/matchmaking/${selectedGame.id}`);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 bg-clip-text text-transparent">
            OSTL
          </h1>
          <Button
            onClick={() => navigate("/developers")}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            For Developers
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="container mx-auto text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-5xl md:text-6xl mb-6"
          >
            Play Games.{" "}
            <span className="bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 bg-clip-text text-transparent">
              Make Friends.
            </span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-xl text-gray-600 max-w-2xl mx-auto"
          >
            Connect with players worldwide in real-time multiplayer games. Choose your game and start playing instantly.
          </motion.p>
        </div>
      </section>

      {/* Game Catalogue */}
      <section className="pb-20 px-6">
        <div className="container mx-auto">
          <motion.h3
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-3xl mb-12 text-center text-gray-800"
          >
            Choose Your Game
          </motion.h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {games.map((game, index) => (
              <GameCard
                key={game.id}
                game={game}
                index={index}
                onClick={() => setSelectedGame(game)}
              />
            ))}
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
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            />
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 50 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg mx-4"
            >
              <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
                <div className="relative h-64">
                  <img
                    src={selectedGame.image}
                    alt={selectedGame.name}
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => setSelectedGame(null)}
                    className="absolute top-4 right-4 bg-white/90 hover:bg-white rounded-full p-2 transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-700" />
                  </button>
                  <div className="absolute top-4 left-4 bg-blue-600 text-white px-3 py-1 rounded-full text-sm flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {selectedGame.activePlayers}
                  </div>
                </div>
                <div className="p-8">
                  <h3 className="text-2xl mb-3 text-gray-800">
                    {selectedGame.name}
                  </h3>
                  <p className="text-gray-600 mb-6">
                    {selectedGame.detailedDescription}
                  </p>
                  <div className="space-y-4">
                    <Input
                      type="text"
                      placeholder="Enter your name"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      className="w-full"
                    />
                    <Button
                      onClick={handlePlayNow}
                      disabled={!playerName.trim()}
                      className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white py-6 text-lg"
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

function GameCard({ game, index, onClick }: { game: Game; index: number; onClick: () => void }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={onClick}
      className="relative cursor-pointer group overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-shadow duration-300"
    >
      <div className="relative h-80">
        <img
          src={game.image}
          alt={game.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        
        {/* Active Players Badge */}
        <div className="absolute top-4 right-4 bg-blue-600 text-white px-3 py-1 rounded-full text-sm flex items-center gap-1 shadow-lg">
          <Users className="w-4 h-4" />
          {game.activePlayers}
        </div>

        {/* Game Info */}
        <motion.div
          initial={false}
          animate={{ y: isHovered ? -40 : 0 }}
          transition={{ duration: 0.3 }}
          className="absolute bottom-0 left-0 right-0 p-6"
        >
          <h4 className="text-2xl text-white mb-2">{game.name}</h4>
          <motion.p
            initial={false}
            animate={{ opacity: isHovered ? 1 : 0, height: isHovered ? "auto" : 0 }}
            transition={{ duration: 0.3 }}
            className="text-white/90 text-sm overflow-hidden"
          >
            {game.description}
          </motion.p>
        </motion.div>
      </div>
    </motion.div>
  );
}
