/**
 * Import and Watch Folder Handlers
 * Handles hand history file imports, folder watching, and bulk import operations.
 * Supports bulk imports with progress tracking, folder watching with debouncing,
 * and automatic cache invalidation after imports.
 */

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const { pathToFileURL } = require('url');
const { BrowserWindow } = require('electron');
const { logger } = require('../lib/logger.cjs');
const { clearRangeCache } = require('./hands-handlers.cjs');
const { clearGraphCache } = require('../lib/hero_graph.cjs');

// File watching state
const watchedFolders = new Map(); // folder path -> FSWatcher instance
const pendingImports = new Map(); // file path -> timeout ID
const IMPORT_DEBOUNCE_MS = 2000; // Wait 2s after file write before importing
const TEXT_EXTENSIONS = new Set(['.txt', '.log', '.hh', '.dat', '.json', '.csv', '.gz', '.zip']);

// Bulk import state
const bulkImportState = {
  active: false,
  paused: false,
  cancelled: false,
  folders: [],
  currentIndex: 0,
  results: []
};

/**
 * Register all import and watch folder IPC handlers for bulk imports and file watching.
 * Provides endpoints for importing hand history files, watching folders for changes,
 * and managing import progress with pause/resume/cancel capabilities.
 * 
 * @param {Electron.IpcMain} ipcMain - Electron IPC main process interface
 * @param {Database} db - better-sqlite3 database instance
 * @param {string} dbPath - Absolute path to database file
 * @param {Electron.Dialog} dialog - Electron dialog module for file selection
 * @param {BrowserWindow} win - Main window reference for dialogs
 * @param {Function} rebuildPlayerStats - Function to rebuild player_stats table
 * 
 * @example
 * const { ipcMain, dialog, BrowserWindow } = require('electron');
 * const db = require('./lib/database.cjs');
 * const { rebuildPlayerStats } = require('./handlers/stats-handlers.cjs');
 * registerImportHandlers(ipcMain, db, dbPath, dialog, BrowserWindow.getAllWindows()[0], rebuildPlayerStats);
 * 
 * @description
 * Registered handlers:
 * - import:chooseFolders - Show folder selection dialog for bulk import
 * - import:start - Start bulk import from selected folders
 * - import:pause - Pause active import process
 * - import:resume - Resume paused import process
 * - import:cancel - Cancel active import and cleanup
 * - import:progress - Get current import progress and statistics
 * - import:watch:add - Add folder to watch list for automatic imports
 * - import:watch:remove - Remove folder from watch list
 * - import:watch:list - List all watched folders
 * - import:watch:removeAll - Remove all watched folders
 */
function registerImportHandlers(ipcMain, db, dbPath, dialog, win, rebuildPlayerStats) {
  logger.info('Registering import handlers');

  // Choose folders for import
  ipcMain.handle('import:chooseFolders', async () => {
    try {
      const res = await dialog.showOpenDialog(BrowserWindow.getFocusedWindow() || win, {
        properties: ['openDirectory', 'multiSelections']
      });
      if (res.canceled) return [];
      return res.filePaths || [];
    } catch (error) {
      logger.error('import:chooseFolders error:', error);
      return [];
    }
  });

  // Start import from folders
  ipcMain.handle('import:start', async (e, folders, opts = {}) => {
    try {
      logger.info(`Starting import from ${folders.length} folder(s)`);
      
      const url = pathToFileURL(path.join(__dirname, '..', 'db_import.js')).href;
      const mod = await import(url);
      
      const onProgress = (payload) => {
        const w = win || BrowserWindow.getFocusedWindow();
        if (!w) return;
        
        if (typeof payload === 'string') {
          w.webContents.send('import:progress', { line: payload });
          return;
        }
        
        if (payload && typeof payload === 'object') {
          const detail = { ...payload };
          if (detail.line == null && payload.message != null) {
            detail.line = String(payload.message);
          }
          w.webContents.send('import:progress', detail);
          return;
        }
        
        w.webContents.send('import:progress', { line: String(payload ?? '') });
      };
      
      const res = await mod.runImport(folders, onProgress, { ...opts, db });
      logger.info(`Import complete: ${res?.totalHands || 0} hands processed`);
      
      // Invalidate caches after import
      clearRangeCache();
      clearGraphCache();
      
      const targetWin = win || BrowserWindow.getFocusedWindow();
      let statsRes = null;
      
      try {
        if (targetWin) {
          targetWin.webContents.send('import:progress', { line: 'Rebuilding player stats...' });
        }
        
        statsRes = await rebuildPlayerStats();
        const playersStr = (statsRes && typeof statsRes.players === 'number') ? statsRes.players : '?';
        const handsStr = (statsRes && typeof statsRes.hands === 'number') ? statsRes.hands : '?';
        
        if (targetWin) {
          targetWin.webContents.send('import:progress', { 
            line: `Player stats rebuilt (${playersStr} players / ${handsStr} hands)` 
          });
        }
        
        logger.info(`Player stats rebuilt: ${playersStr} players, ${handsStr} hands`);
      } catch (statsErr) {
        logger.error('Stats rebuild error:', statsErr);
        if (targetWin) {
          targetWin.webContents.send('import:progress', { 
            line: `[ERR] stats rebuild: ${statsErr?.message || statsErr}` 
          });
        }
      }
      
      if (targetWin) {
        targetWin.webContents.send('import:done', { ok: true, code: 0, stats: statsRes });
      }
      
      return { ok: true, ...res, code: 0, stats: statsRes };
    } catch (err) {
      logger.error('import:start error:', err);
      const w = win || BrowserWindow.getFocusedWindow();
      if (w) {
        w.webContents.send('import:progress', { line: `[ERR] ${err?.message || err}` });
        w.webContents.send('import:done', { ok: false, code: 1 });
      }
      return { ok: false, code: 1, error: String(err) };
    }
  });

  // Add folder to watch list for auto-import
  ipcMain.handle('watch:addFolder', async (e, folderPath) => {
    try {
      logger.info(`Adding watch folder: ${folderPath}`);
      
      // Validate folder exists
      const stats = await fsp.stat(folderPath);
      if (!stats.isDirectory()) {
        return { success: false, error: 'Path is not a directory' };
      }

      // Already watching?
      if (watchedFolders.has(folderPath)) {
        return { success: true, message: 'Already watching this folder' };
      }

      // Create watcher
      const watcher = fs.watch(folderPath, { recursive: true }, (eventType, filename) => {
        if (!filename) return;
        
        const fullPath = path.join(folderPath, filename);
        const ext = path.extname(filename).toLowerCase();
        
        // Only watch text-based hand history files
        if (!TEXT_EXTENSIONS.has(ext)) return;
        
        // Debounce: wait for file writes to complete
        if (pendingImports.has(fullPath)) {
          clearTimeout(pendingImports.get(fullPath));
        }
        
        const timeoutId = setTimeout(async () => {
          pendingImports.delete(fullPath);
          
          try {
            // Verify file exists and is readable
            const fileStats = await fsp.stat(fullPath);
            if (!fileStats.isFile()) return;
            
            // Trigger auto-import
            const targetWin = win || BrowserWindow.getFocusedWindow();
            if (targetWin) {
              targetWin.webContents.send('watch:newFile', { 
                path: fullPath, 
                folder: folderPath,
                filename: filename
              });
            }
            
            // Auto-import the single file
            logger.info(`Auto-importing file: ${filename}`);
            
            // Call import with the specific file
            const url = pathToFileURL(path.join(__dirname, '..', 'db_import.js')).href;
            const mod = await import(url);
            
            const onProgress = (payload) => {
              if (!targetWin) return;
              if (typeof payload === 'string') {
                targetWin.webContents.send('import:progress', { line: payload });
              }
            };
            
            const res = await mod.runImport([folderPath], onProgress, { db, autoImport: true });
            
            if (targetWin) {
              targetWin.webContents.send('watch:imported', {
                success: true,
                filename: filename,
                folder: folderPath,
                handsImported: res?.totalHands || 0
              });
            }
            
            logger.info(`Auto-imported: ${filename} (${res?.totalHands || 0} hands)`);
          } catch (err) {
            logger.error('Auto-import error:', err);
            const targetWin = win || BrowserWindow.getFocusedWindow();
            if (targetWin) {
              targetWin.webContents.send('watch:imported', {
                success: false,
                filename: filename,
                error: err.message
              });
            }
          }
        }, IMPORT_DEBOUNCE_MS);
        
        pendingImports.set(fullPath, timeoutId);
      });

      watcher.on('error', (err) => {
        logger.error(`Watch error for ${folderPath}:`, err);
        watchedFolders.delete(folderPath);
      });

      watchedFolders.set(folderPath, watcher);
      logger.info(`Watching folder: ${folderPath}`);
      
      return { success: true, folder: folderPath };
    } catch (err) {
      logger.error('watch:addFolder error:', err);
      return { success: false, error: err.message };
    }
  });

  // Remove folder from watch list
  ipcMain.handle('watch:removeFolder', async (e, folderPath) => {
    try {
      const watcher = watchedFolders.get(folderPath);
      if (watcher) {
        watcher.close();
        watchedFolders.delete(folderPath);
        
        // Clear any pending imports for this folder
        for (const [filePath, timeoutId] of pendingImports.entries()) {
          if (filePath.startsWith(folderPath)) {
            clearTimeout(timeoutId);
            pendingImports.delete(filePath);
          }
        }
        
        logger.info(`Stopped watching: ${folderPath}`);
        return { success: true, folder: folderPath };
      }
      return { success: false, error: 'Folder not being watched' };
    } catch (err) {
      logger.error('watch:removeFolder error:', err);
      return { success: false, error: err.message };
    }
  });

  // Get list of watched folders
  ipcMain.handle('watch:getWatchedFolders', async () => {
    try {
      return { 
        success: true, 
        folders: Array.from(watchedFolders.keys())
      };
    } catch (err) {
      logger.error('watch:getWatchedFolders error:', err);
      return { success: false, folders: [], error: err.message };
    }
  });

  // Stop watching all folders
  ipcMain.handle('watch:stopAll', async () => {
    try {
      for (const [folderPath, watcher] of watchedFolders.entries()) {
        watcher.close();
        logger.info(`Stopped watching: ${folderPath}`);
      }
      watchedFolders.clear();
      
      // Clear all pending imports
      for (const timeoutId of pendingImports.values()) {
        clearTimeout(timeoutId);
      }
      pendingImports.clear();
      
      logger.info('Stopped all folder watches');
      return { success: true };
    } catch (err) {
      logger.error('watch:stopAll error:', err);
      return { success: false, error: err.message };
    }
  });

  // Start bulk import from multiple folders
  ipcMain.handle('bulkImport:start', async (e, folders) => {
    try {
      if (bulkImportState.active) {
        return { success: false, error: 'Bulk import already in progress' };
      }

      logger.info(`Starting bulk import: ${folders.length} folders`);

      // Reset state
      bulkImportState.active = true;
      bulkImportState.paused = false;
      bulkImportState.cancelled = false;
      bulkImportState.folders = folders;
      bulkImportState.currentIndex = 0;
      bulkImportState.results = [];

      const targetWin = win || BrowserWindow.getFocusedWindow();
      
      // Send start event
      if (targetWin) {
        targetWin.webContents.send('bulkImport:started', {
          totalFolders: folders.length,
          folders: folders
        });
      }

      // Import folders sequentially
      for (let i = 0; i < folders.length; i++) {
        // Check if cancelled
        if (bulkImportState.cancelled) {
          bulkImportState.active = false;
          logger.info(`Bulk import cancelled at folder ${i}/${folders.length}`);
          if (targetWin) {
            targetWin.webContents.send('bulkImport:cancelled', {
              completed: i,
              total: folders.length,
              results: bulkImportState.results
            });
          }
          return { success: false, cancelled: true, results: bulkImportState.results };
        }

        // Check if paused
        while (bulkImportState.paused && !bulkImportState.cancelled) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        const folder = folders[i];
        bulkImportState.currentIndex = i;

        // Send folder progress
        if (targetWin) {
          targetWin.webContents.send('bulkImport:folderStart', {
            folder: folder,
            index: i,
            total: folders.length
          });
        }

        try {
          // Import single folder
          const url = pathToFileURL(path.join(__dirname, '..', 'db_import.js')).href;
          const mod = await import(url);
          
          const onProgress = (payload) => {
            if (!targetWin) return;
            if (typeof payload === 'string') {
              targetWin.webContents.send('bulkImport:progress', { 
                folder: folder,
                index: i,
                line: payload 
              });
            }
          };
          
          const res = await mod.runImport([folder], onProgress, { db });
          
          // Store result
          bulkImportState.results.push({
            folder: folder,
            success: true,
            handsImported: res?.totalHands || 0,
            filesProcessed: res?.filesProcessed || 0
          });

          logger.info(`Bulk import folder ${i+1}/${folders.length}: ${res?.totalHands || 0} hands`);

          // Send folder complete
          if (targetWin) {
            targetWin.webContents.send('bulkImport:folderComplete', {
              folder: folder,
              index: i,
              total: folders.length,
              success: true,
              handsImported: res?.totalHands || 0,
              filesProcessed: res?.filesProcessed || 0
            });
          }
        } catch (err) {
          logger.error(`Bulk import folder ${i+1} error:`, err);
          
          // Store error result
          bulkImportState.results.push({
            folder: folder,
            success: false,
            error: err.message
          });

          // Send folder error
          if (targetWin) {
            targetWin.webContents.send('bulkImport:folderComplete', {
              folder: folder,
              index: i,
              total: folders.length,
              success: false,
              error: err.message
            });
          }
        }
      }

      // Rebuild player stats once at the end
      if (targetWin) {
        targetWin.webContents.send('bulkImport:progress', { 
          line: 'Rebuilding player stats...' 
        });
      }

      let statsRes = null;
      try {
        statsRes = await rebuildPlayerStats();
        const playersStr = (statsRes && typeof statsRes.players === 'number') ? statsRes.players : '?';
        const handsStr = (statsRes && typeof statsRes.hands === 'number') ? statsRes.hands : '?';
        if (targetWin) {
          targetWin.webContents.send('bulkImport:progress', { 
            line: `Player stats rebuilt (${playersStr} players / ${handsStr} hands)` 
          });
        }
        logger.info(`Bulk import stats rebuilt: ${playersStr} players, ${handsStr} hands`);
      } catch (statsErr) {
        logger.error('Bulk import stats rebuild error:', statsErr);
        if (targetWin) {
          targetWin.webContents.send('bulkImport:progress', { 
            line: `[ERR] stats rebuild: ${statsErr?.message || statsErr}` 
          });
        }
      }

      // Mark as complete
      bulkImportState.active = false;
      logger.info('Bulk import complete');
      
      // Invalidate caches after bulk import
      clearRangeCache();
      clearGraphCache();
      
      // Send complete event
      if (targetWin) {
        targetWin.webContents.send('bulkImport:complete', {
          success: true,
          results: bulkImportState.results,
          stats: statsRes
        });
      }

      return { 
        success: true, 
        results: bulkImportState.results,
        stats: statsRes
      };
    } catch (err) {
      logger.error('bulkImport:start error:', err);
      bulkImportState.active = false;
      const targetWin = win || BrowserWindow.getFocusedWindow();
      if (targetWin) {
        targetWin.webContents.send('bulkImport:complete', {
          success: false,
          error: err.message
        });
      }
      return { success: false, error: err.message };
    }
  });

  // Pause bulk import
  ipcMain.handle('bulkImport:pause', async () => {
    if (!bulkImportState.active) {
      return { success: false, error: 'No bulk import in progress' };
    }
    bulkImportState.paused = true;
    logger.info('Bulk import paused');
    const targetWin = win || BrowserWindow.getFocusedWindow();
    if (targetWin) {
      targetWin.webContents.send('bulkImport:paused', {
        currentIndex: bulkImportState.currentIndex,
        total: bulkImportState.folders.length
      });
    }
    return { success: true };
  });

  // Resume bulk import
  ipcMain.handle('bulkImport:resume', async () => {
    if (!bulkImportState.active) {
      return { success: false, error: 'No bulk import in progress' };
    }
    bulkImportState.paused = false;
    logger.info('Bulk import resumed');
    const targetWin = win || BrowserWindow.getFocusedWindow();
    if (targetWin) {
      targetWin.webContents.send('bulkImport:resumed', {
        currentIndex: bulkImportState.currentIndex,
        total: bulkImportState.folders.length
      });
    }
    return { success: true };
  });

  // Cancel bulk import
  ipcMain.handle('bulkImport:cancel', async () => {
    if (!bulkImportState.active) {
      return { success: false, error: 'No bulk import in progress' };
    }
    bulkImportState.cancelled = true;
    logger.info('Bulk import cancelled');
    return { success: true };
  });

  // Get bulk import state
  ipcMain.handle('bulkImport:getState', async () => {
    return {
      active: bulkImportState.active,
      paused: bulkImportState.paused,
      cancelled: bulkImportState.cancelled,
      currentIndex: bulkImportState.currentIndex,
      totalFolders: bulkImportState.folders.length,
      results: bulkImportState.results
    };
  });

  logger.info('Import handlers registered successfully');
}

module.exports = { registerImportHandlers };
