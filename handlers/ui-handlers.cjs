// handlers/ui-handlers.cjs
// IPC handlers for UI-related operations (HUD v3, widgets)

const { logger } = require('../lib/logger.cjs');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { app } = require('electron');

const uiLogger = logger.child('UIHandlers');

const DEFAULT_WIDGET_CONFIG = {
  widgets: [
    { id: 'net_usd', visible: true },
    { id: 'bb_100', visible: true },
    { id: 'rake', visible: true },
    { id: 'pre_rake', visible: true }
  ]
};

function getDefaultWidgetConfig() {
  return {
    widgets: DEFAULT_WIDGET_CONFIG.widgets.map(widget => ({ ...widget }))
  };
}

function resolveWidgetConfigPath() {
  const overridePath = process.env.HUD_WIDGET_CONFIG_PATH;
  if (overridePath) {
    const resolved = path.resolve(overridePath);
    return {
      baseDir: path.dirname(resolved),
      filePath: resolved
    };
  }

  if (app && typeof app.getPath === 'function') {
    const userDataPath = app.getPath('userData');
    return {
      baseDir: userDataPath,
      filePath: path.join(userDataPath, 'widget-config.json')
    };
  }

  if (process.env.VITEST) {
    const testPath = path.join(os.tmpdir(), 'test-widget-config.json');
    return {
      baseDir: path.dirname(testPath),
      filePath: testPath
    };
  }

  const fallbackDir = path.join(os.tmpdir(), `hudini-${process.pid}`);
  return {
    baseDir: fallbackDir,
    filePath: path.join(fallbackDir, 'widget-config.json')
  };
}

function registerUIHandlers(ipcMain, hudManager) {
  // Get HUD v3 status
  ipcMain.handle('hudv3:status', () => {
    try {
      const status = {
        isActive: hudManager?.isActive || false,
        hudWindowCount: hudManager?.hudWindows?.size || 0,
        useLiveTracking: hudManager?.useLiveTracking || false,
        useScreenScraping: hudManager?.useScreenScraping || false,
        useCalibratedScraper: hudManager?.useCalibratedScraper || false,
        useAdaptiveScraper: hudManager?.useAdaptiveScraper || false,
        screenScraping: hudManager?.getScreenScrapingStatus?.() || {
          enabled: false,
          active: false,
          trackedTables: [],
          ocrReady: false
        }
      };
      
      uiLogger.info('HUD v3 status requested', { 
        isActive: status.isActive, 
        windowCount: status.hudWindowCount 
      });
      
      return status;
    } catch (err) {
      uiLogger.error('Failed to get HUD v3 status', { error: err.message });
      return {
        isActive: false,
        hudWindowCount: 0,
        useLiveTracking: false,
        useScreenScraping: false,
        useCalibratedScraper: false,
        useAdaptiveScraper: false,
        screenScraping: { enabled: false, active: false, trackedTables: [], ocrReady: false },
        error: err.message
      };
    }
  });

  // Get widget configuration
  ipcMain.handle('widgets:getConfig', async () => {
    try {
      const { baseDir, filePath } = resolveWidgetConfigPath();
      
      // Try to load saved config
      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const savedConfig = JSON.parse(fileContent);
        const widgets = Array.isArray(savedConfig.widgets)
          ? savedConfig.widgets
          : getDefaultWidgetConfig().widgets;
        const config = { ...savedConfig, widgets };
        
        uiLogger.info('Loaded widget config from disk', { 
          widgetCount: config.widgets.length,
          path: filePath 
        });
        
        return { success: true, config };
      }
      
      uiLogger.info('Using default widget config', { 
        widgetCount: DEFAULT_WIDGET_CONFIG.widgets.length 
      });
      
      return { success: true, config: getDefaultWidgetConfig() };
    } catch (err) {
      uiLogger.error('Failed to get widget config', { error: err.message });
      
      return {
        success: false,
        error: err.message,
        config: getDefaultWidgetConfig()
      };
    }
  });

  // Save widget configuration
  ipcMain.handle('widgets:saveConfig', async (_event, config) => {
    try {
      if (!config || typeof config !== 'object') {
        return { success: false, error: 'config payload is required' };
      }

      const normalizedConfig = Array.isArray(config.widgets)
        ? { ...config, widgets: config.widgets.map(widget => ({ ...widget })) }
        : getDefaultWidgetConfig();

      const { baseDir, filePath } = resolveWidgetConfigPath();
      
      // Ensure directory exists
      if (!fs.existsSync(baseDir)) {
        fs.mkdirSync(baseDir, { recursive: true });
      }
      
      // Write config to disk
      fs.writeFileSync(filePath, JSON.stringify(normalizedConfig, null, 2), 'utf8');
      
      uiLogger.info('Saved widget config to disk', { 
        widgetCount: normalizedConfig.widgets?.length || 0,
        path: filePath 
      });
      
      return { success: true, message: 'Widget configuration saved', config: normalizedConfig };
    } catch (err) {
      uiLogger.error('Failed to save widget config', { error: err.message });
      return { success: false, error: err.message };
    }
  });

  uiLogger.info('UI handlers registered (HUD v3 + widgets)');
}

module.exports = { registerUIHandlers };
