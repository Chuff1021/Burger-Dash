// ui.js — HUD, all screens, character select, transitions
import * as THREE from 'three';
import { CHARACTERS, CHARACTER_ORDER, buildModel, animateCharacter } from './characters.js';
import { SaveManager } from './save.js';

export class UIManager {
  constructor() {
    this.screens = {};
    this.currentScreen = null;
    this.charSelectIndex = 0;
    this.charPreviewRenderer = null;
    this.charPreviewScene = null;
    this.charPreviewCamera = null;
    this.charPreviewModel = null;
    this.onCharacterSelected = null;
    this.onPlay = null;
    this.onResume = null;
    this.onRestart = null;
    this.onMenu = null;
    this.onSettingsChange = null;
  }

  init() {
    // Collect screen elements
    this.screens = {
      title: document.getElementById('screen-title'),
      charselect: document.getElementById('screen-charselect'),
      hud: document.getElementById('hud'),
      pause: document.getElementById('screen-pause'),
      gameover: document.getElementById('screen-gameover'),
      settings: document.getElementById('screen-settings')
    };

    // Title screen buttons
    document.getElementById('btn-play').addEventListener('click', () => {
      if (this.onPlay) this.onPlay();
    });
    document.getElementById('btn-settings-open').addEventListener('click', () => {
      this.showScreen('settings');
    });

    // Character select
    document.getElementById('char-prev').addEventListener('click', () => this.prevCharacter());
    document.getElementById('char-next').addEventListener('click', () => this.nextCharacter());
    document.getElementById('char-select-btn').addEventListener('click', () => this.confirmCharacter());
    document.getElementById('char-back').addEventListener('click', () => this.showScreen('title'));

    // Pause
    document.getElementById('btn-resume').addEventListener('click', () => {
      if (this.onResume) this.onResume();
    });
    document.getElementById('btn-restart').addEventListener('click', () => {
      if (this.onRestart) this.onRestart();
    });
    document.getElementById('btn-pause-chars').addEventListener('click', () => {
      if (this.onMenu) this.onMenu();
      this.showScreen('charselect');
      this.initCharacterSelect();
    });
    document.getElementById('btn-pause-menu').addEventListener('click', () => {
      if (this.onMenu) this.onMenu();
      this.showScreen('title');
    });

    // Game over
    document.getElementById('btn-retry').addEventListener('click', () => {
      if (this.onRestart) this.onRestart();
    });
    document.getElementById('btn-go-chars').addEventListener('click', () => {
      this.showScreen('charselect');
      this.initCharacterSelect();
    });
    document.getElementById('btn-go-menu').addEventListener('click', () => {
      this.showScreen('title');
    });

    // Pause button (in HUD)
    document.getElementById('hud-pause').addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.onPause) this.onPause();
    });

    // Settings
    const musicSlider = document.getElementById('setting-music');
    const sfxSlider = document.getElementById('setting-sfx');
    const settings = SaveManager.getSettings();
    musicSlider.value = settings.musicVolume * 100;
    sfxSlider.value = settings.sfxVolume * 100;

    musicSlider.addEventListener('input', (e) => {
      if (this.onSettingsChange) this.onSettingsChange('musicVolume', e.target.value / 100);
    });
    sfxSlider.addEventListener('input', (e) => {
      if (this.onSettingsChange) this.onSettingsChange('sfxVolume', e.target.value / 100);
    });
    document.getElementById('btn-settings-back').addEventListener('click', () => {
      this.showScreen('title');
    });

    // Update title screen high score
    document.getElementById('title-highscore').textContent = SaveManager.getHighScore();

    // Init character select 3D preview
    this.initCharPreviewRenderer();
  }

  showScreen(id) {
    for (const [key, el] of Object.entries(this.screens)) {
      el.classList.remove('active');
    }
    if (this.screens[id]) {
      this.screens[id].classList.add('active');
      this.currentScreen = id;
    }
  }

  initCharPreviewRenderer() {
    const canvas = document.getElementById('char-preview-canvas');
    if (!canvas) return;

    this.charPreviewRenderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true
    });
    this.charPreviewRenderer.setSize(220, 260);
    this.charPreviewRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.charPreviewRenderer.setClearColor(0x000000, 0);

    this.charPreviewScene = new THREE.Scene();

    this.charPreviewCamera = new THREE.PerspectiveCamera(45, 220 / 260, 0.1, 50);
    this.charPreviewCamera.position.set(0, 0.8, 3);
    this.charPreviewCamera.lookAt(0, 0.4, 0);

    // Lighting
    const ambient = new THREE.AmbientLight(0xffeedd, 0.6);
    this.charPreviewScene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight.position.set(2, 3, 4);
    this.charPreviewScene.add(dirLight);
    const backLight = new THREE.PointLight(0xff8c00, 0.5, 10);
    backLight.position.set(-2, 2, -2);
    this.charPreviewScene.add(backLight);
  }

  initCharacterSelect() {
    // Set to last selected character
    const selected = SaveManager.getSelectedCharacter();
    this.charSelectIndex = CHARACTER_ORDER.indexOf(selected);
    if (this.charSelectIndex < 0) this.charSelectIndex = 0;
    this.updateCharacterDisplay();
  }

  prevCharacter() {
    this.charSelectIndex = (this.charSelectIndex - 1 + CHARACTER_ORDER.length) % CHARACTER_ORDER.length;
    this.updateCharacterDisplay();
  }

  nextCharacter() {
    this.charSelectIndex = (this.charSelectIndex + 1) % CHARACTER_ORDER.length;
    this.updateCharacterDisplay();
  }

  updateCharacterDisplay() {
    const charId = CHARACTER_ORDER[this.charSelectIndex];
    const config = CHARACTERS[charId];
    const unlocked = SaveManager.isCharacterUnlocked(charId);

    // Name and title
    document.getElementById('char-name').textContent = config.name;
    document.getElementById('char-title').textContent = config.title;

    // Stats
    document.getElementById('stat-speed').style.width = `${(config.stats.speed / 5) * 100}%`;
    document.getElementById('stat-jump').style.width = `${(config.stats.jump / 5) * 100}%`;
    document.getElementById('stat-magnet').style.width = `${(config.stats.magnet / 5) * 100}%`;

    // Ability description
    document.getElementById('char-ability').textContent = `${config.ability.name}: ${config.ability.description}`;

    // Unlock info
    const unlockInfo = document.getElementById('char-unlock-info');
    const selectBtn = document.getElementById('char-select-btn');

    if (unlocked) {
      unlockInfo.textContent = '';
      selectBtn.textContent = 'SELECT';
      selectBtn.disabled = false;
      selectBtn.style.opacity = '1';
    } else {
      const totalCoins = SaveManager.getTotalCoins();
      if (totalCoins >= config.unlockCost) {
        unlockInfo.textContent = `UNLOCK FOR ${config.unlockCost} COINS`;
        selectBtn.textContent = 'UNLOCK';
        selectBtn.disabled = false;
        selectBtn.style.opacity = '1';
      } else {
        unlockInfo.textContent = `LOCKED — ${config.unlockCost} COINS NEEDED (${totalCoins}/${config.unlockCost})`;
        selectBtn.textContent = 'LOCKED';
        selectBtn.disabled = true;
        selectBtn.style.opacity = '0.5';
      }
    }

    // Lock overlay on preview
    const container = document.getElementById('char-preview-container');
    let lockOverlay = container.querySelector('.char-locked-overlay');
    if (!unlocked) {
      if (!lockOverlay) {
        lockOverlay = document.createElement('div');
        lockOverlay.className = 'char-locked-overlay';
        lockOverlay.innerHTML = '<span>&#128274;</span><span class="char-locked-cost"></span>';
        container.appendChild(lockOverlay);
      }
      lockOverlay.style.display = 'flex';
      lockOverlay.querySelector('.char-locked-cost').textContent = `${config.unlockCost} coins`;
    } else if (lockOverlay) {
      lockOverlay.style.display = 'none';
    }

    // Update 3D preview
    this.updateCharPreviewModel(charId);
  }

  updateCharPreviewModel(charId) {
    if (!this.charPreviewScene) return;

    // Remove old model
    if (this.charPreviewModel) {
      this.charPreviewScene.remove(this.charPreviewModel);
    }

    this.charPreviewModel = buildModel(charId);
    this.charPreviewModel.position.set(0, -0.3, 0);
    this.charPreviewScene.add(this.charPreviewModel);
  }

  updateCharacterPreview(delta) {
    if (!this.charPreviewRenderer || !this.charPreviewModel) return;

    // Animate character with idle animation
    animateCharacter(this.charPreviewModel, delta, 'idle', performance.now() / 1000);

    // Slow rotation
    this.charPreviewModel.rotation.y += delta * 1.5;

    this.charPreviewRenderer.render(this.charPreviewScene, this.charPreviewCamera);
  }

  confirmCharacter() {
    const charId = CHARACTER_ORDER[this.charSelectIndex];
    const config = CHARACTERS[charId];
    const unlocked = SaveManager.isCharacterUnlocked(charId);

    if (!unlocked) {
      // Try to unlock
      const totalCoins = SaveManager.getTotalCoins();
      if (totalCoins >= config.unlockCost) {
        SaveManager.spendCoins(config.unlockCost);
        SaveManager.unlockCharacter(charId);
        this.updateCharacterDisplay();
        return; // Show unlocked state, user clicks again to select
      }
      return;
    }

    SaveManager.setSelectedCharacter(charId);
    if (this.onCharacterSelected) {
      this.onCharacterSelected(charId);
    }
  }

  // HUD updates
  updateHUD(data) {
    document.getElementById('hud-score').textContent = data.score.toLocaleString();
    document.getElementById('hud-coin-count').textContent = data.coins;
    document.getElementById('hud-distance').textContent = `${data.distance}m`;

    // Lives
    const livesEl = document.getElementById('hud-lives');
    let livesHTML = '';
    for (let i = 0; i < 3; i++) {
      livesHTML += `<span class="life-icon${i >= data.lives ? ' lost' : ''}">&#10084;</span>`;
    }
    livesEl.innerHTML = livesHTML;

    // Combo
    const comboEl = document.getElementById('hud-combo');
    if (data.combo > 1) {
      comboEl.textContent = `x${data.combo}`;
      comboEl.classList.remove('hidden');
    } else {
      comboEl.classList.add('hidden');
    }

    // Ability charge
    const fillEl = document.getElementById('hud-ability-fill');
    fillEl.style.height = `${data.abilityCharge * 100}%`;
    if (data.abilityCharge >= 1) {
      fillEl.style.background = '#FFD700';
      fillEl.style.boxShadow = '0 0 10px #FFD700';
    } else {
      fillEl.style.background = 'var(--accent)';
      fillEl.style.boxShadow = 'none';
    }
  }

  showPowerupIndicator(active, progress) {
    const el = document.getElementById('hud-powerup');
    if (active) {
      el.classList.remove('hidden');
      const arc = document.getElementById('hud-powerup-arc');
      const circumference = 113; // 2 * PI * 18
      arc.setAttribute('stroke-dashoffset', circumference * (1 - progress));
    } else {
      el.classList.add('hidden');
    }
  }

  showGameOver(stats) {
    document.getElementById('go-score').textContent = stats.score.toLocaleString();
    document.getElementById('go-best').textContent = SaveManager.getHighScore().toLocaleString();
    document.getElementById('go-distance').textContent = `${stats.distance}m`;
    document.getElementById('go-coins').textContent = stats.coins;

    // Character quip
    const charId = SaveManager.getSelectedCharacter();
    const config = CHARACTERS[charId];
    document.getElementById('go-character-quip').textContent = `"${config.quip}"`;

    // New best
    const newBestEl = document.getElementById('go-newbest');
    if (stats.isNewHighScore) {
      newBestEl.classList.remove('hidden');
    } else {
      newBestEl.classList.add('hidden');
    }

    // Update title screen high score for when they return
    document.getElementById('title-highscore').textContent = SaveManager.getHighScore();

    this.showScreen('gameover');
  }

  showPause() {
    this.showScreen('pause');
  }
}
