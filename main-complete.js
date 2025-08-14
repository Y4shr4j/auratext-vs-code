const { app, BrowserWindow, ipcMain, clipboard } = require('electron');
const InputDetector = require('./inputDetector');
const { spawn } = require('child_process');
const os = require('os');

let mainWindow;
let overlayWindow;
let popupWindow;
let inputDetector;
let overlayEnabled = false;
let currentInputBounds = null;

// Windows paste function
const sendCtrlV = () => {
  return new Promise((resolve, reject) => {
    const ps = spawn('powershell', [
      '-Command',
      'Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait("^v")'
    ], { windowsHide: true });
    
    ps.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`PowerShell exit code: ${code}`));
    });
    
    ps.on('error', reject);
  });
};

function createOverlay() {
  overlayWindow = new BrowserWindow({
    width: 32,
    height: 32,
    frame: false,
    transparent: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    backgroundColor: '#ffffff',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  overlayWindow.loadFile('overlay.html');
  overlayWindow.setIgnoreMouseEvents(false);
}

function positionOverlayAtInput(bounds) {
  const ICON_SIZE = 32;
  const MARGIN = 8;
  let iconX = Math.round(bounds.x + bounds.width + MARGIN);
  let iconY = Math.round(bounds.y + (bounds.height / 2) - (ICON_SIZE / 2));
  
  const { screen } = require('electron');
  const { bounds: screenBounds } = screen.getPrimaryDisplay();
  
  if (iconX + ICON_SIZE > screenBounds.width - 5) {
    iconX = bounds.x - ICON_SIZE - MARGIN;
  }
  if (iconY < 5) iconY = 5;
  if (iconY + ICON_SIZE > screenBounds.height - 5) {
    iconY = screenBounds.height - ICON_SIZE - 5;
  }
  
  overlayWindow.setBounds({ x: iconX, y: iconY, width: ICON_SIZE, height: ICON_SIZE });
}

function showOverlay(inputBounds) {
  console.log('showOverlay called with bounds:', inputBounds);
  
  if (!overlayWindow || !overlayEnabled) {
    console.log('Overlay not shown - window:', !!overlayWindow, 'enabled:', overlayEnabled);
    return;
  }
  
  currentInputBounds = inputBounds;
  positionOverlayAtInput(inputBounds);
  overlayWindow.show();
  overlayWindow.setAlwaysOnTop(true);
  console.log('Overlay shown and positioned');
}

function hideOverlay() {
  if (overlayWindow && overlayWindow.isVisible()) {
    overlayWindow.hide();
  }
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
  
  // Initialize input detector
  inputDetector = new InputDetector((inputInfo) => {
    console.log('Input detector callback:', inputInfo);
    if (inputInfo.hasInput && overlayEnabled) {
      showOverlay({ x: inputInfo.x, y: inputInfo.y, width: inputInfo.width, height: inputInfo.height });
    } else {
      hideOverlay();
    }
  });
  
  // Auto-enable overlay for testing
  setTimeout(() => {
    overlayEnabled = true;
    inputDetector.start();
    console.log('Auto-enabled overlay mode');
  }, 2000);
  
  startClipboardMonitoring();
}

function startClipboardMonitoring() {
  let lastClipboardText = '';
  
  setInterval(() => {
    try {
      const currentText = clipboard.readText();
      if (currentText && currentText !== lastClipboardText && currentText.length > 3) {
        lastClipboardText = currentText;
        mainWindow.webContents.send('clipboard-text', currentText);
      }
    } catch (error) {
      console.error('Clipboard error:', error);
    }
  }, 500);
}

// IPC handlers
ipcMain.on('start-overlay-mode', () => {
  overlayEnabled = true;
  if (inputDetector) {
    inputDetector.start();
  }
});

ipcMain.on('stop-overlay-mode', () => {
  overlayEnabled = false;
  if (inputDetector) {
    inputDetector.stop();
  }
  hideOverlay();
});

ipcMain.handle('paste-text', async (event, text) => {
  try {
    clipboard.writeText(text);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (os.platform() === 'win32') {
      await sendCtrlV();
    }
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

function createPopup() {
  if (popupWindow) return;
  
  popupWindow = new BrowserWindow({
    width: 200,
    height: 120,
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
  
  popupWindow.loadFile('popup.html');
  popupWindow.setIgnoreMouseEvents(false);
}

function showPopup() {
  if (!currentInputBounds) return;
  
  createPopup();
  
  const POPUP_WIDTH = 200;
  const POPUP_HEIGHT = 120;
  const MARGIN = 8;
  
  let popupX = currentInputBounds.x + currentInputBounds.width + MARGIN;
  let popupY = currentInputBounds.y;
  
  const { screen } = require('electron');
  const { bounds: screenBounds } = screen.getPrimaryDisplay();
  
  if (popupX + POPUP_WIDTH > screenBounds.width - 5) {
    popupX = currentInputBounds.x - POPUP_WIDTH - MARGIN;
  }
  
  popupWindow.setBounds({ x: popupX, y: popupY, width: POPUP_WIDTH, height: POPUP_HEIGHT });
  popupWindow.show();
  popupWindow.focus();
}

function hidePopup() {
  if (popupWindow && popupWindow.isVisible()) {
    popupWindow.hide();
  }
}

ipcMain.on('show-popup', () => {
  showPopup();
});

ipcMain.on('popup-action', (event, action) => {
  console.log('Popup action:', action);
  
  if (mainWindow) {
    mainWindow.restore();
    mainWindow.show();
    mainWindow.setAlwaysOnTop(true);
    mainWindow.focus();
    mainWindow.center();
    
    setTimeout(() => mainWindow.setAlwaysOnTop(false), 1000);
    mainWindow.webContents.send('handle-overlay-action', action);
  }
  
  hidePopup();
  hideOverlay();
});

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