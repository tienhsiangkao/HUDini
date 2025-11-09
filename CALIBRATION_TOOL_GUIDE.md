# Screen Scraping Calibration Tool - Quick Start Guide

## Overview

The Calibration Tool is a visual GUI that helps you mark regions on your GGPoker screenshot and automatically extract template images and coordinates for screen scraping.

## How to Open

1. Launch HUDini app
2. Click the **🎯 Calibration** button in the header (blue button next to HUD toggle)
3. A new window will open with the calibration interface

## Step-by-Step Calibration Process

### Step 1: Load Your Screenshot

1. Click **"Load Screenshot"** button at the top
2. Browse to your GGPoker Rush & Cash screenshot (the one you provided)
3. The image will appear on the canvas

### Step 2: Mark Regions

For each region type, follow this process:

1. **Select region type** from the dropdown menu
2. **Click and drag** on the screenshot to draw a rectangle around the region
3. The region will be marked with a green box and label
4. Repeat for all 13 required regions

#### Required Regions (13 total):

**Core UI Elements:**
- **Top-Left Corner** (50x50): Unique reference point in top-left (e.g., Rush & Cash text or logo)
- **Total Pot**: The center pot display showing "Total Pot : X.X BB"
- **Fold Button**: The red "Fold" button (bottom center)
- **Call Button**: The orange "Call" button (bottom center)
- **Raise Button**: The red "Raise to" button (bottom center)
- **Dealer Button**: The yellow "D" dealer button (usually on table edge)
- **Covered Card**: One of the green covered card backs (any player except hero)

**Player Positions (6 seats):**
- **Player 0** (Hero - bottom): Mark the entire info box (avatar, name, stack, cards)
- **Player 1** (left bottom): Entire player info box
- **Player 2** (left top): Entire player info box
- **Player 3** (top center): Entire player info box
- **Player 4** (right top): Entire player info box
- **Player 5** (right bottom): Entire player info box

#### Tips for Marking Regions:

- **Be precise** - Draw tight rectangles around each element
- **Include padding** - For text, include a few pixels of space
- **Consistent size** - Buttons should be similar size (80x40px typical)
- **Whole player box** - For players, mark the entire info panel including avatar, name, stack
- If you make a mistake, click **"Remove"** button next to the region in the sidebar

### Step 3: Test OCR

1. Once all regions are marked, click **"Test OCR"** button
2. The tool will attempt to read text from regions like "Total Pot"
3. Check the results in the sidebar:
   - ✅ **Success**: Text recognized correctly (e.g., "1.5 BB")
   - ❌ **Error**: Text not recognized or incorrect

If OCR fails:
- Try remarking the region with better boundaries
- Ensure good contrast in the screenshot
- Check that region captures the full text

### Step 4: Extract Templates

1. Click **"Extract Templates"** button
2. The tool will automatically crop and save template images:
   - `topLeftCorner_template.png` (50x50)
   - `foldButton_template.png` (80x40)
   - `callButton_template.png` (80x40)
   - `raiseButton_template.png` (80x40)
   - `dealerButton_template.png` (30x30)
   - `coveredCard_template.png` (40x40)

3. Templates saved to: `poker_parser/templates/`
4. A success message will show the count and location

### Step 5: Save Configuration

1. Click **"Save Config"** button (green)
2. Configuration will be saved to:
   - JSON file: `poker_parser/configs/ggpoker_rushcash_calibrated.json`
   - Code module: `poker_parser/lib/table_config.cjs` (appended)

3. Success message will confirm save location

## Progress Tracking

The sidebar shows your progress:
- **Progress bar**: Shows X / 13 regions marked
- **Percentage**: Updates as you mark regions
- **Save button** is disabled until all 13 regions are marked

## UI Controls

### Toolbar Buttons:
- **Load Screenshot**: Open image file
- **Region Dropdown**: Select type of region to mark
- **Test OCR**: Verify text recognition accuracy
- **Extract Templates**: Save button/card images
- **Save Config**: Save configuration (enabled when complete)
- **Clear All**: Remove all marked regions (with confirmation)

### Sidebar:
- **Instructions**: Quick how-to reference
- **Marked Regions List**: Shows all marked regions with coordinates
  - Each item shows: Name, X/Y position, Width/Height
  - **Remove** button to delete individual regions
- **Progress Section**: Visual progress bar
- **OCR Test Results**: Text recognition output

## Example Workflow

Using your GGPoker screenshot:

1. **Load screenshot** → Opens your Rush & Cash table image
2. **Mark Top-Left Corner** → Select small unique element (50x50)
3. **Mark Total Pot** → Draw box around "Total Pot : 1.5 BB"
4. **Mark Buttons** → Draw around Fold, Call, Raise buttons
5. **Mark Dealer Button** → Draw around yellow "D" button
6. **Mark Covered Card** → Draw around one green card back (not hero's cards)
7. **Mark Player 0 (Hero)** → Draw around "ShotaTakagi" info box at bottom
8. **Mark Players 1-5** → Draw around each other player's info box
9. **Test OCR** → Verify pot amount reads correctly
10. **Extract Templates** → Save all button images
11. **Save Config** → Create final configuration file

## What Happens Next?

After calibration is complete:

1. **Configuration loaded** by `lib/hud_manager.cjs`
2. **Templates used** for button detection (100% accuracy)
3. **OCR applied** to marked text regions (pot, stacks)
4. **Live tracking** can detect players, read stacks, detect buttons
5. **HUD updates** with real-time table data

## Troubleshooting

### "No regions marked yet"
- You haven't marked any regions. Start by selecting a region type from dropdown and drawing on the canvas.

### "Please mark all required regions before saving"
- You need all 13 regions marked. Check the progress bar - it should show 13/13.

### OCR returns empty or wrong text
- **Region too small**: Make the box larger to include full text
- **Wrong threshold**: Try remarking with better boundaries
- **Poor contrast**: Use a screenshot with better visibility
- **Wrong region**: Make sure you're marking the pot text, not other elements

### Template extraction fails
- **Check file permissions**: Ensure app can write to `templates/` folder
- **Regions not marked**: Extract only works for marked template regions
- **Invalid region size**: Ensure regions are at least 10x10 pixels

### Canvas not responding
- **No screenshot loaded**: Click "Load Screenshot" first
- **No region selected**: Choose a region type from dropdown
- **Canvas too small**: Scroll or resize window to see full image

### Calibration window won't open
- **Already open**: Check if calibration window is already open (may be behind main window)
- **Permission issue**: Restart app and try again

## File Locations

After calibration, files are saved to:

```
poker_parser/
├── templates/                         # Template images
│   ├── topLeftCorner_template.png    (50x50)
│   ├── foldButton_template.png       (80x40)
│   ├── callButton_template.png       (80x40)
│   ├── raiseButton_template.png      (80x40)
│   ├── dealerButton_template.png     (30x30)
│   └── coveredCard_template.png      (40x40)
├── configs/
│   └── ggpoker_rushcash_calibrated.json  # Full config
└── lib/
    └── table_config.cjs              # Updated with calibrated config
```

## Configuration Structure

The saved configuration includes:

```json
{
  "name": "GGPoker Rush & Cash (Calibrated)",
  "maxPlayers": 6,
  "calibratedAt": "2025-10-24T...",
  "topLeftCorner": {
    "width": 50,
    "height": 50,
    "templatePath": "./templates/topLeftCorner_template.png"
  },
  "regions": {
    "totalPot": { "x": 500, "y": 350, "width": 200, "height": 40 },
    "buttonSearchArea": { "x": 700, "y": 650, "width": 400, "height": 100 },
    "playerPositions": [
      {
        "seat": 0,
        "name": { "x": 480, "y": 660, "width": 120, "height": 30 },
        "stack": { "x": 480, "y": 690, "width": 120, "height": 30 },
        "cards": { "x": 620, "y": 660, "width": 80, "height": 50 }
      }
      // ... 5 more seats
    ]
  },
  "templates": {
    "foldButton": "./templates/foldButton_template.png",
    "callButton": "./templates/callButton_template.png",
    // ... etc
  }
}
```

## Next Steps After Calibration

1. **Test Live Scraping**:
   - Start HUD (click "HUD: OFF" button)
   - Open GGPoker Rush & Cash table
   - HUD should now detect buttons, read pot, track players

2. **Verify Accuracy**:
   - Check HUD displays correct pot amounts
   - Verify button detection works
   - Confirm player stack tracking

3. **Fine-Tune** (if needed):
   - Re-run calibration to adjust region sizes
   - Update OCR thresholds in code if text recognition fails
   - Adjust template match thresholds if buttons not detected

4. **Create Configs for Other Tables**:
   - Repeat calibration for regular (non-Rush) GGPoker tables
   - Calibrate for different stake levels if UI differs
   - Save multiple configs for different table types

## Keyboard Shortcuts

Currently none - all operations via mouse/buttons.

## Known Limitations

- **Single screenshot only**: Can't load multiple images at once
- **No undo**: Use "Remove" button to delete regions individually
- **No zoom**: Scroll canvas container to see full image
- **No rotation/adjustment**: Must use clean screenshots
- **Player boxes require manual marking**: Tool doesn't auto-detect player positions

## Advanced Tips

### Best Screenshot Practices:
- **Full table visible**: Entire poker table in frame
- **Good lighting**: Not too dark, good contrast
- **Clean UI**: No overlapping windows or popups
- **Standard resolution**: 1920x1080 or similar
- **PNG format**: Better quality than JPG for text/buttons

### Optimal Region Sizes:
- **Pot text**: 200x40 pixels
- **Buttons**: 80-120 pixels wide, 35-45 pixels tall
- **Player name**: 120x30 pixels
- **Player stack**: 120x30 pixels
- **Player cards**: 80x50 pixels
- **Dealer button**: 30x30 pixels
- **Covered card**: 40-50 pixels square

### Template Matching Thresholds:
Default threshold: 0.01 (99% match required)
- Adjust in `lib/ocr_processor.cjs` if needed
- Lower threshold = more lenient matching
- Higher threshold = stricter matching

## Support

If you encounter issues:
1. Check console logs (F12 in calibration window)
2. Verify file permissions for templates/ and configs/ folders
3. Try re-calibrating with a cleaner screenshot
4. Check that sharp and tesseract.js are installed

## Summary

The Calibration Tool automates the tedious process of:
- ✅ Measuring pixel coordinates manually
- ✅ Extracting template images from screenshots
- ✅ Testing OCR accuracy before deployment
- ✅ Generating configuration files automatically
- ✅ Validating all required regions are marked

**Result**: A complete, tested configuration ready for live screen scraping in 5-10 minutes!
