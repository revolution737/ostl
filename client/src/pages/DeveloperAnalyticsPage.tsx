import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Users, PlayCircle, Activity, TrendingUp, Edit, X } from "lucide-react";
import { Button } from "../components/ui/button";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "../components/ui/chart";

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
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Edit Modal State
  const [showEdit, setShowEdit] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editThumb, setEditThumb] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const baseUrl = import.meta.env.PROD ? (import.meta.env.VITE_API_URL || '') : '';
        const res = await fetch(`${baseUrl}/api/games/${gameId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        setGame(data.game);
        setEditTitle(data.game.title);
        setEditDesc(data.game.description || "");
        setEditThumb(data.game.thumbnail_url || "");
        setStats(data.stats);
        if (data.growth && data.growth.length > 0) {
          setChartData(data.growth);
        } else {
          // Fallback to flatline if no matches
          setChartData([{ day: "Today", players: 0 }]);
        }
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

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const baseUrl = import.meta.env.PROD ? (import.meta.env.VITE_API_URL || '') : '';
      const response = await fetch(`${baseUrl}/api/games/${gameId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          developer_id: localStorage.getItem('developerId'),
          title: editTitle,
          description: editDesc,
          thumbnail_url: editThumb
        })
      });
      if (!response.ok) throw new Error(await response.text());
      setGame({ ...game, title: editTitle, description: editDesc, thumbnail_url: editThumb });
      setShowEdit(false);
    } catch (err: any) {
      alert(`Update failed: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fc] flex flex-col font-sans text-slate-800">

      {/* Navbar segment */}
      <nav className="bg-white border-b border-gray-100 py-3 px-6 flex justify-between items-center shadow-sm">
        <h1 className="text-xl font-bold text-blue-600 tracking-wide">ostl.</h1>
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
            <button 
               onClick={() => setShowEdit(true)}
               className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium shadow-sm transition-colors"
            >
               <Edit className="w-4 h-4" /> Edit Info
            </button>
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
            value={(stats?.active_players || 0).toLocaleString()}
            growth=""
            growthColor="text-green-500"
          />
          <AnalyticCard
            icon={<TrendingUp className="w-5 h-5 text-white" />}
            bgColor="bg-green-500"
            label="Total Players"
            value={(stats?.unique_players || 0).toLocaleString()}
            growth=""
            growthColor="text-green-500"
          />
          <AnalyticCard
            icon={<PlayCircle className="w-5 h-5 text-white" />}
            bgColor="bg-purple-500"
            label="Avg. Session"
            value={`${stats?.avg_session_mins || 0}m`}
            growth=""
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
                  <stop offset="5%" stopColor="var(--color-players)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-players)" stopOpacity={0} />
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

      {/* Edit Info Modal */}
      {showEdit && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Edit Game Info</h2>
              <button onClick={() => setShowEdit(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="space-y-4 text-left border-gray-200">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Game Title</label>
                <input 
                  type="text" 
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  className="w-full border border-gray-300 bg-white rounded-md px-3 py-2 text-gray-900"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea 
                  value={editDesc}
                  onChange={e => setEditDesc(e.target.value)}
                  className="w-full border border-gray-300 bg-white rounded-md px-3 py-2 text-gray-900 min-h-[100px]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Thumbnail URL</label>
                <input 
                  type="url" 
                  value={editThumb}
                  onChange={e => setEditThumb(e.target.value)}
                  className="w-full border border-gray-300 bg-white rounded-md px-3 py-2 text-gray-900"
                />
              </div>
              
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowEdit(false)} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 bg-white">Cancel</button>
                <button type="submit" disabled={isSaving} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
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
