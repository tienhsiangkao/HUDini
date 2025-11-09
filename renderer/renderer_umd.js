// renderer_umd.js v2025-10-18

(function () {
  // Enhanced Toast Notification System
  function showToast(message, type = 'info', duration = 3000, options = {}) {
    const container = document.getElementById('toast-container') || createToastContainer();
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ',
      loading: '⟳'
    };
    
    const colors = {
      success: '#22c55e',
      error: '#ef4444',
      warning: '#f59e0b',
      info: '#3b82f6',
      loading: '#8b5cf6'
    };
    
    const baseStyles = `
      padding: 12px 20px;
      margin: 8px 0;
      background: ${colors[type] || colors.info};
      color: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 14px;
      font-weight: 500;
      animation: slideIn 0.3s ease;
      cursor: pointer;
      min-width: 280px;
      max-width: 420px;
    `;
    
    toast.style.cssText = baseStyles;
    
    // Build toast content
    const icon = `<span style="font-size: 18px; font-weight: bold; ${type === 'loading' ? 'animation: spin 1s linear infinite;' : ''}">${icons[type] || icons.info}</span>`;
    const text = `<span style="flex: 1; white-space: pre-line;">${message}</span>`;
    
    // Add progress bar if requested
    let progressBar = '';
    if (options.progress !== undefined) {
      progressBar = `
        <div style="position: absolute; bottom: 0; left: 0; right: 0; height: 3px; background: rgba(255,255,255,0.3); border-radius: 0 0 8px 8px;">
          <div class="toast-progress" style="height: 100%; background: white; width: ${options.progress}%; transition: width 0.3s ease;"></div>
        </div>
      `;
      toast.style.position = 'relative';
      toast.style.paddingBottom = '15px';
    }
    
    // Security: Build DOM safely to prevent XSS
    const toastContent = document.createElement('div');
    toastContent.style.display = 'flex';
    toastContent.style.alignItems = 'center';
    toastContent.style.gap = '12px';
    toastContent.style.width = '100%';
    
    // Add icon (safe HTML)
    if (icon) {
      const iconSpan = document.createElement('span');
      iconSpan.innerHTML = icon;
      toastContent.appendChild(iconSpan);
    }
    
    // Add text (safe - using textContent)
    const textSpan = document.createElement('span');
    textSpan.textContent = typeof text === 'string' ? text : String(text);
    textSpan.style.flex = '1';
    toastContent.appendChild(textSpan);
    
    // Add action buttons if provided
    if (options.actions && Array.isArray(options.actions)) {
      const actionsDiv = document.createElement('div');
      actionsDiv.style.display = 'flex';
      actionsDiv.style.gap = '6px';
      actionsDiv.style.marginLeft = 'auto';
      
      options.actions.forEach(action => {
        const button = document.createElement('button');
        button.textContent = action.label;
        button.style.cssText = 'background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); color: white; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600; transition: all 0.2s;';
        button.onclick = () => {
          if (action.onClick) {
            action.onClick();
          }
          removeToast(toast);
        };
        actionsDiv.appendChild(button);
      });
      
      toastContent.appendChild(actionsDiv);
    }
    
    toast.appendChild(toastContent);
    
    // Add progress bar if requested
    if (progressBar) {
      const progressDiv = document.createElement('div');
      progressDiv.innerHTML = progressBar;
      toast.appendChild(progressDiv);
    }
    
    container.appendChild(toast);
    
    // Click to dismiss (but not on action buttons)
    toast.onclick = (e) => {
      if (e.target.tagName !== 'BUTTON') {
        removeToast(toast);
      }
    };
    
    // Auto-dismiss
    if (duration > 0 && type !== 'loading') {
      setTimeout(() => {
        if (toast.parentNode) {
          removeToast(toast);
        }
      }, duration);
    }
    
    // Store reference for updates
    toast.__id = options.id || Date.now() + Math.random();
    
    return toast;
  }
  
  function removeToast(toast) {
    if (!toast || !toast.style) return; // Safety check
    toast.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => {
      if (toast.parentNode) toast.remove();
    }, 300);
  }
  
  // Update existing toast (useful for progress updates)
  function updateToast(toastId, updates) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = Array.from(container.children).find(t => t.__id === toastId);
    if (!toast) return;
    
    if (updates.message) {
      const textSpan = toast.querySelector('span:nth-child(2)');
      if (textSpan) textSpan.textContent = updates.message;
    }
    
    if (updates.progress !== undefined) {
      const progressBar = toast.querySelector('.toast-progress');
      if (progressBar) {
        progressBar.style.width = updates.progress + '%';
      }
    }
    
    if (updates.type) {
      // Can change toast type/color
      const colors = { success: '#22c55e', error: '#ef4444', warning: '#f59e0b', info: '#3b82f6' };
      toast.style.background = colors[updates.type] || colors.info;
    }
    
    return toast;
  }
  
  // Add spin animation for loading toasts
  const spinStyle = document.createElement('style');
  spinStyle.textContent = `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(spinStyle);
  
  // CSV Formatting Function
  function formatStatsAsCSV(rows, columns) {
    // Generate CSV header from column labels
    const headers = columns.map(col => col.label).join(',');
    
    // Generate CSV rows
    const csvRows = rows.map(row => {
      return columns.map(col => {
        let value = col.render(row);
        // Handle null/undefined
        if (value === null || value === undefined || value === '') {
          return '';
        }
        // Convert to string and escape quotes
        value = String(value);
        // Remove any formatting characters or special markers
        value = value.replace(/[★†]/g, '').trim();
        // Escape quotes and wrap in quotes if contains comma or quote
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          value = '"' + value.replace(/"/g, '""') + '"';
        }
        return value;
      }).join(',');
    }).join('\n');
    
    return headers + '\n' + csvRows;
  }

  function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      pointer-events: none;
    `;
    container.style.pointerEvents = 'auto';
    document.body.appendChild(container);
    
    // Add CSS animations
    if (!document.getElementById('toast-styles')) {
      const style = document.createElement('style');
      style.id = 'toast-styles';
      style.textContent = `
        @keyframes slideIn {
          from { transform: translateX(400px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(400px); opacity: 0; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes chipSlide {
          from { transform: translateX(-10px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.9; }
        }
        @keyframes cardFlip {
          0% { transform: rotateY(90deg) scale(0.8); opacity: 0; }
          50% { transform: rotateY(45deg) scale(0.9); }
          100% { transform: rotateY(0deg) scale(1); opacity: 1; }
        }
        @keyframes cardDeal {
          from { transform: translateY(-20px) scale(0.8); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes chipToPot {
          0% { transform: translateY(0) scale(1); opacity: 1; }
          50% { transform: translateY(-15px) scale(0.95); }
          100% { transform: translateY(-30px) scale(0.9); opacity: 0.7; }
        }
      `;
      document.head.appendChild(style);
    }
    
    return container;
  }
  
  // Expose toast functions globally
  window.__toast = showToast;
  window.__updateToast = updateToast;
  window.__removeToast = removeToast;

  // Loading Spinner Component
  function LoadingSpinner({ size = 'medium', color = '#3b82f6', message = '' }) {
    const React = window.React;
    
    const sizes = {
      small: { width: 20, height: 20, border: 2 },
      medium: { width: 40, height: 40, border: 4 },
      large: { width: 60, height: 60, border: 6 }
    };
    
    const { width, height, border } = sizes[size] || sizes.medium;
    
    return React.createElement('div', {
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12
      }
    }, [
      React.createElement('div', {
        key: 'spinner',
        style: {
          width,
          height,
          border: `${border}px solid rgba(59, 130, 246, 0.1)`,
          borderTopColor: color,
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }
      }),
      message ? React.createElement('div', {
        key: 'message',
        style: {
          fontSize: 13,
          color: '#6b7280',
          fontWeight: 500
        }
      }, message) : null
    ]);
  }

  // Progress Bar Component
  function ProgressBar({ progress = 0, showPercentage = true, height = 8, color = '#3b82f6', message = '' }) {
    const React = window.React;
    
    return React.createElement('div', {
      style: { width: '100%' }
    }, [
      message ? React.createElement('div', {
        key: 'message',
        style: {
          marginBottom: 8,
          fontSize: 13,
          color: '#6b7280',
          fontWeight: 500,
          display: 'flex',
          justifyContent: 'space-between'
        }
      }, [
        React.createElement('span', { key: 'text' }, message),
        showPercentage ? React.createElement('span', { 
          key: 'percent',
          style: { fontWeight: 600, color: '#374151' }
        }, `${Math.round(progress)}%`) : null
      ]) : null,
      React.createElement('div', {
        key: 'bar',
        style: {
          width: '100%',
          height,
          background: '#e5e7eb',
          borderRadius: height / 2,
          overflow: 'hidden',
          position: 'relative'
        }
      }, [
        React.createElement('div', {
          key: 'fill',
          style: {
            width: `${Math.min(100, Math.max(0, progress))}%`,
            height: '100%',
            background: `linear-gradient(90deg, ${color}, ${color}dd)`,
            borderRadius: height / 2,
            transition: 'width 0.3s ease',
            position: 'relative',
            overflow: 'hidden'
          }
        }, [
          React.createElement('div', {
            key: 'shine',
            style: {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
              animation: progress < 100 ? 'progressShine 1.5s ease-in-out infinite' : 'none'
            }
          })
        ])
      ])
    ]);
  }

  // Skeleton Loader Component
  function SkeletonLoader({ width = '100%', height = 20, borderRadius = 4, count = 1, gap = 8 }) {
    const React = window.React;
    
    return React.createElement('div', {
      style: { display: 'flex', flexDirection: 'column', gap }
    }, Array.from({ length: count }).map((_, idx) => 
      React.createElement('div', {
        key: idx,
        style: {
          width,
          height,
          borderRadius,
          background: 'linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s ease-in-out infinite'
        }
      })
    ));
  }

  // Expose loading components globally
  window.LoadingSpinner = LoadingSpinner;
  window.ProgressBar = ProgressBar;
  window.SkeletonLoader = SkeletonLoader;

  // Smooth Panel Transition Hook
  function usePanelTransition(expanded) {
    const React = window.React;
    const [shouldRender, setShouldRender] = React.useState(expanded);
    const [animationClass, setAnimationClass] = React.useState('');
    
    React.useEffect(() => {
      if (expanded) {
        setShouldRender(true);
        // Small delay to ensure element is in DOM before animating
        setTimeout(() => setAnimationClass('fade-in'), 10);
      } else {
        setAnimationClass('');
        // Delay unmount to allow exit animation
        const timer = setTimeout(() => setShouldRender(false), 300);
        return () => clearTimeout(timer);
      }
    }, [expanded]);
    
    return { shouldRender, animationClass };
  }

  // Success Checkmark Component
  function SuccessCheckmark({ size = 60, color = '#22c55e', duration = 1000 }) {
    const React = window.React;
    const [visible, setVisible] = React.useState(true);
    
    React.useEffect(() => {
      const timer = setTimeout(() => setVisible(false), duration);
      return () => clearTimeout(timer);
    }, [duration]);
    
    if (!visible) return null;
    
    return React.createElement('div', {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'bounce 0.6s ease'
      }
    }, React.createElement('svg', {
      width: size,
      height: size,
      viewBox: '0 0 52 52',
      style: { display: 'block' }
    }, [
      React.createElement('circle', {
        key: 'circle',
        cx: 26,
        cy: 26,
        r: 25,
        fill: 'none',
        stroke: color,
        strokeWidth: 2
      }),
      React.createElement('path', {
        key: 'check',
        fill: 'none',
        stroke: color,
        strokeWidth: 3,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        strokeDasharray: 50,
        strokeDashoffset: 0,
        d: 'M14 27l7 7 16-16',
        style: { animation: 'checkmark 0.6s ease' }
      })
    ]));
  }

  // Expose transition utilities globally
  window.usePanelTransition = usePanelTransition;
  window.SuccessCheckmark = SuccessCheckmark;

  // Add enhanced CSS animations
  if (!document.getElementById('enhanced-animations')) {
    const style = document.createElement('style');
    style.id = 'enhanced-animations';
    style.textContent = `
      /* Loading animations */
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      
      @keyframes shimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
      
      @keyframes progressShine {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
      }
      
      /* Smooth transitions for all interactive elements */
      button, a, .clickable {
        transition: all 0.2s ease !important;
      }
      
      /* Hover effects for buttons */
      button:not(:disabled):hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
      }
      
      button:not(:disabled):active {
        transform: translateY(0);
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1) !important;
      }
      
      /* Card hover effects */
      .stat-card, .hand-card, .widget-card {
        transition: all 0.3s ease;
      }
      
      .stat-card:hover, .hand-card:hover, .widget-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
      }
      
      /* Panel expand/collapse animations */
      .panel-content {
        overflow: hidden;
        transition: max-height 0.3s ease, opacity 0.3s ease, padding 0.3s ease;
      }
      
      .panel-content-enter {
        max-height: 0;
        opacity: 0;
        padding-top: 0;
        padding-bottom: 0;
      }
      
      .panel-content-enter-active {
        max-height: 2000px;
        opacity: 1;
      }
      
      .panel-content-exit {
        max-height: 2000px;
        opacity: 1;
      }
      
      .panel-content-exit-active {
        max-height: 0;
        opacity: 0;
        padding-top: 0;
        padding-bottom: 0;
      }
      
      /* Fade in animation for content */
      .fade-in {
        animation: fadeIn 0.4s ease;
      }
      
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      
      /* Success checkmark animation */
      @keyframes checkmark {
        0% { stroke-dashoffset: 50; transform: scale(0); }
        50% { transform: scale(1.1); }
        100% { stroke-dashoffset: 0; transform: scale(1); }
      }
      
      /* Pulse animation for important elements */
      @keyframes pulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.05); opacity: 0.9; }
      }
      
      /* Bounce animation for notifications */
      @keyframes bounce {
        0%, 100% { transform: translateY(0); }
        25% { transform: translateY(-10px); }
        50% { transform: translateY(0); }
        75% { transform: translateY(-5px); }
      }
      
      /* Ripple effect */
      @keyframes ripple {
        0% { transform: scale(0); opacity: 0.6; }
        100% { transform: scale(2.5); opacity: 0; }
      }
      
      /* Glow effect for focused inputs */
      input:focus, select:focus, textarea:focus {
        outline: none;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        border-color: #3b82f6 !important;
        transition: all 0.2s ease;
      }
      
      /* Smooth scroll behavior */
      * {
        scroll-behavior: smooth;
      }
      
      /* Loading state opacity */
      .loading-opacity {
        opacity: 0.6;
        pointer-events: none;
        transition: opacity 0.3s ease;
      }
    `;
    document.head.appendChild(style);
  }

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
    const startPct = parseFloat(bar.style.width) || 0;
    if (bar._progressAnim) cancelAnimationFrame(bar._progressAnim);
    const duration = Math.max(200, Math.abs(targetPct - startPct) * 8 + 100);
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

  // Copy stats to clipboard
  function copyStatsToClipboard(stats) {
    if (!stats) return;
    const lines = [
      `Player: ${stats.player || 'Unknown'}`,
      `Hands: ${stats.hands || 0}`,
      `VPIP: ${stats.VPIP_pct || 0}%`,
      `PFR: ${stats.PFR_pct || 0}%`,
      `3Bet: ${stats.ThreeBet_pct || 0}%`,
      `AF: ${stats.AF || 0}`,
      `WTSD: ${stats.WTSD_pct || 0}%`,
      `WSD: ${stats.WSD_pct || 0}%`,
      `Net BB: ${stats.netBB || 0}`,
      `BB/100: ${stats.BBPer100 || 0}`,
    ];
    const text = lines.join('\n');
    navigator.clipboard.writeText(text).then(() => {
      if (window.__toast) window.__toast('Stats copied to clipboard!', 'success', 2000);
    }).catch(() => {
      if (window.__toast) window.__toast('Failed to copy stats', 'error');
    });
  }

  // User-friendly error messages
  function formatError(error) {
    if (!error) return 'An unknown error occurred';
    const errorStr = String(error);
    
    // Common error patterns with friendly messages
    if (errorStr.includes('ENOENT') || errorStr.includes('no such file')) {
      return 'Database file not found. Try importing some hands first.';
    }
    if (errorStr.includes('SQLITE') || errorStr.includes('database')) {
      return 'Database error. Try restarting the application.';
    }
    if (errorStr.includes('timeout') || errorStr.includes('ETIMEDOUT')) {
      return 'Request timed out. Please try again.';
    }
    if (errorStr.includes('network') || errorStr.includes('ECONNREFUSED')) {
      return 'Network connection failed. Check your connection.';
    }
    if (errorStr.includes('parse') || errorStr.includes('JSON')) {
      return 'Data parsing error. Some data may be corrupted.';
    }
    if (errorStr.includes('permission') || errorStr.includes('EACCES')) {
      return 'Permission denied. Check file permissions.';
    }
    
    // Return a cleaned version of the error
    return errorStr.length > 100 ? errorStr.slice(0, 100) + '...' : errorStr;
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
            color: 'var(--text-primary)',
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
        style: { fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' },
      }, title));
      const body = isCollapsed ? null : React.createElement('div', {
        id: `${sectionKey}-body`,
        style: { padding: pad ? '10px 12px 12px' : '0 12px 12px' },
      }, content);
      return React.createElement('div', {
        key: sectionKey,
        style: {
          border: '1px solid var(--border-default)',
          borderRadius: 10,
          overflow: 'hidden',
          background: 'var(--panel-bg)',
        },
      }, [
        React.createElement('div', {
          key: 'header',
          style: {
            display: 'flex',
            alignItems: 'center',
            padding: '10px 12px',
            borderBottom: isCollapsed ? 'none' : '1px solid var(--border-light)',
            background: 'var(--panel-header-bg)',
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

  // Custom hook for debouncing values
  function useDebounce(value, delay = 300) {
    const React = window.React;
    const [debouncedValue, setDebouncedValue] = React.useState(value);

    React.useEffect(() => {
      const timer = setTimeout(() => {
        setDebouncedValue(value);
      }, delay);

      return () => {
        clearTimeout(timer);
      };
    }, [value, delay]);

    return debouncedValue;
  }

  // Query cache system for expensive operations
  const queryCache = new Map();
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  function getCacheKey(fnName, params) {
    return `${fnName}:${JSON.stringify(params)}`;
  }

  function getCached(key) {
    const cached = queryCache.get(key);
    if (!cached) return null;
    
    const now = Date.now();
    if (now - cached.timestamp > CACHE_TTL) {
      queryCache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  function setCache(key, data) {
    queryCache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  function clearCache(pattern) {
    if (!pattern) {
      queryCache.clear();
      return;
    }
    
    const keysToDelete = [];
    for (const key of queryCache.keys()) {
      if (key.startsWith(pattern)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(k => queryCache.delete(k));
  }

  // Clear cache when data is updated
  if (window.__pub && !window.__cacheInvalidationWired) {
    window.__cacheInvalidationWired = true;
    window.__pub.on('data-updated', () => {
      console.log('[Cache] Invalidating all cached queries on data update');
      clearCache();
    });
  }

  // Custom hook with caching support
  function useCachedAsync(fn, deps, cacheKey) {
    const React = window.React;
    const [state, setState] = React.useState({ loading: true, error: null, data: null });
    
    React.useEffect(() => {
      let alive = true;
      
      // Check cache first
      if (cacheKey) {
        const cached = getCached(cacheKey);
        if (cached !== null) {
          console.log('[Cache] Hit:', cacheKey);
          setState({ loading: false, error: null, data: cached });
          return;
        }
        console.log('[Cache] Miss:', cacheKey);
      }
      
      setState({ loading: true, error: null, data: null });
      Promise.resolve().then(fn).then((data) => {
        if (alive) {
          setState({ loading: false, error: null, data });
          if (cacheKey) {
            setCache(cacheKey, data);
          }
        }
      }).catch((err) => {
        if (alive) setState({ loading: false, error: err, data: null });
      });
      return () => { alive = false; };
    }, deps);
    
    return state;
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

  // Loading skeleton components
  function LoadingSkeleton({ rows = 5, type = 'table' }) {
    const React = window.React;
    if (type === 'stats') {
      return React.createElement('div', { style: { padding: '20px' } }, [
        React.createElement('div', { key: '1', className: 'skeleton skeleton-title' }),
        React.createElement('div', { key: '2', className: 'skeleton skeleton-text' }),
        React.createElement('div', { key: '3', className: 'skeleton skeleton-text' }),
        React.createElement('div', { key: '4', className: 'skeleton skeleton-text', style: { width: '80%' } }),
      ]);
    }
    if (type === 'graph') {
      return React.createElement('div', { style: { padding: '20px' } }, 
        React.createElement('div', { className: 'skeleton', style: { height: '300px', width: '100%' } })
      );
    }
    // Default table skeleton
    return React.createElement('div', { style: { padding: '10px' } }, 
      Array.from({ length: rows }, (_, i) => 
        React.createElement('div', { key: i, className: 'skeleton skeleton-table-row' })
      )
    );
  }

  function Panel({ title, children, actions }) {
    const React = window.React;
    const headerContent = actions 
      ? React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } }, [
          React.createElement('h3', { key: 'title', style: { margin: 0 } }, title),
          React.createElement('div', { key: 'actions', style: { display: 'flex', gap: 6 } }, actions)
        ])
      : React.createElement('h3', null, title);
    
    return React.createElement('div', { className: 'panel' },
      headerContent,
      React.createElement('div', { className: 'body' }, children)
    );
  }

  // CollapsiblePanel - Panel with collapse/expand functionality
  function CollapsiblePanel({ title, children, actions, defaultCollapsed = false, storageKey }) {
    const React = window.React;
    const [collapsed, setCollapsed] = React.useState(() => {
      if (storageKey) {
        try {
          const saved = localStorage.getItem(`panel.collapsed.${storageKey}`);
          if (saved !== null) return saved === 'true';
        } catch (e) {}
      }
      return defaultCollapsed;
    });

    // Listen for global collapse/expand events
    React.useEffect(() => {
      if (!window.__pub?.on) return;
      
      const offCollapseAll = window.__pub.on('panels:collapseAll', () => {
        setCollapsed(true);
      });
      
      const offExpandAll = window.__pub.on('panels:expandAll', () => {
        setCollapsed(false);
      });
      
      return () => {
        if (typeof offCollapseAll === 'function') offCollapseAll();
        if (typeof offExpandAll === 'function') offExpandAll();
      };
    }, []);

    React.useEffect(() => {
      if (storageKey) {
        try {
          localStorage.setItem(`panel.collapsed.${storageKey}`, collapsed);
        } catch (e) {}
      }
    }, [collapsed, storageKey]);

    const toggleButton = React.createElement('button', {
      type: 'button',
      onClick: () => setCollapsed(!collapsed),
      style: {
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        fontSize: '16px',
        padding: '0 8px',
        color: 'var(--text-secondary)',
        transition: 'transform 0.2s'
      },
      title: collapsed ? 'Expand' : 'Collapse'
    }, collapsed ? '▶' : '▼');

    const allActions = [toggleButton];
    if (actions) {
      allActions.push(...(Array.isArray(actions) ? actions : [actions]));
    }

    const headerContent = React.createElement('div', { 
      style: { 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        cursor: 'pointer'
      },
      onClick: () => setCollapsed(!collapsed)
    }, [
      React.createElement('h3', { key: 'title', style: { margin: 0, color: 'var(--text-primary)' } }, title),
      React.createElement('div', { 
        key: 'actions', 
        style: { display: 'flex', gap: 6, alignItems: 'center' },
        onClick: (e) => e.stopPropagation() // Prevent header click when clicking actions
      }, allActions)
    ]);

    return React.createElement('div', { className: 'panel' },
      headerContent,
      React.createElement('div', { 
        className: 'body',
        style: {
          maxHeight: collapsed ? '0' : '10000px',
          opacity: collapsed ? 0 : 1,
          overflow: collapsed ? 'hidden' : 'visible',
          transition: collapsed 
            ? 'max-height 0.3s ease-out, opacity 0.2s ease-out' 
            : 'max-height 0.4s ease-in, opacity 0.3s ease-in'
        }
      }, children)
    );
  }

  // LazyPanel - Panel that only renders content when visible (Intersection Observer)
  function LazyPanel({ title, children, actions, defaultCollapsed = false, storageKey, threshold = 0.1 }) {
    const React = window.React;
    const [isVisible, setIsVisible] = React.useState(false);
    const [hasBeenVisible, setHasBeenVisible] = React.useState(false);
    const containerRef = React.useRef(null);

    React.useEffect(() => {
      const element = containerRef.current;
      if (!element || !window.IntersectionObserver) {
        setIsVisible(true);
        setHasBeenVisible(true);
        return;
      }

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setIsVisible(true);
              setHasBeenVisible(true);
            } else {
              setIsVisible(false);
            }
          });
        },
        { threshold, rootMargin: '100px' } // Start loading slightly before visible
      );

      observer.observe(element);
      return () => observer.disconnect();
    }, [threshold]);

    return React.createElement('div', { ref: containerRef },
      React.createElement(CollapsiblePanel, {
        title,
        actions,
        defaultCollapsed,
        storageKey
      }, hasBeenVisible ? children : React.createElement(LoadingSkeleton, { type: 'stats', rows: 3 }))
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

  // SessionPanel - Display recent play sessions with highlights
  function SessionPanel({ filters, onSessionClick }) {
    const React = window.React;
    const [sessions, setSessions] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const bump = useDataUpdatedBump();
    
    console.log('[SessionPanel] Render - bump value:', bump);
    
    React.useEffect(() => {
      let alive = true;
      setLoading(true);
      
      if (!window.api?.sessions?.list) {
        setLoading(false);
        return;
      }
      
      const options = {
        from: filters?.from || '',
        to: filters?.to || '',
        stake: filters?.stake || 'all',
        sessionGapMinutes: 30,
        limit: 10
      };
      
      window.api.sessions.list(options)
        .then(data => {
          console.log('[SessionPanel] API returned:', data?.length, 'sessions');
          if (alive) {
            setSessions(data || []);
            setLoading(false);
          }
        })
        .catch(err => {
          console.error('[SessionPanel] Error loading sessions:', err);
          if (alive) {
            setSessions([]);
            setLoading(false);
          }
        });
      
      return () => { alive = false; };
    }, [filters, bump]);
    
    const formatTime = (ts) => {
      if (!ts) return '';
      const date = new Date(ts);
      return date.toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit', 
        minute: '2-digit' 
      });
    };
    
    const formatDuration = (minutes) => {
      if (minutes < 60) return `${minutes}m`;
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    };
    
    const formatProfit = (amount) => {
      if (!amount) return '$0.00';
      const sign = amount >= 0 ? '+' : '';
      return `${sign}$${amount.toFixed(2)}`;
    };
    
    const getSessionClass = (netProfit) => {
      if (netProfit > 1) return 'session-winning';
      if (netProfit < -1) return 'session-losing';
      return 'session-breakeven';
    };
    
    if (loading) {
      return React.createElement(Panel, { title: 'Recent Sessions' },
        React.createElement('div', { style: { padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' } },
          'Loading sessions...'
        )
      );
    }
    
    console.log('[SessionPanel] Rendering - sessions.length:', sessions.length, 'loading:', loading);
    
    if (sessions.length === 0) {
      console.log('[SessionPanel] ENTERING EMPTY STATE - sessions:', sessions, 'length:', sessions.length);
      const hasFilters = (filters?.from && filters.from !== '') || 
                         (filters?.to && filters.to !== '') || 
                         (filters?.stake && filters.stake !== 'all');
      const children = [
        React.createElement('div', { key: 'icon', style: { fontSize: '48px' } }, '📊'),
        React.createElement('div', { key: 'msg', style: { fontSize: '14px' } }, 
          hasFilters
            ? 'No sessions found with current filters. Try adjusting your date range or stake filter.'
            : 'No sessions found. Import hand histories to get started!'
        )
      ];
      
      if (!hasFilters) {
        children.push(
          React.createElement('button', {
            key: 'btn',
            type: 'button',
            onClick: () => {
              const importBtn = document.getElementById('open-import');
              if (importBtn) importBtn.click();
            },
            style: {
              marginTop: '8px',
              padding: '8px 16px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '600'
            }
          }, '📥 Import Hand Histories')
        );
      }
      
      return React.createElement(Panel, { title: 'Recent Sessions' },
        React.createElement('div', { 
          style: { 
            padding: '30px 20px', 
            textAlign: 'center', 
            color: 'var(--text-secondary)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            alignItems: 'center'
          } 
        }, children)
      );
    }
    
    // Find best and worst sessions
    const bestSession = sessions.reduce((best, s) => 
      (!best || s.netProfit > best.netProfit) ? s : best, null);
    const worstSession = sessions.reduce((worst, s) => 
      (!worst || s.netProfit < worst.netProfit) ? s : worst, null);
    
    console.log('[SessionPanel] RENDERING SESSIONS - count:', sessions.length);
    console.log('[SessionPanel] First session:', sessions[0]);
    
    const panelTitle = React.createElement('span', null, 
      'Recent Sessions ',
      React.createElement('span', { style: { 
        fontSize: '12px', 
        fontWeight: 'normal', 
        color: 'var(--text-muted)',
        marginLeft: '4px' 
      }}, `(${sessions.length})`)
    );
    
    return React.createElement(Panel, { title: panelTitle },
      React.createElement('div', { 
        className: 'sessions-container',
        style: { 
          display: 'grid',
          gap: '8px',
          maxHeight: '400px',
          overflowY: 'auto'
        }
      },
        sessions.map((session, idx) => {
          const isHighlight = (session === bestSession && session.netProfit > 1) || 
                             (session === worstSession && session.netProfit < -1);
          const highlightIcon = session === bestSession && session.netProfit > 1 ? '🏆' :
                               session === worstSession && session.netProfit < -1 ? '💥' : '';
          
          return React.createElement('div', {
            key: session.sessionId || idx,
            className: `session-card ${getSessionClass(session.netProfit)} ${isHighlight ? 'session-highlight' : ''}`,
            style: {
              padding: '12px',
              background: isHighlight ? 'rgba(59, 130, 246, 0.08)' : 'var(--bg-tertiary)',
              border: isHighlight ? '2px solid var(--primary-bg)' : '1px solid var(--border-default)',
              borderRadius: '8px',
              cursor: onSessionClick ? 'pointer' : 'default',
              transition: 'all 0.2s',
              position: 'relative'
            },
            onClick: onSessionClick ? () => onSessionClick(session) : undefined,
            onMouseEnter: (e) => {
              if (onSessionClick) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
              }
            },
            onMouseLeave: (e) => {
              if (onSessionClick) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }
            }
          },
            // Header row
            React.createElement('div', {
              style: {
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px'
              }
            },
              React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '6px' } },
                highlightIcon && React.createElement('span', { style: { fontSize: '16px' } }, highlightIcon),
                React.createElement('span', { style: { fontWeight: '600', fontSize: '13px' } },
                  formatTime(session.startTime)
                ),
                React.createElement('span', { 
                  style: { 
                    fontSize: '11px', 
                    color: 'var(--text-secondary)',
                    background: 'var(--card-bg)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    border: '1px solid var(--border-light)'
                  } 
                }, session.stakes)
              ),
              React.createElement('span', {
                style: {
                  fontWeight: 'bold',
                  fontSize: '14px',
                  color: session.netProfit >= 0 ? 'var(--success-bg)' : 'var(--error-bg)'
                }
              }, formatProfit(session.netProfit))
            ),
            // Stats row
            React.createElement('div', {
              style: {
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '8px',
                fontSize: '11px',
                color: 'var(--text-secondary)'
              }
            },
              React.createElement('div', null,
                React.createElement('div', { style: { fontWeight: '500', color: 'var(--text-primary)' } }, session.handCount),
                React.createElement('div', null, 'hands')
              ),
              React.createElement('div', null,
                React.createElement('div', { style: { fontWeight: '500', color: 'var(--text-primary)' } }, formatDuration(session.duration)),
                React.createElement('div', null, 'duration')
              ),
              React.createElement('div', null,
                React.createElement('div', { style: { fontWeight: '500', color: 'var(--text-primary)' } }, `${session.winRate}%`),
                React.createElement('div', null, 'win rate')
              ),
              React.createElement('div', null,
                React.createElement('div', { style: { fontWeight: '500', color: 'var(--text-primary)' } }, session.handsPerHour),
                React.createElement('div', null, 'hands/hr')
              )
            )
          );
        })
      )
    );
  }

  // DatePresets - Quick date range selection buttons
  function DatePresets({ onSelect, currentFrom, currentTo }) {
    const React = window.React;
    
    const getDateString = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    const presets = [
      {
        label: 'Today',
        getValue: () => {
          const today = new Date();
          return { from: getDateString(today), to: getDateString(today) };
        }
      },
      {
        label: 'Yesterday',
        getValue: () => {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          return { from: getDateString(yesterday), to: getDateString(yesterday) };
        }
      },
      {
        label: 'Last 7 Days',
        getValue: () => {
          const today = new Date();
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          return { from: getDateString(sevenDaysAgo), to: getDateString(today) };
        }
      },
      {
        label: 'Last 30 Days',
        getValue: () => {
          const today = new Date();
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          return { from: getDateString(thirtyDaysAgo), to: getDateString(today) };
        }
      },
      {
        label: 'This Month',
        getValue: () => {
          const today = new Date();
          const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
          return { from: getDateString(firstDay), to: getDateString(today) };
        }
      },
      {
        label: 'Last Month',
        getValue: () => {
          const today = new Date();
          const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
          const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
          return { from: getDateString(lastMonthStart), to: getDateString(lastMonthEnd) };
        }
      },
      {
        label: 'All Time',
        getValue: () => ({ from: '', to: '' })
      }
    ];
    
    const isActive = (preset) => {
      const { from, to } = preset.getValue();
      return from === currentFrom && to === currentTo;
    };
    
    return React.createElement('div', {
      style: {
        display: 'flex',
        gap: '4px',
        flexWrap: 'wrap',
        marginBottom: '8px'
      }
    },
      presets.map((preset, idx) => {
        const active = isActive(preset);
        return React.createElement('button', {
          key: idx,
          type: 'button',
          onClick: () => onSelect(preset.getValue()),
          style: {
            padding: '4px 10px',
            fontSize: '11px',
            fontWeight: active ? '600' : '500',
            background: active ? 'var(--primary-bg)' : 'var(--bg-tertiary)',
            color: active ? 'white' : 'var(--text-primary)',
            border: active ? '1px solid var(--primary-hover)' : '1px solid var(--border-default)',
            borderRadius: '4px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          },
          onMouseEnter: (e) => {
            if (!active) {
              e.currentTarget.style.background = 'var(--bg-hover)';
              e.currentTarget.style.borderColor = 'var(--border-dark)';
            }
          },
          onMouseLeave: (e) => {
            if (!active) {
              e.currentTarget.style.background = 'var(--bg-tertiary)';
              e.currentTarget.style.borderColor = 'var(--border-default)';
            }
          }
        }, preset.label);
      })
    );
  }

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
      // Advanced filters
      handRange: 'all',
      stackDepth: 'all',
      actionType: 'all',
      potSize: 'all',
      minBetSize: '',
      maxBetSize: ''
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

    const { data: playerCatalog } = useCachedAsync(
      () => window.api?.listStats({ limit: 1000, order: 'player', dir: 'asc' }) ?? null, 
      [bump],
      getCacheKey('listStats', { limit: 1000, order: 'player', dir: 'asc' })
    );

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

    // Persistent cache for stats data (survives tab switches AND program restarts)
    const [statsCache, setStatsCache] = React.useState(() => {
      try {
        const cached = localStorage.getItem('statsCache');
        return cached ? JSON.parse(cached) : null;
      } catch (e) {
        return null;
      }
    });
    const lastStatsBump = React.useRef(bump);
    const lastStatsPlayer = React.useRef(selectedPlayer);
    
    // Save to localStorage whenever cache updates
    React.useEffect(() => {
      if (statsCache) {
        try {
          localStorage.setItem('statsCache', JSON.stringify(statsCache));
        } catch (e) {
          // Ignore localStorage errors
        }
      }
    }, [statsCache]);
    
    // Only fetch if player changed or bump changed (new data imported)
    const shouldFetch = React.useMemo(() => {
      const playerChanged = lastStatsPlayer.current !== selectedPlayer;
      const dataUpdated = lastStatsBump.current !== bump;
      const hasNoCache = !statsCache;
      
      return hasNoCache || playerChanged || dataUpdated;
    }, [selectedPlayer, bump, statsCache]);
    
    const statsRequest = React.useMemo(() => {
      if (!shouldFetch) return null;
      
      const payload = {
        limit: selectedPlayer && selectedPlayer !== 'all' ? 1 : 500,
        offset: 0,
        order: 'hands',
        dir: 'desc',
      };
      if (selectedPlayer && selectedPlayer !== 'all') payload.player = selectedPlayer;
      return payload;
    }, [shouldFetch, selectedPlayer]);

    const { data, loading, error } = useAsync(() => {
      if (!shouldFetch) return null;
      return window.api?.listStats(statsRequest) ?? null;
    }, [shouldFetch, statsRequest]);
    
    // Update cache and refs when new data arrives
    React.useEffect(() => {
      if (data) {
        setStatsCache(data);
        lastStatsBump.current = bump;
        lastStatsPlayer.current = selectedPlayer;
      }
    }, [data, bump, selectedPlayer]);
    
    // Use cached data or new data
    const displayStatsData = data || statsCache;
    
    // Only show loading if we're fetching AND have no cache
    const isStatsLoading = loading && !statsCache;

    const breakdownFilters = React.useMemo(() => {
      const payload = {};
      if (filters.stake && filters.stake !== 'all') payload.stakes = [filters.stake];
      if (filters.position && filters.position !== 'all') payload.positions = [filters.position];
      if (filters.showdown && filters.showdown !== 'all') payload.showdown = filters.showdown;
      if (filters.result && filters.result !== 'all') payload.result = filters.result;
      if (filters.from) payload.from = filters.from;
      if (filters.to) payload.to = filters.to;
      // Advanced filters
      if (filters.handRange && filters.handRange !== 'all') payload.handRange = filters.handRange;
      if (filters.stackDepth && filters.stackDepth !== 'all') payload.stackDepth = filters.stackDepth;
      if (filters.actionType && filters.actionType !== 'all') payload.actionType = filters.actionType;
      if (filters.potSize && filters.potSize !== 'all') payload.potSize = filters.potSize;
      if (filters.minBetSize) payload.minBetSize = filters.minBetSize;
      if (filters.maxBetSize) payload.maxBetSize = filters.maxBetSize;
      return payload;
    }, [filters]);

    // Persistent cache for breakdown data (survives restarts)
    const [stakeCache, setStakeCache] = React.useState(() => {
      try {
        const cached = localStorage.getItem('stakeCache');
        return cached ? JSON.parse(cached) : null;
      } catch (e) {
        return null;
      }
    });
    const [positionCache, setPositionCache] = React.useState(() => {
      try {
        const cached = localStorage.getItem('positionCache');
        return cached ? JSON.parse(cached) : null;
      } catch (e) {
        return null;
      }
    });
    const lastBreakdownBump = React.useRef(bump);
    const lastBreakdownFilters = React.useRef(JSON.stringify(breakdownFilters));
    
    // Save to localStorage
    React.useEffect(() => {
      if (stakeCache) {
        try {
          localStorage.setItem('stakeCache', JSON.stringify(stakeCache));
        } catch (e) {
          // Ignore
        }
      }
    }, [stakeCache]);
    
    React.useEffect(() => {
      if (positionCache) {
        try {
          localStorage.setItem('positionCache', JSON.stringify(positionCache));
        } catch (e) {
          // Ignore
        }
      }
    }, [positionCache]);
    
    const shouldFetchBreakdown = React.useMemo(() => {
      const filtersChanged = JSON.stringify(breakdownFilters) !== lastBreakdownFilters.current;
      const dataUpdated = lastBreakdownBump.current !== bump;
      const hasNoCache = !stakeCache || !positionCache;
      
      return hasNoCache || filtersChanged || dataUpdated;
    }, [breakdownFilters, bump, stakeCache, positionCache]);
    
    const { data: stakeData, loading: stakeLoading, error: stakeError } = useAsync(
      () => {
        if (!shouldFetchBreakdown) return null;
        return window.api?.heroBreakdown ? window.api.heroBreakdown({ groupBy: 'stake', ...breakdownFilters }) : null;
      },
      [shouldFetchBreakdown, breakdownFilters]
    );

    const { data: positionData, loading: positionLoading, error: positionError } = useAsync(
      () => {
        if (!shouldFetchBreakdown) return null;
        return window.api?.heroBreakdown ? window.api.heroBreakdown({ groupBy: 'position', ...breakdownFilters }) : null;
      },
      [shouldFetchBreakdown, breakdownFilters]
    );
    
    // Update breakdown caches
    React.useEffect(() => {
      if (stakeData) {
        setStakeCache(stakeData);
        lastBreakdownBump.current = bump;
        lastBreakdownFilters.current = JSON.stringify(breakdownFilters);
      }
    }, [stakeData, bump, breakdownFilters]);
    
    React.useEffect(() => {
      if (positionData) {
        setPositionCache(positionData);
      }
    }, [positionData]);
    
    // Use cached data or new data for breakdown
    const displayStakeData = stakeData || stakeCache;
    const displayPositionData = positionData || positionCache;
    
    // Only show loading if fetching AND no cache
    const isStakeLoading = stakeLoading && !stakeCache;
    const isPositionLoading = positionLoading && !positionCache;

    const baseRows = Array.isArray(displayStatsData) ? displayStatsData : [];

    const heroAggregates = React.useMemo(() => {
      if (!heroName || !Array.isArray(displayStakeData?.rows)) return null;
      const toNumber = (value) => {
        const num = Number(value);
        return Number.isFinite(num) ? num : 0;
      };
      return displayStakeData.rows.reduce((acc, row) => {
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
      return displayStakeData?.heroStats || displayPositionData?.heroStats || null;
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
      const mapped = Array.isArray(displayStakeData?.available?.stakes) ? displayStakeData.available.stakes : [];
      return [{ value: 'all', label: 'All stakes' }, ...mapped.map((opt) => ({ value: opt.key, label: opt.label || formatStakeLabel(opt.key) }))];
    }, [stakeData]);
    const positionOptions = React.useMemo(() => ['all', ...(Array.isArray(displayStakeData?.available?.positions) ? displayStakeData.available.positions : [])], [displayStakeData]);

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
        onClick: () => setFilters({ stake: 'all', position: 'all', showdown: 'all', result: 'all', from: '', to: '', handRange: 'all', stackDepth: 'all', actionType: 'all', potSize: 'all', minBetSize: '', maxBetSize: '' }),
        style: { flex: '0 0 auto' },
      }, 'Reset Filters'),
      React.createElement('button', {
        key: 'export-csv',
        type: 'button',
        onClick: async () => {
          if (!sortedRows || sortedRows.length === 0) {
            showToast('No stats to export', 'warning', 3000);
            return;
          }
          const csvData = formatStatsAsCSV(sortedRows, tableColumns);
          const timestamp = new Date().toISOString().split('T')[0];
          const filename = `poker_stats_${timestamp}.csv`;
          try {
            const result = await window.api.exportStatsCSV(csvData, filename);
            if (result.success) {
              showToast(`✓ Stats exported to ${filename}`, 'success', 4000);
            } else {
              showToast(`Export cancelled`, 'info', 3000);
            }
          } catch (err) {
            console.error('CSV export error:', err);
            showToast(`✕ Export failed: ${err.message}`, 'error', 4000);
          }
        },
        style: { flex: '0 0 auto', display: 'inline-flex', alignItems: 'center', gap: 4 },
      }, ['💾 Export CSV']),
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
              if (isEmpty) cellStyle.color = 'var(--text-muted)';
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
    const detailPanelActions = detailRow ? [
      React.createElement('button', {
        key: 'copy',
        type: 'button',
        onClick: () => copyStatsToClipboard(detailRow),
        style: { fontSize: '12px', padding: '4px 10px', marginLeft: 'auto' },
        title: 'Copy stats to clipboard'
      }, '📋 Copy')
    ] : null;
    const detailPanel = detailContent ? React.createElement(CollapsiblePanel, { 
      title: detailTitle || 'Player Breakdown',
      storageKey: 'player-breakdown',
      defaultCollapsed: false,
      actions: detailPanelActions,
      children: detailContent
    }) : null;

    const compareContent = compareDetailRow
      ? buildPlayerDetailContent(React, compareDetailRow, {
          collapsed: compareCollapsed,
          onToggleSection: toggleCompareSection,
          quickDrill,
          isHero: heroName && namesEqual(compareDetailRow.player, heroName),
        })
      : null;
    const comparePanel = compareContent ? React.createElement(CollapsiblePanel, { 
      title: `Comparison: ${compareDetailRow.player || 'Player'}`,
      storageKey: 'player-comparison',
      defaultCollapsed: false,
      children: compareContent 
    }) : null;

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
      if (loadingState) return Panel({ title, children: React.createElement(LoadingSkeleton, { rows: 6, type: 'table' }) });
      if (errorState) return Panel({ title, children: formatError(errorState) });
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
    if (isStatsLoading) return Panel({ title: 'Player Stats', children: React.createElement(LoadingSkeleton, { rows: 10, type: 'table' }) });
    if (error) return Panel({ title: 'Player Stats', children: formatError(error) });

    const stakePanel = renderBreakdown('Breakdown by Stake', displayStakeData, isStakeLoading, stakeError);
    const positionPanel = renderBreakdown('Breakdown by Position', displayPositionData, isPositionLoading, positionError);

    const panelControlsBar = React.createElement('div', {
      style: {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: 8,
        marginBottom: 12,
        padding: '8px 12px',
        background: '#f9fafb',
        borderRadius: 8,
        border: '1px solid #e5e7eb'
      }
    }, [
      React.createElement('button', {
        key: 'collapseAll',
        type: 'button',
        onClick: () => {
          if (window.__pub) {
            window.__pub.emit('panels:collapseAll');
            if (window.__toast) window.__toast('📦 All panels collapsed', 'info', 2000);
          }
        },
        style: {
          padding: '6px 12px',
          fontSize: 12,
          borderRadius: 6,
          border: '1px solid var(--border-dark)',
          background: 'var(--bg-secondary)',
          color: 'var(--text-primary)',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4
        },
        title: 'Collapse all panels'
      }, '▶ Collapse All'),
      React.createElement('button', {
        key: 'expandAll',
        type: 'button',
        onClick: () => {
          if (window.__pub) {
            window.__pub.emit('panels:expandAll');
            if (window.__toast) window.__toast('📂 All panels expanded', 'info', 2000);
          }
        },
        style: {
          padding: '6px 12px',
          fontSize: 12,
          borderRadius: 6,
          border: '1px solid var(--border-dark)',
          background: 'var(--bg-secondary)',
          color: 'var(--text-primary)',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4
        },
        title: 'Expand all panels'
      }, '▼ Expand All')
    ]);

    return React.createElement(React.Fragment, null,
      panelControlsBar,
      React.createElement(CollapsiblePanel, { 
        title: 'Player Stats', 
        storageKey: 'player-stats-main',
        defaultCollapsed: false,
        children: React.createElement(React.Fragment, null, [
          filtersUi,
          React.createElement(AdvancedFilters, {
            key: 'advancedFilters',
            filters,
            onChange: setFilters,
            availableStakes: stakeOptions,
            availablePositions: positionOptions,
            compact: true
          }),
          table
        ])
      }),
      detailStack,
      stakePanel ? React.createElement(CollapsiblePanel, {
        title: 'Breakdown by Stake',
        storageKey: 'breakdown-stake',
        defaultCollapsed: false,
        children: stakePanel.props.children
      }) : null,
      positionPanel ? React.createElement(CollapsiblePanel, {
        title: 'Breakdown by Position',
        storageKey: 'breakdown-position',
        defaultCollapsed: false,
        children: positionPanel.props.children
      }) : null,
    );
  }



  // ===============================
  // Advanced Filters Component
  // ===============================
  
  // Advanced Filter Builder with AND/OR Logic
  function AdvancedFilterBuilder({ onApply, initialConditions = [], compact = true }) {
    const React = window.React;
    const [expanded, setExpanded] = React.useState(false);
    const [conditions, setConditions] = React.useState(initialConditions.length > 0 ? initialConditions : [
      { id: 1, field: 'position', operator: '=', value: '', enabled: true, not: false }
    ]);
    const [logic, setLogic] = React.useState('AND'); // 'AND' or 'OR'
    const [nextId, setNextId] = React.useState(2);
    const [showPresets, setShowPresets] = React.useState(false);
    const [presetName, setPresetName] = React.useState('');
    const [savedPresets, setSavedPresets] = React.useState(() => {
      try {
        const saved = localStorage.getItem('poker_advanced_filter_presets');
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    });
    
    // Available filter fields
    const filterFields = [
      { value: 'position', label: 'Position', type: 'select', options: ['BTN', 'CO', 'MP', 'EP', 'SB', 'BB'] },
      { value: 'result', label: 'Result', type: 'select', options: ['won', 'lost', 'breakeven'] },
      { value: 'heroNet', label: 'Hero Net (USD)', type: 'number' },
      { value: 'heroNetBB', label: 'Hero Net (BB)', type: 'number' },
      { value: 'stake', label: 'Stake', type: 'text' },
      { value: 'villain', label: 'Villain Name', type: 'text' },
      { value: 'showdown', label: 'Showdown', type: 'select', options: ['showdown', 'nonshowdown'] },
      { value: 'potSize', label: 'Pot Size (USD)', type: 'number' },
      { value: 'date', label: 'Date', type: 'date' },
    ];
    
    // Available operators per field type
    const getOperators = (fieldType) => {
      if (fieldType === 'select') return [
        { value: '=', label: 'equals' },
        { value: '!=', label: 'not equals' }
      ];
      if (fieldType === 'number') return [
        { value: '=', label: 'equals' },
        { value: '!=', label: 'not equals' },
        { value: '>', label: 'greater than' },
        { value: '<', label: 'less than' },
        { value: '>=', label: 'greater or equal' },
        { value: '<=', label: 'less or equal' }
      ];
      if (fieldType === 'text') return [
        { value: '=', label: 'equals' },
        { value: '!=', label: 'not equals' },
        { value: 'contains', label: 'contains' },
        { value: 'startsWith', label: 'starts with' }
      ];
      if (fieldType === 'date') return [
        { value: '=', label: 'equals' },
        { value: '>', label: 'after' },
        { value: '<', label: 'before' },
        { value: '>=', label: 'on or after' },
        { value: '<=', label: 'on or before' }
      ];
      return [{ value: '=', label: 'equals' }];
    };
    
    const addCondition = () => {
      setConditions([...conditions, { 
        id: nextId, 
        field: 'position', 
        operator: '=', 
        value: '', 
        enabled: true,
        not: false
      }]);
      setNextId(nextId + 1);
    };
    
    const removeCondition = (id) => {
      if (conditions.length <= 1) return; // Keep at least one condition
      setConditions(conditions.filter(c => c.id !== id));
    };
    
    const updateCondition = (id, updates) => {
      setConditions(conditions.map(c => c.id === id ? { ...c, ...updates } : c));
    };
    
    const toggleCondition = (id) => {
      setConditions(conditions.map(c => c.id === id ? { ...c, enabled: !c.enabled } : c));
    };
    
    const toggleNot = (id) => {
      setConditions(conditions.map(c => c.id === id ? { ...c, not: !c.not } : c));
    };
    
    const clearAll = () => {
      setConditions([{ id: 1, field: 'position', operator: '=', value: '', enabled: true, not: false }]);
      setNextId(2);
      setLogic('AND');
    };
    
    const savePreset = () => {
      if (!presetName.trim()) {
        if (window.__toast) window.__toast('⚠ Please enter a preset name', 'warning', 2000);
        return;
      }
      
      const preset = {
        name: presetName.trim(),
        conditions: conditions,
        logic: logic,
        created: new Date().toISOString()
      };
      
      const updated = [...savedPresets, preset];
      setSavedPresets(updated);
      localStorage.setItem('poker_advanced_filter_presets', JSON.stringify(updated));
      setPresetName('');
      
      if (window.__toast) {
        window.__toast(`✓ Saved preset: "${preset.name}"`, 'success', 2500);
      }
    };
    
    const loadPreset = (preset) => {
      setConditions(preset.conditions);
      setLogic(preset.logic);
      // Find max ID to continue numbering
      const maxId = Math.max(...preset.conditions.map(c => c.id), 0);
      setNextId(maxId + 1);
      setShowPresets(false);
      
      if (window.__toast) {
        window.__toast(`✓ Loaded preset: "${preset.name}"`, 'success', 2500);
      }
    };
    
    const deletePreset = (presetToDelete) => {
      const updated = savedPresets.filter(p => p.name !== presetToDelete.name || p.created !== presetToDelete.created);
      setSavedPresets(updated);
      localStorage.setItem('poker_advanced_filter_presets', JSON.stringify(updated));
      
      if (window.__toast) {
        window.__toast(`✓ Deleted preset: "${presetToDelete.name}"`, 'success', 2000);
      }
    };
    
    const exportPresets = () => {
      const dataStr = JSON.stringify(savedPresets, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      const exportFileDefaultName = 'poker_filter_presets.json';
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      if (window.__toast) {
        window.__toast(`✓ Exported ${savedPresets.length} preset(s)`, 'success', 2500);
      }
    };
    
    const importPresets = (event) => {
      const file = event.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target.result);
          if (!Array.isArray(imported)) {
            throw new Error('Invalid format');
          }
          
          const merged = [...savedPresets, ...imported];
          setSavedPresets(merged);
          localStorage.setItem('poker_advanced_filter_presets', JSON.stringify(merged));
          
          if (window.__toast) {
            window.__toast(`✓ Imported ${imported.length} preset(s)`, 'success', 2500);
          }
        } catch (err) {
          if (window.__toast) {
            window.__toast('⚠ Failed to import presets: Invalid file format', 'error', 3000);
          }
        }
      };
      reader.readAsText(file);
      event.target.value = ''; // Reset input
    };
    
    // Default presets
    const defaultPresets = [
      {
        name: '🏆 Winning BTN Hands',
        conditions: [
          { id: 1, field: 'position', operator: '=', value: 'BTN', enabled: true, not: false },
          { id: 2, field: 'result', operator: '=', value: 'won', enabled: true, not: false }
        ],
        logic: 'AND'
      },
      {
        name: '📉 Losing Blinds',
        conditions: [
          { id: 1, field: 'position', operator: '=', value: 'SB', enabled: true, not: false },
          { id: 2, field: 'position', operator: '=', value: 'BB', enabled: true, not: false },
          { id: 3, field: 'result', operator: '=', value: 'lost', enabled: true, not: false }
        ],
        logic: 'OR'
      },
      {
        name: '💰 Big Pots (>$50)',
        conditions: [
          { id: 1, field: 'potSize', operator: '>', value: '50', enabled: true, not: false }
        ],
        logic: 'AND'
      },
      {
        name: '📅 Recent Hands (Last 7 Days)',
        conditions: [
          { id: 1, field: 'date', operator: '>=', value: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], enabled: true, not: false }
        ],
        logic: 'AND'
      },
      {
        name: '✅ Profitable Sessions (>10BB)',
        conditions: [
          { id: 1, field: 'heroNetBB', operator: '>', value: '10', enabled: true, not: false }
        ],
        logic: 'AND'
      },
      {
        name: '🎯 Non-Showdown Wins',
        conditions: [
          { id: 1, field: 'showdown', operator: '=', value: 'nonshowdown', enabled: true, not: false },
          { id: 2, field: 'result', operator: '=', value: 'won', enabled: true, not: false }
        ],
        logic: 'AND'
      }
    ];
    
    const allPresets = [...defaultPresets, ...savedPresets];

    
    const applyFilters = () => {
      const enabledConditions = conditions.filter(c => c.enabled && c.value);
      if (onApply) {
        onApply({ conditions: enabledConditions, logic });
      }
      if (window.__toast) {
        window.__toast(`✓ Applied ${enabledConditions.length} filter(s) with ${logic} logic`, 'success', 2000);
      }
    };
    
    const enabledCount = conditions.filter(c => c.enabled && c.value).length;
    
    return React.createElement('div', {
      style: { marginBottom: 12 }
    }, [
      React.createElement('button', {
        key: 'toggle',
        type: 'button',
        onClick: () => setExpanded(!expanded),
        style: { 
          display: 'flex', 
          alignItems: 'center', 
          gap: 6, 
          fontSize: 13,
          padding: '6px 12px',
          background: enabledCount > 0 ? '#fef3c7' : '#f9fafb',
          border: enabledCount > 0 ? '1px solid #f59e0b' : '1px solid #e5e7eb',
          borderRadius: 6,
          cursor: 'pointer',
          fontWeight: 600,
          transition: 'all 0.2s ease'
        }
      }, [
        React.createElement('span', { 
          key: 'icon',
          style: { 
            transition: 'transform 0.3s ease',
            transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
            display: 'inline-block'
          }
        }, '▶'),
        React.createElement('span', { key: 'label' }, 
          enabledCount > 0 
            ? `🔍 Advanced Filters (${enabledCount} active with ${logic})` 
            : '🔍 Advanced Filter Builder'
        ),
      ]),
      expanded ? React.createElement('div', {
        key: 'content',
        className: 'fade-in',
        style: { 
          marginTop: 12, 
          padding: 16, 
          background: '#f9fafb', 
          borderRadius: 6, 
          border: '1px solid #e5e7eb',
        }
      }, [
        // Logic Selector
        React.createElement('div', { 
          key: 'logic-selector', 
          style: { marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 } 
        }, [
          React.createElement('span', { key: 'label', style: { fontWeight: 600, fontSize: 13, color: '#6b7280' } }, 
            'Combine conditions with:'
          ),
          React.createElement('div', { key: 'buttons', style: { display: 'flex', gap: 4 } }, [
            React.createElement('button', {
              key: 'and',
              type: 'button',
              onClick: () => setLogic('AND'),
              style: {
                padding: '6px 16px',
                fontSize: 13,
                fontWeight: 600,
                borderRadius: 6,
                border: `2px solid ${logic === 'AND' ? '#3b82f6' : '#d1d5db'}`,
                background: logic === 'AND' ? '#dbeafe' : 'white',
                color: logic === 'AND' ? '#1e40af' : '#6b7280',
                cursor: 'pointer'
              }
            }, 'AND'),
            React.createElement('button', {
              key: 'or',
              type: 'button',
              onClick: () => setLogic('OR'),
              style: {
                padding: '6px 16px',
                fontSize: 13,
                fontWeight: 600,
                borderRadius: 6,
                border: `2px solid ${logic === 'OR' ? '#10b981' : '#d1d5db'}`,
                background: logic === 'OR' ? '#d1fae5' : 'white',
                color: logic === 'OR' ? '#065f46' : '#6b7280',
                cursor: 'pointer'
              }
            }, 'OR'),
          ]),
          React.createElement('div', { key: 'spacer', style: { flex: 1 } }),
          React.createElement('button', {
            key: 'clear',
            type: 'button',
            onClick: clearAll,
            style: {
              padding: '6px 12px',
              fontSize: 12,
              borderRadius: 6,
              border: '1px solid #d1d5db',
              background: 'white',
              cursor: 'pointer'
            }
          }, 'Clear All')
        ]),
        
        // Conditions List
        React.createElement('div', { 
          key: 'conditions', 
          style: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 } 
        }, conditions.map((condition, idx) => {
          const field = filterFields.find(f => f.value === condition.field);
          const operators = getOperators(field?.type || 'text');
          
          return React.createElement('div', {
            key: condition.id,
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: 12,
              background: condition.enabled ? 'white' : '#f3f4f6',
              borderRadius: 6,
              border: `1px solid ${condition.enabled ? '#d1d5db' : '#e5e7eb'}`,
              opacity: condition.enabled ? 1 : 0.6
            }
          }, [
            // Row number and enable toggle
            React.createElement('div', { key: 'toggle', style: { display: 'flex', alignItems: 'center', gap: 6 } }, [
              React.createElement('input', {
                key: 'checkbox',
                type: 'checkbox',
                checked: condition.enabled,
                onChange: () => toggleCondition(condition.id),
                style: { cursor: 'pointer', width: 16, height: 16 }
              }),
              React.createElement('span', { key: 'num', style: { fontSize: 13, fontWeight: 600, color: '#6b7280', width: 20 } }, 
                `${idx + 1}.`
              ),
            ]),
            
            // NOT toggle button
            React.createElement('button', {
              key: 'not',
              type: 'button',
              onClick: () => toggleNot(condition.id),
              disabled: !condition.enabled,
              title: condition.not ? 'Click to remove NOT' : 'Click to add NOT',
              style: {
                padding: '4px 10px',
                fontSize: 12,
                fontWeight: 700,
                borderRadius: 4,
                border: `2px solid ${condition.not ? '#ef4444' : '#d1d5db'}`,
                background: condition.not ? '#fee2e2' : 'white',
                color: condition.not ? '#dc2626' : '#9ca3af',
                cursor: condition.enabled ? 'pointer' : 'not-allowed',
                minWidth: '50px',
                opacity: condition.enabled ? 1 : 0.5
              }
            }, condition.not ? 'NOT' : 'NOT'),
            
            // Field selector
            React.createElement('select', {
              key: 'field',
              value: condition.field,
              onChange: (ev) => {
                const newField = filterFields.find(f => f.value === ev.target.value);
                const newOperators = getOperators(newField?.type || 'text');
                updateCondition(condition.id, { 
                  field: ev.target.value,
                  operator: newOperators[0]?.value || '=',
                  value: ''
                });
              },
              disabled: !condition.enabled,
              style: { 
                flex: '1 1 140px', 
                padding: '6px 8px', 
                fontSize: 13,
                borderRadius: 6, 
                border: '1px solid #d1d5db' 
              }
            }, filterFields.map(f => 
              React.createElement('option', { key: f.value, value: f.value }, f.label)
            )),
            
            // Operator selector
            React.createElement('select', {
              key: 'operator',
              value: condition.operator,
              onChange: (ev) => updateCondition(condition.id, { operator: ev.target.value }),
              disabled: !condition.enabled,
              style: { 
                flex: '0 0 130px', 
                padding: '6px 8px', 
                fontSize: 13,
                borderRadius: 6, 
                border: '1px solid #d1d5db' 
              }
            }, operators.map(op => 
              React.createElement('option', { key: op.value, value: op.value }, op.label)
            )),
            
            // Value input
            field?.type === 'select' 
              ? React.createElement('select', {
                  key: 'value',
                  value: condition.value,
                  onChange: (ev) => updateCondition(condition.id, { value: ev.target.value }),
                  disabled: !condition.enabled,
                  style: { 
                    flex: '1 1 140px', 
                    padding: '6px 8px', 
                    fontSize: 13,
                    borderRadius: 6, 
                    border: '1px solid #d1d5db' 
                  }
                }, [
                  React.createElement('option', { key: 'empty', value: '' }, '-- Select --'),
                  ...(field.options || []).map(opt => 
                    React.createElement('option', { key: opt, value: opt }, opt)
                  )
                ])
              : React.createElement('input', {
                  key: 'value',
                  type: field?.type === 'number' ? 'number' : field?.type === 'date' ? 'date' : 'text',
                  placeholder: field?.type === 'number' ? '0' : field?.type === 'date' ? 'YYYY-MM-DD' : 'value',
                  value: condition.value,
                  onChange: (ev) => updateCondition(condition.id, { value: ev.target.value }),
                  disabled: !condition.enabled,
                  step: field?.type === 'number' ? '0.01' : undefined,
                  style: { 
                    flex: '1 1 140px', 
                    padding: '6px 8px', 
                    fontSize: 13,
                    borderRadius: 6, 
                    border: '1px solid #d1d5db' 
                  }
                }),
            
            // Remove button
            React.createElement('button', {
              key: 'remove',
              type: 'button',
              onClick: () => removeCondition(condition.id),
              disabled: conditions.length <= 1,
              style: {
                padding: '6px 10px',
                fontSize: 13,
                borderRadius: 6,
                border: '1px solid #ef4444',
                background: conditions.length <= 1 ? '#f3f4f6' : '#fee2e2',
                color: conditions.length <= 1 ? '#9ca3af' : '#dc2626',
                cursor: conditions.length <= 1 ? 'not-allowed' : 'pointer',
                fontWeight: 600
              }
            }, '✕'),
            
            // Logic indicator (except for last row)
            idx < conditions.length - 1 ? React.createElement('div', {
              key: 'logic-badge',
              style: {
                position: 'absolute',
                left: 32,
                bottom: -14,
                padding: '2px 8px',
                fontSize: 11,
                fontWeight: 700,
                borderRadius: 4,
                background: logic === 'AND' ? '#dbeafe' : '#d1fae5',
                color: logic === 'AND' ? '#1e40af' : '#065f46',
                border: `1px solid ${logic === 'AND' ? '#93c5fd' : '#6ee7b7'}`,
                zIndex: 1
              }
            }, logic) : null
          ]);
        })),
        
        // Action Buttons
        React.createElement('div', { 
          key: 'actions', 
          style: { display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center' } 
        }, [
          React.createElement('button', {
            key: 'add',
            type: 'button',
            onClick: addCondition,
            style: {
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 600,
              borderRadius: 6,
              border: '1px solid #3b82f6',
              background: '#eff6ff',
              color: '#1e40af',
              cursor: 'pointer'
            }
          }, '+ Add Condition'),
          React.createElement('button', {
            key: 'presets',
            type: 'button',
            onClick: () => setShowPresets(!showPresets),
            style: {
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 600,
              borderRadius: 6,
              border: `1px solid ${showPresets ? '#8b5cf6' : '#9ca3af'}`,
              background: showPresets ? '#f3e8ff' : 'white',
              color: showPresets ? '#6b21a8' : '#6b7280',
              cursor: 'pointer'
            }
          }, `📚 Presets (${allPresets.length})`),
          React.createElement('div', { key: 'spacer', style: { flex: 1 } }),
          React.createElement('button', {
            key: 'apply',
            type: 'button',
            onClick: applyFilters,
            disabled: enabledCount === 0,
            style: {
              padding: '8px 24px',
              fontSize: 14,
              fontWeight: 700,
              borderRadius: 6,
              border: enabledCount === 0 ? '1px solid #d1d5db' : '1px solid #10b981',
              background: enabledCount === 0 ? '#f3f4f6' : '#10b981',
              color: enabledCount === 0 ? '#9ca3af' : 'white',
              cursor: enabledCount === 0 ? 'not-allowed' : 'pointer'
            }
          }, `Apply ${enabledCount > 0 ? enabledCount : ''} Filter${enabledCount !== 1 ? 's' : ''}`)
        ]),
        
        // Preset Management Panel
        showPresets ? React.createElement('div', {
          key: 'preset-panel',
          className: 'fade-in',
          style: {
            marginTop: 16,
            padding: 16,
            background: 'white',
            borderRadius: 6,
            border: '2px solid #8b5cf6',
            boxShadow: '0 4px 12px rgba(139, 92, 246, 0.1)'
          }
        }, [
          React.createElement('div', {
            key: 'header',
            style: { marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }
          }, [
            React.createElement('h4', {
              key: 'title',
              style: { margin: 0, fontSize: 14, fontWeight: 700, color: '#6b21a8' }
            }, '📚 Filter Presets'),
            React.createElement('div', { key: 'actions', style: { display: 'flex', gap: 6 } }, [
              React.createElement('button', {
                key: 'export',
                type: 'button',
                onClick: exportPresets,
                disabled: savedPresets.length === 0,
                style: {
                  padding: '4px 10px',
                  fontSize: 12,
                  borderRadius: 4,
                  border: '1px solid #d1d5db',
                  background: savedPresets.length === 0 ? '#f3f4f6' : 'white',
                  cursor: savedPresets.length === 0 ? 'not-allowed' : 'pointer',
                  color: '#6b7280'
                }
              }, '📤 Export'),
              React.createElement('label', {
                key: 'import',
                style: {
                  padding: '4px 10px',
                  fontSize: 12,
                  borderRadius: 4,
                  border: '1px solid #d1d5db',
                  background: 'white',
                  cursor: 'pointer',
                  color: '#6b7280'
                }
              }, [
                '📥 Import',
                React.createElement('input', {
                  key: 'file',
                  type: 'file',
                  accept: '.json',
                  onChange: importPresets,
                  style: { display: 'none' }
                })
              ])
            ])
          ]),
          
          // Save New Preset
          React.createElement('div', {
            key: 'save-preset',
            style: {
              marginBottom: 16,
              padding: 12,
              background: '#f9fafb',
              borderRadius: 6,
              border: '1px solid #e5e7eb'
            }
          }, [
            React.createElement('div', {
              key: 'label',
              style: { marginBottom: 6, fontSize: 12, fontWeight: 600, color: '#6b7280' }
            }, 'Save Current Filters as Preset:'),
            React.createElement('div', {
              key: 'input-row',
              style: { display: 'flex', gap: 6 }
            }, [
              React.createElement('input', {
                key: 'name',
                type: 'text',
                placeholder: 'Enter preset name...',
                value: presetName,
                onChange: (e) => setPresetName(e.target.value),
                onKeyPress: (e) => { if (e.key === 'Enter') savePreset(); },
                style: {
                  flex: 1,
                  padding: '6px 10px',
                  fontSize: 13,
                  borderRadius: 6,
                  border: '1px solid #d1d5db'
                }
              }),
              React.createElement('button', {
                key: 'save',
                type: 'button',
                onClick: savePreset,
                style: {
                  padding: '6px 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  borderRadius: 6,
                  border: '1px solid #10b981',
                  background: '#10b981',
                  color: 'white',
                  cursor: 'pointer'
                }
              }, '💾 Save')
            ])
          ]),
          
          // Preset List
          React.createElement('div', {
            key: 'preset-list',
            style: { display: 'flex', flexDirection: 'column', gap: 6 }
          }, [
            allPresets.length === 0 
              ? React.createElement('div', {
                  key: 'empty',
                  style: { padding: 12, textAlign: 'center', color: '#9ca3af', fontSize: 13 }
                }, 'No presets available. Save your current filters to create one!')
              : allPresets.map((preset, idx) => {
                  const isDefault = idx < defaultPresets.length;
                  return React.createElement('div', {
                    key: `${preset.name}-${preset.created || idx}`,
                    style: {
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: 10,
                      background: isDefault ? '#fef3c7' : '#f0fdf4',
                      borderRadius: 6,
                      border: `1px solid ${isDefault ? '#fbbf24' : '#86efac'}`
                    }
                  }, [
                    React.createElement('div', {
                      key: 'info',
                      style: { flex: 1 }
                    }, [
                      React.createElement('div', {
                        key: 'name',
                        style: { fontSize: 13, fontWeight: 600, color: '#1f2937' }
                      }, preset.name),
                      React.createElement('div', {
                        key: 'details',
                        style: { fontSize: 11, color: '#6b7280', marginTop: 2 }
                      }, `${preset.conditions.length} condition(s) • ${preset.logic} logic${isDefault ? ' • Default' : ''}`)
                    ]),
                    React.createElement('button', {
                      key: 'load',
                      type: 'button',
                      onClick: () => loadPreset(preset),
                      style: {
                        padding: '5px 12px',
                        fontSize: 12,
                        fontWeight: 600,
                        borderRadius: 4,
                        border: '1px solid #3b82f6',
                        background: '#eff6ff',
                        color: '#1e40af',
                        cursor: 'pointer'
                      }
                    }, '📂 Load'),
                    !isDefault ? React.createElement('button', {
                      key: 'delete',
                      type: 'button',
                      onClick: () => deletePreset(preset),
                      style: {
                        padding: '5px 10px',
                        fontSize: 12,
                        fontWeight: 600,
                        borderRadius: 4,
                        border: '1px solid #ef4444',
                        background: '#fee2e2',
                        color: '#dc2626',
                        cursor: 'pointer'
                      }
                    }, '🗑') : null
                  ]);
                })
          ])
        ]) : null
      ]) : null
    ]);
  }

  function AdvancedFilters({ filters, onChange, availableStakes = [], availablePositions = [], compact = false }) {
    const React = window.React;
    const [expanded, setExpanded] = React.useState(false);
    const [customPresets, setCustomPresets] = React.useState(() => {
      try {
        const saved = localStorage.getItem('customFilterPresets');
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    });
    const [showSaveDialog, setShowSaveDialog] = React.useState(false);
    const [presetName, setPresetName] = React.useState('');
    
    const saveCustomPreset = () => {
      if (!presetName.trim()) {
        if (window.__toast) window.__toast('Please enter a preset name', 'warning', 2000);
        return;
      }
      
      const newPreset = {
        name: presetName.trim(),
        filters: {
          handRange: filters.handRange || 'all',
          stackDepth: filters.stackDepth || 'all',
          actionType: filters.actionType || 'all',
          potSize: filters.potSize || 'all',
          minBetSize: filters.minBetSize || '',
          maxBetSize: filters.maxBetSize || ''
        },
        created: new Date().toISOString()
      };
      
      const updated = [...customPresets, newPreset];
      setCustomPresets(updated);
      localStorage.setItem('customFilterPresets', JSON.stringify(updated));
      setShowSaveDialog(false);
      setPresetName('');
      
      if (window.__toast) {
        window.__toast(`✓ Saved preset: ${newPreset.name}`, 'success', 3000);
      }
    };
    
    const deleteCustomPreset = (index) => {
      const preset = customPresets[index];
      const updated = customPresets.filter((_, i) => i !== index);
      setCustomPresets(updated);
      localStorage.setItem('customFilterPresets', JSON.stringify(updated));
      
      if (window.__toast) {
        window.__toast(`Deleted preset: ${preset.name}`, 'info', 2000);
      }
    };
    
    const handRangePresets = [
      { label: 'All hands', value: 'all' },
      { label: 'Premium (AA-QQ, AKs)', value: 'premium' },
      { label: 'Broadway (AK, AQ, KQ, etc.)', value: 'broadway' },
      { label: 'Pocket pairs', value: 'pairs' },
      { label: 'Suited connectors', value: 'suited-conn' },
      { label: 'Suited aces', value: 'suited-aces' },
    ];
    
    const stackDepthRanges = [
      { label: 'All stack sizes', value: 'all' },
      { label: 'Short (0-40bb)', value: '0-40' },
      { label: 'Medium (40-80bb)', value: '40-80' },
      { label: 'Deep (80-150bb)', value: '80-150' },
      { label: 'Very deep (150bb+)', value: '150+' },
    ];
    
    const actionPresets = [
      { label: 'All actions', value: 'all' },
      { label: 'Single raised pot', value: 'single-raised' },
      { label: '3bet pot', value: '3bet' },
      { label: '4bet+ pot', value: '4bet+' },
      { label: 'Limped pot', value: 'limped' },
      { label: 'Multiway (3+ players)', value: 'multiway' },
    ];
    
    const potSizeRanges = [
      { label: 'All pot sizes', value: 'all' },
      { label: 'Small ($0-10)', value: '0-10' },
      { label: 'Medium ($10-50)', value: '10-50' },
      { label: 'Large ($50-100)', value: '50-100' },
      { label: 'Huge ($100+)', value: '100+' },
    ];
    
    const hasAdvancedFilters = filters.handRange !== 'all' || filters.stackDepth !== 'all' || 
                                filters.actionType !== 'all' || filters.potSize !== 'all' ||
                                (filters.minBetSize && filters.minBetSize !== '') ||
                                (filters.maxBetSize && filters.maxBetSize !== '');
    
    // Filter Presets - Common scenarios
    const filterPresets = [
      { 
        name: '🏆 Premium 3bets', 
        desc: 'AA-QQ, AKs in 3bet pots',
        filters: { handRange: 'premium', actionType: '3bet', stackDepth: 'all', potSize: 'all', minBetSize: '', maxBetSize: '' }
      },
      { 
        name: '💎 Deep Stack', 
        desc: 'Premium hands deep (80bb+)',
        filters: { handRange: 'premium', actionType: 'all', stackDepth: '80-150', potSize: 'all', minBetSize: '', maxBetSize: '' }
      },
      { 
        name: '🎯 Short Stack Shoves', 
        desc: 'Short stack (0-40bb) spots',
        filters: { handRange: 'all', actionType: 'single-raised', stackDepth: '0-40', potSize: 'all', minBetSize: '', maxBetSize: '' }
      },
      { 
        name: '🌊 Multiway Pots', 
        desc: 'Suited connectors multiway',
        filters: { handRange: 'suited-conn', actionType: 'multiway', stackDepth: 'all', potSize: 'all', minBetSize: '', maxBetSize: '' }
      },
      { 
        name: '💰 Big Pots', 
        desc: 'Large pot sizes ($50+)',
        filters: { handRange: 'all', actionType: 'all', stackDepth: 'all', potSize: '50-100', minBetSize: '', maxBetSize: '' }
      },
      { 
        name: '🔥 Overbets', 
        desc: 'Bets 1.5x pot or more',
        filters: { handRange: 'all', actionType: 'all', stackDepth: 'all', potSize: 'all', minBetSize: '1.5', maxBetSize: '' }
      },
    ];
    
    const applyPreset = (preset) => {
      onChange({ ...filters, ...preset.filters });
      if (window.__toast) {
        window.__toast(`Applied: ${preset.name}`, 'info', 2000);
      }
    };
    
    if (compact) {
      return React.createElement('div', {
        style: { marginBottom: 12 }
      }, [
        React.createElement('button', {
          key: 'toggle',
          type: 'button',
          onClick: () => setExpanded(!expanded),
          style: { 
            display: 'flex', 
            alignItems: 'center', 
            gap: 6, 
            fontSize: 13,
            padding: '6px 12px',
            background: hasAdvancedFilters ? '#dbeafe' : '#f9fafb',
            border: hasAdvancedFilters ? '1px solid #3b82f6' : '1px solid #e5e7eb',
            borderRadius: 6,
            cursor: 'pointer'
          }
        }, [
          React.createElement('span', { key: 'icon' }, expanded ? '▼' : '▶'),
          React.createElement('span', { key: 'label' }, hasAdvancedFilters ? 'Advanced Filters (Active)' : 'Advanced Filters'),
        ]),
        expanded ? React.createElement('div', {
          key: 'content',
          style: { 
            marginTop: 12, 
            padding: 12, 
            background: '#f9fafb', 
            borderRadius: 6, 
            border: '1px solid #e5e7eb',
            display: 'flex',
            flexDirection: 'column',
            gap: 12
          }
        }, [
          // Filter Presets Section
          React.createElement('div', { key: 'presets', style: { display: 'flex', flexDirection: 'column', gap: 8 } }, [
            React.createElement('div', { key: 'label', style: { fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 4 } }, '⚡ Quick Presets'),
            React.createElement('div', { key: 'buttons', style: { display: 'flex', flexWrap: 'wrap', gap: 6 } }, 
              filterPresets.map((preset, idx) => 
                React.createElement('button', {
                  key: idx,
                  type: 'button',
                  onClick: () => applyPreset(preset),
                  title: preset.desc,
                  style: {
                    padding: '6px 12px',
                    fontSize: 12,
                    borderRadius: 6,
                    border: '1px solid #d1d5db',
                    background: 'white',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    ':hover': { background: '#eff6ff', borderColor: '#3b82f6' }
                  }
                }, preset.name)
              )
            ),
          ]),
          // Custom Presets Section
          customPresets.length > 0 ? React.createElement('div', { key: 'customPresets', style: { display: 'flex', flexDirection: 'column', gap: 8 } }, [
            React.createElement('div', { key: 'label', style: { fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 4 } }, '💾 My Presets'),
            React.createElement('div', { key: 'buttons', style: { display: 'flex', flexWrap: 'wrap', gap: 6 } }, 
              customPresets.map((preset, idx) => 
                React.createElement('div', {
                  key: idx,
                  style: { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 8px', fontSize: 12, borderRadius: 6, border: '1px solid #d1d5db', background: 'white' }
                }, [
                  React.createElement('button', {
                    key: 'apply',
                    type: 'button',
                    onClick: () => applyPreset(preset),
                    style: {
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '0 4px',
                      fontSize: 12
                    }
                  }, preset.name),
                  React.createElement('button', {
                    key: 'delete',
                    type: 'button',
                    onClick: () => deleteCustomPreset(idx),
                    title: 'Delete preset',
                    style: {
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '0 4px',
                      fontSize: 12,
                      color: '#ef4444'
                    }
                  }, '✕')
                ])
              )
            ),
          ]) : null,
          // Save Current Filters Button
          React.createElement('div', { key: 'saveSection', style: { display: 'flex', gap: 8, alignItems: 'center' } }, [
            React.createElement('button', {
              key: 'saveBtn',
              type: 'button',
              onClick: () => setShowSaveDialog(!showSaveDialog),
              disabled: !hasAdvancedFilters,
              style: {
                padding: '6px 12px',
                fontSize: 12,
                borderRadius: 6,
                border: '1px solid #d1d5db',
                background: hasAdvancedFilters ? 'white' : '#f3f4f6',
                cursor: hasAdvancedFilters ? 'pointer' : 'not-allowed',
                color: hasAdvancedFilters ? '#374151' : '#9ca3af'
              }
            }, '💾 Save Current Filters'),
            showSaveDialog ? React.createElement('div', {
              key: 'dialog',
              style: { display: 'flex', gap: 6, alignItems: 'center' }
            }, [
              React.createElement('input', {
                key: 'input',
                type: 'text',
                placeholder: 'Preset name...',
                value: presetName,
                onChange: (ev) => setPresetName(ev.target.value),
                onKeyDown: (ev) => { if (ev.key === 'Enter') saveCustomPreset(); if (ev.key === 'Escape') setShowSaveDialog(false); },
                autoFocus: true,
                style: {
                  padding: '6px 8px',
                  fontSize: 12,
                  borderRadius: 6,
                  border: '1px solid #d1d5db',
                  width: '180px'
                }
              }),
              React.createElement('button', {
                key: 'save',
                type: 'button',
                onClick: saveCustomPreset,
                style: {
                  padding: '6px 12px',
                  fontSize: 12,
                  borderRadius: 6,
                  border: '1px solid #10b981',
                  background: '#10b981',
                  color: 'white',
                  cursor: 'pointer'
                }
              }, 'Save'),
              React.createElement('button', {
                key: 'cancel',
                type: 'button',
                onClick: () => { setShowSaveDialog(false); setPresetName(''); },
                style: {
                  padding: '6px 12px',
                  fontSize: 12,
                  borderRadius: 6,
                  border: '1px solid #d1d5db',
                  background: 'white',
                  cursor: 'pointer'
                }
              }, 'Cancel')
            ]) : null
          ]),
          // Divider
          React.createElement('div', { key: 'divider', style: { height: 1, background: '#e5e7eb', margin: '4px 0' } }),
          // Filter Controls
          React.createElement('div', { key: 'filters', style: { 
            display: 'grid',
            gap: 12,
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))'
          } }, [
          React.createElement('div', { key: 'handRange', style: { display: 'flex', flexDirection: 'column', gap: 4 } }, [
            React.createElement('label', { key: 'label', style: { fontSize: 12, fontWeight: 600, color: '#6b7280' } }, '🃏 Hand Range (Multi-select)'),
            React.createElement('div', { key: 'checkboxes', style: { display: 'flex', flexDirection: 'column', gap: 4, padding: '6px 8px', background: 'white', borderRadius: 6, border: '1px solid #d1d5db', maxHeight: '150px', overflowY: 'auto' } },
              handRangePresets.filter(opt => opt.value !== 'all').map(opt => {
                const currentRanges = filters.handRange && filters.handRange !== 'all' ? filters.handRange.split(',') : [];
                const isChecked = currentRanges.includes(opt.value);
                
                return React.createElement('label', {
                  key: opt.value,
                  style: { display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, padding: '2px 0' }
                }, [
                  React.createElement('input', {
                    key: 'checkbox',
                    type: 'checkbox',
                    checked: isChecked,
                    onChange: (ev) => {
                      let newRanges;
                      if (ev.target.checked) {
                        newRanges = [...currentRanges, opt.value];
                      } else {
                        newRanges = currentRanges.filter(r => r !== opt.value);
                      }
                      const newValue = newRanges.length > 0 ? newRanges.join(',') : 'all';
                      onChange({ ...filters, handRange: newValue });
                    },
                    style: { cursor: 'pointer' }
                  }),
                  React.createElement('span', { key: 'label' }, opt.label)
                ]);
              })
            ),
            filters.handRange && filters.handRange !== 'all' ? React.createElement('button', {
              key: 'clearAll',
              type: 'button',
              onClick: () => onChange({ ...filters, handRange: 'all' }),
              style: {
                padding: '4px 8px',
                fontSize: 11,
                borderRadius: 4,
                border: '1px solid #d1d5db',
                background: 'white',
                cursor: 'pointer',
                marginTop: 4
              }
            }, 'Clear All') : null
          ]),
          React.createElement('div', { key: 'stackDepth', style: { display: 'flex', flexDirection: 'column', gap: 4 } }, [
            React.createElement('label', { key: 'label', style: { fontSize: 12, fontWeight: 600, color: '#6b7280' } }, '📊 Stack Depth'),
            React.createElement('select', {
              key: 'select',
              value: filters.stackDepth || 'all',
              onChange: (ev) => onChange({ ...filters, stackDepth: ev.target.value }),
              style: { padding: '6px 8px', borderRadius: 6, border: '1px solid #d1d5db' }
            }, stackDepthRanges.map(opt => React.createElement('option', { key: opt.value, value: opt.value }, opt.label)))
          ]),
          React.createElement('div', { key: 'actionType', style: { display: 'flex', flexDirection: 'column', gap: 4 } }, [
            React.createElement('label', { key: 'label', style: { fontSize: 12, fontWeight: 600, color: '#6b7280' } }, '🎲 Action Type'),
            React.createElement('select', {
              key: 'select',
              value: filters.actionType || 'all',
              onChange: (ev) => onChange({ ...filters, actionType: ev.target.value }),
              style: { padding: '6px 8px', borderRadius: 6, border: '1px solid #d1d5db' }
            }, actionPresets.map(opt => React.createElement('option', { key: opt.value, value: opt.value }, opt.label)))
          ]),
          React.createElement('div', { key: 'potSize', style: { display: 'flex', flexDirection: 'column', gap: 4 } }, [
            React.createElement('label', { key: 'label', style: { fontSize: 12, fontWeight: 600, color: '#6b7280' } }, '🏆 Pot Size'),
            React.createElement('select', {
              key: 'select',
              value: filters.potSize || 'all',
              onChange: (ev) => onChange({ ...filters, potSize: ev.target.value }),
              style: { padding: '6px 8px', borderRadius: 6, border: '1px solid #d1d5db' }
            }, potSizeRanges.map(opt => React.createElement('option', { key: opt.value, value: opt.value }, opt.label)))
          ]),
          React.createElement('div', { key: 'betSize', style: { display: 'flex', flexDirection: 'column', gap: 4 } }, [
            React.createElement('label', { key: 'label', style: { fontSize: 12, fontWeight: 600, color: '#6b7280' } }, '💰 Bet Size (x pot)'),
            React.createElement('div', { key: 'inputs', style: { display: 'flex', gap: 4 } }, [
              React.createElement('input', {
                key: 'min',
                type: 'number',
                placeholder: 'Min',
                min: 0,
                max: 10,
                step: 0.1,
                value: filters.minBetSize || '',
                onChange: (ev) => onChange({ ...filters, minBetSize: ev.target.value }),
                style: { flex: 1, padding: '6px 8px', borderRadius: 6, border: '1px solid #d1d5db', width: '80px' }
              }),
              React.createElement('input', {
                key: 'max',
                type: 'number',
                placeholder: 'Max',
                min: 0,
                max: 10,
                step: 0.1,
                value: filters.maxBetSize || '',
                onChange: (ev) => onChange({ ...filters, maxBetSize: ev.target.value }),
                style: { flex: 1, padding: '6px 8px', borderRadius: 6, border: '1px solid #d1d5db', width: '80px' }
              }),
            ])
          ]),
          React.createElement('div', { key: 'actions', style: { display: 'flex', gap: 8, alignItems: 'flex-end' } }, [
            React.createElement('button', {
              key: 'reset',
              type: 'button',
              onClick: () => onChange({ 
                ...filters, 
                handRange: 'all', 
                stackDepth: 'all', 
                actionType: 'all', 
                potSize: 'all',
                minBetSize: '',
                maxBetSize: ''
              }),
              style: { 
                padding: '6px 12px', 
                fontSize: 13,
                borderRadius: 6, 
                border: '1px solid #d1d5db',
                background: 'white',
                cursor: 'pointer'
              }
            }, 'Reset Advanced'),
          ])
        ])
        ]) : null
      ]);
    }
    
    // Non-compact mode (inline)
    return React.createElement('div', {
      style: { 
        display: 'grid',
        gap: 8,
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        marginBottom: 12,
        padding: 12,
        background: '#f9fafb',
        borderRadius: 6,
        border: '1px solid #e5e7eb'
      }
    }, [
      React.createElement('select', {
        key: 'handRange',
        value: filters.handRange || 'all',
        onChange: (ev) => onChange({ ...filters, handRange: ev.target.value }),
      }, handRangePresets.map(opt => React.createElement('option', { key: opt.value, value: opt.value }, opt.label))),
      React.createElement('select', {
        key: 'stackDepth',
        value: filters.stackDepth || 'all',
        onChange: (ev) => onChange({ ...filters, stackDepth: ev.target.value }),
      }, stackDepthRanges.map(opt => React.createElement('option', { key: opt.value, value: opt.value }, opt.label))),
      React.createElement('select', {
        key: 'actionType',
        value: filters.actionType || 'all',
        onChange: (ev) => onChange({ ...filters, actionType: ev.target.value }),
      }, actionPresets.map(opt => React.createElement('option', { key: opt.value, value: opt.value }, opt.label))),
      React.createElement('select', {
        key: 'potSize',
        value: filters.potSize || 'all',
        onChange: (ev) => onChange({ ...filters, potSize: ev.target.value }),
      }, potSizeRanges.map(opt => React.createElement('option', { key: opt.value, value: opt.value }, opt.label))),
    ]);
  }

  const parseHandJson = (hand) => {
    if (!hand) return null;
    if (hand.__parsed) return hand.__parsed;
    // If hand is already a parsed object (from hands:get IPC), return it directly
    if (hand.handId || hand.players || hand.actions) {
      hand.__parsed = hand;
      return hand;
    }
    // Otherwise parse from json string
    let parsed = null;
    if (typeof hand.json === 'string') {
      try { parsed = JSON.parse(hand.json); } catch { parsed = null; }
    }
    if (!parsed && hand.data) parsed = hand.data;
    hand.__parsed = parsed;
    return parsed;
  };

  // Pot Odds Calculator Component
  function PotOddsCalculator({ pot, toCall, formatCurrency }) {
    const React = window.React;
    const ReactEl = React.createElement;
    
    if (!toCall || toCall <= 0) return null;
    
    const potOdds = pot > 0 ? pot / toCall : 0;
    const potOddsPercent = pot > 0 ? (toCall / (pot + toCall)) * 100 : 0;
    const impliedOdds = potOddsPercent;
    
    // Color based on pot odds quality
    const getOddsColor = () => {
      if (potOddsPercent < 25) return '#22c55e'; // Great odds
      if (potOddsPercent < 35) return '#3b82f6'; // Good odds
      if (potOddsPercent < 45) return '#f59e0b'; // Fair odds
      return '#ef4444'; // Poor odds
    };
    
    return ReactEl('div', {
      style: {
        padding: 12,
        background: 'var(--bg-tertiary)',
        border: '1px solid var(--border-default)',
        borderRadius: 6,
        marginBottom: 12
      }
    }, [
      ReactEl('div', {
        key: 'title',
        style: { fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase' }
      }, '💰 Pot Odds Calculator'),
      ReactEl('div', {
        key: 'content',
        style: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, fontSize: 13 }
      }, [
        ReactEl('div', { key: 'pot' }, [
          ReactEl('div', { key: 'label', style: { color: 'var(--text-secondary)', marginBottom: 4 } }, 'Pot Size:'),
          ReactEl('div', { key: 'value', style: { fontWeight: 600, color: 'var(--accent-primary)' } }, formatCurrency(pot))
        ]),
        ReactEl('div', { key: 'call' }, [
          ReactEl('div', { key: 'label', style: { color: 'var(--text-secondary)', marginBottom: 4 } }, 'To Call:'),
          ReactEl('div', { key: 'value', style: { fontWeight: 600, color: 'var(--accent-primary)' } }, formatCurrency(toCall))
        ]),
        ReactEl('div', { key: 'ratio' }, [
          ReactEl('div', { key: 'label', style: { color: 'var(--text-secondary)', marginBottom: 4 } }, 'Pot Odds Ratio:'),
          ReactEl('div', { key: 'value', style: { fontWeight: 600, color: getOddsColor() } }, `${potOdds.toFixed(1)}:1`)
        ]),
        ReactEl('div', { key: 'percent' }, [
          ReactEl('div', { key: 'label', style: { color: 'var(--text-secondary)', marginBottom: 4 } }, 'Equity Needed:'),
          ReactEl('div', { key: 'value', style: { fontWeight: 600, color: getOddsColor() } }, `${potOddsPercent.toFixed(1)}%`)
        ])
      ]),
      ReactEl('div', {
        key: 'bar',
        style: { marginTop: 12, height: 8, background: 'var(--bg-secondary)', borderRadius: 4, overflow: 'hidden' }
      }, [
        ReactEl('div', {
          key: 'fill',
          style: {
            height: '100%',
            width: `${Math.min(100, potOddsPercent)}%`,
            background: getOddsColor(),
            transition: 'width 0.3s ease'
          }
        })
      ]),
      ReactEl('div', {
        key: 'hint',
        style: { marginTop: 8, fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }
      }, potOddsPercent < 33 ? '✓ Good call odds!' : potOddsPercent < 50 ? 'Marginal call odds' : '⚠️ Need strong equity to call')
    ]);
  }

  // Action Timeline Component
  function ActionTimeline({ actions, currentStep, onStepClick, formatCurrency }) {
    const React = window.React;
    const ReactEl = React.createElement;
    
    if (!actions || actions.length === 0) return null;
    
    // Group actions by street
    const streets = { preflop: [], flop: [], turn: [], river: [] };
    actions.forEach((action, idx) => {
      if (action && action.street && streets[action.street]) {
        streets[action.street].push({ ...action, idx });
      }
    });
    
    const getActionIcon = (type) => {
      const icons = {
        fold: '❌',
        call: '✓',
        raise: '⬆️',
        bet: '💰',
        check: '👌',
        posts: '🎯',
        'all-in': '🚀'
      };
      return icons[type] || '•';
    };
    
    const getActionColor = (type) => {
      const colors = {
        fold: '#ef4444',
        call: '#3b82f6',
        raise: '#f59e0b',
        bet: '#22c55e',
        check: '#6b7280',
        posts: '#8b5cf6',
        'all-in': '#ec4899'
      };
      return colors[type] || '#6b7280';
    };
    
    return ReactEl('div', {
      style: {
        padding: 12,
        background: 'var(--bg-tertiary)',
        border: '1px solid var(--border-default)',
        borderRadius: 6,
        marginBottom: 12
      }
    }, [
      ReactEl('div', {
        key: 'title',
        style: { fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 12, textTransform: 'uppercase' }
      }, '📊 Action Timeline'),
      ReactEl('div', {
        key: 'streets',
        style: { display: 'flex', flexDirection: 'column', gap: 12 }
      }, Object.keys(streets).map(street => {
        const streetActions = streets[street];
        if (streetActions.length === 0) return null;
        
        return ReactEl('div', { key: street, style: { display: 'flex', flexDirection: 'column', gap: 4 } }, [
          ReactEl('div', {
            key: 'street-label',
            style: { fontSize: 11, fontWeight: 600, color: 'var(--accent-primary)', textTransform: 'uppercase', marginBottom: 4 }
          }, street),
          ReactEl('div', {
            key: 'actions',
            style: { display: 'flex', flexWrap: 'wrap', gap: 6 }
          }, streetActions.map(action => {
            const isActive = currentStep === action.idx + 1;
            const isPast = currentStep > action.idx + 1;
            
            return ReactEl('div', {
              key: action.idx,
              onClick: () => onStepClick(action.idx + 1),
              style: {
                padding: '4px 8px',
                background: isActive ? 'var(--accent-primary)' : isPast ? 'var(--bg-secondary)' : 'var(--bg-primary)',
                border: `1px solid ${isActive ? 'var(--accent-primary)' : 'var(--border-default)'}`,
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 11,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                transition: 'all 0.2s',
                opacity: isPast ? 0.6 : 1,
                color: isActive ? '#fff' : 'var(--text-primary)'
              },
              onMouseEnter: (e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
              },
              onMouseLeave: (e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = 'none';
              }
            }, [
              ReactEl('span', { key: 'icon' }, getActionIcon(action.type)),
              ReactEl('span', { key: 'player', style: { fontWeight: 600 } }, action.player),
              ReactEl('span', { key: 'type', style: { textTransform: 'capitalize' } }, action.type),
              action.amount ? ReactEl('span', {
                key: 'amount',
                style: { fontWeight: 600, color: isActive ? '#fff' : getActionColor(action.type) }
              }, formatCurrency(action.amount)) : null
            ]);
          }))
        ]);
      }).filter(Boolean))
    ]);
  }

  // EV Display Component
  function EVDisplay({ pot, toCall, estimatedEquity, formatCurrency }) {
    const React = window.React;
    const ReactEl = React.createElement;
    
    if (!toCall || toCall <= 0 || !estimatedEquity) return null;
    
    const potAfterCall = pot + toCall;
    const evCall = (estimatedEquity / 100) * potAfterCall - toCall;
    const evFold = 0;
    const isCallProfitable = evCall > evFold;
    
    const profitPercentage = toCall > 0 ? (evCall / toCall) * 100 : 0;
    
    return ReactEl('div', {
      style: {
        padding: 12,
        background: 'var(--bg-tertiary)',
        border: '1px solid var(--border-default)',
        borderRadius: 6,
        marginBottom: 12
      }
    }, [
      ReactEl('div', {
        key: 'title',
        style: { fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase' }
      }, '📈 Expected Value Analysis'),
      ReactEl('div', {
        key: 'content',
        style: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, fontSize: 13 }
      }, [
        ReactEl('div', { key: 'equity' }, [
          ReactEl('div', { key: 'label', style: { color: 'var(--text-secondary)', marginBottom: 4 } }, 'Estimated Equity:'),
          ReactEl('div', { key: 'value', style: { fontWeight: 600, color: 'var(--accent-primary)' } }, `${estimatedEquity.toFixed(1)}%`)
        ]),
        ReactEl('div', { key: 'ev' }, [
          ReactEl('div', { key: 'label', style: { color: 'var(--text-secondary)', marginBottom: 4 } }, 'EV of Call:'),
          ReactEl('div', {
            key: 'value',
            style: { fontWeight: 600, color: isCallProfitable ? '#22c55e' : '#ef4444' }
          }, `${evCall >= 0 ? '+' : ''}${formatCurrency(evCall)}`)
        ])
      ]),
      ReactEl('div', {
        key: 'verdict',
        style: {
          marginTop: 12,
          padding: 8,
          background: isCallProfitable ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          borderRadius: 4,
          fontSize: 12,
          fontWeight: 600,
          color: isCallProfitable ? '#22c55e' : '#ef4444',
          textAlign: 'center'
        }
      }, isCallProfitable
        ? `✓ Call is +EV (${profitPercentage.toFixed(0)}% ROI)`
        : `❌ Fold is better (-EV: ${Math.abs(profitPercentage).toFixed(0)}%)`
      )
    ]);
  }

  function HandReplayer({ hand, currency }) {
    const React = window.React;
    const [currentStep, setCurrentStep] = React.useState(0);
    const [isPlaying, setIsPlaying] = React.useState(false);
    const [playbackSpeed, setPlaybackSpeed] = React.useState(1000); // ms per step
    const [replayCurrency, setReplayCurrency] = React.useState(currency || 'usd');
    const [notes, setNotes] = React.useState('');
    const [notesLoaded, setNotesLoaded] = React.useState(false);
    const [isEditingNotes, setIsEditingNotes] = React.useState(false);
    const [isSavingNotes, setIsSavingNotes] = React.useState(false);
    
    // Enhancement toggles
    const [showPotOdds, setShowPotOdds] = React.useState(true);
    const [showTimeline, setShowTimeline] = React.useState(true);
    const [showEV, setShowEV] = React.useState(true);
    
    // Parse hand data (safe to do before hooks)
    const parsed = hand ? parseHandJson(hand) : null;
    const handId = hand?.handId || hand?.id || '';
    const actions = parsed && Array.isArray(parsed.actions) ? parsed.actions : [];
    const maxStep = actions.length + 1; // approximate for hooks
    
    // Load notes when hand changes
    React.useEffect(() => {
      if (!handId) return;
      setNotesLoaded(false);
      if (window.api?.getNotes) {
        window.api.getNotes(handId).then(loadedNotes => {
          setNotes(loadedNotes || '');
          setNotesLoaded(true);
          setIsEditingNotes(false);
        }).catch(err => {
          console.error('Failed to load notes:', err);
          setNotesLoaded(true);
        });
      } else {
        setNotesLoaded(true);
      }
    }, [handId]);
    
    // Save notes handler
    const handleSaveNotes = React.useCallback(async () => {
      if (!handId || !window.api?.saveNotes) return;
      setIsSavingNotes(true);
      try {
        const result = await window.api.saveNotes(handId, notes);
        if (result.success) {
          window.__toast?.('Notes saved', 'success');
          setIsEditingNotes(false);
        } else {
          window.__toast?.('Failed to save notes', 'error');
        }
      } catch (err) {
        console.error('Failed to save notes:', err);
        window.__toast?.('Failed to save notes', 'error');
      } finally {
        setIsSavingNotes(false);
      }
    }, [handId, notes]);
    
    // Reset playback when hand changes
    React.useEffect(() => {
      setCurrentStep(0);
      setIsPlaying(false);
    }, [handId]);
    
    // Sync currency with external prop
    React.useEffect(() => {
      if (currency) setReplayCurrency(currency);
    }, [currency]);
    
    // Auto-play functionality
    React.useEffect(() => {
      if (!isPlaying || !hand || !parsed) return;
      if (currentStep >= maxStep) {
        setIsPlaying(false);
        return;
      }
      
      const timer = setTimeout(() => {
        setCurrentStep(prev => Math.min(prev + 1, maxStep));
      }, playbackSpeed);
      
      return () => clearTimeout(timer);
    }, [isPlaying, currentStep, maxStep, playbackSpeed, hand, parsed]);
    
    // Keyboard controls
    React.useEffect(() => {
      if (!hand || !parsed) return;
      
      // Find hero decision steps (where hero is the active player and must act)
      const heroDecisionSteps = [];
      steps.forEach((step, idx) => {
        if (step.action && step.action.player === hero && idx > 0) {
          // This is a step where hero acted, so the previous step is the decision point
          heroDecisionSteps.push(idx - 1);
        }
      });
      
      const handleKey = (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        
        if (e.key === ' ' || e.key === 'Spacebar') {
          e.preventDefault();
          setIsPlaying(prev => !prev);
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          setCurrentStep(prev => Math.max(0, prev - 1));
          setIsPlaying(false);
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          setCurrentStep(prev => Math.min(maxStep, prev + 1));
          setIsPlaying(false);
        } else if (e.key === 'j' || e.key === 'J') {
          // Jump to next hero decision
          e.preventDefault();
          const nextDecision = heroDecisionSteps.find(step => step > currentStep);
          if (nextDecision !== undefined) {
            setCurrentStep(nextDecision);
          }
          setIsPlaying(false);
        } else if (e.key === 'k' || e.key === 'K') {
          // Jump to previous hero decision
          e.preventDefault();
          const prevDecisions = heroDecisionSteps.filter(step => step < currentStep);
          if (prevDecisions.length > 0) {
            setCurrentStep(prevDecisions[prevDecisions.length - 1]);
          }
          setIsPlaying(false);
        } else if (e.key === 'Home') {
          e.preventDefault();
          setCurrentStep(0);
          setIsPlaying(false);
        } else if (e.key === 'End') {
          e.preventDefault();
          setCurrentStep(0);
          setIsPlaying(false);
        } else if (e.key === 'End') {
          e.preventDefault();
          setCurrentStep(maxStep);
          setIsPlaying(false);
        }
      };
      
      window.addEventListener('keydown', handleKey);
      return () => window.removeEventListener('keydown', handleKey);
    }, [maxStep, hand, parsed]);
    
    // Early returns AFTER all hooks
    if (!hand) return Panel({ title: 'Hand Replay', children: 'Select a hand to view replay.' });
    if (!parsed) {
      return Panel({ title: 'Hand Replay', children: 'Unable to load hand JSON.' });
    }
    
    const hero = parsed.hero || parsed.players?.find?.((p) => p && p.isHero)?.name || hand.hero || 'Hero';
    // actions already declared at top for hooks
    const players = Array.isArray(parsed.players) ? parsed.players : [];
    const boardObj = parsed.board || {};
    
    // Check if this is a Run It Twice hand - but ONLY if we have BOTH boards
    const firstBoard = boardObj.firstBoard ? [
      ...(Array.isArray(boardObj.firstBoard.flop) ? boardObj.firstBoard.flop : []),
      ...(boardObj.firstBoard.turn ? [boardObj.firstBoard.turn] : []),
      ...(boardObj.firstBoard.river ? [boardObj.firstBoard.river] : [])
    ] : [];
    
    const secondBoard = boardObj.secondBoard ? [
      ...(Array.isArray(boardObj.secondBoard.flop) ? boardObj.secondBoard.flop : []),
      ...(boardObj.secondBoard.turn ? [boardObj.secondBoard.turn] : []),
      ...(boardObj.secondBoard.river ? [boardObj.secondBoard.river] : [])
    ] : [];
    
    // Only show Run It Twice UI if we have BOTH complete boards
    // If secondBoard is missing, treat as regular hand (prevents showing duplicate boards)
    // Boards must have at least one different card (could be any position: flop, turn, or river)
    const hasAnyDifference = firstBoard.length === 5 && secondBoard.length === 5 && 
                             firstBoard.some((card, idx) => card !== secondBoard[idx]);
    const isRunItTwice = boardObj.runItTwice === true && hasAnyDifference;
    
    // Convert board object to array: { flop: ['9h', 'Js', '6c'], turn: '2d', river: 'Ah' } => ['9h', 'Js', '6c', '2d', 'Ah']
    const board = isRunItTwice ? firstBoard : [
      ...(Array.isArray(boardObj.flop) ? boardObj.flop : []),
      ...(boardObj.turn ? [boardObj.turn] : []),
      ...(boardObj.river ? [boardObj.river] : [])
    ];
    const finalPot = parsed.summary?.totalPot || 0; // Total pot at end of hand
    const stakes = parsed.stakes || {};
    const bbValue = stakes.bb || 0.1; // Default to 0.1 if not specified
    
    // Create map of player hole cards and positions
    const playerCards = {};
    const playerPositions = {};
    players.forEach(p => {
      if (p && p.name) {
        if (p.cards && p.cards.length) {
          playerCards[p.name] = p.cards;
        }
        if (p.position) {
          playerPositions[p.name] = p.position;
        }
      }
    });
    
    // Format currency values
    const formatCurrency = (value) => {
      if (replayCurrency === 'bb' && bbValue > 0) {
        return `${(value / bbValue).toFixed(1)} BB`;
      }
      return `$${formatNumber(value, 2)}`;
    };
    
    // Build replay steps (each action is a step) - calculate directly, no useMemo
    const stepsResult = [];
    let currentPot = 0;
    let currentBoard = [];
    const playerStacks = {};
    const playerBets = {};
    const shownCards = {}; // Track cards shown at showdown
    
    // Initialize player stacks
    players.forEach(p => {
      if (p && p.name) {
        playerStacks[p.name] = p.stack || 0;
        playerBets[p.name] = 0;
      }
    });
    
    // Check for blind/ante posts in the first actions and pre-apply them to initial state
    // Red envelope tables may have multiple antes in addition to blinds
    const blindPosts = [];
    for (let i = 0; i < Math.min(10, actions.length); i++) {
      const act = actions[i];
      if (act && act.type === 'posts' && act.street === 'preflop') {
        blindPosts.push(act);
      } else if (act && act.type !== 'posts') {
        break; // Stop at first non-post action
      }
    }
    
    // Apply blinds to initial state
    blindPosts.forEach(act => {
      const player = act.player;
      const amount = act.amount || 0;
      if (playerStacks[player] !== undefined) {
        playerStacks[player] -= amount;
        playerBets[player] = amount;
      }
      currentPot += amount;
    });
    
    // Red envelope table detection: Check fortune field from summary
    const fortuneBonus = parsed.summary?.extras?.fortune || 0;
    const houseContribution = fortuneBonus > 0 ? fortuneBonus : 0;
    if (houseContribution > 0) {
      currentPot += houseContribution;
    }
    
    // Track folded players
    const foldedPlayers = new Set();
    
    // Track player actions by street
    const playerActions = {}; // { playerName: { preflop: ['C', 'R'], flop: ['B'], ... } }
    players.forEach(p => {
      if (p && p.name) {
        playerActions[p.name] = { preflop: [], flop: [], turn: [], river: [] };
      }
    });
    
    // Initial state (preflop with blinds already posted)
    stepsResult.push({
      step: 0,
      street: 'preflop',
      board: [],
      pot: currentPot,
      action: null,
      stacks: { ...playerStacks },
      bets: { ...playerBets },
      shownCards: {},
      folded: new Set(),
      playerActions: JSON.parse(JSON.stringify(playerActions)),
      description: houseContribution > 0 
        ? `Blinds posted (incl. 🧧 ${formatCurrency(houseContribution)} Red Envelope)` 
        : 'Blinds posted'
    });
    
    let blindCount = 0;
    actions.forEach((action, idx) => {
      if (!action) return;
      
      const street = action.street || 'preflop';
      const player = action.player || 'Unknown';
      const type = action.type || '';
      const amount = action.amount || 0;
      
      // Skip blind posts at the beginning since they're pre-applied to step 0
      if (type === 'posts' && street === 'preflop' && blindCount < blindPosts.length) {
        blindCount++;
        return;
      }
      
      // Update board for new streets
      if (street === 'flop' && currentBoard.length === 0 && board.length >= 3) {
        currentBoard = board.slice(0, 3);
      } else if (street === 'turn' && currentBoard.length === 3 && board.length >= 4) {
        currentBoard = board.slice(0, 4);
      } else if (street === 'river' && currentBoard.length === 4 && board.length >= 5) {
        currentBoard = board.slice(0, 5);
      }
      
      // Update stacks and pot
      if (type.includes('bet') || type.includes('raise') || type.includes('call') || type.includes('posts')) {
        if (playerStacks[player] !== undefined) {
          playerStacks[player] -= amount;
          playerBets[player] = (playerBets[player] || 0) + amount;
        }
        currentPot += amount;
      }
      
      // Track folds
      if (type === 'folds' || type === 'fold') {
        foldedPlayers.add(player);
      }
      
      // Track player actions for display
      if (playerActions[player] && street && playerActions[player][street]) {
        let actionCode = '?';
        if (type === 'folds' || type === 'fold') actionCode = 'F';
        else if (type === 'checks' || type === 'check') actionCode = 'X';
        else if (type === 'calls' || type === 'call') actionCode = 'C';
        else if (type === 'bets' || type === 'bet') actionCode = 'B';
        else if (type === 'raises' || type === 'raise') actionCode = 'R';
        else if (type === 'all-in') actionCode = 'A';
        
        if (actionCode !== '?') {
          playerActions[player][street].push(actionCode);
        }
      }
      
      // Track shown cards at showdown
      if (type === 'show' && action.cards && action.cards.length) {
        shownCards[player] = action.cards;
      }
      
      // Clear bets when moving to new street
      if (idx > 0 && actions[idx - 1]?.street !== street) {
        Object.keys(playerBets).forEach(p => playerBets[p] = 0);
      }
      
      // Build description with special handling for posts (blinds)
      let desc = '';
      if (type === 'posts' && action.postType) {
        desc = `${player} posts ${action.postType} $${amount.toFixed(2)}`;
      } else if (amount > 0) {
        desc = `${player} ${type} $${amount.toFixed(2)}`;
      } else {
        desc = `${player} ${type}`;
      }
      
      stepsResult.push({
        step: idx + 1,
        street,
        board: [...currentBoard],
        pot: currentPot,
        action,
        stacks: { ...playerStacks },
        bets: { ...playerBets },
        shownCards: { ...shownCards },
        folded: new Set(foldedPlayers),
        playerActions: JSON.parse(JSON.stringify(playerActions)),
        description: desc
      });
    });
    
    // Final state (showdown)
    stepsResult.push({
      step: actions.length + 1,
      street: 'showdown',
      board: board,
      pot: currentPot,
      action: null,
      stacks: { ...playerStacks },
      bets: {},
      shownCards: { ...shownCards },
      folded: new Set(foldedPlayers),
      playerActions: JSON.parse(JSON.stringify(playerActions)),
      description: 'Showdown'
    });
    
    const steps = stepsResult;
    // maxStep already declared at top for hooks - update it here
    const actualMaxStep = steps.length - 1;
    const currentState = steps[currentStep] || steps[0];
    
    // Track new cards for animation
    const previousState = currentStep > 0 ? steps[currentStep - 1] : null;
    const previousBoardLength = previousState ? previousState.board.length : 0;
    const newCardIndices = new Set();
    if (currentState.board) {
      currentState.board.forEach((_, idx) => {
        if (idx >= previousBoardLength) {
          newCardIndices.add(idx);
        }
      });
    }
    
    // Build street markers
    const streetMarkers = [];
    let lastStreet = '';
    steps.forEach((state, idx) => {
      if (state.street !== lastStreet) {
        streetMarkers.push({ step: idx, street: state.street });
        lastStreet = state.street;
      }
    });
    
    const jumpToStreet = (street) => {
      const marker = streetMarkers.find(m => m.street === street);
      if (marker) {
        setCurrentStep(marker.step);
        setIsPlaying(false);
      }
    };
    
    // Helper to render a playing card
    const renderCard = (card, small = false) => {
      if (!card) return null;
      // Convert card format: "Jh" => "J♥", "6d" => "6♦", etc.
      const suitMap = { h: '♥', d: '♦', c: '♣', s: '♠' };
      let displayCard = card;
      if (card.length === 2 || card.length === 3) {
        const rank = card.slice(0, -1);
        const suitLetter = card.slice(-1).toLowerCase();
        const suitSymbol = suitMap[suitLetter];
        if (suitSymbol) {
          displayCard = rank + suitSymbol;
        }
      }
      const isRed = displayCard.includes('♥') || displayCard.includes('♦');
      return React.createElement('div', {
        style: {
          background: 'white',
          padding: small 
            ? 'clamp(7px, 0.66vw, 13px) clamp(9px, 0.92vw, 18px)' 
            : 'clamp(9px, 0.92vw, 18px) clamp(13px, 1.32vw, 26px)',
          borderRadius: small 
            ? 'clamp(5px, 0.53vw, 8px)' 
            : 'clamp(7px, 0.66vw, 11px)',
          fontSize: small 
            ? 'clamp(16px, 1.58vw, 26px)' 
            : 'clamp(21px, 2.11vw, 37px)',
          fontWeight: 700,
          boxShadow: '0 6px 12px rgba(0,0,0,0.4)',
          border: 'clamp(2px, 0.2vw, 3px) solid #e5e7eb',
          minWidth: small 
            ? 'clamp(33px, 3.3vw, 53px)' 
            : 'clamp(46px, 4.62vw, 73px)',
          textAlign: 'center',
          color: isRed ? '#dc2626' : '#1f2937',
          fontFamily: 'monospace'
        }
      }, displayCard);
    };
    
    // Helper to render chip stack
    const renderChipStack = (amount, animate = false) => {
      if (!amount || amount <= 0) return null;
      const chipColors = [
        { threshold: 100, color: '#1f2937' }, // Black for 100+
        { threshold: 25, color: '#15803d' },  // Green for 25+
        { threshold: 5, color: '#dc2626' },   // Red for 5+
        { threshold: 1, color: '#2563eb' },   // Blue for 1+
        { threshold: 0, color: '#fff7ed' }    // White for <1
      ];
      const chipColor = chipColors.find(c => amount >= c.threshold)?.color || '#fff7ed';
      
      return React.createElement('div', {
        style: {
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          animation: animate ? 'chipSlide 0.3s ease-out' : 'none'
        }
      }, [
        React.createElement('div', {
          key: 'chip',
          style: {
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: chipColor,
            border: '2px solid rgba(0,0,0,0.3)',
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
            display: 'inline-block'
          }
        }),
        React.createElement('span', {
          key: 'amount',
          style: {
            fontSize: 12,
            fontWeight: 600,
            color: '#fef3c7'
          }
        }, formatCurrency(amount))
      ]);
    };
    
    // Simple hand strength evaluator (basic heuristic)
    const evaluateHandStrength = (holeCards, board) => {
      if (!holeCards || holeCards.length !== 2) return null;
      
      // Extract ranks and suits
      const parseCard = (card) => {
        const rank = card.slice(0, -1);
        const suit = card.slice(-1).toLowerCase();
        const rankValue = { 'A': 14, 'K': 13, 'Q': 12, 'J': 11, 'T': 10 }[rank] || parseInt(rank);
        return { rank, rankValue, suit, card };
      };
      
      const hole = holeCards.map(parseCard);
      const boardCards = (board || []).map(parseCard);
      const allCards = [...hole, ...boardCards];
      
      // Preflop evaluation
      if (!board || board.length === 0) {
        const [c1, c2] = hole;
        const isPair = c1.rankValue === c2.rankValue;
        const isHighCards = c1.rankValue >= 10 && c2.rankValue >= 10;
        const isSuited = c1.suit === c2.suit;
        const maxRank = Math.max(c1.rankValue, c2.rankValue);
        
        if (isPair && maxRank >= 10) return { strength: 'premium', label: 'Premium Pair', color: '#22c55e', emoji: '💎' };
        if (isPair) return { strength: 'strong', label: 'Pocket Pair', color: '#3b82f6', emoji: '👍' };
        if (isHighCards && isSuited) return { strength: 'strong', label: 'Suited High', color: '#3b82f6', emoji: '👍' };
        if (isHighCards) return { strength: 'medium', label: 'High Cards', color: '#f59e0b', emoji: '👌' };
        if (maxRank >= 10) return { strength: 'medium', label: 'Medium', color: '#f59e0b', emoji: '👌' };
        return { strength: 'weak', label: 'Weak', color: '#ef4444', emoji: '⚠️' };
      }
      
      // Post-flop: proper hand ranking
      const ranks = allCards.map(c => c.rankValue);
      const suits = allCards.map(c => c.suit);
      
      // Count ranks
      const rankCounts = {};
      ranks.forEach(r => rankCounts[r] = (rankCounts[r] || 0) + 1);
      const counts = Object.values(rankCounts).sort((a, b) => b - a);
      
      // Count suits for flush
      const suitCounts = {};
      suits.forEach(s => suitCounts[s] = (suitCounts[s] || 0) + 1);
      const maxSuitCount = Math.max(...Object.values(suitCounts));
      const hasFlush = maxSuitCount >= 5;
      
      // Check for straight
      const uniqueRanks = [...new Set(ranks)].sort((a, b) => b - a);
      let hasStraight = false;
      for (let i = 0; i <= uniqueRanks.length - 5; i++) {
        if (uniqueRanks[i] - uniqueRanks[i + 4] === 4) {
          hasStraight = true;
          break;
        }
      }
      // Check for wheel (A-2-3-4-5)
      if (uniqueRanks.includes(14) && uniqueRanks.includes(2) && uniqueRanks.includes(3) && uniqueRanks.includes(4) && uniqueRanks.includes(5)) {
        hasStraight = true;
      }
      
      // Determine hand strength
      if (hasStraight && hasFlush) return { strength: 'premium', label: 'Straight Flush!', color: '#22c55e', emoji: '🔥' };
      if (counts[0] === 4) return { strength: 'premium', label: 'Four of a Kind!', color: '#22c55e', emoji: '💎' };
      if (counts[0] === 3 && counts[1] === 2) return { strength: 'premium', label: 'Full House!', color: '#22c55e', emoji: '🏠' };
      if (hasFlush) return { strength: 'premium', label: 'Flush!', color: '#22c55e', emoji: '💧' };
      if (hasStraight) return { strength: 'strong', label: 'Straight!', color: '#3b82f6', emoji: '📈' };
      if (counts[0] === 3) return { strength: 'strong', label: 'Three of a Kind', color: '#3b82f6', emoji: '🎯' };
      if (counts[0] === 2 && counts[1] === 2) return { strength: 'medium', label: 'Two Pair', color: '#f59e0b', emoji: '�' };
      if (counts[0] === 2) {
        const pairRank = parseInt(Object.keys(rankCounts).find(r => rankCounts[r] === 2));
        if (pairRank >= 10) return { strength: 'medium', label: 'Good Pair', color: '#f59e0b', emoji: '�' };
        return { strength: 'weak', label: 'Low Pair', color: '#ef4444', emoji: '⚠️' };
      }
      
      // High card
      const hasHoleCardInPlay = hole.some(h => h.rankValue >= 10);
      if (hasHoleCardInPlay) return { strength: 'weak', label: 'High Card', color: '#ef4444', emoji: '⚠️' };
      return { strength: 'weak', label: 'Nothing', color: '#ef4444', emoji: '❌' };
    };
    
    // Calculate outs for draws (returns { outs: number, draws: string[] })
    const calculateOuts = (holeCards, board) => {
      if (!holeCards || holeCards.length !== 2 || !board || board.length < 3) return null;
      
      const parseCard = (card) => {
        const rank = card.slice(0, -1);
        const suit = card.slice(-1).toLowerCase();
        const rankValue = { 'A': 14, 'K': 13, 'Q': 12, 'J': 11, 'T': 10 }[rank] || parseInt(rank);
        return { rank, rankValue, suit, card };
      };
      
      const hole = holeCards.map(parseCard);
      const boardCards = board.map(parseCard);
      const allCards = [...hole, ...boardCards];
      
      const ranks = allCards.map(c => c.rankValue);
      const suits = allCards.map(c => c.suit);
      const holeSuits = hole.map(c => c.suit);
      const holeRanks = hole.map(c => c.rankValue);
      
      let totalOuts = 0;
      const draws = [];
      
      // Count suits for flush draw
      const suitCounts = {};
      suits.forEach(s => suitCounts[s] = (suitCounts[s] || 0) + 1);
      const maxSuitCount = Math.max(...Object.values(suitCounts));
      const flushSuit = Object.keys(suitCounts).find(s => suitCounts[s] === maxSuitCount);
      
      // Flush draw (4 cards of same suit)
      if (maxSuitCount === 4 && holeSuits.includes(flushSuit)) {
        // 9 outs for flush (13 total cards in suit - 4 we see)
        totalOuts += 9;
        draws.push('Flush Draw');
      }
      
      // Check for straight draws
      const uniqueRanks = [...new Set(ranks)].sort((a, b) => a - b);
      const rankGaps = [];
      
      // Find potential straight sequences
      for (let i = 0; i < uniqueRanks.length - 1; i++) {
        const gap = uniqueRanks[i + 1] - uniqueRanks[i];
        if (gap <= 3) { // Within straight range
          rankGaps.push({ from: uniqueRanks[i], to: uniqueRanks[i + 1], gap });
        }
      }
      
      // Open-ended straight draw: need 1 card on either end of 4-card sequence
      // Example: 5-6-7-8 needs 4 or 9
      let hasStraightDraw = false;
      if (uniqueRanks.length >= 4) {
        for (let i = 0; i <= uniqueRanks.length - 4; i++) {
          const sequence = uniqueRanks.slice(i, i + 4);
          if (sequence[3] - sequence[0] === 3) {
            // Check if at least one hole card is in this sequence
            if (holeRanks.some(hr => hr >= sequence[0] && hr <= sequence[3])) {
              totalOuts += 8; // 4 cards on each end
              draws.push('Open-Ended Straight Draw');
              hasStraightDraw = true;
              break;
            }
          }
        }
      }
      
      // Gutshot straight draw: need 1 card in the middle of sequence
      // Example: 5-6-8-9 needs 7
      if (!hasStraightDraw && uniqueRanks.length >= 4) {
        for (let i = 0; i <= uniqueRanks.length - 3; i++) {
          for (let j = i + 2; j < Math.min(i + 5, uniqueRanks.length); j++) {
            if (uniqueRanks[j] - uniqueRanks[i] === 4) {
              // Check if at least one hole card is involved
              if (holeRanks.some(hr => hr >= uniqueRanks[i] && hr <= uniqueRanks[j])) {
                totalOuts += 4; // 4 cards of the missing rank
                draws.push('Gutshot Straight Draw');
                hasStraightDraw = true;
                break;
              }
            }
          }
          if (hasStraightDraw) break;
        }
      }
      
      // Pair outs (if no pair yet, count outs to make a pair with hole cards)
      const rankCounts = {};
      ranks.forEach(r => rankCounts[r] = (rankCounts[r] || 0) + 1);
      const hasPair = Object.values(rankCounts).some(count => count >= 2);
      
      if (!hasPair && draws.length > 0) {
        // If we have a draw but no pair, we might have 6 additional outs (2 per hole card rank)
        // But only count if not already counted in flush/straight
        const pairOuts = holeRanks.filter(hr => !rankCounts[hr] || rankCounts[hr] === 1).length * 3;
        if (pairOuts > 0) {
          totalOuts += Math.min(pairOuts, 6); // Cap at 6
          draws.push('Overcards');
        }
      }
      
      if (totalOuts === 0) return null;
      
      return { outs: totalOuts, draws, cardsToCome: board.length === 3 ? 2 : 1 };
    };
    
    // Simplified equity estimator (based on hand strength and outs)
    const estimateEquity = (holeCards, board, numOpponents = 1) => {
      if (!holeCards || holeCards.length !== 2) return null;
      if (!board || board.length === 0) {
        // Preflop equity estimation (very simplified)
        const parseCard = (card) => {
          const rank = card.slice(0, -1);
          const rankValue = { 'A': 14, 'K': 13, 'Q': 12, 'J': 11, 'T': 10 }[rank] || parseInt(rank);
          const suit = card.slice(-1).toLowerCase();
          return { rankValue, suit };
        };
        
        const [c1, c2] = holeCards.map(parseCard);
        const isPair = c1.rankValue === c2.rankValue;
        const isSuited = c1.suit === c2.suit;
        const maxRank = Math.max(c1.rankValue, c2.rankValue);
        const minRank = Math.min(c1.rankValue, c2.rankValue);
        const gap = maxRank - minRank;
        
        // Premium hands
        if (isPair && maxRank >= 13) return { equity: 85, quality: 'premium' }; // AA, KK
        if (isPair && maxRank >= 11) return { equity: 75, quality: 'premium' }; // QQ, JJ
        if (isPair && maxRank >= 9) return { equity: 68, quality: 'strong' }; // TT, 99
        if (isPair) return { equity: 55, quality: 'medium' }; // Low pairs
        
        // High cards
        if (maxRank === 14 && minRank >= 12) return { equity: isSuited ? 67 : 64, quality: 'strong' }; // AK, AQ
        if (maxRank === 14 && minRank >= 10) return { equity: isSuited ? 62 : 58, quality: 'medium' }; // AJ, AT
        if (maxRank === 13 && minRank >= 11) return { equity: isSuited ? 61 : 57, quality: 'medium' }; // KQ, KJ
        
        // Suited connectors
        if (isSuited && gap <= 1 && maxRank >= 9) return { equity: 56, quality: 'medium' };
        if (isSuited && gap <= 2) return { equity: 50, quality: 'weak' };
        
        // Default
        if (maxRank >= 10) return { equity: 45, quality: 'weak' };
        return { equity: 35, quality: 'weak' };
      }
      
      // Post-flop: base equity on made hand strength
      const handStrength = evaluateHandStrength(holeCards, board);
      if (!handStrength) return { equity: 40, quality: 'weak' };
      
      const cardsTocome = 5 - board.length;
      let baseEquity = 40;
      
      // Adjust based on made hand
      if (handStrength.strength === 'premium') {
        if (handStrength.label.includes('Straight Flush')) baseEquity = 99;
        else if (handStrength.label.includes('Four of a Kind')) baseEquity = 98;
        else if (handStrength.label.includes('Full House')) baseEquity = 95;
        else if (handStrength.label.includes('Flush')) baseEquity = 85;
        else baseEquity = 80;
      } else if (handStrength.strength === 'strong') {
        if (handStrength.label.includes('Straight')) baseEquity = 75;
        else if (handStrength.label.includes('Three')) baseEquity = 65;
        else baseEquity = 70;
      } else if (handStrength.strength === 'medium') {
        if (handStrength.label.includes('Two Pair')) baseEquity = 55;
        else baseEquity = 50;
      } else {
        baseEquity = 30;
      }
      
      // Adjust for cards to come (more uncertainty early)
      if (board.length === 3) baseEquity *= 0.95; // Flop: slight reduction
      if (board.length === 4) baseEquity *= 0.98; // Turn: minimal reduction
      
      // Adjust for number of opponents (simplified)
      const opponentFactor = Math.max(0.85, 1 - (numOpponents - 1) * 0.05);
      baseEquity *= opponentFactor;
      
      const quality = baseEquity >= 75 ? 'premium' : baseEquity >= 60 ? 'strong' : baseEquity >= 45 ? 'medium' : 'weak';
      
      return { equity: Math.round(Math.min(99, Math.max(1, baseEquity))), quality };
    };
    
    // Position players around table (max 9 seats)
    const playerList = Object.entries(currentState.stacks);
    const seatPositions = [
      { top: '5%', left: '50%', transform: 'translateX(-50%)' }, // Seat 1 (top)
      { top: '15%', right: '15%' }, // Seat 2
      { top: '40%', right: '5%' }, // Seat 3
      { bottom: '25%', right: '10%' }, // Seat 4
      { bottom: '5%', right: '35%' }, // Seat 5
      { bottom: '5%', left: '35%' }, // Seat 6
      { bottom: '25%', left: '10%' }, // Seat 7
      { top: '40%', left: '5%' }, // Seat 8
      { top: '15%', left: '15%' }, // Seat 9
    ];
    
    return Panel({
      title: `Hand Replay - ${hand.handId || hand.id || ''}`,
      children: React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } }, [
        
        // Playback controls at top
        React.createElement('div', { key: 'controls-top', style: { display: 'flex', gap: 8, alignItems: 'center', padding: '8px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' } }, [
          React.createElement('button', {
            key: 'prev',
            type: 'button',
            onClick: () => {
              setCurrentStep(prev => Math.max(0, prev - 1));
              setIsPlaying(false);
            },
            disabled: currentStep === 0,
            style: { padding: '6px 12px', fontSize: 14 }
          }, '◀'),
          React.createElement('button', {
            key: 'play',
            type: 'button',
            onClick: () => setIsPlaying(prev => !prev),
            style: { 
              padding: '6px 16px',
              background: isPlaying ? '#ef4444' : '#22c55e',
              color: 'white',
              fontWeight: 600,
              fontSize: 14
            }
          }, isPlaying ? '⏸' : '▶'),
          React.createElement('button', {
            key: 'next',
            type: 'button',
            onClick: () => {
              setCurrentStep(prev => Math.min(actualMaxStep, prev + 1));
              setIsPlaying(false);
            },
            disabled: currentStep === actualMaxStep,
            style: { padding: '6px 12px', fontSize: 14 }
          }, '▶'),
          React.createElement('div', { key: 'spacer', style: { flex: 1 } }),
          React.createElement('button', {
            key: 'currency-toggle',
            type: 'button',
            onClick: () => setReplayCurrency(prev => prev === 'usd' ? 'bb' : 'usd'),
            style: { 
              padding: '6px 12px',
              fontSize: 13,
              background: '#3b82f6',
              color: 'white',
              fontWeight: 600,
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer'
            }
          }, replayCurrency === 'usd' ? '💵 USD' : '🎲 BB'),
          React.createElement('select', {
            key: 'speed',
            value: playbackSpeed,
            onChange: (e) => setPlaybackSpeed(Number(e.target.value)),
            style: { padding: '6px 12px' }
          }, [
            React.createElement('option', { key: 'fast', value: 500 }, '2x'),
            React.createElement('option', { key: 'normal', value: 1000 }, '1x'),
            React.createElement('option', { key: 'slow', value: 2000 }, '0.5x'),
          ]),
          React.createElement('div', { key: 'step-info', style: { fontSize: 13, color: '#6b7280', fontWeight: 500 } },
            `Step ${currentStep}/${actualMaxStep} - ${currentState.street.toUpperCase()}`
          )
        ]),
        
        // Enhancement components (Pot Odds, Timeline, EV)
        React.createElement('div', { key: 'enhancements', style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 } }, [
          // Toggle buttons row
          React.createElement('div', { key: 'toggles', style: { gridColumn: '1 / -1', display: 'flex', gap: 8, padding: '8px 12px', background: 'var(--bg-tertiary)', borderRadius: 6 } }, [
            React.createElement('button', {
              key: 'toggle-odds',
              type: 'button',
              onClick: () => setShowPotOdds(prev => !prev),
              style: {
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 600,
                background: showPotOdds ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                color: showPotOdds ? 'white' : 'var(--text-secondary)',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }
            }, '💰 Pot Odds'),
            React.createElement('button', {
              key: 'toggle-timeline',
              type: 'button',
              onClick: () => setShowTimeline(prev => !prev),
              style: {
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 600,
                background: showTimeline ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                color: showTimeline ? 'white' : 'var(--text-secondary)',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }
            }, '📊 Timeline'),
            React.createElement('button', {
              key: 'toggle-ev',
              type: 'button',
              onClick: () => setShowEV(prev => !prev),
              style: {
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 600,
                background: showEV ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                color: showEV ? 'white' : 'var(--text-secondary)',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }
            }, '📈 EV Analysis')
          ]),
          
          // Pot Odds Calculator
          (() => {
            if (!showPotOdds) return null;
            
            // Calculate current pot and amount to call for hero
            const heroPlayer = parsed?.hero;
            const currentBet = Math.max(...Object.values(currentState.bets || {}));
            const heroBet = heroPlayer && currentState.bets ? (currentState.bets[heroPlayer] || 0) : 0;
            const toCall = Math.max(0, currentBet - heroBet);
            
            // Only show if hero has a decision to make
            if (toCall === 0) return null;
            
            return PotOddsCalculator({
              key: 'pot-odds',
              pot: currentState.pot || 0,
              toCall: toCall,
              formatCurrency: formatCurrency
            });
          })(),
          
          // Action Timeline
          showTimeline ? ActionTimeline({
            key: 'timeline',
            actions: steps.map((step, idx) => ({
              street: step.street,
              player: step.player || 'Table',
              action: step.action || 'deal',
              amount: step.amount || 0,
              pot: step.pot || 0
            })),
            currentStep: currentStep,
            onStepClick: (stepIdx) => {
              setCurrentStep(stepIdx);
              setIsPlaying(false);
            },
            formatCurrency: formatCurrency
          }) : null,
          
          // EV Display
          (() => {
            if (!showEV) return null;
            
            // Calculate for hero only when there's a decision
            const heroPlayer = parsed?.hero;
            const heroHoleCards = currentState.players?.[heroPlayer]?.cards || [];
            const currentBet = Math.max(...Object.values(currentState.bets || {}));
            const heroBet = heroPlayer && currentState.bets ? (currentState.bets[heroPlayer] || 0) : 0;
            const toCall = Math.max(0, currentBet - heroBet);
            
            // Only show if hero has cards and a decision to make
            if (toCall === 0 || heroHoleCards.length !== 2) return null;
            
            // Calculate estimated equity
            const numOpponents = Object.keys(currentState.players || {}).filter(p => 
              p !== heroPlayer && !(currentState.folded || []).includes(p)
            ).length;
            
            const equityData = estimateEquity(heroHoleCards, currentState.board || [], numOpponents);
            const estimatedEquity = equityData ? equityData.equity : 50;
            
            return EVDisplay({
              key: 'ev-display',
              pot: currentState.pot || 0,
              toCall: toCall,
              estimatedEquity: estimatedEquity,
              formatCurrency: formatCurrency
            });
          })()
        ].filter(Boolean)),
        
        // Main content: Table + Action log side by side
        React.createElement('div', { key: 'main', style: { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, minHeight: 400 } }, [
          
          // Left: Table view
          React.createElement('div', { key: 'table-view', style: { 
            background: '#0a5c3a',
            borderRadius: 8,
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            border: '3px solid #78350f'
          } }, [
            // Board cards - Show both boards for Run It Twice hands
            React.createElement('div', { key: 'board', style: { display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' } }, [
              React.createElement('div', { key: 'label', style: { fontSize: 12, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' } }, 
                isRunItTwice ? '🎲 Run It Twice' : 'Board'
              ),
              isRunItTwice ? React.createElement('div', { key: 'both-boards', style: { display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' } }, [
                // First Board
                React.createElement('div', { key: 'first', style: { display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' } }, [
                  React.createElement('div', { key: 'label1', style: { fontSize: 10, color: '#fbbf24', fontWeight: 600 } }, 'BOARD 1'),
                  React.createElement('div', { key: 'cards1', style: { display: 'flex', gap: 'clamp(7px, 0.66vw, 13px)' } },
                    firstBoard.map((card, idx) => renderCard(card))
                  )
                ]),
                // Second Board
                React.createElement('div', { key: 'second', style: { display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' } }, [
                  React.createElement('div', { key: 'label2', style: { fontSize: 10, color: '#fbbf24', fontWeight: 600 } }, 'BOARD 2'),
                  React.createElement('div', { key: 'cards2', style: { display: 'flex', gap: 'clamp(7px, 0.66vw, 13px)' } },
                    secondBoard.map((card, idx) => {
                      // Highlight ANY card that differs from first board (could be flop, turn, or river)
                      const isDifferent = card !== firstBoard[idx];
                      return React.createElement('div', {
                        key: idx,
                        style: {
                          boxShadow: isDifferent ? '0 0 12px rgba(251, 191, 36, 0.8)' : 'none',
                          borderRadius: 4
                        }
                      }, renderCard(card));
                    })
                  )
                ])
              ]) : React.createElement('div', { key: 'cards', style: { display: 'flex', gap: 'clamp(7px, 0.66vw, 13px)', minHeight: 'clamp(50px, 5vw, 90px)' } },
                // Always render 5 card slots to prevent jitter
                [0, 1, 2, 3, 4].map((idx) => {
                  const card = currentState.board[idx];
                  if (card) {
                    const isNew = newCardIndices.has(idx);
                    return React.createElement('div', {
                      key: `${card}-${idx}-${isNew ? 'new' : 'old'}`,
                      style: {
                        animation: isNew ? 'cardFlip 0.5s ease-out' : 'none'
                      }
                    }, renderCard(card, false, false));
                  } else {
                    // Empty placeholder card slot
                    return React.createElement('div', {
                      key: `empty-${idx}`,
                      style: {
                        width: 'clamp(46px, 4.62vw, 73px)',
                        height: 'clamp(50px, 5vw, 90px)',
                        border: '2px dashed rgba(255,255,255,0.2)',
                        borderRadius: 'clamp(7px, 0.66vw, 11px)',
                        background: 'rgba(255,255,255,0.05)'
                      }
                    });
                  }
                })
              )
            ]),
            
            // Pot with enhanced breakdown
            React.createElement('div', { key: 'pot', style: { 
              textAlign: 'center',
              padding: '12px',
              background: 'rgba(0,0,0,0.3)',
              borderRadius: 8,
              border: '2px solid #fbbf24'
            } }, [
              React.createElement('div', { key: 'label', style: { fontSize: 11, color: '#fbbf24', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase' } }, 'Pot'),
              React.createElement('div', { key: 'amount', style: { fontSize: 24, fontWeight: 700, color: '#fef3c7' } }, formatCurrency(currentState.pot)),
              // Show pot growth indicator
              (() => {
                if (currentStep === 0) return null;
                const prevStep = steps[currentStep - 1];
                const potGrowth = currentState.pot - prevStep.pot;
                if (potGrowth <= 0) return null;
                return React.createElement('div', { 
                  key: 'growth',
                  style: { 
                    fontSize: 11, 
                    color: '#86efac', 
                    marginTop: 4,
                    fontWeight: 600,
                    animation: 'fadeIn 0.5s ease-in'
                  }
                }, `↑ +${formatCurrency(potGrowth)}`);
              })(),
              // Show current street bets total
              (() => {
                const totalBets = Object.values(currentState.bets).reduce((sum, bet) => sum + bet, 0);
                if (totalBets === 0) return null;
                return React.createElement('div', { 
                  key: 'street-bets',
                  style: { 
                    fontSize: 10, 
                    color: '#fed7aa', 
                    marginTop: 6,
                    padding: '3px 8px',
                    background: 'rgba(251, 146, 60, 0.2)',
                    borderRadius: 4,
                    border: '1px solid #fb923c'
                  }
                }, `Current bets: ${formatCurrency(totalBets)}`);
              })(),
              // Red envelope indicator
              houseContribution > 0 ? React.createElement('div', { key: 'house', style: { 
                fontSize: 10, 
                color: '#fbbf24', 
                marginTop: 6,
                padding: '3px 6px',
                background: 'rgba(251, 191, 36, 0.2)',
                borderRadius: 4,
                border: '1px solid #fbbf24'
              } }, `🧧 Red Envelope +${formatCurrency(houseContribution)}`) : null
            ].filter(Boolean)),
            
            // Players grid
            React.createElement('div', { key: 'players', style: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, flex: 1 } },
              Object.entries(currentState.stacks).map(([player, stack]) => {
                const bet = currentState.bets[player] || 0;
                const isHero = player === hero;
                const isActive = currentState.action?.player === player;
                const isFolded = currentState.folded && currentState.folded.has(player);
                // Show dealt cards (hero) or shown cards (showdown) or empty for hidden
                const visibleCards = (currentState.shownCards && currentState.shownCards[player]) || playerCards[player] || [];
                const holeCards = visibleCards;
                const position = playerPositions[player];
                // Evaluate hand strength for hero
                const handStrength = isHero && holeCards.length === 2 ? evaluateHandStrength(holeCards, currentState.board) : null;
                
                return React.createElement('div', {
                  key: player,
                  style: {
                    background: isFolded 
                      ? 'rgba(100,100,100,0.3)' 
                      : (isHero ? '#fbbf24' : 'rgba(255,255,255,0.9)'),
                    padding: '10px 12px',
                    borderRadius: 6,
                    border: isFolded 
                      ? '2px dashed rgba(100,100,100,0.5)'
                      : (isActive ? '3px solid #3b82f6' : '2px solid rgba(0,0,0,0.2)'),
                    boxShadow: isActive ? '0 0 12px rgba(59,130,246,0.8)' : 'none',
                    transition: 'all 0.2s',
                    position: 'relative',
                    animation: isActive ? 'pulse 2s ease-in-out infinite' : 'none',
                    opacity: isFolded ? 0.5 : 1,
                    filter: isFolded ? 'grayscale(80%)' : 'none'
                  }
                }, [
                  // Position badge in top-right corner
                  position ? React.createElement('div', { 
                    key: 'position',
                    style: { 
                      position: 'absolute',
                      top: 6,
                      right: 6,
                      fontSize: 'clamp(14px, 1.2vw, 20px)',
                      fontWeight: 700,
                      padding: 'clamp(4px, 0.4vw, 8px) clamp(10px, 1vw, 16px)',
                      borderRadius: 'clamp(6px, 0.6vw, 10px)',
                      background: isHero ? '#78350f' : '#3b82f6',
                      color: 'white',
                      textTransform: 'uppercase',
                      boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
                    }
                  }, position) : null,
                  React.createElement('div', { key: 'name', style: { 
                    fontSize: 13,
                    fontWeight: 700,
                    color: isFolded ? '#6b7280' : (isHero ? '#78350f' : '#111827'),
                    marginBottom: 4,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    paddingRight: position ? 40 : 0
                  } }, [
                    isHero ? React.createElement('span', { key: 'star' }, '⭐') : null,
                    React.createElement('span', { key: 'text' }, player),
                    isFolded ? React.createElement('span', { 
                      key: 'folded',
                      style: { 
                        fontSize: 9,
                        fontWeight: 800,
                        padding: '2px 6px',
                        borderRadius: 3,
                        background: '#ef4444',
                        color: 'white',
                        marginLeft: 4,
                        textTransform: 'uppercase'
                      }
                    }, '✕ FOLDED') : null
                  ]),
                  holeCards.length > 0 ? React.createElement('div', { key: 'cards', style: { display: 'flex', gap: 'clamp(5px, 0.53vw, 11px)', marginBottom: 4 } },
                    holeCards.map((card, idx) => 
                      React.createElement('div', {
                        key: `${player}-card-${idx}`,
                        style: {
                          opacity: isFolded ? 0.3 : 1,
                          filter: isFolded ? 'grayscale(100%)' : 'none',
                          transform: isFolded ? 'rotate(-5deg) scale(0.9)' : 'none',
                          transition: 'all 0.3s ease-out'
                        }
                      }, renderCard(card, true))
                    )
                  ) : (!isHero && !isFolded ? React.createElement('div', { key: 'hidden-cards', style: { display: 'flex', gap: 'clamp(5px, 0.53vw, 11px)', marginBottom: 4 } }, [
                    React.createElement('div', { key: 'card1', style: { 
                      background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
                      padding: '6px 10px',
                      borderRadius: 4,
                      fontSize: 16,
                      fontWeight: 700,
                      boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                      border: '2px solid #1e3a8a',
                      minWidth: 40,
                      textAlign: 'center',
                      color: 'white'
                    } }, '🂠'),
                    React.createElement('div', { key: 'card2', style: { 
                      background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
                      padding: '6px 10px',
                      borderRadius: 4,
                      fontSize: 16,
                      fontWeight: 700,
                      boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                      border: '2px solid #1e3a8a',
                      minWidth: 40,
                      textAlign: 'center',
                      color: 'white'
                    } }, '🂠')
                  ]) : null),
                  // Hand strength indicator (hero only)
                  (() => {
                    if (!handStrength) return null;
                    
                    // Calculate outs if there's a draw
                    const outsInfo = isHero && holeCards.length === 2 ? calculateOuts(holeCards, currentState.board) : null;
                    
                    return React.createElement('div', {
                      key: 'strength-container',
                      style: { display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 4 }
                    }, [
                      React.createElement('div', {
                        key: 'strength',
                        style: {
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: 4,
                          background: `${handStrength.color}22`,
                          border: `1.5px solid ${handStrength.color}`,
                          color: handStrength.color,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          animation: 'fadeIn 0.4s ease-out'
                        }
                      }, [
                        React.createElement('span', { key: 'emoji' }, handStrength.emoji),
                        React.createElement('span', { key: 'label' }, handStrength.label)
                      ]),
                      // Outs display
                      outsInfo ? React.createElement('div', {
                        key: 'outs',
                        style: {
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '4px 8px',
                          borderRadius: 4,
                          background: '#8b5cf622',
                          border: '1.5px solid #8b5cf6',
                          color: '#6d28d9',
                          display: 'inline-flex',
                          alignItems: 'center',
                          flexDirection: 'column',
                          gap: 2,
                          animation: 'fadeIn 0.4s ease-out'
                        }
                      }, [
                        React.createElement('div', { key: 'outs-line', style: { display: 'flex', gap: 4, alignItems: 'center' } }, [
                          React.createElement('span', { key: 'icon' }, '🎯'),
                          React.createElement('span', { key: 'count', style: { fontWeight: 800, fontSize: 11 } }, `${outsInfo.outs} Outs`),
                          React.createElement('span', { key: 'equity', style: { fontSize: 9, opacity: 0.8 } }, 
                            `(~${Math.round(outsInfo.outs * 2 * outsInfo.cardsToCome)}%)`
                          )
                        ]),
                        React.createElement('div', { key: 'draws', style: { fontSize: 9, opacity: 0.9 } }, 
                          outsInfo.draws.join(' + ')
                        )
                      ]) : null
                    ]);
                  })(),
                  // Pot Odds Calculator (hero only, when active and facing a bet)
                  (() => {
                    if (!isHero || !isActive) return null;
                    
                    // Calculate the amount to call
                    const currentBet = Math.max(...Object.values(currentState.bets));
                    const heroBet = currentState.bets[player] || 0;
                    const callAmount = currentBet - heroBet;
                    
                    // Only show if there's a bet to call
                    if (callAmount <= 0) return null;
                    
                    // Calculate pot odds
                    const potBeforeCall = currentState.pot;
                    const potAfterCall = potBeforeCall + callAmount;
                    const potOdds = callAmount / potAfterCall;
                    const potOddsPercent = (potOdds * 100).toFixed(1);
                    const breakEvenEquity = potOddsPercent;
                    
                    // Calculate estimated equity if we have hero's cards
                    let estimatedEquity = null;
                    if (holeCards.length === 2 && currentState.board) {
                      const numOpponents = Object.keys(currentState.stacks).filter(p => 
                        p !== player && !currentState.folded.has(p)
                      ).length;
                      const equityCalc = estimateEquity(holeCards, currentState.board, numOpponents);
                      if (equityCalc) {
                        estimatedEquity = equityCalc.equity;
                      }
                    }
                    
                    // Determine if call is profitable
                    const isProfitable = estimatedEquity !== null && estimatedEquity >= parseFloat(breakEvenEquity);
                    const decisionColor = estimatedEquity !== null 
                      ? (isProfitable ? '#10b981' : '#ef4444')
                      : '#6b7280';
                    
                    return React.createElement('div', {
                      key: 'pot-odds',
                      style: {
                        fontSize: 10,
                        fontWeight: 600,
                        padding: '6px 8px',
                        borderRadius: 4,
                        background: `${decisionColor}11`,
                        border: `1.5px solid ${decisionColor}`,
                        marginBottom: 4,
                        animation: 'fadeIn 0.4s ease-out, pulse 2s ease-in-out infinite'
                      }
                    }, [
                      React.createElement('div', { key: 'header', style: { 
                        fontSize: 9, 
                        fontWeight: 700, 
                        color: decisionColor,
                        marginBottom: 3,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      } }, '💰 Pot Odds Analysis'),
                      React.createElement('div', { key: 'to-call', style: { 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        marginBottom: 2,
                        color: '#374151'
                      } }, [
                        React.createElement('span', { key: 'label' }, 'To Call:'),
                        React.createElement('span', { key: 'value', style: { fontWeight: 700 } }, formatCurrency(callAmount))
                      ]),
                      React.createElement('div', { key: 'pot-odds', style: { 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        marginBottom: 2,
                        color: '#374151'
                      } }, [
                        React.createElement('span', { key: 'label' }, 'Pot Odds:'),
                        React.createElement('span', { key: 'value', style: { fontWeight: 700 } }, `${potOddsPercent}%`)
                      ]),
                      React.createElement('div', { key: 'break-even', style: { 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        marginBottom: estimatedEquity !== null ? 2 : 0,
                        color: '#374151'
                      } }, [
                        React.createElement('span', { key: 'label' }, 'Need Equity:'),
                        React.createElement('span', { key: 'value', style: { fontWeight: 700 } }, `${breakEvenEquity}%`)
                      ]),
                      estimatedEquity !== null ? React.createElement('div', { key: 'actual-equity', style: { 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        paddingTop: 3,
                        borderTop: '1px solid rgba(0,0,0,0.1)',
                        color: decisionColor,
                        fontWeight: 700
                      } }, [
                        React.createElement('span', { key: 'label' }, 'Your Equity:'),
                        React.createElement('span', { key: 'value' }, `${estimatedEquity.toFixed(1)}% ${isProfitable ? '✓' : '✗'}`)
                      ]) : null,
                      estimatedEquity !== null ? React.createElement('div', { key: 'recommendation', style: { 
                        marginTop: 4,
                        paddingTop: 4,
                        borderTop: '1px solid rgba(0,0,0,0.1)',
                        textAlign: 'center',
                        fontSize: 10,
                        fontWeight: 800,
                        color: decisionColor,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      } }, isProfitable ? '✓ CALL/RAISE' : '✗ CONSIDER FOLDING') : null
                    ]);
                  })(),
                  // Action sequence display
                  (() => {
                    const actions = currentState.playerActions?.[player];
                    if (!actions) return null;
                    
                    // Build action string for current street and earlier (or all streets at showdown)
                    const streets = ['preflop', 'flop', 'turn', 'river'];
                    const currentStreetIdx = streets.indexOf(currentState.street);
                    const isShowdown = currentState.street === 'showdown';
                    const actionParts = [];
                    
                    streets.forEach((street, idx) => {
                      // Show all streets at showdown, otherwise only up to current street
                      if ((isShowdown || idx <= currentStreetIdx) && actions[street] && actions[street].length > 0) {
                        actionParts.push(actions[street].join('-'));
                      }
                    });
                    
                    if (actionParts.length === 0) return null;
                    
                    return React.createElement('div', {
                      key: 'actions',
                      style: {
                        fontSize: 13,
                        fontWeight: 800,
                        padding: '5px 10px',
                        borderRadius: 5,
                        background: 'rgba(59, 130, 246, 0.25)',
                        border: '2px solid rgba(59, 130, 246, 0.6)',
                        color: '#1e40af',
                        marginBottom: 4,
                        fontFamily: 'monospace',
                        letterSpacing: '1px',
                        boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)'
                      }
                    }, actionParts.join(' | '));
                  })(),
                  React.createElement('div', { key: 'stack', style: { fontSize: 12, color: '#059669', fontWeight: 600 } }, `Stack: ${formatCurrency(stack)}`),
                  bet > 0 ? React.createElement('div', { key: 'bet', style: { 
                    marginTop: 6,
                    padding: '4px 8px',
                    background: 'rgba(220, 38, 38, 0.1)',
                    borderRadius: 4,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6
                  } }, [
                    React.createElement('span', { key: 'label', style: { fontSize: 11, color: '#7f1d1d', fontWeight: 600 } }, 'Bet:'),
                    renderChipStack(bet, isActive)
                  ]) : null
                ]);
              })
            )
          ]),
          
          // Right: Visual Timeline + Action log
          React.createElement('div', { key: 'action-log', style: { 
            background: 'white',
            borderRadius: 8,
            border: '1px solid #e5e7eb',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          } }, [
            // Visual Timeline
            React.createElement('div', { key: 'timeline', style: {
              padding: '12px',
              background: '#f9fafb',
              borderBottom: '2px solid #e5e7eb'
            } }, [
              React.createElement('div', { key: 'label', style: {
                fontSize: 11,
                fontWeight: 600,
                color: '#6b7280',
                marginBottom: 8,
                textTransform: 'uppercase'
              } }, 'Hand Timeline'),
              React.createElement('div', { key: 'timeline-bar', style: {
                position: 'relative',
                height: 40,
                background: 'linear-gradient(90deg, #f3f4f6 0%, #e5e7eb 100%)',
                borderRadius: 6,
                overflow: 'hidden',
                border: '1px solid #d1d5db'
              } }, [
                // Progress bar
                React.createElement('div', {
                  key: 'progress',
                  style: {
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    height: '100%',
                    width: `${(currentStep / actualMaxStep) * 100}%`,
                    background: 'linear-gradient(90deg, #3b82f6 0%, #2563eb 100%)',
                    transition: 'width 0.3s ease',
                    opacity: 0.3
                  }
                }),
                // Street markers
                ...streetMarkers.map((marker, idx) => {
                  const position = (marker.step / actualMaxStep) * 100;
                  const streetColors = {
                    'preflop': '#8b5cf6',
                    'flop': '#3b82f6',
                    'turn': '#f59e0b',
                    'river': '#10b981',
                    'showdown': '#ef4444'
                  };
                  const color = streetColors[marker.street] || '#6b7280';
                  const icons = {
                    'preflop': '🃏',
                    'flop': '🎴',
                    'turn': '🎯',
                    'river': '🌊',
                    'showdown': '🏆'
                  };
                  const icon = icons[marker.street] || '•';
                  const isPassed = marker.step <= currentStep;
                  
                  return React.createElement('div', {
                    key: `marker-${idx}`,
                    onClick: () => jumpToStreet(marker.street),
                    style: {
                      position: 'absolute',
                      left: `${position}%`,
                      top: '50%',
                      transform: 'translate(-50%, -50%)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 2,
                      zIndex: 10
                    }
                  }, [
                    React.createElement('div', {
                      key: 'dot',
                      style: {
                        width: isPassed ? 24 : 20,
                        height: isPassed ? 24 : 20,
                        borderRadius: '50%',
                        background: isPassed ? color : 'white',
                        border: `3px solid ${color}`,
                        boxShadow: isPassed ? `0 0 8px ${color}66` : '0 2px 4px rgba(0,0,0,0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 10,
                        transition: 'all 0.2s',
                        fontWeight: 700
                      }
                    }, isPassed ? '✓' : icon),
                    React.createElement('div', {
                      key: 'label',
                      style: {
                        position: 'absolute',
                        top: 32,
                        fontSize: 8,
                        fontWeight: 700,
                        color: isPassed ? color : '#9ca3af',
                        textTransform: 'uppercase',
                        whiteSpace: 'nowrap',
                        textShadow: '0 1px 2px white'
                      }
                    }, marker.street.slice(0, 4))
                  ]);
                }),
                // Current step indicator
                React.createElement('div', {
                  key: 'current-indicator',
                  style: {
                    position: 'absolute',
                    left: `${(currentStep / actualMaxStep) * 100}%`,
                    top: 0,
                    height: '100%',
                    width: 2,
                    background: '#1e40af',
                    boxShadow: '0 0 8px rgba(30, 64, 175, 0.8)',
                    transition: 'left 0.3s ease',
                    zIndex: 20
                  }
                })
              ]),
              // Pot growth mini-chart
              React.createElement('div', {
                key: 'pot-growth',
                style: {
                  marginTop: 12,
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: 2,
                  height: 30,
                  paddingTop: 4
                }
              }, steps.slice(0, currentStep + 1).map((step, idx) => {
                const maxPot = Math.max(...steps.map(s => s.pot));
                const height = maxPot > 0 ? (step.pot / maxPot) * 30 : 2;
                const isLast = idx === currentStep;
                const isBigAction = idx > 0 && (step.pot - steps[idx - 1].pot) > (maxPot * 0.1);
                
                return React.createElement('div', {
                  key: idx,
                  title: `Step ${idx}: ${formatCurrency(step.pot)}`,
                  style: {
                    flex: 1,
                    height: `${height}px`,
                    background: isLast ? '#3b82f6' : isBigAction ? '#f59e0b' : '#94a3af',
                    borderRadius: '2px 2px 0 0',
                    transition: 'all 0.2s',
                    cursor: 'pointer',
                    minWidth: 2,
                    opacity: isLast ? 1 : 0.6
                  },
                  onClick: () => {
                    setCurrentStep(idx);
                    setIsPlaying(false);
                  }
                });
              }))
            ]),
            React.createElement('div', { key: 'header', style: { 
              padding: '10px 12px',
              background: '#f9fafb',
              borderBottom: '1px solid #e5e7eb',
              fontWeight: 600,
              fontSize: 13
            } }, 'Action History'),
            React.createElement('div', { key: 'actions', style: { 
              flex: 1,
              overflowY: 'auto',
              padding: '8px 0'
            } }, 
              (() => {
                const items = [];
                let lastStreet = '';
                let streetStartPot = 0;
                
                steps.slice(0, currentStep + 1).forEach((step, idx) => {
                  // Add street header when street changes
                  if (step.street !== lastStreet) {
                    const streetIcon = {
                      'preflop': '🃏',
                      'flop': '🎴',
                      'turn': '🎯',
                      'river': '🌊',
                      'showdown': '🏆'
                    }[step.street] || '•';
                    
                    const streetColor = {
                      'preflop': '#8b5cf6',
                      'flop': '#3b82f6',
                      'turn': '#f59e0b',
                      'river': '#10b981',
                      'showdown': '#ef4444'
                    }[step.street] || '#6b7280';
                    
                    streetStartPot = step.pot;
                    
                    items.push(React.createElement('div', {
                      key: `street-${idx}`,
                      style: {
                        padding: '8px 12px',
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        background: `linear-gradient(90deg, ${streetColor}15 0%, transparent 100%)`,
                        borderLeft: `4px solid ${streetColor}`,
                        color: streetColor,
                        marginTop: idx === 0 ? 0 : 8,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }
                    }, [
                      React.createElement('span', { key: 'icon' }, streetIcon),
                      React.createElement('span', { key: 'street' }, step.street),
                      React.createElement('span', { key: 'spacer', style: { flex: 1 } }),
                      React.createElement('span', { key: 'pot', style: { fontSize: 10, fontWeight: 600 } }, `Pot: ${formatCurrency(streetStartPot)}`)
                    ]));
                    
                    lastStreet = step.street;
                  }
                  
                  // Add action
                  const isCurrent = idx === currentStep;
                  const isImportant = step.action && (
                    step.action.type === 'raises' || 
                    step.action.type === 'all-in' || 
                    step.action.type === 'wins'
                  );
                  
                  // Calculate pot change for this action
                  const prevPot = idx > 0 ? steps[idx - 1].pot : 0;
                  const potChange = step.pot - prevPot;
                  
                  items.push(React.createElement('div', {
                    key: `action-${idx}`,
                    style: {
                      padding: '6px 12px',
                      fontSize: 12,
                      background: isCurrent ? '#dbeafe' : (isImportant ? '#fef3c7' : 'transparent'),
                      borderLeft: isCurrent ? '3px solid #3b82f6' : (isImportant ? '3px solid #f59e0b' : '3px solid transparent'),
                      fontWeight: isCurrent ? 600 : (isImportant ? 500 : 400),
                      color: isCurrent ? '#1e40af' : (isImportant ? '#92400e' : '#374151'),
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      transition: 'all 0.3s ease',
                      opacity: isCurrent ? 1 : 0.8
                    }
                  }, [
                    React.createElement('span', { key: 'desc', style: { flex: 1 } }, `${idx}. ${step.description}`),
                    potChange > 0 ? React.createElement('span', { 
                      key: 'pot-change',
                      style: { 
                        fontSize: 10,
                        padding: '2px 6px',
                        borderRadius: 3,
                        background: '#dcfce7',
                        color: '#166534',
                        fontWeight: 600
                      }
                    }, `+${formatCurrency(potChange)}`) : null
                  ].filter(Boolean)));
                });
                
                return items;
              })()
            )
          ])
        ]),
        
        // Timeline slider at bottom
        React.createElement('div', { key: 'timeline', style: { display: 'flex', flexDirection: 'column', gap: 4 } }, [
          React.createElement('input', {
            key: 'slider',
            type: 'range',
            min: 0,
            max: actualMaxStep,
            value: currentStep,
            onChange: (e) => {
              setCurrentStep(Number(e.target.value));
              setIsPlaying(false);
            },
            style: { width: '100%', cursor: 'pointer', height: 8 }
          }),
          // Street markers
          React.createElement('div', { key: 'streets', style: { display: 'flex', gap: 4, justifyContent: 'space-between' } },
            streetMarkers.map(marker => 
              React.createElement('button', {
                key: marker.street,
                type: 'button',
                onClick: () => jumpToStreet(marker.street),
                style: {
                  padding: '4px 10px',
                  fontSize: 11,
                  borderRadius: 4,
                  background: currentState.street === marker.street ? '#3b82f6' : '#f3f4f6',
                  color: currentState.street === marker.street ? 'white' : '#374151',
                  border: 'none',
                  textTransform: 'capitalize',
                  fontWeight: currentState.street === marker.street ? 600 : 400
                }
              }, marker.street)
            )
          )
        ]),
        
        // Hand notes section
        React.createElement('div', { key: 'notes', style: { 
          background: 'white',
          borderRadius: 8,
          border: '1px solid #e5e7eb',
          overflow: 'hidden'
        } }, [
          React.createElement('div', { key: 'notes-header', style: { 
            padding: '10px 12px',
            background: '#f9fafb',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          } }, [
            React.createElement('span', { key: 'icon', style: { fontSize: 14 } }, '📝'),
            React.createElement('span', { key: 'title', style: { fontWeight: 600, fontSize: 13, flex: 1 } }, 'Hand Notes'),
            !isEditingNotes ? React.createElement('button', {
              key: 'edit-btn',
              type: 'button',
              onClick: () => setIsEditingNotes(true),
              style: {
                padding: '4px 10px',
                fontSize: 12,
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                fontWeight: 500
              }
            }, notesLoaded && notes ? 'Edit' : 'Add Note') : React.createElement('div', { key: 'edit-actions', style: { display: 'flex', gap: 6 } }, [
              React.createElement('button', {
                key: 'save',
                type: 'button',
                onClick: handleSaveNotes,
                disabled: isSavingNotes,
                style: {
                  padding: '4px 10px',
                  fontSize: 12,
                  background: '#22c55e',
                  color: 'white',
                  border: 'none',
                  borderRadius: 4,
                  cursor: isSavingNotes ? 'not-allowed' : 'pointer',
                  fontWeight: 500,
                  opacity: isSavingNotes ? 0.6 : 1
                }
              }, isSavingNotes ? 'Saving...' : 'Save'),
              React.createElement('button', {
                key: 'cancel',
                type: 'button',
                onClick: () => {
                  setIsEditingNotes(false);
                  // Reload notes to discard changes
                  if (handId) {
                    window.api.invoke('hands:getNotes', handId).then(loadedNotes => {
                      setNotes(loadedNotes || '');
                    });
                  }
                },
                disabled: isSavingNotes,
                style: {
                  padding: '4px 10px',
                  fontSize: 12,
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: 4,
                  cursor: isSavingNotes ? 'not-allowed' : 'pointer',
                  fontWeight: 500,
                  opacity: isSavingNotes ? 0.6 : 1
                }
              }, 'Cancel')
            ])
          ]),
          React.createElement('div', { key: 'notes-body', style: { padding: '12px' } },
            isEditingNotes 
              ? React.createElement('textarea', {
                  key: 'textarea',
                  value: notes,
                  onChange: (e) => setNotes(e.target.value),
                  placeholder: 'Add notes about this hand (strategy, mistakes, key moments, etc.)...',
                  style: {
                    width: '100%',
                    minHeight: '80px',
                    padding: '8px',
                    fontSize: 13,
                    fontFamily: 'inherit',
                    border: '1px solid #d1d5db',
                    borderRadius: 4,
                    resize: 'vertical',
                    boxSizing: 'border-box'
                  }
                })
              : (notesLoaded && notes 
                  ? React.createElement('div', { 
                      key: 'notes-text',
                      style: { 
                        fontSize: 13, 
                        color: '#374151', 
                        lineHeight: 1.5,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word'
                      }
                    }, notes)
                  : React.createElement('div', { 
                      key: 'no-notes',
                      style: { 
                        fontSize: 13, 
                        color: '#9ca3af', 
                        fontStyle: 'italic' 
                      }
                    }, 'No notes for this hand. Click "Add Note" to add one.')
                )
          )
        ]),
        
        // Hand Notes Section
        React.createElement('div', { key: 'notes-section', style: { 
          background: 'white',
          padding: '12px',
          borderRadius: 8,
          border: '1px solid #e5e7eb'
        } }, [
          React.createElement('div', { key: 'notes-header', style: { 
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 8
          } }, [
            React.createElement('span', { key: 'icon', style: { fontSize: 16 } }, '📝'),
            React.createElement('span', { key: 'title', style: { fontWeight: 600, fontSize: 13 } }, 'Hand Notes'),
            React.createElement('div', { key: 'spacer', style: { flex: 1 } }),
            !isEditingNotes && notes && React.createElement('button', {
              key: 'edit-btn',
              type: 'button',
              onClick: () => setIsEditingNotes(true),
              style: {
                padding: '4px 10px',
                fontSize: 11,
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                fontWeight: 600
              }
            }, 'Edit'),
            !isEditingNotes && !notes && React.createElement('button', {
              key: 'add-btn',
              type: 'button',
              onClick: () => setIsEditingNotes(true),
              style: {
                padding: '4px 10px',
                fontSize: 11,
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                fontWeight: 600
              }
            }, '+ Add Note')
          ].filter(Boolean)),
          isEditingNotes ? React.createElement('div', { key: 'notes-edit', style: { display: 'flex', flexDirection: 'column', gap: 8 } }, [
            React.createElement('textarea', {
              key: 'textarea',
              value: notes,
              onChange: (e) => setNotes(e.target.value),
              placeholder: 'Add your observations, mistakes, key decisions, opponent tendencies...',
              style: {
                width: '100%',
                minHeight: 80,
                padding: '8px',
                fontSize: 12,
                borderRadius: 4,
                border: '1px solid #d1d5db',
                resize: 'vertical',
                fontFamily: 'inherit'
              }
            }),
            React.createElement('div', { key: 'buttons', style: { display: 'flex', gap: 6, justifyContent: 'flex-end' } }, [
              React.createElement('button', {
                key: 'cancel',
                type: 'button',
                onClick: () => {
                  setIsEditingNotes(false);
                  // Reload original notes
                  if (window.api?.getNotes && handId) {
                    window.api.getNotes(handId).then(loadedNotes => {
                      setNotes(loadedNotes || '');
                    });
                  }
                },
                disabled: isSavingNotes,
                style: {
                  padding: '6px 12px',
                  fontSize: 12,
                  background: '#f3f4f6',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: 4,
                  cursor: isSavingNotes ? 'not-allowed' : 'pointer',
                  fontWeight: 600
                }
              }, 'Cancel'),
              React.createElement('button', {
                key: 'save',
                type: 'button',
                onClick: handleSaveNotes,
                disabled: isSavingNotes,
                style: {
                  padding: '6px 12px',
                  fontSize: 12,
                  background: isSavingNotes ? '#9ca3af' : '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: 4,
                  cursor: isSavingNotes ? 'not-allowed' : 'pointer',
                  fontWeight: 600
                }
              }, isSavingNotes ? 'Saving...' : 'Save')
            ])
          ]) : (notes ? React.createElement('div', {
            key: 'notes-display',
            style: {
              fontSize: 12,
              color: '#374151',
              lineHeight: 1.5,
              padding: '8px',
              background: '#f9fafb',
              borderRadius: 4,
              whiteSpace: 'pre-wrap'
            }
          }, notes) : React.createElement('div', {
            key: 'notes-empty',
            style: {
              fontSize: 12,
              color: '#9ca3af',
              fontStyle: 'italic',
              padding: '8px',
              textAlign: 'center'
            }
          }, 'No notes for this hand'))
        ]),
        
        // Keyboard shortcuts help
        React.createElement('div', { key: 'help', style: { 
          fontSize: 11,
          color: '#6b7280',
          padding: '6px 12px',
          background: '#f9fafb',
          borderRadius: 6,
          border: '1px solid #e5e7eb'
        } }, '⌨️ Space=Play/Pause • ←→=Step • J/K=Hero Decisions • Home/End=Jump')
      ])
    });
  }

  function HandList({ onSelect, selectedId, globalFilters, setGlobalFilters, onCurrencyChange }) {
    const React = window.React;
    const bump = useDataUpdatedBump();
    const [q, setQ] = React.useState('');
    const [selectedHands, setSelectedHands] = React.useState(new Set());
    const [bulkMode, setBulkMode] = React.useState(false);
    const [filters, setFilters] = React.useState({ 
      result: 'all', 
      minBB: '', 
      maxBB: '', 
      from: '', 
      to: '', 
      stake: 'all', 
      position: 'all', 
      villain: '',
      showdown: 'all',
      session: 'all',
      // Advanced filters
      handRange: 'all',
      stackDepth: 'all',
      actionType: 'all',
      potSize: 'all',
      minBetSize: '',
      maxBetSize: '',
    });
    
    // Saved filter presets
    const [savedFilters, setSavedFilters] = React.useState(() => {
      const saved = localStorage.getItem('poker_saved_filters');
      return saved ? JSON.parse(saved) : [];
    });
    const [showSaveDialog, setShowSaveDialog] = React.useState(false);
    const [filterName, setFilterName] = React.useState('');
    
    // Sessions for dropdown
    const [sessions, setSessions] = React.useState([]);
    
    // Fetch sessions for dropdown
    React.useEffect(() => {
      let alive = true;
      if (!window.api?.sessions?.detect) return;
      window.api.sessions.detect({ sessionGapMinutes: 30 }).then((result) => {
        if (!alive || !result?.success) return;
        setSessions(result.sessions || []);
      }).catch(() => {});
      return () => { alive = false; };
    }, [bump]);
    
    // Sync global filters to local filters
    React.useEffect(() => {
      if (!globalFilters) return;
      setFilters(prev => ({
        ...prev,
        stake: globalFilters.stake || 'all',
        position: globalFilters.position || 'all',
        showdown: globalFilters.showdown || 'all',
        result: globalFilters.result || 'all',
        from: globalFilters.from || '',
        to: globalFilters.to || '',
        session: globalFilters.session || 'all',
        handRange: globalFilters.handRange || 'all',
        stackDepth: globalFilters.stackDepth || 'all',
        actionType: globalFilters.actionType || 'all',
        potSize: globalFilters.potSize || 'all',
        minBetSize: globalFilters.minBetSize || '',
        maxBetSize: globalFilters.maxBetSize || '',
      }));
    }, [globalFilters]);
    
    // Update global filters when local filters change (excluding Hand Browser-specific ones)
    React.useEffect(() => {
      if (!setGlobalFilters) return;
      setGlobalFilters(prev => ({
        ...prev,
        stake: filters.stake,
        position: filters.position,
        showdown: filters.showdown,
        result: filters.result,
        from: filters.from,
        to: filters.to,
        session: filters.session,
        handRange: filters.handRange,
        stackDepth: filters.stackDepth,
        actionType: filters.actionType,
        potSize: filters.potSize,
        minBetSize: filters.minBetSize,
        maxBetSize: filters.maxBetSize,
      }));
    }, [filters.stake, filters.position, filters.showdown, filters.result, filters.from, filters.to, filters.session, filters.handRange, filters.stackDepth, filters.actionType, filters.potSize, filters.minBetSize, filters.maxBetSize, setGlobalFilters]);
    const [sort, setSort] = React.useState({ field: 'date', dir: 'desc' });
    const [stakes, setStakes] = React.useState([{ label: 'All stakes', value: 'all' }]);
    const [currency, setCurrency] = React.useState('usd');
    const [drill, setDrill] = React.useState(null);
    
    // Advanced filter builder state
    const [advancedFilterConditions, setAdvancedFilterConditions] = React.useState(null);

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

    // Debounce the search query to reduce API calls
    const debouncedQ = useDebounce(q, 300);
    const debouncedMinBB = useDebounce(filters.minBB, 300);
    const debouncedMaxBB = useDebounce(filters.maxBB, 300);
    const debouncedVillain = useDebounce(filters.villain, 300);

    const debouncedRequest = React.useMemo(() => ({
      q: debouncedQ,
      result: filters.result,
      limit: 300,
      minBB: debouncedMinBB,
      maxBB: debouncedMaxBB,
      from: filters.from,
      to: filters.to,
      stake: filters.stake,
      position: filters.position,
      villain: debouncedVillain,
      sortField: sort.field,
      sortDir: sort.dir,
      // Include advanced filter conditions if they exist
      advancedFilters: advancedFilterConditions,
    }), [debouncedQ, filters.result, filters.from, filters.to, filters.stake, filters.position, filters.showdown, debouncedMinBB, debouncedMaxBB, debouncedVillain, sort, advancedFilterConditions]);

    const { data, loading, error } = useAsync(() => window.api?.listHands(debouncedRequest) ?? [], [debouncedRequest, bump]);

    const updateFilter = (field) => (value) => setFilters((prev) => ({ ...prev, [field]: value }));
    const resetFilters = () => {
      setFilters({ 
        result: 'all', 
        minBB: '', 
        maxBB: '', 
        from: '', 
        to: '', 
        stake: 'all', 
        position: 'all', 
        villain: '',
        showdown: 'all',
        session: 'all',
        handRange: 'all',
        stackDepth: 'all',
        actionType: 'all',
        potSize: 'all',
        minBetSize: '',
        maxBetSize: '',
      });
      setAdvancedFilterConditions(null);
      setDrill(null);
    };
    
    // Date preset functions
    const applyDatePreset = (preset) => {
      const now = new Date();
      let from = '';
      let to = '';
      
      if (preset === 'today') {
        from = to = now.toISOString().split('T')[0];
      } else if (preset === 'yesterday') {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        from = to = yesterday.toISOString().split('T')[0];
      } else if (preset === 'last7') {
        const start = new Date(now);
        start.setDate(start.getDate() - 7);
        from = start.toISOString().split('T')[0];
        to = now.toISOString().split('T')[0];
      } else if (preset === 'last30') {
        const start = new Date(now);
        start.setDate(start.getDate() - 30);
        from = start.toISOString().split('T')[0];
        to = now.toISOString().split('T')[0];
      } else if (preset === 'last90') {
        const start = new Date(now);
        start.setDate(start.getDate() - 90);
        from = start.toISOString().split('T')[0];
        to = now.toISOString().split('T')[0];
      } else if (preset === 'thisYear') {
        from = `${now.getFullYear()}-01-01`;
        to = now.toISOString().split('T')[0];
      } else if (preset === 'all') {
        from = '';
        to = '';
      }
      
      setFilters(prev => ({ ...prev, from, to }));
    };
    
    // Save current filter configuration
    const saveFilterConfig = () => {
      if (!filterName.trim()) {
        showToast('Please enter a filter name', 'error', 2000);
        return;
      }
      
      const config = {
        name: filterName.trim(),
        timestamp: new Date().toISOString(),
        filters: {
          result: filters.result,
          from: filters.from,
          to: filters.to,
          stake: filters.stake,
          position: filters.position,
          showdown: filters.showdown,
          session: filters.session,
          minBB: filters.minBB,
          maxBB: filters.maxBB,
          villain: filters.villain,
          handRange: filters.handRange,
          stackDepth: filters.stackDepth,
          actionType: filters.actionType,
          potSize: filters.potSize,
          minBetSize: filters.minBetSize,
          maxBetSize: filters.maxBetSize,
        }
      };
      
      const updated = [...savedFilters.filter(f => f.name !== config.name), config];
      setSavedFilters(updated);
      localStorage.setItem('poker_saved_filters', JSON.stringify(updated));
      setShowSaveDialog(false);
      setFilterName('');
      showToast(`✓ Filter saved: ${config.name}`, 'success', 2000);
    };
    
    // Load saved filter configuration
    const loadFilterConfig = (config) => {
      setFilters(prev => ({
        ...prev,
        ...config.filters
      }));
      showToast(`✓ Loaded filter: ${config.name}`, 'success', 2000);
    };
    
    // Delete saved filter configuration
    const deleteFilterConfig = (configName) => {
      if (!confirm(`Delete saved filter "${configName}"?`)) return;
      const updated = savedFilters.filter(f => f.name !== configName);
      setSavedFilters(updated);
      localStorage.setItem('poker_saved_filters', JSON.stringify(updated));
      showToast(`✓ Filter deleted: ${configName}`, 'success', 2000);
    };
    const toggleCurrency = React.useCallback(() => {
      setCurrency((prev) => {
        const next = prev === 'usd' ? 'bb' : 'usd';
        if (onCurrencyChange) onCurrencyChange(next);
        return next;
      }); 
    }, [onCurrencyChange]);
    const toggleSort = (field) => setSort((prev) => {
      if (prev.field === field) {
        return { field, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
      }
      return { field, dir: 'desc' };
    });

    const rows = Array.isArray(data) ? data : [];

    const filteredRows = React.useMemo(() => {
      let result = rows;
      
      // Apply session filter first
      if (filters.session && filters.session !== 'all') {
        const selectedSession = sessions.find(s => s.id === filters.session);
        if (selectedSession && Array.isArray(selectedSession.handIds)) {
          const sessionHandIds = new Set(selectedSession.handIds);
          result = result.filter(hand => sessionHandIds.has(hand.handId));
        }
      }
      
      // Then apply drill filter
      if (!drill) return result;
      const type = drill.type;
      const normalize = (value) => String(value || '').trim().toLowerCase();
      if (type === 'position') {
        const target = normalize(drill.position);
        if (!target) return result;
        return result.filter((hand) => {
          const parsed = parseHandJson(hand);
          const heroName = parsed?.hero || parsed?.players?.find?.((p) => p && p.isHero)?.name || hand.hero;
          const pos = parsed?.positions && heroName ? parsed.positions[heroName] : null;
          return normalize(pos) === target;
        });
      }
      if (type === 'opponent') {
        const target = normalize(drill.player);
        if (!target) return result;
        return result.filter((hand) => {
          const parsed = parseHandJson(hand);
          const players = Array.isArray(parsed?.players) ? parsed.players : [];
          return players.some((p) => normalize(p?.name) === target);
        });
      }
      if (type === 'stake' && drill.stake) {
        const label = formatStakeLabel(drill.stake);
        return result.filter((hand) => formatStakeLabel(`${hand.sb}/${hand.bb}`) === label);
      }
      return result;
    }, [rows, drill, filters.session, sessions]);

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

    // Bulk action handlers
    const toggleBulkMode = () => {
      setBulkMode(!bulkMode);
      setSelectedHands(new Set());
    };

    const toggleHandSelection = (handId) => {
      const newSelection = new Set(selectedHands);
      if (newSelection.has(handId)) {
        newSelection.delete(handId);
      } else {
        newSelection.add(handId);
      }
      setSelectedHands(newSelection);
    };

    const selectAll = () => {
      const allIds = new Set(filteredRows.map(h => h.handId));
      setSelectedHands(allIds);
    };

    const deselectAll = () => {
      setSelectedHands(new Set());
    };

    const deleteSelected = async () => {
      if (selectedHands.size === 0) return;
      const confirmed = confirm(`Delete ${selectedHands.size} selected hands? This cannot be undone.`);
      if (!confirmed) return;
      
      try {
        const handIds = Array.from(selectedHands);
        await window.api?.deleteHands?.(handIds);
        showToast(`✓ Deleted ${handIds.length} hands`, 'success', 3000);
        setSelectedHands(new Set());
        setBulkMode(false);
        window.__pub?.emit('data-updated');
      } catch (error) {
        showToast(`✕ Delete failed: ${error.message || error}`, 'error', 5000);
      }
    };

    const exportSelected = async () => {
      if (selectedHands.size === 0) return;
      
      try {
        const handIds = Array.from(selectedHands);
        const hands = [];
        for (const id of handIds) {
          const hand = await window.api?.getHand?.(id);
          if (hand) hands.push(hand);
        }
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const filename = `hands_export_${timestamp}.json`;
        const content = JSON.stringify(hands, null, 2);
        await window.api?.exportStatsCSV?.(content, filename);
        showToast(`✓ Exported ${hands.length} hands to ${filename}`, 'success', 3000);
      } catch (error) {
        showToast(`✕ Export failed: ${error.message || error}`, 'error', 5000);
      }
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

    // Virtual scrolling configuration
    const ROW_HEIGHT = 40; // pixels per row
    const OVERSCAN = 5; // extra rows to render above/below viewport
    const [scrollTop, setScrollTop] = React.useState(0);
    const [containerHeight, setContainerHeight] = React.useState(600);
    const tableContainerRef = React.useRef(null);

    // Measure container height on mount and resize
    React.useEffect(() => {
      const container = tableContainerRef.current;
      if (!container) return;
      
      const updateHeight = () => {
        const rect = container.getBoundingClientRect();
        setContainerHeight(rect.height || 600);
      };
      
      updateHeight();
      window.addEventListener('resize', updateHeight);
      return () => window.removeEventListener('resize', updateHeight);
    }, []);

    // Calculate visible range for virtual scrolling
    const totalRows = filteredRows.length;
    const visibleRowCount = Math.ceil(containerHeight / ROW_HEIGHT);
    const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
    const endIndex = Math.min(totalRows, startIndex + visibleRowCount + OVERSCAN * 2);
    const visibleRows = filteredRows.slice(startIndex, endIndex);
    const offsetY = startIndex * ROW_HEIGHT;
    const totalHeight = totalRows * ROW_HEIGHT;

    const handleScroll = (e) => {
      setScrollTop(e.target.scrollTop);
    };

    const body = !window.api ? 'Preload not loaded.'
      : loading ? 'Loading...'
      : error ? formatError(error)
      : !filteredRows.length ? 'No hands match the current filters.'
      : React.createElement('div', {
          ref: tableContainerRef,
          style: { 
            height: '600px', 
            overflow: 'auto',
            position: 'relative'
          },
          onScroll: handleScroll
        },
        React.createElement('div', { style: { height: `${totalHeight}px`, position: 'relative' } },
          React.createElement('table', { style: { position: 'absolute', top: `${offsetY}px`, width: '100%' } },
            React.createElement('thead', { style: { position: 'sticky', top: 0, background: 'var(--panel-bg)', zIndex: 1 } }, 
              React.createElement('tr', null,
                bulkMode ? React.createElement('th', { key: 'select', style: { width: '40px' } },
                  React.createElement('input', {
                    type: 'checkbox',
                    checked: selectedHands.size > 0 && selectedHands.size === filteredRows.length,
                    onChange: (e) => e.target.checked ? selectAll() : deselectAll(),
                  })
                ) : null,
                columns.map((col) => {
                  const sortable = Boolean(col.sort);
                  return React.createElement('th', {
                    key: col.key,
                    onClick: sortable ? () => toggleSort(col.sort) : undefined,
                    style: sortable ? { cursor: 'pointer', userSelect: 'none' } : undefined,
                  }, col.label + (sortable ? sortIndicator(col.sort) : ''));
                })
              )
            ),
            React.createElement('tbody', null,
              visibleRows.map((hand) => {
                const isSelected = selectedId && hand.handId === selectedId;
                const isChecked = selectedHands.has(hand.handId);
                const rowStyle = { cursor: 'pointer', height: `${ROW_HEIGHT}px` };
                if (isSelected) {
                  rowStyle.background = '#e0f2fe';
                } else if (bulkMode && isChecked) {
                  rowStyle.background = '#fef3c7';
                }
                return React.createElement('tr', {
                  key: hand.handId,
                  onClick: bulkMode ? () => toggleHandSelection(hand.handId) : () => onSelect?.(hand.handId),
                  style: rowStyle,
                }, [
                  bulkMode ? React.createElement('td', { key: 'select', style: { width: '40px' } },
                    React.createElement('input', {
                      type: 'checkbox',
                      checked: isChecked,
                      onChange: () => toggleHandSelection(hand.handId),
                      onClick: (e) => e.stopPropagation(),
                    })
                  ) : null,
                  ...columns.map((col) => React.createElement('td', { key: col.key }, col.render(hand)))
                ]);
              })
            )
          )
        )
      );

    const clearDrill = () => setDrill(null);

    return Panel({
      title: 'Hands',
      children: React.createElement(React.Fragment, null,
        // Bulk Actions Toolbar
        React.createElement('div', { className: 'body', style: { marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8, background: bulkMode ? '#fef3c7' : 'transparent', padding: '8px', borderRadius: '4px' } }, [
          React.createElement('button', { 
            key: 'toggle-bulk', 
            type: 'button', 
            onClick: toggleBulkMode,
            style: { fontWeight: 'bold' }
          }, bulkMode ? '✓ Exit Bulk Mode' : 'Bulk Edit Mode'),
          bulkMode ? React.createElement('span', { key: 'count', style: { marginLeft: '8px', color: '#666' } }, `${selectedHands.size} selected`) : null,
          bulkMode && selectedHands.size > 0 ? React.createElement('button', { 
            key: 'delete', 
            type: 'button', 
            onClick: deleteSelected,
            style: { background: '#dc2626', color: 'white' }
          }, `Delete ${selectedHands.size}`) : null,
          bulkMode && selectedHands.size > 0 ? React.createElement('button', { 
            key: 'export', 
            type: 'button', 
            onClick: exportSelected
          }, `Export ${selectedHands.size}`) : null,
        ]),
        // Date Shortcuts and Filter Actions
        React.createElement('div', { className: 'body', style: { marginBottom: 8, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' } }, [
          React.createElement('strong', { key: 'label', style: { fontSize: '0.9em', color: '#666' } }, 'Quick dates:'),
          React.createElement('button', { key: 'today', type: 'button', onClick: () => applyDatePreset('today'), style: { padding: '4px 10px', fontSize: '0.85em' } }, 'Today'),
          React.createElement('button', { key: 'yesterday', type: 'button', onClick: () => applyDatePreset('yesterday'), style: { padding: '4px 10px', fontSize: '0.85em' } }, 'Yesterday'),
          React.createElement('button', { key: '7d', type: 'button', onClick: () => applyDatePreset('last7'), style: { padding: '4px 10px', fontSize: '0.85em' } }, '7d'),
          React.createElement('button', { key: '30d', type: 'button', onClick: () => applyDatePreset('last30'), style: { padding: '4px 10px', fontSize: '0.85em' } }, '30d'),
          React.createElement('button', { key: '90d', type: 'button', onClick: () => applyDatePreset('last90'), style: { padding: '4px 10px', fontSize: '0.85em' } }, '90d'),
          React.createElement('button', { key: 'year', type: 'button', onClick: () => applyDatePreset('thisYear'), style: { padding: '4px 10px', fontSize: '0.85em' } }, 'Year'),
          React.createElement('button', { key: 'all', type: 'button', onClick: () => applyDatePreset('all'), style: { padding: '4px 10px', fontSize: '0.85em' } }, 'All'),
          React.createElement('div', { key: 'spacer', style: { flex: '1', minWidth: '20px' } }),
          React.createElement('button', { key: 'export-csv', type: 'button', onClick: async () => {
            try {
              const result = await window.api?.exportHandsCSV?.({
                stakes: filters.stake !== 'all' ? [filters.stake] : null,
                positions: filters.position !== 'all' ? [filters.position] : null,
                showdown: filters.showdown,
                resultFilter: filters.result,
                from: filters.from,
                to: filters.to,
                limit: filters.limit
              });
              if (result?.success) {
                showToast(`✓ Exported ${result.handsExported} hands to ${result.filePath}`, 'success');
              } else {
                showToast(`⚠ Export failed: ${result?.message || 'Unknown error'}`, 'error');
              }
            } catch (err) {
              showToast(`⚠ Export error: ${err.message}`, 'error');
            }
          }, style: { padding: '6px 14px', background: '#10b981', color: 'white', fontWeight: 'bold' } }, '📊 Export CSV'),
          React.createElement('button', { key: 'save', type: 'button', onClick: () => setShowSaveDialog(true), style: { padding: '6px 14px', background: '#3b82f6', color: 'white', fontWeight: 'bold' } }, '💾 Save Filter'),
        ]),
        // Session Filter
        sessions.length > 0 ? React.createElement('div', { className: 'body', style: { marginBottom: 8, display: 'flex', gap: 8, alignItems: 'center' } }, [
          React.createElement('label', { key: 'label', style: { fontWeight: 'bold', fontSize: '0.9em' } }, 'Filter by Session:'),
          React.createElement('select', { 
            key: 'session', 
            value: filters.session, 
            onChange: (ev) => updateFilter('session')(ev.target.value), 
            style: { flex: '1', maxWidth: '400px' } 
          }, [
            React.createElement('option', { value: 'all', key: 'all' }, 'All Sessions'),
            ...sessions.map((s, idx) => {
              const date = s.startTime ? new Date(s.startTime).toLocaleDateString() : 'Unknown';
              const time = s.startTime ? new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
              const hands = s.hands || 0;
              const profit = typeof s.totalWon === 'number' ? (s.totalWon >= 0 ? `+$${s.totalWon.toFixed(2)}` : `-$${Math.abs(s.totalWon).toFixed(2)}`) : '$0.00';
              const label = `${date} ${time} - ${hands} hands - ${profit}`;
              return React.createElement('option', { value: s.id, key: s.id || idx }, label);
            })
          ]),
          filters.session !== 'all' ? React.createElement('button', { 
            key: 'clear', 
            type: 'button', 
            onClick: () => updateFilter('session')('all'),
            style: { padding: '4px 10px', fontSize: '0.85em' }
          }, 'Clear') : null,
        ]) : null,
        // Saved Filters Panel
        savedFilters.length > 0 ? React.createElement(CollapsiblePanel, {
          key: 'saved-filters',
          title: `💾 Saved Filters (${savedFilters.length})`,
          defaultCollapsed: true,
          children: React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
            savedFilters.map((config, idx) => {
              const date = new Date(config.timestamp).toLocaleString();
              const activeFilters = [];
              if (config.filters.from || config.filters.to) activeFilters.push('Date');
              if (config.filters.stake !== 'all') activeFilters.push('Stake');
              if (config.filters.position !== 'all') activeFilters.push('Position');
              if (config.filters.session !== 'all') activeFilters.push('Session');
              if (config.filters.result !== 'all') activeFilters.push('Result');
              const preview = activeFilters.length > 0 ? activeFilters.join(', ') : 'No filters';
              
              return React.createElement('div', { 
                key: config.name + idx,
                style: { 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 8, 
                  padding: '8px', 
                  background: '#f9fafb', 
                  borderRadius: '4px',
                  border: '1px solid #e5e7eb'
                } 
              }, [
                React.createElement('div', { key: 'info', style: { flex: 1 } }, [
                  React.createElement('div', { key: 'name', style: { fontWeight: 'bold', marginBottom: 2 } }, config.name),
                  React.createElement('div', { key: 'meta', style: { fontSize: '0.85em', color: '#6b7280' } }, `${date} • ${preview}`),
                ]),
                React.createElement('button', { 
                  key: 'load', 
                  type: 'button', 
                  onClick: () => loadFilterConfig(config),
                  style: { padding: '4px 10px', fontSize: '0.85em' }
                }, '📂 Load'),
                React.createElement('button', { 
                  key: 'delete', 
                  type: 'button', 
                  onClick: () => deleteFilterConfig(config.name),
                  style: { padding: '4px 10px', fontSize: '0.85em', background: '#ef4444', color: 'white' }
                }, '🗑️'),
              ]);
            })
          )
        }) : null,
        // Save Dialog Modal
        showSaveDialog ? React.createElement('div', {
          style: {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          },
          onClick: () => setShowSaveDialog(false)
        },
          React.createElement('div', {
            style: {
              background: 'white',
              padding: '24px',
              borderRadius: '8px',
              minWidth: '400px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            },
            onClick: (e) => e.stopPropagation()
          }, [
            React.createElement('h3', { key: 'title', style: { marginTop: 0, marginBottom: 16 } }, 'Save Filter Configuration'),
            React.createElement('input', {
              key: 'input',
              type: 'text',
              placeholder: 'Filter name...',
              value: filterName,
              onChange: (e) => setFilterName(e.target.value),
              onKeyDown: (e) => {
                if (e.key === 'Enter') saveFilterConfig();
                if (e.key === 'Escape') setShowSaveDialog(false);
              },
              autoFocus: true,
              style: { width: '100%', padding: '8px', marginBottom: 16, fontSize: '1em' }
            }),
            React.createElement('div', { key: 'buttons', style: { display: 'flex', gap: 8, justifyContent: 'flex-end' } }, [
              React.createElement('button', {
                key: 'cancel',
                type: 'button',
                onClick: () => setShowSaveDialog(false),
                style: { padding: '8px 16px' }
              }, 'Cancel'),
              React.createElement('button', {
                key: 'save',
                type: 'button',
                onClick: saveFilterConfig,
                style: { padding: '8px 16px', background: '#3b82f6', color: 'white', fontWeight: 'bold' }
              }, 'Save'),
            ])
          ])
        ) : null,
        React.createElement('div', { className: 'body', style: { marginBottom: 8, display: 'flex', flexWrap: 'wrap', gap: 8 } }, [
          React.createElement('input', { key: 'search', placeholder: 'Search by table, player, hand ID', value: q, onChange: (ev) => setQ(ev.target.value), style: { flex: '1 1 220px' } }),
          React.createElement('select', { key: 'stake', value: filters.stake, onChange: (ev) => updateFilter('stake')(ev.target.value), style: { flex: '0 0 150px' } },
            stakes.map((opt) => React.createElement('option', { key: opt.value, value: opt.value }, opt.label))
          ),
          React.createElement('select', { key: 'position', value: filters.position, onChange: (ev) => updateFilter('position')(ev.target.value), style: { flex: '0 0 140px' } }, [
            React.createElement('option', { value: 'all', key: 'all' }, 'All positions'),
            React.createElement('option', { value: 'BTN', key: 'BTN' }, 'BTN'),
            React.createElement('option', { value: 'CO', key: 'CO' }, 'CO'),
            React.createElement('option', { value: 'MP', key: 'MP' }, 'MP'),
            React.createElement('option', { value: 'EP', key: 'EP' }, 'EP'),
            React.createElement('option', { value: 'SB', key: 'SB' }, 'SB'),
            React.createElement('option', { value: 'BB', key: 'BB' }, 'BB'),
          ]),
          React.createElement('select', { key: 'showdown', value: filters.showdown || 'all', onChange: (ev) => updateFilter('showdown')(ev.target.value), style: { flex: '0 0 160px' } }, [
            React.createElement('option', { value: 'all', key: 'all' }, 'All hands'),
            React.createElement('option', { value: 'showdown', key: 'showdown' }, 'Showdown only'),
            React.createElement('option', { value: 'nonshowdown', key: 'nonshowdown' }, 'Non-showdown only'),
          ]),
          React.createElement('select', { key: 'result', value: filters.result, onChange: (ev) => updateFilter('result')(ev.target.value), style: { flex: '0 0 140px' } }, [
            React.createElement('option', { value: 'all', key: 'all' }, 'All results'),
            React.createElement('option', { value: 'won', key: 'won' }, 'Hero won'),
            React.createElement('option', { value: 'lost', key: 'lost' }, 'Hero lost'),
            React.createElement('option', { value: 'breakeven', key: 'breakeven' }, 'Break-even'),
          ]),
          React.createElement('input', { key: 'minBb', type: 'number', placeholder: 'Min BB', value: filters.minBB, onChange: (ev) => updateFilter('minBB')(ev.target.value), style: { width: 90 } }),
          React.createElement('input', { key: 'maxBb', type: 'number', placeholder: 'Max BB', value: filters.maxBB, onChange: (ev) => updateFilter('maxBB')(ev.target.value), style: { width: 90 } }),
          React.createElement('input', { key: 'from', type: 'date', value: filters.from, onChange: (ev) => updateFilter('from')(ev.target.value), style: { flex: '0 0 150px' } }),
          React.createElement('input', { key: 'to', type: 'date', value: filters.to, onChange: (ev) => updateFilter('to')(ev.target.value), style: { flex: '0 0 150px' } }),
          React.createElement('button', { key: 'currency', type: 'button', onClick: toggleCurrency, style: { flex: '0 0 140px' } }, currency === 'usd' ? 'Switch to BB' : 'Switch to USD'),
          React.createElement('button', { key: 'reset', type: 'button', onClick: resetFilters, style: { flex: '0 0 auto' } }, 'Reset'),
        ]),
        // Advanced Filter Builder with AND/OR Logic
        React.createElement(AdvancedFilterBuilder, {
          onApply: (filterData) => {
            setAdvancedFilterConditions(filterData);
          },
          initialConditions: advancedFilterConditions?.conditions || [],
          compact: true
        }),
        // Advanced Filters
        React.createElement(AdvancedFilters, {
          filters: filters,
          onChange: setFilters,
          compact: true
        }),
        drill ? React.createElement('div', { className: 'body', style: { marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 } }, [
          React.createElement('strong', { key: 'label' }, 'Quick filter:'),
          React.createElement('span', { key: 'value', className: 'muted' }, drill.type === 'position' ? `Position = ${drill.position}` : drill.type === 'opponent' ? `Opponent = ${drill.player}` : drill.type === 'stake' ? `Stake = ${drill.stake}` : 'Custom'),
          React.createElement('button', { key: 'clear', type: 'button', onClick: clearDrill }, 'Clear'),
        ]) : null,
        React.createElement('div', { className: 'body' }, body)
      ),
    });
  }

  function BrowserView({ selectedHandId, onSelectHand, globalFilters, setGlobalFilters }) {
    const React = window.React;
    const [selectedId, setSelectedId] = React.useState(null);
    const [currency, setCurrency] = React.useState('usd');
    
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
      React.createElement(HandList, { 
        onSelect: handleSelect, 
        selectedId,
        globalFilters,
        setGlobalFilters,
        onCurrencyChange: setCurrency
      }),
      React.createElement(HandReplayer, { hand, currency })
    );
  }

  function SessionsView() {
    const React = window.React;
    const bump = useDataUpdatedBump();
    const [filters, setFilters] = React.useState({
      from: '',
      to: '',
      stake: 'all',
      sessionGapMinutes: 30,
      tag: 'all'
    });
    const [sort, setSort] = React.useState({ field: 'startTime', dir: 'desc' });
    const [stakes, setStakes] = React.useState([{ label: 'All stakes', value: 'all' }]);
    const [selectedSession, setSelectedSession] = React.useState(null);
    const [sessionTags, setSessionTags] = React.useState(() => {
      const saved = localStorage.getItem('poker_session_tags');
      return saved ? JSON.parse(saved) : {};
    });

    // Fetch stakes list
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

    const request = React.useMemo(() => ({
      sessionGapMinutes: filters.sessionGapMinutes
    }), [filters.sessionGapMinutes]);

    const { data: detectResult, loading, error } = useCachedAsync(
      () => window.api?.sessions?.detect?.(request) ?? { success: false, sessions: [] },
      [request, bump],
      getCacheKey('sessions:detect', request)
    );

    const allSessions = detectResult?.success ? (detectResult.sessions || []) : [];
    
    // Auto-tag sessions
    const sessionsWithTags = React.useMemo(() => {
      return allSessions.map(s => {
        const autoTags = [];
        const bb100 = s.bb_per_100 || 0;
        const vpip = s.vpip || 0;
        const pfr = s.pfr || 0;
        const profit = s.totalWon || 0;
        
        // Performance tags
        if (bb100 > 20) autoTags.push('🔥 Hot');
        else if (bb100 < -20) autoTags.push('💀 Rough');
        else if (Math.abs(bb100) < 5) autoTags.push('⚖️ Even');
        
        // Playing style tags
        if (vpip > 35) autoTags.push('🎰 Loose');
        else if (vpip < 18) autoTags.push('🛡️ Tight');
        
        if (pfr > 25) autoTags.push('💪 Aggressive');
        else if (pfr < 12) autoTags.push('😴 Passive');
        
        // Session length tags
        if (s.durationMinutes > 180) autoTags.push('⏰ Marathon');
        else if (s.durationMinutes < 30) autoTags.push('⚡ Quick');
        
        // Volume tags
        if (s.hands > 1000) autoTags.push('📊 High Volume');
        
        // Get user tags
        const userTags = sessionTags[s.id] || [];
        
        return { ...s, autoTags, userTags };
      });
    }, [allSessions, sessionTags]);
    
    // Filter sessions by date, stake, and tag
    const filteredSessions = React.useMemo(() => {
      let result = sessionsWithTags;
      
      // Filter by date
      if (filters.from) {
        const fromDate = new Date(filters.from).getTime();
        result = result.filter(s => s.startTime >= fromDate);
      }
      if (filters.to) {
        const toDate = new Date(filters.to + 'T23:59:59').getTime();
        result = result.filter(s => s.endTime <= toDate);
      }
      
      // Filter by stake
      if (filters.stake && filters.stake !== 'all') {
        result = result.filter(s => {
          // Check if any hand in this session matches the stake
          const [sb, bb] = filters.stake.split('/').map(Number);
          return s.handIds && s.handIds.some(id => {
            // We need to check the actual hands - for now, just show all sessions
            // This could be improved by storing stake info in session summary
            return true;
          });
        });
      }
      
      // Filter by tag
      if (filters.tag && filters.tag !== 'all') {
        result = result.filter(s => {
          const allTags = [...(s.autoTags || []), ...(s.userTags || [])];
          return allTags.some(tag => tag.includes(filters.tag) || filters.tag.includes(tag.replace(/[^a-zA-Z]/g, '')));
        });
      }
      
      return result;
    }, [sessionsWithTags, filters.from, filters.to, filters.stake, filters.tag]);

    const sessions = filteredSessions;

    // Sort sessions
    const sortedSessions = React.useMemo(() => {
      const arr = [...sessions];
      arr.sort((a, b) => {
        let aVal = a[sort.field];
        let bVal = b[sort.field];
        if (sort.field === 'startTime' || sort.field === 'endTime') {
          aVal = aVal || 0;
          bVal = bVal || 0;
        }
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sort.dir === 'asc' ? aVal - bVal : bVal - aVal;
        }
        return 0;
      });
      return arr;
    }, [sessions, sort]);

    const toggleSort = (field) => {
      setSort(prev => prev.field === field 
        ? { field, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { field, dir: 'desc' }
      );
    };

    const updateFilter = (field) => (value) => setFilters(prev => ({ ...prev, [field]: value }));

    const resetFilters = () => {
      setFilters({ from: '', to: '', stake: 'all', sessionGapMinutes: 30, tag: 'all' });
    };

    const sortIndicator = (field) => sort.field === field ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : '';

    const formatDuration = (minutes) => {
      if (minutes < 60) return `${minutes}m`;
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    };

    const formatDate = (ts) => {
      if (!ts) return '';
      const date = new Date(ts);
      return date.toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    };

    const toggleSessionTag = (sessionId, tag) => {
      setSessionTags(prev => {
        const current = prev[sessionId] || [];
        const updated = current.includes(tag) 
          ? current.filter(t => t !== tag)
          : [...current, tag];
        const next = { ...prev, [sessionId]: updated };
        localStorage.setItem('poker_session_tags', JSON.stringify(next));
        
        // Show toast notification
        const action = current.includes(tag) ? 'removed' : 'added';
        window.__toast?.(`Tag ${action}: ${tag}`, action === 'added' ? 'success' : 'info', 2000);
        
        return next;
      });
    };

    const userTagOptions = ['A-Game', 'Tilt', 'Tired', 'Focused', 'Distracted', 'Running Good', 'Running Bad'];

    const columns = [
      { key: 'id', label: '#', render: (s) => s.id },
      { key: 'startTime', label: 'Start Time', sort: true, render: (s) => formatDate(s.startTime) },
      { key: 'durationMinutes', label: 'Duration', sort: true, render: (s) => formatDuration(s.durationMinutes) },
      { key: 'hands', label: 'Hands', sort: true, render: (s) => s.hands },
      { key: 'bb_per_100', label: 'BB/100', sort: true, render: (s) => {
        const bb = s.bb_per_100 || 0;
        const style = { color: bb > 0 ? '#16a34a' : bb < 0 ? '#dc2626' : undefined, fontWeight: 'bold' };
        return React.createElement('span', { style }, bb.toFixed(2));
      }},
      { key: 'totalWon', label: 'Profit (USD)', sort: true, render: (s) => {
        const profit = s.totalWon || 0;
        const style = { color: profit > 0 ? '#16a34a' : profit < 0 ? '#dc2626' : undefined, fontWeight: 'bold' };
        return React.createElement('span', { style }, formatUSD(profit));
      }},
      { key: 'vpip', label: 'VPIP %', sort: true, render: (s) => `${s.vpip}%` },
      { key: 'pfr', label: 'PFR %', sort: true, render: (s) => `${s.pfr}%` },
      { key: 'tags', label: 'Tags', render: (s) => {
        const allTags = [...(s.autoTags || []), ...(s.userTags || [])];
        return React.createElement('div', { 
          style: { display: 'flex', flexWrap: 'wrap', gap: 4 },
          onClick: (e) => e.stopPropagation() // Prevent row click
        }, 
          allTags.slice(0, 3).map((tag, i) => 
            React.createElement('span', { 
              key: i,
              style: { 
                fontSize: 11, 
                background: '#e5e7eb', 
                padding: '2px 6px', 
                borderRadius: 3,
                whiteSpace: 'nowrap'
              } 
            }, tag)
          ),
          allTags.length > 3 ? React.createElement('span', {
            key: 'more',
            style: { fontSize: 11, color: '#666' }
          }, `+${allTags.length - 3}`) : null
        );
      }}
    ];

    const body = !window.api ? 'Preload not loaded.'
      : loading ? React.createElement(LoadingSkeleton, { rows: 10, type: 'table' })
      : error ? formatError(error)
      : !sortedSessions.length ? 'No sessions found. Try adjusting the filters or session gap.'
      : React.createElement('div', { style: { overflowX: 'auto' } },
          React.createElement('table', { style: { width: '100%' } },
            React.createElement('thead', null, React.createElement('tr', null,
              columns.map((col) => {
                const sortable = Boolean(col.sort);
                return React.createElement('th', {
                  key: col.key,
                  onClick: sortable ? () => toggleSort(col.key) : undefined,
                  style: sortable ? { cursor: 'pointer', userSelect: 'none' } : undefined,
                }, col.label + (sortable ? sortIndicator(col.key) : ''));
              })
            )),
            React.createElement('tbody', null,
              sortedSessions.map((session) => {
                const isSelected = selectedSession && selectedSession.id === session.id;
                const rowStyle = { cursor: 'pointer' };
                if (isSelected) rowStyle.background = '#e0f2fe';
                return React.createElement('tr', {
                  key: session.id,
                  onClick: () => setSelectedSession(session),
                  style: rowStyle,
                }, columns.map((col) => React.createElement('td', { key: col.key }, col.render(session))));
              })
            )
          )
        );

    // Summary stats
    const totalHands = sessions.reduce((sum, s) => sum + s.hands, 0);
    const totalProfit = sessions.reduce((sum, s) => sum + s.totalWon, 0);
    const totalBB = sessions.reduce((sum, s) => sum + (s.totalBB || 0), 0);
    const overallBB100 = totalBB > 0 ? (totalProfit / totalBB) * 100 : 0;
    const avgDuration = sessions.length > 0 
      ? Math.round(sessions.reduce((sum, s) => sum + s.durationMinutes, 0) / sessions.length)
      : 0;
    const totalHours = Math.round(sessions.reduce((sum, s) => sum + s.durationMinutes, 0) / 60 * 10) / 10;
    const avgVPIP = sessions.length > 0
      ? Math.round(sessions.reduce((sum, s) => sum + (s.vpip || 0), 0) / sessions.length * 10) / 10
      : 0;
    const avgPFR = sessions.length > 0
      ? Math.round(sessions.reduce((sum, s) => sum + (s.pfr || 0), 0) / sessions.length * 10) / 10
      : 0;
    const winningSessions = sessions.filter(s => s.totalWon > 0).length;
    const winningPct = sessions.length > 0 ? Math.round(winningSessions / sessions.length * 100) : 0;
    const bestSession = sessions.length > 0 
      ? sessions.reduce((best, s) => s.totalWon > best.totalWon ? s : best, sessions[0])
      : null;
    const worstSession = sessions.length > 0
      ? sessions.reduce((worst, s) => s.totalWon < worst.totalWon ? s : worst, sessions[0])
      : null;
    const longestSession = sessions.length > 0
      ? sessions.reduce((longest, s) => s.durationMinutes > longest.durationMinutes ? s : longest, sessions[0])
      : null;

    return React.createElement(React.Fragment, null,
      React.createElement(CollapsiblePanel, {
        title: 'Session Filters',
        storageKey: 'sessions-filters'
      },
        React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 } }, [
          React.createElement('select', { 
            key: 'stake', 
            value: filters.stake, 
            onChange: (ev) => updateFilter('stake')(ev.target.value), 
            style: { flex: '0 0 150px' } 
          }, stakes.map((opt) => React.createElement('option', { key: opt.value, value: opt.value }, opt.label))),
          React.createElement('select', {
            key: 'tag',
            value: filters.tag,
            onChange: (ev) => updateFilter('tag')(ev.target.value),
            style: { flex: '0 0 150px' }
          }, [
            React.createElement('option', { key: 'all', value: 'all' }, 'All Tags'),
            React.createElement('option', { key: 'hot', value: 'Hot' }, '🔥 Hot Sessions'),
            React.createElement('option', { key: 'rough', value: 'Rough' }, '💀 Rough Sessions'),
            React.createElement('option', { key: 'even', value: 'Even' }, '⚖️ Breakeven'),
            React.createElement('option', { key: 'loose', value: 'Loose' }, '🎰 Loose'),
            React.createElement('option', { key: 'tight', value: 'Tight' }, '🛡️ Tight'),
            React.createElement('option', { key: 'aggressive', value: 'Aggressive' }, '💪 Aggressive'),
            React.createElement('option', { key: 'passive', value: 'Passive' }, '😴 Passive'),
            React.createElement('option', { key: 'marathon', value: 'Marathon' }, '⏰ Marathon'),
            React.createElement('option', { key: 'quick', value: 'Quick' }, '⚡ Quick Session'),
          ]),
          React.createElement('input', { 
            key: 'from', 
            type: 'date', 
            value: filters.from, 
            onChange: (ev) => updateFilter('from')(ev.target.value), 
            style: { flex: '0 0 150px' },
            placeholder: 'From date'
          }),
          React.createElement('input', { 
            key: 'to', 
            type: 'date', 
            value: filters.to, 
            onChange: (ev) => updateFilter('to')(ev.target.value), 
            style: { flex: '0 0 150px' },
            placeholder: 'To date'
          }),
          React.createElement('label', {
            key: 'gap-label',
            style: { display: 'flex', alignItems: 'center', gap: 8 }
          }, [
            React.createElement('span', { key: 'text' }, 'Session gap (min):'),
            React.createElement('input', {
              key: 'input',
              type: 'number',
              value: filters.sessionGapMinutes,
              onChange: (ev) => updateFilter('sessionGapMinutes')(Number(ev.target.value) || 30),
              style: { width: 80 },
              min: 1,
              max: 240
            })
          ]),
          React.createElement('button', { key: 'reset', type: 'button', onClick: resetFilters }, 'Reset'),
        ])
      ),
      React.createElement(CollapsiblePanel, {
        title: `Sessions (${sessions.length})`,
        storageKey: 'sessions-list'
      },
        sessions.length > 0 ? React.createElement('div', { style: { marginBottom: 16, padding: 12, background: '#f9fafb', borderRadius: 4 } }, [
          React.createElement('div', { key: 'row1', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 12 } }, [
            React.createElement('div', { key: 'total-hands' }, [
              React.createElement('div', { key: 'label', style: { fontSize: 12, color: '#666' } }, 'Total Hands'),
              React.createElement('div', { key: 'value', style: { fontSize: 20, fontWeight: 'bold' } }, totalHands.toLocaleString())
            ]),
            React.createElement('div', { key: 'total-profit' }, [
              React.createElement('div', { key: 'label', style: { fontSize: 12, color: '#666' } }, 'Total Profit'),
              React.createElement('div', { 
                key: 'value', 
                style: { 
                  fontSize: 20, 
                  fontWeight: 'bold',
                  color: totalProfit > 0 ? '#16a34a' : totalProfit < 0 ? '#dc2626' : undefined
                } 
              }, formatUSD(totalProfit))
            ]),
            React.createElement('div', { key: 'bb100' }, [
              React.createElement('div', { key: 'label', style: { fontSize: 12, color: '#666' } }, 'BB/100'),
              React.createElement('div', { 
                key: 'value', 
                style: { 
                  fontSize: 20, 
                  fontWeight: 'bold',
                  color: overallBB100 > 0 ? '#16a34a' : overallBB100 < 0 ? '#dc2626' : undefined
                } 
              }, overallBB100.toFixed(2))
            ]),
            React.createElement('div', { key: 'session-count' }, [
              React.createElement('div', { key: 'label', style: { fontSize: 12, color: '#666' } }, 'Sessions'),
              React.createElement('div', { key: 'value', style: { fontSize: 20, fontWeight: 'bold' } }, sessions.length)
            ]),
            React.createElement('div', { key: 'win-rate' }, [
              React.createElement('div', { key: 'label', style: { fontSize: 12, color: '#666' } }, 'Winning %'),
              React.createElement('div', { 
                key: 'value', 
                style: { 
                  fontSize: 20, 
                  fontWeight: 'bold',
                  color: winningPct >= 50 ? '#16a34a' : '#dc2626'
                } 
              }, `${winningPct}%`)
            ]),
            React.createElement('div', { key: 'total-hours' }, [
              React.createElement('div', { key: 'label', style: { fontSize: 12, color: '#666' } }, 'Total Hours'),
              React.createElement('div', { key: 'value', style: { fontSize: 20, fontWeight: 'bold' } }, `${totalHours}h`)
            ]),
          ]),
          React.createElement('div', { key: 'row2', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, paddingTop: 12, borderTop: '1px solid #e5e7eb' } }, [
            React.createElement('div', { key: 'avg-duration' }, [
              React.createElement('div', { key: 'label', style: { fontSize: 12, color: '#666' } }, 'Avg Duration'),
              React.createElement('div', { key: 'value', style: { fontSize: 16, fontWeight: 'bold' } }, formatDuration(avgDuration))
            ]),
            React.createElement('div', { key: 'avg-vpip' }, [
              React.createElement('div', { key: 'label', style: { fontSize: 12, color: '#666' } }, 'Avg VPIP'),
              React.createElement('div', { key: 'value', style: { fontSize: 16, fontWeight: 'bold' } }, `${avgVPIP}%`)
            ]),
            React.createElement('div', { key: 'avg-pfr' }, [
              React.createElement('div', { key: 'label', style: { fontSize: 12, color: '#666' } }, 'Avg PFR'),
              React.createElement('div', { key: 'value', style: { fontSize: 16, fontWeight: 'bold' } }, `${avgPFR}%`)
            ]),
            longestSession ? React.createElement('div', { key: 'longest' }, [
              React.createElement('div', { key: 'label', style: { fontSize: 12, color: '#666' } }, 'Longest Session'),
              React.createElement('div', { key: 'value', style: { fontSize: 16, fontWeight: 'bold' } }, formatDuration(longestSession.durationMinutes))
            ]) : null,
          ]),
          bestSession ? React.createElement('div', { key: 'row3', style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12, paddingTop: 12, borderTop: '1px solid #e5e7eb' } }, [
            React.createElement('div', { key: 'best' }, [
              React.createElement('div', { key: 'label', style: { fontSize: 12, color: '#666' } }, 'Best Session'),
              React.createElement('div', { key: 'value', style: { fontSize: 16, color: '#16a34a', fontWeight: 'bold' } }, `${formatUSD(bestSession.totalWon)} (${bestSession.hands} hands)`)
            ]),
            React.createElement('div', { key: 'worst' }, [
              React.createElement('div', { key: 'label', style: { fontSize: 12, color: '#666' } }, 'Worst Session'),
              React.createElement('div', { key: 'value', style: { fontSize: 16, color: '#dc2626', fontWeight: 'bold' } }, `${formatUSD(worstSession.totalWon)} (${worstSession.hands} hands)`)
            ])
          ]) : null
        ]) : null,
        body
      ),
      // Session Details Panel
      selectedSession ? React.createElement(SessionDetailPanel, { 
        session: selectedSession, 
        onClose: () => setSelectedSession(null),
        sessionTags: sessionTags,
        onToggleTag: toggleSessionTag
      }) : null
    );
  }

  // Session Detail Panel Component
  function SessionDetailPanel({ session, onClose, sessionTags, onToggleTag }) {
    const React = window.React;
    const [details, setDetails] = React.useState(null);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
      if (!session || !session.handIds) return;
      setLoading(true);
      window.api.sessions.getDetails(session.id, session.handIds)
        .then(result => {
          if (result.success) {
            setDetails(result);
          }
          setLoading(false);
        })
        .catch(err => {
          console.error('Failed to load session details:', err);
          setLoading(false);
        });
    }, [session]);

    const formatDate = (ts) => {
      if (!ts) return '';
      const date = new Date(ts);
      return date.toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    const formatDuration = (minutes) => {
      if (minutes < 60) return `${minutes}m`;
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    };

    const userTagOptions = ['A-Game', 'Tilt', 'Tired', 'Focused', 'Distracted', 'Running Good', 'Running Bad', 'Deep Run'];
    const currentUserTags = sessionTags?.[session.id] || [];

    return React.createElement(CollapsiblePanel, {
      title: `Session #${session.id} Details`,
      storageKey: 'session-details',
      defaultExpanded: true
    },
      React.createElement('div', { style: { marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' } }, [
        React.createElement('div', { key: 'info' }, [
          React.createElement('div', { key: 'date', style: { fontSize: 14, fontWeight: 600 } }, formatDate(session.startTime)),
          React.createElement('div', { key: 'duration', style: { fontSize: 12, color: '#666' } }, 
            `${formatDuration(session.durationMinutes)} • ${session.hands} hands`
          )
        ]),
        React.createElement('button', {
          key: 'close',
          onClick: onClose,
          style: { 
            padding: '4px 12px', 
            fontSize: 12,
            background: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer'
          }
        }, 'Close Details')
      ]),
      // Tag Management
      React.createElement('div', { key: 'tags-section', style: { marginBottom: 12 } }, [
        React.createElement('div', { key: 'auto-tags', style: { marginBottom: 8 } }, [
          React.createElement('div', { key: 'label', style: { fontSize: 12, color: '#666', marginBottom: 4 } }, 'Auto Tags:'),
          React.createElement('div', { key: 'tags', style: { display: 'flex', flexWrap: 'wrap', gap: 4 } },
            (session.autoTags || []).map((tag, i) =>
              React.createElement('span', {
                key: i,
                style: {
                  fontSize: 12,
                  background: '#dbeafe',
                  color: '#1e40af',
                  padding: '4px 8px',
                  borderRadius: 4,
                  fontWeight: 500
                }
              }, tag)
            )
          )
        ]),
        React.createElement('div', { key: 'user-tags' }, [
          React.createElement('div', { key: 'label', style: { fontSize: 12, color: '#666', marginBottom: 4 } }, 'Your Tags:'),
          React.createElement('div', { key: 'tag-buttons', style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
            userTagOptions.map(tag => {
              const isActive = currentUserTags.includes(tag);
              return React.createElement('button', {
                key: tag,
                onClick: () => onToggleTag(session.id, tag),
                style: {
                  fontSize: 12,
                  padding: '4px 10px',
                  border: isActive ? 'none' : '1px solid #d1d5db',
                  background: isActive ? '#10b981' : '#fff',
                  color: isActive ? '#fff' : '#374151',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontWeight: isActive ? 600 : 400,
                  transition: 'all 0.2s'
                }
              }, tag);
            })
          )
        ])
      ]),
      loading ? React.createElement(LoadingSkeleton, { rows: 5 }) :
      !details ? React.createElement('div', null, 'Failed to load session details') :
      React.createElement('div', { style: { display: 'grid', gap: 16 } }, [
        // Overview Stats
        React.createElement('div', { key: 'overview', style: { padding: 12, background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' } }, [
          React.createElement('h4', { key: 'title', style: { margin: '0 0 12px 0', fontSize: 14, fontWeight: 600 } }, '📊 Overall Statistics'),
          React.createElement('div', { key: 'stats', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12 } }, [
            React.createElement('div', { key: 'hands' }, [
              React.createElement('div', { key: 'label', style: { fontSize: 11, color: '#666', marginBottom: 4 } }, 'Hands'),
              React.createElement('div', { key: 'value', style: { fontSize: 18, fontWeight: 'bold' } }, details.overview.hands)
            ]),
            React.createElement('div', { key: 'profit' }, [
              React.createElement('div', { key: 'label', style: { fontSize: 11, color: '#666', marginBottom: 4 } }, 'Profit'),
              React.createElement('div', { 
                key: 'value', 
                style: { 
                  fontSize: 18, 
                  fontWeight: 'bold',
                  color: details.overview.totalWon > 0 ? '#16a34a' : details.overview.totalWon < 0 ? '#dc2626' : undefined
                } 
              }, formatUSD(details.overview.totalWon))
            ]),
            React.createElement('div', { key: 'bb100' }, [
              React.createElement('div', { key: 'label', style: { fontSize: 11, color: '#666', marginBottom: 4 } }, 'BB/100'),
              React.createElement('div', { 
                key: 'value', 
                style: { 
                  fontSize: 18, 
                  fontWeight: 'bold',
                  color: details.overview.bb_per_100 > 0 ? '#16a34a' : details.overview.bb_per_100 < 0 ? '#dc2626' : undefined
                } 
              }, details.overview.bb_per_100.toFixed(2))
            ]),
            React.createElement('div', { key: 'vpip' }, [
              React.createElement('div', { key: 'label', style: { fontSize: 11, color: '#666', marginBottom: 4 } }, 'VPIP'),
              React.createElement('div', { key: 'value', style: { fontSize: 18, fontWeight: 'bold' } }, `${details.overview.vpip}%`)
            ]),
            React.createElement('div', { key: 'pfr' }, [
              React.createElement('div', { key: 'label', style: { fontSize: 11, color: '#666', marginBottom: 4 } }, 'PFR'),
              React.createElement('div', { key: 'value', style: { fontSize: 18, fontWeight: 'bold' } }, `${details.overview.pfr}%`)
            ]),
            React.createElement('div', { key: '3b' }, [
              React.createElement('div', { key: 'label', style: { fontSize: 11, color: '#666', marginBottom: 4 } }, '3-Bet'),
              React.createElement('div', { key: 'value', style: { fontSize: 18, fontWeight: 'bold' } }, `${details.overview.threeBet}%`)
            ]),
            React.createElement('div', { key: 'cbet' }, [
              React.createElement('div', { key: 'label', style: { fontSize: 11, color: '#666', marginBottom: 4 } }, 'C-Bet'),
              React.createElement('div', { key: 'value', style: { fontSize: 18, fontWeight: 'bold' } }, `${details.overview.cbet}%`)
            ]),
            React.createElement('div', { key: 'wtsd' }, [
              React.createElement('div', { key: 'label', style: { fontSize: 11, color: '#666', marginBottom: 4 } }, 'WTSD'),
              React.createElement('div', { key: 'value', style: { fontSize: 18, fontWeight: 'bold' } }, `${details.overview.wtsd}%`)
            ])
          ])
        ]),
        // Position Breakdown
        Object.keys(details.positionStats).length > 0 ? React.createElement('div', { key: 'positions', style: { padding: 12, background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' } }, [
          React.createElement('h4', { key: 'title', style: { margin: '0 0 12px 0', fontSize: 14, fontWeight: 600 } }, '🎯 Performance by Position'),
          React.createElement('div', { key: 'table', style: { overflowX: 'auto' } },
            React.createElement('table', { style: { width: '100%', fontSize: 13 } }, [
              React.createElement('thead', { key: 'head' }, React.createElement('tr', null, [
                React.createElement('th', { key: 'pos', style: { textAlign: 'left', padding: '4px 8px' } }, 'Position'),
                React.createElement('th', { key: 'hands', style: { textAlign: 'right', padding: '4px 8px' } }, 'Hands'),
                React.createElement('th', { key: 'bb100', style: { textAlign: 'right', padding: '4px 8px' } }, 'BB/100'),
                React.createElement('th', { key: 'won', style: { textAlign: 'right', padding: '4px 8px' } }, 'Won'),
                React.createElement('th', { key: 'vpip', style: { textAlign: 'right', padding: '4px 8px' } }, 'VPIP'),
                React.createElement('th', { key: 'pfr', style: { textAlign: 'right', padding: '4px 8px' } }, 'PFR')
              ])),
              React.createElement('tbody', { key: 'body' },
                Object.entries(details.positionStats).map(([pos, stats]) =>
                  React.createElement('tr', { key: pos }, [
                    React.createElement('td', { key: 'pos', style: { padding: '4px 8px', fontWeight: 600 } }, pos),
                    React.createElement('td', { key: 'hands', style: { textAlign: 'right', padding: '4px 8px' } }, stats.hands),
                    React.createElement('td', { 
                      key: 'bb100', 
                      style: { 
                        textAlign: 'right', 
                        padding: '4px 8px',
                        color: stats.bb_per_100 > 0 ? '#16a34a' : stats.bb_per_100 < 0 ? '#dc2626' : undefined,
                        fontWeight: 'bold'
                      } 
                    }, stats.bb_per_100.toFixed(2)),
                    React.createElement('td', { 
                      key: 'won', 
                      style: { 
                        textAlign: 'right', 
                        padding: '4px 8px',
                        color: stats.totalWon > 0 ? '#16a34a' : stats.totalWon < 0 ? '#dc2626' : undefined
                      } 
                    }, formatUSD(stats.totalWon)),
                    React.createElement('td', { key: 'vpip', style: { textAlign: 'right', padding: '4px 8px' } }, `${stats.vpip}%`),
                    React.createElement('td', { key: 'pfr', style: { textAlign: 'right', padding: '4px 8px' } }, `${stats.pfr}%`)
                  ])
                )
              )
            ])
          )
        ]) : null,
        // Stake Breakdown
        details.stakeBreakdown && details.stakeBreakdown.length > 0 ? React.createElement('div', { key: 'stakes', style: { padding: 12, background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' } }, [
          React.createElement('h4', { key: 'title', style: { margin: '0 0 12px 0', fontSize: 14, fontWeight: 600 } }, '💰 Stakes Played'),
          React.createElement('div', { key: 'table', style: { overflowX: 'auto' } },
            React.createElement('table', { style: { width: '100%', fontSize: 13 } }, [
              React.createElement('thead', { key: 'head' }, React.createElement('tr', null, [
                React.createElement('th', { key: 'stake', style: { textAlign: 'left', padding: '4px 8px' } }, 'Stake'),
                React.createElement('th', { key: 'hands', style: { textAlign: 'right', padding: '4px 8px' } }, 'Hands'),
                React.createElement('th', { key: 'bb100', style: { textAlign: 'right', padding: '4px 8px' } }, 'BB/100'),
                React.createElement('th', { key: 'won', style: { textAlign: 'right', padding: '4px 8px' } }, 'Won')
              ])),
              React.createElement('tbody', { key: 'body' },
                details.stakeBreakdown.map((stake, idx) =>
                  React.createElement('tr', { key: idx }, [
                    React.createElement('td', { key: 'stake', style: { padding: '4px 8px', fontWeight: 600 } }, stake.stake),
                    React.createElement('td', { key: 'hands', style: { textAlign: 'right', padding: '4px 8px' } }, stake.hands),
                    React.createElement('td', { 
                      key: 'bb100', 
                      style: { 
                        textAlign: 'right', 
                        padding: '4px 8px',
                        color: stake.bb_per_100 > 0 ? '#16a34a' : stake.bb_per_100 < 0 ? '#dc2626' : undefined,
                        fontWeight: 'bold'
                      } 
                    }, stake.bb_per_100.toFixed(2)),
                    React.createElement('td', { 
                      key: 'won', 
                      style: { 
                        textAlign: 'right', 
                        padding: '4px 8px',
                        color: stake.totalWon > 0 ? '#16a34a' : stake.totalWon < 0 ? '#dc2626' : undefined
                      } 
                    }, formatUSD(stake.totalWon))
                  ])
                )
              )
            ])
          )
        ]) : null
      ])
    );
  }

  // ========== Reports View ==========
  function ReportsView() {
    const React = window.React;
    const ReactEl = React.createElement;
    const [reportType, setReportType] = React.useState('custom'); // 'custom', 'leaks', 'trends', 'heatmap'
    const [loading, setLoading] = React.useState(false);
    const [reportData, setReportData] = React.useState(null);

    // Custom Report Builder state
    const [dateFrom, setDateFrom] = React.useState('');
    const [dateTo, setDateTo] = React.useState('');
    const [selectedStakes, setSelectedStakes] = React.useState([]);
    const [selectedPositions, setSelectedPositions] = React.useState([]);
    const [selectedMetrics, setSelectedMetrics] = React.useState(['winrate', 'vpip', 'pfr']);
    const [groupBy, setGroupBy] = React.useState('overall');
    
    // Saved reports management
    const [savedReports, setSavedReports] = React.useState(() => {
      try {
        const saved = localStorage.getItem('poker_saved_reports');
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    });
    const [showSaveDialog, setShowSaveDialog] = React.useState(false);
    const [reportName, setReportName] = React.useState('');

    // Available stakes
    const stakesRequest = useAsync(window.api.listHandStakes, []);
    const availableStakes = stakesRequest.data || [];

    const allPositions = ['BTN', 'CO', 'MP', 'UTG', 'SB', 'BB'];
    const allMetrics = [
      { id: 'winrate', label: 'Win Rate (BB/100)' },
      { id: 'vpip', label: 'VPIP %' },
      { id: 'pfr', label: 'PFR %' },
      { id: 'threeBet', label: '3B %' },
      { id: 'cbet', label: 'C-Bet %' },
      { id: 'wtsd', label: 'WTSD %' }
    ];

    const toggleStake = (value) => {
      setSelectedStakes(prev =>
        prev.includes(value) ? prev.filter(s => s !== value) : [...prev, value]
      );
    };

    const togglePosition = (pos) => {
      setSelectedPositions(prev =>
        prev.includes(pos) ? prev.filter(p => p !== pos) : [...prev, pos]
      );
    };

    const toggleMetric = (metricId) => {
      setSelectedMetrics(prev =>
        prev.includes(metricId) ? prev.filter(m => m !== metricId) : [...prev, metricId]
      );
    };
    
    // Date range presets
    const applyDatePreset = (preset) => {
      const today = new Date();
      const formatDate = (date) => date.toISOString().split('T')[0];
      
      switch(preset) {
        case 'last7':
          const last7 = new Date(today);
          last7.setDate(today.getDate() - 7);
          setDateFrom(formatDate(last7));
          setDateTo(formatDate(today));
          break;
        case 'last30':
          const last30 = new Date(today);
          last30.setDate(today.getDate() - 30);
          setDateFrom(formatDate(last30));
          setDateTo(formatDate(today));
          break;
        case 'last90':
          const last90 = new Date(today);
          last90.setDate(today.getDate() - 90);
          setDateFrom(formatDate(last90));
          setDateTo(formatDate(today));
          break;
        case 'thisYear':
          setDateFrom(`${today.getFullYear()}-01-01`);
          setDateTo(formatDate(today));
          break;
        case 'all':
          setDateFrom('');
          setDateTo('');
          break;
      }
    };
    
    // Save current report configuration
    const saveReportConfig = () => {
      if (!reportName.trim()) {
        window.__toast?.('Please enter a report name', 'warning', 3000);
        return;
      }
      
      const config = {
        id: Date.now(),
        name: reportName,
        dateFrom,
        dateTo,
        selectedStakes,
        selectedPositions,
        selectedMetrics,
        groupBy,
        savedAt: new Date().toISOString()
      };
      
      const updated = [...savedReports, config];
      setSavedReports(updated);
      localStorage.setItem('poker_saved_reports', JSON.stringify(updated));
      setShowSaveDialog(false);
      setReportName('');
      window.__toast?.(`Report "${config.name}" saved!`, 'success', 3000);
    };
    
    // Load saved report configuration
    const loadReportConfig = (config) => {
      setDateFrom(config.dateFrom || '');
      setDateTo(config.dateTo || '');
      setSelectedStakes(config.selectedStakes || []);
      setSelectedPositions(config.selectedPositions || []);
      setSelectedMetrics(config.selectedMetrics || ['winrate', 'vpip', 'pfr']);
      setGroupBy(config.groupBy || 'overall');
      window.__toast?.(`Loaded "${config.name}"`, 'success', 2000);
    };
    
    // Delete saved report
    const deleteReportConfig = (id) => {
      const updated = savedReports.filter(r => r.id !== id);
      setSavedReports(updated);
      localStorage.setItem('poker_saved_reports', JSON.stringify(updated));
      window.__toast?.('Report deleted', 'success', 2000);
    };

    const generateReport = async () => {
      setLoading(true);
      try {
        const result = await window.api.reports.generate({
          dateFrom,
          dateTo,
          stakes: selectedStakes,
          positions: selectedPositions,
          metrics: selectedMetrics,
          groupBy
        });
        if (result.success) {
          setReportData(result.data);
          window.__toast('Report generated successfully', 'success');
        } else {
          window.__toast(`Report error: ${result.error}`, 'error');
        }
      } catch (err) {
        window.__toast(`Failed to generate report: ${err.message}`, 'error');
      } finally {
        setLoading(false);
      }
    };

    const exportReport = () => {
      if (!reportData || reportData.length === 0) return;
      const headers = Object.keys(reportData[0]);
      const csv = [
        headers.join(','),
        ...reportData.map(row => headers.map(h => row[h] ?? '').join(','))
      ].join('\n');
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      window.__toast('Report exported', 'success');
    };

    return ReactEl('div', { className: 'reports-container', style: { padding: '20px' } },
      // Header
      ReactEl('div', { style: { marginBottom: '20px' } },
        ReactEl('h2', { style: { margin: '0 0 10px 0' } }, 'Custom Reports'),
        ReactEl('div', { style: { display: 'flex', gap: '10px', marginBottom: '20px' } },
          ['custom', 'leaks', 'trends', 'heatmap', 'search', 'equity'].map(type =>
            ReactEl('button', {
              key: type,
              className: reportType === type ? 'btn-primary' : 'btn-secondary',
              onClick: () => setReportType(type),
              style: { textTransform: 'capitalize' }
            }, type === 'custom' ? 'Report Builder' : 
               type === 'leaks' ? 'Leak Detection' : 
               type === 'trends' ? 'Trend Analysis' : 
               type === 'heatmap' ? 'Heat Maps' :
               type === 'search' ? 'Full-Text Search' :
               type === 'equity' ? 'Equity Calc' : type)
          )
        )
      ),

      // Report Builder (Custom)
      reportType === 'custom' ? ReactEl('div', { className: 'report-builder' },
        // Filters Section
        ReactEl('div', { className: 'panel', style: { marginBottom: '20px' } },
          ReactEl('div', { className: 'panel-header' }, 'Report Filters'),
          ReactEl('div', { className: 'panel-body', style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' } },
            // Date Range
            ReactEl('div', null,
              ReactEl('label', { style: { display: 'block', marginBottom: '5px', fontWeight: 'bold' } }, 'Date Range'),
              ReactEl('div', { style: { display: 'flex', gap: '10px', marginBottom: '8px' } },
                ReactEl('input', {
                  type: 'date',
                  value: dateFrom,
                  onChange: (e) => setDateFrom(e.target.value),
                  style: { flex: 1 }
                }),
                ReactEl('span', { style: { alignSelf: 'center' } }, 'to'),
                ReactEl('input', {
                  type: 'date',
                  value: dateTo,
                  onChange: (e) => setDateTo(e.target.value),
                  style: { flex: 1 }
                })
              ),
              ReactEl('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '4px' } },
                [
                  { label: '7d', value: 'last7' },
                  { label: '30d', value: 'last30' },
                  { label: '90d', value: 'last90' },
                  { label: 'Year', value: 'thisYear' },
                  { label: 'All', value: 'all' }
                ].map(preset =>
                  ReactEl('button', {
                    key: preset.value,
                    onClick: () => applyDatePreset(preset.value),
                    style: {
                      padding: '3px 8px',
                      fontSize: '11px',
                      background: '#374151',
                      color: '#e5e7eb',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }
                  }, preset.label)
                )
              )
            ),

            // Group By
            ReactEl('div', null,
              ReactEl('label', { style: { display: 'block', marginBottom: '5px', fontWeight: 'bold' } }, 'Group Results By'),
              ReactEl('select', {
                value: groupBy,
                onChange: (e) => setGroupBy(e.target.value),
                style: { width: '100%', padding: '5px' }
              },
                ['overall', 'stake', 'position', 'date'].map(opt =>
                  ReactEl('option', { key: opt, value: opt }, opt.charAt(0).toUpperCase() + opt.slice(1))
                )
              )
            ),

            // Stakes
            ReactEl('div', null,
              ReactEl('label', { style: { display: 'block', marginBottom: '5px', fontWeight: 'bold' } }, 
                `Stakes (${selectedStakes.length} selected)`
              ),
              ReactEl('div', { style: { maxHeight: '150px', overflowY: 'auto', border: '1px solid #444', padding: '5px', borderRadius: '3px' } },
                availableStakes.map(stake =>
                  ReactEl('label', {
                    key: stake.value,
                    style: { display: 'block', cursor: 'pointer', padding: '2px' }
                  },
                    ReactEl('input', {
                      type: 'checkbox',
                      checked: selectedStakes.includes(stake.value),
                      onChange: () => toggleStake(stake.value)
                    }),
                    ` ${stake.label}`
                  )
                )
              )
            ),

            // Positions
            ReactEl('div', null,
              ReactEl('label', { style: { display: 'block', marginBottom: '5px', fontWeight: 'bold' } }, 
                `Positions (${selectedPositions.length} selected)`
              ),
              ReactEl('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '10px' } },
                allPositions.map(pos =>
                  ReactEl('label', {
                    key: pos,
                    style: { cursor: 'pointer' }
                  },
                    ReactEl('input', {
                      type: 'checkbox',
                      checked: selectedPositions.includes(pos),
                      onChange: () => togglePosition(pos)
                    }),
                    ` ${pos}`
                  )
                )
              )
            )
          )
        ),

        // Metrics Section
        ReactEl('div', { className: 'panel', style: { marginBottom: '20px' } },
          ReactEl('div', { className: 'panel-header' }, 
            `Select Metrics (${selectedMetrics.length} selected)`
          ),
          ReactEl('div', { className: 'panel-body', style: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' } },
            allMetrics.map(metric =>
              ReactEl('label', {
                key: metric.id,
                style: { cursor: 'pointer', padding: '5px', border: '1px solid #444', borderRadius: '3px', textAlign: 'center' }
              },
                ReactEl('input', {
                  type: 'checkbox',
                  checked: selectedMetrics.includes(metric.id),
                  onChange: () => toggleMetric(metric.id)
                }),
                ` ${metric.label}`
              )
            )
          )
        ),

        // Actions
        ReactEl('div', { style: { display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' } },
          ReactEl('button', {
            className: 'btn-primary',
            onClick: generateReport,
            disabled: loading || selectedMetrics.length === 0,
            style: { padding: '8px 16px' }
          }, loading ? 'Generating...' : '▶ Generate Report'),
          
          ReactEl('button', {
            onClick: () => setShowSaveDialog(true),
            style: {
              padding: '8px 16px',
              background: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }
          }, '💾 Save Config'),
          
          reportData ? ReactEl('button', {
            onClick: exportReport,
            style: {
              padding: '8px 16px',
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }
          }, '📥 Export CSV') : null,
          
          reportData ? ReactEl('span', {
            style: { color: '#666', fontSize: '13px', marginLeft: 'auto' }
          }, `${reportData.length} rows`) : null
        ),
        
        // Saved Reports List
        savedReports.length > 0 ? ReactEl('div', { className: 'panel', style: { marginBottom: '20px' } },
          ReactEl('div', { className: 'panel-header' }, `📋 Saved Reports (${savedReports.length})`),
          ReactEl('div', { className: 'panel-body' },
            ReactEl('div', { style: { display: 'grid', gap: '8px' } },
              savedReports.map(report =>
                ReactEl('div', {
                  key: report.id,
                  style: {
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    background: '#f9fafb',
                    borderRadius: '6px',
                    border: '1px solid #e5e7eb'
                  }
                },
                  ReactEl('div', { style: { flex: 1 } },
                    ReactEl('div', { style: { fontWeight: 600, marginBottom: '2px' } }, report.name),
                    ReactEl('div', { style: { fontSize: '11px', color: '#666' } },
                      `${report.selectedMetrics.length} metrics • ${report.groupBy} • ` +
                      `${report.dateFrom && report.dateTo ? `${report.dateFrom} to ${report.dateTo}` : 'All dates'}`
                    )
                  ),
                  ReactEl('div', { style: { display: 'flex', gap: '6px' } },
                    ReactEl('button', {
                      onClick: () => loadReportConfig(report),
                      style: {
                        padding: '4px 10px',
                        fontSize: '12px',
                        background: '#2563eb',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }
                    }, '📂 Load'),
                    ReactEl('button', {
                      onClick: () => {
                        loadReportConfig(report);
                        generateReport();
                      },
                      style: {
                        padding: '4px 10px',
                        fontSize: '12px',
                        background: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }
                    }, '▶ Run'),
                    ReactEl('button', {
                      onClick: () => deleteReportConfig(report.id),
                      style: {
                        padding: '4px 10px',
                        fontSize: '12px',
                        background: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }
                    }, '🗑')
                  )
                )
              )
            )
          )
        ) : null,
        
        // Save Dialog Modal
        showSaveDialog ? ReactEl('div', {
          style: {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000
          },
          onClick: () => setShowSaveDialog(false)
        },
          ReactEl('div', {
            style: {
              background: '#fff',
              padding: '24px',
              borderRadius: '8px',
              maxWidth: '400px',
              width: '90%'
            },
            onClick: (e) => e.stopPropagation()
          },
            ReactEl('h3', { style: { marginTop: 0 } }, 'Save Report Configuration'),
            ReactEl('input', {
              type: 'text',
              value: reportName,
              onChange: (e) => setReportName(e.target.value),
              placeholder: 'Enter report name...',
              autoFocus: true,
              onKeyPress: (e) => e.key === 'Enter' && saveReportConfig(),
              style: {
                width: '100%',
                padding: '8px',
                marginBottom: '16px',
                border: '1px solid #e5e7eb',
                borderRadius: '4px',
                fontSize: '14px'
              }
            }),
            ReactEl('div', { style: { display: 'flex', gap: '8px', justifyContent: 'flex-end' } },
              ReactEl('button', {
                onClick: () => setShowSaveDialog(false),
                style: {
                  padding: '8px 16px',
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }
              }, 'Cancel'),
              ReactEl('button', {
                onClick: saveReportConfig,
                style: {
                  padding: '8px 16px',
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }
              }, 'Save')
            )
          )
        ) : null,

        // Results Summary Stats
        reportData && reportData.length > 0 ? ReactEl('div', { className: 'panel', style: { marginBottom: '16px' } },
          ReactEl('div', { className: 'panel-header' }, '📊 Report Summary'),
          ReactEl('div', { className: 'panel-body' },
            (() => {
              const totalHands = reportData.reduce((sum, row) => sum + (row.hands || 0), 0);
              const totalWon = reportData.reduce((sum, row) => sum + (row.total_won || 0), 0);
              const avgVPIP = reportData.length > 0 
                ? reportData.reduce((sum, row) => sum + (row.vpip || 0), 0) / reportData.length
                : 0;
              const avgPFR = reportData.length > 0
                ? reportData.reduce((sum, row) => sum + (row.pfr || 0), 0) / reportData.length
                : 0;
              const avgBB100 = reportData.length > 0
                ? reportData.reduce((sum, row) => sum + (row.bb_per_100 || 0), 0) / reportData.length
                : 0;
              
              return ReactEl('div', {
                style: {
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                  gap: '16px'
                }
              }, [
                ReactEl('div', { key: 'hands' }, [
                  ReactEl('div', { key: 'label', style: { fontSize: '12px', color: '#666', marginBottom: '4px' } }, 'Total Hands'),
                  ReactEl('div', { key: 'value', style: { fontSize: '24px', fontWeight: 'bold' } }, totalHands.toLocaleString())
                ]),
                ReactEl('div', { key: 'profit' }, [
                  ReactEl('div', { key: 'label', style: { fontSize: '12px', color: '#666', marginBottom: '4px' } }, 'Total Profit'),
                  ReactEl('div', {
                    key: 'value',
                    style: {
                      fontSize: '24px',
                      fontWeight: 'bold',
                      color: totalWon > 0 ? '#10b981' : totalWon < 0 ? '#ef4444' : undefined
                    }
                  }, `$${totalWon.toFixed(2)}`)
                ]),
                ReactEl('div', { key: 'bb100' }, [
                  ReactEl('div', { key: 'label', style: { fontSize: '12px', color: '#666', marginBottom: '4px' } }, 'Avg BB/100'),
                  ReactEl('div', {
                    key: 'value',
                    style: {
                      fontSize: '24px',
                      fontWeight: 'bold',
                      color: avgBB100 > 0 ? '#10b981' : avgBB100 < 0 ? '#ef4444' : undefined
                    }
                  }, avgBB100.toFixed(2))
                ]),
                ReactEl('div', { key: 'vpip' }, [
                  ReactEl('div', { key: 'label', style: { fontSize: '12px', color: '#666', marginBottom: '4px' } }, 'Avg VPIP'),
                  ReactEl('div', { key: 'value', style: { fontSize: '24px', fontWeight: 'bold' } }, `${avgVPIP.toFixed(1)}%`)
                ]),
                ReactEl('div', { key: 'pfr' }, [
                  ReactEl('div', { key: 'label', style: { fontSize: '12px', color: '#666', marginBottom: '4px' } }, 'Avg PFR'),
                  ReactEl('div', { key: 'value', style: { fontSize: '24px', fontWeight: 'bold' } }, `${avgPFR.toFixed(1)}%`)
                ]),
                ReactEl('div', { key: 'groups' }, [
                  ReactEl('div', { key: 'label', style: { fontSize: '12px', color: '#666', marginBottom: '4px' } }, 'Groups'),
                  ReactEl('div', { key: 'value', style: { fontSize: '24px', fontWeight: 'bold' } }, reportData.length)
                ])
              ]);
            })()
          )
        ) : null,

        // Results Table
        reportData && reportData.length > 0 ? ReactEl('div', { className: 'panel' },
          ReactEl('div', { className: 'panel-header' }, `Report Results (${reportData.length} rows)`),
          ReactEl('div', { className: 'panel-body', style: { overflowX: 'auto' } },
            ReactEl('table', { className: 'hands-table', style: { width: '100%' } },
              ReactEl('thead', null,
                ReactEl('tr', null,
                  Object.keys(reportData[0]).map(key => {
                    const headerLabels = {
                      'group': 'GROUP',
                      'hands': 'HANDS',
                      'bb_per_100': 'BB PER 100',
                      'total_won': 'TOTAL WON',
                      'vpip': 'VPIP',
                      'pfr': 'PFR',
                      'threeBet': '3B',
                      'cbet': 'CBET',
                      'wtsd': 'WTSD'
                    };
                    return ReactEl('th', { key }, headerLabels[key] || key.replace(/_/g, ' ').toUpperCase());
                  })
                )
              ),
              ReactEl('tbody', null,
                reportData.map((row, idx) =>
                  ReactEl('tr', { key: idx },
                    Object.entries(row).map(([key, value]) =>
                      ReactEl('td', { key }, 
                        typeof value === 'number' ? value.toLocaleString() : value || '-'
                      )
                    )
                  )
                )
              )
            )
          )
        ) : reportData && reportData.length === 0 ? ReactEl('div', { className: 'panel' },
          ReactEl('div', { className: 'panel-body', style: { textAlign: 'center', padding: '40px' } },
            'No data found for selected filters'
          )
        ) : null
      ) : 
      
      // Leak Detection
      reportType === 'leaks' ? ReactEl(LeakDetectionView) :
      
      // Trend Analysis
      reportType === 'trends' ? ReactEl(TrendAnalysisView) :
      
      // Heat Map
      reportType === 'heatmap' ? ReactEl(HeatMapView) :
      
      // Full-Text Search
      reportType === 'search' ? ReactEl(FullTextSearch) :
      
      // Equity Calculator
      reportType === 'equity' ? ReactEl(EquityCalculator) :
      
      // Fallback
      null
    );
  }

  // ========== Leak Detection Component ==========
  function LeakDetectionView() {
    const React = window.React;
    const ReactEl = React.createElement;
    const [loading, setLoading] = React.useState(false);
    const [leakData, setLeakData] = React.useState(null);
    const [dateFrom, setDateFrom] = React.useState('');
    const [dateTo, setDateTo] = React.useState('');

    const runAnalysis = async () => {
      setLoading(true);
      try {
        const result = await window.api.reports.detectLeaks({ dateFrom, dateTo });
        if (result.success) {
          setLeakData(result);
          const { summary } = result;
          if (summary.total === 0) {
            window.__toast('No significant leaks detected! 🎉', 'success');
          } else {
            window.__toast(`Found ${summary.total} potential leaks (${summary.high} high priority)`, 'warning');
          }
        } else {
          window.__toast(`Analysis error: ${result.error}`, 'error');
        }
      } catch (err) {
        window.__toast(`Failed to analyze: ${err.message}`, 'error');
      } finally {
        setLoading(false);
      }
    };

    const getSeverityColor = (severity) => {
      if (severity === 'high') return '#f44336';
      if (severity === 'medium') return '#ff9800';
      return '#2196f3';
    };

    const getCategoryIcon = (category) => {
      if (category === 'Preflop') return '🃏';
      if (category === 'Postflop') return '🎲';
      if (category === 'Profitability') return '💰';
      return '📊';
    };

    return ReactEl('div', { style: { padding: '20px' } },
      // Header & Filters
      ReactEl('div', { className: 'panel', style: { marginBottom: '20px' } },
        ReactEl('div', { className: 'panel-header' }, 'Leak Detection Analysis'),
        ReactEl('div', { className: 'panel-body' },
          ReactEl('p', { style: { marginBottom: '15px', color: '#aaa' } },
            'Automatically identifies weaknesses in your play by analyzing betting patterns, position play, and profitability metrics.'
          ),
          ReactEl('div', { style: { display: 'flex', gap: '10px', alignItems: 'flex-end' } },
            ReactEl('div', { style: { flex: 1 } },
              ReactEl('label', { style: { display: 'block', marginBottom: '5px', fontWeight: 'bold' } }, 'Date Range (Optional)'),
              ReactEl('div', { style: { display: 'flex', gap: '10px' } },
                ReactEl('input', {
                  type: 'date',
                  value: dateFrom,
                  onChange: (e) => setDateFrom(e.target.value),
                  style: { flex: 1 }
                }),
                ReactEl('span', { style: { alignSelf: 'center' } }, 'to'),
                ReactEl('input', {
                  type: 'date',
                  value: dateTo,
                  onChange: (e) => setDateTo(e.target.value),
                  style: { flex: 1 }
                })
              )
            ),
            ReactEl('button', {
              className: 'btn-primary',
              onClick: runAnalysis,
              disabled: loading,
              style: { height: '38px' }
            }, loading ? 'Analyzing...' : 'Run Analysis')
          )
        )
      ),

      // Summary
      leakData && leakData.summary ? ReactEl('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginBottom: '20px' } },
        [
          { label: 'Total Leaks', value: leakData.summary.total, color: '#888' },
          { label: 'High Priority', value: leakData.summary.high, color: '#f44336' },
          { label: 'Medium Priority', value: leakData.summary.medium, color: '#ff9800' },
          { label: 'Low Priority', value: leakData.summary.low, color: '#2196f3' }
        ].map((stat, idx) =>
          ReactEl('div', {
            key: idx,
            className: 'panel',
            style: { textAlign: 'center', padding: '20px' }
          },
            ReactEl('div', { style: { fontSize: '32px', fontWeight: 'bold', color: stat.color } }, stat.value),
            ReactEl('div', { style: { fontSize: '14px', color: '#aaa', marginTop: '5px' } }, stat.label)
          )
        )
      ) : null,

      // Leaks List
      leakData && leakData.leaks && leakData.leaks.length > 0 ? ReactEl('div', { className: 'panel' },
        ReactEl('div', { className: 'panel-header' }, 'Detected Leaks & Recommendations'),
        ReactEl('div', { className: 'panel-body' },
          leakData.leaks.map((leak, idx) =>
            ReactEl('div', {
              key: idx,
              style: {
                padding: '15px',
                marginBottom: '15px',
                borderLeft: `4px solid ${getSeverityColor(leak.severity)}`,
                backgroundColor: 'rgba(0,0,0,0.3)',
                borderRadius: '4px'
              }
            },
              ReactEl('div', { style: { display: 'flex', alignItems: 'center', marginBottom: '10px' } },
                ReactEl('span', { style: { fontSize: '24px', marginRight: '10px' } }, getCategoryIcon(leak.category)),
                ReactEl('div', { style: { flex: 1 } },
                  ReactEl('div', { style: { fontWeight: 'bold', fontSize: '16px' } }, leak.issue),
                  ReactEl('div', { style: { fontSize: '12px', color: '#aaa' } },
                    `${leak.category} · `,
                    ReactEl('span', {
                      style: {
                        color: getSeverityColor(leak.severity),
                        textTransform: 'uppercase',
                        fontWeight: 'bold'
                      }
                    }, leak.severity)
                  )
                )
              ),
              ReactEl('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px', fontSize: '14px' } },
                ReactEl('div', null,
                  ReactEl('strong', null, 'Your Stats: '),
                  leak.metric
                ),
                ReactEl('div', null,
                  ReactEl('strong', null, 'Benchmark: '),
                  leak.benchmark
                )
              ),
              ReactEl('div', {
                style: {
                  padding: '10px',
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  borderRadius: '3px',
                  fontSize: '14px',
                  lineHeight: '1.5'
                }
              },
                ReactEl('strong', null, '💡 Suggestion: '),
                leak.suggestion
              )
            )
          )
        )
      ) : leakData && leakData.leaks && leakData.leaks.length === 0 ? ReactEl('div', { className: 'panel' },
        ReactEl('div', { className: 'panel-body', style: { textAlign: 'center', padding: '40px' } },
          ReactEl('div', { style: { fontSize: '48px', marginBottom: '20px' } }, '✅'),
          ReactEl('h3', { style: { color: '#4caf50', marginBottom: '10px' } }, 'No Significant Leaks Detected!'),
          ReactEl('p', { style: { color: '#aaa' } }, 'Your play patterns look solid. Keep up the good work!')
        )
      ) : null
    );
  }

  // ========== Trend Analysis Component ==========
  function TrendAnalysisView() {
    const React = window.React;
    const ReactEl = React.createElement;
    const [loading, setLoading] = React.useState(false);
    const [trendData, setTrendData] = React.useState(null);
    const [dateFrom, setDateFrom] = React.useState('');
    const [dateTo, setDateTo] = React.useState('');
    const [selectedMetrics, setSelectedMetrics] = React.useState(['winrate']);
    const [interval, setInterval] = React.useState('week');
    const chartRef = React.useRef(null);
    const chartInstanceRef = React.useRef(null);

    const allMetrics = [
      { id: 'winrate', label: 'Win Rate (BB/100)', color: '#4caf50' },
      { id: 'vpip', label: 'VPIP %', color: '#2196f3' },
      { id: 'pfr', label: 'PFR %', color: '#ff9800' },
      { id: 'threeBet', label: '3B %', color: '#9c27b0' },
      { id: 'cbet', label: 'C-Bet %', color: '#f44336' },
      { id: 'wtsd', label: 'WTSD %', color: '#00bcd4' }
    ];

    const toggleMetric = (metricId) => {
      setSelectedMetrics(prev =>
        prev.includes(metricId) ? prev.filter(m => m !== metricId) : [...prev, metricId]
      );
    };

    const runAnalysis = async () => {
      setLoading(true);
      try {
        const result = await window.api.reports.getTrends({
          dateFrom,
          dateTo,
          metrics: selectedMetrics,
          interval
        });
        if (result.success) {
          setTrendData(result);
          window.__toast('Trend analysis complete', 'success');
        } else {
          window.__toast(`Analysis error: ${result.error}`, 'error');
        }
      } catch (err) {
        window.__toast(`Failed to analyze: ${err.message}`, 'error');
      } finally {
        setLoading(false);
      }
    };

    // Render chart when data changes
    React.useEffect(() => {
      if (!trendData || !trendData.data || trendData.data.length === 0) return;
      if (!chartRef.current || !window.Chart) return;

      // Destroy existing chart
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }

      const ctx = chartRef.current.getContext('2d');
      const datasets = [];

      selectedMetrics.forEach(metric => {
        const metricConfig = allMetrics.find(m => m.id === metric);
        if (!metricConfig) return;

        const dataKey = metric === 'winrate' ? 'bb_per_100' : metric;
        const yData = trendData.data.map(row => row[dataKey]);
        
        datasets.push({
          label: metricConfig.label,
          data: yData,
          borderColor: metricConfig.color,
          backgroundColor: metricConfig.color + '33',
          borderWidth: 2,
          tension: 0.3,
          fill: false,
          pointRadius: 3,
          pointHoverRadius: 5
        });

        // Add moving average line
        if (trendData.movingAvgs && trendData.movingAvgs[dataKey]) {
          datasets.push({
            label: `${metricConfig.label} (5-period MA)`,
            data: trendData.movingAvgs[dataKey],
            borderColor: metricConfig.color,
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderDash: [5, 5],
            tension: 0.3,
            fill: false,
            pointRadius: 0,
            pointHoverRadius: 0
          });
        }
      });

      chartInstanceRef.current = new window.Chart(ctx, {
        type: 'line',
        data: {
          labels: trendData.data.map(row => row.period),
          datasets
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
              labels: { color: '#fff' }
            },
            tooltip: {
              mode: 'index',
              intersect: false
            }
          },
          scales: {
            x: {
              ticks: { color: '#aaa' },
              grid: { color: '#333' }
            },
            y: {
              ticks: { color: '#aaa' },
              grid: { color: '#333' }
            }
          },
          interaction: {
            mode: 'nearest',
            axis: 'x',
            intersect: false
          }
        }
      });
    }, [trendData, selectedMetrics]);

    // Cleanup chart on unmount
    React.useEffect(() => {
      return () => {
        if (chartInstanceRef.current) {
          chartInstanceRef.current.destroy();
        }
      };
    }, []);

    const getTrendIcon = (trend) => {
      if (trend === 'improving') return '📈';
      if (trend === 'declining') return '📉';
      return '➡️';
    };

    const getTrendColor = (trend) => {
      if (trend === 'improving') return '#4caf50';
      if (trend === 'declining') return '#f44336';
      return '#888';
    };

    return ReactEl('div', { style: { padding: '20px' } },
      // Header & Filters
      ReactEl('div', { className: 'panel', style: { marginBottom: '20px' } },
        ReactEl('div', { className: 'panel-header' }, 'Trend Analysis'),
        ReactEl('div', { className: 'panel-body' },
          ReactEl('p', { style: { marginBottom: '15px', color: '#aaa' } },
            'Visualize how your key metrics evolve over time to track improvement and identify patterns.'
          ),
          ReactEl('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '15px', alignItems: 'flex-end' } },
            // Date Range
            ReactEl('div', null,
              ReactEl('label', { style: { display: 'block', marginBottom: '5px', fontWeight: 'bold' } }, 'Date Range (Optional)'),
              ReactEl('div', { style: { display: 'flex', gap: '10px' } },
                ReactEl('input', {
                  type: 'date',
                  value: dateFrom,
                  onChange: (e) => setDateFrom(e.target.value),
                  style: { flex: 1 }
                }),
                ReactEl('span', { style: { alignSelf: 'center' } }, 'to'),
                ReactEl('input', {
                  type: 'date',
                  value: dateTo,
                  onChange: (e) => setDateTo(e.target.value),
                  style: { flex: 1 }
                })
              )
            ),
            // Interval
            ReactEl('div', null,
              ReactEl('label', { style: { display: 'block', marginBottom: '5px', fontWeight: 'bold' } }, 'Time Interval'),
              ReactEl('select', {
                value: interval,
                onChange: (e) => setInterval(e.target.value),
                style: { width: '100%', padding: '5px' }
              },
                ['day', 'week', 'month'].map(opt =>
                  ReactEl('option', { key: opt, value: opt }, opt.charAt(0).toUpperCase() + opt.slice(1))
                )
              )
            ),
            // Analyze Button
            ReactEl('button', {
              className: 'btn-primary',
              onClick: runAnalysis,
              disabled: loading || selectedMetrics.length === 0,
              style: { height: '38px' }
            }, loading ? 'Analyzing...' : 'Analyze Trends')
          ),
          // Metric Selection
          ReactEl('div', { style: { marginTop: '15px' } },
            ReactEl('label', { style: { display: 'block', marginBottom: '5px', fontWeight: 'bold' } }, 
              `Select Metrics (${selectedMetrics.length})`
            ),
            ReactEl('div', { style: { display: 'flex', gap: '10px', flexWrap: 'wrap' } },
              allMetrics.map(metric =>
                ReactEl('label', {
                  key: metric.id,
                  style: {
                    cursor: 'pointer',
                    padding: '5px 10px',
                    border: `2px solid ${selectedMetrics.includes(metric.id) ? metric.color : '#444'}`,
                    borderRadius: '3px',
                    backgroundColor: selectedMetrics.includes(metric.id) ? metric.color + '22' : 'transparent'
                  }
                },
                  ReactEl('input', {
                    type: 'checkbox',
                    checked: selectedMetrics.includes(metric.id),
                    onChange: () => toggleMetric(metric.id),
                    style: { marginRight: '5px' }
                  }),
                  metric.label
                )
              )
            )
          )
        )
      ),

      // Comparison Summary
      trendData && trendData.comparison ? ReactEl('div', { className: 'panel', style: { marginBottom: '20px' } },
        ReactEl('div', { className: 'panel-header' }, 'Period Comparison'),
        ReactEl('div', { className: 'panel-body', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' } },
          Object.entries(trendData.comparison).map(([metric, data]) => {
            const metricConfig = allMetrics.find(m => m.id === metric);
            if (!metricConfig) return null;

            return ReactEl('div', {
              key: metric,
              style: {
                padding: '15px',
                border: `1px solid ${metricConfig.color}`,
                borderRadius: '4px',
                backgroundColor: metricConfig.color + '11'
              }
            },
              ReactEl('div', { style: { fontSize: '14px', color: '#aaa', marginBottom: '5px' } }, metricConfig.label),
              ReactEl('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' } },
                ReactEl('span', { style: { fontSize: '20px' } }, getTrendIcon(data.trend)),
                ReactEl('span', {
                  style: {
                    fontSize: '20px',
                    fontWeight: 'bold',
                    color: getTrendColor(data.trend)
                  }
                }, `${data.change > 0 ? '+' : ''}${data.change}`)
              ),
              ReactEl('div', { style: { fontSize: '12px', color: '#888' } },
                `1st Half: ${data.firstPeriod} → 2nd Half: ${data.secondPeriod}`
              )
            );
          })
        )
      ) : null,

      // Chart
      trendData && trendData.data && trendData.data.length > 0 ? ReactEl('div', { className: 'panel' },
        ReactEl('div', { className: 'panel-header' }, `Trend Visualization (${trendData.data.length} periods)`),
        ReactEl('div', { className: 'panel-body' },
          ReactEl('canvas', {
            ref: chartRef,
            style: { height: '400px', width: '100%' }
          })
        )
      ) : trendData && trendData.data && trendData.data.length === 0 ? ReactEl('div', { className: 'panel' },
        ReactEl('div', { className: 'panel-body', style: { textAlign: 'center', padding: '40px' } },
          'No data found for selected date range'
        )
      ) : null
    );
  }

  // ========== Heat Map Component ==========
  function HeatMapView() {
    const React = window.React;
    const ReactEl = React.createElement;
    const [loading, setLoading] = React.useState(false);
    const [heatmapData, setHeatmapData] = React.useState(null);
    const [dateFrom, setDateFrom] = React.useState('');
    const [dateTo, setDateTo] = React.useState('');
    const [selectedMetric, setSelectedMetric] = React.useState('winrate');

    const metrics = [
      { id: 'winrate', label: 'Win Rate (BB/100)' },
      { id: 'vpip', label: 'VPIP %' },
      { id: 'pfr', label: 'PFR %' },
      { id: 'aggression', label: 'Aggression %' },
      { id: '3bet', label: '3-Bet %' },
      { id: 'wtsd', label: 'WTSD %' }
    ];

    const positions = ['UTG', 'MP', 'CO', 'BTN', 'SB', 'BB'];
    
    // Expected baseline win rates by position (bb/100)
    // These represent typical/break-even performance at each position
    const positionBaselines = {
      'UTG': 2,
      'MP': 7,
      'CO': 12,
      'BTN': 25,
      'SB': -20,
      'BB': -35
    };

    const runAnalysis = async () => {
      setLoading(true);
      try {
        const result = await window.api.reports.getHeatmap({
          dateFrom,
          dateTo,
          metric: selectedMetric
        });
        if (result.success) {
          setHeatmapData(result);
          window.__toast('Heat map generated', 'success');
        } else {
          window.__toast(`Analysis error: ${result.error}`, 'error');
        }
      } catch (err) {
        window.__toast(`Failed to analyze: ${err.message}`, 'error');
      } finally {
        setLoading(false);
      }
    };

    const getHeatColor = (value, min, max) => {
      if (max === min) return 'rgb(100, 100, 100)';
      
      // Normalize value between 0 and 1
      const normalized = (value - min) / (max - min);
      
      // Color scale: red (bad) -> yellow (neutral) -> green (good)
      if (selectedMetric === 'winrate') {
        // For winrate: negative is red, positive is green
        if (value < 0) {
          const intensity = Math.min(Math.abs(value) / Math.abs(min), 1);
          return `rgb(${255}, ${Math.round(100 + 155 * (1 - intensity))}, ${Math.round(100 + 155 * (1 - intensity))})`;
        } else {
          const intensity = Math.min(value / max, 1);
          return `rgb(${Math.round(100 + 155 * (1 - intensity))}, ${255}, ${Math.round(100 + 155 * (1 - intensity))})`;
        }
      } else {
        // For percentage metrics: use gradient from blue to red
        const r = Math.round(255 * normalized);
        const g = Math.round(200 * (1 - Math.abs(normalized - 0.5) * 2));
        const b = Math.round(255 * (1 - normalized));
        return `rgb(${r}, ${g}, ${b})`;
      }
    };

    const getTextColor = (value, min, max) => {
      if (max === min) return '#000';
      
      const normalized = (value - min) / (max - min);
      
      // Calculate luminance based on the actual background color we're using
      let r, g, b;
      if (selectedMetric === 'winrate') {
        if (value < 0) {
          const intensity = Math.min(Math.abs(value) / Math.abs(min), 1);
          r = 255;
          g = Math.round(100 + 155 * (1 - intensity));
          b = Math.round(100 + 155 * (1 - intensity));
        } else {
          const intensity = Math.min(value / max, 1);
          r = Math.round(100 + 155 * (1 - intensity));
          g = 255;
          b = Math.round(100 + 155 * (1 - intensity));
        }
      } else {
        r = Math.round(255 * normalized);
        g = Math.round(200 * (1 - Math.abs(normalized - 0.5) * 2));
        b = Math.round(255 * (1 - normalized));
      }
      
      // Calculate relative luminance (WCAG formula)
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      
      // Use very dark text for bright backgrounds, white for dark backgrounds
      // Threshold at 0.65 - only use dark text on very bright backgrounds
      return luminance > 0.65 ? '#1a1a1a' : '#ffffff';
    };

    return ReactEl('div', { style: { padding: '20px' } },
      // Header & Filters
      ReactEl('div', { className: 'panel', style: { marginBottom: '20px' } },
        ReactEl('div', { className: 'panel-header' }, 'Positional Heat Map'),
        ReactEl('div', { className: 'panel-body' },
          ReactEl('p', { style: { marginBottom: '15px', color: '#aaa' } },
            'Visualize performance by position to identify positional strengths and weaknesses.'
          ),
          ReactEl('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '15px', alignItems: 'flex-end' } },
            // Date Range
            ReactEl('div', null,
              ReactEl('label', { style: { display: 'block', marginBottom: '5px', fontWeight: 'bold' } }, 'Date Range (Optional)'),
              ReactEl('div', { style: { display: 'flex', gap: '10px' } },
                ReactEl('input', {
                  type: 'date',
                  value: dateFrom,
                  onChange: (e) => setDateFrom(e.target.value),
                  style: { flex: 1 }
                }),
                ReactEl('span', { style: { alignSelf: 'center' } }, 'to'),
                ReactEl('input', {
                  type: 'date',
                  value: dateTo,
                  onChange: (e) => setDateTo(e.target.value),
                  style: { flex: 1 }
                })
              )
            ),
            // Metric Selection
            ReactEl('div', null,
              ReactEl('label', { style: { display: 'block', marginBottom: '5px', fontWeight: 'bold' } }, 'Metric'),
              ReactEl('select', {
                value: selectedMetric,
                onChange: (e) => setSelectedMetric(e.target.value),
                style: { width: '100%', padding: '5px' }
              },
                metrics.map(m =>
                  ReactEl('option', { key: m.id, value: m.id }, m.label)
                )
              )
            ),
            // Generate Button
            ReactEl('button', {
              className: 'btn-primary',
              onClick: runAnalysis,
              disabled: loading,
              style: { height: '38px' }
            }, loading ? 'Generating...' : 'Generate Heat Map')
          )
        )
      ),

      // Stats Summary
      heatmapData && heatmapData.stats ? ReactEl('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '15px', marginBottom: '20px' } },
        [
          { label: 'Minimum', value: heatmapData.stats.min },
          { label: 'Average', value: heatmapData.stats.avg },
          { label: 'Maximum', value: heatmapData.stats.max },
          {
            label: 'Best Position',
            value: heatmapData.stats.best ? `${heatmapData.stats.best.position} (${heatmapData.stats.best.value})` : 'N/A'
          },
          {
            label: 'Worst Position',
            value: heatmapData.stats.worst ? `${heatmapData.stats.worst.position} (${heatmapData.stats.worst.value})` : 'N/A'
          }
        ].map((stat, idx) =>
          ReactEl('div', {
            key: idx,
            className: 'panel',
            style: { textAlign: 'center', padding: '15px' }
          },
            ReactEl('div', { style: { fontSize: '18px', fontWeight: 'bold', color: 'var(--text-primary)' } }, stat.value),
            ReactEl('div', { style: { fontSize: '12px', color: 'var(--text-muted)', marginTop: '5px' } }, stat.label)
          )
        )
      ) : null,

      // Heat Map Grid
      heatmapData && heatmapData.data ? ReactEl('div', { className: 'panel' },
        ReactEl('div', { className: 'panel-header' }, 
          `${metrics.find(m => m.id === selectedMetric)?.label} by Position`
        ),
        ReactEl('div', { className: 'panel-body' },
          // Poker table layout visualization
          ReactEl('div', {
            style: {
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '20px',
              maxWidth: '800px',
              margin: '0 auto',
              padding: '40px'
            }
          },
            // Position layout: [UTG, MP, CO] [BB, SB, BTN] [-, -, -]
            ['UTG', 'MP', 'CO', 'BB', 'SB', 'BTN', null, null, null].map((pos, idx) => {
              if (!pos) {
                return ReactEl('div', { key: `empty-${idx}`, style: { visibility: 'hidden' } });
              }

              const data = heatmapData.data[pos];
              if (!data) return ReactEl('div', { key: pos });

              // For winrate metric, adjust by positional baseline for color coding
              let valueForColor = data.value;
              let displayValue = data.value;
              let adjustedMin = heatmapData.stats.min;
              let adjustedMax = heatmapData.stats.max;
              
              if (selectedMetric === 'winrate' && positionBaselines[pos] !== undefined) {
                // Calculate adjusted value (performance vs expectation)
                valueForColor = data.value - positionBaselines[pos];
                
                // Recalculate min/max for adjusted values
                const adjustedValues = Object.entries(heatmapData.data).map(([p, d]) => 
                  d.value - (positionBaselines[p] || 0)
                );
                adjustedMin = Math.min(...adjustedValues);
                adjustedMax = Math.max(...adjustedValues);
              }
              
              const bgColor = getHeatColor(valueForColor, adjustedMin, adjustedMax);
              const textColor = getTextColor(valueForColor, adjustedMin, adjustedMax);
              
              // Show baseline comparison for winrate
              const baselineText = selectedMetric === 'winrate' && positionBaselines[pos] !== undefined
                ? `(${valueForColor > 0 ? '+' : ''}${valueForColor.toFixed(2)} vs exp)`
                : null;

              return ReactEl('div', {
                key: pos,
                style: {
                  padding: '30px',
                  borderRadius: '8px',
                  backgroundColor: bgColor,
                  color: textColor,
                  textAlign: 'center',
                  border: '2px solid rgba(255,255,255,0.3)',
                  cursor: 'pointer',
                  transition: 'transform 0.2s',
                  ':hover': { transform: 'scale(1.05)' }
                }
              },
                ReactEl('div', { style: { fontSize: '24px', fontWeight: 'bold', marginBottom: '10px' } }, pos),
                ReactEl('div', { style: { fontSize: '32px', fontWeight: 'bold', marginBottom: '5px' } }, displayValue),
                baselineText ? ReactEl('div', { style: { fontSize: '11px', marginBottom: '5px', opacity: 0.85, fontWeight: 600 } }, baselineText) : null,
                ReactEl('div', { style: { fontSize: '14px', opacity: 0.9 } }, `${data.hands} hands`),
                data.totalWon !== undefined ? ReactEl('div', { style: { fontSize: '12px', marginTop: '5px', opacity: 0.8 } },
                  `Total: $${data.totalWon.toFixed(2)}`
                ) : null
              );
            })
          ),
          // Legend
          ReactEl('div', { style: { marginTop: '40px', textAlign: 'center' } },
            ReactEl('div', { style: { fontSize: '14px', color: '#aaa', marginBottom: '10px' } }, 'Color Scale:'),
            ReactEl('div', {
              style: {
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '10px'
              }
            },
              selectedMetric === 'winrate' ? [
                ReactEl('span', { key: 'low', style: { color: '#ff6666' } }, 'Losing'),
                ReactEl('div', {
                  key: 'gradient',
                  style: {
                    width: '200px',
                    height: '20px',
                    background: 'linear-gradient(to right, rgb(255,100,100), rgb(200,200,200), rgb(100,255,100))',
                    borderRadius: '3px'
                  }
                }),
                ReactEl('span', { key: 'high', style: { color: '#66ff66' } }, 'Winning')
              ] : [
                ReactEl('span', { key: 'low', style: { color: '#6666ff' } }, 'Low'),
                ReactEl('div', {
                  key: 'gradient',
                  style: {
                    width: '200px',
                    height: '20px',
                    background: 'linear-gradient(to right, rgb(100,100,255), rgb(255,100,100))',
                    borderRadius: '3px'
                  }
                }),
                ReactEl('span', { key: 'high', style: { color: '#ff6666' } }, 'High')
              ]
            )
          )
        )
      ) : null
    );
  }

  // Hourly Heatmap Component - Win Rate by Hour and Day of Week
  function HourlyHeatmap({ filters }) {
    const React = window.React;
    const ReactEl = React.createElement;
    const bump = useDataUpdatedBump();
    
    // Build request from filters
    const request = React.useMemo(() => {
      const params = {};
      if (filters.stake && filters.stake !== 'all') params.stakes = [filters.stake];
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;
      return params;
    }, [filters]);
    
    // Fetch heatmap data
    const { data, loading, error } = useCachedAsync(
      () => window.api?.hourlyHeatmap?.(request) ?? { success: false, data: [] },
      [request, bump],
      getCacheKey('hourlyHeatmap', request)
    );
    
    const heatmapData = data?.success ? data.data : [];
    
    // Create 7x24 grid (7 days × 24 hours)
    const grid = React.useMemo(() => {
      // Initialize empty grid
      const g = Array(7).fill(null).map(() => Array(24).fill(null).map(() => ({
        hands: 0,
        profit: 0,
        avgProfit: 0,
        winRate: 0
      })));
      
      // Fill grid with data
      heatmapData.forEach(row => {
        const day = row.dayOfWeek; // 0=Sunday, 1=Monday, ..., 6=Saturday
        const hour = row.hour;
        if (day >= 0 && day < 7 && hour >= 0 && hour < 24) {
          g[day][hour] = {
            hands: row.hands || 0,
            profit: row.profit || 0,
            avgProfit: row.avgProfit || 0,
            winRate: row.hands > 0 ? ((row.wins || 0) / row.hands * 100) : 0
          };
        }
      });
      
      return g;
    }, [heatmapData]);
    
    // Calculate min/max for color scaling
    const { min, max } = React.useMemo(() => {
      let minProfit = 0;
      let maxProfit = 0;
      
      grid.forEach(day => {
        day.forEach(cell => {
          if (cell.hands > 0) {
            if (cell.profit < minProfit) minProfit = cell.profit;
            if (cell.profit > maxProfit) maxProfit = cell.profit;
          }
        });
      });
      
      // Make scale symmetric around zero
      const absMax = Math.max(Math.abs(minProfit), Math.abs(maxProfit));
      return { min: -absMax, max: absMax };
    }, [grid]);
    
    // Get color for cell based on profit
    const getColor = (profit, hands) => {
      if (hands === 0) return '#f3f4f6'; // Gray for no data
      if (max === 0) return '#fef3c7'; // Neutral yellow if no variance
      
      // Normalize profit to -1 to 1 range
      const normalized = profit / Math.max(Math.abs(max), Math.abs(min));
      
      if (normalized > 0) {
        // Green scale for profit (light to dark)
        const intensity = Math.min(normalized, 1);
        const r = Math.floor(220 - intensity * 185); // 220 → 35
        const g = Math.floor(252 - intensity * 32);  // 252 → 220
        const b = Math.floor(211 - intensity * 146); // 211 → 65
        return `rgb(${r}, ${g}, ${b})`;
      } else {
        // Red scale for loss (light to dark)
        const intensity = Math.min(Math.abs(normalized), 1);
        const r = Math.floor(254 - intensity * 21);  // 254 → 233
        const g = Math.floor(226 - intensity * 110); // 226 → 116
        const b = Math.floor(226 - intensity * 110); // 226 → 116
        return `rgb(${r}, ${g}, ${b})`;
      }
    };
    
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    if (loading) return ReactEl('div', { style: { padding: 20, textAlign: 'center', color: '#6b7280' } }, 'Loading heatmap...');
    if (error) return ReactEl('div', { style: { padding: 20, textAlign: 'center', color: '#ef4444' } }, 'Error loading heatmap');
    if (heatmapData.length === 0) return ReactEl('div', { style: { padding: 20, textAlign: 'center', color: '#6b7280' } }, 'No data available for heatmap');
    
    return ReactEl('div', { style: { padding: '12px' } }, [
      // Header
      ReactEl('div', { key: 'header', style: { marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 } }, [
        ReactEl('h4', { key: 'title', style: { margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' } }, '🔥 Win Rate by Hour & Day'),
        ReactEl('div', { key: 'legend', style: { flex: 1, display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--text-secondary)' } }, [
          ReactEl('span', { key: 'loss-label' }, 'Loss'),
          ReactEl('div', { key: 'gradient', style: {
            width: 120,
            height: 12,
            background: 'linear-gradient(to right, rgb(233,116,116), rgb(254,226,226), rgb(254,249,195), rgb(220,252,211), rgb(34,197,94))',
            borderRadius: 3,
            border: '1px solid var(--border-default)'
          } }),
          ReactEl('span', { key: 'profit-label' }, 'Profit')
        ])
      ]),
      
      // Heatmap grid
      ReactEl('div', { key: 'grid', style: { overflowX: 'auto' } }, 
        ReactEl('div', { style: { display: 'inline-block', minWidth: '100%' } }, [
          // Header row with hours
          ReactEl('div', { key: 'hour-labels', style: { display: 'grid', gridTemplateColumns: '50px repeat(24, 32px)', gap: 2, marginBottom: 2 } }, [
            ReactEl('div', { key: 'corner' }), // Empty corner
            ...Array.from({ length: 24 }, (_, i) => 
              ReactEl('div', {
                key: i,
                style: {
                  fontSize: 9,
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  fontWeight: 600
                },
                title: `${i}:00 - ${i}:59`
              }, i)
            )
          ]),
          
          // Data rows
          ...grid.map((dayData, dayIndex) => 
            ReactEl('div', {
              key: dayIndex,
              style: {
                display: 'grid',
                gridTemplateColumns: '50px repeat(24, 32px)',
                gap: 2,
                marginBottom: 2
              }
            }, [
              // Day label
              ReactEl('div', {
                key: 'label',
                style: {
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  paddingRight: 8
                }
              }, dayNames[dayIndex]),
              
              // Hour cells
              ...dayData.map((cell, hourIndex) => {
                const color = getColor(cell.profit, cell.hands);
                const hasData = cell.hands > 0;
                
                return ReactEl('div', {
                  key: hourIndex,
                  title: hasData 
                    ? `${dayNames[dayIndex]} ${hourIndex}:00\nHands: ${cell.hands}\nProfit: $${cell.profit.toFixed(2)}\nAvg: $${cell.avgProfit.toFixed(2)}\nWin Rate: ${cell.winRate.toFixed(1)}%`
                    : `${dayNames[dayIndex]} ${hourIndex}:00\nNo hands played`,
                  style: {
                    width: 32,
                    height: 32,
                    background: color,
                    border: '1px solid var(--border-light)',
                    borderRadius: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 9,
                    fontWeight: 600,
                    color: hasData ? (cell.profit >= 0 ? '#166534' : '#991b1b') : '#d1d5db',
                    cursor: hasData ? 'pointer' : 'default',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    boxShadow: hasData ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
                  },
                  onMouseEnter: (e) => {
                    if (hasData) {
                      e.currentTarget.style.transform = 'scale(1.1)';
                      e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
                      e.currentTarget.style.zIndex = 10;
                    }
                  },
                  onMouseLeave: (e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = hasData ? '0 1px 2px rgba(0,0,0,0.1)' : 'none';
                    e.currentTarget.style.zIndex = 1;
                  }
                }, hasData ? (cell.hands > 99 ? '99+' : cell.hands.toString()) : '·')
              })
            ])
          )
        ])
      ),
      
      // Summary stats
      ReactEl('div', { key: 'summary', style: { marginTop: 16, padding: 12, background: 'var(--bg-tertiary)', borderRadius: 6, border: '1px solid var(--border-default)' } }, [
        ReactEl('div', { key: 'title', style: { fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase' } }, 'Quick Insights'),
        ReactEl('div', { key: 'stats', style: { display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 12 } }, (() => {
          // Calculate best/worst times
          let bestTime = { day: -1, hour: -1, profit: -Infinity, hands: 0 };
          let worstTime = { day: -1, hour: -1, profit: Infinity, hands: 0 };
          let totalHands = 0;
          let totalProfit = 0;
          
          grid.forEach((dayData, dayIndex) => {
            dayData.forEach((cell, hourIndex) => {
              if (cell.hands > 0) {
                totalHands += cell.hands;
                totalProfit += cell.profit;
                
                if (cell.profit > bestTime.profit) {
                  bestTime = { day: dayIndex, hour: hourIndex, profit: cell.profit, hands: cell.hands };
                }
                if (cell.profit < worstTime.profit) {
                  worstTime = { day: dayIndex, hour: hourIndex, profit: cell.profit, hands: cell.hands };
                }
              }
            });
          });
          
          return [
            ReactEl('div', { key: 'total', style: { color: 'var(--text-primary)' } }, 
              ReactEl('strong', null, `Total Hands: `),
              totalHands.toLocaleString()
            ),
            ReactEl('div', { key: 'total-profit', style: { color: totalProfit >= 0 ? '#059669' : '#dc2626' } }, 
              ReactEl('strong', null, `Total Profit: `),
              `$${totalProfit.toFixed(2)}`
            ),
            bestTime.day >= 0 ? ReactEl('div', { key: 'best', style: { color: '#059669' } }, 
              ReactEl('strong', null, `🔥 Best: `),
              `${dayNames[bestTime.day]} ${bestTime.hour}:00 (+$${bestTime.profit.toFixed(2)}, ${bestTime.hands} hands)`
            ) : null,
            worstTime.day >= 0 ? ReactEl('div', { key: 'worst', style: { color: '#dc2626' } }, 
              ReactEl('strong', null, `❄️ Worst: `),
              `${dayNames[worstTime.day]} ${worstTime.hour}:00 ($${worstTime.profit.toFixed(2)}, ${worstTime.hands} hands)`
            ) : null
          ].filter(Boolean);
        })())
      ])
    ]);
  }

  // Hand Range Visualizer Component
  function HandRangeVisualizer() {
    const React = window.React;
    const ReactEl = React.createElement;
    
    // State management
    const [selectedPosition, setSelectedPosition] = React.useState('all');
    const [selectedAction, setSelectedAction] = React.useState('all');
    const [colorMetric, setColorMetric] = React.useState('frequency'); // frequency, profit, vpip
    const [rangeData, setRangeData] = React.useState(null);
    const [loading, setLoading] = React.useState(false);
    const [hoveredHand, setHoveredHand] = React.useState(null);
    
    // 169 starting hands in grid format
    // Rows: A K Q J T 9 8 7 6 5 4 3 2
    // Cols: A K Q J T 9 8 7 6 5 4 3 2
    // Diagonal = pairs (AA, KK, etc)
    // Above diagonal = suited (AKs, AQs, etc)
    // Below diagonal = offsuit (AKo, AQo, etc)
    const ranks = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
    
    // Generate hand name from grid position
    const getHandName = (row, col) => {
      if (row === col) {
        // Pair
        return ranks[row] + ranks[col];
      } else if (row < col) {
        // Suited (above diagonal)
        return ranks[row] + ranks[col] + 's';
      } else {
        // Offsuit (below diagonal)
        return ranks[col] + ranks[row] + 'o';
      }
    };
    
    // Fetch range data from API
    React.useEffect(() => {
      const fetchRangeData = async () => {
        if (!window.api?.handsGetRange) {
          console.warn('API method handsGetRange not available');
          return;
        }
        
        setLoading(true);
        try {
          const result = await window.api.handsGetRange({
            position: selectedPosition,
            action: selectedAction
          });
          
          if (result.success) {
            setRangeData(result.data);
          } else {
            console.error('Failed to fetch range data:', result.error);
          }
        } catch (error) {
          console.error('Error fetching range data:', error);
        } finally {
          setLoading(false);
        }
      };
      
      fetchRangeData();
    }, [selectedPosition, selectedAction]);
    
    // Get hand stats from rangeData
    const getHandStats = (handName) => {
      if (!rangeData || !rangeData[handName]) {
        return {
          frequency: 0,
          hands: 0,
          profit: 0,
          vpip: 0,
          pfr: 0,
          threeBet: 0
        };
      }
      return rangeData[handName];
    };
    
    // Calculate color based on metric
    const getHandColor = (handName) => {
      const stats = getHandStats(handName);
      
      if (stats.hands === 0) {
        return 'var(--bg-secondary)'; // No data
      }
      
      // Collect all values for percentile calculation
      const allHandNames = [];
      for (let row = 0; row < 13; row++) {
        for (let col = 0; col < 13; col++) {
          allHandNames.push(getHandName(row, col));
        }
      }
      
      const allValues = allHandNames
        .map(name => {
          const s = getHandStats(name);
          if (s.hands === 0) return null;
          if (colorMetric === 'frequency') return s.frequency;
          if (colorMetric === 'profit') return s.profit;
          if (colorMetric === 'vpip') return s.vpip;
          return 0;
        })
        .filter(v => v !== null);
      
      if (allValues.length === 0) {
        return 'var(--bg-secondary)';
      }
      
      const currentValue = colorMetric === 'frequency' ? stats.frequency 
                         : colorMetric === 'profit' ? stats.profit 
                         : stats.vpip;
      
      // Sort all values to find percentiles
      const sorted = [...allValues].sort((a, b) => b - a);
      const rank = sorted.findIndex(v => v <= currentValue);
      const percentile = rank === -1 ? 100 : (rank / sorted.length) * 100;
      
      // For profit metric, use green/red based on percentile
      if (colorMetric === 'profit') {
        if (currentValue >= 0) {
          // Positive profit - green shades based on percentile
          if (percentile <= 5) return 'rgb(22, 101, 52)';   // Top 5%: Very dark green
          if (percentile <= 10) return 'rgb(21, 128, 61)';  // Top 10%: Dark green
          if (percentile <= 25) return 'rgb(34, 197, 94)';  // Top 25%: Medium green
          if (percentile <= 50) return 'rgb(74, 222, 128)'; // Top 50%: Light green
          return 'rgb(134, 239, 172)';                       // Bottom 50%: Very light green
        } else {
          // Negative profit - red shades based on percentile (inverted)
          const negPercentile = 100 - percentile;
          if (negPercentile <= 5) return 'rgb(220, 38, 38)';   // Bottom 5%: Very dark red
          if (negPercentile <= 10) return 'rgb(239, 68, 68)';  // Bottom 10%: Dark red
          if (negPercentile <= 25) return 'rgb(248, 113, 113)'; // Bottom 25%: Medium red
          if (negPercentile <= 50) return 'rgb(252, 165, 165)'; // Bottom 50%: Light red
          return 'rgb(254, 202, 202)';                           // Top 50% of negatives: Very light red
        }
      } else {
        // For frequency/vpip - green gradient based on percentile
        if (percentile <= 5) return 'rgb(22, 101, 52)';   // Top 5%
        if (percentile <= 10) return 'rgb(21, 128, 61)';  // Top 10%
        if (percentile <= 25) return 'rgb(34, 197, 94)';  // Top 25%
        if (percentile <= 50) return 'rgb(74, 222, 128)'; // Top 50%
        if (percentile <= 75) return 'rgb(134, 239, 172)'; // Top 75%
        return 'rgb(187, 247, 208)';                       // Bottom 25%
      }
    };
    
    // Get text color based on background
    const getTextColor = (bgColor) => {
      if (bgColor === 'var(--bg-secondary)') return 'var(--text-muted)';
      
      // Extract RGB values
      const match = bgColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (!match) return '#ffffff';
      
      const r = parseInt(match[1]);
      const g = parseInt(match[2]);
      const b = parseInt(match[3]);
      
      // Calculate luminance
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      
      return luminance > 0.5 ? '#1a1a1a' : '#ffffff';
    };
    
    // All hands fully opaque - no opacity variation
    const getHandOpacity = (handName) => {
      return 1.0;
    };
    
    return ReactEl('div', { className: 'panel', style: { marginBottom: 20 } }, [
      // Header
      ReactEl('h3', { key: 'title', style: { margin: 0, marginBottom: 12, fontSize: 16, fontWeight: 600 } }, 'Hand Range Visualizer'),
      
      // Filters
      ReactEl('div', { 
        key: 'filters',
        style: { display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }
      }, [
        ReactEl('div', { key: 'position-filter', style: { display: 'flex', flexDirection: 'column', gap: 4 } }, [
          ReactEl('label', { key: 'label', style: { fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' } }, 'Position'),
          ReactEl('select', {
            key: 'select',
            value: selectedPosition,
            onChange: (e) => setSelectedPosition(e.target.value),
            style: { padding: '6px 10px', borderRadius: 4, border: '1px solid var(--border-default)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }
          }, [
            ReactEl('option', { key: 'all', value: 'all' }, 'All Positions'),
            ReactEl('option', { key: 'BTN', value: 'BTN' }, 'Button'),
            ReactEl('option', { key: 'CO', value: 'CO' }, 'Cutoff'),
            ReactEl('option', { key: 'MP', value: 'MP' }, 'Middle'),
            ReactEl('option', { key: 'UTG', value: 'UTG' }, 'Early'),
            ReactEl('option', { key: 'SB', value: 'SB' }, 'Small Blind'),
            ReactEl('option', { key: 'BB', value: 'BB' }, 'Big Blind')
          ])
        ]),
        ReactEl('div', { key: 'action-filter', style: { display: 'flex', flexDirection: 'column', gap: 4 } }, [
          ReactEl('label', { key: 'label', style: { fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' } }, 'Action'),
          ReactEl('select', {
            key: 'select',
            value: selectedAction,
            onChange: (e) => setSelectedAction(e.target.value),
            style: { padding: '6px 10px', borderRadius: 4, border: '1px solid var(--border-default)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }
          }, [
            ReactEl('option', { key: 'all', value: 'all' }, 'All Actions'),
            ReactEl('option', { key: 'raise', value: 'raise' }, 'Raise/3-Bet'),
            ReactEl('option', { key: 'call', value: 'call' }, 'Call'),
            ReactEl('option', { key: 'fold', value: 'fold' }, 'Fold')
          ])
        ]),
        ReactEl('div', { key: 'metric-filter', style: { display: 'flex', flexDirection: 'column', gap: 4 } }, [
          ReactEl('label', { key: 'label', style: { fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' } }, 'Color By'),
          ReactEl('select', {
            key: 'select',
            value: colorMetric,
            onChange: (e) => setColorMetric(e.target.value),
            style: { padding: '6px 10px', borderRadius: 4, border: '1px solid var(--border-default)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }
          }, [
            ReactEl('option', { key: 'frequency', value: 'frequency' }, 'Frequency'),
            ReactEl('option', { key: 'profit', value: 'profit' }, 'Profitability'),
            ReactEl('option', { key: 'vpip', value: 'vpip' }, 'VPIP %')
          ])
        ])
      ]),
      
      // Loading state
      loading ? ReactEl('div', { key: 'loading', style: { padding: 40, textAlign: 'center', color: 'var(--text-muted)' } }, 'Loading hand ranges...') : null,
      
      // Grid
      !loading ? ReactEl('div', { 
        key: 'grid',
        style: { 
          display: 'grid',
          gridTemplateColumns: 'repeat(13, 1fr)',
          gap: 2,
          marginBottom: 16,
          maxWidth: 700
        }
      }, ranks.flatMap((rowRank, rowIndex) => 
        ranks.map((colRank, colIndex) => {
          const handName = getHandName(rowIndex, colIndex);
          const stats = getHandStats(handName);
          const bgColor = getHandColor(handName);
          const textColor = getTextColor(bgColor);
          const opacity = getHandOpacity(handName);
          const isHovered = hoveredHand === handName;
          
          return ReactEl('div', {
            key: handName,
            onMouseEnter: () => setHoveredHand(handName),
            onMouseLeave: () => setHoveredHand(null),
            style: {
              aspectRatio: '1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: bgColor,
              color: textColor,
              opacity: isHovered ? 1.0 : opacity,
              fontSize: 11,
              fontWeight: 600,
              borderRadius: 4,
              cursor: stats.hands > 0 ? 'pointer' : 'default',
              border: isHovered ? '2px solid var(--accent-primary)' : '1px solid var(--border-default)',
              transition: 'all 0.2s',
              transform: isHovered ? 'scale(1.15)' : 'scale(1)',
              zIndex: isHovered ? 10 : 1,
              position: 'relative'
            }
          }, handName);
        })
      )) : null,
      
      // Tooltip
      hoveredHand && !loading ? ReactEl('div', {
        key: 'tooltip',
        style: {
          padding: 12,
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border-default)',
          borderRadius: 6,
          fontSize: 12
        }
      }, [
        ReactEl('div', { key: 'hand', style: { fontWeight: 700, fontSize: 14, marginBottom: 8, color: 'var(--accent-primary)' } }, hoveredHand),
        ReactEl('div', { key: 'stats', style: { display: 'grid', gridTemplateColumns: '120px 1fr', gap: '4px 12px' } }, (() => {
          const stats = getHandStats(hoveredHand);
          return [
            ReactEl('span', { key: 'hands-label', style: { color: 'var(--text-secondary)' } }, 'Hands:'),
            ReactEl('span', { key: 'hands-value', style: { fontWeight: 600 } }, stats.hands.toLocaleString()),
            ReactEl('span', { key: 'freq-label', style: { color: 'var(--text-secondary)' } }, 'Frequency:'),
            ReactEl('span', { key: 'freq-value', style: { fontWeight: 600 } }, `${stats.frequency.toFixed(1)}%`),
            ReactEl('span', { key: 'profit-label', style: { color: 'var(--text-secondary)' } }, 'Win Rate:'),
            ReactEl('span', { key: 'profit-value', style: { fontWeight: 600, color: stats.profit >= 0 ? '#22c55e' : '#ef4444' } }, `${stats.profit >= 0 ? '+' : ''}${stats.profit.toFixed(1)} bb/100`),
            ReactEl('span', { key: 'vpip-label', style: { color: 'var(--text-secondary)' } }, 'VPIP:'),
            ReactEl('span', { key: 'vpip-value', style: { fontWeight: 600 } }, `${stats.vpip.toFixed(1)}%`),
            ReactEl('span', { key: 'pfr-label', style: { color: 'var(--text-secondary)' } }, 'PFR:'),
            ReactEl('span', { key: 'pfr-value', style: { fontWeight: 600 } }, `${stats.pfr.toFixed(1)}%`),
            ReactEl('span', { key: '3bet-label', style: { color: 'var(--text-secondary)' } }, '3-Bet:'),
            ReactEl('span', { key: '3bet-value', style: { fontWeight: 600 } }, `${stats.threeBet.toFixed(1)}%`)
          ];
        })())
      ]) : null,
      
      // Legend
      !loading ? ReactEl('div', {
        key: 'legend',
        style: { marginTop: 16, padding: 12, background: 'var(--bg-tertiary)', borderRadius: 6, border: '1px solid var(--border-default)' }
      }, [
        ReactEl('div', { key: 'title', style: { fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase' } }, 'Legend'),
        ReactEl('div', { key: 'items', style: { display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 12 } }, [
          ReactEl('div', { key: 'pairs', style: { display: 'flex', alignItems: 'center', gap: 6 } }, [
            ReactEl('div', { key: 'box', style: { width: 20, height: 20, background: 'var(--accent-primary)', borderRadius: 3 } }),
            ReactEl('span', { key: 'label' }, 'Diagonal = Pairs (AA, KK, ...)')
          ]),
          ReactEl('div', { key: 'suited', style: { display: 'flex', alignItems: 'center', gap: 6 } }, [
            ReactEl('div', { key: 'box', style: { width: 20, height: 20, background: 'var(--accent-secondary)', borderRadius: 3 } }),
            ReactEl('span', { key: 'label' }, 'Upper = Suited (AKs, AQs, ...)')
          ]),
          ReactEl('div', { key: 'offsuit', style: { display: 'flex', alignItems: 'center', gap: 6 } }, [
            ReactEl('div', { key: 'box', style: { width: 20, height: 20, background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', borderRadius: 3 } }),
            ReactEl('span', { key: 'label' }, 'Lower = Offsuit (AKo, AQo, ...)')
          ]),
          ReactEl('div', { key: 'gradient', style: { display: 'flex', alignItems: 'center', gap: 6 } }, [
            ReactEl('div', { key: 'gradient-box', style: { 
              width: 80, 
              height: 20, 
              background: colorMetric === 'profit' 
                ? 'linear-gradient(to right, rgb(185, 34, 34), rgb(34, 100, 34), rgb(34, 185, 34))' 
                : 'linear-gradient(to right, rgb(34, 100, 50), rgb(34, 160, 90), rgb(34, 220, 130))',
              borderRadius: 3 
            } }),
            ReactEl('span', { key: 'label' }, 
              colorMetric === 'profit' ? 'Loss → Profit' : 
              colorMetric === 'frequency' ? 'Rare → Frequent' : 
              'Low VPIP → High VPIP'
            )
          ])
        ])
      ]) : null
    ]);
  }

  // Full-Text Search Component
  function FullTextSearch() {
    const React = window.React;
    const ReactEl = React.createElement;
    
    const [searchQuery, setSearchQuery] = React.useState('');
    const [searchResults, setSearchResults] = React.useState([]);
    const [loading, setLoading] = React.useState(false);
    const [selectedHand, setSelectedHand] = React.useState(null);
    
    // Perform search
    const performSearch = React.useCallback(async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }
      
      setLoading(true);
      try {
        const results = await window.electronAPI.searchHandNotes(searchQuery);
        setSearchResults(results || []);
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      } finally {
        setLoading(false);
      }
    }, [searchQuery]);
    
    // Debounced search
    React.useEffect(() => {
      const timer = setTimeout(() => {
        performSearch();
      }, 300);
      
      return () => clearTimeout(timer);
    }, [searchQuery, performSearch]);
    
    // Load full hand details
    const loadHandDetails = React.useCallback(async (handId) => {
      try {
        const hand = await window.electronAPI.getHand(handId);
        setSelectedHand(hand);
      } catch (error) {
        console.error('Error loading hand:', error);
      }
    }, []);
    
    return ReactEl('div', { className: 'panel', style: { marginBottom: 20 } }, [
      // Header
      ReactEl('h3', { 
        key: 'title', 
        style: { margin: 0, marginBottom: 16, fontSize: 16, fontWeight: 600 } 
      }, 'Full-Text Search'),
      
      // Search Input
      ReactEl('div', { 
        key: 'search-box',
        style: { marginBottom: 16 }
      }, [
        ReactEl('input', {
          key: 'input',
          type: 'text',
          placeholder: 'Search hand notes and tags...',
          value: searchQuery,
          onChange: (e) => setSearchQuery(e.target.value),
          style: {
            width: '100%',
            padding: '10px 12px',
            fontSize: 14,
            border: '1px solid var(--border-default)',
            borderRadius: 6,
            background: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            outline: 'none',
            boxSizing: 'border-box'
          }
        }),
        searchQuery && ReactEl('div', {
          key: 'stats',
          style: {
            marginTop: 8,
            fontSize: 12,
            color: 'var(--text-secondary)'
          }
        }, `Found ${searchResults.length} ${searchResults.length === 1 ? 'hand' : 'hands'}`)
      ]),
      
      // Loading State
      loading && ReactEl('div', {
        key: 'loading',
        style: {
          padding: 40,
          textAlign: 'center',
          color: 'var(--text-muted)'
        }
      }, 'Searching...'),
      
      // Results List
      !loading && searchResults.length > 0 && ReactEl('div', {
        key: 'results',
        style: {
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          maxHeight: 600,
          overflowY: 'auto'
        }
      }, searchResults.map((result, index) => 
        ReactEl('div', {
          key: result.id || index,
          onClick: () => loadHandDetails(result.id),
          style: {
            padding: 12,
            background: selectedHand?.id === result.id ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
            border: '1px solid var(--border-default)',
            borderRadius: 6,
            cursor: 'pointer',
            transition: 'all 0.2s',
            ':hover': {
              background: 'var(--bg-tertiary)',
              borderColor: 'var(--accent-primary)'
            }
          },
          onMouseEnter: (e) => {
            e.currentTarget.style.background = 'var(--bg-tertiary)';
            e.currentTarget.style.borderColor = 'var(--accent-primary)';
          },
          onMouseLeave: (e) => {
            if (selectedHand?.id !== result.id) {
              e.currentTarget.style.background = 'var(--bg-secondary)';
              e.currentTarget.style.borderColor = 'var(--border-default)';
            }
          }
        }, [
          // Hand ID and Date
          ReactEl('div', {
            key: 'header',
            style: {
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 8,
              fontSize: 12,
              color: 'var(--text-secondary)'
            }
          }, [
            ReactEl('span', { key: 'id', style: { fontFamily: 'monospace' } }, result.id),
            ReactEl('span', { key: 'date' }, new Date(result.dateUTC).toLocaleString())
          ]),
          
          // Hand Info
          ReactEl('div', {
            key: 'info',
            style: {
              display: 'flex',
              gap: 16,
              marginBottom: 8,
              fontSize: 13
            }
          }, [
            ReactEl('span', { key: 'table', style: { color: 'var(--text-primary)' } }, `${result.tableName || 'Unknown'}`),
            ReactEl('span', { key: 'stakes', style: { color: 'var(--accent-primary)', fontWeight: 600 } }, 
              `$${result.sb || 0}/$${result.bb || 0}`
            ),
            result.heroNet != null && ReactEl('span', { 
              key: 'net',
              style: { 
                color: result.heroNet >= 0 ? '#059669' : '#dc2626',
                fontWeight: 600
              }
            }, `${result.heroNet >= 0 ? '+' : ''}$${result.heroNet.toFixed(2)}`)
          ]),
          
          // Notes
          result.notes && ReactEl('div', {
            key: 'notes',
            style: {
              padding: 8,
              background: 'var(--bg-primary)',
              borderRadius: 4,
              fontSize: 13,
              color: 'var(--text-primary)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word'
            }
          }, result.notes)
        ])
      )),
      
      // No Results
      !loading && searchQuery && searchResults.length === 0 && ReactEl('div', {
        key: 'no-results',
        style: {
          padding: 40,
          textAlign: 'center',
          color: 'var(--text-muted)'
        }
      }, 'No hands found matching your search'),
      
      // Empty State
      !loading && !searchQuery && ReactEl('div', {
        key: 'empty',
        style: {
          padding: 40,
          textAlign: 'center',
          color: 'var(--text-muted)'
        }
      }, 'Enter a search query to find hands by notes or tags'),
      
      // Selected Hand Details
      selectedHand && ReactEl('div', {
        key: 'hand-details',
        style: {
          marginTop: 20,
          padding: 16,
          background: 'var(--bg-secondary)',
          border: '2px solid var(--accent-primary)',
          borderRadius: 6
        }
      }, [
        ReactEl('div', {
          key: 'close-btn',
          onClick: () => setSelectedHand(null),
          style: {
            float: 'right',
            cursor: 'pointer',
            padding: '4px 12px',
            background: 'var(--bg-tertiary)',
            borderRadius: 4,
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--text-secondary)'
          }
        }, '✕ Close'),
        ReactEl('h4', {
          key: 'title',
          style: {
            margin: '0 0 12px 0',
            fontSize: 14,
            fontWeight: 600
          }
        }, 'Hand Details'),
        ReactEl('pre', {
          key: 'json',
          style: {
            padding: 12,
            background: 'var(--bg-primary)',
            borderRadius: 4,
            fontSize: 12,
            maxHeight: 400,
            overflow: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
          }
        }, JSON.stringify(selectedHand, null, 2))
      ])
    ]);
  }

  // Equity Calculator Component
  function EquityCalculator() {
    const React = window.React;
    const ReactEl = React.createElement;
    
    const [heroHand, setHeroHand] = React.useState('');
    const [villainRange, setVillainRange] = React.useState('');
    const [board, setBoard] = React.useState('');
    const [numVillains, setNumVillains] = React.useState(1);
    const [calculating, setCalculating] = React.useState(false);
    const [result, setResult] = React.useState(null);
    const [error, setError] = React.useState('');
    
    // Preset ranges
    const presetRanges = {
      'tight': 'AA,KK,QQ,JJ,TT,99,AKs,AKo',
      'medium': 'AA-77,AKs-ATs,KQs-KJs,QJs,AKo-AJo,KQo',
      'loose': 'AA-22,AKs-A2s,KQs-K9s,QJs-Q9s,JTs-J9s,T9s,98s,87s,AKo-A9o,KQo-KJo',
      'any_pair': '22+',
      'premium': 'AA,KK,QQ,AKs,AKo',
      'broadway': 'AA-TT,AKs-ATs,KQs-KTs,QJs-QTs,JTs,AKo-ATo,KQo-KJo,QJo',
      'suited_connectors': 'JTs,T9s,98s,87s,76s,65s,54s',
      'all_aces': 'AA-22,AKs-A2s,AKo-A2o'
    };
    
    const calculateEquity = async () => {
      setError('');
      setResult(null);
      
      // Validate inputs
      if (!heroHand.trim()) {
        setError('Please enter your hand (e.g., AhKs)');
        return;
      }
      
      if (!villainRange.trim()) {
        setError('Please enter villain range (e.g., AA,KK,QQ or AKs-ATs)');
        return;
      }
      
      setCalculating(true);
      
      try {
        // Call Monte Carlo equity calculator
        const response = await window.api.calculateEquity({
          heroHand: heroHand.trim(),
          villainRange: villainRange.trim(),
          board: board.trim(),
          numVillains: numVillains,
          iterations: 10000
        });
        
        if (!response.success) {
          setError(response.error || 'Calculation failed');
          setCalculating(false);
          return;
        }
        
        // Parse hero hand for display
        const heroCards = parseHand(heroHand);
        
        setResult({
          heroHand: heroCards ? formatCards(heroCards) : heroHand,
          villainRange,
          board: board || 'Preflop (no board)',
          equity: response.heroEquity,
          villainEquity: response.villainEquity,
          tie: response.tieEquity,
          handsInRange: response.handsInRange,
          numVillains,
          iterations: response.iterations
        });
        
      } catch (err) {
        setError(`Calculation error: ${err.message}`);
      } finally {
        setCalculating(false);
      }
    };
    
    // Parse hand string like "AhKs" or "Ah Ks" into array
    const parseHand = (handStr) => {
      const clean = handStr.replace(/\s+/g, '').toUpperCase();
      if (clean.length !== 4) return null;
      
      const card1 = clean.substring(0, 2);
      const card2 = clean.substring(2, 4);
      
      if (!isValidCard(card1) || !isValidCard(card2)) return null;
      
      return [card1, card2];
    };
    
    const isValidCard = (card) => {
      if (card.length !== 2) return false;
      const rank = card[0];
      const suit = card[1];
      return 'AKQJT98765432'.includes(rank) && 'SHDC'.includes(suit);
    };
    
    const formatCards = (cards) => {
      return cards.map(c => {
        const rank = c[0];
        const suit = c[1];
        const suitSymbol = { S: '♠', H: '♥', D: '♦', C: '♣' }[suit];
        return rank + suitSymbol;
      }).join(' ');
    };
    
    // Simplified equity estimation
    const estimateEquity = (heroCards, range, boardStr, villains) => {
      // This is a simplified estimation. A real implementation would use Monte Carlo simulation
      // or a proper poker equity calculator library
      
      // Parse hero hand strength
      const isPair = heroCards[0][0] === heroCards[1][0];
      const isSuited = heroCards[0][1] === heroCards[1][1];
      const ranks = 'AKQJT98765432';
      const rank1 = ranks.indexOf(heroCards[0][0]);
      const rank2 = ranks.indexOf(heroCards[1][0]);
      const highCard = Math.min(rank1, rank2);
      
      // Base equity (simplified)
      let baseEquity = 50;
      
      // Adjust for hand strength
      if (isPair) {
        baseEquity = 50 + (13 - highCard) * 2; // Pairs are stronger
      } else {
        baseEquity = 45 + (13 - highCard) * 1.5;
        if (isSuited) baseEquity += 3;
        if (Math.abs(rank1 - rank2) === 1) baseEquity += 2; // Connected
      }
      
      // Adjust for range tightness
      const rangeSize = estimateRangeSize(range);
      if (rangeSize < 50) baseEquity += 5;  // Tight range
      if (rangeSize > 200) baseEquity -= 5; // Wide range
      
      // Adjust for number of villains
      const equityAdjustment = (villains - 1) * 8;
      baseEquity -= equityAdjustment;
      
      // Clamp equity
      baseEquity = Math.max(10, Math.min(90, baseEquity));
      
      const tie = 2;
      const villainEquity = 100 - baseEquity - tie;
      
      return {
        hero: baseEquity.toFixed(1),
        villain: villainEquity.toFixed(1),
        tie: tie.toFixed(1),
        handsInRange: rangeSize
      };
    };
    
    const estimateRangeSize = (range) => {
      // Estimate number of hand combinations in range
      // This is simplified - real implementation would properly parse range notation
      const upperRange = range.toUpperCase();
      
      if (upperRange.includes('ANY') || upperRange.includes('ALL')) return 1326;
      if (upperRange.includes('22+')) return 78; // All pairs
      if (upperRange.length < 10) return 20; // Tight
      if (upperRange.length < 30) return 100; // Medium
      return 250; // Loose
    };
    
    return ReactEl('div', { className: 'panel', style: { marginBottom: 20 } }, [
      // Header
      ReactEl('h3', { 
        key: 'title', 
        style: { margin: 0, marginBottom: 16, fontSize: 16, fontWeight: 600 } 
      }, 'Equity Calculator'),
      
      ReactEl('div', {
        key: 'description',
        style: {
          marginBottom: 20,
          padding: 12,
          background: 'var(--bg-tertiary)',
          borderRadius: 6,
          fontSize: 13,
          color: 'var(--text-secondary)'
        }
      }, 'Calculate your hand equity against opponent ranges. Use standard poker notation (e.g., AhKs for Ace of hearts, King of spades).'),
      
      // Input Section
      ReactEl('div', {
        key: 'inputs',
        style: {
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
          marginBottom: 20
        }
      }, [
        // Hero Hand
        ReactEl('div', { key: 'hero' }, [
          ReactEl('label', {
            key: 'label',
            style: {
              display: 'block',
              marginBottom: 6,
              fontWeight: 600,
              fontSize: 13
            }
          }, 'Your Hand'),
          ReactEl('input', {
            key: 'input',
            type: 'text',
            placeholder: 'e.g., AhKs or Ah Ks',
            value: heroHand,
            onChange: (e) => setHeroHand(e.target.value),
            style: {
              width: '100%',
              padding: '8px 12px',
              fontSize: 14,
              border: '1px solid var(--border-default)',
              borderRadius: 6,
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              boxSizing: 'border-box'
            }
          }),
          ReactEl('div', {
            key: 'hint',
            style: {
              marginTop: 4,
              fontSize: 11,
              color: 'var(--text-muted)'
            }
          }, 'Format: Rank + Suit (s=♠ h=♥ d=♦ c=♣)')
        ]),
        
        // Number of Villains
        ReactEl('div', { key: 'villains' }, [
          ReactEl('label', {
            key: 'label',
            style: {
              display: 'block',
              marginBottom: 6,
              fontWeight: 600,
              fontSize: 13
            }
          }, 'Number of Opponents'),
          ReactEl('select', {
            key: 'select',
            value: numVillains,
            onChange: (e) => setNumVillains(parseInt(e.target.value)),
            style: {
              width: '100%',
              padding: '8px 12px',
              fontSize: 14,
              border: '1px solid var(--border-default)',
              borderRadius: 6,
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              boxSizing: 'border-box'
            }
          }, [1, 2, 3, 4, 5].map(n =>
            ReactEl('option', { key: n, value: n }, `${n} opponent${n > 1 ? 's' : ''}`)
          ))
        ])
      ]),
      
      // Villain Range
      ReactEl('div', {
        key: 'range',
        style: { marginBottom: 16 }
      }, [
        ReactEl('label', {
          key: 'label',
          style: {
            display: 'block',
            marginBottom: 6,
            fontWeight: 600,
            fontSize: 13
          }
        }, 'Opponent Range'),
        ReactEl('textarea', {
          key: 'textarea',
          placeholder: 'e.g., AA,KK,QQ,JJ,AKs or use a preset below',
          value: villainRange,
          onChange: (e) => setVillainRange(e.target.value),
          rows: 2,
          style: {
            width: '100%',
            padding: '8px 12px',
            fontSize: 14,
            border: '1px solid var(--border-default)',
            borderRadius: 6,
            background: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            resize: 'vertical',
            fontFamily: 'monospace',
            boxSizing: 'border-box'
          }
        }),
        // Preset buttons
        ReactEl('div', {
          key: 'presets',
          style: {
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
            marginTop: 8
          }
        }, Object.entries(presetRanges).map(([name, range]) =>
          ReactEl('button', {
            key: name,
            onClick: () => setVillainRange(range),
            style: {
              padding: '4px 10px',
              fontSize: 11,
              borderRadius: 4,
              border: '1px solid var(--border-default)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              textTransform: 'capitalize'
            }
          }, name.replace('_', ' '))
        ))
      ]),
      
      // Board (Optional)
      ReactEl('div', {
        key: 'board-input',
        style: { marginBottom: 20 }
      }, [
        ReactEl('label', {
          key: 'label',
          style: {
            display: 'block',
            marginBottom: 6,
            fontWeight: 600,
            fontSize: 13
          }
        }, 'Board (Optional)'),
        ReactEl('input', {
          key: 'input',
          type: 'text',
          placeholder: 'e.g., Ah Kh Qh (leave empty for preflop)',
          value: board,
          onChange: (e) => setBoard(e.target.value),
          style: {
            width: '100%',
            padding: '8px 12px',
            fontSize: 14,
            border: '1px solid var(--border-default)',
            borderRadius: 6,
            background: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            boxSizing: 'border-box'
          }
        })
      ]),
      
      // Calculate Button
      ReactEl('button', {
        key: 'calculate-btn',
        onClick: calculateEquity,
        disabled: calculating,
        style: {
          width: '100%',
          padding: '12px',
          fontSize: 14,
          fontWeight: 600,
          border: 'none',
          borderRadius: 6,
          background: calculating ? '#666' : 'var(--accent-primary)',
          color: '#fff',
          cursor: calculating ? 'not-allowed' : 'pointer',
          marginBottom: 20
        }
      }, calculating ? 'Calculating...' : 'Calculate Equity'),
      
      // Error Message
      error && ReactEl('div', {
        key: 'error',
        style: {
          padding: 12,
          marginBottom: 16,
          background: '#dc262620',
          border: '1px solid #dc2626',
          borderRadius: 6,
          color: '#dc2626',
          fontSize: 13
        }
      }, error),
      
      // Results
      result && ReactEl('div', {
        key: 'results',
        style: {
          padding: 20,
          background: 'var(--bg-secondary)',
          border: '2px solid var(--accent-primary)',
          borderRadius: 8
        }
      }, [
        ReactEl('h4', {
          key: 'title',
          style: {
            margin: '0 0 16px 0',
            fontSize: 15,
            fontWeight: 600
          }
        }, 'Equity Results'),
        
        // Hero Hand vs Range
        ReactEl('div', {
          key: 'matchup',
          style: {
            marginBottom: 20,
            padding: 12,
            background: 'var(--bg-tertiary)',
            borderRadius: 6,
            fontSize: 14
          }
        }, [
          ReactEl('div', { key: 'hero', style: { marginBottom: 6 } },
            ReactEl('strong', null, 'Your Hand: '),
            ReactEl('span', { style: { fontSize: 16, color: 'var(--accent-primary)' } }, result.heroHand)
          ),
          ReactEl('div', { key: 'vs', style: { marginBottom: 6 } },
            ReactEl('strong', null, 'vs '),
            ReactEl('span', null, `${result.numVillains} opponent${result.numVillains > 1 ? 's' : ''} with range: `),
            ReactEl('code', { style: { color: 'var(--text-secondary)', fontSize: 12 } }, result.villainRange)
          ),
          ReactEl('div', { key: 'board', style: { fontSize: 12, color: 'var(--text-muted)' } },
            ReactEl('strong', null, 'Board: '),
            result.board
          ),
          ReactEl('div', { key: 'combos', style: { fontSize: 12, color: 'var(--text-muted)', marginTop: 6 } },
            `~${result.handsInRange} hand combinations in range • ${result.iterations || 10000} iterations`
          )
        ]),
        
        // Equity Breakdown
        ReactEl('div', {
          key: 'equity',
          style: {
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 12,
            marginBottom: 16
          }
        }, [
          ReactEl('div', {
            key: 'hero',
            style: {
              padding: 16,
              background: 'var(--bg-primary)',
              borderRadius: 6,
              textAlign: 'center'
            }
          }, [
            ReactEl('div', {
              key: 'value',
              style: {
                fontSize: 28,
                fontWeight: 'bold',
                color: '#059669',
                marginBottom: 6
              }
            }, `${result.equity}%`),
            ReactEl('div', {
              key: 'label',
              style: {
                fontSize: 12,
                color: 'var(--text-secondary)',
                textTransform: 'uppercase'
              }
            }, 'Your Equity')
          ]),
          
          ReactEl('div', {
            key: 'villain',
            style: {
              padding: 16,
              background: 'var(--bg-primary)',
              borderRadius: 6,
              textAlign: 'center'
            }
          }, [
            ReactEl('div', {
              key: 'value',
              style: {
                fontSize: 28,
                fontWeight: 'bold',
                color: '#dc2626',
                marginBottom: 6
              }
            }, `${result.villainEquity}%`),
            ReactEl('div', {
              key: 'label',
              style: {
                fontSize: 12,
                color: 'var(--text-secondary)',
                textTransform: 'uppercase'
              }
            }, 'Opponent Equity')
          ]),
          
          ReactEl('div', {
            key: 'tie',
            style: {
              padding: 16,
              background: 'var(--bg-primary)',
              borderRadius: 6,
              textAlign: 'center'
            }
          }, [
            ReactEl('div', {
              key: 'value',
              style: {
                fontSize: 28,
                fontWeight: 'bold',
                color: '#888',
                marginBottom: 6
              }
            }, `${result.tie}%`),
            ReactEl('div', {
              key: 'label',
              style: {
                fontSize: 12,
                color: 'var(--text-secondary)',
                textTransform: 'uppercase'
              }
            }, 'Tie')
          ])
        ]),
        
        // Visual Equity Bar
        ReactEl('div', {
          key: 'bar',
          style: {
            height: 40,
            borderRadius: 6,
            overflow: 'hidden',
            display: 'flex',
            marginBottom: 12
          }
        }, [
          ReactEl('div', {
            key: 'hero',
            style: {
              width: `${result.equity}%`,
              background: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600
            }
          }, result.equity > 15 ? `${result.equity}%` : ''),
          
          ReactEl('div', {
            key: 'tie',
            style: {
              width: `${result.tie}%`,
              background: '#666'
            }
          }),
          
          ReactEl('div', {
            key: 'villain',
            style: {
              width: `${result.villainEquity}%`,
              background: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600
            }
          }, result.villainEquity > 15 ? `${result.villainEquity}%` : '')
        ]),
        
        // Recommendation
        ReactEl('div', {
          key: 'recommendation',
          style: {
            padding: 12,
            background: 'var(--bg-tertiary)',
            borderRadius: 6,
            fontSize: 13,
            color: 'var(--text-secondary)'
          }
        }, [
          ReactEl('strong', { key: 'label' }, '💡 Analysis: '),
          parseFloat(result.equity) > 55 ? 'Strong equity - favorable to continue' :
          parseFloat(result.equity) > 45 ? 'Close equity - consider pot odds and position' :
          'Weak equity - likely unprofitable without significant fold equity'
        ])
      ]),
      
      // Note about simplified calculation
      ReactEl('div', {
        key: 'disclaimer',
        style: {
          marginTop: 20,
          padding: 12,
          background: 'var(--bg-tertiary)',
          borderRadius: 6,
          fontSize: 11,
          color: 'var(--text-muted)',
          borderLeft: '3px solid var(--border-default)'
        }
      }, '⚠️ Note: This is a simplified equity estimator for quick reference. For precise calculations against specific ranges, use dedicated equity calculator software.')
    ]);
  }

  // HUD Control Panel - Phase 1
  function HUDControlPanel() {
    const React = window.React;
    const ReactEl = React.createElement;
    const [hudActive, setHudActive] = React.useState(false);
    const [hudStatus, setHudStatus] = React.useState(null);
    const [loading, setLoading] = React.useState(false);

    // Check HUD status on mount
    React.useEffect(() => {
      checkStatus();
    }, []);

    const checkStatus = async () => {
      try {
        const status = await window.hud.v3Status();
        if (status.success) {
          setHudActive(status.active);
          setHudStatus(status);
        }
      } catch (error) {
        console.error('Failed to check HUD status:', error);
      }
    };

    const handleStartHUD = async () => {
      setLoading(true);
      try {
        const result = await window.hud.v3Start();
        if (result.success) {
          setHudActive(true);
          if (window.__toast) window.__toast('🎯 HUD started successfully!', 'success', 3000);
          checkStatus();
        } else {
          if (window.__toast) window.__toast(`HUD start failed: ${result.error}`, 'error', 3000);
        }
      } catch (error) {
        console.error('HUD start error:', error);
        if (window.__toast) window.__toast('HUD start error', 'error', 3000);
      } finally {
        setLoading(false);
      }
    };

    const handleStopHUD = async () => {
      setLoading(true);
      try {
        const result = await window.hud.v3Stop();
        if (result.success) {
          setHudActive(false);
          if (window.__toast) window.__toast('⏹️ HUD stopped', 'info', 2000);
          checkStatus();
        } else {
          if (window.__toast) window.__toast(`HUD stop failed: ${result.error}`, 'error', 3000);
        }
      } catch (error) {
        console.error('HUD stop error:', error);
        if (window.__toast) window.__toast('HUD stop error', 'error', 3000);
      } finally {
        setLoading(false);
      }
    };

    return Panel({
      title: '🎯 HUD Control - Phase 1',
      children: ReactEl('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } }, [
        // Status indicator
        ReactEl('div', {
          key: 'status',
          style: {
            padding: 12,
            background: hudActive ? 'rgba(34, 197, 94, 0.1)' : 'rgba(156, 163, 175, 0.1)',
            border: `2px solid ${hudActive ? '#22c55e' : '#9ca3af'}`,
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 10
          }
        }, [
          ReactEl('div', {
            key: 'indicator',
            style: {
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: hudActive ? '#22c55e' : '#9ca3af',
              boxShadow: hudActive ? '0 0 8px rgba(34, 197, 94, 0.5)' : 'none'
            }
          }),
          ReactEl('span', {
            key: 'text',
            style: { fontWeight: 600, color: 'var(--text-primary)' }
          }, hudActive ? 'HUD Active' : 'HUD Inactive'),
          hudStatus && hudStatus.windows ? ReactEl('span', {
            key: 'windows',
            style: { fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }
          }, `${hudStatus.windows.length} window(s)`) : null
        ]),

        // Control buttons
        ReactEl('div', {
          key: 'controls',
          style: { display: 'flex', gap: 8 }
        }, [
          ReactEl('button', {
            key: 'start',
            type: 'button',
            onClick: handleStartHUD,
            disabled: loading || hudActive,
            style: {
              flex: 1,
              padding: '10px 16px',
              background: hudActive ? '#4b5563' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              fontWeight: 600,
              cursor: loading || hudActive ? 'not-allowed' : 'pointer',
              opacity: loading || hudActive ? 0.6 : 1
            }
          }, loading ? '⏳ Starting...' : '▶️ Start HUD'),

          ReactEl('button', {
            key: 'stop',
            type: 'button',
            onClick: handleStopHUD,
            disabled: loading || !hudActive,
            style: {
              flex: 1,
              padding: '10px 16px',
              background: !hudActive ? '#4b5563' : '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              fontWeight: 600,
              cursor: loading || !hudActive ? 'not-allowed' : 'pointer',
              opacity: loading || !hudActive ? 0.6 : 1
            }
          }, loading ? '⏳ Stopping...' : '⏹️ Stop HUD')
        ]),

        // Info section
        ReactEl('div', {
          key: 'info',
          style: {
            padding: 10,
            background: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: 6,
            fontSize: 12,
            color: 'var(--text-secondary)',
            lineHeight: 1.5
          }
        }, [
          ReactEl('div', { key: 'title', style: { fontWeight: 600, marginBottom: 6, color: '#3b82f6' } }, 'Phase 1 Features:'),
          ReactEl('div', { key: 'f1' }, '• Draggable player stat bubbles'),
          ReactEl('div', { key: 'f2' }, '• Real-time stat updates (5s refresh)'),
          ReactEl('div', { key: 'f3' }, '• Customizable displayed stats'),
          ReactEl('div', { key: 'f4' }, '• Layout grid helper'),
          ReactEl('div', { key: 'f5' }, '• Position memory per table'),
          ReactEl('div', { key: 'usage', style: { marginTop: 8, fontStyle: 'italic' } }, 
            '💡 Drag the HUD window over your poker table and position player bubbles as needed.'
          )
        ])
      ])
    });
  }

  // Dashboard Widgets System
  function DashboardWidgets({ summary, heroStats }) {
    const React = window.React;
    const ReactEl = React.createElement;
    const [widgets, setWidgets] = React.useState([]);
    const [isCustomizing, setIsCustomizing] = React.useState(false);
    const [draggedIndex, setDraggedIndex] = React.useState(null);
    
    // Available widget definitions
    const availableWidgets = React.useMemo(() => [
      {
        id: 'net_usd',
        label: 'Net USD',
        getValue: () => formatUSD(summary?.netUSD || 0),
        getHint: () => `Net BB: ${formatNumber(summary?.netBB || 0, 2)}`,
        color: (summary?.netUSD || 0) >= 0 ? '#059669' : '#dc2626'
      },
      {
        id: 'bb_100',
        label: 'bb/100',
        getValue: () => formatNumber(summary?.bbPer100 || 0, 2),
        getHint: () => `Win Rate`,
        color: (summary?.bbPer100 || 0) >= 0 ? '#059669' : '#dc2626'
      },
      {
        id: 'rake',
        label: 'Rake',
        getValue: () => formatUSD(summary?.rakeUSD || 0),
        getHint: () => `Jackpot: ${formatUSD(summary?.jackpotUSD || 0)}`,
        color: '#ef4444'
      },
      {
        id: 'pre_rake',
        label: 'Pre-Rake',
        getValue: () => formatUSD(summary?.preRakeUSD || 0),
        getHint: () => `${formatNumber(summary?.preRakeBBPer100 || 0, 2)} bb/100`,
        color: '#92400e'
      },
      {
        id: 'vpip',
        label: 'VPIP',
        getValue: () => heroStats?.overall?.VPIP_pct ? `${formatNumber(heroStats.overall.VPIP_pct, 1)}%` : 'N/A',
        getHint: () => heroStats?.overall?.hands ? `${heroStats.overall.hands} hands` : '',
        color: '#3b82f6'
      },
      {
        id: 'pfr',
        label: 'PFR',
        getValue: () => heroStats?.overall?.PFR_pct ? `${formatNumber(heroStats.overall.PFR_pct, 1)}%` : 'N/A',
        getHint: () => heroStats?.overall?.hands ? `${heroStats.overall.hands} hands` : '',
        color: '#8b5cf6'
      },
      {
        id: 'aggression',
        label: 'Aggression',
        getValue: () => heroStats?.overall?.aggression ? formatNumber(heroStats.overall.aggression, 2) : 'N/A',
        getHint: () => 'AF Ratio',
        color: '#f59e0b'
      },
      {
        id: 'three_bet',
        label: '3-Bet',
        getValue: () => heroStats?.overall?.threeBet_pct ? `${formatNumber(heroStats.overall.threeBet_pct, 1)}%` : 'N/A',
        getHint: () => heroStats?.overall?.threeBetOpp ? `${heroStats.overall.threeBetOpp} opp` : '',
        color: '#ec4899'
      },
      {
        id: 'wtsd',
        label: 'WTSD',
        getValue: () => heroStats?.overall?.WTSD_pct ? `${formatNumber(heroStats.overall.WTSD_pct, 1)}%` : 'N/A',
        getHint: () => 'Went to Showdown',
        color: '#06b6d4'
      },
      {
        id: 'won_sd',
        label: 'Won@SD',
        getValue: () => heroStats?.overall?.WonAtSD_pct ? `${formatNumber(heroStats.overall.WonAtSD_pct, 1)}%` : 'N/A',
        getHint: () => 'Won at Showdown',
        color: '#10b981'
      },
      {
        id: 'cbet',
        label: 'C-Bet',
        getValue: () => heroStats?.overall?.cbet_pct ? `${formatNumber(heroStats.overall.cbet_pct, 1)}%` : 'N/A',
        getHint: () => heroStats?.overall?.cbetOpp ? `${heroStats.overall.cbetOpp} opp` : '',
        color: '#14b8a6'
      },
      {
        id: 'fold_to_cbet',
        label: 'Fold to C-Bet',
        getValue: () => heroStats?.overall?.foldToCbet_pct ? `${formatNumber(heroStats.overall.foldToCbet_pct, 1)}%` : 'N/A',
        getHint: () => heroStats?.overall?.foldToCbetOpp ? `${heroStats.overall.foldToCbetOpp} opp` : '',
        color: '#6366f1'
      },
    ], [summary, heroStats]);
    
    // Load widget config from server on mount
    React.useEffect(() => {
      if (!window.api?.widgetsGetConfig) return;
      
      window.api.widgetsGetConfig().then((result) => {
        if (result.success && result.config && Array.isArray(result.config.widgets)) {
          // Validate widgets still exist
          const validWidgets = result.config.widgets.filter(w => 
            availableWidgets.some(aw => aw.id === w.id)
          );
          setWidgets(validWidgets);
        } else {
          // Default widgets
          setWidgets([
            { id: 'net_usd', visible: true },
            { id: 'bb_100', visible: true },
            { id: 'rake', visible: true },
            { id: 'pre_rake', visible: true },
          ]);
        }
      }).catch(err => {
        console.error('Failed to load widget config:', err);
        // Use defaults
        setWidgets([
          { id: 'net_usd', visible: true },
          { id: 'bb_100', visible: true },
          { id: 'rake', visible: true },
          { id: 'pre_rake', visible: true },
        ]);
      });
    }, [availableWidgets]);
    
    // Save config to server
    const saveConfig = React.useCallback((newWidgets) => {
      if (!window.api?.widgetsSaveConfig) return;
      
      window.api.widgetsSaveConfig({ widgets: newWidgets }).catch(err => {
        console.error('Failed to save widget config:', err);
      });
    }, []);
    
    // Toggle widget visibility
    const toggleWidget = React.useCallback((widgetId) => {
      setWidgets(prev => {
        const exists = prev.find(w => w.id === widgetId);
        let newWidgets;
        let action = '';
        
        if (exists) {
          // Toggle visibility or remove if hidden
          if (exists.visible) {
            newWidgets = prev.map(w => w.id === widgetId ? { ...w, visible: false } : w);
            action = 'hidden';
          } else {
            newWidgets = prev.map(w => w.id === widgetId ? { ...w, visible: true } : w);
            action = 'shown';
          }
        } else {
          // Add new widget
          newWidgets = [...prev, { id: widgetId, visible: true }];
          action = 'added';
        }
        
        // Show toast notification
        const widgetName = widgetId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        if (action === 'hidden') {
          window.__toast?.(`Widget hidden`, 'info', 1500);
        } else if (action === 'shown' || action === 'added') {
          window.__toast?.(`✓ Widget ${action}`, 'success', 1500);
        }
        
        saveConfig(newWidgets);
        return newWidgets;
      });
    }, [saveConfig]);
    
    // Drag handlers
    const handleDragStart = React.useCallback((e, index) => {
      setDraggedIndex(index);
      e.dataTransfer.effectAllowed = 'move';
    }, []);
    
    const handleDragOver = React.useCallback((e, index) => {
      e.preventDefault();
      if (draggedIndex === null || draggedIndex === index) return;
      
      setWidgets(prev => {
        const newWidgets = [...prev];
        const draggedItem = newWidgets[draggedIndex];
        newWidgets.splice(draggedIndex, 1);
        newWidgets.splice(index, 0, draggedItem);
        return newWidgets;
      });
      setDraggedIndex(index);
    }, [draggedIndex]);
    
    const handleDragEnd = React.useCallback(() => {
      setDraggedIndex(null);
      // Save final order
      setWidgets(prev => {
        saveConfig(prev);
        window.__toast?.('Widget order saved', 'success', 1500);
        return prev;
      });
    }, [saveConfig]);
    
    // Render visible widgets
    const visibleWidgets = React.useMemo(() => {
      return widgets
        .filter(w => w.visible)
        .map(w => availableWidgets.find(aw => aw.id === w.id))
        .filter(Boolean);
    }, [widgets, availableWidgets]);
    
    return ReactEl('div', { style: { marginBottom: 12 } }, [
      // Customize button
      ReactEl('div', { 
        key: 'header',
        style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }
      }, [
        ReactEl('div', { 
          key: 'label',
          className: 'muted',
          style: { fontSize: 11, textTransform: 'uppercase', fontWeight: 600 }
        }, 'Quick Stats'),
        ReactEl('button', {
          key: 'customize',
          type: 'button',
          onClick: () => setIsCustomizing(!isCustomizing),
          style: {
            padding: '4px 8px',
            fontSize: 11,
            borderRadius: 4,
            border: '1px solid var(--border-color, #d1d5db)',
            background: isCustomizing ? 'var(--bg-secondary, #f3f4f6)' : 'transparent',
            cursor: 'pointer',
            color: 'var(--text-primary)',
          }
        }, isCustomizing ? '✓ Done' : '⚙️ Customize')
      ]),
      
      // Customization panel
      isCustomizing ? ReactEl('div', {
        key: 'customize-panel',
        style: {
          padding: 12,
          background: 'var(--bg-secondary, #f9fafb)',
          borderRadius: 8,
          marginBottom: 8,
          border: '1px solid var(--border-color, #e5e7eb)'
        }
      }, [
        ReactEl('div', { 
          key: 'title',
          style: { fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }
        }, 'Select widgets to display:'),
        ReactEl('div', {
          key: 'widgets',
          style: { display: 'flex', flexWrap: 'wrap', gap: 6 }
        }, availableWidgets.map(widget => {
          const isActive = widgets.find(w => w.id === widget.id && w.visible);
          return ReactEl('button', {
            key: widget.id,
            type: 'button',
            onClick: () => toggleWidget(widget.id),
            style: {
              padding: '6px 10px',
              fontSize: 11,
              borderRadius: 6,
              border: `1px solid ${isActive ? widget.color : 'var(--border-color, #d1d5db)'}`,
              background: isActive ? widget.color : 'transparent',
              color: isActive ? '#ffffff' : 'var(--text-primary)',
              cursor: 'pointer',
              fontWeight: isActive ? 600 : 400,
              transition: 'all 0.2s'
            }
          }, widget.label);
        })),
        ReactEl('div', {
          key: 'hint',
          className: 'muted',
          style: { fontSize: 10, marginTop: 8 }
        }, '💡 Drag widgets below to reorder them')
      ]) : null,
      
      // Widget grid
      ReactEl('div', {
        key: 'grid',
        style: {
          display: 'grid',
          gap: 8,
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))'
        }
      }, visibleWidgets.map((widget, index) => {
        const isBeingDragged = draggedIndex === index;
        
        return ReactEl('div', {
          key: widget.id,
          draggable: isCustomizing,
          onDragStart: (e) => isCustomizing && handleDragStart(e, index),
          onDragOver: (e) => isCustomizing && handleDragOver(e, index),
          onDragEnd: handleDragEnd,
          style: {
            padding: '10px 12px',
            background: isBeingDragged ? 'var(--bg-secondary, #f3f4f6)' : 'rgba(15,23,42,0.08)',
            borderRadius: 8,
            cursor: isCustomizing ? 'grab' : 'default',
            opacity: isBeingDragged ? 0.5 : 1,
            border: isCustomizing ? '2px dashed var(--border-color, #d1d5db)' : 'none',
            transition: 'all 0.2s'
          }
        }, [
          ReactEl('div', {
            key: 'label',
            className: 'muted',
            style: { fontSize: 11, textTransform: 'uppercase', marginBottom: 4 }
          }, widget.label),
          ReactEl('div', {
            key: 'value',
            style: {
              fontWeight: 600,
              fontSize: 18,
              color: widget.color,
              marginBottom: 2
            }
          }, widget.getValue()),
          widget.getHint() ? ReactEl('div', {
            key: 'hint',
            className: 'muted',
            style: { fontSize: 10 }
          }, widget.getHint()) : null
        ].filter(Boolean));
      }))
    ]);
  }


  function Dashboard({ globalFilters, setGlobalFilters }) {
    const React = window.React;
    const bump = useDataUpdatedBump();
    const ReactEl = React.createElement;
    const DEFAULT_GRAPH_LIMIT = 10000;
    
    // Merge global filters with Dashboard-specific filters (limit, order, etc.)
    const [graphFilters, setGraphFilters] = React.useState({
      limit: DEFAULT_GRAPH_LIMIT,
      stake: 'all',
      position: 'all',
      showdown: 'all',
      result: 'all',
      order: 'oldest',
      from: '',
      to: '',
      // Advanced filters
      handRange: 'all',
      stackDepth: 'all',
      actionType: 'all',
      potSize: 'all',
      minBetSize: '',
      maxBetSize: '',
    });
    const [graphCurrency, setGraphCurrency] = React.useState('usd');
    const [graphView, setGraphView] = React.useState('hands');
    const [visibleCount, setVisibleCount] = React.useState(null);
    
    // Persistent graph data cache (survives tab switches AND program restarts)
    const [graphData, setGraphData] = React.useState(() => {
      try {
        const cached = localStorage.getItem('graphData');
        return cached ? JSON.parse(cached) : null;
      } catch (e) {
        return null;
      }
    });
    
    const [heroName, setHeroName] = React.useState(null);
    
    // Persistent hero stats cache (survives tab switches AND program restarts)
    const [heroStatsCache, setHeroStatsCache] = React.useState(() => {
      try {
        const cached = localStorage.getItem('heroStatsCache');
        return cached ? JSON.parse(cached) : null;
      } catch (e) {
        return null;
      }
    });
    
    const [heroCollapsed, setHeroCollapsed] = React.useState({});
    const [compareSnapshot, setCompareSnapshot] = React.useState(null);
    const canvasRef = React.useRef(null);
    const chartRef = React.useRef(null);
    const positionalCanvasRef = React.useRef(null);
    const positionalChartRef = React.useRef(null);
    const vsHeroCanvasRef = React.useRef(null);
    const vsHeroChartRef = React.useRef(null);
    const lastTimelineLength = React.useRef(0);

    // Force clear date filters on mount to prevent stuck cached dates
    React.useEffect(() => {
      setGraphFilters(prev => ({
        ...prev,
        from: '',
        to: ''
      }));
    }, []); // Run once on mount

    // Sync global filters to graphFilters when they change from other tabs
    React.useEffect(() => {
      if (!globalFilters) return;
      setGraphFilters(prev => {
        // Only update if values actually changed
        const needsUpdate = (
          prev.stake !== (globalFilters.stake || 'all') ||
          prev.position !== (globalFilters.position || 'all') ||
          prev.showdown !== (globalFilters.showdown || 'all') ||
          prev.result !== (globalFilters.result || 'all') ||
          prev.from !== (globalFilters.from || '') ||
          prev.to !== (globalFilters.to || '') ||
          prev.handRange !== (globalFilters.handRange || 'all') ||
          prev.stackDepth !== (globalFilters.stackDepth || 'all') ||
          prev.actionType !== (globalFilters.actionType || 'all') ||
          prev.potSize !== (globalFilters.potSize || 'all') ||
          prev.minBetSize !== (globalFilters.minBetSize || '') ||
          prev.maxBetSize !== (globalFilters.maxBetSize || '')
        );
        
        if (!needsUpdate) return prev;
        
        return {
          ...prev,
          stake: globalFilters.stake || 'all',
          position: globalFilters.position || 'all',
          showdown: globalFilters.showdown || 'all',
          result: globalFilters.result || 'all',
          from: globalFilters.from || '',
          to: globalFilters.to || '',
          handRange: globalFilters.handRange || 'all',
          stackDepth: globalFilters.stackDepth || 'all',
          actionType: globalFilters.actionType || 'all',
          potSize: globalFilters.potSize || 'all',
          minBetSize: globalFilters.minBetSize || '',
          maxBetSize: globalFilters.maxBetSize || '',
        };
      });
    }, [globalFilters]);

    // Update global filters when graphFilters change (excluding Dashboard-specific ones)
    React.useEffect(() => {
      if (!setGlobalFilters) return;
      setGlobalFilters(prev => {
        // Only update if values actually changed
        const needsUpdate = (
          prev.stake !== graphFilters.stake ||
          prev.position !== graphFilters.position ||
          prev.showdown !== graphFilters.showdown ||
          prev.result !== graphFilters.result ||
          prev.from !== graphFilters.from ||
          prev.to !== graphFilters.to ||
          prev.handRange !== graphFilters.handRange ||
          prev.stackDepth !== graphFilters.stackDepth ||
          prev.actionType !== graphFilters.actionType ||
          prev.potSize !== graphFilters.potSize ||
          prev.minBetSize !== graphFilters.minBetSize ||
          prev.maxBetSize !== graphFilters.maxBetSize
        );
        
        if (!needsUpdate) return prev;
        
        return {
          ...prev,
          stake: graphFilters.stake,
          position: graphFilters.position,
          showdown: graphFilters.showdown,
          result: graphFilters.result,
          from: graphFilters.from,
          to: graphFilters.to,
          handRange: graphFilters.handRange,
          stackDepth: graphFilters.stackDepth,
          actionType: graphFilters.actionType,
          potSize: graphFilters.potSize,
          minBetSize: graphFilters.minBetSize,
          maxBetSize: graphFilters.maxBetSize,
        };
      });
    }, [graphFilters.stake, graphFilters.position, graphFilters.showdown, graphFilters.result, graphFilters.from, graphFilters.to, graphFilters.handRange, graphFilters.stackDepth, graphFilters.actionType, graphFilters.potSize, graphFilters.minBetSize, graphFilters.maxBetSize, setGlobalFilters]);

    // Save graphData to localStorage whenever it updates
    React.useEffect(() => {
      if (graphData) {
        try {
          localStorage.setItem('graphData', JSON.stringify(graphData));
        } catch (e) {
          // Ignore localStorage errors
        }
      }
    }, [graphData]);
    
    // Save heroStatsCache to localStorage whenever it updates
    React.useEffect(() => {
      if (heroStatsCache) {
        try {
          localStorage.setItem('heroStatsCache', JSON.stringify(heroStatsCache));
        } catch (e) {
          // Ignore localStorage errors
        }
      }
    }, [heroStatsCache]);

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

    // Track last graph request to avoid refetching
    const lastGraphRequest = React.useRef(null);
    const lastGraphBump = React.useRef(bump);
    
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
      // Advanced filters
      if (graphFilters.handRange && graphFilters.handRange !== 'all') payload.handRange = graphFilters.handRange;
      if (graphFilters.stackDepth && graphFilters.stackDepth !== 'all') payload.stackDepth = graphFilters.stackDepth;
      if (graphFilters.actionType && graphFilters.actionType !== 'all') payload.actionType = graphFilters.actionType;
      if (graphFilters.potSize && graphFilters.potSize !== 'all') payload.potSize = graphFilters.potSize;
      if (graphFilters.minBetSize) payload.minBetSize = graphFilters.minBetSize;
      if (graphFilters.maxBetSize) payload.maxBetSize = graphFilters.maxBetSize;
      return payload;
    }, [graphFilters]);
    
    // Only fetch graph data if filters changed, bump changed, or no cache exists
    const shouldFetchGraph = React.useMemo(() => {
      const requestChanged = JSON.stringify(lastGraphRequest.current) !== JSON.stringify(request);
      const bumpChanged = lastGraphBump.current !== bump;
      const hasNoCache = !graphData;
      
      return hasNoCache || requestChanged || bumpChanged;
    }, [request, bump, graphData]);

    const { data, loading, error } = useAsync(() => {
      if (!shouldFetchGraph) return null;
      return window.api?.heroGraphData(request) ?? null;
    }, [shouldFetchGraph, request, bump]);

    React.useEffect(() => { 
      if (data) {
        setGraphData(data);
        lastGraphRequest.current = request;
        lastGraphBump.current = bump;
      }
    }, [data, request, bump]);

    // Track if we need to refetch hero stats
    const lastBumpForStats = React.useRef(bump);
    const lastHeroName = React.useRef(heroName);
    
    const shouldRefetchHeroStats = React.useMemo(() => {
      const bumpChanged = lastBumpForStats.current !== bump;
      const heroChanged = lastHeroName.current !== heroName;
      const hasNoCache = !heroStatsCache;
      
      return hasNoCache || bumpChanged || heroChanged;
    }, [bump, heroName, heroStatsCache]);
    
    const heroStatsRequest = React.useMemo(() => {
      if (!heroName || !shouldRefetchHeroStats) return null;
      return { limit: 1, player: heroName };
    }, [heroName, shouldRefetchHeroStats]);
    
    const { data: heroStatsData, loading: heroStatsLoading, error: heroStatsError } = useAsync(() => {
      if (!shouldRefetchHeroStats) return null;
      if (!heroStatsRequest || !window.api?.listStats) return null;
      return window.api.listStats(heroStatsRequest);
    }, [shouldRefetchHeroStats, heroStatsRequest]);

    const heroStatsRow = React.useMemo(() => {
      if (Array.isArray(heroStatsData) && heroStatsData.length) return heroStatsData[0];
      return null;
    }, [heroStatsData]);

    React.useEffect(() => { 
      if (heroStatsRow) {
        setHeroStatsCache(heroStatsRow);
        lastBumpForStats.current = bump;
        lastHeroName.current = heroName;
      }
    }, [heroStatsRow, bump, heroName]);

    const heroStatsForDisplay = heroStatsRow || heroStatsCache;
    
    // Only show loading if fetching AND no cache exists
    const isHeroStatsLoading = heroStatsLoading && !heroStatsCache;
    const isGraphLoading = loading && !graphData;

    const displayData = data || graphData;
    const handTimeline = displayData?.timeline || [];
    const dailyTimeline = displayData?.daily || [];
    const rawTimeline = graphView === 'daily' ? dailyTimeline : handTimeline;
    const plotted = graphView === 'daily' ? dailyTimeline.length : displayData?.plotted ?? handTimeline.length;
    const totalHands = graphView === 'daily'
      ? dailyTimeline.reduce((sum, entry) => sum + (entry.hands || 0), 0)
      : displayData?.totalHands ?? plotted;

    React.useEffect(() => {
      const previousLength = lastTimelineLength.current || 0;
      lastTimelineLength.current = rawTimeline.length;
      if (!rawTimeline.length) { setVisibleCount(0); return; }
      setVisibleCount((prev) => {
        if (!prev) return rawTimeline.length;
        if (prev > rawTimeline.length) return rawTimeline.length;
        if (previousLength && prev === previousLength && rawTimeline.length > previousLength) {
          return rawTimeline.length;
        }
        return prev;
      });
    }, [rawTimeline]);

    React.useEffect(() => {
      lastTimelineLength.current = 0;
      setVisibleCount(null);
    }, [graphView]);

    const effectiveCount = rawTimeline.length ? Math.max(1, Math.min(visibleCount || rawTimeline.length, rawTimeline.length)) : 0;
    const visibleTimeline = effectiveCount ? rawTimeline.slice(-effectiveCount) : rawTimeline;

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

    const datasetFrom = (selector) => chartTimeline.map((point) => ({
      x: Number(point.index) || 0,
      y: selector(point),
    }));
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

    // Fetch annotations
    const [annotations, setAnnotations] = React.useState([]);
    const [annotationsLoaded, setAnnotationsLoaded] = React.useState(false);
    
    React.useEffect(() => {
      let alive = true;
      if (!window.api?.annotationsGetAll) return;
      
      window.api.annotationsGetAll().then((result) => {
        if (alive && result?.success) {
          setAnnotations(result.annotations || []);
          setAnnotationsLoaded(true);
        }
      }).catch((err) => {
        console.error('Failed to load annotations:', err);
        if (alive) setAnnotationsLoaded(true);
      });
      
      return () => { alive = false; };
    }, [bump]); // Reload on bump

    React.useEffect(() => {
      if (!canvasRef.current || !window.Chart) return undefined;
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
      if (!chartTimeline.length) return undefined;
      const minHandIndex = chartTimeline.length ? chartTimeline[0].index : 0;
      const maxHandIndex = chartTimeline.length ? chartTimeline[chartTimeline.length - 1].index : 0;
      const xAxisLabel = graphView === 'daily' ? 'Day #' : 'Hand #';
      const ctx = canvasRef.current.getContext('2d');
      
      // Create annotation plugin
      const annotationPlugin = {
        id: 'graphAnnotations',
        afterDatasetsDraw: (chart) => {
          const { ctx: chartCtx, chartArea, scales } = chart;
          if (!chartArea || !scales.x || !scales.y) return;
          
          annotations.forEach((ann) => {
            // Find the closest hand index for this timestamp
            let closestIndex = null;
            let closestDiff = Infinity;
            
            chartTimeline.forEach((point) => {
              if (point.ts) {
                const diff = Math.abs(point.ts - ann.ts);
                if (diff < closestDiff) {
                  closestDiff = diff;
                  closestIndex = point.index;
                }
              }
            });
            
            if (closestIndex !== null && closestIndex >= minHandIndex && closestIndex <= maxHandIndex) {
              const x = scales.x.getPixelForValue(closestIndex);
              
              // Draw vertical line
              chartCtx.save();
              chartCtx.strokeStyle = ann.color || '#FF5722';
              chartCtx.lineWidth = 2;
              chartCtx.setLineDash([5, 5]);
              chartCtx.beginPath();
              chartCtx.moveTo(x, chartArea.top);
              chartCtx.lineTo(x, chartArea.bottom);
              chartCtx.stroke();
              
              // Draw label box
              chartCtx.setLineDash([]);
              chartCtx.fillStyle = ann.color || '#FF5722';
              chartCtx.font = 'bold 11px sans-serif';
              const text = ann.label || '';
              const textWidth = chartCtx.measureText(text).width;
              const padding = 4;
              const boxWidth = textWidth + padding * 2;
              const boxHeight = 20;
              const boxX = x - boxWidth / 2;
              const boxY = chartArea.top + 5;
              
              chartCtx.fillRect(boxX, boxY, boxWidth, boxHeight);
              chartCtx.fillStyle = '#fff';
              chartCtx.textAlign = 'center';
              chartCtx.textBaseline = 'middle';
              chartCtx.fillText(text, x, boxY + boxHeight / 2);
              
              chartCtx.restore();
            }
          });
        },
      };
      
      const isDualMode = graphCurrency === 'dual';
      
      const datasets = isDualMode ? [
        // BB datasets (left axis)
        {
          label: 'Cumulative BB',
          data: datasetFrom((point) => Number(point.cumBB || 0)),
          borderColor: '#22c55e',
          backgroundColor: 'rgba(34,197,94,0.12)',
          borderWidth: 2,
          pointRadius: 0,
          pointHitRadius: 6,
          tension: 0.25,
          yAxisID: 'y',
        },
        {
          label: 'Pre-Rake BB',
          data: datasetFrom((point) => Number(point.cumPreRakeBB || 0)),
          borderColor: '#92400e',
          backgroundColor: 'rgba(146,64,14,0.16)',
          borderWidth: 2,
          pointRadius: 0,
          pointHitRadius: 6,
          tension: 0.25,
          yAxisID: 'y',
        },
        {
          label: 'Showdown BB',
          data: datasetFrom((point) => Number(point.cumShowdownBB || 0)),
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59,130,246,0.14)',
          borderWidth: 2,
          pointRadius: 0,
          pointHitRadius: 6,
          tension: 0.25,
          yAxisID: 'y',
        },
        {
          label: 'Non-showdown BB',
          data: datasetFrom((point) => Number(point.cumNonShowdownBB || 0)),
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239,68,68,0.14)',
          borderWidth: 2,
          pointRadius: 0,
          pointHitRadius: 6,
          tension: 0.25,
          borderDash: [6, 4],
          yAxisID: 'y',
        },
        // USD datasets (right axis)
        {
          label: 'Cumulative USD',
          data: datasetFrom((point) => Number(point.cumUSD || 0)),
          borderColor: '#16a34a',
          backgroundColor: 'rgba(22,163,74,0.08)',
          borderWidth: 2,
          pointRadius: 0,
          pointHitRadius: 6,
          tension: 0.25,
          yAxisID: 'y1',
          borderDash: [2, 2],
        },
        {
          label: 'Pre-Rake USD',
          data: datasetFrom((point) => Number(point.cumPreRakeUSD || 0)),
          borderColor: '#78350f',
          backgroundColor: 'rgba(120,53,15,0.12)',
          borderWidth: 2,
          pointRadius: 0,
          pointHitRadius: 6,
          tension: 0.25,
          yAxisID: 'y1',
          borderDash: [2, 2],
        },
        {
          label: 'Showdown USD',
          data: datasetFrom((point) => Number(point.cumShowdownUSD || 0)),
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37,99,235,0.1)',
          borderWidth: 2,
          pointRadius: 0,
          pointHitRadius: 6,
          tension: 0.25,
          yAxisID: 'y1',
          borderDash: [2, 2],
        },
        {
          label: 'Non-showdown USD',
          data: datasetFrom((point) => Number(point.cumNonShowdownUSD || 0)),
          borderColor: '#dc2626',
          backgroundColor: 'rgba(220,38,38,0.1)',
          borderWidth: 2,
          pointRadius: 0,
          pointHitRadius: 6,
          tension: 0.25,
          borderDash: [8, 3],
          yAxisID: 'y1',
        },
      ] : [
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
        plugins: [annotationPlugin],
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
            if (graphView === 'hands' && point?.handId) handleNavigateToHand(point.handId);
          },
          plugins: {
            tooltip: {
              callbacks: {
                title: (items) => {
                  if (!items?.length) return '';
                  const idxValue = items[0].parsed.x;
                  const rounded = Math.round(idxValue);
                  const point = handIndexMap.get(rounded) || handIndexMap.get(idxValue);
                  if (!point) {
                    return graphView === 'daily' ? `Day ${rounded}` : `Hand ${rounded}`;
                  }
                  if (graphView === 'daily') {
                    return `${point.date || point.dateUTC || 'Unknown date'} (Day ${rounded})`;
                  }
                  // Add timestamp to hand tooltips
                  const timestamp = point.dateUTC || point.date || '';
                  const handId = point.handId ? `Hand ${point.handId}` : `Hand #${point.index}`;
                  return timestamp ? `${handId} • ${timestamp}` : handId;
                },
              },
            },
          },
          scales: {
            x: { type: 'linear', title: { display: true, text: xAxisLabel }, min: minHandIndex, max: maxHandIndex, grid: { display: false } },
            y: { 
              type: 'linear',
              display: true,
              position: 'left',
              title: { display: true, text: isDualMode ? 'BB' : (graphCurrency === 'bb' ? 'BB' : 'USD') },
              grid: { color: 'rgba(255,255,255,0.1)' },
            },
            ...(isDualMode ? {
              y1: {
                type: 'linear',
                display: true,
                position: 'right',
                title: { display: true, text: 'USD' },
                grid: { drawOnChartArea: false },
              }
            } : {}),
          },
        },
      });
      return () => {
        if (chartRef.current) {
          chartRef.current.destroy();
          chartRef.current = null;
        }
      };
    }, [primarySeries, preRakeSeries, showdownSeries, nonShowdownSeries, graphCurrency, chartTimeline, handIndexMap, handleNavigateToHand, graphView, annotations]);

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
    
    // Quick date preset functions
    const setDatePreset = React.useCallback((days) => {
      const to = new Date().toISOString().slice(0, 10);
      const from = days === null ? '' : new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      setGraphFilters((prev) => ({ ...prev, from, to: days === null ? '' : to }));
      if (window.__toast) {
        const label = days === null ? 'All Time' : `Last ${days} Day${days !== 1 ? 's' : ''}`;
        window.__toast(`Date filter: ${label}`, 'info', 1500);
      }
    }, []);

    const handleFilterChange = (field) => (value) => setGraphFilters((prev) => ({ ...prev, [field]: value }));
    const exportGraph = React.useCallback(() => {
      if (!chartRef.current) {
        if (window.__toast) window.__toast('No graph to export', 'error');
        return;
      }
      try {
        const url = chartRef.current.toBase64Image();
        const link = document.createElement('a');
        link.download = `hudini-graph-${new Date().toISOString().slice(0, 10)}.png`;
        link.href = url;
        link.click();
        if (window.__toast) window.__toast('Graph exported successfully!', 'success');
      } catch (err) {
        console.error('Export failed:', err);
        if (window.__toast) window.__toast('Export failed', 'error');
      }
    }, []);

    const sliderMax = rawTimeline.length || 1;
    const headerLabel = graphView === 'daily'
      ? `Loaded ${plotted} days (${totalHands.toLocaleString()} hands)`
      : totalHands ? `Loaded ${plotted.toLocaleString()} hands (${totalHands.toLocaleString()} total in database)` : `Loaded ${plotted.toLocaleString()} hands`;

    // Export graph as PNG
    const exportGraphImage = () => {
      if (!chartRef.current) {
        showToast('No graph to export', 'error', 2000);
        return;
      }
      
      try {
        const url = chartRef.current.toBase64Image();
        const link = document.createElement('a');
        link.download = `poker_graph_${new Date().toISOString().split('T')[0]}.png`;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('✓ Graph exported as PNG', 'success', 2000);
      } catch (error) {
        showToast(`✕ Export failed: ${error.message}`, 'error', 3000);
      }
    };

    // Export positional chart as PNG
    const exportPositionalChart = () => {
      if (!positionalChartRef.current) {
        showToast('No chart to export', 'error', 2000);
        return;
      }
      
      try {
        const url = positionalChartRef.current.toBase64Image();
        const link = document.createElement('a');
        link.download = `positional_chart_${new Date().toISOString().split('T')[0]}.png`;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('✓ Positional chart exported', 'success', 2000);
      } catch (error) {
        showToast(`✕ Export failed: ${error.message}`, 'error', 3000);
      }
    };

    // Export vs-hero chart as PNG
    const exportVsHeroChart = () => {
      if (!vsHeroChartRef.current) {
        showToast('No chart to export', 'error', 2000);
        return;
      }
      
      try {
        const url = vsHeroChartRef.current.toBase64Image();
        const link = document.createElement('a');
        link.download = `vshero_chart_${new Date().toISOString().split('T')[0]}.png`;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('✓ Vs-Hero chart exported', 'success', 2000);
      } catch (error) {
        showToast(`✕ Export failed: ${error.message}`, 'error', 3000);
      }
    };

    if (!window.api) return Panel({ title: 'Dashboard', children: 'Preload not loaded.' });
    if (!displayData && isGraphLoading) return Panel({ title: 'Dashboard', children: React.createElement(LoadingSkeleton, { type: 'graph' }) });
    if (!displayData && error) return Panel({ title: 'Dashboard', children: formatError(error) });
    if (!displayData) return Panel({ title: 'Dashboard', children: 'No graph data available.' });

    return Panel({
      title: 'Dashboard',
      children: ReactEl(React.Fragment, null,
        // Auto-Import Watch Folder Manager
        ReactEl(WatchFolderManager),
        // Bulk Import Manager
        ReactEl(BulkImportManager),
        // Position Profitability Chart
        ReactEl(PositionProfitabilityChart, { globalFilters }),
        // Annotation Manager
        ReactEl(AnnotationManager, { onUpdate: () => setBump((prev) => prev + 1) }),
        // Opponent Analysis
        ReactEl(OpponentAnalysis),
        ReactEl('div', {
          className: 'body',
          style: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginBottom: 8 },
        }, [
          ReactEl('div', { className: 'muted' }, headerLabel),
          ReactEl('button', { type: 'button', onClick: exportGraphImage, style: { flex: '0 0 auto' } }, '📥 Export PNG'),
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
          ReactEl('select', { value: graphView, onChange: (ev) => setGraphView(ev.target.value), style: { flex: '0 0 150px' } }, [
            ReactEl('option', { value: 'hands', key: 'hands' }, 'View by Hand'),
            ReactEl('option', { value: 'daily', key: 'daily' }, 'View by Day'),
          ]),
          ReactEl('div', { style: { flex: '1 1 100%' } }, 
            ReactEl(DatePresets, {
              currentFrom: graphFilters.from,
              currentTo: graphFilters.to,
              onSelect: ({ from, to }) => {
                setGraphFilters((prev) => ({ ...prev, from, to }));
                const label = !from && !to ? 'All Time' : 
                             from === to ? new Date(from).toLocaleDateString() :
                             `${new Date(from).toLocaleDateString()} - ${new Date(to).toLocaleDateString()}`;
                if (window.__toast) window.__toast(`Date range: ${label}`, 'info', 1500);
              }
            })
          ),
          ReactEl('button', {
            type: 'button',
            onClick: () => {
              setGraphFilters({ 
                limit: DEFAULT_GRAPH_LIMIT, 
                stake: 'all', 
                position: 'all', 
                showdown: 'all', 
                result: 'all', 
                order: 'oldest', 
                from: '', 
                to: '',
                handRange: 'all',
                stackDepth: 'all',
                actionType: 'all',
                potSize: 'all',
                minBetSize: '',
                maxBetSize: ''
              });
              setGraphCurrency('usd');
              setGraphView('hands');
            },
            style: { flex: '0 0 auto' }
          }, 'Reset Filters'),
          ReactEl('select', { value: graphCurrency, onChange: (ev) => setGraphCurrency(ev.target.value), style: { flex: '0 0 140px' } }, [
            ReactEl('option', { value: 'usd', key: 'usd' }, 'USD'),
            ReactEl('option', { value: 'bb', key: 'bb' }, 'BB'),
            ReactEl('option', { value: 'dual', key: 'dual' }, 'BB + USD'),
          ]),
        ]),
        // Advanced Filters
        React.createElement(AdvancedFilters, {
          filters: graphFilters,
          onChange: setGraphFilters,
          availableStakes: displayData?.available?.stakes || [],
          availablePositions: displayData?.available?.positions || [],
          compact: true
        }),
        // HUD Control Panel
        ReactEl(HUDControlPanel),
        // Dashboard Widgets
        ReactEl(DashboardWidgets, { summary, heroStats: heroStatsForDisplay }),
        // Hand Range Visualizer
        ReactEl(HandRangeVisualizer),
        heroStatsForDisplay ? Panel({
          title: 'Hero Snapshot',
          children: buildPlayerDetailContent(React, heroStatsForDisplay, { includePositional: false, collapsed: heroCollapsed, onToggleSection: (key, next) => setHeroCollapsed((prev) => ({ ...prev, [key]: next })), quickDrill: (payload) => { try { setActiveTab('stats'); } catch {} quickDrillFromDashboard(payload); }, isHero: true }),
        }) : isHeroStatsLoading ? Panel({ title: 'Hero Snapshot', children: React.createElement(LoadingSkeleton, { type: 'stats' }) }) : heroStatsError ? Panel({ title: 'Hero Snapshot', children: formatError(heroStatsError) }) : null,
        compareSnapshot && compareSnapshot.stats ? Panel({
          title: `Pinned Player Snapshot (${compareSnapshot.player})`,
          children: buildPlayerDetailContent(React, compareSnapshot.stats, { includePositional: false, collapsed: {}, onToggleSection: () => {}, quickDrill: (payload) => { try { setActiveTab('stats'); } catch {} quickDrillFromDashboard(payload); }, isHero: heroName && namesEqual(compareSnapshot.player, heroName) }),
        }) : null,
        ReactEl('div', { className: 'body', style: { height: 320 } }, ReactEl('canvas', { ref: canvasRef, style: { width: '100%', height: '100%' } })),
        positionalData && positionalData.length ? Panel({
          title: 'Positional VPIP vs PFR',
          children: ReactEl('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } }, [
            ReactEl('div', { key: 'controls', style: { display: 'flex', justifyContent: 'flex-end', paddingRight: 12 } }, 
              ReactEl('button', { type: 'button', onClick: exportPositionalChart, style: { fontSize: 12, padding: '4px 8px' } }, '📥 Export')
            ),
            ReactEl('div', { key: 'chart', style: { height: 240 } }, ReactEl('canvas', { ref: positionalCanvasRef, style: { width: '100%', height: '100%' } })),
          ]),
        }) : null,
        vsHeroData ? Panel({
          title: 'Vs-Hero Outcomes',
          children: ReactEl('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } }, [
            ReactEl('div', { key: 'controls', style: { display: 'flex', justifyContent: 'flex-end', paddingRight: 12 } }, 
              ReactEl('button', { type: 'button', onClick: exportVsHeroChart, style: { fontSize: 12, padding: '4px 8px' } }, '📥 Export')
            ),
            ReactEl('div', { key: 'chart', style: { height: 220 } }, ReactEl('canvas', { ref: vsHeroCanvasRef, style: { width: '100%', height: '100%' } })),
            ReactEl('div', { key: 'stats', style: { display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13, color: '#4b5563' } }, [
              ReactEl('div', null, `Hands: ${vsHeroData.hands.toLocaleString()}`),
              ReactEl('div', null, `Showdown Wins: ${vsHeroData.wins.toLocaleString()}`),
              ReactEl('div', null, `Showdown Losses: ${vsHeroData.losses.toLocaleString()}`),
              ReactEl('div', null, `Non-showdown: ${vsHeroData.nonShowdown.toLocaleString()}`),
            ]),
          ]),
        }) : null,
        // Hourly Heatmap
        Panel({
          title: 'Performance Heatmap',
          children: ReactEl(HourlyHeatmap, { filters: graphFilters })
        }),
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
          // HUD toggle failed silently
        }
      });
      window.hud?.status?.().then((res) => {
        if (res?.success) {
          hudBtn.textContent = res.active ? 'HUD: ON' : 'HUD: OFF';
          hudBtn.classList.toggle('active', !!res.active);
        }
      }).catch(() => {});
    }

    // Calibration tool button
    const calibrationBtn = document.getElementById('open-calibration');
    if (calibrationBtn && window.electronAPI?.calibration?.open) {
      calibrationBtn.addEventListener('click', async () => {
        try {
          const result = await window.electronAPI.calibration.open();
          if (result.success) {
            console.log('✅ Calibration tool opened');
          } else {
            console.error('❌ Failed to open calibration tool:', result.message);
          }
        } catch (error) {
          console.error('❌ Error opening calibration tool:', error);
        }
      });
    }

    const importButtons = [
      ['open-import', () => { showOverlay(); }],
      ['import-close', () => { hideOverlay(); }],
      ['import-clear', () => { clearOverlay(); }],
      ['btn-import', async () => {
        try {
          console.log('[Import] Starting...');
          setProgress(0);
          
          const folders = await window.importer?.chooseFolders?.();
          console.log('[Import] Selected folders:', folders);
          if (!folders || !folders.length) {
            showToast('No folders selected', 'info', 2000);
            return;
          }
          
          // Create initial progress toast (will be updated by progress events)
          showToast('Starting import...', 'loading', 0, { id: 'import-progress', progress: 0 });
          
          console.log('[Import] Calling start...');
          const result = await window.importer?.start?.(folders, { overwrite: !!document.getElementById('import-overwrite')?.checked });
          console.log('[Import] Completed:', result);
          
          // Remove progress toast
          const container = document.getElementById('toast-container');
          const progressToast = container && Array.from(container.children).find(t => t.__id === 'import-progress');
          if (progressToast) removeToast(progressToast);
          
          // Calculate total imported (new + updated)
          const totalImported = (result.handsInserted || 0) + (result.handsUpdated || 0);
          const duplicates = result.duplicateHands || 0;
          
          // Show success toast with stats including duplicates
          if (totalImported > 0) {
            let message = `✓ Import complete!\n${totalImported.toLocaleString()} hands imported`;
            if (duplicates > 0) {
              message += `\n${duplicates.toLocaleString()} duplicates skipped`;
            }
            showToast(message, 'success', 4000);
          } else if (result && result.ok) {
            let message = 'Import complete (no new hands)';
            if (duplicates > 0) {
              message += `\n${duplicates.toLocaleString()} duplicates skipped`;
            }
            showToast(message, 'info', 3000);
          }
          
          // Refresh data after import
          window.__pub?.emit('data-updated');
        } catch (error) {
          console.error('[Import] Error:', error);
          // Remove progress toast if exists
          const container = document.getElementById('toast-container');
          const progressToast = container && Array.from(container.children).find(t => t.__id === 'import-progress');
          if (progressToast) removeToast(progressToast);
          
          showToast(`✕ Import failed: ${error.message || error}`, 'error', 5000);
        }
      }],
      ['btn-testfile', async () => {
        try {
          const file = await window.filetester?.chooseFile?.();
          if (!file) return;
          await window.filetester?.testFile?.(file);
        } catch (error) {
          // File test failed silently
        }
      }],
      ['btn-testfolder', async () => {
        try {
          const folder = await window.foldertester?.chooseFolder?.();
          if (!folder) return;
          await window.foldertester?.scanFolder?.(folder);
        } catch (error) {
          // Folder scan failed silently
        }
      }],
      ['btn-backup-db', async () => {
        try {
          showToast('Creating database backup...', 'loading', 0, { id: 'backup-progress' });
          const result = await window.api?.backupDatabase?.();
          
          // Remove progress toast
          const container = document.getElementById('toast-container');
          const progressToast = container && Array.from(container.children).find(t => t.__id === 'backup-progress');
          if (progressToast) removeToast(progressToast);
          
          if (result && result.success) {
            showToast(`✓ Backup complete!\n${result.handCount?.toLocaleString?.()} hands (${result.sizeMB} MB)`, 'success', 4000);
          } else {
            showToast(`Backup cancelled or failed${result?.message ? ': ' + result.message : ''}`, 'warning', 3000);
          }
        } catch (error) {
          // Remove progress toast
          const container = document.getElementById('toast-container');
          const progressToast = container && Array.from(container.children).find(t => t.__id === 'backup-progress');
          if (progressToast) removeToast(progressToast);
          
          showToast(`✕ Backup failed: ${error.message || error}`, 'error', 5000);
        }
      }],
      ['btn-restore-db', async () => {
        try {
          showToast('Restoring database...', 'loading', 0, { id: 'restore-progress' });
          const result = await window.api?.restoreDatabase?.();
          
          // Remove progress toast
          const container = document.getElementById('toast-container');
          const progressToast = container && Array.from(container.children).find(t => t.__id === 'restore-progress');
          if (progressToast) removeToast(progressToast);
          
          if (result && result.success) {
            showToast(`✓ Database restored!\n${result.handCount?.toLocaleString?.()} hands loaded`, 'success', 4000);
            // Refresh all data
            window.__pub?.emit('data-updated');
          } else {
            showToast(`Restore cancelled or failed${result?.message ? ': ' + result.message : ''}`, 'warning', 3000);
          }
        } catch (error) {
          // Remove progress toast
          const container = document.getElementById('toast-container');
          const progressToast = container && Array.from(container.children).find(t => t.__id === 'restore-progress');
          if (progressToast) removeToast(progressToast);
          
          showToast(`✕ Restore failed: ${error.message || error}`, 'error', 5000);
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
    const tabSessions = document.getElementById('tab-sessions');
    const tabReports = document.getElementById('tab-reports');
    const tabDashboard = document.getElementById('tab-dashboard');
    if (tabStats && !tabStats.__wired) {
      tabStats.__wired = true;
      tabStats.addEventListener('click', () => setActiveTab('stats'));
    }
    if (tabBrowser && !tabBrowser.__wired) {
      tabBrowser.__wired = true;
      tabBrowser.addEventListener('click', () => setActiveTab('browser'));
    }
    if (tabSessions && !tabSessions.__wired) {
      tabSessions.__wired = true;
      tabSessions.addEventListener('click', () => setActiveTab('sessions'));
    }
    if (tabReports && !tabReports.__wired) {
      tabReports.__wired = true;
      tabReports.addEventListener('click', () => setActiveTab('reports'));
    }
    if (tabDashboard && !tabDashboard.__wired) {
      tabDashboard.__wired = true;
      tabDashboard.addEventListener('click', () => setActiveTab('dashboard'));
    }

    const stampHost = document.querySelector('header .right');
    if (stampHost && !stampHost.__buildStamp) {
      stampHost.__buildStamp = true;
      
      // Add theme toggle button
      const themeBtn = document.createElement('button');
      themeBtn.className = 'theme-toggle';
      themeBtn.id = 'theme-toggle';
      themeBtn.innerHTML = '🌙';
      themeBtn.title = 'Toggle Dark/Light Mode';
      stampHost.appendChild(themeBtn);
      
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

  // Ensure pub system exists before bridging
  ensurePub();

  // Bridge IPC events to __pub event system
  if (window.importer?.onProgress && !window.__importerBridged) {
    window.__importerBridged = true;
    window.importer.onProgress((data) => {
      console.log('[Import Progress Event]', data);
      // Convert filesProcessed/totalFiles to percent for UI
      if (data.filesProcessed !== undefined && data.totalFiles) {
        const percent = Math.round((data.filesProcessed / data.totalFiles) * 100);
        window.__pub?.emit('import:progress', { ...data, percent });
      } else {
        window.__pub?.emit('import:progress', data);
      }
    });
    window.importer.onDone?.((data) => {
      console.log('[Import Done Event]', data);
      window.__pub?.emit('import:complete', data);
    });
    console.log('[Import Bridge] IPC to PubSub bridge initialized');
  }

  // Global event listeners for enhanced notifications
  if (window.__pub?.on && !window.__notificationsWired) {
    window.__notificationsWired = true;
    
    // Show toast when data is updated
    window.__pub.on('data-updated', () => {
      window.__toast?.('Data refreshed successfully!', 'success', 2000);
    });
    
    // Show toast for import progress (if available)
    window.__pub.on('import:progress', (data) => {
      console.log('[Progress Toast Handler]', data);
      const toastId = 'import-progress';
      const container = document.getElementById('toast-container');
      const existingToast = container && Array.from(container.children).find(t => t.__id === toastId);
      
      // Build progress message with file details
      let message = 'Importing hand histories...';
      let detailedMessage = '';
      
      if (data.line) {
        // Show specific status message from backend
        message = data.line;
      } else if (data.filesProcessed !== undefined && data.totalFiles) {
        message = `Processing files... ${data.filesProcessed}/${data.totalFiles}`;
      }
      
      // Add file-specific details if available
      if (data.file && data.file.path) {
        const fileName = data.file.path.split(/[/\\]/).pop() || data.file.path;
        const fileStats = [];
        if (data.file.inserted > 0) fileStats.push(`${data.file.inserted} new`);
        if (data.file.updated > 0) fileStats.push(`${data.file.updated} updated`);
        if (data.file.duplicates > 0) fileStats.push(`${data.file.duplicates} duplicates`);
        
        if (fileStats.length > 0) {
          detailedMessage = `\n${fileName}: ${fileStats.join(', ')}`;
        } else {
          detailedMessage = `\n${fileName}`;
        }
      }
      
      // Add totals if available
      if (data.totals) {
        const totalStats = [];
        if (data.totals.inserted > 0) totalStats.push(`${data.totals.inserted} inserted`);
        if (data.totals.updated > 0) totalStats.push(`${data.totals.updated} updated`);
        if (data.totals.duplicates > 0) totalStats.push(`${data.totals.duplicates} duplicates`);
        
        if (totalStats.length > 0) {
          detailedMessage += `\nTotal: ${totalStats.join(', ')}`;
        }
      }
      
      // Calculate progress percentage
      let progress = 0;
      if (data.percent !== undefined) {
        progress = data.percent;
      } else if (data.filesProcessed !== undefined && data.totalFiles) {
        progress = Math.round((data.filesProcessed / data.totalFiles) * 100);
      }
      
      const fullMessage = message + detailedMessage;
      
      if (!existingToast) {
        // Create initial toast with progress bar
        console.log('[Progress Toast] Creating new toast:', fullMessage, progress);
        showToast(fullMessage, 'loading', 0, { id: toastId, progress });
      } else {
        // Update existing toast with new progress and message
        console.log('[Progress Toast] Updating toast:', fullMessage, progress);
        updateToast(toastId, { 
          progress,
          message: progress > 0 ? `${fullMessage} (${progress}%)` : fullMessage
        });
      }
    });
    
    console.log('[Progress Listener] import:progress listener registered');
    
    // Show toast when import completes
    window.__pub.on('import:complete', (data) => {
      const message = data && data.count ? `Imported ${data.count} hands!` : 'Import complete!';
      window.__toast?.(message, 'success', 3000);
    });
    
    // Show toast on errors
    window.__pub.on('error', (data) => {
      const message = data && data.message ? data.message : 'An error occurred';
      window.__toast?.(message, 'error', 5000, {
        actions: [
          { id: 'retry', label: 'Retry', onClick: () => window.location.reload() }
        ]
      });
    });
  }

  function setActiveTab(tab) {
    window.__setTab?.(tab);
  }

  // Auto-Import Watch Folder Manager
  function WatchFolderManager() {
    const React = window.React;
    const [watchedFolders, setWatchedFolders] = React.useState([]);
    const [watching, setWatching] = React.useState(false);
    const [newFileCount, setNewFileCount] = React.useState(0);
    const [expanded, setExpanded] = React.useState(false);
    
    // Load watched folders from localStorage on mount
    React.useEffect(() => {
      const loadWatchedFolders = async () => {
        try {
          const saved = localStorage.getItem('poker_watched_folders');
          if (saved) {
            const folders = JSON.parse(saved);
            setWatchedFolders(folders);
            
            // Auto-start watching if enabled
            const autoStart = localStorage.getItem('poker_auto_watch_enabled') === 'true';
            if (autoStart && folders.length > 0) {
              startWatching(folders);
            }
          }
        } catch (err) {
          console.error('Failed to load watched folders:', err);
        }
      };
      loadWatchedFolders();
      
      // Listen for new file events
      const handleNewFile = (event, data) => {
        setNewFileCount(prev => prev + 1);
        if (window.__toast) {
          window.__toast(`📁 New file detected: ${data.filename}`, 'info', 3000);
        }
      };
      
      const handleImported = (event, data) => {
        if (data.success) {
          if (window.__toast) {
            window.__toast(
              `✓ Auto-imported: ${data.filename} (${data.handsImported || 0} hands)`, 
              'success', 
              4000
            );
          }
        } else {
          if (window.__toast) {
            window.__toast(`⚠ Failed to import: ${data.filename}`, 'error', 4000);
          }
        }
      };
      
      window.api?.onWatchNewFile?.(handleNewFile);
      window.api?.onWatchImported?.(handleImported);
      
      return () => {
        // Cleanup listeners
        window.api?.removeWatchListeners?.();
      };
    }, []);
    
    const startWatching = async (folders) => {
      try {
        for (const folder of folders) {
          const result = await window.api?.addWatchFolder(folder);
          if (!result?.success) {
            console.error(`Failed to watch ${folder}:`, result?.error);
          }
        }
        setWatching(true);
        localStorage.setItem('poker_auto_watch_enabled', 'true');
        if (window.__toast) {
          window.__toast(`👁️ Watching ${folders.length} folder(s) for new files`, 'success', 3000);
        }
      } catch (err) {
        console.error('Failed to start watching:', err);
        if (window.__toast) {
          window.__toast('⚠ Failed to start watching folders', 'error', 3000);
        }
      }
    };
    
    const stopWatching = async () => {
      try {
        await window.api?.stopAllWatching();
        setWatching(false);
        setNewFileCount(0);
        localStorage.setItem('poker_auto_watch_enabled', 'false');
        if (window.__toast) {
          window.__toast('Stopped watching folders', 'info', 2000);
        }
      } catch (err) {
        console.error('Failed to stop watching:', err);
      }
    };
    
    const addFolder = async () => {
      try {
        const folders = await window.api?.chooseFolders();
        if (folders && folders.length > 0) {
          const newFolders = [...watchedFolders, ...folders];
          setWatchedFolders(newFolders);
          localStorage.setItem('poker_watched_folders', JSON.stringify(newFolders));
          
          // If already watching, add the new folders
          if (watching) {
            for (const folder of folders) {
              await window.api?.addWatchFolder(folder);
            }
          }
          
          if (window.__toast) {
            window.__toast(`✓ Added ${folders.length} folder(s) to watch list`, 'success', 2500);
          }
        }
      } catch (err) {
        console.error('Failed to add folder:', err);
        if (window.__toast) {
          window.__toast('⚠ Failed to add folder', 'error', 2500);
        }
      }
    };
    
    const removeFolder = async (folderPath) => {
      try {
        const newFolders = watchedFolders.filter(f => f !== folderPath);
        setWatchedFolders(newFolders);
        localStorage.setItem('poker_watched_folders', JSON.stringify(newFolders));
        
        if (watching) {
          await window.api?.removeWatchFolder(folderPath);
        }
        
        if (window.__toast) {
          window.__toast('✓ Removed folder from watch list', 'success', 2000);
        }
      } catch (err) {
        console.error('Failed to remove folder:', err);
      }
    };
    
    const toggleWatching = () => {
      if (watching) {
        stopWatching();
      } else {
        startWatching(watchedFolders);
      }
    };
    
    return React.createElement('div', {
      style: { 
        marginBottom: 16,
        padding: 12,
        background: watching ? '#f0fdf4' : '#f9fafb',
        border: watching ? '2px solid #10b981' : '1px solid #e5e7eb',
        borderRadius: 8
      }
    }, [
      // Header
      React.createElement('div', {
        key: 'header',
        style: { 
          display: 'flex', 
          alignItems: 'center', 
          gap: 12,
          marginBottom: expanded ? 12 : 0
        }
      }, [
        React.createElement('button', {
          key: 'toggle',
          onClick: () => setExpanded(!expanded),
          style: {
            padding: '6px 12px',
            fontSize: 13,
            fontWeight: 600,
            borderRadius: 6,
            border: '1px solid #d1d5db',
            background: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            transition: 'all 0.2s ease'
          }
        }, [
          React.createElement('span', {
            key: 'icon',
            style: {
              transition: 'transform 0.3s ease',
              transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
              display: 'inline-block'
            }
          }, '▶'),
          React.createElement('span', { key: 'label' }, '👁️ Auto-Import')
        ]),
        React.createElement('div', {
          key: 'status',
          style: { 
            flex: 1,
            fontSize: 13,
            color: watching ? '#059669' : '#6b7280',
            fontWeight: 600
          }
        }, watching 
          ? `Watching ${watchedFolders.length} folder(s)${newFileCount > 0 ? ` • ${newFileCount} new files` : ''}` 
          : `${watchedFolders.length} folder(s) configured`
        ),
        React.createElement('button', {
          key: 'watch-toggle',
          onClick: toggleWatching,
          disabled: watchedFolders.length === 0,
          style: {
            padding: '6px 16px',
            fontSize: 13,
            fontWeight: 700,
            borderRadius: 6,
            border: watching ? '1px solid #dc2626' : '1px solid #10b981',
            background: watching ? '#fee2e2' : '#10b981',
            color: watching ? '#dc2626' : 'white',
            cursor: watchedFolders.length === 0 ? 'not-allowed' : 'pointer',
            opacity: watchedFolders.length === 0 ? 0.5 : 1,
            transition: 'all 0.2s ease'
          }
        }, watching ? 'Stop Watching' : 'Start Watching')
      ]),
      
      // Expanded Content
      expanded ? React.createElement('div', {
        key: 'content',
        className: 'fade-in',
        style: { marginTop: 12 }
      }, [
        // Folder List
        watchedFolders.length > 0 ? React.createElement('div', {
          key: 'folders',
          style: {
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            marginBottom: 12
          }
        }, watchedFolders.map((folder, idx) => 
          React.createElement('div', {
            key: idx,
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: 8,
              background: 'white',
              borderRadius: 6,
              border: '1px solid #e5e7eb',
              fontSize: 13
            }
          }, [
            React.createElement('span', {
              key: 'icon',
              style: { fontSize: 16 }
            }, '📁'),
            React.createElement('span', {
              key: 'path',
              style: { 
                flex: 1,
                fontFamily: 'monospace',
                fontSize: 12,
                color: '#374151',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }
            }, folder),
            React.createElement('button', {
              key: 'remove',
              onClick: () => removeFolder(folder),
              style: {
                padding: '4px 10px',
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 4,
                border: '1px solid #ef4444',
                background: '#fee2e2',
                color: '#dc2626',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }
            }, '✕')
          ])
        )) : React.createElement('div', {
          key: 'empty',
          style: {
            padding: 16,
            textAlign: 'center',
            color: '#9ca3af',
            fontSize: 13,
            marginBottom: 12
          }
        }, 'No folders configured. Add folders to enable auto-import.'),
        
        // Add Folder Button
        React.createElement('button', {
          key: 'add',
          onClick: addFolder,
          style: {
            padding: '8px 16px',
            fontSize: 13,
            fontWeight: 600,
            borderRadius: 6,
            border: '1px solid #3b82f6',
            background: '#eff6ff',
            color: '#1e40af',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }
        }, '+ Add Folder to Watch'),
        
        // Info
        React.createElement('div', {
          key: 'info',
          style: {
            marginTop: 12,
            padding: 12,
            background: '#f0f9ff',
            border: '1px solid #bae6fd',
            borderRadius: 6,
            fontSize: 12,
            color: '#0c4a6e',
            lineHeight: 1.6
          }
        }, [
          React.createElement('div', { key: 'title', style: { fontWeight: 600, marginBottom: 4 } }, 'ℹ️ Auto-Import Info:'),
          React.createElement('div', { key: 'line1' }, '• Watches folders for new .txt, .log, .hh files'),
          React.createElement('div', { key: 'line2' }, '• Automatically imports new hands when files are added'),
          React.createElement('div', { key: 'line3' }, '• Waits 2 seconds after file write to ensure completion'),
          React.createElement('div', { key: 'line4' }, '• Settings persist across app restarts')
        ])
      ]) : null
    ]);
  }

  // Bulk Import Manager Component
  function BulkImportManager() {
    const React = window.React;
    const [folders, setFolders] = React.useState([]);
    const [importing, setImporting] = React.useState(false);
    const [paused, setPaused] = React.useState(false);
    const [expanded, setExpanded] = React.useState(false);
    const [progress, setProgress] = React.useState({
      currentIndex: 0,
      totalFolders: 0,
      currentFolder: '',
      currentLine: '',
      results: []
    });

    // Add folders
    const addFolders = async () => {
      const selected = await window.api?.chooseFolders?.();
      if (selected && selected.length > 0) {
        setFolders(prev => {
          const newFolders = selected.filter(f => !prev.includes(f));
          return [...prev, ...newFolders];
        });
        showToast(`✓ Added ${selected.length} folder(s) to bulk import list`, 'success');
      }
    };

    // Remove folder
    const removeFolder = (folderPath) => {
      setFolders(prev => prev.filter(f => f !== folderPath));
      showToast('✓ Removed folder from bulk import list', 'info');
    };

    // Clear all folders
    const clearFolders = () => {
      setFolders([]);
      showToast('✓ Cleared bulk import list', 'info');
    };

    // Start import
    const startImport = async () => {
      if (folders.length === 0) {
        showToast('⚠ No folders selected', 'error');
        return;
      }

      setImporting(true);
      setPaused(false);
      setProgress({
        currentIndex: 0,
        totalFolders: folders.length,
        currentFolder: '',
        currentLine: '',
        results: []
      });

      try {
        await window.api?.startBulkImport?.(folders);
      } catch (err) {
        showToast(`⚠ Bulk import failed: ${err.message}`, 'error');
        setImporting(false);
      }
    };

    // Pause/Resume
    const togglePause = async () => {
      if (paused) {
        await window.api?.resumeBulkImport?.();
        setPaused(false);
      } else {
        await window.api?.pauseBulkImport?.();
        setPaused(true);
      }
    };

    // Cancel
    const cancelImport = async () => {
      await window.api?.cancelBulkImport?.();
      showToast('⚠ Cancelling bulk import...', 'info');
    };

    // Event handlers
    React.useEffect(() => {
      const handleStarted = (payload) => {
        setProgress(prev => ({
          ...prev,
          totalFolders: payload.totalFolders
        }));
      };

      const handleProgress = (payload) => {
        setProgress(prev => ({
          ...prev,
          currentLine: payload.line || ''
        }));
      };

      const handleFolderStart = (payload) => {
        setProgress(prev => ({
          ...prev,
          currentIndex: payload.index,
          currentFolder: payload.folder
        }));
      };

      const handleFolderComplete = (payload) => {
        setProgress(prev => ({
          ...prev,
          results: [...prev.results, {
            folder: payload.folder,
            success: payload.success,
            handsImported: payload.handsImported || 0,
            filesProcessed: payload.filesProcessed || 0,
            error: payload.error
          }]
        }));

        if (payload.success) {
          showToast(`✓ Imported ${payload.handsImported} hands from folder ${payload.index + 1}/${payload.total}`, 'success');
        } else {
          showToast(`⚠ Failed to import folder ${payload.index + 1}: ${payload.error}`, 'error');
        }
      };

      const handlePaused = () => {
        setPaused(true);
        showToast('⏸️ Bulk import paused', 'info');
      };

      const handleResumed = () => {
        setPaused(false);
        showToast('▶️ Bulk import resumed', 'info');
      };

      const handleCancelled = (payload) => {
        setImporting(false);
        setPaused(false);
        showToast(`⚠ Bulk import cancelled (${payload.completed}/${payload.total} folders completed)`, 'info');
      };

      const handleComplete = (payload) => {
        setImporting(false);
        setPaused(false);
        
        if (payload.success) {
          const totalHands = payload.results.reduce((sum, r) => sum + (r.handsImported || 0), 0);
          const successCount = payload.results.filter(r => r.success).length;
          showToast(`✓ Bulk import complete! ${totalHands} hands from ${successCount}/${payload.results.length} folders`, 'success');
        } else {
          showToast(`⚠ Bulk import failed: ${payload.error}`, 'error');
        }
      };

      window.api?.onBulkImportStarted?.(handleStarted);
      window.api?.onBulkImportProgress?.(handleProgress);
      window.api?.onBulkImportFolderStart?.(handleFolderStart);
      window.api?.onBulkImportFolderComplete?.(handleFolderComplete);
      window.api?.onBulkImportPaused?.(handlePaused);
      window.api?.onBulkImportResumed?.(handleResumed);
      window.api?.onBulkImportCancelled?.(handleCancelled);
      window.api?.onBulkImportComplete?.(handleComplete);

      return () => {
        window.api?.removeBulkImportListeners?.();
      };
    }, []);

    const statusColor = importing ? (paused ? '#f59e0b' : '#10b981') : '#6b7280';
    const statusText = importing ? (paused ? 'Paused' : 'Importing...') : 'Ready';

    return React.createElement('div', {
      style: {
        marginBottom: 24,
        border: `2px solid ${statusColor}`,
        borderRadius: 8,
        background: '#fff',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }
    }, [
      // Header
      React.createElement('div', {
        key: 'header',
        onClick: () => setExpanded(!expanded),
        style: {
          padding: '12px 16px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: importing ? (paused ? '#fffbeb' : '#f0fdf4') : '#f9fafb',
          borderRadius: expanded ? '6px 6px 0 0' : '6px',
          transition: 'all 0.2s ease'
        }
      }, [
        React.createElement('div', {
          key: 'title',
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }
        }, [
          React.createElement('span', {
            key: 'arrow',
            style: {
              transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
              fontSize: 12
            }
          }, '▶'),
          React.createElement('span', {
            key: 'icon',
            style: { fontSize: 16 }
          }, '📦'),
          React.createElement('span', {
            key: 'text',
            style: {
              fontWeight: 600,
              fontSize: 14,
              color: '#1f2937'
            }
          }, 'Bulk Import'),
          React.createElement('span', {
            key: 'count',
            style: {
              fontSize: 12,
              color: '#6b7280',
              fontWeight: 400
            }
          }, folders.length > 0 ? `(${folders.length} folder${folders.length !== 1 ? 's' : ''})` : '(no folders)')
        ]),
        React.createElement('div', {
          key: 'status',
          style: {
            fontSize: 12,
            fontWeight: 600,
            color: statusColor
          }
        }, statusText)
      ]),
      
      // Content
      expanded ? React.createElement('div', {
        key: 'content',
        className: 'fade-in',
        style: {
          padding: 16,
          borderTop: '1px solid #e5e7eb'
        }
      }, [
        // Folder List
        folders.length > 0 ? React.createElement('div', {
          key: 'folders',
          style: {
            marginBottom: 16,
            maxHeight: 200,
            overflowY: 'auto',
            border: '1px solid #e5e7eb',
            borderRadius: 6,
            background: '#f9fafb'
          }
        }, folders.map((folder, idx) => React.createElement('div', {
          key: idx,
          style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            borderBottom: idx < folders.length - 1 ? '1px solid #e5e7eb' : 'none',
            fontSize: 12
          }
        }, [
          React.createElement('span', {
            key: 'path',
            style: {
              fontFamily: 'monospace',
              color: '#374151',
              flex: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }
          }, folder),
          !importing ? React.createElement('button', {
            key: 'remove',
            onClick: (e) => {
              e.stopPropagation();
              removeFolder(folder);
            },
            style: {
              padding: '4px 8px',
              fontSize: 11,
              border: '1px solid #dc2626',
              background: '#fef2f2',
              color: '#dc2626',
              borderRadius: 4,
              cursor: 'pointer',
              marginLeft: 8,
              transition: 'all 0.2s ease'
            }
          }, '✕') : null
        ]))) : React.createElement('div', {
          key: 'empty',
          style: {
            padding: 16,
            textAlign: 'center',
            color: '#9ca3af',
            fontSize: 13,
            marginBottom: 16
          }
        }, 'No folders added yet. Add folders to start bulk import.'),

        // Progress Display (when importing)
        importing ? React.createElement('div', {
          key: 'progress',
          style: {
            marginBottom: 16,
            padding: 12,
            background: '#f0f9ff',
            border: '1px solid #bae6fd',
            borderRadius: 6
          }
        }, [
          React.createElement('div', {
            key: 'folder-progress',
            style: {
              fontSize: 13,
              fontWeight: 600,
              color: '#0c4a6e',
              marginBottom: 8
            }
          }, `Folder ${progress.currentIndex + 1} of ${progress.totalFolders}`),
          React.createElement('div', {
            key: 'current-folder',
            style: {
              fontSize: 11,
              fontFamily: 'monospace',
              color: '#374151',
              marginBottom: 4,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }
          }, progress.currentFolder),
          React.createElement('div', {
            key: 'current-line',
            style: {
              fontSize: 11,
              color: '#6b7280',
              fontStyle: 'italic',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }
          }, progress.currentLine || 'Processing...')
        ]) : null,

        // Results Summary (after completion)
        !importing && progress.results.length > 0 ? React.createElement('div', {
          key: 'results',
          style: {
            marginBottom: 16,
            padding: 12,
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: 6
          }
        }, [
          React.createElement('div', {
            key: 'title',
            style: {
              fontSize: 13,
              fontWeight: 600,
              color: '#166534',
              marginBottom: 8
            }
          }, '✓ Import Results:'),
          ...progress.results.map((result, idx) => React.createElement('div', {
            key: idx,
            style: {
              fontSize: 11,
              color: result.success ? '#166534' : '#991b1b',
              marginBottom: 4
            }
          }, result.success 
            ? `✓ Folder ${idx + 1}: ${result.handsImported} hands (${result.filesProcessed} files)`
            : `✗ Folder ${idx + 1}: ${result.error}`
          ))
        ]) : null,

        // Action Buttons
        React.createElement('div', {
          key: 'actions',
          style: {
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap'
          }
        }, [
          !importing ? React.createElement('button', {
            key: 'add',
            onClick: addFolders,
            style: {
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 600,
              borderRadius: 6,
              border: '1px solid #3b82f6',
              background: '#eff6ff',
              color: '#1e40af',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }
          }, '+ Add Folders') : null,

          !importing && folders.length > 0 ? React.createElement('button', {
            key: 'clear',
            onClick: clearFolders,
            style: {
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 600,
              borderRadius: 6,
              border: '1px solid #6b7280',
              background: '#f3f4f6',
              color: '#374151',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }
          }, 'Clear All') : null,

          !importing && folders.length > 0 ? React.createElement('button', {
            key: 'start',
            onClick: startImport,
            style: {
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 600,
              borderRadius: 6,
              border: '1px solid #10b981',
              background: '#d1fae5',
              color: '#065f46',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }
          }, '▶ Start Import') : null,

          importing ? React.createElement('button', {
            key: 'pause',
            onClick: togglePause,
            style: {
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 600,
              borderRadius: 6,
              border: '1px solid #f59e0b',
              background: '#fef3c7',
              color: '#92400e',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }
          }, paused ? '▶ Resume' : '⏸️ Pause') : null,

          importing ? React.createElement('button', {
            key: 'cancel',
            onClick: cancelImport,
            style: {
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 600,
              borderRadius: 6,
              border: '1px solid #dc2626',
              background: '#fee2e2',
              color: '#991b1b',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }
          }, '✕ Cancel') : null
        ]),

        // Info
        React.createElement('div', {
          key: 'info',
          style: {
            marginTop: 16,
            padding: 12,
            background: '#f0f9ff',
            border: '1px solid #bae6fd',
            borderRadius: 6,
            fontSize: 12,
            color: '#0c4a6e',
            lineHeight: 1.6
          }
        }, [
          React.createElement('div', { key: 'title', style: { fontWeight: 600, marginBottom: 4 } }, 'ℹ️ Bulk Import Info:'),
          React.createElement('div', { key: 'line1' }, '• Import multiple folders in sequence'),
          React.createElement('div', { key: 'line2' }, '• Player stats rebuilt once at the end'),
          React.createElement('div', { key: 'line3' }, '• Pause/resume/cancel anytime during import'),
          React.createElement('div', { key: 'line4' }, '• View detailed results for each folder')
        ])
      ]) : null
    ]);
  }

  // Position Profitability Chart Component
  function PositionProfitabilityChart({ globalFilters }) {
    const React = window.React;
    const [data, setData] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    const [metric, setMetric] = React.useState('bbPer100'); // bbPer100, winRate_pct, vpip_pct, pfr_pct
    const [expanded, setExpanded] = React.useState(true);
    const chartRef = React.useRef(null);
    const chartInstanceRef = React.useRef(null);

    // Load data
    React.useEffect(() => {
      const fetchData = async () => {
        setLoading(true);
        try {
          const result = await window.api?.positionProfitability?.({
            stakes: globalFilters?.stakes,
            showdown: globalFilters?.showdown,
            result: globalFilters?.result,
            from: globalFilters?.from,
            to: globalFilters?.to,
            limit: globalFilters?.limit
          });
          setData(result);
        } catch (err) {
          console.error('Failed to load position profitability:', err);
          setData(null);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }, [globalFilters]);

    // Update chart when data or metric changes
    React.useEffect(() => {
      if (!data || !data.positions || !chartRef.current) return;

      const Chart = window.Chart;
      if (!Chart) {
        console.error('Chart.js not loaded');
        return;
      }

      // Destroy previous chart
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }

      const ctx = chartRef.current.getContext('2d');
      
      // Prepare data
      const positions = data.positions.filter(p => p.hands > 0);
      const labels = positions.map(p => p.position);
      const values = positions.map(p => {
        const val = p[metric] || 0;
        // For BB/100, normalize negative values for radar chart
        if (metric === 'bbPer100') {
          return val;
        }
        return val;
      });

      // Determine color based on metric
      let borderColor, backgroundColor;
      if (metric === 'bbPer100') {
        borderColor = 'rgba(34, 197, 94, 0.8)'; // green
        backgroundColor = 'rgba(34, 197, 94, 0.2)';
      } else if (metric === 'winRate_pct') {
        borderColor = 'rgba(59, 130, 246, 0.8)'; // blue
        backgroundColor = 'rgba(59, 130, 246, 0.2)';
      } else if (metric === 'vpip_pct') {
        borderColor = 'rgba(249, 115, 22, 0.8)'; // orange
        backgroundColor = 'rgba(249, 115, 22, 0.2)';
      } else if (metric === 'pfr_pct') {
        borderColor = 'rgba(168, 85, 247, 0.8)'; // purple
        backgroundColor = 'rgba(168, 85, 247, 0.2)';
      } else if (metric === 'wtsd_pct') {
        borderColor = 'rgba(236, 72, 153, 0.8)'; // pink
        backgroundColor = 'rgba(236, 72, 153, 0.2)';
      } else if (metric === 'wwsf_pct') {
        borderColor = 'rgba(20, 184, 166, 0.8)'; // teal
        backgroundColor = 'rgba(20, 184, 166, 0.2)';
      }

      const metricLabels = {
        bbPer100: 'BB/100',
        winRate_pct: 'Win Rate %',
        vpip_pct: 'VPIP %',
        pfr_pct: 'PFR %',
        wtsd_pct: 'WTSD %',
        wwsf_pct: 'WWSF %'
      };

      chartInstanceRef.current = new Chart(ctx, {
        type: 'radar',
        data: {
          labels: labels,
          datasets: [{
            label: metricLabels[metric] || metric,
            data: values,
            borderColor: borderColor,
            backgroundColor: backgroundColor,
            borderWidth: 2,
            pointBackgroundColor: borderColor,
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: borderColor,
            pointRadius: 4,
            pointHoverRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          scales: {
            r: {
              beginAtZero: metric !== 'bbPer100', // Allow negative for BB/100
              ticks: {
                backdropColor: 'transparent',
                color: '#6b7280',
                font: { size: 11 }
              },
              grid: {
                color: 'rgba(0, 0, 0, 0.1)'
              },
              pointLabels: {
                color: '#374151',
                font: { size: 12, weight: 600 }
              }
            }
          },
          plugins: {
            legend: {
              display: true,
              position: 'top',
              labels: {
                color: '#374151',
                font: { size: 12, weight: 600 }
              }
            },
            tooltip: {
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              titleColor: '#fff',
              bodyColor: '#fff',
              borderColor: borderColor,
              borderWidth: 1,
              callbacks: {
                label: function(context) {
                  const position = positions[context.dataIndex];
                  const value = context.parsed.r;
                  let label = metricLabels[metric] + ': ';
                  
                  if (metric === 'bbPer100') {
                    label += value.toFixed(2);
                  } else {
                    label += value.toFixed(1) + '%';
                  }
                  
                  label += ` (${position.hands} hands)`;
                  return label;
                }
              }
            }
          }
        }
      });

      return () => {
        if (chartInstanceRef.current) {
          chartInstanceRef.current.destroy();
          chartInstanceRef.current = null;
        }
      };
    }, [data, metric]);

    if (loading) {
      return React.createElement('div', {
        style: {
          marginBottom: 24,
          padding: 16,
          border: '2px solid #e5e7eb',
          borderRadius: 8,
          background: '#fff',
          textAlign: 'center',
          color: '#6b7280'
        }
      }, 'Loading position stats...');
    }

    if (!data || !data.positions || data.positions.length === 0) {
      return React.createElement('div', {
        style: {
          marginBottom: 24,
          padding: 16,
          border: '2px solid #e5e7eb',
          borderRadius: 8,
          background: '#fff',
          textAlign: 'center',
          color: '#6b7280'
        }
      }, 'No position data available');
    }

    return React.createElement('div', {
      style: {
        marginBottom: 24,
        border: '2px solid #3b82f6',
        borderRadius: 8,
        background: '#fff',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }
    }, [
      // Header
      React.createElement('div', {
        key: 'header',
        onClick: () => setExpanded(!expanded),
        style: {
          padding: '12px 16px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#eff6ff',
          borderRadius: expanded ? '6px 6px 0 0' : '6px',
          transition: 'all 0.2s ease'
        }
      }, [
        React.createElement('div', {
          key: 'title',
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }
        }, [
          React.createElement('span', {
            key: 'arrow',
            style: {
              transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
              fontSize: 12
            }
          }, '▶'),
          React.createElement('span', {
            key: 'icon',
            style: { fontSize: 16 }
          }, '📊'),
          React.createElement('span', {
            key: 'text',
            style: {
              fontWeight: 600,
              fontSize: 14,
              color: '#1f2937'
            }
          }, 'Position Profitability'),
          React.createElement('span', {
            key: 'count',
            style: {
              fontSize: 12,
              color: '#6b7280',
              fontWeight: 400
            }
          }, `(${data.totalHands} hands)`)
        ]),
        React.createElement('div', {
          key: 'status',
          style: {
            fontSize: 12,
            fontWeight: 600,
            color: '#3b82f6'
          }
        }, data.heroName || 'Unknown')
      ]),

      // Content
      expanded ? React.createElement('div', {
        key: 'content',
        className: 'fade-in',
        style: {
          padding: 16,
          borderTop: '1px solid #e5e7eb'
        }
      }, [
        // Metric Selector
        React.createElement('div', {
          key: 'selector',
          style: {
            marginBottom: 16,
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap'
          }
        }, [
          { value: 'bbPer100', label: 'BB/100', color: '#22c55e' },
          { value: 'winRate_pct', label: 'Win Rate %', color: '#3b82f6' },
          { value: 'vpip_pct', label: 'VPIP %', color: '#f97316' },
          { value: 'pfr_pct', label: 'PFR %', color: '#a855f7' },
          { value: 'wtsd_pct', label: 'WTSD %', color: '#ec4899' },
          { value: 'wwsf_pct', label: 'WWSF %', color: '#14b8a6' }
        ].map(({ value, label, color }) => React.createElement('button', {
          key: value,
          onClick: () => setMetric(value),
          style: {
            padding: '6px 12px',
            fontSize: 12,
            fontWeight: 600,
            borderRadius: 6,
            border: metric === value ? `2px solid ${color}` : '1px solid #d1d5db',
            background: metric === value ? `${color}20` : '#fff',
            color: metric === value ? color : '#6b7280',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }
        }, label))),

        // Export Button
        React.createElement('div', {
          key: 'export',
          style: {
            marginBottom: 16,
            display: 'flex',
            justifyContent: 'flex-end'
          }
        }, React.createElement('button', {
          onClick: async () => {
            try {
              const result = await window.api?.exportPositionCSV?.(globalFilters);
              if (result?.success) {
                showToast(`✓ Exported ${result.positionsExported} positions to ${result.filePath}`, 'success');
              } else {
                showToast(`⚠ Export failed: ${result?.message || 'Unknown error'}`, 'error');
              }
            } catch (err) {
              showToast(`⚠ Export error: ${err.message}`, 'error');
            }
          },
          style: {
            padding: '8px 16px',
            fontSize: 13,
            fontWeight: 600,
            borderRadius: 6,
            border: '1px solid #10b981',
            background: '#d1fae5',
            color: '#065f46',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }
        }, '📊 Export to CSV')),

        // Chart
        React.createElement('div', {
          key: 'chart',
          style: {
            marginBottom: 16,
            height: 350,
            position: 'relative'
          }
        }, React.createElement('canvas', {
          ref: chartRef,
          style: { maxHeight: '100%' }
        })),

        // Stats Table
        React.createElement('div', {
          key: 'table',
          style: {
            overflowX: 'auto'
          }
        }, React.createElement('table', {
          style: {
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: 12
          }
        }, [
          React.createElement('thead', { key: 'thead' }, React.createElement('tr', {
            style: {
              background: '#f3f4f6',
              borderBottom: '2px solid #d1d5db'
            }
          }, [
            'Position',
            'Hands',
            'BB/100',
            'Win %',
            'VPIP %',
            'PFR %',
            'WTSD %',
            'WWSF %'
          ].map(header => React.createElement('th', {
            key: header,
            style: {
              padding: '8px 12px',
              textAlign: 'left',
              fontWeight: 600,
              color: '#374151'
            }
          }, header)))),
          React.createElement('tbody', { key: 'tbody' }, data.positions.map((pos, idx) => React.createElement('tr', {
            key: pos.position,
            style: {
              borderBottom: '1px solid #e5e7eb',
              background: idx % 2 === 0 ? '#fff' : '#f9fafb'
            }
          }, [
            React.createElement('td', {
              key: 'pos',
              style: {
                padding: '8px 12px',
                fontWeight: 600,
                color: '#1f2937'
              }
            }, pos.position),
            React.createElement('td', {
              key: 'hands',
              style: { padding: '8px 12px', color: '#6b7280' }
            }, pos.hands),
            React.createElement('td', {
              key: 'bb100',
              style: {
                padding: '8px 12px',
                color: pos.bbPer100 >= 0 ? '#22c55e' : '#ef4444',
                fontWeight: 600
              }
            }, pos.bbPer100.toFixed(2)),
            React.createElement('td', {
              key: 'winrate',
              style: { padding: '8px 12px', color: '#3b82f6' }
            }, pos.winRate_pct.toFixed(1) + '%'),
            React.createElement('td', {
              key: 'vpip',
              style: { padding: '8px 12px', color: '#6b7280' }
            }, pos.vpip_pct.toFixed(1) + '%'),
            React.createElement('td', {
              key: 'pfr',
              style: { padding: '8px 12px', color: '#6b7280' }
            }, pos.pfr_pct.toFixed(1) + '%'),
            React.createElement('td', {
              key: 'wtsd',
              style: { padding: '8px 12px', color: '#6b7280' }
            }, pos.wtsd_pct.toFixed(1) + '%'),
            React.createElement('td', {
              key: 'wwsf',
              style: { padding: '8px 12px', color: '#6b7280' }
            }, pos.wwsf_pct.toFixed(1) + '%')
          ])))
        ]))
      ]) : null
    ]);
  }

  // ===== ANNOTATION MANAGER COMPONENT =====
  function AnnotationManager({ onUpdate }) {
    const React = window.React;
    const [annotations, setAnnotations] = React.useState([]);
    const [expanded, setExpanded] = React.useState(false);
    const [editingId, setEditingId] = React.useState(null);
    const [newLabel, setNewLabel] = React.useState('');
    const [newColor, setNewColor] = React.useState('#FF5722');
    const [newNotes, setNewNotes] = React.useState('');
    const [newDate, setNewDate] = React.useState('');
    
    // Load annotations
    React.useEffect(() => {
      loadAnnotations();
    }, []);
    
    const loadAnnotations = async () => {
      try {
        const result = await window.api?.annotationsGetAll?.();
        if (result?.success) {
          setAnnotations(result.annotations || []);
        }
      } catch (err) {
        console.error('Failed to load annotations:', err);
      }
    };
    
    const addAnnotation = async () => {
      if (!newLabel || !newDate) {
        window.__toast?.('Label and date are required', 'error');
        return;
      }
      
      const ts = new Date(newDate).getTime();
      
      try {
        const result = await window.api?.annotationsAdd?.({
          ts,
          date: newDate,
          label: newLabel,
          color: newColor,
          notes: newNotes
        });
        
        if (result?.success) {
          window.__toast?.('✓ Annotation added', 'success');
          setNewLabel('');
          setNewNotes('');
          setNewDate('');
          loadAnnotations();
          if (onUpdate) onUpdate();
        } else {
          window.__toast?.(`⚠ ${result?.message || 'Failed to add annotation'}`, 'error');
        }
      } catch (err) {
        window.__toast?.(`⚠ ${err.message}`, 'error');
      }
    };
    
    const deleteAnnotation = async (id) => {
      if (!confirm('Delete this annotation?')) return;
      
      try {
        const result = await window.api?.annotationsDelete?.(id);
        if (result?.success) {
          window.__toast?.('✓ Annotation deleted', 'success');
          loadAnnotations();
          if (onUpdate) onUpdate();
        }
      } catch (err) {
        window.__toast?.(`⚠ ${err.message}`, 'error');
      }
    };
    
    const colorPresets = ['#FF5722', '#2196F3', '#4CAF50', '#FFC107', '#9C27B0', '#F44336'];
    
    return React.createElement('div', {
      style: {
        background: '#fff',
        borderRadius: 12,
        boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
        overflow: 'hidden',
        marginBottom: 16
      }
    }, [
      // Header
      React.createElement('div', {
        key: 'header',
        onClick: () => setExpanded(!expanded),
        style: {
          padding: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          background: '#f9fafb',
          borderBottom: expanded ? '1px solid #e5e7eb' : 'none'
        }
      }, [
        React.createElement('div', {
          key: 'title',
          style: {
            display: 'flex',
            gap: 12,
            alignItems: 'center'
          }
        }, [
          React.createElement('span', { key: 'icon', style: { fontSize: 16 } }, '📍'),
          React.createElement('span', {
            key: 'text',
            style: { fontWeight: 600, fontSize: 14, color: '#1f2937' }
          }, 'Graph Annotations'),
          React.createElement('span', {
            key: 'count',
            style: { fontSize: 12, color: '#6b7280', fontWeight: 400 }
          }, `(${annotations.length})`)
        ]),
        React.createElement('div', {
          key: 'toggle',
          style: {
            fontSize: 12,
            fontWeight: 600,
            color: '#3b82f6'
          }
        }, expanded ? '▼' : '►')
      ]),
      
      // Content
      expanded ? React.createElement('div', {
        key: 'content',
        className: 'fade-in',
        style: {
          padding: 16
        }
      }, [
        // New Annotation Form
        React.createElement('div', {
          key: 'form',
          style: {
            padding: 12,
            background: '#f9fafb',
            borderRadius: 8,
            marginBottom: 16
          }
        }, [
          React.createElement('div', {
            key: 'title',
            style: {
              fontSize: 13,
              fontWeight: 600,
              color: '#374151',
              marginBottom: 12
            }
          }, 'Add New Annotation'),
          
          React.createElement('div', {
            key: 'inputs',
            style: {
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 8,
              marginBottom: 8
            }
          }, [
            React.createElement('input', {
              key: 'label',
              type: 'text',
              placeholder: 'Label (e.g., Big Win)',
              value: newLabel,
              onChange: (e) => setNewLabel(e.target.value),
              style: {
                padding: '8px 12px',
                fontSize: 13,
                border: '1px solid #d1d5db',
                borderRadius: 6
              }
            }),
            React.createElement('input', {
              key: 'date',
              type: 'date',
              value: newDate,
              onChange: (e) => setNewDate(e.target.value),
              style: {
                padding: '8px 12px',
                fontSize: 13,
                border: '1px solid #d1d5db',
                borderRadius: 6
              }
            })
          ]),
          
          React.createElement('textarea', {
            key: 'notes',
            placeholder: 'Notes (optional)',
            value: newNotes,
            onChange: (e) => setNewNotes(e.target.value),
            rows: 2,
            style: {
              width: '100%',
              padding: '8px 12px',
              fontSize: 13,
              border: '1px solid #d1d5db',
              borderRadius: 6,
              marginBottom: 8,
              resize: 'vertical'
            }
          }),
          
          React.createElement('div', {
            key: 'colorPicker',
            style: {
              display: 'flex',
              gap: 6,
              marginBottom: 8,
              alignItems: 'center'
            }
          }, [
            React.createElement('span', {
              key: 'label',
              style: { fontSize: 12, color: '#6b7280' }
            }, 'Color:'),
            ...colorPresets.map(color => React.createElement('button', {
              key: color,
              onClick: () => setNewColor(color),
              style: {
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: color,
                border: newColor === color ? '2px solid #000' : '1px solid #d1d5db',
                cursor: 'pointer'
              }
            }))
          ]),
          
          React.createElement('button', {
            key: 'addBtn',
            onClick: addAnnotation,
            style: {
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 600,
              borderRadius: 6,
              border: 'none',
              background: '#3b82f6',
              color: '#fff',
              cursor: 'pointer'
            }
          }, '+ Add Annotation')
        ]),
        
        // Annotations List
        annotations.length > 0 ? React.createElement('div', {
          key: 'list',
          style: {
            display: 'flex',
            flexDirection: 'column',
            gap: 8
          }
        }, annotations.map(ann => React.createElement('div', {
          key: ann.id,
          style: {
            padding: 12,
            background: '#f9fafb',
            borderRadius: 8,
            borderLeft: `4px solid ${ann.color || '#FF5722'}`
          }
        }, [
          React.createElement('div', {
            key: 'header',
            style: {
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'start',
              marginBottom: 4
            }
          }, [
            React.createElement('div', {
              key: 'info',
              style: { flex: 1 }
            }, [
              React.createElement('div', {
                key: 'label',
                style: {
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#1f2937'
                }
              }, ann.label),
              React.createElement('div', {
                key: 'date',
                style: {
                  fontSize: 12,
                  color: '#6b7280',
                  marginTop: 2
                }
              }, ann.date)
            ]),
            React.createElement('button', {
              key: 'delete',
              onClick: () => deleteAnnotation(ann.id),
              style: {
                padding: '4px 8px',
                fontSize: 12,
                border: '1px solid #ef4444',
                background: '#fee2e2',
                color: '#991b1b',
                borderRadius: 4,
                cursor: 'pointer'
              }
            }, '🗑️ Delete')
          ]),
          ann.notes ? React.createElement('div', {
            key: 'notes',
            style: {
              fontSize: 12,
              color: '#4b5563',
              marginTop: 8,
              fontStyle: 'italic'
            }
          }, ann.notes) : null
        ]))) : React.createElement('div', {
          key: 'empty',
          style: {
            padding: 16,
            textAlign: 'center',
            color: '#9ca3af',
            fontSize: 13
          }
        }, 'No annotations yet. Add one above!')
      ]) : null
    ]);
  }

  // ===== OPPONENT ANALYSIS COMPONENT =====
  function OpponentAnalysis() {
    const React = window.React;
    const [opponents, setOpponents] = React.useState([]);
    const [loading, setLoading] = React.useState(false);
    const [expanded, setExpanded] = React.useState(false);
    const [selectedOpponent, setSelectedOpponent] = React.useState(null);
    const [headToHead, setHeadToHead] = React.useState(null);
    const [h2hLoading, setH2hLoading] = React.useState(false);
    const [searchTerm, setSearchTerm] = React.useState('');
    const [minHands, setMinHands] = React.useState(10);
    const [sortBy, setSortBy] = React.useState('hands'); // hands, bbPer100, winRate
    const [sortDesc, setSortDesc] = React.useState(true);
    
    const chartRef = React.useRef(null);
    const canvasRef = React.useRef(null);
    
    // Get color for BB/100 based on percentile within dataset
    const getBB100ColorByPercentile = (bbPer100, allValues) => {
      if (!Array.isArray(allValues) || allValues.length === 0) {
        // Fallback to simple green/red if no dataset
        return bbPer100 >= 0 ? '#22c55e' : '#ef4444';
      }
      
      // Sort all values to find percentiles
      const sorted = [...allValues].sort((a, b) => b - a);
      const rank = sorted.findIndex(v => v <= bbPer100);
      const percentile = rank === -1 ? 100 : (rank / sorted.length) * 100;
      
      // Color based on percentile ranking
      if (percentile <= 5) return '#166534';   // Top 5%: Very dark green
      if (percentile <= 10) return '#15803d';  // Top 10%: Dark green
      if (percentile <= 25) return '#22c55e';  // Top 25%: Medium green
      if (percentile <= 40) return '#4ade80';  // Top 40%: Light green
      if (percentile <= 60) return '#86efac';  // Middle 60%: Very light green
      if (percentile <= 75) return '#fca5a5';  // Bottom 40%: Light red
      if (percentile <= 90) return '#f87171';  // Bottom 25%: Medium red
      if (percentile <= 95) return '#ef4444';  // Bottom 10%: Dark red
      return '#dc2626';                         // Bottom 5%: Very dark red
    };
    
    // Load opponents
    const loadOpponents = React.useCallback(async () => {
      setLoading(true);
      try {
        const result = await window.api?.opponentsList?.({ minHands });
        if (result?.success) {
          setOpponents(result.opponents || []);
        }
      } catch (err) {
        console.error('Failed to load opponents:', err);
      } finally {
        setLoading(false);
      }
    }, [minHands]);
    
    React.useEffect(() => {
      if (expanded) {
        loadOpponents();
      }
    }, [expanded, loadOpponents]);
    
    // Load head-to-head when opponent selected
    React.useEffect(() => {
      if (!selectedOpponent) {
        setHeadToHead(null);
        return;
      }
      
      const loadH2H = async () => {
        setH2hLoading(true);
        try {
          const result = await window.api?.opponentsHeadToHead?.({ opponentName: selectedOpponent });
          if (result?.success) {
            setHeadToHead(result);
          }
        } catch (err) {
          console.error('Failed to load head-to-head:', err);
        } finally {
          setH2hLoading(false);
        }
      };
      
      loadH2H();
    }, [selectedOpponent]);
    
    // Create head-to-head chart
    React.useEffect(() => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
      
      if (!window.Chart || !canvasRef.current || !headToHead?.timeline?.length) return;
      
      const ctx = canvasRef.current.getContext('2d');
      const timeline = headToHead.timeline;
      
      chartRef.current = new window.Chart(ctx, {
        type: 'line',
        data: {
          datasets: [{
            label: headToHead.heroName + ' vs ' + headToHead.opponentName,
            data: timeline.map(point => ({ x: point.index, y: point.cumBB })),
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59,130,246,0.1)',
            borderWidth: 2,
            pointRadius: 2,
            pointHoverRadius: 5,
            tension: 0.25,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          plugins: {
            legend: { display: true, position: 'top' },
            tooltip: {
              callbacks: {
                title: (items) => {
                  if (!items?.length) return '';
                  const point = timeline[items[0].dataIndex];
                  return point?.date || `Hand ${point?.index}`;
                },
                label: (context) => {
                  const point = timeline[context.dataIndex];
                  return [
                    `Cumulative: ${point.cumBB.toFixed(2)} BB`,
                    `This hand: ${point.netBB > 0 ? '+' : ''}${point.netBB.toFixed(2)} BB`,
                    `Position: ${point.position}`,
                    point.showdown ? (point.won ? '✓ Won at showdown' : '✗ Lost at showdown') : ''
                  ].filter(Boolean);
                }
              }
            }
          },
          scales: {
            x: { title: { display: true, text: 'Hand #' } },
            y: { title: { display: true, text: 'Cumulative BB' } }
          }
        }
      });
      
      return () => {
        if (chartRef.current) {
          chartRef.current.destroy();
          chartRef.current = null;
        }
      };
    }, [headToHead]);
    
    // Export head-to-head chart
    const exportH2HChart = React.useCallback(() => {
      if (!chartRef.current) {
        if (window.__toast) window.__toast('No chart to export', 'error', 2000);
        return;
      }
      
      try {
        const url = chartRef.current.toBase64Image();
        const link = document.createElement('a');
        const opponentSlug = selectedOpponent?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'opponent';
        link.download = `h2h_${opponentSlug}_${new Date().toISOString().split('T')[0]}.png`;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        if (window.__toast) window.__toast('✓ Chart exported', 'success', 2000);
      } catch (error) {
        if (window.__toast) window.__toast(`✕ Export failed: ${error.message}`, 'error', 3000);
      }
    }, [selectedOpponent]);
    
    // Filter and sort opponents
    const filteredOpponents = React.useMemo(() => {
      let filtered = opponents.filter(opp => 
        opp.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      filtered.sort((a, b) => {
        const aVal = a[sortBy] || 0;
        const bVal = b[sortBy] || 0;
        return sortDesc ? bVal - aVal : aVal - bVal;
      });
      
      return filtered;
    }, [opponents, searchTerm, sortBy, sortDesc]);
    
    const toggleSort = (field) => {
      if (sortBy === field) {
        setSortDesc(!sortDesc);
      } else {
        setSortBy(field);
        setSortDesc(true);
      }
    };
    
    return React.createElement('div', {
      style: {
        background: '#fff',
        borderRadius: 12,
        boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
        overflow: 'hidden',
        marginBottom: 16
      }
    }, [
      // Header
      React.createElement('div', {
        key: 'header',
        onClick: () => setExpanded(!expanded),
        style: {
          padding: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          background: '#f9fafb',
          borderBottom: expanded ? '1px solid #e5e7eb' : 'none'
        }
      }, [
        React.createElement('div', {
          key: 'title',
          style: { display: 'flex', gap: 12, alignItems: 'center' }
        }, [
          React.createElement('span', { key: 'icon', style: { fontSize: 16 } }, '🎯'),
          React.createElement('span', {
            key: 'text',
            style: { fontWeight: 600, fontSize: 14, color: '#1f2937' }
          }, 'Opponent Analysis'),
          React.createElement('span', {
            key: 'count',
            style: { fontSize: 12, color: '#6b7280', fontWeight: 400 }
          }, `(${opponents.length} opponents)`)
        ]),
        React.createElement('div', {
          key: 'toggle',
          style: { fontSize: 12, fontWeight: 600, color: '#3b82f6' }
        }, expanded ? '▼' : '►')
      ]),
      
      // Content
      expanded ? React.createElement('div', {
        key: 'content',
        className: 'fade-in',
        style: { padding: 16 }
      }, [
        // Controls
        React.createElement('div', {
          key: 'controls',
          style: {
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            gap: 8,
            marginBottom: 16
          }
        }, [
          React.createElement('input', {
            key: 'search',
            type: 'text',
            placeholder: 'Search opponents...',
            value: searchTerm,
            onChange: (e) => setSearchTerm(e.target.value),
            style: {
              padding: '8px 12px',
              fontSize: 13,
              border: '1px solid #d1d5db',
              borderRadius: 6
            }
          }),
          React.createElement('div', {
            key: 'minHands',
            style: { display: 'flex', gap: 8, alignItems: 'center' }
          }, [
            React.createElement('label', {
              key: 'label',
              style: { fontSize: 12, color: '#6b7280' }
            }, 'Min hands:'),
            React.createElement('input', {
              key: 'input',
              type: 'number',
              value: minHands,
              onChange: (e) => setMinHands(Number(e.target.value)),
              min: 1,
              style: {
                width: 80,
                padding: '6px 8px',
                fontSize: 13,
                border: '1px solid #d1d5db',
                borderRadius: 6
              }
            }),
            React.createElement('button', {
              key: 'refresh',
              onClick: loadOpponents,
              disabled: loading,
              style: {
                padding: '6px 12px',
                fontSize: 13,
                fontWeight: 600,
                border: '1px solid #3b82f6',
                background: '#eff6ff',
                color: '#1e40af',
                borderRadius: 6,
                cursor: loading ? 'wait' : 'pointer'
              }
            }, loading ? '⏳' : '🔄 Refresh')
          ])
        ]),
        
        // Opponent list or head-to-head view
        selectedOpponent ? React.createElement('div', {
          key: 'h2h',
          style: { display: 'flex', flexDirection: 'column', gap: 16 }
        }, [
          // Back button
          React.createElement('button', {
            key: 'back',
            onClick: () => setSelectedOpponent(null),
            style: {
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 600,
              border: '1px solid #d1d5db',
              background: '#fff',
              color: '#374151',
              borderRadius: 6,
              cursor: 'pointer',
              alignSelf: 'flex-start'
            }
          }, '← Back to List'),
          
          h2hLoading ? React.createElement('div', {
            key: 'loading',
            style: { padding: 32, textAlign: 'center', color: '#6b7280' }
          }, '⏳ Loading head-to-head stats...') : headToHead ? [
            // Summary stats
            React.createElement('div', {
              key: 'summary',
              style: {
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: 12
              }
            }, [
              React.createElement('div', {
                key: 'hands',
                style: {
                  padding: 12,
                  background: '#f3f4f6',
                  borderRadius: 8
                }
              }, [
                React.createElement('div', {
                  key: 'label',
                  style: { fontSize: 11, color: '#6b7280', textTransform: 'uppercase', marginBottom: 4 }
                }, 'Total Hands'),
                React.createElement('div', {
                  key: 'value',
                  style: { fontSize: 20, fontWeight: 600, color: '#1f2937' }
                }, headToHead.totalHands)
              ]),
              React.createElement('div', {
                key: 'bb100',
                style: {
                  padding: 12,
                  background: '#f3f4f6',
                  borderRadius: 8
                }
              }, [
                React.createElement('div', {
                  key: 'label',
                  style: { fontSize: 11, color: '#6b7280', textTransform: 'uppercase', marginBottom: 4 }
                }, 'BB/100'),
                React.createElement('div', {
                  key: 'value',
                  style: {
                    fontSize: 20,
                    fontWeight: 600,
                    color: headToHead.bbPer100 >= 5 ? '#22c55e' : headToHead.bbPer100 >= 0 ? '#86efac' : headToHead.bbPer100 >= -5 ? '#fca5a5' : '#ef4444'
                  }
                }, (headToHead.bbPer100 >= 0 ? '+' : '') + headToHead.bbPer100.toFixed(2))
              ]),
              React.createElement('div', {
                key: 'net',
                style: {
                  padding: 12,
                  background: '#f3f4f6',
                  borderRadius: 8
                }
              }, [
                React.createElement('div', {
                  key: 'label',
                  style: { fontSize: 11, color: '#6b7280', textTransform: 'uppercase', marginBottom: 4 }
                }, 'Net BB'),
                React.createElement('div', {
                  key: 'value',
                  style: {
                    fontSize: 20,
                    fontWeight: 600,
                    color: headToHead.netBB >= 10 ? '#22c55e' : headToHead.netBB >= 0 ? '#86efac' : headToHead.netBB >= -10 ? '#fca5a5' : '#ef4444'
                  }
                }, (headToHead.netBB >= 0 ? '+' : '') + headToHead.netBB.toFixed(2))
              ]),
              React.createElement('div', {
                key: 'showdown',
                style: {
                  padding: 12,
                  background: '#f3f4f6',
                  borderRadius: 8
                }
              }, [
                React.createElement('div', {
                  key: 'label',
                  style: { fontSize: 11, color: '#6b7280', textTransform: 'uppercase', marginBottom: 4 }
                }, 'Showdown Win %'),
                React.createElement('div', {
                  key: 'value',
                  style: { fontSize: 20, fontWeight: 600, color: '#3b82f6' }
                }, headToHead.showdownWinRate.toFixed(1) + '%')
              ])
            ]),
            
            // Export button
            React.createElement('div', {
              key: 'export-controls',
              style: { display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }
            }, React.createElement('button', {
              onClick: exportH2HChart,
              style: {
                padding: '6px 12px',
                fontSize: 12,
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer'
              }
            }, '📥 Export Chart')),
            
            // Chart
            React.createElement('div', {
              key: 'chart',
              style: { height: 300, background: '#f9fafb', borderRadius: 8, padding: 12 }
            }, React.createElement('canvas', { ref: canvasRef, style: { width: '100%', height: '100%' } })),
            
            // Position breakdown
            headToHead.positionStats?.length > 0 ? React.createElement('div', {
              key: 'positions',
              style: { marginTop: 16 }
            }, [
              React.createElement('div', {
                key: 'title',
                style: {
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#374151',
                  marginBottom: 12
                }
              }, 'Performance by Position'),
              React.createElement('div', {
                key: 'table',
                style: { overflowX: 'auto' }
              }, React.createElement('table', {
                style: {
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: 13
                }
              }, [
                React.createElement('thead', { key: 'thead' }, React.createElement('tr', {
                  style: { background: '#f3f4f6', borderBottom: '2px solid #e5e7eb' }
                }, [
                  React.createElement('th', {
                    key: 'pos',
                    style: { padding: '8px 12px', textAlign: 'left', fontWeight: 600 }
                  }, 'Position'),
                  React.createElement('th', {
                    key: 'hands',
                    style: { padding: '8px 12px', textAlign: 'left', fontWeight: 600 }
                  }, 'Hands'),
                  React.createElement('th', {
                    key: 'bb100',
                    style: { padding: '8px 12px', textAlign: 'left', fontWeight: 600 }
                  }, 'BB/100'),
                  React.createElement('th', {
                    key: 'net',
                    style: { padding: '8px 12px', textAlign: 'left', fontWeight: 600 }
                  }, 'Net BB'),
                  React.createElement('th', {
                    key: 'win',
                    style: { padding: '8px 12px', textAlign: 'left', fontWeight: 600 }
                  }, 'Win Rate %')
                ])),
                React.createElement('tbody', { key: 'tbody' }, headToHead.positionStats.map((pos, idx) => {
                  // Extract all BB/100 values for percentile calculation
                  const allPosBB100Values = headToHead.positionStats.map(p => p.bbPer100);
                  
                  return React.createElement('tr', {
                  key: pos.position,
                  style: {
                    borderBottom: '1px solid #e5e7eb',
                    background: idx % 2 === 0 ? '#fff' : '#f9fafb'
                  }
                }, [
                  React.createElement('td', {
                    key: 'pos',
                    style: { padding: '8px 12px', fontWeight: 600 }
                  }, pos.position),
                  React.createElement('td', {
                    key: 'hands',
                    style: { padding: '8px 12px', color: '#6b7280' }
                  }, pos.hands),
                  React.createElement('td', {
                    key: 'bb100',
                    style: {
                      padding: '8px 12px',
                      color: getBB100ColorByPercentile(pos.bbPer100, allPosBB100Values),
                      fontWeight: 600
                    }
                  }, (pos.bbPer100 >= 0 ? '+' : '') + pos.bbPer100.toFixed(2)),
                  React.createElement('td', {
                    key: 'net',
                    style: {
                      padding: '8px 12px',
                      color: getBB100ColorByPercentile(pos.netBB / (pos.hands || 1) * 100, allPosBB100Values)
                    }
                  }, (pos.netBB >= 0 ? '+' : '') + pos.netBB.toFixed(2)),
                  React.createElement('td', {
                    key: 'win',
                    style: { padding: '8px 12px', color: '#3b82f6' }
                  }, pos.winRate.toFixed(1) + '%')
                ]);
                }))
              ]))
            ]) : null
          ] : null
        ]) : React.createElement('div', {
          key: 'list'
        }, [
          // Opponents table
          filteredOpponents.length > 0 ? React.createElement('div', {
            key: 'table',
            style: { overflowX: 'auto' }
          }, React.createElement('table', {
            style: {
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 13
            }
          }, [
            React.createElement('thead', { key: 'thead' }, React.createElement('tr', {
              style: { background: '#f3f4f6', borderBottom: '2px solid #e5e7eb' }
            }, [
              React.createElement('th', {
                key: 'name',
                onClick: () => toggleSort('name'),
                style: {
                  padding: '8px 12px',
                  textAlign: 'left',
                  fontWeight: 600,
                  cursor: 'pointer',
                  userSelect: 'none'
                }
              }, 'Opponent ' + (sortBy === 'name' ? (sortDesc ? '▼' : '▲') : '')),
              React.createElement('th', {
                key: 'hands',
                onClick: () => toggleSort('hands'),
                style: {
                  padding: '8px 12px',
                  textAlign: 'left',
                  fontWeight: 600,
                  cursor: 'pointer',
                  userSelect: 'none'
                }
              }, 'Hands ' + (sortBy === 'hands' ? (sortDesc ? '▼' : '▲') : '')),
              React.createElement('th', {
                key: 'bb100',
                onClick: () => toggleSort('bbPer100'),
                style: {
                  padding: '8px 12px',
                  textAlign: 'left',
                  fontWeight: 600,
                  cursor: 'pointer',
                  userSelect: 'none'
                }
              }, 'BB/100 ' + (sortBy === 'bbPer100' ? (sortDesc ? '▼' : '▲') : '')),
              React.createElement('th', {
                key: 'win',
                onClick: () => toggleSort('winRate'),
                style: {
                  padding: '8px 12px',
                  textAlign: 'left',
                  fontWeight: 600,
                  cursor: 'pointer',
                  userSelect: 'none'
                }
              }, 'Win % ' + (sortBy === 'winRate' ? (sortDesc ? '▼' : '▲') : '')),
              React.createElement('th', {
                key: 'vpip',
                style: { padding: '8px 12px', textAlign: 'left', fontWeight: 600 }
              }, 'VPIP %'),
              React.createElement('th', {
                key: 'pfr',
                style: { padding: '8px 12px', textAlign: 'left', fontWeight: 600 }
              }, 'PFR %'),
              React.createElement('th', {
                key: 'action',
                style: { padding: '8px 12px', textAlign: 'left', fontWeight: 600 }
              }, '')
            ])),
            React.createElement('tbody', { key: 'tbody' }, filteredOpponents.map((opp, idx) => {
              // Extract all BB/100 values for percentile calculation
              const allBB100Values = filteredOpponents.map(o => o.bbPer100);
              
              return React.createElement('tr', {
              key: opp.name,
              style: {
                borderBottom: '1px solid #e5e7eb',
                background: idx % 2 === 0 ? '#fff' : '#f9fafb'
              }
            }, [
              React.createElement('td', {
                key: 'name',
                style: { padding: '8px 12px', fontWeight: 600, color: '#1f2937' }
              }, opp.name),
              React.createElement('td', {
                key: 'hands',
                style: { padding: '8px 12px', color: '#6b7280' }
              }, opp.hands),
              React.createElement('td', {
                key: 'bb100',
                style: {
                  padding: '8px 12px',
                  color: getBB100ColorByPercentile(opp.bbPer100, allBB100Values),
                  fontWeight: 600
                }
              }, (opp.bbPer100 >= 0 ? '+' : '') + opp.bbPer100.toFixed(2)),
              React.createElement('td', {
                key: 'win',
                style: { padding: '8px 12px', color: '#3b82f6' }
              }, opp.winRate.toFixed(1) + '%'),
              React.createElement('td', {
                key: 'vpip',
                style: { padding: '8px 12px', color: '#6b7280' }
              }, opp.vpip.toFixed(1) + '%'),
              React.createElement('td', {
                key: 'pfr',
                style: { padding: '8px 12px', color: '#6b7280' }
              }, opp.pfr.toFixed(1) + '%'),
              React.createElement('td', {
                key: 'action',
                style: { padding: '8px 12px' }
              }, React.createElement('button', {
                onClick: () => setSelectedOpponent(opp.name),
                style: {
                  padding: '4px 12px',
                  fontSize: 12,
                  fontWeight: 600,
                  border: '1px solid #3b82f6',
                  background: '#eff6ff',
                  color: '#1e40af',
                  borderRadius: 4,
                  cursor: 'pointer'
                }
              }, 'View H2H'))
            ]);
            }))
          ])) : React.createElement('div', {
            key: 'empty',
            style: {
              padding: 32,
              textAlign: 'center',
              color: '#9ca3af',
              fontSize: 13
            }
          }, loading ? '⏳ Loading opponents...' : 'No opponents found. Try lowering the minimum hands filter.')
        ])
      ]) : null
    ]);
  }

  function App() {
    const React = window.React;
    const [tab, setTab] = React.useState(() => {
      if (typeof window !== 'undefined') {
        try { return window.localStorage?.getItem('ui.tab') || 'stats'; } catch {}
      }
      return 'stats';
    });
    
    // Theme state with localStorage persistence
    const [theme, setTheme] = React.useState(() => {
      if (typeof window !== 'undefined') {
        try { 
          const saved = window.localStorage?.getItem('ui.theme');
          return saved || 'light';
        } catch {}
      }
      return 'light';
    });
    
    // Theme toggle function (defined before useEffect that uses it)
    const toggleTheme = React.useCallback(() => {
      setTheme(prev => {
        const newTheme = prev === 'light' ? 'dark' : 'light';
        const icon = newTheme === 'dark' ? '🌙' : '☀️';
        const label = newTheme === 'dark' ? 'Dark' : 'Light';
        window.__toast?.(`${icon} ${label} mode activated`, 'info', 2000);
        return newTheme;
      });
    }, []);
    
    // Apply theme to document root
    React.useEffect(() => {
      document.documentElement.setAttribute('data-theme', theme);
      try {
        localStorage.setItem('ui.theme', theme);
      } catch (e) {
        // Ignore localStorage errors
      }
      
      // Update theme button icon
      const themeBtn = document.getElementById('theme-toggle');
      if (themeBtn) {
        themeBtn.innerHTML = theme === 'dark' ? '☀️' : '🌙';
        themeBtn.title = theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode';
      }
    }, [theme]);
    
    // Wire up theme toggle button
    React.useEffect(() => {
      const themeBtn = document.getElementById('theme-toggle');
      if (themeBtn && !themeBtn.__themeWired) {
        themeBtn.__themeWired = true;
        themeBtn.addEventListener('click', toggleTheme);
      }
    }, [toggleTheme]);
    
    const [selectedHandId, setSelectedHandId] = React.useState(null);
    const [showShortcutsHelp, setShowShortcutsHelp] = React.useState(false);
    
    // Global filter state shared between Dashboard and Hand Browser
    const [globalFilters, setGlobalFilters] = React.useState(() => {
      // TEMPORARY: Clear old cached filters to fix stuck date filter issue
      try {
        localStorage.removeItem('globalFilters');
      } catch (e) {
        // Ignore
      }
      return {
        stake: 'all',
        position: 'all',
        showdown: 'all',
        result: 'all',
        from: '',
        to: '',
        handRange: 'all',
        stackDepth: 'all',
        actionType: 'all',
        potSize: 'all',
        minBetSize: '',
        maxBetSize: '',
      };
    });
    
    // Save global filters to localStorage whenever they change
    React.useEffect(() => {
      try {
        localStorage.setItem('globalFilters', JSON.stringify(globalFilters));
      } catch (e) {
        // Ignore localStorage errors
      }
    }, [globalFilters]);

    React.useEffect(() => {
      window.__setTab = (next) => setTab((prev) => {
        const value = next || 'stats';
        if (typeof window !== 'undefined') {
          try { window.localStorage?.setItem('ui.tab', value); } catch {}
        }
        const ids = ['tab-stats', 'tab-browser', 'tab-sessions', 'tab-reports', 'tab-dashboard'];
        ids.forEach((id) => {
          const el = document.getElementById(id);
          if (!el) return;
          const isActive = (id === 'tab-stats' && value === 'stats') || (id === 'tab-browser' && value === 'browser') || (id === 'tab-sessions' && value === 'sessions') || (id === 'tab-reports' && value === 'reports') || (id === 'tab-dashboard' && value === 'dashboard');
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
      const ids = ['tab-stats', 'tab-browser', 'tab-sessions', 'tab-reports', 'tab-dashboard'];
      ids.forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        const isActive = (id === 'tab-stats' && tab === 'stats') || (id === 'tab-browser' && tab === 'browser') || (id === 'tab-sessions' && tab === 'sessions') || (id === 'tab-reports' && tab === 'reports') || (id === 'tab-dashboard' && tab === 'dashboard');
        el.classList.toggle('active', isActive);
      });
    }, [tab]);

    // Enhanced keyboard shortcuts
    React.useEffect(() => {
      const handleKeyDown = (e) => {
        // Ignore if typing in input/textarea (except Esc and ?)
        const isTyping = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA';
        if (isTyping && e.key !== 'Escape' && e.key !== '?') return;
        
        // ? or Ctrl+/ - Show keyboard shortcuts help
        if (e.key === '?' || (e.ctrlKey && e.key === '/')) {
          e.preventDefault();
          setShowShortcutsHelp(prev => !prev);
          return;
        }
        
        // Esc - Clear focus/close modals/reset filters
        if (e.key === 'Escape') {
          e.preventDefault();
          
          // Close shortcuts help if open
          if (showShortcutsHelp) {
            setShowShortcutsHelp(false);
            return;
          }
          
          // Blur any focused input
          if (document.activeElement) {
            document.activeElement.blur();
          }
          // Close import modal if open
          const overlay = document.getElementById('import-overlay');
          if (overlay && overlay.classList.contains('show')) {
            overlay.classList.remove('show');
            return;
          }
        }
        // Arrow Left - Previous tab
        else if (e.key === 'ArrowLeft' && e.altKey) {
          e.preventDefault();
          const tabs = ['stats', 'browser', 'sessions', 'reports', 'dashboard'];
          const currentIndex = tabs.indexOf(tab);
          const prevIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
          setTab(tabs[prevIndex]);
        }
        // Arrow Right - Next tab
        else if (e.key === 'ArrowRight' && e.altKey) {
          e.preventDefault();
          const tabs = ['stats', 'browser', 'sessions', 'reports', 'dashboard'];
          const currentIndex = tabs.indexOf(tab);
          const nextIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
          setTab(tabs[nextIndex]);
        }
        // Ctrl+1 - Player Stats
        else if (e.ctrlKey && e.key === '1') {
          e.preventDefault();
          setTab('stats');
        }
        // Ctrl+2 - Hand Browser
        else if (e.ctrlKey && e.key === '2') {
          e.preventDefault();
          setTab('browser');
        }
        // Ctrl+3 - Sessions
        else if (e.ctrlKey && e.key === '3') {
          e.preventDefault();
          setTab('sessions');
        }
        // Ctrl+4 - Reports
        else if (e.ctrlKey && e.key === '4') {
          e.preventDefault();
          setTab('reports');
        }
        // Ctrl+5 - Dashboard
        else if (e.ctrlKey && e.key === '5') {
          e.preventDefault();
          setTab('dashboard');
        }
        // Ctrl+F - Focus search
        else if (e.ctrlKey && e.key === 'f' && tab !== 'browser') {
          e.preventDefault();
          const searchInput = document.querySelector('input[placeholder*="Search"], input[placeholder*="search"]');
          if (searchInput) {
            searchInput.focus();
            searchInput.select();
          }
        }
        // Ctrl+R - Refresh data
        else if (e.ctrlKey && e.key === 'r') {
          e.preventDefault();
          if (window.__pub?.emit) {
            window.__pub.emit('data:refresh');
            if (window.__toast) {
              window.__toast('Refreshing data...', 'info', 2000);
            }
          }
        }
        // Ctrl+0 - Collapse all panels
        else if (e.ctrlKey && e.key === '0') {
          e.preventDefault();
          if (window.__pub?.emit) {
            window.__pub.emit('panels:collapseAll');
            if (window.__toast) {
              window.__toast('📦 All panels collapsed', 'info', 2000);
            }
          }
        }
        // Ctrl+9 - Expand all panels
        else if (e.ctrlKey && e.key === '9') {
          e.preventDefault();
          if (window.__pub?.emit) {
            window.__pub.emit('panels:expandAll');
            if (window.__toast) {
              window.__toast('📂 All panels expanded', 'info', 2000);
            }
          }
        }
        // Ctrl+E - Export (context-sensitive)
        else if (e.ctrlKey && e.key === 'e') {
          e.preventDefault();
          if (tab === 'dashboard') {
            // Trigger export graph
            const exportBtn = document.querySelector('button[onclick*="export"]');
            if (exportBtn) exportBtn.click();
          }
          if (window.__toast) {
            window.__toast('Export triggered', 'success', 1500);
          }
        }
      };
      
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [tab, showShortcutsHelp]);

    // Keyboard Shortcuts Help Modal Component
    const ShortcutsHelpModal = () => {
      if (!showShortcutsHelp) return null;
      
      const shortcuts = [
        { category: 'Navigation', items: [
          { keys: ['Ctrl', '1'], description: 'Player Stats tab' },
          { keys: ['Ctrl', '2'], description: 'Hand Browser tab' },
          { keys: ['Ctrl', '3'], description: 'Sessions tab' },
          { keys: ['Ctrl', '4'], description: 'Reports tab' },
          { keys: ['Ctrl', '5'], description: 'Dashboard tab' },
          { keys: ['Alt', '←'], description: 'Previous tab' },
          { keys: ['Alt', '→'], description: 'Next tab' },
        ]},
        { category: 'Actions', items: [
          { keys: ['Ctrl', 'F'], description: 'Focus search' },
          { keys: ['Ctrl', 'R'], description: 'Refresh data' },
          { keys: ['Ctrl', 'E'], description: 'Export current view' },
          { keys: ['Esc'], description: 'Close modals / Clear focus' },
        ]},
        { category: 'Panels', items: [
          { keys: ['Ctrl', '0'], description: 'Collapse all panels' },
          { keys: ['Ctrl', '9'], description: 'Expand all panels' },
        ]},
        { category: 'Help', items: [
          { keys: ['?'], description: 'Show this help' },
          { keys: ['Ctrl', '/'], description: 'Toggle keyboard shortcuts' },
        ]},
      ];
      
      return React.createElement('div', {
        style: {
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'fadeIn 0.2s ease-in'
        },
        onClick: () => setShowShortcutsHelp(false)
      },
        React.createElement('div', {
          style: {
            background: '#1a1a1a',
            borderRadius: 12,
            padding: '24px 32px',
            maxWidth: 700,
            maxHeight: '80vh',
            overflowY: 'auto',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
            border: '1px solid #333'
          },
          onClick: (e) => e.stopPropagation()
        }, [
          React.createElement('div', {
            key: 'header',
            style: {
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 24,
              paddingBottom: 16,
              borderBottom: '2px solid #333'
            }
          }, [
            React.createElement('h2', {
              key: 'title',
              style: { margin: 0, fontSize: 24, fontWeight: 600 }
            }, '⌨️ Keyboard Shortcuts'),
            React.createElement('button', {
              key: 'close',
              onClick: () => setShowShortcutsHelp(false),
              style: {
                background: 'transparent',
                border: 'none',
                color: '#999',
                fontSize: 24,
                cursor: 'pointer',
                padding: '0 8px',
                lineHeight: 1
              }
            }, '×')
          ]),
          ...shortcuts.map((section, sectionIdx) =>
            React.createElement('div', {
              key: section.category,
              style: { marginBottom: sectionIdx < shortcuts.length - 1 ? 24 : 0 }
            }, [
              React.createElement('h3', {
                key: 'cat-title',
                style: {
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#888',
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  marginBottom: 12
                }
              }, section.category),
              ...section.items.map((item, itemIdx) =>
                React.createElement('div', {
                  key: itemIdx,
                  style: {
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 0',
                    borderBottom: itemIdx < section.items.length - 1 ? '1px solid #2a2a2a' : 'none'
                  }
                }, [
                  React.createElement('div', {
                    key: 'keys',
                    style: { display: 'flex', gap: 6 }
                  }, item.keys.map((key, keyIdx) =>
                    React.createElement('kbd', {
                      key: keyIdx,
                      style: {
                        background: '#2a2a2a',
                        border: '1px solid #444',
                        borderRadius: 4,
                        padding: '4px 8px',
                        fontSize: 12,
                        fontFamily: 'monospace',
                        fontWeight: 600,
                        minWidth: 28,
                        textAlign: 'center',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                      }
                    }, key)
                  )),
                  React.createElement('div', {
                    key: 'desc',
                    style: { color: '#ccc', fontSize: 14 }
                  }, item.description)
                ])
              )
            ])
          ),
          React.createElement('div', {
            key: 'footer',
            style: {
              marginTop: 24,
              paddingTop: 16,
              borderTop: '1px solid #333',
              textAlign: 'center',
              color: '#666',
              fontSize: 12
            }
          }, 'Press ? or Esc to close')
        ])
      );
    };

    // Render all tabs but hide inactive ones - this prevents unmount/remount which is slow
    return React.createElement(React.Fragment, null,
      React.createElement(ShortcutsHelpModal),
      React.createElement('div', { 
        className: 'tab-content', 
        style: { 
          display: tab === 'stats' ? 'block' : 'none',
          animation: tab === 'stats' ? 'fadeIn 0.2s ease-in' : 'none'
        } 
      }, 
        React.createElement(StatsView)
      ),
      React.createElement('div', { 
        className: 'tab-content', 
        style: { 
          display: tab === 'browser' ? 'block' : 'none',
          animation: tab === 'browser' ? 'fadeIn 0.2s ease-in' : 'none'
        } 
      }, 
        React.createElement(BrowserView, { 
          selectedHandId, 
          onSelectHand: setSelectedHandId,
          globalFilters,
          setGlobalFilters
        })
      ),
      React.createElement('div', { 
        className: 'tab-content', 
        style: { 
          display: tab === 'sessions' ? 'block' : 'none',
          animation: tab === 'sessions' ? 'fadeIn 0.2s ease-in' : 'none'
        } 
      }, 
        React.createElement(SessionsView)
      ),
      React.createElement('div', { 
        className: 'tab-content', 
        style: { 
          display: tab === 'reports' ? 'block' : 'none',
          animation: tab === 'reports' ? 'fadeIn 0.2s ease-in' : 'none'
        } 
      }, 
        React.createElement(ReportsView)
      ),
      React.createElement('div', { 
        className: 'tab-content', 
        style: { 
          display: tab === 'dashboard' ? 'block' : 'none',
          animation: tab === 'dashboard' ? 'fadeIn 0.2s ease-in' : 'none'
        } 
      }, 
        React.createElement(Dashboard, {
          globalFilters,
          setGlobalFilters
        })
      )
    );
  }

  const rootEl = document.getElementById('root');
  if (rootEl && window.ReactDOM?.createRoot) {
    try {
      const root = window.ReactDOM.createRoot(rootEl);
      root.render(React.createElement(App));
    } catch (error) {
      console.error('Failed to render App:', error);
      rootEl.innerHTML = `<div style="color: red; padding: 20px;">
        <h2>Error rendering application</h2>
        <pre>${error.message}\n${error.stack}</pre>
      </div>`;
    }
  } else {
    console.error('Root element or ReactDOM not found');
  }
})();
