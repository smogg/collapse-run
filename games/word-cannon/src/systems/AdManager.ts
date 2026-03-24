// CrazyGames SDK integration — identical pattern to collapse-run

import { AD_INTERSTITIAL_EVERY_N_DEATHS } from '../config';

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
          requestAd(
            type: string,
            callbacks: {
              adStarted: () => void;
              adFinished: () => void;
              adError: (err: unknown) => void;
            }
          ): void;
        };
      };
    };
  }
}

export class AdManager {
  private sdk: typeof window.CrazyGames | undefined;
  private ready = false;
  private deathCount = 0;
  private reviveUsed = false;

  async init(): Promise<void> {
    try {
      this.sdk = window.CrazyGames;
      if (this.sdk) {
        await this.sdk.SDK.init();
        this.ready = true;
        console.log('[AdManager] CrazyGames SDK initialized');
      } else {
        console.log('[AdManager] No SDK found — running in local mode');
      }
    } catch (e) {
      console.warn('[AdManager] SDK init failed:', e);
    }
  }

  gameplayStart(): void {
    if (this.ready) this.sdk!.SDK.game.gameplayStart();
  }

  gameplayStop(): void {
    if (this.ready) this.sdk!.SDK.game.gameplayStop();
  }

  onRunStart(): void {
    this.reviveUsed = false;
  }

  onDeath(): void {
    this.deathCount++;
  }

  shouldShowInterstitial(): boolean {
    return this.deathCount > 0 && this.deathCount % AD_INTERSTITIAL_EVERY_N_DEATHS === 0;
  }

  canRevive(): boolean {
    return !this.reviveUsed;
  }

  showInterstitial(): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.ready) {
        console.log('[AdManager] Interstitial ad would appear here');
        setTimeout(() => resolve(true), 500);
        return;
      }
      this.sdk!.SDK.ad.requestAd('midgame', {
        adStarted: () => {},
        adFinished: () => resolve(true),
        adError: () => resolve(false),
      });
    });
  }

  showRewardedAd(): Promise<boolean> {
    this.reviveUsed = true;
    return new Promise((resolve) => {
      if (!this.ready) {
        console.log('[AdManager] Rewarded ad would appear here');
        setTimeout(() => resolve(true), 500);
        return;
      }
      this.sdk!.SDK.ad.requestAd('rewarded', {
        adStarted: () => {},
        adFinished: () => resolve(true),
        adError: () => {
          this.reviveUsed = false;
          resolve(false);
        },
      });
    });
  }
}
