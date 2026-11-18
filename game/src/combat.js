// Solmar Bay — combat.
// Rico's pistol: a ray from the camera, a tracer, a muzzle spark and
// damage. Civilians go down and the law notices; gunmen and officers
// take three hits. Health comes back once the shooting stops.

import * as THREE from 'three';
import { CONFIG } from './config.js';
import { addHeat } from './wanted.js';

const raycaster = new THREE.Raycaster();

function findEntity(obj) {
  let o = obj;
  while (o) {
    if (o.userData && o.userData.entity) return o.userData.entity;
    o = o.parent;
  }
  return null;
}

export function shoot(G) {
  const p = G.player;
  if (G.mode !== 'playing' || !p.onFoot) return;
  if (G.combat.reloading) return;
  if (p.ammo <= 0) {
    G.audio.emptyClick();
    reload(G);
    return;
  }
  p.ammo -= 1;
  G.combat.lastShotAt = G.time;
  G.combat.lastShotX = p.x;
  G.combat.lastShotZ = p.z;
  G.audio.shot(false);

  const origin = new THREE.Vector3(p.x, 1.5, p.z);
  const dir = new THREE.Vector3();
  G.camera.getWorldDirection(dir);
  raycaster.set(origin, dir);
  raycaster.far = 90;
  const targets = [];
  for (const ped of G.peds) if (ped.state !== 'down') targets.push(ped.mesh);
  for (const gm of G.gunmen) if (gm.state !== 'down') targets.push(gm.mesh);
  for (const off of G.wanted.officers) if (off.state !== 'down') targets.push(off.mesh);
  const hits = raycaster.intersectObjects(targets, true);
  let end = origin.clone().addScaledVector(dir, 60);
  if (hits.length > 0) {
    const hit = hits[0];
    end = hit.point.clone();
    const entity = findEntity(hit.object);
    if (entity) hitEntity(G, entity);
    spawnSpark(G, end);
  }
  spawnTracer(G, origin, end);
}

function hitEntity(G, entity) {
  if (entity.state === 'down') return;
  if (entity.kind === 'ped') {
    entity.state = 'down';
    entity.mesh.rotation.x = -Math.PI / 2;
    entity.mesh.position.y = 0.3;
    addHeat(G, 1);
    G.hud.toast('You shot a civilian! Wanted level up.');
  } else if (entity.kind === 'gunman') {
    entity.hp -= CONFIG.combat.pistolDamage;
    if (entity.hp <= 0) {
      entity.state = 'down';
      entity.downAt = G.time;
      entity.mesh.rotation.x = -Math.PI / 2;
      entity.mesh.position.y = 0.3;
      G.missions.gunmenDown = (G.missions.gunmenDown || 0) + 1;
    }
  } else if (entity.kind === 'officer') {
    entity.hp -= CONFIG.combat.pistolDamage;
    if (entity.hp <= 0) {
      entity.state = 'down';
      entity.downAt = G.time;
      entity.mesh.rotation.x = -Math.PI / 2;
      entity.mesh.position.y = 0.3;
      addHeat(G, 1);
    }
  }
}

function spawnTracer(G, from, to) {
  const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
  const mat = new THREE.LineBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.95 });
  const line = new THREE.Line(geo, mat);
  G.scene.add(line);
  G.combat.tracers.push({ line, life: 0.09 });
}

function spawnSpark(G, at) {
  const spark = new THREE.Mesh(
    new THREE.TetrahedronGeometry(0.22),
    new THREE.MeshBasicMaterial({ color: 0xffd23e }),
  );
  spark.position.copy(at);
  G.scene.add(spark);
  G.combat.sparks.push({ mesh: spark, life: 0.12 });
}

export function reload(G) {
  const p = G.player;
  if (G.combat.reloading || p.ammo === CONFIG.player.magSize) return;
  G.combat.reloading = true;
  G.combat.reloadAt = G.time + 1.1;
  G.audio.reload();
}

export function updateCombat(G, dt) {
  for (let i = G.combat.tracers.length - 1; i >= 0; i--) {
    const t = G.combat.tracers[i];
    t.life -= dt;
    t.line.material.opacity = Math.max(0, t.life / 0.09) * 0.95;
    if (t.life <= 0) {
      G.scene.remove(t.line);
      t.line.geometry.dispose();
      t.line.material.dispose();
      G.combat.tracers.splice(i, 1);
    }
  }
  for (let i = G.combat.sparks.length - 1; i >= 0; i--) {
    const s = G.combat.sparks[i];
    s.life -= dt;
    s.mesh.scale.setScalar(Math.max(0.01, s.life / 0.12));
    if (s.life <= 0) {
      G.scene.remove(s.mesh);
      s.mesh.geometry.dispose();
      s.mesh.material.dispose();
      G.combat.sparks.splice(i, 1);
    }
  }
  if (G.combat.reloading && G.time >= G.combat.reloadAt) {
    G.combat.reloading = false;
    G.player.ammo = CONFIG.player.magSize;
  }
  // Health comes back once the shooting stops.
  const p = G.player;
  if (p.health > 0 && p.health < CONFIG.player.healthMax && G.time - G.combat.lastHurtAt > CONFIG.combat.regenAfter) {
    p.health = Math.min(CONFIG.player.healthMax, p.health + CONFIG.combat.regenRate * dt);
  }
}
