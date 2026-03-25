/**
 * Candidate level generator.
 *
 * Generates levels with various path shapes and turret configurations,
 * evaluates each one, and reports which ones hit target difficulty ranges.
 *
 * Run with:
 *
 *   npx tsx src/tools/generate.ts
 */

import { LevelDef, Vec2, TurretPlacement } from '../types';
import { evaluateLevel, LevelMetrics } from './evaluate';

// ---------------------------------------------------------------------------
// Path helpers
// ---------------------------------------------------------------------------

/** Build a path from waypoints, filling in the cells between each pair. */
function makePath(...waypoints: Vec2[]): Vec2[] {
  const path: Vec2[] = [];
  for (let i = 0; i < waypoints.length; i++) {
    const from = waypoints[i];
    if (i === 0) path.push({ x: from.x, y: from.y });
    if (i < waypoints.length - 1) {
      const to = waypoints[i + 1];
      const dx = Math.sign(to.x - from.x);
      const dy = Math.sign(to.y - from.y);
      let cx = from.x;
      let cy = from.y;
      while (cx !== to.x || cy !== to.y) {
        cx += dx;
        cy += dy;
        path.push({ x: cx, y: cy });
      }
    }
  }
  return path;
}

/** Standard 10-unit pool: 5 runners, 1 tank, 2 speedsters, 2 healers. */
const STANDARD_POOL = [
  'normal', 'normal', 'normal', 'normal', 'normal',
  'tank',
  'speedster', 'speedster',
  'healer', 'healer',
];

// ---------------------------------------------------------------------------
// Level template builders
// ---------------------------------------------------------------------------

interface LevelParams {
  id: string;
  name: string;
  path: Vec2[];
  turrets: TurretPlacement[];
  spawnInterval?: number;
  requiredEscapes?: number;
  armorTiles?: number;
  protectionTiles?: number;
}

function buildLevel(params: LevelParams): LevelDef {
  return {
    id: params.id,
    name: params.name,
    path: params.path,
    walls: [], // Generated levels skip walls for simplicity
    turrets: params.turrets,
    availableUnits: [...STANDARD_POOL],
    squadSize: 10,
    spawnInterval: params.spawnInterval ?? 8,
    requiredEscapes: params.requiredEscapes ?? 6,
  };
}

// ---------------------------------------------------------------------------
// Straight path levels
// ---------------------------------------------------------------------------

/**
 * Straight horizontal path at y=4 from x=0 to x=9.
 * Turrets placed above the path at various x positions.
 */
export function generateStraightLevel(
  turretCount: number,
  turretType: string,
  options: {
    spawnInterval?: number;
    requiredEscapes?: number;
    armorTiles?: number;
    protectionTiles?: number;
  } = {},
): LevelDef {
  const path = makePath({ x: 0, y: 4 }, { x: 9, y: 4 });

  // Spread turrets evenly along the path, placed one row above
  const turrets: TurretPlacement[] = [];
  for (let i = 0; i < turretCount; i++) {
    const x = Math.round((i + 1) * 9 / (turretCount + 1));
    turrets.push({ pos: { x, y: 3 }, defId: turretType });
  }

  return buildLevel({
    id: `gen_straight_${turretType}_${turretCount}`,
    name: `Straight ${turretType} x${turretCount}`,
    path,
    turrets,
    ...options,
  });
}

// ---------------------------------------------------------------------------
// Snake path levels
// ---------------------------------------------------------------------------

/**
 * S-shaped path that goes right, down, left, down, right.
 * Turrets placed at the bends where units slow down.
 */
export function generateSnakeLevel(
  turretCount: number,
  turretType: string,
  options: {
    spawnInterval?: number;
    requiredEscapes?: number;
    armorTiles?: number;
    protectionTiles?: number;
  } = {},
): LevelDef {
  const path = makePath(
    { x: 0, y: 1 },
    { x: 8, y: 1 },
    { x: 8, y: 3 },
    { x: 1, y: 3 },
    { x: 1, y: 5 },
    { x: 8, y: 5 },
    { x: 8, y: 7 },
    { x: 0, y: 7 },
  );

  // Place turrets near the bends (inside corners) where they get max exposure
  const turretPositions: Vec2[] = [
    { x: 9, y: 2 },  // right bend 1
    { x: 0, y: 2 },  // covers start of first row
    { x: 0, y: 4 },  // left bend
    { x: 9, y: 4 },  // covers end of second row
    { x: 9, y: 6 },  // right bend 2
    { x: 0, y: 6 },  // covers start of third row
  ];

  const turrets: TurretPlacement[] = [];
  for (let i = 0; i < Math.min(turretCount, turretPositions.length); i++) {
    turrets.push({ pos: turretPositions[i], defId: turretType });
  }

  return buildLevel({
    id: `gen_snake_${turretType}_${turretCount}`,
    name: `Snake ${turretType} x${turretCount}`,
    path,
    turrets,
    ...options,
  });
}

// ---------------------------------------------------------------------------
// Zigzag path levels
// ---------------------------------------------------------------------------

/**
 * Zigzag path that goes diagonally across the grid.
 * Creates a longer path through turret fire.
 */
export function generateZigzagLevel(
  turretCount: number,
  turretType: string,
  options: {
    spawnInterval?: number;
    requiredEscapes?: number;
    armorTiles?: number;
    protectionTiles?: number;
  } = {},
): LevelDef {
  // Zigzag: right segments at alternating y-levels connected by vertical segments
  const path = makePath(
    { x: 0, y: 0 },
    { x: 4, y: 0 },
    { x: 4, y: 2 },
    { x: 0, y: 2 },
    { x: 0, y: 4 },
    { x: 4, y: 4 },
    { x: 4, y: 6 },
    { x: 0, y: 6 },
    { x: 0, y: 9 },
  );

  // Place turrets along the right side, covering the vertical segments
  const turretPositions: Vec2[] = [
    { x: 6, y: 0 },
    { x: 6, y: 1 },
    { x: 6, y: 2 },
    { x: 6, y: 3 },
    { x: 6, y: 4 },
    { x: 6, y: 5 },
    { x: 6, y: 6 },
  ];

  const turrets: TurretPlacement[] = [];
  for (let i = 0; i < Math.min(turretCount, turretPositions.length); i++) {
    turrets.push({ pos: turretPositions[i], defId: turretType });
  }

  return buildLevel({
    id: `gen_zigzag_${turretType}_${turretCount}`,
    name: `Zigzag ${turretType} x${turretCount}`,
    path,
    turrets,
    ...options,
  });
}

// ---------------------------------------------------------------------------
// Gauntlet path levels
// ---------------------------------------------------------------------------

/**
 * Long straight gauntlet with turrets on both sides.
 * Creates a "kill corridor" effect.
 */
export function generateGauntletLevel(
  turretCount: number,
  turretType: string,
  options: {
    spawnInterval?: number;
    requiredEscapes?: number;
    armorTiles?: number;
    protectionTiles?: number;
  } = {},
): LevelDef {
  const path = makePath({ x: 0, y: 4 }, { x: 9, y: 4 });

  // Place turrets alternating above and below the path
  const turrets: TurretPlacement[] = [];
  for (let i = 0; i < turretCount; i++) {
    const x = Math.round((i + 1) * 9 / (turretCount + 1));
    const y = i % 2 === 0 ? 3 : 5;
    turrets.push({ pos: { x, y }, defId: turretType });
  }

  return buildLevel({
    id: `gen_gauntlet_${turretType}_${turretCount}`,
    name: `Gauntlet ${turretType} x${turretCount}`,
    path,
    turrets,
    ...options,
  });
}

// ---------------------------------------------------------------------------
// Mixed turret levels
// ---------------------------------------------------------------------------

/**
 * Straight path with a mix of rapid and heavy turrets.
 */
export function generateMixedTurretLevel(
  rapidCount: number,
  heavyCount: number,
  options: {
    spawnInterval?: number;
    requiredEscapes?: number;
    armorTiles?: number;
    protectionTiles?: number;
  } = {},
): LevelDef {
  const path = makePath({ x: 0, y: 4 }, { x: 9, y: 4 });

  const totalTurrets = rapidCount + heavyCount;
  const turrets: TurretPlacement[] = [];

  for (let i = 0; i < totalTurrets; i++) {
    const x = Math.round((i + 1) * 9 / (totalTurrets + 1));
    const y = i % 2 === 0 ? 3 : 5;
    const defId = i < rapidCount ? 'rapid' : 'heavy';
    turrets.push({ pos: { x, y }, defId });
  }

  return buildLevel({
    id: `gen_mixed_r${rapidCount}_h${heavyCount}`,
    name: `Mixed R${rapidCount} H${heavyCount}`,
    path,
    turrets,
    ...options,
  });
}

// ---------------------------------------------------------------------------
// Candidate generation
// ---------------------------------------------------------------------------

interface CandidateResult {
  level: LevelDef;
  metrics: LevelMetrics;
  elapsedMs: number;
}

function evaluateCandidate(level: LevelDef): CandidateResult {
  const start = performance.now();
  const metrics = evaluateLevel(level);
  const elapsedMs = performance.now() - start;
  return { level, metrics, elapsedMs };
}

// ---------------------------------------------------------------------------
// Pretty printing
// ---------------------------------------------------------------------------

function pct(value: number): string {
  return (value * 100).toFixed(1) + '%';
}

function difficultyLabel(score: number): string {
  if (score <= 15) return 'TRIVIAL';
  if (score <= 30) return 'EASY';
  if (score <= 45) return 'MEDIUM';
  if (score <= 60) return 'HARD';
  if (score <= 75) return 'VERY HARD';
  return 'EXTREME';
}

function printResults(candidates: CandidateResult[]): void {
  // Sort by difficulty
  candidates.sort((a, b) => a.metrics.difficultyScore - b.metrics.difficultyScore);

  console.log('');
  console.log(`${'='.repeat(115)}`);
  console.log('  GENERATED LEVEL CANDIDATES (sorted by difficulty)');
  console.log(`${'='.repeat(115)}`);

  const header = [
    'Level'.padEnd(24),
    'Perms'.padStart(7),
    'Best'.padStart(6),
    'Avg'.padStart(6),
    'Worst'.padStart(6),
    'Gap'.padStart(6),
    'Fail%'.padStart(7),
    'Diff'.padStart(5),
    'Rating'.padStart(10),
    'Time'.padStart(7),
  ].join(' | ');

  console.log(`  ${header}`);
  console.log(`  ${'-'.repeat(header.length)}`);

  for (const c of candidates) {
    const m = c.metrics;
    const row = [
      m.levelName.padEnd(24),
      m.totalPermutations.toString().padStart(7),
      pct(m.bestSurvivalRate).padStart(6),
      pct(m.avgSurvivalRate).padStart(6),
      pct(m.worstSurvivalRate).padStart(6),
      pct(m.skillGap).padStart(6),
      pct(m.failRate).padStart(7),
      m.difficultyScore.toString().padStart(5),
      difficultyLabel(m.difficultyScore).padStart(10),
      (c.elapsedMs / 1000).toFixed(2).padStart(6) + 's',
    ].join(' | ');
    console.log(`  ${row}`);
  }

  console.log(`  ${'-'.repeat(header.length)}`);

  // Show recommendations
  console.log('');
  console.log('  RECOMMENDATIONS BY DIFFICULTY TIER:');
  console.log('');

  const tiers = [
    { label: 'Tutorial (0-15)', min: 0, max: 15 },
    { label: 'Easy (16-30)', min: 16, max: 30 },
    { label: 'Medium (31-45)', min: 31, max: 45 },
    { label: 'Hard (46-60)', min: 46, max: 60 },
    { label: 'Very Hard (61-75)', min: 61, max: 75 },
    { label: 'Extreme (76-100)', min: 76, max: 100 },
  ];

  for (const tier of tiers) {
    const matches = candidates.filter(
      c => c.metrics.difficultyScore >= tier.min && c.metrics.difficultyScore <= tier.max,
    );
    if (matches.length > 0) {
      console.log(`  ${tier.label}:`);
      for (const c of matches) {
        console.log(`    - ${c.metrics.levelName} (diff=${c.metrics.difficultyScore}, fail=${pct(c.metrics.failRate)}, gap=${pct(c.metrics.skillGap)})`);
      }
    } else {
      console.log(`  ${tier.label}: (none)`);
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  console.log('Dungeon Escape — Level Generator');
  console.log('Generating and evaluating candidate levels...');
  console.log('');

  const candidates: CandidateResult[] = [];

  // --- Straight path variants ---
  console.log('  Straight path levels...');
  candidates.push(evaluateCandidate(generateStraightLevel(1, 'rapid')));
  candidates.push(evaluateCandidate(generateStraightLevel(2, 'rapid')));
  candidates.push(evaluateCandidate(generateStraightLevel(3, 'rapid')));
  candidates.push(evaluateCandidate(generateStraightLevel(1, 'heavy')));
  candidates.push(evaluateCandidate(generateStraightLevel(2, 'heavy')));

  // --- Snake path variants ---
  console.log('  Snake path levels...');
  candidates.push(evaluateCandidate(generateSnakeLevel(2, 'rapid')));
  candidates.push(evaluateCandidate(generateSnakeLevel(3, 'rapid')));
  candidates.push(evaluateCandidate(generateSnakeLevel(4, 'rapid')));
  candidates.push(evaluateCandidate(generateSnakeLevel(2, 'heavy')));
  candidates.push(evaluateCandidate(generateSnakeLevel(3, 'heavy')));

  // --- Zigzag path variants ---
  console.log('  Zigzag path levels...');
  candidates.push(evaluateCandidate(generateZigzagLevel(2, 'rapid')));
  candidates.push(evaluateCandidate(generateZigzagLevel(3, 'rapid')));
  candidates.push(evaluateCandidate(generateZigzagLevel(2, 'heavy')));

  // --- Gauntlet variants ---
  console.log('  Gauntlet levels...');
  candidates.push(evaluateCandidate(generateGauntletLevel(2, 'rapid')));
  candidates.push(evaluateCandidate(generateGauntletLevel(4, 'rapid')));
  candidates.push(evaluateCandidate(generateGauntletLevel(2, 'heavy')));

  // --- Mixed turret variants ---
  console.log('  Mixed turret levels...');
  candidates.push(evaluateCandidate(generateMixedTurretLevel(1, 1)));
  candidates.push(evaluateCandidate(generateMixedTurretLevel(2, 1)));
  candidates.push(evaluateCandidate(generateMixedTurretLevel(2, 2)));
  candidates.push(evaluateCandidate(generateMixedTurretLevel(3, 1)));

  printResults(candidates);
}

main();
