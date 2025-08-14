const electron = require('electron');
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const ipcMain = electron.ipcMain;
const clipboard = electron.clipboard;

const path = require('path');
const { spawn } = require('child_process');
const os = require('os');

let mainWindow;

// Windows paste function
const sendCtrlV = () => {
  return new Promise((resolve, reject) => {
    const ps = spawn('powershell', [
      '-Command',
      'Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait("^v")'
    ], { windowsHide: true });
    
    ps.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`PowerShell exit code: ${code}`));
      }
    });
    
    ps.on('error', (error) => {
      reject(error);
    });
  });
};

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

  startClipboardMonitoring(mainWindow);
}

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

ipcMain.on('overlay-action', (event, action, text) => {
  if (mainWindow) {
    // Show and focus the main window
    mainWindow.show();
    mainWindow.focus();
    mainWindow.webContents.send('handle-overlay-action', action, text);
  }
});

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