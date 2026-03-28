import { Enemy, Particle, Bullet, ActiveDebuff, ActivePowerup, EnemyType, DebuffKind, PowerupKind, PlayerProfile, RunRecord, createDefaultProfile } from './types';
import { Renderer } from './systems/Renderer';
import { AudioManager } from './systems/AudioManager';
import { AdManager } from './systems/AdManager';
import { getRandomWord, getDebuffWord, getPowerupWord } from './data/words';
import * as C from './config';

type GameState = 'title' | 'playing' | 'dead' | 'ad' | 'levelComplete';

export interface LevelDef {
  level: number;
  wordsToKill: number;
  minWordLen: number;
  maxWordLen: number;
  baseSpeed: number;
  maxSpeed: number;
  spawnInterval: number;
  debuffsEnabled: boolean;
  powerupsEnabled: boolean;
}

export interface RunStats {
  score: number;
  wordsKilled: number;
  lettersTyped: number;
  correctKeys: number;
  totalKeys: number;
  longestCombo: number;
  wpm: number;
  level: number;
}

interface TitleDef {
  slug: string;
  label: string;
  check: (p: PlayerProfile) => boolean;
}

// Ordered weakest→strongest. Last matching = current title.
const TITLES: TitleDef[] = [
  { slug: 'rookie',        label: 'RECRUIT',        check: () => true },
  { slug: 'gunner',        label: 'GUNNER',         check: p => p.totalWordsKilled >= 50 },
  { slug: 'sharpshooter',  label: 'SHARPSHOOTER',   check: p => p.highAccuracy >= 95 },
  { slug: 'speedster',     label: 'SPEEDSTER',      check: p => p.highWpm >= 60 },
  { slug: 'marathoner',    label: 'MARATHONER',     check: p => p.highLevel >= 10 },
  { slug: 'perfectionist', label: 'PERFECTIONIST',  check: p => p.runs.some(r => r.accuracy === 100 && r.wordsKilled >= 20) },
  { slug: 'veteran',       label: 'VETERAN',        check: p => p.runs.length >= 50 },
  { slug: 'dedicated',     label: 'DEDICATED',      check: p => p.streakDays >= 7 },
  { slug: 'machine',       label: 'MACHINE',        check: p => p.totalLettersTyped >= 10000 },
  { slug: 'apex',          label: 'APEX TYPIST',    check: p => p.highWpm >= 80 && p.highAccuracy >= 90 && p.highLevel >= 8 },
  { slug: 'legend',        label: 'LEGEND',         check: p => p.highLevel >= 15 && p.highWpm >= 70 },
];

export function getLevelDef(level: number): LevelDef {
  const l = level - 1;
  return {
    level,
    wordsToKill: 8 + l * 3,
    minWordLen: Math.min(1 + Math.floor(l / 3), 5),
    maxWordLen: Math.min(3 + Math.floor(l * 0.7), 9),
    baseSpeed: 35 + l * 1,
    maxSpeed: 80 + l * 2,
    spawnInterval: Math.max(1200, 2000 - l * 20),
    debuffsEnabled: level >= 4,
    powerupsEnabled: level >= 3,
  };
}

const PROFILE_KEY = 'wordcannon_profile';
const MAX_RUNS = 100;
const PACE_SAMPLE_INTERVAL = 5; // seconds

export class Game {
  private renderer: Renderer;
  private audio: AudioManager;
  private adManager: AdManager;

  private state: GameState = 'title';
  private showStatsModal = false;
  private enemies: Enemy[] = [];
  private particles: Particle[] = [];
  private bullets: Bullet[] = [];
  private debuffs: ActiveDebuff[] = [];
  private powerups: ActivePowerup[] = [];

  // Player state
  private health = C.HEALTH_MAX;
  private shields = 0; // permanent shield charges
  private score = 0;
  private combo = 0;
  private longestCombo = 0;
  private lastKillTime = 0;
  private wordsKilled = 0;
  private lettersTyped = 0;
  private correctKeys = 0;
  private totalKeys = 0;
  private typedBuffer = '';

  // Per-run letter tracking
  private runLetterStats: Record<string, { correct: number; total: number }> = {};

  // Level
  private level = 1;
  private levelDef: LevelDef = getLevelDef(1);
  private levelWordsKilled = 0;
  private levelEnemiesSpawned = 0;

  // Targeting
  private targetEnemy: Enemy | null = null;

  // Timing
  private runStartTime = 0;
  private lastSpawnTime = 0;
  private runElapsed = 0;
  private wpm = 0;
  private nextEnemyId = 0;

  // Shake
  private shakeIntensity = 0;
  private shakeDuration = 0;
  private shakeStart = 0;

  // Screen flash
  private flashColor = '';
  private flashAlpha = 0;

  // Stats
  private lastStats: RunStats | null = null;
  private newTitleThisRun: string | null = null;
  private runNemesisLetter: string | null = null;

  // Pace tracking
  private paceData: { time: number; score: number }[] = [];
  private lastPaceSample = 0;
  private pbDelta: number | null = null;

  // Profile
  profile: PlayerProfile;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new Renderer(canvas);
    this.audio = new AudioManager();
    this.adManager = new AdManager();

    this.profile = this.loadProfile();
    this.setupInput();
    this.adManager.init();
  }

  private loadProfile(): PlayerProfile {
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      if (raw) {
        const p = JSON.parse(raw) as PlayerProfile;
        if (p.version === 1) {
          // Ensure new fields exist for older saves
          if (!p.letterStats) p.letterStats = {};
          if (!p.bestRunPace) p.bestRunPace = [];
          return p;
        }
      }
    } catch { /* corrupt data */ }

    // Migrate from old high score key
    const profile = createDefaultProfile();
    const oldHs = localStorage.getItem('wordcannon_highscore');
    if (oldHs) {
      profile.highScore = parseInt(oldHs, 10) || 0;
      localStorage.removeItem('wordcannon_highscore');
    }
    return profile;
  }

  private saveProfile(): void {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(this.profile));
  }

  private saveRun(): void {
    const p = this.profile;
    const accuracy = this.totalKeys > 0 ? Math.round((this.correctKeys / this.totalKeys) * 100) : 100;
    const duration = this.runElapsed;

    const record: RunRecord = {
      ts: Date.now(),
      score: this.score,
      level: this.level,
      wpm: this.wpm,
      accuracy,
      longestCombo: this.longestCombo,
      wordsKilled: this.wordsKilled,
      duration,
    };

    p.runs.push(record);
    if (p.runs.length > MAX_RUNS) p.runs.shift();

    // Update highs
    if (this.score > p.highScore) p.highScore = this.score;
    if (this.level > p.highLevel) p.highLevel = this.level;
    if (this.wpm > p.highWpm) p.highWpm = this.wpm;
    if (accuracy > p.highAccuracy) p.highAccuracy = accuracy;
    if (this.longestCombo > p.highCombo) p.highCombo = this.longestCombo;

    // Totals
    p.totalWordsKilled += this.wordsKilled;
    p.totalLettersTyped += this.lettersTyped;
    p.totalPlaytime += duration;

    // Merge letter stats
    for (const [letter, stats] of Object.entries(this.runLetterStats)) {
      if (!p.letterStats[letter]) p.letterStats[letter] = { correct: 0, total: 0 };
      p.letterStats[letter].correct += stats.correct;
      p.letterStats[letter].total += stats.total;
    }

    // Best run pace
    if (this.score >= p.highScore && this.paceData.length > 0) {
      p.bestRunPace = [...this.paceData];
    }

    // Streak
    const today = new Date().toISOString().slice(0, 10);
    if (p.lastPlayDate !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      if (p.lastPlayDate === yesterday) {
        p.streakDays++;
      } else if (p.lastPlayDate !== '') {
        p.streakDays = 1;
      } else {
        p.streakDays = 1;
      }
      p.lastPlayDate = today;
    }

    // Titles
    this.newTitleThisRun = null;
    const oldTitles = new Set(p.titles);
    let bestTitle = p.currentTitle;

    for (const t of TITLES) {
      if (t.check(p)) {
        if (!oldTitles.has(t.slug)) {
          p.titles.push(t.slug);
          this.newTitleThisRun = t.label;
        }
        bestTitle = t.slug;
      }
    }
    p.currentTitle = bestTitle;

    // Find nemesis letter this run
    this.runNemesisLetter = null;
    let worstAcc = 1;
    for (const [letter, stats] of Object.entries(this.runLetterStats)) {
      if (stats.total >= 3) {
        const acc = stats.correct / stats.total;
        if (acc < worstAcc) {
          worstAcc = acc;
          this.runNemesisLetter = letter;
        }
      }
    }
    if (worstAcc >= 0.8) this.runNemesisLetter = null; // only show if genuinely bad

    this.saveProfile();
  }

  private setupInput(): void {
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;

      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) {
        e.preventDefault();
      }

      if (this.state === 'title') {
        if (this.showStatsModal) { this.showStatsModal = false; return; }
        this.startRun();
        return;
      }

      if (this.state === 'dead' || this.state === 'levelComplete') {
        if (e.key === 'Enter' || e.key === ' ') {
          if (this.state === 'levelComplete') {
            this.startNextLevel();
          } else {
            this.restart();
          }
        }
        // 'w' key to watch ad on level complete
        if (this.state === 'levelComplete' && (e.key === 'w' || e.key === 'W')) {
          this.watchLevelRewardAd();
        }
        return;
      }

      if (this.state === 'playing') {
        if (e.key === 'Escape') {
          this.audio.toggleMute();
          return;
        }

        const key = e.key.toUpperCase();
        if (key.length === 1 && key >= 'A' && key <= 'Z') {
          this.handleTyping(key);
        }

        if (e.key === 'Backspace') {
          e.preventDefault();
          this.typedBuffer = '';
          if (this.targetEnemy) {
            this.targetEnemy.targeted = false;
            this.targetEnemy.typed = 0;
            this.targetEnemy = null;
          }
        }
      }
    });

    this.renderer.canvas.addEventListener('pointerdown', (e) => {
      if (this.state === 'title') {
        if (this.showStatsModal) { this.showStatsModal = false; return; }
        // Check stats icon click
        const pos = this.renderer.screenToGame(e.clientX, e.clientY);
        const b = this.renderer.statsIconBounds;
        if (b && pos.x >= b.x && pos.x <= b.x + b.w && pos.y >= b.y && pos.y <= b.y + b.h) {
          this.showStatsModal = true;
          return;
        }
        this.startRun();
        return;
      }
      if (this.state === 'levelComplete') {
        const pos = this.renderer.screenToGame(e.clientX, e.clientY);
        const cx = this.renderer.w / 2;
        // Check if clicked the ad button area (roughly centered, y around 0.72)
        const btnY = this.renderer.h * 0.72;
        if (pos.x > cx - 140 && pos.x < cx + 140 && pos.y > btnY - 22 && pos.y < btnY + 22) {
          this.watchLevelRewardAd();
          return;
        }
        this.startNextLevel();
        return;
      }
      if (this.state === 'dead') {
        const pos = this.renderer.screenToGame(e.clientX, e.clientY);
        const cx = this.renderer.w / 2;
        if (this.adManager.canRevive()) {
          const btnY = this.renderer.h * 0.55;
          if (pos.x > cx - 140 && pos.x < cx + 140 && pos.y > btnY - 22 && pos.y < btnY + 22) {
            this.revive();
            return;
          }
        }
        this.restart();
      }
    });
  }

  private handleTyping(key: string): void {
    this.audio.playType();
    this.lettersTyped++;
    this.totalKeys++;

    // Track letter attempt
    if (!this.runLetterStats[key]) this.runLetterStats[key] = { correct: 0, total: 0 };
    this.runLetterStats[key].total++;

    if (this.targetEnemy && this.targetEnemy.active) {
      const nextChar = this.targetEnemy.word[this.targetEnemy.typed];
      if (nextChar === key) {
        this.correctKeys++;
        this.runLetterStats[key].correct++;
        this.targetEnemy.typed++;
        this.typedBuffer += key;
        this.fireBullet(this.targetEnemy);

        if (this.targetEnemy.typed >= this.targetEnemy.word.length) {
          this.killEnemy(this.targetEnemy);
        }
        return;
      } else {
        this.targetEnemy.typed = 0;
        this.targetEnemy.targeted = false;
        this.targetEnemy = null;
        this.typedBuffer = '';
        this.combo = 0;
      }
    }

    this.typedBuffer = key;
    const candidates = this.enemies
      .filter(e => e.active && !e.targeted && e.word[0] === key)
      .sort((a, b) => b.y - a.y);

    if (candidates.length > 0) {
      this.correctKeys++;
      this.runLetterStats[key].correct++;
      this.targetEnemy = candidates[0];
      this.targetEnemy.targeted = true;
      this.targetEnemy.typed = 1;
      this.fireBullet(this.targetEnemy);

      if (this.targetEnemy.word.length === 1) {
        this.killEnemy(this.targetEnemy);
      }
    } else {
      this.typedBuffer = '';
    }
  }

  private fireBullet(target: Enemy): void {
    const cx = this.renderer.w / 2;
    const cy = this.renderer.h - C.CANNON_Y_OFFSET;
    this.bullets.push({
      x: cx, y: cy,
      targetX: target.x, targetY: target.y,
      speed: 2200, progress: 0,
      color: target.type === 'debuff' ? C.COLOR_ENEMY_DEBUFF
        : target.type === 'powerup' ? C.COLOR_ENEMY_POWERUP
        : C.COLOR_CANNON,
    });
  }

  private killEnemy(enemy: Enemy): void {
    enemy.active = false;
    this.typedBuffer = '';
    this.targetEnemy = null;

    if (enemy.type === 'debuff') {
      this.applyDebuff(enemy.debuffKind!);
      this.audio.playDebuff();
      this.spawnParticles(enemy.x, enemy.y, C.COLOR_ENEMY_DEBUFF, 30);
      this.spawnParticles(enemy.x, enemy.y, '#ff8800', 10);
      this.flashScreen(C.COLOR_ENEMY_DEBUFF, 0.45);
      this.triggerShake(12, 500);
      this.combo = 0;
      return;
    }

    if (enemy.type === 'powerup') {
      this.applyPowerup(enemy.powerupKind!);
      this.audio.playPowerup();
      this.spawnParticles(enemy.x, enemy.y, C.COLOR_ENEMY_POWERUP, 28);
      this.spawnParticles(enemy.x, enemy.y, '#ffffff', 12);
      this.flashScreen(C.COLOR_ENEMY_POWERUP, 0.3);
      this.triggerShake(5, 200);
    } else {
      this.audio.playKill();
      this.spawnParticles(enemy.x, enemy.y, C.COLOR_ENEMY_NORMAL, C.PARTICLE_COUNT_KILL);
      this.flashScreen(C.COLOR_ENEMY_NORMAL, 0.08);
    }

    const wordLen = enemy.word.length;
    const comboMult = 1 + this.combo * C.COMBO_BONUS_MULTIPLIER;
    this.score += Math.round(wordLen * C.SCORE_PER_LETTER * comboMult);
    this.wordsKilled++;
    this.levelWordsKilled++;

    const now = performance.now();
    if (now - this.lastKillTime < C.COMBO_TIMEOUT) {
      this.combo = Math.min(this.combo + 1, C.COMBO_MAX);
      if (this.combo > 0 && this.combo % 5 === 0) this.audio.playCombo();
    } else {
      this.combo = 1;
    }
    this.lastKillTime = now;
    if (this.combo > this.longestCombo) this.longestCombo = this.combo;

    if (this.levelWordsKilled >= this.levelDef.wordsToKill) {
      this.completeLevel();
    }
  }

  private completeLevel(): void {
    this.lastStats = this.buildStats();
    this.state = 'levelComplete';
    this.enemies = [];
    this.bullets = [];
    this.particles = [];
    this.debuffs = [];
    this.powerups = [];
    this.targetEnemy = null;
    this.typedBuffer = '';
    this.adManager.gameplayStop();
    this.audio.playCombo();
  }

  private levelRewardClaimed = false;

  private async watchLevelRewardAd(): Promise<void> {
    if (this.levelRewardClaimed) return;
    this.state = 'ad';
    const success = await this.adManager.showRewardedAd();
    if (success) {
      this.levelRewardClaimed = true;
      // Reward: +1 max health for this run + full heal + 2 shields
      this.health = C.HEALTH_MAX;
      this.shields += 2;
    }
    this.state = 'levelComplete';
  }

  private startNextLevel(): void {
    this.level++;
    this.levelDef = getLevelDef(this.level);
    this.levelWordsKilled = 0;
    this.levelEnemiesSpawned = 0;
    this.health = C.HEALTH_MAX;
    this.state = 'playing';
    this.enemies = [];
    this.particles = [];
    this.bullets = [];
    this.debuffs = [];
    this.powerups = [];
    this.combo = 0;
    this.targetEnemy = null;
    this.typedBuffer = '';
    this.lastSpawnTime = 0;
    this.runStartTime = performance.now();
    this.lastPaceSample = 0;
    this.adManager.gameplayStart();
  }

  private buildStats(): RunStats {
    return {
      score: this.score,
      wordsKilled: this.wordsKilled,
      lettersTyped: this.lettersTyped,
      correctKeys: this.correctKeys,
      totalKeys: this.totalKeys,
      longestCombo: this.longestCombo,
      wpm: this.wpm,
      level: this.level,
    };
  }

  private flashScreen(color: string, alpha: number): void {
    this.flashColor = color;
    this.flashAlpha = alpha;
  }

  private applyDebuff(kind: DebuffKind): void {
    const now = performance.now();
    this.debuffs.push({ kind, endsAt: now + C.DEBUFF_RUSH_DURATION });
    this.triggerShake(10, 400);
  }

  private applyPowerup(kind: PowerupKind): void {
    if (kind === 'shield') {
      this.shields++;
      return;
    }
    if (kind === 'heal') {
      this.health = Math.min(this.health + 1, C.HEALTH_MAX);
      return;
    }
    const now = performance.now();
    this.powerups.push({ kind, endsAt: now + C.POWERUP_FREEZE_DURATION });
  }

  private hasDebuff(kind: DebuffKind): boolean {
    const now = performance.now();
    return this.debuffs.some(d => d.kind === kind && d.endsAt > now);
  }

  private hasPowerup(kind: PowerupKind): boolean {
    const now = performance.now();
    return this.powerups.some(p => p.kind === kind && p.endsAt > now);
  }

  private triggerShake(intensity: number, duration: number): void {
    this.shakeIntensity = intensity;
    this.shakeDuration = duration;
    this.shakeStart = performance.now();
  }

  private spawnParticles(x: number, y: number, color: string, count: number): void {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 80 + Math.random() * 200;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.5 + Math.random() * 0.4,
        maxLife: 0.5 + Math.random() * 0.4,
        color,
        size: 2 + Math.random() * 6,
      });
    }
  }

  private spawnEnemy(): void {
    const now = performance.now();
    const ld = this.levelDef;

    const roll = Math.random();
    let type: EnemyType = 'normal';
    let debuffKind: DebuffKind | undefined;
    let powerupKind: PowerupKind | undefined;
    let word: string;

    // Only spawn special enemies when the screen is busy enough for them to matter
    const activeOnScreen = this.enemies.filter(e => e.active).length;
    const enoughEnemies = activeOnScreen >= 3;

    if (roll < C.DEBUFF_CHANCE && ld.debuffsEnabled && enoughEnemies) {
      type = 'debuff';
      word = getDebuffWord();
      debuffKind = 'rush';
    } else if (roll < C.DEBUFF_CHANCE + C.POWERUP_CHANCE && ld.powerupsEnabled && enoughEnemies) {
      type = 'powerup';
      word = getPowerupWord();
      const pups: PowerupKind[] = ['freeze', 'shield'];
      if (this.level >= 5) pups.push('heal');
      powerupKind = pups[Math.floor(Math.random() * pups.length)];
    } else {
      word = getRandomWord(ld.minWordLen, ld.maxWordLen);
    }

    // For levels 1-10, strictly prevent duplicate first letters on screen
    const strictNoDupLetters = this.level <= 10;
    const activeFirstLetters = new Set(
      this.enemies.filter(e => e.active).map(e => e.word[0])
    );
    if (activeFirstLetters.has(word[0])) {
      if (type === 'normal') {
        for (let attempt = 0; attempt < 10; attempt++) {
          const alt = getRandomWord(ld.minWordLen, ld.maxWordLen);
          if (!activeFirstLetters.has(alt[0])) { word = alt; break; }
        }
      }
      // If still a duplicate and strict mode, skip this spawn entirely
      if (strictNoDupLetters && activeFirstLetters.has(word[0])) return;
    }

    const elapsed = (now - this.runStartTime) / 1000;
    const baseSpeed = ld.baseSpeed + elapsed * C.ENEMY_SPEED_RAMP;
    let speed = Math.min(baseSpeed, ld.maxSpeed);
    if (this.levelEnemiesSpawned < C.WARMUP_ENEMY_COUNT) speed *= C.WARMUP_SPEED_MULT;
    this.levelEnemiesSpawned++;
    const actualSpeed = this.hasPowerup('freeze') ? speed * 0.3 : speed;

    const estWidth = word.length * 20 + 36;
    const minX = C.ENEMY_PADDING + estWidth / 2;
    const maxX = this.renderer.w - C.ENEMY_PADDING - estWidth / 2;
    const nearTop = this.enemies.filter(e => e.active && e.y < 80);
    let x = minX + Math.random() * Math.max(maxX - minX, 1);

    for (let attempt = 0; attempt < 10; attempt++) {
      const overlaps = nearTop.some(e => {
        const ew = e.width || (e.word.length * 20 + 36);
        return Math.abs(x - e.x) < (estWidth + ew) / 2 + 12;
      });
      if (!overlaps) break;
      x = minX + Math.random() * Math.max(maxX - minX, 1);
    }

    this.enemies.push({
      id: this.nextEnemyId++,
      word, typed: 0, x, y: 10,
      speed: actualSpeed, type, debuffKind, powerupKind,
      alpha: 0, scale: 0.5, active: true, targeted: false, spawnTime: now,
      width: 0, height: 0,
    });
  }

  private startRun(): void {
    this.state = 'playing';
    this.level = 1;
    this.levelDef = getLevelDef(1);
    this.levelWordsKilled = 0;
    this.levelEnemiesSpawned = 0;
    this.enemies = [];
    this.particles = [];
    this.bullets = [];
    this.debuffs = [];
    this.powerups = [];
    this.score = 0;
    this.combo = 0;
    this.longestCombo = 0;
    this.wordsKilled = 0;
    this.lettersTyped = 0;
    this.correctKeys = 0;
    this.totalKeys = 0;
    this.health = C.HEALTH_MAX;
    this.shields = 0;
    this.levelRewardClaimed = false;
    this.typedBuffer = '';
    this.targetEnemy = null;
    this.runStartTime = performance.now();
    this.lastSpawnTime = 0;
    this.runElapsed = 0;
    this.wpm = 0;
    this.lastStats = null;
    this.newTitleThisRun = null;
    this.runNemesisLetter = null;
    this.paceData = [];
    this.lastPaceSample = 0;
    this.pbDelta = null;
    this.runLetterStats = {};
    this.adManager.onRunStart();
    this.adManager.gameplayStart();
  }

  private die(): void {
    this.state = 'dead';
    this.enemies = [];
    this.bullets = [];
    this.debuffs = [];
    this.powerups = [];
    this.targetEnemy = null;
    this.typedBuffer = '';
    this.shakeIntensity = 0;
    this.lastStats = this.buildStats();
    this.audio.playDeath();
    this.adManager.gameplayStop();
    this.adManager.onDeath();

    // Save to profile (updates highScore, titles, streak, etc.)
    this.saveRun();

    if (this.adManager.shouldShowInterstitial()) {
      this.state = 'ad';
      this.adManager.showInterstitial().then(() => { this.state = 'dead'; });
    }
  }

  private async revive(): Promise<void> {
    if (!this.adManager.canRevive()) return;
    this.state = 'ad';
    const success = await this.adManager.showRewardedAd();
    if (success) {
      this.health = C.HEALTH_MAX;
      this.state = 'playing';
      this.adManager.gameplayStart();
      this.enemies = [];
      this.typedBuffer = '';
      this.targetEnemy = null;
    } else {
      this.state = 'dead';
    }
  }

  private restart(): void {
    this.startRun();
  }

  private computePbDelta(): void {
    const pace = this.profile.bestRunPace;
    if (pace.length < 2) { this.pbDelta = null; return; }
    const t = this.runElapsed;
    // Linear interpolation of PB score at current time
    let pbScore = 0;
    for (let i = 0; i < pace.length - 1; i++) {
      if (t >= pace[i].time && t <= pace[i + 1].time) {
        const frac = (t - pace[i].time) / (pace[i + 1].time - pace[i].time);
        pbScore = pace[i].score + frac * (pace[i + 1].score - pace[i].score);
        break;
      }
      if (t > pace[pace.length - 1].time) {
        pbScore = pace[pace.length - 1].score;
        break;
      }
    }
    this.pbDelta = this.score - pbScore;
  }

  start(): void {
    let lastTime = performance.now();
    const loop = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;
      this.update(dt, time);
      this.draw(time);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  private update(dt: number, now: number): void {
    if (this.flashAlpha > 0) {
      this.flashAlpha = Math.max(0, this.flashAlpha - dt * 3);
    }

    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 200 * dt;
      p.life -= dt;
    }
    this.particles = this.particles.filter(p => p.life > 0);

    for (const b of this.bullets) {
      const dist = Math.sqrt((b.targetX - b.x) ** 2 + (b.targetY - b.y) ** 2);
      b.progress += (b.speed * dt) / Math.max(dist, 1);
      if (b.progress >= 1) b.progress = 1;
    }
    this.bullets = this.bullets.filter(b => b.progress < 1);

    if (this.state !== 'playing') return;

    this.runElapsed = (now - this.runStartTime) / 1000;

    if (this.runElapsed > 3) {
      this.wpm = Math.round((this.lettersTyped / 5) / (this.runElapsed / 60));
    }

    // Pace sampling
    if (this.runElapsed - this.lastPaceSample >= PACE_SAMPLE_INTERVAL) {
      this.paceData.push({ time: this.runElapsed, score: this.score });
      this.lastPaceSample = this.runElapsed;
      this.computePbDelta();
    }

    // Spawn
    const ld = this.levelDef;
    const spawnInterval = Math.max(ld.spawnInterval * 0.5, ld.spawnInterval - this.runElapsed * C.ENEMY_SPAWN_RAMP);
    const activeCount = this.enemies.filter(e => e.active).length;
    const minEnemies = Math.min(1 + Math.floor(this.level / 4), 3);
    if (now - this.lastSpawnTime > spawnInterval || activeCount < minEnemies) {
      this.spawnEnemy();
      this.lastSpawnTime = now;
    }

    // Update enemies
    const freezeActive = this.hasPowerup('freeze');
    const rushActive = this.hasDebuff('rush');
    for (const e of this.enemies) {
      if (!e.active) continue;
      let spd = freezeActive ? e.speed * 0.3 : e.speed;
      if (rushActive) spd *= 1.8;
      e.y += spd * dt;

      // Fade/scale in over 200ms
      if (e.alpha < 1) {
        const t = Math.min((now - e.spawnTime) / 200, 1);
        e.alpha = t;
        e.scale = 0.5 + t * 0.5;
      }

      if (e.y > this.renderer.h - C.CANNON_Y_OFFSET + 10) {
        e.active = false;
        if (e === this.targetEnemy) {
          this.targetEnemy = null;
          this.typedBuffer = '';
        }

        if (e.type === 'debuff') { this.score += 5; continue; }

        if (this.shields > 0) {
          this.shields--;
          this.spawnParticles(e.x, this.renderer.h - C.CANNON_Y_OFFSET, '#88ffff', 8);
          continue;
        }

        this.health--;
        this.audio.playHit();
        this.triggerShake(8, 200);
        this.flashScreen(C.COLOR_HEALTH, 0.2);
        this.spawnParticles(e.x, this.renderer.h - C.CANNON_Y_OFFSET, C.COLOR_HEALTH, C.PARTICLE_COUNT_HIT);
        this.combo = 0;

        if (this.health <= 0) { this.die(); return; }
      }
    }

    this.enemies = this.enemies.filter(e => e.active);
    this.debuffs = this.debuffs.filter(d => d.endsAt > now);
    this.powerups = this.powerups.filter(p => p.endsAt > now);

    if (this.shakeIntensity > 0) {
      if (now - this.shakeStart > this.shakeDuration) this.shakeIntensity = 0;
    }
  }

  private draw(now: number): void {
    let sx = 0, sy = 0;
    if (this.state === 'playing' && this.shakeIntensity > 0) {
      const t = (now - this.shakeStart) / this.shakeDuration;
      const decay = 1 - t;
      sx = (Math.random() - 0.5) * this.shakeIntensity * decay * 2;
      sy = (Math.random() - 0.5) * this.shakeIntensity * decay * 2;
    }
    this.renderer.setShake(sx, sy);
    this.renderer.beginFrame(now);

    if (this.state === 'title') {
      this.renderer.drawTitleScreen(now, this.profile);
      if (this.showStatsModal) {
        this.renderer.drawStatsModal(now, this.profile);
      }
      this.renderer.endFrame();
      return;
    }

    if (this.state === 'dead' || this.state === 'ad') {
      for (const p of this.particles) this.renderer.drawParticle(p);
      this.renderer.drawDeathScreen(
        this.lastStats!, this.profile,
        this.adManager.canRevive(),
        this.newTitleThisRun,
        this.runNemesisLetter,
      );
      this.renderer.endFrame();
      return;
    }

    if (this.state === 'levelComplete') {
      this.renderer.drawLevelCompleteScreen(this.lastStats!, this.levelDef, now, this.levelRewardClaimed);
      this.renderer.endFrame();
      return;
    }

    // Playing
    const cx = this.renderer.w / 2;
    const cy = this.renderer.h - C.CANNON_Y_OFFSET;
    if (this.targetEnemy && this.targetEnemy.active) {
      this.renderer.drawTargetingLaser(cx, cy, this.targetEnemy.x, this.targetEnemy.y, now);
    }

    for (const b of this.bullets) this.renderer.drawBullet(b);

    for (const e of this.enemies) {
      if (e.active) this.renderer.drawEnemy(e, now);
    }

    for (const p of this.particles) this.renderer.drawParticle(p);

    this.renderer.drawCannon(cx, cy);
    this.renderer.drawDangerZone(this.renderer.h - C.CANNON_Y_OFFSET + 10, now);

    if (this.flashAlpha > 0) this.renderer.drawFlash(this.flashColor, this.flashAlpha);
    if (this.hasDebuff('rush')) this.renderer.drawRushOverlay(now);

    const accuracy = this.totalKeys > 0 ? Math.round((this.correctKeys / this.totalKeys) * 100) : 100;
    this.renderer.drawHUD(
      this.score, this.combo, this.health, C.HEALTH_MAX,
      this.profile.highScore, this.wpm, this.typedBuffer,
      this.debuffs, this.powerups, now,
      this.level, this.levelWordsKilled, this.levelDef.wordsToKill,
      accuracy, this.pbDelta, this.shields,
    );

    this.renderer.endFrame();
  }
}
