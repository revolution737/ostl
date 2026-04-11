require("dotenv").config();
const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const { createAdapter } = require("@socket.io/redis-adapter");
const { registerHandlers } = require("./handlers");
const { testConnection } = require("./db/pool");
const { runAutoMigration } = require("./db/migrate");
const { pubClient, subClient, testRedisConnection } = require("./redis");
const { createGameServingMiddleware } = require("./middleware/gameServing");
const gamesRouter = require("./routes/games");
const authRouter = require("./routes/auth");
const { getQueues } = require("./matchmaking");
const { getRegisteredPlayers } = require("./players");
const { getActiveRooms } = require("./rooms");

const app = express();

// ─── Middleware ───────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve game assets from the uploads folder
app.use("/games", express.static(path.join(__dirname, "uploads/games")));

// CORS headers for API routes
app.use("/api", (req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS",
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// ─── REST API ────────────────────────────────────────────
app.use("/api/games", gamesRouter);
app.use("/api/auth", authRouter);

// ─── Debug Endpoint ──────────────────────────────────────
app.get("/api/debug", (req, res) => {
  res.json({
    players: getRegisteredPlayers(),
    queues: getQueues(),
    rooms: getActiveRooms(),
  });
});

// ─── Game Serving (uploaded + legacy games) ──────────────
app.use(createGameServingMiddleware());

// ─── Frontend Serving (React App) ──────────────────────────
const clientDistPath = path.join(__dirname, "../client/dist");
app.use(express.static(clientDistPath));

// SPA Fallback: Any unknown GET request goes to React Router
app.use((req, res, next) => {
  if (req.method !== "GET") return next();
  res.sendFile(path.join(clientDistPath, "index.html"), (err) => {
    if (err) {
      console.error("[server] SPA fallback sendFile error:", err);
      if (!res.headersSent)
        res
          .status(500)
          .send("Internal Server Error: Unable to serve index.html");
    }
  });
});

// ─── Socket.IO ───────────────────────────────────────────
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  // Explicitly allow fallback to polling if websockets fail
  transports: ["polling", "websocket"],
});

// Register all socket event handlers
registerHandlers(io);

// ─── Start ───────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

async function start() {
  server.listen(PORT, "0.0.0.0", () => {
    const os = require("os");
    const nets = os.networkInterfaces();
    let lanIp = "localhost";
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        if (net.family === "IPv4" && !net.internal) {
          lanIp = net.address;
          break;
        }
      }
      if (lanIp !== "localhost") break;
    }
    console.log(`[server] ostl. matchmaker running on port ${PORT}`);
    console.log(`[server] Local:   http://localhost:${PORT}/api/games`);
    console.log(`[server] Network: http://${lanIp}:${PORT}/api/games`);
  });

  // ─── Post-Startup Validation ────────────────────────────
  testRedisConnection()
    .then((redisOk) => {
      if (redisOk) {
        io.adapter(createAdapter(pubClient, subClient));
        console.log("[server] Socket.IO → Redis adapter active");
      } else {
        console.warn("[server] ⚠ Redis unavailable — using in-memory queues.");
      }
    })
    .catch((err) => console.error("[server] Redis check failed:", err.message));

  testConnection()
    .then(async (dbOk) => {
      if (!dbOk) {
        console.warn(
          "[server] ⚠ Database unavailable — history will not be persisted.",
        );
      } else {
        console.log("[server] Database connected successfully");
        await runAutoMigration();
      }
    })
    .catch((err) =>
      console.error("[server] Database check failed:", err.message),
    );
}

start();
