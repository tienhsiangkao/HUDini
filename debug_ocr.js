/**
 * OCR Debug Tool - Test screen scraping step by step
 * 
 * Usage:
 * 1. Make sure GGPoker table is open
 * 2. Run: node debug_ocr.js
 * 3. Follow interactive prompts
 * 
 * This will:
 * - Capture screenshot and save it
 * - Show you the exact regions being extracted
 * - Test OCR on each region
 * - Save preprocessed images so you can see what OCR sees
 */

const { desktopCapturer } = require('electron');
const sharp = require('sharp');
const Tesseract = require('tesseract.js');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Create debug output folder
const DEBUG_DIR = path.join(__dirname, 'debug_output');
if (!fs.existsSync(DEBUG_DIR)) {
  fs.mkdirSync(DEBUG_DIR);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

// Standard 6-max layout (percentage-based)
function getPlayerRegions(width, height) {
  return [
    {
      seat: 0,
      name: 'Bottom Left',
      stack: { x: Math.round(width * 0.15), y: Math.round(height * 0.75), w: Math.round(width * 0.10), h: Math.round(height * 0.05) },
      name_region: { x: Math.round(width * 0.15), y: Math.round(height * 0.70), w: Math.round(width * 0.10), h: Math.round(height * 0.05) }
    },
    {
      seat: 1,
      name: 'Left',
      stack: { x: Math.round(width * 0.08), y: Math.round(height * 0.45), w: Math.round(width * 0.10), h: Math.round(height * 0.05) },
      name_region: { x: Math.round(width * 0.08), y: Math.round(height * 0.40), w: Math.round(width * 0.10), h: Math.round(height * 0.05) }
    },
    {
      seat: 2,
      name: 'Top Left',
      stack: { x: Math.round(width * 0.20), y: Math.round(height * 0.20), w: Math.round(width * 0.10), h: Math.round(height * 0.05) },
      name_region: { x: Math.round(width * 0.20), y: Math.round(height * 0.15), w: Math.round(width * 0.10), h: Math.round(height * 0.05) }
    },
    {
      seat: 3,
      name: 'Top Right',
      stack: { x: Math.round(width * 0.70), y: Math.round(height * 0.20), w: Math.round(width * 0.10), h: Math.round(height * 0.05) },
      name_region: { x: Math.round(width * 0.70), y: Math.round(height * 0.15), w: Math.round(width * 0.10), h: Math.round(height * 0.05) }
    },
    {
      seat: 4,
      name: 'Right',
      stack: { x: Math.round(width * 0.82), y: Math.round(height * 0.45), w: Math.round(width * 0.10), h: Math.round(height * 0.05) },
      name_region: { x: Math.round(width * 0.82), y: Math.round(height * 0.40), w: Math.round(width * 0.10), h: Math.round(height * 0.05) }
    },
    {
      seat: 5,
      name: 'Bottom Right',
      stack: { x: Math.round(width * 0.75), y: Math.round(height * 0.75), w: Math.round(width * 0.10), h: Math.round(height * 0.05) },
      name_region: { x: Math.round(width * 0.75), y: Math.round(height * 0.70), w: Math.round(width * 0.10), h: Math.round(height * 0.05) }
    }
  ];
}

function getPotRegion(width, height) {
  return {
    x: Math.round(width * 0.40),
    y: Math.round(height * 0.08),
    w: Math.round(width * 0.20),
    h: Math.round(height * 0.07)
  };
}

async function findPokerWindows() {
  console.log('\n🔍 Searching for GGPoker windows...');
  
  const sources = await desktopCapturer.getSources({
    types: ['window'],
    thumbnailSize: { width: 1920, height: 1080 }
  });

  const pokerWindows = sources.filter(source => {
    const title = source.name;
    return title.includes('Rush & Cash') && 
           title.includes('$') && 
           !title.startsWith('HH ');
  });

  return pokerWindows;
}

async function captureWindow(source) {
  console.log(`\n📸 Capturing: ${source.name}`);
  
  const thumbnail = source.thumbnail;
  const screenshot = thumbnail.toPNG();
  const size = thumbnail.getSize();
  
  console.log(`   Resolution: ${size.width}x${size.height}`);
  
  // Save full screenshot
  const screenshotPath = path.join(DEBUG_DIR, 'full_screenshot.png');
  fs.writeFileSync(screenshotPath, screenshot);
  console.log(`   ✅ Saved: ${screenshotPath}`);
  
  return { screenshot, width: size.width, height: size.height };
}

async function extractAndOCR(screenshot, region, regionName) {
  console.log(`\n🔬 Testing region: ${regionName}`);
  console.log(`   Bounds: x=${region.x}, y=${region.y}, w=${region.w}, h=${region.h}`);
  
  try {
    // Extract region
    const extracted = await sharp(screenshot)
      .extract({ left: region.x, top: region.y, width: region.w, height: region.h })
      .toBuffer();
    
    // Save original extract
    const extractPath = path.join(DEBUG_DIR, `${regionName}_1_original.png`);
    fs.writeFileSync(extractPath, extracted);
    console.log(`   ✅ Original saved: ${extractPath}`);
    
    // Preprocess: 2x upscale + sharpen
    const upscaled = await sharp(extracted)
      .resize(Math.round(region.w * 2), null, { fit: 'inside', withoutEnlargement: false })
      .sharpen()
      .toBuffer();
    
    const upscalePath = path.join(DEBUG_DIR, `${regionName}_2_upscaled.png`);
    fs.writeFileSync(upscalePath, upscaled);
    console.log(`   ✅ Upscaled saved: ${upscalePath}`);
    
    // Preprocess: grayscale + threshold
    const preprocessed = await sharp(upscaled)
      .grayscale()
      .normalise()
      .threshold(127)
      .toBuffer();
    
    const preprocessPath = path.join(DEBUG_DIR, `${regionName}_3_preprocessed.png`);
    fs.writeFileSync(preprocessPath, preprocessed);
    console.log(`   ✅ Preprocessed saved: ${preprocessPath}`);
    
    // OCR
    console.log('   🤖 Running OCR...');
    const { data: { text, confidence } } = await Tesseract.recognize(preprocessed, 'eng', {
      logger: () => {} // Suppress verbose logs
    });
    
    const cleaned = text.trim().replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ');
    
    console.log(`   📝 Result: "${cleaned}"`);
    console.log(`   📊 Confidence: ${confidence.toFixed(1)}%`);
    
    return { text: cleaned, confidence };
    
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return { text: '', confidence: 0, error: error.message };
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  🐛 OCR Debug Tool - Step by Step Testing');
  console.log('═══════════════════════════════════════════════════════');
  
  // Step 1: Find windows
  const windows = await findPokerWindows();
  
  if (windows.length === 0) {
    console.log('\n❌ No GGPoker windows found!');
    console.log('   Make sure a Rush & Cash table is open.');
    rl.close();
    return;
  }
  
  console.log(`\n✅ Found ${windows.length} table(s):`);
  windows.forEach((w, i) => console.log(`   ${i + 1}. ${w.name}`));
  
  // Step 2: Select window
  let selectedIndex = 0;
  if (windows.length > 1) {
    const answer = await question(`\nSelect table (1-${windows.length}): `);
    selectedIndex = parseInt(answer) - 1;
  }
  
  const selectedWindow = windows[selectedIndex];
  console.log(`\n✅ Selected: ${selectedWindow.name}`);
  
  // Step 3: Capture screenshot
  const { screenshot, width, height } = await captureWindow(selectedWindow);
  
  // Step 4: Interactive region testing
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  What do you want to test?');
  console.log('═══════════════════════════════════════════════════════');
  console.log('  1. Test POT region');
  console.log('  2. Test ALL player seats (name + stack)');
  console.log('  3. Test specific seat (choose seat number)');
  console.log('  4. Exit');
  console.log('═══════════════════════════════════════════════════════');
  
  const choice = await question('\nYour choice (1-4): ');
  
  if (choice === '1') {
    // Test pot
    const potRegion = getPotRegion(width, height);
    await extractAndOCR(screenshot, potRegion, 'pot');
    
  } else if (choice === '2') {
    // Test all seats
    const regions = getPlayerRegions(width, height);
    for (const region of regions) {
      await extractAndOCR(screenshot, region.name_region, `seat${region.seat}_name`);
      await extractAndOCR(screenshot, region.stack, `seat${region.seat}_stack`);
    }
    
  } else if (choice === '3') {
    // Test specific seat
    const seatNum = await question('Enter seat number (0-5): ');
    const regions = getPlayerRegions(width, height);
    const region = regions[parseInt(seatNum)];
    
    if (region) {
      await extractAndOCR(screenshot, region.name_region, `seat${region.seat}_name`);
      await extractAndOCR(screenshot, region.stack, `seat${region.seat}_stack`);
    } else {
      console.log('❌ Invalid seat number');
    }
  }
  
  console.log('\n═══════════════════════════════════════════════════════');
  console.log(`  ✅ Debug complete! Check images in: ${DEBUG_DIR}`);
  console.log('═══════════════════════════════════════════════════════');
  console.log('\n📁 Files created:');
  console.log('   - full_screenshot.png      (what was captured)');
  console.log('   - *_1_original.png         (extracted region)');
  console.log('   - *_2_upscaled.png         (2x resize + sharpen)');
  console.log('   - *_3_preprocessed.png     (what OCR sees)');
  console.log('\n💡 Next steps:');
  console.log('   1. Open the images to see if regions are correct');
  console.log('   2. Check if preprocessed images are readable');
  console.log('   3. If regions are wrong, adjust percentage values');
  console.log('   4. If OCR fails, try different threshold values');
  
  rl.close();
}

// Run
main().catch(error => {
  console.error('Fatal error:', error);
  rl.close();
  process.exit(1);
});
