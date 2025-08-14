const { BrowserWindow, screen } = require('electron');
const path = require('path');

let overlayWindow = null;
let mainWindow = null;

function createOverlay(parent) {
  mainWindow = parent;
  console.log('Creating overlay window...');
  
  overlayWindow = new BrowserWindow({
    width: 32,
    height: 32,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    }
  });

  const overlayPath = path.join(__dirname, 'overlay.html');
  console.log('Loading overlay from:', overlayPath);
  overlayWindow.loadFile(overlayPath);
  overlayWindow.setIgnoreMouseEvents(false);
  
  overlayWindow.webContents.on('did-finish-load', () => {
    console.log('Overlay HTML loaded successfully');
  });
  
  console.log('Overlay window created');
  return overlayWindow;
}

function showOverlay(x, y) {
  if (!overlayWindow) {
    console.log('No overlay window available');
    return;
  }
  
  try {
    console.log('Showing overlay at input coordinates:', x, y);
    
    // Position icon to the right of text input
    const overlayX = x + 5;
    const overlayY = y;
    
    overlayWindow.setBounds({
      x: overlayX,
      y: overlayY,
      width: 32,
      height: 32
    });
    
    overlayWindow.showInactive();
    overlayWindow.setAlwaysOnTop(true);
    
    console.log('Overlay positioned at:', overlayX, overlayY);
    console.log('Overlay visible:', overlayWindow.isVisible());
  } catch (error) {
    console.error('Error showing overlay:', error);
  }
}

function hideOverlay() {
  if (overlayWindow && overlayWindow.isVisible()) {
    overlayWindow.hide();
  }
}



module.exports = { createOverlay, showOverlay, hideOverlay };