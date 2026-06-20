import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';

export const useSocket = (eventHandlers = {}) => {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    // Only connect if user is logged in
    if (!isAuthenticated) {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      return;
    }

    const socketUrl = import.meta.env.VITE_WS_URL || 'http://localhost:3000';
    
    socketRef.current = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    socketRef.current.on('connect', () => {
      console.log('Real-time connection established:', socketRef.current.id);
      setIsConnected(true);
    });

    socketRef.current.on('disconnect', () => {
      console.log('Real-time connection disconnected');
      setIsConnected(false);
    });

    // Register dynamic event handlers passed to the hook
    Object.entries(eventHandlers).forEach(([eventName, handler]) => {
      socketRef.current.on(eventName, handler);
    });

    return () => {
      if (socketRef.current) {
        Object.keys(eventHandlers).forEach((eventName) => {
          socketRef.current.off(eventName);
        });
        socketRef.current.disconnect();
      }
    };
  }, [isAuthenticated, eventHandlers]);

  return { isConnected, socket: socketRef.current };
};
