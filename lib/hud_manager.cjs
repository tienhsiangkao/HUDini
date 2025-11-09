// HUD Manager - Phase 1: Core HUD System
// Auto-detection, multi-table support, dynamic positioning

const { BrowserWindow, screen, ipcMain } = require('electron');
const Database = require('better-sqlite3');
const path = require('path');
const { LiveTracker } = require('./live_tracker.cjs');
const { ScreenScraper } = require('./screen_scraper.cjs');
const { CalibratedScraper } = require('./calibrated_scraper.cjs');
const { AdaptiveScraper } = require('./adaptive_scraper.cjs');
const { OCRProcessor } = require('./ocr_processor.cjs');

class HUDManager {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.db = null;
    this.liveTracker = new LiveTracker(); // Real-time session tracking
    this.screenScraper = new ScreenScraper(); // Screen capture for GGPoker (legacy)
    this.calibratedScraper = null; // Calibrated screen scraper (pixel-based)
    this.adaptiveScraper = null; // Adaptive screen scraper (pattern-based) - NEW!
    this.ocrProcessor = new OCRProcessor(); // OCR for text extraction
    this.hudWindows = new Map(); // tableId -> HUD window
    this.tableDetector = null;
    this.isActive = false;
    this.useLiveTracking = true; // Use live session data by default
    this.useScreenScraping = false; // Enable for GGPoker without hand histories
    this.useCalibratedScraper = false; // Use calibrated configuration (pixel-based)
    this.useAdaptiveScraper = true; // Use adaptive scraper (resolution-independent) - NEW!
    this.config = {
      autoDetect: true,
      refreshInterval: 2000, // Check for tables every 2s
      statPositions: {}, // Store custom stat positions per table
      displayedStats: ['vpip', 'pfr', 'hands', 'aggression', 'wtsd', 'cbet'], // Default stats
    };
  }

  // Initialize database connection
  async init() {
    try {
      this.db = new Database(this.dbPath);
      this.liveTracker.init(); // Initialize live tracking database
      
      // Initialize OCR if screen scraping enabled
      if (this.useScreenScraping || this.useCalibratedScraper || this.useAdaptiveScraper) {
        await this.ocrProcessor.initialize();
        console.log('✅ OCR Processor initialized');
        
        // Initialize adaptive scraper (resolution-independent)
        if (this.useAdaptiveScraper) {
          this.adaptiveScraper = new AdaptiveScraper(this.ocrProcessor);
          this.adaptiveScraper.setCallback((tableData) => this.handleTableData(tableData));
          console.log('✅ Adaptive scraper initialized (resolution-independent)');
        }
        // Initialize calibrated scraper (pixel-based)
        else if (this.useCalibratedScraper) {
          this.calibratedScraper = new CalibratedScraper(this.ocrProcessor);
          const configPath = path.join(__dirname, '..', 'configs', 'ggpoker_rushcash_calibrated.json');
          const loaded = await this.calibratedScraper.loadConfig(configPath);
          
          if (loaded) {
            console.log('✅ Calibrated scraper initialized');
            
            // Set callback for table data
            this.calibratedScraper.setCallback((tableData) => {
              this.handleTableData(tableData);
            });
          } else {
            console.warn('⚠️ Failed to load calibrated configuration');
            this.useCalibratedScraper = false;
          }
        }
      }
      
      console.log('✅ HUD Manager initialized');
      return true;
    } catch (error) {
      console.error('❌ HUD Manager init failed:', error);
      return false;
    }
  }

  // Start HUD system
  async start() {
    if (this.isActive) {
      console.log('⚠️ HUD already running');
      return;
    }

    if (!this.db) {
      if (!await this.init()) return;
    }

    console.log('🎯 Starting HUD system...');
    this.isActive = true;

    // Start appropriate scraper
    if (this.useAdaptiveScraper && this.adaptiveScraper) {
      console.log('🎯 Starting ADAPTIVE screen scraping (resolution-independent)...');
      await this.adaptiveScraper.start();
    } else if (this.useCalibratedScraper && this.calibratedScraper) {
      console.log('📸 Starting calibrated screen scraping (pixel-based)...');
      await this.calibratedScraper.start();
    } else if (this.useScreenScraping) {
      console.log('📸 Starting legacy screen scraping mode...');
      this.startScreenScraping();
    } else {
      console.log('⚠️ Screen scraping not enabled');
    }

    // Start table detection if enabled
    if (this.config.autoDetect) {
      this.startTableDetection();
    }

    // For now, create a single configurable HUD window
    const tableId = 'main';
    this.createHUDWindow(tableId);
    this.startTableSession(tableId); // Begin live tracking
  }

  // Stop HUD system
  async stop() {
    console.log('⏹️ Stopping HUD system...');
    this.isActive = false;

    // Stop calibrated scraper
    if (this.calibratedScraper) {
      this.calibratedScraper.stop();
    }

    // Stop legacy screen scraping
    if (this.useScreenScraping) {
      this.screenScraper.stop();
    }
    
    // Terminate OCR
    if (this.ocrProcessor) {
      await this.ocrProcessor.terminate();
    }

    // Stop table detection
    if (this.tableDetector) {
      clearInterval(this.tableDetector);
      this.tableDetector = null;
    }

    // Close all HUD windows
    for (const [tableId, hudWindow] of this.hudWindows.entries()) {
      if (hudWindow && !hudWindow.isDestroyed()) {
        hudWindow.close();
      }
    }
    this.hudWindows.clear();
    console.log('✅ HUD system stopped');
  }

  // Create HUD window for a table
  createHUDWindow(tableId) {
    if (this.hudWindows.has(tableId)) {
      const existing = this.hudWindows.get(tableId);
      if (existing && !existing.isDestroyed()) {
        existing.focus();
        return existing;
      }
    }

    const displays = screen.getAllDisplays();
    const primaryDisplay = displays[0];
    
    // Default position
    const x = Math.floor(primaryDisplay.bounds.x + primaryDisplay.bounds.width / 2 - 400);
    const y = Math.floor(primaryDisplay.bounds.y + primaryDisplay.bounds.height / 2 - 300);

    const hudWindow = new BrowserWindow({
      width: 900,
      height: 700,
      x: x,
      y: y,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: true,
      movable: true,
      minimizable: false,
      maximizable: false,
      closable: false,
      focusable: false,        // Don't steal focus
      hasShadow: false,        // No shadow
      webPreferences: {
        // Security: Disable nodeIntegration and enable contextIsolation
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        preload: path.join(__dirname, '../preload.cjs')
      }
    });

    // Load HUD interface
    hudWindow.loadFile(path.join(__dirname, '../hud-window-v3.html'));

    // Make window click-through (ignore mouse events)
    hudWindow.setIgnoreMouseEvents(true);

    // Send initial config when loaded
    hudWindow.webContents.on('did-finish-load', () => {
      this.updateHUDWindow(tableId);
    });

    // Handle window events
    hudWindow.on('closed', () => {
      this.hudWindows.delete(tableId);
    });

    this.hudWindows.set(tableId, hudWindow);
    console.log(`✅ HUD window created for table: ${tableId}`);
    
    return hudWindow;
  }

  // Handle table data from calibrated scraper
  handleTableData(tableData) {
    const { tableId, tableName, pot, activePlayers, buttons, players, timestamp } = tableData;
    
    // Extract stake from table name (e.g., "Rush & Cash - $0.02 / $0.05")
    const stakeMatch = tableName.match(/\$(\d+\.\d+)\s*\/\s*\$(\d+\.\d+)/);
    const stakes = stakeMatch ? `$${stakeMatch[1]}/$${stakeMatch[2]}` : 'Unknown';
    
    // Get hero name
    const heroStats = this.getHeroStats();
    const heroName = heroStats ? heroStats.name : 'Unknown';
    
    console.log(`\n📊 [${tableName}] Table Data:`);
    console.log(`   Stakes: ${stakes}`);
    console.log(`   Hero: ${heroName}`);
    console.log(`   Pot: $${pot.toFixed(2)}`);
    console.log(`   Active seats: ${activePlayers.join(', ')}`);
    console.log(`   Buttons: ${Object.entries(buttons).filter(([k,v]) => v).map(([k]) => k).join(', ') || 'none'}`);
    console.log(`   Players: ${players.map(p => `${p.name} ($${p.stack.toFixed(2)})`).join(', ')}`);
    
    // Track players in live tracker
    if (this.useLiveTracking && this.liveTracker && typeof this.liveTracker.updatePlayerSeen === 'function') {
      for (const player of players) {
        // Update player data in live tracker
        this.liveTracker.updatePlayerSeen(tableId, player.name, player.stack);
      }
      
      // Track pot for current hand
      if (pot > 0) {
        this.liveTracker.updatePot(tableId, pot);
      }
    }
    
    // Update HUD window if it exists
    if (this.hudWindows.has(tableId) || this.hudWindows.has('main')) {
      const hudId = this.hudWindows.has(tableId) ? tableId : 'main';
      this.updateHUDWindow(hudId);
    }
  }

  // Update HUD window with latest data
  updateHUDWindow(tableId) {
    const hudWindow = this.hudWindows.get(tableId);
    if (!hudWindow || hudWindow.isDestroyed()) return;

    try {
      // For Rush & Cash: Track ALL players (even anonymous), show hero + opponents
      const isRushAndCash = tableId.includes('Rush') || tableId.includes('Rush___Cash');
      
      let players, heroStats, sessionSummary;
      
      if (isRushAndCash) {
        // Rush & Cash mode: Track all players from database + current session
        if (this.useLiveTracking) {
          // Get current session players
          const livePlayers = this.liveTracker.getLiveStats(tableId);
          
          // Enrich with historical stats from database (for anonymous player IDs)
          players = livePlayers.map(p => {
            const historicalStats = this.getPlayerHistoricalStats(p.name);
            return {
              ...p,
              totalHands: historicalStats ? historicalStats.hands : p.hands,
              historicalVPIP: historicalStats ? historicalStats.vpip : null,
              historicalPFR: historicalStats ? historicalStats.pfr : null,
              isNew: !historicalStats || historicalStats.hands < 10
            };
          });
          
          heroStats = this.getHeroStats(); // Historical stats from database
          const liveHero = this.getLiveHeroStats(tableId); // Current session
          
          // Session summary
          sessionSummary = {
            handsPlayed: liveHero.hands,
            vpip: liveHero.vpip,
            pfr: liveHero.pfr,
            playersTracked: players.length,
            message: `Session: ${liveHero.hands} hands, ${players.length} players`
          };
          
          console.log(`📊 Rush & Cash: ${players.length} players tracked (${liveHero.hands} hands played)`);
        } else {
          players = [];
          heroStats = this.getHeroStats();
        }
      } else if (this.useLiveTracking) {
        // Regular table: Track all players
        players = this.liveTracker.getLiveStats(tableId);
        heroStats = this.getLiveHeroStats(tableId);
        console.log(`📊 Live stats for ${tableId}:`, players.length, 'players tracked');
      } else {
        // Fallback to historical
        players = this.getActivePlayerStats();
        heroStats = this.getHeroStats();
      }

      // Send update to HUD window
      hudWindow.webContents.send('hud:update', {
        tableId,
        players,
        hero: heroStats,
        session: sessionSummary,
        config: this.config,
        timestamp: Date.now(),
        isLive: this.useLiveTracking,
        isRushAndCash: isRushAndCash
      });
    } catch (error) {
      console.error(`❌ Failed to update HUD for table ${tableId}:`, error);
    }
  }

  // Get active player stats (top players by recent hands)
  getActivePlayerStats(limit = 20) {
    if (!this.db) return [];

    try {
      const query = `
        SELECT 
          player,
          hands,
          VPIP_pct as vpip,
          PFR_pct as pfr,
          ThreeBet_pct as three_bet,
          CBetF_pct as cbet,
          WTSD_pct as wtsd,
          WWSF_pct as won_pct,
          AFq_pct as aggression,
          updated_at
        FROM player_stats
        WHERE player != ''
        ORDER BY updated_at DESC
        LIMIT ?
      `;

      const stmt = this.db.prepare(query);
      const players = stmt.all(limit);
      
      return players.map(p => ({
        name: p.player,
        hands: p.hands || 0,
        vpip: p.vpip || 0,
        pfr: p.pfr || 0,
        wonPct: p.won_pct || 0,
        aggression: p.aggression || 0,
        cbet: p.cbet || 0,
        wtsd: p.wtsd || 0,
        threeBet: p.three_bet || 0,
        lastSeen: p.updated_at
      }));
    } catch (error) {
      console.error('❌ Failed to get player stats:', error);
      return [];
    }
  }

  // Get hero stats
  getHeroStats() {
    if (!this.db) return null;

    try {
      // Check if player_stats table exists
      const tableCheck = this.db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='player_stats'
      `).get();
      
      if (!tableCheck) {
        console.log('⚠️ player_stats table not found - run stats rebuild');
        return null;
      }

      // Try to get hero name from hands table (most recent player)
      const heroQuery = `
        SELECT hero
        FROM hands
        WHERE hero IS NOT NULL AND hero != ''
        ORDER BY ts DESC
        LIMIT 1
      `;
      
      const heroResult = this.db.prepare(heroQuery).get();
      if (!heroResult) return null;

      const heroName = heroResult.hero;

      // Get hero stats from player_stats
      const statsQuery = `
        SELECT 
          hands,
          VPIP_pct as vpip,
          PFR_pct as pfr,
          WWSF_pct as won_pct,
          ThreeBet_pct as three_bet,
          CBetF_pct as cbet,
          WTSD_pct as wtsd,
          AFq_pct as aggression
        FROM player_stats
        WHERE player = ?
      `;

      const stats = this.db.prepare(statsQuery).get(heroName);
      
      if (!stats) {
        console.log(`⚠️ No stats found for hero: ${heroName}`);
        return { name: heroName, hands: 0, vpip: 0, pfr: 0, wonPct: 0 };
      }
      
      return {
        name: heroName,
        hands: stats.hands || 0,
        vpip: stats.vpip || 0,
        pfr: stats.pfr || 0,
        wonPct: stats.won_pct || 0,
        threeBet: stats.three_bet || 0,
        cbet: stats.cbet || 0,
        wtsd: stats.wtsd || 0,
        aggression: stats.aggression || 0
      };
    } catch (error) {
      console.error('❌ Failed to get hero stats:', error);
      return null;
    }
  }

  // Get live hero stats from current session
  getLiveHeroStats(tableId) {
    const allPlayers = this.liveTracker.getLiveStats(tableId);
    
    // Hero is typically at seat 1 or the player with most hands
    if (allPlayers.length === 0) {
      return {
        name: 'Hero',
        hands: 0,
        vpip: 0,
        pfr: 0,
        wonPct: 0,
        threeBet: 0,
        cbet: 0,
        wtsd: 0,
        aggression: 0
      };
    }

    // Find player with most hands (likely hero in live play)
    const hero = allPlayers.reduce((max, p) => p.hands > max.hands ? p : max, allPlayers[0]);
    return {
      name: hero.name || 'Hero',
      hands: hero.hands,
      vpip: hero.vpip,
      pfr: hero.pfr,
      wonPct: parseFloat(hero.wonPct),
      threeBet: hero.threeBet,
      cbet: hero.cbet,
      wtsd: hero.wtsd,
      aggression: 0, // TODO: Calculate from actions
      netBB: hero.netBB
    };
  }

  // Track a player action (for live updates)
  trackAction(tableId, seatNumber, street, action, amount = 0) {
    if (!this.useLiveTracking) return;

    if (street === 'preflop') {
      this.liveTracker.trackPreflopAction(tableId, seatNumber, action, amount);
    } else {
      this.liveTracker.trackPostflopAction(tableId, seatNumber, street, action, amount);
    }

    // Refresh HUD
    this.updateHUDWindow(tableId);
  }

  // Track hand completion
  trackHandComplete(tableId, seatNumber, wentToShowdown, won, netAmount) {
    if (!this.useLiveTracking) return;

    this.liveTracker.trackHandComplete(tableId, seatNumber, wentToShowdown, won, netAmount);
    this.updateHUDWindow(tableId);
  }

  // Start tracking a new table session
  startTableSession(tableId) {
    if (this.useLiveTracking) {
      this.liveTracker.startSession(tableId);
    }
  }

  // Start automatic table detection
  startTableDetection() {
    if (this.tableDetector) return;

    console.log('🔍 Starting table detection...');
    
    this.tableDetector = setInterval(() => {
      this.detectPokerTables();
    }, this.config.refreshInterval);

    // Run immediately
    this.detectPokerTables();
  }

  // Detect poker tables (Windows only for now)
  async detectPokerTables() {
    try {
      const { execSync } = require('child_process');
      
      // PowerShell command to get all window titles
      const psCommand = `Get-Process | Where-Object {$_.MainWindowTitle -ne ''} | Select-Object -ExpandProperty MainWindowTitle`;
      const output = execSync(`powershell -Command "${psCommand}"`, { encoding: 'utf8' });
      
      const windows = output.split('\n').map(w => w.trim()).filter(Boolean);
      
      // Look for GGPoker/PokerStars table windows
      const tablePatterns = [
        /Rush & Cash/i,
        /Hold'?em/i,
        /NL Hold'?em/i,
        /\$[\d.]+\s*\/\s*\$[\d.]+/,  // Stakes like $0.01 / $0.02
        /Table\s+\d+/i,
        /Seat\s+\d+/i
      ];

      for (const title of windows) {
        // Check if this looks like a poker table
        const isTable = tablePatterns.some(pattern => pattern.test(title));
        
        if (isTable) {
          // Use the window title as tableId (sanitized)
          const tableId = title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
          
          // Create HUD window if we don't have one yet
          if (!this.hudWindows.has(tableId)) {
            console.log(`🎯 New poker table detected: "${title}"`);
            console.log(`   Creating HUD window with ID: ${tableId}`);
            this.createHUDWindow(tableId);
          }
        }
      }
      
    } catch (error) {
      console.error('❌ Error detecting poker tables:', error.message);
    }
  }

  // Update HUD configuration
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    console.log('✅ HUD config updated:', this.config);

    // Update all active HUD windows
    for (const tableId of this.hudWindows.keys()) {
      this.updateHUDWindow(tableId);
    }
  }

  // Toggle specific stat visibility
  toggleStat(statName) {
    const index = this.config.displayedStats.indexOf(statName);
    if (index > -1) {
      this.config.displayedStats.splice(index, 1);
    } else {
      this.config.displayedStats.push(statName);
    }
    
    // Update all windows
    for (const tableId of this.hudWindows.keys()) {
      this.updateHUDWindow(tableId);
    }
  }

  // Save stat position for a player
  saveStatPosition(tableId, playerName, position) {
    if (!this.config.statPositions[tableId]) {
      this.config.statPositions[tableId] = {};
    }
    this.config.statPositions[tableId][playerName] = position;
    console.log(`💾 Saved position for ${playerName} on table ${tableId}`);
  }

  // Get all HUD windows
  getHUDWindows() {
    return Array.from(this.hudWindows.entries()).map(([tableId, window]) => ({
      tableId,
      isActive: window && !window.isDestroyed(),
      bounds: window && !window.isDestroyed() ? window.getBounds() : null
    }));
  }

  // ============================================================================
  // SCREEN SCRAPING METHODS (For GGPoker without hand histories)
  // ============================================================================

  /**
   * Start screen scraping for real-time table monitoring
   */
  startScreenScraping() {
    console.log('[HUD] Starting screen scraping mode...');
    
    // Set callback for when table data is captured
    this.screenScraper.setCallback((tableData) => {
      this.processScrapedTableData(tableData);
    });

    // Start capturing
    this.screenScraper.start();
  }

  /**
   * Process data captured from screen scraping
   */
  async processScrapedTableData(tableData) {
    const { tableId, players, currentAction, pot, stakes } = tableData;

    // console.log(`[HUD] Processing scraped data for ${tableId}`);

    // Extract player names and stacks via OCR
    if (tableData.imageDataURL) {
      const extractedPlayers = await this.ocrProcessor.extractPlayers(
        tableData.imageDataURL,
        tableData.bounds.width,
        tableData.bounds.height,
        6 // Assume 6-max for now
      );

      if (extractedPlayers.length > 0) {
        console.log(`[HUD] Detected ${extractedPlayers.length} players via OCR`);
        
        // Register players with live tracker
        for (const player of extractedPlayers) {
          this.liveTracker.registerPlayer(tableId, player.seat, player.name);
        }
      }

      // Extract current action
      const action = await this.ocrProcessor.detectAction(
        tableData.imageDataURL,
        tableData.bounds.width,
        tableData.bounds.height
      );

      if (action) {
        console.log(`[HUD] Detected action:`, action);
        // TODO: Track action with live tracker
        // Need to determine which seat performed the action
      }

      // Update HUD with latest data
      this.updateHUDWindow(tableId);
    }
  }

  /**
   * Enable screen scraping mode
   */
  async enableScreenScraping() {
    if (this.useScreenScraping) {
      console.log('[HUD] Screen scraping already enabled');
      return;
    }

    console.log('[HUD] Enabling screen scraping mode...');
    this.useScreenScraping = true;

    // Initialize OCR
    await this.ocrProcessor.initialize();

    // Start scraping if HUD is active
    if (this.isActive) {
      this.startScreenScraping();
    }
  }

  /**
   * Disable screen scraping mode
   */
  async disableScreenScraping() {
    if (!this.useScreenScraping) return;

    console.log('[HUD] Disabling screen scraping mode...');
    this.useScreenScraping = false;

    this.screenScraper.stop();
    await this.ocrProcessor.terminate();
  }

  /**
   * Set screen capture frequency
   */
  setScreenCaptureFrequency(ms) {
    this.screenScraper.setCaptureFrequency(ms);
  }

  /**
   * Get screen scraping status
   */
  getScreenScrapingStatus() {
    return {
      enabled: this.useScreenScraping,
      active: this.screenScraper.captureInterval !== null,
      trackedTables: this.screenScraper.getTrackedTables(),
      ocrReady: this.ocrProcessor.ready
    };
  }
}

module.exports = { HUDManager };
