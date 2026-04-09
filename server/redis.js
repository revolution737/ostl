// redis.js — ioredis client + connection helper
//
// Reads REDIS_URL from .env (e.g. redis://localhost:6379)
// Exports the client instance and a testRedisConnection() helper.
//
// Used by:
//   - index.js: wire @socket.io/redis-adapter for multi-instance Socket.IO
//   - matchmaking.js: Redis-backed queues so matches survive server restarts

const Redis = require('ioredis')

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'

// Create two clients — socket.io/redis-adapter needs separate pub/sub clients
function createClient() {
  const client = new Redis(REDIS_URL, {
    // Don't crash the server if Redis is unavailable — just retry quietly
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    retryStrategy(times) {
      if (times > 3) return null // stop retrying after 3 attempts
      return Math.min(times * 200, 1000)
    }
  })

  client.on('error', (err) => {
    // Suppress ECONNREFUSED spam — Redis is optional
    if (err.code !== 'ECONNREFUSED') {
      console.error('[redis] Unexpected error:', err.message)
    }
  })

  return client
}

const pubClient = createClient()
const subClient = pubClient.duplicate()

/**
 * Try to connect and verify Redis is reachable.
 * Returns true if successful, false otherwise.
 */
async function testRedisConnection() {
  try {
    await pubClient.connect()
    await pubClient.ping()
    console.log('[redis] Connected successfully')
    return true
  } catch (err) {
    console.warn('[redis] ⚠ Redis unavailable — matchmaking queues will use in-memory fallback.')
    console.warn('[redis]   Set REDIS_URL in .env to enable persistent queues and multi-instance scaling.')
    return false
  }
}

/**
 * Returns true if the pubClient is currently connected to Redis.
 */
function isRedisConnected() {
  return pubClient.status === 'ready'
}

module.exports = { pubClient, subClient, testRedisConnection, isRedisConnected }
