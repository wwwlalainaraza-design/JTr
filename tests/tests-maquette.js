const fs = require('fs'), vm = require('vm'), path = require('path');
const ASSETS_DIR = path.join(__dirname, '..', 'app', 'src', 'main', 'assets');
const js = ['jtr1.js', 'jtr2.js', 'jtr3.js', 'jtr4.js'].map(f => fs.readFileSync(path.join(ASSETS_DIR, f), 'utf8')).join('\n');
const lib = js.slice(js.indexOf('/* ---------- Outils'), js.indexOf('/* ---------- Paramètres'));
const j5 = fs.readFileSync(path.join(ASSETS_DIR, 'jtr5.js'), 'utf8');
const lib5 = j5.slice(0, j5.indexOf('/* ---------- Démarrage'));
const tests = `
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('ECHEC:', m); } };
const near = (a, b, m) => ok(Math.abs(a - b) < 1e-9, m + ' (obtenu ' + a + ', attendu ' + b + ')');
const T = (id, date, result, r, extra = {}) => ({ id, acct: 'reel', date, time: '', tz: null, asset: 'XAUUSD', session: 'Londres', strat: 'ICT', dir: 'BUY', result, r, risk: 1, setup: '', concepts: [], plan: true, ...extra });

/* 1. Indicateurs de base */
let L = [T(1,'2026-01-01','Gain',2), T(2,'2026-01-02','Perte',-1), T(3,'2026-01-03','Perte',-1), T(4,'2026-01-04','Gain',3), T(5,'2026-01-05','BE',0), T(6,'2026-01-06','En attente',null), T(7,'2026-01-07','Annulé',null)];
let a = calc(L);
ok(a.n === 5, 'trades terminés = 5 (attente et annulé exclus)');
near(a.winRate, 40, 'taux de réussite (BE dans le dénominateur)');
near(a.total, 3, 'résultat net');
near(a.grossWin, 5, 'gains bruts'); near(a.grossLoss, 2, 'pertes brutes');
near(a.grossWin - a.grossLoss, a.total, 'net = gains - pertes');
near(a.pf, 2.5, 'profit factor'); near(a.expectancy, 0.6, 'espérance');
near(a.avgWin, 2.5, 'gain moyen'); near(a.avgLoss, -1, 'perte moyenne');
near(a.dd, 2, 'drawdown max (sommet 2, creux 0)'); ok(a.maxWS === 1 && a.maxLS === 2, 'séries max');
near(a.best, 3, 'meilleur'); near(a.worst, -1, 'pire'); ok(a.pending === 1, 'en attente comptés à part');
ok(a.wins === 2 && a.losses === 2 && a.be === 1, 'compteurs gains/pertes/BE');

/* 2. Cas limites */
let e = calc([]);
ok(e.n === 0 && e.winRate === null && e.pf === null && e.expectancy === null && e.dd === null && e.avgWin === null && e.best === null, 'aucun trade : tout est nul, rien inventé');
ok(calc([T(1,'2026-01-01','Gain',2)]).pf === Infinity, 'sans perte : profit factor non défini (infini)');
ok(calc([T(1,'2026-01-01','Perte',-1)]).avgWin === null, 'sans gain : gain moyen N/A');
near(calc([T(1,'2026-01-01','Perte',-1)]).pf, 0, 'sans gain : profit factor 0');
ok(calc([T(1,'2026-01-01','Gain',null)]).n === 0, 'résultat inconnu : non compté (jamais 0 R)');
ok(calc([T(1,'2026-01-01','BE',0)]).pf === null, 'seulement du BE : profit factor non défini');

/* 3. Ordre chronologique (drawdown) */
let c = calc([T(2,'2026-01-02','Perte',-2), T(1,'2026-01-01','Gain',3)]);
near(c.dd, 2, 'drawdown dans l ordre des dates, pas l ordre du tableau');
let c2 = calc([T(1,'2026-01-01','Gain',1,{time:'15:00',tz:0}), T(2,'2026-01-01','Perte',-3,{time:'09:00',tz:0})]);
near(c2.curve[1], -3, 'même jour : tri par heure');

/* 4. Fuseaux horaires */
cfg.viewTz = 3;
let t1 = T(1,'2026-10-10','Gain',1,{time:'23:30',tz:180});
ok(locate(t1).hour === 23, 'même fuseau : 23 h');
cfg.viewTz = 0;
ok(locate(t1).hour === 20, 'UTC+3 vers UTC : 20 h');
let t2 = T(2,'2026-10-10','Gain',1,{time:'01:00',tz:180});
ok(locate(t2).hour === 22 && locate(t2).date === '2026-10-09' && locate(t2).dow === 5, 'passage de minuit : veille, vendredi, 22 h');
cfg.viewTz = 5; ok(locate(t2).hour === 3 && locate(t2).date === '2026-10-10', 'UTC+5 : 3 h le 10');
ok(locate(T(3,'2026-10-10','Gain',1)).hour === null, 'sans heure : heure inconnue, jamais inventée');
ok(locate(T(3,'2026-10-10','Gain',1)).dow === 6, 'sans heure : le jour vient de la date (samedi)');

/* 5. Tranches horaires */
cfg.viewTz = 0; cfg.bandMode = '1'; ok(bandsList().length === 24, 'heure par heure : 24 lignes');
cfg.bandMode = '2'; let b2 = bandsList(); ok(b2.length === 12 && b2[0].label === '00 h–02 h' && b2[11].label === '22 h–00 h', 'tranches de 2 h');
cfg.bandMode = 'custom'; cfg.bandCustom = '0, 8, 13, 22'; let b4 = bandsList(); ok(b4.length === 4 && b4[3].label === '22 h–00 h', 'tranches personnalisées');
cfg.bandCustom = '8, 13, 22'; let b3 = bandsList(); ok(b3.length === 3 && b3[2].label === '22 h–08 h' && inBand(3, b3[2]) && inBand(23, b3[2]) && !inBand(8, b3[2]), 'tranche qui passe minuit');
cfg.bandCustom = 'abc'; ok(bandsList().length === 24, 'saisie invalide : retour heure par heure');
cfg.bandMode = '1';
let sum = 0; bandsList().forEach(bb => { sum += calc([T(1,'2026-01-01','Gain',1,{time:'09:30',tz:0}), T(2,'2026-01-01','Perte',-1,{time:'14:10',tz:0})].filter(t => inBand(locate(t).hour, bb))).n; });
ok(sum === 2, 'chaque trade tombe dans exactement une tranche');

/* 6. Sessions */
cfg.viewTz = 0;
const S = h => sessionOf(T(1,'2026-01-01','Gain',1,{time: String(h).padStart(2,'0') + ':00', tz: 0}));
ok(S(3) === 'Asie', '03 h : Asie'); ok(S(8) === 'Londres', '08 h : Londres (chevauchement Asie, la plus récente l emporte)');
ok(S(14) === 'New York', '14 h : New York (chevauchement avec Londres)'); ok(S(22) === OTHER, '22 h : hors session');
cfg.viewTz = 3; ok(sessionOf(T(1,'2026-01-01','Gain',1,{time:'11:00',tz:180})) === 'Londres', 'fuseau UTC+3 : 11 h locale = 08 h UTC = Londres');
ok(sessionOf(T(1,'2026-01-01','Gain',1,{session:'New York'})) === 'New York', 'sans heure : session saisie utilisée');
ok(sessionOf(T(1,'2026-01-01','Gain',1,{session:'Londres–New York'})) === OTHER, 'sans heure et session mixte : non classée');
cfg.sessions[1].s = 10; cfg.viewTz = 0; ok(S(8) === 'Asie', 'horaires de session modifiables');
cfg.sessions = defaultSessions();

/* 7. Filtres */
cfg.viewTz = 0;
const D = [
  T(1,'2026-03-02','Gain',2,{time:'09:00',tz:0,strat:'ICT',asset:'XAUUSD'}),
  T(2,'2026-03-03','Perte',-1,{time:'09:30',tz:0,strat:'SMC',asset:'XAUUSD'}),
  T(3,'2026-03-04','Gain',1,{time:'15:00',tz:0,strat:'ICT',asset:'EURUSD'}),
  T(4,'2026-03-05','BE',0,{strat:'PA',asset:'EURUSD'}),
  T(5,'2026-03-06','En attente',null,{time:'10:00',tz:0})
];
const f = o => applyFilters(D, { ...defaultFilters(), ...o }).map(t => t.id).join(',');
ok(f({}) === '1,2,3,4,5', 'sans filtre : tout');
ok(f({ asset: 'EURUSD' }) === '3,4', 'filtre actif'); ok(f({ strat: 'ICT' }) === '1,3,5', 'filtre méthode');
ok(f({ result: 'Gain' }) === '1,3', 'filtre résultat'); ok(f({ session: 'Londres' }) === '1,2,4,5', 'filtre session (heure connue, sinon session saisie)');
ok(f({ dow: '1' }) === '1', 'filtre lundi'); ok(f({ hour: 'h:9' }) === '1,2', 'filtre heure');
ok(f({ hour: 'none' }) === '4', 'filtre heure inconnue'); ok(f({ hour: 'b:8-12' }) === '1,2,5', 'filtre tranche');
ok(f({ period: 'custom', from: '2026-03-03', to: '2026-03-04' }) === '2,3', 'période personnalisée');
ok(f({ asset: 'XAUUSD', strat: 'ICT', result: 'Gain', hour: 'h:9' }) === '1', 'filtres combinés');
ok(f({ period: 'year' }) === (D.every(t => t.date.slice(0,4) === refISO().slice(0,4)) ? '1,2,3,4,5' : ''), 'année en cours');

/* 8. Modification et suppression : recalcul */
let M = D.map(t => ({ ...t })); let before = calc(M).total;
M[0].r = 5; near(calc(M).total, before + 3, 'trade modifié : le net suit');
M = M.filter(t => t.id !== 2); near(calc(M).total, before + 3 + 1, 'trade supprimé : le net suit');

/* 9. Croisement de conditions */
const g = crossGroups(calc(D).done, ['strat', 'hour']);
ok(g.excluded === 1, 'croisement : le trade sans heure est exclu, pas deviné');
ok(Object.keys(g.groups).length === 3, 'croisement : 3 groupes');

/* 10. Données d exemple : séparées par compte, trades en attente exclus */
trades = []; seedDemo(); acct = 'reel';
ok(mine().length === 17 && calc(mine()).n === 16 && calc(mine()).pending === 1, 'compte réel : 17 trades, 16 terminés');
acct = 'backtest'; ok(mine().length === 10, 'compte backtest séparé : 10 trades');
ok(refISO() === mine().map(t => t.date).sort().pop(), 'backtest : la période se cale sur le dernier trade');
acct = 'reel';
ok(mine().some(t => !hasTime(t)), 'des trades d exemple sans heure existent (pour tester le signalement)');

/* 11. Les vues se génèrent sans erreur sur les données d exemple */
const scope = applyFilters(mine(), defaultFilters());
const out = {
  sum: summaryHTML(scope), hours: hoursHTML(scope), sess: sessionsHTML(scope), days: daysHTML(scope), meth: methodsHTML(scope),
  asset: assetsHTML(scope), cond: condHTML(scope), conc: conceptStatsHTML(scope), q: qualityHTML(scope)
};
ok(out.sum.includes('Résultat net') && out.sum.includes('Drawdown'), 'vue Résumé');
ok((out.hours.match(/data-hr="/g) || []).length >= 24, 'vue Heures : 24 heures');
ok(out.sess.includes('Asie') && out.sess.includes('Londres') && out.sess.includes('New York') && out.sess.includes('Autre'), 'vue Sessions');
ok(out.days.includes('Lundi') && out.days.includes('Vendredi'), 'vue Jours');
ok(out.meth.includes('ICT') && out.meth.includes('SMC') && out.meth.includes('Price Action'), 'vue Méthodes');
ok(out.asset.includes('XAUUSD'), 'vue Actifs'); ok(out.cond.includes('Classement'), 'vue Conditions'); ok(out.conc.includes('Combinaisons'), 'vue Concepts');
ok(out.q.includes('sans heure') && out.q.includes('en attente'), 'données manquantes signalées');
for (const k of ['sum','hours','sess','days','meth','asset','cond','conc']) ok(!/NaN|undefined|Infinity<|\\[object/.test(out[k]), 'pas de NaN ni undefined dans la vue ' + k);
for (const bm of ['1','2','3','4','6','8','12','custom']) { cfg.bandMode = bm; cfg.bandCustom = '0, 8, 13, 22'; ok(!/NaN|undefined/.test(hoursResults(scope)), 'tranches ' + bm + ' sans NaN'); }
cfg.bandMode = '1';
for (const ik of ['net','wr','pf','exp']) { aInd = ik; ok(!/NaN|undefined/.test(methodsHTML(scope)), 'indicateur ' + ik); }
for (const dk of ['hour','session','dow','asset']) { mDim = dk; ok(!/NaN|undefined/.test(methodsHTML(scope)), 'croisement méthodes ' + dk); }
const sc2 = applyFilters(mine(), { ...defaultFilters(), asset: 'XAUUSD', strat: 'ICT' });
ok(!/NaN|undefined/.test(summaryHTML(sc2)), 'résumé filtré sans NaN');

/* 12. Comptes et sauvegarde sur le téléphone (stockage simulé) */
toast = () => {};
const ST = localStorage._s;
trades = []; nextId = 1; demoOff = false; acct = 'reel';
accounts = [{ id: 'reel', name: 'Compte réel', type: 'reel', accent: 'blue' }, { id: 'backtest', name: 'Backtest', type: 'backtest', accent: 'violet' }];
seedDemo();
accounts.push({ id: 'c2', name: 'Compte réel 2', type: 'reel', accent: 'orange' });
trades.push(T(500, '2026-02-01', 'Gain', 2, { acct: 'reel', shots: ['data:image/jpeg;base64,AAAA'] }));
trades.push(T(501, '2026-02-02', 'Perte', -1, { acct: 'c2' }));
nextId = 502; acct = 'c2';
ok(saveAll() === true, 'sauvegarde réussie');
const sv = JSON.parse(ST['jtr-data']);
ok(sv.trades.length === 2 && sv.trades.every(t => !t.demo), 'seuls les vrais trades sont sauvegardés, jamais les exemples');
ok(sv.trades.every(t => !('shots' in t)), 'les captures ne sont pas dans la clé principale');
ok(JSON.parse(ST['jtr-shots'])['500'].length === 1, 'les captures sont sauvegardées à part');
ok(sv.accounts.length === 3 && sv.acct === 'c2', 'comptes et compte actif sauvegardés');
trades = []; nextId = 1; acct = 'reel';
accounts = [{ id: 'reel', name: 'x', type: 'reel', accent: 'blue' }];
ok(loadAll() === true, 'chargement réussi');
ok(trades.length === 2 && trades.find(t => t.id === 500).shots.length === 1, 'trades et captures restaurés');
ok(accounts.length === 3 && accounts[2].name === 'Compte réel 2' && acct === 'c2', 'comptes restaurés');
ok(nextId >= 502, 'identifiants suivants conservés');
acct = 'c2'; ok(acctType() === 'reel' && mine().length === 1, 'chaque compte garde ses propres trades');
acct = 'reel'; ok(mine().length === 1 && mine()[0].id === 500, 'l autre compte réel reste séparé');
ST['jtr-data'] = '{pas du json'; trades = []; accounts = [{ id: 'reel', name: 'Compte réel', type: 'reel', accent: 'blue' }];
ok(loadAll() === false && ST['jtr-data-corrompu'] === '{pas du json', 'données illisibles : copie de secours, pas de plantage');
delete ST['jtr-data'];
trades = [T(1, '2026-01-01', 'Gain', 1, { shots: ['data:image/jpeg;base64,BBBB'] })]; shotSigAll = null;
localStorage.fail = k => k === 'jtr-shots';
ok(saveAll() === true && !!ST['jtr-data'], 'espace plein pour les captures : les trades restent sauvegardés');
localStorage.fail = k => true; nextId += 1;   /* un changement à écrire, sinon rien n'est tenté */
ok(saveAll() === false, 'stockage refusé : pas de plantage');
localStorage.fail = null;
accounts = [{ id: 'c9', name: 'Seul', type: 'reel', accent: 'teal' }]; trades = []; nextId = 1; seedDemo();
ok(trades.length === 0, 'les exemples ne sont pas ajoutés à un compte qui n existe pas');
ok(acctObj('inconnu').id === 'c9', 'compte inconnu : repli sans plantage');

/* 13. Time frames des concepts */
accounts = [{ id: 'reel', name: 'Compte réel', type: 'reel', accent: 'blue' }, { id: 'backtest', name: 'Backtest', type: 'backtest', accent: 'violet' }];
acct = 'reel'; trades = []; nextId = 1; cfg.minTrades = 5;
ok(conceptLabel('Order Block', { 'Order Block': ['M15', 'H1'] }) === 'Order Block M15/H1', 'étiquette avec plusieurs time frames');
ok(conceptLabel('BOS', {}) === 'BOS' && conceptLabel('BOS', undefined) === 'BOS', 'sans time frame : le nom seul');
const A = T(701, '2026-03-02', 'Gain', 2, { strat: 'SMC', concepts: ['Order Block', 'BOS'], ctf: { 'Order Block': ['M15', 'H1'], 'BOS': ['H1'] } });
const B = T(702, '2026-03-03', 'Perte', -1, { strat: 'SMC', concepts: ['Order Block'], ctf: { 'Order Block': ['M15'] } });
const C = T(703, '2026-03-04', 'Gain', 3, { strat: 'ICT', concepts: ['Order Block'], ctf: { 'Order Block': ['M15'] } });
const E = T(704, '2026-03-05', 'Gain', 1, { strat: 'SMC', concepts: ['Order Block'] });
ok(tradeTfs(A).join() === 'M15,H1' && tradeTfs(E).length === 0, 'time frames d un trade, dans l ordre ; ancien trade : aucun');
const tg = tfGroups(calc([A, B, C, E]).done);
ok(tg['M15'].length === 3 && tg['H1'].length === 1 && !tg['M5'], 'groupes par time frame');
near(calc(tg['M15']).total, 4, 'net des trades en M15 (2 - 1 + 3)');
ok(tg['M15'].includes(A) && tg['H1'].includes(A), 'un trade multi-time frames compte dans chacun');
ok(!Object.keys(tg).some(k => tg[k].includes(E)), 'un trade sans time frame n entre dans aucun groupe');
const cg = conceptTfGroups(calc([A, B, C, E]).done);
ok(cg['Order Block (SMC)']['M15'].length === 2 && cg['Order Block (ICT)']['M15'].length === 1, 'un même concept reste séparé entre ICT et SMC');
ok(cg['BOS (SMC)']['H1'].length === 1 && cg['Order Block (SMC)']['H1'].length === 1, 'concept x time frame');
const f3 = o => applyFilters([A, B, C, E], Object.assign({}, defaultFilters(), o)).map(t => t.id).join(',');
ok(f3({ tf: 'M15' }) === '701,702,703' && f3({ tf: 'H1' }) === '701' && f3({ tf: 'none' }) === '704' && f3({}) === '701,702,703,704', 'filtre time frame : M15, H1, aucun, tous');
ok(f3({ tf: 'M15', strat: 'SMC' }) === '701,702', 'filtre time frame combiné avec la méthode');
trades = [A, B, C, E].map(t => Object.assign({}, t, { acct: 'reel' })); acct = 'reel'; aInd = 'net';
let th = tfHTML(applyFilters(mine(), defaultFilters()));
ok(th.includes('Tableau par time frame') && th.includes('Order Block (SMC)') && th.includes('Order Block (ICT)') && !/NaN|undefined/.test(th), 'vue Time frames : contenu et pas de NaN');
ok(th.includes('sans time frame'), 'vue Time frames : les trades sans time frame sont signalés');
trades = [T(1, '2026-03-02', 'Gain', 2, { concepts: ['BOS'] })];
ok(tfHTML(applyFilters(mine(), defaultFilters())).includes('Aucun time frame renseigné'), 'vue Time frames : état vide explicite');
trades = []; nextId = 1; seedDemo(); acct = 'reel';
for (const ik of ['net', 'wr', 'pf', 'exp']) { aInd = ik; ok(!/NaN|undefined/.test(tfHTML(applyFilters(mine(), defaultFilters()))), 'vue Time frames sur les exemples, indicateur ' + ik); }
ok(mine().some(t => tradeTfs(t).length) && mine().some(t => !tradeTfs(t).length), 'exemples : certains trades avec time frame, d autres sans');

/* 14. Calendrier des gains et pertes, remarques */
accounts = [{ id: 'reel', name: 'Compte réel', type: 'reel', accent: 'blue' }, { id: 'backtest', name: 'Backtest', type: 'backtest', accent: 'violet' }];
acct = 'reel'; remarks = []; hFilter.day = '';
const calT = [
  T(801, '2026-10-05', 'Gain', 2), T(802, '2026-10-05', 'Perte', -1), T(803, '2026-10-06', 'Perte', -1.5), T(804, '2026-10-07', 'BE', 0),
  T(805, '2026-10-20', 'En attente', null), T(806, '2026-09-30', 'Gain', 4)
];
trades = calT.map(t => Object.assign({}, t, { acct: 'reel' }));
const ds = dayStats(calc(calT).done);
near(ds['2026-10-05'].net, 1, 'jour avec un gain et une perte : net = 1 R');
ok(ds['2026-10-05'].n === 2 && ds['2026-10-05'].wins === 1 && ds['2026-10-05'].losses === 1, 'compteurs du jour');
near(ds['2026-10-06'].net, -1.5, 'jour perdant');
ok(ds['2026-10-07'].net === 0 && ds['2026-10-07'].n === 1, 'jour break-even');
ok(!ds['2026-10-20'], 'un trade en attente ne crée pas de jour');
const ms = monthStats(calc(calT).done, 2026, 9);
near(ms.net, -0.5, 'résultat du mois = 1 - 1,5 + 0');
ok(ms.active === 3 && ms.n === 4, 'jours actifs = 3, trades terminés du mois = 4');
near(ms.winRate, 25, 'réussite du mois : 1 gagnant sur 4 trades terminés (le BE compte)');
ok(monthStats(calc(calT).done, 2030, 0).active === 0 && monthStats(calc(calT).done, 2030, 0).winRate === null, 'mois vide : rien n est inventé');
calYM = { y: 2026, m: 9 };
let ch = calBoxHTML();
const cellHtml = key => { const i = ch.indexOf('data-day="' + key + '"'); return i < 0 ? '' : ch.slice(ch.lastIndexOf('<button', i), ch.indexOf('</button>', i)); };
ok(ch.includes('Octobre 2026'), 'titre du mois');
ok(ch.split('class="day empty"').length - 1 === 3, '1er octobre 2026 = jeudi : 3 cases vides au début (semaine du lundi)');
ok(ch.split('data-day="').length - 1 === 3, 'trois jours avec trades en octobre (le 30 septembre est un autre mois)');
ok(cellHtml('2026-10-05').includes('day pos') && cellHtml('2026-10-05').includes('+1,0'), 'le 5 : vert, +1,0');
ok(cellHtml('2026-10-06').includes('day neg') && cellHtml('2026-10-06').includes('−1,5'), 'le 6 : rouge, −1,5');
ok(cellHtml('2026-10-07').includes('day flat') && cellHtml('2026-10-07').includes('>BE<'), 'le 7 : gris, affiché BE');
ok(ch.includes('Résultat du mois') && ch.includes('Jours actifs') && ch.includes('Réussite') && ch.includes('Positif') && ch.includes('Négatif') && ch.includes('Sans trade') && ch.includes('LUN') && ch.includes('DIM') && !/NaN|undefined/.test(ch), 'résumé, légende et jours de la semaine');
hFilter.day = '2026-10-05'; ch = calBoxHTML(); ok(cellHtml('2026-10-05').includes(' sel'), 'jour sélectionné marqué'); hFilter.day = '';
calYM = { y: 2026, m: 8 }; ch = calBoxHTML();
ok(ch.includes('Septembre 2026') && ch.includes('data-day="2026-09-30"') && ch.includes('Revenir à ce mois-ci'), 'mois précédent, avec le bouton de retour');
calYM = { y: 2030, m: 0 }; ch = calBoxHTML();
ok(!/NaN|undefined/.test(ch) && ch.includes('—'), 'mois sans trade : tirets, pas de NaN');
calYM = null;
remarks = [{ id: 'a', acct: 'reel', text: 'A', color: 'green', shared: false }, { id: 'b', acct: 'reel', text: 'B', color: 'red', shared: true }, { id: 'c', acct: 'backtest', text: 'C', color: 'red', shared: false }];
acct = 'reel'; ok(visibleRemarks().map(n => n.id).join() === 'a,b', 'compte réel : ses remarques et la remarque partagée');
acct = 'backtest'; ok(visibleRemarks().map(n => n.id).join() === 'b,c', 'backtest : la remarque partagée du réel et la sienne, pas la privée');
ok(remarksHTML().includes('Remarque du compte « Compte réel »') && remarksHTML().includes('rem red'), 'étiquette d origine et couleur rouge');
remarks = [{ id: 'x', acct: 'reel', text: '<b>gras</b> & "test"', color: 'green', shared: false }]; acct = 'reel';
ok(!remarksHTML().includes('<b>gras</b>') && remarksHTML().includes('&lt;b&gt;'), 'le texte d une remarque est protégé (pas de HTML injecté)');
remarks = [{ id: 'a', acct: 'reel', text: 'Garder a l oeil', color: 'red', shared: true }]; trades = []; acct = 'reel';
ok(saveAll() === true, 'sauvegarde avec remarques'); remarks = [];
ok(loadAll() === true && remarks.length === 1 && remarks[0].color === 'red' && remarks[0].shared === true, 'remarques restaurées avec leur couleur et leur partage');

/* 15. Corrections : BE, copie des remarques, sauvegarde sans limite de captures */
trades = []; acct = 'reel';
ok(rLabel(T(900, '2026-03-01', 'BE', 0)) === 'BE' && rLabel(T(901, '2026-03-01', 'BE', 0.4)) === 'BE +0,4' && rLabel(T(902, '2026-03-01', 'Gain', 2)) === '+2,0 R' && rLabel(T(903, '2026-03-01', 'En attente', null)) === 'En attente', 'libellés des résultats : un BE à 0 R s affiche BE');
ok(calc([T(904, '2026-03-01', 'BE', 0)]).n === 1 && calc([T(904, '2026-03-01', 'BE', 0)]).be === 1, 'un trade BE à 0 R compte parmi les trades terminés');
ok(hFilter.dir === 'Tous' && hFilter.day === '', 'filtres de l historique : sens et jour par défaut');
accounts = [{ id: 'reel', name: 'Compte réel', type: 'reel', accent: 'blue' }, { id: 'backtest', name: 'Backtest', type: 'backtest', accent: 'violet' }, { id: 'c3', name: 'C3', type: 'reel', accent: 'teal' }];
remarks = [{ id: 'a', acct: 'reel', text: 'Éviter la news', color: 'red', shared: false }];
ok(copyRemark('a', ['backtest', 'c3', 'reel', 'inconnu']) === 2, 'copie vers 2 comptes, pas vers soi-même ni un compte inconnu');
ok(remarks.length === 3 && remarks.filter(n => n.acct === 'c3')[0].text === 'Éviter la news' && remarks.filter(n => n.acct === 'backtest')[0].color === 'red' && remarks.slice(1).every(n => n.shared === false && n.id !== 'a'), 'copies indépendantes : même texte, même couleur, ni partagées ni identiques en identifiant');
remarks[1].text = 'modifiée'; ok(remarks[0].text === 'Éviter la news', 'modifier une copie ne change pas l original');
ok(copyRemark('zzz', ['c3']) === 0, 'remarque inconnue : rien n est copié');
const mem = {};
window.JtrNative = { fail: null, load: k => (k in mem ? mem[k] : ''), save: (k, v) => { if (window.JtrNative.fail && window.JtrNative.fail(k)) return false; mem[k] = v; return true; }, remove: k => { delete mem[k]; }, loadBackup: k => (mem[k + '.bak'] || '') };
Object.keys(ST).forEach(k => delete ST[k]);
accounts = [{ id: 'reel', name: 'Compte réel', type: 'reel', accent: 'blue' }, { id: 'backtest', name: 'Backtest', type: 'backtest', accent: 'violet' }];
acct = 'reel'; remarks = [{ id: 'q', acct: 'reel', text: 'R', color: 'green', shared: false }]; nextId = 50; demoOff = true;
const many = []; for (let i = 0; i < 80; i++) many.push('data:image/jpeg;base64,' + 'A'.repeat(200000 + i));
trades = [T(1, '2026-04-01', 'Gain', 2, { shots: many }), T(2, '2026-04-02', 'Perte', -1)];
ok(saveAll() === true, 'sauvegarde dans les fichiers réussie');
ok(JSON.parse(mem['jtr-data']).trades.length === 2 && !('shots' in JSON.parse(mem['jtr-data']).trades[0]) && JSON.parse(mem['jtr-data']).trades[0].nshots === 80, 'données dans les fichiers, sans les captures mais avec leur nombre');
ok(JSON.parse(mem['shots-1']).length === 80 && !('shots-2' in mem), '80 captures enregistrées, sans limite de nombre ; aucun fichier pour un trade sans capture');
ok(!ST['jtr-shots'], 'les captures n utilisent plus le stockage limité de la page');
Object.keys(ST).forEach(k => delete ST[k]); trades = []; remarks = []; accounts = [{ id: 'reel', name: 'x', type: 'reel', accent: 'blue' }];
ok(loadAll() === true && trades.length === 2 && remarks.length === 1, 'tout est relu depuis les fichiers, même si le stockage de la page est perdu');
const tLazy = trades.find(t => t.id === 1);
ok(tLazy._lazy === true && tLazy.shots.length === 0 && shotCount(tLazy) === 80, 'au démarrage, les captures ne sont pas lues : 80 annoncées, 0 chargées');
ensureShots(tLazy); ok(tLazy.shots.length === 80 && tLazy._lazy === false && shotCount(tLazy) === 80, 'les captures sont lues seulement quand on ouvre le trade');
trades = trades.filter(t => t.id !== 1); saveAll(); ok(!('shots-1' in mem), 'supprimer un trade supprime ses captures');
trades = [T(1, '2026-04-01', 'Gain', 2, { shots: ['data:image/jpeg;base64,ZZ'] })]; saveAll(); ok('shots-1' in mem, 'captures réécrites');
trades = []; loadAll(); ok(trades[0]._lazy === true, 'relu sans charger les captures');
trades = trades.filter(t => t.id !== 1); saveAll(); ok(!('shots-1' in mem), 'supprimer un trade dont les captures ne sont jamais chargées supprime quand même son fichier');
let nSaves = 0; const rawSave = window.JtrNative.save; window.JtrNative.save = (k, v) => { nSaves++; return rawSave(k, v); };
trades = [T(7, '2026-04-03', 'Gain', 1)]; saveAll(); const first = nSaves; saveAll(); saveAll(); saveAll();
ok(first >= 1 && nSaves === first, 'rien n a changé : aucune écriture supplémentaire, donc aucune lenteur');
trades[0].note = 'changé'; saveAll(); ok(nSaves === first + 1, 'un changement : une seule écriture');
window.JtrNative.save = rawSave;
Object.keys(mem).forEach(k => delete mem[k]);
ST['jtr-data'] = JSON.stringify({ v: 1, accounts: [{ id: 'reel', name: 'Compte réel', type: 'reel', accent: 'blue' }], acct: 'reel', nextId: 9, demoOff: true, trades: [T(5, '2026-05-01', 'Gain', 1)] });
ST['jtr-shots'] = JSON.stringify({ '5': ['data:image/jpeg;base64,CCCC'] });
ok(loadAll() === true && trades[0].shots.length === 1, 'migration : anciennes captures du stockage de la page relues');
saveAll(); ok(JSON.parse(mem['shots-5']).length === 1 && !ST['jtr-shots'], 'migration : captures copiées dans les fichiers, ancienne clé libérée');
window.JtrNative.fail = k => k.startsWith('shots-'); trades[0].shots = ['x1']; ok(saveAll() === true && !!mem['jtr-data'], 'échec des fichiers de captures : les trades restent sauvegardés');
window.JtrNative.fail = () => true; ok(saveAll() === true && !!ST['jtr-data'], 'fichiers refusés : repli sur le stockage de la page');
window.JtrNative = undefined;

/* 16. Export et restauration d’une sauvegarde complète */
accounts = [{ id: 'reel', name: 'Compte réel', type: 'reel', accent: 'blue' }];
acct = 'reel'; nextId = 22; demoOff = true;
remarks = [{ id: 'r1', acct: 'reel', text: 'Respecter le plan', color: 'green', shared: false, created: 10 }];
trades = [T(21, '2026-06-01', 'Gain', 2, { shots: ['data:image/jpeg;base64,AAAA'], note: 'Trade sauvegardé' })];
const backup = buildBackupPayload();
ok(backup.format === 'jtr-backup' && backup.version === 1, 'sauvegarde : format et version reconnus');
ok(backup.data.trades.length === 1 && !('shots' in backup.data.trades[0]) && backup.data.trades[0].nshots === 1, 'sauvegarde : données sans images intégrées et nombre de captures conservé');
ok(backup.shots['21'].length === 1 && backup.shots['21'][0] === 'data:image/jpeg;base64,AAAA', 'sauvegarde : capture incluse séparément');
ok(validateBackupPayload(backup) === true, 'sauvegarde complète : validation réussie');
let rejectedBackup = false;
try { validateBackupPayload({ format: 'autre', version: 1, data: {}, shots: {} }); } catch (e) { rejectedBackup = true; }
ok(rejectedBackup, 'restauration : format inconnu refusé');
const restoredBackup = JSON.parse(JSON.stringify(backup));
restoredBackup.data.trades[0].note = 'Restauré';
restoredBackup.data.remarks[0].text = 'Remarque restaurée';
trades = []; remarks = [];
ok(restoreBackupPayload(restoredBackup) === true, 'restauration : sauvegarde valide acceptée');
ok(trades.length === 1 && trades[0].note === 'Restauré' && trades[0].shots[0] === 'data:image/jpeg;base64,AAAA', 'restauration : trade et capture retrouvés');
ok(remarks.length === 1 && remarks[0].text === 'Remarque restaurée' && accounts[0].name === 'Compte réel', 'restauration : remarques et comptes retrouvés');

/* 17. Journaux fondamentaux et comportement : conservation dans les sauvegardes */
window.__JTR_JOURNAL = { fundamental: [{ month: '2026-02', bias: 'bullish', notes: 'Dollar faible', entries: [{ id: 'f1', date: '2026-02-11', name: 'CPI', forecast: '2,9 %', actual: '3,1 %', effect: 'unfavorable', note: 'Exemple test' }] }], market: [{ id: 'm1', date: '2026-02-11', mode: 'day', time: '11:00', behavior: 'range', note: 'Range observé' }] };
saveAll();
let savedJournal = JSON.parse(ST['jtr-data']).journal;
ok(savedJournal.fundamental[0].bias === 'bullish' && savedJournal.market[0].behavior === 'range', 'sauvegarde locale : les journaux fondamental et marché sont inclus');
window.__JTR_JOURNAL = { fundamental: [], market: [] };
loadAll();
ok(window.__JTR_JOURNAL.fundamental[0].entries[0].name === 'CPI' && window.__JTR_JOURNAL.market[0].time === '11:00', 'rechargement : les journaux sont restaurés');
const journalBackup = buildBackupPayload();
ok(journalBackup.data.journal.fundamental[0].notes === 'Dollar faible' && journalBackup.data.journal.market[0].note === 'Range observé', 'sauvegarde JSON complète : les journaux sont inclus');

console.log(pass + ' vérifications réussies, ' + fail + ' échec(s)');
`;
const store = {};
const localStorage = { _s: store, fail: null, getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { if (localStorage.fail && localStorage.fail(k)) throw new Error('quota'); store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const ctx = { console, localStorage, matchMedia: () => ({ matches: false }), document: { addEventListener() {}, visibilityState: 'visible' }, window: { addEventListener() {} }, setTimeout, clearTimeout, Date, Math, Number, Array, Object, JSON, String, Set, RegExp, Promise };
vm.createContext(ctx);
vm.runInContext('function renderSettings(){}\n' + lib + '\n' + lib5 + '\n' + tests, ctx);
