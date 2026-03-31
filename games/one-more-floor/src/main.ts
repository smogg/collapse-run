import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// ══════════════════════════════════════════════════════════════
// GAME CONFIG — tweak all balance numbers here
// ══════════════════════════════════════════════════════════════
const CONFIG = {
  // Economy
  baseRent: 2,              // rent per tenant with no upgrades
  incomeTickRate: 0.1,      // minimum money increment

  // Floors
  floorBaseCost: 1000,      // first extra floor costs this
  floorCostScale: 1.8,      // each floor costs this × more (1k, 1.8k, 3.2k, 5.8k...)
  perFloorCap: 10,          // per-floor UI phase ends here

  // Tenants
  baseFillRate: 0.15,        // base tenants arriving per second (across whole building)
  baseChurnRate: 0.02,       // base chance per tenant per minute to leave
  amenityChurnReduction: 0.003, // each installed amenity reduces churn by this much
  studioSlotBonus: 5,        // each studio level adds this many slots
  studioBaseCost: 50,        // base cost of studio conversion
  studioCostScale: 2.0,      // each studio level costs 2x more
  maxStudioLevel: 4,         // max studio upgrades per floor

  // Ads
  adBaseCost: 30,            // first ad purchase
  adCostScale: 1.25,         // each ad level costs more
  adFillBonus: 0.08,         // each ad level adds this to fill rate

  // Amenities (per-floor upgrades)
  amenities: [
    { id: 'hotwater', name: 'Hot Water', icon: '🚿', rentBonus: 3,  baseCost: 4,    costScale: 1.35, unlockFloors: 1 },
    { id: 'heating',  name: 'Heating',   icon: '🔥', rentBonus: 5,  baseCost: 12,   costScale: 1.40, unlockFloors: 1 },
    { id: 'ac',       name: 'AC',        icon: '❄️', rentBonus: 8,  baseCost: 35,   costScale: 1.45, unlockFloors: 3 },
    { id: 'balcony',  name: 'Balcony',   icon: '🌿', rentBonus: 12, baseCost: 80,   costScale: 1.50, unlockFloors: 5 },
    { id: 'laundry',  name: 'Laundry',   icon: '👕', rentBonus: 10, baseCost: 200,  costScale: 1.50, unlockFloors: 8 },
    { id: 'gym',      name: 'Gym',       icon: '💪', rentBonus: 18, baseCost: 500,  costScale: 1.55, unlockFloors: 12 },
  ],

  // Neighborhood upgrades
  // incomeMultiplier: each purchase multiplies TOTAL income by (1 + this)
  // rentBonusPerFloor: flat bonus added to each floor's rent
  neighborhood: [
    { id: 'sidewalk',    name: 'Sidewalk',       icon: '🚶', rentBonusPerFloor: 0.8,  incomeMultiplier: 0.03, ownIncome: 0,   ownIncomeFloorScale: 0,   baseCost: 150,  costScale: 1.00, maxCount: 1,   unlockFloors: 2 },
    { id: 'streetlight', name: 'Streetlight',   icon: '💡', rentBonusPerFloor: 0.5,  incomeMultiplier: 0.02, ownIncome: 0,   ownIncomeFloorScale: 0,   baseCost: 50,   costScale: 1.35, maxCount: 50,  unlockFloors: 2 },
    { id: 'tree',        name: 'Tree',          icon: '🌳', rentBonusPerFloor: 0.3,  incomeMultiplier: 0.01, ownIncome: 0,   ownIncomeFloorScale: 0,   baseCost: 25,   costScale: 1.30, maxCount: 50,  unlockFloors: 1 },
    { id: 'bench',       name: 'Park Bench',    icon: '🪑', rentBonusPerFloor: 0.2,  incomeMultiplier: 0.015,ownIncome: 0,   ownIncomeFloorScale: 0,   baseCost: 40,   costScale: 1.32, maxCount: 30,  unlockFloors: 3 },
    { id: 'parking',     name: 'Parking Space', icon: '🅿️', rentBonusPerFloor: 0.8,  incomeMultiplier: 0.03, ownIncome: 0,   ownIncomeFloorScale: 0,   baseCost: 200,  costScale: 1.30, maxCount: 100, unlockFloors: 5 },
    { id: 'cafe',        name: 'Café',          icon: '☕', rentBonusPerFloor: 1.0,  incomeMultiplier: 0.05, ownIncome: 10,  ownIncomeFloorScale: 1.0, baseCost: 1000, costScale: 1.45, maxCount: 20,  unlockFloors: 8 },
    { id: 'fountain',    name: 'Fountain',      icon: '⛲', rentBonusPerFloor: 1.5,  incomeMultiplier: 0.04, ownIncome: 0,   ownIncomeFloorScale: 0,   baseCost: 600,  costScale: 1.38, maxCount: 20,  unlockFloors: 6 },
    { id: 'playground',  name: 'Playground',    icon: '🎠', rentBonusPerFloor: 1.0,  incomeMultiplier: 0.03, ownIncome: 0,   ownIncomeFloorScale: 0,   baseCost: 400,  costScale: 1.35, maxCount: 20,  unlockFloors: 4 },
  ],

  // Café sub-upgrades (each one multiplies café income)
  cafeUpgrades: [
    { id: 'menu',      name: 'Better Menu',      icon: '📋', incomeBoost: 0.5, baseCost: 300,  costScale: 1.50, maxLevel: 20 },
    { id: 'seating',   name: 'More Seating',     icon: '💺', incomeBoost: 0.3, baseCost: 400,  costScale: 1.45, maxLevel: 20 },
    { id: 'delivery',  name: 'Delivery Service', icon: '🛵', incomeBoost: 1.0, baseCost: 1500, costScale: 1.60, maxLevel: 10 },
    { id: 'marketing', name: 'Marketing',        icon: '📢', incomeBoost: 0.8, baseCost: 800,  costScale: 1.55, maxLevel: 15 },
  ],

  // Visuals
  moneyPopInterval: 2,       // seconds between money pops
  moneyPopDuration: 1400,    // ms per pop animation
  uiUpdateInterval: 0.15,    // seconds between DOM content updates
  churnCheckInterval: 3,     // seconds between churn checks
};

// ══════════════════════════════════════════════════════════════

// ── Game State ──────────────────────────────────────────────
interface AmenityDef {
  id: string;
  name: string;
  icon: string;
  rentBonus: number;
  baseCost: number;
  costScale: number;
  totalInstalled: number;  // global count (kept for compatibility but not used for cost)
  unlockFloors: number;
}

interface FloorState {
  amenities: Set<string>;
  tenants: number;       // current occupied slots
  maxTenants: number;    // base 10, increased by studio upgrades
  studioLevel: number;   // 0 = base (10 slots), 1 = 15, 2 = 20, 3 = 25, 4 = 30
}

interface NeighborhoodDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  model: string | null;
  rentBonusPerFloor: number;
  incomeMultiplier: number; // each purchase multiplies total income by (1 + this)
  ownIncome: number;
  ownIncomeFloorScale: number;
  baseCost: number;
  costScale: number;
  maxCount: number;
  count: number;
  unlockFloors: number;
  positions: { x: number; y: number; z: number; ry: number }[];
  scaleOverride?: number;
}

interface CafeUpgradeState {
  id: string;
  level: number;
}

const cafeUpgradeState: CafeUpgradeState[] = CONFIG.cafeUpgrades.map(u => ({ id: u.id, level: 0 }));

interface GameState {
  money: number;
  floorCount: number;
  floorStates: FloorState[];
  adLevel: number;
}

const BASE_RENT = CONFIG.baseRent;
const PER_FLOOR_CAP = CONFIG.perFloorCap;

function makeFloorState(tenants: number = 0): FloorState {
  return { amenities: new Set(), tenants, maxTenants: 10, studioLevel: 0 };
}

const state: GameState = {
  money: 0,
  floorCount: 1,
  floorStates: [makeFloorState(1)], // floor 0 starts with 1 tenant
  adLevel: 0,
};

const amenities: AmenityDef[] = CONFIG.amenities.map(a => ({ ...a, totalInstalled: 0 }));

// ── Tenant helpers ───────────────────────────────────────────
function getTotalTenants(): number {
  return state.floorStates.reduce((sum, f) => sum + f.tenants, 0);
}
function getTotalSlots(): number {
  return state.floorStates.reduce((sum, f) => sum + f.maxTenants, 0);
}

// Fill rate: base + ad bonus
function getFillRate(): number {
  return CONFIG.baseFillRate + state.adLevel * CONFIG.adFillBonus;
}

// ── Neighborhood Upgrades ───────────────────────────────────
// Visual data for neighborhood items (not balance — balance is in CONFIG)
const HOOD_VISUALS: Record<string, { description: string; model: string | null; scaleOverride?: number; positions: { x: number; y: number; z: number; ry: number }[] }> = {
  sidewalk: { description: 'Paved walkway for tenants', model: 'sidewalk', positions: [
    { x: 0, y: 0, z: 0.45, ry: 0 },
  ]},
  streetlight: { description: 'Lights up the street', model: 'models/light-curved.glb', positions: [
    { x: -1.8, y: 0, z: 0.8, ry: 0 }, { x: 1.8, y: 0, z: 0.8, ry: 0 },
    { x: -3.3, y: 0, z: 0.8, ry: 0 }, { x: 3.3, y: 0, z: 0.8, ry: 0 },
    { x: -4.8, y: 0, z: 0.8, ry: 0 }, { x: 4.8, y: 0, z: 0.8, ry: 0 },
    { x: -6.3, y: 0, z: 0.8, ry: 0 }, { x: 6.3, y: 0, z: 0.8, ry: 0 },
  ]},
  tree: { description: 'Green and pleasant', model: 'models/tree-large.glb', positions: [
    { x: -1.2, y: 0, z: -0.3, ry: 0 }, { x: 1.2, y: 0, z: -0.3, ry: 0.5 },
    { x: -2, y: 0, z: 0.3, ry: 1 }, { x: 2, y: 0, z: 0.3, ry: 1.5 },
    { x: -2.5, y: 0, z: -0.8, ry: 2 }, { x: 2.5, y: 0, z: -0.8, ry: 0.3 },
    { x: -1.5, y: 0, z: -1.2, ry: 3 }, { x: 1.5, y: 0, z: -1.2, ry: 2 },
    { x: -3, y: 0, z: -0.2, ry: 1 }, { x: 3, y: 0, z: -0.2, ry: 2 },
    { x: 0, y: 0, z: -1.5, ry: 0 }, { x: 0, y: 0, z: -2.2, ry: 1 },
  ]},
  bench: { description: 'A place to sit', model: 'models/planter.glb', scaleOverride: 0.8, positions: [
    { x: -1.5, y: 0, z: -0.8, ry: 0.3 }, { x: 1.5, y: 0, z: -0.8, ry: -0.3 },
    { x: -2.5, y: 0, z: 0, ry: 0 }, { x: 2.5, y: 0, z: 0, ry: Math.PI },
    { x: -0.8, y: 0, z: -1.5, ry: 0.5 }, { x: 0.8, y: 0, z: -1.5, ry: -0.5 },
  ]},
  parking: { description: 'Underground parking', model: 'car', positions: [
    { x: -2, y: 0, z: 1.5, ry: 0 }, { x: 2, y: 0, z: 1.5, ry: 0 },
    { x: -3.5, y: 0, z: 1.5, ry: 0 }, { x: 3.5, y: 0, z: 1.5, ry: 0 },
    { x: -5, y: 0, z: 1.5, ry: 0 }, { x: 5, y: 0, z: 1.5, ry: 0 },
    { x: -6.5, y: 0, z: 1.5, ry: 0 }, { x: 6.5, y: 0, z: 1.5, ry: 0 },
    { x: -1, y: 0, z: 1.5, ry: 0 }, { x: 1, y: 0, z: 1.5, ry: 0 },
  ]},
  cafe: { description: 'Earns income from tenants', model: 'models/building-type-h.glb', scaleOverride: 0.5, positions: [
    { x: 3, y: 0, z: 0.3, ry: 0 }, { x: -3, y: 0, z: 0.3, ry: 0 }, { x: 5, y: 0, z: 0.3, ry: 0 },
  ]},
  fountain: { description: 'Beautiful centerpiece', model: null, positions: [
    { x: 0, y: 0, z: -1.8, ry: 0 }, { x: -2, y: 0, z: -2, ry: 0 }, { x: 2, y: 0, z: -2, ry: 0 },
  ]},
  playground: { description: 'Families love it', model: null, positions: [
    { x: -2, y: 0, z: -1, ry: 0 }, { x: 2.5, y: 0, z: -1.5, ry: 0 }, { x: -3, y: 0, z: -1.5, ry: 0 },
  ]},
};

// Build neighborhood upgrades by merging CONFIG balance with visuals
const neighborhoodUpgrades: NeighborhoodDef[] = CONFIG.neighborhood.map(cfg => {
  const vis = HOOD_VISUALS[cfg.id];
  return {
    ...cfg,
    description: vis.description,
    model: vis.model,
    scaleOverride: vis.scaleOverride,
    positions: vis.positions,
    count: 0,
  };
});

const neighborhoodModels: THREE.Object3D[] = []; // spawned 3D models

function getNeighborhoodRentBonus(): number {
  let bonus = 0;
  for (const n of neighborhoodUpgrades) {
    bonus += n.rentBonusPerFloor * n.count;
  }
  return bonus;
}

// Global income multiplier from neighborhood — compounds!
function getGlobalMultiplier(): number {
  let mult = 1;
  for (const n of neighborhoodUpgrades) {
    if (n.incomeMultiplier > 0 && n.count > 0) {
      mult *= Math.pow(1 + n.incomeMultiplier, n.count);
    }
  }
  return mult;
}

// Café sub-upgrade multiplier
function getCafeUpgradeMultiplier(): number {
  let mult = 1;
  for (let i = 0; i < CONFIG.cafeUpgrades.length; i++) {
    const cfg = CONFIG.cafeUpgrades[i];
    const st = cafeUpgradeState[i];
    if (st.level > 0) {
      mult *= (1 + cfg.incomeBoost * st.level);
    }
  }
  return mult;
}

function getCafeUpgradeCost(index: number): number {
  const cfg = CONFIG.cafeUpgrades[index];
  const st = cafeUpgradeState[index];
  return Math.floor(cfg.baseCost * Math.pow(cfg.costScale, st.level));
}

function getNeighborhoodIncome(): number {
  let income = 0;
  for (const n of neighborhoodUpgrades) {
    if (n.ownIncome > 0 && n.count > 0) {
      income += n.ownIncome * n.count * (1 + state.floorCount * n.ownIncomeFloorScale);
    }
  }
  // Apply café sub-upgrade multiplier
  income *= getCafeUpgradeMultiplier();
  return income;
}

function getNeighborhoodCost(n: NeighborhoodDef): number {
  return Math.floor(n.baseCost * Math.pow(n.costScale, n.count));
}

function getSpawnPosition(n: NeighborhoodDef): { x: number; y: number; z: number; ry: number } {
  const posIndex = n.count - 1;
  if (posIndex < n.positions.length) {
    return n.positions[posIndex];
  }
  // Generate positions procedurally beyond predefined ones
  const angle = (posIndex * 2.4) + n.id.length; // golden angle-ish spread
  const radius = 2 + (posIndex - n.positions.length) * 0.3;
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius - 0.5;
  // Keep off the street (z > 0.5 is street area)
  const safeZ = z > 0.5 ? -(Math.abs(z)) : z;
  return { x, y: 0, z: safeZ, ry: angle };
}

async function spawnNeighborhoodModel(n: NeighborhoodDef) {
  if (n.count <= 0) return;

  // Sidewalk: just show the pre-built mesh
  if (n.id === 'sidewalk') {
    sidewalk.visible = true;
    markDirty();
    return;
  }

  if (!n.model && !['fountain', 'playground'].includes(n.id)) return;

  // Only spawn a 3D model for first N predefined positions, or every 5th purchase after that
  if (n.count > n.positions.length && n.count % 5 !== 0) return;

  const pos = getSpawnPosition(n);

  let obj: THREE.Object3D;
  if (n.model === 'car') {
    // Special case: spawn a parked car
    const carColors = [0x3366cc, 0xcc3333, 0x33cc33, 0xffcc00, 0xffffff];
    const color = carColors[Math.floor(Math.random() * carColors.length)];
    const carMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.25, 0.12, 0.15),
      new THREE.MeshLambertMaterial({ color })
    );
    carMesh.castShadow = true;
    obj = carMesh;
  } else if (n.model) {
    obj = await loadModel(n.model);
    if (n.scaleOverride) {
      obj.scale.setScalar(n.scaleOverride);
    }
  } else {
    // Procedural geometry for fountain/playground
    if (n.id === 'fountain') {
      const group = new THREE.Group();
      // Wide circular basin
      const basin = new THREE.Mesh(
        new THREE.CylinderGeometry(0.4, 0.4, 0.08, 24),
        new THREE.MeshLambertMaterial({ color: 0xcccccc })
      );
      basin.position.y = 0.04;
      basin.castShadow = true;
      group.add(basin);
      // Water surface inside
      const water = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.35, 0.01, 24),
        new THREE.MeshLambertMaterial({ color: 0x4488cc })
      );
      water.position.y = 0.07;
      group.add(water);
      // Center column
      const column = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 0.35, 8),
        new THREE.MeshLambertMaterial({ color: 0xcccccc })
      );
      column.position.y = 0.04 + 0.35 / 2;
      column.castShadow = true;
      group.add(column);
      // Small sphere on top
      const top = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 12, 12),
        new THREE.MeshLambertMaterial({ color: 0x4488cc })
      );
      top.position.y = 0.04 + 0.35 + 0.06;
      group.add(top);
      obj = group;
    } else {
      // Playground — swing set
      const group = new THREE.Group();
      // Left vertical pole
      const poleLeft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, 0.5, 8),
        new THREE.MeshLambertMaterial({ color: 0xdd4444 })
      );
      poleLeft.position.set(-0.15, 0.25, 0);
      poleLeft.castShadow = true;
      group.add(poleLeft);
      // Right vertical pole
      const poleRight = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, 0.5, 8),
        new THREE.MeshLambertMaterial({ color: 0xdd4444 })
      );
      poleRight.position.set(0.15, 0.25, 0);
      poleRight.castShadow = true;
      group.add(poleRight);
      // Horizontal bar connecting at top
      const bar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, 0.3, 8),
        new THREE.MeshLambertMaterial({ color: 0xdd4444 })
      );
      bar.position.set(0, 0.5, 0);
      bar.rotation.z = Math.PI / 2;
      bar.castShadow = true;
      group.add(bar);
      // Seat hanging from center
      const seat = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.02, 0.05),
        new THREE.MeshLambertMaterial({ color: 0xffcc00 })
      );
      seat.position.set(0, 0.2, 0);
      seat.castShadow = true;
      group.add(seat);
      obj = group;
    }
  }

  obj.position.set(pos.x, pos.y, pos.z);
  obj.rotation.y = pos.ry;
  scene.add(obj);
  neighborhoodModels.push(obj);
  markDirty();
}

// ── Economy ─────────────────────────────────────────────────
function getFloorRentPerTenant(floorIndex: number): number {
  let rent = BASE_RENT + getNeighborhoodRentBonus();
  const floor = state.floorStates[floorIndex];
  if (floor) {
    for (const a of amenities) {
      if (floor.amenities.has(a.id)) {
        rent += a.rentBonus;
      }
    }
  }
  return rent;
}

function getFloorIncome(floorIndex: number): number {
  const floor = state.floorStates[floorIndex];
  if (!floor) return 0;
  return floor.tenants * getFloorRentPerTenant(floorIndex);
}

function getTotalRentPerSecond(): number {
  let total = 0;
  for (let i = 0; i < state.floorCount; i++) {
    total += getFloorIncome(i);
  }
  // Apply global multiplier from neighborhood (compounds!)
  total *= getGlobalMultiplier();
  // Add neighborhood businesses income (already has café multiplier)
  total += getNeighborhoodIncome();
  return total;
}

function getAverageRentPerTenant(): number {
  if (state.floorCount === 0) return BASE_RENT;
  let total = 0;
  for (let i = 0; i < state.floorCount; i++) {
    total += getFloorRentPerTenant(i);
  }
  return total / state.floorCount;
}

// ── Upgrade Costs ────────────────────────────────────────────
function getAmenityCost(a: AmenityDef, floorIndex: number): number {
  const floorMultiplier = Math.pow(CONFIG.floorCostScale, floorIndex);
  return Math.floor(a.baseCost * floorMultiplier);
}

function getStudioCost(floorIndex: number, studioLevel: number): number {
  const floorMultiplier = Math.pow(CONFIG.floorCostScale, floorIndex);
  return Math.floor(CONFIG.studioBaseCost * floorMultiplier * Math.pow(CONFIG.studioCostScale, studioLevel));
}

function getAdCost(): number {
  return Math.floor(CONFIG.adBaseCost * Math.pow(CONFIG.adCostScale, state.adLevel));
}

let floorsPurchased = 0;

function getFloorCost(): number {
  return Math.floor(CONFIG.floorBaseCost * Math.pow(CONFIG.floorCostScale, floorsPurchased));
}

// ── Phase Detection ─────────────────────────────────────────
function isFloorFullyUpgraded(floorIndex: number): boolean {
  const floor = state.floorStates[floorIndex];
  if (!floor) return false;
  const unlocked = amenities.filter(a => state.floorCount >= a.unlockFloors);
  return unlocked.every(a => floor.amenities.has(a.id));
}

function isFloorComplete(floorIndex: number): boolean {
  // Fully upgraded amenities AND max studio
  return isFloorFullyUpgraded(floorIndex) && state.floorStates[floorIndex].studioLevel >= CONFIG.maxStudioLevel;
}

function allFloorsFullyUpgraded(): boolean {
  const unlocked = amenities.filter(a => state.floorCount >= a.unlockFloors);
  for (let i = 0; i < state.floorCount; i++) {
    const floor = state.floorStates[i];
    if (!floor || !unlocked.every(a => floor.amenities.has(a.id))) return false;
  }
  return true;
}

let bulkPhaseUnlocked = false; // once unlocked, stays unlocked forever

function isInBulkPhase(): boolean {
  if (bulkPhaseUnlocked) return true;
  if (state.floorCount >= PER_FLOOR_CAP && allFloorsFullyUpgraded()) {
    bulkPhaseUnlocked = true;
    return true;
  }
  return false;
}

// How many floors are missing a given amenity
function floorsMissingAmenity(a: AmenityDef): number {
  let count = 0;
  for (let i = 0; i < state.floorCount; i++) {
    const floor = state.floorStates[i];
    if (!floor || !floor.amenities.has(a.id)) count++;
  }
  return count;
}

// Cost to install an amenity on all missing floors (uses per-floor scaling)
function getBulkAmenityCost(a: AmenityDef): number {
  let total = 0;
  for (let i = 0; i < state.floorCount; i++) {
    const floor = state.floorStates[i];
    if (!floor || !floor.amenities.has(a.id)) {
      total += getAmenityCost(a, i);
    }
  }
  return total;
}

// Cost to convert all floors to next studio level
function getBulkStudioCost(): number {
  let total = 0;
  for (let i = 0; i < state.floorCount; i++) {
    const floor = state.floorStates[i];
    if (floor && floor.studioLevel < CONFIG.maxStudioLevel) {
      total += getStudioCost(i, floor.studioLevel);
    }
  }
  return total;
}

function floorsNeedingStudio(): number {
  let count = 0;
  for (let i = 0; i < state.floorCount; i++) {
    const floor = state.floorStates[i];
    if (floor && floor.studioLevel < CONFIG.maxStudioLevel) count++;
  }
  return count;
}

// ── Three.js Setup ──────────────────────────────────────────
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(1, 2, 8);
camera.lookAt(0, 0, 0);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(8, 12, 6);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(1024, 1024);
dirLight.shadow.camera.near = 0.1;
dirLight.shadow.camera.far = 40;
dirLight.shadow.camera.left = -10;
dirLight.shadow.camera.right = 10;
dirLight.shadow.camera.top = 10;
dirLight.shadow.camera.bottom = -10;
scene.add(dirLight);

const groundGeo = new THREE.PlaneGeometry(20, 20);
const groundMat = new THREE.MeshLambertMaterial({ color: 0x5a8a4a });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = 0;
ground.receiveShadow = true;
scene.add(ground);

const streetGeo = new THREE.PlaneGeometry(20, 1.5);
const streetMat = new THREE.MeshLambertMaterial({ color: 0x555555 });
const street = new THREE.Mesh(streetGeo, streetMat);
street.rotation.x = -Math.PI / 2;
street.position.set(0, 0.01, 1.2);
street.receiveShadow = true;
scene.add(street);

// Sidewalk — hidden by default, shown when purchased as neighborhood upgrade
const sidewalkGeo = new THREE.PlaneGeometry(20, 0.6);
const sidewalkMat = new THREE.MeshLambertMaterial({ color: 0xccbbaa });
const sidewalk = new THREE.Mesh(sidewalkGeo, sidewalkMat);
sidewalk.rotation.x = -Math.PI / 2;
sidewalk.position.set(0, 0.015, 0.45);
sidewalk.receiveShadow = true;
sidewalk.visible = false; // shown when sidewalk upgrade purchased
scene.add(sidewalk);

// ── Building Management ─────────────────────────────────────
let actualFloorHeight = 1.0;
const loader = new GLTFLoader();
const buildingGroup = new THREE.Group();
scene.add(buildingGroup);

const modelCache: Map<string, THREE.Group> = new Map();

async function loadModel(path: string): Promise<THREE.Group> {
  const cached = modelCache.get(path);
  if (cached) return cached.clone();

  return new Promise((resolve, reject) => {
    loader.load(
      path,
      (gltf) => {
        gltf.scene.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            (child as THREE.Mesh).castShadow = true;
            (child as THREE.Mesh).receiveShadow = true;
          }
        });
        modelCache.set(path, gltf.scene);
        resolve(gltf.scene.clone());
      },
      undefined,
      reject,
    );
  });
}

let roofModel: THREE.Group | null = null;

async function initBuilding() {
  const groundFloor = await loadModel('models/building-door.glb');
  groundFloor.position.y = 0;
  buildingGroup.add(groundFloor);

  const box = new THREE.Box3().setFromObject(groundFloor);
  const size = box.getSize(new THREE.Vector3());
  actualFloorHeight = size.y;

  roofModel = await loadModel('models/roof-flat-top.glb');
  roofModel.position.y = actualFloorHeight;
  buildingGroup.add(roofModel);

  visualFloorCount = 1;
  updateCamera();
}

let visualFloorCount = 1;
const buildingQueue: number[] = [];
let isBuilding = false;

function addFloorToBuilding() {
  buildingQueue.push(visualFloorCount + buildingQueue.length + 1);
  processQueue();
}

async function processQueue() {
  if (isBuilding || buildingQueue.length === 0) return;
  isBuilding = true;

  while (buildingQueue.length > 0) {
    const floorNum = buildingQueue.shift()!;

    if (roofModel) {
      buildingGroup.remove(roofModel);
    }

    const floorModels = [
      'models/building-window.glb',
      'models/building-windows.glb',
      'models/building-window-balcony.glb',
      'models/building-window-awnings.glb',
      'models/building-window-sill.glb',
    ];

    const modelPath = floorModels[(floorNum - 2) % floorModels.length];
    const newFloor = await loadModel(modelPath);
    const floorY = (floorNum - 1) * actualFloorHeight;
    newFloor.position.y = floorY;
    buildingGroup.add(newFloor);

    visualFloorCount = floorNum;

    roofModel = await loadModel('models/roof-flat-top.glb');
    roofModel.position.y = floorNum * actualFloorHeight;
    buildingGroup.add(roofModel);

    updateCamera();
    markDirty();
  }

  isBuilding = false;
}

// ── Tenants (walking figures) ───────────────────────────────
interface TenantFigure {
  mesh: THREE.Mesh;
  targetX: number;
  speed: number;
  arriving: boolean;
}

const activeTenants: TenantFigure[] = [];
const tenantMaterial = new THREE.MeshLambertMaterial({ color: 0x3366cc });
const tenantGeometry = new THREE.CapsuleGeometry(0.04, 0.1, 4, 8);

function spawnTenant(arriving: boolean) {
  // Cap visible tenants at ~5
  if (activeTenants.length >= 5) return;

  const mesh = new THREE.Mesh(tenantGeometry, tenantMaterial.clone());
  const startX = arriving ? (Math.random() > 0.5 ? 4 : -4) : 0;
  const endX = arriving ? 0 : (Math.random() > 0.5 ? 4 : -4);
  const z = 1.2 + (Math.random() - 0.5) * 0.6;
  mesh.position.set(startX, 0.09, z);
  mesh.castShadow = true;
  scene.add(mesh);

  if (!arriving) {
    (mesh.material as THREE.MeshLambertMaterial).color.setHex(0xcc3333);
  }

  activeTenants.push({
    mesh,
    targetX: endX,
    speed: 0.4 + Math.random() * 0.3,
    arriving,
  });
}

function updateTenants(delta: number) {
  for (let i = activeTenants.length - 1; i >= 0; i--) {
    const t = activeTenants[i];
    const dir = Math.sign(t.targetX - t.mesh.position.x);
    t.mesh.position.x += dir * t.speed * delta;

    const dist = Math.abs(t.mesh.position.x - t.targetX);
    if (dist < 0.05) {
      scene.remove(t.mesh);
      t.mesh.geometry.dispose();
      (t.mesh.material as THREE.Material).dispose();
      activeTenants.splice(i, 1);
    }
  }
}

// ── Camera ──────────────────────────────────────────────────
const cameraTargetPos = new THREE.Vector3(1, 2, 8);
const cameraTargetLookAt = new THREE.Vector3(0, 0.3, 0);
const currentLookAt = new THREE.Vector3(0, 0.3, 0);

function updateCamera() {
  const buildingHeight = (state.floorCount + 1) * actualFloorHeight;
  const lookAtY = buildingHeight * 0.45;
  const distance = Math.max(8, buildingHeight * 0.8 + 6);

  cameraTargetPos.set(distance * 0.15, lookAtY + distance * 0.3, distance);
  cameraTargetLookAt.set(0, lookAtY, 0);
}

function animateCamera() {
  camera.position.lerp(cameraTargetPos, 0.03);
  currentLookAt.lerp(cameraTargetLookAt, 0.03);
  camera.lookAt(currentLookAt);
}

// ── Floating Dollar Pops ────────────────────────────────────
const popsContainer = document.getElementById('money-pops')!;

interface MoneyPop {
  el: HTMLDivElement;
  startTime: number;
  sx: number;
  sy: number;
  angle: number; // radians, direction of travel
}

const activePops: MoneyPop[] = [];
const POP_DURATION = CONFIG.moneyPopDuration;

function spawnMoneyPop(floorIndex: number) {
  // Spawn from the RIGHT side of the building
  const worldPos = new THREE.Vector3(
    0.6 + Math.random() * 0.2,
    (floorIndex + 0.5) * actualFloorHeight,
    0.3
  );
  buildingGroup.localToWorld(worldPos);
  worldPos.project(camera);

  const hw = window.innerWidth / 2;
  const hh = window.innerHeight / 2;
  const sx = worldPos.x * hw + hw;
  const sy = -(worldPos.y * hh) + hh;

  if (worldPos.z <= 0 || worldPos.z >= 1) return;

  // Show per-floor total income (tenants x rentPerTenant)
  const floorIncome = getFloorIncome(floorIndex);
  if (floorIncome <= 0) return;
  const el = document.createElement('div');
  el.className = 'money-pop';
  el.textContent = `+$${Math.floor(floorIncome)}`;
  el.style.left = `${sx}px`;
  el.style.top = `${sy}px`;
  popsContainer.appendChild(el);

  // Fly to the RIGHT and slightly upward (10° to 50° upward-right)
  const angle = (-10 - Math.random() * 40) * (Math.PI / 180);

  activePops.push({ el, startTime: performance.now(), sx, sy, angle });
}

function updateMoneyPops() {
  const now = performance.now();
  for (let i = activePops.length - 1; i >= 0; i--) {
    const pop = activePops[i];
    const elapsed = now - pop.startTime;
    const t = elapsed / POP_DURATION;

    if (t >= 1) {
      pop.el.remove();
      activePops.splice(i, 1);
      continue;
    }

    // Fly outward at angle, decelerate
    const dist = t * 60;
    const xOffset = Math.cos(pop.angle) * dist;
    const yOffset = Math.sin(pop.angle) * dist;
    pop.el.style.transform = `translate(-50%, -50%) translate(${xOffset}px, ${yOffset}px) scale(${1 - t * 0.3})`;
    pop.el.style.opacity = String(1 - t * t);
  }
}

let popTimer = 0;
const POP_INTERVAL = CONFIG.moneyPopInterval;

function spawnCafePop(cafeIndex: number) {
  const cafeVis = HOOD_VISUALS['cafe'];
  if (cafeIndex >= cafeVis.positions.length) return;
  const cafePos = cafeVis.positions[cafeIndex];

  const worldPos = new THREE.Vector3(cafePos.x, 0.5, cafePos.z);
  worldPos.project(camera);

  const hw = window.innerWidth / 2;
  const hh = window.innerHeight / 2;
  const sx = worldPos.x * hw + hw;
  const sy = -(worldPos.y * hh) + hh;

  if (worldPos.z <= 0 || worldPos.z >= 1) return;

  const cafeDef = neighborhoodUpgrades.find(n => n.id === 'cafe');
  if (!cafeDef || cafeDef.count === 0) return;
  const cafeIncome = getNeighborhoodIncome();
  const perCafe = Math.floor(cafeIncome / cafeDef.count);

  const el = document.createElement('div');
  el.className = 'money-pop cafe-pop';
  el.textContent = `+$${perCafe}`;
  el.style.left = `${sx}px`;
  el.style.top = `${sy}px`;
  popsContainer.appendChild(el);

  const angle = (-10 - Math.random() * 40) * (Math.PI / 180);
  activePops.push({ el, startTime: performance.now(), sx, sy, angle });
}

function tickMoneyPops(delta: number) {
  popTimer += delta;
  if (popTimer >= POP_INTERVAL) {
    popTimer = 0;
    // Pop from each floor that has tenants
    let popCount = 0;
    for (let i = 0; i < state.floorCount; i++) {
      const floor = state.floorStates[i];
      if (floor && floor.tenants > 0) {
        // Stagger slightly so they don't all appear at once
        setTimeout(() => spawnMoneyPop(i), popCount * 80);
        popCount++;
      }
    }
    // Pop from first 3 cafés
    const cafeDef = neighborhoodUpgrades.find(n => n.id === 'cafe');
    if (cafeDef && cafeDef.count > 0) {
      const maxCafePops = Math.min(cafeDef.count, 3);
      for (let i = 0; i < maxCafePops; i++) {
        setTimeout(() => spawnCafePop(i), (popCount + i) * 80);
      }
    }
  }
  updateMoneyPops();
}

// ── Floor Upgrade Panels (floating LEFT of each floor) ──────
const floorPanelsContainer = document.getElementById('floor-panels')!;

interface FloorPanel {
  el: HTMLDivElement;
  floorIndex: number;
  rentLabel: HTMLDivElement;
  iconsEl: HTMLDivElement;
  buyBtn: HTMLButtonElement;
}

const floorPanels: FloorPanel[] = [];

function getNextUpgrade(floorIndex: number): AmenityDef | null {
  const floor = state.floorStates[floorIndex];
  if (!floor) return null;
  for (const a of amenities) {
    if (state.floorCount >= a.unlockFloors && !floor.amenities.has(a.id)) {
      return a;
    }
  }
  return null;
}

function ensureFloorPanels() {
  while (floorPanels.length < state.floorCount) {
    const floorIndex = floorPanels.length;
    const el = document.createElement('div');
    el.className = 'floor-panel';
    floorPanelsContainer.appendChild(el);

    // Rent label (leftmost)
    const rentLabel = document.createElement('div');
    rentLabel.className = 'floor-rent-label';
    el.appendChild(rentLabel);

    // Installed icons
    const iconsEl = document.createElement('div');
    iconsEl.className = 'floor-installed';
    el.appendChild(iconsEl);

    // Buy button (next upgrade or studio) — shows full info
    const buyBtn = document.createElement('button');
    buyBtn.className = 'floor-buy-btn';
    buyBtn.addEventListener('click', () => {
      const floor = state.floorStates[floorIndex];
      if (!floor) return;

      const next = getNextUpgrade(floorIndex);
      if (next) {
        // Buy amenity
        const cost = getAmenityCost(next, floorIndex);
        if (state.money >= cost && !floor.amenities.has(next.id)) {
          state.money -= cost;
          floor.amenities.add(next.id);
          next.totalInstalled++;
          renderUI();
        }
      } else if (isFloorFullyUpgraded(floorIndex) && floor.studioLevel < CONFIG.maxStudioLevel) {
        // Buy studio upgrade
        const cost = getStudioCost(floorIndex, floor.studioLevel);
        if (state.money >= cost) {
          state.money -= cost;
          floor.studioLevel++;
          floor.maxTenants = 10 + floor.studioLevel * CONFIG.studioSlotBonus;
          renderUI();
        }
      }
    });
    el.appendChild(buyBtn);

    floorPanels.push({ el, floorIndex, rentLabel, iconsEl, buyBtn });
  }
}

// Position-only update — runs every frame for smooth movement
function updateFloorPanelPositions() {
  for (let i = 0; i < floorPanels.length; i++) {
    const panel = floorPanels[i];
    const worldPos = new THREE.Vector3(-0.8, (i + 0.5) * actualFloorHeight, 0);
    buildingGroup.localToWorld(worldPos);
    worldPos.project(camera);

    const hw = window.innerWidth / 2;
    const hh = window.innerHeight / 2;
    const sx = worldPos.x * hw + hw;
    const sy = -(worldPos.y * hh) + hh;

    if (worldPos.z > 0 && worldPos.z < 1) {
      panel.el.style.transform = `translate(-100%, -50%) translate(${sx}px, ${sy}px)`;
      panel.el.style.opacity = '1';
    } else {
      panel.el.style.opacity = '0';
    }
  }
}

// Content update — runs throttled
function updateFloorPanelContent() {
  ensureFloorPanels();

  for (let i = 0; i < floorPanels.length; i++) {
    const panel = floorPanels[i];
    const floor = state.floorStates[i];
    if (!floor) continue;
    const hasTenants = floor.tenants > 0;
    const fullyUpgraded = isFloorFullyUpgraded(i);
    const complete = isFloorComplete(i);

    // Rent label — show tenant count
    panel.rentLabel.textContent = `${floor.tenants}/${floor.maxTenants}`;
    panel.rentLabel.classList.toggle('vacant', !hasTenants);

    // Installed icons — show small icons for purchased amenities, or star if complete
    const iconKey = complete ? 'complete' : (fullyUpgraded ? `full:s${floor.studioLevel}` : Array.from(floor.amenities).join(',') + `:s${floor.studioLevel}`);
    if (panel.iconsEl.dataset.key !== iconKey) {
      panel.iconsEl.dataset.key = iconKey;
      if (complete) {
        panel.iconsEl.innerHTML = '<span class="floor-complete">\u2605</span>';
      } else {
        let icons = '';
        for (const a of amenities) {
          if (floor.amenities.has(a.id)) {
            icons += `<span class="floor-installed-icon">${a.icon}</span>`;
          }
        }
        if (floor.studioLevel > 0) {
          icons += `<span class="floor-installed-icon">🏠${floor.studioLevel}</span>`;
        }
        panel.iconsEl.innerHTML = icons;
      }
    }

    // Buy button — show next available upgrade or studio
    const next = getNextUpgrade(i);
    if (next) {
      const cost = getAmenityCost(next, i);
      const canAfford = state.money >= cost;
      panel.buyBtn.style.display = '';
      panel.buyBtn.disabled = !canAfford;
      const key = `${next.id}:${formatMoney(cost)}:f${i}`;
      if (panel.buyBtn.dataset.key !== key) {
        panel.buyBtn.dataset.key = key;
        panel.buyBtn.innerHTML = `
          <span class="btn-icon">${next.icon}</span>
          <span class="btn-info">
            <span class="btn-name">${next.name}</span>
            <span class="btn-detail"><span class="cost-val">${formatMoney(cost)}</span> · <span class="rent-val">+$${next.rentBonus}/tenant</span></span>
          </span>
        `;
      }
      panel.buyBtn.classList.toggle('affordable', canAfford);
    } else if (fullyUpgraded && floor.studioLevel < CONFIG.maxStudioLevel) {
      // Show studio conversion button
      const cost = getStudioCost(i, floor.studioLevel);
      const canAfford = state.money >= cost;
      panel.buyBtn.style.display = '';
      panel.buyBtn.disabled = !canAfford;
      const key = `studio:${floor.studioLevel}:${formatMoney(cost)}:f${i}`;
      if (panel.buyBtn.dataset.key !== key) {
        panel.buyBtn.dataset.key = key;
        panel.buyBtn.innerHTML = `
          <span class="btn-icon">🏠</span>
          <span class="btn-info">
            <span class="btn-name">Studios Lv${floor.studioLevel + 1}</span>
            <span class="btn-detail"><span class="cost-val">${formatMoney(cost)}</span> · <span class="rent-val">+${CONFIG.studioSlotBonus} slots</span></span>
          </span>
        `;
      }
      panel.buyBtn.classList.toggle('affordable', canAfford);
    } else {
      panel.buyBtn.style.display = 'none';
    }
  }
}

// ── UI ──────────────────────────────────────────────────────
const moneyDisplay = document.getElementById('money-display')!;
const incomeDisplay = document.getElementById('income-display')!;
const floorDisplay = document.getElementById('floor-display')!;
const rentDisplay = document.getElementById('rent-display')!;
const fillRateDisplay = document.getElementById('fill-rate-display')!;
const occupancyDisplay = document.getElementById('occupancy-display')!;
const occupancyPct = document.getElementById('occupancy-pct')!;
const vacancyFill = document.getElementById('vacancy-fill')!;
const shopEl = document.getElementById('shop')!;

function formatMoney(n: number): string {
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return '$' + (n / 1_000).toFixed(1) + 'K';
  return '$' + Math.floor(n);
}

// Floor button only in the right panel
const floorBtn = document.createElement('button');
floorBtn.className = 'shop-btn floor-btn';
floorBtn.addEventListener('click', () => {
  // Block at floor 10 until initial upgrades are done — after that, free to build
  if (state.floorCount >= PER_FLOOR_CAP && !bulkPhaseUnlocked) return;
  const cost = getFloorCost();
  if (state.money >= cost) {
    state.money -= cost;
    state.floorCount++;
    floorsPurchased++;
    state.floorStates.push(makeFloorState(0));
    addFloorToBuilding();
    markDirty();
    renderUI();
  }
});
shopEl.appendChild(floorBtn);

// ── Online Ads Button ─────────────────────────────────────────
const adBtn = document.createElement('button');
adBtn.className = 'shop-btn';
adBtn.addEventListener('click', () => {
  const cost = getAdCost();
  if (state.money >= cost) {
    state.money -= cost;
    state.adLevel++;
    renderUI();
  }
});
shopEl.appendChild(adBtn);

// ── Bulk Upgrade Buttons (right panel, post-cap) ─────────────
const bulkEl = document.getElementById('bulk-upgrades')!;
const bulkButtons: Map<string, HTMLButtonElement> = new Map();

for (const a of amenities) {
  const btn = document.createElement('button');
  btn.className = 'bulk-btn';
  btn.addEventListener('click', () => {
    const missing = floorsMissingAmenity(a);
    if (missing === 0) return;
    const cost = getBulkAmenityCost(a);
    if (state.money < cost) return;
    state.money -= cost;
    // Install on all missing floors
    for (let i = 0; i < state.floorCount; i++) {
      const floor = state.floorStates[i];
      if (floor && !floor.amenities.has(a.id)) {
        floor.amenities.add(a.id);
        a.totalInstalled++;
      }
    }
    renderUI();
  });
  bulkEl.appendChild(btn);
  bulkButtons.set(a.id, btn);
}

// Bulk studio button
const bulkStudioBtn = document.createElement('button');
bulkStudioBtn.className = 'bulk-btn';
bulkStudioBtn.addEventListener('click', () => {
  const needing = floorsNeedingStudio();
  if (needing === 0) return;
  const cost = getBulkStudioCost();
  if (state.money < cost) return;
  state.money -= cost;
  for (let i = 0; i < state.floorCount; i++) {
    const floor = state.floorStates[i];
    if (floor && floor.studioLevel < CONFIG.maxStudioLevel) {
      floor.studioLevel++;
      floor.maxTenants = 10 + floor.studioLevel * CONFIG.studioSlotBonus;
    }
  }
  renderUI();
});
bulkEl.appendChild(bulkStudioBtn);

// ── Neighborhood Upgrade Buttons (right panel) ──────────────
const hoodEl = document.getElementById('neighborhood-upgrades')!;
const hoodButtons: Map<string, HTMLButtonElement> = new Map();

for (const n of neighborhoodUpgrades) {
  const btn = document.createElement('button');
  btn.className = 'hood-btn';
  btn.addEventListener('click', () => {
    if (n.count >= n.maxCount) return;
    const cost = getNeighborhoodCost(n);
    if (state.money < cost) return;
    state.money -= cost;
    n.count++;
    spawnNeighborhoodModel(n);
    renderUI();
  });
  hoodEl.appendChild(btn);
  hoodButtons.set(n.id, btn);
}

// ── Café Upgrade Buttons ─────────────────────────────────────
const cafeSectionEl = document.getElementById('cafe-section')!;
const cafeUpgradesEl = document.getElementById('cafe-upgrades')!;
const cafeButtons: HTMLButtonElement[] = [];

for (let i = 0; i < CONFIG.cafeUpgrades.length; i++) {
  const cfg = CONFIG.cafeUpgrades[i];
  const btn = document.createElement('button');
  btn.className = 'hood-btn';
  btn.addEventListener('click', () => {
    const st = cafeUpgradeState[i];
    if (st.level >= cfg.maxLevel) return;
    const cost = getCafeUpgradeCost(i);
    if (state.money < cost) return;
    state.money -= cost;
    st.level++;
    renderUI();
  });
  cafeUpgradesEl.appendChild(btn);
  cafeButtons.push(btn);
}

function renderCafeUI() {
  // Only show if at least one café exists
  const cafeCount = neighborhoodUpgrades.find(n => n.id === 'cafe')?.count ?? 0;
  cafeSectionEl.style.display = cafeCount > 0 ? '' : 'none';
  if (cafeCount === 0) return;

  for (let i = 0; i < CONFIG.cafeUpgrades.length; i++) {
    const cfg = CONFIG.cafeUpgrades[i];
    const st = cafeUpgradeState[i];
    const btn = cafeButtons[i];
    const maxed = st.level >= cfg.maxLevel;
    if (maxed) {
      btn.disabled = true;
      btn.className = 'hood-btn maxed';
      const key = `${cfg.id}:maxed`;
      if (btn.dataset.key !== key) {
        btn.dataset.key = key;
        btn.innerHTML = `
          <span class="hood-icon">${cfg.icon}</span>
          <span class="hood-info">
            <span class="hood-name">${cfg.name}</span>
            <span class="hood-desc">Maxed out</span>
          </span>
          <span class="hood-count">${st.level}/${cfg.maxLevel}</span>
        `;
      }
    } else {
      const cost = getCafeUpgradeCost(i);
      const canAfford = state.money >= cost;
      btn.disabled = !canAfford;
      btn.className = 'hood-btn';
      const key = `${cfg.id}:${st.level}:${formatMoney(cost)}`;
      if (btn.dataset.key !== key) {
        btn.dataset.key = key;
        btn.innerHTML = `
          <span class="hood-icon">${cfg.icon}</span>
          <span class="hood-info">
            <span class="hood-name">${cfg.name}</span>
            <span class="hood-detail"><span class="cost-val">${formatMoney(cost)}</span> · <span class="rent-val">+${Math.round(cfg.incomeBoost * 100)}% café income</span></span>
          </span>
          ${st.level > 0 ? `<span class="hood-count">${st.level}/${cfg.maxLevel}</span>` : ''}
        `;
      }
    }
  }
}

function renderNeighborhoodUI() {
  for (const n of neighborhoodUpgrades) {
    const btn = hoodButtons.get(n.id)!;
    if (state.floorCount < n.unlockFloors) {
      btn.style.display = 'none';
      continue;
    }
    btn.style.display = '';
    const maxed = n.count >= n.maxCount;
    if (maxed) {
      btn.disabled = true;
      btn.className = 'hood-btn maxed';
      const key = `${n.id}:maxed`;
      if (btn.dataset.key !== key) {
        btn.dataset.key = key;
        btn.innerHTML = `
          <span class="hood-icon">${n.icon}</span>
          <span class="hood-info">
            <span class="hood-name">${n.name}</span>
            <span class="hood-desc">Maxed out</span>
          </span>
          <span class="hood-count">${n.count}/${n.maxCount}</span>
        `;
      }
    } else {
      const cost = getNeighborhoodCost(n);
      const canAfford = state.money >= cost;
      btn.disabled = !canAfford;
      btn.className = 'hood-btn';
      let bonusText = '';
      if (n.incomeMultiplier > 0) bonusText += `<span class="rent-val">×${((1 + n.incomeMultiplier) * 100 - 100).toFixed(0)}% income</span>`;
      if (n.rentBonusPerFloor > 0) {
        if (bonusText) bonusText += ' · ';
        bonusText += `<span class="rent-val">+$${n.rentBonusPerFloor}/floor</span>`;
      }
      if (n.ownIncome > 0) {
        const incomePreview = n.ownIncome * (1 + state.floorCount * n.ownIncomeFloorScale) * getCafeUpgradeMultiplier();
        if (bonusText) bonusText += ' · ';
        bonusText += `<span class="rent-val">earns $${Math.floor(incomePreview)}/s</span>`;
      }
      const key = `${n.id}:${n.count}:${formatMoney(cost)}:${state.floorCount}`;
      if (btn.dataset.key !== key) {
        btn.dataset.key = key;
        btn.innerHTML = `
          <span class="hood-icon">${n.icon}</span>
          <span class="hood-info">
            <span class="hood-name">${n.name}</span>
            <span class="hood-detail"><span class="cost-val">${formatMoney(cost)}</span> · ${bonusText}</span>
          </span>
          ${n.count > 0 ? `<span class="hood-count">${n.count}/${n.maxCount}</span>` : ''}
        `;
      }
    }
  }
}

function renderUI() {
  const income = getTotalRentPerSecond();
  const avgRent = getAverageRentPerTenant();
  const totalTenants = getTotalTenants();
  const totalSlots = getTotalSlots();
  const fillRate = getFillRate();

  moneyDisplay.textContent = formatMoney(state.money);
  const mult = getGlobalMultiplier();
  incomeDisplay.textContent = formatMoney(income) + '/s' + (mult > 1.01 ? ` (×${mult.toFixed(2)})` : '');
  floorDisplay.textContent = String(state.floorCount);
  rentDisplay.textContent = formatMoney(avgRent) + ' avg';
  fillRateDisplay.textContent = `${fillRate.toFixed(2)}/s`;

  const pct = totalSlots > 0 ? Math.round((totalTenants / totalSlots) * 100) : 0;
  occupancyDisplay.textContent = `${totalTenants}/${totalSlots}`;
  occupancyPct.textContent = `${pct}%`;
  vacancyFill.style.width = `${pct}%`;

  if (pct >= 80) vacancyFill.style.background = '#7efa7e';
  else if (pct >= 50) vacancyFill.style.background = '#fadb7e';
  else vacancyFill.style.background = '#fa7e7e';

  // ── Phase logic ──
  const bulk = isInBulkPhase();
  const atCap = state.floorCount >= PER_FLOOR_CAP && !bulkPhaseUnlocked;

  // Floor button
  const floorCost = getFloorCost();
  const canBuyFloor = state.money >= floorCost && !atCap;
  floorBtn.disabled = !canBuyFloor;
  const floorKey = `${floorCost}:${state.floorCount}:${atCap}:${getNeighborhoodRentBonus()}`;
  if (floorBtn.dataset.key !== floorKey) {
    floorBtn.dataset.key = floorKey;
    if (atCap) {
      floorBtn.innerHTML = `
        + New Floor
        <span class="cost">${formatMoney(floorCost)}</span>
        <span class="desc">Upgrade all floors first!</span>
      `;
    } else {
      // Show how much income a new floor would add (base rent + neighborhood bonus)
      const newFloorRent = BASE_RENT + getNeighborhoodRentBonus();
      floorBtn.innerHTML = `
        + New Floor
        <span class="cost">${formatMoney(floorCost)}</span>
        <span class="desc">Floor #${state.floorCount + 1} · <span style="color:#7efa7e">+$${Math.floor(newFloorRent)}/s per tenant</span></span>
      `;
    }
  }

  // Online Ads button — visible after floor 1
  if (state.floorCount > 1) {
    adBtn.style.display = '';
    const adCost = getAdCost();
    const canAffordAd = state.money >= adCost;
    adBtn.disabled = !canAffordAd;
    const adKey = `ad:${state.adLevel}:${formatMoney(adCost)}`;
    if (adBtn.dataset.key !== adKey) {
      adBtn.dataset.key = adKey;
      adBtn.innerHTML = `
        📱 Online Ads
        <span class="cost">${formatMoney(adCost)}</span>
        <span class="desc">+${CONFIG.adFillBonus.toFixed(2)}/s fill rate · Level ${state.adLevel} · Fill: ${fillRate.toFixed(2)}/s</span>
      `;
    }
  } else {
    adBtn.style.display = 'none';
  }

  // Show/hide per-floor panels vs bulk upgrades
  floorPanelsContainer.style.display = bulk ? 'none' : '';
  bulkEl.style.display = bulk ? 'flex' : 'none';

  // Update bulk buttons
  if (bulk) {
    for (const a of amenities) {
      const btn = bulkButtons.get(a.id)!;
      if (state.floorCount < a.unlockFloors) {
        btn.style.display = 'none';
        continue;
      }
      btn.style.display = '';
      const missing = floorsMissingAmenity(a);
      if (missing === 0) {
        btn.disabled = true;
        btn.className = 'bulk-btn all-done';
        const key = `${a.id}:done`;
        if (btn.dataset.key !== key) {
          btn.dataset.key = key;
          btn.innerHTML = `
            <span class="bulk-icon">${a.icon}</span>
            <span class="bulk-info">
              <span class="bulk-name">${a.name}</span>
              <span class="bulk-detail">All floors installed &#x2713;</span>
            </span>
          `;
        }
      } else {
        const cost = getBulkAmenityCost(a);
        const canAfford = state.money >= cost;
        btn.disabled = !canAfford;
        btn.className = 'bulk-btn';
        const key = `${a.id}:${missing}:${formatMoney(cost)}`;
        if (btn.dataset.key !== key) {
          btn.dataset.key = key;
          btn.innerHTML = `
            <span class="bulk-icon">${a.icon}</span>
            <span class="bulk-info">
              <span class="bulk-name">${a.name}</span>
              <span class="bulk-detail"><span class="cost-val">${formatMoney(cost)}</span> · <span class="rent-val">+$${a.rentBonus}/tenant</span> · <span class="count-val">${missing} floors</span></span>
            </span>
          `;
        }
      }
    }

    // Bulk studio button
    const studioNeeding = floorsNeedingStudio();
    if (studioNeeding === 0) {
      bulkStudioBtn.disabled = true;
      bulkStudioBtn.className = 'bulk-btn all-done';
      const key = 'studio:done';
      if (bulkStudioBtn.dataset.key !== key) {
        bulkStudioBtn.dataset.key = key;
        bulkStudioBtn.innerHTML = `
          <span class="bulk-icon">🏠</span>
          <span class="bulk-info">
            <span class="bulk-name">Studios</span>
            <span class="bulk-detail">All floors maxed &#x2713;</span>
          </span>
        `;
      }
    } else {
      const cost = getBulkStudioCost();
      const canAfford = state.money >= cost;
      bulkStudioBtn.disabled = !canAfford;
      bulkStudioBtn.className = 'bulk-btn';
      const key = `studio:${studioNeeding}:${formatMoney(cost)}`;
      if (bulkStudioBtn.dataset.key !== key) {
        bulkStudioBtn.dataset.key = key;
        bulkStudioBtn.innerHTML = `
          <span class="bulk-icon">🏠</span>
          <span class="bulk-info">
            <span class="bulk-name">Studios</span>
            <span class="bulk-detail"><span class="cost-val">${formatMoney(cost)}</span> · <span class="rent-val">+${CONFIG.studioSlotBonus} slots</span> · <span class="count-val">${studioNeeding} floors</span></span>
          </span>
        `;
      }
    }
  }

  // Neighborhood
  renderNeighborhoodUI();
  renderCafeUI();
}

// ── Tenant Fill & Churn System ──────────────────────────────
let fillAccumulator = 0;
let churnTimer = 0;

function tickTenantFill(delta: number) {
  const fillRate = getFillRate();
  fillAccumulator += fillRate * delta;

  while (fillAccumulator >= 1) {
    fillAccumulator -= 1;
    // Find the lowest-occupancy floor with empty slots
    let bestFloor = -1;
    let bestRatio = 2; // >1 means full
    for (let i = 0; i < state.floorCount; i++) {
      const floor = state.floorStates[i];
      if (floor && floor.tenants < floor.maxTenants) {
        const ratio = floor.tenants / floor.maxTenants;
        if (ratio < bestRatio) {
          bestRatio = ratio;
          bestFloor = i;
        }
      }
    }
    if (bestFloor >= 0) {
      state.floorStates[bestFloor].tenants++;
      spawnTenant(true);
      markDirty();
    } else {
      // All floors full, stop accumulating
      fillAccumulator = 0;
      break;
    }
  }
}

function tickChurn(delta: number) {
  churnTimer += delta;
  if (churnTimer < CONFIG.churnCheckInterval) return;
  churnTimer = 0;

  // For each tenant, roll for churn
  for (let i = 0; i < state.floorCount; i++) {
    const floor = state.floorStates[i];
    if (!floor || floor.tenants <= 0) continue;

    const installedCount = floor.amenities.size;
    const churnChance = Math.max(0.001, CONFIG.baseChurnRate - installedCount * CONFIG.amenityChurnReduction);

    // Scale to per-check-interval (churnRate is per minute, interval is in seconds)
    const churnPerCheck = churnChance * (CONFIG.churnCheckInterval / 60);

    let lost = 0;
    for (let t = 0; t < floor.tenants; t++) {
      if (Math.random() < churnPerCheck) {
        lost++;
      }
    }
    if (lost > 0) {
      floor.tenants = Math.max(0, floor.tenants - lost);
      // Spawn leaving figures (cap visual spawns)
      for (let j = 0; j < Math.min(lost, 3); j++) {
        spawnTenant(false);
      }
      markDirty();
    }
  }
}

// ── Game Loop ───────────────────────────────────────────────
let lastTime = performance.now();
let incomeAccumulator = 0;
let uiTimer = 0;
const UI_INTERVAL = CONFIG.uiUpdateInterval;
let needsRender = true; // flag for Three.js re-render

// Mark scene dirty when something visual changes
function markDirty() { needsRender = true; }

function gameLoop(time: number) {
  requestAnimationFrame(gameLoop);

  const delta = Math.min((time - lastTime) / 1000, 0.1); // clamp large deltas
  lastTime = time;

  // ── Economy tick (cheap, runs every frame) ──
  const income = getTotalRentPerSecond();
  incomeAccumulator += income * delta;
  if (incomeAccumulator >= 0.1) {
    const amount = Math.floor(incomeAccumulator * 10) / 10;
    state.money += amount;
    incomeAccumulator -= amount;
  }

  // ── Tenant fill tick ──
  tickTenantFill(delta);

  // ── Churn tick ──
  tickChurn(delta);

  // ── Tenants (only if active) ──
  if (activeTenants.length > 0) {
    updateTenants(delta);
    markDirty();
  }

  // ── Money pops (DOM, throttled with the pops themselves) ──
  tickMoneyPops(delta);

  // ── Floor panel positions every frame (cheap: just math + CSS transform) ──
  updateFloorPanelPositions();

  // ── DOM content updates throttled ──
  uiTimer += delta;
  if (uiTimer >= UI_INTERVAL) {
    uiTimer = 0;
    renderUI();
    updateFloorPanelContent();
  }

  // ── Camera animation ──
  const camDist = camera.position.distanceTo(cameraTargetPos);
  if (camDist > 0.01) {
    animateCamera();
    markDirty();
  }

  // ── Only render when needed ──
  if (needsRender) {
    renderer.render(scene, camera);
    needsRender = false;
  }
}

// ── Resize Handler ──────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  markDirty();
});

// ── Init ────────────────────────────────────────────────────
(window as any).cheat = (money: number) => {
  state.money = money;
  renderUI();
};

(window as any).maxFloors = () => {
  for (let i = 0; i < state.floorCount; i++) {
    const floor = state.floorStates[i];
    for (const a of amenities) {
      if (state.floorCount >= a.unlockFloors && !floor.amenities.has(a.id)) {
        floor.amenities.add(a.id);
        a.totalInstalled++;
      }
    }
  }
  renderUI();
};

async function init() {
  await initBuilding();
  renderUI();
  requestAnimationFrame(gameLoop);
}

init();
