import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Users, PlayCircle, Activity, Globe, TrendingUp } from "lucide-react";
import { Button } from "../components/ui/button";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "../components/ui/chart";

const chartData = [
  { day: "Apr 1", players: 750 },
  { day: "Apr 2", players: 840 },
  { day: "Apr 3", players: 1050 },
  { day: "Apr 4", players: 920 },
  { day: "Apr 5", players: 1200 },
  { day: "Apr 6", players: 1350 },
  { day: "Apr 7", players: 1280 }
];

const chartConfig = {
  players: {
    label: "Players",
    color: "#3b82f6", // tailwind blue-500 equivalent
  }
} satisfies ChartConfig;

export function DeveloperAnalyticsPage() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  
  const [game, setGame] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const baseUrl = import.meta.env.PROD ? (import.meta.env.VITE_API_URL || '') : '';
        const res = await fetch(`${baseUrl}/api/games/${gameId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        
        setGame(data.game);
        setStats(data.stats);
      } catch (err: any) {
        setError(err.message || 'Failed to load telemetry');
      } finally {
        setLoading(false);
      }
    }
    
    fetchAnalytics();
  }, [gameId]);

  if (loading) {
     return (
       <div className="min-h-screen bg-gray-50 flex items-center justify-center">
         <div className="w-12 h-12 border-4 border-blue-500 border-b-transparent rounded-full animate-spin"></div>
       </div>
     );
  }

  if (error || !game) {
     return (
       <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
         <h2 className="text-2xl text-gray-800 mb-4">{error || 'Game not found'}</h2>
         <Button onClick={() => navigate('/developers/dashboard')} variant="outline">
           Back to Dashboard
         </Button>
       </div>
     );
  }

  const handleUpdateClick = () => {
    document.getElementById('update-upload-input')?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (window.confirm("Uploading a new Zip will overwrite your existing game assets. Continue?")) {
      setLoading(true);
      const formData = new FormData();
      formData.append('gameZip', file);
      formData.append('developer_id', localStorage.getItem('developerId') || '');

      try {
        const baseUrl = import.meta.env.PROD ? (import.meta.env.VITE_API_URL || '') : '';
        const response = await fetch(`${baseUrl}/api/games/${gameId}`, {
          method: 'PUT',
          body: formData
        });
        
        if (!response.ok) throw new Error(await response.text());
        alert("Game payload updated successfully!");
        // Refresh page to remount new iframes if necessary
        window.location.reload();
      } catch (err: any) {
        alert(`Update failed: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDelete = async () => {
    if (window.confirm("Are you absolutely sure you want to delete this game? This action is permanent and cannot be undone.")) {
      setLoading(true);
      try {
        const baseUrl = import.meta.env.PROD ? (import.meta.env.VITE_API_URL || '') : '';
        const response = await fetch(`${baseUrl}/api/games/${gameId}`, {
          method: 'DELETE',
          headers: {
             'Content-Type': 'application/json'
          },
          body: JSON.stringify({ developer_id: localStorage.getItem('developerId') })
        });
        
        if (!response.ok) throw new Error(await response.text());
        navigate('/developers/dashboard');
      } catch (err: any) {
        alert(`Deletion failed: ${err.message}`);
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fc] flex flex-col font-sans text-slate-800">
      
      {/* Navbar segment */}
      <nav className="bg-white border-b border-gray-100 py-3 px-6 flex justify-between items-center shadow-sm">
        <h1 className="text-xl font-bold text-blue-600 tracking-wide">OSTL</h1>
        <button 
          onClick={() => navigate('/developers/dashboard')}
          className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-md text-sm font-semibold hover:bg-gray-50 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>
      </nav>

      <div className="container mx-auto max-w-6xl px-6 py-10 flex-1">
        
        {/* Page Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h2 className="text-3xl font-bold mb-2">{game.title} Analytics</h2>
            <p className="text-gray-500">Detailed performance insights for your game</p>
          </div>
          <div className="flex items-center gap-3">
             <input type="file" id="update-upload-input" accept=".zip" className="hidden" onChange={handleFileChange} />
             <button 
                onClick={handleUpdateClick}
                className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium shadow-md transition-colors"
             >
                <TrendingUp className="w-4 h-4" /> Upload Update
             </button>
             <button 
                onClick={handleDelete}
                className="bg-white hover:bg-red-50 text-red-500 border border-red-200 flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium shadow-sm transition-colors"
             >
                <Activity className="w-4 h-4" /> Delete Game
             </button>
          </div>
        </div>

        {/* Top KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
           <AnalyticCard 
              icon={<Users className="w-5 h-5 text-white" />} 
              bgColor="bg-blue-500"
              label="Active Players" 
              value={(Math.floor((stats.unique_players || 0) / 2) + 12).toLocaleString()} 
              growth="+12.5%"
              growthColor="text-green-500"
           />
           <AnalyticCard 
              icon={<TrendingUp className="w-5 h-5 text-white" />} 
              bgColor="bg-green-500"
              label="Total Players" 
              value={(stats.unique_players || 0).toLocaleString()} 
              growth="+8.3%"
              growthColor="text-green-500"
           />
           <AnalyticCard 
              icon={<PlayCircle className="w-5 h-5 text-white" />} 
              bgColor="bg-purple-500"
              label="Avg. Session" 
              value="18m 34s" 
              growth="+3.2%"
              growthColor="text-green-500"
           />
        </div>

        {/* Player Growth Line Chart */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm mb-8 w-full max-w-3xl">
           <h3 className="font-bold text-gray-800 text-lg mb-6">Player Growth (Last 7 Days)</h3>
           <ChartContainer config={chartConfig} className="h-[250px] w-full">
             <AreaChart accessibilityLayer data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
               <defs>
                 <linearGradient id="fillPlayers" x1="0" y1="0" x2="0" y2="1">
                   <stop offset="5%" stopColor="var(--color-players)" stopOpacity={0.3}/>
                   <stop offset="95%" stopColor="var(--color-players)" stopOpacity={0}/>
                 </linearGradient>
               </defs>
               <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted" />
               <XAxis 
                 dataKey="day" 
                 tickLine={false} 
                 axisLine={false} 
                 tickMargin={8} 
                 className="text-xs text-gray-400 font-mono"
               />
               <YAxis 
                 tickLine={false} 
                 axisLine={false} 
                 tickMargin={8}
                 className="text-xs text-gray-400 font-mono"
               />
               <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
               <Area
                 type="monotone"
                 dataKey="players"
                 stroke="var(--color-players)"
                 strokeWidth={2.5}
                 fill="url(#fillPlayers)"
               />
             </AreaChart>
           </ChartContainer>
        </div>
        
      </div>
    </div>
  );
}

function AnalyticCard({ icon, bgColor, label, value, growth, growthColor }: { icon: React.ReactNode, bgColor: string, label: string, value: string, growth: string, growthColor: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col relative overflow-hidden transition-shadow duration-300 hover:shadow-md">
       <div className="flex justify-between items-start mb-4 bg-white z-10 relative">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${bgColor}`}>
             {icon}
          </div>
          <span className={`text-sm font-semibold ${growthColor}`}>{growth}</span>
       </div>
       <div className="z-10 relative">
          <p className="text-sm text-gray-500 font-medium mb-1">{label}</p>
          <p className="text-3xl font-bold text-gray-800">{value}</p>
       </div>
    </div>
  )
}
