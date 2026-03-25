// collectibles.js — Coins, power-ups, combo system
import * as THREE from 'three';
import { LANES } from './world.js';

function toonMat(color) {
  return new THREE.MeshToonMaterial({ color });
}

// Collectible types
const COIN_TYPES = {
  gold: {
    id: 'gold',
    value: 1,
    color: 0xFFD700,
    build: () => {
      const g = new THREE.Group();
      const coin = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25, 0.25, 0.06, 16),
        new THREE.MeshToonMaterial({ color: 0xFFD700, emissive: 0xFFD700, emissiveIntensity: 0.3 })
      );
      coin.rotation.x = Math.PI / 2;
      g.add(coin);
      // Inner circle
      const inner = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.15, 0.07, 16),
        new THREE.MeshToonMaterial({ color: 0xFFA500, emissive: 0xFFA500, emissiveIntensity: 0.2 })
      );
      inner.rotation.x = Math.PI / 2;
      g.add(inner);
      return g;
    }
  }
};

const POWERUP_TYPES = {
  burgerToken: {
    id: 'burgerToken',
    name: '5x Coins',
    color: 0xFF8C00,
    duration: 10000,
    effect: 'coinMultiplier',
    multiplier: 5,
    build: () => {
      const g = new THREE.Group();
      const token = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.35, 0.3, 12),
        new THREE.MeshToonMaterial({ color: 0xDEB887, emissive: 0xFF8C00, emissiveIntensity: 0.4 })
      );
      g.add(token);
      const patty = new THREE.Mesh(
        new THREE.CylinderGeometry(0.32, 0.32, 0.08, 12),
        toonMat(0x8B4513)
      );
      patty.position.y = 0.1;
      g.add(patty);
      return g;
    }
  },
  jetpack: {
    id: 'jetpack',
    name: 'Jetpack Fry Box',
    color: 0xFF4444,
    duration: 8000,
    effect: 'jetpack',
    build: () => {
      const g = new THREE.Group();
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.6, 0.3),
        new THREE.MeshToonMaterial({ color: 0xFF4444, emissive: 0xFF4444, emissiveIntensity: 0.3 })
      );
      g.add(box);
      // Fries sticking out
      for (let i = 0; i < 4; i++) {
        const fry = new THREE.Mesh(
          new THREE.BoxGeometry(0.05, 0.3, 0.05),
          toonMat(0xFFD700)
        );
        fry.position.set(-0.15 + i * 0.1, 0.45, 0);
        fry.rotation.z = (Math.random() - 0.5) * 0.3;
        g.add(fry);
      }
      return g;
    }
  },
  shield: {
    id: 'shield',
    name: 'Shield Pickle',
    color: 0x228B22,
    duration: 0, // lasts until hit
    effect: 'shield',
    build: () => {
      const g = new THREE.Group();
      const pickle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.15, 0.4, 8),
        new THREE.MeshToonMaterial({ color: 0x228B22, emissive: 0x228B22, emissiveIntensity: 0.3 })
      );
      pickle.rotation.z = Math.PI / 6;
      g.add(pickle);
      // Shield glow ring
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.3, 0.04, 8, 24),
        new THREE.MeshBasicMaterial({ color: 0x44FF44, transparent: true, opacity: 0.6 })
      );
      ring.rotation.x = Math.PI / 2;
      g.add(ring);
      return g;
    }
  },
  magnet: {
    id: 'magnet',
    name: 'Magnet Sauce',
    color: 0xFF00FF,
    duration: 12000,
    effect: 'magnet',
    build: () => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.TorusGeometry(0.2, 0.08, 8, 16, Math.PI),
        new THREE.MeshToonMaterial({ color: 0xFF0000, emissive: 0xFF0000, emissiveIntensity: 0.3 })
      );
      g.add(body);
      // Tips
      const tip1 = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.12, 0.16),
        toonMat(0xCCCCCC)
      );
      tip1.position.set(-0.2, 0, 0);
      g.add(tip1);
      const tip2 = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.12, 0.16),
        toonMat(0x4444FF)
      );
      tip2.position.set(0.2, 0, 0);
      g.add(tip2);
      return g;
    }
  },
  scoreDoubler: {
    id: 'scoreDoubler',
    name: 'Score Doubler',
    color: 0xFFD700,
    duration: 15000,
    effect: 'scoreDoubler',
    build: () => {
      const g = new THREE.Group();
      const star = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.3, 0),
        new THREE.MeshToonMaterial({ color: 0xFFD700, emissive: 0xFFD700, emissiveIntensity: 0.5 })
      );
      g.add(star);
      return g;
    }
  },
  abilityToken: {
    id: 'abilityToken',
    name: 'Ability Token',
    color: 0x00FFFF,
    duration: 0,
    effect: 'abilityCharge',
    build: () => {
      const g = new THREE.Group();
      const token = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.25, 1),
        new THREE.MeshToonMaterial({ color: 0x00FFFF, emissive: 0x00FFFF, emissiveIntensity: 0.5 })
      );
      g.add(token);
      return g;
    }
  }
};

const POWERUP_KEYS = Object.keys(POWERUP_TYPES);

// Coin placement patterns
const COIN_PATTERNS = [
  // Straight line in one lane
  (lane) => {
    const coins = [];
    for (let i = 0; i < 6; i++) {
      coins.push({ x: LANES[lane], y: 0.8, zOffset: -i * 2 });
    }
    return coins;
  },
  // Arc (jump arc)
  (lane) => {
    const coins = [];
    for (let i = 0; i < 5; i++) {
      const t = i / 4;
      coins.push({
        x: LANES[lane],
        y: 0.8 + Math.sin(t * Math.PI) * 2,
        zOffset: -i * 2
      });
    }
    return coins;
  },
  // Zigzag across lanes
  () => {
    const coins = [];
    for (let i = 0; i < 6; i++) {
      const lane = i % 3;
      coins.push({ x: LANES[lane], y: 0.8, zOffset: -i * 2 });
    }
    return coins;
  },
  // Double line (two lanes)
  () => {
    const coins = [];
    const l1 = 0, l2 = 2;
    for (let i = 0; i < 4; i++) {
      coins.push({ x: LANES[l1], y: 0.8, zOffset: -i * 2 });
      coins.push({ x: LANES[l2], y: 0.8, zOffset: -i * 2 });
    }
    return coins;
  }
];

const COIN_POOL_SIZE = 40;
const POWERUP_POOL_SIZE = 3;

export class CollectibleManager {
  constructor() {
    this.coinPool = [];
    this.powerupPools = {};
    this.activeCoins = [];
    this.activePowerups = [];
    this.scene = null;
    this.coinSpawnTimer = 0;
    this.coinSpawnInterval = 0.8;
    this.powerupSpawnTimer = 0;
    this.powerupSpawnInterval = 15;
    this.time = 0;
    this.magnetActive = false;
    this.magnetRange = 5;
  }

  init(scene) {
    this.scene = scene;

    // Create coin pool
    for (let i = 0; i < COIN_POOL_SIZE; i++) {
      const mesh = COIN_TYPES.gold.build();
      mesh.visible = false;
      mesh.userData.box = new THREE.Box3();
      mesh.userData.type = 'gold';
      scene.add(mesh);
      this.coinPool.push({ mesh, active: false });
    }

    // Create powerup pools
    for (const key of POWERUP_KEYS) {
      this.powerupPools[key] = [];
      for (let i = 0; i < POWERUP_POOL_SIZE; i++) {
        const mesh = POWERUP_TYPES[key].build();
        mesh.visible = false;
        mesh.userData.box = new THREE.Box3();
        mesh.userData.type = key;
        mesh.userData.powerupType = key;
        scene.add(mesh);
        this.powerupPools[key].push({ mesh, active: false });
      }
    }
  }

  acquireCoin() {
    const available = this.coinPool.find(c => !c.active);
    if (!available) return null;
    available.active = true;
    available.mesh.visible = true;
    return available;
  }

  acquirePowerup(type) {
    const pool = this.powerupPools[type];
    if (!pool) return null;
    const available = pool.find(p => !p.active);
    if (!available) return null;
    available.active = true;
    available.mesh.visible = true;
    return available;
  }

  releaseCoin(coin) {
    coin.active = false;
    coin.mesh.visible = false;
  }

  releasePowerup(powerup) {
    powerup.active = false;
    powerup.mesh.visible = false;
  }

  update(delta, speed, playerPos) {
    this.time += delta;
    this.coinSpawnTimer += delta;
    this.powerupSpawnTimer += delta;

    // Spawn coins
    if (this.coinSpawnTimer >= this.coinSpawnInterval) {
      this.coinSpawnTimer = 0;
      this.spawnCoinPattern();
    }

    // Spawn powerups
    if (this.powerupSpawnTimer >= this.powerupSpawnInterval) {
      this.powerupSpawnTimer = 0;
      this.spawnPowerup();
    }

    // Update active coins
    for (let i = this.activeCoins.length - 1; i >= 0; i--) {
      const coin = this.activeCoins[i];
      coin.mesh.position.z += speed * delta;

      // Spin animation
      coin.mesh.rotation.y += delta * 4;

      // Bob animation
      coin.mesh.position.y = coin.baseY + Math.sin(this.time * 3 + i) * 0.1;

      // Magnet attraction
      if (this.magnetActive && playerPos) {
        const dist = coin.mesh.position.distanceTo(playerPos);
        if (dist < this.magnetRange) {
          const dir = new THREE.Vector3().subVectors(playerPos, coin.mesh.position).normalize();
          const attractSpeed = (1 - dist / this.magnetRange) * 15;
          coin.mesh.position.add(dir.multiplyScalar(attractSpeed * delta));
        }
      }

      // Update box
      coin.mesh.userData.box.setFromCenterAndSize(
        coin.mesh.position,
        new THREE.Vector3(0.5, 0.5, 0.5)
      );

      // Recycle if past camera
      if (coin.mesh.position.z > 8) {
        this.releaseCoin(coin);
        this.activeCoins.splice(i, 1);
      }
    }

    // Update active powerups
    for (let i = this.activePowerups.length - 1; i >= 0; i--) {
      const pu = this.activePowerups[i];
      pu.mesh.position.z += speed * delta;

      // Spin and bob
      pu.mesh.rotation.y += delta * 3;
      pu.mesh.position.y = pu.baseY + Math.sin(this.time * 2 + i) * 0.2;

      // Update box
      pu.mesh.userData.box.setFromCenterAndSize(
        pu.mesh.position,
        new THREE.Vector3(0.8, 0.8, 0.8)
      );

      // Recycle if past camera
      if (pu.mesh.position.z > 8) {
        this.releasePowerup(pu);
        this.activePowerups.splice(i, 1);
      }
    }
  }

  spawnCoinPattern() {
    const patternFn = COIN_PATTERNS[Math.floor(Math.random() * COIN_PATTERNS.length)];
    const lane = Math.floor(Math.random() * 3);
    const positions = patternFn(lane);

    for (const pos of positions) {
      const coin = this.acquireCoin();
      if (!coin) break;
      coin.mesh.position.set(pos.x, pos.y, -60 + pos.zOffset);
      coin.baseY = pos.y;
      this.activeCoins.push(coin);
    }
  }

  spawnPowerup() {
    const lane = Math.floor(Math.random() * 3);

    // Weight toward ability tokens and common powerups
    const weights = [
      { type: 'burgerToken', weight: 2 },
      { type: 'shield', weight: 3 },
      { type: 'magnet', weight: 2 },
      { type: 'scoreDoubler', weight: 1 },
      { type: 'abilityToken', weight: 4 },
      { type: 'jetpack', weight: 1 }
    ];
    const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
    let r = Math.random() * totalWeight;
    let selectedType = 'shield';
    for (const w of weights) {
      r -= w.weight;
      if (r <= 0) {
        selectedType = w.type;
        break;
      }
    }

    const pu = this.acquirePowerup(selectedType);
    if (!pu) return;

    pu.mesh.position.set(LANES[lane], 1.2, -65);
    pu.baseY = 1.2;
    this.activePowerups.push(pu);
  }

  checkCollection(playerBox) {
    const collected = [];

    // Check coins
    for (let i = this.activeCoins.length - 1; i >= 0; i--) {
      const coin = this.activeCoins[i];
      if (coin.mesh.userData.box.intersectsBox(playerBox)) {
        collected.push({
          type: 'coin',
          value: COIN_TYPES.gold.value,
          position: coin.mesh.position.clone()
        });
        this.releaseCoin(coin);
        this.activeCoins.splice(i, 1);
      }
    }

    // Check powerups
    for (let i = this.activePowerups.length - 1; i >= 0; i--) {
      const pu = this.activePowerups[i];
      if (pu.mesh.userData.box.intersectsBox(playerBox)) {
        const typeConfig = POWERUP_TYPES[pu.mesh.userData.powerupType];
        collected.push({
          type: 'powerup',
          powerupType: pu.mesh.userData.powerupType,
          effect: typeConfig.effect,
          duration: typeConfig.duration,
          multiplier: typeConfig.multiplier,
          color: typeConfig.color,
          position: pu.mesh.position.clone()
        });
        this.releasePowerup(pu);
        this.activePowerups.splice(i, 1);
      }
    }

    return collected;
  }

  setMagnetActive(active, range) {
    this.magnetActive = active;
    if (range) this.magnetRange = range;
  }

  reset() {
    for (let i = this.activeCoins.length - 1; i >= 0; i--) {
      this.releaseCoin(this.activeCoins[i]);
    }
    this.activeCoins = [];

    for (let i = this.activePowerups.length - 1; i >= 0; i--) {
      this.releasePowerup(this.activePowerups[i]);
    }
    this.activePowerups = [];

    this.coinSpawnTimer = 0;
    this.powerupSpawnTimer = 0;
    this.time = 0;
    this.magnetActive = false;
  }
}

// Combo tracker
export class ComboTracker {
  constructor() {
    this.multiplier = 1;
    this.streak = 0;
    this.lastCollectTime = 0;
    this.comboTimeout = 1500;
    this.thresholds = [5, 15, 30, 50];
  }

  collect() {
    const now = performance.now();
    if (now - this.lastCollectTime < this.comboTimeout) {
      this.streak++;
      this.multiplier = 1;
      for (const threshold of this.thresholds) {
        if (this.streak >= threshold) this.multiplier++;
      }
    } else {
      this.streak = 1;
      this.multiplier = 1;
    }
    this.lastCollectTime = now;
    return this.multiplier;
  }

  reset() {
    this.multiplier = 1;
    this.streak = 0;
    this.lastCollectTime = 0;
  }
}

// Active power-up state tracker
export class PowerUpState {
  constructor() {
    this.active = new Map(); // type -> { remaining, config }
    this.shieldActive = false;
  }

  activate(type, duration, config) {
    if (type === 'shield') {
      this.shieldActive = true;
      return;
    }
    this.active.set(type, { remaining: duration, config });
  }

  update(delta) {
    for (const [type, state] of this.active) {
      state.remaining -= delta * 1000;
      if (state.remaining <= 0) {
        this.active.delete(type);
      }
    }
  }

  isActive(type) {
    if (type === 'shield') return this.shieldActive;
    return this.active.has(type);
  }

  consumeShield() {
    if (this.shieldActive) {
      this.shieldActive = false;
      return true;
    }
    return false;
  }

  getRemaining(type) {
    const state = this.active.get(type);
    return state ? state.remaining : 0;
  }

  getCoinMultiplier() {
    let mult = 1;
    if (this.isActive('coinMultiplier')) mult *= 5;
    if (this.isActive('scoreDoubler')) mult *= 2;
    return mult;
  }

  reset() {
    this.active.clear();
    this.shieldActive = false;
  }
}
