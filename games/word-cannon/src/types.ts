export type EnemyType = 'normal' | 'debuff' | 'powerup' | 'tank' | 'boss' | 'splitter';

export type InputMode = 'keyboard' | 'fragments';

export interface FragmentConfig {
  minSize: number;
  maxSize: number;
  preferSize: number;
  syllableAware: boolean;
}

export interface Fragment {
  id: number;
  text: string;
  enemyId: number;
  segmentIndex: number;  // which chunk within the word (0, 1, 2...)
  slotIndex: number;     // stable grid position
  active: boolean;
  fadeOut: number;        // 0 = visible, >0 = timestamp when fade started
}

export type DebuffKind = 'rush';
export type PowerupKind = 'freeze' | 'shield' | 'heal';

export interface Enemy {
  id: number;
  word: string;
  typed: number;
  x: number;
  y: number;
  speed: number;
  type: EnemyType;
  debuffKind?: DebuffKind;
  powerupKind?: PowerupKind;
  alpha: number;
  scale: number;
  active: boolean;
  targeted: boolean;
  width: number;
  height: number;
  spawnTime: number;
  // HP / segment system
  wordSegments: string[];
  currentSegment: number;
  maxSegments: number;
  sizeScale: number;
  splitOnDeath: boolean;
  splitWordLen: number;
  bottomPauseUntil?: number;
  savedSpeed?: number;
  autoTyped: number; // letters removed by missiles (faded out, not targetable)
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface CritSlash {
  x: number;
  y: number;
  spawnTime: number;
  duration: number;
  angle: number;
}

export interface ActiveDebuff {
  kind: DebuffKind;
  endsAt: number;
}

export interface ActivePowerup {
  kind: PowerupKind;
  endsAt: number;
}

export interface Bullet {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  speed: number;
  progress: number;
  color: string;
}

// ── Visual Effects ──

export interface Explosion {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
  color: string;
}

export interface LightningArc {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  life: number;
  maxLife: number;
  segments: { x: number; y: number }[];
}

export interface Missile {
  x: number;
  y: number;
  targetId: number;
  speed: number;
  trail: { x: number; y: number }[];
  life: number;
  orbitAngle: number;
  orbitCenterX: number;
  orbitCenterY: number;
  lastHitId?: number;
}

export interface DamageNumber {
  x: number;
  y: number;
  text: string;
  color: string;
  vy: number;
  life: number;
  maxLife: number;
}

// ── Upgrades ──

export type UpgradeCategory = 'weapon' | 'defense' | 'risk' | 'typing';

export interface UpgradeDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: UpgradeCategory;
  maxStacks: number;
  color: string;
  levelDescriptions: string[];
}

// ── Persistence ──

export interface RunRecord {
  ts: number;
  score: number;
  level: number;
  wpm: number;
  accuracy: number;
  longestCombo: number;
  wordsKilled: number;
  duration: number;
}

export interface PlayerProfile {
  version: 1;
  runs: RunRecord[];
  highScore: number;
  highLevel: number;
  highWpm: number;
  highAccuracy: number;
  highCombo: number;
  totalWordsKilled: number;
  totalLettersTyped: number;
  totalPlaytime: number;
  titles: string[];
  currentTitle: string;
  streakDays: number;
  lastPlayDate: string;
  letterStats: Record<string, { correct: number; total: number }>;
  bestRunPace: { time: number; score: number }[];
}

export function createDefaultProfile(): PlayerProfile {
  return {
    version: 1,
    runs: [],
    highScore: 0,
    highLevel: 0,
    highWpm: 0,
    highAccuracy: 0,
    highCombo: 0,
    totalWordsKilled: 0,
    totalLettersTyped: 0,
    totalPlaytime: 0,
    titles: ['rookie'],
    currentTitle: 'rookie',
    streakDays: 0,
    lastPlayDate: '',
    letterStats: {},
    bestRunPace: [],
  };
}
