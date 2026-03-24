import Phaser from 'phaser';
import { TILE_DRAW_W, TILE_DRAW_H, CUBE_HEIGHT, COLORS } from '../config';

export class Obstacle extends Phaser.GameObjects.Graphics {
  col: number;
  row: number;
  private rangeLeft: number;
  private rangeRight: number;
  private speed: number;
  private dir: 1 | -1 = 1;
  private floatCol: number;

  constructor(scene: Phaser.Scene, col: number, row: number, rangeLeft: number, rangeRight: number) {
    super(scene);
    this.col = col;
    this.row = row;
    this.floatCol = col;
    this.rangeLeft = rangeLeft;
    this.rangeRight = rangeRight;
    this.speed = 2 + Math.random() * 2;
    this.draw();
    scene.add.existing(this);
  }

  update(_time: number, delta: number): void {
    this.floatCol += this.dir * this.speed * (delta / 1000);
    if (this.floatCol >= this.rangeRight) {
      this.floatCol = this.rangeRight;
      this.dir = -1;
    } else if (this.floatCol <= this.rangeLeft) {
      this.floatCol = this.rangeLeft;
      this.dir = 1;
    }
    this.col = Math.round(this.floatCol);
    this.x = this.floatCol * TILE_DRAW_W;
  }

  private draw(): void {
    this.clear();
    const w = TILE_DRAW_W - 4;
    const h = TILE_DRAW_H - 4;
    const sideH = CUBE_HEIGHT * 0.5;

    this.fillStyle(COLORS.OBSTACLE_SIDE, 1);
    this.fillRect(2, h, w, sideH);

    this.fillStyle(COLORS.OBSTACLE, 1);
    this.fillRect(2, 0, w, h);
  }

  occupiesCol(col: number): boolean {
    return Math.abs(col - this.floatCol) < 0.8;
  }
}
