const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onNotificationReceived: (callback) => {
    ipcRenderer.on('notification-received', (event, notification) => {
      callback(notification);
    });
  },
  
  onClipboardText: (callback) => {
    ipcRenderer.on('clipboard-text', (event, text) => {
      callback(text);
    });
  },
  
  generateReply: (notificationText) => {
    return ipcRenderer.invoke('generate-reply', notificationText);
  },
  
  setAlwaysOnTop: (value) => {
    ipcRenderer.send('set-always-on-top', value);
  },
  
  removeAllListeners: () => {
    ipcRenderer.removeAllListeners('notification-received');
    ipcRenderer.removeAllListeners('clipboard-text');
  }
});