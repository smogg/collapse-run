import { Cell, Vec2, TurretInstance, UnitInstance, Projectile, AbilityState, FloatingText } from './types';
import { TURRET_DEFS, UNIT_DEFS } from './data/entities';
import { SpriteLoader, SpriteKey } from './SpriteLoader';
import * as C from './config';

type DragSource = { from: 'pool'; poolIndex: number; defId: string }
                | { from: 'squad'; slotIndex: number; defId: string };

export class Renderer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  sprites: SpriteLoader;
  width = C.GAME_WIDTH;
  height = C.GAME_HEIGHT;
  scale = 1;
  offsetX = 0;
  offsetY = 0;
  dpr = 1;
  gridOriginX = 0;
  gridOriginY = 0;
  goButtonRect = { x: 0, y: 0, w: 0, h: 0 };
  squadSlotRects: { x: number; y: number; w: number; h: number }[] = [];
  poolItemRects: { x: number; y: number; w: number; h: number }[] = [];

  constructor(canvas: HTMLCanvasElement, sprites: SpriteLoader) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.sprites = sprites;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    this.dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth; const h = window.innerHeight;
    this.scale = Math.min(w / this.width, h / this.height);
    this.canvas.width = w * this.dpr; this.canvas.height = h * this.dpr;
    this.canvas.style.width = w + 'px'; this.canvas.style.height = h + 'px';
    this.offsetX = (w - this.width * this.scale) / 2;
    this.offsetY = (h - this.height * this.scale) / 2;
    this.gridOriginX = C.GRID_PAD + 20;
    this.gridOriginY = (this.height - C.GRID_SIZE * C.CELL_PX) / 2 - 10;
  }

  clear() {
    const ctx = this.ctx; ctx.save();
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = C.COLOR_BG;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.translate(this.offsetX, this.offsetY);
    ctx.scale(this.scale, this.scale);
  }

  flush() { this.ctx.restore(); }

  screenToGrid(sx: number, sy: number): Vec2 | null {
    const gx = Math.floor(((sx - this.offsetX) / this.scale - this.gridOriginX) / C.CELL_PX);
    const gy = Math.floor(((sy - this.offsetY) / this.scale - this.gridOriginY) / C.CELL_PX);
    return (gx >= 0 && gx < C.GRID_SIZE && gy >= 0 && gy < C.GRID_SIZE) ? { x: gx, y: gy } : null;
  }

  screenToGame(sx: number, sy: number): Vec2 {
    return { x: (sx - this.offsetX) / this.scale, y: (sy - this.offsetY) / this.scale };
  }

  cellToPixel(x: number, y: number): Vec2 {
    return { x: this.gridOriginX + x * C.CELL_PX + C.CELL_PX / 2, y: this.gridOriginY + y * C.CELL_PX + C.CELL_PX / 2 };
  }

  private worldToPixel(wx: number, wy: number): Vec2 {
    return { x: this.gridOriginX + wx * C.CELL_PX + C.CELL_PX / 2, y: this.gridOriginY + wy * C.CELL_PX + C.CELL_PX / 2 };
  }

  private drawCellSprite(px: number, py: number, spriteKey: SpriteKey, fallbackColor: string) {
    if (!this.sprites.drawCell(this.ctx, spriteKey, px + 1, py + 1, C.CELL_PX - 2)) {
      this.ctx.fillStyle = fallbackColor;
      this.ctx.fillRect(px + 1, py + 1, C.CELL_PX - 2, C.CELL_PX - 2);
    }
  }

  private drawUnitChip(x: number, y: number, w: number, h: number, defId: string) {
    const ctx = this.ctx;
    const def = UNIT_DEFS[defId];
    if (!this.sprites.drawAt(ctx, defId as SpriteKey, x + 16, y + h / 2, 32)) {
      ctx.fillStyle = def.color;
      ctx.beginPath(); ctx.arc(x + 16, y + h / 2, 8, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = C.COLOR_TEXT; ctx.font = '10px monospace';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(def.name, x + 34, y + h / 2);
  }

  // ── Squad Screen ──

  // Unit type info for roster cards
  private static ROSTER_INFO: { id: string; skill: string; skillDesc: string }[] = [
    { id: 'normal', skill: '', skillDesc: 'No ability' },
    { id: 'tank', skill: 'Shield Wall [1]', skillDesc: 'Taunt + 50% dmg reduce 3s' },
    { id: 'healer', skill: 'Heal Wave [2]', skillDesc: 'Heal nearby allies +8HP' },
  ];

  drawSquadScreen(
    pool: string[], squad: (string | null)[], levelName: string, squadSize: number,
    drag: DragSource | null, dragPos: Vec2 | null, didDrag: boolean,
  ) {
    const ctx = this.ctx;
    const cx = this.width / 2;
    const slotW = 52; const slotH = 52; const slotGap = 2;

    // Title
    ctx.fillStyle = C.COLOR_TEXT; ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText(levelName, cx, 20);

    // ── Squad slots row ──
    const squadY = 52;
    const totalSlotW = squadSize * slotW + (squadSize - 1) * slotGap;
    const slotStartX = cx - totalSlotW / 2;

    ctx.fillStyle = C.COLOR_TEXT_DIM; ctx.font = '10px monospace'; ctx.textAlign = 'left';
    ctx.fillText('YOUR SQUAD — click to remove, drag to reorder', slotStartX, squadY - 12);
    ctx.fillStyle = C.COLOR_ENTRANCE; ctx.font = '10px monospace'; ctx.textAlign = 'right';
    ctx.fillText('FIRST IN >', slotStartX + totalSlotW + 2, squadY - 12);

    this.squadSlotRects = [];
    for (let i = 0; i < squadSize; i++) {
      const visualIdx = squadSize - 1 - i;
      const x = slotStartX + visualIdx * (slotW + slotGap);
      this.squadSlotRects.push({ x, y: squadY, w: slotW, h: slotH });
      const isDragged = drag?.from === 'squad' && drag.slotIndex === i && didDrag;
      const isDropTarget = drag !== null && didDrag && dragPos &&
        !(drag.from === 'squad' && drag.slotIndex === i) &&
        dragPos.x >= x && dragPos.x <= x + slotW && dragPos.y >= squadY && dragPos.y <= squadY + slotH;

      ctx.fillStyle = isDropTarget ? 'rgba(253,203,110,0.15)' : isDragged ? 'rgba(255,255,255,0.01)' : squad[i] ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)';
      ctx.fillRect(x, squadY, slotW, slotH);
      ctx.strokeStyle = isDropTarget ? C.COLOR_SELECTED_TILE : isDragged ? 'rgba(255,255,255,0.05)' : squad[i] ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.07)';
      ctx.lineWidth = isDropTarget ? 2 : 1;
      ctx.strokeRect(x, squadY, slotW, slotH);

      if (squad[i] && !isDragged) {
        // Sprite centered in slot
        const def = UNIT_DEFS[squad[i]!];
        this.sprites.drawAt(ctx, squad[i]! as SpriteKey, x + slotW / 2, squadY + slotH / 2 - 4, 36) ||
          (() => { ctx.fillStyle = def.color; ctx.beginPath(); ctx.arc(x + slotW / 2, squadY + slotH / 2 - 4, 12, 0, Math.PI * 2); ctx.fill(); })();
        // Tiny HP text below sprite
        ctx.fillStyle = C.COLOR_TEXT_DIM; ctx.font = '8px monospace';
        ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        ctx.fillText(`${def.hp}hp`, x + slotW / 2, squadY + slotH - 2);
      } else if (!squad[i]) {
        ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.font = '18px monospace';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('+', x + slotW / 2, squadY + slotH / 2);
      }
    }

    // ── Roster cards ──
    const rosterY = squadY + slotH + 20;
    ctx.fillStyle = C.COLOR_TEXT_DIM; ctx.font = '10px monospace'; ctx.textAlign = 'left';
    ctx.fillText('CHOOSE UNITS — click to add', slotStartX, rosterY - 12);

    const cardW = 240; const cardH = 100; const cardGap = 10;
    const roster = Renderer.ROSTER_INFO;
    const totalCardW = roster.length * cardW + (roster.length - 1) * cardGap;
    const cardStartX = cx - totalCardW / 2;

    // Count available in pool per type
    const poolCounts: Record<string, number> = {};
    for (const id of pool) poolCounts[id] = (poolCounts[id] || 0) + 1;

    // We also need poolItemRects for click detection — one rect per card
    this.poolItemRects = [];

    for (let ci = 0; ci < roster.length; ci++) {
      const info = roster[ci];
      const def = UNIT_DEFS[info.id];
      const count = poolCounts[info.id] || 0;
      const cx2 = cardStartX + ci * (cardW + cardGap);

      // Find first pool index for this type (for click-to-add)
      const poolIdx = pool.indexOf(info.id);
      this.poolItemRects.push({ x: cx2, y: rosterY, w: cardW, h: cardH });

      // Card background
      const isEmpty = count === 0;
      ctx.save();
      ctx.beginPath(); ctx.rect(cx2, rosterY, cardW, cardH); ctx.clip();
      ctx.fillStyle = isEmpty ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.05)';
      ctx.fillRect(cx2, rosterY, cardW, cardH);

      // Sprite
      const spriteX = cx2 + 30; const spriteY = rosterY + 30;
      if (!this.sprites.drawAt(ctx, info.id as SpriteKey, spriteX, spriteY, 40)) {
        ctx.fillStyle = def.color;
        ctx.beginPath(); ctx.arc(spriteX, spriteY, 14, 0, Math.PI * 2); ctx.fill();
      }

      // Name + HP
      const textX = cx2 + 58;
      ctx.fillStyle = isEmpty ? C.COLOR_TEXT_DIM : C.COLOR_TEXT;
      ctx.font = 'bold 13px monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText(def.name, textX, rosterY + 8);

      ctx.fillStyle = isEmpty ? C.COLOR_TEXT_DIM : '#ddd';
      ctx.font = '11px monospace';
      ctx.fillText(`${def.hp} HP`, textX + 70, rosterY + 10);

      // Skill
      if (info.skill) {
        ctx.fillStyle = def.color; ctx.font = 'bold 10px monospace';
        ctx.fillText(info.skill, textX, rosterY + 30);
        ctx.fillStyle = C.COLOR_TEXT_DIM; ctx.font = '10px monospace';
        ctx.fillText(info.skillDesc, textX, rosterY + 44);
      } else {
        ctx.fillStyle = C.COLOR_TEXT_DIM; ctx.font = '10px monospace';
        ctx.fillText(info.skillDesc, textX, rosterY + 30);
      }

      // Count badge
      ctx.fillStyle = isEmpty ? C.COLOR_TEXT_DIM : def.color;
      ctx.font = 'bold 12px monospace'; ctx.textAlign = 'left';
      ctx.fillText(`x${count} available`, cx2 + 58, rosterY + cardH - 20);

      ctx.restore();
      // Card border (outside clip)
      ctx.strokeStyle = isEmpty ? 'rgba(255,255,255,0.06)' : def.color;
      ctx.lineWidth = 1;
      ctx.strokeRect(cx2, rosterY, cardW, cardH);
    }

    // Drag ghost
    if (drag && dragPos && didDrag) {
      const dx = dragPos.x - slotW / 2; const dy = dragPos.y - slotH / 2;
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(dx, dy, slotW, slotH);
      ctx.strokeStyle = C.COLOR_SELECTED_TILE; ctx.lineWidth = 2; ctx.strokeRect(dx, dy, slotW, slotH);
      const def = UNIT_DEFS[drag.defId];
      this.sprites.drawAt(ctx, drag.defId as SpriteKey, dx + slotW / 2, dy + slotH / 2, 36) ||
        (() => { ctx.fillStyle = def.color; ctx.beginPath(); ctx.arc(dx + slotW / 2, dy + slotH / 2, 12, 0, Math.PI * 2); ctx.fill(); })();
      ctx.globalAlpha = 1;
    }

    // GO button
    const isFull = squad.every(s => s !== null);
    const filledCount = squad.filter(s => s !== null).length;
    const btnW = 160; const btnH = 36; const btnX = cx - btnW / 2;
    const btnY = rosterY + cardH + 16;
    this.goButtonRect = { x: btnX, y: btnY, w: btnW, h: btnH };
    ctx.fillStyle = isFull ? C.COLOR_BUTTON : C.COLOR_BUTTON_DISABLED;
    ctx.fillRect(btnX, btnY, btnW, btnH);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(isFull ? 'GO!' : `${filledCount} / ${squadSize}`, btnX + btnW / 2, btnY + btnH / 2);
  }

  // ── Grid ──

  drawGrid(cells: Cell[][]) {
    const ctx = this.ctx;
    const gx = this.gridOriginX; const gy = this.gridOriginY;
    for (let y = 0; y < C.GRID_SIZE; y++) {
      for (let x = 0; x < C.GRID_SIZE; x++) {
        const px = gx + x * C.CELL_PX; const py = gy + y * C.CELL_PX;
        const cell = cells[y][x];
        switch (cell.type) {
          case 'empty': ctx.fillStyle = '#2a2a3a'; ctx.fillRect(px + 1, py + 1, C.CELL_PX - 2, C.CELL_PX - 2); break;
          case 'wall': this.drawCellSprite(px, py, 'wall', C.COLOR_CELL_WALL); break;
          case 'route': this.drawCellSprite(px, py, 'route', C.COLOR_CELL_ROUTE); break;
          case 'entrance': this.drawCellSprite(px, py, 'entrance', C.COLOR_ENTRANCE); break;
          case 'exit': this.drawCellSprite(px, py, 'exit', C.COLOR_EXIT); break;
          case 'turret': this.drawCellSprite(px, py, 'wall', C.COLOR_CELL_WALL); break;
        }
      }
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1;
    for (let i = 0; i <= C.GRID_SIZE; i++) {
      ctx.beginPath(); ctx.moveTo(gx + i * C.CELL_PX, gy); ctx.lineTo(gx + i * C.CELL_PX, gy + C.GRID_SIZE * C.CELL_PX); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(gx, gy + i * C.CELL_PX); ctx.lineTo(gx + C.GRID_SIZE * C.CELL_PX, gy + i * C.CELL_PX); ctx.stroke();
    }
  }

  drawPathLine(path: Vec2[]) {
    const ctx = this.ctx;
    ctx.strokeStyle = 'rgba(255,255,200,0.15)'; ctx.lineWidth = 2; ctx.setLineDash([4, 3]);
    ctx.beginPath();
    for (let i = 0; i < path.length; i++) {
      const p = this.cellToPixel(path[i].x, path[i].y);
      if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke(); ctx.setLineDash([]);
  }

  drawTurrets(turrets: TurretInstance[], showRanges: boolean) {
    const ctx = this.ctx;
    for (const turret of turrets) {
      const tDef = TURRET_DEFS[turret.defId];
      const center = this.cellToPixel(turret.pos.x, turret.pos.y);
      if (showRanges) {
        const rangePx = tDef.range * C.CELL_PX;
        ctx.fillStyle = C.COLOR_TURRET_RANGE; ctx.beginPath(); ctx.arc(center.x, center.y, rangePx, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = C.COLOR_TURRET_RANGE_STROKE; ctx.lineWidth = 1; ctx.stroke();
      }
      const spriteKey: SpriteKey = turret.defId === 'rapid' ? 'turret_rapid' : 'turret_heavy';
      if (!this.sprites.drawAt(ctx, spriteKey, center.x, center.y, C.CELL_PX * 0.85)) {
        ctx.fillStyle = turret.defId === 'rapid' ? C.COLOR_TURRET_RAPID : C.COLOR_TURRET_HEAVY;
        const s = C.CELL_PX * 0.35;
        ctx.beginPath(); ctx.moveTo(center.x, center.y - s); ctx.lineTo(center.x + s, center.y + s * 0.7); ctx.lineTo(center.x - s, center.y + s * 0.7); ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = '#fff'; ctx.font = '9px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText(tDef.name, center.x, center.y + C.CELL_PX * 0.35);
    }
  }

  // ── Units with visual effects ──

  drawUnits(units: UnitInstance[], path: Vec2[], lerpFactor: number, abilities: AbilityState) {
    const ctx = this.ctx;

    for (const unit of units) {
      if (!unit.alive || unit.escaped) continue;
      const def = UNIT_DEFS[unit.defId];
      const lerpMove = (unit.speed / C.TICKS_PER_SECOND) * lerpFactor;
      let pathIdx = unit.pathIndex;
      let prog = unit.progress + lerpMove;
      while (prog >= 1 && pathIdx < path.length - 1) { prog -= 1; pathIdx++; }
      pathIdx = Math.min(pathIdx, path.length - 1); prog = Math.min(prog, 1);
      const next = Math.min(pathIdx + 1, path.length - 1);
      const ux = path[pathIdx].x + (path[next].x - path[pathIdx].x) * prog;
      const uy = path[pathIdx].y + (path[next].y - path[pathIdx].y) * prog;
      const px = this.gridOriginX + ux * C.CELL_PX + C.CELL_PX / 2;
      const py = this.gridOriginY + uy * C.CELL_PX + C.CELL_PX / 2;

      // Shield Wall — golden pulsing shield around tank
      if (abilities.shieldWall.active && unit.defId === 'tank') {
        const pulse = 0.9 + 0.1 * Math.sin(abilities.shieldWall.ticksLeft * 0.3);
        const r = C.CELL_PX * 0.55 * pulse;
        ctx.strokeStyle = '#fdcb6e'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = 'rgba(253, 203, 110, 0.15)';
        ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
      }

      // Heal wave — expanding green ring (flash)
      if (abilities.healingWave.flashTicks > 0 && unit.defId === 'healer') {
        const t = 1 - abilities.healingWave.flashTicks / 15;
        const ringR = 2.5 * C.CELL_PX * t;
        ctx.strokeStyle = `rgba(85, 239, 196, ${1 - t})`;
        ctx.lineWidth = 3 * (1 - t);
        ctx.beginPath(); ctx.arc(px, py, ringR, 0, Math.PI * 2); ctx.stroke();
      }

      // Damage flash
      if (unit.damageFlash > 0) ctx.globalAlpha = 0.6;

      // Unit sprite
      if (!this.sprites.drawAt(ctx, unit.defId as SpriteKey, px, py, C.CELL_PX * 0.8)) {
        ctx.fillStyle = unit.damageFlash > 0 ? C.COLOR_UNIT_DAMAGED : def.color;
        ctx.beginPath(); ctx.arc(px, py, C.CELL_PX * def.radius, 0, Math.PI * 2); ctx.fill();
      }

      if (unit.damageFlash > 0) {
        ctx.globalAlpha = 0.4; ctx.fillStyle = '#ff0000';
        ctx.beginPath(); ctx.arc(px, py, C.CELL_PX * 0.3, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }

      // HP bar
      const hpRatio = unit.hp / unit.maxHp;
      const barW = C.CELL_PX * 0.6; const barH = 4;
      const barX = px - barW / 2; const barY = py - C.CELL_PX * 0.4 - 6;
      ctx.fillStyle = C.COLOR_HP_BAR_BG; ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = hpRatio > 0.3 ? C.COLOR_HP_BAR : C.COLOR_HP_BAR_LOW;
      ctx.fillRect(barX, barY, barW * hpRatio, barH);
    }
  }

  // ── Floating combat text ──

  drawFloatingTexts(texts: FloatingText[]) {
    const ctx = this.ctx;
    for (const ft of texts) {
      const t = 1 - ft.life / ft.maxLife; // 0 = just spawned, 1 = about to die
      const alpha = 1 - t * t; // fade out
      const yOff = -t * 40; // float upward
      const p = this.worldToPixel(ft.x, ft.y);

      ctx.globalAlpha = alpha;
      ctx.fillStyle = ft.color;
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ft.text, p.x, p.y + yOff);
      ctx.globalAlpha = 1;
    }
  }

  drawProjectiles(projectiles: Projectile[]) {
    const ctx = this.ctx;
    for (const proj of projectiles) {
      const sx = this.gridOriginX + proj.startPos.x * C.CELL_PX + C.CELL_PX / 2;
      const sy = this.gridOriginY + proj.startPos.y * C.CELL_PX + C.CELL_PX / 2;
      const ex = this.gridOriginX + proj.endPos.x * C.CELL_PX + C.CELL_PX / 2;
      const ey = this.gridOriginY + proj.endPos.y * C.CELL_PX + C.CELL_PX / 2;
      const px = sx + (ex - sx) * proj.progress;
      const py = sy + (ey - sy) * proj.progress;
      ctx.fillStyle = C.COLOR_PROJECTILE;
      ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(px, py, 2, 0, Math.PI * 2); ctx.fill();
    }
  }

  // ── HUD with 2 abilities ──

  drawSimulatingHUD(
    unitsEscaped: number, unitsKilled: number, totalUnits: number,
    requiredEscapes: number, levelName: string, abilities: AbilityState,
  ) {
    const ctx = this.ctx;
    const rightX = this.gridOriginX + C.GRID_SIZE * C.CELL_PX + 30;

    ctx.fillStyle = C.COLOR_TEXT; ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText(levelName, rightX, this.gridOriginY);

    const statsY = this.gridOriginY + 30; ctx.font = '14px monospace';
    ctx.fillStyle = C.COLOR_ENTRANCE; ctx.fillText(`Escaped: ${unitsEscaped} / ${requiredEscapes}`, rightX, statsY);
    ctx.fillStyle = C.COLOR_EXIT; ctx.fillText(`Lost: ${unitsKilled}`, rightX, statsY + 22);
    ctx.fillStyle = C.COLOR_TEXT_DIM;
    ctx.fillText(`Remaining: ${totalUnits - unitsEscaped - unitsKilled}`, rightX, statsY + 44);

    const barY = statsY + 70; const barW = 180; const barH = 10;
    ctx.fillStyle = C.COLOR_HP_BAR_BG; ctx.fillRect(rightX, barY, barW, barH);
    ctx.fillStyle = C.COLOR_ENTRANCE;
    ctx.fillRect(rightX, barY, barW * Math.min(unitsEscaped / requiredEscapes, 1), barH);
    ctx.strokeStyle = C.COLOR_TEXT_DIM; ctx.lineWidth = 1; ctx.strokeRect(rightX, barY, barW, barH);

    // ── Ability buttons ──
    const abY = barY + 30;
    ctx.fillStyle = C.COLOR_TEXT; ctx.font = 'bold 13px monospace'; ctx.textAlign = 'left';
    ctx.fillText('ABILITIES', rightX, abY);

    const btnW = 180; const btnH = 36;
    const shieldWall = abilities.shieldWall;
    const healWave = abilities.healingWave;

    const abilityDefs = [
      {
        key: '1', name: 'Shield Wall', desc: 'Taunt + 50% dmg reduction 3s',
        used: shieldWall.used, active: shieldWall.active, color: '#fdcb6e',
        timerPct: shieldWall.active ? shieldWall.ticksLeft / 60 : 0,
        charges: shieldWall.used ? 0 : 1, maxCharges: 1,
      },
      {
        key: '2', name: 'Heal Wave', desc: 'Heal nearby allies +8 HP',
        used: healWave.charges === 0, active: false, color: '#55efc4',
        timerPct: 0,
        charges: healWave.charges, maxCharges: healWave.maxCharges,
      },
    ];

    for (let i = 0; i < abilityDefs.length; i++) {
      const ab = abilityDefs[i];
      const by = abY + 22 + i * (btnH + 8);

      // Background
      if (ab.active) {
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(rightX, by, btnW, btnH);
        // Timer bar inside
        ctx.fillStyle = ab.color; ctx.globalAlpha = 0.4;
        ctx.fillRect(rightX, by, btnW * ab.timerPct, btnH);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = ab.color; ctx.lineWidth = 2;
        ctx.strokeRect(rightX, by, btnW, btnH);
      } else if (ab.used) {
        ctx.fillStyle = 'rgba(255,255,255,0.02)'; ctx.fillRect(rightX, by, btnW, btnH);
        ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1;
        ctx.strokeRect(rightX, by, btnW, btnH);
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(rightX, by, btnW, btnH);
        ctx.strokeStyle = ab.color; ctx.lineWidth = 1;
        ctx.strokeRect(rightX, by, btnW, btnH);
      }

      // Key badge
      ctx.fillStyle = ab.used && !ab.active ? C.COLOR_TEXT_DIM : ab.color;
      ctx.font = 'bold 14px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(ab.key, rightX + 16, by + btnH / 2);

      // Name + charges + desc
      ctx.fillStyle = ab.used && !ab.active ? C.COLOR_TEXT_DIM : C.COLOR_TEXT;
      ctx.font = 'bold 11px monospace'; ctx.textAlign = 'left';
      const chargeStr = ab.maxCharges > 1 ? ` (${ab.charges}/${ab.maxCharges})` : '';
      const label = ab.active ? `${ab.name} ACTIVE` : ab.used ? `${ab.name} (used)` : `${ab.name}${chargeStr}`;
      ctx.fillText(label, rightX + 32, by + btnH / 2 - 6);

      ctx.fillStyle = C.COLOR_TEXT_DIM; ctx.font = '9px monospace';
      ctx.fillText(ab.used && !ab.active ? '' : ab.desc, rightX + 32, by + btnH / 2 + 8);
    }
  }

  // ── Result ──

  drawResult(
    victory: boolean, unitsEscaped: number, requiredEscapes: number,
    totalUnits: number, levelName: string, hasNextLevel: boolean,
  ): { retryRect: { x: number; y: number; w: number; h: number }; nextRect: { x: number; y: number; w: number; h: number } | null } {
    const ctx = this.ctx;
    const rightX = this.gridOriginX + C.GRID_SIZE * C.CELL_PX + 30;
    ctx.fillStyle = C.COLOR_TEXT; ctx.font = 'bold 18px monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText(levelName, rightX, this.gridOriginY);
    const resultY = this.gridOriginY + 40;
    ctx.fillStyle = victory ? C.COLOR_ENTRANCE : C.COLOR_EXIT; ctx.font = 'bold 22px monospace';
    ctx.fillText(victory ? 'ESCAPED!' : 'CAPTURED!', rightX, resultY);
    ctx.fillStyle = C.COLOR_TEXT; ctx.font = '14px monospace';
    ctx.fillText(`Escaped: ${unitsEscaped} / ${totalUnits}`, rightX, resultY + 36);
    ctx.fillText(`Required: ${requiredEscapes}`, rightX, resultY + 56);
    const btnW = 160; const btnH = 40; const retryY = resultY + 90;
    const retryRect = { x: rightX, y: retryY, w: btnW, h: btnH };
    ctx.fillStyle = C.COLOR_BUTTON; ctx.fillRect(rightX, retryY, btnW, btnH);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 14px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('RETRY', rightX + btnW / 2, retryY + btnH / 2);
    let nextRect: { x: number; y: number; w: number; h: number } | null = null;
    if (victory && hasNextLevel) {
      const nextY = retryY + 52; nextRect = { x: rightX, y: nextY, w: btnW, h: btnH };
      ctx.fillStyle = C.COLOR_ENTRANCE; ctx.fillRect(rightX, nextY, btnW, btnH);
      ctx.fillStyle = '#fff'; ctx.fillText('NEXT LEVEL', rightX + btnW / 2, nextY + btnH / 2);
    }
    return { retryRect, nextRect };
  }
}
