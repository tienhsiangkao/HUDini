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
      
      expect(result.success).toBe(true);
      expect(Array.isArray(result.annotations)).toBe(true);
      expect(result.annotations.length).toBeGreaterThan(0);
    });

    test('should include all required fields', async () => {
      const result = await handlers['annotations:getAll'](createMockEvent());
      
      expect(result.success).toBe(true);
      const annotation = result.annotations[0];
      expect(annotation).toHaveProperty('id');
      expect(annotation).toHaveProperty('ts');
      expect(annotation).toHaveProperty('date');
      expect(annotation).toHaveProperty('label');
      expect(annotation).toHaveProperty('color');
    });

    test('should return empty array when no annotations', async () => {
      db.prepare('DELETE FROM annotations').run();
      
      const result = await handlers['annotations:getAll'](createMockEvent());
      
      expect(result.success).toBe(true);
      expect(result.annotations.length).toBe(0);
    });
  });

  describe('annotations:add', () => {
    test('should add new annotation', async () => {
      const newAnnotation = {
        ts: Math.floor(Date.now() / 1000),
        date: '2024-10-27',
        label: 'Test annotation',
        color: '#2196F3',
        notes: 'Test notes content'
      };
      
      const result = await handlers['annotations:add'](createMockEvent(), newAnnotation);
      
      assertSuccessResponse(result);
      expect(result.annotation).toHaveProperty('id');
      expect(typeof result.annotation.id).toBe('number');
    });

    test('should validate required fields', async () => {
      const result = await handlers['annotations:add'](createMockEvent(), {
        // Missing ts
        date: '2024-10-27',
        label: 'Test'
      });
      
      assertErrorResponse(result);
    });

    test('should validate timestamp', async () => {
      const result = await handlers['annotations:add'](createMockEvent(), {
        ts: 'not-a-number',
        date: '2024-10-27',
        label: 'Test'
      });
      
      assertErrorResponse(result, 'timestamp');
    });

    test('should allow optional notes', async () => {
      const result = await handlers['annotations:add'](createMockEvent(), {
        ts: Math.floor(Date.now() / 1000),
        date: '2024-10-27',
        label: 'Test'
        // notes omitted - should use default
      });
      
      assertSuccessResponse(result);
    });
  });

  describe('annotations:update', () => {
    test('should update existing annotation', async () => {
      // Get an existing annotation ID
      const response = await handlers['annotations:getAll'](createMockEvent());
      const existingId = response.annotations[0].id;
      
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
      const response = await handlers['annotations:getAll'](createMockEvent());
      const existingId = response.annotations[0].id;
      const originalTs = response.annotations[0].ts;
      
      const result = await handlers['annotations:update'](createMockEvent(), {
        id: existingId,
        ts: 999999,  // Not in whitelist
        label: 'Updated'
      });
      
      assertSuccessResponse(result);
      
      // Verify ts was NOT updated
      const updated = db.prepare('SELECT * FROM annotations WHERE id = ?').get(existingId);
      expect(updated.ts).toBe(originalTs);
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
      const response = await handlers['annotations:getAll'](createMockEvent());
      const idToDelete = response.annotations[0].id;
      
      const result = await handlers['annotations:delete'](createMockEvent(), idToDelete);
      
      assertSuccessResponse(result);
      
      // Verify deletion
      const afterDelete = await handlers['annotations:getAll'](createMockEvent());
      expect(afterDelete.annotations.find(a => a.id === idToDelete)).toBeUndefined();
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
