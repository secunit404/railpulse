import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { createServer } from 'http';
import logger from './utils/logger';
import { initSocket } from './websocket/socket.handler';
import { TrafikverketService } from './services/trafikverket.service';
import { DiscordService } from './services/discord.service';
import { SchedulerService } from './services/scheduler.service';
import { errorMiddleware } from './middleware/error.middleware';
import prisma from './prisma';

// Routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import monitorRoutes, { setSchedulerService } from './routes/monitor.routes';
import delayRoutes, { setTrafikverketService } from './routes/delay.routes';
import stationRoutes, { setTrafikverketService as setStationTrafikverketService } from './routes/station.routes';
import searchHistoryRoutes from './routes/search-history.routes';
import healthRoutes from './routes/health.routes';

async function bootstrap() {
  try {
    logger.info('Starting RailPulse backend server...');

    // Validate environment variables
    const requiredEnvVars = ['JWT_SECRET', 'TRAFIKVERKET_API_KEY', 'DATABASE_URL'];
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
      }
    }

    // Initialize Prisma
    await prisma.$connect();
    logger.info('Database connected');

    // Initialize Express
    const app = express();
    const httpServer = createServer(app);

    // Middleware
    // CORS: In production, frontend is served from same origin (no CORS needed)
    // In development, allow localhost:5173 for Vite dev server
    const isDev = process.env.NODE_ENV !== 'production';

    if (isDev) {
      // Development: Allow Vite dev server
      app.use(cors({
        origin: 'http://localhost:5173',
        credentials: true,
      }));
    }
    // Production: No CORS needed (same origin)
    app.use(express.json());
    app.use(cookieParser());

    // Initialize Socket.IO
    const io = initSocket(httpServer);

    // Initialize services
    const trafikverketService = new TrafikverketService(
      prisma,
      process.env.TRAFIKVERKET_API_KEY!
    );

    const discordService = new DiscordService();

    const schedulerService = new SchedulerService(
      prisma,
      io,
      trafikverketService,
      discordService
    );

    // Inject services into routes
    setSchedulerService(schedulerService);
    setTrafikverketService(trafikverketService);
    setStationTrafikverketService(trafikverketService);

    // Routes
    app.use('/api/auth', authRoutes);
    app.use('/api/user', userRoutes);
    app.use('/api/monitors', monitorRoutes);
    app.use('/api/delays', delayRoutes);
    app.use('/api/stations', stationRoutes);
    app.use('/api/search-history', searchHistoryRoutes);
    app.use('/api/health', healthRoutes);

    // Serve static files in both production and development
    const staticPath = path.resolve(__dirname, '../public');
    app.use(express.static(staticPath));

    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
        return next();
      }
      res.sendFile(path.join(staticPath, 'index.html'));
    });

    // Error handling middleware (must be last)
    app.use(errorMiddleware);

    // Initialize scheduler
    await schedulerService.init();

    // Sync stations on startup (if cache is stale)
    logger.info('Checking station cache...');
    await trafikverketService.syncStations().catch((err) => {
      logger.warn(`Failed to sync stations on startup: ${err.message}`);
    });

    // Start server
    const port = process.env.PORT || 9876;
    httpServer.listen(port, () => {
      logger.info(`Server started on port ${port}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down gracefully');
      await prisma.$disconnect();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      logger.info('SIGINT received, shutting down gracefully');
      await prisma.$disconnect();
      process.exit(0);
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

bootstrap();
