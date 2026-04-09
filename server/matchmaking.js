// matchmaking.js — per-game queues + pairing logic
//
// Uses Redis RPUSH/LPOP for persistent queues when Redis is available.
// Falls back to in-memory Maps if Redis is not configured or unreachable.

const crypto = require('crypto')
const { isRedisConnected, pubClient } = require('./redis')

// In-memory fallback — used when Redis is unavailable
const memQueues = new Map() // Map<gameId, {uuid, displayName}[]>

// ─── Redis helpers ────────────────────────────────────────

function redisQueueKey(gameId) {
  return `ostl:queue:${gameId}`
}

async function redisEnqueue(gameId, uuid, displayName) {
  const key = redisQueueKey(gameId)

  // Check for duplicates first (LRANGE and scan)
  const existing = await pubClient.lrange(key, 0, -1)
  for (const item of existing) {
    try {
      if (JSON.parse(item).uuid === uuid) {
        console.log(`[matchmaking] ${uuid} already in Redis queue for ${gameId}`)
        return null
      }
    } catch {}
  }

  await pubClient.rpush(key, JSON.stringify({ uuid, displayName }))
  const queueLen = await pubClient.llen(key)
  console.log(`[matchmaking] [redis] ${uuid} ("${displayName}") queued for ${gameId} (queue size: ${queueLen})`)

  return redisMatch(gameId)
}

async function redisMatch(gameId) {
  const key = redisQueueKey(gameId)
  const queueLen = await pubClient.llen(key)
  if (queueLen < 2) return null

  const raw1 = await pubClient.lpop(key)
  const raw2 = await pubClient.lpop(key)
  if (!raw1 || !raw2) return null

  const p1 = JSON.parse(raw1)
  const p2 = JSON.parse(raw2)
  const roomId = crypto.randomUUID()

  console.log(`[matchmaking] [redis] matched ${p1.uuid} + ${p2.uuid} → room ${roomId}`)

  return {
    player1: p1.uuid, p1Name: p1.displayName,
    player2: p2.uuid, p2Name: p2.displayName,
    roomId,
    gameId
  }
}

async function redisDequeue(uuid) {
  // We have to scan all queue keys — Redis KEYS is fine for dev scale
  const keys = await pubClient.keys('ostl:queue:*')
  for (const key of keys) {
    const items = await pubClient.lrange(key, 0, -1)
    for (const item of items) {
      try {
        if (JSON.parse(item).uuid === uuid) {
          await pubClient.lrem(key, 1, item)
          console.log(`[matchmaking] [redis] removed ${uuid} from ${key}`)
        }
      } catch {}
    }
  }
}

// ─── In-memory fallback ───────────────────────────────────

function memEnqueue(gameId, uuid, displayName) {
  if (!memQueues.has(gameId)) {
    memQueues.set(gameId, [])
  }

  const queue = memQueues.get(gameId)

  if (queue.find(p => p.uuid === uuid)) {
    console.log(`[matchmaking] [mem] ${uuid} already in queue for ${gameId}`)
    return null
  }

  queue.push({ uuid, displayName })
  console.log(`[matchmaking] [mem] ${uuid} ("${displayName}") queued for ${gameId} (queue size: ${queue.length})`)

  return memMatch(gameId)
}

function memMatch(gameId) {
  const queue = memQueues.get(gameId)
  if (!queue || queue.length < 2) return null

  const p1 = queue.shift()
  const p2 = queue.shift()
  const roomId = crypto.randomUUID()

  console.log(`[matchmaking] [mem] matched ${p1.uuid} + ${p2.uuid} → room ${roomId}`)

  return {
    player1: p1.uuid, p1Name: p1.displayName,
    player2: p2.uuid, p2Name: p2.displayName,
    roomId,
    gameId
  }
}

function memDequeue(uuid) {
  for (const [gameId, queue] of memQueues) {
    const idx = queue.findIndex(p => p.uuid === uuid)
    if (idx !== -1) {
      queue.splice(idx, 1)
      console.log(`[matchmaking] [mem] removed ${uuid} from ${gameId} queue`)
    }
  }
}

// ─── Public API ───────────────────────────────────────────

/**
 * Add a player to the queue for a game. Returns a match object if two players
 * are now waiting, or null if still waiting.
 */
async function enqueue(gameId, uuid, displayName) {
  if (isRedisConnected()) {
    return redisEnqueue(gameId, uuid, displayName)
  }
  return memEnqueue(gameId, uuid, displayName)
}

/**
 * Remove a player from all queues (e.g. on disconnect or cancel).
 */
async function dequeue(uuid) {
  if (isRedisConnected()) {
    return redisDequeue(uuid)
  }
  return memDequeue(uuid)
}

/**
 * Diagnostic — returns a snapshot of all in-memory queues.
 * When Redis is the backend, this only returns the mem fallback (may be empty).
 */
function getQueues() {
  const result = {}
  for (const [gameId, queue] of memQueues) {
    result[gameId] = queue.map(p => ({ uuid: p.uuid, displayName: p.displayName }))
  }
  return result
}

module.exports = { enqueue, dequeue, getQueues }
