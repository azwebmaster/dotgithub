export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LoggerOptions {
  level?: LogLevel;
  pretty?: boolean;
  silent?: boolean;
}

class Logger {
  private level: LogLevel;
  private isCli: boolean;
  private pretty: boolean;

  constructor(options: LoggerOptions = {}) {
    this.isCli = typeof process !== 'undefined' && (process.stdout.isTTY === true);
    this.pretty = options.pretty === true || (options.pretty !== false && this.isCli);
    this.level = options.level || (this.isCli ? 'info' : 'warn');
    
    if (options.silent) {
      this.level = 'silent' as LogLevel;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];
    const currentLevelIndex = levels.indexOf(this.level);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  private formatMessage(level: LogLevel, message: string, data?: any): string {
    if (this.pretty) {
      const timestamp = new Date().toISOString();
      const levelEmoji = {
        trace: '🔍',
        debug: '🐛',
        info: '', // No icon for info logs
        warn: '⚠️',
        error: '❌',
        fatal: '💀'
      }[level];
      
      let output = levelEmoji ? `${levelEmoji} ${message}` : message;
      if (data && Object.keys(data).length > 0) {
        output += ` ${JSON.stringify(data, null, 2)}`;
      }
      return output;
    } else {
      const logEntry = {
        level,
        time: new Date().toISOString(),
        msg: message,
        ...data
      };
      return JSON.stringify(logEntry);
    }
  }

  trace(message: string, data?: any) {
    if (this.shouldLog('trace')) {
      console.log(this.formatMessage('trace', message, data));
    }
  }

  debug(message: string, data?: any) {
    if (this.shouldLog('debug')) {
      console.log(this.formatMessage('debug', message, data));
    }
  }

  info(message: string, data?: any) {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', message, data));
    }
  }

  warn(message: string, data?: any) {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, data));
    }
  }

  error(message: string, data?: any) {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message, data));
    }
  }

  fatal(message: string, data?: any) {
    if (this.shouldLog('fatal')) {
      console.error(this.formatMessage('fatal', message, data));
    }
  }

  // Convenience methods for CLI
  success(message: string, data?: any) {
    this.info(`✅ ${message}`, data);
  }

  failure(message: string, data?: any) {
    this.error(`❌ ${message}`, data);
  }

  progress(message: string, data?: any) {
    this.info(`🔄 ${message}`, data);
  }

  // Set log level at runtime
  setLevel(level: LogLevel) {
    this.level = level;
  }

  // Check if a level is enabled
  isLevelEnabled(level: LogLevel): boolean {
    return this.shouldLog(level);
  }
}

// Create default logger instance
export const logger = new Logger();

// Factory function for creating loggers with specific options
export function createLogger(options: LoggerOptions): Logger {
  return new Logger(options);
}

// Export the class for custom instances
export { Logger };
