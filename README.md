# Ombre sul Tamigi

[🇮🇹 Italiano](#-italiano) · [🇫🇷 Français](#-français) · [🇬🇧 English](#-english)

---

## 🇮🇹 Italiano

Gioco a movimento nascosto per 2 o più giocatori su **un solo telefono o tablet**.
Uno è **Jack**, che si muove in segreto per Londra; gli altri sono la **Polizia**, con 3 detective.

**Per iniziare**
1. Apri il gioco e tocca **Nuova partita** → **Inizia** (le impostazioni consigliate sono già scelte).
2. **Polizia**: piazza i detective sui posti di guardia ⚑.
3. Passa il dispositivo a **Jack**: sceglie in segreto un lampione ✦ di partenza e un luogo del delitto per ogni notte, ognuno in un distretto diverso (i distretti sono separati dalle linee rosse tratteggiate).
4. A turno: Jack si muove di nascosto, poi la Polizia muove i detective e **cerca indizi** o **arresta**.
5. Jack vince se compie i delitti di tutte le notti; la Polizia se lo arresta, lo circonda o se Jack finisce le mosse.

Nel menu del gioco trovi la **🌍 Guida rapida** (italiano, francese, inglese) e le **📖 Regole complete**.

---

## 🇫🇷 Français

Jeu de déplacement caché pour 2 joueurs ou plus sur **un seul téléphone ou une seule tablette**.
Un joueur est **Jack**, qui se déplace en secret dans Londres ; les autres sont la **Police**, avec 3 détectives.

**Pour commencer**
1. Ouvrez le jeu et touchez **Nuova partita** (Nouvelle partie) → **Inizia** (Commencer) ; les réglages conseillés sont déjà choisis.
2. **Police** : placez les détectives sur les postes de garde ⚑.
3. Passez l'appareil à **Jack** : il choisit en secret un réverbère ✦ de départ et un lieu de crime pour chaque nuit, chacun dans un quartier différent (les quartiers sont séparés par les lignes rouges en pointillés).
4. À tour de rôle : Jack se déplace en secret, puis la Police déplace ses détectives et **cherche des indices** ou **arrête**.
5. Jack gagne s'il commet tous les crimes ; la Police gagne si elle l'arrête, l'encercle ou si Jack n'a plus de mouvements.

Dans le menu du jeu, le **🌍 Guide rapide** est disponible en italien, français et anglais. L'interface est en italien.

---

## 🇬🇧 English

Hidden-movement game for 2 or more players on **a single phone or tablet**.
One player is **Jack**, moving secretly through London; the others are the **Police**, with 3 detectives.

**Getting started**
1. Open the game and tap **Nuova partita** (New game) → **Inizia** (Start); the recommended settings are preselected.
2. **Police**: place the detectives on the guard posts ⚑.
3. Hand the device to **Jack**: he secretly picks a starting lamp post ✦ and one crime location per night, each in a different district (districts are separated by the red dashed lines).
4. Taking turns: Jack moves in secret, then the Police move their detectives and **search for clues** or **arrest**.
5. Jack wins by completing every night's crime; the Police win by arresting him, surrounding him, or if Jack runs out of moves.

The in-game menu has a **🌍 Quick start** guide in Italian, French and English. The interface is in Italian.

---

## Tecnico · Technique · Technical

- Solo file statici (HTML, CSS, JavaScript): funziona su GitHub Pages. · Fichiers statiques uniquement. · Static files only.
- Avvio locale · Lancement local · Run locally: `python -m http.server 8765` → `http://localhost:8765`
- `js/sim.js`: simulatore e generatore di mappe bilanciate (~189 luoghi, Jack vince ~50% tra IA). · Simulateur et générateur de cartes équilibrées. · Simulator and balanced map generator.
- `node tools/balance.js` · `node tools/certify.js`
