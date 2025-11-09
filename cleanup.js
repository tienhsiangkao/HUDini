#!/usr/bin/env node
/**
 * cleanup.js - repository hygiene helper
 *
 * Limits cleanup activity to known scratch locations and skips destructive
 * recursion across the whole tree. Also provides optional database maintenance
 * guarded by environment detection.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const projectRoot = __dirname;

const SAFE_RELATIVE_DIRS = [
  'tmp',
  'tmp_import',
  path.join('renderer', 'cache'),
];

const BACKUP_PATTERNS = [
  /\.bak$/i,
  /\.tmp$/i,
  /\.old$/i,
  /~$/i,
  /^\.DS_Store$/i,
];

const DRY_RUN = process.argv.includes('--dry-run');

function isWithinSafeDir(targetPath) {
  const relative = path.relative(projectRoot, targetPath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    return false;
  }
  return SAFE_RELATIVE_DIRS.some((safeRel) => {
    const safeAbs = path.join(projectRoot, safeRel);
    return targetPath === safeAbs || targetPath.startsWith(`${safeAbs}${path.sep}`);
  });
}

function shouldRemove(filePath, fileName) {
  return BACKUP_PATTERNS.some((pattern) => pattern.test(fileName));
}

function cleanSafeDirectories() {
  let removed = 0;
  const visited = new Set();

  for (const rel of SAFE_RELATIVE_DIRS) {
    const abs = path.join(projectRoot, rel);
    if (!fs.existsSync(abs) || visited.has(abs)) continue;
    visited.add(abs);

    const stack = [abs];
    while (stack.length) {
      const current = stack.pop();
      let entries;
      try {
        entries = fs.readdirSync(current, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const entry of entries) {
        const entryPath = path.join(current, entry.name);
        if (entry.isDirectory()) {
          stack.push(entryPath);
          continue;
        }
        if (!shouldRemove(entryPath, entry.name)) continue;
        if (DRY_RUN) {
          console.log(`[dry-run] would remove ${path.relative(projectRoot, entryPath)}`);
          continue;
        }
        try {
          fs.unlinkSync(entryPath);
          removed += 1;
          console.log(`Removed ${path.relative(projectRoot, entryPath)}`);
        } catch (err) {
          console.warn(`Could not remove ${entryPath}: ${err.message}`);
        }
      }
    }
  }
  return removed;
}

function optimiseDatabase(dbFile) {
  if (!fs.existsSync(dbFile)) {
    console.log('ℹ️  No database file found, skipping optimisation.');
    return;
  }
  const sqlite = spawnSync('sqlite3', ['-version'], { encoding: 'utf8' });
  if (sqlite.error) {
    console.log('⚠️  sqlite3 CLI not available, skipping VACUUM/ANALYZE.');
    return;
  }
  const commands = ['VACUUM;', 'ANALYZE;'];
  for (const command of commands) {
    const result = spawnSync('sqlite3', [dbFile, command], { stdio: DRY_RUN ? 'pipe' : 'inherit' });
    if (result.status !== 0) {
      console.warn(`⚠️  sqlite3 exited with code ${result.status} while running ${command.trim()}`);
      break;
    }
    if (DRY_RUN) {
      console.log(`[dry-run] would execute "${command.trim()}" against ${dbFile}`);
    }
  }
}

function printSummary(dbFile) {
  try {
    const bytes = fs.statSync(dbFile).size;
    const megabytes = (bytes / 1024 / 1024).toFixed(2);
    console.log(`Database size: ${megabytes} MB (${dbFile})`);
  } catch {
    // ignore missing db
  }
}

console.log('🧹 HUDini cleanup\n');

const removedFiles = cleanSafeDirectories();
console.log(removedFiles ? `✅ Removed ${removedFiles} temporary file(s)` : 'ℹ️  No temporary files removed');

const dbPath = path.join(projectRoot, 'hands.db');
optimiseDatabase(dbPath);
printSummary(dbPath);

if (DRY_RUN) {
  console.log('\nDry run complete. Re-run without --dry-run to apply changes.');
}
