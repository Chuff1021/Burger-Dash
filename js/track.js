// track.js — Temple Run turning corridor system with turn openings
import * as THREE from 'three';

export const ROAD_LENGTH = 28;
export const ROAD_WIDTH = 4;
const WALL_HEIGHT = 3;
const OPENING_SIZE = 8; // larger gap in wall at turn points
const WALL_THICKNESS = 0.3;

export const DIR_VECTORS = [
  new THREE.Vector3(0, 0, -1),  // 0: Z- (default forward)
  new THREE.Vector3(1, 0, 0),   // 1: X+ (right)
  new THREE.Vector3(0, 0, 1),   // 2: Z+ (backward)
  new THREE.Vector3(-1, 0, 0),  // 3: X- (left)
];

// Shared resources
let roadMat = null, wallMat = null, neonMat = null, metalMat = null;

function initMaterials() {
  if (roadMat) return;

  // Road texture
  const rc = document.createElement('canvas');
  rc.width = 128; rc.height = 256;
  const rctx = rc.getContext('2d');
  rctx.fillStyle = '#6b4f3a';
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
  wctx.fillStyle = '#6b1f1f';
  wctx.fillRect(0, 0, 64, 128);
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 2; x++) {
      const off = y % 2 === 0 ? 0 : 16;
      wctx.fillStyle = `rgb(${130+Math.random()*40},${35+Math.random()*22},${28+Math.random()*18})`;
      wctx.fillRect(x * 32 + off + 1, y * 32 + 1, 30, 30);
    }
  }
  const wtex = new THREE.CanvasTexture(wc);
  wtex.wrapS = wtex.wrapT = THREE.RepeatWrapping;
  wtex.repeat.set(1, 3);
  wallMat = new THREE.MeshStandardMaterial({ map: wtex, roughness: 0.8 });

  neonMat = new THREE.MeshStandardMaterial({
    color: 0xffd447,
    emissive: 0xff7a00,
    emissiveIntensity: 1.2,
    roughness: 0.25,
    metalness: 0.1
  });
  metalMat = new THREE.MeshStandardMaterial({
    color: 0x9aa4b2,
    roughness: 0.35,
    metalness: 0.75
  });
}

// Build a wall with an optional opening at one end
// openEnd: null | 'start' | 'end' — which end to leave a gap
function makeSignTexture(label, bg = '#B91C1C', fg = '#FDE68A') {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 96;
  const ctx = c.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = '#111827';
  ctx.fillRect(8, 8, c.width - 16, c.height - 16);
  ctx.fillStyle = fg;
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, c.width / 2, c.height / 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function addTurnFloorGuides(group, turnInfo) {
  if (!turnInfo?.nextTurn || turnInfo.nextTurn === 'straight') return;

  const side = turnInfo.nextTurn === 'left' ? -1 : 1;
  for (let i = 0; i < 3; i++) {
    const guide = new THREE.Mesh(
      new THREE.PlaneGeometry(0.42, 1.15),
      new THREE.MeshStandardMaterial({ color: 0xffe08a, emissive: 0xff8a00, emissiveIntensity: 0.42, transparent: true, opacity: 0.88 })
    );
    guide.rotation.x = -Math.PI / 2;
    guide.position.set(
      side * (0.35 + i * 0.38),
      0.02,
      -ROAD_LENGTH / 2 + 2.1 + i * 1.25
    );
    guide.rotation.z = side * (0.28 + i * 0.06);
    group.add(guide);
  }
}

function addBurgerDecor(group, turnInfo) {
  // Lightweight: one wall sign + one neon turn arrow. No PointLights, no extra meshes.
  const signTexts = ['FRESH BURGERS', 'HOT FRIES', 'DOUBLE STACK', 'SHAKES', 'COMBO UP'];
  const signTex = makeSignTexture(signTexts[Math.floor(Math.random() * signTexts.length)]);
  const signMat = new THREE.MeshStandardMaterial({
    map: signTex,
    emissive: new THREE.Color(0xff9f1c),
    emissiveMap: signTex,
    emissiveIntensity: 0.55,
    roughness: 0.5,
  });
  const side = Math.random() < 0.5 ? -1 : 1;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.55), signMat);
  sign.position.set(side * (ROAD_WIDTH / 2 - 0.18), 1.75, THREE.MathUtils.randFloat(-5, 4));
  sign.rotation.y = side === -1 ? Math.PI / 2 : -Math.PI / 2;
  group.add(sign);

  if (turnInfo?.nextTurn && turnInfo.nextTurn !== 'straight') {
    const arrow = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.42), neonMat);
    arrow.position.set(0, 2.1, -ROAD_LENGTH / 2 + 1.4);
    arrow.rotation.y = turnInfo.nextTurn === 'left' ? Math.PI / 2 : -Math.PI / 2;
    group.add(arrow);
  }
}

function createWallPiece(x, z, length) {
  const wall = new THREE.Mesh(
    new THREE.BoxGeometry(WALL_THICKNESS, WALL_HEIGHT, length),
    wallMat
  );
  wall.position.set(x, WALL_HEIGHT / 2, z);
  wall.receiveShadow = true;
  // castShadow off on walls — they're thin and shadow contribution isn't worth the GPU cost
  return wall;
}

function addTurnFrame(group, side, openEnd) {
  const sideSign = Math.sign(side) || 1;
  const openingCenterZ = openEnd === 'end'
    ? -ROAD_LENGTH / 2 + OPENING_SIZE / 2
    : ROAD_LENGTH / 2 - OPENING_SIZE / 2;

  const arrow = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.65), neonMat);
  arrow.position.set(sideSign * (ROAD_WIDTH / 2 - 0.5), 1.2, openingCenterZ);
  arrow.rotation.y = sideSign < 0 ? Math.PI / 2 : -Math.PI / 2;
  group.add(arrow);

  const guideLight = new THREE.PointLight(0xff9f1c, 0.55, 6.5);
  guideLight.position.set(sideSign * (ROAD_WIDTH / 2 - 0.55), 1.85, openingCenterZ);
  group.add(guideLight);
}

function buildWall(side, openStart = false, openEnd = false) {
  const group = new THREE.Group();
  const x = side * (ROAD_WIDTH / 2 + WALL_THICKNESS / 2);

  if (!openStart && !openEnd) {
    group.add(createWallPiece(x, 0, ROAD_LENGTH));
    return group;
  }

  if (openStart && openEnd) {
    const centerLength = ROAD_LENGTH - OPENING_SIZE * 2;
    if (centerLength > 0.25) group.add(createWallPiece(x, 0, centerLength));
    addTurnFrame(group, side, 'start');
    addTurnFrame(group, side, 'end');
    return group;
  }

  const solidLength = ROAD_LENGTH - OPENING_SIZE;
  if (openEnd) {
    group.add(createWallPiece(x, OPENING_SIZE / 2, solidLength));
    addTurnFrame(group, side, 'end');
  } else if (openStart) {
    group.add(createWallPiece(x, -OPENING_SIZE / 2, solidLength));
    addTurnFrame(group, side, 'start');
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

    let leftOpenStart = false;
    let rightOpenStart = false;
    let leftOpenEnd = false;
    let rightOpenEnd = false;

    if (turnInfo?.prevTurn === 'right') {
      rightOpenStart = true;
    } else if (turnInfo?.prevTurn === 'left') {
      leftOpenStart = true;
    }

    if (turnInfo?.nextTurn === 'right') {
      rightOpenEnd = true;
    } else if (turnInfo?.nextTurn === 'left') {
      leftOpenEnd = true;
    }

    const leftWallGroup = buildWall(-1, leftOpenStart, leftOpenEnd);
    this.group.add(leftWallGroup);

    const rightWallGroup = buildWall(1, rightOpenStart, rightOpenEnd);
    this.group.add(rightWallGroup);

    // One overhead beam — visual anchor, no PointLight (kills performance)
    const beamGeo = new THREE.BoxGeometry(ROAD_WIDTH + 0.6, 0.15, 0.25);
    const beamMat = new THREE.MeshStandardMaterial({ color: 0x554433, roughness: 0.7 });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.set(0, WALL_HEIGHT, 0);
    this.group.add(beam);

    // Burger-joint decor pass
    addTurnFloorGuides(this.group, turnInfo);
    addBurgerDecor(this.group, turnInfo);

    // Hard fail blockers behind turn logic are better than hidden geometry in the path.
    // Keep the turn opening itself as empty as possible.

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
    // Use a perpendicular corridor check to prevent cross-axis false positives.
    // Without this, a dir=1 segment fires when p.x > startPos.x even while player
    // is still running dir=0 (e.g. from lane-switching x-offset) — causing the
    // update loop to spawn segments exponentially and freeze.
    const pw = ROAD_WIDTH; // generous lateral tolerance
    switch (this.direction) {
      case 0: return p.z < this.startPos.z && Math.abs(p.x - this.startPos.x) < pw;
      case 1: return p.x > this.startPos.x && Math.abs(p.z - this.startPos.z) < pw;
      case 2: return p.z > this.startPos.z && Math.abs(p.x - this.startPos.x) < pw;
      case 3: return p.x < this.startPos.x && Math.abs(p.z - this.startPos.z) < pw;
    }
  }

  checkComplete(p) {
    const m = 6; // mark complete when within 6 units of end
    const pw = ROAD_WIDTH;
    switch (this.direction) {
      case 0: return p.z < this.endPos.z + m && Math.abs(p.x - this.startPos.x) < pw;
      case 1: return p.x > this.endPos.x - m && Math.abs(p.z - this.startPos.z) < pw;
      case 2: return p.z > this.endPos.z - m && Math.abs(p.x - this.startPos.x) < pw;
      case 3: return p.x < this.endPos.x + m && Math.abs(p.z - this.startPos.z) < pw;
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

    // Plan a generous opening sequence so turns feel intentional at the start.
    // 0=straight, 1=left, 2=right
    const initial = [
      0, 0, 2,          // three straights then right
      0, 0, 1,          // two straights then left
      0, 2, 0, 0,       // right, two straights
      1, 0, 2,          // left, straight, right
      0, 0, 1,          // two straights, left
      0, 2, 0, 1,       // right, straight, left
      0, 0, 2, 0, 1,    // building pace
      0, 2, 0, 2, 0, 1, // faster alternating
    ];
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
    const prevTurnLabel = this.segments.length > 0
      ? this.getTurnLabel(this.segments[this.segments.length - 1].direction, nextDir)
      : 'straight';

    const turnInfo = { prevTurn: prevTurnLabel, nextTurn: nextTurnLabel };

    const seg = new RoadSegment(nextDir, this.nextSpawnPos.clone(), this.scene, turnInfo);
    this.segments.push(seg);

    this.nextSpawnPos.add(DIR_VECTORS[nextDir].clone().multiplyScalar(ROAD_LENGTH));
    this.nextDirection = nextDir;
    return seg;
  }

  update(delta, playerPos) {
    this.distance += this.speed * delta;

    const distanceFactor = THREE.MathUtils.clamp(this.distance / 1800, 0, 1);
    const earlyBoost = Math.min(this.distance / 220, 3.4);
    const midBoost = Math.max(0, Math.min((this.distance - 280) / 380, 1)) * 4.2;
    const lateBoost = Math.pow(distanceFactor, 1.65) * 5.8;
    const targetSpeed = Math.min(this.maxSpeed, 14 + earlyBoost + midBoost + lateBoost);
    const accel = targetSpeed > this.speed ? 0.85 : 1.3;
    this.speed = THREE.MathUtils.lerp(this.speed, targetSpeed, Math.min(delta * accel, 1));

    // Snapshot length so newly-spawned segments don't get iterated in same frame
    const segCount = this.segments.length;
    let needsSpawn = false;
    for (let i = 0; i < segCount; i++) {
      const seg = this.segments[i];
      if (!seg.passed && seg.checkPassed(playerPos)) seg.passed = true;
      if (!seg.complete && seg.checkComplete(playerPos)) seg.complete = true;

      if (seg.passed && !seg.nextRoadSpawned) {
        seg.nextRoadSpawned = true;
        needsSpawn = true;
      }
    }
    // Spawn outside the loop to avoid iterating freshly-spawned segments
    if (needsSpawn) {
      while (this.segments.length < segCount + 5) this.spawnNextPlanned();
    }

    // Cleanup old — keep at most 8 segments; longer corridors need fewer queued
    while (this.segments.length > 8) {
      const old = this.segments[0];
      if (old.passed && old.complete) {
        old.dispose();
        this.segments.shift();
      } else break;
    }
  }

  // playerDir is optional but critical: checkPassed() is single-axis so a future segment
  // going in X can falsely become "passed" as soon as the player has any X offset from
  // lane-switching. Filtering by direction prevents that false match.
  getCurrentSegment(playerPos, playerDir = null) {
    // First pass: only consider segments matching the player's travel direction
    if (playerDir !== null) {
      for (let i = this.segments.length - 1; i >= 0; i--) {
        const seg = this.segments[i];
        if (!seg.passed || seg.direction !== playerDir) continue;
        const dist = this.getDistToEnd(seg, playerPos);
        if (dist > -10) return seg;
      }
    }
    // Fallback: direction-agnostic (same guard against massive overrun)
    for (let i = this.segments.length - 1; i >= 0; i--) {
      const seg = this.segments[i];
      if (!seg.passed) continue;
      const dist = this.getDistToEnd(seg, playerPos);
      if (dist > -10) return seg;
    }
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

  getTurnWindow(segment, playerPos) {
    const total = segment.startPos.distanceTo(segment.endPos);
    const traveled = segment.startPos.distanceTo(playerPos);
    return {
      progress: THREE.MathUtils.clamp(traveled / Math.max(total, 0.001), 0, 1)
    };
  }

  getSpeed() { return this.speed; }
  getDistance() { return this.distance; }

  // Returns positive = player is still approaching end, negative = player overshot end
  getDistToEnd(seg, playerPos) {
    switch (seg.direction) {
      case 0: return playerPos.z - seg.endPos.z;  // Z- travel: positive while approaching
      case 1: return seg.endPos.x - playerPos.x;  // X+ travel
      case 2: return seg.endPos.z - playerPos.z;  // Z+ travel
      case 3: return playerPos.x - seg.endPos.x;  // X- travel
      default: return 999;
    }
  }

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
