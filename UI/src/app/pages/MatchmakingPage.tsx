import { useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { motion } from "motion/react";
import { Loader2 } from "lucide-react";

export function MatchmakingPage() {
  const { gameId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    // Simulate matchmaking - in real app this would connect to matchmaking service
    const timer = setTimeout(() => {
      navigate(`/game/${gameId}`);
    }, 3000);

    return () => clearTimeout(timer);
  }, [gameId, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center px-6">
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
              <div className="w-32 h-32 border-4 border-blue-200 border-t-blue-600 rounded-full" />
            </motion.div>
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 -m-12"
            >
              <div className="w-40 h-40 border-4 border-blue-100 border-t-blue-400 rounded-full" />
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
          className="text-3xl mb-4 text-gray-800"
        >
          Finding Your Opponent
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-xl text-gray-600 mb-8"
        >
          Searching for players...
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex items-center justify-center gap-2"
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
              className="w-3 h-3 bg-blue-600 rounded-full"
            />
          ))}
        </motion.div>
      </div>
    </div>
  );
}
