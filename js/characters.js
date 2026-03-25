// characters.js — 6 humanoid fry cook characters built from Three.js geometry
// Ready for GLTF model swap-in when real assets are available
import * as THREE from 'three';

// --- Material helpers ---
function createToonGradient() {
  const colors = new Uint8Array([40, 120, 200, 255]);
  const gradientMap = new THREE.DataTexture(colors, 4, 1, THREE.RedFormat);
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
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.7,
    metalness: 0.05,
  });
}

function skinMat(tone) {
  return new THREE.MeshStandardMaterial({
    color: tone || 0xF5CBA7,
    roughness: 0.8,
    metalness: 0,
  });
}

function emissiveMat(color, intensity = 0.5) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: intensity,
    roughness: 0.3,
    metalness: 0.1,
  });
}

// --- Character config ---
export const CHARACTERS = {
  patty: {
    id: 'patty',
    name: 'PATTY',
    title: 'The OG Burger Mascot',
    unlockCost: 0,
    colors: {
      skin: 0xF5CBA7, hair: 0x4A2F1B, shirt: 0xFFFFFF,
      apron: 0xE24B4A, pants: 0x2C3E50, shoes: 0x1A1A1A,
      hat: 0xFFFFFF, accent: 0xFFD700
    },
    stats: { speed: 3, jump: 3, magnet: 3 },
    ability: { name: 'Double Stack', description: 'Duplicates and collects coins for 8s', duration: 8000, color: 0xFFD700 },
    quip: "I'll be back for more!",
    deathParts: [0xF5CBA7, 0xE24B4A, 0xFFFFFF, 0xFFD700],
    idleAnim: 'fistPump'
  },
  crispy: {
    id: 'crispy',
    name: 'CRISPY',
    title: 'The Speed Demon Cook',
    unlockCost: 500,
    colors: {
      skin: 0xD4A574, hair: 0x1A1A1A, shirt: 0xFFA500,
      apron: 0xFF8C00, pants: 0x333333, shoes: 0x8B0000,
      hat: 0xFFD700, accent: 0xFF4500
    },
    stats: { speed: 5, jump: 2, magnet: 2 },
    ability: { name: 'Crispy Dash', description: 'Invincible turbo burst for 4s', duration: 4000, color: 0xFF8C00 },
    quip: "Too slow! ...or was I too fast?",
    deathParts: [0xD4A574, 0xFF8C00, 0xFFD700],
    idleAnim: 'spin'
  },
  frosty: {
    id: 'frosty',
    name: 'FROSTY',
    title: 'The Chill Dessert Chef',
    unlockCost: 1500,
    colors: {
      skin: 0xFDE8D0, hair: 0xADD8E6, shirt: 0x87CEEB,
      apron: 0xB0E0E6, pants: 0xE0FFFF, shoes: 0x4682B4,
      hat: 0xFFFFFF, accent: 0x00CED1
    },
    stats: { speed: 2, jump: 4, magnet: 4 },
    ability: { name: 'Brain Freeze', description: 'Freezes all obstacles for 6s', duration: 6000, color: 0x87CEEB },
    quip: "That gave me an actual brain freeze.",
    deathParts: [0xFDE8D0, 0x87CEEB, 0xB0E0E6],
    idleAnim: 'shiver'
  },
  blaze: {
    id: 'blaze',
    name: 'BLAZE',
    title: 'The Fire Grill Master',
    unlockCost: 3000,
    colors: {
      skin: 0xC68642, hair: 0x1A1A1A, shirt: 0x1A1A1A,
      apron: 0x111111, pants: 0x0A0A0A, shoes: 0x333333,
      hat: 0xFF0000, accent: 0xFF4500
    },
    stats: { speed: 4, jump: 3, magnet: 2 },
    ability: { name: 'Five Alarm', description: 'Fire trail destroys obstacles for 10s', duration: 10000, color: 0xFF4500 },
    quip: "Things are about to get spicier.",
    deathParts: [0xC68642, 0xFF4500, 0xFF0000],
    idleAnim: 'stomp'
  },
  saucy: {
    id: 'saucy',
    name: 'SAUCY',
    title: 'The BBQ Pit Boss',
    unlockCost: 5000,
    colors: {
      skin: 0xE8B88A, hair: 0x654321, shirt: 0xF5F5DC,
      apron: 0x8B4513, pants: 0x556B2F, shoes: 0x3E2723,
      hat: 0x654321, accent: 0xDAA520
    },
    stats: { speed: 3, jump: 2, magnet: 5 },
    ability: { name: 'Sauce Flood', description: 'Slows all obstacles for 8s', duration: 8000, color: 0x8B4513 },
    quip: "Sauce it and lose it.",
    deathParts: [0xE8B88A, 0x8B4513, 0xDAA520],
    idleAnim: 'sway'
  },
  turbo: {
    id: 'turbo',
    name: 'TURBO',
    title: 'The Future Chef 3000',
    unlockCost: 10000,
    colors: {
      skin: 0xDCDCDC, hair: 0x00BFFF, shirt: 0x1A1A2E,
      apron: 0x111122, pants: 0x0A0A1A, shoes: 0x333344,
      hat: 0x333333, accent: 0x00BFFF
    },
    stats: { speed: 5, jump: 5, magnet: 4 },
    ability: { name: 'Warp Drive', description: 'Teleport 200m ahead instantly', duration: 500, color: 0x00BFFF },
    quip: "Recalculating route...",
    deathParts: [0xDCDCDC, 0x00BFFF, 0x333344],
    idleAnim: 'pulse'
  }
};

export const CHARACTER_ORDER = ['patty', 'crispy', 'frosty', 'blaze', 'saucy', 'turbo'];

// ============================================
// HUMANOID CHARACTER MODEL BUILDER
// Proper human proportions: ~1.7m tall fry cooks
// ============================================
export function buildModel(charId) {
  const config = CHARACTERS[charId];
  const c = config.colors;
  const group = new THREE.Group();

  // Scale reference: 1 unit = ~1 meter, character is ~1.7 units tall
  const bodyHeight = 0.55;
  const legHeight = 0.55;
  const headRadius = 0.18;
  const armLength = 0.5;

  // --- HEAD ---
  const headGroup = new THREE.Group();
  headGroup.name = 'head';

  // Skull
  const skull = new THREE.Mesh(
    new THREE.SphereGeometry(headRadius, 16, 14),
    skinMat(c.skin)
  );
  skull.castShadow = true;
  headGroup.add(skull);

  // Hair (back hemisphere)
  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(headRadius + 0.02, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.6),
    toonMat(c.hair)
  );
  hair.position.y = 0.02;
  hair.castShadow = true;
  headGroup.add(hair);

  // Eyes - white sclera + dark iris
  for (let side = -1; side <= 1; side += 2) {
    const eyeWhite = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.2 })
    );
    eyeWhite.position.set(side * 0.07, 0.02, headRadius * 0.85);
    headGroup.add(eyeWhite);

    const iris = new THREE.Mesh(
      new THREE.SphereGeometry(0.025, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0x2C1810, roughness: 0.3 })
    );
    iris.position.set(side * 0.07, 0.02, headRadius * 0.92);
    headGroup.add(iris);

    // Pupil highlight
    const highlight = new THREE.Mesh(
      new THREE.SphereGeometry(0.008, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xFFFFFF })
    );
    highlight.position.set(side * 0.06, 0.035, headRadius * 0.96);
    headGroup.add(highlight);
  }

  // Eyebrows
  for (let side = -1; side <= 1; side += 2) {
    const brow = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.012, 0.02),
      toonMat(c.hair)
    );
    brow.position.set(side * 0.07, 0.07, headRadius * 0.82);
    brow.rotation.z = side * -0.1;
    headGroup.add(brow);
  }

  // Nose
  const nose = new THREE.Mesh(
    new THREE.ConeGeometry(0.02, 0.04, 6),
    skinMat(c.skin)
  );
  nose.position.set(0, -0.02, headRadius * 0.95);
  nose.rotation.x = -Math.PI / 2;
  headGroup.add(nose);

  // Mouth (smile curve)
  const mouth = new THREE.Mesh(
    new THREE.TorusGeometry(0.035, 0.008, 6, 12, Math.PI),
    new THREE.MeshStandardMaterial({ color: 0xCC4444, roughness: 0.5 })
  );
  mouth.position.set(0, -0.06, headRadius * 0.82);
  mouth.rotation.x = Math.PI;
  mouth.name = 'mouth';
  headGroup.add(mouth);

  // Ears
  for (let side = -1; side <= 1; side += 2) {
    const ear = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 8, 8),
      skinMat(c.skin)
    );
    ear.position.set(side * (headRadius + 0.01), 0, 0);
    ear.scale.set(0.5, 1, 0.7);
    headGroup.add(ear);
  }

  headGroup.position.y = legHeight + bodyHeight + headRadius + 0.05;
  group.add(headGroup);

  // --- HAT / HEADWEAR ---
  const hatGroup = new THREE.Group();
  hatGroup.name = 'hat';

  if (charId === 'patty') {
    // Classic tall chef hat (toque)
    const hatBase = new THREE.Mesh(
      new THREE.CylinderGeometry(headRadius + 0.02, headRadius + 0.02, 0.04, 16),
      toonMat(0xFFFFFF)
    );
    hatBase.position.y = headRadius;
    hatGroup.add(hatBase);
    const hatTop = new THREE.Mesh(
      new THREE.CylinderGeometry(headRadius + 0.04, headRadius + 0.02, 0.22, 16),
      toonMat(0xFFFFFF)
    );
    hatTop.position.y = headRadius + 0.14;
    hatGroup.add(hatTop);
    const hatBulge = new THREE.Mesh(
      new THREE.SphereGeometry(headRadius + 0.05, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5),
      toonMat(0xFFFFFF)
    );
    hatBulge.position.y = headRadius + 0.25;
    hatGroup.add(hatBulge);
  } else if (charId === 'crispy') {
    // Bandana
    const bandana = new THREE.Mesh(
      new THREE.CylinderGeometry(headRadius + 0.03, headRadius + 0.01, 0.06, 16),
      toonMat(c.hat)
    );
    bandana.position.y = headRadius * 0.6;
    hatGroup.add(bandana);
    // Knot at back
    const knot = new THREE.Mesh(
      new THREE.SphereGeometry(0.03, 6, 6),
      toonMat(c.hat)
    );
    knot.position.set(0, headRadius * 0.6, -headRadius - 0.02);
    hatGroup.add(knot);
  } else if (charId === 'frosty') {
    // Chef beanie with cherry
    const beanie = new THREE.Mesh(
      new THREE.SphereGeometry(headRadius + 0.03, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.5),
      toonMat(0xFFFFFF)
    );
    beanie.position.y = headRadius * 0.5;
    hatGroup.add(beanie);
    const cherry = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 8, 8),
      emissiveMat(0xFF6B6B, 0.3)
    );
    cherry.position.y = headRadius + 0.1;
    hatGroup.add(cherry);
  } else if (charId === 'blaze') {
    // Red headband + flame effect
    const headband = new THREE.Mesh(
      new THREE.CylinderGeometry(headRadius + 0.02, headRadius + 0.02, 0.04, 16),
      emissiveMat(0xFF0000, 0.4)
    );
    headband.position.y = headRadius * 0.5;
    hatGroup.add(headband);
    // Flame wisps
    for (let i = 0; i < 3; i++) {
      const flame = new THREE.Mesh(
        new THREE.ConeGeometry(0.02, 0.06 + Math.random() * 0.04, 6),
        emissiveMat(0xFF4500, 0.8)
      );
      flame.position.set(
        (Math.random() - 0.5) * 0.15,
        headRadius + 0.05 + i * 0.02,
        (Math.random() - 0.5) * 0.05
      );
      flame.name = `flame${i}`;
      hatGroup.add(flame);
    }
  } else if (charId === 'saucy') {
    // Backwards trucker cap
    const capTop = new THREE.Mesh(
      new THREE.SphereGeometry(headRadius + 0.03, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.45),
      toonMat(c.hat)
    );
    capTop.position.y = headRadius * 0.4;
    hatGroup.add(capTop);
    const brim = new THREE.Mesh(
      new THREE.CylinderGeometry(headRadius + 0.08, headRadius + 0.06, 0.02, 16, 1, false, Math.PI * 0.7, Math.PI * 0.6),
      toonMat(c.hat)
    );
    brim.position.set(0, headRadius * 0.3, -headRadius * 0.3);
    brim.rotation.x = -0.2;
    hatGroup.add(brim);
  } else if (charId === 'turbo') {
    // Futuristic visor helmet
    const helmet = new THREE.Mesh(
      new THREE.SphereGeometry(headRadius + 0.04, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
      toonMat(0x333344)
    );
    helmet.position.y = headRadius * 0.3;
    hatGroup.add(helmet);
    const visor = new THREE.Mesh(
      new THREE.BoxGeometry(headRadius * 2, 0.06, 0.02),
      emissiveMat(0x00BFFF, 0.8)
    );
    visor.position.set(0, headRadius * 0.2, headRadius + 0.02);
    hatGroup.add(visor);
    // Neon trim ring
    const neonRing = new THREE.Mesh(
      new THREE.TorusGeometry(headRadius + 0.04, 0.01, 8, 32),
      emissiveMat(0x00BFFF, 1.0)
    );
    neonRing.position.y = headRadius * 0.35;
    neonRing.rotation.x = Math.PI / 2;
    hatGroup.add(neonRing);
  }

  hatGroup.position.copy(headGroup.position);
  group.add(hatGroup);

  // --- TORSO ---
  const torsoGroup = new THREE.Group();
  torsoGroup.name = 'torso';

  // Shirt / upper body
  const torso = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.15, bodyHeight, 12),
    toonMat(c.shirt)
  );
  torso.position.y = legHeight + bodyHeight / 2;
  torso.castShadow = true;
  torsoGroup.add(torso);

  // Apron (front covering)
  const apron = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, bodyHeight * 0.8, 0.04),
    toonMat(c.apron)
  );
  apron.position.set(0, legHeight + bodyHeight * 0.45, 0.12);
  apron.castShadow = true;
  torsoGroup.add(apron);

  // Apron strings (at waist)
  const apronString = new THREE.Mesh(
    new THREE.BoxGeometry(0.35, 0.02, 0.02),
    toonMat(c.apron)
  );
  apronString.position.set(0, legHeight + bodyHeight * 0.3, 0.08);
  torsoGroup.add(apronString);

  // Collar
  const collar = new THREE.Mesh(
    new THREE.TorusGeometry(0.14, 0.02, 6, 16, Math.PI),
    toonMat(c.shirt)
  );
  collar.position.set(0, legHeight + bodyHeight - 0.02, 0.06);
  collar.rotation.x = -Math.PI / 4;
  torsoGroup.add(collar);

  // Neon trim for Turbo
  if (charId === 'turbo') {
    const chestLine = new THREE.Mesh(
      new THREE.BoxGeometry(0.01, bodyHeight * 0.6, 0.05),
      emissiveMat(0x00BFFF, 1.0)
    );
    chestLine.position.set(0, legHeight + bodyHeight * 0.5, 0.15);
    torsoGroup.add(chestLine);
  }

  group.add(torsoGroup);

  // --- ARMS ---
  const armMat = toonMat(c.shirt);
  const handMat = skinMat(c.skin);

  for (let side = -1; side <= 1; side += 2) {
    const armGroup = new THREE.Group();
    armGroup.name = side === -1 ? 'leftArm' : 'rightArm';

    // Shoulder joint
    const shoulder = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 8, 8),
      armMat
    );
    shoulder.castShadow = true;
    armGroup.add(shoulder);

    // Upper arm
    const upperArm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, armLength * 0.5, 8),
      armMat
    );
    upperArm.position.y = -armLength * 0.25;
    upperArm.castShadow = true;
    armGroup.add(upperArm);

    // Elbow
    const elbow = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 6, 6),
      armMat
    );
    elbow.position.y = -armLength * 0.5;
    armGroup.add(elbow);

    // Forearm (skin visible - rolled up sleeves)
    const forearm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.03, armLength * 0.45, 8),
      skinMat(c.skin)
    );
    forearm.position.y = -armLength * 0.75;
    forearm.castShadow = true;
    armGroup.add(forearm);

    // Hand
    const hand = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 8, 8),
      handMat
    );
    hand.position.y = -armLength;
    hand.castShadow = true;
    armGroup.add(hand);

    armGroup.position.set(side * 0.23, legHeight + bodyHeight - 0.05, 0);
    group.add(armGroup);
  }

  // --- LEGS ---
  for (let side = -1; side <= 1; side += 2) {
    const legGroup = new THREE.Group();
    legGroup.name = side === -1 ? 'leftLeg' : 'rightLeg';

    // Upper leg (pants)
    const upperLeg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.055, legHeight * 0.55, 8),
      toonMat(c.pants)
    );
    upperLeg.position.y = -legHeight * 0.275;
    upperLeg.castShadow = true;
    legGroup.add(upperLeg);

    // Knee
    const knee = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 6, 6),
      toonMat(c.pants)
    );
    knee.position.y = -legHeight * 0.55;
    legGroup.add(knee);

    // Lower leg
    const lowerLeg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.045, legHeight * 0.4, 8),
      toonMat(c.pants)
    );
    lowerLeg.position.y = -legHeight * 0.75;
    lowerLeg.castShadow = true;
    legGroup.add(lowerLeg);

    // Shoe
    const shoe = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.06, 0.14),
      toonMat(c.shoes)
    );
    shoe.position.set(0, -legHeight - 0.01, 0.02);
    shoe.castShadow = true;
    shoe.name = side === -1 ? 'leftShoe' : 'rightShoe';
    legGroup.add(shoe);

    legGroup.position.set(side * 0.08, legHeight + 0.02, 0);
    group.add(legGroup);
  }

  // Position model so shoes sit at y=0
  group.position.y = 0.03;

  // Store animation references
  group.userData = {
    charId,
    baseY: group.position.y,
    animState: 'idle',
    animTime: 0,
  };

  return group;
}

// ============================================
// ANIMATION SYSTEM
// Procedural sine-wave animations per state
// Will be replaced by AnimationMixer when GLTF models are loaded
// ============================================
export function animateCharacter(model, delta, state, time) {
  if (!model || !model.userData) return;

  const leftArm = model.getObjectByName('leftArm');
  const rightArm = model.getObjectByName('rightArm');
  const leftLeg = model.getObjectByName('leftLeg');
  const rightLeg = model.getObjectByName('rightLeg');
  const head = model.getObjectByName('head');
  const hat = model.getObjectByName('hat');
  const torso = model.getObjectByName('torso');

  if (!leftArm || !leftLeg) return;

  model.userData.animTime += delta;
  const t = time * 12;
  const it = model.userData.animTime;

  // Reset transforms
  model.scale.set(1, 1, 1);
  model.rotation.x = 0;
  if (state !== 'idle') model.rotation.z = 0;

  switch (state) {
    case 'running': {
      // Leg stride
      leftLeg.rotation.x = Math.sin(t) * 0.8;
      rightLeg.rotation.x = Math.sin(t + Math.PI) * 0.8;

      // Arm swing (opposite to legs)
      leftArm.rotation.x = Math.sin(t + Math.PI) * 0.6;
      rightArm.rotation.x = Math.sin(t) * 0.6;

      // Slight arm sway outward
      leftArm.rotation.z = 0.15 + Math.sin(t) * 0.05;
      rightArm.rotation.z = -0.15 + Math.sin(t + Math.PI) * 0.05;

      // Body bob
      model.position.y = model.userData.baseY + Math.abs(Math.sin(t)) * 0.04;

      // Torso twist
      if (torso) torso.rotation.y = Math.sin(t) * 0.05;

      // Head slight bob
      if (head) head.rotation.x = Math.sin(t * 2) * 0.03;
      if (hat) hat.rotation.x = Math.sin(t * 2) * 0.03;

      // Forward lean
      model.rotation.x = 0.05;
      break;
    }
    case 'jumping': {
      // Stretch upward
      model.scale.set(0.92, 1.12, 0.92);
      leftArm.rotation.x = -1.2;
      rightArm.rotation.x = -1.2;
      leftArm.rotation.z = 0.5;
      rightArm.rotation.z = -0.5;
      leftLeg.rotation.x = 0.3;
      rightLeg.rotation.x = -0.1;
      model.rotation.x = -0.05;
      break;
    }
    case 'sliding': {
      // Duck down and lean forward
      model.scale.set(1.15, 0.5, 1.15);
      model.rotation.x = 0.5;
      leftArm.rotation.x = -0.8;
      rightArm.rotation.x = -0.8;
      leftArm.rotation.z = 1.0;
      rightArm.rotation.z = -1.0;
      leftLeg.rotation.x = 1.2;
      rightLeg.rotation.x = 1.2;
      break;
    }
    case 'hit': {
      // Flash visibility and stumble
      const flash = Math.floor(it * 15) % 2;
      model.visible = flash === 0;
      model.rotation.y += delta * 12;
      leftArm.rotation.x = -0.5;
      rightArm.rotation.x = 0.3;
      leftLeg.rotation.x = 0.4;
      rightLeg.rotation.x = -0.2;
      break;
    }
    case 'idle': {
      // Reset
      leftLeg.rotation.x = 0;
      rightLeg.rotation.x = 0;
      leftArm.rotation.z = 0.15;
      rightArm.rotation.z = -0.15;

      const charId = model.userData.charId;

      switch (charId) {
        case 'patty':
          // Confident fist pump
          rightArm.rotation.x = -Math.abs(Math.sin(it * 2.5)) * 1.4;
          leftArm.rotation.x = Math.sin(it * 1.2) * 0.2;
          model.position.y = model.userData.baseY + Math.abs(Math.sin(it * 2.5)) * 0.03;
          break;
        case 'crispy':
          // Quick spin
          model.rotation.y = it * 4;
          rightArm.rotation.x = -0.3;
          leftArm.rotation.x = -0.3;
          break;
        case 'frosty':
          // Shiver
          model.position.x = (model.position.x || 0) + Math.sin(it * 18) * 0.003;
          model.rotation.z = Math.sin(it * 15) * 0.02;
          leftArm.rotation.x = Math.sin(it * 8) * 0.15;
          rightArm.rotation.x = Math.sin(it * 8 + 1) * 0.15;
          break;
        case 'blaze':
          // Stomp and intensity
          if (Math.sin(it * 3) > 0.85) {
            model.position.y = model.userData.baseY - 0.02;
            rightLeg.rotation.x = -0.6;
          }
          leftArm.rotation.x = -0.4;
          rightArm.rotation.x = -0.4;
          // Animate flame positions
          for (let fi = 0; fi < 3; fi++) {
            const flame = model.getObjectByName(`flame${fi}`);
            if (flame) {
              flame.position.y += Math.sin(it * 10 + fi) * 0.002;
              flame.scale.y = 1 + Math.sin(it * 8 + fi * 2) * 0.3;
            }
          }
          break;
        case 'saucy':
          // Sway like listening to music
          model.rotation.z = Math.sin(it * 2.5) * 0.08;
          model.position.x = (model.position.x || 0) + Math.sin(it * 2.5) * 0.003;
          leftArm.rotation.x = Math.sin(it * 2.5) * 0.3;
          rightArm.rotation.x = Math.sin(it * 2.5 + Math.PI) * 0.3;
          if (head) head.rotation.z = Math.sin(it * 2.5) * 0.05;
          break;
        case 'turbo':
          // Robotic precision + neon pulse
          model.position.y = model.userData.baseY + Math.sin(it * 3) * 0.02;
          // Slight head tilt
          if (head) head.rotation.y = Math.sin(it * 1.5) * 0.15;
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
  return CHARACTER_ORDER.map(id => ({ id, cost: CHARACTERS[id].unlockCost }));
}
