export interface GamePlatform {
  init(): Promise<void>;
  save(key: string, data: string): Promise<void>;
  load(key: string): Promise<string | null>;
  listSaves(): Promise<string[]>;
  deleteSave(key: string): Promise<void>;
  showRewardedAd(onReward: () => void, onMute: () => void, onUnmute: () => void): void;
  hasAds(): boolean;
}

export class LocalStoragePlatform implements GamePlatform {
  private prefix = 'omf_save_';

  async init(): Promise<void> {}

  async save(key: string, data: string): Promise<void> {
    localStorage.setItem(this.prefix + key, data);
  }

  async load(key: string): Promise<string | null> {
    return localStorage.getItem(this.prefix + key);
  }

  async listSaves(): Promise<string[]> {
    const saves: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(this.prefix)) {
        saves.push(k.slice(this.prefix.length));
      }
    }
    return saves;
  }

  async deleteSave(key: string): Promise<void> {
    localStorage.removeItem(this.prefix + key);
  }

  showRewardedAd(_onReward: () => void, _onMute: () => void, _onUnmute: () => void): void {
    // No ads in local dev — just give the reward
    _onReward();
  }

  hasAds(): boolean { return false; }
}

export class CrazyGamesPlatform implements GamePlatform {
  private sdk: any = null;

  async init(): Promise<void> {
    const cg = (window as any).CrazyGames;
    if (cg?.SDK) {
      this.sdk = cg.SDK;
      try {
        await this.sdk.init();
      } catch {
        // SDK init failed — fall back to localStorage
        this.sdk = null;
      }
    }
  }

  async save(key: string, data: string): Promise<void> {
    if (this.sdk?.data) {
      try {
        this.sdk.data.setItem(key, data);
      } catch {
        localStorage.setItem('omf_save_' + key, data);
      }
    } else {
      localStorage.setItem('omf_save_' + key, data);
    }
  }

  async load(key: string): Promise<string | null> {
    if (this.sdk?.data) {
      try {
        const val = this.sdk.data.getItem(key);
        if (val != null) return val;
        // Migration: check localStorage for old saves
        const old = localStorage.getItem('omf_save_' + key);
        if (old) {
          // Migrate to SDK storage
          this.sdk.data.setItem(key, old);
          localStorage.removeItem('omf_save_' + key);
          return old;
        }
        return null;
      } catch {
        return localStorage.getItem('omf_save_' + key);
      }
    }
    return localStorage.getItem('omf_save_' + key);
  }

  async listSaves(): Promise<string[]> {
    const saves = new Set<string>();

    // Check SDK storage
    if (this.sdk?.data) {
      try {
        // The SDK data module mirrors localStorage API
        // We store a save index key to track all saves
        const indexRaw = this.sdk.data.getItem('__save_index__');
        if (indexRaw) {
          const index = JSON.parse(indexRaw);
          if (Array.isArray(index)) {
            for (const s of index) saves.add(s);
          }
        }
      } catch {}
    }

    // Also check localStorage for migration
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('omf_save_')) {
        const name = k.slice(9);
        if (name !== '__account__' && name !== '__save_index__') {
          saves.add(name);
        }
      }
    }

    return [...saves];
  }

  async deleteSave(key: string): Promise<void> {
    if (this.sdk?.data) {
      try {
        this.sdk.data.removeItem(key);
      } catch {}
    }
    localStorage.removeItem('omf_save_' + key);
  }

  showRewardedAd(onReward: () => void, onMute: () => void, onUnmute: () => void): void {
    if (!this.sdk?.ad) {
      onReward(); // No SDK — just give reward
      return;
    }

    this.sdk.ad.requestAd('rewarded', {
      adStarted: () => {
        onMute();
      },
      adError: () => {
        onUnmute();
      },
      adFinished: () => {
        onUnmute();
        onReward();
      },
    });
  }

  hasAds(): boolean {
    return !!(this.sdk?.ad);
  }
}

export function detectPlatform(): GamePlatform {
  if ((window as any).CrazyGames) {
    return new CrazyGamesPlatform();
  }
  return new LocalStoragePlatform();
}
