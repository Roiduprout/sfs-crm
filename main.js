const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('path');
const https = require('https');
const fs = require('fs');

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: 'SFS CRM',
    backgroundColor: '#0a0a0a',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
    }
  });

  win.loadFile(path.join(__dirname, 'index.html'));

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

ipcMain.handle('do-update', async () => {
  const filePath = path.join(__dirname, 'index.html');
  const url = 'https://raw.githubusercontent.com/Roiduprout/sfs-crm/main/index.html';

  await new Promise((resolve, reject) => {
    const tmp = filePath + '.tmp';
    const file = fs.createWriteStream(tmp);
    https.get(url, res => {
      if (res.statusCode !== 200) { reject(new Error('HTTP ' + res.statusCode)); return; }
      res.pipe(file);
      file.on('finish', () => file.close(() => {
        fs.rename(tmp, filePath, err => err ? reject(err) : resolve());
      }));
    }).on('error', err => { fs.unlink(tmp, () => {}); reject(err); });
  });

  const win = BrowserWindow.getAllWindows()[0];
  if (win) win.webContents.reloadIgnoringCache();
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
