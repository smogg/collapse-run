export enum TileState {
  STABLE,
  CRACKING,
  FALLING,
  GONE,
}

export enum PatternType {
  STRAIGHT,
  ZIGZAG,
  SPLIT_MERGE,
  WIDE_SAFE,
  NARROW_CORRIDOR,
}

export enum ModifierType {
  SPEED_BURST,
  UNSTABLE_TILES,
  LOW_GRAVITY,
}

export interface DifficultyParams {
  speed: number;
  gapFrequency: number;
  obstacleDensity: number;
  tileStabilityTime: number;
  pathWidthMin: number;
  pathWidthMax: number;
}

export interface RunMetrics {
  runDuration: number;
  deathsLast5: number[];
  inputSamples: number[];
}

export interface TileData {
  exists: boolean;
  timedCollapse: boolean;
}
