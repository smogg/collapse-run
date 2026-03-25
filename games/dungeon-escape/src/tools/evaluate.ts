/**
 * Headless simulation evaluator.
 *
 * Brute-forces every unique squad ordering for each level and computes
 * difficulty metrics. Run with:
 *
 *   npx tsx src/tools/evaluate.ts
 */

import { LevelDef } from '../types';
import { Simulation } from '../core/Simulation';
import { Grid } from '../core/Grid';
import { LEVELS } from '../data/levels';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LevelMetrics {
  levelId: string;
  levelName: string;
  totalPermutations: number;
  squadSize: number;
  requiredEscapes: number;
  bestEscaped: number;
  worstEscaped: number;
  bestSurvivalRate: number;
  avgSurvivalRate: number;
  worstSurvivalRate: number;
  skillGap: number;       // best - average
  failRate: number;       // % of orderings that don't meet requiredEscapes
  difficultyScore: number; // 0-100
  bestOrdering: string[];
  worstOrdering: string[];
}

// ---------------------------------------------------------------------------
// Unique permutation generator
// ---------------------------------------------------------------------------

/**
 * Generates all unique permutations of `items`, handling duplicates
 * efficiently via a next-permutation approach on sorted input.
 *
 * For [5 runners, 1 tank, 2 speedsters, 2 healers] this produces
 * 10! / (5! * 2! * 2!) = 7,560 permutations instead of 3,628,800.
 */
export function generateUniquePermutations(items: string[]): string[][] {
  const sorted = [...items].sort();
  const results: string[][] = [];

  // Use iterative next-permutation (lexicographic order).
  // This avoids deep recursion and naturally skips duplicates.
  const arr = [...sorted];
  results.push([...arr]);

  while (true) {
    // Find largest i such that arr[i] < arr[i + 1]
    let i = arr.length - 2;
    while (i >= 0 && arr[i] >= arr[i + 1]) i--;
    if (i < 0) break; // last permutation

    // Find largest j such that arr[i] < arr[j]
    let j = arr.length - 1;
    while (arr[j] <= arr[i]) j--;

    // Swap
    [arr[i], arr[j]] = [arr[j], arr[i]];

    // Reverse from i + 1 to end
    let left = i + 1;
    let right = arr.length - 1;
    while (left < right) {
      [arr[left], arr[right]] = [arr[right], arr[left]];
      left++;
      right--;
    }

    results.push([...arr]);
  }

  return results;
}

// ---------------------------------------------------------------------------
// Single simulation run
// ---------------------------------------------------------------------------

function runSimulation(level: LevelDef, squad: string[]): { escaped: number; killed: number } {
  const grid = new Grid(level);
  const sim = new Simulation(level.path, level.turrets, squad, level.spawnInterval, grid);

  // Safety: cap at 50,000 ticks to avoid infinite loops on bad levels
  let maxTicks = 50_000;
  while (!sim.isComplete() && maxTicks-- > 0) {
    sim.step();
  }

  return { escaped: sim.unitsEscaped, killed: sim.unitsKilled };
}

// ---------------------------------------------------------------------------
// Level evaluator
// ---------------------------------------------------------------------------

export function evaluateLevel(level: LevelDef): LevelMetrics {
  const squad = level.availableUnits.slice(0, level.squadSize);
  const permutations = generateUniquePermutations(squad);

  let bestEscaped = 0;
  let worstEscaped = squad.length;
  let totalEscaped = 0;
  let failCount = 0;
  let bestOrdering = squad;
  let worstOrdering = squad;

  for (const ordering of permutations) {
    const result = runSimulation(level, ordering);
    totalEscaped += result.escaped;

    if (result.escaped > bestEscaped) {
      bestEscaped = result.escaped;
      bestOrdering = ordering;
    }
    if (result.escaped < worstEscaped) {
      worstEscaped = result.escaped;
      worstOrdering = ordering;
    }
    if (result.escaped < level.requiredEscapes) {
      failCount++;
    }
  }

  const n = permutations.length;
  const avgEscaped = totalEscaped / n;

  const bestSurvivalRate = bestEscaped / squad.length;
  const avgSurvivalRate = avgEscaped / squad.length;
  const worstSurvivalRate = worstEscaped / squad.length;
  const skillGap = bestSurvivalRate - avgSurvivalRate;
  const failRate = failCount / n;

  // Difficulty score (0-100):
  //   Combines fail rate (how often you lose) with inverse of average survival
  //   and penalizes low skill gaps (if ordering doesn't matter, it's boring).
  //
  //   Components:
  //     - failRate contributes 50% (high fail = hard)
  //     - (1 - avgSurvivalRate) contributes 30% (low avg survival = hard)
  //     - (1 - skillGap) contributes 20% (low skill gap = less interesting, slightly harder
  //       because even the best ordering doesn't help much)
  const difficultyScore = Math.round(
    failRate * 50 +
    (1 - avgSurvivalRate) * 30 +
    (1 - skillGap) * 20
  );

  return {
    levelId: level.id,
    levelName: level.name,
    totalPermutations: n,
    squadSize: squad.length,
    requiredEscapes: level.requiredEscapes,
    bestEscaped,
    worstEscaped,
    bestSurvivalRate,
    avgSurvivalRate,
    worstSurvivalRate,
    skillGap,
    failRate,
    difficultyScore,
    bestOrdering,
    worstOrdering,
  };
}

// ---------------------------------------------------------------------------
// Pretty printing
// ---------------------------------------------------------------------------

function pct(value: number): string {
  return (value * 100).toFixed(1) + '%';
}

function printMetrics(metrics: LevelMetrics): void {
  console.log('');
  console.log(`${'='.repeat(60)}`);
  console.log(`  ${metrics.levelName} (${metrics.levelId})`);
  console.log(`${'='.repeat(60)}`);
  console.log(`  Permutations:      ${metrics.totalPermutations.toLocaleString()}`);
  console.log(`  Squad size:        ${metrics.squadSize}`);
  console.log(`  Required escapes:  ${metrics.requiredEscapes}`);
  console.log('');
  console.log(`  Best escaped:      ${metrics.bestEscaped} / ${metrics.squadSize}  (${pct(metrics.bestSurvivalRate)})`);
  console.log(`  Avg escaped:       ${(metrics.avgSurvivalRate * metrics.squadSize).toFixed(1)} / ${metrics.squadSize}  (${pct(metrics.avgSurvivalRate)})`);
  console.log(`  Worst escaped:     ${metrics.worstEscaped} / ${metrics.squadSize}  (${pct(metrics.worstSurvivalRate)})`);
  console.log('');
  console.log(`  Skill gap:         ${pct(metrics.skillGap)}`);
  console.log(`  Fail rate:         ${pct(metrics.failRate)}`);
  console.log(`  Difficulty score:  ${metrics.difficultyScore} / 100`);
  console.log('');
  console.log(`  Best ordering:     [${metrics.bestOrdering.join(', ')}]`);
  console.log(`  Worst ordering:    [${metrics.worstOrdering.join(', ')}]`);
}

function printSummaryTable(allMetrics: LevelMetrics[]): void {
  console.log('');
  console.log('');
  console.log(`${'='.repeat(100)}`);
  console.log('  SUMMARY TABLE');
  console.log(`${'='.repeat(100)}`);

  const header = [
    'Level'.padEnd(20),
    'Perms'.padStart(7),
    'Best'.padStart(6),
    'Avg'.padStart(6),
    'Worst'.padStart(6),
    'Gap'.padStart(6),
    'Fail%'.padStart(7),
    'Diff'.padStart(5),
  ].join(' | ');

  console.log(`  ${header}`);
  console.log(`  ${'-'.repeat(header.length)}`);

  for (const m of allMetrics) {
    const row = [
      m.levelName.padEnd(20),
      m.totalPermutations.toString().padStart(7),
      pct(m.bestSurvivalRate).padStart(6),
      pct(m.avgSurvivalRate).padStart(6),
      pct(m.worstSurvivalRate).padStart(6),
      pct(m.skillGap).padStart(6),
      pct(m.failRate).padStart(7),
      m.difficultyScore.toString().padStart(5),
    ].join(' | ');
    console.log(`  ${row}`);
  }

  console.log(`  ${'-'.repeat(header.length)}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  console.log('Dungeon Escape — Level Evaluator');
  console.log(`Evaluating ${LEVELS.length} level(s)...`);

  const allMetrics: LevelMetrics[] = [];

  for (const level of LEVELS) {
    const start = performance.now();
    const metrics = evaluateLevel(level);
    const elapsed = ((performance.now() - start) / 1000).toFixed(2);
    console.log(`  [${level.id}] ${level.name} — ${metrics.totalPermutations.toLocaleString()} orderings in ${elapsed}s`);
    allMetrics.push(metrics);
  }

  for (const metrics of allMetrics) {
    printMetrics(metrics);
  }

  printSummaryTable(allMetrics);
}

main();
