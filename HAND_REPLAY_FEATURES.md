# Hand Replay Features

## Recent Updates

### 1. BB/USD Currency Toggle
- **Added currency toggle button** in the hand replayer controls (top-right)
- **Synchronized with Hand Browser** - When you toggle BB/USD in the hand list, it automatically updates the replayer
- **Smart formatting**: 
  - USD mode: `$10.50`
  - BB mode: `21.0 BB` (calculated using table stakes)
- **Icons**: 💵 USD and 🎲 BB for clear visual indication
- All monetary values update: pot size, player stacks, and bet amounts

### 2. Position Labels
- **Position badges** displayed in the top-right corner of each player card
- **Color-coded**:
  - Hero positions: Brown badge (#78350f)
  - Other players: Blue badge (#3b82f6)
- **Standard positions shown**: UTG, MP, CO, BTN, SB, BB, etc.
- Positions are parsed from hand history and displayed prominently

### 3. Animated Chip Bets
- **Chip icon** 🪙 added to bet displays
- **Smooth animation** when bets appear:
  - Slides down from above
  - Scales up with a bounce effect
  - 0.3s animation duration
- **Visual feedback** makes it easy to track betting action
- Bets appear in red badge (#fee2e2 background, #dc2626 text)

### 4. Community Cards & Hole Cards Display
- **Board cards** display in center with proper suit symbols (♥♦♣♠)
- **Progressive reveal**: Cards appear as hand progresses (flop → turn → river)
- **Hole cards** shown for each player below their name
- **Hero cards**: Always visible (from dealt cards)
- **Opponent cards at showdown**: Revealed when they show (tracked through "shows" actions)
- **Hidden opponent cards**: Displayed as blue card backs (🂠 🂠) until revealed
- **Color-coded suits**: Red for hearts/diamonds, black for clubs/spades
- **Proper formatting**: Converts "Jh" → "J♥", "6d" → "6♦", etc.

### 5. Blind & Ante Tracking
- **Blinds properly tracked**: Small blind and big blind posts are recognized
- **Antes supported**: Multiple ante posts (including button antes) are handled
- **Pre-applied to initial state**: All blinds/antes visible from step 0 (hand start)
- **Bet tracking**: Posts actions (SB/BB/antes) counted in pot and shown as bets
- **Animated display**: Blinds appear with chip animation like other bets
- **Red envelope table support**: Handles up to 10 posts for tables with multiple antes
- **Flexible parsing**: Automatically detects and skips past all preflop posts to first action

## Known Limitations

### Red Envelope Tables
- Current implementation supports standard blind structures
- If you encounter issues with red envelope table blinds, please provide a sample hand
- The system looks for up to 10 "posts" actions at the start of preflop
- May need adjustments for non-standard ante structures

## Technical Implementation

### Currency System
- `replayCurrency` state in HandReplayer component
- `formatCurrency()` helper function converts values based on current mode
- BB calculation: `value / bbValue` where bbValue comes from `parsed.stakes.bb`
- Currency state lifted to BrowserView for synchronization between HandList and HandReplayer

### Position Data
- Positions stored in `player.position` property (parsed from hand history)
- `playerPositions` map created from players array
- Displayed as absolute-positioned badge on player cards

### Animations
- CSS `@keyframes chipSlide` animation added to index.html
- Animation properties:
  ```css
  0%: opacity 0, translateY(-10px), scale(0.8)
  60%: translateY(0), scale(1.1)
  100%: opacity 1, scale(1)
  ```
- Applied via inline style: `animation: 'chipSlide 0.3s ease-out'`

## User Interface

### Replayer Controls (Top Bar)
- ◀ Previous step
- ▶/⏸ Play/Pause
- ▶ Next step
- 💵 USD / 🎲 BB (Currency toggle)
- Speed selector (0.5x, 1x, 2x)
- Step counter (e.g., "Step 5/23 - FLOP")

### Table View (Left Panel)
- Green felt background (#0a5c3a)
- Board cards centered at top
- Pot display below board
- 2-column player grid showing:
  - Position badge (top-right)
  - Player name with ⭐ for hero
  - Hole cards (if available)
  - Stack amount
  - Current bet (animated with chip icon)

### Action Log (Right Panel)
- Scrollable list of all actions
- Current step highlighted in blue
- Street transitions marked
- Action descriptions with amounts

## Keyboard Shortcuts
- **Space**: Play/Pause
- **Arrow Left**: Previous step
- **Arrow Right**: Next step
- **Home**: Jump to start
- **End**: Jump to end
- **F/T/R/S**: Jump to Flop/Turn/River/Showdown

## Data Structure Requirements
- Hand object must have:
  - `parsed.stakes.bb` - Big blind value for BB calculations
  - `parsed.players[].position` - Player position (BTN, CO, etc.)
  - `parsed.players[].cards` - Hole cards array
  - `parsed.board.flop/turn/river` - Community cards
  - `parsed.actions[]` - Action sequence with street/player/type/amount
