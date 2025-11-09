// config/index.cjs
// Main configuration module with environment variable override support

const defaults = require('./defaults.cjs');

/**
 * Parse environment variable as integer with fallback
 * @param {string} envVar - Environment variable name
 * @param {number} fallback - Default value if env var not set or invalid
 * @returns {number}
 */
function parseEnvInt(envVar, fallback) {
  const value = process.env[envVar];
  if (value === undefined || value === '') return fallback;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? fallback : parsed;
}

/**
 * Parse environment variable as boolean with fallback
 * @param {string} envVar - Environment variable name
 * @param {boolean} fallback - Default value if env var not set
 * @returns {boolean}
 */
function parseEnvBool(envVar, fallback) {
  const value = process.env[envVar];
  if (value === undefined || value === '') return fallback;
  return value.toLowerCase() === 'true' || value === '1';
}

/**
 * Parse environment variable as float with fallback
 * @param {string} envVar - Environment variable name
 * @param {number} fallback - Default value if env var not set or invalid
 * @returns {number}
 */
function parseEnvFloat(envVar, fallback) {
  const value = process.env[envVar];
  if (value === undefined || value === '') return fallback;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? fallback : parsed;
}

/**
 * Build configuration object with environment variable overrides
 * @returns {object} Complete configuration object
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

// Export singleton config instance
const config = buildConfig();

module.exports = config;

// Export builder for testing
module.exports.buildConfig = buildConfig;
module.exports.defaults = defaults;
