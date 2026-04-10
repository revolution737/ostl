require('dotenv').config({ path: '../.env' });
const path = require('path');
const supabase = require('../services/supabaseService');

const SLUG = 'neon-fleet-battleships';
const SOURCE_DIR = path.resolve(__dirname, '../../games/battleships');

async function doUpload() {
  try {
    console.log(`Starting upload to ${SLUG}...`);
    const playUrl = await supabase.uploadDirectory(SOURCE_DIR, `games/${SLUG}`);
    console.log('Upload success!', playUrl);
  } catch(e) {
    console.error('Error:', e);
  }
}

doUpload();
