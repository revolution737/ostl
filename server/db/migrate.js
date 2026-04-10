const { pool } = require('./pool');
const fs = require('fs');
const path = require('path');

async function runAutoMigration() {
  console.log('[db] Running auto-migrations...');
  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    // Run base schema (which creates tables if not exist)
    await pool.query(schemaSql);

    // Auto-patch old game_catalog instances missing the relation
    try {
      await pool.query(`
        ALTER TABLE game_catalog 
        ADD COLUMN developer_id INTEGER REFERENCES developers(id) ON DELETE CASCADE;
      `);
      console.log('[db] Successfully appended developer_id relation to game_catalog');
    } catch (err) {
      if (err.code !== '42701') { // 42701 = duplicate_column
        throw err;
      }
    }

    console.log('[db] Migrations verified successfully');
  } catch (err) {
    console.error('[db] Auto-migration failed:', err.message);
  }
}

module.exports = { runAutoMigration };
