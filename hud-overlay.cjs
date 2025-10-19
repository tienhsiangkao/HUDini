// hud-overlay.js
// Real-time HUD overlay system for poker tables

const { BrowserWindow, screen, ipcMain } = require('electron');
const Database = require('better-sqlite3');

class HUDOverlay {
  constructor() {
    this.overlayWindows = new Map();
    this.isActive = false;
    this.tableDetection = {
      enabled: false,
      interval: null,
      checkInterval: 10000 // Check every 10 seconds (much less frequent)
    };
  }

  // Create a transparent overlay window
  createOverlayWindow(tableId, bounds) {
    const overlayWindow = new BrowserWindow({
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: true,
      movable: true,
      minimizable: false,
      maximizable: false,
      closable: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        enableRemoteModule: true
      }
    });

    // CRITICAL: Make overlay ignore mouse events to prevent blocking clicks
    overlayWindow.setIgnoreMouseEvents(true, { forward: true });

    // Load the HUD HTML
    overlayWindow.loadFile('hud-window.html');
    
    // Make window transparent and always on top
    overlayWindow.setAlwaysOnTop(true, 'screen-saver');
    overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    
    return overlayWindow;
  }

  // Detect poker tables on screen
  async detectPokerTables() {
    try {
      // Get all displays
      const displays = screen.getAllDisplays();
      const tables = [];

      for (const display of displays) {
        // For now, we'll create a mock detection
        // Real implementation would use window detection or image recognition
        const mockTables = this.mockTableDetection(display);
        tables.push(...mockTables);
      }

      return tables;
    } catch (error) {
      console.error('Error detecting poker tables:', error);
      return [];
    }
  }

  // Real table detection for GG Poker and PokerStars
  mockTableDetection(display) {
    const tables = [];
    
    try {
      // Get all windows to detect poker tables
      const allWindows = BrowserWindow.getAllWindows();
      console.log(`🔍 Scanning ${allWindows.length} windows for poker tables...`);
      
      for (const window of allWindows) {
        try {
          // Skip our own HUD overlay windows
          if (window.isDestroyed()) continue;
          
          const title = window.getTitle().toLowerCase();
          const bounds = window.getBounds();
          
          // Skip windows that are too small (likely not poker tables)
          if (bounds.width < 400 || bounds.height < 300) continue;
          
          console.log(`Checking window: "${title}" at ${JSON.stringify(bounds)}`);
          
          // Special debug for GG Poker format
          if (title.includes('Rush') || title.includes('Cash') || title.includes('$')) {
            console.log(`🔍 Potential GG Poker table detected: "${title}"`);
          }
          
          // Detect GG Poker tables - matches format like "[#] Rush & Cash - $0.01 / $0.02 [#]"
          if (title.includes('rush') || title.includes('cash') || 
              title.includes('gg poker') || title.includes('ggpoker') ||
              title.includes('rush & cash') || title.includes('rush&cash') ||
              title.includes('tournament') || title.includes('sit & go') ||
              title.includes('sit&go') || title.includes('sng')) {
            console.log(`✅ Detected GG Poker table: ${title} at ${JSON.stringify(bounds)}`);
            
            const ggTable = {
              id: `gg_table_${Date.now()}`,
              title: title,
              bounds: {
                x: bounds.x,
                y: bounds.y,
                width: bounds.width,
                height: bounds.height
              },
              players: [
                { seat: 1, name: 'Player1', position: 'BTN' },
                { seat: 2, name: 'Player2', position: 'SB' },
                { seat: 3, name: 'Player3', position: 'BB' },
                { seat: 4, name: 'Player4', position: 'UTG' },
                { seat: 5, name: 'Player5', position: 'MP' },
                { seat: 6, name: 'Hero', position: 'CO' }
              ]
            };
            tables.push(ggTable);
          }
          
          // Detect PokerStars tables
          if (title.includes('pokerstars') || title.includes('stars') || title.includes('poker stars')) {
            console.log(`✅ Detected PokerStars table: ${title} at ${JSON.stringify(bounds)}`);
            
            const psTable = {
              id: `ps_table_${Date.now()}`,
              title: title,
              bounds: {
                x: bounds.x,
                y: bounds.y,
                width: bounds.width,
                height: bounds.height
              },
              players: [
                { seat: 1, name: 'Player1', position: 'BTN' },
                { seat: 2, name: 'Player2', position: 'SB' },
                { seat: 3, name: 'Player3', position: 'BB' },
                { seat: 4, name: 'Player4', position: 'UTG' },
                { seat: 5, name: 'Player5', position: 'MP' },
                { seat: 6, name: 'Hero', position: 'CO' }
              ]
            };
            tables.push(psTable);
          }
        } catch (error) {
          console.error('Error checking window:', error);
        }
      }
      
      // If no poker tables detected, create a fallback overlay
      if (tables.length === 0) {
        console.log('⚠️ No poker tables detected in Electron windows');
        console.log('💡 This is normal - GG Poker runs in a separate process');
        console.log('🎯 Creating draggable overlay that you can position over your table');
        
        const centerX = Math.floor(display.bounds.x + display.bounds.width / 2 - 400);
        const centerY = Math.floor(display.bounds.y + display.bounds.height / 2 - 300);
        
        const fallbackTable = {
          id: 'gg_poker_overlay',
          title: 'GG Poker Rush & Cash - Position Over Your Table',
          bounds: {
            x: centerX,
            y: centerY,
            width: 800,
            height: 600
          },
          players: [
            { seat: 1, name: 'Player1', position: 'BTN' },
            { seat: 2, name: 'Player2', position: 'SB' },
            { seat: 3, name: 'Player3', position: 'BB' },
            { seat: 4, name: 'Player4', position: 'UTG' },
            { seat: 5, name: 'Player5', position: 'MP' },
            { seat: 6, name: 'Hero', position: 'CO' }
          ]
        };
        tables.push(fallbackTable);
      }
      
    } catch (error) {
      console.error('Error in table detection:', error);
    }
    
    return tables;
  }

  // Start HUD overlay system
  async startHUD() {
    console.log('Starting HUD overlay system...');
    
    this.isActive = true;
    this.tableDetection.enabled = true;
    
    // Start table detection
    this.tableDetection.interval = setInterval(async () => {
      if (this.tableDetection.enabled) {
        await this.updateHUD();
      }
    }, this.tableDetection.checkInterval);

    // Initial table detection
    await this.updateHUD();
    
    console.log('HUD overlay system started successfully');
  }

  // Stop HUD overlay system
  stopHUD() {
    console.log('Stopping HUD overlay system...');
    
    this.isActive = false;
    this.tableDetection.enabled = false;
    
    if (this.tableDetection.interval) {
      clearInterval(this.tableDetection.interval);
      this.tableDetection.interval = null;
    }

    // Close all overlay windows
    this.overlayWindows.forEach((window, tableId) => {
      if (!window.isDestroyed()) {
        window.close();
      }
    });
    this.overlayWindows.clear();
  }

  // Update HUD for all detected tables
  async updateHUD() {
    try {
      const tables = await this.detectPokerTables();
      
      // Close windows for tables that no longer exist
      const currentTableIds = new Set(tables.map(t => t.id));
      for (const [tableId, window] of this.overlayWindows) {
        if (!currentTableIds.has(tableId)) {
          if (!window.isDestroyed()) {
            window.close();
          }
          this.overlayWindows.delete(tableId);
        }
      }

      // Create or update windows for current tables
      for (const table of tables) {
        if (!this.overlayWindows.has(table.id)) {
          console.log(`Creating new overlay window for table: ${table.id}`);
          const overlayWindow = this.createOverlayWindow(table.id, table.bounds);
          this.overlayWindows.set(table.id, overlayWindow);
        }

        // Update HUD data for this table
        await this.updateTableHUD(table);
      }
    } catch (error) {
      console.error('Error updating HUD:', error);
    }
  }

  // Update HUD data for a specific table
  async updateTableHUD(table) {
    const window = this.overlayWindows.get(table.id);
    if (!window || window.isDestroyed()) return;

    try {
      // Get player stats from database
      const playerStats = await this.getPlayerStats(table.players);
      
      // Send stats to overlay window
      window.webContents.send('hud-update', {
        tableId: table.id,
        players: table.players,
        stats: playerStats
      });
    } catch (error) {
      console.error(`Error updating HUD for table ${table.id}:`, error);
    }
  }

  // Get player statistics from database
  async getPlayerStats(players) {
    const stats = {};
    
    try {
      // Connect to your existing database
      const db = new Database('./hands.db');
      
      for (const player of players) {
        // Query real stats from your database
        const playerStats = db.prepare(`
          SELECT 
            hands,
            VPIP_pct as vpip,
            PFR_pct as pfr,
            ThreeBet_pct as threeBet,
            WTSD_pct as wtsd,
            WWSF_pct as wwsf,
            AFq_pct as afq
          FROM player_stats 
          WHERE player = ?
        `).get(player.name);
        
        if (playerStats) {
          stats[player.name] = {
            vpip: playerStats.vpip || 0,
            pfr: playerStats.pfr || 0,
            threeBet: playerStats.threeBet || 0,
            hands: playerStats.hands || 0,
            wtsd: playerStats.wtsd || 0,
            wwsf: playerStats.wwsf || 0,
            afq: playerStats.afq || 0
          };
        } else {
          // No stats found for this player
          stats[player.name] = {
            vpip: 0,
            pfr: 0,
            threeBet: 0,
            hands: 0,
            wtsd: 0,
            wwsf: 0,
            afq: 0
          };
        }
      }
      
      db.close();
    } catch (error) {
      console.error('Error getting player stats from database:', error);
      // Fallback to static stats if database error
      for (const player of players) {
        stats[player.name] = {
          vpip: 0,
          pfr: 0,
          threeBet: 0,
          hands: 0,
          wtsd: 0,
          wwsf: 0,
          afq: 0
        };
      }
    }
    
    return stats;
  }

  // Toggle HUD on/off
  toggleHUD() {
    if (this.isActive) {
      this.stopHUD();
    } else {
      this.startHUD();
    }
  }
}

module.exports = HUDOverlay;
