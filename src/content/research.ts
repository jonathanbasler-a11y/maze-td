import type {
  ResearchBranch,
  ResearchNodeDef,
  TowerDef,
  TowerId,
} from '../sim/types';
import { TOWER_DEFS, BASE_TOWER_ORDER } from './towers';

export const RESEARCH_NODES: ResearchNodeDef[] = [
  // Offense
  {
    id: 'gun_caliber',
    name: 'Caliber',
    blurb: 'Gun +2 damage.',
    cost: 12,
    branch: 'offense',
    requires: [],
    col: 0,
    row: 0,
    effect: { kind: 'tower_mod', towerId: 'gun', damageAdd: 2 },
  },
  {
    id: 'gun_rapid',
    name: 'Rapid Feed',
    blurb: 'Gun fires 15% faster.',
    cost: 18,
    branch: 'offense',
    requires: ['gun_caliber'],
    col: 1,
    row: 0,
    effect: { kind: 'tower_mod', towerId: 'gun', cooldownMul: 0.85 },
  },
  {
    id: 'unlock_gatling',
    name: 'Gatling',
    blurb: 'Unlock Gatling — blistering close DPS.',
    cost: 28,
    branch: 'offense',
    requires: ['gun_rapid'],
    col: 2,
    row: 0,
    effect: { kind: 'unlock_tower', towerId: 'gatling' },
  },
  {
    id: 'sniper_optics',
    name: 'Optics',
    blurb: 'Sniper +1 range, +4 damage.',
    cost: 20,
    branch: 'offense',
    requires: [],
    col: 0,
    row: 1,
    effect: { kind: 'tower_mod', towerId: 'sniper', rangeAdd: 1, damageAdd: 4 },
  },
  {
    id: 'unlock_laser',
    name: 'Laser',
    blurb: 'Unlock Laser — precise mid-range burns.',
    cost: 32,
    branch: 'offense',
    requires: ['sniper_optics'],
    col: 1,
    row: 1,
    effect: { kind: 'unlock_tower', towerId: 'laser' },
  },
  {
    id: 'unlock_beam',
    name: 'Beam Array',
    blurb: 'Unlock Beam — long continuous pressure.',
    cost: 40,
    branch: 'offense',
    requires: ['unlock_laser'],
    col: 2,
    row: 1,
    effect: { kind: 'unlock_tower', towerId: 'beam' },
  },
  {
    id: 'mortar_payload',
    name: 'Payload',
    blurb: 'Mortar +3 damage, +1 splash.',
    cost: 22,
    branch: 'offense',
    requires: [],
    col: 0,
    row: 2,
    effect: {
      kind: 'tower_mod',
      towerId: 'mortar',
      damageAdd: 3,
      splashAdd: 1,
    },
  },
  {
    id: 'unlock_tesla',
    name: 'Tesla',
    blurb: 'Unlock Tesla — electric splash arcs.',
    cost: 35,
    branch: 'offense',
    requires: ['mortar_payload'],
    col: 1,
    row: 2,
    effect: { kind: 'unlock_tower', towerId: 'tesla' },
  },

  // Control
  {
    id: 'frost_coil',
    name: 'Deep Freeze',
    blurb: 'Frost slows harder and longer.',
    cost: 14,
    branch: 'control',
    requires: [],
    col: 0,
    row: 3,
    effect: {
      kind: 'tower_mod',
      towerId: 'frost',
      // slow handled via global-ish: use damageAdd 1 and splash as proxy;
      // actual slow tweak applied in applyResearchToDefs
      damageAdd: 1,
    },
  },
  {
    id: 'unlock_glue',
    name: 'Glue Pit',
    blurb: 'Unlock Glue — heavy slow field.',
    cost: 26,
    branch: 'control',
    requires: ['frost_coil'],
    col: 1,
    row: 3,
    effect: { kind: 'unlock_tower', towerId: 'glue' },
  },
  {
    id: 'spike_teeth',
    name: 'Serrated',
    blurb: 'Spike +2 damage, slightly faster.',
    cost: 16,
    branch: 'control',
    requires: [],
    col: 0,
    row: 4,
    effect: {
      kind: 'tower_mod',
      towerId: 'spike',
      damageAdd: 2,
      cooldownMul: 0.9,
    },
  },

  // Structure
  {
    id: 'cheap_walls',
    name: 'Masonry',
    blurb: 'Walls cost 1g less (min 3).',
    cost: 10,
    branch: 'structure',
    requires: [],
    col: 3,
    row: 0,
    effect: { kind: 'global', wallCostAdd: -1 },
  },
  {
    id: 'unlock_bunker',
    name: 'Bunker',
    blurb: 'Unlock Bunker — armored wall that shoots.',
    cost: 30,
    branch: 'structure',
    requires: ['cheap_walls'],
    col: 4,
    row: 0,
    effect: { kind: 'unlock_tower', towerId: 'bunker' },
  },
  {
    id: 'fortify',
    name: 'Fortify',
    blurb: '+2 starting lives each level.',
    cost: 24,
    branch: 'structure',
    requires: ['cheap_walls'],
    col: 4,
    row: 1,
    effect: { kind: 'global', startLivesAdd: 2 },
  },

  // Economy
  {
    id: 'scavenger',
    name: 'Scavenger',
    blurb: '+20% kill bounty.',
    cost: 15,
    branch: 'economy',
    requires: [],
    col: 3,
    row: 2,
    effect: { kind: 'global', bountyMul: 1.2 },
  },
  {
    id: 'war_chest',
    name: 'War Chest',
    blurb: '+25 starting gold each level.',
    cost: 20,
    branch: 'economy',
    requires: ['scavenger'],
    col: 4,
    row: 2,
    effect: { kind: 'global', startGoldAdd: 25 },
  },
  {
    id: 'field_notes',
    name: 'Field Notes',
    blurb: '+1 research point per kill.',
    cost: 22,
    branch: 'economy',
    requires: ['scavenger'],
    col: 4,
    row: 3,
    effect: { kind: 'global', rpKillAdd: 1 },
  },
  {
    id: 'logistics',
    name: 'Logistics',
    blurb: 'All towers 10% cheaper.',
    cost: 35,
    branch: 'economy',
    requires: ['war_chest', 'field_notes'],
    col: 5,
    row: 2,
    // Applied as global 10% cost in CampaignMeta.towerDefs (special-case).
    effect: { kind: 'global' },
  },
];

export const RESEARCH_BY_ID: Record<string, ResearchNodeDef> = Object.fromEntries(
  RESEARCH_NODES.map((n) => [n.id, n]),
);

export const RESEARCH_BRANCH_LABEL: Record<ResearchBranch, string> = {
  offense: 'Offense',
  control: 'Control',
  economy: 'Economy',
  structure: 'Structure',
};

export type CampaignSnapshot = {
  rp: number;
  unlocked: string[];
  levelsCleared: string[];
};

const STORAGE_KEY = 'maze-td-campaign-v1';

export class CampaignMeta {
  rp = 0;
  unlocked = new Set<string>();
  levelsCleared = new Set<string>();

  static load(): CampaignMeta {
    const m = new CampaignMeta();
    try {
      if (typeof localStorage === 'undefined') return m;
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return m;
      const data = JSON.parse(raw) as CampaignSnapshot;
      m.rp = Math.max(0, data.rp ?? 0);
      m.unlocked = new Set(data.unlocked ?? []);
      m.levelsCleared = new Set(data.levelsCleared ?? []);
    } catch {
      /* ignore */
    }
    return m;
  }

  save(): void {
    const data: CampaignSnapshot = {
      rp: this.rp,
      unlocked: [...this.unlocked],
      levelsCleared: [...this.levelsCleared],
    };
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* ignore */
    }
  }

  reset(): void {
    this.rp = 0;
    this.unlocked.clear();
    this.levelsCleared.clear();
    this.save();
  }

  has(id: string): boolean {
    return this.unlocked.has(id);
  }

  canBuy(id: string): boolean {
    const node = RESEARCH_BY_ID[id];
    if (!node || this.has(id)) return false;
    if (this.rp < node.cost) return false;
    return node.requires.every((r) => this.has(r));
  }

  tryBuy(id: string): boolean {
    if (!this.canBuy(id)) return false;
    const node = RESEARCH_BY_ID[id]!;
    this.rp -= node.cost;
    this.unlocked.add(id);
    this.save();
    return true;
  }

  addRp(n: number): void {
    if (n <= 0) return;
    this.rp += n;
    this.save();
  }

  markLevelCleared(levelId: string): void {
    this.levelsCleared.add(levelId);
    this.save();
  }

  /** Effective tower defs with research mods applied. */
  towerDefs(): Record<TowerId, TowerDef> {
    const defs = {} as Record<TowerId, TowerDef>;
    for (const [id, base] of Object.entries(TOWER_DEFS) as [TowerId, TowerDef][]) {
      defs[id] = { ...base };
    }

    let wallCostAdd = 0;
    let globalCostMul = 1;

    for (const id of this.unlocked) {
      const node = RESEARCH_BY_ID[id];
      if (!node) continue;
      const e = node.effect;
      if (e.kind === 'tower_mod') {
        const t = defs[e.towerId];
        if (!t) continue;
        if (e.damageAdd) t.damage += e.damageAdd;
        if (e.rangeAdd) t.range += e.rangeAdd;
        if (e.splashAdd) t.splash += e.splashAdd;
        if (e.costMul) t.cost = Math.max(1, Math.round(t.cost * e.costMul));
        if (e.cooldownMul && t.fireCooldownTicks > 0) {
          t.fireCooldownTicks = Math.max(
            1,
            Math.round(t.fireCooldownTicks * e.cooldownMul),
          );
        }
      } else if (e.kind === 'global') {
        if (e.wallCostAdd) wallCostAdd += e.wallCostAdd;
      }
      // frost_coil special
      if (id === 'frost_coil') {
        defs.frost.slowFactor = Math.min(defs.frost.slowFactor, 0.4);
        defs.frost.slowTicks = Math.max(defs.frost.slowTicks, 55);
      }
      if (id === 'logistics') {
        globalCostMul *= 0.9;
      }
    }

    if (wallCostAdd !== 0) {
      defs.blocker.cost = Math.max(3, defs.blocker.cost + wallCostAdd);
    }
    if (globalCostMul !== 1) {
      for (const id of Object.keys(defs) as TowerId[]) {
        if (id === 'blocker') continue;
        defs[id].cost = Math.max(1, Math.round(defs[id].cost * globalCostMul));
      }
    }

    return defs;
  }

  unlockedTowerIds(): TowerId[] {
    const out: TowerId[] = [];
    for (const id of BASE_TOWER_ORDER) {
      const def = TOWER_DEFS[id];
      if (!def.requiresResearch || this.has(def.requiresResearch)) {
        out.push(id);
      }
    }
    return out;
  }

  /** Hotkey map 1–9 for currently unlocked towers. */
  hotkeyMap(): { hotkey: string; id: TowerId }[] {
    return this.unlockedTowerIds().map((id, i) => ({
      hotkey: String(i + 1),
      id,
    }));
  }

  startGoldBonus(): number {
    let n = 0;
    for (const id of this.unlocked) {
      const e = RESEARCH_BY_ID[id]?.effect;
      if (e?.kind === 'global' && e.startGoldAdd) n += e.startGoldAdd;
    }
    return n;
  }

  startLivesBonus(): number {
    let n = 0;
    for (const id of this.unlocked) {
      const e = RESEARCH_BY_ID[id]?.effect;
      if (e?.kind === 'global' && e.startLivesAdd) n += e.startLivesAdd;
    }
    return n;
  }

  bountyMul(): number {
    let m = 1;
    for (const id of this.unlocked) {
      const e = RESEARCH_BY_ID[id]?.effect;
      if (e?.kind === 'global' && e.bountyMul) m *= e.bountyMul;
    }
    return m;
  }

  rpPerKillBonus(): number {
    let n = 0;
    for (const id of this.unlocked) {
      const e = RESEARCH_BY_ID[id]?.effect;
      if (e?.kind === 'global' && e.rpKillAdd) n += e.rpKillAdd;
    }
    return n;
  }
}
