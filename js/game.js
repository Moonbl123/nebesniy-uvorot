'use strict';

const Game = (() => {
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');

  let W = 0, H = 0, scale = 1;

  // ---------- Состояние ----------

  const state = {
    screen: 'menu',        // menu | playing | paused | over
    score: 0,
    time: 0,
    spawnTimer: 0,
    shake: 0,
    flash: 0,
    overTimer: 0
  };

  const player = {
    x: 0, y: 0, vx: 0,
    r: 22,
    shield: false,
    alive: true,
    tilt: 0
  };

  let objects = [];    // падающие: {type,x,y,r,vy,rot,vr}
  let particles = [];  // {x,y,vx,vy,life,maxLife,color,size}
  let clouds = [];
  let starsBg = [];

  const keys = { left: false, right: false };
  let pointerX = null;

  // ---------- Инициализация и ресайз ----------

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    scale = Math.max(0.6, Math.min(W, H) / 500);
    player.r = 22 * scale;
    player.y = H - Math.max(70 * scale, H * 0.1);
    player.x = Math.min(Math.max(player.x || W / 2, player.r), W - player.r);
    initBackground();
  }

  function initBackground() {
    starsBg = [];
    const count = Math.floor((W * H) / 9000);
    for (let i = 0; i < count; i++) {
      starsBg.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 1.6 + 0.4,
        speed: Math.random() * 12 + 6
      });
    }
    clouds = [];
    for (let i = 0; i < 5; i++) {
      clouds.push({
        x: Math.random() * W,
        y: Math.random() * H * 0.5,
        w: (80 + Math.random() * 120) * scale,
        speed: 8 + Math.random() * 14,
        alpha: 0.05 + Math.random() * 0.06
      });
    }
  }

  // ---------- Ввод ----------

  function onKey(e, isDown) {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = isDown;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = isDown;
    if (isDown && (e.code === 'Space' || e.code === 'Enter')) {
      if (state.screen === 'menu') start();
      else if (state.screen === 'over') start();
    }
    if (isDown && (e.code === 'Escape' || e.code === 'KeyP')) {
      if (state.screen === 'playing') pause();
      else if (state.screen === 'paused') resume();
    }
    if (['ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  }

  function pointerPos(e) {
    const t = e.touches ? e.touches[0] : e;
    return t ? t.clientX : null;
  }

  function bindInput() {
    window.addEventListener('keydown', e => onKey(e, true));
    window.addEventListener('keyup', e => onKey(e, false));

    canvas.addEventListener('mousemove', e => { pointerX = pointerPos(e); });
    canvas.addEventListener('touchstart', e => { pointerX = pointerPos(e); e.preventDefault(); }, { passive: false });
    canvas.addEventListener('touchmove', e => { pointerX = pointerPos(e); e.preventDefault(); }, { passive: false });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden && state.screen === 'playing') pause(true);
    });
    window.addEventListener('blur', () => {
      if (state.screen === 'playing') pause(true);
    });
    window.addEventListener('resize', resize);
  }

  // ---------- Спавн ----------

  function difficulty() {
    // t — секунды выживания, возвращает {interval, speed}
    const t = state.time;
    return {
      interval: Math.max(0.32, 0.95 - t * 0.018),
      speed: (150 + Math.min(t * 9, 420)) * scale
    };
  }

  function spawn() {
    const margin = 30 * scale;
    const x = margin + Math.random() * (W - margin * 2);
    const roll = Math.random();
    let type = 'rock';
    if (roll > 0.72) type = 'star';
    if (roll > 0.955 && !player.shield) type = 'shield';

    const r = (type === 'rock' ? 16 + Math.random() * 14 : 14) * scale;
    objects.push({
      type, x, y: -r - 10,
      r,
      vy: difficulty().speed * (type === 'rock' ? 0.9 + Math.random() * 0.35 : 0.75),
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 3
    });
  }

  function explode(x, y, color, n, power) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = (40 + Math.random() * power) * scale;
      particles.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 0,
        maxLife: 0.5 + Math.random() * 0.5,
        color,
        size: (2 + Math.random() * 3.5) * scale
      });
    }
  }

  // ---------- Игровой цикл ----------

  let lastTs = 0;

  function loop(ts) {
    requestAnimationFrame(loop);
    let dt = (ts - lastTs) / 1000;
    lastTs = ts;
    if (dt > 0.05) dt = 0.05;

    if (state.screen === 'playing') update(dt);
    render(dt);
  }

  function update(dt) {
    state.time += dt;
    state.score += dt * 10;
    state.shake = Math.max(0, state.shake - dt * 30);
    state.flash = Math.max(0, state.flash - dt * 3);

    // Движение игрока
    const speed = 420 * scale;
    if (keys.left) { player.vx = -speed; pointerX = null; }
    else if (keys.right) { player.vx = speed; pointerX = null; }
    else if (pointerX !== null) {
      const dx = pointerX - player.x;
      player.vx = Math.abs(dx) > 4 ? dx * 14 : 0;
    } else {
      player.vx *= 0.86;
    }
    player.x += player.vx * dt;
    player.x = Math.min(Math.max(player.x, player.r), W - player.r);
    player.tilt += ((player.vx / speed) * 0.35 - player.tilt) * 0.2;

    // Спавн объектов
    state.spawnTimer += dt;
    if (state.spawnTimer >= difficulty().interval) {
      state.spawnTimer = 0;
      spawn();
    }

    // Обновление объектов
    for (let i = objects.length - 1; i >= 0; i--) {
      const o = objects[i];
      o.y += o.vy * dt;
      o.rot += o.vr * dt;
      if (o.y - o.r > H + 20) { objects.splice(i, 1); continue; }

      const dx = o.x - player.x;
      const dy = o.y - player.y;
      const dist = Math.hypot(dx, dy);
      if (dist < o.r + player.r * 0.85) {
        if (o.type === 'rock') {
          if (player.shield) {
            player.shield = false;
            Sound.shieldHit();
            explode(o.x, o.y, '#7de8ff', 18, 220);
            objects.splice(i, 1);
            state.shake = 10;
          } else {
            return gameOver();
          }
        } else if (o.type === 'star') {
          state.score += 25;
          Sound.catchStar();
          explode(o.x, o.y, '#ffe98a', 10, 140);
          objects.splice(i, 1);
        } else if (o.type === 'shield') {
          player.shield = true;
          state.score += 10;
          Sound.shieldUp();
          explode(o.x, o.y, '#7dffa8', 12, 150);
          objects.splice(i, 1);
        }
      }
    }

    // Частицы
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 120 * scale * dt;
      if (p.life >= p.maxLife) particles.splice(i, 1);
    }

    UI.setScore(Math.floor(state.score));
  }

  // ---------- Рендер ----------

  function render(dt) {
    ctx.clearRect(0, 0, W, H);

    // Фон
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#101638');
    grad.addColorStop(0.6, '#1b2452');
    grad.addColorStop(1, '#2c2a5e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Параллакс-звёзды
    ctx.fillStyle = '#ffffff';
    for (const s of starsBg) {
      s.y += s.speed * dt * (state.screen === 'playing' ? 1.6 : 0.5);
      if (s.y > H) { s.y = -2; s.x = Math.random() * W; }
      ctx.globalAlpha = 0.3 + (s.r / 2) * 0.5;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Облака
    for (const c of clouds) {
      c.x -= c.speed * dt;
      if (c.x + c.w < 0) { c.x = W + c.w; c.y = Math.random() * H * 0.5; }
      ctx.globalAlpha = c.alpha;
      ctx.fillStyle = '#9fb4ff';
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, c.w, c.w * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Тряска экрана
    ctx.save();
    if (state.shake > 0) {
      ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
    }

    // Объекты
    for (const o of objects) {
      if (o.type === 'rock') drawRock(o);
      else if (o.type === 'star') drawStar(o);
      else drawShieldPickup(o);
    }

    // Игрок
    if (player.alive) drawPlayer();

    // Частицы
    for (const p of particles) {
      ctx.globalAlpha = 1 - p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (1 - p.life / p.maxLife), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.restore();

    // Вспышка при ударе
    if (state.flash > 0) {
      ctx.fillStyle = `rgba(255, 80, 80, ${state.flash * 0.4})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  function drawPlayer() {
    const { x, y, r } = player;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(player.tilt);

    // Пламя
    if (state.screen === 'playing') {
      const flame = r * (0.9 + Math.random() * 0.5);
      const fg = ctx.createLinearGradient(0, r * 0.8, 0, r * 0.8 + flame);
      fg.addColorStop(0, 'rgba(255, 200, 80, 0.95)');
      fg.addColorStop(1, 'rgba(255, 100, 40, 0)');
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.moveTo(-r * 0.35, r * 0.75);
      ctx.lineTo(0, r * 0.8 + flame);
      ctx.lineTo(r * 0.35, r * 0.75);
      ctx.closePath();
      ctx.fill();
    }

    // Корпус
    const bg = ctx.createLinearGradient(-r, 0, r, 0);
    bg.addColorStop(0, '#e8ecf5');
    bg.addColorStop(1, '#aab4cc');
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.25);
    ctx.quadraticCurveTo(r * 0.9, -r * 0.2, r * 0.62, r * 0.8);
    ctx.lineTo(-r * 0.62, r * 0.8);
    ctx.quadraticCurveTo(-r * 0.9, -r * 0.2, 0, -r * 1.25);
    ctx.fill();

    // Нос
    ctx.fillStyle = '#ff6b5e';
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.25);
    ctx.quadraticCurveTo(r * 0.5, -r * 0.75, r * 0.42, -r * 0.55);
    ctx.lineTo(-r * 0.42, -r * 0.55);
    ctx.quadraticCurveTo(-r * 0.5, -r * 0.75, 0, -r * 1.25);
    ctx.fill();

    // Иллюминатор
    ctx.fillStyle = '#3ec6ff';
    ctx.beginPath();
    ctx.arc(0, -r * 0.25, r * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#5a6685';
    ctx.lineWidth = r * 0.1;
    ctx.stroke();

    // Крылья
    ctx.fillStyle = '#ff6b5e';
    ctx.beginPath();
    ctx.moveTo(-r * 0.6, r * 0.35);
    ctx.lineTo(-r * 1.05, r * 1.0);
    ctx.lineTo(-r * 0.55, r * 0.85);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(r * 0.6, r * 0.35);
    ctx.lineTo(r * 1.05, r * 1.0);
    ctx.lineTo(r * 0.55, r * 0.85);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    // Щит
    if (player.shield) {
      ctx.save();
      ctx.translate(x, y);
      ctx.strokeStyle = `rgba(125, 232, 255, ${0.6 + Math.sin(performance.now() / 200) * 0.25})`;
      ctx.lineWidth = 3 * scale;
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(125, 232, 255, 0.08)';
      ctx.fill();
      ctx.restore();
    }
  }

  function drawRock(o) {
    ctx.save();
    ctx.translate(o.x, o.y);
    ctx.rotate(o.rot);
    ctx.fillStyle = '#7d7468';
    ctx.beginPath();
    const n = 8;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const rr = o.r * (0.82 + 0.18 * Math.sin(i * 3.7 + o.rot));
      const px = Math.cos(a) * rr;
      const py = Math.sin(a) * rr;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#5e574d';
    ctx.beginPath();
    ctx.arc(-o.r * 0.3, -o.r * 0.2, o.r * 0.22, 0, Math.PI * 2);
    ctx.arc(o.r * 0.25, o.r * 0.3, o.r * 0.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawStar(o) {
    ctx.save();
    ctx.translate(o.x, o.y);
    ctx.rotate(o.rot);
    ctx.shadowColor = '#ffe98a';
    ctx.shadowBlur = 12 * scale;
    ctx.fillStyle = '#ffe98a';
    ctx.beginPath();
    const spikes = 5;
    for (let i = 0; i < spikes * 2; i++) {
      const a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
      const rr = i % 2 === 0 ? o.r : o.r * 0.45;
      const px = Math.cos(a) * rr;
      const py = Math.sin(a) * rr;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawShieldPickup(o) {
    ctx.save();
    ctx.translate(o.x, o.y);
    ctx.rotate(o.rot);
    ctx.shadowColor = '#7dffa8';
    ctx.shadowBlur = 14 * scale;
    ctx.strokeStyle = '#7dffa8';
    ctx.lineWidth = 3 * scale;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const px = Math.cos(a) * o.r;
      const py = Math.sin(a) * o.r;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = 'rgba(125, 255, 168, 0.25)';
    ctx.fill();
    ctx.restore();
  }

  // ---------- Управление состояниями ----------

  function start() {
    objects = [];
    particles = [];
    state.score = 0;
    state.time = 0;
    state.spawnTimer = 0.4;
    state.shake = 0;
    state.flash = 0;
    player.x = W / 2;
    player.vx = 0;
    player.shield = false;
    player.alive = true;
    state.screen = 'playing';
    pointerX = null;
    keys.left = keys.right = false;
    UI.onGameStart();
    YandexSDK.gameStarted();
    Sound.click();
  }

  function pause(auto) {
    if (state.screen !== 'playing') return;
    state.screen = 'paused';
    UI.onPause(auto);
    YandexSDK.gameStopped();
  }

  function resume() {
    if (state.screen !== 'paused') return;
    state.screen = 'playing';
    pointerX = null;
    UI.onResume();
    YandexSDK.gameStarted();
    Sound.click();
  }

  function quitToMenu() {
    state.screen = 'menu';
    objects = [];
    particles = [];
    player.alive = true;
    UI.showMenu();
  }

  function gameOver() {
    player.alive = false;
    state.screen = 'over';
    state.overTimer = 0;
    state.shake = 18;
    state.flash = 1;
    Sound.hit();
    Sound.gameOver();
    explode(player.x, player.y, '#ff8c42', 30, 320);
    explode(player.x, player.y, '#e8ecf5', 16, 200);
    YandexSDK.gameStopped();

    const score = Math.floor(state.score);
    const best = Number(localStorage.getItem('nu_best') || 0);
    const isRecord = score > best;
    if (isRecord) localStorage.setItem('nu_best', String(score));

    setTimeout(() => {
      UI.showGameOver(score, Math.max(score, best), isRecord);
      YandexSDK.submitScore(score);
    }, 900);
  }

  function best() {
    return Number(localStorage.getItem('nu_best') || 0);
  }

  // ---------- Старт ----------

  function boot() {
    resize();
    bindInput();
    UI.showMenu();
    requestAnimationFrame(ts => { lastTs = ts; requestAnimationFrame(loop); });
  }

  return { boot, start, pause, resume, quitToMenu, best };
})();
