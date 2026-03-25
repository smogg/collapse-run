import { LevelDef, Vec2 } from '../types';

function makePath(...waypoints: Vec2[]): Vec2[] {
  const path: Vec2[] = [];
  for (let i = 0; i < waypoints.length; i++) {
    const from = waypoints[i];
    if (i === 0) path.push({ x: from.x, y: from.y });
    if (i < waypoints.length - 1) {
      const to = waypoints[i + 1];
      const dx = Math.sign(to.x - from.x);
      const dy = Math.sign(to.y - from.y);
      let cx = from.x, cy = from.y;
      while (cx !== to.x || cy !== to.y) { cx += dx; cy += dy; path.push({ x: cx, y: cy }); }
    }
  }
  return path;
}

const STANDARD_POOL = [
  'normal', 'normal', 'normal', 'normal', 'normal',
  'normal', 'normal',
  'tank',
  'healer', 'healer',
];

export const LEVELS: LevelDef[] = [
  // Level 1: The L-Bend
  // Simple L-shaped path, one crossbow right next to the corner.
  // Teaches: ordering matters, some units will take hits at the turn.
  //
  //   W  W  W  W  W  W  W  W  W  W
  //   W  W  W  W  W  W  W  W  W  W
  //   IN .  .  .  .  .  .  .  .  .
  //   .  .  .  .  .  T  .  .  .  .    T = crossbow at (5,3), right on the path bend
  //   .  .  .  .  .  |  .  .  .  .
  //   .  .  .  .  .  |  .  .  .  .
  //   .  .  .  .  .  |  .  .  .  .
  //   .  .  .  .  .  |  .  .  .  .
  //   .  .  .  .  .  |  .  .  .  .
  //   .  .  .  .  .  OUT .  .  .  .
  {
    id: 'level_001',
    name: 'The L-Bend',
    path: makePath(
      { x: 0, y: 2 }, { x: 5, y: 2 },
      { x: 5, y: 9 },
    ),
    walls: [
      ...Array.from({ length: 10 }, (_, x) => ({ x, y: 0 })),
      ...Array.from({ length: 10 }, (_, x) => ({ x, y: 1 })),
    ],
    turrets: [
      { pos: { x: 6, y: 4 }, defId: 'rapid' },  // 1 cell from the vertical path
    ],
    availableUnits: [...STANDARD_POOL],
    squadSize: 10,
    spawnInterval: 8,
    requiredEscapes: 7,
  },

  // Level 2: The Zigzag
  // Path zigzags across the grid. Two crossbows at the bends.
  // Teaches: tank taunt — put tank ahead to absorb fire at each bend.
  {
    id: 'level_002',
    name: 'The Zigzag',
    path: makePath(
      { x: 0, y: 0 }, { x: 7, y: 0 },
      { x: 7, y: 4 },
      { x: 2, y: 4 },
      { x: 2, y: 9 },
    ),
    walls: [],
    turrets: [
      { pos: { x: 8, y: 2 }, defId: 'rapid' },  // covers the right vertical section
      { pos: { x: 1, y: 6 }, defId: 'rapid' },  // covers the left vertical section
    ],
    availableUnits: [...STANDARD_POOL],
    squadSize: 10,
    spawnInterval: 7,
    requiredEscapes: 6,
  },

  // Level 3: The U-Turn
  // Long U-shaped path with turrets covering both straight sections.
  // Teaches: healer placement — put healer near tank to sustain through sustained fire.
  {
    id: 'level_003',
    name: 'The U-Turn',
    path: makePath(
      { x: 0, y: 1 }, { x: 8, y: 1 },
      { x: 8, y: 5 },
      { x: 1, y: 5 },
      { x: 1, y: 9 },
    ),
    walls: [
      ...Array.from({ length: 10 }, (_, x) => ({ x, y: 0 })),
    ],
    turrets: [
      { pos: { x: 5, y: 2 }, defId: 'rapid' },  // covers top horizontal
      { pos: { x: 4, y: 6 }, defId: 'rapid' },  // covers bottom horizontal
    ],
    availableUnits: [...STANDARD_POOL],
    squadSize: 10,
    spawnInterval: 7,
    requiredEscapes: 7,
  },

  // Level 4: The Gauntlet
  // Triple zigzag with a crossbow AND a cannon.
  // Teaches: cannon does massive damage, armor tiles matter.
  {
    id: 'level_004',
    name: 'The Gauntlet',
    path: makePath(
      { x: 0, y: 0 }, { x: 8, y: 0 },
      { x: 8, y: 4 },
      { x: 1, y: 4 },
      { x: 1, y: 8 },
      { x: 9, y: 8 },
    ),
    walls: [],
    turrets: [
      { pos: { x: 9, y: 2 }, defId: 'rapid' },  // covers right vertical drop
      { pos: { x: 0, y: 6 }, defId: 'heavy' },  // cannon covers left vertical drop
    ],
    availableUnits: [...STANDARD_POOL],
    squadSize: 10,
    spawnInterval: 6,
    requiredEscapes: 5,
  },

  // Level 5: The Spiral
  // Path spirals inward. Three turrets covering different zones.
  // The ultimate test of squad composition and ordering.
  {
    id: 'level_005',
    name: 'The Spiral',
    path: makePath(
      { x: 0, y: 0 }, { x: 9, y: 0 },
      { x: 9, y: 9 },
      { x: 2, y: 9 },
      { x: 2, y: 3 },
      { x: 7, y: 3 },
      { x: 7, y: 7 },
      { x: 4, y: 7 },
    ),
    walls: [],
    turrets: [
      { pos: { x: 8, y: 1 }, defId: 'rapid' },  // covers top-right corner
      { pos: { x: 1, y: 8 }, defId: 'rapid' },  // covers bottom-left turn
      { pos: { x: 5, y: 5 }, defId: 'heavy' },  // cannon in the center, covers inner spiral
    ],
    availableUnits: [...STANDARD_POOL],
    squadSize: 10,
    spawnInterval: 5,
    requiredEscapes: 3,
  },
];
