// renderer_umd.js v2025-10-18

(function () {
  function logOverlay(lines) {
    const overlay = document.getElementById('import-overlay');
    const log = document.getElementById('import-log');
    if (!overlay || !log) return;
    overlay.classList.add('show');
    const entries = Array.isArray(lines) ? lines : [String(lines)];
    for (const line of entries) {
      log.textContent += line + '\n';
    }
    log.scrollTop = log.scrollHeight;
  }

  function clearOverlay() {
    const el = document.getElementById('import-log');
    if (el) el.textContent = '';
  }

  function hideOverlay() {
    const el = document.getElementById('import-overlay');
    if (el) el.classList.remove('show');
  }

  function showOverlay() {
    const el = document.getElementById('import-overlay');
    if (el) el.classList.add('show');
  }

  function ensureProgressBar() {
    let bar = document.getElementById('import-progress');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'import-progress';
      bar.style.cssText = 'position:fixed;top:0;left:0;height:6px;width:0;background:#22c55e;z-index:9999;transition:width .25s ease,opacity .5s;';
      document.body.appendChild(bar);
    } else {
      bar.style.opacity = '1';
    }
    return bar;
  }

  function animateProgress(bar, targetPct) {
    const startPct = Number.parseFloat(bar.style.width) || 0;
    if (bar._progressAnim) cancelAnimationFrame(bar._progressAnim);
    const duration = Math.max(220, Math.abs(targetPct - startPct) * 10 + 120);
    const startTime = performance.now();
    const eased = (t) => t * t * (3 - 2 * t);
    const step = (now) => {
      const elapsed = now - startTime;
      const rawT = duration > 0 ? Math.min(1, elapsed / duration) : 1;
      const t = eased(rawT);
      const current = startPct + (targetPct - startPct) * t;
      bar.style.width = current + '%';
      if (rawT < 1) {
        bar._progressAnim = requestAnimationFrame(step);
      } else {
        bar._progressAnim = null;
      }
    };
    bar._progressAnim = requestAnimationFrame(step);
  }

  function setProgress(fraction) {
    const bar = ensureProgressBar();
    const pct = Math.min(100, Math.max(0, Number(fraction || 0) * 100));
    animateProgress(bar, pct);
  }

  function finishProgress() {
    const bar = ensureProgressBar();
    if (bar._progressAnim) {
      cancelAnimationFrame(bar._progressAnim);
      bar._progressAnim = null;
    }
    animateProgress(bar, 100);
    setTimeout(() => { bar.style.opacity = '0'; }, 600);
    setTimeout(() => {
      if (bar.parentNode) bar.parentNode.removeChild(bar);
    }, 1400);
  }

  function ensurePub() {
    if (!window.__pub) {
      const et = new EventTarget();
      window.__pub = {
        on: (type, handler) => {
          const fn = (event) => handler(event.detail);
          et.addEventListener(type, fn);
          return () => et.removeEventListener(type, fn);
        },
        emit: (type, detail) => et.dispatchEvent(new CustomEvent(type, { detail }))
      };
    }
  }

  ensurePub();

  const formatUSD = (value) => {
    const num = Number(value || 0);
    if (!Number.isFinite(num)) return '$0.00';
    const sign = num < 0 ? '-' : '';
    return `${sign}$${Math.abs(num).toFixed(2)}`;
  };

  const formatNumber = (value, digits = 2) => {
    const num = Number(value || 0);
    if (!Number.isFinite(num)) return (0).toFixed(digits);
    return num.toFixed(digits);
  };

  const formatPercent = (value) => {
    const num = Number(value || 0);
    if (!Number.isFinite(num)) return '0.0';
    return num.toFixed(1);
  };

  const formatStakeLabel = (value) => {
    if (!value || typeof value !== 'string') return 'Unknown stake';
    if (value.startsWith('special:')) {
      const key = value.slice(8);
      if (key === 'red-envelope') return 'Red Envelope';
      if (key === 'unknown') return 'Unknown Stake';
      return key.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
    }
    const parts = value.split('/');
    if (parts.length !== 2) return value;
    const [sbRaw, bbRaw] = parts;
    const toLabel = (input) => {
      const num = Number(input);
      if (!Number.isFinite(num)) return input;
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
    return `${toLabel(sbRaw)} / ${toLabel(bbRaw)}`;
  };

  const CONFIDENCE_META = {
    high: { label: 'High', text: '#166534', bg: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.28)' },
    medium: { label: 'Medium', text: '#1d4ed8', bg: 'rgba(59,130,246,0.14)', border: '1px solid rgba(59,130,246,0.28)' },
    low: { label: 'Low', text: '#ca8a04', bg: 'rgba(234,179,8,0.16)', border: '1px solid rgba(202,138,4,0.28)' },
    'very-low': { label: 'Very Low', text: '#ea580c', bg: 'rgba(234,88,12,0.16)', border: '1px solid rgba(234,88,12,0.26)' },
    none: { label: 'None', text: '#6b7280', bg: 'rgba(156,163,175,0.22)', border: '1px solid rgba(156,163,175,0.24)' },
  };

  const normalizeConfidenceLevel = (level) => {
    if (!level) return 'none';
    const key = String(level).toLowerCase();
    return CONFIDENCE_META[key] ? key : 'none';
  };

  function createConfidenceBadge(React, level) {
    const key = normalizeConfidenceLevel(level);
    const meta = CONFIDENCE_META[key] || CONFIDENCE_META.none;
    return React.createElement('span', {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2px 8px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
        color: meta.text,
        background: meta.bg,
        border: meta.border,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        whiteSpace: 'nowrap',
      },
    }, meta.label);
  }

  const DETAIL_STAT_SECTIONS = [
    {
      key: 'core',
      title: 'Core Frequencies',
      defaultCollapsed: false,
      defs: [
        { key: 'VPIP_pct', label: 'VPIP%', format: 'percent' },
        { key: 'PFR_pct', label: 'PFR%', format: 'percent' },
        { key: 'WTSD_pct', label: 'WTSD%', format: 'percent' },
        { key: 'WWSF_pct', label: 'WWSF%', format: 'percent' },
        { key: 'AFq_pct', label: 'AFq%', format: 'percent' },
      ],
    },
    {
      key: 'aggression',
      title: 'Aggression & Steals',
      defaultCollapsed: true,
      defs: [
        { key: 'ThreeBet_pct', label: '3B%', format: 'percent' },
        { key: 'FourBet_pct', label: '4B%', format: 'percent' },
        { key: 'Squeeze_pct', label: 'Squeeze%', format: 'percent' },
        { key: 'StealSucc_pct', label: 'Steal Success%', format: 'percent' },
        { key: 'StealAtt', label: 'Steal Attempts', format: 'number', digits: 0, showSample: false, showConfidence: false, footnote: 'Total attempts' },
      ],
    },
    {
      key: 'cbets',
      title: 'C-Bet Tendencies',
      defaultCollapsed: true,
      defs: [
        { key: 'CBetF_pct', label: 'CBet Flop%', format: 'percent' },
        { key: 'CBetT_pct', label: 'CBet Turn%', format: 'percent' },
        { key: 'CBetR_pct', label: 'CBet River%', format: 'percent' },
        { key: 'FoldToCBetF_pct', label: 'Fold to CBet F%', format: 'percent' },
        { key: 'FoldToCBetT_pct', label: 'Fold to CBet T%', format: 'percent' },
        { key: 'FoldToCBetR_pct', label: 'Fold to CBet R%', format: 'percent' },
      ],
    },
  ];

  const POSITION_COLUMNS = [
    { key: 'hands', label: 'Hands', format: 'number', digits: 0, showConfidence: false },
    { key: 'VPIP_pct', label: 'VPIP%', format: 'percent' },
    { key: 'PFR_pct', label: 'PFR%', format: 'percent' },
    { key: 'ThreeBet_pct', label: '3B%', format: 'percent' },
    { key: 'CBetF_pct', label: 'CBetF%', format: 'percent' },
    { key: 'WTSD_pct', label: 'WTSD%', format: 'percent' },
    { key: 'WWSF_pct', label: 'WWSF%', format: 'percent' },
  ];

  const formatUpdatedAt = (value) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleString();
  };

  const formatSampleCount = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num) || num <= 0) return 'n=0';
    const rounded = Math.round(num);
    return `n=${rounded.toLocaleString()}`;
  };

  const toPercentDisplay = (value) => (Number.isFinite(Number(value)) ? `${formatPercent(value)}%` : '--');
  const toNumberDisplay = (value, digits = 0) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return '--';
    return formatNumber(num, digits);
  };

  


  const namesEqual = (a, b) => {
    if (typeof a !== 'string' || typeof b !== 'string') return false;
    return a.trim().toLowerCase() === b.trim().toLowerCase();
  };

  function buildConfidenceGrid(React, stats, defs) {
    if (!stats || !Array.isArray(defs)) return null;
    const cards = defs.map((def) => {
      const rawValue = stats?.[def.key];
      let display;
      if (def.format === 'number') {
        display = toNumberDisplay(rawValue, def.digits ?? 0);
      } else if (def.format === 'percent') {
        display = toPercentDisplay(rawValue);
      } else {
        display = toNumberDisplay(rawValue, def.digits ?? 2);
      }
      const sampleKey = def.sampleKey || def.key;
      const showSample = def.showSample !== false;
      const showConfidence = def.showConfidence !== false;
      const sampleValue = showSample ? stats?.samples?.[sampleKey] : null;
      const badge = showConfidence ? createConfidenceBadge(React, stats?.confidence?.[sampleKey]) : null;
      const footnote = def.footnote ? React.createElement('div', {
        style: { fontSize: 11, color: '#6b7280' },
      }, def.footnote) : null;
      return React.createElement('div', {
        key: def.key,
        style: {
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          padding: '8px 10px',
          background: '#f9fafb',
          display: 'grid',
          gap: 4,
        },
      }, [
        React.createElement('div', { style: { fontSize: 12, color: '#6b7280' } }, def.label),
        React.createElement('div', { style: { fontSize: 18, fontWeight: 600, fontVariantNumeric: 'tabular-nums' } }, display),
        (showSample || showConfidence)
          ? React.createElement('div', {
              style: { fontSize: 11, color: '#6b7280', display: 'flex', gap: 6, alignItems: 'center' },
            }, [
              showSample ? React.createElement('span', { key: 'samples' }, formatSampleCount(sampleValue)) : null,
              badge,
            ].filter(Boolean))
          : null,
        footnote,
      ].filter(Boolean));
    }).filter(Boolean);
    if (!cards.length) return null;
    return React.createElement('div', {
      style: {
        display: 'grid',
        gap: 8,
        gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
      },
    }, cards);
  }

  function buildPositionalTable(React, stats, options = {}) {
    if (!stats?.positional || typeof stats.positional !== 'object') return null;
    const entries = Object.entries(stats.positional).filter(([, value]) => value && typeof value === 'object');
    if (!entries.length) return null;
    const { quickDrill } = options || {};
    entries.sort((a, b) => {
      const handsA = Number(a[1]?.hands) || 0;
      const handsB = Number(b[1]?.hands) || 0;
      if (handsA !== handsB) return handsB - handsA;
      return (a[0] || '').localeCompare(b[0] || '');
    });
    const header = [
      React.createElement('th', { key: 'position' }, 'Position'),
      ...POSITION_COLUMNS.map((col) => React.createElement('th', { key: col.key }, col.label)),
    ];
    const rows = entries.map(([position, info]) => {
      const cells = [React.createElement('td', { key: 'position' }, position || 'Unknown')];
      for (const col of POSITION_COLUMNS) {
        const raw = info?.[col.key];
        if (col.showConfidence === false) {
          cells.push(React.createElement('td', { key: col.key }, col.format === 'percent' ? toPercentDisplay(raw) : toNumberDisplay(raw, col.digits ?? 0)));
        } else {
          const sampleKey = col.sampleKey || col.key;
          const body = React.createElement('div', { style: { display: 'grid', gap: 4 } }, [
            React.createElement('div', { key: 'value', style: { fontWeight: 600, fontVariantNumeric: 'tabular-nums' } }, col.format === 'percent' ? toPercentDisplay(raw) : toNumberDisplay(raw, col.digits ?? 0)),
            React.createElement('div', { key: 'meta', style: { fontSize: 11, color: '#6b7280', display: 'flex', gap: 6, alignItems: 'center' } }, [
              React.createElement('span', { key: 'samples' }, formatSampleCount(info?.samples?.[sampleKey])),
              createConfidenceBadge(React, info?.confidence?.[sampleKey]),
            ]),
          ]);
          cells.push(React.createElement('td', { key: col.key }, body));
        }
      }
      const rowProps = { key: position || 'unknown' };
      if (typeof quickDrill === 'function') {
        rowProps.onClick = () => quickDrill({ type: 'position', position, player: stats?.player || null });
        rowProps.style = { cursor: 'pointer' };
      }
      return React.createElement('tr', rowProps, cells);
    });
    return React.createElement('table', null,
      React.createElement('thead', null, React.createElement('tr', null, header)),
      React.createElement('tbody', null, rows),
    );
  }

  function buildVsHeroSummary(React, stats, options = {}) {
    const vsHero = stats?.vsHero;
    if (!vsHero || typeof vsHero !== 'object') return null;
    const { quickDrill, isHero } = options || {};
    const hands = Number(vsHero.hands) || 0;
    const showdowns = Number(vsHero.showdowns) || 0;
    const cards = [];
    const cardStyle = {
      border: '1px solid #e5e7eb',
      borderRadius: 8,
      padding: '8px 10px',
      background: '#f9fafb',
      display: 'grid',
      gap: 4,
    };
    const labelStyle = { fontSize: 12, color: '#6b7280' };
    const valueStyle = { fontSize: 18, fontWeight: 600, fontVariantNumeric: 'tabular-nums' };
    cards.push(React.createElement('div', { key: 'hands', style: cardStyle }, [
      React.createElement('div', { style: labelStyle }, 'Hands vs Hero'),
      React.createElement('div', { style: valueStyle }, hands.toLocaleString()),
    ]));
    if (hands > 0) {
      const winSamples = formatSampleCount(stats?.samples?.vsHero_win_pct ?? hands);
      cards.push(React.createElement('div', { key: 'win_pct', style: cardStyle }, [
        React.createElement('div', { style: labelStyle }, 'Win % vs Hero'),
        React.createElement('div', { style: valueStyle }, toPercentDisplay(vsHero.win_pct)),
        React.createElement('div', { style: { fontSize: 11, color: '#6b7280', display: 'flex', gap: 6, alignItems: 'center' } }, [
          React.createElement('span', null, winSamples),
          createConfidenceBadge(React, stats?.confidence?.vsHero_win_pct),
        ]),
      ]));
    }
    if (showdowns > 0) {
      const showdownSamples = formatSampleCount(stats?.samples?.vsHero_showdown_win_pct ?? showdowns);
      cards.push(React.createElement('div', { key: 'showdown_pct', style: cardStyle }, [
        React.createElement('div', { style: labelStyle }, 'Showdown Win %'),
        React.createElement('div', { style: valueStyle }, toPercentDisplay(vsHero.showdown_win_pct)),
        React.createElement('div', { style: { fontSize: 11, color: '#6b7280', display: 'flex', gap: 6, alignItems: 'center' } }, [
          React.createElement('span', null, showdownSamples),
          createConfidenceBadge(React, stats?.confidence?.vsHero_showdown_win_pct),
        ]),
      ]));
    }
    if (!cards.length) return null;
    const children = [React.createElement('div', {
      key: 'grid',
      style: { display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' },
    }, cards)];
    if (typeof quickDrill === 'function' && !isHero && stats?.player) {
      children.push(React.createElement('div', { key: 'actions', style: { marginTop: 8 } },
        React.createElement('button', {
          type: 'button',
          onClick: () => quickDrill({ type: 'opponent', player: stats.player }),
          style: {
            border: '1px solid #3b82f6',
            background: '#dbeafe',
            color: '#1d4ed8',
            padding: '4px 10px',
            borderRadius: 6,
            cursor: 'pointer',
          },
        }, `View hands vs ${stats.player}`)));
    }
    return React.createElement('div', { style: { display: 'grid', gap: 8 } }, children);
  }

  function buildPlayerDetailContent(React, stats, options = {}) {
    if (!stats) return null;
    const {
      includeConfidence = true,
      includePositional = true,
      includeVsHero = true,
      collapsed: collapsedInput = {},
      onToggleSection,
      quickDrill,
      isHero = false,
    } = options || {};
    const collapsed = collapsedInput && typeof collapsedInput === 'object' ? collapsedInput : {};
    const toggleSection = typeof onToggleSection === 'function'
      ? (key, next) => onToggleSection(key, next)
      : null;
    const renderCollapsibleSection = (sectionKey, title, content, extra = {}) => {
      if (!content) return null;
      const { defaultCollapsed = false, collapsible = true, pad = true } = extra || {};
      const canToggle = collapsible && !!toggleSection;
      const hasStoredState = Object.prototype.hasOwnProperty.call(collapsed, sectionKey);
      const isCollapsed = collapsible ? (hasStoredState ? !!collapsed[sectionKey] : !!defaultCollapsed) : false;
      const headerChildren = [];
      if (canToggle) {
        headerChildren.push(React.createElement('button', {
          type: 'button',
          key: 'toggle',
          onClick: () => toggleSection(sectionKey, !isCollapsed),
          style: {
            marginRight: 8,
            border: 0,
            background: 'transparent',
            fontSize: 18,
            lineHeight: 1,
            cursor: 'pointer',
            color: '#111827',
            width: 24,
            height: 24,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          },
          'aria-expanded': !isCollapsed,
          'aria-controls': `${sectionKey}-body`,
        }, isCollapsed ? '+' : '-'));
      }
      headerChildren.push(React.createElement(canToggle ? 'span' : 'div', {
        key: 'title',
        style: { fontWeight: 600, fontSize: 14, color: '#111827' },
      }, title));
      const body = isCollapsed ? null : React.createElement('div', {
        id: `${sectionKey}-body`,
        style: { padding: pad ? '10px 12px 12px' : '0 12px 12px' },
      }, content);
      return React.createElement('div', {
        key: sectionKey,
        style: {
          border: '1px solid #e5e7eb',
          borderRadius: 10,
          overflow: 'hidden',
          background: '#fff',
        },
      }, [
        React.createElement('div', {
          key: 'header',
          style: {
            display: 'flex',
            alignItems: 'center',
            padding: '10px 12px',
            borderBottom: isCollapsed ? 'none' : '1px solid #f3f4f6',
            background: '#f9fafb',
          },
        }, headerChildren),
        body,
      ]);
    };
    const sections = [];
    const cardStyle = {
      border: '1px solid #e5e7eb',
      borderRadius: 8,
      padding: '8px 10px',
      background: '#f9fafb',
      display: 'grid',
      gap: 4,
    };
    const labelStyle = { fontSize: 12, color: '#6b7280' };
    const valueStyle = { fontSize: 18, fontWeight: 600, fontVariantNumeric: 'tabular-nums' };
    const metaCards = [];
    const handsValue = Number(stats.hands) || 0;
    metaCards.push(React.createElement('div', { key: 'hands', style: cardStyle }, [
      React.createElement('div', { style: labelStyle }, 'Tracked Hands'),
      React.createElement('div', { style: valueStyle }, handsValue.toLocaleString()),
    ]));
    const updated = formatUpdatedAt(stats.updated_at);
    if (updated) {
      metaCards.push(React.createElement('div', { key: 'updated', style: cardStyle }, [
        React.createElement('div', { style: labelStyle }, 'Last Updated'),
        React.createElement('div', { style: { fontSize: 13, fontWeight: 600 } }, updated),
      ]));
    }
    if (metaCards.length) {
      const grid = React.createElement('div', {
        style: { display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' },
      }, metaCards);
      sections.push(renderCollapsibleSection('overview', 'Overview', grid, { collapsible: false, pad: false }));
    }
    if (includeConfidence) {
      for (const section of DETAIL_STAT_SECTIONS) {
        const grid = buildConfidenceGrid(React, stats, section.defs);
        if (!grid) continue;
        sections.push(renderCollapsibleSection(`stats-${section.key}`, section.title, grid, { defaultCollapsed: !!section.defaultCollapsed }));
      }
    }
    if (includePositional) {
      const positionalTable = buildPositionalTable(React, stats, { quickDrill });
      if (positionalTable) {
        sections.push(renderCollapsibleSection('positional', 'Positional Splits', positionalTable, { defaultCollapsed: true }));
      }
    }
    if (includeVsHero) {
      const vsHeroSummary = buildVsHeroSummary(React, stats, { quickDrill, isHero });
      if (vsHeroSummary) {
        sections.push(renderCollapsibleSection('vsHero', 'Vs Hero Summary', vsHeroSummary, { defaultCollapsed: true }));
      }
    }
    if (!sections.length) return null;
    return React.createElement('div', { style: { display: 'grid', gap: 16 } }, sections);
  }

  function buildTableColumns(settings, getPositionalValue) {
    const showVsHero = !!settings.showVsHero;
    const showPositional = !!settings.showPositional;
    const base = [
      { key:'player', label:'Player', render:(row)=>row.player || 'Unknown', sortAccessor:(row)=> (row.player||'').toLowerCase(), defaultSortDir:'asc' },
      { key:'hands', label:'Hands', render:(row)=>row.hands ?? 0, align:'right', sortAccessor:(row)=> Number(row.hands) || 0 },
      { key:'VPIP_pct', label:'VPIP%', render:(row)=>formatPercent(row.VPIP_pct), align:'right', sortAccessor:(row)=> Number(row.VPIP_pct) || 0 },
      { key:'PFR_pct', label:'PFR%', render:(row)=>formatPercent(row.PFR_pct), align:'right', sortAccessor:(row)=> Number(row.PFR_pct) || 0 },
      { key:'ThreeBet_pct', label:'3B%', render:(row)=>formatPercent(row.ThreeBet_pct), align:'right', sortAccessor:(row)=> Number(row.ThreeBet_pct) || 0 },
      { key:'WTSD_pct', label:'WTSD%', render:(row)=>formatPercent(row.WTSD_pct), align:'right', sortAccessor:(row)=> Number(row.WTSD_pct) || 0 },
      { key:'WWSF_pct', label:'WWSF%', render:(row)=>formatPercent(row.WWSF_pct), align:'right', sortAccessor:(row)=> Number(row.WWSF_pct) || 0 },
      { key:'AFq_pct', label:'AFq%', render:(row)=>formatPercent(row.AFq_pct), align:'right', sortAccessor:(row)=> Number(row.AFq_pct) || 0 },
      { key:'CBetF_pct', label:'CBetF%', render:(row)=>formatPercent(row.CBetF_pct), align:'right', sortAccessor:(row)=> Number(row.CBetF_pct) || 0 },
      { key:'CBetT_pct', label:'CBetT%', render:(row)=>formatPercent(row.CBetT_pct), align:'right', sortAccessor:(row)=> Number(row.CBetT_pct) || 0 },
      { key:'CBetR_pct', label:'CBetR%', render:(row)=>formatPercent(row.CBetR_pct), align:'right', sortAccessor:(row)=> Number(row.CBetR_pct) || 0 },
      { key:'StealAtt', label:'StealAtt', render:(row)=>row.StealAtt ?? 0, align:'right', sortAccessor:(row)=> Number(row.StealAtt) || 0 },
      { key:'StealSucc_pct', label:'Steal%', render:(row)=>formatPercent(row.StealSucc_pct), align:'right', sortAccessor:(row)=> Number(row.StealSucc_pct) || 0 },
      { key:'CheckRaiseF', label:'CheckRaiseF', render:(row)=>row.CheckRaiseF ?? 0, align:'right', sortAccessor:(row)=> Number(row.CheckRaiseF) || 0 },
    ];
    if (showVsHero) {
      base.push(
        {
          key:'vsHeroHands',
          label:'VsHero Hands',
          render:(row)=>{
            const num = Number(row?.vsHero?.hands);
            return Number.isFinite(num) && num > 0 ? num : '--';
          },
          align:'right',
          sortAccessor:(row)=> Number(row?.vsHero?.hands) || 0,
        },
        {
          key:'vsHeroWin',
          label:'VsHero Win%',
          render:(row)=> formatPercent(row?.vsHero?.win_pct),
          align:'right',
          sortAccessor:(row)=> Number(row?.vsHero?.win_pct) || 0,
          getTitle:(row)=>{
            const samples = row?.samples?.vsHero_win_pct;
            return samples ? `Samples: ${formatSampleCount(samples)}` : undefined;
          },
        },
        {
          key:'vsHeroShowdown',
          label:'VsHero Showdown%',
          render:(row)=> formatPercent(row?.vsHero?.showdown_win_pct),
          align:'right',
          sortAccessor:(row)=> Number(row?.vsHero?.showdown_win_pct) || 0,
          getTitle:(row)=>{
            const samples = row?.samples?.vsHero_showdown_win_pct;
            return samples ? `Samples: ${formatSampleCount(samples)}` : undefined;
          },
        },
      );
    }
    if (showPositional) {
      base.push(
        {
          key:'btnVpip',
          label:'BTN VPIP%',
          render:(row)=>{
            const value = getPositionalValue(row, 'BTN', 'VPIP_pct');
            return value == null ? '--' : formatPercent(value);
          },
          align:'right',
          sortAccessor:(row)=>Number(getPositionalValue(row, 'BTN', 'VPIP_pct')) || 0,
          getTitle:(row)=>{
            const samples = row?.positional?.BTN?.samples?.VPIP_pct;
            return samples ? `BTN VPIP samples: ${formatSampleCount(samples)}` : undefined;
          },
        },
        {
          key:'coPfr',
          label:'CO PFR%',
          render:(row)=>{
            const value = getPositionalValue(row, 'CO', 'PFR_pct');
            return value == null ? '--' : formatPercent(value);
          },
          align:'right',
          sortAccessor:(row)=> Number(getPositionalValue(row, 'CO', 'PFR_pct')) || 0,
          getTitle:(row)=>{
            const samples = row?.positional?.CO?.samples?.PFR_pct;
            return samples ? `CO PFR samples: ${formatSampleCount(samples)}` : undefined;
          },
        },
        {
          key:'sbSteal',
          label:'SB Steal%',
          render:(row)=>{
            const value = getPositionalValue(row, 'SB', 'StealSucc_pct');
            return value == null ? '--' : formatPercent(value);
          },
          align:'right',
          sortAccessor:(row)=> Number(getPositionalValue(row, 'SB', 'StealSucc_pct')) || 0,
          getTitle:(row)=>{
            const samples = row?.positional?.SB?.samples?.StealSucc_pct;
            return samples ? `SB steal samples: ${formatSampleCount(samples)}` : undefined;
          },
        },
      );
    }
    return base;
  }

  function createColumnLookup(columns) {
    const map = new Map();
    columns.forEach((col) => map.set(col.key, col));
    return map;
  }

  function sortRowsBy(rows, columnLookup, sort) {
    if (!Array.isArray(rows) || rows.length === 0) return [];
    const sortConfig = sort || { field: 'hands', dir: 'desc' };
    const column = columnLookup.get(sortConfig.field);
    if (!column || column.sortable === false) return rows.slice();
    const accessor = typeof column.sortAccessor === 'function'
      ? column.sortAccessor
      : ((row) => row?.[column.key]);
    const direction = sortConfig.dir === 'asc' ? 1 : -1;
    return rows.slice().sort((a, b) => {
      const va = accessor(a);
      const vb = accessor(b);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === 'string' || typeof vb === 'string') {
        return direction * String(va).localeCompare(String(vb));
      }
      const na = Number(va);
      const nb = Number(vb);
      if (!Number.isFinite(na) && !Number.isFinite(nb)) return 0;
      if (!Number.isFinite(na)) return 1;
      if (!Number.isFinite(nb)) return -1;
      if (na === nb) return 0;
      return direction * (na - nb);
    });
  }

  function buildPlayerSnapshot(stats) {
    if (!stats || typeof stats !== 'object') return null;
    return {
      player: stats.player || 'Unknown',
      hands: stats.hands || 0,
      vpip: Number(stats.VPIP_pct) || 0,
      pfr: Number(stats.PFR_pct) || 0,
      threeBet: Number(stats.ThreeBet_pct) || 0,
      cbetF: Number(stats.CBetF_pct) || 0,
      cbetT: Number(stats.CBetT_pct) || 0,
      cbetR: Number(stats.CBetR_pct) || 0,
      steal: Number(stats.StealSucc_pct) || 0,
      wtSd: Number(stats.WTSD_pct) || 0,
      wwsf: Number(stats.WWSF_pct) || 0,
      updated_at: stats.updated_at || null,
    };
  }

  function useAsync(fn, deps) {
    const React = window.React;
    const [state, setState] = React.useState({ loading: true, error: null, data: null });
    React.useEffect(() => {
      let alive = true;
      setState({ loading: true, error: null, data: null });
      Promise.resolve().then(fn).then((data) => {
        if (alive) setState({ loading: false, error: null, data });
      }).catch((err) => {
        if (alive) setState({ loading: false, error: err, data: null });
      });
      return () => { alive = false; };
    }, deps);
    return state;
  }

  function Panel({ title, children }) {
    const React = window.React;
    return React.createElement('div', { className: 'panel' },
      React.createElement('h3', null, title),
      React.createElement('div', { className: 'body' }, children)
    );
  }

  function useDataUpdatedBump() {
    const React = window.React;
    const [bump, setBump] = React.useState(0);
    React.useEffect(() => {
      if (!window.__pub?.on) return undefined;
      const off = window.__pub.on('data-updated', () => setBump((value) => value + 1));
      return () => {
        if (typeof off === 'function') off();
      };
    }, []);
    return bump;
  }



  const detailSnapshot = (stats, heroName) => {
    if (!stats) return null;
    const snapshot = buildPlayerSnapshot(stats);
    if (heroName && namesEqual(snapshot.player, heroName)) snapshot.isHero = true;
    return snapshot;
  };

  function StatsView() {
    const React = window.React;
    const bump = useDataUpdatedBump();
    const [filters, setFilters] = React.useState({
      stake: 'all',
      position: 'all',
      showdown: 'all',
      result: 'all',
      from: '',
      to: '',
    });
    const [selectedPlayer, setSelectedPlayer] = React.useState('all');
    const [heroName, setHeroName] = React.useState(null);
    const [detailCollapsed, setDetailCollapsed] = React.useState({});
    const [compareCollapsed, setCompareCollapsed] = React.useState({});
    const [comparePlayer, setComparePlayer] = React.useState(() => {
      if (typeof window !== 'undefined') {
        try {
          return window.localStorage?.getItem('stats.comparePlayer') || 'none';
        } catch {}
      }
      return 'none';
    });
    const [tablePrefs, setTablePrefs] = React.useState(() => {
      if (typeof window !== 'undefined') {
        try {
          const saved = window.localStorage?.getItem('stats.tablePrefs');
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed && typeof parsed === 'object') {
              return {
                showPositional: !!parsed.showPositional,
                showVsHero: !!parsed.showVsHero,
                sort: parsed.sort && typeof parsed.sort === 'object'
                  ? {
                      field: typeof parsed.sort.field === 'string' ? parsed.sort.field : 'hands',
                      dir: parsed.sort.dir === 'asc' ? 'asc' : 'desc',
                    }
                  : { field: 'hands', dir: 'desc' },
              };
            }
          }
        } catch {}
      }
      return { showPositional: false, showVsHero: false, sort: { field: 'hands', dir: 'desc' } };
    });
    const tableSettings = tablePrefs;
    const tableSort = tablePrefs.sort || { field: 'hands', dir: 'desc' };

    const setTableSort = (updater) => {
      setTablePrefs((prev) => {
        const current = prev.sort || { field: 'hands', dir: 'desc' };
        const nextRaw = typeof updater === 'function' ? updater(current) : updater;
        if (!nextRaw || typeof nextRaw.field !== 'string') return prev;
        const next = { field: nextRaw.field, dir: nextRaw.dir === 'asc' ? 'asc' : 'desc' };
        if (next.field === current.field && next.dir === current.dir) return prev;
        return { ...prev, sort: next };
      });
    };

    const updateTableSettings = (patch) => {
      setTablePrefs((prev) => ({
        showPositional: 'showPositional' in patch ? !!patch.showPositional : prev.showPositional,
        showVsHero: 'showVsHero' in patch ? !!patch.showVsHero : prev.showVsHero,
        sort: prev.sort || { field: 'hands', dir: 'desc' },
      }));
    };

    React.useEffect(() => {
      if (typeof window === 'undefined') return;
      try {
        window.localStorage?.setItem('stats.tablePrefs', JSON.stringify(tablePrefs));
      } catch {}
    }, [tablePrefs]);

    React.useEffect(() => {
      if (typeof window === 'undefined') return;
      try {
        if (!comparePlayer || comparePlayer === 'none') {
          window.localStorage?.removeItem('stats.comparePlayer');
        } else {
          window.localStorage?.setItem('stats.comparePlayer', comparePlayer);
        }
      } catch {}
    }, [comparePlayer]);

    const playerWasManual = React.useRef(false);

    React.useEffect(() => {
      let alive = true;
      if (!window.api?.heroName) return;
      window.api.heroName().then((name) => {
        if (!alive) return;
        if (name) {
          setHeroName(name);
          if (!playerWasManual.current) setSelectedPlayer(name);
        }
      }).catch(() => {});
      return () => { alive = false; };
    }, []);

    const { data: playerCatalog } = useAsync(() => window.api?.listStats({ limit: 1000, order: 'player', dir: 'asc' }) ?? null, [bump]);

    const playerOptions = React.useMemo(() => {
      const names = new Set();
      if (Array.isArray(playerCatalog)) {
        playerCatalog.forEach((row) => {
          if (row?.player) names.add(row.player);
        });
      }
      if (heroName) names.add(heroName);
      const sorted = Array.from(names).sort((a, b) => a.localeCompare(b));
      return [{ value: 'all', label: 'All players' }, ...sorted.map((name) => ({ value: name, label: name }))];
    }, [playerCatalog, heroName]);

    const compareOptions = React.useMemo(() => {
      const opts = [{ value: 'none', label: 'No comparison' }];
      const seen = new Set();
      if (heroName) {
        const key = heroName.trim().toLowerCase();
        seen.add(key);
        opts.push({ value: heroName, label: `Hero: ${heroName}` });
      }
      for (const opt of playerOptions) {
        if (!opt || !opt.value || opt.value === 'all') continue;
        const key = String(opt.value).trim().toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        opts.push({ value: opt.value, label: opt.label || opt.value });
      }
      return opts;
    }, [playerOptions, heroName]);

    React.useEffect(() => {
      if (!selectedPlayer || selectedPlayer === 'all') return;
      const exists = playerOptions.some((opt) => opt.value === selectedPlayer);
      if (!exists) {
        setSelectedPlayer(heroName || 'all');
      }
    }, [playerOptions, selectedPlayer, heroName]);

    React.useEffect(() => {
      if (comparePlayer === 'none') return;
      const exists = compareOptions.some((opt) => opt.value === comparePlayer);
      if (!exists) setComparePlayer('none');
    }, [compareOptions, comparePlayer]);

    const statsRequest = React.useMemo(() => {
      const payload = {
        limit: selectedPlayer && selectedPlayer !== 'all' ? 1 : 500,
        offset: 0,
        order: 'hands',
        dir: 'desc',
      };
      if (selectedPlayer && selectedPlayer !== 'all') payload.player = selectedPlayer;
      return payload;
    }, [selectedPlayer]);

    const { data, loading, error } = useAsync(() => window.api?.listStats(statsRequest) ?? null, [statsRequest, bump]);

    const breakdownFilters = React.useMemo(() => {
      const payload = {};
      if (filters.stake && filters.stake !== 'all') payload.stakes = [filters.stake];
      if (filters.position && filters.position !== 'all') payload.positions = [filters.position];
      if (filters.showdown && filters.showdown !== 'all') payload.showdown = filters.showdown;
      if (filters.result && filters.result !== 'all') payload.result = filters.result;
      if (filters.from) payload.from = filters.from;
      if (filters.to) payload.to = filters.to;
      return payload;
    }, [filters]);

    const { data: stakeData, loading: stakeLoading, error: stakeError } = useAsync(
      () => window.api?.heroBreakdown ? window.api.heroBreakdown({ groupBy: 'stake', ...breakdownFilters }) : null,
      [breakdownFilters, bump]
    );

    const { data: positionData, loading: positionLoading, error: positionError } = useAsync(
      () => window.api?.heroBreakdown ? window.api.heroBreakdown({ groupBy: 'position', ...breakdownFilters }) : null,
      [breakdownFilters, bump]
    );

    const baseRows = Array.isArray(data) ? data : [];

    const heroAggregates = React.useMemo(() => {
      if (!heroName || !Array.isArray(stakeData?.rows)) return null;
      const toNumber = (value) => {
        const num = Number(value);
        return Number.isFinite(num) ? num : 0;
      };
      return stakeData.rows.reduce((acc, row) => {
        const threeBetOpp = toNumber(row.threeBetOppCount ?? row.threeBetOpp);
        const pfrOpp = toNumber(row.pfrOppCount ?? row.pfrOpp);
        const wtsdOpp = toNumber(row.wtsdOppCount ?? row.wtsdOpp);
        const cbetFOpp = toNumber(row.cbetF_opp);
        const cbetTOpp = toNumber(row.cbetT_opp);
        const cbetROpp = toNumber(row.cbetR_opp);
        acc.threeBet += toNumber(row.threeBetCount ?? (toNumber(row.threeBet_pct) * threeBetOpp / 100));
        acc.threeBetOpp += threeBetOpp;
        acc.pfr += toNumber(row.pfrCount ?? (toNumber(row.pfr_pct) * pfrOpp / 100));
        acc.pfrOpp += pfrOpp;
        acc.wtsd += toNumber(row.wtsdCount ?? (toNumber(row.wtsd_pct) * wtsdOpp / 100));
        acc.wtsdOpp += wtsdOpp;
        acc.cbetF += toNumber(row.cbetFCount ?? (toNumber(row.cbetF_pct) * cbetFOpp / 100));
        acc.cbetF_opp += cbetFOpp;
        acc.cbetT += toNumber(row.cbetTCount ?? (toNumber(row.cbetT_pct) * cbetTOpp / 100));
        acc.cbetT_opp += cbetTOpp;
        acc.cbetR += toNumber(row.cbetRCount ?? (toNumber(row.cbetR_pct) * cbetROpp / 100));
        acc.cbetR_opp += cbetROpp;
        return acc;
      }, {
        threeBet: 0,
        threeBetOpp: 0,
        pfr: 0,
        pfrOpp: 0,
        wtsd: 0,
        wtsdOpp: 0,
        cbetF: 0,
        cbetF_opp: 0,
        cbetT: 0,
        cbetT_opp: 0,
        cbetR: 0,
        cbetR_opp: 0,
      });
    }, [heroName, stakeData]);

    const rows = React.useMemo(() => {
      if (!heroAggregates || !heroName) return baseRows;
      const next = baseRows.map((row) => ({ ...row }));
      const idx = next.findIndex((row) => namesEqual(row.player, heroName));
      if (idx === -1) return next;
      const heroRow = { ...next[idx] };
      const threeBetPct = heroAggregates.threeBetOpp > 0 ? (heroAggregates.threeBet / heroAggregates.threeBetOpp) * 100 : 0;
      const pfrPct = heroAggregates.pfrOpp > 0 ? (heroAggregates.pfr / heroAggregates.pfrOpp) * 100 : 0;
      const wtsdPct = heroAggregates.wtsdOpp > 0 ? (heroAggregates.wtsd / heroAggregates.wtsdOpp) * 100 : 0;
      const cbetFPct = heroAggregates.cbetF_opp > 0 ? (heroAggregates.cbetF / heroAggregates.cbetF_opp) * 100 : 0;
      const cbetTPct = heroAggregates.cbetT_opp > 0 ? (heroAggregates.cbetT / heroAggregates.cbetT_opp) * 100 : 0;
      const cbetRPct = heroAggregates.cbetR_opp > 0 ? (heroAggregates.cbetR / heroAggregates.cbetR_opp) * 100 : 0;
      heroRow.ThreeBet_pct = Number(threeBetPct.toFixed(1));
      heroRow.PFR_pct = Number(pfrPct.toFixed(1));
      heroRow.WTSD_pct = Number(wtsdPct.toFixed(1));
      heroRow.CBetF_pct = Number(cbetFPct.toFixed(1));
      heroRow.CBetT_pct = Number(cbetTPct.toFixed(1));
      heroRow.CBetR_pct = Number(cbetRPct.toFixed(1));
      next[idx] = heroRow;
      return next;
    }, [baseRows, heroAggregates, heroName]);

    const focusRow = React.useMemo(() => {
      if (selectedPlayer && selectedPlayer !== 'all') {
        const found = rows.find((row) => namesEqual(row.player, selectedPlayer));
        if (found) return found;
      }
      if (heroName) {
        const heroRow = rows.find((row) => namesEqual(row.player, heroName));
        if (heroRow) return heroRow;
      }
      return rows[0] || null;
    }, [rows, selectedPlayer, heroName]);

    const fallbackHeroStats = React.useMemo(() => {
      if (!heroName) return null;
      if (focusRow && namesEqual(focusRow.player, heroName)) return null;
      return stakeData?.heroStats || positionData?.heroStats || null;
    }, [heroName, focusRow, stakeData, positionData]);

    const detailRow = focusRow || fallbackHeroStats;

    const toggleDetailSection = React.useCallback((key, next) => {
      setDetailCollapsed((prev) => ({ ...prev, [key]: next }));
    }, []);
    const toggleCompareSection = React.useCallback((key, next) => {
      setCompareCollapsed((prev) => ({ ...prev, [key]: next }));
    }, []);

    const quickDrill = React.useCallback((payload) => {
      if (!payload) return;
      try { setActiveTab('browser'); } catch {}
      window.__pub?.emit?.('browser:drill', payload);
    }, []);

    const compareTarget = comparePlayer && comparePlayer !== 'none' ? comparePlayer : null;

    const compareRowFromRows = React.useMemo(() => {
      if (!compareTarget) return null;
      return rows.find((row) => namesEqual(row.player, compareTarget)) || null;
    }, [rows, compareTarget]);

    const compareFetchRequest = React.useMemo(() => {
      if (!compareTarget) return null;
      if (compareRowFromRows) return null;
      return { limit: 1, player: compareTarget };
    }, [compareTarget, compareRowFromRows]);

    const { data: compareFetchData } = useAsync(() => {
      if (!compareFetchRequest) return null;
      return window.api?.listStats(compareFetchRequest) ?? null;
    }, [compareFetchRequest, bump]);

    const compareDetailRow = React.useMemo(() => {
      if (!compareTarget) return null;
      if (compareRowFromRows) return compareRowFromRows;
      if (compareTarget === heroName) {
        return fallbackHeroStats || focusRow || null;
      }
      if (Array.isArray(compareFetchData) && compareFetchData.length) {
        return compareFetchData[0];
      }
      return null;
    }, [compareTarget, compareRowFromRows, compareFetchData, fallbackHeroStats, focusRow, heroName]);

    React.useEffect(() => {
      if (!window.__pub?.emit) return;
      if (compareDetailRow) {
        window.__pub.emit('stats:compareUpdate', { player: compareDetailRow.player, stats: compareDetailRow });
      } else {
        window.__pub.emit('stats:compareUpdate', null);
      }
    }, [compareDetailRow]);

    React.useEffect(() => {
      if (!window.hud?.pushInsight) return;
      const heroSnapshot = detailSnapshot(detailRow, heroName);
      const compareSnapshot = detailSnapshot(compareDetailRow, heroName);
      try {
        window.hud.pushInsight({ hero: heroSnapshot, compare: compareSnapshot });
      } catch {}
    }, [detailRow, compareDetailRow, heroName]);

    const tableColumns = buildTableColumns(tableSettings, (row, position, field) => {
      if (!row || !row.positional) return null;
      const bucket = row.positional[position];
      if (!bucket) return null;
      const value = bucket[field];
      const num = Number(value);
      return Number.isFinite(num) ? num : null;
    });

    React.useEffect(() => {
      if (!Array.isArray(tableColumns) || !tableColumns.length) return;
      const activeKeys = tableColumns.map((col) => col.key);
      if (!activeKeys.includes(tableSort.field)) {
        setTableSort({ field: 'hands', dir: 'desc' });
      }
    }, [tableColumns, tableSort.field]);

    const columnLookup = React.useMemo(() => createColumnLookup(tableColumns), [tableColumns]);
    const sortedRows = React.useMemo(() => sortRowsBy(rows, columnLookup, tableSort), [rows, columnLookup, tableSort]);

    const handleSortToggle = (column) => {
      if (!column || column.sortable === false) return;
      setTableSort((prev) => {
        if (prev.field === column.key) {
          return { field: column.key, dir: prev.dir === 'desc' ? 'asc' : 'desc' };
        }
        return { field: column.key, dir: column.defaultSortDir || 'desc' };
      });
    };

    const stakeOptions = React.useMemo(() => {
      const mapped = Array.isArray(stakeData?.available?.stakes) ? stakeData.available.stakes : [];
      return [{ value: 'all', label: 'All stakes' }, ...mapped.map((opt) => ({ value: opt.key, label: opt.label || formatStakeLabel(opt.key) }))];
    }, [stakeData]);
    const positionOptions = React.useMemo(() => ['all', ...(Array.isArray(stakeData?.available?.positions) ? stakeData.available.positions : [])], [stakeData]);

    const filtersUi = React.createElement('div', {
      style: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
    }, [
      React.createElement('select', {
        key: 'player',
        value: selectedPlayer || 'all',
        onChange: (ev) => {
          playerWasManual.current = true;
          setSelectedPlayer(ev.target.value || 'all');
        },
        style: { flex: '0 0 180px' },
      }, playerOptions.map((opt) => React.createElement('option', { key: opt.value, value: opt.value }, opt.label))),
      React.createElement('select', {
        key: 'stake',
        value: filters.stake,
        onChange: (ev) => setFilters((prev) => ({ ...prev, stake: ev.target.value })),
        style: { flex: '0 0 160px' },
      }, stakeOptions.map((opt) => React.createElement('option', { key: opt.value, value: opt.value }, opt.label))),
      React.createElement('select', {
        key: 'position',
        value: filters.position,
        onChange: (ev) => setFilters((prev) => ({ ...prev, position: ev.target.value })),
        style: { flex: '0 0 150px' },
      }, positionOptions.map((value) => React.createElement('option', { key: value, value }, value === 'all' ? 'All positions' : value))),
      React.createElement('select', {
        key: 'showdown',
        value: filters.showdown,
        onChange: (ev) => setFilters((prev) => ({ ...prev, showdown: ev.target.value })),
        style: { flex: '0 0 160px' },
      }, [
        React.createElement('option', { value: 'all', key: 'all' }, 'All hands'),
        React.createElement('option', { value: 'showdown', key: 'showdown' }, 'Showdown only'),
        React.createElement('option', { value: 'nonshowdown', key: 'nonshowdown' }, 'Non-showdown only'),
      ]),
      React.createElement('select', {
        key: 'result',
        value: filters.result,
        onChange: (ev) => setFilters((prev) => ({ ...prev, result: ev.target.value })),
        style: { flex: '0 0 150px' },
      }, [
        React.createElement('option', { value: 'all', key: 'all' }, 'All results'),
        React.createElement('option', { value: 'won', key: 'won' }, 'Won hands'),
        React.createElement('option', { value: 'lost', key: 'lost' }, 'Lost hands'),
        React.createElement('option', { value: 'breakeven', key: 'breakeven' }, 'Break-even'),
      ]),
      React.createElement('input', {
        key: 'from',
        type: 'date',
        value: filters.from,
        onChange: (ev) => setFilters((prev) => ({ ...prev, from: ev.target.value })),
        style: { flex: '0 0 150px' },
      }),
      React.createElement('input', {
        key: 'to',
        type: 'date',
        value: filters.to,
        onChange: (ev) => setFilters((prev) => ({ ...prev, to: ev.target.value })),
        style: { flex: '0 0 150px' },
      }),
      React.createElement('button', {
        key: 'reset',
        type: 'button',
        onClick: () => setFilters({ stake: 'all', position: 'all', showdown: 'all', result: 'all', from: '', to: '' }),
        style: { flex: '0 0 auto' },
      }, 'Reset Filters'),
      React.createElement('label', {
        key: 'vshero-toggle',
        style: { display: 'inline-flex', alignItems: 'center', gap: 6, flex: '0 0 auto', fontSize: 13, padding: '4px 6px', background: '#f9fafb', borderRadius: 6, border: '1px solid #e5e7eb' },
      }, [
        React.createElement('input', {
          type: 'checkbox',
          checked: !!tableSettings.showVsHero,
          onChange: (ev) => updateTableSettings({ showVsHero: ev.target.checked }),
        }),
        React.createElement('span', null, 'Vs-hero cols'),
      ]),
      React.createElement('label', {
        key: 'pos-toggle',
        style: { display: 'inline-flex', alignItems: 'center', gap: 6, flex: '0 0 auto', fontSize: 13, padding: '4px 6px', background: '#f9fafb', borderRadius: 6, border: '1px solid #e5e7eb' },
      }, [
        React.createElement('input', {
          type: 'checkbox',
          checked: !!tableSettings.showPositional,
          onChange: (ev) => updateTableSettings({ showPositional: ev.target.checked }),
        }),
        React.createElement('span', null, 'Positional cols'),
      ]),
      React.createElement('select', {
        key: 'compare',
        value: comparePlayer,
        onChange: (ev) => setComparePlayer(ev.target.value || 'none'),
        style: { flex: '0 0 200px' },
      }, compareOptions.map((opt) => React.createElement('option', { key: opt.value, value: opt.value }, opt.label))),
      comparePlayer !== 'none'
        ? React.createElement('button', {
            key: 'clear-compare',
            type: 'button',
            onClick: () => setComparePlayer('none'),
            style: { flex: '0 0 auto' },
          }, 'Clear Compare')
        : null,
    ]);

    const table = Array.isArray(sortedRows) && sortedRows.length
      ? React.createElement('table', null,
        React.createElement('thead', null, React.createElement('tr', null, tableColumns.map((col) => {
          const sortable = col.sortable !== false;
          const isActive = tableSort.field === col.key;
          const indicator = isActive ? (tableSort.dir === 'asc' ? '▲' : '▼') : null;
          return React.createElement('th', {
            key: col.key,
            onClick: sortable ? () => handleSortToggle(col) : undefined,
            style: {
              cursor: sortable ? 'pointer' : 'default',
              userSelect: 'none',
              textAlign: col.align === 'right' ? 'right' : 'left',
              whiteSpace: 'nowrap',
            },
            title: sortable ? 'Click to sort' : undefined,
          }, [
            col.label,
            indicator ? React.createElement('span', { style: { marginLeft: 4, fontSize: 10 } }, indicator) : null,
          ]);
        }))),
        React.createElement('tbody', null,
          sortedRows.map((row) => {
            const isHero = heroName && namesEqual(row.player, heroName);
            const isSelected = selectedPlayer && selectedPlayer !== 'all' ? namesEqual(row.player, selectedPlayer) : false;
            const isCompared = compareDetailRow && namesEqual(row.player, compareDetailRow.player);
            const rowStyle = {};
            if (isSelected) rowStyle.backgroundColor = 'rgba(34,197,94,0.12)';
            if (isCompared) {
              rowStyle.backgroundColor = 'rgba(99,102,241,0.08)';
              rowStyle.outline = '1px solid rgba(99,102,241,0.45)';
              rowStyle.boxShadow = '0 0 0 1px rgba(99,102,241,0.20)';
            }
            if (isHero || isSelected || isCompared) rowStyle.fontWeight = 600;
            const cells = tableColumns.map((col) => {
              const raw = col.render(row);
              const isEmpty = raw === null || raw === undefined || raw === '';
              const displayValue = isEmpty ? (col.emptyDisplay ?? '--') : raw;
              const cellStyle = {
                fontVariantNumeric: 'tabular-nums',
                textAlign: col.align === 'right' ? 'right' : 'left',
              };
              if (isEmpty) cellStyle.color = '#9ca3af';
              const title = typeof col.getTitle === 'function' ? col.getTitle(row, displayValue) : undefined;
              return React.createElement('td', { key: col.key, style: cellStyle, title }, displayValue);
            });
            return React.createElement('tr', {
              key: row.player,
              style: rowStyle,
              onClick: () => setSelectedPlayer(row.player || 'all'),
            }, cells);
          })
        )
      )
      : React.createElement('div', { className: 'muted' }, 'No stats found for the selected player.');

    const detailContent = detailRow
      ? buildPlayerDetailContent(React, detailRow, {
          collapsed: detailCollapsed,
          onToggleSection: toggleDetailSection,
          quickDrill,
          isHero: heroName && detailRow && namesEqual(detailRow.player, heroName),
        })
      : null;
    const detailTitle = detailRow
      ? (heroName && namesEqual(detailRow.player, heroName)
        ? 'Hero Breakdown'
        : `${detailRow.player || 'Player'} Breakdown`)
      : null;
    const detailPanel = detailContent ? Panel({ title: detailTitle || 'Player Breakdown', children: detailContent }) : null;

    const compareContent = compareDetailRow
      ? buildPlayerDetailContent(React, compareDetailRow, {
          collapsed: compareCollapsed,
          onToggleSection: toggleCompareSection,
          quickDrill,
          isHero: heroName && namesEqual(compareDetailRow.player, heroName),
        })
      : null;
    const comparePanel = compareContent ? Panel({ title: `Comparison: ${compareDetailRow.player || 'Player'}`, children: compareContent }) : null;

    const detailPanels = [];
    if (detailPanel) detailPanels.push(detailPanel);
    if (comparePanel) detailPanels.push(comparePanel);
    let detailStack;
    if (detailPanels.length) {
      detailStack = React.createElement('div', {
        style: {
          display: 'grid',
          gap: 12,
          gridTemplateColumns: detailPanels.length > 1 ? 'repeat(auto-fit, minmax(320px, 1fr))' : '1fr',
        },
      }, detailPanels);
    } else if (!loading && !error) {
      detailStack = Panel({ title: 'Player Breakdown', children: 'Select a player with stats to view detailed breakdowns. Run the stats builder if the list is empty.' });
    } else {
      detailStack = null;
    }

    const renderBreakdown = (title, payload, loadingState, errorState) => {
      if (!window.api?.heroBreakdown) return null;
      if (loadingState) return Panel({ title, children: 'Loading...' });
      if (errorState) return Panel({ title, children: `Error: ${String(errorState)}` });
      const rowsArray = Array.isArray(payload?.rows) ? payload.rows : [];
      if (!rowsArray.length) return null;
      const labelHeader = payload?.groupBy === 'position' ? 'Position' : 'Stake';
      const cols = [
        labelHeader,
        'Hands',
        'Net USD',
        'bb/100',
        'VPIP%',
        'PFR%',
        'WTSD%',
        'WWSF%',
        '3B%',
        'CBetF%',
        'CBetT%',
        'CBetR%',
        'Pre-rake USD',
        'Pre-rake BB/100',
        'Rake USD',
        'Jackpot USD',
        'Total Rake USD',
      ];
      return Panel({
        title,
        children: React.createElement('table', null,
          React.createElement('thead', null, React.createElement('tr', null, cols.map((col) => React.createElement('th', { key: col }, col)))),
          React.createElement('tbody', null,
            rowsArray.map((entry) => React.createElement('tr', {
              key: entry.key,
              onClick: () => quickDrill({ type: payload?.groupBy === 'position' ? 'position' : 'stake', position: payload?.groupBy === 'position' ? entry.label : null, stake: payload?.groupBy === 'position' ? null : entry.label }),
              style: { cursor: 'pointer' },
            }, [
              React.createElement('td', null, payload?.groupBy === 'position' ? entry.label : formatStakeLabel(entry.label)),
              React.createElement('td', null, entry.hands),
              React.createElement('td', null, formatUSD(entry.netUSD)),
              React.createElement('td', null, formatNumber(entry.bbPer100, 2)),
              React.createElement('td', null, formatPercent(entry.vpip_pct)),
              React.createElement('td', null, formatPercent(entry.pfr_pct)),
              React.createElement('td', null, formatPercent(entry.wtsd_pct)),
              React.createElement('td', null, formatPercent(entry.wwsf_pct)),
              React.createElement('td', null, formatPercent(entry.threeBet_pct)),
              React.createElement('td', null, formatPercent(entry.cbetF_pct)),
              React.createElement('td', null, formatPercent(entry.cbetT_pct)),
              React.createElement('td', null, formatPercent(entry.cbetR_pct)),
              React.createElement('td', null, formatUSD(entry.preRakeUSD)),
              React.createElement('td', null, formatNumber(entry.preRakeBBPer100 ?? entry.preRakeBB_per100 ?? 0, 2)),
              React.createElement('td', null, formatUSD(entry.rakeUSD)),
              React.createElement('td', null, formatUSD(entry.jackpotUSD)),
              React.createElement('td', null, formatUSD(entry.totalRakeUSD)),
            ]))
          )
        ),
      });
    };

    if (!window.api) return Panel({ title: 'Player Stats', children: 'Preload not loaded.' });
    if (loading) return Panel({ title: 'Player Stats', children: 'Loading...' });
    if (error) return Panel({ title: 'Player Stats', children: `Error: ${String(error)}` });

    const stakePanel = renderBreakdown('Breakdown by Stake', stakeData, stakeLoading, stakeError);
    const positionPanel = renderBreakdown('Breakdown by Position', positionData, positionLoading, positionError);

    return React.createElement(React.Fragment, null,
      Panel({ title: 'Player Stats', children: React.createElement(React.Fragment, null, filtersUi, table) }),
      detailStack,
      stakePanel,
      positionPanel,
    );
  }



  const parseHandJson = (hand) => {
    if (!hand) return null;
    if (hand.__parsed) return hand.__parsed;
    let parsed = null;
    if (typeof hand.json === 'string') {
      try { parsed = JSON.parse(hand.json); } catch { parsed = null; }
    }
    if (!parsed && hand.data) parsed = hand.data;
    hand.__parsed = parsed;
    return parsed;
  };

  function HandReplayer({ hand }) {
    const React = window.React;
    if (!hand) return Panel({ title: 'Hand Detail', children: 'Select a hand to view details.' });
    const parsed = parseHandJson(hand);
    if (!parsed) {
      return Panel({ title: 'Hand Detail', children: 'Unable to load hand JSON.' });
    }
    const hero = parsed.hero || parsed.players?.find?.((p) => p && p.isHero) || hand.hero || 'Hero';
    const board = Array.isArray(parsed.board) ? parsed.board.join(' ') : (parsed.board?.join?.(' ') || '');
    const winners = Array.isArray(parsed.summary?.winners) ? parsed.summary.winners : [];
    const actions = Array.isArray(parsed.actions) ? parsed.actions : [];
    const summary = Array.isArray(parsed.summary?.seatResults) ? parsed.summary.seatResults : [];
    const actionList = actions.map((action, idx) => {
      if (!action) return React.createElement('li', { key: idx }, '');
      const label = `${action.street || ''} ${action.player || ''} ${action.type || ''} ${action.amount != null ? formatNumber(action.amount, 2) : ''}`.trim();
      return React.createElement('li', { key: idx }, label);
    });
    return Panel({
      title: `Hand ${hand.handId || hand.id || ''}`,
      children: React.createElement('div', { style: { display: 'grid', gap: 12 } }, [
        React.createElement('div', { key: 'meta', style: { display: 'flex', gap: 12, flexWrap: 'wrap' } }, [
          React.createElement('div', { key: 'hero' }, React.createElement('strong', null, 'Hero: '), hero || 'Unknown'),
          React.createElement('div', { key: 'table' }, React.createElement('strong', null, 'Table: '), hand.tableName || parsed.table?.name || 'Unknown'),
          React.createElement('div', { key: 'stakes' }, React.createElement('strong', null, 'Stakes: '), formatStakeLabel(`${hand.sb}/${hand.bb}`)),
          React.createElement('div', { key: 'board' }, React.createElement('strong', null, 'Board: '), board || 'N/A'),
        ]),
        React.createElement('div', { key: 'winners' }, [
          React.createElement('strong', { key: 'label' }, 'Winners:'),
          winners.length
            ? React.createElement('ul', { key: 'list' }, winners.map((w, idx) => React.createElement('li', { key: idx }, `${w.player || 'Player'} +${formatUSD(w.amount)}`)))
            : React.createElement('div', { key: 'none', className: 'muted' }, 'None'),
        ]),
        React.createElement('div', { key: 'summary' }, [
          React.createElement('strong', { key: 'label' }, 'Summary:'),
          summary.length
            ? React.createElement('ul', { key: 'list' }, summary.map((line, idx) => React.createElement('li', { key: idx }, line)))
            : null,
        ]),
        React.createElement('div', { key: 'actions' }, [
          React.createElement('strong', { key: 'label' }, 'Actions:'),
          React.createElement('ol', { key: 'list', style: { maxHeight: 220, overflowY: 'auto' } }, actionList),
        ]),
      ]),
    });
  }

  function HandList({ onSelect, selectedId }) {
    const React = window.React;
    const bump = useDataUpdatedBump();
    const [q, setQ] = React.useState('');
    const [filters, setFilters] = React.useState({ result: 'all', minBB: '', maxBB: '', from: '', to: '', stake: 'all', position: 'all', villain: '' });
    const [sort, setSort] = React.useState({ field: 'date', dir: 'desc' });
    const [stakes, setStakes] = React.useState([{ label: 'All stakes', value: 'all' }]);
    const [currency, setCurrency] = React.useState('usd');
    const [drill, setDrill] = React.useState(null);

    React.useEffect(() => {
      let alive = true;
      if (!window.api?.listHandStakes) return;
      window.api.listHandStakes().then((list) => {
        if (!alive || !Array.isArray(list)) return;
        const next = [{ label: 'All stakes', value: 'all' }, ...list.map((row) => ({
          label: row.label ?? formatStakeLabel(`${row.sb}/${row.bb}`),
          value: row.value ?? `${row.sb}/${row.bb}`,
        }))];
        setStakes(next);
      }).catch(() => {});
      return () => { alive = false; };
    }, []);

    React.useEffect(() => {
      if (!window.__pub?.on) return undefined;
      const off = window.__pub.on('browser:drill', (payload) => {
        setDrill(payload || null);
        if (payload?.type === 'position') {
          setFilters((prev) => ({ ...prev, position: payload.position || 'all' }));
        }
        if (payload?.type === 'opponent') {
          setFilters((prev) => ({ ...prev, result: 'all' }));
        }
      });
      return () => { if (typeof off === 'function') off(); };
    }, []);

    const request = React.useMemo(() => ({
      q,
      result: filters.result,
      limit: 300,
      minBB: filters.minBB,
      maxBB: filters.maxBB,
      from: filters.from,
      to: filters.to,
      stake: filters.stake,
      position: filters.position,
      villain: filters.villain,
      sortField: sort.field,
      sortDir: sort.dir,
    }), [q, filters, sort]);

    const { data, loading, error } = useAsync(() => window.api?.listHands(request) ?? [], [request, bump]);

    const updateFilter = (field) => (value) => setFilters((prev) => ({ ...prev, [field]: value }));
    const resetFilters = () => {
      setFilters({ result: 'all', minBB: '', maxBB: '', from: '', to: '', stake: 'all', position: 'all', villain: '' });
      setDrill(null);
    };
    const toggleCurrency = React.useCallback(() => {
      setCurrency((prev) => (prev === 'usd' ? 'bb' : 'usd')); } , []);
    const toggleSort = (field) => setSort((prev) => {
      if (prev.field === field) {
        return { field, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
      }
      return { field, dir: 'desc' };
    });

    const rows = Array.isArray(data) ? data : [];

    const filteredRows = React.useMemo(() => {
      if (!drill) return rows;
      const type = drill.type;
      const normalize = (value) => String(value || '').trim().toLowerCase();
      if (type === 'position') {
        const target = normalize(drill.position);
        if (!target) return rows;
        return rows.filter((hand) => {
          const parsed = parseHandJson(hand);
          const heroName = parsed?.hero || parsed?.players?.find?.((p) => p && p.isHero)?.name || hand.hero;
          const pos = parsed?.positions && heroName ? parsed.positions[heroName] : null;
          return normalize(pos) === target;
        });
      }
      if (type === 'opponent') {
        const target = normalize(drill.player);
        if (!target) return rows;
        return rows.filter((hand) => {
          const parsed = parseHandJson(hand);
          const players = Array.isArray(parsed?.players) ? parsed.players : [];
          return players.some((p) => normalize(p?.name) === target);
        });
      }
      if (type === 'stake' && drill.stake) {
        const label = formatStakeLabel(drill.stake);
        return rows.filter((hand) => formatStakeLabel(`${hand.sb}/${hand.bb}`) === label);
      }
      return rows;
    }, [rows, drill]);

    React.useEffect(() => {
      if (!drill || !Array.isArray(filteredRows) || !filteredRows.length) return;
      const first = filteredRows[0];
      if (!first || selectedId === first.handId) return;
      onSelect?.(first.handId);
    }, [drill, filteredRows, onSelect, selectedId]);

    const netLabel = currency === 'bb' ? 'Hero Net (BB)' : 'Hero Net (USD)';

    const stakeLabelFor = (hand) => {
      if (hand?.stakeLabel) return hand.stakeLabel;
      const sb = Number(hand?.sb);
      const bb = Number(hand?.bb);
      if (Number.isFinite(sb) && Number.isFinite(bb)) {
        return formatStakeLabel(`${sb}/${bb}`);
      }
      return 'Unknown';
    };

    const columns = [
      { key: 'hand', label: 'Hand', sort: 'id', render: (h) => h.handId },
      { key: 'date', label: 'Date (UTC)', sort: 'date', render: (h) => h.dateUTC || '' },
      { key: 'stakes', label: 'Stakes', sort: 'stakes', render: stakeLabelFor },
      { key: 'rake', label: 'Rake (USD)', render: (h) => (typeof h.heroRake === 'number' ? formatUSD(h.heroRake) : '-') },
      { key: 'net', label: netLabel, sort: 'net', render: (h) => {
          const hasNet = typeof h.heroNet === 'number';
          if (!hasNet) return '-';
          const netUSD = Number(h.heroNet);
          const style = { color: netUSD > 0 ? '#16a34a' : netUSD < 0 ? '#dc2626' : undefined };
          if (currency === 'bb') {
            const bbValue = Number(h.bb);
            const netBB = bbValue > 0 ? netUSD / bbValue : 0;
            return React.createElement('span', { style }, `${formatNumber(netBB, 2)} bb`);
          }
          return React.createElement('span', { style }, formatUSD(netUSD));
        }
      }
    ];

    const sortIndicator = (field) => sort.field === field ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : '';

    const body = !window.api ? 'Preload not loaded.'
      : loading ? 'Loading...'
      : error ? `Error: ${String(error)}`
      : !filteredRows.length ? 'No hands match the current filters.'
      : React.createElement('table', null,
          React.createElement('thead', null, React.createElement('tr', null,
            columns.map((col) => {
              const sortable = Boolean(col.sort);
              return React.createElement('th', {
                key: col.key,
                onClick: sortable ? () => toggleSort(col.sort) : undefined,
                style: sortable ? { cursor: 'pointer', userSelect: 'none' } : undefined,
              }, col.label + (sortable ? sortIndicator(col.sort) : ''));
            })
          )),
          React.createElement('tbody', null,
            filteredRows.map((hand) => {
              const isSelected = selectedId && hand.handId === selectedId;
              const rowStyle = { cursor: 'pointer' };
              if (isSelected) {
                rowStyle.background = '#e0f2fe';
              }
              return React.createElement('tr', {
                key: hand.handId,
                onClick: () => onSelect?.(hand.handId),
                style: rowStyle,
              }, columns.map((col) => React.createElement('td', { key: col.key }, col.render(hand))));
            }))
        );

    const clearDrill = () => setDrill(null);

    return Panel({
      title: 'Hands',
      children: React.createElement(React.Fragment, null,
        React.createElement('div', { className: 'body', style: { marginBottom: 8, display: 'flex', flexWrap: 'wrap', gap: 8 } }, [
          React.createElement('input', { key: 'search', placeholder: 'Search by table, player, hand ID', value: q, onChange: (ev) => setQ(ev.target.value), style: { flex: '1 1 220px' } }),
          React.createElement('select', { key: 'result', value: filters.result, onChange: (ev) => updateFilter('result')(ev.target.value), style: { flex: '0 0 140px' } }, [
            React.createElement('option', { value: 'all', key: 'all' }, 'All results'),
            React.createElement('option', { value: 'won', key: 'won' }, 'Hero won'),
            React.createElement('option', { value: 'lost', key: 'lost' }, 'Hero lost'),
            React.createElement('option', { value: 'breakeven', key: 'breakeven' }, 'Break-even'),
          ]),
          React.createElement('select', { key: 'stake', value: filters.stake, onChange: (ev) => updateFilter('stake')(ev.target.value), style: { flex: '0 0 150px' } },
            stakes.map((opt) => React.createElement('option', { key: opt.value, value: opt.value }, opt.label))
          ),
          React.createElement('input', { key: 'minBb', type: 'number', placeholder: 'Min BB', value: filters.minBB, onChange: (ev) => updateFilter('minBB')(ev.target.value), style: { width: 90 } }),
          React.createElement('input', { key: 'maxBb', type: 'number', placeholder: 'Max BB', value: filters.maxBB, onChange: (ev) => updateFilter('maxBB')(ev.target.value), style: { width: 90 } }),
          React.createElement('input', { key: 'from', type: 'date', value: filters.from, onChange: (ev) => updateFilter('from')(ev.target.value), style: { flex: '0 0 150px' } }),
          React.createElement('input', { key: 'to', type: 'date', value: filters.to, onChange: (ev) => updateFilter('to')(ev.target.value), style: { flex: '0 0 150px' } }),
          React.createElement('button', { key: 'currency', type: 'button', onClick: toggleCurrency, style: { flex: '0 0 140px' } }, currency === 'usd' ? 'Switch to BB' : 'Switch to USD'),
          React.createElement('button', { key: 'reset', type: 'button', onClick: resetFilters, style: { flex: '0 0 auto' } }, 'Reset'),
        ]),
        drill ? React.createElement('div', { className: 'body', style: { marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 } }, [
          React.createElement('strong', { key: 'label' }, 'Quick filter:'),
          React.createElement('span', { key: 'value', className: 'muted' }, drill.type === 'position' ? `Position = ${drill.position}` : drill.type === 'opponent' ? `Opponent = ${drill.player}` : drill.type === 'stake' ? `Stake = ${drill.stake}` : 'Custom'),
          React.createElement('button', { key: 'clear', type: 'button', onClick: clearDrill }, 'Clear'),
        ]) : null,
        React.createElement('div', { className: 'body' }, body)
      ),
    });
  }

  function BrowserView({ selectedHandId, onSelectHand }) {
    const React = window.React;
    const [selectedId, setSelectedId] = React.useState(null);
    React.useEffect(() => {
      if (selectedHandId && selectedHandId !== selectedId) {
        setSelectedId(selectedHandId);
      }
    }, [selectedHandId, selectedId]);
    const handleSelect = (handId) => {
      setSelectedId(handId);
      if (onSelectHand) onSelectHand(handId);
    };
    const { data: hand } = useAsync(() => selectedId ? window.api?.getHand(selectedId) : null, [selectedId]);
    return React.createElement('div', { className: 'container' },
      React.createElement(HandList, { onSelect: handleSelect, selectedId }),
      React.createElement(HandReplayer, { hand })
    );
  }



  function Dashboard() {
    const React = window.React;
    const bump = useDataUpdatedBump();
    const ReactEl = React.createElement;
    const DEFAULT_GRAPH_LIMIT = 10000;
    const [graphFilters, setGraphFilters] = React.useState({
      limit: DEFAULT_GRAPH_LIMIT,
      stake: 'all',
      position: 'all',
      showdown: 'all',
      result: 'all',
      order: 'oldest',
      from: '',
      to: '',
    });
    const [graphCurrency, setGraphCurrency] = React.useState('usd');
    const [visibleCount, setVisibleCount] = React.useState(null);
    const [graphData, setGraphData] = React.useState(null);
    const [heroName, setHeroName] = React.useState(null);
    const [heroStatsCache, setHeroStatsCache] = React.useState(null);
    const [heroCollapsed, setHeroCollapsed] = React.useState({});
    const [compareSnapshot, setCompareSnapshot] = React.useState(null);
    const canvasRef = React.useRef(null);
    const chartRef = React.useRef(null);
    const positionalCanvasRef = React.useRef(null);
    const positionalChartRef = React.useRef(null);
    const vsHeroCanvasRef = React.useRef(null);
    const vsHeroChartRef = React.useRef(null);
    const lastTimelineLength = React.useRef(0);

    React.useEffect(() => {
      let alive = true;
      if (!window.api?.heroName) return;
      window.api.heroName().then((name) => { if (alive) setHeroName(name || null); }).catch(() => {});
      return () => { alive = false; };
    }, []);

    React.useEffect(() => {
      if (!window.__pub?.on) return undefined;
      const off = window.__pub.on('stats:compareUpdate', (payload) => setCompareSnapshot(payload || null));
      return () => { if (typeof off === 'function') off(); };
    }, []);

    const request = React.useMemo(() => {
      const payload = {
        limit: graphFilters.limit > 0 ? graphFilters.limit : 0,
        showdown: graphFilters.showdown,
        result: graphFilters.result,
        order: graphFilters.order,
      };
      if (graphFilters.stake && graphFilters.stake !== 'all') payload.stakes = [graphFilters.stake];
      if (graphFilters.position && graphFilters.position !== 'all') payload.positions = [graphFilters.position];
      if (graphFilters.from) payload.from = graphFilters.from;
      if (graphFilters.to) payload.to = graphFilters.to;
      return payload;
    }, [graphFilters]);

    const { data, loading, error } = useAsync(() => window.api?.heroGraphData(request) ?? null, [request, bump]);

    React.useEffect(() => { if (data) setGraphData(data); }, [data]);

    const heroStatsRequest = React.useMemo(() => (heroName ? { limit: 1, player: heroName } : null), [heroName]);
    const { data: heroStatsData, loading: heroStatsLoading, error: heroStatsError } = useAsync(() => {
      if (!heroStatsRequest || !window.api?.listStats) return null;
      return window.api.listStats(heroStatsRequest);
    }, [heroStatsRequest, bump]);

    const heroStatsRow = React.useMemo(() => {
      if (Array.isArray(heroStatsData) && heroStatsData.length) return heroStatsData[0];
      return null;
    }, [heroStatsData]);

    React.useEffect(() => { if (heroStatsRow) setHeroStatsCache(heroStatsRow); }, [heroStatsRow]);

    const heroStatsForDisplay = heroStatsRow || heroStatsCache;

    const displayData = data || graphData;
    const timeline = displayData?.timeline || [];
    const plotted = displayData?.plotted ?? timeline.length;
    const totalHands = displayData?.totalHands ?? plotted;

    React.useEffect(() => {
      const previousLength = lastTimelineLength.current || 0;
      lastTimelineLength.current = timeline.length;
      if (!timeline.length) { setVisibleCount(0); return; }
      setVisibleCount((prev) => {
        if (!prev) return timeline.length;
        if (prev > timeline.length) return timeline.length;
        if (previousLength && prev === previousLength && timeline.length > previousLength) {
          return timeline.length;
        }
        return prev;
      });
    }, [timeline]);

    const effectiveCount = timeline.length ? Math.max(1, Math.min(visibleCount || timeline.length, timeline.length)) : 0;
    const visibleTimeline = effectiveCount ? timeline.slice(-effectiveCount) : timeline;

    const MAX_GRAPH_POINTS = 3000;
    let chartTimeline = visibleTimeline;
    if (visibleTimeline.length > MAX_GRAPH_POINTS) {
      chartTimeline = [];
      const lastIdx = visibleTimeline.length - 1;
      const step = lastIdx / (MAX_GRAPH_POINTS - 1);
      for (let i = 0; i < MAX_GRAPH_POINTS; i++) {
        const srcIdx = Math.min(lastIdx, Math.round(i * step));
        chartTimeline.push(visibleTimeline[srcIdx]);
      }
      chartTimeline[chartTimeline.length - 1] = visibleTimeline[lastIdx];
    }

    const datasetFrom = (selector) => chartTimeline.map((point) => ({ x: Number(point.index) || 0, y: selector(point) }));
    const primarySeries = datasetFrom((point) => graphCurrency === 'bb' ? Number(point.cumBB || 0) : Number(point.cumUSD || 0));
    const preRakeSeries = datasetFrom((point) => graphCurrency === 'bb' ? Number(point.cumPreRakeBB || 0) : Number(point.cumPreRakeUSD || 0));
    const showdownSeries = datasetFrom((point) => graphCurrency === 'bb' ? Number(point.cumShowdownBB || 0) : Number(point.cumShowdownUSD || 0));
    const nonShowdownSeries = datasetFrom((point) => graphCurrency === 'bb' ? Number(point.cumNonShowdownBB || 0) : Number(point.cumNonShowdownUSD || 0));
    const handIndexMap = new Map(chartTimeline.map((point) => [Number(point.index) || 0, point]));

    const handleNavigateToHand = React.useCallback((handId) => {
      if (!handId) return;
      try { setActiveTab('browser'); } catch {}
      if (window.__pub?.emit) {
        window.__pub.emit('graph:selectHand', { handId });
      }
    }, []);

    React.useEffect(() => {
      if (!canvasRef.current || !window.Chart) return undefined;
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
      if (!chartTimeline.length) return undefined;
      const minHandIndex = chartTimeline.length ? chartTimeline[0].index : 0;
      const maxHandIndex = chartTimeline.length ? chartTimeline[chartTimeline.length - 1].index : 0;
      const ctx = canvasRef.current.getContext('2d');
      const datasets = [
        {
          label: graphCurrency === 'bb' ? 'Cumulative BB' : 'Cumulative USD',
          data: primarySeries,
          borderColor: '#22c55e',
          backgroundColor: 'rgba(34,197,94,0.12)',
          borderWidth: 2,
          pointRadius: 0,
          pointHitRadius: 6,
          tension: 0.25,
        },
        {
          label: graphCurrency === 'bb' ? 'Pre-Rake BB' : 'Pre-Rake USD',
          data: preRakeSeries,
          borderColor: '#92400e',
          backgroundColor: 'rgba(146,64,14,0.16)',
          borderWidth: 2,
          pointRadius: 0,
          pointHitRadius: 6,
          tension: 0.25,
        },
        {
          label: graphCurrency === 'bb' ? 'Showdown BB' : 'Showdown USD',
          data: showdownSeries,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59,130,246,0.14)',
          borderWidth: 2,
          pointRadius: 0,
          pointHitRadius: 6,
          tension: 0.25,
        },
        {
          label: graphCurrency === 'bb' ? 'Non-showdown BB' : 'Non-showdown USD',
          data: nonShowdownSeries,
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239,68,68,0.14)',
          borderWidth: 2,
          pointRadius: 0,
          pointHitRadius: 6,
          tension: 0.25,
          borderDash: [6, 4],
        },
      ];
      chartRef.current = new window.Chart(ctx, {
        type: 'line',
        data: { datasets },
        options: {
          responsive: true,
          interaction: { mode: 'index', intersect: false, axis: 'x' },
          maintainAspectRatio: false,
          animation: false,
          layout: { padding: { right: 24, left: 8 } },
          onClick: (_event, elements, chart) => {
            if (!elements?.length) return;
            const element = elements[0];
            const dataset = chart.data.datasets?.[element.datasetIndex];
            const dataPoint = dataset?.data?.[element.index];
            const handValue = Number(dataPoint?.x);
            const rounded = Math.round(handValue);
            const point = handIndexMap.get(rounded) || handIndexMap.get(handValue);
            if (point?.handId) handleNavigateToHand(point.handId);
          },
          scales: {
            x: { type: 'linear', title: { display: true, text: 'Hand #' }, min: minHandIndex, max: maxHandIndex, grid: { display: false } },
            y: { title: { display: true, text: graphCurrency === 'bb' ? 'BB' : 'USD' } },
          },
        },
      });
      return () => {
        if (chartRef.current) {
          chartRef.current.destroy();
          chartRef.current = null;
        }
      };
    }, [primarySeries, preRakeSeries, showdownSeries, nonShowdownSeries, graphCurrency, chartTimeline, handIndexMap, handleNavigateToHand]);

    const positionalData = React.useMemo(() => {
      const positional = heroStatsForDisplay?.positional;
      if (!positional || typeof positional !== 'object') return null;
      const entries = Object.entries(positional).map(([position, info]) => ({
        position,
        vpip: Number(info?.VPIP_pct) || 0,
        pfr: Number(info?.PFR_pct) || 0,
        hands: Number(info?.hands) || 0,
      })).filter((entry) => entry.hands > 0);
      entries.sort((a, b) => b.hands - a.hands);
      return entries;
    }, [heroStatsForDisplay]);

    React.useEffect(() => {
      if (positionalChartRef.current) {
        positionalChartRef.current.destroy();
        positionalChartRef.current = null;
      }
      if (!window.Chart || !positionalCanvasRef.current || !positionalData || !positionalData.length) return undefined;
      const ctx = positionalCanvasRef.current.getContext('2d');
      positionalChartRef.current = new window.Chart(ctx, {
        type: 'bar',
        data: {
          labels: positionalData.map((entry) => entry.position),
          datasets: [
            { label: 'VPIP%', data: positionalData.map((entry) => Number(entry.vpip.toFixed(1))), backgroundColor: 'rgba(59,130,246,0.35)', borderColor: '#3b82f6', borderWidth: 1 },
            { label: 'PFR%', data: positionalData.map((entry) => Number(entry.pfr.toFixed(1))), backgroundColor: 'rgba(16,185,129,0.35)', borderColor: '#10b981', borderWidth: 1 },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom' } },
          scales: { y: { beginAtZero: true, ticks: { callback: (value) => `${value}%` } } },
        },
      });
      return () => {
        if (positionalChartRef.current) {
          positionalChartRef.current.destroy();
          positionalChartRef.current = null;
        }
      };
    }, [positionalData]);

    const vsHeroData = React.useMemo(() => {
      const vsHero = heroStatsForDisplay?.vsHero;
      if (!vsHero) return null;
      const hands = Number(vsHero.hands) || 0;
      if (!hands) return null;
      const wins = Number(vsHero.showdown_wins || 0);
      const showdowns = Number(vsHero.showdowns || 0);
      const losses = Math.max(0, showdowns - wins);
      const nonShowdown = Math.max(0, hands - showdowns);
      return { hands, wins, losses, nonShowdown };
    }, [heroStatsForDisplay]);

    React.useEffect(() => {
      if (vsHeroChartRef.current) {
        vsHeroChartRef.current.destroy();
        vsHeroChartRef.current = null;
      }
      if (!window.Chart || !vsHeroCanvasRef.current || !vsHeroData) return undefined;
      const ctx = vsHeroCanvasRef.current.getContext('2d');
      vsHeroChartRef.current = new window.Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Showdown Wins', 'Showdown Losses', 'Non-showdown'],
          datasets: [
            { data: [vsHeroData.wins, vsHeroData.losses, vsHeroData.nonShowdown], backgroundColor: ['#22c55e', '#ef4444', '#94a3b8'] },
          ],
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } },
      });
      return () => {
        if (vsHeroChartRef.current) {
          vsHeroChartRef.current.destroy();
          vsHeroChartRef.current = null;
        }
      };
    }, [vsHeroData]);

    const summary = displayData?.summary || {
      netUSD: 0,
      netBB: 0,
      rakeUSD: 0,
      jackpotUSD: 0,
      totalRakeUSD: 0,
      preRakeUSD: 0,
      preRakeBB: 0,
      preRakeBBPer100: 0,
      totalRakeBB: 0,
      totalRakeBBPer100: 0,
      bbPer100: 0,
    };

    const statBox = (label, value, hint) => ReactEl('div', {
      style: { padding: '8px 10px', background: 'rgba(15,23,42,0.08)', borderRadius: 8 }
    }, [
      ReactEl('div', { className: 'muted', style: { fontSize: 12, textTransform: 'uppercase' } }, label),
      ReactEl('div', { style: { fontWeight: 600, fontSize: 16 } }, value),
      hint ? ReactEl('div', { className: 'muted', style: { fontSize: 11, marginTop: 2 } }, hint) : null
    ]);

    const handleFilterChange = (field) => (value) => setGraphFilters((prev) => ({ ...prev, [field]: value }));
    const sliderMax = timeline.length || 1;

    if (!window.api) return Panel({ title: 'Dashboard', children: 'Preload not loaded.' });
    if (!displayData && loading) return Panel({ title: 'Dashboard', children: 'Loading...' });
    if (!displayData && error) return Panel({ title: 'Dashboard', children: `Error: ${String(error)}` });
    if (!displayData) return Panel({ title: 'Dashboard', children: 'No graph data available.' });

    return Panel({
      title: 'Dashboard',
      children: ReactEl(React.Fragment, null,
        ReactEl('div', {
          className: 'body',
          style: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginBottom: 8 },
        }, [
          ReactEl('div', { className: 'muted' }, totalHands ? `Loaded ${plotted} of ${totalHands} hands` : `Loaded ${plotted} hands`),
          ReactEl('button', { type: 'button', onClick: () => setGraphFilters((prev) => ({ ...prev, limit: prev.limit > 0 ? prev.limit + 10000 : 10000 })), disabled: loading, style: { flex: '0 0 auto' } }, 'Load More'),
          ReactEl('button', { type: 'button', onClick: () => setGraphFilters((prev) => ({ ...prev, limit: 0 })), disabled: loading, style: { flex: '0 0 auto' } }, 'Load All'),
          ReactEl('select', { value: graphFilters.stake, onChange: (ev) => handleFilterChange('stake')(ev.target.value), style: { flex: '0 0 160px' } }, [
            ReactEl('option', { value: 'all', key: 'all' }, 'All stakes'),
            ...(Array.isArray(displayData?.available?.stakes) ? displayData.available.stakes : []).map((opt) => ReactEl('option', { key: opt.key, value: opt.key }, opt.label || formatStakeLabel(opt.key))),
          ]),
          ReactEl('select', { value: graphFilters.position, onChange: (ev) => handleFilterChange('position')(ev.target.value), style: { flex: '0 0 150px' } }, [
            ReactEl('option', { value: 'all', key: 'all' }, 'All positions'),
            ...(Array.isArray(displayData?.available?.positions) ? displayData.available.positions : []).map((opt) => ReactEl('option', { key: opt, value: opt }, opt)),
          ]),
          ReactEl('select', { value: graphFilters.showdown, onChange: (ev) => handleFilterChange('showdown')(ev.target.value), style: { flex: '0 0 160px' } }, [
            ReactEl('option', { value: 'all', key: 'all' }, 'All hands'),
            ReactEl('option', { value: 'showdown', key: 'showdown' }, 'Showdown only'),
            ReactEl('option', { value: 'nonshowdown', key: 'nonshowdown' }, 'Non-showdown only'),
          ]),
          ReactEl('select', { value: graphFilters.result, onChange: (ev) => handleFilterChange('result')(ev.target.value), style: { flex: '0 0 150px' } }, [
            ReactEl('option', { value: 'all', key: 'all' }, 'All results'),
            ReactEl('option', { value: 'won', key: 'won' }, 'Won'),
            ReactEl('option', { value: 'lost', key: 'lost' }, 'Lost'),
            ReactEl('option', { value: 'breakeven', key: 'breakeven' }, 'Break-even'),
          ]),
          ReactEl('button', { type: 'button', onClick: () => setGraphFilters({ limit: DEFAULT_GRAPH_LIMIT, stake: 'all', position: 'all', showdown: 'all', result: 'all', order: 'oldest', from: '', to: '' }), style: { flex: '0 0 auto' } }, 'Reset Filters'),
          ReactEl('select', { value: graphCurrency, onChange: (ev) => setGraphCurrency(ev.target.value), style: { flex: '0 0 120px' } }, [
            ReactEl('option', { value: 'usd', key: 'usd' }, 'USD'),
            ReactEl('option', { value: 'bb', key: 'bb' }, 'BB'),
          ]),
        ]),
        ReactEl('div', { className: 'body', style: { display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', marginBottom: 12 } }, [
          statBox('Net USD', formatUSD(summary.netUSD), `Net BB: ${formatNumber(summary.netBB, 2)}`),
          statBox('bb/100', formatNumber(summary.bbPer100, 2)),
          statBox('Rake USD', formatUSD(summary.rakeUSD), `Jackpot: ${formatUSD(summary.jackpotUSD)}`),
          statBox('Pre-rake USD', formatUSD(summary.preRakeUSD), `${formatNumber(summary.preRakeBBPer100, 2)} bb/100`),
        ]),
        heroStatsForDisplay ? Panel({
          title: 'Hero Snapshot',
          children: buildPlayerDetailContent(React, heroStatsForDisplay, { includePositional: false, collapsed: heroCollapsed, onToggleSection: (key, next) => setHeroCollapsed((prev) => ({ ...prev, [key]: next })), quickDrill: (payload) => { try { setActiveTab('stats'); } catch {} quickDrillFromDashboard(payload); }, isHero: true }),
        }) : heroStatsLoading ? Panel({ title: 'Hero Snapshot', children: 'Loading...' }) : heroStatsError ? Panel({ title: 'Hero Snapshot', children: `Error: ${String(heroStatsError)}` }) : null,
        compareSnapshot && compareSnapshot.stats ? Panel({
          title: `Pinned Player Snapshot (${compareSnapshot.player})`,
          children: buildPlayerDetailContent(React, compareSnapshot.stats, { includePositional: false, collapsed: {}, onToggleSection: () => {}, quickDrill: (payload) => { try { setActiveTab('stats'); } catch {} quickDrillFromDashboard(payload); }, isHero: heroName && namesEqual(compareSnapshot.player, heroName) }),
        }) : null,
        ReactEl('div', { className: 'body', style: { height: 320 } }, ReactEl('canvas', { ref: canvasRef, style: { width: '100%', height: '100%' } })),
        positionalData && positionalData.length ? Panel({
          title: 'Positional VPIP vs PFR',
          children: ReactEl('div', { style: { height: 240 } }, ReactEl('canvas', { ref: positionalCanvasRef, style: { width: '100%', height: '100%' } })),
        }) : null,
        vsHeroData ? Panel({
          title: 'Vs-Hero Outcomes',
          children: ReactEl('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } }, [
            ReactEl('div', { style: { height: 220 } }, ReactEl('canvas', { ref: vsHeroCanvasRef, style: { width: '100%', height: '100%' } })),
            ReactEl('div', { style: { display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13, color: '#4b5563' } }, [
              ReactEl('div', null, `Hands: ${vsHeroData.hands.toLocaleString()}`),
              ReactEl('div', null, `Showdown Wins: ${vsHeroData.wins.toLocaleString()}`),
              ReactEl('div', null, `Showdown Losses: ${vsHeroData.losses.toLocaleString()}`),
              ReactEl('div', null, `Non-showdown: ${vsHeroData.nonShowdown.toLocaleString()}`),
            ]),
          ]),
        }) : null,
      ),
    });

    function quickDrillFromDashboard(payload) {
      if (!payload) return;
      try { setActiveTab('browser'); } catch {}
      window.__pub?.emit?.('browser:drill', payload);
    }
  }



  function wireButtons() {
    const hudBtn = document.getElementById('hud-toggle');
    if (hudBtn && !hudBtn.__wired) {
      hudBtn.__wired = true;
      hudBtn.addEventListener('click', async () => {
        try {
          const res = await window.hud?.toggle?.();
          if (res && res.success) {
            hudBtn.textContent = res.active ? 'HUD: ON' : 'HUD: OFF';
            hudBtn.classList.toggle('active', !!res.active);
          }
        } catch (error) {
          console.error('HUD toggle failed', error);
        }
      });
      window.hud?.status?.().then((res) => {
        if (res?.success) {
          hudBtn.textContent = res.active ? 'HUD: ON' : 'HUD: OFF';
          hudBtn.classList.toggle('active', !!res.active);
        }
      }).catch(() => {});
    }

    const importButtons = [
      ['open-import', () => { showOverlay(); }],
      ['import-close', () => { hideOverlay(); }],
      ['import-clear', () => { clearOverlay(); }],
      ['btn-import', async () => {
        try {
          setProgress(0);
          const folders = await window.importer?.chooseFolders?.();
          if (!folders || !folders.length) return;
          await window.importer?.start?.(folders, { overwrite: !!document.getElementById('import-overwrite')?.checked });
        } catch (error) {
          console.error('Import failed', error);
        }
      }],
      ['btn-testfile', async () => {
        try {
          const file = await window.filetester?.chooseFile?.();
          if (!file) return;
          await window.filetester?.testFile?.(file);
        } catch (error) {
          console.error('File test failed', error);
        }
      }],
      ['btn-testfolder', async () => {
        try {
          const folder = await window.foldertester?.chooseFolder?.();
          if (!folder) return;
          await window.foldertester?.scanFolder?.(folder);
        } catch (error) {
          console.error('Folder scan failed', error);
        }
      }],
    ];
    importButtons.forEach(([id, handler]) => {
      const btn = document.getElementById(id);
      if (btn && !btn.__wired) {
        btn.__wired = true;
        btn.addEventListener('click', (event) => {
          event.preventDefault();
          Promise.resolve().then(handler);
        });
      }
    });

    const tabStats = document.getElementById('tab-stats');
    const tabBrowser = document.getElementById('tab-browser');
    const tabDashboard = document.getElementById('tab-dashboard');
    if (tabStats && !tabStats.__wired) {
      tabStats.__wired = true;
      tabStats.addEventListener('click', () => setActiveTab('stats'));
    }
    if (tabBrowser && !tabBrowser.__wired) {
      tabBrowser.__wired = true;
      tabBrowser.addEventListener('click', () => setActiveTab('browser'));
    }
    if (tabDashboard && !tabDashboard.__wired) {
      tabDashboard.__wired = true;
      tabDashboard.addEventListener('click', () => setActiveTab('dashboard'));
    }

    const stampHost = document.querySelector('header .right');
    if (stampHost && !stampHost.__buildStamp) {
      stampHost.__buildStamp = true;
      const span = document.createElement('span');
      span.className = 'muted';
      span.textContent = `Build: ${new Date().toLocaleString()}`;
      stampHost.appendChild(span);
    }

    const preloadOk = document.getElementById('preload-ok');
    const preloadBad = document.getElementById('preload-bad');
    const ready = !!(window.bridgeStatus && window.bridgeStatus.ok);
    if (preloadOk && preloadBad) {
      preloadOk.style.display = ready ? 'inline-block' : 'none';
      preloadBad.style.display = ready ? 'none' : 'inline-block';
    }
  }

  document.addEventListener('DOMContentLoaded', wireButtons);
  wireButtons();
  window.__rebinder = window.__rebinder || setInterval(wireButtons, 1000);

  function setActiveTab(tab) {
    window.__setTab?.(tab);
  }

  function App() {
    const React = window.React;
    const [tab, setTab] = React.useState(() => {
      if (typeof window !== 'undefined') {
        try { return window.localStorage?.getItem('ui.tab') || 'stats'; } catch {}
      }
      return 'stats';
    });
    const [selectedHandId, setSelectedHandId] = React.useState(null);

    React.useEffect(() => {
      window.__setTab = (next) => setTab((prev) => {
        const value = next || 'stats';
        if (typeof window !== 'undefined') {
          try { window.localStorage?.setItem('ui.tab', value); } catch {}
        }
        const ids = ['tab-stats', 'tab-browser', 'tab-dashboard'];
        ids.forEach((id) => {
          const el = document.getElementById(id);
          if (!el) return;
          const isActive = (id === 'tab-stats' && value === 'stats') || (id === 'tab-browser' && value === 'browser') || (id === 'tab-dashboard' && value === 'dashboard');
          el.classList.toggle('active', isActive);
        });
        return value;
      });
      return () => { window.__setTab = null; };
    }, []);

    React.useEffect(() => {
      if (typeof window !== 'undefined') {
        try { window.localStorage?.setItem('ui.tab', tab); } catch {}
      }
    }, [tab]);

    React.useEffect(() => {
      const ids = ['tab-stats', 'tab-browser', 'tab-dashboard'];
      ids.forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        const isActive = (id === 'tab-stats' && tab === 'stats') || (id === 'tab-browser' && tab === 'browser') || (id === 'tab-dashboard' && tab === 'dashboard');
        el.classList.toggle('active', isActive);
      });
    }, [tab]);

    let content;
    if (tab === 'browser') {
      content = React.createElement(BrowserView, { selectedHandId, onSelectHand: setSelectedHandId });
    } else if (tab === 'dashboard') {
      content = React.createElement(Dashboard);
    } else {
      content = React.createElement(StatsView);
    }
    return content;
  }

  const rootEl = document.getElementById('root');
  if (rootEl && window.ReactDOM?.createRoot) {
    const root = window.ReactDOM.createRoot(rootEl);
    root.render(React.createElement(App));
  }
})();
