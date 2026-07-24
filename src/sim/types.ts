/** Grid cell coordinates (square grid, classic maze TD). */
export type Cell = { readonly c: number; readonly r: number };

export function cellKey(c: number, r: number): string {
  return `${c},${r}`;
}

export function sameCell(a: Cell, b: Cell): boolean {
  return a.c === b.c && a.r === b.r;
}

export type CellFlags = {
  walkable: boolean;
  buildable: boolean;
};

export type TowerId =
  | 'blocker'
  | 'gun'
  | 'frost'
  | 'sniper'
  | 'mortar'
  | 'spike'
  | 'gatling'
  | 'laser'
  | 'tesla'
  | 'glue'
  | 'bunker'
  | 'beam';

export type EnemyId =
  | 'scout'
  | 'grunt'
  | 'tank'
  | 'swarm'
  | 'boss'
  | 'runner'
  | 'armored'
  | 'elite'
  | 'carrier'
  | 'raider';

export type TowerDef = {
  id: TowerId;
  name: string;
  /** Short role blurb for the sidebar. */
  blurb: string;
  cost: number;
  blocks: boolean;
  range: number;
  damage: number;
  fireCooldownTicks: number;
  /** Splash radius in cells (0 = single target). */
  splash: number;
  /** Multiplier applied to creep speed for slowTicks (1 = no slow). */
  slowFactor: number;
  slowTicks: number;
  color: number;
  /** Hotkey digit when unlocked (assigned dynamically 1–9). */
  hotkey: string;
  /** Phaser texture key (public/assets/sprites/towers/<id>.png) */
  spriteKey: string;
  /** If set, tower starts locked until research unlocks it. */
  requiresResearch?: string;
};

export type EnemyDef = {
  id: EnemyId;
  name: string;
  hp: number;
  speedCellsPerTick: number;
  bounty: number;
  leakDamage: number;
  color: number;
  scale: number;
};

export type TowerInstance = {
  id: number;
  defId: TowerId;
  cell: Cell;
  cooldown: number;
};

export type CreepInstance = {
  id: number;
  enemyId: EnemyId;
  cell: Cell;
  t: number;
  path: Cell[];
  pathIndex: number;
  hp: number;
  maxHp: number;
  baseSpeed: number;
  slowFactor: number;
  slowTicks: number;
  bounty: number;
  leakDamage: number;
  color: number;
  scale: number;
};

export type RejectReason =
  | 'out_of_bounds'
  | 'not_buildable'
  | 'occupied'
  | 'cannot_afford'
  | 'would_seal_path'
  | 'unknown_tower'
  | 'sell_locked'
  | 'locked_tower';

export type SimEvent =
  | { type: 'place_ok'; cell: Cell; towerId: TowerId; cost: number }
  | { type: 'place_rejected'; cell: Cell; reason: RejectReason }
  | { type: 'path_rebuilt'; path: Cell[] }
  | { type: 'sell_ok'; cell: Cell; refund: number }
  | { type: 'creep_spawned'; creepId: number; enemyId: EnemyId }
  | { type: 'creep_leaked'; creepId: number; damage: number }
  | { type: 'creep_killed'; creepId: number; bounty: number; rp: number }
  | {
      type: 'tower_shot';
      towerDefId: TowerId;
      from: Cell;
      to: Cell;
      creepId: number;
      splash: number;
      color: number;
    }
  | { type: 'wave_start'; wave: number }
  | { type: 'wave_clear'; wave: number; rp: number }
  | { type: 'victory'; rp: number }
  | { type: 'defeat' }
  | { type: 'research_bought'; id: string; cost: number };

export type JugglingPolicy = 'disabled' | 'sell_cooldown' | 'free';

export type MapDef = {
  id: string;
  name: string;
  width: number;
  height: number;
  cells: CellFlags[];
  spawns: Cell[];
  goals: Cell[];
  jugglingPolicy: JugglingPolicy;
  startingGold: number;
  startingLives: number;
};

export type WaveGroup = {
  enemyId: EnemyId;
  count: number;
  /** Ticks between each spawn in this group. */
  intervalTicks: number;
  /** Which map spawn index to use (default 0, wraps). */
  spawnIndex?: number;
};

export type WaveDef = {
  /** Prep time before first spawn of this wave. */
  prepTicks: number;
  groups: WaveGroup[];
};

export type LevelDef = {
  id: string;
  name: string;
  blurb: string;
  /** Phaser texture key for the scenic nature backdrop. */
  bgKey: string;
  map: MapDef;
  waves: WaveDef[];
};

export type ResearchBranch =
  | 'offense'
  | 'control'
  | 'economy'
  | 'structure';

export type ResearchEffect =
  | { kind: 'unlock_tower'; towerId: TowerId }
  | {
      kind: 'tower_mod';
      towerId: TowerId;
      damageAdd?: number;
      rangeAdd?: number;
      costMul?: number;
      cooldownMul?: number;
      splashAdd?: number;
    }
  | {
      kind: 'global';
      startGoldAdd?: number;
      startLivesAdd?: number;
      bountyMul?: number;
      wallCostAdd?: number;
      rpKillAdd?: number;
    };

export type ResearchNodeDef = {
  id: string;
  name: string;
  blurb: string;
  cost: number;
  branch: ResearchBranch;
  requires: string[];
  /** Grid layout for the research panel. */
  col: number;
  row: number;
  effect: ResearchEffect;
};
