// handlers/reports-handlers.cjs
// Report generation IPC handlers for custom reports, leaks, trends, and heatmaps

const { logger } = require('../lib/logger.cjs');
const { aggregateHandsForReports } = require('../utils/aggregators.cjs');
const { extractHandMetrics } = require('../utils/metrics.cjs');

/**
 * Register all report-related IPC handlers
 */
function registerReportsHandlers(ipcMain, db) {
  logger.info('Registering reports handlers');

  // reports:generate - Custom report builder with flexible grouping and metrics
  ipcMain.handle('reports:generate', async (e, params = {}) => {
    try {
      const {
        dateFrom = '',
        dateTo = '',
        stakes = [], // ['0.5/1', '1/2']
        positions = [], // ['BTN', 'CO', 'SB']
        metrics = ['winrate'], // Now supports: winrate, vpip, pfr, threeBet, cbet, wtsd
        groupBy = 'overall' // 'overall', 'stake', 'position', 'date'
      } = params;

      // Build WHERE clause for filtering
      let whereClause = '1=1';
      const whereParams = [];
      
      // Filter out malformed stakes: SB must be > 0, BB must be > 0, and SB must be <= BB
      whereClause += ' AND sb > 0 AND bb > 0 AND sb <= bb';
      
      if (dateFrom) {
        const fromTs = Date.parse(dateFrom);
        if (!isNaN(fromTs)) {
          whereClause += ' AND ts >= ?';
          whereParams.push(fromTs);
        }
      }
      if (dateTo) {
        const toTs = Date.parse(dateTo + 'T23:59:59');
        if (!isNaN(toTs)) {
          whereClause += ' AND ts <= ?';
          whereParams.push(toTs);
        }
      }
      if (stakes.length > 0) {
        const stakeConditions = stakes.map(s => {
          const [sb, bb] = s.split('/').map(Number);
          return `(sb = ${sb} AND bb = ${bb})`;
        }).join(' OR ');
        whereClause += ` AND (${stakeConditions})`;
      }

      // Fetch all matching hands with JSON
      const allHands = db.prepare(`
        SELECT id, json, sb, bb, heroNet, 
               strftime('%Y-%m-%d', datetime(ts/1000, 'unixepoch')) as play_date
        FROM hands
        WHERE ${whereClause}
      `).all(...whereParams);

      // Group hands by the requested grouping dimension
      const handsByGroup = new Map();
      
      for (const hand of allHands) {
        try {
          const handData = JSON.parse(hand.json);
          const position = handData.positions?.[handData.hero || 'Hero'] || null;
          
          // Filter by position if specified
          if (positions.length > 0 && !positions.includes(position)) {
            continue;
          }
          
          // Determine group key
          let groupKey = 'overall';
          if (groupBy === 'stake') {
            groupKey = `${hand.sb}/${hand.bb}`;
          } else if (groupBy === 'position') {
            groupKey = position || 'Unknown';
          } else if (groupBy === 'date') {
            groupKey = hand.play_date;
          }

          if (!handsByGroup.has(groupKey)) {
            handsByGroup.set(groupKey, []);
          }
          handsByGroup.get(groupKey).push(hand);
        } catch (err) {
          // Skip malformed hands
          continue;
        }
      }

      // Aggregate each group using unified pipeline
      const data = [];
      for (const [groupKey, groupHands] of handsByGroup.entries()) {
        const stats = aggregateHandsForReports(groupHands);
        
        const row = { 
          group: groupKey, 
          hands: stats.hands 
        };
        
        // Add requested metrics with proper calculations
        if (metrics.includes('winrate')) {
          row.bb_per_100 = stats.totalBB > 0 
            ? Math.round((stats.totalWon * 100 / stats.totalBB) * 100) / 100 
            : 0;
          row.total_won = Math.round(stats.totalWon * 100) / 100;
        }
        if (metrics.includes('vpip')) {
          row.vpip = stats.hands > 0 ? Math.round((stats.VPIP / stats.hands) * 100 * 10) / 10 : 0;
        }
        if (metrics.includes('pfr')) {
          row.pfr = stats.PFR_opp > 0 ? Math.round((stats.PFR / stats.PFR_opp) * 100 * 10) / 10 : 0;
        }
        if (metrics.includes('threeBet')) {
          row.threeBet = stats.ThreeBet_opp > 0 ? Math.round((stats.ThreeBet / stats.ThreeBet_opp) * 100 * 10) / 10 : 0;
        }
        if (metrics.includes('cbet')) {
          row.cbet = stats.CBetF_opp > 0 ? Math.round((stats.CBetF / stats.CBetF_opp) * 100 * 10) / 10 : 0;
        }
        if (metrics.includes('wtsd')) {
          row.wtsd = stats.WTSD_opp > 0 ? Math.round((stats.WTSD / stats.WTSD_opp) * 100 * 10) / 10 : 0;
        }
        
        data.push(row);
      }

      logger.info(`[Reports] Generated report: ${data.length} groups, ${allHands.length} hands`);
      return {
        success: true,
        data,
        params,
        generatedAt: new Date().toISOString()
      };
    } catch (err) {
      logger.error('[Reports] Generation error:', err);
      return { success: false, error: err.message };
    }
  });

  // reports:leaks - Leak detection report analyzing positional and statistical weaknesses
  ipcMain.handle('reports:leaks', async (e, params = {}) => {
    try {
      const { dateFrom = '', dateTo = '' } = params;
      const leaks = [];

      // Build WHERE clause for filters
      let whereClause = '1=1';
      const whereParams = [];
      if (dateFrom) {
        const fromTs = Date.parse(dateFrom);
        if (!isNaN(fromTs)) {
          whereClause += ' AND ts >= ?';
          whereParams.push(fromTs);
        }
      }
      if (dateTo) {
        const toTs = Date.parse(dateTo + 'T23:59:59');
        if (!isNaN(toTs)) {
          whereClause += ' AND ts <= ?';
          whereParams.push(toTs);
        }
      }

      // Get all hands and calculate win rate by position
      const hands = db.prepare(`
        SELECT json, heroNet, bb
        FROM hands
        WHERE ${whereClause}
      `).all(...whereParams);

      const positionStats = new Map();
      for (const hand of hands) {
        const metrics = extractHandMetrics(hand.json);
        if (!metrics || !metrics.position) continue;

        if (!positionStats.has(metrics.position)) {
          positionStats.set(metrics.position, {
            hands: 0,
            total_won: 0,
            total_bb: 0
          });
        }

        const stats = positionStats.get(metrics.position);
        stats.hands++;
        stats.total_won += hand.heroNet || 0;
        stats.total_bb += hand.bb || 0;
      }

      // Analyze positional leaks
      positionStats.forEach((stats, position) => {
        if (stats.hands < 50) return;
        const bb_per_100 = stats.total_bb > 0 
          ? Math.round((stats.total_won * 100 / stats.total_bb) * 100) / 100 
          : 0;
        const total_won = Math.round(stats.total_won * 100) / 100;
        
        if (bb_per_100 < -20) {
          leaks.push({
            severity: 'high',
            category: 'Profitability',
            issue: `Losing heavily from ${position}`,
            metric: `${bb_per_100} BB/100 (${stats.hands} hands, $${total_won})`,
            benchmark: 'Target: >0 BB/100',
            suggestion: `Major leak from ${position}. Review your opening ranges, continuation betting, and showdown decisions from this position.`
          });
        } else if (bb_per_100 < -10) {
          leaks.push({
            severity: 'medium',
            category: 'Profitability',
            issue: `Losing from ${position}`,
            metric: `${bb_per_100} BB/100 (${stats.hands} hands, $${total_won})`,
            benchmark: 'Target: >0 BB/100',
            suggestion: `You're unprofitable from ${position}. Tighten your ranges and focus on profitable situations.`
          });
        }
      });

      // Try to get aggregate stats from player_stats table if available
      try {
        const playerStatsRow = db.prepare(`
          SELECT player, Hands, VPIP_pct, PFR_pct, ThreeBet_pct, WTSD_pct
          FROM player_stats
          WHERE player = 'Hero'
          LIMIT 1
        `).get();

        if (playerStatsRow) {
          const { VPIP_pct, PFR_pct, ThreeBet_pct, WTSD_pct, Hands } = playerStatsRow;
          
          // Check VPIP
          if (VPIP_pct && VPIP_pct > 30) {
            leaks.push({
              severity: 'high',
              category: 'Preflop',
              issue: 'High overall VPIP',
              metric: `${VPIP_pct}% (${Hands} hands)`,
              benchmark: 'Expected: 18-25%',
              suggestion: 'You are playing too many hands overall. Tighten your opening ranges, especially from early position.'
            });
          }
          
          // Check PFR
          if (PFR_pct && PFR_pct < 12) {
            leaks.push({
              severity: 'medium',
              category: 'Preflop',
              issue: 'Low preflop raise frequency',
              metric: `${PFR_pct}% (${Hands} hands)`,
              benchmark: 'Expected: 15-22%',
              suggestion: 'You may be limping too much. Raise more with your playable hands to take control of the pot.'
            });
          }
          
          // Check 3-bet
          if (ThreeBet_pct && ThreeBet_pct < 5) {
            leaks.push({
              severity: 'medium',
              category: 'Preflop',
              issue: 'Low 3-bet frequency',
              metric: `${ThreeBet_pct}% (${Hands} hands)`,
              benchmark: 'Expected: 7-12%',
              suggestion: 'Consider 3-betting more, especially in position. Add both value and bluff 3-bets to your range.'
            });
          }
          
          // Check WTSD
          if (WTSD_pct && WTSD_pct > 35) {
            leaks.push({
              severity: 'high',
              category: 'Postflop',
              issue: 'Going to showdown too often',
              metric: `${WTSD_pct}% (${Hands} hands)`,
              benchmark: 'Expected: 20-30%',
              suggestion: 'You may be calling too much on later streets. Fold more marginal hands to aggression.'
            });
          } else if (WTSD_pct && WTSD_pct < 18) {
            leaks.push({
              severity: 'low',
              category: 'Postflop',
              issue: 'Rarely going to showdown',
              metric: `${WTSD_pct}% (${Hands} hands)`,
              benchmark: 'Expected: 20-30%',
              suggestion: 'You may be folding too easily. Consider calling down more with medium-strength hands.'
            });
          }
        }
      } catch (statsErr) {
        logger.warn('[Reports] player_stats not available for leak detection:', statsErr.message);
      }

      logger.info(`[Reports] Leak detection complete: ${leaks.length} leaks found`);
      return {
        success: true,
        leaks: leaks.sort((a, b) => {
          const severityOrder = { high: 0, medium: 1, low: 2 };
          return severityOrder[a.severity] - severityOrder[b.severity];
        }),
        summary: {
          total: leaks.length,
          high: leaks.filter(l => l.severity === 'high').length,
          medium: leaks.filter(l => l.severity === 'medium').length,
          low: leaks.filter(l => l.severity === 'low').length
        },
        generatedAt: new Date().toISOString()
      };
    } catch (err) {
      logger.error('[Reports] Leak detection error:', err);
      return { success: false, error: err.message };
    }
  });

  // reports:trends - Trend analysis report showing performance over time
  ipcMain.handle('reports:trends', async (e, params = {}) => {
    try {
      const {
        dateFrom = '',
        dateTo = '',
        metrics = ['winrate'],
        interval = 'week' // 'day', 'week', 'month'
      } = params;

      let whereClause = '1=1';
      const whereParams = [];
      if (dateFrom) {
        const fromTs = Date.parse(dateFrom);
        if (!isNaN(fromTs)) {
          whereClause += ' AND ts >= ?';
          whereParams.push(fromTs);
        }
      }
      if (dateTo) {
        const toTs = Date.parse(dateTo + 'T23:59:59');
        if (!isNaN(toTs)) {
          whereClause += ' AND ts <= ?';
          whereParams.push(toTs);
        }
      }

      // Determine date grouping format
      let dateFormat;
      if (interval === 'day') {
        dateFormat = '%Y-%m-%d';
      } else if (interval === 'week') {
        dateFormat = '%Y-W%W';
      } else {
        dateFormat = '%Y-%m';
      }

      // Fetch all hands with JSON
      const allHands = db.prepare(`
        SELECT json, heroNet, bb, 
               strftime('${dateFormat}', datetime(ts/1000, 'unixepoch')) as period
        FROM hands
        WHERE ${whereClause}
        ORDER BY ts
      `).all(...whereParams);

      // Group hands by period
      const handsByPeriod = new Map();
      for (const hand of allHands) {
        if (!handsByPeriod.has(hand.period)) {
          handsByPeriod.set(hand.period, []);
        }
        handsByPeriod.get(hand.period).push(hand);
      }

      // Aggregate each period using unified pipeline
      const data = [];
      for (const [period, periodHands] of handsByPeriod.entries()) {
        const stats = aggregateHandsForReports(periodHands);
        
        const row = {
          period,
          hands: stats.hands,
          bb_per_100: stats.totalBB > 0 ? Math.round((stats.totalWon * 100 / stats.totalBB) * 100) / 100 : 0,
          vpip: stats.hands > 0 ? Math.round((stats.VPIP / stats.hands) * 100 * 10) / 10 : 0,
          pfr: stats.PFR_opp > 0 ? Math.round((stats.PFR / stats.PFR_opp) * 100 * 10) / 10 : 0,
          threeBet: stats.ThreeBet_opp > 0 ? Math.round((stats.ThreeBet / stats.ThreeBet_opp) * 100 * 10) / 10 : 0,
          cbet: stats.CBetF_opp > 0 ? Math.round((stats.CBetF / stats.CBetF_opp) * 100 * 10) / 10 : 0,
          wtsd: stats.WTSD_opp > 0 ? Math.round((stats.WTSD / stats.WTSD_opp) * 100 * 10) / 10 : 0
        };
        data.push(row);
      }

      // Calculate moving averages (5-period)
      const movingAvgs = {};
      metrics.forEach(metric => {
        if (metric === 'winrate') {
          const key = 'bb_per_100';
          movingAvgs[key] = data.map((row, idx) => {
            const start = Math.max(0, idx - 4);
            const window = data.slice(start, idx + 1);
            const avg = window.reduce((sum, r) => sum + (r[key] || 0), 0) / window.length;
            return Math.round(avg * 100) / 100;
          });
        } else {
          movingAvgs[metric] = data.map((row, idx) => {
            const start = Math.max(0, idx - 4);
            const window = data.slice(start, idx + 1);
            const avg = window.reduce((sum, r) => sum + (r[metric] || 0), 0) / window.length;
            return Math.round(avg * 100) / 100;
          });
        }
      });

      // Compare first half vs second half
      const midpoint = Math.floor(data.length / 2);
      const firstHalf = data.slice(0, midpoint);
      const secondHalf = data.slice(midpoint);

      const comparison = {};
      metrics.forEach(metric => {
        const key = metric === 'winrate' ? 'bb_per_100' : metric;
        const firstAvg = firstHalf.reduce((sum, r) => sum + (r[key] || 0), 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((sum, r) => sum + (r[key] || 0), 0) / secondHalf.length;
        const change = secondAvg - firstAvg;
        const changePercent = firstAvg !== 0 ? (change / Math.abs(firstAvg)) * 100 : 0;
        
        comparison[metric] = {
          firstPeriod: Math.round(firstAvg * 100) / 100,
          secondPeriod: Math.round(secondAvg * 100) / 100,
          change: Math.round(change * 100) / 100,
          changePercent: Math.round(changePercent * 10) / 10,
          trend: change > 0 ? 'improving' : change < 0 ? 'declining' : 'stable'
        };
      });

      logger.info(`[Reports] Trend analysis complete: ${data.length} periods`);
      return {
        success: true,
        data,
        movingAvgs,
        comparison,
        params,
        generatedAt: new Date().toISOString()
      };
    } catch (err) {
      logger.error('[Reports] Trend analysis error:', err);
      return { success: false, error: err.message };
    }
  });

  // reports:heatmap - Positional heat map report showing performance by position
  ipcMain.handle('reports:heatmap', async (e, params = {}) => {
    try {
      const { dateFrom = '', dateTo = '', metric = 'winrate' } = params;

      let whereClause = '1=1 AND sb > 0 AND bb > 0 AND sb <= bb';
      const whereParams = [];
      if (dateFrom) {
        whereClause += ' AND datetime(ts/1000, \'unixepoch\') >= ?';
        whereParams.push(dateFrom);
      }
      if (dateTo) {
        whereClause += ' AND datetime(ts/1000, \'unixepoch\') <= ?';
        whereParams.push(dateTo);
      }

      // Get all hands and extract positions from JSON
      const query = `SELECT id, json, heroNet, bb FROM hands WHERE ${whereClause}`;
      const allHands = db.prepare(query).all(...whereParams);

      // Get data by position
      const positions = ['UTG', 'MP', 'CO', 'BTN', 'SB', 'BB'];
      const heatmapData = {};

      // Group hands by position
      const handsByPosition = {};
      positions.forEach(pos => handsByPosition[pos] = []);

      allHands.forEach(row => {
        try {
          const hand = JSON.parse(row.json);
          const heroName = hand.hero;
          const position = hand.positions?.[heroName];
          
          if (position && positions.includes(position)) {
            handsByPosition[position].push(row);
          }
        } catch (err) {
          // Skip invalid JSON
        }
      });

      // Calculate stats for each position
      positions.forEach(pos => {
        const hands = handsByPosition[pos];
        if (hands.length >= 10) {
          const totalWon = hands.reduce((sum, h) => sum + (h.heroNet || 0), 0);
          const totalBB = hands.reduce((sum, h) => sum + (h.bb || 0), 0);
          const winrate = totalBB > 0 ? (totalWon * 100 / totalBB) : 0;

          heatmapData[pos] = {
            value: Math.round(winrate * 100) / 100,
            hands: hands.length,
            totalWon: Math.round(totalWon * 100) / 100
          };
        } else {
          heatmapData[pos] = {
            value: 0,
            hands: hands.length,
            totalWon: 0
          };
        }
      });

      // Calculate stats
      const values = Object.values(heatmapData).filter(d => d.hands >= 10).map(d => d.value);
      const min = values.length > 0 ? Math.min(...values) : 0;
      const max = values.length > 0 ? Math.max(...values) : 0;
      const avg = values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;

      // Identify best and worst positions
      const sortedPositions = Object.entries(heatmapData)
        .filter(([_, data]) => data.hands >= 20)
        .sort((a, b) => b[1].value - a[1].value);

      const best = sortedPositions[0];
      const worst = sortedPositions[sortedPositions.length - 1];

      logger.info(`[Reports] Heatmap generated: ${positions.length} positions`);
      return {
        success: true,
        data: heatmapData,
        stats: {
          min: Math.round(min * 100) / 100,
          max: Math.round(max * 100) / 100,
          avg: Math.round(avg * 100) / 100,
          best: best ? { position: best[0], value: best[1].value, hands: best[1].hands } : null,
          worst: worst ? { position: worst[0], value: worst[1].value, hands: worst[1].hands } : null
        },
        params,
        generatedAt: new Date().toISOString()
      };
    } catch (err) {
      logger.error('[Reports] Heatmap error:', err);
      return { success: false, error: err.message };
    }
  });

  logger.info('Reports handlers registered successfully');
}

module.exports = { registerReportsHandlers };
