// live_tracker.cjs
// Real-time tracking for current poker session (handles anonymous GGPoker names)

const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');

class LiveTracker {
  constructor() {
    this.sessionPlayers = new Map(); // tableId -> Map(seatNumber -> player data)
    this.liveStats = new Map(); // playerKey (table_seat) -> stats
    this.db = null;
    this.sessionId = Date.now();
  }

  init() {
    try {
      // Create separate database for live session tracking
      const dbPath = path.join(app.getPath('userData'), 'live_session.db');
      this.db = new Database(dbPath);
      
      this.createTables();
      console.log('✅ Live tracker initialized');
    } catch (error) {
      console.error('❌ Failed to initialize live tracker:', error);
    }
  }

  createTables() {
    // Session info
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY,
        table_id TEXT NOT NULL,
        started_at INTEGER NOT NULL,
        ended_at INTEGER,
        hands_played INTEGER DEFAULT 0
      )
    `);

    // Live player stats (resets each session)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS live_players (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        table_id TEXT NOT NULL,
        seat_number INTEGER NOT NULL,
        display_name TEXT,
        hands_seen INTEGER DEFAULT 0,
        vpip_count INTEGER DEFAULT 0,
        pfr_count INTEGER DEFAULT 0,
        three_bet_count INTEGER DEFAULT 0,
        cbet_count INTEGER DEFAULT 0,
        cbet_opp INTEGER DEFAULT 0,
        wtsd_count INTEGER DEFAULT 0,
        wtsd_opp INTEGER DEFAULT 0,
        won_count INTEGER DEFAULT 0,
        total_net REAL DEFAULT 0,
        last_action TEXT,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions(id),
        UNIQUE(session_id, table_id, seat_number)
      )
    `);

    // Hand actions log
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS hand_actions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        table_id TEXT NOT NULL,
        hand_number TEXT,
        seat_number INTEGER NOT NULL,
        street TEXT,
        action_type TEXT,
        amount REAL,
        timestamp INTEGER NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions(id)
      )
    `);

    console.log('✅ Live tracking tables created');
  }

  // Start tracking a new table
  startSession(tableId) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO sessions (id, table_id, started_at)
        VALUES (?, ?, ?)
      `);
      stmt.run(this.sessionId, tableId, Date.now());
      console.log(`🎲 Started live session ${this.sessionId} for table: ${tableId}`);
    } catch (error) {
      console.error('❌ Failed to start session:', error);
    }
  }

  // Register a player at a specific seat
  registerPlayer(tableId, seatNumber, displayName = null) {
    const playerKey = `${tableId}_${seatNumber}`;
    
    if (!this.liveStats.has(playerKey)) {
      this.liveStats.set(playerKey, {
        tableId,
        seatNumber,
        displayName: displayName || `Seat ${seatNumber}`,
        handsSeen: 0,
        vpipCount: 0,
        pfrCount: 0,
        threeBetCount: 0,
        cbetCount: 0,
        cbetOpp: 0,
        wtsdCount: 0,
        wtsdOpp: 0,
        wonCount: 0,
        totalNet: 0
      });

      // Save to database
      this.saveLivePlayer(playerKey);
    }

    return playerKey;
  }

  // Track a preflop action
  trackPreflopAction(tableId, seatNumber, action, amount = 0, isBlinds = false) {
    const playerKey = this.registerPlayer(tableId, seatNumber);
    const stats = this.liveStats.get(playerKey);

    // VPIP - Voluntarily Put Money In Pot (exclude blinds)
    if (!isBlinds && ['call', 'bet', 'raise', 'all-in'].includes(action)) {
      stats.vpipCount++;
    }

    // PFR - Pre-Flop Raise
    if (['raise', 'bet'].includes(action) && !isBlinds) {
      stats.pfrCount++;
    }

    // 3-Bet detection (need context about previous raises)
    // This is simplified - you'd need full hand context
    if (action === 'raise' && amount > 0) {
      // Heuristic: if raise is > 3BB, likely a 3-bet
      // Better: track raise count in hand context
    }

    this.logAction(tableId, seatNumber, 'preflop', action, amount);
    this.saveLivePlayer(playerKey);
  }

  // Track postflop action
  trackPostflopAction(tableId, seatNumber, street, action, amount = 0, wasInPosition = false) {
    const playerKey = this.registerPlayer(tableId, seatNumber);
    const stats = this.liveStats.get(playerKey);

    // C-Bet tracking (need to know if player was PFR)
    // Simplified: track first bet/raise on flop
    if (street === 'flop' && ['bet', 'raise'].includes(action)) {
      stats.cbetCount++;
    }

    this.logAction(tableId, seatNumber, street, action, amount);
    this.saveLivePlayer(playerKey);
  }

  // Track hand completion
  trackHandComplete(tableId, seatNumber, wentToShowdown, won, netAmount) {
    const playerKey = this.registerPlayer(tableId, seatNumber);
    const stats = this.liveStats.get(playerKey);

    stats.handsSeen++;

    if (wentToShowdown) {
      stats.wtsdOpp++;
      if (won) {
        stats.wtsdCount++;
      }
    }

    if (won) {
      stats.wonCount++;
    }

    stats.totalNet += netAmount;

    this.saveLivePlayer(playerKey);
  }

  // Get live stats for all players at a table
  getLiveStats(tableId) {
    const tablePlayers = [];

    for (const [key, stats] of this.liveStats.entries()) {
      if (stats.tableId === tableId && stats.handsSeen > 0) {
        const vpip = stats.handsSeen > 0 ? (stats.vpipCount / stats.handsSeen * 100).toFixed(1) : 0;
        const pfr = stats.handsSeen > 0 ? (stats.pfrCount / stats.handsSeen * 100).toFixed(1) : 0;
        const cbet = stats.cbetOpp > 0 ? (stats.cbetCount / stats.cbetOpp * 100).toFixed(1) : 0;
        const wtsd = stats.wtsdOpp > 0 ? (stats.wtsdCount / stats.wtsdOpp * 100).toFixed(1) : 0;
        const threeBet = stats.handsSeen > 0 ? (stats.threeBetCount / stats.handsSeen * 100).toFixed(1) : 0;

        tablePlayers.push({
          name: stats.displayName,
          seat: stats.seatNumber,
          hands: stats.handsSeen,
          vpip: parseFloat(vpip),
          pfr: parseFloat(pfr),
          cbet: parseFloat(cbet),
          wtsd: parseFloat(wtsd),
          threeBet: parseFloat(threeBet),
          wonPct: stats.handsSeen > 0 ? (stats.wonCount / stats.handsSeen * 100).toFixed(1) : 0,
          netBB: (stats.totalNet).toFixed(2)
        });
      }
    }

    return tablePlayers;
  }

  // Save player stats to database
  saveLivePlayer(playerKey) {
    if (!this.db) return;

    const stats = this.liveStats.get(playerKey);
    if (!stats) return;

    try {
      const stmt = this.db.prepare(`
        INSERT INTO live_players (
          session_id, table_id, seat_number, display_name,
          hands_seen, vpip_count, pfr_count, three_bet_count,
          cbet_count, cbet_opp, wtsd_count, wtsd_opp,
          won_count, total_net, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(session_id, table_id, seat_number) DO UPDATE SET
          hands_seen = excluded.hands_seen,
          vpip_count = excluded.vpip_count,
          pfr_count = excluded.pfr_count,
          three_bet_count = excluded.three_bet_count,
          cbet_count = excluded.cbet_count,
          cbet_opp = excluded.cbet_opp,
          wtsd_count = excluded.wtsd_count,
          wtsd_opp = excluded.wtsd_opp,
          won_count = excluded.won_count,
          total_net = excluded.total_net,
          updated_at = excluded.updated_at
      `);

      stmt.run(
        this.sessionId,
        stats.tableId,
        stats.seatNumber,
        stats.displayName,
        stats.handsSeen,
        stats.vpipCount,
        stats.pfrCount,
        stats.threeBetCount,
        stats.cbetCount,
        stats.cbetOpp,
        stats.wtsdCount,
        stats.wtsdOpp,
        stats.wonCount,
        stats.totalNet,
        Date.now()
      );
    } catch (error) {
      console.error('❌ Failed to save live player:', error);
    }
  }

  // Log action to database
  logAction(tableId, seatNumber, street, actionType, amount) {
    if (!this.db) return;

    try {
      const stmt = this.db.prepare(`
        INSERT INTO hand_actions (
          session_id, table_id, seat_number, street, action_type, amount, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(this.sessionId, tableId, seatNumber, street, actionType, amount, Date.now());
    } catch (error) {
      console.error('❌ Failed to log action:', error);
    }
  }

  // Clear stats for a table (new session)
  clearTableStats(tableId) {
    for (const [key, stats] of this.liveStats.entries()) {
      if (stats.tableId === tableId) {
        this.liveStats.delete(key);
      }
    }
    console.log(`🧹 Cleared live stats for table: ${tableId}`);
  }

  // End session
  endSession() {
    if (!this.db) return;

    try {
      const stmt = this.db.prepare(`
        UPDATE sessions
        SET ended_at = ?, hands_played = (
          SELECT COUNT(DISTINCT hand_number) FROM hand_actions WHERE session_id = ?
        )
        WHERE id = ?
      `);

      stmt.run(Date.now(), this.sessionId, this.sessionId);
      console.log(`🏁 Ended session ${this.sessionId}`);
    } catch (error) {
      console.error('❌ Failed to end session:', error);
    }
  }

  close() {
    if (this.db) {
      this.endSession();
      this.db.close();
      console.log('✅ Live tracker closed');
    }
  }
}

module.exports = { LiveTracker };
