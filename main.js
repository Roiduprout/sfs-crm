const { app, BrowserWindow, shell, ipcMain, Notification } = require('electron');
const path = require('path');
const https = require('https');
const fs = require('fs');

// ---------- PATHS ----------
const settingsPath = () => path.join(app.getPath('userData'), 'notif-settings.json');
const notifDataPath = () => path.join(app.getPath('userData'), 'notif-data.json');

function readJSON(p, def) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return def; }
}
function writeJSON(p, d) {
  fs.writeFileSync(p, JSON.stringify(d, null, 2));
}

// ---------- WINDOW ----------
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

// ---------- AUTO-UPDATE ----------
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

// ---------- NOTIFICATION SETTINGS ----------
ipcMain.handle('get-notif-settings', () => readJSON(settingsPath(), {}));
ipcMain.handle('save-notif-settings', (_, settings) => writeJSON(settingsPath(), settings));

// ---------- SEND NOTIFICATIONS ----------
// throttle : une notif max toutes les 3h par modèle
ipcMain.handle('send-notifs', (_, { lines, models }) => {
  if (!Notification.isSupported() || !lines?.length) return;

  const THREE_HOURS = 3 * 60 * 60 * 1000;
  const now = Date.now();
  const nd = readJSON(notifDataPath(), { lastSentAt: {} });

  for (const { model, body } of models) {
    const last = nd.lastSentAt[model] || 0;
    if (now - last < THREE_HOURS) continue;

    new Notification({
      title: `SFS CRM — ${model}`,
      body
    }).show();

    nd.lastSentAt[model] = now;
  }

  writeJSON(notifDataPath(), nd);
});

// ---------- APP LIFECYCLE ----------
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
