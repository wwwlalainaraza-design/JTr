/* --- Heures --- */
function hoursHTML(scope) {
  const modes = [['1', '1 h'], ['2', '2 h'], ['3', '3 h'], ['4', '4 h'], ['6', '6 h'], ['8', '8 h'], ['12', '12 h'], ['custom', 'Personnalisé']];
  return `<div class="chips scroll">${modes.map(([v, t]) => `<button class="chip press ${cfg.bandMode === v ? 'on' : ''}" data-band="${v}">${t}</button>`).join('')}</div>
    ${cfg.bandMode === 'custom' ? `<div class="field" style="margin:4px 0 10px"><label>Heures de début des tranches, séparées par des virgules</label><input data-bandcustom value="${esc(cfg.bandCustom)}" placeholder="0, 8, 13, 22"></div>` : ''}
    <p class="note" style="margin:0 2px 10px">Heures affichées en ${tzName(cfg.viewTz)}. <button class="link" data-go="settings">Changer le fuseau</button></p>
    <div id="hRes">${hoursResults(scope)}</div>`;
}
function hoursResults(scope) {
  const bands = bandsList(), hourly = bands.every(b => b.e - b.s === 1);
  const rows = bands.map(b => {
    const l = scope.filter(t => { const hr = locate(t).hour; return hr != null && inBand(hr, b); });
    return { b, s: calc(l) };
  });
  const short = b => hourly ? pad(b.s) : `${pad(b.s)}–${pad(b.e % 24)}`;
  const mk = f => rows.map(r => ({ label: short(r.b), v: r.s.n ? f(r.s) : null, low: r.s.n > 0 && r.s.n < cfg.minTrades, attr: `data-hr="${r.b.s}-${r.b.e}"` }));
  const ok = rows.filter(r => r.s.n >= cfg.minTrades);
  const best = ok.filter(r => r.s.total > 0).sort((a, b) => b.s.total - a.s.total).slice(0, 3);
  const worst = ok.filter(r => r.s.total < 0).sort((a, b) => a.s.total - b.s.total).slice(0, 3);
  const li = r => `<div class="cardrow" style="padding:6px 0"><span><b>${r.b.label}</b> <small class="muted">${r.s.n} trades, ${fmtWR(r.s.winRate)}</small></span><b class="${signClass(r.s.total)}">${fmtR(r.s.total, 1)} R</b></div>`;
  const known = scope.filter(t => isDone(t) && locate(t).hour != null).length;
  const invalid = cfg.bandMode === 'custom' && !customBounds() ? '<p class="note">Saisie incomplète : affichage heure par heure. Indique au moins 2 heures entre 0 et 23.</p>' : '';
  return `${invalid}<p class="note" style="margin:0 2px 8px">${known} trades terminés avec une heure connue.</p>
    <div class="chart"><h3>Résultat net par ${hourly ? 'heure' : 'tranche'}, en R</h3>${barChart(mk(s => s.total), { signed: true, fmt: v => fmtR(v, 1).replace('+', ''), label: 'Résultat net par heure' })}
      <p class="note">Barres claires : moins de ${cfg.minTrades} trades. Touche une barre pour voir les trades.</p></div>
    <div class="chart"><h3>Taux de réussite par ${hourly ? 'heure' : 'tranche'}</h3>${barChart(mk(s => s.winRate), { signed: false, max: 100, fmt: v => Math.round(v) + '%', label: 'Taux de réussite par heure' })}
      <p class="note">Une ${hourly ? 'heure' : 'tranche'} sans trade n’a pas de barre : aucun taux n’est inventé.</p></div>
    <h2>À étudier de plus près</h2><section class="card">
      ${ok.length ? `<b class="g">Les plus rentables</b>${best.length ? best.map(li).join('') : '<p class="note" style="margin:4px 0">Aucune avec un résultat positif.</p>'}
        <div style="height:10px"></div><b class="l">Les plus pénalisantes</b>${worst.length ? worst.map(li).join('') : '<p class="note" style="margin:4px 0">Aucune avec un résultat négatif.</p>'}`
        : `<p class="note" style="margin:0">Pas encore assez de trades par ${hourly ? 'heure' : 'tranche'} : il en faut au moins ${cfg.minTrades} (réglable dans Paramètres).</p>`}
      <p class="note" style="margin:10px 0 0">Ce sont des pistes à vérifier, pas des conclusions.</p></section>
    <h2>Tableau détaillé</h2>${statTable(hourly ? 'Heure' : 'Tranche', rows.map(r => statRow(r.b.label, r.s, `data-hr="${r.b.s}-${r.b.e}"`, cfg.minTrades)).join(''))}`;
}
function openBandSheet(code) {
  const [s, e] = code.split('-').map(Number), b = { s, e };
  const label = e - s === 1 ? `${pad(s)} h` : `${pad(s)} h–${pad(e % 24)} h`;
  const list = applyFilters(mine(), F).filter(t => { const hr = locate(t).hour; return hr != null && inBand(hr, b); });
  const a = calc(list);
  openSheet(`<div class="grab"></div><h2 style="margin-top:4px">${label}, ${tzName(cfg.viewTz)}</h2>
    <div class="smetrics c4"><div><b>${a.n}</b><span>trades</span></div><div><b>${fmtWR(a.winRate)}</b><span>réussite</span></div><div><b class="${signClass(a.n ? a.total : null)}">${a.n ? fmtR(a.total, 1) : '—'}</b><span>net, R</span></div><div><b>${a.n ? fmtPF(a.pf) : '—'}</b><span>PF</span></div></div>
    <div style="margin-top:14px">${list.length ? sortDesc(list).map(tradeRow).join('') : '<p class="muted">Aucun trade sur cette tranche.</p>'}</div>`);
}

/* --- Sessions --- */
function sessionsHTML(scope) {
  const data = sessionNames().map(n => ({ n, s: calc(scope.filter(t => sessionOf(t) === n)) }));
  const chart = barChart(data.map(d => ({ label: d.n === OTHER ? 'Autre' : d.n, v: d.s.n ? d.s.total : null, low: d.s.n > 0 && d.s.n < cfg.minTrades })), { signed: true, fmt: v => fmtR(v, 1).replace('+', ''), label: 'Résultat net par session' });
  const hrs = cfg.sessions.map(x => `${x.name} ${pad(toView(x.s))} h–${pad(toView(x.e))} h`).join(', ');
  const cards = data.map(({ n, s }) => {
    if (!s.n) return `<div class="sblock" style="--c:var(--line)"><div class="shead"><span class="sname" style="color:var(--ink)">${esc(n)}</span></div><small class="muted">Aucun trade terminé avec ces filtres.</small></div>`;
    const m = [['Trades', s.n], ['Réussite', fmtWR(s.winRate)], ['PF', fmtPF(s.pf)], ['Espérance', fmtExp(s.expectancy)], ['Gain moy.', fmtRN(s.avgWin, 2)], ['Perte moy.', fmtRN(s.avgLoss, 2)], ['Meilleur', fmtRN(s.best)], ['Pire', fmtRN(s.worst)]];
    return `<div class="sblock" style="--c:var(--blue)"><div class="shead"><span class="sname" style="color:var(--ink)">${esc(n)}${s.n < cfg.minTrades ? '<i class="lowtag">échantillon faible</i>' : ''}</span><span class="rbadge ${s.total > 0 ? 'gain' : s.total < 0 ? 'loss' : 'flat'}">${fmtR(s.total, 1)} R</span></div>
      <div class="smetrics c4" style="margin-top:12px">${m.map(([l, v]) => `<div><b>${v}</b><span>${l}</span></div>`).join('')}</div></div>`;
  }).join('');
  return `<div class="chart"><h3>Résultat net par session, en R</h3>${chart}</div>
    <h2>Détail par session</h2>${cards}
    <p class="note">La session est déduite de l’heure quand elle est connue, sinon de la session choisie à l’enregistrement. Horaires utilisés en ${tzName(cfg.viewTz)} : ${hrs}. Ce sont des réglages, pas des horaires universels. <button class="link" data-go="settings">Les modifier</button></p>`;
}

/* --- Jours --- */
function daysHTML(scope) {
  const by = {};
  scope.filter(isDone).forEach(t => { const d = locate(t).dow; if (d == null) return; (by[d] = by[d] || []).push(t); });
  const order = DOW_ORDER.filter(d => (d >= 1 && d <= 5) || (by[d] || []).length);
  const rows = order.map(d => ({ d, s: calc(by[d] || []) }));
  const chart = barChart(rows.map(r => ({ label: DOW_SHORT[r.d], v: r.s.n ? r.s.total : null, low: r.s.n > 0 && r.s.n < cfg.minTrades })), { signed: true, fmt: v => fmtR(v, 1).replace('+', ''), label: 'Résultat net par jour' });
  const tr = rows.map(({ d, s }) => `<tr class="${s.n ? '' : 'none'} ${s.n > 0 && s.n < cfg.minTrades ? 'low' : ''}"><th>${DOW[d]}${s.n > 0 && s.n < cfg.minTrades ? '<i class="lowtag">peu</i>' : ''}</th><td>${s.n}</td><td><span class="g">${s.wins}</span> / <span class="l">${s.losses}</span> / ${s.be}</td><td>${fmtWR(s.winRate)}</td><td class="${signClass(s.n ? s.total : null)}"><b>${s.n ? fmtR(s.total, 1) : '—'}</b></td><td>${s.n ? fmtPF(s.pf) : '—'}</td><td class="${signClass(s.expectancy)}">${s.n ? fmtR(s.expectancy, 2) : '—'}</td></tr>`).join('');
  return `<div class="chart"><h3>Résultat net par jour, en R</h3>${chart}</div>
    <h2>Tableau par jour</h2><div class="tbl"><table><thead><tr><th>Jour</th><th>Trades</th><th>G / P / BE</th><th>Réussite</th><th>Net</th><th>PF</th><th>Espérance</th></tr></thead><tbody>${tr}</tbody></table></div>
    <p class="note">Jours calculés dans le fuseau ${tzName(cfg.viewTz)}. Le samedi et le dimanche apparaissent seulement s’il y a des trades.</p>`;
}

/* --- Méthodes et actifs --- */
const indChips = () => `<div class="chips scroll">${Object.entries(INDS).map(([k, v]) => `<button class="chip press ${aInd === k ? 'on' : ''}" data-ind="${k}">${v.t}</button>`).join('')}</div>`;
function matrixHTML(scope, dimKey) {
  const dim = DIMS[dimKey], ind = INDS[aInd], vals = {};
  scope.filter(isDone).forEach(t => { const v = dim.val(t); if (v == null) return; (vals[v] = vals[v] || []).push(t); });
  const order = dimKey === 'session' ? sessionNames() : dimKey === 'dow' ? DOW_ORDER.map(d => DOW[d]) : dimKey === 'hour' ? bandsList().map(b => b.label) : null;
  const keys = order ? order.filter(k => vals[k]) : Object.keys(vals).sort((a, b) => vals[b].length - vals[a].length);
  if (!keys.length) return '<p class="note">Aucune donnée pour ce croisement.</p>';
  const sk = Object.keys(STRATS);
  return `<div class="tbl mx"><table><thead><tr><th>${dim.label}</th>${sk.map(k => `<th>${STRATS[k].label}</th>`).join('')}</tr></thead><tbody>${keys.map(k => `<tr><th>${esc(k)}</th>${sk.map(sc => {
    const s = calc(vals[k].filter(t => t.strat === sc));
    return `<td class="${s.n && s.n < cfg.minTrades ? 'low' : ''}">${cellOf(ind, s)}<small>${s.n} trade${s.n > 1 ? 's' : ''}</small></td>`;
  }).join('')}</tr>`).join('')}</tbody></table></div>
  <p class="note">Indicateur : ${ind.t}. Les cases claires comptent moins de ${cfg.minTrades} trades : échantillon trop faible pour conclure.</p>`;
}
function methodsHTML(scope) {
  const ind = INDS[aInd];
  const data = Object.keys(STRATS).map(k => ({ k, s: calc(scope.filter(t => t.strat === k)) }));
  const chart = barChart(data.map(d => { const v = d.s.n ? ind.val(d.s) : null; return { label: STRATS[d.k].label, v: v === Infinity ? null : v, low: d.s.n > 0 && d.s.n < cfg.minTrades }; }),
    { signed: ind.signed, max: ind.max, fmt: v => ind.fmt(v).replace('+', ''), label: 'Comparaison des méthodes' });
  const cards = data.map(({ k, s }) => {
    const st = STRATS[k];
    if (!s.n) return `<div class="sblock" style="--c:${st.color}"><div class="shead"><span class="sname">${st.label}</span></div><small class="muted">Aucun trade terminé avec ces filtres.</small></div>`;
    const m = [['Trades', s.n], ['Réussite', fmtWR(s.winRate)], ['Net', fmtRN(s.total)], ['PF', fmtPF(s.pf)], ['Espérance', fmtExp(s.expectancy)], ['Gains bruts', fmtR(s.grossWin, 1)], ['Pertes brutes', fmtLoss(s.grossLoss)], ['Gain moy.', fmtRN(s.avgWin, 2)], ['Perte moy.', fmtRN(s.avgLoss, 2)], ['Série gains', s.maxWS], ['Série pertes', s.maxLS], ['Drawdown', fmtDD(s.dd)]];
    return `<div class="sblock" style="--c:${st.color}"><div class="shead"><span class="sname">${st.label}${s.n < cfg.minTrades ? '<i class="lowtag">échantillon faible</i>' : ''}</span></div>${spark(s.curve)}
      <div class="smetrics c4">${m.map(([l, v]) => `<div><b>${v}</b><span>${l}</span></div>`).join('')}</div></div>`;
  }).join('');
  const dims = [['hour', 'Heures'], ['session', 'Sessions'], ['dow', 'Jours'], ['asset', 'Actifs']];
  return `${indChips()}<div class="chart" style="margin-top:4px"><h3>Comparaison : ${ind.t}</h3>${chart}</div>
    <h2>Détail par méthode</h2>${cards}
    <h2>Méthodes selon…</h2><div class="chips scroll">${dims.map(([v, t]) => `<button class="chip press ${mDim === v ? 'on' : ''}" data-mdim="${v}">${t}</button>`).join('')}</div>
    ${matrixHTML(scope, mDim)}
    <p class="note">Pour répondre à une question précise (par exemple quelle méthode sur XAUUSD à Londres), choisis l’actif et la session dans Filtres. Aucune méthode n’est déclarée meilleure sur un petit échantillon.</p>`;
}
function assetsHTML(scope) {
  const by = {};
  scope.filter(isDone).forEach(t => { (by[t.asset] = by[t.asset] || []).push(t); });
  const rows = Object.keys(by).map(a => ({ a, s: calc(by[a]) })).sort((x, y) => y.s.n - x.s.n);
  const tr = rows.map(({ a, s }) => {
    const tot = s.grossWin + s.grossLoss, pct = tot ? s.grossWin / tot * 100 : 0, low = s.n < cfg.minTrades;
    return `<tr class="${low ? 'low' : ''}"><th>${esc(a)}${low ? '<i class="lowtag">peu</i>' : ''}</th><td>${s.n}</td><td>${fmtWR(s.winRate)}</td><td class="${signClass(s.total)}"><b>${fmtR(s.total, 1)}</b></td><td>${fmtPF(s.pf)}</td><td class="${signClass(s.expectancy)}">${fmtR(s.expectancy, 2)}</td><td class="g">${fmtR(s.best, 1)}</td><td class="l">${fmtR(s.worst, 1)}</td><td>${tot ? `<span class="split"><i class="sg" style="width:${pct.toFixed(0)}%"></i><i class="sl" style="width:${(100 - pct).toFixed(0)}%"></i></span>` : '—'}</td></tr>`;
  }).join('');
  return `<h2 style="margin-top:4px">Performance par actif</h2><div class="tbl"><table><thead><tr><th>Actif</th><th>Trades</th><th>Réussite</th><th>Net</th><th>PF</th><th>Espérance</th><th>Meilleur</th><th>Pire</th><th>Gains / pertes</th></tr></thead><tbody>${tr}</tbody></table></div>
    <p class="note">Résultats en R. Dernière colonne : part des gains bruts (vert) et des pertes brutes (rouge). Les actifs apparaissent dès qu’un trade est enregistré ; tu peux en ajouter dans Paramètres.</p>
    <h2>Actifs selon la méthode</h2>${indChips()}${matrixHTML(scope, 'asset')}`;
}

/* --- Conditions de rentabilité --- */
function condHTML(scope) {
  const dims = Object.entries(DIMS);
  return `<p class="note" style="margin:0 2px 8px">Choisis les critères à croiser, par exemple Méthode + Actif + Session.</p>
    <div class="chips scroll">${dims.map(([k, d]) => `<button class="chip press ${xDims.includes(k) ? 'on' : ''}" data-xd="${k}">${d.label}</button>`).join('')}</div>
    <div class="chips scroll">${[['net', 'Résultat net'], ['pf', 'Profit factor'], ['exp', 'Espérance']].map(([k, t]) => `<button class="chip press ${xSort === k ? 'on' : ''}" data-xs="${k}">Classer par ${t.toLowerCase()}</button>`).join('')}</div>
    <div class="field" style="margin:4px 0 12px"><label>Nombre minimal de trades pour figurer au classement</label><input class="minput" type="number" min="1" inputmode="numeric" data-xmin value="${xMin != null ? xMin : cfg.minTrades}"></div>
    <div id="xRes">${condResults(scope)}</div>`;
}
function condResults(scope) {
  if (!xDims.length) return '<p class="note">Sélectionne au moins un critère.</p>';
  const min = xMin != null ? xMin : cfg.minTrades;
  const { groups, excluded } = crossGroups(scope.filter(isDone), xDims);
  const rows = Object.entries(groups).map(([k, l]) => ({ k, s: calc(l) }));
  const metric = r => xSort === 'net' ? r.s.total : xSort === 'pf' ? (r.s.pf === Infinity ? 1e9 : (r.s.pf != null ? r.s.pf : -1)) : r.s.expectancy;
  const ok = rows.filter(r => r.s.n >= min).sort((a, b) => metric(b) - metric(a)).slice(0, 15);
  const weak = rows.filter(r => r.s.n < min).sort((a, b) => b.s.n - a.s.n).slice(0, 10);
  const tbl = (list, flag) => `<div class="tbl"><table><thead><tr><th>Conditions</th><th>Trades</th><th>Réussite</th><th>Net</th><th>PF</th><th>Espérance</th></tr></thead><tbody>${list.map(r => `<tr class="${flag ? 'low' : ''}"><th>${esc(r.k)}${flag ? '<i class="lowtag">insuffisant</i>' : ''}</th><td>${r.s.n}</td><td>${fmtWR(r.s.winRate)}</td><td class="${signClass(r.s.total)}"><b>${fmtR(r.s.total, 1)}</b></td><td>${fmtPF(r.s.pf)}</td><td class="${signClass(r.s.expectancy)}">${fmtR(r.s.expectancy, 2)}</td></tr>`).join('')}</tbody></table></div>`;
  return `${excluded ? `<p class="note" style="margin:0 2px 8px">${excluded} trade${excluded > 1 ? 's' : ''} exclu${excluded > 1 ? 's' : ''} : une des informations croisées est inconnue (par exemple l’heure).</p>` : ''}
    <h2 style="margin-top:8px">Classement (au moins ${min} trades)</h2>${ok.length ? tbl(ok, false) : `<div class="card"><small class="muted">Aucune combinaison n’atteint ${min} trades pour l’instant. Baisse le minimum ou enregistre plus de trades.</small></div>`}
    <h2>Insuffisamment documentées (moins de ${min} trades)</h2>${weak.length ? tbl(weak, true) : '<div class="card"><small class="muted">Aucune.</small></div>'}
    <p class="note">Une combinaison observée n’est pas une cause, et ne garantit rien pour la suite. Avec peu de trades, ces classements changent beaucoup.</p>`;
}

/* --- Concepts (combinaisons cochées dans les trades) --- */
function conceptStatsHTML(scope) {
  const byKey = (list, keyFn) => { const m = {}; list.forEach(t => keyFn(t).forEach(k => { (m[k] = m[k] || []).push(t); })); return m; };
  const rank = m => Object.entries(m).map(([k, l]) => ({ k, s: calc(l) })).filter(x => x.s.n >= 2).sort((x, y) => y.s.total - x.s.total).slice(0, 10);
  const crow = x => `<div class="crow"><b>${esc(x.k)}</b><span class="bval ${signClass(x.s.total)}">${fmtR(x.s.total, 1)} R</span><small>${x.s.n} trades, ${Math.round(x.s.winRate)} % de réussite, espérance ${fmtR(x.s.expectancy, 2)} R</small></div>`;
  const keys = F.strat === 'Tous' ? Object.keys(STRATS) : [F.strat];
  const parts = keys.map(k => {
    const st = STRATS[k], done = calc(scope.filter(t => t.strat === k)).done;
    const combos = rank(byKey(done.filter(t => (t.concepts || []).length >= 2), t => [[...t.concepts].sort().join(' + ')]));
    const concs = rank(byKey(done, t => t.concepts || []));
    return `<h2 style="color:${st.color}">${st.label}</h2>
      <section class="card"><b>Combinaisons</b>${combos.length ? combos.map(crow).join('') : `<p class="note" style="margin:8px 0 0">Une combinaison apparaît ici dès qu’elle compte au moins 2 trades terminés.</p>`}</section>
      <section class="card" style="margin-top:10px"><b>Concepts seuls</b>${concs.length ? concs.map(crow).join('') : `<p class="note" style="margin:8px 0 0">Un concept apparaît ici dès qu’il compte au moins 2 trades terminés.</p>`}</section>`;
  }).join('');
  return parts + `<p class="note">Chaque méthode est analysée séparément : un concept qui porte le même nom dans deux méthodes (par exemple Order Block) n’est jamais mélangé. Avec peu de trades, ces classements bougent beaucoup.</p>`;
}

/* --- Écran Analyse --- */
function renderStats() {
  $('#s-stats').innerHTML = `<h1>Analyse</h1>
    <div class="chips scroll" id="aTop"></div>
    <div class="chips scroll" id="aViews" style="margin-bottom:12px"></div>
    <div id="aBody"></div>`;
  paintStats();
  paintRemarks();
}
function paintTop() {
  const keep = ($('#aViews') || {}).scrollLeft || 0, n = activeFilters();
  $('#aTop').innerHTML = [['Tous', 'Toutes'], ['ICT', 'ICT'], ['SMC', 'SMC'], ['PA', 'Price Action']]
    .map(([v, t]) => `<button class="chip press ${F.strat === v ? 'on' : ''}" data-fq="${v}">${t}</button>`).join('') +
    `<button class="chip press flt ${n ? 'on-flt' : ''}" data-act="open-filters">Filtres${n ? ' (' + n + ')' : ''}</button>`;
  $('#aViews').innerHTML = VIEWS.filter(([v]) => v !== 'cal' || acctType() === 'reel').map(([v, t]) => `<button class="chip press ${aView === v ? 'on' : ''}" data-av="${v}">${t}</button>`).join('');
  $('#aViews').scrollLeft = keep;
}
function paintStats() {
  if (current !== 'stats') return;
  if (aView === 'cal' && acctType() !== 'reel') aView = 'sum';
  paintTop();
  const all = mine(), allDone = all.filter(isDone), body = $('#aBody');
  if (!allDone.length) {
    body.innerHTML = `<div class="card empty"><b>Pas encore de trade terminé</b><p>Les statistiques apparaissent dès qu’un trade a un résultat.</p><button class="primary press" data-go="new">Enregistrer un trade</button></div>`;
    return;
  }
  const scope = applyFilters(all, F), nDone = scope.filter(isDone).length;
  let html = (activeFilters() > 0 || F.strat !== 'Tous') ? `<div class="fbar"><span>${nDone} trades terminés sur ${allDone.length}</span><button class="link" data-act="reset-filters">Réinitialiser les filtres</button></div>` : '';
  html += qualityHTML(scope);
  if (!nDone) html += `<div class="card empty"><b>Aucun trade terminé avec ces filtres</b><p>Change ou réinitialise les filtres pour voir des statistiques.</p></div>`;
  else html += ({ sum: summaryHTML, hours: hoursHTML, sess: sessionsHTML, days: daysHTML, meth: methodsHTML, asset: assetsHTML, cond: condHTML, conc: conceptStatsHTML, tfv: tfHTML })[aView](scope);
  body.innerHTML = html;
  paintRemarks();
  const arc = $('#arc');
  if (arc) requestAnimationFrame(() => requestAnimationFrame(() => { arc.style.strokeDashoffset = arc.dataset.off; }));
}
function openFilters() {
  const assets = [...new Set(mine().map(t => t.asset))].sort();
  const bandOpts = bandsList().every(b => b.e - b.s === 1) ? [] : bandsList().map(b => [`b:${b.s}-${b.e}`, 'Tranche ' + b.label]);
  const hourOpts = Array.from({ length: 24 }, (_, h) => [`h:${h}`, `${pad(h)} h`]);
  const sel = (key, label, opts) => `<div class="field"><label>${label}</label><select data-ff="${key}">${opts.map(([v, t]) => `<option value="${esc(v)}" ${String(v) === String(F[key]) ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></div>`;
  openSheet(`<div class="grab"></div><div class="cardrow"><h2 style="margin:0">Filtres</h2><button class="link" data-act="reset-filters">Réinitialiser</button></div>
    ${sel('period', 'Période', [['all', 'Toute la période'], ['today', 'Aujourd’hui'], ['7d', '7 derniers jours'], ['30d', '30 derniers jours'], ['month', 'Mois en cours'], ['year', 'Année en cours'], ['custom', 'Période personnalisée']])}
    ${F.period === 'custom' ? `<div class="two"><div class="field"><label>Du</label><input type="date" data-ff="from" value="${esc(F.from)}"></div><div class="field"><label>Au</label><input type="date" data-ff="to" value="${esc(F.to)}"></div></div>` : ''}
    ${acctType() === 'backtest' ? '<p class="note" style="margin:-6px 0 8px">En backtest, les périodes se calent sur le dernier trade enregistré.</p>' : ''}
    ${sel('asset', 'Actif', [['Tous', 'Tous les actifs'], ...assets.map(a => [a, a])])}
    ${sel('strat', 'Méthode', [['Tous', 'Toutes les méthodes'], ['ICT', 'ICT'], ['SMC', 'SMC'], ['PA', 'Price Action']])}
    ${sel('session', 'Session', [['Tous', 'Toutes les sessions'], ...sessionNames().map(n => [n, n])])}
    ${sel('hour', 'Heure ou tranche horaire', [['Tous', 'Toutes les heures'], ['none', 'Heure inconnue'], ...bandOpts, ...hourOpts])}
    ${sel('dow', 'Jour de la semaine', [['Tous', 'Tous les jours'], ...DOW_ORDER.map(d => [String(d), DOW[d]])])}
    ${sel('tf', 'Time frame des concepts', [['Tous', 'Tous les time frames'], ['none', 'Aucun time frame renseigné']].concat(TFS.map(x => [x, x])))}
    ${sel('result', 'Résultat', [['Tous', 'Tous les résultats'], ['Gain', 'Gagnants'], ['Perte', 'Perdants'], ['BE', 'À l’équilibre']])}
    <button class="primary press" style="margin-top:8px" data-act="close">Voir les résultats</button>`);
}

/* ---------- Paramètres ---------- */
function tzSessionsHTML() {
  const tzOpts = sel => Array.from({ length: 27 }, (_, i) => i - 12).map(h => `<option value="${h}" ${h === sel ? 'selected' : ''}>${tzName(h)}</option>`).join('');
  return `<section class="card" style="margin-top:14px">
    <b>Fuseau horaire et sessions</b>
    <div class="field"><label>Fuseau des heures que tu saisis</label><select data-cfg="inputTz">${tzOpts(cfg.inputTz)}</select></div>
    <div class="field"><label>Fuseau utilisé pour l’analyse</label><select data-cfg="viewTz">${tzOpts(cfg.viewTz)}</select></div>
    <div class="gname" style="margin-top:14px">Horaires des sessions, en ${tzName(cfg.viewTz)}</div>
    ${cfg.sessions.map((x, i) => `<div class="two"><div class="field" style="margin:6px 0"><label>${esc(x.name)}, début (h)</label><input type="number" min="0" max="23" inputmode="numeric" data-sess="${i}:s" value="${toView(x.s)}"></div><div class="field" style="margin:6px 0"><label>fin (h)</label><input type="number" min="0" max="23" inputmode="numeric" data-sess="${i}:e" value="${toView(x.e)}"></div></div>`).join('')}
    <p class="note">Ce sont des valeurs par défaut, à adapter à ta façon de trader. Elles changent avec l’heure d’été. Si le début est après la fin, la session passe minuit. Quand deux sessions se chevauchent, celle qui a ouvert le plus récemment l’emporte.</p>
    <button class="ghost press" data-act="reset-sess">Rétablir les horaires par défaut</button>
    <div class="field" style="margin-top:16px"><label>Nombre minimal de trades pour un classement</label><input type="number" min="1" inputmode="numeric" data-cfg="minTrades" value="${cfg.minTrades}"></div>
  </section>
  <section class="card" style="margin-top:14px"><b>Actifs ajoutés</b>
    <div class="chips" style="margin-top:10px">${cfg.assets.length ? cfg.assets.map(a => `<span class="chip static">${esc(a)}</span>`).join('') : '<small class="muted">Aucun actif ajouté pour le moment.</small>'}</div>
    <button class="ghost press" style="margin-top:12px" data-act="new-asset">Ajouter un actif</button></section>`;
}
function openAssetSheet() {
  openSheet(`<div class="grab"></div><h2 style="margin-top:4px">Ajouter un actif</h2>
    <div class="field"><label for="newAsset">Symbole, par exemple NAS100</label><input id="newAsset" autocapitalize="characters" placeholder="NAS100"></div>
    <div class="btnrow"><button class="ghost press" data-act="close">Annuler</button><button class="primary press" style="padding:14px;font-size:15px;box-shadow:none" data-act="add-asset-ok">Ajouter</button></div>`);
  setTimeout(() => { const i = $('#newAsset'); if (i) i.focus(); }, 350);
}
function renderSettings() {
  $('#s-settings').innerHTML = `<h1>Paramètres</h1>
    <section class="card">
      <div class="cardrow"><b>Comptes</b><button class="link" data-act="new-acct">Ajouter un compte</button></div>
      ${acctRowsHTML()}
      <p class="note" style="margin:10px 0 0">Chaque compte a ses propres trades et statistiques. Tu reconnais le compte actif à la couleur de l’application.</p>
    </section>
<section class="card" style="margin-top:14px"><b>Thème</b>
      <div id="themeSeg" style="margin:10px 0 6px"></div>
      <p class="note" style="margin:6px 0 0">Sombre ou clair, à ton choix. Automatique suit le thème du téléphone quand l’application le permet. Le choix est gardé quand tu fermes l’application.</p>
    </section>
    ${tzSessionsHTML()}
    <section class="card list" style="margin-top:14px">
      <button class="srow press" data-act="export">Exporter les trades en CSV<small>Tous les comptes</small></button>
      <button class="srow press" data-act="seed">Recharger les trades d'exemple</button>
      <button class="srow press danger" data-act="ask-clear">Supprimer tous les trades (${esc(acctObj().name)})</button>
    </section>
    <p class="note">Tes trades, tes comptes et tes réglages sont gardés sur le téléphone. ${window.JtrNative ? 'Les captures aussi, sans limite de nombre : seule la place libre sur ton téléphone compte.' : 'Les captures aussi, tant que l’espace de stockage de la page le permet.'} Les trades d’exemple ne sont jamais enregistrés et n’apparaissent que si tu les recharges ici.</p>
    <p class="note">Version de l’interface : 18 oct. 2026, journal et calendrier, remarques, captures sans limite.</p>`;
  seg($('#themeSeg'), [{ v: 'auto', t: 'Auto' }, { v: 'light', t: 'Clair' }, { v: 'dark', t: 'Sombre' }], themeMode, setTheme);
}
function exportCSV() {
  const q = v => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
  const head = ['id', 'compte', 'periode_testee', 'captures', 'date', 'heure', 'fuseau_min', 'actif', 'session', 'strategie', 'direction', 'resultat', 'r', 'risque_pct', 'setup', 'concepts', 'concepts_time_frames', 'plan_respecte', 'note'];
  const rows = trades.map(t => [t.id, acctObj(t.acct).name, t.btPeriod || '', (t.shots || []).length, t.date, t.time || '', (t.tz == null ? '' : t.tz), t.asset, t.session, STRATS[t.strat].label, t.dir, t.result, (t.r == null ? '' : t.r), (t.risk == null ? '' : t.risk), t.setup, (t.concepts || []).join(' | '), (t.concepts || []).map(c => conceptLabel(c, t.ctf)).join(' | '), t.plan ? 'oui' : 'non', t.note || ''].map(q).join(';'));
  const blob = new Blob(['\ufeff' + head.join(';') + '\n' + rows.join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'tradelog.csv';
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast('Export CSV prêt');
}

/* ---------- Événements ---------- */
document.addEventListener('click', e => {
  const g = e.target.closest('[data-go]');
  if (g) { closeSheet(); go(g.dataset.go); return; }
  const o = e.target.closest('[data-open]');
  if (o) { openDetail(Number(o.dataset.open)); return; }
  const hf = e.target.closest('[data-hf]');
  if (hf) {
    const [k, v] = hf.dataset.hf.split(':');
    if (k === 'all') { hFilter.res = 'Tous'; hFilter.dir = 'Tous'; }
    else hFilter[k] = ((k === 'res' || k === 'dir') && hFilter[k] === v) ? 'Tous' : v;
    paintHistory(); return;
  }
  const fq = e.target.closest('[data-fq]');
  if (fq) { F.strat = fq.dataset.fq; paintStats(); return; }
  const av = e.target.closest('[data-av]');
  if (av) { aView = av.dataset.av; paintStats(); return; }
  const ind = e.target.closest('[data-ind]');
  if (ind) { aInd = ind.dataset.ind; paintStats(); return; }
  const md = e.target.closest('[data-mdim]');
  if (md) { mDim = md.dataset.mdim; paintStats(); return; }
  const bd = e.target.closest('[data-band]');
  if (bd) { cfg.bandMode = bd.dataset.band; paintStats(); return; }
  const xd = e.target.closest('[data-xd]');
  if (xd) { const k = xd.dataset.xd; xDims = xDims.includes(k) ? xDims.filter(x => x !== k) : [...xDims, k]; paintStats(); return; }
  const xs = e.target.closest('[data-xs]');
  if (xs) { xSort = xs.dataset.xs; paintStats(); return; }
  const hrb = e.target.closest('[data-hr]');
  if (hrb) { openBandSheet(hrb.dataset.hr); return; }
  const vw = e.target.closest('[data-view]');
  if (vw) {
    const [k, i] = vw.dataset.view.split(':');
    const src = k === 'd' ? draft.shots[Number(i)] : ((trades.find(x => x.id === Number(k)) || {}).shots || [])[Number(i)];
    if (src) openViewer(src);
    return;
  }
  if (e.target.closest('#viewer')) { $('#viewer').classList.remove('show'); return; }
  const a = e.target.closest('[data-act]');
  if (a) {
    const [act, arg] = a.dataset.act.split(':');
    if (act === 'close') closeSheet();
    else if (act === 'edit') {
      const t = trades.find(x => x.id === Number(arg)); if (!t) return;
      editingId = t.id;
      draft = { ...newDraft(t.strat), ...t, r: t.r == null ? '' : fmtNum(t.r), risk: t.risk == null ? '' : fmtNum(t.risk), concepts: new Set(t.concepts || []), ctf: JSON.parse(JSON.stringify(t.ctf || {})) };
      closeSheet(); go('new');
    }
    else if (act === 'cancel-edit') { editingId = null; draft = newDraft(draft.strat); renderNew(); }
    else if (act === 'ask-del') confirmSheet('Supprimer ce trade ?', 'Cette action est définitive.', 'Supprimer le trade', 'del:' + arg);
    else if (act === 'del') { trades = trades.filter(t => t.id !== Number(arg)); closeSheet(); toast('Trade supprimé'); render[current](); }
    else if (act === 'ask-clear') confirmSheet(`Supprimer tous les trades du compte « ${acctObj().name} » ?`, `${mine().length} trades seront supprimés. L'autre compte n'est pas touché. Cette action est définitive.`, 'Tout supprimer', 'clear');
    else if (act === 'clear') { trades = trades.filter(t => t.acct !== acct); closeSheet(); toast('Trades supprimés'); render[current](); }
    else if (act === 'clear-demo') { demoOff = true; trades = trades.filter(t => !(t.demo && t.acct === acct)); renderHome(); }
    else if (act === 'seed') { demoOff = false; seedDemo(); toast('Trades d\'exemple rechargés'); renderSettings(); }
    else if (act === 'export') exportCSV();
    else if (act === 'open-filters') openFilters();
    else if (act === 'reset-filters') { F = defaultFilters(); if (e.target.closest('#sheet')) openFilters(); paintStats(); }
    else if (act === 'reset-sess') { cfg.sessions = defaultSessions(); renderSettings(); }
    else if (act === 'new-asset') openAssetSheet();
    else if (act === 'add-asset-ok') {
      const v = (($('#newAsset') || {}).value || '').trim().toUpperCase().replace(/[^A-Z0-9._-]/g, '');
      if (!v) { toast('Entre un symbole'); return; }
      if (!ASSETS.includes(v) && !cfg.assets.includes(v)) cfg.assets.push(v);
      closeSheet(); toast('Actif ajouté');
      if (current === 'new') { draft.asset = v; renderNew(); } else if (current === 'settings') renderSettings();
    }
    return;
  }
  if (e.target.id === 'scrim') closeSheet();
});
$('#s-new').addEventListener('click', e => {
  const rm = e.target.closest('[data-rmshot]');
  if (rm) { e.stopPropagation(); draft.shots.splice(Number(rm.dataset.rmshot), 1); paintShots(); return; }
  if (e.target.closest('[data-clear]')) { draft.concepts.clear(); draft.ctf = {}; $$('[data-concept]').forEach(b => b.classList.remove('on')); $$('.tfrow').forEach(r => r.remove()); paintCombo(); return; }
  const tfb = e.target.closest('[data-tf]');
  if (tfb) { toggleTf(tfb.dataset.tfc, tfb.dataset.tf, tfb); return; }
  const c = e.target.closest('[data-concept]');
  if (c) { toggleConcept(c); return; }
  const dr = e.target.closest('[data-dir]');
  if (dr) { draft.dir = dr.dataset.dir; $$('.dir', $('#dirs')).forEach(b => b.classList.toggle('on', b.dataset.dir === draft.dir)); return; }
  const rs = e.target.closest('[data-res]');
  if (rs) {
    draft.result = rs.dataset.res;
    $$('[data-res]').forEach(b => b.classList.toggle('on', b.dataset.res === draft.result));
    const needs = ['Gain', 'Perte', 'BE'].includes(draft.result), inp = $('#f-r');
    inp.disabled = !needs; if (!needs) { inp.value = ''; draft.r = ''; } else inp.focus();
    clearErrors(); return;
  }
  const sw = e.target.closest('.switch');
  if (sw) {
    const key = sw.id === 'sw-plan' ? 'plan' : 'full';
    draft[key] = !draft[key]; sw.setAttribute('aria-checked', draft[key]);
    if (key === 'full') $('#full').classList.toggle('open', draft.full);
    return;
  }
  if (e.target.closest('#save')) saveTrade();
});
$('#s-new').addEventListener('input', e => {
  const f = e.target.dataset.f; if (!f) return;
  if (f === 'asset' && e.target.value === NEW_ASSET) { e.target.value = draft.asset; openAssetSheet(); return; }
  draft[f] = e.target.value;
  const fld = e.target.closest('.field');
  if (fld && fld.classList.contains('bad')) { fld.classList.remove('bad', 'shake'); rmMsg(fld); }
});
$('#s-new').addEventListener('change', e => {
  if (e.target.id === 'f-shots') { const files = [...e.target.files]; e.target.value = ''; addShots(files); }
});
$('#sheet').addEventListener('change', e => {
  const k = e.target.dataset.ff; if (!k) return;
  F[k] = e.target.value;
  if (k === 'period') openFilters();
  paintStats();
});
$('#s-settings').addEventListener('change', e => {
  const c = e.target.dataset.cfg, sx = e.target.dataset.sess;
  if (c === 'minTrades') cfg.minTrades = Math.max(1, Math.round(Number(e.target.value)) || 1);
  else if (c) cfg[c] = Number(e.target.value);
  else if (sx) { const [i, k] = sx.split(':'); const h = Math.min(23, Math.max(0, Math.round(Number(e.target.value)) || 0)); cfg.sessions[Number(i)][k] = fromView(h); }
  else return;
  renderSettings();
});
$('#s-stats').addEventListener('input', e => {
  if (e.target.dataset.bandcustom !== undefined) { cfg.bandCustom = e.target.value; const r = $('#hRes'); if (r) r.innerHTML = hoursResults(applyFilters(mine(), F)); }
  else if (e.target.dataset.xmin !== undefined) { const v = Math.round(Number(e.target.value)); xMin = v >= 1 ? v : null; const r = $('#xRes'); if (r) r.innerHTML = condResults(applyFilters(mine(), F)); }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeSheet(); $('#viewer').classList.remove('show'); } });

window.__JTR_P4 = true;
