// track.js — Temple Run turning corridor system
// Roads spawn with random turns (straight/left/right)
// Player runs in 4 cardinal directions (0=Z-, 1=X+, 2=Z+, 3=X-)
import * as THREE from 'three';

export const ROAD_LENGTH = 22;
export const ROAD_WIDTH = 4;
const ROAD_HALF = ROAD_LENGTH / 2;

// Direction vectors for each cardinal direction
export const DIR_VECTORS = [
  new THREE.Vector3(0, 0, -1),   // 0: Z-negative (default forward)
  new THREE.Vector3(1, 0, 0),    // 1: X-positive (right)
  new THREE.Vector3(0, 0, 1),    // 2: Z-positive (backward)
  new THREE.Vector3(-1, 0, 0),   // 3: X-negative (left)
];

// Road texture
function createRoadTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Stone/kitchen tile road
  ctx.fillStyle = '#665544';
  ctx.fillRect(0, 0, 256, 512);

  const tileW = 64;
  const tileH = 64;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 4; x++) {
      const offset = y % 2 === 0 ? 0 : tileW / 2;
      const r = 85 + Math.random() * 25;
      const g = 70 + Math.random() * 20;
      const b = 55 + Math.random() * 15;
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(x * tileW + offset + 2, y * tileH + 2, tileW - 4, tileH - 4);
    }
  }

  // Edge lines (path borders)
  ctx.fillStyle = '#FFD700';
  ctx.fillRect(0, 0, 6, 512);
  ctx.fillRect(250, 0, 6, 512);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 4);
  return texture;
}

function createWallTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#443322';
  ctx.fillRect(0, 0, 128, 256);
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 4; x++) {
      const off = y % 2 === 0 ? 0 : 16;
      ctx.fillStyle = `rgb(${60+Math.random()*30},${40+Math.random()*20},${25+Math.random()*15})`;
      ctx.fillRect(x * 32 + off + 1, y * 32 + 1, 30, 30);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 4);
  return tex;
}

// Single road segment
class RoadSegment {
  constructor(direction, position, scene, roadMaterial, wallMaterial) {
    this.direction = direction;
    this.group = new THREE.Group();
    this.nextRoadSpawned = false;
    this.passed = false;     // player has entered this segment
    this.complete = false;   // player has reached the turn point
    this.scene = scene;

    // Road surface
    const roadGeo = new THREE.PlaneGeometry(ROAD_WIDTH, ROAD_LENGTH);
    const road = new THREE.Mesh(roadGeo, roadMaterial);
    road.rotation.x = -Math.PI / 2;
    road.receiveShadow = true;
    this.group.add(road);

    // Side walls
    const wallGeo = new THREE.BoxGeometry(0.3, 3, ROAD_LENGTH);
    const leftWall = new THREE.Mesh(wallGeo, wallMaterial);
    leftWall.position.set(-ROAD_WIDTH / 2 - 0.15, 1.5, 0);
    leftWall.castShadow = true;
    leftWall.receiveShadow = true;
    this.group.add(leftWall);

    const rightWall = new THREE.Mesh(wallGeo, wallMaterial);
    rightWall.position.set(ROAD_WIDTH / 2 + 0.15, 1.5, 0);
    rightWall.castShadow = true;
    rightWall.receiveShadow = true;
    this.group.add(rightWall);

    // Ceiling beams (every few units for kitchen/temple feel)
    for (let z = -ROAD_HALF + 3; z < ROAD_HALF; z += 5) {
      const beam = new THREE.Mesh(
        new THREE.BoxGeometry(ROAD_WIDTH + 0.6, 0.2, 0.3),
        new THREE.MeshStandardMaterial({ color: 0x554433, roughness: 0.7 })
      );
      beam.position.set(0, 3, z);
      beam.castShadow = true;
      this.group.add(beam);
    }

    // Ambient lights along the corridor
    const light1 = new THREE.PointLight(0xFF8C00, 0.6, 10);
    light1.position.set(0, 2.5, -ROAD_HALF / 2);
    this.group.add(light1);

    const light2 = new THREE.PointLight(0xFF6600, 0.4, 10);
    light2.position.set(0, 2.5, ROAD_HALF / 2);
    this.group.add(light2);

    // Rotate and position based on direction
    this.applyDirectionTransform(direction, position);
    scene.add(this.group);

    // Store world-space start and end points for player tracking
    this.startPos = position.clone();
    const dirVec = DIR_VECTORS[direction].clone().multiplyScalar(ROAD_LENGTH);
    this.endPos = position.clone().add(dirVec);
  }

  applyDirectionTransform(direction, position) {
    // Rotate the entire group to face the right direction
    switch (direction) {
      case 0: // Z-negative (default)
        this.group.rotation.y = 0;
        break;
      case 1: // X-positive
        this.group.rotation.y = -Math.PI / 2;
        break;
      case 2: // Z-positive
        this.group.rotation.y = Math.PI;
        break;
      case 3: // X-negative
        this.group.rotation.y = Math.PI / 2;
        break;
    }

    // Position at the midpoint of the road segment
    const midOffset = DIR_VECTORS[direction].clone().multiplyScalar(ROAD_LENGTH / 2);
    this.group.position.copy(position).add(midOffset);
  }

  // Check if player has passed the start of this segment
  checkPassed(playerPos) {
    const dir = this.direction;
    const startP = this.startPos;
    switch (dir) {
      case 0: return playerPos.z < startP.z;
      case 1: return playerPos.x > startP.x;
      case 2: return playerPos.z > startP.z;
      case 3: return playerPos.x < startP.x;
    }
    return false;
  }

  // Check if player has reached the end (turn point)
  checkComplete(playerPos) {
    const dir = this.direction;
    const endP = this.endPos;
    const margin = 3; // units before end where turning is allowed
    switch (dir) {
      case 0: return playerPos.z < endP.z + margin;
      case 1: return playerPos.x > endP.x - margin;
      case 2: return playerPos.z > endP.z - margin;
      case 3: return playerPos.x < endP.x - margin;
    }
    return false;
  }

  // Check if player overshot (missed the turn = death)
  checkOvershot(playerPos) {
    const dir = this.direction;
    const endP = this.endPos;
    switch (dir) {
      case 0: return playerPos.z < endP.z - 1;
      case 1: return playerPos.x > endP.x + 1;
      case 2: return playerPos.z > endP.z + 1;
      case 3: return playerPos.x < endP.x + 1;
    }
    return false;
  }

  dispose() {
    this.scene.remove(this.group);
    this.group.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (child.material.map) child.material.map.dispose();
        child.material.dispose();
      }
    });
  }
}

// Track Manager — generates turning corridors
export class TrackManager {
  constructor(scene) {
    this.scene = scene;
    this.segments = [];
    this.speed = 8;
    this.maxSpeed = 20;
    this.distance = 0;
    this.nextSpawnPos = new THREE.Vector3(0, 0, 0);
    this.nextDirection = 0;

    this.roadTexture = createRoadTexture();
    this.roadMaterial = new THREE.MeshStandardMaterial({
      map: this.roadTexture,
      roughness: 0.6,
      metalness: 0.1,
    });
    this.wallTexture = createWallTexture();
    this.wallMaterial = new THREE.MeshStandardMaterial({
      map: this.wallTexture,
      roughness: 0.8,
    });
  }

  init() {
    this.nextSpawnPos.set(0, 0, 0);
    this.nextDirection = 0;

    // Spawn initial straight segments
    for (let i = 0; i < 5; i++) {
      this.spawnSegment(0); // All straight initially
    }
  }

  spawnSegment(turnType) {
    // turnType: 0=straight, 1=turn left, 2=turn right
    let dir = this.nextDirection;

    if (turnType === 1) {
      dir = (this.nextDirection - 1 + 4) % 4; // Left turn
    } else if (turnType === 2) {
      dir = (this.nextDirection + 1) % 4; // Right turn
    }

    const segment = new RoadSegment(
      dir,
      this.nextSpawnPos.clone(),
      this.scene,
      this.roadMaterial,
      this.wallMaterial
    );

    this.segments.push(segment);

    // Update spawn position for next segment
    const offset = DIR_VECTORS[dir].clone().multiplyScalar(ROAD_LENGTH);
    this.nextSpawnPos.add(offset);
    this.nextDirection = dir;

    return segment;
  }

  spawnRandomSegment() {
    // Weight: 40% straight, 30% left, 30% right
    const r = Math.random();
    let turnType;
    if (r < 0.4) turnType = 0;
    else if (r < 0.7) turnType = 1;
    else turnType = 2;

    return this.spawnSegment(turnType);
  }

  update(delta, playerPos) {
    this.distance += this.speed * delta;
    this.speed = Math.min(this.maxSpeed, 8 + this.distance / 300);

    // Check each segment
    for (let i = 0; i < this.segments.length; i++) {
      const seg = this.segments[i];

      if (!seg.passed && seg.checkPassed(playerPos)) {
        seg.passed = true;
      }

      if (!seg.complete && seg.checkComplete(playerPos)) {
        seg.complete = true;
      }

      // Spawn next segment when player enters current one
      if (seg.passed && !seg.nextRoadSpawned) {
        seg.nextRoadSpawned = true;
        // Keep at least 4 segments ahead
        while (this.segments.length - i < 5) {
          this.spawnRandomSegment();
        }
      }
    }

    // Remove segments far behind player
    while (this.segments.length > 8) {
      const old = this.segments[0];
      // Only remove if player is well past it
      if (old.passed && old.complete) {
        old.dispose();
        this.segments.shift();
      } else {
        break;
      }
    }
  }

  // Get the current segment the player is on
  getCurrentSegment(playerPos) {
    for (let i = this.segments.length - 1; i >= 0; i--) {
      if (this.segments[i].passed) {
        return this.segments[i];
      }
    }
    return this.segments[0];
  }

  // Get the next segment (for turn preview)
  getNextSegment(currentIndex) {
    const idx = this.segments.indexOf(currentIndex);
    if (idx >= 0 && idx < this.segments.length - 1) {
      return this.segments[idx + 1];
    }
    return null;
  }

  getSpeed() { return this.speed; }
  getDistance() { return this.distance; }

  reset() {
    for (const seg of this.segments) {
      seg.dispose();
    }
    this.segments = [];
    this.speed = 8;
    this.distance = 0;
    this.nextSpawnPos.set(0, 0, 0);
    this.nextDirection = 0;
  }
}
