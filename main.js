const { app, BrowserWindow, ipcMain, clipboard } = require('electron');
const path = require('path');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 400,
    height: 600,
    minWidth: 350,
    minHeight: 500,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    },
    frame: false,
    show: false,
    alwaysOnTop: false,
    resizable: true
  });

  mainWindow.loadFile('dist/index.html');
  
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Start clipboard monitoring
  startClipboardMonitoring(mainWindow);
}

app.on('ready', createWindow);

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

// IPC handlers
ipcMain.on('set-always-on-top', (event, value) => {
  const windows = BrowserWindow.getAllWindows();
  if (windows.length > 0) {
    windows[0].setAlwaysOnTop(value);
  }
});