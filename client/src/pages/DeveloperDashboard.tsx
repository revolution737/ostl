import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, TrendingUp, Users, PlayCircle } from "lucide-react";
import { Button } from "../components/ui/button";

interface DeveloperGame {
  id: string;
  name: string;
  image: string;
  totalPlayers: number;
  activePlayers: number;
  status: "active" | "pending" | "paused";
}

const developerGames: DeveloperGame[] = [
  {
    id: "chess",
    name: "Chess Master",
    image: "https://images.unsplash.com/photo-1654741755763-b4cee51feb9a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaGVzcyUyMGJvYXJkJTIwZ2FtZXxlbnwxfHx8fDE3NzU4MzM4OTF8MA&ixlib=rb-4.1.0&q=80&w=1080",
    totalPlayers: 15420,
    activePlayers: 1247,
    revenue: 2845,
    status: "active",
  },
  {
    id: "poker",
    name: "Poker Night",
    image: "https://images.unsplash.com/photo-1560327317-031f46d0e995?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwb2tlciUyMGNhcmRzJTIwZ2FtZXxlbnwxfHx8fDE3NzU4MzM4OTJ8MA&ixlib=rb-4.1.0&q=80&w=1080",
    totalPlayers: 28560,
    activePlayers: 2156,
    revenue: 4920,
    status: "active",
  },
  {
    id: "puzzle",
    name: "Puzzle Challenge",
    image: "https://images.unsplash.com/photo-1612385763901-68857dd4c43c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwdXp6bGUlMjBnYW1lJTIwY29sb3JmdWx8ZW58MXx8fHwxNzc1ODMzODkzfDA&ixlib=rb-4.1.0&q=80&w=1080",
    totalPlayers: 9834,
    activePlayers: 743,
    revenue: 1560,
    status: "active",
  },
];

export function DeveloperDashboard() {
  const navigate = useNavigate();
  const [games, setGames] = useState<DeveloperGame[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Aggregate Stats
  const [totalPlays, setTotalPlays] = useState(0);
  const [devName, setDevName] = useState("");

  useEffect(() => {
    const devId = localStorage.getItem('developerId');
    const devCtx = localStorage.getItem('developerContext');
    
    if (!devId) {
      navigate('/developers');
      return;
    }
    
    if (devCtx) {
      try {
        setDevName(JSON.parse(devCtx).name);
      } catch(e) {}
    }

    async function loadGames() {
      try {
        const baseUrl = import.meta.env.PROD ? (import.meta.env.VITE_API_URL || '') : '';
        const res = await fetch(`${baseUrl}/api/games?developer_id=${devId}`);
        const data = await res.json();
        if (data.games) {
          const mapped = data.games.map((g: any) => ({
            id: g.slug,
            name: g.title,
            image: g.thumbnail_url || "https://images.unsplash.com/photo-1612385763901-68857dd4c43c?w=1080",
            totalPlayers: g.total_plays || 0,
            activePlayers: 0, // Mocked for now until socket tracking supports dev filter natively
            revenue: Math.floor((g.total_plays || 0) * 0.05), // Fun mock metric
            status: g.is_active ? "active" : "paused"
          }));
          setGames(mapped);
          
          let sumPlays = 0;
          data.games.forEach((g: any) => sumPlays += (g.total_plays || 0));
          setTotalPlays(sumPlays);
        }
      } catch (err) {
        console.error("Failed to fetch developer games");
      } finally {
        setLoading(false);
      }
    }
    
    loadGames();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 bg-clip-text text-transparent font-bold">
            OSTL {devName ? `— ${devName}` : ''}
          </h1>
          <div className="flex space-x-4">
             <Button
               onClick={() => {
                 localStorage.removeItem('developerId');
                 localStorage.removeItem('developerContext');
                 navigate('/developers');
               }}
               variant="outline"
             >
               Sign Out
             </Button>
             <Button
               onClick={() => navigate("/developers/upload")}
               className="bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20"
             >
               <Plus className="w-4 h-4 mr-2" />
               Publish Engine
             </Button>
          </div>
        </div>
      </nav>

      {/* Dashboard Content */}
      <div className="container mx-auto px-6 py-8 flex-1">
        {/* Overview Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h2 className="text-3xl font-semibold mb-6 text-gray-800 tracking-tight">Publisher Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <StatCard
              icon={<PlayCircle className="w-6 h-6" />}
              label="Published Games"
              value={games.length.toString()}
              color="blue"
            />
            <StatCard
              icon={<Users className="w-6 h-6" />}
              label="Total Plays"
              value={totalPlays.toLocaleString()}
              color="green"
            />
          </div>
        </motion.div>

        {/* Games Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <h3 className="text-2xl font-semibold mb-6 text-gray-800 tracking-tight">Published Portfolio</h3>
          {loading ? (
             <div className="w-full flex justify-center py-20">
               <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
             </div>
          ) : games.length === 0 ? (
             <div className="w-full text-center py-20 border-2 border-dashed border-gray-200 rounded-3xl bg-white">
               <h4 className="text-xl text-gray-400 mb-2 font-medium">No engines published yet</h4>
               <p className="text-gray-500 mb-6">Upload a .zip package to see your telemetry scale.</p>
             </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {games.map((game, index) => (
                <DeveloperGameCard key={game.id} game={game} index={index} />
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  const colorClasses = {
    blue: "from-blue-600 to-blue-500",
    green: "from-green-600 to-green-500",
    purple: "from-purple-600 to-purple-500",
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-600 text-sm mb-1">{label}</p>
          <p className="text-3xl text-gray-800">{value}</p>
        </div>
        <div
          className={`p-3 bg-gradient-to-br ${colorClasses[color as keyof typeof colorClasses]} rounded-xl text-white`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function DeveloperGameCard({ game, index }: { game: DeveloperGame; index: number }) {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      onClick={() => navigate(`/developers/analytics/${game.id}`)}
      className="bg-white rounded-2xl shadow-sm overflow-hidden cursor-pointer hover:shadow-lg transition-shadow duration-300 border border-gray-100"
    >
      <div className="relative h-48">
        <img src={game.image} alt={game.name} className="w-full h-full object-cover" />
        <div className="absolute top-3 right-3">
          <span
            className={`px-3 py-1 rounded-full text-xs ${
              game.status === "active"
                ? "bg-green-500 text-white"
                : game.status === "pending"
                  ? "bg-yellow-500 text-white"
                  : "bg-gray-500 text-white"
            }`}
          >
            {game.status}
          </span>
        </div>
      </div>
      <div className="p-6">
        <h4 className="text-xl mb-4 text-gray-800">{game.name}</h4>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-600 text-sm">Active Players</span>
            <span className="text-blue-600">{game.activePlayers.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600 text-sm">Total Players</span>
            <span className="text-gray-800">{game.totalPlayers.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center bg-gray-50 p-2 rounded-lg">
            <span className="text-gray-600 text-sm">Active Pipeline</span>
            <span className="text-blue-600 font-mono text-sm tracking-widest">{game.id}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
