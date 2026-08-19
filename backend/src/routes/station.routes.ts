import { Router } from 'express';
import { TrafikverketService } from '../services/trafikverket.service';
import prisma from '../prisma';
import { adminMiddleware, authMiddleware } from '../middleware/auth.middleware';

const router = Router();

let trafikverketService: TrafikverketService;

export function setTrafikverketService(service: TrafikverketService) {
  trafikverketService = service;
}

router.get('/', async (req, res, next) => {
  try {
    const findStations = () => prisma.station.findMany({
      select: {
        signature: true,
        advertisedName: true,
        shortName: true,
      },
      orderBy: {
        advertisedName: 'asc',
      },
    });

    let stations = await findStations();

    // Recover automatically if a previous refresh left the cache empty. This
    // also gives a startup sync that hit a transient upstream failure another
    // chance when the picker is opened.
    if (stations.length === 0 && trafikverketService) {
      await trafikverketService.syncStations();
      stations = await findStations();
    }

    res.json({ stations });
  } catch (error) {
    next(error);
  }
});

router.post('/sync', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    if (!trafikverketService) {
      return res.status(503).json({ error: 'Trafikverket service not initialized' });
    }

    const count = await trafikverketService.syncStations();
    res.json({ success: true, stationCount: count });
  } catch (error) {
    next(error);
  }
});

export default router;
