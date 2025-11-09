# HUDini

Node/Electron desktop app for parsing poker hand histories, loading them into SQLite, and exploring hero/player stats.

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

## Project layout

- `parser_starter.js` – text parser that normalises GG/PokerStars style hand histories.
- `db_import.js` – folder importer that walks hand history files and writes rows into `hands.db` (via `better-sqlite3`).
- `db_build_stats.js` – rebuilds the `player_stats` table from stored hands.
- `renderer/renderer_umd.js` – pre-bundled React UI that consumes IPC endpoints exposed in `electron-main.cjs`.
- `lib/metrics_core.js` – shared aggregation for VPIP/PFR/etc used by both CLI and DB tasks.

## Common workflows

1. **Parse sample hand text**
   ```bash
   node parser_starter.js sample_hand.txt --ndjson
   ```

2. **Validate parser output**
   ```bash
   node parser_starter.js sample_hand.txt --ndjson | node validate.js
   ```

3. **Import hand histories**
   - Launch the Electron app (`npm start`).
   - Use the *Import* overlay, select one or more folders, and watch progress as `db_import.js` feeds rows into `hands.db`.
   - Player stats are rebuilt automatically after import; you can trigger a manual rebuild via the UI (`stats:rebuild` IPC).

4. **Rebuild stats from CLI**
   ```bash
   node db_build_stats.js
   ```

5. **Export metrics to CSV**
   ```bash
   node parser_starter.js sample_hand.txt --ndjson | node metrics_v2.js > player_stats_v2.csv
   ```

6. **Run aggregation smoke test**
   ```bash
   npm run test:metrics
   ```

7. **Verify bankroll graph integrity**
   ```bash
   npm run test:graph
   ```

## Notes

- The importer handles plain text, JSON/NDJSON, and `.gz` files; `.zip` archives are skipped with a progress note for now.
- `db_import.js` accepts an optional `overwrite` flag. When enabled duplicates are updated; otherwise the first seen hand wins.
- `hands.db` is opened with WAL mode in both the Electron main process and importer to minimise lock contention.
- Metrics aggregation lives in one place (`lib/metrics_core.js`) for use by CLI tools and the stats rebuild job, reducing drift.
