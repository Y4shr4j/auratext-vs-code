const { app, BrowserWindow, ipcMain } = require('electron');

let mainWindow;
let overlayWindow;

function createOverlay() {
  overlayWindow = new BrowserWindow({
    width: 32,
    height: 32,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  overlayWindow.loadFile('overlay.html');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    frame: false
  });

  mainWindow.loadFile('dist/index.html');
  createOverlay();
  
  // Test: Show overlay after 3 seconds
  setTimeout(() => {
    if (overlayWindow) {
      overlayWindow.setBounds({ x: 300, y: 200, width: 32, height: 32 });
      overlayWindow.show();
      console.log('Test overlay shown');
    }
  }, 3000);
}

// IPC handler for overlay clicks
ipcMain.on('overlay-action', (event, action, text) => {
  console.log('Overlay clicked:', action);
  
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  }
  
  if (overlayWindow) {
    overlayWindow.hide();
  }
});

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});