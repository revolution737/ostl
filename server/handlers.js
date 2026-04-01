// handlers.js — main Socket.IO connection orchestrator

const { registerPlayer, unregisterPlayer, getSocketId, getUuid } = require('./players')
const { enqueue, dequeue } = require('./matchmaking')
const {
  createRoom,
  getRoom,
  getRoomByPlayer,
  removeRoom,
  startDisconnectTimer,
  cancelDisconnectTimer
} = require('./rooms')
const { registerSignalingHandlers } = require('./signaling')

function registerHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`[server] socket connected: ${socket.id}`)

    // --- UUID Registration ---
    // the client must emit this immediately after connecting
    socket.on('register', ({ uuid }) => {
      if (!uuid) {
        console.log(`[server] register: no uuid provided`)
        return
      }

      registerPlayer(socket, uuid)

      // check if this player is rejoining an active room
      const rejoinedRoomId = cancelDisconnectTimer(uuid)
      if (rejoinedRoomId) {
        const room = getRoom(rejoinedRoomId)
        if (room) {
          socket.join(rejoinedRoomId)
          socket.emit('rejoin', { roomId: rejoinedRoomId })
          socket.to(rejoinedRoomId).emit('opponent_rejoined', { roomId: rejoinedRoomId })
          console.log(`[server] ${uuid} rejoined room ${rejoinedRoomId}`)
        }
      }
    })

    // --- Matchmaking ---
    socket.on('find_match', ({ gameId, displayName }) => {
      const uuid = getUuid(socket.id)
      if (!uuid) {
        console.log(`[server] find_match: socket ${socket.id} not registered`)
        return
      }

      const match = enqueue(gameId, uuid, displayName)
      if (match) {
        const { player1, p1Name, player2, p2Name, roomId } = match

        // create room
        createRoom(roomId, player1, player2, gameId)

        // get sockets and join them to the Socket.IO room
        const s1 = getSocketId(player1)
        const s2 = getSocketId(player2)

        const sock1 = io.sockets.sockets.get(s1)
        const sock2 = io.sockets.sockets.get(s2)

        if (sock1) sock1.join(roomId)
        if (sock2) sock2.join(roomId)

        // emit match_found with opponent names mapped
        io.to(s1).emit('match_found', { roomId, isHost: true, opponentName: p2Name })
        io.to(s2).emit('match_found', { roomId, isHost: false, opponentName: p1Name })

        console.log(`[server] match_found emitted → room ${roomId}`)
      }
    })

    socket.on('leave_queue', () => {
      const uuid = getUuid(socket.id)
      if (uuid) {
        dequeue(uuid)
      }
    })

    // --- Signaling ---
    registerSignalingHandlers(socket, io, getSocketId)

    // --- Match Ended ---
    socket.on('match_ended', ({ roomId }) => {
      const uuid = getUuid(socket.id)
      console.log(`[server] match_ended from ${uuid} for room ${roomId}`)
      socket.to(roomId).emit('opponent_disconnected', { roomId })
      removeRoom(roomId)
    })

    // --- Disconnect ---
    socket.on('disconnect', () => {
      const uuid = getUuid(socket.id)
      console.log(`[server] socket disconnected: ${socket.id} (uuid: ${uuid})`)

      if (uuid) {
        dequeue(uuid)

        const roomInfo = getRoomByPlayer(uuid)
        if (roomInfo) {
          startDisconnectTimer(uuid, roomInfo.roomId, io, getSocketId)
        }

        // unregister the socket mapping but keep room alive for reconnect
        unregisterPlayer(socket.id)
      }
    })
  })
}

module.exports = { registerHandlers }
