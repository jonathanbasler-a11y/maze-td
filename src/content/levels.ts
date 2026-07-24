import type { LevelDef, WaveDef } from '../sim/types';
import {
  MAP_ARENA,
  MAP_CHOKE,
  MAP_CROSS,
  MAP_DELTA,
  MAP_DUAL,
  MAP_DUAL_GOAL,
  MAP_GAUNTLET,
  MAP_LABYRINTH,
  MAP_NARROW,
  MAP_PINCERS,
  MAP_RING,
  MAP_SIEGE,
  MAP_SPIRAL_HINT,
  MAP_STRAIGHT,
} from './maps';

/** 30 tick/s — first wave build time is forced to 10s in SimState. */
function w(
  prepTicks: number,
  groups: WaveDef['groups'],
): WaveDef {
  return { prepTicks, groups };
}

function bg(n: number): string {
  return `bg_L${((n - 1) % 8) + 1}`;
}

export const LEVELS: LevelDef[] = [
  {
    id: 'L1',
    name: 'Basic Training',
    blurb: 'Learn to maze. Walls are free power.',
    bgKey: bg(1),
    map: MAP_STRAIGHT,
    waves: [
      w(50, [{ enemyId: 'grunt', count: 4, intervalTicks: 32 }]),
      w(55, [{ enemyId: 'scout', count: 5, intervalTicks: 20 }]),
      w(55, [{ enemyId: 'grunt', count: 6, intervalTicks: 24 }]),
      w(60, [{ enemyId: 'tank', count: 1, intervalTicks: 60 }]),
      w(60, [
        { enemyId: 'grunt', count: 6, intervalTicks: 20 },
        { enemyId: 'scout', count: 4, intervalTicks: 18 },
      ]),
    ],
  },
  {
    id: 'L2',
    name: 'Stone Gate',
    blurb: 'Natural chokes — stack DPS on the corridor.',
    bgKey: bg(2),
    map: MAP_CHOKE,
    waves: [
      w(40, [{ enemyId: 'grunt', count: 10, intervalTicks: 18 }]),
      w(45, [{ enemyId: 'swarm', count: 18, intervalTicks: 6 }]),
      w(50, [
        { enemyId: 'tank', count: 3, intervalTicks: 40 },
        { enemyId: 'scout', count: 8, intervalTicks: 14 },
      ]),
      w(50, [{ enemyId: 'raider', count: 6, intervalTicks: 18 }]),
      w(55, [{ enemyId: 'boss', count: 1, intervalTicks: 10 }]),
    ],
  },
  {
    id: 'L3',
    name: 'Rock Islands',
    blurb: 'Weave around islands. Frost helps at corners.',
    bgKey: bg(3),
    map: MAP_SPIRAL_HINT,
    waves: [
      w(40, [{ enemyId: 'scout', count: 18, intervalTicks: 12 }]),
      w(45, [{ enemyId: 'runner', count: 16, intervalTicks: 10 }]),
      w(45, [{ enemyId: 'swarm', count: 36, intervalTicks: 5 }]),
      w(50, [
        { enemyId: 'tank', count: 6, intervalTicks: 28 },
        { enemyId: 'grunt', count: 14, intervalTicks: 14 },
      ]),
      w(55, [{ enemyId: 'boss', count: 1, intervalTicks: 10 }]),
    ],
  },
  {
    id: 'L4',
    name: 'Twin Approaches',
    blurb: 'Two spawns. Merge paths early or die tired.',
    bgKey: bg(4),
    map: MAP_DUAL,
    waves: [
      w(55, [
        { enemyId: 'grunt', count: 2, intervalTicks: 36, spawnIndex: 0 },
        { enemyId: 'grunt', count: 2, intervalTicks: 36, spawnIndex: 1 },
      ]),
      w(60, [
        { enemyId: 'scout', count: 3, intervalTicks: 24, spawnIndex: 0 },
        { enemyId: 'scout', count: 3, intervalTicks: 24, spawnIndex: 1 },
      ]),
      w(60, [
        { enemyId: 'swarm', count: 6, intervalTicks: 10, spawnIndex: 0 },
        { enemyId: 'swarm', count: 6, intervalTicks: 10, spawnIndex: 1 },
      ]),
      w(60, [
        { enemyId: 'tank', count: 1, intervalTicks: 60, spawnIndex: 0 },
        { enemyId: 'grunt', count: 3, intervalTicks: 28, spawnIndex: 1 },
      ]),
    ],
  },
  {
    id: 'L5',
    name: 'Forked Road',
    blurb: 'Two exits. Cover both — or seal one with walls.',
    bgKey: bg(5),
    map: MAP_DUAL_GOAL,
    waves: [
      w(40, [{ enemyId: 'grunt', count: 8, intervalTicks: 18 }]),
      w(45, [{ enemyId: 'scout', count: 10, intervalTicks: 14 }]),
      w(50, [
        { enemyId: 'tank', count: 2, intervalTicks: 48 },
        { enemyId: 'swarm', count: 12, intervalTicks: 7 },
      ]),
      w(55, [{ enemyId: 'elite', count: 3, intervalTicks: 24 }]),
      w(60, [{ enemyId: 'boss', count: 1, intervalTicks: 10 }]),
    ],
  },
  {
    id: 'L6',
    name: 'Ravine',
    blurb: 'Tight map. Mortars and spikes shine.',
    bgKey: bg(6),
    map: MAP_NARROW,
    waves: [
      w(35, [{ enemyId: 'swarm', count: 32, intervalTicks: 4 }]),
      w(40, [{ enemyId: 'runner', count: 18, intervalTicks: 8 }]),
      w(45, [
        { enemyId: 'tank', count: 7, intervalTicks: 26 },
        { enemyId: 'scout', count: 16, intervalTicks: 8 },
      ]),
      w(50, [{ enemyId: 'carrier', count: 1, intervalTicks: 10 }]),
      w(50, [
        { enemyId: 'swarm', count: 40, intervalTicks: 3 },
        { enemyId: 'armored', count: 3, intervalTicks: 30 },
      ]),
    ],
  },
  {
    id: 'L7',
    name: 'Arena Bowl',
    blurb: 'Big board. Snipers earn their keep.',
    bgKey: bg(7),
    map: MAP_ARENA,
    waves: [
      w(40, [{ enemyId: 'grunt', count: 22, intervalTicks: 12 }]),
      w(45, [{ enemyId: 'elite', count: 10, intervalTicks: 14 }]),
      w(45, [{ enemyId: 'armored', count: 5, intervalTicks: 28 }]),
      w(50, [
        { enemyId: 'swarm', count: 48, intervalTicks: 3 },
        { enemyId: 'raider', count: 12, intervalTicks: 10 },
      ]),
      w(55, [
        { enemyId: 'boss', count: 1, intervalTicks: 10 },
        { enemyId: 'runner', count: 16, intervalTicks: 8 },
      ]),
      w(60, [
        { enemyId: 'boss', count: 2, intervalTicks: 60 },
        { enemyId: 'carrier', count: 1, intervalTicks: 40 },
      ]),
    ],
  },
  {
    id: 'L8',
    name: 'Gauntlet',
    blurb: 'Long kill corridor. Build deep mazes.',
    bgKey: bg(8),
    map: MAP_GAUNTLET,
    waves: [
      w(35, [{ enemyId: 'scout', count: 24, intervalTicks: 8 }]),
      w(40, [{ enemyId: 'runner', count: 22, intervalTicks: 7 }]),
      w(40, [{ enemyId: 'swarm', count: 50, intervalTicks: 3 }]),
      w(45, [
        { enemyId: 'armored', count: 6, intervalTicks: 24 },
        { enemyId: 'elite', count: 8, intervalTicks: 14 },
      ]),
      w(50, [
        { enemyId: 'boss', count: 1, intervalTicks: 10 },
        { enemyId: 'raider', count: 14, intervalTicks: 10 },
      ]),
      w(55, [
        { enemyId: 'boss', count: 2, intervalTicks: 55 },
        { enemyId: 'carrier', count: 2, intervalTicks: 50 },
        { enemyId: 'swarm', count: 40, intervalTicks: 3 },
      ]),
    ],
  },
  {
    id: 'L9',
    name: 'Crossroads',
    blurb: 'Open center — force long paths or die to runners.',
    bgKey: bg(1),
    map: MAP_CROSS,
    waves: [
      w(40, [{ enemyId: 'runner', count: 20, intervalTicks: 9 }]),
      w(45, [{ enemyId: 'raider', count: 16, intervalTicks: 11 }]),
      w(45, [
        { enemyId: 'elite', count: 10, intervalTicks: 14 },
        { enemyId: 'swarm', count: 30, intervalTicks: 4 },
      ]),
      w(50, [{ enemyId: 'armored', count: 6, intervalTicks: 26 }]),
      w(55, [
        { enemyId: 'boss', count: 1, intervalTicks: 10 },
        { enemyId: 'carrier', count: 1, intervalTicks: 30 },
      ]),
    ],
  },
  {
    id: 'L10',
    name: 'Ring Moat',
    blurb: 'Ring rocks force a lap. Glue + gatling love this.',
    bgKey: bg(2),
    map: MAP_RING,
    waves: [
      w(40, [{ enemyId: 'grunt', count: 20, intervalTicks: 12 }]),
      w(40, [{ enemyId: 'runner', count: 24, intervalTicks: 7 }]),
      w(45, [{ enemyId: 'elite', count: 12, intervalTicks: 12 }]),
      w(50, [
        { enemyId: 'armored', count: 5, intervalTicks: 28 },
        { enemyId: 'raider', count: 14, intervalTicks: 10 },
      ]),
      w(55, [
        { enemyId: 'boss', count: 1, intervalTicks: 10 },
        { enemyId: 'swarm', count: 40, intervalTicks: 3 },
      ]),
    ],
  },
  {
    id: 'L11',
    name: 'Siege Lines',
    blurb: 'Twin lanes into stacked fortifications.',
    bgKey: bg(3),
    map: MAP_SIEGE,
    waves: [
      w(45, [
        { enemyId: 'grunt', count: 5, intervalTicks: 22, spawnIndex: 0 },
        { enemyId: 'grunt', count: 5, intervalTicks: 22, spawnIndex: 1 },
      ]),
      w(50, [
        { enemyId: 'scout', count: 6, intervalTicks: 16, spawnIndex: 0 },
        { enemyId: 'scout', count: 6, intervalTicks: 16, spawnIndex: 1 },
      ]),
      w(55, [
        { enemyId: 'tank', count: 1, intervalTicks: 50, spawnIndex: 0 },
        { enemyId: 'elite', count: 3, intervalTicks: 24, spawnIndex: 1 },
      ]),
      w(60, [
        { enemyId: 'boss', count: 1, intervalTicks: 10, spawnIndex: 0 },
        { enemyId: 'swarm', count: 12, intervalTicks: 6, spawnIndex: 1 },
      ]),
    ],
  },
  {
    id: 'L12',
    name: 'Labyrinth',
    blurb: 'Deep maze map. Research Beam before attempting.',
    bgKey: bg(4),
    map: MAP_LABYRINTH,
    waves: [
      w(35, [{ enemyId: 'scout', count: 26, intervalTicks: 8 }]),
      w(40, [{ enemyId: 'runner', count: 28, intervalTicks: 6 }]),
      w(40, [{ enemyId: 'elite', count: 14, intervalTicks: 12 }]),
      w(45, [
        { enemyId: 'armored', count: 7, intervalTicks: 22 },
        { enemyId: 'swarm', count: 45, intervalTicks: 3 },
      ]),
      w(50, [
        { enemyId: 'carrier', count: 2, intervalTicks: 45 },
        { enemyId: 'raider', count: 16, intervalTicks: 9 },
      ]),
      w(55, [
        { enemyId: 'boss', count: 2, intervalTicks: 50 },
        { enemyId: 'elite', count: 12, intervalTicks: 12 },
      ]),
    ],
  },
  {
    id: 'L13',
    name: 'River Delta',
    blurb: 'Three exits. Split defense or seal aggressively.',
    bgKey: bg(5),
    map: MAP_DELTA,
    waves: [
      w(40, [{ enemyId: 'raider', count: 18, intervalTicks: 11 }]),
      w(45, [{ enemyId: 'runner', count: 22, intervalTicks: 8 }]),
      w(45, [
        { enemyId: 'elite', count: 12, intervalTicks: 13 },
        { enemyId: 'tank', count: 6, intervalTicks: 24 },
      ]),
      w(50, [{ enemyId: 'armored', count: 6, intervalTicks: 26 }]),
      w(55, [
        { enemyId: 'boss', count: 1, intervalTicks: 10 },
        { enemyId: 'carrier', count: 2, intervalTicks: 40 },
        { enemyId: 'swarm', count: 36, intervalTicks: 3 },
      ]),
    ],
  },
  {
    id: 'L14',
    name: 'Pincer Attack',
    blurb: 'Three spawns. Endgame pressure — bring research.',
    bgKey: bg(6),
    map: MAP_PINCERS,
    waves: [
      w(55, [
        { enemyId: 'scout', count: 3, intervalTicks: 22, spawnIndex: 0 },
        { enemyId: 'scout', count: 3, intervalTicks: 22, spawnIndex: 1 },
      ]),
      w(60, [
        { enemyId: 'grunt', count: 3, intervalTicks: 26, spawnIndex: 0 },
        { enemyId: 'grunt', count: 3, intervalTicks: 26, spawnIndex: 1 },
      ]),
      w(60, [
        { enemyId: 'elite', count: 2, intervalTicks: 32, spawnIndex: 0 },
        { enemyId: 'tank', count: 1, intervalTicks: 50, spawnIndex: 1 },
      ]),
      w(60, [
        { enemyId: 'boss', count: 1, intervalTicks: 10, spawnIndex: 0 },
        { enemyId: 'swarm', count: 10, intervalTicks: 7, spawnIndex: 1 },
      ]),
    ],
  },
];

export function clampLevelIndex(i: number): number {
  if (LEVELS.length === 0) return 0;
  return ((i % LEVELS.length) + LEVELS.length) % LEVELS.length;
}
