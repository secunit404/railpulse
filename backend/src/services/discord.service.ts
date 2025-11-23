import axios from 'axios';
import dayjs from 'dayjs';
import type { StationDelay } from '@shared/types';
import logger from '../utils/logger';

interface DiscordEmbed {
  title: string;
  description?: string;
  color: number;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
  footer?: { text: string };
  timestamp?: string;
}

export class DiscordService {
  private readonly MAX_FIELD_VALUE_LENGTH = 1024;
  private readonly MAX_RETRIES = 3;

  async postDelays(
    webhookUrl: string,
    monitorName: string,
    date: Date,
    delays: StationDelay[]
  ): Promise<{ success: boolean; error?: string }> {
    try {
      logger.info(`Posting ${delays.length} delays to Discord for monitor: ${monitorName}`);

      if (delays.length === 0) {
        logger.info('No delays to post');
        return { success: true };
      }

      // Create base embed
      const dateStr = dayjs(date).format('YYYY-MM-DD');
      const journey = delays[0]?.journey || monitorName;

      const title = `${monitorName} - ${dateStr}`;
      const description = `**${journey}**\n\nFound ${delays.length} delay${delays.length > 1 ? 's' : ''}`;

      // Create embeds with individual delay fields
      const embeds = this.buildDelayEmbeds(title, description, delays);

      // Post to Discord with retry logic
      for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
        try {
          logger.debug(`Posting to Discord (attempt ${attempt}/${this.MAX_RETRIES})`);

          await axios.post(webhookUrl, { embeds }, {
            headers: { 'Content-Type': 'application/json' },
          });

          logger.info('Successfully posted to Discord');
          return { success: true };
        } catch (error: any) {
          if (error.response?.status === 429) {
            // Rate limited
            const retryAfter = parseInt(error.response.headers['retry-after'] || '5', 10);
            logger.warn(`Discord rate limited, retrying after ${retryAfter}s`);

            if (attempt < this.MAX_RETRIES) {
              await this.sleep(retryAfter * 1000);
              continue;
            }
          }

          throw error;
        }
      }

      return { success: false, error: 'Failed after retries' };
    } catch (error: any) {
      const errorMsg = `Failed to post to Discord: ${error.message}`;
      logger.error(errorMsg);
      return { success: false, error: errorMsg };
    }
  }

  private buildDelayEmbeds(
    title: string,
    description: string,
    delays: StationDelay[]
  ): DiscordEmbed[] {
    const embeds: DiscordEmbed[] = [];
    const maxFieldsPerEmbed = 25; // Discord limit

    // Group delays into embeds (max 25 fields per embed)
    for (let i = 0; i < delays.length; i += maxFieldsPerEmbed) {
      const delayBatch = delays.slice(i, i + maxFieldsPerEmbed);
      const isFirstEmbed = i === 0;
      const embedNumber = Math.floor(i / maxFieldsPerEmbed) + 1;
      const totalEmbeds = Math.ceil(delays.length / maxFieldsPerEmbed);

      const embed: DiscordEmbed = {
        title: isFirstEmbed ? title : `${title} (${embedNumber}/${totalEmbeds})`,
        description: isFirstEmbed ? description : undefined,
        color: 0xe74c3c, // Red color for delays
        fields: delayBatch.map((delay) => this.formatDelayField(delay)),
        timestamp: new Date().toISOString(),
      };

      embeds.push(embed);
    }

    return embeds;
  }

  private formatDelayField(delay: StationDelay): { name: string; value: string; inline: boolean } {
    const name = `${delay.trainCompany} ${delay.trainNumber} | +${delay.delayMinutes} min`;

    const departureInfo = `Departure: ${this.formatTime(delay.departurePlanned)} → ${this.formatTime(delay.departureActual)}\n`;
    const arrivalInfo = `Arrival: ${this.formatTime(delay.arrivalPlanned)} → ${this.formatTime(delay.arrivalActual)}\n`;
    const reasonInfo = delay.delayReason ? `Reason: ${delay.delayReason}` : '';

    const value = departureInfo + arrivalInfo + reasonInfo;

    return {
      name,
      value: value.substring(0, this.MAX_FIELD_VALUE_LENGTH), // Ensure we don't exceed Discord's limit
      inline: false,
    };
  }

  private formatTime(isoString: string): string {
    return dayjs(isoString).format('HH:mm');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
