// game.js — Temple Run style endless runner
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { Player } from './player.js';
import { TrackManager, DIR_VECTORS } from './track.js';
import { AudioManager } from './audio.js';
import { SaveManager } from './save.js';

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

    // Input
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.touchStartTime = 0;

    // Camera smoothing
    this.camPos = new THREE.Vector3();
    this.camLook = new THREE.Vector3();
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
        if (dx > 0) this.handleTurn('right');
        else this.handleTurn('left');
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
        case 'ArrowLeft': case 'a': this.handleTurn('left'); break;
        case 'ArrowRight': case 'd': this.handleTurn('right'); break;
        case 'ArrowUp': case 'w': case ' ': this.player.jump(); AudioManager.play('jump'); break;
        case 'ArrowDown': case 's': this.player.slide(); AudioManager.play('slide'); break;
        case 'Escape': this.pause(); break;
      }
    });
  }

  handleTurn(dir) {
    const playerPos = this.player.getPosition();
    const currentSeg = this.track.getCurrentSegment(playerPos);
    if (!currentSeg) return;

    const nextSeg = this.track.getNextSegment(currentSeg);
    if (!nextSeg) return;

    // Is the next segment a turn?
    const nextDir = nextSeg.direction;
    const curDir = currentSeg.direction;
    if (nextDir === curDir) return; // Next is straight, no turn needed

    // Allow turning in the second half of the segment (very generous)
    // Don't require complete — just check if player is past the midpoint
    const mid = currentSeg.startPos.clone().add(currentSeg.endPos).multiplyScalar(0.5);
    let pastMid = false;
    switch (curDir) {
      case 0: pastMid = playerPos.z < mid.z; break;
      case 1: pastMid = playerPos.x > mid.x; break;
      case 2: pastMid = playerPos.z > mid.z; break;
      case 3: pastMid = playerPos.x < mid.x; break;
    }
    if (!pastMid) return; // Too early, haven't reached turn zone

    // Execute the turn regardless of left/right — just go to the next segment's direction
    const leftDir = (curDir - 1 + 4) % 4;
    const rightDir = (curDir + 1) % 4;

    if (dir === 'left' && nextDir === leftDir) {
      this.player.turnLeft();
      this.snapPlayer(currentSeg);
      AudioManager.play('laneSwitch');
    } else if (dir === 'right' && nextDir === rightDir) {
      this.player.turnRight();
      this.snapPlayer(currentSeg);
      AudioManager.play('laneSwitch');
    } else if (nextDir === leftDir || nextDir === rightDir) {
      // Player pressed wrong direction but there IS a turn — be forgiving, turn anyway
      if (nextDir === leftDir) this.player.turnLeft();
      else this.player.turnRight();
      this.snapPlayer(currentSeg);
      AudioManager.play('laneSwitch');
    }
  }

  snapPlayer(seg) {
    const pos = this.player.getPosition();
    // Snap to the turn intersection point
    pos.x = seg.endPos.x;
    pos.z = seg.endPos.z;
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
    await this.player.init(this.scene);

    // Initialize camera position behind player
    const pp = this.player.getPosition();
    this.camPos.set(pp.x, pp.y + 2.2, pp.z + 4);
    this.camLook.set(pp.x, pp.y + 1, pp.z - 3);
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);

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

    this.distance += speed * delta;
    this.score = Math.floor(this.distance) * 10;

    // Check missed turn
    const seg = this.track.getCurrentSegment(pp);
    if (seg) {
      const next = this.track.getNextSegment(seg);
      if (next && seg.checkOvershot(pp) && next.direction !== seg.direction) {
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

    // Camera: behind and slightly above player, follows direction
    this.updateCamera(delta);

    // Move lights
    this.dirLight.position.set(pp.x + 2, pp.y + 6, pp.z + 3);
    this.dirLight.target.position.copy(pp);
    this.playerLight.position.set(pp.x, pp.y + 1.5, pp.z);

    this.updateHUD();
  }

  updateCamera(delta) {
    const pos = this.player.getPosition();
    const dir = this.player.getDirection();

    // Camera behind player: 4 units back, 2.2 units up
    const behind = DIR_VECTORS[dir].clone().multiplyScalar(-4);
    const targetPos = new THREE.Vector3(
      pos.x + behind.x,
      pos.y + 2.2,
      pos.z + behind.z
    );

    // Look ahead: 3 units forward, 1 unit up
    const ahead = DIR_VECTORS[dir].clone().multiplyScalar(3);
    const targetLook = new THREE.Vector3(
      pos.x + ahead.x,
      pos.y + 1,
      pos.z + ahead.z
    );

    // Smooth interpolation (fast enough to feel responsive)
    const lerpSpeed = delta * 10;
    this.camPos.lerp(targetPos, Math.min(lerpSpeed, 1));
    this.camLook.lerp(targetLook, Math.min(lerpSpeed, 1));

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
