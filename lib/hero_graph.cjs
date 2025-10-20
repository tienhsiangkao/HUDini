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

  const stakeSet = Array.isArray(stakes) && stakes.length ? new Set(stakes) : null;
  const positionSet = Array.isArray(positions) && positions.length ? new Set(positions) : null;
  const showdownMode = String(showdown || 'all').toLowerCase();
  const resultMode = String(result || 'all').toLowerCase();
  const fromTs = Date.parse(from || '');
  const toTs = Date.parse(to || '');
  const hasFrom = Number.isFinite(fromTs);
  const hasTo = Number.isFinite(toTs);

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

  return {
    timeline,
    plotted,
    totalHands: eligibleCount,
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
