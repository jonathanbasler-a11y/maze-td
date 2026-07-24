import { LEVELS } from '../content/levels';
import { CampaignMeta, RESEARCH_NODES } from '../content/research';
import { BASE_TOWER_ORDER, TOWER_DEFS } from '../content/towers';
import { SimState } from '../sim/SimState';
import type { Cell, LevelDef, TowerId } from '../sim/types';

export type ZeroLeakResult = {
  levelId: string;
  ok: boolean;
  phase: string;
  lives: number;
  startLives: number;
  leaks: number;
  ticks: number;
  towers: number;
  pathLen: number;
};

function place(sim: SimState, id: TowerId, cell: Cell): boolean {
  sim.setSelectedTower(id);
  return sim.tryPlace(cell);
}

function totalPathLen(sim: SimState, candidate?: Cell): number | null {
  const was =
    candidate && !sim.grid.isBlocked(candidate.c, candidate.r)
      ? false
      : true;
  if (candidate && !was) sim.grid.markBlocked(candidate.c, candidate.r);
  let total = 0;
  let min = Infinity;
  for (const spawn of sim.grid.spawns) {
    const path = sim.paths.shortestFrom(spawn);
    if (!path) {
      if (candidate && !was) sim.grid.unmarkBlocked(candidate.c, candidate.r);
      return null;
    }
    total += path.length;
    min = Math.min(min, path.length);
  }
  if (candidate && !was) sim.grid.unmarkBlocked(candidate.c, candidate.r);
  // Prefer raising the shortest lane
  return min * 1000 + total;
}

/** Greedy lengthen: maximize weakest spawn path. */
function mazeGreedy(sim: SimState, maxPlaces: number): void {
  for (let n = 0; n < maxPlaces; n++) {
    if (sim.gold < sim.towerDefs.blocker.cost) break;
    const before = totalPathLen(sim);
    if (before == null) break;
    let best: Cell | null = null;
    let bestScore = before;
    const { width, height } = sim.grid;
    for (let r = 1; r < height - 1; r++) {
      for (let c = 1; c < width - 1; c++) {
        const cell = { c, r };
        if (!sim.hoverPlacementOk(cell)) continue;
        const score = totalPathLen(sim, cell);
        if (score == null) continue;
        if (score > bestScore) {
          bestScore = score;
          best = cell;
        }
      }
    }
    if (!best || bestScore <= before) break;
    if (!place(sim, 'blocker', best)) break;
  }
}

function dpsAlongPath(sim: SimState, order: TowerId[]): void {
  const slots: Cell[] = [];
  for (const spawn of sim.grid.spawns) {
    const path = sim.paths.shortestFrom(spawn);
    if (!path || path.length < 4) continue;
    for (let i = 2; i < path.length - 2; i++) {
      const p = path[i]!;
      slots.push(p);
      for (const [dc, dr] of [
        [0, 1],
        [0, -1],
        [1, 0],
        [-1, 0],
      ] as const) {
        slots.push({ c: p.c + dc, r: p.r + dr });
      }
    }
  }
  const seen = new Set<string>();
  for (const cell of slots) {
    const key = `${cell.c},${cell.r}`;
    if (seen.has(key)) continue;
    seen.add(key);
    for (const id of order) {
      const def = sim.towerDefs[id];
      if (!def || def.damage <= 0) continue;
      if (sim.gold < def.cost) continue;
      if (place(sim, id, cell)) break;
    }
  }
}

function seedGunsNearSpawns(sim: SimState, unlocked: TowerId[]): void {
  const gunId: TowerId = unlocked.includes('gatling')
    ? 'gatling'
    : unlocked.includes('gun')
      ? 'gun'
      : unlocked.find((id) => (sim.towerDefs[id]?.damage ?? 0) > 0) ?? 'gun';
  const def = sim.towerDefs[gunId];
  if (!def) return;

  const budget = Math.floor(sim.gold * 0.45);
  const floor = sim.gold - budget;

  for (const spawn of sim.grid.spawns) {
    const offsets: Cell[] =
      spawn.r === 0
        ? [
            { c: spawn.c, r: spawn.r + 2 },
            { c: spawn.c - 1, r: spawn.r + 2 },
            { c: spawn.c + 1, r: spawn.r + 2 },
            { c: spawn.c, r: spawn.r + 3 },
          ]
        : [
            { c: spawn.c + 2, r: spawn.r },
            { c: spawn.c + 2, r: spawn.r - 1 },
            { c: spawn.c + 2, r: spawn.r + 1 },
            { c: spawn.c + 3, r: spawn.r },
            { c: spawn.c + 3, r: spawn.r - 1 },
            { c: spawn.c + 3, r: spawn.r + 1 },
          ];
    for (const cell of offsets) {
      if (sim.gold - def.cost < floor) return;
      place(sim, gunId, cell);
    }
  }
}

function spendAll(sim: SimState, unlocked: TowerId[]): void {
  const dpsOrder = (
    [
      'spike',
      'gun',
      'frost',
      'gatling',
      'glue',
      'sniper',
      'mortar',
      'laser',
      'tesla',
      'beam',
      'bunker',
    ] as TowerId[]
  ).filter((id) => unlocked.includes(id));

  // Anchor DPS on every lane first
  seedGunsNearSpawns(sim, unlocked);

  const multi = sim.grid.spawns.length > 1 || sim.grid.goals.length > 1;
  const startGold = sim.gold;
  const mazeBudget = Math.floor(startGold * (multi ? 0.15 : 0.3));
  const mazeFloor = Math.max(0, sim.gold - mazeBudget);
  const wallCost = sim.towerDefs.blocker.cost;

  if (!multi) {
    buildSerpentineLimited(sim, mazeFloor);
  }

  while (sim.gold - wallCost >= mazeFloor) {
    const before = totalPathLen(sim);
    if (before == null) break;
    let best: Cell | null = null;
    let bestScore = before;
    const { width, height } = sim.grid;
    for (let r = 1; r < height - 1; r++) {
      for (let c = 1; c < width - 1; c++) {
        const cell = { c, r };
        if (!sim.hoverPlacementOk(cell)) continue;
        const score = totalPathLen(sim, cell);
        if (score == null) continue;
        if (score > bestScore) {
          bestScore = score;
          best = cell;
        }
      }
    }
    if (!best || bestScore <= before) break;
    if (!place(sim, 'blocker', best)) break;
  }

  dpsAlongPath(sim, dpsOrder);
  mazeGreedy(sim, multi ? 12 : 25);
  dpsAlongPath(sim, dpsOrder);
}

function buildSerpentineLimited(sim: SimState, goldFloor: number): void {
  const { width, height } = sim.grid;
  const spawns = new Set(sim.grid.spawns.map((s) => `${s.c},${s.r}`));
  const goals = new Set(sim.grid.goals.map((g) => `${g.c},${g.r}`));
  const wallCost = sim.towerDefs.blocker.cost;

  for (let r = 2; r < height - 2; r++) {
    const leaveLeft = r % 2 === 0;
    for (let c = 1; c < width - 1; c++) {
      if (sim.gold - wallCost < goldFloor) return;
      const key = `${c},${r}`;
      if (spawns.has(key) || goals.has(key)) continue;
      if (leaveLeft && c <= 2) continue;
      if (!leaveLeft && c >= width - 3) continue;
      if (!sim.hoverPlacementOk({ c, r })) continue;
      place(sim, 'blocker', { c, r });
    }
  }
}

function fullResearchCampaign(): CampaignMeta {
  const m = new CampaignMeta();
  m.rp = 50_000;
  for (let pass = 0; pass < 8; pass++) {
    for (const n of RESEARCH_NODES) m.tryBuy(n.id);
  }
  return m;
}

export function attemptZeroLeak(
  level: LevelDef,
  opts?: { withResearch?: boolean; maxTicks?: number },
): ZeroLeakResult {
  const withResearch = opts?.withResearch ?? false;
  const campaign = withResearch ? fullResearchCampaign() : new CampaignMeta();

  const unlocked = withResearch
    ? campaign.unlockedTowerIds()
    : (BASE_TOWER_ORDER.filter(
        (id) => !TOWER_DEFS[id].requiresResearch,
      ) as TowerId[]);

  const sim = new SimState({
    level,
    towerDefs: withResearch ? campaign.towerDefs() : structuredClone(TOWER_DEFS),
    unlockedTowerIds: unlocked,
    bountyMul: withResearch ? campaign.bountyMul() : 1,
    startGoldBonus: withResearch ? campaign.startGoldBonus() : 0,
    startLivesBonus: withResearch ? campaign.startLivesBonus() : 0,
    rpKillBonus: withResearch ? campaign.rpPerKillBonus() : 0,
  });

  const startLives = sim.lives;
  let leaks = 0;
  const maxTicks = opts?.maxTicks ?? 300_000;
  let lastSpendWave = -1;

  spendAll(sim, unlocked);
  lastSpendWave = sim.waveIndex;
  sim.drainEvents();

  while (sim.tick < maxTicks && sim.phase !== 'won' && sim.phase !== 'lost') {
    if (sim.phase === 'prep' && sim.waveIndex !== lastSpendWave) {
      spendAll(sim, unlocked);
      lastSpendWave = sim.waveIndex;
    }
    sim.step(1);
    for (const e of sim.drainEvents()) {
      if (e.type === 'creep_leaked') leaks += e.damage;
    }
  }

  return {
    levelId: level.id,
    ok: sim.phase === 'won' && sim.lives === startLives && leaks === 0,
    phase: sim.phase,
    lives: sim.lives,
    startLives,
    leaks,
    ticks: sim.tick,
    towers: sim.getTowers().length,
    pathLen: sim.getPrimaryPath()?.length ?? 0,
  };
}

export function checkAllZeroLeak(): ZeroLeakResult[] {
  return LEVELS.map((level, i) =>
    // Multi-lane endgame maps expect research unlocks
    attemptZeroLeak(level, { withResearch: i >= 3 }),
  );
}
