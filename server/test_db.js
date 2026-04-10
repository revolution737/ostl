const db = require('./db/pool');
db.query('SELECT slug FROM game_catalog').then(res => {
  console.log('SLUGS:', res.rows.map(r => r.slug));
  process.exit(0);
});
