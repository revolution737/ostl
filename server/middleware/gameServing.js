// middleware/gameServing.js — Serve uploaded game builds
//
// Mounts Express static file serving on /games/<slug>/
// so any uploaded game can be loaded in an iframe at:
//   /games/my-cool-game/index.html
//
// Also serves legacy games from the ../games/ directory at the repo root
// to maintain backward compatibility with the dummy-game.

const express = require('express')
const path = require('path')
const fs = require('fs')

function createGameServingMiddleware() {
  const router = express.Router()

  // Primary: serve from uploads/games/<slug>/
  const uploadsDir = path.resolve(__dirname, '..', 'uploads', 'games')
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true })
  }

  // Set proper MIME types and security headers for game content
  router.use('/games', (req, res, next) => {
    // Allow the iframe to run scripts and access same-origin resources
    res.setHeader('X-Content-Type-Options', 'nosniff')
    next()
  })

  // Serve uploaded games from uploads/games/
  router.use('/games', express.static(uploadsDir, {
    extensions: ['html'],
    setHeaders: (res, filePath) => {
      // Set correct MIME types for game assets
      if (filePath.endsWith('.wasm')) {
        res.setHeader('Content-Type', 'application/wasm')
      } else if (filePath.endsWith('.pck')) {
        res.setHeader('Content-Type', 'application/octet-stream')
      }
    }
  }))

  // Fallback: serve from the repo-level games/ directory  
  // (backward compatibility for games placed there directly, like dummy-game)
  const repoGamesDir = path.resolve(__dirname, '..', '..', 'games')
  if (fs.existsSync(repoGamesDir)) {
    router.use('/games', express.static(repoGamesDir, {
      extensions: ['html'],
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.wasm')) {
          res.setHeader('Content-Type', 'application/wasm')
        } else if (filePath.endsWith('.pck')) {
          res.setHeader('Content-Type', 'application/octet-stream')
        }
      }
    }))
  }

  return router
}

module.exports = { createGameServingMiddleware }
