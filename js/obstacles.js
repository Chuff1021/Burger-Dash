// obstacles.js — Obstacle spawning, patterns, pooling, collision
import * as THREE from 'three';
import { LANES, LANE_WIDTH } from './world.js';

// Shared toon gradient
function toonMat(color) {
  return new THREE.MeshToonMaterial({ color });
}

// 8 Obstacle types
const OBSTACLE_TYPES = {
  fryBasket: {
    id: 'fryBasket',
    name: 'Fry Basket Wall',
    color: 0xDAA520,
    yOffset: 0.5,
    avoid: 'jump_or_lane',
    difficulty: 1,
    build: () => {
      const g = new THREE.Group();
      // Basket base
      const base = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 0.8, 0.6),
        toonMat(0xDAA520)
      );
      base.position.y = 0.4;
      g.add(base);
      // Fries sticking out
      for (let i = 0; i < 8; i++) {
        const fry = new THREE.Mesh(
          new THREE.BoxGeometry(0.08, 0.5, 0.08),
          toonMat(0xFFD700)
        );
        fry.position.set(-0.6 + i * 0.17, 1.05, (Math.random() - 0.5) * 0.3);
        fry.rotation.z = (Math.random() - 0.5) * 0.3;
        g.add(fry);
      }
      return g;
    }
  },
  sodaTower: {
    id: 'sodaTower',
    name: 'Soda Tower',
    color: 0xFF4444,
    yOffset: 0,
    avoid: 'slide_or_lane',
    difficulty: 1,
    build: () => {
      const g = new THREE.Group();
      const colors = [0xFF4444, 0x4444FF, 0x44FF44];
      for (let i = 0; i < 3; i++) {
        const cup = new THREE.Mesh(
          new THREE.CylinderGeometry(0.25, 0.3, 0.7, 8),
          toonMat(colors[i])
        );
        cup.position.set((i - 1) * 0.15, 0.35 + i * 0.7, 0);
        g.add(cup);
      }
      // Straw sticking out high
      const straw = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, 1.5, 6),
        toonMat(0xFFFFFF)
      );
      straw.position.set(0.1, 2.6, 0);
      straw.rotation.z = 0.1;
      g.add(straw);
      return g;
    }
  },
  hotDogCart: {
    id: 'hotDogCart',
    name: 'Hot Dog Cart',
    color: 0xFF8C00,
    yOffset: 0,
    avoid: 'lane',
    difficulty: 2,
    build: () => {
      const g = new THREE.Group();
      // Cart body
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(1.8, 1, 1),
        toonMat(0xFF8C00)
      );
      body.position.y = 0.7;
      g.add(body);
      // Wheels
      for (let i = -1; i <= 1; i += 2) {
        const wheel = new THREE.Mesh(
          new THREE.CylinderGeometry(0.2, 0.2, 0.08, 12),
          toonMat(0x333333)
        );
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(i * 0.9, 0.2, 0.5);
        g.add(wheel);
      }
      // Umbrella
      const umbrella = new THREE.Mesh(
        new THREE.ConeGeometry(1, 0.5, 8),
        toonMat(0xFF4444)
      );
      umbrella.position.y = 2.2;
      g.add(umbrella);
      return g;
    }
  },
  ketchupSpill: {
    id: 'ketchupSpill',
    name: 'Ketchup Spill',
    color: 0xCC0000,
    yOffset: 0.01,
    avoid: 'lane',
    difficulty: 1,
    build: () => {
      const g = new THREE.Group();
      const spill = new THREE.Mesh(
        new THREE.CylinderGeometry(0.9, 1, 0.02, 16),
        new THREE.MeshToonMaterial({
          color: 0xCC0000,
          transparent: true,
          opacity: 0.8
        })
      );
      spill.position.y = 0.01;
      g.add(spill);
      // Smaller splatter
      const splat = new THREE.Mesh(
        new THREE.CylinderGeometry(0.4, 0.5, 0.02, 12),
        new THREE.MeshToonMaterial({
          color: 0xAA0000,
          transparent: true,
          opacity: 0.7
        })
      );
      splat.position.set(0.5, 0.01, 0.3);
      g.add(splat);
      return g;
    }
  },
  burgerStack: {
    id: 'burgerStack',
    name: 'Burger Stack',
    color: 0xDEB887,
    yOffset: 0,
    avoid: 'lane',
    difficulty: 2,
    build: () => {
      const g = new THREE.Group();
      for (let i = 0; i < 4; i++) {
        // Bun
        const bun = new THREE.Mesh(
          new THREE.CylinderGeometry(0.5, 0.55, 0.2, 12),
          toonMat(0xDEB887)
        );
        bun.position.y = i * 0.5;
        g.add(bun);
        // Patty
        const patty = new THREE.Mesh(
          new THREE.CylinderGeometry(0.52, 0.52, 0.1, 12),
          toonMat(0x8B4513)
        );
        patty.position.y = i * 0.5 + 0.2;
        g.add(patty);
      }
      // Top bun
      const topBun = new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
        toonMat(0xDEB887)
      );
      topBun.position.y = 2;
      g.add(topBun);
      return g;
    }
  },
  rotatingGrill: {
    id: 'rotatingGrill',
    name: 'Rotating Grill',
    color: 0x666666,
    yOffset: 0,
    avoid: 'timing',
    difficulty: 3,
    build: () => {
      const g = new THREE.Group();
      // Vertical posts
      for (let i = -1; i <= 1; i += 2) {
        const post = new THREE.Mesh(
          new THREE.CylinderGeometry(0.08, 0.08, 2.5, 8),
          toonMat(0x444444)
        );
        post.position.set(i * 2, 1.25, 0);
        g.add(post);
      }
      // Rotating bar
      const bar = new THREE.Mesh(
        new THREE.BoxGeometry(4, 0.15, 0.15),
        toonMat(0x888888)
      );
      bar.position.y = 1;
      bar.name = 'spinBar';
      g.add(bar);
      // Grill grates
      for (let i = 0; i < 5; i++) {
        const grate = new THREE.Mesh(
          new THREE.BoxGeometry(0.05, 0.8, 0.15),
          toonMat(0x666666)
        );
        grate.position.set(-1.5 + i * 0.75, 1, 0);
        grate.name = 'grate';
        bar.add(grate);
      }
      return g;
    },
    animate: (group, time) => {
      const bar = group.getObjectByName('spinBar');
      if (bar) bar.rotation.z = time * 2;
    }
  },
  lowSign: {
    id: 'lowSign',
    name: 'Low Hanging Sign',
    color: 0xFF4488,
    yOffset: 0,
    avoid: 'slide',
    difficulty: 2,
    build: () => {
      const g = new THREE.Group();
      // Sign board hanging low
      const sign = new THREE.Mesh(
        new THREE.BoxGeometry(1.8, 0.6, 0.1),
        new THREE.MeshBasicMaterial({ color: 0xFF4488 })
      );
      sign.position.y = 1.5;
      g.add(sign);
      // "BURGER DASH" text plate
      const text = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 0.35, 0.12),
        new THREE.MeshBasicMaterial({ color: 0xFFD700 })
      );
      text.position.y = 1.5;
      text.position.z = 0.06;
      g.add(text);
      // Chains
      for (let i = -1; i <= 1; i += 2) {
        const chain = new THREE.Mesh(
          new THREE.CylinderGeometry(0.02, 0.02, 1.5, 6),
          toonMat(0x888888)
        );
        chain.position.set(i * 0.7, 2.5, 0);
        g.add(chain);
      }
      return g;
    }
  },
  movingTray: {
    id: 'movingTray',
    name: 'Moving Food Tray',
    color: 0xCC9966,
    yOffset: 0,
    avoid: 'jump',
    difficulty: 3,
    build: () => {
      const g = new THREE.Group();
      // Tray
      const tray = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 0.05, 0.8),
        toonMat(0xCC9966)
      );
      tray.position.y = 0.5;
      g.add(tray);
      // Food items on tray
      const burger = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.22, 0.25, 8),
        toonMat(0xDEB887)
      );
      burger.position.set(-0.3, 0.65, 0);
      g.add(burger);
      const drink = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.15, 0.35, 8),
        toonMat(0xFF4444)
      );
      drink.position.set(0.3, 0.7, 0);
      g.add(drink);
      return g;
    },
    animate: (group, time, speed) => {
      // Moves laterally
      group.position.x = Math.sin(time * 1.5) * 2;
    }
  }
};

const OBSTACLE_KEYS = Object.keys(OBSTACLE_TYPES);

// Spawn patterns
const SPAWN_PATTERNS = [
  // Single obstacles
  { obstacles: [{ type: 'fryBasket', lane: 'random' }], minDifficulty: 0 },
  { obstacles: [{ type: 'ketchupSpill', lane: 'random' }], minDifficulty: 0 },
  { obstacles: [{ type: 'sodaTower', lane: 'random' }], minDifficulty: 0 },
  { obstacles: [{ type: 'burgerStack', lane: 'random' }], minDifficulty: 100 },
  { obstacles: [{ type: 'lowSign', lane: 'random' }], minDifficulty: 200 },
  { obstacles: [{ type: 'hotDogCart', lane: 'random' }], minDifficulty: 300 },

  // Two obstacles
  { obstacles: [{ type: 'fryBasket', lane: 0 }, { type: 'fryBasket', lane: 1 }], minDifficulty: 400 },
  { obstacles: [{ type: 'fryBasket', lane: 1 }, { type: 'fryBasket', lane: 2 }], minDifficulty: 400 },
  { obstacles: [{ type: 'ketchupSpill', lane: 0 }, { type: 'burgerStack', lane: 2 }], minDifficulty: 500 },
  { obstacles: [{ type: 'lowSign', lane: 1 }, { type: 'fryBasket', lane: 0 }], minDifficulty: 600 },
  { obstacles: [{ type: 'sodaTower', lane: 0 }, { type: 'sodaTower', lane: 2 }], minDifficulty: 500 },

  // Three obstacles (hard)
  { obstacles: [{ type: 'fryBasket', lane: 0 }, { type: 'lowSign', lane: 1 }, { type: 'fryBasket', lane: 2 }], minDifficulty: 800 },
  { obstacles: [{ type: 'burgerStack', lane: 0 }, { type: 'burgerStack', lane: 2 }], minDifficulty: 700 },

  // Moving / animated
  { obstacles: [{ type: 'rotatingGrill', lane: 1 }], minDifficulty: 1000 },
  { obstacles: [{ type: 'movingTray', lane: 1 }], minDifficulty: 800 },
];

const POOL_SIZE_PER_TYPE = 4;

export class ObstacleManager {
  constructor() {
    this.pools = {};
    this.active = [];
    this.scene = null;
    this.spawnTimer = 0;
    this.spawnInterval = 1.5; // seconds between spawns
    this.minInterval = 0.6;
    this.time = 0;
    this.frozen = false;
    this.slowFactor = 1;
  }

  init(scene) {
    this.scene = scene;

    // Create object pools
    for (const key of OBSTACLE_KEYS) {
      this.pools[key] = [];
      const type = OBSTACLE_TYPES[key];
      for (let i = 0; i < POOL_SIZE_PER_TYPE; i++) {
        const mesh = type.build();
        mesh.visible = false;
        mesh.userData.typeId = key;
        mesh.userData.box = new THREE.Box3();
        scene.add(mesh);
        this.pools[key].push({ mesh, active: false, typeId: key });
      }
    }
  }

  acquire(typeId) {
    const pool = this.pools[typeId];
    if (!pool) return null;
    const available = pool.find(o => !o.active);
    if (!available) return null;
    available.active = true;
    available.mesh.visible = true;
    return available;
  }

  release(obstacle) {
    obstacle.active = false;
    obstacle.mesh.visible = false;
    this.active = this.active.filter(o => o !== obstacle);
  }

  update(delta, speed, distance) {
    this.time += delta;
    this.spawnTimer += delta;

    // Adjust spawn interval based on distance
    const distanceKm = distance / 1000;
    this.spawnInterval = Math.max(this.minInterval, 1.5 - distanceKm * 0.1);

    // Spawn new obstacles
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      this.spawnPattern(distance);
    }

    // Move and update active obstacles
    const moveSpeed = this.frozen ? 0 : speed * this.slowFactor;

    for (let i = this.active.length - 1; i >= 0; i--) {
      const obs = this.active[i];
      obs.mesh.position.z += moveSpeed * delta;

      // Animate if applicable
      const type = OBSTACLE_TYPES[obs.typeId];
      if (type.animate && !this.frozen) {
        type.animate(obs.mesh, this.time, speed);
      }

      // Update bounding box
      obs.mesh.userData.box.setFromObject(obs.mesh);

      // Recycle if past camera
      if (obs.mesh.position.z > 10) {
        this.release(obs);
      }
    }
  }

  spawnPattern(distance) {
    // Filter patterns by difficulty
    const available = SPAWN_PATTERNS.filter(p => distance >= p.minDifficulty);
    if (available.length === 0) return;

    const pattern = available[Math.floor(Math.random() * available.length)];

    for (const obsDef of pattern.obstacles) {
      let lane = obsDef.lane;
      if (lane === 'random') {
        lane = Math.floor(Math.random() * 3);
      }

      const obs = this.acquire(obsDef.type);
      if (!obs) continue;

      obs.mesh.position.set(
        LANES[lane],
        OBSTACLE_TYPES[obsDef.type].yOffset,
        -60 - Math.random() * 10
      );

      this.active.push(obs);
    }
  }

  checkCollision(playerBox) {
    for (const obs of this.active) {
      if (obs.mesh.userData.box.intersectsBox(playerBox)) {
        return obs;
      }
    }
    return null;
  }

  // Special ability effects
  freezeAll() {
    this.frozen = true;
    // Visual: tint all active obstacles blue
    for (const obs of this.active) {
      obs.mesh.traverse(child => {
        if (child.isMesh && child.material) {
          child.userData.origColor = child.material.color.getHex();
          child.material = child.material.clone();
          child.material.color.set(0x88CCFF);
        }
      });
    }
  }

  unfreezeAll() {
    this.frozen = false;
    for (const obs of this.active) {
      obs.mesh.traverse(child => {
        if (child.isMesh && child.userData.origColor !== undefined) {
          child.material.color.set(child.userData.origColor);
        }
      });
    }
  }

  slowAll(factor) {
    this.slowFactor = factor;
  }

  resetSlow() {
    this.slowFactor = 1;
  }

  destroyInPath(playerX, playerZ) {
    // Destroy obstacles near the player's lane (for fire trail ability)
    for (let i = this.active.length - 1; i >= 0; i--) {
      const obs = this.active[i];
      if (Math.abs(obs.mesh.position.x - playerX) < LANE_WIDTH &&
          obs.mesh.position.z < playerZ + 5 &&
          obs.mesh.position.z > playerZ - 2) {
        this.release(obs);
      }
    }
  }

  reset() {
    for (let i = this.active.length - 1; i >= 0; i--) {
      this.release(this.active[i]);
    }
    this.active = [];
    this.spawnTimer = 0;
    this.time = 0;
    this.frozen = false;
    this.slowFactor = 1;
  }
}
