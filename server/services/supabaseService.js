const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
const mime = require('mime-types')

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY // Use Service Role Key for backend uploads

const supabase = createClient(supabaseUrl, supabaseKey)

const BUCKET_NAME = 'game-assets' // Make sure this bucket exists in Supabase and is Public

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath)
  arrayOfFiles = arrayOfFiles || []

  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles)
    } else {
      arrayOfFiles.push(path.join(dirPath, "/", file))
    }
  })
  return arrayOfFiles
}

/**
 * Upload a directory recursively to Supabase Storage
 * @param {string} localDir - Absolute path to local directory
 * @param {string} storagePrefix - Path in Supabase bucket (e.g. 'games/slug')
 */
async function uploadDirectory(localDir, storagePrefix) {
  const files = getAllFiles(localDir);
  
  for (const fullPath of files) {
    const file = path.relative(localDir, fullPath);

    const storagePath = path.join(storagePrefix, file).replace(/\\/g, '/')
    const fileBuffer = fs.readFileSync(fullPath)
    let contentType = mime.lookup(fullPath) || 'application/octet-stream';
    
    // Explicitly enforce HTML MIME binding to prevent text/plain misinterpretations by cloud storage
    if (fullPath.endsWith('.html')) {
        contentType = 'text/html; charset=utf-8';
    } else if (fullPath.endsWith('.css')) {
        contentType = 'text/css; charset=utf-8';
    } else if (fullPath.endsWith('.js')) {
        contentType = 'application/javascript; charset=utf-8';
    }

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, fileBuffer, {
        contentType,
        cacheControl: '3600',
        upsert: true
      })

    if (error) {
      console.error(`[supabase] Upload failed for ${file}:`, error.message)
      throw error
    }
  }

  // Generate the public base URL for this folder
  const { data } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(`${storagePrefix}/index.html`)

  return data.publicUrl
}

module.exports = {
  supabase,
  uploadDirectory,
  BUCKET_NAME
}
