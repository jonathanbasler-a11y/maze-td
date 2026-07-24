import type { Cell, CellFlags, MapDef } from '../sim/types';

function idx(width: number, c: number, r: number): number {
  return r * width + c;
}

/** Empty open field with rock border; mid-edge spawn/goal openings. */
export function createOpenField(
  id: string,
  name: string,
  width: number,
  height: number,
  opts: {
    gold: number;
    lives: number;
    spawns?: Cell[];
    goals?: Cell[];
  },
): MapDef {
  const midR = Math.floor(height / 2);
  const spawns = opts.spawns ?? [{ c: 0, r: midR }];
  const goals = opts.goals ?? [{ c: width - 1, r: midR }];
  const open = new Set(
    [...spawns, ...goals].map((p) => `${p.c},${p.r}`),
  );

  const cells: CellFlags[] = [];
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      const border = c === 0 || r === 0 || c === width - 1 || r === height - 1;
      const portal = open.has(`${c},${r}`);
      cells.push({
        walkable: !border || portal,
        buildable: !border,
      });
    }
  }

  return {
    id,
    name,
    width,
    height,
    cells,
    spawns,
    goals,
    jugglingPolicy: 'disabled',
    startingGold: opts.gold,
    startingLives: opts.lives,
  };
}

/** Paint permanent rock obstacles (non-walkable, non-buildable). */
export function paintRocks(map: MapDef, rocks: Cell[]): MapDef {
  const cells = map.cells.map((c) => ({ ...c }));
  for (const rock of rocks) {
    if (rock.c < 0 || rock.r < 0 || rock.c >= map.width || rock.r >= map.height) {
      continue;
    }
    // Never seal spawn/goal
    if (
      map.spawns.some((s) => s.c === rock.c && s.r === rock.r) ||
      map.goals.some((g) => g.c === rock.c && g.r === rock.r)
    ) {
      continue;
    }
    cells[idx(map.width, rock.c, rock.r)] = {
      walkable: false,
      buildable: false,
    };
  }
  return { ...map, cells };
}

function rectRocks(
  c0: number,
  r0: number,
  c1: number,
  r1: number,
): Cell[] {
  const out: Cell[] = [];
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) out.push({ c, r });
  }
  return out;
}

export const MAP_STRAIGHT = createOpenField('straight', 'Open Plains', 18, 12, {
  gold: 150,
  lives: 12,
});

export const MAP_CHOKE = paintRocks(
  createOpenField('choke', 'Stone Gate', 18, 12, { gold: 145, lives: 11 }),
  [
    ...rectRocks(6, 1, 7, 4),
    ...rectRocks(6, 7, 7, 10),
    ...rectRocks(11, 1, 12, 4),
    ...rectRocks(11, 7, 12, 10),
  ],
);

export const MAP_SPIRAL_HINT = paintRocks(
  createOpenField('islands', 'Rock Islands', 20, 14, { gold: 155, lives: 11 }),
  [
    ...rectRocks(4, 3, 6, 5),
    ...rectRocks(9, 2, 11, 4),
    ...rectRocks(14, 3, 16, 5),
    ...rectRocks(4, 8, 6, 10),
    ...rectRocks(9, 9, 11, 11),
    ...rectRocks(14, 8, 16, 10),
    ...rectRocks(8, 6, 12, 7),
  ],
);

export const MAP_DUAL = paintRocks(
  createOpenField('dual', 'Twin Approaches', 20, 14, {
    gold: 350,
    lives: 12,
    spawns: [
      { c: 0, r: 3 },
      { c: 0, r: 10 },
    ],
    goals: [{ c: 19, r: 7 }],
  }),
  [
    // Force both lanes into a shared mid corridor
    ...rectRocks(4, 1, 5, 5),
    ...rectRocks(4, 8, 5, 12),
    ...rectRocks(10, 1, 11, 4),
    ...rectRocks(10, 9, 11, 12),
    ...rectRocks(15, 1, 16, 5),
    ...rectRocks(15, 9, 16, 12),
  ],
);

export const MAP_DUAL_GOAL = createOpenField('fork', 'Forked Road', 18, 12, {
  gold: 210,
  lives: 12,
  spawns: [{ c: 0, r: 6 }],
  goals: [
    { c: 17, r: 2 },
    { c: 17, r: 9 },
  ],
});

export const MAP_NARROW = paintRocks(
  createOpenField('narrow', 'Ravine', 16, 10, { gold: 140, lives: 10 }),
  [
    ...rectRocks(3, 1, 4, 3),
    ...rectRocks(3, 6, 4, 8),
    ...rectRocks(7, 1, 8, 2),
    ...rectRocks(7, 7, 8, 8),
    ...rectRocks(11, 1, 12, 3),
    ...rectRocks(11, 6, 12, 8),
  ],
);

export const MAP_ARENA = paintRocks(
  createOpenField('arena', 'Arena Bowl', 22, 14, { gold: 180, lives: 14 }),
  [
    ...rectRocks(5, 3, 7, 5),
    ...rectRocks(14, 3, 16, 5),
    ...rectRocks(5, 8, 7, 10),
    ...rectRocks(14, 8, 16, 10),
    ...rectRocks(10, 1, 11, 2),
    ...rectRocks(10, 11, 11, 12),
  ],
);

export const MAP_GAUNTLET = paintRocks(
  createOpenField('gauntlet', 'Gauntlet', 24, 10, {
    gold: 175,
    lives: 10,
    spawns: [{ c: 0, r: 5 }],
    goals: [{ c: 23, r: 5 }],
  }),
  [
    ...rectRocks(4, 1, 5, 3),
    ...rectRocks(4, 6, 5, 8),
    ...rectRocks(9, 1, 10, 4),
    ...rectRocks(9, 6, 10, 8),
    ...rectRocks(14, 1, 15, 3),
    ...rectRocks(14, 6, 15, 8),
    ...rectRocks(19, 1, 20, 4),
    ...rectRocks(19, 6, 20, 8),
  ],
);

export const MAP_CROSS = paintRocks(
  createOpenField('cross', 'Crossroads', 20, 14, { gold: 165, lives: 11 }),
  [
    ...rectRocks(4, 4, 6, 5),
    ...rectRocks(13, 4, 15, 5),
    ...rectRocks(4, 8, 6, 9),
    ...rectRocks(13, 8, 15, 9),
    ...rectRocks(9, 2, 10, 3),
    ...rectRocks(9, 10, 10, 11),
  ],
);

export const MAP_RING = paintRocks(
  createOpenField('ring', 'Ring Moat', 18, 14, {
    gold: 160,
    lives: 11,
    spawns: [{ c: 0, r: 7 }],
    goals: [{ c: 17, r: 7 }],
  }),
  [
    ...rectRocks(5, 3, 12, 3),
    ...rectRocks(5, 10, 12, 10),
    ...rectRocks(5, 4, 5, 9),
    ...rectRocks(12, 4, 12, 9),
    // leave gaps at mid sides
  ].filter((p) => !(p.c === 5 && p.r === 7) && !(p.c === 12 && p.r === 7)),
);

export const MAP_SIEGE = paintRocks(
  createOpenField('siege', 'Siege Lines', 22, 12, {
    gold: 260,
    lives: 12,
    spawns: [
      { c: 0, r: 3 },
      { c: 0, r: 8 },
    ],
    goals: [{ c: 21, r: 6 }],
  }),
  [
    ...rectRocks(6, 1, 7, 4),
    ...rectRocks(6, 7, 7, 10),
    ...rectRocks(12, 2, 13, 5),
    ...rectRocks(12, 6, 13, 9),
    ...rectRocks(17, 1, 18, 3),
    ...rectRocks(17, 8, 18, 10),
  ],
);

export const MAP_LABYRINTH = paintRocks(
  createOpenField('labyrinth', 'Labyrinth', 24, 14, { gold: 190, lives: 12 }),
  [
    ...rectRocks(3, 2, 4, 6),
    ...rectRocks(3, 8, 4, 11),
    ...rectRocks(8, 1, 9, 5),
    ...rectRocks(8, 9, 9, 12),
    ...rectRocks(13, 3, 14, 7),
    ...rectRocks(13, 9, 14, 12),
    ...rectRocks(18, 1, 19, 4),
    ...rectRocks(18, 7, 19, 12),
  ],
);

export const MAP_DELTA = createOpenField('delta', 'River Delta', 20, 14, {
  gold: 175,
  lives: 11,
  spawns: [{ c: 0, r: 7 }],
  goals: [
    { c: 19, r: 2 },
    { c: 19, r: 7 },
    { c: 19, r: 11 },
  ],
});

export const MAP_PINCERS = paintRocks(
  createOpenField('pincers', 'Pincer Attack', 22, 12, {
    gold: 450,
    lives: 13,
    spawns: [
      { c: 0, r: 2 },
      { c: 0, r: 9 },
    ],
    goals: [{ c: 21, r: 6 }],
  }),
  [
    ...rectRocks(5, 1, 6, 4),
    ...rectRocks(5, 7, 6, 10),
    ...rectRocks(11, 1, 12, 3),
    ...rectRocks(11, 8, 12, 10),
    ...rectRocks(16, 1, 17, 4),
    ...rectRocks(16, 7, 17, 10),
  ],
);

/** @deprecated use MAP_STRAIGHT */
export function createDemoMap(): MapDef {
  return MAP_STRAIGHT;
}
