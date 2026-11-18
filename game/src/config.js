// Solmar Bay — tuning and world constants.
// One place for every number the rest of the game shares, so a balance
// change never means hunting through the systems.

export const CONFIG = {
  // The city is a 7x7 road grid. Roads sit every ROAD_GAP units, each
  // ROAD_WIDTH wide; blocks between them hold the buildings.
  world: {
    roadCount: 7,
    roadGap: 60,
    roadWidth: 12,
    blockSize: 48,
    // half-extent of the built city; the beach and sea lie past +z.
    half: 210,
    beachStart: 210,
    seaStart: 258,
    groundSize: 640,
  },

  player: {
    walkSpeed: 6,
    sprintSpeed: 10,
    driveAccel: 22,
    driveBrake: 34,
    driveTop: 34,
    reverseTop: 12,
    turnRate: 1.9,
    handbrakeTurn: 3.1,
    healthMax: 100,
    magSize: 12,
    startCash: 250,
    stealRadius: 4.5,
    enterRadius: 4,
  },

  traffic: {
    count: 22,
    speedMin: 8,
    speedMax: 14,
    brakeGap: 13,
  },

  pedestrians: {
    count: 36,
    walkMin: 1.2,
    walkMax: 2.4,
    fleeSpeed: 5.5,
  },

  police: {
    maxCars: 5,
    chaseSpeed: 30,
    spawnDistance: 55,
    arrestRadius: 3,
    // seconds without a crime before the heat starts to cool
    coolAfter: 18,
    coolRate: 0.12,
  },

  combat: {
    pistolDamage: 1,
    gunmanHp: 3,
    officerHp: 3,
    gunmanRange: 26,
    gunmanDamage: 6,
    gunmanShotEvery: 1.4,
    regenAfter: 5,
    regenRate: 8,
  },

  // Sun-soaked coastal palette: warm stucco, glass towers, turquoise sea.
  colors: {
    skyDay: 0x8fc3e8,
    skySunset: 0xff9a56,
    fogDay: 0x9fc3dd,
    fogSunset: 0xe88a5a,
    sea: 0x2e8fa8,
    sand: 0xe8cf9e,
    grass: 0x7fae62,
    asphalt: 0x3a3d42,
    sidewalk: 0x9a9a92,
    plaza: 0xb8b0a0,
    buildings: [0xe8d8b8, 0xd8b89a, 0xc9a06a, 0x9fb8cc, 0x7fa8b8, 0xe0b090, 0xb8c8d8],
    glass: 0x5a7a94,
    carPaint: [0xc23b2e, 0x2e6fc2, 0xe8c832, 0x3aa655, 0xe8e8e8, 0x222222, 0x8a5fc2, 0xe07b28],
    policePaint: 0x1c2733,
    taxiPaint: 0xe8b820,
  },
};

// The six story jobs for Delgado, in order, plus the repeatable courier run.
export const MISSIONS = [
  {
    id: 'wheels',
    name: 'First Wheels',
    brief: 'Delgado needs a driver. Steal any car and bring it to the bar.',
    target: 'bar',
    reward: 150,
  },
  {
    id: 'delivery',
    name: 'The Delivery',
    brief: 'A package for the pier. Get it there in 90 seconds, no questions.',
    target: 'pier',
    reward: 250,
    timeLimit: 90,
  },
  {
    id: 'tail',
    name: 'Lose the Tail',
    brief: 'The cops are onto you. Lose every star and stay clean.',
    target: null,
    reward: 300,
  },
  {
    id: 'warehouse',
    name: 'Warehouse Shootout',
    brief: 'The Halcones took the warehouse. Clear all four gunmen out.',
    target: 'warehouse',
    reward: 500,
    gunmen: 4,
  },
  {
    id: 'sprint',
    name: 'Cross-Town Sprint',
    brief: 'Delgado is waiting at the bank. Cross town in 75 seconds.',
    target: 'bank',
    reward: 400,
    timeLimit: 75,
  },
  {
    id: 'heist',
    name: 'The Big Score',
    brief: 'Hold the bank vault for 10 seconds, then lose the heat and reach the safehouse.',
    target: 'bank',
    reward: 1500,
    holdSeconds: 10,
    escapeTarget: 'safehouse',
  },
];

export const COURIER = {
  id: 'courier',
  name: 'Courier Run',
  brief: 'Pick up at the bar, drop off across town. $150 a run.',
  reward: 150,
};
