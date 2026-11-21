// Sound, all synthesized with WebAudio — no audio files, no network.
// One job: footsteps that tell you where a guard is, plus pickup/alarm stings.
export function createAudio() {
  let ctx = null;
  let muted = false;
  const api = {
    unlock() {
      if (!ctx) {
        try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { ctx = null; }
      }
      if (ctx && ctx.state === 'suspended') void ctx.resume();
    },
    toggleMute() { muted = !muted; return muted; },
    get muted() { return muted; },
  };

  function tone(freq, dur, type, vol, when = 0) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type; osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(t0); osc.stop(t0 + dur + 0.02);
  }

  // A footstep tick; volume falls with distance so you hear guards approach.
  api.step = (distancePx) => {
    const vol = Math.max(0, 0.14 * (1 - distancePx / 420));
    if (vol > 0.01) tone(150 + Math.random() * 40, 0.05, 'triangle', vol);
  };
  api.pickup = () => { tone(880, 0.09, 'sine', 0.16); tone(1318, 0.12, 'sine', 0.14, 0.07); };
  api.keycard = () => { tone(660, 0.1, 'sine', 0.16); tone(990, 0.1, 'sine', 0.16, 0.09); tone(1320, 0.16, 'sine', 0.16, 0.18); };
  api.alarm = () => { tone(220, 0.22, 'sawtooth', 0.12); tone(311, 0.22, 'sawtooth', 0.12, 0.2); };
  api.caught = () => { tone(196, 0.3, 'sawtooth', 0.16); tone(147, 0.5, 'sawtooth', 0.16, 0.25); };
  api.clear = () => { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.14, 'sine', 0.15, i * 0.09)); };
  api.lure = () => tone(1567, 0.06, 'sine', 0.12);
  return api;
}
