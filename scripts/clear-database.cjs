#!/usr/bin/env node

/**
 * scripts/clear-database.cjs
 *
 * Removes all rows from core tables inside hands.db.
 * Usage:
 *   node scripts/clear-database.cjs --yes
 *   npm run db:clear -- --yes
 *
 * The `--yes` (or `--force`) flag is required to avoid accidental data loss.
 */

const fs = require('fs');
const path = require('path');

let Database;
try {
  Database = require('better-sqlite3');
} catch (error) {
  console.error('Unable to load better-sqlite3. Install dependencies before running this script.');
  process.exit(1);
}

const args = process.argv.slice(2);
const confirmed = args.includes('--yes') || args.includes('--force');

if (!confirmed) {
  console.error('⚠️  Refusing to clear database without confirmation.');
  console.error('    Re-run with --yes to proceed: npm run db:clear -- --yes');
  process.exit(1);
}

const projectRoot = path.resolve(__dirname, '..');
const dbPath = path.join(projectRoot, 'hands.db');

if (!fs.existsSync(dbPath)) {
  console.log('ℹ️  Database file not found at', dbPath);
  process.exit(0);
}

const db = new Database(dbPath);

function tableExists(name) {
  const result = db
    .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name = ?`)
    .get(name);
  return !!result;
}

const coreTables = ['hands', 'player_stats'];
const auxTables = ['live_players', 'sessions', 'hand_actions'];
const deletedCounts = {};

db.transaction(() => {
  for (const table of [...coreTables, ...auxTables]) {
    if (!tableExists(table)) continue;
    const countStmt = db.prepare(`SELECT COUNT(*) as count FROM "${table}"`);
    const before = countStmt.get()?.count ?? 0;
    if (before === 0) {
      deletedCounts[table] = 0;
      continue;
    }
    db.prepare(`DELETE FROM "${table}"`).run();
    deletedCounts[table] = before;
  }
})();

try {
  db.exec('VACUUM;');
} catch (error) {
  console.warn('⚠️  VACUUM failed (continuing):', error?.message || error);
}

db.close();

const affected = Object.keys(deletedCounts)
  .filter((table) => deletedCounts[table] > 0)
  .map((table) => `${table}: ${deletedCounts[table]}`);

if (affected.length === 0) {
  console.log('✅ Database already empty. No rows removed.');
} else {
  console.log('✅ Cleared database tables:');
  for (const line of affected) console.log(`   • ${line}`);
}
