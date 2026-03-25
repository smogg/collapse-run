import { Cell, CellType, LevelDef } from '../types';
import { GRID_SIZE } from '../config';

export class Grid {
  cells: Cell[][];

  constructor(level: LevelDef) {
    this.cells = [];

    for (let y = 0; y < GRID_SIZE; y++) {
      const row: Cell[] = [];
      for (let x = 0; x < GRID_SIZE; x++) {
        row.push({ type: 'empty' });
      }
      this.cells.push(row);
    }

    for (const w of level.walls) {
      this.cells[w.y][w.x] = { type: 'wall' };
    }

    for (const t of level.turrets) {
      this.cells[t.pos.y][t.pos.x] = { type: 'turret', turretDefId: t.defId };
    }

    for (const p of level.path) {
      this.cells[p.y][p.x] = { type: 'route' };
    }

    if (level.path.length > 0) {
      const entrance = level.path[0];
      this.cells[entrance.y][entrance.x] = { type: 'entrance' };
      const exit = level.path[level.path.length - 1];
      this.cells[exit.y][exit.x] = { type: 'exit' };
    }
  }

  getCell(x: number, y: number): Cell | null {
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return null;
    return this.cells[y][x];
  }

  getCellType(x: number, y: number): CellType {
    const cell = this.getCell(x, y);
    return cell ? cell.type : 'wall';
  }
}
