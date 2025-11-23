import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { rateLimitMiddleware } from '../middleware/rateLimit.middleware';
import { TrafikverketService } from '../services/trafikverket.service';
import searchHistoryService from '../services/search-history.service';
import logger from '../utils/logger';
import prisma from '../prisma';

const router = Router();

let trafikverketService: TrafikverketService;

export function setTrafikverketService(service: TrafikverketService) {
  trafikverketService = service;
}

const searchSchema = z.object({
  stationSignature: z.string().min(1),
  stationName: z.string().min(1).optional(),
  destSignature: z.string().min(1).optional(),
  destName: z.string().min(1).optional(),
  startDate: z.string(), // ISO date
  endDate: z.string(), // ISO date
  minDelayMinutes: z.number().int().min(1).optional().default(20),
});

router.post(
  '/search',
  authMiddleware,
  rateLimitMiddleware,
  async (req: AuthRequest, res, next) => {
    try {
      const { stationSignature, stationName, destSignature, destName, startDate, endDate, minDelayMinutes } = searchSchema.parse(req.body);

      logger.info(
        `Delay search by ${req.user!.email} for station ${stationSignature} from ${startDate} to ${endDate}`
      );

      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { hideBusReplacedTrains: true },
      });

      let delays = destSignature
        ? await trafikverketService.fetchRouteDelays(
            stationSignature,
            destSignature,
            startDate,
            endDate,
            minDelayMinutes
          )
        : await trafikverketService.fetchStationDelays(
            stationSignature,
            startDate,
            endDate,
            minDelayMinutes
          );

      if (user?.hideBusReplacedTrains) {
        const beforeCount = delays.length;
        delays = delays.filter(delay => {
          const shouldKeep = !delay.delayReason.toLowerCase().includes('buss ersätter');
          if (!shouldKeep) {
            logger.debug(`Filtering out train ${delay.trainNumber} with reason: ${delay.delayReason}`);
          }
          return shouldKeep;
        });
        logger.info(`Bus filter: ${beforeCount} trains -> ${delays.length} trains (removed ${beforeCount - delays.length})`);
      }

      let resolvedStationName = stationName;
      let resolvedDestName = destName;

      if (!resolvedStationName) {
        const station = await prisma.station.findUnique({
          where: { signature: stationSignature },
        });
        resolvedStationName = station?.advertisedName || stationSignature;
      }

      if (destSignature && !resolvedDestName) {
        const destStation = await prisma.station.findUnique({
          where: { signature: destSignature },
        });
        resolvedDestName = destStation?.advertisedName || destSignature;
      }

      try {
        await searchHistoryService.createSearchHistory({
          userId: req.user!.id,
          searchType: 'manual',
          stationSignature,
          stationName: resolvedStationName,
          destSignature: destSignature || undefined,
          destName: resolvedDestName || undefined,
          startDate,
          endDate,
          delayThreshold: minDelayMinutes,
          results: delays,
          success: true,
        });
      } catch (historyError: any) {
        logger.error(`Failed to save manual search to history: ${historyError.message}`);
      }

      res.json({
        success: true,
        delays,
        count: delays.length,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
