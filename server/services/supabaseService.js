const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
const mime = require('mime-types')

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY // Use Service Role Key for backend uploads

const supabase = createClient(supabaseUrl, supabaseKey)

const BUCKET_NAME = 'game-assets' // Make sure this bucket exists in Supabase and is Public

/**
 * Upload a directory recursively to Supabase Storage
 * @param {string} localDir - Absolute path to local directory
 * @param {string} storagePrefix - Path in Supabase bucket (e.g. 'games/slug')
 */
async function uploadDirectory(localDir, storagePrefix) {
  const files = fs.readdirSync(localDir, { recursive: true })
  
  for (const file of files) {
    const fullPath = path.join(localDir, file)
    if (fs.statSync(fullPath).isDirectory()) continue

    const storagePath = path.join(storagePrefix, file).replace(/\\/g, '/')
    const fileBuffer = fs.readFileSync(fullPath)
    const contentType = mime.lookup(fullPath) || 'application/octet-stream'

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, fileBuffer, {
        contentType,
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
