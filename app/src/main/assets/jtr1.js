/* ---------- Outils ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = new Date(); today.setHours(0, 0, 0, 0);
const daysAgo = n => { const d = new Date(today); d.setDate(d.getDate() - n); return iso(d); };
const MONTHS = ['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'];
const fmtDate = s => { const [, m, d] = s.split('-').map(Number); return `${d} ${MONTHS[m - 1]}`; };
const fmtR = (v, d = 1) => v == null ? '—' : (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(d).replace('.', ',');
const fmtNum = v => String(v).replace('.', ',');
const fmtPF = v => v == null ? '—' : v === Infinity ? '∞' : v.toFixed(2).replace('.', ',');
const parseNum = s => { const v = parseFloat(String(s == null ? '' : s).replace(',', '.')); return Number.isFinite(v) ? v : null; };
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Données & Persistance LocalStorage ---------- */
const STRATS = {
  ICT: { label: 'ICT', color: 'var(--ict)' },
  SMC: { label: 'SMC', color: 'var(--smc)' },
  PA:  { label: 'Price Action', color: 'var(--pa)' }
};
const CONCEPTS = {
  ICT: [
    { g: 'Structure et déplacement', items: ['Market Structure Shift (MSS)', 'Break of Structure (BOS)', 'Displacement'] },
    { g: 'Liquidité', items: ['Liquidity Sweep', 'Buy-Side Liquidity (BSL)', 'Sell-Side Liquidity (SSL)', 'Equal Highs (EQH)', 'Equal Lows (EQL)', 'Judas Swing'] },
    { g: 'Zones et déséquilibres', items: ['Fair Value Gap (FVG)', 'Inversion FVG (IFVG)', 'Order Block', 'Breaker Block', 'Mitigation Block'] },
    { g: 'Prix et timing', items: ['Premium / Discount', 'Optimal Trade Entry (OTE)', 'Kill Zones', 'Session de Londres', 'Session de New York', 'Biais journalier', 'Biais hebdomadaire'] }
  ],
  SMC: [
    { g: 'Structure du marché', items: ['BOS', 'CHOCH', 'Market Structure', 'HH / HL', 'LH / LL'] },
    { g: 'Liquidité', items: ['Liquidity Sweep', 'EQH / EQL', 'Liquidité interne', 'Liquidité externe'] },
    { g: 'Zones', items: ['Order Block', 'Fair Value Gap', 'Breaker Block', 'Mitigation Block', 'Supply / Demand'] },
    { g: 'Position du prix', items: ['Premium / Discount', 'Analyse multi-timeframe'] }
  ],
  PA: [
    { g: 'Structure et tendance', items: ['Tendance haussière', 'Tendance baissière', 'Range / Consolidation', 'HH / HL', 'LH / LL'] },
    { g: 'Niveaux', items: ['Support', 'Résistance', 'S/R cassé', 'Retest', 'Breakout', 'Pullback'] },
    { g: 'Chandeliers', items: ['Pin Bar', 'Engulfing', 'Inside Bar', 'Doji', 'Rejection Candle'] },
    { g: 'Configurations', items: ['Double Top / Bottom', 'Tête et épaules', 'Triangle', 'Drapeau', 'Figure de retournement'] },
    { g: 'Confirmation', items: ['Confirmation multi-timeframe', 'Volume', 'Ratio R/R acceptable'] }
  ]
};
const ASSETS = ['XAUUSD', 'XAGUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'BTCUSD', 'Autre'];
const SESSIONS = ['Asie', 'Londres', 'New York', 'Londres–New York', 'Autre'];
const TFS = ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1', 'W1'];
const BIAS = ['Non déterminé', 'Haussier', 'Baissier', 'Neutre', 'Mixte'];
const BIAS_DXY = ['Non vérifié', 'Haussier', 'Baissier', 'Neutre', 'Mixte'];
const YIELDS = ['Non vérifiés', 'En hausse', 'En baisse', 'Mixtes'];
const NEWS = ['Aucune annonce identifiée', 'CPI / Core CPI', 'PCE / Core PCE', 'NFP', 'Taux de chômage', 'Salaires', 'FOMC', 'Discours de la Fed',
  'ISM manufacturier', 'ISM services', 'PMI', 'PIB', 'JOLTS', 'Plusieurs annonces'];
const NEWS_RES = ['Non vérifiées', 'Plus fortes que prévu', 'Plus faibles que prévu', 'Conformes aux prévisions', 'Contradictoires'];
const MISTAKES = ['Aucune', 'Entrée trop tôt', 'Entrée tardive', 'Stop déplacé', 'Sortie prématurée', 'Risque trop élevé', 'Contre la tendance', 'Autre'];
const RESULTS = [
  { v: 'En attente', cls: '' }, { v: 'Gain', cls: 'res-gain' }, { v: 'Perte', cls: 'res-loss' },
  { v: 'BE', cls: 'res-flat', t: 'Break-even' }, { v: 'Annulé', cls: '' }
];

let trades = [];
try {
  const savedTrades = localStorage.getItem('jtr-trades');
  if (savedTrades) trades = JSON.parse(savedTrades);
} catch (e) {}

function saveTrades() {
  try {
    localStorage.setItem('jtr-trades', JSON.stringify(trades));
  } catch (e) {}
}

let nextId = trades.length ? Math.max(...trades.map(t => t.id)) + 1 : 1;
let period = 'Tout';
let hFilter = { strat: 'Tous', res: 'Tous' };
let editingId = null;
let current = 'home';
let acct = 'reel';
const deviceTz = Math.round(-new Date().getTimezoneOffset() / 60);
const defaultSessions = () => [{ name: 'Asie', s: 0, e: 9 }, { name: 'Londres', s: 7, e: 16 }, { name: 'New York', s: 12, e: 21 }];
const cfg = { inputTz: deviceTz, viewTz: deviceTz, minTrades: 5, sessions: defaultSessions(), assets: [], bandMode: '1', bandCustom: '0, 8, 13, 22' };
const OTHER = 'Autre / hors session';
const NEW_ASSET = '+ Nouvel actif…';
const defaultFilters = () => ({ period: 'all', from: '', to: '', asset: 'Tous', strat: 'Tous', session: 'Tous', hour: 'Tous', dow: 'Tous', result: 'Tous' });
let F = defaultFilters();
let aView = 'sum', aInd = 'net', mDim = 'session', xDims = ['strat', 'asset', 'session'], xSort = 'net', xMin = null;

const DEMO = [
  [34,'XAUUSD','Londres','ICT','SELL','Gain',2.1,1,'Fair Value Gap (FVG)',['Displacement','Kill Zones'],true],
  [31,'XAUUSD','New York','SMC','BUY','Perte',-1,1,'Order Block',['CHOCH'],true],
  [29,'XAUUSD','Londres','PA','BUY','Gain',1.5,1,'Retest',['Support','Pin Bar'],true],
  [27,'XAUUSD','Londres–New York','ICT','BUY','Perte',-1,1,'Order Block',['Displacement'],false],
  [24,'EURUSD','Londres','SMC','SELL','Gain',2.8,1,'CHOCH',['Liquidity Sweep','Premium / Discount'],true],
  [22,'XAUUSD','New York','PA','SELL','BE',0,1,'Breakout',['Résistance'],true],
  [20,'XAUUSD','Londres','ICT','BUY','Gain',3,1,'Market Structure Shift (MSS)',['Fair Value Gap (FVG)','Displacement'],true],
  [17,'XAUUSD','Asie','SMC','BUY','Perte',-1,0.5,'BOS',['BOS','Supply / Demand'],false],
  [15,'GBPUSD','Londres','PA','SELL','Perte',-1,1,'Pullback',['Tendance baissière'],true],
  [13,'XAUUSD','New York','ICT','SELL','Gain',1.8,1,'Liquidity Sweep',['Buy-Side Liquidity (BSL)'],true],
  [10,'XAUUSD','Londres','SMC','BUY','Gain',2.2,1,'Order Block',['Liquidité interne','Fair Value Gap'],true],
  [8,'XAUUSD','Londres–New York','PA','BUY','Gain',2,1,'Engulfing',['Support','Confirmation multi-timeframe'],true],
  [6,'XAUUSD','Londres','ICT','SELL','Perte',-1,1,'Fair Value Gap (FVG)',['Judas Swing'],false],
  [4,'XAUUSD','New York','SMC','SELL','Gain',1.6,1,'Fair Value Gap',['BOS','Supply / Demand'],true],
  [2,'BTCUSD','Autre','PA','BUY','Perte',-1,1,'Breakout',['Volume'],true],
  [1,'XAUUSD','Londres','ICT','BUY','Gain',2.4,1,'Optimal Trade Entry (OTE)',['Displacement','Kill Zones'],true],
  [0,'XAUUSD','New York','ICT','SELL','En attente',null,1,'Order Block',['Session de New York'],true]
];
const DEMO_BT = [
  [220,'XAUUSD','Londres','ICT','BUY','Gain',2.5,1,'Fair Value Gap (FVG)',['Displacement','Kill Zones'],true],
  [218,'XAUUSD','New York','ICT','SELL','Perte',-1,1,'Order Block',['Displacement'],true],
  [214,'XAUUSD','Londres','SMC','BUY','Gain',3.1,1,'CHOCH',['BOS','Supply / Demand'],true],
  [211,'XAUUSD','Asie','SMC','SELL','Perte',-1,1,'BOS',['BOS','Supply / Demand'],true],
  [207,'XAUUSD','Londres','PA','BUY','Gain',1.8,1,'Breakout',['Retest','Support'],true],
  [203,'XAUUSD','New York','PA','SELL','Perte',-1,1,'Pullback',['Résistance'],true],
  [199,'XAUUSD','Londres','ICT','SELL','Gain',2.2,1,'Liquidity Sweep',['Displacement','Kill Zones'],true],
  [195,'XAUUSD','Londres–New York','SMC','BUY','BE',0,1,'Order Block',['Liquidité interne'],true],
  [191,'XAUUSD','Londres','PA','BUY','Gain',2.6,1,'Retest',['Support'],true],
  [188,'XAUUSD','New York','ICT','BUY','Gain',1.9,1,'Optimal Trade Entry (OTE)',['Displacement','Kill Zones'],true]
];
function demoTime(session, i) {
  if (i % 6 === 5) return '';
  const baseMap = { 'Asie': 2, 'Londres': 8, 'Londres–New York': 13, 'New York': 14, 'Autre': 21 };
  const base = baseMap[session] !== undefined ? baseMap[session] : 10;
  const h = (base + (i * 5) % 4 + deviceTz + 24) % 24;
  return `${pad(h)}:${pad((i * 17) % 60)}`;
}
function seedDemo() {
  if (trades.length > 0) return; // Ne charge les exemples que si aucun trade n'existe
  trades = trades.filter(t => !t.demo);
  const add = (a, extra) => ([off, asset, session, strat, dir, result, r, risk, setup, concepts, plan], idx) => {
    const time = demoTime(session, idx + (a === 'backtest' ? 3 : 0));
    trades.push({ id: nextId++, acct: a, date: daysAgo(off), time, tz: time ? deviceTz * 60 : null, asset, session, strat, dir, result, r, risk, setup, concepts, plan, demo: true, full: false, shots: [], ...extra });
  };
  DEMO.forEach(add('reel', {}));
  DEMO_BT.forEach(add('backtest', { btPeriod: 'XAUUSD, test 2025' }));
  saveTrades();
}

const isDone = t => ['Gain', 'Perte', 'BE'].includes(t.result) && typeof t.r === 'number';
const DOW = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const DOW_SHORT = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const DOW_ORDER = [1, 2, 3, 4, 5, 6, 0];
const tzName = h => 'UTC' + (h >= 0 ? '+' : '−') + Math.abs(h);
const toView = h => (((h + cfg.viewTz) % 24) + 24) % 24;
const fromView = h => (((h - cfg.viewTz) % 24) + 24) % 24;
const validDate = t => /^\d{4}-\d{2}-\d{2}$/.test(t.date || '');
const hasTime = t => /^\d{2}:\d{2}$/.test(t.time || '') && typeof t.tz === 'number';
function tsOf(t) {
  if (!validDate(t)) return 0;
  const [y, m, d] = t.date.split('-').map(Number);
  if (hasTime(t)) { const [H, M] = t.time.split(':').map(Number); return Date.UTC(y, m - 1, d, H, M) - t.tz * 60000; }
  return Date.UTC(y, m - 1, d);
}
const chrono = (a, b) => tsOf(a) - tsOf(b) || a.id - b.id;
function locate(t) {
  if (!validDate(t)) return { hour: null, dow: null, date: '' };
  const [y, m, d] = t.date.split('-').map(Number);
  if (!hasTime(t)) return { hour: null, dow: new Date(Date.UTC(y, m - 1, d)).getUTCDay(), date: t.date };
  const dt = new Date(tsOf(t) + cfg.viewTz * 3600000);
  return { hour: dt.getUTCHours(), dow: dt.getUTCDay(), date: `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}` };
}
const inRange = (h, s, e) => s === e ? false : s < e ? (h >= s && h < e) : (h >= s || h < e);
function sessionOf(t) {
  const hr = locate(t).hour;
  if (hr != null) {
    const u = (((hr - cfg.viewTz) % 24) + 24) % 24;
    const hits = cfg.sessions.filter(x => inRange(u, x.s, x.e));
    if (!hits.length) return OTHER;
    hits.sort((a, b) => ((u - a.s + 24) % 24) - ((u - b.s + 24) % 24));
    return hits[0].name;
  }
  return ['Asie', 'Londres', 'New York'].includes(t.session) ? t.session : OTHER;
}
function customBounds() {
  const b = [...new Set(String(cfg.bandCustom).split(/[\s,;]+/).filter(Boolean).map(Number).filter(x => Number.isInteger(x) && x >= 0 && x <= 23))].sort((a, c) => a - c);
  return b.length >= 2 ? b : null;
}
function boundaries() {
  if (cfg.bandMode === 'custom') { const c = customBounds(); if (c) return c; }
  const size = Number(cfg.bandMode) || 1, b = [];
  for (let h = 0; h < 24; h += size) b.push(h);
  return b;
}
function bandsList() {
  const b = boundaries();
  return b.map((s, i) => {
    const e = i + 1 < b.length ? b[i + 1] : b[0] + 24;
    return { s, e, label: e - s === 1 ? `${pad(s)} h` : `${pad(s)} h–${pad(e % 24)} h` };
  });
}
const inBand = (hr, b) => ((hr - b.s + 24) % 24) < (b.e - b.s);

function calc(list) {
  const done = list.filter(isDone).sort(chrono);
  const n = done.length;
  const wins = done.filter(t => t.result === 'Gain');
  const losses = done.filter(t => t.result === 'Perte');
  const be = done.filter(t => t.result === 'BE');
  const total = done.reduce((s, t) => s + t.r, 0);
  const gSum = done.filter(t => t.r > 0).reduce((s, t) => s + t.r, 0);
  const lSum = Math.abs(done.filter(t => t.r < 0).reduce((s, t) => s + t.r, 0));
  let cum = 0, peak = 0, dd = 0, ws = 0, ls = 0, maxWS = 0, maxLS = 0;
  const curve = [0], ddCurve = [0];
  done.forEach(t => {
    cum += t.r; curve.push(cum); peak = Math.max(peak, cum); dd = Math.max(dd, peak - cum); ddCurve.push(cum - peak);
    if (t.result === 'Gain') { ws++; ls = 0; } else if (t.result === 'Perte') { ls++; ws = 0; } else { ws = 0; ls = 0; }
    maxWS = Math.max(maxWS, ws); maxLS = Math.max(maxLS, ls);
  });
  return {
    done, n, wins: wins.length, losses: losses.length, be: be.length, total, grossWin: gSum, grossLoss: lSum,
    winRate: n ? wins.length / n * 100 : null,
    expectancy: n ? total / n : null,
    pf: n === 0 ? null : lSum === 0 ? (gSum > 0 ? Infinity : null) : gSum / lSum,
    dd: n ? dd : null,
    avgWin: wins.length ? wins.reduce((s, t) => s + t.r, 0) / wins.length : null,
    avgLoss: losses.length ? losses.reduce((s, t) => s + t.r, 0) / losses.length : null,
    best: n ? Math.max(...done.map(t => t.r)) : null,
    worst: n ? Math.min(...done.map(t => t.r)) : null,
    maxWS, maxLS, curve, ddCurve, pending: list.filter(t => t.result === 'En attente').length
  };
}
function applyFilters(list, f) {
  const ref = refISO();
  return list.filter(t => {
    const d = t.date || '';
    if (f.period === 'today' && d !== ref) return false;
    if (f.period === '7d' && !(d >= shiftISO(ref, 6) && d <= ref)) return false;
    if (f.period === '30d' && !(d >= shiftISO(ref, 29) && d <= ref)) return false;
    if (f.period === 'month' && d.slice(0, 7) !== ref.slice(0, 7)) return false;
    if (f.period === 'year' && d.slice(0, 4) !== ref.slice(0, 4)) return false;
    if (f.period === 'custom') { if (f.from && d < f.from) return false; if (f.to && d > f.to) return false; }
    if (f.asset !== 'Tous' && t.asset !== f.asset) return false;
    if (f.strat !== 'Tous' && t.strat !== f.strat) return false;
    if (f.result !== 'Tous' && t.result !== f.result) return false;
    if (f.session !== 'Tous' && sessionOf(t) !== f.session) return false;
    const loc = locate(t);
    if (f.dow !== 'Tous' && loc.dow !== Number(f.dow)) return false;
    if (f.hour !== 'Tous') {
      if (f.hour === 'none') { if (loc.hour != null) return false; }
      else if (loc.hour == null) return false;
      else if (f.hour.startsWith('h:')) { if (loc.hour !== Number(f.hour.slice(2))) return false; }
      else if (f.hour.startsWith('b:')) { const [a, b] = f.hour.slice(2).split('-').map(Number); if (!inBand(loc.hour, { s: a, e: b })) return false; }
    }
    return true;
  });
}
const DIMS = {
  strat: { label: 'Méthode', val: t => STRATS[t.strat].label },
  asset: { label: 'Actif', val: t => t.asset },
  session: { label: 'Session', val: t => sessionOf(t) },
  dow: { label: 'Jour', val: t => { const d = locate(t).dow; return d == null ? null : DOW[d]; } },
  hour: { label: 'Tranche horaire', val: t => { const hr = locate(t).hour; if (hr == null) return null; const b = bandsList().find(x => inBand(hr, x)); return b ? b.label : null; } }
};
const INDS = {
  net: { t: 'Résultat net', val: s => s.total, fmt: v => fmtR(v, 1) + ' R', signed: true },
  wr: { t: 'Réussite', val: s => s.winRate, fmt: v => Math.round(v) + ' %', signed: false, max: 100 },
  pf: { t: 'Profit factor', val: s => s.pf, fmt: v => fmtPF(v), signed: false },
  exp: { t: 'Espérance', val: s => s.expectancy, fmt: v => fmtR(v, 2) + ' R', signed: true }
};
const cellOf = (ind, s) => { if (!s.n) return '—'; const v = ind.val(s); return v == null ? '—' : ind.fmt(v); };
function crossGroups(done, dims) {
  const groups = {}; let excluded = 0;
  done.forEach(t => {
    const parts = dims.map(d => DIMS[d].val(t));
    if (parts.some(p => p == null)) { excluded++; return; }
    const k = parts.join(', ');
    (groups[k] = groups[k] || []).push(t);
  });
  return { groups, excluded };
}
const mine = () => trades.filter(t => t.acct === acct);
function shiftISO(str, n) { const [y, m, d] = str.split('-').map(Number); const dt = new Date(y, m - 1, d); dt.setDate(dt.getDate() - n); return iso(dt); }
function refISO() {
  if (acct === 'reel') return iso(today);
  const ds = mine().map(t => t.date).sort();
  return ds.length ? ds[ds.length - 1] : iso(today);
}
function inPeriod(t, p) {
  const ref = refISO();
  if (p === 'Tout') return true;
  if (p === 'Jour') return t.date === ref;
  if (p === 'Semaine') return t.date >= shiftISO(ref, 6) && t.date <= ref;
  if (p === 'Mois') return t.date.slice(0, 7) === ref.slice(0, 7);
  return true;
}
const resClass = t => t.result === 'Gain' ? 'gain' : t.result === 'Perte' ? 'loss' : t.result === 'BE' ? 'flat' : 'pending';
const signClass = v => v == null ? '' : v > 0 ? 'g' : v < 0 ? 'l' : 'f';
let themeMode = 'auto';
function readTheme() {
  try { const v = localStorage.getItem('jtr-theme'); return (v === 'light' || v === 'dark') ? v : 'auto'; } catch (e) { return 'auto'; }
}
function applyTheme() {
  const eff = themeMode === 'auto' ? (typeof window.jtrSystemDark === 'boolean' ? (window.jtrSystemDark ? 'dark' : 'light') : null) : themeMode;
  const r = document.documentElement;
  if (eff) r.setAttribute('data-theme', eff); else r.removeAttribute('data-theme');
}
function setTheme(v) {
  themeMode = v;
  try { if (v === 'auto') localStorage.removeItem('jtr-theme'); else localStorage.setItem('jtr-theme', v); } catch (e) {}
  applyTheme();
}
window.__JTR_P1 = true;
r d'un trade dans le fuseau d'analyse. Sans heure saisie, l'heure reste inconnue (jamais inventée). */
function locate(t) {
  if (!validDate(t)) return { hour: null, dow: null, date: '' };
  const [y, m, d] = t.date.split('-').map(Number);
  if (!hasTime(t)) return { hour: null, dow: new Date(Date.UTC(y, m - 1, d)).getUTCDay(), date: t.date };
  const dt = new Date(tsOf(t) + cfg.viewTz * 3600000);
  return { hour: dt.getUTCHours(), dow: dt.getUTCDay(), date: `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}` };
}
const inRange = (h, s, e) => s === e ? false : s < e ? (h >= s && h < e) : (h >= s || h < e);
const sessionNames = () => [...cfg.sessions.map(x => x.name), OTHER];
/* Session déduite de l'heure si elle est connue ; sinon la session choisie à la main. En cas de chevauchement, la session ouverte le plus récemment l'emporte. */
function sessionOf(t) {
  const hr = locate(t).hour;
  if (hr != null) {
    const u = (((hr - cfg.viewTz) % 24) + 24) % 24;
    const hits = cfg.sessions.filter(x => inRange(u, x.s, x.e));
    if (!hits.length) return OTHER;
    hits.sort((a, b) => ((u - a.s + 24) % 24) - ((u - b.s + 24) % 24));
    return hits[0].name;
  }
  return ['Asie', 'Londres', 'New York'].includes(t.session) ? t.session : OTHER;
}
/* Tranches horaires */
function customBounds() {
  const b = [...new Set(String(cfg.bandCustom).split(/[\s,;]+/).filter(Boolean).map(Number).filter(x => Number.isInteger(x) && x >= 0 && x <= 23))].sort((a, c) => a - c);
  return b.length >= 2 ? b : null;
}
function boundaries() {
  if (cfg.bandMode === 'custom') { const c = customBounds(); if (c) return c; }
  const size = Number(cfg.bandMode) || 1, b = [];
  for (let h = 0; h < 24; h += size) b.push(h);
  return b;
}
function bandsList() {
  const b = boundaries();
  return b.map((s, i) => {
    const e = i + 1 < b.length ? b[i + 1] : b[0] + 24;
    return { s, e, label: e - s === 1 ? `${pad(s)} h` : `${pad(s)} h–${pad(e % 24)} h` };
  });
}
const inBand = (hr, b) => ((hr - b.s + 24) % 24) < (b.e - b.s);

/* Calculs : tout est exprimé en R. Seuls les trades terminés (gain, perte, break-even) comptent. */
function calc(list) {
  const done = list.filter(isDone).sort(chrono);
  const n = done.length;
  const wins = done.filter(t => t.result === 'Gain');
  const losses = done.filter(t => t.result === 'Perte');
  const be = done.filter(t => t.result === 'BE');
  const total = done.reduce((s, t) => s + t.r, 0);
  const gSum = done.filter(t => t.r > 0).reduce((s, t) => s + t.r, 0);
  const lSum = Math.abs(done.filter(t => t.r < 0).reduce((s, t) => s + t.r, 0));
  let cum = 0, peak = 0, dd = 0, ws = 0, ls = 0, maxWS = 0, maxLS = 0;
  const curve = [0], ddCurve = [0];
  done.forEach(t => {
    cum += t.r; curve.push(cum); peak = Math.max(peak, cum); dd = Math.max(dd, peak - cum); ddCurve.push(cum - peak);
    if (t.result === 'Gain') { ws++; ls = 0; } else if (t.result === 'Perte') { ls++; ws = 0; } else { ws = 0; ls = 0; }
    maxWS = Math.max(maxWS, ws); maxLS = Math.max(maxLS, ls);
  });
  return {
    done, n, wins: wins.length, losses: losses.length, be: be.length, total, grossWin: gSum, grossLoss: lSum,
    winRate: n ? wins.length / n * 100 : null,
    expectancy: n ? total / n : null,
    pf: n === 0 ? null : lSum === 0 ? (gSum > 0 ? Infinity : null) : gSum / lSum,
    dd: n ? dd : null,
    avgWin: wins.length ? wins.reduce((s, t) => s + t.r, 0) / wins.length : null,
    avgLoss: losses.length ? losses.reduce((s, t) => s + t.r, 0) / losses.length : null,
    best: n ? Math.max(...done.map(t => t.r)) : null,
    worst: n ? Math.min(...done.map(t => t.r)) : null,
    maxWS, maxLS, curve, ddCurve, pending: list.filter(t => t.result === 'En attente').length
  };
}
/* Filtres combinables : tous les tableaux et graphiques partent de cette même liste filtrée. */
function applyFilters(list, f) {
  const ref = refISO();
  return list.filter(t => {
    const d = t.date || '';
    if (f.period === 'today' && d !== ref) return false;
    if (f.period === '7d' && !(d >= shiftISO(ref, 6) && d <= ref)) return false;
    if (f.period === '30d' && !(d >= shiftISO(ref, 29) && d <= ref)) return false;
    if (f.period === 'month' && d.slice(0, 7) !== ref.slice(0, 7)) return false;
    if (f.period === 'year' && d.slice(0, 4) !== ref.slice(0, 4)) return false;
    if (f.period === 'custom') { if (f.from && d < f.from) return false; if (f.to && d > f.to) return false; }
    if (f.asset !== 'Tous' && t.asset !== f.asset) return false;
    if (f.strat !== 'Tous' && t.strat !== f.strat) return false;
    if (f.result !== 'Tous' && t.result !== f.result) return false;
    if (f.session !== 'Tous' && sessionOf(t) !== f.session) return false;
    const loc = locate(t);
    if (f.dow !== 'Tous' && loc.dow !== Number(f.dow)) return false;
    if (f.hour !== 'Tous') {
      if (f.hour === 'none') { if (loc.hour != null) return false; }
      else if (loc.hour == null) return false;
      else if (f.hour.startsWith('h:')) { if (loc.hour !== Number(f.hour.slice(2))) return false; }
      else if (f.hour.startsWith('b:')) { const [a, b] = f.hour.slice(2).split('-').map(Number); if (!inBand(loc.hour, { s: a, e: b })) return false; }
    }
    return true;
  });
}
const DIMS = {
  strat: { label: 'Méthode', val: t => STRATS[t.strat].label },
  asset: { label: 'Actif', val: t => t.asset },
  session: { label: 'Session', val: t => sessionOf(t) },
  dow: { label: 'Jour', val: t => { const d = locate(t).dow; return d == null ? null : DOW[d]; } },
  hour: { label: 'Tranche horaire', val: t => { const hr = locate(t).hour; if (hr == null) return null; const b = bandsList().find(x => inBand(hr, x)); return b ? b.label : null; } }
};
const INDS = {
  net: { t: 'Résultat net', val: s => s.total, fmt: v => fmtR(v, 1) + ' R', signed: true },
  wr: { t: 'Réussite', val: s => s.winRate, fmt: v => Math.round(v) + ' %', signed: false, max: 100 },
  pf: { t: 'Profit factor', val: s => s.pf, fmt: v => fmtPF(v), signed: false },
  exp: { t: 'Espérance', val: s => s.expectancy, fmt: v => fmtR(v, 2) + ' R', signed: true }
};
const cellOf = (ind, s) => { if (!s.n) return '—'; const v = ind.val(s); return v == null ? '—' : ind.fmt(v); };
/* Croisement de conditions : les trades dont une dimension est inconnue sont comptés comme exclus, jamais devinés. */
function crossGroups(done, dims) {
  const groups = {}; let excluded = 0;
  done.forEach(t => {
    const parts = dims.map(d => DIMS[d].val(t));
    if (parts.some(p => p == null)) { excluded++; return; }
    const k = parts.join(', ');
    (groups[k] = groups[k] || []).push(t);
  });
  return { groups, excluded };
}
const mine = () => trades.filter(t => t.acct === acct);
function shiftISO(str, n) { const [y, m, d] = str.split('-').map(Number); const dt = new Date(y, m - 1, d); dt.setDate(dt.getDate() - n); return iso(dt); }
function refISO() {
  if (acct === 'reel') return iso(today);
  const ds = mine().map(t => t.date).sort();
  return ds.length ? ds[ds.length - 1] : iso(today);
}
function inPeriod(t, p) {
  const ref = refISO();
  if (p === 'Tout') return true;
  if (p === 'Jour') return t.date === ref;
  if (p === 'Semaine') return t.date >= shiftISO(ref, 6) && t.date <= ref;
  if (p === 'Mois') return t.date.slice(0, 7) === ref.slice(0, 7);
  return true;
}
const resClass = t => t.result === 'Gain' ? 'gain' : t.result === 'Perte' ? 'loss' : t.result === 'BE' ? 'flat' : 'pending';
const signClass = v => v == null ? '' : v > 0 ? 'g' : v < 0 ? 'l' : 'f';
/* Thème : automatique, clair ou sombre (choix gardé dans le stockage de la page) */
let themeMode = 'auto';
function readTheme() {
  try { const v = localStorage.getItem('jtr-theme'); return (v === 'light' || v === 'dark') ? v : 'auto'; } catch (e) { return 'auto'; }
}
function applyTheme() {
  const eff = themeMode === 'auto' ? (typeof window.jtrSystemDark === 'boolean' ? (window.jtrSystemDark ? 'dark' : 'light') : null) : themeMode;
  const r = document.documentElement;
  if (eff) r.setAttribute('data-theme', eff); else r.removeAttribute('data-theme');
}
function setTheme(v) {
  themeMode = v;
  try { if (v === 'auto') localStorage.removeItem('jtr-theme'); else localStorage.setItem('jtr-theme', v); } catch (e) {}
  applyTheme();
}
window.__JTR_P1 = true;
