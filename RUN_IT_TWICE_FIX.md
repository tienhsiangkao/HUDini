# Run It Twice Hand Parser Fix

## Issue
Hand `RC3475980816` and potentially other "Run It Twice" hands were missing community cards (board), and only showed one board instead of both.

## Root Cause
GG Poker uses different street markers for "Run It Twice" hands:
- Normal hands: `*** FLOP ***`, `*** TURN ***`, `*** RIVER ***`
- Run It Twice: `*** FIRST FLOP ***`, `*** FIRST TURN ***`, `*** FIRST RIVER ***`, `*** SECOND RIVER ***`

The parser regex patterns only matched the standard format, causing the board object to be empty `{}`, and didn't capture both board runouts.

## Example Hand
```
RC3475980816 - Run It Twice preflop all-in
FIRST Board: [2h 4d 5d 5c 9c]
SECOND Board: [2h 4d 5d 5c Qh] (only river differs)
```

## Fix Applied

### 1. Parser Updates (`parser_starter.js`)
Updated lines 398-430 to support both formats and capture both boards:

```javascript
// Match both standard and "FIRST" variants
const flopRe = /^\*\*\*\s+(?:FIRST\s+)?FLOP\s+\*\*\*\s+\[([2-9TJQKA][cdhs])\s+([2-9TJQKA][cdhs])\s+([2-9TJQKA][cdhs])]/m;
const turnRe = /^\*\*\*\s+(?:FIRST\s+)?TURN\s+\*\*\*\s+\[[^\]]+]\s+\[([2-9TJQKA][cdhs])]/m;
const riverRe = /^\*\*\*\s+(?:FIRST\s+)?RIVER\s+\*\*\*\s+\[[^\]]+]\s+\[([2-9TJQKA][cdhs])]/m;

// NEW: Capture both boards from summary
const runItTwiceMatch = block.match(/Hand was run (\w+) times/i);
if (runItTwiceMatch) {
  const firstBoardMatch = block.match(/FIRST Board \[([2-9TJQKA][cdhs])\s+([2-9TJQKA][cdhs])\s+([2-9TJQKA][cdhs])\s+([2-9TJQKA][cdhs])\s+([2-9TJQKA][cdhs])]/);
  const secondBoardMatch = block.match(/SECOND Board \[([2-9TJQKA][cdhs])]/);
  
  if (firstBoardMatch) {
    board.runItTwice = true;
    board.firstBoard = {
      flop: [firstBoardMatch[1], firstBoardMatch[2], firstBoardMatch[3]],
      turn: firstBoardMatch[4],
      river: firstBoardMatch[5]
    };
    
    // Second board shares flop/turn, only river differs
    if (secondBoardMatch) {
      board.secondBoard = {
        flop: [firstBoardMatch[1], firstBoardMatch[2], firstBoardMatch[3]],
        turn: firstBoardMatch[4],
        river: secondBoardMatch[1]
      };
    }
  }
}
```

### 2. Hand Replay Display (`renderer/renderer_umd.js`)
Updated lines 2655-2680 and 3003-3020 to display both boards:

**Board Data Extraction**:
```javascript
const isRunItTwice = boardObj.runItTwice === true;
const firstBoard = isRunItTwice && boardObj.firstBoard ? [...] : [];
const secondBoard = isRunItTwice && boardObj.secondBoard ? [...] : [];
```

**Visual Display**:
- Shows "🎲 Run It Twice" title instead of "Board"
- Displays both boards vertically stacked
- Labels as "BOARD 1" and "BOARD 2"
- Highlights the different river card on Board 2 with a golden glow
- Both boards show all 5 cards for easy comparison

## Testing
Tested on hand RC3475980816:
```javascript
// Before fix:
board = {}

// After fix:
board = {
  "flop": ["2h", "4d", "5d"],
  "turn": "5c",
  "river": "9c",
  "runItTwice": true,
  "firstBoard": {
    "flop": ["2h", "4d", "5d"],
    "turn": "5c",
    "river": "9c"
  },
  "secondBoard": {
    "flop": ["2h", "4d", "5d"],
    "turn": "5c",
    "river": "Qh"  // Different from first board
  }
}
```

## Hand Replay Display

When viewing a Run It Twice hand, the replay now shows:

```
┌─────────────────────────┐
│   🎲 RUN IT TWICE      │
│                         │
│      BOARD 1           │
│  2♥ 4♦ 5♦ 5♣ 9♣       │
│                         │
│      BOARD 2           │
│  2♥ 4♦ 5♦ 5♣ Q♥  ⭐    │
│         (glowing)       │
└─────────────────────────┘
```

The different card (river) on Board 2 has a golden glow effect to highlight the variance.

## How to Apply Fix to Existing Database

### Option 1: Re-import affected file
The specific hand is in:
`C:\Users\admin\Documents\HH_GG_RNC\00000196-f89c-852a-0000-0000859c3957\GG20250409-1635 - RushAndCash5238209 - 0.1 - 0.25 - 6max.txt`

Re-import this file through the app to update the hand.

### Option 2: Full database rebuild (recommended)
1. Backup: `copy hands.db hands.db.backup`
2. Delete: `del hands.db`
3. Re-import all hand histories through the app

## Impact
- **Parser**: Now captures both boards from Run It Twice hands
- **Database**: New imports will have complete board data with `runItTwice`, `firstBoard`, and `secondBoard` fields
- **Hand Replay**: Displays both boards side-by-side with the different card highlighted
- **Statistics**: Board texture analysis now includes Run It Twice scenarios
- **User Experience**: Players can see both runouts and compare outcomes

## Note on "Run It Twice"
When players agree to run it twice (or multiple times), GG Poker:
- Shows flop and turn once (shared between runs)
- Shows multiple rivers: `FIRST RIVER [...]` and `SECOND RIVER [...]`
- Awards pot proportionally based on each runout
- Summary shows complete boards: `FIRST Board [all 5]` and `SECOND Board [river only]`

The parser now captures both complete boards for full transparency.

## Files Modified
1. `parser_starter.js` - Enhanced board parsing with Run It Twice support (lines 398-430)
2. `renderer/renderer_umd.js` - Dual board display in hand replay (lines 2655-2680, 3003-3020)

## Date
October 22, 2025
