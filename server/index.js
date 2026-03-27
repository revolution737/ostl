require('dotenv').config()
const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const { registerHandlers } = require('./handlers')

const app = express()
app.use(express.static('public'))

const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: '*'
  }
})

// register all socket event handlers
registerHandlers(io)

const PORT = process.env.PORT || 3000
server.listen(PORT, () => {
  console.log(`[server] ostl. matchmaker running on port ${PORT}`)
})