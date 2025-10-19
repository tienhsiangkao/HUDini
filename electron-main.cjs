const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');
const fs = require('fs');
const fsp = require('fs/promises');
const zlib = require('zlib');
const { createRequire } = require('module');
const Database = require('better-sqlite3');
const HUDOverlayV2 = require('./hud-overlay-v2.cjs');
const {
  namesEqual,
  getHeroName,
  parseTimestamp,
  computeHeroNetFromJson,
} = require('./lib/hand_utils.cjs');
let yauzl = null;
try {
  const requireFn = createRequire(__filename);
  yauzl = requireFn('yauzl');
} catch {}
let win;
let hudOverlay;
let db;
const TEXT_EXTENSIONS = new Set(['.txt', '.log', '.hh', '.dat', '.json', '.csv', '.gz', '.zip']);
const MAX_PREVIEW_CHARS = 200;
const MAX_FOLDER_SCAN_FILES = 2000;
let parserModulePromise = null;
function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 860,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}
function openDb() {
  const dbPath = path.join(__dirname, 'hands.db');
  const d = new Database(dbPath);
  d.pragma('journal_mode = WAL');
  d.exec(`
    CREATE TABLE IF NOT EXISTS hands (
      id        TEXT PRIMARY KEY,
      dateUTC   TEXT,
      tableName TEXT,
      sb        REAL,
      bb        REAL,
      hero      TEXT,
      json      TEXT NOT NULL,
      ts        INTEGER,
      heroNet   REAL  -- NEW: net result for Hero in USD (win minus invested)
    );
    CREATE INDEX IF NOT EXISTS idx_hands_ts    ON hands(ts);
    CREATE INDEX IF NOT EXISTS idx_hands_table ON hands(tableName);
  `);
  return d;
}
const HERO_DECISION_ACTIONS = new Set(['call', 'raise', 'bet', 'fold', 'all-in', 'all_in']);
function streetActions(hand, street) {
  return (hand?.actions || []).filter((action) => action?.street === street);
}
function firstBetOnStreet(actions = []) {
  return actions.find((a) => {
    if (!a) return false;
    const type = String(a.type || '').toLowerCase();
    return type === 'bet' || type === 'all-in';
  }) || null;
}
function heroReachedShowdown(hand, heroName) {
  if (!hand) return false;
  for (const action of hand.actions || []) {
    if (!action?.player) continue;
    const type = String(action.type || '').toLowerCase();
    if ((type === 'show' || type === 'shows') && namesEqual(action.player, heroName)) {
      return true;
    }
  }
  const showed = new Set();
  for (const action of hand.actions || []) {
    if (!action?.player) continue;
    const type = String(action.type || '').toLowerCase();
    if (type.startsWith('show')) showed.add(action.player);
  }
  if (showed.size === 0) {
    for (const line of hand.summary?.seatResults || []) {
      if (typeof line !== 'string') continue;
      const match = line.match(/^Seat \d+: ([^(]+?) (?:showed|mucked)/i);
      if (match) showed.add(match[1].trim());
    }
  }
  return Array.from(showed).some((p) => namesEqual(p, heroName));
}
function computeStreetCBetMetrics(actions, heroName) {
  if (!Array.isArray(actions) || actions.length === 0) {
    return { opp: 0, made: 0, heroContinues: false };
  }
  let heroPresent = false;
  let heroFolded = false;
  let opponentsPresent = false;
  let firstAggressive = null;
  for (const action of actions) {
    if (!action?.player) continue;
    const player = action.player;
    const type = String(action.type || '').toLowerCase();
    if (namesEqual(player, heroName)) {
      heroPresent = true;
      if (type === 'fold') {
        heroFolded = true;
      }
    } else {
      opponentsPresent = true;
    }
    if (!firstAggressive && (type === 'bet' || type === 'all-in' || type === 'raise')) {
      firstAggressive = action;
    }
  }
  if (!heroPresent || !opponentsPresent) {
    return { opp: 0, made: 0, heroContinues: heroPresent && !heroFolded };
  }
  const made = firstAggressive && namesEqual(firstAggressive.player, heroName) ? 1 : 0;
  return { opp: 1, made, heroContinues: !heroFolded };
}
function computeHeroHandMetrics(hand, row = {}) {
  if (!hand) return null;
  const heroName = getHeroName(hand);
  if (!heroName) return null;
  const preferPositive = (...values) => {
    for (const value of values) {
      const num = Number(value);
      if (Number.isFinite(num) && num > 0) return num;
    }
    return 0;
  };
  const findPost = (target) => {
    const lower = String(target || '').toLowerCase();
    return (hand.actions || []).find((action) => {
      if (!action) return false;
      if (String(action.type || '').toLowerCase() !== 'posts') return false;
      return String(action.postType || '').toLowerCase().includes(lower);
    }) || null;
  };
  const bigBlindPost = findPost('big blind');
  const smallBlindPost = findPost('small blind');
  const sbValue = preferPositive(
    row.sb,
    hand.stakes?.sb,
    hand.sb,
    smallBlindPost?.amount,
    bigBlindPost?.amount ? bigBlindPost.amount / 2 : undefined
  );
  const bbValue = preferPositive(
    row.bb,
    hand.stakes?.bb,
    hand.bb,
    bigBlindPost?.amount,
    smallBlindPost?.amount ? smallBlindPost.amount * 2 : undefined
  );
  const tableName = row?.tableName ?? hand.table?.name ?? hand.tableName ?? null;
  const normalizedTable = String(tableName || '').toLowerCase();
  const isRedEnvelope = normalizedTable.includes('red envelope') || normalizedTable.includes('redenvelope') || normalizedTable.includes('红包');
  const formatStakePart = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return '0';
    const abs = Math.abs(num);
    let decimals;
    if (abs >= 10) {
      decimals = 0;
    } else if (abs >= 1) {
      decimals = 2;
    } else if (abs >= 0.1) {
      decimals = 2;
    } else if (abs >= 0.01) {
      decimals = 2;
    } else {
      decimals = 4;
    }
    const fixed = num.toFixed(decimals);
    if (decimals === 0) return fixed;
    return fixed.replace(/(\.\d*?[1-9])0+$/, '$1').replace(/\.0+$/, '');
  };
  let stakeKey;
  let stakeLabel;
  if (isRedEnvelope) {
    stakeKey = 'special:red-envelope';
    stakeLabel = 'Red Envelope';
  } else if (bbValue > 0) {
    const sbForLabel = sbValue > 0 ? sbValue : bbValue / 2;
    stakeKey = `${sbForLabel.toFixed(2)}/${bbValue.toFixed(2)}`;
    stakeLabel = `${formatStakePart(sbForLabel)} / ${formatStakePart(bbValue)}`;
  } else {
    stakeKey = 'special:unknown';
    stakeLabel = 'Unknown Stake';
  }
  const netUSD = typeof row.heroNet === 'number' ? row.heroNet : computeHeroNetFromJson(hand);
  const dateUTCValueRaw = row?.dateUTC ?? hand?.dateUTC ?? hand?.header?.dateUTC ?? null;
  const tsValueRaw = Number.isFinite(row?.ts) ? Number(row.ts) : null;
  const tsParsed = tsValueRaw ?? parseTimestamp(row?.ts) ?? parseTimestamp(row?.dateUTC) ?? parseTimestamp(hand?.ts) ?? parseTimestamp(hand?.dateUTC) ?? parseTimestamp(hand?.header?.dateUTC);
  const tsValue = Number.isFinite(tsParsed) ? tsParsed : null;
  const netBB = bbValue > 0 ? netUSD / bbValue : 0;
  const showdown = heroReachedShowdown(hand, heroName);
  const showdownUSD = showdown ? netUSD : 0;
  const nonShowdownUSD = showdown ? 0 : netUSD;
  const showdownBB = showdown ? netBB : 0;
  const nonShowdownBB = showdown ? 0 : netBB;
  const pre = streetActions(hand, 'preflop');
  const firstRaiseAction = pre.find((a) => String(a?.type || '').toLowerCase() === 'raise');
  const firstRaiser = firstRaiseAction?.player || null;
  let raisesSeen = 0;
  let heroThreeBetOpp = 0;
  let heroThreeBet = 0;
  let heroThreeBetRecorded = false;
  for (const action of pre) {
    if (!action?.player) continue;
    const player = action.player;
    const type = String(action.type || '').toLowerCase();
    const raisesBefore = raisesSeen;
    if (namesEqual(player, heroName) &&
        HERO_DECISION_ACTIONS.has(type) &&
        raisesBefore === 1 &&
        firstRaiser &&
        !namesEqual(firstRaiser, heroName) &&
        !heroThreeBetRecorded) {
      heroThreeBetOpp++;
      if (type === 'raise') heroThreeBet++;
      heroThreeBetRecorded = true;
    }
    if (type === 'return' || type === 'uncalled' || type === 'show') {
      continue;
    }
    if (type === 'call' || type === 'fold') {
      continue;
    }
    if (type === 'raise') {
      raisesSeen++;
    }
  }
  const heroPreActions = pre.filter((a) => a?.player && namesEqual(a.player, heroName));
  const heroDecisionActions = heroPreActions.filter((a) => HERO_DECISION_ACTIONS.has(String(a?.type || '').toLowerCase()));
  const heroHadDecision = heroDecisionActions.length > 0;
  const heroVpip = heroDecisionActions.some((a) => {
    const t = String(a?.type || '').toLowerCase();
    return t === 'call' || t === 'raise' || t === 'bet';
  }) ? 1 : 0;
  const heroPfr = heroDecisionActions.some((a) => String(a?.type || '').toLowerCase() === 'raise') ? 1 : 0;
  const heroSawFlop = (hand.actions || []).some((a) => a?.player && namesEqual(a.player, heroName) && a.street === 'flop');
  const heroWon = Array.isArray(hand.summary?.winners)
    ? hand.summary.winners.some((w) => namesEqual(w.player, heroName))
    : false;
  const heroIsAggressor = firstRaiser && namesEqual(firstRaiser, heroName);
  const flopMetrics = computeStreetCBetMetrics(streetActions(hand, 'flop'), heroName);
  const heroOnFlop = heroIsAggressor ? flopMetrics : { opp: 0, made: 0, heroContinues: false };
  const turnMetrics = computeStreetCBetMetrics(streetActions(hand, 'turn'), heroName);
  const heroOnTurn = heroIsAggressor && heroOnFlop.heroContinues ? turnMetrics : { opp: 0, made: 0, heroContinues: false };
  const riverMetrics = computeStreetCBetMetrics(streetActions(hand, 'river'), heroName);
  const heroOnRiver = heroIsAggressor && heroOnFlop.heroContinues && heroOnTurn.heroContinues ? riverMetrics : { opp: 0, made: 0, heroContinues: false };
  let heroInvested = 0;
  const contributions = new Map();
  for (const action of hand.actions || []) {
    if (!action?.player) continue;
    const contribution = Number(action.contribution);
    if (Number.isFinite(contribution) && contribution !== 0) {
      const prev = contributions.get(action.player) || 0;
      contributions.set(action.player, prev + contribution);
    }
    if (!namesEqual(action.player, heroName)) continue;
    if (typeof action.contribution === 'number' && Number.isFinite(action.contribution)) {
      if (action.contribution > 0) heroInvested += action.contribution;
      continue;
    }
    const amt = Number(action.amount);
    if (!Number.isFinite(amt) || amt <= 0) continue;
    const type = String(action.type || '').toLowerCase();
    if (type === 'return') {
      heroInvested -= amt;
    } else if (type === 'raise' && Number.isFinite(action.raiseFrom)) {
      heroInvested += Math.max(0, amt - Number(action.raiseFrom));
    } else if (['posts', 'bet', 'call', 'all-in', 'raise'].includes(type)) {
      heroInvested += amt;
    }
  }
  let positiveInvested = 0;
  for (const value of contributions.values()) {
    if (value > 0) positiveInvested += value;
  }
  const heroContribution = Math.max(0, Number(contributions.get(heroName) || heroInvested || 0));
  let heroShare = positiveInvested > 0 ? heroContribution / positiveInvested : 0;
  if (!Number.isFinite(heroShare) || heroShare < 0) heroShare = 0;
  if (heroShare > 1) heroShare = 1;
  const totalRake = Number(hand?.summary?.rake ?? 0);
  const extras = hand?.summary?.extras || {};
  const heroRake = totalRake * heroShare;
  const heroExtras = {};
  let extrasOther = 0;
  for (const key of Object.keys(extras)) {
    const value = Number(extras[key] || 0);
    const share = value * heroShare;
    heroExtras[key] = share;
    if (key !== 'jackpot') extrasOther += share;
  }
  const heroJackpot = heroExtras.jackpot ?? 0;
  const heroExtrasOther = extrasOther;
  const heroRakeTotal = heroRake + heroJackpot + heroExtrasOther;
  const heroPreRakeUSD = netUSD + heroRakeTotal;
  const heroPreRakeBB = bbValue > 0 ? heroPreRakeUSD / bbValue : 0;
  const heroRakeBB = bbValue > 0 ? heroRake / bbValue : 0;
  const heroRakeTotalBB = bbValue > 0 ? heroRakeTotal / bbValue : 0;
  const position = hand.positions?.[heroName] || null;
  return {
    heroName,
    sb: sbValue,
    bb: bbValue,
    stakeKey,
    stakeLabel,
    stakeSort: bbValue > 0 ? bbValue : 0,
    position,
    netUSD,
    netBB,
    showdown,
    showdownUSD,
    showdownBB,
    nonShowdownUSD,
    nonShowdownBB,
    threeBetOpp: heroThreeBetOpp,
    threeBet: heroThreeBet,
    cbetF_opp: heroIsAggressor ? heroOnFlop.opp : 0,
    cbetF: heroIsAggressor ? heroOnFlop.made : 0,
    cbetT_opp: heroIsAggressor ? (heroOnFlop.heroContinues ? heroOnTurn.opp : 0) : 0,
    cbetT: heroIsAggressor ? (heroOnFlop.heroContinues ? heroOnTurn.made : 0) : 0,
    cbetR_opp: heroIsAggressor ? (heroOnFlop.heroContinues && heroOnTurn.heroContinues ? heroOnRiver.opp : 0) : 0,
    cbetR: heroIsAggressor ? (heroOnFlop.heroContinues && heroOnTurn.heroContinues ? heroOnRiver.made : 0) : 0,
    heroRake,
    heroJackpot,
    heroExtrasOther,
    heroRakeTotal,
    heroPreRakeUSD,
    heroPreRakeBB,
    heroRakeBB,
    heroRakeTotalBB,
    vpip: heroVpip,
    vpipOpp: heroHadDecision ? 1 : 0,
    pfr: heroPfr,
    pfrOpp: heroHadDecision ? 1 : 0,
    wtsd: showdown ? 1 : 0,
    wtsdOpp: heroSawFlop ? 1 : 0,
    wwsf: heroSawFlop && heroWon ? 1 : 0,
    wwsfOpp: heroSawFlop ? 1 : 0,
    bbValue,
    ts: tsValue,
    dateUTC: dateUTCValueRaw ?? (tsValue ? new Date(tsValue).toISOString() : null),
    id: row?.id ?? hand.id,
    tableName,
  };
}

function fetchHandsForMetrics(database) {
  return database.prepare(`
    SELECT id, json, sb, bb, ts, heroNet, dateUTC, tableName
    FROM hands
    ORDER BY ts ASC NULLS LAST, rowid ASC
  `).all();
}

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
  } catch {
    return null;
  }
}
function formatHexSample(buffer, bytes = 32) {
  const slice = buffer.subarray(0, Math.min(bytes, buffer.length));
  return Array.from(slice).map((b) => b.toString(16).padStart(2, '0')).join(' ');
}
function isGzipBuffer(buffer) {
  return buffer && buffer.length >= 2 && buffer[0] === 0x1f && buffer[1] === 0x8b;
}
function detectEncoding(buffer) {
  if (!buffer || buffer.length < 2) return 'utf-8';
  if (buffer[0] === 0xfe && buffer[1] === 0xff) return 'utf-16be';
  if (buffer[0] === 0xff && buffer[1] === 0xfe) return 'utf-16le';
  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) return 'utf-8';
  return 'utf-8';
}
function decodeBuffer(buffer, encoding) {
  if (!buffer) return '';
  const enc = encoding === 'utf-16le' ? 'utf16le' : encoding === 'utf-16be' ? 'utf16be' : 'utf8';
  try {
    let text = buffer.toString(enc);
    if (text.startsWith('\ufeff')) text = text.slice(1);
    return text;
  } catch {
    try {
      let text = buffer.toString('utf8');
      if (text.startsWith('\ufeff')) text = text.slice(1);
      return text;
    } catch {
      return '';
    }
  }
}
function normalisePreview(text, maxLen = MAX_PREVIEW_CHARS) {
  if (!text) return '';
  return text.replace(/\s+/g, ' ').trim().slice(0, maxLen);
}
function detectRoom(text) {
  if (!text) return 'unknown';
  if (/Poker Hand\s+#/i.test(text)) return 'GG/PokerStars format';
  if (/PokerStars Hand #/i.test(text)) return 'PokerStars';
  if (/Ignition Hand #/i.test(text)) return 'Ignition/Bovada';
  if (/PartyPoker Hand #/i.test(text)) return 'PartyPoker';
  if (/Bovada Hand #/i.test(text)) return 'Bovada';
  if (/Rush ?& ?Cash/i.test(text)) return 'GG Rush & Cash';
  return 'unknown';
}
async function loadParserModule() {
  if (!parserModulePromise) {
    const url = pathToFileURL(path.join(__dirname, 'parser_starter.js')).href;
    parserModulePromise = import(url).catch((err) => {
      parserModulePromise = null;
      throw err;
    });
  }
  return parserModulePromise;
}
async function inspectZip(filePath, buffer, options) {
  if (!yauzl) {
    return {
      ok: false,
      path: filePath,
      sizeBytes: buffer.length,
      hexFirst: formatHexSample(buffer),
      gzipped: false,
      encoding: 'zip',
      decodedLen: 0,
      room: 'zip',
      decPreview: '',
      hands: 0,
      blank: false,
      parseError: "ZIP support requires the 'yauzl' package (npm install yauzl)",
    };
  }
  const { parseHands = true, maxPreview = MAX_PREVIEW_CHARS } = options || {};
  return new Promise((resolve) => {
    yauzl.fromBuffer(buffer, { lazyEntries: true }, async (err, zip) => {
      if (err || !zip) {
        return resolve({
          ok: false,
          path: filePath,
          sizeBytes: buffer.length,
          hexFirst: formatHexSample(buffer),
          gzipped: false,
          encoding: 'zip',
          decodedLen: 0,
          room: 'zip',
          decPreview: '',
          hands: 0,
          blank: false,
          parseError: err?.message || String(err || 'open zip failed'),
        });
      }
      let parseError = null;
      let parseHandsFn = null;
      if (parseHands) {
        try {
          const mod = await loadParserModule();
          const fn = mod?.parseHandsText || mod?.default?.parseHandsText;
          if (typeof fn === 'function') parseHandsFn = fn;
          else parseError = 'parseHandsText() missing';
        } catch (e) {
          parseError = e?.message || String(e);
        }
      }
      const entryPreviews = [];
      let aggregatedText = '';
      let totalHands = 0;
      const MAX_BYTES = 1_500_000;
      const collectEntry = (entry, text) => {
        entryPreviews.push({
          name: entry.fileName,
          size: entry.uncompressedSize,
          preview: normalisePreview(text, maxPreview),
        });
        if (aggregatedText.length < MAX_BYTES) {
          aggregatedText += text.slice(0, MAX_BYTES - aggregatedText.length);
        }
      };
      const finish = async () => {
        let room = 'unknown';
        if (aggregatedText) {
          room = detectRoom(aggregatedText);
        }
        resolve({
          ok: true,
          path: filePath,
          sizeBytes: buffer.length,
          hexFirst: formatHexSample(buffer),
          gzipped: false,
          encoding: 'zip',
          decodedLen: aggregatedText.length,
          room,
          decPreview: normalisePreview(aggregatedText, maxPreview),
          hands: parseHandsFn ? totalHands : 0,
          blank: !aggregatedText.trim().length,
          parseError,
          zipEntries: entryPreviews,
        });
      };
      const handleEntry = (entry) => {
        if (/\/$/.test(entry.fileName)) { zip.readEntry(); return; }
        const ext = path.extname(entry.fileName).toLowerCase();
        if (!['.txt', '.log', '.hh'].includes(ext)) { zip.readEntry(); return; }
        zip.openReadStream(entry, (err2, stream) => {
          if (err2 || !stream) { zip.readEntry(); return; }
          const chunks = [];
          stream.on('data', (c) => chunks.push(c));
          stream.on('end', () => {
            const text = Buffer.concat(chunks).toString('utf8');
            collectEntry(entry, text);
            if (parseHandsFn) {
              try {
                const arr = parseHandsFn(text) || [];
                totalHands += Array.isArray(arr) ? arr.length : 0;
              } catch (entryErr) {
                parseError = parseError || entryErr?.message || String(entryErr);
              }
            }
            zip.readEntry();
          });
        });
      };
      zip.on('entry', handleEntry);
      zip.on('end', () => finish());
      zip.on('error', (zipErr) => {
        resolve({
          ok: false,
          path: filePath,
          sizeBytes: buffer.length,
          hexFirst: formatHexSample(buffer),
          gzipped: false,
          encoding: 'zip',
          decodedLen: 0,
          room: 'zip',
          decPreview: '',
          hands: 0,
          blank: false,
          parseError: zipErr?.message || String(zipErr),
        });
      });
      zip.readEntry();
    });
  });
}
async function inspectFile(filePath, options = {}) {
  const { parseHands = true, maxPreview = MAX_PREVIEW_CHARS } = options;
  const buffer = await fsp.readFile(filePath);
  const sizeBytes = buffer.length;
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.zip') {
    return inspectZip(filePath, buffer, { parseHands, maxPreview });
  }
  const gzipped = isGzipBuffer(buffer);
  let decodedBuffer = buffer;
  let gzError = null;
  if (gzipped) {
    try {
      decodedBuffer = zlib.gunzipSync(buffer);
    } catch (err) {
      gzError = err?.message || String(err);
      decodedBuffer = Buffer.alloc(0);
    }
  }
  const encoding = detectEncoding(decodedBuffer);
  const text = decodeBuffer(decodedBuffer, encoding);
  const decodedLen = text.length;
  const blank = !text.trim().length;
  const decPreview = normalisePreview(text, maxPreview);
  let hands = null;
  let parseError = null;
  if (parseHands && text) {
    try {
      const mod = await loadParserModule();
      const parseHandsText = mod?.parseHandsText || mod?.default?.parseHandsText;
      if (typeof parseHandsText === 'function') {
        const arr = parseHandsText(text) || [];
        hands = Array.isArray(arr) ? arr.length : 0;
      } else {
        parseError = 'parseHandsText() missing';
        hands = 0;
      }
    } catch (err) {
      parseError = err?.message || String(err);
      hands = 0;
    }
  }
  return {
    ok: true,
    path: filePath,
    sizeBytes,
    hexFirst: formatHexSample(buffer),
    gzipped,
    gzError,
    encoding,
    decodedLen,
    room: detectRoom(text),
    decPreview,
    hands,
    blank,
    parseError,
  };
}
async function scanFolder(rootPath, options = {}) {
  const { sampleLimit = 5, inspectLimit = 200 } = options;
  const result = {
    ok: true,
    root: rootPath,
    totalFiles: 0,
    zeroByte: 0,
    blankText: 0,
    gzCount: 0,
    textLike: 0,
    samples: [],
  };
  const stack = [rootPath];
  let inspected = 0;
  while (stack.length) {
    const current = stack.pop();
    let entries;
    try {
      entries = await fsp.readdir(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
        continue;
      }
      if (!entry.isFile()) continue;
      result.totalFiles++;
      let stats;
      try {
        stats = await fsp.stat(full);
      } catch {
        continue;
      }
      if (stats.size === 0) result.zeroByte++;
      const ext = path.extname(entry.name).toLowerCase();
      const textLikely = TEXT_EXTENSIONS.has(ext);
      if (textLikely) result.textLike++;
      if (textLikely && inspected < inspectLimit) {
        inspected++;
        try {
          const detail = await inspectFile(full, { parseHands: false, maxPreview: 160 });
          if (detail.gzipped) result.gzCount++;
          if (detail.blank) result.blankText++;
          if (result.samples.length < sampleLimit) {
            result.samples.push({
              path: path.relative(rootPath, full) || entry.name,
              encoding: detail.encoding,
              gzipped: !!detail.gzipped,
              room: detail.room,
              preview: detail.decPreview,
            });
          }
        } catch (err) {
          if (result.samples.length < sampleLimit) {
            result.samples.push({
              path: path.relative(rootPath, full) || entry.name,
              error: err?.message || String(err),
            });
          }
        }
      } else if (ext === '.gz') {
        result.gzCount++;
      }
      if (result.totalFiles >= MAX_FOLDER_SCAN_FILES) {
        result.note = `Stopped after ${MAX_FOLDER_SCAN_FILES} files (limit).`;
        return result;
      }
    }
  }
  if (inspected >= inspectLimit) {
    result.note = `Inspected first ${inspectLimit} text-like files (limit).`;
  }
  return result;
}
async function rebuildPlayerStats() {
  const url = pathToFileURL(path.join(__dirname, 'db_build_stats.js')).href;
  const mod = await import(url);
  if (typeof mod.buildStats !== 'function') throw new Error('buildStats() not exported');
  if (!db) throw new Error('database not initialized');
  const res = await mod.buildStats({ db });
  if (!res || res.ok !== true) throw new Error(res?.error || 'player stats rebuild failed');
  return res;
}
function registerIpcHandlers() {
  // Stats list
  ipcMain.handle('stats:list', (e, options = {}) => {
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
    params.push(Math.max(1, Math.min(Number(limit) || 500, 5000)));
    params.push(Math.max(0, Number(offset) || 0));
    try {
      const stmt = db.prepare(sql);
      const parseJson = (value) => {
        if (!value) return {};
        if (typeof value === 'object') return value || {};
        try {
          return JSON.parse(value);
        } catch {
          return {};
        }
      };
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
      } catch {
        return rows;
      }
    } catch {
      return [];
    }
  });
  ipcMain.handle('stats:heroName', () => fetchLatestHeroName(db));
  ipcMain.handle('stats:heroBreakdown', (_event, options = {}) => {
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
    const parseJson = (value) => {
      if (!value) return {};
      if (typeof value === 'object') return value || {};
      try {
        return JSON.parse(value);
      } catch {
        return {};
      }
    };
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
      } catch {
        heroStats = null;
      }
    }
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
      processed++;
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
    const toPct = (value, denom) => (denom ? (value / denom) * 100 : 0);
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
  });
  // Hands list
  ipcMain.handle('hands:list', (e, options = {}) => {
    const {
      q = '',
      limit = 300,
      result = 'all',
      minBB,
      maxBB,
      from,
      to,
      stake,
      sortField = 'date',
      sortDir = 'desc',
    } = options || {};
    try {
      const clauses = [];
      const params = [];
      let sql = `
        SELECT id as handId, dateUTC, tableName, sb, bb, heroNet, ts, json
        FROM hands
      `;
      if (q) {
        clauses.push('(tableName LIKE ? OR id LIKE ? OR json LIKE ?)');
        const like = `%${q}%`;
        params.push(like, like, like);
      }
      if (result === 'won') {
        clauses.push('heroNet > 0.005');
      } else if (result === 'lost') {
        clauses.push('heroNet < -0.005');
      } else if (result === 'breakeven') {
        clauses.push('ABS(heroNet) <= 0.005');
      }
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
      if (clauses.length) {
        sql += ' WHERE ' + clauses.join(' AND ');
      }
      const sortMap = {
        date: 'ts',
        net: 'heroNet',
        stakes: 'bb',
        table: 'tableName',
        id: 'id',
      };
      const column = sortMap[String(sortField)] || 'ts';
      const direction = String(sortDir).toLowerCase() === 'asc' ? 'ASC' : 'DESC';
      const orderParts = [`${column} ${direction}`];
      if (column !== 'ts') {
        orderParts.push('ts DESC NULLS FIRST', 'rowid DESC');
      } else {
        orderParts.push('rowid DESC');
      }
      sql += ' ORDER BY ' + orderParts.join(', ') + ' LIMIT ?';
      const safeLimit = Math.max(1, Math.min(Number(limit) || 250, 1000));
      params.push(safeLimit);
      const stmt = db.prepare(sql);
      const rows = stmt.all(...params);
      return rows.map((row) => {
        const out = {
          handId: row.handId,
          dateUTC: row.dateUTC,
          tableName: row.tableName,
          sb: row.sb,
          bb: row.bb,
          heroNet: row.heroNet,
          ts: row.ts,
        };
        if (row.json) {
          try {
            const hand = JSON.parse(row.json);
            const metrics = computeHeroHandMetrics(hand, row);
            if (metrics) {
              out.heroRake = typeof metrics.heroRake === 'number' ? metrics.heroRake : null;
              out.stakeLabel = metrics.stakeLabel || null;
              if (Number.isFinite(metrics.sb)) out.sb = metrics.sb;
              if (Number.isFinite(metrics.bb)) out.bb = metrics.bb;
            } else {
              out.heroRake = null;
            }
          } catch {
            out.heroRake = null;
          }
        } else {
          out.heroRake = null;
        }
        return out;
      });
    } catch { return []; }
  });
  // Single hand
  ipcMain.handle('hands:get', (e, handId) => {
    const row = db.prepare(`SELECT json FROM hands WHERE id = ?`).get(handId);
    if (!row) return null;
    try { return JSON.parse(row.json); } catch { return null; }
  });
  // Graph data - use heroNet if present; otherwise compute on the fly
  ipcMain.handle('hero:graphData', (_event, options = {}) => {
    const {
      limit = 2000,
      stakes,
      positions,
      showdown = 'all',
      result = 'all',
      from,
      to,
      order = 'recent',
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
    }
    const timeline = []
    let cumUSD = 0
    let cumBB = 0
    let cumShowdownUSD = 0
    let cumNonShowdownUSD = 0
    let cumShowdownBB = 0
    let cumNonShowdownBB = 0
    let cumPreRakeUSD = 0
    let cumPreRakeBB = 0
    let cumRakeUSD = 0
    let cumTotalRakeUSD = 0
    let cumTotalRakeBB = 0
    const round2 = (value) => Math.round(value * 100) / 100

    selected.forEach((metrics, idx) => {
      const netUSDRaw = metrics.netUSD ?? 0
      const netBBRaw = metrics.netBB ?? 0
      const showdownUSDRaw = metrics.showdownUSD ?? 0
      const nonShowdownUSDRaw = metrics.nonShowdownUSD ?? 0
      const showdownBBRaw = metrics.showdownBB ?? 0
      const nonShowdownBBRaw = metrics.nonShowdownBB ?? 0
      const rakeUSDRaw = metrics.heroRake ?? 0
      const jackpotUSDRaw = metrics.heroJackpot ?? 0
      const rakeTotalUSDRaw = metrics.heroRakeTotal ?? (rakeUSDRaw + jackpotUSDRaw + (metrics.heroExtrasOther ?? 0))
      const preRakeUSDRaw = metrics.heroPreRakeUSD ?? (netUSDRaw + rakeTotalUSDRaw)
      const preRakeBBRaw = metrics.heroPreRakeBB ?? (metrics.bbValue > 0 ? preRakeUSDRaw / metrics.bbValue : 0)
      const totalRakeBBRaw = metrics.heroRakeTotalBB ?? (metrics.bbValue > 0 ? rakeTotalUSDRaw / metrics.bbValue : 0)

      cumUSD += netUSDRaw
      cumBB += netBBRaw
      cumShowdownUSD += showdownUSDRaw
      cumNonShowdownUSD += nonShowdownUSDRaw
      cumShowdownBB += showdownBBRaw
      cumNonShowdownBB += nonShowdownBBRaw
      cumPreRakeUSD += preRakeUSDRaw
      cumPreRakeBB += preRakeBBRaw
      cumRakeUSD += rakeUSDRaw
      cumTotalRakeUSD += rakeTotalUSDRaw
      cumTotalRakeBB += totalRakeBBRaw

      timeline.push({
        index: idx + 1,
        handId: metrics.id,
        tableName: metrics.tableName,
        stake: metrics.stakeKey,
        stakeLabel: metrics.stakeLabel,
        position: metrics.position || "Unknown",
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
      })
    })
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
  });
  // Rebuild stats - dynamically import ESM module with file:// URL
  ipcMain.handle('stats:rebuild', async () => rebuildPlayerStats());
  // Importer (choose folders)
  ipcMain.handle('import:chooseFolders', async () => {
    const res = await dialog.showOpenDialog(BrowserWindow.getFocusedWindow() || win, {
      properties: ['openDirectory', 'multiSelections']
    });
    if (res.canceled) return [];
    return res.filePaths || [];
  });
  ipcMain.handle('hands:stakes', () => {
    try {
      const stmt = db.prepare(`
        SELECT DISTINCT sb, bb
        FROM hands
        WHERE sb IS NOT NULL AND bb IS NOT NULL AND bb > 0
        ORDER BY bb ASC, sb ASC
        LIMIT 200
      `);
      const formatStakeLabel = (sb, bb) => {
        const formatPart = (value) => {
          const num = Number(value);
          if (!Number.isFinite(num)) return '0';
          const abs = Math.abs(num);
          let decimals;
          if (abs >= 10) {
            decimals = 0;
          } else if (abs >= 1) {
            decimals = 2;
          } else if (abs >= 0.1) {
            decimals = 2;
          } else if (abs >= 0.01) {
            decimals = 2;
          } else {
            decimals = 4;
          }
          const fixed = num.toFixed(decimals);
          if (decimals === 0) return fixed;
          return fixed.replace(/(\.\d*?[1-9])0+$/, '$1').replace(/\.0+$/, '');
        };
        return `${formatPart(sb)} / ${formatPart(bb)}`;
      };
      return stmt.all().map((row) => {
        const sb = Number(row.sb);
        const bb = Number(row.bb);
        return {
          sb,
          bb,
          label: formatStakeLabel(sb, bb),
          value: `${sb}/${bb}`,
        };
      });
    } catch {
      return [];
    }
  });
  // Importer (start) - ESM import via file:// URL, forward progress events
  ipcMain.handle('import:start', async (e, folders, opts = {}) => {
    try {
      const url = pathToFileURL(path.join(__dirname, 'db_import.js')).href;
      const mod = await import(url);
      const onProgress = (payload) => {
        const w = win || BrowserWindow.getFocusedWindow();
        if (!w) return;
        if (typeof payload === 'string') {
          w.webContents.send('import:progress', { line: payload });
          return;
        }
        if (payload && typeof payload === 'object') {
          const detail = { ...payload };
          if (detail.line == null && payload.message != null) detail.line = String(payload.message);
          w.webContents.send('import:progress', detail);
          return;
        }
        w.webContents.send('import:progress', { line: String(payload ?? '') });
      };
      const res = await mod.runImport(folders, onProgress, { ...opts, db });
      const targetWin = win || BrowserWindow.getFocusedWindow();
      let statsRes = null;
      try {
        if (targetWin) targetWin.webContents.send('import:progress', { line: 'Rebuilding player stats...' });
        statsRes = await rebuildPlayerStats();
        const playersStr = (statsRes && typeof statsRes.players === 'number') ? statsRes.players : '?';
        const handsStr = (statsRes && typeof statsRes.hands === 'number') ? statsRes.hands : '?';
        if (targetWin) targetWin.webContents.send('import:progress', { line: `Player stats rebuilt (${playersStr} players / ${handsStr} hands)` });
      } catch (statsErr) {
        if (targetWin) targetWin.webContents.send('import:progress', { line: `[ERR] stats rebuild: ${statsErr?.message || statsErr}` });
      }
      if (targetWin) targetWin.webContents.send('import:done', { ok: true, code: 0, stats: statsRes });
      return { ok: true, ...res, code: 0, stats: statsRes };
    } catch (err) {
      const w = win || BrowserWindow.getFocusedWindow();
      if (w) {
        w.webContents.send('import:progress', { line: `[ERR] ${err?.message || err}` });
        w.webContents.send('import:done', { ok: false, code: 1 });
      }
      return { ok: false, code: 1, error: String(err) };
    }
  });
  ipcMain.handle('filetester:choose', async () => {
    const res = await dialog.showOpenDialog(win || BrowserWindow.getFocusedWindow(), {
      properties: ['openFile']
    });
    if (res.canceled) return null;
    return res.filePaths?.[0] || null;
  });
  ipcMain.handle('filetester:test', async (_event, filePath) => {
    if (!filePath) return { error: 'No file path provided' };
    try {
      return await inspectFile(filePath, { parseHands: true });
    } catch (err) {
      return { error: err?.message || String(err) };
    }
  });
  ipcMain.handle('foldertester:choose', async () => {
    const res = await dialog.showOpenDialog(win || BrowserWindow.getFocusedWindow(), {
      properties: ['openDirectory']
    });
    if (res.canceled) return null;
    return res.filePaths?.[0] || null;
  });
  ipcMain.handle('foldertester:scan', async (_event, dirPath) => {
    if (!dirPath) return { ok: false, error: 'No folder provided' };
    try {
      return await scanFolder(dirPath, {});
    } catch (err) {
      return { ok: false, error: err?.message || String(err) };
    }
  });

  // HUD Overlay IPC handlers
  ipcMain.handle('hud:start', async () => {
    try {
      console.log('HUD start requested');
      if (hudOverlay) {
        await hudOverlay.startHUD();
        console.log('HUD started successfully');
        return { success: true };
      }
      console.error('HUD overlay not initialized');
      return { success: false, error: 'HUD overlay not initialized' };
    } catch (error) {
      console.error('HUD start error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('hud:stop', async () => {
    try {
      if (hudOverlay) {
        hudOverlay.stopHUD();
        return { success: true };
      }
      return { success: false, error: 'HUD overlay not initialized' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('hud:toggle', async () => {
    try {
      console.log('HUD toggle requested');
      if (hudOverlay) {
        hudOverlay.toggleHUD();
        console.log('HUD toggled, active:', hudOverlay.isActive);
        return { success: true, active: hudOverlay.isActive };
      }
      console.error('HUD overlay not initialized');
      return { success: false, error: 'HUD overlay not initialized' };
    } catch (error) {
      console.error('HUD toggle error:', error);
      return { success: false, error: error.message };
    }
  });

ipcMain.handle('hud:status', async () => {
  try {
    if (hudOverlay) {
      return { 
        success: true, 
        active: hudOverlay.isActive,
        tables: hudOverlay.overlayWindows.size 
      };
    }
    return { success: false, error: 'HUD overlay not initialized' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.on('hud:insight', (_event, payload) => {
  try {
    if (hudOverlay && typeof hudOverlay.updateInsights === 'function') {
      hudOverlay.updateInsights(payload || null);
    }
  } catch (error) {
    console.error('HUD insight update failed:', error);
  }
});

// Snap to table handler
ipcMain.on('hud:snap-to-table', () => {
  try {
    if (hudOverlay) {
      hudOverlay.snapToTable();
    }
  } catch (error) {
    console.error('Error snapping to table:', error);
  }
});
}
app.whenReady().then(() => {
  db = openDb();
  registerIpcHandlers();
  createWindow();
  
        // Initialize HUD overlay system v2
        hudOverlay = new HUDOverlayV2();
  
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
