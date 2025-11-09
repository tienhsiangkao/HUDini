// handlers/hands-handlers.cjs
// IPC handlers for hand-related operations

const { logger } = require('../lib/logger.cjs');
const { validateHandIds } = require('../utils/validators.cjs');
const { clearGraphCache } = require('../lib/hero_graph.cjs');
const config = require('../config/index.cjs');

const handsLogger = logger.child('HandsHandlers');

// Performance: Cache for expensive range calculations
const rangeCache = new Map();
const RANGE_CACHE_TTL = config.cache.hands.ttl;
const MAX_RANGE_CACHE_SIZE = config.cache.hands.maxEntries;

function clearRangeCache() {
  rangeCache.clear();
  handsLogger.info('Range cache cleared');
}

function normalizeSearchValue(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text.length ? text : null;
}

function encodeJsonStringValue(value) {
  const normalized = normalizeSearchValue(value);
  if (normalized == null) return null;
  try {
    const asJson = JSON.stringify(normalized);
    return asJson.slice(1, -1);
  } catch {
    return null;
  }
}

function makeContainsClause(snippet) {
  if (!snippet) return null;
  return {
    sql: 'instr(LOWER(json), ?) > 0',
    params: [snippet.toLowerCase()],
  };
}

function makeAbsentClause(snippet) {
  if (!snippet) return null;
  return {
    sql: 'instr(LOWER(json), ?) = 0',
    params: [snippet.toLowerCase()],
  };
}

function buildAdvancedFilterClause(filter) {
  if (!filter || !filter.field) return null;
  const field = String(filter.field).toLowerCase();
  switch (field) {
    case 'position': {
      const encoded = encodeJsonStringValue(filter.value);
      if (!encoded) return null;
      return makeContainsClause(`"position":"${encoded}"`);
    }
    case 'villain': {
      const encoded = encodeJsonStringValue(filter.value);
      if (!encoded) return null;
      return makeContainsClause(`"${encoded}"`);
    }
    case 'showdown': {
      const value = normalizeSearchValue(filter.value);
      if (!value) return null;
      if (value.toLowerCase() === 'yes') {
        return makeContainsClause('showdown');
      }
      if (value.toLowerCase() === 'no') {
        return makeAbsentClause('showdown');
      }
      return null;
    }
    default:
      return null;
  }
}

function registerHandsHandlers(ipcMain, db) {
  // List hands with filters
  ipcMain.handle('hands:list', (e, options = {}) => {
    const {
      q = '',
      limit = config.limits.hands.default,
      result = 'all',
      minBB,
      maxBB,
      from,
      to,
      stake,
      sortField = 'date',
      sortDir = 'desc',
      position,
      villain,
      showdown,
      minPot,
      maxPot,
      advancedFilters,
    } = options || {};
    
    try {
      const clauses = [];
      const params = [];
      
      let sql = `
        SELECT id as handId, dateUTC, tableName, sb, bb, heroNet, ts
        FROM hands
      `;
      
      // Search query
      if (q) {
        clauses.push('(tableName LIKE ? OR id LIKE ? OR json LIKE ?)');
        const like = `%${q}%`;
        params.push(like, like, like);
      }
      
      // Result filter
      if (result === 'won') {
        clauses.push('heroNet > 0.005');
      } else if (result === 'lost') {
        clauses.push('heroNet < -0.005');
      } else if (result === 'breakeven') {
        clauses.push('ABS(heroNet) <= 0.005');
      }
      
      // BB range
      const minBbVal = Number(minBB);
      if (!Number.isNaN(minBbVal) && minBB !== '' && minBB != null) {
        clauses.push('bb >= ?');
        params.push(minBbVal);
      }
      const maxBbVal = Number(maxBB);
      if (!Number.isNaN(maxBbVal) && maxBB !== '' && maxBB != null) {
        clauses.push('bb <= ?');
        params.push(maxBbVal);
      }
      
      // Date range
      const fromTs = Date.parse(from);
      if (!Number.isNaN(fromTs)) {
        clauses.push('ts IS NOT NULL AND ts >= ?');
        params.push(fromTs);
      }
      const toTs = Date.parse(to);
      if (!Number.isNaN(toTs)) {
        clauses.push('ts IS NOT NULL AND ts <= ?');
        params.push(toTs);
      }
      
      // Stake filter
      if (stake && stake !== 'all') {
        const parts = String(stake).split('/');
        if (parts.length === 2) {
          const sbVal = Number(parts[0]);
          const bbVal = Number(parts[1]);
          if (!Number.isNaN(sbVal) && !Number.isNaN(bbVal)) {
            clauses.push('sb = ? AND bb = ?');
            params.push(sbVal, bbVal);
          }
        }
      }
      
      // Advanced filters
      if (advancedFilters && Array.isArray(advancedFilters) && advancedFilters.length > 0) {
        const filterClauses = [];
        advancedFilters.forEach((filter) => {
          if (!filter?.enabled) return;
          const clauseData = buildAdvancedFilterClause(filter);
          if (!clauseData) return;
          let { sql: clauseSql, params: clauseParams = [] } = clauseData;
          if (filter.not) {
            clauseSql = `NOT (${clauseSql})`;
          }
          filterClauses.push(clauseSql);
          if (clauseParams.length) {
            params.push(...clauseParams);
          }
        });

        if (filterClauses.length > 0) {
          clauses.push(`(${filterClauses.join(' AND ')})`);
        }
      }
      
      // Build WHERE clause
      if (clauses.length) {
        sql += ' WHERE ' + clauses.join(' AND ');
      }
      
      // Sorting
      const sortMap = {
        date: 'ts',
        net: 'heroNet',
        stakes: 'bb',
        table: 'tableName',
        id: 'id',
      };
      const column = sortMap[String(sortField)] || 'ts';
      const direction = String(sortDir).toLowerCase() === 'asc' ? 'ASC' : 'DESC';
      const secondary = column !== 'ts' ? 'ts DESC NULLS FIRST, rowid DESC' : 'rowid DESC';
      sql += ` ORDER BY ${column} ${direction}, ${secondary}`;
      sql += ' LIMIT ? OFFSET ?';
      
      params.push(limit, 0);
      
      const stmt = db.prepare(sql);
      const results = stmt.all(...params);
      
      handsLogger.debug('Listed hands', { count: results.length, filters: Object.keys(options).length });
      return results;
    } catch (err) {
      handsLogger.error('Failed to list hands', { error: err.message });
      return [];
    }
  });

  // Get single hand
  ipcMain.handle('hands:get', (e, handId) => {
    try {
      const stmt = db.prepare('SELECT * FROM hands WHERE id = ?');
      return stmt.get(handId);
    } catch (err) {
      handsLogger.error('Failed to get hand', { handId, error: err.message });
      return null;
    }
  });

  // Get hand by ID (with JSON parsing)
  ipcMain.handle('hands:getById', (_event, handId) => {
    try {
      const stmt = db.prepare('SELECT * FROM hands WHERE id = ?');
      const row = stmt.get(handId);
      
      if (!row) return null;
      
      if (row.json) {
        try {
          row.hand = JSON.parse(row.json);
        } catch (e) {
          handsLogger.error('Failed to parse hand JSON', { handId, error: e.message });
          row.hand = null;
        }
      }
      
      return row;
    } catch (err) {
      handsLogger.error('Failed to get hand by ID', { handId, error: err.message });
      return null;
    }
  });

  // Get hand notes
  ipcMain.handle('hands:getNotes', (e, handId) => {
    try {
      const stmt = db.prepare('SELECT extras FROM hands WHERE id = ?');
      const row = stmt.get(handId);
      
      if (!row || !row.extras) return null;
      
      try {
        const extras = JSON.parse(row.extras);
        return extras.notes || null;
      } catch {
        return null;
      }
    } catch (err) {
      handsLogger.error('Failed to get hand notes', { handId, error: err.message });
      return null;
    }
  });

  // Save hand notes
  ipcMain.handle('hands:saveNotes', (e, handId, notes) => {
    try {
      const stmt = db.prepare('UPDATE hands SET extras = json_set(COALESCE(extras, "{}"), "$.notes", ?) WHERE id = ?');
      stmt.run(notes || null, handId);
      
      handsLogger.info('Saved hand notes', { handId });
      return { success: true };
    } catch (err) {
      handsLogger.error('Failed to save hand notes', { handId, error: err.message });
      return { success: false, error: err.message };
    }
  });

  // Search hands by notes
  ipcMain.handle('hands:searchNotes', (_event, query) => {
    try {
      if (!query) return [];
      
      const sql = `
        SELECT id as handId, dateUTC, tableName, sb, bb, heroNet, ts, extras
        FROM hands
        WHERE extras LIKE ?
        ORDER BY ts DESC
        LIMIT ${config.limits.hands.playerNotes}
      `;
      
      const stmt = db.prepare(sql);
      const results = stmt.all(`%${query}%`);
      
      handsLogger.debug('Searched hand notes', { query, results: results.length });
      return results;
    } catch (err) {
      handsLogger.error('Failed to search notes', { query, error: err.message });
      return [];
    }
  });

  // Delete hands
  ipcMain.handle('hands:delete', async (_event, handIds) => {
    try {
      const validIds = validateHandIds(handIds);
      
      const placeholders = validIds.map(() => '?').join(',');
      const stmt = db.prepare(`DELETE FROM hands WHERE id IN (${placeholders})`);
      const result = stmt.run(...validIds);
      
      // Invalidate caches since hand data changed
      clearRangeCache();
      clearGraphCache();
      
      handsLogger.info('Deleted hands', { count: result.changes });
      return { success: true, deleted: result.changes };
    } catch (error) {
      handsLogger.error('Failed to delete hands', { error: error.message });
      return { success: false, message: error.message };
    }
  });

  // Get list of stakes
  ipcMain.handle('hands:stakes', () => {
    try {
      const stmt = db.prepare(`
        SELECT DISTINCT sb, bb
        FROM hands
        WHERE sb IS NOT NULL AND bb IS NOT NULL
        ORDER BY bb ASC, sb ASC
      `);
      return stmt.all();
    } catch (err) {
      handsLogger.error('Failed to get stakes', { error: err.message });
      return [];
    }
  });

  // Get hand range statistics (for Hand Range Visualizer)
  ipcMain.handle('hands:getRange', (_event, options = {}) => {
    try {
      const { position = 'all', action = 'all', from, to } = options;
      
      // Check cache first
      const cacheKey = JSON.stringify(options);
      if (rangeCache.has(cacheKey)) {
        const cached = rangeCache.get(cacheKey);
        if (Date.now() - cached.timestamp < RANGE_CACHE_TTL) {
          handsLogger.debug('Returning cached range data', { 
            position, action, from, to,
            cacheAge: Date.now() - cached.timestamp 
          });
          return cached.data;
        } else {
          rangeCache.delete(cacheKey);
        }
      }
      
      // Build query with optional date filters
      let query = 'SELECT json, heroNet FROM hands WHERE json IS NOT NULL';
      const params = [];
      
      // Date range filters for performance
      if (from) {
        const fromTs = Date.parse(from);
        if (!Number.isNaN(fromTs)) {
          query += ' AND ts >= ?';
          params.push(fromTs);
        }
      }
      if (to) {
        const toTs = Date.parse(to);
        if (!Number.isNaN(toTs)) {
          query += ' AND ts <= ?';
          params.push(toTs);
        }
      }
      
      // Safety limit to prevent excessive memory usage
      query += ` ORDER BY ts DESC LIMIT ${config.limits.hands.max}`;
      
      // Fetch hands with JSON data
      const stmt = db.prepare(query);
      const hands = stmt.all(...params);
      
      // Aggregate by hand type (AA, KK, AKs, AKo, etc.)
      const rangeData = {};
      const rankMap = { 'A': 14, 'K': 13, 'Q': 12, 'J': 11, 'T': 10, '9': 9, '8': 8, '7': 7, '6': 6, '5': 5, '4': 4, '3': 3, '2': 2 };
      const reverseRankMap = { 14: 'A', 13: 'K', 12: 'Q', 11: 'J', 10: 'T', 9: '9', 8: '8', 7: '7', 6: '6', 5: '5', 4: '4', 3: '3', 2: '2' };
      
      for (const row of hands) {
        let parsed;
        try {
          parsed = JSON.parse(row.json);
        } catch {
          continue;
        }
        
        // Find hero player
        const heroPlayer = parsed.players?.find(p => p.isHero);
        if (!heroPlayer || !Array.isArray(heroPlayer.cards) || heroPlayer.cards.length < 2) continue;
        
        // Check position filter
        if (position !== 'all' && heroPlayer.position !== position) continue;
        
        // Check action filter (simplified - check if hero raised/called preflop)
        if (action !== 'all') {
          const preflopActions = parsed.streets?.[0]?.actions || [];
          const heroActions = preflopActions.filter(a => a.player === heroPlayer.name);
          
          if (action === 'raise') {
            const hasRaise = heroActions.some(a => a.action === 'raise' || a.action === 'bet');
            if (!hasRaise) continue;
          } else if (action === 'call') {
            const hasCall = heroActions.some(a => a.action === 'call');
            if (!hasCall) continue;
          } else if (action === 'fold') {
            const hasFold = heroActions.some(a => a.action === 'fold');
            if (!hasFold) continue;
          }
        }
        
        // Normalize hand to canonical form
        const cards = heroPlayer.cards;
        const card1 = cards[0];
        const card2 = cards[1];
        const rank1 = rankMap[card1[0]] || 0;
        const rank2 = rankMap[card2[0]] || 0;
        const suit1 = card1[1];
        const suit2 = card2[1];
        
        const highRank = Math.max(rank1, rank2);
        const lowRank = Math.min(rank1, rank2);
        const suited = suit1 === suit2;
        const isPair = rank1 === rank2;
        
        let handName;
        if (isPair) {
          handName = reverseRankMap[highRank] + reverseRankMap[lowRank];
        } else {
          handName = reverseRankMap[highRank] + reverseRankMap[lowRank] + (suited ? 's' : 'o');
        }
        
        // Aggregate statistics
        if (!rangeData[handName]) {
          rangeData[handName] = {
            frequency: 0,
            hands: 0,
            profit: 0,
            vpip: 0,
            pfr: 0,
            threeBet: 0,
            won: 0,
            lost: 0
          };
        }
        
        rangeData[handName].hands++;
        rangeData[handName].profit += row.heroNet || 0;
        
        // Track win/loss
        if (row.heroNet > 0.005) rangeData[handName].won++;
        else if (row.heroNet < -0.005) rangeData[handName].lost++;
        
        // Basic action tracking (simplified)
        const preflopActions = parsed.streets?.[0]?.actions || [];
        const heroActions = preflopActions.filter(a => a.player === heroPlayer.name);
        
        if (heroActions.length > 0) rangeData[handName].vpip++;
        if (heroActions.some(a => a.action === 'raise' || a.action === 'bet')) rangeData[handName].pfr++;
        
        // Count 3-bets (simplified: any second raise)
        const raiseCount = heroActions.filter(a => a.action === 'raise').length;
        if (raiseCount >= 2) rangeData[handName].threeBet++;
      }
      
      // Calculate frequencies (as percentage of total hands seen)
      const totalHands = hands.length;
      for (const handName in rangeData) {
        const stats = rangeData[handName];
        stats.frequency = totalHands > 0 ? (stats.hands / totalHands) * 100 : 0;
        
        // Convert counters to percentages
        if (stats.hands > 0) {
          stats.vpip = (stats.vpip / stats.hands) * 100;
          stats.pfr = (stats.pfr / stats.hands) * 100;
          stats.threeBet = (stats.threeBet / stats.hands) * 100;
        }
      }
      
      const result = { success: true, data: rangeData };
      
      // Cache the result
      rangeCache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });
      
      // Limit cache size (LRU eviction)
      if (rangeCache.size > MAX_RANGE_CACHE_SIZE) {
        const firstKey = rangeCache.keys().next().value;
        rangeCache.delete(firstKey);
        handsLogger.debug('Evicted oldest cache entry', { cacheSize: rangeCache.size });
      }
      
      handsLogger.info('Generated hand range data', { 
        totalHands: hands.length,
        uniqueHands: Object.keys(rangeData).length,
        position,
        action,
        from,
        to,
        cached: true
      });
      
      return result;
    } catch (err) {
      handsLogger.error('Failed to generate hand range data', { error: err.message });
      return { success: false, error: err.message, data: {} };
    }
  });

  handsLogger.info('Hands handlers registered');
}

module.exports = { registerHandsHandlers, clearRangeCache };
