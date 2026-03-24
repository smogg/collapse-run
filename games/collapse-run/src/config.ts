export const GRID_COLS = 7;
export const TILE_SIZE = 64;
export const Y_SCALE = 0.55;
export const TILE_DRAW_W = TILE_SIZE;
export const TILE_DRAW_H = TILE_SIZE * Y_SCALE;

export const BASE_SPEED = 180;
export const LOOK_AHEAD_ROWS = 50;
export const LOOK_BEHIND_ROWS = 6;

export const COLORS = {
  BG: 0x111111,
  PLAYER_TOP: 0x00ffaa,
  PLAYER_SIDE_L: 0x00cc88,
  PLAYER_SIDE_R: 0x009966,
  PLAYER_GLOW: 0x00ffaa,
  TILE_STABLE: 0xcccccc,
  TILE_STABLE_SIDE: 0x999999,
  TILE_CRACKING: 0xffaa00,
  TILE_CRACKING_SIDE: 0xcc8800,
  OBSTACLE: 0xff4444,
  OBSTACLE_SIDE: 0xcc2222,
  TEXT: 0xffffff,
  SCORE: 0x00ffaa,
};

export const CUBE_HEIGHT = 18;

export const CRACK_WARN_MS = 300;

export const DIFFICULTY_DEFAULTS = {
  speed: BASE_SPEED,
  gapFrequency: 0.15,
  obstacleDensity: 0.05,
  tileStabilityTime: 2000,
  pathWidthMin: 4,
  pathWidthMax: 7,
};

export const MODIFIER_INTERVAL_MIN = 20000;
export const MODIFIER_INTERVAL_MAX = 40000;
export const MODIFIER_DURATION_MIN = 5000;
export const MODIFIER_DURATION_MAX = 8000;

export const MULTIPLIER_INTERVAL = 15000;
export const INTERSTITIAL_EVERY_N_DEATHS = 2;
