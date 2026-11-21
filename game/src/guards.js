// Guards: patrol, suspicion, investigation, chase, and capture.
// One job: the enemy AI. States: patrol -> suspicious -> chase (alarm) ->
// search -> return; noise and coin lures send a guard to investigate.
import {
  GUARD_RADIUS, GUARD_PATROL_SPEED, GUARD_CHASE_SPEED, GUARD_INVESTIGATE_SPEED,
  GUARD_CATCH_RADIUS, CONE_RANGE, ALARM_AT, SUSPICIOUS_AT, SUSPICION_DECAY,
  ALARM_LOSE_SIGHT_AFTER, SEARCH_TIME, TILE,
} from './config.js';
import { tileCenter, circleFree } from './levels.js';
import { angleTo, angleDiff, dist, playerInCone, spotRate } from './vision.js';

export function createGuard(def, index) {
  const start = tileCenter(...def.patrol[0]);
  const waypoints = def.patrol.map(([tx, ty]) => tileCenter(tx, ty));
  return {
    id: index,
    x: start.x, y: start.y, radius: GUARD_RADIUS,
    facing: 0,
    waypoints, wp: 1, // next waypoint
    pause: 0, pauseFacing: 0, scanPhase: 0, // slow sector scan while waiting
    state: 'patrol', // patrol | suspicious | investigate | chase | search | return
    suspicion: 0,
    speed: def.speed ?? GUARD_PATROL_SPEED,
    range: def.range ?? CONE_RANGE,
    target: null, // {x, y} the guard is walking toward
    lookTimer: 0, // how long to stare at an investigate/search point
    unseenTimer: 0, // seconds since the player was last seen (alarm cooling)
    lastSeen: null,
    stepPhase: index * 2.1, // staggered footsteps
  };
}

function moveToward(guard, level, tx, ty, speed, dt) {
  const d = dist(guard.x, guard.y, tx, ty);
  if (d < 2) return true;
  const vx = (tx - guard.x) / d, vy = (ty - guard.y) / d;
  guard.facing = Math.atan2(vy, vx);
  guard.stepPhase += dt * 7;
  const nx = guard.x + vx * speed * dt;
  const ny = guard.y + vy * speed * dt;
  if (circleFree(level, nx, guard.y, guard.radius)) guard.x = nx;
  if (circleFree(level, guard.x, ny, guard.radius)) guard.y = ny;
  return dist(guard.x, guard.y, tx, ty) < 6;
}

function turnToward(guard, targetAngle, dt) {
  const diff = angleDiff(targetAngle, guard.facing);
  const turn = Math.max(-3.2 * dt, Math.min(3.2 * dt, diff));
  guard.facing += turn;
}

export function updateGuard(guard, level, player, dt, events) {
  const sees = playerInCone(level, guard, player.x, player.y);
  if (sees) {
    guard.suspicion = Math.min(ALARM_AT, guard.suspicion + spotRate(level, guard, player) * dt);
    guard.lastSeen = { x: player.x, y: player.y };
    guard.unseenTimer = 0;
  } else {
    guard.suspicion = Math.max(0, guard.suspicion - SUSPICION_DECAY * dt);
    guard.unseenTimer += dt;
  }

  switch (guard.state) {
    case 'patrol': {
      if (guard.suspicion >= ALARM_AT) { guard.state = 'chase'; events.alarm(guard); break; }
      if (guard.pause > 0) {
        guard.pause -= dt;
        guard.scanPhase += dt;
        // Sweep a sector around the pause facing instead of spinning.
        turnToward(guard, guard.pauseFacing + Math.sin(guard.scanPhase * 1.1) * 0.7, dt);
        break;
      }
      if (guard.suspicion >= SUSPICIOUS_AT) { guard.state = 'suspicious'; break; }
      const wp = guard.waypoints[guard.wp];
      if (moveToward(guard, level, wp.x, wp.y, guard.speed, dt)) {
        guard.wp = (guard.wp + 1) % guard.waypoints.length;
        guard.pause = 1.1; // look around at each corner — patrols can be learned
        guard.pauseFacing = guard.facing;
        guard.scanPhase = 0;
      }
      break;
    }
    case 'suspicious': {
      if (guard.suspicion >= ALARM_AT) { guard.state = 'chase'; events.alarm(guard); break; }
      if (guard.lastSeen) turnToward(guard, angleTo(guard.x, guard.y, guard.lastSeen.x, guard.lastSeen.y), dt);
      if (guard.suspicion < SUSPICIOUS_AT * 0.5) guard.state = 'patrol';
      break;
    }
    case 'investigate': {
      if (guard.suspicion >= ALARM_AT) { guard.state = 'chase'; events.alarm(guard); break; }
      if (!guard.target) { guard.state = 'patrol'; break; }
      if (moveToward(guard, level, guard.target.x, guard.target.y, GUARD_INVESTIGATE_SPEED, dt)) {
        guard.lookTimer -= dt;
        turnToward(guard, guard.facing + 1.4 * dt, dt);
        if (guard.lookTimer <= 0) { guard.state = 'return'; guard.target = null; }
      }
      break;
    }
    case 'chase': {
      const target = guard.lastSeen ?? { x: player.x, y: player.y };
      moveToward(guard, level, target.x, target.y, GUARD_CHASE_SPEED, dt);
      if (dist(guard.x, guard.y, player.x, player.y) < GUARD_CATCH_RADIUS + player.radius) {
        events.caught(guard);
      }
      if (guard.unseenTimer > ALARM_LOSE_SIGHT_AFTER) {
        guard.state = 'search';
        guard.lookTimer = SEARCH_TIME;
        events.lostTrail(guard);
      }
      break;
    }
    case 'search': {
      if (guard.suspicion >= ALARM_AT) { guard.state = 'chase'; break; }
      if (guard.lastSeen) {
        if (moveToward(guard, level, guard.lastSeen.x, guard.lastSeen.y, GUARD_INVESTIGATE_SPEED, dt)) {
          guard.lookTimer -= dt;
          turnToward(guard, guard.facing + 2.2 * dt, dt);
          if (guard.lookTimer <= 0) { guard.state = 'return'; }
        }
      } else guard.state = 'return';
      break;
    }
    case 'return': {
      if (guard.suspicion >= SUSPICIOUS_AT) { guard.state = 'suspicious'; break; }
      const wp = guard.waypoints[guard.wp];
      if (moveToward(guard, level, wp.x, wp.y, guard.speed, dt)) guard.state = 'patrol';
      break;
    }
  }
}

// A guard hears a noise (sprint) or a coin landing: nearest ones investigate.
export function sendToInvestigate(guard, point) {
  if (guard.state === 'chase') return; // an alarm beats a coin
  guard.state = 'investigate';
  guard.target = { x: point.x, y: point.y };
  guard.lookTimer = 2.2;
}

export function guardsHearingNoise(guards, px, py, radius) {
  return guards.filter((g) => g.state !== 'chase' && dist(g.x, g.y, px, py) < radius);
}
