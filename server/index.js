require('dotenv').config()
const express = require('express')
const http = require('http')
const { Server } = require('socket.io')

const app = express()
const server = http.createServer(app)
const io = new Server(server)

io.on('connection', (socket) => {
  console.log('user connected:', socket.id)

  socket.on('disconnect', () => {
    console.log('user disconnected:', socket.id)
  })
})

const PORT = process.env.PORT || 3000
server.listen(PORT, () => {
  console.log(`server running on port ${PORT}`)
})
