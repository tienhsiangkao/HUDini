# Configuration System

This document describes the centralized configuration system for the poker parser application.

## Overview

All configuration values (cache settings, limits, session parameters, etc.) are centralized in the `config/` directory. This system provides:

- **Centralized Configuration**: All settings in one place
- **Environment Variable Overrides**: Customize behavior without code changes
- **Type Safety**: Automatic parsing and validation
- **Documentation**: Clear descriptions of all settings
- **Defaults**: Sensible defaults for all options

## Configuration Structure

The configuration system consists of two main files:

- `config/defaults.cjs` - Default values for all settings
- `config/index.cjs` - Main module with environment override support

## Configuration Options

### Cache Settings

Control performance-enhancing caches for expensive database queries.

#### Hands Cache

- **`config.cache.hands.ttl`**
  - Default: `60000` (60 seconds)
  - Environment: `CACHE_TTL_HANDS`
  - Description: Time-to-live for cached hand range queries in milliseconds

- **`config.cache.hands.maxEntries`**
  - Default: `50`
  - Environment: `CACHE_MAX_ENTRIES_HANDS`
  - Description: Maximum number of cached hand range queries

#### Graph Cache

- **`config.cache.graph.ttl`**
  - Default: `30000` (30 seconds)
  - Environment: `CACHE_TTL_GRAPH`
  - Description: Time-to-live for cached graph data in milliseconds

- **`config.cache.graph.maxEntries`**
  - Default: `30`
  - Environment: `CACHE_MAX_ENTRIES_GRAPH`
  - Description: Maximum number of cached graph data entries

### Query Limits

Control pagination and result set sizes to prevent excessive memory usage.

#### Hands Limits

- **`config.limits.hands.default`**
  - Default: `300`
  - Environment: `LIMIT_HANDS_DEFAULT`
  - Description: Default number of hands returned by `hands:list` queries

- **`config.limits.hands.max`**
  - Default: `10000`
  - Environment: `LIMIT_HANDS_MAX`
  - Description: Maximum hands that can be requested (safety limit)

- **`config.limits.hands.playerNotes`**
  - Default: `100`
  - Environment: `LIMIT_PLAYER_NOTES`
  - Description: Maximum results for player notes searches

#### Stats Limits

- **`config.limits.stats.default`**
  - Default: `500`
  - Environment: `LIMIT_STATS_DEFAULT`
  - Description: Default number of player stats returned

- **`config.limits.stats.max`**
  - Default: `5000`
  - Environment: `LIMIT_STATS_MAX`
  - Description: Maximum player stats that can be requested

#### Sessions Limits

- **`config.limits.sessions.default`**
  - Default: `50`
  - Environment: `LIMIT_SESSIONS_DEFAULT`
  - Description: Default number of sessions returned

- **`config.limits.sessions.max`**
  - Default: `500`
  - Environment: `LIMIT_SESSIONS_MAX`
  - Description: Maximum sessions that can be requested

### Session Detection

Control how play sessions are detected and grouped.

- **`config.sessions.gapMinutes`**
  - Default: `30`
  - Environment: `SESSION_GAP_MINUTES`
  - Description: Minutes of inactivity before considering a new session

- **`config.sessions.minHands`**
  - Default: `1`
  - Environment: `SESSION_MIN_HANDS`
  - Description: Minimum hands required to constitute a valid session

### Performance Settings

- **`config.performance.fetchMultiplier`**
  - Default: `1.5`
  - Environment: `FETCH_MULTIPLIER`
  - Description: Multiplier for batch fetch operations (reduces roundtrips)

- **`config.performance.enableCaching`**
  - Default: `true`
  - Environment: `ENABLE_CACHING`
  - Description: Master switch for all caching features

### Server Settings

- **`config.server.devPort`**
  - Default: `3000`
  - Environment: `DEV_SERVER_PORT`
  - Description: Port for Vite development server

### Database Settings

- **`config.database.walMode`**
  - Default: `true`
  - Environment: `DB_WAL_MODE`
  - Description: Enable SQLite WAL mode for better concurrency

- **`config.database.timeout`**
  - Default: `5000`
  - Environment: `DB_TIMEOUT`
  - Description: Database operation timeout in milliseconds

### Logging Settings

- **`config.logging.level`**
  - Default: `'info'`
  - Environment: `LOG_LEVEL`
  - Description: Minimum log level ('error', 'warn', 'info', 'debug')

- **`config.logging.enableFileLogging`**
  - Default: `true`
  - Environment: `ENABLE_FILE_LOGGING`
  - Description: Enable logging to file

## Usage in Code

Import the configuration module in any handler or service:

```javascript
const config = require('./config/index.cjs');

// Access configuration values
const cacheTTL = config.cache.hands.ttl;
const defaultLimit = config.limits.hands.default;
const sessionGap = config.sessions.gapMinutes;
```

## Environment Variable Override

You can override any configuration value using environment variables:

### Windows (PowerShell)

```powershell
# Set single variable
$env:CACHE_TTL_HANDS=120000

# Run with multiple overrides
$env:CACHE_TTL_HANDS=120000; $env:SESSION_GAP_MINUTES=60; npm start
```

### Linux/macOS (Bash)

```bash
# Set single variable
export CACHE_TTL_HANDS=120000

# Run with multiple overrides
CACHE_TTL_HANDS=120000 SESSION_GAP_MINUTES=60 npm start
```

### Using .env File (Optional)

Create a `.env` file in the project root:

```bash
# Cache settings
CACHE_TTL_HANDS=120000
CACHE_MAX_ENTRIES_HANDS=100

# Session detection
SESSION_GAP_MINUTES=60

# Logging
LOG_LEVEL=debug
```

To enable `.env` file support, install dotenv:

```bash
npm install dotenv
```

Then add to the top of `config/index.cjs`:

```javascript
require('dotenv').config();
```

## Common Scenarios

### Development Mode

Increase logging and cache sizes for debugging:

```bash
LOG_LEVEL=debug
CACHE_MAX_ENTRIES_HANDS=100
CACHE_MAX_ENTRIES_GRAPH=50
ENABLE_FILE_LOGGING=true
```

### Production Mode

Optimize for performance with larger caches and limits:

```bash
LOG_LEVEL=warn
CACHE_TTL_HANDS=300000
CACHE_TTL_GRAPH=180000
CACHE_MAX_ENTRIES_HANDS=200
CACHE_MAX_ENTRIES_GRAPH=100
LIMIT_HANDS_DEFAULT=500
```

### Testing Mode

Disable caching and reduce limits for predictable tests:

```bash
ENABLE_CACHING=false
LIMIT_HANDS_DEFAULT=100
LIMIT_STATS_DEFAULT=100
SESSION_GAP_MINUTES=30
```

### Memory-Constrained Environment

Reduce cache sizes and limits:

```bash
CACHE_MAX_ENTRIES_HANDS=20
CACHE_MAX_ENTRIES_GRAPH=10
LIMIT_HANDS_MAX=5000
LIMIT_STATS_MAX=2000
```

## Configuration Validation

The configuration system includes automatic type checking:

- **Integers**: Parsed with `parseInt()`, fallback to default if invalid
- **Floats**: Parsed with `parseFloat()`, fallback to default if invalid
- **Booleans**: Accepts `'true'`, `'1'`, `'false'`, `'0'`
- **Strings**: Used as-is (no parsing)

Invalid values are automatically replaced with defaults, ensuring the application always runs with valid configuration.

## Adding New Configuration

To add a new configuration option:

1. **Add to `config/defaults.cjs`**:
   ```javascript
   newFeature: {
     enabled: true,
     timeout: 5000
   }
   ```

2. **Add to `config/index.cjs` builder**:
   ```javascript
   newFeature: {
     enabled: parseEnvBool('NEW_FEATURE_ENABLED', defaults.newFeature.enabled),
     timeout: parseEnvInt('NEW_FEATURE_TIMEOUT', defaults.newFeature.timeout)
   }
   ```

3. **Document in this file** with:
   - Default value
   - Environment variable name
   - Description

4. **Use in code**:
   ```javascript
   const config = require('./config/index.cjs');
   if (config.newFeature.enabled) {
     // Use feature
   }
   ```

## Related Files

- `config/defaults.cjs` - Default configuration values
- `config/index.cjs` - Main configuration module
- `CONFIG_MAPPING.md` - Mapping of hardcoded values to config keys
- `handlers/*.cjs` - Handlers using configuration

## Migration Notes

Previous hardcoded values have been migrated to configuration:

| Old Location | Old Value | New Config Key |
|--------------|-----------|----------------|
| hands-handlers.cjs:12 | `60000` | `config.cache.hands.ttl` |
| hands-handlers.cjs:13 | `50` | `config.cache.hands.maxEntries` |
| hands-handlers.cjs:88 | `300` | `config.limits.hands.default` |
| hands-handlers.cjs:300 | `100` | `config.limits.hands.playerNotes` |
| hands-handlers.cjs:392 | `10000` | `config.limits.hands.max` |
| stats-handlers.cjs:276 | `500` | `config.limits.stats.default` |
| stats-handlers.cjs:276 | `5000` | `config.limits.stats.max` |
| sessions-handlers.cjs:47 | `30` | `config.sessions.gapMinutes` |
| sessions-handlers.cjs:49 | `50` | `config.limits.sessions.default` |
| sessions-handlers.cjs:54 | `500` | `config.limits.sessions.max` |

All mathematical constants (percentage calculations, time conversions) remain hardcoded as they represent operations, not configuration.
