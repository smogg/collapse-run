/**
 * Loads individual 16x16 tile PNGs from the Kenney Tiny Dungeon pack.
 * Sprites are rendered at 3x scale (48px) centered in 52px cells.
 */

const TILE_DIR = 'sprites/kenney_tiny-dungeon/Tiles';

// Sprite assignments
const SPRITE_MAP = {
  // Characters
  normal: 'tile_0085.png',
  tank: 'tile_0097.png',
  healer: 'tile_0084.png',

  // Environment
  floor: 'tile_0048.png',
  wall: 'tile_0024.png',
  entrance: 'tile_0063.png',
  exit: 'tile_0065.png',

  // Turrets
  turret_rapid: 'tile_0110.png',
  turret_heavy: 'tile_0121.png',

  // Route
  route: 'tile_0049.png',
} as const;

export type SpriteKey = keyof typeof SPRITE_MAP;

export class SpriteLoader {
  private images = new Map<string, HTMLImageElement>();
  private loaded = false;
  private loadPromise: Promise<void> | null = null;

  load(): Promise<void> {
    if (this.loadPromise) return this.loadPromise;

    const entries = Object.entries(SPRITE_MAP);
    const promises = entries.map(([key, file]) => {
      return new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          this.images.set(key, img);
          resolve();
        };
        img.onerror = () => {
          console.warn(`Failed to load sprite: ${key} (${file})`);
          resolve(); // Don't block on missing sprites
        };
        img.src = `${TILE_DIR}/${file}`;
      });
    });

    this.loadPromise = Promise.all(promises).then(() => {
      this.loaded = true;
    });

    return this.loadPromise;
  }

  isLoaded(): boolean {
    return this.loaded;
  }

  get(key: SpriteKey): HTMLImageElement | undefined {
    return this.images.get(key);
  }

  /**
   * Draw a sprite centered in a cell.
   * Sprites are 16px, drawn at 3x = 48px, centered in CELL_PX (52px).
   */
  drawCell(ctx: CanvasRenderingContext2D, key: SpriteKey, px: number, py: number, cellPx: number) {
    const img = this.images.get(key);
    if (!img) return false;

    const size = cellPx; // stretch to fill cell
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, px, py, size, size);
    return true;
  }

  /**
   * Draw a sprite at arbitrary position and size (for characters).
   */
  drawAt(ctx: CanvasRenderingContext2D, key: SpriteKey, cx: number, cy: number, size: number) {
    const img = this.images.get(key);
    if (!img) return false;

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, cx - size / 2, cy - size / 2, size, size);
    return true;
  }
}
