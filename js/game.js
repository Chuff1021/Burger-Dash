// game.js — Temple Run style endless runner
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { Player } from './player.js';
import { TrackManager, DIR_VECTORS } from './track.js';
import { AudioManager } from './audio.js';
import { SaveManager } from './save.js';
import { EffectsManager } from './effects.js';
import { ObstacleManager } from './obstacles.js';
import { CollectibleManager } from './collectibles.js';
import { ChaserManager } from './chaser.js';

const State = { LOADING: 0, TITLE: 1, PLAYING: 2, PAUSED: 3, GAME_OVER: 4 };

class Game {
  constructor() {
    this.state = State.LOADING;
    this.score = 0;
    this.distance = 0;
    this.coins = 0;
    this.lives = 3;
    this.lastTime = 0;
    this.audioInitialized = false;
    this.lastCheckpoint = 0;
    this.lastGrounded = true;
    this.cameraTurnBlend = 1;
    this.cameraFromDir = 0;
    this.cameraToDir = 0;

    // Input
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.touchStartTime = 0;

    // Camera smoothing
    this.camPos = new THREE.Vector3();
    this.camLook = new THREE.Vector3();
    this.lastObstacleHits = 0;
  }

  async init() {
    SaveManager.load();

    const canvas = document.getElementById('game-canvas');
    this.renderer = new THREE.WebGLRenderer({
      canvas, antialias: true, powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0608);
    this.scene.fog = new THREE.FogExp2(0x0a0608, 0.018);

    // Camera — Temple Run: low, close behind player
    this.camera = new THREE.PerspectiveCamera(
      65, window.innerWidth / window.innerHeight, 0.1, 80
    );

    // Lighting — minimal for performance
    this.scene.add(new THREE.AmbientLight(0xffeedd, 0.35));
    this.scene.add(new THREE.HemisphereLight(0x8888cc, 0x443322, 0.2));

    this.dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
    this.dirLight.position.set(3, 6, 5);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.set(512, 512); // smaller = faster
    this.dirLight.shadow.camera.near = 0.5;
    this.dirLight.shadow.camera.far = 25;
    this.dirLight.shadow.camera.left = -8;
    this.dirLight.shadow.camera.right = 8;
    this.dirLight.shadow.camera.top = 8;
    this.dirLight.shadow.camera.bottom = -8;
    this.dirLight.shadow.bias = -0.003;
    this.scene.add(this.dirLight);
    this.scene.add(this.dirLight.target);

    // Player warm light
    this.playerLight = new THREE.PointLight(0xFF8C00, 0.6, 10);
    this.scene.add(this.playerLight);

    // Post-processing (bloom only — keep it light for perf)
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.3, 0.4, 0.8
    );
    this.composer.addPass(bloom);
    this.bloomPass = bloom;

    // Subsystems
    this.track = new TrackManager(this.scene);
    this.player = new Player();
    this.effects = new EffectsManager();
    this.effects.init(this.scene, this.camera);
    this.obstacles = new ObstacleManager();
    this.collectibles = new CollectibleManager();
    this.chaser = new ChaserManager();
    this.chaser.init(this.scene);

    // Input
    this.wireInput(canvas);
    window.addEventListener('resize', () => this.onResize());
    this.wireUI();

    this.state = State.TITLE;
    this.showScreen('title');
    document.getElementById('title-highscore').textContent = SaveManager.getHighScore();

    this.lastTime = performance.now();
    requestAnimationFrame(t => this.loop(t));
  }

  wireInput(el) {
    // Touch controls for iPhone
    el.addEventListener('touchstart', e => {
      e.preventDefault();
      if (this.state !== State.PLAYING) return;
      const t = e.changedTouches[0];
      this.touchStartX = t.clientX;
      this.touchStartY = t.clientY;
      this.touchStartTime = performance.now();
    }, { passive: false });

    el.addEventListener('touchend', e => {
      e.preventDefault();
      if (this.state !== State.PLAYING) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - this.touchStartX;
      const dy = t.clientY - this.touchStartY;
      const dt = performance.now() - this.touchStartTime;
      if (dt > 500) return;

      const ax = Math.abs(dx), ay = Math.abs(dy);
      const threshold = 30; // lower = more responsive

      if (ax < threshold && ay < threshold) return; // tap, ignore

      if (ax > ay) {
        // Horizontal = TURN
        if (dx > 0) this.handleHorizontal('right');
        else this.handleHorizontal('left');
      } else {
        // Vertical = jump/slide
        if (dy < 0) { this.player.jump(); AudioManager.play('jump'); }
        else { this.player.slide(); AudioManager.play('slide'); }
      }
    }, { passive: false });

    // Keyboard
    window.addEventListener('keydown', e => {
      if (this.state !== State.PLAYING) return;
      switch (e.key) {
        case 'ArrowLeft': case 'a': this.handleHorizontal('left'); break;
        case 'ArrowRight': case 'd': this.handleHorizontal('right'); break;
        case 'ArrowUp': case 'w': case ' ': this.player.jump(); AudioManager.play('jump'); break;
        case 'ArrowDown': case 's': this.player.slide(); AudioManager.play('slide'); break;
        case 'Escape': this.pause(); break;
      }
    });
  }

  handleHorizontal(dir) {
    const playerPos = this.player.getPosition();
    const currentSeg = this.track.getCurrentSegment(playerPos);
    if (!currentSeg) return;

    const nextSeg = this.track.getNextSegment(currentSeg);
    const nextDir = nextSeg?.direction;
    const curDir = currentSeg.direction;
    const turnZoneStart = 0.68;
    const segLength = currentSeg.startPos.distanceTo(currentSeg.endPos);
    const progress = Math.min(1, currentSeg.startPos.distanceTo(playerPos) / Math.max(segLength, 0.001));
    const inTurnZone = progress >= turnZoneStart && nextSeg && nextDir !== curDir;

    if (inTurnZone) {
      const leftDir = (curDir - 1 + 4) % 4;
      const rightDir = (curDir + 1) % 4;
      if ((dir === 'left' && nextDir === leftDir) || (dir === 'right' && nextDir === rightDir) || nextDir === leftDir || nextDir === rightDir) {
        this.beginCameraTurn(curDir, nextDir);
        if (nextDir === leftDir) this.player.turnLeft();
        else this.player.turnRight();
        this.snapPlayer(currentSeg);
        AudioManager.play('laneSwitch');
        return;
      }
    }

    const laneMoved = this.player.moveLane(dir === 'left' ? -1 : 1);
    if (laneMoved) AudioManager.play('laneSwitch');
  }

  snapPlayer(seg) {
    const pos = this.player.getPosition();
    // Snap to the turn intersection point
    pos.x = seg.endPos.x;
    pos.z = seg.endPos.z;
  }

  beginCameraTurn(fromDir, toDir) {
    this.cameraFromDir = fromDir;
    this.cameraToDir = toDir;
    this.cameraTurnBlend = 0;
  }

  wireUI() {
    document.getElementById('btn-play').onclick = () => { this.initAudio(); this.startGame(); };
    document.getElementById('btn-retry').onclick = () => this.startGame();
    document.getElementById('btn-go-menu').onclick = () => { this.showScreen('title'); this.state = State.TITLE; };
    document.getElementById('btn-resume').onclick = () => this.resume();
    document.getElementById('btn-restart').onclick = () => this.startGame();
    document.getElementById('btn-pause-menu').onclick = () => { this.showScreen('title'); this.state = State.TITLE; AudioManager.stopBGM(); };
    document.getElementById('hud-pause').onclick = e => { e.stopPropagation(); this.pause(); };
    document.getElementById('btn-settings-open').onclick = () => this.showScreen('settings');
    document.getElementById('btn-settings-back').onclick = () => this.showScreen('title');
  }

  initAudio() {
    if (!this.audioInitialized) { AudioManager.init(); this.audioInitialized = true; }
    AudioManager.resumeContext();
  }

  async startGame() {
    this.initAudio();
    this.score = 0; this.coins = 0; this.distance = 0; this.lives = 3;

    this.track.reset();
    this.track.init();
    await Promise.all([
      this.player.init(this.scene),
      this.obstacles.init(this.scene),
      this.collectibles.init(this.scene)
    ]);
    this.obstacles.reset();
    this.collectibles.reset();
    this.chaser.reset();
    this.lastCheckpoint = 0;
    this.lastObstacleHits = 0;
    this.cameraTurnBlend = 1;
    this.cameraFromDir = this.player.getDirection();
    this.cameraToDir = this.player.getDirection();

    // Initialize camera position behind player
    const pp = this.player.getPosition();
    this.camPos.set(pp.x, pp.y + 2.2, pp.z + 4);
    this.camLook.set(pp.x, pp.y + 1, pp.z - 3);
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);

    this.lastGrounded = true;
    this.state = State.PLAYING;
    this.showScreen('hud');
    AudioManager.playBGM();
    this.updateHUD();
  }

  pause() {
    if (this.state !== State.PLAYING) return;
    this.state = State.PAUSED;
    this.showScreen('pause');
    AudioManager.pauseBGM();
  }

  resume() {
    this.state = State.PLAYING;
    this.showScreen('hud');
    AudioManager.resumeBGM();
  }

  loop(ts) {
    requestAnimationFrame(t => this.loop(t));
    const delta = Math.min((ts - this.lastTime) / 1000, 0.05); // cap at 50ms
    this.lastTime = ts;

    if (this.state === State.PLAYING) this.updatePlaying(delta);

    this.composer.render();
  }

  updatePlaying(delta) {
    const speed = this.track.getSpeed();
    const pp = this.player.getPosition();

    this.track.update(delta, pp);
    this.player.update(delta, speed);

    const nextPlayerPos = this.player.getPosition();
    this.distance += speed * delta;
    this.score = Math.floor(this.distance) * 10 + this.coins * 25;

    const landedThisFrame = !this.lastGrounded && this.player.isGrounded;
    if (landedThisFrame) {
      this.effects.emitCoins(nextPlayerPos.clone().add(new THREE.Vector3(0, 0.05, 0)));
    }
    this.lastGrounded = this.player.isGrounded;

    const collectedCoins = this.collectibles.update(delta, this.track, this.player, this.effects);
    if (collectedCoins > 0) {
      this.coins += collectedCoins;
      this.chaser.onCoinCollect(collectedCoins);
      AudioManager.play('coinCollect');
    }

    const obstacleHits = this.obstacles.update(delta, this.track, this.player, this.effects);
    if (obstacleHits > 0) {
      this.lives = Math.max(0, this.lives - obstacleHits);
      this.chaser.onPlayerHit();
      if (this.player.hit()) {
        AudioManager.play('hit');
      }
      if (this.lives <= 0) { this.onDeath(); return; }
    }

    const checkpoint = Math.floor(this.distance / 500) * 500;
    if (checkpoint > 0 && checkpoint !== this.lastCheckpoint) {
      this.lastCheckpoint = checkpoint;
      this.chaser.onCheckpoint();
      this.effects.emitCheckpoint(nextPlayerPos.clone());
      this.effects.showCheckpoint(checkpoint);
      AudioManager.play('checkpoint');
    }

    // Check missed turn
    const seg = this.track.getCurrentSegment(nextPlayerPos);
    if (seg) {
      const next = this.track.getNextSegment(seg);
      if (next && seg.checkOvershot(nextPlayerPos) && next.direction !== seg.direction) {
        // Player missed the turn — take damage and auto-correct
        if (this.player.getDirection() === seg.direction) {
          this.lives--;
          this.player.hit();
          AudioManager.play('hit');

          // Auto-turn to survive
          const leftDir = (seg.direction - 1 + 4) % 4;
          if (next.direction === leftDir) this.player.turnLeft();
          else this.player.turnRight();
          this.snapPlayer(seg);

          if (this.lives <= 0) { this.onDeath(); return; }
        }
      }
    }

    this.chaser.onGoodRun(delta, this.track.getSpeed());
    const chaseState = this.chaser.update(delta, this.player, this.track.getSpeed());
    if (chaseState.caught) {
      this.lives = 0;
      this.onDeath();
      return;
    }

    // Camera: behind and slightly above player, follows direction
    this.updateCamera(delta);

    // Move lights
    this.dirLight.position.set(nextPlayerPos.x + 2, nextPlayerPos.y + 6, nextPlayerPos.z + 3);
    this.dirLight.target.position.copy(nextPlayerPos);
    this.playerLight.position.set(nextPlayerPos.x, nextPlayerPos.y + 1.5, nextPlayerPos.z);

    this.effects.setSpeedLines(this.track.getSpeed(), this.track.maxSpeed);
    this.effects.updateAura(delta, nextPlayerPos);
    this.effects.update(delta);

    this.updateHUD();
  }

  updateCamera(delta) {
    const pos = this.player.getPosition();
    const activeDir = this.player.getDirection();

    if (this.cameraTurnBlend < 1) {
      this.cameraTurnBlend = Math.min(1, this.cameraTurnBlend + delta * 3.4);
      if (this.cameraTurnBlend >= 1) {
        this.cameraFromDir = activeDir;
        this.cameraToDir = activeDir;
      }
    } else {
      this.cameraFromDir = activeDir;
      this.cameraToDir = activeDir;
    }

    const blend = THREE.MathUtils.smoothstep(this.cameraTurnBlend, 0, 1);
    const fromBehind = DIR_VECTORS[this.cameraFromDir].clone().multiplyScalar(-4.6);
    const toBehind = DIR_VECTORS[this.cameraToDir].clone().multiplyScalar(-4.1);
    const behind = fromBehind.lerp(toBehind, blend);

    const fromAhead = DIR_VECTORS[this.cameraFromDir].clone().multiplyScalar(3.4);
    const toAhead = DIR_VECTORS[this.cameraToDir].clone().multiplyScalar(4.2);
    const ahead = fromAhead.lerp(toAhead, blend);

    const bankOffset = DIR_VECTORS[(activeDir + 1) % 4].clone().multiplyScalar(this.player.turnLean * 0.9);

    const targetPos = new THREE.Vector3(
      pos.x + behind.x + bankOffset.x,
      pos.y + 2.25 + Math.abs(this.player.turnLean) * 0.18,
      pos.z + behind.z + bankOffset.z
    );

    const targetLook = new THREE.Vector3(
      pos.x + ahead.x,
      pos.y + 1.05,
      pos.z + ahead.z
    );

    const followSharpness = this.cameraTurnBlend < 1 ? 7.5 : 10.5;
    const lerpSpeed = Math.min(delta * followSharpness, 1);
    this.camPos.lerp(targetPos, lerpSpeed);
    this.camLook.lerp(targetLook, Math.min(delta * (followSharpness + 1.5), 1));

    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);
  }

  onDeath() {
    this.state = State.GAME_OVER;
    this.player.die();
    AudioManager.play('gameOver');
    AudioManager.stopBGM();

    const isNew = this.score > SaveManager.getHighScore();
    if (isNew) SaveManager.setHighScore(this.score);
    SaveManager.addCoins(this.coins);
    SaveManager.addRun(Math.floor(this.distance));

    setTimeout(() => {
      document.getElementById('go-score').textContent = this.score.toLocaleString();
      document.getElementById('go-best').textContent = SaveManager.getHighScore().toLocaleString();
      document.getElementById('go-distance').textContent = Math.floor(this.distance) + 'm';
      document.getElementById('go-coins').textContent = this.coins;
      const nb = document.getElementById('go-newbest');
      if (isNew) nb.classList.remove('hidden'); else nb.classList.add('hidden');
      document.getElementById('title-highscore').textContent = SaveManager.getHighScore();
      this.showScreen('gameover');
    }, 1000);
  }

  updateHUD() {
    document.getElementById('hud-score').textContent = this.score.toLocaleString();
    document.getElementById('hud-distance').textContent = Math.floor(this.distance) + 'm';
    document.getElementById('hud-coin-count').textContent = this.coins;
    const chaserInfo = document.getElementById('hud-powerup-icon');
    if (chaserInfo) {
      const pressure = THREE.MathUtils.clamp(1 - ((this.chaser.distance - this.chaser.catchDistance) / (this.chaser.maxDistance - this.chaser.catchDistance)), 0, 1);
      chaserInfo.textContent = pressure > 0.7 ? 'BEAST CLOSE' : pressure > 0.4 ? 'BEAST NEAR' : 'BEAST BACK';
      chaserInfo.parentElement?.classList.remove('hidden');
    }
    const arc = document.getElementById('hud-powerup-arc');
    if (arc) {
      const pressure = THREE.MathUtils.clamp(1 - ((this.chaser.distance - this.chaser.catchDistance) / (this.chaser.maxDistance - this.chaser.catchDistance)), 0, 1);
      arc.setAttribute('stroke', pressure > 0.68 ? '#FF5A36' : pressure > 0.38 ? '#FFD447' : '#4DFF88');
      arc.setAttribute('stroke-dashoffset', String(113 - pressure * 113));
    }
    const el = document.getElementById('hud-lives');
    let h = '';
    for (let i = 0; i < 3; i++) h += `<span class="life-icon${i >= this.lives ? ' lost' : ''}">&#10084;</span>`;
    el.innerHTML = h;
  }

  showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById('screen-' + id) || document.getElementById(id);
    if (el) el.classList.add('active');
  }

  onResize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
    if (this.bloomPass) this.bloomPass.resolution.set(w, h);
  }
}

new Game().init();
