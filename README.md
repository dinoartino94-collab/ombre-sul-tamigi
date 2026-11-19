# Ombre sul Tamigi

Gioco a movimento nascosto per 2 o più giocatori su un solo dispositivo (telefono, mini-tablet, tablet o PC).
Uno è **Jack**, che si muove in segreto per Londra; gli altri sono la **Polizia**, che lo braccano con tre detective.
Il dispositivo si passa di mano: tra un turno e l'altro una schermata di copertura nasconde le informazioni segrete.

## Come si gioca

Apri `index.html` da un server web (ad esempio GitHub Pages) e segui le istruzioni a schermo.
Le regole complete sono nel menu **📖 Regole** del gioco.

- Mappa con zoom (pizzico o rotella) e spostamento col dito.
- Rivelazione periodica della posizione di Jack tramite un testimone.
- Carte evento opzionali, appunti degli agenti, segni sulla mappa.
- Opzioni anti-sbirciata: rotazione casuale della mappa per Jack.

## Mappe bilanciate

Le mappe casuali hanno circa 189 luoghi. Ogni mappa viene verificata simulando partite tra un'IA di Jack
e un'IA della Polizia (che usa solo informazioni pubbliche): si tengono le mappe in cui Jack vince circa il 50%.

- `js/sim.js` — simulatore e generatore bilanciato (funziona anche in Node).
- `js/maps-certified.js` — mappe già verificate su 2000 partite ciascuna.
- `node tools/balance.js` — misura il bilanciamento.
- `node tools/certify.js` — rigenera le mappe certificate.

## Avvio in locale

```bash
python -m http.server 8765
```

poi apri `http://localhost:8765`.
