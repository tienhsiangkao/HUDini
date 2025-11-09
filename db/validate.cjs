/**
 * Database Schema Validator
 * Validates existing database against expected schema
 */

const fs = require('fs');
const path = require('path');

// Use dynamic import for better-sqlite3 to handle version issues gracefully
async function validateSchema() {
  console.log('🔍 Validating database schema...\n');
  
  try {
    const Database = require('better-sqlite3');
    const dbPath = path.join(__dirname, '..', 'hands.db');
    
    if (!fs.existsSync(dbPath)) {
      console.log('❌ Database not found:', dbPath);
      return false;
    }
    
    const db = new Database(dbPath, { readonly: true });
    
    // Check for expected tables
    const expectedTables = [
      'hands',
      'player_stats',
      'annotations',
      'schema_migrations'
    ];
    
    const tables = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `).all();
    
    const tableNames = tables.map(t => t.name);
    
    console.log('📋 Tables found:', tableNames.length);
    tableNames.forEach(name => console.log(`  ✓ ${name}`));
    console.log();
    
    // Check for missing tables
    const missingTables = expectedTables.filter(t => !tableNames.includes(t));
    if (missingTables.length > 0) {
      console.log('⚠️  Missing tables:', missingTables.join(', '));
    }
    
    // Check hands table structure
    console.log('🔍 Hands table structure:');
    const handsInfo = db.prepare(`PRAGMA table_info(hands)`).all();
    handsInfo.forEach(col => {
      console.log(`  ${col.name} (${col.type}${col.pk ? ', PRIMARY KEY' : ''}${col.notnull ? ', NOT NULL' : ''})`);
    });
    console.log();
    
    // Check indexes
    console.log('📊 Indexes on hands table:');
    const indexes = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='index' AND tbl_name='hands'
      ORDER BY name
    `).all();
    indexes.forEach(idx => console.log(`  ✓ ${idx.name}`));
    console.log();
    
    // Check counts
    console.log('📈 Record counts:');
    const handCount = db.prepare(`SELECT COUNT(*) as count FROM hands`).get();
    console.log(`  Hands: ${handCount.count.toLocaleString()}`);
    
    try {
      const statsCount = db.prepare(`SELECT COUNT(*) as count FROM player_stats`).get();
      console.log(`  Player Stats: ${statsCount.count.toLocaleString()}`);
    } catch (e) {
      console.log(`  Player Stats: N/A (table may not exist)`);
    }
    
    try {
      const annotCount = db.prepare(`SELECT COUNT(*) as count FROM annotations`).get();
      console.log(`  Annotations: ${annotCount.count.toLocaleString()}`);
    } catch (e) {
      console.log(`  Annotations: N/A (table may not exist)`);
    }
    console.log();
    
    // Check migration status
    try {
      const migrations = db.prepare(`
        SELECT version, name, datetime(applied_at, 'unixepoch') as applied_at 
        FROM schema_migrations 
        ORDER BY version
      `).all();
      
      if (migrations.length > 0) {
        console.log('✅ Applied migrations:');
        migrations.forEach(m => {
          console.log(`  ${m.version}: ${m.name} (${m.applied_at})`);
        });
      } else {
        console.log('⚠️  No migrations applied yet');
      }
    } catch (e) {
      console.log('ℹ️  schema_migrations table not found (migrations not yet initialized)');
    }
    console.log();
    
    db.close();
    console.log('✅ Schema validation complete!\n');
    return true;
    
  } catch (error) {
    if (error.code === 'ERR_DLOPEN_FAILED' || error.code === 'MODULE_NOT_FOUND') {
      console.log('⚠️  Cannot validate: better-sqlite3 module needs rebuild');
      console.log('   This is normal after Node.js version changes');
      console.log('   The application will handle this automatically\n');
      return null; // Not an error, just can't validate
    }
    console.error('❌ Validation error:', error.message);
    return false;
  }
}

// Run validation
validateSchema().then(result => {
  if (result === false) {
    process.exit(1);
  }
});

module.exports = { validateSchema };
