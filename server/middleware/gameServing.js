// middleware/gameServing.js — Serve uploaded game builds
//
// Priority:
//   1. uploads/games/<slug>/   (local extracts)
//   2. ../../games/<slug>/     (repo-level legacy)
//   3. Supabase Storage        (fallback, cached locally on first hit)

const express = require('express')
const path = require('path')
const fs = require('fs')

function createGameServingMiddleware() {
  const router = express.Router()

  const uploadsDir = path.resolve(__dirname, '..', 'uploads', 'games')
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })

  const staticOpts = {
    extensions: ['html'],
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html'))       res.setHeader('Content-Type', 'text/html')
      else if (filePath.endsWith('.wasm'))  res.setHeader('Content-Type', 'application/wasm')
      else if (filePath.endsWith('.pck'))   res.setHeader('Content-Type', 'application/octet-stream')
    }
  }

  // Shared security header
  router.use('/games', (req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff')
    next()
  })

  // 1. Local uploads
  router.use('/games', express.static(uploadsDir, staticOpts))

  // 2. Repo-level legacy games
  const repoGamesDir = path.resolve(__dirname, '..', '..', 'games')
  if (fs.existsSync(repoGamesDir)) {
    router.use('/games', express.static(repoGamesDir, staticOpts))
  }

  // 3. Supabase fallback — fetch missing files, cache locally, serve
  //    Uses router.use('/games', ...) to avoid Express 5 path-to-regexp issues
  if (process.env.SUPABASE_URL) {
    router.use('/games', async (req, res, next) => {
      // req.path looks like /slug/file.html or /slug/subdir/file.js
      const relPath  = req.path.replace(/^\//, '') // strip leading slash
      const localPath = path.join(uploadsDir, relPath)

      if (fs.existsSync(localPath) && fs.statSync(localPath).isFile()) return next()

      const remoteUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/game-assets/games/${relPath}`

      try {
        const response = await fetch(remoteUrl)
        if (!response.ok) return next()

        const buffer = Buffer.from(await response.arrayBuffer())

        // Cache locally
        const dir = path.dirname(localPath)
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
        fs.writeFileSync(localPath, buffer)
        console.log(`[gameServing] Restored from Supabase → ${relPath}`)

        // Always derive MIME from extension — Supabase often returns text/plain for .html
        const ext = path.extname(relPath).toLowerCase()
        const mimeMap = {
          '.html': 'text/html; charset=utf-8',
          '.js':   'text/javascript',
          '.css':  'text/css',
          '.wasm': 'application/wasm',
          '.pck':  'application/octet-stream',
          '.png':  'image/png',
          '.jpg':  'image/jpeg',
          '.svg':  'image/svg+xml',
          '.json': 'application/json',
        }
        res.setHeader('Content-Type', mimeMap[ext] || 'application/octet-stream')
        res.send(buffer)
      } catch (err) {
        console.error(`[gameServing] Supabase fallback error for ${relPath}:`, err.message)
        next()
      }
    })
  }

  return router
}

module.exports = { createGameServingMiddleware }
