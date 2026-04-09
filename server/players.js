// players.js — UUID ↔ Socket mapping

const uuidToSocketId = new Map()
const socketIdToUuid = new Map()

function registerPlayer(socket, uuid) {
  // if this UUID was already mapped to a different socket, clean up the old one
  if (uuidToSocketId.has(uuid)) {
    const oldSocketId = uuidToSocketId.get(uuid)
    socketIdToUuid.delete(oldSocketId)
  }

  uuidToSocketId.set(uuid, socket.id)
  socketIdToUuid.set(socket.id, uuid)
  console.log(`[players] registered ${uuid} → ${socket.id}`)
}

function unregisterPlayer(socketId) {
  const uuid = socketIdToUuid.get(socketId)
  if (uuid) {
    uuidToSocketId.delete(uuid)
    socketIdToUuid.delete(socketId)
    console.log(`[players] unregistered ${uuid} (was ${socketId})`)
  }
  return uuid
}

function getSocketId(uuid) {
  return uuidToSocketId.get(uuid)
}

function getUuid(socketId) {
  return socketIdToUuid.get(socketId)
}

function getRegisteredPlayers() {
  const result = []
  for (const [socketId, uuid] of socketIdToUuid) {
    result.push({ socketId, uuid })
  }
  return result
}

module.exports = { registerPlayer, unregisterPlayer, getSocketId, getUuid, getRegisteredPlayers }
