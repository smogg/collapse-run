import { GamePhase, Vec2, TurretInstance, SimEvent, FloatingText } from './types';
import { Grid } from './core/Grid';
import { Simulation } from './core/Simulation';
import { Renderer } from './Renderer';
import { LEVELS } from './data/levels';
import { MS_PER_TICK, CELL_PX, TICKS_PER_SECOND } from './config';
import { SpriteLoader } from './SpriteLoader';

type DragSource = { from: 'pool'; poolIndex: number; defId: string }
                | { from: 'squad'; slotIndex: number; defId: string };

const FLOAT_TEXT_LIFE = 30; // ticks (~1.5 sec)

export class Game {
  canvas: HTMLCanvasElement;
  renderer: Renderer;

  phase: GamePhase = 'squad';
  currentLevelIndex = 0;
  grid!: Grid;
  turretInstances: TurretInstance[] = [];
  simulation: Simulation | null = null;

  pool: string[] = [];
  squad: (string | null)[] = [];

  drag: DragSource | null = null;
  dragStartPos: Vec2 | null = null;
  dragCurrentPos: Vec2 | null = null;
  didDrag = false;

  floatingTexts: FloatingText[] = [];

  accumulator = 0;
  lastTime = 0;

  resultRects: {
    retryRect: { x: number; y: number; w: number; h: number };
    nextRect: { x: number; y: number; w: number; h: number } | null;
  } | null = null;

  constructor(canvas: HTMLCanvasElement, sprites: SpriteLoader) {
    this.canvas = canvas;
    this.renderer = new Renderer(canvas, sprites);
    this.setupInput();
    this.loadLevel(0);
  }

  get level() { return LEVELS[this.currentLevelIndex]; }

  loadLevel(index: number, keepSquad = false) {
    this.currentLevelIndex = index;
    const level = this.level;
    this.grid = new Grid(level);
    this.simulation = null;
    this.accumulator = 0;
    this.resultRects = null;
    this.floatingTexts = [];
    this.turretInstances = level.turrets.map(t => ({
      defId: t.defId, pos: { x: t.pos.x, y: t.pos.y }, cooldown: 0, targetUnitId: null,
    }));

    if (keepSquad && this.squad.every(s => s !== null)) {
      this.pool = [];
    } else {
      this.pool = [...level.availableUnits];
      this.squad = new Array(level.squadSize).fill(null);
    }
    this.phase = 'squad';
    this.drag = null;
  }

  start() {
    this.lastTime = performance.now();
    const loop = (now: number) => {
      const dt = now - this.lastTime;
      this.lastTime = now;
      this.update(dt);
      this.render();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  private processEvents(events: SimEvent[]) {
    for (const e of events) {
      if (e.type === 'unit_hit') {
        this.floatingTexts.push({
          x: e.pos.x, y: e.pos.y,
          text: `-${e.damage}`,
          color: '#ff4444',
          life: FLOAT_TEXT_LIFE,
          maxLife: FLOAT_TEXT_LIFE,
        });
      } else if (e.type === 'unit_healed') {
        this.floatingTexts.push({
          x: e.pos.x, y: e.pos.y,
          text: `+${e.amount}`,
          color: '#55efc4',
          life: FLOAT_TEXT_LIFE,
          maxLife: FLOAT_TEXT_LIFE,
        });
      } else if (e.type === 'unit_killed') {
        this.floatingTexts.push({
          x: e.pos.x, y: e.pos.y,
          text: 'DEAD',
          color: '#e74c3c',
          life: FLOAT_TEXT_LIFE + 10,
          maxLife: FLOAT_TEXT_LIFE + 10,
        });
      } else if (e.type === 'shield_wall_activated') {
        this.floatingTexts.push({
          x: e.pos.x, y: e.pos.y,
          text: 'SHIELD!',
          color: '#fdcb6e',
          life: FLOAT_TEXT_LIFE + 10,
          maxLife: FLOAT_TEXT_LIFE + 10,
        });
      } else if (e.type === 'heal_wave_activated') {
        this.floatingTexts.push({
          x: e.pos.x, y: e.pos.y,
          text: 'HEAL WAVE!',
          color: '#55efc4',
          life: FLOAT_TEXT_LIFE + 10,
          maxLife: FLOAT_TEXT_LIFE + 10,
        });
      }
    }
  }

  update(dt: number) {
    if (this.phase !== 'simulating' || !this.simulation) return;
    this.accumulator += dt;
    while (this.accumulator >= MS_PER_TICK) {
      this.accumulator -= MS_PER_TICK;
      const events = this.simulation.step();
      this.processEvents(events);
      this.turretInstances = this.simulation.turrets;

      // Tick down floating texts
      for (const ft of this.floatingTexts) ft.life--;
      this.floatingTexts = this.floatingTexts.filter(ft => ft.life > 0);

      if (this.simulation.isComplete()) {
        this.phase = this.simulation.unitsEscaped >= this.level.requiredEscapes ? 'victory' : 'defeat';
        break;
      }
    }
  }

  render() {
    const r = this.renderer;
    const level = this.level;
    const path = level.path;

    r.clear();

    if (this.phase === 'squad') {
      r.drawSquadScreen(this.pool, this.squad, level.name, level.squadSize, this.drag, this.dragCurrentPos, this.didDrag);
    } else {
      r.drawGrid(this.grid.cells);
      r.drawPathLine(path);
      r.drawTurrets(this.turretInstances, this.phase === 'simulating');

      if (this.phase === 'simulating' && this.simulation) {
        const lerpFactor = this.accumulator / MS_PER_TICK;
        r.drawUnits(this.simulation.units, path, lerpFactor, this.simulation.abilities);
        r.drawProjectiles(this.simulation.projectiles);
        r.drawFloatingTexts(this.floatingTexts);
        r.drawSimulatingHUD(
          this.simulation.unitsEscaped, this.simulation.unitsKilled,
          this.simulation.totalUnits, level.requiredEscapes, level.name,
          this.simulation.abilities,
        );
      } else if ((this.phase === 'victory' || this.phase === 'defeat') && this.simulation) {
        r.drawUnits(this.simulation.units, path, 0, this.simulation.abilities);
        r.drawProjectiles(this.simulation.projectiles);
        this.resultRects = r.drawResult(this.phase === 'victory', this.simulation.unitsEscaped, level.requiredEscapes, this.simulation.totalUnits, level.name, this.currentLevelIndex < LEVELS.length - 1);
      }
    }

    r.flush();
  }

  get squadFull(): boolean {
    return this.squad.every(s => s !== null);
  }

  startWave() {
    if (!this.squadFull) return;
    const level = this.level;
    const finalSquad = this.squad.filter((s): s is string => s !== null);
    this.simulation = new Simulation(level.path, level.turrets, finalSquad, level.spawnInterval, this.grid);
    this.phase = 'simulating';
    this.accumulator = 0;
    this.floatingTexts = [];
  }

  private hitTestSquadSlot(gamePos: Vec2): number | null {
    for (let i = 0; i < this.renderer.squadSlotRects.length; i++) {
      const r = this.renderer.squadSlotRects[i];
      if (gamePos.x >= r.x && gamePos.x <= r.x + r.w && gamePos.y >= r.y && gamePos.y <= r.y + r.h) return i;
    }
    return null;
  }

  // Roster card types in same order as Renderer.ROSTER_INFO
  private static ROSTER_TYPES = ['normal', 'tank', 'healer'];

  /** Hit test roster cards. Returns the card index (0-2), not a pool array index. */
  private hitTestRosterCard(gamePos: Vec2): number | null {
    for (let i = 0; i < this.renderer.poolItemRects.length; i++) {
      const r = this.renderer.poolItemRects[i];
      if (gamePos.x >= r.x && gamePos.x <= r.x + r.w && gamePos.y >= r.y && gamePos.y <= r.y + r.h) return i;
    }
    return null;
  }

  /** Find the first pool array index for a given unit type. */
  private findPoolIndexForType(typeId: string): number {
    return this.pool.indexOf(typeId);
  }

  setupInput() {
    this.canvas.addEventListener('mousemove', (e) => {
      const gamePos = this.renderer.screenToGame(e.clientX, e.clientY);
      if (this.phase === 'squad' && this.drag) {
        this.dragCurrentPos = gamePos;
        if (this.dragStartPos) {
          const dx = gamePos.x - this.dragStartPos.x;
          const dy = gamePos.y - this.dragStartPos.y;
          if (dx * dx + dy * dy > 25) this.didDrag = true;
        }
      }
    });

    this.canvas.addEventListener('mousedown', (e) => {
      if (this.phase === 'squad') {
        const gamePos = this.renderer.screenToGame(e.clientX, e.clientY);
        const slotIdx = this.hitTestSquadSlot(gamePos);
        if (slotIdx !== null && this.squad[slotIdx] !== null) {
          this.drag = { from: 'squad', slotIndex: slotIdx, defId: this.squad[slotIdx]! };
          this.dragStartPos = gamePos; this.dragCurrentPos = gamePos; this.didDrag = false;
          return;
        }
        const cardIdx = this.hitTestRosterCard(gamePos);
        if (cardIdx !== null) {
          const typeId = Game.ROSTER_TYPES[cardIdx];
          const poolIdx = this.findPoolIndexForType(typeId);
          if (poolIdx !== -1) {
            this.drag = { from: 'pool', poolIndex: poolIdx, defId: typeId };
            this.dragStartPos = gamePos; this.dragCurrentPos = gamePos; this.didDrag = false;
            return;
          }
        }
        const go = this.renderer.goButtonRect;
        if (this.squadFull && gamePos.x >= go.x && gamePos.x <= go.x + go.w && gamePos.y >= go.y && gamePos.y <= go.y + go.h) {
          this.startWave(); return;
        }
      } else if (this.phase === 'victory' || this.phase === 'defeat') {
        this.handleResultClick(e);
      }
    });

    this.canvas.addEventListener('mouseup', (e) => {
      if (this.phase === 'squad' && this.drag) {
        const gamePos = this.renderer.screenToGame(e.clientX, e.clientY);
        const dropSlot = this.hitTestSquadSlot(gamePos);
        if (this.drag.from === 'pool') {
          if (this.didDrag && dropSlot !== null) {
            if (this.squad[dropSlot] === null) {
              this.squad[dropSlot] = this.drag.defId;
              this.pool.splice(this.drag.poolIndex, 1);
            } else {
              this.pool.push(this.squad[dropSlot]!);
              this.squad[dropSlot] = this.drag.defId;
              this.pool.splice(this.drag.poolIndex, 1);
            }
          } else if (!this.didDrag) {
            const emptySlot = this.squad.indexOf(null);
            if (emptySlot !== -1) {
              this.squad[emptySlot] = this.drag.defId;
              this.pool.splice(this.drag.poolIndex, 1);
            }
          }
        } else if (this.drag.from === 'squad') {
          if (this.didDrag) {
            if (dropSlot !== null && dropSlot !== this.drag.slotIndex) {
              const tmp = this.squad[this.drag.slotIndex];
              this.squad[this.drag.slotIndex] = this.squad[dropSlot];
              this.squad[dropSlot] = tmp;
            } else if (dropSlot === null) {
              this.pool.push(this.squad[this.drag.slotIndex]!);
              this.squad[this.drag.slotIndex] = null;
            }
          } else {
            this.pool.push(this.squad[this.drag.slotIndex]!);
            this.squad[this.drag.slotIndex] = null;
          }
        }
        this.drag = null; this.dragStartPos = null; this.dragCurrentPos = null; this.didDrag = false;
      }
    });

    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('keydown', (e) => {
      if (this.phase === 'squad') {
        if ((e.key === ' ' || e.key === 'Enter') && this.squadFull) {
          e.preventDefault(); this.startWave();
        }
      } else if (this.phase === 'simulating' && this.simulation) {
        if (e.key === '1') {
          const events = this.simulation.activateShieldWall();
          this.processEvents(events);
        } else if (e.key === '2') {
          const events = this.simulation.activateHealingWave();
          this.processEvents(events);
        }
      } else if (this.phase === 'victory' || this.phase === 'defeat') {
        if (e.key === 'r' || e.key === 'R') this.loadLevel(this.currentLevelIndex);
        else if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          if (this.phase === 'victory' && this.currentLevelIndex < LEVELS.length - 1) {
            this.loadLevel(this.currentLevelIndex + 1, true);
          } else {
            this.loadLevel(this.currentLevelIndex);
          }
        }
      }
    });
  }

  handleResultClick(e: MouseEvent) {
    if (!this.resultRects) return;
    const gamePos = this.renderer.screenToGame(e.clientX, e.clientY);
    const { retryRect, nextRect } = this.resultRects;
    if (gamePos.x >= retryRect.x && gamePos.x <= retryRect.x + retryRect.w && gamePos.y >= retryRect.y && gamePos.y <= retryRect.y + retryRect.h) {
      this.loadLevel(this.currentLevelIndex); return;
    }
    if (nextRect && gamePos.x >= nextRect.x && gamePos.x <= nextRect.x + nextRect.w && gamePos.y >= nextRect.y && gamePos.y <= nextRect.y + nextRect.h) {
      this.loadLevel(this.currentLevelIndex + 1, true);
    }
  }
}
