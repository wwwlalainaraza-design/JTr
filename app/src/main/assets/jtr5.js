/* ---------- Stockage et démarrage (anti-ANR) ---------- */

function jtrNative() {
  try {
    return window.JtrNative || null;
  } catch (e) {
    return null;
  }
}

function nLoad(key) {
  try {
    const n = jtrNative();
    return n && typeof n.load === 'function' ? (n.load(key) || '') : '';
  } catch (e) {
    return '';
  }
}

function nSave(key, value) {
  try {
    const n = jtrNative();
    return !!(n && typeof n.save === 'function' && n.save(key, value));
  } catch (e) {
    return false;
  }
}

function lsGet(key) {
  try {
    return localStorage.getItem(key) || '';
  } catch (e) {
    return '';
  }
}

function lsSet(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    return false;
  }
}

function warnStorage(message) {
  try {
    if (typeof toast === 'function') {
      toast(message);
    } else {
      console.warn(message);
    }
  } catch (e) {
    console.warn(message);
  }
}

/* Les données texte et les captures sont stockées séparément. */

function saveAll() {
  try {
    const keep = trades.filter(t => !t.demo);

    const light = keep.map(t => {
      const c = Object.assign({}, t);
      delete c.shots;
      return c;
    });

    const data = {
      v: 3,
      accounts: accounts,
      acct: acct,
      nextId: nextId,
      demoOff: demoOff,
      trades: light,
      remarks: remarks,
      cfg: {
        inputTz: cfg.inputTz,
        viewTz: cfg.viewTz,
        minTrades: cfg.minTrades,
        sessions: cfg.sessions,
        assets: cfg.assets,
        bandMode: cfg.bandMode,
        bandCustom: cfg.bandCustom
      }
    };

    const json = JSON.stringify(data);

    const okNative = nSave('jtr-data', json);
    const okLocal = lsSet('jtr-data', json);

    if (!okNative && !okLocal) {
      warnStorage(
        'Sauvegarde impossible : stockage refusé ou plein.'
      );
      return false;
    }

    // Une clé distincte pour les captures de chaque trade.
    keep.forEach(t => {
      const key = 'jtr-shots-' + String(t.id);

      if (t.shots && t.shots.length) {
        const shotsJson = JSON.stringify(t.shots);

        const savedNative = nSave(key, shotsJson);

        // Utiliser localStorage seulement si le stockage natif échoue.
        const savedLocal = savedNative
          ? true
          : lsSet(key, shotsJson);

        if (!savedNative && !savedLocal) {
          console.warn(
            'Captures non sauvegardées pour le trade',
            t.id
          );
        }
      } else {
        try {
          const n = jtrNative();

          if (n && typeof n.remove === 'function') {
            n.remove(key);
          }
        } catch (e) {}

        try {
          localStorage.removeItem(key);
        } catch (e) {}
      }
    });

    return true;

  } catch (e) {
    console.error('Erreur saveAll:', e);
    warnStorage('Erreur pendant la sauvegarde.');
    return false;
  }
}

function applyData(d) {
  if (
    !d ||
    !Array.isArray(d.trades) ||
    !Array.isArray(d.accounts) ||
    !d.accounts.length
  ) {
    throw new Error('format');
  }

  accounts = d.accounts;

  acct = accounts.some(a => a.id === d.acct)
    ? d.acct
    : accounts[0].id;

  nextId = Math.max(nextId, Number(d.nextId) || 1);

  demoOff = !!d.demoOff;

  remarks = Array.isArray(d.remarks)
    ? d.remarks
    : [];

  if (d.cfg && typeof d.cfg === 'object') {
    Object.keys(d.cfg).forEach(k => {
      if (k in cfg && d.cfg[k] != null) {
        cfg[k] = d.cfg[k];
      }
    });
  }

  trades = d.trades.map(t => {
    let shots = [];

    const key = 'jtr-shots-' + String(t.id);
    const rawShots = nLoad(key) || lsGet(key);

    if (rawShots) {
      try {
        const parsed = JSON.parse(rawShots);

        if (Array.isArray(parsed)) {
          shots = parsed;
        }
      } catch (e) {}
    }

    // Compatibilité avec l'ancienne sauvegarde globale.
    if (!shots.length && d.v === 2) {
      const oldRaw =
        nLoad('jtr-shots') ||
        lsGet('jtr-shots');

      if (oldRaw) {
        try {
          const old = JSON.parse(oldRaw);

          if (old && Array.isArray(old[t.id])) {
            shots = old[t.id];
          }
        } catch (e) {}
      }
    }

    return Object.assign({}, t, {
      shots: shots
    });
  });
}

function loadAll() {
  const raw =
    nLoad('jtr-data') ||
    lsGet('jtr-data');

  if (!raw) {
    return false;
  }

  try {
    applyData(JSON.parse(raw));
    return true;

  } catch (e) {
    // Conserver une copie des données problématiques.
    lsSet('jtr-data-corrompu', raw);
    nSave('jtr-data-corrompu', raw);

    try {
      const n = jtrNative();

      const bak =
        n && typeof n.loadBackup === 'function'
          ? n.loadBackup('jtr-data')
          : '';

      if (bak && bak !== raw) {
        applyData(JSON.parse(bak));
        return true;
      }

    } catch (e2) {
      console.error(
        'Sauvegarde de secours illisible:',
        e2
      );
    }

    console.error(
      'Données sauvegardées illisibles:',
      e
    );

    return false;
  }
}

// Permet à MainActivity.kt d'appliquer le thème système.
window.jtrApplyTheme = function () {
  try {
    themeMode = readTheme();
    applyTheme();
  } catch (e) {
    console.error('Thème:', e);
  }
};

// Sauvegarde après une modification d'un trade.
const jtrOriginalSaveTrade = saveTrade;

saveTrade = function () {
  jtrOriginalSaveTrade();

  if (
    typeof editingId === 'undefined' ||
    editingId == null
  ) {
    saveAll();
  }
};

// Sauvegarder après une modification des paramètres.
document.addEventListener('change', function (e) {
  const el = e.target;

  if (el && (el.dataset.cfg || el.dataset.sess)) {
    setTimeout(saveAll, 0);
  }
});

// Sauvegarder après certaines actions.
document.addEventListener('click', function (e) {
  const el =
    e.target && e.target.closest
      ? e.target.closest('[data-act]')
      : null;

  if (!el) {
    return;
  }

  const action = (el.dataset.act || '').split(':')[0];

  if (
    [
      'del',
      'clear',
      'clear-demo',
      'seed',
      'reset-sess',
      'add-asset-ok'
    ].includes(action)
  ) {
    setTimeout(saveAll, 0);
  }
});

window.addEventListener('pagehide', saveAll);

// Charger les données puis afficher l'accueil.
try {
  const loaded = loadAll();

  if (
    !loaded &&
    typeof seedDemo === 'function'
  ) {
    seedDemo();

  } else if (
    !demoOff &&
    !trades.some(t => t.demo) &&
    typeof seedDemo === 'function'
  ) {
    seedDemo();
  }

  go('home');

  window.__JTR_OK = true;

} catch (e) {
  console.error(
    'Erreur au démarrage de JTr:',
    e
  );

  try {
    go('home');
  } catch (e2) {}
}

window.__JTR_P5 = true;
