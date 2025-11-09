// tests/test-utils.js
// Shared test utilities and fixtures for handler tests

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Create an in-memory test database with schema
 */
export function createTestDb() {
  const db = new Database(':memory:');
  
  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS hands (
      id TEXT PRIMARY KEY,
      ts INTEGER,
      dateUTC TEXT,
      tableName TEXT,
      sb REAL,
      bb REAL,
      hero TEXT,
      heroNet REAL,
      json TEXT,
      notes TEXT,
      extras TEXT,
      site TEXT,
      handNumber TEXT,
      gameType TEXT,
      currency TEXT,
      maxSeats INTEGER,
      variant TEXT
    );

    CREATE TABLE IF NOT EXISTS player_stats (
      player TEXT PRIMARY KEY,
      hands INTEGER NOT NULL DEFAULT 0,
      VPIP_pct REAL DEFAULT 0,
      PFR_pct REAL DEFAULT 0,
      ThreeBet_pct REAL DEFAULT 0,
      FourBet_pct REAL DEFAULT 0,
      Squeeze_pct REAL DEFAULT 0,
      WTSD_pct REAL DEFAULT 0,
      WWSF_pct REAL DEFAULT 0,
      AFq_pct REAL DEFAULT 0,
      CBetF_pct REAL DEFAULT 0,
      CBetT_pct REAL DEFAULT 0,
      CBetR_pct REAL DEFAULT 0,
      FoldToCBetF_pct REAL DEFAULT 0,
      FoldToCBetT_pct REAL DEFAULT 0,
      FoldToCBetR_pct REAL DEFAULT 0,
      StealAtt INTEGER DEFAULT 0,
      StealSucc_pct REAL DEFAULT 0,
      CheckRaiseF INTEGER DEFAULT 0,
      positional_json TEXT,
      vs_hero_json TEXT,
      samples_json TEXT,
      confidence_json TEXT,
      raw_json TEXT,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS annotations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts INTEGER NOT NULL,
      date TEXT NOT NULL,
      label TEXT NOT NULL,
      color TEXT DEFAULT '#FF5722',
      notes TEXT,
      createdAt INTEGER DEFAULT (strftime('%s', 'now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      table_id TEXT,
      started_at INTEGER,
      ended_at INTEGER,
      hands_played INTEGER DEFAULT 0,
      startTime INTEGER,
      endTime INTEGER,
      hands INTEGER,
      totalWon REAL,
      avgStake TEXT,
      createdAt INTEGER DEFAULT (strftime('%s', 'now'))
    );

    CREATE INDEX IF NOT EXISTS idx_hands_ts ON hands(ts);
    CREATE INDEX IF NOT EXISTS idx_hands_hero_date ON hands(hero, dateUTC);
    CREATE INDEX IF NOT EXISTS idx_annotations_ts ON annotations(ts);
  `);

  return db;
}

/**
 * Sample hand data for testing
 */
export const sampleHands = [
  {
    id: 'RC3475980816',
    ts: 1730000000000,
    dateUTC: '2024-10-27',
    tableName: 'Rush & Cash',
    sb: 0.02,
    bb: 0.05,
    hero: 'TestHero',
    heroNet: 2.50,
    json: JSON.stringify({
      handId: 'RC3475980816',
      players: [
        { name: 'TestHero', position: 'BTN', cards: ['Ah', 'Kh'], isHero: true, stack: 10 },
        { name: 'Villain1', position: 'SB', stack: 8 },
        { name: 'Villain2', position: 'BB', stack: 12 }
      ],
      actions: [
        { player: 'TestHero', type: 'raise', amount: 0.15, street: 'preflop' },
        { player: 'Villain1', type: 'fold', street: 'preflop' },
        { player: 'Villain2', type: 'call', amount: 0.15, street: 'preflop' }
      ]
    })
  },
  {
    id: 'RC3475980817',
    ts: 1730000100000,
    dateUTC: '2024-10-27',
    tableName: 'Rush & Cash',
    sb: 0.02,
    bb: 0.05,
    hero: 'TestHero',
    heroNet: -1.25,
    json: JSON.stringify({
      handId: 'RC3475980817',
      players: [
        { name: 'TestHero', position: 'CO', cards: ['Ac', 'Ks'], isHero: true, stack: 10 },
        { name: 'Villain1', position: 'BTN', stack: 8 }
      ],
      actions: [
        { player: 'TestHero', type: 'raise', amount: 0.15, street: 'preflop' },
        { player: 'Villain1', type: 'call', amount: 0.15, street: 'preflop' }
      ]
    })
  },
  {
    id: 'RC3475980818',
    ts: 1730000200000,
    dateUTC: '2024-10-27',
    tableName: 'Rush & Cash',
    sb: 0.05,
    bb: 0.10,
    hero: 'TestHero',
    heroNet: 5.00,
    json: JSON.stringify({
      handId: 'RC3475980818',
      players: [
        { name: 'TestHero', position: 'BTN', cards: ['Ad', 'As'], isHero: true, stack: 20 },
        { name: 'Villain1', position: 'SB', stack: 15 }
      ],
      actions: [
        { player: 'TestHero', type: 'raise', amount: 0.30, street: 'preflop' },
        { player: 'Villain1', type: 'call', amount: 0.30, street: 'preflop' }
      ]
    })
  }
];

/**
 * Sample annotations
 */
export const sampleAnnotations = [
  {
    ts: Math.floor(Date.now() / 1000),
    date: '2024-10-27',
    label: 'Great bluff',
    color: '#4CAF50',
    notes: 'Villain showed weakness on turn'
  },
  {
    ts: Math.floor(Date.now() / 1000) + 3600,
    date: '2024-10-27',
    label: 'Bad beat',
    color: '#F44336',
    notes: 'Lost with top pair to runner-runner flush'
  }
];

/**
 * Insert sample data into test database
 */
export function seedTestDb(db) {
  const insertHand = db.prepare(`
    INSERT INTO hands (id, ts, dateUTC, tableName, sb, bb, hero, heroNet, json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const hand of sampleHands) {
    insertHand.run(
      hand.id,
      hand.ts,
      hand.dateUTC,
      hand.tableName,
      hand.sb,
      hand.bb,
      hand.hero,
      hand.heroNet,
      hand.json
    );
  }

  const insertAnnotation = db.prepare(`
    INSERT INTO annotations (ts, date, label, color, notes)
    VALUES (?, ?, ?, ?, ?)
  `);

  for (const ann of sampleAnnotations) {
    insertAnnotation.run(ann.ts, ann.date, ann.label, ann.color, ann.notes);
  }

  // Insert sample player stats
  db.prepare(`
    INSERT INTO player_stats (
      player, hands,
      VPIP_pct, PFR_pct, WTSD_pct, WWSF_pct, AFq_pct,
      CBetF_pct, CBetT_pct, CBetR_pct,
      FoldToCBetF_pct, FoldToCBetT_pct, FoldToCBetR_pct,
      ThreeBet_pct, FourBet_pct, Squeeze_pct,
      StealAtt, StealSucc_pct, CheckRaiseF,
      positional_json, vs_hero_json, samples_json, confidence_json, raw_json,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'SeedHero',
    100,
    25.0,
    20.0,
    30.0,
    45.0,
    2.5,
    55.0,
    42.0,
    38.0,
    40.0,
    35.0,
    30.0,
    8.0,
    2.0,
    5.0,
    10,
    60.0,
    3,
    JSON.stringify({ BTN: { hands: 25 } }),
    JSON.stringify({ villains: [] }),
    JSON.stringify({ VPIP_pct: 100 }),
    JSON.stringify({ VPIP_pct: 0.95 }),
    JSON.stringify({ raw: true }),
    Date.now()
  );
}

/**
 * Mock IPC event object
 */
export function createMockEvent() {
  return {
    sender: {
      send: () => {},
      webContents: {
        send: () => {}
      }
    },
    reply: () => {}
  };
}

/**
 * Mock dialog for import handlers
 */
export const mockDialog = {
  showOpenDialog: async () => ({ canceled: false, filePaths: ['/test/path/hand.txt'] }),
  showSaveDialog: async () => ({ canceled: false, filePath: '/test/path/export.csv' })
};

/**
 * Mock BrowserWindow for import handlers
 */
export const mockWindow = {
  webContents: {
    send: () => {}
  }
};

/**
 * Clean up test database
 */
export function cleanupTestDb(db) {
  if (db && db.open) {
    db.close();
  }
}

/**
 * Assert error response format
 */
export function assertErrorResponse(response, expectedMessage) {
  expect(response).toHaveProperty('success', false);
  expect(response).toHaveProperty('error');
  if (expectedMessage) {
    expect(response.error).toContain(expectedMessage);
  }
}

/**
 * Assert success response format
 */
export function assertSuccessResponse(response) {
  expect(response).toHaveProperty('success', true);
  expect(response).not.toHaveProperty('error');
}
