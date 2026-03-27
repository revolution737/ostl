// rooms.js — active room registry + disconnect timers

const DISCONNECT_GRACE_MS = 15_000

// Map<roomId, { players: [uuid, uuid], gameId }>
const rooms = new Map()

// Map<uuid, { timerId, roomId }>
const disconnectTimers = new Map()

// Map<uuid, roomId> — quick lookup
const playerToRoom = new Map()

function createRoom(roomId, uuid1, uuid2, gameId) {
  rooms.set(roomId, {
    players: [uuid1, uuid2],
    gameId
  })
  playerToRoom.set(uuid1, roomId)
  playerToRoom.set(uuid2, roomId)
  console.log(`[rooms] created room ${roomId}: ${uuid1} vs ${uuid2} (${gameId})`)
}

function getRoom(roomId) {
  return rooms.get(roomId)
}

function getRoomByPlayer(uuid) {
  const roomId = playerToRoom.get(uuid)
  if (!roomId) return null
  return { roomId, ...rooms.get(roomId) }
}

function getOpponentUuid(roomId, uuid) {
  const room = rooms.get(roomId)
  if (!room) return null
  return room.players.find(p => p !== uuid) || null
}

function removeRoom(roomId) {
  const room = rooms.get(roomId)
  if (room) {
    room.players.forEach(uuid => playerToRoom.delete(uuid))
    rooms.delete(roomId)
    console.log(`[rooms] removed room ${roomId}`)
  }
}

function startDisconnectTimer(uuid, roomId, io, getSocketId) {
  // clear any existing timer first
  cancelDisconnectTimer(uuid)

  console.log(`[rooms] starting ${DISCONNECT_GRACE_MS / 1000}s disconnect timer for ${uuid}`)

  const timerId = setTimeout(() => {
    disconnectTimers.delete(uuid)
    const opponentUuid = getOpponentUuid(roomId, uuid)
    if (opponentUuid) {
      const opponentSocketId = getSocketId(opponentUuid)
      if (opponentSocketId) {
        io.to(opponentSocketId).emit('opponent_disconnected', { roomId })
        console.log(`[rooms] notified ${opponentUuid} that ${uuid} permanently disconnected`)
      }
    }
    removeRoom(roomId)
  }, DISCONNECT_GRACE_MS)

  disconnectTimers.set(uuid, { timerId, roomId })
}

function cancelDisconnectTimer(uuid) {
  const entry = disconnectTimers.get(uuid)
  if (entry) {
    clearTimeout(entry.timerId)
    disconnectTimers.delete(uuid)
    console.log(`[rooms] cancelled disconnect timer for ${uuid} (rejoined)`)
    return entry.roomId
  }
  return null
}

module.exports = {
  createRoom,
  getRoom,
  getRoomByPlayer,
  getOpponentUuid,
  removeRoom,
  startDisconnectTimer,
  cancelDisconnectTimer
}
