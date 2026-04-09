// matchmaking.js — per-game queues + pairing logic

const crypto = require('crypto')

// Map<gameId, {uuid, displayName}[]>
const queues = new Map()

function enqueue(gameId, uuid, displayName) {
  if (!queues.has(gameId)) {
    queues.set(gameId, [])
  }

  const queue = queues.get(gameId)

  // don't double-queue the same player
  if (queue.find(p => p.uuid === uuid)) {
    console.log(`[matchmaking] ${uuid} already in queue for ${gameId}`)
    return null
  }

  queue.push({ uuid, displayName })
  console.log(`[matchmaking] ${uuid} ("${displayName}") queued for ${gameId} (queue size: ${queue.length})`)

  return tryMatch(gameId)
}

function tryMatch(gameId) {
  const queue = queues.get(gameId)
  if (!queue || queue.length < 2) return null

  const p1 = queue.shift()
  const p2 = queue.shift()
  const roomId = crypto.randomUUID()

  console.log(`[matchmaking] matched ${p1.uuid} + ${p2.uuid} → room ${roomId}`)

  return { 
    player1: p1.uuid, p1Name: p1.displayName,
    player2: p2.uuid, p2Name: p2.displayName,
    roomId, 
    gameId 
  }
}

// remove a player from all queues (e.g. on disconnect)
function dequeue(uuid) {
  for (const [gameId, queue] of queues) {
    const idx = queue.findIndex(p => p.uuid === uuid)
    if (idx !== -1) {
      queue.splice(idx, 1)
      console.log(`[matchmaking] removed ${uuid} from ${gameId} queue`)
    }
  }
}

function getQueues() {
  const result = {}
  for (const [gameId, queue] of queues) {
    result[gameId] = queue.map(p => ({ uuid: p.uuid, displayName: p.displayName }))
  }
  return result
}

module.exports = { enqueue, dequeue, getQueues }
