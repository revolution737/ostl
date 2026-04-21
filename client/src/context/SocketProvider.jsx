import React, { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { v4 as uuidv4 } from "uuid";

const SocketContext = createContext(null);

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [uuid, setUuid] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // UUID lives in sessionStorage so each browser TAB gets its own identity.
    // This is critical for two-tab local testing — localStorage would make both
    // tabs share the same UUID, causing matchmaking deduplication to reject one.
    // The ostl_match_state reconnection payload (in localStorage) handles crash recovery.
    let storedUuid = sessionStorage.getItem("ostl_uuid");
    if (!storedUuid) {
      storedUuid = uuidv4();
      sessionStorage.setItem("ostl_uuid", storedUuid);
    }
    setUuid(storedUuid);

    // 2. Initialize Socket.IO connection
    // Safely fallback to window.location.origin for production monoliths
    const serverUrl = import.meta.env.VITE_API_URL
      ? import.meta.env.VITE_API_URL
      : import.meta.env.PROD
        ? window.location.origin
        : `${window.location.protocol}//${window.location.hostname}:3000`;

    const socketInstance = io(serverUrl, {
      // CRITICAL: Polling MUST be first for Railway/Nginx to handle the initial handshake
      transports: ["polling", "websocket"],
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socketInstance.on("connect", () => {
      console.log("[socket] Connected to server.", socketInstance.id);
      setIsConnected(true);
      // Immediately register our ephemeral presence
      socketInstance.emit("register", { uuid: storedUuid });
    });

    socketInstance.on("disconnect", () => {
      console.log("[socket] Disconnected from server.");
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
