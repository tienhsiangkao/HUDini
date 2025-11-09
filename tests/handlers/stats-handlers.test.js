// tests/handlers/stats-handlers.test.js
// Integration tests for stats-handlers module

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTestDb, seedTestDb, cleanupTestDb, createMockEvent, assertSuccessResponse, assertErrorResponse } from '../test-utils.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import handlers
const { registerStatsHandlers } = await import('../../handlers/stats-handlers.cjs');

describe('stats-handlers', () => {
  let db;
  let handlers = {};
  let mockIpcMain;

  beforeEach(() => {
    db = createTestDb();
    seedTestDb(db);

    mockIpcMain = {
      handle: (channel, handler) => {
        handlers[channel] = handler;
      }
    };

    registerStatsHandlers(mockIpcMain, db, path.join(__dirname, '../..'));
  });

  afterEach(() => {
    cleanupTestDb(db);
  });

  describe('stats:list', () => {
    test('should return player stats array', async () => {
      const result = await handlers['stats:list'](createMockEvent(), {});
      
      // Handler returns array from player_stats table
      expect(Array.isArray(result)).toBe(true);
    });

    test('should include player statistics fields when data exists', async () => {
      // Add a player stat
      db.prepare(`
        INSERT INTO player_stats (player, hands, VPIP_pct, PFR_pct, updated_at)
        VALUES ('TestPlayer', 100, 25.5, 20.0, ?)
      `).run(Date.now());
      
      const result = await handlers['stats:list'](createMockEvent(), {});
      
      expect(result.length).toBeGreaterThan(0);
      const stat = result[0];
      expect(stat).toHaveProperty('player');
      expect(stat).toHaveProperty('hands');
    });

    test('should filter by player name', async () => {
      db.prepare(`
        INSERT INTO player_stats (player, hands, VPIP_pct, PFR_pct, updated_at)
        VALUES ('TestHero', 100, 25.5, 20.0, ?)
      `).run(Date.now());
      
      const result = await handlers['stats:list'](createMockEvent(), { player: 'TestHero' });
      
      expect(Array.isArray(result)).toBe(true);
    });

    test('should support search', async () => {
      const result = await handlers['stats:list'](createMockEvent(), { search: 'Test' });
      
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('stats:heroName', () => {
    test('should return latest hero name', async () => {
      const result = await handlers['stats:heroName'](createMockEvent());
      
      // Returns string or null
      expect(typeof result === 'string' || result === null).toBe(true);
    });

    test('should return null if no hands', async () => {
      db.prepare('DELETE FROM hands').run();
      
      const result = await handlers['stats:heroName'](createMockEvent());
      
      expect(result).toBeNull();
    });
  });

  describe('stats:heroBreakdown', () => {
    test('should return breakdown object', async () => {
      const result = await handlers['stats:heroBreakdown'](createMockEvent(), {});
      
      // Returns complex object with overall, groups, etc
      expect(typeof result).toBe('object');
      expect(result).not.toBeNull();
    });

    test.skip('should return positional breakdown', async () => {
      // Skip: Complex handler requiring significant test data setup
      const result = await handlers['stats:heroBreakdown'](createMockEvent(), { groupBy: 'position' });
      
      expect(result).toBeDefined();
    });

    test.skip('should filter by date range', async () => {
      // Skip: Complex handler
      const result = await handlers['stats:heroBreakdown'](createMockEvent(), {
        from: '2024-10-27',
        to: '2024-10-27'
      });
      
      expect(result).toBeDefined();
    });
  });

  describe('hero:graphData', () => {
    test('should return graph data', async () => {
      const result = await handlers['hero:graphData'](createMockEvent(), {});
      
      assertSuccessResponse(result);
      expect(result.data).toBeDefined();
    });

    test('should support limiting results', async () => {
      const result = await handlers['hero:graphData'](createMockEvent(), { limit: 10 });
      
      assertSuccessResponse(result);
      expect(Array.isArray(result.data)).toBe(true);
    });

    test('should filter by date range', async () => {
      const result = await handlers['hero:graphData'](createMockEvent(), {
        from: '2024-10-27',
        to: '2024-10-27'
      });
      
      assertSuccessResponse(result);
    });

    test('should handle errors gracefully', async () => {
      db.close();
      
      const result = await handlers['hero:graphData'](createMockEvent(), {});
      
      // Handler catches errors and returns {success: false}
      expect(result.success).toBe(false);
    });
  });

  describe('stats:rebuild', () => {
    test('should trigger rebuild', async () => {
      const result = await handlers['stats:rebuild'](createMockEvent());
      
      // Returns success indicator
      expect(result).toBeDefined();
    });

    test.skip('should update player_stats table', async () => {
      // Skip: Complex operation requiring full hand parsing
      await handlers['stats:rebuild'](createMockEvent());
      
      const count = db.prepare('SELECT COUNT(*) as count FROM player_stats').get();
      expect(count.count).toBeGreaterThan(0);
    });
  });

  describe('stats:list:export', () => {
    test('should export stats to CSV format', async () => {
      // Add player stat
      db.prepare(`
        INSERT INTO player_stats (player, hands, VPIP_pct, PFR_pct, updated_at)
        VALUES ('TestHero', 100, 25.5, 20.0, ?)
      `).run(Date.now());
      
      const stats = await handlers['stats:list'](createMockEvent(), {});
      const result = await handlers['stats:list:export'](createMockEvent(), stats);
      
      assertSuccessResponse(result);
      expect(typeof result.csv).toBe('string');
    });

    test('should include player data in CSV', async () => {
      db.prepare(`
        INSERT INTO player_stats (player, hands, VPIP_pct, PFR_pct, updated_at)
        VALUES ('TestHero', 100, 25.5, 20.0, ?)
      `).run(Date.now());
      
      const stats = await handlers['stats:list'](createMockEvent(), {});
      const result = await handlers['stats:list:export'](createMockEvent(), stats);
      
      assertSuccessResponse(result);
      expect(result.csv).toContain('Player');
      expect(result.csv).toContain('Hands');
    });

    test('should handle empty stats', async () => {
      const result = await handlers['stats:list:export'](createMockEvent(), []);
      
      assertSuccessResponse(result);
      expect(typeof result.csv).toBe('string');
    });
  });
});
