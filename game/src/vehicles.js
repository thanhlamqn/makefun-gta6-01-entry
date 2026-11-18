// Solmar Bay — cars.
// Every car is one mesh built from boxes: body, cabin, four spinning
// wheels, headlights and taillights. Traffic drives the grid, turns at
// intersections and brakes for the car ahead; police cars hunt Rico.

import * as THREE from 'three';
import { CONFIG } from './config.js';
import { collideCircle, nearestRoadPoint } from './city.js';

const W = CONFIG.world;

export function makeCarMesh(color, opts = {}) {
  const g = new THREE.Group();
  const paint = new THREE.MeshLambertMaterial({ color });
  const glass = new THREE.MeshLambertMaterial({ color: 0x1c2733 });
  const tyre = new THREE.MeshLambertMaterial({ color: 0x141414 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.62, 4.3), paint);
  body.position.y = 0.55;
  body.castShadow = true;
  g.add(body);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.58, 2.1), glass);
  cabin.position.set(0, 1.1, -0.25);
  cabin.castShadow = true;
  g.add(cabin);

  const wheels = [];
  for (const [wx, wz] of [[-0.95, 1.4], [0.95, 1.4], [-0.95, -1.4], [0.95, -1.4]]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.28, 10), tyre);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(wx, 0.36, wz);
    wheel.castShadow = true;
    g.add(wheel);
    wheels.push(wheel);
  }

  const lightMat = new THREE.MeshLambertMaterial({ color: 0xfff2c8, emissive: 0xfff2c8, emissiveIntensity: 0.6 });
  for (const sx of [-0.6, 0.6]) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.08), lightMat);
    lamp.position.set(sx, 0.62, 2.16);
    g.add(lamp);
  }
  const tailMat = new THREE.MeshLambertMaterial({ color: 0xc02020, emissive: 0xc02020, emissiveIntensity: 0.5 });
  for (const sx of [-0.6, 0.6]) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.08), tailMat);
    lamp.position.set(sx, 0.62, -2.16);
    g.add(lamp);
  }

  if (opts.police) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.18, 0.4),
      new THREE.MeshLambertMaterial({ color: 0x2244cc, emissive: 0x2244cc, emissiveIntensity: 0.9 }));
    bar.position.set(0, 1.48, -0.25);
    g.add(bar);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.2, 4.32),
      new THREE.MeshLambertMaterial({ color: 0xf0f0f0 }));
    stripe.position.y = 0.62;
    g.add(stripe);
  }
  if (opts.taxi) {
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.22, 0.4),
      new THREE.MeshLambertMaterial({ color: 0xffe9a8, emissive: 0xffe9a8, emissiveIntensity: 0.7 }));
    sign.position.set(0, 1.48, -0.25);
    g.add(sign);
  }

  g.userData.wheels = wheels;
  return g;
}

function placeOnRoad(G, car) {
  const p = nearestRoadPoint(G, car.x, car.z);
  car.x = p.x;
  car.z = p.z;
}

export function spawnTraffic(G) {
  const rng = G.rng;
  G.traffic = [];
  for (let i = 0; i < CONFIG.traffic.count; i++) {
    const vertical = rng.chance(0.5);
    const road = rng.pick(G.city.roads);
    const t = rng.range(-190, 190);
    const dir = rng.sign();
    const lane = rng.chance(0.5) ? 2.6 : -2.6;
    const taxi = rng.chance(0.14);
    const color = taxi ? CONFIG.colors.taxiPaint : rng.pick(CONFIG.colors.carPaint);
    const mesh = makeCarMesh(color, { taxi });
    G.scene.add(mesh);
    const car = {
      mesh,
      kind: 'traffic',
      x: vertical ? road + lane : t,
      z: vertical ? t : road + lane,
      heading: vertical ? (dir > 0 ? 0 : Math.PI) : (dir > 0 ? Math.PI / 2 : -Math.PI / 2),
      speed: rng.range(CONFIG.traffic.speedMin, CONFIG.traffic.speedMax),
      cruise: rng.range(CONFIG.traffic.speedMin, CONFIG.traffic.speedMax),
      axis: vertical ? 'z' : 'x',
      dir,
      lane,
      road,
      wheels: mesh.userData.wheels,
    };
    G.traffic.push(car);
  }
}

function carAhead(G, car) {
  let nearest = null;
  let nearestD = Infinity;
  for (const other of G.traffic) {
    if (other === car || other.axis !== car.axis || other.dir !== car.dir) continue;
    if (Math.abs(other.road - car.road) > 1) continue;
    const along = car.axis === 'z' ? (other.z - car.z) * car.dir : (other.x - car.x) * car.dir;
    if (along > 0 && along < nearestD) {
      nearestD = along;
      nearest = other;
    }
  }
  return { car: nearest, dist: nearestD };
}

export function updateTraffic(G, dt) {
  const rng = G.rng;
  for (const car of G.traffic) {
    // Brake for the car ahead, then ease back up to cruising speed.
    const ahead = carAhead(G, car);
    let target = car.cruise;
    if (ahead.car && ahead.dist < CONFIG.traffic.brakeGap) {
      target = Math.min(target, ahead.car.speed * 0.85);
    }
    car.speed += (target - car.speed) * Math.min(1, dt * 1.6);

    const step = car.speed * dt;
    if (car.axis === 'z') car.z += step * car.dir;
    else car.x += step * car.dir;

    // At the edge of town, turn around; at an intersection, sometimes
    // turn onto the crossing road instead of going straight.
    const along = car.axis === 'z' ? car.z : car.x;
    if (Math.abs(along) > 198) {
      car.dir *= -1;
      car.heading += Math.PI;
    } else if (rng.chance(dt * 0.06)) {
      // Only turn where a crossing road actually meets this one.
      const along = car.axis === 'z' ? car.z : car.x;
      const snapped = Math.round(along / 60) * 60;
      if (Math.abs(snapped - along) < 4) {
        car.axis = car.axis === 'z' ? 'x' : 'z';
        car.road = snapped;
        car.dir = rng.sign();
        car.lane = rng.chance(0.5) ? 2.6 : -2.6;
        if (car.axis === 'z') { car.x = snapped + car.lane; }
        else { car.z = snapped + car.lane; }
        car.heading = car.axis === 'z'
          ? (car.dir > 0 ? 0 : Math.PI)
          : (car.dir > 0 ? Math.PI / 2 : -Math.PI / 2);
      }
    }

    car.mesh.position.set(car.x, 0, car.z);
    car.mesh.rotation.y = car.heading;
    const spin = (car.speed * dt) / 0.36;
    for (const w of car.wheels) w.rotation.x += spin;
  }
}

export function spawnPoliceCar(G, x, z) {
  const mesh = makeCarMesh(CONFIG.colors.policePaint, { police: true });
  G.scene.add(mesh);
  const p = nearestRoadPoint(G, x, z);
  const car = {
    mesh,
    kind: 'police',
    x: p.x,
    z: p.z,
    heading: 0,
    speed: 0,
    targetSpeed: CONFIG.police.chaseSpeed,
    wheels: mesh.userData.wheels,
    sirenPhase: G.rng.range(0, 1),
  };
  G.wanted.police.push(car);
  return car;
}

export function updatePolice(G, dt) {
  const p = G.player;
  for (const car of G.wanted.police) {
    const dx = p.x - car.x;
    const dz = p.z - car.z;
    const dist = Math.hypot(dx, dz) || 0.001;
    const want = Math.atan2(dx, dz);
    let diff = want - car.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const turn = Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
    car.heading += turn;
    // Ease off when close, so the cruiser does not ram through Rico.
    const target = dist < 9 ? car.targetSpeed * 0.35 : car.targetSpeed;
    car.speed += (target - car.speed) * Math.min(1, dt * 1.2);
    const nx = car.x + Math.sin(car.heading) * car.speed * dt;
    const nz = car.z + Math.cos(car.heading) * car.speed * dt;
    const fixed = collideCircle(G, nx, nz, 2.2);
    if (fixed.hit) car.speed *= 0.5;
    car.x = Math.max(-232, Math.min(232, fixed.x));
    car.z = Math.max(-232, Math.min(232, fixed.z));
    car.mesh.position.set(car.x, 0, car.z);
    car.mesh.rotation.y = car.heading;
    const spin = (car.speed * dt) / 0.36;
    for (const w of car.wheels) w.rotation.x += spin;
  }
}

export function removeCar(G, car) {
  G.scene.remove(car.mesh);
  const list = car.kind === 'police' ? G.wanted.police : G.traffic;
  const i = list.indexOf(car);
  if (i >= 0) list.splice(i, 1);
}

// Closest car of any kind within maxDist of a point, for E to enter.
export function nearestCar(G, x, z, maxDist) {
  let best = null;
  let bestD = maxDist;
  const all = G.traffic.concat(G.wanted.police);
  if (G.player.car) all.push(G.player.car);
  for (const car of all) {
    const d = Math.hypot(car.x - x, car.z - z);
    if (d < bestD) { bestD = d; best = car; }
  }
  return best;
}

export { placeOnRoad };
