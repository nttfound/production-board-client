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
  mainWindow.maximize();
  mainWindow.setMenu(null);

  // Impede o React de sobrescrever o título
  mainWindow.on('page-title-updated', (e) => {
    e.preventDefault();
  });

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
    const size = 32;
    const buffer = Buffer.alloc(size * size * 4);
    const cx = size / 2 - 0.5;
    const cy = size / 2 - 0.5;
    const r  = size / 2 - 2;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx  = (y * size + x) * 4;
        const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
        if (dist <= r) {
          buffer[idx]     = 220;
          buffer[idx + 1] = 38;
          buffer[idx + 2] = 38;
          buffer[idx + 3] = 255;
        } else if (dist <= r + 1.5) {
          // borda suave anti-aliasing
          const alpha = Math.round((r + 1.5 - dist) * 170);
          buffer[idx]     = 220;
          buffer[idx + 1] = 38;
          buffer[idx + 2] = 38;
          buffer[idx + 3] = alpha;
        } else {
          buffer[idx + 3] = 0;
        }
      }
    }

    const badge = nativeImage.createFromBuffer(buffer, { width: size, height: size });
    mainWindow.setOverlayIcon(badge, `${badgeCount} atualizacao`);
  } catch (e) {
    console.error('[BADGE] Erro:', e.message);
  }
});