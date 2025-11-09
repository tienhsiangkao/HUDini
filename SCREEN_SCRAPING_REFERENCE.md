# Screen Scraping Reference - dickreuter/Poker

This document summarizes key techniques from the open-source [dickreuter/Poker](https://github.com/dickreuter/Poker) repository that can be applied to our GGPoker HUD screen scraping implementation.

## Architecture Overview

The dickreuter/Poker bot uses a sophisticated screen scraping system with:
- **Template matching** for buttons, cards, and UI elements
- **OCR (Tesseract)** for reading numbers (pot values, stacks, bet amounts)
- **MongoDB storage** for table templates and configurations
- **Coordinate-based regions** for precise element extraction

## Key Components

### 1. Template Matching (`find_template_on_screen`)

**Core Implementation** (`poker/tools/screen_operations.py`):
```python
def find_template_on_screen(template, screenshot, threshold, extended=False):
    """Find template on screen using OpenCV"""
    res = cv2.matchTemplate(screenshot, template, cv2.TM_SQDIFF_NORMED)
    loc = np.where(res <= threshold)
    min_val, _, min_loc, _ = cv2.minMaxLoc(res)
    
    bestFit = min_loc
    count = 0
    points = []
    for pt in zip(*loc[::-1]):
        count += 1
        points.append(pt)
    return count, points, bestFit, min_val
```

**Key Techniques**:
- Uses `cv2.TM_SQDIFF_NORMED` (Squared Difference Normalized) method
- Threshold of `0.01` for matching (very strict)
- Returns count, all match points, best fit location, and match quality
- Can detect multiple instances of same element

**Applied To**:
- Call/Raise/Check/Fold buttons
- Dealer button position
- Card recognition (suits and ranks)
- "I'm Back" and "Resume Hand" buttons
- Player covered cards (to detect active players)

### 2. Top-Left Corner Reference System

**Workflow**:
1. **Save reference image** of poker window's top-left corner
2. **Crop screenshot** to table area using template matching
3. **All coordinates** are relative to this corner

**Implementation** (`crop_screenshot_with_topleft_corner`):
```python
def crop_screenshot_with_topleft_corner(original_screenshot, topleft_corner, useSleep=True):
    img = cv2.cvtColor(np.array(original_screenshot), cv2.COLOR_BGR2RGB)
    count, points, _, _ = find_template_on_screen(topleft_corner, img, 0.01)
    
    if count == 1:
        tlc = points[0]
        cropped_screenshot = original_screenshot.crop(
            (tlc[0], tlc[1], tlc[0] + CROP_WIDTH, tlc[1] + CROP_HEIGHT))
        return cropped_screenshot, tlc
    else:
        log.warning("No top left corner found" if count == 0 else "Multiple corners found")
        return None, None
```

**Benefits**:
- **Resolution independence**: Works across different screen sizes
- **Multi-table support**: Each table has its own corner reference
- **Consistent coordinates**: All regions defined relative to one point

### 3. Region-Based OCR System

**Table Dictionary Structure**:
```python
table_dict = {
    'topleft_corner': <binary_image>,
    'total_pot_area': {'x1': 100, 'y1': 50, 'x2': 200, 'y2': 80},
    'call_value': {'x1': 300, 'y1': 400, 'x2': 400, 'y2': 430},
    'player_funds_area': {
        '0': {'x1': 150, 'y1': 100, 'x2': 250, 'y2': 130},  # Hero
        '1': {'x1': 150, 'y1': 200, 'x2': 250, 'y2': 230},  # Player 1
        # ... for each seat
    },
    'raise_value': {'x1': 320, 'y1': 400, 'x2': 420, 'y2': 430},
    'player_pot_area': {
        '0': ...,  # Per-player pot contributions
    }
}
```

**OCR Function**:
```python
def ocr(screenshot, image_area, table_dict, player=None, fast=False):
    """Extract OCR from specific region"""
    if player:
        search_area = table_dict[image_area][player]
    else:
        search_area = table_dict[image_area]
    
    cropped_screenshot = screenshot.crop(
        (search_area['x1'], search_area['y1'], search_area['x2'], search_area['y2']))
    return get_ocr_float(cropped_screenshot, fast)
```

### 4. OCR Pre-Processing Pipeline

**Image Preparation** (`prepareImage`):
```python
def prepareImage(img_orig, binarize=True, threshold=76):
    """Prepare image for OCR"""
    # 1. Resize to standard width (300px)
    basewidth = 300
    wpercent = (basewidth / float(img_orig.size[0]))
    hsize = int((float(img_orig.size[1]) * float(wpercent)))
    img_resized = img_orig.convert('L').resize((basewidth, hsize), Image.LANCZOS)
    
    # 2. Binarize (convert to pure black/white)
    if binarize:
        img = cv2.cvtColor(np.array(img_resized), cv2.COLOR_BGR2RGB)
        img = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        _, thresh = cv2.threshold(img, threshold, 255, cv2.THRESH_BINARY_INV)
        return Image.fromarray(thresh)
    
    return img_resized
```

**OCR Execution** (`get_ocr_number`):
```python
def get_ocr_number(img_orig, fast=False):
    """Return float value from image"""
    # Try with two different thresholds
    img_resized1 = prepareImage(img_orig, binarize=True, threshold=76)
    img_resized2 = prepareImage(img_orig, binarize=True, threshold=125)
    
    # Tesseract with character whitelist
    api.SetVariable("tessedit_char_whitelist", "0123456789.$£B")
    api.SetImage(img_resized1)
    result = api.GetUTF8Text()
    
    # Clean and parse
    result = result.strip().replace('$', '').replace('£', '').replace('€', '').replace('B', '').replace(',', '.')
    try:
        return float(result)
    except ValueError:
        return -1  # OCR failed
```

**Key Optimizations**:
- **Grayscale conversion**: Removes color noise
- **Binarization**: Makes text crisp (pure black on white)
- **Resize to standard**: Consistent OCR performance
- **Character whitelist**: Only numbers and currency symbols
- **Multiple thresholds**: Tries 76 and 125 for better accuracy
- **PSM.SINGLE_LINE**: Tesseract page segmentation mode for single lines

### 5. Card Recognition

**Two Approaches**:

#### A. Template Matching (Simple)
```python
def get_my_cards2(self):
    """Get my cards via template matching"""
    self.my_cards = []
    for value in CARD_VALUES:  # "23456789TJQKA"
        for suit in CARD_SUITES:  # "CDHS"
            if is_template_in_search_area(self.table_dict, self.screenshot,
                                          value.lower() + suit.lower(), 'my_cards_area', extended=True):
                self.my_cards.append(value + suit)
```

**How it works**:
- Store template images for all 52 cards (e.g., `3h.png`, `as.png`)
- Search within `my_cards_area` region
- Match found cards (e.g., if `qs.png` matches, add 'QS' to hand)

#### B. Neural Network (Advanced)
```python
def get_my_cards_nn(self):
    """Get cards using CNN"""
    left_card_area = self.table_dict['left_card_area']
    right_card_area = self.table_dict['right_card_area']
    
    left_card = self.screenshot.crop((left_card_area['x1'], ...))
    right_card = self.screenshot.crop((right_card_area['x1'], ...))
    
    card1 = predict(left_card, self.nn_model, self.table_dict['_class_mapping'])
    card2 = predict(right_card, self.nn_model, self.table_dict['_class_mapping'])
```

**Neural Network Details**:
- Input: 15x50 pixel card images
- Trained on augmented data (rotation, shift, zoom)
- CNN architecture: Conv2D → MaxPooling → Dropout → Dense
- Output: 52 classes (one per card)

### 6. Action Button Detection

**Button Check Pattern**:
```python
def check_for_call(self):
    self.callButton = self.has_call_button()
    if self.callButton:
        log.debug("Call button found")
        # Then read call value
        self.call_value = ocr(self.screenshot, 'call_value', self.table_dict)
    return True

def has_call_button(self):
    """Check if call button is visible"""
    self.call_button = is_template_in_search_area(
        self.table_dict, self.screenshot, 
        'call_button', 'buttons_search_area')
    return self.call_button
```

**Detected Actions**:
- `call_button` → Read `call_value` via OCR
- `raise_button` → Read `raise_value` via OCR
- `check_button` → Hero can check (no bet)
- `bet_button` → Bet opportunity
- `all_in_call_button` → All-in situation
- `fast_fold_button` → Fast-fold available

### 7. Player Detection

**Method**: Check for "covered card" icon at each seat
```python
def get_players_in_game(self):
    """Get players in the game by checking for covered cards"""
    self.players_in_game = [0]  # assume myself in game
    
    for i in range(1, self.total_players):
        if is_template_in_search_area(self.table_dict, self.screenshot,
                                      'covered_card', 'covered_card_area', str(i)):
            self.players_in_game.append(i)
    return True
```

**Logic**:
- Each seat has a `covered_card_area` region
- If covered card icon matches → player is active
- Returns list like `[0, 2, 4, 5]` (seats with players)

### 8. Pot and Stack Reading

**Total Pot** (Center of table):
```python
def get_pots(self):
    self.current_round_pot = ocr(self.screenshot, 'current_round_pot', self.table_dict, fast=True)
    self.total_pot = ocr(self.screenshot, 'total_pot_area', self.table_dict)
```

**Player Stacks**:
```python
def get_players_funds(self, my_funds_only=False, skip=[]):
    counter = 1 if my_funds_only else self.total_players
    self.player_funds = []
    
    for i in range(counter):
        if i in skip:
            funds = 0
        else:
            funds = ocr(self.screenshot, 'player_funds_area', self.table_dict, str(i))
        self.player_funds.append(funds)
```

**Player Pot Contributions**:
```python
def get_player_pots(self, skip=[]):
    """Get pots of the players"""
    self.player_pots = []
    for i in range(self.total_players):
        if i in skip:
            funds = 0
        else:
            funds = ocr(self.screenshot, 'player_pot_area', self.table_dict, str(i))
        self.player_pots.append(funds)
```

### 9. Table Configuration Workflow

**Setup Process** (From README):
1. **Take screenshot** of poker table
2. **Mark top-left corner** (two clicks: top-left → bottom-right)
3. **Save as reference** template
4. **Crop subsequent screenshots** using this corner
5. **Mark regions** for each element:
   - Buttons search area (where Call/Raise/Check appear)
   - Total pot area
   - Player funds areas (one per seat)
   - Card areas (for hero and community cards)
   - Dealer button search areas (per seat)
6. **Save template images**:
   - Each button (call, raise, check, fold, etc.)
   - All 52 cards (2s-As, each suit)
   - Dealer button
   - Covered card icon
7. **Store in MongoDB** with table name (e.g., "Official GGPoker 6player")

### 10. GGPoker Specific Notes

From tests (`test_ocr_gg`):
```python
def test_ocr_gg():
    table_dict = mongo.get_table("Official GG Poker")
    table_scraper = TableScraper(table_dict)
    table_scraper.screenshot = Image.open('ggpk6ocr.png')
    table_scraper.crop_from_top_left_corner()
    
    result = ocr(table_scraper.screenshot, 'total_pot_area', table_scraper.table_dict)
    assert result == 0.08
    
    result = ocr(table_scraper.screenshot, 'call_value', table_scraper.table_dict)
    assert result == 0.05
```

**GGPoker Support**:
- Project has "Official GG Poker" table template
- Handles GGPoker's UI with tested accuracy
- Works with both regular and Rush & Cash tables

---

## Recommendations for Our Implementation

### Immediate Improvements

1. **Adopt Top-Left Corner System**:
   - Replace absolute coordinates with corner-relative positioning
   - Makes system resolution-independent
   - Easier to calibrate per user

2. **Implement Template Matching for Buttons**:
   ```javascript
   // In screen_scraper.cjs
   const { cv } = require('opencv4nodejs');
   
   class ScreenScraper {
     async findButton(screenshot, buttonTemplate) {
       const result = await screenshot.matchTemplate(buttonTemplate, cv.TM_SQDIFF_NORMED);
       const minMax = await result.minMaxLoc();
       return minMax.minVal < 0.01 ? minMax.minLoc : null;  // Threshold 0.01
     }
   }
   ```

3. **Enhance OCR Pre-Processing**:
   ```javascript
   // In ocr_processor.cjs
   async preprocessForOCR(imageBuffer, region) {
     const image = await sharp(imageBuffer)
       .extract(region)           // Crop to region
       .greyscale()               // Convert to grayscale
       .resize(300, null)         // Standard width
       .normalize()               // Improve contrast
       .threshold(76)             // Binarize (black/white)
       .toBuffer();
     return image;
   }
   ```

4. **Player Detection via Covered Cards**:
   - Save template of GGPoker's "face-down card back" icon
   - Check each seat position for this template
   - More reliable than OCR for player names

5. **Button Value Reading**:
   - First detect button presence (template match)
   - Then OCR the adjacent value region
   - Reduces OCR failures from checking empty areas

### Long-Term Enhancements

1. **Configuration Tool** (Like their table mapper):
   - GUI for marking regions on screenshots
   - Save/load table templates
   - Test OCR accuracy on each region

2. **Multi-Threshold OCR**:
   - Try binarization at 76, 100, 125 thresholds
   - Return first successful parse
   - Improves accuracy in varying lighting

3. **Neural Network for Cards** (Optional):
   - Train CNN on GGPoker card images
   - More robust than template matching
   - Handles slight UI variations

4. **Action Detection Pipeline**:
   ```javascript
   async detectAvailableActions(screenshot) {
     const actions = [];
     
     // Check each action button via template matching
     if (await this.matchTemplate(screenshot, 'fold_button')) {
       actions.push({ type: 'fold', enabled: true });
     }
     
     if (await this.matchTemplate(screenshot, 'call_button')) {
       const amount = await this.ocrRegion(screenshot, 'call_value');
       actions.push({ type: 'call', amount });
     }
     
     if (await this.matchTemplate(screenshot, 'raise_button')) {
       const amount = await this.ocrRegion(screenshot, 'raise_value');
       actions.push({ type: 'raise', amount });
     }
     
     return actions;
   }
   ```

---

## Implementation Priority

**Phase 1 - Core Stability** (Next 1-2 weeks):
- [x] Basic screen capture working
- [ ] Top-left corner reference system
- [ ] Region-based coordinate storage
- [ ] Enhanced OCR pre-processing (grayscale, binarize, resize)

**Phase 2 - Accuracy** (Weeks 3-4):
- [ ] Template matching for buttons
- [ ] Covered card detection for players
- [ ] Multi-threshold OCR fallback
- [ ] Pot and stack reading optimization

**Phase 3 - Polish** (Month 2):
- [ ] Configuration GUI for region marking
- [ ] Table template save/load
- [ ] Neural network card recognition (optional)
- [ ] Multi-table support testing

---

## Resources

- **dickreuter/Poker GitHub**: https://github.com/dickreuter/Poker
- **Key Files to Study**:
  - `poker/tools/screen_operations.py` - Core screen scraping functions
  - `poker/scraper/table_scraper.py` - TableScraper class
  - `poker/scraper/table_setup_actions_and_signals.py` - Configuration GUI
  - `poker/tests/test_table_and_ocr.py` - Test examples
- **OpenCV Template Matching Docs**: https://docs.opencv.org/4.x/d4/dc6/tutorial_py_template_matching.html
- **Tesseract OCR Modes**: https://tesseract-ocr.github.io/tessdoc/ImproveQuality.html

---

## Testing Strategy

**Before each calibration**:
1. Take 5-10 screenshots of different game states
2. Test OCR accuracy on each region
3. Adjust thresholds and coordinates
4. Re-test until 95%+ accuracy

**Validation metrics**:
- Pot reading: ±$0.01 tolerance
- Stack reading: ±$0.01 tolerance
- Button detection: 100% accuracy (must not miss/false positive)
- Card recognition: 100% accuracy (critical for decision-making)
- Player count: 100% accuracy

---

**Created**: 2025-01-24
**Reference Project**: dickreuter/Poker (MIT License)
**Our Implementation**: poker_parser (GGPoker HUD)
