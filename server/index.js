require('dotenv').config()
const express = require('express')
const http = require('http')
const path = require('path')
const { Server } = require('socket.io')
const { registerHandlers } = require('./handlers')
const { testConnection } = require('./db/pool')
const { createGameServingMiddleware } = require('./middleware/gameServing')
const gamesRouter = require('./routes/games')
const { getQueues } = require('./matchmaking')
const { getRegisteredPlayers } = require('./players')
const { getActiveRooms } = require('./rooms')

const app = express()

// ─── Middleware ───────────────────────────────────────────
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// CORS headers for API routes (the client runs on a different port in dev)
app.use('/api', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.sendStatus(204)
  next()
})

// ─── REST API ────────────────────────────────────────────
app.use('/api/games', gamesRouter)

// ─── Debug Endpoint ──────────────────────────────────────
app.get('/api/debug', (req, res) => {
  res.json({
    players: getRegisteredPlayers(),
    queues: getQueues(),
    rooms: getActiveRooms()
  })
})

// ─── Game Serving (uploaded + legacy games) ──────────────
app.use(createGameServingMiddleware())

// ─── Dev Test Harness ────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')))

// ─── Socket.IO ───────────────────────────────────────────
const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: '*'
  }
})

// Register all socket event handlers
registerHandlers(io)

// ─── Start ───────────────────────────────────────────────
const PORT = process.env.PORT || 3000

async function start() {
  // Test DB connection (non-blocking — server starts even if DB is down)
  const dbOk = await testConnection()
  if (!dbOk) {
    console.warn('[server] ⚠ Running WITHOUT database — API routes will fail.')
    console.warn('[server]   Set DATABASE_URL in .env and run db/schema.sql')
  }

  server.listen(PORT, () => {
    console.log(`[server] ostl. matchmaker running on port ${PORT}`)
    console.log(`[server] REST API:       http://localhost:${PORT}/api/games`)
    console.log(`[server] Game files:     http://localhost:${PORT}/games/<slug>/index.html`)
    console.log(`[server] Test harness:   http://localhost:${PORT}`)
  })
}

start()