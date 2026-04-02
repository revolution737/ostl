// matchLog.js — Log completed matches to PostgreSQL
//
// Called from handlers.js when match_ended fires.
// Also tracks match start times so we can compute duration.

const db = require('./db/pool')

// In-memory map of roomId → startedAt timestamp
// Set when a room is created, consumed when the match ends
const matchStartTimes = new Map()

/**
 * Record when a match starts (call this from createRoom in handlers.js)
 */
function recordMatchStart(roomId) {
  matchStartTimes.set(roomId, Date.now())
}

/**
 * Log a completed match to the database.
 * @param {string} roomId
 * @param {string} gameSlug - which game was played (maps to game_catalog.slug)
 * @param {string} player1Uuid
 * @param {string} player2Uuid
 * @param {string|null} winnerUuid - optional, null if no winner reported
 */
async function logMatch(roomId, gameSlug, player1Uuid, player2Uuid, winnerUuid = null) {
  const startedAt = matchStartTimes.get(roomId)
  const endedAt = Date.now()
  const durationMs = startedAt ? (endedAt - startedAt) : 0

  // Clean up
  matchStartTimes.delete(roomId)

  try {
    await db.query(`
      INSERT INTO match_history (room_id, game_slug, player1_uuid, player2_uuid, started_at, ended_at, duration_ms, winner_uuid)
      VALUES ($1, $2, $3, $4, to_timestamp($5::double precision / 1000), to_timestamp($6::double precision / 1000), $7, $8)
    `, [
      roomId,
      gameSlug || null,
      player1Uuid,
      player2Uuid,
      startedAt || endedAt,
      endedAt,
      durationMs,
      winnerUuid
    ])

    console.log(`[matchLog] Logged match ${roomId}: ${player1Uuid} vs ${player2Uuid} (${durationMs}ms, game: ${gameSlug})`)
  } catch (err) {
    // Non-fatal — don't crash the server if logging fails
    console.error(`[matchLog] Failed to log match ${roomId}:`, err.message)
  }
}

module.exports = { recordMatchStart, logMatch }
