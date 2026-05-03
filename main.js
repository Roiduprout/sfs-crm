const { app, BrowserWindow, shell, ipcMain, screen } = require('electron');
const path = require('path');
const https = require('https');
const fs = require('fs');

// ---------- PATHS ----------
const settingsPath  = () => path.join(app.getPath('userData'), 'notif-settings.json');
const notifDataPath = () => path.join(app.getPath('userData'), 'notif-data.json');

function readJSON(p, def) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return def; }
}
function writeJSON(p, d) {
  fs.writeFileSync(p, JSON.stringify(d, null, 2));
}

// ---------- WINDOWS ----------
let mainWindow  = null;
let notifWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
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

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ---------- CUSTOM NOTIFICATION POPUP ----------
function parseBodyToDays(body) {
  return (body || '').split('\n').map(line => {
    // "0 SFS · Demain 29 avr"  ou  "2 SFS · J+3 1 mai ✅"
    const m = line.match(/^(\d+) SFS · (.+?)(\s*✅)?$/);
    if (!m) return { label: line.trim(), count: 0 };
    return { count: parseInt(m[1]), label: m[2].trim() };
  }).filter(d => d.label);
}

function showCustomNotif(data) {
  // Ferme la popup précédente si elle existe
  if (notifWindow && !notifWindow.isDestroyed()) {
    notifWindow.close();
    notifWindow = null;
  }

  const { width: sw } = screen.getPrimaryDisplay().workAreaSize;
  const h = 130 + (data.models.length * 110);

  notifWindow = new BrowserWindow({
    width: 400,
    height: h,
    x: sw - 412,
    y: 36,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    webPreferences: {
      preload: path.join(__dirname, 'notif-preload.js'),
      contextIsolation: true,
    },
    show: false,
  });

  const encoded = encodeURIComponent(JSON.stringify(data));
  notifWindow.loadURL(
    `file://${path.join(__dirname, 'notif.html')}?d=${encoded}`
  );

  notifWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  notifWindow.once('ready-to-show', () => {
    if (notifWindow && !notifWindow.isDestroyed()) notifWindow.showInactive();
  });

  // Auto-close à 10.5s (légèrement après le timer interne de 10s)
  setTimeout(() => {
    if (notifWindow && !notifWindow.isDestroyed()) {
      notifWindow.close();
      notifWindow = null;
    }
  }, 10500);
}

// ---------- NOTIFICATION IPC ----------
ipcMain.on('notif-open-app', () => {
  if (notifWindow && !notifWindow.isDestroyed()) {
    notifWindow.close();
    notifWindow = null;
  }
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  } else {
    createWindow();
  }
});

ipcMain.on('notif-close', () => {
  if (notifWindow && !notifWindow.isDestroyed()) {
    notifWindow.close();
    notifWindow = null;
  }
});

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
  if (mainWindow) mainWindow.webContents.reloadIgnoringCache();
});

// ---------- NOTIFICATION SETTINGS ----------
ipcMain.handle('get-notif-settings',  ()        => readJSON(settingsPath(), {}));
ipcMain.handle('save-notif-settings', (_, s)    => writeJSON(settingsPath(), s));

// ---------- SEND NOTIFICATIONS ----------
// Throttle : une popup max toutes les 3h par modèle
ipcMain.handle('send-notifs', (_, { models }) => {
  if (!models?.length) return;

  const THREE_HOURS = 3 * 60 * 60 * 1000;
  const now = Date.now();
  const nd  = readJSON(notifDataPath(), { lastSentAt: {} });

  // Filtre les modèles qui ont passé le throttle
  const toShow = models.filter(({ model }) => {
    return (now - (nd.lastSentAt[model] || 0)) >= THREE_HOURS;
  });

  if (!toShow.length) return;

  // Construit le payload structuré pour notif.html
  const payload = {
    models: toShow.map(({ model, body }) => ({
      name: model,
      days: parseBodyToDays(body),
    })),
  };

  showCustomNotif(payload);

  // Met à jour le throttle
  toShow.forEach(({ model }) => { nd.lastSentAt[model] = now; });
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
