// Solmar Bay — save and load.
// One small JSON blob in localStorage: Rico's cash, which of Delgado's
// jobs are done, where he stands, and whether the music is muted.
// Autosave runs every few seconds while playing and on every job done.

const SAVE_KEY = 'solmar-bay-save-v1';

export function saveGame(G) {
  try {
    const data = {
      version: 1,
      cash: Math.round(G.player.cash),
      missionsDone: G.missions.done.slice(),
      missionIndex: G.missions.current,
      px: Math.round(G.player.x * 10) / 10,
      pz: Math.round(G.player.z * 10) / 10,
      heading: Math.round(G.player.heading * 100) / 100,
      muted: !!G.audio.muted,
      savedAt: Date.now(),
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch (err) {
    return false;
  }
}

export function loadGame() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.version !== 1) return null;
    return data;
  } catch (err) {
    return null;
  }
}

export function clearSave() {
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch (err) {
    // storage unavailable: the game just starts fresh
  }
}

export function applySave(G, data) {
  if (!data) return;
  G.player.cash = data.cash || 0;
  if (Array.isArray(data.missionsDone)) {
    G.missions.done = data.missionsDone.slice(0, 6);
    while (G.missions.done.length < 6) G.missions.done.push(false);
  }
  G.missions.current = typeof data.missionIndex === 'number' ? data.missionIndex : -1;
  if (typeof data.px === 'number' && typeof data.pz === 'number') {
    G.player.x = data.px;
    G.player.z = data.pz;
    G.player.heading = data.heading || 0;
  }
  if (data.muted) G.audio.setMuted(true);
}
