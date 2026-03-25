import { TurretDef, UnitDef } from '../types';

export const TURRET_DEFS: Record<string, TurretDef> = {
  rapid: {
    id: 'rapid',
    name: 'Crossbow',
    range: 2.0,
    damage: 3,
    fireInterval: 8,
    projectileSpeed: 10,
  },
  heavy: {
    id: 'heavy',
    name: 'Cannon',
    range: 3.0,
    damage: 8,
    fireInterval: 20,
    projectileSpeed: 5,
  },
};

export const UNIT_DEFS: Record<string, UnitDef> = {
  normal: {
    id: 'normal',
    name: 'Runner',
    hp: 15,
    speed: 1.5,
    color: '#f39c12',
    radius: 0.26,
  },
  tank: {
    id: 'tank',
    name: 'Tank',
    hp: 35,
    speed: 1.5,
    color: '#e17055',
    radius: 0.35,
  },
  healer: {
    id: 'healer',
    name: 'Healer',
    hp: 12,
    speed: 1.5,
    color: '#55efc4',
    radius: 0.26,
  },
};
