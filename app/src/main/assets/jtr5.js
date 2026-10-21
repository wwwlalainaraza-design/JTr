/* ---------- Gestion des comptes et données (Optimisé anti-ANR) ---------- */

function saveAll() {
  const keep = trades.filter(t => !t.demo);
  const light = keep.map(t => { const c = Object.assign({}, t); delete c.shots; return c; });
  const data = {
    v: 2, accounts: accounts, acct: acct, nextId: nextId, demoOff: demoOff, trades: light, remarks: remarks,
    cfg: { inputTz: cfg.inputTz, viewTz: cfg.viewTz, minTrades: cfg.minTrades, sessions: cfg.sessions, assets: cfg.assets, bandMode: cfg.bandMode, bandCustom: cfg.bandCustom }
  };
  const json = JSON.stringify(data);
  const okN = nSave('jtr-data', json), okL = lsSet('jtr-data', json);
  if (!okN && !okL) { warnStorage('Sauvegarde impossible : l’espace de stockage est refusé ou plein.'); return false; }

  // Sauvegarde globale et unique de toutes les captures pour éviter les blocages disque au démarrage
  const shots = {};
  keep.forEach(t => { if (t.shots && t.shots.length) shots[t.id] = t.shots; });
  const shotsJson = JSON.stringify(shots);
  nSave('jtr-shots', shotsJson);
  lsSet('jtr-shots', shotsJson);

  return true;
}

function applyData(d) {
  if (!d || !Array.isArray(d.trades) || !Array.isArray(d.accounts) || !d.accounts.length) throw new Error('format');
  accounts = d.accounts;
  acct = accounts.some(a => a.id === d.acct) ? d.acct : accounts[0].id;
  nextId = Math.max(nextId, Number(d.nextId) || 1);
  demoOff = !!d.demoOff;
  remarks = Array.isArray(d.remarks) ? d.remarks : [];
  if (d.cfg) Object.keys(d.cfg).forEach(k => { if (k in cfg && d.cfg[k] != null) cfg[k] = d.cfg[k]; });

  // Chargement global et instantané en une seule lecture
  let shots = {};
  const rawShots = nLoad('jtr-shots') || lsGet('jtr-shots');
  if (rawShots) {
    try { shots = JSON.parse(rawShots) || {}; } catch (e) { shots = {}; }
  }

  trades = d.trades.map(t => {
    t.shots = shots[t.id] || [];
    return t;
  });
}

function loadAll() {
  const raw = nLoad('jtr-data') || lsGet('jtr-data');
  if (!raw) return false;
  try { applyData(JSON.parse(raw)); return true; }
  catch (e) {
    lsSet('jtr-data-corrompu', raw); nSave('jtr-data-corrompu', raw);
    try {
      const n = jtrNative(), bak = n && n.loadBackup ? n.loadBackup('jtr-data') : '';
      if (bak && bak !== raw) { applyData(JSON.parse(bak)); return true; }
    } catch (e2) {}
    return false;
  }
}