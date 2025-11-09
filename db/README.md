# HUDini Database System

Complete database schema and migration system for the HUDini poker tracking application.

## 📁 Structure

```
db/
├── schema.sql              # Complete database schema (v1.0.0)
├── seed.sql               # Development seed data
├── migrate.cjs            # Migration management tool
├── migrations/            # Version-controlled schema changes
│   ├── 001_add_notes_to_hands.sql
│   ├── 002_add_performance_indexes.sql
│   └── 003_add_site_to_hands.sql
└── README.md             # This file
```

## 🗄️ Database Tables

### Core Tables
- **hands** - All parsed poker hands with full JSON data
- **player_stats** - Aggregated player statistics (VPIP, PFR, etc.)
- **annotations** - Timeline markers and notes
- **schema_migrations** - Migration version tracking

### Live Tracking Tables (HUD)
- **sessions** - Poker session tracking
- **live_players** - Real-time player stats during sessions
- **hand_actions** - Detailed action logs

## 🚀 Quick Start

### Initialize New Database

```bash
# Create database with full schema
node db/migrate.cjs init
```

### Check Migration Status

```bash
node db/migrate.cjs status
```

### Apply Pending Migrations

```bash
node db/migrate.cjs migrate
```

### Load Sample Data (Development)

```bash
sqlite3 hands.db < db/seed.sql
```

## 📊 Schema Overview

### Hands Table
Stores complete hand history data:
- **Primary Key**: Hand ID (site-generated)
- **Indexes**: timestamp, hero, stakes, date
- **JSON Fields**: Full hand data, cached metrics
- **Performance**: ~400k hands = ~2GB database

### Player Stats Table
Pre-calculated player statistics:
- **Key Metrics**: VPIP, PFR, 3-Bet, C-Bet, WTSD
- **JSON Fields**: Positional stats, vs hero data
- **Updates**: Rebuilt after imports
- **Sample Sizes**: Stored for confidence calculations

### Annotations Table
User timeline markers:
- **Use Cases**: Session notes, strategy changes, milestones
- **Features**: Color coding, timestamps, full text notes

## 🔄 Migration System

### Creating New Migrations

1. Create file: `db/migrations/00X_description.sql`
2. Use sequential numbering (001, 002, 003...)
3. Include descriptive name after underscore
4. Make migrations **idempotent** (safe to re-run)

Example migration:

```sql
-- Migration 004: Add game_type column
-- Version: 004
-- Date: 2025-11-09
-- Description: Track game type (Cash, MTT, SNG)

ALTER TABLE hands ADD COLUMN game_type TEXT DEFAULT 'Cash';

CREATE INDEX IF NOT EXISTS idx_hands_game_type ON hands(game_type);

INSERT OR IGNORE INTO schema_migrations (version, name, applied_at) 
VALUES (4, 'add_game_type', strftime('%s', 'now'));
```

### Best Practices

✅ **DO:**
- Number migrations sequentially
- Test on backup database first
- Use `IF NOT EXISTS` for safety
- Document purpose in comments
- Keep migrations focused (one change per file)

❌ **DON'T:**
- Modify existing migrations after release
- Skip version numbers
- Delete applied migrations
- Mix data changes with schema changes

## 🔍 Views

### v_recent_hands
Quick access to recent hands with calculated results:
```sql
SELECT * FROM v_recent_hands LIMIT 100;
```

### v_active_sessions
Current active sessions with player counts:
```sql
SELECT * FROM v_active_sessions;
```

### v_player_summary
Player stats summary (10+ hands):
```sql
SELECT * FROM v_player_summary WHERE hands >= 50;
```

## 🎯 Indexes

Optimized for common query patterns:
- **Time-based**: `idx_hands_ts`, `idx_hands_date`
- **Player-based**: `idx_hands_hero`, `idx_hands_hero_date`
- **Stakes-based**: `idx_hands_stake`
- **Profit-based**: `idx_hands_heronet`

## 💾 Backup & Maintenance

### Create Backup

```javascript
// From application
const { MigrationManager } = require('./db/migrate.cjs');
const manager = new MigrationManager('hands.db');
manager.connect();
manager.db.backup('backup-' + Date.now() + '.db');
```

### Vacuum Database

```bash
# Reclaim unused space
sqlite3 hands.db "VACUUM;"
```

### Check Database Size

```bash
# On Windows (PowerShell)
Get-ChildItem hands.db | Select-Object Name, @{Name="Size(MB)";Expression={[math]::Round($_.Length/1MB,2)}}

# On Linux/Mac
ls -lh hands.db
```

## 📈 Performance Tips

1. **Regular VACUUM**: Run monthly to reclaim space
2. **ANALYZE**: Update statistics after large imports
   ```sql
   ANALYZE;
   ```
3. **WAL Mode**: Already enabled for better concurrency
4. **Index Maintenance**: Monitor slow queries, add indexes as needed

## 🧪 Testing

### Verify Schema

```bash
# Check table structure
sqlite3 hands.db ".schema hands"

# Check all tables
sqlite3 hands.db ".tables"

# Check indexes
sqlite3 hands.db ".indexes hands"
```

### Validate Data

```sql
-- Check for orphaned data
SELECT COUNT(*) FROM live_players 
WHERE session_id NOT IN (SELECT id FROM sessions);

-- Verify foreign keys
PRAGMA foreign_key_check;

-- Check index usage
EXPLAIN QUERY PLAN 
SELECT * FROM hands WHERE hero = 'Hero' ORDER BY ts DESC LIMIT 100;
```

## 🔧 Troubleshooting

### Migration Fails

```bash
# Check current version
node db/migrate.cjs status

# Review error logs
# Fix issue in migration file
# Re-run
node db/migrate.cjs migrate
```

### Database Locked

- Close all connections
- Disable antivirus temporarily
- Check for zombie processes
- Restart application

### Corrupt Database

```bash
# Check integrity
sqlite3 hands.db "PRAGMA integrity_check;"

# Restore from backup
cp hands.db hands.db.corrupt
cp backup-TIMESTAMP.db hands.db
```

## 📚 Resources

- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [better-sqlite3 API](https://github.com/WiseLibs/better-sqlite3/wiki/API)
- [Database Best Practices](https://www.sqlite.org/bestpractice.html)

## 🤝 Contributing

When adding database changes:

1. Create migration file
2. Update schema.sql documentation
3. Test on sample database
4. Update this README if needed
5. Submit PR with schema change description

---

**Version**: 1.0.0  
**Last Updated**: November 9, 2025  
**Database**: SQLite 3.x  
**Node Module**: better-sqlite3
