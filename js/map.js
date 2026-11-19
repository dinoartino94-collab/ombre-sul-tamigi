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
  // Distribuzione delle lunghezze delle strade senza luoghi: pesi per 1, 2, 3, 4 strade di fila.
  // Modificabile per mappa con params.stretchDist, o per le casuali con randomParams(seed, { stretchDist }).
  const STRETCH_DIST = [0.4, 0.3, 0.2, 0.1];

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

  // Collegamenti comuni a tutte le mappe (generate o cablate), a partire da incroci, strade e luoghi.
  function linkGraph(J, segs, C) {
    // Luoghi che toccano ogni incrocio
    const jCircles = J.map(() => []);
    C.forEach(c => { jCircles[c.a].push(c.id); jCircles[c.b].push(c.id); });

    // Adiacenza dei luoghi (movimento normale di Jack). via = incroci attraversati:
    // uno solo di solito, tutti quelli della strada lunga se Jack la percorre. Nessuno puo' essere occupato.
    const longAdj = J.map(() => []);
    segs.forEach(s => { if (s.noLoc) { longAdj[s.a].push(s.b); longAdj[s.b].push(s.a); } });
    const reach = j => {
      const paths = new Map([[j, [j]]]);
      const q = [j];
      while (q.length) {
        const x = q.shift();
        for (const y of longAdj[x]) if (!paths.has(y)) { paths.set(y, paths.get(x).concat(y)); q.push(y); }
      }
      return paths;
    };
    const adj = C.map(c => {
      const out = [], seen = new Set();
      for (const j of [c.a, c.b]) for (const [k, path] of reach(j)) for (const o of jCircles[k]) {
        const key = o + ':' + path.join('-');
        if (o !== c.id && !seen.has(key)) { seen.add(key); out.push({ to: o, via: path }); }
      }
      return out;
    });

    // Adiacenza degli incroci (movimento detective): tutte le strade, anche quelle lunghe senza luoghi
    const jAdj = J.map(() => []);
    segs.forEach(s => { jAdj[s.a].push(s.b); jAdj[s.b].push(s.a); });

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
    return { jCircles, adj, jAdj, dist };
  }

  // Lampioni di partenza: un luogo centrale per distretto
  const DISTRICT_IDS = ['NO', 'NE', 'SO', 'SE'];
  function centralLanterns(C) {
    return DISTRICT_IDS.map(d => {
      const list = C.filter(c => c.district === d && !c.bank);
      const mx = list.reduce((s, c) => s + c.x, 0) / list.length;
      const my = list.reduce((s, c) => s + c.y, 0) / list.length;
      let best = list[0], bd = Infinity;
      list.forEach(c => { const dd = (c.x - mx) ** 2 + (c.y - my) ** 2; if (dd < bd) { bd = dd; best = c; } });
      return best.id;
    });
  }

  // Distanza minima tra il centro di un luogo e una linea di confine (il cerchio ha raggio 17)
  const FENCE_MIN = 24;
  function lineDistance(line, x, y) {
    let best = Infinity;
    for (let i = 0; i < line.length - 1; i++) {
      const [ax, ay] = line[i], [bx, by] = line[i + 1];
      const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy;
      const t = L ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L)) : 0;
      best = Math.min(best, Math.hypot(x - ax - t * dx, y - ay - t * dy));
    }
    return best;
  }
  // Linea di confine dritta (orizzontale a y = pos, o verticale a x = pos) da from a to, che gira attorno
  // ai luoghi troppo vicini. before(c) = il luogo sta dalla parte prima della linea (Nord o Ovest).
  function fenceLine(C, horizontal, pos, from, to, before) {
    const R = 32;
    const u = c => (horizontal ? c.x : c.y), v = c => (horizontal ? c.y : c.x);
    const pts = [[from, pos]];
    const add = (a, b) => pts.push([Math.max(a, pts[pts.length - 1][0]), b]); // sempre in avanti lungo la linea
    C.filter(c => Math.abs(v(c) - pos) < R).sort((a, b) => u(a) - u(b)).forEach(c => {
      const off = v(c) + (before(c) ? R : -R);
      add(u(c) - 1.6 * R, pos); add(u(c) - 0.8 * R, off); add(u(c) + 0.8 * R, off); add(u(c) + 1.6 * R, pos);
    });
    add(to, pos);
    return horizontal ? pts : pts.map(p => [p[1], p[0]]);
  }

  /*
   * Mappe cablate: disegnate a mano, incrocio per incrocio (di solito in maps/cablate.json).
   * Stesso modello delle mappe generate: incroci collegati da strade, un luogo al centro di ogni strada.
   *   name       nome mostrato nel gioco
   *   junctions  [[x, y], ...]: l'indice nell'elenco e' il numero dell'incrocio (da 0)
   *   streets    [a, b] oppure { a, b, long, bridge, bank, water, district }. I luoghi sono numerati
   *              nell'ordine dell'elenco. long: strada senza luogo (Jack la attraversa in un movimento).
   *              water: specchio d'acqua ("A") su cui si affaccia una riva, o i due (["A","B"]) divisi da un
   *              ponte (bridge: true). district: "NO"|"NE"|"SO"|"SE" per forzare il distretto.
   *   split      [x, y] dei confini Ovest/Est e Nord/Sud (default: centro della mappa)
   *   waters     [[[x, y], ...], ...] linee d'acqua da disegnare
   *   stations   incroci di partenza della Polizia; lanterns: numeri dei 4 luoghi di partenza di Jack
   *   boatRange  distanza massima di un tragitto in Barca (default 360); scale: moltiplica le coordinate
   *   width, height  dimensioni della mappa; senza, si adatta agli incroci con un margine
   * Distanze consigliate: 110-150 tra due incroci. Errori bloccanti = eccezione; il resto in M.warnings.
   */
  function buildWired(def) {
    const fail = m => { throw new Error(m); };
    if (!def || !Array.isArray(def.junctions) || !Array.isArray(def.streets)) fail('servono gli elenchi "junctions" e "streets"');
    const k = +def.scale > 0 ? +def.scale : 1;
    const J = def.junctions.map((p, i) => {
      const x = Array.isArray(p) ? p[0] : p && p.x, y = Array.isArray(p) ? p[1] : p && p.y;
      if (typeof x !== 'number' || typeof y !== 'number' || !isFinite(x) || !isFinite(y)) fail(`incrocio ${i}: coordinate non valide`);
      return { id: i, x: x * k, y: y * k };
    });
    if (J.length < 4) fail('servono almeno 4 incroci');
    let ox = 0, oy = 0, W = def.width * k, H = def.height * k;
    if (!(W > 0 && H > 0)) {
      const xs = J.map(j => j.x), ys = J.map(j => j.y);
      ox = PAD - Math.min(...xs); oy = PAD - Math.min(...ys);
      W = Math.max(...xs) + ox + PAD; H = Math.max(...ys) + oy + PAD;
    }
    const pt = p => [p[0] * k + ox, p[1] * k + oy];
    J.forEach(j => { j.x += ox; j.y += oy; });
    const [sx, sy] = Array.isArray(def.split) ? pt(def.split) : [W / 2, H / 2];

    const seen = new Set();
    const segs = def.streets.map((s, i) => {
      const o = Array.isArray(s) ? { a: s[0], b: s[1] } : s || {};
      let a = o.a, b = o.b;
      if (!J[a] || !J[b] || a === b) fail(`strada ${i}: incroci non validi (${a}, ${b})`);
      const key = Math.min(a, b) + '-' + Math.max(a, b);
      if (seen.has(key)) fail(`strada ${i}: la strada ${a}-${b} compare due volte`);
      seen.add(key);
      const noLoc = !!o.long, bridge = !noLoc && !!o.bridge;
      const water = noLoc || o.water === undefined ? [] : [].concat(o.water).map(String);
      if (bridge && J[a].y > J[b].y) [a, b] = [b, a]; // il ponte si disegna dall'incrocio piu' in alto
      return { a, b, bridge, bank: bridge || (!noLoc && (!!o.bank || water.length > 0)), water, noLoc, district: o.district,
        mx: (J[a].x + J[b].x) / 2, my: (J[a].y + J[b].y) / 2 };
    });
    if (!connected(J.length, segs)) fail('la mappa non è connessa: qualche incrocio non è raggiungibile dagli altri');

    const C = segs.filter(s => !s.noLoc).map((s, i) => {
      let district = (s.my < sy ? 'N' : 'S') + (s.mx <= sx ? 'O' : 'E');
      if (s.district !== undefined) {
        if (!DISTRICT_IDS.includes(s.district)) fail(`luogo ${i + 1}: distretto "${s.district}" sconosciuto (NO, NE, SO, SE)`);
        district = s.district;
      }
      s.loc = i;
      return { id: i, num: i + 1, x: s.mx, y: s.my, a: s.a, b: s.b, bridge: s.bridge,
        north: s.bridge ? null : district[0] === 'N', district: s.bridge ? null : district, bank: s.bank, water: s.water };
    });
    const warnings = [];
    DISTRICT_IDS.forEach(d => {
      const n = C.filter(c => c.district === d && !c.bank).length;
      if (!n) fail(`il distretto ${d} non ha luoghi: controlla "split"`);
      if (n < 8) warnings.push(`il distretto ${d} ha ${n === 1 ? 'un solo luogo' : 'solo ' + n + ' luoghi'} (meglio almeno 8)`);
    });
    const { jCircles, adj, jAdj, dist } = linkGraph(J, segs, C);

    // Isolati = facce del grafo delle strade (per il Vicolo e per il disegno): da ogni strada si gira
    // sempre verso la strada successiva attorno all'incrocio. Si scartano la faccia esterna (la piu' grande)
    // e gli specchi d'acqua (chiusi solo da rive e ponti).
    const out = J.map(() => []);
    segs.forEach((s, i) => { out[s.a].push({ to: s.b, s: i }); out[s.b].push({ to: s.a, s: i }); });
    out.forEach((l, j) => {
      const ang = e => Math.atan2(J[e.to].y - J[j].y, J[e.to].x - J[j].x);
      l.sort((p, q) => ang(p) - ang(q));
    });
    const walked = new Set(), faces = [];
    segs.forEach((s0, i0) => [[s0.a, s0.b], [s0.b, s0.a]].forEach(([u0, v0]) => {
      if (walked.has(u0 + '>' + v0)) return;
      const corners = [], ids = new Set();
      let u = u0, v = v0, si = i0, area = 0;
      do {
        walked.add(u + '>' + v); corners.push(u); ids.add(si);
        area += J[u].x * J[v].y - J[v].x * J[u].y;
        const l = out[v], nx = l[(l.findIndex(e => e.to === u) + 1) % l.length];
        u = v; v = nx.to; si = nx.s;
      } while (!walked.has(u + '>' + v));
      faces.push({ corners, segs: [...ids], area: Math.abs(area) });
    }));
    const outer = faces.reduce((a, b) => (b.area > a.area ? b : a));
    const cells = faces.filter(f => f !== outer && !f.segs.every(i => segs[i].bank))
      .map(f => ({ corners: f.corners, ids: f.segs.filter(i => !segs[i].noLoc).map(i => segs[i].loc) }));
    const alleySets = C.map(() => new Set());
    cells.forEach(cell => cell.ids.forEach(a => cell.ids.forEach(b => { if (a !== b) alleySets[a].add(b); })));
    const alley = alleySets.map(s => [...s]);

    // Barca: tra luoghi che si affacciano sullo stesso specchio d'acqua, entro boatRange
    const range = +def.boatRange > 0 ? def.boatRange * k : 360;
    const boat = C.map(c => C.filter(o => o.id !== c.id && o.water.some(w => c.water.includes(w))
      && Math.hypot(o.x - c.x, o.y - c.y) <= range).map(o => o.id));
    // Il fiume deve stare sul confine Nord/Sud: uno specchio d'acqua con le rive tutte dalla stessa parte
    // sta dentro un quadrante, e li' Jack con la Barca e' troppo avvantaggiato.
    [...new Set(C.flatMap(c => c.water))].forEach(w => {
      const sides = new Set(C.filter(c => !c.bridge && c.water.includes(w)).map(c => c.north));
      if (sides.size === 1) warnings.push(`lo specchio d'acqua "${w}" ha rive solo a ${sides.has(true) ? 'Nord' : 'Sud'}: il fiume passa dentro un quadrante`);
    });

    let lanterns;
    if (def.lanterns !== undefined) {
      if (!Array.isArray(def.lanterns) || !def.lanterns.length) fail('"lanterns": serve un elenco di numeri di luoghi');
      lanterns = def.lanterns.map(n => {
        const c = C[n - 1];
        if (!c || c.bank) fail(`"lanterns": il luogo ${n} non esiste o è sul fiume`);
        return c.id;
      });
    } else lanterns = centralLanterns(C);

    let stations;
    if (def.stations !== undefined) {
      stations = [...new Set(def.stations)];
      if (!Array.isArray(def.stations) || stations.length < 4 || stations.some(j => !J[j])) fail('"stations": servono almeno 4 incroci esistenti e diversi');
    } else {
      const wet = new Set();
      segs.forEach(s => { if (s.bank) { wet.add(s.a); wet.add(s.b); } });
      stations = [];
      [[0.18, 0.2], [0.5, 0.12], [0.82, 0.2], [0.18, 0.8], [0.5, 0.88], [0.82, 0.8]].forEach(([fx, fy]) => {
        let best = -1, bd = Infinity;
        J.forEach(j => {
          if (stations.includes(j.id) || wet.has(j.id)) return;
          const d = (j.x - fx * W) ** 2 + (j.y - fy * H) ** 2;
          if (d < bd) { bd = d; best = j.id; }
        });
        if (best >= 0) stations.push(best);
      });
      if (stations.length < 4) fail('troppo pochi incroci lontani dal fiume per i posti di guardia: indica "stations"');
    }

    // Confini dei distretti: linee dritte su "split" che girano attorno ai luoghi vicini, lasciandoli dalla
    // parte del loro distretto. Nessun cerchio numerato deve stare sulla linea.
    const nsLine = fenceLine(C, true, sy, -200, W + 200, c => (c.north === null ? c.y <= sy : c.north));
    const divider = fenceLine(C, false, sx, -70, H + 70, c => (c.district ? c.district[1] === 'O' : c.x <= sx));
    [['Nord/Sud', nsLine], ['Ovest/Est', divider]].forEach(([name, line]) => {
      const hit = C.filter(c => lineDistance(line, c.x, c.y) < FENCE_MIN).map(c => c.num);
      if (hit.length) warnings.push(`il confine ${name} passa sopra ${hit.length === 1 ? 'il luogo' : 'i luoghi'} ${hit.join(', ')}: sposta "split"`);
    });

    const waters = (def.waters || []).map(w => w.map(pt));
    return { J, C, segs, removed: [], jCircles, adj, jAdj, cells, alley, boat, dist, lanterns, stations, waters,
      nsLine, divider, W, H, params: { wired: def }, warnings };
  }

  function build(params) {
    if (params && params.wired) return buildWired(params.wired);
    const P = Object.assign({}, CLASSIC, params || {});
    // RIVER = riga dell'acqua; MID = confine Nord/Sud dei distretti. Coincidono sempre nelle mappe nuove;
    // P.mid diverso da P.river resta solo per ricostruire le partite salvate con le vecchie mappe casuali.
    const MID = P.mid !== undefined ? P.mid : P.river;
    const COLS = P.cols, ROWS = P.rows, RIVER = P.river, BRIDGES = P.bridges, REMOVE = P.remove, JIT = P.jitter;
    const jid = (r, c) => r * COLS + c;
    const R = mulberry32(P.seed);
    const W = PAD * 2 + (COLS - 1) * DX;
    const H = PAD * 2 + (ROWS - 1) * DY + RGAP;

    // Acqua: uno o piu' tratti [a, b) di isolati nella fascia tra le righe RIVER e RIVER+1.
    // Senza P.water il fiume attraversa tutta la mappa (mappa classica e vecchi salvataggi).
    const WATER = (P.water || [[0, COLS - 1]]).filter(w => w[1] > w[0]);
    const spanOfCell = c => WATER.findIndex(w => c >= w[0] && c < w[1]);
    const waterCell = c => spanOfCell(c) >= 0;
    // colonne di incroci tagliate dall'acqua: tra due isolati d'acqua, o sul bordo se l'acqua lo tocca
    const cutCol = c => (waterCell(c - 1) && waterCell(c)) || (c === 0 && waterCell(0)) || (c === COLS - 1 && waterCell(COLS - 2));
    const spanOfCol = c => { const s = spanOfCell(c); return s >= 0 ? s : spanOfCell(c - 1); };

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
        const cut = r === RIVER && cutCol(c);
        if (cut && !BRIDGES.includes(c)) continue;
        segs.push({ a: jid(r, c), b: jid(r + 1, c), dir: 'v', r, c, bridge: cut });
      }
    }

    const isBankH = s => s.dir === 'h' && (s.r === RIVER || s.r === RIVER + 1) && waterCell(s.c);

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

    // Strade senza luoghi (come nell'originale): tratti dritti di 1-4 strade.
    // P.stretchDist = pesi delle lunghezze 1, 2, 3, 4 (vedi STRETCH_DIST).
    // La Polizia li percorre incrocio per incrocio; Jack li attraversa in un solo movimento.
    // Le catene non si toccano tra loro e non usano ponti, rive o la fascia del fiume.
    const segAt = new Map();
    segs.forEach(s => segAt.set(s.dir + s.r + ',' + s.c, s));
    const eligible = s => s && !s.bridge && !isBankH(s) && !(s.dir === 'v' && s.r === RIVER) && !s.noLoc;
    const lenW = P.stretchDist || STRETCH_DIST;
    const tot = lenW.reduce((a, b) => a + b, 0) || 1;
    const pickLen = x => { let r = x * tot; for (let k = 0; k < lenW.length; k++) { r -= lenW[k]; if (r < 0) return k + 1; } return lenW.length; };
    const usedJ = new Set();
    // La lunghezza si sceglie una volta per tratto (rispettando la distribuzione), poi si cerca un posto libero
    for (let n = 0; n < (P.stretches || 0); n++) {
      const len = pickLen(R());
      for (let tries = 0; tries < 80; tries++) {
        const s0 = segs[Math.floor(R() * segs.length)];
        const chain = [];
        for (let k = 0; k < len; k++) chain.push(segAt.get(s0.dir + (s0.dir === 'v' ? s0.r + k : s0.r) + ',' + (s0.dir === 'h' ? s0.c + k : s0.c)));
        if (!chain.every(eligible)) continue;
        const js = new Set(); chain.forEach(s => { js.add(s.a); js.add(s.b); });
        if ([...js].some(j => usedJ.has(j))) continue;
        chain.forEach(s => { s.noLoc = true; });
        js.forEach(j => usedJ.add(j));
        break;
      }
    }

    // Confine Ovest/Est: passa per la colonna di incroci K (a zig-zag tra i luoghi, vedi "divider").
    // Ovest = luoghi verticali fino alla colonna K e orizzontali a sinistra di K.
    const K = Math.floor((COLS - 1) / 2);
    const C = segs.filter(s => !s.noLoc).map((s, i) => {
      const bridge = !!s.bridge;
      const north = s.dir === 'h' ? s.r <= MID : s.r < MID;
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

    const { jCircles, adj, jAdj, dist } = linkGraph(J, segs, C);

    // Isolati (per Vicolo e per il disegno)
    const key = new Map();
    C.forEach(c => key.set(c.dir + c.r + ',' + c.c, c.id));
    const cells = [];
    const cellAt = new Map();
    for (let r = 0; r < ROWS - 1; r++) {
      for (let c = 0; c < COLS - 1; c++) {
        if (r === RIVER && waterCell(c)) continue;
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

    // Barca: i ponti dividono il fiume in specchi d'acqua. Ogni luogo blu (sul fiume) si affaccia
    // su uno specchio d'acqua; i luoghi dei ponti stanno sul bordo tra due specchi.
    // La Barca va da un luogo blu a un altro luogo blu dello stesso specchio d'acqua (anche sull'altra sponda),
    // al massimo 2 colonne piu' in la': salti brevi tra pochi cerchi, come nell'originale.
    // Ogni tratto d'acqua ha i suoi specchi: luoghi di tratti diversi non sono mai collegati.
    const bridgeCols = BRIDGES.slice().sort((a, b) => a - b);
    const waterBlocks = c => {
      if (!c.bank) return [];
      const s = c.bridge ? spanOfCol(c.c) : spanOfCell(c.c);
      const k = bridgeCols.filter(b => b < c.col && spanOfCol(b) === s).length;
      return (c.bridge ? [k, k + 1] : [k]).map(x => s * 100 + x);
    };
    C.forEach(c => { c.water = waterBlocks(c); });
    const bankIds = C.filter(c => c.bank).map(c => c.id);
    const boat = C.map(c => c.bank ? bankIds.filter(o => o !== c.id && C[o].water.some(w => c.water.includes(w)) && Math.abs(C[o].col - c.col) <= 2) : []);

    const lanterns = centralLanterns(C);

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

    // Confine Nord/Sud (sempre presente) e tratti d'acqua da disegnare
    const midAt = (row, c) => { const a = J[jid(row, c)], b = J[jid(row + 1, c)]; return [(a.x + b.x) / 2, (a.y + b.y) / 2]; };
    const mid = c => midAt(RIVER, c);
    // Il confine Nord/Sud, come quello Ovest/Est, non passa mai sopra un luogo: tocca gli incroci della
    // riga MID e tra uno e l'altro scende al centro dell'isolato (o dell'acqua) sottostante. Sopra restano
    // i luoghi delle strade orizzontali della riga MID (Nord), sotto quelli delle verticali (Sud).
    const nsLine = [];
    for (let c = 0; c < COLS; c++) {
      const a = J[jid(MID, c)];
      if (c === 0) nsLine.push([-200, a.y]);
      nsLine.push([a.x, a.y]);
      if (c < COLS - 1) {
        const q = [J[jid(MID, c)], J[jid(MID, c + 1)], J[jid(MID + 1, c)], J[jid(MID + 1, c + 1)]];
        nsLine.push([q.reduce((s2, p) => s2 + p.x, 0) / 4, q.reduce((s2, p) => s2 + p.y, 0) / 4]);
      } else nsLine.push([W + 200, a.y]);
    }
    // Un lago o un tratto interno finisce prima della strada che lo chiude (estremita' arrotondate)
    const waters = WATER.map(([a, b]) => {
      const pts = [];
      for (let c = a; c <= b; c++) pts.push(mid(c));
      if (a === 0) pts.unshift([-200, pts[0][1]]); else pts[0] = [pts[0][0] + 85, pts[0][1]];
      const L = pts.length - 1;
      if (b === COLS - 1) pts.push([W + 200, pts[L][1]]); else pts[L] = [pts[L][0] - 85, pts[L][1]];
      if (pts.length === 2 && pts[0][0] > pts[1][0]) { const x = (pts[0][0] + pts[1][0]) / 2; pts[0][0] = x; pts[1][0] = x; }
      return pts;
    });

    return { J, C, segs, removed, jCircles, adj, jAdj, cells, alley, boat, dist, lanterns, stations, waters, nsLine, divider, W, H, params: P };
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
    const rnd = R();
    const jitter = 30 + Math.floor(R() * 20);

    // Forma dell'acqua. riverMode: 'full' (da bordo a bordo), 'none' (niente fiume),
    // 'random' (intero, corto da un lato, lago interno o spezzato in due tratti)
    const cells = cols - 1;
    let water = [[0, cells]], br = [...new Set(bridges)];
    const mode = o.riverMode || 'full';
    if (mode === 'none') { water = []; br = []; }
    else if (mode === 'random') {
      const t = R();
      if (t < 0.25) { /* intero */ }
      else if (t < 0.5) { // corto, da un bordo
        const len = ri(Math.round(cells * 0.35), Math.round(cells * 0.6));
        water = R() < 0.5 ? [[0, len]] : [[cells - len, cells]];
      } else if (t < 0.75) { // lago interno
        const len = ri(3, Math.max(3, Math.round(cells * 0.4)));
        const a = ri(2, Math.max(2, cells - len - 2));
        water = [[a, a + len]];
      } else { // spezzato: due tratti con un passaggio di terra in mezzo
        const gap = ri(2, 3);
        const l1 = ri(Math.round(cells * 0.25), Math.round(cells * 0.45));
        const l2 = Math.max(2, ri(Math.round(cells * 0.25), cells - l1 - gap));
        water = R() < 0.5
          ? [[0, l1], [l1 + gap, Math.min(cells, l1 + gap + l2)]]
          : [[Math.max(0, cells - l1 - gap - l2), cells - l1 - gap], [cells - l1, cells]];
      }
      if (t >= 0.25) {
        // ponti: circa uno ogni 4 isolati d'acqua, solo dove l'acqua taglia davvero la strada
        br = [];
        water.forEach(([a, b]) => {
          const inner = [];
          for (let c = a === 0 ? 0 : a + 1; c <= (b === cells ? cols - 1 : b - 1); c++) inner.push(c);
          const n = Math.min(inner.length, Math.max(0, Math.round((b - a) / 4) + ri(-1, 0)));
          for (let i = 0; i < n; i++) br.push(inner[Math.floor((i + 0.5) * inner.length / n)]);
        });
      }
    }
    const wc = c => water.some(w => c >= w[0] && c < w[1]);
    let cutCount = 0;
    for (let c = 0; c < cols; c++) if ((wc(c - 1) && wc(c)) || (c === 0 && wc(0)) || (c === cols - 1 && wc(cols - 2))) cutCount++;
    const nSeg = rows * (cols - 1) + (rows - 1) * cols - (cutCount - br.length);
    let remove = Math.round(nSeg * (o.removeMin + rnd * (o.removeMax - o.removeMin)));
    if (o.targetLocations) remove = Math.max(Math.round(nSeg * o.removeMin), Math.min(Math.round(nSeg * o.removeMax), nSeg - o.targetLocations));
    // Strade senza luoghi: numero di tratti e distribuzione delle lunghezze (opts.stretches = [min, max], opts.stretchDist).
    // Meno strade rimosse per restare vicini ai luoghi obiettivo.
    const sr = o.stretches || [7, 11];
    const stretches = ri(sr[0], sr[1]);
    const stretchDist = o.stretchDist || STRETCH_DIST;
    const meanLen = stretchDist.reduce((a, w, k) => a + w * (k + 1), 0) / (stretchDist.reduce((a, b) => a + b, 0) || 1);
    if (o.targetLocations) remove = Math.max(0, Math.min(remove, nSeg - o.targetLocations - Math.round(stretches * meanLen)));
    const out = { seed: seed >>> 0, cols, rows, river, bridges: br, remove, jitter, stretches, stretchDist };
    if (mode !== 'full') { out.water = water; out.riverMode = mode; }
    // Il fiume scorre sempre sul confine Nord/Sud dei distretti (river === mid), mai dentro un quadrante:
    // con l'acqua in mezzo a un quadrante Jack raggiunge la meta in Barca dalle rive e la Polizia non lo ferma.
    return out;
  }

  return { build, randomParams, CLASSIC, STRETCH_DIST, lineDistance };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = MapGen;
