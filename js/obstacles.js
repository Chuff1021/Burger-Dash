// obstacles.js — corridor obstacle spawning/collision for Burger Dash
import * as THREE from 'three';
import { DIR_VECTORS, ROAD_LENGTH, ROAD_WIDTH } from './track.js';

const OBSTACLE_WIDTH = ROAD_WIDTH - 0.9;
const HURDLE_CLEAR_HEIGHT = 0.95;
const LOW_BEAM_CLEAR_HEIGHT = 1.0;

function setShadowProps(root) {
  root.traverse(obj => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
      if (obj.material) {
        obj.material = obj.material.clone();
        if ('roughness' in obj.material) obj.material.roughness = 0.65;
        if ('metalness' in obj.material) obj.material.metalness = 0.1;
      }
    }
  });
}

function fallbackHurdle() {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xffb347, roughness: 0.7 });
  const left = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.95, 0.12), mat);
  const right = left.clone();
  const bar = new THREE.Mesh(new THREE.BoxGeometry(OBSTACLE_WIDTH, 0.16, 0.14), mat);
  left.position.set(-OBSTACLE_WIDTH * 0.45, 0.475, 0);
  right.position.set(OBSTACLE_WIDTH * 0.45, 0.475, 0);
  bar.position.set(0, 0.9, 0);
  group.add(left, right, bar);
  return group;
}

function fallbackLowBeam() {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xa0a0a0, roughness: 0.75 });
  const beam = new THREE.Mesh(new THREE.BoxGeometry(OBSTACLE_WIDTH, 0.35, 0.45), mat);
  beam.position.set(0, 1.25, 0);
  group.add(beam);
  return group;
}

export class ObstacleManager {
  constructor() {
    this.scene = null;
    this.loader = null;
    this.models = new Map();
    this.active = [];
    this.tempBox = new THREE.Box3();
    this.tempVec = new THREE.Vector3();
    this.loaded = false;
  }

  async init(scene) {
    this.scene = scene;
    if (this.loaded) return;
    const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
    this.loader = new GLTFLoader();

    const loadClone = async (path, fallbackFactory) => {
      try {
        const gltf = await this.loader.loadAsync(path);
        const model = gltf.scene;
        setShadowProps(model);
        return model;
      } catch (err) {
        console.warn(`Obstacle model failed to load: ${path}`, err);
        const fallback = fallbackFactory();
        setShadowProps(fallback);
        return fallback;
      }
    };

    const [hurdle, lowBeam] = await Promise.all([
      loadClone('./assets/models/hurdle.glb', fallbackHurdle),
      loadClone('./assets/models/cement_roadblock.glb', fallbackLowBeam)
    ]);

    this.models.set('jump', hurdle);
    this.models.set('slide', lowBeam);
    this.loaded = true;
  }

  reset() {
    for (const obstacle of this.active) {
      this.scene?.remove(obstacle.mesh);
    }
    this.active = [];
  }

  cloneTemplate(kind) {
    const template = this.models.get(kind);
    if (!template) return kind === 'jump' ? fallbackHurdle() : fallbackLowBeam();
    return template.clone(true);
  }

  maybePopulateSegment(segment, difficulty) {
    if (!segment || segment.userData?.obstaclesPopulated) return;
    segment.userData ||= {};
    segment.userData.obstaclesPopulated = true;

    const chance = THREE.MathUtils.clamp(0.24 + difficulty * 0.42, 0.24, 0.72);
    if (Math.random() > chance) return;

    const kind = Math.random() < 0.55 ? 'jump' : 'slide';
    const along = THREE.MathUtils.randFloat(0.52, 0.74) * ROAD_LENGTH;
    const pos = segment.startPos.clone().add(DIR_VECTORS[segment.direction].clone().multiplyScalar(along));

    const mesh = this.cloneTemplate(kind);
    const facing = segment.direction;
    const rotY = [Math.PI, Math.PI / 2, 0, -Math.PI / 2][facing];
    mesh.rotation.y = rotY;
    mesh.position.copy(pos);
    mesh.position.y = 0;

    const scale = kind === 'jump' ? 0.95 : 1.15;
    mesh.scale.setScalar(scale);

    this.scene.add(mesh);

    const obstacle = {
      kind,
      mesh,
      segment,
      hit: false,
      passed: false,
      bobPhase: Math.random() * Math.PI * 2
    };
    this.active.push(obstacle);
  }

  update(delta, track, player, effects) {
    if (!this.scene) return 0;

    const playerPos = player.getPosition();
    const difficulty = THREE.MathUtils.clamp((track.getSpeed() - 14) / 14, 0, 1);

    for (const segment of track.segments) {
      const next = track.getNextSegment(segment);
      const isTurnApproach = next && next.direction !== segment.direction;
      if (!isTurnApproach) this.maybePopulateSegment(segment, difficulty);
    }

    let hits = 0;
    const playerBox = player.getCollisionBox();

    for (let i = this.active.length - 1; i >= 0; i--) {
      const obstacle = this.active[i];
      const { mesh, segment, kind } = obstacle;

      const bob = Math.sin(performance.now() * 0.003 + obstacle.bobPhase) * 0.02;
      mesh.position.y = bob;

      const boxHeight = kind === 'jump' ? 1.1 : 0.9;
      const boxY = kind === 'jump' ? 0.55 : 1.22;
      this.tempBox.setFromCenterAndSize(
        this.tempVec.set(mesh.position.x, boxY, mesh.position.z),
        new THREE.Vector3(ROAD_WIDTH - 0.9, boxHeight, 0.8)
      );

      const safeJump = kind === 'jump' && player.getState() === 'jumping' && playerPos.y > HURDLE_CLEAR_HEIGHT;
      const safeSlide = kind === 'slide' && player.getState() === 'sliding' && playerPos.y < LOW_BEAM_CLEAR_HEIGHT;

      if (!obstacle.hit && !player.isInvincible() && this.tempBox.intersectsBox(playerBox)) {
        if (!safeJump && !safeSlide) {
          obstacle.hit = true;
          hits++;
          effects?.emitHit(mesh.position.clone().add(new THREE.Vector3(0, 0.8, 0)));
          effects?.shakeScreen(0.22);
        }
      }

      const behind = segment.direction === 0 ? playerPos.z < mesh.position.z - 3
        : segment.direction === 1 ? playerPos.x > mesh.position.x + 3
        : segment.direction === 2 ? playerPos.z > mesh.position.z + 3
        : playerPos.x < mesh.position.x - 3;

      const tooFarBehind = playerPos.distanceToSquared(mesh.position) > 70 * 70 && segment.passed;
      if (behind || tooFarBehind) {
        this.scene.remove(mesh);
        this.active.splice(i, 1);
      }
    }

    return hits;
  }
}
