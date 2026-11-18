// Solmar Bay — boot, the loop, the screens.
// Parses ?seed= and ?shot=, builds the renderer and the world, runs the
// frame loop, and wires keyboard and mouse: WASD to move, drag to orbit
// the camera, click to shoot, E to steal a car, M for jobs, P to pause.

import * as THREE from 'three';
import { CONFIG } from './config.js';
import { makeRng } from './random.js';
import { createWorld, updateWorld } from './world.js';
import { stageShot } from './shots.js';
import { shoot, reload } from './combat.js';
import { tryEnterCar } from './player.js';
import { startMission, nextMissionIndex } from './missions.js';
import { showMissions, hideMissions, missionsOpen } from './hud.js';
import { clearSave } from './save.js';

const params = new URLSearchParams(window.location.search);
const SEED = Number(params.get('seed')) || 7;
const SHOT = params.get('shot');

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('game').appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1200);
camera.position.set(0, 8, -60);

const G = {
  seed: SEED,
  rng: makeRng(SEED),
  scene,
  camera,
  renderer,
  mode: 'title',
  time: 0,
  camYaw: Math.PI,
  camPitch: 0.14,
  input: { keys: new Set(), lastDragAt: -999, dragging: false, downX: 0, downY: 0, moved: 0 },
  shot: SHOT,
  shotCamera: null,
  player: null,
  traffic: [],
  peds: [],
  gunmen: [],
  city: null,
  render: {},
  audio: null,
  hud: {},
  screens: {},
  missions: null,
  wanted: null,
  combat: null,
  autosaveAt: 0,
};

createWorld(G);

// ---- screens ----
const $ = (id) => document.getElementById(id);
function showOnly(id) {
  for (const name of ['title-screen', 'pause-screen', 'busted-screen', 'wasted-screen']) {
    const el = $(name);
    if (el) el.classList.toggle('show', name === id);
  }
}
G.screens = {
  showTitle() { showOnly('title-screen'); },
  showPause() { showOnly('pause-screen'); },
  showBusted(fine) {
    const el = $('busted-fine');
    if (el) el.textContent = fine > 0 ? `The SBPD took $${fine} as a fine.` : 'The SBPD let you off with a warning.';
    showOnly('busted-screen');
  },
  showWasted() { showOnly('wasted-screen'); },
  hideAll() { showOnly(null); },
};

function startGame() {
  G.screens.hideAll();
  G.mode = 'playing';
  G.audio.ensure();
  G.audio.startMusic();
  if (G.missions.current < 0 && G.missions.stage === 'idle') {
    const next = nextMissionIndex(G);
    if (next >= 0) startMission(G, next);
  }
}

function togglePause() {
  if (G.mode === 'playing') {
    G.mode = 'paused';
    G.screens.showPause();
  } else if (G.mode === 'paused') {
    G.mode = 'playing';
    G.screens.hideAll();
  }
}

function resumeFromBusted() {
  G.player.health = CONFIG.player.healthMax;
  G.player.x = G.city.spawn.x;
  G.player.z = G.city.spawn.z;
  G.player.heading = G.city.spawn.heading;
  if (G.player.car) { G.player.car = null; G.player.onFoot = true; }
  G.player.mesh.visible = true;
  G.player.mesh.position.set(G.player.x, 0, G.player.z);
  G.mode = 'playing';
  G.screens.hideAll();
}

$('start-btn').addEventListener('click', startGame);
$('newgame-btn').addEventListener('click', () => { clearSave(); window.location.reload(); });
$('resume-btn').addEventListener('click', togglePause);
$('restart-btn').addEventListener('click', () => window.location.reload());
$('busted-btn').addEventListener('click', resumeFromBusted);
$('wasted-btn').addEventListener('click', () => window.location.reload());

// ---- input ----
window.addEventListener('keydown', (ev) => {
  if (ev.code === 'Space') ev.preventDefault();
  G.input.keys.add(ev.code);
  G.audio.ensure();
  if (ev.repeat) return;
  if (G.mode === 'title' && (ev.code === 'Enter' || ev.code === 'Space')) { startGame(); return; }
  // Pause works from playing and from paused alike.
  if (ev.code === 'KeyP' || ev.code === 'Escape') { togglePause(); return; }
  if (G.mode !== 'playing') return;
  if (ev.code === 'KeyE') tryEnterCar(G);
  if (ev.code === 'KeyR') reload(G);
  if (ev.code === 'KeyH') G.audio.horn();
  if (ev.code === 'KeyM') {
    if (missionsOpen(G)) hideMissions(G);
    else showMissions(G);
  }
  if (ev.code === 'KeyN') G.audio.setMuted(!G.audio.muted);
});
window.addEventListener('keyup', (ev) => G.input.keys.delete(ev.code));

const canvas = renderer.domElement;
canvas.addEventListener('mousedown', (ev) => {
  G.input.dragging = true;
  G.input.downX = ev.clientX;
  G.input.downY = ev.clientY;
  G.input.moved = 0;
  G.audio.ensure();
});
window.addEventListener('mousemove', (ev) => {
  if (!G.input.dragging) return;
  const dx = ev.movementX || 0;
  const dy = ev.movementY || 0;
  G.input.moved += Math.abs(dx) + Math.abs(dy);
  G.camYaw -= dx * 0.005;
  G.camPitch = Math.max(-0.15, Math.min(0.55, G.camPitch + dy * 0.003));
  G.input.lastDragAt = G.time;
});
window.addEventListener('mouseup', () => {
  if (G.input.dragging && G.input.moved < 6 && G.mode === 'playing') shoot(G);
  G.input.dragging = false;
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---- go ----
if (SHOT) {
  stageShot(G, SHOT);
  G.screens.hideAll();
  G.audio.ensure();
} else {
  G.screens.showTitle();
}

// ---- the loop ----
const clock = new THREE.Clock();
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);
  updateWorld(G, dt);
  renderer.render(scene, camera);
}
loop();

// A handle for playtests and the curious.
window.__solmar = G;
