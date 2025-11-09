// table_config.cjs - Table-specific coordinate configurations
// Based on dickreuter/Poker table dictionary approach

/**
 * GGPoker Rush & Cash table configuration
 * All coordinates are relative to the top-left corner reference point
 */
const GGPOKER_RUSH_CASH_CONFIG = {
  name: 'GGPoker Rush & Cash',
  maxPlayers: 6,
  
  // Top-left corner template (to be calibrated)
  // This is the reference point for all coordinates
  topLeftCorner: {
    width: 50,
    height: 50,
    // Template image path would go here
    templatePath: null  // To be added during calibration
  },
  
  // Standard crop dimensions after finding corner
  cropWidth: 1200,
  cropHeight: 800,
  
  // Region definitions (all relative to top-left corner)
  regions: {
    // Pot display area
    totalPot: {
      x: 500,
      y: 350,
      width: 200,
      height: 40
    },
    
    currentBet: {
      x: 500,
      y: 390,
      width: 200,
      height: 30
    },
    
    // Hero cards area
    myCards: {
      x: 550,
      y: 650,
      width: 100,
      height: 70
    },
    
    // Community cards
    communityCards: {
      x: 450,
      y: 400,
      width: 300,
      height: 80
    },
    
    // Button search area (where action buttons appear)
    buttonSearchArea: {
      x: 700,
      y: 650,
      width: 400,
      height: 100
    },
    
    // Individual button regions (within buttonSearchArea)
    foldButton: { x: 720, y: 670, width: 80, height: 40 },
    checkButton: { x: 820, y: 670, width: 80, height: 40 },
    callButton: { x: 820, y: 670, width: 80, height: 40 },
    raiseButton: { x: 920, y: 670, width: 80, height: 40 },
    
    // Button value displays (call/raise amounts)
    callValue: { x: 820, y: 710, width: 80, height: 20 },
    raiseValue: { x: 920, y: 710, width: 80, height: 20 },
    
    // Player positions (seat 0 = hero, 1-5 = opponents)
    // Each position has: name area, stack area, cards area, dealer button area
    playerPositions: [
      // Seat 0 - Hero (bottom center)
      {
        seat: 0,
        name: { x: 550, y: 620, width: 100, height: 20 },
        stack: { x: 550, y: 640, width: 100, height: 20 },
        cards: { x: 550, y: 650, width: 100, height: 70 },
        pot: { x: 550, y: 600, width: 80, height: 20 },
        dealerButton: { x: 650, y: 630, width: 30, height: 30 }
      },
      // Seat 1 - Left
      {
        seat: 1,
        name: { x: 150, y: 400, width: 100, height: 20 },
        stack: { x: 150, y: 420, width: 100, height: 20 },
        cards: { x: 200, y: 450, width: 60, height: 40 },
        pot: { x: 250, y: 400, width: 80, height: 20 },
        dealerButton: { x: 250, y: 410, width: 30, height: 30 }
      },
      // Seat 2 - Top left
      {
        seat: 2,
        name: { x: 200, y: 150, width: 100, height: 20 },
        stack: { x: 200, y: 170, width: 100, height: 20 },
        cards: { x: 250, y: 200, width: 60, height: 40 },
        pot: { x: 300, y: 200, width: 80, height: 20 },
        dealerButton: { x: 300, y: 160, width: 30, height: 30 }
      },
      // Seat 3 - Top right
      {
        seat: 3,
        name: { x: 900, y: 150, width: 100, height: 20 },
        stack: { x: 900, y: 170, width: 100, height: 20 },
        cards: { x: 890, y: 200, width: 60, height: 40 },
        pot: { x: 820, y: 200, width: 80, height: 20 },
        dealerButton: { x: 870, y: 160, width: 30, height: 30 }
      },
      // Seat 4 - Right
      {
        seat: 4,
        name: { x: 950, y: 400, width: 100, height: 20 },
        stack: { x: 950, y: 420, width: 100, height: 20 },
        cards: { x: 940, y: 450, width: 60, height: 40 },
        pot: { x: 870, y: 400, width: 80, height: 20 },
        dealerButton: { x: 920, y: 410, width: 30, height: 30 }
      },
      // Seat 5 - Bottom right
      {
        seat: 5,
        name: { x: 800, y: 620, width: 100, height: 20 },
        stack: { x: 800, y: 640, width: 100, height: 20 },
        cards: { x: 750, y: 650, width: 60, height: 40 },
        pot: { x: 720, y: 600, width: 80, height: 20 },
        dealerButton: { x: 750, y: 630, width: 30, height: 30 }
      }
    ]
  },
  
  // Template images (to be added during calibration)
  templates: {
    foldButton: null,
    checkButton: null,
    callButton: null,
    raiseButton: null,
    betButton: null,
    dealerButton: null,
    coveredCard: null,  // For detecting active players
    // Card templates (52 cards)
    cards: {}  // Will be populated: { '2c': <buffer>, '2d': <buffer>, ... }
  }
};

/**
 * Regular GGPoker table configuration (non-Rush & Cash)
 */
const GGPOKER_REGULAR_CONFIG = {
  name: 'GGPoker Regular',
  maxPlayers: 9,
  // ... similar structure but for 9-max tables
  regions: {
    // To be calibrated
  }
};

/**
 * Default configuration (fallback)
 */
const DEFAULT_CONFIG = {
  name: 'Default',
  maxPlayers: 6,
  regions: {}
};

/**
 * Get configuration for a specific table type
 */
function getTableConfig(tableName) {
  switch (tableName.toLowerCase()) {
    case 'ggpoker rush & cash':
    case 'rush & cash':
      return GGPOKER_RUSH_CASH_CONFIG;
    case 'ggpoker regular':
      return GGPOKER_REGULAR_CONFIG;
    default:
      return DEFAULT_CONFIG;
  }
}

/**
 * Load custom configuration from file
 */
async function loadCustomConfig(configPath) {
  try {
    const fs = require('fs').promises;
    const data = await fs.readFile(configPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('[TableConfig] Error loading custom config:', error.message);
    return null;
  }
}

/**
 * Save configuration to file
 */
async function saveConfig(config, configPath) {
  try {
    const fs = require('fs').promises;
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf8');
    console.log('[TableConfig] Configuration saved to', configPath);
    return true;
  } catch (error) {
    console.error('[TableConfig] Error saving config:', error.message);
    return false;
  }
}

module.exports = {
  GGPOKER_RUSH_CASH_CONFIG,
  GGPOKER_REGULAR_CONFIG,
  DEFAULT_CONFIG,
  getTableConfig,
  loadCustomConfig,
  saveConfig
};

// Auto-generated calibrated configuration - 2025-10-24T04:57:05.248Z
const GGPOKER_RUSH_CASH_CALIBRATED = {
  "name": "GGPoker Rush & Cash (Calibrated)",
  "maxPlayers": 6,
  "calibratedAt": "2025-10-24T04:57:05.246Z",
  "topLeftCorner": {
    "width": 334,
    "height": 63,
    "templatePath": "./templates/topLeftCorner_template.png"
  },
  "cropWidth": 1200,
  "cropHeight": 800,
  "regions": {
    "totalPot": {
      "x": 485,
      "y": 299,
      "width": 277,
      "height": 81
    },
    "buttonSearchArea": {
      "x": 695,
      "y": 774,
      "width": 400,
      "height": 100
    },
    "playerPositions": [
      {
        "seat": 0,
        "name": {
          "x": 517,
          "y": 648,
          "width": 122,
          "height": 68
        },
        "stack": {
          "x": 517,
          "y": 806,
          "width": 122,
          "height": 68
        },
        "cards": {
          "x": 660,
          "y": 648,
          "width": 61,
          "height": 113
        }
      },
      {
        "seat": 1,
        "name": {
          "x": 33,
          "y": 500,
          "width": 111,
          "height": 65
        },
        "stack": {
          "x": 33,
          "y": 653,
          "width": 111,
          "height": 65
        },
        "cards": {
          "x": 163,
          "y": 500,
          "width": 56,
          "height": 109
        }
      },
      {
        "seat": 2,
        "name": {
          "x": 64,
          "y": 128,
          "width": 113,
          "height": 65
        },
        "stack": {
          "x": 64,
          "y": 281,
          "width": 113,
          "height": 65
        },
        "cards": {
          "x": 196,
          "y": 128,
          "width": 57,
          "height": 109
        }
      },
      {
        "seat": 3,
        "name": {
          "x": 507,
          "y": 38,
          "width": 126,
          "height": 66
        },
        "stack": {
          "x": 507,
          "y": 191,
          "width": 126,
          "height": 66
        },
        "cards": {
          "x": 654,
          "y": 38,
          "width": 63,
          "height": 110
        }
      },
      {
        "seat": 4,
        "name": {
          "x": 960,
          "y": 126,
          "width": 130,
          "height": 69
        },
        "stack": {
          "x": 960,
          "y": 287,
          "width": 130,
          "height": 69
        },
        "cards": {
          "x": 1111,
          "y": 126,
          "width": 65,
          "height": 115
        }
      },
      {
        "seat": 5,
        "name": {
          "x": 996,
          "y": 518,
          "width": 127,
          "height": 61
        },
        "stack": {
          "x": 996,
          "y": 660,
          "width": 127,
          "height": 61
        },
        "cards": {
          "x": 1144,
          "y": 518,
          "width": 64,
          "height": 102
        }
      }
    ]
  },
  "templates": {
    "foldButton": "./templates/foldButton_template.png",
    "callButton": "./templates/callButton_template.png",
    "raiseButton": "./templates/raiseButton_template.png",
    "dealerButton": "./templates/dealerButton_template.png",
    "coveredCard": "./templates/coveredCard_template.png"
  }
};

module.exports.GGPOKER_RUSH_CASH_CALIBRATED = GGPOKER_RUSH_CASH_CALIBRATED;
