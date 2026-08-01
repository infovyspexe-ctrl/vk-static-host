// Единый менеджер звука. Все звуки идут через него, одна кнопка mute гасит всё.
// Привязывается к игре в main.js: Audio.attach(game).
export const Audio = {
  game: null,
  muted: false,

  attach(game) { this.game = game; },

  play(key, config) {
    if (!this.game || this.muted) return null;
    try { return this.game.sound.play(key, config); } catch (e) { return null; }
  },

  // Фоновая музыка как плейлист: сидеть на одной мелодии долго утомляет, поэтому
  // треки играют по очереди (доиграл → следующий) в перемешанном порядке.
  // Запускается один раз, переживает смену сцен (звук в Phaser глобальный).
  music: null,
  playlist: [],
  _order: [],
  _pos: 0,
  _vol: 0.32,
  _allowed: false, // жест игрока был — играть можно (до него браузер всё равно не даст)

  // Разрешить и включить музыку. Плейлист наполняется догрузкой (addTrack), поэтому на момент
  // вызова он может быть ещё пуст — тогда музыку запустит первый приехавший трек.
  startMusic(volume = 0.32) {
    this._vol = volume;
    this._allowed = true;
    if (!this.game) return;
    if (this.music && this.music.isPlaying) return; // уже играет — не перезапускаем
    if (this.playlist.length === 0) return;         // ещё нечего играть
    this._reshuffle();
    this._playNext();
  },

  // Догрузить треки фоном, уже после показа меню. Через fetch, а НЕ через загрузчик сцены:
  // загрузчик умирает вместе со сценой, и игрок, нажавший «СРОК» через секунду, оборвал бы
  // догрузку. Пришедший трек попадает в кеш Phaser и в плейлист; если музыка ещё не играет
  // (жест уже был) — первый пришедший её и запускает.
  async lazyLoad(keys, urlFor) {
    if (!this.game) return;
    const ctx = this.game.sound && this.game.sound.context;
    if (!ctx) return; // HTML5-фоллбэк без WebAudio: тихо пропускаем, игра не падает
    for (const key of keys) {
      if (this.game.cache.audio.exists(key)) { this.addTrack(key); continue; }
      try {
        const res = await fetch(urlFor(key));
        const buf = await res.arrayBuffer();
        const decoded = await ctx.decodeAudioData(buf);
        this.game.cache.audio.add(key, decoded);
        this.addTrack(key);
      } catch (e) { /* один трек не доехал — не повод ронять игру */ }
    }
  },

  // Добавить трек в плейлист на ходу (порядок дослушивается, повторов не создаём).
  addTrack(key) {
    if (this.playlist.includes(key)) return;
    this.playlist.push(key);
    this._order.push(this.playlist.length - 1);
    // жест уже был, а музыка ещё не звучит — стартуем с первого приехавшего трека
    if (this._allowed && !(this.music && this.music.isPlaying)) this._playNext();
  },

  // Перемешать порядок (Фишер—Йейтс на индексах, без Math.random-зависимости от сцены)
  _reshuffle() {
    this._order = this.playlist.map((_, i) => i);
    for (let i = this._order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this._order[i], this._order[j]] = [this._order[j], this._order[i]];
    }
    this._pos = 0;
  },

  _playNext() {
    if (!this.game || this.playlist.length === 0) return;
    if (this._pos >= this._order.length) this._reshuffle(); // круг пройден — новый порядок
    const key = this.playlist[this._order[this._pos]];
    this._pos++;
    try {
      const sound = this.game.sound.add(key, { loop: false, volume: this._vol });
      // доиграл → уничтожить (иначе за долгую сессию объекты копятся) и запустить следующий
      sound.once('complete', () => { sound.destroy(); this._playNext(); });
      this.music = sound;
      sound.play();
    } catch (e) { this.music = null; }
  },

  setMuted(v) {
    this.muted = v;
    try { if (this.game) this.game.sound.mute = v; } catch (e) {}
  },

  toggleMute() { this.setMuted(!this.muted); return this.muted; },

  // Пауза и возобновление всего звука (используется при рекламе и потере фокуса).
  pause() { try { if (this.game) this.game.sound.pauseAll(); } catch (e) {} },
  resume() { try { if (this.game && !this.muted) this.game.sound.resumeAll(); } catch (e) {} }
};
