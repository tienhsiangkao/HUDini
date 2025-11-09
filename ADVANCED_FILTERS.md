# Advanced Filters - Complete Guide

## 🎯 Overview

HUDini now includes a comprehensive advanced filtering system that helps you analyze specific scenarios and find patterns in your poker game. The filters work across **Dashboard** and **Hand Browser** tabs.

---

## 📍 Filter Types

### 1. **Hand Range Filters** 🃏

Filter hands based on your hole cards strength:

| Filter | Description | Example Hands |
|--------|-------------|---------------|
| **All hands** | No filtering | Any 2 cards |
| **Premium** | Top holdings | AA, KK, QQ, AKs |
| **Broadway** | High cards | Any combo of A, K, Q, J, T |
| **Pocket pairs** | Any pair | 22-AA |
| **Suited connectors** | Connected suited | 54s, 76s, T9s, etc. |
| **Suited aces** | Ace with suited kicker | A2s-AKs |

**Use case:** "Show me only my premium hands to see if I'm playing them profitably"

---

### 2. **Stack Depth Filters** 📊

Filter by effective stack size in big blinds:

| Range | BB Depth | Typical Play Style |
|-------|----------|-------------------|
| **Short** | 0-40bb | Push/fold, high variance |
| **Medium** | 40-80bb | Standard online |
| **Deep** | 80-150bb | Full post-flop play |
| **Very deep** | 150bb+ | Maximum skill edge |

**Use case:** "Am I losing more in short stack situations vs deep stack?"

---

### 3. **Action Type Filters** 🎲

Filter by preflop action sequence:

| Filter | Description | Complexity |
|--------|-------------|------------|
| **Single raised pot** | One raise preflop | Low |
| **3bet pot** | Raise + re-raise | Medium |
| **4bet+ pot** | Multiple re-raises | High |
| **Limped pot** | No raises, calls only | Passive |
| **Multiway** | 3+ players to flop | Complex |

**Use case:** "How am I performing in 3bet pots vs single raised pots?"

---

### 4. **Pot Size Filters** 🏆

Filter by total pot size in USD:

| Range | Size | Typical Stakes |
|-------|------|----------------|
| **Small** | $0-10 | Micro stakes |
| **Medium** | $10-50 | Low stakes |
| **Large** | $50-100 | Mid stakes |
| **Huge** | $100+ | High stakes |

**Use case:** "Am I playing big pots poorly?"

---

### 5. **Bet Sizing Filters** 💰

Filter by your bet/raise size relative to pot:

| Input | Meaning | Example |
|-------|---------|---------|
| **Min: 0.5** | Half pot or more | $5 bet into $10 pot |
| **Max: 1.0** | Up to pot-sized | $10 bet into $10 pot |
| **Min: 1.5** | Overbet range | $15 bet into $10 pot |

**Use case:** "How effective are my overbets (1.5x+ pot)?"

---

## 🎨 How to Use

### Dashboard Tab

1. Go to **Dashboard** tab
2. Click **"▶ Advanced Filters"** button
3. Select your desired filters
4. Graph and stats update automatically
5. Click **"Reset Advanced"** to clear

### Hand Browser Tab

1. Go to **Hand Browser** tab
2. Click **"▶ Advanced Filters"** button
3. Select filters to narrow down hands
4. Click on any hand to see details
5. Click **"Reset"** to clear all filters

---

## 💡 Example Use Cases

### Finding Leaks

**Scenario:** "Am I losing money with broadway hands?"

```
Filter Setup:
- Hand Range: Broadway
- Result: Lost hands
```

**Result:** See all losing broadway hands to review your play

---

### Analyzing 3bet Pots

**Scenario:** "How profitable are my 3bet pots?"

```
Filter Setup:
- Action Type: 3bet pot
- Stack Depth: Deep (80-150bb)
```

**Result:** Graph shows your P&L in deep stack 3bet situations

---

### Reviewing Big Pots

**Scenario:** "Did I play my huge pots correctly?"

```
Filter Setup:
- Pot Size: Huge ($100+)
- Hand Range: Premium
```

**Result:** See all big pots where you had premium hands

---

### Short Stack Performance

**Scenario:** "Am I good at short stack poker?"

```
Filter Setup:
- Stack Depth: Short (0-40bb)
- Position: BTN, SB, BB (one at a time)
```

**Result:** Compare short stack results by position

---

### Overbet Analysis

**Scenario:** "Are my overbets profitable?"

```
Filter Setup:
- Bet Size: Min 1.5x (overbets)
- Result: Won hands
```

**Result:** See your overbet success rate

---

## 🔄 Filter Combinations

Filters work **together** for powerful analysis:

### Example 1: Premium 3bet Pots
```
Hand Range: Premium
Action Type: 3bet pot
Stack Depth: Deep
```
→ See how your AA/KK/QQ performs in 3bet pots when deep

### Example 2: Multiway Suited Connectors
```
Hand Range: Suited connectors
Action Type: Multiway
Pot Size: Medium-Large
```
→ See your implied odds plays

### Example 3: Short Stack Shoves
```
Stack Depth: Short (0-40bb)
Action Type: Single raised
Result: All results
```
→ Analyze push/fold decisions

---

## 🚀 Performance Tips

### Fast Filtering
- Filters apply in real-time
- Data is cached for quick switching
- Use "Load More" if you need more hands

### Clear Filters
- **"Reset Filters"** clears everything (Dashboard)
- **"Reset"** clears everything (Hand Browser)
- **"Reset Advanced"** clears only advanced filters

### Visual Feedback
- Button shows **"Advanced Filters (Active)"** when filters applied
- Blue border indicates active advanced filters
- Expand/collapse with ▶/▼ icon

---

## 🎯 Quick Wins

### Find Your Best Spots
```
Hand Range: Premium
Result: Won hands
Stack Depth: Deep
```
→ These are your most profitable situations

### Find Your Leaks
```
Hand Range: All hands
Result: Lost hands
Pot Size: Large+
```
→ Review your biggest losses

### Analyze Specific Scenarios
```
Action Type: 4bet+ pot
Stack Depth: Deep
Hand Range: Premium
```
→ High variance, high skill situations

---

## 📊 Technical Details

### Backend Support
- Filters processed in `lib/hero_graph.cjs`
- Hand parsing for hole cards, stack sizes
- Action sequence analysis
- Pot size calculations
- Bet sizing ratio calculations

### Filter Logic
- **AND** logic (all filters must match)
- Missing data defaults to "pass" (inclusive)
- Case-insensitive position matching
- Flexible hand parsing

### Performance
- Filters applied during hand scan
- No re-processing of displayed hands
- Cached results for fast tab switching
- Efficient database queries

---

## 🐛 Troubleshooting

### "No hands match filters"
- Try relaxing some filters
- Check if you have enough hands in database
- Verify date range includes your data

### Filters not working
- Make sure you clicked "▶ Advanced Filters" to expand
- Check for JavaScript errors in console
- Try "Reset Filters" and start fresh

### Performance issues
- Use "Load More" instead of "Load All"
- Limit date range to specific period
- Clear cache if needed

---

## 🔮 Future Enhancements

Planned features:
- [ ] Filter presets ("Premium 3bets", "Deep stack", etc.)
- [ ] Save custom filter combinations
- [ ] Position matchup filters (BTN vs BB, etc.)
- [ ] Multi-select for multiple hand ranges
- [ ] Hand range editor (pick specific combos)
- [ ] Export filtered data to CSV

---

## ❓ FAQ

**Q: Can I combine multiple hand ranges?**
A: Not yet - coming in next update with multi-select

**Q: Do filters apply to Hero only?**
A: Yes, all filters analyze your (Hero's) hands

**Q: Can I filter by opponent actions?**
A: Not yet - use Hand Browser search for opponent names

**Q: Do filters affect Player Stats tab?**
A: Not yet - currently Dashboard and Hand Browser only

**Q: Can I save my filter settings?**
A: Not yet - coming soon with filter presets

---

## 📝 Summary

**Filtering Made Easy:**
1. Click "▶ Advanced Filters"
2. Select your criteria
3. See filtered results instantly
4. Reset when done

**Power User Tip:** Combine filters to find specific leak patterns, then use Hand Browser to review individual hands!

---

**Happy filtering!** 🎉
