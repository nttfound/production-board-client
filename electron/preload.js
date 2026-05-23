/**
 * client/electron/preload.js
 * Exposes safe IPC methods to the renderer via contextBridge.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  readClipboardImage: () => ipcRenderer.invoke('clipboard:readImage'),
  notify:             () => ipcRenderer.invoke('notify'),
  checkForUpdates:    () => ipcRenderer.invoke('updater:check'),
  onUpdateChecking:   (cb) => ipcRenderer.on('update:checking', cb),
  onUpdateAvailable:  (cb) => ipcRenderer.on('update:available', cb),
  onUpdateProgress:   (cb) => ipcRenderer.on('update:progress', cb),
  onUpdateReady:      (cb) => ipcRenderer.on('update:ready',     cb),
  onUpdateNotAvailable: (cb) => ipcRenderer.on('update:not-available', cb),
  onUpdateError:      (cb) => ipcRenderer.on('update:error', cb),
});
