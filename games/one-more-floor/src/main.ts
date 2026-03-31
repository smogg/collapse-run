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

interface GameState {
  money: number;
  floors: number;
  occupied: number;
  floorAmenities: Set<string>[]; // per-floor: which amenities are installed
}

const BASE_RENT = 1;

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

// ── Economy ─────────────────────────────────────────────────
function getFloorRent(floorIndex: number): number {
  let rent = BASE_RENT;
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

function updateFloorPanels() {
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
      // Only update innerHTML when content changes to avoid destroying click targets
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

    // Project 3D position to screen — LEFT side of building
    const worldPos = new THREE.Vector3(-0.8, (i + 0.5) * actualFloorHeight, 0);
    buildingGroup.localToWorld(worldPos);
    worldPos.project(camera);

    const hw = window.innerWidth / 2;
    const hh = window.innerHeight / 2;
    const sx = worldPos.x * hw + hw;
    const sy = -(worldPos.y * hh) + hh;

    if (worldPos.z > 0 && worldPos.z < 1) {
      // Anchor to the right edge (panel extends left from building)
      panel.el.style.transform = `translate(-100%, -50%) translate(${sx}px, ${sy}px)`;
      panel.el.style.opacity = '1';
    } else {
      panel.el.style.opacity = '0';
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
  const cost = getFloorCost();
  if (state.money >= cost) {
    state.money -= cost;
    state.floors++;
    floorsPurchased++;
    state.floorAmenities.push(new Set());
    addFloorToBuilding();
    renderUI();
  }
});
shopEl.appendChild(floorBtn);

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

  const floorCost = getFloorCost();
  floorBtn.disabled = state.money < floorCost;
  const floorKey = `${floorCost}:${state.floors}`;
  if (floorBtn.dataset.key !== floorKey) {
    floorBtn.dataset.key = floorKey;
    floorBtn.innerHTML = `
      + New Floor
      <span class="cost">${formatMoney(floorCost)}</span>
      <span class="desc">Add floor #${state.floors + 1}</span>
    `;
  }
}

// ── Game Loop ───────────────────────────────────────────────
let lastTime = performance.now();
let incomeAccumulator = 0;
let occupancyTimer = 0;

function gameLoop(time: number) {
  requestAnimationFrame(gameLoop);

  const delta = (time - lastTime) / 1000;
  lastTime = time;

  const income = getTotalRentPerSecond();
  incomeAccumulator += income * delta;
  if (incomeAccumulator >= 0.1) {
    const amount = Math.floor(incomeAccumulator * 10) / 10;
    state.money += amount;
    incomeAccumulator -= amount;
  }

  occupancyTimer += delta;
  if (occupancyTimer >= 1.5) {
    occupancyTimer = 0;
    const target = getTargetOccupancy();
    if (state.occupied < target) {
      state.occupied++;
      spawnTenant(true);
    } else if (state.occupied > target) {
      state.occupied--;
      spawnTenant(false);
    }
  }

  updateTenants(delta);
  tickMoneyPops(delta);
  renderUI();
  updateFloorPanels();
  animateCamera();

  buildingGroup.rotation.y = Math.sin(time * 0.0003) * 0.05;

  renderer.render(scene, camera);
}

// ── Resize Handler ──────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
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
