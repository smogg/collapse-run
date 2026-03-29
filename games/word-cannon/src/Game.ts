import { Enemy, Particle, Bullet, ActiveDebuff, ActivePowerup, EnemyType, DebuffKind, PowerupKind, PlayerProfile, RunRecord, createDefaultProfile, Explosion, LightningArc, Missile, DamageNumber, UpgradeDef, CritSlash } from './types';
import { Renderer } from './systems/Renderer';
import { AudioManager } from './systems/AudioManager';
import { AdManager } from './systems/AdManager';
import { getRandomWord, getDebuffWord, getPowerupWord } from './data/words';
import { ALL_UPGRADES } from './data/upgrades';
import * as C from './config';

type GameState = 'title' | 'playing' | 'dead' | 'ad' | 'levelComplete' | 'upgradeSelect';

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

  // Visual effects
  private explosions: Explosion[] = [];
  private lightningArcs: LightningArc[] = [];
  private missiles: Missile[] = [];
  private critSlashes: CritSlash[] = [];
  private damageNumbers: DamageNumber[] = [];

  // Player state
  private health = C.HEALTH_MAX;
  private maxHealth = C.HEALTH_MAX;
  private shields = 0;
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
  private bossAlive = false;

  // Targeting
  private targetEnemy: Enemy | null = null;
  private targetStartTime = 0;

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

  // Upgrades
  private upgrades: Map<string, number> = new Map();
  private upgradeOptions: UpgradeDef[] = [];

  // Profile
  profile: PlayerProfile;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new Renderer(canvas);
    this.audio = new AudioManager();
    this.adManager = new AdManager();

    this.profile = this.loadProfile();
    this.setupInput();
  }

  async init(): Promise<void> {
    await this.adManager.init((muted) => this.audio.setMuted(muted));
  }

  private loadProfile(): PlayerProfile {
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      if (raw) {
        const p = JSON.parse(raw) as PlayerProfile;
        if (p.version === 1) {
          if (!p.letterStats) p.letterStats = {};
          if (!p.bestRunPace) p.bestRunPace = [];
          return p;
        }
      }
    } catch { /* corrupt data */ }

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

    if (this.score > p.highScore) p.highScore = this.score;
    if (this.level > p.highLevel) p.highLevel = this.level;
    if (this.wpm > p.highWpm) p.highWpm = this.wpm;
    if (accuracy > p.highAccuracy) p.highAccuracy = accuracy;
    if (this.longestCombo > p.highCombo) p.highCombo = this.longestCombo;

    p.totalWordsKilled += this.wordsKilled;
    p.totalLettersTyped += this.lettersTyped;
    p.totalPlaytime += duration;

    for (const [letter, stats] of Object.entries(this.runLetterStats)) {
      if (!p.letterStats[letter]) p.letterStats[letter] = { correct: 0, total: 0 };
      p.letterStats[letter].correct += stats.correct;
      p.letterStats[letter].total += stats.total;
    }

    if (this.score >= p.highScore && this.paceData.length > 0) {
      p.bestRunPace = [...this.paceData];
    }

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
    if (worstAcc >= 0.8) this.runNemesisLetter = null;

    this.saveProfile();
  }

  // ── Upgrade helpers ──

  private upgradeStacks(id: string): number {
    return this.upgrades.get(id) || 0;
  }

  private hasUpgrade(id: string): boolean {
    return this.upgradeStacks(id) > 0;
  }

  private offerUpgrades(): UpgradeDef[] {
    const available = ALL_UPGRADES.filter(u =>
      (this.upgrades.get(u.id) || 0) < u.maxStacks
    );
    // Try to pick from different categories
    const cats = [...new Set(available.map(u => u.category))];
    const picks: UpgradeDef[] = [];
    const shuffled = [...available].sort(() => Math.random() - 0.5);

    // One from each category first
    for (const cat of cats) {
      if (picks.length >= 3) break;
      const fromCat = shuffled.find(u => u.category === cat && !picks.includes(u));
      if (fromCat) picks.push(fromCat);
    }
    // Fill remaining slots
    for (const u of shuffled) {
      if (picks.length >= 3) break;
      if (!picks.includes(u)) picks.push(u);
    }
    return picks;
  }

  private applyUpgrade(upgrade: UpgradeDef): void {
    const current = this.upgrades.get(upgrade.id) || 0;
    this.upgrades.set(upgrade.id, current + 1);

    // Immediate effects (none currently)
  }

  // ── Input ──

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

      if (this.state === 'upgradeSelect') {
        if (e.key === '1' || e.key === '2' || e.key === '3') {
          const idx = parseInt(e.key) - 1;
          if (idx < this.upgradeOptions.length) {
            this.selectUpgrade(idx);
          }
        }
        return;
      }

      if (this.state === 'dead' || this.state === 'levelComplete') {
        if (e.key === 'Enter' || e.key === ' ') {
          if (this.state === 'levelComplete') {
            this.enterUpgradeSelect();
          } else {
            this.restart();
          }
        }
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
        const pos = this.renderer.screenToGame(e.clientX, e.clientY);
        const b = this.renderer.statsIconBounds;
        if (b && pos.x >= b.x && pos.x <= b.x + b.w && pos.y >= b.y && pos.y <= b.y + b.h) {
          this.showStatsModal = true;
          return;
        }
        this.startRun();
        return;
      }
      if (this.state === 'upgradeSelect') {
        const pos = this.renderer.screenToGame(e.clientX, e.clientY);
        const clickedIdx = this.renderer.getUpgradeCardIndex(pos.x, pos.y);
        if (clickedIdx >= 0 && clickedIdx < this.upgradeOptions.length) {
          this.selectUpgrade(clickedIdx);
        }
        return;
      }
      if (this.state === 'levelComplete') {
        const pos = this.renderer.screenToGame(e.clientX, e.clientY);
        const cx = this.renderer.w / 2;
        const btnY = this.renderer.h * 0.72;
        if (pos.x > cx - 140 && pos.x < cx + 140 && pos.y > btnY - 22 && pos.y < btnY + 22) {
          this.watchLevelRewardAd();
          return;
        }
        this.enterUpgradeSelect();
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

  private selectUpgrade(idx: number): void {
    const upgrade = this.upgradeOptions[idx];
    this.applyUpgrade(upgrade);
    this.audio.playPowerup();
    this.startNextLevel();
  }

  private enterUpgradeSelect(): void {
    this.upgradeOptions = this.offerUpgrades();
    if (this.upgradeOptions.length === 0) {
      this.startNextLevel();
      return;
    }
    this.state = 'upgradeSelect';
  }

  // ── Typing ──

  private handleTyping(key: string): void {
    this.audio.playType();
    this.lettersTyped++;
    this.totalKeys++;

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
          this.completeSegment(this.targetEnemy);
        }
        return;
      } else {
        this.targetEnemy.typed = 0;
        this.targetEnemy.targeted = false;
        this.targetEnemy = null;
        this.typedBuffer = '';
        this.combo = 0;
        this.audio.playMistype();
        this.triggerShake(3, 100);
      }
    }

    this.typedBuffer = key;
    // Match against first non-faded letter (autoTyped letters are removed by missiles)
    const candidates = this.enemies
      .filter(e => e.active && !e.targeted && e.autoTyped < e.word.length && e.word[e.autoTyped] === key)
      .sort((a, b) => b.y - a.y);

    if (candidates.length > 0) {
      this.correctKeys++;
      this.runLetterStats[key].correct++;
      this.targetEnemy = candidates[0];
      this.targetEnemy.targeted = true;
      this.targetEnemy.typed = this.targetEnemy.autoTyped + 1;
      this.targetStartTime = performance.now();
      this.fireBullet(this.targetEnemy);

      if (this.targetEnemy.typed >= this.targetEnemy.word.length) {
        this.completeSegment(this.targetEnemy);
      }
    } else {
      this.typedBuffer = '';
      this.combo = 0;
      this.audio.playMistype();
      this.triggerShake(3, 100);
    }
  }

  /** Called when a word segment is fully typed. Either advance to next segment or kill. */
  private completeSegment(enemy: Enemy): void {
    const segmentDamage = 1;

    // Combo Crits: crit chance scales with current combo
    let critChance = 0;
    const comboStacks = this.upgradeStacks('combo_crits');
    if (comboStacks > 0) {
      const comboRatio = this.combo / C.COMBO_MAX;
      critChance = comboRatio * (C.COMBO_CRIT_MAX[comboStacks - 1] || 0);
    }
    critChance = Math.min(critChance, 0.80);
    const isCrit = critChance > 0 && Math.random() < critChance;

    if (isCrit && enemy.currentSegment < enemy.maxSegments - 1) {
      // Insta-kill: skip all remaining segments
      enemy.currentSegment = enemy.maxSegments - 1;
      this.audio.playCritical();
      this.spawnDamageNumber(enemy.x, enemy.y - 30, 'CRIT!', '#ff4444');
      this.flashScreen('#ff4444', 0.3);
      this.triggerShake(10, 300);
      // Spawn cross slashes
      const now = performance.now();
      this.critSlashes.push(
        { x: enemy.x, y: enemy.y, spawnTime: now, duration: 400, angle: -Math.PI / 4 },
        { x: enemy.x, y: enemy.y, spawnTime: now + 50, duration: 400, angle: Math.PI / 4 },
      );
      // Extra red particles
      this.spawnParticles(enemy.x, enemy.y, '#ff2222', 20);
      this.spawnParticles(enemy.x, enemy.y, '#ff6644', 10);
    }

    const nextSegment = enemy.currentSegment + segmentDamage;

    if (nextSegment >= enemy.maxSegments) {
      // Final segment — full kill
      this.killEnemy(enemy);
    } else {
      // Advance to next segment — partial damage
      enemy.currentSegment = nextSegment;
      enemy.word = enemy.wordSegments[enemy.currentSegment];
      enemy.typed = 0;
      enemy.autoTyped = 0;
      if (this.targetEnemy === enemy) {
        this.typedBuffer = '';
        // briefly untarget so first letter re-targets
        enemy.targeted = false;
        this.targetEnemy = null;
      }
      this.audio.playSegmentHit();
      this.spawnParticles(enemy.x, enemy.y, this.getEnemyColor(enemy), 6);
      this.spawnDamageNumber(enemy.x, enemy.y - 20, `-${segmentDamage}`, '#ffaa44');
    }
  }

  private getEnemyColor(enemy: Enemy): string {
    switch (enemy.type) {
      case 'tank': return C.COLOR_ENEMY_TANK;
      case 'boss': return C.COLOR_ENEMY_BOSS;
      case 'splitter': return C.COLOR_ENEMY_SPLITTER;
      case 'debuff': return C.COLOR_ENEMY_DEBUFF;
      case 'powerup': return C.COLOR_ENEMY_POWERUP;
      default: return C.COLOR_ENEMY_NORMAL;
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
        : target.type === 'tank' ? C.COLOR_ENEMY_TANK
        : target.type === 'boss' ? C.COLOR_ENEMY_BOSS
        : target.type === 'splitter' ? C.COLOR_ENEMY_SPLITTER
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
    } else if (enemy.type === 'boss') {
      this.audio.playBossDeath();
      this.spawnParticles(enemy.x, enemy.y, C.COLOR_ENEMY_BOSS, 40);
      this.spawnParticles(enemy.x, enemy.y, '#ffffff', 20);
      this.spawnParticles(enemy.x, enemy.y, '#ff8800', 15);
      this.flashScreen(C.COLOR_ENEMY_BOSS, 0.4);
      this.triggerShake(15, 600);
      this.bossAlive = false;
      this.spawnDamageNumber(enemy.x, enemy.y - 40, 'BOSS DOWN!', C.COLOR_ENEMY_BOSS);
    } else if (enemy.type === 'splitter') {
      this.audio.playSplit();
      this.spawnParticles(enemy.x, enemy.y, C.COLOR_ENEMY_SPLITTER, 14);
      this.flashScreen(C.COLOR_ENEMY_SPLITTER, 0.1);
      this.spawnSplitChildren(enemy);
    } else if (enemy.type === 'tank') {
      this.audio.playKill();
      this.spawnParticles(enemy.x, enemy.y, C.COLOR_ENEMY_TANK, 20);
      this.spawnParticles(enemy.x, enemy.y, '#ffaa44', 8);
      this.flashScreen(C.COLOR_ENEMY_TANK, 0.15);
      this.triggerShake(6, 250);
    } else {
      this.audio.playKill();
      this.spawnParticles(enemy.x, enemy.y, C.COLOR_ENEMY_NORMAL, C.PARTICLE_COUNT_KILL);
      this.flashScreen(C.COLOR_ENEMY_NORMAL, 0.08);
    }

    // Score
    const wordLen = enemy.word.length;
    const comboMult = 1 + this.combo * C.COMBO_BONUS_MULTIPLIER;

    const totalScore = Math.round(wordLen * C.SCORE_PER_LETTER * comboMult);
    this.score += totalScore;
    this.wordsKilled++;
    this.levelWordsKilled++;

    // Show score popup
    if (totalScore > 0) {
      this.spawnDamageNumber(enemy.x, enemy.y - 25, `+${totalScore}`, '#ffffff');
    }

    // Combo
    const now = performance.now();
    const comboTimeout = C.COMBO_TIMEOUT;
    if (now - this.lastKillTime < comboTimeout) {
      this.combo = Math.min(this.combo + 1, C.COMBO_MAX);
      if (this.combo > 0 && this.combo % 5 === 0) this.audio.playCombo();
    } else {
      this.combo = 1;
    }
    this.lastKillTime = now;
    if (this.combo > this.longestCombo) this.longestCombo = this.combo;

    // Trigger weapon effects
    this.triggerWeaponEffects(enemy);

    // Check level completion
    const levelDone = this.levelWordsKilled >= this.levelDef.wordsToKill;
    if (levelDone && !this.bossAlive) {
      this.completeLevel();
    }
  }

  /** Trigger splash, chain lightning, piercing, missiles on kill */
  private triggerWeaponEffects(killedEnemy: Enemy): void {
    const x = killedEnemy.x;
    const y = killedEnemy.y;

    // Splash Damage
    if (this.hasUpgrade('splash_damage')) {
      const radius = C.SPLASH_RADIUS[this.upgradeStacks('splash_damage') - 1] || 80;
      this.spawnExplosion(x, y, radius, C.COLOR_ENEMY_TANK);
      this.spawnParticles(x, y, '#ff8800', 20);
      this.spawnParticles(x, y, '#ffcc00', 15);
      this.spawnParticles(x, y, '#ff4400', 10);
      this.audio.playExplosion();
      this.triggerShake(8, 200);
      this.flashScreen('#ff6600', 0.15);
      const nearby = this.enemies.filter(e => e.active && e !== killedEnemy &&
        Math.sqrt((e.x - x) ** 2 + (e.y - y) ** 2) < radius);
      for (const e of nearby) {
        this.damageEnemy(e, 1);
      }
    }

    // Homing Missiles
    if (this.hasUpgrade('homing_missiles')) {
      const count = C.MISSILE_COUNT[this.upgradeStacks('homing_missiles') - 1] || 1;
      const targets = this.enemies
        .filter(e => e.active && e !== killedEnemy && !e.targeted)
        .sort((a, b) =>
          Math.sqrt((a.x - x) ** 2 + (a.y - y) ** 2) -
          Math.sqrt((b.x - x) ** 2 + (b.y - y) ** 2)
        )
        .slice(0, count);

      for (const t of targets) {
        this.spawnMissile(x, y, t);
        this.audio.playMissileLaunch();
      }
    }
  }

  /** Deal segment damage to an enemy (from effects, not typing) */
  private damageEnemy(enemy: Enemy, segments: number): void {
    const nextSegment = enemy.currentSegment + segments;
    if (nextSegment >= enemy.maxSegments) {
      // Kill it
      enemy.active = false;
      if (enemy.type === 'splitter') {
        this.spawnSplitChildren(enemy);
        this.audio.playSplit();
      } else {
        this.audio.playKill();
      }
      this.spawnParticles(enemy.x, enemy.y, this.getEnemyColor(enemy), 10);
      if (enemy === this.targetEnemy) {
        this.targetEnemy = null;
        this.typedBuffer = '';
      }
      if (enemy.type === 'boss') this.bossAlive = false;
      this.wordsKilled++;
      this.levelWordsKilled++;
      // Check level completion
      if (this.levelWordsKilled >= this.levelDef.wordsToKill && !this.bossAlive) {
        this.completeLevel();
      }
    } else {
      enemy.currentSegment = nextSegment;
      enemy.word = enemy.wordSegments[enemy.currentSegment];
      enemy.typed = 0;
      enemy.autoTyped = 0;
      if (enemy === this.targetEnemy) {
        // Reset targeting so player re-targets with first letter
        enemy.targeted = false;
        this.targetEnemy = null;
        this.typedBuffer = '';
      }
      this.spawnParticles(enemy.x, enemy.y, this.getEnemyColor(enemy), 4);
      this.spawnDamageNumber(enemy.x, enemy.y - 15, `-${segments}`, '#ffaa44');
    }
  }

  private spawnSplitChildren(parent: Enemy): void {
    const ld = this.levelDef;
    const childWordLen = Math.max(ld.minWordLen, Math.min(parent.splitWordLen, ld.maxWordLen));
    const offsets = [-40, 40];
    for (const dx of offsets) {
      const word = getRandomWord(childWordLen, childWordLen + 1);
      const segments = [word];
      this.enemies.push({
        id: this.nextEnemyId++,
        word, typed: 0,
        x: Math.max(C.ENEMY_PADDING, Math.min(this.renderer.w - C.ENEMY_PADDING, parent.x + dx)),
        y: parent.y,
        speed: parent.speed * C.SPLIT_SPEED_MULT,
        type: 'normal',
        alpha: 1, scale: 1,
        active: true, targeted: false,
        spawnTime: performance.now(),
        width: 0, height: 0,
        wordSegments: segments,
        currentSegment: 0,
        maxSegments: 1,
        sizeScale: C.SPLIT_SIZE_SCALE,
        splitOnDeath: false,
        splitWordLen: 0,
        autoTyped: 0,
      });
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
    this.explosions = [];
    this.lightningArcs = [];
    this.missiles = [];
    this.critSlashes = [];
    this.damageNumbers = [];
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
      this.health = this.maxHealth;
      this.shields += 2;
    }
    this.state = 'levelComplete';
  }

  private startNextLevel(): void {
    this.level++;
    this.levelDef = getLevelDef(this.level);
    this.levelWordsKilled = 0;
    this.levelEnemiesSpawned = 0;
    this.bossAlive = false;
    this.health = this.maxHealth;
    this.state = 'playing';
    this.enemies = [];
    this.particles = [];
    this.bullets = [];
    this.debuffs = [];
    this.powerups = [];
    this.explosions = [];
    this.lightningArcs = [];
    this.missiles = [];
    this.critSlashes = [];
    this.damageNumbers = [];
    this.combo = 0;
    this.targetEnemy = null;
    this.typedBuffer = '';
    this.lastSpawnTime = 0;
    this.runStartTime = performance.now();
    this.lastPaceSample = 0;
    this.adManager.gameplayStart();

    // Spawn boss on levels 5, 10, 15, ...
    if (this.level >= 5 && this.level % 5 === 0) {
      this.spawnBoss();
    }
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
      this.health = Math.min(this.health + 1, this.maxHealth);
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

  // ── Visual effect spawners ──

  private spawnExplosion(x: number, y: number, maxRadius: number, color: string): void {
    this.explosions.push({
      x, y, radius: 0, maxRadius, life: 0.4, maxLife: 0.4, color,
    });
  }

  private spawnLightningArc(fromX: number, fromY: number, toX: number, toY: number): void {
    const segments: { x: number; y: number }[] = [{ x: fromX, y: fromY }];
    const steps = 6;
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      segments.push({
        x: fromX + (toX - fromX) * t + (Math.random() - 0.5) * 30,
        y: fromY + (toY - fromY) * t + (Math.random() - 0.5) * 30,
      });
    }
    segments.push({ x: toX, y: toY });
    this.lightningArcs.push({
      fromX, fromY, toX, toY, life: 0.3, maxLife: 0.3, segments,
    });
  }

  private spawnMissile(fromX: number, fromY: number, target: Enemy | null): void {
    this.missiles.push({
      x: fromX, y: fromY,
      targetId: target ? target.id : -1,
      speed: 400,
      trail: [],
      life: 6,
      orbitAngle: Math.random() * Math.PI * 2,
      orbitCenterX: fromX,
      orbitCenterY: fromY,
    });
  }

  private spawnDamageNumber(x: number, y: number, text: string, color: string): void {
    this.damageNumbers.push({
      x, y, text, color, vy: -60, life: 1, maxLife: 1,
    });
  }

  // ── Enemy spawning ──

  private makeEnemy(word: string, type: EnemyType, speed: number, x: number, segments?: string[], opts?: Partial<Enemy>): Enemy {
    const allSegments = segments || [word];
    return {
      id: this.nextEnemyId++,
      word: allSegments[0],
      typed: 0,
      x, y: 75,
      speed, type,
      alpha: 0, scale: 0.5,
      active: true, targeted: false,
      spawnTime: performance.now(),
      width: 0, height: 0,
      wordSegments: allSegments,
      currentSegment: 0,
      maxSegments: allSegments.length,
      sizeScale: 1,
      splitOnDeath: false,
      splitWordLen: 0,
      autoTyped: 0,
      ...opts,
    };
  }

  private spawnBoss(): void {
    const ld = this.levelDef;
    const segCount = Math.min(4 + Math.floor(this.level / 5), 6);
    const segments: string[] = [];
    for (let i = 0; i < segCount; i++) {
      segments.push(getRandomWord(Math.max(4, ld.minWordLen), Math.min(6, ld.maxWordLen)));
    }
    const speed = ld.baseSpeed * C.BOSS_SPEED_MULT;
    const x = this.renderer.w / 2;
    const enemy = this.makeEnemy(segments[0], 'boss', speed, x, segments, {
      sizeScale: C.BOSS_SIZE_SCALE,
    });
    this.enemies.push(enemy);
    this.bossAlive = true;
    this.audio.playBossSpawn();
    this.triggerShake(8, 400);
    this.flashScreen(C.COLOR_ENEMY_BOSS, 0.15);
    this.spawnDamageNumber(x, 60, 'BOSS!', C.COLOR_ENEMY_BOSS);
  }

  private spawnEnemy(): void {
    const now = performance.now();
    const ld = this.levelDef;

    const roll = Math.random();
    let type: EnemyType = 'normal';
    let debuffKind: DebuffKind | undefined;
    let powerupKind: PowerupKind | undefined;
    let word: string;
    let segments: string[] | undefined;
    let sizeScale = 1;
    let splitOnDeath = false;
    let splitWordLen = 0;

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
    } else if (this.level >= 6 && Math.random() < C.SPLITTER_CHANCE) {
      type = 'splitter';
      const segCount = this.level >= 8 ? 2 : 1;
      segments = [];
      for (let i = 0; i < segCount; i++) {
        segments.push(getRandomWord(ld.minWordLen, Math.min(ld.maxWordLen, 5)));
      }
      word = segments[0];
      sizeScale = 1.1;
      splitOnDeath = true;
      splitWordLen = Math.max(2, ld.minWordLen);
    } else if (this.level >= 3 && Math.random() < C.TANK_CHANCE) {
      type = 'tank';
      const segCount = this.level >= 6 ? 3 : 2;
      segments = [];
      for (let i = 0; i < segCount; i++) {
        segments.push(getRandomWord(Math.max(3, ld.minWordLen), Math.min(5, ld.maxWordLen)));
      }
      word = segments[0];
      sizeScale = C.TANK_SIZE_SCALE;
    } else {
      word = getRandomWord(ld.minWordLen, ld.maxWordLen);
    }

    // For levels 1-10, strictly prevent duplicate first letters on screen
    const strictNoDupLetters = this.level <= 10;
    const activeFirstLetters = new Set(
      this.enemies.filter(e => e.active).map(e => e.word[e.autoTyped] || e.word[0])
    );
    if (activeFirstLetters.has(word[0])) {
      if (type === 'normal') {
        for (let attempt = 0; attempt < 10; attempt++) {
          const alt = getRandomWord(ld.minWordLen, ld.maxWordLen);
          if (!activeFirstLetters.has(alt[0])) { word = alt; break; }
        }
      }
      if (strictNoDupLetters && activeFirstLetters.has(word[0])) return;
    }

    const elapsed = (now - this.runStartTime) / 1000;
    const baseSpeed = ld.baseSpeed + elapsed * C.ENEMY_SPEED_RAMP;
    let speed = Math.min(baseSpeed, ld.maxSpeed);
    if (this.levelEnemiesSpawned < C.WARMUP_ENEMY_COUNT) speed *= C.WARMUP_SPEED_MULT;
    this.levelEnemiesSpawned++;
    if (type === 'tank') speed *= C.TANK_SPEED_MULT;
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

    const enemy = this.makeEnemy(word, type, actualSpeed, x, segments, {
      debuffKind, powerupKind, sizeScale, splitOnDeath, splitWordLen,
    });
    this.enemies.push(enemy);
  }

  private startRun(): void {
    this.state = 'playing';
    this.level = 1;
    this.levelDef = getLevelDef(1);
    this.levelWordsKilled = 0;
    this.levelEnemiesSpawned = 0;
    this.bossAlive = false;
    this.enemies = [];
    this.particles = [];
    this.bullets = [];
    this.debuffs = [];
    this.powerups = [];
    this.explosions = [];
    this.lightningArcs = [];
    this.missiles = [];
    this.critSlashes = [];
    this.damageNumbers = [];
    this.score = 0;
    this.combo = 0;
    this.longestCombo = 0;
    this.wordsKilled = 0;
    this.lettersTyped = 0;
    this.correctKeys = 0;
    this.totalKeys = 0;
    this.maxHealth = C.HEALTH_MAX;
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
    this.upgrades = new Map();
    this.upgradeOptions = [];
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
      this.health = this.maxHealth;
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

    // Update visual effects
    for (const ex of this.explosions) {
      ex.life -= dt;
      ex.radius = ex.maxRadius * (1 - ex.life / ex.maxLife);
    }
    this.explosions = this.explosions.filter(e => e.life > 0);

    for (const arc of this.lightningArcs) {
      arc.life -= dt;
    }
    this.lightningArcs = this.lightningArcs.filter(a => a.life > 0);

    // Update missiles
    for (const m of this.missiles) {
      m.life -= dt;
      m.trail.push({ x: m.x, y: m.y });
      if (m.trail.length > 10) m.trail.shift();

      let target = this.enemies.find(e => e.id === m.targetId && e.active);

      // If no valid target, try to find a new one
      if (!target) {
        const newTarget = this.enemies
          .filter(e => e.active && !e.targeted && e.id !== m.lastHitId)
          .sort((a, b) => {
            // Prefer enemies without autoTyped letters (lower priority if already hit)
            const aPenalty = a.autoTyped > 0 ? 10000 : 0;
            const bPenalty = b.autoTyped > 0 ? 10000 : 0;
            return (aPenalty + Math.sqrt((a.x - m.x) ** 2 + (a.y - m.y) ** 2)) -
                   (bPenalty + Math.sqrt((b.x - m.x) ** 2 + (b.y - m.y) ** 2));
          })[0];
        if (newTarget) {
          m.targetId = newTarget.id;
          target = newTarget;
        }
      }

      if (target) {
        const dx = target.x - m.x;
        const dy = target.y - m.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 15) {
          // Hit! Fade out first 1-2 letters via autoTyped (current word only)
          const currentWord = target.word;
          const missileStacks = this.upgradeStacks('homing_missiles');
          const lettersPerHit = C.MISSILE_LETTERS[missileStacks - 1] || 1;
          const remaining = target.targeted
            ? currentWord.length - target.typed
            : currentWord.length - target.autoTyped;
          const maxAuto = Math.min(lettersPerHit, remaining);
          if (maxAuto > 0) {
            target.autoTyped += maxAuto;
            // If all letters are auto-typed, complete the segment
            if (target.autoTyped >= currentWord.length) {
              const hitId = target.id;
              this.completeSegment(target);
              // Don't let this missile retarget the same boss
              m.lastHitId = hitId;
            }
          }
          m.life = 0;
          this.spawnParticles(m.x, m.y, '#ffcc00', 12);
          this.spawnParticles(m.x, m.y, '#ff8800', 6);
        } else {
          m.x += (dx / dist) * m.speed * dt;
          m.y += (dy / dist) * m.speed * dt;
        }
      } else {
        // No enemies — orbit in circles
        const orbitRadius = 40;
        const orbitSpeed = 6;
        m.orbitAngle += orbitSpeed * dt;
        m.x = m.orbitCenterX + Math.cos(m.orbitAngle) * orbitRadius;
        m.y = m.orbitCenterY + Math.sin(m.orbitAngle) * orbitRadius;
      }
    }
    this.missiles = this.missiles.filter(m => m.life > 0);

    // Update crit slashes
    this.critSlashes = this.critSlashes.filter(s => now - s.spawnTime < s.duration);

    // Update damage numbers
    for (const dn of this.damageNumbers) {
      dn.y += dn.vy * dt;
      dn.life -= dt;
    }
    this.damageNumbers = this.damageNumbers.filter(d => d.life > 0);

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

    // Gravity Well slow
    let globalSlowMult = 1;
    if (this.hasUpgrade('gravity_well')) {
      globalSlowMult *= (1 - C.GRAVITY_SLOW[this.upgradeStacks('gravity_well') - 1]);
    }

    for (const e of this.enemies) {
      if (!e.active) continue;
      let spd = freezeActive ? e.speed * 0.3 : e.speed;
      if (rushActive) spd *= 1.8;
      spd *= globalSlowMult;
      e.y += spd * dt;

      // Fade/scale in over 200ms
      if (e.alpha < 1) {
        const t = Math.min((now - e.spawnTime) / 200, 1);
        e.alpha = t;
        e.scale = 0.5 + t * 0.5;
      }

      const bottomY = this.renderer.h - C.CANNON_Y_OFFSET + 10;

      // Temporal Shield: enemies pause at the bottom before dealing damage
      const shieldStacks = this.upgradeStacks('temporal_shield');
      if (shieldStacks > 0 && e.y > bottomY && !e.bottomPauseUntil) {
        e.bottomPauseUntil = now + (C.SHIELD_PAUSE_DURATION[shieldStacks - 1] || 2000);
        e.y = bottomY;
        e.savedSpeed = e.speed;
        e.speed = 0;
        this.spawnParticles(e.x, e.y, '#88ffff', 8);
        this.spawnDamageNumber(e.x, e.y - 20, 'PAUSED!', '#88ffff');
        continue;
      }

      // Still paused — skip damage
      if (e.bottomPauseUntil && now < e.bottomPauseUntil) {
        continue;
      }

      // Pause expired — restore speed so enemy can cross bottomY
      if (e.bottomPauseUntil && e.speed === 0 && e.savedSpeed) {
        e.speed = e.savedSpeed;
        e.savedSpeed = undefined;
      }

      if (e.y >= bottomY) {
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

    if (this.state === 'upgradeSelect') {
      this.renderer.drawUpgradeSelect(this.upgradeOptions, this.upgrades, now);
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
      if (e.active) this.renderer.drawEnemy(e, now, false);
    }

    // Visual effects
    for (const ex of this.explosions) this.renderer.drawExplosion(ex);
    for (const arc of this.lightningArcs) this.renderer.drawLightningArc(arc);
    for (const m of this.missiles) this.renderer.drawMissile(m);
    for (const s of this.critSlashes) this.renderer.drawCritSlash(s, now);
    for (const dn of this.damageNumbers) this.renderer.drawDamageNumber(dn);

    for (const p of this.particles) this.renderer.drawParticle(p);

    let totalUpgradeLevels = 0;
    for (const v of this.upgrades.values()) totalUpgradeLevels += v;
    this.renderer.drawCannon(cx, cy, totalUpgradeLevels, now);
    this.renderer.drawOwnedUpgrades(this.upgrades, ALL_UPGRADES, now);
    this.renderer.drawDangerZone(this.renderer.h - C.CANNON_Y_OFFSET + 10, now);

    if (this.flashAlpha > 0) this.renderer.drawFlash(this.flashColor, this.flashAlpha);
    if (this.hasDebuff('rush')) this.renderer.drawRushOverlay(now);

    const accuracy = this.totalKeys > 0 ? Math.round((this.correctKeys / this.totalKeys) * 100) : 100;
    this.renderer.drawHUD(
      this.score, this.combo, this.health, this.maxHealth,
      this.profile.highScore, this.wpm, this.typedBuffer,
      this.debuffs, this.powerups, now,
      this.level, this.levelWordsKilled, this.levelDef.wordsToKill,
      accuracy, this.pbDelta, this.shields,
    );

    this.renderer.endFrame();
  }
}
