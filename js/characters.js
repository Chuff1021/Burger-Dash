// characters.js — All 6 character configs, model builders, abilities, animations
import * as THREE from 'three';

// Shared toon gradient
function createToonGradient() {
  const colors = new Uint8Array([60, 140, 255]);
  const gradientMap = new THREE.DataTexture(colors, 3, 1, THREE.RedFormat);
  gradientMap.magFilter = THREE.NearestFilter;
  gradientMap.minFilter = THREE.NearestFilter;
  gradientMap.needsUpdate = true;
  return gradientMap;
}

let sharedGradient = null;
function getGradient() {
  if (!sharedGradient) sharedGradient = createToonGradient();
  return sharedGradient;
}

function toonMat(color) {
  return new THREE.MeshToonMaterial({ color, gradientMap: getGradient() });
}

export const CHARACTERS = {
  patty: {
    id: 'patty',
    name: 'PATTY',
    title: 'The OG Burger Mascot',
    unlockCost: 0,
    colors: { primary: 0xD2691E, secondary: 0xFFD700, accent: 0x228B22, bun: 0xDEB887, apron: 0xE24B4A },
    stats: { speed: 3, jump: 3, magnet: 3 },
    ability: {
      name: 'Double Stack',
      description: 'Duplicates and collects coins for 8s',
      duration: 8000,
      color: 0xFFD700
    },
    quip: "I'll be back for more!",
    deathParts: [0xDEB887, 0xD2691E, 0x228B22, 0xE24B4A, 0xFFD700],
    buildModel,
    idleAnim: 'fistPump'
  },
  crispy: {
    id: 'crispy',
    name: 'CRISPY',
    title: 'The Golden Chicken Sandwich',
    unlockCost: 500,
    colors: { primary: 0xDAA520, secondary: 0xFF8C00, accent: 0x556B2F, bun: 0xFFD700, apron: 0xFF8C00 },
    stats: { speed: 5, jump: 2, magnet: 2 },
    ability: {
      name: 'Crispy Dash',
      description: 'Invincible turbo burst for 4s',
      duration: 4000,
      color: 0xFF8C00
    },
    quip: "Too slow! ...or was I too fast?",
    deathParts: [0xDAA520, 0xFF8C00, 0x556B2F, 0xFFD700],
    buildModel,
    idleAnim: 'spin'
  },
  frosty: {
    id: 'frosty',
    name: 'FROSTY',
    title: 'The Chill Ice Cream Cone',
    unlockCost: 1500,
    colors: { primary: 0xFFF8DC, secondary: 0x87CEEB, accent: 0xFF6B6B, bun: 0xDEB887, apron: 0x87CEEB },
    stats: { speed: 2, jump: 4, magnet: 4 },
    ability: {
      name: 'Brain Freeze',
      description: 'Freezes all obstacles for 6s',
      duration: 6000,
      color: 0x87CEEB
    },
    quip: "That gave me an actual brain freeze.",
    deathParts: [0xFFF8DC, 0x87CEEB, 0xDEB887, 0xFF6B6B],
    buildModel,
    idleAnim: 'shiver'
  },
  blaze: {
    id: 'blaze',
    name: 'BLAZE',
    title: 'The Spicy Jalapeño Burger',
    unlockCost: 3000,
    colors: { primary: 0x333333, secondary: 0xFF4500, accent: 0xFF0000, bun: 0x222222, apron: 0x111111 },
    stats: { speed: 4, jump: 3, magnet: 2 },
    ability: {
      name: 'Five Alarm',
      description: 'Fire trail destroys obstacles for 10s',
      duration: 10000,
      color: 0xFF4500
    },
    quip: "Things are about to get spicier.",
    deathParts: [0x333333, 0xFF4500, 0xFF0000, 0x228B22],
    buildModel,
    idleAnim: 'stomp'
  },
  saucy: {
    id: 'saucy',
    name: 'SAUCY',
    title: 'The Loaded BBQ Burger',
    unlockCost: 5000,
    colors: { primary: 0x8B4513, secondary: 0xA0522D, accent: 0xDAA520, bun: 0xD2B48C, apron: 0x654321 },
    stats: { speed: 3, jump: 2, magnet: 5 },
    ability: {
      name: 'Sauce Flood',
      description: 'Slows all obstacles for 8s',
      duration: 8000,
      color: 0x8B4513
    },
    quip: "Sauce it and lose it.",
    deathParts: [0x8B4513, 0xA0522D, 0xDAA520, 0xD2B48C],
    buildModel,
    idleAnim: 'sway'
  },
  turbo: {
    id: 'turbo',
    name: 'TURBO',
    title: 'The Futuristic Chrome Burger',
    unlockCost: 10000,
    colors: { primary: 0xC0C0C0, secondary: 0x00BFFF, accent: 0x0000FF, bun: 0x808080, apron: 0x111111 },
    stats: { speed: 5, jump: 5, magnet: 4 },
    ability: {
      name: 'Warp Drive',
      description: 'Teleport 200m ahead instantly',
      duration: 500,
      color: 0x00BFFF
    },
    quip: "Recalculating route...",
    deathParts: [0xC0C0C0, 0x00BFFF, 0x808080, 0x0000FF],
    buildModel,
    idleAnim: 'pulse'
  }
};

export const CHARACTER_ORDER = ['patty', 'crispy', 'frosty', 'blaze', 'saucy', 'turbo'];

export function buildModel(charId) {
  const config = CHARACTERS[charId];
  const c = config.colors;
  const group = new THREE.Group();

  // === BODY PARTS ===
  // Lower bun
  const lowerBun = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.55, 0.25, 16),
    toonMat(c.bun)
  );
  lowerBun.position.y = 0.12;
  lowerBun.name = 'lowerBun';
  group.add(lowerBun);

  // Patty/filling layer
  const pattyMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.52, 0.52, 0.15, 16),
    toonMat(c.primary)
  );
  pattyMesh.position.y = 0.32;
  pattyMesh.name = 'patty';
  group.add(pattyMesh);

  // Lettuce/accent layer
  const lettuce = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.48, 0.08, 12),
    toonMat(c.accent)
  );
  lettuce.position.y = 0.44;
  lettuce.name = 'lettuce';
  group.add(lettuce);

  // Cheese/secondary layer
  const cheese = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 0.05, 0.8),
    toonMat(c.secondary)
  );
  cheese.position.y = 0.5;
  cheese.rotation.y = Math.PI / 4;
  cheese.name = 'cheese';
  group.add(cheese);

  // Upper bun
  const upperBun = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    toonMat(c.bun)
  );
  upperBun.position.y = 0.55;
  upperBun.name = 'upperBun';
  group.add(upperBun);

  // Sesame seeds on top bun (for patty)
  if (charId === 'patty') {
    for (let i = 0; i < 5; i++) {
      const seed = new THREE.Mesh(
        new THREE.SphereGeometry(0.03, 6, 6),
        toonMat(0xFFF8DC)
      );
      const angle = (i / 5) * Math.PI * 2;
      seed.position.set(Math.cos(angle) * 0.25, 0.9, Math.sin(angle) * 0.25);
      group.add(seed);
    }
  }

  // Neon lines for Turbo
  if (charId === 'turbo') {
    const neonRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.53, 0.02, 8, 32),
      new THREE.MeshBasicMaterial({ color: 0x00BFFF })
    );
    neonRing.position.y = 0.4;
    neonRing.rotation.x = Math.PI / 2;
    group.add(neonRing);
    const neonRing2 = new THREE.Mesh(
      new THREE.TorusGeometry(0.48, 0.02, 8, 32),
      new THREE.MeshBasicMaterial({ color: 0x00BFFF })
    );
    neonRing2.position.y = 0.6;
    neonRing2.rotation.x = Math.PI / 2;
    group.add(neonRing2);
  }

  // Flame particles for Blaze (small emissive spheres)
  if (charId === 'blaze') {
    for (let i = 0; i < 4; i++) {
      const flame = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0xFF4500 })
      );
      const angle = (i / 4) * Math.PI * 2;
      flame.position.set(Math.cos(angle) * 0.55, 0.5 + Math.random() * 0.2, Math.sin(angle) * 0.55);
      flame.name = `flame${i}`;
      group.add(flame);
    }
  }

  // Cherry for Frosty
  if (charId === 'frosty') {
    const cherry = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 8, 8),
      toonMat(0xFF6B6B)
    );
    cherry.position.y = 1.05;
    group.add(cherry);
    // Swirl top
    upperBun.scale.y = 1.5;
    upperBun.position.y = 0.6;
  }

  // Onion rings for Saucy
  if (charId === 'saucy') {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.15, 0.05, 8, 16),
      toonMat(0xDAA520)
    );
    ring.position.set(0, 1.0, 0);
    ring.rotation.x = Math.PI / 3;
    group.add(ring);
  }

  // === EYES ===
  const eyeGeo = new THREE.SphereGeometry(0.06, 8, 8);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const pupilMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(-0.15, 0.55, 0.42);
  group.add(leftEye);
  const leftPupil = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6), pupilMat);
  leftPupil.position.set(-0.15, 0.57, 0.47);
  group.add(leftPupil);

  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  rightEye.position.set(0.15, 0.55, 0.42);
  group.add(rightEye);
  const rightPupil = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6), pupilMat);
  rightPupil.position.set(0.15, 0.57, 0.47);
  group.add(rightPupil);

  // Mouth
  const mouth = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, 0.03, 0.02),
    new THREE.MeshBasicMaterial({ color: charId === 'blaze' ? 0xFF0000 : 0x333333 })
  );
  mouth.position.set(0, 0.42, 0.48);
  mouth.name = 'mouth';
  group.add(mouth);

  // === LEGS ===
  const legGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.5, 8);
  const legMat = toonMat(c.apron);

  const leftLeg = new THREE.Mesh(legGeo, legMat);
  leftLeg.position.set(-0.18, -0.25, 0);
  leftLeg.name = 'leftLeg';
  group.add(leftLeg);

  const rightLeg = new THREE.Mesh(legGeo, legMat);
  rightLeg.position.set(0.18, -0.25, 0);
  rightLeg.name = 'rightLeg';
  group.add(rightLeg);

  // Shoes
  const shoeGeo = new THREE.BoxGeometry(0.12, 0.06, 0.18);
  const shoeMat = toonMat(0x333333);

  const leftShoe = new THREE.Mesh(shoeGeo, shoeMat);
  leftShoe.position.set(-0.18, -0.52, 0.03);
  leftShoe.name = 'leftShoe';
  group.add(leftShoe);

  const rightShoe = new THREE.Mesh(shoeGeo, shoeMat);
  rightShoe.position.set(0.18, -0.52, 0.03);
  rightShoe.name = 'rightShoe';
  group.add(rightShoe);

  // === ARMS ===
  const armGeo = new THREE.CylinderGeometry(0.05, 0.06, 0.4, 8);
  const armMat = toonMat(c.apron);

  const leftArm = new THREE.Mesh(armGeo, armMat);
  leftArm.position.set(-0.55, 0.3, 0);
  leftArm.name = 'leftArm';
  group.add(leftArm);

  const rightArm = new THREE.Mesh(armGeo, armMat);
  rightArm.position.set(0.55, 0.3, 0);
  rightArm.name = 'rightArm';
  group.add(rightArm);

  // === HAT / HEADWEAR ===
  if (charId === 'patty') {
    // Paper fry cook hat
    const hat = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.3, 0.4, 12),
      toonMat(0xFFFFFF)
    );
    hat.position.y = 1.15;
    hat.name = 'hat';
    group.add(hat);
  } else if (charId === 'crispy') {
    // Yellow bandana
    const bandana = new THREE.Mesh(
      new THREE.CylinderGeometry(0.52, 0.5, 0.1, 16),
      toonMat(0xFFD700)
    );
    bandana.position.y = 0.85;
    group.add(bandana);
  } else if (charId === 'blaze') {
    // Red headband
    const headband = new THREE.Mesh(
      new THREE.CylinderGeometry(0.52, 0.52, 0.06, 16),
      toonMat(0xFF0000)
    );
    headband.position.y = 0.8;
    group.add(headband);
  } else if (charId === 'saucy') {
    // Backwards trucker cap
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.45, 0.2, 12),
      toonMat(0x654321)
    );
    cap.position.y = 1.0;
    group.add(cap);
    const brim = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.03, 0.25),
      toonMat(0x654321)
    );
    brim.position.set(0, 0.9, -0.25);
    group.add(brim);
  } else if (charId === 'turbo') {
    // Visor helmet
    const helmet = new THREE.Mesh(
      new THREE.SphereGeometry(0.45, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      toonMat(0x333333)
    );
    helmet.position.y = 0.75;
    group.add(helmet);
    const visor = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.15, 0.1),
      new THREE.MeshBasicMaterial({ color: 0x00BFFF, transparent: true, opacity: 0.6 })
    );
    visor.position.set(0, 0.7, 0.4);
    group.add(visor);
  }

  // Position the whole model so feet are at y=0
  group.position.y = 0.55;

  // Store references for animation
  group.userData = {
    charId,
    parts: {
      leftLeg: group.getObjectByName('leftLeg'),
      rightLeg: group.getObjectByName('rightLeg'),
      leftShoe: group.getObjectByName('leftShoe'),
      rightShoe: group.getObjectByName('rightShoe'),
      leftArm: group.getObjectByName('leftArm'),
      rightArm: group.getObjectByName('rightArm'),
      mouth: group.getObjectByName('mouth'),
      upperBun: group.getObjectByName('upperBun'),
    },
    baseY: group.position.y,
    animState: 'idle',
    animTime: 0
  };

  return group;
}

// Animate character model based on state
export function animateCharacter(model, delta, state, time) {
  const parts = model.userData.parts;
  if (!parts.leftLeg) return;

  const t = time * 10; // speed multiplier for animation
  model.userData.animTime += delta;

  switch (state) {
    case 'running': {
      // Leg swing
      parts.leftLeg.rotation.x = Math.sin(t) * 0.7;
      parts.rightLeg.rotation.x = Math.sin(t + Math.PI) * 0.7;
      parts.leftShoe.position.z = 0.03 + Math.sin(t) * 0.08;
      parts.rightShoe.position.z = 0.03 + Math.sin(t + Math.PI) * 0.08;
      parts.leftShoe.position.y = -0.52 + Math.max(0, Math.sin(t)) * 0.08;
      parts.rightShoe.position.y = -0.52 + Math.max(0, Math.sin(t + Math.PI)) * 0.08;

      // Arm swing
      parts.leftArm.rotation.x = Math.sin(t + Math.PI) * 0.5;
      parts.rightArm.rotation.x = Math.sin(t) * 0.5;

      // Body bob
      model.position.y = model.userData.baseY + Math.abs(Math.sin(t * 2)) * 0.04;

      // Slight tilt
      model.rotation.x = Math.sin(t * 2) * 0.02;
      break;
    }
    case 'jumping': {
      // Stretch upward
      model.scale.y = 1.15;
      model.scale.x = 0.9;
      model.scale.z = 0.9;
      parts.leftArm.rotation.x = -0.8;
      parts.rightArm.rotation.x = -0.8;
      parts.leftLeg.rotation.x = 0.3;
      parts.rightLeg.rotation.x = 0.3;
      break;
    }
    case 'sliding': {
      model.scale.y = 0.5;
      model.scale.x = 1.3;
      model.scale.z = 1.3;
      model.rotation.x = 0.3;
      break;
    }
    case 'hit': {
      // Flash and spin
      const flash = Math.floor(model.userData.animTime * 15) % 2;
      model.visible = flash === 0;
      model.rotation.y += delta * 15;
      break;
    }
    case 'idle': {
      // Character-specific idle
      const charId = model.userData.charId;
      const idleT = model.userData.animTime;

      // Reset to defaults
      parts.leftLeg.rotation.x = 0;
      parts.rightLeg.rotation.x = 0;
      parts.leftArm.rotation.x = 0;
      parts.rightArm.rotation.x = 0;
      model.scale.set(1, 1, 1);
      model.rotation.x = 0;

      switch (charId) {
        case 'patty':
          // Fist pump
          parts.rightArm.rotation.x = -Math.abs(Math.sin(idleT * 2)) * 1.2;
          model.position.y = model.userData.baseY + Math.abs(Math.sin(idleT * 2)) * 0.05;
          break;
        case 'crispy':
          // Spin
          model.rotation.y = idleT * 3;
          break;
        case 'frosty':
          // Shiver
          model.position.x = Math.sin(idleT * 15) * 0.02;
          model.rotation.z = Math.sin(idleT * 12) * 0.03;
          break;
        case 'blaze':
          // Stomp
          if (Math.sin(idleT * 3) > 0.9) {
            model.position.y = model.userData.baseY - 0.03;
          } else {
            model.position.y = model.userData.baseY;
          }
          parts.rightLeg.rotation.x = Math.max(0, Math.sin(idleT * 3)) * -0.5;
          break;
        case 'saucy':
          // Sway
          model.rotation.z = Math.sin(idleT * 2) * 0.1;
          model.position.x = Math.sin(idleT * 2) * 0.05;
          break;
        case 'turbo':
          // Pulse glow
          model.position.y = model.userData.baseY + Math.sin(idleT * 3) * 0.03;
          break;
      }
      break;
    }
  }
}

export function getCharacterConfig(charId) {
  return CHARACTERS[charId];
}

export function getUnlockThresholds() {
  return CHARACTER_ORDER.map(id => ({
    id,
    cost: CHARACTERS[id].unlockCost
  }));
}
