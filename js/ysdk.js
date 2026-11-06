'use strict';

const YandexSDK = (() => {
  let ysdk = null;
  let lb = null;
  let initialized = false;
  let sdkScriptDone = false;
  let initPromise = null;

  // Вызывается из onload/onerror тега <script src="/sdk.js">
  window.__sdkLoaded = () => { sdkScriptDone = true; };
  window.__sdkFailed = () => { sdkScriptDone = true; };

  function init() {
    if (initPromise) return initPromise;
    initPromise = (async () => {
      try {
        if (typeof YaGames === 'undefined') return false;
        ysdk = await YaGames.init();
        window.ysdk = ysdk;
        try {
          lb = await ysdk.getLeaderboards();
        } catch (e) {
          lb = null;
        }
        initialized = true;
        return true;
      } catch (e) {
        console.warn('Yandex SDK недоступен, работаем локально:', e);
        return false;
      }
    })();
    return initPromise;
  }

  // Game Ready — вызывать, когда игра полностью загружена и показано меню.
  function gameReady() {
    try { ysdk && ysdk.features && ysdk.features.LoadingAPI && ysdk.features.LoadingAPI.ready(); }
    catch (e) { console.warn('LoadingAPI.ready() ошибка:', e); }
  }

  function gameStarted() {
    try { ysdk && ysdk.features && ysdk.features.GameplayAPI && ysdk.features.GameplayAPI.start(); }
    catch (e) { /* ignore */ }
  }

  function gameStopped() {
    try { ysdk && ysdk.features && ysdk.features.GameplayAPI && ysdk.features.GameplayAPI.stop(); }
    catch (e) { /* ignore */ }
  }

  async function submitScore(score) {
    try {
      if (lb && score > 0) await lb.setLeaderboardScore('main', score);
    } catch (e) { /* ignore */ }
  }

  async function getTop(quantity) {
    try {
      if (!lb) return null;
      return await lb.getLeaderboardEntries('main', {
        quantityTop: quantity || 5,
        includeUser: true
      });
    } catch (e) {
      return null;
    }
  }

  return {
    init,
    gameReady,
    gameStarted,
    gameStopped,
    submitScore,
    getTop,
    isReady: () => initialized
  };
})();
