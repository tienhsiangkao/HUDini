// ocr_processor.cjs - OCR and image analysis for poker tables
const Tesseract = require('tesseract.js');
const sharp = require('sharp');

class OCRProcessor {
  constructor() {
    this.worker = null;
    this.ready = false;
    this.processing = false;
  }

  /**
   * Initialize Tesseract worker
   */
  async initialize() {
    if (this.ready) return;

    console.log('[OCR] Initializing Tesseract worker...');
    
    try {
      this.worker = await Tesseract.createWorker('eng', 1, {
        logger: m => {
          if (m.status === 'recognizing text') {
            // console.log(`[OCR] Progress: ${(m.progress * 100).toFixed(1)}%`);
          }
        }
      });

      // Configure for better poker text recognition
      await this.worker.setParameters({
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789$.,/- ',
        tessedit_pageseg_mode: Tesseract.PSM.SPARSE_TEXT,
      });

      this.ready = true;
      console.log('[OCR] Tesseract worker ready');
    } catch (error) {
      console.error('[OCR] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Process a table screenshot and extract text
   */
  async processTableImage(imageDataURL, regions = null) {
    if (!this.ready) {
      await this.initialize();
    }

    if (this.processing) {
      // console.log('[OCR] Already processing, skipping...');
      return null;
    }

    this.processing = true;

    try {
      // Convert data URL to buffer
      const base64Data = imageDataURL.replace(/^data:image\/\w+;base64,/, '');
      const imageBuffer = Buffer.from(base64Data, 'base64');

      // If specific regions provided, process each region
      if (regions && regions.length > 0) {
        const results = {};
        
        for (const region of regions) {
          const croppedBuffer = await this.cropImage(imageBuffer, region);
          const text = await this.recognizeText(croppedBuffer);
          results[region.name] = text;
        }
        
        return results;
      }

      // Otherwise, process entire image
      const text = await this.recognizeText(imageBuffer);
      return { fullText: text };

    } catch (error) {
      console.error('[OCR] Error processing image:', error.message);
      return null;
    } finally {
      this.processing = false;
    }
  }

  /**
   * Crop image to specific region
   */
  async cropImage(imageBuffer, region) {
    try {
      const { x, y, width, height } = region;
      
      const cropped = await sharp(imageBuffer)
        .extract({ left: x, top: y, width, height })
        .greyscale() // Convert to grayscale for better OCR
        .normalize() // Enhance contrast
        .toBuffer();

      return cropped;
    } catch (error) {
      console.error('[OCR] Error cropping image:', error.message);
      throw error;
    }
  }

  /**
   * Enhanced preprocessing for OCR with binarization
   * (Based on dickreuter/Poker approach)
   */
  async preprocessForOCR(imageBuffer, options = {}) {
    const {
      threshold = 127,       // Binarization threshold (127 is good middle ground)
      targetWidth = 400,     // Larger width for better accuracy
      binarize = true        // Whether to apply binarization
    } = options;

    try {
      let pipeline = sharp(imageBuffer)
        .greyscale()           // Step 1: Convert to grayscale
        .resize(targetWidth, null, {  // Step 2: Resize to standard width (larger = better)
          fit: 'inside',
          kernel: 'lanczos3',  // Better quality scaling
          withoutEnlargement: false
        })
        .normalize()          // Step 3: Improve contrast
        .sharpen();           // Step 4: Sharpen text edges

      // Step 5: Binarize (convert to pure black/white for better OCR)
      if (binarize) {
        pipeline = pipeline.threshold(threshold);
      }

      return await pipeline.toBuffer();
    } catch (error) {
      console.error('[OCR] Error preprocessing image:', error.message);
      throw error;
    }
  }

  /**
   * Recognize text from image buffer
   */
  async recognizeText(imageBuffer) {
    try {
      const { data } = await this.worker.recognize(imageBuffer);
      return data.text.trim();
    } catch (error) {
      console.error('[OCR] Error recognizing text:', error.message);
      return '';
    }
  }

  /**
   * Multi-threshold OCR attempt (tries multiple thresholds for better accuracy)
   * Based on dickreuter/Poker approach
   */
  async recognizeTextEnhanced(imageBuffer) {
    const thresholds = [76, 100, 125];  // Try different thresholds
    
    for (const threshold of thresholds) {
      try {
        const preprocessed = await this.preprocessForOCR(imageBuffer, { 
          threshold, 
          binarize: true 
        });
        
        const text = await this.recognizeText(preprocessed);
        
        // If we got valid text, return it
        if (text.length > 0) {
          return text;
        }
      } catch (error) {
        // Try next threshold
        continue;
      }
    }
    
    return ''; // All thresholds failed
  }

  /**
   * OCR for poker values (pot, stacks, bets)
   * Specialized for number recognition
   */
  async recognizePokerValue(imageBuffer) {
    try {
      // Preprocess with binarization
      const preprocessed = await this.preprocessForOCR(imageBuffer, {
        threshold: 76,
        targetWidth: 300,
        binarize: true
      });

      // Temporarily set whitelist for numbers only
      await this.worker.setParameters({
        tessedit_char_whitelist: '0123456789.$,',
      });

      const text = await this.recognizeText(preprocessed);

      // Restore original whitelist
      await this.worker.setParameters({
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789$.,/- ',
      });

      // Clean and parse value
      const cleaned = text.replace(/[^0-9.]/g, '');
      const value = parseFloat(cleaned);
      
      return isNaN(value) ? 0 : value;
    } catch (error) {
      console.error('[OCR] Error recognizing poker value:', error.message);
      return 0;
    }
  }

  /**
   * Extract player information from table image
   * Assumes 6-max or 9-max table layout
   */
  async extractPlayers(imageDataURL, tableWidth, tableHeight, maxPlayers = 6) {
    const regions = this.getPlayerRegions(tableWidth, tableHeight, maxPlayers);
    const ocrResults = await this.processTableImage(imageDataURL, regions);

    if (!ocrResults) return [];

    const players = [];
    
    for (let seat = 0; seat < maxPlayers; seat++) {
      const nameText = ocrResults[`seat_${seat}_name`] || '';
      const stackText = ocrResults[`seat_${seat}_stack`] || '';

      // Skip empty seats
      if (!nameText || nameText.length < 2) continue;

      players.push({
        seat,
        name: this.cleanPlayerName(nameText),
        stack: this.parseStack(stackText),
        position: null // Will be calculated later
      });
    }

    return players;
  }

  /**
   * Get predefined regions for player seats
   * This is a simplified layout - needs calibration for actual GGPoker client
   */
  getPlayerRegions(tableWidth, tableHeight, maxPlayers) {
    const regions = [];
    
    // Example layout for 6-max table (percentages of table dimensions)
    const seatPositions = maxPlayers === 6 ? [
      { x: 0.50, y: 0.85 }, // Seat 0: Bottom center (Hero typical position)
      { x: 0.15, y: 0.65 }, // Seat 1: Left middle
      { x: 0.15, y: 0.35 }, // Seat 2: Left top
      { x: 0.50, y: 0.15 }, // Seat 3: Top center
      { x: 0.85, y: 0.35 }, // Seat 4: Right top
      { x: 0.85, y: 0.65 }, // Seat 5: Right middle
    ] : [
      // 9-max layout (to be calibrated)
      { x: 0.50, y: 0.85 },
      { x: 0.25, y: 0.75 },
      { x: 0.10, y: 0.55 },
      { x: 0.10, y: 0.35 },
      { x: 0.25, y: 0.15 },
      { x: 0.50, y: 0.10 },
      { x: 0.75, y: 0.15 },
      { x: 0.90, y: 0.35 },
      { x: 0.90, y: 0.55 },
    ];

    for (let i = 0; i < maxPlayers; i++) {
      const pos = seatPositions[i];
      
      // Player name region (above player position)
      regions.push({
        name: `seat_${i}_name`,
        x: Math.floor(pos.x * tableWidth - 60),
        y: Math.floor(pos.y * tableHeight - 40),
        width: 120,
        height: 20
      });

      // Stack size region (below player name)
      regions.push({
        name: `seat_${i}_stack`,
        x: Math.floor(pos.x * tableWidth - 50),
        y: Math.floor(pos.y * tableHeight - 20),
        width: 100,
        height: 18
      });
    }

    return regions;
  }

  /**
   * Extract pot size from table image
   */
  async extractPot(imageDataURL, tableWidth, tableHeight) {
    const potRegion = {
      name: 'pot',
      x: Math.floor(tableWidth * 0.40),
      y: Math.floor(tableHeight * 0.45),
      width: Math.floor(tableWidth * 0.20),
      height: 30
    };

    const result = await this.processTableImage(imageDataURL, [potRegion]);
    
    if (!result || !result.pot) return 0;

    return this.parseAmount(result.pot);
  }

  /**
   * Clean up player name from OCR output
   */
  cleanPlayerName(text) {
    // Remove common OCR artifacts
    return text
      .replace(/[^\w\s-]/g, '') // Remove special chars except dash
      .trim()
      .substring(0, 20); // Limit length
  }

  /**
   * Parse stack size from text
   */
  parseStack(text) {
    const match = text.match(/\$?([\d,]+\.?\d*)/);
    if (!match) return 0;
    
    return parseFloat(match[1].replace(/,/g, ''));
  }

  /**
   * Parse monetary amount from text
   */
  parseAmount(text) {
    const match = text.match(/\$?([\d,]+\.?\d*)/);
    if (!match) return 0;
    
    return parseFloat(match[1].replace(/,/g, ''));
  }

  /**
   * Detect current action on table
   */
  async detectAction(imageDataURL, tableWidth, tableHeight) {
    // Action typically appears in center-bottom area
    const actionRegion = {
      name: 'action',
      x: Math.floor(tableWidth * 0.35),
      y: Math.floor(tableHeight * 0.55),
      width: Math.floor(tableWidth * 0.30),
      height: 40
    };

    const result = await this.processTableImage(imageDataURL, [actionRegion]);
    
    if (!result || !result.action) return null;

    return this.parseAction(result.action);
  }

  /**
   * Parse action text (e.g., "Player raises to $2.50")
   */
  parseAction(text) {
    const lowerText = text.toLowerCase();
    
    // Match patterns
    if (lowerText.includes('fold')) return { action: 'fold', amount: 0 };
    if (lowerText.includes('check')) return { action: 'check', amount: 0 };
    if (lowerText.includes('call')) {
      const amount = this.parseAmount(text);
      return { action: 'call', amount };
    }
    if (lowerText.includes('raise') || lowerText.includes('bet')) {
      const amount = this.parseAmount(text);
      return { action: lowerText.includes('raise') ? 'raise' : 'bet', amount };
    }
    if (lowerText.includes('all')) {
      return { action: 'all-in', amount: this.parseAmount(text) };
    }

    return null;
  }

  /**
   * Template matching for button/element detection
   * Based on dickreuter/Poker approach using OpenCV-style matching
   */
  async matchTemplate(screenshotBuffer, templateBuffer, options = {}) {
    const {
      threshold = 0.01,      // Match quality threshold (0.01 = 99% match required)
      method = 'sqdiff'      // 'sqdiff' or 'ccorr' (squared difference or correlation)
    } = options;

    try {
      const { createCanvas, loadImage } = require('canvas');
      
      // Load both images
      const screenshot = await loadImage(screenshotBuffer);
      const template = await loadImage(templateBuffer);
      
      const canvas = createCanvas(screenshot.width, screenshot.height);
      const ctx = canvas.getContext('2d');
      
      // Simple template matching implementation
      // For production, would use opencv4nodejs or similar
      const matches = [];
      const templateWidth = template.width;
      const templateHeight = template.height;
      
      // Slide template across screenshot
      for (let y = 0; y <= screenshot.height - templateHeight; y += 5) {
        for (let x = 0; x <= screenshot.width - templateWidth; x += 5) {
          // Extract region from screenshot
          ctx.drawImage(screenshot, -x, -y);
          const region = ctx.getImageData(0, 0, templateWidth, templateHeight);
          
          // Calculate similarity (simplified version)
          const similarity = this.calculateImageSimilarity(region, template);
          
          if (similarity <= threshold) {
            matches.push({ x, y, similarity });
          }
        }
      }
      
      // Return best match
      if (matches.length > 0) {
        matches.sort((a, b) => a.similarity - b.similarity);
        return matches[0]; // Best match
      }
      
      return null;
    } catch (error) {
      console.error('[OCR] Template matching error:', error.message);
      return null;
    }
  }

  /**
   * Calculate image similarity (simplified for demo)
   * Production version would use proper OpenCV algorithms
   */
  calculateImageSimilarity(region1, region2) {
    // Simplified - just return a random similarity for now
    // In production, implement proper squared difference or correlation
    return Math.random() * 0.1;
  }

  /**
   * Detect if button is present using template matching
   */
  async detectButton(screenshotBuffer, buttonTemplate) {
    const match = await this.matchTemplate(screenshotBuffer, buttonTemplate, {
      threshold: 0.01  // Very strict matching
    });
    
    return match !== null;
  }

  /**
   * Find top-left corner reference point
   * Based on dickreuter/Poker top-left corner system
   */
  async findTopLeftCorner(screenshotBuffer, cornerTemplateBuffer) {
    const match = await this.matchTemplate(screenshotBuffer, cornerTemplateBuffer, {
      threshold: 0.01
    });
    
    if (match) {
      console.log(`[OCR] Top-left corner found at (${match.x}, ${match.y})`);
      return { x: match.x, y: match.y };
    }
    
    console.log('[OCR] Top-left corner not found');
    return null;
  }

  /**
   * Crop screenshot relative to top-left corner
   * Implements dickreuter/Poker reference system
   */
  async cropFromTopLeftCorner(screenshotBuffer, cornerPosition, cropWidth = 800, cropHeight = 600) {
    try {
      const cropped = await sharp(screenshotBuffer)
        .extract({
          left: cornerPosition.x,
          top: cornerPosition.y,
          width: cropWidth,
          height: cropHeight
        })
        .toBuffer();
      
      return cropped;
    } catch (error) {
      console.error('[OCR] Error cropping from corner:', error.message);
      throw error;
    }
  }

  /**
   * Detect active players by checking for covered card icons
   * Based on dickreuter/Poker player detection approach
   */
  async detectActivePlayers(screenshotBuffer, coveredCardTemplate, seatPositions) {
    const activePlayers = [];
    
    for (let i = 0; i < seatPositions.length; i++) {
      const pos = seatPositions[i];
      
      // Extract region around seat position
      try {
        const seatRegion = await sharp(screenshotBuffer)
          .extract({
            left: Math.floor(pos.x - 20),
            top: Math.floor(pos.y - 20),
            width: 40,
            height: 40
          })
          .toBuffer();
        
        // Check if covered card icon is present
        const hasCard = await this.matchTemplate(seatRegion, coveredCardTemplate, {
          threshold: 0.05  // Slightly more lenient for card detection
        });
        
        if (hasCard) {
          activePlayers.push(i);
        }
      } catch (error) {
        // Seat position outside screenshot bounds, skip
        continue;
      }
    }
    
    console.log(`[OCR] Active players detected at seats: ${activePlayers.join(', ')}`);
    return activePlayers;
  }

  /**
   * Cleanup resources
   */
  async terminate() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.ready = false;
      console.log('[OCR] Worker terminated');
    }
  }
}

module.exports = { OCRProcessor };
