/**
 * client/electron/preload.js
 * Exposes safe IPC methods to the renderer via contextBridge.
 */

const { contextBridge, ipcRenderer } = require('electron');

// Helper: registra um listener garantindo que só existe um por canal.
// Sem isso, cada re-mount do React acumula callbacks no mesmo canal.
function onChannel(channel, cb) {
  ipcRenderer.removeAllListeners(channel);
  ipcRenderer.on(channel, cb);
}

contextBridge.exposeInMainWorld('electronAPI', {
  readClipboardImage:   () => ipcRenderer.invoke('clipboard:readImage'),
  notify:               () => ipcRenderer.invoke('notify'),
  showNotification:     (title, body) => ipcRenderer.invoke('notify:show', { title, body }),
  checkForUpdates:      () => ipcRenderer.invoke('updater:check'),
  onUpdateChecking:     (cb) => onChannel('update:checking',      cb),
  onUpdateAvailable:    (cb) => onChannel('update:available',     cb),
  onUpdateProgress:     (cb) => onChannel('update:progress',      cb),
  onUpdateReady:        (cb) => onChannel('update:ready',         cb),
  onUpdateNotAvailable: (cb) => onChannel('update:not-available', cb),
  onUpdateError:        (cb) => onChannel('update:error',         cb),
});
