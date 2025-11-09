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
    test('should return hero stats', async () => {
      const result = await handlers['stats:list'](createMockEvent(), {});
      
      expect(result).toHaveProperty('vpip');
      expect(result).toHaveProperty('pfr');
      expect(result).toHaveProperty('hands');
      expect(result).toHaveProperty('totalWon');
    });

    test('should calculate basic statistics', async () => {
      const result = await handlers['stats:list'](createMockEvent(), {});
      
      expect(typeof result.vpip).toBe('number');
      expect(typeof result.pfr).toBe('number');
      expect(result.hands).toBeGreaterThan(0);
    });

    test('should filter by date range', async () => {
      const result = await handlers['stats:list'](createMockEvent(), {
        from: '2024-10-27',
        to: '2024-10-27'
      });
      
      expect(result).toHaveProperty('hands');
      expect(result.hands).toBeGreaterThan(0);
    });

    test('should filter by stakes', async () => {
      const result = await handlers['stats:list'](createMockEvent(), {
        stakes: ['0.02/0.05']
      });
      
      expect(result).toHaveProperty('hands');
    });
  });

  describe('stats:heroName', () => {
    test('should return latest hero name', async () => {
      const result = await handlers['stats:heroName'](createMockEvent());
      
      expect(result).toHaveProperty('name');
      expect(typeof result.name).toBe('string');
    });

    test('should return null if no hands', async () => {
      // Clear all hands
      db.prepare('DELETE FROM hands').run();
      
      const result = await handlers['stats:heroName'](createMockEvent());
      
      expect(result).toHaveProperty('name', null);
    });
  });

  describe('stats:heroBreakdown', () => {
    test('should return overall breakdown', async () => {
      const result = await handlers['stats:heroBreakdown'](createMockEvent(), {});
      
      assertSuccessResponse(result);
      expect(result).toHaveProperty('overall');
      expect(result.overall).toHaveProperty('hands');
      expect(result.overall).toHaveProperty('VPIP_pct');
      expect(result.overall).toHaveProperty('PFR_pct');
    });

    test('should return positional breakdown', async () => {
      const result = await handlers['stats:heroBreakdown'](createMockEvent(), {});
      
      assertSuccessResponse(result);
      expect(result).toHaveProperty('byPosition');
      expect(typeof result.byPosition).toBe('object');
    });

    test('should filter by date range', async () => {
      const result = await handlers['stats:heroBreakdown'](createMockEvent(), {
        from: '2024-10-27',
        to: '2024-10-28'
      });
      
      assertSuccessResponse(result);
      expect(result.overall.hands).toBeGreaterThan(0);
    });
  });

  describe('hero:graphData', () => {
    test('should generate graph timeline', async () => {
      const result = await handlers['hero:graphData'](createMockEvent(), {});
      
      expect(result).toHaveProperty('timeline');
      expect(result).toHaveProperty('plotted');
      expect(result).toHaveProperty('totalHands');
      expect(Array.isArray(result.timeline)).toBe(true);
    });

    test('should limit results', async () => {
      const result = await handlers['hero:graphData'](createMockEvent(), {
        limit: 2
      });
      
      expect(result.plotted).toBeLessThanOrEqual(2);
    });

    test('should filter by stakes', async () => {
      const result = await handlers['hero:graphData'](createMockEvent(), {
        stakes: ['0.02/0.05']
      });
      
      expect(result).toHaveProperty('timeline');
    });

    test('should handle errors gracefully', async () => {
      // Close database to trigger error
      db.close();
      
      const result = await handlers['hero:graphData'](createMockEvent(), {});
      
      expect(result).toHaveProperty('error');
      expect(result.timeline).toEqual([]);
      expect(result.plotted).toBe(0);
      
      // Recreate db for cleanup
      db = createTestDb();
    });
  });

  describe('stats:rebuild', () => {
    test('should rebuild player stats', async () => {
      const result = await handlers['stats:rebuild'](createMockEvent());
      
      assertSuccessResponse(result);
      expect(result).toHaveProperty('message');
    });

    test('should update player_stats table', async () => {
      await handlers['stats:rebuild'](createMockEvent());
      
      // Verify stats were rebuilt
      const stats = db.prepare('SELECT * FROM player_stats WHERE name = ?').get('TestHero');
      expect(stats).toBeDefined();
      expect(stats.hands).toBeGreaterThan(0);
    });
  });

  describe('stats:list:export', () => {
    test('should export stats to CSV format', async () => {
      const result = await handlers['stats:list:export'](createMockEvent(), {});
      
      assertSuccessResponse(result);
      expect(result).toHaveProperty('csv');
      expect(typeof result.csv).toBe('string');
      expect(result.csv).toContain('Name');
      expect(result.csv).toContain('Hands');
    });

    test('should include player data in CSV', async () => {
      const result = await handlers['stats:list:export'](createMockEvent(), {});
      
      expect(result.csv).toContain('TestHero');
    });

    test('should handle empty stats', async () => {
      db.prepare('DELETE FROM player_stats').run();
      
      const result = await handlers['stats:list:export'](createMockEvent(), {});
      
      assertSuccessResponse(result);
      expect(result.csv).toBeTruthy();
    });
  });
});
