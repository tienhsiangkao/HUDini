-- Migration 002: Add indexes for performance optimization
-- Version: 002
-- Date: 2025-11-09
-- Description: Add additional indexes for common query patterns

-- Add index on heroNet for profit/loss queries
CREATE INDEX IF NOT EXISTS idx_hands_heronet ON hands(heroNet);

-- Add composite index for hero + stake queries
CREATE INDEX IF NOT EXISTS idx_hands_hero_stake ON hands(hero, sb, bb);

-- Add index on totalPot for pot size queries
CREATE INDEX IF NOT EXISTS idx_hands_pot ON hands(totalPot);

-- Add index on player_stats hands count for filtering
CREATE INDEX IF NOT EXISTS idx_player_stats_hands ON player_stats(hands);

-- Add index on player_stats updated_at for cache invalidation
CREATE INDEX IF NOT EXISTS idx_player_stats_updated ON player_stats(updated_at);

-- Record migration
INSERT OR IGNORE INTO schema_migrations (version, name, applied_at) 
VALUES (2, 'add_performance_indexes', strftime('%s', 'now'));
