// preload.cjs - safe bridges
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('bridgeStatus', { ok: true });

contextBridge.exposeInMainWorld('api', {
  listStats: (opts) => ipcRenderer.invoke('stats:list', opts),
  heroName: () => ipcRenderer.invoke('stats:heroName'),
  heroBreakdown: (opts) => ipcRenderer.invoke('stats:heroBreakdown', opts),
  listHands: (opts) => ipcRenderer.invoke('hands:list', opts),
  getHand:   (id)   => ipcRenderer.invoke('hands:get', id),
  listHandStakes: () => ipcRenderer.invoke('hands:stakes'),
  heroGraphData:    (opts) => ipcRenderer.invoke('hero:graphData', opts),
  rebuildStats:     () => ipcRenderer.invoke('stats:rebuild'),
});

contextBridge.exposeInMainWorld('hud', {
  start: () => ipcRenderer.invoke('hud:start'),
  stop: () => ipcRenderer.invoke('hud:stop'),
  toggle: () => ipcRenderer.invoke('hud:toggle'),
  status: () => ipcRenderer.invoke('hud:status'),
  pushInsight: (payload) => ipcRenderer.send('hud:insight', payload),
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
