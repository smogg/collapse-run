import { DIFFICULTY_DEFAULTS, BASE_SPEED } from '../config';
import { DifficultyParams } from '../types';

export class AdaptiveDifficulty {
  private params: DifficultyParams;
  private deathsLast5: number[] = [];
  private currentRunStart = 0;
  private _injectSafeSegment = false;

  constructor() {
    this.params = { ...DIFFICULTY_DEFAULTS };
  }

  onRunStart(time: number): void {
    this.currentRunStart = time;
    this._injectSafeSegment = false;
  }

  onRunEnd(time: number): void {
    const duration = (time - this.currentRunStart) / 1000;
    this.deathsLast5.push(duration);
    if (this.deathsLast5.length > 5) this.deathsLast5.shift();
    this.adjust();
  }

  private adjust(): void {
    const recent = this.deathsLast5;
    const last = recent.length > 0 ? recent[recent.length - 1] : 30;
    const shortDeaths = recent.filter(d => d < 10).length;

    if (last < 10) {
      this.params.gapFrequency = Math.max(0.05, this.params.gapFrequency - 0.03);
      this.params.speed = Math.max(BASE_SPEED * 0.7, this.params.speed * 0.93);
      this.params.obstacleDensity = Math.max(0, this.params.obstacleDensity - 0.02);
      this.params.pathWidthMin = Math.min(5, this.params.pathWidthMin + 1);
    } else if (last > 45) {
      this.params.obstacleDensity = Math.min(0.2, this.params.obstacleDensity + 0.02);
      this.params.speed = Math.min(BASE_SPEED * 1.6, this.params.speed * 1.05);
      this.params.gapFrequency = Math.min(0.35, this.params.gapFrequency + 0.02);
      this.params.pathWidthMin = Math.max(3, this.params.pathWidthMin - 1);
    }

    if (shortDeaths >= 4) {
      this._injectSafeSegment = true;
    }
  }

  getParams(): DifficultyParams {
    return { ...this.params };
  }

  shouldInjectSafeSegment(): boolean {
    if (this._injectSafeSegment) {
      this._injectSafeSegment = false;
      return true;
    }
    return false;
  }

  getSpeedForTime(elapsedMs: number): number {
    const rampUp = Math.min(elapsedMs / 60000, 1) * 0.3;
    return this.params.speed * (1 + rampUp);
  }
}
