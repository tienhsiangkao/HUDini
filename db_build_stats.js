// db_build_stats.js
// Build or refresh player_stats inside hands.db. Can be imported or run directly.

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

import { assignPositions, computeStreetPots } from './parser_starter.js';
import { computeMetrics } from './lib/metrics_core.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_DB_PATH = path.join(__dirname, 'hands.db');



function* streamHands(db) {
  const stmt = db.prepare('SELECT json FROM hands');
  for (const row of stmt.iterate()) {
    if (!row?.json) continue;
    let parsed;
    try {
      parsed = JSON.parse(row.json);
    } catch {
      continue;
    }
    if (!parsed) continue;
    try { assignPositions(parsed); } catch {}
    try { computeStreetPots(parsed); } catch {}
    yield parsed;
  }
}

export function buildStats(options = {}) {
  const { dbPath = DEFAULT_DB_PATH, db: providedDb } = options;
  const db = providedDb ?? new Database(dbPath);
  const shouldClose = !providedDb;

  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS player_stats (
      player TEXT PRIMARY KEY,
      hands INTEGER NOT NULL,
      VPIP_pct REAL, PFR_pct REAL, ThreeBet_pct REAL, FourBet_pct REAL, Squeeze_pct REAL,
      CBetF_pct REAL, CBetT_pct REAL, CBetR_pct REAL,
      FoldToCBetF_pct REAL, FoldToCBetT_pct REAL, FoldToCBetR_pct REAL,
      WTSD_pct REAL, WWSF_pct REAL, AFq_pct REAL,
      StealAtt INTEGER, StealSucc_pct REAL,
      CheckRaiseF INTEGER,
      positional_json TEXT,
      vs_hero_json TEXT,
      samples_json TEXT,
      confidence_json TEXT,
      raw_json TEXT,
      updated_at TEXT NOT NULL
    );
  `);
  const extraColumns = [
    ['positional_json', 'TEXT'],
    ['vs_hero_json', 'TEXT'],
    ['samples_json', 'TEXT'],
    ['confidence_json', 'TEXT'],
    ['raw_json', 'TEXT'],
  ];
  for (const [col, type] of extraColumns) {
    try {
      db.exec(`ALTER TABLE player_stats ADD COLUMN ${col} ${type}`);
    } catch {}
  }

  let result;
  try {
    let totalHands = 0;
    function* countingHands() {
      for (const hand of streamHands(db)) {
        totalHands += 1;
        yield hand;
      }
    }
    let playerCount = 0;
    const upsertStats = db.prepare(`
      INSERT INTO player_stats (
        player, hands,
        VPIP_pct, PFR_pct, ThreeBet_pct, FourBet_pct, Squeeze_pct,
        CBetF_pct, CBetT_pct, CBetR_pct,
        FoldToCBetF_pct, FoldToCBetT_pct, FoldToCBetR_pct,
        WTSD_pct, WWSF_pct, AFq_pct,
        StealAtt, StealSucc_pct,
        CheckRaiseF,
        positional_json, vs_hero_json, samples_json, confidence_json, raw_json,
        updated_at
      ) VALUES (
        @player, @hands,
        @VPIP_pct, @PFR_pct, @ThreeBet_pct, @FourBet_pct, @Squeeze_pct,
        @CBetF_pct, @CBetT_pct, @CBetR_pct,
        @FoldToCBetF_pct, @FoldToCBetT_pct, @FoldToCBetR_pct,
        @WTSD_pct, @WWSF_pct, @AFq_pct,
        @StealAtt, @StealSucc_pct,
        @CheckRaiseF,
        @positional_json, @vs_hero_json, @samples_json, @confidence_json, @raw_json,
        datetime('now')
      ) ON CONFLICT(player) DO UPDATE SET
        hands=excluded.hands,
        VPIP_pct=excluded.VPIP_pct, PFR_pct=excluded.PFR_pct, ThreeBet_pct=excluded.ThreeBet_pct,
        FourBet_pct=excluded.FourBet_pct, Squeeze_pct=excluded.Squeeze_pct,
        CBetF_pct=excluded.CBetF_pct, CBetT_pct=excluded.CBetT_pct, CBetR_pct=excluded.CBetR_pct,
        FoldToCBetF_pct=excluded.FoldToCBetF_pct, FoldToCBetT_pct=excluded.FoldToCBetT_pct, FoldToCBetR_pct=excluded.FoldToCBetR_pct,
        WTSD_pct=excluded.WTSD_pct, WWSF_pct=excluded.WWSF_pct, AFq_pct=excluded.AFq_pct,
        StealAtt=excluded.StealAtt, StealSucc_pct=excluded.StealSucc_pct,
        CheckRaiseF=excluded.CheckRaiseF,
        positional_json=excluded.positional_json,
        vs_hero_json=excluded.vs_hero_json,
        samples_json=excluded.samples_json,
        confidence_json=excluded.confidence_json,
        raw_json=excluded.raw_json,
        updated_at=datetime('now');
    `);

    const tx = db.transaction((iterable) => {
      computeMetrics(iterable, {
        sort: false,
        onRow(entry) {
          const {
            player,
            hands,
            VPIP_pct,
            PFR_pct,
            ThreeBet_pct,
            FourBet_pct,
            Squeeze_pct,
            CBetF_pct,
            CBetT_pct,
            CBetR_pct,
            FoldToCBetF_pct,
            FoldToCBetT_pct,
            FoldToCBetR_pct,
            WTSD_pct,
            WWSF_pct,
            AFq_pct,
            StealAtt,
            StealSucc_pct,
            CheckRaiseF,
            positional,
            vsHero,
            samples,
            confidence,
            raw,
          } = entry;
          const row = {
            player,
            hands,
            VPIP_pct,
            PFR_pct,
            ThreeBet_pct,
            FourBet_pct,
            Squeeze_pct,
            CBetF_pct,
            CBetT_pct,
            CBetR_pct,
            FoldToCBetF_pct,
            FoldToCBetT_pct,
            FoldToCBetR_pct,
            WTSD_pct,
            WWSF_pct,
            AFq_pct,
            StealAtt,
            StealSucc_pct,
            CheckRaiseF,
            positional_json: JSON.stringify(positional || {}),
            vs_hero_json: JSON.stringify(vsHero || {}),
            samples_json: JSON.stringify(samples || {}),
            confidence_json: JSON.stringify(confidence || {}),
            raw_json: JSON.stringify(raw || {}),
          };
          upsertStats.run(row);
          playerCount += 1;
        },
      });
    });
    tx(countingHands());
    if (playerCount === 0) throw new Error('No hands found in DB. Run: node db_import.js');

    result = { ok: true, players: playerCount, hands: totalHands };
  } finally {
    if (shouldClose) db.close();
  }

  return result;
}

async function runCli() {
  try {
    const res = buildStats();
    console.log(`player_stats updated for ${res.players} players`);
    process.exit(0);
  } catch (err) {
    console.error(err?.message || err);
    process.exit(1);
  }
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invokedPath && invokedPath === __filename) {
  runCli();
}

