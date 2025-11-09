-- HUDini Database Schema
-- Complete schema definition for poker hand tracking application
-- Database: SQLite 3.x
-- Version: 1.0.0

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Hands table: Stores all parsed poker hands
CREATE TABLE IF NOT EXISTS hands (
  id           TEXT PRIMARY KEY,           -- Unique hand identifier (site-generated)
  dateUTC      TEXT,                       -- Hand date in UTC format
  tableName    TEXT,                       -- Table name
  sb           REAL,                       -- Small blind amount
  bb           REAL,                       -- Big blind amount
  hero         TEXT,                       -- Hero player name
  json         TEXT NOT NULL,              -- Full hand data as JSON
  ts           INTEGER,                    -- Unix timestamp
  heroNet      REAL,                       -- Hero net win/loss
  totalPot     REAL,                       -- Total pot size
  rake         REAL,                       -- Rake amount
  notes        TEXT,                       -- User notes for this hand
  extras       TEXT,                       -- Extra metadata (JSON)
  playersCache TEXT,                       -- Cached player info (JSON)
  metricsCache TEXT                        -- Cached metrics (JSON)
);

-- Indexes for hands table (performance optimization)
CREATE INDEX IF NOT EXISTS idx_hands_ts ON hands(ts);
CREATE INDEX IF NOT EXISTS idx_hands_table ON hands(tableName);
CREATE INDEX IF NOT EXISTS idx_hands_hero ON hands(hero);
CREATE INDEX IF NOT EXISTS idx_hands_date ON hands(dateUTC);
CREATE INDEX IF NOT EXISTS idx_hands_stake ON hands(sb, bb);
CREATE INDEX IF NOT EXISTS idx_hands_hero_date ON hands(hero, dateUTC);
CREATE INDEX IF NOT EXISTS idx_hands_heronet ON hands(heroNet);

-- ============================================================================
-- PLAYER STATISTICS
-- ============================================================================

-- Player stats table: Aggregated statistics per player
CREATE TABLE IF NOT EXISTS player_stats (
  player TEXT PRIMARY KEY,                -- Player name
  hands INTEGER NOT NULL,                 -- Total hands played
  
  -- Core statistics (percentages)
  VPIP_pct REAL,                          -- Voluntarily Put In Pot %
  PFR_pct REAL,                           -- Pre-Flop Raise %
  ThreeBet_pct REAL,                      -- 3-Bet %
  FourBet_pct REAL,                       -- 4-Bet %
  Squeeze_pct REAL,                       -- Squeeze %
  
  -- Continuation bet statistics
  CBetF_pct REAL,                         -- C-Bet Flop %
  CBetT_pct REAL,                         -- C-Bet Turn %
  CBetR_pct REAL,                         -- C-Bet River %
  
  -- Fold to C-Bet statistics
  FoldToCBetF_pct REAL,                   -- Fold to C-Bet Flop %
  FoldToCBetT_pct REAL,                   -- Fold to C-Bet Turn %
  FoldToCBetR_pct REAL,                   -- Fold to C-Bet River %
  
  -- Showdown statistics
  WTSD_pct REAL,                          -- Went To Showdown %
  WWSF_pct REAL,                          -- Won When Saw Flop %
  AFq_pct REAL,                           -- Aggression Frequency %
  
  -- Steal statistics
  StealAtt INTEGER,                       -- Steal attempts
  StealSucc_pct REAL,                     -- Steal success %
  
  -- Other statistics
  CheckRaiseF INTEGER,                    -- Check-raise on flop count
  
  -- JSON columns for complex data
  positional_json TEXT,                   -- Position-based statistics
  vs_hero_json TEXT,                      -- Statistics vs hero
  samples_json TEXT,                      -- Sample sizes per stat
  confidence_json TEXT,                   -- Confidence intervals
  raw_json TEXT,                          -- Raw aggregated data
  
  updated_at TEXT NOT NULL                -- Last update timestamp
);

-- Index for player stats
CREATE INDEX IF NOT EXISTS idx_player_stats_updated ON player_stats(updated_at);
CREATE INDEX IF NOT EXISTS idx_player_stats_hands ON player_stats(hands);

-- ============================================================================
-- ANNOTATIONS
-- ============================================================================

-- Annotations table: Timeline markers and notes
CREATE TABLE IF NOT EXISTS annotations (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  ts        INTEGER NOT NULL,             -- Unix timestamp
  date      TEXT NOT NULL,                -- Date in UTC format
  label     TEXT NOT NULL,                -- Annotation label/title
  color     TEXT DEFAULT '#FF5722',       -- Color code for UI
  notes     TEXT,                         -- Additional notes
  createdAt INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Indexes for annotations
CREATE INDEX IF NOT EXISTS idx_annotations_ts ON annotations(ts);
CREATE INDEX IF NOT EXISTS idx_annotations_date ON annotations(date);

-- ============================================================================
-- LIVE TRACKING TABLES (HUD)
-- ============================================================================

-- Sessions table: Live poker session tracking
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  table_id TEXT NOT NULL,                -- Table identifier
  started_at INTEGER NOT NULL,           -- Session start timestamp
  ended_at INTEGER,                      -- Session end timestamp (NULL if active)
  hands_played INTEGER DEFAULT 0         -- Total hands in session
);

-- Index for sessions
CREATE INDEX IF NOT EXISTS idx_sessions_table ON sessions(table_id);
CREATE INDEX IF NOT EXISTS idx_sessions_started ON sessions(started_at);

-- Live player stats table: Real-time player statistics during session
CREATE TABLE IF NOT EXISTS live_players (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,           -- References sessions(id)
  table_id TEXT NOT NULL,                -- Table identifier
  seat_number INTEGER NOT NULL,          -- Player seat number
  display_name TEXT,                     -- Player display name
  
  -- Tracking counters
  hands_seen INTEGER DEFAULT 0,
  vpip_count INTEGER DEFAULT 0,
  pfr_count INTEGER DEFAULT 0,
  three_bet_count INTEGER DEFAULT 0,
  cbet_count INTEGER DEFAULT 0,
  cbet_opp INTEGER DEFAULT 0,            -- C-bet opportunities
  wtsd_count INTEGER DEFAULT 0,          -- Went to showdown count
  wtsd_opp INTEGER DEFAULT 0,            -- Showdown opportunities
  won_count INTEGER DEFAULT 0,           -- Hands won
  total_net REAL DEFAULT 0,              -- Net win/loss
  
  last_action TEXT,                      -- Last action taken
  updated_at INTEGER NOT NULL,           -- Last update timestamp
  
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  UNIQUE(session_id, table_id, seat_number)
);

-- Indexes for live_players
CREATE INDEX IF NOT EXISTS idx_live_players_session ON live_players(session_id);
CREATE INDEX IF NOT EXISTS idx_live_players_table ON live_players(table_id);

-- Hand actions log table: Detailed action tracking
CREATE TABLE IF NOT EXISTS hand_actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,           -- References sessions(id)
  table_id TEXT NOT NULL,                -- Table identifier
  hand_number TEXT,                      -- Hand number (if available)
  seat_number INTEGER NOT NULL,          -- Player seat number
  street TEXT,                           -- preflop, flop, turn, river
  action_type TEXT,                      -- fold, call, raise, bet, check
  amount REAL,                           -- Action amount
  timestamp INTEGER NOT NULL,            -- Action timestamp
  
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

-- Indexes for hand_actions
CREATE INDEX IF NOT EXISTS idx_hand_actions_session ON hand_actions(session_id);
CREATE INDEX IF NOT EXISTS idx_hand_actions_table ON hand_actions(table_id);
CREATE INDEX IF NOT EXISTS idx_hand_actions_timestamp ON hand_actions(timestamp);

-- ============================================================================
-- MIGRATIONS TABLE
-- ============================================================================

-- Schema migrations tracking table
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,           -- Migration version number
  name TEXT NOT NULL,                    -- Migration name
  applied_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  checksum TEXT                          -- Migration file checksum (optional)
);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger: Update player_stats.updated_at automatically
CREATE TRIGGER IF NOT EXISTS update_player_stats_timestamp 
AFTER UPDATE ON player_stats
BEGIN
  UPDATE player_stats 
  SET updated_at = datetime('now') 
  WHERE player = NEW.player;
END;

-- Trigger: Cascade delete live tracking data when session ends
CREATE TRIGGER IF NOT EXISTS cleanup_session_data
AFTER DELETE ON sessions
BEGIN
  DELETE FROM live_players WHERE session_id = OLD.id;
  DELETE FROM hand_actions WHERE session_id = OLD.id;
END;

-- ============================================================================
-- VIEWS (Optional - for common queries)
-- ============================================================================

-- View: Recent hands with calculated metrics
CREATE VIEW IF NOT EXISTS v_recent_hands AS
SELECT 
  id,
  dateUTC,
  tableName,
  sb,
  bb,
  hero,
  heroNet,
  totalPot,
  rake,
  ts,
  CASE 
    WHEN heroNet > 0 THEN 'Won'
    WHEN heroNet < 0 THEN 'Lost'
    ELSE 'Break Even'
  END as result,
  ROUND(heroNet / bb, 2) as bb_won
FROM hands
WHERE ts IS NOT NULL
ORDER BY ts DESC
LIMIT 1000;

-- View: Active sessions
CREATE VIEW IF NOT EXISTS v_active_sessions AS
SELECT 
  s.id,
  s.table_id,
  s.started_at,
  s.hands_played,
  COUNT(DISTINCT lp.id) as player_count
FROM sessions s
LEFT JOIN live_players lp ON s.id = lp.session_id
WHERE s.ended_at IS NULL
GROUP BY s.id, s.table_id, s.started_at, s.hands_played;

-- View: Player summary statistics
CREATE VIEW IF NOT EXISTS v_player_summary AS
SELECT 
  player,
  hands,
  ROUND(VPIP_pct, 1) as VPIP,
  ROUND(PFR_pct, 1) as PFR,
  ROUND(ThreeBet_pct, 1) as '3Bet',
  ROUND(AFq_pct, 1) as 'AF',
  ROUND(WTSD_pct, 1) as WTSD,
  updated_at
FROM player_stats
WHERE hands >= 10  -- Only show players with sufficient sample size
ORDER BY hands DESC;

-- ============================================================================
-- NOTES
-- ============================================================================
-- 
-- Performance Considerations:
-- - All timestamp fields use INTEGER (Unix timestamps) for performance
-- - Indexes are created on frequently queried columns
-- - JSON columns are used for flexible data storage
-- - Foreign keys maintain referential integrity
-- - Triggers automate common operations
--
-- Migration Strategy:
-- - This schema represents version 1.0.0
-- - All future changes should be in separate migration files
-- - Migration files should be numbered sequentially (001_, 002_, etc.)
-- - Each migration should be idempotent (safe to run multiple times)
--
-- Backup Strategy:
-- - Regular backups of hands.db recommended
-- - Consider VACUUM periodically to reclaim space
-- - Monitor database size (hands table grows with each import)
--
-- ============================================================================
