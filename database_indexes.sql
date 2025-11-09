-- HUDini Database Performance Indexes
-- Run with: sqlite3 hands.db < database_indexes.sql

-- Index for filtering by hero
CREATE INDEX IF NOT EXISTS idx_hands_hero ON hands(hero);

-- Index for date-based queries
CREATE INDEX IF NOT EXISTS idx_hands_date ON hands(dateUTC);

-- Index for stake filtering
CREATE INDEX IF NOT EXISTS idx_hands_stake ON hands(sb, bb);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_hands_hero_date ON hands(hero, dateUTC);

-- Index for player stats lookups
CREATE INDEX IF NOT EXISTS idx_player_stats_player ON player_stats(player);

-- Index for table name searches
CREATE INDEX IF NOT EXISTS idx_hands_table ON hands(tableName);

-- Analyze tables for query optimizer
ANALYZE;

-- Show index information
.indexes hands
.indexes player_stats
