// preload.cjs - safe bridges
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('bridgeStatus', { ok: true });

contextBridge.exposeInMainWorld('api', {
  listStats: (opts) => ipcRenderer.invoke('stats:list', opts),
  heroName: () => ipcRenderer.invoke('stats:heroName'),
  heroBreakdown: (opts) => ipcRenderer.invoke('stats:heroBreakdown', opts),
  listHands: (opts) => ipcRenderer.invoke('hands:list', opts),
  getHand:   (id)   => ipcRenderer.invoke('hands:get', id),
  getNotes:  (id)   => ipcRenderer.invoke('hands:getNotes', id),
  saveNotes: (id, notes) => ipcRenderer.invoke('hands:saveNotes', id, notes),
  handsGetRange: (opts) => ipcRenderer.invoke('hands:getRange', opts),
  searchHandNotes: (query) => ipcRenderer.invoke('hands:searchNotes', query),
  calculateEquity: (options) => ipcRenderer.invoke('equity:calculate', options),
  deleteHands: (handIds) => ipcRenderer.invoke('hands:delete', handIds),
  listHandStakes: () => ipcRenderer.invoke('hands:stakes'),
  heroGraphData:    (opts) => ipcRenderer.invoke('hero:graphData', opts),
  hourlyHeatmap:    (opts) => ipcRenderer.invoke('stats:hourlyHeatmap', opts),
  positionProfitability: (opts) => ipcRenderer.invoke('stats:positionProfitability', opts),
  widgetsGetConfig: () => ipcRenderer.invoke('widgets:getConfig'),
  widgetsSaveConfig: (config) => ipcRenderer.invoke('widgets:saveConfig', config),
  rebuildStats:     () => ipcRenderer.invoke('stats:rebuild'),
  exportStatsCSV: (data, filename) => ipcRenderer.invoke('stats:exportCSV', data, filename),
  exportHandsCSV: (opts) => ipcRenderer.invoke('hands:exportCSV', opts),
  exportPositionCSV: (opts) => ipcRenderer.invoke('position:exportCSV', opts),
  // Annotations
  annotationsGetAll: () => ipcRenderer.invoke('annotations:getAll'),
  annotationsAdd: (data) => ipcRenderer.invoke('annotations:add', data),
  annotationsUpdate: (data) => ipcRenderer.invoke('annotations:update', data),
  annotationsDelete: (id) => ipcRenderer.invoke('annotations:delete', id),
  // Opponent Analysis
  opponentsList: (opts) => ipcRenderer.invoke('opponents:list', opts),
  opponentsHeadToHead: (opts) => ipcRenderer.invoke('opponents:headToHead', opts),
  backupDatabase: () => ipcRenderer.invoke('db:backup'),
  restoreDatabase: () => ipcRenderer.invoke('db:restore'),
  // Auto-Import Watch Folders
  addWatchFolder: (folderPath) => ipcRenderer.invoke('watch:addFolder', folderPath),
  removeWatchFolder: (folderPath) => ipcRenderer.invoke('watch:removeFolder', folderPath),
  getWatchedFolders: () => ipcRenderer.invoke('watch:getWatchedFolders'),
  stopAllWatching: () => ipcRenderer.invoke('watch:stopAll'),
  chooseFolders: () => ipcRenderer.invoke('import:chooseFolders'),
  onWatchNewFile: (fn) => ipcRenderer.on('watch:newFile', fn),
  onWatchImported: (fn) => ipcRenderer.on('watch:imported', fn),
  removeWatchListeners: () => {
    ipcRenderer.removeAllListeners('watch:newFile');
    ipcRenderer.removeAllListeners('watch:imported');
  },
  // Bulk Import
  startBulkImport: (folders) => ipcRenderer.invoke('bulkImport:start', folders),
  pauseBulkImport: () => ipcRenderer.invoke('bulkImport:pause'),
  resumeBulkImport: () => ipcRenderer.invoke('bulkImport:resume'),
  cancelBulkImport: () => ipcRenderer.invoke('bulkImport:cancel'),
  getBulkImportState: () => ipcRenderer.invoke('bulkImport:getState'),
  onBulkImportStarted: (fn) => ipcRenderer.on('bulkImport:started', (_e, payload) => fn(payload)),
  onBulkImportProgress: (fn) => ipcRenderer.on('bulkImport:progress', (_e, payload) => fn(payload)),
  onBulkImportFolderStart: (fn) => ipcRenderer.on('bulkImport:folderStart', (_e, payload) => fn(payload)),
  onBulkImportFolderComplete: (fn) => ipcRenderer.on('bulkImport:folderComplete', (_e, payload) => fn(payload)),
  onBulkImportPaused: (fn) => ipcRenderer.on('bulkImport:paused', (_e, payload) => fn(payload)),
  onBulkImportResumed: (fn) => ipcRenderer.on('bulkImport:resumed', (_e, payload) => fn(payload)),
  onBulkImportCancelled: (fn) => ipcRenderer.on('bulkImport:cancelled', (_e, payload) => fn(payload)),
  onBulkImportComplete: (fn) => ipcRenderer.on('bulkImport:complete', (_e, payload) => fn(payload)),
  removeBulkImportListeners: () => {
    ipcRenderer.removeAllListeners('bulkImport:started');
    ipcRenderer.removeAllListeners('bulkImport:progress');
    ipcRenderer.removeAllListeners('bulkImport:folderStart');
    ipcRenderer.removeAllListeners('bulkImport:folderComplete');
    ipcRenderer.removeAllListeners('bulkImport:paused');
    ipcRenderer.removeAllListeners('bulkImport:resumed');
    ipcRenderer.removeAllListeners('bulkImport:cancelled');
    ipcRenderer.removeAllListeners('bulkImport:complete');
  },
  sessions: {
    list: (opts) => ipcRenderer.invoke('sessions:list', opts),
    detect: (params) => ipcRenderer.invoke('sessions:detect', params),
    getDetails: (sessionId, handIds) => ipcRenderer.invoke('sessions:details', sessionId, handIds),
  },
  reports: {
    generate: (params) => ipcRenderer.invoke('reports:generate', params),
    detectLeaks: (params) => ipcRenderer.invoke('reports:leaks', params),
    getTrends: (params) => ipcRenderer.invoke('reports:trends', params),
    getHeatmap: (params) => ipcRenderer.invoke('reports:heatmap', params),
  },
});

contextBridge.exposeInMainWorld('hud', {
  start: () => ipcRenderer.invoke('hud:start'),
  stop: () => ipcRenderer.invoke('hud:stop'),
  toggle: () => ipcRenderer.invoke('hud:toggle'),
  status: () => ipcRenderer.invoke('hud:status'),
  pushInsight: (payload) => ipcRenderer.send('hud:insight', payload),
  // HUD v3 (Phase 1)
  v3Start: () => ipcRenderer.invoke('hudv3:start'),
  v3Stop: () => ipcRenderer.invoke('hudv3:stop'),
  v3Status: () => ipcRenderer.invoke('hudv3:status'),
  v3UpdateConfig: (config) => ipcRenderer.invoke('hudv3:updateConfig', config),
});

contextBridge.exposeInMainWorld('importer', {
  chooseFolders: () => ipcRenderer.invoke('import:chooseFolders'),
  start: (paths, opts) => ipcRenderer.invoke('import:start', paths, opts),
  onProgress: (fn) => ipcRenderer.on('import:progress', (_e, payload) => fn(payload)),
  onDone:     (fn) => ipcRenderer.on('import:done',     (_e, payload) => fn(payload)),
});

contextBridge.exposeInMainWorld('filetester', {
  chooseFile: () => ipcRenderer.invoke('filetester:choose'),
  testFile: (filePath) => ipcRenderer.invoke('filetester:test', filePath),
});

contextBridge.exposeInMainWorld('foldertester', {
  chooseFolder: () => ipcRenderer.invoke('foldertester:choose'),
  scanFolder: (dirPath) => ipcRenderer.invoke('foldertester:scan', dirPath),
});

contextBridge.exposeInMainWorld('electronAPI', {
  calibration: {
    open: () => ipcRenderer.invoke('calibration:open'),
    loadScreenshot: () => ipcRenderer.invoke('calibration:loadScreenshot'),
    testOCR: (regions) => ipcRenderer.invoke('calibration:testOCR', regions),
    extractTemplates: (regions) => ipcRenderer.invoke('calibration:extractTemplates', regions),
    saveConfig: (regions) => ipcRenderer.invoke('calibration:saveConfig', regions),
  }
});

