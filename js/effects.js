// effects.js — Particles, screen shake, speed lines, auras, combo text
import * as THREE from 'three';

// Particle system using instanced mesh
class ParticleSystem {
  constructor(scene, maxParticles = 200) {
    this.maxParticles = maxParticles;
    this.particles = [];

    const geo = new THREE.PlaneGeometry(0.15, 0.15);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    this.instancedMesh = new THREE.InstancedMesh(geo, mat, maxParticles);
    this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.instancedMesh.frustumCulled = false;
    this.dummy = new THREE.Object3D();
    this.colorAttr = new THREE.InstancedBufferAttribute(
      new Float32Array(maxParticles * 3), 3
    );
    this.instancedMesh.instanceColor = this.colorAttr;

    // Hide all initially
    this.dummy.scale.setScalar(0);
    this.dummy.updateMatrix();
    for (let i = 0; i < maxParticles; i++) {
      this.instancedMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.instancedMesh.instanceMatrix.needsUpdate = true;

    scene.add(this.instancedMesh);
  }

  emit(config) {
    const { position, count, color, velocity, lifetime, spread, gravity } = config;
    const c = new THREE.Color(color || 0xffd700);

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;
      this.particles.push({
        position: position.clone().add(
          new THREE.Vector3(
            (Math.random() - 0.5) * (spread || 1),
            Math.random() * (spread || 1) * 0.5,
            (Math.random() - 0.5) * (spread || 1)
          )
        ),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * (velocity || 3),
          Math.random() * (velocity || 4) + 1,
          (Math.random() - 0.5) * (velocity || 3)
        ),
        lifetime: lifetime || 0.8,
        age: 0,
        color: c,
        gravity: gravity !== undefined ? gravity : 9.8
      });
    }
  }

  update(delta) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.age += delta;
      if (p.age >= p.lifetime) {
        this.particles.splice(i, 1);
        continue;
      }
      p.velocity.y -= p.gravity * delta;
      p.position.x += p.velocity.x * delta;
      p.position.y += p.velocity.y * delta;
      p.position.z += p.velocity.z * delta;
    }

    for (let i = 0; i < this.maxParticles; i++) {
      if (i < this.particles.length) {
        const p = this.particles[i];
        const scale = Math.max(0, 1 - p.age / p.lifetime);
        this.dummy.position.copy(p.position);
        this.dummy.scale.setScalar(scale);
        this.dummy.updateMatrix();
        this.instancedMesh.setMatrixAt(i, this.dummy.matrix);
        this.colorAttr.setXYZ(i, p.color.r, p.color.g, p.color.b);
      } else {
        this.dummy.scale.setScalar(0);
        this.dummy.updateMatrix();
        this.instancedMesh.setMatrixAt(i, this.dummy.matrix);
      }
    }
    this.instancedMesh.instanceMatrix.needsUpdate = true;
    this.colorAttr.needsUpdate = true;
  }
}

// Screen shake
class ScreenShake {
  constructor() {
    this.intensity = 0;
    this.decay = 8;
  }

  trigger(intensity = 0.3) {
    this.intensity = intensity;
  }

  update(delta, camera) {
    if (this.intensity <= 0.001) {
      this.intensity = 0;
      return;
    }
    camera.position.x += (Math.random() - 0.5) * this.intensity;
    camera.position.y += (Math.random() - 0.5) * this.intensity * 0.5;
    this.intensity *= Math.exp(-this.decay * delta);
  }
}

// Speed lines (3D lines around camera periphery)
class SpeedLines {
  constructor(scene) {
    this.lines = [];
    this.active = false;
    this.group = new THREE.Group();
    scene.add(this.group);

    const mat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0
    });

    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      const radius = 3 + Math.random() * 2;
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, -5),
        new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, -15)
      ]);
      const line = new THREE.Line(geo, mat.clone());
      this.lines.push(line);
      this.group.add(line);
    }
  }

  setIntensity(speed, maxSpeed) {
    const t = Math.max(0, (speed - 20) / (maxSpeed - 20));
    for (const line of this.lines) {
      line.material.opacity = t * 0.4;
    }
    this.active = t > 0;
  }

  update(camera) {
    if (!this.active) return;
    this.group.position.copy(camera.position);
    this.group.quaternion.copy(camera.quaternion);
  }
}

// Aura around player during abilities
class PlayerAura {
  constructor(scene) {
    const geo = new THREE.RingGeometry(0.8, 1.2, 32);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffd700,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.visible = false;
    this.active = false;
    this.time = 0;
    scene.add(this.mesh);
  }

  activate(color) {
    this.mesh.material.color.set(color);
    this.mesh.visible = true;
    this.active = true;
    this.time = 0;
  }

  deactivate() {
    this.mesh.visible = false;
    this.active = false;
  }

  update(delta, playerPos) {
    if (!this.active) return;
    this.time += delta;
    this.mesh.position.set(playerPos.x, 0.05, playerPos.z);
    const pulse = 1 + Math.sin(this.time * 6) * 0.2;
    this.mesh.scale.setScalar(pulse);
    this.mesh.material.opacity = 0.3 + Math.sin(this.time * 4) * 0.15;
    this.mesh.rotation.z += delta * 2;
  }
}

// Main effects manager
export class EffectsManager {
  constructor() {
    this.particles = null;
    this.shake = null;
    this.speedLines = null;
    this.aura = null;
    this.camera = null;
  }

  init(scene, camera) {
    this.camera = camera;
    this.particles = new ParticleSystem(scene, 300);
    this.shake = new ScreenShake();
    this.speedLines = new SpeedLines(scene);
    this.aura = new PlayerAura(scene);
  }

  update(delta) {
    this.particles.update(delta);
    this.shake.update(delta, this.camera);
    this.speedLines.update(this.camera);
  }

  emitCoins(position) {
    this.particles.emit({
      position,
      count: 8,
      color: 0xffd700,
      velocity: 2,
      lifetime: 0.5,
      spread: 0.5
    });
  }

  emitHit(position) {
    this.particles.emit({
      position,
      count: 15,
      color: 0xff4444,
      velocity: 4,
      lifetime: 0.6,
      spread: 1
    });
  }

  emitDeath(position, color) {
    this.particles.emit({
      position,
      count: 40,
      color: color || 0xe24b4a,
      velocity: 6,
      lifetime: 1.2,
      spread: 2
    });
    // Secondary burst
    this.particles.emit({
      position,
      count: 20,
      color: 0xffd700,
      velocity: 4,
      lifetime: 1.0,
      spread: 1.5
    });
  }

  emitPowerUp(position, color) {
    this.particles.emit({
      position,
      count: 20,
      color: color || 0x44ff44,
      velocity: 3,
      lifetime: 0.8,
      spread: 1.5,
      gravity: -2
    });
  }

  emitCheckpoint(position) {
    // Confetti burst
    const colors = [0xff4444, 0xffd700, 0x44ff44, 0x4444ff, 0xff44ff];
    for (const color of colors) {
      this.particles.emit({
        position: position.clone().add(new THREE.Vector3(0, 2, 0)),
        count: 6,
        color,
        velocity: 5,
        lifetime: 1.5,
        spread: 3,
        gravity: 4
      });
    }
  }

  shakeScreen(intensity) {
    this.shake.trigger(intensity);
  }

  setSpeedLines(speed, maxSpeed) {
    this.speedLines.setIntensity(speed, maxSpeed);
  }

  activateAura(color) {
    this.aura.activate(color);
  }

  deactivateAura() {
    this.aura.deactivate();
  }

  updateAura(delta, playerPos) {
    this.aura.update(delta, playerPos);
  }

  showComboText(multiplier) {
    const container = document.getElementById('combo-container');
    const div = document.createElement('div');
    div.className = 'combo-popup';
    div.textContent = `x${multiplier} COMBO!`;
    container.appendChild(div);
    setTimeout(() => div.remove(), 800);
  }

  showFloatText(text, screenX, screenY) {
    const div = document.createElement('div');
    div.className = 'float-text';
    div.textContent = text;
    div.style.left = screenX + 'px';
    div.style.top = screenY + 'px';
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 600);
  }

  showCheckpoint(distance) {
    const banner = document.getElementById('checkpoint-banner');
    const text = document.getElementById('checkpoint-text');
    text.textContent = `CHECKPOINT ${distance}m!`;
    banner.classList.remove('hidden');
    banner.classList.remove('show');
    void banner.offsetWidth; // force reflow
    banner.classList.add('show');
    setTimeout(() => {
      banner.classList.add('hidden');
      banner.classList.remove('show');
    }, 1500);
  }
}
