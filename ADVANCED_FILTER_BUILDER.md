# Advanced Filter Builder with AND/OR Logic

## Overview

The Advanced Filter Builder allows users to create complex filter conditions that can be combined with AND/OR logic to precisely query hand histories. Each condition can also be negated using NOT logic for maximum flexibility.

## Features Implemented

### 1. Visual Filter Builder UI

**Location**: `renderer/renderer_umd.js` (AdvancedFilterBuilder component, line ~2649)

The filter builder provides:
- **Add/Remove Conditions**: Dynamically add or remove filter rows
- **Enable/Disable Toggles**: Temporarily disable conditions without deleting them
- **NOT Logic Toggle**: Negate any condition (e.g., NOT Position = BTN)
- **Field Selection**: Choose from 9 different fields to filter on
- **Operator Selection**: Context-aware operators based on field type
- **Value Input**: Type-specific inputs (text, number, date, select dropdown)
- **AND/OR Logic**: Toggle between combining conditions with AND vs OR
- **Visual Indicators**: Color-coded logic badges and active filter highlighting

### 2. Available Filter Fields

| Field | Type | Operators | Description |
|-------|------|-----------|-------------|
| **Position** | Select | =, != | Hero's position (BTN, CO, MP, EP, SB, BB) |
| **Result** | Select | =, != | Hand outcome (won, lost, breakeven) |
| **Hero Net (USD)** | Number | =, !=, >, <, >=, <= | Profit/loss in USD |
| **Hero Net (BB)** | Number | =, !=, >, <, >=, <= | Profit/loss in big blinds |
| **Stake** | Text | =, !=, contains, startsWith | Stake level (e.g., "0.25/0.50") |
| **Villain Name** | Text | =, !=, contains, startsWith | Opponent player names |
| **Showdown** | Select | =, != | Whether hand went to showdown |
| **Pot Size (USD)** | Number | =, !=, >, <, >=, <= | Final pot size |
| **Date** | Date | =, >, <, >=, <= | Hand date (YYYY-MM-DD) |

### 3. Backend SQL Generation

**Location**: `electron-main.cjs` (buildAdvancedFilterSQL function, line ~874)

The system generates safe, parameterized SQL WHERE clauses from filter conditions:

#### AND Logic Example
```javascript
Conditions:
- Position = BTN
- Result = won
- Hero Net > 0

Generated SQL:
(json LIKE '%"BTN"%' AND heroNet > 0.005 AND heroNet > ?)
Params: [0]
```

#### OR Logic Example
```javascript
Conditions:
- Position = BTN
- Position = CO

Generated SQL:
(json LIKE '%"BTN"%' OR json LIKE '%"CO"%')
Params: []
```

### 4. SQL Injection Prevention

All filter values use parameterized queries:
- User inputs never directly concatenated into SQL
- Numeric values validated with `parseFloat()` / `isNaN()`
- String values passed as parameters with `?` placeholders
- Date values converted to timestamps before querying

### 5. Integration with Existing Filters

The advanced filter builder works alongside existing filters:
- Basic filters (stake dropdown, position, result, etc.) continue to work
- Advanced filters are added as additional WHERE clauses with AND logic
- Both filter types can be used simultaneously
- Reset button clears both basic and advanced filters

## Usage Examples

### Example 1: Find Winning BTN Hands
```
1. ✓ Position = BTN
2. ✓ Result = won

Logic: AND
```
Result: Shows hands where hero was on the button AND won the hand.

### Example 2: Big Pots or Big Wins
```
1. ✓ Hero Net (USD) > 50
2. ✓ Pot Size (USD) > 100

Logic: OR
```
Result: Shows hands where hero won more than $50 OR pot was larger than $100.

### Example 3: Profitable Blind Defense
```
1. ✓ Position = BB
2. ✓ Hero Net (BB) > 5
3. ✓ Date >= 2024-01-01

Logic: AND
```
Result: Shows BB hands since Jan 1, 2024 that won 5+ big blinds.

### Example 4: High-Stakes Hands
```
1. ✓ Stake contains 2.00
2. ✓ Stake contains 5.00

Logic: OR
```
Result: Shows hands from 1.00/2.00 or 2.50/5.00 stakes.

### Example 5: NOT Logic - Exclude Positions (NEW!)
```
1. ✓ NOT Position = SB
2. ✓ NOT Position = BB
3. ✓ Result = won

Logic: AND
```
Result: Shows winning hands from positions OTHER THAN the blinds.

### Example 6: Complex NOT Logic (NEW!)
```
1. ✓ NOT Result = lost
2. ✓ Hero Net (USD) > 0

Logic: OR
```
Result: Shows hands where hero didn't lose OR won money (excludes only losing hands with negative profit).

### Example 7: Mixed NOT and Regular Conditions (NEW!)
```
1. ✓ Position = BTN
2. ✓ NOT Villain Name contains "Fish123"
3. ✓ Result = won

Logic: AND
```
Result: Shows winning BTN hands against anyone EXCEPT "Fish123".

## UI Components

### Filter Builder Toggle Button
- **Collapsed**: Shows "🔍 Advanced Filter Builder"
- **Active**: Shows "🔍 Advanced Filters (N active with AND/OR)"
- **Color**: Yellow highlight when filters are active

### Logic Selector
- **AND Button**: Blue highlight when selected
  - All conditions must match
  - Narrows results
  
- **OR Button**: Green highlight when selected
  - Any condition can match
  - Broadens results

### Condition Row
Each filter condition displays:
1. **Checkbox**: Enable/disable the condition
2. **Row Number**: Visual counter (1, 2, 3...)
3. **NOT Button**: Toggle to negate the condition (red when active)
4. **Field Dropdown**: Select what to filter on
5. **Operator Dropdown**: Changes based on field type
6. **Value Input**: Type-specific input control
7. **Remove Button**: Red X button (requires at least 1 condition)
8. **Logic Badge**: Shows AND/OR between rows

### Action Buttons
- **+ Add Condition**: Add a new filter row (blue)
- **Clear All**: Reset to single empty condition
- **Apply N Filters**: Execute query (green, shows count)

## Technical Implementation

### State Management

```javascript
// In HandList component
const [advancedFilterConditions, setAdvancedFilterConditions] = React.useState(null);

// Filter condition structure
{
  conditions: [
    { id: 1, field: 'position', operator: '=', value: 'BTN', enabled: true, not: false },
    { id: 2, field: 'heroNet', operator: '>', value: '10', enabled: true, not: false },
    { id: 3, field: 'villain', operator: 'contains', value: 'Fish', enabled: true, not: true }
  ],
  logic: 'AND'
}
```

### API Request

```javascript
// Added to debouncedRequest in HandList
{
  q: '...',
  result: 'all',
  stake: 'all',
  // ... other basic filters
  advancedFilters: advancedFilterConditions  // NEW
}
```

### Backend Processing

```javascript
// In electron-main.cjs hands:list handler
const { advancedFilters } = options || {};

// Generate SQL from conditions
const advancedSQL = buildAdvancedFilterSQL(advancedFilters);
if (advancedSQL.clause) {
  clauses.push(advancedSQL.clause);
  params.push(...advancedSQL.params);
}

// NOT logic is handled by wrapping clauses
// Example: NOT (position = 'BTN') becomes NOT (json LIKE '%"BTN"%')
```

## Performance Considerations

### Database Indexes
The following indexes support advanced filters:
- `idx_hands_heroNet` on `heroNet` column (for profit filters)
- `idx_hands_ts` on `ts` column (for date filters)
- `idx_hands_stakes` on `sb, bb` columns (for stake filters)

### JSON Column Limitations
Some filters (position, villain, showdown) require JSON parsing:
- Uses `json LIKE '%pattern%'` for approximate matching
- Not as efficient as indexed columns
- Consider adding JSON columns for frequently filtered fields

### Query Optimization
- Limit always enforced (max 1000 hands)
- Results sorted with proper index usage
- Parameterized queries prevent SQL injection
- Debounced requests (300ms) reduce API calls

## Future Enhancements

### Potential Improvements
1. **Nested Groups**: Support parentheses for complex logic
   - Example: `(A AND B) OR (C AND D)`
2. **Saved Filter Templates**: Quick presets for common queries
3. **JSON Column Extraction**: Move position/villain to indexed columns
4. **Filter Export/Import**: Share filter configs
5. **Visual Query Builder**: Drag-and-drop interface
6. **Filter History**: Recently used filters
7. **Auto-Complete**: Suggest values for text fields
8. **Regex Support**: Advanced text matching

### Performance Enhancements
1. Add computed columns for:
   - `heroPosition` (extracted from JSON)
   - `wentToShowdown` (boolean flag)
   - `finalPotSize` (numeric value)
2. Create composite indexes for common filter combinations
3. Implement query result caching
4. Add pagination for large result sets

## Testing Checklist

- [x] Simple AND logic (2 conditions)
- [x] Simple OR logic (2 conditions)
- [x] Multiple conditions (3+)
- [x] Numeric comparisons (>, <, >=, <=, =, !=)
- [x] Text filters (contains, startsWith, equals)
- [x] Date filters (before, after, equals)
- [x] Enable/disable toggle
- [x] Add/remove conditions
- [x] Clear all functionality
- [x] Integration with basic filters
- [x] Reset button clears advanced filters
- [ ] Large result sets (1000+ hands) - TODO
- [ ] Complex OR logic with many conditions - TODO
- [ ] Edge cases (empty values, invalid dates) - TODO

## Known Limitations

1. **JSON Parsing**: Position and villain filters use LIKE queries (slower)
2. **Pot Size**: Approximate matching due to JSON storage
3. **No Nested Groups**: Can only do (A AND B AND C) or (A OR B OR C), not ((A AND B) OR C)
4. **Text Matching**: Case-sensitive for some fields
5. **Date Precision**: Only supports date-level filtering, not time

## Changelog

### Version 1.1 (Current) - NOT Logic Added
- ✅ NOT toggle button for each condition
- ✅ Visual indicator (red highlight when active)
- ✅ SQL NOT wrapper: `NOT (condition)`
- ✅ Works with all field types and operators
- ✅ Examples: "NOT Position = BTN", "NOT Result = lost"

### Version 1.0
- ✅ Visual filter builder UI
- ✅ 9 filter fields with appropriate operators
- ✅ AND/OR logic support
- ✅ SQL generation with parameterized queries
- ✅ Integration with existing hand list
- ✅ Enable/disable condition toggles
- ✅ Clear all functionality
- ✅ Active filter counter
- ✅ Visual logic indicators
- ✅ Type-specific inputs (number, date, select, text)

## See Also

- [Basic Filters Documentation](./README.md#filters)
- [Hand Browser Guide](./README.md#hand-browser)
- [Database Schema](./database_indexes.sql)
