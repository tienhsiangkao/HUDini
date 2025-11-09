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
      site TEXT,
      handNumber TEXT,
      gameType TEXT,
      currency TEXT,
      maxSeats INTEGER,
      variant TEXT
    );

    CREATE TABLE IF NOT EXISTS player_stats (
      name TEXT PRIMARY KEY,
      hands INTEGER DEFAULT 0,
      vpip INTEGER DEFAULT 0,
      pfr INTEGER DEFAULT 0,
      af REAL DEFAULT 0,
      wtsd INTEGER DEFAULT 0,
      wmsd INTEGER DEFAULT 0,
      tbets INTEGER DEFAULT 0,
      fold_to_cbet INTEGER DEFAULT 0,
      cbet INTEGER DEFAULT 0,
      total_won REAL DEFAULT 0,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS annotations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      handId TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      dateUTC TEXT,
      label TEXT,
      notes TEXT,
      FOREIGN KEY (handId) REFERENCES hands(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      startTime INTEGER NOT NULL,
      endTime INTEGER,
      hands INTEGER DEFAULT 0,
      totalWon REAL DEFAULT 0,
      avgStake TEXT,
      tableNames TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_hands_ts ON hands(ts);
    CREATE INDEX IF NOT EXISTS idx_hands_hero_date ON hands(hero, dateUTC);
    CREATE INDEX IF NOT EXISTS idx_annotations_handId ON annotations(handId);
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
      streets: [
        {
          name: 'preflop',
          actions: [
            { player: 'TestHero', action: 'raise', amount: 0.15 },
            { player: 'Villain1', action: 'fold' },
            { player: 'Villain2', action: 'call', amount: 0.15 }
          ]
        }
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
      streets: [
        {
          name: 'preflop',
          actions: [
            { player: 'TestHero', action: 'raise', amount: 0.15 },
            { player: 'Villain1', action: 'call', amount: 0.15 }
          ]
        }
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
      streets: [
        {
          name: 'preflop',
          actions: [
            { player: 'TestHero', action: 'raise', amount: 0.30 },
            { player: 'Villain1', action: 'call', amount: 0.30 }
          ]
        }
      ]
    })
  }
];

/**
 * Sample annotations
 */
export const sampleAnnotations = [
  {
    handId: 'RC3475980816',
    timestamp: Date.now(),
    dateUTC: '2024-10-27',
    label: 'Great bluff',
    notes: 'Villain showed weakness on turn'
  },
  {
    handId: 'RC3475980817',
    handId: 'RC3475980817',
    timestamp: Date.now(),
    dateUTC: '2024-10-27',
    label: 'Bad beat',
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
    INSERT INTO annotations (handId, timestamp, dateUTC, label, notes)
    VALUES (?, ?, ?, ?, ?)
  `);

  for (const ann of sampleAnnotations) {
    insertAnnotation.run(ann.handId, ann.timestamp, ann.dateUTC, ann.label, ann.notes);
  }

  // Insert sample player stats
  db.prepare(`
    INSERT INTO player_stats (name, hands, vpip, pfr, af, wtsd, wmsd, total_won, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run('TestHero', 100, 25, 20, 2.5, 30, 20, 150.50, Date.now());
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
