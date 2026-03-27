// signaling.js — WebRTC signaling relay handlers

const { getUuid } = require('./players')
const { getOpponentUuid, getRoom } = require('./rooms')

function registerSignalingHandlers(socket, io, getSocketId) {
  socket.on('send_offer', ({ roomId, offer }) => {
    const uuid = getUuid(socket.id)
    const room = getRoom(roomId)
    if (!room) {
      console.log(`[signaling] send_offer: room ${roomId} not found`)
      return
    }
    const opponentUuid = getOpponentUuid(roomId, uuid)
    const opponentSocketId = getSocketId(opponentUuid)
    if (opponentSocketId) {
      io.to(opponentSocketId).emit('receive_offer', { offer })
      console.log(`[signaling] relayed offer from ${uuid} to ${opponentUuid}`)
    }
  })

  socket.on('send_answer', ({ roomId, answer }) => {
    const uuid = getUuid(socket.id)
    const room = getRoom(roomId)
    if (!room) {
      console.log(`[signaling] send_answer: room ${roomId} not found`)
      return
    }
    const opponentUuid = getOpponentUuid(roomId, uuid)
    const opponentSocketId = getSocketId(opponentUuid)
    if (opponentSocketId) {
      io.to(opponentSocketId).emit('receive_answer', { answer })
      console.log(`[signaling] relayed answer from ${uuid} to ${opponentUuid}`)
    }
  })

  socket.on('ice_candidate', ({ roomId, candidate }) => {
    const uuid = getUuid(socket.id)
    const room = getRoom(roomId)
    if (!room) {
      console.log(`[signaling] ice_candidate: room ${roomId} not found`)
      return
    }
    const opponentUuid = getOpponentUuid(roomId, uuid)
    const opponentSocketId = getSocketId(opponentUuid)
    if (opponentSocketId) {
      io.to(opponentSocketId).emit('receive_ice_candidate', { candidate })
      console.log(`[signaling] relayed ICE candidate from ${uuid} to ${opponentUuid}`)
    }
  })
}

module.exports = { registerSignalingHandlers }
