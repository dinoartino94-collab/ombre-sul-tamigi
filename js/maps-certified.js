'use strict';
// Generato da tools/certify.js — percentuale di vittorie di Jack misurata su 2000 partite
// simulate indipendenti (non quelle usate per la selezione), con intervallo di confidenza al 95%.
// Regole: {"nights":4,"limit":15,"reveal":5,"revealLag":3,"specials":2,"detectives":3}
const CERTIFIED_MAPS = [
 {
  "params": {
   "seed": 1788458060,
   "cols": 15,
   "rows": 8,
   "river": 3,
   "bridges": [
    2
   ],
   "remove": 8,
   "jitter": 32,
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
     5
    ]
   ],
   "riverMode": "random"
  },
  "jackRate": 0.515,
  "ci95": 0.022,
  "games": 2000,
  "locations": 190
 },
 {
  "params": {
   "seed": 204429183,
   "cols": 15,
   "rows": 9,
   "river": 3,
   "bridges": [
    3,
    5,
    12
   ],
   "remove": 36,
   "jitter": 34,
   "stretches": 7,
   "stretchDist": [
    0.4,
    0.3,
    0.2,
    0.1
   ],
   "water": [
    [
     1,
     7
    ],
    [
     9,
     14
    ]
   ],
   "riverMode": "random"
  },
  "jackRate": 0.484,
  "ci95": 0.022,
  "games": 2000,
  "locations": 190
 },
 {
  "params": {
   "seed": 2676017210,
   "cols": 15,
   "rows": 9,
   "river": 3,
   "bridges": [
    0,
    4,
    10,
    13
   ],
   "remove": 32,
   "jitter": 37,
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
  "jackRate": 0.523,
  "ci95": 0.022,
  "games": 2000,
  "locations": 192
 },
 {
  "params": {
   "seed": 3211220652,
   "cols": 14,
   "rows": 9,
   "river": 3,
   "bridges": [
    10
   ],
   "remove": 25,
   "jitter": 35,
   "stretches": 7,
   "stretchDist": [
    0.4,
    0.3,
    0.2,
    0.1
   ],
   "water": [
    [
     8,
     11
    ]
   ],
   "riverMode": "random"
  },
  "jackRate": 0.519,
  "ci95": 0.022,
  "games": 2000,
  "locations": 191
 },
 {
  "params": {
   "seed": 4133701011,
   "cols": 15,
   "rows": 9,
   "river": 3,
   "bridges": [
    8
   ],
   "remove": 33,
   "jitter": 45,
   "stretches": 11,
   "stretchDist": [
    0.4,
    0.3,
    0.2,
    0.1
   ],
   "water": [
    [
     6,
     10
    ]
   ],
   "riverMode": "random"
  },
  "jackRate": 0.49,
  "ci95": 0.022,
  "games": 2000,
  "locations": 192
 },
 {
  "params": {
   "seed": 1000564466,
   "cols": 15,
   "rows": 9,
   "river": 3,
   "bridges": [
    1,
    4,
    6,
    11,
    14
   ],
   "remove": 33,
   "jitter": 32,
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
  "jackRate": 0.525,
  "ci95": 0.022,
  "games": 2000,
  "locations": 189
 },
 {
  "params": {
   "seed": 2323661502,
   "cols": 15,
   "rows": 9,
   "river": 3,
   "bridges": [],
   "remove": 39,
   "jitter": 34,
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
  "jackRate": 0.516,
  "ci95": 0.022,
  "games": 2000,
  "locations": 189
 },
 {
  "params": {
   "seed": 2676017210,
   "cols": 15,
   "rows": 9,
   "river": 3,
   "bridges": [],
   "remove": 43,
   "jitter": 37,
   "stretches": 7,
   "stretchDist": [
    0.4,
    0.3,
    0.2,
    0.1
   ],
   "water": [],
   "riverMode": "none"
  },
  "jackRate": 0.478,
  "ci95": 0.022,
  "games": 2000,
  "locations": 188
 },
 {
  "params": {
   "seed": 3415649835,
   "cols": 15,
   "rows": 8,
   "river": 3,
   "bridges": [],
   "remove": 14,
   "jitter": 49,
   "stretches": 7,
   "stretchDist": [
    0.4,
    0.3,
    0.2,
    0.1
   ],
   "water": [],
   "riverMode": "none"
  },
  "jackRate": 0.478,
  "ci95": 0.022,
  "games": 2000,
  "locations": 192
 },
 {
  "params": {
   "seed": 2458248267,
   "cols": 15,
   "rows": 9,
   "river": 3,
   "bridges": [],
   "remove": 39,
   "jitter": 40,
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
  "jackRate": 0.479,
  "ci95": 0.022,
  "games": 2000,
  "locations": 189
 },
 {
  "params": {
   "seed": 191089423,
   "cols": 15,
   "rows": 9,
   "river": 3,
   "bridges": [],
   "remove": 41,
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
  "jackRate": 0.512,
  "ci95": 0.022,
  "games": 2000,
  "locations": 189
 },
 {
  "params": {
   "seed": 3380728626,
   "cols": 15,
   "rows": 9,
   "river": 3,
   "bridges": [],
   "remove": 43,
   "jitter": 42,
   "stretches": 7,
   "stretchDist": [
    0.4,
    0.3,
    0.2,
    0.1
   ],
   "water": [],
   "riverMode": "none"
  },
  "jackRate": 0.49,
  "ci95": 0.022,
  "games": 2000,
  "locations": 187
 },
 {
  "params": {
   "seed": 3041712678,
   "cols": 15,
   "rows": 9,
   "river": 3,
   "bridges": [
    1,
    6,
    9,
    14
   ],
   "remove": 32,
   "jitter": 31,
   "stretches": 7,
   "stretchDist": [
    0.4,
    0.3,
    0.2,
    0.1
   ]
  },
  "jackRate": 0.496,
  "ci95": 0.022,
  "games": 2000,
  "locations": 189
 },
 {
  "params": {
   "seed": 147926525,
   "cols": 14,
   "rows": 9,
   "river": 3,
   "bridges": [
    2,
    6,
    7,
    11
   ],
   "remove": 14,
   "jitter": 36,
   "stretches": 8,
   "stretchDist": [
    0.4,
    0.3,
    0.2,
    0.1
   ]
  },
  "jackRate": 0.508,
  "ci95": 0.022,
  "games": 2000,
  "locations": 192
 },
 {
  "params": {
   "seed": 3189639203,
   "cols": 15,
   "rows": 9,
   "river": 3,
   "bridges": [
    1,
    5,
    6,
    10,
    12
   ],
   "remove": 27,
   "jitter": 32,
   "stretches": 10,
   "stretchDist": [
    0.4,
    0.3,
    0.2,
    0.1
   ]
  },
  "jackRate": 0.511,
  "ci95": 0.022,
  "games": 2000,
  "locations": 192
 },
 {
  "params": {
   "seed": 2676017210,
   "cols": 15,
   "rows": 9,
   "river": 3,
   "bridges": [
    0,
    4,
    10,
    13
   ],
   "remove": 32,
   "jitter": 37,
   "stretches": 7,
   "stretchDist": [
    0.4,
    0.3,
    0.2,
    0.1
   ]
  },
  "jackRate": 0.523,
  "ci95": 0.022,
  "games": 2000,
  "locations": 192
 },
 {
  "params": {
   "seed": 1000564466,
   "cols": 15,
   "rows": 9,
   "river": 3,
   "bridges": [
    1,
    4,
    6,
    11,
    14
   ],
   "remove": 33,
   "jitter": 32,
   "stretches": 7,
   "stretchDist": [
    0.4,
    0.3,
    0.2,
    0.1
   ]
  },
  "jackRate": 0.525,
  "ci95": 0.022,
  "games": 2000,
  "locations": 189
 },
 {
  "params": {
   "seed": 1387841383,
   "cols": 15,
   "rows": 9,
   "river": 3,
   "bridges": [
    1,
    3,
    6,
    10,
    12
   ],
   "remove": 29,
   "jitter": 39,
   "stretches": 9,
   "stretchDist": [
    0.4,
    0.3,
    0.2,
    0.1
   ]
  },
  "jackRate": 0.522,
  "ci95": 0.022,
  "games": 2000,
  "locations": 190
 }
];
if (typeof module !== 'undefined' && module.exports) module.exports = CERTIFIED_MAPS;
