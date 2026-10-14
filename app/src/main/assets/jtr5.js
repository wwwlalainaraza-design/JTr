/* ---------- Comptes ---------- */
const nextAccent = () => { const used = accounts.map(a => a.accent); return Object.keys(ACCENTS).find(k => !used.includes(k)) || 'blue'; };
const accentColor = k => (ACCENTS[k] || ACCENTS.blue).c;
let acctDraft = null;
function acctRowsHTML() {
  return accounts.map(a => {
    const n = trades.filter(t => t.acct === a.id).length;
    return `<button class="acctrow press ${a.id === acct ? 'on' : ''}" data-act="pick-acct:${a.id}"><i class="dot" style="background:${accentColor(a.accent)}"></i>
      <span><b>${esc(a.name)}</b>${a.id === acct ? '<i class="lowtag">actif</i>' : ''}<small>${a.type === 'backtest' ? 'Backtest' : 'Compte réel'}, ${n} trade${n > 1 ? 's' : ''}</small></span>
      <span class="acctedit" data-act="edit-acct:${a.id}">Modifier</span></button>`;
  }).join('');
}
function paintAcctChoices() {
  const c = $('#acctColors'), t = $('#acctTypes');
  if (c) c.innerHTML = Object.keys(ACCENTS).map(k => `<button class="swatch press ${acctDraft.accent === k ? 'on' : ''}" data-acolor="${k}" style="background:${ACCENTS[k].c}" aria-label="${ACCENTS[k].t}"></button>`).join('');
  if (t) t.innerHTML = [['reel', 'Compte réel'], ['backtest', 'Backtest']].map(([v, l]) => `<button class="chip press ${acctDraft.type === v ? 'on' : ''}" data-atype="${v}">${l}</button>`).join('');
}
function openAcctSheet(id) {
  const a = id ? acctObj(id) : { name: '', type: 'reel', accent: nextAccent() };
  acctDraft = { id: id || null, name: a.name, type: a.type, accent: a.accent };
  openSheet(`<div class="grab"></div><h2 style="margin-top:4px">${id ? 'Modifier le compte' : 'Nouveau compte'}</h2>
    <div class="field"><label for="acctName">Nom du compte</label><input id="acctName" maxlength="30" placeholder="Compte réel 2" value="${esc(a.name)}"></div>
    <div class="field"><label>Type</label>${id ? `<p class="muted" style="margin:0">${a.type === 'backtest' ? 'Backtest' : 'Compte réel'} (le type ne peut pas changer)</p>` : '<div class="chips" id="acctTypes"></div>'}</div>
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
    accounts.push({ id, name, type: acctDraft.type, accent: acctDraft.accent });
    closeSheet(); toast('Compte ajouté'); setAcct(id);
  }
}
document.addEventListener('click', e => {
  const c = e.target.closest('[data-acolor]');
  if (c && acctDraft) { acctDraft.accent = c.dataset.acolor; paintAcctChoices(); return; }
  const t = e.target.closest('[data-atype]');
  if (t && acctDraft) { acctDraft.type = t.dataset.atype; paintAcctChoices(); return; }
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
    accounts = accounts.filter(x => x.id !== arg);
    closeSheet(); toast('Compte supprimé');
    if (acct === arg) setAcct(accounts[0].id); else renderSettings();
  }
});

/* ---------- Sauvegarde sur le téléphone ---------- */
/* Les trades d'exemple ne sont jamais enregistrés. Les captures sont gardées à part : si l'espace manque, les trades restent sauvegardés. */
let lastShotSig = null, warned = false, saveTimer = null;
function warnStorage(msg) { if (!warned) { warned = true; toast(msg); } }
function shotSignature(list) { return list.map(t => t.id + ':' + (t.shots || []).map(s => s.length).join(',')).join('|'); }
function saveAll() {
  const keep = trades.filter(t => !t.demo);
  try {
    const light = keep.map(t => { const c = Object.assign({}, t); delete c.shots; return c; });
    const data = {
      v: 1, accounts: accounts, acct: acct, nextId: nextId, demoOff: demoOff, trades: light,
      cfg: { inputTz: cfg.inputTz, viewTz: cfg.viewTz, minTrades: cfg.minTrades, sessions: cfg.sessions, assets: cfg.assets, bandMode: cfg.bandMode, bandCustom: cfg.bandCustom }
    };
    localStorage.setItem('jtr-data', JSON.stringify(data));
  } catch (e) { warnStorage('Sauvegarde impossible : l’espace de stockage est refusé ou plein.'); return false; }
  const sig = shotSignature(keep);
  if (sig !== lastShotSig) {
    lastShotSig = sig;
    try {
      const shots = {};
      keep.forEach(t => { if (t.shots && t.shots.length) shots[t.id] = t.shots; });
      localStorage.setItem('jtr-shots', JSON.stringify(shots));
    } catch (e) { warnStorage('Espace plein : les trades sont gardés, mais pas toutes les captures. Supprime des captures pour libérer de la place.'); }
  }
  return true;
}
function loadAll() {
  let raw = null;
  try { raw = localStorage.getItem('jtr-data'); } catch (e) { return false; }
  if (!raw) return false;
  try {
    const d = JSON.parse(raw);
    if (!d || !Array.isArray(d.trades) || !Array.isArray(d.accounts) || !d.accounts.length) throw new Error('format');
    accounts = d.accounts;
    acct = accounts.some(a => a.id === d.acct) ? d.acct : accounts[0].id;
    nextId = Math.max(nextId, Number(d.nextId) || 1);
    demoOff = !!d.demoOff;
    if (d.cfg) Object.keys(d.cfg).forEach(k => { if (k in cfg && d.cfg[k] != null) cfg[k] = d.cfg[k]; });
    let shots = {};
    try { shots = JSON.parse(localStorage.getItem('jtr-shots') || '{}') || {}; } catch (e) { shots = {}; }
    trades = d.trades.map(t => { t.shots = shots[t.id] || []; return t; });
    lastShotSig = shotSignature(trades.filter(t => !t.demo));
    return true;
  } catch (e) {
    try { localStorage.setItem('jtr-data-corrompu', raw); } catch (e2) {}   /* copie de secours avant toute réécriture */
    return false;
  }
}
['click', 'change', 'input'].forEach(ev => document.addEventListener(ev, () => { clearTimeout(saveTimer); saveTimer = setTimeout(saveAll, 150); }, true));
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

/* ---------- Démarrage ---------- */
function applyAccent() { document.body.dataset.accent = acctObj().accent; }
function setAcct(a) {
  acct = a; applyAccent();
  editingId = null; draft = newDraft(draft.strat);
  hFilter = { strat: 'Tous', res: 'Tous', tf: 'Tous' }; period = 'Tout'; F = defaultFilters();
  go(current);
}
const hadData = loadAll();
if (!demoOff && (!hadData || trades.length === 0)) seedDemo();
applyAccent();
themeMode = readTheme();
applyTheme();
window.jtrApplyTheme = applyTheme;
go('home');
window.__JTR_OK = true;
window.__JTR_P5 = true;
