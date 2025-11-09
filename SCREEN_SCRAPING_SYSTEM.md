# Screen Scraping System for GGPoker

## Overview

Since GGPoker does not provide hand history file exports by default, we've implemented a **screen scraping + OCR system** to enable real-time HUD tracking by capturing and analyzing poker table windows.

## Architecture

```
GGPoker Table Window
        ↓
Screen Capture (Electron desktopCapturer)
        ↓
Image Processing (Sharp)
        ↓
OCR Text Recognition (Tesseract.js)
        ↓
Data Extraction & Parsing
        ↓
Live Tracker (Session Stats)
        ↓
HUD Display (Real-time Updates)
```

## Components

### 1. ScreenScraper (`lib/screen_scraper.cjs`)

**Purpose**: Detect and capture GGPoker table windows

**Key Features**:
- **Window Detection**: Uses PowerShell to find GGPoker windows with window titles matching poker patterns
- **Screen Capture**: Uses Electron's `desktopCapturer` API to capture window screenshots
- **Multi-table Support**: Tracks multiple tables simultaneously
- **Configurable Frequency**: Capture rate from 500ms to 5000ms (default: 1000ms)

**Methods**:
- `start()` - Begin monitoring tables
- `stop()` - Stop monitoring
- `detectPokerWindows()` - Find GGPoker windows using PowerShell
- `captureTable(tableId, windowInfo)` - Capture specific table screenshot
- `setCaptureFrequency(ms)` - Adjust capture rate

### 2. OCRProcessor (`lib/ocr_processor.cjs`)

**Purpose**: Extract text and data from table screenshots using OCR

**Key Features**:
- **Text Recognition**: Tesseract.js OCR engine with poker-optimized settings
- **Image Preprocessing**: Sharp library for cropping, grayscale, contrast enhancement
- **Region-based Extraction**: Targets specific areas (player names, stacks, pot, actions)
- **Pattern Matching**: Parses monetary amounts, action types, player names

**Methods**:
- `initialize()` - Start Tesseract worker
- `processTableImage(imageDataURL, regions)` - Run OCR on image regions
- `extractPlayers(imageDataURL, width, height, maxPlayers)` - Get all player data
- `extractPot(imageDataURL, width, height)` - Read pot size
- `detectAction(imageDataURL, width, height)` - Read current action
- `parseAction(text)` - Convert action text to structured data

### 3. HUD Manager Integration

**New Properties**:
```javascript
this.screenScraper = new ScreenScraper();
this.ocrProcessor = new OCRProcessor();
this.useScreenScraping = false; // Enable for GGPoker
```

**New Methods**:
- `startScreenScraping()` - Begin capture loop
- `processScrapedTableData(tableData)` - Handle captured data
- `enableScreenScraping()` - Turn on OCR mode
- `disableScreenScraping()` - Turn off OCR mode
- `setScreenCaptureFrequency(ms)` - Adjust capture rate
- `getScreenScrapingStatus()` - Check current state

## How It Works

### Phase 1: Window Detection (IMPLEMENTED)

```javascript
// Detect GGPoker windows using PowerShell
const windows = await screenScraper.detectPokerWindows();
// Returns: [{ Title, Handle, X, Y, Width, Height, Visible }]
```

**PowerShell Command**:
- Finds processes with MainWindowTitle matching poker patterns
- Gets window position and dimensions using Win32 API
- Returns JSON array of poker windows

### Phase 2: Screen Capture (IMPLEMENTED)

```javascript
// Capture specific table window
const sources = await desktopCapturer.getSources({
  types: ['window'],
  thumbnailSize: { width: windowWidth, height: windowHeight }
});

const tableSource = sources.find(s => s.name === windowTitle);
const imageDataURL = tableSource.thumbnail.toDataURL();
```

**Capture Process**:
1. Get all available window sources
2. Match by window title
3. Extract thumbnail as base64 data URL
4. Pass to OCR processor

### Phase 3: OCR & Data Extraction (PARTIALLY IMPLEMENTED)

```javascript
// Extract player data from screenshot
const players = await ocrProcessor.extractPlayers(
  imageDataURL,
  tableWidth,
  tableHeight,
  6 // 6-max table
);

// Returns: [{ seat, name, stack, position }]
```

**Region Definitions**:
```javascript
// Player name regions (6-max layout)
const seatPositions = [
  { x: 0.50, y: 0.85 }, // Seat 0: Bottom center (Hero)
  { x: 0.15, y: 0.65 }, // Seat 1: Left middle
  { x: 0.15, y: 0.35 }, // Seat 2: Left top
  { x: 0.50, y: 0.15 }, // Seat 3: Top center
  { x: 0.85, y: 0.35 }, // Seat 4: Right top
  { x: 0.85, y: 0.65 }, // Seat 5: Right middle
];

// Extract regions for each seat
for (let seat = 0; seat < 6; seat++) {
  const pos = seatPositions[seat];
  
  // Player name (above avatar)
  nameRegion = {
    x: pos.x * width - 60,
    y: pos.y * height - 40,
    width: 120,
    height: 20
  };
  
  // Stack size (below name)
  stackRegion = {
    x: pos.x * width - 50,
    y: pos.y * height - 20,
    width: 100,
    height: 18
  };
}
```

### Phase 4: Action Detection (NEEDS CALIBRATION)

```javascript
// Detect current action
const action = await ocrProcessor.detectAction(imageDataURL, width, height);
// Returns: { action: 'raise', amount: 2.50 }

// Parse action patterns
if (text.includes('raise')) return { action: 'raise', amount: parseAmount(text) };
if (text.includes('fold')) return { action: 'fold', amount: 0 };
if (text.includes('call')) return { action: 'call', amount: parseAmount(text) };
```

### Phase 5: Live Tracking Integration (IMPLEMENTED)

```javascript
// Register detected players
for (const player of extractedPlayers) {
  liveTracker.registerPlayer(tableId, player.seat, player.name);
}

// Track actions
liveTracker.trackPreflopAction(tableId, seat, action, amount, isBlinds);

// Update HUD
hudManager.updateHUDWindow(tableId);
```

## Usage

### Enable Screen Scraping Mode

**From Renderer (UI)**:
```javascript
// Enable OCR mode
const result = await window.api.invoke('hud:enableScreenScraping');

// Check status
const status = await window.api.invoke('hudv3:status');
console.log(status.screenScraping);
// { enabled: true, active: true, trackedTables: [...], ocrReady: true }

// Adjust capture frequency (default: 1000ms)
await window.api.invoke('hud:setCaptureFrequency', 2000); // Slower: 2 seconds

// Disable
await window.api.invoke('hud:disableScreenScraping');
```

**From Main Process**:
```javascript
// Enable during HUD initialization
hudManager.useScreenScraping = true;
await hudManager.start();

// Or enable later
await hudManager.enableScreenScraping();
```

### Monitor Captured Data

```javascript
// Set callback to process captured table data
screenScraper.setCallback((tableData) => {
  console.log('Captured:', tableData);
  // tableData includes: tableId, windowTitle, stakes, players, pot, actions
});
```

## Current Status

### ✅ COMPLETED

1. **Window Detection**
   - PowerShell-based GGPoker window finder
   - Multi-table support
   - Window position/size extraction

2. **Screen Capture**
   - Electron desktopCapturer integration
   - Configurable capture frequency
   - Auto-detection of new/closed tables

3. **OCR Infrastructure**
   - Tesseract.js worker initialization
   - Image preprocessing (Sharp)
   - Region-based text extraction

4. **Basic Data Extraction**
   - Table name from window title
   - Stakes extraction (SB/BB)
   - Game type detection

5. **HUD Integration**
   - Screen scraping mode toggle
   - IPC handlers for control
   - Status reporting

### 🔄 NEEDS CALIBRATION

1. **Player Position Regions**
   - Current positions are estimates
   - Need to capture real GGPoker screenshots
   - Adjust X/Y coordinates for each seat
   - Test with different table sizes

2. **OCR Accuracy Tuning**
   - Tesseract parameters optimization
   - Player name recognition patterns
   - Stack parsing (handle "$1,234.56" formats)
   - Action text parsing

3. **Action Detection**
   - Identify action area on GGPoker tables
   - Parse "Player raises to $X" patterns
   - Detect street changes
   - Handle multi-action sequences

4. **Board Card Recognition**
   - Detect card images or text
   - Identify suits and ranks
   - Track flop/turn/river

### 🚧 NOT YET IMPLEMENTED

1. **Advanced Pattern Recognition**
   - Button position detection
   - Active player highlighting
   - Bet slider recognition
   - Card recognition (may need image matching)

2. **Action Sequence Tracking**
   - Track multiple actions per hand
   - Detect hand end/showdown
   - Street transitions
   - Side pot calculations

3. **Hero Detection**
   - Identify which seat is the player
   - Auto-assign hero stats
   - Action button detection

4. **Performance Optimization**
   - Reduce OCR overhead
   - Only process changed regions
   - Background processing
   - Memory management

## Calibration Process

### Step 1: Capture Reference Screenshots

1. Open GGPoker and sit at a 6-max table
2. Run this test script to capture a screenshot:

```javascript
// In electron-main.cjs or create test-capture.js
const { desktopCapturer } = require('electron');

async function captureGGPoker() {
  const sources = await desktopCapturer.getSources({
    types: ['window'],
    thumbnailSize: { width: 1920, height: 1080 }
  });
  
  const ggSource = sources.find(s => s.name.includes('Rush & Cash'));
  if (!ggSource) {
    console.log('GGPoker window not found');
    return;
  }
  
  const image = ggSource.thumbnail.toPNG();
  require('fs').writeFileSync('ggpoker-screenshot.png', image);
  console.log('Screenshot saved!');
}
```

3. Analyze screenshot to find exact pixel coordinates for:
   - Each player name location
   - Each stack size location
   - Pot display
   - Action message area
   - Board cards
   - Button position

### Step 2: Update Region Coordinates

Edit `lib/ocr_processor.cjs`:

```javascript
getPlayerRegions(tableWidth, tableHeight, maxPlayers) {
  // REPLACE with actual measured coordinates from your screenshot
  const seatPositions = [
    { x: 0.50, y: 0.85 }, // Measure from screenshot
    { x: 0.15, y: 0.65 },
    // ... etc
  ];
  
  // Adjust region sizes based on actual UI
  const nameHeight = 20; // Actual font height
  const nameWidth = 120; // Actual name width
}
```

### Step 3: Test OCR Accuracy

```javascript
// Test individual regions
const testRegion = {
  name: 'test_player_name',
  x: 100,
  y: 200,
  width: 120,
  height: 20
};

const result = await ocrProcessor.processTableImage(imageDataURL, [testRegion]);
console.log('OCR Result:', result.test_player_name);
```

### Step 4: Tune Tesseract Parameters

Adjust in `lib/ocr_processor.cjs`:

```javascript
await this.worker.setParameters({
  tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789$.,/- ',
  tessedit_pageseg_mode: Tesseract.PSM.SINGLE_LINE, // Try different modes
  tessedit_ocr_engine_mode: Tesseract.OEM.DEFAULT,
  // Add preprocessing
  tessjs_create_hocr: '0',
  tessjs_create_tsv: '0',
});
```

## Performance Considerations

### Capture Frequency

**Trade-offs**:
- **500ms** - Very responsive, high CPU usage, may miss some actions
- **1000ms** (default) - Good balance for most situations
- **2000ms** - Lower CPU, may miss fast actions
- **5000ms** - Very low CPU, only for slow tables

### OCR Optimization

**Tips**:
1. **Process only changed regions** - Compare screenshots to detect changes
2. **Use smaller regions** - Don't OCR entire table every time
3. **Cache results** - Don't re-OCR static elements (player names)
4. **Async processing** - Don't block capture loop
5. **Worker pool** - Use multiple Tesseract workers for parallel OCR

## Troubleshooting

### OCR Returns Garbled Text

**Causes**:
- Region coordinates wrong
- Font too small/blurry
- Image preprocessing needed
- Wrong Tesseract language

**Solutions**:
```javascript
// Increase image quality
const croppedBuffer = await sharp(imageBuffer)
  .extract(region)
  .greyscale()
  .normalize()
  .sharpen() // Add sharpening
  .resize({ width: region.width * 2 }) // Upscale 2x
  .toBuffer();
```

### Players Not Detected

**Causes**:
- Wrong seat positions
- Player not visible (waiting for BB)
- Name truncated

**Solutions**:
- Recalibrate seat positions
- Increase region width
- Handle empty seats gracefully

### High CPU Usage

**Causes**:
- Capture frequency too high
- Processing entire image
- Multiple tables

**Solutions**:
- Reduce capture frequency
- Process only active regions
- Optimize image size
- Use worker pool

### Window Not Found

**Causes**:
- GGPoker window title different
- Process name changed
- Window minimized

**Solutions**:
```javascript
// Update pattern in screen_scraper.cjs
const match = title.match(/Rush & Cash|Hold'?em|GGPoker|YourPattern/);
```

## Next Steps

### Immediate (Phase 2)

1. **Capture reference screenshots** of actual GGPoker tables
2. **Measure exact pixel coordinates** for all UI elements
3. **Update region definitions** in OCRProcessor
4. **Test OCR accuracy** on real table data
5. **Implement action tracking** from detected text

### Short-term (Phase 3)

1. **Hero detection** - Identify player's own seat
2. **Action sequence tracking** - Build hand history from screen data
3. **Street detection** - Know when flop/turn/river appears
4. **Pot tracking** - Monitor pot changes

### Long-term (Phase 4)

1. **Card recognition** - Use image matching for board cards
2. **Button detection** - Find dealer button position
3. **Multi-table optimization** - Handle 4-6 tables efficiently
4. **Machine learning** - Train model for better recognition

## Alternative Approaches

### If OCR Proves Unreliable

1. **Template Matching**
   - Store card images as templates
   - Use image matching instead of OCR for cards
   - Faster than OCR, more accurate

2. **UI Automation**
   - If GGPoker uses accessible UI elements
   - Read directly from DOM (if web-based)
   - Hook into GGPoker process memory (advanced)

3. **Hybrid Approach**
   - OCR for text (names, amounts)
   - Image matching for cards, buttons
   - Pattern recognition for positions

## Conclusion

The screen scraping system provides a **foundation for real-time GGPoker HUD** without relying on hand history files. While **calibration and tuning are required** for production use, the architecture is solid and extensible.

**Current state**: ✅ Infrastructure complete, 🔄 Needs calibration
**Next action**: Capture real GGPoker screenshots and calibrate regions
**Estimated calibration time**: 2-4 hours with real data

---

**Documentation version**: 1.0
**Last updated**: October 24, 2025
