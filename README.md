# Solmar Bay — make.fun gta6-01

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Solmar Bay is an original open-world crime game, built for make.fun's "Make GTA 6"
bounty. You are Rico Santana, a wheelman back in the sun-soaked coastal city of
Solmar Bay. Steal cars, outrun the Solmar Bay PD, work six story missions for the
fixer Delgado — from your first stolen car to the big score at the Solmar Bay Bank —
and keep the city yours in free roam afterwards.

## The game

- **A city on foot and by car**: a 7×7 road grid with a plaza, a beach and the sea,
  procedural buildings, palms, streetlights and traffic
- **Traffic and pedestrians**: 22 cars driving the grid, turning at intersections
  and braking for the car ahead; 36 pedestrians strolling the sidewalks who run
  when shots ring out
- **Steal and drive**: any car is yours — yank a driver out and the law notices,
  or take a parked car quietly. Arcade handling with a handbrake
- **Wanted system and police**: 1–5 stars for crimes; cruisers hunt you down the
  roads and officers step out to make the arrest. Lay low and the heat dies down
- **Missions and a story**: six jobs for Delgado (steal, deliver, lose the tail,
  a warehouse shootout, a cross-town sprint, the bank heist) plus a repeatable
  courier run, with a mission beacon, objective text and distance on the HUD
- **Combat**: a pistol with tracers and muzzle sparks, Halcones gunmen who close
  in, strafe and shoot back, and health that comes back when the shooting stops
- **HUD with a minimap**: wanted stars, cash, health, ammo, speed, and a live
  top-down map with the player, the cops, traffic and the mission marker
- **Start and save**: title screen, pause, busted/wasted, and a save in
  localStorage (money, jobs done, where Rico stands) with autosave
- **Sound**: everything synthesised in WebAudio — engine hum, two-tone sirens,
  gunshots, a bass-and-hats groove under the city. No audio files, no network

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser.

Move with WASD (Shift sprints), drag the mouse to orbit the camera, click to shoot,
E to enter or steal a car, Space for the handbrake, H for the horn, M for missions,
P to pause, R to reload, M to mute.

## Files

```
game/index.html        the page, HUD and import map (three.js vendored)
game/vendor/three.module.min.js   three.js r160, vendored
game/src/config.js     tuning and world constants
game/src/random.js     seeded random
game/src/city.js       the city: roads, buildings, beach, landmarks, collisions
game/src/vehicles.js   car models, traffic AI, police pursuit driving
game/src/people.js     pedestrians and Halcones gunmen
game/src/player.js     Rico on foot and behind the wheel
game/src/combat.js     gunfire: rays, tracers, sparks, damage
game/src/missions.js   the six story missions and the courier run
game/src/wanted.js     wanted stars, police cars, officers, arrests
game/src/render.js     sun, sky, chase camera, mission beacon, clouds
game/src/hud.js        HUD and the minimap
game/src/audio.js      synthesised WebAudio sound and music
game/src/save.js       localStorage save and load
game/src/world.js      the living city: every system stepped together
game/src/shots.js      the staged screenshot scenes (?shot=…)
game/src/main.js       boot, the loop, the screens
```

Everything in the game is original: its city, characters, vehicles, names, story,
art, sound and music. No Rockstar Games names, logos, characters, maps or assets.

---

Entered on [make.fun](https://make.fun/?ref=3ky049kf&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards
