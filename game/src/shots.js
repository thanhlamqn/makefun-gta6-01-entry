// Solmar Bay — staged screenshot scenes.
// ?shot=chase|street|mission|sunset&seed=7 poses the living game for its
// four screenshots: a police chase, Rico on foot in traffic, the warehouse
// shootout with its beacon, and a sunset drive along the beach. The game
// keeps simulating behind each pose, so every shot is a real render.

import * as THREE from 'three';
import { setWanted } from './wanted.js';
import { startMission } from './missions.js';
import { setSunset } from './render.js';
import { spawnPoliceCar } from './vehicles.js';

function putPlayerInCar(G, x, z, heading) {
  const car = G.traffic[0];
  if (!car) return null;
  G.traffic.splice(0, 1);
  car.kind = 'player';
  car.x = x;
  car.z = z;
  car.heading = heading;
  car.speed = 18;
  car.mesh.position.set(x, 0, z);
  car.mesh.rotation.y = heading;
  G.player.car = car;
  G.player.onFoot = false;
  G.player.x = x;
  G.player.z = z;
  G.player.heading = heading;
  return car;
}

function stageChase(G) {
  const car = putPlayerInCar(G, 0, -60, 0);
  if (!car) return;
  setWanted(G, 3);
  // Two cruisers right on Rico's tail, closing slowly.
  const c1 = spawnPoliceCar(G, -5, -72);
  c1.heading = 0;
  c1.speed = 20;
  const c2 = spawnPoliceCar(G, 6, -78);
  c2.heading = 0;
  c2.speed = 19;
  // Keep the throttle down so the chase stays a chase.
  G.input.keys.add('KeyW');
  // Camera ahead-right of the car, looking back up the road: Rico's car
  // in front with both cruisers closing behind it.
  G.shotCamera = {
    off: new THREE.Vector3(14, 5, 12),
    look: new THREE.Vector3(-4, 1, -10),
  };
  G.camYaw = 0;
}

function stageStreet(G) {
  // Rico on the sidewalk, a car rolling past him down the avenue.
  G.player.x = 8.5;
  G.player.z = 24;
  G.player.heading = Math.PI;
  G.player.onFoot = true;
  let near = null;
  let nearD = Infinity;
  for (const car of G.traffic) {
    const d = Math.hypot(car.x - G.player.x, car.z - G.player.z);
    if (d < nearD) { nearD = d; near = car; }
  }
  if (near) {
    near.axis = 'z';
    near.road = 0;
    near.lane = -2.6;
    near.dir = 1;
    near.x = -2.6;
    near.z = -6;
    near.heading = 0;
    near.speed = 10;
    near.cruise = 10;
  }
  G.shotCamera = {
    off: new THREE.Vector3(2, 4, 10),
    look: new THREE.Vector3(0, 1.5, -8),
  };
  G.camYaw = Math.PI;
}

function stageMission(G) {
  startMission(G, 3);
  const wh = G.city.landmarks.warehouse;
  G.player.x = wh.x + 22;
  G.player.z = wh.z - 18;
  G.player.heading = Math.atan2(wh.x - G.player.x, wh.z - G.player.z);
  G.player.onFoot = true;
  // The gunmen hold the warehouse's near face, in plain sight of Rico.
  G.gunmen.forEach((gm, i) => {
    gm.x = wh.x + 15 + (i % 2) * 5;
    gm.z = wh.z - 12 + Math.floor(i / 2) * 7;
    gm.mesh.position.set(gm.x, 0, gm.z);
  });
  G.shotCamera = {
    off: new THREE.Vector3(10, 5, -10),
    look: new THREE.Vector3(-22, 2, 18),
  };
  G.camYaw = G.player.heading;
}

function stageSunset(G) {
  setSunset(G, true);
  const car = putPlayerInCar(G, -40, 180, Math.PI / 2);
  if (!car) return;
  // Cruise east along the beach road, sunset over the sea to the west.
  G.input.keys.add('KeyW');
  G.shotCamera = {
    off: new THREE.Vector3(16, 4.5, -10),
    look: new THREE.Vector3(-30, 1, 8),
  };
  G.camYaw = Math.PI / 2;
}

export function stageShot(G, name) {
  if (name === 'chase') stageChase(G);
  else if (name === 'street') stageStreet(G);
  else if (name === 'mission') stageMission(G);
  else if (name === 'sunset') stageSunset(G);
  G.mode = 'playing';
}
