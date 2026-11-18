// Solmar Bay — Rico Santana.
// On foot: WASD relative to the camera, Shift to sprint, click to shoot.
// Behind the wheel: arcade driving with a handbrake, and E to yank a
// driver out of any car on the street — the law notices that.

import * as THREE from 'three';
import { CONFIG } from './config.js';
import { collideCircle, isOnRoad } from './city.js';
import { nearestCar } from './vehicles.js';
import { addHeat } from './wanted.js';

function makeRicoMesh() {
  const g = new THREE.Group();
  const jacket = new THREE.MeshLambertMaterial({ color: 0x8a2a22 });
  const jeans = new THREE.MeshLambertMaterial({ color: 0x2c3a4a });
  const skin = new THREE.MeshLambertMaterial({ color: 0xc89068 });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.78, 0.36), jacket);
  torso.position.y = 1.05;
  torso.castShadow = true;
  g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 10, 8), skin);
  head.position.y = 1.64;
  head.castShadow = true;
  g.add(head);
  for (const sx of [-0.17, 0.17]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.68, 0.27), jeans);
    leg.position.set(sx, 0.34, 0);
    leg.castShadow = true;
    g.add(leg);
  }
  const gun = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.1, 0.5),
    new THREE.MeshLambertMaterial({ color: 0x111111 }),
  );
  gun.position.set(0.32, 1.1, 0.3);
  g.add(gun);
  return g;
}

export function createPlayer(G) {
  const mesh = makeRicoMesh();
  G.scene.add(mesh);
  G.player = {
    mesh,
    x: G.city.spawn.x,
    z: G.city.spawn.z,
    heading: G.city.spawn.heading,
    speed: 0,
    onFoot: true,
    car: null,
    health: CONFIG.player.healthMax,
    cash: CONFIG.player.startCash,
    ammo: CONFIG.player.magSize,
    walkPhase: 0,
  };
  mesh.position.set(G.player.x, 0, G.player.z);
  mesh.rotation.y = G.player.heading;
}

export function updatePlayer(G, dt) {
  const p = G.player;
  const keys = G.input.keys;
  if (p.onFoot) {
    // Move relative to where the camera looks.
    const yaw = G.camYaw;
    let fx = 0;
    let fz = 0;
    if (keys.has('KeyW')) { fx += Math.sin(yaw); fz += Math.cos(yaw); }
    if (keys.has('KeyS')) { fx -= Math.sin(yaw); fz -= Math.cos(yaw); }
    if (keys.has('KeyA')) { fx -= Math.cos(yaw); fz += Math.sin(yaw); }
    if (keys.has('KeyD')) { fx += Math.cos(yaw); fz -= Math.sin(yaw); }
    const len = Math.hypot(fx, fz);
    if (len > 0) {
      const sprint = keys.has('ShiftLeft') || keys.has('ShiftRight');
      const speed = sprint ? CONFIG.player.sprintSpeed : CONFIG.player.walkSpeed;
      p.x += (fx / len) * speed * dt;
      p.z += (fz / len) * speed * dt;
      p.heading = Math.atan2(fx, fz);
      p.walkPhase += dt * (sprint ? 11 : 7);
    }
    const fixed = collideCircle(G, p.x, p.z, 0.6);
    p.x = Math.max(-232, Math.min(232, fixed.x));
    p.z = Math.max(-232, Math.min(245, fixed.z));
    p.mesh.visible = true;
    p.mesh.position.set(p.x, Math.abs(Math.sin(p.walkPhase)) * 0.06, p.z);
    p.mesh.rotation.y = p.heading;
  } else if (p.car) {
    const car = p.car;
    const cfg = CONFIG.player;
    if (keys.has('KeyW')) car.speed += cfg.driveAccel * dt;
    if (keys.has('KeyS')) car.speed -= cfg.driveBrake * dt;
    const handbrake = keys.has('Space');
    const turnRate = handbrake ? cfg.handbrakeTurn : cfg.turnRate;
    const steer = (keys.has('KeyA') ? 1 : 0) - (keys.has('KeyD') ? 1 : 0);
    const moving = Math.abs(car.speed) > 0.5;
    if (moving) {
      const dir = car.speed >= 0 ? 1 : -1;
      car.heading += steer * turnRate * dt * dir * Math.min(1, Math.abs(car.speed) / 8);
    }
    if (handbrake) car.speed *= Math.max(0, 1 - dt * 1.8);
    else if (!keys.has('KeyW') && !keys.has('KeyS')) car.speed *= Math.max(0, 1 - dt * 0.7);
    // Off the road the car drags on grass and sand.
    if (!isOnRoad(G, car.x, car.z)) car.speed *= Math.max(0, 1 - dt * 0.5);
    car.speed = Math.max(-cfg.reverseTop, Math.min(cfg.driveTop, car.speed));
    const nx = car.x + Math.sin(car.heading) * car.speed * dt;
    const nz = car.z + Math.cos(car.heading) * car.speed * dt;
    const fixed = collideCircle(G, nx, nz, 2.1);
    if (fixed.hit) car.speed *= 0.45;
    car.x = Math.max(-232, Math.min(232, fixed.x));
    car.z = Math.max(-232, Math.min(245, fixed.z));
    p.x = car.x;
    p.z = car.z;
    p.heading = car.heading;
    p.speed = car.speed;
    car.mesh.position.set(car.x, 0, car.z);
    car.mesh.rotation.y = car.heading;
    const spin = (car.speed * dt) / 0.36;
    for (const w of car.wheels) w.rotation.x += spin;
    p.mesh.visible = false;
  }
}

// E: step out of the car, or climb into the nearest one. Taking a car
// that is not yours is a crime, and the law notices.
export function tryEnterCar(G) {
  const p = G.player;
  if (!p.onFoot) {
    exitCar(G);
    return;
  }
  const car = nearestCar(G, p.x, p.z, CONFIG.player.enterRadius);
  if (!car) return;
  if (car.kind === 'traffic') {
    const i = G.traffic.indexOf(car);
    if (i >= 0) G.traffic.splice(i, 1);
    car.kind = 'player';
    addHeat(G, 1);
    G.hud.toast('You stole the car! The cops noticed.');
    G.audio.steal();
  } else if (car.kind === 'police') {
    car.kind = 'player';
    const i = G.wanted.police.indexOf(car);
    if (i >= 0) G.wanted.police.splice(i, 1);
    addHeat(G, 1);
    G.hud.toast('You stole a police cruiser!');
    G.audio.steal();
  }
  p.car = car;
  p.onFoot = false;
  p.speed = 0;
  car.speed = 0;
  p.x = car.x;
  p.z = car.z;
  p.heading = car.heading;
  G.audio.engine(true);
}

export function exitCar(G) {
  const p = G.player;
  if (!p.car) return;
  const car = p.car;
  p.onFoot = true;
  p.car = null;
  p.speed = 0;
  // Step out on the driver's side.
  p.x = car.x + Math.cos(car.heading) * 2.4;
  p.z = car.z - Math.sin(car.heading) * 2.4;
  const fixed = collideCircle(G, p.x, p.z, 0.6);
  p.x = fixed.x;
  p.z = fixed.z;
  p.heading = car.heading;
  G.audio.engine(false);
}
