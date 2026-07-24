import { ENEMY_DEFS } from '../content/enemies';
import { GridMap } from './GridMap';
import { PathService } from './PathService';
import { PlacementGate } from './PlacementGate';
import type {
  Cell,
  CreepInstance,
  EnemyId,
  LevelDef,
  RejectReason,
  SimEvent,
  TowerDef,
  TowerId,
  TowerInstance,
  WaveDef,
} from './types';

export type SimConfig = {
  level: LevelDef;
  towerDefs: Record<TowerId, TowerDef>;
  /** Multiplier on kill bounty (research). */
  bountyMul?: number;
  startGoldBonus?: number;
  startLivesBonus?: number;
  /** Extra RP granted per kill. */
  rpKillBonus?: number;
  /** If set, only these towers may be selected/placed. */
  unlockedTowerIds?: readonly TowerId[];
};

type SpawnJob = {
  enemyId: EnemyId;
  remaining: number;
  interval: number;
  cooldown: number;
  spawnIndex: number;
};

/**
 * Deterministic maze TD simulation with wave tables.
 */
export class SimState {
  readonly grid: GridMap;
  readonly paths: PathService;
  readonly gate: PlacementGate;
  readonly towerDefs: Record<TowerId, TowerDef>;
  readonly level: LevelDef;

  tick = 0;
  gold: number;
  lives: number;
  selectedTower: TowerId = 'blocker';
  waveIndex = 0;
  /** prep | spawning | clear | won | lost */
  phase: 'prep' | 'spawning' | 'clear' | 'won' | 'lost' = 'prep';
  /** Ticks remaining in prep (public for HUD). */
  phaseTimer = 0;
  /** Set when HUD-relevant state changes. */
  dirty = true;

  private nextTowerId = 1;
  private nextCreepId = 1;
  private readonly towers = new Map<string, TowerInstance>();
  private creeps: CreepInstance[] = [];
  private events: SimEvent[] = [];
  private jobs: SpawnJob[] = [];
  private bountyMul: number;
  private rpKillBonus: number;
  private unlockedTowerIds: Set<TowerId> | null;

  constructor(cfg: SimConfig) {
    this.level = cfg.level;
    this.grid = new GridMap(cfg.level.map);
    this.paths = new PathService(this.grid);
    this.gate = new PlacementGate(this.grid, this.paths);
    this.towerDefs = cfg.towerDefs;
    this.bountyMul = cfg.bountyMul ?? 1;
    this.rpKillBonus = cfg.rpKillBonus ?? 0;
    this.unlockedTowerIds = cfg.unlockedTowerIds
      ? new Set(cfg.unlockedTowerIds)
      : null;
    this.gold = cfg.level.map.startingGold + (cfg.startGoldBonus ?? 0);
    this.lives = cfg.level.map.startingLives + (cfg.startLivesBonus ?? 0);
    this.paths.recomputePrimary();
    // Pick first unlocked tower
    if (this.unlockedTowerIds) {
      for (const id of this.unlockedTowerIds) {
        this.selectedTower = id;
        break;
      }
    }
    this.beginWave(0);
  }

  get waveCount(): number {
    return this.level.waves.length;
  }

  getTowers(): readonly TowerInstance[] {
    return [...this.towers.values()];
  }

  getCreeps(): readonly CreepInstance[] {
    return this.creeps;
  }

  getPrimaryPath(): Cell[] | null {
    return this.paths.getPrimary();
  }

  previewPath(hover: Cell | null): Cell[] | null {
    if (
      hover &&
      this.grid.canBuild(hover.c, hover.r) &&
      !this.towers.has(`${hover.c},${hover.r}`)
    ) {
      return this.paths.previewWithBlock(hover);
    }
    return this.paths.getPrimary();
  }

  /** False if hover placement would seal any spawn (multi-lane maps). */
  hoverPlacementOk(hover: Cell | null): boolean {
    if (!hover) return true;
    if (!this.grid.canBuild(hover.c, hover.r)) return false;
    if (this.towers.has(`${hover.c},${hover.r}`)) return false;
    const def = this.towerDefs[this.selectedTower];
    if (!def?.blocks) return true;
    return this.paths.wouldKeepPaths(hover);
  }

  setSelectedTower(id: TowerId): void {
    if (!this.towerDefs[id]) return;
    if (this.unlockedTowerIds && !this.unlockedTowerIds.has(id)) return;
    this.selectedTower = id;
    this.dirty = true;
  }

  /** Live-apply research unlocks / tower stats (gold/lives stay). */
  applyCampaignLive(opts: {
    towerDefs: Record<TowerId, TowerDef>;
    unlockedTowerIds: readonly TowerId[];
    bountyMul: number;
    rpKillBonus: number;
  }): void {
    for (const id of Object.keys(opts.towerDefs) as TowerId[]) {
      this.towerDefs[id] = { ...opts.towerDefs[id]! };
    }
    this.bountyMul = opts.bountyMul;
    this.rpKillBonus = opts.rpKillBonus;
    if (!this.unlockedTowerIds) {
      this.unlockedTowerIds = new Set(opts.unlockedTowerIds);
    } else {
      this.unlockedTowerIds.clear();
      for (const id of opts.unlockedTowerIds) this.unlockedTowerIds.add(id);
    }
    if (!this.unlockedTowerIds.has(this.selectedTower)) {
      for (const id of opts.unlockedTowerIds) {
        this.selectedTower = id;
        break;
      }
    }
    this.dirty = true;
  }

  tryPlace(cell: Cell): boolean {
    if (this.phase === 'won' || this.phase === 'lost') return false;
    const def = this.towerDefs[this.selectedTower];
    if (!def) {
      this.push({ type: 'place_rejected', cell, reason: 'unknown_tower' });
      return false;
    }
    if (this.unlockedTowerIds && !this.unlockedTowerIds.has(def.id)) {
      this.push({ type: 'place_rejected', cell, reason: 'locked_tower' });
      return false;
    }
    const key = `${cell.c},${cell.r}`;
    const result = this.gate.tryValidate(cell, def, this.gold, this.towers.has(key));
    if (!result.ok) {
      this.push({ type: 'place_rejected', cell, reason: result.reason });
      return false;
    }

    if (def.blocks) this.grid.markBlocked(cell.c, cell.r);
    this.gold -= def.cost;
    this.towers.set(key, {
      id: this.nextTowerId++,
      defId: def.id,
      cell: { ...cell },
      cooldown: 0,
    });
    const path = this.paths.recomputePrimary();
    this.push({ type: 'place_ok', cell, towerId: def.id, cost: def.cost });
    if (path) this.push({ type: 'path_rebuilt', path });
    this.repathCreeps();
    this.dirty = true;
    return true;
  }

  trySell(cell: Cell): boolean {
    if (this.phase === 'won' || this.phase === 'lost') return false;
    const key = `${cell.c},${cell.r}`;
    const tower = this.towers.get(key);
    if (!tower) return false;

    // No mid-combat juggling when policy is disabled.
    if (
      this.level.map.jugglingPolicy === 'disabled' &&
      this.phase !== 'prep'
    ) {
      this.push({ type: 'place_rejected', cell, reason: 'sell_locked' });
      return false;
    }

    const def = this.towerDefs[tower.defId];
    const refund = Math.floor(def.cost * 0.55);
    this.towers.delete(key);
    if (def.blocks) this.grid.unmarkBlocked(cell.c, cell.r);
    this.gold += refund;
    this.paths.recomputePrimary();
    this.push({ type: 'sell_ok', cell, refund });
    this.repathCreeps();
    this.dirty = true;
    return true;
  }

  drainEvents(): SimEvent[] {
    const out = this.events;
    this.events = [];
    return out;
  }

  step(n = 1): void {
    for (let i = 0; i < n; i++) this.tickOnce();
  }

  private beginWave(index: number): void {
    if (index >= this.level.waves.length) {
      this.phase = 'won';
      this.push({ type: 'victory', rp: 20 });
      this.dirty = true;
      return;
    }
    this.waveIndex = index;
    const wave = this.level.waves[index]!;
    this.phase = 'prep';
    // First wave of a level: always 10s build window (30 tick/s).
    this.phaseTimer = index === 0 ? 300 : Math.max(1, wave.prepTicks);
    this.jobs = [];
    this.push({ type: 'wave_start', wave: index + 1 });
    this.dirty = true;
  }

  private startSpawning(wave: WaveDef): void {
    this.phase = 'spawning';
    this.jobs = wave.groups.map((g) => ({
      enemyId: g.enemyId,
      remaining: g.count,
      interval: Math.max(1, g.intervalTicks),
      cooldown: 0,
      spawnIndex: g.spawnIndex ?? 0,
    }));
    this.dirty = true;
  }

  private tickOnce(): void {
    if (this.phase === 'won' || this.phase === 'lost') return;
    this.tick++;

    if (this.phase === 'prep') {
      this.phaseTimer--;
      this.dirty = true;
      if (this.phaseTimer <= 0) {
        this.startSpawning(this.level.waves[this.waveIndex]!);
      }
    } else if (this.phase === 'spawning') {
      this.runSpawnJobs();
      if (this.jobs.every((j) => j.remaining <= 0) && this.creeps.length === 0) {
        this.push({ type: 'wave_clear', wave: this.waveIndex + 1, rp: 5 });
        this.beginWave(this.waveIndex + 1);
      } else if (this.jobs.every((j) => j.remaining <= 0)) {
        this.phase = 'clear';
        this.dirty = true;
      }
    } else if (this.phase === 'clear') {
      if (this.creeps.length === 0) {
        this.push({ type: 'wave_clear', wave: this.waveIndex + 1, rp: 5 });
        this.beginWave(this.waveIndex + 1);
      }
    }

    // beginWave may transition to won; re-read without narrowed type.
    if (this.isTerminal()) return;

    const survivors: CreepInstance[] = [];
    for (const creep of this.creeps) {
      if (this.isTerminal()) break;

      if (creep.slowTicks > 0) creep.slowTicks--;
      else creep.slowFactor = 1;

      this.moveCreep(creep);
      if (creep.hp <= 0) {
        const bounty = Math.max(1, Math.round(creep.bounty * this.bountyMul));
        const rp = 1 + this.rpKillBonus + (creep.leakDamage >= 3 ? 1 : 0);
        this.gold += bounty;
        this.push({
          type: 'creep_killed',
          creepId: creep.id,
          bounty,
          rp,
        });
        this.dirty = true;
        continue;
      }
      if (creep.pathIndex >= creep.path.length - 1 && creep.t >= 1) {
        this.lives = Math.max(0, this.lives - creep.leakDamage);
        this.push({
          type: 'creep_leaked',
          creepId: creep.id,
          damage: creep.leakDamage,
        });
        this.dirty = true;
        if (this.lives <= 0) {
          this.phase = 'lost';
          this.push({ type: 'defeat' });
          break;
        }
        continue;
      }
      survivors.push(creep);
    }
    this.creeps = survivors;

    if (!this.isTerminal()) {
      this.fireTowers();
      this.sweepDeadCreeps();
    }
  }

  private isTerminal(): boolean {
    return this.phase === 'won' || this.phase === 'lost';
  }

  private sweepDeadCreeps(): void {
    if (!this.creeps.some((c) => c.hp <= 0)) return;
    const survivors: CreepInstance[] = [];
    for (const creep of this.creeps) {
      if (creep.hp <= 0) {
        const bounty = Math.max(1, Math.round(creep.bounty * this.bountyMul));
        const rp = 1 + this.rpKillBonus + (creep.leakDamage >= 3 ? 1 : 0);
        this.gold += bounty;
        this.push({
          type: 'creep_killed',
          creepId: creep.id,
          bounty,
          rp,
        });
        this.dirty = true;
        continue;
      }
      survivors.push(creep);
    }
    this.creeps = survivors;
  }

  private runSpawnJobs(): void {
    for (const job of this.jobs) {
      if (job.remaining <= 0) continue;
      if (job.cooldown > 0) {
        job.cooldown--;
        continue;
      }
      const spawned = this.spawnCreep(job.enemyId, job.spawnIndex);
      if (!spawned) {
        // Don't silently burn the remaining count on bad content.
        continue;
      }
      job.remaining--;
      // Off-by-one fix: next spawn after `interval` full ticks.
      job.cooldown = Math.max(0, job.interval - 1);
    }
  }

  private spawnCreep(enemyId: EnemyId, spawnIndex: number): boolean {
    const def = ENEMY_DEFS[enemyId];
    const path = this.paths.pathForSpawn(spawnIndex);
    if (!path || path.length < 2 || !def) return false;
    const start = path[0]!;
    const creep: CreepInstance = {
      id: this.nextCreepId++,
      enemyId,
      cell: { ...start },
      t: 0,
      path: path.map((p) => ({ ...p })),
      pathIndex: 0,
      hp: def.hp,
      maxHp: def.hp,
      baseSpeed: def.speedCellsPerTick,
      slowFactor: 1,
      slowTicks: 0,
      bounty: def.bounty,
      leakDamage: def.leakDamage,
      color: def.color,
      scale: def.scale,
    };
    this.creeps.push(creep);
    this.push({ type: 'creep_spawned', creepId: creep.id, enemyId });
    return true;
  }

  private moveCreep(creep: CreepInstance): void {
    if (creep.pathIndex >= creep.path.length - 1) {
      creep.t = 1;
      return;
    }
    const speed = creep.baseSpeed * creep.slowFactor;
    creep.t += speed;
    while (creep.t >= 1 && creep.pathIndex < creep.path.length - 1) {
      creep.t -= 1;
      creep.pathIndex++;
      creep.cell = { ...creep.path[creep.pathIndex]! };
    }
  }

  private fireTowers(): void {
    for (const tower of this.towers.values()) {
      const def = this.towerDefs[tower.defId];
      if (def.damage <= 0 && def.slowTicks <= 0) continue;
      if (tower.cooldown > 0) {
        tower.cooldown--;
        continue;
      }
      const target = this.findTarget(tower.cell, def.range);
      if (!target) continue;

      const victims =
        def.splash > 0
          ? this.creepsInRadius(target.cell, def.splash)
          : [target];

      for (const victim of victims) {
        if (victim.hp <= 0) continue;
        victim.hp -= def.damage;
        if (def.slowTicks > 0) {
          victim.slowFactor = Math.min(victim.slowFactor, def.slowFactor);
          victim.slowTicks = Math.max(victim.slowTicks, def.slowTicks);
        }
      }
      this.push({
        type: 'tower_shot',
        towerDefId: tower.defId,
        from: { ...tower.cell },
        to: { ...target.cell },
        creepId: target.id,
        splash: def.splash,
        color: def.color,
      });
      // Off-by-one fix: fire every fireCooldownTicks ticks.
      tower.cooldown = Math.max(0, def.fireCooldownTicks - 1);
    }
  }

  private creepsInRadius(center: Cell, radius: number): CreepInstance[] {
    return this.creeps.filter((c) => {
      if (c.hp <= 0) return false;
      const d = Math.abs(c.cell.c - center.c) + Math.abs(c.cell.r - center.r);
      return d <= radius;
    });
  }

  private findTarget(from: Cell, range: number): CreepInstance | null {
    let best: CreepInstance | null = null;
    let bestDist = Infinity;
    for (const creep of this.creeps) {
      if (creep.hp <= 0) continue;
      const d = Math.abs(creep.cell.c - from.c) + Math.abs(creep.cell.r - from.r);
      if (d <= range && d < bestDist) {
        best = creep;
        bestDist = d;
      }
    }
    return best;
  }

  private repathCreeps(): void {
    for (const creep of this.creeps) {
      if (creep.hp <= 0) continue;
      const path = this.paths.shortestFrom(creep.cell);
      if (!path || path.length < 1) continue;
      const keepT = creep.cell.c === path[0]!.c && creep.cell.r === path[0]!.r;
      creep.path = path.map((p) => ({ ...p }));
      creep.pathIndex = 0;
      creep.cell = { ...path[0]! };
      // Preserve in-cell progress so place/sell can't rewind creeps.
      if (!keepT) creep.t = 0;
    }
  }

  private push(e: SimEvent): void {
    this.events.push(e);
  }

  lastRejectReason(): RejectReason | null {
    for (let i = this.events.length - 1; i >= 0; i--) {
      const e = this.events[i]!;
      if (e.type === 'place_rejected') return e.reason;
    }
    return null;
  }
}
