const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  doUpdate: () => ipcRenderer.invoke('do-update')
});
