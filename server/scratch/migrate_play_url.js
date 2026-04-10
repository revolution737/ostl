const { Pool } = require('pg');
require('dotenv').config();

// Initialize the connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  try {
    console.log('[migration] Starting database synchronization...');

    // 1. Add the play_url column safely
    await pool.query("ALTER TABLE game_catalog ADD COLUMN IF NOT EXISTS play_url TEXT;");
    console.log('[migration] Verified: play_url column exists.');
    
    // 2. BACKFILL: Update existing games to point to Supabase
    // We reconstruct the public URL base from your .env
    const supabaseProject = process.env.SUPABASE_URL.split('//')[1].split('.supabase.co')[0];
    const baseUrl = `https://${supabaseProject}.supabase.co/storage/v1/object/public/game-assets/games`;
    
    const { rowCount } = await pool.query(`
      UPDATE game_catalog 
      SET play_url = CONCAT('${baseUrl}/', slug, '/index.html')
      WHERE play_url IS NULL;
    `);
    
    console.log(`[migration] Success: Backfilled ${rowCount} games with cloud URLs.`);
    console.log('[migration] Your team members can now load game assets from Supabase.');
    
  } catch (err) {
    console.error('[migration] Critical Error during migration:', err.message);
  } finally {
    await pool.end();
  }
}

migrate();
