import winston from 'winston';
import { env } from '../config/env';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  debug: 'blue',
};

winston.addColors(colors);

// Create custom format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    if (stack) {
      return `[${timestamp}] ${level}: ${message}\n${stack}`;
    }
    return `[${timestamp}] ${level}: ${message}`;
  })
);

// Create transports
const transports: winston.transport[] = [
  // Console transport
  new winston.transports.Console({
    level: env.LOG_LEVEL,
    format: consoleFormat,
  }),
];

// Add file transports in production
if (process.env.NODE_ENV === 'production') {
  transports.push(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      format,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
}

// Create logger instance
export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  levels,
  format,
  transports,
  exitOnError: false,
});

// Stream for Morgan HTTP logging
export const loggerStream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};

// Helper function to create child loggers with context
export const createChildLogger = (context: string) => {
  return logger.child({ context });
};

// Helper functions for different log levels with context
export const logError = (message: string, error?: Error, context?: string) => {
  const logMessage = context ? `[${context}] ${message}` : message;
  if (error) {
    logger.error(logMessage, { error: error.message, stack: error.stack });
  } else {
    logger.error(logMessage);
  }
};

export const logWarn = (message: string, context?: string) => {
  const logMessage = context ? `[${context}] ${message}` : message;
  logger.warn(logMessage);
};

export const logInfo = (message: string, context?: string) => {
  const logMessage = context ? `[${context}] ${message}` : message;
  logger.info(logMessage);
};

export const logDebug = (message: string, context?: string) => {
  const logMessage = context ? `[${context}] ${message}` : message;
  logger.debug(logMessage);
};
