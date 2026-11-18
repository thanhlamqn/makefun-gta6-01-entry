// Solmar Bay — missions and the story.
// Six jobs for the fixer Delgado, in order, plus a repeatable courier run
// once the story is done. Each job is a small state machine: ride to the
// marker, do the thing, get paid. The HUD shows the objective and the
// distance; the beacon in the sky shows where to go.

import { CONFIG, MISSIONS, COURIER } from './config.js';
import { spawnGunmen, clearGunmen } from './people.js';
import { addHeat, setWanted } from './wanted.js';
import { saveGame } from './save.js';

export function initMissions(G) {
  G.missions = {
    current: -1,
    stage: 'idle',
    done: [false, false, false, false, false, false],
    target: null,
    timer: 0,
    holdTimer: 0,
    gunmenDown: 0,
    courier: null,
  };
}

function landmark(G, name) {
  return G.city.landmarks[name] || null;
}

export function startMission(G, index) {
  const def = MISSIONS[index];
  if (!def) return;
  clearGunmen(G);
  G.missions.current = index;
  G.missions.stage = 'go';
  G.missions.timer = def.timeLimit || 0;
  G.missions.holdTimer = 0;
  G.missions.gunmenDown = 0;
  G.missions.courier = null;
  const target = def.target ? landmark(G, def.target) : null;
  G.missions.target = target ? { x: target.x, z: target.z, label: def.name } : null;
  if (def.id === 'tail') {
    addHeat(G, 2);
    G.hud.toast('The cops are onto you — lose them!');
  }
  if (def.id === 'warehouse' && target) {
    spawnGunmen(G, target.x, target.z, def.gunmen);
  }
  G.hud.toast(`Job ${index + 1}: ${def.name} — ${def.brief}`);
  G.audio.missionStart();
}

export function startCourier(G) {
  clearGunmen(G);
  const spots = ['bank', 'pier', 'warehouse', 'plaza'];
  const dest = G.rng.pick(spots);
  const target = landmark(G, dest);
  G.missions.current = -1;
  G.missions.stage = 'courier';
  G.missions.courier = { dest, reward: COURIER.reward };
  G.missions.target = { x: target.x, z: target.z, label: 'Courier drop-off' };
  G.hud.toast('Courier run: pick up at the bar, drop off at the ' + dest + '.');
}

export function missionTargetPos(G) {
  return G.missions.target;
}

export function missionObjective(G) {
  const m = G.missions;
  if (m.stage === 'idle') {
    const next = nextMissionIndex(G);
    if (next >= 0) return `Next job: ${MISSIONS[next].name} — press M`;
    return 'All jobs done — courier runs pay $150. Press M.';
  }
  if (m.stage === 'courier') return `Courier: deliver to the ${m.courier.dest} — $${m.courier.reward}`;
  const def = MISSIONS[m.current];
  if (!def) return '';
  if (m.stage === 'hold') return `${def.name}: hold the vault — ${Math.ceil(m.holdTimer)}s`;
  if (m.stage === 'escape') return `${def.name}: lose the heat, reach the safehouse`;
  if (def.id === 'tail') return `${def.name}: lose every wanted star`;
  if (def.id === 'warehouse') return `${def.name}: gunmen left — ${def.gunmen - m.gunmenDown}`;
  return `${def.name}: ${def.brief}`;
}

export function nextMissionIndex(G) {
  for (let i = 0; i < MISSIONS.length; i++) {
    if (!G.missions.done[i]) return i;
  }
  return -1;
}

function completeMission(G) {
  const def = MISSIONS[G.missions.current];
  if (!def) return;
  G.player.cash += def.reward;
  G.missions.done[G.missions.current] = true;
  G.hud.toast(`Job done: ${def.name} — +$${def.reward}`);
  G.audio.missionDone();
  saveGame(G);
  G.missions.current = -1;
  G.missions.stage = 'idle';
  G.missions.target = null;
  clearGunmen(G);
  const next = nextMissionIndex(G);
  if (next >= 0) {
    setTimeout(() => {
      if (G.mode === 'playing') startMission(G, next);
    }, 4000);
  } else {
    G.hud.toast('Story complete! Courier runs are open — press M.');
  }
}

function failMission(G, why) {
  const def = MISSIONS[G.missions.current];
  G.hud.toast(`Job failed: ${why}. Press M to retry.`);
  G.missions.current = -1;
  G.missions.stage = 'idle';
  G.missions.target = null;
  clearGunmen(G);
}

export function updateMissions(G, dt) {
  const m = G.missions;
  if (m.stage === 'idle' || m.current < 0 && m.stage !== 'courier') return;
  const p = G.player;
  const def = MISSIONS[m.current];

  // Timed jobs run out.
  if (m.timer > 0) {
    m.timer -= dt;
    if (m.timer <= 0) {
      failMission(G, 'out of time');
      return;
    }
  }

  if (m.stage === 'courier' && m.target) {
    if (Math.hypot(p.x - m.target.x, p.z - m.target.z) < 9) {
      G.player.cash += m.courier.reward;
      G.hud.toast(`Courier delivered — +$${m.courier.reward}`);
      G.audio.missionDone();
      saveGame(G);
      m.stage = 'idle';
      m.target = null;
      m.courier = null;
    }
    return;
  }
  if (!def) return;

  const dist = m.target ? Math.hypot(p.x - m.target.x, p.z - m.target.z) : 9999;

  if (def.id === 'tail') {
    if (G.wanted.level === 0) completeMission(G);
    return;
  }
  if (def.id === 'warehouse') {
    if (m.gunmenDown >= def.gunmen) completeMission(G);
    return;
  }
  if (def.id === 'heist') {
    if (m.stage === 'go' && dist < 10) {
      m.stage = 'hold';
      m.holdTimer = def.holdSeconds;
      G.hud.toast('Cracking the vault — hold position!');
    } else if (m.stage === 'hold') {
      if (dist > 14) {
        m.stage = 'go';
        m.holdTimer = def.holdSeconds;
        G.hud.toast('You left the vault — get back!');
      } else {
        m.holdTimer -= dt;
        if (m.holdTimer <= 0) {
          setWanted(G, 3);
          const safe = landmark(G, def.escapeTarget);
          m.stage = 'escape';
          m.target = { x: safe.x, z: safe.z, label: 'Safehouse' };
          G.hud.toast('Vault open! Lose the heat and reach the safehouse.');
        }
      }
    } else if (m.stage === 'escape' && dist < 9 && G.wanted.level === 0) {
      completeMission(G);
    }
    return;
  }
  // Simple go-there jobs: wheels, delivery, sprint.
  if (m.stage === 'go' && dist < 9) completeMission(G);
}

export { MISSIONS, COURIER };
