// player.js — Temple Run style player: auto-run forward, turn at corners
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DIR_VECTORS, ROAD_WIDTH } from './track.js';

const GRAVITY = -25;
const JUMP_FORCE = 10;
const SLIDE_DURATION = 700;
const INVINCIBILITY_DURATION = 2000;
const STRAFE_SPEED = 10;
const STRAFE_LIMIT = ROAD_WIDTH / 2 - 0.7;
const LANE_OFFSET = 0.95;

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
    this.grounded = true;
    this.state = 'running'; // running, jumping, sliding, hit, dead

    // Timers
    this.slideTimer = 0;
    this.invincibleTimer = 0;
    this.time = 0;

    // Collision
    this.collisionBox = new THREE.Box3();

    // Turn feel
    this.visualTurn = 0;
    this.turnLean = 0;
    this.turnMomentum = 0;

    // Corridor lane movement
    this.lane = 0;
    this.lateralOffset = 0;
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
    this.grounded = true;
    this.state = 'running';
    this.slideTimer = 0;
    this.invincibleTimer = 0;
    this.time = 0;
    this.visualTurn = this.direction;
    this.turnLean = 0;
    this.turnMomentum = 0;
    this.lane = 0;
    this.lateralOffset = 0;

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
    const perpDir = DIR_VECTORS[(this.direction + 1) % 4];

    this.model.position.x -= perpDir.x * this.lateralOffset;
    this.model.position.z -= perpDir.z * this.lateralOffset;
    this.model.position.x += dirVec.x * moveAmount;
    this.model.position.z += dirVec.z * moveAmount;

    const targetOffset = this.lane * LANE_OFFSET;
    this.lateralOffset = THREE.MathUtils.lerp(this.lateralOffset, targetOffset, Math.min(delta * STRAFE_SPEED, 1));
    this.lateralOffset = THREE.MathUtils.clamp(this.lateralOffset, -STRAFE_LIMIT, STRAFE_LIMIT);
    this.model.position.x += perpDir.x * this.lateralOffset;
    this.model.position.z += perpDir.z * this.lateralOffset;

    // Jump physics
    if (!this.grounded) {
      this.velocityY += GRAVITY * delta;
      this.model.position.y += this.velocityY * delta;
      if (this.model.position.y <= 0) {
        this.model.position.y = 0;
        this.velocityY = 0;
        this.grounded = true;
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

    // Player rotation / lean for smoother turns
    const targetRotY = [Math.PI, Math.PI / 2, 0, -Math.PI / 2][this.direction];
    const current = this.model.rotation.y;
    const deltaRot = Math.atan2(Math.sin(targetRotY - current), Math.cos(targetRotY - current));
    this.model.rotation.y = current + deltaRot * Math.min(delta * 11, 1);
    const targetLean = THREE.MathUtils.clamp(-deltaRot * 0.6, -0.32, 0.32);
    this.turnMomentum = THREE.MathUtils.lerp(this.turnMomentum, deltaRot, Math.min(delta * 8, 1));
    this.turnLean = THREE.MathUtils.lerp(this.turnLean, targetLean, Math.min(delta * 10, 1));
    this.model.rotation.z = this.turnLean;

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

  moveLane(dir) {
    if (this.state === 'dead') return false;
    const nextLane = THREE.MathUtils.clamp(this.lane + dir, -1, 1);
    if (nextLane === this.lane) return false;
    this.lane = nextLane;
    return true;
  }

  jump() {
    if (this.state === 'dead' || this.state === 'hit' || !this.grounded) return;
    if (this.state === 'sliding') {
      this.model.scale.setScalar(this.modelScale);
    }
    this.state = 'jumping';
    this.velocityY = JUMP_FORCE;
    this.grounded = false;
    this.switchAnimation('jump');
  }

  slide() {
    if (this.state === 'dead' || this.state === 'hit' || this.state === 'jumping') return;
    this.state = 'sliding';
    this.slideTimer = SLIDE_DURATION;
    if (this.model && this.modelScale) {
      this.model.scale.set(this.modelScale, this.modelScale * 0.72, this.modelScale);
    }
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
  getLane() { return this.lane; }
  getCollisionBox() { return this.collisionBox; }
  get isGrounded() { return this.grounded; }
  isInvincible() { return this.invincibleTimer > 0 || this.state === 'hit'; }
}
