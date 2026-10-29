/* Journaux fondamentaux et comportement du marché, rapports mensuels et annuels. */
(function () {
  const J = window.__JTR_JOURNAL || { fundamental: [], market: [] };
  if (!Array.isArray(J.fundamental)) J.fundamental = [];
  if (!Array.isArray(J.market)) J.market = [];
  window.__JTR_JOURNAL = J;
  let journalMonth = new Date().toISOString().slice(0, 7);
  let marketMode = 'day', reportMode = 'month';
  let announcementsOpen = false, fundamentalOpen = false, marketOpen = false, importanceFilter = 'all';
  let reportMonth = journalMonth, reportYear = String(new Date().getFullYear());
  const safe = v => esc(String(v == null ? '' : v));
  const newId = () => 'j' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const validMonth = v => /^\d{4}-\d{2}$/.test(v || '') ? v : new Date().toISOString().slice(0, 7);
  const validDate = v => /^\d{4}-\d{2}-\d{2}$/.test(v || '') ? v : new Date().toISOString().slice(0, 10);
  const monthData = (ym, create) => {
    let m = J.fundamental.find(x => x.month === ym);
    if (!m && create) { m = { month: ym, entries: [], bias: '', notes: '' }; J.fundamental.push(m); }
    if (m) { if (!Array.isArray(m.entries)) m.entries = []; if (typeof m.notes !== 'string') m.notes = ''; }
    return m;
  };
  const effect = v => ({favorable:'Favorable à l’or',unfavorable:'Défavorable à l’or',neutral:'Neutre',mixed:'Contradictoire'}[v] || 'Non évalué');
  const behavior = v => ({bull:'Tendance haussière',bear:'Tendance baissière',range:'Range / consolidation',reversal:'Retournement',breakout:'Cassure',volatile:'Volatilité élevée',other:'Autre'}[v] || v || 'Non précisé');
  function paintJournals() {
    const host = document.getElementById('journalSlots'); if (!host) return;
    const m = monthData(journalMonth, false) || {entries:[],bias:'',notes:''};
    const entries = m.entries.slice().sort((a,b)=>(a.date||'').localeCompare(b.date||''));
    const filtered = entries.filter(x => importanceFilter === 'all' || (x.importance || 'medium') === importanceFilter);
    const effectClass = v => v === 'favorable' ? 'ann-good' : v === 'unfavorable' ? 'ann-bad' : v === 'mixed' ? 'ann-mixed' : 'ann-neutral';
    const importanceLabel = v => ({high:'Élevée',medium:'Moyenne',low:'Faible'}[v] || 'Moyenne');
    const entryHtml = filtered.length ? `<div class="ann-scroll"><table class="ann-table"><thead><tr><th>Date / annonce</th><th>Réel</th><th>Prévu</th><th>Forecast<br>(facultatif)</th><th>Importance</th><th>Effet sur l’or</th><th></th></tr></thead><tbody>${filtered.map(x => `<tr class="${effectClass(x.effect)}"><td><b>${safe(x.name)}</b><small>${safe(x.date||'')}</small></td><td>${safe(x.actual||'—')}</td><td>${safe(x.forecast||'—')}</td><td>${safe(x.consensus||'—')}</td><td><span class="ann-importance imp-${safe(x.importance||'medium')}">${safe(importanceLabel(x.importance))}</span></td><td>${x.effect==='mixed'?'<b>Contradictoire</b>':safe(effect(x.effect))}</td><td><button class="link" data-jdel-f="${safe(x.id)}">×</button></td></tr>${x.note?`<tr class="ann-note-row"><td colspan="7">${safe(x.note)}</td></tr>`:''}`).join('')}</tbody></table></div>` : `<p class="note">${entries.length ? 'Aucune annonce ne correspond à ce filtre.' : 'Aucune annonce saisie pour ce mois.'}</p>`;
    const observations = J.market.filter(x => (x.mode||'day')===marketMode && (x.date||'').slice(0,7)===journalMonth).sort((a,b)=>(a.date||'').localeCompare(b.date||'')||(a.time||'').localeCompare(b.time||''));
    host.innerHTML = `<style>
      .jtoggle{display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;text-align:left;padding:12px 0;font-weight:750;font-size:16px}
      .jtoggle span:last-child{color:var(--blue);font-size:13px;white-space:nowrap}
      .jpanel[hidden]{display:none!important}.ann-scroll{overflow-x:auto;max-width:100%;border-radius:12px;border:1px solid var(--line);margin-top:10px}
      .ann-table{border-collapse:collapse;width:100%;min-width:610px;font-size:12.5px;background:var(--surface)}.ann-table th,.ann-table td{padding:9px 10px;text-align:left;border-bottom:1px solid var(--line);white-space:nowrap}.ann-table th{color:var(--muted);font-size:11px;background:var(--surface2)}.ann-table td small{display:block;color:var(--muted);font-size:10.5px;margin-top:3px}.ann-table tr:last-child td{border-bottom:0}.ann-table .ann-good:not(.ann-note-row){background:rgba(var(--gain-rgb),.16)}.ann-table .ann-bad:not(.ann-note-row){background:rgba(var(--loss-rgb),.16)}.ann-table .ann-neutral,.ann-table .ann-mixed{background:transparent}.ann-table .ann-note-row td{white-space:normal;color:var(--muted);font-size:12px;background:var(--surface2)}.ann-importance{display:inline-block;border-radius:8px;padding:3px 7px;font-size:11px;font-weight:700}.imp-high{background:rgba(var(--loss-rgb),.18);color:var(--loss)}.imp-medium{background:rgba(230,160,30,.16);color:#B77908}.imp-low{background:var(--surface2);color:var(--muted)}
    </style>
    <section class="card" style="margin-top:14px"><div class="field" style="margin:0"><label for="j-month">Mois analysé pour les journaux</label><input id="j-month" type="month" value="${safe(journalMonth)}"></div></section>
    <section class="card" style="margin-top:10px;padding-top:4px"><button class="jtoggle" data-jtoggle-announcements><span>📅 Annonces économiques</span><span>${announcementsOpen?'Masquer ▲':'Afficher ▼'}</span></button><div class="jpanel" id="j-announcements-body" ${announcementsOpen?'':'hidden'}>
      <h3>Ajouter une annonce</h3><div class="field"><label for="j-fdate">Date</label><input id="j-fdate" type="date" value="${safe(journalMonth+'-01')}"></div>
      <div class="field"><label for="j-fname">Annonce</label><input id="j-fname" maxlength="80" placeholder="CPI, Core CPI, NFP, PCE, FOMC…"></div>
      <div class="two"><div class="field"><label for="j-actual">Réel</label><input id="j-actual" placeholder="ex. 3,3 %"></div><div class="field"><label for="j-forecast">Prévu</label><input id="j-forecast" placeholder="ex. 3,1 %"></div></div>
      <div class="field"><label for="j-consensus">Forecast supplémentaire (facultatif)</label><input id="j-consensus" placeholder="Valeur facultative"></div>
      <div class="two"><div class="field"><label for="j-importance">Niveau d’importance</label><select id="j-importance"><option value="high">Élevée</option><option value="medium" selected>Moyenne</option><option value="low">Faible</option></select></div><div class="field"><label for="j-effect">Effet sur l’or</label><select id="j-effect"><option value="neutral">Neutre</option><option value="favorable">Favorable</option><option value="unfavorable">Défavorable</option><option value="mixed">Contradictoire</option></select></div></div>
      <div class="field"><label for="j-fnote">Note facultative</label><textarea id="j-fnote" placeholder="Ton interprétation de l’annonce…"></textarea></div><button class="primary press" style="padding:12px" data-jsave-f>Ajouter l’annonce</button>
      <div class="field" style="margin-top:16px"><label for="j-importance-filter">Filtrer par importance</label><select id="j-importance-filter"><option value="all" ${importanceFilter==='all'?'selected':''}>Tous les niveaux</option><option value="high" ${importanceFilter==='high'?'selected':''}>Élevée</option><option value="medium" ${importanceFilter==='medium'?'selected':''}>Moyenne</option><option value="low" ${importanceFilter==='low'?'selected':''}>Faible</option></select></div>
      <h3>Annonces de ${safe(journalMonth)}</h3>${entryHtml}</div></section>
    <section class="card" style="margin-top:10px;padding-top:4px"><button class="jtoggle" data-jtoggle-fundamental><span>🧭 Journal fondamental</span><span>${fundamentalOpen?'Masquer ▲':'Afficher ▼'}</span></button><div class="jpanel" id="j-fundamental-body" ${fundamentalOpen?'':'hidden'}>
      <div class="field"><label>Biais fondamental — modifiable à tout moment</label><div class="chips">${[['bullish','Bullish'],['bearish','Bearish'],['neutral','Neutre']].map(([v,t])=>`<button class="chip press ${m.bias===v?'on':''}" data-jbias="${v}">${t}</button>`).join('')}</div></div>
      <div class="field"><label for="j-fnotes">Notes de l’analyse fondamentale</label><textarea id="j-fnotes" placeholder="Dollar, inflation, Fed, annonces contradictoires…">${safe(m.notes)}</textarea><button class="primary press" style="margin-top:8px;padding:12px" data-jsave-notes>Enregistrer le biais et les notes</button></div>
      <p class="note">Ces notes et le biais sont enregistrés pour le mois sélectionné.</p></div></section>
    <section class="card" style="margin-top:10px;padding-top:4px"><button class="jtoggle" data-jtoggle-market><span>📈 Comportement du marché</span><span>${marketOpen?'Masquer ▲':'Afficher ▼'}</span></button><div class="jpanel" id="j-market-body" ${marketOpen?'':'hidden'}>
      <div class="chips" style="margin:10px 0">${[['day','Jour'],['week','Semaine']].map(([v,t])=>`<button class="chip press ${marketMode===v?'on':''}" data-jmode="${v}">${t}</button>`).join('')}</div>
      <div class="field"><label for="j-mdate">${marketMode==='week'?'Date de début de semaine':'Date observée'}</label><input id="j-mdate" type="date" value="${safe(journalMonth+'-01')}"></div>
      <div class="two"><div class="field"><label for="j-mtime">Heure (facultatif)</label><input id="j-mtime" type="time"></div><div class="field"><label for="j-behavior">Comportement</label><select id="j-behavior"><option value="bull">Tendance haussière</option><option value="bear">Tendance baissière</option><option value="range">Range / consolidation</option><option value="reversal">Retournement</option><option value="breakout">Cassure</option><option value="volatile">Volatilité élevée</option><option value="other">Autre</option></select></div></div>
      <div class="field"><label for="j-mnote">Note facultative</label><textarea id="j-mnote" placeholder="03 h tendance, 11 h range, 17 h cassure…"></textarea></div><button class="primary press" style="padding:12px" data-jsave-m>Ajouter l’observation</button>
      <h3 style="margin-top:18px">Observations du mois</h3>${observations.length?observations.map(x=>`<div class="card" style="margin-top:8px;padding:12px"><div style="display:flex;justify-content:space-between;gap:8px"><b>${safe(x.date)} ${x.time?'· '+safe(x.time):''}</b><button class="link" data-jdel-m="${safe(x.id)}">Supprimer</button></div><div style="margin-top:5px">${safe(behavior(x.behavior))}</div>${x.note?`<p style="margin:6px 0 0">${safe(x.note)}</p>`:''}</div>`).join(''):'<p class="note">Aucune observation pour ce mois dans ce mode.</p>'}</div><p class="note">Saisie manuelle, enregistrée sur le téléphone et disponible hors ligne.</p></section>`;
  }
  const dateOf = t => (typeof locate==='function' ? locate(t).date : t.date) || t.date || '';
  const reportScope = ym => mine().filter(t=>dateOf(t).slice(0,7)===ym);
  function groups(list, keyOf) { const g={}; list.filter(isDone).forEach(t=>{const k=keyOf(t);if(k!=null&&k!=='')(g[k]=g[k]||[]).push(t);});return Object.keys(g).map(k=>({key:k,s:calc(g[k])})); }
  function reportStats(list,title) {
    const s=calc(list), done=list.filter(isDone);
    const hours=groups(done,t=>locate(t).hour==null?'':String(locate(t).hour).padStart(2,'0')+' h');
    const days=groups(done,t=>['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'][locate(t).dow]);
    const sessions=groups(done,t=>sessionOf(t));
    const eligible=a=>a.filter(x=>x.s.n>=2);
    const bestH=eligible(hours).slice().sort((a,b)=>b.s.total-a.s.total)[0], worstH=eligible(hours).slice().sort((a,b)=>a.s.total-b.s.total)[0];
    const bestD=eligible(days).slice().sort((a,b)=>b.s.total-a.s.total)[0], bestS=eligible(sessions).slice().sort((a,b)=>b.s.total-a.s.total)[0];
    const kpi=(l,v,sub='')=>`<div class="kpi"><b>${safe(v)}</b><span>${safe(l)}${sub?' · '+safe(sub):''}</span></div>`;
    return `<div class="card" style="margin-top:10px"><h3 style="margin:0 0 8px">${safe(title)}</h3><div class="kpis">${kpi('Trades terminés',s.n)}${kpi('Taux de réussite',s.winRate==null?'—':Math.round(s.winRate)+' %')}${kpi('Résultat net',s.n?fmtR(s.total,1)+' R':'—')}${kpi('Espérance',s.expectancy==null?'—':fmtR(s.expectancy,2)+' R')}${kpi('Profit factor',s.n?fmtPF(s.pf):'—')}${kpi('Drawdown max',s.dd==null?'—':fmtR(-s.dd,1)+' R')}${kpi('Meilleure heure',bestH?bestH.key:'—',bestH?bestH.s.n+' trades':'2 trades minimum')}${kpi('Heure la moins performante',worstH?worstH.key:'—',worstH?worstH.s.n+' trades':'2 trades minimum')}${kpi('Meilleur jour',bestD?bestD.key:'—',bestD?bestD.s.n+' trades':'2 trades minimum')}${kpi('Meilleure session',bestS?bestS.key:'—',bestS?bestS.s.n+' trades':'2 trades minimum')}</div></div>`;
  }
  function reportHTML() {
    const year=String(Math.max(2000,Math.min(2100,Number(reportYear)||new Date().getFullYear()))), ym=validMonth(reportMonth);
    let body='';
    if(reportMode==='month') {
      const list=reportScope(ym), m=monthData(ym,false);
      body=reportStats(list,'Statistiques de '+ym)+`<div class="card" style="margin-top:10px"><h3 style="margin:0 0 8px">Trades du mois (${list.length})</h3>${list.length?list.slice().sort((a,b)=>dateOf(b).localeCompare(dateOf(a))||String(b.time||'').localeCompare(String(a.time||''))).map(t=>`<div class="cardrow" style="padding:9px 0;border-bottom:1px solid var(--line)"><span><b>${safe(dateOf(t))} · ${safe(t.time||'Heure inconnue')}</b><small class="muted" style="display:block">${safe(t.asset)} · ${safe(t.dir)} · ${safe(t.session)}</small></span><b class="${signClass(isDone(t)?t.r:null)}">${isDone(t)?fmtR(t.r,1)+' R':safe(t.result)}</b></div>`).join(''):'<p class="note">Aucun trade enregistré pour ce mois.</p>'}</div>`;
      if(m&&(m.bias||m.notes)) body+=`<div class="card" style="margin-top:10px"><h3 style="margin:0 0 6px">Analyse fondamentale</h3><b>${safe(({bullish:'Bullish',bearish:'Bearish',neutral:'Neutre'}[m.bias])||'Biais non défini')}</b><p style="white-space:pre-wrap;margin:8px 0 0">${safe(m.notes||'Aucune note')}</p></div>`;
    } else {
      const list=mine().filter(t=>dateOf(t).slice(0,4)===year);
      body=reportStats(list,'Statistiques annuelles '+year);
      const monthlyPerf=Array.from({length:12},(_,i)=>{const mo=year+'-'+String(i+1).padStart(2,'0'),st=calc(reportScope(mo));return {name:MOIS[i],n:st.n,total:st.total};}).filter(x=>x.n>0);
      const bestMonth=monthlyPerf.slice().sort((a,b)=>b.total-a.total)[0], worstMonth=monthlyPerf.slice().sort((a,b)=>a.total-b.total)[0];
      body+=`<div class="card" style="margin-top:10px"><div class="kpis">${`<div class="kpi"><b>${bestMonth?safe(bestMonth.name):'—'}</b><span>Meilleur mois${bestMonth?' · '+fmtR(bestMonth.total,1)+' R':''}</span></div><div class="kpi"><b>${worstMonth?safe(worstMonth.name):'—'}</b><span>Pire mois${worstMonth?' · '+fmtR(worstMonth.total,1)+' R':''}</span></div>`}</div></div>`;
      body+=`<div class="card" style="margin-top:10px"><h3 style="margin:0 0 8px">Résultats par mois</h3>${Array.from({length:12},(_,i)=>{const mo=year+'-'+String(i+1).padStart(2,'0'),st=calc(reportScope(mo));return `<div class="cardrow" style="padding:9px 0;border-bottom:1px solid var(--line)"><span><b>${safe(MOIS[i])}</b><small class="muted" style="display:block">${st.n} trades terminés</small></span><b class="${signClass(st.n?st.total:null)}">${st.n?fmtR(st.total,1)+' R':'—'}</b></div>`;}).join('')}</div>`;
      body+=`<div class="card" style="margin-top:10px"><h3 style="margin:0 0 8px">Trades de l’année (${list.length})</h3>${list.length?list.slice().sort((a,b)=>dateOf(b).localeCompare(dateOf(a))||String(b.time||'').localeCompare(String(a.time||''))).map(t=>`<div class="cardrow" style="padding:9px 0;border-bottom:1px solid var(--line)"><span><b>${safe(dateOf(t))} · ${safe(t.time||'Heure inconnue')}</b><small class="muted" style="display:block">${safe(t.asset)} · ${safe(t.dir)} · ${safe(t.session)}</small></span><b class="${signClass(isDone(t)?t.r:null)}">${isDone(t)?fmtR(t.r,1)+' R':safe(t.result)}</b></div>`).join(''):'<p class="note">Aucun trade pour cette année.</p>'}</div>`;
    }
    return `<section class="card" style="margin-top:14px"><h2 style="margin:0 0 8px">Analyse mensuelle et annuelle</h2><div class="chips" style="margin-bottom:10px"><button class="chip press ${reportMode==='month'?'on':''}" data-jreport="month">Mois</button><button class="chip press ${reportMode==='year'?'on':''}" data-jreport="year">Année</button></div>${reportMode==='month'?`<div class="field"><label for="j-report-month">Mois à analyser</label><input id="j-report-month" type="month" value="${safe(ym)}"></div>`:`<div class="field"><label for="j-report-year">Année à analyser</label><input id="j-report-year" type="number" min="2000" max="2100" value="${safe(year)}"></div>`}${body}<p class="note">Les heures, jours et sessions ne sont mis en avant qu’à partir de 2 trades terminés. Les performances sont exprimées en R.</p></section>`;
  }
  function paintReport() { const el=document.getElementById('aBody'); if(el) el.insertAdjacentHTML('beforeend',reportHTML()); }
  function persist() { if(typeof saveAll==='function') saveAll(); }
  const originalHistory=render.history;
  render.history=function(){originalHistory();paintJournals();};
  const originalPaintStats=paintStats;
  paintStats=function(){originalPaintStats();paintReport();};
  document.addEventListener('click',e=>{
    let el=e.target.closest('[data-jbias]'); if(el){monthData(journalMonth,true).bias=el.dataset.jbias;persist();paintJournals();return;}
    if(e.target.closest('[data-jsave-notes]')){const m=monthData(journalMonth,true);m.notes=(document.getElementById('j-fnotes')||{}).value||'';persist();toast('Biais et notes enregistrés');paintJournals();return;}
    if(e.target.closest('[data-jsave-f]')){const v=id=>(document.getElementById(id)||{}).value||'',date=validDate(v('j-fdate')),name=v('j-fname').trim();if(!name){toast('Indique le nom de l’annonce');return;}monthData(date.slice(0,7),true).entries.push({id:newId(),date,name,forecast:v('j-forecast').trim(),actual:v('j-actual').trim(),consensus:v('j-consensus').trim(),importance:v('j-importance')||'medium',effect:v('j-effect')||'neutral',note:v('j-fnote').trim()});journalMonth=date.slice(0,7);persist();toast('Annonce ajoutée');paintJournals();return;}
    if(e.target.closest('[data-jtoggle-announcements]')){announcementsOpen=!announcementsOpen;paintJournals();return;}
    if(e.target.closest('[data-jtoggle-fundamental]')){fundamentalOpen=!fundamentalOpen;paintJournals();return;}
    if(e.target.closest('[data-jtoggle-market]')){marketOpen=!marketOpen;paintJournals();return;}
    el=e.target.closest('[data-jmode]');if(el){marketMode=el.dataset.jmode;paintJournals();return;}
    if(e.target.closest('[data-jsave-m]')){const v=id=>(document.getElementById(id)||{}).value||'',date=validDate(v('j-mdate'));J.market.push({id:newId(),date,mode:marketMode,time:v('j-mtime'),behavior:v('j-behavior'),note:v('j-mnote').trim()});journalMonth=date.slice(0,7);persist();toast('Observation ajoutée');paintJournals();return;}
    el=e.target.closest('[data-jdel-f]');if(el){const m=monthData(journalMonth,false);if(m)m.entries=m.entries.filter(x=>x.id!==el.dataset.jdelF);persist();paintJournals();return;}
    el=e.target.closest('[data-jdel-m]');if(el){J.market=J.market.filter(x=>x.id!==el.dataset.jdelM);persist();paintJournals();return;}
    el=e.target.closest('[data-jreport]');if(el){reportMode=el.dataset.jreport;paintStats();return;}
  });
  document.addEventListener('change',e=>{if(e.target.id==='j-month'){journalMonth=validMonth(e.target.value);paintJournals();}if(e.target.id==='j-importance-filter'){importanceFilter=e.target.value||'all';paintJournals();}if(e.target.id==='j-report-month'){reportMonth=validMonth(e.target.value);paintStats();}if(e.target.id==='j-report-year'){reportYear=String(Math.max(2000,Math.min(2100,Number(e.target.value)||new Date().getFullYear())));paintStats();}});
  window.__JTR_P6=true;
  if(typeof current!=='undefined'&&current==='history')paintJournals();
})();
