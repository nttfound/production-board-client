const { app, BrowserWindow, ipcMain, clipboard } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const isDev = !app.isPackaged;

let mainWindow;

// ─── Auto-updater config ───────────────────────────────────────────────────
autoUpdater.autoDownload = false;       // ask the user first
autoUpdater.autoInstallOnAppQuit = true;

function setupAutoUpdater() {
  if (isDev) return; // skip in dev

  // Check on startup (after 3 s to let the UI settle)
  setTimeout(() => autoUpdater.checkForUpdates(), 3000);

  // Check every 2 hours while the app is running
  setInterval(() => autoUpdater.checkForUpdates(), 2 * 60 * 60 * 1000);

  autoUpdater.on('checking-for-update', () => {
    mainWindow?.webContents.send('update:status', { status: 'checking' });
  });

  autoUpdater.on('update-available', (info) => {
    mainWindow?.webContents.send('update:status', {
      status: 'available',
      version: info.version,
      releaseNotes: info.releaseNotes || null,
    });
  });

  autoUpdater.on('update-not-available', () => {
    mainWindow?.webContents.send('update:status', { status: 'up-to-date' });
  });

  autoUpdater.on('download-progress', (progress) => {
    mainWindow?.webContents.send('update:progress', {
      percent: Math.round(progress.percent),
      transferred: progress.transferred,
      total: progress.total,
      bytesPerSecond: progress.bytesPerSecond,
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    mainWindow?.webContents.send('update:status', {
      status: 'downloaded',
      version: info.version,
    });
  });

  autoUpdater.on('error', (err) => {
    mainWindow?.webContents.send('update:status', {
      status: 'error',
      message: err.message,
    });
  });
}

// ─── IPC handlers ──────────────────────────────────────────────────────────
function setupIPC() {
  ipcMain.handle('clipboard:readImage', () => {
    const img = clipboard.readImage();
    if (img.isEmpty()) return null;
    return `data:image/png;base64,${img.toPNG().toString('base64')}`;
  });

  // Renderer asks us to start downloading
  ipcMain.handle('update:download', () => autoUpdater.downloadUpdate());

  // Renderer asks us to quit and install
  ipcMain.handle('update:install', () => {
    autoUpdater.quitAndInstall(false, true);
  });

  // Manual check triggered from the renderer
  ipcMain.handle('update:check', () => autoUpdater.checkForUpdates());

  // Renderer asks for current app version
  ipcMain.handle('app:version', () => app.getVersion());
}

// ─── Window ────────────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: '#0d0d0d',
    icon: path.join(__dirname, '../public/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.setMenu(null);

  if (isDev) {
    mainWindow.loadURL('http://localhost:3001');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../build/index.html'));
  }


}

app.whenReady().then(() => {
  setupIPC();
  createWindow();
  setupAutoUpdater();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
