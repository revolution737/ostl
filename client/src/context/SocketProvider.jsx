import React, { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { v4 as uuidv4 } from "uuid";

const SocketContext = createContext(null);

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [uuid, setUuid] = useState(() => {
    // Attempt to recover UUID from an active match in localStorage (CRASH RECOVERY)
    let stateStr = localStorage.getItem("ostl_match_state");
    let recoveredUuid = null;
    if (stateStr) {
      try {
        const stateObj = JSON.parse(stateStr);
        if (stateObj.uuid) recoveredUuid = stateObj.uuid;
      } catch (e) {}
    }

    let storedUuid = sessionStorage.getItem("ostl_uuid");
    
    // If we recovered a crash, forcibly use the recovered UUID to authenticate on reconnect
    if (recoveredUuid) {
       storedUuid = recoveredUuid;
       sessionStorage.setItem("ostl_uuid", storedUuid);
    } else if (!storedUuid) {
       storedUuid = uuidv4();
       sessionStorage.setItem("ostl_uuid", storedUuid);
    }
    return storedUuid;
  });
  
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {

    // Initialize Socket.IO connection
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
      socketInstance.emit("register", { uuid });
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
