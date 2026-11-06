'use strict';

const UI = (() => {
  const $ = id => document.getElementById(id);

  const screens = {
    menu: $('menu'),
    pause: $('pause'),
    over: $('gameover'),
    hud: $('hud')
  };

  let autoPaused = false;

  function show(name) {
    for (const key of Object.keys(screens)) {
      screens[key].classList.toggle('hidden', key !== name);
    }
  }

  function updateMuteButtons() {
    const muted = Sound.isMuted();
    $('btn-mute').textContent = muted ? '🔇' : '🔊';
    $('btn-menu-mute').textContent = muted ? '🔇 Звук: выкл' : '🔊 Звук: вкл';
  }

  function updateBest() {
    const best = Game.best();
    $('menu-best').textContent = 'Рекорд: ' + best;
    $('hud-best').textContent = 'Рекорд: ' + best;
  }

  // ---------- Колбэки от Game ----------

  function showMenu() {
    updateBest();
    updateMuteButtons();
    show('menu');
  }

  function onGameStart() {
    updateBest();
    $('hud-score').textContent = '0';
    show('hud');
  }

  function setScore(score) {
    $('hud-score').textContent = score;
  }

  function onPause(auto) {
    autoPaused = !!auto;
    show('pause');
  }

  function onResume() {
    show('hud');
  }

  function showGameOver(score, best, isRecord) {
    $('final-score').textContent = score;
    $('final-best').textContent = 'Рекорд: ' + best;
    $('new-record').classList.toggle('hidden', !isRecord);
    renderLeaderboard();
    show('over');
  }

  async function renderLeaderboard() {
    const box = $('leaderboard');
    const list = $('lb-list');
    const data = await YandexSDK.getTop(5);
    if (!data || !data.entries || !data.entries.length) {
      box.classList.add('hidden');
      return;
    }
    list.innerHTML = '';
    for (const entry of data.entries) {
      const li = document.createElement('li');
      if (entry.rank === data.userRank) li.classList.add('lb-me');
      const name = (entry.player && entry.player.publicName) || 'Игрок';
      li.innerHTML = `<span>${entry.rank}. ${escapeHtml(name)}</span><span>${entry.score}</span>`;
      list.appendChild(li);
    }
    box.classList.remove('hidden');
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  // ---------- Кнопки ----------

  function bind() {
    $('btn-play').addEventListener('click', () => Game.start());
    $('btn-again').addEventListener('click', () => Game.start());
    $('btn-resume').addEventListener('click', () => Game.resume());
    $('btn-pause').addEventListener('click', () => Game.pause());
    $('btn-restart-pause').addEventListener('click', () => Game.start());
    $('btn-menu-pause').addEventListener('click', () => Game.quitToMenu());
    $('btn-menu-over').addEventListener('click', () => Game.quitToMenu());

    const muteHandler = () => {
      Sound.toggleMute();
      updateMuteButtons();
      Sound.click();
    };
    $('btn-mute').addEventListener('click', muteHandler);
    $('btn-menu-mute').addEventListener('click', muteHandler);
  }

  // ---------- Запуск ----------

  async function boot() {
    bind();
    updateMuteButtons();
    updateBest();

    // Инициализируем SDK (не блокируем игру, если его нет)
    const ok = await YandexSDK.init();

    // Запускаем игру
    Game.boot();

    // Game Ready: меню показано, игра готова к взаимодействию
    YandexSDK.gameReady();

    if (!ok) console.info('Режим локальной разработки: SDK Яндекс Игр недоступен.');
  }

  document.addEventListener('DOMContentLoaded', boot);

  return { showMenu, onGameStart, onPause, onResume, showGameOver, setScore };
})();
