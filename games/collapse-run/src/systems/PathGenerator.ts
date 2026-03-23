import { GRID_COLS } from '../config';
import { DifficultyParams, PatternType, TileData } from '../types';

function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export interface RowData {
  rowIndex: number;
  tiles: TileData[];
  hasObstacle: boolean;
  obstacleCol: number;
  obstacleRange: [number, number];
}

export class PathGenerator {
  private rng: () => number;
  private rows: Map<number, RowData> = new Map();
  private generatedUpTo = -1;
  private currentPattern: PatternType = PatternType.STRAIGHT;
  private patternRowsLeft = 0;
  private pathCenter: number;
  private pathWidth: number;
  private zigzagDir = 1;
  private params: DifficultyParams;
  private forceSafe = false;
  private safeRowsLeft = 0;

  private safeStartRows = 15;

  constructor(seed: number, params: DifficultyParams) {
    this.rng = mulberry32(seed);
    this.params = { ...params };
    this.pathCenter = Math.floor(GRID_COLS / 2);
    this.pathWidth = params.pathWidthMax;
  }

  setParams(params: DifficultyParams): void {
    this.params = { ...params };
  }

  injectSafeSegment(): void {
    this.forceSafe = true;
    this.safeRowsLeft = 40;
  }

  generate(upToRow: number): void {
    while (this.generatedUpTo < upToRow) {
      this.generatedUpTo++;
      const row = this.generateRow(this.generatedUpTo);
      this.rows.set(this.generatedUpTo, row);
    }
  }

  recycle(behindRow: number): void {
    for (const key of this.rows.keys()) {
      if (key < behindRow) {
        this.rows.delete(key);
      }
    }
  }

  getRow(rowIndex: number): RowData | undefined {
    return this.rows.get(rowIndex);
  }

  private generateRow(rowIndex: number): RowData {
    // First rows are always fully safe
    if (rowIndex < this.safeStartRows) {
      return this.makeSafeRow(rowIndex);
    }

    if (this.patternRowsLeft <= 0) {
      this.selectNextPattern();
    }
    this.patternRowsLeft--;

    if (this.forceSafe && this.safeRowsLeft > 0) {
      this.safeRowsLeft--;
      if (this.safeRowsLeft <= 0) this.forceSafe = false;
      return this.makeSafeRow(rowIndex);
    }

    const tiles: TileData[] = [];
    const halfW = Math.floor(this.pathWidth / 2);
    const leftEdge = Math.max(0, this.pathCenter - halfW);
    const rightEdge = Math.min(GRID_COLS - 1, this.pathCenter + halfW);

    for (let col = 0; col < GRID_COLS; col++) {
      if (col < leftEdge || col > rightEdge) {
        tiles.push({ exists: false, timedCollapse: false });
      } else {
        const isGap = this.rng() < this.params.gapFrequency;
        const isTimedCollapse = !isGap && this.rng() < 0.08;
        tiles.push({ exists: !isGap, timedCollapse: isTimedCollapse });
      }
    }

    // Ensure at least one valid tile in the path
    const anyExists = tiles.some((t, i) => i >= leftEdge && i <= rightEdge && t.exists);
    if (!anyExists) {
      const mid = Math.floor((leftEdge + rightEdge) / 2);
      tiles[mid] = { exists: true, timedCollapse: false };
      if (mid > leftEdge) tiles[mid - 1] = { exists: true, timedCollapse: false };
      if (mid < rightEdge) tiles[mid + 1] = { exists: true, timedCollapse: false };
    }

    // Apply pattern adjustments
    this.applyPattern();

    // Obstacle
    let hasObstacle = false;
    let obstacleCol = 0;
    let obstacleRange: [number, number] = [0, 0];
    if (this.rng() < this.params.obstacleDensity && !this.forceSafe) {
      hasObstacle = true;
      obstacleCol = leftEdge + Math.floor(this.rng() * (rightEdge - leftEdge + 1));
      obstacleRange = [leftEdge, rightEdge];
    }

    return { rowIndex, tiles, hasObstacle, obstacleCol, obstacleRange };
  }

  private makeSafeRow(rowIndex: number): RowData {
    const tiles: TileData[] = [];
    for (let col = 0; col < GRID_COLS; col++) {
      const halfW = 3;
      const left = Math.max(0, this.pathCenter - halfW);
      const right = Math.min(GRID_COLS - 1, this.pathCenter + halfW);
      tiles.push({ exists: col >= left && col <= right, timedCollapse: false });
    }
    return { rowIndex, tiles, hasObstacle: false, obstacleCol: 0, obstacleRange: [0, 0] };
  }

  private selectNextPattern(): void {
    const r = this.rng();
    if (r < 0.3) {
      this.currentPattern = PatternType.STRAIGHT;
      this.patternRowsLeft = 10 + Math.floor(this.rng() * 15);
    } else if (r < 0.55) {
      this.currentPattern = PatternType.ZIGZAG;
      this.patternRowsLeft = 8 + Math.floor(this.rng() * 12);
      this.zigzagDir = this.rng() < 0.5 ? -1 : 1;
    } else if (r < 0.75) {
      this.currentPattern = PatternType.NARROW_CORRIDOR;
      this.patternRowsLeft = 6 + Math.floor(this.rng() * 8);
    } else if (r < 0.9) {
      this.currentPattern = PatternType.WIDE_SAFE;
      this.patternRowsLeft = 5 + Math.floor(this.rng() * 8);
    } else {
      this.currentPattern = PatternType.SPLIT_MERGE;
      this.patternRowsLeft = 8 + Math.floor(this.rng() * 10);
    }
  }

  private applyPattern(): void {
    switch (this.currentPattern) {
      case PatternType.ZIGZAG:
        this.pathCenter += this.zigzagDir;
        if (this.pathCenter >= GRID_COLS - 2) this.zigzagDir = -1;
        if (this.pathCenter <= 1) this.zigzagDir = 1;
        break;
      case PatternType.NARROW_CORRIDOR:
        this.pathWidth = Math.max(this.params.pathWidthMin, 3);
        return;
      case PatternType.WIDE_SAFE:
        this.pathWidth = Math.min(GRID_COLS, this.params.pathWidthMax);
        break;
      case PatternType.SPLIT_MERGE:
        if (this.patternRowsLeft % 4 === 0) {
          this.pathCenter += (this.rng() < 0.5 ? -1 : 1);
          this.pathCenter = Math.max(2, Math.min(GRID_COLS - 3, this.pathCenter));
        }
        break;
      default:
        break;
    }

    // Gradually adjust path width toward current pattern's target
    const targetWidth = Math.floor(this.params.pathWidthMin + (this.params.pathWidthMax - this.params.pathWidthMin) * 0.6);

    if (this.pathWidth < targetWidth) this.pathWidth++;
    else if (this.pathWidth > targetWidth) this.pathWidth--;

    this.pathWidth = Math.max(2, Math.min(GRID_COLS, this.pathWidth));
  }
}
