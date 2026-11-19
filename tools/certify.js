// Crea js/maps-certified.js: mappe casuali a scala benchmark (~189 luoghi) con vittorie di Jack ~50%.
// Screening (80 + 400 partite) solo per scegliere i candidati; la percentuale registrata viene da una
// CONFERMA indipendente su altri semi (default 2000 partite), con intervallo di confidenza al 95%.
// node tools/certify.js [quante per tipo di fiume=6] [conferma=2000] [tipi=random,none,full]
// Tipi di fiume: random (intero/corto/lago/spezzato), none (senza fiume), full (da bordo a bordo).
// Con [tipi] si rigenerano solo quelli indicati: le mappe degli altri tipi restano quelle gia' nel file.
const fs = require('fs');
const path = require('path');
const MapGen = require('../js/map.js');
const Sim = require('../js/sim.js');
const want = +process.argv[2] || 6;
const confirmGames = +process.argv[3] || 2000;
const settings = Object.assign({}, Sim.DEFAULT_SETTINGS);
const ALL_MODES = ['random', 'none', 'full'];
const modes = process.argv[4] ? process.argv[4].split(',') : ALL_MODES;
const file = path.join(__dirname, '..', 'js', 'maps-certified.js');
const kept = modes.length < ALL_MODES.length && fs.existsSync(file) ? require(file) : [];
const out = [];
for (const riverMode of ALL_MODES) {
if (!modes.includes(riverMode)) { out.push(...kept.filter(m => (m.params.riverMode || 'full') === riverMode)); continue; }
const before = out.length;
for (let s = 1; out.length - before < want && s < 600; s++) {
  const seed = (s * 2654435761) >>> 0;
  const params = MapGen.randomParams(seed, { riverMode });
  const M = MapGen.build(params);
  const st = Sim.structure(M, settings);
  if (st.districtMin < 8) continue;
  const quick = Sim.evaluate(M, settings, 80, seed);
  if (Math.abs(quick.jackRate - 0.5) > 0.1) continue;
  const scr = Sim.evaluate(M, settings, 400, seed + 1);
  if (Math.abs(scr.jackRate - 0.5) > 0.05) { console.log(`seed ${seed} screening ${(scr.jackRate * 100).toFixed(1)}% scartata`); continue; }
  const conf = Sim.evaluate(M, settings, confirmGames, (seed ^ 0x5bd1e995) >>> 0);
  const p = conf.jackRate, ci = 1.96 * Math.sqrt(p * (1 - p) / conf.games);
  const ok = p - ci >= 0.45 && p + ci <= 0.55;
  console.log(`[${riverMode}] seed ${seed} ${params.cols}x${params.rows} luoghi=${st.locations} conferma=${(p * 100).toFixed(1)}% ±${(ci * 100).toFixed(1)} ${ok ? 'OK' : 'scartata'}`);
  if (ok) out.push({ params, jackRate: +p.toFixed(3), ci95: +ci.toFixed(3), games: conf.games, locations: st.locations });
}
}
fs.writeFileSync(file, `'use strict';
// Generato da tools/certify.js — percentuale di vittorie di Jack misurata su ${confirmGames} partite
// simulate indipendenti (non quelle usate per la selezione), con intervallo di confidenza al 95%.
// Regole: ${JSON.stringify(settings)}
const CERTIFIED_MAPS = ${JSON.stringify(out, null, 1)};
if (typeof module !== 'undefined' && module.exports) module.exports = CERTIFIED_MAPS;
`);
console.log('scritte', out.length, 'mappe in', file);
