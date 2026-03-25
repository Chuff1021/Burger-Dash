// world.js — Track generation, environment, tile pooling, lighting, shadows
import * as THREE from 'three';

export const LANES = [-2, 0, 2];
export const LANE_WIDTH = 2;
export const TILE_LENGTH = 20;
const POOL_SIZE = 20;
const BASE_SPEED = 15;
const MAX_SPEED = 35;
const ACCEL_FACTOR = 2;

// --- Procedural textures ---
function createFloorTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Base tile color
  ctx.fillStyle = '#888888';
  ctx.fillRect(0, 0, 512, 512);

  // Tile pattern
  const tileSize = 64;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const shade = (x + y) % 2 === 0 ? '#999999' : '#777777';
      ctx.fillStyle = shade;
      ctx.fillRect(x * tileSize + 2, y * tileSize + 2, tileSize - 4, tileSize - 4);

      // Subtle specular highlight
      const grd = ctx.createLinearGradient(x * tileSize, y * tileSize, x * tileSize + tileSize, y * tileSize + tileSize);
      grd.addColorStop(0, 'rgba(255,255,255,0.06)');
      grd.addColorStop(1, 'rgba(0,0,0,0.04)');
      ctx.fillStyle = grd;
      ctx.fillRect(x * tileSize + 2, y * tileSize + 2, tileSize - 4, tileSize - 4);
    }
  }

  // Grout lines
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 8; i++) {
    ctx.beginPath();
    ctx.moveTo(i * tileSize, 0);
    ctx.lineTo(i * tileSize, 512);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i * tileSize);
    ctx.lineTo(512, i * tileSize);
    ctx.stroke();
  }

  // Lane markings (subtle dashed center lines)
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 3;
  ctx.setLineDash([20, 15]);
  const laneX1 = (512 / 9) * 3;
  const laneX2 = (512 / 9) * 6;
  ctx.beginPath();
  ctx.moveTo(laneX1, 0);
  ctx.lineTo(laneX1, 512);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(laneX2, 0);
  ctx.lineTo(laneX2, 512);
  ctx.stroke();
  ctx.setLineDash([]);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 4);
  texture.anisotropy = 4;
  return texture;
}

function createWallTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Brick pattern
  ctx.fillStyle = '#553322';
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = '#664433';

  const brickH = 32;
  const brickW = 64;
  for (let row = 0; row < 8; row++) {
    const offset = row % 2 === 0 ? 0 : brickW / 2;
    for (let col = -1; col < 5; col++) {
      const x = col * brickW + offset;
      const y = row * brickH;
      // Slight color variation
      const r = 80 + Math.random() * 20;
      const g = 50 + Math.random() * 15;
      const b = 30 + Math.random() * 10;
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(x + 2, y + 2, brickW - 4, brickH - 4);
    }
  }

  // Mortar lines
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 2;
  for (let row = 0; row <= 8; row++) {
    ctx.beginPath();
    ctx.moveTo(0, row * brickH);
    ctx.lineTo(256, row * brickH);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 3);
  return texture;
}

// --- Environment decoration builders ---
const DECOR_BUILDERS = [
  // Deep fryer
  () => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 1.0, 0.6),
      new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.6, roughness: 0.3 })
    );
    body.position.y = 0.5;
    body.castShadow = true;
    g.add(body);
    // Oil surface (emissive warm glow)
    const oil = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.02, 0.45),
      new THREE.MeshStandardMaterial({ color: 0xCC8800, emissive: 0x664400, emissiveIntensity: 0.4, roughness: 0.1 })
    );
    oil.position.y = 1.01;
    g.add(oil);
    return g;
  },
  // Kitchen counter with prep items
  () => {
    const g = new THREE.Group();
    const counter = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.9, 0.8),
      new THREE.MeshStandardMaterial({ color: 0x8B7355, roughness: 0.6 })
    );
    counter.position.y = 0.45;
    counter.castShadow = true;
    g.add(counter);
    const top = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.06, 0.9),
      new THREE.MeshStandardMaterial({ color: 0xCCCCCC, roughness: 0.2, metalness: 0.5 })
    );
    top.position.y = 0.93;
    top.castShadow = true;
    g.add(top);
    // Cutting board
    const board = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.03, 0.3),
      new THREE.MeshStandardMaterial({ color: 0xDEB887, roughness: 0.8 })
    );
    board.position.set(-0.3, 0.97, 0);
    g.add(board);
    return g;
  },
  // Neon sign (BURGERS)
  () => {
    const g = new THREE.Group();
    const board = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.7, 0.06),
      new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 })
    );
    board.position.y = 2.8;
    g.add(board);
    // Neon text (colored bar)
    const neon = new THREE.Mesh(
      new THREE.BoxGeometry(1.3, 0.25, 0.08),
      new THREE.MeshStandardMaterial({
        color: 0xFF2200, emissive: 0xFF2200, emissiveIntensity: 2.0,
        roughness: 0.1
      })
    );
    neon.position.set(0, 2.8, 0.04);
    g.add(neon);
    // Glow light
    const glow = new THREE.PointLight(0xFF2200, 1.5, 6);
    glow.position.set(0, 2.8, 0.5);
    g.add(glow);
    return g;
  },
  // Neon sign (OPEN 24/7) - green
  () => {
    const g = new THREE.Group();
    const board = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.5, 0.06),
      new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 })
    );
    board.position.y = 3.2;
    g.add(board);
    const neon = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.2, 0.08),
      new THREE.MeshStandardMaterial({
        color: 0x00FF44, emissive: 0x00FF44, emissiveIntensity: 2.0,
        roughness: 0.1
      })
    );
    neon.position.set(0, 3.2, 0.04);
    g.add(neon);
    const glow = new THREE.PointLight(0x00FF44, 1.0, 5);
    glow.position.set(0, 3.2, 0.5);
    g.add(glow);
    return g;
  },
  // Heat lamp
  () => {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 1.5, 6),
      new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.7, roughness: 0.3 })
    );
    pole.position.y = 2.5;
    g.add(pole);
    const shade = new THREE.Mesh(
      new THREE.ConeGeometry(0.35, 0.25, 12),
      new THREE.MeshStandardMaterial({ color: 0xFF6600, metalness: 0.4, roughness: 0.4 })
    );
    shade.position.y = 3.0;
    shade.rotation.x = Math.PI;
    g.add(shade);
    const light = new THREE.PointLight(0xFF8C00, 1.0, 6);
    light.position.set(0, 2.7, 0);
    g.add(light);
    return g;
  },
  // Trash can
  () => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.3, 0.8, 10),
      new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.3, roughness: 0.6 })
    );
    body.position.y = 0.4;
    body.castShadow = true;
    g.add(body);
    const lid = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.28, 0.04, 10),
      new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.3, roughness: 0.5 })
    );
    lid.position.y = 0.82;
    g.add(lid);
    return g;
  },
  // Condiment station
  () => {
    const g = new THREE.Group();
    const stand = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.6, 0.3),
      new THREE.MeshStandardMaterial({ color: 0xCCCCCC, metalness: 0.5, roughness: 0.3 })
    );
    stand.position.y = 0.3;
    stand.castShadow = true;
    g.add(stand);
    // Bottles
    const colors = [0xFF0000, 0xFFD700, 0x228B22];
    for (let i = 0; i < 3; i++) {
      const bottle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.04, 0.2, 8),
        new THREE.MeshStandardMaterial({ color: colors[i], roughness: 0.4 })
      );
      bottle.position.set(-0.12 + i * 0.12, 0.7, 0);
      g.add(bottle);
    }
    return g;
  }
];

// --- Background city skyline ---
function createBackgroundCity(scene) {
  const group = new THREE.Group();

  // Buildings on both sides
  for (let i = 0; i < 40; i++) {
    const w = 3 + Math.random() * 6;
    const h = 8 + Math.random() * 25;
    const d = 3 + Math.random() * 5;
    const hue = 0.6 + Math.random() * 0.1;
    const lightness = 0.05 + Math.random() * 0.08;

    const building = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(hue, 0.15, lightness),
        roughness: 0.9
      })
    );
    const side = i < 20 ? -1 : 1;
    building.position.set(
      side * (12 + Math.random() * 25),
      h / 2,
      -20 - i * 10 - Math.random() * 30
    );
    building.castShadow = false;
    building.receiveShadow = false;
    group.add(building);

    // Window lights on building face
    const windowRows = Math.floor(h / 2);
    const windowCols = Math.floor(w / 1.5);
    for (let wy = 0; wy < windowRows; wy++) {
      for (let wx = 0; wx < windowCols; wx++) {
        if (Math.random() > 0.4) continue; // Only some windows lit
        const window = new THREE.Mesh(
          new THREE.PlaneGeometry(0.4, 0.5),
          new THREE.MeshBasicMaterial({
            color: new THREE.Color().setHSL(0.12, 0.6, 0.7 + Math.random() * 0.3),
            transparent: true,
            opacity: 0.7 + Math.random() * 0.3
          })
        );
        window.position.set(
          building.position.x + side * (w / 2 + 0.01),
          1.5 + wy * 2,
          building.position.z - w / 2 + wx * 1.5 + 0.75
        );
        window.rotation.y = side * Math.PI / 2;
        group.add(window);
      }
    }
  }

  // Neon signs on buildings
  const signColors = [0xFF0044, 0x00FF88, 0xFF8800, 0x00AAFF, 0xFF00FF, 0xFFFF00];
  for (let i = 0; i < 12; i++) {
    const color = signColors[i % signColors.length];
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(2.5, 0.8, 0.08),
      new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 3.0,
        roughness: 0.1
      })
    );
    const side = i % 2 === 0 ? -1 : 1;
    sign.position.set(
      side * (11 + Math.random() * 4),
      5 + Math.random() * 12,
      -30 - i * 30
    );
    sign.rotation.y = side * Math.PI / 2;
    group.add(sign);

    const glow = new THREE.PointLight(color, 0.8, 10);
    glow.position.copy(sign.position);
    glow.position.x -= side * 1;
    group.add(glow);
  }

  scene.add(group);
  return group;
}

// --- Walls along track edges ---
function createWalls(scene) {
  const wallTex = createWallTexture();
  const wallGroup = new THREE.Group();

  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < POOL_SIZE; i++) {
      const wall = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 4, TILE_LENGTH),
        new THREE.MeshStandardMaterial({
          map: wallTex.clone(),
          roughness: 0.8,
          color: 0x998877
        })
      );
      wall.position.set(side * 5, 2, -i * TILE_LENGTH);
      wall.receiveShadow = true;
      wallGroup.add(wall);
    }
  }

  scene.add(wallGroup);
  return wallGroup;
}

// --- Main scene lighting and environment ---
export function createEnvironmentScene(scene) {
  // Ambient - soft warm fill
  const ambient = new THREE.AmbientLight(0xffeedd, 0.4);
  scene.add(ambient);

  // Hemisphere light for natural sky/ground color
  const hemi = new THREE.HemisphereLight(0x8888cc, 0x443322, 0.3);
  scene.add(hemi);

  // Main directional light with shadows
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
  dirLight.position.set(5, 12, 8);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 1024;
  dirLight.shadow.mapSize.height = 1024;
  dirLight.shadow.camera.near = 0.5;
  dirLight.shadow.camera.far = 50;
  dirLight.shadow.camera.left = -15;
  dirLight.shadow.camera.right = 15;
  dirLight.shadow.camera.top = 15;
  dirLight.shadow.camera.bottom = -15;
  dirLight.shadow.bias = -0.001;
  scene.add(dirLight);

  // Warm point light following player area
  const warmLight = new THREE.PointLight(0xFF8C00, 0.8, 20);
  warmLight.position.set(0, 4, 2);
  scene.add(warmLight);

  // Rim light from behind for character pop
  const rimLight = new THREE.PointLight(0x4488FF, 0.4, 15);
  rimLight.position.set(0, 3, 8);
  scene.add(rimLight);

  // Fog for distance fade
  scene.fog = new THREE.FogExp2(0x110808, 0.012);
  scene.background = new THREE.Color(0x110808);

  // City background
  createBackgroundCity(scene);

  // Side walls
  createWalls(scene);

  return { warmLight, rimLight, dirLight };
}

// --- Track Manager ---
export class TrackManager {
  constructor(scene) {
    this.scene = scene;
    this.tiles = [];
    this.speed = BASE_SPEED;
    this.distance = 0;
    this.nextZ = 0;
    this.floorTexture = createFloorTexture();
    this.floorMaterial = new THREE.MeshStandardMaterial({
      map: this.floorTexture,
      roughness: 0.5,
      metalness: 0.1,
      color: 0xdddddd
    });
  }

  init() {
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
    const geo = new THREE.PlaneGeometry(10, TILE_LENGTH);
    const tile = new THREE.Mesh(geo, this.floorMaterial);
    tile.rotation.x = -Math.PI / 2;
    tile.receiveShadow = true;
    tile.userData.decorations = [];
    return tile;
  }

  addDecorations(tile) {
    for (const d of tile.userData.decorations) {
      this.scene.remove(d);
    }
    tile.userData.decorations = [];

    // Add 1-3 random decorations on sides
    const numDecor = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < numDecor; i++) {
      const builder = DECOR_BUILDERS[Math.floor(Math.random() * DECOR_BUILDERS.length)];
      const decor = builder();
      const side = Math.random() > 0.5 ? 1 : -1;
      decor.position.set(
        side * (5.5 + Math.random() * 2),
        0,
        tile.position.z + (Math.random() - 0.5) * TILE_LENGTH * 0.8
      );
      decor.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
      this.scene.add(decor);
      tile.userData.decorations.push(decor);
    }
  }

  update(delta) {
    const moveAmount = this.speed * delta;
    this.distance += moveAmount;

    for (const tile of this.tiles) {
      tile.position.z += moveAmount;
      for (const d of tile.userData.decorations) {
        d.position.z += moveAmount;
      }
    }

    while (this.tiles.length > 0 && this.tiles[0].position.z > TILE_LENGTH) {
      const old = this.tiles.shift();
      for (const d of old.userData.decorations) {
        this.scene.remove(d);
      }
      old.userData.decorations = [];
      old.position.z = this.nextZ;
      this.nextZ -= TILE_LENGTH;
      this.tiles.push(old);
      this.addDecorations(old);
    }

    this.speed = Math.min(MAX_SPEED, BASE_SPEED + (this.distance / 500) * ACCEL_FACTOR);
  }

  getSpeed() { return this.speed; }
  getDistance() { return this.distance; }

  reset() {
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
