const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  doUpdate: () => ipcRenderer.invoke('do-update'),
  getNotifSettings: () => ipcRenderer.invoke('get-notif-settings'),
  saveNotifSettings: (s) => ipcRenderer.invoke('save-notif-settings', s),
  sendNotifs: (items) => ipcRenderer.invoke('send-notifs', items),
});
