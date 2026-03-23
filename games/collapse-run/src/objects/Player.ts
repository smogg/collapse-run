import Phaser from 'phaser';
import { TILE_DRAW_W, TILE_DRAW_H, CUBE_HEIGHT, COLORS, GRID_COLS } from '../config';

export class Player extends Phaser.GameObjects.Container {
  gridCol: number;
  gridRow: number;
  private topFace: Phaser.GameObjects.Graphics;
  private trailEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private targetCol: number;
  private moveSpeed = 12;
  private dead = false;

  constructor(scene: Phaser.Scene, col: number, row: number) {
    super(scene, 0, 0);
    this.gridCol = col;
    this.targetCol = col;
    this.gridRow = row;

    this.topFace = scene.add.graphics();
    this.add(this.topFace);
    this.drawCube();

    this.setupTrail();
    scene.add.existing(this);
  }

  private drawCube(): void {
    const g = this.topFace;
    g.clear();

    const w = TILE_DRAW_W - 8;
    const h = TILE_DRAW_H - 8;
    const cx = w / 2;

    // Outer glow (large soft)
    g.fillStyle(COLORS.PLAYER_GLOW, 0.08);
    g.fillRect(-12, -12, w + 24, h + CUBE_HEIGHT + 24);

    // Mid glow
    g.fillStyle(COLORS.PLAYER_GLOW, 0.12);
    g.fillRect(-6, -6, w + 12, h + CUBE_HEIGHT + 12);

    // Side left
    g.fillStyle(COLORS.PLAYER_SIDE_L, 1);
    g.fillRect(0, h, cx, CUBE_HEIGHT);

    // Side right
    g.fillStyle(COLORS.PLAYER_SIDE_R, 1);
    g.fillRect(cx, h, cx, CUBE_HEIGHT);

    // Top face
    g.fillStyle(COLORS.PLAYER_TOP, 1);
    g.fillRect(0, 0, w, h);

    // Inner highlight
    g.fillStyle(0xffffff, 0.2);
    g.fillRect(4, 4, w - 8, h - 8);
  }

  private setupTrail(): void {
    // Create a small texture for trail particles
    if (!this.scene.textures.exists('trail_particle')) {
      const gfx = this.scene.add.graphics();
      gfx.fillStyle(COLORS.PLAYER_TOP, 1);
      gfx.fillRect(0, 0, 4, 4);
      gfx.generateTexture('trail_particle', 4, 4);
      gfx.destroy();
    }

    // Trail is added to the same parent container as the player
    const trailParticles = this.scene.add.particles(0, 0, 'trail_particle', {
      speed: { min: 5, max: 20 },
      angle: { min: 170, max: 190 },
      alpha: { start: 0.6, end: 0 },
      scale: { start: 1, end: 0.2 },
      lifespan: 300,
      frequency: 40,
      blendMode: Phaser.BlendModes.ADD,
    });
    this.add(trailParticles);
    trailParticles.setPosition((TILE_DRAW_W - 8) / 2, -TILE_DRAW_H * 0.5);
  }

  moveLeft(): void {
    if (this.dead) return;
    this.targetCol = Math.max(0, this.targetCol - 1);
  }

  moveRight(): void {
    if (this.dead) return;
    this.targetCol = Math.min(GRID_COLS - 1, this.targetCol + 1);
  }

  holdDirection(dir: -1 | 0 | 1, delta: number): void {
    if (this.dead || dir === 0) return;
    const step = this.moveSpeed * (delta / 1000);
    this.targetCol = Math.max(0, Math.min(GRID_COLS - 1,
      this.targetCol + dir * step));
  }

  updatePosition(delta: number, speed: number): void {
    if (this.dead) return;

    // Forward movement
    this.gridRow += speed * (delta / 1000) / TILE_DRAW_H;

    // Lateral smooth movement
    const diff = this.targetCol - this.gridCol;
    if (Math.abs(diff) > 0.01) {
      this.gridCol += diff * Math.min(1, this.moveSpeed * delta / 1000);
    } else {
      this.gridCol = this.targetCol;
    }

    this.updateScreenPosition();
  }

  updateScreenPosition(): void {
    this.setPosition(
      this.gridCol * TILE_DRAW_W + 4,
      this.gridRow * TILE_DRAW_H + 4
    );
  }

  getCurrentCol(): number {
    return Math.round(this.gridCol);
  }

  getCurrentRow(): number {
    return Math.round(this.gridRow);
  }

  playFallAnimation(): Promise<void> {
    this.dead = true;
    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: this,
        scaleX: 0.3,
        scaleY: 0.3,
        alpha: 0,
        y: this.y + 120,
        duration: 400,
        ease: 'Power2',
        onComplete: () => resolve(),
      });
    });
  }

  revive(col: number, row: number): void {
    this.dead = false;
    this.gridCol = col;
    this.targetCol = col;
    this.gridRow = row;
    this.setAlpha(1);
    this.setScale(1);
    this.updateScreenPosition();
  }

  resetForNewRun(col: number, row: number): void {
    this.dead = false;
    this.gridCol = col;
    this.targetCol = col;
    this.gridRow = row;
    this.setAlpha(1);
    this.setScale(1);
    this.updateScreenPosition();
  }
}
