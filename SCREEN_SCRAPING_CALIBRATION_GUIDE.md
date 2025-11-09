# Screen Scraping Calibration Guide

This guide explains how to calibrate the screen scraping system for GGPoker tables using the dickreuter/Poker approach.

## Overview

The calibration process involves:
1. **Capturing reference screenshots**
2. **Marking the top-left corner** (reference point)
3. **Defining regions** for each UI element
4. **Saving template images** for buttons/cards
5. **Testing accuracy**

## Prerequisites

- GGPoker client installed and running
- Poker table open (Rush & Cash or regular)
- Screen resolution: 1920x1080 recommended
- No DPI scaling (100% display scale)

## Step 1: Capture Reference Screenshot

1. Open a GGPoker Rush & Cash table
2. Wait for a hand to start (so all UI elements are visible)
3. Take a screenshot using the built-in capture tool:
   ```javascript
   // In developer console or add IPC handler
   ipcRenderer.invoke('hudv3:captureTable', tableId)
   ```
4. Screenshot will be saved to `./screenshots/calibration/`

## Step 2: Mark Top-Left Corner

The **top-left corner** is the reference point for all coordinates.

### What to Mark:
- Find a **unique, static element** in the top-left of the poker window
- Good choices:
  - GGPoker logo in window titlebar
  - Table border corner
  - Any unchanging UI element
- Mark a **50x50 pixel region** around this element

### How to Mark:
1. Open `./screenshots/calibration/table_capture.png`
2. Use image editor (Paint, Photoshop, GIMP)
3. Select 50x50 pixel region at top-left corner
4. Save as `topleft_corner_template.png`

### Example:
```
[GGPoker Logo]   Rush & Cash Table
     ↑
  Mark this 50x50 region
```

## Step 3: Define Regions

All regions are **relative to the top-left corner**.

### Required Regions:

#### A. Pot Display
```javascript
totalPot: {
  x: 500,    // Pixels from top-left corner X
  y: 350,    // Pixels from top-left corner Y
  width: 200,
  height: 40
}
```

**How to find**: Measure from top-left corner to pot display area.

#### B. Action Buttons
```javascript
buttonSearchArea: {
  x: 700,
  y: 650,
  width: 400,
  height: 100
}
```

**Contains**: Fold, Check, Call, Raise buttons

#### C. Player Positions (6 seats)
For each seat (0-5):
```javascript
{
  seat: 0,  // 0 = Hero
  name: { x: 550, y: 620, width: 100, height: 20 },
  stack: { x: 550, y: 640, width: 100, height: 20 },
  cards: { x: 550, y: 650, width: 100, height: 70 },
  pot: { x: 550, y: 600, width: 80, height: 20 },
  dealerButton: { x: 650, y: 630, width: 30, height: 30 }
}
```

**Seat Layout** (6-max):
```
        [2]     [3]
    [1]             [4]
         [0]   [5]
```

### Calibration Tool (Coming Soon)

We'll create an interactive calibration tool:
```javascript
// Run calibration GUI
npm run calibrate

// Opens window where you can:
// 1. Load screenshot
// 2. Click to mark regions
// 3. Test OCR on each region
// 4. Save configuration
```

## Step 4: Save Template Images

Template images are used for **template matching** (detecting buttons, cards, etc).

### Required Templates:

#### Buttons
1. **Fold Button** (`fold_button_template.png`)
   - Crop just the fold button from screenshot
   - Save as 80x40 pixel image
   
2. **Call Button** (`call_button_template.png`)
   
3. **Check Button** (`check_button_template.png`)
   
4. **Raise Button** (`raise_button_template.png`)

5. **Dealer Button** (`dealer_button_template.png`)
   - Small circular button showing dealer position

#### Player Indicators
1. **Covered Card** (`covered_card_template.png`)
   - The face-down card icon shown for active players
   - Used to detect which seats have players

#### Cards (Optional - Advanced)
For neural network card recognition:
- Save all 52 cards as separate images
- Format: `2c.png`, `3h.png`, `ts.png`, `as.png`, etc.
- Size: 15x50 pixels (as per dickreuter/Poker)

### Template Storage:
```
./templates/
  ggpoker_rush_cash/
    topleft_corner_template.png
    fold_button_template.png
    call_button_template.png
    check_button_template.png
    raise_button_template.png
    dealer_button_template.png
    covered_card_template.png
    cards/
      2c.png, 2d.png, 2h.png, 2s.png
      ... (52 total)
```

## Step 5: Test OCR Accuracy

Test each region's OCR accuracy:

### A. Pot Reading
```javascript
// Should read within ±$0.01
Expected: $1.50
OCR Result: $1.50 ✓
```

### B. Stack Reading
```javascript
Expected: $25.63
OCR Result: $25.63 ✓
```

### C. Button Detection
```javascript
// Template matching should be 100% accurate
Fold button present: true ✓
Call button present: true ✓
Raise button present: true ✓
```

### D. Player Detection
```javascript
// Covered card detection
Active seats: [0, 2, 4, 5] ✓
```

## Step 6: Fine-Tune Parameters

If OCR accuracy is poor:

### A. Adjust Binarization Threshold
```javascript
// In ocr_processor.cjs
const thresholds = [76, 100, 125];  // Try different values

// Test which threshold works best for your screen
```

### B. Adjust Region Sizes
```javascript
// If text is cut off, increase region size
stack: { x: 550, y: 640, width: 120, height: 25 }  // +20 width, +5 height
```

### C. Improve Contrast
```javascript
// Add contrast enhancement in preprocessing
.normalize()
.modulate({ brightness: 1.2, saturation: 1.0 })
```

## Step 7: Save Configuration

Save your calibrated configuration:

```javascript
const fs = require('fs');
const config = {
  name: 'GGPoker Rush & Cash - 1920x1080',
  // ... all regions and settings
};

fs.writeFileSync(
  './configs/ggpoker_rush_cash_1920x1080.json',
  JSON.stringify(config, null, 2)
);
```

## Testing Checklist

Before using in production:

- [ ] Top-left corner detected in 100% of screenshots
- [ ] Pot reading accurate to ±$0.01
- [ ] Stack reading accurate to ±$0.01
- [ ] Button detection 100% accurate (no false positives/negatives)
- [ ] Player detection 100% accurate
- [ ] Works across different lighting/table themes
- [ ] Tested on 20+ different game states

## Common Issues

### Issue 1: Top-Left Corner Not Found
**Solution**: Choose a more unique corner element, increase threshold to 0.05

### Issue 2: OCR Reading Wrong Numbers
**Solution**: 
- Check region is positioned correctly
- Try different binarization thresholds
- Increase region size slightly

### Issue 3: Button Detection Failing
**Solution**:
- Recapture button template with exact lighting
- Increase threshold to 0.05 for more lenient matching
- Ensure button template doesn't include surrounding elements

### Issue 4: Player Detection Missing Seats
**Solution**:
- Verify covered card template is accurate
- Check seat position coordinates
- Increase search area slightly

## Multi-Resolution Support

To support different screen resolutions:

1. **Percentage-based coordinates** (recommended):
```javascript
// Instead of absolute pixels
potX: tableWidth * 0.42,   // 42% from left
potY: tableHeight * 0.44   // 44% from top
```

2. **Multiple configurations**:
- `ggpoker_1920x1080.json`
- `ggpoker_2560x1440.json`
- `ggpoker_1366x768.json`

## Next Steps

After calibration:

1. **Enable screen scraping** in HUD settings
2. **Monitor console logs** for errors
3. **Verify stats** match actual gameplay
4. **Report issues** with screenshots for debugging

## Resources

- **Reference Project**: dickreuter/Poker GitHub
- **OpenCV Docs**: Template Matching Tutorial
- **Tesseract Docs**: Improve Quality Guide
- **Screen Scraping Reference**: `SCREEN_SCRAPING_REFERENCE.md`

---

**Last Updated**: 2025-01-24
**Status**: In Development
**Next**: Build calibration GUI tool
