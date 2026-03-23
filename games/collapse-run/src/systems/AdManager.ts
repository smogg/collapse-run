import { INTERSTITIAL_EVERY_N_DEATHS } from '../config';

declare global {
  interface Window {
    CrazyGames?: {
      SDK: {
        init(): Promise<void>;
        game: {
          gameplayStart(): void;
          gameplayStop(): void;
        };
        ad: {
          requestAd(type: string, callbacks: {
            adStarted?: () => void;
            adFinished?: () => void;
            adError?: (err: string) => void;
          }): void;
        };
      };
    };
  }
}

export class AdManager {
  private sdkAvailable = false;
  private deathCount = 0;
  private reviveUsedThisRun = false;

  async init(): Promise<void> {
    try {
      if (window.CrazyGames?.SDK) {
        await window.CrazyGames.SDK.init();
        this.sdkAvailable = true;
      }
    } catch {
      this.sdkAvailable = false;
    }
  }

  gameplayStart(): void {
    if (!this.sdkAvailable) return;
    try { window.CrazyGames!.SDK.game.gameplayStart(); } catch { /* */ }
  }

  gameplayStop(): void {
    if (!this.sdkAvailable) return;
    try { window.CrazyGames!.SDK.game.gameplayStop(); } catch { /* */ }
  }

  onRunStart(): void {
    this.reviveUsedThisRun = false;
  }

  onDeath(): void {
    this.deathCount++;
  }

  shouldShowInterstitial(): boolean {
    return this.deathCount > 0 && this.deathCount % INTERSTITIAL_EVERY_N_DEATHS === 0;
  }

  canRevive(): boolean {
    return !this.reviveUsedThisRun;
  }

  showInterstitial(): Promise<boolean> {
    if (!this.sdkAvailable) return Promise.resolve(false);
    return new Promise((resolve) => {
      try {
        window.CrazyGames!.SDK.ad.requestAd('midgame', {
          adStarted: () => {},
          adFinished: () => resolve(true),
          adError: () => resolve(false),
        });
      } catch {
        resolve(false);
      }
    });
  }

  showRewardedAd(): Promise<boolean> {
    if (!this.sdkAvailable || this.reviveUsedThisRun) return Promise.resolve(false);
    return new Promise((resolve) => {
      try {
        window.CrazyGames!.SDK.ad.requestAd('rewarded', {
          adStarted: () => {},
          adFinished: () => {
            this.reviveUsedThisRun = true;
            resolve(true);
          },
          adError: () => resolve(false),
        });
      } catch {
        resolve(false);
      }
    });
  }
}
