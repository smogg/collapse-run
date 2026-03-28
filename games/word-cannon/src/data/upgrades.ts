import { UpgradeDef } from '../types';
import * as C from '../config';

export const ALL_UPGRADES: UpgradeDef[] = [
  // ── WEAPON ──
  {
    id: 'splash_damage',
    name: 'Splash Damage',
    description: 'Kills explode, damaging nearby enemies for 1 segment',
    icon: '\uD83D\uDCA5',
    category: 'weapon',
    maxStacks: 5,
    color: C.COLOR_UPGRADE_WEAPON,
    levelDescriptions: ['80px blast', '110px blast', '145px blast', '185px blast', '230px blast'],
  },
  {
    id: 'homing_missiles',
    name: 'Auto Missile',
    description: 'Each kill launches missiles that auto-type first letters of nearby enemies',
    icon: '\uD83D\uDE80',
    category: 'weapon',
    maxStacks: 5,
    color: C.COLOR_UPGRADE_WEAPON,
    levelDescriptions: ['1 missile, 1 letter', '1 missile, 1 letter', '2 missiles, 2 letters', '2 missiles, 2 letters', '3 missiles, 3 letters'],
  },
  {
    id: 'combo_crits',
    name: 'Combo Crits',
    description: 'Higher combo = higher crit chance',
    icon: '\u26A1',
    category: 'weapon',
    maxStacks: 5,
    color: C.COLOR_UPGRADE_WEAPON,
    levelDescriptions: ['Up to 15% crit', 'Up to 30% crit', 'Up to 45% crit', 'Up to 60% crit', 'Up to 80% crit'],
  },
  // ── DEFENSE ──
  {
    id: 'gravity_well',
    name: 'Gravity Well',
    description: 'All enemies move slower',
    icon: '\uD83C\uDF00',
    category: 'defense',
    maxStacks: 5,
    color: C.COLOR_UPGRADE_DEFENSE,
    levelDescriptions: ['6% slower', '12% slower', '18% slower', '24% slower', '30% slower'],
  },
  {
    id: 'temporal_shield',
    name: 'Temporal Shield',
    description: 'Enemies pause at the bottom before dealing damage',
    icon: '\u23F1\uFE0F',
    category: 'defense',
    maxStacks: 5,
    color: C.COLOR_UPGRADE_DEFENSE,
    levelDescriptions: ['1s pause', '1.5s pause', '2s pause', '2.5s pause', '3s pause'],
  },
];
