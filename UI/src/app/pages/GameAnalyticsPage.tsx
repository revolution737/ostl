import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, Trash2, Upload, TrendingUp, Users, Clock, DollarSign } from "lucide-react";
import { Button } from "../components/ui/button";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const playerData = [
  { date: "Apr 1", players: 850 },
  { date: "Apr 2", players: 920 },
  { date: "Apr 3", players: 1100 },
  { date: "Apr 4", players: 980 },
  { date: "Apr 5", players: 1150 },
  { date: "Apr 6", players: 1300 },
  { date: "Apr 7", players: 1247 },
];

const revenueData = [
  { month: "Jan", revenue: 1850 },
  { month: "Feb", revenue: 2100 },
  { month: "Mar", revenue: 2450 },
  { month: "Apr", revenue: 2845 },
];

const sessionData = [
  { hour: "12 AM", sessions: 45 },
  { hour: "4 AM", sessions: 23 },
  { hour: "8 AM", sessions: 89 },
  { hour: "12 PM", sessions: 156 },
  { hour: "4 PM", sessions: 234 },
  { hour: "8 PM", sessions: 312 },
];

export function GameAnalyticsPage() {
  const navigate = useNavigate();
  const { gameId } = useParams();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleDelete = () => {
    // Simulate deletion
    setTimeout(() => {
      navigate("/developers/dashboard");
    }, 500);
  };

  const handleUploadUpdate = () => {
    // In a real app, this would open a file upload dialog
    alert("Upload new version functionality");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 bg-clip-text text-transparent">
            OSTL
          </h1>
          <Button onClick={() => navigate("/developers/dashboard")} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </nav>

      {/* Analytics Content */}
      <div className="container mx-auto px-6 py-8">
        {/* Game Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-3xl mb-2 text-gray-800">Chess Master Analytics</h2>
              <p className="text-gray-600">Detailed performance insights for your game</p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={handleUploadUpdate}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Update
              </Button>
              <Button
                onClick={() => setShowDeleteModal(true)}
                variant="outline"
                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Game
              </Button>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              icon={<Users className="w-5 h-5" />}
              label="Active Players"
              value="1,247"
              change="+12.5%"
              positive={true}
              color="blue"
            />
            <MetricCard
              icon={<TrendingUp className="w-5 h-5" />}
              label="Total Players"
              value="15,420"
              change="+8.3%"
              positive={true}
              color="green"
            />
            <MetricCard
              icon={<Clock className="w-5 h-5" />}
              label="Avg. Session"
              value="18m 34s"
              change="+3.2%"
              positive={true}
              color="purple"
            />
            <MetricCard
              icon={<DollarSign className="w-5 h-5" />}
              label="Revenue"
              value="$2,845"
              change="+16.1%"
              positive={true}
              color="orange"
            />
          </div>
        </motion.div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Player Growth Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100"
          >
            <h3 className="text-xl mb-4 text-gray-800">Player Growth (Last 7 Days)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={playerData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" stroke="#888" />
                <YAxis stroke="#888" />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="players"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ fill: "#3b82f6", r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Revenue Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100"
          >
            <h3 className="text-xl mb-4 text-gray-800">Monthly Revenue</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" stroke="#888" />
                <YAxis stroke="#888" />
                <Tooltip />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        {/* Session Activity Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100"
        >
          <h3 className="text-xl mb-4 text-gray-800">Session Activity by Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={sessionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="hour" stroke="#888" />
              <YAxis stroke="#888" />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="sessions"
                stroke="#8b5cf6"
                strokeWidth={3}
                dot={{ fill: "#8b5cf6", r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteModal(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 50 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md mx-4"
            >
              <div className="bg-white rounded-2xl shadow-2xl p-8">
                <div className="text-center mb-6">
                  <div className="inline-block p-4 bg-red-100 rounded-full mb-4">
                    <Trash2 className="w-8 h-8 text-red-600" />
                  </div>
                  <h3 className="text-2xl mb-2 text-gray-800">Delete Game?</h3>
                  <p className="text-gray-600">
                    Are you sure you want to delete this game? This action cannot be undone.
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={() => setShowDeleteModal(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleDelete}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  change,
  positive,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  change: string;
  positive: boolean;
  color: string;
}) {
  const colorClasses = {
    blue: "from-blue-600 to-blue-500",
    green: "from-green-600 to-green-500",
    purple: "from-purple-600 to-purple-500",
    orange: "from-orange-600 to-orange-500",
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
      <div className="flex items-start justify-between mb-3">
        <div
          className={`p-3 bg-gradient-to-br ${colorClasses[color as keyof typeof colorClasses]} rounded-xl text-white`}
        >
          {icon}
        </div>
        <span className={`text-sm ${positive ? "text-green-600" : "text-red-600"}`}>
          {change}
        </span>
      </div>
      <p className="text-gray-600 text-sm mb-1">{label}</p>
      <p className="text-2xl text-gray-800">{value}</p>
    </div>
  );
}
