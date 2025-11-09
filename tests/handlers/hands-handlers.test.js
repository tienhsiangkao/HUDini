// tests/handlers/hands-handlers.test.js
// Integration tests for hands-handlers module

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { createTestDb, seedTestDb, cleanupTestDb, createMockEvent, sampleHands, assertErrorResponse, assertSuccessResponse } from '../test-utils.js';

// Import handlers as CommonJS module
const { registerHandsHandlers } = await import('../../handlers/hands-handlers.cjs');

describe('hands-handlers', () => {
  let db;
  let handlers = {};
  let mockIpcMain;

  beforeEach(() => {
    db = createTestDb();
    seedTestDb(db);

    // Mock ipcMain.handle
    mockIpcMain = {
      handle: (channel, handler) => {
        handlers[channel] = handler;
      }
    };

    registerHandsHandlers(mockIpcMain, db);
  });

  afterEach(() => {
    cleanupTestDb(db);
  });

  describe('hands:list', () => {
    test('should list all hands with default options', async () => {
      const result = await handlers['hands:list'](createMockEvent(), {});
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(3);
      expect(result[0]).toHaveProperty('handId');
      expect(result[0]).toHaveProperty('dateUTC');
    });

    test('should filter by result (won)', async () => {
      const result = await handlers['hands:list'](createMockEvent(), { result: 'won' });
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2); // 2 winning hands
      expect(result.every(h => h.heroNet > 0)).toBe(true);
    });

    test('should filter by result (lost)', async () => {
      const result = await handlers['hands:list'](createMockEvent(), { result: 'lost' });
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1); // 1 losing hand
      expect(result.every(h => h.heroNet < 0)).toBe(true);
    });

    test('should filter by stake', async () => {
      const result = await handlers['hands:list'](createMockEvent(), { stake: '0.05/0.10' });
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0].sb).toBe(0.05);
      expect(result[0].bb).toBe(0.10);
    });

    test('should search by query', async () => {
      const result = await handlers['hands:list'](createMockEvent(), { q: 'RC3475980816' });
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0].handId).toBe('RC3475980816');
    });

    test('should limit results', async () => {
      const result = await handlers['hands:list'](createMockEvent(), { limit: 2 });
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
    });

    test('should sort by date descending', async () => {
      const result = await handlers['hands:list'](createMockEvent(), { 
        sortField: 'date', 
        sortDir: 'desc' 
      });
      
      expect(result[0].ts).toBeGreaterThan(result[1].ts);
    });
  });

  describe('hands:get', () => {
    test('should get single hand by ID', async () => {
      const result = await handlers['hands:get'](createMockEvent(), 'RC3475980816');
      
      expect(result).toHaveProperty('id', 'RC3475980816');
      expect(result).toHaveProperty('heroNet', 2.50);
    });

    test('should return null for non-existent hand', async () => {
      const result = await handlers['hands:get'](createMockEvent(), 'NONEXISTENT');
      
      expect(result).toBeNull();
    });
  });

  describe('hands:getById', () => {
    test('should get full hand details with parsed JSON', async () => {
      const result = await handlers['hands:getById'](createMockEvent(), 'RC3475980816');
      
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('hand');
      expect(result.hand).toHaveProperty('id', 'RC3475980816');
      expect(result.hand).toHaveProperty('players');
      expect(Array.isArray(result.hand.players)).toBe(true);
    });

    test('should return error for non-existent hand', async () => {
      const result = await handlers['hands:getById'](createMockEvent(), 'NONEXISTENT');
      
      assertErrorResponse(result);
    });
  });

  describe('hands:getRange', () => {
    test('should aggregate hands by starting hand type', async () => {
      const result = await handlers['hands:getRange'](createMockEvent(), {});
      
      assertSuccessResponse(result);
      expect(result.data).toHaveProperty('AK'); // AKs and AKo combined
      expect(result.data).toHaveProperty('AA');
    });

    test('should filter by position', async () => {
      const result = await handlers['hands:getRange'](createMockEvent(), { 
        position: 'BTN' 
      });
      
      assertSuccessResponse(result);
      expect(result.data).toBeDefined();
      // Should only include hands where hero was on BTN
    });

    test('should filter by action type', async () => {
      const result = await handlers['hands:getRange'](createMockEvent(), { 
        action: 'raise' 
      });
      
      assertSuccessResponse(result);
      expect(result.data).toBeDefined();
      // Should only include hands where hero raised
    });

    test('should calculate hand statistics', async () => {
      const result = await handlers['hands:getRange'](createMockEvent(), {});
      
      assertSuccessResponse(result);
      const handStats = Object.values(result.data)[0];
      expect(handStats).toHaveProperty('frequency');
      expect(handStats).toHaveProperty('hands');
      expect(handStats).toHaveProperty('profit');
      expect(handStats).toHaveProperty('vpip');
      expect(handStats).toHaveProperty('pfr');
    });
  });

  describe('hands:stakes', () => {
    test('should list all unique stakes', async () => {
      const result = await handlers['hands:stakes'](createMockEvent());
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2); // 0.02/0.05 and 0.05/0.10
      expect(result[0]).toHaveProperty('sb');
      expect(result[0]).toHaveProperty('bb');
    });

    test('should sort stakes by bb ascending', async () => {
      const result = await handlers['hands:stakes'](createMockEvent());
      
      expect(result[0].bb).toBeLessThan(result[1].bb);
    });
  });

  describe('hands:getNotes', () => {
    test('should get notes for hand', async () => {
      // Add notes first
      db.prepare('UPDATE hands SET notes = ? WHERE id = ?').run('Test notes', 'RC3475980816');
      
      const result = await handlers['hands:getNotes'](createMockEvent(), 'RC3475980816');
      
      expect(result).toBe('Test notes');
    });

    test('should return empty string for hand without notes', async () => {
      const result = await handlers['hands:getNotes'](createMockEvent(), 'RC3475980817');
      
      expect(result).toBe('');
    });
  });

  describe('hands:saveNotes', () => {
    test('should save notes for hand', async () => {
      const result = await handlers['hands:saveNotes'](createMockEvent(), {
        handId: 'RC3475980816',
        notes: 'New note content'
      });
      
      assertSuccessResponse(result);
      
      // Verify notes were saved
      const notes = db.prepare('SELECT notes FROM hands WHERE id = ?').get('RC3475980816');
      expect(notes.notes).toBe('New note content');
    });

    test('should handle missing handId', async () => {
      const result = await handlers['hands:saveNotes'](createMockEvent(), {
        notes: 'Test'
      });
      
      assertErrorResponse(result);
    });
  });

  describe('hands:searchNotes', () => {
    test('should search notes by query', async () => {
      // Add notes to multiple hands
      db.prepare('UPDATE hands SET notes = ? WHERE id = ?').run('Bluff on river', 'RC3475980816');
      db.prepare('UPDATE hands SET notes = ? WHERE id = ?').run('Value bet river', 'RC3475980817');
      
      const result = await handlers['hands:searchNotes'](createMockEvent(), 'river');
      
      assertSuccessResponse(result);
      expect(result.hands.length).toBe(2);
    });

    test('should return empty array for no matches', async () => {
      const result = await handlers['hands:searchNotes'](createMockEvent(), 'nonexistent');
      
      assertSuccessResponse(result);
      expect(result.hands.length).toBe(0);
    });
  });

  describe('hands:delete', () => {
    test('should delete hands by IDs', async () => {
      const result = await handlers['hands:delete'](createMockEvent(), {
        handIds: ['RC3475980816', 'RC3475980817']
      });
      
      assertSuccessResponse(result);
      expect(result.deleted).toBe(2);
      
      // Verify hands were deleted
      const remaining = db.prepare('SELECT COUNT(*) as count FROM hands').get();
      expect(remaining.count).toBe(1);
    });

    test('should handle invalid handIds', async () => {
      const result = await handlers['hands:delete'](createMockEvent(), {
        handIds: 'not-an-array'
      });
      
      assertErrorResponse(result);
    });

    test('should handle empty array', async () => {
      const result = await handlers['hands:delete'](createMockEvent(), {
        handIds: []
      });
      
      assertErrorResponse(result, 'No hand IDs');
    });
  });
});
