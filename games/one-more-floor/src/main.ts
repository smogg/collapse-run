import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// ── Game State ──────────────────────────────────────────────
interface AmenityDef {
  id: string;
  name: string;
  icon: string;
  rentBonus: number;
  baseCost: number;
  costScale: number;
  totalInstalled: number;  // global count for cost scaling
  unlockFloors: number;
}

interface NeighborhoodDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  model: string | null; // null = procedural geometry
  rentBonusPerFloor: number; // added to every floor's rent per purchase
  ownIncome: number; // base income this generates (e.g. café)
  ownIncomeFloorScale: number; // multiplied by floors (more tenants = more customers)
  baseCost: number;
  costScale: number;
  maxCount: number; // max times you can buy this
  count: number;
  unlockFloors: number;
  positions: { x: number; y: number; z: number; ry: number }[];
  scaleOverride?: number;
}

interface GameState {
  money: number;
  floors: number;
  occupied: number;
  floorAmenities: Set<string>[]; // per-floor: which amenities are installed
}

const BASE_RENT = 1;
const PER_FLOOR_CAP = 10; // per-floor UI phase ends here

const state: GameState = {
  money: 0,
  floors: 1,
  occupied: 1,
  floorAmenities: [new Set()], // floor 0
};

const amenities: AmenityDef[] = [
  { id: 'hotwater', name: 'Hot Water', icon: '\u{1F6BF}', rentBonus: 1, baseCost: 8, costScale: 1.06, totalInstalled: 0, unlockFloors: 1 },
  { id: 'heating', name: 'Heating', icon: '\u{1F525}', rentBonus: 2, baseCost: 20, costScale: 1.08, totalInstalled: 0, unlockFloors: 1 },
  { id: 'ac', name: 'AC', icon: '\u{2744}\u{FE0F}', rentBonus: 3, baseCost: 50, costScale: 1.10, totalInstalled: 0, unlockFloors: 3 },
  { id: 'balcony', name: 'Balcony', icon: '\u{1F33F}', rentBonus: 5, baseCost: 120, costScale: 1.12, totalInstalled: 0, unlockFloors: 5 },
  { id: 'laundry', name: 'Laundry', icon: '\u{1F455}', rentBonus: 4, baseCost: 200, costScale: 1.14, totalInstalled: 0, unlockFloors: 8 },
  { id: 'gym', name: 'Gym', icon: '\u{1F4AA}', rentBonus: 7, baseCost: 500, costScale: 1.16, totalInstalled: 0, unlockFloors: 12 },
];

// ── Neighborhood Upgrades ───────────────────────────────────
const neighborhoodUpgrades: NeighborhoodDef[] = [
  {
    id: 'streetlight', name: 'Streetlight', icon: '💡',
    description: 'Lights up the street',
    model: 'models/light-curved.glb',
    rentBonusPerFloor: 0.3, ownIncome: 0, ownIncomeFloorScale: 0,
    baseCost: 30, costScale: 1.15, maxCount: 8, count: 0, unlockFloors: 2,
    positions: [
      { x: -1.5, y: 0, z: 1.8, ry: 0 }, { x: 1.5, y: 0, z: 1.8, ry: Math.PI },
      { x: -3, y: 0, z: 1.8, ry: 0 }, { x: 3, y: 0, z: 1.8, ry: Math.PI },
      { x: -4.5, y: 0, z: 1.8, ry: 0 }, { x: 4.5, y: 0, z: 1.8, ry: Math.PI },
      { x: -6, y: 0, z: 1.8, ry: 0 }, { x: 6, y: 0, z: 1.8, ry: Math.PI },
    ],
  },
  {
    id: 'tree', name: 'Tree', icon: '🌳',
    description: 'Green and pleasant',
    model: 'models/tree-large.glb',
    rentBonusPerFloor: 0.2, ownIncome: 0, ownIncomeFloorScale: 0,
    baseCost: 15, costScale: 1.1, maxCount: 12, count: 0, unlockFloors: 1,
    positions: [
      { x: -1.2, y: 0, z: -0.3, ry: 0 }, { x: 1.2, y: 0, z: -0.3, ry: 0.5 },
      { x: -2, y: 0, z: 0.3, ry: 1 }, { x: 2, y: 0, z: 0.3, ry: 1.5 },
      { x: -2.5, y: 0, z: -0.8, ry: 2 }, { x: 2.5, y: 0, z: -0.8, ry: 0.3 },
      { x: -1.5, y: 0, z: -1.2, ry: 3 }, { x: 1.5, y: 0, z: -1.2, ry: 2 },
      { x: -3, y: 0, z: -0.2, ry: 1 }, { x: 3, y: 0, z: -0.2, ry: 2 },
      { x: 0, y: 0, z: -1.5, ry: 0 }, { x: 0, y: 0, z: -2.2, ry: 1 },
    ],
  },
  {
    id: 'bench', name: 'Park Bench', icon: '🪑',
    description: 'A place to sit',
    model: 'models/planter.glb', // using planter as bench stand-in
    rentBonusPerFloor: 0.15, ownIncome: 0, ownIncomeFloorScale: 0,
    baseCost: 20, costScale: 1.12, maxCount: 6, count: 0, unlockFloors: 3,
    scaleOverride: 0.8,
    positions: [
      { x: -1.5, y: 0, z: -0.8, ry: 0.3 }, { x: 1.5, y: 0, z: -0.8, ry: -0.3 },
      { x: -2.5, y: 0, z: 0, ry: 0 }, { x: 2.5, y: 0, z: 0, ry: Math.PI },
      { x: -0.8, y: 0, z: -1.5, ry: 0.5 }, { x: 0.8, y: 0, z: -1.5, ry: -0.5 },
    ],
  },
  {
    id: 'parking', name: 'Parking Space', icon: '🅿️',
    description: 'Underground parking',
    model: null, // no visual, just occupancy bonus
    rentBonusPerFloor: 0.5, ownIncome: 0, ownIncomeFloorScale: 0,
    baseCost: 100, costScale: 1.18, maxCount: 20, count: 0, unlockFloors: 5,
    positions: [],
  },
  {
    id: 'cafe', name: 'Café', icon: '☕',
    description: 'Earns income from tenants',
    model: 'models/building-type-h.glb',
    rentBonusPerFloor: 0.5, ownIncome: 5, ownIncomeFloorScale: 0.5,
    baseCost: 500, costScale: 1.25, maxCount: 3, count: 0, unlockFloors: 8,
    scaleOverride: 0.5,
    positions: [
      { x: 2.5, y: 0, z: 0.5, ry: -0.3 },
      { x: -2.5, y: 0, z: 0.5, ry: 0.3 },
      { x: 3.5, y: 0, z: -0.5, ry: -0.5 },
    ],
  },
  {
    id: 'fountain', name: 'Fountain', icon: '⛲',
    description: 'Beautiful centerpiece',
    model: null, // procedural
    rentBonusPerFloor: 1, ownIncome: 0, ownIncomeFloorScale: 0,
    baseCost: 300, costScale: 1.3, maxCount: 3, count: 0, unlockFloors: 6,
    positions: [
      { x: 0, y: 0, z: -1.8, ry: 0 },
      { x: -2, y: 0, z: -2, ry: 0 },
      { x: 2, y: 0, z: -2, ry: 0 },
    ],
  },
  {
    id: 'playground', name: 'Playground', icon: '🎠',
    description: 'Families love it',
    model: null, // procedural
    rentBonusPerFloor: 0.7, ownIncome: 0, ownIncomeFloorScale: 0,
    baseCost: 200, costScale: 1.2, maxCount: 3, count: 0, unlockFloors: 4,
    positions: [
      { x: -2, y: 0, z: -1, ry: 0 },
      { x: 2.5, y: 0, z: -1.5, ry: 0 },
      { x: -3, y: 0, z: -1.5, ry: 0 },
    ],
  },
];

const neighborhoodModels: THREE.Object3D[] = []; // spawned 3D models

function getNeighborhoodRentBonus(): number {
  let bonus = 0;
  for (const n of neighborhoodUpgrades) {
    bonus += n.rentBonusPerFloor * n.count;
  }
  return bonus;
}

function getNeighborhoodIncome(): number {
  let income = 0;
  for (const n of neighborhoodUpgrades) {
    if (n.ownIncome > 0 && n.count > 0) {
      income += n.ownIncome * n.count * (1 + state.floors * n.ownIncomeFloorScale);
    }
  }
  return income;
}

function getNeighborhoodCost(n: NeighborhoodDef): number {
  return Math.floor(n.baseCost * Math.pow(n.costScale, n.count));
}

async function spawnNeighborhoodModel(n: NeighborhoodDef) {
  const posIndex = n.count - 1;
  if (posIndex < 0 || posIndex >= n.positions.length) return;
  const pos = n.positions[posIndex];

  let obj: THREE.Object3D;
  if (n.model) {
    obj = await loadModel(n.model);
    if (n.scaleOverride) {
      obj.scale.setScalar(n.scaleOverride);
    }
  } else {
    // Procedural geometry for fountain/playground
    if (n.id === 'fountain') {
      const group = new THREE.Group();
      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.35, 0.15, 16),
        new THREE.MeshLambertMaterial({ color: 0x888888 })
      );
      base.position.y = 0.075;
      base.castShadow = true;
      group.add(base);
      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 0.4, 8),
        new THREE.MeshLambertMaterial({ color: 0x999999 })
      );
      pillar.position.y = 0.35;
      pillar.castShadow = true;
      group.add(pillar);
      const top = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 8, 8),
        new THREE.MeshLambertMaterial({ color: 0x6699cc })
      );
      top.position.y = 0.55;
      group.add(top);
      obj = group;
    } else {
      // Playground — colorful shapes
      const group = new THREE.Group();
      const slide = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 0.4, 0.5),
        new THREE.MeshLambertMaterial({ color: 0xdd4444 })
      );
      slide.position.set(0, 0.2, 0);
      slide.rotation.x = 0.3;
      slide.castShadow = true;
      group.add(slide);
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.5, 0.05),
        new THREE.MeshLambertMaterial({ color: 0x4488dd })
      );
      frame.position.set(0, 0.25, -0.2);
      frame.castShadow = true;
      group.add(frame);
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
function getFloorRent(floorIndex: number): number {
  let rent = BASE_RENT + getNeighborhoodRentBonus();
  const installed = state.floorAmenities[floorIndex];
  if (installed) {
    for (const a of amenities) {
      if (installed.has(a.id)) {
        rent += a.rentBonus;
      }
    }
  }
  return rent;
}

function getTotalRentPerSecond(): number {
  let total = 0;
  // Only occupied floors generate income (first N floors occupied)
  for (let i = 0; i < state.occupied; i++) {
    total += getFloorRent(i);
  }
  // Add neighborhood businesses income
  total += getNeighborhoodIncome();
  return total;
}

function getAverageRent(): number {
  if (state.floors === 0) return BASE_RENT;
  let total = 0;
  for (let i = 0; i < state.floors; i++) {
    total += getFloorRent(i);
  }
  return total / state.floors;
}

function getTargetOccupancy(): number {
  const unlocked = amenities.filter(a => state.floors >= a.unlockFloors);
  if (unlocked.length === 0) return state.floors;

  let totalInstalls = 0;
  for (const a of amenities) {
    if (state.floors >= a.unlockFloors) {
      totalInstalls += a.totalInstalled;
    }
  }
  const maxInstalls = state.floors * unlocked.length;
  const coverage = totalInstalls / maxInstalls;

  const occupancyRatio = Math.min(1, coverage / 0.4);
  return Math.max(1, Math.round(state.floors * occupancyRatio));
}

// ── Phase Detection ─────────────────────────────────────────
function allFloorsFullyUpgraded(): boolean {
  const unlocked = amenities.filter(a => state.floors >= a.unlockFloors);
  for (let i = 0; i < state.floors; i++) {
    const installed = state.floorAmenities[i];
    if (!installed || !unlocked.every(a => installed.has(a.id))) return false;
  }
  return true;
}

function isInBulkPhase(): boolean {
  // Past the cap = already passed the gate, always bulk
  // At the cap = bulk only if all maxed
  return state.floors > PER_FLOOR_CAP || (state.floors === PER_FLOOR_CAP && allFloorsFullyUpgraded());
}

// How many floors are missing a given amenity
function floorsMissingAmenity(a: AmenityDef): number {
  let count = 0;
  for (let i = 0; i < state.floors; i++) {
    const installed = state.floorAmenities[i];
    if (!installed || !installed.has(a.id)) count++;
  }
  return count;
}

// Cost to install an amenity on all missing floors
function getBulkAmenityCost(a: AmenityDef): number {
  const missing = floorsMissingAmenity(a);
  let total = 0;
  let tempInstalled = a.totalInstalled;
  for (let i = 0; i < missing; i++) {
    total += Math.floor(a.baseCost * Math.pow(a.costScale, tempInstalled));
    tempInstalled++;
  }
  return total;
}

// ── Upgrade Cost ────────────────────────────────────────────
function getAmenityCost(a: AmenityDef): number {
  return Math.floor(a.baseCost * Math.pow(a.costScale, a.totalInstalled));
}

const floorBaseCost = 10;
const floorCostScale = 1.35;
let floorsPurchased = 0;

function getFloorCost(): number {
  return Math.floor(floorBaseCost * Math.pow(floorCostScale, floorsPurchased));
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
  const buildingHeight = (state.floors + 1) * actualFloorHeight;
  const lookAtY = buildingHeight * 0.35;
  const distance = Math.max(8, buildingHeight * 0.6 + 6);

  cameraTargetPos.set(distance * 0.15, lookAtY + distance * 0.35, distance);
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
const POP_DURATION = 1400; // ms

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

  const rent = getFloorRent(floorIndex);
  const el = document.createElement('div');
  el.className = 'money-pop';
  el.textContent = `+$${Math.floor(rent)}`;
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
const POP_INTERVAL = 2; // seconds between pops

function tickMoneyPops(delta: number) {
  popTimer += delta;
  if (popTimer >= POP_INTERVAL) {
    popTimer = 0;
    // Pop from each occupied floor
    for (let i = 0; i < state.occupied && i < state.floors; i++) {
      // Stagger slightly so they don't all appear at once
      setTimeout(() => spawnMoneyPop(i), i * 80);
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
  const installed = state.floorAmenities[floorIndex];
  if (!installed) return null;
  for (const a of amenities) {
    if (state.floors >= a.unlockFloors && !installed.has(a.id)) {
      return a;
    }
  }
  return null;
}

function isFloorFullyUpgraded(floorIndex: number): boolean {
  const installed = state.floorAmenities[floorIndex];
  if (!installed) return false;
  const unlocked = amenities.filter(a => state.floors >= a.unlockFloors);
  return unlocked.every(a => installed.has(a.id));
}

function ensureFloorPanels() {
  while (floorPanels.length < state.floors) {
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

    // Buy button (next upgrade) — shows full info
    const buyBtn = document.createElement('button');
    buyBtn.className = 'floor-buy-btn';
    buyBtn.addEventListener('click', () => {
      const next = getNextUpgrade(floorIndex);
      if (!next) return;
      const cost = getAmenityCost(next);
      const installed = state.floorAmenities[floorIndex];
      if (state.money >= cost && installed && !installed.has(next.id)) {
        state.money -= cost;
        installed.add(next.id);
        next.totalInstalled++;
        renderUI();
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
    const installed = state.floorAmenities[i] || new Set();
    const isOccupied = i < state.occupied;
    const floorRent = getFloorRent(i);
    const fullyUpgraded = isFloorFullyUpgraded(i);

    // Rent label
    panel.rentLabel.textContent = isOccupied ? `$${Math.floor(floorRent)}/s` : 'vacant';
    panel.rentLabel.classList.toggle('vacant', !isOccupied);

    // Installed icons — show small icons for purchased amenities, or star if fully upgraded
    const iconKey = fullyUpgraded ? 'full' : Array.from(installed).join(',');
    if (panel.iconsEl.dataset.key !== iconKey) {
      panel.iconsEl.dataset.key = iconKey;
      if (fullyUpgraded) {
        panel.iconsEl.innerHTML = '<span class="floor-complete">\u2605</span>';
      } else {
        let icons = '';
        for (const a of amenities) {
          if (installed.has(a.id)) {
            icons += `<span class="floor-installed-icon">${a.icon}</span>`;
          }
        }
        panel.iconsEl.innerHTML = icons;
      }
    }

    // Buy button — show next available upgrade with full info
    const next = getNextUpgrade(i);
    if (next && !fullyUpgraded) {
      const cost = getAmenityCost(next);
      const canAfford = state.money >= cost;
      panel.buyBtn.style.display = '';
      panel.buyBtn.disabled = !canAfford;
      const key = `${next.id}:${formatMoney(cost)}`;
      if (panel.buyBtn.dataset.key !== key) {
        panel.buyBtn.dataset.key = key;
        panel.buyBtn.innerHTML = `
          <span class="btn-icon">${next.icon}</span>
          <span class="btn-info">
            <span class="btn-name">${next.name}</span>
            <span class="btn-detail"><span class="cost-val">${formatMoney(cost)}</span> · <span class="rent-val">+$${next.rentBonus}/s</span></span>
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
  // Block adding floors beyond cap if not all maxed
  if (state.floors >= PER_FLOOR_CAP && !allFloorsFullyUpgraded()) return;
  const cost = getFloorCost();
  if (state.money >= cost) {
    state.money -= cost;
    state.floors++;
    floorsPurchased++;
    state.floorAmenities.push(new Set());
    addFloorToBuilding();
    markDirty();
    renderUI();
  }
});
shopEl.appendChild(floorBtn);

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
    for (let i = 0; i < state.floors; i++) {
      const installed = state.floorAmenities[i];
      if (installed && !installed.has(a.id)) {
        installed.add(a.id);
        a.totalInstalled++;
      }
    }
    renderUI();
  });
  bulkEl.appendChild(btn);
  bulkButtons.set(a.id, btn);
}

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

function renderNeighborhoodUI() {
  for (const n of neighborhoodUpgrades) {
    const btn = hoodButtons.get(n.id)!;
    if (state.floors < n.unlockFloors) {
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
      if (n.rentBonusPerFloor > 0) bonusText += `<span class="rent-val">+$${n.rentBonusPerFloor}/floor</span>`;
      if (n.ownIncome > 0) {
        const incomePreview = n.ownIncome * (1 + state.floors * n.ownIncomeFloorScale);
        if (bonusText) bonusText += ' · ';
        bonusText += `<span class="rent-val">earns $${Math.floor(incomePreview)}/s</span>`;
      }
      const key = `${n.id}:${n.count}:${formatMoney(cost)}:${state.floors}`;
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
  const avgRent = getAverageRent();

  moneyDisplay.textContent = formatMoney(state.money);
  incomeDisplay.textContent = formatMoney(income) + '/s';
  floorDisplay.textContent = String(state.floors);
  rentDisplay.textContent = formatMoney(avgRent) + ' avg';

  const pct = state.floors > 0 ? Math.round((state.occupied / state.floors) * 100) : 0;
  occupancyDisplay.textContent = `${state.occupied}/${state.floors}`;
  occupancyPct.textContent = `${pct}%`;
  vacancyFill.style.width = `${pct}%`;

  if (pct >= 80) vacancyFill.style.background = '#7efa7e';
  else if (pct >= 50) vacancyFill.style.background = '#fadb7e';
  else vacancyFill.style.background = '#fa7e7e';

  // ── Phase logic ──
  const bulk = isInBulkPhase();
  const atCap = state.floors >= PER_FLOOR_CAP && !allFloorsFullyUpgraded();

  // Floor button
  const floorCost = getFloorCost();
  const canBuyFloor = state.money >= floorCost && !atCap;
  floorBtn.disabled = !canBuyFloor;
  const floorKey = `${floorCost}:${state.floors}:${atCap}`;
  if (floorBtn.dataset.key !== floorKey) {
    floorBtn.dataset.key = floorKey;
    if (atCap) {
      floorBtn.innerHTML = `
        + New Floor
        <span class="cost">${formatMoney(floorCost)}</span>
        <span class="desc">Upgrade all floors first!</span>
      `;
    } else {
      floorBtn.innerHTML = `
        + New Floor
        <span class="cost">${formatMoney(floorCost)}</span>
        <span class="desc">Add floor #${state.floors + 1}</span>
      `;
    }
  }

  // Show/hide per-floor panels vs bulk upgrades
  floorPanelsContainer.style.display = bulk ? 'none' : '';
  bulkEl.style.display = bulk ? 'flex' : 'none';

  // Update bulk buttons
  if (bulk) {
    for (const a of amenities) {
      const btn = bulkButtons.get(a.id)!;
      if (state.floors < a.unlockFloors) {
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
              <span class="bulk-detail"><span class="cost-val">${formatMoney(cost)}</span> · <span class="rent-val">+$${a.rentBonus}/s</span> · <span class="count-val">${missing} floors</span></span>
            </span>
          `;
        }
      }
    }
  }

  // Neighborhood
  renderNeighborhoodUI();
}

// ── Game Loop ───────────────────────────────────────────────
let lastTime = performance.now();
let incomeAccumulator = 0;
let occupancyTimer = 0;
let uiTimer = 0;
const UI_INTERVAL = 0.15; // update DOM ~7fps
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

  // ── Occupancy tick ──
  occupancyTimer += delta;
  if (occupancyTimer >= 1.5) {
    occupancyTimer = 0;
    const target = getTargetOccupancy();
    if (state.occupied < target) {
      state.occupied++;
      spawnTenant(true);
      markDirty();
    } else if (state.occupied > target) {
      state.occupied--;
      spawnTenant(false);
      markDirty();
    }
  }

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

async function init() {
  await initBuilding();
  renderUI();
  requestAnimationFrame(gameLoop);
}

init();
