import Phaser from 'phaser';

export class InputManager {
  private scene: Phaser.Scene;
  private keys: {
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
    a: Phaser.Input.Keyboard.Key;
    d: Phaser.Input.Keyboard.Key;
  } | null = null;

  private touchDir: -1 | 0 | 1 = 0;
  private _direction: -1 | 0 | 1 = 0;
  private _samples: number[] = [];
  private invertControls = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  init(): void {
    if (this.scene.input.keyboard) {
      this.keys = {
        left: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
        right: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
        a: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        d: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      };
    }

    this.scene.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.updateTouch(p);
    });
    this.scene.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (p.isDown) this.updateTouch(p);
    });
    this.scene.input.on('pointerup', () => {
      this.touchDir = 0;
    });
  }

  private updateTouch(p: Phaser.Input.Pointer): void {
    const third = this.scene.scale.width / 3;
    if (p.x < third) {
      this.touchDir = -1;
    } else if (p.x > third * 2) {
      this.touchDir = 1;
    } else {
      this.touchDir = 0;
    }
  }

  setInvertControls(inverted: boolean): void {
    this.invertControls = inverted;
  }

  update(): void {
    let dir: -1 | 0 | 1 = 0;

    if (this.keys) {
      const left = this.keys.left.isDown || this.keys.a.isDown;
      const right = this.keys.right.isDown || this.keys.d.isDown;
      if (left && !right) dir = -1;
      else if (right && !left) dir = 1;
    }

    if (dir === 0 && this.touchDir !== 0) {
      dir = this.touchDir;
    }

    if (this.invertControls && dir !== 0) {
      dir = (dir * -1) as -1 | 1;
    }

    this._direction = dir;
    this._samples.push(dir);
    if (this._samples.length > 120) this._samples.shift();
  }

  getDirection(): -1 | 0 | 1 {
    return this._direction;
  }

  getSamples(): number[] {
    return this._samples;
  }

  reset(): void {
    this._samples = [];
    this._direction = 0;
    this.touchDir = 0;
  }
}
