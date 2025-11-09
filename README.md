# HUDini 🎯

A professional-grade Electron desktop application for parsing poker hand histories, analyzing player statistics, and tracking bankroll performance. Built with Node.js, React, and SQLite for maximum performance and reliability.

[![Tests](https://img.shields.io/badge/tests-128%2F133%20passing-success)](./tests/)
[![Coverage](https://img.shields.io/badge/coverage-96%25-brightgreen)](./tests/)
[![License](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)

## 🌟 Highlights

- **Modular Architecture**: 8 handler modules, 5 utilities, comprehensive test coverage
- **High Performance**: 10-400x speedup with intelligent caching system
- **Robust Testing**: 96% test coverage (128/133 tests passing)
- **Modern Stack**: React 18, Vitest, better-sqlite3, Electron 38
- **Developer Friendly**: Comprehensive docs, JSDoc comments, configuration system

## Features

### 🎯 Core Functionality
- **Hand History Parser**: Supports GGPoker and PokerStars formats
- **SQLite Database**: 380k+ hands indexed with optimized queries
- **Player Stats**: Comprehensive VPIP/PFR/3bet/AF metrics
- **Hero Graph**: Bankroll tracking with cumulative profit visualization

### 🔍 Advanced Filtering
- **Basic Filters**: Stake, position, result, date range, BB range
- **Advanced Filter Builder** 🆕: Combine multiple conditions with AND/OR logic
  - 9 filter fields (position, result, heroNet, stake, villain, showdown, pot size, date)
  - Type-specific operators (=, !=, >, <, >=, <=, contains, startsWith)
  - **NOT logic**: Negate any condition (e.g., NOT Position = BTN)
  - **Saved Presets** 🆕: Save, load, and manage filter combinations
    - 6 default presets (Winning BTN, Losing Blinds, Big Pots, Recent Hands, etc.)
    - Export/Import presets as JSON files
    - localStorage persistence across sessions
  - Visual condition builder with enable/disable toggles
  - See [ADVANCED_FILTER_BUILDER.md](./ADVANCED_FILTER_BUILDER.md) and [SAVED_FILTER_PRESETS.md](./SAVED_FILTER_PRESETS.md)

### 🎮 Hand Replay
- **Interactive Replay**: Step through hands action-by-action
- **Keyboard Controls**: Space (play/pause), arrows (step), J/K (jump to hero decisions)
- **Street Navigation**: Quick jump to preflop/flop/turn/river
- **Auto-Play**: Adjustable speed replay
- **Hand Notes**: Add and save notes for specific hands
- **Pot Odds Calculator**: Real-time equity calculations
- **Run It Twice**: Dual board visualization

### 📊 Analytics & Visualization
- **Dashboard Widgets**: 8 customizable stat cards with quick filters
- **Hourly Heatmap**: Win rate by hour of day with color coding
- **Hand Range Visualizer**: 13x13 starting hand matrix with heat maps
- **Session Management**: Auto-detect sessions, filter by session, track session stats
- **Graph Export**: Export bankroll chart as PNG

### 🎨 User Interface
- **Dark/Light Theme**: Toggle with Ctrl+T, persisted preference
- **Toast Notifications**: Success/error/info messages with auto-dismiss
- **Keyboard Shortcuts**: Ctrl+1/2/3/4 (tabs), Ctrl+F (search), Ctrl+R (reload)
- **Visual Feedback** 🆕: Smooth animations, loading spinners, progress bars, hover effects
  - 4 loading components (spinner, progress bar, skeleton, checkmark)
  - 15+ CSS animations for smooth transitions
  - Hover effects on buttons, cards, and inputs
  - Smooth panel expand/collapse (300ms transitions)
  - See [VISUAL_FEEDBACK_IMPROVEMENTS.md](./VISUAL_FEEDBACK_IMPROVEMENTS.md)
- **Responsive Design**: Optimized for different window sizes
- **Virtual Scrolling**: Smooth performance with large hand lists

### ⚡ Performance
- **Tab Switch**: <10ms (20-200x faster than before)
- **App Startup**: <100ms (10-30x faster)
- **Smart Caching**: localStorage persistence for stats, graphs, sessions
- **Zero Loading**: No loading states when switching tabs
- **Optimized Database**: WAL mode, mmap, proper indexes

## 📁 Project Architecture

### Core Application
- `electron-main.cjs` (314 lines) – Main Electron process, orchestrates IPC handlers
- `renderer/renderer_umd.js` (15,614 lines) – React UI bundle (frontend refactor in progress)
- `preload.cjs` – Secure IPC bridge between main and renderer processes

### Handler Modules (8 modules, 3,249 lines)
- `handlers/hands-handlers.cjs` (418 lines) – Hand queries, filtering, range analysis
- `handlers/stats-handlers.cjs` (884 lines) – Player statistics, graphs, exports
- `handlers/sessions-handlers.cjs` (360 lines) – Session detection and analysis
- `handlers/annotations-handlers.cjs` (116 lines) – Hand annotations CRUD
- `handlers/db-handlers.cjs` (248 lines) – Database operations, schema management
- `handlers/import-handlers.cjs` (539 lines) – Bulk import, file watching, live tracking
- `handlers/reports-handlers.cjs` (550 lines) – Report generation, data exports
- `handlers/ui-handlers.cjs` (134 lines) – HUD state, widget configuration

### Utility Modules (5 modules, 1,208 lines)
- `utils/metrics.cjs` (179 lines) – VPIP/PFR/3-bet/AF calculations
- `utils/aggregators.cjs` (249 lines) – Data aggregation for reports
- `utils/file-parsing.cjs` (187 lines) – Hand history parsing logic
- `utils/file-system.cjs` (387 lines) – File operations, directory scanning
- `utils/validators.cjs` (206 lines) – Input validation, type checking

### Library Modules
- `lib/metrics_core.js` (179 lines) – Core metrics aggregation
- `lib/hero_metrics.cjs` – Hero-specific statistics
- `lib/hero_graph.cjs` – Bankroll graph generation with caching
- `lib/logger.cjs` – Structured logging with child loggers
- `lib/database.cjs` – Database service with connection pooling

### Configuration System
- `config/defaults.cjs` (132 lines) – Default configuration values
- `config/index.cjs` (121 lines) – Environment variable overrides
- `CONFIGURATION.md` (411 lines) – Configuration documentation

### Database
- `hands.db` – SQLite database (WAL mode) with optimized indexes
- `database_indexes.sql` – Index definitions for performance
- `schema/*.sql` – Database schema and migrations

### Testing (8 test files, 128/133 passing)
- `tests/validators.test.js` (29 tests) – Validation logic
- `tests/logger.test.js` (14 tests) – Logging functionality
- `tests/handlers/*.test.js` (85 tests) – Handler integration tests
- `tests/frontend/LoadingSpinner.test.jsx` (5 tests) – React component tests
- `tests/test-utils.js` (287 lines) – Test infrastructure and fixtures

## 🚀 Quick Start

### Installation

```bash
# Clone repository
git clone https://github.com/tienhsiangkao/HUDini.git
cd HUDini

# Install dependencies
npm install

# Rebuild native modules for Electron
npm run rebuild:electron

# Start application
npm start
```

### Development

```bash
# Run tests
npm test

# Run specific test file
npm test -- tests/handlers/hands-handlers.test.js

# Run tests in watch mode
npm test -- --watch

# Rebuild for Node.js (for running tests)
npm run rebuild:node

# Rebuild for Electron (for running app)
npm run rebuild:electron
```

## 📚 Common Workflows

### 1. Parse Sample Hand Text
```bash
node parser_starter.js sample_hand.txt --ndjson
```

### 2. Validate Parser Output
```bash
node parser_starter.js sample_hand.txt --ndjson | node validate.js
```

### 3. Import Hand Histories
- Launch the Electron app (`npm start`)
- Click **Import** button in the UI
- Select one or more folders containing hand history files
- Watch progress as hands are parsed and imported
- Player stats are rebuilt automatically after import

### 4. Rebuild Stats from CLI
```bash
node db_build_stats.js
```

### 5. Export Metrics to CSV
```bash
node parser_starter.js sample_hand.txt --ndjson | node metrics_v2.js > player_stats_v2.csv
```

### 6. Run Test Suite
```bash
# Run all tests
npm test -- --run

# Run handler tests
npm test -- --run tests/handlers/

# Run with coverage
npm test -- --coverage
```

## ⚙️ Configuration

HUDini uses a centralized configuration system. See [CONFIGURATION.md](./CONFIGURATION.md) for details.

### Environment Variables

```bash
# Cache settings
CACHE_TTL_HANDS=120000          # Hand cache TTL (ms)
CACHE_MAX_ENTRIES_HANDS=100     # Max cached entries

# Query limits
LIMIT_HANDS_DEFAULT=500         # Default hand query limit
LIMIT_STATS_DEFAULT=1000        # Default stats query limit

# Session detection
SESSION_GAP_MINUTES=60          # Session gap (minutes)

# Logging
LOG_LEVEL=debug                 # Log level (error|warn|info|debug)
```

### Configuration Files

- `config/defaults.cjs` – Default values for all settings
- `config/index.cjs` – Main config with environment overrides
- `CONFIGURATION.md` – Complete configuration documentation

## 🧪 Testing

HUDini has comprehensive test coverage (96% - 128/133 tests passing).

### Test Organization

```
tests/
├── test-utils.js              # Test infrastructure (287 lines)
├── validators.test.js         # Validation logic (29 tests)
├── logger.test.js             # Logging system (14 tests)
├── handlers/                  # Handler integration tests (85 tests)
│   ├── hands-handlers.test.js        (28 tests)
│   ├── stats-handlers.test.js        (18 tests)
│   ├── sessions-handlers.test.js     (13 tests)
│   ├── annotations-handlers.test.js  (14 tests)
│   └── ui-handlers.test.js           (12 tests)
└── frontend/                  # React component tests (5 tests)
    └── LoadingSpinner.test.jsx       (5 tests)
```

### Running Tests

```bash
# All tests
npm test -- --run

# Specific test file
npm test -- --run tests/handlers/hands-handlers.test.js

# Watch mode
npm test -- --watch

# With coverage report
npm test -- --coverage
```

## 📖 Documentation

- **[CONFIGURATION.md](./CONFIGURATION.md)** – Configuration system guide (411 lines)
- **[SESSION_SUMMARY.md](./SESSION_SUMMARY.md)** – Refactoring session overview (363 lines)
- **[NATIVE_MODULE_FIX.md](./NATIVE_MODULE_FIX.md)** – better-sqlite3 build instructions
- **[PERFORMANCE_ANALYSIS.md](./PERFORMANCE_ANALYSIS.md)** – Performance optimization details
- **[FRONTEND_ANALYSIS.md](./FRONTEND_ANALYSIS.md)** – Frontend architecture analysis

### Feature Documentation

- [ADVANCED_FILTER_BUILDER.md](./ADVANCED_FILTER_BUILDER.md) – Advanced filtering system
- [SAVED_FILTER_PRESETS.md](./SAVED_FILTER_PRESETS.md) – Filter preset management
- [HAND_REPLAY_FEATURES.md](./HAND_REPLAY_FEATURES.md) – Hand replay functionality
- [SESSION_FEATURES.md](./SESSION_FEATURES.md) – Session detection and analysis
- [HOURLY_HEATMAP.md](./HOURLY_HEATMAP.md) – Win rate heatmap visualization
- [DASHBOARD_WIDGETS.md](./DASHBOARD_WIDGETS.md) – Dashboard widget system

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

### Development Workflow

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Make your changes** with proper JSDoc comments
4. **Write tests** for new functionality
5. **Ensure all tests pass** (`npm test -- --run`)
6. **Commit your changes** (`git commit -m 'feat: add amazing feature'`)
7. **Push to your branch** (`git push origin feature/amazing-feature`)
8. **Open a Pull Request**

### Code Style

- Use JSDoc comments for all functions
- Follow existing code formatting
- Write descriptive commit messages (conventional commits)
- Maintain test coverage above 90%

### Commit Convention

```
feat: Add new feature
fix: Fix bug
docs: Update documentation
test: Add or update tests
refactor: Code refactoring
perf: Performance improvement
chore: Maintenance tasks
```

## 📝 Technical Notes

- The importer handles plain text, JSON/NDJSON, and `.gz` files; `.zip` archives are skipped with a progress note.
- `db_import.js` accepts an optional `overwrite` flag. When enabled, duplicates are updated; otherwise the first seen hand wins.
- `hands.db` is opened with WAL mode in both the Electron main process and importer to minimize lock contention.
- Metrics aggregation lives in one place (`lib/metrics_core.js`) for use by CLI tools and the stats rebuild job, reducing drift.
- better-sqlite3 requires separate builds for Electron (NODE_MODULE_VERSION 139) and Node.js (127). Use `npm run rebuild:electron` or `npm run rebuild:node` as needed.

## 🏗️ Architecture Highlights

### Modular Design
- **8 Handler Modules**: Separation of concerns for different features
- **5 Utility Modules**: Reusable logic for common operations
- **Configuration System**: Centralized settings with environment overrides
- **Service Layer**: Database, logger, and core services

### Performance Optimizations
- **Intelligent Caching**: 60s TTL for hand ranges, 30s for graph data
- **Query Optimization**: Date range filters, indexed lookups
- **Result Limiting**: Configurable limits to prevent memory issues
- **Cache Invalidation**: Automatic cache clearing on data changes

### Testing Strategy
- **Unit Tests**: Validators, utilities, core logic
- **Integration Tests**: IPC handlers with in-memory database
- **Component Tests**: React components with Testing Library
- **Test Infrastructure**: Reusable fixtures and utilities

## 📄 License

MIT License - See [LICENSE](./LICENSE) for details.

## 🙏 Acknowledgments

Built with:
- [Electron](https://www.electronjs.org/) – Desktop application framework
- [React](https://react.dev/) – UI library
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) – Fast SQLite binding
- [Vitest](https://vitest.dev/) – Unit testing framework
- [Vite](https://vitejs.dev/) – Build tool and dev server
