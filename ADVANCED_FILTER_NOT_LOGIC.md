# Advanced Filter Builder - NOT Logic Addition

## Overview

Added NOT logic to the Advanced Filter Builder, allowing users to negate any filter condition. This enables queries like "NOT Position = BTN" or "NOT Result = lost" for more precise hand filtering.

## Changes Made

### 1. Frontend UI (`renderer/renderer_umd.js`)

#### Added NOT Toggle Button
Each condition row now includes a NOT button between the row number and field selector:

```javascript
// NOT toggle button
React.createElement('button', {
  key: 'not',
  type: 'button',
  onClick: () => toggleNot(condition.id),
  disabled: !condition.enabled,
  title: condition.not ? 'Click to remove NOT' : 'Click to add NOT',
  style: {
    padding: '4px 10px',
    fontSize: 12,
    fontWeight: 700,
    borderRadius: 4,
    border: `2px solid ${condition.not ? '#ef4444' : '#d1d5db'}`,
    background: condition.not ? '#fee2e2' : 'white',
    color: condition.not ? '#dc2626' : '#9ca3af',
    cursor: condition.enabled ? 'pointer' : 'not-allowed',
    minWidth: '50px'
  }
}, condition.not ? 'NOT' : 'NOT')
```

**Visual Design:**
- **Inactive**: Gray text, white background, gray border
- **Active**: Red text, light red background, red border
- Always shows "NOT" text (color changes based on state)
- Disabled when condition is disabled
- Minimum width of 50px for consistent layout

#### State Management Updates

**Initial State:**
```javascript
const [conditions, setConditions] = React.useState([
  { id: 1, field: 'position', operator: '=', value: '', enabled: true, not: false }
]);
```

**Toggle Function:**
```javascript
const toggleNot = (id) => {
  setConditions(conditions.map(c => c.id === id ? { ...c, not: !c.not } : c));
};
```

**Add Condition:**
```javascript
const addCondition = () => {
  setConditions([...conditions, { 
    id: nextId, 
    field: 'position', 
    operator: '=', 
    value: '', 
    enabled: true,
    not: false  // NEW
  }]);
  setNextId(nextId + 1);
};
```

### 2. Backend SQL Generation (`electron-main.cjs`)

#### Updated buildAdvancedFilterSQL Function

**Before:**
```javascript
for (const condition of advancedFilters.conditions) {
  const { field, operator, value } = condition;
  // ... build clause
  clauses.push(clause);
  params.push(...conditionParams);
}
```

**After:**
```javascript
for (const condition of advancedFilters.conditions) {
  const { field, operator, value, not } = condition;
  let subClause = '';
  const subParams = [];
  
  // ... build subClause and subParams
  
  // Apply NOT wrapper if needed
  if (subClause) {
    if (not) {
      clauses.push(`NOT (${subClause})`);
    } else {
      clauses.push(subClause);
    }
    params.push(...subParams);
  }
}
```

**Key Changes:**
1. Extract `not` flag from condition
2. Build clause into `subClause` variable first
3. Wrap with `NOT (...)` if flag is true
4. Push to main clauses array

## SQL Examples

### Example 1: Simple NOT
**Condition:**
```
NOT Position = BTN
```

**Generated SQL:**
```sql
NOT (json LIKE '%"BTN"%')
```

### Example 2: NOT with Numeric Comparison
**Condition:**
```
NOT Hero Net (USD) > 0
```

**Generated SQL:**
```sql
NOT (heroNet > ?)
Params: [0]
```

### Example 3: Multiple NOT Conditions with AND
**Conditions:**
```
1. NOT Position = SB
2. NOT Position = BB
3. Result = won
```

**Generated SQL:**
```sql
(NOT (json LIKE '%"SB"%') AND NOT (json LIKE '%"BB"%') AND heroNet > 0.005)
```

### Example 4: Mixed NOT with OR
**Conditions:**
```
1. NOT Result = lost
2. Hero Net (USD) > 10
```
**Logic:** OR

**Generated SQL:**
```sql
(NOT (heroNet < -0.005) OR heroNet > ?)
Params: [10]
```

## Use Cases

### 1. Exclude Positions
Find hands from any position EXCEPT the blinds:
```
NOT Position = SB (AND)
NOT Position = BB (AND)
Result = won
```

### 2. Exclude Players
Find hands against anyone EXCEPT specific villain:
```
Position = BTN (AND)
NOT Villain Name contains "Fish123" (AND)
Result = won
```

### 3. Invert Results
Find hands that weren't losses:
```
NOT Result = lost
```
(Includes wins and break-even hands)

### 4. Complex Exclusions
Find profitable non-showdown hands:
```
NOT Showdown = showdown (AND)
Hero Net (USD) > 0
```

### 5. Date Exclusions
Find hands from any time EXCEPT last week:
```
NOT Date >= 2024-10-17
```

## Testing Checklist

- [x] NOT button renders correctly
- [x] NOT button toggles on/off
- [x] Visual state changes (gray ↔ red)
- [x] Disabled when condition disabled
- [x] NOT flag saved in condition state
- [x] SQL wraps with NOT () correctly
- [x] Works with all field types
- [x] Works with all operators
- [x] Works with AND logic
- [x] Works with OR logic
- [x] Multiple NOT conditions work together
- [x] Mixed NOT and regular conditions work
- [x] Parameterized queries still safe
- [ ] Test with large datasets (TODO)
- [ ] Test complex nested cases (TODO)

## Known Limitations

1. **No Double Negation Prevention**: User can combine NOT with != operator (e.g., "NOT Position != BTN"), which creates double negation. Not blocked, but could be confusing.

2. **No Visual Explanation**: UI doesn't explain what NOT does - users need to understand boolean logic.

3. **JSON LIKE Negation**: For fields like position and villain that use JSON LIKE, NOT wrapping may not be 100% accurate due to approximate matching.

## Future Enhancements

1. **Smart Operator Adjustment**: When NOT is enabled, could auto-swap operators (e.g., `=` becomes `!=`, `>` becomes `<=`)

2. **Tooltip Explanation**: Add tooltip that explains NOT effect: "NOT Position = BTN" → "Show hands where position is NOT BTN"

3. **Prevent Double Negation**: Disable certain operators when NOT is active (e.g., hide `!=` when NOT enabled)

4. **Visual Query Preview**: Show the actual SQL or natural language interpretation of the query

5. **NOT Badge in Logic Chain**: Add visual "NOT" indicator in the logic badge between conditions

## Files Modified

1. `renderer/renderer_umd.js`
   - Added `not: false` to initial condition state
   - Added `toggleNot()` function
   - Added NOT button to condition row
   - Updated `addCondition()` and `clearAll()` to include NOT flag

2. `electron-main.cjs`
   - Updated `buildAdvancedFilterSQL()` to handle NOT flag
   - Changed to build `subClause` first, then wrap with NOT if needed
   - All field types support NOT wrapping

3. `ADVANCED_FILTER_BUILDER.md`
   - Updated with NOT logic documentation
   - Added NOT examples (Examples 5, 6, 7)
   - Updated UI component description
   - Updated changelog

## Impact on Existing Functionality

✅ **Backward Compatible**: Existing filters without `not` flag default to `false`
✅ **No Breaking Changes**: All existing queries work as before
✅ **Performance**: No impact - NOT is a simple SQL wrapper
✅ **Safety**: Parameterized queries still prevent SQL injection

## Quick Start Guide

1. **Open Hand Browser** tab
2. **Click "🔍 Advanced Filter Builder"** to expand
3. **Add a condition** (or use the default one)
4. **Click the "NOT" button** to toggle negation (turns red when active)
5. **Select field, operator, and value** as usual
6. **Click "Apply"** to run the query

**Example Query:**
- Enable checkbox ✓
- Click NOT (turns red)
- Field: Position
- Operator: equals
- Value: BTN
- Logic: AND
- Click "Apply 1 Filter"

Result: Shows all hands where hero was NOT on the button.
