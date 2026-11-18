// Solmar Bay — people.
// Pedestrians stroll the sidewalks and run when shots ring out; Halcones
// gunmen close in, strafe and shoot back. Everyone is boxes and a sphere,
// animated by a walk bob and a fall when they go down.

import * as THREE from 'three';
import { CONFIG } from './config.js';
import { nearestRoadPoint } from './city.js';

const SHIRTS = [0xd8e8f0, 0xe8b8c8, 0xc8e8b8, 0xe8d8a8, 0xc8b8e8, 0xf0f0f0, 0xe07848];
const PANTS = [0x2c3a48, 0x4a3a2c, 0x3a4a3a, 0x5a5a5a];
const SKINS = [0xe8b890, 0xc89068, 0x8a5a38, 0xf0c8a0];

function makePersonMesh(rng, opts = {}) {
  const g = new THREE.Group();
  const shirt = opts.gunman ? 0x1e1e24 : opts.police ? 0x1e3a5f : rng.pick(SHIRTS);
  const pants = opts.gunman ? 0x14141a : opts.police ? 0x1e3a5f : rng.pick(PANTS);
  const skin = rng.pick(SKINS);
  const torso = new THREE.Mesh(
    new THREE.BoxGeometry(0.62, 0.75, 0.34),
    new THREE.MeshLambertMaterial({ color: shirt }),
  );
  torso.position.y = 1.05;
  torso.castShadow = true;
  g.add(torso);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.24, 10, 8),
    new THREE.MeshLambertMaterial({ color: skin }),
  );
  head.position.y = 1.62;
  head.castShadow = true;
  g.add(head);
  for (const sx of [-0.16, 0.16]) {
    const leg = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.68, 0.26),
      new THREE.MeshLambertMaterial({ color: pants }),
    );
    leg.position.set(sx, 0.34, 0);
    leg.castShadow = true;
    g.add(leg);
  }
  if (opts.gunman) {
    const gun = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.1, 0.55),
      new THREE.MeshLambertMaterial({ color: 0x111111 }),
    );
    gun.position.set(0.3, 1.15, 0.3);
    g.add(gun);
    const band = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.1, 0.1),
      new THREE.MeshLambertMaterial({ color: 0xc02020, emissive: 0xc02020, emissiveIntensity: 0.5 }),
    );
    band.position.set(0, 1.28, 0.19);
    g.add(band);
  }
  if (opts.police) {
    const cap = new THREE.Mesh(
      new THREE.BoxGeometry(0.52, 0.12, 0.52),
      new THREE.MeshLambertMaterial({ color: 0x14263e }),
    );
    cap.position.y = 1.86;
    g.add(cap);
    const badge = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.1, 0.04),
      new THREE.MeshLambertMaterial({ color: 0xffd23e, emissive: 0xffd23e, emissiveIntensity: 0.6 }),
    );
    badge.position.set(0, 1.28, 0.19);
    g.add(badge);
  }
  return g;
}

export function spawnPedestrians(G) {
  const rng = G.rng;
  G.peds = [];
  for (let i = 0; i < CONFIG.pedestrians.count; i++) {
    const vertical = rng.chance(0.5);
    const road = rng.pick(G.city.roads);
    const t = rng.range(-190, 190);
    const side = rng.sign() * 7.6;
    const dir = rng.sign();
    const mesh = makePersonMesh(rng);
    G.scene.add(mesh);
    const ped = {
      mesh,
      kind: 'ped',
      x: vertical ? road + side : t,
      z: vertical ? t : road + side,
      heading: vertical ? (dir > 0 ? 0 : Math.PI) : (dir > 0 ? Math.PI / 2 : -Math.PI / 2),
      speed: rng.range(CONFIG.pedestrians.walkMin, CONFIG.pedestrians.walkMax),
      axis: vertical ? 'z' : 'x',
      dir,
      side,
      road,
      state: 'walk',
      walkPhase: rng.range(0, Math.PI * 2),
      fleeX: 0,
      fleeZ: 0,
    };
    mesh.userData.entity = ped;
    G.peds.push(ped);
  }
}

export function updatePedestrians(G, dt) {
  const p = G.player;
  for (const ped of G.peds) {
    if (ped.state === 'down') continue;
    // A shot nearby sends everyone running from it.
    const sinceShot = G.time - G.combat.lastShotAt;
    if (sinceShot < 2.5) {
      const d = Math.hypot(ped.x - G.combat.lastShotX, ped.z - G.combat.lastShotZ);
      if (d < 32 && ped.state !== 'flee') {
        ped.state = 'flee';
        ped.fleeX = ped.x - G.combat.lastShotX;
        ped.fleeZ = ped.z - G.combat.lastShotZ;
        const l = Math.hypot(ped.fleeX, ped.fleeZ) || 1;
        ped.fleeX /= l;
        ped.fleeZ /= l;
      }
    }
    if (ped.state === 'flee') {
      ped.x += ped.fleeX * CONFIG.pedestrians.fleeSpeed * dt;
      ped.z += ped.fleeZ * CONFIG.pedestrians.fleeSpeed * dt;
      ped.heading = Math.atan2(ped.fleeX, ped.fleeZ);
      if (sinceShot > 6) ped.state = 'walk';
    } else {
      const step = ped.speed * dt;
      if (ped.axis === 'z') ped.z += step * ped.dir;
      else ped.x += step * ped.dir;
      const along = ped.axis === 'z' ? ped.z : ped.x;
      if (Math.abs(along) > 198) {
        ped.dir *= -1;
        ped.heading += Math.PI;
      }
      // At an intersection, sometimes turn onto the crossing sidewalk.
      if (G.rng.chance(dt * 0.03)) {
        const cross = nearestRoadPoint(G, ped.x, ped.z);
        if (Math.abs(cross.x - ped.x) < 2 && Math.abs(cross.z - ped.z) < 2) {
          const snapped = Math.round((ped.axis === 'z' ? ped.z : ped.x) / 60) * 60;
          ped.axis = ped.axis === 'z' ? 'x' : 'z';
          ped.road = snapped;
          ped.dir = G.rng.sign();
          if (ped.axis === 'z') { ped.x = snapped + ped.side; }
          else { ped.z = snapped + ped.side; }
          ped.heading = ped.axis === 'z'
            ? (ped.dir > 0 ? 0 : Math.PI)
            : (ped.dir > 0 ? Math.PI / 2 : -Math.PI / 2);
        }
      }
    }
    ped.walkPhase += dt * (ped.state === 'flee' ? 11 : 6);
    ped.mesh.position.set(ped.x, Math.abs(Math.sin(ped.walkPhase)) * 0.07, ped.z);
    ped.mesh.rotation.y = ped.heading;
  }
}

export function spawnGunmen(G, x, z, n) {
  const rng = G.rng;
  for (let i = 0; i < n; i++) {
    const mesh = makePersonMesh(rng, { gunman: true });
    G.scene.add(mesh);
    const gx = x + rng.range(-8, 8);
    const gz = z + rng.range(-8, 8);
    const gm = {
      mesh,
      kind: 'gunman',
      x: gx,
      z: gz,
      heading: 0,
      hp: CONFIG.combat.gunmanHp,
      shootTimer: rng.range(0.5, 1.5),
      strafeDir: rng.sign(),
      state: 'hunt',
      downAt: 0,
    };
    mesh.userData.entity = gm;
    G.gunmen.push(gm);
  }
}

export function updateGunmen(G, dt) {
  const p = G.player;
  for (const gm of G.gunmen) {
    if (gm.state === 'down') continue;
    const dx = p.x - gm.x;
    const dz = p.z - gm.z;
    const dist = Math.hypot(dx, dz) || 0.001;
    gm.heading = Math.atan2(dx, dz);
    if (dist > CONFIG.combat.gunmanRange) {
      // Close the distance.
      gm.x += (dx / dist) * 4.5 * dt;
      gm.z += (dz / dist) * 4.5 * dt;
    } else {
      // Strafe sideways and shoot.
      const px = -dz / dist;
      const pz = dx / dist;
      gm.x += px * gm.strafeDir * 2.2 * dt;
      gm.z += pz * gm.strafeDir * 2.2 * dt;
      if (G.rng.chance(dt * 0.4)) gm.strafeDir *= -1;
      gm.shootTimer -= dt;
      if (gm.shootTimer <= 0) {
        gm.shootTimer = CONFIG.combat.gunmanShotEvery * G.rng.range(0.8, 1.3);
        gunmanShoot(G, gm, dist);
      }
    }
    gm.mesh.position.set(gm.x, 0, gm.z);
    gm.mesh.rotation.y = gm.heading;
  }
}

function gunmanShoot(G, gm, dist) {
  // A tracer back at Rico, and a hit chance that falls off with distance.
  G.combat.lastShotAt = G.time;
  G.combat.lastShotX = gm.x;
  G.combat.lastShotZ = gm.z;
  const hitChance = Math.max(0.08, 0.55 - dist * 0.015);
  if (G.rng.chance(hitChance)) {
    damagePlayer(G, CONFIG.combat.gunmanDamage, 'gunman');
  }
  G.audio.shot(true);
}

export function damagePlayer(G, amount, from) {
  if (G.mode !== 'playing') return;
  G.player.health -= amount;
  G.combat.lastHurtAt = G.time;
  G.hud.flashDamage();
  if (G.player.health <= 0) {
    G.player.health = 0;
    G.mode = 'wasted';
    G.screens.showWasted();
    G.audio.wasted();
  }
}

export function clearGunmen(G) {
  for (const gm of G.gunmen) G.scene.remove(gm.mesh);
  G.gunmen = [];
}

export { makePersonMesh };
