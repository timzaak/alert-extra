/**
 * Logger service for the Alert system
 * Provides centralized logging functionality with different log levels
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

export interface LoggerOptions {
  level: LogLevel;
  prefix?: string;
  timestamp?: boolean;
}

export class LoggerService {
  private static instance: LoggerService;
  private level: LogLevel;
  private prefix: string;
  private timestamp: boolean;

  /**
   * Creates a new instance of LoggerService
   * @param options Logger options
   */
  private constructor(options: LoggerOptions) {
    this.level = options.level;
    this.prefix = options.prefix || 'Alert';
    this.timestamp = options.timestamp !== undefined ? options.timestamp : true;
  }

  /**
   * Get the singleton instance of LoggerService
   * @param options Logger options
   * @returns LoggerService instance
   */
  public static getInstance(options?: LoggerOptions): LoggerService {
    if (!LoggerService.instance) {
      LoggerService.instance = new LoggerService(options || {
        level: LogLevel.INFO,
        prefix: 'Alert',
        timestamp: true
      });
    }
    return LoggerService.instance;
  }

  /**
   * Configure the logger
   * @param options Logger options
   */
  public configure(options: Partial<LoggerOptions>): void {
    if (options.level !== undefined) {
      this.level = options.level;
    }
    if (options.prefix !== undefined) {
      this.prefix = options.prefix;
    }
    if (options.timestamp !== undefined) {
      this.timestamp = options.timestamp;
    }
  }

  /**
   * Format a log message
   * @param level Log level
   * @param message Log message
   * @returns Formatted log message
   */
  private formatMessage(level: string, message: string): string {
    const parts = [];
    
    if (this.timestamp) {
      parts.push(`[${new Date().toISOString()}]`);
    }
    
    parts.push(`[${this.prefix}]`);
    parts.push(`[${level}]`);
    parts.push(message);
    
    return parts.join(' ');
  }

  /**
   * Log a debug message
   * @param message Message to log
   * @param data Additional data to log
   */
  public debug(message: string, ...data: unknown[]): void {
    if (this.level <= LogLevel.DEBUG) {
      console.debug(this.formatMessage('DEBUG', message), ...data);
    }
  }

  /**
   * Log an info message
   * @param message Message to log
   * @param data Additional data to log
   */
  public info(message: string, ...data: unknown[]): void {
    if (this.level <= LogLevel.INFO) {
      console.info(this.formatMessage('INFO', message), ...data);
    }
  }

  /**
   * Log a warning message
   * @param message Message to log
   * @param data Additional data to log
   */
  public warn(message: string, ...data: unknown[]): void {
    if (this.level <= LogLevel.WARN) {
      console.warn(this.formatMessage('WARN', message), ...data);
    }
  }

  /**
   * Log an error message
   * @param message Message to log
   * @param error Error object
   * @param data Additional data to log
   */
  public error(message: string, error?: Error | unknown, ...data: unknown[]): void {
    if (this.level <= LogLevel.ERROR) {
      if (error instanceof Error) {
        console.error(this.formatMessage('ERROR', message), error.message, error.stack, ...data);
      } else if (error !== undefined) {
        console.error(this.formatMessage('ERROR', message), error, ...data);
      } else {
        console.error(this.formatMessage('ERROR', message), ...data);
      }
    }
  }
}

// Export a default logger instance
export const logger = LoggerService.getInstance();