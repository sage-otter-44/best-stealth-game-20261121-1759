// Rendering: everything the player sees, drawn on one 2D canvas.
// One job: floor, walls, cover, patrol paths, vision cones, actors, HUD, overlays.
import { TILE, VIEW_W, VIEW_H, GRID_W, GRID_H, ALARM_AT, SUSPICIOUS_AT } from './config.js';
import { tileCenter, isWallTile, isBushTile } from './levels.js';
import { conePolygon, dist } from './vision.js';
import { lurePosition } from './player.js';

const FLOOR_A = '#1b2130';
const FLOOR_B = '#171c29';
const WALL_FILL = '#2e3550';
const WALL_TOP = '#4a5578';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawFloor(ctx, level) {
  for (let ty = 0; ty < GRID_H; ty++) {
    for (let tx = 0; tx < GRID_W; tx++) {
      ctx.fillStyle = (tx + ty) % 2 === 0 ? FLOOR_A : FLOOR_B;
      ctx.fillRect(tx * TILE, ty * TILE, TILE, TILE);
    }
  }
  // Faint tile grid so distances read at a glance.
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= GRID_W; x++) { ctx.moveTo(x * TILE, 0); ctx.lineTo(x * TILE, VIEW_H); }
  for (let y = 0; y <= GRID_H; y++) { ctx.moveTo(0, y * TILE); ctx.lineTo(VIEW_W, y * TILE); }
  ctx.stroke();
  // Soft light pools so the floor is not flat black.
  const pools = [[320, 200], [960, 420], [640, 640], [1120, 160]];
  for (const [x, y] of pools) {
    const g = ctx.createRadialGradient(x, y, 10, x, y, 260);
    g.addColorStop(0, 'rgba(255,214,140,0.07)');
    g.addColorStop(1, 'rgba(255,214,140,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 260, y - 260, 520, 520);
  }
}

function drawWalls(ctx, level) {
  for (let ty = 0; ty < GRID_H; ty++) {
    for (let tx = 0; tx < GRID_W; tx++) {
      if (!isWallTile(level, tx, ty)) continue;
      const x = tx * TILE, y = ty * TILE;
      ctx.fillStyle = WALL_FILL;
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = WALL_TOP;
      ctx.fillRect(x, y, TILE, 5); // lit top edge — walls read as solid blocks
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(x, y + TILE - 6, TILE, 6);
    }
  }
}

function drawCover(ctx, level, time) {
  for (const [tx, ty] of level.crates) {
    const x = tx * TILE, y = ty * TILE;
    ctx.fillStyle = '#6b4a26';
    roundRect(ctx, x + 4, y + 4, TILE - 8, TILE - 8, 5);
    ctx.fill();
    ctx.strokeStyle = '#8a6136';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 4, y + TILE / 2); ctx.lineTo(x + TILE - 4, y + TILE / 2);
    ctx.moveTo(x + TILE / 2, y + 4); ctx.lineTo(x + TILE / 2, y + TILE - 4);
    ctx.stroke();
  }
  for (const [tx, ty] of level.bushes) {
    const cx = tx * TILE + TILE / 2, cy = ty * TILE + TILE / 2;
    ctx.fillStyle = '#1e4d2a';
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.5;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * 11, cy + Math.sin(a) * 11, 12, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#2c6b3a';
    ctx.beginPath(); ctx.arc(cx, cy, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath(); ctx.arc(cx - 4, cy - 5, 3, 0, Math.PI * 2); ctx.fill();
  }
}

function drawPatrolPaths(ctx, guards) {
  ctx.setLineDash([2, 9]);
  ctx.lineWidth = 2;
  for (const g of guards) {
    ctx.strokeStyle = 'rgba(255,120,90,0.4)';
    ctx.beginPath();
    g.waypoints.forEach((w, i) => { if (i === 0) ctx.moveTo(w.x, w.y); else ctx.lineTo(w.x, w.y); });
    ctx.closePath();
    ctx.stroke();
    for (const w of g.waypoints) {
      ctx.fillStyle = 'rgba(255,120,90,0.55)';
      ctx.beginPath(); ctx.arc(w.x, w.y, 3, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.setLineDash([]);
}

function coneColor(suspicion) {
  if (suspicion >= ALARM_AT) return 'rgba(255,60,50,0.42)';
  if (suspicion >= SUSPICIOUS_AT) return 'rgba(255,150,50,0.38)';
  return 'rgba(255,214,90,0.30)';
}

function drawCones(ctx, level, guards) {
  for (const g of guards) {
    const poly = conePolygon(level, g.x, g.y, g.facing, g.range);
    ctx.fillStyle = coneColor(g.suspicion);
    ctx.beginPath();
    poly.forEach((p, i) => { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,220,120,0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function drawObjective(ctx, game, time) {
  const lv = game.level;
  // Exit: glowing green door with an EXIT label and an arrow when locked.
  const e = tileCenter(...lv.exit);
  const pulse = 0.6 + 0.4 * Math.sin(time * 3);
  ctx.fillStyle = game.hasKeycard ? `rgba(60,255,140,${0.5 + 0.3 * pulse})` : 'rgba(90,110,90,0.8)';
  roundRect(ctx, e.x - 17, e.y - 17, 34, 34, 6);
  ctx.fill();
  ctx.fillStyle = '#062b14';
  ctx.font = 'bold 13px monospace';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(game.hasKeycard ? 'EXIT' : 'LOCK', e.x, e.y);
  if (!game.hasKeycard) {
    // Label sits above the door: the exit lives on the bottom row, where a
    // label underneath would collide with the HUD bar.
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = '11px monospace';
    ctx.fillText('needs keycard', e.x, e.y - 28);
  }
  // Keycard: gold card, bobbing.
  if (!game.hasKeycard) {
    const k = tileCenter(...lv.keycard);
    const bob = Math.sin(time * 2.5) * 3;
    ctx.save();
    ctx.translate(k.x, k.y + bob);
    ctx.rotate(Math.sin(time * 1.5) * 0.15);
    ctx.fillStyle = '#ffd34d';
    roundRect(ctx, -11, -7, 22, 14, 3); ctx.fill();
    ctx.fillStyle = '#7a5b00';
    ctx.fillRect(-7, -3, 8, 3);
    ctx.restore();
    ctx.fillStyle = '#ffd34d';
    ctx.font = '11px monospace';
    ctx.fillText('KEYCARD', k.x, k.y + 24);
  }
  // Cores: glowing cyan diamonds.
  lv.cores.forEach(([tx, ty], i) => {
    if (game.coresGot.has(i)) return;
    const c = tileCenter(tx, ty);
    const glow = 0.5 + 0.5 * Math.sin(time * 4 + i * 2);
    ctx.fillStyle = `rgba(80,220,255,${0.5 + 0.4 * glow})`;
    ctx.beginPath();
    ctx.moveTo(c.x, c.y - 11); ctx.lineTo(c.x + 8, c.y); ctx.lineTo(c.x, c.y + 11); ctx.lineTo(c.x - 8, c.y);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e8fbff';
    ctx.beginPath();
    ctx.moveTo(c.x, c.y - 5); ctx.lineTo(c.x + 4, c.y); ctx.lineTo(c.x, c.y + 5); ctx.lineTo(c.x - 4, c.y);
    ctx.closePath(); ctx.fill();
  });
}

function drawGuard(ctx, g, time) {
  const alarming = g.suspicion >= ALARM_AT;
  const suspicious = g.suspicion >= SUSPICIOUS_AT && !alarming;
  // Body: red uniform, darker ring when calm.
  ctx.fillStyle = alarming ? '#ff3b30' : '#d63a2f';
  ctx.beginPath(); ctx.arc(g.x, g.y, g.radius, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#7d1a12';
  ctx.beginPath(); ctx.arc(g.x, g.y, g.radius - 5, 0, Math.PI * 2); ctx.fill();
  // Facing wedge (nose) so direction reads instantly.
  const fx = g.x + Math.cos(g.facing) * (g.radius + 3);
  const fy = g.y + Math.sin(g.facing) * (g.radius + 3);
  ctx.fillStyle = '#ffe9c9';
  ctx.beginPath(); ctx.arc(fx, fy, 4, 0, Math.PI * 2); ctx.fill();
  // Eyes: two dots perpendicular to facing.
  const px = Math.cos(g.facing + Math.PI / 2) * 5, py = Math.sin(g.facing + Math.PI / 2) * 5;
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(g.x + px * 0.6 - Math.cos(g.facing) * 2, g.y + py * 0.6 - Math.sin(g.facing) * 2, 2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(g.x - px * 0.6 - Math.cos(g.facing) * 2, g.y - py * 0.6 - Math.sin(g.facing) * 2, 2, 0, Math.PI * 2); ctx.fill();
  // Suspicion arc above the head.
  if (g.suspicion > 2) {
    const frac = g.suspicion / ALARM_AT;
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(g.x, g.y - 24, 10, -Math.PI / 2, Math.PI * 1.5); ctx.stroke();
    ctx.strokeStyle = alarming ? '#ff3b30' : suspicious ? '#ff9a2e' : '#ffd65a';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(g.x, g.y - 24, 10, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2); ctx.stroke();
  }
  // State mark: ? while suspicious, ! while chasing.
  ctx.font = 'bold 20px monospace';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (alarming) { ctx.fillStyle = '#ff3b30'; ctx.fillText('!', g.x, g.y - 42); }
  else if (suspicious) { ctx.fillStyle = '#ff9a2e'; ctx.fillText('?', g.x, g.y - 42); }
  else if (g.state === 'investigate') { ctx.fillStyle = '#ffd65a'; ctx.fillText('…', g.x, g.y - 42); }
}

function drawPlayer(ctx, p, time) {
  const bob = p.moving ? Math.sin(p.stepPhase) * 2 : 0;
  // Soft light pool around the thief: lighting that shows what is safe.
  const light = ctx.createRadialGradient(p.x, p.y, 10, p.x, p.y, 150);
  light.addColorStop(0, 'rgba(120,220,255,0.10)');
  light.addColorStop(1, 'rgba(120,220,255,0)');
  ctx.fillStyle = light;
  ctx.fillRect(p.x - 150, p.y - 150, 300, 300);
  // Sprint noise ring: guards inside it hear you.
  if (p.noiseRadius > 0) {
    ctx.strokeStyle = `rgba(255,80,60,${0.35 + 0.2 * Math.sin(time * 8)})`;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.noiseRadius * (0.85 + 0.15 * Math.sin(time * 6)), 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,80,60,0.85)';
    ctx.font = '11px monospace';
    ctx.fillText('NOISY!', p.x, p.y - 28);
  }
  // Body: cyan hooded thief; crouched (smaller) while sneaking.
  const r = p.sneaking ? p.radius - 3 : p.radius;
  ctx.fillStyle = '#22d3ee';
  ctx.beginPath(); ctx.arc(p.x, p.y + bob * 0.4, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#0e7490';
  ctx.beginPath(); ctx.arc(p.x, p.y + bob * 0.4, r - 5, 0, Math.PI * 2); ctx.fill();
  // Facing tick.
  const fx = p.x + Math.cos(p.facing) * (r + 4);
  const fy = p.y + Math.sin(p.facing) * (r + 4);
  ctx.fillStyle = '#e0faff';
  ctx.beginPath(); ctx.arc(fx, fy, 3.5, 0, Math.PI * 2); ctx.fill();
  // Hidden marker: in cover you are hard to see.
  if (p.hidden) {
    ctx.fillStyle = 'rgba(60,255,140,0.9)';
    ctx.font = 'bold 11px monospace';
    ctx.fillText('HIDDEN', p.x, p.y - 26);
  }
  // Flying coin lure.
  if (p.lure) {
    const pos = lurePosition(p);
    ctx.fillStyle = '#ffd34d';
    ctx.beginPath(); ctx.arc(pos.x, pos.y, 6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ffd34d';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(pos.x, pos.y); ctx.stroke();
    ctx.setLineDash([]);
  }
}

function drawVignette(ctx) {
  const g = ctx.createRadialGradient(640, 400, 320, 640, 400, 760);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

export function drawWorld(ctx, game, time) {
  drawFloor(ctx, game.level);
  drawPatrolPaths(ctx, game.guards);
  drawWalls(ctx, game.level);
  drawCover(ctx, game.level, time);
  drawObjective(ctx, game, time);
  drawCones(ctx, game.level, game.guards);
  for (const g of game.guards) drawGuard(ctx, g, time);
  drawPlayer(ctx, game.player, time);
  drawVignette(ctx);
}

function chip(ctx, x, y, label, value, ok) {
  ctx.font = 'bold 13px monospace';
  const w = ctx.measureText(label + ' ' + value).width + 22;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  roundRect(ctx, x, y, w, 26, 13); ctx.fill();
  ctx.fillStyle = ok === false ? '#ff8a7a' : ok === true ? '#7dffb0' : '#dfe6f5';
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(label + ' ' + value, x + 11, y + 14);
  return x + w + 8;
}

export function drawHUD(ctx, game) {
  // Top bar.
  ctx.fillStyle = 'rgba(6,8,16,0.82)';
  ctx.fillRect(0, 0, VIEW_W, 44);
  ctx.fillStyle = '#ffd65a';
  ctx.font = 'bold 15px monospace';
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText('SHADOW VAULT', 14, 23);
  ctx.fillStyle = '#9fb0d0';
  ctx.font = '13px monospace';
  ctx.fillText(game.level.name, 168, 23);

  let x = 400;
  x = chip(ctx, x, 9, 'KEYCARD', game.hasKeycard ? '✓' : '○', game.hasKeycard);
  x = chip(ctx, x, 9, 'CORES', `${game.coresGot.size}/3`, game.coresGot.size === 3);
  x = chip(ctx, x, 9, 'EXIT', game.hasKeycard ? 'OPEN' : 'LOCKED', game.hasKeycard);
  x = chip(ctx, x, 9, 'COINS', `${game.player.luresLeft}`, game.player.luresLeft > 0);
  x = chip(ctx, x, 9, 'TIME', fmtTime(game.time), null);
  chip(ctx, x, 9, 'SCORE', `${game.score}`, null);

  // Alert meter: the game's loudest suspicion, right side.
  const alert = game.alert;
  const ax = VIEW_W - 250, ay = 12, aw = 236, ah = 20;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  roundRect(ctx, ax, ay, aw, ah, 10); ctx.fill();
  const frac = alert / ALARM_AT;
  ctx.fillStyle = frac >= 1 ? '#ff3b30' : frac >= SUSPICIOUS_AT / ALARM_AT ? '#ff9a2e' : '#ffd65a';
  if (frac > 0.01) { roundRect(ctx, ax + 2, ay + 2, (aw - 4) * frac, ah - 4, 8); ctx.fill(); }
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(alert >= ALARM_AT ? '!! ALARM !!' : alert >= SUSPICIOUS_AT ? 'SUSPICIOUS' : 'UNSEEN', ax + aw / 2, ay + ah / 2 + 1);
  ctx.textAlign = 'left';

  // Bottom bar: controls + objective reminder.
  ctx.fillStyle = 'rgba(6,8,16,0.82)';
  ctx.fillRect(0, VIEW_H - 30, VIEW_W, 30);
  ctx.fillStyle = '#9fb0d0';
  ctx.font = '12px monospace';
  ctx.fillText('WASD move · SHIFT sneak · SPACE sprint · CLICK coin lure · M mute · P pause', 14, VIEW_H - 14);
  ctx.textAlign = 'right';
  ctx.fillText(game.level.briefing, VIEW_W - 14, VIEW_H - 14);
  ctx.textAlign = 'left';

  // Flash message (SPOTTED!, LEVEL CLEAR, …).
  if (game.flash && game.flashTimer > 0) {
    ctx.fillStyle = game.flashColor;
    ctx.font = 'bold 34px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(game.flash, VIEW_W / 2, 96);
    ctx.textAlign = 'left';
  }
}

export function fmtTime(t) {
  const m = Math.floor(t / 60), s = Math.floor(t % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function overlayPanel(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(4,6,12,0.78)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = accent;
  ctx.font = 'bold 44px monospace';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(title, VIEW_W / 2, 250);
  ctx.fillStyle = '#dfe6f5';
  ctx.font = '17px monospace';
  lines.forEach((line, i) => ctx.fillText(line, VIEW_W / 2, 320 + i * 30));
  ctx.textAlign = 'left';
}

export function drawOverlay(ctx, game) {
  if (game.state === 'menu') {
    ctx.fillStyle = 'rgba(4,6,12,0.72)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffd65a';
    ctx.font = 'bold 52px monospace';
    ctx.fillText('SHADOW VAULT', VIEW_W / 2, 210);
    ctx.fillStyle = '#22d3ee';
    ctx.font = 'bold 19px monospace';
    ctx.fillText('5 LEVELS · 14 GUARDS · 6 STEALTH MECHANICS', VIEW_W / 2, 262);
    ctx.fillStyle = '#dfe6f5';
    ctx.font = '16px monospace';
    ctx.fillText('Lift the keycard. Slip past the patrols. Reach the exit unseen.', VIEW_W / 2, 320);
    ctx.fillText('Hide in bushes and behind crates. Sprint and they hear you.', VIEW_W / 2, 348);
    ctx.fillText('Click to throw a coin and pull a guard away. Get caught and it is over.', VIEW_W / 2, 376);
    ctx.fillStyle = '#7dffb0';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('PRESS ANY KEY TO BEGIN', VIEW_W / 2, 448);
    ctx.fillStyle = '#9fb0d0';
    ctx.font = '13px monospace';
    ctx.fillText('WASD move · SHIFT sneak · SPACE sprint · CLICK coin lure · M mute · P pause', VIEW_W / 2, 500);
    ctx.textAlign = 'left';
  } else if (game.state === 'clear') {
    overlayPanel(ctx, 'LEVEL CLEAR', [
      `Time ${fmtTime(game.levelTime)}  ·  Cores ${game.coresGot.size}/3  ·  Score ${game.score}`,
      game.levelSpotted ? 'Spotted once — the unseen bonus is gone.' : `Unseen bonus +${500}`,
      'Press ENTER for the next level',
    ], '#7dffb0');
  } else if (game.state === 'caught') {
    overlayPanel(ctx, 'CAUGHT!', [
      `A guard grabbed you on ${game.level.name}.`,
      `Score ${game.score}  ·  Detections so far ${game.detections}`,
      'Press R to retry the level',
    ], '#ff3b30');
  } else if (game.state === 'victory') {
    overlayPanel(ctx, 'ALL 5 VAULTS CLEANED', [
      `Final score ${game.score}  ·  Total time ${fmtTime(game.time)}`,
      `Detections ${game.detections}  ·  Cores ${game.totalCores}/15`,
      game.detections === 0 ? 'A perfect ghost run — never spotted once.' : 'Press R to run it again',
    ], '#ffd65a');
  } else if (game.state === 'paused') {
    overlayPanel(ctx, 'PAUSED', ['Press P to keep sneaking'], '#9fb0d0');
  }
}
