'use strict';
/* Guida rapida per iniziare — Italiano, Français, English */
const QUICKSTART = {
  it: {
    lang: 'Italiano', flag: '🇮🇹',
    title: 'Guida rapida',
    intro: 'Un giocatore è <b>Jack</b>, che si muove in segreto per Londra. Gli altri sono la <b>Polizia</b>, che lo bracca con 3 detective. Si gioca con <b>un solo telefono o tablet</b> che si passa di mano.',
    sections: [
      ['🎯 Obiettivo', '<b>Jack</b> deve raggiungere di nascosto un luogo del delitto per ogni notte (4 notti), entro 15 mosse a notte. <b>La Polizia</b> vince se lo arresta, se lo circonda o se Jack non arriva in tempo.'],
      ['🗺️ La mappa', '<ul><li><b>Cerchi numerati</b> = luoghi: Jack si muove qui.</li><li><b>Quadrati</b> = incroci: i detective si muovono qui.</li><li><b>Linee rosse tratteggiate</b> = confini dei 4 distretti. Il fiume (se c’è) può essere intero, corto, un lago o spezzato.</li><li><b>Strade lunghe</b> senza cerchi: Jack le attraversa con un solo movimento, se nessun detective ne occupa gli incroci.</li><li>Trascina per spostare, pizzica o usa la rotella per lo zoom.</li></ul>'],
      ['🚀 Per iniziare', '<ol><li>Tocca <b>Nuova partita</b>, lascia le impostazioni consigliate e tocca <b>Inizia</b>.</li><li><b>Polizia</b>: piazza i 3 detective sui posti di guardia ⚑.</li><li>Passa il dispositivo a <b>Jack</b>: sceglie in segreto un lampione ✦ di partenza e un luogo del delitto per ogni notte, ognuno in un distretto diverso e di norma ad almeno 6 passi dal precedente (la distanza si imposta e si abbassa da sola se le mete possibili sono poche).</li><li>Si alternano i turni: prima Jack, poi la Polizia.</li></ol>'],
      ['🔪 Turno di Jack', 'Tocca un luogo evidenziato vicino e conferma. Non puoi passare da un incrocio occupato da un detective. Mosse speciali (ogni gettone si usa una volta, di base 2 per tipo): <b>🐎 Carrozza</b> (2 passi), <b>🚪 Vicolo</b> (attraversa un isolato), <b>⛵ Barca</b> (tra cerchi blu vicini, senza superare un ponte). Con una mossa speciale non puoi entrare nel luogo del delitto. La Polizia sa quale mossa speciale usi, ma non dove vai.'],
      ['🕵 Turno della Polizia', 'Ogni detective si muove fino a 2 incroci, poi sceglie: <b>🔍 Cerca indizi</b> nei luoghi accanto (si ferma al primo indizio: Jack è passato di lì in questa notte) oppure <b>⛓ Arresta</b> in un solo luogo accanto (se Jack è lì, la Polizia vince). <b>L’ultima mossa è sempre della Polizia</b>: quando Jack arriva al luogo del delitto non lo dice, e la Polizia gioca ancora un turno in cui può arrestarlo.'],
      ['👁 Testimone', 'Ogni 5 turni un testimone rivela dove si trovava Jack 3 turni prima. Il punto resta segnato in viola.'],
      ['📜 Appunti', 'La Polizia ha un registro, un blocco note e la matita ✎ per segnare i luoghi sospetti (?) o esclusi (✗).'],
      ['📱 Passare il dispositivo', 'Quando appare la schermata «Passa il dispositivo», consegnalo all\'altro giocatore: solo lui deve toccare per continuare. Jack può attivare <b>🔄 Ruota la mappa</b> per non far capire dove tocca.'],
    ],
  },
  fr: {
    lang: 'Français', flag: '🇫🇷',
    title: 'Guide rapide',
    intro: 'Un joueur est <b>Jack</b>, qui se déplace en secret dans Londres. Les autres sont la <b>Police</b>, qui le traque avec 3 détectives. On joue avec <b>un seul téléphone ou une seule tablette</b> que l\'on se passe.',
    sections: [
      ['🎯 But du jeu', '<b>Jack</b> doit atteindre en secret un lieu de crime à chaque nuit (4 nuits), en 15 mouvements maximum par nuit. <b>La Police</b> gagne si elle l\'arrête, l\'encercle ou si Jack n\'arrive pas à temps.'],
      ['🗺️ Le plan', '<ul><li><b>Cercles numérotés</b> = lieux : Jack se déplace ici.</li><li><b>Carrés</b> = carrefours : les détectives se déplacent ici.</li><li><b>Lignes rouges en pointillés</b> = limites des 4 quartiers. Le fleuve (s’il y en a un) peut être entier, court, un lac ou coupé en deux.</li><li><b>Longues rues</b> sans cercles : Jack les traverse en un seul mouvement, si aucun détective n’occupe leurs carrefours.</li><li>Faites glisser pour déplacer, pincez ou utilisez la molette pour zoomer.</li></ul>'],
      ['🚀 Pour commencer', '<ol><li>Touchez <b>Nuova partita</b> (Nouvelle partie), gardez les réglages conseillés et touchez <b>Inizia</b> (Commencer).</li><li><b>Police</b> : placez les 3 détectives sur les postes de garde ⚑.</li><li>Passez l\'appareil à <b>Jack</b> : il choisit en secret un réverbère ✦ de départ et un lieu de crime pour chaque nuit, chacun dans un quartier différent et en principe à au moins 6 pas du précédent (la distance est réglable et diminue d’elle-même s’il reste peu de lieux possibles).</li><li>Les tours alternent : d\'abord Jack, puis la Police.</li></ol>'],
      ['🔪 Tour de Jack', 'Touchez un lieu voisin en surbrillance et confirmez. Vous ne pouvez pas traverser un carrefour occupé par un détective. Mouvements spéciaux (chaque jeton s’utilise une fois, 2 par type de base) : <b>🐎 Fiacre</b> (2 pas), <b>🚪 Ruelle</b> (traverse un pâté de maisons), <b>⛵ Barque</b> (entre cercles bleus proches, sans passer un pont). Un mouvement spécial ne peut pas entrer dans le lieu du crime. La Police sait quel mouvement spécial vous utilisez, mais pas où vous allez.'],
      ['🕵 Tour de la Police', 'Chaque détective se déplace de 2 carrefours maximum, puis choisit : <b>🔍 Chercher des indices</b> dans les lieux voisins (s\'arrête au premier indice : Jack est passé par là cette nuit) ou <b>⛓ Arrêter</b> dans un seul lieu voisin (si Jack y est, la Police gagne). <b>Le dernier coup est toujours à la Police</b> : quand Jack arrive au lieu du crime, il ne le dit pas, et la Police joue encore un tour pendant lequel elle peut l’arrêter.'],
      ['👁 Témoin', 'Tous les 5 tours, un témoin révèle où se trouvait Jack 3 tours plus tôt. Le point reste marqué en violet.'],
      ['📜 Notes', 'La Police dispose d\'un journal, d\'un bloc-notes et du crayon ✎ pour marquer les lieux suspects (?) ou exclus (✗).'],
      ['📱 Passer l\'appareil', 'Quand l\'écran « Passa il dispositivo » (Passez l\'appareil) apparaît, donnez-le à l\'autre joueur : lui seul touche pour continuer. Jack peut activer <b>🔄 Rotation de la carte</b> pour qu\'on ne devine pas où il touche.'],
      ['ℹ️ Langue', 'L\'interface du jeu est en italien ; ce guide explique les boutons principaux.'],
    ],
  },
  en: {
    lang: 'English', flag: '🇬🇧',
    title: 'Quick start',
    intro: 'One player is <b>Jack</b>, moving secretly through London. The others are the <b>Police</b>, hunting him with 3 detectives. You play on <b>a single phone or tablet</b> that you pass around.',
    sections: [
      ['🎯 Goal', '<b>Jack</b> must secretly reach one crime location each night (4 nights), within 15 moves per night. <b>The Police</b> win by arresting him, surrounding him, or if Jack runs out of moves.'],
      ['🗺️ The map', '<ul><li><b>Numbered circles</b> = locations: Jack moves here.</li><li><b>Squares</b> = crossings: detectives move here.</li><li><b>Red dashed lines</b> = borders of the 4 districts. The river (if any) may be full, short, a lake or split in two.</li><li><b>Long streets</b> without circles: Jack crosses them in a single move, if no detective is on any of their crossings.</li><li>Drag to pan, pinch or use the mouse wheel to zoom.</li></ul>'],
      ['🚀 Getting started', '<ol><li>Tap <b>Nuova partita</b> (New game), keep the recommended settings and tap <b>Inizia</b> (Start).</li><li><b>Police</b>: place the 3 detectives on the guard posts ⚑.</li><li>Hand the device to <b>Jack</b>: he secretly picks a starting lamp post ✦ and one crime location per night, each in a different district and normally at least 6 steps from the previous one (the distance is adjustable and drops by itself when few locations are possible).</li><li>Turns alternate: Jack first, then the Police.</li></ol>'],
      ['🔪 Jack\'s turn', 'Tap a highlighted nearby location and confirm. You cannot pass through a crossing occupied by a detective. Special moves (each token once, 2 per type by default): <b>🐎 Coach</b> (2 steps), <b>🚪 Alley</b> (cut through a block), <b>⛵ Boat</b> (between nearby blue circles, without passing a bridge). A special move cannot enter the crime location. The Police learn which special move you used, but not where you went.'],
      ['🕵 Police turn', 'Each detective moves up to 2 crossings, then chooses: <b>🔍 Search for clues</b> in adjacent locations (stops at the first clue: Jack passed there this night) or <b>⛓ Arrest</b> at one adjacent location (if Jack is there, the Police win). <b>The Police always move last</b>: when Jack reaches the crime location he keeps it secret, and the Police play one more turn in which they can still arrest him.'],
      ['👁 Witness', 'Every 5 turns a witness reveals where Jack was 3 turns earlier. The spot stays marked in purple.'],
      ['📜 Notes', 'The Police have a log, a notepad and the pencil ✎ to mark suspicious (?) or ruled-out (✗) locations.'],
      ['📱 Passing the device', 'When the «Passa il dispositivo» (Pass the device) screen appears, hand it to the other player: only they tap to continue. Jack can turn on <b>🔄 Rotate map</b> so onlookers can\'t tell where he taps.'],
      ['ℹ️ Language', 'The game interface is in Italian; this guide explains the main buttons.'],
    ],
  },
};
if (typeof module !== 'undefined' && module.exports) module.exports = QUICKSTART;
