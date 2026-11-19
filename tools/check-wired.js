// Controlla le mappe cablate di maps/cablate.json (o di un altro file) e ne misura il bilanciamento
// con partite simulate, come tools/certify.js fa per le mappe casuali.
// node tools/check-wired.js [partite=400] [file=maps/cablate.json]
const fs = require('fs');
const path = require('path');
const MapGen = require('../js/map.js');
const Sim = require('../js/sim.js');
const games = +process.argv[2] || 400;
const file = process.argv[3] || path.join(__dirname, '..', 'maps', 'cablate.json');
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
const maps = Array.isArray(data) ? data : data.maps || [data];
let bad = 0;
maps.forEach((def, i) => {
  const name = def.name || def.id || `mappa ${i + 1}`;
  let M;
  try { M = MapGen.build(def.params || { wired: def }); } catch (e) { bad++; console.log(`✗ ${name}: ${e.message}`); return; }
  const st = Sim.structure(M, Sim.DEFAULT_SETTINGS);
  console.log(`✓ ${name}: ${st.locations} luoghi, ${st.junctions} incroci, ${st.bridges} ponti, distretti da ${st.districtMin} a ${st.districtMax} luoghi`);
  (M.warnings || []).forEach(w => console.log(`  ⚠ ${w}`));
  if (!games) return;
  const r = Sim.evaluate(M, Sim.DEFAULT_SETTINGS, games, 12345);
  const p = r.jackRate, ci = 1.96 * Math.sqrt(p * (1 - p) / r.games);
  console.log(`  Jack vince il ${(p * 100).toFixed(1)}% ±${(ci * 100).toFixed(1)} su ${r.games} partite simulate (regole standard)${r.invalid ? `, ${r.invalid} non giocabili` : ''}`);
  const near = Sim.evaluate(M, Sim.DEFAULT_SETTINGS, games, 54321, { jackTargets: 'near' });
  console.log(`  Se Jack sceglie sempre le mete più vicine: ${(near.jackRate * 100).toFixed(1)}%`);
});
process.exit(bad ? 1 : 0);
