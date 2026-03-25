// save.js — LocalStorage persistence layer

const STORAGE_KEY = 'burgerDash';
const CURRENT_VERSION = 1;

const DEFAULTS = {
  version: CURRENT_VERSION,
  highScore: 0,
  totalCoins: 0,
  unlockedCharacters: ['patty'],
  selectedCharacter: 'patty',
  settings: {
    musicVolume: 0.7,
    sfxVolume: 1.0,
    musicEnabled: true,
    sfxEnabled: true
  },
  stats: {
    totalRuns: 0,
    totalDistance: 0,
    totalCoinsCollected: 0
  }
};

function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

class SaveManagerClass {
  constructor() {
    this.data = null;
  }

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.data = deepMerge(DEFAULTS, parsed);
      } else {
        this.data = { ...DEFAULTS, unlockedCharacters: [...DEFAULTS.unlockedCharacters] };
      }
    } catch {
      this.data = { ...DEFAULTS, unlockedCharacters: [...DEFAULTS.unlockedCharacters] };
    }
    return this.data;
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch {
      // Safari private browsing may throw
    }
  }

  getData() {
    if (!this.data) this.load();
    return this.data;
  }

  getHighScore() {
    return this.getData().highScore;
  }

  setHighScore(score) {
    this.getData().highScore = score;
    this.save();
  }

  getTotalCoins() {
    return this.getData().totalCoins;
  }

  addCoins(amount) {
    this.getData().totalCoins += amount;
    this.getData().stats.totalCoinsCollected += amount;
    this.save();
  }

  spendCoins(amount) {
    this.getData().totalCoins -= amount;
    this.save();
  }

  getUnlockedCharacters() {
    return this.getData().unlockedCharacters;
  }

  isCharacterUnlocked(id) {
    return this.getData().unlockedCharacters.includes(id);
  }

  unlockCharacter(id) {
    if (!this.isCharacterUnlocked(id)) {
      this.getData().unlockedCharacters.push(id);
      this.save();
    }
  }

  getSelectedCharacter() {
    return this.getData().selectedCharacter;
  }

  setSelectedCharacter(id) {
    this.getData().selectedCharacter = id;
    this.save();
  }

  getSettings() {
    return this.getData().settings;
  }

  updateSettings(partial) {
    Object.assign(this.getData().settings, partial);
    this.save();
  }

  addRun(distance) {
    this.getData().stats.totalRuns++;
    this.getData().stats.totalDistance += distance;
    this.save();
  }

  reset() {
    this.data = { ...DEFAULTS, unlockedCharacters: [...DEFAULTS.unlockedCharacters] };
    this.save();
  }
}

export const SaveManager = new SaveManagerClass();
