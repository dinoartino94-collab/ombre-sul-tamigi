'use strict';
// Generato da tools/certify.js — percentuale di vittorie di Jack misurata su 2000 partite
// simulate indipendenti (non quelle usate per la selezione), con intervallo di confidenza al 95%.
// nearRate: la stessa misura con un Jack che sceglie sempre le mete piu' vicine.
// Regole: {"nights":4,"limit":15,"reveal":5,"revealLag":3,"specials":2,"detectives":3,"minDist":6}
const CERTIFIED_MAPS = [
 {
  "params": {
   "seed": 1013904226,
   "cols": 13,
   "rows": 9,
   "river": 3,
   "bridges": [
    1,
    4,
    5,
    9,
    11
   ],
   "remove": 0,
   "jitter": 47,
   "stretches": 8,
   "stretchDist": [
    0.4,
    0.3,
    0.2,
    0.1
   ],
   "water": [
    [
     0,
     12
    ]
   ],
   "riverMode": "random"
  },
  "jackRate": 0.482,
  "nearRate": 0.526,
  "ci95": 0.022,
  "games": 2000,
  "locations": 192
 },
 {
  "params": {
   "seed": 1401181143,
   "cols": 15,
   "rows": 8,
   "river": 3,
   "bridges": [],
   "remove": 10,
   "jitter": 49,
   "stretches": 8,
   "stretchDist": [
    0.4,
    0.3,
    0.2,
    0.1
   ],
   "water": [
    [
     6,
     9
    ]
   ],
   "riverMode": "random"
  },
  "jackRate": 0.485,
  "nearRate": 0.466,
  "ci95": 0.022,
  "games": 2000,
  "locations": 189
 },
 {
  "params": {
   "seed": 3816266512,
   "cols": 15,
   "rows": 9,
   "river": 3,
   "bridges": [
    1,
    4,
    7,
    9,
    14
   ],
   "remove": 33,
   "jitter": 38,
   "stretches": 7,
   "stretchDist": [
    0.4,
    0.3,
    0.2,
    0.1
   ],
   "water": [
    [
     0,
     14
    ]
   ],
   "riverMode": "random"
  },
  "jackRate": 0.481,
  "nearRate": 0.494,
  "ci95": 0.022,
  "games": 2000,
  "locations": 188
 },
 {
  "params": {
   "seed": 922480359,
   "cols": 15,
   "rows": 8,
   "river": 3,
   "bridges": [
    2,
    3,
    8,
    10,
    13
   ],
   "remove": 0,
   "jitter": 32,
   "stretches": 11,
   "stretchDist": [
    0.4,
    0.3,
    0.2,
    0.1
   ],
   "water": [
    [
     0,
     14
    ]
   ],
   "riverMode": "random"
  },
  "jackRate": 0.477,
  "nearRate": 0.486,
  "ci95": 0.022,
  "games": 2000,
  "locations": 190
 },
 {
  "params": {
   "seed": 3576916120,
   "cols": 15,
   "rows": 8,
   "river": 3,
   "bridges": [],
   "remove": 9,
   "jitter": 44,
   "stretches": 7,
   "stretchDist": [
    0.4,
    0.3,
    0.2,
    0.1
   ],
   "water": [
    [
     0,
     5
    ]
   ],
   "riverMode": "random"
  },
  "jackRate": 0.472,
  "nearRate": 0.492,
  "ci95": 0.022,
  "games": 2000,
  "locations": 189
 },
 {
  "params": {
   "seed": 1992887243,
   "cols": 15,
   "rows": 8,
   "river": 3,
   "bridges": [],
   "remove": 0,
   "jitter": 36,
   "stretches": 10,
   "stretchDist": [
    0.4,
    0.3,
    0.2,
    0.1
   ],
   "water": [
    [
     0,
     5
    ],
    [
     7,
     11
    ]
   ],
   "riverMode": "random"
  },
  "jackRate": 0.519,
  "nearRate": 0.541,
  "ci95": 0.022,
  "games": 2000,
  "locations": 188
 },
 {
  "params": {
   "seed": 3668339987,
   "cols": 15,
   "rows": 9,
   "river": 3,
   "bridges": [],
   "remove": 39,
   "jitter": 30,
   "stretches": 9,
   "stretchDist": [
    0.4,
    0.3,
    0.2,
    0.1
   ],
   "water": [],
   "riverMode": "none"
  },
  "jackRate": 0.501,
  "nearRate": 0.507,
  "ci95": 0.022,
  "games": 2000,
  "locations": 187
 },
 {
  "params": {
   "seed": 387276917,
   "cols": 15,
   "rows": 8,
   "river": 3,
   "bridges": [],
   "remove": 12,
   "jitter": 40,
   "stretches": 8,
   "stretchDist": [
    0.4,
    0.3,
    0.2,
    0.1
   ],
   "water": [],
   "riverMode": "none"
  },
  "jackRate": 0.501,
  "nearRate": 0.538,
  "ci95": 0.022,
  "games": 2000,
  "locations": 182
 },
 {
  "params": {
   "seed": 1549107668,
   "cols": 15,
   "rows": 8,
   "river": 3,
   "bridges": [],
   "remove": 12,
   "jitter": 44,
   "stretches": 8,
   "stretchDist": [
    0.4,
    0.3,
    0.2,
    0.1
   ],
   "water": [],
   "riverMode": "none"
  },
  "jackRate": 0.517,
  "nearRate": 0.497,
  "ci95": 0.022,
  "games": 2000,
  "locations": 188
 },
 {
  "params": {
   "seed": 4203543429,
   "cols": 13,
   "rows": 9,
   "river": 3,
   "bridges": [],
   "remove": 5,
   "jitter": 33,
   "stretches": 9,
   "stretchDist": [
    0.4,
    0.3,
    0.2,
    0.1
   ],
   "water": [],
   "riverMode": "none"
  },
  "jackRate": 0.5,
  "nearRate": 0.516,
  "ci95": 0.022,
  "games": 2000,
  "locations": 192
 },
 {
  "params": {
   "seed": 1457683801,
   "cols": 15,
   "rows": 8,
   "river": 3,
   "bridges": [],
   "remove": 12,
   "jitter": 41,
   "stretches": 8,
   "stretchDist": [
    0.4,
    0.3,
    0.2,
    0.1
   ],
   "water": [],
   "riverMode": "none"
  },
  "jackRate": 0.484,
  "nearRate": 0.506,
  "ci95": 0.022,
  "games": 2000,
  "locations": 192
 },
 {
  "params": {
   "seed": 1844960718,
   "cols": 14,
   "rows": 9,
   "river": 3,
   "bridges": [],
   "remove": 20,
   "jitter": 46,
   "stretches": 10,
   "stretchDist": [
    0.4,
    0.3,
    0.2,
    0.1
   ],
   "water": [],
   "riverMode": "none"
  },
  "jackRate": 0.495,
  "nearRate": 0.53,
  "ci95": 0.022,
  "games": 2000,
  "locations": 190
 },
 {
  "params": {
   "seed": 1013904226,
   "cols": 13,
   "rows": 9,
   "river": 3,
   "bridges": [
    1,
    4,
    5,
    9,
    11
   ],
   "remove": 0,
   "jitter": 47,
   "stretches": 8,
   "stretchDist": [
    0.4,
    0.3,
    0.2,
    0.1
   ]
  },
  "jackRate": 0.482,
  "nearRate": 0.526,
  "ci95": 0.022,
  "games": 2000,
  "locations": 192
 },
 {
  "params": {
   "seed": 3428989595,
   "cols": 15,
   "rows": 8,
   "river": 3,
   "bridges": [
    0,
    3,
    7,
    10,
    14
   ],
   "remove": 2,
   "jitter": 32,
   "stretches": 8,
   "stretchDist": [
    0.4,
    0.3,
    0.2,
    0.1
   ]
  },
  "jackRate": 0.476,
  "nearRate": 0.519,
  "ci95": 0.022,
  "games": 2000,
  "locations": 192
 },
 {
  "params": {
   "seed": 2802362286,
   "cols": 14,
   "rows": 9,
   "river": 3,
   "bridges": [
    2,
    5,
    7,
    13
   ],
   "remove": 16,
   "jitter": 37,
   "stretches": 7,
   "stretchDist": [
    0.4,
    0.3,
    0.2,
    0.1
   ]
  },
  "jackRate": 0.501,
  "nearRate": 0.501,
  "ci95": 0.022,
  "games": 2000,
  "locations": 187
 },
 {
  "params": {
   "seed": 3816266512,
   "cols": 15,
   "rows": 9,
   "river": 3,
   "bridges": [
    1,
    4,
    7,
    9,
    14
   ],
   "remove": 33,
   "jitter": 38,
   "stretches": 7,
   "stretchDist": [
    0.4,
    0.3,
    0.2,
    0.1
   ]
  },
  "jackRate": 0.481,
  "nearRate": 0.494,
  "ci95": 0.022,
  "games": 2000,
  "locations": 188
 },
 {
  "params": {
   "seed": 2175734977,
   "cols": 15,
   "rows": 8,
   "river": 3,
   "bridges": [
    1,
    4,
    8,
    14
   ],
   "remove": 0,
   "jitter": 39,
   "stretches": 11,
   "stretchDist": [
    0.4,
    0.3,
    0.2,
    0.1
   ]
  },
  "jackRate": 0.502,
  "nearRate": 0.486,
  "ci95": 0.022,
  "games": 2000,
  "locations": 190
 },
 {
  "params": {
   "seed": 535203442,
   "cols": 15,
   "rows": 8,
   "river": 3,
   "bridges": [
    2,
    3,
    6,
    11,
    14
   ],
   "remove": 4,
   "jitter": 46,
   "stretches": 7,
   "stretchDist": [
    0.4,
    0.3,
    0.2,
    0.1
   ]
  },
  "jackRate": 0.492,
  "nearRate": 0.516,
  "ci95": 0.022,
  "games": 2000,
  "locations": 186
 }
];
if (typeof module !== 'undefined' && module.exports) module.exports = CERTIFIED_MAPS;
