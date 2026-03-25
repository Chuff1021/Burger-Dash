// player.js — Temple Run style player: auto-run forward, turn at corners
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DIR_VECTORS, ROAD_WIDTH } from './track.js';

const GRAVITY = -25;
const JUMP_FORCE = 10;
const SLIDE_DURATION = 700;
const INVINCIBILITY_DURATION = 2000;
const STRAFE_SPEED = 6;
const STRAFE_LIMIT = ROAD_WIDTH / 2 - 0.4;

export class Player {
  constructor() {
    this.model = null;
    this.scene = null;
    this.mixer = null;
    this.animations = {};
    this.currentAction = null;
    this.gltfLoaded = false;

    // Direction and movement
    this.direction = 0; // 0-3 cardinal (same as track)
    this.velocityY = 0;
    this.isGrounded = true;
    this.state = 'running'; // running, jumping, sliding, hit, dead

    // Timers
    this.slideTimer = 0;
    this.invincibleTimer = 0;
    this.time = 0;

    // Collision
    this.collisionBox = new THREE.Box3();
  }

  async init(scene) {
    this.scene = scene;

    if (this.model) {
      this.scene.remove(this.model);
      if (this.mixer) this.mixer.stopAllAction();
    }

    try {
      await this.loadModel();
    } catch (e) {
      console.error('Model load failed:', e);
      this.createFallbackModel();
    }

    this.reset();
  }

  async loadModel() {
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync('./assets/models/player1.glb');

    this.model = gltf.scene;

    // Auto-scale to ~1.5 units tall
    const box = new THREE.Box3().setFromObject(this.model);
    const height = box.max.y - box.min.y;
    const scale = 1.5 / height;
    this.model.scale.setScalar(scale);
    this.modelScale = scale;

    // Enable shadows
    this.model.traverse(child => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material) {
          child.material.metalness = 0;
          child.material.roughness = 0.6;
          if (child.material.map) {
            child.material.emissive = child.material.color;
            child.material.emissiveMap = child.material.map;
            child.material.emissiveIntensity = 0.1;
          }
        }
      }
    });

    this.scene.add(this.model);

    // AnimationMixer
    this.mixer = new THREE.AnimationMixer(this.model);
    this.animations = {};

    for (const clip of gltf.animations) {
      const name = clip.name.toLowerCase();
      let action = this.mixer.clipAction(clip);

      if (name === 'jump') {
        const sub = THREE.AnimationUtils.subclip(clip, 'jump', 12, 30);
        action = this.mixer.clipAction(sub);
        action.setLoop(THREE.LoopOnce);
        action.clampWhenFinished = true;
      } else if (name === 'roll') {
        const sub = THREE.AnimationUtils.subclip(clip, 'roll', 0, 44);
        action = this.mixer.clipAction(sub);
        action.setLoop(THREE.LoopOnce);
        action.clampWhenFinished = true;
        action.timeScale = 2.0;
      } else if (name === 'die' || name === 'fall') {
        action.setLoop(THREE.LoopOnce);
        action.clampWhenFinished = true;
      } else if (name === 'run') {
        action.timeScale = 1.3;
      }

      this.animations[name] = action;
    }

    this.gltfLoaded = true;
    console.log('Player loaded, height:', height.toFixed(1), 'scale:', scale.toFixed(4));
  }

  createFallbackModel() {
    // Simple capsule fallback
    const group = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.3, 0.8, 8, 16),
      new THREE.MeshStandardMaterial({ color: 0xE24B4A })
    );
    body.position.y = 0.7;
    body.castShadow = true;
    group.add(body);
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.25, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xF5CBA7 })
    );
    head.position.y = 1.35;
    head.castShadow = true;
    group.add(head);
    this.model = group;
    this.modelScale = 1;
    this.scene.add(this.model);
    this.gltfLoaded = false;
  }

  switchAnimation(name) {
    if (!this.gltfLoaded || !this.animations[name]) return;
    if (this.currentAction === this.animations[name]) return;

    const prev = this.currentAction;
    this.currentAction = this.animations[name];
    if (prev) prev.fadeOut(0.15);
    this.currentAction.reset().fadeIn(0.15).play();
  }

  reset() {
    this.direction = 0;
    this.velocityY = 0;
    this.isGrounded = true;
    this.state = 'running';
    this.slideTimer = 0;
    this.invincibleTimer = 0;
    this.time = 0;

    if (this.model) {
      this.model.position.set(0, 0, -2);
      this.model.rotation.set(0, Math.PI, 0); // Face Z-negative
      if (this.modelScale) {
        this.model.scale.setScalar(this.modelScale);
      }
      this.model.visible = true;
    }

    if (this.gltfLoaded) {
      for (const a of Object.values(this.animations)) a.stop();
      this.switchAnimation('run');
    }
  }

  update(delta, speed) {
    if (!this.model || this.state === 'dead') return;
    this.time += delta;

    if (this.mixer) this.mixer.update(delta);

    // Auto-run forward in current direction
    const moveAmount = speed * delta;
    const dirVec = DIR_VECTORS[this.direction];
    this.model.position.x += dirVec.x * moveAmount;
    this.model.position.z += dirVec.z * moveAmount;

    // Jump physics
    if (!this.isGrounded) {
      this.velocityY += GRAVITY * delta;
      this.model.position.y += this.velocityY * delta;
      if (this.model.position.y <= 0) {
        this.model.position.y = 0;
        this.velocityY = 0;
        this.isGrounded = true;
        if (this.state === 'jumping') {
          this.state = 'running';
          this.switchAnimation('run');
        }
      }
    }

    // Slide timer
    if (this.state === 'sliding') {
      this.slideTimer -= delta * 1000;
      if (this.slideTimer <= 0) {
        this.state = 'running';
        this.model.scale.setScalar(this.modelScale);
        this.switchAnimation('run');
      }
    }

    // Invincibility
    if (this.invincibleTimer > 0) {
      this.invincibleTimer -= delta * 1000;
      this.model.visible = Math.floor(this.time * 12) % 2 === 0;
      if (this.invincibleTimer <= 0) {
        this.invincibleTimer = 0;
        this.model.visible = true;
        if (this.state === 'hit') {
          this.state = 'running';
          this.switchAnimation('run');
        }
      }
    }

    // Player rotation to face current direction
    const targetRotY = [Math.PI, Math.PI / 2, 0, -Math.PI / 2][this.direction];
    this.model.rotation.y = THREE.MathUtils.lerp(this.model.rotation.y, targetRotY, delta * 15);

    // Update collision box
    const pos = this.model.position;
    const h = this.state === 'sliding' ? 0.5 : 1.5;
    this.collisionBox.setFromCenterAndSize(
      new THREE.Vector3(pos.x, pos.y + h / 2, pos.z),
      new THREE.Vector3(0.6, h, 0.6)
    );
  }

  // Turn left at a corner
  turnLeft() {
    if (this.state === 'dead') return;
    this.direction = (this.direction - 1 + 4) % 4;
  }

  // Turn right at a corner
  turnRight() {
    if (this.state === 'dead') return;
    this.direction = (this.direction + 1) % 4;
  }

  // Strafe within the corridor (tilt-like movement)
  strafe(amount, delta) {
    if (this.state === 'dead') return;
    // Move perpendicular to current direction
    const perpDir = DIR_VECTORS[(this.direction + 1) % 4];
    this.model.position.x += perpDir.x * amount * STRAFE_SPEED * delta;
    this.model.position.z += perpDir.z * amount * STRAFE_SPEED * delta;
  }

  jump() {
    if (this.state === 'dead' || this.state === 'hit' || !this.isGrounded) return;
    if (this.state === 'sliding') {
      this.model.scale.setScalar(this.modelScale);
    }
    this.state = 'jumping';
    this.velocityY = JUMP_FORCE;
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
    if (this.state === 'dead' || this.invincibleTimer > 0) return false;
    this.state = 'hit';
    this.invincibleTimer = INVINCIBILITY_DURATION;
    this.switchAnimation('fall');
    setTimeout(() => {
      if (this.state === 'hit') {
        this.state = 'running';
        this.switchAnimation('run');
      }
    }, 400);
    return true;
  }

  die() {
    this.state = 'dead';
    this.switchAnimation('die');
  }

  getPosition() { return this.model ? this.model.position : new THREE.Vector3(); }
  getDirection() { return this.direction; }
  getState() { return this.state; }
  getCollisionBox() { return this.collisionBox; }
  isInvincible() { return this.invincibleTimer > 0 || this.state === 'hit'; }
}
