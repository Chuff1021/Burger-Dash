// collectibles.js — corridor coin spawning/collection for Burger Dash
import * as THREE from 'three';
import { DIR_VECTORS, ROAD_LENGTH } from './track.js';

function createFallbackCoin() {
  const group = new THREE.Group();
  const outer = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.28, 0.08, 20),
    new THREE.MeshStandardMaterial({ color: 0xffd54a, emissive: 0xcc8a00, emissiveIntensity: 0.6 })
  );
  outer.rotation.z = Math.PI / 2;
  const inner = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.18, 0.09, 20),
    new THREE.MeshStandardMaterial({ color: 0xfff0a0, emissive: 0xffcc55, emissiveIntensity: 0.4 })
  );
  inner.rotation.z = Math.PI / 2;
  inner.position.x = 0.01;
  group.add(outer, inner);
  return group;
}

function setShadowProps(root) {
  root.traverse(obj => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
      if (obj.material) {
        obj.material = obj.material.clone();
        if ('emissiveIntensity' in obj.material) obj.material.emissiveIntensity = Math.max(obj.material.emissiveIntensity || 0, 0.45);
      }
    }
  });
}

export class CollectibleManager {
  constructor() {
    this.scene = null;
    this.loader = null;
    this.coinTemplate = null;
    this.activeCoins = [];
    this.tempBox = new THREE.Box3();
    this.tempVec = new THREE.Vector3();
    this.loaded = false;
  }

  async init(scene) {
    this.scene = scene;
    if (this.loaded) return;
    const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
    this.loader = new GLTFLoader();

    try {
      const gltf = await this.loader.loadAsync('./assets/models/coin.glb');
      this.coinTemplate = gltf.scene;
    } catch (err) {
      console.warn('Coin model failed to load, using fallback coin', err);
      this.coinTemplate = createFallbackCoin();
    }

    setShadowProps(this.coinTemplate);
    this.loaded = true;
  }

  reset() {
    for (const coin of this.activeCoins) {
      this.scene?.remove(coin.mesh);
    }
    this.activeCoins = [];
  }

  createCoin() {
    const mesh = this.coinTemplate?.clone(true) || createFallbackCoin();
    mesh.scale.setScalar(0.45);
    return mesh;
  }

  getPattern(kind, segment) {
    const dir = DIR_VECTORS[segment.direction];
    const perp = DIR_VECTORS[(segment.direction + 1) % 4];
    const forwardStart = THREE.MathUtils.randFloat(0.28, 0.48) * ROAD_LENGTH;
    const spacing = 1.65;

    const makePoint = (forwardOffset, sideOffset, y) => {
      return segment.startPos.clone()
        .add(dir.clone().multiplyScalar(forwardStart + forwardOffset))
        .add(perp.clone().multiplyScalar(sideOffset))
        .add(new THREE.Vector3(0, y, 0));
    };

    const coins = [];
    if (kind === 'arc') {
      for (let i = 0; i < 6; i++) {
        const t = i / 5;
        coins.push(makePoint(i * spacing, 0, 0.95 + Math.sin(t * Math.PI) * 1.25));
      }
    } else if (kind === 'double') {
      for (let i = 0; i < 5; i++) {
        coins.push(makePoint(i * spacing, -0.7, 0.95));
        coins.push(makePoint(i * spacing, 0.7, 0.95));
      }
    } else {
      const laneOffset = THREE.MathUtils.randFloat(-0.55, 0.55);
      for (let i = 0; i < 7; i++) {
        coins.push(makePoint(i * spacing, laneOffset, 0.95));
      }
    }

    return coins;
  }

  maybePopulateSegment(segment, track) {
    if (!segment || segment.userData?.coinsPopulated) return;
    segment.userData ||= {};
    segment.userData.coinsPopulated = true;

    const next = track.getNextSegment(segment);
    const isTurnApproach = next && next.direction !== segment.direction;
    if (isTurnApproach && Math.random() < 0.55) return;

    const spawnChance = isTurnApproach ? 0.35 : 0.78;
    if (Math.random() > spawnChance) return;

    const roll = Math.random();
    const pattern = roll < 0.22 ? 'arc' : roll < 0.48 ? 'double' : 'line';
    const positions = this.getPattern(pattern, segment);

    for (const position of positions) {
      const mesh = this.createCoin();
      mesh.position.copy(position);
      mesh.rotation.y = Math.random() * Math.PI * 2;
      this.scene.add(mesh);
      this.activeCoins.push({
        mesh,
        segment,
        collected: false,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  update(delta, track, player, effects) {
    if (!this.scene) return 0;

    for (const segment of track.segments) {
      this.maybePopulateSegment(segment, track);
    }

    let collected = 0;
    const playerBox = player.getCollisionBox();
    const playerPos = player.getPosition();

    for (let i = this.activeCoins.length - 1; i >= 0; i--) {
      const coin = this.activeCoins[i];
      const { mesh, segment } = coin;

      mesh.rotation.y += delta * 8;
      mesh.position.y += Math.sin(performance.now() * 0.006 + coin.phase) * 0.0035;

      this.tempBox.setFromCenterAndSize(
        this.tempVec.set(mesh.position.x, mesh.position.y, mesh.position.z),
        new THREE.Vector3(0.55, 0.55, 0.55)
      );

      if (!coin.collected && this.tempBox.intersectsBox(playerBox)) {
        coin.collected = true;
        collected++;
        effects?.emitCoins(mesh.position.clone());
        this.scene.remove(mesh);
        this.activeCoins.splice(i, 1);
        continue;
      }

      const behind = segment.direction === 0 ? playerPos.z < mesh.position.z - 3
        : segment.direction === 1 ? playerPos.x > mesh.position.x + 3
        : segment.direction === 2 ? playerPos.z > mesh.position.z + 3
        : playerPos.x < mesh.position.x - 3;

      if (behind || (segment.passed && playerPos.distanceToSquared(mesh.position) > 70 * 70)) {
        this.scene.remove(mesh);
        this.activeCoins.splice(i, 1);
      }
    }

    return collected;
  }
}
