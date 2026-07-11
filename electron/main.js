const { app, BrowserWindow, ipcMain, clipboard, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const isDev = !app.isPackaged;
let autoUpdater = null;

const appDataRoot = isDev
  ? path.join(__dirname, '..', '.electron-data')
  : path.join(process.env.LOCALAPPDATA || app.getPath('appData'), 'Producao Laser');
const cacheRoot = path.join(appDataRoot, 'Cache');

try {
  fs.mkdirSync(cacheRoot, { recursive: true });
  app.setPath('userData', appDataRoot);
  app.setPath('cache', cacheRoot);
  app.commandLine.appendSwitch('disk-cache-dir', cacheRoot);
  app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
} catch (err) {
  console.warn('[Electron] Failed to configure cache path:', err.message);
}

let mainWindow;
let toastWindow;
let toastWindowReady = false;
let pendingToasts = []; // toasts que chegaram antes da janela estar pronta
let toastIdCounter = 0;

function getAutoUpdater() {
  if (!autoUpdater) {
    autoUpdater = require('electron-updater').autoUpdater;
  }
  return autoUpdater;
}

function createToastWindow() {
  const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize;

  toastWindow = new BrowserWindow({
    width: 364,
    height: 1,           // começa minúscula; cresce conforme o conteúdo
    x: sw - 376,         // canto inferior direito com margem
    y: sh - 1,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,   // não aparece na barra de tarefas
    resizable: false,
    focusable: false,    // não rouba foco do app ativo
    show: false,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'toast-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  toastWindow.setAlwaysOnTop(true, 'screen-saver'); // nível mais alto no Windows

  toastWindow.loadFile(path.join(__dirname, 'toast.html'));

  toastWindow.webContents.once('did-finish-load', () => {
    toastWindowReady = true;
    // Envia toasts que ficaram na fila
    pendingToasts.forEach(t => sendToastToWindow(t));
    pendingToasts = [];
  });

  // Impede que a janela seja destruída — só esconde
  toastWindow.on('close', (e) => {
    e.preventDefault();
    toastWindow.hide();
  });
}

function sendToastToWindow(data) {
  if (!toastWindow || toastWindow.isDestroyed()) {
    createToastWindow();
  }
  if (!toastWindow || toastWindow.isDestroyed()) return;
  if (!toastWindowReady) {
    pendingToasts.push(data);
    return;
  }

  const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize;
  const winBounds = toastWindow.getBounds();

  // Mostra a janela no canto inferior direito
  toastWindow.setBounds({ x: sw - 376, y: sh - winBounds.height, width: 364, height: winBounds.height });
  toastWindow.showInactive(); // mostra sem roubar foco

  toastWindow.webContents.send('toast:show', data);
}

function setupToastIPC() {
  // Toast pediu resize (conteúdo cresceu/diminuiu)
  ipcMain.on('toast:resize', (_e, height) => {
    if (!toastWindow || toastWindow.isDestroyed()) return;
    const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize;
    const h = Math.max(Math.round(height), 1);
    toastWindow.setBounds({ x: sw - 376, y: sh - h, width: 364, height: h });
  });

  // Sem toasts — esconde a janela
  ipcMain.on('toast:hide', () => {
    toastWindow?.hide();
  });

  // Usuário clicou no toast → foca o app principal
  ipcMain.on('toast:focusMain', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// ─── IPC: renderer principal pede para exibir toast ────────────────────────
function setupIPC() {
  ipcMain.handle('clipboard:readImage', () => {
    const img = clipboard.readImage();
    if (img.isEmpty()) return null;
    return `data:image/png;base64,${img.toPNG().toString('base64')}`;
  });

  // Renderer principal → exibe toast estilizado
  ipcMain.handle('notify:send', (_event, { type, title, body }) => {
    const id = ++toastIdCounter;
    sendToastToWindow({ id, type, title, body });
  });

  ipcMain.handle('update:download', () => getAutoUpdater().downloadUpdate());
  ipcMain.handle('update:install', () => { getAutoUpdater().quitAndInstall(false, true); });
  ipcMain.handle('update:check',   () => getAutoUpdater().checkForUpdates());
  ipcMain.handle('app:version',    () => app.getVersion());
}

function setupAutoUpdater() {
  if (isDev) return;
  const updater = getAutoUpdater();

  setTimeout(() => updater.checkForUpdates(), 10000);
  setInterval(() => updater.checkForUpdates(), 2 * 60 * 60 * 1000);

  updater.autoDownload = false;
  updater.autoInstallOnAppQuit = true;

  updater.on('checking-for-update', () =>
    mainWindow?.webContents.send('update:status', { status: 'checking' }));

  updater.on('update-available', (info) =>
    mainWindow?.webContents.send('update:status', { status: 'available', version: info.version, releaseNotes: info.releaseNotes || null }));

  updater.on('update-not-available', () =>
    mainWindow?.webContents.send('update:status', { status: 'up-to-date' }));

  updater.on('download-progress', (p) =>
    mainWindow?.webContents.send('update:progress', { percent: Math.round(p.percent), transferred: p.transferred, total: p.total, bytesPerSecond: p.bytesPerSecond }));

  updater.on('update-downloaded', (info) =>
    mainWindow?.webContents.send('update:status', { status: 'downloaded', version: info.version }));

  updater.on('error', (err) =>
    mainWindow?.webContents.send('update:status', { status: 'error', message: err.message }));
}

function setupLoginItem() {
  if (isDev) return;
  // Nao force iniciar com o Windows. Se o usuario desativar nas configuracoes
  // do Windows, o app precisa respeitar essa escolha nas proximas aberturas.
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: '#0d0d0d',
    icon: path.join(__dirname, '../public/icon.png'),
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.setMenu(null);
  mainWindow.maximize();

  mainWindow.once('ready-to-show', () => mainWindow.show());

  if (isDev) {
    mainWindow.loadURL('http://localhost:3001');
    if (process.env.ELECTRON_OPEN_DEVTOOLS === 'true') {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
  } else {
    mainWindow.loadFile(path.join(__dirname, '../build/index.html'));
  }
}

app.whenReady().then(() => {
  setupIPC();
  setupToastIPC();
  createWindow();
  setupAutoUpdater();
  setupLoginItem();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().filter(w => w !== toastWindow).length === 0) createWindow();
});
