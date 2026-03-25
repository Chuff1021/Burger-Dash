// world.js — Track generation, environment, tile pooling, lighting
import * as THREE from 'three';

export const LANES = [-2, 0, 2];
export const LANE_WIDTH = 2;
export const TILE_LENGTH = 20;
const POOL_SIZE = 20;
const BASE_SPEED = 15;
const MAX_SPEED = 35;
const ACCEL_FACTOR = 2;

// Create checkerboard texture for floor
function createFloorTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const tileSize = 32;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? '#cc3333' : '#f5f0e8';
      ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
    }
  }
  // Add subtle grid lines
  ctx.strokeStyle = 'rgba(0,0,0,0.1)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 8; i++) {
    ctx.beginPath();
    ctx.moveTo(i * tileSize, 0);
    ctx.lineTo(i * tileSize, 256);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i * tileSize);
    ctx.lineTo(256, i * tileSize);
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 10);
  return texture;
}

// Environment decoration factory
const DECOR_TYPES = [
  {
    name: 'fryer',
    build: () => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 1.2, 0.8),
        new THREE.MeshToonMaterial({ color: 0x888888 })
      );
      body.position.y = 0.6;
      g.add(body);
      const basket = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.3, 0.4, 8),
        new THREE.MeshToonMaterial({ color: 0xcccccc })
      );
      basket.position.y = 1.4;
      g.add(basket);
      return g;
    }
  },
  {
    name: 'counter',
    build: () => {
      const g = new THREE.Group();
      const top = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 0.1, 1),
        new THREE.MeshToonMaterial({ color: 0x8B4513 })
      );
      top.position.y = 1;
      g.add(top);
      const base = new THREE.Mesh(
        new THREE.BoxGeometry(1.3, 1, 0.9),
        new THREE.MeshToonMaterial({ color: 0x654321 })
      );
      base.position.y = 0.5;
      g.add(base);
      return g;
    }
  },
  {
    name: 'neonSign',
    build: () => {
      const g = new THREE.Group();
      const board = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 0.8, 0.05),
        new THREE.MeshBasicMaterial({ color: 0xff4444 })
      );
      board.position.y = 2.5;
      g.add(board);
      // Glow
      const glow = new THREE.PointLight(0xff4444, 0.5, 4);
      glow.position.set(0, 2.5, 0.2);
      g.add(glow);
      return g;
    }
  },
  {
    name: 'trashCan',
    build: () => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.35, 0.9, 8),
        new THREE.MeshToonMaterial({ color: 0x555555 })
      );
      body.position.y = 0.45;
      g.add(body);
      const lid = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.35, 0.05, 8),
        new THREE.MeshToonMaterial({ color: 0x666666 })
      );
      lid.position.y = 0.92;
      g.add(lid);
      return g;
    }
  },
  {
    name: 'lamp',
    build: () => {
      const g = new THREE.Group();
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, 2, 6),
        new THREE.MeshToonMaterial({ color: 0x333333 })
      );
      pole.position.y = 2.5;
      g.add(pole);
      const shade = new THREE.Mesh(
        new THREE.ConeGeometry(0.4, 0.3, 8),
        new THREE.MeshToonMaterial({ color: 0xff8c00 })
      );
      shade.position.y = 3.2;
      shade.rotation.x = Math.PI;
      g.add(shade);
      const light = new THREE.PointLight(0xff8c00, 0.4, 5);
      light.position.set(0, 3, 0);
      g.add(light);
      return g;
    }
  }
];

// Parallax background building
function createBackgroundCity(scene) {
  const buildingGroup = new THREE.Group();

  for (let i = 0; i < 30; i++) {
    const w = 2 + Math.random() * 4;
    const h = 5 + Math.random() * 15;
    const d = 2 + Math.random() * 4;
    const building = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshToonMaterial({
        color: new THREE.Color().setHSL(0.6 + Math.random() * 0.1, 0.2, 0.1 + Math.random() * 0.1)
      })
    );
    const side = i < 15 ? -1 : 1;
    building.position.set(
      side * (15 + Math.random() * 20),
      h / 2,
      -i * 8 - Math.random() * 30
    );
    buildingGroup.add(building);

    // Random window lights
    if (Math.random() > 0.5) {
      const windowLight = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.4, 0.1),
        new THREE.MeshBasicMaterial({ color: 0xffdd88 })
      );
      windowLight.position.set(
        building.position.x + side * (w / 2 + 0.05),
        h * 0.5 + Math.random() * h * 0.3,
        building.position.z
      );
      buildingGroup.add(windowLight);
    }
  }

  // Neon signs on some buildings
  const signColors = [0xff0044, 0x00ff88, 0xff8800, 0x00aaff, 0xff00ff];
  for (let i = 0; i < 8; i++) {
    const color = signColors[i % signColors.length];
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(2, 0.6, 0.05),
      new THREE.MeshBasicMaterial({ color })
    );
    const side = i % 2 === 0 ? -1 : 1;
    sign.position.set(
      side * (12 + Math.random() * 5),
      4 + Math.random() * 8,
      -20 - i * 25
    );
    sign.rotation.y = side * Math.PI / 2;
    buildingGroup.add(sign);

    const glow = new THREE.PointLight(color, 0.3, 8);
    glow.position.copy(sign.position);
    buildingGroup.add(glow);
  }

  scene.add(buildingGroup);
  return buildingGroup;
}

// Wall panels along the track sides
function createWalls(scene) {
  const wallGroup = new THREE.Group();

  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < POOL_SIZE; i++) {
      const wall = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 4, TILE_LENGTH),
        new THREE.MeshToonMaterial({
          color: side === -1 ? 0x443322 : 0x334422
        })
      );
      wall.position.set(side * 4.5, 2, -i * TILE_LENGTH);
      wallGroup.add(wall);
    }
  }

  scene.add(wallGroup);
  return wallGroup;
}

export function createEnvironmentScene(scene) {
  // Ambient light - warm
  const ambient = new THREE.AmbientLight(0xffeedd, 0.5);
  scene.add(ambient);

  // Main directional light
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(2, 8, 5);
  scene.add(dirLight);

  // Warm point light near player
  const warmLight = new THREE.PointLight(0xff8c00, 0.6, 20);
  warmLight.position.set(0, 4, 0);
  scene.add(warmLight);

  // Fog for distance fade
  scene.fog = new THREE.Fog(0x1a0a00, 30, 80);
  scene.background = new THREE.Color(0x1a0a00);

  // Background city
  createBackgroundCity(scene);

  return { warmLight };
}

export class TrackManager {
  constructor(scene) {
    this.scene = scene;
    this.tiles = [];
    this.decorPool = [];
    this.speed = BASE_SPEED;
    this.distance = 0;
    this.nextZ = 0;
    this.floorTexture = createFloorTexture();
    this.floorMaterial = new THREE.MeshToonMaterial({
      map: this.floorTexture,
      color: 0xffffff
    });
  }

  init() {
    // Create tile pool
    for (let i = 0; i < POOL_SIZE; i++) {
      const tile = this.createTile();
      tile.position.z = -i * TILE_LENGTH;
      this.tiles.push(tile);
      this.scene.add(tile);
      this.addDecorations(tile);
    }
    this.nextZ = -POOL_SIZE * TILE_LENGTH;
  }

  createTile() {
    const geo = new THREE.PlaneGeometry(9, TILE_LENGTH);
    const tile = new THREE.Mesh(geo, this.floorMaterial);
    tile.rotation.x = -Math.PI / 2;
    tile.receiveShadow = true;

    // Lane dividers
    const dividerGeo = new THREE.BoxGeometry(0.03, 0.01, TILE_LENGTH);
    const dividerMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.2 });
    const div1 = new THREE.Mesh(dividerGeo, dividerMat);
    div1.position.set(-1, 0.01, 0);
    div1.rotation.x = Math.PI / 2;
    tile.add(div1);
    const div2 = new THREE.Mesh(dividerGeo, dividerMat);
    div2.position.set(1, 0.01, 0);
    div2.rotation.x = Math.PI / 2;
    tile.add(div2);

    tile.userData.decorations = [];
    return tile;
  }

  addDecorations(tile) {
    // Remove old decorations
    for (const d of tile.userData.decorations) {
      this.scene.remove(d);
    }
    tile.userData.decorations = [];

    // Add random decorations on sides
    const numDecor = Math.floor(Math.random() * 3);
    for (let i = 0; i < numDecor; i++) {
      const type = DECOR_TYPES[Math.floor(Math.random() * DECOR_TYPES.length)];
      const decor = type.build();
      const side = Math.random() > 0.5 ? 1 : -1;
      decor.position.set(
        side * (5 + Math.random() * 1.5),
        0,
        tile.position.z + (Math.random() - 0.5) * TILE_LENGTH * 0.8
      );
      decor.rotation.y = Math.random() * Math.PI * 2;
      this.scene.add(decor);
      tile.userData.decorations.push(decor);
    }
  }

  update(delta) {
    const moveAmount = this.speed * delta;
    this.distance += moveAmount;

    // Move all tiles toward camera
    for (const tile of this.tiles) {
      tile.position.z += moveAmount;
      // Move decorations too
      for (const d of tile.userData.decorations) {
        d.position.z += moveAmount;
      }
    }

    // Recycle tiles that passed the camera
    while (this.tiles.length > 0 && this.tiles[0].position.z > TILE_LENGTH) {
      const old = this.tiles.shift();
      // Remove old decorations
      for (const d of old.userData.decorations) {
        this.scene.remove(d);
      }
      old.userData.decorations = [];

      old.position.z = this.nextZ;
      this.nextZ -= TILE_LENGTH;
      this.tiles.push(old);
      this.addDecorations(old);
    }

    // Update speed based on distance
    this.speed = Math.min(MAX_SPEED, BASE_SPEED + (this.distance / 500) * ACCEL_FACTOR);
  }

  getSpeed() {
    return this.speed;
  }

  getDistance() {
    return this.distance;
  }

  reset() {
    // Remove all tiles and decorations
    for (const tile of this.tiles) {
      for (const d of tile.userData.decorations) {
        this.scene.remove(d);
      }
      tile.userData.decorations = [];
      this.scene.remove(tile);
    }
    this.tiles = [];
    this.speed = BASE_SPEED;
    this.distance = 0;
    this.nextZ = 0;
  }
}
