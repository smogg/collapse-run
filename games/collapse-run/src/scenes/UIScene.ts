import Phaser from 'phaser';

export class UIScene extends Phaser.Scene {
  private scoreText!: Phaser.GameObjects.Text;
  private multiplierText!: Phaser.GameObjects.Text;
  private highScoreText!: Phaser.GameObjects.Text;

  // Death screen elements (not in a container — simpler positioning)
  private deathBg!: Phaser.GameObjects.Rectangle;
  private deathScoreText!: Phaser.GameObjects.Text;
  private deathHighText!: Phaser.GameObjects.Text;
  private tapText!: Phaser.GameObjects.Text;
  private reviveBg!: Phaser.GameObjects.Rectangle;
  private reviveLabel!: Phaser.GameObjects.Text;

  private deathVisible = false;
  private canRevive = false;

  constructor() {
    super({ key: 'UIScene' });
  }

  create(): void {
    const gameScene = this.scene.get('GameScene');
    const w = this.scale.width;
    const h = this.scale.height;

    // Score display
    this.scoreText = this.add.text(w / 2, 30, '0', {
      fontSize: '36px',
      fontFamily: 'monospace',
      color: '#00FFAA',
    }).setOrigin(0.5, 0).setDepth(100);

    this.multiplierText = this.add.text(w / 2, 70, 'x1.00', {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#00FFAA',
    }).setOrigin(0.5, 0).setAlpha(0.6).setDepth(100);

    this.highScoreText = this.add.text(w - 20, 20, '', {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#666666',
      align: 'right',
    }).setOrigin(1, 0).setDepth(100);

    // Death overlay elements
    this.deathBg = this.add.rectangle(w / 2, h / 2, w * 2, h * 2, 0x000000, 0.7)
      .setDepth(200).setVisible(false);

    this.deathScoreText = this.add.text(w / 2, h * 0.3, '', {
      fontSize: '64px',
      fontFamily: 'monospace',
      color: '#ffffff',
    }).setOrigin(0.5).setDepth(201).setVisible(false);

    this.deathHighText = this.add.text(w / 2, h * 0.4, '', {
      fontSize: '20px',
      fontFamily: 'monospace',
      color: '#666666',
    }).setOrigin(0.5).setDepth(201).setVisible(false);

    this.reviveBg = this.add.rectangle(w / 2, h * 0.52, 260, 50, 0x00FFAA, 0.9)
      .setDepth(201).setVisible(false).setInteractive({ useHandCursor: true });

    this.reviveLabel = this.add.text(w / 2, h * 0.52, 'WATCH AD TO REVIVE', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#111111',
    }).setOrigin(0.5).setDepth(202).setVisible(false);

    this.tapText = this.add.text(w / 2, h * 0.65, 'TAP TO RESTART', {
      fontSize: '24px',
      fontFamily: 'monospace',
      color: '#00FFAA',
    }).setOrigin(0.5).setDepth(201).setVisible(false);

    this.tweens.add({
      targets: this.tapText,
      alpha: { from: 1, to: 0.3 },
      duration: 800,
      yoyo: true,
      repeat: -1,
    });

    // Revive click
    this.reviveBg.on('pointerdown', () => {
      (gameScene as any).revive();
    });

    // Listen to game events
    gameScene.events.on('score-update', (score: number, mult: number, high: number) => {
      this.scoreText.setText(String(score));
      this.multiplierText.setText(`x${mult.toFixed(2)}`);
      if (high > 0) {
        this.highScoreText.setText(`BEST: ${high}`);
      }
    });

    gameScene.events.on('player-died', (data: { score: number; highScore: number; canRevive: boolean }) => {
      this.showDeath(data.score, data.highScore, data.canRevive);
    });

    gameScene.events.on('run-start', () => {
      this.hideDeath();
    });

    // Tap/key to restart
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (!this.deathVisible) return;
      // Check if hitting revive button
      if (this.canRevive) {
        const bounds = this.reviveBg.getBounds();
        if (bounds.contains(p.x, p.y)) return;
      }
      (gameScene as any).restart();
    });

    this.input.keyboard?.on('keydown', () => {
      if (!this.deathVisible) return;
      (gameScene as any).restart();
    });

    // Handle resize
    this.scale.on('resize', (size: Phaser.Structs.Size) => {
      this.repositionUI(size.width, size.height);
    });
  }

  private showDeath(score: number, highScore: number, canRevive: boolean): void {
    this.deathVisible = true;
    this.canRevive = canRevive;
    const w = this.scale.width;
    const h = this.scale.height;

    this.deathBg.setPosition(w / 2, h / 2).setSize(w * 2, h * 2).setVisible(true);
    this.deathScoreText.setPosition(w / 2, h * 0.3).setText(String(score)).setVisible(true);
    this.deathHighText.setPosition(w / 2, h * 0.4)
      .setText(score >= highScore && score > 0 ? 'NEW BEST!' : `BEST: ${highScore}`)
      .setVisible(true);
    this.reviveBg.setPosition(w / 2, h * 0.52).setVisible(canRevive);
    this.reviveLabel.setPosition(w / 2, h * 0.52).setVisible(canRevive);
    this.tapText.setPosition(w / 2, h * 0.65).setVisible(true);
  }

  private hideDeath(): void {
    this.deathVisible = false;
    this.deathBg.setVisible(false);
    this.deathScoreText.setVisible(false);
    this.deathHighText.setVisible(false);
    this.reviveBg.setVisible(false);
    this.reviveLabel.setVisible(false);
    this.tapText.setVisible(false);
  }

  private repositionUI(w: number, h: number): void {
    this.scoreText.setPosition(w / 2, 30);
    this.multiplierText.setPosition(w / 2, 70);
    this.highScoreText.setPosition(w - 20, 20);
  }
}
