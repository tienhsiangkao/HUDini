if (process?.env?.ELECTRON_RUN_AS_NODE) {
  delete process.env.ELECTRON_RUN_AS_NODE;
}
const electronModule = require('electron');
const { app, BrowserWindow, ipcMain, dialog } = electronModule;
const path = require('path');
const { pathToFileURL } = require('url');
const fs = require('fs');
const fsp = require('fs/promises');
const zlib = require('zlib');
const { createRequire } = require('module');
const Database = require('better-sqlite3');
const HUDOverlayV2 = require('./hud-overlay-v2.cjs');
const { HUDManager } = require('./lib/hud_manager.cjs');
const { namesEqual } = require('./lib/hand_utils.cjs');
const { computeHeroHandMetrics } = require('./lib/hero_metrics.cjs');
const { buildHeroGraphData } = require('./lib/hero_graph.cjs');
const { fetchUnifiedHandCounts } = require('./lib/hand_counts.cjs');
const { logger } = require('./lib/logger.cjs');

// Utility modules
const { 
  fetchHandsForMetrics, 
  computeHeroAggregatePercents, 
  fetchLatestHeroName,
  extractHandMetrics
} = require('./utils/metrics.cjs');
const { aggregateHandsForReports } = require('./utils/aggregators.cjs');
const {
  formatHexSample,
  isGzipBuffer,
  detectEncoding,
  decodeBuffer,
  normalisePreview,
  detectRoom
} = require('./utils/file-parsing.cjs');
const {
  inspectFile,
  scanFolder,
  loadParserModule
} = require('./utils/file-system.cjs');

// Handler modules
const { registerHandsHandlers } = require('./handlers/hands-handlers.cjs');
const { registerStatsHandlers } = require('./handlers/stats-handlers.cjs');
const { registerAnnotationsHandlers } = require('./handlers/annotations-handlers.cjs');
const { registerSessionsHandlers } = require('./handlers/sessions-handlers.cjs');
const { registerDbHandlers } = require('./handlers/db-handlers.cjs');
const { registerImportHandlers } = require('./handlers/import-handlers.cjs');
const { registerReportsHandlers } = require('./handlers/reports-handlers.cjs');
const { registerUIHandlers } = require('./handlers/ui-handlers.cjs');
let yauzl = null;
try {
  const requireFn = createRequire(__filename);
  yauzl = requireFn('yauzl');
} catch {}

// File watching state
const watchedFolders = new Map(); // folder path -> FSWatcher instance
const pendingImports = new Map(); // file path -> timeout ID
const IMPORT_DEBOUNCE_MS = 2000; // Wait 2s after file write before importing

// Bulk import state
const bulkImportState = {
  active: false,
  paused: false,
  cancelled: false,
  folders: [],
  currentIndex: 0,
  results: []
};

let win;
let hudOverlay;
let hudManager;
let db;
const TEXT_EXTENSIONS = new Set(['.txt', '.log', '.hh', '.dat', '.json', '.csv', '.gz', '.zip']);
const MAX_PREVIEW_CHARS = 200;
const MAX_FOLDER_SCAN_FILES = 2000;
let liveTrackerIntegrationSetup = false;
let parserModulePromise = null;

// Setup live tracker integration with auto-import
async function setupLiveTrackerIntegration() {
  if (liveTrackerIntegrationSetup || !hudManager) return;
  
  try {
    // Import db_import module dynamically
    const url = pathToFileURL(path.join(__dirname, 'db_import.js')).href;
    const dbImport = await import(url);
    
    // Create callback that routes actions to hudManager's live tracker
    const liveTrackerCallback = (method, ...args) => {
      if (!hudManager || !hudManager.liveTracker) return;
      
      try {
        switch (method) {
          case 'trackPreflopAction':
            const [tableId1, seat1, action1, amount1, isBlinds] = args;
            hudManager.liveTracker.trackPreflopAction(tableId1, seat1, action1, amount1, isBlinds);
            break;
          case 'trackPostflopAction':
            const [tableId2, seat2, street, action2, amount2] = args;
            hudManager.liveTracker.trackPostflopAction(tableId2, seat2, street, action2, amount2);
            break;
          case 'trackHandComplete':
            const [tableId3, seat3, showdown, won, netAmount] = args;
            hudManager.liveTracker.trackHandComplete(tableId3, seat3, showdown, won, netAmount);
            break;
        }
        
        // Trigger HUD update after action
        if (method === 'trackHandComplete') {
          setTimeout(() => {
            if (hudManager && hudManager.isActive) {
              hudManager.updateHUDWindow('main');
            }
          }, 100);
        }
      } catch (error) {
        console.error('[Live Tracker] Callback error:', error);
      }
    };
    
    // Register callback with db_import module
    if (dbImport.setLiveTrackerCallback) {
      dbImport.setLiveTrackerCallback(liveTrackerCallback);
      console.log('? Live tracker integration enabled');
      liveTrackerIntegrationSetup = true;
    }
  } catch (error) {
    console.error('? Failed to setup live tracker integration:', error);
  }
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 860,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}
function openDb() {
  const dbPath = path.join(__dirname, 'hands.db');
  const d = new Database(dbPath);
  d.pragma('journal_mode = WAL');
  d.exec(`
    CREATE TABLE IF NOT EXISTS hands (
      id        TEXT PRIMARY KEY,
      dateUTC   TEXT,
      tableName TEXT,
      sb        REAL,
      bb        REAL,
      hero      TEXT,
      json      TEXT NOT NULL,
      ts        INTEGER,
      heroNet   REAL  -- NEW: net result for Hero in USD (win minus invested)
    );
    CREATE INDEX IF NOT EXISTS idx_hands_ts    ON hands(ts);
    CREATE INDEX IF NOT EXISTS idx_hands_table ON hands(tableName);
  `);
  return d;
}

function rebuildPlayerStats() {
  // Rebuild player_stats table from hands
  try {
    const url = pathToFileURL(path.join(__dirname, 'db_build_stats.js')).href;
    import(url).then(module => {
      if (module.buildAllPlayerStats) {
        module.buildAllPlayerStats(db);
        logger.info('Player stats rebuilt successfully');
      }
    }).catch(err => {
      logger.error('Failed to rebuild player stats:', err);
    });
  } catch (err) {
    logger.error('Error importing db_build_stats:', err);
  }
}

function registerIpcHandlers() {
  logger.info('Registering IPC handlers');
  
  // Register modularized handlers
  registerHandsHandlers(ipcMain, db);
  registerStatsHandlers(ipcMain, db, __dirname);
  registerAnnotationsHandlers(ipcMain, db);
  registerSessionsHandlers(ipcMain, db);
  registerDbHandlers(ipcMain, db, __dirname);
  registerImportHandlers(ipcMain, db, __dirname, dialog, win, rebuildPlayerStats);
  registerReportsHandlers(ipcMain, db);
  registerUIHandlers(ipcMain, hudManager);
  
  logger.info('Modularized handlers registered successfully');
  
  // === NON-MODULAR UTILITY HANDLERS ===
  // File/Folder testing utilities
  ipcMain.handle('filetester:choose', async () => {
    const res = await dialog.showOpenDialog(win || BrowserWindow.getFocusedWindow(), {
      properties: ['openFile']
    });
    if (res.canceled) return null;
    return res.filePaths?.[0] || null;
  });
  ipcMain.handle('filetester:test', async (_event, filePath) => {
    if (!filePath) return { error: 'No file path provided' };
    try {
      return await inspectFile(filePath, { parseHands: true }, __dirname);
    } catch (err) {
      return { error: err?.message || String(err) };
    }
  });
  ipcMain.handle('foldertester:choose', async () => {
    const res = await dialog.showOpenDialog(win || BrowserWindow.getFocusedWindow(), {
      properties: ['openDirectory']
    });
    if (res.canceled) return null;
    return res.filePaths?.[0] || null;
  });
  ipcMain.handle('foldertester:scan', async (_event, dirPath) => {
    if (!dirPath) return { ok: false, error: 'No folder provided' };
    try {
      return await scanFolder(dirPath, {}, __dirname);
    } catch (err) {
      return { ok: false, error: err?.message || String(err) };
    }
  });

  // HUD Overlay IPC handlers
  ipcMain.handle('hud:start', async () => {
    try {
      console.log('HUD start requested');
      if (hudOverlay) {
        await hudOverlay.startHUD();
        console.log('HUD started successfully');
        return { success: true };
      }
      console.error('HUD overlay not initialized');
      return { success: false, error: 'HUD overlay not initialized' };
    } catch (error) {
      console.error('HUD start error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('hud:stop', async () => {
    try {
      if (hudOverlay) {
        hudOverlay.stopHUD();
        return { success: true };
      }
      return { success: false, error: 'HUD overlay not initialized' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('hud:toggle', async () => {
    try {
      console.log('HUD toggle requested');
      if (hudOverlay) {
        hudOverlay.toggleHUD();
        console.log('HUD toggled, active:', hudOverlay.isActive);
        return { success: true, active: hudOverlay.isActive };
      }
      console.error('HUD overlay not initialized');
      return { success: false, error: 'HUD overlay not initialized' };
    } catch (error) {
      console.error('HUD toggle error:', error);
      return { success: false, error: error.message };
    }
  });

ipcMain.handle('hud:status', async () => {
  try {
    if (hudOverlay) {
      return { 
        success: true, 
        active: hudOverlay.isActive,
        tables: hudOverlay.overlayWindows.size 
      };
    }
    return { success: false, error: 'HUD overlay not initialized' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.on('hud:insight', (_event, payload) => {
  try {
    if (hudOverlay && typeof hudOverlay.updateInsights === 'function') {
      hudOverlay.updateInsights(payload || null);
    }
  } catch (error) {
    console.error('HUD insight update failed:', error);
  }
});

// Snap to table handler
ipcMain.on('hud:snap-to-table', () => {
  try {
    if (hudOverlay) {
      hudOverlay.snapToTable();
    }
  } catch (error) {
    console.error('Error snapping to table:', error);
  }
});
}
app.whenReady().then(() => {
  db = openDb();
  
  // Initialize HUD systems
  hudOverlay = new HUDOverlayV2();
  hudManager = new HUDManager(db);
  
  // Setup live tracker integration
  setupLiveTrackerIntegration();
  
  registerIpcHandlers();
  createWindow();
  
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
