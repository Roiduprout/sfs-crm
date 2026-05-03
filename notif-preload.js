const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('notifAPI', {
  openApp: () => ipcRenderer.send('notif-open-app'),
  close:   () => ipcRenderer.send('notif-close')
});
