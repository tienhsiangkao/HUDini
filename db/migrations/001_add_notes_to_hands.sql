-- Migration 001: Add notes column to hands table
-- Version: 001
-- Date: 2025-11-09
-- Description: Add user notes column to hands table for hand-specific annotations

-- Add notes column if it doesn't exist
-- SQLite doesn't have ALTER TABLE IF COLUMN NOT EXISTS, so we use a safer approach

-- Check if column exists (will fail silently if it does)
ALTER TABLE hands ADD COLUMN notes TEXT;

-- Record migration
INSERT OR IGNORE INTO schema_migrations (version, name, applied_at) 
VALUES (1, 'add_notes_to_hands', strftime('%s', 'now'));
