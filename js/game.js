// game.js — Main game loop, state machine, orchestrator
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
import { SaveManager } from './save.js';
import { AudioManager } from './audio.js';
import { CHARACTERS, buildModel } from './characters.js';
import { Player } from './player.js';
import { TrackManager, createEnvironmentScene } from './world.js';
import { ObstacleManager } from './obstacles.js';
import { CollectibleManager, ComboTracker, PowerUpState } from './collectibles.js';
import { UIManager } from './ui.js';
import { EffectsManager } from './effects.js';

const GameState = {
  LOADING: 'LOADING',
  TITLE: 'TITLE',
  CHARACTER_SELECT: 'CHARACTER_SELECT',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  GAME_OVER: 'GAME_OVER'
};

class Game {
  constructor() {
    this.state = GameState.LOADING;
    this.score = 0;
    this.coins = 0;
    this.distance = 0;
    this.lives = 3;
    this.maxLives = 3;
    this.lastTime = 0;
    this.checkpointInterval = 1000;
    this.nextCheckpoint = 1000;
    this.audioInitialized = false;
    this.selectedCharacter = 'patty';
    this.scoreMultiplier = 1;

    // Subsystems
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.track = null;
    this.player = null;
    this.obstacles = null;
    this.collectibles = null;
    this.combo = null;
    this.powerUps = null;
    this.ui = null;
    this.effects = null;
    this.input = null;
    this.envLights = null;

    // Camera target
    this.cameraBasePos = new THREE.Vector3(0, 5, 8);
    this.cameraLookTarget = new THREE.Vector3(0, 1, -10);

    // Jetpack state
    this.jetpackActive = false;
    this.jetpackTimer = 0;
    this.jetpackOrigY = 0;

    // Duplicate (Double Stack) state
    this.duplicateActive = false;
    this.duplicateModel = null;
    this.duplicateTimer = 0;

    // Input state
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.touchStartTime = 0;
    this.lastTapTime = 0;
    this.SWIPE_THRESHOLD = 40;
    this.SWIPE_TIMEOUT = 300;
    this.TAP_THRESHOLD = 15;
    this.DOUBLETAP_INTERVAL = 300;
  }

  async init() {
    // Load save data
    SaveManager.load();
    this.selectedCharacter = SaveManager.getSelectedCharacter();

    // Three.js setup — enhanced renderer with shadows and tone mapping
    const canvas = document.getElementById('game-canvas');
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();

    // Camera — closer, lower, more cinematic (Subway Surfers style)
    this.camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      150
    );
    this.cameraBasePos.set(0, 3.5, 6);
    this.cameraLookTarget.set(0, 1.2, -8);
    this.camera.position.copy(this.cameraBasePos);
    this.camera.lookAt(this.cameraLookTarget);

    // --- Post-processing pipeline ---
    this.composer = new EffectComposer(this.renderer);

    // Base render pass
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    // Bloom for neon signs, coins, power-ups
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.4,   // strength
      0.5,   // radius
      0.7    // threshold
    );
    this.composer.addPass(bloomPass);
    this.bloomPass = bloomPass;

    // FXAA anti-aliasing
    const fxaaPass = new ShaderPass(FXAAShader);
    fxaaPass.uniforms['resolution'].value.set(
      1 / (window.innerWidth * Math.min(window.devicePixelRatio, 2)),
      1 / (window.innerHeight * Math.min(window.devicePixelRatio, 2))
    );
    this.composer.addPass(fxaaPass);
    this.fxaaPass = fxaaPass;

    // Vignette + color grading shader
    const vignetteShader = {
      uniforms: {
        tDiffuse: { value: null },
        darkness: { value: 0.5 },
        offset: { value: 1.2 },
        tint: { value: new THREE.Color(1.05, 0.95, 0.9) } // warm tint
      },
      vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float darkness;
        uniform float offset;
        uniform vec3 tint;
        varying vec2 vUv;
        void main() {
          vec4 texel = texture2D(tDiffuse, vUv);
          vec2 uv = (vUv - vec2(0.5)) * vec2(offset);
          float vignette = clamp(1.0 - dot(uv, uv), 0.0, 1.0);
          texel.rgb *= mix(vec3(1.0 - darkness), vec3(1.0), vignette);
          texel.rgb *= tint;
          gl_FragColor = texel;
        }
      `
    };
    const vignettePass = new ShaderPass(vignetteShader);
    this.composer.addPass(vignettePass);

    // Environment (lights, fog, background)
    this.envLights = createEnvironmentScene(this.scene);

    // Initialize subsystems
    this.track = new TrackManager(this.scene);
    this.player = new Player();
    this.obstacles = new ObstacleManager();
    this.obstacles.init(this.scene);
    this.collectibles = new CollectibleManager();
    this.collectibles.init(this.scene);
    this.combo = new ComboTracker();
    this.powerUps = new PowerUpState();
    this.effects = new EffectsManager();
    this.effects.init(this.scene, this.camera);
    this.ui = new UIManager();
    this.ui.init();

    // Wire UI events
    this.wireUIEvents();

    // Wire input
    this.wireInput(canvas);

    // Handle resize
    window.addEventListener('resize', () => this.onResize());

    // Show title
    this.state = GameState.TITLE;
    this.ui.showScreen('title');

    // Start render loop
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  wireUIEvents() {
    this.ui.onPlay = () => {
      this.initAudio();
      this.ui.showScreen('charselect');
      this.ui.initCharacterSelect();
      this.state = GameState.CHARACTER_SELECT;
    };

    this.ui.onCharacterSelected = (charId) => {
      this.initAudio();
      this.selectedCharacter = charId;
      this.startGame(charId);
    };

    this.ui.onPause = () => {
      if (this.state === GameState.PLAYING) {
        this.state = GameState.PAUSED;
        this.ui.showPause();
        AudioManager.pauseBGM();
      }
    };

    this.ui.onResume = () => {
      this.state = GameState.PLAYING;
      this.ui.showScreen('hud');
      AudioManager.resumeBGM();
    };

    this.ui.onRestart = () => {
      this.startGame(this.selectedCharacter);
    };

    this.ui.onMenu = () => {
      this.state = GameState.TITLE;
      AudioManager.stopBGM();
      this.cleanup();
    };

    this.ui.onSettingsChange = (key, value) => {
      if (key === 'musicVolume') AudioManager.setMusicVolume(value);
      if (key === 'sfxVolume') AudioManager.setSFXVolume(value);
    };
  }

  wireInput(element) {
    element.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (this.state !== GameState.PLAYING) return;
      this.touchStartX = e.changedTouches[0].clientX;
      this.touchStartY = e.changedTouches[0].clientY;
      this.touchStartTime = performance.now();
    }, { passive: false });

    element.addEventListener('touchend', (e) => {
      e.preventDefault();
      if (this.state !== GameState.PLAYING) return;

      const dx = e.changedTouches[0].clientX - this.touchStartX;
      const dy = e.changedTouches[0].clientY - this.touchStartY;
      const dt = performance.now() - this.touchStartTime;

      if (dt > this.SWIPE_TIMEOUT) return;

      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      // Tap detection
      if (absDx < this.TAP_THRESHOLD && absDy < this.TAP_THRESHOLD) {
        const now = performance.now();
        if (now - this.lastTapTime < this.DOUBLETAP_INTERVAL) {
          this.onDoubleTap();
          this.lastTapTime = 0;
        } else {
          this.lastTapTime = now;
        }
        return;
      }

      // Swipe detection
      if (absDx > absDy && absDx > this.SWIPE_THRESHOLD) {
        if (dx > 0) {
          this.player.moveRight();
          AudioManager.play('laneSwitch');
        } else {
          this.player.moveLeft();
          AudioManager.play('laneSwitch');
        }
      } else if (absDy > absDx && absDy > this.SWIPE_THRESHOLD) {
        if (dy < 0) {
          this.player.jump();
          AudioManager.playCharacterSound(this.selectedCharacter, 'jump');
        } else {
          this.player.slide();
          AudioManager.play('slide');
        }
      }
    }, { passive: false });

    // Keyboard fallback for desktop testing
    window.addEventListener('keydown', (e) => {
      if (this.state !== GameState.PLAYING) return;

      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
          this.player.moveLeft();
          AudioManager.play('laneSwitch');
          break;
        case 'ArrowRight':
        case 'd':
          this.player.moveRight();
          AudioManager.play('laneSwitch');
          break;
        case 'ArrowUp':
        case 'w':
        case ' ':
          this.player.jump();
          AudioManager.playCharacterSound(this.selectedCharacter, 'jump');
          break;
        case 'ArrowDown':
        case 's':
          this.player.slide();
          AudioManager.play('slide');
          break;
        case 'Escape':
          if (this.state === GameState.PLAYING) {
            this.ui.onPause();
          }
          break;
        case 'e':
          this.onDoubleTap();
          break;
      }
    });
  }

  onDoubleTap() {
    if (this.player.isAbilityReady()) {
      const activated = this.player.activateAbility();
      if (activated) {
        this.activateSpecialAbility();
      }
    }
  }

  initAudio() {
    if (!this.audioInitialized) {
      AudioManager.init();
      this.audioInitialized = true;
    }
    AudioManager.resumeContext();
  }

  async startGame(charId) {
    this.cleanup();

    this.score = 0;
    this.coins = 0;
    this.distance = 0;
    this.lives = this.maxLives;
    this.nextCheckpoint = this.checkpointInterval;
    this.scoreMultiplier = 1;
    this.jetpackActive = false;
    this.duplicateActive = false;

    this.combo.reset();
    this.powerUps.reset();

    this.track.reset();
    this.track.init();
    this.obstacles.reset();
    this.collectibles.reset();
    this.effects.deactivateAura();

    await this.player.init(charId, this.scene);
    this.selectedCharacter = charId;

    this.state = GameState.PLAYING;
    this.ui.showScreen('hud');
    AudioManager.play('menuConfirm');
    AudioManager.playBGM();
  }

  cleanup() {
    // Remove player model
    if (this.player.model) {
      this.scene.remove(this.player.model);
    }
    // Remove duplicate if exists
    if (this.duplicateModel) {
      this.scene.remove(this.duplicateModel);
      this.duplicateModel = null;
    }
    this.track.reset();
    this.obstacles.reset();
    this.collectibles.reset();
  }

  loop(timestamp) {
    requestAnimationFrame((t) => this.loop(t));

    const delta = Math.min((timestamp - this.lastTime) / 1000, 0.1);
    this.lastTime = timestamp;

    switch (this.state) {
      case GameState.PLAYING:
        this.updatePlaying(delta, timestamp / 1000);
        break;
      case GameState.CHARACTER_SELECT:
        this.ui.updateCharacterPreview(delta);
        break;
      case GameState.GAME_OVER:
        // Still render but don't update gameplay
        break;
    }

    this.composer.render();
  }

  updatePlaying(delta, time) {
    const speed = this.track.getSpeed();

    // Update distance
    this.distance += speed * delta;
    const distanceInt = Math.floor(this.distance);
    this.score = distanceInt * 10 * this.scoreMultiplier;

    // Update all systems
    this.track.update(delta);
    this.player.update(delta, time);
    this.obstacles.update(delta, speed, this.distance);
    this.collectibles.update(delta, speed, this.player.getPosition());
    this.effects.update(delta);
    this.powerUps.update(delta);

    // Jetpack flight
    if (this.jetpackActive) {
      this.jetpackTimer -= delta * 1000;
      if (this.jetpackTimer <= 0) {
        this.jetpackActive = false;
        // Land the player
      } else {
        // Float the player above the track
        this.player.model.position.y = THREE.MathUtils.lerp(
          this.player.model.position.y, 6, delta * 3
        );
      }
    }

    // Duplicate character (Double Stack ability)
    if (this.duplicateActive) {
      this.duplicateTimer -= delta * 1000;
      if (this.duplicateTimer <= 0) {
        this.duplicateActive = false;
        if (this.duplicateModel) {
          this.scene.remove(this.duplicateModel);
          this.duplicateModel = null;
        }
      } else if (this.duplicateModel) {
        // Mirror player position but offset
        this.duplicateModel.position.set(
          this.player.getPosition().x + 1.5,
          this.player.getPosition().y,
          this.player.getPosition().z - 1
        );
        this.duplicateModel.rotation.y = this.player.model.rotation.y;
      }
    }

    // Fire trail ability (Blaze)
    if (this.player.isAbilityActive() && this.selectedCharacter === 'blaze') {
      this.obstacles.destroyInPath(this.player.getPosition().x, this.player.getPosition().z);
      // Fire particles
      if (Math.random() > 0.5) {
        this.effects.emitPowerUp(
          this.player.getPosition().clone().add(new THREE.Vector3(0, 0, 1)),
          0xFF4500
        );
      }
    }

    // Sauce Flood ability (Saucy)
    if (this.player.isAbilityActive() && this.selectedCharacter === 'saucy') {
      this.obstacles.slowAll(0.2);
    } else if (!this.player.isAbilityActive() && this.selectedCharacter === 'saucy') {
      this.obstacles.resetSlow();
    }

    // Brain Freeze ability (Frosty)
    if (this.player.isAbilityActive() && this.selectedCharacter === 'frosty') {
      this.obstacles.freezeAll();
    } else if (!this.player.isAbilityActive() && this.selectedCharacter === 'frosty' && this.obstacles.frozen) {
      this.obstacles.unfreezeAll();
    }

    // Magnet powerup
    if (this.powerUps.isActive('magnet')) {
      const magnetBonus = CHARACTERS[this.selectedCharacter].stats.magnet;
      this.collectibles.setMagnetActive(true, 5 + magnetBonus);
    } else {
      this.collectibles.setMagnetActive(false);
    }

    // Score doubler powerup
    this.scoreMultiplier = this.powerUps.isActive('scoreDoubler') ? 2 : 1;

    // Collision: obstacles
    if (!this.player.isInvincible() && !this.jetpackActive) {
      const hit = this.obstacles.checkCollision(this.player.getCollisionBox());
      if (hit) {
        // Check shield first
        if (this.powerUps.consumeShield()) {
          this.effects.emitPowerUp(this.player.getPosition(), 0x44FF44);
          AudioManager.play('powerUp');
          this.obstacles.release(hit);
        } else {
          this.onPlayerHit();
        }
      }
    }

    // Collision: collectibles
    const collected = this.collectibles.checkCollection(this.player.getCollisionBox());
    for (const item of collected) {
      this.onCollect(item);
    }

    // Checkpoint
    if (this.distance >= this.nextCheckpoint) {
      this.onCheckpoint();
    }

    // Update ability aura
    if (this.player.isAbilityActive()) {
      const config = CHARACTERS[this.selectedCharacter];
      this.effects.activateAura(config.ability.color);
      this.effects.updateAura(delta, this.player.getPosition());
    } else {
      this.effects.deactivateAura();
    }

    // Speed lines
    this.effects.setSpeedLines(speed, 35);

    // Camera follow — smooth, cinematic, tracks player lane
    const playerPos = this.player.getPosition();
    const targetCamX = playerPos.x * 0.4;
    const targetCamY = this.jetpackActive ? 8 : this.cameraBasePos.y;
    this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, targetCamX, delta * 6);
    this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, targetCamY, delta * 4);

    // Look target tracks player slightly
    const lookTarget = this.cameraLookTarget.clone();
    lookTarget.x = playerPos.x * 0.3;
    lookTarget.y = playerPos.y + 1.2;
    this.camera.lookAt(lookTarget);

    // Move warm light with player
    if (this.envLights && this.envLights.warmLight) {
      this.envLights.warmLight.position.x = this.player.getPosition().x;
    }

    // Update HUD
    this.ui.updateHUD({
      score: this.score,
      coins: this.coins,
      distance: distanceInt,
      lives: this.lives,
      combo: this.combo.multiplier,
      abilityCharge: this.player.getAbilityCharge()
    });

    // Update powerup indicator
    let hasActivePowerup = false;
    let powerupProgress = 0;
    for (const type of ['coinMultiplier', 'magnet', 'scoreDoubler', 'jetpack']) {
      if (this.powerUps.isActive(type)) {
        hasActivePowerup = true;
        const remaining = this.powerUps.getRemaining(type);
        // Rough max for display
        powerupProgress = Math.max(0, remaining / 15000);
        break;
      }
    }
    this.ui.showPowerupIndicator(hasActivePowerup, powerupProgress);
  }

  onPlayerHit() {
    this.lives--;
    this.combo.reset();
    this.effects.shakeScreen(0.5);
    this.effects.emitHit(this.player.getPosition());
    AudioManager.play('hit');
    this.player.hit();

    if (this.lives <= 0) {
      this.onDeath();
    }
  }

  onDeath() {
    this.state = GameState.GAME_OVER;
    this.player.die();

    const config = CHARACTERS[this.selectedCharacter];
    this.effects.emitDeath(this.player.getPosition(), config.colors.primary);
    AudioManager.play('gameOver');
    AudioManager.stopBGM();

    // Save stats
    const isNewHigh = this.score > SaveManager.getHighScore();
    if (isNewHigh) SaveManager.setHighScore(this.score);
    SaveManager.addCoins(this.coins);
    SaveManager.addRun(Math.floor(this.distance));

    // Show game over after brief delay
    setTimeout(() => {
      this.ui.showGameOver({
        score: this.score,
        distance: Math.floor(this.distance),
        coins: this.coins,
        isNewHighScore: isNewHigh
      });
    }, 1200);
  }

  onCollect(item) {
    if (item.type === 'coin') {
      const comboMult = this.combo.collect();
      const powerupMult = this.powerUps.getCoinMultiplier();
      const total = item.value * comboMult * powerupMult;
      this.coins += total;

      this.effects.emitCoins(item.position);
      AudioManager.play('coinCollect');

      // Ability charge from coins
      this.player.addAbilityCharge(1);

      if (comboMult > 1) {
        this.effects.showComboText(comboMult);
      }
      if (comboMult >= 2 && this.combo.streak === this.combo.thresholds[0]) {
        AudioManager.play('comboUp');
      }
    } else if (item.type === 'powerup') {
      this.effects.emitPowerUp(item.position, item.color);
      AudioManager.play('powerUp');

      switch (item.effect) {
        case 'coinMultiplier':
          this.powerUps.activate('coinMultiplier', item.duration);
          break;
        case 'jetpack':
          this.jetpackActive = true;
          this.jetpackTimer = item.duration;
          break;
        case 'shield':
          this.powerUps.activate('shield', 0);
          break;
        case 'magnet':
          this.powerUps.activate('magnet', item.duration);
          break;
        case 'scoreDoubler':
          this.powerUps.activate('scoreDoubler', item.duration);
          break;
        case 'abilityCharge':
          this.player.addAbilityCharge(25);
          break;
      }
    }
  }

  activateSpecialAbility() {
    const charId = this.selectedCharacter;
    AudioManager.play('abilityActivate');

    switch (charId) {
      case 'patty':
        // Double Stack — create duplicate
        this.duplicateActive = true;
        this.duplicateTimer = CHARACTERS.patty.ability.duration;
        this.duplicateModel = buildModel('patty');
        this.duplicateModel.position.copy(this.player.getPosition());
        this.duplicateModel.position.x += 1.5;
        this.scene.add(this.duplicateModel);
        break;

      case 'crispy':
        // Crispy Dash — invincible speed burst
        // Player is invincible via abilityActive flag
        // Visual: orange aura handled by aura system
        break;

      case 'frosty':
        // Brain Freeze — handled in update loop
        break;

      case 'blaze':
        // Five Alarm — handled in update loop
        break;

      case 'saucy':
        // Sauce Flood — handled in update loop
        break;

      case 'turbo':
        // Warp Drive — teleport 200m ahead
        this.distance += 200;
        this.score += 2000;
        // Visual warp effect
        this.effects.emitPowerUp(this.player.getPosition(), 0x00BFFF);
        this.effects.shakeScreen(0.3);
        break;
    }
  }

  onCheckpoint() {
    this.nextCheckpoint += this.checkpointInterval;
    this.effects.showCheckpoint(Math.floor(this.distance));
    this.effects.emitCheckpoint(this.player.getPosition());
    AudioManager.play('checkpoint');
  }

  onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const pr = Math.min(window.devicePixelRatio, 2);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
    if (this.fxaaPass) {
      this.fxaaPass.uniforms['resolution'].value.set(1 / (w * pr), 1 / (h * pr));
    }
    if (this.bloomPass) {
      this.bloomPass.resolution.set(w, h);
    }
  }
}

// Bootstrap
const game = new Game();
game.init();
