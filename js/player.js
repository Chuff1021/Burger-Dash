// player.js — Player controller, animation state machine, input handling
import * as THREE from 'three';
import { CHARACTERS, buildModel, animateCharacter } from './characters.js';
import { LANES } from './world.js';

const GRAVITY = -30;
const SLIDE_DURATION = 600; // ms
const INVINCIBILITY_DURATION = 2000; // ms
const ABILITY_CHARGE_MAX = 100;

export class Player {
  constructor() {
    this.model = null;
    this.scene = null;
    this.charId = 'patty';
    this.config = null;
    this.state = 'running'; // running, jumping, sliding, hit, invincible, dead
    this.laneIndex = 1; // 0=left, 1=center, 2=right
    this.targetLane = 1;
    this.velocityY = 0;
    this.groundY = 0.55;
    this.isGrounded = true;
    this.slideTimer = 0;
    this.invincibleTimer = 0;
    this.invincibleDuration = INVINCIBILITY_DURATION;
    this.abilityCharge = 0;
    this.abilityActive = false;
    this.abilityTimer = 0;
    this.collisionBox = new THREE.Box3();
    this.standingBoxSize = new THREE.Vector3(0.8, 1.2, 0.6);
    this.slidingBoxSize = new THREE.Vector3(1.0, 0.5, 0.8);
    this.time = 0;
    this.lateralSpeed = 15;
  }

  init(charId, scene) {
    this.scene = scene;

    // Remove old model
    if (this.model) {
      this.scene.remove(this.model);
    }

    this.charId = charId;
    this.config = CHARACTERS[charId];
    this.model = buildModel(charId);
    this.model.position.set(LANES[1], this.groundY, 0);
    this.scene.add(this.model);

    // Apply stat modifiers
    const stats = this.config.stats;
    this.jumpForce = 10 + (stats.jump - 3) * 1.5;
    this.lateralSpeed = 12 + (stats.speed - 3) * 2;

    this.reset();
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
      this.model.rotation.set(0, 0, 0);
      this.model.scale.set(1, 1, 1);
      this.model.visible = true;
      this.model.userData.animTime = 0;
    }
  }

  update(delta, globalTime) {
    if (!this.model || this.state === 'dead') return;

    this.time += delta;

    // Lane switching (smooth lerp)
    const targetX = LANES[this.targetLane];
    const diff = targetX - this.model.position.x;
    if (Math.abs(diff) > 0.01) {
      this.model.position.x += Math.sign(diff) * Math.min(this.lateralSpeed * delta, Math.abs(diff));
    } else {
      this.model.position.x = targetX;
      this.laneIndex = this.targetLane;
    }

    // Body tilt during lane change
    this.model.rotation.z = THREE.MathUtils.lerp(this.model.rotation.z, -diff * 0.15, delta * 10);

    // Jump physics
    if (!this.isGrounded) {
      this.velocityY += GRAVITY * delta;
      this.model.position.y += this.velocityY * delta;

      if (this.model.position.y <= this.groundY) {
        this.model.position.y = this.groundY;
        this.velocityY = 0;
        this.isGrounded = true;
        if (this.state === 'jumping') {
          this.state = 'running';
          // Landing squash
          this.model.scale.set(1.1, 0.9, 1.1);
        }
      }
    }

    // Slide timer
    if (this.state === 'sliding') {
      this.slideTimer -= delta * 1000;
      if (this.slideTimer <= 0) {
        this.state = 'running';
        this.model.scale.set(1, 1, 1);
        this.model.rotation.x = 0;
      }
    }

    // Invincibility timer
    if (this.state === 'invincible' || this.invincibleTimer > 0) {
      this.invincibleTimer -= delta * 1000;
      // Blink
      const blink = Math.floor(this.time * 15) % 2;
      this.model.visible = blink === 0;
      if (this.invincibleTimer <= 0) {
        this.invincibleTimer = 0;
        this.model.visible = true;
        if (this.state === 'invincible') {
          this.state = 'running';
        }
      }
    }

    // Ability timer
    if (this.abilityActive) {
      this.abilityTimer -= delta * 1000;
      if (this.abilityTimer <= 0) {
        this.abilityActive = false;
        this.abilityTimer = 0;
      }
    }

    // Recover scale from landing squash
    if (this.state === 'running' && this.isGrounded) {
      this.model.scale.x = THREE.MathUtils.lerp(this.model.scale.x, 1, delta * 10);
      this.model.scale.y = THREE.MathUtils.lerp(this.model.scale.y, 1, delta * 10);
      this.model.scale.z = THREE.MathUtils.lerp(this.model.scale.z, 1, delta * 10);
    }

    // Animate
    animateCharacter(this.model, delta, this.state, this.time);

    // Update collision box
    this.updateCollisionBox();
  }

  updateCollisionBox() {
    const pos = this.model.position;
    const size = this.state === 'sliding' ? this.slidingBoxSize : this.standingBoxSize;
    this.collisionBox.setFromCenterAndSize(
      new THREE.Vector3(pos.x, pos.y + (this.state === 'sliding' ? 0.2 : size.y / 2), pos.z),
      size
    );
  }

  moveLeft() {
    if (this.state === 'dead' || this.state === 'hit') return;
    if (this.targetLane > 0) {
      this.targetLane--;
    }
  }

  moveRight() {
    if (this.state === 'dead' || this.state === 'hit') return;
    if (this.targetLane < 2) {
      this.targetLane++;
    }
  }

  jump() {
    if (this.state === 'dead' || this.state === 'hit') return;
    if (!this.isGrounded) return;

    // Cancel slide if sliding
    if (this.state === 'sliding') {
      this.model.scale.set(1, 1, 1);
      this.model.rotation.x = 0;
    }

    this.state = 'jumping';
    this.velocityY = this.jumpForce;
    this.isGrounded = false;
  }

  slide() {
    if (this.state === 'dead' || this.state === 'hit' || this.state === 'jumping') return;

    this.state = 'sliding';
    this.slideTimer = SLIDE_DURATION;
  }

  hit() {
    if (this.state === 'dead') return;
    if (this.isInvincible()) return;

    this.state = 'hit';
    this.model.userData.animTime = 0;

    // Brief hit state then invincible
    setTimeout(() => {
      if (this.state === 'hit') {
        this.state = 'invincible';
        this.invincibleTimer = this.invincibleDuration;
        this.model.visible = true;
        this.model.rotation.y = 0;
        this.model.scale.set(1, 1, 1);
      }
    }, 300);

    return true;
  }

  die() {
    this.state = 'dead';
    this.model.visible = false;
  }

  isInvincible() {
    return this.state === 'invincible' || this.invincibleTimer > 0 ||
           this.state === 'hit' || this.abilityActive;
  }

  getCollisionBox() {
    return this.collisionBox;
  }

  getPosition() {
    return this.model ? this.model.position : new THREE.Vector3();
  }

  getState() {
    return this.state;
  }

  addAbilityCharge(amount) {
    this.abilityCharge = Math.min(ABILITY_CHARGE_MAX, this.abilityCharge + amount);
  }

  getAbilityCharge() {
    return this.abilityCharge / ABILITY_CHARGE_MAX;
  }

  isAbilityReady() {
    return this.abilityCharge >= ABILITY_CHARGE_MAX && !this.abilityActive;
  }

  activateAbility() {
    if (!this.isAbilityReady()) return false;
    this.abilityActive = true;
    this.abilityCharge = 0;
    this.abilityTimer = this.config.ability.duration;
    return true;
  }

  isAbilityActive() {
    return this.abilityActive;
  }

  getAbilityTimeRemaining() {
    return this.abilityTimer;
  }

  getLaneIndex() {
    return this.targetLane;
  }
}
