// Solmar Bay — the city.
// A 7x7 road grid with a plaza, a beach and the sea, built from one seed:
// procedural buildings with lit windows, palms, streetlights and the five
// landmarks the missions point at. Every building also registers an
// axis-aligned collider the cars and Rico slide against.

import * as THREE from 'three';
import { CONFIG } from './config.js';

const W = CONFIG.world;
const ROADS = [-180, -120, -60, 0, 60, 120, 180];
const BLOCKS = [-150, -90, -30, 30, 90, 150];

function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// A wall face: the building's own colour with a grid of windows, a few lit.
function buildingMaterial(rng, baseColor, w, h) {
  const tex = canvasTexture(128, 256, (g, cw, ch) => {
    g.fillStyle = '#' + baseColor.toString(16).padStart(6, '0');
    g.fillRect(0, 0, cw, ch);
    const cols = 5;
    const rows = 9;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const lit = rng.chance(0.28);
        g.fillStyle = lit ? '#ffd98a' : 'rgba(20, 30, 44, 0.85)';
        g.fillRect(10 + c * 22, 12 + r * 26, 14, 16);
      }
    }
  });
  tex.repeat.set(Math.max(1, Math.round(w / 14)), Math.max(1, Math.round(h / 14)));
  return new THREE.MeshLambertMaterial({ map: tex });
}

function roadTexture(horizontal) {
  return canvasTexture(256, 256, (g, cw, ch) => {
    g.fillStyle = '#3a3d42';
    g.fillRect(0, 0, cw, ch);
    g.fillStyle = '#c8c8b8';
    if (horizontal) {
      g.fillRect(20, ch / 2 - 3, 60, 6);
      g.fillRect(148, ch / 2 - 3, 60, 6);
      g.fillStyle = '#565a60';
      g.fillRect(0, 2, cw, 4);
      g.fillRect(0, ch - 6, cw, 4);
    } else {
      g.fillRect(cw / 2 - 3, 20, 6, 60);
      g.fillRect(cw / 2 - 3, 148, 6, 60);
      g.fillStyle = '#565a60';
      g.fillRect(2, 0, 4, ch);
      g.fillRect(cw - 6, 0, 4, ch);
    }
  });
}

function addBox(G, group, w, h, d, x, y, z, material, shadow = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  m.castShadow = shadow;
  m.receiveShadow = true;
  group.add(m);
  return m;
}

function makePalm(rng) {
  const g = new THREE.Group();
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8a6a48 });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.35, 6, 6), trunkMat);
  trunk.position.y = 3;
  trunk.rotation.z = rng.range(-0.08, 0.08);
  trunk.castShadow = true;
  g.add(trunk);
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x3f8f4f });
  for (let i = 0; i < 6; i++) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.8, 3.2, 4), leafMat);
    const a = (i / 6) * Math.PI * 2;
    leaf.position.set(Math.cos(a) * 1.5, 5.9, Math.sin(a) * 1.5);
    leaf.rotation.set(Math.sin(a) * 1.9, 0, -Math.cos(a) * 1.9);
    leaf.castShadow = true;
    g.add(leaf);
  }
  return g;
}

function makeStreetlight() {
  const g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: 0x2c2f33 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 7, 6), mat);
  pole.position.y = 3.5;
  pole.castShadow = true;
  g.add(pole);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 0.12), mat);
  arm.position.set(0.8, 6.9, 0);
  g.add(arm);
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.18, 0.3),
    new THREE.MeshLambertMaterial({ color: 0xffe9a8, emissive: 0xffe9a8, emissiveIntensity: 0.7 }),
  );
  head.position.set(1.5, 6.85, 0);
  g.add(head);
  return g;
}

export function buildCity(G) {
  const rng = G.rng;
  const group = new THREE.Group();
  group.name = 'city';
  G.scene.add(group);
  const colliders = [];

  const mat = (c) => new THREE.MeshLambertMaterial({ color: c });

  // Ground, beach and sea.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(W.groundSize, W.groundSize),
    mat(CONFIG.colors.grass),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  group.add(ground);

  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(480, W.seaStart - W.beachStart),
    mat(CONFIG.colors.sand),
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(0, 0.02, (W.beachStart + W.seaStart) / 2);
  sand.receiveShadow = true;
  group.add(sand);

  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(640, 180),
    new THREE.MeshLambertMaterial({ color: CONFIG.colors.sea, transparent: true, opacity: 0.92 }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(0, 0.05, W.seaStart + 90);
  group.add(sea);

  // Boardwalk along the beach.
  const walk = new THREE.Mesh(
    new THREE.PlaneGeometry(420, 10),
    mat(0xb08a5e),
  );
  walk.rotation.x = -Math.PI / 2;
  walk.position.set(0, 0.03, W.beachStart - 5);
  walk.receiveShadow = true;
  group.add(walk);

  // Roads: asphalt strips with a painted centre line, sidewalks beside them.
  const roadTexV = roadTexture(false);
  const roadTexH = roadTexture(true);
  for (const c of ROADS) {
    for (const vertical of [true, false]) {
      const tex = (vertical ? roadTexV : roadTexH).clone();
      tex.repeat.set(vertical ? 1 : 13, vertical ? 13 : 1);
      tex.needsUpdate = true;
      const road = new THREE.Mesh(
        new THREE.PlaneGeometry(vertical ? W.roadWidth : 420, vertical ? 420 : W.roadWidth),
        new THREE.MeshLambertMaterial({ map: tex }),
      );
      road.rotation.x = -Math.PI / 2;
      road.position.set(vertical ? c : 0, 0.04, vertical ? 0 : c);
      road.receiveShadow = true;
      group.add(road);
      for (const side of [-1, 1]) {
        const walkSide = new THREE.Mesh(
          new THREE.PlaneGeometry(vertical ? 2.4 : 420, vertical ? 420 : 2.4),
          mat(CONFIG.colors.sidewalk),
        );
        walkSide.rotation.x = -Math.PI / 2;
        walkSide.position.set(
          vertical ? c + side * (W.roadWidth / 2 + 1.2) : 0,
          0.03,
          vertical ? 0 : c + side * (W.roadWidth / 2 + 1.2),
        );
        walkSide.receiveShadow = true;
        group.add(walkSide);
      }
    }
  }

  const plazaBlock = { x: 30, z: 30 };
  const barBlock = { x: -30, z: -30 };
  const bankBlock = { x: 150, z: 150 };
  const warehouseBlock = { x: -150, z: 150 };
  const houseBlock = { x: -150, z: -150 };

  function addCollider(x, z, hx, hz) {
    colliders.push({ minX: x - hx, maxX: x + hx, minZ: z - hz, maxZ: z + hz });
  }

  function addBuilding(bx, bz, w, h, d, color, ox = 0, oz = 0) {
    const x = bx + ox;
    const z = bz + oz;
    const mesh = addBox(G, group, w, h, d, x, h / 2, z, buildingMaterial(rng, color, w, h));
    // A darker roof cap so the skyline reads at a glance.
    addBox(G, group, w * 0.7, 1.2, d * 0.7, x, h + 0.6, z, mat(0x4a4d52), false);
    addCollider(x, z, w / 2, d / 2);
    return mesh;
  }

  // The plaza: an open square with a fountain and a ring of palms.
  const plaza = new THREE.Mesh(
    new THREE.PlaneGeometry(W.blockSize, W.blockSize),
    mat(CONFIG.colors.plaza),
  );
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.set(plazaBlock.x, 0.03, plazaBlock.z);
  plaza.receiveShadow = true;
  group.add(plaza);
  const basin = new THREE.Mesh(
    new THREE.CylinderGeometry(6, 6.6, 1.1, 20),
    mat(0x9aa0a8),
  );
  basin.position.set(plazaBlock.x, 0.55, plazaBlock.z);
  basin.castShadow = true;
  group.add(basin);
  const water = new THREE.Mesh(
    new THREE.CylinderGeometry(5.4, 5.4, 0.3, 20),
    new THREE.MeshLambertMaterial({ color: 0x3f9ec2 }),
  );
  water.position.set(plazaBlock.x, 1.05, plazaBlock.z);
  group.add(water);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const palm = makePalm(rng);
    palm.position.set(plazaBlock.x + Math.cos(a) * 19, 0, plazaBlock.z + Math.sin(a) * 19);
    group.add(palm);
  }

  // Landmarks.
  // Delgado's bar: a low stucco block with a warm neon sign band.
  addBuilding(barBlock.x, barBlock.z, 26, 9, 18, 0xd8a06a);
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(12, 1.4, 0.4),
    new THREE.MeshLambertMaterial({ color: 0xff5a7a, emissive: 0xff5a7a, emissiveIntensity: 0.9 }),
  );
  sign.position.set(barBlock.x, 8, barBlock.z - 9.2);
  group.add(sign);

  // The Solmar Bay Bank: the tallest glass tower in town.
  addBuilding(bankBlock.x, bankBlock.z, 24, 52, 24, CONFIG.colors.glass);
  addBox(G, group, 26, 2, 26, bankBlock.x, 53, bankBlock.z, mat(0x2c3a48), false);

  // The warehouse: one big low shed by the south-west blocks.
  addBuilding(warehouseBlock.x, warehouseBlock.z, 38, 11, 26, 0x8a7a68);

  // The safehouse: a small pale house with a red roof.
  addBuilding(houseBlock.x, houseBlock.z, 14, 7, 12, 0xe8dcc8);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(11, 4, 4), mat(0xa83a2e));
  roof.position.set(houseBlock.x, 9, houseBlock.z);
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  group.add(roof);

  // The pier: planks out over the water at x = 0.
  for (let z = W.beachStart; z < W.seaStart + 24; z += 4) {
    addBox(G, group, 8, 0.4, 3.6, 0, 0.5, z + 2, mat(0x7a5a38), false);
  }
  addBox(G, group, 0.5, 1, 46, -4, 1, W.beachStart + 22, mat(0x7a5a38), false);
  addBox(G, group, 0.5, 1, 46, 4, 1, W.beachStart + 22, mat(0x7a5a38), false);

  // Ordinary blocks: one to three buildings each, taller toward the centre.
  for (const bx of BLOCKS) {
    for (const bz of BLOCKS) {
      if (bx === plazaBlock.x && bz === plazaBlock.z) continue;
      if (bx === barBlock.x && bz === barBlock.z) continue;
      if (bx === bankBlock.x && bz === bankBlock.z) continue;
      if (bx === warehouseBlock.x && bz === warehouseBlock.z) continue;
      if (bx === houseBlock.x && bz === houseBlock.z) continue;
      const centreDist = Math.hypot(bx, bz);
      const maxH = centreDist < 100 ? 42 : 26;
      const count = rng.int(1, 3);
      const spots = [
        [-11, -11], [11, -11], [-11, 11], [11, 11],
      ];
      for (let i = 0; i < count; i++) {
        const [ox, oz] = spots[(i * 2 + rng.int(0, 1)) % 4];
        const w = rng.range(13, 22);
        const d = rng.range(13, 22);
        const h = rng.range(10, maxH);
        addBuilding(bx, bz, w, h, d, rng.pick(CONFIG.colors.buildings), ox + rng.range(-3, 3), oz + rng.range(-3, 3));
      }
    }
  }

  // Palms along the beach and streetlights at every other intersection.
  for (let x = -190; x <= 190; x += 38) {
    const palm = makePalm(rng);
    palm.position.set(x + rng.range(-6, 6), 0, W.beachStart - 12);
    group.add(palm);
  }
  for (const cx of ROADS) {
    for (const cz of ROADS) {
      if (((cx + cz) / 60) % 2 === 0) {
        const light = makeStreetlight();
        light.position.set(cx + 7.5, 0, cz + 7.5);
        group.add(light);
      }
    }
  }

  G.city = {
    colliders,
    roads: ROADS.slice(),
    landmarks: {
      bar: { x: barBlock.x, z: barBlock.z },
      bank: { x: bankBlock.x, z: bankBlock.z },
      warehouse: { x: warehouseBlock.x, z: warehouseBlock.z },
      pier: { x: 0, z: W.seaStart + 12 },
      safehouse: { x: houseBlock.x, z: houseBlock.z },
      plaza: { x: plazaBlock.x, z: plazaBlock.z },
    },
    spawn: { x: 0, z: -40, heading: Math.PI },
  };
  return G.city;
}

// Push a circle out of every building it overlaps. Returns true on a hit.
export function collideCircle(G, x, z, r) {
  let hit = false;
  for (const c of G.city.colliders) {
    const nx = Math.max(c.minX, Math.min(x, c.maxX));
    const nz = Math.max(c.minZ, Math.min(z, c.maxZ));
    const dx = x - nx;
    const dz = z - nz;
    const d2 = dx * dx + dz * dz;
    if (d2 < r * r) {
      hit = true;
      if (d2 > 0.0001) {
        const d = Math.sqrt(d2);
        x = nx + (dx / d) * r;
        z = nz + (dz / d) * r;
      } else {
        // dead centre inside the box: push out along the smallest axis
        const pushL = x - c.minX + r;
        const pushR = c.maxX - x + r;
        const pushU = z - c.minZ + r;
        const pushD = c.maxZ - z + r;
        const m = Math.min(pushL, pushR, pushU, pushD);
        if (m === pushL) x = c.minX - r;
        else if (m === pushR) x = c.maxX + r;
        else if (m === pushU) z = c.minZ - r;
        else z = c.maxZ + r;
      }
    }
  }
  return { x, z, hit };
}

export function isOnRoad(G, x, z) {
  const half = W.roadWidth / 2 + 1;
  for (const c of ROADS) {
    if (Math.abs(x - c) <= half && Math.abs(z) <= W.half) return true;
    if (Math.abs(z - c) <= half && Math.abs(x) <= W.half) return true;
  }
  return false;
}

// The closest point on the road network, for spawning and AI steering.
export function nearestRoadPoint(G, x, z) {
  let best = null;
  let bestD = Infinity;
  for (const c of ROADS) {
    const cz = Math.max(-W.half, Math.min(W.half, z));
    const d = Math.abs(x - c) + Math.abs(z - cz) * 0.01;
    if (d < bestD) { bestD = d; best = { x: c, z: cz }; }
    const cx = Math.max(-W.half, Math.min(W.half, x));
    const d2 = Math.abs(z - c) + Math.abs(x - cx) * 0.01;
    if (d2 < bestD) { bestD = d2; best = { x: cx, z: c }; }
  }
  return best;
}

export function randomRoadPoint(G) {
  const rng = G.rng;
  const c = rng.pick(ROADS);
  const t = rng.range(-W.half + 10, W.half - 10);
  if (rng.chance(0.5)) return { x: c, z: t, vertical: true };
  return { x: t, z: c, vertical: false };
}
