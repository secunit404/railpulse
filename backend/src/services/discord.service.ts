import axios from 'axios';
import dayjs from 'dayjs';
import 'dayjs/locale/sv';
import type { StationDelay } from '@shared/types';
import logger from '../utils/logger';

// Set Swedish locale globally for dayjs in this service
dayjs.locale('sv');

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
    startDate: string | Date,
    delays: StationDelay[],
    endDate?: string | Date
  ): Promise<{ success: boolean; error?: string }> {
    try {
      logger.info(`Posting ${delays.length} delays to Discord for monitor: ${monitorName}`);

      if (delays.length === 0) {
        logger.info('No delays to post');
        return { success: true };
      }

      const journey = delays[0]?.journey || monitorName;
      const title = monitorName;

      // Create embeds with individual delay fields
      const embeds = this.buildDelayEmbeds(title, journey, delays);

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
    journey: string,
    delays: StationDelay[]
  ): DiscordEmbed[] {
    const embeds: DiscordEmbed[] = [];
    const maxFieldsPerEmbed = 25; // Discord limit

    // Calculate max delay for color
    const maxDelay = Math.max(...delays.map(d => d.delayMinutes));

    // Group delays by date
    const delaysByDate = new Map<string, StationDelay[]>();
    delays.forEach(delay => {
      const date = dayjs(delay.departurePlanned).format('YYYY-MM-DD');
      if (!delaysByDate.has(date)) {
        delaysByDate.set(date, []);
      }
      delaysByDate.get(date)!.push(delay);
    });

    // Sort dates
    const sortedDates = Array.from(delaysByDate.keys()).sort();

    // Build fields with date headers
    const allFields: Array<{ name: string; value: string; inline: boolean }> = [];
    sortedDates.forEach(date => {
      const dateDelays = delaysByDate.get(date)!;
      // Capitalize first letter of weekday
      const formattedDate = dayjs(date).format('dddd D MMMM YYYY');
      const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

      // Add date header as a field
      allFields.push({
        name: `${capitalizedDate}`,
        value: `${dateDelays.length} försening${dateDelays.length > 1 ? 'ar' : ''}\n───────────────────────────`,
        inline: false,
      });

      // Add all delays for this date
      dateDelays.forEach(delay => {
        allFields.push(this.formatDelayField(delay));
      });
    });

    // Split fields into embeds (max 25 fields per embed)
    for (let i = 0; i < allFields.length; i += maxFieldsPerEmbed) {
      const fieldBatch = allFields.slice(i, i + maxFieldsPerEmbed);
      const isFirstEmbed = i === 0;
      const embedNumber = Math.floor(i / maxFieldsPerEmbed) + 1;
      const totalEmbeds = Math.ceil(allFields.length / maxFieldsPerEmbed);

      const embed: DiscordEmbed = {
        title: isFirstEmbed ? `🚆 ${title}` : `🚆 ${title} (${embedNumber}/${totalEmbeds})`,
        description: isFirstEmbed ? `**${journey}**` : undefined,
        color: this.getDelayColor(maxDelay),
        fields: fieldBatch,
        timestamp: new Date().toISOString(),
        footer: isFirstEmbed ? { text: '🔔 RailPulse Monitor Alert' } : undefined,
      };

      embeds.push(embed);
    }

    return embeds;
  }

  private getDelayColor(maxDelay: number): number {
    // Color gradient based on severity
    if (maxDelay >= 60) return 0x8b0000; // Dark red for 60+ min
    if (maxDelay >= 40) return 0xe74c3c; // Red for 40-59 min
    if (maxDelay >= 20) return 0xe67e22; // Orange for 20-39 min
    return 0x95a5a6; // Gray for <20 min
  }

  private formatDelayField(delay: StationDelay): { name: string; value: string; inline: boolean } {
    const name = `${delay.trainCompany} ${delay.trainNumber} │ +${delay.delayMinutes} min`;

    const departureInfo = `**Avgång:** \`${this.formatTime(delay.departurePlanned)}\` → \`${this.formatTime(delay.departureActual)}\`\n`;
    const arrivalInfo = `**Ankomst:** \`${this.formatTime(delay.arrivalPlanned)}\` → \`${this.formatTime(delay.arrivalActual)}\`\n`;
    const reasonInfo = delay.delayReason ? `**Orsak:** ${delay.delayReason}` : '';

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
