const { app, BrowserWindow, ipcMain, clipboard, nativeImage } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const isDev = !app.isPackaged;

let mainWindow;
let badgeCount = 0;
let updateInstallTimer = null;

autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;
autoUpdater.allowPrerelease = false;
autoUpdater.allowDowngrade = false;

function sendUpdateStatus(channel, payload = {}) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send(channel, payload);
}

function checkForUpdates() {
  if (isDev) {
    sendUpdateStatus('update:not-available', { dev: true });
    return Promise.resolve({ dev: true });
  }

  return autoUpdater.checkForUpdates().catch((err) => {
    sendUpdateStatus('update:error', { message: err.message });
    return { error: err.message };
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width:           1440,
    height:          900,
    minWidth:        1024,
    minHeight:       680,
    backgroundColor: '#0d0d0d',
    title:           `ITADOBRAS LASER v${app.getVersion()}`,
    icon: path.join(__dirname, '../public/icon.png'),
    webPreferences: {
      preload:          path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration:  false,
    },
  });

  mainWindow.setMenu(null);

  // Impede o React de sobrescrever o título
  mainWindow.on('page-title-updated', (e) => {
    e.preventDefault();
  });

  mainWindow.setMenu(null);

  if (isDev) {
    mainWindow.loadURL('http://localhost:3001');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../build/index.html'));
  }

  mainWindow.on('focus', () => {
    badgeCount = 0;
    mainWindow.setOverlayIcon(null, '');
  });
}

app.whenReady().then(() => {
  createWindow();

  if (!isDev) {
    checkForUpdates();
    setInterval(checkForUpdates, 30 * 60 * 1000);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// ── Auto-updater events ─────────────────────────────────────
autoUpdater.on('checking-for-update', () => {
  sendUpdateStatus('update:checking');
});

autoUpdater.on('update-available', (info) => {
  sendUpdateStatus('update:available', { version: info.version });
});

autoUpdater.on('download-progress', (progress) => {
  sendUpdateStatus('update:progress', { percent: Math.round(progress.percent || 0) });
});

autoUpdater.on('update-not-available', (info) => {
  sendUpdateStatus('update:not-available', { version: info.version });
});

autoUpdater.on('update-downloaded', (info) => {
  sendUpdateStatus('update:ready', { version: info.version });
  if (updateInstallTimer) clearTimeout(updateInstallTimer);
  updateInstallTimer = setTimeout(() => autoUpdater.quitAndInstall(false, true), 5000);
});

autoUpdater.on('error', (err) => {
  console.error('[UPDATER] Erro:', err.message);
  sendUpdateStatus('update:error', { message: err.message });
});

// ── IPC: Updater ────────────────────────────────────────────
ipcMain.handle('updater:check', () => {
  return checkForUpdates();
});

// ── IPC: Clipboard ──────────────────────────────────────────
ipcMain.handle('clipboard:readImage', () => {
  const img = clipboard.readImage();
  if (img.isEmpty()) return null;
  const base64 = img.toPNG().toString('base64');
  return `data:image/png;base64,${base64}`;
});

// ── IPC: Badge ──────────────────────────────────────────────
ipcMain.handle('notify', () => {
  if (!mainWindow || mainWindow.isFocused()) return;
  badgeCount++;
  try {
    const badge = nativeImage.createFromPath(path.join(__dirname, '../public/icon.png'));
    mainWindow.setOverlayIcon(badge, `${badgeCount} atualizacao`);
  } catch (e) {}
});
