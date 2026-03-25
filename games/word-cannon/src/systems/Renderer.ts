import { Enemy, Particle, Bullet, ActiveDebuff, ActivePowerup, PlayerProfile } from '../types';
import { RunStats, LevelDef, getLevelDef } from '../Game';
import * as C from '../config';

interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  brightness: number;
}

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

    // Label
    c.fillStyle = 'rgba(160,180,220,0.5)';
    c.font = '10px "Courier New", monospace';
    c.textAlign = 'center';
    c.fillText(label, x + w / 2, y - 6);

    // Line
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

    // Last point dot
    const lastX = x + w;
    const lastY = y + h - ((data[data.length - 1] - min) / range) * h;
    c.fillStyle = color;
    c.beginPath(); c.arc(lastX, lastY, 3, 0, Math.PI * 2); c.fill();

    // Current value
    if (currentVal) {
      c.fillStyle = color;
      c.font = 'bold 12px "Courier New", monospace';
      c.textAlign = 'center';
      c.fillText(currentVal, x + w / 2, y + h + 14);
    }

    // Trend arrow
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

    // Label
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

    // Nemesis callout
    if (nemesis && worstAcc < 0.8) {
      const acc = Math.round(worstAcc * 100);
      c.fillStyle = C.COLOR_ENEMY_DEBUFF;
      c.font = '11px "Courier New", monospace';
      c.textAlign = 'center';
      c.fillText(`NEMESIS: ${nemesis} (${acc}%)`, x + (cols * cellW) / 2, y + 2 * cellH + 16);
    }
  }

  // ── Streak flame ──

  // Draws centered streak: flame icon + "3 DAY STREAK"
  private drawStreakFlame(c: CanvasRenderingContext2D, streak: number, centerX: number, y: number): void {
    if (streak <= 0) return;

    const text = `${streak} DAY STREAK`;
    c.font = 'bold 12px "Courier New", monospace';
    const textW = c.measureText(text).width;
    const flameW = 10;
    const totalW = flameW + 6 + textW;
    const startX = centerX - totalW / 2;

    // Flame shape
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

    // Text
    c.fillStyle = '#ffcc00';
    c.font = 'bold 12px "Courier New", monospace';
    c.textAlign = 'left';
    c.textBaseline = 'middle';
    c.fillText(text, startX + flameW + 6, y - 4);
  }

  // ── Game elements ──

  drawCannon(x: number, y: number): void {
    const c = this.ctx;
    const glowGrad = c.createRadialGradient(x, y + 10, 0, x, y + 10, 50);
    glowGrad.addColorStop(0, 'rgba(0, 255, 170, 0.15)');
    glowGrad.addColorStop(1, 'rgba(0, 255, 170, 0)');
    c.fillStyle = glowGrad;
    c.fillRect(x - 50, y - 30, 100, 60);
    c.fillStyle = C.COLOR_CANNON;
    c.shadowColor = C.COLOR_CANNON;
    c.shadowBlur = 20;
    c.beginPath(); c.moveTo(x, y - 18); c.lineTo(x - 16, y + 10); c.lineTo(x + 16, y + 10); c.closePath(); c.fill();
    c.shadowBlur = 0;
    c.fillStyle = 'rgba(255,255,255,0.2)';
    c.beginPath(); c.moveTo(x, y - 12); c.lineTo(x - 8, y + 4); c.lineTo(x + 8, y + 4); c.closePath(); c.fill();
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

  drawEnemy(enemy: Enemy, now: number, scramble = false): void {
    const c = this.ctx;
    const { x, y, word, typed, type, alpha, scale: s, targeted } = enemy;
    c.save();
    c.globalAlpha = alpha;
    c.translate(x, y);
    c.scale(s, s);
    const color = type === 'debuff' ? C.COLOR_ENEMY_DEBUFF : type === 'powerup' ? C.COLOR_ENEMY_POWERUP : C.COLOR_ENEMY_NORMAL;
    c.font = `bold ${C.ENEMY_SIZE_BASE}px "Courier New", monospace`;
    const metrics = c.measureText(word);
    const pw = 18, ph = 12;
    const boxW = metrics.width + pw * 2;
    const boxH = C.ENEMY_SIZE_BASE + ph * 2;
    const r = 10;
    enemy.width = boxW;
    enemy.height = boxH;
    c.shadowColor = color;
    c.shadowBlur = targeted ? 25 : (type === 'powerup' ? 18 : type === 'debuff' ? 15 : 8);
    c.fillStyle = 'rgba(8, 8, 20, 0.85)';
    c.strokeStyle = color;
    c.lineWidth = targeted ? 2.5 : 1.5;
    c.beginPath(); c.roundRect(-boxW / 2, -boxH / 2, boxW, boxH, r); c.fill(); c.stroke();
    c.shadowBlur = 0;

    const progress = Math.min(y / (this._h - C.CANNON_Y_OFFSET), 1);
    const barW = (boxW - 8) * progress;
    c.fillStyle = progress > 0.7 ? '#ff3344' : progress > 0.4 ? '#ffaa22' : '#44ff88';
    c.globalAlpha = alpha * 0.6;
    c.fillRect(-boxW / 2 + 4, boxH / 2 - 6, barW, 3);
    c.globalAlpha = alpha;

    c.font = `bold ${C.ENEMY_SIZE_BASE}px "Courier New", monospace`;
    c.textBaseline = 'middle';
    c.textAlign = 'left';
    const startX = -metrics.width / 2;
    let cursorX = startX;
    for (let i = 0; i < word.length; i++) {
      const isTyped = i < typed;
      if (isTyped) { c.fillStyle = '#ffffff'; c.shadowColor = '#ffffff'; c.shadowBlur = 6; }
      else { c.fillStyle = type === 'debuff' ? 'rgba(255,130,140,0.9)' : type === 'powerup' ? 'rgba(255,230,140,0.9)' : 'rgba(160,180,220,0.8)'; c.shadowBlur = 0; }
      const jx = scramble && !isTyped ? Math.sin(now / 50 + i * 7) * 3 : 0;
      const jy = scramble && !isTyped ? Math.cos(now / 60 + i * 11) * 3 : 0;
      c.fillText(word[i], cursorX + jx, -1 + jy);
      c.shadowBlur = 0;
      cursorX += c.measureText(word[i]).width;
    }

    if (type === 'debuff') this.drawBadge(c, 0, -boxH / 2 - 10, 'TRAP', '#ff3344', '#ff3344');
    else if (type === 'powerup') this.drawBadge(c, 0, -boxH / 2 - 10, 'POWER', '#ffcc00', '#ffcc00');

    if (targeted) {
      const pulse = 0.5 + 0.5 * Math.sin(now / 100);
      c.strokeStyle = `rgba(0, 255, 170, ${pulse * 0.5})`;
      c.lineWidth = 3;
      c.beginPath(); c.roundRect(-boxW / 2 - 4, -boxH / 2 - 4, boxW + 8, boxH + 8, r + 2); c.stroke();
    }
    c.restore();
  }

  private drawBadge(c: CanvasRenderingContext2D, x: number, y: number, text: string, bg: string, glow: string): void {
    c.font = 'bold 10px "Courier New", monospace';
    const bw = c.measureText(text).width + 10, bh = 14;
    c.fillStyle = bg; c.shadowColor = glow; c.shadowBlur = 8;
    c.beginPath(); c.roundRect(x - bw / 2, y - bh / 2, bw, bh, 4); c.fill();
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
    const pulse = 0.08 + 0.04 * Math.sin(now / 150);
    c.strokeStyle = `rgba(255, 50, 50, ${pulse * 3})`; c.lineWidth = 6;
    c.beginPath(); c.roundRect(3, 3, this._w - 6, this._h - 6, 4); c.stroke();
  }

  drawBlurOverlay(intensity: number): void {
    const c = this.ctx;
    const grad = c.createRadialGradient(this._w / 2, this._h / 2, this._w * 0.1, this._w / 2, this._h / 2, this._w * 0.7);
    grad.addColorStop(0, 'rgba(80, 0, 120, 0)');
    grad.addColorStop(1, `rgba(80, 0, 120, ${intensity * 0.25})`);
    c.fillStyle = grad; c.fillRect(0, 0, this._w, this._h);
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

    // Combo (right of score, only when active)
    if (combo > 1) {
      c.textAlign = 'right';
      c.font = 'bold 16px "Courier New", monospace';
      c.fillStyle = `rgba(255, 204, 0, ${0.7 + 0.3 * Math.sin(now / 120)})`;
      c.shadowColor = C.COLOR_COMBO; c.shadowBlur = 8;
      c.fillText(`${combo}x`, this._w - 16, 16);
      c.shadowBlur = 0;
    }

    // Health
    const pillW = 28, pillH = 10, pillGap = 6;
    const totalW = maxHealth * pillW + (maxHealth - 1) * pillGap;
    const startX = (this._w - totalW) / 2;
    for (let i = 0; i < maxHealth; i++) {
      const px = startX + i * (pillW + pillGap);
      c.fillStyle = i < health ? C.COLOR_HEALTH_FULL : 'rgba(255,255,255,0.08)';
      if (i < health) { c.shadowColor = C.COLOR_HEALTH_FULL; c.shadowBlur = 6; }
      c.beginPath(); c.roundRect(px, 58, pillW, pillH, pillH / 2); c.fill();
      c.shadowBlur = 0;
    }

    // Shield charges (shown as cyan diamonds after health)
    if (shields > 0) {
      const shieldX = startX + totalW + 12;
      c.fillStyle = '#88ffff';
      c.shadowColor = '#88ffff';
      c.shadowBlur = 6;
      c.font = 'bold 12px "Courier New", monospace';
      c.textAlign = 'left';
      c.textBaseline = 'middle';
      // Diamond icons
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

    // Active effects — tiny icons along bottom-left
    let ex = 16;
    const ey = this._h - 48;
    c.font = 'bold 10px "Courier New", monospace';
    c.textBaseline = 'middle';
    for (const d of debuffs) {
      if (d.endsAt > now) {
        c.fillStyle = C.COLOR_ENEMY_DEBUFF;
        c.globalAlpha = 0.5 + 0.3 * Math.sin(now / 150);
        c.fillText(d.kind.toUpperCase(), ex, ey);
        c.globalAlpha = 1;
        ex += c.measureText(d.kind.toUpperCase()).width + 10;
      }
    }
    for (const p of powerups) {
      if (p.endsAt > now) {
        c.fillStyle = C.COLOR_ENEMY_POWERUP;
        c.globalAlpha = 0.6;
        c.fillText(p.kind.toUpperCase(), ex, ey);
        c.globalAlpha = 1;
        ex += c.measureText(p.kind.toUpperCase()).width + 10;
      }
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

    // Title
    c.fillStyle = C.COLOR_ENEMY_DEBUFF;
    c.shadowColor = C.COLOR_ENEMY_DEBUFF; c.shadowBlur = 25;
    c.font = 'bold 36px "Courier New", monospace';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('DESTROYED', cx, y);
    c.shadowBlur = 0;

    // Player title
    const titleLabel = TITLES_MAP[profile.currentTitle] || 'RECRUIT';
    c.fillStyle = 'rgba(255,200,0,0.5)';
    c.font = '11px "Courier New", monospace';
    c.fillText(`[ ${titleLabel} ]`, cx, y + 22);
    y += 44;

    // Level reached + high level
    c.fillStyle = 'rgba(160,180,220,0.5)';
    c.font = '13px "Courier New", monospace';
    c.fillText(`Level ${stats.level}  ·  Best: Level ${profile.highLevel}`, cx, y);
    y += 32;

    // Score
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

    // New title earned
    if (newTitle) {
      c.fillStyle = C.COLOR_COMBO; c.shadowColor = C.COLOR_COMBO; c.shadowBlur = 15;
      c.font = 'bold 14px "Courier New", monospace';
      c.fillText(`TITLE EARNED: ${newTitle}`, cx, y);
      c.shadowBlur = 0;
      y += 20;
    }

    // Nemesis letter callout
    if (nemesisLetter) {
      const ls = stats as RunStats;
      c.fillStyle = 'rgba(255,100,120,0.7)';
      c.font = '12px "Courier New", monospace';
      c.fillText(`You stumbled on "${nemesisLetter}" this run`, cx, y);
      y += 16;
    }
    y += 6;

    // Stat card
    y = this.drawStatCard(stats, y);

    // WPM sparkline (last 20 runs)
    const wpmData = profile.runs.slice(-20).map(r => r.wpm);
    if (wpmData.length >= 2) {
      this.drawSparkline(c, wpmData, cx - 80, y, 160, 30, C.COLOR_CANNON, 'WPM TREND');
      y += 56;
    } else {
      y += 8;
    }

    // Revive button (hidden during Basic Launch — no ads)
    if (false && canRevive) {
      const bw = 260, bh = 40;
      c.fillStyle = C.COLOR_ENEMY_POWERUP; c.shadowColor = C.COLOR_ENEMY_POWERUP; c.shadowBlur = 20;
      c.beginPath(); c.roundRect(cx - bw / 2, y, bw, bh, 8); c.fill(); c.shadowBlur = 0;
      c.fillStyle = '#000'; c.font = 'bold 14px "Courier New", monospace'; c.textAlign = 'center';
      c.fillText('\u25B6 WATCH AD TO REVIVE', cx, y + bh / 2 + 1);
      y += bh + 14;
    }

    // Restart
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

    // Rewarded ad button — full heal + 2 shields (hidden during Basic Launch — no ads)
    if (false && !rewardClaimed) {
      const bw = 300, bh = 42;
      const btnY = y + 6;
      // Pulsing glow
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
    } else {
      // Show claimed confirmation
      c.fillStyle = C.COLOR_CANNON;
      c.font = 'bold 13px "Courier New", monospace'; c.textAlign = 'center';
      c.fillText('\u2713 REWARD CLAIMED', cx, y + 10);
      y += 30;
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

    // Title
    c.fillStyle = C.COLOR_CANNON; c.shadowColor = C.COLOR_CANNON; c.shadowBlur = 30;
    c.font = 'bold 48px "Courier New", monospace';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('WORD CANNON', cx, this._h * 0.15);
    c.shadowBlur = 0;

    // Letter heat map keyboard
    const hasHeatmap = Object.keys(profile.letterStats).length >= 5;
    if (hasHeatmap) {
      const gridCols = 13;
      const cellW = 22;
      const gridTotalW = gridCols * cellW;
      this.drawLetterHeatMap(c, profile.letterStats, cx - gridTotalW / 2, this._h * 0.28);
    }

    // Best score + stats icon
    const bestY = this._h * (hasHeatmap ? 0.46 : 0.34);
    if (profile.runs.length > 0) {
      c.fillStyle = '#ffffff';
      c.shadowColor = 'rgba(100,180,255,0.5)'; c.shadowBlur = 12;
      c.font = 'bold 22px "Courier New", monospace';
      c.textAlign = 'center';
      c.fillText(`BEST: ${profile.highScore}  \u00B7  LVL ${profile.highLevel}`, cx, bestY);
      c.shadowBlur = 0;

      // Stats icon (ℹ)
      const iconX = cx + c.measureText(`BEST: ${profile.highScore}  \u00B7  LVL ${profile.highLevel}`).width / 2 + 20;
      c.fillStyle = 'rgba(100,180,255,0.6)';
      c.font = 'bold 18px "Courier New", monospace';
      c.fillText('\u24D8', iconX, bestY);
      this.statsIconBounds = { x: iconX - 14, y: bestY - 14, w: 28, h: 28 };
    }

    // Instructions card
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

    // Start prompt
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

    // Dim backdrop
    c.fillStyle = 'rgba(0,0,0,0.75)';
    c.fillRect(0, 0, this._w, this._h);

    // Modal card
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

    // Stats rows
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

    // Sparklines if enough data
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

    // Close hint
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
