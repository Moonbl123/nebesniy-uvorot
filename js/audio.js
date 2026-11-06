'use strict';

const Sound = (() => {
  let ctx = null;
  let muted = localStorage.getItem('nu_muted') === '1';

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (muted) return;
    const ac = ensure();
    if (!ac) return;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    const t = ac.currentTime;
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(ac.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  return {
    click()   { tone(520, 0.08, 'square', 0.12); },
    catchStar() { tone(880, 0.12, 'sine', 0.18, 1320); },
    shieldUp()  { tone(440, 0.25, 'triangle', 0.2, 880); },
    shieldHit() { tone(300, 0.2, 'sawtooth', 0.2, 120); },
    hit()     { tone(180, 0.4, 'sawtooth', 0.25, 40); },
    gameOver(){ tone(320, 0.6, 'triangle', 0.22, 90); },
    isMuted() { return muted; },
    toggleMute() {
      muted = !muted;
      localStorage.setItem('nu_muted', muted ? '1' : '0');
      return muted;
    }
  };
})();
