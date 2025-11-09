// tests/handlers/annotations-handlers.test.js
// Integration tests for annotations-handlers module

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { createTestDb, seedTestDb, cleanupTestDb, createMockEvent, assertSuccessResponse, assertErrorResponse } from '../test-utils.js';

const { registerAnnotationsHandlers } = await import('../../handlers/annotations-handlers.cjs');

describe('annotations-handlers', () => {
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

    registerAnnotationsHandlers(mockIpcMain, db);
  });

  afterEach(() => {
    cleanupTestDb(db);
  });

  describe('annotations:getAll', () => {
    test('should return all annotations', async () => {
      const result = await handlers['annotations:getAll'](createMockEvent());
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    test('should include all required fields', async () => {
      const result = await handlers['annotations:getAll'](createMockEvent());
      
      const annotation = result[0];
      expect(annotation).toHaveProperty('id');
      expect(annotation).toHaveProperty('handId');
      expect(annotation).toHaveProperty('timestamp');
      expect(annotation).toHaveProperty('label');
      expect(annotation).toHaveProperty('notes');
    });

    test('should return empty array when no annotations', async () => {
      db.prepare('DELETE FROM annotations').run();
      
      const result = await handlers['annotations:getAll'](createMockEvent());
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });

  describe('annotations:add', () => {
    test('should add new annotation', async () => {
      const newAnnotation = {
        handId: 'RC3475980818',
        timestamp: Date.now(),
        dateUTC: '2024-10-27',
        label: 'Test annotation',
        notes: 'Test notes content'
      };
      
      const result = await handlers['annotations:add'](createMockEvent(), newAnnotation);
      
      assertSuccessResponse(result);
      expect(result).toHaveProperty('id');
      expect(typeof result.id).toBe('number');
    });

    test('should validate required fields', async () => {
      const result = await handlers['annotations:add'](createMockEvent(), {
        // Missing handId
        timestamp: Date.now(),
        label: 'Test'
      });
      
      assertErrorResponse(result);
    });

    test('should validate timestamp', async () => {
      const result = await handlers['annotations:add'](createMockEvent(), {
        handId: 'RC3475980818',
        timestamp: 'not-a-number',
        label: 'Test'
      });
      
      assertErrorResponse(result, 'timestamp');
    });

    test('should allow optional notes', async () => {
      const result = await handlers['annotations:add'](createMockEvent(), {
        handId: 'RC3475980818',
        timestamp: Date.now(),
        label: 'Test',
        // notes omitted
      });
      
      assertSuccessResponse(result);
    });
  });

  describe('annotations:update', () => {
    test('should update existing annotation', async () => {
      // Get an existing annotation ID
      const annotations = await handlers['annotations:getAll'](createMockEvent());
      const existingId = annotations[0].id;
      
      const result = await handlers['annotations:update'](createMockEvent(), {
        id: existingId,
        label: 'Updated label',
        notes: 'Updated notes'
      });
      
      assertSuccessResponse(result);
      
      // Verify update
      const updated = db.prepare('SELECT * FROM annotations WHERE id = ?').get(existingId);
      expect(updated.label).toBe('Updated label');
      expect(updated.notes).toBe('Updated notes');
    });

    test('should require annotation ID', async () => {
      const result = await handlers['annotations:update'](createMockEvent(), {
        label: 'Test'
      });
      
      assertErrorResponse(result, 'id');
    });

    test('should only update whitelisted fields', async () => {
      const annotations = await handlers['annotations:getAll'](createMockEvent());
      const existingId = annotations[0].id;
      const originalHandId = annotations[0].handId;
      
      const result = await handlers['annotations:update'](createMockEvent(), {
        id: existingId,
        handId: 'SHOULD_NOT_UPDATE',  // Not in whitelist
        label: 'Updated'
      });
      
      assertSuccessResponse(result);
      
      // Verify handId was NOT updated
      const updated = db.prepare('SELECT * FROM annotations WHERE id = ?').get(existingId);
      expect(updated.handId).toBe(originalHandId);
      expect(updated.label).toBe('Updated');
    });

    test('should handle non-existent annotation', async () => {
      const result = await handlers['annotations:update'](createMockEvent(), {
        id: 99999,
        label: 'Test'
      });
      
      assertSuccessResponse(result);
      expect(result.changes).toBe(0);
    });
  });

  describe('annotations:delete', () => {
    test('should delete annotation by ID', async () => {
      const annotations = await handlers['annotations:getAll'](createMockEvent());
      const idToDelete = annotations[0].id;
      
      const result = await handlers['annotations:delete'](createMockEvent(), idToDelete);
      
      assertSuccessResponse(result);
      
      // Verify deletion
      const remaining = await handlers['annotations:getAll'](createMockEvent());
      expect(remaining.find(a => a.id === idToDelete)).toBeUndefined();
    });

    test('should require annotation ID', async () => {
      const result = await handlers['annotations:delete'](createMockEvent(), null);
      
      assertErrorResponse(result, 'id');
    });

    test('should handle non-existent annotation', async () => {
      const result = await handlers['annotations:delete'](createMockEvent(), 99999);
      
      assertSuccessResponse(result);
      expect(result.changes).toBe(0);
    });

  });
});
