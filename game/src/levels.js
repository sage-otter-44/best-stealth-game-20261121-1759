// SHADOW VAULT — the 5 levels. One job: level data only, no logic.
// Tiles are 40px; the grid is 32x20. Walls are tile rects {x,y,w,h}.
// Cover = crates and bushes: standing in one hides you (see vision.js).
// Guards patrol the waypoint loop in tile coords; speed/range override the defaults.
import { TILE, GRID_W, GRID_H } from './config.js';

function level(def) {
  return {
    name: def.name,
    briefing: def.briefing,
    walls: def.walls,
    crates: def.crates,
    bushes: def.bushes,
    player: def.player,
    keycard: def.keycard,
    cores: def.cores,
    exit: def.exit,
    guards: def.guards,
  };
}

export const LEVELS = [
  level({
    name: '1 · THE GALLERY',
    briefing: 'Lift the keycard, slip past 2 guards, reach the green exit unseen.',
    walls: [
      { x: 8, y: 2, w: 1, h: 6 }, { x: 16, y: 10, w: 1, h: 8 },
      { x: 22, y: 2, w: 1, h: 5 }, { x: 4, y: 12, w: 8, h: 1 },
      { x: 20, y: 13, w: 8, h: 1 }, { x: 12, y: 5, w: 7, h: 1 },
    ],
    crates: [[5, 3], [6, 10], [14, 3], [18, 15], [25, 8], [27, 16]],
    bushes: [[3, 8], [11, 15], [19, 4], [24, 16], [28, 3]],
    player: [2, 17], keycard: [26, 2], exit: [29, 18],
    cores: [[14, 10], [28, 17], [4, 6]],
    guards: [
      { patrol: [[12, 3], [12, 10], [20, 10], [20, 3]] },
      { patrol: [[24, 12], [24, 17], [28, 17], [28, 12]] },
    ],
  }),
  level({
    name: '2 · THE ARCHIVE',
    briefing: '3 guards now. Crates block sight lines — use them, and mind the noise.',
    walls: [
      { x: 6, y: 2, w: 1, h: 7 }, { x: 13, y: 11, w: 1, h: 7 },
      { x: 20, y: 2, w: 1, h: 6 }, { x: 26, y: 10, w: 1, h: 8 },
      { x: 3, y: 9, w: 6, h: 1 }, { x: 15, y: 6, w: 8, h: 1 },
      { x: 9, y: 15, w: 6, h: 1 }, { x: 22, y: 15, w: 6, h: 1 },
    ],
    crates: [[4, 4], [10, 4], [17, 9], [24, 5], [8, 17], [28, 12], [16, 16]],
    bushes: [[2, 15], [11, 8], [19, 13], [25, 17], [29, 4], [15, 2]],
    player: [2, 2], keycard: [29, 8], exit: [29, 18],
    cores: [[10, 12], [24, 9], [17, 17]],
    guards: [
      { patrol: [[9, 3], [9, 8], [16, 8], [16, 3]] },
      { patrol: [[18, 10], [18, 16], [25, 16], [25, 10]] },
      { patrol: [[28, 2], [28, 8], [23, 8], [23, 2]] },
    ],
  }),
  level({
    name: '3 · VAULT FLOOR',
    briefing: 'The vault floor: tight corridors, 3 overlapping patrols. Patience pays.',
    walls: [
      { x: 5, y: 2, w: 1, h: 8 }, { x: 11, y: 10, w: 1, h: 8 },
      { x: 17, y: 2, w: 1, h: 6 }, { x: 23, y: 11, w: 1, h: 7 },
      { x: 28, y: 3, w: 1, h: 6 }, { x: 8, y: 5, w: 6, h: 1 },
      { x: 19, y: 8, w: 6, h: 1 }, { x: 3, y: 14, w: 7, h: 1 },
      { x: 14, y: 15, w: 6, h: 1 }, { x: 24, y: 15, w: 5, h: 1 },
    ],
    crates: [[3, 4], [9, 8], [14, 4], [20, 12], [26, 6], [7, 17], [16, 18], [29, 12]],
    bushes: [[2, 11], [12, 7], [18, 16], [25, 9], [30, 16], [10, 16], [22, 3]],
    player: [1, 18], keycard: [29, 2], exit: [30, 18],
    cores: [[7, 12], [21, 5], [27, 17]],
    guards: [
      { patrol: [[8, 2], [8, 9], [14, 9], [14, 2]] },
      { patrol: [[19, 4], [19, 12], [26, 12], [26, 4]] },
      { patrol: [[10, 13], [10, 18], [24, 18], [24, 13]] },
    ],
  }),
  level({
    name: '4 · SERVER HALL',
    briefing: '4 guards, humming servers. Sprint and they hear you — sneak or throw a coin.',
    walls: [
      { x: 4, y: 3, w: 1, h: 7 }, { x: 9, y: 11, w: 1, h: 7 },
      { x: 15, y: 2, w: 1, h: 6 }, { x: 21, y: 11, w: 1, h: 7 },
      { x: 27, y: 2, w: 1, h: 6 }, { x: 6, y: 6, w: 5, h: 1 },
      { x: 17, y: 9, w: 5, h: 1 }, { x: 2, y: 14, w: 6, h: 1 },
      { x: 11, y: 15, w: 6, h: 1 }, { x: 23, y: 15, w: 6, h: 1 },
    ],
    crates: [[2, 6], [7, 9], [12, 4], [18, 13], [24, 7], [29, 10], [6, 17], [20, 17]],
    bushes: [[3, 11], [10, 7], [16, 16], [22, 4], [28, 14], [13, 18], [26, 18]],
    player: [1, 1], keycard: [30, 9], exit: [30, 18],
    cores: [[6, 13], [16, 6], [26, 12]],
    guards: [
      { patrol: [[6, 2], [6, 10], [12, 10], [12, 2]] },
      { patrol: [[18, 3], [18, 10], [24, 10], [24, 3]] },
      { patrol: [[8, 13], [8, 18], [16, 18], [16, 13]] },
      { patrol: [[25, 13], [25, 18], [29, 18], [29, 13]] },
    ],
  }),
  level({
    name: '5 · THE DIRECTOR’S WING',
    briefing: 'Final wing: 2 elite guards, longer cones, faster feet. One clean run wins it.',
    walls: [
      { x: 7, y: 2, w: 1, h: 8 }, { x: 14, y: 10, w: 1, h: 8 },
      { x: 21, y: 2, w: 1, h: 6 }, { x: 27, y: 10, w: 1, h: 8 },
      { x: 3, y: 12, w: 8, h: 1 }, { x: 17, y: 7, w: 7, h: 1 },
      { x: 10, y: 16, w: 8, h: 1 }, { x: 22, y: 15, w: 6, h: 1 },
    ],
    crates: [[4, 5], [10, 6], [18, 4], [25, 6], [6, 15], [16, 13], [29, 5], [12, 18]],
    bushes: [[2, 9], [11, 12], [20, 13], [26, 17], [30, 9], [15, 5]],
    player: [1, 18], keycard: [15, 2], exit: [30, 1],
    cores: [[5, 17], [24, 10], [29, 16]],
    guards: [
      { patrol: [[10, 3], [10, 9], [18, 9], [18, 3]], speed: 80, range: 248 },
      { patrol: [[20, 11], [20, 17], [28, 17], [28, 11]], speed: 80, range: 248 },
    ],
  }),
];

export const GUARD_TOTAL = LEVELS.reduce((n, l) => n + l.guards.length, 0); // 14
export const CORE_TOTAL = LEVELS.reduce((n, l) => n + l.cores.length, 0); // 15

// Tile helpers shared by movement, vision and rendering.
export function tileCenter(tx, ty) {
  return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
}

export function isWallTile(level, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= GRID_W || ty >= GRID_H) return true;
  return level.walls.some((w) => tx >= w.x && tx < w.x + w.w && ty >= w.y && ty < w.y + w.h);
}

export function isCoverTile(level, tx, ty) {
  const inList = (list) => list.some(([cx, cy]) => cx === tx && cy === ty);
  return inList(level.crates) || inList(level.bushes);
}

export function isBushTile(level, tx, ty) {
  return level.bushes.some(([cx, cy]) => cx === tx && cy === ty);
}

export function wallAtPoint(level, px, py) {
  return isWallTile(level, Math.floor(px / TILE), Math.floor(py / TILE));
}

// A circle (player/guard) may stand here if no wall tile overlaps it.
export function circleFree(level, px, py, radius) {
  const steps = 8;
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    if (wallAtPoint(level, px + Math.cos(a) * radius, py + Math.sin(a) * radius)) return false;
  }
  return !wallAtPoint(level, px, py);
}

// Sanity: every named tile sits inside the grid and on open floor.
export function validateLevels() {
  const problems = [];
  LEVELS.forEach((lv, li) => {
    const check = (label, tx, ty, mustBeOpen) => {
      if (tx < 0 || ty < 0 || tx >= GRID_W || ty >= GRID_H) problems.push(`L${li + 1} ${label} out of grid`);
      else if (mustBeOpen && isWallTile(lv, tx, ty)) problems.push(`L${li + 1} ${label} inside a wall`);
    };
    check('player', ...lv.player, true);
    check('keycard', ...lv.keycard, true);
    check('exit', ...lv.exit, true);
    lv.cores.forEach((c, i) => check(`core${i}`, ...c, true));
    lv.guards.forEach((g, i) => g.patrol.forEach((p, j) => check(`guard${i} wp${j}`, ...p, true)));
    lv.crates.forEach((c, i) => { if (isWallTile(lv, ...c)) problems.push(`L${li + 1} crate${i} in wall`); });
    lv.bushes.forEach((c, i) => { if (isWallTile(lv, ...c)) problems.push(`L${li + 1} bush${i} in wall`); });
  });
  return problems;
}
