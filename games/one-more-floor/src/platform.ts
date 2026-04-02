export interface GamePlatform {
  init(): Promise<void>;
  save(key: string, data: string): Promise<void>;
  load(key: string): Promise<string | null>;
  listSaves(): Promise<string[]>;
  deleteSave(key: string): Promise<void>;
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
}

export class CrazyGamesPlatform implements GamePlatform {
  private sdk: any = null;

  async init(): Promise<void> {
    if ((window as any).CrazyGames?.SDK) {
      this.sdk = (window as any).CrazyGames.SDK;
      await this.sdk.init();
    }
  }

  async save(key: string, data: string): Promise<void> {
    if (this.sdk?.data) {
      await this.sdk.data.save({ [key]: data });
    } else {
      localStorage.setItem('omf_save_' + key, data);
    }
  }

  async load(key: string): Promise<string | null> {
    if (this.sdk?.data) {
      const result = await this.sdk.data.load();
      return result?.[key] ?? null;
    }
    return localStorage.getItem('omf_save_' + key);
  }

  async listSaves(): Promise<string[]> {
    if (this.sdk?.data) {
      const result = await this.sdk.data.load();
      return result ? Object.keys(result) : [];
    }
    // Fallback to localStorage
    const saves: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('omf_save_')) {
        saves.push(k.slice(9));
      }
    }
    return saves;
  }

  async deleteSave(key: string): Promise<void> {
    if (this.sdk?.data) {
      await this.sdk.data.save({ [key]: null });
    } else {
      localStorage.removeItem('omf_save_' + key);
    }
  }
}

export function detectPlatform(): GamePlatform {
  if ((window as any).CrazyGames) {
    return new CrazyGamesPlatform();
  }
  return new LocalStoragePlatform();
}
