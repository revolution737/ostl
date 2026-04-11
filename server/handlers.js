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
const { recordMatchStart, logMatch } = require('./matchLog')

function registerHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`[server] socket connected: ${socket.id}`)

    // --- UUID Registration ---
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
    socket.on('find_match', async ({ gameId, displayName }) => {
      try {
        const uuid = getUuid(socket.id)
        if (!uuid) {
          console.log(`[server] find_match failed: socket ${socket.id} not registered yet. Client must emit 'register' first.`)
          return
        }

        const match = await enqueue(gameId, uuid, displayName)
        if (match) {
          const { player1, p1Name, player2, p2Name, roomId } = match

          createRoom(roomId, player1, player2, gameId)
          recordMatchStart(roomId)

          const s1 = getSocketId(player1)
          const s2 = getSocketId(player2)

          // CRITICAL FIX: Use io.in(socketId).socketsJoin(roomId)
          // This is cluster-safe and works even with Redis adapters, unlike io.sockets.sockets.get()
          if (s1) io.in(s1).socketsJoin(roomId)
          if (s2) io.in(s2).socketsJoin(roomId)

          // emit match_found
          io.to(s1).emit('match_found', { roomId, isHost: true, opponentName: p2Name })
          io.to(s2).emit('match_found', { roomId, isHost: false, opponentName: p1Name })

          console.log(`[server] match_found emitted → room ${roomId}`)
        }
      } catch (err) {
        console.error(`[server] find_match error:`, err);
      }
    })

    socket.on('leave_queue', async () => {
      try {
        const uuid = getUuid(socket.id)
        if (uuid) {
          await dequeue(uuid)
        }
      } catch (err) {
        console.error(`[server] leave_queue error:`, err);
      }
    })

    // --- Signaling ---
    registerSignalingHandlers(socket, io, getSocketId)

    // --- Match Ended ---
    socket.on('match_ended', ({ roomId }) => {
      const uuid = getUuid(socket.id)
      console.log(`[server] match_ended from ${uuid} for room ${roomId}`)

      const room = getRoom(roomId)
      if (room) {
        logMatch(roomId, room.gameId, room.players[0], room.players[1], null)
      }

      socket.to(roomId).emit('opponent_disconnected', { roomId })
      removeRoom(roomId)
    })

    // --- Disconnect ---
    socket.on('disconnect', async () => {
      try {
        const uuid = getUuid(socket.id)
        console.log(`[server] socket disconnected: ${socket.id} (uuid: ${uuid || 'unregistered'})`)

        if (uuid) {
          await dequeue(uuid)

          const roomInfo = getRoomByPlayer(uuid)
          if (roomInfo) {
            startDisconnectTimer(uuid, roomInfo.roomId, io, getSocketId)
          }

          unregisterPlayer(socket.id)
        }
      } catch (err) {
        console.error(`[server] disconnect error:`, err);
      }
    })
  })
}

module.exports = { registerHandlers }