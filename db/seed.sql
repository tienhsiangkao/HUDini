-- Seed Data for Development and Testing
-- This file contains sample data for testing HUDini features
-- Run this on a test database only!

-- ============================================================================
-- SAMPLE ANNOTATIONS
-- ============================================================================

INSERT OR IGNORE INTO annotations (id, ts, date, label, color, notes) VALUES
(1, 1699401600, '2023-11-08T00:00:00Z', 'Started Playing 2/5 NL', '#2196F3', 'Moved up from 1/2 stakes'),
(2, 1699574400, '2023-11-10T00:00:00Z', 'Bad Beat', '#F44336', 'Lost with AA to flush draw'),
(3, 1699660800, '2023-11-11T00:00:00Z', 'Won Tournament', '#4CAF50', 'First place in $50 tourney'),
(4, 1699920000, '2023-11-14T00:00:00Z', 'Strategy Change', '#FF9800', 'Started 3-betting more from CO'),
(5, 1700092800, '2023-11-16T00:00:00Z', 'Milestone', '#9C27B0', 'Reached 10k hands played');

-- ============================================================================
-- SAMPLE PLAYER STATS
-- ============================================================================

-- Tight aggressive player
INSERT OR IGNORE INTO player_stats (
  player, hands, 
  VPIP_pct, PFR_pct, ThreeBet_pct, FourBet_pct,
  CBetF_pct, FoldToCBetF_pct, WTSD_pct, WWSF_pct, AFq_pct,
  updated_at
) VALUES (
  'TAG_Pro', 1500,
  18.5, 15.2, 8.5, 2.1,
  65.0, 45.0, 25.0, 55.0, 60.0,
  datetime('now')
);

-- Loose aggressive player
INSERT OR IGNORE INTO player_stats (
  player, hands,
  VPIP_pct, PFR_pct, ThreeBet_pct, FourBet_pct,
  CBetF_pct, FoldToCBetF_pct, WTSD_pct, WWSF_pct, AFq_pct,
  updated_at
) VALUES (
  'LAG_Maniac', 2000,
  32.0, 25.0, 12.0, 4.5,
  70.0, 35.0, 30.0, 48.0, 70.0,
  datetime('now')
);

-- Tight passive player (calling station)
INSERT OR IGNORE INTO player_stats (
  player, hands,
  VPIP_pct, PFR_pct, ThreeBet_pct, FourBet_pct,
  CBetF_pct, FoldToCBetF_pct, WTSD_pct, WWSF_pct, AFq_pct,
  updated_at
) VALUES (
  'Calling_Station', 1200,
  35.0, 8.0, 2.5, 0.5,
  25.0, 20.0, 40.0, 35.0, 25.0,
  datetime('now')
);

-- Tight passive player (rock)
INSERT OR IGNORE INTO player_stats (
  player, hands,
  VPIP_pct, PFR_pct, ThreeBet_pct, FourBet_pct,
  CBetF_pct, FoldToCBetF_pct, WTSD_pct, WWSF_pct, AFq_pct,
  updated_at
) VALUES (
  'The_Rock', 800,
  12.0, 9.0, 3.0, 1.0,
  55.0, 60.0, 20.0, 58.0, 40.0,
  datetime('now')
);

-- Loose passive player (fish)
INSERT OR IGNORE INTO player_stats (
  player, hands,
  VPIP_pct, PFR_pct, ThreeBet_pct, FourBet_pct,
  CBetF_pct, FoldToCBetF_pct, WTSD_pct, WWSF_pct, AFq_pct,
  updated_at
) VALUES (
  'Recreational_Fish', 500,
  45.0, 5.0, 1.0, 0.2,
  20.0, 30.0, 45.0, 30.0, 20.0,
  datetime('now')
);

-- Unknown/New player (insufficient data)
INSERT OR IGNORE INTO player_stats (
  player, hands,
  VPIP_pct, PFR_pct, ThreeBet_pct, FourBet_pct,
  CBetF_pct, FoldToCBetF_pct, WTSD_pct, WWSF_pct, AFq_pct,
  updated_at
) VALUES (
  'NewPlayer123', 25,
  20.0, 16.0, 8.0, NULL,
  NULL, NULL, NULL, NULL, NULL,
  datetime('now')
);

-- ============================================================================
-- SAMPLE HANDS (Minimal examples for testing UI)
-- ============================================================================

-- Winning hand
INSERT OR IGNORE INTO hands (
  id, dateUTC, tableName, sb, bb, hero, heroNet, totalPot, rake, ts, json
) VALUES (
  'SAMPLE_001',
  '2023-11-15T14:30:00Z',
  'Table 1',
  1.0, 2.0,
  'Hero',
  25.50,
  55.00,
  2.50,
  1700060400,
  '{"site":"GGPoker","game":"Hold''em NL","stakes":"$1/$2","players":[{"name":"Hero","position":"BTN","cards":["As","Kh"],"stack":200}],"actions":[]}'
);

-- Losing hand
INSERT OR IGNORE INTO hands (
  id, dateUTC, tableName, sb, bb, hero, heroNet, totalPot, rake, ts, json
) VALUES (
  'SAMPLE_002',
  '2023-11-15T14:35:00Z',
  'Table 1',
  1.0, 2.0,
  'Hero',
  -18.00,
  38.00,
  2.00,
  1700060700,
  '{"site":"GGPoker","game":"Hold''em NL","stakes":"$1/$2","players":[{"name":"Hero","position":"CO","cards":["Qd","Qc"],"stack":182}],"actions":[]}'
);

-- Break-even hand
INSERT OR IGNORE INTO hands (
  id, dateUTC, tableName, sb, bb, hero, heroNet, totalPot, rake, ts, json
) VALUES (
  'SAMPLE_003',
  '2023-11-15T14:40:00Z',
  'Table 1',
  1.0, 2.0,
  'Hero',
  0.00,
  20.00,
  1.00,
  1700061000,
  '{"site":"GGPoker","game":"Hold''em NL","stakes":"$1/$2","players":[{"name":"Hero","position":"BB","cards":["7h","2d"],"stack":164}],"actions":[]}'
);

-- ============================================================================
-- SAMPLE SESSIONS
-- ============================================================================

-- Active session
INSERT OR IGNORE INTO sessions (id, table_id, started_at, ended_at, hands_played) VALUES
(1, 'Table_001', strftime('%s', 'now', '-2 hours'), NULL, 45);

-- Completed session
INSERT OR IGNORE INTO sessions (id, table_id, started_at, ended_at, hands_played) VALUES
(2, 'Table_002', strftime('%s', 'now', '-1 day'), strftime('%s', 'now', '-1 day', '+3 hours'), 120);

-- ============================================================================
-- SAMPLE LIVE PLAYERS
-- ============================================================================

INSERT OR IGNORE INTO live_players (
  session_id, table_id, seat_number, display_name,
  hands_seen, vpip_count, pfr_count, three_bet_count,
  cbet_count, cbet_opp, wtsd_count, wtsd_opp, won_count, total_net,
  updated_at
) VALUES
(1, 'Table_001', 1, 'Villain1', 45, 12, 8, 2, 5, 8, 3, 10, 8, 125.50, strftime('%s', 'now')),
(1, 'Table_001', 3, 'Villain2', 45, 20, 15, 4, 8, 12, 6, 15, 10, -45.25, strftime('%s', 'now')),
(1, 'Table_001', 5, 'Hero', 45, 18, 14, 3, 7, 10, 5, 12, 12, 89.75, strftime('%s', 'now'));

-- ============================================================================
-- NOTES
-- ============================================================================
-- 
-- Usage:
--   sqlite3 hands.db < seed.sql
--
-- Or from Node.js:
--   const db = require('better-sqlite3')('hands.db');
--   const seed = fs.readFileSync('db/seed.sql', 'utf8');
--   db.exec(seed);
--
-- This seed data provides:
-- - 5 annotations across different dates
-- - 6 player archetypes with realistic statistics
-- - 3 sample hands (win/loss/breakeven)
-- - 2 sessions (1 active, 1 completed)
-- - 3 live players in active session
--
-- Perfect for testing:
-- - UI components without real data
-- - Statistics calculations
-- - Timeline features
-- - Session tracking
-- - HUD display
--
-- ============================================================================
