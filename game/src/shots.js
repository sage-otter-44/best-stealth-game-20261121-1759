// Screenshot staging: deterministic scenes for the three handed-in shots.
// One job: put the game in a photogenic, mid-stealth state for ?shot=.
//   start: level 1, thief at spawn, patrols mid-route, cones sweeping.
//   play:  level 3, thief crouched in cover, a cone brushing past, alert half up.
//   end:   level 5 cleared — the victory panel over the finished vault.
// The game is frozen (no simulation) so the capture is the same every run.
import { tileCenter } from './levels.js';
import { angleTo } from './vision.js';

function placeGuardAt(game, index, tx, ty, facingDeg) {
  const g = game.guards[index];
  const p = tileCenter(tx, ty);
  g.x = p.x; g.y = p.y;
  g.facing = (facingDeg * Math.PI) / 180;
  g.state = 'patrol';
  g.pause = 99; // hold still: the shot is a frozen frame
  return g;
}

export function stageShot(game, which) {
  if (which === 'start') {
    game.state = 'playing';
    // Player already at the level-1 spawn; aim guards so their cones cross the room.
    placeGuardAt(game, 0, 14, 6, 90);
    placeGuardAt(game, 1, 26, 15, 180);
    game.guards[0].suspicion = 12;
    game.time = 8;
    game.flash = null;
  } else if (which === 'play') {
    // Level 3 is loaded by main.js for this shot (see loadLevel there).
    const p = tileCenter(10, 16);
    game.player.x = p.x; game.player.y = p.y;
    game.player.sneaking = true;
    game.player.facing = angleTo(p.x, p.y, tileCenter(14, 13).x, tileCenter(14, 13).y);
    game.player.hidden = true;
    placeGuardAt(game, 0, 12, 14, 200);
    placeGuardAt(game, 1, 21, 15, 90);
    placeGuardAt(game, 2, 16, 17, 270);
    game.guards[0].suspicion = 58;
    game.guards[1].suspicion = 20;
    game.coresGot = new Set([0, 1]);
    game.hasKeycard = true;
    game.score = 1850;
    game.time = 63;
    game.alert = 58;
    game.state = 'playing';
    game.flash = 'SPOTTED — BREAK LINE OF SIGHT';
    game.flashColor = '#ff9a2e';
    game.flashTimer = 99;
  } else if (which === 'end') {
    game.state = 'victory';
    game.score = 7420;
    game.time = 512;
    game.detections = 2;
    game.totalCores = 13;
    game.hasKeycard = true;
    game.coresGot = new Set([0, 1, 2]);
  }
  return game;
}
