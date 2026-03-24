import Phaser from 'phaser';
import { GRID_COLS, TILE_DRAW_W, TILE_DRAW_H, CUBE_HEIGHT, LOOK_AHEAD_ROWS, LOOK_BEHIND_ROWS, COLORS, DIFFICULTY_DEFAULTS } from '../config';
import { TileState } from '../types';
import { PathGenerator, RowData } from '../systems/PathGenerator';
import { AdaptiveDifficulty } from '../systems/AdaptiveDifficulty';
import { ScoreManager } from '../systems/ScoreManager';
import { InputManager } from '../systems/InputManager';
import { AudioManager } from '../systems/AudioManager';
import { AdManager } from '../systems/AdManager';
import { Player } from '../objects/Player';
import { Tile } from '../objects/Tile';
import { Obstacle } from '../objects/Obstacle';

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private pathGen!: PathGenerator;
  private difficulty!: AdaptiveDifficulty;
  private scoreManager!: ScoreManager;
  private inputManager!: InputManager;
  private audioManager!: AudioManager;
  private adManager!: AdManager;

  private tiles: Map<string, Tile> = new Map();
  private obstacles: Map<number, Obstacle> = new Map();
  private worldContainer!: Phaser.GameObjects.Container;

  private running = false;
  private dead = false;
  private runStartTime = 0;
  private lastSafeCol = 3;
  private lastSafeRow = 0;
  private runSeed = 1;

  // Collapse behind player
  private collapseRow = -10;

  // Movement input tracking
  private lastDir: -1 | 0 | 1 = 0;
  private dirHoldTime = 0;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.difficulty = new AdaptiveDifficulty();
    this.scoreManager = new ScoreManager();
    this.inputManager = new InputManager(this);
    this.inputManager.init();
    this.audioManager = new AudioManager();
    this.audioManager.init();
    this.adManager = this.registry.get('adManager') as AdManager;

    this.worldContainer = this.add.container(0, 0);

    this.startRun();
  }

  private startRun(): void {
    // Clean up previous run
    this.worldContainer.removeAll(true);
    this.tiles.clear();
    this.obstacles.clear();

    this.runSeed = Date.now();
    const params = this.difficulty.getParams();
    this.pathGen = new PathGenerator(this.runSeed, params);

    if (this.difficulty.shouldInjectSafeSegment()) {
      this.pathGen.injectSafeSegment();
    }

    const startCol = Math.floor(GRID_COLS / 2);
    const startRow = 0;

    // Generate initial tiles first, then add player on top
    this.pathGen.generate(startRow + LOOK_AHEAD_ROWS);
    this.renderRows(startRow - 2, startRow + LOOK_AHEAD_ROWS);

    this.player = new Player(this, startCol, startRow);
    this.player.setDepth(1000);
    this.worldContainer.add(this.player);

    this.running = true;
    this.dead = false;
    this.runStartTime = this.time.now;
    this.collapseRow = startRow - 5;
    this.lastSafeCol = startCol;
    this.lastSafeRow = startRow;

    this.difficulty.onRunStart(this.time.now);
    this.scoreManager.onRunStart(startRow, this.time.now);
    this.adManager.onRunStart();
    this.adManager.gameplayStart();
    this.audioManager.startHum();

    this.inputManager.reset();

    // Emit to UI
    this.events.emit('run-start');

    // Center camera
    this.updateCamera();
  }

  private renderRows(fromRow: number, toRow: number): void {
    for (let r = fromRow; r <= toRow; r++) {
      const rowData = this.pathGen.getRow(r);
      if (!rowData) continue;
      this.renderRow(rowData);
    }
  }

  private renderRow(rowData: RowData): void {
    const r = rowData.rowIndex;
    for (let c = 0; c < GRID_COLS; c++) {
      const key = `${c},${r}`;
      if (this.tiles.has(key)) continue;

      const td = rowData.tiles[c];
      if (!td || !td.exists) continue;

      const tile = new Tile(
        this, c, r, td.timedCollapse,
        this.difficulty.getParams().tileStabilityTime
      );
      tile.setPosition(c * TILE_DRAW_W + 1, r * TILE_DRAW_H);
      this.worldContainer.add(tile);
      this.tiles.set(key, tile);
    }

    if (rowData.hasObstacle) {
      if (!this.obstacles.has(r)) {
        const obs = new Obstacle(this, rowData.obstacleCol, r,
          rowData.obstacleRange[0], rowData.obstacleRange[1]);
        obs.setPosition(rowData.obstacleCol * TILE_DRAW_W, r * TILE_DRAW_H);
        this.worldContainer.add(obs);
        this.obstacles.set(r, obs);
      }
    }
  }

  update(time: number, delta: number): void {
    if (!this.running) return;

    this.inputManager.update();
    const dir = this.inputManager.getDirection();

    // Hold-to-move: continuous lateral movement
    if (dir !== 0) {
      this.player.holdDirection(dir, delta);
    }

    // Forward movement with adaptive speed
    const elapsed = time - this.runStartTime;
    const speed = this.difficulty.getSpeedForTime(elapsed);
    this.player.updatePosition(delta, speed);

    // Generate more path ahead
    const playerRow = this.player.getCurrentRow();
    const aheadRow = playerRow + LOOK_AHEAD_ROWS;
    this.pathGen.generate(aheadRow);
    this.pathGen.setParams(this.difficulty.getParams());

    // Render new rows
    this.renderRows(playerRow - 2, aheadRow);

    // Collapse tiles behind player
    this.collapseRow = playerRow - LOOK_BEHIND_ROWS;
    this.collapseBehind();

    // Update all tiles
    for (const tile of this.tiles.values()) {
      tile.update(time, delta);

      // Trigger timed collapse for tiles near player
      if (tile.timedCollapse && tile.state === TileState.STABLE) {
        const dist = Math.abs(tile.row - this.player.gridRow);
        if (dist < 3) {
          tile.triggerTimedCollapse();
        }
      }

      // Depth fade: tiles far ahead are slightly darker
      if (tile.state === TileState.STABLE) {
        const distAhead = tile.row - this.player.gridRow;
        if (distAhead > 20) {
          tile.setAlpha(0.5 + 0.5 * (1 - Math.min(1, (distAhead - 20) / 25)));
        } else {
          tile.setAlpha(1);
        }
      }
    }

    // Update obstacles
    for (const [row, obs] of this.obstacles) {
      obs.update(time, delta);
      if (row < this.collapseRow - 5) {
        obs.destroy();
        this.obstacles.delete(row);
      }
    }

    // Collision check
    const col = this.player.getCurrentCol();
    const row = this.player.getCurrentRow();
    const tileKey = `${col},${row}`;
    const currentTile = this.tiles.get(tileKey);

    const onSafeTile = currentTile && currentTile.isWalkable();

    if (onSafeTile) {
      this.lastSafeCol = col;
      this.lastSafeRow = row;
    }

    // Check obstacle collision
    const obs = this.obstacles.get(row);
    if (obs && obs.occupiesCol(col)) {
      this.die();
      return;
    }

    // Check if player fell off
    if (!onSafeTile) {
      // Give a tiny grace — check adjacent tile too
      const adjKey1 = `${col},${row - 1}`;
      const adjKey2 = `${col},${row + 1}`;
      const adj1 = this.tiles.get(adjKey1);
      const adj2 = this.tiles.get(adjKey2);
      const fracRow = this.player.gridRow - Math.floor(this.player.gridRow);

      if (fracRow < 0.3 && adj1 && adj1.isWalkable()) {
        // Still on previous row
      } else if (fracRow > 0.7 && adj2 && adj2.isWalkable()) {
        // Already on next row
      } else {
        this.die();
        return;
      }
    }

    // Near miss detection — check if adjacent tiles are gaps
    const leftKey = `${col - 1},${row}`;
    const rightKey = `${col + 1},${row}`;
    const leftTile = this.tiles.get(leftKey);
    const rightTile = this.tiles.get(rightKey);
    if ((!leftTile || !leftTile.isWalkable()) && (!rightTile || !rightTile.isWalkable())) {
      if (onSafeTile) {
        this.cameras.main.shake(50, 0.003);
      }
    }

    // Score
    this.scoreManager.update(this.player.gridRow, time);
    this.events.emit('score-update', this.scoreManager.score, this.scoreManager.multiplier, this.scoreManager.highScore);

    // Camera follow
    this.updateCamera();

    // Clean up far-behind tiles
    this.cleanupOldTiles();
  }

  private collapseBehind(): void {
    for (const [key, tile] of this.tiles) {
      if (tile.row <= this.collapseRow && tile.state === TileState.STABLE) {
        tile.startCracking();
        this.audioManager.playCrack();

        // Spawn debris particles
        this.spawnDebris(tile.x, tile.y);
      }
    }
  }

  private spawnDebris(worldX: number, worldY: number): void {
    if (!this.textures.exists('debris_particle')) return;
    const particles = this.add.particles(worldX, worldY, 'debris_particle', {
      speed: { min: 30, max: 80 },
      angle: { min: 0, max: 360 },
      alpha: { start: 0.8, end: 0 },
      scale: { start: 0.8, end: 0.1 },
      lifespan: 500,
      quantity: 4,
      emitting: false,
    });
    this.worldContainer.add(particles);
    particles.explode(4);
    this.time.delayedCall(600, () => particles.destroy());
  }

  private cleanupOldTiles(): void {
    const cutoff = this.collapseRow - 10;
    for (const [key, tile] of this.tiles) {
      if (tile.row < cutoff) {
        tile.destroy();
        this.tiles.delete(key);
      }
    }
    this.pathGen.recycle(cutoff);
  }

  private updateCamera(): void {
    const cam = this.cameras.main;
    // Center the path horizontally
    const pathPixelWidth = GRID_COLS * TILE_DRAW_W;
    const targetX = (cam.width - pathPixelWidth) / 2;
    // Player at ~35% from top of screen
    const targetY = -(this.player.gridRow * TILE_DRAW_H) + cam.height * 0.35;

    // Smooth camera with slight lag
    this.worldContainer.y = Phaser.Math.Linear(
      this.worldContainer.y,
      targetY,
      0.08
    );
    this.worldContainer.x = Phaser.Math.Linear(
      this.worldContainer.x,
      targetX,
      0.1
    );
  }

  private async die(): Promise<void> {
    if (this.dead) return;
    this.dead = true;
    this.running = false;

    this.audioManager.playFall();
    this.audioManager.stopHum();
    this.adManager.gameplayStop();

    this.cameras.main.shake(200, 0.01);
    await this.player.playFallAnimation();

    this.difficulty.onRunEnd(this.time.now);
    this.scoreManager.onRunEnd();
    this.adManager.onDeath();

    const canRevive = this.adManager.canRevive();
    const shouldShowAd = this.adManager.shouldShowInterstitial();

    this.events.emit('player-died', {
      score: this.scoreManager.score,
      highScore: this.scoreManager.highScore,
      canRevive,
    });

    if (shouldShowAd) {
      await this.adManager.showInterstitial();
    }
  }

  async revive(): Promise<void> {
    const success = await this.adManager.showRewardedAd();
    if (success) {
      this.audioManager.playRevive();
      this.player.revive(this.lastSafeCol, this.lastSafeRow + 2);
      this.running = true;
      this.dead = false;
      this.adManager.gameplayStart();
      this.audioManager.startHum();
      this.events.emit('run-start');
    }
  }

  restart(): void {
    this.startRun();
  }
}
