'use strict';
/* Ombre sul Tamigi — gioco a movimento nascosto, Jack contro la Polizia (hot-seat). */
(function () {
  let M = MapGen.build();
  const SAVE_KEY = 'ombre-tamigi-save-v1';
  const SET_KEY = 'ombre-tamigi-settings-v2';
  const DEFAULTS = { nights: 4, limit: 15, reveal: 5, revealLag: 3, specials: 2, cards: true, detectives: 3, mapMode: 'random' };
  const CERTIFIED = typeof CERTIFIED_MAPS !== 'undefined' ? CERTIFIED_MAPS : [];

  // Cambia la mappa in uso (ricostruisce il disegno statico se il gioco e' gia' a schermo)
  function useMap(params) {
    M = MapGen.build(params || undefined);
    if (gameEl) { gameEl.querySelector('#static').innerHTML = buildStatic(); if (view.rot) upright(gameEl.querySelector('#static')); }
    U.screenKey = null;
  }

  // Preferenze del dispositivo (non della partita)
  const PREF_KEY = 'ombre-tamigi-prefs-v1';
  const prefs = (() => { try { return Object.assign({ centerDet: true, jackRotate: false }, JSON.parse(localStorage.getItem(PREF_KEY) || '{}')); } catch (e) { return { centerDet: true, jackRotate: false }; } })();
  function savePrefs() { try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch (e) { /* ignore */ } }
  const prefToggle = (key, label) => `<label class="opt"><input type="checkbox" data-pref="${key}" ${prefs[key] ? 'checked' : ''}><span>${label}</span></label>`;
  const simSettings = s => ({ nights: s.nights, limit: s.limit, reveal: s.reveal, revealLag: s.revealLag, specials: s.specials, detectives: s.detectives });
  const DISTRICTS = { NO: 'Nord-Ovest', NE: 'Nord-Est', SO: 'Sud-Ovest', SE: 'Sud-Est' };
  const DETS = [
    { name: 'Ispettore Rosso', short: 'R', color: '#e05252' },
    { name: 'Ispettore Blu', short: 'B', color: '#4f8ff0' },
    { name: 'Ispettore Verde', short: 'V', color: '#3fb563' },
    { name: 'Ispettore Giallo', short: 'G', color: '#e3bd3c' },
  ];
  const SPECIAL = {
    coach: { name: 'Carrozza', icon: '🐎', desc: 'Due movimenti normali nello stesso turno (contano 2 mosse).' },
    alley: { name: 'Vicolo', icon: '🚪', desc: "Attraversa un isolato: raggiungi un luogo che si affaccia sullo stesso isolato, ignorando i detective." },
    boat: { name: 'Barca', icon: '⛵', desc: 'Da un luogo sul fiume (cerchio azzurro) raggiungi un altro luogo sul fiume entro 3 isolati, ignorando i detective.' },
  };
  const JACK_CARDS = {
    nebbia: { name: 'Nebbia fitta', icon: '🌫️', text: 'La prossima rivelazione periodica viene annullata.', secret: true },
    folla: { name: 'Folla al mercato', icon: '👥', text: 'Scegli un detective: nel prossimo turno potrà muovere di un solo incrocio.' },
    falsa: { name: 'Falsa pista', icon: '🧥', text: 'La prossima ricerca che troverebbe un tuo indizio non trova nulla.', secret: true },
    passaggio: { name: 'Passaggio segreto', icon: '🗝️', text: 'Ottieni un gettone Vicolo extra.' },
    nolo: { name: 'Carrozza a nolo', icon: '🎩', text: 'Ottieni un gettone Carrozza extra.' },
    tempo: { name: 'Tempo rubato', icon: '⏳', text: 'Questa notte hai 2 mosse in più a disposizione.' },
  };
  const POLICE_CARDS = {
    fischietto: { name: 'Fischietto', icon: '📯', text: 'Il detective selezionato (non ancora mosso) può muovere fino a 4 incroci.' },
    testimone: { name: 'Testimone', icon: '👁️', text: 'Scopri se Jack ora si trova a Nord o a Sud del fiume.' },
    informatore: { name: 'Informatore', icon: '🕯️', text: 'Scopri in quale distretto si trova Jack ora.' },
    segugio: { name: 'Cane da fiuto', icon: '🐕', text: 'La prossima ricerca del detective selezionato controlla tutti i luoghi adiacenti.' },
    retata: { name: 'Retata', icon: '⛓️', text: 'Il detective selezionato può sia cercare indizi sia tentare un arresto.' },
    telegrafo: { name: 'Telegrafo', icon: '📠', text: 'Scopri dove si trovava Jack 3 mosse fa.' },
  };

  let S = null;            // stato persistente della partita
  let U = {};              // stato temporaneo dell'interfaccia

  const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const num = c => M.C[c].num;
  const uniq = a => [...new Set(a)];

  // ---------------- Persistenza ----------------
  function save() {
    try { if (S) localStorage.setItem(SAVE_KEY, JSON.stringify(S)); else localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
  }
  function loadSave() {
    try { const t = localStorage.getItem(SAVE_KEY); const s = t ? JSON.parse(t) : null; return s && s.v === 1 ? s : null; } catch (e) { return null; }
  }
  function loadSettings() {
    try { const t = localStorage.getItem(SET_KEY); return Object.assign({}, DEFAULTS, t ? JSON.parse(t) : {}); } catch (e) { return Object.assign({}, DEFAULTS); }
  }
  function saveSettings(s) { try { localStorage.setItem(SET_KEY, JSON.stringify(s)); } catch (e) { /* ignore */ } }

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) { const k = Math.floor(Math.random() * (i + 1)); [a[i], a[k]] = [a[k], a[i]]; }
    return a;
  }
  function makeDeck(obj, exclude) { const d = []; Object.keys(obj).filter(k => !(exclude || []).includes(k)).forEach(k => d.push(k, k)); return shuffle(d); }

  // ---------------- Regole: helper ----------------
  const limit = () => S.settings.limit + (S.jack.extraLimit || 0);
  const currentTarget = () => S.jack.targets[S.night];
  const blocked = j => S.det.includes(j);
  const forbiddenJ = () => { const c = M.C[S.jack.pos]; return [c.a, c.b]; };

  function addLog(txt, cls) { S.log.push({ n: S.night + 1, t: S.turn, txt, cls: cls || '' }); }

  function normalMoves(from) { return uniq(M.adj[from].filter(e => !blocked(e.via)).map(e => e.to)); }

  function jackOptions(mode, steps) {
    const J = S.jack;
    const from = steps.length ? steps[steps.length - 1] : J.pos;
    const left = limit() - S.moves;
    if (mode === 'normal') return !steps.length && left >= 1 ? normalMoves(from) : [];
    if (mode === 'coach') {
      if (J.tokens.coach < 1 || left < 2) return [];
      if (steps.length === 0) return normalMoves(from).filter(x => normalMoves(x).some(y => y !== J.pos));
      if (steps.length === 1) return normalMoves(from).filter(y => y !== J.pos);
      return [];
    }
    if (mode === 'alley') return !steps.length && J.tokens.alley > 0 && left >= 1 ? M.alley[from].slice() : [];
    if (mode === 'boat') return !steps.length && J.tokens.boat > 0 && left >= 1 ? M.boat[from].slice() : [];
    return [];
  }
  function jackHasAnyMove() {
    return ['normal', 'alley', 'boat', 'coach'].some(m => jackOptions(m, []).length > 0);
  }

  function reachable(start, steps, selfIdx) {
    const seen = new Map([[start, 0]]);
    const q = [start];
    while (q.length) {
      const x = q.shift();
      const d = seen.get(x);
      if (d >= steps) continue;
      for (const y of M.jAdj[x]) if (!seen.has(y)) { seen.set(y, d + 1); q.push(y); }
    }
    const occ = S.det.filter((_, i) => i !== selfIdx);
    return [...seen.keys()].filter(j => j !== start && !occ.includes(j));
  }

  function setupOptions() {
    const J = S.jack;
    if (J.start === null) return M.lanterns.slice();
    if (J.targets.length >= S.settings.nights) return [];
    const prev = J.targets.length ? J.targets[J.targets.length - 1] : J.start;
    const used = J.targets.map(t => M.C[t].district);
    const d = M.dist(prev);
    const maxD = S.settings.limit - 3;
    return M.C.filter(c => c.district && !used.includes(c.district) && c.id !== J.start && !J.targets.includes(c.id) && d[c.id] >= 3 && d[c.id] <= maxD).map(c => c.id);
  }

  // La Polizia si schiera solo sui posti di guardia, prima che Jack scelga la partenza
  function placeOptions() {
    return M.stations.filter(j => !S.det.includes(j));
  }

  // ---------------- Flusso di gioco ----------------
  function newGame(settings, map) {
    const sp = settings.specials;
    map = map || { params: null, name: 'Piccola', jackRate: null };
    useMap(map.params);
    S = {
      v: 1, settings, map,
      phase: 'policeSetup', handoff: 'police',
      night: 0, turn: 0, moves: 0,
      jack: { start: null, targets: [], pos: null, path: [], paths: [], tokens: { coach: sp, alley: sp, boat: sp }, hand: [], fog: 0, falseTrail: 0, extraLimit: 0 },
      crimes: [], det: new Array(settings.detectives).fill(null),
      clues: [], searched: [], reveals: [], pendingReveal: null, revealShow: false,
      police: { hand: [] }, slow: {}, pt: null,
      log: [], notes: { text: '', marks: {} }, specials: [],
      winner: null, reason: '',
      decks: settings.cards ? { jack: makeDeck(JACK_CARDS, settings.reveal ? [] : ['nebbia']), police: makeDeck(POLICE_CARDS) } : { jack: [], police: [] },
      drawn: { police: null, jack: false },
    };
    U = {};
    render();
  }

  function startNight() {
    S.turn = 0; S.moves = 0;
    S.clues = []; S.searched = []; S.reveals = [];
    S.pendingReveal = null; S.revealShow = false;
    S.jack.extraLimit = 0; S.pt = null; // S.slow (Folla) resta valido per il prossimo turno della Polizia
    S.jack.path = [S.jack.pos];
    S.posAt = [S.jack.pos];
    S.drawn = { police: false, jack: false };
    if (S.settings.cards) {
      if (S.decks.police.length) { S.police.hand.push(S.decks.police.pop()); S.drawn.police = true; }
      if (S.decks.jack.length) { S.jack.hand.push(S.decks.jack.pop()); S.drawn.jack = true; }
    }
    // i detective restano dove sono tra una notte e l'altra
    addLog(`— Notte ${S.night + 1}: ${S.night === 0 ? 'Jack avvistato al luogo' : 'delitto al luogo'} ${num(S.jack.pos)} —`, 'night');
  }

  function confirmJackSetup() {
    const J = S.jack;
    J.pos = J.start;
    S.crimes = [J.start];
    S.night = 0;
    startNight();
    S.phase = 'nightIntro';
    S.handoff = 'police';
    U = {};
    render();
  }

  function applyJackMove() {
    const jm = U.jm;
    const J = S.jack;
    const mode = jm.mode;
    if (mode !== 'normal') {
      J.tokens[mode]--;
      S.specials.push({ night: S.night, turn: S.turn + 1, type: mode });
    }
    jm.steps.forEach(c => { J.path.push(c); S.moves++; });
    J.pos = jm.steps[jm.steps.length - 1];
    S.turn++;
    if (!S.posAt) S.posAt = [];
    S.posAt[S.turn] = J.pos;
    const L = limit();
    if (mode === 'normal') addLog(`Turno ${S.turn}: Jack si muove (${S.moves}/${L} mosse)`);
    else addLog(`Turno ${S.turn}: Jack usa ${SPECIAL[mode].icon} ${SPECIAL[mode].name} (${S.moves}/${L} mosse)`, 'special');
    U = {};

    if (J.pos === currentTarget()) { crimeReached(); return; }
    if (S.moves >= L) { endGame('police', `Jack non ha raggiunto la sua meta entro ${L} mosse.`); return; }

    const R = S.settings.reveal;
    if (R > 0 && S.turn % R === 0) {
      if (+J.fog > 0) {
        J.fog = +J.fog - 1;
        S.pendingReveal = { fog: true, turn: S.turn };
        addLog(`🌫️ Turno ${S.turn}: la nebbia nasconde Jack, nessuna rivelazione.`, 'reveal');
      } else {
        // Rivelazione ritardata: un testimone ha visto Jack "lag" turni fa (0 = posizione attuale)
        const at = Math.max(0, S.turn - (S.settings.revealLag || 0));
        const c = S.posAt[at] !== undefined ? S.posAt[at] : J.pos;
        S.reveals.push({ c, label: 'T' + at });
        S.pendingReveal = { c, turn: S.turn, at };
        addLog(at === S.turn
          ? `👁 Rivelazione: dopo il turno ${S.turn} Jack si trova al luogo ${num(c)}.`
          : `👁 Testimone: al turno ${at} Jack era al luogo ${num(c)}.`, 'reveal');
      }
    }
    startPoliceTurn();
    S.phase = 'policeTurn';
    S.handoff = 'police';
    render();
  }

  function crimeReached() {
    const J = S.jack;
    S.crimes.push(J.pos);
    J.paths.push(J.path.slice());
    addLog(`🩸 Notte ${S.night + 1}: Jack colpisce al luogo ${num(J.pos)} dopo ${S.moves} mosse!`, 'crime');
    if (S.night + 1 >= S.settings.nights) {
      endGame('jack', `Jack ha compiuto tutti i ${S.settings.nights} delitti e si dilegua nella nebbia.`, true);
      return;
    }
    S.night++;
    startNight();
    S.phase = 'nightIntro';
    S.handoff = 'police';
    render();
  }

  function startPoliceTurn() {
    S.pt = {
      sel: 0, mode: null,
      d: S.det.map((_, i) => ({ moved: false, acted: false, steps: S.slow[i] ? 1 : 2, sniff: false, double: false, did: [], now: [] })),
    };
    S.slow = {};
    S.revealShow = !!S.pendingReveal;
  }

  function endPoliceTurn() {
    S.pt = null;
    if (!jackHasAnyMove()) { endGame('police', 'Jack è circondato: non ha più vie di fuga!'); return; }
    S.phase = 'jackTurn';
    S.handoff = 'jack';
    U = {};
    render();
  }

  function endGame(winner, reason, pathSaved) {
    if (!pathSaved) S.jack.paths.push(S.jack.path.slice());
    S.winner = winner; S.reason = reason;
    S.phase = 'gameOver'; S.handoff = null;
    addLog(winner === 'jack' ? `🔪 Vince Jack. ${reason}` : `🕵 Vince la Polizia. ${reason}`, 'crime');
    U = {};
    render();
  }

  // ---------------- Azioni polizia ----------------
  function selDetNext() {
    const pt = S.pt;
    const i = pt.d.findIndex(d => !d.acted);
    if (i >= 0) pt.sel = i;
  }
  function finishAction(i, type) {
    const pt = S.pt, d = pt.d[i];
    d.did.push(type);
    d.now = [];
    d.sniff = type === 'search' ? false : d.sniff;
    if (!(d.double && d.did.length < 2 && type !== 'skip')) d.acted = true;
    pt.mode = null;
    if (d.acted) selDetNext();
  }
  function isClue(c) {
    if (!S.jack.path.includes(c)) return false;
    // indizi gia' noti (o il luogo di partenza pubblico) non consumano la Falsa pista
    if (S.clues.includes(c) || c === S.jack.path[0]) return true;
    if (S.jack.falseTrail > 0) {
      S.jack.falseTrail--;
      return false;
    }
    return true;
  }
  function searchAt(i, c) {
    const pt = S.pt, d = pt.d[i];
    const name = DETS[i].name;
    const list = d.sniff ? M.jCircles[S.det[i]].filter(x => !d.now.includes(x)) : [c];
    let found = false;
    for (const x of list) {
      d.now.push(x);
      if (isClue(x)) {
        found = true;
        if (!S.clues.includes(x)) S.clues.push(x);
        S.searched = S.searched.filter(y => y !== x);
        addLog(`🔍 ${name}: INDIZIO trovato al luogo ${num(x)}!`, 'clue');
        if (!d.sniff) break;
      } else {
        if (!S.clues.includes(x) && !S.searched.includes(x)) S.searched.push(x);
        addLog(`🔍 ${name}: nessun indizio al luogo ${num(x)}.`);
      }
    }
    const remaining = M.jCircles[S.det[i]].filter(x => !d.now.includes(x));
    if (found || d.sniff || remaining.length === 0) {
      toast(found ? '🔍 Indizio trovato!' : 'Nessun indizio.');
      finishAction(i, 'search');
    } else {
      toast(`Nessun indizio al luogo ${num(c)}. Puoi continuare a cercare.`);
    }
  }
  function arrestAt(i, c) {
    const name = DETS[i].name;
    if (c === S.jack.pos) {
      endGame('police', `${name} ha arrestato Jack al luogo ${num(c)}!`);
      return true;
    }
    addLog(`⛓ ${name}: arresto fallito al luogo ${num(c)}.`);
    toast(`Arresto fallito: Jack non è al luogo ${num(c)}.`);
    finishAction(i, 'arrest');
    return false;
  }

  function playPoliceCard(idx) {
    const key = S.police.hand[idx];
    const card = POLICE_CARDS[key];
    const pt = S.pt, i = pt.sel, d = pt.d[i];
    const J = S.jack, here = M.C[J.pos];
    let info = null;
    if (key === 'fischietto') { if (d.moved) return toast('Seleziona un detective che non si è ancora mosso.'); d.steps = 4; }
    if (key === 'segugio') { if (d.acted || !d.moved) return toast('Seleziona un detective già mosso che non ha ancora agito.'); d.sniff = true; }
    if (key === 'retata') { if (d.acted) return toast('Seleziona un detective che non ha ancora agito.'); d.double = true; }
    if (key === 'testimone') info = here.bridge ? 'Jack si trova su un ponte sul fiume.' : `Jack si trova a ${here.north ? 'NORD' : 'SUD'} del fiume.`;
    if (key === 'informatore') info = here.bridge ? 'Jack si trova su un ponte sul fiume.' : `Jack si trova nel distretto ${DISTRICTS[here.district].toUpperCase()}.`;
    if (key === 'telegrafo') {
      const p = J.path;
      if (p.length < 4) return toast('Jack non ha ancora fatto 3 mosse in questa notte: conserva il Telegrafo.');
      const c = p[p.length - 1 - 3];
      S.reveals.push({ c, label: '📠' });
      info = `3 mosse fa Jack si trovava al luogo ${num(c)}.`;
    }
    S.police.hand.splice(idx, 1);
    const who = ['fischietto', 'segugio', 'retata'].includes(key) ? ` (${DETS[i].name})` : '';
    addLog(`🃏 Polizia gioca "${card.name}"${who}${info ? ': ' + info : ''}`, 'special');
    if (info) showModal(`<h2>${card.icon} ${esc(card.name)}</h2><p style="font-size:19px">${esc(info)}</p><div class="btn-row"><button class="primary" data-act="close-modal">OK</button></div>`);
    else toast(`${card.icon} ${card.name} giocata.`);
    render();
  }

  function playJackCard(idx, detIdx) {
    const key = S.jack.hand[idx];
    const card = JACK_CARDS[key];
    const J = S.jack;
    if (key === 'folla' && detIdx === undefined) { U.follaPick = idx; render(); return; }
    if (key === 'nebbia') J.fog = (+J.fog || 0) + 1;
    if (key === 'falsa') J.falseTrail = (+J.falseTrail || 0) + 1;
    if (key === 'passaggio') J.tokens.alley++;
    if (key === 'nolo') J.tokens.coach++;
    if (key === 'tempo') J.extraLimit += 2;
    if (key === 'folla') S.slow[detIdx] = true;
    J.hand.splice(idx, 1);
    U.follaPick = null;
    if (card.secret) addLog('🃏 Jack gioca una carta segreta.', 'special');
    else addLog(`🃏 Jack gioca "${card.name}"${key === 'folla' ? ` su ${DETS[detIdx].name}` : ''}.`, 'special');
    if (U.jm) U.jm = { mode: 'normal', steps: [] };
    toast(`${card.icon} ${card.name} giocata.`);
    render();
  }

  // ---------------- Interazioni con la mappa ----------------
  function isPoliceView() { return !S.handoff && (S.phase === 'policeTurn' || S.phase === 'policeSetup'); }

  function tapTargets() {
    if (!S || S.handoff) return null;
    if (U.markMode && isPoliceView()) return { circles: M.C.map(c => c.id), onCircle: cycleMark };
    if (S.phase === 'jackSetup') return { circles: setupOptions(), onCircle: pickSetup };
    if (S.phase === 'policeSetup') {
      return { junctions: placeOptions().concat(S.det.filter(j => j !== null)), onJunction: placeTap };
    }
    if (S.phase === 'jackTurn') {
      if (!U.jm) U.jm = { mode: 'normal', steps: [] };
      return { circles: jackOptions(U.jm.mode, U.jm.steps), onCircle: pickJackStep };
    }
    if (S.phase === 'policeTurn' && S.pt) {
      const pt = S.pt, d = pt.d[pt.sel], j = S.det[pt.sel];
      const dets = S.det.slice();
      if (pt.mode === 'search') return { circles: M.jCircles[j].filter(x => !d.now.includes(x)), onCircle: c => { searchAt(pt.sel, c); render(); }, junctions: dets, onJunction: detTap };
      if (pt.mode === 'arrest') return { circles: M.jCircles[j].slice(), onCircle: c => { if (!arrestAt(pt.sel, c)) render(); }, junctions: dets, onJunction: detTap };
      if (!d.moved) return { junctions: reachable(j, d.steps, pt.sel).concat(dets), onJunction: moveTap };
      return { junctions: dets, onJunction: detTap };
    }
    return null;
  }

  function onMapTap(wx, wy, thresh) {
    const T = tapTargets();
    if (!T) return;
    let best = null, bd = thresh * thresh;
    (T.circles || []).forEach(id => { const c = M.C[id]; const d = (c.x - wx) ** 2 + (c.y - wy) ** 2; if (d < bd) { bd = d; best = { k: 'c', id }; } });
    (T.junctions || []).forEach(id => { const j = M.J[id]; const d = (j.x - wx) ** 2 + (j.y - wy) ** 2; if (d < bd) { bd = d; best = { k: 'j', id }; } });
    if (!best) return;
    if (best.k === 'c') T.onCircle(best.id); else T.onJunction(best.id);
  }

  function cycleMark(c) {
    const m = S.notes.marks;
    if (!m[c]) m[c] = '?'; else if (m[c] === '?') m[c] = 'x'; else delete m[c];
    render();
  }
  function pickSetup(c) {
    const J = S.jack;
    if (J.start === null) J.start = c; else J.targets.push(c);
    render();
  }
  function placeTap(j) {
    const occ = S.det.indexOf(j);
    if (occ >= 0) { U.psel = occ; render(); return; }
    const i = U.psel ?? 0;
    S.det[i] = j;
    const next = S.det.findIndex(x => x === null);
    U.psel = next >= 0 ? next : i;
    render();
  }
  function detTap(j) {
    const i = S.det.indexOf(j);
    if (i < 0 || !S.pt) return;
    if (S.pt.mode && i !== S.pt.sel) return toast('Completa prima l’azione in corso.');
    S.pt.sel = i;
    render();
  }
  function moveTap(j) {
    const pt = S.pt;
    const occ = S.det.indexOf(j);
    if (occ >= 0) { if (occ !== pt.sel) { pt.sel = occ; render(); } return; }
    S.det[pt.sel] = j;
    pt.d[pt.sel].moved = true;
    render();
  }
  function pickJackStep(c) {
    const jm = U.jm;
    jm.steps.push(c);
    render();
  }
  function jackStepsNeeded(mode) { return mode === 'coach' ? 2 : 1; }

  // ---------------- DOM: struttura ----------------
  const app = document.getElementById('app');
  const modalRoot = document.getElementById('modal-root');
  let gameEl = null, screenEl = null, svg = null, worldG = null, dynG = null, toastEl = null, toastTimer = null;
  const view = { s: 1, tx: 0, ty: 0, rot: 0 };

  function ensureScreen() {
    if (!screenEl) { screenEl = document.createElement('div'); screenEl.className = 'screen'; app.appendChild(screenEl); }
    screenEl.hidden = false;
    if (gameEl) gameEl.hidden = true;
    if (dynG) dynG.innerHTML = '';
    clearTimeout(toastTimer);
    if (toastEl) toastEl.hidden = true;
    return screenEl;
  }
  function ensureGame() {
    if (!gameEl) {
      gameEl = document.createElement('div');
      gameEl.className = 'game';
      gameEl.innerHTML = `
        <header class="topbar">
          <button class="icon-btn" data-act="menu" aria-label="Menu">☰</button>
          <div class="tb-title"><b></b><span></span></div>
          <button class="icon-btn" data-act="log" aria-label="Registro e appunti">📜</button>
        </header>
        <div class="mapwrap">
          <svg id="map" xmlns="http://www.w3.org/2000/svg" aria-label="Mappa"><g id="world"><g id="static"></g><g id="dyn"></g></g></svg>
          <div class="mapctl">
            <button data-z="in" aria-label="Zoom avanti">+</button>
            <button data-z="out" aria-label="Zoom indietro">−</button>
            <button data-z="fit" aria-label="Mostra tutta la mappa">⤢</button>
            <button data-z="focus" aria-label="Centra sull'azione">◎</button>
            <button data-z="mark" class="mark-btn" aria-label="Segna sulla mappa">✎</button>
          </div>
          <div class="mark-banner" hidden>✎ Modalità appunti: tocca i luoghi (? → ✗ → niente)</div>
          <div class="toast" hidden></div>
        </div>
        <aside class="panel"></aside>`;
      app.appendChild(gameEl);
      svg = gameEl.querySelector('#map');
      worldG = gameEl.querySelector('#world');
      dynG = gameEl.querySelector('#dyn');
      toastEl = gameEl.querySelector('.toast');
      gameEl.querySelector('#static').innerHTML = buildStatic();
      initPanZoom();
      gameEl.querySelector('.mapctl').addEventListener('click', e => {
        const b = e.target.closest('[data-z]');
        if (!b) return;
        const z = b.dataset.z;
        const r = svg.getBoundingClientRect();
        if (z === 'in') zoomAt(r.width / 2, r.height / 2, 1.35);
        if (z === 'out') zoomAt(r.width / 2, r.height / 2, 1 / 1.35);
        if (z === 'fit') fitAll();
        if (z === 'focus') focusPts(U.focus || []);
        if (z === 'mark') { U.markMode = !U.markMode; render(); }
      });
    }
    gameEl.hidden = false;
    if (screenEl) screenEl.hidden = true;
    return gameEl;
  }

  function buildStatic() {
    let h = `<rect x="-2000" y="-2000" width="${M.W + 4000}" height="${M.H + 4000}" fill="var(--ground)"/>`;
    const rv = M.river.map(p => p.join(',')).join(' ');
    h += `<polyline class="river-edge" points="${rv}"/><polyline class="river" points="${rv}"/>`;
    [-30, 0, 30].forEach(off => { h += `<polyline class="river-wave" points="${M.river.map(p => p[0] + ',' + (p[1] + off)).join(' ')}"/>`; });
    M.cells.forEach(cell => {
      const pts = cell.corners.map(id => M.J[id]);
      const cx = pts.reduce((s, p) => s + p.x, 0) / 4, cy = pts.reduce((s, p) => s + p.y, 0) / 4;
      const poly = pts.map(p => {
        const dx = cx - p.x, dy = cy - p.y, L = Math.hypot(dx, dy) || 1, k = 24 / L;
        return (p.x + dx * k).toFixed(1) + ',' + (p.y + dy * k).toFixed(1);
      }).join(' ');
      h += `<polygon class="block" points="${poly}"/>`;
    });
    M.removed.forEach(s => {
      const A = M.J[s.a], B = M.J[s.b];
      const dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy), k = 26 / L;
      h += `<line class="filler" x1="${A.x + dx * k}" y1="${A.y + dy * k}" x2="${B.x - dx * k}" y2="${B.y - dy * k}"/>`;
    });
    M.C.forEach(c => {
      const A = M.J[c.a], B = M.J[c.b];
      if (c.bridge) h += `<line class="bridge-rail" x1="${A.x}" y1="${A.y + 20}" x2="${B.x}" y2="${B.y - 20}"/><line class="bridge" x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}"/>`;
      else h += `<line class="street" x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}"/>`;
    });
    // Confini dei 4 distretti: linee rosse tratteggiate (lungo il fiume e a zig-zag tra Ovest ed Est)
    h += `<polyline class="divider" points="${M.river.map(p => p.join(',')).join(' ')}"/>`;
    h += `<polyline class="divider" points="${M.divider.map(p => p.join(',')).join(' ')}"/>`;
    [['NORD-OVEST', 0.25, 38], ['NORD-EST', 0.75, 38], ['SUD-OVEST', 0.25, M.H - 26], ['SUD-EST', 0.75, M.H - 26]].forEach(([t, fx, y]) => {
      h += `<text class="quad-label" x="${M.W * fx}" y="${y}">${t}</text>`;
    });
    const rmid = M.river[Math.floor(M.river.length / 2)];
    h += `<text class="map-label" x="${M.W * 0.27}" y="${rmid[1] + 10}">~ TAMIGI ~</text>`;
    M.J.forEach(j => { h += `<rect class="junc" x="${j.x - 8}" y="${j.y - 8}" width="16" height="16" rx="2"/>`; });
    M.C.forEach(c => {
      h += `<g class="loc${c.bank ? ' bank' : ''}"><circle cx="${c.x}" cy="${c.y}" r="17"/><text x="${c.x}" y="${c.y}">${c.num}</text></g>`;
    });
    return h;
  }

  // ---------------- Pan / zoom / rotazione ----------------
  // schermo = T + R(rot) * (s * mondo)   (SVG: translate(T) rotate(rot) scale(s))
  const rad = () => view.rot * Math.PI / 180;
  function applyView() { worldG.setAttribute('transform', `translate(${view.tx} ${view.ty}) rotate(${view.rot}) scale(${view.s})`); }
  function svgSize() { const r = svg.getBoundingClientRect(); return { w: r.width, h: r.height }; }
  function toWorld(px, py) {
    const a = rad(), c = Math.cos(a), sn = Math.sin(a);
    const dx = (px - view.tx) / view.s, dy = (py - view.ty) / view.s;
    return { x: c * dx + sn * dy, y: -sn * dx + c * dy };
  }
  function anchor(wx, wy, px, py) {
    const a = rad(), c = Math.cos(a), sn = Math.sin(a);
    view.tx = px - view.s * (c * wx - sn * wy);
    view.ty = py - view.s * (sn * wx + c * wy);
  }
  // ingombro sullo schermo (a scala 1) di un rettangolo w x h ruotato
  function rotExt(w, h) { const a = rad(), c = Math.abs(Math.cos(a)), sn = Math.abs(Math.sin(a)); return { w: c * w + sn * h, h: sn * w + c * h }; }
  function minS() { const { w, h } = svgSize(); const e = rotExt(M.W, M.H); return Math.min(w / e.w, h / e.h) * 0.6; }
  function clampS(s) { return Math.max(minS(), Math.min(4, s)); }
  function clampPan() {
    const { w, h } = svgSize();
    const e = rotExt(M.W * view.s, M.H * view.s), m = 80;
    const a = rad(), c = Math.cos(a), sn = Math.sin(a);
    const cx = view.tx + view.s * (c * M.W / 2 - sn * M.H / 2);
    const cy = view.ty + view.s * (sn * M.W / 2 + c * M.H / 2);
    const nx = Math.min(w - m + e.w / 2, Math.max(m - e.w / 2, cx));
    const ny = Math.min(h - m + e.h / 2, Math.max(m - e.h / 2, cy));
    view.tx += nx - cx; view.ty += ny - cy;
  }
  function zoomAt(px, py, f) {
    const wp = toWorld(px, py);
    view.s = clampS(view.s * f);
    anchor(wp.x, wp.y, px, py);
    clampPan(); applyView();
  }
  function fitBox(x0, y0, x1, y1, maxS) {
    const { w, h } = svgSize();
    if (!w || !h) return;
    const pad = 24;
    const e = rotExt(Math.max(1, x1 - x0), Math.max(1, y1 - y0));
    let s = Math.min((w - pad * 2) / e.w, (h - pad * 2) / e.h);
    view.s = clampS(Math.min(s, maxS || 4));
    anchor((x0 + x1) / 2, (y0 + y1) / 2, w / 2, h / 2);
    clampPan(); applyView();
  }
  function fitAll() { fitBox(0, 0, M.W, M.H, 4); }
  function focusPts(pts) {
    if (!pts || !pts.length) return fitAll();
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    pts.forEach(p => { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); });
    const minW = 420, minH = 380;
    if (x1 - x0 < minW) { const c = (x0 + x1) / 2; x0 = c - minW / 2; x1 = c + minW / 2; }
    if (y1 - y0 < minH) { const c = (y0 + y1) / 2; y0 = c - minH / 2; y1 = c + minH / 2; }
    fitBox(x0 - 40, y0 - 40, x1 + 40, y1 + 40, 1.6);
  }
  // Sposta (con animazione) la vista per centrare un punto del mondo
  let animId = 0;
  function centerOn(p, minScale) {
    const { w, h } = svgSize();
    if (!w || !h) return;
    const id = ++animId;
    const fromS = view.s, toS = clampS(Math.max(view.s, minScale || 0));
    const from = toWorld(w / 2, h / 2);
    const t0 = performance.now(), dur = 280;
    const step = now => {
      if (id !== animId) return;
      const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      view.s = fromS + (toS - fromS) * e;
      anchor(from.x + (p.x - from.x) * e, from.y + (p.y - from.y) * e, w / 2, h / 2);
      applyView();
      if (k < 1) requestAnimationFrame(step); else { clampPan(); applyView(); }
    };
    requestAnimationFrame(step);
  }
  // Rotazione della mappa: i testi restano diritti
  function upright(root) {
    if (!root) return;
    root.querySelectorAll('text').forEach(t => {
      if (!view.rot) t.removeAttribute('transform');
      else t.setAttribute('transform', `rotate(${-view.rot} ${t.getAttribute('x')} ${t.getAttribute('y')})`);
    });
  }
  function setRotation(deg) {
    if (view.rot === deg) return;
    const { w, h } = svgSize();
    const c = w && h ? toWorld(w / 2, h / 2) : null;
    view.rot = deg;
    upright(gameEl.querySelector('#static'));
    upright(dynG);
    if (c) anchor(c.x, c.y, w / 2, h / 2);
    applyView();
  }

  function initPanZoom() {
    const ptrs = new Map();
    let g = null;
    const local = e => { const r = svg.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    svg.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      try { svg.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
      animId++; // interrompe un'eventuale animazione
      const p = local(e);
      ptrs.set(e.pointerId, p);
      if (ptrs.size === 1) g = { mode: 'pan', sx: p.x, sy: p.y, tx: view.tx, ty: view.ty, moved: false };
      else if (ptrs.size === 2) {
        const [a, b] = [...ptrs.values()];
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        g = { mode: 'pinch', d: Math.hypot(a.x - b.x, a.y - b.y) || 1, s: view.s, w: toWorld(mx, my), moved: true };
      }
    });
    svg.addEventListener('pointermove', e => {
      if (!ptrs.has(e.pointerId) || !g) return;
      const p = local(e);
      ptrs.set(e.pointerId, p);
      if (g.mode === 'pan' && ptrs.size === 1) {
        const dx = p.x - g.sx, dy = p.y - g.sy;
        if (!g.moved && Math.hypot(dx, dy) > 8) g.moved = true;
        if (g.moved) { view.tx = g.tx + dx; view.ty = g.ty + dy; clampPan(); applyView(); }
      } else if (g.mode === 'pinch' && ptrs.size >= 2) {
        const [a, b] = [...ptrs.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
        view.s = clampS(g.s * d / g.d);
        anchor(g.w.x, g.w.y, (a.x + b.x) / 2, (a.y + b.y) / 2);
        clampPan(); applyView();
      }
    });
    const up = e => {
      if (!ptrs.has(e.pointerId)) return;
      const p = local(e);
      const wasTap = e.type === 'pointerup' && g && g.mode === 'pan' && !g.moved && ptrs.size === 1;
      ptrs.delete(e.pointerId);
      if (ptrs.size === 1) {
        const q = [...ptrs.values()][0];
        g = { mode: 'pan', sx: q.x, sy: q.y, tx: view.tx, ty: view.ty, moved: true };
      } else if (ptrs.size === 0) g = null;
      if (wasTap) {
        const wp = toWorld(p.x, p.y);
        const thresh = Math.max(26, 30 / view.s);
        onMapTap(wp.x, wp.y, thresh);
      }
    };
    svg.addEventListener('pointerup', up);
    svg.addEventListener('pointercancel', up);
    svg.addEventListener('wheel', e => {
      e.preventDefault();
      const p = local(e);
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      zoomAt(p.x, p.y, Math.exp(-dy * (e.ctrlKey ? 0.01 : 0.0015)));
    }, { passive: false });
    // Al ridimensionamento mantiene il centro e lo zoom correnti (niente reset della vista)
    let last = null;
    new ResizeObserver(() => {
      const { w, h } = svgSize();
      if (!w || !h) return;
      if (!last) { last = { w, h }; focusPts(U.focus || []); return; }
      if (Math.abs(w - last.w) < 1 && Math.abs(h - last.h) < 1) return;
      const a = rad(), c = Math.cos(a), sn = Math.sin(a);
      const dx = (last.w / 2 - view.tx) / view.s, dy = (last.h / 2 - view.ty) / view.s;
      const wc = { x: c * dx + sn * dy, y: -sn * dx + c * dy };
      view.s = clampS(view.s);
      anchor(wc.x, wc.y, w / 2, h / 2);
      last = { w, h };
      clampPan(); applyView();
    }).observe(svg);
  }
  ['gesturestart', 'gesturechange'].forEach(t => document.addEventListener(t, e => e.preventDefault()));

  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastEl.hidden = true; }, 2600);
  }

  function showModal(html, cls) {
    modalRoot.innerHTML = `<div class="modal-back ${cls || ''}"><div class="modal ${cls || ''}" role="dialog" aria-modal="true">${html}</div></div>`;
  }
  function closeModal() { modalRoot.innerHTML = ''; }

  // ---------------- Disegno dinamico ----------------
  const P = id => M.C[id];
  function ring(c, r, cls) { const p = P(c); return `<circle class="${cls}" cx="${p.x}" cy="${p.y}" r="${r}"/>`; }
  function label(c, dx, dy, txt, cls) { const p = P(c); return `<text class="${cls}" x="${p.x + dx}" y="${p.y + dy}">${esc(txt)}</text>`; }
  function pathLine(path, cls) {
    if (!path || path.length < 2) return '';
    return `<polyline class="${cls}" points="${path.map(c => P(c).x + ',' + P(c).y).join(' ')}"/>`;
  }

  function renderDyn(viewRole) {
    let h = '';
    const T = tapTargets();
    const showPublic = viewRole !== 'jackSetup';

    if (viewRole === 'policeSetup') M.stations.forEach(j => { const p = M.J[j]; h += `<text class="station-ic" x="${p.x}" y="${p.y - 26}">⚑</text>`; });

    if (viewRole === 'jackSetup') {
      M.lanterns.forEach(c => { h += label(c, 0, -30, '✦', 'lantern-ic'); });
      if (S.jack.start !== null) { h += ring(S.jack.start, 24, 'jackpos'); h += label(S.jack.start, 0, -32, 'Partenza', 'target-t'); }
      S.jack.targets.forEach((t, i) => { h += ring(t, 28, 'target'); h += label(t, 0, -34, 'Notte ' + (i + 1), 'target-t'); });
    }

    if (viewRole === 'gameOver') {
      S.jack.paths.forEach((p, i) => { h += pathLine(p, i === S.jack.paths.length - 1 ? 'jpath' : 'jpath old'); });
      S.jack.targets.forEach((t, i) => { h += ring(t, 28, 'target'); h += label(t, 0, -34, 'N' + (i + 1), 'target-t'); });
    }

    if (viewRole === 'jack') {
      h += pathLine(S.jack.path, 'jpath');
      const t = currentTarget();
      h += ring(t, 29, 'target');
      h += label(t, 0, -36, 'META', 'target-t');
    }

    if (showPublic) {
      S.crimes.forEach((c, i) => { h += ring(c, 23, 'crime'); h += label(c, -24, -24, i === 0 ? '★' : '✝' + i, 'crime-t'); });
      S.searched.forEach(c => { const p = P(c); h += `<path class="searched" d="M${p.x + 10} ${p.y + 10}l10 10m0 -10l-10 10"/>`; });
      S.clues.forEach(c => { h += ring(c, 21, 'clue'); });
      S.reveals.forEach(r => { h += ring(r.c, 27, 'reveal'); h += label(r.c, 26, -24, r.label, 'reveal-t'); });
    }

    if (viewRole === 'police' || viewRole === 'policeSetup') {
      Object.keys(S.notes.marks).forEach(k => {
        const c = +k, p = P(c), m = S.notes.marks[k];
        h += `<g class="${m === '?' ? 'mark-q' : 'mark-x'}"><circle cx="${p.x + 16}" cy="${p.y - 16}" r="10"/><text x="${p.x + 16}" y="${p.y - 16}">${m === '?' ? '?' : '✗'}</text></g>`;
      });
    }

    // Bersagli selezionabili
    if (T && !U.markMode) {
      (T.circles || []).forEach(c => { h += ring(c, 25, 'cand'); });
      const dets = S.det;
      (T.junctions || []).forEach(j => { if (dets.includes(j)) return; const p = M.J[j]; h += `<rect class="cand" x="${p.x - 15}" y="${p.y - 15}" width="30" height="30" rx="5"/>`; });
    }

    if (viewRole === 'jack' && U.jm) {
      U.jm.steps.forEach((c, i) => { h += ring(c, 25, 'cand-step'); if (U.jm.mode === 'coach') h += label(c, 24, 24, String(i + 1), 'target-t'); });
      if (U.jm.steps.length) h += pathLine([S.jack.pos].concat(U.jm.steps), 'jpath');
    }

    if (viewRole === 'jack' || viewRole === 'gameOver') {
      const c = S.jack.pos, p = P(c);
      h += ring(c, 22, 'jackpos');
      h += `<circle class="jack-badge" cx="${p.x - 18}" cy="${p.y + 18}" r="11"/><text class="jack-badge-t" x="${p.x - 18}" y="${p.y + 18}">J</text>`;
    }

    // Detective
    S.det.forEach((j, i) => {
      if (j === null) return;
      const p = M.J[j];
      const sel = (S.phase === 'policeTurn' && S.pt && S.pt.sel === i && viewRole === 'police') || (S.phase === 'policeSetup' && (U.psel ?? 0) === i && viewRole === 'policeSetup');
      if (sel) h += `<circle class="det-sel" cx="${p.x}" cy="${p.y}" r="24"/>`;
      h += `<g class="det"><circle cx="${p.x}" cy="${p.y}" r="15" fill="${DETS[i].color}"/><text x="${p.x}" y="${p.y}">${DETS[i].short}</text></g>`;
    });

    dynG.innerHTML = h;
    if (view.rot) upright(dynG);
  }

  function focusFor(viewRole) {
    const pts = [];
    const addC = c => { if (c !== null && c !== undefined) pts.push(P(c)); };
    if (viewRole === 'jackSetup' || viewRole === 'gameOver') return [];
    if (viewRole === 'jack') {
      addC(S.jack.pos);
      jackOptions('normal', []).forEach(addC);
    } else {
      S.det.forEach(j => { if (j !== null) pts.push(M.J[j]); });
      S.clues.forEach(addC);
      S.reveals.forEach(r => addC(r.c));
      addC(S.crimes[S.crimes.length - 1]);
    }
    return pts;
  }

  // ---------------- Render principale ----------------
  function render() {
    save();
    if (!S) return renderMenu();
    if (S.handoff) return renderHandoff();
    if (S.phase === 'nightIntro') return renderNightIntro();
    ensureGame();
    const ph = S.phase;
    const role = ph === 'jackSetup' || ph === 'jackTurn' ? 'jack' : ph === 'gameOver' ? 'end' : 'police';
    gameEl.className = 'game role-' + role;
    const viewRole = ph === 'jackSetup' ? 'jackSetup' : ph === 'jackTurn' ? 'jack' : ph === 'policeSetup' ? 'policeSetup' : ph === 'policeTurn' ? 'police' : 'gameOver';
    if (!isPoliceView()) U.markMode = false;
    gameEl.querySelector('.mark-btn').hidden = !isPoliceView();
    gameEl.querySelector('.mark-btn').classList.toggle('on', !!U.markMode);
    gameEl.querySelector('.mark-banner').hidden = !U.markMode;

    const panel = gameEl.querySelector('.panel');
    const tb = gameEl.querySelector('.tb-title');
    const [title, sub, body] = panelFor(ph);
    tb.querySelector('b').textContent = title;
    tb.querySelector('span').textContent = sub;
    panel.innerHTML = body;

    renderDyn(viewRole);

    const screenKey = ph + ':' + S.night + ':' + S.turn;
    if (U.screenKey !== screenKey) {
      U.screenKey = screenKey;
      U.focus = focusFor(viewRole);
      // Jack: rotazione casuale anti-sbirciata (nuovo angolo a ogni turno); per gli altri mappa diritta
      const jackView = viewRole === 'jack' || viewRole === 'jackSetup';
      setRotation(jackView && prefs.jackRotate ? 20 + Math.floor(Math.random() * 320) : 0);
      requestAnimationFrame(() => focusPts(U.focus));
      U.selKey = selKey();
    } else if (prefs.centerDet && selKey() !== U.selKey) {
      // Polizia: la mappa segue il detective selezionato
      U.selKey = selKey();
      const j = selDetJ();
      if (j !== null && j !== undefined) centerOn(M.J[j], 0.7);
    }
    U.selKey = selKey();

    if (ph === 'policeTurn' && S.revealShow && !modalRoot.innerHTML) showRevealModal();
  }

  // detective attualmente selezionato (schieramento o turno della Polizia)
  function selDetIdx() {
    if (S.phase === 'policeTurn' && S.pt) return S.pt.sel;
    if (S.phase === 'policeSetup') return U.psel ?? 0;
    return null;
  }
  function selDetJ() { const i = selDetIdx(); return i === null ? null : S.det[i]; }
  function selKey() { const i = selDetIdx(); return i === null ? '' : S.phase + ':' + i + ':' + S.det[i]; }

  function showRevealModal() {
    const r = S.pendingReveal;
    if (!r) return;
    if (r.fog) {
      showModal(`<div class="big">🌫️</div><h2>Rivelazione mancata</h2><p>Turno ${r.turn}: una nebbia fitta avvolge le strade. Jack resta invisibile.</p><div class="btn-row"><button class="primary" data-act="reveal-ok">Continua</button></div>`, 'reveal');
    } else {
      const live = r.at === undefined || r.at === r.turn;
      showModal(`<div class="big">👁</div><h2>${live ? 'Rivelazione!' : 'Un testimone parla!'}</h2><p>${live ? `Dopo il turno ${r.turn} Jack si trova al luogo` : `Al turno ${r.at} (${r.turn - r.at} turni fa) Jack è stato visto al luogo`}</p><div class="num">${num(r.c)}</div><p>Il punto è segnato sulla mappa (cerchio viola, T${live ? r.turn : r.at}).</p><div class="btn-row"><button class="primary" data-act="reveal-ok">Annota e continua</button></div>`, 'reveal');
    }
  }

  function detRows(onlyPlaced) {
    return S.det.map((j, i) => ({ j, i })).filter(x => !onlyPlaced || x.j !== null);
  }

  function statsChips() {
    const J = S.jack;
    const L = limit();
    const R = S.settings.reveal;
    let next = '';
    if (R > 0) next = `<span class="chip">👁 Prossima rivelazione: turno ${(Math.floor(S.turn / R) + 1) * R}</span>`;
    return `<div class="stats">
      <span class="chip">🌙 Notte ${S.night + 1}/${S.settings.nights}</span>
      <span class="chip red">👣 Mosse ${S.moves}/${L}</span>
      <span class="chip">⏱ Turno ${S.turn}</span>
      ${next}
      <span class="chip">${SPECIAL.coach.icon}${J.tokens.coach} ${SPECIAL.alley.icon}${J.tokens.alley} ${SPECIAL.boat.icon}${J.tokens.boat}</span>
      ${S.settings.cards ? `<span class="chip">🃏 Jack: ${J.hand.length}</span>` : ''}
    </div>`;
  }

  function cardHtml(def, act, i, disabled) {
    return `<div class="card"><div class="ic">${def.icon}</div><div class="tx"><b>${esc(def.name)}</b><p>${esc(def.text)}</p></div>${act ? `<button data-act="${act}" data-i="${i}" ${disabled ? 'disabled' : ''}>Gioca</button>` : ''}</div>`;
  }

  function panelFor(ph) {
    const J = S.jack;
    if (ph === 'jackSetup') {
      const opts = setupOptions();
      const need = S.settings.nights;
      let hint;
      if (J.start === null) hint = 'I detective sono già schierati. Tocca uno dei 4 lampioni ✦ evidenziati: sarà il tuo punto di partenza (verrà rivelato alla Polizia).';
      else if (J.targets.length < need) hint = `Tocca il luogo del delitto per la <b>notte ${J.targets.length + 1}</b>. Deve stare in un distretto non ancora usato e a ${3}–${S.settings.limit - 3} passi dalla posizione precedente.`;
      else hint = 'Piano completo. Conferma per iniziare: poi passa il dispositivo alla Polizia.';
      if (J.start !== null && J.targets.length < need && !opts.length) hint = 'Nessun luogo valido da qui: annulla l’ultima scelta e riprova.';
      const list = [`<span class="chip ${J.start !== null ? 'red' : ''}">Partenza: ${J.start !== null ? num(J.start) : '—'}</span>`]
        .concat(Array.from({ length: need }, (_, i) => `<span class="chip ${J.targets[i] !== undefined ? 'red' : ''}">Notte ${i + 1}: ${J.targets[i] !== undefined ? num(J.targets[i]) + ' (' + M.C[J.targets[i]].district + ')' : '—'}</span>`));
      return ['🔪 Jack · Piano segreto', 'Scegli partenza e luoghi dei delitti', `
        <h2>🔪 Il piano di Jack</h2>
        <div class="hint">${hint}</div>
        <div class="targets">${list.join('')}</div>
        <div class="btn-row">
          <button data-act="setup-undo" ${J.start === null ? 'disabled' : ''}>↶ Annulla</button>
          <button class="primary" data-act="setup-confirm" ${J.targets.length === need ? '' : 'disabled'}>Conferma piano</button>
        </div>
        <p style="font-size:13px;color:var(--ink2)">Distretti: NO = Nord-Ovest, NE = Nord-Est, SO = Sud-Ovest, SE = Sud-Est. Il fiume divide Nord e Sud.</p>
        ${prefToggle('jackRotate', '🔄 Ruota la mappa a caso a ogni turno (chi guarda le dita non capisce dove tocchi)')}`];
    }

    if (ph === 'policeSetup') {
      const sel = U.psel ?? 0;
      const all = S.det.every(j => j !== null);
      const rows = detRows().map(({ j, i }) => `<button class="det-row ${sel === i ? 'sel' : ''}" data-act="psel" data-i="${i}"><span class="dot" style="background:${DETS[i].color}"></span>${DETS[i].name}<span class="st">${j === null ? 'da piazzare' : 'piazzato'}</span></button>`).join('');
      return ['🕵 Polizia · Schieramento', `Mappa: ${S.map && S.map.name ? S.map.name : 'Piccola'}`, `
        <h2>🕵 Schiera i detective</h2>
        <div class="hint">Seleziona un detective e tocca uno dei posti di guardia ⚑ evidenziati. Poi Jack, vedendo dove siete, sceglierà da quale lampione partire. I detective resteranno dove si trovano anche nelle notti successive.</div>
        <div class="det-list">${rows}</div>
        ${policeHandHtml(false)}
        <div class="btn-row"><button class="primary blue" data-act="psetup-confirm" ${all ? '' : 'disabled'}>Conferma e passa a Jack</button></div>
        ${prefToggle('centerDet', '◎ Centra la mappa sul detective selezionato')}`];
    }

    if (ph === 'jackTurn') {
      if (!U.jm) U.jm = { mode: 'normal', steps: [] };
      const jm = U.jm;
      const L = limit();
      const t = currentTarget();
      const dt = M.dist(J.pos)[t];
      const need = jackStepsNeeded(jm.mode);
      const ready = jm.steps.length === need;
      const modeBtn = (m, icon, name, count) => {
        const n = jackOptions(m, []).length;
        return `<button class="${jm.mode === m ? 'sel' : ''}" data-act="mode" data-m="${m}" ${n ? '' : 'disabled'}><span class="e">${icon}</span>${name}${count !== undefined ? ` (${count})` : ''}</button>`;
      };
      let hint;
      const opts = jackOptions(jm.mode, jm.steps);
      if (ready) hint = `Destinazione: luogo <b>${num(jm.steps[jm.steps.length - 1])}</b>. Conferma la mossa.`;
      else if (jm.mode === 'coach') hint = jm.steps.length ? 'Carrozza: tocca il 2º luogo.' : 'Carrozza: tocca il 1º luogo (poi il 2º).';
      else if (jm.mode === 'normal') hint = opts.length ? 'Tocca un luogo evidenziato adiacente (strade senza detective sugli incroci).' : 'Nessun movimento normale possibile: usa una mossa speciale.';
      else hint = SPECIAL[jm.mode].desc;
      const folla = U.follaPick !== undefined && U.follaPick !== null
        ? `<div class="hint">Folla al mercato: scegli il detective da rallentare.</div><div class="btn-row">${detRows(true).map(({ i }) => `<button data-act="folla-pick" data-i="${i}" style="border-color:${DETS[i].color}">${DETS[i].name}</button>`).join('')}<button data-act="folla-cancel">Annulla</button></div>` : '';
      const hand = S.settings.cards ? `<h3>🃏 Le tue carte</h3>${J.hand.length ? `<div class="cards">${J.hand.map((k, i) => cardHtml(JACK_CARDS[k], 'jcard', i)).join('')}</div>` : '<p style="color:var(--ink2)">Nessuna carta.</p>'}` : '';
      const tl = J.targets.map((x, i) => `<span class="chip ${i < S.night ? 'done' : i === S.night ? 'cur' : ''}">N${i + 1}: ${num(x)}</span>`).join('');
      return [`🔪 Jack · Turno ${S.turn + 1}`, `Notte ${S.night + 1}/${S.settings.nights} · mosse ${S.moves}/${L} · meta ${num(t)} (distanza ${dt})`, `
        ${statsChips()}
        <div class="targets">${tl}</div>
        <div class="modes">
          ${modeBtn('normal', '👣', 'Normale')}
          ${modeBtn('coach', SPECIAL.coach.icon, 'Carrozza', J.tokens.coach)}
          ${modeBtn('alley', SPECIAL.alley.icon, 'Vicolo', J.tokens.alley)}
          ${modeBtn('boat', SPECIAL.boat.icon, 'Barca', J.tokens.boat)}
        </div>
        <div class="hint">${hint}</div>
        <div class="btn-row">
          <button data-act="jack-undo" ${jm.steps.length ? '' : 'disabled'}>↶ Annulla</button>
          <button class="primary" data-act="jack-confirm" ${ready ? '' : 'disabled'}>Conferma mossa</button>
        </div>
        ${folla}
        ${hand}
        ${prefToggle('jackRotate', '🔄 Ruota la mappa a caso a ogni turno (chi guarda le dita non capisce dove tocchi)')}`];
    }

    if (ph === 'policeTurn') {
      const pt = S.pt;
      const i = pt.sel, d = pt.d[i];
      const rows = detRows().map(({ i: k }) => {
        const dd = pt.d[k];
        const st = dd.acted ? 'fatto ✓' : dd.moved ? 'deve agire' : `muove ≤${dd.steps}`;
        return `<button class="det-row ${k === i ? 'sel' : ''} ${dd.acted ? 'done' : ''}" data-act="det-sel" data-i="${k}"><span class="dot" style="background:${DETS[k].color}"></span>${DETS[k].name}<span class="st">${st}</span></button>`;
      }).join('');
      let ctrl = '';
      const name = `<b style="color:${DETS[i].color}">${DETS[i].name}</b>`;
      if (pt.mode === 'search') {
        ctrl = `<div class="hint">${name}: tocca i luoghi adiacenti uno alla volta. Ti fermi al primo indizio trovato.${d.sniff ? ' 🐕 Cane da fiuto: un tocco controlla tutti i luoghi.' : ''}</div>
          <div class="btn-row"><button data-act="end-search" ${d.now.length ? '' : 'disabled'}>Termina ricerca</button>${d.now.length ? '' : '<button data-act="cancel-mode">Indietro</button>'}</div>`;
      } else if (pt.mode === 'arrest') {
        ctrl = `<div class="hint">${name}: tocca il luogo adiacente dove pensi sia Jack.</div><div class="btn-row"><button data-act="cancel-mode">Indietro</button></div>`;
      } else if (d.acted) {
        ctrl = `<div class="hint">${name} ha terminato. ${pt.d.every(x => x.acted) ? 'Tutti i detective hanno agito: termina il turno.' : 'Seleziona un altro detective.'}</div>`;
      } else if (!d.moved) {
        ctrl = `<div class="hint">${name}: tocca un incrocio evidenziato per muovere (fino a ${d.steps} incroci) oppure resta fermo.</div>
          <div class="btn-row"><button data-act="stay">Resta fermo</button></div>`;
      } else {
        const did = d.did;
        ctrl = `<div class="hint">${name}: scegli l'azione${d.double ? ' (Retata: puoi fare entrambe)' : ''}.</div>
          <div class="btn-row">
            <button class="blue" data-act="search" ${did.includes('search') ? 'disabled' : ''}>🔍 Cerca indizi</button>
            <button class="danger" data-act="arrest" ${did.includes('arrest') ? 'disabled' : ''}>⛓ Arresta</button>
            <button data-act="skip-action">${did.length ? 'Basta così' : 'Nessuna azione'}</button>
          </div>`;
      }
      const allDone = pt.d.every(x => x.acted);
      const rev = S.reveals.filter(r => r.label.startsWith('T')).map(r => `${r.label}: ${num(r.c)}`).join(', ');
      const sp = S.specials.filter(x => x.night === S.night).map(x => `T${x.turn} ${SPECIAL[x.type].icon}`).join(' · ');
      return [`🕵 Polizia · dopo il turno ${S.turn} di Jack`, `Notte ${S.night + 1}/${S.settings.nights} · mosse Jack ${S.moves}/${limit()}`, `
        ${statsChips()}
        ${rev ? `<p style="font-size:14px">👁 Rivelazioni: <b>${rev}</b></p>` : ''}
        ${sp ? `<p style="font-size:14px">Mosse speciali di Jack: ${sp}</p>` : ''}
        <div class="det-list">${rows}</div>
        ${ctrl}
        ${policeHandHtml(true)}
        <div class="btn-row"><button class="${allDone ? 'primary' : ''}" data-act="end-police">${allDone ? 'Fine turno → passa a Jack' : 'Termina turno in anticipo'}</button></div>
        ${prefToggle('centerDet', '◎ Centra la mappa sul detective selezionato')}`];
    }

    if (ph === 'gameOver') {
      const jw = S.winner === 'jack';
      const recap = J.paths.map((p, i) => `<li><b>Notte ${i + 1}</b>: ${p.map(num).join(' → ')}</li>`).join('');
      return [jw ? '🔪 Vince Jack' : '🕵 Vince la Polizia', 'Partita terminata', `
        <h2>${jw ? '🔪 Jack ha vinto!' : '🕵 La Polizia ha vinto!'}</h2>
        <p style="font-size:17px">${esc(S.reason)}</p>
        <h3>Il percorso di Jack</h3>
        <ul style="font-size:14px;padding-left:18px">${recap}</ul>
        <p style="font-size:14px">Mete pianificate: ${J.targets.map((t, i) => `N${i + 1}=${num(t)}`).join(', ')}</p>
        <div class="btn-row"><button class="primary" data-act="new">Nuova partita</button><button data-act="to-menu">Menu</button></div>`];
    }
    return ['', '', ''];
  }

  function policeHandHtml(playable) {
    if (!S.settings.cards) return '';
    const h = S.police.hand;
    return `<h3>🃏 Carte della Polizia</h3>${h.length ? `<div class="cards">${h.map((k, i) => cardHtml(POLICE_CARDS[k], playable ? 'pcard' : null, i)).join('')}</div>` : '<p style="color:var(--ink2)">Nessuna carta.</p>'}${playable ? '' : '<p style="font-size:13px;color:var(--ink2)">Le carte si giocano durante il turno della Polizia.</p>'}`;
  }

  // ---------------- Schermate ----------------
  function renderMenu() {
    closeModal();
    const sc = ensureScreen();
    sc.className = 'screen';
    const saved = loadSave();
    sc.innerHTML = `<div class="inner">
      <div class="title-logo"><h1>Ombre sul Tamigi</h1><p>Londra, 1888. Un assassino si muove nella nebbia.</p></div>
      <div class="menu-btns">
        ${saved && saved.phase !== 'gameOver' ? '<button class="primary" data-act="continue">▶ Continua partita</button>' : ''}
        <button class="${saved && saved.phase !== 'gameOver' ? '' : 'primary'}" data-act="setup">✦ Nuova partita</button>
        <button data-act="guide">🌍 Guida rapida · Guide rapide · Quick start</button>
        <button data-act="rules">📖 Regole complete</button>
      </div>
      <p style="text-align:center;color:var(--ink2);font-size:14px;margin-top:28px">Gioco a movimento nascosto per 2+ giocatori su un solo dispositivo: uno è Jack, gli altri la Polizia.<br>Passatevi il telefono o il tablet quando richiesto.</p>
    </div>`;
  }

  function renderSettings() {
    const s = loadSettings();
    const sc = ensureScreen();
    sc.className = 'screen';
    const sel = (name, vals, cur, fmt) => `<select name="${name}">${vals.map(v => `<option value="${v}" ${v === cur ? 'selected' : ''}>${fmt ? fmt(v) : v}</option>`).join('')}</select>`;
    sc.innerHTML = `<div class="inner">
      <h1 style="color:var(--gold);text-align:center;font-variant:small-caps">Nuova partita</h1>
      <form class="box" id="setform" onsubmit="return false">
        <div class="form-row"><label>Notti (delitti)<small>Jack deve colpire in ogni notte</small></label>${sel('nights', [3, 4], s.nights)}</div>
        <div class="form-row"><label>Mosse per notte<small>Limite per raggiungere la meta</small></label>${sel('limit', [12, 13, 14, 15, 16, 17, 18, 20], s.limit)}</div>
        <div class="form-row"><label>Mappa<small>Le casuali hanno ~189 luoghi e sono verificate con partite simulate</small></label>${sel('mapMode', ['random', 'certified', 'classic'], s.mapMode, v => ({ random: 'Casuale bilanciata (nuova)', certified: 'Casuale certificata (istantanea)', classic: 'Piccola (64 luoghi)' }[v]))}</div>
        <div class="form-row"><label>Rivelazione ogni X turni<small>All'inizio del turno della Polizia un testimone rivela dove si trovava Jack</small></label>${sel('reveal', [0, 3, 4, 5, 6, 7], s.reveal, v => (v ? 'ogni ' + v : 'mai'))}</div>
        <div class="form-row"><label>Ritardo della rivelazione<small>Quanti turni prima risale l'avvistamento (3 = bilanciato)</small></label>${sel('revealLag', [0, 1, 2, 3, 4], s.revealLag, v => (v ? v + ' turni prima' : 'posizione attuale (difficile per Jack)'))}</div>
        <div class="form-row"><label>Gettoni speciali<small>Per tipo: Carrozza, Vicolo, Barca</small></label>${sel('specials', [1, 2, 3], s.specials)}</div>
        <div class="form-row"><label>Detective<small>Numero di pedine della Polizia</small></label>${sel('detectives', [2, 3, 4], s.detectives)}</div>
        <div class="form-row"><label>Carte evento (opzionali)<small>Ogni notte Jack e la Polizia pescano una carta</small></label><span class="switch"><input type="checkbox" name="cards" ${s.cards ? 'checked' : ''}><span></span></span></div>
      </form>
      <div class="btn-row"><button data-act="to-menu">← Indietro</button><button class="primary" data-act="start-game">Inizia</button></div>
    </div>`;
  }

  function renderRules() {
    closeModal();
    const sc = ensureScreen();
    sc.className = 'screen';
    const cards = (obj) => Object.values(obj).map(c => cardHtml(c)).join('');
    sc.innerHTML = `<div class="inner rules">
      <h1 style="color:var(--gold);text-align:center;font-variant:small-caps">Regole</h1>
      <div class="box">
        <h3>Obiettivo</h3>
        <p><b>Jack</b> deve compiere un delitto in ogni notte raggiungendo in segreto il luogo scelto all'inizio, entro il limite di mosse. <b>La Polizia</b> vince se lo arresta, se lo circonda (nessuna mossa possibile) o se Jack non raggiunge la meta in tempo.</p>
        <h3>La mappa</h3>
        <ul>
          <li><b>Cerchi numerati</b> = luoghi. Jack si muove solo sui luoghi.</li>
          <li><b>Quadrati</b> = incroci. I detective si muovono solo sugli incroci.</li>
          <li>Il <b>fiume</b> divide la città in Nord e Sud; si attraversa solo sui ponti (o in barca). I cerchi azzurri sono luoghi sul fiume.</li>
          <li>La città ha 4 distretti: Nord-Ovest, Nord-Est, Sud-Ovest, Sud-Est.</li>
        </ul>
        <h3>Preparazione</h3>
        <p>La Polizia schiera per prima i detective sui <b>posti di guardia ⚑</b> (6 incroci, 3 a Nord e 3 a Sud). Poi Jack, vedendo dove sono, sceglie in segreto uno dei 4 lampioni ✦ come partenza (verrà rivelato) e un luogo del delitto per ogni notte, ognuno in un distretto diverso.</p>
        <p>I detective <b>non vengono ricollocati</b> tra una notte e l'altra: ripartono da dove si trovano.</p>
        <h3>Turno di Jack</h3>
        <ul>
          <li><b>Movimento normale</b>: verso un luogo che condivide un incrocio con quello attuale. Non può attraversare un incrocio occupato da un detective.</li>
          <li><b>${SPECIAL.coach.icon} Carrozza</b>: ${SPECIAL.coach.desc}</li>
          <li><b>${SPECIAL.alley.icon} Vicolo</b>: ${SPECIAL.alley.desc}</li>
          <li><b>${SPECIAL.boat.icon} Barca</b>: ${SPECIAL.boat.desc}</li>
          <li>L'uso di una mossa speciale è annunciato alla Polizia (ma non la destinazione). Ogni gettone si usa una volta per partita.</li>
          <li>Ogni movimento costa 1 mossa (Carrozza 2). Raggiunta la meta, il delitto viene rivelato e inizia la notte successiva da quel luogo.</li>
        </ul>
        <h3>Rivelazione periodica</h3>
        <p>Ogni X turni di Jack (impostabile), all'inizio del turno della Polizia un testimone rivela dove si trovava Jack. Con il ritardo standard (3 turni) viene mostrato il luogo in cui era 3 turni prima. Si può impostare il ritardo a 0 (posizione attuale), ma le simulazioni mostrano che così Jack vince solo ~6% delle partite. Il punto resta segnato in viola per tutta la notte.</p>
        <h3>Mappe e bilanciamento</h3>
        <p>Le mappe casuali hanno la scala del gioco da tavolo di riferimento (~189 luoghi, 3 detective). Ogni mappa viene provata simulando molte partite tra due IA. La Polizia usa solo informazioni pubbliche. Si tiene la mappa in cui Jack vince circa il 50% delle volte con le regole scelte. La mappa "Piccola" (64 luoghi) è più veloce ma favorisce la Polizia.</p>
        <h3>Turno della Polizia</h3>
        <ul>
          <li>Ogni detective si muove fino a <b>2 incroci</b> (può attraversare incroci occupati ma non fermarsi su di essi), poi compie un'azione:</li>
          <li><b>🔍 Cerca indizi</b>: controlla uno alla volta i luoghi che toccano il suo incrocio. Se Jack è passato da lì in questa notte, trova un indizio (cerchio giallo) e smette di cercare. I luoghi senza indizio sono segnati con ×.</li>
          <li><b>⛓ Arresta</b>: sceglie un solo luogo adiacente. Se Jack è lì, la Polizia vince.</li>
        </ul>
        <h3>Appunti della Polizia</h3>
        <p>Il menu 📜 contiene il registro pubblico della partita e un blocco appunti. Con ✎ sulla mappa puoi segnare i luoghi come sospetti (?) o esclusi (✗). Gli appunti sono visibili solo nelle schermate della Polizia.</p>
        <h3>Passare il dispositivo</h3>
        <p>Quando cambia il turno appare una schermata di copertura: consegna il dispositivo e lascia che sia il giocatore giusto a toccare per continuare.</p>
        <h3>Carte evento (opzionali)</h3>
        <p>All'inizio di ogni notte Jack e la Polizia pescano una carta. Ogni carta si usa una volta.</p>
        <p><b>Carte di Jack</b> (le carte segrete vengono annunciate solo come "carta segreta"):</p>
        <div class="card-list">${cards(JACK_CARDS)}</div>
        <p><b>Carte della Polizia</b>:</p>
        <div class="card-list">${cards(POLICE_CARDS)}</div>
        <h3>Comandi</h3>
        <p>Trascina per spostare la mappa, pizzica con due dita o usa la rotella per lo zoom. ⤢ mostra tutta la mappa, ◎ centra sull'azione.</p>
      </div>
      <div class="btn-row"><button class="primary" data-act="${S ? 'rules-back' : 'to-menu'}">← Indietro</button></div>
    </div>`;
  }

  // Guida rapida in Italiano / Français / English
  function guideLang() {
    if (prefs.lang && QUICKSTART[prefs.lang]) return prefs.lang;
    const n = (navigator.language || 'it').slice(0, 2).toLowerCase();
    return QUICKSTART[n] ? n : 'it';
  }
  function renderGuide(lang) {
    closeModal();
    lang = lang || guideLang();
    const G = QUICKSTART[lang];
    const sc = ensureScreen();
    sc.className = 'screen';
    sc.scrollTop = 0;
    const back = { it: '← Indietro', fr: '← Retour', en: '← Back' }[lang];
    sc.innerHTML = `<div class="inner rules" lang="${lang}">
      <div class="tabs lang-tabs">${Object.keys(QUICKSTART).map(k => `<button class="${k === lang ? 'on' : ''}" data-act="guide-lang" data-l="${k}">${QUICKSTART[k].flag} ${QUICKSTART[k].lang}</button>`).join('')}</div>
      <h1 style="color:var(--gold);text-align:center;font-variant:small-caps">${G.title}</h1>
      <div class="box">
        <p style="font-size:17px">${G.intro}</p>
        ${G.sections.map(([h, b]) => `<h3>${h}</h3><div>${b}</div>`).join('')}
      </div>
      <div class="btn-row"><button class="primary" data-act="${S ? 'rules-back' : 'to-menu'}">${back}</button></div>
    </div>`;
  }

  function renderHandoff() {
    closeModal();
    const sc = ensureScreen();
    const jack = S.handoff === 'jack';
    sc.className = 'screen handoff ' + (jack ? 'jack' : 'police');
    let msg;
    if (jack) msg = S.phase === 'jackSetup' ? 'I detective sono schierati. Jack prepara il suo piano segreto: la Polizia non deve guardare lo schermo.' : 'Tocca a Jack muovere. La Polizia non deve guardare lo schermo.';
    else if (S.phase === 'policeSetup') msg = 'La Polizia schiera per prima i detective sui posti di guardia.';
    else if (S.phase === 'nightIntro') msg = S.night === 0 ? 'Il piano di Jack è pronto. Mostrate a tutti dove è stato avvistato.' : 'Jack ha colpito di nuovo! Mostrate a tutti il luogo del delitto.';
    else msg = 'Jack ha mosso. Consegna il dispositivo alla Polizia.';
    sc.innerHTML = `<div class="inner">
      <div class="big">${jack ? '🔪' : '🕵'}</div>
      <h1>Passa il dispositivo ${jack ? 'a JACK' : 'alla POLIZIA'}</h1>
      <p>${msg}</p>
      <button class="${jack ? 'danger' : 'blue'}" data-act="handoff-ok">${jack ? 'Sono Jack: mostra' : 'Siamo la Polizia: mostra'}</button>
      <div class="note">Notte ${S.night + 1}/${S.settings.nights}${S.turn ? ` · turno ${S.turn}` : ''}</div>
    </div>`;
  }

  function renderNightIntro() {
    closeModal();
    const sc = ensureScreen();
    sc.className = 'screen handoff police';
    const first = S.night === 0;
    const lag = S.settings.revealLag || 0;
    sc.innerHTML = `<div class="inner">
      <div class="big">${first ? '🌙' : '🩸'}</div>
      <h1>Notte ${S.night + 1} di ${S.settings.nights}</h1>
      <p style="font-size:18px;color:var(--ink)">${first ? `Jack è stato avvistato presso il lampione al luogo <b>${num(S.jack.pos)}</b>.` : `Un nuovo delitto! Il corpo è stato trovato al luogo <b>${num(S.jack.pos)}</b>. Da qui Jack riparte.`}</p>
      <p>Jack ha ${limit()} mosse per raggiungere il prossimo luogo. ${S.settings.reveal ? (lag ? `Ogni ${S.settings.reveal} turni un testimone dirà dove si trovava Jack ${lag} turni prima.` : `Ogni ${S.settings.reveal} turni la sua posizione verrà rivelata.`) : ''} I detective restano dove si trovano.</p>
      ${S.settings.cards ? `<div class="box" style="text-align:left"><p>${S.drawn.police ? 'La Polizia ha pescato una carta (la vede nel suo pannello).' : 'Il mazzo della Polizia è esaurito.'}</p><p>${S.drawn.jack ? 'Jack ha pescato una carta segreta.' : 'Jack non pesca carte.'}</p></div>` : ''}
      <button class="danger" data-act="night-ok">Inizia la notte: tocca a Jack</button>
    </div>`;
  }

  function showLogSheet(tab) {
    tab = tab || U.logTab || 'log';
    const police = isPoliceView();
    if (!police && tab === 'notes') tab = 'log';
    U.logTab = tab;
    const items = S.log.slice().reverse().map(e => `<li class="${e.cls}"><span class="t">N${e.n}${e.t ? ' T' + e.t : ''}</span>${esc(e.txt)}</li>`).join('');
    const marks = Object.keys(S.notes.marks).length;
    let body;
    if (tab === 'log') body = `<ul class="log-list">${items || '<li>Nessun evento.</li>'}</ul>`;
    else if (tab === 'notes') body = `<p style="margin-top:0;color:var(--ink2);font-size:14px">Appunti privati della Polizia (salvati automaticamente).</p>
      <textarea class="notes-area" data-notes placeholder="Es.: T3 indizio al 24, forse si dirige verso il ponte...">${esc(S.notes.text)}</textarea>
      <div class="btn-row"><button data-act="mark-mode">✎ Segna sulla mappa</button><button data-act="mark-clear" ${marks ? '' : 'disabled'}>Cancella segni (${marks})</button></div>`;
    else body = legendHtml();
    showModal(`<h2>📜 ${police ? 'Appunti degli agenti' : 'Registro'}</h2>
      <div class="tabs"><button class="${tab === 'log' ? 'on' : ''}" data-act="tab" data-t="log">Registro</button>${police ? `<button class="${tab === 'notes' ? 'on' : ''}" data-act="tab" data-t="notes">Appunti</button>` : ''}<button class="${tab === 'legend' ? 'on' : ''}" data-act="tab" data-t="legend">Legenda</button></div>
      <div class="tab-body">${body}</div>
      <div class="btn-row"><button class="primary" data-act="close-modal">Chiudi</button></div>`, 'sheet');
    const ta = modalRoot.querySelector('[data-notes]');
    if (ta) ta.addEventListener('input', () => { S.notes.text = ta.value; save(); });
  }

  function legendHtml() {
    const sw = inner => `<svg width="44" height="44" viewBox="-22 -22 44 44">${inner}</svg>`;
    const loc = '<circle r="13" fill="#ecdfc4" stroke="#1d1712" stroke-width="2"/>';
    return `<ul class="legend">
      <li>${sw(loc + '<text y="1" text-anchor="middle" dominant-baseline="central" font-size="11" font-weight="bold" fill="#1d1712">12</text>')} Luogo (Jack si muove qui)</li>
      <li>${sw('<circle r="13" fill="#cfe0ea" stroke="#1d1712" stroke-width="2"/>')} Luogo sul fiume (Barca)</li>
      <li>${sw('<rect x="-8" y="-8" width="16" height="16" fill="#a68f6c"/>')} Incrocio (detective)</li>
      <li>${sw('<line x1="-20" y1="0" x2="20" y2="0" stroke="#e0353d" stroke-width="4" stroke-dasharray="8 5"/>')} Confine tra i 4 distretti</li>
      <li>${sw(loc + '<circle r="18" fill="none" stroke="#c0353b" stroke-width="4"/>')} Delitto / avvistamento (★ partenza, ✝n notte n)</li>
      <li>${sw(loc + '<circle r="17" fill="none" stroke="#f1d36b" stroke-width="4"/>')} Indizio trovato in questa notte</li>
      <li>${sw(loc + '<path d="M4 4l8 8m0-8l-8 8" stroke="#8d8d8d" stroke-width="3"/>')} Cercato: nessun indizio</li>
      <li>${sw(loc + '<circle r="19" fill="none" stroke="#b78ef0" stroke-width="3" stroke-dasharray="5 4"/>')} Posizione rivelata (T = turno, 📠 = telegrafo)</li>
      <li>${sw('<circle r="13" fill="#e05252" stroke="#fff" stroke-width="3"/>')} Detective</li>
      <li>${sw(loc + '<g><circle cx="10" cy="-10" r="8" fill="#f0a930"/><text x="10" y="-10" text-anchor="middle" dominant-baseline="central" font-size="11" font-weight="bold">?</text></g>')} Appunto: sospetto (✗ = escluso)</li>
    </ul>`;
  }

  // Sceglie/genera la mappa secondo le impostazioni e avvia la partita
  async function startWithMap(s) {
    if (s.mapMode === 'classic') return newGame(s, { params: null, name: 'Piccola (64 luoghi)', jackRate: null });
    if (s.mapMode === 'certified' && CERTIFIED.length) {
      const m = CERTIFIED[Math.floor(Math.random() * CERTIFIED.length)];
      const std = Sim.DEFAULT_SETTINGS;
      const same = ['nights', 'limit', 'reveal', 'revealLag', 'specials', 'detectives'].every(k => s[k] === std[k]);
      return newGame(s, { params: m.params, name: `Certificata #${m.params.seed}`, jackRate: same ? m.jackRate : null, ci95: m.ci95, games: m.games });
    }
    // Generazione bilanciata dal vivo, per le regole scelte
    const sc = ensureScreen();
    sc.className = 'screen handoff';
    U.genCancel = false;
    sc.innerHTML = `<div class="inner">
      <div class="big">🗺️</div>
      <h1>Disegno la città…</h1>
      <p>Genero mappe casuali e simulo partite tra Jack e la Polizia per tenere quella più equilibrata.</p>
      <div class="progress"><div class="bar" style="width:0%"></div></div>
      <p class="note gen-info">Preparazione…</p>
      <button data-act="gen-cancel">Usa la migliore trovata finora</button>
    </div>`;
    const bar = sc.querySelector('.bar'), info = sc.querySelector('.gen-info');
    const seed = (Math.random() * 4294967295) >>> 0;
    const res = await Sim.generateBalanced(MapGen, simSettings(s), {
      seed, candidates: 12, games: 80, confirmGames: 240, tolerance: 0.06,
      shouldStop: () => U.genCancel,
      onProgress: (f, p) => {
        bar.style.width = Math.round(f * 100) + '%';
        if (p.candidate) info.textContent = `Mappa candidata ${p.candidate} di ${p.of}${p.bestRate !== undefined ? ` · migliore finora: Jack vince ${Math.round(p.bestRate * 100)}%` : ''}`;
      },
    });
    const b = res.best;
    if (!b) return newGame(s, { params: null, name: 'Piccola (64 luoghi)', jackRate: null });
    return newGame(s, { params: b.params, name: `Casuale #${b.params.seed}`, jackRate: b.rate, ci95: b.ci95, games: b.games, balanced: res.balanced });
  }

  // Una partita ripresa riparte sempre da una schermata di copertura
  function coverIfPrivate() {
    if (!S || S.handoff) return;
    if (S.phase === 'jackSetup' || S.phase === 'jackTurn') S.handoff = 'jack';
    else if (S.phase === 'policeSetup' || S.phase === 'policeTurn' || S.phase === 'nightIntro') S.handoff = 'police';
  }

  // ---------------- Gestione azioni ----------------
  function act(a, el) {
    const i = el && el.dataset.i !== undefined ? +el.dataset.i : undefined;
    switch (a) {
      case 'setup': return renderSettings();
      case 'rules': return renderRules();
      case 'guide': return renderGuide();
      case 'guide-lang': prefs.lang = el.dataset.l; savePrefs(); return renderGuide(el.dataset.l);
      case 'rules-back': closeModal(); return render();
      case 'to-menu': closeModal(); S = null; S = null; renderMenu(); return;
      case 'continue': S = loadSave(); U = {}; if (!S) return renderMenu(); useMap(S.map ? S.map.params : null); coverIfPrivate(); return render();
      case 'new': closeModal(); return renderSettings();
      case 'start-game': {
        const f = document.getElementById('setform');
        const s = {
          nights: +f.nights.value, limit: +f.limit.value, reveal: +f.reveal.value,
          specials: +f.specials.value, detectives: +f.detectives.value, cards: f.cards.checked,
          revealLag: +f.revealLag.value, mapMode: f.mapMode.value,
        };
        saveSettings(s);
        return startWithMap(s);
      }
      case 'gen-cancel': U.genCancel = true; return;
      case 'handoff-ok': S.handoff = null; U.screenKey = null; return render();
      case 'night-ok':
        // detective fermi tra le notti: Jack potrebbe essere gia' circondato (come nel simulatore)
        if (!jackHasAnyMove()) return endGame('police', 'Jack è circondato fin dall’inizio della notte: non ha vie di fuga!');
        S.phase = 'jackTurn'; S.handoff = 'jack'; U = {}; return render();
      case 'menu':
        return showModal(`<h2>☰ Menu</h2><p>La partita viene salvata automaticamente su questo dispositivo.</p>
          <p style="font-size:14px;color:var(--ink2)">Mappa: ${esc(S.map && S.map.name ? S.map.name : 'Piccola (64 luoghi)')} · ${M.C.length} luoghi${S.map && S.map.jackRate != null ? ` · nelle simulazioni Jack vince il ${Math.round(S.map.jackRate * 100)}%${S.map.ci95 ? ` ±${Math.round(S.map.ci95 * 100)}` : ''} (${S.map.games} partite di conferma)${S.map.balanced === false ? ' · non è stata trovata una mappa entro la tolleranza: è la più vicina' : ''}` : ''}</p>
          <div class="menu-btns" style="max-width:none">
            <button data-act="close-modal" class="primary">Riprendi</button>
            <button data-act="guide">🌍 Guida rapida · Guide · Quick start</button>
            <button data-act="rules">📖 Regole</button>
            <button data-act="to-menu-save">Torna al menu principale</button>
            <button data-act="quit" class="danger">Abbandona partita</button>
          </div>`);
      case 'to-menu-save': closeModal(); coverIfPrivate(); save(); S = null; renderMenu(); return;
      case 'quit':
        return showModal(`<h2>Abbandonare la partita?</h2><p>La partita salvata verrà cancellata.</p><div class="btn-row"><button data-act="close-modal">No</button><button class="danger" data-act="quit-yes">Sì, abbandona</button></div>`);
      case 'quit-yes': closeModal(); S = null; save(); return renderMenu();
      case 'close-modal': closeModal(); return;
      case 'log': return showLogSheet();
      case 'tab': return showLogSheet(el.dataset.t);
      case 'mark-mode': closeModal(); U.markMode = true; return render();
      case 'mark-clear': S.notes.marks = {}; save(); render(); return showLogSheet('notes');
      case 'reveal-ok': {
        const r = S.pendingReveal;
        S.revealShow = false; S.pendingReveal = null;
        closeModal();
        render();
        if (r && !r.fog) focusPts([P(r.c)].concat(S.det.filter(j => j !== null).map(j => M.J[j])));
        return;
      }

      // Setup Jack
      case 'setup-undo': {
        const J = S.jack;
        if (J.targets.length) J.targets.pop(); else J.start = null;
        return render();
      }
      case 'setup-confirm': return confirmJackSetup();

      // Setup polizia
      case 'psel': U.psel = i; return render();
      case 'psetup-confirm':
        if (S.det.some(j => j === null)) return;
        addLog('Detective schierati sui posti di guardia.');
        S.phase = 'jackSetup'; S.handoff = 'jack'; U = {};
        return render();

      // Turno Jack
      case 'mode': U.jm = { mode: el.dataset.m, steps: [] }; return render();
      case 'jack-undo': if (U.jm) U.jm.steps.pop(); return render();
      case 'jack-confirm':
        if (!U.jm || U.jm.steps.length !== jackStepsNeeded(U.jm.mode)) return;
        return applyJackMove();
      case 'jcard': return playJackCard(i);
      case 'folla-pick': return playJackCard(U.follaPick, i);
      case 'folla-cancel': U.follaPick = null; return render();

      // Turno polizia
      case 'det-sel':
        if (S.pt.mode && i !== S.pt.sel) return toast('Completa prima l’azione in corso.');
        S.pt.sel = i; return render();
      case 'stay': S.pt.d[S.pt.sel].moved = true; return render();
      case 'search': {
        const d = S.pt.d[S.pt.sel];
        S.pt.mode = 'search';
        if (d.sniff) { searchAt(S.pt.sel, null); }
        return render();
      }
      case 'arrest': S.pt.mode = 'arrest'; return render();
      case 'cancel-mode': S.pt.mode = null; return render();
      case 'end-search': finishAction(S.pt.sel, 'search'); return render();
      case 'skip-action': finishAction(S.pt.sel, 'skip'); return render();
      case 'pcard': return playPoliceCard(i);
      case 'end-police':
        if (!S.pt.d.every(x => x.acted)) {
          return showModal(`<h2>Terminare il turno?</h2><p>Alcuni detective non hanno ancora agito.</p><div class="btn-row"><button data-act="close-modal">No</button><button class="primary" data-act="end-police-yes">Sì, passa a Jack</button></div>`);
        }
        return endPoliceTurn();
      case 'end-police-yes': closeModal(); return endPoliceTurn();
    }
  }

  document.addEventListener('change', e => {
    const inp = e.target.closest('[data-pref]');
    if (!inp || !S) return;
    prefs[inp.dataset.pref] = inp.checked;
    savePrefs();
    if (inp.dataset.pref === 'jackRotate') {
      setRotation(inp.checked ? 20 + Math.floor(Math.random() * 320) : 0);
      focusPts(U.focus || []);
    }
    if (inp.dataset.pref === 'centerDet' && inp.checked) {
      const j = selDetJ();
      if (j !== null && j !== undefined) centerOn(M.J[j], 0.7);
    }
  });

  document.addEventListener('click', e => {
    const b = e.target.closest('[data-act]');
    if (!b || b.disabled) return;
    act(b.dataset.act, b);
  });

  // Avvio
  S = null;
  renderMenu();
})();
