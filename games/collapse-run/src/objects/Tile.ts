import Phaser from 'phaser';
import { TILE_DRAW_W, TILE_DRAW_H, CUBE_HEIGHT, COLORS, CRACK_WARN_MS } from '../config';
import { TileState } from '../types';

export class Tile extends Phaser.GameObjects.Graphics {
  state: TileState = TileState.STABLE;
  col: number;
  row: number;
  timedCollapse: boolean;
  private crackTimer = 0;
  private fallTimer = 0;
  private stabilityTime: number;
  private collapseStarted = false;

  constructor(scene: Phaser.Scene, col: number, row: number, timedCollapse: boolean, stabilityTime: number) {
    super(scene);
    this.col = col;
    this.row = row;
    this.timedCollapse = timedCollapse;
    this.stabilityTime = stabilityTime;
    this.draw();
    scene.add.existing(this);
  }

  startCracking(): void {
    if (this.state !== TileState.STABLE) return;
    this.state = TileState.CRACKING;
    this.crackTimer = 0;
  }

  triggerTimedCollapse(): void {
    if (this.collapseStarted || this.state !== TileState.STABLE) return;
    this.collapseStarted = true;
    this.scene.time.delayedCall(this.stabilityTime, () => {
      this.startCracking();
    });
  }

  update(_time: number, delta: number): void {
    if (this.state === TileState.CRACKING) {
      this.crackTimer += delta;
      if (this.crackTimer >= CRACK_WARN_MS) {
        this.state = TileState.FALLING;
        this.fallTimer = 0;
      }
      this.draw();
    } else if (this.state === TileState.FALLING) {
      this.fallTimer += delta;
      if (this.fallTimer > 400) {
        this.state = TileState.GONE;
        this.setVisible(false);
      } else {
        this.setAlpha(1 - this.fallTimer / 400);
        this.setScale(1 - this.fallTimer / 800);
        this.y += delta * 0.15;
      }
    }
  }

  private draw(): void {
    this.clear();

    const w = TILE_DRAW_W - 2;
    const h = TILE_DRAW_H - 2;
    const sideH = CUBE_HEIGHT * 0.3;

    let topColor: number;
    let sideColor: number;

    if (this.state === TileState.CRACKING) {
      topColor = COLORS.TILE_CRACKING;
      sideColor = COLORS.TILE_CRACKING_SIDE;
      // Shake effect
      const shake = Math.sin(this.crackTimer * 0.05) * 2;
      this.setX(this.col * TILE_DRAW_W + 1 + shake);
    } else {
      topColor = COLORS.TILE_STABLE;
      sideColor = COLORS.TILE_STABLE_SIDE;
    }

    // Side face
    this.fillStyle(sideColor, 1);
    this.fillRect(0, h, w, sideH);

    // Top face
    this.fillStyle(topColor, 1);
    this.fillRect(0, 0, w, h);

    // Subtle edge highlight
    this.lineStyle(1, 0xffffff, 0.1);
    this.strokeRect(0, 0, w, h);
  }

  reset(col: number, row: number, timedCollapse: boolean): void {
    this.col = col;
    this.row = row;
    this.timedCollapse = timedCollapse;
    this.state = TileState.STABLE;
    this.crackTimer = 0;
    this.fallTimer = 0;
    this.collapseStarted = false;
    this.setAlpha(1);
    this.setScale(1);
    this.setVisible(true);
    this.setPosition(col * TILE_DRAW_W + 1, 0);
    this.draw();
  }

  isWalkable(): boolean {
    return this.state === TileState.STABLE || this.state === TileState.CRACKING;
  }
}
