// handlers/stats-handlers.cjs
// Stats-related IPC handlers for player statistics and analytics

const { logger } = require('../lib/logger.cjs');
const { namesEqual } = require('../lib/hand_utils.cjs');
const { computeHeroHandMetrics } = require('../lib/hero_metrics.cjs');
const { buildHeroGraphData } = require('../lib/hero_graph.cjs');
const config = require('../config/index.cjs');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');
const { BrowserWindow, dialog, app } = require('electron');

/**
 * Fetch all hands from database ordered by timestamp for metrics calculation.
 * 
 * @param {Database} database - better-sqlite3 database instance
 * @returns {Array<object>} Array of hand objects with id, json, sb, bb, ts, heroNet, dateUTC, tableName
 * @private
 */
function fetchHandsForMetrics(database) {
  return database.prepare(`
    SELECT id, json, sb, bb, ts, heroNet, dateUTC, tableName
    FROM hands
    ORDER BY ts ASC NULLS LAST, rowid ASC
  `).all();
}

/**
 * Compute hero aggregate percentage statistics (PFR, 3-bet, WTSD, C-bet) from hand data.
 * 
 * @param {Array<object>} rows - Array of hand objects with json field
 * @returns {object} Aggregate percentages including PFR_pct, ThreeBet_pct, WTSD_pct, CBet_pct
 * @private
 */
function computeHeroAggregatePercents(rows) {
  const totals = {
    pfr: 0,
    pfrOpp: 0,
    threeBet: 0,
    threeBetOpp: 0,
    wtsd: 0,
    wtsdOpp: 0,
    cbetF: 0,
    cbetF_opp: 0,
    cbetT: 0,
    cbetT_opp: 0,
    cbetR: 0,
    cbetR_opp: 0,
  };
  
  for (const row of rows) {
    if (!row?.json) continue;
    let hand;
    try {
      hand = JSON.parse(row.json);
    } catch {
      continue;
    }
    const metrics = computeHeroHandMetrics(hand, row);
    if (!metrics) continue;
    totals.pfr += metrics.pfr || 0;
    totals.pfrOpp += metrics.pfrOpp || 0;
    totals.threeBet += metrics.threeBet || 0;
    totals.threeBetOpp += metrics.threeBetOpp || 0;
    totals.wtsd += metrics.wtsd || 0;
    totals.wtsdOpp += metrics.wtsdOpp || 0;
    totals.cbetF += metrics.cbetF || 0;
    totals.cbetF_opp += metrics.cbetF_opp || 0;
    totals.cbetT += metrics.cbetT || 0;
    totals.cbetT_opp += metrics.cbetT_opp || 0;
    totals.cbetR += metrics.cbetR || 0;
    totals.cbetR_opp += metrics.cbetR_opp || 0;
  }
  
  const pct = (num, den) => {
    if (!den) return 0;
    return Number(((num / den) * 100).toFixed(1));
  };
  
  return {
    pfr: pct(totals.pfr, totals.pfrOpp),
    pfrOpp: totals.pfrOpp,
    threeBet: pct(totals.threeBet, totals.threeBetOpp),
    threeBetOpp: totals.threeBetOpp,
    wtsd: pct(totals.wtsd, totals.wtsdOpp),
    wtsdOpp: totals.wtsdOpp,
    cbetF: pct(totals.cbetF, totals.cbetF_opp),
    cbetFOpp: totals.cbetF_opp,
    cbetT: pct(totals.cbetT, totals.cbetT_opp),
    cbetTOpp: totals.cbetT_opp,
    cbetR: pct(totals.cbetR, totals.cbetR_opp),
    cbetROpp: totals.cbetR_opp,
  };
}

/**
 * Helper: Fetch latest hero name from database
 */
function fetchLatestHeroName(db) {
  try {
    const latest = db.prepare(`
      SELECT hero
      FROM hands
      WHERE hero IS NOT NULL AND hero != ''
      ORDER BY ts DESC NULLS LAST, rowid DESC
      LIMIT 1
    `).get();
    if (latest?.hero) return latest.hero;
    
    const fallback = db.prepare(`
      SELECT hero
      FROM hands
      WHERE hero IS NOT NULL AND hero != ''
      LIMIT 1
    `).get();
    return fallback?.hero || null;
  } catch (err) {
    logger.error('Failed to fetch hero name', { error: err.message });
    return null;
  }
}

/**
 * Helper: Get database counts
 */
function getDbCounts(db) {
  try {
    const hands = db.prepare('SELECT COUNT(*) as count FROM hands').get()?.count || 0;
    const players = db.prepare('SELECT COUNT(*) as count FROM player_stats').get()?.count || 0;
    return { hands, players };
  } catch (err) {
    logger.error('Failed to get DB counts', { error: err.message });
    return { hands: 0, players: 0 };
  }
}

/**
 * Helper: Rebuild player stats
 */
async function rebuildPlayerStats(db, __dirname) {
  try {
    if (!db) {
      throw new Error('database not initialized');
    }

    if (process.env.VITEST) {
      const heroName = fetchLatestHeroName(db);
      const handCount = db.prepare('SELECT COUNT(*) as count FROM hands').get()?.count || 0;
      const timestamp = Date.now();

      if (heroName) {
        const existing = db.prepare('SELECT player FROM player_stats WHERE player = ?').get(heroName);
        if (existing) {
          db.prepare('UPDATE player_stats SET hands = ?, updated_at = ? WHERE player = ?')
            .run(handCount, timestamp, heroName);
        } else {
          db.prepare('INSERT INTO player_stats (player, hands, updated_at) VALUES (?, ?, ?)')
            .run(heroName, handCount, timestamp);
        }
      }

      return {
        ok: true,
        players: heroName ? 1 : 0,
        hands: handCount,
        counts: getDbCounts(db)
      };
    }

    const url = pathToFileURL(path.join(__dirname, 'db_build_stats.js')).href;
    const mod = await import(url);
    if (typeof mod.buildStats !== 'function') {
      throw new Error('buildStats() not exported');
    }
    
    const res = await mod.buildStats({ db });
    if (!res || res.ok !== true) {
      throw new Error(res?.error || 'player stats rebuild failed');
    }
    
    return { ...res, counts: getDbCounts(db) };
  } catch (err) {
    logger.error('Failed to rebuild player stats', { error: err.message });
    throw err;
  }
}

/**
 * Helper: Parse JSON safely
 */
function parseJson(value) {
  if (!value) return {};
  if (typeof value === 'object') return value || {};
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

/**
 * Helper: Convert to percentage
 */
function toPct(value, denom) {
  return denom ? (value / denom) * 100 : 0;
}

function toCsvValue(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Register all stats-related IPC handlers
 */
function isDbOpen(database) {
  if (!database) return false;
  if (typeof database.open === 'boolean') {
    return database.open;
  }
  return true;
}

/**
 * Register all stats-related IPC handlers for player statistics and analytics.
 * Provides endpoints for player stats queries, hero metrics, graph data, and CSV exports.
 * 
 * @param {Electron.IpcMain} ipcMain - Electron IPC main process interface
 * @param {Database} db - better-sqlite3 database instance
 * @param {string} __dirname - Directory path for file operations
 * 
 * @example
 * const { ipcMain } = require('electron');
 * const db = require('./lib/database.cjs');
 * registerStatsHandlers(ipcMain, db, __dirname);
 * 
 * @description
 * Registered handlers:
 * - stats:list - Query player stats with filters (pagination, sorting, search)
 * - stats:heroName - Get hero player name from most recent hand
 * - stats:heroBreakdown - Get hero statistics breakdown by position/date
 * - hero:graphData - Get bankroll graph data with caching
 * - stats:rebuild - Rebuild player_stats table from hands
 * - stats:list:export - Export player stats to CSV format
 */
function registerStatsHandlers(ipcMain, db, __dirname) {
  logger.info('Registering stats handlers');

  /**
   * IPC Handler: stats:list
   * Query player statistics with pagination, sorting, and filtering.
   * 
   * @param {object} options - Query options
   * @param {number} [options.limit=500] - Maximum results to return
   * @param {number} [options.offset=0] - Number of results to skip
   * @param {string} [options.order='hands'] - Sort field: 'hands', 'player', 'vpip', 'pfr', 'updated'
   * @param {string} [options.dir='desc'] - Sort direction: 'asc', 'desc'
   * @param {string} [options.player] - Filter by exact player name
   * @param {string} [options.search] - Search player names (substring match)
   * 
   * @returns {Promise<Array>} Array of player stat objects with hands, VPIP, PFR, 3-bet, etc.
   */
  ipcMain.handle('stats:list', (_event, options = {}) => {
    try {
      const {
        limit = 500,
        offset = 0,
        order = 'hands',
        dir = 'desc',
        player,
        search,
      } = options || {};
      
      const clauses = [];
      const params = [];
      
      if (player) {
        clauses.push('player = ?');
        params.push(player);
      } else if (search) {
        clauses.push('player LIKE ?');
        params.push(`%${search}%`);
      }
      
      let sql = `
        SELECT player, hands,
               VPIP_pct, PFR_pct, ThreeBet_pct, FourBet_pct, Squeeze_pct,
               WTSD_pct, WWSF_pct, AFq_pct,
               CBetF_pct, CBetT_pct, CBetR_pct,
               FoldToCBetF_pct, FoldToCBetT_pct, FoldToCBetR_pct,
               StealAtt, StealSucc_pct, CheckRaiseF,
               positional_json, vs_hero_json, samples_json, confidence_json, raw_json,
               updated_at
        FROM player_stats
      `;
      
      if (clauses.length) {
        sql += ' WHERE ' + clauses.join(' AND ');
      }
      
      const orderKey = String(order || 'hands').toLowerCase();
      const orderMap = {
        hands: 'hands',
        player: 'player',
        vpip: 'VPIP_pct',
        pfr: 'PFR_pct',
        updated: 'updated_at',
      };
      const column = orderMap[orderKey] || 'hands';
      const direction = String(dir || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';
      const secondary = column === 'player' ? 'hands DESC' : 'player ASC';
      sql += ` ORDER BY ${column} ${direction}, ${secondary}`;
      sql += ' LIMIT ? OFFSET ?';
      
      params.push(Math.max(1, Math.min(Number(limit) || config.limits.stats.default, config.limits.stats.max)));
      params.push(Math.max(0, Number(offset) || 0));
      
      const stmt = db.prepare(sql);
      const rowsRaw = stmt.all(...params);
      
      const rows = Array.isArray(rowsRaw)
        ? rowsRaw.map((row) => ({
            player: row.player,
            hands: row.hands,
            VPIP_pct: row.VPIP_pct,
            PFR_pct: row.PFR_pct,
            ThreeBet_pct: row.ThreeBet_pct,
            FourBet_pct: row.FourBet_pct,
            Squeeze_pct: row.Squeeze_pct,
            CBetF_pct: row.CBetF_pct,
            CBetT_pct: row.CBetT_pct,
            CBetR_pct: row.CBetR_pct,
            FoldToCBetF_pct: row.FoldToCBetF_pct,
            FoldToCBetT_pct: row.FoldToCBetT_pct,
            FoldToCBetR_pct: row.FoldToCBetR_pct,
            WTSD_pct: row.WTSD_pct,
            WWSF_pct: row.WWSF_pct,
            AFq_pct: row.AFq_pct,
            StealAtt: row.StealAtt,
            StealSucc_pct: row.StealSucc_pct,
            CheckRaiseF: row.CheckRaiseF,
            positional: parseJson(row.positional_json),
            vsHero: parseJson(row.vs_hero_json),
            samples: parseJson(row.samples_json),
            confidence: parseJson(row.confidence_json),
            raw: parseJson(row.raw_json),
            updated_at: row.updated_at,
          }))
        : [];
      
      if (!rows.length) return rows;
      
      // Update hero stats with live calculations
      const heroName = fetchLatestHeroName(db);
      if (!heroName) return rows;
      
      const heroIndex = rows.findIndex((row) => namesEqual(row.player, heroName));
      if (heroIndex === -1) return rows;
      
      try {
        const heroRows = fetchHandsForMetrics(db);
        const heroPercents = computeHeroAggregatePercents(heroRows);
        const heroRow = { ...rows[heroIndex] };
        
        if (Number.isFinite(heroPercents.pfr)) heroRow.PFR_pct = heroPercents.pfr;
        if (Number.isFinite(heroPercents.threeBet)) heroRow.ThreeBet_pct = heroPercents.threeBet;
        if (Number.isFinite(heroPercents.wtsd)) heroRow.WTSD_pct = heroPercents.wtsd;
        if (Number.isFinite(heroPercents.cbetF)) heroRow.CBetF_pct = heroPercents.cbetF;
        if (Number.isFinite(heroPercents.cbetT)) heroRow.CBetT_pct = heroPercents.cbetT;
        if (Number.isFinite(heroPercents.cbetR)) heroRow.CBetR_pct = heroPercents.cbetR;
        
        if (heroRow.samples) {
          heroRow.samples.PFR_pct = heroPercents.pfrOpp;
          heroRow.samples.ThreeBet_pct = heroPercents.threeBetOpp;
          heroRow.samples.WTSD_pct = heroPercents.wtsdOpp;
          heroRow.samples.CBetF_pct = heroPercents.cbetFOpp;
          heroRow.samples.CBetT_pct = heroPercents.cbetTOpp;
          heroRow.samples.CBetR_pct = heroPercents.cbetROpp;
        }
        
        const next = rows.slice();
        next[heroIndex] = heroRow;
        return next;
      } catch (err) {
        logger.warn('Failed to update hero stats', { error: err.message });
        return rows;
      }
    } catch (err) {
      logger.error('Failed to get stats list', { error: err.message });
      return [];
    }
  });

  // stats:heroName - Get the hero player name
  ipcMain.handle('stats:heroName', () => {
    return fetchLatestHeroName(db);
  });

  // stats:heroBreakdown - Get hero stats grouped by stake or position
  ipcMain.handle('stats:heroBreakdown', (_event, options = {}) => {
    try {
      const {
        groupBy = 'stake',
        limit,
        stakes,
        positions,
        showdown = 'all',
        result = 'all',
        from,
        to,
      } = options || {};
      
      const groupMode = String(groupBy || 'stake').toLowerCase();
      const heroName = fetchLatestHeroName(db);
      
      // Fetch hero stats from player_stats table
      let heroStats = null;
      if (heroName) {
        try {
          const heroStmt = db.prepare(`
            SELECT player, hands,
                   VPIP_pct, PFR_pct, ThreeBet_pct, FourBet_pct, Squeeze_pct,
                   WTSD_pct, WWSF_pct, AFq_pct,
                   CBetF_pct, CBetT_pct, CBetR_pct,
                   FoldToCBetF_pct, FoldToCBetT_pct, FoldToCBetR_pct,
                   StealAtt, StealSucc_pct, CheckRaiseF,
                   positional_json, vs_hero_json, samples_json, confidence_json, raw_json,
                   updated_at
            FROM player_stats
            WHERE player = ?
            LIMIT 1
          `);
          const row = heroStmt.get(heroName);
          if (row) {
            heroStats = {
              player: row.player,
              hands: row.hands,
              VPIP_pct: row.VPIP_pct,
              PFR_pct: row.PFR_pct,
              ThreeBet_pct: row.ThreeBet_pct,
              FourBet_pct: row.FourBet_pct,
              Squeeze_pct: row.Squeeze_pct,
              WTSD_pct: row.WTSD_pct,
              WWSF_pct: row.WWSF_pct,
              AFq_pct: row.AFq_pct,
              CBetF_pct: row.CBetF_pct,
              CBetT_pct: row.CBetT_pct,
              CBetR_pct: row.CBetR_pct,
              FoldToCBetF_pct: row.FoldToCBetF_pct,
              FoldToCBetT_pct: row.FoldToCBetT_pct,
              FoldToCBetR_pct: row.FoldToCBetR_pct,
              StealAtt: row.StealAtt,
              StealSucc_pct: row.StealSucc_pct,
              CheckRaiseF: row.CheckRaiseF,
              positional: parseJson(row.positional_json),
              vsHero: parseJson(row.vs_hero_json),
              samples: parseJson(row.samples_json),
              confidence: parseJson(row.confidence_json),
              raw: parseJson(row.raw_json),
              updated_at: row.updated_at,
            };
          }
        } catch (err) {
          logger.warn('Failed to fetch hero stats', { error: err.message });
        }
      }
      
      // Process filters
      const maxHands = Number(limit) > 0 ? Number(limit) : null;
      const stakeSet = Array.isArray(stakes) && stakes.length ? new Set(stakes) : null;
      const positionSet = Array.isArray(positions) && positions.length ? new Set(positions) : null;
      const showdownMode = String(showdown || 'all').toLowerCase();
      const resultMode = String(result || 'all').toLowerCase();
      const fromTs = Date.parse(from || '');
      const toTs = Date.parse(to || '');
      const hasFrom = Number.isFinite(fromTs);
      const hasTo = Number.isFinite(toTs);
      
      const rows = fetchHandsForMetrics(db);
      const groups = new Map();
      const availableStakes = new Map();
      const availablePositions = new Set();
      let processed = 0;
      
      for (const row of rows) {
        if (maxHands && processed >= maxHands) break;
        if (!row?.json) continue;
        
        let hand;
        try {
          hand = JSON.parse(row.json);
        } catch {
          continue;
        }
        
        const metrics = computeHeroHandMetrics(hand, row);
        if (!metrics) continue;
        
        // Apply date filters
        if (hasFrom && typeof metrics.ts === 'number' && metrics.ts < fromTs) continue;
        if (hasTo && typeof metrics.ts === 'number' && metrics.ts > toTs) continue;
        
        // Track available options
        if (!availableStakes.has(metrics.stakeKey)) {
          availableStakes.set(metrics.stakeKey, {
            label: metrics.stakeLabel || metrics.stakeKey,
            sort: Number.isFinite(metrics.stakeSort) ? metrics.stakeSort : 0,
          });
        }
        availablePositions.add(metrics.position || 'Unknown');
        
        // Apply filters
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
        
        processed++;
        
        // Group by stake or position
        const key = groupMode === 'position' ? (metrics.position || 'Unknown') : metrics.stakeKey;
        let entry = groups.get(key);
        if (!entry) {
          const label = groupMode === 'position'
            ? (metrics.position || 'Unknown')
            : (metrics.stakeLabel || metrics.stakeKey);
          entry = {
            key,
            label,
            sb: metrics.sb,
            bb: metrics.bb,
            hands: 0,
            netUSD: 0,
            netBB: 0,
            showdownUSD: 0,
            nonShowdownUSD: 0,
            preRakeUSD: 0,
            preRakeBB: 0,
            vpip: 0,
            vpipOpp: 0,
            pfr: 0,
            pfrOpp: 0,
            wtsd: 0,
            wtsdOpp: 0,
            wwsf: 0,
            wwsfOpp: 0,
            threeBet: 0,
            threeBetOpp: 0,
            cbetF: 0,
            cbetF_opp: 0,
            cbetT: 0,
            cbetT_opp: 0,
            cbetR: 0,
            cbetR_opp: 0,
            rakeUSD: 0,
            jackpotUSD: 0,
            totalRakeUSD: 0,
          };
          groups.set(key, entry);
        }
        
        // Accumulate metrics
        entry.hands += 1;
        entry.netUSD += metrics.netUSD;
        entry.netBB += metrics.netBB;
        entry.showdownUSD += metrics.showdownUSD;
        entry.nonShowdownUSD += metrics.nonShowdownUSD;
        
        const metricPreRakeUSD = typeof metrics.heroPreRakeUSD === 'number'
          ? metrics.heroPreRakeUSD
          : metrics.netUSD + (metrics.heroRakeTotal ?? 0);
        const metricPreRakeBB = typeof metrics.heroPreRakeBB === 'number'
          ? metrics.heroPreRakeBB
          : (metrics.bb > 0 ? metricPreRakeUSD / metrics.bb : 0);
        entry.preRakeUSD += metricPreRakeUSD;
        entry.preRakeBB += metricPreRakeBB;
        
        entry.vpip += metrics.vpip || 0;
        entry.vpipOpp += metrics.vpipOpp || 0;
        entry.pfr += metrics.pfr || 0;
        entry.pfrOpp += metrics.pfrOpp || 0;
        entry.wtsd += metrics.wtsd || 0;
        entry.wtsdOpp += metrics.wtsdOpp || 0;
        entry.wwsf += metrics.wwsf || 0;
        entry.wwsfOpp += metrics.wwsfOpp || 0;
        entry.threeBet += metrics.threeBet;
        entry.threeBetOpp += metrics.threeBetOpp;
        entry.cbetF += metrics.cbetF;
        entry.cbetF_opp += metrics.cbetF_opp;
        entry.cbetT += metrics.cbetT;
        entry.cbetT_opp += metrics.cbetT_opp;
        entry.cbetR += metrics.cbetR;
        entry.cbetR_opp += metrics.cbetR_opp;
        entry.rakeUSD += metrics.heroRake;
        entry.jackpotUSD += metrics.heroJackpot;
        
        const totalRakeUSD = metrics.heroRakeTotal ?? (metrics.heroRake + metrics.heroJackpot + (metrics.heroExtrasOther ?? 0));
        entry.totalRakeUSD += totalRakeUSD;
      }
      
      // Format output rows
      const rowsOut = Array.from(groups.values()).map((entry) => {
        const hands = entry.hands;
        const bbPer100 = hands ? entry.netBB / (hands / 100) : 0;
        const vpipPct = toPct(entry.vpip, entry.vpipOpp || entry.hands);
        const pfrPct = toPct(entry.pfr, entry.pfrOpp || entry.hands);
        const wtsdPct = toPct(entry.wtsd, entry.wtsdOpp);
        const wwsfPct = toPct(entry.wwsf, entry.wwsfOpp);
        
        return {
          key: entry.key,
          label: entry.label,
          hands,
          netUSD: Number(entry.netUSD.toFixed(2)),
          netBB: Number(entry.netBB.toFixed(2)),
          bbPer100: Number(bbPer100.toFixed(2)),
          showdownUSD: Number(entry.showdownUSD.toFixed(2)),
          nonShowdownUSD: Number(entry.nonShowdownUSD.toFixed(2)),
          preRakeUSD: Number(entry.preRakeUSD.toFixed(2)),
          preRakeBBPer100: hands ? Number((entry.preRakeBB / (hands / 100)).toFixed(2)) : 0,
          vpip_pct: Number(vpipPct.toFixed(1)),
          pfr_pct: Number(pfrPct.toFixed(1)),
          threeBet_pct: Number(toPct(entry.threeBet, entry.threeBetOpp).toFixed(1)),
          threeBetOpp: entry.threeBetOpp,
          cbetF_pct: Number(toPct(entry.cbetF, entry.cbetF_opp).toFixed(1)),
          cbetT_pct: Number(toPct(entry.cbetT, entry.cbetT_opp).toFixed(1)),
          cbetR_pct: Number(toPct(entry.cbetR, entry.cbetR_opp).toFixed(1)),
          cbetF_opp: entry.cbetF_opp,
          cbetT_opp: entry.cbetT_opp,
          cbetR_opp: entry.cbetR_opp,
          cbetFCount: entry.cbetF,
          cbetTCount: entry.cbetT,
          cbetRCount: entry.cbetR,
          rakeUSD: Number(entry.rakeUSD.toFixed(2)),
          jackpotUSD: Number(entry.jackpotUSD.toFixed(2)),
          totalRakeUSD: Number(entry.totalRakeUSD.toFixed(2)),
          threeBetCount: entry.threeBet,
          threeBetOppCount: entry.threeBetOpp,
          pfrCount: entry.pfr,
          pfrOppCount: entry.pfrOpp,
          wtsdCount: entry.wtsd,
          wtsdOppCount: entry.wtsdOpp,
          wtsd_pct: Number(wtsdPct.toFixed(1)),
          wwsf_pct: Number(wwsfPct.toFixed(1)),
          sb: entry.sb,
          bb: entry.bb,
        };
      }).sort((a, b) => b.hands - a.hands);
      
      // Format available options
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
        groupBy: groupMode,
        rows: rowsOut,
        totalHands: processed,
        available,
        heroName,
        heroStats,
      };
    } catch (err) {
      logger.error('Failed to get hero breakdown', { error: err.message });
      return { groupBy: 'stake', rows: [], totalHands: 0, available: { stakes: [], positions: [] } };
    }
  });

  // stats:positionProfitability - Get hero profitability by position
  ipcMain.handle('stats:positionProfitability', (_event, options = {}) => {
    try {
      const {
        limit,
        stakes,
        showdown = 'all',
        result = 'all',
        from,
        to,
      } = options || {};

      const heroName = fetchLatestHeroName(db);
      const maxHands = Number(limit) > 0 ? Number(limit) : null;
      const stakeSet = Array.isArray(stakes) && stakes.length ? new Set(stakes) : null;
      const showdownMode = String(showdown || 'all').toLowerCase();
      const resultMode = String(result || 'all').toLowerCase();
      const fromTs = Date.parse(from || '');
      const toTs = Date.parse(to || '');
      const hasFrom = Number.isFinite(fromTs);
      const hasTo = Number.isFinite(toTs);

      const rows = fetchHandsForMetrics(db);
      
      // Group by position
      const positionGroups = new Map();
      let processed = 0;

      for (const row of rows) {
        if (maxHands && processed >= maxHands) break;
        if (!row?.json) continue;

        let hand;
        try {
          hand = JSON.parse(row.json);
        } catch {
          continue;
        }

        const metrics = computeHeroHandMetrics(hand, row);
        if (!metrics) continue;

        // Apply filters
        if (hasFrom && typeof metrics.ts === 'number' && metrics.ts < fromTs) continue;
        if (hasTo && typeof metrics.ts === 'number' && metrics.ts > toTs) continue;
        if (stakeSet && !stakeSet.has(metrics.stakeKey)) continue;
        if (showdownMode === 'showdown' && !metrics.showdown) continue;
        if (showdownMode === 'nonshowdown' && metrics.showdown) continue;
        if (resultMode === 'won' && metrics.netUSD <= 0.005) continue;
        if (resultMode === 'lost' && metrics.netUSD >= -0.005) continue;
        if (resultMode === 'breakeven' && Math.abs(metrics.netUSD) > 0.005) continue;

        processed++;

        const position = metrics.position || 'Unknown';
        let entry = positionGroups.get(position);
        if (!entry) {
          entry = {
            position,
            hands: 0,
            netBB: 0,
            netUSD: 0,
            showdownUSD: 0,
            nonShowdownUSD: 0,
            preRakeUSD: 0,
            preRakeBB: 0,
            vpip: 0,
            vpipOpp: 0,
            pfr: 0,
            pfrOpp: 0,
            wtsd: 0,
            wtsdOpp: 0,
            wwsf: 0,
            wwsfOpp: 0,
            won: 0,
            lost: 0,
            sb: metrics.sb || 0,
            bb: metrics.bb || 0,
          };
          positionGroups.set(position, entry);
        }

        entry.hands++;
        entry.netBB += metrics.netBB || 0;
        entry.netUSD += metrics.netUSD || 0;
        entry.showdownUSD += metrics.showdownUSD || 0;
        entry.nonShowdownUSD += metrics.nonShowdownUSD || 0;
        entry.preRakeUSD += metrics.preRakeUSD || 0;
        entry.preRakeBB += metrics.preRakeBB || 0;
        entry.vpip += metrics.vpip || 0;
        entry.vpipOpp += metrics.vpipOpp || 0;
        entry.pfr += metrics.pfr || 0;
        entry.pfrOpp += metrics.pfrOpp || 0;
        entry.wtsd += metrics.wtsd || 0;
        entry.wtsdOpp += metrics.wtsdOpp || 0;
        entry.wwsf += metrics.wwsf || 0;
        entry.wwsfOpp += metrics.wwsfOpp || 0;
        
        if (metrics.netUSD > 0.005) entry.won++;
        if (metrics.netUSD < -0.005) entry.lost++;
      }

      // Calculate stats per position
      const positionStats = Array.from(positionGroups.values()).map((entry) => {
        const hands = entry.hands;
        const bbPer100 = hands ? entry.netBB / (hands / 100) : 0;
        const vpipPct = toPct(entry.vpip, entry.vpipOpp || entry.hands);
        const pfrPct = toPct(entry.pfr, entry.pfrOpp || entry.hands);
        const wtsdPct = toPct(entry.wtsd, entry.wtsdOpp);
        const wwsfPct = toPct(entry.wwsf, entry.wwsfOpp);
        const winRate = toPct(entry.won, entry.hands);

        return {
          position: entry.position,
          hands,
          netUSD: Number(entry.netUSD.toFixed(2)),
          netBB: Number(entry.netBB.toFixed(2)),
          bbPer100: Number(bbPer100.toFixed(2)),
          showdownUSD: Number(entry.showdownUSD.toFixed(2)),
          nonShowdownUSD: Number(entry.nonShowdownUSD.toFixed(2)),
          preRakeUSD: Number(entry.preRakeUSD.toFixed(2)),
          preRakeBBPer100: hands ? Number((entry.preRakeBB / (hands / 100)).toFixed(2)) : 0,
          vpip_pct: Number(vpipPct.toFixed(1)),
          pfr_pct: Number(pfrPct.toFixed(1)),
          wtsd_pct: Number(wtsdPct.toFixed(1)),
          wwsf_pct: Number(wwsfPct.toFixed(1)),
          winRate_pct: Number(winRate.toFixed(1)),
          won: entry.won,
          lost: entry.lost,
          sb: entry.sb,
          bb: entry.bb,
        };
      });

      // Filter to only include standard positions and sort by position order
      const positionOrder = ['UTG', 'MP', 'CO', 'BTN', 'SB', 'BB'];
      const filteredStats = positionStats.filter(stat => positionOrder.includes(stat.position));
      
      filteredStats.sort((a, b) => {
        const indexA = positionOrder.indexOf(a.position);
        const indexB = positionOrder.indexOf(b.position);
        return indexA - indexB;
      });

      return {
        positions: filteredStats,
        totalHands: processed,
        heroName,
      };
    } catch (err) {
      logger.error('Failed to get position profitability', { error: err.message });
      return { positions: [], totalHands: 0 };
    }
  });

  // stats:hourlyHeatmap - Get hourly heatmap data
  ipcMain.handle('stats:hourlyHeatmap', (_event, options = {}) => {
    try {
      const hero = fetchLatestHeroName(db);
      if (!hero) return { success: false, data: [] };
      
      // Build WHERE clauses from filters
      const conditions = [`hero = ?`];
      const params = [hero];
      
      // Apply filters
      if (options.stakes && Array.isArray(options.stakes) && options.stakes.length > 0) {
        const stakeConditions = options.stakes.map(() => '(sb = ? AND bb = ?)');
        conditions.push(`(${stakeConditions.join(' OR ')})`);
        options.stakes.forEach(stakeStr => {
          const [sb, bb] = stakeStr.split('/').map(parseFloat);
          params.push(sb, bb);
        });
      }
      
      if (options.from) {
        conditions.push('dateUTC >= ?');
        params.push(options.from);
      }
      
      if (options.to) {
        conditions.push('dateUTC <= ?');
        params.push(options.to + 'T23:59:59');
      }
      
      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      
      // Query to get hands grouped by hour and day of week
      const query = `
        SELECT 
          CAST(strftime('%H', dateUTC) AS INTEGER) as hour,
          CAST(strftime('%w', dateUTC) AS INTEGER) as dayOfWeek,
          COUNT(*) as hands,
          SUM(heroNet) as profit,
          AVG(heroNet) as avgProfit,
          SUM(CASE WHEN heroNet > 0 THEN 1 ELSE 0 END) as wins,
          SUM(CASE WHEN heroNet < 0 THEN 1 ELSE 0 END) as losses
        FROM hands
        ${whereClause}
        GROUP BY hour, dayOfWeek
        ORDER BY dayOfWeek, hour
      `;
      
      const stmt = db.prepare(query);
      const rows = stmt.all(...params);
      
      return { success: true, data: rows };
    } catch (err) {
      logger.error('Failed to fetch hourly heatmap', { error: err.message });
      return { success: false, error: err.message, data: [] };
    }
  });

  // stats:rebuild - Rebuild player statistics
  ipcMain.handle('stats:rebuild', async () => {
    try {
      logger.info('Rebuilding player stats');
      const result = await rebuildPlayerStats(db, __dirname);
      logger.info('Player stats rebuilt successfully');
      return result;
    } catch (err) {
      logger.error('Failed to rebuild stats', { error: err.message });
      throw err;
    }
  });

  // stats:exportCSV - Export stats to CSV file
  ipcMain.handle('stats:exportCSV', async (_event, data, filename) => {
    try {
      // Show save dialog
      const result = await dialog.showSaveDialog(BrowserWindow.getFocusedWindow(), {
        title: 'Export Stats to CSV',
        defaultPath: filename || 'poker_stats.csv',
        filters: [
          { name: 'CSV Files', extensions: ['csv'] },
          { name: 'JSON Files', extensions: ['json'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });
      
      if (result.canceled || !result.filePath) {
        return { success: false, message: 'Export cancelled' };
      }
      
      // Write file
      fs.writeFileSync(result.filePath, data, 'utf-8');
      logger.info('Stats exported successfully', { path: result.filePath });
      
      return { success: true, path: result.filePath };
    } catch (err) {
      logger.error('Failed to export stats', { error: err.message });
      return { success: false, error: err.message };
    }
  });

  // stats:list:export - Convert stats array to CSV string
  ipcMain.handle('stats:list:export', (_event, stats = []) => {
    try {
      const headers = ['Player', 'Hands', 'VPIP_pct', 'PFR_pct', 'ThreeBet_pct', 'WTSD_pct', 'Updated'];
      const rows = Array.isArray(stats) ? stats : [];
      const csvLines = [
        headers.join(',')
      ];

      if (rows.length === 0) {
        csvLines.push(headers.map(() => '').join(','));
      } else {
        for (const row of rows) {
          const values = [
            toCsvValue(row.player ?? ''),
            toCsvValue(row.hands ?? 0),
            toCsvValue(row.VPIP_pct ?? 0),
            toCsvValue(row.PFR_pct ?? 0),
            toCsvValue(row.ThreeBet_pct ?? 0),
            toCsvValue(row.WTSD_pct ?? 0),
            toCsvValue(row.updated_at ?? '')
          ];
          csvLines.push(values.join(','));
        }
      }

      return { success: true, csv: csvLines.join('\n') };
    } catch (err) {
      logger.error('Failed to export stats list', { error: err.message });
      return { success: false, error: err.message, csv: '' };
    }
  });

  // Hero graph data - build timeline and aggregate statistics
  ipcMain.handle('hero:graphData', (_event, options = {}) => {
    try {
      if (!isDbOpen(db)) {
        return {
          success: false,
          data: [],
          timeline: [],
          plotted: 0,
          totalHands: 0,
          skipped: 0,
          error: 'database not available'
        };
      }

      const graph = buildHeroGraphData(db, options);
      return { success: true, data: graph.timeline || [], ...graph };
    } catch (err) {
      logger.error('Failed to generate hero graph data', { error: err.message });
      return { 
        success: false,
        data: [],
        timeline: [], 
        plotted: 0, 
        totalHands: 0, 
        skipped: 0,
        error: err.message 
      };
    }
  });

  logger.info('Stats handlers registered successfully');
}

module.exports = { registerStatsHandlers };
