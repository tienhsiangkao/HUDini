// tests/handlers/sessions-handlers.test.js
// Integration tests for sessions-handlers module

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { createTestDb, seedTestDb, cleanupTestDb, createMockEvent, assertSuccessResponse } from '../test-utils.js';

const { registerSessionsHandlers } = await import('../../handlers/sessions-handlers.cjs');

describe('sessions-handlers', () => {
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

    registerSessionsHandlers(mockIpcMain, db);
  });

  afterEach(() => {
    cleanupTestDb(db);
  });

  describe('sessions:list', () => {
    test('should return list of sessions', async () => {
      // Add some sessions first
      const sessionId1 = `session_${Date.now()}_1`;
      const sessionId2 = `session_${Date.now()}_2`;
      
      db.prepare(`
        INSERT INTO sessions (id, startTime, endTime, hands, totalWon)
        VALUES (?, ?, ?, ?, ?)
      `).run(sessionId1, Date.now() - 3600000, Date.now() - 1800000, 50, 25.50);
      
      db.prepare(`
        INSERT INTO sessions (id, startTime, endTime, hands, totalWon)
        VALUES (?, ?, ?, ?, ?)
      `).run(sessionId2, Date.now() - 1800000, Date.now(), 30, -10.25);
      
      const result = await handlers['sessions:list'](createMockEvent());
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    test('should include session details', async () => {
      const sessionId = `session_${Date.now()}`;
      db.prepare(`
        INSERT INTO sessions (id, startTime, endTime, hands, totalWon, avgStake)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(sessionId, Date.now() - 3600000, Date.now(), 100, 50.00, '0.02/0.05');
      
      const result = await handlers['sessions:list'](createMockEvent());
      
      const session = result.find(s => s.id === sessionId);
      expect(session).toBeDefined();
      expect(session).toHaveProperty('startTime');
      expect(session).toHaveProperty('hands');
      expect(session).toHaveProperty('totalWon');
    });

    test('should return empty array when no sessions', async () => {
      db.prepare('DELETE FROM sessions').run();
      
      const result = await handlers['sessions:list'](createMockEvent());
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });

  describe('sessions:detect', () => {
    test('should detect sessions from hands', async () => {
      const result = await handlers['sessions:detect'](createMockEvent(), {
        gapMinutes: 30
      });
      
      assertSuccessResponse(result);
      expect(result).toHaveProperty('sessions');
      expect(Array.isArray(result.sessions)).toBe(true);
    });

    test('should use default gap of 30 minutes', async () => {
      const result = await handlers['sessions:detect'](createMockEvent(), {});
      
      assertSuccessResponse(result);
      expect(result.sessions).toBeDefined();
    });

    test('should group hands into sessions', async () => {
      const result = await handlers['sessions:detect'](createMockEvent(), {
        gapMinutes: 30
      });
      
      assertSuccessResponse(result);
      
      if (result.sessions.length > 0) {
        const session = result.sessions[0];
        expect(session).toHaveProperty('startTime');
        expect(session).toHaveProperty('endTime');
        expect(session).toHaveProperty('hands');
        expect(session).toHaveProperty('totalWon');
        expect(session).toHaveProperty('handIds');
        expect(Array.isArray(session.handIds)).toBe(true);
      }
    });

    test('should calculate session statistics', async () => {
      const result = await handlers['sessions:detect'](createMockEvent(), {
        gapMinutes: 30
      });
      
      assertSuccessResponse(result);
      
      // Check that sessions have statistics
      for (const session of result.sessions) {
        expect(typeof session.totalWon).toBe('number');
        expect(typeof session.hands).toBe('number');
        expect(typeof session.durationMinutes).toBe('number');
        expect(Array.isArray(session.handIds)).toBe(true);
        
        // hands count should match handIds length (may be 0 for empty sessions)
        expect(session.hands).toBe(session.handIds.length);
      }
    });

    test('should respect custom gap parameter', async () => {
      // Detect with very small gap (should create more sessions)
      const resultSmallGap = await handlers['sessions:detect'](createMockEvent(), {
        gapMinutes: 1
      });
      
      // Detect with large gap (should create fewer sessions)
      const resultLargeGap = await handlers['sessions:detect'](createMockEvent(), {
        gapMinutes: 120
      });
      
      assertSuccessResponse(resultSmallGap);
      assertSuccessResponse(resultLargeGap);
      
      // Small gap might create more sessions
      expect(resultSmallGap.sessions.length).toBeGreaterThanOrEqual(resultLargeGap.sessions.length);
    });
  });

  describe('sessions:details', () => {
    test('should get session details with hand IDs', async () => {
      // First detect sessions
      const detected = await handlers['sessions:detect'](createMockEvent(), {
        gapMinutes: 30
      });
      
      if (detected.sessions.length > 0) {
        const sessionId = detected.sessions[0].id;
        const handIds = detected.sessions[0].handIds;
        
        const result = await handlers['sessions:details'](createMockEvent(), {
          handIds: handIds
        });
        
        assertSuccessResponse(result);
        expect(result).toHaveProperty('stats');
        expect(result.stats).toHaveProperty('hands');
      }
    });

    test('should calculate detailed statistics', async () => {
      // Use all hands as one session
      const allHands = db.prepare('SELECT id FROM hands').all();
      const handIds = allHands.map(h => h.id);
      
      const result = await handlers['sessions:details'](createMockEvent(), {
        handIds: handIds
      });
      
      assertSuccessResponse(result);
      expect(result.stats).toHaveProperty('hands');
      expect(result.stats).toHaveProperty('VPIP_pct');
      expect(result.stats).toHaveProperty('PFR_pct');
      expect(result.stats).toHaveProperty('totalWon');
    });

    test('should handle empty hand IDs', async () => {
      const result = await handlers['sessions:details'](createMockEvent(), {
        handIds: []
      });
      
      assertSuccessResponse(result);
      expect(result.stats.hands).toBe(0);
    });

    test('should handle non-existent hand IDs', async () => {
      const result = await handlers['sessions:details'](createMockEvent(), {
        handIds: ['NONEXISTENT1', 'NONEXISTENT2']
      });
      
      assertSuccessResponse(result);
      expect(result.stats.hands).toBe(0);
    });

    test('should calculate position breakdown', async () => {
      const allHands = db.prepare('SELECT id FROM hands').all();
      const handIds = allHands.map(h => h.id);
      
      const result = await handlers['sessions:details'](createMockEvent(), {
        handIds: handIds
      });
      
      assertSuccessResponse(result);
      expect(result).toHaveProperty('byPosition');
      expect(typeof result.byPosition).toBe('object');
    });
  });
});
