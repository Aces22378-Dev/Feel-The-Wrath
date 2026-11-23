(() => {
  const RANKS = [0, 40, 90, 150, 220, 300, 390, 490, 600, 720, 850, 990, 1140, 1300, 1470, 1650, 1840, 2040, 2250, 2470, 2700, 2940, 3190, 3450, 3720, 4000, 4300, 4620, 5000], NAMES = ["Private", "Private Second Class", "Private First Class", "Specialist", "Corporal", "Sergeant", "Staff Sergeant", "Sergeant First Class", "Master Sergeant", "First Sergeant", "Sergeant Major", "Command Sergeant Major", "Sergeant Major of the Army", "Warrant Officer 1", "Chief Warrant Officer 2", "Chief Warrant Officer 3", "Chief Warrant Officer 4", "Chief Warrant Officer 5", "Second Lieutenant", "First Lieutenant", "Captain", "Major", "Lieutenant Colonel", "Colonel", "Brigadier General", "Major General", "Lieutenant General", "General", "General of the Army"];
  const rankOf = m => { let i = 0; while (i + 1 < RANKS.length && m >= RANKS[i + 1]) i++; return i; };
  // show the current version from GitHub releases
  fetch('https://api.github.com/repos/Aces22378-Dev/Feel-The-Wrath/releases/latest').then(r => r.ok ? r.json() : null).then(rel => {
    if (!rel || !rel.tag_name) return;
    const m = document.getElementById('meta');
    m.innerHTML = 'Version <b></b> for Windows 10 and 11. Pay once, and every update is free.';
    m.querySelector('b').textContent = rel.tag_name.replace(/^v/, '');
  }).catch(() => {});
  // live top ten
  const tb = document.getElementById('lb');
  fetch('https://ftw-server.minecraftmobileexplorer.workers.dev/api/public/leaderboard').then(r => r.json()).then(d => {
    tb.innerHTML = '';
    if (!d.top || !d.top.length) { tb.innerHTML = '<tr><td colspan="4" class="empty">No ranked matches yet. Be the first.</td></tr>'; return; }
    d.top.forEach((p, n) => {
      const i = rankOf(p.merit), tr = document.createElement('tr');
      const td = (c, t) => { const e = document.createElement('td'); e.className = c; if (t != null) e.textContent = t; tr.appendChild(e); return e; };
      td('n', n + 1);
      const who = td('p'); const ic = document.createElement('i'); ic.style.backgroundPosition = (-i * 30) + 'px 0'; ic.title = NAMES[i];
      const nm = document.createElement('span'); nm.textContent = p.username; who.append(ic, nm);
      if (p.title) { const t = document.createElement('span'); t.className = 'ttl'; t.textContent = p.title; if (/^#[0-9a-f]{6}$/i.test(p.color || '')) t.style.setProperty('--c', p.color); who.appendChild(t); }
      td('r', NAMES[i]); td('m', p.merit.toLocaleString('en-US'));
      tb.appendChild(tr);
    });
  }).catch(() => { tb.innerHTML = '<tr><td colspan="4" class="empty">The leaderboard couldn\'t load. Try refreshing.</td></tr>'; });
  // embers, once, quietly
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const box = document.getElementById('embers');
    for (let k = 0; k < 22; k++) {
      const e = document.createElement('i');
      e.style.left = Math.random() * 100 + '%'; e.style.setProperty('--dx', (Math.random() * 120 - 60) + 'px');
      e.style.animationDuration = (7 + Math.random() * 8) + 's'; e.style.animationDelay = (-Math.random() * 15) + 's';
      box.appendChild(e);
    }
  }
})();
