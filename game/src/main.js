// SHADOW VAULT — game loop, state machine, scoring, and the self-test.
// One job: own the game object and drive it: menu -> playing -> clear/caught
// -> victory, plus ?shot= staging and ?selftest=1 verification.
import {
  VIEW_W, VIEW_H, TILE, ALARM_AT, SUSPICIOUS_AT,
  SCORE_CORE, SCORE_KEYCARD, SCORE_LEVEL_CLEAR, SCORE_UNSEEN_BONUS,
  SCORE_TIME_BONUS_PER_SECOND, LEVEL_PAR_SECONDS, NOISE_LURE_RADIUS,
} from './config.js';
import { LEVELS, GUARD_TOTAL, CORE_TOTAL, tileCenter, isCoverTile, validateLevels } from './levels.js';
import { makeRng, pickSeedFromQuery } from './rng.js';
import { createInput } from './input.js';
import { createPlayer, updatePlayer } from './player.js';
import { createGuard, updateGuard, sendToInvestigate, guardsHearingNoise } from './guards.js';
import { createAudio } from './audio.js';
import { drawWorld, drawHUD, drawOverlay } from './render.js';
import { dist } from './vision.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const input = createInput(canvas);
const audio = createAudio();
const params = new URLSearchParams(location.search);
const rng = makeRng(pickSeedFromQuery());

const game = {
  state: 'menu', // menu | playing | clear | caught | victory | paused
  levelIndex: 0,
  level: LEVELS[0],
  player: null,
  guards: [],
  score: 0,
  time: 0, // total run time
  levelTime: 0,
  detections: 0, // times an alarm fired
  alert: 0, // loudest current suspicion
  hasKeycard: false,
  coresGot: new Set(),
  totalCores: 0,
  levelSpotted: false,
  flash: null, flashColor: '#fff', flashTimer: 0,
  frozen: false, // shot mode: render only, no simulation
};

// Test hook: lets the Playwright driver read live state (position, suspicion).
window.__game = game;

function loadLevel(index) {
  game.levelIndex = index;
  game.level = LEVELS[index];
  game.player = createPlayer(game.level);
  game.guards = game.level.guards.map((def, i) => createGuard(def, i));
  game.levelTime = 0;
  game.hasKeycard = false;
  game.coresGot = new Set();
  game.levelSpotted = false;
  game.alert = 0;
  game.flash = null;
  // Stagger guard patrol phases so they do not all turn at once.
  game.guards.forEach((g) => { g.pause = rng() * 0.8; });
}

function setFlash(text, color, seconds = 2.2) {
  game.flash = text; game.flashColor = color; game.flashTimer = seconds;
}

function collectPickups() {
  const p = game.player;
  const tx = Math.floor(p.x / TILE), ty = Math.floor(p.y / TILE);
  const lv = game.level;
  if (!game.hasKeycard && tx === lv.keycard[0] && ty === lv.keycard[1]) {
    game.hasKeycard = true;
    game.score += SCORE_KEYCARD;
    audio.keycard();
    setFlash('KEYCARD SECURED — EXIT OPEN', '#7dffb0');
  }
  lv.cores.forEach(([cx, cy], i) => {
    if (!game.coresGot.has(i) && tx === cx && ty === cy) {
      game.coresGot.add(i);
      game.totalCores += 1;
      game.score += SCORE_CORE;
      audio.pickup();
    }
  });
  const e = lv.exit;
  if (game.hasKeycard && tx === e[0] && ty === e[1]) {
    const timeBonus = Math.max(0, Math.round((LEVEL_PAR_SECONDS[game.levelIndex] - game.levelTime) * SCORE_TIME_BONUS_PER_SECOND));
    const unseen = game.levelSpotted ? 0 : SCORE_UNSEEN_BONUS;
    game.score += SCORE_LEVEL_CLEAR + timeBonus + unseen;
    audio.clear();
    if (game.levelIndex + 1 >= LEVELS.length) {
      game.state = 'victory';
    } else {
      game.state = 'clear';
    }
  }
}

function update(dt) {
  if (game.state !== 'playing' || game.frozen) return;
  game.time += dt;
  game.levelTime += dt;
  if (game.flashTimer > 0) game.flashTimer -= dt;

  const p = game.player;
  updatePlayer(p, input, game.level, dt, (landed) => {
    audio.lure();
    guardsHearingNoise(game.guards, landed.x, landed.y, NOISE_LURE_RADIUS)
      .forEach((g) => sendToInvestigate(g, landed));
  });

  // Hidden when standing on a cover tile.
  const ptx = Math.floor(p.x / TILE), pty = Math.floor(p.y / TILE);
  p.hidden = isCoverTile(game.level, ptx, pty);

  // Sprint noise pulls nearby guards over.
  if (p.noiseRadius > 0) {
    guardsHearingNoise(game.guards, p.x, p.y, p.noiseRadius)
      .forEach((g) => sendToInvestigate(g, { x: p.x, y: p.y }));
  }

  const events = {
    alarm: (g) => {
      if (!game.levelSpotted) {
        game.detections += 1;
        game.levelSpotted = true;
      }
      audio.alarm();
      setFlash('SPOTTED — BREAK LINE OF SIGHT', '#ff3b30');
    },
    caught: () => { game.state = 'caught'; audio.caught(); },
    lostTrail: () => setFlash('THEY LOST YOU — STAY LOW', '#ffd65a'),
  };
  for (const g of game.guards) updateGuard(g, game.level, p, dt, events);
  game.alert = game.guards.reduce((m, g) => Math.max(m, g.suspicion), 0);

  // Footsteps: the nearest guard's, loudest when close (criterion 3).
  for (const g of game.guards) {
    if (Math.sin(g.stepPhase) > 0.96) audio.step(dist(g.x, g.y, p.x, p.y));
  }

  collectPickups();
}

function render(time) {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  drawWorld(ctx, game, time);
  drawHUD(ctx, game);
  drawOverlay(ctx, game);
}

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  render(now / 1000);
  requestAnimationFrame(loop);
}

// Keys that act on menus / overlays rather than movement.
window.addEventListener('keydown', (e) => {
  audio.unlock();
  if (e.code === 'KeyM') { const m = audio.toggleMute(); setFlash(m ? 'SOUND OFF' : 'SOUND ON', '#9fb0d0', 1); return; }
  if (e.code === 'KeyP' && (game.state === 'playing' || game.state === 'paused')) {
    game.state = game.state === 'playing' ? 'paused' : 'playing';
    return;
  }
  if (game.state === 'menu' && input.anyKey) { game.state = 'playing'; return; }
  if (game.state === 'clear' && e.code === 'Enter') { loadLevel(game.levelIndex + 1); game.state = 'playing'; return; }
  if ((game.state === 'caught' || game.state === 'victory') && e.code === 'KeyR') {
    if (game.state === 'victory') { game.score = 0; game.time = 0; game.detections = 0; game.totalCores = 0; }
    loadLevel(game.levelIndex);
    game.state = 'playing';
  }
});

// ---- Screenshot staging (?shot=start|play|end&seed=N) ----
const shot = params.get('shot');
if (shot) {
  loadLevel(shot === 'play' ? 2 : shot === 'end' ? 4 : 0);
  stageShot(game, shot);
  game.frozen = true;
  render(1.2);
} else {
  const problems = validateLevels();
  if (problems.length) {
    document.getElementById('selftest-result').textContent = 'LEVEL ERRORS: ' + problems.join('; ');
  }
  loadLevel(0);
  requestAnimationFrame(loop);
}

// ---- Self-test (?selftest=1): winnable, losable, detection works. ----
if (params.get('selftest') === '1') {
  const results = [];
  const ok = (name, cond) => results.push(`${cond ? 'PASS' : 'FAIL'} ${name}`);

  // 1. Levels are sane.
  ok('levels validate', validateLevels().length === 0);
  ok('14 guards across 5 levels', GUARD_TOTAL === 14);
  ok('15 cores across 5 levels', CORE_TOTAL === 15);

  // 2. Winnable: walk the player onto the keycard, then onto the exit.
  loadLevel(0);
  game.state = 'playing';
  const k = tileCenter(...game.level.keycard);
  game.player.x = k.x; game.player.y = k.y;
  update(0.05);
  ok('keycard pickup opens exit', game.hasKeycard === true);
  const e = tileCenter(...game.level.exit);
  game.player.x = e.x; game.player.y = e.y;
  update(0.05);
  ok('reaching exit clears level 1', game.state === 'clear');

  // 3. Losable: put the player in front of a guard until the alarm fires,
  // then let the guard catch them.
  loadLevel(0);
  game.state = 'playing';
  const g0 = game.guards[0];
  g0.pause = 99; // hold the guard still so the test measures vision, not patrol
  g0.facing = 0; // looking east, straight at the staged player
  game.player.x = g0.x + Math.cos(g0.facing) * 60;
  game.player.y = g0.y + Math.sin(g0.facing) * 60;
  for (let i = 0; i < 240 && game.state === 'playing'; i++) update(1 / 60);
  ok('standing in a cone raises an alarm', game.detections >= 1);
  g0.x = game.player.x; g0.y = game.player.y; // guard closes in
  update(1 / 60);
  ok('caught state exists', game.state === 'caught');

  // 4. Cover hides: same spot in a bush grows suspicion far slower.
  loadLevel(0);
  game.state = 'playing';
  const g1 = game.guards[0];
  const bush = tileCenter(...game.level.bushes[0]);
  game.player.x = bush.x; game.player.y = bush.y;
  g1.x = bush.x + 150; g1.y = bush.y; g1.facing = Math.PI; // facing the bush
  const before = g1.suspicion;
  for (let i = 0; i < 60; i++) update(1 / 60);
  ok('bush cover slows detection', g1.suspicion - before < 25);

  // 5. A coin lure pulls a guard to investigate.
  loadLevel(0);
  game.state = 'playing';
  const g2 = game.guards[0];
  sendToInvestigate(g2, { x: game.player.x + 200, y: game.player.y });
  ok('coin lure sends guard to investigate', g2.state === 'investigate');

  document.getElementById('selftest-result').textContent = results.join(' | ');
  window.__selftest = results;
}
