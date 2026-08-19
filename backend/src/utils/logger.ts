import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';

const logLevel = process.env.LOG_LEVEL || 'info';
const isProduction = process.env.NODE_ENV === 'production';

// Resolve log directory
// In production (Docker): use /app/data/logs
// In development: resolve from backend/src/utils/ or backend/dist/utils/
const logDir = isProduction
  ? '/app/data/logs'
  : path.join(path.resolve(__dirname, '../../../'), 'data', 'logs');

// Ensure log directory exists to prevent transport errors on startup. A
// permission failure here must not take the process down: the container falls
// back to console-only logging so the operator can still read the reason.
let fileLoggingAvailable = true;
try {
  fs.mkdirSync(logDir, { recursive: true });
  fs.accessSync(logDir, fs.constants.W_OK);
} catch (error) {
  fileLoggingAvailable = false;
  const reason = error instanceof Error ? error.message : String(error);
  console.error(
    `Log directory "${logDir}" is not writable (${reason}). ` +
      'Falling back to console logging. Check that the mounted data directory ' +
      'is owned by the PUID:PGID the container runs as.'
  );
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let metaStr = '';
    if (Object.keys(meta).length > 0) {
      metaStr = JSON.stringify(meta, null, 2);
    }
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
  })
);

// Rotating file transports, built only when the log directory is usable:
// constructing them opens the target file straight away.
const buildFileTransports = (): winston.transport[] => [
  new DailyRotateFile({
    filename: path.join(logDir, 'app-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
    format: logFormat,
  }),
  new DailyRotateFile({
    filename: path.join(logDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '30d',
    level: 'error',
    format: logFormat,
  }),
];

// Create the logger
export const logger = winston.createLogger({
  level: logLevel,
  format: logFormat,
  transports: fileLoggingAvailable ? buildFileTransports() : [],
});

// Console transport in development, and as the only sink when files are unusable
if (!isProduction || !fileLoggingAvailable) {
  logger.add(
    new winston.transports.Console({
      format: isProduction ? logFormat : consoleFormat,
    })
  );
}

// Handle uncaught exceptions and unhandled rejections
if (fileLoggingAvailable) {
  logger.exceptions.handle(
    new DailyRotateFile({
      filename: path.join(logDir, 'exceptions-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
    })
  );

  logger.rejections.handle(
    new DailyRotateFile({
      filename: path.join(logDir, 'rejections-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
    })
  );
}

export default logger;
