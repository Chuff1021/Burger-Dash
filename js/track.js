// track.js — Temple Run turning corridor system (optimized)
import * as THREE from 'three';

export const ROAD_LENGTH = 20;
export const ROAD_WIDTH = 4;

// Direction vectors for each cardinal direction
export const DIR_VECTORS = [
  new THREE.Vector3(0, 0, -1),   // 0: Z-negative (default forward)
  new THREE.Vector3(1, 0, 0),    // 1: X-positive (right)
  new THREE.Vector3(0, 0, 1),    // 2: Z-positive (backward)
  new THREE.Vector3(-1, 0, 0),   // 3: X-negative (left)
];

// Shared geometries (created once, reused)
let sharedRoadGeo = null;
let sharedWallGeo = null;
let sharedRoadMat = null;
let sharedWallMat = null;

function getSharedGeometries() {
  if (!sharedRoadGeo) {
    sharedRoadGeo = new THREE.PlaneGeometry(ROAD_WIDTH, ROAD_LENGTH);
    sharedWallGeo = new THREE.BoxGeometry(0.3, 3, ROAD_LENGTH);
  }
}

function createRoadTexture() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#665544';
  ctx.fillRect(0, 0, 128, 256);
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 4; x++) {
      const off = y % 2 === 0 ? 0 : 16;
      ctx.fillStyle = `rgb(${80+Math.random()*25},${65+Math.random()*20},${50+Math.random()*15})`;
      ctx.fillRect(x * 32 + off + 1, y * 32 + 1, 30, 30);
    }
  }
  ctx.fillStyle = '#FFD700';
  ctx.fillRect(0, 0, 4, 256);
  ctx.fillRect(124, 0, 4, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 3);
  return tex;
}

function createWallTexture() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#443322';
  ctx.fillRect(0, 0, 64, 128);
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 2; x++) {
      const off = y % 2 === 0 ? 0 : 16;
      ctx.fillStyle = `rgb(${55+Math.random()*30},${38+Math.random()*20},${22+Math.random()*15})`;
      ctx.fillRect(x * 32 + off + 1, y * 32 + 1, 30, 30);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 3);
  return tex;
}

function initSharedMaterials() {
  if (!sharedRoadMat) {
    sharedRoadMat = new THREE.MeshStandardMaterial({
      map: createRoadTexture(), roughness: 0.6, metalness: 0.1
    });
    sharedWallMat = new THREE.MeshStandardMaterial({
      map: createWallTexture(), roughness: 0.8
    });
  }
}

// Single road segment — optimized: fewer objects, shared geometry
class RoadSegment {
  constructor(direction, position, scene) {
    this.direction = direction;
    this.group = new THREE.Group();
    this.nextRoadSpawned = false;
    this.passed = false;
    this.complete = false;
    this.scene = scene;

    getSharedGeometries();
    initSharedMaterials();

    // Road surface
    const road = new THREE.Mesh(sharedRoadGeo, sharedRoadMat);
    road.rotation.x = -Math.PI / 2;
    road.receiveShadow = true;
    this.group.add(road);

    // Side walls (shared geo + material)
    const leftWall = new THREE.Mesh(sharedWallGeo, sharedWallMat);
    leftWall.position.set(-ROAD_WIDTH / 2 - 0.15, 1.5, 0);
    leftWall.receiveShadow = true;
    this.group.add(leftWall);

    const rightWall = new THREE.Mesh(sharedWallGeo, sharedWallMat);
    rightWall.position.set(ROAD_WIDTH / 2 + 0.15, 1.5, 0);
    rightWall.receiveShadow = true;
    this.group.add(rightWall);

    // Just 2 ceiling beams (not 4+), no shadow casting
    const beamMat = new THREE.MeshStandardMaterial({ color: 0x554433, roughness: 0.7 });
    const beamGeo = new THREE.BoxGeometry(ROAD_WIDTH + 0.6, 0.15, 0.25);
    for (let z = -6; z <= 6; z += 12) {
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.set(0, 3, z);
      this.group.add(beam);
    }

    // ONE light per segment only (performance)
    const light = new THREE.PointLight(0xFF8C00, 0.5, 15);
    light.position.set(0, 2.8, 0);
    this.group.add(light);

    // Rotate and position
    this.applyTransform(direction, position);
    scene.add(this.group);

    // World-space endpoints
    this.startPos = position.clone();
    this.endPos = position.clone().add(DIR_VECTORS[direction].clone().multiplyScalar(ROAD_LENGTH));
  }

  applyTransform(dir, pos) {
    const rotations = [0, -Math.PI / 2, Math.PI, Math.PI / 2];
    this.group.rotation.y = rotations[dir];
    const mid = DIR_VECTORS[dir].clone().multiplyScalar(ROAD_LENGTH / 2);
    this.group.position.copy(pos).add(mid);
  }

  // Has player entered this segment?
  checkPassed(p) {
    switch (this.direction) {
      case 0: return p.z < this.startPos.z;
      case 1: return p.x > this.startPos.x;
      case 2: return p.z > this.startPos.z;
      case 3: return p.x < this.startPos.x;
    }
  }

  // Is player near the end (turn zone)?
  checkComplete(p) {
    const m = 5; // generous turn zone
    switch (this.direction) {
      case 0: return p.z < this.endPos.z + m;
      case 1: return p.x > this.endPos.x - m;
      case 2: return p.z > this.endPos.z - m;
      case 3: return p.x < this.endPos.x - m;
    }
  }

  // Did player run past the turn?
  checkOvershot(p) {
    switch (this.direction) {
      case 0: return p.z < this.endPos.z - 2;
      case 1: return p.x > this.endPos.x + 2;
      case 2: return p.z > this.endPos.z + 2;
      case 3: return p.x < this.endPos.x + 2;
    }
  }

  dispose() {
    this.scene.remove(this.group);
    // Don't dispose shared geo/materials
  }
}

// Track Manager
export class TrackManager {
  constructor(scene) {
    this.scene = scene;
    this.segments = [];
    this.speed = 14; // faster base speed
    this.maxSpeed = 28;
    this.distance = 0;
    this.nextSpawnPos = new THREE.Vector3(0, 0, 0);
    this.nextDirection = 0;
  }

  init() {
    this.nextSpawnPos.set(0, 0, 0);
    this.nextDirection = 0;

    // Opening sequence: 3 straight, then guaranteed turns to practice
    this.spawnSegment(0); // straight
    this.spawnSegment(0); // straight
    this.spawnSegment(0); // straight
    this.spawnSegment(2); // RIGHT turn
    this.spawnSegment(0); // straight
    this.spawnSegment(1); // LEFT turn
    this.spawnSegment(0); // straight
    this.spawnSegment(2); // RIGHT turn
    this.spawnSegment(0); // straight
  }

  spawnSegment(turnType) {
    let dir = this.nextDirection;
    if (turnType === 1) dir = (dir - 1 + 4) % 4;
    else if (turnType === 2) dir = (dir + 1) % 4;

    const seg = new RoadSegment(dir, this.nextSpawnPos.clone(), this.scene);
    this.segments.push(seg);

    this.nextSpawnPos.add(DIR_VECTORS[dir].clone().multiplyScalar(ROAD_LENGTH));
    this.nextDirection = dir;
    return seg;
  }

  spawnRandomSegment() {
    const r = Math.random();
    // 30% straight, 35% left, 35% right — more turns = more fun
    return this.spawnSegment(r < 0.3 ? 0 : r < 0.65 ? 1 : 2);
  }

  update(delta, playerPos) {
    this.distance += this.speed * delta;
    this.speed = Math.min(this.maxSpeed, 14 + this.distance / 200);

    for (let i = 0; i < this.segments.length; i++) {
      const seg = this.segments[i];
      if (!seg.passed && seg.checkPassed(playerPos)) seg.passed = true;
      if (!seg.complete && seg.checkComplete(playerPos)) seg.complete = true;

      if (seg.passed && !seg.nextRoadSpawned) {
        seg.nextRoadSpawned = true;
        while (this.segments.length - i < 6) this.spawnRandomSegment();
      }
    }

    // Cleanup old segments
    while (this.segments.length > 10) {
      const old = this.segments[0];
      if (old.passed && old.complete) {
        old.dispose();
        this.segments.shift();
      } else break;
    }
  }

  getCurrentSegment(playerPos) {
    for (let i = this.segments.length - 1; i >= 0; i--) {
      if (this.segments[i].passed) return this.segments[i];
    }
    return this.segments[0];
  }

  getNextSegment(current) {
    const idx = this.segments.indexOf(current);
    if (idx >= 0 && idx < this.segments.length - 1) return this.segments[idx + 1];
    return null;
  }

  getSpeed() { return this.speed; }
  getDistance() { return this.distance; }

  reset() {
    for (const seg of this.segments) seg.dispose();
    this.segments = [];
    this.speed = 14;
    this.distance = 0;
    this.nextSpawnPos.set(0, 0, 0);
    this.nextDirection = 0;
  }
}
