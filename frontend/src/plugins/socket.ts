import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

// WebSocket URL
// In development (Vite dev server on :5173), use the backend on :9876
// In production (served from backend), use same origin
const getSocketURL = () => {
  if (typeof window === 'undefined') return 'http://localhost:9876';

  // If running on Vite dev server (port 5173), point to backend
  if (window.location.port === '5173') {
    return 'http://localhost:9876';
  }

  // Otherwise use same origin (production)
  return window.location.origin;
};

const socketUrl = getSocketURL();

export function createSocket(): Socket {
  if (socket) {
    return socket;
  }

  socket = io(socketUrl, {
    withCredentials: true,
    autoConnect: false,
    transports: ['websocket', 'polling'],
    auth: (cb) => {
      // Extract token from cookie
      const token = document.cookie
        .split('; ')
        .find((row) => row.startsWith('token='))
        ?.split('=')[1];
      cb({ token });
    },
  });

  socket.on('connect', () => {
    console.log('Socket connected');
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
  });

  socket.on('reconnect', (attemptNumber) => {
    console.log('Socket reconnected after', attemptNumber, 'attempts');
    // Rejoin user room after reconnection
    socket?.emit('rejoin', {});
  });

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function connectSocket(): void {
  if (socket && !socket.connected) {
    socket.connect();
  }
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
  }
}
