import { Vec2, UnitInstance, TurretInstance, Projectile, SimEvent, AbilityState } from '../types';
import { TURRET_DEFS, UNIT_DEFS } from '../data/entities';
import { TICKS_PER_SECOND } from '../config';
import { Grid } from './Grid';

const HEALER_RANGE = 1.5;
const HEALER_HPS = 1.0;
const SHIELD_WALL_TICKS = 60; // 3 seconds
const HEALING_WAVE_AMOUNT = 8;
const HEALING_WAVE_RANGE = 2.5;
const HEAL_WAVE_FLASH_TICKS = 15;

export class Simulation {
  path: Vec2[];
  grid: Grid;
  turrets: TurretInstance[];
  units: UnitInstance[] = [];
  projectiles: Projectile[] = [];
  tick = 0;
  unitsEscaped = 0;
  unitsKilled = 0;

  abilities!: AbilityState;

  private squad: string[];
  private spawnInterval: number;
  private spawned = 0;
  private spawnTimer = 0;
  private nextUnitId = 0;

  constructor(path: Vec2[], turretPlacements: { pos: Vec2; defId: string }[], squad: string[], spawnInterval: number, grid: Grid) {
    this.path = path;
    this.grid = grid;
    this.squad = squad;
    this.spawnInterval = spawnInterval;

    const healerCount = squad.filter(id => id === 'healer').length;
    this.abilities = {
      shieldWall: { used: false, active: false, ticksLeft: 0 },
      healingWave: { charges: healerCount, maxCharges: healerCount, flashTicks: 0 },
    };

    this.turrets = turretPlacements.map(t => ({
      defId: t.defId,
      pos: { x: t.pos.x, y: t.pos.y },
      cooldown: 0,
      targetUnitId: null,
    }));
  }

  get totalUnits(): number { return this.squad.length; }

  isComplete(): boolean {
    if (this.spawned < this.squad.length) return false;
    return this.units.every(u => !u.alive || u.escaped);
  }

  activateShieldWall(): SimEvent[] {
    if (this.abilities.shieldWall.used) return [];
    const tank = this.units.find(u => u.defId === 'tank' && u.alive && !u.escaped);
    if (!tank) return [];
    this.abilities.shieldWall.used = true;
    this.abilities.shieldWall.active = true;
    this.abilities.shieldWall.ticksLeft = SHIELD_WALL_TICKS;
    const pos = this.getUnitPos(tank);
    return [{ type: 'shield_wall_activated', pos }];
  }

  private healWaveUsedIds = new Set<number>();

  activateHealingWave(): SimEvent[] {
    if (this.abilities.healingWave.charges <= 0) return [];
    // Find next alive healer that hasn't been used yet
    const healer = this.units.find(u => u.defId === 'healer' && u.alive && !u.escaped && !this.healWaveUsedIds.has(u.id));
    if (!healer) return [];
    this.healWaveUsedIds.add(healer.id);
    this.abilities.healingWave.charges--;
    this.abilities.healingWave.flashTicks = HEAL_WAVE_FLASH_TICKS;
    const healerPos = this.getUnitPos(healer);
    const events: SimEvent[] = [{ type: 'heal_wave_activated', pos: healerPos }];
    for (const unit of this.units) {
      if (!unit.alive || unit.escaped) continue;
      const pos = this.getUnitPos(unit);
      const dx = pos.x - healerPos.x;
      const dy = pos.y - healerPos.y;
      if (dx * dx + dy * dy <= HEALING_WAVE_RANGE * HEALING_WAVE_RANGE) {
        const healed = Math.min(unit.maxHp - unit.hp, HEALING_WAVE_AMOUNT);
        if (healed > 0) {
          unit.hp += healed;
          events.push({ type: 'unit_healed', unitId: unit.id, amount: Math.round(healed), pos });
        }
      }
    }
    return events;
  }

  step(): SimEvent[] {
    const events: SimEvent[] = [];
    this.tick++;

    // Tick ability timers
    if (this.abilities.shieldWall.active) {
      this.abilities.shieldWall.ticksLeft--;
      if (this.abilities.shieldWall.ticksLeft <= 0) this.abilities.shieldWall.active = false;
    }
    if (this.abilities.healingWave.flashTicks > 0) {
      this.abilities.healingWave.flashTicks--;
    }

    // 1. Auto-spawn
    if (this.spawned < this.squad.length) {
      this.spawnTimer++;
      if (this.spawnTimer >= this.spawnInterval || this.spawned === 0) {
        this.spawnTimer = 0;
        const defId = this.squad[this.spawned];
        const def = UNIT_DEFS[defId];
        this.units.push({
          id: this.nextUnitId++,
          defId,
          hp: def.hp,
          maxHp: def.hp,
          speed: def.speed,
          pathIndex: 0,
          progress: 0,
          alive: true,
          escaped: false,
          damageFlash: 0,
        });
        this.spawned++;
      }
    }

    // 2. Move units (all same speed now)
    for (const unit of this.units) {
      if (!unit.alive || unit.escaped) continue;
      const movePerTick = unit.speed / TICKS_PER_SECOND;
      unit.progress += movePerTick;
      while (unit.progress >= 1 && unit.pathIndex < this.path.length - 1) {
        unit.progress -= 1;
        unit.pathIndex++;
      }
      if (unit.pathIndex >= this.path.length - 1 && unit.progress >= 0.5) {
        unit.escaped = true;
        this.unitsEscaped++;
        events.push({ type: 'unit_escaped', unitId: unit.id });
      }
      if (unit.damageFlash > 0) unit.damageFlash--;
    }

    // 3. Turret targeting and firing
    for (const turret of this.turrets) {
      const tDef = TURRET_DEFS[turret.defId];
      let bestUnit: UnitInstance | null = null;
      let bestScore = -1;
      const shieldActive = this.abilities.shieldWall.active;

      for (const unit of this.units) {
        if (!unit.alive || unit.escaped) continue;
        const unitPos = this.getUnitPos(unit);
        const dx = unitPos.x - turret.pos.x;
        const dy = unitPos.y - turret.pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= tDef.range) {
          // Shield Wall: ONLY target tanks
          if (shieldActive && unit.defId !== 'tank') continue;
          const score = unit.pathIndex + unit.progress;
          if (score > bestScore) { bestScore = score; bestUnit = unit; }
        }
      }

      if (shieldActive && (!bestUnit || bestUnit.defId !== 'tank')) {
        turret.targetUnitId = null;
        if (turret.cooldown > 0) turret.cooldown--;
        continue;
      }

      turret.targetUnitId = bestUnit ? bestUnit.id : null;
      if (turret.cooldown > 0) turret.cooldown--;

      if (turret.cooldown <= 0 && bestUnit) {
        turret.cooldown = tDef.fireInterval;
        const unitPos = this.getUnitPos(bestUnit);
        const dx = unitPos.x - turret.pos.x;
        const dy = unitPos.y - turret.pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const travelTicks = Math.max(1, Math.ceil((dist / tDef.projectileSpeed) * TICKS_PER_SECOND));

        this.projectiles.push({
          turretPos: { x: turret.pos.x, y: turret.pos.y },
          targetUnitId: bestUnit.id,
          damage: tDef.damage,
          progress: 0,
          speed: 1 / travelTicks,
          startPos: { x: turret.pos.x, y: turret.pos.y },
          endPos: { x: unitPos.x, y: unitPos.y },
        });
        events.push({ type: 'turret_fire', turretPos: turret.pos, targetUnitId: bestUnit.id });
      }
    }

    // 5. Projectiles
    const deadProjectiles: number[] = [];
    for (let i = 0; i < this.projectiles.length; i++) {
      const proj = this.projectiles[i];
      proj.progress += proj.speed;
      if (proj.progress >= 1) {
        deadProjectiles.push(i);
        const target = this.units.find(u => u.id === proj.targetUnitId);
        if (target && target.alive && !target.escaped) {
          let dmg = proj.damage;
          // Shield Wall: 50% damage reduction on tank
          if (this.abilities.shieldWall.active && target.defId === 'tank') {
            dmg = Math.round(dmg * 0.5);
          }
          target.hp -= dmg;
          target.damageFlash = 4;
          const pos = this.getUnitPos(target);
          events.push({ type: 'unit_hit', unitId: target.id, damage: dmg, pos });
          if (target.hp <= 0) {
            target.alive = false;
            this.unitsKilled++;
            events.push({ type: 'unit_killed', unitId: target.id, pos });
          }
        }
      }
    }
    for (let i = deadProjectiles.length - 1; i >= 0; i--) {
      this.projectiles.splice(deadProjectiles[i], 1);
    }

    return events;
  }

  getUnitPos(unit: UnitInstance): Vec2 {
    const i = Math.min(unit.pathIndex, this.path.length - 1);
    const next = Math.min(i + 1, this.path.length - 1);
    const p = unit.progress;
    return {
      x: this.path[i].x + (this.path[next].x - this.path[i].x) * p,
      y: this.path[i].y + (this.path[next].y - this.path[i].y) * p,
    };
  }
}
