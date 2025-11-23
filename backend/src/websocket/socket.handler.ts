import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger';

function extractToken(socket: any): string | null {
  // Prefer auth payload (works for non-httpOnly cookies)
  if (socket.handshake?.auth?.token) {
    return socket.handshake.auth.token;
  }

  // Fallback: read token cookie directly (works with httpOnly cookies)
  const cookieHeader = socket.handshake?.headers?.cookie as string | undefined;
  if (!cookieHeader) return null;

  const cookies = Object.fromEntries(
    cookieHeader.split(';').map((cookie) => {
      const [key, ...rest] = cookie.trim().split('=');
      return [key, rest.join('=')];
    })
  );

  return cookies['token'] || null;
}

export function initSocket(httpServer: HTTPServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
    },
    path: '/socket.io',
  });

  // Authentication middleware
  io.use((socket, next) => {
    try {
      const token = extractToken(socket);

      if (!token) {
        logger.warn('Socket connection attempted without token');
        return next(new Error('Authentication error'));
      }

      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        logger.error('JWT_SECRET not configured');
        return next(new Error('Server configuration error'));
      }

      const decoded = jwt.verify(token, jwtSecret) as { userId: number; email: string };

      socket.data.userId = decoded.userId;
      socket.data.email = decoded.email;

      next();
    } catch (error) {
      logger.warn('Socket authentication failed', error);
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId;
    const email = socket.data.email;

    logger.info(`Socket connected: user ${email} (${userId})`);

    // Join user-specific room
    socket.join(`user:${userId}`);

    // Handle reconnection - rejoin room
    socket.on('rejoin', (data) => {
      logger.debug(`User ${userId} rejoining room`);
      socket.join(`user:${userId}`);
    });

    socket.on('disconnect', (reason) => {
      logger.info(`Socket disconnected: user ${email} (${userId}), reason: ${reason}`);
    });
  });

  logger.info('Socket.IO server initialized');

  return io;
}
