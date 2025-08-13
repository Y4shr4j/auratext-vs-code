// Check if running in Electron
const isElectron = typeof window !== 'undefined' && window.require;
let ipcRenderer, robot, notifier, os, sendCtrlV;

if (isElectron) {
  try {
    const electron = window.require('electron');
    ipcRenderer = electron.ipcRenderer;
    console.log('Electron IPC loaded successfully');
  } catch (error) {
    console.warn('Failed to load Electron IPC:', error);
  }
} else {
  // Node.js environment
  robot = require('robotjs');
  notifier = require('node-notifier');
  os = require('os');
  const windowsPaste = require('./windowsPaste');
  sendCtrlV = windowsPaste.sendCtrlV;
}

// Dynamic imports for ES modules
let clipboardy, activeWin;

const initModules = async () => {
  try {
    const clipboardyModule = await import('clipboardy');
    const activeWinModule = await import('active-win');
    clipboardy = clipboardyModule.default;
    activeWin = activeWinModule.default;
  } catch (error) {
    console.warn('Failed to load ES modules:', error);
  }
};

// Initialize modules
if (!isElectron) {
  initModules();
}

// Global flag to track insert mode
let insertMode = false;
let lastClipboardContent = '';

// Get active application name
const getActiveAppName = async () => {
  try {
    if (!activeWin) return 'Unknown App';
    const activeWindow = await activeWin();
    return activeWindow?.owner?.name || 'Unknown App';
  } catch (error) {
    console.warn('Failed to get active window:', error);
    return 'Unknown App';
  }
};

// Show notification
const showNotification = (title, message) => {
  if (isElectron && typeof window !== 'undefined' && window.Notification) {
    if (Notification.permission === 'granted') {
      new Notification(title, { body: message });
    } else if (Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification(title, { body: message });
        }
      });
    }
  } else if (notifier) {
    notifier.notify({ title, message, sound: false });
  }
  console.log(`${title}: ${message}`);
};

// Clipboard change handler
const onClipboardChange = async () => {
  try {
    if (!clipboardy) return;
    const currentContent = await clipboardy.read();
    
    // Skip if content hasn't changed
    if (currentContent === lastClipboardContent) return;
    
    lastClipboardContent = currentContent;
    
    // Skip notification if in insert mode
    if (insertMode) {
      insertMode = false; // Reset flag
      return;
    }
    
    // Show normal copy notification
    const preview = currentContent.length > 50 ? 
      currentContent.substring(0, 50) + '...' : currentContent;
    showNotification('Copied', preview);
    
  } catch (error) {
    console.warn('Clipboard read error:', error);
  }
};

// Insert text function
const insertText = async (text) => {
  console.log('insertText called with:', text.substring(0, 50) + '...');
  console.log('Environment - isElectron:', isElectron, 'ipcRenderer available:', !!ipcRenderer);
  
  try {
    insertMode = true;
    
    if (isElectron && ipcRenderer) {
      console.log('Using Electron IPC method');
      try {
        const result = await ipcRenderer.invoke('paste-text', text);
        console.log('IPC invoke result:', result);
        
        if (result && result.success) {
          showNotification('Text Inserted', 'Text inserted into active app');
          return true;
        } else {
          console.error('IPC paste failed:', result?.error || 'Unknown error');
          showNotification('Insert Failed', result?.error || 'IPC paste failed');
          return false;
        }
      } catch (ipcError) {
        console.error('IPC invoke error:', ipcError);
        showNotification('Insert Failed', 'IPC communication failed');
        return false;
      }
    } else {
      console.log('Using Node.js method');
      if (!clipboardy) {
        showNotification('Insert Failed', 'Clipboard module not available');
        return false;
      }
      
      const activeApp = await getActiveAppName();
      await clipboardy.write(text);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (os.platform() === 'darwin') {
        robot.keyTap('v', 'command');
      } else {
        try {
          await sendCtrlV();
        } catch (psError) {
          robot.keyToggle('control', 'down');
          robot.keyTap('v');
          robot.keyToggle('control', 'up');
        }
      }
      
      showNotification('Text Inserted', `Text inserted into ${activeApp}`);
      return true;
    }
  } catch (error) {
    console.error('Insert text error:', error);
    insertMode = false;
    showNotification('Insert Failed', error.message || 'Failed to insert text');
    return false;
  }
};

// Insert text with delay
const insertTextWithDelay = async (text, delay = 3000) => {
  showNotification('Insert Scheduled', `Text will be inserted in ${delay/1000} seconds`);
  setTimeout(() => insertText(text), delay);
};

// Start clipboard monitoring
const startClipboardMonitoring = () => {
  if (isElectron) return; // Skip in Electron, handled by main process
  
  // Wait for modules to load
  const checkAndStart = () => {
    if (!clipboardy) {
      setTimeout(checkAndStart, 100);
      return;
    }
    
    // Initial clipboard content
    (async () => {
      try {
        lastClipboardContent = await clipboardy.read();
      } catch (error) {
        console.warn('Initial clipboard read failed:', error);
      }
    })();
    
    // Monitor clipboard changes
    setInterval(onClipboardChange, 500);
  };
  
  checkAndStart();
};

// Copy to clipboard (normal copy)
const copyToClipboard = async (text) => {
  try {
    if (isElectron) {
      // Use browser clipboard API in Electron
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } else {
      // Node.js environment
      if (!clipboardy) return false;
      await clipboardy.write(text);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Copy to clipboard error:', error);
    return false;
  }
};

module.exports = {
  insertText,
  insertTextWithDelay,
  copyToClipboard,
  startClipboardMonitoring,
  getActiveAppName
};