// lib/logger.cjs
// Structured logging utility with environment-aware log levels

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

const LOG_COLORS = {
  ERROR: '\x1b[31m', // Red
  WARN: '\x1b[33m',  // Yellow
  INFO: '\x1b[36m',  // Cyan
  DEBUG: '\x1b[90m', // Gray
  RESET: '\x1b[0m',
};

class Logger {
  constructor(options = {}) {
    this.minLevel = this.getMinLevel(options.level);
    this.context = options.context || '';
    this.useColors = options.useColors !== false;
  }

  getMinLevel(level) {
    if (process.env.LOG_LEVEL) {
      const envLevel = process.env.LOG_LEVEL.toUpperCase();
      if (LOG_LEVELS[envLevel] !== undefined) {
        return LOG_LEVELS[envLevel];
      }
    }
    
    if (level && LOG_LEVELS[level.toUpperCase()] !== undefined) {
      return LOG_LEVELS[level.toUpperCase()];
    }

    // Default: WARN in production, DEBUG in development
    return process.env.NODE_ENV === 'production' ? LOG_LEVELS.WARN : LOG_LEVELS.DEBUG;
  }

  formatMessage(level, message, data) {
    const timestamp = new Date().toISOString();
    const prefix = this.context ? `[${this.context}]` : '';
    const color = this.useColors ? LOG_COLORS[level] : '';
    const reset = this.useColors ? LOG_COLORS.RESET : '';
    
    let formatted = `${color}${timestamp} ${level.padEnd(5)} ${prefix} ${message}${reset}`;
    
    if (data && Object.keys(data).length > 0) {
      formatted += `\n${color}  Data: ${JSON.stringify(data, null, 2)}${reset}`;
    }
    
    return formatted;
  }

  log(level, message, data = {}) {
    if (LOG_LEVELS[level] > this.minLevel) {
      return; // Skip if below minimum level
    }

    const formatted = this.formatMessage(level, message, data);
    
    switch (level) {
      case 'ERROR':
        console.error(formatted);
        break;
      case 'WARN':
        console.warn(formatted);
        break;
      case 'INFO':
        console.info(formatted);
        break;
      case 'DEBUG':
        console.log(formatted);
        break;
    }
  }

  error(message, data = {}) {
    this.log('ERROR', message, data);
  }

  warn(message, data = {}) {
    this.log('WARN', message, data);
  }

  info(message, data = {}) {
    this.log('INFO', message, data);
  }

  debug(message, data = {}) {
    this.log('DEBUG', message, data);
  }

  // Create child logger with additional context
  child(context) {
    return new Logger({
      level: Object.keys(LOG_LEVELS).find(k => LOG_LEVELS[k] === this.minLevel),
      context: this.context ? `${this.context}:${context}` : context,
      useColors: this.useColors,
    });
  }
}

// Create default logger instance
const defaultLogger = new Logger();

// Export both the class and default instance
module.exports = {
  Logger,
  logger: defaultLogger,
  createLogger: (options) => new Logger(options),
};
