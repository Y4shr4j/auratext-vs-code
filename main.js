const { app, BrowserWindow, ipcMain, clipboard } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const os = require('os');

// Windows paste function
const sendCtrlV = () => {
  return new Promise((resolve, reject) => {
    const ps = spawn('powershell', [
      '-Command',
      'Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait("^v")'
    ], { windowsHide: true });
    
    ps.on('close', (code) => {
      console.log(`PowerShell exit code: ${code}`);
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`PowerShell exit code: ${code}`));
      }
    });
    
    ps.on('error', (error) => {
      console.error('PowerShell error:', error);
      reject(error);
    });
  });
};

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

ipcMain.handle('paste-text', async (event, text) => {
  console.log('Paste-text IPC called with text:', text.substring(0, 50) + '...');
  try {
    // Write to clipboard
    clipboard.writeText(text);
    console.log('Text written to clipboard');
    
    // Wait a bit for clipboard to be written
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Send paste command
    if (os.platform() === 'win32') {
      console.log('Attempting PowerShell paste...');
      await sendCtrlV();
      console.log('PowerShell paste completed');
    } else {
      throw new Error('Paste not implemented for this platform');
    }
    
    console.log('Paste operation successful');
    return { success: true };
  } catch (error) {
    console.error('Paste error:', error);
    return { success: false, error: error.message };
  }
});