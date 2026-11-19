'use strict';
/*
 * Ombre sul Tamigi — simulatore di partite e misura del bilanciamento.
 * Riproduce le regole di game.js (senza carte evento) con due IA:
 *  - Jack: conosce tutto; si avvicina alla meta evitando i detective, usa le mosse speciali quando servono.
 *  - Polizia: usa SOLO informazioni pubbliche. Mantiene la distribuzione delle posizioni possibili di Jack
 *    (filtro esatto sui percorsi compatibili con: partenza, mosse speciali annunciate, incroci bloccati,
 *    rivelazioni, ricerche senza indizio, indizi trovati, arresti falliti).
 * Funziona sia nel browser (window.Sim) sia in Node (require).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Sim = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const DEFAULT_SETTINGS = { nights: 4, limit: 15, reveal: 5, revealLag: 3, specials: 2, detectives: 3 };
  const MAX_CLUE_BITS = 5;
  // Parametri IA scelti con una ricerca a griglia per rendere entrambe le IA il piu' forti possibile
  const DEFAULT_AI = { jackDanger: 0.8, jackNoise: 0.4, jackRush: 2.5, jackStealth: 2, policeArrest: 0.3, policeNoise: 0.05, policeTargetInfo: true };

  // ---------- cache per mappa ----------
  function prepare(M) {
    if (M._sim) return M._sim;
    const n = M.C.length;
    const distAll = new Array(n);
    const dist = s => distAll[s] || (distAll[s] = M.dist(s));
    // distanze tra incroci
    const jd = new Array(M.J.length);
    const jdist = s => {
      if (jd[s]) return jd[s];
      const d = new Array(M.J.length).fill(Infinity); d[s] = 0;
      const q = [s];
      while (q.length) { const x = q.shift(); for (const y of M.jAdj[x]) if (d[y] === Infinity) { d[y] = d[x] + 1; q.push(y); } }
      return (jd[s] = d);
    };
    M._sim = { dist, jdist };
    return M._sim;
  }

  function normalMoves(M, from, det) {
    const out = [];
    for (const e of M.adj[from]) if (!e.via.some(j => det.includes(j)) && !out.includes(e.to)) out.push(e.to);
    return out;
  }

  // Tutte le mosse legali: {type, visits:[...], end, cost}
  // target: le mosse speciali non possono entrare nel luogo della meta (come nell'originale)
  function legalMoves(M, J, det, left, target) {
    const res = [];
    if (left >= 1) {
      normalMoves(M, J.pos, det).forEach(c => res.push({ type: 'normal', visits: [c], end: c, cost: 1 }));
      if (J.tokens.alley > 0) M.alley[J.pos].forEach(c => { if (c !== target) res.push({ type: 'alley', visits: [c], end: c, cost: 1 }); });
      if (J.tokens.boat > 0) M.boat[J.pos].forEach(c => { if (c !== target) res.push({ type: 'boat', visits: [c], end: c, cost: 1 }); });
    }
    if (left >= 2 && J.tokens.coach > 0) {
      normalMoves(M, J.pos, det).forEach(a => { if (a !== target) normalMoves(M, a, det).forEach(b => {
        if (b !== J.pos && b !== target) res.push({ type: 'coach', visits: [a, b], end: b, cost: 2 }); });
      });
    }
    return res;
  }

  // Scelta delle mete (stesse regole della schermata di Jack)
  function chooseTargets(M, settings, rnd, det) {
    const S = prepare(M);
    // Jack sceglie il lampione piu' lontano dai detective gia' schierati (con un po' di casualita')
    let ranked = M.lanterns.slice();
    if (det && det.length) {
      const score = l => { const c = M.C[l]; let m = Infinity; det.forEach(j => { const jd = S.jdist(j); m = Math.min(m, jd[c.a], jd[c.b]); }); return m + rnd() * 1.5; };
      const sc = new Map(ranked.map(l => [l, score(l)]));
      ranked.sort((a, b) => sc.get(b) - sc.get(a));
    }
    for (let attempt = 0; attempt < 200; attempt++) {
      const start = det && det.length && attempt < 20 ? ranked[0] : M.lanterns[Math.floor(rnd() * M.lanterns.length)];
      const targets = [];
      let prev = start, ok = true;
      for (let i = 0; i < settings.nights; i++) {
        const used = targets.map(t => M.C[t].district);
        const d = S.dist(prev);
        const opts = M.C.filter(c => c.district && !c.bank && !used.includes(c.district) && c.id !== start && !targets.includes(c.id)
          && d[c.id] >= 3 && d[c.id] <= settings.limit - 3).map(c => c.id);
        if (!opts.length) { ok = false; break; }
        // Jack preferisce mete abbastanza lontane da confondere le acque ma raggiungibili con margine
        const w = opts.map(c => { const x = d[c]; return x >= 5 && x <= settings.limit - 5 ? 3 : 1; });
        let r = rnd() * w.reduce((a, b) => a + b, 0), pick = opts[0];
        for (let k = 0; k < opts.length; k++) { r -= w[k]; if (r <= 0) { pick = opts[k]; break; } }
        targets.push(pick); prev = pick;
      }
      if (ok) return { start, targets };
    }
    return null;
  }

  // ---------- Credenza della Polizia (filtro esatto sui percorsi) ----------
  function computeBelief(M, info) {
    const clues = info.clues.slice(-MAX_CLUE_BITS);
    const bitOf = new Map();
    clues.forEach((c, i) => bitOf.set(c.c, (bitOf.get(c.c) || 0) | (1 << i)));
    const bits = c => bitOf.get(c) || 0;
    const T = info.turns.length;

    const okAt = (pos, t) => {
      for (const s of info.clean) if (s.c === pos && s.t >= t) return false;
      for (const r of info.reveals) if (r.t === t && r.c !== pos) return false;
      for (const a of info.arrests) if (a.t === t && a.c === pos) return false;
      return true;
    };
    const maskOkAt = (mask, t) => {
      for (let i = 0; i < clues.length; i++) if (clues[i].t === t && !(mask & (1 << i))) return false;
      return true;
    };

    let states = new Map();
    if (okAt(info.start, 0)) states.set(info.start * 64 + bits(info.start), 1);
    const visit = new Float64Array(M.C.length);
    visit[info.start] += 1;

    for (let t = 1; t <= T; t++) {
      const turn = info.turns[t - 1];
      const next = new Map();
      for (const [key, w] of states) {
        const pos = Math.floor(key / 64), mask = key % 64;
        let succ;
        if (turn.type === 'normal') succ = normalMoves(M, pos, turn.det).map(c => [c]);
        else if (turn.type === 'alley') succ = M.alley[pos].map(c => [c]);
        else if (turn.type === 'boat') succ = M.boat[pos].map(c => [c]);
        else {
          succ = [];
          normalMoves(M, pos, turn.det).forEach(a => normalMoves(M, a, turn.det).forEach(b => { if (b !== pos) succ.push([a, b]); }));
        }
        if (!succ.length) continue;
        const share = w / succ.length; // ogni mossa legale ugualmente probabile
        for (const vs of succ) {
          let m = mask, ok = true;
          for (let k = 0; k < vs.length; k++) {
            const v = vs[k];
            // la tappa intermedia della carrozza e' nel percorso: non puo' essere un luogo "pulito"
            if (k < vs.length - 1) for (const s of info.clean) if (s.c === v && s.t >= t) { ok = false; break; }
            if (!ok) break;
            m |= bits(v);
          }
          if (!ok) continue;
          const end = vs[vs.length - 1];
          if (!okAt(end, t) || !maskOkAt(m, t)) continue;
          const nk = end * 64 + m;
          next.set(nk, (next.get(nk) || 0) + share);
        }
      }
      // normalizza
      let sum = 0; for (const w of next.values()) sum += w;
      if (sum > 0) for (const [k, w] of next) next.set(k, w / sum);
      states = next;
      for (const [k, w] of states) visit[Math.floor(k / 64)] += w;
    }
    const prob = new Float64Array(M.C.length);
    for (const [k, w] of states) prob[Math.floor(k / 64)] += w;
    // Informazione pubblica sulla meta: sta in un distretto non ancora usato, a distanza 3..limite-3
    // dal delitto precedente. Le posizioni da cui non si arriva in tempo a nessuna meta possibile
    // (a piedi) sono poco probabili (non escluse: con le mosse speciali Jack puo' accorciare).
    if (info.targetDist && info.left !== undefined) {
      let sum = 0;
      for (let c = 0; c < prob.length; c++) {
        if (prob[c] > 0 && info.targetDist[c] > info.left) prob[c] *= 0.1;
        sum += prob[c];
      }
      if (sum > 0) for (let c = 0; c < prob.length; c++) prob[c] /= sum;
    }
    return { prob, visit, empty: states.size === 0 };
  }

  function multiDist(M, sources) {
    const d = new Array(M.C.length).fill(Infinity);
    const q = [];
    sources.forEach(s => { d[s] = 0; q.push(s); });
    while (q.length) { const x = q.shift(); for (const e of M.adj[x]) if (d[e.to] === Infinity) { d[e.to] = d[x] + 1; q.push(e.to); } }
    return d;
  }

  // Mete possibili note alla Polizia all'inizio di una notte (stesse regole della scelta di Jack)
  function publicTargets(M, settings, start0, prevTargets, from) {
    const used = prevTargets.map(t => M.C[t].district);
    const d = prepare(M).dist(from);
    return M.C.filter(c => c.district && !c.bank && !used.includes(c.district) && c.id !== start0 && !prevTargets.includes(c.id)
      && d[c.id] >= 3 && d[c.id] <= settings.limit - 3).map(c => c.id);
  }

  // ---------- Simulazione di una partita ----------
  function simulate(M, settings, seed, ai) {
    settings = Object.assign({}, DEFAULT_SETTINGS, settings || {});
    ai = Object.assign({}, DEFAULT_AI, ai || {});
    const S = prepare(M);
    const rnd = mulberry32(seed >>> 0);
    // Regola "posti di guardia": la Polizia si schiera sui posti di guardia PRIMA che Jack scelga la partenza,
    // e i detective restano dove sono tra una notte e l'altra (nessun ricollocamento).
    let det = settings.replace ? new Array(settings.detectives).fill(null) : stationPlacement(M, settings.detectives, rnd);
    const plan = chooseTargets(M, settings, rnd, settings.replace ? null : det);
    if (!plan) return { winner: 'invalid', reason: 'no-targets', nights: 0, turns: 0 };
    const J = { pos: plan.start, path: [plan.start], tokens: { coach: settings.specials, alley: settings.specials, boat: settings.specials } };
    let totalTurns = 0;

    for (let night = 0; night < settings.nights; night++) {
      const target = plan.targets[night];
      const dT = S.dist(target);
      J.path = [J.pos];
      let moves = 0, turn = 0;
      const info = { start: J.pos, turns: [], clean: [], clues: [], reveals: [], arrests: [] };
      if (ai.policeTargetInfo) info.targetDist = multiDist(M, publicTargets(M, settings, plan.start, plan.targets.slice(0, night), J.pos));
      const clueSet = new Set();
      const posAt = [J.pos];

      if (settings.replace) det = placeDetectives(M, J.pos, det, rnd);

      for (;;) {
        // --- Turno di Jack ---
        const L = settings.limit;
        const opts = legalMoves(M, J, det, L - moves, target);
        if (!opts.length) return { winner: 'police', reason: 'surrounded', nights: night, turns: totalTurns };
        const mv = jackChoose(M, S, J, det, opts, dT, target, L - moves, ai, rnd, ai.jackStealth > 0 ? publicForward(M, info, det) : null);
        if (mv.type !== 'normal') J.tokens[mv.type]--;
        mv.visits.forEach(c => J.path.push(c));
        moves += mv.cost; turn++; totalTurns++;
        J.pos = mv.end;
        info.turns.push({ type: mv.type, det: det.slice() });
        if (J.pos === target) break;
        if (moves >= L) return { winner: 'police', reason: 'time', nights: night, turns: totalTurns };
        posAt[turn] = J.pos;
        if (settings.reveal > 0 && turn % settings.reveal === 0) {
          const lag = Math.min(settings.revealLag || 0, turn);
          info.reveals.push({ t: turn - lag, c: posAt[turn - lag] });
        }

        // --- Turno della Polizia ---
        info.left = L - moves;
        let B = computeBelief(M, info);
        det = policeMove(M, S, det, B, rnd, ai);
        for (let i = 0; i < det.length; i++) {
          const adjC = M.jCircles[det[i]];
          let best = -1, bp = 0;
          adjC.forEach(c => { if (B.prob[c] > bp) { bp = B.prob[c]; best = c; } });
          let globalMax = 0; for (let k = 0; k < B.prob.length; k++) if (B.prob[k] > globalMax) globalMax = B.prob[k];
          if (best >= 0 && (bp >= ai.policeArrest || (bp >= 0.12 && bp >= globalMax * 0.999))) {
            if (best === J.pos) return { winner: 'police', reason: 'arrest', nights: night, turns: totalTurns };
            info.arrests.push({ t: turn, c: best });
          } else {
            // si puo' ricontrollare un luogo pulito di un turno precedente (Jack potrebbe esserci passato dopo)
            const order = adjC.filter(c => !clueSet.has(c) && !info.clean.some(s => s.c === c && s.t === turn)).sort((a, b) => B.visit[b] - B.visit[a]);
            for (const c of order) {
              if (J.path.includes(c)) { clueSet.add(c); info.clues.push({ t: turn, c }); break; }
              info.clean.push({ t: turn, c });
            }
          }
          B = computeBelief(M, info);
        }
        // Jack circondato?
        if (!legalMoves(M, J, det, L - moves, target).length) return { winner: 'police', reason: 'surrounded', nights: night, turns: totalTurns };
      }
    }
    return { winner: 'jack', reason: 'all', nights: settings.nights, turns: totalTurns };
  }

  // Ciò che la Polizia potrà dedurre dopo la prossima mossa di Jack, per ogni tipo di mossa:
  // distribuzione delle posizioni possibili (Jack conosce le stesse informazioni pubbliche).
  function publicForward(M, info, det) {
    const B = computeBelief(M, info);
    const out = {};
    for (const type of ['normal', 'alley', 'boat', 'coach']) {
      const f = new Float64Array(M.C.length);
      let sum = 0;
      B.prob.forEach((p, c) => {
        if (p <= 0) return;
        let succ;
        if (type === 'normal') succ = normalMoves(M, c, det);
        else if (type === 'alley') succ = M.alley[c];
        else if (type === 'boat') succ = M.boat[c];
        else { succ = []; normalMoves(M, c, det).forEach(a => normalMoves(M, a, det).forEach(b => { if (b !== c) succ.push(b); })); }
        if (!succ.length) return;
        succ.forEach(x => { f[x] += p / succ.length; sum += p / succ.length; });
      });
      if (sum > 0) for (let k = 0; k < f.length; k++) f[k] /= sum;
      out[type] = f;
    }
    return out;
  }

  function jackChoose(M, S, J, det, opts, dT, target, left, ai, rnd, fwd) {
    const win = opts.find(o => o.end === target);
    if (win) return win;
    const dNow = dT[J.pos];
    let best = null, bs = -Infinity;
    for (const o of opts) {
      const leftAfter = left - o.cost;
      const d = dT[o.end];
      const slack = leftAfter - d;
      const c = M.C[o.end];
      let danger = 0;
      for (const dj of det) {
        const jd = S.jdist(dj);
        const dd = Math.min(jd[c.a], jd[c.b]);
        if (dd === 0) danger += 3; else if (dd === 1) danger += 2; else if (dd === 2) danger += 1;
      }
      // tracce lasciate vicino ai detective (indizi facili)
      for (const v of o.visits) for (const dj of det) if (M.jCircles[dj].includes(v)) danger += 0.5;
      let score = -ai.jackDanger * danger + (dNow - d) * (slack < 3 ? ai.jackRush : 1) + rnd() * ai.jackNoise;
      // furtività: quanto la Polizia potrà essere sicura della mia posizione dopo questa mossa
      if (fwd) score -= ai.jackStealth * 10 * fwd[o.type][o.end] * (danger + 1);
      if (slack < 0) score -= 100;
      if (o.type !== 'normal') score -= o.type === 'coach' ? 1.2 : 1.6; // i gettoni sono preziosi
      if (score > bs) { bs = score; best = o; }
    }
    return best;
  }

  // Schieramento iniziale sui posti di guardia: la Polizia copre Nord e Sud
  function stationPlacement(M, n, rnd) {
    const st = M.stations.slice();
    const north = st.slice(0, 3), south = st.slice(3);
    const out = [];
    const pools = [north, south];
    let k = Math.floor(rnd() * 2);
    while (out.length < n && (north.length || south.length)) {
      const pool = pools[k % 2].length ? pools[k % 2] : pools[(k + 1) % 2];
      out.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
      k++;
    }
    return out;
  }

  function placeDetectives(M, crime, prev, rnd) {
    const S = prepare(M);
    const c = M.C[crime];
    const forbidden = [c.a, c.b];
    const dC = S.dist(crime);
    const heat = new Float64Array(M.J.length);
    M.J.forEach(j => {
      for (const x of M.jCircles[j.id]) { const d = dC[x]; if (d >= 1 && d <= 4) heat[j.id] += 1 / d; }
    });
    const out = [];
    for (let i = 0; i < prev.length; i++) {
      let best = -1, bs = -Infinity;
      M.J.forEach(j => {
        if (forbidden.includes(j.id) || out.includes(j.id)) return;
        let s = heat[j.id] + rnd() * 0.05;
        for (const o of out) { const dd = S.jdist(o)[j.id]; if (dd < 2) s -= 2; else if (dd < 3) s -= 0.6; }
        if (s > bs) { bs = s; best = j.id; }
      });
      out.push(best);
    }
    return out;
  }

  function policeMove(M, S, det, B, rnd, ai) {
    const prob = Array.from(B.prob);
    // previsione al turno successivo (mosse normali uniformi)
    const nxt = new Float64Array(prob.length);
    prob.forEach((p, c) => {
      if (p <= 0) return;
      const nb = normalMoves(M, c, det);
      if (!nb.length) { nxt[c] += p; return; }
      nb.forEach(x => { nxt[x] += p / nb.length; });
    });
    const heatJ = (j, pr, nx) => {
      let h = 0;
      for (const c of M.jCircles[j]) h += pr[c] * 1.0 + nx[c] * 0.6 + B.visit[c] * 0.02;
      return h;
    };
    const out = det.slice();
    const pr = prob.slice(), nx = Array.from(nxt);
    // incroci "caldi" globali per avvicinarsi quando la massa e' lontana
    const allHeat = M.J.map(j => heatJ(j.id, pr, nx));
    const hot = allHeat.map((h, j) => [h, j]).sort((a, b) => b[0] - a[0]).slice(0, 6).map(x => x[1]);
    for (let i = 0; i < out.length; i++) {
      const start = out[i];
      const jd = S.jdist(start);
      const others = out.filter((_, k) => k !== i);
      let best = start, bs = -Infinity;
      M.J.forEach(j => {
        if (jd[j.id] > 2 || others.includes(j.id)) return;
        let s = heatJ(j.id, pr, nx);
        let dh = Infinity; for (const h of hot) dh = Math.min(dh, S.jdist(h)[j.id]);
        s -= 0.01 * dh;
        s += rnd() * ai.policeNoise * 0.01;
        if (s > bs) { bs = s; best = j.id; }
      });
      out[i] = best;
      // gli altri detective si distribuiscono su zone diverse
      for (const c of M.jCircles[best]) { pr[c] *= 0.35; nx[c] *= 0.5; }
    }
    return out;
  }

  // Cede il controllo all'interfaccia senza subire il rallentamento dei timer nelle schede nascoste
  function yieldUI() {
    if (typeof MessageChannel !== 'undefined') {
      return new Promise(res => { const ch = new MessageChannel(); ch.port1.onmessage = () => res(); ch.port2.postMessage(0); });
    }
    return new Promise(res => setTimeout(res, 0));
  }

  // ---------- Misura ----------
  function evaluate(M, settings, games, seed, ai) {
    const r = { games: 0, jack: 0, police: 0, reasons: { arrest: 0, time: 0, surrounded: 0 }, nights: 0, invalid: 0 };
    for (let g = 0; g < games; g++) {
      const res = simulate(M, settings, ((seed || 1) * 7919 + g * 104729) >>> 0, ai);
      if (res.winner === 'invalid') { r.invalid++; continue; }
      r.games++;
      r[res.winner]++;
      if (res.winner === 'police') r.reasons[res.reason]++;
      r.nights += res.nights;
    }
    r.jackRate = r.games ? r.jack / r.games : 0;
    r.avgNights = r.games ? r.nights / r.games : 0;
    return r;
  }

  // Statistiche strutturali (per il confronto con il benchmark)
  function structure(M, settings) {
    settings = Object.assign({}, DEFAULT_SETTINGS, settings || {});
    const S = prepare(M);
    const n = M.C.length;
    const deg = M.adj.map(a => new Set(a.map(e => e.to)).size);
    let diam = 0, sumD = 0, cnt = 0;
    for (let i = 0; i < n; i++) { const d = S.dist(i); for (let k = 0; k < n; k++) if (k !== i && d[k] < Infinity) { diam = Math.max(diam, d[k]); sumD += d[k]; cnt++; } }
    const districts = ['NO', 'NE', 'SO', 'SE'].map(d => M.C.filter(c => c.district === d).length);
    return {
      locations: n, junctions: M.J.length, avgDegree: deg.reduce((a, b) => a + b, 0) / n,
      diameter: diam, avgDist: sumD / cnt,
      locPerDetective: n / settings.detectives,
      bridges: M.C.filter(c => c.bridge).length,
      districtMin: Math.min(...districts), districtMax: Math.max(...districts),
    };
  }

  /*
   * Generatore bilanciato: prova mappe casuali e tiene quella con la percentuale di vittorie di Jack
   * piu' vicina al 50% (dentro la tolleranza), misurata simulando partite IA contro IA.
   * Asincrono a blocchi per non bloccare l'interfaccia. onProgress(frac, info).
   */
  async function generateBalanced(MapGen, settings, opts) {
    opts = Object.assign({ seed: 1, candidates: 12, games: 40, tolerance: 0.07, target: 0.5, onProgress: null, yieldEvery: 4 }, opts || {});
    const results = [];
    // Due fasi: (1) screening veloce; (2) conferma su partite NUOVE (semi diversi): la percentuale
    // riportata e' quella della conferma, non quella usata per scegliere (niente bias di selezione).
    opts.confirmGames = opts.confirmGames || 240;
    let best = null;
    const stop = () => !!(best && opts.shouldStop && opts.shouldStop());
    const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
    let lastYield = now();
    const run = async (M, n, seedBase, i, phaseFrac) => {
      const r = { games: 0, jack: 0 };
      for (let g = 0; g < n; g++) {
        const res = simulate(M, settings, (seedBase + g * 7919) >>> 0);
        if (res.winner !== 'invalid') { r.games++; if (res.winner === 'jack') r.jack++; }
        // cede il controllo all'interfaccia al massimo ogni ~40 ms (non a ogni partita)
        if (opts.onProgress && now() - lastYield > 40) {
          lastYield = now();
          opts.onProgress(Math.min(0.99, (i + phaseFrac(g / n)) / opts.candidates), { candidate: i + 1, of: opts.candidates, bestRate: best ? best.rate : undefined });
          await yieldUI();
        }
        if (stop()) break;
      }
      return r;
    };
    for (let i = 0; i < opts.candidates && !stop(); i++) {
      const seed = (opts.seed + i * 2654435761) >>> 0;
      const params = MapGen.randomParams(seed, opts.mapOpts);
      const M = MapGen.build(params);
      const st = structure(M, settings);
      if (st.districtMin < 8) { results.push({ params, skipped: 'district' }); continue; }
      const scr = await run(M, opts.games, (seed * 31) >>> 0, i, f => f * 0.3);
      if (stop()) break;
      const sRate = scr.games ? scr.jack / scr.games : 0;
      if (Math.abs(sRate - opts.target) > opts.tolerance + 0.05) { results.push({ params, screenRate: sRate, rejected: true }); continue; }
      const conf = await run(M, opts.confirmGames, (seed ^ 0xABCDEF) >>> 0, i, f => 0.3 + f * 0.7);
      if (!conf.games) continue;
      const rate = conf.jack / conf.games;
      const se = Math.sqrt(rate * (1 - rate) / conf.games);
      const item = { params, rate, games: conf.games, ci95: 1.96 * se, screenRate: sRate, structure: st, err: Math.abs(rate - opts.target) };
      results.push(item);
      if (!best || item.err < best.err) best = item;
      if (item.err <= opts.tolerance) break; // confermata bilanciata
    }
    if (opts.onProgress) opts.onProgress(1, {});
    return { best, balanced: !!best && best.err <= opts.tolerance, results };
  }

  return { simulate, evaluate, structure, computeBelief, generateBalanced, chooseTargets, DEFAULT_SETTINGS, mulberry32 };
});
