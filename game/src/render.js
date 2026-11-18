// Solmar Bay — light, sky and the camera.
// A low sun over a sun-soaked coast, drifting clouds, a chase camera that
// orbits on mouse drag and settles behind the car, and the golden beacon
// pillar that marks where the next job is.

import * as THREE from 'three';
import { CONFIG } from './config.js';
import { missionTargetPos } from './missions.js';

export function setupEnvironment(G) {
  const scene = G.scene;
  scene.background = new THREE.Color(CONFIG.colors.skyDay);
  scene.fog = new THREE.Fog(CONFIG.colors.fogDay, 140, 560);

  const hemi = new THREE.HemisphereLight(0xbfd9ff, 0x8a7a5a, 0.9);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff2d8, 2.4);
  sun.position.set(120, 180, 60);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -160;
  sun.shadow.camera.right = 160;
  sun.shadow.camera.top = 160;
  sun.shadow.camera.bottom = -160;
  sun.shadow.camera.far = 500;
  sun.shadow.bias = -0.0004;
  scene.add(sun);
  scene.add(sun.target);

  G.render = {
    sun,
    hemi,
    clouds: [],
    beacon: null,
    beaconRing: null,
    sunMode: 'day',
  };

  // Drifting clouds: clusters of flat white spheres.
  const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
  for (let i = 0; i < 9; i++) {
    const cloud = new THREE.Group();
    const puffs = 3 + Math.floor(G.rng.next() * 3);
    for (let j = 0; j < puffs; j++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(G.rng.range(4, 9), 8, 6), cloudMat);
      s.position.set(j * G.rng.range(4, 7) - puffs * 3, G.rng.range(-1, 1.5), G.rng.range(-3, 3));
      s.scale.y = 0.45;
      cloud.add(s);
    }
    cloud.position.set(G.rng.range(-260, 260), G.rng.range(70, 110), G.rng.range(-260, 260));
    scene.add(cloud);
    G.render.clouds.push(cloud);
  }

  // The mission beacon: a pillar of light plus a ring on the ground.
  const beacon = new THREE.Mesh(
    new THREE.CylinderGeometry(1.4, 1.4, 70, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffd23e, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }),
  );
  beacon.position.y = 35;
  beacon.visible = false;
  scene.add(beacon);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(2.2, 3.2, 24),
    new THREE.MeshBasicMaterial({ color: 0xffd23e, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.12;
  ring.visible = false;
  scene.add(ring);
  G.render.beacon = beacon;
  G.render.beaconRing = ring;
}

export function setSunset(G, on) {
  G.render.sunMode = on ? 'sunset' : 'day';
  if (on) {
    G.scene.background.set(CONFIG.colors.skySunset);
    G.scene.fog.color.set(CONFIG.colors.fogSunset);
    G.render.sun.position.set(-160, 42, 120);
    G.render.sun.intensity = 1.7;
    G.render.sun.color.set(0xffb070);
    G.render.hemi.intensity = 0.55;
  } else {
    G.scene.background.set(CONFIG.colors.skyDay);
    G.scene.fog.color.set(CONFIG.colors.fogDay);
    G.render.sun.position.set(120, 180, 60);
    G.render.sun.intensity = 2.4;
    G.render.sun.color.set(0xfff2d8);
    G.render.hemi.intensity = 0.9;
  }
}

function lerpAngle(a, b, t) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

export function updateCamera(G, dt) {
  const p = G.player;
  const cam = G.camera;
  if (G.shotCamera) {
    // Staged shots keep a fixed offset from Rico, so the composition holds
    // while the city keeps simulating behind it.
    cam.position.set(
      p.x + G.shotCamera.off.x,
      G.shotCamera.off.y,
      p.z + G.shotCamera.off.z,
    );
    cam.lookAt(
      p.x + G.shotCamera.look.x,
      G.shotCamera.look.y,
      p.z + G.shotCamera.look.z,
    );
    return;
  }
  // The camera settles behind the car once the mouse has been still.
  if (!p.onFoot && G.time - G.input.lastDragAt > 2.5) {
    G.camYaw = lerpAngle(G.camYaw, p.heading, Math.min(1, dt * 1.1));
  }
  const dist = p.onFoot ? 7.5 : 11;
  const height = p.onFoot ? 3.2 : 4.4;
  const fx = Math.sin(G.camYaw);
  const fz = Math.cos(G.camYaw);
  const want = new THREE.Vector3(
    p.x - fx * dist,
    height + Math.sin(G.camPitch) * 4,
    p.z - fz * dist,
  );
  cam.position.lerp(want, Math.min(1, dt * 6));
  cam.lookAt(p.x + fx * 4, 1.6, p.z + fz * 4);
}

export function updateEnvironment(G, dt) {
  for (const cloud of G.render.clouds) {
    cloud.position.x += dt * 1.5;
    if (cloud.position.x > 300) cloud.position.x = -300;
  }
  const target = missionTargetPos(G);
  const beacon = G.render.beacon;
  const ring = G.render.beaconRing;
  if (target && G.mode === 'playing') {
    beacon.visible = true;
    ring.visible = true;
    beacon.position.x = target.x;
    beacon.position.z = target.z;
    ring.position.x = target.x;
    ring.position.z = target.z;
    const pulse = 1 + Math.sin(G.time * 3) * 0.12;
    ring.scale.setScalar(pulse);
    beacon.material.opacity = 0.18 + Math.sin(G.time * 3) * 0.06;
  } else {
    beacon.visible = false;
    ring.visible = false;
  }
}
