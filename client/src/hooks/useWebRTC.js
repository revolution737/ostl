import { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';

const ICE_SERVERS = {
  iceServers: [
    // Google STUN — works when peers can reach each other directly
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    // Open Relay Project (metered.ca) free TURN — needed for phone↔laptop NAT traversal
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
};

export function useWebRTC(socket, roomId, isHost, reconnectKey = 0) {
  const [status, setStatus] = useState('disconnected'); // 'disconnected', 'connecting', 'connected', 'failed'
  const [messages, setMessages] = useState([]);
  
  const peerConnectionRef = useRef(null);
  const dataChannelRef = useRef(null);
  const initializationRef = useRef(false);
  // Direct callback ref — fires IMMEDIATELY when opponent data arrives,
  // bypassing React's state batching entirely.
  const onGameDataRef = useRef(null);

  const sendMessage = useCallback((payload) => {
    if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
      const messageObj = {
        id: uuidv4(),
        sender: 'me',
        data: payload,
        timestamp: Date.now(),
      };
      
      dataChannelRef.current.send(JSON.stringify(messageObj));

      let isSystem = false;
      try {
         const p = typeof payload === 'string' ? JSON.parse(payload) : payload;
         if (p && p.type && p.type.startsWith('SYS_')) {
            isSystem = true;
         }
      } catch(e) {}

      if (isSystem) {
         setMessages((prev) => [...prev, messageObj]);
      }
    } else {
      console.warn('[webrtc] Data channel is not open');
    }
  }, []);

  // Allow external components to register a direct data handler
  const setOnGameData = useCallback((callback) => {
    onGameDataRef.current = callback;
  }, []);

  useEffect(() => {
    if (!socket || !roomId) return;
    if (initializationRef.current) return;
    initializationRef.current = true;

    setStatus('connecting');

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionRef.current = pc;

    const initPeerConnection = async () => {
      // 1. Signal Attachment Listeners
      socket.on('receive_offer', async ({ offer }) => {
        if (isHost) return;
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('send_answer', { roomId, answer: pc.localDescription });
        } catch (e) {
          setStatus('failed');
        }
      });

      socket.on('receive_answer', async ({ answer }) => {
        if (!isHost) return;
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        } catch (e) {
          setStatus('failed');
        }
      });

      socket.on('receive_ice_candidate', async ({ candidate }) => {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {}
      });

      // 2. Build Core Structure Handshake
      if (isHost) {
        const dc = pc.createDataChannel('game-data');
        setupDataChannel(dc);
        
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('send_offer', { roomId, offer: pc.localDescription });
        } catch (e) {
          setStatus('failed');
        }
      } else {
        pc.ondatachannel = (event) => {
          setupDataChannel(event.channel);
        };
      }
    };

    function setupDataChannel(dc) {
      dataChannelRef.current = dc;
      dc.onopen = () => setStatus('connected');
      dc.onclose = () => setStatus('disconnected');
      dc.onerror = () => setStatus('failed');
      dc.onmessage = (event) => {
        try {
          const messageObj = JSON.parse(event.data);
          messageObj.sender = 'opponent';
          
          let isSystem = false;
          try {
             const payload = typeof messageObj.data === 'string' ? JSON.parse(messageObj.data) : messageObj.data;
             if (payload && payload.type && payload.type.startsWith('SYS_')) {
                 isSystem = true;
             }
          } catch(e) {}

          // CRITICAL: Fire the direct callback IMMEDIATELY natively to bypass React
          if (onGameDataRef.current && !isSystem) {
            onGameDataRef.current(messageObj.data);
          }
          
          // Only track structural chat state in React state arrays
          if (isSystem) {
            setMessages((prev) => [...prev, messageObj]);
          }
        } catch (e) {}
      };
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice_candidate', { roomId, candidate: event.candidate });
      }
    };
    
    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
         setStatus('failed');
      }
    };

    initPeerConnection();

    return () => {
      socket.off('receive_offer');
      socket.off('receive_answer');
      socket.off('receive_ice_candidate');
      
      if (dataChannelRef.current) dataChannelRef.current.close();
      pc.close();
      initializationRef.current = false;
      setStatus('disconnected');
    };
  }, [socket, roomId, isHost, reconnectKey]);

  return { status, messages, sendMessage, setOnGameData };
}
