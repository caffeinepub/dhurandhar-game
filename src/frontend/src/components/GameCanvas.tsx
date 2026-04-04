import { useCallback, useEffect, useRef, useState } from "react";

type Phase = "menu" | "playing" | "win" | "gameover";
type HeroName = "humza" | "ajay";
type BgTheme = "morning" | "dusk" | "night" | "warzone" | "final";

const WORLD_W = 3600;
const WORLD_H = 2800;
const MOVE_SPEED = 220;
const BULLET_SPEED = 500;
const BULLET_LIFE = 1.6;
const BOMB_RADIUS = 170;
const FLEE_DIST = 300;
const FIGHT_DIST = 160;
const BOSS_FIGHT_DIST = 250;
const MAX_LEVEL = 20;
const CHAR_RADIUS = 18;
const BOSS_RADIUS = 26;
const HERO_RADIUS = 20;

interface Vec2 {
  x: number;
  y: number;
}

interface Entity {
  id: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  vx: number;
  vy: number;
  dead: boolean;
  isBoss: boolean;
  name: string;
  shootCooldown: number;
  alertTimer: number;
  state: "patrol" | "flee" | "fight";
  hideX: number;
  hideY: number;
  angle: number;
  color: string;
  accentColor: string;
  muzzleFlashTimer: number;
}
interface Bullet {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fromPlayer: boolean;
  life: number;
}
interface Bomb {
  id: number;
  x: number;
  y: number;
  tx: number;
  ty: number;
  timer: number;
  exploded: boolean;
  explodeTime: number;
}
interface CityBuilding {
  x: number;
  y: number;
  w: number;
  h: number;
  type:
    | "shop"
    | "bank"
    | "hospital"
    | "house"
    | "hotel"
    | "market"
    | "mosque"
    | "police";
  color: string;
  roofColor: string;
  onFire: boolean;
  fireTimer: number;
}
interface NPC {
  id: number;
  x: number;
  y: number;
  type: "man" | "woman" | "soldier";
  hint: string;
  showBubble: boolean;
  bubbleTimer: number;
  vx: number;
  vy: number;
  walkTimer: number;
  angle: number;
}
interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}
interface Pickup {
  id: number;
  x: number;
  y: number;
  type: "health" | "speed" | "ammo";
  collected: boolean;
  pulseTimer: number;
}
interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  vy: number;
}
interface ShellCasing {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  spin: number;
  life: number;
  maxLife: number;
}
interface GameState {
  phase: Phase;
  hero: HeroName;
  hx: number;
  hy: number;
  hhp: number;
  maxHhp: number;
  hvx: number;
  hvy: number;
  hAngle: number;
  hShootCooldown: number;
  muzzleFlashTimer: number;
  hBombs: number;
  bombRechargeTimer: number;
  level: number;
  score: number;
  totalBossesKilled: number;
  enemies: Entity[];
  bullets: Bullet[];
  bombs: Bomb[];
  particles: Particle[];
  buildings: CityBuilding[];
  npcs: NPC[];
  camX: number;
  camY: number;
  screenShake: number;
  levelSplash: number;
  levelTitle: string;
  bossWarning: string;
  bossWarningTimer: number;
  muted: boolean;
  idCounter: number;
  invincTimer: number;
  pickups: Pickup[];
  floatingTexts: FloatingText[];
  shellCasings: ShellCasing[];
  speedBoostTimer: number;
  killStreak: number;
  killStreakTimer: number;
  scoreMultiplier: number;
  streakBannerTimer: number;
  streakBannerText: string;
}

const LEVEL_TITLES: Record<number, string> = {
  1: "BORDER TENSION",
  2: "CITY PATROL",
  3: "ENEMY ADVANCE",
  4: "STREETS ON FIRE",
  5: "BOSS: REHMAN DAKAIT",
  6: "WAR BREAKS OUT",
  7: "CITY SIEGE",
  8: "DUSK BATTLE",
  9: "NIGHT RAID",
  10: "BOSS: SP ASLAM",
  11: "DARK ZONE",
  12: "RUINS & SMOKE",
  13: "DESERT HUNT",
  14: "BAZAAR BATTLE",
  15: "BOSS: JAMEEL JAMALI",
  16: "DESERT STORM",
  17: "FINAL ASSAULT",
  18: "TOTAL WARFARE",
  19: "LAST STAND",
  20: "FINAL BOSS: MAJOR IQBAL",
};
const BOSS_AT_LEVEL: Record<number, string> = {
  5: "Rehman Dakait",
  10: "SP Aslam Choudhury",
  15: "Jameel Jamali",
  20: "Major Iqbal",
};
const BOSS_DIALOG: Record<string, string> = {
  "Rehman Dakait": "You cannot stop me, fool!",
  "SP Aslam Choudhury": "I have the law on my side!",
  "Jameel Jamali": "Allah will not save you now!",
  "Major Iqbal": "You dare challenge the Major?!",
};
const BOSS_COLORS: Record<string, [string, string]> = {
  "Rehman Dakait": ["#8B0000", "#ff4444"],
  "SP Aslam Choudhury": ["#00008B", "#4444ff"],
  "Jameel Jamali": ["#8B6914", "#ffcc44"],
  "Major Iqbal": ["#1a4a1a", "#44ff44"],
};
const NPC_HINTS = [
  "Rehman Dakait is hiding near the market!",
  "SP Aslam lurks near the police station!",
  "Jameel Jamali is hiding behind the mosque!",
  "Major Iqbal is deep in the war zone!",
];

function getBgTheme(level: number): BgTheme {
  if (level <= 4) return "morning";
  if (level <= 8) return "dusk";
  if (level <= 12) return "night";
  if (level <= 16) return "warzone";
  return "final";
}

// ─── Audio ───────────────────────────────────────────────────────────────────
// ─── Audio Engine ────────────────────────────────────────────────────────────
let audioCtx: AudioContext | null = null;
let musicNodes: AudioNode[] = [];
let musicScheduler: ReturnType<typeof setTimeout> | null = null;
let currentMusicLevel = 0;
let musicMasterGain: GainNode | null = null;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

// War-action music engine — dynamic intensity based on level
// Uses a 3-layer system: bass pulse, melody lead, percussion

const NOTES = {
  E2: 82.41,
  A2: 110,
  D3: 146.83,
  E3: 164.81,
  A3: 220,
  B3: 246.94,
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  F4: 349.23,
  G4: 392,
  A4: 440,
  B4: 493.88,
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
};

// Dhurandhar-style war melody — minor pentatonic tension
const MELODY_LOW = [
  NOTES.A3,
  NOTES.C4,
  NOTES.D4,
  NOTES.E4,
  NOTES.A3,
  NOTES.G4,
  NOTES.E4,
  NOTES.D4,
];
const MELODY_MID = [
  NOTES.E4,
  NOTES.A4,
  NOTES.B4,
  NOTES.A4,
  NOTES.G4,
  NOTES.E4,
  NOTES.D4,
  NOTES.E4,
];
const MELODY_HIGH = [
  NOTES.A4,
  NOTES.C5,
  NOTES.D5,
  NOTES.E5,
  NOTES.D5,
  NOTES.C5,
  NOTES.B4,
  NOTES.A4,
];
const BASS_LOW = [
  NOTES.A2,
  NOTES.A2,
  NOTES.D3,
  NOTES.A2,
  NOTES.E3,
  NOTES.D3,
  NOTES.A2,
  NOTES.E2,
];
const BASS_HIGH = [
  NOTES.A2,
  NOTES.E3,
  NOTES.D3,
  NOTES.E3,
  NOTES.A2,
  NOTES.E3,
  NOTES.D3,
  NOTES.A2,
];

function stopAllMusic() {
  if (musicScheduler) {
    clearTimeout(musicScheduler);
    musicScheduler = null;
  }
  for (const n of musicNodes) {
    try {
      (n as OscillatorNode).stop?.();
    } catch {}
  }
  musicNodes = [];
  musicMasterGain = null;
}

function playNote(
  ctx: AudioContext,
  dest: AudioNode,
  freq: number,
  startTime: number,
  dur: number,
  vol: number,
  type: OscillatorType = "square",
  attack = 0.01,
  decay = 0.05,
  sustain = 0.7,
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filt = ctx.createBiquadFilter();
  filt.type = "lowpass";
  filt.frequency.value = 1800;
  osc.type = type;
  osc.frequency.value = freq;
  osc.connect(filt);
  filt.connect(gain);
  gain.connect(dest);
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(vol, startTime + attack);
  gain.gain.linearRampToValueAtTime(vol * sustain, startTime + attack + decay);
  gain.gain.setValueAtTime(vol * sustain, startTime + dur - 0.04);
  gain.gain.linearRampToValueAtTime(0, startTime + dur);
  osc.start(startTime);
  osc.stop(startTime + dur + 0.05);
  musicNodes.push(osc);
}

function playDrum(
  ctx: AudioContext,
  dest: AudioNode,
  startTime: number,
  isKick: boolean,
) {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.18, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) {
    const t = i / ctx.sampleRate;
    d[i] = isKick
      ? Math.sin(2 * Math.PI * 80 * Math.exp(-t * 30) * t) * Math.exp(-t * 20)
      : (Math.random() * 2 - 1) * Math.exp(-t * 40) * 0.7;
  }
  const src = ctx.createBufferSource();
  const gain = ctx.createGain();
  src.buffer = buf;
  src.connect(gain);
  gain.connect(dest);
  gain.gain.value = isKick ? 0.9 : 0.4;
  src.start(startTime);
  musicNodes.push(src);
}

function scheduleBar(
  ctx: AudioContext,
  dest: AudioNode,
  startTime: number,
  level: number,
) {
  const bpm = 90 + Math.min(level * 4, 50); // 90–140 bpm as levels rise
  const beat = 60 / bpm;
  const bar = beat * 4;
  const intensity = Math.min((level - 1) / 19, 1); // 0 = level 1, 1 = level 20
  const isBoss = level === 5 || level === 10 || level === 15 || level === 20;

  // Bass
  const bassLine = intensity > 0.5 ? BASS_HIGH : BASS_LOW;
  for (let i = 0; i < 8; i++) {
    const t = startTime + i * (bar / 8);
    playNote(
      ctx,
      dest,
      bassLine[i],
      t,
      (bar / 8) * 0.9,
      0.22,
      "sawtooth",
      0.01,
      0.03,
      0.6,
    );
  }

  // Melody (starts at level 3+, gets higher register at level 10+)
  if (level >= 3) {
    const mel =
      intensity > 0.5
        ? MELODY_HIGH
        : intensity > 0.25
          ? MELODY_MID
          : MELODY_LOW;
    for (let i = 0; i < 8; i++) {
      const t = startTime + i * (bar / 8) + beat * 0.02; // slight offset for texture
      const skip = intensity < 0.3 && i % 2 === 1; // sparser at low levels
      if (!skip) {
        playNote(
          ctx,
          dest,
          mel[i],
          t,
          (bar / 8) * 0.7,
          isBoss ? 0.18 : 0.12,
          "triangle",
          0.005,
          0.04,
          0.5,
        );
      }
    }
  }

  // Harmony / chord stabs at level 6+
  if (level >= 6) {
    const chordFreqs = [NOTES.E4, NOTES.A4, NOTES.C5];
    for (let i = 0; i < 4; i++) {
      const t = startTime + i * beat + beat * 0.5;
      for (const f of chordFreqs) {
        playNote(ctx, dest, f, t, beat * 0.3, 0.06, "square", 0.005, 0.02, 0.4);
      }
    }
  }

  // Percussion: kick on 1 & 3, snare on 2 & 4 (levels 2+)
  if (level >= 2) {
    for (let b = 0; b < 4; b++) {
      const t = startTime + b * beat;
      playDrum(ctx, dest, t, b % 2 === 0); // kick on 0,2  snare on 1,3
      // hi-hats at level 5+
      if (level >= 5) {
        playDrum(ctx, dest, t + beat * 0.5, false);
      }
      // 16th hat fills at level 12+
      if (level >= 12) {
        playDrum(ctx, dest, t + beat * 0.25, false);
        playDrum(ctx, dest, t + beat * 0.75, false);
      }
    }
  }

  // War tension: distortion pulse at boss levels
  if (isBoss) {
    const warOsc = ctx.createOscillator();
    const warGain = ctx.createGain();
    warOsc.type = "sawtooth";
    warOsc.frequency.setValueAtTime(NOTES.E2, startTime);
    warOsc.frequency.linearRampToValueAtTime(NOTES.A2, startTime + bar);
    warGain.gain.setValueAtTime(0, startTime);
    warGain.gain.linearRampToValueAtTime(0.08, startTime + 0.1);
    warGain.gain.setValueAtTime(0.08, startTime + bar - 0.1);
    warGain.gain.linearRampToValueAtTime(0, startTime + bar);
    warOsc.connect(warGain);
    warGain.connect(dest);
    warOsc.start(startTime);
    warOsc.stop(startTime + bar + 0.1);
    musicNodes.push(warOsc);
  }

  return bar;
}

function startMusicLoop(level: number) {
  if (musicMasterGain) return; // already playing
  try {
    const ctx = getAudioCtx();
    if (ctx.state === "suspended") ctx.resume();
    const master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(ctx.destination);
    musicMasterGain = master;
    currentMusicLevel = level;

    let nextBar = ctx.currentTime + 0.05;

    function loop() {
      if (!musicMasterGain) return;
      const ctx2 = getAudioCtx();
      const barDur = scheduleBar(
        ctx2,
        musicMasterGain,
        nextBar,
        currentMusicLevel,
      );
      nextBar += barDur;
      const lookahead = nextBar - ctx2.currentTime;
      musicScheduler = setTimeout(loop, Math.max(0, (lookahead - 0.1) * 1000));
    }
    loop();
  } catch {}
}

function startDrone(muted: boolean) {
  if (muted) return;
  stopAllMusic();
  startMusicLoop(currentMusicLevel || 1);
}

function stopDrone() {
  stopAllMusic();
}

function updateMusicLevel(level: number) {
  currentMusicLevel = level;
  // No restart needed — next bar picks up new level automatically
}

function playShoot(muted: boolean) {
  if (muted) return;
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(900, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.07);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);
    osc.start();
    osc.stop(ctx.currentTime + 0.07);
    // crack layer
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.04, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++)
      d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.02));
    const src = ctx.createBufferSource();
    const g2 = ctx.createGain();
    src.buffer = buf;
    src.connect(g2);
    g2.connect(ctx.destination);
    g2.gain.value = 0.3;
    src.start();
  } catch {}
}

function playHit(muted: boolean) {
  if (muted) return;
  try {
    const ctx = getAudioCtx();
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.06, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++)
      d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.03));
    const src = ctx.createBufferSource();
    const gain = ctx.createGain();
    src.buffer = buf;
    src.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.value = 0.7;
    src.start();
  } catch {}
}

function playExplosion(muted: boolean) {
  if (muted) return;
  try {
    const ctx = getAudioCtx();
    // Low boom
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++)
      d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.25));
    const src = ctx.createBufferSource();
    const gain = ctx.createGain();
    const filt = ctx.createBiquadFilter();
    filt.type = "lowpass";
    filt.frequency.value = 300;
    src.buffer = buf;
    src.connect(filt);
    filt.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.value = 2.2;
    src.start();
    // High crack
    const buf2 = ctx.createBuffer(1, ctx.sampleRate * 0.15, ctx.sampleRate);
    const d2 = buf2.getChannelData(0);
    for (let i = 0; i < d2.length; i++)
      d2[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.05));
    const src2 = ctx.createBufferSource();
    const gain2 = ctx.createGain();
    src2.buffer = buf2;
    src2.connect(gain2);
    gain2.connect(ctx.destination);
    gain2.gain.value = 0.8;
    src2.start();
  } catch {}
}

function playBossAlert(muted: boolean) {
  if (muted) return;
  try {
    const ctx = getAudioCtx();
    // Dramatic 3-tone war horn
    const freqs = [NOTES.E4, NOTES.A4, NOTES.E5];
    freqs.forEach((f, idx) => {
      const t = ctx.currentTime + idx * 0.2;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.value = f;
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.start(t);
      osc.stop(t + 0.18);
    });
  } catch {}
}

// ─── Seeded random ───────────────────────────────────────────────────────────
function seededRand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

// ─── City generation ─────────────────────────────────────────────────────────
const BUILDING_TYPES: CityBuilding["type"][] = [
  "shop",
  "bank",
  "hospital",
  "house",
  "hotel",
  "market",
  "mosque",
  "police",
];
const BUILDING_LABELS: Record<CityBuilding["type"], string> = {
  shop: "DUKAAN",
  bank: "BANK",
  hospital: "HOSPITAL",
  house: "MAKAAN",
  hotel: "HOTEL",
  market: "MARKET",
  mosque: "MASJID",
  police: "POLICE",
};
const BUILDING_COLORS: Record<
  BgTheme,
  Record<CityBuilding["type"], [string, string]>
> = {
  morning: {
    shop: ["#d4a870", "#b08050"],
    bank: ["#8090a8", "#606878"],
    hospital: ["#f0f0f0", "#d0d0d0"],
    house: ["#c89060", "#a07040"],
    hotel: ["#a0b8d0", "#8098b0"],
    market: ["#d4b060", "#b09040"],
    mosque: ["#90a870", "#708060"],
    police: ["#486890", "#304870"],
  },
  dusk: {
    shop: ["#9a6040", "#7a4020"],
    bank: ["#606878", "#404858"],
    hospital: ["#b0b0b0", "#909090"],
    house: ["#8a5030", "#6a3018"],
    hotel: ["#6080a0", "#406080"],
    market: ["#9a8040", "#7a6020"],
    mosque: ["#607050", "#405030"],
    police: ["#304870", "#203050"],
  },
  night: {
    shop: ["#1a1a2a", "#0a0a1a"],
    bank: ["#0a1020", "#050810"],
    hospital: ["#202838", "#101828"],
    house: ["#181820", "#080810"],
    hotel: ["#101828", "#080e18"],
    market: ["#201a10", "#100e08"],
    mosque: ["#102010", "#081008"],
    police: ["#081020", "#040810"],
  },
  warzone: {
    shop: ["#4a2010", "#2a1008"],
    bank: ["#282830", "#181820"],
    hospital: ["#484030", "#302820"],
    house: ["#3a1808", "#200c04"],
    hotel: ["#302828", "#201818"],
    market: ["#402010", "#200c08"],
    mosque: ["#182010", "#0c1008"],
    police: ["#181828", "#0c0c18"],
  },
  final: {
    shop: ["#3a0808", "#200404"],
    bank: ["#1a1010", "#0a0808"],
    hospital: ["#302010", "#200c08"],
    house: ["#280404", "#180202"],
    hotel: ["#200808", "#100404"],
    market: ["#301008", "#180804"],
    mosque: ["#100c08", "#080604"],
    police: ["#0a0818", "#050410"],
  },
};

function generateCity(theme: BgTheme, seed: number): CityBuilding[] {
  const rand = seededRand(seed);
  const buildings: CityBuilding[] = [];
  const palette = BUILDING_COLORS[theme];
  // Grid: 6 columns x 5 rows of city blocks separated by roads
  const roadW = 60;
  const blockW = (WORLD_W - roadW * 7) / 6;
  const blockH = (WORLD_H - roadW * 6) / 5;
  const types = BUILDING_TYPES;
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 6; col++) {
      const bx = roadW * (col + 1) + blockW * col;
      const by = roadW * (row + 1) + blockH * row;
      // Each block has 1-3 buildings
      const numBuildings = 1 + Math.floor(rand() * 3);
      const subW = blockW / numBuildings;
      for (let k = 0; k < numBuildings; k++) {
        const type = types[Math.floor(rand() * types.length)];
        const [color, roofColor] = palette[type];
        const margin = 8 + rand() * 12;
        buildings.push({
          x: bx + k * subW + margin,
          y: by + margin,
          w: subW - margin * 2,
          h: blockH - margin * 2,
          type,
          color,
          roofColor,
          onFire: false,
          fireTimer: 0,
        });
      }
    }
  }
  return buildings;
}

function generateNPCs(seed: number): NPC[] {
  const rand = seededRand(seed + 999);
  const positions: Vec2[] = [
    { x: 400, y: 400 },
    { x: 1800, y: 600 },
    { x: 800, y: 1800 },
    { x: 2800, y: 1400 },
  ];
  const types: NPC["type"][] = ["man", "soldier", "woman", "man"];
  return positions.map((pos, i) => ({
    id: 2000 + i,
    x: pos.x,
    y: pos.y,
    type: types[i],
    hint: NPC_HINTS[i],
    showBubble: false,
    bubbleTimer: 0,
    vx: (rand() - 0.5) * 40,
    vy: (rand() - 0.5) * 40,
    walkTimer: rand() * 3,
    angle: rand() * Math.PI * 2,
  }));
}

function spawnLevelEnemies(
  level: number,
  idStart: number,
): { enemies: Entity[]; nextId: number } {
  const rand = seededRand(level * 31 + 7);
  const gruntCount = Math.min(3 + Math.floor(level * 0.4), 9);
  const hpBase = 25 + level * 8;
  const enemies: Entity[] = [];
  for (let i = 0; i < gruntCount; i++) {
    const angle = rand() * Math.PI * 2;
    enemies.push({
      id: idStart + i,
      x: 300 + rand() * (WORLD_W - 600),
      y: 300 + rand() * (WORLD_H - 600),
      hp: hpBase,
      maxHp: hpBase,
      vx: 0,
      vy: 0,
      dead: false,
      isBoss: false,
      name: "Enemy",
      shootCooldown: rand() * 2,
      alertTimer: 0,
      state: "patrol",
      hideX: 300 + rand() * (WORLD_W - 600),
      hideY: 300 + rand() * (WORLD_H - 600),
      angle,
      color: "#2a1010",
      accentColor: "#cc3300",
      muzzleFlashTimer: 0,
    });
  }
  let nextId = idStart + gruntCount;
  const bossName = BOSS_AT_LEVEL[level];
  if (bossName) {
    const bossHp = 200 + level * 30;
    const [color, accentColor] = BOSS_COLORS[bossName] ?? [
      "#440000",
      "#ff0000",
    ];
    enemies.push({
      id: nextId,
      x: 200 + rand() * (WORLD_W - 400),
      y: 200 + rand() * (WORLD_H - 400),
      hp: bossHp,
      maxHp: bossHp,
      vx: 0,
      vy: 0,
      dead: false,
      isBoss: true,
      name: bossName,
      shootCooldown: 0,
      alertTimer: 0,
      state: "patrol",
      hideX: WORLD_W * 0.5 + rand() * 400,
      hideY: WORLD_H * 0.5 + rand() * 400,
      angle: 0,
      color,
      accentColor,
      muzzleFlashTimer: 0,
    });
    nextId++;
  }
  return { enemies, nextId };
}

function spawnPickups(
  level: number,
  buildings: CityBuilding[],
  idStart: number,
): { pickups: Pickup[]; nextId: number } {
  const rand = seededRand(level * 77 + 13);
  const count = 8 + Math.floor(rand() * 5);
  const pickups: Pickup[] = [];
  const types: Pickup["type"][] = ["health", "speed", "ammo"];
  let id = idStart;
  for (let i = 0; i < count; i++) {
    let px = 100 + rand() * (WORLD_W - 200);
    let py = 100 + rand() * (WORLD_H - 200);
    // Try to avoid buildings
    for (let attempt = 0; attempt < 8; attempt++) {
      const overlap = buildings.some(
        (b) =>
          px > b.x - 20 &&
          px < b.x + b.w + 20 &&
          py > b.y - 20 &&
          py < b.y + b.h + 20,
      );
      if (!overlap) break;
      px = 100 + rand() * (WORLD_W - 200);
      py = 100 + rand() * (WORLD_H - 200);
    }
    pickups.push({
      id: id++,
      x: px,
      y: py,
      type: types[Math.floor(rand() * types.length)],
      collected: false,
      pulseTimer: rand() * Math.PI * 2,
    });
  }
  return { pickups, nextId: id };
}

function spawnFloatingText(
  s: GameState,
  x: number,
  y: number,
  text: string,
  color: string,
) {
  s.floatingTexts.push({
    id: s.idCounter++,
    x,
    y,
    text,
    color,
    life: 1.2,
    maxLife: 1.2,
    vy: -60,
  });
}

function initGameState(hero: HeroName): GameState {
  const theme = getBgTheme(1);
  const buildings = generateCity(theme, 1);
  const npcs = generateNPCs(1);
  const { enemies, nextId } = spawnLevelEnemies(1, 200);
  return {
    phase: "playing",
    hero,
    hx: 180,
    hy: 180,
    hhp: 200,
    maxHhp: 200,
    hvx: 0,
    hvy: 0,
    hAngle: 0,
    hShootCooldown: 0,
    muzzleFlashTimer: 0,
    hBombs: 3,
    bombRechargeTimer: 0,
    level: 1,
    score: 0,
    totalBossesKilled: 0,
    enemies,
    bullets: [],
    bombs: [],
    particles: [],
    buildings,
    npcs,
    camX: 0,
    camY: 0,
    screenShake: 0,
    levelSplash: 2.5,
    levelTitle: LEVEL_TITLES[1] ?? "LEVEL 1",
    bossWarning: "",
    bossWarningTimer: 0,
    muted: false,
    idCounter: nextId,
    invincTimer: 0,
    pickups: spawnPickups(1, buildings, nextId + 100).pickups,
    floatingTexts: [],
    shellCasings: [],
    speedBoostTimer: 0,
    killStreak: 0,
    killStreakTimer: 0,
    scoreMultiplier: 1,
    streakBannerTimer: 0,
    streakBannerText: "",
  };
}

// ─── Game actions ─────────────────────────────────────────────────────────────
function heroShoot(s: GameState) {
  if (s.hShootCooldown > 0) return;
  s.hShootCooldown = 0.18;
  s.muzzleFlashTimer = 0.1;
  // Shell casing ejection
  const perpAngle = s.hAngle - Math.PI / 2;
  s.shellCasings.push({
    id: s.idCounter++,
    x: s.hx + Math.cos(perpAngle) * 8,
    y: s.hy + Math.sin(perpAngle) * 8,
    vx: Math.cos(perpAngle) * (40 + Math.random() * 60),
    vy: Math.sin(perpAngle) * (40 + Math.random() * 60) - 80,
    angle: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 15,
    life: 1.5,
    maxLife: 1.5,
  });
  const vx = Math.cos(s.hAngle) * BULLET_SPEED;
  const vy = Math.sin(s.hAngle) * BULLET_SPEED;
  s.bullets.push({
    id: s.idCounter++,
    x: s.hx,
    y: s.hy,
    vx,
    vy,
    fromPlayer: true,
    life: BULLET_LIFE,
  });
  playShoot(s.muted);
}
function throwBomb(s: GameState) {
  if (s.hBombs <= 0) return;
  s.hBombs--;
  const alive = s.enemies.filter((e) => !e.dead);
  let tx = s.hx + Math.cos(s.hAngle) * 250;
  let ty = s.hy + Math.sin(s.hAngle) * 250;
  if (alive.length > 0) {
    const nearest = alive.reduce((best, e) =>
      Math.hypot(e.x - s.hx, e.y - s.hy) <
      Math.hypot(best.x - s.hx, best.y - s.hy)
        ? e
        : best,
    );
    tx = nearest.x;
    ty = nearest.y;
  }
  s.bombs.push({
    id: s.idCounter++,
    x: s.hx,
    y: s.hy,
    tx,
    ty,
    timer: 1.0,
    exploded: false,
    explodeTime: 0,
  });
}
function enemyShoot(s: GameState, e: Entity) {
  e.muzzleFlashTimer = 0.08;
  const dx = s.hx - e.x;
  const dy = s.hy - e.y;
  const dist = Math.hypot(dx, dy) || 1;
  const speed = BULLET_SPEED * 0.65;
  s.bullets.push({
    id: s.idCounter++,
    x: e.x,
    y: e.y,
    vx: (dx / dist) * speed,
    vy: (dy / dist) * speed,
    fromPlayer: false,
    life: BULLET_LIFE,
  });
}
function spawnParticles(
  s: GameState,
  sx: number,
  sy: number,
  color: string,
  count: number,
) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 60 + Math.random() * 180;
    s.particles.push({
      id: s.idCounter++,
      x: sx,
      y: sy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.4 + Math.random() * 0.6,
      maxLife: 1,
      color,
      size: 2 + Math.random() * 5,
    });
  }
}

function drawNPCTopDown(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  type: NPC["type"],
  hint: string,
  showBubble: boolean,
) {
  ctx.save();
  const r = 14;
  ctx.beginPath();
  ctx.arc(cx + 2, cy + 2, r, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.fill();
  const colors = { man: "#d4890a", woman: "#e07080", soldier: "#4a7040" };
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = colors[type];
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Face
  ctx.beginPath();
  ctx.arc(cx, cy - r * 0.3, r * 0.55, 0, Math.PI * 2);
  ctx.fillStyle = "#c8906a";
  ctx.fill();
  if (showBubble) {
    const bw = Math.max(120, hint.length * 5.5);
    const bh = 28;
    const bx = cx - bw / 2;
    const by = cy - r - bh - 12;
    ctx.fillStyle = "rgba(255,255,220,0.95)";
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 6);
    ctx.fill();
    ctx.strokeStyle = "#888";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = "#333";
    ctx.font = "9px Arial";
    ctx.textAlign = "center";
    ctx.fillText(hint, cx, by + 10, bw - 6);
    ctx.fillText("", cx, by + 21, bw - 6);
  }
  ctx.restore();
}

// ─── Fire drawing ─────────────────────────────────────────────────────────────
function drawFire(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
) {
  const t = performance.now() / 100;
  for (let i = 0; i < 4; i++) {
    const fx = x + Math.sin(t + i * 1.4) * w * 0.25;
    const fh = 18 + Math.sin(t * 0.8 + i) * 8;
    const fg = ctx.createRadialGradient(fx, y, 0, fx, y - fh, fh);
    fg.addColorStop(0, "rgba(255,240,0,0.9)");
    fg.addColorStop(0.5, "rgba(255,100,0,0.7)");
    fg.addColorStop(1, "rgba(255,0,0,0)");
    ctx.beginPath();
    ctx.ellipse(fx, y - fh / 2, w * 0.13, fh / 2, 0, 0, Math.PI * 2);
    ctx.fillStyle = fg;
    ctx.fill();
  }
}

// ─── City rendering (top-down) ────────────────────────────────────────────────
function drawCity(
  ctx: CanvasRenderingContext2D,
  camX: number,
  camY: number,
  vw: number,
  vh: number,
  theme: BgTheme,
  buildings: CityBuilding[],
  level: number,
) {
  // Road/ground fill
  const roadColors: Record<BgTheme, string> = {
    morning: "#888070",
    dusk: "#5a4a3a",
    night: "#1a1818",
    warzone: "#4a3020",
    final: "#2a1010",
  };
  const sidewalkColors: Record<BgTheme, string> = {
    morning: "#c0b090",
    dusk: "#8a7060",
    night: "#302828",
    warzone: "#6a4030",
    final: "#3a1818",
  };
  ctx.fillStyle = roadColors[theme];
  ctx.fillRect(0, 0, vw, vh);

  // Road markings
  const roadW = 60;
  const blockW = (WORLD_W - roadW * 7) / 6;
  const blockH = (WORLD_H - roadW * 6) / 5;
  // Vertical roads
  for (let col = 0; col <= 6; col++) {
    const rx = roadW * col + blockW * col - camX;
    ctx.fillStyle = sidewalkColors[theme];
    ctx.fillRect(rx, -camY, roadW, WORLD_H);
    // Center lane marking
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.lineWidth = 2;
    ctx.setLineDash([20, 20]);
    ctx.beginPath();
    ctx.moveTo(rx + roadW / 2, -camY);
    ctx.lineTo(rx + roadW / 2, WORLD_H - camY);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  // Horizontal roads
  for (let row = 0; row <= 5; row++) {
    const ry = roadW * row + blockH * row - camY;
    ctx.fillStyle = sidewalkColors[theme];
    ctx.fillRect(-camX, ry, WORLD_W, roadW);
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.lineWidth = 2;
    ctx.setLineDash([20, 20]);
    ctx.beginPath();
    ctx.moveTo(-camX, ry + roadW / 2);
    ctx.lineTo(WORLD_W - camX, ry + roadW / 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Buildings
  for (const b of buildings) {
    const bsx = b.x - camX;
    const bsy = b.y - camY;
    if (bsx > vw + b.w || bsx < -b.w || bsy > vh + b.h || bsy < -b.h) continue;
    // Wall
    ctx.fillStyle = b.color;
    ctx.fillRect(bsx, bsy, b.w, b.h);
    // Roof
    ctx.fillStyle = b.roofColor;
    ctx.fillRect(bsx + 6, bsy + 6, b.w - 12, b.h - 12);
    // Roof detail lines
    ctx.strokeStyle = "rgba(0,0,0,0.2)";
    ctx.lineWidth = 1;
    ctx.strokeRect(bsx + 6, bsy + 6, b.w - 12, b.h - 12);
    // Sign on building top
    const label = BUILDING_LABELS[b.type];
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.fillRect(bsx + b.w * 0.1, bsy + b.h * 0.05, b.w * 0.8, 16);
    const textColor =
      b.type === "hospital"
        ? "#ff4444"
        : b.type === "police"
          ? "#4488ff"
          : b.type === "mosque"
            ? "#44ff88"
            : "#ffffaa";
    ctx.fillStyle = textColor;
    ctx.font = "bold 9px Arial";
    ctx.textAlign = "center";
    ctx.fillText(label, bsx + b.w / 2, bsy + b.h * 0.05 + 12);
    // Door
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    const doorW = Math.min(b.w * 0.2, 18);
    const doorH = Math.min(b.h * 0.25, 22);
    ctx.fillRect(bsx + b.w / 2 - doorW / 2, bsy + b.h - doorH, doorW, doorH);
    // Windows
    ctx.fillStyle =
      theme === "night" || theme === "final"
        ? "rgba(255,200,100,0.7)"
        : "rgba(180,200,255,0.5)";
    const wSize = Math.min(b.w * 0.12, 10);
    for (let wx = bsx + 14; wx < bsx + b.w - 14; wx += 22) {
      for (let wy = bsy + 22; wy < bsy + b.h - 20; wy += 20) {
        ctx.fillRect(wx, wy, wSize, wSize - 2);
      }
    }
    if (b.onFire) {
      drawFire(ctx, bsx + b.w / 2, bsy + b.h / 2, b.w * 0.6);
    }
  }

  // Night/war atmosphere overlay
  if (theme === "night" || theme === "final" || theme === "warzone") {
    const t = performance.now() / 1000;
    const intensity =
      theme === "final" ? 0.35 : theme === "warzone" ? 0.2 : 0.15;
    // Smoke columns at war levels
    if (level >= 9) {
      for (let i = 0; i < 4; i++) {
        const sx = (700 + i * 900 - camX) % vw;
        const alpha =
          (0.15 + Math.sin(t * 0.4 + i) * 0.06) * Math.min(1, (level - 8) / 4);
        const grad = ctx.createRadialGradient(
          sx,
          vh * 0.5,
          0,
          sx,
          vh * 0.5,
          120,
        );
        grad.addColorStop(0, `rgba(40,30,20,${alpha * 2})`);
        grad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = grad;
        ctx.fillRect(sx - 120, 0, 240, vh);
      }
    }
    ctx.fillStyle = `rgba(0,0,0,${intensity})`;
    ctx.fillRect(0, 0, vw, vh);
  }
}

// ─── Game update ──────────────────────────────────────────────────────────────
export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState | null>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const [phase, setPhase] = useState<Phase>("menu");
  const [hero, setHero] = useState<HeroName>("humza");
  const [muted, setMuted] = useState(false);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const joystickRef = useRef({ active: false, cx: 0, cy: 0, dx: 0, dy: 0 });

  // Sprite image refs
  const spriteHumza = useRef<HTMLImageElement | null>(null);
  const spriteAjay = useRef<HTMLImageElement | null>(null);
  const spriteRehman = useRef<HTMLImageElement | null>(null);
  const spriteSpAslam = useRef<HTMLImageElement | null>(null);
  const spriteMajorIqbal = useRef<HTMLImageElement | null>(null);
  const spriteJameel = useRef<HTMLImageElement | null>(null);
  const spriteGrunt = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const load = (src: string): HTMLImageElement => {
      const img = new Image();
      img.src = src;
      return img;
    };
    spriteHumza.current = load(
      "/assets/generated/humza-sprite-transparent.dim_200x320.png",
    );
    spriteAjay.current = load(
      "/assets/generated/ajay-sprite-transparent.dim_200x320.png",
    );
    spriteRehman.current = load(
      "/assets/generated/rehman-sprite-transparent.dim_200x320.png",
    );
    spriteSpAslam.current = load(
      "/assets/generated/sp-aslam-sprite-transparent.dim_200x320.png",
    );
    spriteMajorIqbal.current = load(
      "/assets/generated/major-iqbal-sprite-transparent.dim_200x320.png",
    );
    spriteJameel.current = load(
      "/assets/generated/jameel-sprite-transparent.dim_200x320.png",
    );
    spriteGrunt.current = load(
      "/assets/generated/grunt-sprite-transparent.dim_200x320.png",
    );
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keysRef.current.add(e.code);
      if (e.code === "Space") e.preventDefault();
    };
    const up = (e: KeyboardEvent) => keysRef.current.delete(e.code);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  useEffect(() => {
    const resize = () => {
      const c = canvasRef.current;
      if (!c) return;
      const dpr = window.devicePixelRatio || 1;
      c.width = Math.floor(window.innerWidth * dpr);
      c.height = Math.floor(window.innerHeight * dpr);
      c.style.width = `${window.innerWidth}px`;
      c.style.height = `${window.innerHeight}px`;
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  const startGame = useCallback(
    (selectedHero: HeroName) => {
      stateRef.current = initGameState(selectedHero);
      setPhase("playing");
      currentMusicLevel = stateRef.current?.level ?? 1;
      startDrone(muted);
    },
    [muted],
  );

  useEffect(() => {
    if (phase !== "playing") {
      cancelAnimationFrame(rafRef.current);
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    function tick(timestamp: number) {
      if (!canvas || !ctx || !stateRef.current) return;
      const dt = Math.min((timestamp - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = timestamp;
      update(stateRef.current, dt);
      render(ctx, window.innerWidth, window.innerHeight, stateRef.current);
      if (stateRef.current.phase !== "playing") {
        setPhase(stateRef.current.phase);
        stopDrone();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    }
    lastTimeRef.current = performance.now();
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  function update(s: GameState, dt: number) {
    const keys = keysRef.current;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const joy = joystickRef.current;
    let mx = 0;
    let my = 0;
    if (keys.has("KeyA") || keys.has("ArrowLeft")) mx -= 1;
    if (keys.has("KeyD") || keys.has("ArrowRight")) mx += 1;
    if (keys.has("KeyW") || keys.has("ArrowUp")) my -= 1;
    if (keys.has("KeyS") || keys.has("ArrowDown")) my += 1;
    if (joy.active) {
      mx += joy.dx;
      my += joy.dy;
    }
    // Normalize diagonal
    const len = Math.sqrt(mx * mx + my * my);
    if (len > 1) {
      mx /= len;
      my /= len;
    }
    const currentSpeed = MOVE_SPEED * (s.speedBoostTimer > 0 ? 1.8 : 1);
    s.hvx = mx * currentSpeed;
    s.hvy = my * currentSpeed;
    if (mx !== 0 || my !== 0) s.hAngle = Math.atan2(my, mx);
    s.hx = Math.max(
      HERO_RADIUS,
      Math.min(WORLD_W - HERO_RADIUS, s.hx + s.hvx * dt),
    );
    s.hy = Math.max(
      HERO_RADIUS,
      Math.min(WORLD_H - HERO_RADIUS, s.hy + s.hvy * dt),
    );

    // Camera follows hero (centered)
    s.camX = Math.max(0, Math.min(WORLD_W - vw, s.hx - vw / 2));
    s.camY = Math.max(0, Math.min(WORLD_H - vh, s.hy - vh / 2));

    if (s.screenShake > 0) s.screenShake = Math.max(0, s.screenShake - dt * 8);
    if (s.invincTimer > 0) s.invincTimer = Math.max(0, s.invincTimer - dt);
    if (s.levelSplash > 0) s.levelSplash = Math.max(0, s.levelSplash - dt);
    if (s.bossWarningTimer > 0)
      s.bossWarningTimer = Math.max(0, s.bossWarningTimer - dt);
    s.bombRechargeTimer += dt;
    if (s.bombRechargeTimer >= 30 && s.hBombs < 5) {
      s.hBombs++;
      s.bombRechargeTimer = 0;
    }
    s.hShootCooldown = Math.max(0, s.hShootCooldown - dt);
    s.muzzleFlashTimer = Math.max(0, s.muzzleFlashTimer - dt);
    if (s.speedBoostTimer > 0)
      s.speedBoostTimer = Math.max(0, s.speedBoostTimer - dt);
    if (s.killStreakTimer > 0) {
      s.killStreakTimer = Math.max(0, s.killStreakTimer - dt);
      if (s.killStreakTimer <= 0) {
        s.killStreak = 0;
        s.scoreMultiplier = 1;
      }
    }
    if (s.streakBannerTimer > 0)
      s.streakBannerTimer = Math.max(0, s.streakBannerTimer - dt);
    // Enemy muzzle flash timers
    for (const e of s.enemies) {
      if (e.muzzleFlashTimer > 0)
        e.muzzleFlashTimer = Math.max(0, e.muzzleFlashTimer - dt);
    }
    if ((keys.has("Space") || keys.has("Enter")) && s.hShootCooldown <= 0)
      heroShoot(s);
    if (keys.has("KeyB") && s.hBombs > 0) {
      keys.delete("KeyB");
      throwBomb(s);
    }

    // Auto-aim at nearest enemy when shooting
    const alive = s.enemies.filter((e) => !e.dead);
    if ((keys.has("Space") || keys.has("Enter")) && alive.length > 0) {
      const nearest = alive.reduce((b, e) =>
        Math.hypot(e.x - s.hx, e.y - s.hy) < Math.hypot(b.x - s.hx, b.y - s.hy)
          ? e
          : b,
      );
      const nearDist = Math.hypot(nearest.x - s.hx, nearest.y - s.hy);
      if (nearDist < 400)
        s.hAngle = Math.atan2(nearest.y - s.hy, nearest.x - s.hx);
    }

    const lsm = 1 + (s.level - 1) * 0.08;
    for (const e of s.enemies) {
      if (e.dead) continue;
      e.shootCooldown = Math.max(0, e.shootCooldown - dt);
      e.alertTimer = Math.max(0, e.alertTimer - dt);
      const dx = s.hx - e.x;
      const dy = s.hy - e.y;
      const dist = Math.hypot(dx, dy);
      const fightDist = e.isBoss ? BOSS_FIGHT_DIST : FIGHT_DIST;
      const speed = (e.isBoss ? 100 : 140) * lsm;
      if (dist < fightDist) {
        e.state = "fight";
        const moveRatio = e.isBoss ? 0.25 : 0;
        e.vx = e.isBoss ? (dx / dist) * speed * moveRatio : 0;
        e.vy = e.isBoss ? (dy / dist) * speed * moveRatio : 0;
        if (e.shootCooldown <= 0) {
          enemyShoot(s, e);
          e.shootCooldown = e.isBoss ? 0.6 : 1.2 + Math.random();
        }
        e.alertTimer = 0.4;
        e.angle = Math.atan2(dy, dx);
      } else if (dist < FLEE_DIST) {
        e.state = "flee";
        const fleeAngle = Math.atan2(-dy, -dx) + (Math.random() - 0.5) * 0.8;
        e.vx = Math.cos(fleeAngle) * speed * 1.2;
        e.vy = Math.sin(fleeAngle) * speed * 1.2;
        e.hideX = Math.max(
          50,
          Math.min(WORLD_W - 50, e.x + Math.cos(fleeAngle) * 250),
        );
        e.hideY = Math.max(
          50,
          Math.min(WORLD_H - 50, e.y + Math.sin(fleeAngle) * 250),
        );
        e.alertTimer = 0.4;
        e.angle = fleeAngle + Math.PI;
      } else {
        e.state = "patrol";
        const dToHideX = e.hideX - e.x;
        const dToHideY = e.hideY - e.y;
        const dToHide = Math.hypot(dToHideX, dToHideY);
        if (dToHide > 30) {
          e.vx = (dToHideX / dToHide) * speed * 0.45;
          e.vy = (dToHideY / dToHide) * speed * 0.45;
          e.angle = Math.atan2(dToHideY, dToHideX);
        } else {
          if (Math.random() < 0.006) {
            e.hideX = 100 + Math.random() * (WORLD_W - 200);
            e.hideY = 100 + Math.random() * (WORLD_H - 200);
          }
          e.vx = 0;
          e.vy = 0;
        }
      }
      e.x = Math.max(50, Math.min(WORLD_W - 50, e.x + e.vx * dt));
      e.y = Math.max(50, Math.min(WORLD_H - 50, e.y + e.vy * dt));
    }

    // NPCs wander
    for (const npc of s.npcs) {
      npc.walkTimer -= dt;
      if (npc.walkTimer <= 0) {
        npc.vx = (Math.random() - 0.5) * 50;
        npc.vy = (Math.random() - 0.5) * 50;
        npc.walkTimer = 2 + Math.random() * 3;
      }
      npc.x = Math.max(50, Math.min(WORLD_W - 50, npc.x + npc.vx * dt));
      npc.y = Math.max(50, Math.min(WORLD_H - 50, npc.y + npc.vy * dt));
      const dNpc = Math.hypot(s.hx - npc.x, s.hy - npc.y);
      if (dNpc < 120) {
        npc.showBubble = true;
        npc.bubbleTimer = 3;
      }
      if (npc.bubbleTimer > 0) {
        npc.bubbleTimer -= dt;
        if (npc.bubbleTimer <= 0) npc.showBubble = false;
      }
    }

    // Pickups
    for (const pu of s.pickups) {
      pu.pulseTimer += dt * 3;
    }
    for (const p of s.pickups) {
      if (p.collected) continue;
      if (Math.hypot(s.hx - p.x, s.hy - p.y) < 24) {
        p.collected = true;
        if (p.type === "health") {
          s.hhp = Math.min(s.maxHhp, s.hhp + 40);
          spawnFloatingText(s, p.x, p.y, "+40 HP", "#44ff88");
        } else if (p.type === "speed") {
          s.speedBoostTimer = 6.0;
          spawnFloatingText(s, p.x, p.y, "SPEED BOOST!", "#44ffff");
        } else if (p.type === "ammo") {
          s.hBombs = Math.min(5, s.hBombs + 2);
          spawnFloatingText(s, p.x, p.y, "+2 BOMBS", "#ff9900");
        }
      }
    }
    s.pickups = s.pickups.filter((p) => !p.collected);

    // Bullets
    for (const b of s.bullets) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
    }
    for (const b of s.bullets) {
      if (b.life <= 0) continue;
      if (b.fromPlayer) {
        for (const e of s.enemies) {
          if (e.dead) continue;
          if (
            Math.hypot(b.x - e.x, b.y - e.y) <
            (e.isBoss ? BOSS_RADIUS : CHAR_RADIUS) + 6
          ) {
            e.hp -= 20;
            b.life = 0;
            spawnParticles(s, e.x, e.y, "#ff4400", 6);
            spawnFloatingText(s, e.x, e.y - 20, "20", "#ffee00");
            playHit(s.muted);
            if (e.hp <= 0) {
              e.dead = true;
              // Kill streak
              s.killStreak++;
              s.killStreakTimer = 3.0;
              if (s.killStreak >= 7) {
                s.scoreMultiplier = 4;
                s.streakBannerText = "UNSTOPPABLE! x4";
                s.streakBannerTimer = 2.0;
              } else if (s.killStreak >= 5) {
                s.scoreMultiplier = 3;
                s.streakBannerText = "KILLING SPREE! x3";
                s.streakBannerTimer = 2.0;
              } else if (s.killStreak >= 3) {
                s.scoreMultiplier = 2;
                s.streakBannerText = "TRIPLE KILL! x2";
                s.streakBannerTimer = 2.0;
              }
              const baseScore = e.isBoss ? 500 : 50;
              s.score += baseScore * s.scoreMultiplier;
              if (e.isBoss) {
                s.totalBossesKilled++;
                playBossAlert(s.muted);
                spawnParticles(s, e.x, e.y, "#ff8800", 20);
                spawnFloatingText(
                  s,
                  e.x,
                  e.y - 30,
                  "BOSS DOWN! +500",
                  "#ffd700",
                );
              } else {
                spawnFloatingText(s, e.x, e.y - 25, "ELIMINATED!", "#ff4444");
              }
            }
            break;
          }
        }
      } else {
        if (
          s.invincTimer <= 0 &&
          Math.hypot(b.x - s.hx, b.y - s.hy) < HERO_RADIUS + 6
        ) {
          s.hhp -= 15;
          b.life = 0;
          s.invincTimer = 0.5;
          s.screenShake = 0.3;
          spawnParticles(s, s.hx, s.hy, "#ff0000", 5);
          playHit(s.muted);
          if (s.hhp <= 0) s.phase = "gameover";
        }
      }
    }
    s.bullets = s.bullets.filter((b) => b.life > 0);

    // Bombs
    for (const bomb of s.bombs) {
      if (bomb.exploded) {
        bomb.explodeTime += dt;
        continue;
      }
      bomb.timer -= dt;
      bomb.x += (bomb.tx - bomb.x) * dt * 4;
      bomb.y += (bomb.ty - bomb.y) * dt * 4;
      if (bomb.timer <= 0) {
        bomb.exploded = true;
        bomb.x = bomb.tx;
        bomb.y = bomb.ty;
        bomb.explodeTime = 0;
        s.screenShake = 0.8;
        playExplosion(s.muted);
        for (const e of s.enemies) {
          if (e.dead) continue;
          if (Math.hypot(bomb.x - e.x, bomb.y - e.y) < BOMB_RADIUS) {
            e.hp -= 120;
            if (e.hp <= 0) {
              e.dead = true;
              s.score += e.isBoss ? 500 : 50;
              if (e.isBoss) {
                s.totalBossesKilled++;
                playBossAlert(s.muted);
              }
            }
            spawnParticles(s, e.x, e.y, "#ff6600", 10);
          }
        }
        for (const b of s.buildings) {
          if (
            Math.hypot(bomb.x - (b.x + b.w / 2), bomb.y - (b.y + b.h / 2)) <
            BOMB_RADIUS * 1.2
          ) {
            b.onFire = true;
            b.fireTimer = 5;
          }
        }
        spawnParticles(s, bomb.x, bomb.y, "#ffcc00", 25);
      }
    }
    s.bombs = s.bombs.filter((b) => !b.exploded || b.explodeTime < 0.8);
    for (const b of s.buildings) {
      if (b.onFire) {
        b.fireTimer -= dt;
        if (b.fireTimer <= 0) b.onFire = false;
      }
    }

    // Particles
    for (const p of s.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      p.vy += 60 * dt;
    }
    s.particles = s.particles.filter((p) => p.life > 0);

    // Shell casings
    for (const sc of s.shellCasings) {
      sc.x += sc.vx * dt;
      sc.y += sc.vy * dt;
      sc.vy += 200 * dt;
      sc.angle += sc.spin * dt;
      sc.life -= dt;
    }
    s.shellCasings = s.shellCasings.filter((sc) => sc.life > 0);

    // Floating texts
    for (const ft of s.floatingTexts) {
      ft.y += ft.vy * dt;
      ft.life -= dt;
    }
    s.floatingTexts = s.floatingTexts.filter((ft) => ft.life > 0);

    // Level clear
    const allDead = s.enemies.filter((e) => !e.dead).length === 0;
    if (allDead) {
      if (s.level >= MAX_LEVEL) {
        s.phase = "win";
        return;
      }
      s.level++;
      updateMusicLevel(s.level);
      s.levelTitle = LEVEL_TITLES[s.level] ?? `LEVEL ${s.level}`;
      s.levelSplash = 2.5;
      s.buildings = generateCity(getBgTheme(s.level), s.level);
      s.npcs = generateNPCs(s.level);
      s.hx = 180;
      s.hy = 180;
      s.camX = 0;
      s.camY = 0;
      s.hhp = Math.min(s.maxHhp, s.hhp + 40);
      const { enemies, nextId } = spawnLevelEnemies(s.level, s.idCounter);
      s.enemies = enemies;
      s.idCounter = nextId;
      s.bullets = [];
      s.bombs = [];
      const { pickups: newPickups, nextId: pidNext } = spawnPickups(
        s.level,
        s.buildings,
        s.idCounter,
      );
      s.pickups = newPickups;
      s.idCounter = pidNext;
      s.floatingTexts = [];
      s.shellCasings = [];
      const bossName = BOSS_AT_LEVEL[s.level];
      if (bossName) {
        s.bossWarning = `⚠ BOSS INCOMING: ${bossName.toUpperCase()} ⚠`;
        s.bossWarningTimer = 3;
        playBossAlert(s.muted);
      }
    }
  }

  function render(
    ctx: CanvasRenderingContext2D,
    vw: number,
    vh: number,
    s: GameState,
  ) {
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, vw, vh);
    ctx.save();
    if (s.screenShake > 0) {
      ctx.translate(
        (Math.random() - 0.5) * s.screenShake * 12,
        (Math.random() - 0.5) * s.screenShake * 12,
      );
    }
    const theme = getBgTheme(s.level);
    drawCity(ctx, s.camX, s.camY, vw, vh, theme, s.buildings, s.level);

    // NPCs
    for (const npc of s.npcs) {
      const nx = npc.x - s.camX;
      const ny = npc.y - s.camY;
      if (nx < -30 || nx > vw + 30 || ny < -30 || ny > vh + 30) continue;
      drawNPCTopDown(ctx, nx, ny, npc.type, npc.hint, npc.showBubble);
    }

    // Enemies
    for (const e of s.enemies) {
      if (e.dead) continue;
      const esx = e.x - s.camX;
      const esy = e.y - s.camY;
      if (esx < -80 || esx > vw + 80 || esy < -80 || esy > vh + 80) continue;
      const r = e.isBoss ? BOSS_RADIUS : CHAR_RADIUS;
      // Draw sprite or fallback circle
      const bossSprite: Record<string, HTMLImageElement | null> = {
        "Rehman Dakait": spriteRehman.current,
        "SP Aslam Choudhury": spriteSpAslam.current,
        "Major Iqbal": spriteMajorIqbal.current,
        "Jameel Jamali": spriteJameel.current,
      };
      const enemyImg = e.isBoss
        ? (bossSprite[e.name] ?? null)
        : spriteGrunt.current;
      const sw = e.isBoss ? 90 : 64;
      const sh = e.isBoss ? 144 : 102;
      ctx.save();
      // Shadow
      ctx.beginPath();
      ctx.ellipse(esx, esy + sh / 2 - 8, sw * 0.35, 8, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.fill();
      // Direction flip
      const facingLeft = e.angle > Math.PI / 2 && e.angle < (3 * Math.PI) / 2;
      if (facingLeft) {
        ctx.translate(esx, esy);
        ctx.scale(-1, 1);
        ctx.translate(-esx, -esy);
      }
      if (enemyImg?.complete && enemyImg.naturalWidth > 0) {
        ctx.drawImage(enemyImg, esx - sw / 2, esy - sh / 2, sw, sh);
      } else {
        ctx.beginPath();
        ctx.arc(esx, esy, r, 0, Math.PI * 2);
        ctx.fillStyle = e.color;
        ctx.fill();
      }
      ctx.restore();
      // Health bar
      const bw = sw;
      const bx = esx - bw / 2;
      const by2 = esy - sh / 2 - 10;
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(bx, by2, bw, 6);
      ctx.fillStyle =
        e.hp > e.maxHp * 0.5
          ? "#44ee44"
          : e.hp > e.maxHp * 0.25
            ? "#eeaa00"
            : "#ee2222";
      ctx.fillRect(bx, by2, bw * (e.hp / e.maxHp), 6);
      // Boss dialog
      if (e.isBoss && e.alertTimer > 0) {
        const dialog = BOSS_DIALOG[e.name] ?? "You won't beat me!";
        const bw = Math.max(140, dialog.length * 6.5);
        const bx = esx - bw / 2;
        const by = esy - r - 36;
        ctx.fillStyle = "rgba(200,0,0,0.85)";
        ctx.beginPath();
        ctx.roundRect(bx, by, bw, 18, 4);
        ctx.fill();
        ctx.fillStyle = "white";
        ctx.font = "bold 9px Arial";
        ctx.textAlign = "center";
        ctx.fillText(dialog, esx, by + 13);
      }
    }

    // Hero
    const heroSx = s.hx - s.camX;
    const heroSy = s.hy - s.camY;
    const heroAlpha =
      s.invincTimer > 0 ? (Math.sin(s.invincTimer * 20) > 0 ? 0.4 : 1) : 1;
    // Draw hero sprite
    const heroImg =
      s.hero === "humza" ? spriteHumza.current : spriteAjay.current;
    const hsw = 80;
    const hsh = 128;
    ctx.save();
    ctx.globalAlpha = heroAlpha;
    // Shadow
    ctx.beginPath();
    ctx.ellipse(heroSx, heroSy + hsh / 2 - 8, hsw * 0.35, 8, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.fill();
    // Direction flip
    const heroFacingLeft =
      s.hAngle > Math.PI / 2 && s.hAngle < (3 * Math.PI) / 2;
    if (heroFacingLeft) {
      ctx.translate(heroSx, heroSy);
      ctx.scale(-1, 1);
      ctx.translate(-heroSx, -heroSy);
    }
    if (heroImg?.complete && heroImg.naturalWidth > 0) {
      ctx.drawImage(heroImg, heroSx - hsw / 2, heroSy - hsh / 2, hsw, hsh);
    } else {
      ctx.beginPath();
      ctx.arc(heroSx, heroSy, HERO_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = s.hero === "humza" ? "#1a3a8a" : "#1a6a1a";
      ctx.fill();
    }
    ctx.restore();

    // Muzzle flash
    if (s.muzzleFlashTimer > 0) {
      const flashIntensity = s.muzzleFlashTimer / 0.1;
      const muzzleOffset = 44;
      const muzzleX =
        heroSx +
        Math.cos(s.hAngle) * (heroFacingLeft ? -muzzleOffset : muzzleOffset);
      const muzzleY = heroSy + Math.sin(s.hAngle) * muzzleOffset - 10;
      ctx.save();
      ctx.globalAlpha = flashIntensity * 0.9;
      // Outer glow
      const grad = ctx.createRadialGradient(
        muzzleX,
        muzzleY,
        0,
        muzzleX,
        muzzleY,
        28,
      );
      grad.addColorStop(0, "rgba(255,255,180,1)");
      grad.addColorStop(0.3, "rgba(255,180,0,0.85)");
      grad.addColorStop(0.7, "rgba(255,80,0,0.4)");
      grad.addColorStop(1, "rgba(255,0,0,0)");
      ctx.beginPath();
      ctx.arc(muzzleX, muzzleY, 28, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
      // Bright core
      ctx.beginPath();
      ctx.arc(muzzleX, muzzleY, 7, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,220,1)";
      ctx.fill();
      // Star spikes
      ctx.strokeStyle = "rgba(255,220,80,0.85)";
      ctx.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(muzzleX, muzzleY);
        ctx.lineTo(
          muzzleX + Math.cos(a) * 22 * flashIntensity,
          muzzleY + Math.sin(a) * 22 * flashIntensity,
        );
        ctx.stroke();
      }
      ctx.restore();
    }

    // Bullets (realistic bullet shape)
    for (const b of s.bullets) {
      const bsx = b.x - s.camX;
      const bsy = b.y - s.camY;
      const angle = Math.atan2(b.vy, b.vx);
      ctx.save();
      ctx.translate(bsx, bsy);
      ctx.rotate(angle);
      // Bullet casing (brass/gold body)
      const casingW = 10;
      const casingH = 4;
      ctx.beginPath();
      ctx.rect(-casingW * 0.6, -casingH / 2, casingW, casingH);
      ctx.fillStyle = b.fromPlayer ? "#c8a020" : "#a03010";
      ctx.fill();
      // Bullet tip (rounded nose - silver/lead)
      ctx.beginPath();
      ctx.ellipse(
        casingW * 0.4 + 3,
        0,
        5,
        casingH / 2,
        0,
        -Math.PI / 2,
        Math.PI / 2,
      );
      ctx.fillStyle = b.fromPlayer ? "#d0d0d0" : "#c04040";
      ctx.fill();
      // Casing rim at base
      ctx.beginPath();
      ctx.rect(-casingW * 0.6 - 2, -casingH / 2 - 1, 3, casingH + 2);
      ctx.fillStyle = b.fromPlayer ? "#8a6010" : "#6a1a00";
      ctx.fill();
      // Glint highlight on casing
      ctx.beginPath();
      ctx.rect(-casingW * 0.4, -casingH / 2 + 1, casingW * 0.5, 1);
      ctx.fillStyle = "rgba(255,255,200,0.5)";
      ctx.fill();
      ctx.restore();
    }

    // Bombs
    for (const bomb of s.bombs) {
      const bsx = bomb.x - s.camX;
      const bsy = bomb.y - s.camY;
      if (!bomb.exploded) {
        ctx.font = "20px Arial";
        ctx.textAlign = "center";
        ctx.fillText("💣", bsx, bsy);
      } else if (bomb.explodeTime < 0.6) {
        const r = BOMB_RADIUS * (bomb.explodeTime / 0.6);
        const alpha = 1 - bomb.explodeTime / 0.6;
        const eg = ctx.createRadialGradient(bsx, bsy, 0, bsx, bsy, r);
        eg.addColorStop(0, `rgba(255,255,150,${alpha})`);
        eg.addColorStop(0.4, `rgba(255,100,0,${alpha * 0.8})`);
        eg.addColorStop(1, "rgba(255,0,0,0)");
        ctx.beginPath();
        ctx.arc(bsx, bsy, r, 0, Math.PI * 2);
        ctx.fillStyle = eg;
        ctx.fill();
      }
    }

    // Particles
    for (const p of s.particles) {
      const psx = p.x - s.camX;
      const psy = p.y - s.camY;
      const alpha = p.life / p.maxLife;
      ctx.beginPath();
      ctx.arc(psx, psy, p.size, 0, Math.PI * 2);
      ctx.fillStyle =
        p.color +
        Math.floor(alpha * 255)
          .toString(16)
          .padStart(2, "0");
      ctx.fill();
    }

    // Shell casings
    for (const sc of s.shellCasings) {
      const scx = sc.x - s.camX;
      const scy = sc.y - s.camY;
      const alpha = sc.life / sc.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(scx, scy);
      ctx.rotate(sc.angle);
      ctx.fillStyle = "#c8a020";
      ctx.fillRect(-2, -1, 4, 2);
      ctx.restore();
    }

    // Pickups
    const pt = performance.now() / 1000;
    for (const p of s.pickups) {
      if (p.collected) continue;
      const px = p.x - s.camX;
      const py = p.y - s.camY;
      if (px < -30 || px > vw + 30 || py < -30 || py > vh + 30) continue;
      const pulse = 0.85 + Math.sin(p.pulseTimer) * 0.15;
      const r = 14 * pulse;
      ctx.save();
      // Glow
      const glowGrad = ctx.createRadialGradient(px, py, 0, px, py, r * 2);
      if (p.type === "health") {
        glowGrad.addColorStop(0, "rgba(255,80,80,0.4)");
        glowGrad.addColorStop(1, "rgba(255,0,0,0)");
      } else if (p.type === "speed") {
        glowGrad.addColorStop(0, "rgba(0,255,255,0.4)");
        glowGrad.addColorStop(1, "rgba(0,200,200,0)");
      } else {
        glowGrad.addColorStop(0, "rgba(255,160,0,0.4)");
        glowGrad.addColorStop(1, "rgba(255,100,0,0)");
      }
      ctx.beginPath();
      ctx.arc(px, py, r * 2, 0, Math.PI * 2);
      ctx.fillStyle = glowGrad;
      ctx.fill();
      // Circle
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fillStyle =
        p.type === "health"
          ? "#fff"
          : p.type === "speed"
            ? "#001a1a"
            : "#1a0800";
      ctx.fill();
      ctx.strokeStyle =
        p.type === "health"
          ? "#ff4444"
          : p.type === "speed"
            ? "#00ffff"
            : "#ff9900";
      ctx.lineWidth = 2;
      ctx.stroke();
      // Icon
      ctx.fillStyle =
        p.type === "health"
          ? "#ff2222"
          : p.type === "speed"
            ? "#00ffff"
            : "#ff9900";
      ctx.font = `bold ${Math.floor(r * 1.1)}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      if (p.type === "health") {
        ctx.fillText("+", px, py);
      } else if (p.type === "speed") {
        ctx.fillText("⚡", px, py);
      } else {
        ctx.fillText("💣", px, py);
      }
      ctx.textBaseline = "alphabetic";
      ctx.restore();
    }

    // Enemy muzzle flashes
    for (const e of s.enemies) {
      if (e.dead || e.muzzleFlashTimer <= 0) continue;
      const esx = e.x - s.camX;
      const esy = e.y - s.camY;
      const flashI = e.muzzleFlashTimer / 0.08;
      const muzzleOffset = 20;
      const muzzX = esx + Math.cos(e.angle) * muzzleOffset;
      const muzzY = esy + Math.sin(e.angle) * muzzleOffset;
      ctx.save();
      ctx.globalAlpha = flashI * 0.85;
      const eg = ctx.createRadialGradient(muzzX, muzzY, 0, muzzX, muzzY, 16);
      eg.addColorStop(0, "rgba(255,200,80,1)");
      eg.addColorStop(0.5, "rgba(255,100,0,0.7)");
      eg.addColorStop(1, "rgba(255,0,0,0)");
      ctx.beginPath();
      ctx.arc(muzzX, muzzY, 16, 0, Math.PI * 2);
      ctx.fillStyle = eg;
      ctx.fill();
      ctx.restore();
    }

    // Low HP red vignette
    if (s.hhp < s.maxHhp * 0.3) {
      const vigAlpha = Math.sin(pt * 5) * 0.15 + 0.2;
      const vigGrad = ctx.createRadialGradient(
        vw / 2,
        vh / 2,
        vh * 0.3,
        vw / 2,
        vh / 2,
        vh * 0.85,
      );
      vigGrad.addColorStop(0, "rgba(200,0,0,0)");
      vigGrad.addColorStop(1, `rgba(200,0,0,${vigAlpha})`);
      ctx.fillStyle = vigGrad;
      ctx.fillRect(0, 0, vw, vh);
    }

    // Floating texts
    for (const ft of s.floatingTexts) {
      const ftx = ft.x - s.camX;
      const fty = ft.y - s.camY;
      const alpha = ft.life / ft.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = "bold 14px Arial";
      ctx.textAlign = "center";
      ctx.strokeStyle = "rgba(0,0,0,0.8)";
      ctx.lineWidth = 3;
      ctx.strokeText(ft.text, ftx, fty);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ftx, fty);
      ctx.restore();
    }

    ctx.restore();

    drawHUD(ctx, vw, vh, s);
    drawMinimap(ctx, vw, vh, s);

    if (s.levelSplash > 0) {
      const alpha = Math.min(s.levelSplash, 1);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "rgba(0,0,0,0.82)";
      ctx.fillRect(0, vh / 2 - 80, vw, 160);
      ctx.fillStyle = "#ffd700";
      ctx.font = `bold ${Math.floor(vw * 0.09)}px serif`;
      ctx.textAlign = "center";
      ctx.shadowBlur = 30;
      ctx.shadowColor = "#ff8800";
      ctx.fillText(`LEVEL ${s.level}`, vw / 2, vh / 2 - 10);
      ctx.font = `bold ${Math.floor(vw * 0.036)}px serif`;
      ctx.fillStyle = "#ff9900";
      ctx.shadowBlur = 0;
      ctx.fillText(s.levelTitle, vw / 2, vh / 2 + 40);
      ctx.globalAlpha = 1;
    }
    if (s.bossWarningTimer > 0) {
      const alpha = Math.min(s.bossWarningTimer, 1);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "rgba(100,0,0,0.9)";
      ctx.fillRect(0, vh * 0.14, vw, 60);
      ctx.fillStyle = "#ff5555";
      ctx.font = `bold ${Math.floor(vw * 0.046)}px serif`;
      ctx.textAlign = "center";
      ctx.shadowBlur = 20;
      ctx.shadowColor = "#ff0000";
      ctx.fillText(s.bossWarning, vw / 2, vh * 0.14 + 42);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }
    // Streak banner
    if (s.streakBannerTimer > 0) {
      const sba = Math.min(s.streakBannerTimer, 1);
      ctx.globalAlpha = sba;
      const bannerColor =
        s.scoreMultiplier >= 4
          ? "#ff44ff"
          : s.scoreMultiplier >= 3
            ? "#ff6600"
            : "#ffee00";
      ctx.fillStyle = "rgba(0,0,0,0.85)";
      ctx.fillRect(vw / 2 - 160, vh * 0.58, 320, 44);
      ctx.fillStyle = bannerColor;
      ctx.font = `bold ${Math.floor(vw * 0.045)}px serif`;
      ctx.textAlign = "center";
      ctx.shadowBlur = 20;
      ctx.shadowColor = bannerColor;
      ctx.fillText(s.streakBannerText, vw / 2, vh * 0.58 + 32);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = "white";
    ctx.font = "11px Arial";
    ctx.textAlign = "center";
    ctx.fillText(
      "© Priyanka Sharma | priyankadsharma11@gmail.com",
      vw / 2,
      vh / 2,
    );
    ctx.globalAlpha = 1;
  }

  function drawHUD(
    ctx: CanvasRenderingContext2D,
    vw: number,
    vh: number,
    s: GameState,
  ) {
    ctx.fillStyle = "rgba(0,0,0,0.75)";
    ctx.fillRect(0, 0, vw, 56);
    ctx.fillStyle = "#ffd700";
    ctx.font = "bold 12px serif";
    ctx.textAlign = "left";
    ctx.fillText(
      s.hero === "humza" ? "Humza Ali Mazari" : "Ajay Sanyal",
      10,
      18,
    );
    const hpW = 160;
    ctx.fillStyle = "#333";
    ctx.fillRect(10, 24, hpW, 12);
    const hpR = s.hhp / s.maxHhp;
    ctx.fillStyle = hpR > 0.6 ? "#00e060" : hpR > 0.3 ? "#ffaa00" : "#ff2200";
    ctx.fillRect(10, 24, hpW * hpR, 12);
    ctx.strokeStyle = "#ffd700";
    ctx.lineWidth = 1;
    ctx.strokeRect(10, 24, hpW, 12);
    ctx.fillStyle = "white";
    ctx.font = "9px Arial";
    ctx.fillText(`${s.hhp}/${s.maxHhp}`, 14, 34);
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = "#ffd700";
    ctx.font = `bold ${Math.floor(vw * 0.038)}px serif`;
    ctx.textAlign = "center";
    ctx.shadowBlur = 8;
    ctx.shadowColor = "#ff8800";
    ctx.fillText("DHURANDHAR", vw / 2, 20);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#ff9900";
    ctx.font = "11px Arial";
    ctx.fillText(`LEVEL ${s.level}/${MAX_LEVEL} — ${s.levelTitle}`, vw / 2, 38);
    ctx.textAlign = "right";
    ctx.fillStyle = "white";
    ctx.font = "bold 11px Arial";
    ctx.fillText(
      `Enemies: ${s.enemies.filter((e) => !e.dead && !e.isBoss).length}  Bosses: ${s.enemies.filter((e) => !e.dead && e.isBoss).length}`,
      vw - 10,
      20,
    );
    ctx.fillStyle = "#ffd700";
    ctx.fillText(`💣 x${s.hBombs}  Score: ${s.score}`, vw - 10, 38);
    // Kill streak display
    if (s.killStreak >= 2) {
      ctx.fillStyle =
        s.killStreak >= 7
          ? "#ff44ff"
          : s.killStreak >= 5
            ? "#ff6600"
            : "#ffcc00";
      ctx.font = "bold 10px Arial";
      ctx.fillText(
        `🔥 STREAK x${s.killStreak}  MULT x${s.scoreMultiplier}`,
        vw - 10,
        52,
      );
    }
    ctx.fillStyle = "rgba(0,0,0,0.85)";
    ctx.fillRect(0, vh - 22, vw, 22);
    ctx.fillStyle = "#ffd700";
    ctx.font = "9px Arial";
    ctx.textAlign = "center";
    ctx.fillText(
      "© 2026 Dhurandhar | Priyanka Sharma | priyankadsharma11@gmail.com | All Rights Reserved",
      vw / 2,
      vh - 6,
    );
  }

  function drawMinimap(
    ctx: CanvasRenderingContext2D,
    vw: number,
    vh: number,
    s: GameState,
  ) {
    const mm = { x: vw - 148, y: vh - 172, w: 138, h: 120 };
    ctx.fillStyle = "rgba(0,0,0,0.72)";
    ctx.fillRect(mm.x, mm.y, mm.w, mm.h);
    ctx.strokeStyle = "#ffd700";
    ctx.lineWidth = 1;
    ctx.strokeRect(mm.x, mm.y, mm.w, mm.h);
    const toMM = (wx: number, wy: number) => ({
      x: mm.x + (wx / WORLD_W) * mm.w,
      y: mm.y + (wy / WORLD_H) * mm.h,
    });
    // Buildings on minimap
    ctx.fillStyle = "rgba(120,100,60,0.5)";
    for (const b of s.buildings) {
      const p = toMM(b.x, b.y);
      ctx.fillRect(p.x, p.y, (b.w / WORLD_W) * mm.w, (b.h / WORLD_H) * mm.h);
    }
    // Enemies
    for (const e of s.enemies) {
      if (e.dead) continue;
      const p = toMM(e.x, e.y);
      if (e.isBoss) {
        const flash = Math.floor(performance.now() / 300) % 2 === 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = flash ? "#ff8800" : "#ff0000";
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = "#ff4444";
        ctx.fill();
      }
    }
    // Hero
    const pp = toMM(s.hx, s.hy);
    ctx.beginPath();
    ctx.arc(pp.x, pp.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#4488ff";
    ctx.fill();
    ctx.strokeStyle = "white";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = "#ffd700";
    ctx.font = "9px Arial";
    ctx.textAlign = "center";
    ctx.fillText("MINIMAP", mm.x + mm.w / 2, mm.y - 3);
  }

  function handleJoystickStart(e: React.TouchEvent) {
    const t = e.changedTouches[0];
    joystickRef.current = {
      active: true,
      cx: t.clientX,
      cy: t.clientY,
      dx: 0,
      dy: 0,
    };
  }
  function handleJoystickMove(e: React.TouchEvent) {
    if (!joystickRef.current.active) return;
    e.preventDefault();
    const t = e.changedTouches[0];
    const dx = t.clientX - joystickRef.current.cx;
    const dy = t.clientY - joystickRef.current.cy;
    const maxR = 42;
    const len = Math.sqrt(dx * dx + dy * dy);
    joystickRef.current.dx = len > maxR ? dx / len : dx / maxR;
    joystickRef.current.dy = len > maxR ? dy / len : dy / maxR;
  }
  function handleJoystickEnd() {
    joystickRef.current = { active: false, cx: 0, cy: 0, dx: 0, dy: 0 };
  }
  function handleFireBtn() {
    if (stateRef.current) heroShoot(stateRef.current);
  }
  function handleBombBtn() {
    if (stateRef.current) throwBomb(stateRef.current);
  }
  function handleMuteBtn() {
    if (!stateRef.current) return;
    stateRef.current.muted = !stateRef.current.muted;
    setMuted(stateRef.current.muted);
    if (stateRef.current.muted) stopDrone();
    else startDrone(false);
  }

  useEffect(() => {
    if (phase !== "menu" && phase !== "win" && phase !== "gameover") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, vw, vh);
    // Draw city bg for menu
    const bg = ctx.createLinearGradient(0, 0, 0, vh);
    bg.addColorStop(0, "#0a1530");
    bg.addColorStop(0.4, "#c87030");
    bg.addColorStop(1, "#3a2010");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, vw, vh);
    // City blocks
    ctx.fillStyle = "#888070";
    for (let i = 0; i < 6; i++)
      for (let j = 0; j < 4; j++) {
        const bw = vw / 7;
        const bh = vh / 5;
        ctx.fillStyle = j % 2 === 0 ? "#c0a870" : "#9a7848";
        ctx.fillRect(i * (bw + 14) + 7, j * (bh + 12) + 6, bw, bh);
      }
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(0, 0, vw, vh);
    if (phase === "menu") {
      ctx.fillStyle = "#ffd700";
      ctx.font = `bold ${Math.floor(vw * 0.1)}px serif`;
      ctx.textAlign = "center";
      ctx.shadowBlur = 40;
      ctx.shadowColor = "#ff8800";
      ctx.fillText("DHURANDHAR", vw / 2, vh * 0.28);
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#ff9900";
      ctx.font = `${Math.floor(vw * 0.024)}px serif`;
      ctx.fillText("Save the Country — 20 Levels of Battle", vw / 2, vh * 0.36);
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.font = "12px Arial";
      ctx.fillText(
        "© 2026 Priyanka Sharma | priyankadsharma11@gmail.com",
        vw / 2,
        vh * 0.42,
      );
    } else if (phase === "win") {
      ctx.fillStyle = "#ffd700";
      ctx.font = `bold ${Math.floor(vw * 0.065)}px serif`;
      ctx.textAlign = "center";
      ctx.shadowBlur = 30;
      ctx.shadowColor = "#ff8800";
      ctx.fillText("DHURANDHAR COMPLETE! 🏆", vw / 2, vh * 0.27);
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#00ff88";
      ctx.font = `${Math.floor(vw * 0.035)}px serif`;
      ctx.fillText("Country Saved! All Villains Defeated!", vw / 2, vh * 0.38);
      const ss = stateRef.current;
      if (ss) {
        ctx.fillStyle = "white";
        ctx.font = "17px Arial";
        ctx.fillText(
          `Final Score: ${ss.score}  |  Bosses Killed: ${ss.totalBossesKilled}`,
          vw / 2,
          vh * 0.48,
        );
      }
    } else {
      ctx.fillStyle = "#ff2200";
      ctx.font = `bold ${Math.floor(vw * 0.09)}px serif`;
      ctx.textAlign = "center";
      ctx.shadowBlur = 30;
      ctx.shadowColor = "#ff0000";
      ctx.fillText("GAME OVER", vw / 2, vh * 0.35);
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#ff9900";
      ctx.font = "17px Arial";
      ctx.fillText("The country needs you. Try again!", vw / 2, vh * 0.46);
    }
    ctx.fillStyle = "rgba(0,0,0,0.85)";
    ctx.fillRect(0, vh - 22, vw, 22);
    ctx.fillStyle = "#ffd700";
    ctx.font = "9px Arial";
    ctx.textAlign = "center";
    ctx.fillText(
      "© 2026 Dhurandhar | Priyanka Sharma | priyankadsharma11@gmail.com | All Rights Reserved",
      vw / 2,
      vh - 6,
    );
  }, [phase]);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      <canvas
        ref={canvasRef}
        className="block w-full h-full"
        style={{ touchAction: "none" }}
      />
      {phase === "menu" && (
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-14 pointer-events-none">
          <div className="pointer-events-auto flex flex-col items-center gap-5">
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setHero("humza")}
                className={`px-5 py-3 rounded-lg font-bold text-base transition-all border-2 ${
                  hero === "humza"
                    ? "bg-yellow-500 text-black border-yellow-300 scale-105"
                    : "bg-black/60 text-yellow-400 border-yellow-600"
                }`}
              >
                Humza Ali Mazari
              </button>
              <button
                type="button"
                onClick={() => setHero("ajay")}
                className={`px-5 py-3 rounded-lg font-bold text-base transition-all border-2 ${
                  hero === "ajay"
                    ? "bg-yellow-500 text-black border-yellow-300 scale-105"
                    : "bg-black/60 text-yellow-400 border-yellow-600"
                }`}
              >
                Ajay Sanyal
              </button>
            </div>
            <button
              type="button"
              onClick={() => startGame(hero)}
              className="px-12 py-4 bg-gradient-to-b from-yellow-400 to-orange-600 text-black font-black text-2xl rounded-xl shadow-2xl hover:from-yellow-300 active:scale-95 transition-all uppercase tracking-widest"
            >
              START GAME
            </button>
            <p className="text-yellow-600 text-sm text-center">
              WASD / Arrows to move in all directions • Space to fire • B for
              bomb
              <br />
              <span className="text-yellow-500">
                20 Levels • 4 Bosses • Major Iqbal is the Final Boss!
              </span>
            </p>
          </div>
        </div>
      )}
      {(phase === "win" || phase === "gameover") && (
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-20 pointer-events-none">
          <button
            type="button"
            onClick={() => {
              setPhase("menu");
              stateRef.current = null;
            }}
            className="pointer-events-auto px-10 py-4 bg-gradient-to-b from-yellow-400 to-orange-600 text-black font-black text-xl rounded-xl shadow-2xl hover:from-yellow-300 active:scale-95 transition-all uppercase tracking-widest"
          >
            {phase === "win" ? "PLAY AGAIN" : "TRY AGAIN"}
          </button>
        </div>
      )}
      {phase === "playing" && (
        <>
          <div
            className="absolute bottom-10 left-6 w-28 h-28 rounded-full border-2 border-yellow-500/40 bg-black/30 flex items-center justify-center select-none"
            onTouchStart={handleJoystickStart}
            onTouchMove={handleJoystickMove}
            onTouchEnd={handleJoystickEnd}
            style={{ touchAction: "none" }}
          >
            <div className="w-12 h-12 rounded-full bg-yellow-500/30 border border-yellow-400/50" />
          </div>
          <div className="absolute bottom-16 right-4 flex flex-col gap-3">
            <button
              type="button"
              onTouchStart={(e) => {
                e.preventDefault();
                handleBombBtn();
              }}
              onClick={handleBombBtn}
              className="w-16 h-16 rounded-full bg-orange-700/80 border-2 border-orange-400 text-white font-bold text-2xl flex items-center justify-center active:scale-90"
            >
              💣
            </button>
            <button
              type="button"
              onTouchStart={(e) => {
                e.preventDefault();
                handleFireBtn();
              }}
              onClick={handleFireBtn}
              className="w-20 h-20 rounded-full bg-red-700/80 border-2 border-red-400 text-white font-black text-lg flex items-center justify-center active:scale-90"
            >
              FIRE
            </button>
          </div>
          <button
            type="button"
            onClick={handleMuteBtn}
            className="absolute top-14 right-2 w-9 h-9 bg-black/50 rounded-full text-lg flex items-center justify-center"
          >
            {muted ? "🔇" : "🔊"}
          </button>
        </>
      )}
    </div>
  );
}
