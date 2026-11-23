// Feel The Wrath — Electron main process
const { app, BrowserWindow, shell, Menu, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// ---- log file: %APPDATA%\Feel The Wrath\ftw.log ----
const logFile = () => path.join(app.getPath('userData'), 'ftw.log');
function log(...a) {
  try { fs.appendFileSync(logFile(), new Date().toISOString() + ' ' + a.join(' ') + '\n'); } catch {}
}
function fail(title, err) {
  log('ERROR', title, err && (err.stack || err));
  try { dialog.showErrorBox('Feel The Wrath — ' + title, String(err && (err.message || err)) + '\n\nLog: ' + logFile()); } catch {}
}
process.on('uncaughtException', e => fail('crashed', e));

// ---- Discord Rich Presence ----
// DISCORD_CLIENT_ID: "Application ID" from https://discord.com/developers/applications (app named "Feel The Wrath",
// with an image named "logo" under Rich Presence -> Art Assets). ITCH_URL: the game's itch.io page.
const DISCORD_CLIENT_ID = '1574371364960346233';
const ITCH_URL = 'https://aces22378-dev.itch.io/feel-the-wrath';
const RELEASES_URL = 'https://github.com/Aces22378-Dev/feel-the-wrath/releases/latest';
const rpc = (() => {
  let client = null, ready = false, want = {details: 'In the menu', state: '', since: 0}, retry = null, stats = null;
  const big = n => n >= 999999999 ? '∞' : n >= 1e6 ? (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M' : n >= 1e4 ? Math.round(n / 1e3) + 'k' : n.toLocaleString('en-US');
  const appStart = Date.now();
  function push() {
    if (!ready || !client || !client.user) return;
    const a = {
      details: want.details || 'In the menu',
      startTimestamp: new Date(want.since || appStart),
      largeImageKey: 'logo', largeImageText: 'Feel The Wrath',
      instance: false,
    };
    if (want.state) a.state = want.state;
    if (stats) {                         // account stats: rank badge + hover text, and full stats while in the menu
      const rec = `${stats.wins}W ${stats.losses}L · ${big(stats.merit)} Merit`;
      const money = `${big(stats.coins)} Gold · ${big(stats.silver)} Silver · ${big(stats.rp)} RP`;
      a.smallImageKey = 'rank_' + stats.rank; a.smallImageText = `${stats.rankName} · ${rec}`.slice(0, 128);
      a.largeImageText = money.slice(0, 128);
      if (!want.state && (!want.details || want.details === 'In the menu')) {
        a.details = `${stats.rankName} · ${big(stats.merit)} Merit`.slice(0, 128);
        a.state = `${stats.wins}W ${stats.losses}L · ${money}`.slice(0, 128);
      }
    }
    if (/^https:\/\/[a-z0-9-]+\.itch\.io\//i.test(ITCH_URL) && !ITCH_URL.includes('PUT-YOUR')) a.buttons = [{label: 'Buy on itch.io', url: ITCH_URL}];
    client.user.setActivity(a).catch(e => log('rpc setActivity failed', e && e.message));
  }
  function connect() {
    if (!/^\d{15,25}$/.test(DISCORD_CLIENT_ID)) { log('rpc off: no Discord application ID set'); return; }
    try {
      const { Client } = require('@xhayper/discord-rpc');
      client = new Client({ clientId: DISCORD_CLIENT_ID, transport: { type: 'ipc' } });
      client.on('ready', () => { ready = true; log('rpc connected'); push(); });
      client.on('disconnected', () => { ready = false; later(); });
      client.login().catch(() => { ready = false; later(); });     // Discord not running: try again in a bit
    } catch (e) { log('rpc error', e && e.message); later(); }
  }
  function later() { clearTimeout(retry); retry = setTimeout(() => { try { client && client.destroy(); } catch {} client = null; connect(); }, 30000); }
  return {
    start: connect,
    set(p) { want = p; push(); },
    setStats(s) { stats = s; push(); },
    stop() { clearTimeout(retry); try { client && client.user && client.user.clearActivity(); client && client.destroy(); } catch {} },
  };
})();
ipcMain.on('ftw:presence', (e, p) => rpc.set(p || {}));
ipcMain.on('ftw:stats', (e, s) => {
  const n = v => Math.max(0, Math.floor(Number(v) || 0));
  rpc.setStats(s ? { rank: Math.min(28, n(s.rank)), rankName: String(s.rankName || '').slice(0, 60), merit: n(s.merit), wins: n(s.wins),
                     losses: n(s.losses), coins: n(s.coins), silver: n(s.silver), rp: n(s.rp) } : null);
});

// ---- auto-updater (GitHub Releases, see "publish" in package.json) ----
// A newer release = this version is outdated: the game is blocked until the player clicks Update.
let autoUpdater = null;
function sendUpdate(u) { const w = BrowserWindow.getAllWindows()[0]; if (w && !w.isDestroyed()) w.webContents.send('ftw:update-status', u); }
function setupUpdater() {
  if (!app.isPackaged) return;                      // only in the installed game
  try { ({ autoUpdater } = require('electron-updater')); } catch (e) { log('updater missing', e && e.message); return; }
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.logger = { info: (...a) => log('upd', ...a), warn: (...a) => log('upd warn', ...a), error: (...a) => log('upd error', ...a), debug: () => {} };
  autoUpdater.on('update-available', i => { log('update available', i.version); sendUpdate({ state: 'available', version: i.version }); });
  autoUpdater.on('download-progress', p => sendUpdate({ state: 'progress', percent: Math.floor(p.percent || 0) }));
  autoUpdater.on('update-downloaded', () => { sendUpdate({ state: 'ready' }); setTimeout(() => autoUpdater.quitAndInstall(true, true), 1200); });
  autoUpdater.on('error', e => { log('update error', e && e.message); sendUpdate({ state: 'error', message: String((e && e.message) || e).slice(0, 160) }); });
  const check = () => autoUpdater.checkForUpdates().catch(e => log('update check failed', e && e.message));   // offline: just keep playing
  check();
  setInterval(check, 5 * 60 * 1000);               // check again every 5 minutes
}
ipcMain.on('ftw:update-now', () => {
  if (!autoUpdater) { shell.openExternal(RELEASES_URL); return; }
  autoUpdater.downloadUpdate().catch(e => sendUpdate({ state: 'error', message: String((e && e.message) || e).slice(0, 160) }));
});

// if the graphics driver crashed last time, start without hardware acceleration
const noGpuFlag = () => path.join(app.getPath('userData'), 'disable-gpu');
try { if (fs.existsSync(noGpuFlag())) { app.disableHardwareAcceleration(); } } catch {}

// one copy of the game at a time: a second launch just focuses the first one
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  let win = null;

  function createWindow() {
    log('start', app.getVersion(), process.platform, process.arch, 'gpu:', !fs.existsSync(noGpuFlag()));
    win = new BrowserWindow({
      width: 1392,
      height: 752,
      minWidth: 960,
      minHeight: 540,
      useContentSize: true,
      backgroundColor: '#050506',
      title: 'Feel The Wrath',
      icon: path.join(__dirname, 'build', 'icon.png'),
      autoHideMenuBar: true,
      show: true,                                  // show right away (don't wait for the page)
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        preload: path.join(__dirname, 'preload.js'),
        autoplayPolicy: 'no-user-gesture-required',  // menu music starts right away
        devTools: !app.isPackaged,                    // dev tools only when running from source
      },
    });
    Menu.setApplicationMenu(null);
    win.maximize();
    win.loadFile(path.join(__dirname, 'app', 'index.html')).catch(e => fail('could not load the game', e));

    const wc = win.webContents;
    wc.on('did-finish-load', () => { log('page loaded'); if (!setupUpdater.done) { setupUpdater.done = true; setupUpdater(); } });
    wc.on('did-fail-load', (e, code, desc, url) => fail('could not load the game', `${desc} (${code}) ${url}`));
    wc.on('render-process-gone', (e, d) => {
      log('renderer gone', d.reason, d.exitCode);
      if (d.reason !== 'clean-exit') { fail('the game window crashed', d.reason); try { wc.reload(); } catch {} }
    });
    wc.on('console-message', (e, level, msg) => { if (level >= 3) log('page error', msg); });

    // F11 toggles fullscreen (the in-game Settings toggle uses the same thing)
    wc.on('before-input-event', (e, input) => {
      if (input.type === 'keyDown' && input.key === 'F11') { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
    });
    // links that try to open new windows go to the real browser instead
    wc.setWindowOpenHandler(({ url }) => {
      if (/^https?:\/\//.test(url)) shell.openExternal(url);
      return { action: 'deny' };
    });
    // never navigate the game window away from the game
    wc.on('will-navigate', (e, url) => { if (!url.startsWith('file://')) e.preventDefault(); });
    win.on('closed', () => { win = null; });
  }

  // graphics driver crashed: remember it and restart without hardware acceleration
  app.on('child-process-gone', (e, d) => {
    log('child process gone', d.type, d.reason);
    if (d.type === 'GPU' && d.reason !== 'clean-exit') {
      try { fs.writeFileSync(noGpuFlag(), 'GPU crashed: ' + d.reason); } catch {}
      app.relaunch(); app.exit(0);
    }
  });
  app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.show(); win.focus(); } });
  app.whenReady().then(() => { createWindow(); rpc.start(); }).catch(e => fail('could not start', e));
  app.on('before-quit', () => rpc.stop());
  app.on('window-all-closed', () => app.quit());
}
