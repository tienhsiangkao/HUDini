// config/defaults.cjs
// Default configuration values for the poker parser application

/**
 * Default configuration object containing all application settings.
 * Values can be overridden via environment variables or custom config files.
 */
module.exports = {
  /**
   * Cache configuration for performance optimization
   */
  cache: {
    /**
     * Hands range query cache settings
     */
    hands: {
      ttl: 60000, // Cache time-to-live in milliseconds (1 minute)
      maxEntries: 50 // Maximum number of cached entries
    },

    /**
     * Hero graph data cache settings
     */
    graph: {
      ttl: 30000, // Cache time-to-live in milliseconds (30 seconds)
      maxEntries: 30 // Maximum number of cached entries
    }
  },

  /**
   * Pagination and query limits
   */
  limits: {
    /**
     * Hands query limits
     */
    hands: {
      default: 300, // Default limit for hand queries
      max: 10000, // Maximum allowed limit for hand searches
      playerNotes: 100 // Limit for player notes queries
    },

    /**
     * Stats query limits
     */
    stats: {
      default: 500, // Default limit for stats queries
      max: 5000 // Maximum allowed limit for stats queries
    },

    /**
     * Sessions query limits
     */
    sessions: {
      default: 50, // Default limit for session queries
      max: 500 // Maximum allowed limit for session queries
    }
  },

  /**
   * Session detection and analysis settings
   */
  sessions: {
    /**
     * Gap between hands to consider them part of separate sessions
     * Default: 30 minutes (1800000 milliseconds)
     */
    gapMinutes: 30,

    /**
     * Minimum hands required to consider a valid session
     */
    minHands: 1
  },

  /**
   * Performance optimization settings
   */
  performance: {
    /**
     * Fetch multiplier for batch operations
     * Used to fetch more data than requested to reduce roundtrips
     */
    fetchMultiplier: 1.5,

    /**
     * Enable query result caching
     */
    enableCaching: true
  },

  /**
   * Server and development settings
   */
  server: {
    /**
     * Default port for development server (Vite)
     */
    devPort: 3000
  },

  /**
   * Database settings
   */
  database: {
    /**
     * Enable WAL mode for better concurrency
     */
    walMode: true,

    /**
     * Timeout for database operations (milliseconds)
     */
    timeout: 5000
  },

  /**
   * Logging configuration
   */
  logging: {
    /**
     * Log level: 'error' | 'warn' | 'info' | 'debug'
     */
    level: 'info',

    /**
     * Enable file logging
     */
    enableFileLogging: true
  }
};
