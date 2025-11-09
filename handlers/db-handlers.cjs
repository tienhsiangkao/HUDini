// handlers/db-handlers.cjs
// Database management IPC handlers (backup, restore, clear, counts)

const { logger } = require('../lib/logger.cjs');
const { BrowserWindow, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

/**
 * Get counts of hands and players from database tables.
 * 
 * @param {Database} db - better-sqlite3 database instance
 * @returns {object} Counts object with {hands, players}
 * @private
 */
function getDbCounts(db) {
  try {
    const hands = db.prepare('SELECT COUNT(*) as count FROM hands').get()?.count || 0;
    const players = db.prepare('SELECT COUNT(*) as count FROM player_stats').get()?.count || 0;
    return { hands, players };
  } catch (err) {
    logger.error('Failed to get DB counts', { error: err.message });
    return { hands: 0, players: 0 };
  }
}

/**
 * Clear all data from whitelisted database tables (hands, player_stats, annotations).
 * 
 * @param {Database} db - better-sqlite3 database instance
 * @returns {boolean} True if successful
 * @throws {Error} If any table deletion fails
 * @private
 */
function clearDatabaseTables(db) {
  try {
    // Whitelist of tables that can be cleared
    const ALLOWED_TABLES = new Set(['hands', 'player_stats', 'annotations']);
    const clearedTables = [];
    
    for (const tableName of ALLOWED_TABLES) {
      try {
        const stmt = db.prepare(`DELETE FROM ${tableName}`);
        const result = stmt.run();
        clearedTables.push({ table: tableName, rowsDeleted: result.changes });
        logger.info('Cleared table', { table: tableName, rows: result.changes });
      } catch (err) {
        logger.warn('Failed to clear table', { table: tableName, error: err.message });
      }
    }
    
    // Vacuum to reclaim space
    try {
      db.prepare('VACUUM').run();
      logger.info('Database vacuumed');
    } catch (err) {
      logger.warn('Failed to vacuum database', { error: err.message });
    }
    
    return clearedTables;
  } catch (err) {
    logger.error('Failed to clear database tables', { error: err.message });
    throw err;
  }
}

/**
 * Rebuild player statistics by importing and executing db_build_stats.js module.
 * 
 * @param {Database} db - better-sqlite3 database instance
 * @param {string} __dirname - Directory path for finding db_build_stats.js
 * @returns {Promise<object>} Rebuild result with {ok, players, hands, counts}
 * @throws {Error} If buildStats module not found or rebuild fails
 * @private
 */
async function rebuildPlayerStats(db, __dirname) {
  try {
    const { pathToFileURL } = require('url');
    const url = pathToFileURL(path.join(__dirname, 'db_build_stats.js')).href;
    const mod = await import(url);
    
    if (typeof mod.buildStats !== 'function') {
      throw new Error('buildStats() not exported');
    }
    if (!db) {
      throw new Error('database not initialized');
    }
    
    const res = await mod.buildStats({ db });
    if (!res || res.ok !== true) {
      throw new Error(res?.error || 'player stats rebuild failed');
    }
    
    return { ...res, counts: getDbCounts(db) };
  } catch (err) {
    logger.error('Failed to rebuild player stats', { error: err.message });
    throw err;
  }
}

/**
 * Register all database management IPC handlers for backup, restore, clear, and statistics.
 * Provides endpoints for database maintenance and administrative operations.
 * 
 * @param {Electron.IpcMain} ipcMain - Electron IPC main process interface
 * @param {Database} db - better-sqlite3 database instance
 * @param {string} __dirname - Directory path for file operations
 * 
 * @example
 * const { ipcMain } = require('electron');
 * const db = require('./lib/database.cjs');
 * registerDbHandlers(ipcMain, db, __dirname);
 * 
 * @description
 * Registered handlers:
 * - db:counts - Get counts of hands and players in database
 * - db:getInfo - Get database metadata (path, size, counts)
 * - db:export - Export database to file with save dialog
 * - db:compact - Vacuum database to reclaim space
 * - db:clear - Clear all data from specified tables
 * - db:rebuild - Rebuild player_stats table from hands
 */
function registerDbHandlers(ipcMain, db, __dirname) {
  logger.info('Registering database handlers');

  // db:counts - Get database counts
  ipcMain.handle('db:counts', () => {
    try {
      return getDbCounts(db);
    } catch (err) {
      logger.error('Failed to get database counts', { error: err.message });
      return { hands: 0, players: 0 };
    }
  });

  // db:backup - Backup database to file
  ipcMain.handle('db:backup', async () => {
    try {
      // Get database stats
      const countStmt = db.prepare('SELECT COUNT(*) as count FROM hands');
      const countRow = countStmt.get();
      const handCount = countRow?.count || 0;
      
      const dbPath = path.join(__dirname, 'hands.db');
      const stats = fs.statSync(dbPath);
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const defaultFilename = `poker_backup_${timestamp}.db`;
      
      // Show save dialog
      const result = await dialog.showSaveDialog(BrowserWindow.getFocusedWindow(), {
        title: 'Backup Database',
        defaultPath: defaultFilename,
        filters: [
          { name: 'Database Files', extensions: ['db'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        message: `Backup ${handCount.toLocaleString()} hands (${sizeMB} MB)`
      });
      
      if (result.canceled || !result.filePath) {
        return { success: false, message: 'Backup cancelled' };
      }
      
      // Create backup by copying database file
      fs.copyFileSync(dbPath, result.filePath);
      
      logger.info('Database backed up', { path: result.filePath, hands: handCount, sizeMB });
      return { 
        success: true, 
        filePath: result.filePath,
        handCount,
        sizeMB: parseFloat(sizeMB)
      };
    } catch (error) {
      logger.error('Failed to backup database', { error: error.message });
      return { success: false, message: error.message };
    }
  });
  
  // db:restore - Restore database from backup file
  ipcMain.handle('db:restore', async () => {
    try {
      // Show open dialog
      const result = await dialog.showOpenDialog(BrowserWindow.getFocusedWindow(), {
        title: 'Restore Database',
        filters: [
          { name: 'Database Files', extensions: ['db'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['openFile']
      });
      
      if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
        return { success: false, message: 'Restore cancelled' };
      }
      
      const backupPath = result.filePaths[0];
      
      // Validate backup file
      let backupDb;
      try {
        backupDb = new Database(backupPath, { readonly: true });
        const countStmt = backupDb.prepare('SELECT COUNT(*) as count FROM hands');
        const countRow = countStmt.get();
        const handCount = countRow?.count || 0;
        backupDb.close();
        
        // Confirm restore
        const { response } = await dialog.showMessageBox(BrowserWindow.getFocusedWindow(), {
          type: 'warning',
          title: 'Confirm Restore',
          message: `Restore database from backup?`,
          detail: `This will replace your current database with the backup containing ${handCount.toLocaleString()} hands.\n\nThis action cannot be undone. Consider creating a backup first.`,
          buttons: ['Cancel', 'Restore'],
          defaultId: 0,
          cancelId: 0
        });
        
        if (response !== 1) {
          return { success: false, message: 'Restore cancelled by user' };
        }
        
        // Close current database
        db.close();
        
        // Replace database file
        const dbPath = path.join(__dirname, 'hands.db');
        fs.copyFileSync(backupPath, dbPath);
        
        // Reopen database
        const newDb = new Database(dbPath);
        newDb.pragma('journal_mode = WAL');
        
        // Update global db reference
        Object.assign(db, newDb);
        
        logger.info('Database restored', { hands: handCount });
        return { 
          success: true, 
          handCount,
          message: `Database restored with ${handCount.toLocaleString()} hands`
        };
      } catch (error) {
        if (backupDb) backupDb.close();
        throw error;
      }
    } catch (error) {
      logger.error('Failed to restore database', { error: error.message });
      return { success: false, message: error.message };
    }
  });

  // db:clear - Clear all data from database
  ipcMain.handle('db:clear', async () => {
    try {
      logger.warn('Clearing database tables');
      const cleared = clearDatabaseTables(db);
      
      let statsRes = null;
      try {
        statsRes = await rebuildPlayerStats(db, __dirname);
      } catch (err) {
        logger.error('Failed to rebuild player stats after clear', { error: err.message });
      }
      
      const counts = getDbCounts(db);
      logger.info('Database cleared', { counts });
      
      return { success: true, cleared, stats: statsRes, counts };
    } catch (error) {
      logger.error('Failed to clear database', { error: error?.message || String(error) });
      return { success: false, error: error?.message || String(error) };
    }
  });

  logger.info('Database handlers registered successfully');
}

module.exports = { registerDbHandlers };
