// Input: keyboard + mouse, nothing else. One job: turn browser events into a
// small state object the game loop reads (move vector, sneak, sprint, clicks).
export function createInput(canvas) {
  const keys = new Set();
  const state = {
    moveX: 0, moveY: 0,
    sneak: false, sprint: false,
    click: null, // {x, y} in canvas coords, consumed by the game loop
    anyKey: false,
  };

  const KEYMAP = {
    KeyW: 'up', ArrowUp: 'up',
    KeyS: 'down', ArrowDown: 'down',
    KeyA: 'left', ArrowLeft: 'left',
    KeyD: 'right', ArrowRight: 'right',
  };

  function recompute() {
    let x = 0, y = 0;
    if (keys.has('left')) x -= 1;
    if (keys.has('right')) x += 1;
    if (keys.has('up')) y -= 1;
    if (keys.has('down')) y += 1;
    if (x !== 0 && y !== 0) { x *= Math.SQRT1_2; y *= Math.SQRT1_2; }
    state.moveX = x; state.moveY = y;
    state.sneak = keys.has('ShiftLeft') || keys.has('ShiftRight');
    state.sprint = keys.has('Space');
  }

  window.addEventListener('keydown', (e) => {
    if (e.code in KEYMAP) { keys.add(KEYMAP[e.code]); e.preventDefault(); }
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') keys.add(e.code);
    if (e.code === 'Space') { keys.add('Space'); e.preventDefault(); }
    state.anyKey = true;
    recompute();
  });
  window.addEventListener('keyup', (e) => {
    if (e.code in KEYMAP) keys.delete(KEYMAP[e.code]);
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') keys.delete(e.code);
    if (e.code === 'Space') keys.delete('Space');
    recompute();
  });
  window.addEventListener('blur', () => { keys.clear(); recompute(); });

  canvas.addEventListener('mousedown', (e) => {
    const r = canvas.getBoundingClientRect();
    const sx = canvas.width / r.width, sy = canvas.height / r.height;
    state.click = { x: (e.clientX - r.left) * sx, y: (e.clientY - r.top) * sy };
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  return state;
}
