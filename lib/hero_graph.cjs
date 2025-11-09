const { computeHeroHandMetrics } = require('./hero_metrics.cjs');

function buildHeroGraphData(db, options = {}) {
  const {
    limit = 2000,
    stakes,
    positions,
    showdown = 'all',
    result = 'all',
    from,
    to,
    order = 'recent',
    progressEvery = 5000,
    onProgress,
    // Advanced filters
    handRange = 'all',
    stackDepth = 'all',
    actionType = 'all',
    potSize = 'all',
    minBetSize,
    maxBetSize,
  } = options || {};

  const parsedLimit = Number(limit);
  let maxHands;
  if (Number.isFinite(parsedLimit) && parsedLimit > 0) {
    maxHands = Math.max(100, parsedLimit);
  } else {
    maxHands = Number.POSITIVE_INFINITY;
  }
  const fetchLimit = Number.isFinite(maxHands) ? Math.max(maxHands * 4, 10000) : -1;
  const orderDesc = String(order || 'recent').toLowerCase() !== 'oldest';

  let rows;
  if (fetchLimit > 0) {
    rows = db.prepare(`
      SELECT id, dateUTC, tableName, sb, bb, json, ts, heroNet
      FROM hands
      ORDER BY ts ${orderDesc ? 'DESC' : 'ASC'} NULLS LAST, rowid ${orderDesc ? 'DESC' : 'ASC'}
      LIMIT ?
    `).all(fetchLimit);
  } else {
    rows = db.prepare(`
      SELECT id, dateUTC, tableName, sb, bb, json, ts, heroNet
      FROM hands
      ORDER BY ts ${orderDesc ? 'DESC' : 'ASC'} NULLS LAST, rowid ${orderDesc ? 'DESC' : 'ASC'}
    `).all();
  }
  if (orderDesc) rows.reverse();

  // Get total hands in database for display
  const dbTotal = db.prepare('SELECT COUNT(*) as count FROM hands').get()?.count || 0;

  const stakeSet = Array.isArray(stakes) && stakes.length ? new Set(stakes) : null;
  const positionSet = Array.isArray(positions) && positions.length ? new Set(positions) : null;
  const showdownMode = String(showdown || 'all').toLowerCase();
  const resultMode = String(result || 'all').toLowerCase();
  const fromTs = Date.parse(from || '');
  const toTs = Date.parse(to || '');
  const hasFrom = Number.isFinite(fromTs);
  const hasTo = Number.isFinite(toTs);

  // Advanced filter helper functions
  function matchesHandRange(hand, range) {
    if (!range || range === 'all') return true;
    
    // Support multi-select: range can be comma-separated values
    const ranges = range.includes(',') ? range.split(',') : [range];
    
    const heroCards = hand.hero_cards || hand.heroCards || [];
    if (heroCards.length < 2) return true; // Can't filter without cards
    
    const rankMap = { 'A': 14, 'K': 13, 'Q': 12, 'J': 11, 'T': 10, '9': 9, '8': 8, '7': 7, '6': 6, '5': 5, '4': 4, '3': 3, '2': 2 };
    const card1 = heroCards[0];
    const card2 = heroCards[1];
    const rank1 = rankMap[card1[0]] || 0;
    const rank2 = rankMap[card2[0]] || 0;
    const suit1 = card1[1];
    const suit2 = card2[1];
    const suited = suit1 === suit2;
    const isPair = rank1 === rank2;
    const highRank = Math.max(rank1, rank2);
    const lowRank = Math.min(rank1, rank2);
    
    // Check if hand matches ANY of the selected ranges
    for (const r of ranges) {
      if (r === 'premium') {
        // AA-QQ, AKs
        if (isPair && highRank >= 12) return true; // AA, KK, QQ
        if (highRank === 14 && lowRank === 13 && suited) return true; // AKs
      }
      if (r === 'broadway') {
        // Any two broadway cards (A, K, Q, J, T)
        if (highRank >= 10 && lowRank >= 10) return true;
      }
      if (r === 'pairs') {
        if (isPair) return true;
      }
      if (r === 'suited-conn') {
        // Suited connectors
        if (suited && Math.abs(rank1 - rank2) === 1) return true;
      }
      if (r === 'suited-aces') {
        if (suited && (rank1 === 14 || rank2 === 14)) return true;
      }
    }
    
    return false;
  }

  function matchesStackDepth(hand, range) {
    if (!range || range === 'all') return true;
    const heroStack = hand.hero_stack || hand.heroStack || 0;
    const bb = hand.bb || 1;
    const stackBB = heroStack / bb;
    
    if (range === '0-40') return stackBB >= 0 && stackBB < 40;
    if (range === '40-80') return stackBB >= 40 && stackBB < 80;
    if (range === '80-150') return stackBB >= 80 && stackBB < 150;
    if (range === '150+') return stackBB >= 150;
    return true;
  }

  function matchesActionType(hand, actionType) {
    if (!actionType || actionType === 'all') return true;
    const actions = hand.actions || [];
    const preflop = actions.filter(a => a && a.street === 'preflop');
    
    if (actionType === 'single-raised') {
      const raises = preflop.filter(a => a.type === 'raises' || a.type === 'raise');
      return raises.length === 1;
    }
    if (actionType === '3bet') {
      const raises = preflop.filter(a => a.type === 'raises' || a.type === 'raise');
      return raises.length === 2;
    }
    if (actionType === '4bet+') {
      const raises = preflop.filter(a => a.type === 'raises' || a.type === 'raise');
      return raises.length >= 3;
    }
    if (actionType === 'limped') {
      const limps = preflop.filter(a => a.type === 'calls' || a.type === 'call');
      const raises = preflop.filter(a => a.type === 'raises' || a.type === 'raise');
      return limps.length > 0 && raises.length === 0;
    }
    if (actionType === 'multiway') {
      const players = hand.players || [];
      const sawFlop = hand.summary?.seatResults?.filter(r => r && (r.sawFlop || r.won > 0)) || [];
      return sawFlop.length >= 3;
    }
    return true;
  }

  function matchesPotSize(hand, range) {
    if (!range || range === 'all') return true;
    const pot = hand.pot || hand.totalPot || 0;
    
    if (range === '0-10') return pot >= 0 && pot < 10;
    if (range === '10-50') return pot >= 10 && pot < 50;
    if (range === '50-100') return pot >= 50 && pot < 100;
    if (range === '100+') return pot >= 100;
    return true;
  }

  function matchesBetSize(hand, minBet, maxBet) {
    if (!minBet && !maxBet) return true;
    const actions = hand.actions || [];
    const heroName = hand.hero;
    const heroBets = actions.filter(a => a && a.player === heroName && (a.type === 'bets' || a.type === 'bet' || a.type === 'raises' || a.type === 'raise'));
    
    if (heroBets.length === 0) return !minBet && !maxBet; // No bets
    
    // Check if any bet matches the range
    for (const bet of heroBets) {
      const betAmount = bet.amount || 0;
      const potBefore = bet.potBefore || hand.pot || 1;
      const betSizeRatio = betAmount / potBefore;
      
      const minCheck = minBet ? betSizeRatio >= parseFloat(minBet) : true;
      const maxCheck = maxBet ? betSizeRatio <= parseFloat(maxBet) : true;
      
      if (minCheck && maxCheck) return true;
    }
    return false;
  }

  const selected = [];
  const availableStakes = new Map();
  const availablePositions = new Set();
  let eligibleCount = 0;
  let totalRakeUSD = 0;
  let totalJackpotUSD = 0;
  let totalRakeAllUSD = 0;

  let rowsScanned = 0;
  for (const row of rows) {
    rowsScanned += 1;
    if (!row?.json) continue;
    let hand;
    try {
      hand = JSON.parse(row.json);
    } catch {
      continue;
    }
    const metrics = computeHeroHandMetrics(hand, row);
    if (!metrics) continue;
    if (hasFrom && typeof metrics.ts === 'number' && metrics.ts < fromTs) continue;
    if (hasTo && typeof metrics.ts === 'number' && metrics.ts > toTs) continue;
    if (!availableStakes.has(metrics.stakeKey)) {
      availableStakes.set(metrics.stakeKey, {
        label: metrics.stakeLabel || metrics.stakeKey,
        sort: Number.isFinite(metrics.stakeSort) ? metrics.stakeSort : 0,
      });
    }
    availablePositions.add(metrics.position || 'Unknown');
    if (stakeSet && !stakeSet.has(metrics.stakeKey)) continue;
    if (positionSet) {
      const posKey = metrics.position || 'Unknown';
      if (!positionSet.has(posKey)) continue;
    }
    if (showdownMode === 'showdown' && !metrics.showdown) continue;
    if (showdownMode === 'nonshowdown' && metrics.showdown) continue;
    if (resultMode === 'won' && metrics.netUSD <= 0.005) continue;
    if (resultMode === 'lost' && metrics.netUSD >= -0.005) continue;
    if (resultMode === 'breakeven' && Math.abs(metrics.netUSD) > 0.005) continue;
    
    // Advanced filters
    if (!matchesHandRange(hand, handRange)) continue;
    if (!matchesStackDepth(hand, stackDepth)) continue;
    if (!matchesActionType(hand, actionType)) continue;
    if (!matchesPotSize(hand, potSize)) continue;
    if (!matchesBetSize(hand, minBetSize, maxBetSize)) continue;

    eligibleCount++;
    if (selected.length < maxHands) {
      selected.push(metrics);
      totalRakeUSD += metrics.heroRake;
      totalJackpotUSD += metrics.heroJackpot;
      totalRakeAllUSD += metrics.heroRakeTotal || (metrics.heroRake + metrics.heroJackpot + (metrics.heroExtrasOther || 0));
    }

    if (typeof onProgress === 'function' && progressEvery > 0 && rowsScanned % progressEvery === 0) {
      onProgress({
        phase: 'scan',
        rowsScanned,
        selectedCount: selected.length,
        eligibleCount,
        progress: Math.min(1, rowsScanned / rows.length),
      });
    }
  }

  const timeline = [];
  const dailyMap = new Map();
  let cumUSD = 0;
  let cumBB = 0;
  let cumShowdownUSD = 0;
  let cumNonShowdownUSD = 0;
  let cumShowdownBB = 0;
  let cumNonShowdownBB = 0;
  let cumPreRakeUSD = 0;
  let cumPreRakeBB = 0;
  let cumRakeUSD = 0;
  let cumTotalRakeUSD = 0;
  let cumTotalRakeBB = 0;
  const round2 = (value) => Math.round(value * 100) / 100;

  selected.forEach((metrics, idx) => {
    const netUSDRaw = metrics.netUSD ?? 0;
    const netBBRaw = metrics.netBB ?? 0;
    const showdownUSDRaw = metrics.showdownUSD ?? 0;
    const nonShowdownUSDRaw = metrics.nonShowdownUSD ?? 0;
    const showdownBBRaw = metrics.showdownBB ?? 0;
    const nonShowdownBBRaw = metrics.nonShowdownBB ?? 0;
    const rakeUSDRaw = metrics.heroRake ?? 0;
    const jackpotUSDRaw = metrics.heroJackpot ?? 0;
    const rakeTotalUSDRaw = metrics.heroRakeTotal ?? (rakeUSDRaw + jackpotUSDRaw + (metrics.heroExtrasOther ?? 0));
    const preRakeUSDRaw = metrics.heroPreRakeUSD ?? (netUSDRaw + rakeTotalUSDRaw);
    const preRakeBBRaw = metrics.heroPreRakeBB ?? (metrics.bbValue > 0 ? preRakeUSDRaw / metrics.bbValue : 0);
    const totalRakeBBRaw = metrics.heroRakeTotalBB ?? (metrics.bbValue > 0 ? rakeTotalUSDRaw / metrics.bbValue : 0);

    cumUSD += netUSDRaw;
    cumBB += netBBRaw;
    cumShowdownUSD += showdownUSDRaw;
    cumNonShowdownUSD += nonShowdownUSDRaw;
    cumShowdownBB += showdownBBRaw;
    cumNonShowdownBB += nonShowdownBBRaw;
    cumPreRakeUSD += preRakeUSDRaw;
    cumPreRakeBB += preRakeBBRaw;
    cumRakeUSD += rakeUSDRaw;
    cumTotalRakeUSD += rakeTotalUSDRaw;
    cumTotalRakeBB += totalRakeBBRaw;

    let dailyEntry = null;
    if (metrics.dateUTC) {
      const dayKey = String(metrics.dateUTC).slice(0, 10);
      if (!dailyMap.has(dayKey)) {
        dailyEntry = {
          date: dayKey,
          hands: 0,
          netUSD: 0,
          netBB: 0,
          showdownUSD: 0,
          nonShowdownUSD: 0,
          rakeUSD: 0,
          jackpotUSD: 0,
          totalRakeUSD: 0,
          preRakeUSD: 0,
          cumUSD: 0,
          cumShowdownUSD: 0,
          cumNonShowdownUSD: 0,
          cumPreRakeUSD: 0,
          cumBB: 0,
          cumShowdownBB: 0,
          cumNonShowdownBB: 0,
          cumPreRakeBB: 0,
        };
        dailyMap.set(dayKey, dailyEntry);
      } else {
        dailyEntry = dailyMap.get(dayKey);
      }
      dailyEntry.hands += 1;
      dailyEntry.netUSD = round2(dailyEntry.netUSD + netUSDRaw);
      dailyEntry.netBB = round2(dailyEntry.netBB + netBBRaw);
      dailyEntry.showdownUSD = round2(dailyEntry.showdownUSD + showdownUSDRaw);
      dailyEntry.nonShowdownUSD = round2(dailyEntry.nonShowdownUSD + nonShowdownUSDRaw);
      dailyEntry.rakeUSD = round2(dailyEntry.rakeUSD + rakeUSDRaw);
      dailyEntry.jackpotUSD = round2(dailyEntry.jackpotUSD + jackpotUSDRaw);
      dailyEntry.totalRakeUSD = round2(dailyEntry.totalRakeUSD + rakeTotalUSDRaw);
      dailyEntry.preRakeUSD = round2(dailyEntry.preRakeUSD + preRakeUSDRaw);
      dailyEntry.cumUSD = round2(cumUSD);
      dailyEntry.cumShowdownUSD = round2(cumShowdownUSD);
      dailyEntry.cumNonShowdownUSD = round2(cumNonShowdownUSD);
      dailyEntry.cumPreRakeUSD = round2(cumPreRakeUSD);
      dailyEntry.cumBB = round2(cumBB);
      dailyEntry.cumShowdownBB = round2(cumShowdownBB);
      dailyEntry.cumNonShowdownBB = round2(cumNonShowdownBB);
      dailyEntry.cumPreRakeBB = round2(cumPreRakeBB);
    }

    timeline.push({
      index: idx + 1,
      handId: metrics.id,
      tableName: metrics.tableName,
      stake: metrics.stakeKey,
      stakeLabel: metrics.stakeLabel,
      position: metrics.position || 'Unknown',
      netUSD: round2(netUSDRaw),
      netBB: round2(netBBRaw),
      showdown: metrics.showdown,
      showdownUSD: round2(showdownUSDRaw),
      nonShowdownUSD: round2(nonShowdownUSDRaw),
      rakeUSD: round2(rakeUSDRaw),
      jackpotUSD: round2(jackpotUSDRaw),
      totalRakeUSD: round2(rakeTotalUSDRaw),
      preRakeUSD: round2(preRakeUSDRaw),
      preRakeBB: round2(preRakeBBRaw),
      bbValue: metrics.bb,
      cumUSD: round2(cumUSD),
      cumBB: round2(cumBB),
      cumShowdownUSD: round2(cumShowdownUSD),
      cumNonShowdownUSD: round2(cumNonShowdownUSD),
      cumShowdownBB: round2(cumShowdownBB),
      cumNonShowdownBB: round2(cumNonShowdownBB),
      cumPreRakeUSD: round2(cumPreRakeUSD),
      cumPreRakeBB: round2(cumPreRakeBB),
      cumRakeUSD: round2(cumRakeUSD),
      cumTotalRakeUSD: round2(cumTotalRakeUSD),
      cumTotalRakeBB: round2(cumTotalRakeBB),
      dateUTC: metrics.dateUTC,
      ts: metrics.ts,
    });

    if (typeof onProgress === 'function' && progressEvery > 0 && (idx + 1) % progressEvery === 0) {
      onProgress({
        phase: 'timeline',
        pointsProcessed: idx + 1,
        totalPoints: selected.length,
        progress: Math.min(1, (idx + 1) / selected.length),
        latestNetUSD: netUSDRaw,
        latestCumUSD: cumUSD,
      });
    }
  });

  if (typeof onProgress === 'function') {
    onProgress({
      phase: 'timeline',
      pointsProcessed: selected.length,
      totalPoints: selected.length,
      progress: 1,
      latestCumUSD: cumUSD,
    });
  }

  const plotted = timeline.length;
  const handsForRate = plotted ? plotted / 100 : 0;
  const summary = {
    netUSD: plotted ? Number(cumUSD.toFixed(2)) : 0,
    netBB: plotted ? Number(cumBB.toFixed(2)) : 0,
    showdownUSD: Number(cumShowdownUSD.toFixed(2)),
    nonShowdownUSD: Number(cumNonShowdownUSD.toFixed(2)),
    showdownBB: Number(cumShowdownBB.toFixed(2)),
    nonShowdownBB: Number(cumNonShowdownBB.toFixed(2)),
    rakeUSD: Number(totalRakeUSD.toFixed(2)),
    jackpotUSD: Number(totalJackpotUSD.toFixed(2)),
    totalRakeUSD: Number(totalRakeAllUSD.toFixed(2)),
    preRakeUSD: plotted ? Number(cumPreRakeUSD.toFixed(2)) : 0,
    preRakeBB: plotted ? Number(cumPreRakeBB.toFixed(2)) : 0,
    preRakeBBPer100: handsForRate ? Number((cumPreRakeBB / handsForRate).toFixed(2)) : 0,
    totalRakeBB: Number(cumTotalRakeBB.toFixed(2)),
    totalRakeBBPer100: handsForRate ? Number((cumTotalRakeBB / handsForRate).toFixed(2)) : 0,
    bbPer100: handsForRate ? Number((cumBB / handsForRate).toFixed(2)) : 0,
  };

  const stakeOptions = Array.from(availableStakes.entries()).map(([key, info]) => ({
    key,
    label: info?.label || key,
    sort: Number(info?.sort) || 0,
  }));
  stakeOptions.sort((a, b) => {
    const specialA = a.key.startsWith('special:');
    const specialB = b.key.startsWith('special:');
    if (specialA && specialB) return a.label.localeCompare(b.label);
    if (specialA) return 1;
    if (specialB) return -1;
    if (a.sort !== b.sort) return a.sort - b.sort;
    return a.label.localeCompare(b.label);
  });

  const available = {
    stakes: stakeOptions,
    positions: Array.from(availablePositions).sort(),
  };

  const daily = Array.from(dailyMap.values())
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .map((entry, idx) => ({ ...entry, index: idx + 1 }));
  return {
    timeline,
    daily,
    plotted,
    totalHands: dbTotal,
    eligibleCount,
    skipped: Math.max(0, eligibleCount - plotted),
    summary,
    available,
    filters: {
      limit: maxHands,
      showdown: showdownMode,
      result: resultMode,
      order: orderDesc ? 'recent' : 'oldest',
      from: hasFrom ? fromTs : null,
      to: hasTo ? toTs : null,
    },
  };
}

module.exports = {
  buildHeroGraphData,
};
