// adaptive_scraper.cjs - Resolution-independent screen scraping using pattern recognition
const { desktopCapturer, screen } = require('electron');
const sharp = require('sharp');

/**
 * Adaptive Screen Scraper - Works across different table sizes
 * Uses pattern recognition instead of fixed coordinates
 */
class AdaptiveScraper {
  constructor(ocrProcessor) {
    this.ocrProcessor = ocrProcessor;
    this.isRunning = false;
    this.captureInterval = null;
    this.onTableDataCallback = null;
    this.lastCapture = {};
  }

  /**
   * Set callback for table data
   */
  setCallback(callback) {
    this.onTableDataCallback = callback;
  }

  /**
   * Start monitoring poker tables
   */
  async start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('[Adaptive Scraper] Starting resolution-independent scraping...');
    
    // Start capture loop
    this.captureInterval = setInterval(async () => {
      await this.captureAndProcessTables();
    }, 2000); // Every 2 seconds
    
    // Initial capture
    await this.captureAndProcessTables();
  }

  /**
   * Stop monitoring
   */
  stop() {
    this.isRunning = false;
    if (this.captureInterval) {
      clearInterval(this.captureInterval);
      this.captureInterval = null;
    }
    console.log('[Adaptive Scraper] Stopped');
  }

  /**
   * Detect poker windows
   */
  async detectPokerWindows() {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['window'],
        thumbnailSize: { width: 150, height: 150 }
      });

      const pokerWindows = sources.filter(source => {
        const name = source.name;
        
        // Skip hand history
        if (name.startsWith('HH ') || name.startsWith('HH  ')) {
          return false;
        }
        
        // Match Rush & Cash or Hold'em with stakes
        const isRushAndCash = /Rush\s*&\s*Cash.*\$[\d.]+\s*\/\s*\$[\d.]+/i.test(name);
        const isHoldemTable = /Hold'?em.*\$[\d.]+\s*\/\s*\$[\d.]+/i.test(name);
        const hasStakes = /\$[\d.]+\s*\/\s*\$[\d.]+/.test(name);
        
        return isRushAndCash || isHoldemTable || hasStakes;
      });

      if (pokerWindows.length > 0) {
        console.log(`[Adaptive Scraper] Found ${pokerWindows.length} table(s):`);
        pokerWindows.forEach(w => console.log(`  - ${w.name}`));
      }
      
      return pokerWindows.map(source => ({
        Title: source.name,
        Handle: source.id,
        source: source
      }));
      
    } catch (error) {
      console.error('[Adaptive Scraper] Error detecting windows:', error.message);
      return [];
    }
  }

  /**
   * Capture and process all tables
   */
  async captureAndProcessTables() {
    try {
      const windows = await this.detectPokerWindows();
      if (windows.length === 0) return;

      for (const window of windows) {
        const screenshot = await this.captureWindowScreenshot(window.source);
        if (!screenshot) continue;
        
        await this.processTableWindow(window, screenshot);
      }
    } catch (error) {
      console.error('[Adaptive Scraper] Error in capture loop:', error);
    }
  }

  /**
   * Capture window screenshot
   */
  async captureWindowScreenshot(source) {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['window'],
        thumbnailSize: { width: 1920, height: 1080 }
      });
      
      const matchingSource = sources.find(s => s.id === source.id);
      if (!matchingSource) return null;
      
      return matchingSource.thumbnail.toPNG();
    } catch (error) {
      console.error('[Adaptive Scraper] Window capture error:', error);
      return null;
    }
  }

  /**
   * Process table window using adaptive pattern recognition
   */
  async processTableWindow(window, screenshot) {
    try {
      const metadata = await sharp(screenshot).metadata();
      console.log(`\n📸 [${window.Title}] ${metadata.width}x${metadata.height}`);
      
      // Extract data using pattern-based regions (percentages of screen)
      const tableData = await this.extractAdaptiveTableData(screenshot, metadata);
      
      // Show results
      console.log(`💰 Pot: $${tableData.pot.toFixed(2)}`);
      console.log(`👥 Players:`);
      tableData.players.forEach(p => {
        if (p.stack > 0 || p.name !== `Player ${p.seat}`) {
          console.log(`   Seat ${p.seat}: ${p.name} ($${p.stack.toFixed(2)})`);
        }
      });
      
      // Add metadata
      tableData.tableId = `table_${window.Handle}`;
      tableData.tableName = window.Title;
      tableData.timestamp = Date.now();

      // Store and callback
      this.lastCapture[tableData.tableId] = tableData;
      if (this.onTableDataCallback) {
        this.onTableDataCallback(tableData);
      }
      
    } catch (error) {
      console.error(`❌ [Adaptive Scraper] Error processing ${window.Title}:`, error);
      console.error(error.stack);
    }
  }

  /**
   * Extract table data using percentage-based regions
   * Works regardless of window size
   */
  async extractAdaptiveTableData(screenshot, metadata) {
    const data = {
      pot: 0,
      activePlayers: [],
      buttons: { fold: false, call: false, raise: false },
      players: []
    };

    const width = metadata.width;
    const height = metadata.height;

    try {
      // POT: Center-top area (40-60% horizontal, 8-15% vertical)
      data.pot = await this.extractRegion(screenshot, {
        left: Math.round(width * 0.40),
        top: Math.round(height * 0.08),
        width: Math.round(width * 0.20),
        height: Math.round(height * 0.07)
      }, 'pot');

      // PLAYER POSITIONS (6-max layout, percentage-based)
      const playerRegions = this.getPlayerRegions(width, height);
      
      for (let seat = 0; seat < 6; seat++) {
        const region = playerRegions[seat];
        
        // Extract stack
        const stack = await this.extractRegion(screenshot, {
          left: Math.round(region.stack.x * width),
          top: Math.round(region.stack.y * height),
          width: Math.round(region.stack.w * width),
          height: Math.round(region.stack.h * height)
        }, 'stack');

        // Extract name
        let name = `Player ${seat}`;
        try {
          const nameText = await this.extractRegion(screenshot, {
            left: Math.round(region.name.x * width),
            top: Math.round(region.name.y * height),
            width: Math.round(region.name.w * width),
            height: Math.round(region.name.h * height)
          }, 'name');
          
          if (nameText && nameText.length > 0) {
            name = nameText.trim();
          }
        } catch (e) {
          // Name optional
        }

        // Only add if has data
        if (stack > 0 || name !== `Player ${seat}`) {
          data.activePlayers.push(seat);
          data.players.push({ seat, name, stack });
        }
      }

    } catch (error) {
      console.error('[Adaptive Scraper] Error extracting data:', error.message);
    }

    return data;
  }

  /**
   * Get player regions as percentages of screen
   * Standard 6-max layout positions
   */
  getPlayerRegions(width, height) {
    // These percentages work for most poker clients
    // Positions: 0=bottom-left, 1=left, 2=top-left, 3=top-right, 4=right, 5=bottom-right
    return [
      // Seat 0: Bottom Left
      {
        stack: { x: 0.15, y: 0.75, w: 0.10, h: 0.05 },
        name: { x: 0.15, y: 0.70, w: 0.10, h: 0.05 }
      },
      // Seat 1: Left
      {
        stack: { x: 0.08, y: 0.45, w: 0.10, h: 0.05 },
        name: { x: 0.08, y: 0.40, w: 0.10, h: 0.05 }
      },
      // Seat 2: Top Left
      {
        stack: { x: 0.20, y: 0.20, w: 0.10, h: 0.05 },
        name: { x: 0.20, y: 0.15, w: 0.10, h: 0.05 }
      },
      // Seat 3: Top Right
      {
        stack: { x: 0.70, y: 0.20, w: 0.10, h: 0.05 },
        name: { x: 0.70, y: 0.15, w: 0.10, h: 0.05 }
      },
      // Seat 4: Right
      {
        stack: { x: 0.82, y: 0.45, w: 0.10, h: 0.05 },
        name: { x: 0.82, y: 0.40, w: 0.10, h: 0.05 }
      },
      // Seat 5: Bottom Right
      {
        stack: { x: 0.75, y: 0.75, w: 0.10, h: 0.05 },
        name: { x: 0.75, y: 0.70, w: 0.10, h: 0.05 }
      }
    ];
  }

  /**
   * Extract and OCR a region
   */
  async extractRegion(screenshot, bounds, type) {
    try {
      // Validate bounds
      const metadata = await sharp(screenshot).metadata();
      if (bounds.left < 0 || bounds.top < 0 || 
          bounds.left + bounds.width > metadata.width || 
          bounds.top + bounds.height > metadata.height ||
          bounds.width <= 0 || bounds.height <= 0) {
        return type === 'pot' || type === 'stack' ? 0 : '';
      }

      // Extract and preprocess the image for better OCR
      const buffer = await sharp(screenshot)
        .extract(bounds)
        .resize(Math.round(bounds.width * 2), null, { 
          fit: 'inside',
          withoutEnlargement: false 
        }) // Upscale 2x for better OCR
        .sharpen() // Sharpen edges
        .toBuffer();

      // Use appropriate OCR method
      if (type === 'pot' || type === 'stack') {
        return await this.ocrProcessor.recognizePokerValue(buffer);
      } else {
        const text = await this.ocrProcessor.recognizeTextEnhanced(buffer);
        return this.cleanPlayerName(text);
      }
    } catch (error) {
      return type === 'pot' || type === 'stack' ? 0 : '';
    }
  }

  /**
   * Clean up player name from OCR
   */
  cleanPlayerName(text) {
    if (!text) return '';
    
    // Remove newlines and extra whitespace
    let cleaned = text.replace(/[\r\n]+/g, ' ').trim();
    
    // Remove multiple spaces
    cleaned = cleaned.replace(/\s+/g, ' ');
    
    // Remove common OCR artifacts
    cleaned = cleaned.replace(/[|!]/g, ''); // Vertical bars often appear
    cleaned = cleaned.replace(/^[.\-_\s]+/, ''); // Leading garbage
    cleaned = cleaned.replace(/[.\-_\s]+$/, ''); // Trailing garbage
    
    // Limit length (player names shouldn't be too long)
    if (cleaned.length > 20) {
      cleaned = cleaned.substring(0, 20);
    }
    
    return cleaned.trim();
  }

  /**
   * Get last capture for table
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

module.exports = { AdaptiveScraper };
