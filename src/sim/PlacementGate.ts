import type { GridMap } from './GridMap';
import type { PathService } from './PathService';
import type { Cell, RejectReason, TowerDef } from './types';

export type PlaceResult =
  | { ok: true }
  | { ok: false; reason: RejectReason };

/**
 * Maze contract: never commit a tower that seals spawn→goal.
 */
export class PlacementGate {
  constructor(
    private readonly grid: GridMap,
    private readonly paths: PathService,
  ) {}

  tryValidate(
    cell: Cell,
    def: TowerDef,
    gold: number,
    isOccupied: boolean,
  ): PlaceResult {
    if (!this.grid.inBounds(cell.c, cell.r)) {
      return { ok: false, reason: 'out_of_bounds' };
    }
    if (!this.grid.canBuild(cell.c, cell.r) || isOccupied) {
      if (isOccupied || this.grid.isBlocked(cell.c, cell.r)) {
        return { ok: false, reason: 'occupied' };
      }
      return { ok: false, reason: 'not_buildable' };
    }
    if (gold < def.cost) {
      return { ok: false, reason: 'cannot_afford' };
    }
    if (!def.blocks) {
      return { ok: true };
    }

    this.grid.markBlocked(cell.c, cell.r);
    const ok = this.paths.pathsExist();
    this.grid.unmarkBlocked(cell.c, cell.r);

    if (!ok) {
      return { ok: false, reason: 'would_seal_path' };
    }
    return { ok: true };
  }
}
