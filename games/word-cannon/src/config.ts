// ── Game Configuration ──

export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;

// Cannon (stationary, bottom center)
export const CANNON_Y_OFFSET = 50; // from bottom

// Enemies
export const ENEMY_BASE_SPEED = 40; // px/sec downward
export const ENEMY_SPEED_RAMP = 0.03; // per second of playtime
export const ENEMY_MAX_SPEED = 120;
export const ENEMY_SPAWN_INTERVAL_BASE = 2000; // ms
export const ENEMY_SPAWN_INTERVAL_MIN = 600;
export const ENEMY_SPAWN_RAMP = 1; // ms reduction per second of playtime
export const ENEMY_PADDING = 80; // px from edges
export const ENEMY_SIZE_BASE = 32; // font size base

// Scoring
export const SCORE_PER_LETTER = 10;
export const COMBO_BONUS_MULTIPLIER = 0.5; // bonus per combo level
export const COMBO_TIMEOUT = 3000; // ms before combo resets
export const COMBO_MAX = 20;

// Health
export const HEALTH_MAX = 4;

// Warm-up: first N enemies per level spawn slower
export const WARMUP_ENEMY_COUNT = 3;
export const WARMUP_SPEED_MULT = 0.7;

// Difficulty phases (seconds into run)
export const PHASE_TIMES = [0, 30, 60, 90, 120, 180];
export const PHASE_WORD_LENGTHS: [number, number][] = [
  [1, 3],   // phase 0: single letters / short words
  [2, 4],   // phase 1
  [3, 5],   // phase 2
  [4, 6],   // phase 3
  [4, 7],   // phase 4
  [5, 8],   // phase 5
];

// Special enemies
export const DEBUFF_CHANCE = 0.12;
export const POWERUP_CHANCE = 0.10;

// Debuff durations (ms)
export const DEBUFF_RUSH_DURATION = 4000;

// Powerup durations (ms)
export const POWERUP_FREEZE_DURATION = 4000;

// Particles
export const PARTICLE_COUNT_KILL = 14;
export const PARTICLE_COUNT_HIT = 8;

// Ads
export const AD_INTERSTITIAL_EVERY_N_DEATHS = 2;

// Colors
export const COLOR_BG = '#06060f';
export const COLOR_ENEMY_NORMAL = '#4488ff';
export const COLOR_ENEMY_DEBUFF = '#ff3344';
export const COLOR_ENEMY_POWERUP = '#ffcc00';
export const COLOR_CANNON = '#00ffaa';
export const COLOR_TYPED = '#ffffff';
export const COLOR_UNTYPED = 'rgba(255,255,255,0.4)';
export const COLOR_HUD = '#ffffff';
export const COLOR_COMBO = '#ffcc00';
export const COLOR_HEALTH = '#ff4466';
export const COLOR_HEALTH_FULL = '#00ff88';
