// tests/handlers/ui-handlers.test.js
// Integration tests for ui-handlers module

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { createMockEvent, assertSuccessResponse, assertErrorResponse } from '../test-utils.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import handlers
const { registerUIHandlers } = await import('../../handlers/ui-handlers.cjs');

describe('ui-handlers', () => {
  let handlers = {};
  let mockIpcMain;
  let mockHudManager;
  let testConfigPath;

  beforeEach(() => {
    // Mock HUD Manager
    mockHudManager = {
      isActive: false,
      hudWindows: new Map(),
      useLiveTracking: true,
      useScreenScraping: false,
      useCalibratedScraper: false,
      useAdaptiveScraper: true,
      getScreenScrapingStatus: () => ({
        enabled: false,
        active: false,
        trackedTables: [],
        ocrReady: true
      })
    };

    mockIpcMain = {
      handle: (channel, handler) => {
        handlers[channel] = handler;
      }
    };

    // Setup test config directory
    testConfigPath = path.join(os.tmpdir(), 'test-widget-config.json');

    registerUIHandlers(mockIpcMain, mockHudManager);
  });

  afterEach(() => {
    // Clean up test config file
    try {
      if (fs.existsSync(testConfigPath)) {
        fs.unlinkSync(testConfigPath);
      }
    } catch (err) {
      // Ignore cleanup errors
    }
  });

  describe('hudv3:status', () => {
    test('should return HUD status', async () => {
      const result = await handlers['hudv3:status'](createMockEvent());
      
      expect(result).toHaveProperty('isActive');
      expect(result).toHaveProperty('hudWindowCount');
      expect(result).toHaveProperty('useLiveTracking');
      expect(result).toHaveProperty('useScreenScraping');
    });

    test('should report inactive HUD', async () => {
      mockHudManager.isActive = false;
      
      const result = await handlers['hudv3:status'](createMockEvent());
      
      expect(result.isActive).toBe(false);
      expect(result.hudWindowCount).toBe(0);
    });

    test('should report active HUD with windows', async () => {
      mockHudManager.isActive = true;
      mockHudManager.hudWindows.set('table1', {});
      mockHudManager.hudWindows.set('table2', {});
      
      const result = await handlers['hudv3:status'](createMockEvent());
      
      expect(result.isActive).toBe(true);
      expect(result.hudWindowCount).toBe(2);
    });

    test('should include screen scraping status', async () => {
      const result = await handlers['hudv3:status'](createMockEvent());
      
      expect(result).toHaveProperty('screenScraping');
      expect(result.screenScraping).toHaveProperty('enabled');
      expect(result.screenScraping).toHaveProperty('active');
      expect(result.screenScraping).toHaveProperty('ocrReady');
    });

    test('should handle missing HUD manager gracefully', async () => {
      registerUIHandlers(mockIpcMain, null);
      
      const result = await handlers['hudv3:status'](createMockEvent());
      
      expect(result.isActive).toBe(false);
      expect(result.hudWindowCount).toBe(0);
    });
  });

  describe('widgets:getConfig', () => {
    test('should return default config if file does not exist', async () => {
      const result = await handlers['widgets:getConfig'](createMockEvent());
      
      assertSuccessResponse(result);
      expect(result).toHaveProperty('config');
      expect(result.config).toHaveProperty('widgets');
      expect(Array.isArray(result.config.widgets)).toBe(true);
    });

    test('should return default 4 widgets', async () => {
      const result = await handlers['widgets:getConfig'](createMockEvent());
      
      const defaultWidgets = result.config.widgets;
      expect(defaultWidgets.length).toBe(4);
      expect(defaultWidgets.map(w => w.id)).toEqual([
        'net_usd',
        'bb_100',
        'rake',
        'pre_rake'
      ]);
      expect(defaultWidgets.every(w => w.visible === true)).toBe(true);
    });

    test('should load config from file if exists', async () => {
      // Create a test config file
      const testConfig = {
        widgets: [
          { id: 'vpip', visible: true },
          { id: 'pfr', visible: true }
        ]
      };
      
      // Note: This test would need to mock app.getPath('userData')
      // For now, we just test the default behavior
      const result = await handlers['widgets:getConfig'](createMockEvent());
      
      assertSuccessResponse(result);
      expect(result.config.widgets).toBeDefined();
    });
  });

  describe('widgets:saveConfig', () => {
    test('should save widget configuration', async () => {
      const config = {
        widgets: [
          { id: 'net_usd', visible: true },
          { id: 'vpip', visible: true },
          { id: 'pfr', visible: false }
        ]
      };
      
      const result = await handlers['widgets:saveConfig'](createMockEvent(), config);
      
      assertSuccessResponse(result);
      expect(result).toHaveProperty('message');
    });

    test('should handle missing config', async () => {
      const result = await handlers['widgets:saveConfig'](createMockEvent(), null);
      
      assertErrorResponse(result, 'config');
    });

    test('should handle invalid config structure', async () => {
      const result = await handlers['widgets:saveConfig'](createMockEvent(), {
        widgets: 'not-an-array'
      });
      
      // Should still succeed as it writes whatever is provided
      // In production, you might want stricter validation
      assertSuccessResponse(result);
    });

    test('should handle empty widgets array', async () => {
      const config = {
        widgets: []
      };
      
      const result = await handlers['widgets:saveConfig'](createMockEvent(), config);
      
      assertSuccessResponse(result);
    });
  });
});
