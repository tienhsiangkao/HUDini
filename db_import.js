// db_import.js
// Import poker hand histories from folders into hands.db

import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { createRequire } from 'node:module';
import Database from 'better-sqlite3';

import { parseHandsText, assignPositions, computeStreetPots } from './parser_starter.js';
import metricsHelpers from './lib/hand_utils.cjs';

const { getHeroName, parseTimestamp, computeHeroNetFromJson } = metricsHelpers;

// Live tracker integration - will be set from electron-main
let liveTrackerCallback = null;

export function setLiveTrackerCallback(callback) {
  liveTrackerCallback = callback;
}

// Feed parsed hand to live tracker
function feedHandToLiveTracker(hand) {
  if (!liveTrackerCallback || !hand) return;
  
  try {
    const tableId = 'main'; // For now, single table
    const { players = [], actions = [] } = hand;
    
    // Build seat number map
    const seatMap = new Map();
    players.forEach(p => {
      if (p.seat != null && p.name) {
        seatMap.set(p.name, p.seat);
      }
    });
    
    // Track each action
    actions.forEach(action => {
      if (!action || !action.player) return;
      
      const seatNumber = seatMap.get(action.player);
      if (seatNumber == null) return;
      
      const street = action.street || 'preflop';
      const actionType = action.type || 'unknown';
      const amount = action.amount || action.contribution || 0;
      
      // Determine if this is a blind post
      const isBlinds = actionType === 'posts' || actionType === 'post';
      
      // Track the action
      if (street === 'preflop') {
        liveTrackerCallback('trackPreflopAction', tableId, seatNumber, actionType, amount, isBlinds);
      } else if (['flop', 'turn', 'river'].includes(street)) {
        liveTrackerCallback('trackPostflopAction', tableId, seatNumber, street, actionType, amount);
      }
    });
    
    // Track hand completion for each player
    players.forEach(player => {
      if (!player || player.seat == null) return;
      
      const wentToShowdown = player.showdown || false;
      const won = player.won || false;
      const netAmount = player.net || 0;
      
      liveTrackerCallback('trackHandComplete', tableId, player.seat, wentToShowdown, won, netAmount);
    });
    
  } catch (error) {
    console.error('[Live Tracker] Error feeding hand:', error);
  }
}
const gunzipAsync = promisify(zlib.gunzip);
const requireFn = createRequire(import.meta.url);
let yauzlModule;

function getYauzl() {
  if (yauzlModule === undefined) {
    try {
      yauzlModule = requireFn('yauzl');
    } catch {
      yauzlModule = null;
    }
  }
  return yauzlModule;
}

const TEXT_EXTENSIONS = new Set(['.txt', '.log', '.hh', '.dat', '.json', '.csv', '.ndjson']);
const COMPRESSED_EXTENSIONS = new Set(['.gz']);

const DEFAULT_DB_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), 'hands.db');

async function decompressGzip(filePath) {
  const source = fs.createReadStream(filePath);
  const chunks = [];
  const gunzip = zlib.createGunzip();
  gunzip.on('data', (chunk) => chunks.push(chunk));
  await pipeline(source, gunzip);
  return Buffer.concat(chunks).toString('utf8');
}

async function readTextFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (COMPRESSED_EXTENSIONS.has(ext)) {
    return decompressGzip(filePath);
  }
  return fsp.readFile(filePath, 'utf8');
}

async function parseHandsFromContent(text, ext) {
  if (!text.trim()) return [];

  if (ext === '.json') {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) return parsed;
      if (parsed && typeof parsed === 'object') return [parsed];
    } catch {
      // fall back to parser
    }
  }
  if (ext === '.ndjson') {
    const lines = text.split('\n').filter(Boolean);
    return lines.map((line) => JSON.parse(line));
  }
  return parseHandsText(text);
}

async function parseHandsFromFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const text = await readTextFile(filePath);
  return parseHandsFromContent(text, ext);
}

async function extractZipEntryContent(buffer, entryName) {
  const lower = entryName ? entryName.toLowerCase() : '';
  const ext = path.extname(lower);
  if (COMPRESSED_EXTENSIONS.has(ext)) {
    try {
      const decompressed = await gunzipAsync(buffer);
      const baseName = lower.slice(0, lower.length - ext.length);
      const baseExt = path.extname(baseName).toLowerCase();
      return {
        text: decompressed.toString('utf8'),
        ext: baseExt || '',
      };
    } catch (err) {
      throw new Error(`Failed to decompress ${entryName}: ${err?.message || err}`);
    }
  }
  return {
    text: buffer.toString('utf8'),
    ext,
  };
}

async function processZipFile(zipPath, insert) {
  const yauzl = getYauzl();
  if (!yauzl) {
    throw new Error("ZIP support requires the 'yauzl' package. Run `npm install` to enable ZIP imports.");
  }
  const stats = {
    entries: 0,
    parsed: 0,
    normalized: 0,
    discarded: 0,
    inserted: 0,
    updated: 0,
    duplicates: 0,
    skippedEntries: 0,
    errors: [],
  };

  await new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (err, zip) => {
      if (err) return reject(err);
      const nextEntry = () => zip.readEntry();
      zip.on('entry', (entry) => {
        if (!entry) return;
        if (/\/$/.test(entry.fileName)) {
          stats.skippedEntries++;
          nextEntry();
          return;
        }
        stats.entries++;
        const entryName = entry.fileName;
        const lowerName = entryName.toLowerCase();
        const ext = path.extname(lowerName);
        if (!TEXT_EXTENSIONS.has(ext) && !COMPRESSED_EXTENSIONS.has(ext)) {
          stats.skippedEntries++;
          nextEntry();
          return;
        }
        zip.openReadStream(entry, (streamErr, stream) => {
          if (streamErr || !stream) {
            stats.errors.push({ entry: entryName, error: streamErr?.message || String(streamErr) });
            stats.skippedEntries++;
            nextEntry();
            return;
          }
          const chunks = [];
          let finished = false;
          const safeNext = () => {
            if (finished) return;
            finished = true;
            nextEntry();
          };
          stream.on('data', (chunk) => chunks.push(chunk));
          stream.on('error', (errStream) => {
            stats.errors.push({ entry: entryName, error: errStream?.message || String(errStream) });
            stats.skippedEntries++;
            safeNext();
          });
          stream.on('end', () => {
            (async () => {
              try {
                const buffer = Buffer.concat(chunks);
                const { text, ext: effectiveExt } = await extractZipEntryContent(buffer, entryName);
                const parsedHands = await parseHandsFromContent(text, effectiveExt);
                const parsedCount = Array.isArray(parsedHands) ? parsedHands.length : 0;
                stats.parsed += parsedCount;
                if (parsedCount > 0) {
                  const normalized = [];
                  for (const hand of parsedHands) {
                    if (!hand) continue;
                    try { 
                      assignPositions(hand); 
                    } catch (err) {
                      // Non-critical: position assignment can fail for malformed hands
                      console.warn(`Failed to assign positions for hand ${hand.id}:`, err.message);
                    }
                    try { 
                      computeStreetPots(hand); 
                    } catch (err) {
                      // Non-critical: pot calculation can fail for incomplete hand data
                      console.warn(`Failed to compute pots for hand ${hand.id}:`, err.message);
                    }
                    const row = formatHandRow(hand);
                    if (row) normalized.push(row);
                  }
                  stats.normalized += normalized.length;
                  stats.discarded += parsedCount - normalized.length;
                  if (normalized.length) {
                    const res = insert(normalized);
                    stats.inserted += res.inserted;
                    stats.updated += res.updated;
                    stats.duplicates += res.duplicates;
                  }
                }
              } catch (entryErr) {
                stats.errors.push({ entry: entryName, error: entryErr?.message || String(entryErr) });
              } finally {
                safeNext();
              }
            })();
          });
        });
      });
      zip.once('end', () => resolve(stats));
      zip.once('error', (zipErr) => reject(zipErr));
      nextEntry();
    });
  });

  return stats;
}

async function* walkFolders(folders) {
  const seen = new Set();
  for (const folder of folders) {
    const root = path.resolve(folder);
    if (seen.has(root)) continue;
    seen.add(root);
    const stack = [root];
    while (stack.length) {
      const current = stack.pop();
      let entries;
      try {
        entries = await fsp.readdir(current, { withFileTypes: true });
      } catch (err) {
        yield { type: 'error', path: current, error: err };
        continue;
      }
      for (const entry of entries) {
        const full = path.join(current, entry.name);
        if (entry.isDirectory()) {
          stack.push(full);
          continue;
        }
        const ext = path.extname(entry.name).toLowerCase();
        if (TEXT_EXTENSIONS.has(ext) || COMPRESSED_EXTENSIONS.has(ext)) {
          yield { type: 'file', path: full };
        } else if (ext === '.zip') {
          yield { type: 'zip', path: full };
        }
      }
    }
  }
}

function createDb(options = {}) {
  if (options.db) return { db: options.db, close: () => {} };
  const dbPath = options.dbPath || DEFAULT_DB_PATH;
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS hands (
      id        TEXT PRIMARY KEY,
      dateUTC   TEXT,
      tableName TEXT,
      sb        REAL,
      bb        REAL,
      hero      TEXT,
      json      TEXT NOT NULL,
      ts        INTEGER,
      heroNet   REAL
    );
    CREATE INDEX IF NOT EXISTS idx_hands_ts    ON hands(ts);
    CREATE INDEX IF NOT EXISTS idx_hands_table ON hands(tableName);
  `);
  return {
    db,
    close: () => db.close(),
  };
}

function prepareStatements(db, overwrite) {
  const exists = db.prepare(`SELECT 1 FROM hands WHERE id = ? LIMIT 1`).pluck();
  if (overwrite) {
    const stmt = db.prepare(`
      INSERT INTO hands (id, dateUTC, tableName, sb, bb, hero, json, ts, heroNet)
      VALUES (@id, @dateUTC, @tableName, @sb, @bb, @hero, @json, @ts, @heroNet)
      ON CONFLICT(id) DO UPDATE SET
        dateUTC=excluded.dateUTC,
        tableName=excluded.tableName,
        sb=excluded.sb,
        bb=excluded.bb,
        hero=excluded.hero,
        json=excluded.json,
        ts=excluded.ts,
        heroNet=excluded.heroNet
    `);
    return { upsert: stmt, exists };
  }
  const stmt = db.prepare(`
    INSERT INTO hands (id, dateUTC, tableName, sb, bb, hero, json, ts, heroNet)
    VALUES (@id, @dateUTC, @tableName, @sb, @bb, @hero, @json, @ts, @heroNet)
    ON CONFLICT(id) DO NOTHING
  `);
  return { upsert: stmt, exists };
}

function formatHandRow(hand) {
  const id = hand.handId || hand.id;
  if (!id) return null;
  const dateUTC = hand.dateUTC || hand.date || hand.time || null;
  let ts = null;
  if (typeof hand.ts === 'number' && Number.isFinite(hand.ts)) {
    ts = Math.trunc(hand.ts);
  } else if (dateUTC) {
    ts = parseTimestamp(dateUTC);
  }
  const stakes = hand.stakes || {};
  const sb = stakes.sb ?? null;
  const bb = stakes.bb ?? null;
  const hero = getHeroName(hand) || null;
  const heroNet = computeHeroNetFromJson(hand);
  return {
    id,
    dateUTC: dateUTC ?? null,
    tableName: hand.tableName || hand.table?.name || null,
    sb: sb != null ? Number(sb) : null,
    bb: bb != null ? Number(bb) : null,
    hero,
    json: JSON.stringify(hand),
    ts,
    heroNet,
  };
}

export async function runImport(folders, onProgress = () => {}, opts = {}) {
  if (!Array.isArray(folders) || folders.length === 0) {
    throw new Error('No folders provided');
  }
  const overwrite = !!opts.overwrite;
  const { db, close } = createDb(opts);
  const { upsert, exists } = prepareStatements(db, overwrite);
  let processedFiles = 0;
  let skippedFiles = 0;
  let totalParsedHands = 0;
  let totalNormalizedHands = 0;
  let insertedHands = 0;
  let updatedHands = 0;
  let duplicateHands = 0;
  let discardedHands = 0;
  const fileSummaries = [];
  const seenIds = new Set();

  onProgress({ line: `Scanning ${folders.length} folder(s)...` });

  const filesToProcess = [];

  for await (const entry of walkFolders(folders)) {
    if (entry.type === 'error') {
      skippedFiles++;
      onProgress({ line: `[ERR] ${entry.path}: ${entry.error?.message || entry.error}` });
      continue;
    }
    if (entry.type === 'skip') {
      skippedFiles++;
      onProgress({ line: `[skip] ${entry.path} (${entry.reason})` });
      continue;
    }
    if (entry.type === 'file' || entry.type === 'zip') {
      filesToProcess.push({ path: entry.path, kind: entry.type });
    }
  }

  const totalFiles = filesToProcess.length;
  onProgress({
    line: `Found ${totalFiles} file(s) to process`,
    filesProcessed: 0,
    totalFiles,
  });

  try {
    const insert = db.transaction((rows) => {
      const stats = { inserted: 0, updated: 0, duplicates: 0 };
      for (const row of rows) {
        if (!row || !row.id) continue;
        const id = row.id;
        if (seenIds.has(id)) {
          stats.duplicates++;
          continue;
        }
        const existedBefore = overwrite && exists ? Boolean(exists.get(id)) : false;
        let info;
        try {
          info = upsert.run(row);
        } catch (err) {
          if (!overwrite && String(err.message || '').includes('UNIQUE constraint failed')) {
            stats.duplicates++;
            seenIds.add(id);
            continue;
          }
          throw err;
        }
        if (info && info.changes > 0) {
          if (overwrite && existedBefore) {
            stats.updated++;
          } else {
            stats.inserted++;
          }
          seenIds.add(id);
        } else {
          stats.duplicates++;
          seenIds.add(id);
        }
      }
      return stats;
    });

    for (const item of filesToProcess) {
      const { path: filePath, kind } = typeof item === 'string' ? { path: item, kind: 'file' } : item;
      const entryKind = kind || 'file';
      processedFiles++;

      const snapshotTotals = () => ({
        parsed: totalParsedHands,
        normalized: totalNormalizedHands,
        inserted: insertedHands,
        updated: updatedHands,
        duplicates: duplicateHands,
        discarded: discardedHands,
      });

      if (entryKind === 'zip') {
        const yauzl = getYauzl();
        if (!yauzl) {
          skippedFiles++;
          const summary = {
            path: filePath,
            type: 'zip',
            entries: 0,
            parsed: 0,
            normalized: 0,
            discarded: 0,
            inserted: 0,
            updated: 0,
            duplicates: 0,
            skippedEntries: 0,
            errors: [
              { error: "ZIP support requires the 'yauzl' package. Run `npm install` to enable ZIP processing." },
            ],
          };
          fileSummaries.push(summary);
          onProgress({
            line: `[skip] ${filePath} (install 'yauzl' to process ZIP archives)`,
            filesProcessed: processedFiles,
            totalFiles,
            file: summary,
            totals: snapshotTotals(),
          });
          continue;
        }
        try {
          const zipStats = await processZipFile(filePath, insert);
          totalParsedHands += zipStats.parsed;
          totalNormalizedHands += zipStats.normalized;
          insertedHands += zipStats.inserted;
          updatedHands += zipStats.updated;
          duplicateHands += zipStats.duplicates;
          discardedHands += zipStats.discarded;

          const summary = {
            path: filePath,
            type: 'zip',
            entries: zipStats.entries,
            parsed: zipStats.parsed,
            normalized: zipStats.normalized,
            discarded: zipStats.discarded,
            inserted: zipStats.inserted,
            updated: zipStats.updated,
            duplicates: zipStats.duplicates,
            skippedEntries: zipStats.skippedEntries,
            errors: zipStats.errors,
          };
          fileSummaries.push(summary);
          const errorNote = zipStats.errors.length ? `, ${zipStats.errors.length} errors` : '';
          onProgress({
            line: `[${processedFiles}/${totalFiles}] ${filePath}: ${zipStats.inserted} new, ${zipStats.updated} updated, ${zipStats.duplicates} duplicates, ${zipStats.discarded} discarded across ${zipStats.entries} entries${errorNote}`,
            filesProcessed: processedFiles,
            totalFiles,
            file: summary,
            totals: snapshotTotals(),
          });
        } catch (err) {
          skippedFiles++;
          const summary = {
            path: filePath,
            type: 'zip',
            entries: 0,
            parsed: 0,
            normalized: 0,
            discarded: 0,
            inserted: 0,
            updated: 0,
            duplicates: 0,
            skippedEntries: 0,
            errors: [{ error: err?.message || String(err) }],
          };
          fileSummaries.push(summary);
          onProgress({
            line: `[ERR] ${filePath}: ${err?.message || err}`,
            filesProcessed: processedFiles,
            totalFiles,
            file: summary,
            totals: snapshotTotals(),
          });
        }
        continue;
      }

      try {
        const parsedHands = await parseHandsFromFile(filePath);
        const parsedCount = Array.isArray(parsedHands) ? parsedHands.length : 0;
        totalParsedHands += parsedCount;
        if (parsedCount === 0) {
          const summary = {
            path: filePath,
            type: 'file',
            parsed: 0,
            normalized: 0,
            discarded: 0,
            inserted: 0,
            updated: 0,
            duplicates: 0,
          };
          fileSummaries.push(summary);
          onProgress({
            line: `[${processedFiles}/${totalFiles}] ${filePath} (no hands)`,
            filesProcessed: processedFiles,
            totalFiles,
            file: summary,
            totals: snapshotTotals(),
          });
          continue;
        }

        const normalized = [];
        for (const hand of parsedHands) {
          if (!hand) continue;
          try { assignPositions(hand); } catch {}
          try { computeStreetPots(hand); } catch {}
          
          // Feed to live tracker if enabled (for real-time stats)
          if (liveTrackerCallback && opts.autoImport) {
            try { feedHandToLiveTracker(hand); } catch {}
          }
          
          const row = formatHandRow(hand);
          if (row) normalized.push(row);
        }
        const normalizedCount = normalized.length;
        totalNormalizedHands += normalizedCount;
        const discardedCount = parsedCount - normalizedCount;
        discardedHands += discardedCount;

        const fileStats = normalizedCount > 0 ? insert(normalized) : { inserted: 0, updated: 0, duplicates: 0 };
        insertedHands += fileStats.inserted;
        updatedHands += fileStats.updated;
        duplicateHands += fileStats.duplicates;

        const summary = {
          path: filePath,
          type: 'file',
          parsed: parsedCount,
          normalized: normalizedCount,
          discarded: discardedCount,
          inserted: fileStats.inserted,
          updated: fileStats.updated,
          duplicates: fileStats.duplicates,
        };
        fileSummaries.push(summary);

        onProgress({
          line: `[${processedFiles}/${totalFiles}] ${filePath}: ${fileStats.inserted} new, ${fileStats.updated} updated, ${fileStats.duplicates} duplicates, ${discardedCount} discarded`,
          filesProcessed: processedFiles,
          totalFiles,
          file: summary,
          totals: snapshotTotals(),
        });
      } catch (err) {
        skippedFiles++;
        const summary = {
          path: filePath,
          type: 'file',
          parsed: 0,
          normalized: 0,
          discarded: 0,
          inserted: 0,
          updated: 0,
          duplicates: 0,
          error: err?.message || String(err),
        };
        fileSummaries.push(summary);
        onProgress({
          line: `[ERR] ${filePath}: ${err?.message || err}`,
          filesProcessed: processedFiles,
          totalFiles,
          file: summary,
          totals: snapshotTotals(),
        });
      }
    }
  } finally {
    close();
  }

  const summary = {
    ok: true,
    filesProcessed: processedFiles,
    totalFiles,
    parsedHands: totalParsedHands,
    normalizedHands: totalNormalizedHands,
    handsInserted: insertedHands,
    handsUpdated: updatedHands,
    duplicates: duplicateHands,
    discarded: discardedHands,
    skippedFiles,
    overwrite,
    files: fileSummaries,
  };
  const totalImported = insertedHands + updatedHands;
  onProgress({
    line: `Imported ${totalImported} hands (${insertedHands} new, ${updatedHands} updated, ${duplicateHands} duplicates) from ${processedFiles} file(s).`,
    ...summary,
  });
  return summary;
}

export default { runImport };

