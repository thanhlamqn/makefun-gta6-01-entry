// Solmar Bay — the wanted system.
// Crimes add heat; heat is wanted stars, 0 to 5. Cruisers spawn to match
// the stars and hunt Rico down the roads; when one gets close, an officer
// steps out to make the arrest. Lay low and the heat dies down.

import { CONFIG } from './config.js';
import { spawnPoliceCar, updatePolice, removeCar } from './vehicles.js';
import { makePersonMesh } from './people.js';

const LEVELS = [0, 12, 28, 48, 70, 88];

export function initWanted(G) {
  G.wanted = {
    level: 0,
    heat: 0,
    lastCrimeAt: -999,
    police: [],
    officers: [],
  };
}

export function heatToLevel(heat) {
  let level = 0;
  for (let i = 0; i < LEVELS.length; i++) {
    if (heat >= LEVELS[i]) level = i;
  }
  return level;
}

export function addHeat(G, stars) {
  G.wanted.heat = Math.min(100, G.wanted.heat + stars * 14);
  G.wanted.lastCrimeAt = G.time;
  refreshLevel(G);
}

export function setWanted(G, level) {
  G.wanted.heat = LEVELS[Math.max(0, Math.min(5, level))];
  G.wanted.lastCrimeAt = G.time;
  refreshLevel(G);
}

export function clearWanted(G) {
  G.wanted.heat = 0;
  G.wanted.level = 0;
  for (const car of G.wanted.police.slice()) removeCar(G, car);
  for (const off of G.wanted.officers.slice()) removeOfficer(G, off);
}

function refreshLevel(G) {
  const level = heatToLevel(G.wanted.heat);
  if (level !== G.wanted.level) {
    G.wanted.level = level;
    G.hud.setStars(level);
    if (level > 0) G.audio.siren(true);
    else G.audio.siren(false);
  }
}

function desiredPolice(level) {
  return Math.min(CONFIG.police.maxCars, level);
}

function spawnOfficer(G, car) {
  const mesh = makePersonMesh(G.rng, { police: true });
  G.scene.add(mesh);
  const off = {
    mesh,
    kind: 'officer',
    x: car.x + 2,
    z: car.z + 2,
    heading: 0,
    hp: CONFIG.combat.officerHp,
    state: 'walk',
    downAt: 0,
  };
  mesh.userData.entity = off;
  G.wanted.officers.push(off);
  return off;
}

function removeOfficer(G, off) {
  G.scene.remove(off.mesh);
  const i = G.wanted.officers.indexOf(off);
  if (i >= 0) G.wanted.officers.splice(i, 1);
}

export function updateWanted(G, dt) {
  const w = G.wanted;
  // The heat cools once Rico has kept his nose clean for a while.
  if (w.heat > 0 && G.time - w.lastCrimeAt > CONFIG.police.coolAfter) {
    w.heat = Math.max(0, w.heat * (1 - CONFIG.police.coolRate * dt));
    refreshLevel(G);
  }

  // Cruisers to match the stars.
  const want = desiredPolice(w.level);
  while (w.police.length < want) {
    const a = G.rng.range(0, Math.PI * 2);
    const d = CONFIG.police.spawnDistance;
    spawnPoliceCar(G, G.player.x + Math.cos(a) * d, G.player.z + Math.sin(a) * d);
  }
  while (w.police.length > want) {
    // The furthest cruiser gives up first.
    let far = w.police[0];
    let farD = -1;
    for (const car of w.police) {
      const d = Math.hypot(car.x - G.player.x, car.z - G.player.z);
      if (d > farD) { farD = d; far = car; }
    }
    removeCar(G, far);
  }
  updatePolice(G, dt);

  // An officer steps out when a cruiser gets close to Rico on foot.
  const p = G.player;
  if (w.level > 0 && p.onFoot && Math.abs(p.speed) < 2 && w.officers.length < 2) {
    for (const car of w.police) {
      const d = Math.hypot(car.x - p.x, car.z - p.z);
      if (d < 12) {
        spawnOfficer(G, car);
        break;
      }
    }
  }
  for (const off of w.officers.slice()) {
    if (off.state === 'down') {
      if (G.time - off.downAt > 4) removeOfficer(G, off);
      continue;
    }
    const dx = p.x - off.x;
    const dz = p.z - off.z;
    const dist = Math.hypot(dx, dz) || 0.001;
    off.heading = Math.atan2(dx, dz);
    if (dist > 1.2) {
      off.x += (dx / dist) * 3.6 * dt;
      off.z += (dz / dist) * 3.6 * dt;
    }
    off.mesh.position.set(off.x, 0, off.z);
    off.mesh.rotation.y = off.heading;
    if (dist < CONFIG.police.arrestRadius && p.onFoot && Math.abs(p.speed) < 2) {
      arrestPlayer(G);
      return;
    }
  }
}

function arrestPlayer(G) {
  const fine = Math.min(100, G.player.cash);
  G.player.cash -= fine;
  G.hud.toast(`Busted! The SBPD took $${fine} as a fine.`);
  clearWanted(G);
  G.mode = 'busted';
  G.screens.showBusted(fine);
  G.audio.busted();
}
