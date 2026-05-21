const { app, BrowserWindow, ipcMain, clipboard, nativeImage } = require('electron');
const path = require('path');
const isDev = !app.isPackaged;

let mainWindow;
let badgeCount = 0;

function createWindow() {
  mainWindow = new BrowserWindow({
    width:           1440,
    height:          900,
    minWidth:        1024,
    minHeight:       680,
    backgroundColor: '#0d0d0d',
    icon:            path.join(__dirname, '../public/icon.png'),
    webPreferences: {
      preload:          path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration:  false,
    },
  });

  mainWindow.setMenu(null);

  if (isDev) {
    mainWindow.loadURL('http://localhost:3001');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../build/index.html'));
  }

  // Reseta badge quando janela recebe foco
  mainWindow.on('focus', () => {
    badgeCount = 0;
    mainWindow.setOverlayIcon(null, '');
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

ipcMain.handle('clipboard:readImage', () => {
  const img = clipboard.readImage();
  if (img.isEmpty()) return null;
  const base64 = img.toPNG().toString('base64');
  return `data:image/png;base64,${base64}`;
});

ipcMain.handle('notify', () => {
  if (!mainWindow || mainWindow.isFocused()) return;
  badgeCount++;
  try {
    const badge = nativeImage.createFromPath(path.join(__dirname, '../public/icon.png'));
    mainWindow.setOverlayIcon(badge, `${badgeCount} atualizacao`);
  } catch (e) {
    console.error('Badge error:', e.message);
  }
});