import { PrismaClient, Monitor as PrismaMonitor } from '@prisma/client';
import cron from 'node-cron';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { Server as SocketIOServer } from 'socket.io';
import { TrafikverketService } from './trafikverket.service';
import { DiscordService } from './discord.service';
import searchHistoryService from './search-history.service';
import logger from '../utils/logger';

dayjs.extend(utc);
dayjs.extend(timezone);

type Monitor = PrismaMonitor;

const DEFAULT_TIMEZONE = process.env.TZ || 'Europe/Stockholm';

export class SchedulerService {
  private jobs: Map<number, cron.ScheduledTask> = new Map();

  constructor(
    private prisma: PrismaClient,
    private io: SocketIOServer,
    private trafikverketService: TrafikverketService,
    private discordService: DiscordService
  ) {}

  async init(): Promise<void> {
    try {
      logger.info('Initializing scheduler service');

      const monitors = await this.prisma.monitor.findMany({
        where: { active: true },
      });

      logger.info(`Loaded ${monitors.length} active monitors`);

      for (const monitor of monitors) {
        this.addJob(monitor);
      }

      logger.info('Scheduler initialization complete');
    } catch (error: any) {
      logger.error(`Failed to initialize scheduler: ${error.message}`);
      throw error;
    }
  }

  addJob(monitor: Monitor): void {
    try {
      logger.debug(`Adding job for monitor ${monitor.id}: ${monitor.name}`);

      const timezone = monitor.timezone || DEFAULT_TIMEZONE;
      const runMode = monitor.runMode || 'daily';

      // One-time monitors are only for manual execution, don't schedule them
      if (runMode === 'one-time') {
        logger.info(
          `Monitor "${monitor.name}" (ID: ${monitor.id}) is one-time mode - no automatic scheduling (manual run only)`
        );
        return;
      }

      // Daily mode requires scheduleTime
      if (!monitor.scheduleTime) {
        logger.error(`Monitor ${monitor.id} is in daily mode but has no scheduleTime. Skipping.`);
        return;
      }

      // Parse schedule time (HH:mm format)
      const [hour, minute] = monitor.scheduleTime.split(':').map(Number);

      if (isNaN(hour) || isNaN(minute)) {
        logger.error(`Invalid schedule time format for monitor ${monitor.id}: ${monitor.scheduleTime}`);
        return;
      }

      // Create cron expression: minute hour * * * (daily)
      const cronExpression = `${minute} ${hour} * * *`;

      logger.debug(`Creating cron job with expression: ${cronExpression}, mode: ${runMode}, timezone: ${timezone}`);

      const task = cron.schedule(
        cronExpression,
        async () => {
          try {
            // For daily mode, always execute
            await this.executeJob({ ...monitor, timezone });
          } catch (error: any) {
            logger.error(`Job execution failed for monitor ${monitor.id}: ${error.message}`);
          }
        },
        {
          scheduled: true,
          timezone,
        }
      );

      this.jobs.set(monitor.id, task);

      logger.info(
        `Job scheduled for monitor "${monitor.name}" (ID: ${monitor.id}) - daily at ${monitor.scheduleTime} ${timezone}`
      );
    } catch (error: any) {
      logger.error(`Failed to add job for monitor ${monitor.id}: ${error.message}`);
    }
  }

  private async executeJob(monitor: Monitor): Promise<void> {
    try {
      logger.info(`Executing monitor ${monitor.id}: ${monitor.name}`);

      // Update status to running
      await this.prisma.monitor.update({
        where: { id: monitor.id },
        data: {
          lastRunStatus: 'running',
          lastRunAt: new Date(),
        },
      });

      // Emit started event
      this.io.to(`user:${monitor.userId}`).emit('monitor:started', {
        monitorId: monitor.id,
        monitorName: monitor.name,
        timestamp: new Date().toISOString(),
      });

      const timezone = monitor.timezone || DEFAULT_TIMEZONE;
      const runMode = monitor.runMode || 'daily';

      // For daily mode, use today's date. For one-time mode, use the scheduled date range
      let startDate: string;
      let endDate: string;

      if (runMode === 'one-time' && monitor.scheduleDate) {
        // Use the specified date range for one-time mode
        const startDay = dayjs.tz(monitor.scheduleDate, timezone);
        startDate = startDay.startOf('day').toISOString();

        // If scheduleEndDate is provided, use it; otherwise default to the same day as scheduleDate
        if (monitor.scheduleEndDate) {
          const endDay = dayjs.tz(monitor.scheduleEndDate, timezone);
          endDate = endDay.endOf('day').toISOString();
        } else {
          endDate = startDay.endOf('day').toISOString();
        }
      } else {
        // For daily mode, use today's date
        const today = dayjs().tz(timezone);
        startDate = today.startOf('day').toISOString();
        endDate = today.endOf('day').toISOString();
      }

      // Fetch user preferences to check if bus-replaced trains should be hidden
      const user = await this.prisma.user.findUnique({
        where: { id: monitor.userId },
        select: { hideBusReplacedTrains: true },
      });

      // Fetch delays - use route-based if destination is specified
      let delays = monitor.destSignature
        ? await this.trafikverketService.fetchRouteDelays(
            monitor.stationSignature,
            monitor.destSignature,
            startDate,
            endDate,
            monitor.delayThreshold
          )
        : await this.trafikverketService.fetchStationDelays(
            monitor.stationSignature,
            startDate,
            endDate,
            monitor.delayThreshold
          );

      // Filter out bus-replaced trains if user preference is set
      if (user?.hideBusReplacedTrains) {
        delays = delays.filter(delay => !delay.delayReason.toLowerCase().includes('buss ersätter'));
        logger.info(`Monitor ${monitor.id}: Filtered bus-replaced trains for user preference`);
      }

      logger.info(`Found ${delays.length} delays for monitor ${monitor.name}`);

      // Post to Discord if webhook configured
      if (monitor.discordWebhookUrl && delays.length > 0) {
        const result = await this.discordService.postDelays(
          monitor.discordWebhookUrl,
          monitor.name,
          new Date(),
          delays
        );

        if (!result.success) {
          logger.warn(`Discord posting failed for monitor ${monitor.id}: ${result.error}`);
        }
      }

      // Update status to success and save result count
      await this.prisma.monitor.update({
        where: { id: monitor.id },
        data: {
          lastRunStatus: 'success',
          lastRunAt: new Date(),
          lastRunResultCount: delays.length,
        },
      });

      // Save to search history (auto runs only - this is from scheduled jobs)
      try {
        await searchHistoryService.createSearchHistory({
          userId: monitor.userId,
          monitorId: monitor.id,
          searchType: 'auto',
          stationSignature: monitor.stationSignature,
          stationName: monitor.stationName,
          destSignature: monitor.destSignature || undefined,
          destName: monitor.destName || undefined,
          startDate,
          endDate,
          delayThreshold: monitor.delayThreshold,
          results: delays,
          success: true,
        });
      } catch (historyError: any) {
        logger.error(`Failed to save search history for monitor ${monitor.id}: ${historyError.message}`);
        // Don't fail the monitor run if history saving fails
      }

      // Emit completed event
      this.io.to(`user:${monitor.userId}`).emit('monitor:completed', {
        monitorId: monitor.id,
        monitorName: monitor.name,
        resultCount: delays.length,
        maxDelay: delays.length > 0 ? delays[0].delayMinutes : 0,
        timestamp: new Date().toISOString(),
      });

      logger.info(`Monitor ${monitor.name} completed successfully`);
    } catch (error: any) {
      logger.error(`Monitor ${monitor.id} failed: ${error.message}`, { stack: error.stack });

      // Update status to failed
      await this.prisma.monitor.update({
        where: { id: monitor.id },
        data: {
          lastRunStatus: 'failed',
          lastRunAt: new Date(),
          lastRunResultCount: 0,
        },
      });

      // Save failed run to search history
      try {
        const timezone = monitor.timezone || DEFAULT_TIMEZONE;
        const runMode = monitor.runMode || 'daily';

        let startDate: string;
        let endDate: string;

        if (runMode === 'one-time' && monitor.scheduleDate) {
          const startDay = dayjs.tz(monitor.scheduleDate, timezone);
          startDate = startDay.startOf('day').toISOString();

          if (monitor.scheduleEndDate) {
            const endDay = dayjs.tz(monitor.scheduleEndDate, timezone);
            endDate = endDay.endOf('day').toISOString();
          } else {
            endDate = startDay.endOf('day').toISOString();
          }
        } else {
          const today = dayjs().tz(timezone);
          startDate = today.startOf('day').toISOString();
          endDate = today.endOf('day').toISOString();
        }

        await searchHistoryService.createSearchHistory({
          userId: monitor.userId,
          monitorId: monitor.id,
          searchType: 'auto',
          stationSignature: monitor.stationSignature,
          stationName: monitor.stationName,
          destSignature: monitor.destSignature || undefined,
          destName: monitor.destName || undefined,
          startDate,
          endDate,
          delayThreshold: monitor.delayThreshold,
          results: [],
          success: false,
          errorMessage: error.message,
        });
      } catch (historyError: any) {
        logger.error(`Failed to save failed run to search history for monitor ${monitor.id}: ${historyError.message}`);
      }

      // Emit failed event
      this.io.to(`user:${monitor.userId}`).emit('monitor:failed', {
        monitorId: monitor.id,
        monitorName: monitor.name,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  removeJob(monitorId: number): void {
    try {
      logger.debug(`Removing job for monitor ${monitorId}`);

      const task = this.jobs.get(monitorId);
      if (task) {
        task.stop();
        this.jobs.delete(monitorId);
        logger.info(`Job removed for monitor ${monitorId}`);
      } else {
        logger.warn(`No job found for monitor ${monitorId}`);
      }
    } catch (error: any) {
      logger.error(`Failed to remove job for monitor ${monitorId}: ${error.message}`);
    }
  }

  updateJob(monitor: Monitor): void {
    try {
      logger.debug(`Updating job for monitor ${monitor.id}`);
      this.removeJob(monitor.id);
      this.addJob(monitor);
    } catch (error: any) {
      logger.error(`Failed to update job for monitor ${monitor.id}: ${error.message}`);
    }
  }

  async executeNow(monitorId: number): Promise<any> {
    try {
      logger.info(`Executing monitor ${monitorId} on demand`);

      const monitor = (await this.prisma.monitor.findUnique({
        where: { id: monitorId },
      })) as Monitor | null;

      if (!monitor) {
        throw new Error(`Monitor ${monitorId} not found`);
      }

      // Fetch and return the delays for immediate response
      const timezone = monitor.timezone || DEFAULT_TIMEZONE;
      const runMode = monitor.runMode || 'daily';

      // For daily mode, use today's date. For one-time mode, use the scheduled date range
      let startDate: string;
      let endDate: string;

      if (runMode === 'one-time' && monitor.scheduleDate) {
        // Use the specified date range for one-time mode
        const startDay = dayjs.tz(monitor.scheduleDate, timezone);
        startDate = startDay.startOf('day').toISOString();

        // If scheduleEndDate is provided, use it; otherwise default to the same day as scheduleDate
        if (monitor.scheduleEndDate) {
          const endDay = dayjs.tz(monitor.scheduleEndDate, timezone);
          endDate = endDay.endOf('day').toISOString();
        } else {
          endDate = startDay.endOf('day').toISOString();
        }
      } else {
        // For daily mode, use today's date
        const today = dayjs().tz(timezone);
        startDate = today.startOf('day').toISOString();
        endDate = today.endOf('day').toISOString();
      }

      // Update status to running
      await this.prisma.monitor.update({
        where: { id: monitor.id },
        data: {
          lastRunStatus: 'running',
          lastRunAt: new Date(),
        },
      });

      // Fetch user preferences to check if bus-replaced trains should be hidden
      const user = await this.prisma.user.findUnique({
        where: { id: monitor.userId },
        select: { hideBusReplacedTrains: true },
      });

      let delays = monitor.destSignature
        ? await this.trafikverketService.fetchRouteDelays(
            monitor.stationSignature,
            monitor.destSignature,
            startDate,
            endDate,
            monitor.delayThreshold
          )
        : await this.trafikverketService.fetchStationDelays(
            monitor.stationSignature,
            startDate,
            endDate,
            monitor.delayThreshold
          );

      // Filter out bus-replaced trains if user preference is set
      if (user?.hideBusReplacedTrains) {
        delays = delays.filter(delay => !delay.delayReason.toLowerCase().includes('buss ersätter'));
        logger.info(`Monitor ${monitor.id}: Filtered bus-replaced trains for user preference`);
      }

      // Update status to success and save result count
      await this.prisma.monitor.update({
        where: { id: monitor.id },
        data: {
          lastRunStatus: 'success',
          lastRunAt: new Date(),
          lastRunResultCount: delays.length,
        },
      });

      // Save to search history as manual run (since it's triggered by user clicking "Run Now")
      try {
        await searchHistoryService.createSearchHistory({
          userId: monitor.userId,
          monitorId: monitor.id,
          searchType: 'manual',
          stationSignature: monitor.stationSignature,
          stationName: monitor.stationName,
          destSignature: monitor.destSignature || undefined,
          destName: monitor.destName || undefined,
          startDate,
          endDate,
          delayThreshold: monitor.delayThreshold,
          results: delays,
          success: true,
        });
      } catch (historyError: any) {
        logger.error(`Failed to save search history for manual run ${monitor.id}: ${historyError.message}`);
        // Don't fail the monitor run if history saving fails
      }

      return { delays, count: delays.length };
    } catch (error: any) {
      logger.error(`Failed to execute monitor ${monitorId} on demand: ${error.message}`);

      // Update status to failed
      try {
        await this.prisma.monitor.update({
          where: { id: monitorId },
          data: {
            lastRunStatus: 'failed',
            lastRunAt: new Date(),
            lastRunResultCount: 0,
          },
        });
      } catch (updateError: any) {
        logger.error(`Failed to update monitor status after error: ${updateError.message}`);
      }

      throw error;
    }
  }
}
