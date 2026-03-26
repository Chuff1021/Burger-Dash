// chaser.js — burger-joint villain prototype for Burger Dash
import * as THREE from 'three';
import { DIR_VECTORS } from './track.js';

function emissiveMat(color, emissive, intensity = 0.7) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive,
    emissiveIntensity: intensity,
    roughness: 0.45,
    metalness: 0.08
  });
}

function basicMat(color) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.05 });
}

function shadowify(root) {
  root.traverse(obj => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });
}

export class ChaserManager {
  constructor() {
    this.scene = null;
    this.group = null;
    this.distance = 10.5;
    this.minDistance = 3.4;
    this.maxDistance = 16;
    this.catchDistance = 2.9;
    this.catchTimer = 0;
    this.time = 0;
    this.flash = 0;
    this.light = null;
  }

  init(scene) {
    this.scene = scene;
    if (this.group) return;

    const root = new THREE.Group();
    root.name = 'grease-beast';

    const body = new THREE.Mesh(
      new THREE.SphereGeometry(0.75, 18, 18),
      emissiveMat(0x1a1414, 0xff6a00, 0.16)
    );
    body.scale.set(1.05, 1.25, 0.9);
    body.position.y = 1.35;
    root.add(body);

    const lower = new THREE.Mesh(
      new THREE.SphereGeometry(0.58, 16, 16),
      basicMat(0x221818)
    );
    lower.scale.set(1.15, 0.95, 0.95);
    lower.position.y = 0.65;
    root.add(lower);

    const mouth = new THREE.Mesh(
      new THREE.TorusGeometry(0.32, 0.09, 10, 20, Math.PI),
      emissiveMat(0xffb347, 0xff6a00, 0.85)
    );
    mouth.position.set(0, 1.15, 0.58);
    mouth.rotation.x = Math.PI;
    root.add(mouth);

    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 10, 10),
        emissiveMat(0xffe066, 0xffb000, 1.25)
      );
      eye.position.set(side * 0.24, 1.55, 0.56);
      root.add(eye);

      const brow = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.05, 0.05),
        basicMat(0x110b0b)
      );
      brow.position.set(side * 0.24, 1.75, 0.54);
      brow.rotation.z = side * -0.22;
      root.add(brow);
    }

    const hat = new THREE.Mesh(
      new THREE.CylinderGeometry(0.72, 0.8, 0.22, 20),
      emissiveMat(0xd7263d, 0xff3344, 0.35)
    );
    hat.position.y = 2.05;
    root.add(hat);

    const logo = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.16, 0.06),
      emissiveMat(0xfff1b5, 0xffcf40, 0.9)
    );
    logo.position.set(0, 2.05, 0.7);
    root.add(logo);

    const armMat = basicMat(0x2a1e1e);
    for (const side of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.75, 4, 10), armMat);
      arm.position.set(side * 0.95, 1.15, 0.05);
      arm.rotation.z = side * 0.75;
      arm.name = side < 0 ? 'armL' : 'armR';
      root.add(arm);
    }

    for (const side of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.72, 4, 10), basicMat(0x151111));
      leg.position.set(side * 0.32, 0.2, 0);
      leg.name = side < 0 ? 'legL' : 'legR';
      root.add(leg);
    }

    this.light = new THREE.PointLight(0xff7a00, 0.7, 12, 2);
    this.light.position.set(0, 1.8, 0.5);
    root.add(this.light);

    shadowify(root);
    scene.add(root);
    this.group = root;
  }

  reset() {
    this.distance = 10.5;
    this.catchTimer = 0;
    this.flash = 0;
    if (this.group) this.group.visible = true;
  }

  onPlayerHit() {
    this.distance = Math.max(this.minDistance, this.distance - 2.2);
    this.flash = 0.35;
  }

  onCheckpoint() {
    this.distance = Math.min(this.maxDistance, this.distance + 1.15);
  }

  onCoinCollect(count = 1) {
    this.distance = Math.min(this.maxDistance, this.distance + count * 0.028);
  }

  onGoodRun(delta, speed) {
    const recovery = (0.22 + Math.max(0, speed - 14) * 0.012) * delta;
    this.distance = Math.min(this.maxDistance, this.distance + recovery);
  }

  update(delta, player, speed) {
    if (!this.group) return { caught: false, distance: this.distance };
    this.time += delta;
    this.flash = Math.max(0, this.flash - delta * 1.5);

    const playerPos = player.getPosition();
    const dir = player.getDirection();
    const forward = DIR_VECTORS[dir];
    const behind = forward.clone().multiplyScalar(-this.distance);
    const side = DIR_VECTORS[(dir + 1) % 4].clone().multiplyScalar(Math.sin(this.time * 1.7) * 0.22);

    this.group.position.set(
      playerPos.x + behind.x + side.x,
      playerPos.y,
      playerPos.z + behind.z + side.z
    );

    const facing = [Math.PI, Math.PI / 2, 0, -Math.PI / 2][dir];
    this.group.rotation.y = facing;

    const bob = Math.sin(this.time * 8.5) * 0.12;
    this.group.position.y = playerPos.y + bob;

    const armL = this.group.getObjectByName('armL');
    const armR = this.group.getObjectByName('armR');
    const legL = this.group.getObjectByName('legL');
    const legR = this.group.getObjectByName('legR');
    if (armL) armL.rotation.x = Math.sin(this.time * 8.5) * 0.35;
    if (armR) armR.rotation.x = Math.sin(this.time * 8.5 + Math.PI) * 0.35;
    if (legL) legL.rotation.x = Math.sin(this.time * 8.5 + Math.PI) * 0.5;
    if (legR) legR.rotation.x = Math.sin(this.time * 8.5) * 0.5;

    const pressure = 1 - THREE.MathUtils.clamp((this.distance - this.catchDistance) / (this.maxDistance - this.catchDistance), 0, 1);
    if (this.light) {
      this.light.intensity = 0.7 + pressure * 0.9 + this.flash * 0.8;
      this.light.distance = 12 + pressure * 6;
    }

    const scalePulse = 1 + pressure * 0.08 + Math.sin(this.time * 5.5) * 0.02;
    this.group.scale.setScalar(scalePulse);

    if (this.distance <= this.catchDistance) {
      this.catchTimer += delta;
    } else {
      this.catchTimer = 0;
    }

    return {
      caught: this.catchTimer > 1.2,
      distance: this.distance,
      pressure
    };
  }
}
