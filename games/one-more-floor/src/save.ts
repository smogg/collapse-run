import type { GamePlatform } from './platform';

export interface SaveData {
  version: number;
  cityName: string;
  timestamp: number;
  money: number;
  totalMoneyEarned: number;
  floorCount: number;
  floorStates: Array<{
    tenants: number;
    maxTenants: number;
    studioLevel: number;
    isPenthouse: boolean;
    amenityInstalls: Record<string, number>;
    penthouseAmenityInstalls: Record<string, number>;
  }>;
  neighborhoodCounts: Record<string, number>;
  businessUpgradeLevels: Record<string, Record<string, number>>;
  earnedAchievements: string[];
  propMgmtLevel: number;
  totalStudios: number;
  totalEvents: number;
  adClicks: number;
}

export interface SaveMeta {
  cityName: string;
  floorCount: number;
  money: number;
  timestamp: number;
}

// Save index keeps metadata about all saves for the load screen
export async function loadSaveIndex(platform: GamePlatform): Promise<SaveMeta[]> {
  const raw = await platform.load('__save_index__');
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function updateSaveIndex(platform: GamePlatform, meta: SaveMeta): Promise<void> {
  const index = await loadSaveIndex(platform);
  const existing = index.findIndex(s => s.cityName === meta.cityName);
  if (existing >= 0) {
    index[existing] = meta;
  } else {
    index.push(meta);
  }
  await platform.save('__save_index__', JSON.stringify(index));
}

export async function removeSaveFromIndex(platform: GamePlatform, cityName: string): Promise<void> {
  const index = await loadSaveIndex(platform);
  const filtered = index.filter(s => s.cityName !== cityName);
  await platform.save('__save_index__', JSON.stringify(filtered));
}
