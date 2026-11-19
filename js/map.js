'use strict';
/*
 * Ombre sul Tamigi — generatore della mappa (originale, deterministico).
 * Modello:
 *  - Incroci (quadrati): dove stanno e si muovono i detective.
 *  - Luoghi (cerchi numerati): uno su ogni strada tra due incroci; Jack si muove qui.
 *  - Jack va da un luogo a un altro che condivide un incrocio; l'incrocio
 *    non deve essere occupato da un detective.
 *  - Un detective su un incrocio puo' cercare indizi/arrestare nei luoghi che toccano quell'incrocio.
 */
const MapGen = (() => {
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Parametri della mappa "Classica" (default). Le mappe casuali passano parametri diversi.
  const CLASSIC = { seed: 1888, cols: 8, rows: 6, river: 2, bridges: [1, 4, 6], remove: 13, jitter: 44 };
  const DX = 140, DY = 125, PAD = 90, RGAP = 95;

  function connected(nJ, segs) {
    const adj = Array.from({ length: nJ }, () => []);
    segs.forEach(s => { adj[s.a].push(s.b); adj[s.b].push(s.a); });
    const seen = new Set([0]);
    const q = [0];
    while (q.length) {
      const x = q.shift();
      for (const y of adj[x]) if (!seen.has(y)) { seen.add(y); q.push(y); }
    }
    return seen.size === nJ;
  }

  function build(params) {
    const P = Object.assign({}, CLASSIC, params || {});
    const COLS = P.cols, ROWS = P.rows, RIVER = P.river, BRIDGES = P.bridges, REMOVE = P.remove, JIT = P.jitter;
    const jid = (r, c) => r * COLS + c;
    const R = mulberry32(P.seed);
    const W = PAD * 2 + (COLS - 1) * DX;
    const H = PAD * 2 + (ROWS - 1) * DY + RGAP;

    // Incroci
    const J = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const nearRiver = r === RIVER || r === RIVER + 1;
        J.push({
          id: jid(r, c), r, c,
          x: PAD + c * DX + (R() - 0.5) * JIT,
          y: PAD + r * DY + (r > RIVER ? RGAP : 0) + (R() - 0.5) * (nearRiver ? 16 : JIT * 40 / 44),
        });
      }
    }

    // Strade
    let segs = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS - 1; c++) segs.push({ a: jid(r, c), b: jid(r, c + 1), dir: 'h', r, c, bridge: false });
    }
    for (let r = 0; r < ROWS - 1; r++) {
      for (let c = 0; c < COLS; c++) {
        if (r === RIVER && !BRIDGES.includes(c)) continue;
        segs.push({ a: jid(r, c), b: jid(r + 1, c), dir: 'v', r, c, bridge: r === RIVER });
      }
    }

    const isBankH = s => s.dir === 'h' && (s.r === RIVER || s.r === RIVER + 1);

    // Rimuove alcune strade per creare isolati irregolari (mantenendo la connessione)
    const cand = segs.filter(s => !s.bridge && !isBankH(s));
    for (let i = cand.length - 1; i > 0; i--) {
      const k = Math.floor(R() * (i + 1));
      [cand[i], cand[k]] = [cand[k], cand[i]];
    }
    const removed = [];
    for (const s of cand) {
      if (removed.length >= REMOVE) break;
      const deg = new Array(J.length).fill(0);
      segs.forEach(x => { deg[x.a]++; deg[x.b]++; });
      if (deg[s.a] <= 2 || deg[s.b] <= 2) continue;
      const test = segs.filter(x => x !== s);
      if (!connected(J.length, test)) continue;
      segs = test;
      removed.push(s);
    }

    segs.forEach(s => {
      const A = J[s.a], B = J[s.b];
      s.mx = (A.x + B.x) / 2;
      s.my = (A.y + B.y) / 2;
      s.band = s.dir === 'h' ? s.r * 2 : s.r * 2 + 1;
    });
    segs.sort((p, q) => (p.band - q.band) || (p.mx - q.mx));

    // Confine Ovest/Est: passa per la colonna di incroci K (a zig-zag tra i luoghi, vedi "divider").
    // Ovest = luoghi verticali fino alla colonna K e orizzontali a sinistra di K.
    const K = Math.floor((COLS - 1) / 2);
    const C = segs.map((s, i) => {
      const bridge = !!s.bridge;
      const north = s.dir === 'h' ? s.r <= RIVER : s.r < RIVER;
      const col = s.dir === 'h' ? s.c + 0.5 : s.c;
      const west = col <= K;
      return {
        id: i, num: i + 1, x: s.mx, y: s.my, a: s.a, b: s.b,
        dir: s.dir, r: s.r, c: s.c, bridge,
        north: bridge ? null : north,
        district: bridge ? null : (north ? 'N' : 'S') + (west ? 'O' : 'E'),
        bank: bridge || isBankH(s),
        col,
      };
    });

    // Luoghi che toccano ogni incrocio
    const jCircles = J.map(() => []);
    C.forEach(c => { jCircles[c.a].push(c.id); jCircles[c.b].push(c.id); });

    // Adiacenza dei luoghi (movimento normale di Jack)
    const adj = C.map(c => {
      const out = [];
      for (const j of [c.a, c.b]) for (const o of jCircles[j]) if (o !== c.id) out.push({ to: o, via: j });
      return out;
    });

    // Adiacenza degli incroci (movimento detective)
    const jAdj = J.map(() => []);
    C.forEach(c => { jAdj[c.a].push(c.b); jAdj[c.b].push(c.a); });

    // Isolati (per Vicolo e per il disegno)
    const key = new Map();
    C.forEach(c => key.set(c.dir + c.r + ',' + c.c, c.id));
    const cells = [];
    const cellAt = new Map();
    for (let r = 0; r < ROWS - 1; r++) {
      if (r === RIVER) continue;
      for (let c = 0; c < COLS - 1; c++) {
        const ids = [key.get('h' + r + ',' + c), key.get('h' + (r + 1) + ',' + c), key.get('v' + r + ',' + c), key.get('v' + r + ',' + (c + 1))]
          .filter(x => x !== undefined);
        const cell = { r, c, corners: [jid(r, c), jid(r, c + 1), jid(r + 1, c + 1), jid(r + 1, c)], ids, parent: cells.length };
        cellAt.set(r + ',' + c, cells.length);
        cells.push(cell);
      }
    }
    // Isolati uniti dove una strada e' stata rimossa (union-find)
    const find = i => { while (cells[i].parent !== i) { cells[i].parent = cells[cells[i].parent].parent; i = cells[i].parent; } return i; };
    const join = (k1, k2) => {
      const a = cellAt.get(k1), b = cellAt.get(k2);
      if (a === undefined || b === undefined) return;
      const ra = find(a), rb = find(b);
      if (ra !== rb) cells[ra].parent = rb;
    };
    removed.forEach(s => {
      if (s.dir === 'v') join(s.r + ',' + (s.c - 1), s.r + ',' + s.c);
      else join((s.r - 1) + ',' + s.c, s.r + ',' + s.c);
    });
    const groups = new Map();
    cells.forEach((cell, i) => {
      const root = find(i);
      if (!groups.has(root)) groups.set(root, new Set());
      cell.ids.forEach(id => groups.get(root).add(id));
    });
    const alleySets = C.map(() => new Set());
    groups.forEach(set => { const ids = [...set]; ids.forEach(a => ids.forEach(b => { if (a !== b) alleySets[a].add(b); })); });
    const alley = alleySets.map(s => [...s]);

    // Barca: tra luoghi sul fiume entro 3 colonne
    const bankIds = C.filter(c => c.bank).map(c => c.id);
    const boat = C.map(c => c.bank ? bankIds.filter(o => o !== c.id && Math.abs(C[o].col - c.col) <= 3) : []);

    function dist(src) {
      const d = new Array(C.length).fill(Infinity);
      d[src] = 0;
      const q = [src];
      while (q.length) {
        const x = q.shift();
        for (const e of adj[x]) if (d[e.to] === Infinity) { d[e.to] = d[x] + 1; q.push(e.to); }
      }
      return d;
    }

    // Lampioni di partenza: un luogo centrale per distretto
    const lanterns = ['NO', 'NE', 'SO', 'SE'].map(d => {
      const list = C.filter(c => c.district === d && !c.bank);
      const mx = list.reduce((s, c) => s + c.x, 0) / list.length;
      const my = list.reduce((s, c) => s + c.y, 0) / list.length;
      let best = list[0], bd = Infinity;
      list.forEach(c => { const dd = (c.x - mx) ** 2 + (c.y - my) ** 2; if (dd < bd) { bd = dd; best = c; } });
      return best.id;
    });

    // Posti di guardia: incroci di partenza della Polizia (3 a Nord, 3 a Sud, distribuiti)
    const stations = [];
    [[0.18, 0.2], [0.5, 0.12], [0.82, 0.2], [0.18, 0.8], [0.5, 0.88], [0.82, 0.8]].forEach(([fx, fy]) => {
      const tx = fx * W, ty = fy * H;
      let best = -1, bd = Infinity;
      J.forEach(j => {
        if (stations.includes(j.id) || j.r === RIVER || j.r === RIVER + 1) return;
        const d = (j.x - tx) ** 2 + (j.y - ty) ** 2;
        if (d < bd) { bd = d; best = j.id; }
      });
      stations.push(best);
    });

    // Linea di confine Ovest/Est: tocca gli incroci della colonna K e, in ogni fascia,
    // passa per il centro dell'isolato a destra (tra i luoghi della colonna K e K+1)
    const divider = [];
    for (let r = 0; r < ROWS; r++) {
      const a = J[jid(r, K)];
      if (r === 0) divider.push([a.x, a.y - 70]);
      divider.push([a.x, a.y]);
      if (r < ROWS - 1) {
        const q = [J[jid(r, K)], J[jid(r, K + 1)], J[jid(r + 1, K)], J[jid(r + 1, K + 1)]];
        divider.push([q.reduce((s2, p) => s2 + p.x, 0) / 4, q.reduce((s2, p) => s2 + p.y, 0) / 4]);
      } else divider.push([a.x, a.y + 70]);
    }

    // Linea del fiume
    const river = [];
    for (let c = 0; c < COLS; c++) {
      const a = J[jid(RIVER, c)], b = J[jid(RIVER + 1, c)];
      river.push([(a.x + b.x) / 2, (a.y + b.y) / 2]);
    }
    river.unshift([-200, river[0][1]]);
    river.push([W + 200, river[river.length - 1][1]]);

    return { J, C, segs, removed, jCircles, adj, jAdj, cells, alley, boat, dist, lanterns, stations, river, divider, W, H, params: P };
  }

  /*
   * Parametri casuali (non ancora verificati per il bilanciamento: vedi Sim.generateBalanced).
   * Dimensione vicina a quella che il benchmark suggerisce (molti piu' luoghi per detective
   * rispetto alla mappa classica), fiume a meta', 3-5 ponti distribuiti.
   */
  function randomParams(seed, opts) {
    // Default: scala del benchmark (circa 189 luoghi, come la plancia del gioco originale)
    const o = Object.assign({ targetLocations: 189, minCols: 12, maxCols: 15, minRows: 8, maxRows: 9, removeMin: 0.06, removeMax: 0.22 }, opts || {});
    const R = mulberry32((seed ^ 0x9E3779B9) >>> 0);
    const ri = (a, b) => a + Math.floor(R() * (b - a + 1));
    let cols = ri(o.minCols, o.maxCols);
    let rows = ri(o.minRows, o.maxRows);
    // adatta la griglia in modo che il numero di luoghi obiettivo sia raggiungibile togliendo 6-22% delle strade
    // strade realmente presenti: il fiume taglia le verticali tranne i ponti (si assumono ~cols/3 ponti)
    const segCount = (cc, rr) => rr * (cc - 1) + (rr - 1) * cc - (cc - Math.max(3, Math.round(cc / 3)));
    if (o.targetLocations) {
      for (let k = 0; k < 6 && segCount(cols, rows) * (1 - o.removeMin) < o.targetLocations; k++) cols++;
      for (let k = 0; k < 6 && segCount(cols, rows) * (1 - o.removeMax) > o.targetLocations; k++) cols--;
    }
    const river = Math.floor(rows / 2) - 1;
    const nb = Math.max(3, Math.min(5, Math.round(cols / 3) + ri(-1, 1)));
    // ponti distribuiti: uno per ogni fascia di colonne
    const bridges = [];
    for (let i = 0; i < nb; i++) {
      const lo = Math.floor(i * cols / nb), hi = Math.floor((i + 1) * cols / nb) - 1;
      bridges.push(ri(lo, Math.max(lo, hi)));
    }
    const nSeg = rows * (cols - 1) + (rows - 1) * cols - (cols - nb);
    const rnd = R();
    let remove = Math.round(nSeg * (o.removeMin + rnd * (o.removeMax - o.removeMin)));
    if (o.targetLocations) remove = Math.max(Math.round(nSeg * o.removeMin), Math.min(Math.round(nSeg * o.removeMax), nSeg - o.targetLocations));
    return { seed: seed >>> 0, cols, rows, river, bridges: [...new Set(bridges)], remove, jitter: 30 + Math.floor(R() * 20) };
  }

  return { build, randomParams, CLASSIC };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = MapGen;
