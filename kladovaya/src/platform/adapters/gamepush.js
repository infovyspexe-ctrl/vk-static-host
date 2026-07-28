// АДАПТЕР ПЛОЩАДКИ: GamePush (прослойка над Яндексом, VK, ОК, CrazyGames и др.).
//
// СТАТУС: НЕ ПОДКЛЮЧЁН. Нужны PROJECT_ID и PUBLIC_TOKEN из панели gamepush.com.
// Пока они пустые, слой этот адаптер не выбирает (см. ../index.js).
//
// Контракт тот же, что у yandex.js: сырые операции, без пауз, дебаунса и троттлинга —
// это делает слой.
//
// ── Как GamePush хранит прогресс, и почему здесь одно текстовое поле ──────────
// Профиль игрока у GamePush — это ЗАРАНЕЕ ОБЪЯВЛЕННЫЕ в панели поля с типами
// (число, строка, булево), а не произвольный JSON, как у Яндекса. В лоб это значит
// «разложить сейв каждой игры по полям и объявить схему в панели» — девять игр,
// девять схем, и миграция живого прогресса в самом опасном месте.
//
// Обходим: объявляем в панели ОДНО строковое поле `save` и кладём в него JSON целиком.
// Тогда формат сейва игр не меняется вообще, слой работает с тем же объектом, что и
// на Яндексе, а миграции остаются нашими (SAVE_VERSION), а не панельными.
//
// Цена: облачные лидерборды GamePush не видят полей внутри строки — то, что должно
// попадать в таблицы рекордов, дублируется отдельными объявленными полями (см. ниже
// SCORE_FIELDS) либо шлётся через leaderboard.setScore.
// Ограничение: профиль до 1 МБ, рекомендация GamePush — до 10 КБ в сжатом виде.
// Наши сейвы сейчас сотни байт, запас огромный, но за размером следить.

const PROJECT_ID = '';   // из панели gamepush.com → проект → Настройки
const PUBLIC_TOKEN = ''; // там же

// Имя объявленного в панели строкового поля, где лежит весь сейв игры.
const SAVE_FIELD = 'save';

export const GamePushAdapter = {
  name: 'gamepush',
  available: false,
  gp: null,

  // Готов ли адаптер к использованию. Слой проверяет это до init().
  configured() { return !!(PROJECT_ID && PUBLIC_TOKEN); },

  async init() {
    if (!this.configured()) {
      console.warn('[platform:gamepush] PROJECT_ID/PUBLIC_TOKEN не заполнены — адаптер выключен');
      return;
    }
    this.gp = await new Promise((resolve) => {
      window.onGPInit = (gp) => resolve(gp);
      const s = document.createElement('script');
      s.async = true;
      s.src = 'https://gamepush.com/sdk/game-score.js?projectId=' + PROJECT_ID +
        '&publicToken=' + PUBLIC_TOKEN + '&callback=onGPInit';
      // ВАЖНО для модерации Яндекса: gamepush.com — внешний хост, а на площадке
      // работает белый список CSP. Добавить домен в консоли разработчика:
      // Настройки → Правила для CSP. Иначе запрос молча блокируется В ПРОДЕ
      // (локально всё работает), игра выглядит сломанной и получает отказ.
      s.onerror = () => { console.warn('[platform:gamepush] SDK не загрузился'); resolve(null); };
      document.head.appendChild(s);
    });
    if (!this.gp) return;
    try { await this.gp.player.ready; } catch (e) {}
    this.available = true;
    window.gp = this.gp; // отладка из консоли
    console.log('[platform:gamepush] SDK инициализирован, площадка:', this.gp.platform.type);
  },

  ready() {
    // Единый аналог LoadingAPI.ready Яндекса: GamePush сам прокидывает его в родной
    // SDK площадки. ПРОВЕРИТЬ перехватом трафика на пилоте: письменного подтверждения
    // маппинга в их документации нет, а отсутствие ready бьёт по ранжированию Яндекса.
    if (this.available) { try { this.gp.gameStart(); } catch (e) {} }
  },

  gameplayStart() {
    if (this.available) { try { this.gp.gameplayStart(); } catch (e) {} }
  },

  gameplayStop() {
    if (this.available) { try { this.gp.gameplayStop(); } catch (e) {} }
  },

  getLang() {
    if (this.available) { try { return this.gp.language; } catch (e) {} }
    return null;
  },

  ads: {
    showFullscreen(a, { onOpen, onClose }) {
      if (!a.available) { onClose(true); return; }
      a.gp.ads.showFullscreen()
        .then((ok) => onClose(!!ok))
        .catch((e) => { console.warn('[platform:gamepush] fullscreen error', e); onClose(false); });
      onOpen();
    },

    showRewarded(a, { onOpen, onRewarded, onClose }) {
      if (!a.available) { onRewarded(); onClose(true); return; }
      let rewarded = false;
      a.gp.ads.showRewardedVideo()
        .then((ok) => { if (ok) { rewarded = true; onRewarded(); } })
        .catch((e) => console.warn('[platform:gamepush] rewarded error', e))
        .finally(() => onClose(rewarded));
      onOpen();
    },

    async showBanner(a) {
      if (a.available) { try { await a.gp.ads.showSticky(); } catch (e) {} }
    },

    async hideBanner(a) {
      if (a.available) { try { await a.gp.ads.closeSticky(); } catch (e) {} }
    },
  },

  storage: {
    isAvailable(a) { return a.available; },

    async read(a) {
      if (!a.available) return null;
      try {
        const raw = a.gp.player.get(SAVE_FIELD);
        if (!raw) return {};          // поле пустое = новый игрок (это НЕ ошибка сети)
        return JSON.parse(raw);
      } catch (e) {
        console.warn('[platform:gamepush] чтение сейва не удалось', e);
        return null;                  // null = «не смогли прочитать», слой не затрёт облако
      }
    },

    async write(a, payload) {
      if (!a.available) return false;
      try {
        a.gp.player.set(SAVE_FIELD, JSON.stringify(payload));
        await a.gp.player.sync();     // GamePush не пишет сам — только по sync()
        return true;
      } catch (e) { console.warn('[platform:gamepush] запись сейва не удалась', e); return false; }
    },
  },

  leaderboard: {
    async setScore(a, name, score) {
      if (!a.available) return;
      // У GamePush рекорд — это объявленное числовое поле игрока, а не отдельный вызов:
      // поле с таким именем должно быть заведено в панели и помечено публичным.
      try { a.gp.player.set(name, score); await a.gp.player.sync(); }
      catch (e) { console.warn('[platform:gamepush] setScore error', e); }
    },

    async getPlayerEntry(a, name) {
      if (!a.available) return null;
      try { return await a.gp.leaderboard.getPlayer({ variant: name }); }
      catch (e) { return null; }
    },

    async getTop(a, name, quantityTop = 10) {
      if (!a.available) return [];
      try {
        const res = await a.gp.leaderboard.open({ variant: name, limit: quantityTop, displayFields: [name] });
        return (res && res.players) || [];
      } catch (e) { return []; }
    },
  },
};
