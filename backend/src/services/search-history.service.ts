import type { StationDelay } from '@shared/types';
import logger from '../utils/logger';
import prisma from '../prisma';

export interface CreateSearchHistoryParams {
  userId: number;
  monitorId?: number;
  searchType: 'auto' | 'manual';
  stationSignature: string;
  stationName: string;
  destSignature?: string;
  destName?: string;
  startDate: string;
  endDate: string;
  delayThreshold: number;
  results: StationDelay[];
  success: boolean;
  errorMessage?: string;
}

export interface SearchHistoryFilters {
  userId: number;
  searchType?: 'auto' | 'manual';
  monitorId?: number;
  limit?: number;
  offset?: number;
}

class SearchHistoryService {
  /**
   * Create a new search history entry and auto-cleanup old entries
   */
  async createSearchHistory(params: CreateSearchHistoryParams) {
    try {
      const resultCount = params.results.length;

      // Create the new search history entry
      const searchHistory = await prisma.searchHistory.create({
        data: {
          userId: params.userId,
          monitorId: params.monitorId,
          searchType: params.searchType,
          stationSignature: params.stationSignature,
          stationName: params.stationName,
          destSignature: params.destSignature,
          destName: params.destName,
          startDate: params.startDate,
          endDate: params.endDate,
          delayThreshold: params.delayThreshold,
          results: JSON.stringify(params.results),
          resultCount,
          success: params.success,
          errorMessage: params.errorMessage,
        },
        include: {
          monitor: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // Auto-cleanup old entries based on limits
      if (params.monitorId) {
        await this.cleanupOldEntries(params.userId, params.monitorId, params.searchType);
      }

      logger.info(`Created search history entry: ${searchHistory.id} (type: ${params.searchType}, results: ${resultCount})`);

      return searchHistory;
    } catch (error) {
      logger.error('Error creating search history:', error);
      throw error;
    }
  }

  /**
   * Auto-cleanup old entries: keep last 30 auto searches, last 10 manual searches per monitor
   */
  async cleanupOldEntries(userId: number, monitorId: number, searchType: 'auto' | 'manual') {
    try {
      const limit = searchType === 'auto' ? 30 : 10;

      // Get all entries for this monitor and type, ordered by creation date (newest first)
      const entries = await prisma.searchHistory.findMany({
        where: {
          userId,
          monitorId,
          searchType,
        },
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
        },
      });

      // If we have more than the limit, delete the oldest ones
      if (entries.length > limit) {
        const entriesToDelete = entries.slice(limit);
        const idsToDelete = entriesToDelete.map((e) => e.id);

        await prisma.searchHistory.deleteMany({
          where: {
            id: {
              in: idsToDelete,
            },
          },
        });

        logger.info(
          `Cleaned up ${idsToDelete.length} old ${searchType} search history entries for monitor ${monitorId}`
        );
      }
    } catch (error) {
      logger.error('Error cleaning up old search history entries:', error);
      // Don't throw - cleanup failure shouldn't fail the main operation
    }
  }

  /**
   * Get search history entries with filters
   */
  async getSearchHistory(filters: SearchHistoryFilters) {
    try {
      const { userId, searchType, monitorId, limit = 50, offset = 0 } = filters;

      const where: any = {
        userId,
      };

      if (searchType) {
        where.searchType = searchType;
      }

      if (monitorId !== undefined) {
        where.monitorId = monitorId;
      }

      const [entries, total] = await Promise.all([
        prisma.searchHistory.findMany({
          where,
          include: {
            monitor: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: limit,
          skip: offset,
        }),
        prisma.searchHistory.count({ where }),
      ]);

      return {
        entries: entries.map((entry) => ({
          ...entry,
          results: JSON.parse(entry.results) as StationDelay[],
        })),
        total,
        limit,
        offset,
      };
    } catch (error) {
      logger.error('Error fetching search history:', error);
      throw error;
    }
  }

  /**
   * Get a single search history entry by ID
   */
  async getSearchHistoryById(id: number, userId: number) {
    try {
      const entry = await prisma.searchHistory.findFirst({
        where: {
          id,
          userId,
        },
        include: {
          monitor: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!entry) {
        return null;
      }

      return {
        ...entry,
        results: JSON.parse(entry.results) as StationDelay[],
      };
    } catch (error) {
      logger.error('Error fetching search history by ID:', error);
      throw error;
    }
  }

  /**
   * Delete a single search history entry
   */
  async deleteSearchHistory(id: number, userId: number) {
    try {
      const deleted = await prisma.searchHistory.deleteMany({
        where: {
          id,
          userId,
        },
      });

      if (deleted.count === 0) {
        return null;
      }

      logger.info(`Deleted search history entry: ${id}`);
      return { success: true };
    } catch (error) {
      logger.error('Error deleting search history:', error);
      throw error;
    }
  }

  /**
   * Bulk delete search history entries
   */
  async bulkDeleteSearchHistory(ids: number[], userId: number) {
    try {
      const deleted = await prisma.searchHistory.deleteMany({
        where: {
          id: {
            in: ids,
          },
          userId,
        },
      });

      logger.info(`Bulk deleted ${deleted.count} search history entries`);
      return { success: true, count: deleted.count };
    } catch (error) {
      logger.error('Error bulk deleting search history:', error);
      throw error;
    }
  }

  /**
   * Delete all search history for a specific monitor
   */
  async deleteMonitorHistory(monitorId: number, userId: number) {
    try {
      const deleted = await prisma.searchHistory.deleteMany({
        where: {
          monitorId,
          userId,
        },
      });

      logger.info(`Deleted all search history for monitor ${monitorId}: ${deleted.count} entries`);
      return { success: true, count: deleted.count };
    } catch (error) {
      logger.error('Error deleting monitor search history:', error);
      throw error;
    }
  }
}

export default new SearchHistoryService();
