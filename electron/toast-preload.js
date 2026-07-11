/**
 * electron/toast-preload.js
 * Preload da janela de toast — recebe dados do main e expõe API para o HTML.
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('toastAPI', {
  // Main → renderer: exibe um toast
  onShow: (callback) => {
    ipcRenderer.on('toast:show', (_e, data) => callback(data));
  },
  // Renderer → main: redimensiona a janela conforme o conteúdo
  resize: (height) => ipcRenderer.send('toast:resize', height),
  // Renderer → main: esconde a janela (sem toasts)
  hide: () => ipcRenderer.send('toast:hide'),
  // Renderer → main: clicou no toast, foca o app principal
  focusMain: () => ipcRenderer.send('toast:focusMain'),
});
