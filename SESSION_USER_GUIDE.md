# 🎉 Path A Features - User Guide

## What's New in HUDini Dashboard?

### 🗓️ Quick Date Filters
At the top of your Dashboard, you'll now see quick date range buttons:

```
[Today] [Yesterday] [Last 7 Days] [Last 30 Days] [This Month] [Last Month] [All Time]
```

**How to use:**
- Click any button to instantly filter your data
- Active filter shows in **blue**
- Hover to see highlight effect
- Works across all dashboard widgets

---

### 📊 Recent Sessions Panel

Below your summary stats, you'll see a new **Recent Sessions** panel showing your play sessions.

#### What's a session?
A session is a group of hands played together. If you take a break of **30+ minutes**, HUDini starts a new session automatically.

#### Session Card Layout:
```
┌────────────────────────────────────────┐
│ 🏆 Oct 21, 2:30 PM    [0.05/0.1]  +$45.50 │
├────────────────────────────────────────┤
│  125 hands  │  2h 15m  │  64% win  │  56 h/hr │
└────────────────────────────────────────┘
```

**Card Colors:**
- 🟢 **Green border** = Winning session (profit > $1)
- 🔴 **Red border** = Losing session (loss > $1)  
- ⚪ **Gray border** = Break-even session

**Special Highlights:**
- 🏆 **Trophy icon** = Your BEST session (highest profit)
- 💥 **Explosion icon** = Your WORST session (biggest loss)
- 🔵 **Blue border** = Highlighted session (best/worst)

**Session Stats Shown:**
1. **Timestamp** - When session started
2. **Stakes** - What stakes you played
3. **Profit/Loss** - Net result in USD
4. **Hand Count** - Total hands played
5. **Duration** - How long you played (hours/minutes)
6. **Win Rate** - Percentage of hands won
7. **Hands/Hour** - Your play rate

---

### 🖱️ Interactive Features

#### Click a Session Card
When you click any session card:
1. Date filters automatically update to that session's timeframe
2. Graph zooms to show only those hands
3. Toast notification confirms the filter

**Example:**
```
Click session from "Oct 21, 2:30 PM - 4:45 PM"
→ Dashboard filters to those exact dates/times
→ See: "Filtered to session: Oct 21, 2025, 2:30:00 PM"
```

#### Click Date Preset
Choose a quick filter:
1. Click "Last 7 Days"
2. Sessions panel updates instantly
3. Graph shows last week
4. Toast: "Date range: 10/14/2025 - 10/21/2025"

---

### 📈 Workflow Examples

#### Example 1: Review Today's Play
1. Open Dashboard
2. Click **"Today"** preset
3. See all sessions from today
4. Check if you're winning or losing
5. Click best session to see what went right

#### Example 2: Find Your Best Session Ever
1. Click **"All Time"** preset
2. Look for 🏆 trophy icon in Sessions panel
3. Click that session card
4. Graph shows exactly those hands
5. Analyze what you did well

#### Example 3: Compare Weekday vs Weekend
1. Use date presets to filter to specific days
2. Compare win rates in Sessions panel
3. Notice patterns (e.g., "I win more on weekends")
4. Adjust your schedule accordingly

#### Example 4: Analyze Long Session
1. Find session with 4+ hours duration
2. Click to filter
3. Look at graph for tilt patterns
4. Check if profit drops after X hours
5. Set session length goals

---

### 🎯 Pro Tips

#### Session Analysis
- **Long sessions aren't always better** - Check if win rate drops after 2-3 hours
- **Best sessions often have high hands/hour** - Staying focused = winning
- **Compare same stakes** - Use stake filter + sessions to see trends

#### Date Filtering
- **"This Month"** is great for monthly reviews
- **"Last 30 Days"** shows rolling performance (better than calendar month)
- **"Yesterday"** + "Today"** perfect for daily review routine

#### Combining Filters
1. Select stake: "0.05 / 0.1"
2. Click "Last 7 Days"
3. Sessions panel now shows: Only 0.05/0.1 sessions from last week
4. Click specific session for deep dive

---

### 🔧 Settings & Customization

#### Session Gap Time
Currently set to **30 minutes**. Future versions will let you customize this.

**Why 30 minutes?**
- Industry standard for poker session breaks
- Balances "too many sessions" vs "too few"
- Works well for most play styles

#### Session Limit
Shows **10 most recent sessions** by default. Backend supports up to 50.

---

### 🐛 Troubleshooting

#### "No sessions found"
- **Cause:** No hands in database or filters too restrictive
- **Fix:** Import hands or click "All Time" preset

#### "Loading sessions..."
- **Cause:** Fetching data from database
- **Fix:** Wait a moment (should be fast)

#### Session doesn't appear
- **Cause:** Played < 30 minutes ago, grouped with previous session
- **Fix:** Normal behavior - take a 30min break to start new session

#### Can't click session cards
- **Cause:** JavaScript error or API not loaded
- **Fix:** Restart app, check console for errors

---

### 🎨 Visual Guide

#### Active Date Preset
```
[Today]  [Yesterday]  [Last 7 Days]  [Last 30 Days]  [This Month]  [Last Month]  [All Time]
  ^^^
  Blue background = currently active
```

#### Session Highlight
```
┌━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  ← Blue border (2px)
┃ 🏆 Oct 21, 2:30 PM  [0.05/0.1]  +$45.50  ┃  ← Trophy = best session
┃                                        ┃
┃  125 hands │ 2h 15m │ 64% │ 56 h/hr   ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

#### Normal Session
```
┌────────────────────────────────────┐  ← Gray border (1px)
│ Oct 21, 12:00 PM  [0.05/0.1]  +$12.30 │
│                                    │
│  45 hands │ 1h 10m │ 58% │ 39 h/hr │
└────────────────────────────────────┘
```

---

### 📊 Data Refresh

Sessions panel automatically updates when:
- ✅ New hands imported
- ✅ Date filters changed
- ✅ Stake filter changed
- ✅ Tab switched back to Dashboard

**No manual refresh needed!**

---

### 🚀 What's Next?

Future enhancements being considered:
- Session tags (A-game, tilt, tired)
- Session goals and progress tracking
- Session notes and annotations
- Custom session gap duration
- Session comparison charts

---

## Quick Reference Card

| Action | Result |
|--------|--------|
| Click date preset | Filter all data to that time range |
| Click session card | Filter graph to that specific session |
| Hover over session | Card lifts up (visual feedback) |
| 🏆 trophy icon | Best session (highest profit) |
| 💥 explosion icon | Worst session (biggest loss) |
| Green border | Winning session |
| Red border | Losing session |
| Blue border | Highlighted (best or worst) |

---

**Enjoy your new session tracking! 🎊**

Play poker, let HUDini organize your sessions automatically!
