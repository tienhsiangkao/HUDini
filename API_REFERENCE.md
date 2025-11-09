# API Reference

Complete reference for all IPC handlers in HUDini. All handlers use Electron's `ipcMain.handle()` / `ipcRenderer.invoke()` pattern.

## Table of Contents

- [Hands Handlers](#hands-handlers) (9 endpoints)
- [Stats Handlers](#stats-handlers) (8 endpoints)
- [Annotations Handlers](#annotations-handlers) (4 endpoints)
- [Sessions Handlers](#sessions-handlers) (3 endpoints)
- [Database Handlers](#database-handlers) (4 endpoints)
- [Import Handlers](#import-handlers) (10 endpoints)
- [Reports Handlers](#reports-handlers) (4 endpoints)
- [UI Handlers](#ui-handlers) (3 endpoints)
- [Error Handling](#error-handling)

---

## Hands Handlers

### `hands:list`

Retrieve a paginated list of hands with filtering, sorting, and search capabilities.

**Parameters:**
```typescript
{
  limit?: number;          // Max results (default: 100, max: 1000)
  offset?: number;         // Skip N results (default: 0)
  result?: 'won' | 'lost'; // Filter by outcome
  stake?: string;          // Filter by stake (e.g., "0.25/0.50")
  q?: string;              // Search query (hand ID, player names)
  sortBy?: 'ts' | 'net';   // Sort field (default: 'ts')
  sortDir?: 'asc' | 'desc'; // Sort direction (default: 'desc')
  advancedFilters?: Array<{
    field: string;         // Field to filter (e.g., 'position', 'action')
    operator: '=' | '!=' | '>' | '<' | 'IN' | 'NOT IN';
    value: any;
    not?: boolean;         // Invert the condition
  }>;
}
```

**Response:**
```typescript
{
  success: boolean;
  data: Array<{
    id: string;            // Hand ID
    ts: number;            // Unix timestamp (ms)
    stake: string;         // e.g., "0.25/0.50"
    net: number;           // Net profit/loss
    position: string;      // e.g., "BTN", "CO", "SB"
    result: 'won' | 'lost';
    room: string;          // Poker room name
  }>;
  total: number;           // Total matching hands
}
```

**Example:**
```javascript
const result = await window.electron.invoke('hands:list', {
  limit: 50,
  result: 'won',
  stake: '0.25/0.50',
  sortBy: 'net',
  sortDir: 'desc',
  advancedFilters: [
    { field: 'position', operator: 'IN', value: ['BTN', 'CO'] }
  ]
});
```

---

### `hands:get`

Get a single hand by ID (lightweight version without full hand history).

**Parameters:**
- `handId` (string): The hand ID

**Response:**
```typescript
{
  success: boolean;
  data: {
    id: string;
    ts: number;
    stake: string;
    net: number;
    position: string;
    result: 'won' | 'lost';
    room: string;
  } | null;
}
```

---

### `hands:getById`

Get complete hand details including parsed hand history JSON.

**Parameters:**
- `handId` (string): The hand ID

**Response:**
```typescript
{
  success: boolean;
  data: {
    id: string;
    ts: number;
    stake: string;
    net: number;
    position: string;
    result: 'won' | 'lost';
    room: string;
    raw_text: string;      // Original hand history text
    parsed: {              // Parsed hand data
      players: Array<{ name: string; chips: number; position: string }>;
      actions: Array<{ player: string; action: string; amount?: number }>;
      board?: string[];    // Community cards
      pot: number;
      // ... additional parsed fields
    };
  } | null;
}
```

---

### `hands:getRange`

Aggregate hands by starting hand type with statistics (VPIP, PFR, win rate).

**Parameters:**
```typescript
{
  position?: 'BTN' | 'CO' | 'MP' | 'EP' | 'SB' | 'BB' | 'all'; // Default: 'all'
  action?: 'raise' | 'call' | 'fold' | 'all';                  // Default: 'all'
  forceRefresh?: boolean;                                       // Bypass cache
}
```

**Response:**
```typescript
{
  success: boolean;
  data: {
    hands: {
      [handType: string]: {  // e.g., "AA", "KK", "AKs"
        count: number;
        vpip: number;         // % voluntary put in pot
        pfr: number;          // % preflop raise
        won: number;
        lost: number;
        winRate: number;      // % of hands won
        totalNet: number;     // Total profit/loss
      };
    };
    totalHands: number;
    cached: boolean;
    cacheAge?: number;        // Seconds since cache creation
  };
}
```

---

### `hands:stakes`

Get list of all unique stakes in the database, sorted by big blind.

**Parameters:** None

**Response:**
```typescript
{
  success: boolean;
  data: Array<{
    stake: string;         // e.g., "0.25/0.50"
    sb: number;            // Small blind
    bb: number;            // Big blind
    count: number;         // Number of hands at this stake
  }>;
}
```

---

### `hands:getNotes`

Get notes for a specific hand.

**Parameters:**
- `handId` (string): The hand ID

**Response:**
```typescript
{
  success: boolean;
  data: {
    notes: string | null;
  };
}
```

---

### `hands:saveNotes`

Save or update notes for a hand.

**Parameters:**
- `handId` (string): The hand ID
- `notes` (string): The notes text

**Response:**
```typescript
{
  success: boolean;
}
```

---

### `hands:searchNotes`

Search hands by note content.

**Parameters:**
- `query` (string): Search text

**Response:**
```typescript
{
  success: boolean;
  data: Array<{
    id: string;
    ts: number;
    notes: string;
    stake: string;
    net: number;
  }>;
}
```

---

### `hands:delete`

Delete multiple hands by ID.

**Parameters:**
- `handIds` (string[]): Array of hand IDs (max 1000)

**Response:**
```typescript
{
  success: boolean;
  deleted: number;       // Number of hands deleted
}
```

**Errors:**
- `"handIds must be an array"`
- `"handIds array cannot be empty"`
- `"Cannot delete more than 1000 hands at once"`

---

## Stats Handlers

### `stats:list`

Get player statistics with filtering and search.

**Parameters:**
```typescript
{
  limit?: number;          // Max results (default: 100)
  offset?: number;         // Skip N results (default: 0)
  playerName?: string;     // Filter by exact player name
  search?: string;         // Search player names (partial match)
  minHands?: number;       // Minimum hand count filter
}
```

**Response:**
```typescript
{
  success: boolean;
  data: Array<{
    player_name: string;
    hands: number;
    vpip: number;          // % voluntary put in pot
    pfr: number;           // % preflop raise
    three_bet: number;     // % 3-bet
    wtsd: number;          // % went to showdown
    total_won: number;
    total_net: number;
    bb_per_100: number;    // Big blinds per 100 hands
    last_seen: number;     // Unix timestamp (ms)
  }>;
  total: number;
}
```

---

### `stats:heroName`

Get the most recent hero (logged-in player) name.

**Parameters:** None

**Response:**
```typescript
{
  success: boolean;
  data: {
    heroName: string | null;
  };
}
```

---

### `stats:heroBreakdown`

Get hero's performance breakdown by various dimensions.

**Parameters:**
```typescript
{
  from?: string;           // Start date (ISO 8601)
  to?: string;             // End date (ISO 8601)
}
```

**Response:**
```typescript
{
  success: boolean;
  data: {
    overall: {
      hands: number;
      totalNet: number;
      bb_per_100: number;
      vpip: number;
      pfr: number;
      three_bet: number;
    };
    byPosition: {
      [position: string]: {
        hands: number;
        totalNet: number;
        bb_per_100: number;
      };
    };
    byStake: {
      [stake: string]: {
        hands: number;
        totalNet: number;
        bb_per_100: number;
      };
    };
  };
}
```

---

### `stats:positionProfitability`

Get detailed profitability analysis by position.

**Parameters:**
```typescript
{
  from?: string;           // Start date (ISO 8601)
  to?: string;             // End date (ISO 8601)
  stake?: string;          // Filter by stake
}
```

**Response:**
```typescript
{
  success: boolean;
  data: {
    [position: string]: {
      hands: number;
      won: number;
      lost: number;
      totalNet: number;
      bb_per_100: number;
      vpip: number;
      pfr: number;
      three_bet: number;
      aggression_factor: number;
    };
  };
}
```

---

### `stats:hourlyHeatmap`

Get hourly performance data for heatmap visualization.

**Parameters:**
```typescript
{
  from?: string;           // Start date (ISO 8601)
  to?: string;             // End date (ISO 8601)
  timezone?: string;       // Timezone (default: system timezone)
}
```

**Response:**
```typescript
{
  success: boolean;
  data: {
    [dayOfWeek: number]: {  // 0 = Sunday, 6 = Saturday
      [hour: number]: {     // 0-23
        hands: number;
        totalNet: number;
        bb_per_100: number;
        winRate: number;
      };
    };
  };
}
```

---

### `stats:rebuild`

Rebuild the `player_stats` table from hand data.

**Parameters:** None

**Response:**
```typescript
{
  success: boolean;
  playersProcessed: number;
  duration: number;        // Milliseconds
}
```

---

### `stats:exportCSV`

Export data to CSV file.

**Parameters:**
- `data` (Array<object>): Data to export
- `filename` (string): Output filename (without extension)

**Response:**
```typescript
{
  success: boolean;
  filePath: string;        // Absolute path to saved CSV
}
```

---

### `stats:list:export`

Export player stats to CSV format (returns string, not file).

**Parameters:**
- `stats` (Array<object>): Player stats to export

**Response:**
```typescript
{
  success: boolean;
  data: string;            // CSV content as string
}
```

---

### `hero:graphData`

Get cumulative profit/loss graph data for hero.

**Parameters:**
```typescript
{
  limit?: number;          // Max data points (default: 10000)
  from?: string;           // Start date (ISO 8601)
  to?: string;             // End date (ISO 8601)
}
```

**Response:**
```typescript
{
  success: boolean;
  data: Array<{
    handNumber: number;    // Sequential hand number
    ts: number;            // Unix timestamp (ms)
    net: number;           // Net for this hand
    cumulative: number;    // Running total
  }>;
}
```

---

## Annotations Handlers

### `annotations:getAll`

Get all timeline annotations.

**Parameters:** None

**Response:**
```typescript
{
  success: boolean;
  data: Array<{
    id: number;
    ts: number;            // Unix timestamp (ms)
    date: string;          // ISO 8601 date string
    label: string;
    color: string;         // Hex color (e.g., "#FF5722")
    notes: string;
  }>;
}
```

---

### `annotations:add`

Add a new annotation to the timeline.

**Parameters:**
```typescript
{
  ts: number;              // Unix timestamp (ms)
  date: string;            // ISO 8601 date string
  label: string;
  color?: string;          // Default: "#FF5722"
  notes?: string;          // Default: ""
}
```

**Response:**
```typescript
{
  success: boolean;
  data: {
    id: number;            // New annotation ID
  };
}
```

**Errors:**
- `"timestamp must be a valid number"`
- `"NOT NULL constraint failed: annotations.ts"`

---

### `annotations:update`

Update an existing annotation.

**Parameters:**
```typescript
{
  id: number;              // Annotation ID (required)
  label?: string;
  color?: string;
  notes?: string;
}
```

**Response:**
```typescript
{
  success: boolean;
  changes: number;         // Number of rows updated
}
```

**Errors:**
- `"Missing required field: id"`

---

### `annotations:delete`

Delete an annotation by ID.

**Parameters:**
- `id` (number): Annotation ID

**Response:**
```typescript
{
  success: boolean;
  deleted: boolean;        // True if annotation was found and deleted
}
```

**Errors:**
- `"Missing required field: id"`

---

## Sessions Handlers

### `sessions:list`

Get list of detected play sessions.

**Parameters:**
```typescript
{
  sessionGapMinutes?: number;  // Gap to separate sessions (default: 30)
  limit?: number;              // Max sessions (default: 50)
}
```

**Response:**
```typescript
{
  success: boolean;
  data: Array<{
    sessionId: number;
    start: number;             // Unix timestamp (ms)
    end: number;               // Unix timestamp (ms)
    duration: number;          // Minutes
    hands: number;
    totalNet: number;
    bb_per_100: number;
  }>;
}
```

---

### `sessions:detect`

Detect and group hands into sessions.

**Parameters:**
```typescript
{
  gapMinutes?: number;         // Gap to separate sessions (default: 30)
}
```

**Response:**
```typescript
{
  success: boolean;
  data: Array<{
    sessionId: number;
    start: number;
    end: number;
    duration: number;
    hands: number;
    totalNet: number;
    bb_per_100: number;
    handIds: string[];         // Array of hand IDs in this session
  }>;
}
```

---

### `sessions:details`

Get detailed statistics for a specific session.

**Parameters:**
- `sessionId` (number): Session ID, OR
- `handIds` (string[]): Array of hand IDs to analyze

**Response:**
```typescript
{
  success: boolean;
  data: {
    sessionId: number | null;
    start: number;
    end: number;
    duration: number;
    hands: number;
    totalNet: number;
    bb_per_100: number;
    vpip: number;
    pfr: number;
    three_bet: number;
    wtsd: number;
    wonAtShowdown: number;
    positionBreakdown: {
      [position: string]: {
        hands: number;
        totalNet: number;
        bb_per_100: number;
      };
    };
    handIds: string[];
  } | null;
}
```

---

## Database Handlers

### `db:counts`

Get record counts for all database tables.

**Parameters:** None

**Response:**
```typescript
{
  success: boolean;
  data: {
    hands: number;
    player_stats: number;
    annotations: number;
    // ... additional table counts
  };
}
```

---

### `db:backup`

Create a backup of the database.

**Parameters:** None

**Response:**
```typescript
{
  success: boolean;
  backupPath: string;        // Absolute path to backup file
  size: number;              // Backup file size in bytes
}
```

---

### `db:restore`

Restore database from a backup file (opens file picker).

**Parameters:** None

**Response:**
```typescript
{
  success: boolean;
  restoredFrom: string;      // Path to restored backup file
}
```

**Notes:**
- Opens native file picker dialog
- Requires app restart after restore

---

### `db:clear`

Delete all data from the database.

**Parameters:** None

**Response:**
```typescript
{
  success: boolean;
  tablesCleared: number;
}
```

**Warning:** This operation is irreversible and deletes ALL data.

---

## Import Handlers

### `import:chooseFolders`

Open folder picker dialog to select import folders.

**Parameters:** None

**Response:**
```typescript
{
  success: boolean;
  folders: string[];         // Absolute paths to selected folders
}
```

---

### `import:start`

Start importing hand histories from folders.

**Parameters:**
- `folders` (string[]): Folder paths to import from
- `opts` (object): Import options
  - `parseHands` (boolean): Parse hand histories (default: true)
  - `dedup` (boolean): Skip duplicate hands (default: true)

**Response:**
```typescript
{
  success: boolean;
  stats: {
    files: number;           // Files processed
    hands: number;           // Hands imported
    duplicates: number;      // Duplicates skipped
    errors: number;
    duration: number;        // Milliseconds
  };
}
```

---

### `watch:addFolder`

Add a folder to the file watcher for live tracking.

**Parameters:**
- `folderPath` (string): Absolute path to watch

**Response:**
```typescript
{
  success: boolean;
  watching: string[];        // All watched folders
}
```

---

### `watch:removeFolder`

Remove a folder from the file watcher.

**Parameters:**
- `folderPath` (string): Path to stop watching

**Response:**
```typescript
{
  success: boolean;
  watching: string[];        // Remaining watched folders
}
```

---

### `watch:getWatchedFolders`

Get list of currently watched folders.

**Parameters:** None

**Response:**
```typescript
{
  success: boolean;
  data: string[];            // Array of watched folder paths
}
```

---

### `watch:stopAll`

Stop all file watchers.

**Parameters:** None

**Response:**
```typescript
{
  success: boolean;
  stopped: number;           // Number of watchers stopped
}
```

---

### `bulkImport:start`

Start bulk import operation (optimized for large datasets).

**Parameters:**
- `folders` (string[]): Folder paths to import

**Response:**
```typescript
{
  success: boolean;
  jobId: string;             // Unique job ID for tracking
}
```

**Notes:**
- Emits progress events via `bulkImport:progress`
- Use `bulkImport:getState` to check status

---

### `bulkImport:pause`

Pause the current bulk import operation.

**Parameters:** None

**Response:**
```typescript
{
  success: boolean;
  state: 'paused' | 'idle';
}
```

---

### `bulkImport:resume`

Resume a paused bulk import operation.

**Parameters:** None

**Response:**
```typescript
{
  success: boolean;
  state: 'running' | 'idle';
}
```

---

### `bulkImport:cancel`

Cancel the current bulk import operation.

**Parameters:** None

**Response:**
```typescript
{
  success: boolean;
  state: 'cancelled' | 'idle';
}
```

---

### `bulkImport:getState`

Get current bulk import state and progress.

**Parameters:** None

**Response:**
```typescript
{
  success: boolean;
  data: {
    state: 'idle' | 'running' | 'paused' | 'completed' | 'cancelled' | 'error';
    progress: {
      filesProcessed: number;
      filesTotal: number;
      handsImported: number;
      duplicates: number;
      errors: number;
      currentFile: string;
      percentComplete: number;
    };
    startTime: number | null;
    endTime: number | null;
    duration: number | null;  // Milliseconds
  };
}
```

---

## Reports Handlers

### `reports:generate`

Generate a comprehensive performance report.

**Parameters:**
```typescript
{
  from?: string;             // Start date (ISO 8601)
  to?: string;               // End date (ISO 8601)
  stake?: string;            // Filter by stake
  position?: string;         // Filter by position
}
```

**Response:**
```typescript
{
  success: boolean;
  data: {
    summary: {
      hands: number;
      totalNet: number;
      bb_per_100: number;
      vpip: number;
      pfr: number;
      three_bet: number;
      wtsd: number;
      wonAtShowdown: number;
    };
    byDate: Array<{
      date: string;
      hands: number;
      totalNet: number;
      bb_per_100: number;
    }>;
    byStake: Array<{
      stake: string;
      hands: number;
      totalNet: number;
      bb_per_100: number;
    }>;
    byPosition: Array<{
      position: string;
      hands: number;
      totalNet: number;
      bb_per_100: number;
    }>;
  };
}
```

---

### `reports:leaks`

Analyze common leaks and suggest improvements.

**Parameters:**
```typescript
{
  from?: string;             // Start date (ISO 8601)
  to?: string;               // End date (ISO 8601)
  minHands?: number;         // Minimum hands for analysis (default: 100)
}
```

**Response:**
```typescript
{
  success: boolean;
  data: {
    leaks: Array<{
      category: string;      // e.g., "Positional", "Aggression", "Showdown"
      issue: string;         // Description of the leak
      severity: 'high' | 'medium' | 'low';
      recommendation: string;
      metric: string;        // Affected metric name
      current: number;       // Current value
      optimal: number;       // Recommended value
    }>;
    strengths: Array<{
      category: string;
      description: string;
    }>;
  };
}
```

---

### `reports:trends`

Analyze performance trends over time.

**Parameters:**
```typescript
{
  from?: string;             // Start date (ISO 8601)
  to?: string;               // End date (ISO 8601)
  granularity?: 'day' | 'week' | 'month'; // Default: 'week'
}
```

**Response:**
```typescript
{
  success: boolean;
  data: {
    timeline: Array<{
      period: string;        // Date or date range
      hands: number;
      totalNet: number;
      bb_per_100: number;
      vpip: number;
      pfr: number;
      three_bet: number;
      trend: 'up' | 'down' | 'stable';
    }>;
    overall: {
      trendDirection: 'improving' | 'declining' | 'stable';
      changePercent: number;
    };
  };
}
```

---

### `reports:heatmap`

Generate heatmap data for various metrics.

**Parameters:**
```typescript
{
  metric: 'profit' | 'vpip' | 'pfr' | 'aggression';
  from?: string;             // Start date (ISO 8601)
  to?: string;               // End date (ISO 8601)
}
```

**Response:**
```typescript
{
  success: boolean;
  data: {
    [row: string]: {
      [column: string]: {
        value: number;
        hands: number;
        color: string;       // Hex color for heatmap
      };
    };
  };
}
```

---

## UI Handlers

### `hudv3:status`

Get HUD overlay status and configuration.

**Parameters:** None

**Response:**
```typescript
{
  success: boolean;
  data: {
    isActive: boolean;
    windowCount: number;
    screenScrapingEnabled: boolean;
  };
}
```

---

### `widgets:getConfig`

Get dashboard widget configuration.

**Parameters:** None

**Response:**
```typescript
{
  success: boolean;
  data: {
    widgets: Array<{
      id: string;
      type: string;
      position: { x: number; y: number };
      size: { width: number; height: number };
      config: object;        // Widget-specific configuration
    }>;
  };
}
```

---

### `widgets:saveConfig`

Save dashboard widget configuration.

**Parameters:**
```typescript
{
  widgets: Array<{
    id: string;
    type: string;
    position: { x: number; y: number };
    size: { width: number; height: number };
    config: object;
  }>;
}
```

**Response:**
```typescript
{
  success: boolean;
}
```

---

## Error Handling

All handlers follow a consistent error response format:

```typescript
{
  success: false;
  error: string;             // Error message
  code?: string;             // Error code (optional)
  details?: any;             // Additional error details (optional)
}
```

### Common Error Codes

- `VALIDATION_ERROR`: Invalid input parameters
- `NOT_FOUND`: Requested resource not found
- `DATABASE_ERROR`: Database operation failed
- `FILE_ERROR`: File system operation failed
- `PARSE_ERROR`: Hand history parsing failed

### Example Error Response

```javascript
{
  success: false,
  error: "handIds must be an array",
  code: "VALIDATION_ERROR"
}
```

### Best Practices

1. **Always check `success` field** before accessing `data`
2. **Handle errors gracefully** with user-friendly messages
3. **Validate inputs** before sending to handlers
4. **Use type checking** for better development experience
5. **Log errors** for debugging and monitoring

---

## Usage Example

```javascript
// In renderer process
async function loadHands() {
  try {
    const result = await window.electron.invoke('hands:list', {
      limit: 50,
      sortBy: 'net',
      sortDir: 'desc'
    });

    if (result.success) {
      console.log(`Loaded ${result.data.length} hands`);
      console.log(`Total: ${result.total}`);
      return result.data;
    } else {
      console.error('Failed to load hands:', result.error);
      return [];
    }
  } catch (error) {
    console.error('IPC error:', error);
    return [];
  }
}
```

---

## Version

API Version: 1.0.0  
Last Updated: November 2025  
HUDini Version: 1.0.0
