# Filter Synchronization - User Guide

## 🔄 **What is Filter Sync?**

HUDini now **synchronizes filters** between the **Dashboard** and **Hand Browser** tabs. When you change a filter in one tab, it automatically applies to the other tab!

---

## ✨ **How It Works**

### **Synchronized Filters:**
All these filters are synced between tabs:
- ✅ **Stake** (e.g., 0.50/1.00, 1/2, etc.)
- ✅ **Position** (BTN, CO, MP, EP, SB, BB)
- ✅ **Showdown** (All hands, Showdown only, Non-showdown)
- ✅ **Result** (All results, Won, Lost, Break-even)
- ✅ **Date Range** (From/To dates)
- ✅ **Hand Range** (Premium, Broadway, Pairs, etc.)
- ✅ **Stack Depth** (Short, Medium, Deep, Very Deep)
- ✅ **Action Type** (Single raised, 3bet, 4bet+, Limped, Multiway)
- ✅ **Pot Size** (Small, Medium, Large, Huge)
- ✅ **Bet Sizing** (Min/Max as pot multiples)

### **Tab-Specific (Not Synced):**
Some filters remain tab-specific:
- 📊 **Dashboard only:** Limit (Load More/All), Graph Order (Recent/Oldest), Graph View (Hands/Daily), Currency (USD/BB)
- 🔍 **Hand Browser only:** Search query, Min/Max BB, Villain name, Sort order, Currency toggle

---

## 🎯 **Example Use Cases**

### **Scenario 1: Analyze Premium BTN Hands**

**Step 1: Set filters in Dashboard**
1. Go to **Dashboard** tab
2. Select **Position: BTN**
3. Click **▶ Advanced Filters**
4. Select **Hand Range: Premium**
5. See graph update to show premium button hands

**Step 2: Review individual hands**
1. Switch to **Hand Browser** tab
2. **Filters are already applied!** (BTN + Premium)
3. Click on any hand to see details
4. All shown hands match your Dashboard filters

---

### **Scenario 2: Find Losing 3bet Pots**

**Step 1: Filter in Hand Browser**
1. Go to **Hand Browser** tab
2. Click **▶ Advanced Filters**
3. Select **Action Type: 3bet pot**
4. Select **Result: Hero lost**
5. See only losing 3bet pots

**Step 2: View on graph**
1. Switch to **Dashboard** tab
2. **Filters are already applied!** (3bet + Lost)
3. See your losing 3bet pot trend on the graph
4. Analyze performance over time

---

### **Scenario 3: Deep Stack Analysis**

**Step 1: Set stack filter**
1. Either tab (Dashboard or Hand Browser)
2. Click **▶ Advanced Filters**
3. Select **Stack Depth: Deep (80-150bb)**

**Step 2: Explore both views**
1. **Dashboard:** See graph of deep stack performance
2. **Hand Browser:** Browse specific deep stack hands
3. **Both stay filtered!** No need to re-select

---

## 💾 **Persistence**

### **Filters are Saved!**
- ✅ Filters persist across app restarts
- ✅ Stored in localStorage
- ✅ Restored when you reopen the app
- ✅ Each filter remembered separately

### **What This Means:**
1. Set your filters (e.g., Last 30 days, BTN position)
2. Close the app
3. Reopen later
4. **Filters are still there!**

---

## 🔄 **Filter Flow**

```
┌─────────────┐         ┌──────────────┐         ┌──────────────┐
│  Dashboard  │ ◄─────► │ Global State │ ◄─────► │ Hand Browser │
│   Filters   │  Sync   │ (localStorage)│  Sync   │   Filters    │
└─────────────┘         └──────────────┘         └──────────────┘
```

**How it syncs:**
1. Change a filter in **Dashboard**
2. Updates **Global State**
3. Syncs to **Hand Browser** automatically
4. Saved to **localStorage**
5. Works in reverse too!

---

## 🎨 **Visual Indicators**

### **Active Filters:**
- **Blue border** on "Advanced Filters" button when active
- Button text shows **"Advanced Filters (Active)"**
- Filters remain visible when expanded

### **Tab Switching:**
- Filters **don't reset** when switching tabs
- Graph/table updates immediately
- No re-loading delay

---

## 🧪 **Try It Now!**

### **Test 1: Basic Sync**
1. Dashboard → Select **Position: BTN**
2. Switch to Hand Browser
3. **See:** Position filter is already set to BTN!

### **Test 2: Advanced Sync**
1. Hand Browser → Open Advanced Filters
2. Select **Hand Range: Premium**
3. Switch to Dashboard
4. **See:** Graph shows only premium hands!

### **Test 3: Persistence**
1. Set multiple filters (Position, Hand Range, Result)
2. Close the app completely
3. Reopen the app
4. **See:** All filters are restored!

---

## 🛠️ **Technical Details**

### **Implementation:**
- Shared `globalFilters` state at App level
- Bi-directional sync between tabs
- localStorage persistence
- React useEffect for automatic updates
- No manual refresh needed

### **Performance:**
- ✅ Instant synchronization
- ✅ No API calls for sync
- ✅ Lightweight state updates
- ✅ Cached in localStorage

### **Conflict Resolution:**
- Last change wins
- Dashboard and Hand Browser treated equally
- Tab-specific filters don't interfere
- Independent of each other

---

## ⚠️ **Important Notes**

### **What Syncs:**
- ✅ All basic filters (Stake, Position, Showdown, Result, Dates)
- ✅ All advanced filters (Hand Range, Stack Depth, etc.)

### **What Doesn't Sync:**
- ❌ Dashboard graph limit (Load More)
- ❌ Dashboard graph order (Recent/Oldest)
- ❌ Hand Browser search query
- ❌ Hand Browser Min/Max BB
- ❌ Hand Browser villain filter
- ❌ Sort order in tables

**Why?** These are tab-specific UI controls, not data filters.

---

## 💡 **Pro Tips**

### **Tip 1: Dashboard → Hand Browser Workflow**
1. Filter on **Dashboard** to see trends
2. Switch to **Hand Browser** to review specific hands
3. Filters carry over automatically!

### **Tip 2: Hand Browser → Dashboard Workflow**
1. Find interesting scenario in **Hand Browser**
2. Switch to **Dashboard** to see trend
3. Same filters applied!

### **Tip 3: Reset Strategy**
- **Dashboard:** Click "Reset Filters" button
- **Hand Browser:** Click "Reset" button
- Both clear **all synchronized filters**
- Tab-specific filters reset separately

### **Tip 4: Quick Date Switching**
- Dashboard has date presets (7/30/90 days, All Time)
- Use these to quickly change date range
- Automatically syncs to Hand Browser!

---

## 🔮 **Future Enhancements**

Planned improvements:
- [ ] Filter preset buttons ("Premium 3bets", "Deep stack", etc.)
- [ ] Named filter sets (save your favorite combinations)
- [ ] Share filter links (URL-based filter state)
- [ ] Filter history (undo/redo changes)
- [ ] Quick filter suggestions based on data

---

## ❓ **FAQ**

**Q: Do filters affect Player Stats tab?**
A: Not yet - Player Stats has independent filters. Coming in future update!

**Q: Can I disable filter sync?**
A: No, sync is always enabled. It makes workflow smoother!

**Q: What happens if I reset filters in one tab?**
A: Resets in **both tabs** - they're synchronized!

**Q: Are filters saved per stake level?**
A: No, filters are global. If you select 1/2 stakes, it applies everywhere.

**Q: Can I sync filters between devices?**
A: Not yet - currently localStorage (local only). Cloud sync coming later!

**Q: What if I want different filters in each tab?**
A: Use tab-specific filters (Search, Min/Max BB) for additional filtering without affecting sync.

---

## 📝 **Summary**

**Filter Sync = Better Workflow:**
1. ✅ Set filters once, use everywhere
2. ✅ Seamless tab switching
3. ✅ Persistent across sessions
4. ✅ No duplicate work
5. ✅ Consistent analysis

**Happy analyzing!** 🎉

---

**Pro Tip:** Use Dashboard for big-picture trends, then switch to Hand Browser for detailed review - filters stay applied! 🚀
