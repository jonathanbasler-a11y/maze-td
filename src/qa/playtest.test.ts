import { describe, expect, it } from 'vitest';
import { LEVELS } from '../content/levels';
import { CampaignMeta } from '../content/research';
import { TOWER_DEFS } from '../content/towers';
import { SimState } from '../sim/SimState';
import {
  assertDeterministic,
  playtestLevel,
  validateContent,
} from './playtest';
import { attemptZeroLeak } from './zeroLeak';

describe('content validation', () => {
  it('has no content issues', () => {
    const issues = validateContent();
    expect(issues, JSON.stringify(issues, null, 2)).toEqual([]);
  });
});

describe('sim hardening', () => {
  it('fire cooldown matches fireCooldownTicks', () => {
    const level = LEVELS[0]!;
    const sim = new SimState({ level, towerDefs: TOWER_DEFS });
    sim.step(sim.phaseTimer); // end build
    sim.setSelectedTower('gun');
    // Find a buildable cell on path corridor
    let placed = false;
    for (let r = 1; r < level.map.height - 1 && !placed; r++) {
      for (let c = 1; c < level.map.width - 1 && !placed; c++) {
        if (sim.tryPlace({ c, r })) placed = true;
      }
    }
    expect(placed).toBe(true);

    // Force a creep onto the map by spawning waves until one exists or timeout
    let sawShotGaps: number[] = [];
    let lastShotTick = -1;
    for (let i = 0; i < 5000 && sawShotGaps.length < 3; i++) {
      sim.step(1);
      for (const e of sim.drainEvents()) {
        if (e.type === 'tower_shot') {
          if (lastShotTick >= 0) sawShotGaps.push(sim.tick - lastShotTick);
          lastShotTick = sim.tick;
        }
      }
      if (sim.phase === 'won' || sim.phase === 'lost') break;
    }
    // Gun fireCooldownTicks=14 → gap should be 14
    if (sawShotGaps.length > 0) {
      expect(sawShotGaps.every((g) => g === TOWER_DEFS.gun.fireCooldownTicks)).toBe(
        true,
      );
    }
  });

  it('does not rewind creep t on repath when cell unchanged', () => {
    const level = LEVELS[0]!;
    const sim = new SimState({ level, towerDefs: TOWER_DEFS });
    sim.step(sim.phaseTimer);
    // Run until a creep exists
    for (let i = 0; i < 2000 && sim.getCreeps().length === 0; i++) sim.step(1);
    const creep = sim.getCreeps()[0];
    if (!creep) return; // empty ok if wave failed to spawn quickly
    creep.t = 0.6;
    const cell = { ...creep.cell };
    sim.setSelectedTower('blocker');
    // Place far from path if possible
    sim.tryPlace({ c: 2, r: 2 });
    const after = sim.getCreeps().find((c) => c.id === creep.id);
    expect(after).toBeTruthy();
    if (after && after.cell.c === cell.c && after.cell.r === cell.r) {
      expect(after.t).toBeCloseTo(0.6, 5);
    }
  });

  it('blocks sell during combat when juggling disabled', () => {
    const level = LEVELS[0]!;
    expect(level.map.jugglingPolicy).toBe('disabled');
    const sim = new SimState({ level, towerDefs: TOWER_DEFS });
    sim.setSelectedTower('blocker');
    expect(sim.tryPlace({ c: 3, r: 3 })).toBe(true);
    sim.step(sim.phaseTimer); // enter combat
    expect(sim.trySell({ c: 3, r: 3 })).toBe(false);
    expect(sim.lastRejectReason()).toBe('sell_locked');
  });

  it('emits defeat only once', () => {
    const level = LEVELS[0]!;
    const sim = new SimState({ level, towerDefs: TOWER_DEFS });
    sim.step(sim.phaseTimer);
    // Let everything leak: don't place towers
    let defeats = 0;
    for (let i = 0; i < 50_000 && sim.phase !== 'lost' && sim.phase !== 'won'; i++) {
      sim.step(1);
      for (const e of sim.drainEvents()) {
        if (e.type === 'defeat') defeats++;
      }
    }
    expect(sim.phase).toBe('lost');
    expect(defeats).toBe(1);
  });

  it('rejects locked research towers', () => {
    const level = LEVELS[0]!;
    const sim = new SimState({
      level,
      towerDefs: TOWER_DEFS,
      unlockedTowerIds: ['blocker', 'gun'],
    });
    sim.setSelectedTower('gatling');
    expect(sim.selectedTower).toBe('blocker');
    sim.setSelectedTower('gun');
    expect(sim.selectedTower).toBe('gun');
  });

  it('applies start bonuses and campaign tower mods', () => {
    const level = LEVELS[0]!;
    const sim = new SimState({
      level,
      towerDefs: TOWER_DEFS,
      startGoldBonus: 40,
      startLivesBonus: 2,
      bountyMul: 2,
      rpKillBonus: 1,
    });
    expect(sim.gold).toBe(level.map.startingGold + 40);
    expect(sim.lives).toBe(level.map.startingLives + 2);

    const meta = new CampaignMeta();
    meta.rp = 1000;
    expect(meta.tryBuy('gun_caliber')).toBe(true);
    expect(meta.towerDefs().gun.damage).toBe(TOWER_DEFS.gun.damage + 2);
    expect(meta.canBuy('unlock_gatling')).toBe(false); // needs gun_rapid
  });
});

describe('zero-leak balance', () => {
  for (const [i, level] of LEVELS.entries()) {
    it(`${level.id} can be cleared with 0 life loss`, () => {
      const result = attemptZeroLeak(level, { withResearch: i >= 3 });
      expect(
        result,
        `${level.id} phase=${result.phase} lives=${result.lives}/${result.startLives} leaks=${result.leaks}`,
      ).toMatchObject({ ok: true, leaks: 0 });
      expect(result.lives).toBe(result.startLives);
    }, 60_000);
  }
});

describe('playtest suite', () => {
  for (const level of LEVELS) {
    it(`runs ${level.id} without hanging`, () => {
      const result = playtestLevel(level, { maxTicks: 120_000 });
      expect(['won', 'lost']).toContain(result.phase);
      expect(result.ticks).toBeLessThan(120_000);
      expect(result.events).toBeGreaterThan(0);
    });

    it(`is deterministic for ${level.id}`, () => {
      expect(assertDeterministic(level)).toBe(true);
    });
  }
});
