const { app, BrowserWindow } = require('electron');

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
  
  // Show overlay after 2 seconds for testing
  setTimeout(() => {
    overlayWindow.setBounds({ x: 200, y: 200, width: 32, height: 32 });
    overlayWindow.show();
    console.log('Overlay should be visible now');
  }, 2000);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile('dist/index.html');
  createOverlay();
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});