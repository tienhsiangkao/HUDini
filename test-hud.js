// test-hud.js
// Simple test script to verify HUD overlay system

const HUDOverlay = require('./hud-overlay.js');

async function testHUD() {
  console.log('Testing HUD Overlay System...');
  
  const hud = new HUDOverlay();
  
  try {
    // Test table detection
    console.log('1. Testing table detection...');
    const tables = await hud.detectPokerTables();
    console.log(`Found ${tables.length} tables:`, tables);
    
    // Test HUD start
    console.log('2. Testing HUD start...');
    await hud.startHUD();
    console.log('HUD started successfully');
    
    // Wait a bit to see the overlay
    console.log('3. Waiting 5 seconds to see overlay...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Test HUD stop
    console.log('4. Testing HUD stop...');
    hud.stopHUD();
    console.log('HUD stopped successfully');
    
    console.log('✅ HUD test completed successfully!');
    
  } catch (error) {
    console.error('❌ HUD test failed:', error);
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testHUD();
}

module.exports = testHUD;
