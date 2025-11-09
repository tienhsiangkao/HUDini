function normalizeNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

/**
 * Compute shared hand counters so every part of the app reports the same values.
 *
 * @param {import('better-sqlite3').Database} db - Open SQLite connection.
 * @param {object} [options]
 * @param {string|null} [options.heroName] - Hero whose stats should be returned.
 * @param {boolean} [options.includePlayerStats=true] - Whether to aggregate player_stats totals.
 * @param {boolean} [options.includeHeroStats=true] - Whether to fetch hero specific totals.
 * @returns {{ totalHands: number, playerStatsHands: (number|null), playerStatsPlayers: (number|null), heroStatsHands: (number|null), heroName: (string|null), generatedAt: number }}
 */
function fetchUnifiedHandCounts(db, options = {}) {
  if (!db || typeof db.prepare !== 'function') {
    throw new TypeError('fetchUnifiedHandCounts requires an active database connection');
  }

  const {
    heroName: providedHeroName = null,
    includePlayerStats = true,
    includeHeroStats = true,
  } = options;

  const counts = {
    totalHands: 0,
    playerStatsHands: includePlayerStats ? 0 : null,
    playerStatsPlayers: includePlayerStats ? 0 : null,
    heroStatsHands: includeHeroStats ? null : null,
    heroName: providedHeroName ? String(providedHeroName).trim() || null : null,
    generatedAt: Date.now(),
  };

  try {
    const row = db.prepare('SELECT COUNT(*) AS count FROM hands').get();
    counts.totalHands = normalizeNumber(row?.count, 0);
  } catch (err) {
    console.warn('[hand-counts] Failed to count hands:', err?.message || err);
    counts.totalHands = 0;
  }

  if (includePlayerStats) {
    try {
      const totals = db.prepare('SELECT SUM(hands) AS total, COUNT(*) AS players FROM player_stats').get();
      counts.playerStatsHands = normalizeNumber(totals?.total, 0);
      counts.playerStatsPlayers = normalizeNumber(totals?.players, 0);
    } catch (err) {
      console.warn('[hand-counts] Failed to aggregate player_stats:', err?.message || err);
      counts.playerStatsHands = null;
      counts.playerStatsPlayers = null;
    }
  }

  if (includeHeroStats) {
    const hero = counts.heroName;
    if (hero) {
      try {
        const heroRow = db.prepare(`
          SELECT hands
          FROM player_stats
          WHERE LOWER(player) = LOWER(?)
          LIMIT 1
        `).get(hero);
        counts.heroStatsHands = heroRow ? normalizeNumber(heroRow.hands, 0) : 0;
      } catch (err) {
        console.warn('[hand-counts] Failed to load hero stats for', hero, err?.message || err);
        counts.heroStatsHands = null;
      }
    } else {
      counts.heroStatsHands = null;
    }
  }

  return counts;
}

module.exports = {
  fetchUnifiedHandCounts,
};
