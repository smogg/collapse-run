import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { detectPlatform, type GamePlatform } from './platform';
import { getRandomCity } from './cities';
import type { SaveData, SaveMeta } from './save';
import { loadSaveIndex, updateSaveIndex, removeSaveFromIndex, loadAccountData, saveAccountData } from './save';
import { playCashSound, playClickSound, playUpgradeSound, playNewFloorSound, playAchievementSound, playTenantSound, playStudioSound, playEventSound, playThunderSound, startRainAmbience, stopRainAmbience, setMuted, isMuted, preloadSounds } from './audio';

let platform: GamePlatform;

// ══════════════════════════════════════════════════════════════
// GAME CONFIG — tweak all balance numbers here
// ══════════════════════════════════════════════════════════════
const CONFIG = {
  // Economy
  baseRent: 80,               // rent per tenant with no upgrades
  incomeTickRate: 0.1,      // minimum money increment

  // Floors
  floorBaseCost: 10000,     // first extra floor costs this
  floorCostScale: 3,      // each floor costs this × more (10k, 72k, 518k, 3.7M...)
  perFloorCap: 10,          // per-floor UI phase ends here

  // Tenants
  baseFillRate: 0.02,        // base tenants arriving per second (across whole building)
  baseChurnRate: 0.08,       // base chance per tenant per minute to leave
  amenityChurnReduction: 0.007, // each installed amenity reduces churn by this much
  studioBaseCost: 150000,    // base cost of studio conversion
  studioCostScale: 50,       // each studio level costs 50x more
  maxStudioLevel: 4,         // max studio upgrades per floor

  // Ads (temporary boost, click-heavy)
  adCost: 5,                 // flat cost per click
  adBoostPerClick: 0.08,     // each click adds this to fill rate
  adBoostMaxDuration: 30,    // timer caps at 30s, doesn't stack beyond
  adMaxBoost: 2.0,           // max fill rate bonus from ads
  adDecayRate: 0.015,        // boost decays slowly so clicks feel impactful

  // Amenities (per-floor upgrades)
  amenities: [
    { id: 'hotwater', name: 'Hot Water', icon: '🚿', rentBonus: 3.3,  baseCost: 4,    costScale: 1.35, unlockFloors: 1 },
    { id: 'heating',  name: 'Heating',   icon: '🔥', rentBonus: 5.5,  baseCost: 12,   costScale: 1.40, unlockFloors: 1 },
    { id: 'ac',       name: 'AC',        icon: '❄️', rentBonus: 8.8,  baseCost: 35,   costScale: 1.45, unlockFloors: 1 },
    { id: 'balcony',  name: 'Balcony',   icon: '🌿', rentBonus: 13.2, baseCost: 400,  costScale: 1.50, unlockFloors: 1 },
    { id: 'laundry',  name: 'Laundry',   icon: '👕', rentBonus: 11,   baseCost: 1000, costScale: 1.50, unlockFloors: 1 },
    { id: 'gym',      name: 'Gym',       icon: '💪', rentBonus: 19.8, baseCost: 2500, costScale: 1.55, unlockFloors: 1 },
  ],

  // Neighborhood upgrades
  // incomeMultiplier: each purchase multiplies TOTAL income by (1 + this)
  // rentBonusPerFloor: flat bonus added to each floor's rent
  neighborhood: [
    { id: 'sidewalk',    name: 'Sidewalk',       icon: '🚶', rentBonusPerFloor: 5,    incomeMultiplier: 0.15, ownIncome: 0,   ownIncomeFloorScale: 0,   baseCost: 5000, costScale: 1.00, maxCount: 1,   unlockFloors: 1,  fillRateBonus: 0 },
    { id: 'streetlight', name: 'Streetlight',   icon: '💡', rentBonusPerFloor: 0.5,  incomeMultiplier: 0.005, ownIncome: 0,   ownIncomeFloorScale: 0,   baseCost: 200,  costScale: 2.0,  maxCount: 20,  unlockFloors: 1,  fillRateBonus: 0 },
    { id: 'tree',        name: 'Tree',          icon: '🌳', rentBonusPerFloor: 0.3,  incomeMultiplier: 0.003, ownIncome: 0,   ownIncomeFloorScale: 0,   baseCost: 100,  costScale: 1.9,  maxCount: 15,  unlockFloors: 1,  fillRateBonus: 0 },
    { id: 'bench',       name: 'Park Bench',    icon: '🪑', rentBonusPerFloor: 0.2,  incomeMultiplier: 0.005,ownIncome: 0,   ownIncomeFloorScale: 0,   baseCost: 500,  costScale: 2.1,  maxCount: 10,  unlockFloors: 3,  fillRateBonus: 0 },
    { id: 'parking',     name: 'Parking Space', icon: '🅿️', rentBonusPerFloor: 0.8,  incomeMultiplier: 0.008, ownIncome: 0,   ownIncomeFloorScale: 0,   baseCost: 2000, costScale: 2.2,  maxCount: 15,  unlockFloors: 5,  fillRateBonus: 0 },
    { id: 'cafe',        name: 'Café',          icon: '☕', rentBonusPerFloor: 1.0,  incomeMultiplier: 0.02, ownIncome: 100,  ownIncomeFloorScale: 2.0, baseCost: 1000, costScale: 1.45, maxCount: 1,   unlockFloors: 8,  fillRateBonus: 0 },
    { id: 'restaurant', name: 'Restaurant',    icon: '🍽️', rentBonusPerFloor: 2.0,  incomeMultiplier: 0.03, ownIncome: 500,  ownIncomeFloorScale: 5.0, baseCost: 50000, costScale: 1.50, maxCount: 1,  unlockFloors: 10, fillRateBonus: 0 },
    { id: 'salon',      name: 'Hair Salon',    icon: '💇', rentBonusPerFloor: 1.5,  incomeMultiplier: 0.02, ownIncome: 200,  ownIncomeFloorScale: 3.0, baseCost: 20000, costScale: 1.45, maxCount: 1,  unlockFloors: 7,  fillRateBonus: 0.05 },
    { id: 'spa',        name: 'Luxury Spa',    icon: '🧖', rentBonusPerFloor: 3.0,  incomeMultiplier: 0.04, ownIncome: 2000, ownIncomeFloorScale: 10.0, baseCost: 200000, costScale: 1.55, maxCount: 1, unlockFloors: 14, fillRateBonus: 0 },
    { id: 'fountain',    name: 'Fountain',      icon: '⛲', rentBonusPerFloor: 1.5,  incomeMultiplier: 0.01, ownIncome: 0,   ownIncomeFloorScale: 0,   baseCost: 8000, costScale: 2.5,  maxCount: 8,   unlockFloors: 6,  fillRateBonus: 0 },
    { id: 'playground',  name: 'Playground',    icon: '🎠', rentBonusPerFloor: 1.0,  incomeMultiplier: 0.008, ownIncome: 0,   ownIncomeFloorScale: 0,   baseCost: 3000, costScale: 2.3,  maxCount: 8,   unlockFloors: 4,  fillRateBonus: 0 },
    // Fill rate upgrades — get to ~1.2/s by floor 5-6
    { id: 'billboard',   name: 'Billboard',     icon: '📋', rentBonusPerFloor: 0,    incomeMultiplier: 0,    ownIncome: 0,   ownIncomeFloorScale: 0,   baseCost: 300,  costScale: 2.0,  maxCount: 10,  unlockFloors: 2,  fillRateBonus: 0.03 },
    { id: 'busstop',     name: 'Bus Stop',      icon: '🚌', rentBonusPerFloor: 0.1,  incomeMultiplier: 0,    ownIncome: 0,   ownIncomeFloorScale: 0,   baseCost: 2000, costScale: 2.5,  maxCount: 8,   unlockFloors: 3,  fillRateBonus: 0.06 },
    { id: 'metrostation',name: 'Metro Station', icon: '🚇', rentBonusPerFloor: 0.5,  incomeMultiplier: 0.02, ownIncome: 0,   ownIncomeFloorScale: 0,   baseCost: 25000,costScale: 3.0,  maxCount: 5,   unlockFloors: 5,  fillRateBonus: 0.12 },
    // Late-game mega upgrades (unlock after floor 15+)
    { id: 'heliport',    name: 'Heliport',        icon: '🚁', rentBonusPerFloor: 50,   incomeMultiplier: 0.10, ownIncome: 0,   ownIncomeFloorScale: 0,   baseCost: 1e15,  costScale: 5.0,  maxCount: 10,  unlockFloors: 15, fillRateBonus: 0.5 },
    { id: 'private_airport', name: 'Private Airport', icon: '✈️', rentBonusPerFloor: 200, incomeMultiplier: 0.15, ownIncome: 0,   ownIncomeFloorScale: 0,   baseCost: 50e15, costScale: 8.0,  maxCount: 5,   unlockFloors: 18, fillRateBonus: 1.0 },
    { id: 'yacht_club',  name: 'Yacht Club',      icon: '⛵', rentBonusPerFloor: 100,  incomeMultiplier: 0.12, ownIncome: 1e12, ownIncomeFloorScale: 50,  baseCost: 10e15, costScale: 6.0,  maxCount: 8,   unlockFloors: 16, fillRateBonus: 0.3 },
    { id: 'golf_course', name: 'Golf Course',     icon: '⛳', rentBonusPerFloor: 80,   incomeMultiplier: 0.08, ownIncome: 5e11, ownIncomeFloorScale: 30,  baseCost: 5e15,  costScale: 5.0,  maxCount: 8,   unlockFloors: 14, fillRateBonus: 0.2 },
    { id: 'shopping_mall', name: 'Shopping Mall',  icon: '🏬', rentBonusPerFloor: 300,  incomeMultiplier: 0.20, ownIncome: 5e12, ownIncomeFloorScale: 100, baseCost: 100e15, costScale: 8.0, maxCount: 5,   unlockFloors: 20, fillRateBonus: 2.0 },
    { id: 'theme_park',  name: 'Theme Park',      icon: '🎢', rentBonusPerFloor: 500,  incomeMultiplier: 0.25, ownIncome: 10e12, ownIncomeFloorScale: 200, baseCost: 500e15, costScale: 10.0, maxCount: 3, unlockFloors: 22, fillRateBonus: 3.0 },
    { id: 'space_elevator', name: 'Space Elevator', icon: '🛸', rentBonusPerFloor: 1000, incomeMultiplier: 0.50, ownIncome: 50e12, ownIncomeFloorScale: 500, baseCost: 10e18, costScale: 15.0, maxCount: 3, unlockFloors: 25, fillRateBonus: 5.0 },
    { id: 'quantum_lab', name: 'Quantum Lab',     icon: '⚛️', rentBonusPerFloor: 2000, incomeMultiplier: 0.40, ownIncome: 100e12, ownIncomeFloorScale: 1000, baseCost: 50e18, costScale: 12.0, maxCount: 3, unlockFloors: 28, fillRateBonus: 8.0 },
    { id: 'dyson_sphere', name: 'Dyson Sphere',   icon: '☀️', rentBonusPerFloor: 5000, incomeMultiplier: 1.00, ownIncome: 1e15, ownIncomeFloorScale: 5000, baseCost: 500e18, costScale: 20.0, maxCount: 1, unlockFloors: 30, fillRateBonus: 20.0 },
  ],

  // Business sub-upgrades (per business type)
  businessUpgrades: {
    cafe: [
      { id: 'menu', name: 'Better Menu', icon: '📋', incomeBoost: 1.0, baseCost: 300, costScale: 1.8, maxLevel: 20 },
      { id: 'seating', name: 'More Seating', icon: '💺', incomeBoost: 0.8, baseCost: 500, costScale: 1.7, maxLevel: 20 },
      { id: 'barista', name: 'Expert Barista', icon: '👨‍🍳', incomeBoost: 1.5, baseCost: 2000, costScale: 2.0, maxLevel: 15 },
      { id: 'franchise', name: 'Franchise License', icon: '🏪', incomeBoost: 5.0, baseCost: 50000, costScale: 2.5, maxLevel: 5 },
    ],
    restaurant: [
      { id: 'chef', name: 'Head Chef', icon: '👨‍🍳', incomeBoost: 2.0, baseCost: 10000, costScale: 1.8, maxLevel: 15 },
      { id: 'winelist', name: 'Wine Selection', icon: '🍷', incomeBoost: 1.5, baseCost: 8000, costScale: 1.7, maxLevel: 20 },
      { id: 'michelin', name: 'Michelin Star', icon: '⭐', incomeBoost: 10.0, baseCost: 500000, costScale: 3.0, maxLevel: 3 },
      { id: 'catering', name: 'Catering Service', icon: '🚐', incomeBoost: 3.0, baseCost: 100000, costScale: 2.0, maxLevel: 10 },
    ],
    salon: [
      { id: 'stylist', name: 'Star Stylist', icon: '✂️', incomeBoost: 1.5, baseCost: 5000, costScale: 1.8, maxLevel: 15 },
      { id: 'products', name: 'Premium Products', icon: '💅', incomeBoost: 1.0, baseCost: 3000, costScale: 1.7, maxLevel: 20 },
      { id: 'vip', name: 'VIP Treatments', icon: '💎', incomeBoost: 4.0, baseCost: 50000, costScale: 2.2, maxLevel: 8 },
    ],
    spa: [
      { id: 'massage', name: 'Massage Therapy', icon: '💆', incomeBoost: 2.0, baseCost: 50000, costScale: 1.8, maxLevel: 15 },
      { id: 'sauna', name: 'Sauna Suite', icon: '🧖', incomeBoost: 2.5, baseCost: 80000, costScale: 1.9, maxLevel: 10 },
      { id: 'retreat', name: 'Wellness Retreat', icon: '🌿', incomeBoost: 8.0, baseCost: 500000, costScale: 2.5, maxLevel: 5 },
      { id: 'celebrity_spa', name: 'Celebrity Package', icon: '🌟', incomeBoost: 15.0, baseCost: 5000000, costScale: 3.0, maxLevel: 3 },
    ],
  } as Record<string, { id: string; name: string; icon: string; incomeBoost: number; baseCost: number; costScale: number; maxLevel: number }[]>,

  // Penthouse
  penthouseCost: 500000,
  penthouseRentMultiplier: 10,
  penthouseMaxTenants: 5,
  penthouseUpgrades: [
    { id: 'jacuzzi', name: 'Jacuzzi', icon: '🛁', rentBonus: 50, baseCost: 10000, costScale: 1.5 },
    { id: 'skybar', name: 'Sky Bar', icon: '🍸', rentBonus: 80, baseCost: 25000, costScale: 1.6 },
    { id: 'helipad', name: 'Helipad', icon: '🚁', rentBonus: 150, baseCost: 100000, costScale: 1.7 },
    { id: 'infinity_pool', name: 'Infinity Pool', icon: '🏊', rentBonus: 120, baseCost: 75000, costScale: 1.65 },
    { id: 'wine_cellar', name: 'Wine Cellar', icon: '🍷', rentBonus: 60, baseCost: 30000, costScale: 1.55 },
    { id: 'home_theater', name: 'Home Theater', icon: '🎬', rentBonus: 40, baseCost: 15000, costScale: 1.5 },
    { id: 'smart_home', name: 'Smart Home', icon: '🤖', rentBonus: 100, baseCost: 50000, costScale: 1.6 },
    { id: 'private_chef', name: 'Private Chef', icon: '👨‍🍳', rentBonus: 200, baseCost: 200000, costScale: 1.8 },
  ] as { id: string; name: string; icon: string; rentBonus: number; baseCost: number; costScale: number }[],

  // Achievement yard signs
  achievementSigns: [
    // Tenant milestones
    { id: 'first_tenant', name: 'First Tenant', icon: 'icons/id-card.svg', bonus: 1.05, trigger: 'tenants' as const, value: 1 },
    { id: 'ten_tenants', name: '10 Tenants', icon: 'icons/id-card.svg', bonus: 1.05, trigger: 'tenants' as const, value: 10 },
    { id: 'fifty_tenants', name: '50 Tenants', icon: 'icons/sprint.svg', bonus: 1.08, trigger: 'tenants' as const, value: 50 },
    { id: 'hundred_tenants', name: '100 Tenants', icon: 'icons/sprint.svg', bonus: 1.10, trigger: 'tenants' as const, value: 100 },
    { id: 'five_hundred_tenants', name: '500 Tenants', icon: 'icons/star-formation.svg', bonus: 1.15, trigger: 'tenants' as const, value: 500 },
    { id: 'thousand_tenants', name: '1000 Tenants', icon: 'icons/modern-city.svg', bonus: 1.20, trigger: 'tenants' as const, value: 1000 },
    { id: 'five_k_tenants', name: '5000 Tenants', icon: 'icons/modern-city.svg', bonus: 1.25, trigger: 'tenants' as const, value: 5000 },
    { id: 'ten_k_tenants', name: '10K Tenants', icon: 'icons/star-formation.svg', bonus: 1.30, trigger: 'tenants' as const, value: 10000 },
    { id: 'fifty_k_tenants', name: '50K Tenants', icon: 'icons/star-formation.svg', bonus: 1.40, trigger: 'tenants' as const, value: 50000 },
    { id: 'hundred_k_tenants', name: '100K Tenants', icon: 'icons/sprint.svg', bonus: 1.50, trigger: 'tenants' as const, value: 100000 },

    // Floor milestones
    { id: 'first_floor', name: 'First Floor', icon: 'icons/family-house.svg', bonus: 1.05, trigger: 'floors' as const, value: 2 },
    { id: 'five_floors', name: '5 Stories', icon: 'icons/upgrade.svg', bonus: 1.08, trigger: 'floors' as const, value: 5 },
    { id: 'ten_floors', name: '10 Stories', icon: 'icons/upgrade.svg', bonus: 1.10, trigger: 'floors' as const, value: 10 },
    { id: 'twenty_floors', name: 'Skyscraper', icon: 'icons/modern-city.svg', bonus: 1.15, trigger: 'floors' as const, value: 20 },
    { id: 'thirty_floors', name: '30 Stories', icon: 'icons/modern-city.svg', bonus: 1.15, trigger: 'floors' as const, value: 30 },
    { id: 'fifty_floors', name: 'Mega Tower', icon: 'icons/modern-city.svg', bonus: 1.20, trigger: 'floors' as const, value: 50 },
    { id: 'hundred_floors', name: 'Arcology', icon: 'icons/modern-city.svg', bonus: 1.30, trigger: 'floors' as const, value: 100 },

    // Money milestones
    { id: 'first_million', name: 'Millionaire', icon: 'icons/two-coins.svg', bonus: 1.10, trigger: 'money_earned' as const, value: 1e6 },
    { id: 'first_billion', name: 'Billionaire', icon: 'icons/money-stack.svg', bonus: 1.15, trigger: 'money_earned' as const, value: 1e9 },
    { id: 'first_trillion', name: 'Trillionaire', icon: 'icons/cash.svg', bonus: 1.20, trigger: 'money_earned' as const, value: 1e12 },
    { id: 'quadrillionaire', name: 'Quadrillionaire', icon: 'icons/gold-mine.svg', bonus: 1.25, trigger: 'money_earned' as const, value: 1e15 },
    { id: 'quintillionaire', name: 'Quintillionaire', icon: 'icons/gold-mine.svg', bonus: 1.30, trigger: 'money_earned' as const, value: 1e18 },
    { id: 'sextillionaire', name: 'Sextillionaire', icon: 'icons/cash.svg', bonus: 1.35, trigger: 'money_earned' as const, value: 1e21 },
    { id: 'septillionaire', name: 'Septillionaire', icon: 'icons/money-stack.svg', bonus: 1.40, trigger: 'money_earned' as const, value: 1e24 },
    { id: 'beyond_money', name: 'Beyond Money', icon: 'icons/laurel-crown.svg', bonus: 2.00, trigger: 'money_earned' as const, value: 1e30 },

    // Studio milestones
    { id: 'first_studio', name: 'Studio Upgrade', icon: 'icons/hammer-drop.svg', bonus: 1.08, trigger: 'studios' as const, value: 1 },
    { id: 'five_studios', name: 'Renovation King', icon: 'icons/skills.svg', bonus: 1.10, trigger: 'studios' as const, value: 5 },
    { id: 'twenty_studios', name: 'Master Builder', icon: 'icons/hammer-drop.svg', bonus: 1.15, trigger: 'studios' as const, value: 20 },

    // Event milestones
    { id: 'first_event', name: 'Weather Watcher', icon: 'icons/sun.svg', bonus: 1.05, trigger: 'events' as const, value: 1 },
    { id: 'ten_events', name: 'Event Veteran', icon: 'icons/tornado.svg', bonus: 1.10, trigger: 'events' as const, value: 10 },
    { id: 'fifty_events', name: 'Storm Chaser', icon: 'icons/tornado.svg', bonus: 1.15, trigger: 'events' as const, value: 50 },

    // Special
    { id: 'full_house', name: 'No Vacancy', icon: 'icons/crowned-heart.svg', bonus: 1.10, trigger: 'occupancy_full' as const, value: 0 },
    { id: 'penthouse', name: 'Penthouse Suite', icon: 'icons/trophy.svg', bonus: 1.20, trigger: 'penthouses' as const, value: 0 },
    { id: 'five_penthouses', name: 'Luxury Empire', icon: 'icons/laurel-crown.svg', bonus: 1.25, trigger: 'penthouses_count' as const, value: 5 },
    { id: 'completionist', name: 'Completionist', icon: 'icons/medal.svg', bonus: 1.50, trigger: 'all_achievements' as const, value: 0 },
  ],

  // Visuals
  moneyPopInterval: 2,       // seconds between money pops
  moneyPopDuration: 1400,    // ms per pop animation
  uiUpdateInterval: 0.15,    // seconds between DOM content updates
  churnCheckInterval: 3,     // seconds between churn checks
};

// ══════════════════════════════════════════════════════════════

// ── Screen Glow Effect ──────────────────────────────────────
const screenGlow = document.getElementById('screen-glow')!;
let glowTimeout: ReturnType<typeof setTimeout> | null = null;

function triggerGlow(color: 'gold' | 'green' | 'purple' | 'red', durationMs: number = 1500) {
  screenGlow.className = `${color} active`;
  if (glowTimeout) clearTimeout(glowTimeout);
  glowTimeout = setTimeout(() => {
    screenGlow.classList.remove('active');
    glowTimeout = setTimeout(() => { screenGlow.className = ''; }, 300);
  }, durationMs);
}

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
  amenityInstalls: Map<string, number>; // amenity id → number of apartments with this amenity
  tenants: number;       // current occupied slots
  maxTenants: number;    // 10 base + studio additions
  studioLevel: number;
  hasPenthouse: boolean; // 20x income on this floor
  isPenthouse: boolean;  // converted to penthouse floor
  penthouseAmenityInstalls: Map<string, number>; // penthouse upgrade id → install count
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
  fillRateBonus: number;
  positions: { x: number; y: number; z: number; ry: number }[];
  scaleOverride?: number;
}

interface CafeUpgradeState {
  id: string;
  level: number;
}

const businessUpgradeState: Record<string, CafeUpgradeState[]> = {};
for (const [bizId, upgrades] of Object.entries(CONFIG.businessUpgrades)) {
  businessUpgradeState[bizId] = upgrades.map(u => ({ id: u.id, level: 0 }));
}

interface CityEvent {
  id: string;
  name: string;
  description: string;
  fillRateMultiplier: number;
  churnMultiplier: number;
  rentMultiplier: number;
  cafeMultiplier?: number;
  costDiscount?: number;
  duration: number;
  minFloors?: number;       // minimum floors to trigger
  requiresCafe?: boolean;   // only trigger if player has a café
}

const CITY_EVENTS: CityEvent[] = [
  // Early game
  { id: 'perfect_weather', name: '☀️ Perfect Weather', description: 'Tenants love the area!', fillRateMultiplier: 2.0, churnMultiplier: 0.5, rentMultiplier: 1.0, duration: 180, minFloors: 2 },
  { id: 'rainy_day', name: '🌧️ Rainy Day', description: 'Tenants staying cozy inside', fillRateMultiplier: 0.7, churnMultiplier: 0.2, rentMultiplier: 1.0, duration: 240, minFloors: 2 },
  { id: 'magazine_feature', name: '📰 Featured in Magazine!', description: 'Rent prices soaring', fillRateMultiplier: 1.0, churnMultiplier: 1.0, rentMultiplier: 1.3, duration: 120, minFloors: 3 },
  { id: 'street_festival', name: '🎪 Street Festival', description: 'Café income x5!', fillRateMultiplier: 1.5, churnMultiplier: 0.8, rentMultiplier: 1.0, cafeMultiplier: 5.0, duration: 120, requiresCafe: true },
  { id: 'construction_surplus', name: '🏗️ Construction Surplus', description: 'Upgrades 30% cheaper!', fillRateMultiplier: 1.0, churnMultiplier: 1.0, rentMultiplier: 1.0, costDiscount: 0.3, duration: 180, minFloors: 3 },
  { id: 'celebrity', name: '⭐ Celebrity Moves In!', description: 'Everyone wants to live here', fillRateMultiplier: 8.0, churnMultiplier: 0.3, rentMultiplier: 1.2, duration: 150, minFloors: 3 },
  { id: 'heatwave', name: '🔥 Heat Wave', description: 'Tenants with AC stay, others leave', fillRateMultiplier: 0.8, churnMultiplier: 2.0, rentMultiplier: 1.0, duration: 120, minFloors: 3 },
  // Mid game — big income spikes
  { id: 'tech_boom', name: '💻 Tech Company Moves In!', description: 'Rent x10!', fillRateMultiplier: 3.0, churnMultiplier: 0.1, rentMultiplier: 10, duration: 90, minFloors: 6 },
  { id: 'gold_rush', name: '💰 Housing Gold Rush', description: 'Rent x50!', fillRateMultiplier: 5.0, churnMultiplier: 0.05, rentMultiplier: 50, duration: 60, minFloors: 8 },
  // Late game — insane multipliers
  { id: 'viral_moment', name: '📱 Building Goes Viral!', description: 'Rent x300!!', fillRateMultiplier: 10.0, churnMultiplier: 0.01, rentMultiplier: 300, duration: 45, minFloors: 12 },
  { id: 'billionaire', name: '💎 Billionaire Bidding War', description: 'Rent x1000!!!', fillRateMultiplier: 15.0, churnMultiplier: 0, rentMultiplier: 1000, duration: 30, minFloors: 16 },
  { id: 'crypto_boom', name: '🪙 Crypto Millionaires!', description: 'Rent x5000!!', fillRateMultiplier: 20.0, churnMultiplier: 0, rentMultiplier: 5000, duration: 25, minFloors: 20 },
  { id: 'royal_visit', name: '👑 Royal Visit!', description: 'Rent x100! Fill x10!', fillRateMultiplier: 10.0, churnMultiplier: 0, rentMultiplier: 100, duration: 60, minFloors: 10 },
  { id: 'world_expo', name: '🌐 World Expo in Town!', description: 'Rent x500! All businesses x10!', fillRateMultiplier: 8.0, churnMultiplier: 0.01, rentMultiplier: 500, cafeMultiplier: 10.0, duration: 45, minFloors: 15 },
];

function getEligibleEvents(): CityEvent[] {
  const cafeCount = neighborhoodUpgrades.find(n => n.id === 'cafe')?.count ?? 0;
  return CITY_EVENTS.filter(e => {
    if (e.minFloors && state.floorCount < e.minFloors) return false;
    if (e.requiresCafe && cafeCount === 0) return false;
    return true;
  });
}

interface GameState {
  money: number;
  floorCount: number;
  floorStates: FloorState[];
  adBoost: number;        // current fill rate bonus from ads
  adTimer: number;        // seconds remaining on boost
  adClicks: number;       // total clicks (for display)
  activeEvent: { event: CityEvent; timeLeft: number } | null;
  eventCooldown: number;  // seconds until next event
  totalMoneyEarned: number;
  totalStudios: number;
  totalEvents: number;
}

const BASE_RENT = CONFIG.baseRent;
const PER_FLOOR_CAP = CONFIG.perFloorCap;

// ── Late-game mega upgrades ─────────────────────────────────
const PENTHOUSE_MULTIPLIER = 20;       // 20x income on that floor
const PENTHOUSE_UNLOCK_FLOOR = 5;      // available on floors above floor 5 (0-indexed: >= 5)
const PROP_MGMT_UNLOCK_FLOORS = 8;     // available when player has 8+ floors
const PROP_MGMT_LEVELS = [
  { name: 'Property Manager',      cost: 2e12,   multiplier: 4,    icon: '🏢' },
  { name: 'Management Firm',       cost: 50e12,  multiplier: 10,   icon: '🏬' },
  { name: 'Real Estate Empire',    cost: 500e12, multiplier: 50,   icon: '🌆' },
  { name: 'Global Holdings Corp',  cost: 10e15,  multiplier: 200,  icon: '🌍' },
  { name: 'Galactic Properties',   cost: 500e15, multiplier: 1000, icon: '🚀' },
  { name: 'Quantum Real Estate',   cost: 50e18,  multiplier: 5000, icon: '⚛️' },
  { name: 'Dimensional Holdings',  cost: 5e21,   multiplier: 25000, icon: '🌌' },
  { name: 'Multiverse Realty',     cost: 500e21, multiplier: 100000, icon: '🔮' },
  { name: 'Omniscient Properties', cost: 50e24,  multiplier: 500000, icon: '👁️' },
  { name: 'God-Tier Holdings',     cost: 5e27,   multiplier: 5000000, icon: '⚡' },
];

let propMgmtLevel = 0; // 0 = not purchased, 1+ = current level

function getStudioAddition(level: number): number {
  // Level 1: +20, Level 2: +40, Level 3: +80, Level 4: +160
  return 20 * Math.pow(2, level - 1);
}

function getTotalMaxTenants(studioLevel: number): number {
  let total = 10; // base
  for (let i = 1; i <= studioLevel; i++) {
    total += getStudioAddition(i);
  }
  return total;
}

function makeFloorState(tenants: number = 0): FloorState {
  return { amenityInstalls: new Map(), tenants, maxTenants: 10, studioLevel: 0, hasPenthouse: false, isPenthouse: false, penthouseAmenityInstalls: new Map() };
}

const state: GameState = {
  money: 0,
  floorCount: 1,
  floorStates: [makeFloorState(1)],
  adBoost: 0,
  adTimer: 0,
  adClicks: 0,
  activeEvent: null,
  eventCooldown: 30,
  totalMoneyEarned: 0,
  totalStudios: 0,
  totalEvents: 0,
};

let accountAchievements: Set<string> = new Set();

// ── Save/Load Serialization ──────────────────────────────────
function serializeState(cityName: string): SaveData {
  return {
    version: 1,
    cityName,
    timestamp: Date.now(),
    money: state.money,
    totalMoneyEarned: state.totalMoneyEarned,
    floorCount: state.floorCount,
    floorStates: state.floorStates.map(f => ({
      tenants: f.tenants,
      maxTenants: f.maxTenants,
      studioLevel: f.studioLevel,
      isPenthouse: f.isPenthouse,
      amenityInstalls: Object.fromEntries(f.amenityInstalls),
      penthouseAmenityInstalls: Object.fromEntries(f.penthouseAmenityInstalls),
    })),
    neighborhoodCounts: Object.fromEntries(neighborhoodUpgrades.map(n => [n.id, n.count])),
    businessUpgradeLevels: Object.fromEntries(
      Object.entries(businessUpgradeState).map(([bizId, levels]) => [
        bizId,
        Object.fromEntries(levels.map(l => [l.id, l.level])),
      ])
    ),
    propMgmtLevel,
    totalStudios: state.totalStudios,
    totalEvents: state.totalEvents,
    adClicks: state.adClicks,
    incomePerSecond: getTotalRentPerSecond(),
  };
}

function deserializeState(data: SaveData): void {
  state.money = data.money;
  state.totalMoneyEarned = data.totalMoneyEarned ?? 0;
  state.floorCount = data.floorCount;
  state.adBoost = 0;
  state.adTimer = 0;
  state.adClicks = data.adClicks ?? 0;
  state.activeEvent = null;
  state.eventCooldown = 120;
  state.totalStudios = data.totalStudios ?? 0;
  state.totalEvents = data.totalEvents ?? 0;

  // Restore floor states
  state.floorStates = data.floorStates.map(f => ({
    amenityInstalls: new Map(Object.entries(f.amenityInstalls).map(([k, v]) => [k, Number(v)])),
    tenants: f.tenants,
    maxTenants: f.maxTenants,
    studioLevel: f.studioLevel,
    hasPenthouse: f.isPenthouse,
    isPenthouse: f.isPenthouse,
    penthouseAmenityInstalls: new Map(Object.entries(f.penthouseAmenityInstalls || {}).map(([k, v]) => [k, Number(v)])),
  }));

  // Restore neighborhood counts
  for (const n of neighborhoodUpgrades) {
    n.count = data.neighborhoodCounts?.[n.id] ?? 0;
  }

  // Restore business upgrade levels
  for (const [bizId, levels] of Object.entries(data.businessUpgradeLevels ?? {})) {
    if (businessUpgradeState[bizId]) {
      for (const st of businessUpgradeState[bizId]) {
        st.level = (levels as Record<string, number>)[st.id] ?? 0;
      }
    }
  }

  // Restore amenity totalInstalled counts
  for (const a of amenities) {
    a.totalInstalled = 0;
    for (const f of state.floorStates) {
      a.totalInstalled += f.amenityInstalls.get(a.id) ?? 0;
    }
  }

  propMgmtLevel = data.propMgmtLevel ?? 0;
  peakMoney = state.money;

  // Migrate old per-city achievements to account
  if (data.earnedAchievements) {
    for (const id of data.earnedAchievements) {
      accountAchievements.add(id);
    }
    saveAccountData(platform, { earnedAchievements: [...accountAchievements] });
  }

  // Sync achievements from account data
  for (const a of achievements) {
    a.unlocked = accountAchievements.has(a.id);
  }
}

function getEventCostMultiplier(): number {
  if (state.activeEvent && state.activeEvent.event.costDiscount) {
    return 1 - state.activeEvent.event.costDiscount;
  }
  return 1;
}

const amenities: AmenityDef[] = CONFIG.amenities.map(a => ({ ...a, totalInstalled: 0 }));

// ── Tenant helpers ───────────────────────────────────────────
function getTotalTenants(): number {
  return state.floorStates.reduce((sum, f) => sum + f.tenants, 0);
}
function getTotalSlots(): number {
  return state.floorStates.reduce((sum, f) => sum + f.maxTenants, 0);
}

// Fill rate: base + neighborhood bonuses + temporary ad boost, multiplied by event
function getFillRate(): number {
  let rate = CONFIG.baseFillRate;
  // Neighborhood fill rate bonuses
  for (const n of neighborhoodUpgrades) {
    if (n.fillRateBonus > 0 && n.count > 0) {
      rate += n.fillRateBonus * n.count;
    }
  }
  // Ad boost
  if (state.adTimer > 0) rate += state.adBoost;
  // Event multiplier
  if (state.activeEvent) rate *= state.activeEvent.event.fillRateMultiplier;
  return rate;
}

// Tick ad boost decay
function tickAdBoost(delta: number) {
  if (state.adTimer > 0) {
    state.adTimer = Math.max(0, state.adTimer - delta);
    // Boost decays slowly even while active
    state.adBoost = Math.max(0, state.adBoost - CONFIG.adDecayRate * delta);
    if (state.adTimer <= 0) {
      state.adBoost = 0;
    }
  }
}

// ── Neighborhood Upgrades ───────────────────────────────────
// Visual data for neighborhood items (not balance — balance is in CONFIG)
const HOOD_VISUALS: Record<string, { description: string; model: string | null; scaleOverride?: number; positions: { x: number; y: number; z: number; ry: number }[] }> = {
  sidewalk: { description: 'Paved walkway for tenants', model: 'sidewalk', positions: [
    { x: 0, y: 0, z: 0.45, ry: 0 },
  ]},
  streetlight: { description: 'Lights up the street', model: 'models/light-curved.glb', positions:
    Array.from({ length: 20 }, (_, i) => {
      const side = i % 2 === 0 ? 1 : -1;
      const dist = 1.2 + Math.floor(i / 2) * 0.8;
      return { x: side * dist, y: 0, z: 0.6, ry: Math.PI };
    })
  },
  tree: { description: 'Green and pleasant', model: 'models/tree-large.glb', positions: [
    { x: -1.2, y: 0, z: -0.3, ry: 0 }, { x: 1.2, y: 0, z: -0.3, ry: 0.5 },
    { x: -2, y: 0, z: 0.3, ry: 1 }, { x: 2, y: 0, z: 0.3, ry: 1.5 },
    { x: -2.5, y: 0, z: -0.8, ry: 2 }, { x: 2.5, y: 0, z: -0.8, ry: 0.3 },
    { x: -1.5, y: 0, z: -1.2, ry: 3 }, { x: 1.5, y: 0, z: -1.2, ry: 2 },
    { x: -3, y: 0, z: -0.2, ry: 1 }, { x: 3, y: 0, z: -0.2, ry: 2 },
    { x: 0, y: 0, z: -1.5, ry: 0 }, { x: 0, y: 0, z: -2.2, ry: 1 },
  ]},
  bench: { description: 'A place to sit', model: null, positions: [
    { x: -1.5, y: 0, z: -0.8, ry: 0.3 }, { x: 1.5, y: 0, z: -0.8, ry: -0.3 },
    { x: -2.5, y: 0, z: 0, ry: 0 }, { x: 2.5, y: 0, z: 0, ry: Math.PI },
    { x: -0.8, y: 0, z: -1.5, ry: 0.5 }, { x: 0.8, y: 0, z: -1.5, ry: -0.5 },
  ]},
  parking: { description: 'Underground parking', model: null, positions: [
  ]},
  cafe: { description: 'Earns income from tenants', model: 'models/building-type-h.glb', scaleOverride: 0.5, positions: [
    { x: 2.8, y: 0, z: 0.3, ry: 0 },
  ]},
  restaurant: { description: 'Fine dining income', model: null, positions: [{ x: -2.8, y: 0, z: 0.3, ry: Math.PI }] },
  salon: { description: 'Styling income', model: null, positions: [{ x: -2.0, y: 0, z: 0.8, ry: Math.PI * 0.5 }] },
  spa: { description: 'Premium relaxation', model: null, positions: [{ x: 3.2, y: 0, z: -0.5, ry: 0 }] },
  fountain: { description: 'Beautiful centerpiece', model: null, positions: [
    { x: 0, y: 0, z: -1.8, ry: 0 }, { x: -2, y: 0, z: -2, ry: 0 }, { x: 2, y: 0, z: -2, ry: 0 },
  ]},
  playground: { description: 'Families love it', model: null, positions: [
    { x: -2, y: 0, z: -1, ry: 0 }, { x: 2.5, y: 0, z: -1.5, ry: 0 }, { x: -3, y: 0, z: -1.5, ry: 0 },
  ]},
  billboard: { description: 'Attracts tenants', model: null, positions: [] },
  busstop: { description: 'Public transit access', model: null, positions: [] },
  metrostation: { description: 'Major transit hub', model: null, positions: [] },
  heliport: { description: 'VIP helicopter access', model: null, positions: [] },
  private_airport: { description: 'Private jet terminal', model: null, positions: [] },
  yacht_club: { description: 'Luxury marina', model: null, positions: [] },
  golf_course: { description: 'Championship greens', model: null, positions: [] },
  shopping_mall: { description: 'Mega retail complex', model: null, positions: [] },
  theme_park: { description: 'World-class entertainment', model: null, positions: [] },
  space_elevator: { description: 'Orbital access point', model: null, positions: [] },
  quantum_lab: { description: 'Reality-bending research', model: null, positions: [] },
  dyson_sphere: { description: 'Harness a star', model: null, positions: [] },
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

// Per-business sub-upgrade multiplier
function getBusinessUpgradeMultiplier(businessId: string): number {
  const upgrades = CONFIG.businessUpgrades[businessId];
  const states = businessUpgradeState[businessId];
  if (!upgrades || !states) return 1;
  let mult = 1;
  for (let i = 0; i < upgrades.length; i++) {
    const cfg = upgrades[i];
    const st = states[i];
    if (st.level > 0) {
      mult *= (1 + cfg.incomeBoost * st.level);
    }
  }
  return mult;
}

function getBusinessUpgradeCost(businessId: string, index: number): number {
  const cfg = CONFIG.businessUpgrades[businessId][index];
  const st = businessUpgradeState[businessId][index];
  return Math.floor(cfg.baseCost * Math.pow(cfg.costScale, st.level) * getEventCostMultiplier());
}

function getNeighborhoodIncome(): number {
  let income = 0;
  for (const n of neighborhoodUpgrades) {
    if (n.ownIncome > 0 && n.count > 0) {
      let bizIncome = n.ownIncome * n.count * (1 + state.floorCount * n.ownIncomeFloorScale);
      bizIncome *= getBusinessUpgradeMultiplier(n.id);
      income += bizIncome;
    }
  }
  return income;
}

function getNeighborhoodCost(n: NeighborhoodDef): number {
  return Math.floor(n.baseCost * Math.pow(n.costScale, n.count) * getEventCostMultiplier());
}

function getSpawnPosition(n: NeighborhoodDef): { x: number; y: number; z: number; ry: number } {
  const posIndex = n.count - 1;
  if (posIndex < n.positions.length) {
    return n.positions[posIndex];
  }
  // Scatter randomly on grass (away from street/building)
  const seed = posIndex * 7919 + n.id.charCodeAt(0) * 131;
  const hash1 = Math.sin(seed) * 43758.5453 % 1;
  const hash2 = Math.sin(seed * 1.37) * 43758.5453 % 1;
  const x = (Math.abs(hash1) * 2 - 1) * 4; // spread -4 to 4
  let z = -(Math.abs(hash2) * 3 + 0.5); // always behind building (-0.5 to -3.5)
  return { x, y: 0, z, ry: Math.abs(hash1) * Math.PI * 2 };
}

async function spawnNeighborhoodModel(n: NeighborhoodDef) {
  if (n.count <= 0) return;

  // Sidewalk: just show the pre-built mesh
  if (n.id === 'sidewalk') {
    sidewalk.visible = true;
    markDirty();
    return;
  }

  if (!n.model && !['fountain', 'playground', 'bench', 'restaurant', 'salon', 'spa'].includes(n.id)) return;

  // Only spawn a 3D model for first N predefined positions, or every 5th purchase after that
  if (n.count > n.positions.length && n.count % 5 !== 0) return;

  const pos = getSpawnPosition(n);

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
    } else if (n.id === 'bench') {
      // Park bench
      const group = new THREE.Group();
      // Seat
      const benchSeat = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.03, 0.12),
        new THREE.MeshLambertMaterial({ color: 0x8B4513 })
      );
      benchSeat.position.set(0, 0.15, 0);
      benchSeat.castShadow = true;
      group.add(benchSeat);
      // Back
      const backrest = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.1, 0.02),
        new THREE.MeshLambertMaterial({ color: 0x8B4513 })
      );
      backrest.position.set(0, 0.22, -0.05);
      backrest.castShadow = true;
      group.add(backrest);
      // Left leg
      const leftLeg = new THREE.Mesh(
        new THREE.BoxGeometry(0.02, 0.15, 0.12),
        new THREE.MeshLambertMaterial({ color: 0x444444 })
      );
      leftLeg.position.set(-0.12, 0.075, 0);
      leftLeg.castShadow = true;
      group.add(leftLeg);
      // Right leg
      const rightLeg = new THREE.Mesh(
        new THREE.BoxGeometry(0.02, 0.15, 0.12),
        new THREE.MeshLambertMaterial({ color: 0x444444 })
      );
      rightLeg.position.set(0.12, 0.075, 0);
      rightLeg.castShadow = true;
      group.add(rightLeg);
      obj = group;
    } else if (n.id === 'playground') {
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
    } else if (n.id === 'restaurant') {
      // Restaurant building
      const group = new THREE.Group();
      const building = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.4, 0.4),
        new THREE.MeshLambertMaterial({ color: 0xcc4422 })
      );
      building.position.y = 0.2;
      building.castShadow = true;
      group.add(building);
      const roof = new THREE.Mesh(
        new THREE.ConeGeometry(0.35, 0.15, 4),
        new THREE.MeshLambertMaterial({ color: 0x882211 })
      );
      roof.position.y = 0.475;
      roof.rotation.y = Math.PI / 4;
      roof.castShadow = true;
      group.add(roof);
      const sign = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.08, 0.02),
        new THREE.MeshLambertMaterial({ color: 0xffcc00 })
      );
      sign.position.set(0, 0.35, 0.21);
      group.add(sign);
      obj = group;
    } else if (n.id === 'salon') {
      // Hair salon
      const group = new THREE.Group();
      const building = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.35, 0.35),
        new THREE.MeshLambertMaterial({ color: 0xee88cc })
      );
      building.position.y = 0.175;
      building.castShadow = true;
      group.add(building);
      const awning = new THREE.Mesh(
        new THREE.BoxGeometry(0.45, 0.02, 0.15),
        new THREE.MeshLambertMaterial({ color: 0xcc66aa })
      );
      awning.position.set(0, 0.32, 0.2);
      awning.castShadow = true;
      group.add(awning);
      obj = group;
    } else if (n.id === 'spa') {
      // Luxury spa
      const group = new THREE.Group();
      const building = new THREE.Mesh(
        new THREE.BoxGeometry(0.55, 0.3, 0.45),
        new THREE.MeshLambertMaterial({ color: 0x88bbdd })
      );
      building.position.y = 0.15;
      building.castShadow = true;
      group.add(building);
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshLambertMaterial({ color: 0x6699bb })
      );
      dome.position.y = 0.3;
      dome.castShadow = true;
      group.add(dome);
      obj = group;
    } else {
      return;
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
    if (floor.isPenthouse) {
      // Penthouse: base rent * multiplier + penthouse upgrade bonuses
      rent = (BASE_RENT + getNeighborhoodRentBonus()) * CONFIG.penthouseRentMultiplier;
      for (const pu of CONFIG.penthouseUpgrades) {
        const installs = floor.penthouseAmenityInstalls.get(pu.id) || 0;
        const coverage = floor.maxTenants > 0 ? installs / floor.maxTenants : 0;
        rent += pu.rentBonus * coverage;
      }
    } else {
      for (const a of amenities) {
        const installs = floor.amenityInstalls.get(a.id) || 0;
        const coverage = floor.maxTenants > 0 ? installs / floor.maxTenants : 0;
        rent += a.rentBonus * coverage;
      }
    }
  }
  return rent;
}

function getFloorIncome(floorIndex: number): number {
  const floor = state.floorStates[floorIndex];
  if (!floor) return 0;
  let income = floor.tenants * getFloorRentPerTenant(floorIndex);
  if (floor.hasPenthouse) income *= PENTHOUSE_MULTIPLIER;
  return income;
}

function getTotalRentPerSecond(): number {
  let total = 0;
  for (let i = 0; i < state.floorCount; i++) {
    total += getFloorIncome(i);
  }
  // Apply global multiplier from neighborhood (compounds!)
  total *= getGlobalMultiplier();
  // Apply property management multiplier
  if (propMgmtLevel > 0) total *= PROP_MGMT_LEVELS[propMgmtLevel - 1].multiplier;
  total *= getAchievementMultiplier();
  // Add neighborhood businesses income (already has café multiplier)
  let cafeIncome = getNeighborhoodIncome();
  if (state.activeEvent && state.activeEvent.event.cafeMultiplier) {
    cafeIncome *= state.activeEvent.event.cafeMultiplier;
  }
  total += cafeIncome;
  // Apply event rent multiplier
  if (state.activeEvent) {
    total *= state.activeEvent.event.rentMultiplier;
  }
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
// Amenity cost tiers as multiplier of floor cost (per apartment)
// Hot Water = 0.15x, Heating = 0.25x, AC = 0.4x, Balcony = 0.6x, Laundry = 0.8x, Gym = 1.2x
const AMENITY_FLOOR_COST_RATIO: Record<string, number> = {
  hotwater: 0.15,
  heating: 0.25,
  ac: 0.4,
  balcony: 0.6,
  laundry: 0.8,
  gym: 1.2,
};

function getAmenityCostPerUnit(a: AmenityDef, floorIndex: number): number {
  const floor = state.floorStates[floorIndex];
  const studioMultiplier = floor ? Math.pow(5, floor.studioLevel) : 1;
  if (floorIndex === 0) {
    // Floor 0: use original cheap baseCosts so early game is playable
    return Math.floor(a.baseCost * studioMultiplier * getEventCostMultiplier());
  }
  // Floor 1+: costs scale as fraction of floor cost, always expensive
  const floorCost = Math.floor(CONFIG.floorBaseCost * Math.pow(CONFIG.floorCostScale, floorIndex));
  const ratio = AMENITY_FLOOR_COST_RATIO[a.id] || 0.3;
  return Math.floor(floorCost * ratio * studioMultiplier * getEventCostMultiplier());
}

// Total cost to install amenity on all remaining apartments on a floor
function getAmenityFullCost(a: AmenityDef, floorIndex: number): number {
  const floor = state.floorStates[floorIndex];
  if (!floor) return 0;
  const installed = floor.amenityInstalls.get(a.id) || 0;
  const missing = floor.maxTenants - installed;
  return getAmenityCostPerUnit(a, floorIndex) * missing;
}

function getStudioCost(floorIndex: number, studioLevel: number): number {
  const floorCost = Math.floor(CONFIG.floorBaseCost * Math.pow(CONFIG.floorCostScale, Math.max(0, floorIndex)));
  const floorScaleFactor = (1 + floorIndex * 0.5);
  return Math.floor(floorCost * 3 * floorScaleFactor * Math.pow(CONFIG.studioCostScale, studioLevel) * getEventCostMultiplier());
}

function getPenthouseCost(floorIndex: number): number {
  const floorCost = Math.floor(CONFIG.floorBaseCost * Math.pow(CONFIG.floorCostScale, floorIndex));
  return Math.floor(floorCost * 50 * getEventCostMultiplier()); // 50x the floor's base cost
}

function getConvertToPenthouseCost(floorIndex: number): number {
  return Math.floor(CONFIG.penthouseCost * Math.pow(CONFIG.floorCostScale, floorIndex) * getEventCostMultiplier());
}

function getPenthouseUpgradeCost(upgradeId: string, floorIndex: number): number {
  const pu = CONFIG.penthouseUpgrades.find(u => u.id === upgradeId);
  if (!pu) return Infinity;
  const floor = state.floorStates[floorIndex];
  if (!floor) return Infinity;
  const installs = floor.penthouseAmenityInstalls.get(upgradeId) || 0;
  const missing = floor.maxTenants - installs;
  return Math.floor(pu.baseCost * Math.pow(pu.costScale, floorIndex) * missing * getEventCostMultiplier());
}

function getNextPenthouseUpgrade(floorIndex: number): typeof CONFIG.penthouseUpgrades[0] | null {
  const floor = state.floorStates[floorIndex];
  if (!floor) return null;
  for (const pu of CONFIG.penthouseUpgrades) {
    const installs = floor.penthouseAmenityInstalls.get(pu.id) || 0;
    if (installs < floor.maxTenants) return pu;
  }
  return null;
}

let peakMoney = 0; // track highest money ever reached

// ── Achievements ─────────────────────────────────────────────
interface Achievement {
  id: string;
  name: string;
  desc: string;
  icon: string;
  multiplier: number;
  check: () => boolean;
  unlocked: boolean;
}

const achievements: Achievement[] = [
  { id: 'first_floor', name: 'Breaking Ground', desc: 'Build 2 floors', icon: '🏗️', multiplier: 1.5, check: () => state.floorCount >= 2, unlocked: false },
  { id: 'five_floors', name: 'Going Up!', desc: 'Build 5 floors', icon: '🏢', multiplier: 2, check: () => state.floorCount >= 5, unlocked: false },
  { id: 'ten_floors', name: 'Skyscraper', desc: 'Build 10 floors', icon: '🏙️', multiplier: 3, check: () => state.floorCount >= 10, unlocked: false },
  { id: 'twenty_floors', name: 'Mega Tower', desc: 'Build 20 floors', icon: '🗼', multiplier: 5, check: () => state.floorCount >= 20, unlocked: false },
  { id: 'hundred_tenants', name: 'Full House', desc: '100 tenants', icon: '👥', multiplier: 2, check: () => getTotalTenants() >= 100, unlocked: false },
  { id: 'thousand_tenants', name: 'Metropolis', desc: '1,000 tenants', icon: '🌆', multiplier: 5, check: () => getTotalTenants() >= 1000, unlocked: false },
  { id: 'first_million', name: 'Millionaire', desc: 'Earn $1M', icon: '💰', multiplier: 2, check: () => peakMoney >= 1e6, unlocked: false },
  { id: 'first_billion', name: 'Billionaire', desc: 'Earn $1B', icon: '💎', multiplier: 3, check: () => peakMoney >= 1e9, unlocked: false },
  { id: 'first_trillion', name: 'Trillionaire', desc: 'Earn $1T', icon: '👑', multiplier: 5, check: () => peakMoney >= 1e12, unlocked: false },
  { id: 'first_business', name: 'Entrepreneur', desc: 'Open a business', icon: '🏪', multiplier: 2, check: () => neighborhoodUpgrades.some(n => n.ownIncome > 0 && n.count > 0), unlocked: false },
  { id: 'all_businesses', name: 'Tycoon', desc: 'Own all 4 businesses', icon: '🎩', multiplier: 10, check: () => ['cafe', 'restaurant', 'salon', 'spa'].every(id => (neighborhoodUpgrades.find(n => n.id === id)?.count ?? 0) > 0), unlocked: false },
  { id: 'prop_mgmt', name: 'Property Mogul', desc: 'Hire property management', icon: '🏢', multiplier: 3, check: () => propMgmtLevel >= 1, unlocked: false },
];

function getAchievementMultiplier(): number {
  let mult = 1;
  for (const a of achievements) {
    if (a.unlocked) mult *= a.multiplier;
  }
  // Also apply sign achievement bonuses
  for (const ach of CONFIG.achievementSigns) {
    if (accountAchievements.has(ach.id)) {
      mult *= ach.bonus;
    }
  }
  return mult;
}

function checkAchievements() {
  for (const a of achievements) {
    if (!a.unlocked && a.check()) {
      a.unlocked = true;
      accountAchievements.add(a.id);
      triggerGlow('gold', 2500);
      showAchievementPopup(a);
      saveAccountData(platform, { earnedAchievements: [...accountAchievements] });
    }
  }
}

function showAchievementPopup(a: Achievement) {
  const popup = document.createElement('div');
  popup.style.cssText = `
    position:fixed; top:20%; left:50%; transform:translate(-50%,-50%);
    background:linear-gradient(135deg, rgba(0,0,0,0.9), rgba(40,20,60,0.9));
    border:2px solid #ffd700; color:#fff; padding:20px 32px; border-radius:16px;
    z-index:1001; text-align:center; pointer-events:auto; cursor:pointer;
    animation: achievePop 0.5s ease-out;
  `;
  popup.innerHTML = `
    <div style="font-size:32px;margin-bottom:8px">${a.icon}</div>
    <div style="font-size:16px;font-weight:bold;color:#ffd700">Achievement Unlocked!</div>
    <div style="font-size:18px;font-weight:bold;margin:4px 0">${a.name}</div>
    <div style="font-size:13px;color:#aaa">${a.desc}</div>
    <div style="font-size:14px;color:#7efa7e;margin-top:8px">${a.multiplier}x income bonus!</div>
  `;
  document.body.appendChild(popup);
  popup.addEventListener('click', () => popup.remove());
  setTimeout(() => popup.remove(), 4000);
}

// ── Achievement Yard Signs ───────────────────────────────────
interface AchievementSignLabel {
  el: HTMLDivElement;
  position: THREE.Vector3;
}

const achievementSignLabels: AchievementSignLabel[] = [];
let achievementSignCount = 0;

function spawnAchievementSign(ach: typeof CONFIG.achievementSigns[0], showLabel: boolean = true) {
  const idx = achievementSignCount++;
  const x = -3 + idx * 0.6;
  const z = 2.0;

  // Vertical post
  const postGeo = new THREE.BoxGeometry(0.02, 0.35, 0.02);
  const postMat = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
  const post = new THREE.Mesh(postGeo, postMat);
  post.position.set(x, 0.175, z);
  post.castShadow = true;
  scene.add(post);

  // Sign panel on top
  const panelGeo = new THREE.BoxGeometry(0.25, 0.15, 0.01);
  const panelMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const panel = new THREE.Mesh(panelGeo, panelMat);
  panel.position.set(x, 0.425, z);
  panel.rotation.y = Math.PI;
  panel.castShadow = true;
  scene.add(panel);

  // CSS overlay label — only show for newly earned achievements
  if (showLabel) {
    const labelEl = document.createElement('div');
    labelEl.className = 'achievement-sign-label';
    labelEl.innerHTML = `<img src="${ach.icon}" style="width:16px;height:16px;vertical-align:middle;filter:invert(1)"> ${ach.name}`;
    document.getElementById('floor-panels')!.appendChild(labelEl);

    achievementSignLabels.push({
      el: labelEl,
      position: new THREE.Vector3(x, 0.425, z),
    });
  }

  markDirty();
}

function updateAchievementSignPositions() {
  if (!_cameraMovedThisFrame && !needsRender) return;
  for (const sign of achievementSignLabels) {
    const projected = sign.position.clone().project(camera);
    const hw = window.innerWidth / 2;
    const hh = window.innerHeight / 2;
    const sx = projected.x * hw + hw;
    const sy = -(projected.y * hh) + hh;
    if (projected.z > 0 && projected.z < 1) {
      sign.el.style.left = `${sx}px`;
      sign.el.style.top = `${sy}px`;
      sign.el.style.opacity = '1';
    } else {
      sign.el.style.opacity = '0';
    }
  }
}

function showAchievementToast(ach: typeof CONFIG.achievementSigns[0]) {
  const toast = document.createElement('div');
  toast.className = 'achievement-toast';
  toast.innerHTML = `<img src="icons/trophy.svg" style="width:16px;height:16px;vertical-align:middle;filter:invert(1)"> Achievement: <img src="${ach.icon}" style="width:16px;height:16px;vertical-align:middle;filter:invert(1)"> ${ach.name}`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function checkSignAchievements() {
  for (const ach of CONFIG.achievementSigns) {
    if (accountAchievements.has(ach.id)) continue;
    let earned = false;
    switch (ach.trigger) {
      case 'floors': earned = state.floorCount >= ach.value; break;
      case 'tenants': earned = getTotalTenants() >= ach.value; break;
      case 'studios': earned = state.totalStudios >= ach.value; break;
      case 'money_earned': earned = state.totalMoneyEarned >= ach.value; break;
      case 'events': earned = state.totalEvents >= ach.value; break;
      case 'occupancy_full': earned = getTotalTenants() >= getTotalSlots() && getTotalSlots() > 0; break;
      case 'penthouses': earned = state.floorStates.some(f => f.isPenthouse); break;
      case 'penthouses_count': earned = state.floorStates.filter(f => f.isPenthouse).length >= ach.value; break;
      case 'all_achievements': earned = accountAchievements.size >= CONFIG.achievementSigns.length - 1; break;
    }
    if (earned) {
      accountAchievements.add(ach.id);
      spawnAchievementSign(ach);
      showAchievementToast(ach);
      playAchievementSound();
      // Save account data
      saveAccountData(platform, { earnedAchievements: [...accountAchievements] });
    }
  }
}

function getAdCost(): number {
  // Scales with progression — costs more as you get richer
  const scaleFactor = Math.max(1, Math.floor(peakMoney / 1000));
  return Math.max(CONFIG.adCost, Math.floor(CONFIG.adCost * Math.pow(scaleFactor, 0.4)));
}

let floorsPurchased = 0;

function getFloorCost(): number {
  return Math.floor(CONFIG.floorBaseCost * Math.pow(CONFIG.floorCostScale, floorsPurchased) * getEventCostMultiplier());
}

// ── Phase Detection ─────────────────────────────────────────
function isFloorFullyUpgraded(floorIndex: number): boolean {
  const floor = state.floorStates[floorIndex];
  if (!floor) return false;
  if (floor.isPenthouse) return true; // penthouse floors don't use regular amenities
  for (const a of amenities) {
    if ((floor.amenityInstalls.get(a.id) || 0) < floor.maxTenants) return false;
  }
  return true;
}

function isFloorComplete(floorIndex: number): boolean {
  const floor = state.floorStates[floorIndex];
  if (!floor) return false;
  if (floor.isPenthouse) return true; // penthouse floors are always "complete" for phase purposes
  // Fully upgraded amenities AND max studio
  return isFloorFullyUpgraded(floorIndex) && floor.studioLevel >= CONFIG.maxStudioLevel;
}

function allFloorsFullyUpgraded(): boolean {
  for (let i = 0; i < state.floorCount; i++) {
    if (!isFloorFullyUpgraded(i)) return false;
  }
  return true;
}

let bulkPhaseUnlocked = false; // once unlocked, stays unlocked forever

function isInBulkPhase(): boolean {
  if (bulkPhaseUnlocked) return true;
  if (_bulkPhaseCached !== null) return _bulkPhaseCached;
  // If we're PAST the cap, we already passed the gate (can't get here without it)
  if (state.floorCount > PER_FLOOR_CAP) {
    bulkPhaseUnlocked = true;
    _bulkPhaseCached = true;
    return true;
  }
  if (state.floorCount >= PER_FLOOR_CAP && allFloorsFullyUpgraded()) {
    bulkPhaseUnlocked = true;
    _bulkPhaseCached = true;
    return true;
  }
  _bulkPhaseCached = false;
  return false;
}

// Total number of missing apartment installs for an amenity across all floors
function floorsMissingAmenity(a: AmenityDef): number {
  let count = 0;
  for (let i = 0; i < state.floorCount; i++) {
    const floor = state.floorStates[i];
    if (!floor || floor.isPenthouse) continue;
    const installs = floor.amenityInstalls.get(a.id) || 0;
    count += floor.maxTenants - installs;
  }
  return count;
}

// Cost to install an amenity on all missing apartments across all floors
function getBulkAmenityCost(a: AmenityDef): number {
  let total = 0;
  for (let i = 0; i < state.floorCount; i++) {
    const floor = state.floorStates[i];
    if (!floor || floor.isPenthouse) continue;
    const installs = floor.amenityInstalls.get(a.id) || 0;
    const missing = floor.maxTenants - installs;
    total += getAmenityCostPerUnit(a, i) * missing;
  }
  return total;
}

// Cost to convert all floors to next studio level
function getBulkStudioCost(): number {
  let total = 0;
  for (let i = 0; i < state.floorCount; i++) {
    const floor = state.floorStates[i];
    if (floor && floor.studioLevel < CONFIG.maxStudioLevel && !floor.isPenthouse) {
      total += getStudioCost(i, floor.studioLevel);
    }
  }
  return total;
}

function floorsNeedingStudio(): number {
  let count = 0;
  for (let i = 0; i < state.floorCount; i++) {
    const floor = state.floorStates[i];
    if (floor && floor.studioLevel < CONFIG.maxStudioLevel && !floor.isPenthouse) count++;
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

// ── Weather Visuals ─────────────────────────────────────────
const DEFAULT_SKY = new THREE.Color(0x87CEEB);
const RAIN_SKY = new THREE.Color(0x5a6a7a);
const SUNNY_SKY = new THREE.Color(0x8ed4f5);
const HEAT_SKY = new THREE.Color(0xd4956b);

const rainCount = 300;
const rainGeo = new THREE.BufferGeometry();
const rainPositions = new Float32Array(rainCount * 3);
for (let i = 0; i < rainCount; i++) {
  rainPositions[i * 3] = (Math.random() - 0.5) * 20;
  rainPositions[i * 3 + 1] = Math.random() * 15;
  rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 20;
}
rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
const rainMat = new THREE.PointsMaterial({ color: 0xaaccee, size: 0.05, transparent: true, opacity: 0.6 });
const rainMesh = new THREE.Points(rainGeo, rainMat);
rainMesh.visible = false;
scene.add(rainMesh);

// ── Confetti (Street Festival) ──────────────────────────────
const confettiCount = 200;
const confettiGeo = new THREE.BufferGeometry();
const confettiPositions = new Float32Array(confettiCount * 3);
const confettiColors = new Float32Array(confettiCount * 3);
const confettiVelocities = new Float32Array(confettiCount * 3); // drift velocities
const CONFETTI_COLORS = [
  [1, 0.2, 0.3], [0.2, 0.8, 0.3], [0.2, 0.4, 1], [1, 0.85, 0.1],
  [1, 0.5, 0], [0.8, 0.2, 1], [0, 0.9, 0.9],
];
for (let i = 0; i < confettiCount; i++) {
  confettiPositions[i * 3] = (Math.random() - 0.5) * 16;
  confettiPositions[i * 3 + 1] = Math.random() * 12;
  confettiPositions[i * 3 + 2] = (Math.random() - 0.5) * 16;
  const c = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
  confettiColors[i * 3] = c[0];
  confettiColors[i * 3 + 1] = c[1];
  confettiColors[i * 3 + 2] = c[2];
  confettiVelocities[i * 3] = (Math.random() - 0.5) * 1.5; // x drift
  confettiVelocities[i * 3 + 1] = 0; // unused
  confettiVelocities[i * 3 + 2] = (Math.random() - 0.5) * 1.5; // z drift
}
confettiGeo.setAttribute('position', new THREE.BufferAttribute(confettiPositions, 3));
confettiGeo.setAttribute('color', new THREE.BufferAttribute(confettiColors, 3));
const confettiMat = new THREE.PointsMaterial({
  size: 0.08, vertexColors: true, transparent: true, opacity: 0.9,
});
const confettiMesh = new THREE.Points(confettiGeo, confettiMat);
confettiMesh.visible = false;
scene.add(confettiMesh);

// ── Camera Flashes + Celebrity Figure ────────────────────────
const flashLights: THREE.PointLight[] = [];
for (let i = 0; i < 4; i++) {
  const fl = new THREE.PointLight(0xffffff, 0, 5);
  fl.position.set(
    (Math.random() - 0.5) * 2,
    0.3,
    1.0 + Math.random() * 0.5
  );
  scene.add(fl);
  flashLights.push(fl);
}
let flashTimer = 0;
let nextFlashIndex = 0;

// Golden celebrity figure (2x size, gold material)
const celebrityGroup = new THREE.Group();
const celebrityMat = new THREE.MeshStandardMaterial({
  color: 0xffd700, emissive: 0xffa000, emissiveIntensity: 0.3,
  metalness: 0.8, roughness: 0.2,
});
const celebrityBody = new THREE.Mesh(
  new THREE.CapsuleGeometry(0.08, 0.2, 4, 8), celebrityMat
);
celebrityBody.position.y = 0.18;
celebrityBody.castShadow = true;
celebrityGroup.add(celebrityBody);

// Sparkle particles around the celebrity
const sparkleCount = 12;
const sparkleGeo = new THREE.BufferGeometry();
const sparklePositions = new Float32Array(sparkleCount * 3);
for (let i = 0; i < sparkleCount; i++) {
  sparklePositions[i * 3] = (Math.random() - 0.5) * 0.6;
  sparklePositions[i * 3 + 1] = Math.random() * 0.5 + 0.1;
  sparklePositions[i * 3 + 2] = (Math.random() - 0.5) * 0.6;
}
sparkleGeo.setAttribute('position', new THREE.BufferAttribute(sparklePositions, 3));
const sparkleMat = new THREE.PointsMaterial({
  color: 0xffd700, size: 0.04, transparent: true, opacity: 0.8,
});
const sparklePoints = new THREE.Points(sparkleGeo, sparkleMat);
celebrityGroup.add(sparklePoints);

// Entourage (3 smaller dark figures following)
const entourageMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
const entourageGeo = new THREE.CapsuleGeometry(0.04, 0.1, 4, 8);
const entourage: THREE.Mesh[] = [];
for (let i = 0; i < 3; i++) {
  const e = new THREE.Mesh(entourageGeo, entourageMat);
  e.position.set(-0.3 - i * 0.25, 0.09, (i - 1) * 0.15);
  e.castShadow = true;
  celebrityGroup.add(e);
  entourage.push(e);
}

celebrityGroup.visible = false;
celebrityGroup.position.set(-4, 0, 1.2);
scene.add(celebrityGroup);

let celebrityDir = 1;
let celebrityX = -4;

// ── Lightning (Rainy Day) ───────────────────────────────────
let lightningTimer = 0;
let lightningActive = 0; // remaining flash time
const LIGHTNING_INTERVAL_MIN = 4;
const LIGHTNING_INTERVAL_MAX = 12;
let nextLightningIn = LIGHTNING_INTERVAL_MIN + Math.random() * (LIGHTNING_INTERVAL_MAX - LIGHTNING_INTERVAL_MIN);

let currentWeather: string | null = null;
const targetSkyColor = new THREE.Color(0x87CEEB);
const FESTIVAL_SKY = new THREE.Color(0x6a85b8);

function updateWeatherVisuals(eventId: string | null, delta: number) {
  if (eventId !== currentWeather) {
    currentWeather = eventId;
    // Reset all effects
    rainMesh.visible = false;
    confettiMesh.visible = false;
    celebrityGroup.visible = false;
    for (const fl of flashLights) fl.intensity = 0;
    lightningActive = 0;

    switch (eventId) {
      case 'rainy_day':
        targetSkyColor.copy(RAIN_SKY);
        rainMesh.visible = true;
        ambientLight.intensity = 0.35;
        dirLight.intensity = 0.6;
        break;
      case 'perfect_weather':
        targetSkyColor.copy(SUNNY_SKY);
        ambientLight.intensity = 0.8;
        dirLight.intensity = 1.6;
        break;
      case 'heatwave':
        targetSkyColor.copy(HEAT_SKY);
        ambientLight.intensity = 0.7;
        dirLight.intensity = 1.5;
        break;
      case 'street_festival':
        targetSkyColor.copy(FESTIVAL_SKY);
        confettiMesh.visible = true;
        ambientLight.intensity = 0.7;
        dirLight.intensity = 1.0;
        break;
      case 'celebrity':
        targetSkyColor.copy(DEFAULT_SKY);
        ambientLight.intensity = 0.6;
        dirLight.intensity = 1.2;
        celebrityGroup.visible = true;
        celebrityX = -4;
        celebrityDir = 1;
        celebrityGroup.position.set(-4, 0, 1.2);
        break;
      default:
        targetSkyColor.copy(DEFAULT_SKY);
        ambientLight.intensity = 0.6;
        dirLight.intensity = 1.2;
        break;
    }
    markDirty();
  }

  // Smooth sky color transition
  const bg = scene.background as THREE.Color;
  bg.lerp(targetSkyColor, 0.02);
  // Keep rendering while sky is still transitioning
  if (!bg.equals(targetSkyColor)) {
    markDirty();
  }

  // ── Rain animation (throttled to every other frame) ──
  if (rainMesh.visible) {
    rainFrameSkip++;
    const pos = rainGeo.attributes.position as THREE.BufferAttribute;
    if (rainFrameSkip % 2 === 0) {
      const rainDelta = delta * 2; // compensate for skipped frame
      for (let i = 0; i < rainCount; i++) {
        pos.array[i * 3 + 1] -= 12 * rainDelta;
        if (pos.array[i * 3 + 1] < 0) {
          pos.array[i * 3 + 1] = 12 + Math.random() * 3;
          pos.array[i * 3] = (Math.random() - 0.5) * 20;
          pos.array[i * 3 + 2] = (Math.random() - 0.5) * 20;
        }
      }
      pos.needsUpdate = true;
    }

    // Lightning
    lightningTimer += delta;
    if (lightningActive > 0) {
      lightningActive -= delta;
      // Quick double-flash effect
      const flash = lightningActive > 0.08 ? 3.0 : (lightningActive > 0.04 ? 0.5 : 2.0);
      ambientLight.intensity = flash;
      if (lightningActive <= 0) {
        ambientLight.intensity = 0.35;
        lightningTimer = 0;
        nextLightningIn = LIGHTNING_INTERVAL_MIN + Math.random() * (LIGHTNING_INTERVAL_MAX - LIGHTNING_INTERVAL_MIN);
      }
    } else if (lightningTimer >= nextLightningIn) {
      lightningActive = 0.15; // 150ms flash
      playThunderSound();
    }
    markDirty();
  }

  // ── Confetti animation ──
  if (confettiMesh.visible) {
    const pos = confettiGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < confettiCount; i++) {
      // Fall slowly + drift sideways
      pos.array[i * 3] += confettiVelocities[i * 3] * delta;
      pos.array[i * 3 + 1] -= (1.5 + Math.sin(_frameTime * 0.003 + i) * 0.5) * delta;
      pos.array[i * 3 + 2] += confettiVelocities[i * 3 + 2] * delta;
      // Reset when below ground
      if (pos.array[i * 3 + 1] < 0) {
        pos.array[i * 3] = (Math.random() - 0.5) * 16;
        pos.array[i * 3 + 1] = 10 + Math.random() * 4;
        pos.array[i * 3 + 2] = (Math.random() - 0.5) * 16;
      }
    }
    pos.needsUpdate = true;
    markDirty();
  }

  // ── Celebrity: golden figure walking + sparkles + subtle flashes ──
  if (eventId === 'celebrity') {
    // Walk celebrity back and forth
    celebrityX += celebrityDir * 0.6 * delta;
    if (celebrityX > 4) { celebrityDir = -1; celebrityGroup.rotation.y = Math.PI; }
    if (celebrityX < -4) { celebrityDir = 1; celebrityGroup.rotation.y = 0; }
    celebrityGroup.position.x = celebrityX;

    // Animate sparkle particles
    const sPos = sparkleGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < sparkleCount; i++) {
      sPos.array[i * 3 + 1] += 0.3 * delta;
      if (sPos.array[i * 3 + 1] > 0.6) {
        sPos.array[i * 3] = (Math.random() - 0.5) * 0.6;
        sPos.array[i * 3 + 1] = Math.random() * 0.1;
        sPos.array[i * 3 + 2] = (Math.random() - 0.5) * 0.6;
      }
    }
    sPos.needsUpdate = true;
    sparkleMat.opacity = 0.5 + Math.sin(_frameTime * 0.005) * 0.3;

    // Subtle camera flashes — less frequent, dimmer
    flashTimer += delta;
    if (flashTimer >= 1.5 + Math.random() * 2.0) {
      flashTimer = 0;
      const fl = flashLights[nextFlashIndex % flashLights.length];
      fl.intensity = 3;
      fl.position.x = celebrityX + (Math.random() - 0.5) * 1.5;
      fl.position.z = 1.2 + (Math.random() - 0.5) * 0.8;
      nextFlashIndex++;
    }
    // Decay flashes
    for (const fl of flashLights) {
      if (fl.intensity > 0) {
        fl.intensity = Math.max(0, fl.intensity - 8 * delta);
      }
    }
    markDirty();
  }
}

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

function convertFloorToGold(floorIndex: number) {
  // The building group's children are: ground floor model, floor models, roof
  // floorIndex 0 = ground floor (child 0), floorIndex N = child N
  const child = buildingGroup.children[floorIndex];
  if (child) {
    child.traverse((node) => {
      if ((node as THREE.Mesh).isMesh) {
        const mesh = node as THREE.Mesh;
        if (mesh.material) {
          mesh.material = new THREE.MeshLambertMaterial({ color: 0xd4a574 });
        }
      }
    });
    markDirty();
  }
}

// ── Tenants (walking figures) ───────────────────────────────
interface TenantFigure {
  mesh: THREE.Mesh;
  targetX: number;
  speed: number;
  arriving: boolean;
  inCar: boolean;
}

const activeTenants: TenantFigure[] = [];
const tenantMaterial = new THREE.MeshLambertMaterial({ color: 0x3366cc });
const tenantGeometry = new THREE.CapsuleGeometry(0.04, 0.1, 4, 8);
const carGeometry = new THREE.BoxGeometry(0.2, 0.1, 0.12);
const carColors = [0x3366cc, 0xcc3333, 0x33cc33, 0xffcc00, 0xffffff, 0xff6600, 0x9933cc];

function spawnTenant(arriving: boolean) {
  // Cap visible tenants at ~5
  if (activeTenants.length >= 5) return;

  const parkingCount = neighborhoodUpgrades.find(n => n.id === 'parking')?.count ?? 0;
  const carChance = parkingCount > 0 ? Math.min(0.8, parkingCount * 0.1) : 0;
  const inCar = arriving && Math.random() < carChance;

  let mesh: THREE.Mesh;
  if (inCar) {
    const color = carColors[Math.floor(Math.random() * carColors.length)];
    mesh = new THREE.Mesh(carGeometry, new THREE.MeshLambertMaterial({ color }));
  } else {
    mesh = new THREE.Mesh(tenantGeometry, tenantMaterial.clone());
  }

  const startX = arriving ? (Math.random() > 0.5 ? 4 : -4) : 0;
  const endX = arriving ? 0 : (Math.random() > 0.5 ? 4 : -4);
  const z = 1.2 + (Math.random() - 0.5) * 0.6;
  mesh.position.set(startX, inCar ? 0.06 : 0.09, z);
  mesh.castShadow = true;
  scene.add(mesh);

  if (!arriving && !inCar) {
    (mesh.material as THREE.MeshLambertMaterial).color.setHex(0xcc3333);
  }

  activeTenants.push({
    mesh,
    targetX: endX,
    speed: inCar ? (1.0 + Math.random() * 0.5) : (0.4 + Math.random() * 0.3),
    arriving,
    inCar,
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

function isMobile(): boolean {
  return window.matchMedia('(max-width: 600px)').matches;
}

function updateCamera() {
  const scale = isMobile() ? 0.25 : 1;
  buildingGroup.scale.setScalar(scale);
  const buildingHeight = (state.floorCount + 1) * actualFloorHeight * scale;
  const lookAtY = buildingHeight * 0.45;
  const distance = Math.max(8, buildingHeight * 1.2 + 6);

  if (isMobile()) {
    // Camera lower + look higher so building sits at bottom of screen
    cameraTargetPos.set(distance * 0.15, lookAtY + distance * 0.1, distance);
    cameraTargetLookAt.set(0, lookAtY + distance * 0.25, 0);
  } else {
    cameraTargetPos.set(distance * 0.15, lookAtY + distance * 0.3, distance);
    cameraTargetLookAt.set(0, lookAtY, 0);
  }
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
  el.textContent = `+${formatMoney(floorIncome)}`;
  el.style.left = `${sx}px`;
  el.style.top = `${sy}px`;
  popsContainer.appendChild(el);

  // Fly to the RIGHT and slightly upward (10° to 50° upward-right)
  const angle = (-10 - Math.random() * 40) * (Math.PI / 180);

  activePops.push({ el, startTime: _frameTime, sx, sy, angle });
}

function spawnMoneyPopStaggered(floorIndex: number, delayMs: number) {
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

  const floorIncome = getFloorIncome(floorIndex);
  if (floorIncome <= 0) return;
  const el = document.createElement('div');
  el.className = 'money-pop';
  el.textContent = `+${formatMoney(floorIncome)}`;
  el.style.left = `${sx}px`;
  el.style.top = `${sy}px`;
  popsContainer.appendChild(el);

  const angle = (-10 - Math.random() * 40) * (Math.PI / 180);
  activePops.push({ el, startTime: _frameTime + delayMs, sx, sy, angle });
}

function spawnCafePopStaggered(cafeIndex: number, delayMs: number) {
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
  el.textContent = `+${formatMoney(perCafe)}`;
  el.style.left = `${sx}px`;
  el.style.top = `${sy}px`;
  popsContainer.appendChild(el);

  const angle = (-10 - Math.random() * 40) * (Math.PI / 180);
  activePops.push({ el, startTime: _frameTime + delayMs, sx, sy, angle });
}

function updateMoneyPops() {
  const now = _frameTime;
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
  el.textContent = `+${formatMoney(perCafe)}`;
  el.style.left = `${sx}px`;
  el.style.top = `${sy}px`;
  popsContainer.appendChild(el);

  const angle = (-10 - Math.random() * 40) * (Math.PI / 180);
  activePops.push({ el, startTime: _frameTime, sx, sy, angle });
}

function tickMoneyPops(delta: number) {
  popTimer += delta;
  if (popTimer >= POP_INTERVAL) {
    popTimer = 0;
    // Play cash sound — pitch scales with income (0-1 range, capped)
    const totalIncome = getTotalRentPerSecond();
    const incomeLevel = Math.min(1, Math.log10(Math.max(1, totalIncome)) / 6);
    playCashSound(incomeLevel);
    // Only pop from max 3 random floors per tick to limit DOM creation
    const occupiedFloors: number[] = [];
    for (let i = 0; i < state.floorCount; i++) {
      if (state.floorStates[i] && state.floorStates[i].tenants > 0) occupiedFloors.push(i);
    }
    // Shuffle and take first 3
    for (let i = occupiedFloors.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [occupiedFloors[i], occupiedFloors[j]] = [occupiedFloors[j], occupiedFloors[i]];
    }
    const popFloors = occupiedFloors.slice(0, 3);
    let popCount = 0;
    for (const fi of popFloors) {
      spawnMoneyPopStaggered(fi, popCount * 80);
      popCount++;
    }
    // Pop from first 3 cafés
    const cafeDef = neighborhoodUpgrades.find(n => n.id === 'cafe');
    if (cafeDef && cafeDef.count > 0) {
      const maxCafePops = Math.min(cafeDef.count, 3);
      for (let i = 0; i < maxCafePops; i++) {
        spawnCafePopStaggered(i, (popCount + i) * 80);
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
    const installs = floor.amenityInstalls.get(a.id) || 0;
    if (installs < floor.maxTenants) return a;
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

      // Penthouse floor: show penthouse upgrades
      if (floor.isPenthouse) {
        const nextPU = getNextPenthouseUpgrade(floorIndex);
        if (nextPU) {
          const cost = getPenthouseUpgradeCost(nextPU.id, floorIndex);
          if (state.money >= cost && cost > 0) {
            state.money -= cost;
            floor.penthouseAmenityInstalls.set(nextPU.id, floor.maxTenants);
            playUpgradeSound();
            renderUI();
          }
        }
        return;
      }

      const next = getNextUpgrade(floorIndex);
      if (next) {
        // Buy amenity — install on ALL remaining apartments at once
        const cost = getAmenityFullCost(next, floorIndex);
        const installs = floor.amenityInstalls.get(next.id) || 0;
        const missing = floor.maxTenants - installs;
        if (state.money >= cost && missing > 0) {
          state.money -= cost;
          floor.amenityInstalls.set(next.id, floor.maxTenants);
          next.totalInstalled += missing;
          invalidateUpgradeCache();
          playUpgradeSound();
          renderUI();
        }
      } else if (isFloorFullyUpgraded(floorIndex) && floorIndex === state.floorCount - 1 && !floor.isPenthouse && !floor.hasPenthouse) {
        // Convert to penthouse — top floor only, all amenities installed
        const cost = getConvertToPenthouseCost(floorIndex);
        if (state.money >= cost) {
          state.money -= cost;
          floor.isPenthouse = true;
          floor.maxTenants = CONFIG.penthouseMaxTenants;
          floor.tenants = Math.min(floor.tenants, floor.maxTenants);
          convertFloorToGold(floorIndex);
          triggerGlow('gold', 2000);
          playAchievementSound();
          renderUI();
        }
      } else if (isFloorFullyUpgraded(floorIndex) && floor.studioLevel < CONFIG.maxStudioLevel) {
        // Buy studio upgrade — does NOT clear amenities
        const cost = getStudioCost(floorIndex, floor.studioLevel);
        if (state.money >= cost) {
          state.money -= cost;
          floor.studioLevel++;
          state.totalStudios++;
          floor.maxTenants = getTotalMaxTenants(floor.studioLevel);
          invalidateUpgradeCache();
          playStudioSound();
          renderUI();
        }
      } else if (isFloorComplete(floorIndex) && !floor.hasPenthouse && floorIndex >= PENTHOUSE_UNLOCK_FLOOR) {
        // Buy penthouse suite (old system)
        const cost = getPenthouseCost(floorIndex);
        if (state.money >= cost) {
          state.money -= cost;
          floor.hasPenthouse = true;
          triggerGlow('gold', 1500);
          playAchievementSound();
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
  if (!_cameraMovedThisFrame && !needsRender) return;

  // On mobile, hide floor panels — building is too small
  const mobile = isMobile();
  if (mobile) {
    for (const panel of floorPanels) {
      panel.el.style.opacity = '0';
    }
    return;
  }

  for (let i = 0; i < floorPanels.length; i++) {
    const panel = floorPanels[i];
    const worldPos = new THREE.Vector3(-0.8, (i + 0.5) * actualFloorHeight, 0);
    buildingGroup.localToWorld(worldPos);
    worldPos.project(camera);

    const hw = window.innerWidth / 2;
    const hh = window.innerHeight / 2;
    const sx = worldPos.x * hw + hw;
    const sy = -(worldPos.y * hh) + hh;

    if (worldPos.z > 0 && worldPos.z < 1 && sx > 50 && sx < window.innerWidth - 50 && sy > 10 && sy < window.innerHeight - 10) {
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

    // Penthouse floor — completely different UI
    if (floor.isPenthouse) {
      panel.rentLabel.textContent = `🥂 Penthouse`;
      panel.rentLabel.classList.remove('vacant');

      const puEntries = CONFIG.penthouseUpgrades.map(pu => `${pu.id}:${floor.penthouseAmenityInstalls.get(pu.id) || 0}`).join(',');
      const iconKey = `ph:${puEntries}`;
      if (panel.iconsEl.dataset.key !== iconKey) {
        panel.iconsEl.dataset.key = iconKey;
        const allDone = CONFIG.penthouseUpgrades.every(pu => (floor.penthouseAmenityInstalls.get(pu.id) || 0) >= floor.maxTenants);
        if (allDone) {
          panel.iconsEl.innerHTML = '<span class="floor-complete" style="color:#ffd700">🥂</span>';
        } else {
          panel.iconsEl.innerHTML = '';
        }
      }

      const nextPU = getNextPenthouseUpgrade(i);
      if (nextPU) {
        const cost = getPenthouseUpgradeCost(nextPU.id, i);
        const canAfford = state.money >= cost;
        panel.buyBtn.style.display = '';
        panel.buyBtn.disabled = !canAfford;
        const key = `ph:${nextPU.id}:${formatMoney(cost)}:f${i}`;
        if (panel.buyBtn.dataset.key !== key) {
          panel.buyBtn.dataset.key = key;
          panel.buyBtn.innerHTML = `
            <span class="btn-icon">${nextPU.icon}</span>
            <span class="btn-info">
              <span class="btn-name">${nextPU.name}</span>
              <span class="btn-detail"><span class="cost-val">${formatMoney(cost)}</span> · <span class="rent-val">+$${nextPU.rentBonus}/tenant</span></span>
            </span>
          `;
        }
        panel.buyBtn.classList.toggle('affordable', canAfford);
      } else {
        panel.buyBtn.style.display = 'none';
      }
      continue;
    }

    // Rent label — show tenant count
    panel.rentLabel.textContent = `${floor.tenants}/${floor.maxTenants}`;
    panel.rentLabel.classList.toggle('vacant', !hasTenants);

    // Installed icons — show coverage per amenity, or star if complete
    const installEntries = amenities.map(a => `${a.id}:${floor.amenityInstalls.get(a.id) || 0}`).join(',');
    const iconKey = floor.hasPenthouse ? 'penthouse' : complete ? 'complete' : `${installEntries}:s${floor.studioLevel}:m${floor.maxTenants}`;
    if (panel.iconsEl.dataset.key !== iconKey) {
      panel.iconsEl.dataset.key = iconKey;
      if (floor.hasPenthouse) {
        panel.iconsEl.innerHTML = '<span class="floor-complete" style="color:#ffd700">🏰</span>';
      } else if (complete) {
        panel.iconsEl.innerHTML = '<span class="floor-complete">\u2605</span>';
      } else {
        panel.iconsEl.innerHTML = '';
      }
    }

    // Buy button — show next available upgrade or studio
    const next = getNextUpgrade(i);
    if (next) {
      const cost = getAmenityFullCost(next, i);
      const canAfford = state.money >= cost;
      panel.buyBtn.style.display = '';
      panel.buyBtn.disabled = !canAfford;
      const key = `${next.id}:${formatMoney(cost)}:f${i}:m${floor.maxTenants}`;
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
    } else if (fullyUpgraded && i === state.floorCount - 1 && !floor.isPenthouse && !floor.hasPenthouse) {
      // Show "Convert to Penthouse" button — top floor, all amenities installed
      const cost = getConvertToPenthouseCost(i);
      const canAfford = state.money >= cost;
      panel.buyBtn.style.display = '';
      panel.buyBtn.disabled = !canAfford;
      const key = `convertph:${formatMoney(cost)}:f${i}`;
      if (panel.buyBtn.dataset.key !== key) {
        panel.buyBtn.dataset.key = key;
        panel.buyBtn.innerHTML = `
          <span class="btn-icon">🥂</span>
          <span class="btn-info">
            <span class="btn-name">Convert to Penthouse</span>
            <span class="btn-detail"><span class="cost-val">${formatMoney(cost)}</span> · <span class="rent-val">${CONFIG.penthouseRentMultiplier}x rent</span></span>
          </span>
        `;
      }
      panel.buyBtn.classList.toggle('affordable', canAfford);
    } else if (fullyUpgraded && floor.studioLevel < CONFIG.maxStudioLevel && !floor.isPenthouse) {
      // Show studio conversion button (not available for penthouse floors)
      const cost = getStudioCost(i, floor.studioLevel);
      const canAfford = state.money >= cost;
      panel.buyBtn.style.display = '';
      panel.buyBtn.disabled = !canAfford;
      const addition = getStudioAddition(floor.studioLevel + 1);
      const key = `studio:${floor.studioLevel}:${formatMoney(cost)}:f${i}`;
      if (panel.buyBtn.dataset.key !== key) {
        panel.buyBtn.dataset.key = key;
        panel.buyBtn.innerHTML = `
          <span class="btn-icon">🏠</span>
          <span class="btn-info">
            <span class="btn-name">Studios Lv${floor.studioLevel + 1}</span>
            <span class="btn-detail"><span class="cost-val">${formatMoney(cost)}</span> · <span class="rent-val">+${addition} slots</span></span>
          </span>
        `;
      }
      panel.buyBtn.classList.toggle('affordable', canAfford);
    } else if (complete && !floor.hasPenthouse && i >= PENTHOUSE_UNLOCK_FLOOR) {
      // Show penthouse suite button (old system)
      const cost = getPenthouseCost(i);
      const canAfford = state.money >= cost;
      panel.buyBtn.style.display = '';
      panel.buyBtn.disabled = !canAfford;
      const key = `penthouse:${formatMoney(cost)}:f${i}`;
      if (panel.buyBtn.dataset.key !== key) {
        panel.buyBtn.dataset.key = key;
        panel.buyBtn.innerHTML = `
          <span class="btn-icon">🏰</span>
          <span class="btn-info">
            <span class="btn-name">Penthouse Suite</span>
            <span class="btn-detail"><span class="cost-val">${formatMoney(cost)}</span> · <span class="rent-val">${PENTHOUSE_MULTIPLIER}x floor income</span></span>
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
const cityNameDisplay = document.getElementById('city-name-display')!;
const moneyDisplay = document.getElementById('money-display')!;
const incomeDisplay = document.getElementById('income-display')!;
const floorDisplay = document.getElementById('floor-display')!;
const rentDisplay = document.getElementById('rent-display')!;
const fillRateDisplay = document.getElementById('fill-rate-display')!;
const occupancyDisplay = document.getElementById('occupancy-display')!;
const occupancyPct = document.getElementById('occupancy-pct')!;
const vacancyFill = document.getElementById('vacancy-fill')!;
const shopEl = document.getElementById('shop')!;

const MONEY_SUFFIXES = [
  { threshold: 1e66, div: 1e66, suffix: 'UnVg' },
  { threshold: 1e63, div: 1e63, suffix: 'Vg' },
  { threshold: 1e60, div: 1e60, suffix: 'NvDc' },
  { threshold: 1e57, div: 1e57, suffix: 'OcDc' },
  { threshold: 1e54, div: 1e54, suffix: 'SpDc' },
  { threshold: 1e51, div: 1e51, suffix: 'SxDc' },
  { threshold: 1e48, div: 1e48, suffix: 'QiDc' },
  { threshold: 1e45, div: 1e45, suffix: 'QaDc' },
  { threshold: 1e42, div: 1e42, suffix: 'TDc' },
  { threshold: 1e39, div: 1e39, suffix: 'DDc' },
  { threshold: 1e36, div: 1e36, suffix: 'UDc' },
  { threshold: 1e33, div: 1e33, suffix: 'Dc' },
  { threshold: 1e30, div: 1e30, suffix: 'No' },
  { threshold: 1e27, div: 1e27, suffix: 'Oc' },
  { threshold: 1e24, div: 1e24, suffix: 'Sp' },
  { threshold: 1e21, div: 1e21, suffix: 'Sx' },
  { threshold: 1e18, div: 1e18, suffix: 'Qi' },
  { threshold: 1e15, div: 1e15, suffix: 'Qa' },
  { threshold: 1e12, div: 1e12, suffix: 'T' },
  { threshold: 1e9,  div: 1e9,  suffix: 'B' },
  { threshold: 1e6,  div: 1e6,  suffix: 'M' },
  { threshold: 1e3,  div: 1e3,  suffix: 'K' },
];

function formatMoney(amount: number): string {
  if (amount < 0) return '-' + formatMoney(-amount);
  if (amount < 1000) return '$' + Math.floor(amount);
  for (const { threshold, div, suffix } of MONEY_SUFFIXES) {
    if (amount >= threshold) {
      const val = amount / div;
      return '$' + (val < 10 ? val.toFixed(2) : val < 100 ? val.toFixed(1) : Math.floor(val)) + suffix;
    }
  }
  return '$' + Math.floor(amount);
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
    invalidateUpgradeCache();
    triggerGlow('green', 800);
    playNewFloorSound();
    markDirty();
    renderUI();
  }
});
shopEl.appendChild(floorBtn);

// ── Online Ads Button ─────────────────────────────────────────
const adBtn = document.createElement('button');
adBtn.className = 'shop-btn ad-btn';
adBtn.innerHTML = `
  <span class="ad-title">🏠 HIRE AGENTS</span>
  <span class="ad-stats">Attract tenants faster</span>
`;
adBtn.addEventListener('click', () => {
  const cost = getAdCost();
  if (state.money >= cost) {
    state.money -= cost;
    state.adBoost = Math.min(CONFIG.adMaxBoost, state.adBoost + CONFIG.adBoostPerClick);
    state.adTimer = CONFIG.adBoostMaxDuration;
    state.adClicks++;
    playClickSound();

    // Spawn a flashy number on the button
    const pop = document.createElement('div');
    pop.className = 'ad-click-pop';
    pop.textContent = `+${(CONFIG.adBoostPerClick).toFixed(2)}/s`;
    pop.style.left = `${adBtn.offsetLeft + adBtn.offsetWidth / 2}px`;
    pop.style.top = `${adBtn.offsetTop}px`;
    adBtn.parentElement!.appendChild(pop);
    setTimeout(() => pop.remove(), 800);

    renderUI();
  }
});
document.getElementById('ad-btn-container')!.appendChild(adBtn);

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
    playUpgradeSound();
    // Fill all apartments on all floors with this amenity (skip penthouse floors)
    for (let i = 0; i < state.floorCount; i++) {
      const floor = state.floorStates[i];
      if (!floor || floor.isPenthouse) continue;
      const current = floor.amenityInstalls.get(a.id) || 0;
      const missing = floor.maxTenants - current;
      if (missing > 0) {
        floor.amenityInstalls.set(a.id, floor.maxTenants);
        a.totalInstalled += missing;
      }
    }
    invalidateUpgradeCache();
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
  playStudioSound();
  for (let i = 0; i < state.floorCount; i++) {
    const floor = state.floorStates[i];
    if (floor && floor.studioLevel < CONFIG.maxStudioLevel && !floor.isPenthouse) {
      floor.studioLevel++;
      state.totalStudios++;
      floor.maxTenants = getTotalMaxTenants(floor.studioLevel);
    }
  }
  invalidateUpgradeCache();
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
    if (n.ownIncome > 0) triggerGlow('gold', 2000);
    spawnNeighborhoodModel(n);
    playClickSound();
    renderUI();
  });
  hoodEl.appendChild(btn);
  hoodButtons.set(n.id, btn);
}

// ── Property Management Company Button ────────────────────────
const propMgmtBtn = document.createElement('button');
propMgmtBtn.className = 'hood-btn';
propMgmtBtn.addEventListener('click', () => {
  if (propMgmtLevel >= PROP_MGMT_LEVELS.length) return;
  const lvl = PROP_MGMT_LEVELS[propMgmtLevel];
  if (state.money < lvl.cost) return;
  state.money -= lvl.cost;
  propMgmtLevel++;
  triggerGlow('purple', 2000);
  renderUI();
});
hoodEl.appendChild(propMgmtBtn);

// ── Per-Business Upgrade Buttons ─────────────────────────────
const businessSectionsEl = document.getElementById('business-sections')!;
const businessUI: Record<string, { sectionEl: HTMLDivElement; buttons: HTMLButtonElement[] }> = {};

// Business type definitions for UI
const BUSINESS_IDS = ['cafe', 'restaurant', 'salon', 'spa'];
const BUSINESS_NAMES: Record<string, string> = { cafe: 'Café', restaurant: 'Restaurant', salon: 'Hair Salon', spa: 'Luxury Spa' };

for (const bizId of BUSINESS_IDS) {
  const upgrades = CONFIG.businessUpgrades[bizId];
  if (!upgrades) continue;

  const sectionEl = document.createElement('div');
  sectionEl.className = 'business-section';
  sectionEl.style.display = 'none';

  const header = document.createElement('div');
  header.className = 'section-header';
  header.textContent = `${BUSINESS_NAMES[bizId]} Upgrades`;
  sectionEl.appendChild(header);

  const btnsContainer = document.createElement('div');
  sectionEl.appendChild(btnsContainer);
  businessSectionsEl.appendChild(sectionEl);

  const buttons: HTMLButtonElement[] = [];
  for (let i = 0; i < upgrades.length; i++) {
    const cfg = upgrades[i];
    const btn = document.createElement('button');
    btn.className = 'hood-btn';
    btn.addEventListener('click', () => {
      const st = businessUpgradeState[bizId][i];
      if (st.level >= cfg.maxLevel) return;
      const cost = getBusinessUpgradeCost(bizId, i);
      if (state.money < cost) return;
      state.money -= cost;
      st.level++;
      playUpgradeSound();
      renderUI();
    });
    btnsContainer.appendChild(btn);
    buttons.push(btn);
  }

  businessUI[bizId] = { sectionEl, buttons };
}

function renderBusinessUI() {
  for (const bizId of BUSINESS_IDS) {
    const ui = businessUI[bizId];
    if (!ui) continue;
    const bizDef = neighborhoodUpgrades.find(n => n.id === bizId);
    const owned = bizDef && bizDef.count > 0;
    ui.sectionEl.style.display = owned ? '' : 'none';
    if (!owned) continue;

    const upgrades = CONFIG.businessUpgrades[bizId];
    const states = businessUpgradeState[bizId];

    for (let i = 0; i < upgrades.length; i++) {
      const cfg = upgrades[i];
      const st = states[i];
      const btn = ui.buttons[i];
      const maxed = st.level >= cfg.maxLevel;
      if (maxed) {
        btn.disabled = true;
        btn.className = 'hood-btn maxed';
        const key = `${bizId}:${cfg.id}:maxed`;
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
        const cost = getBusinessUpgradeCost(bizId, i);
        const canAfford = state.money >= cost;
        btn.disabled = !canAfford;
        btn.className = 'hood-btn';
        const key = `${bizId}:${cfg.id}:${st.level}:${formatMoney(cost)}`;
        if (btn.dataset.key !== key) {
          btn.dataset.key = key;
          btn.innerHTML = `
            <span class="hood-icon">${cfg.icon}</span>
            <span class="hood-info">
              <span class="hood-name">${cfg.name}</span>
              <span class="hood-detail"><span class="cost-val">${formatMoney(cost)}</span> · <span class="rent-val">+${Math.round(cfg.incomeBoost * 100)}% income</span></span>
            </span>
            ${st.level > 0 ? `<span class="hood-count">${st.level}/${cfg.maxLevel}</span>` : ''}
          `;
        }
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
      if (n.fillRateBonus > 0) {
        bonusText += `<span class="rent-val">+${n.fillRateBonus.toFixed(2)}/s fill rate</span>`;
      }
      if (n.incomeMultiplier > 0) {
        if (bonusText) bonusText += ' · ';
        bonusText += `<span class="rent-val">×${((1 + n.incomeMultiplier) * 100 - 100).toFixed(0)}% income</span>`;
      }
      if (n.rentBonusPerFloor > 0) {
        if (bonusText) bonusText += ' · ';
        bonusText += `<span class="rent-val">+$${n.rentBonusPerFloor}/floor</span>`;
      }
      if (n.ownIncome > 0) {
        const incomePreview = n.ownIncome * (1 + state.floorCount * n.ownIncomeFloorScale) * getBusinessUpgradeMultiplier(n.id);
        if (bonusText) bonusText += ' · ';
        bonusText += `<span class="rent-val">earns ${formatMoney(incomePreview)}/s</span>`;
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

  // Property Management button (multi-level)
  if (state.floorCount < PROP_MGMT_UNLOCK_FLOORS) {
    propMgmtBtn.style.display = 'none';
  } else if (propMgmtLevel >= PROP_MGMT_LEVELS.length) {
    propMgmtBtn.style.display = '';
    propMgmtBtn.disabled = true;
    propMgmtBtn.className = 'hood-btn maxed';
    const top = PROP_MGMT_LEVELS[PROP_MGMT_LEVELS.length - 1];
    const key = 'propmgmt:maxed';
    if (propMgmtBtn.dataset.key !== key) {
      propMgmtBtn.dataset.key = key;
      propMgmtBtn.innerHTML = `
        <span class="hood-icon">${top.icon}</span>
        <span class="hood-info">
          <span class="hood-name">${top.name}</span>
          <span class="hood-desc">${top.multiplier}x income active</span>
        </span>
      `;
    }
  } else {
    const lvl = PROP_MGMT_LEVELS[propMgmtLevel];
    const prevMult = propMgmtLevel > 0 ? PROP_MGMT_LEVELS[propMgmtLevel - 1].multiplier : 1;
    propMgmtBtn.style.display = '';
    const canAfford = state.money >= lvl.cost;
    propMgmtBtn.disabled = !canAfford;
    propMgmtBtn.className = 'hood-btn';
    const key = `propmgmt:${propMgmtLevel}:${canAfford}`;
    if (propMgmtBtn.dataset.key !== key) {
      propMgmtBtn.dataset.key = key;
      propMgmtBtn.innerHTML = `
        <span class="hood-icon">${lvl.icon}</span>
        <span class="hood-info">
          <span class="hood-name">${lvl.name}</span>
          <span class="hood-detail"><span class="cost-val">${formatMoney(lvl.cost)}</span> · <span class="rent-val">${prevMult}x → ${lvl.multiplier}x income</span></span>
        </span>
        ${propMgmtLevel > 0 ? `<span class="hood-count">${propMgmtLevel}/${PROP_MGMT_LEVELS.length}</span>` : ''}
      `;
    }
  }

  // Move maxed buttons to the bottom of the container
  const hoodContainer = document.getElementById('neighborhood-upgrades')!;
  for (const n of neighborhoodUpgrades) {
    const btn = hoodButtons.get(n.id)!;
    if (n.count >= n.maxCount && btn.style.display !== 'none') {
      hoodContainer.appendChild(btn); // moves to end
    }
  }
}

// ── Achievements UI ──────────────────────────────────────────
const achievementsListEl = document.getElementById('achievements-list')!;
let achievementBadgesCreated = false;

function renderAchievementsUI() {
  if (!achievementBadgesCreated) {
    achievementBadgesCreated = true;
    // Render old-style achievements
    for (const a of achievements) {
      const badge = document.createElement('div');
      badge.className = 'achievement-badge';
      badge.id = `ach-${a.id}`;
      badge.innerHTML = `${a.icon}<div class="achievement-tooltip"><b>${a.name}</b><br>${a.desc}<br><span style="color:#7efa7e">${a.multiplier}x income</span></div>`;
      achievementsListEl.appendChild(badge);
    }
    // Render sign achievements with SVG icons
    for (const ach of CONFIG.achievementSigns) {
      const badge = document.createElement('div');
      badge.className = 'achievement-badge';
      badge.id = `ach-sign-${ach.id}`;
      const bonusPct = Math.round((ach.bonus - 1) * 100);
      const earned = accountAchievements.has(ach.id);
      const imgFilter = earned ? 'filter:invert(1)' : 'filter:invert(1) brightness(0.5)';
      badge.innerHTML = `<img src="${ach.icon}" style="width:24px;height:24px;${imgFilter}"><div class="achievement-tooltip"><b>${ach.name}</b><br><span style="color:#7efa7e">+${bonusPct}% income</span></div>`;
      if (earned) badge.classList.add('unlocked');
      achievementsListEl.appendChild(badge);
    }
  }
  for (const a of achievements) {
    const badge = document.getElementById(`ach-${a.id}`);
    if (badge) {
      badge.classList.toggle('unlocked', a.unlocked);
    }
  }
  // Update sign achievement badges
  for (const ach of CONFIG.achievementSigns) {
    const badge = document.getElementById(`ach-sign-${ach.id}`);
    if (badge) {
      const earned = accountAchievements.has(ach.id);
      badge.classList.toggle('unlocked', earned);
      const img = badge.querySelector('img');
      if (img) {
        img.style.filter = earned ? 'invert(1)' : 'invert(1) brightness(0.5)';
      }
    }
  }
}

function renderUI() {
  const income = getTotalRentPerSecondCached();
  const avgRent = getAverageRentPerTenant();
  const totalTenants = getTotalTenants();
  const totalSlots = getTotalSlots();
  const fillRate = getFillRate();

  cityNameDisplay.textContent = currentCityName;
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
        <span class="desc">Floor #${state.floorCount + 1} · <span style="color:#7efa7e">+${formatMoney(newFloorRent)}/s per tenant</span></span>
      `;
    }
  }

  // Vacancy section + Hire Agents — always visible, disabled when full
  {
    const totalTenants = getTotalTenants();
    const totalSlots = getTotalSlots();
    const allOccupied = totalTenants >= totalSlots;
    const adCost = getAdCost();
    const canAffordAd = state.money >= adCost && !allOccupied;
    adBtn.disabled = !canAffordAd;
    if (allOccupied) {
      adBtn.style.opacity = '0.4';
      adBtn.style.pointerEvents = 'none';
    } else {
      adBtn.style.opacity = '';
      adBtn.style.pointerEvents = '';
    }
    const boostActive = state.adTimer > 0;
    adBtn.className = boostActive ? 'shop-btn ad-btn ad-active' : 'shop-btn ad-btn';
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
              <span class="bulk-detail">All apartments installed &#x2713;</span>
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
              <span class="bulk-detail"><span class="cost-val">${formatMoney(cost)}</span> · <span class="rent-val">+$${a.rentBonus}/tenant</span> · <span class="count-val">${missing} apartments</span></span>
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
            <span class="bulk-detail"><span class="cost-val">${formatMoney(cost)}</span> · <span class="count-val">${studioNeeding} floors</span></span>
          </span>
        `;
      }
    }
  }

  // Neighborhood
  renderNeighborhoodUI();
  renderBusinessUI();
  renderAchievementsUI();
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
      // Play tenant sound occasionally (not every single tenant)
      if (Math.random() < 0.3) playTenantSound();
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

    let amenityCount = 0;
    for (const a of amenities) {
      const coverage = floor.maxTenants > 0 ? (floor.amenityInstalls.get(a.id) || 0) / floor.maxTenants : 0;
      amenityCount += coverage; // fractional credit
    }
    const churnChance = Math.max(0.001, CONFIG.baseChurnRate - amenityCount * CONFIG.amenityChurnReduction);

    // Scale to per-check-interval (churnRate is per minute, interval is in seconds)
    let churnPerCheck = churnChance * (CONFIG.churnCheckInterval / 60);
    if (state.activeEvent) churnPerCheck *= state.activeEvent.event.churnMultiplier;

    let lost = 0;
    for (let t = 0; t < floor.tenants; t++) {
      if (Math.random() < churnPerCheck) {
        lost++;
      }
    }
    if (lost > 0) {
      floor.tenants = Math.max(3, floor.tenants - lost);
      // Spawn leaving figures (cap visual spawns)
      for (let j = 0; j < Math.min(lost, 3); j++) {
        spawnTenant(false);
      }
      markDirty();
    }
  }
}

// ── City Events System ──────────────────────────────────────
const eventBanner = document.getElementById('event-banner')!;

function tickCityEvents(delta: number) {
  if (state.activeEvent) {
    state.activeEvent.timeLeft -= delta;
    if (state.activeEvent.timeLeft <= 0) {
      if (state.activeEvent.event.id === 'rainy_day') stopRainAmbience();
      state.activeEvent = null;
      state.eventCooldown = 20 + Math.random() * 40; // 20-60 seconds
      eventBanner.classList.remove('active');
    }
  } else {
    state.eventCooldown -= delta;
    if (state.eventCooldown <= 0) {
      const eligible = getEligibleEvents();
      if (eligible.length > 0) {
        const event = eligible[Math.floor(Math.random() * eligible.length)];
        state.activeEvent = { event, timeLeft: event.duration };
        state.totalEvents++;
        if (event.rentMultiplier >= 100) triggerGlow('gold', 2000);
        else if (event.rentMultiplier >= 10) triggerGlow('purple', 1500);
        else triggerGlow('green', 1000);
        eventBanner.classList.add('active');
        playEventSound();
        if (event.id === 'rainy_day') startRainAmbience();
      } else {
        state.eventCooldown = 30; // retry sooner if no eligible events
      }
    }
  }
}

function updateEventBannerUI() {
  if (state.activeEvent) {
    const e = state.activeEvent;
    const mins = Math.floor(e.timeLeft / 60);
    const secs = Math.floor(e.timeLeft % 60);
    const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;
    eventBanner.innerHTML = `
      <div class="event-name">${e.event.name}</div>
      <div>${e.event.description}</div>
      <div class="event-timer">${timeStr} remaining</div>
    `;
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

// ── Performance caches ──────────────────────────────────────
let _cachedRentPerSecond = 0;
let _rentCacheFrame = -1;
let _currentFrame = 0;

function getTotalRentPerSecondCached(): number {
  if (_rentCacheFrame === _currentFrame) return _cachedRentPerSecond;
  _cachedRentPerSecond = getTotalRentPerSecond();
  _rentCacheFrame = _currentFrame;
  return _cachedRentPerSecond;
}

let _cameraMovedThisFrame = false;
let rainFrameSkip = 0;
let _bulkPhaseCached: boolean | null = null;
let _frameTime = 0;

function invalidateUpgradeCache() { _bulkPhaseCached = null; }

function showWelcomeBack(awaySeconds: number, earnings: number) {
  const wb = document.getElementById('welcome-back')!;
  const wbTime = document.getElementById('wb-time')!;
  const wbAmount = document.getElementById('wb-amount')!;
  const wbCollect = document.getElementById('wb-collect')!;

  const hours = Math.floor(awaySeconds / 3600);
  const minutes = Math.floor((awaySeconds % 3600) / 60);
  if (hours > 0) {
    wbTime.textContent = `${hours}h ${minutes}m`;
  } else {
    wbTime.textContent = `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }

  wbAmount.textContent = formatMoney(earnings);
  wb.style.display = 'flex';

  wbCollect.onclick = () => {
    state.money += earnings;
    state.totalMoneyEarned += earnings;
    wb.style.display = 'none';
    playCashSound(0.8);
    triggerGlow('green', 1500);
    renderUI();
  };
}

let tabHidden = false;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    tabHidden = true;
  } else {
    tabHidden = false;
    lastTime = performance.now(); // prevent huge delta spike on return
    markDirty();
  }
});

function gameLoop(time: number) {
  requestAnimationFrame(gameLoop);

  // Skip rendering when tab is hidden (massive CPU savings)
  if (tabHidden) {
    lastTime = time;
    return;
  }

  _currentFrame++;
  _cameraMovedThisFrame = false;
  const frameTime = performance.now();
  _frameTime = frameTime;

  const rawDelta = (time - lastTime) / 1000;
  lastTime = time;
  const cappedDelta = Math.min(rawDelta, 14400); // cap at 4 hours
  const visualDelta = Math.min(rawDelta, 0.1); // clamp for animations only

  // ── Welcome back notification for idle earnings (skip first frame) ──
  if (cappedDelta > 5 && _currentFrame > 1) {
    const idleEarnings = getTotalRentPerSecondCached() * cappedDelta;
    if (idleEarnings > 0) showWelcomeBack(idleEarnings, cappedDelta);
  }

  // ── Economy tick — use capped delta so idle time accrues income ──
  const income = getTotalRentPerSecondCached();
  incomeAccumulator += income * cappedDelta;
  if (incomeAccumulator >= 0.1) {
    const amount = Math.floor(incomeAccumulator * 10) / 10;
    state.money += amount;
    state.totalMoneyEarned += amount;
    if (state.money > peakMoney) peakMoney = state.money;
    incomeAccumulator -= amount;
  }

  // ── Ad boost decay ──
  tickAdBoost(cappedDelta);

  // ── Auto-save ──
  autoSaveTimer += cappedDelta;
  if (autoSaveTimer >= 30) {
    autoSaveTimer = 0;
    autoSave();
  }

  // ── City events ──
  tickCityEvents(cappedDelta);

  // ── Tenant fill tick ──
  tickTenantFill(cappedDelta);

  // ── Churn tick ──
  tickChurn(cappedDelta);

  // ── Tenants (only if active, render throttled) ──
  if (activeTenants.length > 0) {
    updateTenants(visualDelta);
    markDirty();
  }

  // ── Money pops (DOM, throttled with the pops themselves) ──
  tickMoneyPops(visualDelta);

  // ── Weather visuals ──
  const eventId = state.activeEvent?.event.id ?? null;
  updateWeatherVisuals(eventId, visualDelta);

  // ── Camera animation (BEFORE panel positions so projections use current camera) ──
  const camDist = camera.position.distanceTo(cameraTargetPos);
  if (camDist > 0.01) {
    _cameraMovedThisFrame = true;
    animateCamera();
    markDirty();
  }

  // ── Floor panel positions (AFTER camera so projections are correct) ──
  updateFloorPanelPositions();
  updateAchievementSignPositions();

  // ── DOM content updates throttled ──
  uiTimer += visualDelta;
  if (uiTimer >= UI_INTERVAL) {
    uiTimer = 0;
    renderUI();
    updateFloorPanelContent();
    updateEventBannerUI();
    checkAchievements();
    checkSignAchievements();
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
  updateCamera();
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
      const current = floor.amenityInstalls.get(a.id) || 0;
      if (current < floor.maxTenants) {
        floor.amenityInstalls.set(a.id, floor.maxTenants);
        a.totalInstalled += (floor.maxTenants - current);
      }
    }
  }
  renderUI();
};

// ── Auto-save ────────────────────────────────────────────────
let currentCityName = '';
let autoSaveTimer = 0;

async function autoSave() {
  if (!currentCityName) return;
  const data = serializeState(currentCityName);
  await platform.save(currentCityName, JSON.stringify(data));
  await updateSaveIndex(platform, {
    cityName: currentCityName,
    floorCount: state.floorCount,
    money: state.money,
    timestamp: Date.now(),
  });
}

window.addEventListener('beforeunload', () => { autoSave(); });

// ── Static formatters for start screen ───────────────────────
function formatMoneyStatic(amount: number): string {
  if (amount < 1000) return '$' + Math.floor(amount);
  if (amount < 1e6) return '$' + (amount / 1e3).toFixed(1) + 'K';
  if (amount < 1e9) return '$' + (amount / 1e6).toFixed(1) + 'M';
  if (amount < 1e12) return '$' + (amount / 1e9).toFixed(1) + 'B';
  if (amount < 1e15) return '$' + (amount / 1e12).toFixed(1) + 'T';
  return '$' + amount.toExponential(1);
}

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ── Rebuild Building From Saved State ────────────────────────
async function rebuildBuildingFromState() {
  // Clear existing building
  while (buildingGroup.children.length > 0) {
    buildingGroup.remove(buildingGroup.children[0]);
  }

  // Rebuild ground floor
  const groundFloor = await loadModel('models/building-door.glb');
  groundFloor.position.y = 0;
  buildingGroup.add(groundFloor);

  const box = new THREE.Box3().setFromObject(groundFloor);
  const size = box.getSize(new THREE.Vector3());
  actualFloorHeight = size.y;

  // Add additional floors
  const floorModels = [
    'models/building-window.glb',
    'models/building-windows.glb',
    'models/building-window-balcony.glb',
    'models/building-window-awnings.glb',
    'models/building-window-sill.glb',
  ];

  for (let i = 1; i < state.floorCount; i++) {
    const modelPath = floorModels[(i - 1) % floorModels.length];
    const newFloor = await loadModel(modelPath);
    newFloor.position.y = i * actualFloorHeight;
    buildingGroup.add(newFloor);
  }

  // Add roof
  roofModel = await loadModel('models/roof-flat-top.glb');
  roofModel.position.y = state.floorCount * actualFloorHeight;
  buildingGroup.add(roofModel);

  visualFloorCount = state.floorCount;
  floorsPurchased = state.floorCount - 1;

  // Rebuild neighborhood models
  // Show sidewalk if purchased
  const sidewalkDef = neighborhoodUpgrades.find(n => n.id === 'sidewalk');
  if (sidewalkDef && sidewalkDef.count > 0) {
    sidewalk.visible = true;
  }

  for (const n of neighborhoodUpgrades) {
    if (n.id === 'sidewalk') continue; // handled above
    const savedCount = n.count;
    for (let i = 0; i < savedCount; i++) {
      n.count = i + 1;
      // Only spawn visual if within position limit or every 5th
      if (n.count <= n.positions.length || n.count % 5 === 0) {
        await spawnNeighborhoodModel(n);
      }
    }
    n.count = savedCount;
  }

  // Rebuild achievement signs (no labels for already-earned ones)
  for (const ach of CONFIG.achievementSigns) {
    if (accountAchievements.has(ach.id)) {
      spawnAchievementSign(ach, false);
    }
  }

  // Convert penthouse floors to gold
  for (let i = 0; i < state.floorStates.length; i++) {
    if (state.floorStates[i].isPenthouse) {
      convertFloorToGold(i);
    }
  }

  updateCamera();
  markDirty();
}

// ── Start Screen ─────────────────────────────────────────────
const startScreen = document.getElementById('start-screen')!;
const startButtons = document.getElementById('start-buttons')!;

async function showStartScreen() {
  platform = detectPlatform();
  await platform.init();

  // Load account-level achievements
  const accountData = await loadAccountData(platform);
  accountAchievements = new Set(accountData.earnedAchievements);
  // Sync to achievements array
  for (const a of achievements) {
    a.unlocked = accountAchievements.has(a.id);
  }

  menuBtn.style.display = 'none';

  const saves = await loadSaveIndex(platform);
  startButtons.innerHTML = '';

  if (saves.length > 0) {
    // Sort by most recent
    saves.sort((a, b) => b.timestamp - a.timestamp);
    const latest = saves[0];

    // Continue button
    const continueBtn = document.createElement('button');
    continueBtn.className = 'start-btn primary';
    continueBtn.innerHTML = `
      <span class="btn-label">▶ Continue — ${latest.cityName}</span>
      <span class="btn-detail">${latest.floorCount} floors · ${formatMoneyStatic(latest.money)}</span>
    `;
    continueBtn.onclick = () => loadAndStart(latest.cityName);
    startButtons.appendChild(continueBtn);

    // Load game button (shows list)
    if (saves.length > 1) {
      const loadBtn = document.createElement('button');
      loadBtn.className = 'start-btn secondary';
      loadBtn.innerHTML = '<span class="btn-label">Load Game</span>';
      loadBtn.onclick = () => showSaveList(saves);
      startButtons.appendChild(loadBtn);
    }
  }

  // New game button
  const newBtn = document.createElement('button');
  newBtn.className = 'start-btn secondary';
  newBtn.innerHTML = '<span class="btn-label">New Game</span>';
  newBtn.onclick = () => startNewGame(saves);
  startButtons.appendChild(newBtn);

  // Settings button
  const settingsBtn = document.createElement('button');
  settingsBtn.className = 'start-btn secondary';
  settingsBtn.innerHTML = '<span class="btn-label">Settings</span>';
  settingsBtn.onclick = () => showSettings();
  startButtons.appendChild(settingsBtn);

  // Achievement showcase
  const achSection = document.createElement('div');
  achSection.style.cssText = 'margin-top: 20px; text-align: left;';
  let achGridHtml = '';
  for (const ach of CONFIG.achievementSigns) {
    const earned = accountAchievements.has(ach.id);
    const bonusPct = Math.round((ach.bonus - 1) * 100);
    if (earned) {
      achGridHtml += `<div title="${ach.name} — ${bonusPct}% income boost" style="width:32px;height:32px;border:1px solid #ffd700;border-radius:4px;display:flex;align-items:center;justify-content:center;background:rgba(255,215,0,0.1)"><img src="${ach.icon}" style="width:20px;height:20px;filter:invert(1)"></div>`;
    } else {
      achGridHtml += `<div title="${ach.name} — ${bonusPct}% income boost" style="width:32px;height:32px;border:1px solid #555;border-radius:4px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.03);opacity:0.4"><img src="${ach.icon}" style="width:20px;height:20px;filter:invert(1)"></div>`;
    }
  }
  achSection.innerHTML = `
    <h3 style="color: #ffd700; font-size: 14px; margin-bottom: 8px;">
      <img src="icons/trophy.svg" style="width:16px;height:16px;vertical-align:middle;filter:invert(1)"> Achievements (${accountAchievements.size}/${CONFIG.achievementSigns.length})
    </h3>
    <div style="display: flex; flex-wrap: wrap; gap: 4px;">
      ${achGridHtml}
    </div>
    <p style="color: #aaa; font-size: 11px; margin-top: 6px;">
      Achievements boost income across all cities
    </p>
  `;
  startButtons.appendChild(achSection);
}

function showSaveList(saves: SaveMeta[]) {
  startButtons.innerHTML = '';

  const title = document.createElement('h3');
  title.style.cssText = 'color: white; margin-bottom: 12px;';
  title.textContent = 'Load Game';
  startButtons.appendChild(title);

  const list = document.createElement('div');
  list.className = 'save-list';

  for (const save of saves) {
    const entry = document.createElement('div');
    entry.className = 'save-entry';

    const info = document.createElement('div');
    info.innerHTML = `
      <div class="save-city">${save.cityName}</div>
      <div class="save-info">${save.floorCount} floors · ${formatMoneyStatic(save.money)} · ${formatTimeAgo(save.timestamp)}</div>
    `;
    info.style.cursor = 'pointer';
    info.style.flex = '1';
    info.onclick = () => loadAndStart(save.cityName);
    entry.appendChild(info);

    const del = document.createElement('button');
    del.className = 'save-delete';
    del.textContent = '\u2715';
    del.onclick = async (e) => {
      e.stopPropagation();
      if (confirm(`Delete save "${save.cityName}"?`)) {
        await platform.deleteSave(save.cityName);
        await removeSaveFromIndex(platform, save.cityName);
        const updatedSaves = await loadSaveIndex(platform);
        if (updatedSaves.length > 0) {
          showSaveList(updatedSaves);
        } else {
          showStartScreen();
        }
      }
    };
    entry.appendChild(del);

    list.appendChild(entry);
  }

  startButtons.appendChild(list);

  const backBtn = document.createElement('button');
  backBtn.className = 'back-btn';
  backBtn.textContent = '\u2190 Back';
  backBtn.onclick = () => showStartScreen();
  startButtons.appendChild(backBtn);
}

function showSettings() {
  startButtons.innerHTML = '';

  const title = document.createElement('h3');
  title.style.cssText = 'color: white; margin-bottom: 12px;';
  title.textContent = 'Settings';
  startButtons.appendChild(title);

  const panel = document.createElement('div');
  panel.className = 'settings-panel';
  panel.innerHTML = '<p>Audio and graphics settings coming soon.</p>';
  startButtons.appendChild(panel);

  const backBtn = document.createElement('button');
  backBtn.className = 'back-btn';
  backBtn.textContent = '\u2190 Back';
  backBtn.onclick = () => showStartScreen();
  startButtons.appendChild(backBtn);
}

async function startNewGame(existingSaves: SaveMeta[]) {
  const usedCities = existingSaves.map(s => s.cityName);
  currentCityName = getRandomCity(usedCities);
  startScreen.classList.add('hidden');
  preloadSounds();
  await initGame();
  menuBtn.style.display = 'flex';
}

async function loadAndStart(cityName: string) {
  const raw = await platform.load(cityName);
  if (!raw) {
    alert('Save not found!');
    return;
  }
  try {
    const data: SaveData = JSON.parse(raw);
    currentCityName = cityName;
    startScreen.classList.add('hidden');
    preloadSounds();
    await initGame();
    deserializeState(data);
    // Force recalculate bulk phase
    bulkPhaseUnlocked = false;
    invalidateUpgradeCache();
    // If past floor 10, we're in bulk phase
    if (state.floorCount > PER_FLOOR_CAP) {
      bulkPhaseUnlocked = true;
    }
    // Sync account achievements
    for (const a of achievements) {
      a.unlocked = accountAchievements.has(a.id);
    }
    // Rebuild building visually
    await rebuildBuildingFromState();
    menuBtn.style.display = 'flex';
    renderUI();

    // Offline progress — calculate earnings since last save
    const savedIncome = data.incomePerSecond ?? 0;
    const savedTime = data.timestamp ?? 0;
    if (savedIncome > 0 && savedTime > 0) {
      const awaySeconds = Math.floor((Date.now() - savedTime) / 1000);
      const MIN_AWAY = 60; // at least 1 minute to show
      const MAX_AWAY = 8 * 3600; // cap at 8 hours of earnings
      if (awaySeconds >= MIN_AWAY) {
        const effectiveSeconds = Math.min(awaySeconds, MAX_AWAY);
        // Give 50% of what they would have earned (standard idle game practice)
        const offlineEarnings = savedIncome * effectiveSeconds * 0.5;
        if (offlineEarnings > 0) {
          showWelcomeBack(awaySeconds, offlineEarnings);
        }
      }
    }
  } catch (e) {
    alert('Failed to load save: ' + e);
  }
}



let gameStarted = false;

async function initGame() {
  if (!gameStarted) {
    gameStarted = true;
    lastTime = performance.now();
    _currentFrame = 0;
    await initBuilding();
    renderUI();
    requestAnimationFrame(gameLoop);
  } else {
    // Game already running, just update UI
    updateCamera();
    renderUI();
    markDirty();
  }
}

// ── In-Game Menu ─────────────────────────────────────────────
const menuBtn = document.getElementById('menu-btn')!;
const gameMenu = document.getElementById('game-menu')!;
const menuResume = document.getElementById('menu-resume')!;
const menuSave = document.getElementById('menu-save')!;
const menuSettings = document.getElementById('menu-settings')!;
const menuQuit = document.getElementById('menu-quit')!;

menuBtn.addEventListener('click', () => {
  gameMenu.classList.add('active');
});

menuResume.addEventListener('click', () => {
  gameMenu.classList.remove('active');
});

menuSave.addEventListener('click', async () => {
  await autoSave();
  showSaveNotification();
  gameMenu.classList.remove('active');
});

menuSettings.addEventListener('click', () => {
  // For now just close menu — settings page coming later
  gameMenu.classList.remove('active');
});

menuQuit.addEventListener('click', async () => {
  await autoSave();
  gameMenu.classList.remove('active');
  // Show start screen
  startScreen.classList.remove('hidden');
  showStartScreen();
});

function showSaveNotification() {
  const n = document.createElement('div');
  n.style.cssText = `
    position:fixed; bottom:20px; left:50%; transform:translateX(-50%);
    background:rgba(0,0,0,0.8); color:#4ade80; padding:8px 20px;
    border-radius:8px; font-size:14px; z-index:2000;
    animation: fadeInUp 0.3s ease-out;
  `;
  n.textContent = '\u2713 Game saved';
  document.body.appendChild(n);
  setTimeout(() => n.remove(), 2000);
}

// Show start screen immediately
showStartScreen();
