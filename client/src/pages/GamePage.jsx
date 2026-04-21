import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useWebRTC } from "../hooks/useWebRTC";
import { useSocket } from "../context/SocketProvider";
import { GameWrapper } from "../components/GameWrapper";
import {
  Send,
  LogOut,
  MessageSquareOff,
  RefreshCw,
  Home,
  WifiOff,
  Trophy,
  UserX,
  Swords,
  CheckCircle,
  MessageSquare,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function GamePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { socket, uuid } = useSocket();

  const [sessionContext, setSessionContext] = useState(() => {
    let context = location.state;
    if (context) {
      if (uuid) context.uuid = uuid;
      localStorage.setItem("ostl_match_state", JSON.stringify(context));
      return context;
    }
    const stored = localStorage.getItem("ostl_match_state");
    if (stored) {
      return JSON.parse(stored);
    }
    return null;
  });

  const roomId = sessionContext?.roomId || "";
  const isHost = sessionContext?.isHost || false;
  const opponentName = sessionContext?.opponentName || "Opponent";
  const displayName = sessionContext?.displayName || "Unknown Player";

  useEffect(() => {
    if (!sessionContext || !sessionContext.roomId) {
      navigate("/");
    }
  }, [sessionContext, navigate]);

  // 2. State & Hooks
  const [chatOpen, setChatOpen] = useState(false); // mobile chat drawer
  const [chatInput, setChatInput] = useState("");
  const [chatEnabled, setChatEnabled] = useState(true);
  const [opponentChatDisabled, setOpponentChatDisabled] = useState(false);
  const scrollRef = useRef(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectKey, setReconnectKey] = useState(0);

  const [gameKey, setGameKey] = useState(Date.now());
  const [gameOverData, setGameOverData] = useState(null);
  const [rematchState, setRematchState] = useState("idle");

  const { status, messages, sendMessage, setOnGameData } = useWebRTC(
    socket,
    roomId,
    isHost,
    reconnectKey,
  );

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on("opponent_reconnecting", ({ opponentName }) => {
      setIsReconnecting(true);
    });

    socket.on("opponent_rejoined", ({ opponentName }) => {
      setIsReconnecting(false);
      setReconnectKey((prev) => prev + 1);
    });

    socket.on("opponent_disconnected", () => {
      setIsReconnecting("failed");
    });

    return () => {
      socket.off("opponent_reconnecting");
      socket.off("opponent_rejoined");
      socket.off("opponent_disconnected");
    };
  }, [socket]);

  useEffect(() => {
    let recent = messages[messages.length - 1];
    if (recent && recent.sender === "opponent") {
      try {
        const d = JSON.parse(recent.data);
        if (d.type === "SYS_CHAT_STATUS") {
          setOpponentChatDisabled(d.disabled);
        } else if (d.type === "SYS_REMATCH_REQ") {
          if (rematchState === "requested_by_me") {
             handleRematchAccepted();
          } else {
             setRematchState("requested_by_opponent");
          }
        } else if (d.type === "SYS_REMATCH_ACC") {
          handleRematchAccepted();
        }
      } catch (e) {}
    }
  }, [messages, rematchState]);

  const handleRematchAccepted = () => {
    setGameOverData(null);
    setRematchState("idle");
    setGameKey(Date.now());
  };

  const requestRematch = () => {
    setRematchState("requested_by_me");
    sendMessage(JSON.stringify({ type: "SYS_REMATCH_REQ" }));
  };

  const acceptRematch = () => {
    sendMessage(JSON.stringify({ type: "SYS_REMATCH_ACC" }));
    handleRematchAccepted();
  };

  const toggleChat = () => {
    const nextState = !chatEnabled;
    setChatEnabled(nextState);
    sendMessage(
      JSON.stringify({ type: "SYS_CHAT_STATUS", disabled: !nextState }),
    );
  };

  const leaveMatch = () => {
    socket.emit("match_ended", { roomId });
    localStorage.removeItem("ostl_match_state");
    navigate("/");
  };

  const handleChatSend = (e) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || !chatEnabled) return;

    sendMessage(
      JSON.stringify({
        type: "SYS_CHAT",
        author: displayName,
        text: chatInput,
      }),
    );
    setChatInput("");
  };

  const chatHistory = messages
    .filter((msg) => {
      try {
        return JSON.parse(msg.data).type === "SYS_CHAT";
      } catch (e) {
        return false;
      }
    })
    .map((msg) => ({
      id: msg.id,
      sender: msg.sender,
      data: JSON.parse(msg.data),
    }));

  const scrollTriggerLength = messages.length;
  useEffect(() => {
    if (scrollRef.current)
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [scrollTriggerLength]);

  // ChatBubble Component moved outside to prevent re-mounts on keystrokes

  if (!roomId) return null;

  // CRITICAL FIX: Base URL handling
  let gamePath =
    sessionContext?.playUrl ||
    `/games/${sessionContext?.gameId || "dummy-game"}/index.html`;

  // Ensure we point to the Express backend explicitly if the frontend is hosted elsewhere
  const apiBase = import.meta.env.PROD ? (import.meta.env.VITE_API_URL || "") : "";
  if (gamePath.startsWith("/")) {
    gamePath = `${apiBase}${gamePath}`;
  }

  // Chat panel — shared markup used on both desktop and mobile drawer
  const ChatPanel = (
    <>
      {/* Panel header */}
      <div className="p-4 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 tracking-wide">
          Match Chat
        </h3>
        <div className="flex gap-2">
          <button
            onClick={toggleChat}
            className={`p-2 rounded-md transition-colors ${
              chatEnabled
                ? "text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800"
                : "bg-gray-100 text-gray-400 dark:bg-slate-800"
            }`}
            title="Toggle Chat"
          >
            <MessageSquareOff className="w-4 h-4" />
          </button>
          {/* Close button — only visible on mobile */}
          <button
            onClick={() => setChatOpen(false)}
            className="md:hidden p-2 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            title="Close Chat"
          >
            <X className="w-4 h-4" />
          </button>
          <button
            onClick={leaveMatch}
            className="p-2 rounded-md text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            title="Leave Match"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 relative overflow-hidden bg-gray-50/50 dark:bg-slate-900/50">
        {!chatEnabled && (
          <div className="absolute inset-0 z-20 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-none">
            <MessageSquareOff size={32} className="text-gray-400 mb-2" />
            <p className="text-sm font-medium text-gray-500">You Disabled Chat</p>
          </div>
        )}
        <div ref={scrollRef} className="h-full overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {chatHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-gray-400 dark:text-gray-600 h-full">
              <MessageSquareOff size={32} className="mb-3 opacity-20" />
              <p className="text-xs font-mono uppercase tracking-widest opacity-50">
                No Messages Yet
              </p>
            </div>
          ) : (
            chatHistory.map((msg) => <ChatBubble key={msg.id} msg={msg} />)
          )}
        </div>
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950">
        <form onSubmit={handleChatSend} className="relative flex gap-2">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder={
              !chatEnabled
                ? "Chat disabled"
                : opponentChatDisabled
                  ? `${opponentName} disabled chat`
                  : status === "connected"
                    ? "Type a message..."
                    : "Waiting for connection..."
            }
            disabled={
              status !== "connected" ||
              !chatEnabled ||
              isReconnecting ||
              opponentChatDisabled
            }
            className="flex-1 bg-gray-100 dark:bg-slate-900 border border-transparent focus:border-blue-500 rounded-full pl-4 pr-10 py-2.5 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            maxLength={200}
          />
          <button
            type="submit"
            disabled={
              status !== "connected" ||
              !chatEnabled ||
              isReconnecting ||
              opponentChatDisabled ||
              !chatInput.trim()
            }
            className="absolute right-1 top-1 bottom-1 aspect-square flex items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-slate-800 disabled:text-gray-500 transition-colors"
            title="Send"
          >
            <Send size={15} className="-ml-0.5" />
          </button>
        </form>
      </div>
    </>
  );

  return (
    <div className="h-[100dvh] bg-gray-50 dark:bg-black flex flex-col overflow-hidden font-sans">
      <AnimatePresence>
        {isReconnecting === true && (
          <ReconnectingOverlay opponentName={opponentName} />
        )}
        {isReconnecting === "failed" && (
          <OpponentLeftOverlay
            opponentName={opponentName}
            onLeave={leaveMatch}
            onRetry={() => {
              localStorage.removeItem("ostl_match_state");
              navigate(
                `/matchmaking/${sessionContext?.gameId || "dummy-game"}`,
                {
                  state: {
                    gameId: sessionContext?.gameId || "dummy-game",
                    displayName,
                  },
                },
              );
            }}
          />
        )}
        {gameOverData && (
          <GameOverOverlay
            winner={gameOverData.winner}
            isHost={isHost}
            opponentName={opponentName}
            rematchState={rematchState}
            onRequestRematch={requestRematch}
            onAcceptRematch={acceptRematch}
            onLeave={leaveMatch}
          />
        )}
      </AnimatePresence>

      <div className="flex-1 flex overflow-hidden">
        {/* ── Game Canvas ── */}
        <div className="flex-1 bg-white dark:bg-black p-2 md:p-4 relative flex flex-col min-w-0">
          <div className="flex-1 bg-gradient-to-br from-blue-50 to-gray-50 dark:from-slate-900 dark:to-slate-950 rounded-2xl border-2 border-gray-200 dark:border-slate-800 flex flex-col relative overflow-hidden shadow-inner min-h-0">
            <GameWrapper
              roomId={roomId}
              isHost={isHost}
              gamePath={gamePath}
              onDisconnect={leaveMatch}
              status={status}
              messages={messages}
              sendMessage={sendMessage}
              isReconnecting={isReconnecting}
              setOnGameData={setOnGameData}
              gameKey={gameKey}
              onGameOver={(data) => setGameOverData(data)}
            />
          </div>
        </div>

        {/* ── Desktop Chat Sidebar (md+) ── */}
        <div className="hidden md:flex w-80 bg-white dark:bg-slate-950 border-l border-gray-200 dark:border-slate-800 flex-col shadow-2xl relative z-10">
          {ChatPanel}
        </div>
      </div>

      {/* ── Mobile: Floating Chat Toggle Button ── */}
      <button
        onClick={() => setChatOpen(true)}
        className="md:hidden fixed bottom-5 right-5 z-40 flex items-center justify-center w-14 h-14 rounded-full bg-blue-600 text-white shadow-xl shadow-blue-500/30 hover:bg-blue-700 active:scale-95 transition-all"
        aria-label="Open Chat"
      >
        <MessageSquare size={22} />
        {chatHistory.length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 text-[10px] font-bold bg-rose-500 text-white rounded-full flex items-center justify-center">
            {chatHistory.length > 9 ? '9+' : chatHistory.length}
          </span>
        )}
      </button>

      {/* ── Mobile Chat Drawer ── */}
      <AnimatePresence>
        {chatOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="chat-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setChatOpen(false)}
              className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            />
            {/* Drawer */}
            <motion.div
              key="chat-drawer"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex flex-col bg-white dark:bg-slate-950 rounded-t-3xl shadow-2xl border-t border-gray-200 dark:border-slate-800"
              style={{ maxHeight: "75dvh", height: "75dvh" }}
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-slate-700" />
              </div>
              {ChatPanel}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

const ChatBubble = ({ msg }) => {
  const isMe = msg.sender === "me";
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex ${isMe ? "justify-end" : "justify-start"}`}
    >
      <div className="flex flex-col max-w-[70%]">
        <span
          className={`text-[10px] uppercase font-mono tracking-wider mb-1 px-1 ${isMe ? "text-right text-gray-500" : "text-left text-gray-500"}`}
        >
          {isMe ? "You" : msg.data.author}
        </span>
        <div
          className={`px-4 py-2 rounded-2xl shadow-sm ${isMe ? "bg-blue-600 text-white rounded-br-[4px]" : "bg-gray-100 text-gray-800 rounded-bl-[4px] dark:bg-gray-800 dark:text-gray-100"}`}
        >
          <p className="text-sm">{msg.data.text}</p>
        </div>
      </div>
    </motion.div>
  );
};
// Overlays
function ReconnectingOverlay({ opponentName }) {
  const [timeLeft, setTimeLeft] = useState(90);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: 50 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="w-full max-w-md mx-4"
      >
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-8 text-center border border-gray-100 dark:border-slate-800">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="mb-6"
          >
            <div className="inline-block p-6 bg-gradient-to-br from-orange-400 to-orange-500 rounded-full shadow-lg shadow-orange-500/30">
              <WifiOff className="w-16 h-16 text-white" />
            </div>
          </motion.div>
          <h3 className="text-3xl font-bold mb-2 text-gray-800 dark:text-white">
            Connection Lost
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            {opponentName} disconnected...
          </p>
          <p className="text-gray-500 dark:text-gray-500 text-sm mb-8">
            Waiting {timeLeft} seconds for reconnection...
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

function OpponentLeftOverlay({ opponentName, onLeave, onRetry }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: 50 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="w-full max-w-md mx-4"
      >
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-8 text-center border border-gray-100 dark:border-slate-800">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="mb-6"
          >
            <div className="inline-block p-6 bg-gradient-to-br from-red-400 to-red-500 rounded-full shadow-lg shadow-red-500/30">
              <UserX className="w-16 h-16 text-white" />
            </div>
          </motion.div>
          <h3 className="text-3xl font-bold mb-2 text-gray-800 dark:text-white">
            Opponent Left
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            The grace period expired. The match has been terminated.
          </p>
          <div className="flex gap-3">
            <button
              onClick={onLeave}
              className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-800 dark:text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <Home size={18} /> Home
            </button>
            <button
              onClick={onRetry}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-blue-500/30"
            >
              <RefreshCw size={18} /> Play Again
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function GameOverOverlay({ winner, isHost, opponentName, rematchState, onRequestRematch, onAcceptRematch, onLeave }) {
  const isWinner =
    (winner === "Host" && isHost) || (winner === "Guest" && !isHost);
  const isDraw = winner === "Draw";

  const getTitle = () => {
    if (isDraw) return "Match Drawn!";
    return isWinner ? "Victory!" : "Defeat...";
  };

  const getSubtitle = () => {
    if (isDraw) return "It was a hard-fought battle.";
    return isWinner ? "You outplayed your opponent." : "Better luck next time.";
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: 50 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-8 text-center border border-gray-100 dark:border-slate-800"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="mb-6 flex justify-center"
        >
          <div
            className={`inline-block p-6 rounded-full shadow-lg ${
              isDraw
                ? "bg-gradient-to-br from-gray-400 to-gray-500 shadow-gray-500/30"
                : isWinner
                  ? "bg-gradient-to-br from-emerald-400 to-emerald-500 shadow-emerald-500/30"
                  : "bg-gradient-to-br from-red-400 to-red-500 shadow-red-500/30"
            }`}
          >
            {isDraw ? (
              <Swords className="w-16 h-16 text-white" />
            ) : isWinner ? (
              <Trophy className="w-16 h-16 text-white" />
            ) : (
              <X className="w-16 h-16 text-white" />
            )}
          </div>
        </motion.div>

        <h3 className="text-4xl font-extrabold mb-2 text-gray-800 dark:text-white">
          {getTitle()}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-8 font-medium">
          {getSubtitle()}
        </p>

        {rematchState === "requested_by_opponent" ? (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-6 border border-blue-100 dark:border-blue-800/30 mb-6">
            <p className="text-sm text-blue-700 dark:text-blue-300 font-medium mb-4">
              {opponentName} requested a rematch!
            </p>
            <button
              onClick={onAcceptRematch}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30 transition-all"
            >
              <Swords size={18} /> Accept Rematch
            </button>
          </div>
        ) : rematchState === "requested_by_me" ? (
          <div className="bg-gray-50 dark:bg-slate-800/50 rounded-2xl p-6 mb-6">
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium flex items-center justify-center gap-2">
              <CheckCircle size={16} className="text-emerald-500" /> Waiting for {opponentName}...
            </p>
          </div>
        ) : (
          <div className="mb-6">
            <button
              onClick={onRequestRematch}
              className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
            >
              <RefreshCw size={18} /> Request Rematch
            </button>
          </div>
        )}

        <button
          onClick={onLeave}
          className="w-full py-3.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-950 dark:hover:bg-slate-800/80 text-gray-700 dark:text-gray-300 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
        >
          <LogOut size={18} /> Leave Match
        </button>
      </motion.div>
    </motion.div>
  );
}
