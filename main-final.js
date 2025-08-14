const { app, BrowserWindow, ipcMain, clipboard } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const os = require('os');
const InputDetector = require('./inputDetector');

let mainWindow;
let overlayWindow;
let inputDetector = null;
let overlayEnabled = false;

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
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  overlayWindow.loadFile('overlay.html');
  console.log('Overlay window created');
}

function showOverlay(x, y) {
  if (!overlayWindow || !overlayEnabled) return;
  
  // Position overlay next to text input
  overlayWindow.setBounds({
    x: x + 5,
    y: y,
    width: 32,
    height: 32
  });
  
  overlayWindow.showInactive();
  console.log('Overlay shown at:', x + 5, y);
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

  createOverlay();
  startClipboardMonitoring();
  
  // Initialize input detector
  inputDetector = new InputDetector((inputInfo) => {
    console.log('Input detection callback:', inputInfo, 'overlayEnabled:', overlayEnabled);
    if (inputInfo.hasInput && overlayEnabled) {
      showOverlay(inputInfo.x, inputInfo.y);
    } else {
      hideOverlay();
    }
  });
  
  // Auto-start overlay mode for testing
  setTimeout(() => {
    overlayEnabled = true;
    inputDetector.start();
    console.log('Auto-started overlay mode');
  }, 2000);
}

function startClipboardMonitoring() {
  let lastClipboardText = '';
  
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
  if (mainWindow) {
    mainWindow.setAlwaysOnTop(value);
  }
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

ipcMain.on('start-overlay-mode', () => {
  console.log('Starting overlay mode');
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

ipcMain.on('overlay-action', (event, action, text) => {
  console.log('Overlay action received:', action);
  
  if (mainWindow) {
    // Show and focus the main window
    mainWindow.show();
    mainWindow.focus();
    mainWindow.webContents.send('handle-overlay-action', action, text);
  }
  
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