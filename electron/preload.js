/**
 * client/electron/preload.js
 * Exposes safe IPC methods to the renderer via contextBridge.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // ── Clipboard ───────────────────────────────────────────────────────────
  readClipboardImage: () => ipcRenderer.invoke('clipboard:readImage'),

  // ── Notifications ───────────────────────────────────────────────────────
  notify: () => ipcRenderer.invoke('notify'),

  // ── App info ────────────────────────────────────────────────────────────
  getVersion: () => ipcRenderer.invoke('app:version'),

  // ── Auto-updater ────────────────────────────────────────────────────────
  /** Manually trigger an update check. */
  checkForUpdate: () => ipcRenderer.invoke('update:check'),

  /** Start downloading the available update. */
  downloadUpdate: () => ipcRenderer.invoke('update:download'),

  /** Quit the app and install the downloaded update. */
  installUpdate: () => ipcRenderer.invoke('update:install'),

  /**
   * Listen for update lifecycle events sent from main.js.
   * @param {(payload: UpdateStatus) => void} callback
   * @returns {() => void} unsubscribe function
   *
   * payload shapes:
   *   { status: 'checking' }
   *   { status: 'available',   version, releaseNotes }
   *   { status: 'up-to-date' }
   *   { status: 'downloaded',  version }
   *   { status: 'error',       message }
   */
  onUpdateStatus: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on('update:status', handler);
    return () => ipcRenderer.removeListener('update:status', handler);
  },

  /**
   * Listen for download-progress events.
   * @param {(progress: { percent, transferred, total, bytesPerSecond }) => void} callback
   * @returns {() => void} unsubscribe function
   */
  onUpdateProgress: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on('update:progress', handler);
    return () => ipcRenderer.removeListener('update:progress', handler);
  },
});
