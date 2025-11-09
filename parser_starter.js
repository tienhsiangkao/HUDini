// parser_starter.js (ESM)
// Enhanced GG / PokerStars-style parser with action capture.

function normalize(s) {
  return s.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function splitHands(text) {
  return text
    .split(/(?=^Poker Hand\s+#)/gm)
    .map((chunk) => chunk.trim())
    .filter(Boolean);
}

function n(x) {
  const cleaned = typeof x === 'string' ? x.replace(/[^0-9.]/g, '') : x;
  const v = Number(cleaned);
  return Number.isFinite(v) ? v : null;
}

function i(x) {
  const v = parseInt(x, 10);
  return Number.isFinite(v) ? v : null;
}

function round2(x) {
  return Math.round((Number(x) + Number.EPSILON) * 100) / 100;
}

const MONEY_RE = /\$?([0-9]+(?:\.[0-9]+)?)/;
const DEALT_RE = /^Dealt to\s+(.+?)\s+\[([^\]]+)]/i;
const ACTION_PLAYER_RE = /^([^:]+):\s*(.+)$/;

function qualifyPositions(players, buttonSeat) {
  const ordered = [...players].sort((a, b) => (a.seat ?? 0) - (b.seat ?? 0));
  if (!ordered.length) return {};

  let startIdx = 0;
  if (buttonSeat != null) {
    const idx = ordered.findIndex((p) => p.seat === buttonSeat);
    if (idx >= 0) startIdx = idx;
  }

  const rotated = [];
  for (let i = 0; i < ordered.length; i++) {
    rotated.push(ordered[(startIdx + i) % ordered.length]);
  }

  const labelsByCount = {
    2: ['BTN', 'BB'],
    3: ['BTN', 'SB', 'BB'],
    4: ['BTN', 'SB', 'BB', 'UTG'],
    5: ['BTN', 'SB', 'BB', 'UTG', 'CO'],
    6: ['BTN', 'SB', 'BB', 'UTG', 'MP', 'CO'],
    7: ['BTN', 'SB', 'BB', 'UTG', 'UTG+1', 'HJ', 'CO'],
    8: ['BTN', 'SB', 'BB', 'UTG', 'UTG+1', 'MP', 'HJ', 'CO'],
    9: ['BTN', 'SB', 'BB', 'UTG', 'UTG+1', 'UTG+2', 'LJ', 'HJ', 'CO'],
  };
  const labels = labelsByCount[ordered.length] || ['BTN', 'SB', 'BB'];

  const positions = {};
  rotated.forEach((player, idx) => {
    const label = labels[idx] || `P${idx}`;
    positions[player.name] = label;
    player.position = label;
  });
  return positions;
}

function camelKey(label) {
  const cleaned = label.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  if (!cleaned) return label.trim();
  return cleaned.split(' ').map((part, idx) => idx === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)).join('');
}

function parseActionsAndSummary(lines) {
  const actions = [];
  const holeCards = new Map();

  const winners = [];
  const extras = {};
  const seatResults = [];
  let totalPot = null;
  let rake = 0;

  let inSummary = false;
  let street = 'preflop';
  let commit = new Map();
  let highest = 0;

  const resetStreet = (name) => {
    street = name;
    commit = new Map();
    highest = 0;
  };

  const getCommit = (player) => commit.get(player) || 0;
  const setCommit = (player, amount) => commit.set(player, round2(Math.max(0, amount)));

  const pushAction = (action) => {
    if (action && action.player && typeof action.contribution === 'number' && !Number.isNaN(action.contribution)) {
      const prev = getCommit(action.player);
      const next = round2(prev + action.contribution);
      setCommit(action.player, next);
      if (action.type === 'return') {
        // already handled via negative contribution
      } else if (['bet', 'raise', 'call', 'posts', 'all-in', 'post'].includes(action.type)) {
        const compareVal = action.total ?? next;
        highest = Math.max(highest, compareVal);
      }
    }
    actions.push(action);
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith('*** SUMMARY')) {
      inSummary = true;
      continue;
    }
    if (line.startsWith('*** HOLE CARDS')) {
      // preflop actions continue without resetting commits (blinds already counted)
      street = 'preflop';
      continue;
    }
    if (line.startsWith('*** FLOP')) {
      resetStreet('flop');
      continue;
    }
    if (line.startsWith('*** TURN')) {
      resetStreet('turn');
      continue;
    }
    if (line.startsWith('*** RIVER')) {
      resetStreet('river');
      continue;
    }
    if (line.startsWith('*** SHOWDOWN')) {
      resetStreet('showdown');
      continue;
    }

    if (inSummary) {
      if (line.startsWith('Total pot')) {
        const segments = line.split('|').map((s) => s.trim());
        for (const seg of segments) {
          if (/^Total pot/i.test(seg)) {
            const m = seg.match(MONEY_RE);
            if (m) totalPot = n(m[1]);
            continue;
          }
          if (/^Rake/i.test(seg)) {
            const m = seg.match(MONEY_RE);
            if (m) rake = n(m[1]) || 0;
            continue;
          }
          const extraMatch = seg.match(/^([A-Za-z ]+)\s+\$?([0-9]+(?:\.[0-9]+)?)/);
          if (extraMatch) {
            const key = camelKey(extraMatch[1]);
            extras[key] = n(extraMatch[2]) || 0;
          }
        }
        continue;
      }

      if (line.startsWith('Seat ')) {
        seatResults.push(line);
        const winMatch = line.match(/Seat\s+\d+:\s+([^()]+?)\s+\((?:[^)]+)\)\s+won\s+\(\$?([0-9.]+)\)/i);
        if (winMatch) {
          winners.push({ player: winMatch[1].trim(), amount: n(winMatch[2]) });
        }
        continue;
      }

      const collectMatch = line.match(/^(.+?)\s+collected\s+\$?([0-9.]+)\s+from\s+pot/i);
      if (collectMatch) {
        winners.push({ player: collectMatch[1].trim(), amount: n(collectMatch[2]) });
      }
      continue;
    }

    const dealtMatch = line.match(DEALT_RE);
    if (dealtMatch) {
      const player = dealtMatch[1].trim();
      const cards = dealtMatch[2].trim().split(/\s+/);
      holeCards.set(player, cards);
      continue;
    }

    if (/^Uncalled bet/i.test(line)) {
      const retMatch = line.match(/^Uncalled bet \(\$?([0-9.]+)\) returned to (.+)$/i);
      if (retMatch) {
        const amount = n(retMatch[1]) || 0;
        const player = retMatch[2].trim();
        const prev = getCommit(player);
        setCommit(player, Math.max(0, prev - amount));
        pushAction({
          street,
          type: 'return',
          player,
          amount,
          contribution: -amount,
        });
      }
      continue;
    }

    const actionMatch = line.match(ACTION_PLAYER_RE);
    if (!actionMatch) continue;
    const player = actionMatch[1].trim();
    const rest = actionMatch[2].trim();

    if (rest.startsWith('posts')) {
      const postMatch = rest.match(/^posts\s+([a-z ]+?)\s+\$?([0-9.]+)(.*)$/i);
      if (postMatch) {
        const kind = postMatch[1].trim().toLowerCase();
        const amount = n(postMatch[2]) || 0;
        const allIn = /all-in/i.test(postMatch[3] || '');
        pushAction({
          street,
          type: 'posts',
          postType: kind,
          player,
          amount,
          contribution: amount,
          allIn,
        });
      }
      continue;
    }

    if (rest.startsWith('folds')) {
      pushAction({ street, type: 'fold', player });
      continue;
    }

    if (rest.startsWith('checks')) {
      pushAction({ street, type: 'check', player });
      continue;
    }

    if (rest.startsWith('calls')) {
      const callMatch = rest.match(/^calls\s+\$?([0-9.]+)(.*)$/i);
      if (callMatch) {
        const amount = n(callMatch[1]) || 0;
        const allIn = /all-in/i.test(callMatch[2] || '');
        pushAction({
          street,
          type: 'call',
          player,
          amount,
          contribution: amount,
          allIn,
        });
      }
      continue;
    }

    if (rest.startsWith('bets')) {
      const betMatch = rest.match(/^bets\s+\$?([0-9.]+)(.*)$/i);
      if (betMatch) {
        const amount = n(betMatch[1]) || 0;
        const allIn = /all-in/i.test(betMatch[2] || '');
        const contribution = amount;
        pushAction({
          street,
          type: 'bet',
          player,
          amount,
          contribution,
          allIn,
          total: amount,
        });
      }
      continue;
    }

    if (rest.startsWith('raises')) {
      const raiseMatch = rest.match(/^raises\s+\$?([0-9.]+)\s+to\s+\$?([0-9.]+)(.*)$/i);
      if (raiseMatch) {
        const raiseBy = n(raiseMatch[1]) || 0;
        const toAmount = n(raiseMatch[2]) || 0;
        const prev = getCommit(player);
        const contribution = round2(toAmount - prev);
        const allIn = /all-in/i.test(raiseMatch[3] || '');
        pushAction({
          street,
          type: 'raise',
          player,
          amount: toAmount,
          contribution: contribution > 0 ? contribution : raiseBy,
          raiseFrom: prev,
          raiseTo: toAmount,
          raiseTotal: toAmount,
          allIn,
        });
      }
      continue;
    }

    if (/all-in/i.test(rest) && MONEY_RE.test(rest)) {
      const allInMatch = rest.match(MONEY_RE);
      const amount = n(allInMatch ? allInMatch[1] : null) || 0;
      pushAction({
        street,
        type: 'all-in',
        player,
        amount,
        contribution: amount,
        allIn: true,
      });
      continue;
    }

    if (rest.startsWith('shows')) {
      const showMatch = rest.match(/shows\s+\[([^\]]+)]/i);
      const cards = showMatch ? showMatch[1].trim().split(/\s+/) : [];
      pushAction({ street, type: 'show', player, cards });
      continue;
    }

    if (rest.startsWith('mucks')) {
      pushAction({ street, type: 'muck', player });
      continue;
    }

    if (rest.includes('collected')) {
      const collectMatch = rest.match(/collected\s+\$?([0-9.]+)/i);
      if (collectMatch) {
        winners.push({ player, amount: n(collectMatch[1]) });
      }
      continue;
    }
  }

  if (!winners.length) {
    for (const rawLine of lines) {
      const match = rawLine.match(/^(.+?)\s+collected\s+\$?([0-9.]+)\s+from\s+pot/i);
      if (match) winners.push({ player: match[1].trim(), amount: n(match[2]) });
    }
  }

  const winnerAgg = new Map();
  for (const w of winners) {
    if (!w?.player) continue;
    const key = w.player.trim();
    const amt = Number(w.amount) || 0;
    winnerAgg.set(key, round2((winnerAgg.get(key) || 0) + amt));
  }
  const dedupedWinners = [...winnerAgg.entries()].map(([player, amount]) => ({ player, amount }));

  return {
    actions,
    holeCards,
    summary: {
      totalPot,
      rake,
      extras,
      winners: dedupedWinners,
      seatResults,
    },
  };
}

function parseBlock(block) {
  const lines = block.split(/\r?\n/);
  const trimmed = lines.map((line) => line.trim()).filter((line) => line.length);

  const headRe = /^Poker Hand\s+#([A-Z0-9]+):\s*Hold['’]?em\s+No\s+Limit\s*\(\$?([\d.]+)\/\$?([\d.]+)\)\s*-\s*(\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2}:\d{2})/m;
  const headMatch = block.match(headRe);
  if (!headMatch) return null;
  const [, handId, sbStr, bbStr, dateRaw] = headMatch;
  const sb = n(sbStr);
  const bb = n(bbStr);
  const dateUTC = dateRaw.replace(/\//g, '-');

  let tableName = null;
  let buttonSeat = null;
  const tableRe = /^Table\s+'([^']+)'[^\n]*?(?:Seat\s+#(\d+)\s+is\s+the\s+button)?/m;
  const tableMatch = block.match(tableRe);
  if (tableMatch) {
    tableName = tableMatch[1] || null;
    buttonSeat = i(tableMatch[2]);
  }

  const players = [];
  const seatRe = /^Seat\s+(\d+):\s+(.+?)\s+\(\$?([\d.]+)\s+in\s+chips\)/gm;
  for (const m of block.matchAll(seatRe)) {
    players.push({
      seat: i(m[1]),
      name: m[2].trim(),
      stack: n(m[3]),
    });
  }

  const board = {};
  // Updated to support "Run It Twice" hands with FIRST FLOP/TURN/RIVER
  const flopRe = /^\*\*\*\s+(?:FIRST\s+)?FLOP\s+\*\*\*\s+\[([2-9TJQKA][cdhs])\s+([2-9TJQKA][cdhs])\s+([2-9TJQKA][cdhs])]/m;
  const turnRe = /^\*\*\*\s+(?:FIRST\s+)?TURN\s+\*\*\*\s+\[[^\]]+]\s+\[([2-9TJQKA][cdhs])]/m;
  const riverRe = /^\*\*\*\s+(?:FIRST\s+)?RIVER\s+\*\*\*\s+\[[^\]]+]\s+\[([2-9TJQKA][cdhs])]/m;
  const flopM = block.match(flopRe);
  if (flopM) board.flop = [flopM[1], flopM[2], flopM[3]];
  const turnM = block.match(turnRe);
  if (turnM) board.turn = turnM[1];
  const riverM = block.match(riverRe);
  if (riverM) board.river = riverM[1];
  
  // Check for "Run It Twice" - capture both boards from summary
  const runItTwiceMatch = block.match(/Hand was run (\w+) times/i);
  if (runItTwiceMatch) {
    // Parse FIRST Board and SECOND Board from summary
    const firstBoardMatch = block.match(/FIRST Board \[([2-9TJQKA][cdhs])\s+([2-9TJQKA][cdhs])\s+([2-9TJQKA][cdhs])\s+([2-9TJQKA][cdhs])\s+([2-9TJQKA][cdhs])]/);
    const secondBoardMatch = block.match(/SECOND Board \[([2-9TJQKA][cdhs])]/); // Only river card shown
    
    if (firstBoardMatch) {
      board.runItTwice = true;
      board.firstBoard = {
        flop: [firstBoardMatch[1], firstBoardMatch[2], firstBoardMatch[3]],
        turn: firstBoardMatch[4],
        river: firstBoardMatch[5]
      };
      
      // For secondBoard, flop and turn are same as first, only river differs
      if (secondBoardMatch) {
        board.secondBoard = {
          flop: [firstBoardMatch[1], firstBoardMatch[2], firstBoardMatch[3]],
          turn: firstBoardMatch[4],
          river: secondBoardMatch[1]
        };
      }
    }
  }

  const { actions, holeCards, summary } = parseActionsAndSummary(trimmed);

  let heroName = null;
  if (holeCards.size) {
    for (const player of players) {
      const cards = holeCards.get(player.name);
      if (cards && cards.length) {
        player.cards = cards;
        if (!heroName || player.name.toLowerCase() === 'hero') heroName = player.name;
      }
    }
    if (!heroName) {
      // fallback to first entry with hole cards
      const first = [...holeCards.keys()][0];
      if (first) heroName = first;
    }
  }

  const extraTotal = Object.values(summary.extras || {}).reduce((sum, val) => sum + (val || 0), 0);
  const distributable = summary.totalPot != null
    ? round2(summary.totalPot - (summary.rake || 0) - extraTotal)
    : null;

  const positions = qualifyPositions(players, buttonSeat);

  return {
    handId,
    dateUTC,
    table: { name: tableName, button: buttonSeat || undefined },
    tableName,
    button: buttonSeat || undefined,
    stakes: { sb, bb },
    players,
    hero: heroName || undefined,
    positions,
    board,
    actions,
    summary: {
      totalPot: summary.totalPot != null ? summary.totalPot : undefined,
      rake: summary.rake || 0,
      distributable: distributable != null ? distributable : undefined,
      winners: summary.winners || [],
      extras: summary.extras,
      seatResults: summary.seatResults,
    },
  };
}

export function parseHandsText(text) {
  const norm = normalize(text);
  const blocks = splitHands(norm);
  const hands = [];
  for (const block of blocks) {
    const parsed = parseBlock(block);
    if (parsed) hands.push(parsed);
  }
  return hands;
}

export async function parseHandsFile(filePath) {
  const fs = await import('node:fs/promises');
  const buf = await fs.readFile(filePath);
  return parseHandsText(buf.toString('utf8'));
}

export function assignPositions(hand) {
  if (!hand || !Array.isArray(hand.players)) return hand;
  const buttonSeat = hand.button ?? hand.table?.button ?? null;
  const positions = qualifyPositions(hand.players, buttonSeat ?? null);
  hand.positions = positions;
  return positions;
}

export function computeStreetPots(hand) {
  if (!hand) return hand;
  const winners = hand.summary?.winners || [];
  const totalCollected = round2(winners.reduce((sum, w) => sum + (Number(w.amount) || 0), 0));
  if (!hand.pots) hand.pots = {};
  hand.pots.totalCollected = totalCollected;
  return hand.pots;
}

// ---- CLI helpers -----------------------------------------------------------
async function runCli(argv) {
  const args = argv.slice(2);
  const ndjson = args.includes('--ndjson');
  const fileArg = args.find((arg) => arg !== '--ndjson');
  let hands = [];

  if (fileArg && fileArg !== '-') {
    hands = await parseHandsFile(fileArg);
  } else {
    const chunks = [];
    await new Promise((resolve) => {
      process.stdin.on('data', (c) => chunks.push(Buffer.from(c)));
      process.stdin.on('end', resolve);
      process.stdin.resume();
    });
    const text = Buffer.concat(chunks).toString('utf8');
    hands = parseHandsText(text);
  }

  if (ndjson) {
    for (const hand of hands) process.stdout.write(`${JSON.stringify(hand)}\n`);
  } else {
    process.stdout.write(JSON.stringify(hands, null, 2));
  }
}

try {
  const { fileURLToPath } = await import('node:url');
  const { resolve } = await import('node:path');
  const thisFile = fileURLToPath(import.meta.url);
  const invoked = process.argv[1] ? resolve(process.argv[1]) : '';
  if (thisFile === invoked) {
    runCli(process.argv).catch((err) => {
      console.error('[parser] CLI error:', err?.stack || err?.message || String(err));
      process.exit(1);
    });
  }
} catch (err) {
  console.error('[parser] init error:', err?.message || err);
}
