// Misura del bilanciamento: node tools/balance.js [games]
const MapGen = require('../js/map.js');
const Sim = require('../js/sim.js');
const games = +process.argv[2] || 100;
const settings = Object.assign({}, Sim.DEFAULT_SETTINGS);

function line(name, M) {
  const t0 = Date.now();
  const st = Sim.structure(M, settings);
  const r = Sim.evaluate(M, settings, games, 7);
  const ms = (Date.now() - t0) / games;
  console.log(`${name.padEnd(18)} luoghi=${st.locations} incroci=${st.junctions} grado=${st.avgDegree.toFixed(2)} diam=${st.diameter} dMedia=${st.avgDist.toFixed(1)} luoghi/det=${st.locPerDetective.toFixed(0)} | Jack ${(r.jackRate * 100).toFixed(0)}% notti=${r.avgNights.toFixed(2)} arresti=${r.reasons.arrest} tempo=${r.reasons.time} circondato=${r.reasons.surrounded} inv=${r.invalid} | ${ms.toFixed(0)} ms/partita`);
  return r;
}

line('classica', MapGen.build());
for (let s = 1; s <= +(process.argv[3] || 4); s++) {
  const p = MapGen.randomParams(s * 1000003);
  line(`casuale ${s} (${p.cols}x${p.rows})`, MapGen.build(p));
}
