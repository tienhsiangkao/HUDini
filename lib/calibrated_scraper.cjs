// calibrated_scraper.cjs - Screen scraper using calibrated configuration
const fs = require('fs').promises;
const path = require('path');
const { desktopCapturer, screen } = require('electron');
const { execSync } = require('child_process');
const sharp = require('sharp');

class CalibratedScraper {
  constructor(ocrProcessor) {
    this.ocrProcessor = ocrProcessor;
    this.config = null;
    this.templates = new Map();
    this.captureInterval = null;
    this.captureFrequency = 2000; // Capture every 2 seconds
    this.onTableDataCallback = null;
    this.lastCapture = {};
  }

  /**
   * Load calibrated configuration
   */
  async loadConfig(configPath) {
    try {
      const configFile = await fs.readFile(configPath, 'utf8');
      this.config = JSON.parse(configFile);
      console.log(`✅ Loaded config: ${this.config.name}`);
      
      // Load templates
      await this.loadTemplates();
      
      return true;
    } catch (error) {
      console.error('❌ Failed to load config:', error);
      return false;
    }
  }

  /**
   * Load all template images
   */
  async loadTemplates() {
    const templateDir = path.join(__dirname, '..', 'templates');
    const templateNames = [
      'topLeftCorner',
      'foldButton',
      'callButton',
      'raiseButton',
      'dealerButton',
      'coveredCard'
    ];

    for (const name of templateNames) {
      try {
        const templatePath = path.join(templateDir, `${name}_template.png`);
        const buffer = await fs.readFile(templatePath);
        this.templates.set(name, buffer);
        console.log(`✅ Loaded template: ${name}`);
      } catch (error) {
        console.warn(`⚠️ Could not load template ${name}:`, error.message);
      }
    }
  }

  /**
   * Start monitoring poker tables
   */
  async start() {
    if (!this.config) {
      console.error('❌ No configuration loaded. Call loadConfig() first.');
      return false;
    }

    console.log('[Calibrated Scraper] Starting table monitoring...');
    
    // Initial capture
    await this.captureAndProcessTables();
    
    // Periodic capture
    this.captureInterval = setInterval(async () => {
      await this.captureAndProcessTables();
    }, this.captureFrequency);

    return true;
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (this.captureInterval) {
      clearInterval(this.captureInterval);
      this.captureInterval = null;
    }
    console.log('[Calibrated Scraper] Stopped table monitoring');
  }

  /**
   * Set callback for table data
   */
  setCallback(callback) {
    this.onTableDataCallback = callback;
  }

  /**
   * Detect poker windows using PowerShell
   */
  async detectPokerWindows() {
    try {
      // Use Electron's desktopCapturer to get all windows - NO PowerShell needed!
      const sources = await desktopCapturer.getSources({
        types: ['window'],
        thumbnailSize: { width: 150, height: 150 }
      });

      // Filter ONLY for actual poker table windows
      // Rush & Cash tables have very specific title format
      const pokerWindows = sources.filter(source => {
        const name = source.name;
        
        // EXCLUDE hand history window (starts with "HH ")
        if (name.startsWith('HH ') || name.startsWith('HH  ')) {
          console.log(`[Calibrated Scraper] Skipping hand history window: ${name}`);
          return false;
        }
        
        // ONLY match Rush & Cash tables with stakes in title
        // Format: "Rush & Cash - $0.01 / $0.02" or similar
        const isRushAndCash = /Rush\s*&\s*Cash.*\$[\d.]+\s*\/\s*\$[\d.]+/i.test(name);
        
        // Also match regular Hold'em tables with stakes
        const isHoldemTable = /Hold'?em.*\$[\d.]+\s*\/\s*\$[\d.]+/i.test(name);
        
        // Match any window with stakes pattern (backup)
        const hasStakes = /\$[\d.]+\s*\/\s*\$[\d.]+/.test(name);
        
        return isRushAndCash || isHoldemTable || hasStakes;
      });

      if (pokerWindows.length > 0) {
        console.log(`[Calibrated Scraper] Found ${pokerWindows.length} GGPoker window(s):`);
        pokerWindows.forEach(w => console.log(`  - ${w.name}`));
      }
      
      // Return windows in the format expected by processTableWindow
      return pokerWindows.map(source => ({
        Title: source.name,
        Handle: source.id,
        ProcessName: 'GGPoker',
        X: 0,
        Y: 0,
        Width: 1920,
        Height: 1080,
        Visible: true,
        source: source // Keep reference for screenshot
      }));
      
    } catch (error) {
      console.error('[Calibrated Scraper] Error detecting windows:', error.message);
      return [];
    }
  }

  /**
   * Capture screenshot using Electron desktopCapturer
   */
  async captureScreen() {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: screen.getPrimaryDisplay().size
      });

      if (sources.length === 0) return null;

      const source = sources[0];
      const thumbnail = source.thumbnail;
      
      return thumbnail.toPNG();
    } catch (error) {
      console.error('[Calibrated Scraper] Screen capture error:', error);
      return null;
    }
  }

  /**
   * Capture and process all poker tables
   */
  async captureAndProcessTables() {
    try {
      // Detect poker windows using Electron's desktopCapturer (no PowerShell!)
      const windows = await this.detectPokerWindows();
      
      if (windows.length === 0) {
        return;
      }

      // Process each window with its own screenshot
      for (const window of windows) {
        console.log(`[Calibrated Scraper] Processing window: ${window.Title}`);
        
        // Capture this specific window at full resolution
        const screenshot = await this.captureWindowScreenshot(window.source);
        
        if (!screenshot) {
          console.log(`[Calibrated Scraper] Failed to capture window: ${window.Title}`);
          continue;
        }
        
        console.log(`[Calibrated Scraper] Window screenshot: ${screenshot.length} bytes`);
        await this.processTableWindow(window, screenshot);
      }
    } catch (error) {
      console.error('[Calibrated Scraper] Error in capture loop:', error);
    }
  }

  /**
   * Capture screenshot of specific window
   */
  async captureWindowScreenshot(source) {
    try {
      // Get the window with full resolution
      const sources = await desktopCapturer.getSources({
        types: ['window'],
        thumbnailSize: { width: 1920, height: 1080 }
      });
      
      const matchingSource = sources.find(s => s.id === source.id);
      if (!matchingSource) {
        console.log('[Calibrated Scraper] Window not found for screenshot');
        return null;
      }
      
      return matchingSource.thumbnail.toPNG();
    } catch (error) {
      console.error('[Calibrated Scraper] Window capture error:', error);
      return null;
    }
  }

  /**
   * Process a single table window
   */
  async processTableWindow(window, windowScreenshot) {
    try {
      const tableId = `table_${window.Handle}`;
      
      // Get image dimensions to verify it matches calibration
      const metadata = await sharp(windowScreenshot).metadata();
      console.log(`\n📸 [${window.Title}] Window: ${metadata.width}x${metadata.height}`);
      
      // Check if dimensions are reasonable for a poker table
      if (metadata.width < 400 || metadata.height < 300) {
        console.log(`⚠️ Window too small, skipping...`);
        return;
      }
      
      // windowScreenshot is already the table window - no extraction needed!
      const tableImage = windowScreenshot;

      // Find top-left corner for reference
      const corner = await this.findTopLeftCorner(tableImage);
      
      if (!corner) {
        console.log(`⚠️ Top-left corner not found, skipping...`);
        return;
      }

      // Extract table data
      const tableData = await this.extractTableData(tableImage, corner);
      
      // Show player info clearly
      console.log(`\n🎰 Table: ${window.Title}`);
      console.log(`💰 Pot: $${tableData.pot.toFixed(2)}`);
      console.log(`👥 Players at table:`);
      tableData.players.forEach(p => {
        if (p.name !== `Player ${p.seat}`) {
          console.log(`   Seat ${p.seat}: ${p.name} ($${p.stack.toFixed(2)})`);
        }
      });
      console.log(`🎮 Buttons: ${Object.entries(tableData.buttons).filter(([k,v]) => v).map(([k]) => k).join(', ') || 'none'}`);
      console.log('');
      
      // Add metadata
      tableData.tableId = tableId;
      tableData.tableName = window.Title;
      tableData.timestamp = Date.now();

      // Store last capture
      this.lastCapture[tableId] = tableData;

      // Send to callback
      if (this.onTableDataCallback) {
        this.onTableDataCallback(tableData);
      }

      // Log summary
      console.log(`📊 [${window.Title}] Pot: ${tableData.pot} | Players: ${tableData.activePlayers.length}`);
      
    } catch (error) {
      console.error(`❌ Error processing table ${window.Title}:`, error);
    }
  }

  /**
   * Find top-left corner in image
   */
  async findTopLeftCorner(imageBuffer) {
    const cornerTemplate = this.templates.get('topLeftCorner');
    if (!cornerTemplate) {
      console.warn('⚠️ Top-left corner template not loaded - using (0,0) as reference');
      return { x: 0, y: 0 }; // Fallback to origin if no template
    }

    return await this.ocrProcessor.findTopLeftCorner(imageBuffer, cornerTemplate);
  }

  /**
   * Extract all table data from screenshot
   */
  async extractTableData(tableImage, corner) {
    const data = {
      pot: 0,
      activePlayers: [],
      buttons: {
        fold: false,
        call: false,
        raise: false
      },
      players: []
    };

    try {
      // Extract pot
      console.log('[Calibrated Scraper] Extracting pot...');
      data.pot = await this.extractPot(tableImage, corner);
      console.log(`[Calibrated Scraper] Pot: $${data.pot}`);

      // Detect active players
      console.log('[Calibrated Scraper] Detecting active players...');
      data.activePlayers = await this.detectActivePlayers(tableImage, corner);
      console.log(`[Calibrated Scraper] Active players: ${data.activePlayers.join(', ')}`);

      // Detect buttons
      console.log('[Calibrated Scraper] Detecting buttons...');
      data.buttons = await this.detectButtons(tableImage, corner);
      console.log(`[Calibrated Scraper] Buttons:`, data.buttons);

      // Extract player data
      console.log('[Calibrated Scraper] Extracting player data...');
      data.players = await this.extractPlayerData(tableImage, corner, data.activePlayers);
      console.log(`[Calibrated Scraper] Players extracted: ${data.players.length}`);

    } catch (error) {
      console.error('Error extracting table data:', error);
    }

    return data;
  }

  /**
   * Extract pot amount
   */
  async extractPot(tableImage, corner) {
    try {
      const potRegion = this.config.regions.totalPot;
      const metadata = await sharp(tableImage).metadata();
      
      // Calculate region bounds
      const left = Math.max(0, Math.round(corner.x + potRegion.x));
      const top = Math.max(0, Math.round(corner.y + potRegion.y));
      const width = Math.min(Math.round(potRegion.width), metadata.width - left);
      const height = Math.min(Math.round(potRegion.height), metadata.height - top);
      
      // Validate region is within image bounds
      if (left + width > metadata.width || top + height > metadata.height || width <= 0 || height <= 0) {
        console.log(`⚠️ Pot region outside image bounds (${metadata.width}x${metadata.height}), skipping`);
        return 0;
      }
      
      const potBuffer = await sharp(tableImage)
        .extract({ left, top, width, height })
        .toBuffer();

      const pot = await this.ocrProcessor.recognizePokerValue(potBuffer);
      return pot;
    } catch (error) {
      console.error('Error extracting pot:', error.message);
      return 0;
    }
  }

  /**
   * Detect active players using covered card template
   */
  async detectActivePlayers(tableImage, corner) {
    const activePlayers = [];
    const coveredCardTemplate = this.templates.get('coveredCard');
    
    if (!coveredCardTemplate) {
      console.warn('⚠️ Covered card template not loaded - assuming all seats active');
      // Fallback: assume all configured player positions are active
      return this.config.regions.playerPositions.map(p => p.seat);
    }

    for (const position of this.config.regions.playerPositions) {
      try {
        const cardRegion = position.cards;
        
        const cardBuffer = await sharp(tableImage)
          .extract({
            left: Math.round(corner.x + cardRegion.x),
            top: Math.round(corner.y + cardRegion.y),
            width: Math.round(cardRegion.width),
            height: Math.round(cardRegion.height)
          })
          .toBuffer();

        const hasCard = await this.ocrProcessor.matchTemplate(
          cardBuffer,
          coveredCardTemplate,
          { threshold: 0.1 } // More lenient for cards
        );

        if (hasCard) {
          activePlayers.push(position.seat);
        }
      } catch (error) {
        // Ignore errors for individual positions
      }
    }

    return activePlayers;
  }

  /**
   * Detect available buttons
   */
  async detectButtons(tableImage, corner) {
    const buttons = {
      fold: false,
      call: false,
      raise: false
    };

    const buttonRegion = this.config.regions.buttonSearchArea;
    
    try {
      const buttonAreaBuffer = await sharp(tableImage)
        .extract({
          left: Math.round(corner.x + buttonRegion.x),
          top: Math.round(corner.y + buttonRegion.y),
          width: Math.round(buttonRegion.width),
          height: Math.round(buttonRegion.height)
        })
        .toBuffer();

      // Check each button
      for (const buttonName of ['foldButton', 'callButton', 'raiseButton']) {
        const template = this.templates.get(buttonName);
        if (!template) continue;

        const found = await this.ocrProcessor.matchTemplate(
          buttonAreaBuffer,
          template,
          { threshold: 0.05 }
        );

        const key = buttonName.replace('Button', '');
        buttons[key] = !!found;
      }
    } catch (error) {
      console.error('Error detecting buttons:', error);
    }

    return buttons;
  }

  /**
   * Extract player data (stacks, names)
   */
  async extractPlayerData(tableImage, corner, activePlayers) {
    const players = [];
    const metadata = await sharp(tableImage).metadata();

    for (const seat of activePlayers) {
      const position = this.config.regions.playerPositions.find(p => p.seat === seat);
      if (!position) continue;

      try {
        // Validate and extract stack
        const stackLeft = Math.max(0, Math.round(corner.x + position.stack.x));
        const stackTop = Math.max(0, Math.round(corner.y + position.stack.y));
        const stackWidth = Math.min(Math.round(position.stack.width), metadata.width - stackLeft);
        const stackHeight = Math.min(Math.round(position.stack.height), metadata.height - stackTop);
        
        if (stackLeft + stackWidth > metadata.width || stackTop + stackHeight > metadata.height || stackWidth <= 0 || stackHeight <= 0) {
          console.log(`⚠️ Player ${seat} stack region outside bounds, skipping`);
          continue;
        }
        
        const stackBuffer = await sharp(tableImage)
          .extract({ left: stackLeft, top: stackTop, width: stackWidth, height: stackHeight })
          .toBuffer();

        const stack = await this.ocrProcessor.recognizePokerValue(stackBuffer);

        // Extract name (optional, may not work in Rush & Cash)
        let name = `Player ${seat}`;
        try {
          const nameLeft = Math.max(0, Math.round(corner.x + position.name.x));
          const nameTop = Math.max(0, Math.round(corner.y + position.name.y));
          const nameWidth = Math.min(Math.round(position.name.width), metadata.width - nameLeft);
          const nameHeight = Math.min(Math.round(position.name.height), metadata.height - nameTop);
          
          if (nameLeft + nameWidth <= metadata.width && nameTop + nameHeight <= metadata.height && nameWidth > 0 && nameHeight > 0) {
            const nameBuffer = await sharp(tableImage)
              .extract({ left: nameLeft, top: nameTop, width: nameWidth, height: nameHeight })
              .toBuffer();

            const nameText = await this.ocrProcessor.recognizeTextEnhanced(nameBuffer);
            if (nameText && nameText.length > 0) {
              name = nameText.trim();
            }
          }
        } catch (error) {
          // Name extraction optional
        }

        players.push({
          seat,
          name,
          stack
        });
      } catch (error) {
        console.error(`Error extracting player ${seat} data:`, error);
      }
    }

    return players;
  }

  /**
   * Get last captured data for a table
   */
  getLastCapture(tableId) {
    return this.lastCapture[tableId] || null;
  }

  /**
   * Get all tracked tables
   */
  getTrackedTables() {
    return Object.keys(this.lastCapture);
  }
}

module.exports = { CalibratedScraper };
