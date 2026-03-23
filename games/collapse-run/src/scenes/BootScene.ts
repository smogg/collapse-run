import Phaser from 'phaser';
import { AdManager } from '../systems/AdManager';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  async create(): Promise<void> {
    // Initialize CrazyGames SDK
    const adManager = new AdManager();
    await adManager.init();
    this.registry.set('adManager', adManager);

    // Generate particle textures programmatically
    const debrisGfx = this.add.graphics();
    debrisGfx.fillStyle(0xcccccc, 1);
    debrisGfx.fillRect(0, 0, 6, 6);
    debrisGfx.generateTexture('debris_particle', 6, 6);
    debrisGfx.destroy();

    const glowGfx = this.add.graphics();
    glowGfx.fillStyle(0xffffff, 1);
    glowGfx.fillCircle(8, 8, 8);
    glowGfx.generateTexture('glow_particle', 16, 16);
    glowGfx.destroy();

    // Show brief title then start game
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;

    const title = this.add.text(cx, cy - 40, 'COLLAPSE RUN', {
      fontSize: '48px',
      fontFamily: 'monospace',
      color: '#00FFAA',
    }).setOrigin(0.5);

    const sub = this.add.text(cx, cy + 20, 'Tap or press any key to start', {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#666666',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: sub,
      alpha: 0.3,
      duration: 800,
      yoyo: true,
      repeat: -1,
    });

    const startGame = () => {
      this.scene.start('GameScene');
      this.scene.start('UIScene');
    };

    this.input.keyboard?.once('keydown', startGame);
    this.input.once('pointerdown', startGame);
  }
}
