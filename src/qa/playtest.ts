import { ENEMY_DEFS } from '../content/enemies';
import { LEVELS } from '../content/levels';
import {
  CampaignMeta,
  RESEARCH_BY_ID,
  RESEARCH_NODES,
} from '../content/research';
import { BASE_TOWER_ORDER, TOWER_DEFS, TOWER_ORDER } from '../content/towers';
import { SimState } from '../sim/SimState';
import type { LevelDef } from '../sim/types';

export type ContentIssue = { level?: string; message: string };

/** Static content validation — maps, waves, towers. */
export function validateContent(): ContentIssue[] {
  const issues: ContentIssue[] = [];

  for (const id of BASE_TOWER_ORDER) {
    const t = TOWER_DEFS[id];
    if (!t) {
      issues.push({ message: `missing tower ${id}` });
      continue;
    }
    if (!t.blurb?.trim()) issues.push({ message: `tower ${id} missing blurb` });
    if (t.cost < 0) issues.push({ message: `tower ${id} negative cost` });
    if (t.fireCooldownTicks < 0) {
      issues.push({ message: `tower ${id} bad cooldown` });
    }
    if (t.requiresResearch && !RESEARCH_BY_ID[t.requiresResearch]) {
      issues.push({
        message: `tower ${id} requires unknown research ${t.requiresResearch}`,
      });
    }
  }

  for (const id of TOWER_ORDER) {
    if (!TOWER_DEFS[id]) issues.push({ message: `base roster missing ${id}` });
  }

  for (const node of RESEARCH_NODES) {
    if (node.cost < 1) {
      issues.push({ message: `research ${node.id} bad cost` });
    }
    for (const req of node.requires) {
      if (!RESEARCH_BY_ID[req]) {
        issues.push({ message: `research ${node.id} bad requires ${req}` });
      }
    }
    if (node.effect.kind === 'unlock_tower' && !TOWER_DEFS[node.effect.towerId]) {
      issues.push({
        message: `research ${node.id} unlocks missing tower`,
      });
    }
  }

  // Fresh campaign should unlock only base towers
  const meta = new CampaignMeta();
  const unlocked = meta.unlockedTowerIds();
  if (unlocked.length !== TOWER_ORDER.length) {
    issues.push({
      message: `fresh unlocks ${unlocked.length} != base ${TOWER_ORDER.length}`,
    });
  }

  for (const level of LEVELS) {
    issues.push(...validateLevel(level));
  }
  return issues;
}

export function validateLevel(level: LevelDef): ContentIssue[] {
  const issues: ContentIssue[] = [];
  const tag = level.id;
  const map = level.map;

  if (map.cells.length !== map.width * map.height) {
    issues.push({
      level: tag,
      message: `cell count ${map.cells.length} != ${map.width * map.height}`,
    });
  }
  if (map.spawns.length < 1) {
    issues.push({ level: tag, message: 'no spawns' });
  }
  if (map.goals.length < 1) {
    issues.push({ level: tag, message: 'no goals' });
  }
  if (map.startingGold < 0 || map.startingLives < 1) {
    issues.push({ level: tag, message: 'bad starting economy' });
  }

  for (const s of map.spawns) {
    if (s.c < 0 || s.r < 0 || s.c >= map.width || s.r >= map.height) {
      issues.push({ level: tag, message: `spawn OOB ${s.c},${s.r}` });
      continue;
    }
    const cell = map.cells[s.r * map.width + s.c];
    if (!cell?.walkable) {
      issues.push({ level: tag, message: `spawn not walkable ${s.c},${s.r}` });
    }
  }
  for (const g of map.goals) {
    if (g.c < 0 || g.r < 0 || g.c >= map.width || g.r >= map.height) {
      issues.push({ level: tag, message: `goal OOB ${g.c},${g.r}` });
      continue;
    }
    const cell = map.cells[g.r * map.width + g.c];
    if (!cell?.walkable) {
      issues.push({ level: tag, message: `goal not walkable ${g.c},${g.r}` });
    }
  }

  if (level.waves.length < 1) {
    issues.push({ level: tag, message: 'no waves' });
  }

  for (let wi = 0; wi < level.waves.length; wi++) {
    const wave = level.waves[wi]!;
    if (wave.groups.length < 1) {
      issues.push({ level: tag, message: `wave ${wi + 1} empty` });
    }
    for (const g of wave.groups) {
      if (!ENEMY_DEFS[g.enemyId]) {
        issues.push({
          level: tag,
          message: `wave ${wi + 1} unknown enemy ${g.enemyId}`,
        });
      }
      if (g.count < 1 || g.intervalTicks < 1) {
        issues.push({
          level: tag,
          message: `wave ${wi + 1} bad group count/interval`,
        });
      }
    }
  }

  // Live path check
  const sim = new SimState({ level, towerDefs: TOWER_DEFS });
  if (!sim.paths.pathsExist()) {
    issues.push({ level: tag, message: 'initial spawn→goal path missing' });
  }
  return issues;
}

/**
 * Headless playtest: burn build time, place a gun corridor, run until end.
 * Returns outcome stats (does not assert win — used for crash/softlock QA).
 */
export function playtestLevel(
  level: LevelDef,
  opts?: { maxTicks?: number; seedPlace?: boolean },
): {
  ticks: number;
  phase: string;
  lives: number;
  gold: number;
  creeps: number;
  towers: number;
  events: number;
} {
  const sim = new SimState({ level, towerDefs: TOWER_DEFS });
  const maxTicks = opts?.maxTicks ?? 200_000;
  let events = 0;

  // Skip first build window quickly for automated runs.
  if (sim.phase === 'prep') {
    sim.step(sim.phaseTimer);
    events += sim.drainEvents().length;
  }

  if (opts?.seedPlace !== false) {
    // Place a few guns near mid-board if buildable.
    sim.setSelectedTower('gun');
    const midC = Math.floor(level.map.width / 2);
    const midR = Math.floor(level.map.height / 2);
    for (const [dc, dr] of [
      [0, 0],
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [2, 0],
      [-2, 0],
    ] as const) {
      sim.tryPlace({ c: midC + dc, r: midR + dr });
    }
    events += sim.drainEvents().length;
  }

  while (
    sim.tick < maxTicks &&
    sim.phase !== 'won' &&
    sim.phase !== 'lost'
  ) {
    sim.step(1);
    events += sim.drainEvents().length;
  }

  return {
    ticks: sim.tick,
    phase: sim.phase,
    lives: sim.lives,
    gold: sim.gold,
    creeps: sim.getCreeps().length,
    towers: sim.getTowers().length,
    events,
  };
}

/** Determinism check: same inputs → same tick outcome. */
export function assertDeterministic(level: LevelDef): boolean {
  const a = playtestLevel(level, { maxTicks: 20_000 });
  const b = playtestLevel(level, { maxTicks: 20_000 });
  return (
    a.ticks === b.ticks &&
    a.phase === b.phase &&
    a.lives === b.lives &&
    a.gold === b.gold &&
    a.towers === b.towers
  );
}
