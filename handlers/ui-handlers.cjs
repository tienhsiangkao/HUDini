// handlers/ui-handlers.cjs
// IPC handlers for UI-related operations (HUD v3, widgets)

const { logger } = require('../lib/logger.cjs');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

const uiLogger = logger.child('UIHandlers');

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
      const userDataPath = app.getPath('userData');
      const configPath = path.join(userDataPath, 'widget-config.json');
      
      // Default configuration
      const defaultConfig = {
        widgets: [
          { id: 'net_usd', visible: true },
          { id: 'bb_100', visible: true },
          { id: 'rake', visible: true },
          { id: 'pre_rake', visible: true }
        ]
      };
      
      // Try to load saved config
      if (fs.existsSync(configPath)) {
        const fileContent = fs.readFileSync(configPath, 'utf8');
        const savedConfig = JSON.parse(fileContent);
        
        uiLogger.info('Loaded widget config from disk', { 
          widgetCount: savedConfig.widgets?.length || 0,
          path: configPath 
        });
        
        return { success: true, config: savedConfig };
      }
      
      // Return default config if no saved config exists
      uiLogger.info('Using default widget config', { 
        widgetCount: defaultConfig.widgets.length 
      });
      
      return { success: true, config: defaultConfig };
    } catch (err) {
      uiLogger.error('Failed to get widget config', { error: err.message });
      
      // Return default config on error
      return {
        success: false,
        error: err.message,
        config: {
          widgets: [
            { id: 'net_usd', visible: true },
            { id: 'bb_100', visible: true },
            { id: 'rake', visible: true },
            { id: 'pre_rake', visible: true }
          ]
        }
      };
    }
  });

  // Save widget configuration
  ipcMain.handle('widgets:saveConfig', async (_event, config) => {
    try {
      const userDataPath = app.getPath('userData');
      const configPath = path.join(userDataPath, 'widget-config.json');
      
      // Ensure directory exists
      if (!fs.existsSync(userDataPath)) {
        fs.mkdirSync(userDataPath, { recursive: true });
      }
      
      // Write config to disk
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
      
      uiLogger.info('Saved widget config to disk', { 
        widgetCount: config.widgets?.length || 0,
        path: configPath 
      });
      
      return { success: true };
    } catch (err) {
      uiLogger.error('Failed to save widget config', { error: err.message });
      return { success: false, error: err.message };
    }
  });

  uiLogger.info('UI handlers registered (HUD v3 + widgets)');
}

module.exports = { registerUIHandlers };
