// game.js — Temple Run style endless runner: turning corridors
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
import { Player } from './player.js';
import { TrackManager, DIR_VECTORS } from './track.js';
import { AudioManager } from './audio.js';
import { SaveManager } from './save.js';
import { EffectsManager } from './effects.js';

const State = {
  LOADING: 0,
  TITLE: 1,
  PLAYING: 2,
  PAUSED: 3,
  GAME_OVER: 4,
};

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
    this.SWIPE_THRESHOLD = 40;
    this.SWIPE_TIMEOUT = 400;
  }

  async init() {
    SaveManager.load();

    // --- Renderer ---
    const canvas = document.getElementById('game-canvas');
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // --- Scene ---
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0608);
    this.scene.fog = new THREE.FogExp2(0x0a0608, 0.025);

    // --- Camera (close behind player, Temple Run style) ---
    this.camera = new THREE.PerspectiveCamera(
      65, window.innerWidth / window.innerHeight, 0.1, 100
    );

    // --- Lighting ---
    const ambient = new THREE.AmbientLight(0xffeedd, 0.3);
    this.scene.add(ambient);

    const hemi = new THREE.HemisphereLight(0x8888cc, 0x443322, 0.2);
    this.scene.add(hemi);

    this.dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    this.dirLight.position.set(3, 8, 5);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.set(1024, 1024);
    this.dirLight.shadow.camera.near = 0.5;
    this.dirLight.shadow.camera.far = 30;
    this.dirLight.shadow.camera.left = -10;
    this.dirLight.shadow.camera.right = 10;
    this.dirLight.shadow.camera.top = 10;
    this.dirLight.shadow.camera.bottom = -10;
    this.dirLight.shadow.bias = -0.002;
    this.scene.add(this.dirLight);

    // Player spotlight
    this.playerLight = new THREE.PointLight(0xFF8C00, 0.8, 12);
    this.scene.add(this.playerLight);

    // --- Post-processing ---
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));

    const bloom = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.35, 0.5, 0.75
    );
    this.composer.addPass(bloom);
    this.bloomPass = bloom;

    const fxaa = new ShaderPass(FXAAShader);
    const pr = Math.min(window.devicePixelRatio, 2);
    fxaa.uniforms['resolution'].value.set(
      1 / (window.innerWidth * pr), 1 / (window.innerHeight * pr)
    );
    this.composer.addPass(fxaa);
    this.fxaaPass = fxaa;

    // Vignette
    const vignetteShader = {
      uniforms: {
        tDiffuse: { value: null },
        darkness: { value: 0.6 },
        offset: { value: 1.1 },
      },
      vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      fragmentShader: `
        uniform sampler2D tDiffuse;uniform float darkness;uniform float offset;varying vec2 vUv;
        void main(){vec4 c=texture2D(tDiffuse,vUv);vec2 u=(vUv-0.5)*vec2(offset);
        c.rgb*=mix(vec3(1.0-darkness),vec3(1.0),clamp(1.0-dot(u,u),0.0,1.0));
        c.rgb*=vec3(1.03,0.97,0.92);gl_FragColor=c;}
      `
    };
    this.composer.addPass(new ShaderPass(vignetteShader));

    // --- Subsystems ---
    this.track = new TrackManager(this.scene);
    this.player = new Player();
    this.effects = new EffectsManager();
    this.effects.init(this.scene, this.camera);

    // --- Input ---
    this.wireInput(canvas);
    window.addEventListener('resize', () => this.onResize());

    // --- UI Events ---
    this.wireUI();

    // Show title
    this.state = State.TITLE;
    this.showScreen('title');

    // Render loop
    this.lastTime = performance.now();
    requestAnimationFrame(t => this.loop(t));
  }

  wireInput(el) {
    el.addEventListener('touchstart', e => {
      e.preventDefault();
      if (this.state !== State.PLAYING) return;
      this.touchStartX = e.changedTouches[0].clientX;
      this.touchStartY = e.changedTouches[0].clientY;
      this.touchStartTime = performance.now();
    }, { passive: false });

    el.addEventListener('touchend', e => {
      e.preventDefault();
      if (this.state !== State.PLAYING) return;
      const dx = e.changedTouches[0].clientX - this.touchStartX;
      const dy = e.changedTouches[0].clientY - this.touchStartY;
      const dt = performance.now() - this.touchStartTime;
      if (dt > this.SWIPE_TIMEOUT) return;

      const ax = Math.abs(dx), ay = Math.abs(dy);
      if (ax < this.SWIPE_THRESHOLD && ay < this.SWIPE_THRESHOLD) return;

      if (ax > ay) {
        // Horizontal swipe = TURN
        if (dx > 0) this.onTurnRight();
        else this.onTurnLeft();
      } else {
        // Vertical swipe = jump/slide
        if (dy < 0) this.player.jump();
        else this.player.slide();
      }
    }, { passive: false });

    window.addEventListener('keydown', e => {
      if (this.state !== State.PLAYING) return;
      switch (e.key) {
        case 'ArrowLeft': case 'a': this.onTurnLeft(); break;
        case 'ArrowRight': case 'd': this.onTurnRight(); break;
        case 'ArrowUp': case 'w': case ' ': this.player.jump(); break;
        case 'ArrowDown': case 's': this.player.slide(); break;
        case 'Escape': this.pause(); break;
      }
    });
  }

  wireUI() {
    document.getElementById('btn-play').addEventListener('click', () => {
      this.initAudio();
      this.startGame();
    });
    document.getElementById('btn-retry').addEventListener('click', () => this.startGame());
    document.getElementById('btn-go-menu').addEventListener('click', () => {
      this.showScreen('title');
      this.state = State.TITLE;
    });
    document.getElementById('btn-resume').addEventListener('click', () => this.resume());
    document.getElementById('btn-restart').addEventListener('click', () => this.startGame());
    document.getElementById('btn-pause-menu').addEventListener('click', () => {
      this.showScreen('title');
      this.state = State.TITLE;
    });
    document.getElementById('hud-pause').addEventListener('click', e => {
      e.stopPropagation();
      this.pause();
    });
    document.getElementById('btn-settings-open').addEventListener('click', () => this.showScreen('settings'));
    document.getElementById('btn-settings-back').addEventListener('click', () => this.showScreen('title'));
  }

  onTurnLeft() {
    const seg = this.track.getCurrentSegment(this.player.getPosition());
    if (!seg) return;

    // Check if the next segment exists and requires a left turn
    const nextSeg = this.track.getNextSegment(seg);
    if (nextSeg && seg.complete) {
      const expectedDir = (seg.direction - 1 + 4) % 4;
      if (nextSeg.direction === expectedDir) {
        this.player.turnLeft();
        // Snap player to the turn point
        this.snapPlayerToTurn(seg);
        AudioManager.play('laneSwitch');
        return;
      }
    }
    // Wrong turn or too early — could penalize
  }

  onTurnRight() {
    const seg = this.track.getCurrentSegment(this.player.getPosition());
    if (!seg) return;

    const nextSeg = this.track.getNextSegment(seg);
    if (nextSeg && seg.complete) {
      const expectedDir = (seg.direction + 1) % 4;
      if (nextSeg.direction === expectedDir) {
        this.player.turnRight();
        this.snapPlayerToTurn(seg);
        AudioManager.play('laneSwitch');
        return;
      }
    }
  }

  snapPlayerToTurn(currentSeg) {
    // Snap player position to the end of the current segment
    const endPos = currentSeg.endPos;
    const pos = this.player.getPosition();
    const dir = currentSeg.direction;

    // Align the axis perpendicular to movement direction
    if (dir === 0 || dir === 2) {
      pos.x = endPos.x;
    } else {
      pos.z = endPos.z;
    }
  }

  initAudio() {
    if (!this.audioInitialized) {
      AudioManager.init();
      this.audioInitialized = true;
    }
    AudioManager.resumeContext();
  }

  async startGame() {
    this.initAudio();

    this.score = 0;
    this.coins = 0;
    this.distance = 0;
    this.lives = 3;

    this.track.reset();
    this.track.init();

    await this.player.init(this.scene);

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

  loop(timestamp) {
    requestAnimationFrame(t => this.loop(t));

    const delta = Math.min((timestamp - this.lastTime) / 1000, 0.1);
    this.lastTime = timestamp;

    if (this.state === State.PLAYING) {
      this.updatePlaying(delta);
    }

    this.composer.render();
  }

  updatePlaying(delta) {
    const speed = this.track.getSpeed();
    const playerPos = this.player.getPosition();

    // Update track
    this.track.update(delta, playerPos);

    // Update player
    this.player.update(delta, speed);

    // Distance & score
    this.distance += speed * delta;
    this.score = Math.floor(this.distance) * 10;

    // Update effects
    this.effects.update(delta);

    // Check if player missed a turn (overshot)
    const currentSeg = this.track.getCurrentSegment(playerPos);
    if (currentSeg && currentSeg.checkOvershot(playerPos)) {
      const nextSeg = this.track.getNextSegment(currentSeg);
      if (nextSeg && nextSeg.direction !== currentSeg.direction) {
        // Player missed the turn!
        if (this.player.getDirection() === currentSeg.direction) {
          this.onPlayerHit();
          // Force the turn
          if (nextSeg.direction === (currentSeg.direction - 1 + 4) % 4) {
            this.player.turnLeft();
          } else {
            this.player.turnRight();
          }
          this.snapPlayerToTurn(currentSeg);
        }
      }
    }

    // Camera follow — behind and above player based on direction
    this.updateCamera(delta);

    // Move lights with player
    this.dirLight.position.set(
      playerPos.x + 3, playerPos.y + 8, playerPos.z + 5
    );
    this.dirLight.target.position.copy(playerPos);
    this.dirLight.target.updateMatrixWorld();

    this.playerLight.position.set(playerPos.x, playerPos.y + 2, playerPos.z);

    // HUD
    this.updateHUD();
  }

  updateCamera(delta) {
    const pos = this.player.getPosition();
    const dir = this.player.getDirection();

    // Camera offset based on current direction
    const behind = DIR_VECTORS[dir].clone().multiplyScalar(-5);
    const targetCamPos = new THREE.Vector3(
      pos.x + behind.x,
      pos.y + 3,
      pos.z + behind.z
    );

    // Smooth follow
    this.camera.position.lerp(targetCamPos, delta * 8);

    // Look slightly ahead of player
    const ahead = DIR_VECTORS[dir].clone().multiplyScalar(4);
    const lookTarget = new THREE.Vector3(
      pos.x + ahead.x,
      pos.y + 1,
      pos.z + ahead.z
    );
    // Smooth look
    const currentLook = new THREE.Vector3();
    this.camera.getWorldDirection(currentLook);
    this.camera.lookAt(lookTarget);
  }

  onPlayerHit() {
    this.lives--;
    this.effects.shakeScreen(0.4);
    this.effects.emitHit(this.player.getPosition());
    AudioManager.play('hit');

    if (this.lives <= 0) {
      this.onDeath();
    } else {
      this.player.hit();
    }
  }

  onDeath() {
    this.state = State.GAME_OVER;
    this.player.die();
    this.effects.emitDeath(this.player.getPosition(), 0xE24B4A);
    AudioManager.play('gameOver');
    AudioManager.stopBGM();

    const isNewHigh = this.score > SaveManager.getHighScore();
    if (isNewHigh) SaveManager.setHighScore(this.score);
    SaveManager.addCoins(this.coins);
    SaveManager.addRun(Math.floor(this.distance));

    setTimeout(() => {
      document.getElementById('go-score').textContent = this.score.toLocaleString();
      document.getElementById('go-best').textContent = SaveManager.getHighScore().toLocaleString();
      document.getElementById('go-distance').textContent = Math.floor(this.distance) + 'm';
      document.getElementById('go-coins').textContent = this.coins;
      const nb = document.getElementById('go-newbest');
      if (isNewHigh) nb.classList.remove('hidden');
      else nb.classList.add('hidden');
      this.showScreen('gameover');
    }, 1200);
  }

  updateHUD() {
    document.getElementById('hud-score').textContent = this.score.toLocaleString();
    document.getElementById('hud-distance').textContent = Math.floor(this.distance) + 'm';
    document.getElementById('hud-coin-count').textContent = this.coins;

    const livesEl = document.getElementById('hud-lives');
    let html = '';
    for (let i = 0; i < 3; i++) {
      html += `<span class="life-icon${i >= this.lives ? ' lost' : ''}">&#10084;</span>`;
    }
    livesEl.innerHTML = html;
  }

  showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById('screen-' + id) || document.getElementById(id);
    if (el) el.classList.add('active');
  }

  onResize() {
    const w = window.innerWidth, h = window.innerHeight;
    const pr = Math.min(window.devicePixelRatio, 2);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
    if (this.fxaaPass) this.fxaaPass.uniforms['resolution'].value.set(1/(w*pr), 1/(h*pr));
    if (this.bloomPass) this.bloomPass.resolution.set(w, h);
  }
}

const game = new Game();
game.init();
