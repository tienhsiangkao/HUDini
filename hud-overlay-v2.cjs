// HUD Overlay System v2 - Proper Architecture
// Based on how Hand2Note and top HUDs actually work

const { BrowserWindow, screen, ipcMain } = require('electron');
const Database = require('better-sqlite3');

class HUDOverlayV2 {
  constructor() {
    this.overlayWindow = null;
    this.isActive = false;
    this.tablePosition = null;
    this.playerStats = new Map();
    this.heroInsight = null;
    this.compareInsight = null;
  }

  // Create a single, draggable HUD overlay
  createHUDOverlay() {
    if (this.overlayWindow && !this.overlayWindow.isDestroyed()) {
      this.overlayWindow.focus();
      return;
    }

    const displays = screen.getAllDisplays();
    const primaryDisplay = displays[0];
    
    // Position in center of screen
    const centerX = Math.floor(primaryDisplay.bounds.x + primaryDisplay.bounds.width / 2 - 400);
    const centerY = Math.floor(primaryDisplay.bounds.y + primaryDisplay.bounds.height / 2 - 300);

    this.overlayWindow = new BrowserWindow({
      width: 800,
      height: 600,
      x: centerX,
      y: centerY,
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

    // Load the HUD HTML
    this.overlayWindow.loadFile('hud-window-v2.html');

    if (this.overlayWindow && !this.overlayWindow.isDestroyed()) {
      this.overlayWindow.webContents.once('did-finish-load', () => {
        try {
          this.updateOverlayStats();
          this.pushInsightsToOverlay();
        } catch (error) {
          console.error('HUD overlay init sync failed:', error);
        }
      });
    }
    
    // Configure mouse behavior - allow dragging but don't block clicks
    this.overlayWindow.setIgnoreMouseEvents(false);
    
    // Store position when moved
    this.overlayWindow.on('moved', () => {
      this.tablePosition = this.overlayWindow.getBounds();
      console.log('HUD position updated:', this.tablePosition);
    });

    // Configure dragging when window is ready
    this.overlayWindow.on('ready-to-show', () => {
      this.overlayWindow.webContents.executeJavaScript(`
        // Make container draggable but allow button clicks
        const container = document.querySelector('.hud-container');
        if (container) {
          container.style.webkitAppRegion = 'drag';
        }
      `);
    });

    console.log('✅ HUD overlay created - drag it over your poker table');
  }

  // Start HUD system
  startHUD() {
    if (this.isActive) return;
    
    console.log('🎯 Starting HUD system...');
    this.isActive = true;
    this.createHUDOverlay();
    
    // Load initial player stats
    this.loadPlayerStats();
    this.pushInsightsToOverlay();
    
    console.log('✅ HUD system started - position overlay over your table');
  }

  // Stop HUD system
  stopHUD() {
    if (!this.isActive) return;
    
    console.log('🛑 Stopping HUD system...');
    this.isActive = false;
    
    if (this.overlayWindow && !this.overlayWindow.isDestroyed()) {
      this.overlayWindow.close();
      this.overlayWindow = null;
    }
    
    console.log('✅ HUD system stopped');
  }

  // Toggle HUD on/off
  toggleHUD() {
    if (this.isActive) {
      this.stopHUD();
    } else {
      this.startHUD();
    }
    return this.isActive;
  }

  // Detect poker table and players using screen analysis
  detectTablePlayers() {
    try {
      // This would use screen capture + OCR to detect:
      // 1. Poker table boundaries
      // 2. Player names/IDs at each seat
      // 3. Table type (GG Poker, PokerStars, etc.)
      
      // For now, simulate detection of GG Poker Rush & Cash table
      const detectedPlayers = [
        { id: 'seat_1', name: 'Anonymous1', seat: 1, position: 'BTN' },
        { id: 'seat_2', name: 'Anonymous2', seat: 2, position: 'SB' },
        { id: 'seat_3', name: 'Anonymous3', seat: 3, position: 'BB' },
        { id: 'seat_4', name: 'Anonymous4', seat: 4, position: 'UTG' },
        { id: 'seat_5', name: 'Anonymous5', seat: 5, position: 'MP' },
        { id: 'seat_6', name: 'Hero', seat: 6, position: 'CO' }
      ];

      console.log('🎯 Detected GG Poker table with players:', detectedPlayers);
      return detectedPlayers;
    } catch (error) {
      console.error('Error detecting table players:', error);
      return [];
    }
  }

  // Snap HUD to detected table position
  snapToTable() {
    if (!this.overlayWindow || this.overlayWindow.isDestroyed()) return;

    // This would detect the actual poker table position and snap to it
    // For now, just center it on screen
    const displays = screen.getAllDisplays();
    const primaryDisplay = displays[0];
    
    const centerX = Math.floor(primaryDisplay.bounds.x + primaryDisplay.bounds.width / 2 - 400);
    const centerY = Math.floor(primaryDisplay.bounds.y + primaryDisplay.bounds.height / 2 - 300);

    this.overlayWindow.setBounds({
      x: centerX,
      y: centerY,
      width: 800,
      height: 600
    });

    console.log('🧲 HUD snapped to table position');
  }

  // Load player statistics for detected players
  loadPlayerStats() {
    try {
      // First detect who's actually at the table
      const tablePlayers = this.detectTablePlayers();
      
      const db = new Database('./hands.db');
      this.playerStats.clear();

      // Get stats for each detected player
      for (const player of tablePlayers) {
        const stats = db.prepare(`
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

        if (stats) {
          this.playerStats.set(player.id, {
            ...player,
            vpip: stats.vpip || 0,
            pfr: stats.pfr || 0,
            threeBet: stats.threeBet || 0,
            hands: stats.hands || 0,
            wtsd: stats.wtsd || 0,
            wwsf: stats.wwsf || 0,
            afq: stats.afq || 0
          });
        } else {
          // New player - no stats yet
          this.playerStats.set(player.id, {
            ...player,
            vpip: 0,
            pfr: 0,
            threeBet: 0,
            hands: 0,
            wtsd: 0,
            wwsf: 0,
            afq: 0
          });
        }
      }

      db.close();
      console.log(`📊 Loaded stats for ${this.playerStats.size} detected players`);
      
      // Send stats to overlay
      this.updateOverlayStats();
      
    } catch (error) {
      console.error('Error loading player stats:', error);
    }
  }

  // Update overlay with current stats
  updateOverlayStats() {
    if (!this.overlayWindow || this.overlayWindow.isDestroyed()) return;

    const statsData = Array.from(this.playerStats.entries()).map(([player, stats]) => ({
      player,
      ...stats
    }));

    this.overlayWindow.webContents.send('hud:update-stats', {
      players: statsData,
      timestamp: Date.now()
    });
  }

  pushInsightsToOverlay() {
    if (!this.overlayWindow || this.overlayWindow.isDestroyed()) return;
    this.overlayWindow.webContents.send('hud:update-insights', {
      hero: this.heroInsight,
      compare: this.compareInsight,
      timestamp: Date.now(),
    });
  }

  updateInsights(payload) {
    if (payload && typeof payload === 'object') {
      if ('hero' in payload) this.heroInsight = payload.hero || null;
      if ('compare' in payload) this.compareInsight = payload.compare || null;
    } else {
      this.heroInsight = null;
      this.compareInsight = null;
    }
    this.pushInsightsToOverlay();
  }

  // Get HUD status
  getStatus() {
    return {
      active: this.isActive,
      hasOverlay: this.overlayWindow && !this.overlayWindow.isDestroyed(),
      position: this.tablePosition,
      playerCount: this.playerStats.size
    };
  }
}

module.exports = HUDOverlayV2;
