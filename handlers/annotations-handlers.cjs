// handlers/annotations-handlers.cjs
// Annotation-related IPC handlers for timeline annotations

const { logger } = require('../lib/logger.cjs');
const { validateAnnotation } = require('../utils/validators.cjs');

/**
 * Format annotation error message for user-friendly display.
 * 
 * @param {Error|string} error - Error object or message
 * @returns {string} Formatted error message
 * @private
 */
function formatAnnotationError(error) {
  const raw = (error && error.message) ? error.message : error;
  if (typeof raw !== 'string') {
    return 'annotation error';
  }
  if (raw.includes('ts must be a valid number')) {
    return 'timestamp must be a valid number';
  }
  return raw;
}

/**
 * Register all annotation-related IPC handlers for timeline annotations CRUD operations.
 * Provides endpoints for creating, reading, updating, and deleting timeline annotations.
 * 
 * @param {Electron.IpcMain} ipcMain - Electron IPC main process interface
 * @param {Database} db - better-sqlite3 database instance
 * 
 * @example
 * const { ipcMain } = require('electron');
 * const db = require('./lib/database.cjs');
 * registerAnnotationsHandlers(ipcMain, db);
 * 
 * @description
 * Registered handlers:
 * - annotations:getAll - Get all annotations ordered by timestamp
 * - annotations:add - Add new annotation with validation
 * - annotations:update - Update existing annotation (label, notes, color)
 * - annotations:delete - Delete annotation by ID
 */
function registerAnnotationsHandlers(ipcMain, db) {
  logger.info('Registering annotations handlers');

  /**
   * IPC Handler: annotations:getAll
   * Retrieve all timeline annotations ordered by timestamp.
   * 
   * @returns {Promise<object>} Response with success flag and annotations array
   * @property {boolean} success - Operation success status
   * @property {Array<object>} annotations - Array of annotation objects (id, ts, date, label, color, notes, createdAt)
   * @property {string} [error] - Error message if operation failed
   */
  ipcMain.handle('annotations:getAll', async () => {
    try {
      const annotations = db.prepare(`
        SELECT id, ts, date, label, color, notes, createdAt
        FROM annotations
        ORDER BY ts ASC
      `).all();
      
      logger.debug('Fetched annotations', { count: annotations.length });
      return { success: true, annotations };
    } catch (error) {
      const formatted = formatAnnotationError(error);
      logger.error('Failed to get annotations', { error: formatted });
      return { success: false, error: formatted, annotations: [] };
    }
  });

  // annotations:add - Add new annotation
  ipcMain.handle('annotations:add', async (_event, { ts, date, label, color = '#FF5722', notes = '' }) => {
    try {
      // Validate input
      validateAnnotation({ ts, date, label, color, notes });
      
      const stmt = db.prepare(`
        INSERT INTO annotations (ts, date, label, color, notes)
        VALUES (?, ?, ?, ?, ?)
      `);
      const result = stmt.run(ts, date, label, color, notes);
      
      const annotation = db.prepare('SELECT * FROM annotations WHERE id = ?').get(result.lastInsertRowid);
      
      logger.info('Annotation added', { id: result.lastInsertRowid, label });
      return { success: true, annotation };
    } catch (error) {
      const formatted = formatAnnotationError(error);
      logger.error('Failed to add annotation', { error: formatted });
      return { success: false, error: formatted };
    }
  });

  // annotations:update - Update existing annotation
  ipcMain.handle('annotations:update', async (_event, { id, label, color, notes }) => {
    try {
      if (!id) {
        return { success: false, error: 'annotation id required' };
      }
      
      // Whitelist of allowed fields (security: prevent SQL injection)
      const ALLOWED_FIELDS = new Set(['label', 'color', 'notes']);
      const updates = [];
      const values = [];
      
      if (label !== undefined && ALLOWED_FIELDS.has('label')) {
        updates.push('label = ?');
        values.push(label);
      }
      if (color !== undefined && ALLOWED_FIELDS.has('color')) {
        updates.push('color = ?');
        values.push(color);
      }
      if (notes !== undefined && ALLOWED_FIELDS.has('notes')) {
        updates.push('notes = ?');
        values.push(notes);
      }
      
      if (updates.length === 0) {
        return { success: false, error: 'No fields to update' };
      }
      
      values.push(id);
      const stmt = db.prepare(`UPDATE annotations SET ${updates.join(', ')} WHERE id = ?`);
      const result = stmt.run(...values);
      
      const annotation = db.prepare('SELECT * FROM annotations WHERE id = ?').get(id);
      
      logger.info('Annotation updated', { id, fields: updates.length });
      return { success: true, annotation, changes: result.changes };
    } catch (error) {
      const formatted = formatAnnotationError(error);
      logger.error('Failed to update annotation', { error: formatted, id });
      return { success: false, error: formatted };
    }
  });

  // annotations:delete - Delete annotation
  ipcMain.handle('annotations:delete', async (_event, id) => {
    try {
      if (!id) {
        return { success: false, error: 'annotation id required' };
      }
      
      const stmt = db.prepare('DELETE FROM annotations WHERE id = ?');
      const result = stmt.run(id);
      
      logger.info('Annotation deleted', { id, deleted: result.changes > 0 });
      return { success: true, deleted: result.changes > 0, changes: result.changes };
    } catch (error) {
      const formatted = formatAnnotationError(error);
      logger.error('Failed to delete annotation', { error: formatted, id });
      return { success: false, error: formatted };
    }
  });

  logger.info('Annotations handlers registered successfully');
}

module.exports = { registerAnnotationsHandlers };
