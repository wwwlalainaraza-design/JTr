/* ---------- Composants ---------- */
function seg(container, opts, currentVal, onPick, colorFn) {
  container.classList.add('seg');
  container.innerHTML = '<span class="thumb"></span>' + opts.map(o => `<button class="press" data-v="${esc(o.v)}">${esc(o.t)}</button>`).join('');
  const set = v => {
    const i = Math.max(0, opts.findIndex(o => o.v === v));
    container.style.setProperty('--i', i);
    container.style.setProperty('--n', opts.length);
    if (colorFn) container.style.setProperty('--thumb', colorFn(v));
    $$('button', container).forEach((b, k) => b.classList.toggle('on', k === i));
  };
  container.onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    const v = b.dataset.v; set(v); onPick(v);
  };
  set(currentVal);
}
function countTo(el, target) {
  const show = v => { el.innerHTML = fmtR(v, 1) + '<span>R</span>'; };
  if (reduceMotion) { show(target); return; }
  const t0 = performance.now(), dur = 650;
  const step = t => {
    const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
    show(target * e);
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
function curveSVG(curve, done) {
  if (curve.length < 2) return '<div class="empty-curve">Aucun trade terminé sur cette période.</div>';
  const W = 320, H = 132, L = 32, R = 8, T = 10, B = 24;
  const max = Math.max(...curve, 0), min = Math.min(...curve, 0), span = (max - min) || 1;
  const x = i => L + (W - L - R) * i / (curve.length - 1);
  const y = v => T + (H - T - B) * (max - v) / span;
  const pts = curve.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`);
  const line = 'M' + pts.join(' L');
  const area = `${line} L${x(curve.length - 1).toFixed(1)},${y(min).toFixed(1)} L${x(0).toFixed(1)},${y(min).toFixed(1)} Z`;
  const ys = [];
  [max, 0, min].forEach(v => { if (!ys.some(o => Math.abs(y(o) - y(v)) < 13)) ys.push(v); });
  const labels = ys.map(v => `<text x="${L - 5}" y="${(y(v) + 3).toFixed(1)}" text-anchor="end" font-size="9.5" fill="#fff" fill-opacity=".75">${fmtR(v, 1).replace('+', '')}</text>`).join('');
  const lastX = x(curve.length - 1), lastY = y(curve[curve.length - 1]);
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Courbe du résultat cumulé en R">
    <line x1="${L}" x2="${W - R}" y1="${y(0).toFixed(1)}" y2="${y(0).toFixed(1)}" stroke="#fff" stroke-opacity=".35" stroke-dasharray="3 4"/>
    <path d="${area}" fill="#fff" fill-opacity=".12"/>
    <path class="ln" d="${line}" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
    <circle class="pulse" cx="${lastX.toFixed(1)}" cy="${lastY.toFixed(1)}" r="4" fill="#fff"/>
    <circle cx="${lastX.toFixed(1)}" cy="${lastY.toFixed(1)}" r="4.5" fill="#fff"/>
    ${labels}
    <text x="${L}" y="${H - 6}" font-size="9.5" fill="#fff" fill-opacity=".75">${fmtDate(done[0].date)}</text>
    <text x="${W - R}" y="${H - 6}" text-anchor="end" font-size="9.5" fill="#fff" fill-opacity=".75">${fmtDate(done[done.length - 1].date)}</text>
  </svg>`;
}
function drawCurve() {
  const p = $('#curve .ln'); if (!p || reduceMotion) return;
  const len = p.getTotalLength();
  p.style.strokeDasharray = len; p.style.strokeDashoffset = len;
  p.getBoundingClientRect();
  p.style.transition = 'stroke-dashoffset .9s cubic-bezier(.3,.7,.2,1)';
  p.style.strokeDashoffset = 0;
}
function spark(curve) {
  if (curve.length < 2) return '';
  const W = 120, H = 34, max = Math.max(...curve, 0), min = Math.min(...curve, 0), span = (max - min) || 1;
  const pts = curve.map((v, i) => `${(W * i / (curve.length - 1)).toFixed(1)},${(3 + (H - 6) * (max - v) / span).toFixed(1)}`);
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><path d="M${pts.join(' L')}" fill="none" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
function divBars(rows, d = 1) {
  const max = Math.max(...rows.map(r => Math.abs(r.v)), 0.0001);
  return rows.map(r => {
    const w = Math.abs(r.v) / max * 50, pos = r.v >= 0;
    return `<div class="brow"><div class="blab"><b>${esc(r.label)}</b><small class="muted">${esc(r.sub)}</small></div>
      <div class="btrack"><i class="zero"></i><i class="bar ${pos ? 'pos' : 'neg'}" style="width:${w}%;${pos ? 'left:50%' : 'right:50%'}"></i></div>
      <div class="bval ${signClass(r.v)}">${fmtR(r.v, d)}</div></div>`;
  }).join('');
}
function tradeRow(t) {
  const st = STRATS[t.strat];
  const label = rLabel(t);
  return `<button class="trade press" data-open="${t.id}" style="--c:${st.color}">
    <span class="strip"></span>
    <span><b>${esc(t.asset)}</b><span class="dirtag ${t.dir === 'BUY' ? 'buy' : 'sell'}">${t.dir}</span>${t.demo ? '<i class="lowtag">exemple</i>' : ''}
      <small class="muted">${fmtDate(t.date)}, ${esc(t.session)}, ${st.label}${t.setup ? ', ' + esc(conceptLabel(t.setup, t.ctf)) : ''}</small></span>
    <span class="rbadge ${resClass(t)}">${label}</span></button>`;
}
function toast(msg) {
  const el = $('#toast'); el.textContent = msg; el.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('show'), 2200);
}
function openSheet(html) {
  $('#sheet').innerHTML = html; $('#scrim').classList.add('show'); $('#sheet').classList.add('show');
}
function closeSheet() { $('#scrim').classList.remove('show'); $('#sheet').classList.remove('show'); }

/* ---------- Navigation ---------- */
const SCREENS = ['home', 'history', 'new', 'stats', 'settings'];
const render = { home: () => renderHome(), history: () => renderHistory(), new: () => renderNew(), stats: () => renderStats(), settings: () => renderSettings() };
function go(name) {
  current = name;
  $$('.screen').forEach(s => s.classList.remove('active', 'enter'));
  const el = $('#s-' + name); el.classList.add('active'); void el.offsetWidth; el.classList.add('enter');
  $$('.tab').forEach(t => t.classList.toggle('active', t.dataset.go === name));
  $('#tabbar').style.setProperty('--i', SCREENS.indexOf(name));
  render[name]();
  window.scrollTo({ top: 0 });
}

/* ---------- Accueil ---------- */
function renderHome() {
  const hasDemo = mine().some(t => t.demo);
  $('#s-home').innerHTML = `
    <div class="brand"><svg class="logo" viewBox="0 0 108 108" aria-hidden="true"><rect width="108" height="108" fill="#000"/>
      <rect x="41" y="36" width="31" height="36" rx="2" fill="#D1D5DB"/>
      <g class="cover"><rect x="39" y="34" width="30" height="40" rx="3" fill="#fff"/><path d="M44 34v40" stroke="#000" stroke-width="1.6"/><path d="M50 48h14M50 55h10" stroke="#000" stroke-width="2.4" stroke-linecap="round"/></g></svg>JTr</div>
    <section class="hero">
      <small>Résultat cumulé en R</small>
      <div class="big" id="bigR">0,0<span>R</span></div>
      <div class="mini" id="mini"></div>
      <div id="curve"></div>
      <div id="periodSeg"></div>
    </section>
    <div class="remslot"></div>
    ${hasDemo ? `<div class="demo"><span>Trades d'exemple, pour voir la maquette.</span><button data-act="clear-demo">Supprimer les exemples</button></div>` : ''}
    <section class="card kpis" id="kpis"></section>
    <p class="note">Taux de réussite = gagnants ÷ trades terminés (gain, perte, break-even). Les trades en attente ou annulés sont exclus. Expectancy et drawdown sont en R, jamais en %.</p>
    <div class="rowhead"><h2>Derniers trades</h2><button class="link" data-go="history">Tout voir</button></div>
    <div id="recent"></div>`;
  seg($('#periodSeg'), ['Jour', 'Semaine', 'Mois', 'Tout'].map(v => ({ v, t: v })), period, v => { period = v; paintHome(); });
  paintHome();
  paintRemarks();
}
function paintHome() {
  const s = calc(mine().filter(t => inPeriod(t, period)));
  $('#mini').innerHTML = `<span>${s.n} trade${s.n > 1 ? 's' : ''} terminé${s.n > 1 ? 's' : ''}</span><span>${s.pending} en attente</span>`;
  countTo($('#bigR'), s.total);
  $('#curve').innerHTML = curveSVG(s.curve, s.done);
  drawCurve();
  const k = [
    ['Taux de réussite', s.winRate == null ? '—' : Math.round(s.winRate) + ' %', ''],
    ['Profit factor', fmtPF(s.pf), ''],
    ['Expectancy', s.expectancy == null ? '—' : fmtR(s.expectancy, 2) + ' R', signClass(s.expectancy)],
    ['Drawdown max', s.dd == null ? '—' : (s.dd > 0 ? '−' : '') + fmtNum(s.dd.toFixed(1)) + ' R', s.dd > 0 ? 'l' : ''],
    ['Gain moyen', s.avgWin == null ? '—' : fmtR(s.avgWin, 2) + ' R', s.avgWin == null ? '' : 'g'],
    ['Perte moyenne', s.avgLoss == null ? '—' : fmtR(s.avgLoss, 2) + ' R', s.avgLoss == null ? '' : 'l']
  ];
  $('#kpis').innerHTML = k.map(([l, v, c]) => `<div class="kpi"><b class="${c}">${v}</b><span>${l}</span></div>`).join('');
  const recent = mine().sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id).slice(0, 3);
  $('#recent').innerHTML = recent.length ? recent.map(tradeRow).join('') :
    `<div class="card empty"><b>Aucun trade pour le moment</b><p>Le premier trade s'enregistre en quelques secondes.</p><button class="primary press" data-go="new">Enregistrer un trade</button></div>`;
}

/* ---------- Historique ---------- */
function renderHistory() {
  const real = acctType() === 'reel';
  $('#s-history').innerHTML = `<h1>${real ? 'Journal et calendrier' : 'Historique'}</h1>
    ${real ? '<p class="muted" style="margin:-8px 2px 12px">Suivi de vos performances</p><div id="calBox"></div><h2>Tous les trades</h2>' : ''}
    <div class="chips scroll" id="hf-res"></div>
    <div class="chips scroll" id="hf-strat"></div>
    <div class="chips scroll" id="hf-tf"></div>
    <div id="hDay" class="dayfilter"></div>
    <div id="hList"></div>`;
  paintHistory();
}
function paintHistory() {
  const sOpts = [['Tous', 'Toutes les stratégies'], ['ICT', 'ICT'], ['SMC', 'SMC'], ['PA', 'Price Action']];
  const all = hFilter.res === 'Tous' && hFilter.dir === 'Tous';
  $('#hf-res').innerHTML = [['all:x', 'Tous', all], ['dir:BUY', 'BUY', hFilter.dir === 'BUY'], ['dir:SELL', 'SELL', hFilter.dir === 'SELL'],
    ['res:Gain', 'Gagnants', hFilter.res === 'Gain'], ['res:Perte', 'Perdants', hFilter.res === 'Perte'], ['res:BE', 'Break-even', hFilter.res === 'BE'], ['res:En attente', 'En attente', hFilter.res === 'En attente']]
    .map(([k, t, on]) => `<button class="chip press ${on ? 'on' : ''}" data-hf="${k}">${t}</button>`).join('');
  $('#hf-strat').innerHTML = sOpts.map(([v, t]) => `<button class="chip press ${hFilter.strat === v ? 'on' : ''}" data-hf="strat:${v}">${t}</button>`).join('');
  $('#hf-tf').innerHTML = [['Tous', 'Tous les time frames']].concat(TFS.map(x => [x, x])).map(([v, t]) => `<button class="chip press ${hFilter.tf === v ? 'on' : ''}" data-hf="tf:${v}">${t}</button>`).join('');
  $('#hDay').innerHTML = hFilter.day ? `<button class="chip on press" data-hf="day:">Jour : ${fmtDate(hFilter.day)} ×</button>` : '';
  const list = mine()
    .filter(t => (hFilter.strat === 'Tous' || t.strat === hFilter.strat) && (hFilter.res === 'Tous' || t.result === hFilter.res)
      && (hFilter.dir === 'Tous' || t.dir === hFilter.dir) && (hFilter.tf === 'Tous' || tradeTfs(t).includes(hFilter.tf))
      && (!hFilter.day || locate(t).date === hFilter.day))
    .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
  $('#hList').innerHTML = list.length ? list.map(tradeRow).join('') :
    `<div class="card empty"><b>${mine().length ? 'Aucun trade avec ces filtres' : 'Aucun trade enregistré'}</b>
      <p>${mine().length ? 'Change un filtre pour voir plus de trades.' : 'Ajoute ton premier trade pour construire ton historique.'}</p>
      ${mine().length ? '' : '<button class="primary press" data-go="new">Enregistrer un trade</button>'}</div>`;
  if (typeof paintCal === 'function') paintCal();
}
function openDetail(id) {
  const t = trades.find(x => x.id === id); if (!t) return;
  const st = STRATS[t.strat];
  const label = rLabel(t);
  const full = t.full ? `
    <div><small>Timeframes</small><b>${esc(t.tfEntry)} / ${esc(t.tfHigh)}</b></div>
    <div><small>Biais macro de l'or</small><b>${esc(t.macro)}</b></div>
    <div><small>Biais DXY</small><b>${esc(t.dxy)}</b></div>
    <div><small>Rendements US</small><b>${esc(t.yields)}</b></div>
    <div><small>Annonce</small><b>${esc(t.news)}</b></div>
    <div><small>Résultat de l'annonce</small><b>${esc(t.newsRes)}</b></div>
    <div><small>Erreur</small><b>${esc(t.mistake)}</b></div>` : '';
  openSheet(`<div class="grab"></div>
    <div class="dhead"><div><h2 style="margin:0">${esc(t.asset)}<span class="dirtag ${t.dir === 'BUY' ? 'buy' : 'sell'}">${t.dir}</span></h2>
      <small class="muted">${fmtDate(t.date)}, ${esc(t.session)}</small></div>
      <span class="rbadge lg ${resClass(t)}">${label}</span></div>
    <div class="facts">
      <div><small>Stratégie</small><b style="color:${st.color}">${st.label}</b></div>
      <div><small>Setup principal</small><b>${esc(t.setup || 'Non précisé')}</b></div>
      <div><small>Risque prévu</small><b>${t.risk != null ? fmtNum(t.risk) + ' %' : 'Non précisé'}</b></div>
      <div><small>Plan</small><b>${t.plan ? 'Respecté' : 'Non respecté'}</b></div>
      <div><small>Heure</small><b>${t.time ? esc(t.time) + ' (' + tzName(t.tz / 60) + ')' : 'Non précisée'}</b></div>
      <div><small>Compte</small><b>${esc(acctObj(t.acct).name)}</b></div>${acctObj(t.acct).type === 'backtest' ? `<div><small>Période testée</small><b>${esc(t.btPeriod || 'Non précisée')}</b></div>` : ''}
      ${full}
    </div>
    ${t.concepts && t.concepts.length ? `<small class="muted">Concepts utilisés</small><div class="chips" style="margin-top:6px">${t.concepts.map(c => `<span class="chip static">${esc(conceptLabel(c, t.ctf))}</span>`).join('')}</div>` : ''}
    ${t.note ? `<p style="margin:14px 0 0">${esc(t.note)}</p>` : ''}
    ${t.shots && t.shots.length ? `<small class="muted" style="display:block;margin-top:14px">Graphiques</small><div class="shots" style="margin-top:6px">${t.shots.map((src, i) => `<div class="shot press" data-view="${t.id}:${i}"><img src="${src}" alt="Capture du graphique ${i + 1}"></div>`).join('')}</div>` : ''}
    <div class="btnrow"><button class="ghost press" data-act="edit:${t.id}">Modifier</button><button class="dangerbtn press" data-act="ask-del:${t.id}">Supprimer</button></div>`);
}
function confirmSheet(title, text, okLabel, okAct) {
  openSheet(`<div class="grab"></div><h2 style="margin-top:4px">${esc(title)}</h2><p class="muted" style="margin:0">${esc(text)}</p>
    <div class="btnrow"><button class="ghost press" data-act="close">Annuler</button><button class="dangerbtn press" data-act="${okAct}">${esc(okLabel)}</button></div>`);
}
window.__JTR_P2 = true;
