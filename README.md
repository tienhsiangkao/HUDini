# Poker Parser HUD

Node/Electron desktop app for parsing poker hand histories, loading them into SQLite, and exploring hero/player stats.

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

## Notes

- The importer handles plain text, JSON/NDJSON, and `.gz` files; `.zip` archives are skipped with a progress note for now.
- `db_import.js` accepts an optional `overwrite` flag. When enabled duplicates are updated; otherwise the first seen hand wins.
- `hands.db` is opened with WAL mode in both the Electron main process and importer to minimise lock contention.
- Metrics aggregation lives in one place (`lib/metrics_core.js`) for use by CLI tools and the stats rebuild job, reducing drift.
