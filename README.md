# SHADOW VAULT — 5 Levels · 14 Guards · 6 Stealth Mechanics

[![make.fun](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/sage-otter-44/best-stealth-game-20261121-1759/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/sage-otter-44/best-stealth-game-20261121-1759/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

A complete top-down stealth game for the [make.fun best stealth game bounty](https://make.fun/bounty/best-stealth-game-20261121-1759). Runs in a desktop browser from static files — no network request, no build step.

## The game

You are a thief in a five-wing vault complex. Every level: lift the **keycard**, dodge the patrols, grab the **3 data cores** if you dare, and reach the **green exit unseen**.

- **5 levels** — The Gallery, The Archive, Vault Floor, Server Hall, The Director's Wing
- **14 guards** on learnable patrol routes (dotted paths on the floor), pausing to scan at every corner
- **6 stealth mechanics**
  1. **Vision cones** — raycast against walls, so cover really blocks sight; cones turn orange, then red, as suspicion grows
  2. **Cover** — hide in bushes and behind crates; even in cover, a guard right on top of you sees you
  3. **Noise** — sprinting is fast and loud (the red ring is your noise radius); guards come to investigate
  4. **Suspicion + alarm** — a meter fills while you are seen, decays while you are not; at 100% the guards chase, and if one catches you, the level is over. Break line of sight and they lose the trail
  5. **Coin lure** — click anywhere to throw a coin (3 per level) and pull the nearest guard away
  6. **Sneak** — hold Shift to move slow and quiet; footsteps tell you where guards are (WebAudio, synthesized, no files)

Scoring: cores +250, keycard +150, level clear +1000, unseen bonus +500, time bonus under par. Finish all five wings for the ghost-run verdict.

## Controls

| Input | Action |
|---|---|
| WASD / arrow keys | Move |
| Shift | Sneak (slow, quiet, harder to spot) |
| Space | Sprint (fast, loud — guards hear it) |
| Mouse click | Throw a coin lure |
| P | Pause · M | Mute |

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

## Hand in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, standard library only) copies `game/` and `screenshots/` to `/output` and writes `/output/dossier.json` with the kit's `vendor/makefun-game.ts`.

## Layout

- `game/index.html` — canvas shell, 1280×800
- `game/src/main.js` — game loop, state machine, scoring, self-test (`?selftest=1`)
- `game/src/levels.js` — the 5 levels: walls, cover, patrols, pickups
- `game/src/guards.js` — guard AI: patrol / suspicious / investigate / chase / search / return
- `game/src/vision.js` — line of sight, raycast vision cones, detection rates
- `game/src/player.js` — movement, stance, noise, coin lure
- `game/src/render.js` — all canvas drawing: floor, cones, actors, HUD, overlays
- `game/src/input.js` — keyboard + mouse
- `game/src/audio.js` — synthesized WebAudio footsteps and stings
- `game/src/config.js` — tuning constants · `game/src/rng.js` — seeded RNG
- `game/src/shots.js` — deterministic staging for the three screenshots

## Screenshots

`1-start.jpg` — level 1 at the start, patrols mid-route. `2-play.jpg` — level 3 mid-stealth: crouched in cover, a cone brushing past, alert half up. `3-end.jpg` — all five vaults cleaned.

## License

MIT — see [LICENSE](LICENSE).
