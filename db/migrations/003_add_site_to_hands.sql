-- Migration 003: Add site column to hands table
-- Version: 003
-- Date: 2025-11-09
-- Description: Track poker site (e.g., GGPoker, PokerStars) for multi-site support

-- Add site column
ALTER TABLE hands ADD COLUMN site TEXT DEFAULT 'Unknown';

-- Add index for site-based queries
CREATE INDEX IF NOT EXISTS idx_hands_site ON hands(site);

-- Add composite index for site + date queries
CREATE INDEX IF NOT EXISTS idx_hands_site_date ON hands(site, dateUTC);

-- Record migration
INSERT OR IGNORE INTO schema_migrations (version, name, applied_at) 
VALUES (3, 'add_site_to_hands', strftime('%s', 'now'));
