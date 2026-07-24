import type { GridMap } from './GridMap';
import type { Cell } from './types';
import { cellKey } from './types';

type Node = { c: number; r: number; g: number; f: number; parent: Node | null };

function heuristic(a: Cell, b: Cell): number {
  return Math.abs(a.c - b.c) + Math.abs(a.r - b.r);
}

/** Binary min-heap keyed by f (then g). */
class MinHeap {
  private readonly data: Node[] = [];

  get size(): number {
    return this.data.length;
  }

  push(n: Node): void {
    this.data.push(n);
    this.bubbleUp(this.data.length - 1);
  }

  pop(): Node | undefined {
    const top = this.data[0];
    const last = this.data.pop();
    if (top === undefined || last === undefined) return top;
    if (this.data.length > 0) {
      this.data[0] = last;
      this.bubbleDown(0);
    }
    return top;
  }

  private bubbleUp(i: number): void {
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.less(this.data[i]!, this.data[p]!)) break;
      [this.data[i], this.data[p]] = [this.data[p]!, this.data[i]!];
      i = p;
    }
  }

  private bubbleDown(i: number): void {
    const n = this.data.length;
    for (;;) {
      let best = i;
      const l = i * 2 + 1;
      const r = l + 1;
      if (l < n && this.less(this.data[l]!, this.data[best]!)) best = l;
      if (r < n && this.less(this.data[r]!, this.data[best]!)) best = r;
      if (best === i) break;
      [this.data[i], this.data[best]] = [this.data[best]!, this.data[i]!];
      i = best;
    }
  }

  private less(a: Node, b: Node): boolean {
    return a.f < b.f || (a.f === b.f && a.g < b.g);
  }
}

/**
 * A* on the square grid. Returns path including start and goal, or null.
 */
export function findPath(grid: GridMap, start: Cell, goal: Cell): Cell[] | null {
  if (!grid.isWalkable(start.c, start.r) || !grid.isWalkable(goal.c, goal.r)) {
    return null;
  }

  const open = new MinHeap();
  const bestG = new Map<string, number>();
  const closed = new Set<string>();

  const startNode: Node = {
    c: start.c,
    r: start.r,
    g: 0,
    f: heuristic(start, goal),
    parent: null,
  };
  open.push(startNode);
  bestG.set(cellKey(start.c, start.r), 0);

  while (open.size > 0) {
    const current = open.pop()!;
    const key = cellKey(current.c, current.r);
    if (closed.has(key)) continue;
    if (current.c === goal.c && current.r === goal.r) {
      const path: Cell[] = [];
      let n: Node | null = current;
      while (n) {
        path.push({ c: n.c, r: n.r });
        n = n.parent;
      }
      path.reverse();
      return path;
    }

    closed.add(key);

    for (const nb of grid.neighbors4(current.c, current.r)) {
      const nk = cellKey(nb.c, nb.r);
      if (closed.has(nk)) continue;
      const g = current.g + 1;
      const prev = bestG.get(nk);
      if (prev !== undefined && g >= prev) continue;
      bestG.set(nk, g);
      open.push({
        c: nb.c,
        r: nb.r,
        g,
        f: g + heuristic(nb, goal),
        parent: current,
      });
    }
  }

  return null;
}

export class PathService {
  private cached: Cell[] | null = null;

  constructor(private readonly grid: GridMap) {}

  /** True if every spawn can reach at least one goal. */
  pathsExist(): boolean {
    for (const spawn of this.grid.spawns) {
      if (!this.shortestFrom(spawn)) return false;
    }
    return true;
  }

  /** Shortest path from a cell to any goal. */
  shortestFrom(start: Cell): Cell[] | null {
    let best: Cell[] | null = null;
    for (const goal of this.grid.goals) {
      const path = findPath(this.grid, start, goal);
      if (path && (!best || path.length < best.length)) best = path;
    }
    return best;
  }

  pathForSpawn(spawnIndex: number): Cell[] | null {
    const spawn = this.grid.spawns[spawnIndex % this.grid.spawns.length];
    if (!spawn) return null;
    return this.shortestFrom(spawn);
  }

  /** Primary path: first spawn → nearest goal (preview). */
  recomputePrimary(): Cell[] | null {
    const spawn = this.grid.spawns[0];
    if (!spawn) {
      this.cached = null;
      return null;
    }
    this.cached = this.shortestFrom(spawn);
    return this.cached;
  }

  getPrimary(): Cell[] | null {
    return this.cached;
  }

  /**
   * Preview primary path if `candidate` were blocked.
   * Restores grid + cached primary afterward.
   */
  previewWithBlock(candidate: Cell | null): Cell[] | null {
    if (!candidate) return this.cached ?? this.recomputePrimary();
    const was = this.grid.isBlocked(candidate.c, candidate.r);
    if (!was) this.grid.markBlocked(candidate.c, candidate.r);
    const spawn = this.grid.spawns[0];
    const path = spawn ? this.shortestFrom(spawn) : null;
    if (!was) this.grid.unmarkBlocked(candidate.c, candidate.r);
    return path;
  }

  /** True if blocking candidate still leaves every spawn connected. */
  wouldKeepPaths(candidate: Cell): boolean {
    const was = this.grid.isBlocked(candidate.c, candidate.r);
    if (!was) this.grid.markBlocked(candidate.c, candidate.r);
    const ok = this.pathsExist();
    if (!was) this.grid.unmarkBlocked(candidate.c, candidate.r);
    return ok;
  }
}
