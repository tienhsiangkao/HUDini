# Live Tracking System for Anonymous Hand Histories

## 🎯 Problem Solved

**GGPoker Issue**: Hand history files use anonymous player IDs (like `add0a175`, `cb699490`) instead of real screennames, making it impossible to track specific opponents across sessions.

**Solution**: Real-time session-based tracking that captures stats as hands are played, using seat positions instead of player names.

---

## 📊 Architecture

### 1. **Live Tracker (`lib/live_tracker.cjs`)**
Separate SQLite database (`live_session.db`) that tracks the **current playing session only**.

**Key Features**:
- Tracks players by `table_id + seat_number` (not by name)
- Resets stats at the start of each session
- Calculates VPIP, PFR, C-Bet, WTSD in real-time
- Persists data for session review/analysis

**Database Schema**:
```sql
sessions
  - id (session timestamp)
  - table_id
  - started_at
  - ended_at
  - hands_played

live_players
  - session_id
  - table_id
  - seat_number (PRIMARY KEY with table_id)
  - display_name (defaults to "Seat X")
  - hands_seen, vpip_count, pfr_count
  - cbet_count, cbet_opp
  - wtsd_count, wtsd_opp
  - won_count, total_net

hand_actions
  - session_id
  - seat_number
  - street (preflop/flop/turn/river)
  - action_type (fold/call/bet/raise)
  - amount
  - timestamp
```

### 2. **HUD Manager Integration**
- `useLiveTracking` flag (default: true)
- Falls back to historical database if live tracking unavailable
- Methods:
  - `trackAction(tableId, seat, street, action, amount)` 
  - `trackHandComplete(tableId, seat, showdown, won, net)`
  - `getLiveStats(tableId)` - returns current session stats

### 3. **IPC Communication**
New events for action tracking:
```javascript
// From renderer/external tools
ipcRenderer.send('hud:track-action', {
  tableId: 'main',
  seatNumber: 3,
  street: 'preflop',
  action: 'raise',
  amount: 6
});

ipcRenderer.send('hud:track-hand-complete', {
  tableId: 'main',
  seatNumber: 3,
  wentToShowdown: true,
  won: true,
  netAmount: 12.5
});
```

---

## 🎮 How It Works

### Scenario: Playing at GGPoker Rush & Cash

**Step 1: Session Start**
```javascript
// HUD Manager automatically called when "Start HUD" clicked
hudManager.start()
  → liveTracker.init()  // Creates live_session.db
  → liveTracker.startSession('main')  // Records session start
```

**Step 2: Hand Begins**
Players at table:
- Seat 1: You (Hero)
- Seat 3: Anonymous player `add0a175`
- Seat 5: Anonymous player `cb699490`

HUD registers each seat automatically on first action.

**Step 3: Preflop Actions Tracked**
```javascript
// Seat 3 raises from BTN
trackAction('main', 3, 'preflop', 'raise', 3)
  → vpipCount++ (voluntary put money in)
  → pfrCount++ (preflop raise)

// Seat 1 (you) calls from BB
trackAction('main', 1, 'preflop', 'call', 3)
  → vpipCount++ (you called, but not a raise)
```

**Step 4: Postflop Actions**
```javascript
// Flop: You check, Seat 3 bets
trackAction('main', 3, 'flop', 'bet', 5)
  → cbetCount++ (continuation bet)
  → cbetOpp++ (had opportunity)

// You fold
trackAction('main', 1, 'flop', 'fold', 0)
```

**Step 5: Hand Complete**
```javascript
// Seat 3 wins pot
trackHandComplete('main', 3, false, true, +8.5)
  → handsSeen++
  → wonCount++
  → totalNet += 8.5

// You lost
trackHandComplete('main', 1, false, false, -3)
  → handsSeen++
  → totalNet -= 3
```

**Step 6: HUD Display Updates**
```
Seat 3 Stats:
  Hands: 12
  VPIP: 33.3%  (4 out of 12)
  PFR: 25.0%   (3 out of 12)
  C-Bet: 75.0% (3 out of 4 opportunities)
  WTSD: 40.0%  (went to showdown 2/5 times)
```

---

## 🔄 Current Limitations & Next Steps

### ⚠️ Current State
**Manual Tracking Required**: The system is built but needs external input. You must manually call:
```javascript
window.ipc.send('hud:track-action', {...})
```

### ✅ What Works Now
1. ✅ Live session database created
2. ✅ Stats calculated correctly (VPIP, PFR, WTSD, etc.)
3. ✅ HUD displays real-time updates
4. ✅ Seat-based tracking (anonymous-friendly)
5. ✅ Session persistence

### 🚧 What's Needed Next

#### Option 1: Auto-Import Integration (Recommended)
Hook into your existing auto-import system to parse hands as they're written to disk:

```javascript
// In your file watcher (AUTO_IMPORT_WATCH_FOLDER feature)
parseHandsFile(newFile)
  .then(hands => {
    hands.forEach(hand => {
      // Extract actions and track them
      hand.actions.forEach(action => {
        hudManager.trackAction(
          getTableId(hand),
          action.seat,
          action.street,
          action.type,
          action.amount
        );
      });
    });
  });
```

#### Option 2: Screen Scraping
Use OCR/image recognition to watch the poker table and detect actions:
- Electron can capture window regions
- Libraries: `tesseract.js`, `opencv4nodejs`
- Detect seat positions, bet amounts, action buttons

#### Option 3: Log File Monitoring
GGPoker might write a real-time log file:
- Watch for new log entries
- Parse action patterns
- Feed to live tracker

#### Option 4: Manual Test Panel (Quick Win)
Add a testing interface to HUD window for manual action input:

```html
<!-- Action Test Panel -->
<div class="test-panel">
  <h3>Manual Action Tracker</h3>
  <select id="testSeat">
    <option value="1">Seat 1 (Hero)</option>
    <option value="2">Seat 2</option>
    ...
  </select>
  <select id="testAction">
    <option value="raise">Raise</option>
    <option value="call">Call</option>
    <option value="fold">Fold</option>
    <option value="bet">Bet</option>
  </select>
  <input id="testAmount" type="number" placeholder="Amount">
  <button onclick="submitAction()">Track Action</button>
</div>
```

---

## 📈 Benefits Over Historical Database

| Feature | Historical DB | Live Tracking |
|---------|--------------|---------------|
| **Anonymous Players** | ❌ Can't track | ✅ Tracks by seat |
| **Real-time Updates** | ❌ Post-session only | ✅ Instant |
| **Current Session** | ❌ Mixed with all history | ✅ Clean session data |
| **VPIP Accuracy** | ✅ Long-term average | ✅ Current table style |
| **Data Persistence** | ✅ Forever | ⚠️ Per session |

---

## 🎯 Immediate Next Action

**To Test Live Tracking Right Now**:

1. Open HUD Control Panel
2. Click "Start HUD"
3. Open browser console in HUD window (Ctrl+Shift+I)
4. Paste test commands:

```javascript
// Simulate some hands
const tableId = 'main';

// Hand 1: Seat 3 raises preflop
window.electronAPI.send('hud:track-action', {
  tableId, seatNumber: 3, street: 'preflop', action: 'raise', amount: 3
});

// You call from BB
window.electronAPI.send('hud:track-action', {
  tableId, seatNumber: 1, street: 'preflop', action: 'call', amount: 3
});

// Flop: Seat 3 c-bets
window.electronAPI.send('hud:track-action', {
  tableId, seatNumber: 3, street: 'flop', action: 'bet', amount: 5
});

// You fold
window.electronAPI.send('hud:track-action', {
  tableId, seatNumber: 1, street: 'flop', action: 'fold', amount: 0
});

// Complete hand
window.electronAPI.send('hud:track-hand-complete', {
  tableId, seatNumber: 3, wentToShowdown: false, won: true, netAmount: 8
});

window.electronAPI.send('hud:track-hand-complete', {
  tableId, seatNumber: 1, wentToShowdown: false, won: false, netAmount: -3
});

// Check stats (should show VPIP=100%, PFR=100% for seat 3 after 1 hand)
```

Watch the HUD update in real-time! 🎉

---

## 💾 Database Locations

- **Historical**: `c:\Users\admin\Documents\poker_parser\hands.db`
  - 458,453 pre-calculated player stats
  - Used for opponent history lookup
  
- **Live Session**: `C:\Users\admin\AppData\Roaming\hudini\live_session.db`
  - Current session only
  - Real-time stat updates
  - Resets per session

---

## 🔮 Future Enhancements

1. **Hand History Parser Integration** (Priority: High)
   - Auto-parse new hand files as they arrive
   - Extract actions and feed to live tracker
   - Zero manual input required

2. **Multi-Table Support** (Priority: Medium)
   - Track multiple tables simultaneously
   - Each table gets unique `tableId`
   - Independent stat tracking per table

3. **Session History** (Priority: Low)
   - Save completed sessions
   - Review past session stats
   - "How did I do last Tuesday 6pm-9pm?"

4. **AI Opponent Modeling** (Priority: Low)
   - Detect playing style changes
   - Alert on unusual patterns
   - "This player usually folds here but just called"

---

## 📞 Support & Troubleshooting

**Stats showing 0%?**
→ Check that live tracking is enabled: `hudManager.useLiveTracking === true`

**No updates after actions?**
→ Verify IPC events are being sent: Check console for `📊 Live stats for main: X players tracked`

**Database errors?**
→ Check `live_session.db` was created: `C:\Users\admin\AppData\Roaming\hudini\`

**Want to switch back to historical DB?**
```javascript
hudManager.useLiveTracking = false;
hudManager.updateHUDWindow('main');
```

---

**Status**: ✅ Core system implemented, awaiting action input integration
**Last Updated**: October 24, 2025
