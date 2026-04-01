import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';

const SocketContext = createContext(null);

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [uuid, setUuid] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // 1. Manage ephemeral UUID
    let storedUuid = localStorage.getItem('ostl_uuid');
    if (!storedUuid) {
      storedUuid = uuidv4();
      localStorage.setItem('ostl_uuid', storedUuid);
    }
    setUuid(storedUuid);

    // 2. Initialize Socket.IO connection
    // In production this would point to the deployed backend URL
    const socketInstance = io(import.meta.env.PROD ? '/' : 'http://localhost:3000', {
       transports: ['websocket'],
       reconnectionDelay: 1000,
       reconnectionDelayMax: 5000,
    });

    socketInstance.on('connect', () => {
      console.log('[socket] Connected to server.', socketInstance.id);
      setIsConnected(true);
      // Immediately register our ephemeral presence
      socketInstance.emit('register', { uuid: storedUuid });
    });

    socketInstance.on('disconnect', () => {
      console.log('[socket] Disconnected from server.');
      setIsConnected(false);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, uuid, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};
