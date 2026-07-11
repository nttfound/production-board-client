/**
 * client/electron/preload.js
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  readClipboardImage: () => ipcRenderer.invoke('clipboard:readImage'),

  // ── Toast estilizado (aparece mesmo com app em segundo plano) ───────────
  // type: 'chat' | 'producing' | 'urgent' | 'ready' | 'info'
  sendNotification: ({ type, title, body }) =>
    ipcRenderer.invoke('notify:send', { type, title, body }),

  getVersion: () => ipcRenderer.invoke('app:version'),

  checkForUpdate:  () => ipcRenderer.invoke('update:check'),
  downloadUpdate:  () => ipcRenderer.invoke('update:download'),
  installUpdate:   () => ipcRenderer.invoke('update:install'),

  onUpdateStatus: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on('update:status', handler);
    return () => ipcRenderer.removeListener('update:status', handler);
  },

  onUpdateProgress: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on('update:progress', handler);
    return () => ipcRenderer.removeListener('update:progress', handler);
  },
});
