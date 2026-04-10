import { useState } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Send, MessageSquareOff, LogOut, Trophy, UserX, Wifi, WifiOff } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { ScrollArea } from "../components/ui/scroll-area";

type GameState = "playing" | "ended" | "opponent_left" | "reconnecting";

export function GamePage() {
  const navigate = useNavigate();
  const [chatEnabled, setChatEnabled] = useState(true);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([
    { sender: "opponent", text: "Good luck!" },
    { sender: "you", text: "You too!" },
  ]);
  const [gameState, setGameState] = useState<GameState>("playing");

  const handleSendMessage = () => {
    if (message.trim()) {
      setMessages([...messages, { sender: "you", text: message }]);
      setMessage("");
    }
  };

  const handleLeaveGame = () => {
    navigate("/");
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Game Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Game Canvas Area */}
        <div className="flex-1 bg-white p-6 relative">
          <div className="h-full bg-gradient-to-br from-blue-50 to-gray-50 rounded-2xl border-2 border-gray-200 flex items-center justify-center relative overflow-hidden">
            {/* Game Canvas Placeholder */}
            <div className="text-center">
              <div className="inline-block p-8 bg-white rounded-2xl shadow-lg">
                <div className="text-6xl mb-4">🎮</div>
                <p className="text-gray-600 text-lg">Game Canvas Area</p>
                <p className="text-gray-400 text-sm mt-2">
                  Game content will be rendered here
                </p>
              </div>
            </div>

            {/* Demo buttons for state changes */}
            <div className="absolute bottom-6 left-6 flex gap-2">
              <Button
                size="sm"
                onClick={() => setGameState("ended")}
                className="bg-green-600 hover:bg-green-700"
              >
                Simulate Win
              </Button>
              <Button
                size="sm"
                onClick={() => setGameState("opponent_left")}
                className="bg-red-600 hover:bg-red-700"
              >
                Simulate Leave
              </Button>
              <Button
                size="sm"
                onClick={() => setGameState("reconnecting")}
                className="bg-yellow-600 hover:bg-yellow-700"
              >
                Simulate Reconnect
              </Button>
            </div>
          </div>
        </div>

        {/* Chat Sidebar */}
        <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
          {/* Chat Header */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg text-gray-800">Chat</h3>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setChatEnabled(!chatEnabled)}
                className={chatEnabled ? "" : "bg-gray-100"}
              >
                <MessageSquareOff className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleLeaveGame}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-3">
              {messages.map((msg, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex ${msg.sender === "you" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[70%] px-4 py-2 rounded-2xl ${
                      msg.sender === "you"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    <p className="text-sm">{msg.text}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </ScrollArea>

          {/* Message Input */}
          {chatEnabled && (
            <div className="p-4 border-t border-gray-200">
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Type a message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                  className="flex-1"
                />
                <Button
                  onClick={handleSendMessage}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
          {!chatEnabled && (
            <div className="p-4 border-t border-gray-200 text-center text-gray-500 text-sm">
              Chat is disabled
            </div>
          )}
        </div>
      </div>

      {/* Game State Overlays */}
      <AnimatePresence>
        {gameState === "ended" && (
          <GameEndedOverlay onClose={() => setGameState("playing")} onLeave={handleLeaveGame} />
        )}
        {gameState === "opponent_left" && (
          <OpponentLeftOverlay onClose={() => setGameState("playing")} onLeave={handleLeaveGame} />
        )}
        {gameState === "reconnecting" && (
          <ReconnectingOverlay onClose={() => setGameState("playing")} />
        )}
      </AnimatePresence>
    </div>
  );
}

function GameEndedOverlay({ onClose, onLeave }: { onClose: () => void; onLeave: () => void }) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: 50 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md mx-4"
      >
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="mb-6"
          >
            <div className="inline-block p-6 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full">
              <Trophy className="w-16 h-16 text-white" />
            </div>
          </motion.div>
          <h3 className="text-3xl mb-2 text-gray-800">Victory!</h3>
          <p className="text-gray-600 mb-8">Congratulations! You won the game.</p>
          <div className="flex gap-3">
            <Button onClick={onClose} variant="outline" className="flex-1">
              Continue
            </Button>
            <Button onClick={onLeave} className="flex-1 bg-blue-600 hover:bg-blue-700">
              Leave Game
            </Button>
          </div>
        </div>
      </motion.div>
    </>
  );
}

function OpponentLeftOverlay({ onClose, onLeave }: { onClose: () => void; onLeave: () => void }) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: 50 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md mx-4"
      >
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="mb-6"
          >
            <div className="inline-block p-6 bg-gradient-to-br from-red-400 to-red-500 rounded-full">
              <UserX className="w-16 h-16 text-white" />
            </div>
          </motion.div>
          <h3 className="text-3xl mb-2 text-gray-800">Opponent Left</h3>
          <p className="text-gray-600 mb-8">Your opponent has disconnected from the game.</p>
          <div className="flex gap-3">
            <Button onClick={onClose} variant="outline" className="flex-1">
              Wait
            </Button>
            <Button onClick={onLeave} className="flex-1 bg-blue-600 hover:bg-blue-700">
              Leave Game
            </Button>
          </div>
        </div>
      </motion.div>
    </>
  );
}

function ReconnectingOverlay({ onClose }: { onClose: () => void }) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: 50 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md mx-4"
      >
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="mb-6"
          >
            <div className="inline-block p-6 bg-gradient-to-br from-orange-400 to-orange-500 rounded-full">
              <WifiOff className="w-16 h-16 text-white" />
            </div>
          </motion.div>
          <h3 className="text-3xl mb-2 text-gray-800">Reconnecting...</h3>
          <p className="text-gray-600 mb-8">Opponent is trying to reconnect to the game.</p>
          <div className="flex items-center justify-center gap-2">
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
                className="w-3 h-3 bg-orange-600 rounded-full"
              />
            ))}
          </div>
          <Button onClick={onClose} variant="outline" className="mt-6">
            Dismiss
          </Button>
        </div>
      </motion.div>
    </>
  );
}
