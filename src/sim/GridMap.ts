import type { Cell, CellFlags, MapDef } from './types';
import { cellKey } from './types';

export class GridMap {
  readonly width: number;
  readonly height: number;
  readonly spawns: Cell[];
  readonly goals: Cell[];
  private readonly terrain: CellFlags[];
  /** Dynamic blockers (towers). */
  private readonly blocked = new Set<string>();

  constructor(map: MapDef) {
    this.width = map.width;
    this.height = map.height;
    this.spawns = map.spawns.map((s) => ({ ...s }));
    this.goals = map.goals.map((g) => ({ ...g }));
    this.terrain = map.cells.map((c) => ({ ...c }));
  }

  inBounds(c: number, r: number): boolean {
    return c >= 0 && r >= 0 && c < this.width && r < this.height;
  }

  index(c: number, r: number): number {
    return r * this.width + c;
  }

  terrainAt(c: number, r: number): CellFlags {
    return this.terrain[this.index(c, r)]!;
  }

  isBlocked(c: number, r: number): boolean {
    return this.blocked.has(cellKey(c, r));
  }

  isWalkable(c: number, r: number): boolean {
    if (!this.inBounds(c, r)) return false;
    if (!this.terrainAt(c, r).walkable) return false;
    if (this.isBlocked(c, r)) return false;
    return true;
  }

  canBuild(c: number, r: number): boolean {
    if (!this.inBounds(c, r)) return false;
    const t = this.terrainAt(c, r);
    if (!t.buildable) return false;
    if (this.isBlocked(c, r)) return false;
    // Do not build on spawn/goal
    for (const s of this.spawns) {
      if (s.c === c && s.r === r) return false;
    }
    for (const g of this.goals) {
      if (g.c === c && g.r === r) return false;
    }
    return true;
  }

  markBlocked(c: number, r: number): void {
    this.blocked.add(cellKey(c, r));
  }

  unmarkBlocked(c: number, r: number): void {
    this.blocked.delete(cellKey(c, r));
  }

  neighbors4(c: number, r: number): Cell[] {
    const out: Cell[] = [];
    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const;
    for (const [dc, dr] of dirs) {
      const nc = c + dc;
      const nr = r + dr;
      if (this.isWalkable(nc, nr)) out.push({ c: nc, r: nr });
    }
    return out;
  }
}
