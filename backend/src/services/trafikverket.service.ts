import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import type { StationDelay } from '@shared/types';
import logger from '../utils/logger';

dayjs.extend(utc);
dayjs.extend(timezone);

interface TrainAnnouncement {
  AdvertisedTrainIdent: string;
  OperationalTrainNumber?: string;
  ActivityType: string;
  AdvertisedTimeAtLocation: string;
  TimeAtLocation?: string;
  EstimatedTimeAtLocation?: string;
  LocationSignature: string;
  FromLocation?: Array<{ LocationName?: string; LocationSignature?: string; Priority: number }>;
  ToLocation?: Array<{ LocationName?: string; LocationSignature?: string; Priority: number }>;
  Canceled?: boolean;
  Deviation?: Array<{ Code: string; Description: string }>;
  ProductInformation?: Array<{ Code?: string; Description: string }>;
  OtherInformation?: Array<{ Code?: string; Description: string }>;
  TrackAtLocation?: string;
}


interface ReasonCodePriority {
  code: string;
  priority: number;
  description: string;
}

// Helper function to extract train company from ProductInformation
function extractTrainCompany(productInfo?: Array<{ Code?: string; Description: string }>): string | undefined {
  if (!productInfo || productInfo.length === 0) return undefined;

  // ProductInformation typically contains the operator/company name
  // Return the first description as the company name
  return productInfo[0]?.Description;
}

export class TrafikverketService {
  private apiUrl = 'https://api.trafikinfo.trafikverket.se/v2/data.json';
  private reasonCodePriorities: Map<string, ReasonCodePriority> = new Map();
  private stationSyncPromise: Promise<number> | null = null;
  private reasonCodeSyncPromise: Promise<number> | null = null;
  private readonly STATION_CACHE_TTL_DAYS = 30;
  private readonly REASON_CODE_CACHE_TTL_HOURS = 24;

  constructor(
    private prisma: PrismaClient,
    private apiKey: string
  ) {}

  private buildXmlQuery(
    objectType: string,
    schemaVersion: string,
    filters: string,
    includes?: string[]
  ): string {
    const includeElements = includes
      ? includes.map((inc) => `<INCLUDE>${inc}</INCLUDE>`).join('')
      : '';

    return `<REQUEST>
  <LOGIN authenticationkey="${this.apiKey}"/>
  <QUERY objecttype="${objectType}" schemaversion="${schemaVersion}">
    <FILTER>${filters}</FILTER>
    ${includeElements}
  </QUERY>
</REQUEST>`;
  }

  private async queryApi<T>(objectType: string, xml: string): Promise<T[]> {
    try {
      logger.debug(`Querying ${objectType} from Trafikverket API`);
      
      const response = await axios.post(this.apiUrl, xml, {
        headers: { 'Content-Type': 'text/xml' },
      });

      const results = response.data?.RESPONSE?.RESULT;

      if (!results || results.length === 0) {
        logger.warn(`No data returned for ${objectType}`);
        return [];
      }

      const aggregated: T[] = [];
      let lastResultFlag: boolean | undefined;

      for (const result of results) {
        const items = result?.[objectType] as T[] | undefined;
        if (Array.isArray(items)) {
          aggregated.push(...items);
        }

        if (result?.INFO?.LASTRESULT !== undefined) {
          const value = result.INFO.LASTRESULT;
          if (typeof value === 'string') {
            lastResultFlag = value.toLowerCase() === 'true';
          } else {
            lastResultFlag = Boolean(value);
          }
        }
      }

      if (!aggregated.length) {
        logger.warn(`Empty ${objectType} payload received`);
      }

      if (lastResultFlag === false) {
        logger.warn(
          `Trafikverket API indicated more ${objectType} data is available (LASTRESULT=false). Consider narrowing filters.`
        );
      }

      return aggregated;
    } catch (error: any) {
      logger.error(`API request failed for ${objectType}: ${error.message}`);
      
      // Log the XML request for debugging
      if (error.response?.status === 400) {
        logger.error(`Bad request XML:\n${xml}`);
        logger.error(`Response data: ${JSON.stringify(error.response?.data)}`);
      }
      
      throw new Error(`Trafikverket API error: ${error.message}`);
    }
  }

  async syncStations(): Promise<number> {
    if (this.stationSyncPromise) {
      return this.stationSyncPromise;
    }

    this.stationSyncPromise = (async () => {
      try {
        const latest = await this.prisma.station.findFirst({
          orderBy: { cachedAt: 'desc' },
        });

        const needsSync = !latest || dayjs(latest.cachedAt).isBefore(dayjs().subtract(this.STATION_CACHE_TTL_DAYS, 'day'));

        if (!needsSync) {
          logger.debug('Station cache is fresh, skipping sync');
          return 0;
        }

        logger.info('Syncing stations cache from Trafikverket API');

        const xml = this.buildXmlQuery('TrainStation', '1.4', '<EQ name="Advertised" value="true" />');
        
        const stations = await this.queryApi<any>('TrainStation', xml);

        await this.prisma.$transaction(async (tx) => {
          await tx.station.deleteMany({});
          await tx.station.createMany({
            data: stations.map((s: any) => ({
              signature: s.LocationSignature,
              advertisedName: s.AdvertisedLocationName,
              shortName: s.AdvertisedShortLocationName || null,
              cachedAt: new Date(),
            })),
          });
        });

        logger.info(`Synced ${stations.length} stations to cache`);
        return stations.length;
      } catch (error: any) {
        logger.error(`Failed to sync stations: ${error.message}`);
        throw error;
      } finally {
        this.stationSyncPromise = null;
      }
    })();

    return this.stationSyncPromise;
  }

  async syncReasonCodes(): Promise<number> {
    if (this.reasonCodeSyncPromise) {
      return this.reasonCodeSyncPromise;
    }

    this.reasonCodeSyncPromise = (async () => {
      try {
        const latest = await this.prisma.reasonCode.findFirst({
          orderBy: { cachedAt: 'desc' },
        });

        const needsSync = !latest || dayjs(latest.cachedAt).isBefore(dayjs().subtract(this.REASON_CODE_CACHE_TTL_HOURS, 'hour'));

        if (!needsSync) {
          logger.debug('ReasonCode cache is fresh, skipping sync');
          // Still load priorities from database into memory
          if (this.reasonCodePriorities.size === 0) {
            await this.loadReasonCodePriorities();
          }
          return 0;
        }

        logger.info('Syncing reason codes cache from Trafikverket API');

        const xml = this.buildXmlQuery('ReasonCode', '1.0', '');
        
        const codes = await this.queryApi<any>('ReasonCode', xml);

        await this.prisma.$transaction(async (tx) => {
          await tx.reasonCode.deleteMany({});
          await tx.reasonCode.createMany({
            data: codes.map((c: any) => ({
              code: c.Code,
              level1Description: c.Level1Description || null,
              level2Description: c.Level2Description || null,
              level3Description: c.Level3Description || null,
              cachedAt: new Date(),
            })),
          });
        });

        logger.info(`Synced ${codes.length} reason codes to cache`);

        // Load priorities after sync
        await this.loadReasonCodePriorities();

        return codes.length;
      } catch (error: any) {
        logger.error(`Failed to sync reason codes: ${error.message}`);
        throw error;
      } finally {
        this.reasonCodeSyncPromise = null;
      }
    })();

    return this.reasonCodeSyncPromise;
  }

  /**
   * Loads reason codes from database and categorizes them by priority
   * Based on Level3Description keywords
   */
  private async loadReasonCodePriorities(): Promise<void> {
    try {
      const codes = await this.prisma.reasonCode.findMany();

      this.reasonCodePriorities.clear();

      codes.forEach(rc => {
        const desc = (rc.level3Description || rc.level2Description || rc.level1Description || '').toLowerCase();

        let priority = 1; // Default priority

        // Priority 5: Critical - Train cancelled or major disruption
        if (desc.includes('inställt') || desc.includes('cancelled') ||
            desc.includes('ställs in') || desc.includes('framställt')) {
          priority = 5;
        }
        // Priority 4: High - Delays, vehicle issues, disruptions
        else if (desc.includes('försenat') || desc.includes('delayed') ||
                 desc.includes('tågkö') || desc.includes('fordonsfel') ||
                 desc.includes('obeh') || desc.includes('sjukdom') ||
                 desc.includes('växelfel') || desc.includes('signalfel') ||
                 desc.includes('elfel') || desc.includes('brofel') ||
                 desc.includes('spårfel') || desc.includes('urspårat')) {
          priority = 4;
        }
        // Priority 3: Medium - Route/platform changes, replacements
        else if (desc.includes('spårändrat') || desc.includes('plattform') ||
                 desc.includes('buss ersätter') || desc.includes('buss') ||
                 desc.includes('ändrad väg') || desc.includes('extrabuss')) {
          priority = 3;
        }
        // Priority 2: Low - Informational messages
        else if (desc.includes('nästa avgång') || desc.includes('kort tåg') ||
                 desc.includes('direkttåg') || desc.includes('extratåg') ||
                 desc.includes('dubbeltåg') || desc.includes('prel')) {
          priority = 2;
        }

        this.reasonCodePriorities.set(rc.code, {
          code: rc.code,
          priority,
          description: rc.level3Description || rc.level2Description || rc.level1Description || 'Unknown'
        });
      });

      logger.debug(`Loaded ${this.reasonCodePriorities.size} reason code priorities`);
    } catch (error: any) {
      logger.error(`Failed to load reason code priorities: ${error.message}`);
    }
  }

  /**
   * Filters out less important deviation reasons when there are multiple
   * Uses reason code priorities loaded from database
   *
   * @param deviations - Array of deviation objects with Code and Description
   * @returns Filtered array of descriptions to display
   */
  private filterDeviationReasons(deviations: Array<{ code?: string; description: string }>): string[] {
    if (!deviations || deviations.length === 0) {
      return [];
    }

    const seenDescriptions = new Set<string>();
    const prioritized = deviations
      .map((dev) => {
        const description = dev.description?.trim();
        if (!description) return null;
        const priority = dev.code
          ? this.reasonCodePriorities.get(dev.code)?.priority ?? 1
          : 1;
        return { description, priority };
      })
      .filter((item): item is { description: string; priority: number } => {
        if (!item) return false;
        if (seenDescriptions.has(item.description)) {
          return false;
        }
        seenDescriptions.add(item.description);
        return true;
      });

    if (prioritized.length === 0) {
      return [];
    }

    const maxPriority = Math.max(...prioritized.map((d) => d.priority));

    if (maxPriority === 1) {
      // No classified priorities - return all descriptions for completeness
      return prioritized.map((d) => d.description);
    }

    const highestPriorityReasons = prioritized.filter((d) => d.priority === maxPriority);
    return highestPriorityReasons.length > 0
      ? highestPriorityReasons.map((d) => d.description)
      : prioritized.map((d) => d.description);
  }


  async fetchStationDelays(
    stationSignature: string,
    startDate: string,
    endDate: string,
    minDelayMinutes: number = 20
  ): Promise<StationDelay[]> {
    try {
      logger.info(
        `Fetching delays for station ${stationSignature} from ${startDate} to ${endDate}, min delay: ${minDelayMinutes}`
      );

      // Sync caches in parallel
      await Promise.all([this.syncStations(), this.syncReasonCodes()]);

      if (this.reasonCodePriorities.size === 0) {
        await this.loadReasonCodePriorities();
      }

      // Build filters for TrainAnnouncement query
      const filters = `
        <AND>
          <EQ name="LocationSignature" value="${stationSignature}" />
          <GTE name="AdvertisedTimeAtLocation" value="${startDate}" />
          <LTE name="AdvertisedTimeAtLocation" value="${endDate}" />
          <EQ name="Advertised" value="true" />
        </AND>
      `;

      const includes = [
        'AdvertisedTrainIdent',
        'OperationalTrainNumber',
        'ActivityType',
        'AdvertisedTimeAtLocation',
        'TimeAtLocation',
        'EstimatedTimeAtLocation',
        'LocationSignature',
        'Canceled',
        'Deviation',
        'FromLocation',
        'ToLocation',
        'ProductInformation',
        'OtherInformation',
      ];

      const xml = this.buildXmlQuery('TrainAnnouncement', '1.9', filters, includes);
      
      const announcements = await this.queryApi<TrainAnnouncement>('TrainAnnouncement', xml);

      logger.debug(`Received ${announcements.length} announcements`);

      // Collect all unique station signatures for lookup
      const stationSignatures = new Set<string>();
      for (const ann of announcements) {
        ann.FromLocation?.forEach(loc => {
          // LocationName contains the signature in this API version
          if (loc.LocationName) stationSignatures.add(loc.LocationName);
          if (loc.LocationSignature) stationSignatures.add(loc.LocationSignature);
        });
        ann.ToLocation?.forEach(loc => {
          // LocationName contains the signature in this API version
          if (loc.LocationName) stationSignatures.add(loc.LocationName);
          if (loc.LocationSignature) stationSignatures.add(loc.LocationSignature);
        });
      }

      // Load all needed stations from cache in one query
      const stations = await this.prisma.station.findMany({
        where: {
          signature: { in: Array.from(stationSignatures) }
        }
      });
      const stationMap = new Map(stations.map(s => [s.signature, s.advertisedName]));

      // Group announcements by train and service date
      const trainGroups: { [key: string]: TrainAnnouncement[] } = {};

      for (const ann of announcements) {
        const serviceDate = dayjs(ann.AdvertisedTimeAtLocation).format('YYYY-MM-DD');
        const trainKey = `${ann.AdvertisedTrainIdent}-${ann.OperationalTrainNumber || 'unknown'}-${serviceDate}`;
        
        if (!trainGroups[trainKey]) {
          trainGroups[trainKey] = [];
        }
        trainGroups[trainKey].push(ann);
      }

      const delays: StationDelay[] = [];

      for (const [trainKey, group] of Object.entries(trainGroups)) {
        // Find departure (earliest Avgang) and arrival (latest Ankomst)
        const departures = group.filter((a) => a.ActivityType === 'Avgang');
        const arrivals = group.filter((a) => a.ActivityType === 'Ankomst');

        if (departures.length === 0 || arrivals.length === 0) continue;

        const departure = departures.sort(
          (a, b) =>
            dayjs(a.AdvertisedTimeAtLocation).valueOf() -
            dayjs(b.AdvertisedTimeAtLocation).valueOf()
        )[0];

        const arrival = arrivals.sort(
          (a, b) =>
            dayjs(b.AdvertisedTimeAtLocation).valueOf() -
            dayjs(a.AdvertisedTimeAtLocation).valueOf()
        )[0];

        // Skip fast trains (ending with 'x') - not part of Västtrafik
        if (departure.AdvertisedTrainIdent.toLowerCase().endsWith('x')) {
          continue;
        }

        // Skip if canceled
        if (arrival.Canceled) continue;

        // Calculate delay
        const actualArrivalTime = arrival.TimeAtLocation || arrival.EstimatedTimeAtLocation;
        if (!actualArrivalTime) continue;

        const plannedArrival = dayjs(arrival.AdvertisedTimeAtLocation);
        const actualArrival = dayjs(actualArrivalTime);
        const delayMinutes = actualArrival.diff(plannedArrival, 'minute');

        // Skip if delay is below threshold
        if (delayMinutes < minDelayMinutes) continue;

        // Extract delay reason
        let delayReason = 'Unknown reason';

        // Try to get reason from deviations
        const deviations = group.flatMap((a) => a.Deviation ?? []);
        if (deviations.length > 0) {
          // Get unique deviations by description
          const uniqueDeviations: Array<{ code?: string; description: string }> = [];
          const seenDescriptions = new Set<string>();

          for (const dev of deviations) {
            if (dev.Description && !seenDescriptions.has(dev.Description)) {
              seenDescriptions.add(dev.Description);
              uniqueDeviations.push({
                code: dev.Code,
                description: dev.Description
              });
            }
          }

          if (uniqueDeviations.length > 0) {
            // Return all deviation descriptions without filtering
            const filteredReasons = this.filterDeviationReasons(uniqueDeviations);
            delayReason = filteredReasons.join('; ');
          }
        }

        // Add OtherInformation to delay reason
        const otherInfo = group.flatMap((a) => a.OtherInformation ?? []);
        if (otherInfo.length > 0) {
          const uniqueOtherInfo: string[] = [];
          const seenInfo = new Set<string>();

          for (const info of otherInfo) {
            if (info.Description && !seenInfo.has(info.Description)) {
              seenInfo.add(info.Description);
              uniqueOtherInfo.push(info.Description);
            }
          }

          if (uniqueOtherInfo.length > 0) {
            // Append OtherInformation to delay reason
            if (delayReason !== 'Unknown reason') {
              delayReason += '; ' + uniqueOtherInfo.join('; ');
            } else {
              delayReason = uniqueOtherInfo.join('; ');
            }
          }
        }

        // Get journey route - try to get full station names
        let fromLocation = 'Unknown';
        let toLocation = 'Unknown';

        // Try to get from FromLocation/ToLocation fields first
        const fromLoc = departure.FromLocation?.find((loc) => loc.Priority === 1);
        const toLoc = arrival.ToLocation?.find((loc) => loc.Priority === 1);
        
        if (fromLoc?.LocationName) {
          // LocationName might be a full name or a signature
          // Try to look it up in the station map first (treating it as a signature)
          const fullName = stationMap.get(fromLoc.LocationName);
          if (fullName) {
            fromLocation = fullName;
          } else if (fromLoc.LocationName.length > 4) {
            // If not found and it's longer than 4 chars, it's probably already a full name
            fromLocation = fromLoc.LocationName;
          } else {
            // Short name but not in our cache, use as-is
            fromLocation = fromLoc.LocationName;
          }
        }
        
        if (toLoc?.LocationName) {
          // LocationName might be a full name or a signature
          // Try to look it up in the station map first (treating it as a signature)
          const fullName = stationMap.get(toLoc.LocationName);
          if (fullName) {
            toLocation = fullName;
          } else if (toLoc.LocationName.length > 4) {
            // If not found and it's longer than 4 chars, it's probably already a full name
            toLocation = toLoc.LocationName;
          } else {
            // Short name but not in our cache, use as-is
            toLocation = toLoc.LocationName;
          }
        }

        // Get actual departure time
        const actualDepartureTime = departure.TimeAtLocation || departure.EstimatedTimeAtLocation || departure.AdvertisedTimeAtLocation;

        // Extract train company from ProductInformation
        const trainCompany = extractTrainCompany(departure.ProductInformation);

        delays.push({
          trainNumber: departure.AdvertisedTrainIdent,
          trainCompany,
          journey: `${fromLocation} → ${toLocation}`,
          delayMinutes,
          departurePlanned: departure.AdvertisedTimeAtLocation,
          departureActual: actualDepartureTime,
          arrivalPlanned: arrival.AdvertisedTimeAtLocation,
          arrivalActual: actualArrivalTime,
          delayReason,
        });
      }

      // Sort by delay descending
      delays.sort((a, b) => b.delayMinutes - a.delayMinutes);

      logger.info(`Returning ${delays.length} delays (filtered from ${announcements.length} announcements)`);
      return delays;
    } catch (error: any) {
      logger.error(`Failed to fetch station delays: ${error.message}`);
      throw error;
    }
  }

  async fetchRouteDelays(
    originSignature: string,
    destSignature: string,
    startDate: string,
    endDate: string,
    minDelayMinutes: number = 20
  ): Promise<StationDelay[]> {
    try {
      logger.info(
        `Fetching effective delays for route ${originSignature} → ${destSignature} from ${startDate} to ${endDate}, min delay: ${minDelayMinutes}`
      );

      // Sync caches in parallel
      await Promise.all([this.syncStations(), this.syncReasonCodes()]);

      if (this.reasonCodePriorities.size === 0) {
        await this.loadReasonCodePriorities();
      }

      // Query for trains that stop at BOTH stations
      // We'll filter for origin first, then check if destination is also visited
      const filters = `
        <OR>
          <EQ name="LocationSignature" value="${originSignature}" />
          <EQ name="LocationSignature" value="${destSignature}" />
        </OR>
        <GTE name="AdvertisedTimeAtLocation" value="${startDate}" />
        <LTE name="AdvertisedTimeAtLocation" value="${endDate}" />
        <EQ name="Advertised" value="true" />
      `;

      const includes = [
        'AdvertisedTrainIdent',
        'OperationalTrainNumber',
        'ActivityType',
        'AdvertisedTimeAtLocation',
        'TimeAtLocation',
        'EstimatedTimeAtLocation',
        'LocationSignature',
        'Canceled',
        'Deviation',
        'FromLocation',
        'ToLocation',
        'ProductInformation',
        'OtherInformation',
      ];

      const xml = this.buildXmlQuery('TrainAnnouncement', '1.9', filters, includes);
      
      const announcements = await this.queryApi<TrainAnnouncement>('TrainAnnouncement', xml);

      logger.debug(`Received ${announcements.length} announcements for route query`);

      // Collect all unique station signatures for lookup
      const stationSignatures = new Set<string>();
      for (const ann of announcements) {
        ann.FromLocation?.forEach(loc => {
          if (loc.LocationName) stationSignatures.add(loc.LocationName);
          if (loc.LocationSignature) stationSignatures.add(loc.LocationSignature);
        });
        ann.ToLocation?.forEach(loc => {
          if (loc.LocationName) stationSignatures.add(loc.LocationName);
          if (loc.LocationSignature) stationSignatures.add(loc.LocationSignature);
        });
      }

      // Load all needed stations from cache in one query
      const stations = await this.prisma.station.findMany({
        where: {
          signature: { in: Array.from(stationSignatures) }
        }
      });
      const stationMap = new Map(stations.map(s => [s.signature, s.advertisedName]));

      // Group by train and service date
      const trainGroups: { [key: string]: TrainAnnouncement[] } = {};

      for (const ann of announcements) {
        const serviceDate = dayjs(ann.AdvertisedTimeAtLocation).format('YYYY-MM-DD');
        const trainKey = `${ann.AdvertisedTrainIdent}-${ann.OperationalTrainNumber || 'unknown'}-${serviceDate}`;
        
        if (!trainGroups[trainKey]) {
          trainGroups[trainKey] = [];
        }
        trainGroups[trainKey].push(ann);
      }

      // Build list of all trains with their timings
      interface TrainTiming {
        trainKey: string;
        trainNumber: string;
        plannedDeparture: dayjs.Dayjs;
        actualDeparture: dayjs.Dayjs | null;
        plannedArrival: dayjs.Dayjs;
        actualArrival: dayjs.Dayjs | null;
        canceled: boolean;
        group: TrainAnnouncement[];
      }

      const trainTimings: TrainTiming[] = [];

      for (const [trainKey, group] of Object.entries(trainGroups)) {
        // Check if this train visits BOTH origin and destination
        const originStops = group.filter(a => a.LocationSignature === originSignature);
        const destStops = group.filter(a => a.LocationSignature === destSignature);

        if (originStops.length === 0 || destStops.length === 0) {
          continue; // Skip trains that don't visit both stations
        }

        // Find departure from origin and arrival at destination
        const originDeparture = originStops
          .filter(a => a.ActivityType === 'Avgang')
          .sort((a, b) => dayjs(a.AdvertisedTimeAtLocation).valueOf() - dayjs(b.AdvertisedTimeAtLocation).valueOf())[0];

        const destArrival = destStops
          .filter(a => a.ActivityType === 'Ankomst')
          .sort((a, b) => dayjs(b.AdvertisedTimeAtLocation).valueOf() - dayjs(a.AdvertisedTimeAtLocation).valueOf())[0];

        if (!originDeparture || !destArrival) continue;

        // Make sure the arrival is after the departure (correct sequence)
        if (dayjs(destArrival.AdvertisedTimeAtLocation).isBefore(dayjs(originDeparture.AdvertisedTimeAtLocation))) {
          continue;
        }

        const trainNumber = originDeparture.AdvertisedTrainIdent;

        // Skip fast trains (ending with 'x') - not part of Västtrafik
        if (trainNumber.toLowerCase().endsWith('x')) {
          continue;
        }

        const plannedDeparture = dayjs(originDeparture.AdvertisedTimeAtLocation);
        const plannedArrival = dayjs(destArrival.AdvertisedTimeAtLocation);

        const actualDepartureTime = originDeparture.TimeAtLocation || originDeparture.EstimatedTimeAtLocation;
        const actualArrivalTime = destArrival.TimeAtLocation || destArrival.EstimatedTimeAtLocation;

        trainTimings.push({
          trainKey,
          trainNumber,
          plannedDeparture,
          actualDeparture: actualDepartureTime ? dayjs(actualDepartureTime) : null,
          plannedArrival,
          actualArrival: actualArrivalTime ? dayjs(actualArrivalTime) : null,
          canceled: destArrival.Canceled || false,
          group,
        });
      }

      // Sort by planned departure time
      trainTimings.sort((a, b) => a.plannedDeparture.valueOf() - b.plannedDeparture.valueOf());

      // Calculate effective delays
      const delays: StationDelay[] = [];

      for (let i = 0; i < trainTimings.length; i++) {
        const train = trainTimings[i];
        
        // Skip if no actual arrival data or canceled without checking alternatives
        if (!train.actualArrival && !train.canceled) continue;

        // Find the earliest actual arrival from this train or any later trains
        let earliestActualArrival: dayjs.Dayjs | null = null;
        let alternativeTrain: TrainTiming | null = null;

        for (let j = i; j < trainTimings.length; j++) {
          const laterTrain = trainTimings[j];

          // Skip cancelled trains
          if (laterTrain.canceled) continue;

          // Must have actual arrival data
          if (!laterTrain.actualArrival) continue;

          // Must depart at or after the original planned departure
          if (laterTrain.plannedDeparture.isBefore(train.plannedDeparture)) continue;

          if (!earliestActualArrival || laterTrain.actualArrival.isBefore(earliestActualArrival)) {
            earliestActualArrival = laterTrain.actualArrival;
            alternativeTrain = laterTrain;
          }

          // Once we find a train that gets us there on time or close to it, we can stop
          if (laterTrain.actualArrival.diff(train.plannedArrival, 'minute') < minDelayMinutes) {
            break;
          }
        }

        // If no alternative found (all later trains cancelled or no data), skip
        if (!earliestActualArrival) continue;

        // Calculate effective delay
        const effectiveDelayMinutes = earliestActualArrival.diff(train.plannedArrival, 'minute');

        // Skip if effective delay is below threshold
        if (effectiveDelayMinutes < minDelayMinutes) continue;

        // Extract delay reason - try original train first, then alternative
        let delayReason = 'Unknown reason';

        // Check original train for reason
        const originalDeviations = train.group.flatMap((a) => a.Deviation ?? []);
        if (originalDeviations.length > 0) {
          const uniqueDeviations: Array<{ code?: string; description: string }> = [];
          const seenDescriptions = new Set<string>();

          for (const dev of originalDeviations) {
            if (dev.Description && !seenDescriptions.has(dev.Description)) {
              seenDescriptions.add(dev.Description);
              uniqueDeviations.push({
                code: dev.Code,
                description: dev.Description
              });
            }
          }

          if (uniqueDeviations.length > 0) {
            // Return all deviation descriptions without filtering
            const filteredReasons = this.filterDeviationReasons(uniqueDeviations);
            delayReason = filteredReasons.join('; ');
          }
        }

        // If still unknown and we have alternative train, check it
        if (delayReason === 'Unknown reason' && alternativeTrain && alternativeTrain.trainKey !== train.trainKey) {
          const altDeviations = alternativeTrain.group.flatMap((a) => a.Deviation ?? []);
          if (altDeviations.length > 0) {
            const uniqueDeviations: Array<{ code?: string; description: string }> = [];
            const seenDescriptions = new Set<string>();

            for (const dev of altDeviations) {
              if (dev.Description && !seenDescriptions.has(dev.Description)) {
                seenDescriptions.add(dev.Description);
                uniqueDeviations.push({
                  code: dev.Code,
                  description: dev.Description
                });
              }
            }

            if (uniqueDeviations.length > 0) {
              // Return all deviation descriptions without filtering
              const filteredReasons = this.filterDeviationReasons(uniqueDeviations);
              delayReason = filteredReasons.join('; ');
            }
          }
        }

        // Add OtherInformation to delay reason
        const otherInfo = train.group.flatMap((a) => a.OtherInformation ?? []);
        if (otherInfo.length > 0) {
          const uniqueOtherInfo: string[] = [];
          const seenInfo = new Set<string>();

          for (const info of otherInfo) {
            if (info.Description && !seenInfo.has(info.Description)) {
              seenInfo.add(info.Description);
              uniqueOtherInfo.push(info.Description);
            }
          }

          if (uniqueOtherInfo.length > 0) {
            // Append OtherInformation to delay reason
            if (delayReason !== 'Unknown reason') {
              delayReason += '; ' + uniqueOtherInfo.join('; ');
            } else {
              delayReason = uniqueOtherInfo.join('; ');
            }
          }
        }

        // Build alternative train info
        let alternativeInfo: string | undefined;

        // If we took an alternative train
        if (alternativeTrain && alternativeTrain.trainKey !== train.trainKey) {
          if (train.canceled) {
            alternativeInfo = `Train ${train.trainNumber} cancelled - took ${alternativeTrain.trainNumber} instead`;
          } else {
            alternativeInfo = `Train ${train.trainNumber} delayed - took ${alternativeTrain.trainNumber} instead`;
          }
        }

        // Get origin and destination names
        const originName = stationMap.get(originSignature) || originSignature;
        const destName = stationMap.get(destSignature) || destSignature;

        // Get actual departure time (from the train we actually took)
        const actualDepartureTime = (alternativeTrain || train).actualDeparture?.toISOString() ||
                                    (alternativeTrain || train).plannedDeparture.toISOString();

        // Extract train company from ProductInformation of the original train's departure
        const originDeparture = train.group.find(
          a => a.LocationSignature === originSignature && a.ActivityType === 'Avgang'
        );
        const trainCompany = originDeparture ? extractTrainCompany(originDeparture.ProductInformation) : undefined;

        delays.push({
          trainNumber: train.trainNumber,
          trainCompany,
          journey: `${originName} → ${destName}`,
          delayMinutes: effectiveDelayMinutes,
          departurePlanned: train.plannedDeparture.toISOString(),
          departureActual: actualDepartureTime,
          arrivalPlanned: train.plannedArrival.toISOString(),
          arrivalActual: earliestActualArrival.toISOString(),
          delayReason,
          alternativeInfo,
        });
      }

      delays.sort((a, b) => b.delayMinutes - a.delayMinutes);

      logger.info(`Returning ${delays.length} effective delays (filtered from ${announcements.length} announcements)`);
      return delays;
    } catch (error: any) {
      logger.error(`Failed to fetch route delays: ${error.message}`);
      throw error;
    }
  }
}
