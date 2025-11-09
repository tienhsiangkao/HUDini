// services/database-service.cjs
// Centralized database service for managing SQLite connections and operations

const Database = require('better-sqlite3');
const path = require('path');
const { logger } = require('../lib/logger.cjs');

const dbLogger = logger.child('DatabaseService');

class DatabaseService {
  constructor(dbPath = null) {
    this.dbPath = dbPath;
    this.db = null;
    this.isInitialized = false;
  }

  /**
   * Initialize database connection with optimizations
   */
  init(customPath = null) {
    if (this.isInitialized) {
      dbLogger.warn('Database already initialized');
      return this.db;
    }

    const finalPath = customPath || this.dbPath || path.join(__dirname, '..', 'hands.db');
    dbLogger.info('Initializing database', { path: finalPath });

    try {
      this.db = new Database(finalPath);
      
      // Performance optimizations
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('synchronous = NORMAL');
      this.db.pragma('cache_size = -64000'); // 64MB cache
      this.db.pragma('temp_store = MEMORY');
      this.db.pragma('mmap_size = 30000000000');
      this.db.pragma('page_size = 4096');

      dbLogger.debug('Applied performance pragmas');

      // Create tables
      this._createTables();
      this._addOptionalColumns();

      this.isInitialized = true;
      dbLogger.info('Database initialized successfully');
      
      return this.db;
    } catch (error) {
      dbLogger.error('Failed to initialize database', { error: error.message });
      throw error;
    }
  }

  /**
   * Create core database tables
   */
  _createTables() {
    dbLogger.debug('Creating database tables');

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS hands (
        id           TEXT PRIMARY KEY,
        dateUTC      TEXT,
        tableName    TEXT,
        sb           REAL,
        bb           REAL,
        hero         TEXT,
        json         TEXT NOT NULL,
        ts           INTEGER,
        heroNet      REAL,
        totalPot     REAL,
        rake         REAL,
        extras       TEXT,
        playersCache TEXT,
        metricsCache TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_hands_ts ON hands(ts);
      CREATE INDEX IF NOT EXISTS idx_hands_table ON hands(tableName);
      CREATE INDEX IF NOT EXISTS idx_hands_hero ON hands(hero);
      CREATE INDEX IF NOT EXISTS idx_hands_date ON hands(dateUTC);
      CREATE INDEX IF NOT EXISTS idx_hands_stake ON hands(sb, bb);
      CREATE INDEX IF NOT EXISTS idx_hands_hero_date ON hands(hero, dateUTC);
      
      CREATE TABLE IF NOT EXISTS annotations (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        ts        INTEGER NOT NULL,
        date      TEXT NOT NULL,
        label     TEXT NOT NULL,
        color     TEXT DEFAULT '#FF5722',
        notes     TEXT,
        createdAt INTEGER DEFAULT (strftime('%s', 'now'))
      );
      CREATE INDEX IF NOT EXISTS idx_annotations_ts ON annotations(ts);
      CREATE INDEX IF NOT EXISTS idx_annotations_date ON annotations(date);
    `);
  }

  /**
   * Add optional columns to hands table (for schema evolution)
   */
  _addOptionalColumns() {
    const ALLOWED_COLUMNS = new Map([
      ['totalPot', 'REAL'],
      ['rake', 'REAL'],
      ['extras', 'TEXT'],
      ['playersCache', 'TEXT'],
      ['metricsCache', 'TEXT'],
    ]);

    for (const [column, type] of ALLOWED_COLUMNS.entries()) {
      try {
        this.db.exec(`ALTER TABLE hands ADD COLUMN ${column} ${type}`);
        dbLogger.debug(`Added column ${column} to hands table`);
      } catch (err) {
        if (!err.message || !err.message.includes('duplicate column')) {
          dbLogger.warn(`Unexpected error adding column ${column}`, { error: err.message });
        }
      }
    }
  }

  /**
   * Get database instance
   */
  getDb() {
    if (!this.isInitialized) {
      throw new Error('Database not initialized. Call init() first.');
    }
    return this.db;
  }

  /**
   * Clear specified tables
   */
  clearTables(tableNames = []) {
    const ALLOWED_TABLES = new Set(['hands', 'player_stats', 'live_players', 'sessions', 'hand_actions']);
    const cleared = {};
    
    const tablesToClear = tableNames.length > 0 ? tableNames : Array.from(ALLOWED_TABLES);
    
    dbLogger.info('Clearing tables', { tables: tablesToClear });

    const tableExistsStmt = this.db.prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`);
    
    const transaction = this.db.transaction(() => {
      for (const table of tablesToClear) {
        if (!ALLOWED_TABLES.has(table)) {
          dbLogger.error(`Attempted to clear non-whitelisted table: ${table}`);
          cleared[table] = -1;
          continue;
        }

        try {
          const exists = tableExistsStmt.get(table);
          if (!exists) {
            dbLogger.debug(`Table ${table} does not exist, skipping`);
            continue;
          }

          const countStmt = this.db.prepare(`SELECT COUNT(*) as count FROM "${table}"`);
          const before = countStmt.get()?.count ?? 0;
          
          if (before === 0) {
            cleared[table] = 0;
            continue;
          }

          this.db.prepare(`DELETE FROM "${table}"`).run();
          cleared[table] = before;
          dbLogger.debug(`Cleared ${before} rows from ${table}`);
        } catch (err) {
          dbLogger.error(`Failed to clear table ${table}`, { error: err.message });
          cleared[table] = -1;
        }
      }
    });

    transaction();

    // Vacuum after clearing
    try {
      this.db.exec('VACUUM;');
      dbLogger.debug('Database vacuumed successfully');
    } catch (err) {
      dbLogger.warn('VACUUM failed', { error: err.message });
    }

    dbLogger.info('Tables cleared', { cleared });
    return cleared;
  }

  /**
   * Execute a prepared statement safely
   */
  prepare(sql) {
    if (!this.isInitialized) {
      throw new Error('Database not initialized');
    }
    return this.db.prepare(sql);
  }

  /**
   * Begin a transaction
   */
  transaction(fn) {
    if (!this.isInitialized) {
      throw new Error('Database not initialized');
    }
    return this.db.transaction(fn);
  }

  /**
   * Close database connection
   */
  close() {
    if (this.db) {
      dbLogger.info('Closing database connection');
      this.db.close();
      this.db = null;
      this.isInitialized = false;
    }
  }
}

// Export singleton instance
const dbService = new DatabaseService();

module.exports = {
  DatabaseService,
  dbService,
};
