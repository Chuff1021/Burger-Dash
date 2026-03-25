// player.js — Player controller with GLTF model loading and AnimationMixer
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CHARACTERS } from './characters.js';
import { LANES } from './world.js';

const GRAVITY = -35;
const SLIDE_DURATION = 650;
const INVINCIBILITY_DURATION = 2000;
const ABILITY_CHARGE_MAX = 100;
const LANE_SWITCH_SPEED = 18;
const JUMP_FORCE_BASE = 13;

export class Player {
  constructor() {
    this.model = null;
    this.scene = null;
    this.charId = 'patty';
    this.config = null;

    // Animation
    this.mixer = null;
    this.animations = {};
    this.currentAction = null;
    this.gltfLoaded = false;

    // State
    this.state = 'running';
    this.laneIndex = 1;
    this.targetLane = 1;
    this.velocityY = 0;
    this.groundY = 0;
    this.isGrounded = true;
    this.slideTimer = 0;
    this.invincibleTimer = 0;
    this.abilityCharge = 0;
    this.abilityActive = false;
    this.abilityTimer = 0;
    this.time = 0;
    this.jumpForce = JUMP_FORCE_BASE;
    this.lateralSpeed = LANE_SWITCH_SPEED;

    // Collision
    this.collisionBox = new THREE.Box3();
    this.standingBoxSize = new THREE.Vector3(0.8, 1.8, 0.6);
    this.slidingBoxSize = new THREE.Vector3(1.0, 0.6, 0.8);

    // Procedural fallback model parts (used if GLTF fails to load)
    this.useFallback = false;
  }

  async init(charId, scene) {
    this.scene = scene;
    this.charId = charId;
    this.config = CHARACTERS[charId];

    // Remove old model
    if (this.model) {
      this.scene.remove(this.model);
      if (this.mixer) this.mixer.stopAllAction();
    }

    // Apply stat modifiers
    const stats = this.config.stats;
    this.jumpForce = JUMP_FORCE_BASE + (stats.jump - 3) * 1.5;
    this.lateralSpeed = LANE_SWITCH_SPEED + (stats.speed - 3) * 2;

    // Try loading GLTF model
    try {
      await this.loadGLTFModel();
    } catch (e) {
      console.warn('GLTF load failed, using fallback:', e);
      this.loadFallbackModel();
    }

    this.reset();
  }

  async loadGLTFModel() {
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync('./assets/models/player1.glb');

    this.model = gltf.scene;
    this.model.scale.set(0.012, 0.012, 0.012);
    this.model.rotation.y = Math.PI; // Face forward (away from camera)

    // Enable shadows on all meshes
    this.model.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        // Boost material visibility
        if (child.material) {
          child.material.metalness = 0;
          child.material.roughness = 0.6;
        }
      }
    });

    this.model.position.set(LANES[1], this.groundY, 0);
    this.scene.add(this.model);

    // Set up AnimationMixer
    this.mixer = new THREE.AnimationMixer(this.model);
    this.animations = {};

    for (const clip of gltf.animations) {
      const name = clip.name.toLowerCase();
      let action = this.mixer.clipAction(clip);

      if (name === 'run') {
        action.timeScale = 1.2;
        action.play();
        this.currentAction = action;
      } else if (name === 'jump' || name === 'jumpup') {
        // Extract subclip for jump
        if (name === 'jump') {
          const subClip = THREE.AnimationUtils.subclip(clip, 'jump', 12, 30);
          action = this.mixer.clipAction(subClip);
        }
        action.setLoop(THREE.LoopOnce);
        action.clampWhenFinished = true;
      } else if (name === 'roll') {
        const subClip = THREE.AnimationUtils.subclip(clip, 'roll', 0, 44);
        action = this.mixer.clipAction(subClip);
        action.setLoop(THREE.LoopOnce);
        action.clampWhenFinished = true;
        action.timeScale = 2.0;
      } else if (name === 'die' || name === 'fall') {
        action.setLoop(THREE.LoopOnce);
        action.clampWhenFinished = true;
      } else if (name === 'idle') {
        // idle available but not auto-played
      } else if (name === 'dance') {
        // dance available for character select
      }

      this.animations[name] = action;
    }

    this.gltfLoaded = true;
  }

  loadFallbackModel() {
    // Use procedural model from characters.js as fallback
    const { buildModel } = require('./characters.js');
    this.model = buildModel(this.charId);
    this.model.position.set(LANES[1], this.groundY, 0);
    this.scene.add(this.model);
    this.useFallback = true;
    this.gltfLoaded = false;
  }

  switchAnimation(name) {
    if (!this.gltfLoaded || !this.animations[name]) return;
    if (this.currentAction === this.animations[name]) return;

    const prevAction = this.currentAction;
    this.currentAction = this.animations[name];

    if (prevAction) {
      prevAction.fadeOut(0.15);
    }
    this.currentAction.reset().fadeIn(0.15).play();
  }

  reset() {
    this.state = 'running';
    this.laneIndex = 1;
    this.targetLane = 1;
    this.velocityY = 0;
    this.isGrounded = true;
    this.slideTimer = 0;
    this.invincibleTimer = 0;
    this.abilityCharge = 0;
    this.abilityActive = false;
    this.abilityTimer = 0;
    this.time = 0;

    if (this.model) {
      this.model.position.set(LANES[1], this.groundY, 0);
      this.model.rotation.set(0, Math.PI, 0);
      this.model.scale.set(0.012, 0.012, 0.012);
      this.model.visible = true;
    }

    if (this.gltfLoaded) {
      // Reset all animations
      for (const action of Object.values(this.animations)) {
        action.stop();
      }
      this.switchAnimation('run');
    }
  }

  update(delta, globalTime) {
    if (!this.model || this.state === 'dead') return;
    this.time += delta;

    // Update AnimationMixer
    if (this.mixer) {
      this.mixer.update(delta);
    }

    // --- Lane switching (smooth interpolation) ---
    const targetX = LANES[this.targetLane];
    const diff = targetX - this.model.position.x;
    if (Math.abs(diff) > 0.02) {
      const moveStep = Math.sign(diff) * Math.min(this.lateralSpeed * delta, Math.abs(diff));
      this.model.position.x += moveStep;
      // Body lean during lane change
      this.model.rotation.z = THREE.MathUtils.lerp(this.model.rotation.z, -diff * 0.12, delta * 12);
    } else {
      this.model.position.x = targetX;
      this.laneIndex = this.targetLane;
      this.model.rotation.z = THREE.MathUtils.lerp(this.model.rotation.z, 0, delta * 10);
    }

    // --- Jump physics ---
    if (!this.isGrounded) {
      this.velocityY += GRAVITY * delta;
      this.model.position.y += this.velocityY * delta;

      if (this.model.position.y <= this.groundY) {
        this.model.position.y = this.groundY;
        this.velocityY = 0;
        this.isGrounded = true;
        if (this.state === 'jumping') {
          this.state = 'running';
          this.switchAnimation('run');
        }
      }
    }

    // --- Slide timer ---
    if (this.state === 'sliding') {
      this.slideTimer -= delta * 1000;
      if (this.slideTimer <= 0) {
        this.state = 'running';
        this.model.scale.set(0.012, 0.012, 0.012);
        this.switchAnimation('run');
      }
    }

    // --- Invincibility ---
    if (this.invincibleTimer > 0) {
      this.invincibleTimer -= delta * 1000;
      const blink = Math.floor(this.time * 12) % 2;
      this.model.visible = blink === 0;
      if (this.invincibleTimer <= 0) {
        this.invincibleTimer = 0;
        this.model.visible = true;
        if (this.state === 'invincible') {
          this.state = 'running';
          this.switchAnimation('run');
        }
      }
    }

    // --- Ability timer ---
    if (this.abilityActive) {
      this.abilityTimer -= delta * 1000;
      if (this.abilityTimer <= 0) {
        this.abilityActive = false;
        this.abilityTimer = 0;
      }
    }

    // Update collision box
    this.updateCollisionBox();
  }

  updateCollisionBox() {
    const pos = this.model.position;
    const size = this.state === 'sliding' ? this.slidingBoxSize : this.standingBoxSize;
    const yCenter = this.state === 'sliding' ? pos.y + 0.3 : pos.y + size.y / 2;
    this.collisionBox.setFromCenterAndSize(
      new THREE.Vector3(pos.x, yCenter, pos.z),
      size
    );
  }

  moveLeft() {
    if (this.state === 'dead' || this.state === 'hit') return;
    if (this.targetLane > 0) this.targetLane--;
  }

  moveRight() {
    if (this.state === 'dead' || this.state === 'hit') return;
    if (this.targetLane < 2) this.targetLane++;
  }

  jump() {
    if (this.state === 'dead' || this.state === 'hit') return;
    if (!this.isGrounded) return;

    if (this.state === 'sliding') {
      this.model.scale.set(0.012, 0.012, 0.012);
    }

    this.state = 'jumping';
    this.velocityY = this.jumpForce;
    this.isGrounded = false;
    this.switchAnimation('jump');
  }

  slide() {
    if (this.state === 'dead' || this.state === 'hit' || this.state === 'jumping') return;

    this.state = 'sliding';
    this.slideTimer = SLIDE_DURATION;
    this.switchAnimation('roll');
  }

  hit() {
    if (this.state === 'dead' || this.isInvincible()) return false;

    this.state = 'hit';
    this.switchAnimation('fall');

    setTimeout(() => {
      if (this.state === 'hit') {
        this.state = 'invincible';
        this.invincibleTimer = INVINCIBILITY_DURATION;
        this.model.visible = true;
        this.switchAnimation('run');
      }
    }, 400);

    return true;
  }

  die() {
    this.state = 'dead';
    this.switchAnimation('die');
  }

  isInvincible() {
    return this.state === 'invincible' || this.invincibleTimer > 0 ||
           this.state === 'hit' || this.abilityActive;
  }

  getCollisionBox() { return this.collisionBox; }
  getPosition() { return this.model ? this.model.position : new THREE.Vector3(); }
  getState() { return this.state; }

  addAbilityCharge(amount) {
    this.abilityCharge = Math.min(ABILITY_CHARGE_MAX, this.abilityCharge + amount);
  }
  getAbilityCharge() { return this.abilityCharge / ABILITY_CHARGE_MAX; }
  isAbilityReady() { return this.abilityCharge >= ABILITY_CHARGE_MAX && !this.abilityActive; }

  activateAbility() {
    if (!this.isAbilityReady()) return false;
    this.abilityActive = true;
    this.abilityCharge = 0;
    this.abilityTimer = this.config.ability.duration;
    return true;
  }

  isAbilityActive() { return this.abilityActive; }
  getAbilityTimeRemaining() { return this.abilityTimer; }
  getLaneIndex() { return this.targetLane; }
}
