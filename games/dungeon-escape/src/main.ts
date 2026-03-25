import { Game } from './Game';
import { SpriteLoader } from './SpriteLoader';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const sprites = new SpriteLoader();

sprites.load().then(() => {
  const game = new Game(canvas, sprites);
  (window as any).__game = game;
  game.start();
});
