import Phaser from 'phaser';
import { LEVELS, clampLevelIndex } from '../content/levels';
import {
  CampaignMeta,
  RESEARCH_BRANCH_LABEL,
  RESEARCH_NODES,
} from '../content/research';
import { towerFireRate } from '../content/towers';
import { Look } from '../presentation/Look';
import { SimState } from '../sim/SimState';
import type { Cell, SimEvent, TowerId } from '../sim/types';

type CreepView = {
  body: Phaser.GameObjects.Image;
  barBg: Phaser.GameObjects.Rectangle;
  bar: Phaser.GameObjects.Rectangle;
};

const SIDEBAR_W = 236;
const CANVAS_W = 1120;
const CANVAS_H = 720;

const DIGIT_KEYS = [
  'ONE',
  'TWO',
  'THREE',
  'FOUR',
  'FIVE',
  'SIX',
  'SEVEN',
  'EIGHT',
  'NINE',
] as const;

export class BattleScene extends Phaser.Scene {
  private sim!: SimState;
  private campaign = CampaignMeta.load();
  private levelIndex = 0;
  private cell = 36;
  private originX = 48;
  private originY = 96;
  private rockLayer!: Phaser.GameObjects.Container;
  private overlayGraphics!: Phaser.GameObjects.Graphics;
  private pathGraphics!: Phaser.GameObjects.Graphics;
  private towerLayer!: Phaser.GameObjects.Container;
  private creepLayer!: Phaser.GameObjects.Container;
  private fxLayer!: Phaser.GameObjects.Container;
  private hudPanel!: Phaser.GameObjects.Graphics;
  private hud!: Phaser.GameObjects.Text;
  private levelHud!: Phaser.GameObjects.Text;
  private toast!: Phaser.GameObjects.Text;
  private title!: Phaser.GameObjects.Text;
  private statusBanner!: Phaser.GameObjects.Text;
  private sidebarPanel!: Phaser.GameObjects.Graphics;
  private sidebarIcon!: Phaser.GameObjects.Image;
  private sidebarTitle!: Phaser.GameObjects.Text;
  private sidebarBlurb!: Phaser.GameObjects.Text;
  private sidebarStats!: Phaser.GameObjects.Text;
  private sidebarRoster!: Phaser.GameObjects.Text;
  private researchRoot!: Phaser.GameObjects.Container;
  private researchOpen = false;
  private researchRpText!: Phaser.GameObjects.Text;
  private researchNodeTexts: Phaser.GameObjects.Text[] = [];
  private hover: Cell | null = null;
  private paused = false;
  private acc = 0;
  private readonly tickHz = 30;
  private boardBuilt = false;
  private readonly creepViews = new Map<number, CreepView>();
  private hoverKey = '';
  private fxEpoch = 0;
  private activeShots = 0;
  private readonly maxShots = 28;
  private hudKey = '';
  private sidebarKey = '';
  private readonly maxTicksPerFrame = 8;
  private hotkeyIds: TowerId[] = [];
  private sellMode = false;
  private sellBtnLabel!: Phaser.GameObjects.Text;
  private feedbackRoot!: Phaser.GameObjects.Container;
  private feedbackOpen = false;

  private static readonly FEEDBACK_BUG =
    'https://github.com/jonathanbasler-a11y/maze-td/issues/new?template=bug.yml&labels=bug,ios';
  private static readonly FEEDBACK_IMPROVEMENT =
    'https://github.com/jonathanbasler-a11y/maze-td/issues/new?template=improvement.yml&labels=improvement,ios';
  private static readonly FEEDBACK_BOARD =
    'https://github.com/jonathanbasler-a11y/maze-td/issues?q=is%3Aissue+is%3Aopen';


  constructor() {
    super('Battle');
  }

  init(data?: { levelIndex?: number }): void {
    const fromRegistry = this.registry.get('levelIndex') as number | undefined;
    this.levelIndex = clampLevelIndex(data?.levelIndex ?? fromRegistry ?? 0);
    this.registry.set('levelIndex', this.levelIndex);
  }

  preload(): void {
    this.load.image('dirt', 'assets/textures/dirt.png');
    this.load.image('rock', 'assets/sprites/rock_moss.png');
    this.load.image('creep', 'assets/sprites/creep.png');
    this.load.image('logo', 'assets/ui/logo_mark.png');
    this.load.image('tower_blocker', 'assets/sprites/towers/blocker.png');
    this.load.image('tower_gun', 'assets/sprites/towers/gun.png');
    this.load.image('tower_frost', 'assets/sprites/towers/frost.png');
    this.load.image('tower_sniper', 'assets/sprites/towers/sniper.png');
    this.load.image('tower_mortar', 'assets/sprites/towers/mortar.png');
    this.load.image('tower_spike', 'assets/sprites/towers/spike.png');
    const loadedBg = new Set<string>();
    for (const level of LEVELS) {
      if (loadedBg.has(level.bgKey)) continue;
      loadedBg.add(level.bgKey);
      const file = level.bgKey.replace(/^bg_/, '');
      this.load.image(level.bgKey, `assets/backgrounds/${file}.png`);
    }
  }

  create(): void {
    this.cameras.main.setBackgroundColor(Look.bg);

    this.add
      .image(28, 28, 'logo')
      .setDisplaySize(44, 44)
      .setOrigin(0, 0)
      .setDepth(20);

    this.title = this.add
      .text(84, 16, 'MAZE TD', {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: '24px',
        color: Look.textGold,
      })
      .setDepth(20);

    this.hudPanel = this.add.graphics().setDepth(19);
    this.hud = this.add
      .text(84, 44, '', {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: '13px',
        color: Look.text,
      })
      .setDepth(20);

    this.levelHud = this.add
      .text(84, 64, '', {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: '12px',
        color: Look.textMuted,
      })
      .setDepth(20);

    this.toast = this.add
      .text(CANVAS_W / 2 - SIDEBAR_W / 2, 48, '', {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: '13px',
        color: '#f0a0a0',
      })
      .setOrigin(0.5, 0)
      .setDepth(20);

    this.statusBanner = this.add
      .text(CANVAS_W / 2 - SIDEBAR_W / 2, 20, '', {
        fontFamily: 'Georgia, serif',
        fontSize: '18px',
        color: Look.textGold,
      })
      .setOrigin(0.5, 0)
      .setDepth(20)
      .setAlpha(0);

    this.buildSidebar();
    this.buildResearchPanel();

    const footerH = 36;
    const footer = this.add.graphics().setDepth(19);
    footer.fillStyle(0x121610, 0.88);
    footer.fillRect(0, CANVAS_H - footerH, CANVAS_W, footerH);
    footer.lineStyle(1, Look.panelStroke, 0.35);
    footer.lineBetween(0, CANVAS_H - footerH, CANVAS_W, CANVAS_H - footerH);

    this.add
      .text(
        24,
        CANVAS_H - footerH / 2,
        'Tap place  ·  Sell mode  ·  Research  ·  N/P level',
        {
          fontFamily: 'Segoe UI, sans-serif',
          fontSize: '12px',
          color: Look.text,
        },
      )
      .setOrigin(0, 0.5)
      .setDepth(20);

    this.buildTouchBar();
    this.buildFeedbackPanel();

    this.startLevel(this.levelIndex);

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (this.researchOpen) return;
      const cell = this.pointerToCell(p.x, p.y);
      this.hover = cell;
      const key = cell ? `${cell.c},${cell.r}` : '';
      if (key === this.hoverKey) return;
      this.hoverKey = key;
      this.redrawOverlays();
    });

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.researchOpen || this.feedbackOpen) return;
      // Ignore taps on the touch bar strip
      if (p.y >= CANVAS_H - 78 && p.x > CANVAS_W - SIDEBAR_W - 20) return;
      if (p.y >= CANVAS_H - 78 && p.x < 520) {
        /* allow board; touch bar is mid-bottom via buttons only */
      }
      const cell = this.pointerToCell(p.x, p.y);
      if (!cell) return;
      if (this.sellMode || p.rightButtonDown() || p.button === 2) {
        const ok = this.sim.trySell(cell);
        if (!ok) {
          const reason = this.sim.lastRejectReason();
          if (reason) this.flashToast(reason);
        }
      } else {
        const ok = this.sim.tryPlace(cell);
        if (!ok) {
          const reason = this.sim.lastRejectReason();
          this.flashToast(reason ?? 'rejected');
        }
      }
      this.sim.drainEvents();
      this.redrawOverlays();
      this.syncTowers();
      this.sim.dirty = true;
    });

    const kb = this.input.keyboard;
    for (let i = 0; i < DIGIT_KEYS.length; i++) {
      const slot = i;
      kb?.on(`keydown-${DIGIT_KEYS[slot]}`, () => {
        if (this.researchOpen) return;
        const id = this.hotkeyIds[slot];
        if (id) this.selectTower(id);
      });
    }
    kb?.on('keydown-SPACE', () => {
      if (this.researchOpen) return;
      this.paused = !this.paused;
      if (this.paused) this.tweens.pauseAll();
      else this.tweens.resumeAll();
      this.sim.dirty = true;
    });
    kb?.on('keydown-R', () => {
      if (this.researchOpen) return;
      this.startLevel(this.levelIndex);
    });
    kb?.on('keydown-N', () => {
      if (this.researchOpen) return;
      this.startLevel(clampLevelIndex(this.levelIndex + 1));
    });
    kb?.on('keydown-P', () => {
      if (this.researchOpen) return;
      this.startLevel(clampLevelIndex(this.levelIndex - 1));
    });
    kb?.on('keydown-RIGHT', () => {
      if (this.researchOpen) return;
      this.startLevel(clampLevelIndex(this.levelIndex + 1));
    });
    kb?.on('keydown-LEFT', () => {
      if (this.researchOpen) return;
      this.startLevel(clampLevelIndex(this.levelIndex - 1));
    });
    kb?.on('keydown-TAB', (e: KeyboardEvent) => {
      e.preventDefault();
      this.toggleResearch();
    });
    kb?.on('keydown-Y', () => this.toggleResearch());
    kb?.on('keydown-ESC', () => {
      if (this.feedbackOpen) this.toggleFeedback(false);
      else if (this.researchOpen) this.toggleResearch(false);
    });

    this.game.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  update(_time: number, delta: number): void {
    if (!this.sim) return;
    if (
      !this.paused &&
      !this.researchOpen &&
      this.sim.phase !== 'won' &&
      this.sim.phase !== 'lost'
    ) {
      this.acc += Math.min(delta, 250);
      const stepMs = 1000 / this.tickHz;
      let steps = 0;
      while (this.acc >= stepMs && steps < this.maxTicksPerFrame) {
        this.acc -= stepMs;
        steps++;
        this.sim.step(1);
        for (const e of this.sim.drainEvents()) this.handleEvent(e);
      }
      if (this.acc > stepMs * this.maxTicksPerFrame) {
        this.acc = 0;
      }
    }
    this.syncCreeps();
    if (this.sim.dirty) {
      this.sim.dirty = false;
      this.updateHud();
    }
  }

  private handleEvent(e: SimEvent): void {
    if (e.type === 'victory') {
      this.campaign.addRp(e.rp);
      this.campaign.markLevelCleared(LEVELS[this.levelIndex]!.id);
      this.showBanner(`VICTORY +${e.rp} RP — N next · Tab research`);
      this.refreshResearchPanel();
    }
    if (e.type === 'defeat') this.showBanner('DEFEAT — R to retry');
    if (e.type === 'wave_start') {
      if (e.wave === 1) this.flashToast('build phase — 10s');
      else this.flashToast(`wave ${e.wave}`);
    }
    if (e.type === 'wave_clear') {
      this.campaign.addRp(e.rp);
      this.refreshResearchPanel();
    }
    if (e.type === 'creep_killed') {
      this.campaign.addRp(e.rp);
    }
    if (e.type === 'tower_shot') this.playShotFx(e);
  }

  private startLevel(index: number): void {
    this.fxEpoch++;
    this.activeShots = 0;
    this.tweens.killAll();
    this.paused = false;
    this.tweens.resumeAll();
    this.campaign = CampaignMeta.load();

    this.levelIndex = clampLevelIndex(index);
    this.registry.set('levelIndex', this.levelIndex);
    const level = LEVELS[this.levelIndex]!;
    this.sim = new SimState({
      level,
      towerDefs: this.campaign.towerDefs(),
      unlockedTowerIds: this.campaign.unlockedTowerIds(),
      bountyMul: this.campaign.bountyMul(),
      startGoldBonus: this.campaign.startGoldBonus(),
      startLivesBonus: this.campaign.startLivesBonus(),
      rpKillBonus: this.campaign.rpPerKillBonus(),
    });
    this.refreshHotkeys();
    this.acc = 0;
    this.hover = null;
    this.hoverKey = '';
    this.hudKey = '';
    this.sidebarKey = '';
    this.statusBanner?.setAlpha(0);
    this.clearCreepViews();

    this.computeLayout();
    this.rebuildBoard();
    this.redrawOverlays();
    this.syncTowers();
    for (const e of this.sim.drainEvents()) this.handleEvent(e);
    this.updateHud(true);
    this.refreshResearchPanel();
  }

  private refreshHotkeys(): void {
    this.hotkeyIds = this.campaign.hotkeyMap().map((h) => h.id);
  }

  private syncSimFromCampaign(): void {
    this.sim.applyCampaignLive({
      towerDefs: this.campaign.towerDefs(),
      unlockedTowerIds: this.campaign.unlockedTowerIds(),
      bountyMul: this.campaign.bountyMul(),
      rpKillBonus: this.campaign.rpPerKillBonus(),
    });
    this.refreshHotkeys();
    this.sidebarKey = '';
    this.updateHud(true);
    this.syncTowers();
  }

  private buildTouchBar(): void {
    const y = CANVAS_H - 58;
    const mk = (
      x: number,
      label: string,
      onClick: () => void,
      w = 78,
    ): Phaser.GameObjects.Text => {
      const bg = this.add
        .rectangle(x, y, w, 28, Look.panelFill, 0.95)
        .setStrokeStyle(1.5, Look.panelStroke, 0.9)
        .setDepth(30)
        .setInteractive({ useHandCursor: true });
      bg.on('pointerdown', (p: Phaser.Input.Pointer) => {
        p.event.stopPropagation();
        onClick();
      });
      const t = this.add
        .text(x, y, label, {
          fontFamily: 'Segoe UI, sans-serif',
          fontSize: '12px',
          color: Look.textGold,
        })
        .setOrigin(0.5)
        .setDepth(31);
      return t;
    };

    const cx = CANVAS_W / 2 - 40;
    mk(cx - 280, 'Feedback', () => this.toggleFeedback(), 86);
    this.sellBtnLabel = mk(cx - 180, 'Sell', () => {
      this.sellMode = !this.sellMode;
      this.sellBtnLabel.setColor(this.sellMode ? '#f0a0a0' : Look.textGold);
      this.flashToast(this.sellMode ? 'sell mode on' : 'sell mode off');
    });
    mk(cx - 90, 'Research', () => this.toggleResearch());
    mk(cx, 'Pause', () => {
      this.paused = !this.paused;
      if (this.paused) this.tweens.pauseAll();
      else this.tweens.resumeAll();
      this.sim.dirty = true;
    });
    mk(cx + 90, 'Restart', () => this.startLevel(this.levelIndex));
    mk(cx + 180, 'Next ▶', () =>
      this.startLevel(clampLevelIndex(this.levelIndex + 1)),
    );
  }

  private buildFeedbackPanel(): void {
    this.feedbackRoot = this.add.container(0, 0).setDepth(45).setVisible(false);

    const veil = this.add
      .rectangle(CANVAS_W / 2, CANVAS_H / 2, CANVAS_W, CANVAS_H, 0x0a0c08, 0.7)
      .setInteractive();
    veil.on('pointerdown', () => this.toggleFeedback(false));
    this.feedbackRoot.add(veil);

    const panel = this.add.graphics();
    panel.fillStyle(Look.panelFill, 0.98);
    panel.fillRoundedRect(CANVAS_W / 2 - 220, CANVAS_H / 2 - 150, 440, 300, 12);
    panel.lineStyle(2, Look.panelStroke, 0.95);
    panel.strokeRoundedRect(CANVAS_W / 2 - 220, CANVAS_H / 2 - 150, 440, 300, 12);
    this.feedbackRoot.add(panel);

    this.feedbackRoot.add(
      this.add
        .text(CANVAS_W / 2, CANVAS_H / 2 - 120, 'Track for later', {
          fontFamily: 'Georgia, serif',
          fontSize: '24px',
          color: Look.textGold,
        })
        .setOrigin(0.5),
    );
    this.feedbackRoot.add(
      this.add
        .text(
          CANVAS_W / 2,
          CANVAS_H / 2 - 85,
          'File a bug or improvement on GitHub.\nOpens in Safari — come back anytime.',
          {
            fontFamily: 'Segoe UI, sans-serif',
            fontSize: '13px',
            color: Look.textMuted,
            align: 'center',
          },
        )
        .setOrigin(0.5),
    );

    const mkBtn = (y: number, label: string, url: string): void => {
      const btn = this.add
        .rectangle(CANVAS_W / 2, y, 300, 44, 0x2a3224, 0.98)
        .setStrokeStyle(1.5, Look.panelStroke, 0.9)
        .setInteractive({ useHandCursor: true });
      btn.on('pointerdown', (p: Phaser.Input.Pointer) => {
        p.event.stopPropagation();
        window.open(url, '_blank', 'noopener,noreferrer');
        this.flashToast('opened tracker');
      });
      this.feedbackRoot.add(btn);
      this.feedbackRoot.add(
        this.add
          .text(CANVAS_W / 2, y, label, {
            fontFamily: 'Segoe UI, sans-serif',
            fontSize: '16px',
            color: Look.textGold,
          })
          .setOrigin(0.5),
      );
    };

    mkBtn(CANVAS_H / 2 - 20, 'Report a bug', BattleScene.FEEDBACK_BUG);
    mkBtn(CANVAS_H / 2 + 40, 'Suggest improvement', BattleScene.FEEDBACK_IMPROVEMENT);
    mkBtn(CANVAS_H / 2 + 100, 'Open backlog', BattleScene.FEEDBACK_BOARD);

    const close = this.add
      .text(CANVAS_W / 2, CANVAS_H / 2 + 145, 'Close', {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: '13px',
        color: Look.textMuted,
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    close.on('pointerdown', (p: Phaser.Input.Pointer) => {
      p.event.stopPropagation();
      this.toggleFeedback(false);
    });
    this.feedbackRoot.add(close);
  }

  private toggleFeedback(force?: boolean): void {
    this.feedbackOpen = force ?? !this.feedbackOpen;
    this.feedbackRoot.setVisible(this.feedbackOpen);
    if (this.feedbackOpen) {
      this.researchOpen = false;
      this.researchRoot?.setVisible(false);
      this.paused = true;
      this.tweens.pauseAll();
    } else {
      this.sim.dirty = true;
    }
  }

  private buildResearchPanel(): void {
    this.researchRoot = this.add.container(0, 0).setDepth(40).setVisible(false);

    const veil = this.add.rectangle(
      CANVAS_W / 2,
      CANVAS_H / 2,
      CANVAS_W,
      CANVAS_H,
      0x0a0c08,
      0.72,
    );
    veil.setInteractive();
    this.researchRoot.add(veil);

    const panel = this.add.graphics();
    panel.fillStyle(Look.panelFill, 0.97);
    panel.fillRoundedRect(48, 56, CANVAS_W - 96, CANVAS_H - 112, 12);
    panel.lineStyle(2, Look.panelStroke, 0.95);
    panel.strokeRoundedRect(48, 56, CANVAS_W - 96, CANVAS_H - 112, 12);
    this.researchRoot.add(panel);

    this.researchRoot.add(
      this.add
        .text(72, 72, 'RESEARCH TREE', {
          fontFamily: 'Georgia, serif',
          fontSize: '26px',
          color: Look.textGold,
        })
        .setDepth(41),
    );

    this.researchRpText = this.add
      .text(CANVAS_W - 72, 78, '', {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: '16px',
        color: Look.text,
      })
      .setOrigin(1, 0);
    this.researchRoot.add(this.researchRpText);

    this.researchRoot.add(
      this.add
        .text(
          72,
          104,
          'Earn RP from kills, wave clears, and victories. Click a node to buy. Esc/Tab closes.',
          {
            fontFamily: 'Segoe UI, sans-serif',
            fontSize: '12px',
            color: Look.textMuted,
          },
        ),
    );

    const cellW = 148;
    const cellH = 78;
    const originX = 72;
    const originY = 140;

    this.researchNodeTexts = [];
    for (const node of RESEARCH_NODES) {
      const x = originX + node.col * (cellW + 10);
      const y = originY + node.row * (cellH + 8);
      const hit = this.add
        .rectangle(x + cellW / 2, y + cellH / 2, cellW, cellH, 0x2a3224, 0.95)
        .setStrokeStyle(1.5, Look.panelStroke, 0.8)
        .setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => this.tryBuyResearch(node.id));
      this.researchRoot.add(hit);

      const label = this.add
        .text(x + 8, y + 8, '', {
          fontFamily: 'Segoe UI, sans-serif',
          fontSize: '12px',
          color: Look.text,
          wordWrap: { width: cellW - 16 },
          lineSpacing: 2,
        })
        .setData('nodeId', node.id);
      this.researchRoot.add(label);
      this.researchNodeTexts.push(label);
    }

    this.researchRoot.add(
      this.add
        .text(72, CANVAS_H - 72, 'Branches: Offense · Control · Economy · Structure', {
          fontFamily: 'Segoe UI, sans-serif',
          fontSize: '11px',
          color: Look.textMuted,
        }),
    );
  }

  private toggleResearch(force?: boolean): void {
    this.researchOpen = force ?? !this.researchOpen;
    this.researchRoot.setVisible(this.researchOpen);
    if (this.researchOpen) {
      this.feedbackOpen = false;
      this.feedbackRoot?.setVisible(false);
      this.paused = true;
      this.tweens.pauseAll();
      this.refreshResearchPanel();
    } else {
      this.sim.dirty = true;
    }
  }

  private refreshResearchPanel(): void {
    if (!this.researchRpText) return;
    this.researchRpText.setText(`RP ${this.campaign.rp}`);
    for (const label of this.researchNodeTexts) {
      const id = label.getData('nodeId') as string;
      const node = RESEARCH_NODES.find((n) => n.id === id);
      if (!node) continue;
      const owned = this.campaign.has(id);
      const can = this.campaign.canBuy(id);
      const lockedReq = !node.requires.every((r) => this.campaign.has(r));
      const branch = RESEARCH_BRANCH_LABEL[node.branch];
      let status = `${node.cost} RP`;
      if (owned) status = 'OWNED';
      else if (lockedReq) status = 'LOCKED';
      else if (!can) status = `${node.cost} RP (need more)`;
      label.setText(`${node.name}\n${node.blurb}\n${branch} · ${status}`);
      label.setColor(owned ? '#9dcea0' : can ? Look.textGold : Look.textMuted);
    }
  }

  private tryBuyResearch(id: string): void {
    if (!this.campaign.tryBuy(id)) {
      this.flashToast(this.campaign.has(id) ? 'already owned' : 'cannot buy');
      this.refreshResearchPanel();
      return;
    }
    this.syncSimFromCampaign();
    this.refreshResearchPanel();
    this.flashToast(`researched ${id.replaceAll('_', ' ')}`);
  }

  private computeLayout(): void {
    const { width, height } = this.sim.grid;
    const playW = CANVAS_W - SIDEBAR_W - 28;
    const maxW = playW - 24;
    const maxH = 520;
    this.cell = Math.max(
      22,
      Math.min(40, Math.floor(Math.min(maxW / width, maxH / height))),
    );
    const boardW = width * this.cell;
    this.originX = Math.floor((playW - boardW) / 2) + 8;
    this.originY = 100;
    void height;
  }

  private rebuildBoard(): void {
    if (this.boardBuilt) {
      this.children.getAll().forEach((obj) => {
        const name = (obj as Phaser.GameObjects.GameObject).name;
        if (name === 'board' || name === 'level_bg') obj.destroy();
      });
    }

    const level = LEVELS[this.levelIndex]!;
    const boardW = this.sim.grid.width * this.cell;
    const boardH = this.sim.grid.height * this.cell;
    const camW = this.scale.width;
    const camH = this.scale.height;

    const bg = this.add
      .image(camW / 2, camH / 2, level.bgKey)
      .setName('level_bg')
      .setDepth(-20);
    const scale = Math.max(camW / bg.width, camH / bg.height);
    bg.setScale(scale).setAlpha(0.92);

    const veil = this.add.graphics().setName('level_bg').setDepth(-19);
    veil.fillStyle(0x1a1612, 0.28);
    veil.fillRect(0, 0, camW, camH);

    const frame = this.add.graphics().setName('board');
    frame.fillStyle(0x1c2418, 0.42);
    frame.fillRoundedRect(
      this.originX - 10,
      this.originY - 10,
      boardW + 20,
      boardH + 20,
      10,
    );
    frame.lineStyle(2, Look.panelStroke, 0.55);
    frame.strokeRoundedRect(
      this.originX - 10,
      this.originY - 10,
      boardW + 20,
      boardH + 20,
      10,
    );

    this.add
      .tileSprite(this.originX, this.originY, boardW, boardH, 'dirt')
      .setOrigin(0, 0)
      .setTileScale(this.cell / 160, this.cell / 160)
      .setTint(0x8faf70)
      .setAlpha(0.28)
      .setName('board');

    this.rockLayer = this.add.container(0, 0).setName('board');
    this.buildRockLayer();

    this.overlayGraphics = this.add.graphics().setName('board');
    this.pathGraphics = this.add.graphics().setName('board');
    this.towerLayer = this.add.container(0, 0).setName('board');
    this.creepLayer = this.add.container(0, 0).setName('board');
    this.fxLayer = this.add.container(0, 0).setName('board').setDepth(5);
    this.clearCreepViews();
    this.boardBuilt = true;
    this.drawHudChrome();
  }

  private buildRockLayer(): void {
    this.rockLayer.removeAll(true);
    const { width, height } = this.sim.grid;
    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        if (this.sim.grid.terrainAt(c, r).walkable) continue;
        const img = this.add
          .image(
            this.originX + c * this.cell + this.cell / 2,
            this.originY + r * this.cell + this.cell / 2,
            'rock',
          )
          .setDisplaySize(this.cell * 1.05, this.cell * 1.05)
          .setAngle(((c * 37 + r * 53) % 8) * 45)
          .setAlpha(0.92)
          .setTint(0xd8e8c8);
        this.rockLayer.add(img);
      }
    }
  }

  private drawHudChrome(): void {
    const g = this.hudPanel;
    g.clear();
    g.fillStyle(Look.panelFill, 0.92);
    g.fillRoundedRect(76, 12, 640, 70, 8);
    g.lineStyle(1.5, Look.panelStroke, 0.9);
    g.strokeRoundedRect(76, 12, 640, 70, 8);
  }

  private selectTower(id: TowerId): void {
    this.sim.setSelectedTower(id);
    this.updateHud(true);
  }

  private buildSidebar(): void {
    const x = CANVAS_W - SIDEBAR_W - 12;
    const y = 96;
    const h = CANVAS_H - y - 28;

    this.sidebarPanel = this.add.graphics().setDepth(19);
    this.sidebarPanel.fillStyle(Look.panelFill, 0.94);
    this.sidebarPanel.fillRoundedRect(x, y, SIDEBAR_W, h, 10);
    this.sidebarPanel.lineStyle(1.5, Look.panelStroke, 0.85);
    this.sidebarPanel.strokeRoundedRect(x, y, SIDEBAR_W, h, 10);

    this.sidebarIcon = this.add
      .image(x + 44, y + 52, 'tower_gun')
      .setDisplaySize(64, 64)
      .setDepth(20);

    this.sidebarTitle = this.add
      .text(x + 88, y + 28, '', {
        fontFamily: 'Georgia, serif',
        fontSize: '20px',
        color: Look.textGold,
      })
      .setDepth(20);

    this.sidebarBlurb = this.add
      .text(x + 16, y + 100, '', {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: '13px',
        color: Look.text,
        wordWrap: { width: SIDEBAR_W - 32 },
        lineSpacing: 4,
      })
      .setDepth(20);

    this.sidebarStats = this.add
      .text(x + 16, y + 170, '', {
        fontFamily: 'Consolas, "Courier New", monospace',
        fontSize: '13px',
        color: Look.textMuted,
        lineSpacing: 6,
      })
      .setDepth(20);

    this.sidebarRoster = this.add
      .text(x + 16, y + h - 180, '', {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: '11px',
        color: Look.textMuted,
        lineSpacing: 4,
      })
      .setDepth(20)
      .setInteractive({ useHandCursor: true });
    this.sidebarRoster.on('pointerdown', (p: Phaser.Input.Pointer) => {
      p.event.stopPropagation();
      const localY = p.y - this.sidebarRoster.y;
      // header line ~15px, then ~15px per roster row
      const row = Math.floor((localY - 16) / 15);
      const id = this.hotkeyIds[row];
      if (id) this.selectTower(id);
    });
  }

  private updateSidebar(force = false): void {
    if (!this.sim || !this.sidebarTitle) return;
    const id = this.sim.selectedTower;
    const def = this.sim.towerDefs[id];
    if (!def) return;
    const key = `${id}|${def.cost}|${this.hotkeyIds.join(',')}|${this.campaign.rp}`;
    if (!force && key === this.sidebarKey) return;
    this.sidebarKey = key;

    this.sidebarIcon.setTexture(def.spriteKey).setDisplaySize(64, 64);
    this.sidebarTitle.setText(def.name);
    this.sidebarBlurb.setText(def.blurb);

    const hotkeySlot = this.hotkeyIds.indexOf(id);
    const hotkey = hotkeySlot >= 0 ? String(hotkeySlot + 1) : '—';
    const rate = towerFireRate(def);
    const dps =
      rate > 0 && def.damage > 0 ? (def.damage * rate).toFixed(1) : '—';
    const lines = [
      `Cost     ${def.cost}g`,
      `Hotkey   ${hotkey}`,
      `Damage   ${def.damage > 0 ? def.damage : '—'}`,
      `Range    ${def.range > 0 ? `${def.range} cells` : '—'}`,
      `Rate     ${rate > 0 ? `${rate.toFixed(2)} /s` : '—'}`,
      `DPS      ${dps}`,
      `Splash   ${def.splash > 0 ? `${def.splash} cells` : '—'}`,
      `Slow     ${
        def.slowTicks > 0
          ? `${Math.round((1 - def.slowFactor) * 100)}% / ${(def.slowTicks / this.tickHz).toFixed(1)}s`
          : '—'
      }`,
      `RP bank  ${this.campaign.rp}`,
    ];
    this.sidebarStats.setText(lines.join('\n'));

    const roster = this.hotkeyIds
      .map((tid, i) => {
        const t = this.sim.towerDefs[tid]!;
        const mark = tid === id ? '▸' : ' ';
        return `${mark}${i + 1} ${t.name.padEnd(8)} ${t.cost}g`;
      })
      .join('\n');
    this.sidebarRoster.setText(`Roster (Tab = research)\n${roster}`);
  }

  private pointerToCell(x: number, y: number): Cell | null {
    const c = Math.floor((x - this.originX) / this.cell);
    const r = Math.floor((y - this.originY) / this.cell);
    if (!this.sim.grid.inBounds(c, r)) return null;
    return { c, r };
  }

  private cellCenter(c: number, r: number): { x: number; y: number } {
    return {
      x: this.originX + c * this.cell + this.cell / 2,
      y: this.originY + r * this.cell + this.cell / 2,
    };
  }

  private redrawOverlays(): void {
    if (!this.overlayGraphics) return;
    const g = this.overlayGraphics;
    g.clear();
    const { width, height } = this.sim.grid;
    const CELL = this.cell;

    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        if (!this.sim.grid.terrainAt(c, r).walkable) continue;
        const x = this.originX + c * CELL;
        const y = this.originY + r * CELL;
        g.lineStyle(1, 0x000000, 0.1);
        g.strokeRect(x + 0.5, y + 0.5, CELL - 1, CELL - 1);
      }
    }

    for (const s of this.sim.grid.spawns) {
      const { x, y } = this.cellCenter(s.c, s.r);
      g.fillStyle(Look.spawn, 0.9);
      g.fillCircle(x, y, Math.max(6, CELL * 0.22));
    }
    for (const goal of this.sim.grid.goals) {
      const { x, y } = this.cellCenter(goal.c, goal.r);
      g.fillStyle(Look.goal, 0.9);
      g.fillCircle(x, y, Math.max(6, CELL * 0.22));
    }

    if (this.hover) {
      const x = this.originX + this.hover.c * CELL;
      const y = this.originY + this.hover.r * CELL;
      const ok = this.sim.hoverPlacementOk(this.hover);
      g.lineStyle(2, ok ? Look.hover : Look.goal, 0.7);
      g.strokeRect(x + 2, y + 2, CELL - 4, CELL - 4);
    }

    this.pathGraphics.clear();
    const path = this.sim.previewPath(this.hover);
    if (path && path.length > 1) {
      const blocked =
        !!this.hover &&
        this.sim.towerDefs[this.sim.selectedTower]!.blocks &&
        !this.sim.hoverPlacementOk(this.hover);
      this.pathGraphics.lineStyle(4, blocked ? Look.goal : Look.path, blocked ? 0.35 : 0.5);
      const first = this.cellCenter(path[0]!.c, path[0]!.r);
      this.pathGraphics.beginPath();
      this.pathGraphics.moveTo(first.x, first.y);
      for (let i = 1; i < path.length; i++) {
        const p = this.cellCenter(path[i]!.c, path[i]!.r);
        this.pathGraphics.lineTo(p.x, p.y);
      }
      this.pathGraphics.strokePath();
      this.pathGraphics.lineStyle(2, blocked ? 0xff8080 : Look.pathGhost, 0.85);
      this.pathGraphics.beginPath();
      this.pathGraphics.moveTo(first.x, first.y);
      for (let i = 1; i < path.length; i++) {
        const p = this.cellCenter(path[i]!.c, path[i]!.r);
        this.pathGraphics.lineTo(p.x, p.y);
      }
      this.pathGraphics.strokePath();
    }
  }

  private syncTowers(): void {
    if (!this.towerLayer) return;
    this.towerLayer.removeAll(true);
    const CELL = this.cell;
    for (const tower of this.sim.getTowers()) {
      const def = this.sim.towerDefs[tower.defId];
      if (!def) continue;
      const { x, y } = this.cellCenter(tower.cell.c, tower.cell.r);

      if (def.range > 0) {
        const ring = this.add.circle(x, y, def.range * CELL, def.color, 0.07);
        this.towerLayer.add(ring);
      }

      const sprite = this.add
        .image(x, y, def.spriteKey)
        .setDisplaySize(CELL - 2, CELL - 2);
      this.towerLayer.add(sprite);
    }
  }

  private clearCreepViews(): void {
    for (const view of this.creepViews.values()) {
      view.body.destroy();
      view.barBg.destroy();
      view.bar.destroy();
    }
    this.creepViews.clear();
  }

  private creepWorldPos(creep: {
    path: Cell[];
    pathIndex: number;
    t: number;
  }): { x: number; y: number } {
    const from = creep.path[creep.pathIndex]!;
    const to =
      creep.path[Math.min(creep.pathIndex + 1, creep.path.length - 1)]!;
    const a = this.cellCenter(from.c, from.r);
    const b = this.cellCenter(to.c, to.r);
    const t = Math.min(1, creep.t);
    return {
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
    };
  }

  private syncCreeps(): void {
    if (!this.creepLayer) return;
    const alive = new Set<number>();

    for (const creep of this.sim.getCreeps()) {
      alive.add(creep.id);
      const { x, y } = this.creepWorldPos(creep);
      const size = Math.max(20, this.cell * 0.78 * creep.scale);
      let view = this.creepViews.get(creep.id);
      if (!view) {
        const body = this.add
          .image(x, y, 'creep')
          .setDisplaySize(size, size)
          .setTint(creep.color);
        const barBg = this.add.rectangle(x, y - size * 0.65, 20, 4, 0x000000, 0.5);
        const bar = this.add.rectangle(x, y - size * 0.65, 20, 3, Look.hpOk);
        this.creepLayer.add([body, barBg, bar]);
        view = { body, barBg, bar };
        this.creepViews.set(creep.id, view);
      }

      view.body.setPosition(x, y).setDisplaySize(size, size);
      view.body.setAlpha(creep.slowTicks > 0 ? 0.72 : 1);
      const pct = Math.max(0, creep.hp / creep.maxHp);
      const barW = Math.max(4, 20 * pct);
      view.barBg.setPosition(x, y - size * 0.65);
      view.bar
        .setPosition(x - 10 + barW / 2, y - size * 0.65)
        .setSize(barW, 3)
        .setFillStyle(pct > 0.35 ? Look.hpOk : Look.hpBad);
    }

    for (const [id, view] of this.creepViews) {
      if (alive.has(id)) continue;
      view.body.destroy();
      view.barBg.destroy();
      view.bar.destroy();
      this.creepViews.delete(id);
    }
  }

  private playShotFx(e: Extract<SimEvent, { type: 'tower_shot' }>): void {
    if (!this.fxLayer || this.activeShots >= this.maxShots) return;
    const epoch = this.fxEpoch;
    this.activeShots++;

    const from = this.cellCenter(e.from.c, e.from.r);
    const creep = this.sim.getCreeps().find((c) => c.id === e.creepId);
    const to = creep
      ? this.creepWorldPos(creep)
      : this.cellCenter(e.to.c, e.to.r);

    const color = e.color;
    const beam = this.add.graphics();
    beam.lineStyle(Math.max(3, this.cell * 0.12), 0xfff2c8, 0.95);
    beam.lineBetween(from.x, from.y, to.x, to.y);
    beam.lineStyle(Math.max(2, this.cell * 0.07), color, 1);
    beam.lineBetween(from.x, from.y, to.x, to.y);
    this.fxLayer.add(beam);

    const bolt = this.add.circle(from.x, from.y, Math.max(4, this.cell * 0.18), 0xfff8e0, 1);
    bolt.setStrokeStyle(2, color, 1);
    this.fxLayer.add(bolt);

    const release = (): void => {
      this.activeShots = Math.max(0, this.activeShots - 1);
    };

    this.tweens.add({
      targets: bolt,
      x: to.x,
      y: to.y,
      duration:
        e.towerDefId === 'sniper' || e.towerDefId === 'beam'
          ? 90
          : e.towerDefId === 'mortar' || e.towerDefId === 'tesla'
            ? 160
            : 70,
      ease: 'Quad.easeOut',
      onComplete: () => {
        if (bolt.active) bolt.destroy();
        if (epoch !== this.fxEpoch || !this.fxLayer) {
          release();
          return;
        }
        if (e.splash > 0) {
          const ring = this.add.circle(
            to.x,
            to.y,
            Math.max(10, e.splash * this.cell * 0.55),
            color,
            0.35,
          );
          ring.setStrokeStyle(2, 0xfff2c8, 0.9);
          this.fxLayer.add(ring);
          this.tweens.add({
            targets: ring,
            alpha: 0,
            scale: 1.35,
            duration: 220,
            onComplete: () => {
              if (ring.active) ring.destroy();
              release();
            },
          });
        } else {
          const flash = this.add.circle(
            to.x,
            to.y,
            Math.max(6, this.cell * 0.22),
            0xfff8e0,
            0.9,
          );
          this.fxLayer.add(flash);
          this.tweens.add({
            targets: flash,
            alpha: 0,
            scale: 1.8,
            duration: 140,
            onComplete: () => {
              if (flash.active) flash.destroy();
              release();
            },
          });
        }
      },
    });

    this.tweens.add({
      targets: beam,
      alpha: 0,
      duration: 120,
      delay: 40,
      onComplete: () => {
        if (beam.active) beam.destroy();
      },
    });
  }

  private updateHud(force = false): void {
    if (!this.sim || !this.hud) return;

    const phase =
      this.sim.phase === 'prep'
        ? `BUILD ${Math.ceil(this.sim.phaseTimer / this.tickHz)}s`
        : this.sim.phase;

    const key = `${this.sim.gold}|${this.sim.lives}|${this.sim.waveIndex}|${phase}|${this.paused}|${this.sim.selectedTower}|${this.campaign.rp}`;
    if (!force && key === this.hudKey) {
      this.updateSidebar();
      return;
    }
    this.hudKey = key;

    this.hud.setText(
      `Gold ${this.sim.gold}   Lives ${this.sim.lives}   Wave ${this.sim.waveIndex + 1}/${this.sim.waveCount} (${phase})   RP ${this.campaign.rp}${this.paused ? '   PAUSED' : ''}`,
    );

    const level = LEVELS[this.levelIndex]!;
    this.levelHud.setText(
      `Lv ${this.levelIndex + 1}/${LEVELS.length}: ${level.name} — ${level.blurb}`,
    );
    this.title.setColor(this.paused ? Look.textMuted : Look.textGold);
    this.updateSidebar(force);
  }

  private flashToast(msg: string): void {
    this.toast.setText(String(msg).replaceAll('_', ' '));
    this.tweens.killTweensOf(this.toast);
    this.toast.setAlpha(1);
    this.tweens.add({
      targets: this.toast,
      alpha: 0,
      delay: 900,
      duration: 400,
    });
  }

  private showBanner(msg: string): void {
    this.statusBanner.setText(msg);
    this.statusBanner.setAlpha(1);
  }
}
