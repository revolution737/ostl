// db/pool.js — PostgreSQL connection pool
//
// Reads DATABASE_URL from .env (e.g. postgres://user:pass@localhost:5432/ostl)
// Falls back to individual PG* env vars if DATABASE_URL is not set.
// Exports the pool instance + a convenience query helper.

const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // sensible defaults for a dev/mini-project deployment
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000
})

pool.on('error', (err) => {
  console.error('[db] Unexpected pool error:', err.message)
})

/**
 * Convenience wrapper — use like:
 *   const { rows } = await db.query('SELECT * FROM game_catalog WHERE is_active = $1', [true])
 */
async function query(text, params) {
  const start = Date.now()
  const res = await pool.query(text, params)
  const duration = Date.now() - start
  if (duration > 200) {
    console.warn(`[db] Slow query (${duration}ms): ${text.slice(0, 80)}`)
  }
  return res
}

/**
 * Try to connect and verify the database is reachable.
 * Returns true if successful, false otherwise.
 */
async function testConnection() {
  try {
    const client = await pool.connect()
    await client.query('SELECT 1')
    client.release()
    console.log('[db] PostgreSQL connected successfully')
    return true
  } catch (err) {
    console.error('[db] PostgreSQL connection failed:', err.message)
    console.error('[db] Make sure DATABASE_URL is set in .env and the database exists.')
    return false
  }
}

module.exports = { pool, query, testConnection }
