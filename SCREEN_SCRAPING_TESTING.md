# Testing Screen Scraping System

## Quick Start Guide

### Phase 1: Basic Testing (Window Detection)

The screen scraping infrastructure is now integrated. Here's how to test it:

#### 1. Enable Screen Scraping Mode

**Option A: Via Browser Console (Developer Tools)**

Open the poker parser app, press `F12` to open DevTools, and run:

```javascript
// Enable screen scraping
await window.api.invoke('hud:enableScreenScraping');

// Start HUD with screen scraping
await window.api.invoke('hudv3:start');

// Check status
const status = await window.api.invoke('hudv3:status');
console.log('Screen Scraping Status:', status.screenScraping);
```

**Option B: Modify electron-main.cjs (Permanent Enable)**

Find the `setupLiveTrackerIntegration()` function and add:

```javascript
async function setupLiveTrackerIntegration() {
  // ... existing code ...
  
  // Enable screen scraping by default
  if (hudManager) {
    await hudManager.enableScreenScraping();
    console.log('✅ Screen scraping enabled automatically');
  }
}
```

#### 2. Open a GGPoker Table

1. Launch GGPoker client
2. Sit at a "Rush & Cash" table (or any table with "$X/$Y" in title)
3. The screen scraper should automatically detect the window

#### 3. Monitor Console Output

Watch the Electron console for:

```
[Screen Scraper] Starting table monitoring...
[OCR] Initializing Tesseract worker...
[OCR] Tesseract worker ready
[Screen Scraper] Captured table_12345: Rush & Cash ($0.01/$0.02)
```

#### 4. Check Tracked Tables

```javascript
// Get list of detected tables
const status = await window.api.invoke('hudv3:status');
console.log('Tracked Tables:', status.screenScraping.trackedTables);
```

### Phase 2: Calibration (Requires Real Screenshots)

#### Step 1: Capture a Reference Screenshot

Create a test file `test-capture.js`:

```javascript
const { app, BrowserWindow, desktopCapturer } = require('electron');
const fs = require('fs');

app.whenReady().then(async () => {
  const sources = await desktopCapturer.getSources({
    types: ['window'],
    thumbnailSize: { width: 1920, height: 1080 }
  });
  
  const ggSource = sources.find(s => 
    s.name.includes('Rush & Cash') || 
    s.name.includes('GGPoker')
  );
  
  if (ggSource) {
    const image = ggSource.thumbnail.toPNG();
    fs.writeFileSync('ggpoker-table-screenshot.png', image);
    console.log('✅ Screenshot saved to ggpoker-table-screenshot.png');
    console.log(`   Size: ${ggSource.thumbnail.getSize().width}x${ggSource.thumbnail.getSize().height}`);
  } else {
    console.log('❌ GGPoker window not found');
    console.log('Available windows:', sources.map(s => s.name));
  }
  
  app.quit();
});
```

Run: `node test-capture.js`

#### Step 2: Measure Player Positions

1. Open `ggpoker-table-screenshot.png` in an image editor
2. Note the total table dimensions (width x height)
3. For each player seat, measure:
   - Player name X, Y coordinates (top-left corner)
   - Name text width and height
   - Stack text X, Y (usually below name)
   - Stack text width and height

Example measurements for 6-max:
```
Table: 1280x720

Seat 0 (Hero, bottom center):
  Name: x=580, y=620, w=120, h=20
  Stack: x=590, y=640, w=100, h=18

Seat 1 (left middle):
  Name: x=100, y=400, w=120, h=20
  Stack: x=110, y=420, w=100, h=18

... (repeat for all 6 seats)
```

#### Step 3: Update OCR Regions

Edit `lib/ocr_processor.cjs`, find `getPlayerRegions()`:

```javascript
getPlayerRegions(tableWidth, tableHeight, maxPlayers) {
  const regions = [];
  
  // CALIBRATED POSITIONS for GGPoker 6-max
  // Based on measurements from real table screenshot
  const seatPositions = [
    // Seat 0: Bottom center (Hero)
    { x: 580, y: 620, nameW: 120, nameH: 20, stackY: 640, stackW: 100, stackH: 18 },
    // Seat 1: Left middle
    { x: 100, y: 400, nameW: 120, nameH: 20, stackY: 420, stackW: 100, stackH: 18 },
    // ... add your measured values
  ];

  for (let i = 0; i < maxPlayers; i++) {
    const pos = seatPositions[i];
    
    regions.push({
      name: `seat_${i}_name`,
      x: pos.x,
      y: pos.y,
      width: pos.nameW,
      height: pos.nameH
    });

    regions.push({
      name: `seat_${i}_stack`,
      x: pos.x + 10,
      y: pos.stackY,
      width: pos.stackW,
      height: pos.stackH
    });
  }

  return regions;
}
```

#### Step 4: Test OCR Accuracy

Enable debug logging in `lib/ocr_processor.cjs`:

```javascript
async extractPlayers(imageDataURL, tableWidth, tableHeight, maxPlayers = 6) {
  const regions = this.getPlayerRegions(tableWidth, tableHeight, maxPlayers);
  const ocrResults = await this.processTableImage(imageDataURL, regions);

  console.log('[OCR] Raw Results:', ocrResults); // DEBUG

  const players = [];
  
  for (let seat = 0; seat < maxPlayers; seat++) {
    const nameText = ocrResults[`seat_${seat}_name`] || '';
    const stackText = ocrResults[`seat_${seat}_stack`] || '';

    console.log(`[OCR] Seat ${seat}: name="${nameText}" stack="${stackText}"`); // DEBUG

    if (!nameText || nameText.length < 2) continue;

    players.push({
      seat,
      name: this.cleanPlayerName(nameText),
      stack: this.parseStack(stackText),
      position: null
    });
  }

  return players;
}
```

### Phase 3: Adjust Capture Frequency

If OCR is slow or CPU usage is high:

```javascript
// Reduce frequency (capture every 2 seconds instead of 1)
await window.api.invoke('hud:setCaptureFrequency', 2000);

// For fast tables (every 500ms)
await window.api.invoke('hud:setCaptureFrequency', 500);
```

### Phase 4: Monitor Live Tracking

Once OCR is working, players should be registered with the live tracker:

```javascript
// Check live tracker status
const status = await window.api.invoke('hudv3:status');
console.log('Active HUD:', status.active);
console.log('Screen Scraping:', status.screenScraping.enabled);

// After a few captures, check if players were detected
// (This data flows through the HUD update pipeline)
```

### Troubleshooting

#### Issue: "OCR returns empty strings"

**Cause**: Regions are not aligned with actual UI elements

**Solution**:
1. Capture screenshot and verify dimensions
2. Measure exact pixel coordinates
3. Update `getPlayerRegions()` with real values
4. Test with a single region first

#### Issue: "OCR returns garbled text"

**Cause**: Text is too small or blurry

**Solution** in `lib/ocr_processor.cjs`:
```javascript
async cropImage(imageBuffer, region) {
  const cropped = await sharp(imageBuffer)
    .extract({ left: x, top: y, width, height })
    .resize({ width: width * 2, height: height * 2 }) // 2x upscale
    .greyscale()
    .normalize()
    .sharpen() // Add sharpening
    .threshold(128) // Binary threshold
    .toBuffer();

  return cropped;
}
```

#### Issue: "High CPU usage"

**Cause**: Processing entire table every second

**Solutions**:
1. Increase capture frequency to 2000ms or 5000ms
2. Process only regions that change (needs diff logic)
3. Use smaller thumbnail size in `desktopCapturer`

#### Issue: "Tables not detected"

**Cause**: Window title doesn't match pattern

**Solution** in `lib/screen_scraper.cjs`:
```javascript
detectPokerWindows() {
  // Add your specific window title pattern
  const psCommand = `Get-Process | Where-Object {
    $_.MainWindowTitle -ne "" -and
    ($_.MainWindowTitle -match "Rush & Cash|Hold'?em|YourPattern")
  }`;
}
```

### Performance Tips

1. **Start with high capture frequency (2000ms)** to reduce CPU load during calibration
2. **Process only name regions first**, skip stacks until names are working
3. **Use grayscale images** (already implemented) for faster OCR
4. **Cache player names** once detected (don't OCR every frame)
5. **Only OCR when screen changes** (compare image hashes)

### Expected Output (When Working)

```
[Screen Scraper] Starting table monitoring...
[OCR] Initializing Tesseract worker...
[OCR] Tesseract worker ready
[Screen Scraper] Captured table_12345: Rush & Cash ($0.01/$0.02)
[OCR] Detected 6 players via OCR
[HUD] Processing scraped data for table_12345
[Live Tracker] Registered player at seat 0: PlayerName123
[Live Tracker] Registered player at seat 1: Opponent456
[Live Tracker] Registered player at seat 3: Fish789
[HUD] Updating HUD for table_12345
📊 Live stats for table_12345: 3 players tracked
```

### Next Steps After Basic Testing

1. ✅ Verify window detection works
2. ✅ Capture reference screenshot
3. ✅ Measure and calibrate regions
4. ✅ Test OCR accuracy on player names
5. ✅ Add stack parsing
6. ⏳ Implement action detection
7. ⏳ Track hand progression
8. ⏳ Calculate real-time stats

### Current Limitations

1. **Seat positions are estimates** - Need real measurements
2. **OCR accuracy unknown** - Depends on GGPoker UI font/size
3. **No action tracking yet** - Can detect players but not their actions
4. **Hero detection missing** - Don't know which seat is the player
5. **Single table only** - Multi-table needs more work

### Testing Checklist

- [ ] Install dependencies (`npm install` already done)
- [ ] Start app successfully
- [ ] Enable screen scraping mode
- [ ] Open GGPoker table
- [ ] Verify window detection in console
- [ ] Capture reference screenshot
- [ ] Measure player coordinates
- [ ] Update `getPlayerRegions()` with real values
- [ ] Test OCR on player names
- [ ] Verify players registered in live tracker
- [ ] See HUD update with player stats

---

**Ready to test!** Start with Phase 1 to verify window detection, then move to Phase 2 for calibration once you have GGPoker running.
