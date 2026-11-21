// Player: movement, stance, noise, and the thrown coin lure.
// One job: where the thief is, how loud they are, and what they threw.
import {
  PLAYER_RADIUS, PLAYER_WALK_SPEED, PLAYER_SNEAK_SPEED, PLAYER_SPRINT_SPEED,
  NOISE_SPRINT_RADIUS, LURE_FLIGHT_TIME, LURES_PER_LEVEL, TILE,
} from './config.js';
import { circleFree, tileCenter } from './levels.js';

export function createPlayer(level) {
  const s = tileCenter(...level.player);
  return {
    x: s.x, y: s.y, radius: PLAYER_RADIUS,
    facing: -Math.PI / 2,
    sneaking: false, sprinting: false, moving: false,
    noiseRadius: 0, // guards inside this radius hear the player
    luresLeft: LURES_PER_LEVEL,
    lure: null, // {sx, sy, tx, ty, t} while a coin is flying
    stepPhase: 0, // drives the footstep bob + sound timing
  };
}

export function updatePlayer(player, input, level, dt, onLureLanded) {
  const speed = input.sneak ? PLAYER_SNEAK_SPEED
    : input.sprint ? PLAYER_SPRINT_SPEED : PLAYER_WALK_SPEED;
  player.sneaking = input.sneak && (input.moveX !== 0 || input.moveY !== 0);
  player.sprinting = input.sprint && (input.moveX !== 0 || input.moveY !== 0);
  player.moving = input.moveX !== 0 || input.moveY !== 0;

  if (player.moving) {
    player.facing = Math.atan2(input.moveY, input.moveX);
    player.stepPhase += dt * (player.sprinting ? 11 : player.sneaking ? 5 : 8);
    const nx = player.x + input.moveX * speed * dt;
    const ny = player.y + input.moveY * speed * dt;
    // Axis-separated so the player slides along walls instead of sticking.
    if (circleFree(level, nx, player.y, player.radius)) player.x = nx;
    if (circleFree(level, player.x, ny, player.radius)) player.y = ny;
  }

  player.noiseRadius = player.sprinting ? NOISE_SPRINT_RADIUS : 0;

  // Mouse click throws a coin lure to that spot (if any left and none flying).
  if (input.click && player.luresLeft > 0 && !player.lure) {
    player.luresLeft -= 1;
    player.lure = {
      sx: player.x, sy: player.y,
      tx: input.click.x, ty: input.click.y, t: 0,
    };
  }
  input.click = null;

  if (player.lure) {
    player.lure.t += dt / LURE_FLIGHT_TIME;
    if (player.lure.t >= 1) {
      const landed = { x: player.lure.tx, y: player.lure.ty };
      player.lure = null;
      onLureLanded(landed);
    }
  }
}

// Current coin position while it flies (an arc: up then down).
export function lurePosition(player) {
  const l = player.lure;
  const t = Math.min(1, l.t);
  const x = l.sx + (l.tx - l.sx) * t;
  const y = l.sy + (l.ty - l.sy) * t - Math.sin(t * Math.PI) * 46;
  return { x, y };
}

export function playerTile(player) {
  return { tx: Math.floor(player.x / TILE), ty: Math.floor(player.y / TILE) };
}
