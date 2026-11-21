// Vision: line of sight, vision-cone shape, and the detection rate.
// One job: answer "can this guard see the player right now, and how fast does
// suspicion grow?" Walls block sight; cover hides; distance and speed matter.
import {
  CONE_RANGE, CONE_HALF_ANGLE, CONE_RAYS,
  SPOT_RATE_CLOSE, SPOT_RATE_FAR, SPOT_SNEAK_FACTOR, SPOT_SPRINT_FACTOR,
  SPOT_COVER_FACTOR, SPOT_COVER_CLOSE_RANGE, TILE,
} from './config.js';
import { wallAtPoint, isCoverTile } from './levels.js';

export function angleTo(ax, ay, bx, by) {
  return Math.atan2(by - ay, bx - ax);
}

export function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function dist(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay);
}

// Sampled line of sight: true when no wall tile sits between the two points.
export function hasLineOfSight(level, ax, ay, bx, by) {
  const d = dist(ax, ay, bx, by);
  const steps = Math.max(1, Math.ceil(d / (TILE / 3)));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (wallAtPoint(level, ax + (bx - ax) * t, ay + (by - ay) * t)) return false;
  }
  return true;
}

// The cone as a polygon, raycast against walls so light stops at cover.
// Used for drawing; the guard's eye uses the same wall test.
export function conePolygon(level, gx, gy, facing, range) {
  const pts = [{ x: gx, y: gy }];
  for (let i = 0; i <= CONE_RAYS; i++) {
    const a = facing - CONE_HALF_ANGLE + (2 * CONE_HALF_ANGLE * i) / CONE_RAYS;
    const dx = Math.cos(a), dy = Math.sin(a);
    let reach = range;
    const step = 8;
    for (let r = step; r <= range; r += step) {
      if (wallAtPoint(level, gx + dx * r, gy + dy * r)) { reach = r; break; }
    }
    pts.push({ x: gx + dx * reach, y: gy + dy * reach });
  }
  return pts;
}

// Is the player inside the guard's cone (range + angle + line of sight)?
export function playerInCone(level, guard, px, py) {
  const range = guard.range;
  const d = dist(guard.x, guard.y, px, py);
  if (d > range) return false;
  const a = angleTo(guard.x, guard.y, px, py);
  if (Math.abs(angleDiff(a, guard.facing)) > CONE_HALF_ANGLE) return false;
  return hasLineOfSight(level, guard.x, guard.y, px, py);
}

// Suspicion gained per second while this guard can see the player.
export function spotRate(level, guard, player) {
  const d = dist(guard.x, guard.y, player.x, player.y);
  const t = Math.min(1, d / guard.range); // 0 close, 1 at cone edge
  let rate = SPOT_RATE_CLOSE + (SPOT_RATE_FAR - SPOT_RATE_CLOSE) * t;
  if (player.sneaking) rate *= SPOT_SNEAK_FACTOR;
  if (player.sprinting) rate *= SPOT_SPRINT_FACTOR;
  const tx = Math.floor(player.x / TILE), ty = Math.floor(player.y / TILE);
  if (isCoverTile(level, tx, ty)) {
    rate *= SPOT_COVER_FACTOR;
    if (d < SPOT_COVER_CLOSE_RANGE) rate = Math.max(rate, SPOT_RATE_CLOSE * 0.5);
  }
  return rate;
}
