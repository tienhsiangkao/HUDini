/**
 * Database Migration System
 * Manages database schema versioning and migrations
 */

const fs = require('fs');
const path = require('path');

// Try to load better-sqlite3, provide helpful error if it fails
let Database;
try {
  Database = require('better-sqlite3');
} catch (error) {
  console.error('❌ Failed to load better-sqlite3 module');
  console.error('This usually means the native module needs to be rebuilt.');
  console.error('\nTo fix this, run:');
  console.error('  npm rebuild better-sqlite3');
  console.error('  or');
  console.error('  npm install better-sqlite3 --build-from-source\n');
  process.exit(1);
}

const { logger } = require('../lib/logger.cjs');

class MigrationManager {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.db = null;
    this.migrationsDir = path.join(__dirname, 'migrations');
  }

  /**
   * Initialize database connection
   */
  connect() {
    if (!this.db) {
      this.db = new Database(this.dbPath);
      this.db.pragma('journal_mode = WAL');
      logger.info(`Connected to database: ${this.dbPath}`);
    }
    return this.db;
  }

  /**
   * Close database connection
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
      logger.info('Database connection closed');
    }
  }

  /**
   * Initialize migrations table
   */
  initMigrationsTable() {
    this.connect();
    
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        checksum TEXT
      )
    `);
    
    logger.info('Migrations table initialized');
  }

  /**
   * Get current schema version
   */
  getCurrentVersion() {
    this.connect();
    
    try {
      const row = this.db.prepare(`
        SELECT MAX(version) as version FROM schema_migrations
      `).get();
      
      return row?.version || 0;
    } catch (error) {
      // Table might not exist yet
      return 0;
    }
  }

  /**
   * Get list of pending migrations
   */
  getPendingMigrations() {
    const currentVersion = this.getCurrentVersion();
    const migrationFiles = this.getMigrationFiles();
    
    return migrationFiles.filter(m => m.version > currentVersion);
  }

  /**
   * Get all migration files from migrations directory
   */
  getMigrationFiles() {
    if (!fs.existsSync(this.migrationsDir)) {
      logger.warn(`Migrations directory not found: ${this.migrationsDir}`);
      return [];
    }

    const files = fs.readdirSync(this.migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    return files.map(filename => {
      const match = filename.match(/^(\d+)_(.+)\.sql$/);
      if (!match) {
        logger.warn(`Invalid migration filename: ${filename}`);
        return null;
      }

      return {
        version: parseInt(match[1], 10),
        name: match[2],
        filename: filename,
        path: path.join(this.migrationsDir, filename)
      };
    }).filter(Boolean);
  }

  /**
   * Apply a single migration
   */
  applyMigration(migration) {
    this.connect();
    
    logger.info(`Applying migration ${migration.version}: ${migration.name}`);
    
    try {
      const sql = fs.readFileSync(migration.path, 'utf8');
      
      // Execute migration in a transaction
      this.db.transaction(() => {
        // Split by semicolons and execute each statement
        const statements = sql
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0 && !s.startsWith('--'));
        
        for (const statement of statements) {
          // Skip the INSERT INTO schema_migrations statement
          // We'll add it ourselves after all statements succeed
          if (statement.includes('INSERT') && statement.includes('schema_migrations')) {
            continue;
          }
          
          try {
            this.db.exec(statement);
          } catch (error) {
            // Ignore "duplicate column" errors (migration already partially applied)
            if (error.message.includes('duplicate column name')) {
              logger.info(`Column already exists, skipping: ${error.message}`);
              continue;
            }
            throw error;
          }
        }
        
        // Record migration
        this.db.prepare(`
          INSERT OR IGNORE INTO schema_migrations (version, name, applied_at)
          VALUES (?, ?, ?)
        `).run(migration.version, migration.name, Math.floor(Date.now() / 1000));
        
      })();
      
      logger.info(`✅ Migration ${migration.version} applied successfully`);
      return true;
    } catch (error) {
      logger.error(`❌ Migration ${migration.version} failed:`, error);
      throw error;
    }
  }

  /**
   * Run all pending migrations
   */
  migrate() {
    this.initMigrationsTable();
    
    const pending = this.getPendingMigrations();
    
    if (pending.length === 0) {
      logger.info('No pending migrations');
      return {
        success: true,
        applied: 0,
        currentVersion: this.getCurrentVersion()
      };
    }

    logger.info(`Found ${pending.length} pending migration(s)`);
    
    let applied = 0;
    const errors = [];

    for (const migration of pending) {
      try {
        this.applyMigration(migration);
        applied++;
      } catch (error) {
        errors.push({ migration, error });
        logger.error(`Stopping migration process due to error`);
        break;
      }
    }

    const result = {
      success: errors.length === 0,
      applied,
      currentVersion: this.getCurrentVersion(),
      errors: errors.length > 0 ? errors : undefined
    };

    if (result.success) {
      logger.info(`✅ Successfully applied ${applied} migration(s)`);
    } else {
      logger.error(`❌ Migration failed after ${applied} successful migration(s)`);
    }

    return result;
  }

  /**
   * Initialize database with base schema
   */
  initializeSchema() {
    this.connect();
    
    const schemaPath = path.join(__dirname, 'schema.sql');
    
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found: ${schemaPath}`);
    }

    logger.info('Initializing database schema...');
    
    try {
      const schema = fs.readFileSync(schemaPath, 'utf8');
      
      // Execute schema in a transaction
      this.db.transaction(() => {
        this.db.exec(schema);
      })();
      
      logger.info('✅ Database schema initialized successfully');
      return true;
    } catch (error) {
      logger.error('❌ Schema initialization failed:', error);
      throw error;
    }
  }

  /**
   * Get migration status
   */
  getStatus() {
    this.initMigrationsTable();
    
    const currentVersion = this.getCurrentVersion();
    const allMigrations = this.getMigrationFiles();
    const pending = this.getPendingMigrations();
    
    const applied = this.db.prepare(`
      SELECT version, name, applied_at 
      FROM schema_migrations 
      ORDER BY version
    `).all();

    return {
      currentVersion,
      totalMigrations: allMigrations.length,
      appliedCount: applied.length,
      pendingCount: pending.length,
      applied: applied.map(m => ({
        version: m.version,
        name: m.name,
        appliedAt: new Date(m.applied_at * 1000).toISOString()
      })),
      pending: pending.map(m => ({
        version: m.version,
        name: m.name,
        filename: m.filename
      }))
    };
  }

  /**
   * Rollback to a specific version (dangerous!)
   */
  rollback(targetVersion) {
    logger.warn(`⚠️  Rollback to version ${targetVersion} - This is not recommended!`);
    
    // SQLite doesn't support easy rollback, would need down migrations
    throw new Error('Rollback not implemented. Create a new forward migration instead.');
  }
}

/**
 * CLI interface for migrations
 */
async function runCLI() {
  const args = process.argv.slice(2);
  const command = args[0] || 'status';
  
  const dbPath = path.join(__dirname, '..', 'hands.db');
  const manager = new MigrationManager(dbPath);

  try {
    switch (command) {
      case 'init':
        manager.initializeSchema();
        break;
        
      case 'migrate':
      case 'up':
        const result = manager.migrate();
        console.log(JSON.stringify(result, null, 2));
        process.exit(result.success ? 0 : 1);
        break;
        
      case 'status':
        const status = manager.getStatus();
        console.log('\n📊 Migration Status:');
        console.log(`Current Version: ${status.currentVersion}`);
        console.log(`Applied: ${status.appliedCount}/${status.totalMigrations}`);
        console.log(`Pending: ${status.pendingCount}\n`);
        
        if (status.applied.length > 0) {
          console.log('✅ Applied Migrations:');
          status.applied.forEach(m => {
            console.log(`  ${m.version}: ${m.name} (${m.appliedAt})`);
          });
          console.log();
        }
        
        if (status.pending.length > 0) {
          console.log('⏳ Pending Migrations:');
          status.pending.forEach(m => {
            console.log(`  ${m.version}: ${m.name}`);
          });
          console.log();
        }
        break;
        
      case 'help':
      default:
        console.log(`
Database Migration Tool

Usage: node migrate.cjs [command]

Commands:
  init       Initialize database with base schema
  migrate    Run all pending migrations (alias: up)
  status     Show current migration status (default)
  help       Show this help message

Examples:
  node migrate.cjs init       # Initialize new database
  node migrate.cjs migrate    # Apply pending migrations
  node migrate.cjs status     # Check migration status
        `);
        break;
    }
  } catch (error) {
    logger.error('Migration command failed:', error);
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    manager.close();
  }
}

// Export for use in application
module.exports = { MigrationManager };

// Run as CLI if executed directly
if (require.main === module) {
  runCLI();
}
