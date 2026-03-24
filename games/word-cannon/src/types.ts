export type EnemyType = 'normal' | 'debuff' | 'powerup';

export type DebuffKind = 'blur' | 'scramble' | 'rush';
export type PowerupKind = 'chain' | 'freeze' | 'shield';

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
