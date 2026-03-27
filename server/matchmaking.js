// matchmaking.js — per-game queues + pairing logic

const crypto = require('crypto')

// Map<gameId, uuid[]>
const queues = new Map()

function enqueue(gameId, uuid) {
  if (!queues.has(gameId)) {
    queues.set(gameId, [])
  }

  const queue = queues.get(gameId)

  // don't double-queue the same player
  if (queue.includes(uuid)) {
    console.log(`[matchmaking] ${uuid} already in queue for ${gameId}`)
    return null
  }

  queue.push(uuid)
  console.log(`[matchmaking] ${uuid} queued for ${gameId} (queue size: ${queue.length})`)

  return tryMatch(gameId)
}

function tryMatch(gameId) {
  const queue = queues.get(gameId)
  if (!queue || queue.length < 2) return null

  const player1 = queue.shift()
  const player2 = queue.shift()
  const roomId = crypto.randomUUID()

  console.log(`[matchmaking] matched ${player1} + ${player2} → room ${roomId}`)

  return { player1, player2, roomId, gameId }
}

// remove a player from all queues (e.g. on disconnect)
function dequeue(uuid) {
  for (const [gameId, queue] of queues) {
    const idx = queue.indexOf(uuid)
    if (idx !== -1) {
      queue.splice(idx, 1)
      console.log(`[matchmaking] removed ${uuid} from ${gameId} queue`)
    }
  }
}

module.exports = { enqueue, dequeue }
