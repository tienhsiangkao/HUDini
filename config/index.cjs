// config/index.cjs
// Main configuration module with environment variable override support

const defaults = require('./defaults.cjs');

/**
 * Parse environment variable as integer with fallback to default
 * @param {string} envVar - Environment variable name (e.g., 'CACHE_TTL_HANDS')
 * @param {number} fallback - Default value if env var not set or invalid
 * @returns {number} Parsed integer value or fallback
 * @example
 * // Returns 120000 if CACHE_TTL_HANDS=120000, otherwise 60000
 * const ttl = parseEnvInt('CACHE_TTL_HANDS', 60000);
 */
function parseEnvInt(envVar, fallback) {
  const value = process.env[envVar];
  if (value === undefined || value === '') return fallback;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? fallback : parsed;
}

/**
 * Parse environment variable as boolean with fallback to default
 * @param {string} envVar - Environment variable name (e.g., 'ENABLE_CACHING')
 * @param {boolean} fallback - Default value if env var not set
 * @returns {boolean} Parsed boolean value or fallback
 * @example
 * // Returns true if ENABLE_CACHING=true or ENABLE_CACHING=1
 * // Returns false if ENABLE_CACHING=false or ENABLE_CACHING=0
 * const enabled = parseEnvBool('ENABLE_CACHING', true);
 */
function parseEnvBool(envVar, fallback) {
  const value = process.env[envVar];
  if (value === undefined || value === '') return fallback;
  return value.toLowerCase() === 'true' || value === '1';
}

/**
 * Parse environment variable as float with fallback to default
 * @param {string} envVar - Environment variable name (e.g., 'FETCH_MULTIPLIER')
 * @param {number} fallback - Default value if env var not set or invalid
 * @returns {number} Parsed float value or fallback
 * @example
 * // Returns 2.5 if FETCH_MULTIPLIER=2.5, otherwise 1.5
 * const multiplier = parseEnvFloat('FETCH_MULTIPLIER', 1.5);
 */
function parseEnvFloat(envVar, fallback) {
  const value = process.env[envVar];
  if (value === undefined || value === '') return fallback;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? fallback : parsed;
}

/**
 * Build configuration object with environment variable overrides.
 * Combines default values from defaults.cjs with runtime environment variable overrides.
 * 
 * @returns {object} Complete configuration object with all settings
 * @property {object} cache - Caching configuration
 * @property {object} cache.hands - Hand range cache settings (ttl, maxEntries)
 * @property {object} cache.graph - Graph data cache settings (ttl, maxEntries)
 * @property {object} limits - Query pagination limits
 * @property {object} limits.hands - Hand query limits (default, max, playerNotes)
 * @property {object} limits.stats - Stats query limits (default, max)
 * @property {object} limits.sessions - Session query limits (default, max)
 * @property {object} sessions - Session detection settings (gapMinutes, minHands)
 * @property {object} performance - Performance tuning (fetchMultiplier, enableCaching)
 * @property {object} server - Server settings (devPort)
 * @property {object} database - Database settings (walMode, timeout)
 * @property {object} logging - Logging configuration (level, enableFileLogging)
 * 
 * @example
 * const config = buildConfig();
 * console.log(config.cache.hands.ttl); // 60000 (or CACHE_TTL_HANDS env var)
 * console.log(config.limits.hands.default); // 300 (or LIMIT_HANDS_DEFAULT env var)
 */
function buildConfig() {
  return {
    cache: {
      hands: {
        ttl: parseEnvInt('CACHE_TTL_HANDS', defaults.cache.hands.ttl),
        maxEntries: parseEnvInt('CACHE_MAX_ENTRIES_HANDS', defaults.cache.hands.maxEntries)
      },
      graph: {
        ttl: parseEnvInt('CACHE_TTL_GRAPH', defaults.cache.graph.ttl),
        maxEntries: parseEnvInt('CACHE_MAX_ENTRIES_GRAPH', defaults.cache.graph.maxEntries)
      }
    },

    limits: {
      hands: {
        default: parseEnvInt('LIMIT_HANDS_DEFAULT', defaults.limits.hands.default),
        max: parseEnvInt('LIMIT_HANDS_MAX', defaults.limits.hands.max),
        playerNotes: parseEnvInt('LIMIT_PLAYER_NOTES', defaults.limits.hands.playerNotes)
      },
      stats: {
        default: parseEnvInt('LIMIT_STATS_DEFAULT', defaults.limits.stats.default),
        max: parseEnvInt('LIMIT_STATS_MAX', defaults.limits.stats.max)
      },
      sessions: {
        default: parseEnvInt('LIMIT_SESSIONS_DEFAULT', defaults.limits.sessions.default),
        max: parseEnvInt('LIMIT_SESSIONS_MAX', defaults.limits.sessions.max)
      }
    },

    sessions: {
      gapMinutes: parseEnvInt('SESSION_GAP_MINUTES', defaults.sessions.gapMinutes),
      minHands: parseEnvInt('SESSION_MIN_HANDS', defaults.sessions.minHands)
    },

    performance: {
      fetchMultiplier: parseEnvFloat('FETCH_MULTIPLIER', defaults.performance.fetchMultiplier),
      enableCaching: parseEnvBool('ENABLE_CACHING', defaults.performance.enableCaching)
    },

    server: {
      devPort: parseEnvInt('DEV_SERVER_PORT', defaults.server.devPort)
    },

    database: {
      walMode: parseEnvBool('DB_WAL_MODE', defaults.database.walMode),
      timeout: parseEnvInt('DB_TIMEOUT', defaults.database.timeout)
    },

    logging: {
      level: process.env.LOG_LEVEL || defaults.logging.level,
      enableFileLogging: parseEnvBool('ENABLE_FILE_LOGGING', defaults.logging.enableFileLogging)
    }
  };
}

/**
 * Singleton configuration instance with environment variable overrides applied.
 * Import this module to access application configuration.
 * 
 * @type {object}
 * @constant
 * @example
 * const config = require('./config/index.cjs');
 * 
 * // Access cache settings
 * const cacheTTL = config.cache.hands.ttl;
 * 
 * // Access limits
 * const defaultLimit = config.limits.hands.default;
 * 
 * // Check if caching is enabled
 * if (config.performance.enableCaching) {
 *   // Use cache
 * }
 */
const config = buildConfig();

module.exports = config;

/**
 * Configuration builder function (exported for testing).
 * @function buildConfig
 */
module.exports.buildConfig = buildConfig;

/**
 * Default configuration values (exported for reference).
 * @constant defaults
 */
module.exports.defaults = defaults;
