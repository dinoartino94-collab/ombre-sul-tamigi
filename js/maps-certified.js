'use strict';
// Generato da tools/certify.js — percentuale di vittorie di Jack misurata su 2000 partite
// simulate indipendenti (non quelle usate per la selezione), con intervallo di confidenza al 95%.
// Regole: {"nights":4,"limit":15,"reveal":5,"revealLag":3,"specials":2,"detectives":3}
const CERTIFIED_MAPS = [
 {
  "params": {
   "seed": 4055616904,
   "cols": 15,
   "rows": 8,
   "river": 3,
   "bridges": [
    2,
    4,
    6,
    9,
    14
   ],
   "remove": 18,
   "jitter": 38
  },
  "jackRate": 0.478,
  "ci95": 0.022,
  "games": 2000,
  "locations": 189
 },
 {
  "params": {
   "seed": 774553834,
   "cols": 15,
   "rows": 8,
   "river": 3,
   "bridges": [
    0,
    3,
    7,
    11
   ],
   "remove": 17,
   "jitter": 37
  },
  "jackRate": 0.508,
  "ci95": 0.022,
  "games": 2000,
  "locations": 189
 },
 {
  "params": {
   "seed": 1161830751,
   "cols": 15,
   "rows": 8,
   "river": 3,
   "bridges": [
    1,
    4,
    7,
    11,
    13
   ],
   "remove": 18,
   "jitter": 40
  },
  "jackRate": 0.508,
  "ci95": 0.022,
  "games": 2000,
  "locations": 189
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
   "remove": 17,
   "jitter": 39
  },
  "jackRate": 0.505,
  "ci95": 0.022,
  "games": 2000,
  "locations": 189
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
   "remove": 18,
   "jitter": 32
  },
  "jackRate": 0.511,
  "ci95": 0.022,
  "games": 2000,
  "locations": 189
 },
 {
  "params": {
   "seed": 3576916120,
   "cols": 15,
   "rows": 8,
   "river": 3,
   "bridges": [
    2,
    4,
    7,
    11,
    13
   ],
   "remove": 18,
   "jitter": 44
  },
  "jackRate": 0.477,
  "ci95": 0.022,
  "games": 2000,
  "locations": 189
 },
 {
  "params": {
   "seed": 3964193037,
   "cols": 15,
   "rows": 8,
   "river": 3,
   "bridges": [
    1,
    3,
    6,
    11,
    13
   ],
   "remove": 18,
   "jitter": 37
  },
  "jackRate": 0.519,
  "ci95": 0.022,
  "games": 2000,
  "locations": 189
 },
 {
  "params": {
   "seed": 3337565728,
   "cols": 15,
   "rows": 8,
   "river": 3,
   "bridges": [
    2,
    5,
    8,
    12
   ],
   "remove": 17,
   "jitter": 39
  },
  "jackRate": 0.472,
  "ci95": 0.022,
  "games": 2000,
  "locations": 189
 },
 {
  "params": {
   "seed": 1697034193,
   "cols": 15,
   "rows": 8,
   "river": 3,
   "bridges": [
    1,
    4,
    7,
    11
   ],
   "remove": 17,
   "jitter": 41
  },
  "jackRate": 0.489,
  "ci95": 0.022,
  "games": 2000,
  "locations": 189
 },
 {
  "params": {
   "seed": 1070406884,
   "cols": 13,
   "rows": 9,
   "river": 3,
   "bridges": [
    0,
    3,
    5,
    9,
    11
   ],
   "remove": 15,
   "jitter": 39
  },
  "jackRate": 0.517,
  "ci95": 0.022,
  "games": 2000,
  "locations": 189
 },
 {
  "params": {
   "seed": 3724842645,
   "cols": 13,
   "rows": 9,
   "river": 3,
   "bridges": [
    0,
    4,
    6,
    7,
    10
   ],
   "remove": 15,
   "jitter": 42
  },
  "jackRate": 0.484,
  "ci95": 0.022,
  "games": 2000,
  "locations": 189
 },
 {
  "params": {
   "seed": 2084311110,
   "cols": 15,
   "rows": 8,
   "river": 3,
   "bridges": [
    0,
    3,
    8,
    11,
    13
   ],
   "remove": 18,
   "jitter": 48
  },
  "jackRate": 0.496,
  "ci95": 0.022,
  "games": 2000,
  "locations": 189
 }
];
if (typeof module !== 'undefined' && module.exports) module.exports = CERTIFIED_MAPS;
