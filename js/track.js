// track.js — Temple Run turning corridor system with turn openings
import * as THREE from 'three';

export const ROAD_LENGTH = 20;
export const ROAD_WIDTH = 4;
const WALL_HEIGHT = 3;
const OPENING_SIZE = 5; // gap in wall at turn points

export const DIR_VECTORS = [
  new THREE.Vector3(0, 0, -1),  // 0: Z- (default forward)
  new THREE.Vector3(1, 0, 0),   // 1: X+ (right)
  new THREE.Vector3(0, 0, 1),   // 2: Z+ (backward)
  new THREE.Vector3(-1, 0, 0),  // 3: X- (left)
];

// Shared resources
let roadMat = null, wallMat = null;

function initMaterials() {
  if (roadMat) return;

  // Road texture
  const rc = document.createElement('canvas');
  rc.width = 128; rc.height = 256;
  const rctx = rc.getContext('2d');
  rctx.fillStyle = '#665544';
  rctx.fillRect(0, 0, 128, 256);
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 4; x++) {
      const off = y % 2 === 0 ? 0 : 16;
      rctx.fillStyle = `rgb(${80+Math.random()*25},${65+Math.random()*20},${50+Math.random()*15})`;
      rctx.fillRect(x * 32 + off + 1, y * 32 + 1, 30, 30);
    }
  }
  rctx.fillStyle = '#FFD700';
  rctx.fillRect(0, 0, 4, 256);
  rctx.fillRect(124, 0, 4, 256);
  const rtex = new THREE.CanvasTexture(rc);
  rtex.wrapS = rtex.wrapT = THREE.RepeatWrapping;
  rtex.repeat.set(1, 3);
  roadMat = new THREE.MeshStandardMaterial({ map: rtex, roughness: 0.6, metalness: 0.1 });

  // Wall texture
  const wc = document.createElement('canvas');
  wc.width = 64; wc.height = 128;
  const wctx = wc.getContext('2d');
  wctx.fillStyle = '#443322';
  wctx.fillRect(0, 0, 64, 128);
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 2; x++) {
      const off = y % 2 === 0 ? 0 : 16;
      wctx.fillStyle = `rgb(${55+Math.random()*30},${38+Math.random()*20},${22+Math.random()*15})`;
      wctx.fillRect(x * 32 + off + 1, y * 32 + 1, 30, 30);
    }
  }
  const wtex = new THREE.CanvasTexture(wc);
  wtex.wrapS = wtex.wrapT = THREE.RepeatWrapping;
  wtex.repeat.set(1, 3);
  wallMat = new THREE.MeshStandardMaterial({ map: wtex, roughness: 0.8 });
}

// Build a wall with an optional opening at one end
// openEnd: null | 'start' | 'end' — which end to leave a gap
function buildWall(side, openEnd) {
  const group = new THREE.Group();
  const x = side * (ROAD_WIDTH / 2 + 0.15);

  if (!openEnd) {
    // Full wall
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, WALL_HEIGHT, ROAD_LENGTH),
      wallMat
    );
    wall.position.set(x, WALL_HEIGHT / 2, 0);
    wall.receiveShadow = true;
    group.add(wall);
  } else {
    // Wall with gap — split into two parts
    const solidLength = ROAD_LENGTH - OPENING_SIZE;
    const halfSolid = solidLength / 2;

    if (openEnd === 'end') {
      // Solid from start to (end - opening)
      const wall = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, WALL_HEIGHT, solidLength),
        wallMat
      );
      // In local space, z=0 is center. Start is z=+ROAD_LENGTH/2, end is z=-ROAD_LENGTH/2
      // So "end" opening means gap near z=-ROAD_LENGTH/2
      wall.position.set(x, WALL_HEIGHT / 2, OPENING_SIZE / 2);
      wall.receiveShadow = true;
      group.add(wall);
    } else {
      // Solid from (start + opening) to end
      const wall = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, WALL_HEIGHT, solidLength),
        wallMat
      );
      wall.position.set(x, WALL_HEIGHT / 2, -OPENING_SIZE / 2);
      wall.receiveShadow = true;
      group.add(wall);
    }
  }

  return group;
}

class RoadSegment {
  constructor(direction, position, scene, turnInfo) {
    // turnInfo: { nextTurn: 'left'|'right'|'straight'|null, prevTurn: 'left'|'right'|'straight'|null }
    this.direction = direction;
    this.group = new THREE.Group();
    this.nextRoadSpawned = false;
    this.passed = false;
    this.complete = false;
    this.scene = scene;

    initMaterials();

    // Road surface
    const roadGeo = new THREE.PlaneGeometry(ROAD_WIDTH, ROAD_LENGTH);
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.receiveShadow = true;
    this.group.add(road);

    // Walls — open at turn points
    // In local space: the road runs along Z from +ROAD_LENGTH/2 (start) to -ROAD_LENGTH/2 (end)
    // "end" is the forward end (where player goes next)
    // Left wall is -X side, Right wall is +X side
    //
    // For a RIGHT turn at the end: open the RIGHT wall at the end
    // For a LEFT turn at the end: open the LEFT wall at the end

    let leftOpen = null;
    let rightOpen = null;

    if (turnInfo && turnInfo.nextTurn === 'right') {
      rightOpen = 'end';  // Open right wall at end for right turn
    } else if (turnInfo && turnInfo.nextTurn === 'left') {
      leftOpen = 'end';   // Open left wall at end for left turn
    }

    const leftWallGroup = buildWall(-1, leftOpen);
    this.group.add(leftWallGroup);

    const rightWallGroup = buildWall(1, rightOpen);
    this.group.add(rightWallGroup);

    // One ceiling beam
    const beamGeo = new THREE.BoxGeometry(ROAD_WIDTH + 0.6, 0.15, 0.25);
    const beamMat = new THREE.MeshStandardMaterial({ color: 0x554433, roughness: 0.7 });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.set(0, WALL_HEIGHT, 0);
    this.group.add(beam);

    // One warm light
    const light = new THREE.PointLight(0xFF8C00, 0.5, 15);
    light.position.set(0, 2.5, 0);
    this.group.add(light);

    // Transform to world space
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

  checkPassed(p) {
    switch (this.direction) {
      case 0: return p.z < this.startPos.z;
      case 1: return p.x > this.startPos.x;
      case 2: return p.z > this.startPos.z;
      case 3: return p.x < this.startPos.x;
    }
  }

  checkComplete(p) {
    const m = 6; // generous turn zone
    switch (this.direction) {
      case 0: return p.z < this.endPos.z + m;
      case 1: return p.x > this.endPos.x - m;
      case 2: return p.z > this.endPos.z - m;
      case 3: return p.x < this.endPos.x - m;
    }
  }

  checkOvershot(p) {
    switch (this.direction) {
      case 0: return p.z < this.endPos.z - 3;
      case 1: return p.x > this.endPos.x + 3;
      case 2: return p.z > this.endPos.z + 3;
      case 3: return p.x < this.endPos.x + 3;
    }
  }

  dispose() {
    this.scene.remove(this.group);
  }
}

// Track Manager
export class TrackManager {
  constructor(scene) {
    this.scene = scene;
    this.segments = [];
    this.speed = 14;
    this.maxSpeed = 28;
    this.distance = 0;
    this.nextSpawnPos = new THREE.Vector3(0, 0, 0);
    this.nextDirection = 0;

    // Pre-plan the sequence so we know turns in advance
    this.plannedTurns = []; // queue of turn types: 0=straight,1=left,2=right
  }

  init() {
    this.nextSpawnPos.set(0, 0, 0);
    this.nextDirection = 0;
    this.plannedTurns = [];

    // Plan initial sequence: straight, straight, straight, right, straight, left, straight, right, straight
    const initial = [0, 0, 0, 2, 0, 1, 0, 2, 0, 0, 1, 0, 2, 0, 1];
    this.plannedTurns.push(...initial);

    // Spawn initial segments
    for (let i = 0; i < 8; i++) {
      this.spawnNextPlanned();
    }
  }

  // Figure out what turn type results in what direction
  getTurnLabel(prevDir, nextDir) {
    if (nextDir === prevDir) return 'straight';
    if (nextDir === (prevDir + 1) % 4) return 'right';
    if (nextDir === (prevDir - 1 + 4) % 4) return 'left';
    return 'straight';
  }

  spawnNextPlanned() {
    // Get next turn type from queue, or generate random
    let turnType;
    if (this.plannedTurns.length > 0) {
      turnType = this.plannedTurns.shift();
    } else {
      const r = Math.random();
      turnType = r < 0.3 ? 0 : r < 0.65 ? 1 : 2;
    }

    let nextDir = this.nextDirection;
    if (turnType === 1) nextDir = (nextDir - 1 + 4) % 4;
    else if (turnType === 2) nextDir = (nextDir + 1) % 4;

    // Peek at what comes AFTER this segment to know if THIS segment needs a wall opening
    let peekTurnType;
    if (this.plannedTurns.length > 0) {
      peekTurnType = this.plannedTurns[0];
    } else {
      // Generate and store for consistency
      const r = Math.random();
      peekTurnType = r < 0.3 ? 0 : r < 0.65 ? 1 : 2;
      this.plannedTurns.push(peekTurnType);
    }

    // What direction will the segment AFTER this one go?
    let peekDir = nextDir;
    if (peekTurnType === 1) peekDir = (peekDir - 1 + 4) % 4;
    else if (peekTurnType === 2) peekDir = (peekDir + 1) % 4;

    const nextTurnLabel = this.getTurnLabel(nextDir, peekDir);

    const turnInfo = { nextTurn: nextTurnLabel };

    const seg = new RoadSegment(nextDir, this.nextSpawnPos.clone(), this.scene, turnInfo);
    this.segments.push(seg);

    this.nextSpawnPos.add(DIR_VECTORS[nextDir].clone().multiplyScalar(ROAD_LENGTH));
    this.nextDirection = nextDir;
    return seg;
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
        while (this.segments.length - i < 6) this.spawnNextPlanned();
      }
    }

    // Cleanup old
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
    this.plannedTurns = [];
  }
}
