/**
 * client/electron/preload.js
 * Exposes safe IPC methods to the renderer via contextBridge.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  /**
   * Read an image from the system clipboard.
   * Returns a base64 data URL string, or null if no image is present.
   */
  readClipboardImage: () => ipcRenderer.invoke('clipboard:readImage'),
});
