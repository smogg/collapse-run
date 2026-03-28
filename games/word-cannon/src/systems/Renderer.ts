import { Enemy, Particle, Bullet, ActiveDebuff, ActivePowerup, PlayerProfile, Explosion, LightningArc, Missile, DamageNumber, UpgradeDef, CritSlash } from '../types';
import { RunStats, LevelDef, getLevelDef } from '../Game';
import { ALL_UPGRADES } from '../data/upgrades';
import * as C from '../config';

interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  brightness: number;
}

// Layout constants for upgrade cards
const CARD_W = 200;
const CARD_H = 290;
const CARD_GAP = 16;

export class Renderer {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  private _w = C.GAME_WIDTH;
  private _h = C.GAME_HEIGHT;
  private scale = 1;
  private offsetX = 0;
  private offsetY = 0;
  private shakeX = 0;
  private shakeY = 0;
  private stars: Star[] = [];
  statsIconBounds: { x: number; y: number; w: number; h: number } | null = null;

  // Upgrade card hit areas
  private upgradeCardBounds: { x: number; y: number; w: number; h: number }[] = [];

  get w(): number { return this._w; }
  get h(): number { return this._h; }

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.initStars();
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  private initStars(): void {
    for (let i = 0; i < 120; i++) {
      this.stars.push({
        x: Math.random() * C.GAME_WIDTH,
        y: Math.random() * C.GAME_HEIGHT,
        size: 0.5 + Math.random() * 2,
        speed: 5 + Math.random() * 25,
        brightness: 0.2 + Math.random() * 0.6,
      });
    }
  }

  resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const winW = window.innerWidth;
    const winH = window.innerHeight;
    const aspect = C.GAME_WIDTH / C.GAME_HEIGHT;
    const winAspect = winW / winH;
    this.scale = winAspect > aspect ? winH / C.GAME_HEIGHT : winW / C.GAME_WIDTH;
    this.canvas.width = winW * dpr;
    this.canvas.height = winH * dpr;
    this.canvas.style.width = winW + 'px';
    this.canvas.style.height = winH + 'px';
    this.offsetX = (winW - this._w * this.scale) / 2;
    this.offsetY = (winH - this._h * this.scale) / 2;
  }

  setShake(x: number, y: number): void { this.shakeX = x; this.shakeY = y; }

  screenToGame(sx: number, sy: number): { x: number; y: number } {
    return { x: (sx - this.offsetX) / this.scale, y: (sy - this.offsetY) / this.scale };
  }

  getUpgradeCardIndex(gx: number, gy: number): number {
    for (let i = 0; i < this.upgradeCardBounds.length; i++) {
      const b = this.upgradeCardBounds[i];
      if (gx >= b.x && gx <= b.x + b.w && gy >= b.y && gy <= b.y + b.h) return i;
    }
    return -1;
  }

  beginFrame(now: number): void {
    const c = this.ctx;
    const dpr = window.devicePixelRatio || 1;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, this.canvas.width, this.canvas.height);
    c.fillStyle = '#06060f';
    c.fillRect(0, 0, this.canvas.width, this.canvas.height);
    c.setTransform(
      this.scale * dpr, 0, 0, this.scale * dpr,
      (this.offsetX + this.shakeX) * dpr,
      (this.offsetY + this.shakeY) * dpr
    );
    const grad = c.createLinearGradient(0, 0, 0, this._h);
    grad.addColorStop(0, '#06060f');
    grad.addColorStop(0.5, '#0a0a1e');
    grad.addColorStop(1, '#0f0a20');
    c.fillStyle = grad;
    c.fillRect(0, 0, this._w, this._h);
    this.drawStars(c, now);
    this.drawGrid(c);
  }

  private drawStars(c: CanvasRenderingContext2D, now: number): void {
    const t = now / 1000;
    for (const star of this.stars) {
      const y = (star.y + t * star.speed) % this._h;
      const twinkle = 0.5 + 0.5 * Math.sin(t * 2 + star.x * 0.1);
      c.fillStyle = `rgba(180, 200, 255, ${star.brightness * twinkle})`;
      c.beginPath(); c.arc(star.x, y, star.size, 0, Math.PI * 2); c.fill();
    }
  }

  private drawGrid(c: CanvasRenderingContext2D): void {
    c.strokeStyle = 'rgba(60, 80, 140, 0.06)';
    c.lineWidth = 1;
    for (let x = 0; x < this._w; x += 40) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, this._h); c.stroke(); }
    for (let y = 0; y < this._h; y += 40) { c.beginPath(); c.moveTo(0, y); c.lineTo(this._w, y); c.stroke(); }
  }

  endFrame(): void {}

  // ── Sparkline ──

  private drawSparkline(
    c: CanvasRenderingContext2D,
    data: number[], x: number, y: number, w: number, h: number,
    color: string, label: string, currentVal?: string,
  ): void {
    if (data.length < 2) {
      c.fillStyle = 'rgba(160,180,220,0.3)';
      c.font = '11px "Courier New", monospace';
      c.textAlign = 'center';
      c.fillText(label, x + w / 2, y - 4);
      c.fillText('no data', x + w / 2, y + h / 2);
      return;
    }

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    c.fillStyle = 'rgba(160,180,220,0.5)';
    c.font = '10px "Courier New", monospace';
    c.textAlign = 'center';
    c.fillText(label, x + w / 2, y - 6);

    c.strokeStyle = color;
    c.lineWidth = 1.5;
    c.beginPath();
    for (let i = 0; i < data.length; i++) {
      const px = x + (i / (data.length - 1)) * w;
      const py = y + h - ((data[i] - min) / range) * h;
      if (i === 0) c.moveTo(px, py);
      else c.lineTo(px, py);
    }
    c.stroke();

    const lastX = x + w;
    const lastY = y + h - ((data[data.length - 1] - min) / range) * h;
    c.fillStyle = color;
    c.beginPath(); c.arc(lastX, lastY, 3, 0, Math.PI * 2); c.fill();

    if (currentVal) {
      c.fillStyle = color;
      c.font = 'bold 12px "Courier New", monospace';
      c.textAlign = 'center';
      c.fillText(currentVal, x + w / 2, y + h + 14);
    }

    if (data.length >= 5) {
      const recent = data.slice(-5).reduce((a, b) => a + b, 0) / 5;
      const older = data.slice(-10, -5);
      if (older.length > 0) {
        const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
        const delta = recent - olderAvg;
        const arrow = delta > 1 ? '\u2191' : delta < -1 ? '\u2193' : '\u2192';
        const arrowColor = delta > 1 ? C.COLOR_CANNON : delta < -1 ? C.COLOR_ENEMY_DEBUFF : 'rgba(160,180,220,0.5)';
        c.fillStyle = arrowColor;
        c.font = '12px "Courier New", monospace';
        c.fillText(arrow, x + w + 10, y + h / 2);
      }
    }
  }

  // ── Letter heat map ──

  private drawLetterHeatMap(
    c: CanvasRenderingContext2D,
    letterStats: Record<string, { correct: number; total: number }>,
    x: number, y: number,
  ): void {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const cellW = 22;
    const cellH = 22;
    const cols = 13;

    c.font = 'bold 10px "Courier New", monospace';
    c.textAlign = 'center';
    c.textBaseline = 'middle';

    c.fillStyle = 'rgba(160,180,220,0.5)';
    c.font = '10px "Courier New", monospace';
    c.fillText('LETTER ACCURACY', x + (cols * cellW) / 2, y - 8);
    c.font = 'bold 10px "Courier New", monospace';

    let nemesis = '';
    let worstAcc = 1;

    for (let i = 0; i < 26; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = x + col * cellW + cellW / 2;
      const cy = y + row * cellH + cellH / 2;
      const letter = letters[i];
      const stats = letterStats[letter];

      let color: string;
      let textColor: string;

      if (!stats || stats.total < 3) {
        color = 'rgba(255,255,255,0.04)';
        textColor = 'rgba(160,180,220,0.3)';
      } else {
        const acc = stats.correct / stats.total;
        if (acc >= 0.9) {
          color = 'rgba(0,255,136,0.15)';
          textColor = C.COLOR_CANNON;
        } else if (acc >= 0.7) {
          color = 'rgba(255,200,0,0.15)';
          textColor = C.COLOR_COMBO;
        } else {
          color = 'rgba(255,50,50,0.2)';
          textColor = C.COLOR_ENEMY_DEBUFF;
        }
        if (acc < worstAcc && stats.total >= 10) {
          worstAcc = acc;
          nemesis = letter;
        }
      }

      c.fillStyle = color;
      c.beginPath();
      c.roundRect(cx - cellW / 2 + 1, cy - cellH / 2 + 1, cellW - 2, cellH - 2, 3);
      c.fill();

      c.fillStyle = textColor;
      c.fillText(letter, cx, cy + 1);
    }

    if (nemesis && worstAcc < 0.8) {
      const acc = Math.round(worstAcc * 100);
      c.fillStyle = C.COLOR_ENEMY_DEBUFF;
      c.font = '11px "Courier New", monospace';
      c.textAlign = 'center';
      c.fillText(`NEMESIS: ${nemesis} (${acc}%)`, x + (cols * cellW) / 2, y + 2 * cellH + 16);
    }
  }

  // ── Streak flame ──

  private drawStreakFlame(c: CanvasRenderingContext2D, streak: number, centerX: number, y: number): void {
    if (streak <= 0) return;

    const text = `${streak} DAY STREAK`;
    c.font = 'bold 12px "Courier New", monospace';
    const textW = c.measureText(text).width;
    const flameW = 10;
    const totalW = flameW + 6 + textW;
    const startX = centerX - totalW / 2;

    const flameH = 14;
    const fw = 7;
    c.save();
    c.translate(startX + flameW / 2, y);
    const grad = c.createLinearGradient(0, -flameH, 0, 4);
    grad.addColorStop(0, '#ffcc00');
    grad.addColorStop(0.6, '#ff6600');
    grad.addColorStop(1, '#ff3300');
    c.fillStyle = grad;
    c.shadowColor = '#ff6600';
    c.shadowBlur = 8;
    c.beginPath();
    c.moveTo(0, -flameH);
    c.bezierCurveTo(fw, -flameH * 0.5, fw, 2, 0, 4);
    c.bezierCurveTo(-fw, 2, -fw, -flameH * 0.5, 0, -flameH);
    c.fill();
    c.shadowBlur = 0;
    c.restore();

    c.fillStyle = '#ffcc00';
    c.font = 'bold 12px "Courier New", monospace';
    c.textAlign = 'left';
    c.textBaseline = 'middle';
    c.fillText(text, startX + flameW + 6, y - 4);
  }

  // ── Game elements ──

  drawCannon(x: number, y: number, totalLevels: number, now: number): void {
    const c = this.ctx;
    const tier = totalLevels === 0 ? 0 : totalLevels <= 6 ? 1 : totalLevels <= 14 ? 2 : totalLevels <= 20 ? 3 : 4;

    // Glow — grows with tier
    const glowR = 50 + tier * 10;
    const glowGrad = c.createRadialGradient(x, y + 10, 0, x, y + 10, glowR);
    if (tier >= 2) {
      glowGrad.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
      glowGrad.addColorStop(0.4, 'rgba(0, 255, 170, 0.12)');
      glowGrad.addColorStop(1, 'rgba(0, 100, 255, 0)');
    } else {
      glowGrad.addColorStop(0, 'rgba(0, 255, 170, 0.15)');
      glowGrad.addColorStop(1, 'rgba(0, 255, 170, 0)');
    }
    c.fillStyle = glowGrad;
    c.fillRect(x - glowR, y - glowR / 2, glowR * 2, glowR);

    // Pulsing glow ring (tier 3+)
    if (tier >= 3) {
      const ringPulse = 0.3 + 0.3 * Math.sin(now / 400);
      c.strokeStyle = `rgba(0, 255, 170, ${ringPulse})`;
      c.lineWidth = 1.5;
      c.beginPath();
      c.arc(x, y, 35, 0, Math.PI * 2);
      c.stroke();
    }

    // Rotating hex shield (tier 4)
    if (tier >= 4) {
      c.save();
      c.translate(x, y);
      c.rotate(now / 3000);
      c.strokeStyle = 'rgba(0, 255, 170, 0.2)';
      c.lineWidth = 1;
      c.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i;
        const px = Math.cos(a) * 42;
        const py = Math.sin(a) * 42;
        i === 0 ? c.moveTo(px, py) : c.lineTo(px, py);
      }
      c.closePath();
      c.stroke();
      c.restore();
    }

    // Side barrels (tier 3+)
    if (tier >= 3) {
      c.fillStyle = C.COLOR_CANNON;
      c.globalAlpha = 0.7;
      c.fillRect(x - 22, y - 2, 4, 12);
      c.fillRect(x + 18, y - 2, 4, 12);
      c.globalAlpha = 1;
    }

    // Main body — wider at higher tiers
    const hw = 16 + tier * 1.5; // half-width
    const h = 18 + tier * 1.5;  // height from center to tip
    const color = tier >= 4 ? '#88ffdd' : C.COLOR_CANNON;
    c.fillStyle = color;
    c.shadowColor = color;
    c.shadowBlur = 20 + tier * 4;
    c.beginPath();
    c.moveTo(x, y - h);
    c.lineTo(x - hw, y + 10);
    c.lineTo(x + hw, y + 10);
    c.closePath();
    c.fill();

    // Wing fins (tier 1+)
    if (tier >= 1) {
      c.lineWidth = 2;
      c.strokeStyle = color;
      c.shadowBlur = 8;
      c.beginPath();
      c.moveTo(x - hw, y + 10);
      c.lineTo(x - hw - 8 - tier * 2, y + 16);
      c.stroke();
      c.beginPath();
      c.moveTo(x + hw, y + 10);
      c.lineTo(x + hw + 8 + tier * 2, y + 16);
      c.stroke();
    }

    // Stabilizer bar (tier 2+)
    if (tier >= 2) {
      c.strokeStyle = color;
      c.lineWidth = 2;
      c.shadowBlur = 6;
      c.beginPath();
      c.moveTo(x - hw + 2, y + 10);
      c.lineTo(x + hw - 2, y + 10);
      c.stroke();
    }

    c.shadowBlur = 0;

    // Inner detail lines (tier 3+)
    if (tier >= 3) {
      c.strokeStyle = 'rgba(255,255,255,0.15)';
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(x, y - h + 6);
      c.lineTo(x - hw + 6, y + 6);
      c.lineTo(x + hw - 6, y + 6);
      c.closePath();
      c.stroke();
    }

    // Highlight
    c.fillStyle = 'rgba(255,255,255,0.2)';
    c.beginPath();
    c.moveTo(x, y - h + 6);
    c.lineTo(x - hw / 2, y + 4);
    c.lineTo(x + hw / 2, y + 4);
    c.closePath();
    c.fill();

    // Muzzle dot (tier 1+)
    if (tier >= 1) {
      c.fillStyle = '#ffffff';
      c.shadowColor = '#ffffff';
      c.shadowBlur = 8;
      c.beginPath();
      c.arc(x, y - h, 2, 0, Math.PI * 2);
      c.fill();
      c.shadowBlur = 0;
    }

    // Orbiting particles (tier 2+)
    const orbCount = tier >= 4 ? 6 : tier >= 3 ? 4 : tier >= 2 ? 2 : 0;
    if (orbCount > 0) {
      const orbR = 25 + tier * 3;
      for (let p = 0; p < orbCount; p++) {
        const angle = (Math.PI * 2 / orbCount) * p + now / 800;
        const px = x + Math.cos(angle) * orbR;
        const py = y + Math.sin(angle) * orbR;
        const pColor = p % 2 === 0 ? color : '#ffcc44';
        c.fillStyle = pColor;
        c.globalAlpha = 0.7;
        c.beginPath();
        c.arc(px, py, 2, 0, Math.PI * 2);
        c.fill();
        c.globalAlpha = 1;
      }
    }
  }

  drawOwnedUpgrades(upgrades: Map<string, number>, allUpgrades: UpgradeDef[], now: number): void {
    const c = this.ctx;
    const owned = allUpgrades.filter(u => (upgrades.get(u.id) || 0) > 0);
    if (owned.length === 0) return;

    const badgeSize = 24;
    const gap = 6;
    let bx = 12;
    const by = this._h - 70;

    for (const u of owned) {
      const stacks = upgrades.get(u.id) || 0;

      // Badge background
      c.fillStyle = u.color;
      c.globalAlpha = 0.15;
      c.beginPath();
      c.roundRect(bx, by, badgeSize, badgeSize, 5);
      c.fill();
      c.globalAlpha = 1;

      // Border
      c.strokeStyle = u.color;
      c.globalAlpha = 0.4;
      c.lineWidth = 1;
      c.beginPath();
      c.roundRect(bx, by, badgeSize, badgeSize, 5);
      c.stroke();
      c.globalAlpha = 1;

      // Icon
      c.font = '13px sans-serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(u.icon, bx + badgeSize / 2, by + badgeSize / 2 - 1);

      // Level number (bottom-right)
      c.font = 'bold 8px "Courier New", monospace';
      c.fillStyle = u.color;
      c.textAlign = 'right';
      c.textBaseline = 'bottom';
      c.fillText(`${stacks}`, bx + badgeSize - 2, by + badgeSize - 1);

      c.textBaseline = 'alphabetic';
      bx += badgeSize + gap;
    }
  }

  drawTargetingLaser(fromX: number, fromY: number, toX: number, toY: number, now: number): void {
    const c = this.ctx;
    const pulse = 0.3 + 0.2 * Math.sin(now / 80);
    c.save();
    c.strokeStyle = `rgba(0, 255, 170, ${pulse})`;
    c.lineWidth = 1;
    c.setLineDash([6, 8]);
    c.lineDashOffset = -now / 30;
    c.beginPath(); c.moveTo(fromX, fromY); c.lineTo(toX, toY); c.stroke();
    c.setLineDash([]);
    c.restore();
    const r = 22;
    c.strokeStyle = `rgba(0, 255, 170, ${pulse + 0.1})`;
    c.lineWidth = 1.5;
    c.beginPath(); c.arc(toX, toY, r, 0, Math.PI * 2); c.stroke();
    for (let i = 0; i < 4; i++) {
      const angle = (Math.PI / 2) * i + now / 2000;
      c.beginPath();
      c.moveTo(toX + Math.cos(angle) * (r - 6), toY + Math.sin(angle) * (r - 6));
      c.lineTo(toX + Math.cos(angle) * (r + 6), toY + Math.sin(angle) * (r + 6));
      c.stroke();
    }
  }

  drawDangerZone(y: number, now: number): void {
    const c = this.ctx;
    const pulse = 0.03 + 0.02 * Math.sin(now / 500);
    c.strokeStyle = `rgba(255, 50, 80, ${pulse * 3})`;
    c.lineWidth = 1;
    c.beginPath(); c.moveTo(0, y); c.lineTo(this._w, y); c.stroke();
    const grad = c.createLinearGradient(0, y, 0, this._h);
    grad.addColorStop(0, `rgba(255, 30, 60, ${pulse})`);
    grad.addColorStop(1, 'rgba(255, 30, 60, 0)');
    c.fillStyle = grad;
    c.fillRect(0, y, this._w, this._h - y);
  }

  drawEnemy(enemy: Enemy, now: number, showPreview = false): void {
    const c = this.ctx;
    const { x, y, word, typed, type, alpha, scale: s, targeted } = enemy;
    c.save();
    c.globalAlpha = alpha;
    c.translate(x, y);
    const sizeScale = s * (enemy.sizeScale || 1);
    c.scale(sizeScale, sizeScale);

    const color = this.getEnemyColor(type, enemy);
    c.font = `bold ${C.ENEMY_SIZE_BASE}px "Courier New", monospace`;
    const metrics = c.measureText(word);
    const pw = 8, ph = 5;
    const boxW = metrics.width + pw * 2;
    const boxH = C.ENEMY_SIZE_BASE + ph * 2;
    const r = 10;
    enemy.width = boxW * (enemy.sizeScale || 1);
    enemy.height = boxH * (enemy.sizeScale || 1);

    // Special enemies get a pulsing outer glow ring (skip during fade-in)
    if (alpha >= 1 && (type === 'debuff' || type === 'powerup' || type === 'boss' || type === 'tank')) {
      const glowPulse = 0.4 + 0.6 * Math.sin(now / 200);
      c.shadowColor = color;
      c.shadowBlur = (type === 'boss' ? 40 : 30) * glowPulse;
      c.strokeStyle = color;
      c.lineWidth = type === 'boss' ? 3 : 2;
      c.globalAlpha = alpha * glowPulse * 0.5;
      c.beginPath(); c.roundRect(-boxW / 2 - 6, -boxH / 2 - 6, boxW + 12, boxH + 12, r + 4); c.stroke();
      c.globalAlpha = alpha;
      c.shadowBlur = 0;
    }

    // Box background
    const bgColor = type === 'debuff' ? 'rgba(40, 4, 8, 0.9)'
      : type === 'powerup' ? 'rgba(30, 25, 4, 0.9)'
      : type === 'boss' ? 'rgba(40, 4, 20, 0.92)'
      : type === 'tank' ? 'rgba(35, 18, 4, 0.9)'
      : type === 'splitter' ? 'rgba(4, 30, 15, 0.9)'
      : 'rgba(8, 8, 20, 0.85)';

    c.shadowColor = color;
    c.shadowBlur = targeted ? 25 : (type === 'boss' ? 22 : type !== 'normal' ? 20 : 8);
    c.fillStyle = bgColor;
    c.strokeStyle = color;
    c.lineWidth = type === 'normal' ? (targeted ? 2.5 : 1.5) : (targeted ? 3 : 2.5);
    c.beginPath(); c.roundRect(-boxW / 2, -boxH / 2, boxW, boxH, r); c.fill(); c.stroke();
    c.shadowBlur = 0;

    // HP bar — show for all enemies with segments
    if (enemy.maxSegments > 1) {
      const barW = boxW - 8;
      const barH = 4;
      const barY = boxH / 2 - 7;
      const segW = barW / enemy.maxSegments;

      for (let i = 0; i < enemy.maxSegments; i++) {
        const sx = -boxW / 2 + 4 + i * segW;
        if (i < enemy.currentSegment) {
          // Depleted segment
          c.fillStyle = 'rgba(255,255,255,0.08)';
        } else if (i === enemy.currentSegment) {
          // Current segment — show typing progress
          const typingProgress = word.length > 0 ? typed / word.length : 0;
          c.fillStyle = 'rgba(255,255,255,0.08)';
          c.fillRect(sx + 1, barY, segW - 2, barH);
          c.fillStyle = color;
          c.globalAlpha = alpha * 0.8;
          c.fillRect(sx + 1, barY, (segW - 2) * typingProgress, barH);
          c.globalAlpha = alpha;
          continue;
        } else {
          // Future segment
          c.fillStyle = color;
          c.globalAlpha = alpha * 0.5;
        }
        c.fillRect(sx + 1, barY, segW - 2, barH);
        c.globalAlpha = alpha;
      }
    }

    // Word text
    c.font = `bold ${C.ENEMY_SIZE_BASE}px "Courier New", monospace`;
    c.textBaseline = 'middle';
    c.textAlign = 'left';
    const startX = -metrics.width / 2;
    let cursorX = startX;
    const autoTyped = enemy.autoTyped || 0;
    for (let i = 0; i < word.length; i++) {
      const isAutoTyped = i < autoTyped;
      const isTyped = i < typed;
      if (isAutoTyped && !isTyped) {
        // Faded out by missile — dim and struck-through
        c.fillStyle = 'rgba(255,255,255,0.15)';
        c.shadowBlur = 0;
      } else if (isTyped) {
        c.fillStyle = '#ffffff'; c.shadowColor = '#ffffff'; c.shadowBlur = 6;
      } else {
        c.fillStyle = type === 'debuff' ? 'rgba(255,130,140,0.9)' : type === 'powerup' ? 'rgba(255,230,140,0.9)' : type === 'boss' ? 'rgba(255,140,180,0.9)' : type === 'tank' ? 'rgba(255,200,150,0.9)' : type === 'splitter' ? 'rgba(140,255,180,0.9)' : 'rgba(160,180,220,0.8)';
        c.shadowBlur = 0;
      }
      c.fillText(word[i], cursorX, 1);
      // Strike-through for auto-typed letters
      if (isAutoTyped && !isTyped) {
        const charW = c.measureText(word[i]).width;
        c.fillRect(cursorX, 1, charW, 1.5);
      }
      c.shadowBlur = 0;
      cursorX += c.measureText(word[i]).width;
    }

    // Word preview for multi-segment (if upgrade active)
    if (showPreview && enemy.maxSegments > 1 && enemy.currentSegment < enemy.maxSegments - 1) {
      const nextWord = enemy.wordSegments[enemy.currentSegment + 1];
      c.font = `bold ${Math.round(C.ENEMY_SIZE_BASE * 0.65)}px "Courier New", monospace`;
      c.textAlign = 'center';
      c.fillStyle = 'rgba(160,180,220,0.3)';
      c.fillText(nextWord, 0, -boxH / 2 - 8);
    }

    // Badges
    if (type === 'debuff') this.drawBadge(c, 0, -boxH / 2 - 12, '\u26A0 RUSH', '#ff3344', '#ff3344', now);
    else if (type === 'powerup') {
      const label = enemy.powerupKind === 'shield' ? '\u2666 SHIELD'
        : enemy.powerupKind === 'heal' ? '\u2764 HEAL'
        : '\u2744 FREEZE';
      this.drawBadge(c, 0, -boxH / 2 - 12, label, '#ffcc00', '#ffcc00', now);
    } else if (type === 'boss') {
      this.drawBadge(c, 0, -boxH / 2 - 14, '\uD83D\uDC80 BOSS', C.COLOR_ENEMY_BOSS, C.COLOR_ENEMY_BOSS, now);
    } else if (type === 'tank') {
      this.drawBadge(c, 0, -boxH / 2 - 12, '\uD83D\uDEE1 TANK', C.COLOR_ENEMY_TANK, C.COLOR_ENEMY_TANK, now);
    } else if (type === 'splitter') {
      this.drawBadge(c, 0, -boxH / 2 - 12, '\u2702 SPLIT', C.COLOR_ENEMY_SPLITTER, C.COLOR_ENEMY_SPLITTER, now);
    }

    if (targeted) {
      const pulse = 0.5 + 0.5 * Math.sin(now / 100);
      c.strokeStyle = `rgba(0, 255, 170, ${pulse * 0.5})`;
      c.lineWidth = 3;
      c.beginPath(); c.roundRect(-boxW / 2 - 4, -boxH / 2 - 4, boxW + 8, boxH + 8, r + 2); c.stroke();
    }
    c.restore();
  }

  private getEnemyColor(type: string, enemy: Enemy): string {
    switch (type) {
      case 'debuff': return C.COLOR_ENEMY_DEBUFF;
      case 'powerup': return C.COLOR_ENEMY_POWERUP;
      case 'tank': return C.COLOR_ENEMY_TANK;
      case 'boss': return C.COLOR_ENEMY_BOSS;
      case 'splitter': return C.COLOR_ENEMY_SPLITTER;
      default: return C.COLOR_ENEMY_NORMAL;
    }
  }

  private drawBadge(c: CanvasRenderingContext2D, x: number, y: number, text: string, bg: string, glow: string, now: number): void {
    const pulse = 0.8 + 0.2 * Math.sin(now / 150);
    c.font = 'bold 11px "Courier New", monospace';
    const bw = c.measureText(text).width + 14, bh = 18;
    c.fillStyle = bg; c.shadowColor = glow; c.shadowBlur = 14 * pulse;
    c.beginPath(); c.roundRect(x - bw / 2, y - bh / 2, bw, bh, 5); c.fill();
    c.shadowBlur = 0;
    c.fillStyle = '#000'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(text, x, y);
  }

  drawBullet(bullet: Bullet): void {
    const c = this.ctx;
    const cx = bullet.x + (bullet.targetX - bullet.x) * bullet.progress;
    const cy = bullet.y + (bullet.targetY - bullet.y) * bullet.progress;
    const trail = Math.min(bullet.progress, 0.15);
    const trailX = bullet.x + (bullet.targetX - bullet.x) * (bullet.progress - trail);
    const trailY = bullet.y + (bullet.targetY - bullet.y) * (bullet.progress - trail);
    const grad = c.createLinearGradient(trailX, trailY, cx, cy);
    grad.addColorStop(0, 'rgba(255,255,255,0)');
    grad.addColorStop(1, bullet.color);
    c.strokeStyle = grad; c.lineWidth = 2;
    c.beginPath(); c.moveTo(trailX, trailY); c.lineTo(cx, cy); c.stroke();
    c.fillStyle = '#ffffff'; c.shadowColor = bullet.color; c.shadowBlur = 12;
    c.beginPath(); c.arc(cx, cy, 3, 0, Math.PI * 2); c.fill();
    c.shadowBlur = 0;
  }

  drawParticle(p: Particle): void {
    const c = this.ctx;
    const lr = p.life / p.maxLife;
    c.globalAlpha = lr * 0.8;
    c.fillStyle = p.color; c.shadowColor = p.color; c.shadowBlur = 4;
    c.beginPath(); c.arc(p.x, p.y, (p.size * lr) / 2, 0, Math.PI * 2); c.fill();
    c.shadowBlur = 0; c.globalAlpha = 1;
  }

  drawFlash(color: string, alpha: number): void {
    const c = this.ctx;
    c.fillStyle = color; c.globalAlpha = alpha;
    c.fillRect(0, 0, this._w, this._h);
    c.globalAlpha = 1;
  }

  drawRushOverlay(now: number): void {
    const c = this.ctx;
    const pulse = 0.08 + 0.06 * Math.sin(now / 120);
    c.strokeStyle = `rgba(255, 40, 40, ${pulse * 4})`; c.lineWidth = 8;
    c.beginPath(); c.roundRect(2, 2, this._w - 4, this._h - 4, 6); c.stroke();
    c.strokeStyle = `rgba(255, 80, 60, ${pulse * 2})`; c.lineWidth = 3;
    c.beginPath(); c.roundRect(8, 8, this._w - 16, this._h - 16, 4); c.stroke();
    const grad = c.createRadialGradient(this._w / 2, this._h / 2, this._w * 0.3, this._w / 2, this._h / 2, this._w * 0.7);
    grad.addColorStop(0, 'rgba(255, 0, 0, 0)');
    grad.addColorStop(1, `rgba(255, 0, 0, ${pulse * 0.5})`);
    c.fillStyle = grad; c.fillRect(0, 0, this._w, this._h);
  }

  // ── Visual Effects ──

  drawExplosion(ex: Explosion): void {
    const c = this.ctx;
    const t = 1 - ex.life / ex.maxLife;
    c.save();
    c.globalAlpha = (1 - t) * 0.6;
    c.strokeStyle = ex.color;
    c.lineWidth = 3 * (1 - t);
    c.shadowColor = ex.color;
    c.shadowBlur = 20 * (1 - t);
    c.beginPath();
    c.arc(ex.x, ex.y, ex.radius, 0, Math.PI * 2);
    c.stroke();
    // Inner glow
    c.globalAlpha = (1 - t) * 0.15;
    c.fillStyle = ex.color;
    c.fill();
    c.restore();
  }

  drawLightningArc(arc: LightningArc): void {
    const c = this.ctx;
    const t = arc.life / arc.maxLife;
    c.save();
    c.globalAlpha = t;
    c.strokeStyle = '#88eeff';
    c.lineWidth = 2 + t * 2;
    c.shadowColor = '#44ccff';
    c.shadowBlur = 15 * t;
    c.beginPath();
    for (let i = 0; i < arc.segments.length; i++) {
      const seg = arc.segments[i];
      if (i === 0) c.moveTo(seg.x, seg.y);
      else c.lineTo(seg.x, seg.y);
    }
    c.stroke();
    // Bright core
    c.strokeStyle = '#ffffff';
    c.lineWidth = 1;
    c.shadowBlur = 0;
    c.beginPath();
    for (let i = 0; i < arc.segments.length; i++) {
      const seg = arc.segments[i];
      if (i === 0) c.moveTo(seg.x, seg.y);
      else c.lineTo(seg.x, seg.y);
    }
    c.stroke();
    c.restore();
  }

  drawMissile(m: Missile): void {
    const c = this.ctx;
    c.save();
    // Trail — thick glowing flame
    for (let i = 0; i < m.trail.length; i++) {
      const t = i / m.trail.length;
      // Outer glow
      c.globalAlpha = t * 0.2;
      c.fillStyle = '#ff4400';
      c.beginPath();
      c.arc(m.trail[i].x, m.trail[i].y, 6 * t, 0, Math.PI * 2);
      c.fill();
      // Inner trail
      c.globalAlpha = t * 0.6;
      c.fillStyle = '#ffcc44';
      c.beginPath();
      c.arc(m.trail[i].x, m.trail[i].y, 3 * t, 0, Math.PI * 2);
      c.fill();
    }
    // Outer glow
    c.globalAlpha = 0.4;
    c.fillStyle = '#ff6600';
    c.shadowColor = '#ff6600';
    c.shadowBlur = 20;
    c.beginPath();
    c.arc(m.x, m.y, 8, 0, Math.PI * 2);
    c.fill();
    // Head
    c.globalAlpha = 1;
    c.fillStyle = '#ffffff';
    c.shadowColor = '#ffcc00';
    c.shadowBlur = 15;
    c.beginPath();
    c.arc(m.x, m.y, 4, 0, Math.PI * 2);
    c.fill();
    c.shadowBlur = 0;
    c.restore();
  }

  drawCritSlash(slash: CritSlash, now: number): void {
    const c = this.ctx;
    const t = (now - slash.spawnTime) / slash.duration;
    if (t < 0 || t > 1) return;
    c.save();
    c.translate(slash.x, slash.y);
    c.rotate(slash.angle);

    // Slash extends out then fades
    const len = 60;
    const extend = Math.min(t * 4, 1); // fully extended at 25% of duration
    const fade = t < 0.25 ? 1 : 1 - (t - 0.25) / 0.75;

    // Outer glow
    c.globalAlpha = fade * 0.6;
    c.strokeStyle = '#ff2222';
    c.shadowColor = '#ff0000';
    c.shadowBlur = 25;
    c.lineWidth = 6;
    c.beginPath();
    c.moveTo(-len * extend, 0);
    c.lineTo(len * extend, 0);
    c.stroke();

    // Inner white core
    c.globalAlpha = fade;
    c.strokeStyle = '#ffffff';
    c.shadowColor = '#ff4444';
    c.shadowBlur = 15;
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(-len * extend, 0);
    c.lineTo(len * extend, 0);
    c.stroke();

    c.shadowBlur = 0;
    c.restore();
  }

  drawDamageNumber(dn: DamageNumber): void {
    const c = this.ctx;
    const t = dn.life / dn.maxLife;
    c.save();
    c.globalAlpha = t;
    c.fillStyle = dn.color;
    c.shadowColor = dn.color;
    c.shadowBlur = 8 * t;
    c.font = 'bold 16px "Courier New", monospace';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(dn.text, dn.x, dn.y);
    c.shadowBlur = 0;
    c.restore();
  }

  // ── Upgrade Selection Screen ──

  drawUpgradeSelect(options: UpgradeDef[], currentUpgrades: Map<string, number>, now: number): void {
    const c = this.ctx;
    c.fillStyle = 'rgba(4, 4, 12, 0.97)';
    c.fillRect(0, 0, this._w, this._h);

    const cx = this._w / 2;

    // Title
    const pulse = 0.8 + 0.2 * Math.sin(now / 300);
    c.fillStyle = C.COLOR_COMBO;
    c.shadowColor = C.COLOR_COMBO;
    c.shadowBlur = 20 * pulse;
    c.font = 'bold 28px "Courier New", monospace';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    // Vertically center: title + gap + cards + loadout + gap + hint
    const titleH = 28;
    const titleGap = 20;
    const hintH = 20;
    const hintGap = 16;
    const hasOwned = ALL_UPGRADES.some(u => (currentUpgrades.get(u.id) || 0) > 0);
    const loadoutH = hasOwned ? 16 + 80 : 0; // divider gap + ship area
    const totalH = titleH + titleGap + CARD_H + loadoutH + hintGap + hintH;
    const topY = (this._h - totalH) / 2;

    c.fillText('CHOOSE YOUR UPGRADE', cx, topY + titleH / 2);
    c.shadowBlur = 0;

    // Cards
    const totalW = options.length * CARD_W + (options.length - 1) * CARD_GAP;
    const startX = cx - totalW / 2;
    const cardY = topY + titleH + titleGap;

    this.upgradeCardBounds = [];

    for (let i = 0; i < options.length; i++) {
      const u = options[i];
      const cardX = startX + i * (CARD_W + CARD_GAP);
      const stacks = currentUpgrades.get(u.id) || 0;

      this.upgradeCardBounds.push({ x: cardX, y: cardY, w: CARD_W, h: CARD_H });

      // Card hover pulse
      const cardPulse = 0.9 + 0.1 * Math.sin(now / 400 + i * 1.5);

      // Card background
      c.fillStyle = 'rgba(10, 10, 30, 0.95)';
      c.strokeStyle = u.color;
      c.lineWidth = 2;
      c.shadowColor = u.color;
      c.shadowBlur = 12 * cardPulse;
      c.beginPath();
      c.roundRect(cardX, cardY, CARD_W, CARD_H, 12);
      c.fill();
      c.stroke();
      c.shadowBlur = 0;

      const ccx = cardX + CARD_W / 2;
      c.textAlign = 'center';
      c.textBaseline = 'middle';

      // ── Top: colored accent line ──
      c.fillStyle = u.color;
      c.globalAlpha = 0.6;
      c.beginPath();
      c.roundRect(cardX + 1, cardY + 1, CARD_W - 2, 3, [12, 12, 0, 0]);
      c.fill();
      c.globalAlpha = 1;

      // ── Icon (hero element) ──
      c.font = '44px sans-serif';
      c.fillText(u.icon, ccx, cardY + 40);

      // ── Name ──
      c.fillStyle = '#ffffff';
      c.font = 'bold 15px "Courier New", monospace';
      c.fillText(u.name, ccx, cardY + 74);

      // ── Level indicator: compact "LV 0 → 1" ──
      c.font = 'bold 13px "Courier New", monospace';
      c.fillStyle = u.color;
      c.fillText(`LVL ${stacks} \u2192 ${stacks + 1}`, ccx, cardY + 98);

      // ── Divider line ──
      c.strokeStyle = 'rgba(255,255,255,0.06)';
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(cardX + 20, cardY + 112);
      c.lineTo(cardX + CARD_W - 20, cardY + 112);
      c.stroke();

      // ── Effect: what this level gives you ──
      let ey = cardY + 130;
      c.font = '12px "Courier New", monospace';
      if (stacks > 0 && u.levelDescriptions[stacks - 1]) {
        c.fillStyle = 'rgba(180, 200, 230, 0.4)';
        c.fillText(u.levelDescriptions[stacks - 1], ccx, ey);
        ey += 18;
      }
      if (u.levelDescriptions[stacks]) {
        c.fillStyle = u.color;
        c.shadowColor = u.color;
        c.shadowBlur = 4;
        c.font = 'bold 12px "Courier New", monospace';
        c.fillText(`\u2192 ${u.levelDescriptions[stacks]}`, ccx, ey);
        c.shadowBlur = 0;
        ey += 18;
      }

      // ── Description (muted, word-wrapped) ──
      ey += 4;
      c.fillStyle = 'rgba(160, 180, 220, 0.4)';
      c.font = '10px "Courier New", monospace';
      const words = u.description.split(' ');
      const lines: string[] = [];
      let currentLine = '';
      for (const word of words) {
        const test = currentLine ? currentLine + ' ' + word : word;
        if (c.measureText(test).width > CARD_W - 32) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = test;
        }
      }
      if (currentLine) lines.push(currentLine);
      for (let l = 0; l < lines.length; l++) {
        c.fillText(lines[l], ccx, ey + l * 13);
      }

      // ── Progress bar (bottom area) ──
      const barY = cardY + CARD_H - 46;
      const barW = CARD_W - 32;
      const segGap = 3;
      const segW = (barW - (u.maxStacks - 1) * segGap) / u.maxStacks;
      const barX = cardX + 16;
      for (let s = 0; s < u.maxStacks; s++) {
        const sx = barX + s * (segW + segGap);
        if (s < stacks) {
          c.fillStyle = u.color;
          c.globalAlpha = 0.8;
        } else if (s === stacks) {
          c.fillStyle = u.color;
          c.globalAlpha = 0.3 + 0.3 * Math.sin(now / 300 + i);
        } else {
          c.fillStyle = 'rgba(255,255,255,0.08)';
          c.globalAlpha = 1;
        }
        c.beginPath();
        c.roundRect(sx, barY, segW, 5, 2);
        c.fill();
        c.globalAlpha = 1;
      }

      // ── Key hint ──
      c.fillStyle = 'rgba(255,255,255,0.3)';
      c.font = 'bold 15px "Courier New", monospace';
      c.fillText(`[${i + 1}]`, ccx, cardY + CARD_H - 18);
      c.textBaseline = 'alphabetic';
    }

    // ── Ship Loadout ──
    const owned = ALL_UPGRADES.filter(u => (currentUpgrades.get(u.id) || 0) > 0);
    if (owned.length > 0) {
      const loadoutY = cardY + CARD_H + 16;
      const shipAreaH = 80;
      const shipCenterY = loadoutY + shipAreaH / 2;

      // Subtle divider line
      c.strokeStyle = 'rgba(255,255,255,0.06)';
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(cx - 120, loadoutY);
      c.lineTo(cx + 120, loadoutY);
      c.stroke();

      // Draw the ship in the center
      const totalLevels = Array.from(currentUpgrades.values()).reduce((a, b) => a + b, 0);
      c.save();
      this.drawCannon(cx, shipCenterY + 8, totalLevels, now);
      c.restore();

      // Upgrade badges on both sides of the ship
      const badgeW = 40;
      const badgeH = 44;
      const badgeGap = 6;
      const shipGap = 50; // gap between ship and nearest badge

      // Split owned into left and right
      const leftUpgrades = owned.slice(0, Math.ceil(owned.length / 2));
      const rightUpgrades = owned.slice(Math.ceil(owned.length / 2));

      // Draw badges on one side
      const drawSideBadges = (upgrades: typeof owned, startX: number, direction: number) => {
        let bx = startX;
        for (const u of upgrades) {
          const stacks = currentUpgrades.get(u.id) || 0;
          const badgeCx = bx + badgeW / 2;
          const badgeCy = shipCenterY;

          // Badge bg with glow
          c.fillStyle = u.color;
          c.globalAlpha = 0.1;
          c.shadowColor = u.color;
          c.shadowBlur = 8;
          c.beginPath();
          c.roundRect(bx, badgeCy - badgeH / 2, badgeW, badgeH, 6);
          c.fill();
          c.shadowBlur = 0;
          c.globalAlpha = 1;

          // Border
          c.strokeStyle = u.color;
          c.globalAlpha = 0.6;
          c.lineWidth = 1;
          c.beginPath();
          c.roundRect(bx, badgeCy - badgeH / 2, badgeW, badgeH, 6);
          c.stroke();
          c.globalAlpha = 1;

          // Icon
          c.font = '18px sans-serif';
          c.textAlign = 'center';
          c.textBaseline = 'middle';
          c.fillText(u.icon, badgeCx, badgeCy - 5);

          // Level pips below icon
          const pipR = 2.5;
          const pipGap2 = 3;
          const totalPipW = u.maxStacks * (pipR * 2) + (u.maxStacks - 1) * pipGap2;
          let px = badgeCx - totalPipW / 2 + pipR;
          const py = badgeCy + 13;
          for (let s = 0; s < u.maxStacks; s++) {
            c.fillStyle = s < stacks ? u.color : 'rgba(255,255,255,0.12)';
            c.globalAlpha = s < stacks ? 1 : 0.5;
            c.beginPath();
            c.arc(px, py, pipR, 0, Math.PI * 2);
            c.fill();
            c.globalAlpha = 1;
            px += pipR * 2 + pipGap2;
          }

          // Connector line from badge to ship
          c.strokeStyle = u.color;
          c.globalAlpha = 0.15;
          c.lineWidth = 1;
          c.setLineDash([2, 3]);
          c.beginPath();
          const lineStartX = direction > 0 ? bx : bx + badgeW;
          c.moveTo(lineStartX, badgeCy);
          c.lineTo(lineStartX + direction * (shipGap - badgeW / 2 - 8), badgeCy);
          c.stroke();
          c.setLineDash([]);
          c.globalAlpha = 1;

          bx += direction * (badgeW + badgeGap);
        }
      };

      // Left side: right-to-left from ship
      const leftStartX = cx - shipGap - badgeW;
      drawSideBadges(leftUpgrades, leftStartX, -1);

      // Right side: left-to-right from ship
      const rightStartX = cx + shipGap;
      drawSideBadges(rightUpgrades, rightStartX, 1);
    }

    // Bottom hint
    c.fillStyle = 'rgba(160,180,220,0.4)';
    c.font = '12px "Courier New", monospace';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('Press 1, 2, or 3 to select \u00B7 Click a card', cx, this._h - 30);
  }


  // ── HUD ──

  drawHUD(
    score: number, combo: number, health: number, maxHealth: number,
    highScore: number, wpm: number, typedBuffer: string,
    debuffs: ActiveDebuff[], powerups: ActivePowerup[], now: number,
    level: number, levelKills: number, levelTarget: number, accuracy: number,
    _pbDelta: number | null, shields: number,
  ): void {
    const c = this.ctx;

    // Score (center)
    c.fillStyle = '#ffffff';
    c.shadowColor = 'rgba(100, 180, 255, 0.5)';
    c.shadowBlur = 15;
    c.font = 'bold 42px "Courier New", monospace';
    c.textAlign = 'center';
    c.textBaseline = 'top';
    c.fillText(score.toString(), this._w / 2, 10);
    c.shadowBlur = 0;


    // Level + progress (left)
    c.font = '13px "Courier New", monospace';
    c.fillStyle = C.COLOR_CANNON;
    c.textAlign = 'left';
    c.fillText(`LVL ${level}`, 16, 14);
    const progW = 80, progH = 6, progX = 16, progY = 32;
    const frac = Math.min(levelKills / levelTarget, 1);
    c.fillStyle = 'rgba(255,255,255,0.08)';
    c.beginPath(); c.roundRect(progX, progY, progW, progH, 3); c.fill();
    c.fillStyle = C.COLOR_CANNON;
    c.beginPath(); c.roundRect(progX, progY, progW * frac, progH, 3); c.fill();
    c.fillStyle = 'rgba(160,180,220,0.5)';
    c.font = '11px "Courier New", monospace';
    c.fillText(`${levelKills}/${levelTarget}`, progX + progW + 8, progY + 5);

    // Combo (top-right, only when active)
    if (combo > 1) {
      c.textAlign = 'right';
      c.font = 'bold 16px "Courier New", monospace';
      c.fillStyle = `rgba(255, 204, 0, ${0.7 + 0.3 * Math.sin(now / 120)})`;
      c.shadowColor = C.COLOR_COMBO; c.shadowBlur = 8;
      c.fillText(`COMBO: ${combo}x`, this._w - 16, 16);
      c.shadowBlur = 0;
    }

    // Health
    const pillW = 20, pillH = 7, pillGap = 4;
    const totalW = maxHealth * pillW + (maxHealth - 1) * pillGap;
    const startX = (this._w - totalW) / 2;
    for (let i = 0; i < maxHealth; i++) {
      const px = startX + i * (pillW + pillGap);
      c.fillStyle = i < health ? C.COLOR_HEALTH_FULL : 'rgba(255,255,255,0.08)';
      if (i < health) { c.shadowColor = C.COLOR_HEALTH_FULL; c.shadowBlur = 6; }
      c.beginPath(); c.roundRect(px, 52, pillW, pillH, pillH / 2); c.fill();
      c.shadowBlur = 0;
    }

    // Shield charges
    if (shields > 0) {
      const shieldX = startX + totalW + 12;
      c.fillStyle = '#88ffff';
      c.shadowColor = '#88ffff';
      c.shadowBlur = 6;
      c.font = 'bold 12px "Courier New", monospace';
      c.textAlign = 'left';
      c.textBaseline = 'middle';
      let sx = shieldX;
      for (let i = 0; i < Math.min(shields, 5); i++) {
        c.beginPath();
        c.moveTo(sx, 58); c.lineTo(sx + 5, 63); c.lineTo(sx, 68); c.lineTo(sx - 5, 63);
        c.closePath(); c.fill();
        sx += 14;
      }
      if (shields > 5) {
        c.fillText(`+${shields - 5}`, sx + 2, 63);
      }
      c.shadowBlur = 0;
    }

    // Typed buffer
    if (typedBuffer.length > 0) {
      c.font = 'bold 26px "Courier New", monospace';
      c.textAlign = 'center';
      c.fillStyle = C.COLOR_CANNON; c.shadowColor = C.COLOR_CANNON; c.shadowBlur = 12;
      c.fillText(typedBuffer, this._w / 2, this._h - 24);
      c.shadowBlur = 0;
    }

    // Active effects
    const effectY = this._h - 70;
    let ex = 16;
    const effectH = 28, effectR = 6;
    c.textBaseline = 'middle';

    for (const d of debuffs) {
      if (d.endsAt <= now) continue;
      const remaining = (d.endsAt - now) / C.DEBUFF_RUSH_DURATION;
      const pulse = 0.7 + 0.3 * Math.sin(now / 100);
      const label = '\u26A0 RUSH';
      c.font = 'bold 13px "Courier New", monospace';
      const tw = c.measureText(label).width + 20;
      c.fillStyle = `rgba(255, 30, 50, ${0.25 * pulse})`;
      c.shadowColor = C.COLOR_ENEMY_DEBUFF; c.shadowBlur = 12 * pulse;
      c.beginPath(); c.roundRect(ex, effectY, tw, effectH, effectR); c.fill();
      c.shadowBlur = 0;
      c.fillStyle = `rgba(255, 50, 70, ${0.7 * pulse})`;
      c.beginPath(); c.roundRect(ex, effectY, tw * remaining, effectH, effectR); c.fill();
      c.strokeStyle = `rgba(255, 80, 100, ${pulse})`;
      c.lineWidth = 1.5;
      c.beginPath(); c.roundRect(ex, effectY, tw, effectH, effectR); c.stroke();
      c.fillStyle = '#ffffff'; c.textAlign = 'center';
      c.fillText(label, ex + tw / 2, effectY + effectH / 2);
      ex += tw + 8;
    }

    for (const p of powerups) {
      if (p.endsAt <= now) continue;
      const remaining = (p.endsAt - now) / C.POWERUP_FREEZE_DURATION;
      const pulse = 0.8 + 0.2 * Math.sin(now / 200);
      const label = p.kind === 'freeze' ? '\u2744 FREEZE' : p.kind.toUpperCase();
      c.font = 'bold 13px "Courier New", monospace';
      const tw = c.measureText(label).width + 20;
      c.fillStyle = `rgba(255, 200, 0, ${0.2 * pulse})`;
      c.shadowColor = C.COLOR_ENEMY_POWERUP; c.shadowBlur = 10 * pulse;
      c.beginPath(); c.roundRect(ex, effectY, tw, effectH, effectR); c.fill();
      c.shadowBlur = 0;
      c.fillStyle = `rgba(255, 210, 50, ${0.5 * pulse})`;
      c.beginPath(); c.roundRect(ex, effectY, tw * remaining, effectH, effectR); c.fill();
      c.strokeStyle = `rgba(255, 220, 80, ${pulse})`;
      c.lineWidth = 1.5;
      c.beginPath(); c.roundRect(ex, effectY, tw, effectH, effectR); c.stroke();
      c.fillStyle = '#ffffff'; c.textAlign = 'center';
      c.fillText(label, ex + tw / 2, effectY + effectH / 2);
      ex += tw + 8;
    }
  }

  // ── Summary stat card ──

  private drawStatCard(stats: RunStats, y: number): number {
    const c = this.ctx;
    const cx = this._w / 2;
    const accuracy = stats.totalKeys > 0 ? Math.round((stats.correctKeys / stats.totalKeys) * 100) : 100;
    const cardW = 340, cardH = 140;
    c.fillStyle = 'rgba(255,255,255,0.03)';
    c.strokeStyle = 'rgba(255,255,255,0.08)';
    c.lineWidth = 1;
    c.beginPath(); c.roundRect(cx - cardW / 2, y, cardW, cardH, 12); c.fill(); c.stroke();

    const rows = [
      ['WORDS KILLED', stats.wordsKilled.toString()],
      ['ACCURACY', `${accuracy}%`],
      ['BEST COMBO', `${stats.longestCombo}x`],
      ['WPM', stats.wpm.toString()],
      ['KEYS', `${stats.correctKeys}/${stats.totalKeys}`],
    ];
    c.textBaseline = 'middle';
    for (let i = 0; i < rows.length; i++) {
      const ry = y + 18 + i * 24;
      c.textAlign = 'left'; c.fillStyle = 'rgba(160,180,220,0.5)';
      c.font = '13px "Courier New", monospace';
      c.fillText(rows[i][0], cx - cardW / 2 + 24, ry);
      c.textAlign = 'right';
      const isAcc = rows[i][0] === 'ACCURACY';
      c.fillStyle = isAcc ? (accuracy >= 90 ? C.COLOR_CANNON : accuracy >= 70 ? C.COLOR_COMBO : C.COLOR_ENEMY_DEBUFF) : '#ffffff';
      c.font = 'bold 14px "Courier New", monospace';
      c.fillText(rows[i][1], cx + cardW / 2 - 24, ry);
    }
    c.textBaseline = 'alphabetic';
    return y + cardH + 12;
  }

  // ── Death screen ──

  drawDeathScreen(
    stats: RunStats, profile: PlayerProfile, canRevive: boolean,
    newTitle: string | null, nemesisLetter: string | null,
  ): void {
    const c = this.ctx;
    c.fillStyle = 'rgba(4, 4, 12, 0.95)';
    c.fillRect(0, 0, this._w, this._h);

    const cx = this._w / 2;
    let y = this._h * 0.04;

    c.fillStyle = C.COLOR_ENEMY_DEBUFF;
    c.shadowColor = C.COLOR_ENEMY_DEBUFF; c.shadowBlur = 25;
    c.font = 'bold 36px "Courier New", monospace';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('DESTROYED', cx, y);
    c.shadowBlur = 0;

    const titleLabel = TITLES_MAP[profile.currentTitle] || 'RECRUIT';
    c.fillStyle = 'rgba(255,200,0,0.5)';
    c.font = '11px "Courier New", monospace';
    c.fillText(`[ ${titleLabel} ]`, cx, y + 22);
    y += 44;

    c.fillStyle = 'rgba(160,180,220,0.5)';
    c.font = '13px "Courier New", monospace';
    c.fillText(`Level ${stats.level}  \u00B7  Best: Level ${profile.highLevel}`, cx, y);
    y += 32;

    c.fillStyle = '#ffffff';
    c.shadowColor = 'rgba(100,180,255,0.4)'; c.shadowBlur = 15;
    c.font = 'bold 48px "Courier New", monospace';
    c.fillText(stats.score.toString(), cx, y);
    c.shadowBlur = 0;
    y += 28;

    const isNewBest = stats.score >= profile.highScore && stats.score > 0;
    if (isNewBest) {
      c.fillStyle = C.COLOR_COMBO; c.shadowColor = C.COLOR_COMBO; c.shadowBlur = 10;
      c.font = 'bold 14px "Courier New", monospace';
      c.fillText('\u2605 NEW BEST \u2605', cx, y);
      c.shadowBlur = 0;
    } else {
      c.fillStyle = 'rgba(160,180,220,0.5)';
      c.font = '13px "Courier New", monospace';
      c.fillText(`BEST: ${profile.highScore}`, cx, y);
    }
    y += 22;

    if (newTitle) {
      c.fillStyle = C.COLOR_COMBO; c.shadowColor = C.COLOR_COMBO; c.shadowBlur = 15;
      c.font = 'bold 14px "Courier New", monospace';
      c.fillText(`TITLE EARNED: ${newTitle}`, cx, y);
      c.shadowBlur = 0;
      y += 20;
    }

    if (nemesisLetter) {
      c.fillStyle = 'rgba(255,100,120,0.7)';
      c.font = '12px "Courier New", monospace';
      c.fillText(`You stumbled on "${nemesisLetter}" this run`, cx, y);
      y += 16;
    }
    y += 6;

    y = this.drawStatCard(stats, y);

    const wpmData = profile.runs.slice(-20).map(r => r.wpm);
    if (wpmData.length >= 2) {
      this.drawSparkline(c, wpmData, cx - 80, y, 160, 30, C.COLOR_CANNON, 'WPM TREND');
      y += 56;
    } else {
      y += 8;
    }

    if (false && canRevive) {
      const bw = 260, bh = 40;
      c.fillStyle = C.COLOR_ENEMY_POWERUP; c.shadowColor = C.COLOR_ENEMY_POWERUP; c.shadowBlur = 20;
      c.beginPath(); c.roundRect(cx - bw / 2, y, bw, bh, 8); c.fill(); c.shadowBlur = 0;
      c.fillStyle = '#000'; c.font = 'bold 14px "Courier New", monospace'; c.textAlign = 'center';
      c.fillText('\u25B6 WATCH AD TO REVIVE', cx, y + bh / 2 + 1);
      y += bh + 14;
    }

    if (Math.sin(Date.now() / 300) > 0) {
      c.fillStyle = 'rgba(200,210,230,0.7)';
      c.font = '14px "Courier New", monospace'; c.textAlign = 'center';
      c.fillText('PRESS ENTER TO RETRY', cx, y);
    }
  }

  // ── Level complete ──

  drawLevelCompleteScreen(stats: RunStats, levelDef: LevelDef, now: number, rewardClaimed = false): void {
    const c = this.ctx;
    c.fillStyle = 'rgba(4, 4, 12, 0.95)';
    c.fillRect(0, 0, this._w, this._h);

    const cx = this._w / 2;
    let y = this._h * 0.08;

    c.fillStyle = C.COLOR_CANNON;
    c.shadowColor = C.COLOR_CANNON; c.shadowBlur = 30;
    c.font = 'bold 40px "Courier New", monospace';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('LEVEL CLEAR', cx, y);
    c.shadowBlur = 0;
    y += 50;

    c.fillStyle = '#ffffff';
    c.shadowColor = 'rgba(100,180,255,0.4)'; c.shadowBlur = 15;
    c.font = 'bold 60px "Courier New", monospace';
    c.fillText(`${stats.level}`, cx, y);
    c.shadowBlur = 0;
    y += 20;

    c.fillStyle = 'rgba(160,180,220,0.5)';
    c.font = '14px "Courier New", monospace';
    c.fillText(`Score: ${stats.score}`, cx, y + 24);
    y += 55;

    y = this.drawStatCard(stats, y);

    const nextLevel = getLevelDef(stats.level + 1);
    c.fillStyle = 'rgba(160,180,220,0.4)';
    c.font = '12px "Courier New", monospace'; c.textAlign = 'center';
    c.fillText(`Next: ${nextLevel.minWordLen}-${nextLevel.maxWordLen} letter words \u00B7 ${nextLevel.wordsToKill} targets`, cx, y + 4);
    y += 28;

    if (false && !rewardClaimed) {
      const bw = 300, bh = 42;
      const btnY = y + 6;
      const gp = 0.7 + 0.3 * Math.sin(now / 200);
      c.fillStyle = `rgba(0, 200, 255, ${gp * 0.15})`;
      c.beginPath(); c.roundRect(cx - bw / 2 - 4, btnY - 4, bw + 8, bh + 8, 12); c.fill();

      c.fillStyle = '#88ffff';
      c.shadowColor = '#88ffff'; c.shadowBlur = 15;
      c.beginPath(); c.roundRect(cx - bw / 2, btnY, bw, bh, 8); c.fill();
      c.shadowBlur = 0;
      c.fillStyle = '#000';
      c.font = 'bold 13px "Courier New", monospace'; c.textAlign = 'center';
      c.fillText('\u25B6 WATCH AD: FULL HEAL + 2 SHIELDS', cx, btnY + bh / 2 + 1);

      c.fillStyle = 'rgba(160,180,220,0.3)';
      c.font = '10px "Courier New", monospace';
      c.fillText('press W or tap', cx, btnY + bh + 14);
      y = btnY + bh + 30;
    }

    if (Math.sin(now / 300) > 0) {
      c.fillStyle = C.COLOR_COMBO; c.shadowColor = C.COLOR_COMBO; c.shadowBlur = 10;
      c.font = 'bold 18px "Courier New", monospace';
      c.fillText('PRESS ENTER TO CONTINUE', cx, y + 4);
      c.shadowBlur = 0;
    }
  }

  // ── Title screen ──

  drawTitleScreen(now: number, profile: PlayerProfile): void {
    const c = this.ctx;
    const cx = this._w / 2;

    c.fillStyle = C.COLOR_CANNON; c.shadowColor = C.COLOR_CANNON; c.shadowBlur = 30;
    c.font = 'bold 48px "Courier New", monospace';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('WORD CANNON', cx, this._h * 0.15);
    c.shadowBlur = 0;

    const hasHeatmap = Object.keys(profile.letterStats).length >= 5;
    if (hasHeatmap) {
      const gridCols = 13;
      const cellW = 22;
      const gridTotalW = gridCols * cellW;
      this.drawLetterHeatMap(c, profile.letterStats, cx - gridTotalW / 2, this._h * 0.28);
    }

    const bestY = this._h * (hasHeatmap ? 0.46 : 0.34);
    if (profile.runs.length > 0) {
      c.fillStyle = '#ffffff';
      c.shadowColor = 'rgba(100,180,255,0.5)'; c.shadowBlur = 12;
      c.font = 'bold 22px "Courier New", monospace';
      c.textAlign = 'center';
      c.fillText(`BEST: ${profile.highScore}  \u00B7  LVL ${profile.highLevel}`, cx, bestY);
      c.shadowBlur = 0;

      const iconX = cx + c.measureText(`BEST: ${profile.highScore}  \u00B7  LVL ${profile.highLevel}`).width / 2 + 20;
      c.fillStyle = 'rgba(100,180,255,0.6)';
      c.font = 'bold 18px "Courier New", monospace';
      c.fillText('\u24D8', iconX, bestY);
      this.statsIconBounds = { x: iconX - 14, y: bestY - 14, w: 28, h: 28 };
    }

    const cardY = this._h * 0.56;
    const cardW = 380, cardH = 90;
    c.fillStyle = 'rgba(255,255,255,0.03)';
    c.strokeStyle = 'rgba(255,255,255,0.06)'; c.lineWidth = 1;
    c.beginPath(); c.roundRect(cx - cardW / 2, cardY, cardW, cardH, 12); c.fill(); c.stroke();
    c.fillStyle = 'rgba(160,180,220,0.55)';
    c.font = '13px "Courier New", monospace';
    c.textAlign = 'center';
    ['Type letters to shoot enemies', 'Gold = power ups  \u00B7  Red = traps', 'Backspace to cancel  \u00B7  ESC to mute'].forEach((line, i) => {
      c.fillText(line, cx, cardY + 22 + i * 22);
    });

    if (Math.sin(now / 300) > 0) {
      c.fillStyle = C.COLOR_COMBO; c.shadowColor = C.COLOR_COMBO; c.shadowBlur = 10;
      c.font = 'bold 18px "Courier New", monospace';
      c.fillText('PRESS ANY KEY TO START', cx, this._h * 0.85);
      c.shadowBlur = 0;
    }
  }

  drawStatsModal(now: number, profile: PlayerProfile): void {
    const c = this.ctx;
    const cx = this._w / 2;
    const cy = this._h / 2;

    c.fillStyle = 'rgba(0,0,0,0.75)';
    c.fillRect(0, 0, this._w, this._h);

    const mw = 420, mh = 340;
    c.fillStyle = 'rgba(10,10,30,0.97)';
    c.strokeStyle = 'rgba(100,180,255,0.2)';
    c.lineWidth = 1;
    c.beginPath(); c.roundRect(cx - mw / 2, cy - mh / 2, mw, mh, 16); c.fill(); c.stroke();

    let y = cy - mh / 2 + 30;
    c.fillStyle = '#ffffff';
    c.font = 'bold 20px "Courier New", monospace';
    c.textAlign = 'center';
    c.fillText('YOUR STATS', cx, y);
    y += 36;

    const rows: [string, string][] = [
      ['Games Played', `${profile.runs.length}`],
      ['Total Words', `${profile.totalWordsKilled}`],
      ['Best Score', `${profile.highScore}`],
      ['Best Level', `${profile.highLevel}`],
      ['Best WPM', `${profile.highWpm}`],
    ];

    if (profile.streakDays > 0) {
      rows.push(['Day Streak', `${profile.streakDays}`]);
    }

    const titleLabel = TITLES_MAP[profile.currentTitle] || 'RECRUIT';
    rows.push(['Rank', titleLabel]);

    c.font = '14px "Courier New", monospace';
    for (const [label, value] of rows) {
      c.fillStyle = 'rgba(160,180,220,0.5)';
      c.textAlign = 'left';
      c.fillText(label, cx - mw / 2 + 30, y);
      c.fillStyle = '#ffffff';
      c.textAlign = 'right';
      c.fillText(value, cx + mw / 2 - 30, y);
      y += 24;
    }

    if (profile.runs.length >= 3) {
      y += 10;
      const sparkW = 110, sparkH = 28, gap = 30;
      const totalSparkW = sparkW * 3 + gap * 2;
      const sparkX = cx - totalSparkW / 2;
      const last20 = profile.runs.slice(-20);
      this.drawSparkline(c, last20.map(r => r.wpm), sparkX, y, sparkW, sparkH, C.COLOR_CANNON, 'WPM', `${last20[last20.length - 1].wpm}`);
      this.drawSparkline(c, last20.map(r => r.accuracy), sparkX + sparkW + gap, y, sparkW, sparkH, C.COLOR_COMBO, 'ACC', `${last20[last20.length - 1].accuracy}%`);
      this.drawSparkline(c, last20.map(r => r.level), sparkX + (sparkW + gap) * 2, y, sparkW, sparkH, C.COLOR_ENEMY_NORMAL, 'LVL', `${last20[last20.length - 1].level}`);
    }

    c.fillStyle = 'rgba(160,180,220,0.4)';
    c.font = '12px "Courier New", monospace';
    c.textAlign = 'center';
    c.fillText('click anywhere to close', cx, cy + mh / 2 - 16);
  }
}

// Title slug → label map for quick lookup
const TITLES_MAP: Record<string, string> = {
  rookie: 'RECRUIT',
  gunner: 'GUNNER',
  sharpshooter: 'SHARPSHOOTER',
  speedster: 'SPEEDSTER',
  marathoner: 'MARATHONER',
  perfectionist: 'PERFECTIONIST',
  veteran: 'VETERAN',
  dedicated: 'DEDICATED',
  machine: 'MACHINE',
  apex: 'APEX TYPIST',
  legend: 'LEGEND',
};
