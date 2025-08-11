const { app, BrowserWindow, ipcMain, clipboard } = require('electron');
const path = require('path');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'icon.png'),
    titleBarStyle: 'default',
    show: false
  });

  // Start clipboard monitoring
  startClipboardMonitoring(mainWindow);

  const isDev = process.env.ELECTRON_IS_DEV === 'true';
  
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../build/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.on('set-always-on-top', (event, value) => {
  const windows = BrowserWindow.getAllWindows();
  if (windows.length > 0) {
    windows[0].setAlwaysOnTop(value);
  }
});

// Clipboard monitoring
let lastClipboardText = '';

function startClipboardMonitoring(mainWindow) {
  setInterval(() => {
    try {
      const currentText = clipboard.readText();
      if (currentText && 
          currentText.length > 3 && 
          currentText.trim() !== '' && 
          currentText !== lastClipboardText) {
        lastClipboardText = currentText;
        mainWindow.webContents.send('clipboard-text', currentText);
      }
    } catch (error) {
      console.error('Clipboard error:', error);
    }
  }, 500);
}