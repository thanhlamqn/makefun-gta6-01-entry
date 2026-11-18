// Solmar Bay — the living city.
// createWorld builds every system into one game context; updateWorld
// steps them together, in an order that keeps the city consistent:
// Rico moves, traffic and police answer, people react, missions and the
// wanted level settle, then the camera, the sky and the HUD catch up.

import { buildCity } from './city.js';
import { spawnTraffic, updateTraffic } from './vehicles.js';
import { spawnPedestrians, updatePedestrians, updateGunmen } from './people.js';
import { createPlayer, updatePlayer } from './player.js';
import { updateCombat } from './combat.js';
import { initMissions, updateMissions } from './missions.js';
import { initWanted, updateWanted } from './wanted.js';
import { setupEnvironment, updateCamera, updateEnvironment } from './render.js';
import { initHud, updateHud } from './hud.js';
import { createAudio } from './audio.js';
import { loadGame, applySave, saveGame } from './save.js';

export function createWorld(G) {
  buildCity(G);
  spawnTraffic(G);
  spawnPedestrians(G);
  createPlayer(G);
  initMissions(G);
  initWanted(G);
  setupEnvironment(G);
  createAudio(G);
  initHud(G);
  G.combat = {
    tracers: [],
    sparks: [],
    reloading: false,
    reloadAt: 0,
    lastShotAt: -999,
    lastShotX: 0,
    lastShotZ: 0,
    lastHurtAt: -999,
  };
  G.gunmen = [];
  const saved = loadGame();
  if (saved) applySave(G, saved);
  G.player.mesh.position.set(G.player.x, 0, G.player.z);
  G.autosaveAt = 0;
}

export function updateWorld(G, dt) {
  G.time += dt;
  if (G.mode !== 'playing') {
    // The city idles behind the title and pause screens.
    updateTraffic(G, dt);
    updatePedestrians(G, dt);
    updateCamera(G, dt);
    updateEnvironment(G, dt);
    return;
  }
  updatePlayer(G, dt);
  updateTraffic(G, dt);
  updateWanted(G, dt);
  updatePedestrians(G, dt);
  updateGunmen(G, dt);
  updateCombat(G, dt);
  updateMissions(G, dt);
  updateCamera(G, dt);
  updateEnvironment(G, dt);
  updateHud(G);
  G.audio.update(dt);
  if (G.player.car) {
    const s = Math.min(1, Math.abs(G.player.car.speed) / 34);
    G.audio.setEngineSpeed(s);
  }
  // Autosave every 20 seconds of play.
  G.autosaveAt += dt;
  if (G.autosaveAt > 20) {
    G.autosaveAt = 0;
    saveGame(G);
  }
}
