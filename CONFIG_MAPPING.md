// CONFIG_MAPPING.md
// Mapping of hardcoded values to configuration keys

## Hardcoded Values Extraction Map

This document maps all hardcoded configuration values found in handler files to their new configuration keys.

### hands-handlers.cjs

| Line | Old Value | Config Key | Description |
|------|-----------|------------|-------------|
| 12 | `60000` | `config.cache.hands.ttl` | Cache TTL for range queries (1 minute) |
| 13 | `50` | `config.cache.hands.maxEntries` | Maximum cache size for range queries |
| 88 | `300` | `config.limits.hands.default` | Default limit for hands:list queries |
| 300 | `100` | `config.limits.hands.playerNotes` | Limit for hands:searchNotes |
| 392 | `10000` | `config.limits.hands.max` | Maximum limit for hands:range safety |

### stats-handlers.cjs

| Line | Old Value | Config Key | Description |
|------|-----------|------------|-------------|
| 276 | `500` | `config.limits.stats.default` | Default limit for stats queries |
| 276 | `5000` | `config.limits.stats.max` | Maximum limit for stats queries |

### sessions-handlers.cjs

| Line | Old Value | Config Key | Description |
|------|-----------|------------|-------------|
| 47 | `30` | `config.sessions.gapMinutes` | Default session gap in minutes |
| 49 | `50` | `config.limits.sessions.default` | Default limit for sessions:list |
| 54 | `50` | `config.limits.sessions.default` | Default limit fallback |
| 54 | `500` | `config.limits.sessions.max` | Maximum limit for sessions queries |

### Notes on Mathematical Constants

The following values are **NOT** being extracted because they are mathematical constants used in calculations:
- `100` used in percentage calculations (e.g., `(value / total) * 100`)
- `60` and `1000` used in time conversions (minutes to milliseconds)
- Decimal precision values (e.g., `100` in `Math.round(x * 100) / 100`)

These remain hardcoded as they represent mathematical operations, not configuration.

## Refactoring Checklist

### Phase 1: Import Config
- [ ] Add `const config = require('../config');` to hands-handlers.cjs
- [ ] Add `const config = require('../config');` to stats-handlers.cjs
- [ ] Add `const config = require('../config');` to sessions-handlers.cjs

### Phase 2: Replace Values in hands-handlers.cjs
- [ ] Line 12: `RANGE_CACHE_TTL = 60000` → `RANGE_CACHE_TTL = config.cache.hands.ttl`
- [ ] Line 13: `MAX_RANGE_CACHE_SIZE = 50` → `MAX_RANGE_CACHE_SIZE = config.cache.hands.maxEntries`
- [ ] Line 88: `limit = 300` → `limit = config.limits.hands.default`
- [ ] Line 300: `LIMIT 100` → `LIMIT ${config.limits.hands.playerNotes}`
- [ ] Line 392: `LIMIT 10000` → `LIMIT ${config.limits.hands.max}`

### Phase 3: Replace Values in stats-handlers.cjs
- [ ] Line 276: Default `500` → `config.limits.stats.default`
- [ ] Line 276: Max `5000` → `config.limits.stats.max`

### Phase 4: Replace Values in sessions-handlers.cjs
- [ ] Line 47: `sessionGapMinutes = 30` → `sessionGapMinutes = config.sessions.gapMinutes`
- [ ] Line 49: `limit = 50` → `limit = config.limits.sessions.default`
- [ ] Line 54: Default `50` → `config.limits.sessions.default`
- [ ] Line 54: Max `500` → `config.limits.sessions.max`

## Testing Strategy

After each handler is refactored:
1. Run handler-specific tests: `npm test -- tests/handlers/<handler>-handlers.test.js`
2. Verify all tests still pass
3. Check that functionality remains unchanged

Final verification:
1. Run full test suite: `npm test -- --run`
2. Verify 128/133 tests passing
3. Start app and test basic operations
4. Commit changes
