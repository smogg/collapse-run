export interface Vec2 {
  x: number;
  y: number;
}

export type CellType = 'empty' | 'wall' | 'entrance' | 'exit' | 'route' | 'turret';

export interface Cell {
  type: CellType;
  turretDefId?: string;
}

export interface TurretDef {
  id: string;
  name: string;
  range: number;
  damage: number;
  fireInterval: number;
  projectileSpeed: number;
}

export interface UnitDef {
  id: string;
  name: string;
  hp: number;
  speed: number;
  color: string;
  radius: number;
}

export interface TurretPlacement {
  pos: Vec2;
  defId: string;
}

export interface LevelDef {
  id: string;
  name: string;
  path: Vec2[];
  walls: Vec2[];
  turrets: TurretPlacement[];
  availableUnits: string[];
  squadSize: number;
  spawnInterval: number;
  requiredEscapes: number;
}

export interface AbilityState {
  shieldWall: { used: boolean; active: boolean; ticksLeft: number };
  healingWave: { charges: number; maxCharges: number; flashTicks: number };
}

export interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number; // ticks remaining
  maxLife: number;
}

export interface TurretInstance {
  defId: string;
  pos: Vec2;
  cooldown: number;
  targetUnitId: number | null;
}

export interface UnitInstance {
  id: number;
  defId: string;
  hp: number;
  maxHp: number;
  speed: number;
  pathIndex: number;
  progress: number;
  alive: boolean;
  escaped: boolean;
  damageFlash: number;
}

export interface Projectile {
  turretPos: Vec2;
  targetUnitId: number;
  damage: number;
  progress: number;
  speed: number;
  startPos: Vec2;
  endPos: Vec2;
}

export type GamePhase = 'squad' | 'simulating' | 'victory' | 'defeat';

export type SimEvent =
  | { type: 'turret_fire'; turretPos: Vec2; targetUnitId: number }
  | { type: 'unit_hit'; unitId: number; damage: number; pos: Vec2 }
  | { type: 'unit_killed'; unitId: number; pos: Vec2 }
  | { type: 'unit_escaped'; unitId: number }
  | { type: 'unit_healed'; unitId: number; amount: number; pos: Vec2 }
  | { type: 'shield_wall_activated'; pos: Vec2 }
  | { type: 'heal_wave_activated'; pos: Vec2 };
