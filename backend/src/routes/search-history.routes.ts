import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import searchHistoryService from '../services/search-history.service';
import logger from '../utils/logger';

const router = Router();

const getHistoryQuerySchema = z.object({
  searchType: z.enum(['auto', 'manual']).optional(),
  monitorId: z.string().transform(Number).optional(),
  limit: z.string().transform(Number).optional(),
  offset: z.string().transform(Number).optional(),
});

const bulkDeleteSchema = z.object({
  ids: z.array(z.number().int().positive()),
});

router.get('/', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const query = getHistoryQuerySchema.parse(req.query);

    const result = await searchHistoryService.getSearchHistory({
      userId: req.user!.id,
      searchType: query.searchType,
      monitorId: query.monitorId,
      limit: query.limit,
      offset: query.offset,
    });

    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid query parameters', details: error.errors });
    }
    next(error);
  }
});

router.get('/:id', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid search history ID' });
    }

    const entry = await searchHistoryService.getSearchHistoryById(id, req.user!.id);

    if (!entry) {
      return res.status(404).json({ error: 'Search history entry not found' });
    }

    res.json(entry);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid search history ID' });
    }

    const result = await searchHistoryService.deleteSearchHistory(id, req.user!.id);

    if (!result) {
      return res.status(404).json({ error: 'Search history entry not found' });
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.post('/bulk-delete', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { ids } = bulkDeleteSchema.parse(req.body);

    if (ids.length === 0) {
      return res.status(400).json({ error: 'No IDs provided for deletion' });
    }

    const result = await searchHistoryService.bulkDeleteSearchHistory(ids, req.user!.id);

    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request body', details: error.errors });
    }
    next(error);
  }
});

router.delete('/monitor/:monitorId', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const monitorId = parseInt(req.params.monitorId, 10);
    if (isNaN(monitorId)) {
      return res.status(400).json({ error: 'Invalid monitor ID' });
    }

    const result = await searchHistoryService.deleteMonitorHistory(monitorId, req.user!.id);

    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
