/* ---------- Nouveau trade ---------- */
let draft = newDraft('ICT');
function newDraft(strat) {
  return { acct, shots: [], btPeriod: '', time: '', strat, dir: 'BUY', result: 'En attente', asset: 'XAUUSD', session: 'Londres', date: iso(today), r: '', risk: '1', setup: '',
    concepts: new Set(), plan: true, full: false, tfEntry: 'M15', tfHigh: 'H4', macro: 'Non déterminé', dxy: 'Non vérifié', yields: 'Non vérifiés',
    news: 'Aucune annonce identifiée', newsRes: 'Non vérifiées', mistake: 'Aucune', note: '' };
}
const assetList = () => [...ASSETS.filter(a => a !== 'Autre'), ...cfg.assets.filter(a => !ASSETS.includes(a)), 'Autre'];
function selectHTML(key, label, opts, val) {
  return `<div class="field"><label for="f-${key}">${label}</label><select id="f-${key}" data-f="${key}">${opts.map(o => `<option ${o === val ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></div>`;
}
function conceptsHTML() {
  return CONCEPTS[draft.strat].map(g => `<div class="cgroup"><div class="gname">${g.g}</div><div class="chips">${
    g.items.map(i => `<button class="chip press ${draft.concepts.has(i) ? 'on' : ''}" data-concept="${esc(i)}">${esc(i)}</button>`).join('')}</div></div>`).join('');
}
function setupOptions() {
  const items = [].concat.apply([], CONCEPTS[draft.strat].map(g => g.items));
  return `<option value="">Choisir un setup</option>` + items.map(i => `<option ${i === draft.setup ? 'selected' : ''}>${esc(i)}</option>`).join('') + `<option ${draft.setup === 'Autre' ? 'selected' : ''}>Autre</option>`;
}
function renderNew() {
  const d = draft, needsR = ['Gain', 'Perte', 'BE'].includes(d.result);
  $('#s-new').innerHTML = `
    ${editingId ? '<button class="cancel" data-act="cancel-edit">Annuler la modification</button>' : ''}
    <h1>${editingId ? 'Modifier le trade' : 'Nouveau trade'}</h1>
    <div id="stratSeg"></div>
    <div class="chead"><b>Concepts utilisés</b><button class="clearall" data-clear="1">Tout décocher</button></div>
    <div class="combo" id="combo"></div>
    <div class="concepts" id="concepts">${conceptsHTML()}</div>
    <div class="field"><label for="f-setup">Setup principal</label><select id="f-setup" data-f="setup">${setupOptions()}</select></div>
    <div class="dirs" id="dirs">
      <button class="dir buy press ${d.dir === 'BUY' ? 'on' : ''}" data-dir="BUY">BUY</button>
      <button class="dir sell press ${d.dir === 'SELL' ? 'on' : ''}" data-dir="SELL">SELL</button></div>
    <div class="field"><label>Résultat</label><div class="chips" id="resChips">${
      RESULTS.map(r => `<button class="chip press ${r.cls} ${d.result === r.v ? 'on' : ''}" data-res="${r.v}">${r.t || r.v}</button>`).join('')}</div></div>
    <div class="two">
      <div class="field"><label for="f-r">Résultat en R</label><input id="f-r" data-f="r" inputmode="decimal" placeholder="ex. 2,5" value="${esc(d.r)}" ${needsR ? '' : 'disabled'}></div>
      <div class="field"><label for="f-risk">Risque prévu (%)</label><input id="f-risk" data-f="risk" inputmode="decimal" placeholder="1" value="${esc(d.risk)}"></div>
    </div>
    <div class="two">${selectHTML('asset', 'Actif', [...new Set([...assetList(), d.asset])].concat([NEW_ASSET]), d.asset)}${selectHTML('session', 'Session', SESSIONS, d.session)}</div>
    <div class="two">
      <div class="field"><label for="f-date">Date</label><input type="date" id="f-date" data-f="date" value="${esc(d.date)}"></div>
      <div class="field"><label for="f-time">Heure d’entrée (facultatif)</label><input type="time" id="f-time" data-f="time" value="${esc(d.time)}"></div>
    </div>
    <p class="note" style="margin:-6px 4px 0">Heure enregistrée en ${tzName(cfg.inputTz)}. Sans heure, le trade est exclu de l’analyse par heure.</p>
    ${d.acct === 'backtest' ? `<div class="field"><label for="f-btPeriod">Période testée (facultatif)</label><input id="f-btPeriod" data-f="btPeriod" placeholder="ex. XAUUSD, janv. à mars 2025" value="${esc(d.btPeriod)}"></div>` : ''}
    <div class="field"><label for="f-note">Note (facultatif)</label><textarea id="f-note" data-f="note" placeholder="Ce que tu as vu, ce que tu retiens de ce trade">${esc(d.note)}</textarea></div>
    <div class="field"><label>Graphique (capture d'écran)</label><div class="shots" id="shots"></div></div>
    <div class="rowsw"><span>Plan respecté</span><button class="switch" id="sw-plan" role="switch" aria-checked="${d.plan}"><i></i></button></div>
    <div class="rowsw"><span>Analyse complète</span><button class="switch" id="sw-full" role="switch" aria-checked="${d.full}"><i></i></button></div>
    <div class="expand ${d.full ? 'open' : ''}" id="full"><div>
      <div class="two">${selectHTML('tfEntry', 'Timeframe d\'entrée', TFS, d.tfEntry)}${selectHTML('tfHigh', 'Timeframe supérieur', TFS, d.tfHigh)}</div>
      ${selectHTML('macro', 'Biais macro de l\'or', BIAS, d.macro)}
      ${selectHTML('dxy', 'Biais DXY', BIAS_DXY, d.dxy)}
      ${selectHTML('yields', 'Rendements américains', YIELDS, d.yields)}
      ${selectHTML('news', 'Annonce économique', NEWS, d.news)}
      ${selectHTML('newsRes', 'Résultat de l\'annonce', NEWS_RES, d.newsRes)}
      ${selectHTML('mistake', 'Erreur éventuelle', MISTAKES, d.mistake)}
      <p class="note" style="margin-top:0">Les biais sont tes observations, pas des prévisions.</p>
    </div></div>
    <div class="savebar"><button class="primary press" id="save">${editingId ? 'Enregistrer les modifications' : 'Enregistrer le trade'}</button></div>`;
  seg($('#stratSeg'), Object.keys(STRATS).map(k => ({ v: k, t: STRATS[k].label })), d.strat, pickStrat, k => STRATS[k].color);
  paintCombo(); paintShots();
}
function pickStrat(k) {
  if (k === draft.strat) return;
  draft.strat = k; draft.concepts = new Set(); draft.setup = '';
  const c = $('#concepts'); c.innerHTML = conceptsHTML();
  c.classList.remove('swap'); void c.offsetWidth; c.classList.add('swap');
  $('#f-setup').innerHTML = setupOptions();
  paintCombo();
}
function paintCombo() {
  const el = $('#combo'); if (!el) return;
  const list = [...draft.concepts];
  el.classList.toggle('empty-c', !list.length);
  el.textContent = list.length ? `Combinaison (${list.length}) : ${list.join(' + ')}` : 'Coche plusieurs concepts pour les combiner dans un même trade.';
}
function paintShots() {
  const el = $('#shots'); if (!el) return;
  el.innerHTML = draft.shots.map((src, i) => `<div class="shot press" data-view="d:${i}"><img src="${src}" alt="Capture ${i + 1}"><button class="rm" data-rmshot="${i}" aria-label="Retirer la capture">×</button></div>`).join('') +
    (draft.shots.length < 3 ? '<label class="addshot press"><input type="file" id="f-shots" accept="image/*" multiple>Ajouter une capture</label>' : '');
}
function shrinkImage(file) {
  return new Promise(res => {
    const rd = new FileReader();
    rd.onload = () => {
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, 1280 / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        res(c.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = () => res(null);
      img.src = rd.result;
    };
    rd.onerror = () => res(null);
    rd.readAsDataURL(file);
  });
}
async function addShots(files) {
  for (const f of files) {
    if (draft.shots.length >= 3) { toast('3 captures maximum par trade'); break; }
    const src = await shrinkImage(f);
    if (src) draft.shots.push(src); else toast('Image illisible');
  }
  paintShots();
}
function openViewer(src) { const v = $('#viewer'); v.innerHTML = `<img src="${src}" alt="Graphique en grand">`; v.classList.add('show'); }
function rmMsg(f) { const m = f.querySelector('.msg'); if (m) m.remove(); }
function fieldError(id, msg) {
  const el = $('#' + id), f = el.closest('.field');
  f.classList.add('bad'); rmMsg(f);
  const m = document.createElement('div'); m.className = 'msg'; m.textContent = msg; f.appendChild(m);
  f.classList.remove('shake'); void f.offsetWidth; f.classList.add('shake');
  el.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
}
function clearErrors() { $$('#s-new .field.bad').forEach(f => { f.classList.remove('bad', 'shake'); rmMsg(f); }); }
function saveTrade() {
  const d = draft; clearErrors();
  if (!d.date) { fieldError('f-date', 'Choisis une date.'); return; }
  let r = null;
  if (['Gain', 'Perte', 'BE'].includes(d.result)) {
    let v = parseNum(d.r);
    if (d.result === 'BE' && String(d.r).trim() === '') v = 0;
    if (v == null) { fieldError('f-r', 'Indique le résultat en R, par exemple 2,5.'); return; }
    if (d.result !== 'BE' && v === 0) { fieldError('f-r', 'Un gain ou une perte ne peut pas valoir 0 R. Choisis Break-even.'); return; }
    r = d.result === 'Gain' ? Math.abs(v) : d.result === 'Perte' ? -Math.abs(v) : v;
  }
  let risk = null;
  if (String(d.risk).trim() !== '') {
    risk = parseNum(d.risk);
    if (risk == null || risk <= 0 || risk > 100) { fieldError('f-risk', 'Entre un risque entre 0 et 100 %.'); return; }
  }
  const t = { id: editingId != null ? editingId : nextId++, acct: d.acct, shots: d.shots, btPeriod: (d.btPeriod || '').trim(), date: d.date, time: d.time || '', tz: d.time ? ((editingId != null && typeof d.tz === 'number') ? d.tz : cfg.inputTz * 60) : null, asset: d.asset, session: d.session, strat: d.strat, dir: d.dir, result: d.result, r, risk,
    setup: d.setup, concepts: [...d.concepts], plan: d.plan, full: d.full, tfEntry: d.tfEntry, tfHigh: d.tfHigh, macro: d.macro, dxy: d.dxy,
    yields: d.yields, news: d.news, newsRes: d.newsRes, mistake: d.mistake, note: d.note.trim() };
  if (editingId != null) { const i = trades.findIndex(x => x.id === editingId); trades[i] = t; }
  else trades.push(t);
  toast(editingId != null ? 'Modifications enregistrées' : 'Trade enregistré');
  editingId = null; draft = newDraft(d.strat);
  period = 'Tout'; go('home');
}

/* ---------- Analyse ---------- */
/* ---------- Analyse des performances ---------- */
const fmtWR = v => v == null ? '—' : Math.round(v) + ' %';
const fmtRN = (v, d = 1) => v == null ? 'N/A' : fmtR(v, d) + ' R';
const fmtExp = v => v == null ? '—' : fmtR(v, 2) + ' R';
const fmtDD = v => v == null ? '—' : (v > 0 ? '−' : '') + fmtNum(v.toFixed(1)) + ' R';
const fmtLoss = v => v > 0 ? '−' + fmtNum(v.toFixed(1)) : '0,0';
const VIEWS = [['sum', 'Résumé'], ['hours', 'Heures'], ['sess', 'Sessions'], ['days', 'Jours'], ['meth', 'Méthodes'], ['asset', 'Actifs'], ['cond', 'Conditions'], ['conc', 'Concepts']];
const activeFilters = () => ['period', 'asset', 'session', 'hour', 'dow', 'result'].filter(k => F[k] !== defaultFilters()[k]).length;
const sortDesc = list => list.slice().sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);

function barChart(items, o = {}) {
  const signed = o.signed !== false;
  const vals = items.map(i => i.v).filter(v => v != null && Number.isFinite(v));
  if (!vals.length) return '<p class="note">Pas encore de données pour ce graphique.</p>';
  const W = 340, H = 170, L = 40, R = 8, T = 12, B = 26;
  let max = Math.max(...vals, 0); const min = signed ? Math.min(...vals, 0) : 0;
  if (o.max != null) max = o.max;
  if (max === min) max = min + 1;
  const y = v => T + (H - T - B) * (max - v) / (max - min);
  const bw = (W - L - R) / items.length, y0 = y(0), fmt = o.fmt || String;
  let out = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.label || 'Graphique')}">`;
  const ticks = [];
  [max, 0, min].forEach(v => { if (!ticks.some(t => Math.abs(y(t) - y(v)) < 14)) ticks.push(v); });
  ticks.forEach(v => { out += `<text x="${L - 5}" y="${(y(v) + 3).toFixed(1)}" text-anchor="end" font-size="9.5" style="fill:var(--muted)">${esc(fmt(v))}</text>`; });
  out += `<line x1="${L}" x2="${W - R}" y1="${y0.toFixed(1)}" y2="${y0.toFixed(1)}" style="stroke:var(--line)" stroke-width="1.5"/>`;
  const step = items.length > 12 ? 3 : 1;
  items.forEach((it, i) => {
    const x = L + i * bw, bx = x + bw * 0.16, w = bw * 0.68;
    if (it.v != null && Number.isFinite(it.v)) {
      const y1 = y(it.v), top = Math.min(y0, y1), h = Math.max(1.5, Math.abs(y1 - y0));
      const col = signed ? (it.v >= 0 ? 'var(--gain)' : 'var(--loss)') : 'var(--blue)';
      out += `<rect x="${bx.toFixed(1)}" y="${top.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="2.5" style="fill:${col};${it.low ? 'opacity:.4' : ''}"/>`;
    }
    if (i % step === 0) out += `<text x="${(x + bw / 2).toFixed(1)}" y="${H - 8}" text-anchor="middle" font-size="9.5" style="fill:var(--muted)">${esc(it.label)}</text>`;
    if (it.attr) out += `<rect ${it.attr} x="${x.toFixed(1)}" y="${T}" width="${bw.toFixed(1)}" height="${H - T - B}" style="fill:transparent;cursor:pointer"/>`;
  });
  return out + '</svg>';
}
function lineChart(vals, o = {}) {
  if (vals.length < 2) return '<p class="note">Pas encore assez de trades terminés pour tracer une courbe.</p>';
  const W = 340, H = 150, L = 40, R = 10, T = 10, B = 22;
  const max = Math.max(...vals, 0), min = Math.min(...vals, 0), span = (max - min) || 1;
  const x = i => L + (W - L - R) * i / (vals.length - 1);
  const y = v => T + (H - T - B) * (max - v) / span;
  const line = 'M' + vals.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' L');
  const area = `${line} L${x(vals.length - 1).toFixed(1)},${y(0).toFixed(1)} L${x(0).toFixed(1)},${y(0).toFixed(1)} Z`;
  const col = o.color || 'var(--blue)';
  const ticks = [];
  [max, 0, min].forEach(v => { if (!ticks.some(t => Math.abs(y(t) - y(v)) < 14)) ticks.push(v); });
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.label || 'Courbe')}">
    ${ticks.map(v => `<text x="${L - 5}" y="${(y(v) + 3).toFixed(1)}" text-anchor="end" font-size="9.5" style="fill:var(--muted)">${fmtR(v, 1).replace('+', '')}</text>`).join('')}
    <line x1="${L}" x2="${W - R}" y1="${y(0).toFixed(1)}" y2="${y(0).toFixed(1)}" style="stroke:var(--line)" stroke-width="1.5" stroke-dasharray="3 4"/>
    <path d="${area}" style="fill:${col};opacity:.14"/>
    <path d="${line}" fill="none" style="stroke:${col}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="${L}" y="${H - 6}" font-size="9.5" style="fill:var(--muted)">${o.first || ''}</text>
    <text x="${W - R}" y="${H - 6}" text-anchor="end" font-size="9.5" style="fill:var(--muted)">${o.last || ''}</text></svg>`;
}
function statRow(label, s, attrs, minN) {
  const low = s.n > 0 && s.n < minN;
  return `<tr ${attrs || ''} class="${s.n ? '' : 'none'} ${low ? 'low' : ''}"><th>${label}${low ? '<i class="lowtag">peu</i>' : ''}</th><td>${s.n}</td><td class="g">${s.wins}</td><td class="l">${s.losses}</td><td>${s.be}</td><td>${fmtWR(s.winRate)}</td>
    <td class="g">${s.n ? fmtR(s.grossWin, 1) : '—'}</td><td class="l">${s.n ? fmtLoss(s.grossLoss) : '—'}</td><td class="${signClass(s.n ? s.total : null)}"><b>${s.n ? fmtR(s.total, 1) : '—'}</b></td>
    <td>${s.n ? fmtRN(s.avgWin, 2).replace(' R', '') : '—'}</td><td class="${signClass(s.expectancy)}">${s.n ? fmtR(s.expectancy, 2) : '—'}</td><td>${s.n ? fmtPF(s.pf) : '—'}</td></tr>`;
}
const STAT_HEAD = ['Trades', 'G', 'P', 'BE', 'Réussite', 'Gains bruts', 'Pertes brutes', 'Net', 'Gain moy.', 'Espérance', 'PF'];
const statTable = (first, rows) => `<div class="tbl"><table><thead><tr><th>${first}</th>${STAT_HEAD.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>
  <p class="note">Résultats en R. G = gagnants, P = perdants, BE = break-even (compté dans les trades terminés, ni gain ni perte). ∞ = aucune perte, profit factor non défini. Lignes marquées « peu » : moins de ${cfg.minTrades} trades.</p>`;

function qualityHTML(scope) {
  const L = [];
  const noTime = scope.filter(t => isDone(t) && !hasTime(t)).length;
  const open = scope.filter(t => t.result === 'En attente').length;
  const canc = scope.filter(t => t.result === 'Annulé').length;
  const noR = scope.filter(t => ['Gain', 'Perte', 'BE'].includes(t.result) && typeof t.r !== 'number').length;
  const noDate = scope.filter(t => !validDate(t)).length;
  if (noTime) L.push(`${noTime} trade${noTime > 1 ? 's' : ''} terminé${noTime > 1 ? 's' : ''} sans heure : exclu${noTime > 1 ? 's' : ''} de l’analyse par heure. La session choisie à la main est utilisée à la place.`);
  if (open) L.push(`${open} trade${open > 1 ? 's' : ''} en attente : exclu${open > 1 ? 's' : ''} de toutes les statistiques.`);
  if (canc) L.push(`${canc} trade${canc > 1 ? 's' : ''} annulé${canc > 1 ? 's' : ''} : exclu${canc > 1 ? 's' : ''} des statistiques.`);
  if (noR) L.push(`${noR} trade${noR > 1 ? 's' : ''} terminé${noR > 1 ? 's' : ''} sans résultat en R : exclu${noR > 1 ? 's' : ''}, jamais compté${noR > 1 ? 's' : ''} comme 0 R.`);
  if (noDate) L.push(`${noDate} trade${noDate > 1 ? 's' : ''} sans date exploitable : exclu${noDate > 1 ? 's' : ''} des analyses par jour et par heure.`);
  return L.length ? `<div class="qbox">${L.map(x => `<div>${x}</div>`).join('')}</div>` : '';
}

/* --- Résumé --- */
function summaryHTML(scope) {
  const a = calc(scope), C = 2 * Math.PI * 42, off = C * (1 - a.winRate / 100);
  const kp = [
    ['Trades terminés', a.n, ''], ['Réussite', fmtWR(a.winRate), ''], ['Résultat net', fmtRN(a.total), signClass(a.total)],
    ['Profit factor', fmtPF(a.pf), ''], ['Espérance', fmtExp(a.expectancy), signClass(a.expectancy)], ['Drawdown max', fmtDD(a.dd), a.dd > 0 ? 'l' : ''],
    ['Gain moyen', fmtRN(a.avgWin, 2), a.avgWin == null ? '' : 'g'], ['Perte moyenne', fmtRN(a.avgLoss, 2), a.avgLoss == null ? '' : 'l'],
    ['Meilleur trade', fmtRN(a.best), signClass(a.best)], ['Pire trade', fmtRN(a.worst), signClass(a.worst)],
    ['Série de gains max', a.maxWS, ''], ['Série de pertes max', a.maxLS, '']
  ];
  const first = a.done.length ? fmtDate(a.done[0].date) : '', last = a.done.length ? fmtDate(a.done[a.done.length - 1].date) : '';
  const side = ['BUY', 'SELL'].map(d => ({ d, s: calc(scope.filter(t => t.dir === d)) }));
  const plan = [[true, 'Plan respecté'], [false, 'Plan non respecté']].map(([p, label]) => ({ label, s: calc(scope.filter(t => t.plan === p)) })).filter(x => x.s.n);
  const showList = F.strat !== 'Tous' || activeFilters() > 0;
  return `<div class="kgrid">${kp.map(([l, v, c]) => `<div class="kcard"><b class="${c}">${v}</b><span>${l}</span></div>`).join('')}</div>
    <p class="note">Réussite = gagnants ÷ trades terminés (gain, perte, break-even). Profit factor = gains ÷ pertes. Tout est en R.</p>
    <div class="chart"><h3>Évolution du capital, en R cumulés</h3>${lineChart(a.curve, { first, last, label: 'Résultat cumulé en R' })}
      <p class="note">Capital initial inconnu : la courbe montre la variation cumulée en R, dans l’ordre chronologique des trades terminés.</p></div>
    <div class="chart"><h3>Drawdown, en R</h3>${lineChart(a.ddCurve, { color: 'var(--loss)', first, last, label: 'Drawdown en R' })}
      <p class="note">Baisse par rapport au dernier sommet, calculée sur les clôtures uniquement (pas à l’intérieur des trades).</p></div>
    <h2>Réussite</h2><section class="card"><div class="ringwrap">
      <div class="ring"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="42" fill="none" stroke="var(--surface2)" stroke-width="10"/>
        <circle class="arc" id="arc" cx="50" cy="50" r="42" fill="none" stroke="var(--blue)" stroke-width="10" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C}" data-off="${off}"/></svg>
        <b>${Math.round(a.winRate)} %</b></div>
      <div class="counts"><div><i style="background:var(--gain)"></i>${a.wins} gagnants</div><div><i style="background:var(--loss)"></i>${a.losses} perdants</div>
        <div><i style="background:var(--flat)"></i>${a.be} break-even</div></div></div></section>
    <h2>BUY et SELL</h2><div class="vs">${side.map(({ d, s }) => `<div class="card"><small class="muted">${d}</small>
      <b class="${signClass(s.n ? s.total : null)}">${s.n ? fmtR(s.total, 1) + ' R' : '—'}</b><small class="muted">${s.n ? s.n + ' trades, ' + Math.round(s.winRate) + ' % de réussite' : 'Aucun trade terminé'}</small></div>`).join('')}</div>
    <h2>Discipline</h2><section class="card">${plan.length ? divBars(plan.map(x => ({ label: x.label, sub: x.s.n + ' trades', v: x.s.expectancy })), 2) : '<small class="muted">Pas assez de données.</small>'}
      <p class="note" style="margin:10px 0 0">Espérance en R par trade terminé.</p></section>
    ${showList ? `<h2>Trades correspondants (${scope.length})</h2>${sortDesc(scope).slice(0, 40).map(tradeRow).join('')}${scope.length > 40 ? '<p class="note">Les 40 plus récents sont affichés. Utilise l’historique pour voir les autres.</p>' : ''}` : ''}
    <p class="note">Ces chiffres décrivent tes trades passés. Ils ne prédisent pas les résultats à venir, et une corrélation ne prouve pas une cause.</p>`;
}
window.__JTR_P3 = true;
