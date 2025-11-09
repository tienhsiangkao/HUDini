# Code Review - HUDini Poker Parser

**Project**: HUDini - Poker Hand History Parser & Analytics  
**Review Date**: November 8, 2025  
**Lines of Code**: ~8,000+ (excluding vendor libraries)  
**Technologies**: Electron, Node.js, React, SQLite, Tesseract.js

---

## Executive Summary

**Overall Assessment**: ⭐⭐⭐⭐ (4/5 - Good with room for improvement)

HUDini is a well-structured Electron application for parsing poker hand histories with impressive features including HUD overlays, screen scraping, and comprehensive statistics tracking. The codebase shows solid engineering with performance optimizations, but has several areas requiring attention for production readiness.

### Key Strengths
✅ Feature-rich with comprehensive poker analytics  
✅ Well-optimized SQLite database with proper indexing  
✅ Good separation of concerns (parser, importer, stats, HUD)  
✅ Extensive documentation (20+ markdown files)  
✅ Performance-conscious (WAL mode, caching, virtual scrolling)

### Critical Issues Found
⚠️ Security vulnerabilities (SQL injection risks, XSS exposure)  
⚠️ Error handling with empty catch blocks  
⚠️ No test coverage for critical components  
⚠️ Excessive console logging in production code  
⚠️ Memory management concerns (large file processing)

---

## 1. Security Issues 🔒

### Critical - SQL Injection Vulnerabilities

**Location**: `electron-main.cjs` lines 171, 223, 229, 2625, 2927

```javascript
// VULNERABLE CODE
db.exec(`ALTER TABLE hands ADD COLUMN ${column} ${type}`);
db.prepare(`DELETE FROM "${table}"`).run();
db.prepare(`DELETE FROM hands WHERE id IN (${placeholders})`);
db.prepare(`UPDATE annotations SET ${updates.join(', ')} WHERE id = ?`);
```

**Issue**: String interpolation in SQL queries without proper validation/sanitization.

**Recommendation**:
```javascript
// SAFE APPROACH - Whitelist allowed values
const ALLOWED_COLUMNS = ['totalPot', 'rake', 'extras', 'playersCache', 'metricsCache'];
const ALLOWED_TYPES = ['REAL', 'TEXT', 'INTEGER'];
if (!ALLOWED_COLUMNS.includes(column) || !ALLOWED_TYPES.includes(type)) {
  throw new Error('Invalid column or type');
}
db.exec(`ALTER TABLE hands ADD COLUMN ${column} ${type}`);
```

**Severity**: HIGH - Could lead to database corruption or data exfiltration

---

### High - XSS Vulnerability in Renderer

**Location**: `renderer/renderer_umd.js` line 79

```javascript
// VULNERABLE
toast.innerHTML = icon + text + actions + progressBar;
```

**Issue**: Direct HTML injection without sanitization. User-controlled text could inject malicious scripts.

**Recommendation**:
```javascript
// Use textContent for user data or sanitize HTML
toast.innerHTML = `${icon}<span class="toast-text"></span>${actions}${progressBar}`;
toast.querySelector('.toast-text').textContent = text;
```

**Severity**: MEDIUM - Limited impact in Electron, but bad practice

---

### Medium - Context Isolation Disabled

**Location**: `electron-main.cjs` line 107

```javascript
webPreferences: {
  preload: path.join(__dirname, 'preload.cjs'),
  contextIsolation: true,  // ✅ Good
  nodeIntegration: false,  // ✅ Good
}
```

**HUD Window** (`lib/hud_manager.cjs` line 180):
```javascript
webPreferences: {
  nodeIntegration: true,      // ⚠️ DANGEROUS
  contextIsolation: false,    // ⚠️ DANGEROUS
  enableRemoteModule: true    // ⚠️ DEPRECATED
}
```

**Issue**: HUD windows have full Node.js access without isolation. If compromised, attackers have system-level access.

**Recommendation**: Use IPC communication even for HUD windows, enable contextIsolation.

**Severity**: HIGH

---

## 2. Error Handling 🐛

### Empty Catch Blocks (Silent Failures)

Found multiple instances where errors are silently swallowed:

**Location**: Throughout codebase
```javascript
// BAD PRACTICE
try {
  db.exec(`ALTER TABLE hands ADD COLUMN ${column} ${type}`);
} catch {}  // ⚠️ Silent failure
```

**Examples**:
- `electron-main.cjs`: Lines 171-172 (8 instances)
- `parser_starter.js`: Lines 23-24
- `db_import.js`: Lines 33-34

**Recommendation**:
```javascript
// BETTER
try {
  db.exec(`ALTER TABLE hands ADD COLUMN ${column} ${type}`);
} catch (err) {
  // Column likely exists, which is expected
  if (!err.message.includes('duplicate column')) {
    console.warn(`Unexpected error adding column ${column}:`, err.message);
  }
}
```

**Impact**: Debugging nightmares, silent failures, potential data loss

---

### Inadequate Error Context

**Location**: `electron-main.cjs` multiple handlers

```javascript
ipcMain.handle('hands:getNotes', async (_event, handId) => {
  try {
    // ... logic
  } catch (err) {
    console.error('[hands:getNotes] Error:', err);  // ⚠️ No context about handId
    return null;
  }
});
```

**Recommendation**:
```javascript
catch (err) {
  console.error(`[hands:getNotes] Error fetching notes for hand ${handId}:`, err);
  return { error: err.message, handId };  // Return error info to UI
}
```

---

## 3. Code Quality 📝

### Excessive Console Logging

Found **200+** console.log statements throughout production code. Examples:

- `electron-main.cjs`: 88+ instances
- `hud-overlay-v2.cjs`: 20+ instances
- `lib/hud_manager.cjs`: 15+ instances

**Recommendation**: Implement proper logging framework
```javascript
// logger.js
const LOG_LEVELS = { ERROR: 0, WARN: 1, INFO: 2, DEBUG: 3 };
const currentLevel = process.env.NODE_ENV === 'production' ? LOG_LEVELS.WARN : LOG_LEVELS.DEBUG;

export const logger = {
  error: (...args) => currentLevel >= LOG_LEVELS.ERROR && console.error(...args),
  warn: (...args) => currentLevel >= LOG_LEVELS.WARN && console.warn(...args),
  info: (...args) => currentLevel >= LOG_LEVELS.INFO && console.info(...args),
  debug: (...args) => currentLevel >= LOG_LEVELS.DEBUG && console.log(...args),
};
```

---

### Large Functions (Code Smell)

**Location**: `electron-main.cjs`

- Main file: **5,138 lines** (should be modularized)
- Several functions exceed 100 lines
- Mixed concerns (DB operations, file I/O, IPC handlers, HUD logic)

**Recommendation**: Split into modules
```
electron-main.cjs (300 lines) - Main process setup
handlers/
  ├── db-handlers.cjs - Database IPC handlers
  ├── import-handlers.cjs - Import functionality
  ├── stats-handlers.cjs - Statistics operations
  └── hud-handlers.cjs - HUD system handlers
services/
  ├── database.cjs - DB connection management
  ├── parser.cjs - Hand parsing logic
  └── stats-calculator.cjs - Metrics computation
```

---

### Magic Numbers and Strings

```javascript
// Found throughout codebase
const IMPORT_DEBOUNCE_MS = 2000;  // What is this for?
if (heroNet > 0.005) { /* ... */ }  // Why 0.005?
d.pragma('cache_size = -64000'); // Why 64MB?
```

**Recommendation**:
```javascript
// config/constants.js
export const CONFIG = {
  IMPORT: {
    DEBOUNCE_MS: 2000,  // Wait 2s after file write before importing
    MAX_PREVIEW_CHARS: 200,
    MAX_FOLDER_SCAN_FILES: 2000,
  },
  STAKES: {
    BREAKEVEN_THRESHOLD: 0.005,  // ±0.005 BB considered breakeven
  },
  DATABASE: {
    CACHE_SIZE_MB: 64,
    MMAP_SIZE_BYTES: 30_000_000_000,  // 30GB
  },
};
```

---

### Duplicate Code

**Pattern**: Similar SQL query building logic appears multiple times

```javascript
// Appears in 5+ locations
const clauses = [];
const params = [];
if (q) {
  clauses.push('(tableName LIKE ? OR id LIKE ?)');
  params.push(`%${q}%`, `%${q}%`);
}
// ... more conditions
if (clauses.length) {
  sql += ' WHERE ' + clauses.join(' AND ');
}
```

**Recommendation**: Create reusable query builder
```javascript
// utils/query-builder.cjs
class QueryBuilder {
  constructor(baseQuery) {
    this.sql = baseQuery;
    this.clauses = [];
    this.params = [];
  }
  
  addSearch(q, fields) {
    if (!q) return this;
    const conditions = fields.map(f => `${f} LIKE ?`).join(' OR ');
    this.clauses.push(`(${conditions})`);
    fields.forEach(() => this.params.push(`%${q}%`));
    return this;
  }
  
  addRange(field, min, max) { /* ... */ }
  
  build() {
    if (this.clauses.length) {
      this.sql += ' WHERE ' + this.clauses.join(' AND ');
    }
    return { sql: this.sql, params: this.params };
  }
}
```

---

## 4. Testing 🧪

### Minimal Test Coverage

**Current State**:
- Only 2 test files: `parser.test.js`, `metrics_core.test.js`
- No tests for:
  - Database operations
  - Import functionality
  - HUD system
  - Screen scraping
  - Electron IPC handlers

**Recommendation**: Implement comprehensive testing

```javascript
// tests/parser.test.js - Example with proper test framework
import { describe, test, expect } from 'vitest';
import { parseHandsText } from '../parser_starter.js';

describe('Parser - GGPoker Format', () => {
  test('should parse basic hand with 6 players', () => {
    const input = fs.readFileSync('fixtures/ggpoker_6max.txt', 'utf8');
    const hands = parseHandsText(input);
    
    expect(hands).toHaveLength(1);
    expect(hands[0].players).toHaveLength(6);
    expect(hands[0].hero).toBeDefined();
  });
  
  test('should handle malformed input gracefully', () => {
    const result = parseHandsText('invalid data');
    expect(result).toEqual([]);
  });
});
```

**Priority Tests Needed**:
1. Parser validation (different formats, edge cases)
2. Database CRUD operations
3. Metrics calculations (VPIP, PFR, etc.)
4. Import pipeline (files, zips, gzip)
5. Filter logic (advanced filters with AND/OR/NOT)

---

## 5. Performance 🚀

### Good Practices Found ✅

1. **SQLite Optimizations**:
   ```javascript
   d.pragma('journal_mode = WAL');        // ✅ Write-Ahead Logging
   d.pragma('synchronous = NORMAL');       // ✅ Balanced durability
   d.pragma('cache_size = -64000');        // ✅ 64MB cache
   d.pragma('mmap_size = 30000000000');    // ✅ Memory-mapped I/O
   ```

2. **Proper Indexing**:
   ```sql
   CREATE INDEX idx_hands_ts ON hands(ts);
   CREATE INDEX idx_hands_hero_date ON hands(hero, dateUTC);  -- Composite index
   ```

3. **Generator Functions** for large datasets:
   ```javascript
   function* streamHands(db) { /* ... */ }  // ✅ Memory-efficient iteration
   ```

---

### Performance Concerns ⚠️

#### 1. Synchronous File Operations

**Location**: `db_import.js`, `electron-main.cjs`

```javascript
// BLOCKING - Main thread freezes
const text = fs.readFileSync(filePath, 'utf8');  // ⚠️
```

**Impact**: UI freezes during large file imports

**Recommendation**: Already partially implemented with `fsp.readFile()`, but inconsistent usage

---

#### 2. Memory Leaks - Event Listeners

**Location**: `preload.cjs` lines 44-47

```javascript
onWatchNewFile: (fn) => ipcRenderer.on('watch:newFile', fn),
// ⚠️ No automatic cleanup when component unmounts
```

**Recommendation**:
```javascript
// Add cleanup reminder in docs, or auto-cleanup
onWatchNewFile: (fn) => {
  ipcRenderer.on('watch:newFile', fn);
  return () => ipcRenderer.off('watch:newFile', fn);  // Return cleanup function
}
```

---

#### 3. Large Data Structures in Memory

**Location**: `db_import.js` line 265

```javascript
async function* walkFolders(folders) {
  const seen = new Set();  // ⚠️ Could grow unbounded
  // ...
}
```

**Issue**: For huge folder structures, the `seen` Set could consume significant memory.

**Recommendation**: For enterprise use, implement pagination or streaming.

---

## 6. Architecture & Design 🏗️

### Strengths

1. **Clear Module Separation**:
   - `parser_starter.js` - Hand parsing
   - `db_import.js` - Import logic
   - `db_build_stats.js` - Statistics generation
   - `lib/` - Shared utilities

2. **IPC Abstraction** via `preload.cjs`:
   ```javascript
   contextBridge.exposeInMainWorld('api', { /* ... */ });
   ```
   ✅ Good security practice

3. **Progressive Enhancement**:
   - Works with basic file import
   - Optional HUD overlay
   - Optional screen scraping
   - Modular feature enablement

---

### Architecture Concerns

#### 1. Mixed Responsibilities

**Issue**: `electron-main.cjs` handles:
- Database initialization
- IPC handlers (50+)
- File system operations
- HUD management
- Import orchestration
- Business logic

**Recommendation**: Adopt layered architecture

```
┌─────────────────────────────────────┐
│     Electron Main Process           │
│  (thin orchestration layer)         │
└─────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│       Service Layer                 │
│  ├── DatabaseService                │
│  ├── ImportService                  │
│  ├── StatsService                   │
│  ├── HUDService                     │
│  └── ParserService                  │
└─────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│     Data Access Layer               │
│  ├── HandsRepository                │
│  ├── StatsRepository                │
│  └── SessionsRepository             │
└─────────────────────────────────────┘
```

---

#### 2. State Management

**Issue**: Global mutable state scattered across files

```javascript
// electron-main.cjs
let win;
let hudOverlay;
let hudManager;
let db;
let parserModulePromise = null;
let liveTrackerIntegrationSetup = false;
const watchedFolders = new Map();
const pendingImports = new Map();
const bulkImportState = { /* ... */ };
```

**Recommendation**: Centralize state management

```javascript
// state/AppState.cjs
class AppState {
  constructor() {
    this.windows = { main: null, hud: null };
    this.database = null;
    this.services = {};
    this.fileWatcher = { folders: new Map(), pending: new Map() };
  }
  
  reset() { /* ... */ }
}

export const appState = new AppState();
```

---

## 7. Documentation 📚

### Excellent Documentation ✅

- 20+ detailed markdown files
- Feature documentation (`HAND_REPLAY_FEATURES.md`, `HUD_README.md`)
- User guides (`SESSION_USER_GUIDE.md`, `CALIBRATION_TOOL_GUIDE.md`)
- Implementation summaries

### Missing Documentation

1. **API Documentation** - No JSDoc comments
2. **Architecture Diagram** - System overview missing
3. **Contribution Guide** - No CONTRIBUTING.md
4. **Security Policy** - No SECURITY.md
5. **Changelog** - No CHANGELOG.md

**Recommendation**:

```javascript
/**
 * Parses poker hand history text into structured hand objects
 * 
 * @param {string} text - Raw hand history text (GGPoker or PokerStars format)
 * @param {Object} [options] - Parsing options
 * @param {boolean} [options.normalize=true] - Normalize player positions
 * @param {boolean} [options.computePots=true] - Calculate street pots
 * @returns {Array<Hand>} Array of parsed hand objects
 * @throws {ParseError} When text format is unrecognized
 * 
 * @example
 * const hands = parseHandsText(fileContent);
 * console.log(hands[0].hero); // 'PlayerName'
 */
export function parseHandsText(text, options = {}) {
  // ...
}
```

---

## 8. Dependencies & Vulnerabilities 📦

### Current Dependencies

```json
{
  "electron": "^38.0.0",           // ⚠️ Check for security updates
  "better-sqlite3": "^12.4.1",     // ✅ Latest
  "react": "^18.3.1",              // ✅ Latest
  "tesseract.js": "^6.0.1",        // ✅ Latest
  "sharp": "^0.34.4"               // ✅ Latest
}
```

**Action Items**:
1. Run `npm audit` - Check for known vulnerabilities
2. Set up Dependabot - Automated dependency updates
3. Pin critical dependencies - Prevent breaking changes

---

### Missing Dependencies (Should Consider)

1. **Logging**: `winston` or `pino` - Structured logging
2. **Testing**: `vitest` or `jest` - Test framework
3. **Linting**: `eslint` - Code quality enforcement
4. **Type Checking**: `typescript` or JSDoc with TypeScript compiler
5. **Validation**: `zod` or `joi` - Input validation
6. **Error Tracking**: `@sentry/electron` - Production error monitoring

---

## 9. Specific File Reviews 📄

### `electron-main.cjs` (5,138 lines) ⚠️

**Grade**: C+ (Functional but needs refactoring)

**Issues**:
- Too large (should be <500 lines)
- 50+ IPC handlers in one file
- Mixed concerns
- Global state

**Recommendation**: Split into 10+ modules

---

### `parser_starter.js` (559 lines) ✅

**Grade**: B+ (Well-structured)

**Strengths**:
- Clear parsing logic
- Good function decomposition
- Handles multiple formats

**Minor Issues**:
- Some functions exceed 50 lines
- Could use more comments explaining poker-specific logic

---

### `db_import.js` (680 lines) ✅

**Grade**: B (Good with improvements needed)

**Strengths**:
- Generator functions for memory efficiency
- Async/await throughout
- Good error accumulation

**Issues**:
- Silent failures in catch blocks
- No validation of parsed data before DB insertion
- Could use transaction batching for better performance

---

### `lib/metrics_core.js` (537 lines) ✅

**Grade**: A- (Strong implementation)

**Strengths**:
- Well-documented poker metrics
- Pure functions (testable)
- Good separation of concerns

**Suggestion**: Add unit tests for all metrics calculations

---

### `lib/hud_manager.cjs` (728 lines) ⚠️

**Grade**: C (Needs security hardening)

**Issues**:
- Security vulnerabilities (nodeIntegration: true)
- Mixed screen scraping strategies
- No error recovery for HUD windows
- Tight coupling with screen scrapers

---

## 10. Recommendations by Priority 🎯

### Critical (Fix Immediately) 🔴

1. **Fix SQL injection vulnerabilities** - Add input validation
2. **Fix HUD window security** - Enable contextIsolation
3. **Add error handling** - No empty catch blocks
4. **Implement proper logging** - Replace console.log statements

### High (Fix Within 2 Weeks) 🟡

5. **Add test coverage** - At least 50% for critical paths
6. **Refactor electron-main.cjs** - Split into modules
7. **Implement state management** - Centralize global state
8. **Add input validation** - Use Zod or Joi for all user inputs
9. **Document APIs** - Add JSDoc comments
10. **Run security audit** - `npm audit fix`

### Medium (Next Sprint) 🟢

11. **Remove duplicate code** - Create shared utilities
12. **Add TypeScript** - Gradual migration for type safety
13. **Improve error messages** - User-friendly error reporting
14. **Add integration tests** - Test full import pipeline
15. **Performance profiling** - Identify bottlenecks with large datasets

### Low (Future) ⚪

16. **Add CI/CD pipeline** - GitHub Actions for tests
17. **Internationalization** - i18n support
18. **Plugin system** - Allow custom parsers
19. **Cloud backup** - Optional cloud storage
20. **Mobile companion app** - React Native for stats viewing

---

## 11. Code Examples: Before & After

### Example 1: Secure IPC Handler

**Before**:
```javascript
ipcMain.handle('hands:delete', async (_event, handIds) => {
  try {
    const placeholders = handIds.map(() => '?').join(',');
    const stmt = db.prepare(`DELETE FROM hands WHERE id IN (${placeholders})`);
    stmt.run(...handIds);
    return { success: true };
  } catch (error) {
    console.error('[Delete Hands] Error:', error);
    return { success: false };
  }
});
```

**After**:
```javascript
import { z } from 'zod';
import { logger } from './utils/logger.js';
import { HandsService } from './services/HandsService.js';

const DeleteHandsSchema = z.array(z.string().uuid()).min(1).max(100);

ipcMain.handle('hands:delete', async (_event, handIds) => {
  try {
    // Validate input
    const validatedIds = DeleteHandsSchema.parse(handIds);
    
    // Use service layer
    const result = await HandsService.deleteByIds(validatedIds);
    
    logger.info(`Deleted ${result.count} hands`, { ids: validatedIds });
    return { success: true, count: result.count };
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Invalid hand IDs provided', { errors: error.errors });
      return { success: false, error: 'Invalid hand IDs' };
    }
    
    logger.error('Error deleting hands', { error, handIds });
    return { success: false, error: 'Failed to delete hands' };
  }
});
```

---

### Example 2: Proper Error Handling

**Before**:
```javascript
for (const [col, type] of extraColumns) {
  try {
    db.exec(`ALTER TABLE player_stats ADD COLUMN ${col} ${type}`);
  } catch {}
}
```

**After**:
```javascript
const ALLOWED_COLUMNS = new Map([
  ['positional_json', 'TEXT'],
  ['vs_hero_json', 'TEXT'],
  ['samples_json', 'TEXT'],
]);

for (const [col, type] of ALLOWED_COLUMNS.entries()) {
  try {
    db.exec(`ALTER TABLE player_stats ADD COLUMN ${col} ${type}`);
    logger.debug(`Added column ${col} to player_stats`);
  } catch (error) {
    if (error.code === 'SQLITE_ERROR' && error.message.includes('duplicate column')) {
      // Expected - column already exists
      logger.debug(`Column ${col} already exists`);
    } else {
      // Unexpected error
      logger.error(`Failed to add column ${col}`, { error });
      throw error; // Re-throw if it's not a duplicate column error
    }
  }
}
```

---

## 12. Positive Highlights 🌟

Despite the issues noted, this is a **solid project** with many good practices:

1. **Performance Optimization** - WAL mode, proper indexes, caching
2. **User Experience** - Extensive features, smooth UI, keyboard shortcuts
3. **Documentation** - Comprehensive feature documentation
4. **Modularity** - Clear separation of parser, importer, stats
5. **Progressive Enhancement** - Optional features don't break core functionality
6. **Error Recovery** - Import errors don't crash the app
7. **Feature Completeness** - Production-ready analytics suite
8. **Real Innovation** - Screen scraping for real-time HUD is impressive

---

## 13. Conclusion

### Overall Score: B+ (83/100)

| Category | Score | Weight |
|----------|-------|--------|
| Functionality | 95/100 | 25% |
| Security | 65/100 | 25% |
| Code Quality | 75/100 | 20% |
| Performance | 90/100 | 15% |
| Testing | 40/100 | 10% |
| Documentation | 85/100 | 5% |

### Is it Production-Ready?

**For Personal Use**: ✅ Yes - Works well, feature-complete

**For Distribution**: ⚠️ Conditional - Security issues must be fixed first

**For Enterprise**: ❌ No - Needs comprehensive testing, security audit, and refactoring

---

## 14. Next Steps

1. **Immediate** (This Week):
   - Fix critical security vulnerabilities
   - Add input validation layer
   - Remove empty catch blocks

2. **Short Term** (2-4 Weeks):
   - Add test suite (target 50% coverage)
   - Refactor electron-main.cjs
   - Implement proper logging

3. **Long Term** (2-3 Months):
   - Security audit by third party
   - TypeScript migration
   - CI/CD pipeline

---

## Resources & References

- [Electron Security Checklist](https://www.electronjs.org/docs/latest/tutorial/security)
- [SQLite Best Practices](https://www.sqlite.org/bestpractice.html)
- [Node.js Security Best Practices](https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html)
- [Testing Best Practices](https://testingjavascript.com/)

---

**Reviewed By**: GitHub Copilot AI  
**Contact**: For questions about this review, please open an issue in the repository.

---

## Appendix A: Security Checklist

- [ ] Enable contextIsolation in all BrowserWindows
- [ ] Disable nodeIntegration in all BrowserWindows
- [ ] Validate all IPC inputs with schema validation
- [ ] Sanitize all SQL queries (use parameterized queries only)
- [ ] Sanitize all HTML content before rendering
- [ ] Implement CSP (Content Security Policy) headers
- [ ] Enable WebSecurity in webPreferences
- [ ] Review and remove enableRemoteModule usage
- [ ] Add rate limiting for IPC handlers
- [ ] Implement user session management
- [ ] Add file path validation (prevent directory traversal)
- [ ] Encrypt sensitive data at rest
- [ ] Run `npm audit` and fix vulnerabilities
- [ ] Add SAST (Static Application Security Testing) to CI
- [ ] Implement error logging without exposing sensitive info

## Appendix B: Refactoring Checklist

- [ ] Split electron-main.cjs into 10+ modules
- [ ] Extract duplicate SQL query logic
- [ ] Create centralized state management
- [ ] Implement service layer pattern
- [ ] Add repository pattern for database access
- [ ] Create utility functions for common operations
- [ ] Move magic numbers to configuration files
- [ ] Extract business logic from IPC handlers
- [ ] Implement dependency injection
- [ ] Add factory patterns for complex object creation

## Appendix C: Testing Checklist

- [ ] Unit tests for parser (all formats)
- [ ] Unit tests for metrics calculations
- [ ] Integration tests for import pipeline
- [ ] Integration tests for database operations
- [ ] E2E tests for main user workflows
- [ ] Test error handling paths
- [ ] Test with large datasets (10k+ hands)
- [ ] Test concurrent operations
- [ ] Test memory usage over time
- [ ] Performance benchmarks
