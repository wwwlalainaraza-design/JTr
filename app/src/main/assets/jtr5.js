/* ---------- Comptes ---------- */
const nextAccent = () => { const used = accounts.map(a => a.accent); return Object.keys(ACCENTS).find(k => !used.includes(k)) || 'blue'; };
const accentColor = k => (ACCENTS[k] || ACCENTS.blue).c;
let acctDraft = null;
let bulkRemarkTargets = new Set();
let bulkRemarkDest = '';
let bulkRemarkSelected = new Set();
function acctRowsHTML() {
  return accounts.map(a => {
    const n = trades.filter(t => t.acct === a.id).length;
    return `<button class="acctrow press ${a.id === acct ? 'on' : ''}" data-act="pick-acct:${a.id}"><i class="dot" style="background:${accentColor(a.accent)}"></i>
      <span><b>${esc(a.name)}</b>${a.id === acct ? '<i class="lowtag">actif</i>' : ''}<small>${n} trade${n > 1 ? 's' : ''}</small></span>
      <span class="acctedit" data-act="edit-acct:${a.id}">Modifier</span></button>`;
  }).join('');
}
function paintAcctChoices() {
  const c = $('#acctColors');
  if (c) c.innerHTML = Object.keys(ACCENTS).map(k => `<button class="swatch press ${acctDraft.accent === k ? 'on' : ''}" data-acolor="${k}" style="background:${ACCENTS[k].c}" aria-label="${ACCENTS[k].t}"></button>`).join('');
}
function openAcctSheet(id) {
  const a = id ? acctObj(id) : { name: '', type: 'reel', accent: nextAccent() };
  acctDraft = { id: id || null, name: a.name, accent: a.accent };
  openSheet(`<div class="grab"></div><h2 style="margin-top:4px">${id ? 'Modifier le compte' : 'Nouveau compte'}</h2>
    <div class="field"><label for="acctName">Nom du compte</label><input id="acctName" maxlength="30" placeholder="ex. XAUUSD Backtest octobre" value="${esc(a.name)}"></div>
    <div class="field"><label>Couleur</label><div class="chips" id="acctColors"></div></div>
    <div class="btnrow"><button class="ghost press" data-act="close">Annuler</button><button class="primary press" style="padding:14px;font-size:15px;box-shadow:none" data-act="save-acct">Enregistrer</button></div>
    ${id && accounts.length > 1 ? `<button class="dangerbtn press" style="margin-top:12px" data-act="ask-del-acct:${id}">Supprimer ce compte</button>` : ''}`);
  paintAcctChoices();
  if (!id) setTimeout(() => { const i = $('#acctName'); if (i) i.focus(); }, 350);
}
function saveAcct() {
  const name = (($('#acctName') || {}).value || '').trim();
  if (!name) { toast('Donne un nom au compte'); return; }
  if (accounts.some(a => a.id !== acctDraft.id && a.name.toLowerCase() === name.toLowerCase())) { toast('Ce nom existe déjà'); return; }
  if (acctDraft.id) {
    const a = acctObj(acctDraft.id); a.name = name; a.accent = acctDraft.accent;
    closeSheet(); toast('Compte modifié'); applyAccent(); renderSettings();
  } else {
    const id = 'c' + Date.now().toString(36);
    accounts.push({ id, name, accent: acctDraft.accent });
    closeSheet(); toast('Compte ajouté'); setAcct(id);
  }
}
document.addEventListener('click', e => {
  const c = e.target.closest('[data-acolor]');
  if (c && acctDraft) { acctDraft.accent = c.dataset.acolor; paintAcctChoices(); return; }
  const a = e.target.closest('[data-act]'); if (!a) return;
  const parts = a.dataset.act.split(':'), act = parts[0], arg = parts[1];
  if (act === 'new-acct') openAcctSheet(null);
  else if (act === 'edit-acct') openAcctSheet(arg);
  else if (act === 'pick-acct') { if (arg !== acct) setAcct(arg); }
  else if (act === 'save-acct') saveAcct();
  else if (act === 'ask-del-acct') {
    const n = trades.filter(x => x.acct === arg).length;
    confirmSheet(`Supprimer le compte « ${acctObj(arg).name} » ?`, `${n === 0 ? 'Ce compte ne contient aucun trade.' : n === 1 ? '1 trade de ce compte sera supprimé.' : n + ' trades de ce compte seront supprimés.'} Les autres comptes ne sont pas touchés. Cette action est définitive.`, 'Supprimer le compte', 'del-acct:' + arg);
  }
  else if (act === 'del-acct') {
    if (accounts.length < 2) return;
    trades = trades.filter(x => x.acct !== arg);
    remarks = remarks.filter(x => x.acct !== arg);
    accounts = accounts.filter(x => x.id !== arg);
    remarks = remarks.filter(x => x.acct !== arg);
    closeSheet(); toast('Compte supprimé');
    if (acct === arg) setAcct(accounts[0].id); else renderSettings();
  }
});

/* ---------- Sauvegarde sur le téléphone ---------- */
/* Deux niveaux : le « pont » Android (de vrais fichiers de l'application, durables même si l'application est fermée de force,
   sans limite de nombre de captures) et, à défaut, le stockage de la page. Les trades d'exemple ne sont jamais enregistrés. */
const jtrNative = () => window.JtrNative || null;
const nLoad = key => { const n = jtrNative(); if (!n) return ''; try { return n.load(key) || ''; } catch (e) { return ''; } };
const nSave = (key, v) => { const n = jtrNative(); if (!n) return false; try { return n.save(key, v) === true; } catch (e) { return false; } };
const nRemove = key => { const n = jtrNative(); if (n) { try { n.remove(key); } catch (e) {} } };
const lsGet = key => { try { return localStorage.getItem(key); } catch (e) { return null; } };
const lsSet = (key, v) => { try { localStorage.setItem(key, v); return true; } catch (e) { return false; } };
const lsRemove = key => { try { localStorage.removeItem(key); } catch (e) {} };
let lastJson = null, shotSig = {}, shotSigAll = null, legacyShots = false, warned = false, saveTimer = null;
function warnStorage(msg) { if (!warned) { warned = true; toast(msg); } }
const sigOf = t => (t.shots || []).map(s => s.length).join(',');
function saveAll() {
  const keep = trades.filter(t => !t.demo);
  const light = keep.map(t => { const c = Object.assign({}, t); c.nshots = shotCount(t); delete c.shots; delete c._lazy; return c; });
  const data = {
    v: 2, accounts: accounts, acct: acct, nextId: nextId, demoOff: demoOff, trades: light, remarks: remarks,
    journal: window.__JTR_JOURNAL || { fundamental: [], market: [] },
    cfg: { inputTz: cfg.inputTz, viewTz: cfg.viewTz, minTrades: cfg.minTrades, sessions: cfg.sessions, assets: cfg.assets, bandMode: cfg.bandMode, bandCustom: cfg.bandCustom }
  };
  const json = JSON.stringify(data);
  if (json !== lastJson) {   /* rien n'a changé : on n'écrit rien, donc aucune lenteur */
    const okN = nSave('jtr-data', json), okL = lsSet('jtr-data', json);
    if (!okN && !okL) { warnStorage('Sauvegarde impossible : l’espace de stockage est refusé ou plein.'); return false; }
    lastJson = json;
  }
  if (jtrNative()) {
    let fail = false; const alive = {};
    keep.forEach(t => {
      alive[t.id] = true;
      if (t._lazy) return;   /* captures pas encore chargées : leur fichier reste tel quel */
      const sg = sigOf(t);
      if (shotSig[t.id] === sg) return;
      if (t.shots && t.shots.length) { if (nSave('shots-' + t.id, JSON.stringify(t.shots))) shotSig[t.id] = sg; else fail = true; }
      else { nRemove('shots-' + t.id); shotSig[t.id] = sg; }
    });
    Object.keys(shotSig).forEach(id => { if (!alive[id]) { nRemove('shots-' + id); delete shotSig[id]; } });
    if (fail) warnStorage('Les captures n’ont pas pu être enregistrées sur le téléphone.');
    else if (legacyShots) { lsRemove('jtr-shots'); legacyShots = false; }
  } else {
    const sig = keep.map(t => t.id + ':' + sigOf(t)).join('|');
    if (sig !== shotSigAll) {
      shotSigAll = sig;
      const shots = {};
      keep.forEach(t => { if (t.shots && t.shots.length) shots[t.id] = t.shots; });
      if (!lsSet('jtr-shots', JSON.stringify(shots))) warnStorage('Espace plein : les trades sont gardés, mais pas toutes les captures. Supprime des captures pour libérer de la place.');
    }
  }
  return true;
}
/* Charge les captures d'un trade au moment où on en a besoin (détail, modification). */
function ensureShots(t) {
  if (!t || !t._lazy) return t;
  let s = [];
  try { s = JSON.parse(nLoad('shots-' + t.id) || '[]') || []; } catch (e) { s = []; }
  t.shots = s; t._lazy = false; shotSig[t.id] = sigOf(t);
  return t;
}
function applyData(d) {
  if (!d || !Array.isArray(d.trades) || !Array.isArray(d.accounts) || !d.accounts.length) throw new Error('format');
  accounts = d.accounts.map(a => { const copy = Object.assign({}, a); delete copy.type; return copy; });
  acct = accounts.some(a => a.id === d.acct) ? d.acct : accounts[0].id;
  nextId = Math.max(nextId, Number(d.nextId) || 1);
  demoOff = !!d.demoOff;
  remarks = Array.isArray(d.remarks) ? d.remarks : [];
  window.__JTR_JOURNAL = d.journal && typeof d.journal === 'object' ? d.journal : { fundamental: [], market: [] };
  if (!Array.isArray(window.__JTR_JOURNAL.fundamental)) window.__JTR_JOURNAL.fundamental = [];
  if (!Array.isArray(window.__JTR_JOURNAL.market)) window.__JTR_JOURNAL.market = [];
  if (d.cfg) Object.keys(d.cfg).forEach(k => { if (k in cfg && d.cfg[k] != null) cfg[k] = d.cfg[k]; });
  let legacy = {};
  try { legacy = JSON.parse(lsGet('jtr-shots') || '{}') || {}; } catch (e) { legacy = {}; }
  const hasNative = !!jtrNative();
  shotSig = {}; shotSigAll = null; legacyShots = false; lastJson = null;
  trades = d.trades.map(t => {
    let s = [];
    if (hasNative) {
      if (legacy[t.id] && legacy[t.id].length) { s = legacy[t.id]; legacyShots = true; }   /* ancienne sauvegarde : migrée au prochain enregistrement */
      else if (t.nshots > 0) { t._lazy = true; shotSig[t.id] = 'lazy'; }   /* les captures ne sont lues qu'à l'ouverture du trade */
    } else s = legacy[t.id] || [];
    t.shots = s;
    return t;
  });
  if (!hasNative) shotSigAll = trades.filter(t => !t.demo).map(t => t.id + ':' + sigOf(t)).join('|');
}
function loadAll() {
  const raw = nLoad('jtr-data') || lsGet('jtr-data');
  if (!raw) return false;
  try { applyData(JSON.parse(raw)); return true; }
  catch (e) {
    lsSet('jtr-data-corrompu', raw); nSave('jtr-data-corrompu', raw);   /* copie de secours avant toute réécriture */
    try {
      const n = jtrNative(), bak = n && n.loadBackup ? n.loadBackup('jtr-data') : '';
      if (bak && bak !== raw) { applyData(JSON.parse(bak)); return true; }
    } catch (e2) {}
    return false;
  }
}
function validateBackupPayload(payload) {
  if (!payload || payload.format !== 'jtr-backup' || payload.version !== 1) throw new Error('Format de sauvegarde non reconnu.');
  const data = payload.data;
  if (!data || !Array.isArray(data.accounts) || !data.accounts.length || !Array.isArray(data.trades)) throw new Error('La sauvegarde ne contient pas de journal valide.');
  if (!payload.shots || typeof payload.shots !== 'object' || Array.isArray(payload.shots)) throw new Error('Les captures de la sauvegarde sont invalides.');
  const accountIds = new Set();
  data.accounts.forEach(a => {
    if (!a || a.id == null || !String(a.name || '').trim() || accountIds.has(String(a.id))) throw new Error('Un compte de la sauvegarde est invalide.');
    accountIds.add(String(a.id));
  });
  const ids = new Set();
  data.trades.forEach(t => {
    if (!t || t.id == null || ids.has(String(t.id)) || !accountIds.has(String(t.acct))) throw new Error('Un trade a un identifiant ou un compte invalide.');
    ids.add(String(t.id));
  });
  Object.keys(payload.shots).forEach(id => {
    if (!ids.has(String(id)) || !Array.isArray(payload.shots[id]) || payload.shots[id].some(x => typeof x !== 'string'))
      throw new Error('Une liste de captures est invalide.');
  });
  return true;
}
function buildBackupData() {
  const keep = trades.filter(t => !t.demo);
  const light = keep.map(t => {
    const c = Object.assign({}, t); c.nshots = shotCount(t); delete c.shots; delete c._lazy; return c;
  });
  return {
    v: 2, accounts: accounts, acct: acct, nextId: nextId, demoOff: demoOff, trades: light, remarks: remarks,
    journal: window.__JTR_JOURNAL || { fundamental: [], market: [] },
    cfg: { inputTz: cfg.inputTz, viewTz: cfg.viewTz, minTrades: cfg.minTrades, sessions: cfg.sessions, assets: cfg.assets, bandMode: cfg.bandMode, bandCustom: cfg.bandCustom }
  };
}
function buildBackupPayload() {
  const data = buildBackupData();
  const shots = {};
  trades.filter(t => !t.demo).forEach(t => {
    const expected = shotCount(t);
    ensureShots(t);
    if ((t.shots || []).length !== expected) throw new Error('Captures manquantes pour le trade ' + t.id + ' : sauvegarde annulée.');
    if (t.shots && t.shots.length) shots[String(t.id)] = t.shots.slice();
  });
  const payload = { format: 'jtr-backup', version: 1, exportedAt: new Date().toISOString(), data, shots };
  validateBackupPayload(payload);
  return payload;
}
function restoreBackupPayload(payload) {
  validateBackupPayload(payload);
  applyData(payload.data);
  trades.forEach(t => {
    t.shots = (payload.shots[String(t.id)] || []).slice();
    t.nshots = t.shots.length;
    delete t._lazy;
  });
  shotSig = {}; shotSigAll = null; lastJson = null;
  if (!saveAll()) throw new Error('Impossible d’enregistrer la sauvegarde restaurée.');
  if (typeof location !== 'undefined' && location.reload) setTimeout(() => location.reload(), 50);
  return true;
}
['click', 'change', 'input'].forEach(ev => document.addEventListener(ev, () => { clearTimeout(saveTimer); saveTimer = setTimeout(saveAll, 300); }, true));
window.addEventListener('pagehide', saveAll);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') saveAll(); });

/* ---------- Analyse des time frames des concepts ---------- */
function simpleRow(label, s, low) {
  return `<tr class="${low ? 'low' : ''}"><th>${esc(label)}${low ? '<i class="lowtag">peu</i>' : ''}</th><td>${s.n}</td><td>${fmtWR(s.winRate)}</td><td class="${signClass(s.total)}"><b>${fmtR(s.total, 1)}</b></td><td>${fmtPF(s.pf)}</td><td class="${signClass(s.expectancy)}">${fmtR(s.expectancy, 2)}</td></tr>`;
}
const simpleTable = (first, rows) => `<div class="tbl"><table><thead><tr><th>${first}</th><th>Trades</th><th>Réussite</th><th>Net</th><th>PF</th><th>Espérance</th></tr></thead><tbody>${rows}</tbody></table></div>`;
function entryTfHTML(done) {
  const full = done.filter(t => t.full);
  if (!full.length) return '';
  const table = (key, title) => {
    const m = {};
    full.forEach(t => { if (t[key]) (m[t[key]] = m[t[key]] || []).push(t); });
    const rows = TFS.filter(tf => m[tf]).map(tf => { const s = calc(m[tf]); return simpleRow(tf, s, s.n < cfg.minTrades); }).join('');
    return rows ? `<h2>${title}</h2>${simpleTable('Time frame', rows)}` : '';
  };
  return table('tfEntry', 'Time frame d’entrée') + table('tfHigh', 'Time frame supérieur') +
    `<p class="note">Ces deux tableaux viennent de l’analyse complète : seuls les trades enregistrés avec ce mode y figurent.</p>`;
}
function tfHTML(scope) {
  const done = scope.filter(isDone), ind = INDS[aInd];
  const groups = tfGroups(done), used = TFS.filter(tf => groups[tf]);
  const noTf = done.filter(t => (t.concepts || []).length && !tradeTfs(t).length).length;
  if (!used.length) {
    return `<div class="card empty"><b>Aucun time frame renseigné</b><p>Dans « Nouveau trade », touche un concept (par exemple OB) puis choisis son time frame. Reviens ici ensuite.</p></div>${entryTfHTML(done)}`;
  }
  const rows = used.map(tf => ({ tf, s: calc(groups[tf]) }));
  const chart = barChart(rows.map(r => { const v = ind.val(r.s); return { label: r.tf, v: v === Infinity ? null : v, low: r.s.n < cfg.minTrades }; }),
    { signed: ind.signed, max: ind.max, fmt: v => ind.fmt(v).replace('+', ''), label: 'Résultats par time frame' });
  const ok = rows.filter(r => r.s.n >= cfg.minTrades);
  const best = ok.filter(r => r.s.total > 0).sort((a, b) => b.s.total - a.s.total).slice(0, 3);
  const worst = ok.filter(r => r.s.total < 0).sort((a, b) => a.s.total - b.s.total).slice(0, 3);
  const li = r => `<div class="cardrow" style="padding:6px 0"><span><b>${r.tf}</b> <small class="muted">${r.s.n} trades, ${fmtWR(r.s.winRate)}</small></span><b class="${signClass(r.s.total)}">${fmtR(r.s.total, 1)} R</b></div>`;
  const cg = conceptTfGroups(done);
  const keys = Object.keys(cg).sort((a, b) => Object.keys(cg[b]).reduce((s, k) => s + cg[b][k].length, 0) - Object.keys(cg[a]).reduce((s, k) => s + cg[a][k].length, 0));
  const matrix = keys.length ? `<div class="tbl mx"><table><thead><tr><th>Concept</th>${used.map(tf => `<th>${tf}</th>`).join('')}</tr></thead><tbody>${keys.map(k => `<tr><th>${esc(k)}</th>${used.map(tf => {
    const s = calc(cg[k][tf] || []);
    return `<td class="${s.n && s.n < cfg.minTrades ? 'low' : ''}">${cellOf(ind, s)}<small>${s.n} trade${s.n > 1 ? 's' : ''}</small></td>`;
  }).join('')}</tr>`).join('')}</tbody></table></div>` : '';
  const tips = keys.map(k => {
    const el = used.map(tf => ({ tf, s: calc(cg[k][tf] || []) })).filter(x => x.s.n >= cfg.minTrades);
    if (el.length < 2) return null;
    el.sort((a, b) => b.s.expectancy - a.s.expectancy);
    return { k, a: el[0], b: el[1] };
  }).filter(Boolean).slice(0, 6);
  const tipRow = x => `<div class="crow"><b>${esc(x.k)}</b><span class="bval">${x.a.tf}</span><small>${x.a.tf} : espérance ${fmtR(x.a.s.expectancy, 2)} R sur ${x.a.s.n} trades, contre ${fmtR(x.b.s.expectancy, 2)} R en ${x.b.tf} sur ${x.b.s.n} trades</small></div>`;
  return `${indChips()}
    ${noTf ? `<p class="note" style="margin:0 2px 10px">${noTf} trade${noTf > 1 ? 's' : ''} avec des concepts mais sans time frame : exclu${noTf > 1 ? 's' : ''} de cette vue.</p>` : ''}
    <div class="chart" style="margin-top:4px"><h3>Résultats par time frame : ${ind.t}</h3>${chart}
      <p class="note">Barres claires : moins de ${cfg.minTrades} trades. Un trade qui utilise plusieurs time frames compte dans chacun : les totaux ne s’additionnent pas.</p></div>
    <h2>Tableau par time frame</h2>${simpleTable('Time frame', rows.map(r => simpleRow(r.tf, r.s, r.s.n < cfg.minTrades)).join(''))}
    <h2>À étudier de plus près</h2><section class="card">
      ${ok.length ? `<b class="g">Les plus rentables</b>${best.length ? best.map(li).join('') : '<p class="note" style="margin:4px 0">Aucun avec un résultat positif.</p>'}
        <div style="height:10px"></div><b class="l">Les plus pénalisants</b>${worst.length ? worst.map(li).join('') : '<p class="note" style="margin:4px 0">Aucun avec un résultat négatif.</p>'}`
        : `<p class="note" style="margin:0">Pas encore assez de trades par time frame : il en faut au moins ${cfg.minTrades} (réglable dans Paramètres).</p>`}
      <p class="note" style="margin:10px 0 0">Ce sont des pistes à vérifier, pas des conclusions.</p></section>
    <h2>Concept et time frame</h2>${matrix || '<p class="note">Aucun concept avec un time frame pour l’instant.</p>'}
    <p class="note">Chaque concept est suivi avec sa méthode : un même nom (par exemple Order Block) n’est jamais mélangé entre ICT et SMC. Cases claires : moins de ${cfg.minTrades} trades.</p>
    <h2>Meilleur time frame par concept</h2>
    ${tips.length ? `<section class="card">${tips.map(tipRow).join('')}</section>` : `<div class="card"><small class="muted">Il faut au moins ${cfg.minTrades} trades sur deux time frames différents pour un même concept.</small></div>`}
    ${entryTfHTML(done)}
    <p class="note">Ces chiffres décrivent tes trades passés. Ils ne prédisent rien, et une corrélation ne prouve pas une cause.</p>`;
}

/* ---------- Signature ---------- */
let sigCount = 0, sigLast = 0;
document.addEventListener('click', e => {
  const box = e.target.closest('#curve, [data-sig]');
  if (!box) return;
  const now = Date.now();
  sigCount = (now - sigLast > 2000) ? 1 : sigCount + 1;
  sigLast = now;
  if (sigCount >= 14) {
    sigCount = 0;
    const old = box.querySelector('.sig'); if (old) old.remove();
    const s = document.createElement('div'); s.className = 'sig'; s.textContent = 'Miary Mamy';
    box.appendChild(s);
    setTimeout(() => { if (s.parentNode) s.remove(); }, 3300);
  }
});

/* ---------- Calendrier des gains et pertes (comptes réels) ---------- */
const MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
let calYM = null;
const calCur = () => { if (!calYM) { const n = new Date(); calYM = { y: n.getFullYear(), m: n.getMonth() }; } return calYM; };
/* Résultat net de chaque jour, en R, uniquement avec les trades terminés. */
function dayStats(done) {
  const g = {};
  done.forEach(t => { const d = locate(t).date; if (d) (g[d] = g[d] || []).push(t); });
  const out = {};
  Object.keys(g).forEach(d => { const s = calc(g[d]); out[d] = { net: s.total, n: s.n, wins: s.wins, losses: s.losses }; });
  return out;
}
/* Chiffres d'un mois : résultat net en R, jours actifs, réussite (BE compté dans les trades terminés). */
function monthStats(done, y, m) {
  const ym = y + '-' + pad(m + 1), days = dayStats(done);
  const keys = Object.keys(days).filter(d => d.slice(0, 7) === ym);
  const s = calc(done.filter(t => locate(t).date.slice(0, 7) === ym));
  return { days: days, keys: keys, net: s.total, active: keys.length, n: s.n, winRate: s.winRate };
}
function calBoxHTML() {
  const done = mine().filter(isDone), c = calCur(), y = c.y, m = c.m, ms = monthStats(done, y, m);
  const ym = y + '-' + pad(m + 1), todayStr = iso(today);
  const nDays = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const lead = (new Date(Date.UTC(y, m, 1)).getUTCDay() + 6) % 7;      /* la semaine commence le lundi */
  const maxAbs = Math.max(0.0001, ...ms.keys.map(d => Math.abs(ms.days[d].net)));
  let cells = '';
  for (let i = 0; i < lead; i++) cells += '<div class="day empty"></div>';
  for (let d = 1; d <= nDays; d++) {
    const key = ym + '-' + pad(d), s = ms.days[key], cls = (key === todayStr ? ' istoday' : '') + (hFilter.day === key ? ' sel' : '');
    if (s) {
      const onlyBE = s.wins === 0 && s.losses === 0;
      cells += `<button class="day ${s.net > 0 ? 'pos' : s.net < 0 ? 'neg' : 'flat'}${cls}" data-day="${key}" style="--a:${(0.2 + 0.4 * Math.abs(s.net) / maxAbs).toFixed(2)}"><span>${d}</span><b>${onlyBE ? 'BE' : fmtR(s.net, 1)}</b></button>`;
    } else cells += `<div class="day off${cls}"><span>${d}</span><b>&nbsp;</b></div>`;
  }
  const n = new Date(), isNow = n.getFullYear() === y && n.getMonth() === m;
  return `<div class="calnav"><button data-calnav="-1" aria-label="Mois précédent">‹</button><b>${MOIS[m]} ${y}</b><button data-calnav="1" aria-label="Mois suivant">›</button></div>
    ${isNow ? '' : '<p style="text-align:center;margin:-4px 0 10px"><button class="link" data-calnav="0">Revenir à ce mois-ci</button></p>'}
    <div class="kgrid">
      <div class="kcard"><b class="${signClass(ms.n ? ms.net : null)}">${ms.n ? fmtRN(ms.net) : '—'}</b><span>Résultat du mois</span></div>
      <div class="kcard"><b>${ms.active}</b><span>Jours actifs</span></div>
      <div class="kcard"><b>${fmtWR(ms.winRate)}</b><span>Réussite</span></div>
    </div>
    <div class="callegend"><span><i class="lg pos"></i>Positif</span><span><i class="lg neg"></i>Négatif</span><span><i class="lg flat"></i>Sans trade</span></div>
    <div class="cal">${['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM', 'DIM'].map(x => `<div class="calh">${x}</div>`).join('')}${cells}</div>
    <p class="note">Chaque case = résultat net du jour, en R, avec les trades terminés (BE = break-even). Touche un jour pour voir ses trades dans la liste en dessous, touche-le encore pour revenir à tous les trades.</p>`;
}
function paintCal() { const el = $('#calBox'); if (el) el.innerHTML = calBoxHTML(); }

/* ---------- Remarques à garder à l'œil ---------- */
/* Une remarque appartient à un compte ; elle apparaît dans les autres comptes seulement si tu l'as choisi. */
const visibleRemarks = () => remarks.filter(n => n.acct === acct || n.shared);
function remarksHTML() {
  const items = visibleRemarks().map(n => `<button class="rem ${n.color === 'red' ? 'red' : 'green'}" data-act="edit-rem:${n.id}">${esc(n.text)}${n.acct !== acct ? `<small>Remarque du compte « ${esc(acctObj(n.acct).name)} »</small>` : ''}</button>`).join('');
  return `<section class="remwrap"><div class="gname">À garder à l’œil</div>${items}<button class="addrem press" data-act="new-rem">+ Ajouter une remarque</button></section>`;
}
function paintRemarks() { const h = remarksHTML(); $$('.remslot').forEach(el => { el.innerHTML = h; }); }
let remDraft = null, copyDraft = null;
function paintRemColors() {
  const c = $('#remColors'); if (!c) return;
  c.innerHTML = [['green', 'Vert', 'res-gain'], ['red', 'Rouge', 'res-loss']].map(([v, t, cls]) => `<button class="chip press ${cls} ${remDraft.color === v ? 'on' : ''}" data-rcolor="${v}">${t}</button>`).join('');
}
function openRemSheet(id) {
  const n = id ? remarks.find(x => x.id === id) : null;
  remDraft = n ? { id: n.id, color: n.color === 'red' ? 'red' : 'green', shared: !!n.shared } : { id: null, color: 'green', shared: false };
  openSheet(`<div class="grab"></div><h2 style="margin-top:4px">${n ? 'Modifier la remarque' : 'Nouvelle remarque'}</h2>
    <div class="field"><label for="remText">Remarque</label><textarea id="remText" maxlength="300" placeholder="Ex. Ne pas trader avant la news américaine">${esc(n ? n.text : '')}</textarea></div>
    <div class="field"><label>Couleur de fond</label><div class="chips" id="remColors"></div></div>
    <div class="rowsw"><span>Afficher dans les autres comptes</span><button class="switch" id="sw-rshare" role="switch" aria-checked="${remDraft.shared}"><i></i></button></div>
    <div class="btnrow"><button class="ghost press" data-act="close">Annuler</button><button class="primary press" style="padding:14px;font-size:15px;box-shadow:none" data-act="save-rem">Enregistrer</button></div>
    ${n ? `<button class="ghost press" style="margin-top:12px" data-act="copy-rem:${n.id}">Copier vers un autre compte</button>
    <button class="dangerbtn press" style="margin-top:10px" data-act="ask-del-rem:${n.id}">Supprimer cette remarque</button>` : ''}`);
  paintRemColors();
  if (!n) setTimeout(() => { const i = $('#remText'); if (i) i.focus(); }, 350);
}
function saveRem() {
  const text = (($('#remText') || {}).value || '').trim();
  if (!text) { toast('Écris ta remarque'); return; }
  const isNew = !remDraft.id;
  if (isNew) remarks.push({ id: 'r' + Date.now().toString(36), acct: acct, text: text, color: remDraft.color, shared: remDraft.shared, created: Date.now() });
  else { const n = remarks.find(x => x.id === remDraft.id); if (n) { n.text = text; n.color = remDraft.color; n.shared = remDraft.shared; } }
  closeSheet(); toast(isNew ? 'Remarque ajoutée' : 'Remarque modifiée'); paintRemarks();
}
/* Copie une remarque dans d'autres comptes : chaque copie est indépendante de l'original. */
function copyRemark(id, targets) {
  const n = remarks.find(x => x.id === id); if (!n) return 0;
  let k = 0;
  targets.forEach(t => {
    if (t === n.acct || !accounts.some(a => a.id === t)) return;
    remarks.push({ id: 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), acct: t, text: n.text, color: n.color, shared: false, created: Date.now() });
    k++;
  });
  return k;
}
function paintCopyTargets() {
  const c = $('#copyTargets'); if (!c || !copyDraft) return;
  c.innerHTML = accounts.filter(a => a.id !== copyDraft.from).map(a => `<button class="chip press ${copyDraft.targets.includes(a.id) ? 'on' : ''}" data-ctarget="${a.id}"><i style="display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:6px;background:${accentColor(a.accent)}"></i>${esc(a.name)}</button>`).join('');
}
function openCopySheet(id) {
  const n = remarks.find(x => x.id === id); if (!n) return;
  if (accounts.filter(a => a.id !== n.acct).length === 0) { toast('Il faut un deuxième compte'); return; }
  copyDraft = { id: id, from: n.acct, targets: [] };
  openSheet(`<div class="grab"></div><h2 style="margin-top:4px">Copier la remarque</h2><p class="muted" style="margin:0 0 10px">${esc(n.text)}</p>
    <div class="field"><label>Copier vers</label><div class="chips" id="copyTargets"></div></div>
    <div class="btnrow"><button class="ghost press" data-act="close">Annuler</button><button class="primary press" style="padding:14px;font-size:15px;box-shadow:none" data-act="do-copy-rem">Copier</button></div>`);
  paintCopyTargets();
}
document.addEventListener('click', e => {
  const cn = e.target.closest('[data-calnav]');
  if (cn) {
    const v = Number(cn.dataset.calnav);
    if (v === 0) calYM = null;
    else { const c = calCur(); let mm = c.m + v, yy = c.y; if (mm < 0) { mm = 11; yy--; } if (mm > 11) { mm = 0; yy++; } calYM = { y: yy, m: mm }; }
    paintCal(); return;
  }
  const dy = e.target.closest('[data-day]');
  if (dy) { hFilter.day = hFilter.day === dy.dataset.day ? '' : dy.dataset.day; paintHistory(); return; }
  const rc = e.target.closest('[data-rcolor]');
  if (rc && remDraft) { remDraft.color = rc.dataset.rcolor; paintRemColors(); return; }
  const sw = e.target.closest('#sw-rshare');
  if (sw && remDraft) { remDraft.shared = !remDraft.shared; sw.setAttribute('aria-checked', remDraft.shared); return; }
  const ct = e.target.closest('[data-ctarget]');
  if (ct && copyDraft) { const v = ct.dataset.ctarget, i = copyDraft.targets.indexOf(v); if (i >= 0) copyDraft.targets.splice(i, 1); else copyDraft.targets.push(v); paintCopyTargets(); return; }
  const a = e.target.closest('[data-act]'); if (!a) return;
  const parts = a.dataset.act.split(':'), act = parts[0], arg = parts[1];
  if (act === 'bulk-copy-remarks') {
    const ids = [...bulkRemarkSelected].filter(id => remarks.some(n => n.id === id && n.acct === acct));
    const dest = bulkRemarkDest || (($('#bulk-rem-dest')||{}).value || '');
    if (!ids.length) { toast('Sélectionne au moins une remarque'); return; }
    if (!dest || dest === acct) { toast('Choisis un autre compte'); return; }
    let copied = 0; ids.forEach(id => { const n = remarks.find(x => x.id === id); if (!n) return; remarks.push({ id: 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2,7), acct: dest, text: n.text, color: n.color, shared: false, created: Date.now() }); copied++; });
    bulkRemarkSelected.clear(); if (typeof saveAll === 'function') saveAll(); toast(copied + ' remarque(s) copiée(s) vers « ' + acctObj(dest).name + ' »'); renderSettings(); paintRemarks(); return;
  }
  if (act === 'new-rem') openRemSheet(null);
  else if (act === 'edit-rem') openRemSheet(arg);
  else if (act === 'save-rem') saveRem();
  else if (act === 'copy-rem') openCopySheet(arg);
  else if (act === 'do-copy-rem') {
    const k = copyDraft ? copyRemark(copyDraft.id, copyDraft.targets) : 0;
    if (!k) { toast('Choisis au moins un compte'); return; }
    closeSheet(); toast(k === 1 ? 'Remarque copiée' : 'Remarque copiée dans ' + k + ' comptes'); paintRemarks();
  }
  else if (act === 'ask-del-rem') confirmSheet('Supprimer cette remarque ?', 'Elle disparaîtra de tous les comptes où elle s’affiche. Cette action est définitive.', 'Supprimer la remarque', 'del-rem:' + arg);
  else if (act === 'del-rem') { remarks = remarks.filter(x => x.id !== arg); closeSheet(); toast('Remarque supprimée'); paintRemarks(); }
});

/* ---------- Démarrage ---------- */
function applyAccent() { document.body.dataset.accent = acctObj().accent; }
function setAcct(a) {
  acct = a; applyAccent(); calYM = null;
  editingId = null; draft = newDraft(draft.strat);
  hFilter = { strat: 'Tous', res: 'Tous', tf: 'Tous', dir: 'Tous', day: '' }; period = 'Tout'; F = defaultFilters();
  go(current);
}
loadAll();
/* Plus aucun exemple automatique : si tu supprimes tout, ou si le stockage est vide, l'application reste vide.
   Les exemples n'apparaissent que si tu les demandes dans Paramètres (« Recharger les trades d'exemple »). */
applyAccent();
themeMode = readTheme();
applyTheme();
window.jtrApplyTheme = applyTheme;
go('home');
window.__JTR_OK = true;
window.__JTR_P5 = true;
