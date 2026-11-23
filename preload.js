// Feel The Wrath — bridge between the game page and the desktop app
const { contextBridge, ipcRenderer } = require('electron');

let updateCb = null, pending = [];
ipcRenderer.on('ftw:update-status', (e, u) => { if (updateCb) updateCb(u); else pending.push(u); });

contextBridge.exposeInMainWorld('ftwDesktop', {
  // Discord Rich Presence
  presence: (p) => ipcRenderer.send('ftw:presence', {
    details: String((p && p.details) || '').slice(0, 128),
    state: String((p && p.state) || '').slice(0, 128),
    since: Number((p && p.since) || 0),
  }),
  // account stats for the Rich Presence (rank badge, W/L, Merit, Gold/Silver/RP)
  stats: (s) => ipcRenderer.send('ftw:stats', s || null),
  // auto-updater: the game shows the "outdated" screen, these drive it
  onUpdate: (cb) => {
    const prev = updateCb;
    updateCb = (u) => { try { prev && prev(u); } catch {} cb(u); };
    pending.splice(0).forEach(u => updateCb(u));
  },
  update: () => ipcRenderer.send('ftw:update-now'),
});
