/**
 * client/electron/preload.js
 * Exposes safe IPC methods to the renderer via contextBridge.
 */

const { contextBridge, ipcRenderer } = require('electron');

// CORRIGIDO: antes usava ipcRenderer.removeAllListeners(channel), que removia
// todos os listeners do canal — inclusive de outros componentes.
// Agora cada listener é registrado/removido individualmente com on/off,
// e retornamos uma função de cleanup para uso nos useEffect do React.
function onChannel(channel, cb) {
  ipcRenderer.off(channel, cb); // remove esta referência específica se já existir
  ipcRenderer.on(channel, cb);
  return () => ipcRenderer.off(channel, cb); // cleanup para useEffect
}

contextBridge.exposeInMainWorld('electronAPI', {
  readClipboardImage:   () => ipcRenderer.invoke('clipboard:readImage'),
  notify:               () => ipcRenderer.invoke('notify'),
  showNotification:     (type, title, body, duration) => ipcRenderer.invoke('notify:show', { type, title, body, duration }),
  focusMain:            () => ipcRenderer.invoke('notify:focus'),
  checkForUpdates:      () => ipcRenderer.invoke('updater:check'),
  installUpdate:        () => ipcRenderer.invoke('updater:install'), // novo: chamado após confirmação do usuário
  onUpdateChecking:     (cb) => onChannel('update:checking',      cb),
  onUpdateAvailable:    (cb) => onChannel('update:available',     cb),
  onUpdateProgress:     (cb) => onChannel('update:progress',      cb),
  onUpdateReady:        (cb) => onChannel('update:ready',         cb),
  onUpdateNotAvailable: (cb) => onChannel('update:not-available', cb),
  onUpdateError:        (cb) => onChannel('update:error',         cb),
});
