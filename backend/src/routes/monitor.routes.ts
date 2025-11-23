import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { SchedulerService } from '../services/scheduler.service';
import logger from '../utils/logger';
import prisma from '../prisma';

const router = Router();
const DEFAULT_TIMEZONE = process.env.TZ || 'Europe/Stockholm';

let schedulerService: SchedulerService;

export function setSchedulerService(service: SchedulerService) {
  schedulerService = service;
}

const createMonitorSchema = z.object({
  name: z.string().min(1).max(100),
  stationSignature: z.string().min(1),
  stationName: z.string().min(1),
  destSignature: z.string().min(1),
  destName: z.string().min(1),
  scheduleTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional().nullable(),
  runMode: z.enum(['daily', 'one-time']).default('daily'),
  scheduleDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  scheduleEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  timezone: z.string().min(1).optional(),
  delayThreshold: z.number().int().min(1).max(120).optional().default(20),
  discordWebhookUrl: z.string().url().optional().nullable(),
});

const updateMonitorSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  stationSignature: z.string().min(1).optional(),
  stationName: z.string().min(1).optional(),
  destSignature: z.string().min(1).optional(),
  destName: z.string().min(1).optional(),
  scheduleTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  runMode: z.enum(['daily', 'one-time']).optional(),
  scheduleDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  scheduleEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  timezone: z.string().min(1).optional(),
  delayThreshold: z.number().int().min(1).max(120).optional(),
  discordWebhookUrl: z.string().url().optional().nullable(),
  active: z.boolean().optional(),
});

router.get('/', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const monitors = await prisma.monitor.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ monitors });
  } catch (error) {
    next(error);
  }
});

router.post('/', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const data = createMonitorSchema.parse(req.body);

    if (data.runMode === 'daily' && !data.scheduleTime) {
      res.status(400).json({ error: 'Daily monitors require scheduleTime (HH:mm)' });
      return;
    }

    const timezone = data.timezone ?? DEFAULT_TIMEZONE;

    const monitorCount = await prisma.monitor.count({
      where: { userId: req.user!.id },
    });

    if (monitorCount >= 10) {
      res.status(400).json({ error: 'Maximum 10 monitors per user' });
      return;
    }

    const station = await prisma.station.findUnique({
      where: { signature: data.stationSignature },
    });

    if (!station) {
      res.status(400).json({ error: 'Invalid station signature' });
      return;
    }

    const monitor = await prisma.monitor.create({
      data: {
        ...data,
        timezone,
        userId: req.user!.id,
      },
    });

    schedulerService.addJob(monitor);

    logger.info(`Monitor created: ${data.name} by ${req.user!.email}`);

    res.json({ success: true, monitor });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const monitorId = parseInt(req.params.id, 10);
    const data = updateMonitorSchema.parse(req.body);

    const monitor = await prisma.monitor.findUnique({
      where: { id: monitorId },
    });

    if (!monitor) {
      res.status(404).json({ error: 'Monitor not found' });
      return;
    }

    if (monitor.userId !== req.user!.id) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    if (data.stationSignature) {
      const station = await prisma.station.findUnique({
        where: { signature: data.stationSignature },
      });

      if (!station) {
        res.status(400).json({ error: 'Invalid station signature' });
        return;
      }
    }

    const timezone = data.timezone ?? monitor.timezone ?? DEFAULT_TIMEZONE;
    const effectiveRunMode = data.runMode ?? monitor.runMode ?? 'daily';
    const effectiveScheduleTime = data.scheduleTime ?? monitor.scheduleTime;

    if (effectiveRunMode === 'daily' && !effectiveScheduleTime) {
      res.status(400).json({ error: 'Daily monitors require scheduleTime (HH:mm)' });
      return;
    }

    const updatedMonitor = await prisma.monitor.update({
      where: { id: monitorId },
      data: {
        ...data,
        timezone,
      },
    });

    schedulerService.updateJob(updatedMonitor);

    logger.info(`Monitor updated: ${monitorId} by ${req.user!.email}`);

    res.json({ success: true, monitor: updatedMonitor });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const monitorId = parseInt(req.params.id, 10);

    const monitor = await prisma.monitor.findUnique({
      where: { id: monitorId },
    });

    if (!monitor) {
      res.status(404).json({ error: 'Monitor not found' });
      return;
    }

    if (monitor.userId !== req.user!.id) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    await prisma.monitor.delete({
      where: { id: monitorId },
    });

    schedulerService.removeJob(monitorId);

    logger.info(`Monitor deleted: ${monitorId} by ${req.user!.email}`);

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/run', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const monitorId = parseInt(req.params.id, 10);

    const monitor = await prisma.monitor.findUnique({
      where: { id: monitorId },
    });

    if (!monitor) {
      res.status(404).json({ error: 'Monitor not found' });
      return;
    }

    if (monitor.userId !== req.user!.id) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const result = await schedulerService.executeNow(monitorId);

    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
});

export default router;
