import { MULTIPLIER_INTERVAL } from '../config';

export class ScoreManager {
  private _score = 0;
  private _multiplier = 1;
  private _highScore = 0;
  private runStartTime = 0;
  private startRow = 0;

  constructor() {
    this.loadHighScore();
  }

  private loadHighScore(): void {
    try {
      const saved = localStorage.getItem('collapse_run_high');
      if (saved) this._highScore = parseInt(saved, 10) || 0;
    } catch { /* no localStorage */ }
  }

  private saveHighScore(): void {
    try {
      localStorage.setItem('collapse_run_high', String(this._highScore));
    } catch { /* no localStorage */ }
  }

  onRunStart(startRow: number, time: number): void {
    this._score = 0;
    this._multiplier = 1;
    this.startRow = startRow;
    this.runStartTime = time;
  }

  update(currentRow: number, time: number): void {
    const distance = Math.max(0, Math.floor(currentRow - this.startRow));
    const elapsed = time - this.runStartTime;
    this._multiplier = 1 + Math.floor(elapsed / MULTIPLIER_INTERVAL) * 0.25;
    this._score = Math.floor(distance * this._multiplier);
  }

  onRunEnd(): void {
    if (this._score > this._highScore) {
      this._highScore = this._score;
      this.saveHighScore();
    }
  }

  get score(): number { return this._score; }
  get multiplier(): number { return this._multiplier; }
  get highScore(): number { return this._highScore; }
}
