import { useCallback, useEffect, useRef, useState } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

type Phase = "menu" | "playing" | "win" | "gameover";
type HeroName = "humza" | "ajay";

interface Entity {
  id: number;
  x: number; // world X
  hp: number;
  maxHp: number;
  vx: number;
  facingLeft: boolean;
  dead: boolean;
  isBoss: boolean;
  name: string;
  shootCooldown: number;
  alertTimer: number;
  state: "patrol" | "flee" | "fight";
  hideX: number; // X pos to hide behind a building
}

interface Bullet {
  id: number;
  x: number;
  y: number; // screen Y (fixed ground line)
  vx: number;
  vy: number;
  fromPlayer: boolean;
  life: number;
}

interface Bomb {
  id: number;
  x: number;
  tx: number;
  timer: number;
  exploded: boolean;
  explodeTime: number;
}

interface Building {
  x: number; // world X
  w: number;
  h: number;
  color: string;
  onFire: boolean;
  fireTimer: number;
  sign?: string;
}

interface NPC {
  id: number;
  x: number;
  type: "man" | "woman" | "soldier";
  hint: string;
  showBubble: boolean;
  bubbleTimer: number;
  vx: number;
  walkTimer: number;
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

interface GameState {
  phase: Phase;
  hero: HeroName;
  hx: number; // hero world X
  hhp: number;
  maxHhp: number;
  hvx: number;
  hFacingLeft: boolean;
  hShootCooldown: number;
  hBombs: number;
  bombRechargeTimer: number;
  level: number;
  score: number;
  totalBossesKilled: number;
  enemies: Entity[];
  bullets: Bullet[];
  bombs: Bomb[];
  particles: Particle[];
  buildings: Building[];
  npcs: NPC[];
  cameraX: number;
  screenShake: number;
  levelSplash: number;
  levelTitle: string;
  muted: boolean;
  idCounter: number;
  invincTimer: number;
}

const WORLD_W = 4000;
const _HERO_W = 56;
const HERO_H = 110;
const _ENEMY_W = 44;
const ENEMY_H = 88;
const BOSS_W = 56;
const BOSS_H = 110;
const FLEE_DIST = 280;
const FIGHT_DIST = 180;
const BOSS_FIGHT_DIST = 240;
const MOVE_SPEED = 240;
const ENEMY_SPEED = 150;
const BOSS_SPEED = 110;
const BULLET_SPEED = 480;
const BULLET_LIFE = 1.4;
const BOMB_RADIUS = 160;
// Ground line is computed per-frame from vh
const GROUND_RATIO = 0.78; // characters stand at this fraction of screen height

const BOSS_DEFS = [
  { name: "Rehman Dakait", zone: WORLD_W * 0.25, color: "#8B0000" },
  { name: "SP Aslam Choudhury", zone: WORLD_W * 0.45, color: "#00008B" },
  { name: "Major Iqbal", zone: WORLD_W * 0.65, color: "#2F4F2F" },
  { name: "Jameel Jamali", zone: WORLD_W * 0.85, color: "#8B6914" },
];

const BOSS_DIALOG = [
  "You cannot stop me, fool!",
  "I have the law on my side!",
  "You dare challenge the Major?",
  "Allah will not save you now!",
];

const NPC_HINTS = [
  "Rehman Dakait hides ahead to the east!",
  "SP Aslam lurks further east!",
  "Major Iqbal is deeper in the city!",
  "Jameel Jamali hides at the far end!",
];

// ─── Audio Engine ────────────────────────────────────────────────────────────

let audioCtx: AudioContext | null = null;
let droneNode: OscillatorNode | null = null;
let droneGain: GainNode | null = null;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}
function playShoot(muted: boolean) {
  if (muted) return;
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.08);
  } catch {}
}
function playHit(muted: boolean) {
  if (muted) return;
  try {
    const ctx = getAudioCtx();
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++)
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = ctx.createBufferSource();
    const gain = ctx.createGain();
    src.buffer = buf;
    src.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    src.start();
  } catch {}
}
function playExplosion(muted: boolean) {
  if (muted) return;
  try {
    const ctx = getAudioCtx();
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++)
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (data.length * 0.3));
    const src = ctx.createBufferSource();
    const gain = ctx.createGain();
    src.buffer = buf;
    src.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(1.0, ctx.currentTime);
    src.start();
  } catch {}
}
function playBossAlert(muted: boolean) {
  if (muted) return;
  try {
    const ctx = getAudioCtx();
    for (const t of [0, 0.15, 0.3]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 440;
      gain.gain.setValueAtTime(0.4, ctx.currentTime + t);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.14);
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + 0.14);
    }
  } catch {}
}
function startDrone(muted: boolean) {
  if (muted || droneNode) return;
  try {
    const ctx = getAudioCtx();
    droneNode = ctx.createOscillator();
    droneGain = ctx.createGain();
    droneNode.type = "sawtooth";
    droneNode.frequency.value = 55;
    droneGain.gain.value = 0.05;
    droneNode.connect(droneGain);
    droneGain.connect(ctx.destination);
    droneNode.start();
  } catch {}
}
function stopDrone() {
  if (droneNode) {
    try {
      droneNode.stop();
    } catch {}
    droneNode = null;
  }
  droneGain = null;
}

// ─── World Generator ─────────────────────────────────────────────────────────

function seededRand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function generateBuildings(): Building[] {
  const rand = seededRand(42);
  const buildings: Building[] = [];
  const colors = [
    "#c8a060",
    "#b08050",
    "#d4a870",
    "#a07040",
    "#b8926a",
    "#c0a878",
  ];
  const signs = [
    "दुकान",
    "HOTEL",
    "CHAI",
    "786",
    "SHOP",
    "BAKERY",
    "MARKET",
    "HALAL",
  ];
  for (let i = 0; i < 60; i++) {
    const w = 80 + rand() * 150;
    const h = 120 + rand() * 200;
    buildings.push({
      x: i * (WORLD_W / 60) + rand() * 30,
      w,
      h,
      color: colors[Math.floor(rand() * colors.length)],
      onFire: false,
      fireTimer: 0,
      sign: rand() > 0.5 ? signs[Math.floor(rand() * signs.length)] : undefined,
    });
  }
  return buildings;
}

function generateNPCs(): NPC[] {
  const positions = [500, 1200, 2000, 2800];
  const types: NPC["type"][] = ["man", "soldier", "woman", "man"];
  return positions.map((px, i) => ({
    id: 1000 + i,
    x: px,
    type: types[i],
    hint: NPC_HINTS[i],
    showBubble: false,
    bubbleTimer: 0,
    vx: 0,
    walkTimer: Math.random() * 2,
  }));
}

function createBosses(idStart: number): Entity[] {
  return BOSS_DEFS.map((b, i) => ({
    id: idStart + i,
    x: b.zone + (Math.random() - 0.5) * 200,
    hp: 150,
    maxHp: 150,
    vx: 0,
    facingLeft: true,
    dead: false,
    isBoss: true,
    name: b.name,
    shootCooldown: 0,
    alertTimer: 0,
    state: "patrol" as const,
    hideX: b.zone + (Math.random() - 0.5) * 100,
  }));
}

function spawnEnemies(level: number, bosses: Entity[], idStart: number) {
  const rand = seededRand(level * 17 + 99);
  const count = 8 + level * 3;
  const grunts: Entity[] = [];
  for (let i = 0; i < count; i++) {
    grunts.push({
      id: idStart + i,
      x: 300 + rand() * (WORLD_W - 600),
      hp: 30 + level * 5,
      maxHp: 30 + level * 5,
      vx: 0,
      facingLeft: true,
      dead: false,
      isBoss: false,
      name: "Enemy",
      shootCooldown: 0,
      alertTimer: 0,
      state: "patrol" as const,
      hideX: 300 + rand() * (WORLD_W - 600),
    });
  }
  return { enemies: [...bosses, ...grunts], nextId: idStart + count };
}

function initGameState(hero: HeroName): GameState {
  const buildings = generateBuildings();
  const npcs = generateNPCs();
  const bosses = createBosses(100);
  const { enemies, nextId } = spawnEnemies(1, bosses, 200);
  return {
    phase: "playing",
    hero,
    hx: 200,
    hhp: 200,
    maxHhp: 200,
    hvx: 0,
    hFacingLeft: false,
    hShootCooldown: 0,
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
    cameraX: 0,
    screenShake: 0,
    levelSplash: 0,
    levelTitle: "BORDER TENSION",
    muted: false,
    idCounter: nextId,
    invincTimer: 0,
  };
}

// ─── Character Drawing ────────────────────────────────────────────────────────
// All characters drawn as complete single-piece figures on the ground line

function drawHumza(
  ctx: CanvasRenderingContext2D,
  cx: number,
  gy: number,
  facingLeft: boolean,
  alpha = 1,
) {
  ctx.save();
  ctx.globalAlpha = alpha;
  if (facingLeft) {
    ctx.scale(-1, 1);
    // biome-ignore lint/style/noParameterAssign: mirror
    cx = -cx;
  }
  const scale = HERO_H / 110;
  const s = scale;
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.ellipse(cx, gy, 28 * s, 7 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  // Boots
  ctx.fillStyle = "#2a1a0a";
  ctx.fillRect(cx - 18 * s, gy - 14 * s, 14 * s, 14 * s);
  ctx.fillRect(cx + 4 * s, gy - 14 * s, 14 * s, 14 * s);
  // Trousers - dark navy
  ctx.fillStyle = "#1a2060";
  ctx.fillRect(cx - 20 * s, gy - 54 * s, 18 * s, 42 * s);
  ctx.fillRect(cx + 2 * s, gy - 54 * s, 18 * s, 42 * s);
  // Belt
  ctx.fillStyle = "#3a2a10";
  ctx.fillRect(cx - 20 * s, gy - 56 * s, 40 * s, 6 * s);
  ctx.fillStyle = "#c8a030";
  ctx.fillRect(cx - 5 * s, gy - 56 * s, 10 * s, 6 * s);
  // Tactical vest / jacket - blue
  ctx.fillStyle = "#1a3a8a";
  ctx.fillRect(cx - 22 * s, gy - 90 * s, 44 * s, 38 * s);
  // Vest pouches
  ctx.fillStyle = "#0a2060";
  ctx.fillRect(cx - 20 * s, gy - 86 * s, 12 * s, 10 * s);
  ctx.fillRect(cx + 8 * s, gy - 86 * s, 12 * s, 10 * s);
  ctx.fillRect(cx - 8 * s, gy - 74 * s, 16 * s, 10 * s);
  // Arms
  ctx.fillStyle = "#1a3a8a";
  ctx.fillRect(cx - 38 * s, gy - 90 * s, 18 * s, 32 * s);
  ctx.fillRect(cx + 20 * s, gy - 90 * s, 18 * s, 32 * s);
  // Hands
  ctx.fillStyle = "#c0805a";
  ctx.beginPath();
  ctx.ellipse(cx - 29 * s, gy - 58 * s, 9 * s, 8 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + 29 * s, gy - 58 * s, 9 * s, 8 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  // AK-47
  ctx.fillStyle = "#5a3a1a";
  ctx.fillRect(cx + 20 * s, gy - 82 * s, 32 * s, 8 * s);
  ctx.fillStyle = "#3a3a3a";
  ctx.fillRect(cx + 48 * s, gy - 86 * s, 8 * s, 16 * s);
  ctx.fillRect(cx + 30 * s, gy - 90 * s, 8 * s, 14 * s);
  // Neck
  ctx.fillStyle = "#c0805a";
  ctx.fillRect(cx - 8 * s, gy - 100 * s, 16 * s, 12 * s);
  // Head
  ctx.fillStyle = "#c8906a";
  ctx.beginPath();
  ctx.ellipse(cx, gy - 114 * s, 20 * s, 22 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  // Hair - short dark
  ctx.fillStyle = "#1a0a00";
  ctx.beginPath();
  ctx.ellipse(cx, gy - 124 * s, 20 * s, 12 * s, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(cx - 20 * s, gy - 124 * s, 40 * s, 12 * s);
  // Beard
  ctx.fillStyle = "#2a1a0a";
  ctx.beginPath();
  ctx.ellipse(cx + 2 * s, gy - 104 * s, 14 * s, 8 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  // Eyes
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.ellipse(cx - 7 * s, gy - 116 * s, 5 * s, 4 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + 7 * s, gy - 116 * s, 5 * s, 4 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1a0800";
  ctx.beginPath();
  ctx.arc(cx - 7 * s, gy - 116 * s, 3 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + 7 * s, gy - 116 * s, 3 * s, 0, Math.PI * 2);
  ctx.fill();
  // Eyebrows
  ctx.strokeStyle = "#1a0800";
  ctx.lineWidth = 2 * s;
  ctx.beginPath();
  ctx.moveTo(cx - 12 * s, gy - 122 * s);
  ctx.lineTo(cx - 2 * s, gy - 120 * s);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + 2 * s, gy - 120 * s);
  ctx.lineTo(cx + 12 * s, gy - 122 * s);
  ctx.stroke();
  ctx.restore();
}

function drawAjay(
  ctx: CanvasRenderingContext2D,
  cx: number,
  gy: number,
  facingLeft: boolean,
  alpha = 1,
) {
  ctx.save();
  ctx.globalAlpha = alpha;
  if (facingLeft) {
    ctx.scale(-1, 1);
    // biome-ignore lint/style/noParameterAssign: mirror
    cx = -cx;
  }
  const s = HERO_H / 110;
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.ellipse(cx, gy, 28 * s, 7 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  // Boots
  ctx.fillStyle = "#2a2010";
  ctx.fillRect(cx - 18 * s, gy - 14 * s, 14 * s, 14 * s);
  ctx.fillRect(cx + 4 * s, gy - 14 * s, 14 * s, 14 * s);
  // Trousers - olive
  ctx.fillStyle = "#4a5a2a";
  ctx.fillRect(cx - 20 * s, gy - 54 * s, 18 * s, 42 * s);
  ctx.fillRect(cx + 2 * s, gy - 54 * s, 18 * s, 42 * s);
  // Belt
  ctx.fillStyle = "#2a1a00";
  ctx.fillRect(cx - 20 * s, gy - 56 * s, 40 * s, 6 * s);
  ctx.fillStyle = "#c8a030";
  ctx.fillRect(cx - 5 * s, gy - 56 * s, 10 * s, 6 * s);
  // Army shirt - olive green
  ctx.fillStyle = "#3a4a1a";
  ctx.fillRect(cx - 22 * s, gy - 90 * s, 44 * s, 38 * s);
  // Rank stripes
  ctx.fillStyle = "#c8a030";
  ctx.fillRect(cx - 18 * s, gy - 88 * s, 8 * s, 4 * s);
  ctx.fillRect(cx - 18 * s, gy - 82 * s, 8 * s, 4 * s);
  // Arms
  ctx.fillStyle = "#3a4a1a";
  ctx.fillRect(cx - 38 * s, gy - 90 * s, 18 * s, 32 * s);
  ctx.fillRect(cx + 20 * s, gy - 90 * s, 18 * s, 32 * s);
  // Hands
  ctx.fillStyle = "#b87858";
  ctx.beginPath();
  ctx.ellipse(cx - 29 * s, gy - 58 * s, 9 * s, 8 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + 29 * s, gy - 58 * s, 9 * s, 8 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  // M4 rifle
  ctx.fillStyle = "#2a2a2a";
  ctx.fillRect(cx + 20 * s, gy - 82 * s, 38 * s, 7 * s);
  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(cx + 54 * s, gy - 85 * s, 6 * s, 13 * s);
  ctx.fillRect(cx + 32 * s, gy - 90 * s, 8 * s, 12 * s);
  // Neck
  ctx.fillStyle = "#b87858";
  ctx.fillRect(cx - 8 * s, gy - 100 * s, 16 * s, 12 * s);
  // Head
  ctx.fillStyle = "#c09070";
  ctx.beginPath();
  ctx.ellipse(cx, gy - 114 * s, 20 * s, 22 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  // Military cap
  ctx.fillStyle = "#3a4a1a";
  ctx.fillRect(cx - 22 * s, gy - 126 * s, 44 * s, 14 * s);
  ctx.beginPath();
  ctx.ellipse(cx, gy - 126 * s, 22 * s, 8 * s, 0, Math.PI, 0);
  ctx.fill();
  // Cap brim
  ctx.fillStyle = "#2a3a0a";
  ctx.fillRect(cx - 24 * s, gy - 114 * s, 48 * s, 5 * s);
  // Aviator glasses
  ctx.fillStyle = "rgba(80,60,0,0.8)";
  ctx.beginPath();
  ctx.ellipse(cx - 8 * s, gy - 114 * s, 8 * s, 6 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + 8 * s, gy - 114 * s, 8 * s, 6 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#c8a030";
  ctx.lineWidth = 1.5 * s;
  ctx.beginPath();
  ctx.moveTo(cx - 16 * s, gy - 114 * s);
  ctx.lineTo(cx + 16 * s, gy - 114 * s);
  ctx.stroke();
  // Mouth
  ctx.strokeStyle = "#7a4a3a";
  ctx.lineWidth = 1.5 * s;
  ctx.beginPath();
  ctx.moveTo(cx - 6 * s, gy - 106 * s);
  ctx.lineTo(cx + 6 * s, gy - 106 * s);
  ctx.stroke();
  ctx.restore();
}

function drawGrunt(
  ctx: CanvasRenderingContext2D,
  cx: number,
  gy: number,
  facingLeft: boolean,
) {
  ctx.save();
  if (facingLeft) {
    ctx.scale(-1, 1);
    // biome-ignore lint/style/noParameterAssign: mirror
    cx = -cx;
  }
  const s = ENEMY_H / 88;
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.ellipse(cx, gy, 22 * s, 5 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  // Boots
  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(cx - 14 * s, gy - 12 * s, 11 * s, 12 * s);
  ctx.fillRect(cx + 3 * s, gy - 12 * s, 11 * s, 12 * s);
  // Trousers - dark camo
  ctx.fillStyle = "#2a3018";
  ctx.fillRect(cx - 16 * s, gy - 42 * s, 14 * s, 32 * s);
  ctx.fillRect(cx + 2 * s, gy - 42 * s, 14 * s, 32 * s);
  // Camo pattern
  ctx.fillStyle = "#1a2010";
  ctx.fillRect(cx - 14 * s, gy - 38 * s, 5 * s, 5 * s);
  ctx.fillRect(cx + 4 * s, gy - 32 * s, 5 * s, 5 * s);
  // Belt
  ctx.fillStyle = "#2a2010";
  ctx.fillRect(cx - 16 * s, gy - 44 * s, 32 * s, 5 * s);
  // Tactical vest - dark
  ctx.fillStyle = "#1a2010";
  ctx.fillRect(cx - 18 * s, gy - 72 * s, 36 * s, 30 * s);
  // Vest pouches
  ctx.fillStyle = "#0a1008";
  ctx.fillRect(cx - 16 * s, gy - 70 * s, 9 * s, 8 * s);
  ctx.fillRect(cx + 7 * s, gy - 70 * s, 9 * s, 8 * s);
  ctx.fillRect(cx - 6 * s, gy - 60 * s, 12 * s, 8 * s);
  // Arms
  ctx.fillStyle = "#1a2010";
  ctx.fillRect(cx - 30 * s, gy - 72 * s, 14 * s, 26 * s);
  ctx.fillRect(cx + 16 * s, gy - 72 * s, 14 * s, 26 * s);
  // Hands
  ctx.fillStyle = "#9a6848";
  ctx.beginPath();
  ctx.ellipse(cx - 23 * s, gy - 46 * s, 7 * s, 6 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + 23 * s, gy - 46 * s, 7 * s, 6 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  // AK-47
  ctx.fillStyle = "#5a3a1a";
  ctx.fillRect(cx + 16 * s, gy - 66 * s, 26 * s, 6 * s);
  ctx.fillStyle = "#2a2a2a";
  ctx.fillRect(cx + 38 * s, gy - 70 * s, 6 * s, 12 * s);
  ctx.fillRect(cx + 24 * s, gy - 72 * s, 6 * s, 10 * s);
  // Neck
  ctx.fillStyle = "#9a6848";
  ctx.fillRect(cx - 6 * s, gy - 80 * s, 12 * s, 10 * s);
  // Head
  ctx.fillStyle = "#a07050";
  ctx.beginPath();
  ctx.ellipse(cx, gy - 90 * s, 16 * s, 17 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  // Pakol hat (Pakistani style)
  ctx.fillStyle = "#6a5028";
  ctx.beginPath();
  ctx.ellipse(cx, gy - 100 * s, 18 * s, 10 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(cx - 18 * s, gy - 106 * s, 36 * s, 8 * s);
  ctx.beginPath();
  ctx.ellipse(cx, gy - 106 * s, 18 * s, 8 * s, 0, Math.PI, 0);
  ctx.fill();
  // Keffiyeh face wrap
  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(cx - 16 * s, gy - 90 * s, 32 * s, 16 * s);
  ctx.beginPath();
  ctx.ellipse(cx, gy - 90 * s, 16 * s, 8 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  // Eyes only visible
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.ellipse(cx - 6 * s, gy - 93 * s, 4 * s, 3 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + 6 * s, gy - 93 * s, 4 * s, 3 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1a0800";
  ctx.beginPath();
  ctx.arc(cx - 6 * s, gy - 93 * s, 2.5 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + 6 * s, gy - 93 * s, 2.5 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBoss(
  ctx: CanvasRenderingContext2D,
  cx: number,
  gy: number,
  facingLeft: boolean,
  name: string,
) {
  ctx.save();
  if (facingLeft) {
    ctx.scale(-1, 1);
    // biome-ignore lint/style/noParameterAssign: mirror
    cx = -cx;
  }
  const s = BOSS_H / 110;
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.ellipse(cx, gy, 28 * s, 7 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  // Boots
  ctx.fillStyle = "#1a1000";
  ctx.fillRect(cx - 18 * s, gy - 14 * s, 14 * s, 14 * s);
  ctx.fillRect(cx + 4 * s, gy - 14 * s, 14 * s, 14 * s);
  if (name.includes("Rehman")) {
    // Rehman Dakait - red dupatta, scar, bandolier
    ctx.fillStyle = "#3a2010";
    ctx.fillRect(cx - 20 * s, gy - 54 * s, 18 * s, 42 * s);
    ctx.fillRect(cx + 2 * s, gy - 54 * s, 18 * s, 42 * s);
    ctx.fillStyle = "#5a1010";
    ctx.fillRect(cx - 22 * s, gy - 90 * s, 44 * s, 38 * s);
    // Bandolier
    ctx.fillStyle = "#8a6020";
    for (let bi = 0; bi < 6; bi++) {
      ctx.fillRect(
        cx - 18 * s + bi * 8 * s,
        gy - 88 * s + bi * 3 * s,
        5 * s,
        8 * s,
      );
    }
    ctx.fillStyle = "#8a2010";
    ctx.fillRect(cx - 22 * s, gy - 92 * s, 44 * s, 6 * s); // dupatta
    // Arms
    ctx.fillStyle = "#5a1010";
    ctx.fillRect(cx - 38 * s, gy - 90 * s, 18 * s, 32 * s);
    ctx.fillRect(cx + 20 * s, gy - 90 * s, 18 * s, 32 * s);
    ctx.fillStyle = "#b07860";
    ctx.beginPath();
    ctx.ellipse(cx - 29 * s, gy - 58 * s, 9 * s, 8 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 29 * s, gy - 58 * s, 9 * s, 8 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    // Double barrel shotgun
    ctx.fillStyle = "#4a2a0a";
    ctx.fillRect(cx + 20 * s, gy - 82 * s, 28 * s, 5 * s);
    ctx.fillRect(cx + 20 * s, gy - 76 * s, 28 * s, 5 * s);
    // Neck+Head
    ctx.fillStyle = "#b07860";
    ctx.fillRect(cx - 8 * s, gy - 100 * s, 16 * s, 12 * s);
    ctx.beginPath();
    ctx.ellipse(cx, gy - 114 * s, 20 * s, 22 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    // Scar
    ctx.strokeStyle = "#5a1010";
    ctx.lineWidth = 2.5 * s;
    ctx.beginPath();
    ctx.moveTo(cx - 12 * s, gy - 124 * s);
    ctx.lineTo(cx - 4 * s, gy - 108 * s);
    ctx.stroke();
    // Thick mustache
    ctx.fillStyle = "#1a0800";
    ctx.beginPath();
    ctx.ellipse(cx, gy - 107 * s, 12 * s, 5 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    // Red turban wrap
    ctx.fillStyle = "#9a1010";
    ctx.beginPath();
    ctx.ellipse(cx, gy - 124 * s, 22 * s, 16 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (name.includes("SP") || name.includes("Aslam")) {
    // SP Aslam - police uniform
    ctx.fillStyle = "#2a2040";
    ctx.fillRect(cx - 20 * s, gy - 54 * s, 18 * s, 42 * s);
    ctx.fillRect(cx + 2 * s, gy - 54 * s, 18 * s, 42 * s);
    ctx.fillStyle = "#3a3060";
    ctx.fillRect(cx - 22 * s, gy - 90 * s, 44 * s, 38 * s);
    // Medals
    ctx.fillStyle = "#c8a020";
    for (let mi = 0; mi < 3; mi++)
      ctx.fillRect(cx - 18 * s + mi * 12 * s, gy - 82 * s, 8 * s, 6 * s);
    ctx.fillStyle = "#3a3060";
    ctx.fillRect(cx - 38 * s, gy - 90 * s, 18 * s, 32 * s);
    ctx.fillRect(cx + 20 * s, gy - 90 * s, 18 * s, 32 * s);
    ctx.fillStyle = "#a07858";
    ctx.beginPath();
    ctx.ellipse(cx - 29 * s, gy - 58 * s, 9 * s, 8 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 29 * s, gy - 58 * s, 9 * s, 8 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2a2a2a";
    ctx.fillRect(cx + 20 * s, gy - 78 * s, 26 * s, 6 * s);
    ctx.fillRect(cx + 42 * s, gy - 82 * s, 5 * s, 10 * s);
    ctx.fillStyle = "#a07858";
    ctx.fillRect(cx - 8 * s, gy - 100 * s, 16 * s, 12 * s);
    ctx.beginPath();
    ctx.ellipse(cx, gy - 114 * s, 20 * s, 22 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1a0800";
    ctx.beginPath();
    ctx.ellipse(cx, gy - 107 * s, 14 * s, 6 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    // Police cap with gold badge
    ctx.fillStyle = "#2a2040";
    ctx.fillRect(cx - 22 * s, gy - 126 * s, 44 * s, 14 * s);
    ctx.beginPath();
    ctx.ellipse(cx, gy - 126 * s, 22 * s, 8 * s, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = "#c8a020";
    ctx.beginPath();
    ctx.arc(cx, gy - 118 * s, 6 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1a1030";
    ctx.fillRect(cx - 24 * s, gy - 114 * s, 48 * s, 5 * s);
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.ellipse(cx - 7 * s, gy - 116 * s, 5 * s, 4 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 7 * s, gy - 116 * s, 5 * s, 4 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2a1808";
    ctx.beginPath();
    ctx.arc(cx - 7 * s, gy - 116 * s, 3 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + 7 * s, gy - 116 * s, 3 * s, 0, Math.PI * 2);
    ctx.fill();
  } else if (name.includes("Major") || name.includes("Iqbal")) {
    // Major Iqbal - army beret, scoped rifle
    ctx.fillStyle = "#3a4a1a";
    ctx.fillRect(cx - 20 * s, gy - 54 * s, 18 * s, 42 * s);
    ctx.fillRect(cx + 2 * s, gy - 54 * s, 18 * s, 42 * s);
    ctx.fillRect(cx - 22 * s, gy - 90 * s, 44 * s, 38 * s);
    ctx.fillStyle = "#c8a030";
    ctx.fillRect(cx - 18 * s, gy - 88 * s, 8 * s, 4 * s);
    ctx.fillRect(cx - 18 * s, gy - 82 * s, 8 * s, 4 * s);
    ctx.fillRect(cx - 18 * s, gy - 76 * s, 8 * s, 4 * s);
    ctx.fillStyle = "#3a4a1a";
    ctx.fillRect(cx - 38 * s, gy - 90 * s, 18 * s, 32 * s);
    ctx.fillRect(cx + 20 * s, gy - 90 * s, 18 * s, 32 * s);
    ctx.fillStyle = "#b07858";
    ctx.beginPath();
    ctx.ellipse(cx - 29 * s, gy - 58 * s, 9 * s, 8 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 29 * s, gy - 58 * s, 9 * s, 8 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    // Scoped AK
    ctx.fillStyle = "#3a2a0a";
    ctx.fillRect(cx + 20 * s, gy - 82 * s, 36 * s, 6 * s);
    ctx.fillStyle = "#2a2a2a";
    ctx.fillRect(cx + 52 * s, gy - 86 * s, 6 * s, 14 * s);
    ctx.fillRect(cx + 30 * s, gy - 90 * s, 6 * s, 12 * s);
    ctx.fillStyle = "rgba(100,200,255,0.6)";
    ctx.fillRect(cx + 34 * s, gy - 94 * s, 12 * s, 6 * s);
    ctx.fillStyle = "#b07858";
    ctx.fillRect(cx - 8 * s, gy - 100 * s, 16 * s, 12 * s);
    ctx.beginPath();
    ctx.ellipse(cx, gy - 114 * s, 20 * s, 22 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1a0800";
    ctx.beginPath();
    ctx.ellipse(cx + 2 * s, gy - 107 * s, 14 * s, 7 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    // Army beret
    ctx.fillStyle = "#2a3a0a";
    ctx.beginPath();
    ctx.ellipse(cx - 4 * s, gy - 126 * s, 22 * s, 14 * s, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#c8a030";
    ctx.beginPath();
    ctx.arc(cx - 10 * s, gy - 122 * s, 4 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.ellipse(cx - 7 * s, gy - 116 * s, 5 * s, 4 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 7 * s, gy - 116 * s, 5 * s, 4 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1a0800";
    ctx.beginPath();
    ctx.arc(cx - 7 * s, gy - 116 * s, 3 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + 7 * s, gy - 116 * s, 3 * s, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Jameel Jamali - large turban, long beard
    ctx.fillStyle = "#8a7040";
    ctx.fillRect(cx - 20 * s, gy - 54 * s, 18 * s, 42 * s);
    ctx.fillRect(cx + 2 * s, gy - 54 * s, 18 * s, 42 * s);
    ctx.fillStyle = "#a88040";
    ctx.fillRect(cx - 22 * s, gy - 90 * s, 44 * s, 38 * s);
    ctx.fillStyle = "#a88040";
    ctx.fillRect(cx - 38 * s, gy - 90 * s, 18 * s, 32 * s);
    ctx.fillRect(cx + 20 * s, gy - 90 * s, 18 * s, 32 * s);
    ctx.fillStyle = "#b07858";
    ctx.beginPath();
    ctx.ellipse(cx - 29 * s, gy - 58 * s, 9 * s, 8 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 29 * s, gy - 58 * s, 9 * s, 8 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    // Knife + pistol
    ctx.fillStyle = "#3a3a3a";
    ctx.fillRect(cx + 20 * s, gy - 76 * s, 18 * s, 5 * s);
    ctx.fillStyle = "#5a3010";
    ctx.fillRect(cx - 38 * s, gy - 76 * s, 16 * s, 3 * s);
    ctx.fillRect(cx - 38 * s, gy - 74 * s, 5 * s, 8 * s);
    ctx.fillStyle = "#b07858";
    ctx.fillRect(cx - 8 * s, gy - 100 * s, 16 * s, 12 * s);
    ctx.beginPath();
    ctx.ellipse(cx, gy - 114 * s, 20 * s, 22 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    // Long white beard
    ctx.fillStyle = "#e8e0d0";
    ctx.beginPath();
    ctx.moveTo(cx - 16 * s, gy - 104 * s);
    ctx.lineTo(cx + 16 * s, gy - 104 * s);
    ctx.lineTo(cx + 10 * s, gy - 74 * s);
    ctx.lineTo(cx, gy - 70 * s);
    ctx.lineTo(cx - 10 * s, gy - 74 * s);
    ctx.closePath();
    ctx.fill();
    // Large white turban
    ctx.fillStyle = "#f0e8d8";
    ctx.beginPath();
    ctx.ellipse(cx, gy - 128 * s, 26 * s, 20 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e0d8c8";
    for (let ri = 0; ri < 4; ri++) {
      ctx.beginPath();
      ctx.arc(cx, gy - 118 * s - ri * 8 * s, 26 * s - ri * 2 * s, Math.PI, 0);
      ctx.lineWidth = 3 * s;
      ctx.strokeStyle = "#c8c0b0";
      ctx.stroke();
    }
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.ellipse(cx - 7 * s, gy - 116 * s, 5 * s, 4 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 7 * s, gy - 116 * s, 5 * s, 4 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2a1808";
    ctx.beginPath();
    ctx.arc(cx - 7 * s, gy - 116 * s, 3 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + 7 * s, gy - 116 * s, 3 * s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawNPC(
  ctx: CanvasRenderingContext2D,
  cx: number,
  gy: number,
  type: NPC["type"],
) {
  ctx.save();
  const s = 0.75;
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(cx, gy, 18, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  if (type === "soldier") {
    ctx.fillStyle = "#3a3820";
    ctx.fillRect(cx - 8, gy - 12 * s, 7, 12 * s);
    ctx.fillRect(cx + 1, gy - 12 * s, 7, 12 * s);
    ctx.fillStyle = "#4a5e2a";
    ctx.fillRect(cx - 10, gy - 42 * s, 20, 32 * s);
    ctx.fillRect(cx - 18, gy - 42 * s, 10, 24 * s);
    ctx.fillRect(cx + 8, gy - 42 * s, 10, 24 * s);
    ctx.fillStyle = "#d4a56a";
    ctx.beginPath();
    ctx.arc(cx, gy - 52 * s, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#3a4e1a";
    ctx.fillRect(cx - 10, gy - 61 * s, 20, 10);
  } else if (type === "woman") {
    ctx.fillStyle = "#ff6020";
    ctx.beginPath();
    ctx.moveTo(cx - 12, gy);
    ctx.lineTo(cx + 12, gy);
    ctx.lineTo(cx + 8, gy - 16);
    ctx.lineTo(cx - 8, gy - 16);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#cc4010";
    ctx.fillRect(cx - 8, gy - 42 * s, 16, 26 * s);
    ctx.fillRect(cx - 14, gy - 42 * s, 8, 18 * s);
    ctx.fillRect(cx + 6, gy - 42 * s, 8, 18 * s);
    ctx.fillStyle = "#d4956a";
    ctx.beginPath();
    ctx.arc(cx, gy - 50 * s, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#cc0000";
    ctx.beginPath();
    ctx.arc(cx, gy - 54 * s, 2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = "#7a4010";
    ctx.fillRect(cx - 7, gy - 12 * s, 6, 12 * s);
    ctx.fillRect(cx + 1, gy - 12 * s, 6, 12 * s);
    ctx.fillStyle = "#e87020";
    ctx.fillRect(cx - 10, gy - 42 * s, 20, 32 * s);
    ctx.fillRect(cx - 16, gy - 42 * s, 8, 22 * s);
    ctx.fillRect(cx + 8, gy - 42 * s, 8, 22 * s);
    ctx.fillStyle = "#c4856a";
    ctx.beginPath();
    ctx.arc(cx, gy - 50 * s, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "white";
    ctx.fillRect(cx - 10, gy - 60 * s, 20, 10);
    ctx.beginPath();
    ctx.ellipse(cx, gy - 60 * s, 10, 4, 0, Math.PI, 0);
    ctx.fill();
  }
  ctx.restore();
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState | null>(null);
  const [phase, setPhase] = useState<Phase>("menu");
  const [hero, setHero] = useState<HeroName>("humza");
  const [muted, setMuted] = useState(false);
  const keysRef = useRef<Set<string>>(new Set());
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  const joystickRef = useRef({ active: false, cx: 0, cy: 0, dx: 0, dy: 0 });

  // Keyboard
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

  // Canvas resize
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
      startDrone(muted);
    },
    [muted],
  );

  // ─── Game Loop ──────────────────────────────────────────────────────────────

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
  }, [phase]);

  // ─── Update ─────────────────────────────────────────────────────────────────

  function update(s: GameState, dt: number) {
    const keys = keysRef.current;
    const vw = window.innerWidth;
    const joy = joystickRef.current;

    // Hero moves ONLY horizontally (left/right) — always on ground
    let mx = 0;
    if (keys.has("KeyA") || keys.has("ArrowLeft")) mx -= 1;
    if (keys.has("KeyD") || keys.has("ArrowRight")) mx += 1;
    if (joy.active) mx += joy.dx;
    if (mx < -1) mx = -1;
    if (mx > 1) mx = 1;
    s.hvx = mx * MOVE_SPEED;
    if (mx < 0) s.hFacingLeft = true;
    if (mx > 0) s.hFacingLeft = false;

    s.hx = Math.max(0, Math.min(WORLD_W - 40, s.hx + s.hvx * dt));

    // Camera follows hero horizontally
    s.cameraX = Math.max(0, Math.min(WORLD_W - vw, s.hx - vw / 2));

    if (s.screenShake > 0) s.screenShake = Math.max(0, s.screenShake - dt * 8);
    if (s.invincTimer > 0) s.invincTimer = Math.max(0, s.invincTimer - dt);
    if (s.levelSplash > 0) s.levelSplash = Math.max(0, s.levelSplash - dt);

    s.bombRechargeTimer += dt;
    if (s.bombRechargeTimer >= 30 && s.hBombs < 5) {
      s.hBombs++;
      s.bombRechargeTimer = 0;
    }

    s.hShootCooldown = Math.max(0, s.hShootCooldown - dt);
    if ((keys.has("Space") || keys.has("Enter")) && s.hShootCooldown <= 0)
      heroShoot(s);
    if (keys.has("KeyB") && s.hBombs > 0) {
      keys.delete("KeyB");
      throwBomb(s);
    }

    // ── Enemy AI ─────────────────────────────────────────────────────────────
    for (const e of s.enemies) {
      if (e.dead) continue;
      e.shootCooldown = Math.max(0, e.shootCooldown - dt);
      e.alertTimer = Math.max(0, e.alertTimer - dt);

      const dx = s.hx - e.x;
      const dist = Math.abs(dx);
      const fightDist = e.isBoss ? BOSS_FIGHT_DIST : FIGHT_DIST;
      const speed = (e.isBoss ? BOSS_SPEED : ENEMY_SPEED) * (1 + s.level * 0.1);

      if (dist < fightDist) {
        // FIGHT: stop moving, shoot at hero
        e.state = "fight";
        e.vx = e.isBoss ? (dx > 0 ? speed * 0.3 : -speed * 0.3) : 0;
        if (e.shootCooldown <= 0) {
          enemyShoot(s, e);
          e.shootCooldown = e.isBoss ? 0.6 : 1.2 + Math.random();
        }
        e.alertTimer = 0.5;
      } else if (dist < FLEE_DIST) {
        // FLEE: run away from hero toward hideX
        e.state = "flee";
        const fleeDir = dx > 0 ? -1 : 1; // run opposite to hero
        e.hideX = e.x + fleeDir * (200 + Math.random() * 300);
        e.hideX = Math.max(50, Math.min(WORLD_W - 50, e.hideX));
        e.vx = fleeDir * speed * 1.2;
        e.alertTimer = 0.5;
      } else {
        // PATROL: wander toward hideX
        e.state = "patrol";
        const dToHide = e.hideX - e.x;
        if (Math.abs(dToHide) > 20) {
          e.vx = dToHide > 0 ? speed * 0.4 : -speed * 0.4;
        } else {
          // Pick new hideX occasionally
          if (Math.random() < 0.008) {
            e.hideX = 100 + Math.random() * (WORLD_W - 200);
          }
          e.vx = 0;
        }
      }

      // Face direction
      if (e.vx < 0) e.facingLeft = true;
      else if (e.vx > 0) e.facingLeft = false;
      else e.facingLeft = dx < 0; // face hero when idle

      // Move X only — enemies stay on ground
      e.x = Math.max(50, Math.min(WORLD_W - 50, e.x + e.vx * dt));
    }

    // Bullets - fly horizontally across ground level
    for (const b of s.bullets) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
    }

    // Bullet collisions
    const groundY = window.innerHeight * GROUND_RATIO;
    for (const b of s.bullets) {
      if (b.life <= 0) continue;
      if (b.fromPlayer) {
        for (const e of s.enemies) {
          if (e.dead) continue;
          const esx = e.x - s.cameraX;
          if (Math.abs(b.x - esx) < 35) {
            e.hp -= 20;
            b.life = 0;
            spawnParticles(
              s,
              esx,
              groundY - (e.isBoss ? BOSS_H : ENEMY_H) / 2,
              "#ff4400",
              6,
            );
            playHit(s.muted);
            if (e.hp <= 0) {
              e.dead = true;
              s.score += e.isBoss ? 500 : 50;
              if (e.isBoss) {
                s.totalBossesKilled++;
                playBossAlert(s.muted);
                spawnParticles(s, esx, groundY - BOSS_H / 2, "#ff8800", 20);
              }
            }
            break;
          }
        }
      } else {
        // Enemy bullet hits player
        const heroSx = s.hx - s.cameraX;
        if (s.invincTimer <= 0 && Math.abs(b.x - heroSx) < 35) {
          s.hhp -= 15;
          b.life = 0;
          s.invincTimer = 0.5;
          s.screenShake = 0.3;
          spawnParticles(s, heroSx, groundY - HERO_H / 2, "#ff0000", 5);
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
      bomb.x += (bomb.tx - bomb.x) * dt * 3;
      if (bomb.timer <= 0) {
        bomb.exploded = true;
        bomb.x = bomb.tx;
        bomb.explodeTime = 0;
        s.screenShake = 0.8;
        playExplosion(s.muted);
        spawnParticles(s, bomb.tx - s.cameraX, groundY - 20, "#ff6600", 30);
        for (const e of s.enemies) {
          if (e.dead) continue;
          if (Math.abs(bomb.tx - e.x) < BOMB_RADIUS) {
            e.hp -= 100;
            if (e.hp <= 0) {
              e.dead = true;
              s.score += e.isBoss ? 500 : 50;
              if (e.isBoss) {
                s.totalBossesKilled++;
                playBossAlert(s.muted);
              }
            }
          }
        }
        // Ignite nearby buildings
        for (const bld of s.buildings) {
          if (Math.abs(bomb.tx - (bld.x + bld.w / 2)) < BOMB_RADIUS * 1.5) {
            bld.onFire = true;
            bld.fireTimer = 6;
          }
        }
      }
    }
    s.bombs = s.bombs.filter((b) => !(b.exploded && b.explodeTime > 2));

    // Buildings fire
    for (const b of s.buildings) {
      if (b.onFire) {
        b.fireTimer -= dt;
        if (b.fireTimer <= 0) b.onFire = false;
      }
    }

    // NPCs
    for (const npc of s.npcs) {
      npc.walkTimer -= dt;
      if (npc.walkTimer <= 0) {
        npc.vx = (Math.random() - 0.5) * 30;
        npc.walkTimer = 2 + Math.random() * 3;
      }
      npc.x = Math.max(100, Math.min(WORLD_W - 100, npc.x + npc.vx * dt));
      if (Math.abs(s.hx - npc.x) < 150) {
        npc.showBubble = true;
        npc.bubbleTimer = 3;
      }
      if (npc.showBubble) {
        npc.bubbleTimer -= dt;
        if (npc.bubbleTimer <= 0) npc.showBubble = false;
      }
    }

    // Particles
    for (const p of s.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      p.vy += 200 * dt;
    }
    s.particles = s.particles.filter((p) => p.life > 0);

    // Level check
    const aliveGrunts = s.enemies.filter((e) => !e.dead && !e.isBoss);
    const aliveBosses = s.enemies.filter((e) => !e.dead && e.isBoss);
    if (aliveGrunts.length === 0) {
      s.level++;
      const titles = [
        "BORDER TENSION",
        "BORDER TENSION",
        "WAR BREAKS OUT",
        "TOTAL WARFARE",
        "FINAL BATTLE",
      ];
      s.levelTitle =
        titles[Math.min(s.level - 1, titles.length - 1)] ?? "TOTAL WARFARE";
      s.levelSplash = 3;
      const { enemies: ne, nextId } = spawnEnemies(
        s.level,
        aliveBosses,
        s.idCounter,
      );
      s.enemies = ne;
      s.idCounter = nextId;
    }
    if (s.totalBossesKilled >= 4) s.phase = "win";
  }

  function heroShoot(s: GameState) {
    const alive = s.enemies.filter((e) => !e.dead);
    if (alive.length === 0) return;
    let nearest = alive[0];
    let minD = Number.POSITIVE_INFINITY;
    for (const e of alive) {
      const d = Math.abs(e.x - s.hx);
      if (d < minD) {
        minD = d;
        nearest = e;
      }
    }
    const dx = nearest.x - s.hx;
    const dir = dx >= 0 ? 1 : -1;
    const gy = window.innerHeight * GROUND_RATIO;
    s.bullets.push({
      id: s.idCounter++,
      x: s.hx - s.cameraX,
      y: gy - HERO_H * 0.5,
      vx: dir * BULLET_SPEED,
      vy: 0,
      fromPlayer: true,
      life: BULLET_LIFE,
    });
    s.hShootCooldown = 0.18;
    s.hFacingLeft = dx < 0;
    playShoot(s.muted);
  }

  function enemyShoot(s: GameState, e: Entity) {
    const gy = window.innerHeight * GROUND_RATIO;
    const dir = s.hx < e.x ? -1 : 1;
    s.bullets.push({
      id: s.idCounter++,
      x: e.x - s.cameraX,
      y: gy - (e.isBoss ? BOSS_H : ENEMY_H) * 0.5,
      vx: dir * BULLET_SPEED * 0.65,
      vy: 0,
      fromPlayer: false,
      life: BULLET_LIFE,
    });
  }

  function throwBomb(s: GameState) {
    if (s.hBombs <= 0) return;
    s.hBombs--;
    const alive = s.enemies.filter((e) => !e.dead);
    let tx = s.hx + (s.hFacingLeft ? -250 : 250);
    if (alive.length > 0) {
      let nearest = alive[0];
      let minD = Number.POSITIVE_INFINITY;
      for (const e of alive) {
        const d = Math.abs(e.x - s.hx);
        if (d < minD) {
          minD = d;
          nearest = e;
        }
      }
      tx = nearest.x;
    }
    s.bombs.push({
      id: s.idCounter++,
      x: s.hx - s.cameraX,
      tx,
      timer: 1.8,
      exploded: false,
      explodeTime: 0,
    });
    playShoot(s.muted);
  }

  function spawnParticles(
    s: GameState,
    x: number,
    y: number,
    color: string,
    count: number,
  ) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 180;
      s.particles.push({
        id: s.idCounter++,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 80,
        life: 0.3 + Math.random() * 0.5,
        maxLife: 0.8,
        color,
        size: 2 + Math.random() * 5,
      });
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  function render(
    ctx: CanvasRenderingContext2D,
    vw: number,
    vh: number,
    s: GameState,
  ) {
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.clearRect(0, 0, vw, vh);

    const shakeX =
      s.screenShake > 0 ? (Math.random() - 0.5) * s.screenShake * 10 : 0;
    const shakeY =
      s.screenShake > 0 ? (Math.random() - 0.5) * s.screenShake * 6 : 0;
    ctx.save();
    ctx.translate(shakeX, shakeY);

    const groundY = vh * GROUND_RATIO;
    const levelRatio = Math.min((s.level - 1) / 6, 1);

    // ── Sky gradient (Version 16 style warm amber dusk) ───────────────────────
    const skyGrad = ctx.createLinearGradient(0, 0, 0, groundY);
    if (levelRatio < 0.5) {
      const lr = levelRatio * 2;
      skyGrad.addColorStop(
        0,
        `rgb(${Math.floor(60 + lr * 100)},${Math.floor(80 - lr * 40)},${Math.floor(140 - lr * 120)})`,
      );
      skyGrad.addColorStop(
        0.5,
        `rgb(${Math.floor(200 + lr * 30)},${Math.floor(120 - lr * 50)},${Math.floor(50 - lr * 30)})`,
      );
      skyGrad.addColorStop(
        1,
        `rgb(255,${Math.floor(180 - lr * 80)},${Math.floor(80 - lr * 60)})`,
      );
    } else {
      const w = (levelRatio - 0.5) * 2;
      skyGrad.addColorStop(
        0,
        `rgb(${Math.floor(160 + w * 60)},${Math.floor(30)},${Math.floor(10)})`,
      );
      skyGrad.addColorStop(
        1,
        `rgb(${Math.floor(230 + w * 25)},${Math.floor(60 - w * 40)},10)`,
      );
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, vw, groundY);

    // ── Version 16 parallax city buildings ───────────────────────────────────
    drawV16City(ctx, vw, vh, groundY, s.cameraX, levelRatio);

    // ── Ground / road ─────────────────────────────────────────────────────────
    const gGrad = ctx.createLinearGradient(0, groundY, 0, vh);
    gGrad.addColorStop(0, levelRatio > 0.6 ? "#4a2810" : "#b8965a");
    gGrad.addColorStop(1, levelRatio > 0.6 ? "#2a1008" : "#8a6830");
    ctx.fillStyle = gGrad;
    ctx.fillRect(0, groundY, vw, vh - groundY);
    // Road center line
    ctx.strokeStyle = "rgba(255,210,80,0.2)";
    ctx.lineWidth = 3;
    ctx.setLineDash([36, 28]);
    const lineY = groundY + (vh - groundY) * 0.3;
    ctx.beginPath();
    ctx.moveTo(0, lineY);
    ctx.lineTo(vw, lineY);
    ctx.stroke();
    ctx.setLineDash([]);

    // ── World buildings (destructible) ────────────────────────────────────────
    for (const b of s.buildings) {
      const bsx = b.x - s.cameraX;
      if (bsx + b.w < 0 || bsx > vw) continue;
      const bTop = groundY - b.h;
      ctx.fillStyle = b.color;
      ctx.fillRect(bsx, bTop, b.w, b.h);
      // Side shading
      ctx.fillStyle = "rgba(0,0,0,0.15)";
      ctx.fillRect(bsx + b.w - 12, bTop, 12, b.h);
      // Roof
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.fillRect(bsx, bTop, b.w, 10);
      // Windows
      ctx.fillStyle =
        levelRatio > 0.5 ? "rgba(255,80,0,0.45)" : "rgba(255,230,120,0.55)";
      for (let wy = bTop + 16; wy < groundY - 20; wy += 24) {
        for (let wx = bsx + 10; wx < bsx + b.w - 18; wx += 22) {
          ctx.fillRect(wx, wy, 13, 15);
        }
      }
      // Sign
      if (b.sign) {
        ctx.fillStyle = "rgba(160,40,40,0.85)";
        ctx.fillRect(bsx + 6, groundY - 34, b.w - 12, 26);
        ctx.fillStyle = "white";
        ctx.font = "bold 11px Arial";
        ctx.textAlign = "center";
        ctx.fillText(b.sign, bsx + b.w / 2, groundY - 16);
      }
      if (b.onFire) drawFire(ctx, bsx + b.w / 2, bTop + 4, b.w * 0.5);
    }

    // Smoke at war levels
    if (s.level >= 5) {
      for (let i = 0; i < 3; i++) {
        const sx =
          ((((i * 900 + 200 - s.cameraX * 0.2) % (vw + 300)) + vw + 300) %
            (vw + 300)) -
          150;
        drawSmoke(ctx, sx, groundY - 20);
      }
    }

    // ── NPCs (on ground) ──────────────────────────────────────────────────────
    for (const npc of s.npcs) {
      const nsx = npc.x - s.cameraX;
      if (nsx < -60 || nsx > vw + 60) continue;
      drawNPC(ctx, nsx, groundY, npc.type);
      if (npc.showBubble) drawSpeechBubble(ctx, nsx, groundY - 72, npc.hint);
    }

    // ── Enemies (feet on ground) ──────────────────────────────────────────────
    for (const e of s.enemies) {
      if (e.dead) continue;
      const esx = e.x - s.cameraX;
      if (esx < -100 || esx > vw + 100) continue;
      if (e.isBoss) {
        drawBoss(ctx, esx, groundY, e.facingLeft, e.name);
        // HP bar
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(esx - BOSS_W / 2, groundY - BOSS_H - 14, BOSS_W, 7);
        ctx.fillStyle = "#ff3300";
        ctx.fillRect(
          esx - BOSS_W / 2,
          groundY - BOSS_H - 14,
          BOSS_W * (e.hp / e.maxHp),
          7,
        );
        ctx.strokeStyle = "#ffd700";
        ctx.lineWidth = 1;
        ctx.strokeRect(esx - BOSS_W / 2, groundY - BOSS_H - 14, BOSS_W, 7);
        ctx.fillStyle = "white";
        ctx.font = "bold 9px Arial";
        ctx.textAlign = "center";
        ctx.fillText(e.name, esx, groundY - BOSS_H - 18);
        if (e.alertTimer > 0) {
          ctx.fillStyle = "#ff0";
          ctx.font = "18px Arial";
          ctx.fillText("!", esx, groundY - BOSS_H - 30);
        }
      } else {
        drawGrunt(ctx, esx, groundY, e.facingLeft);
        if (e.alertTimer > 0) {
          ctx.fillStyle = "#ff0";
          ctx.font = "14px Arial";
          ctx.textAlign = "center";
          ctx.fillText("!", esx, groundY - ENEMY_H - 10);
        }
      }
    }

    // ── Hero (feet on ground) ─────────────────────────────────────────────────
    const heroSx = s.hx - s.cameraX;
    const heroAlpha =
      s.invincTimer > 0 ? (Math.sin(s.invincTimer * 20) > 0 ? 0.4 : 1) : 1;
    if (s.hero === "humza")
      drawHumza(ctx, heroSx, groundY, s.hFacingLeft, heroAlpha);
    else drawAjay(ctx, heroSx, groundY, s.hFacingLeft, heroAlpha);

    // ── Bullets ───────────────────────────────────────────────────────────────
    for (const b of s.bullets) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = b.fromPlayer ? "#ffdd00" : "#ff4400";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(b.x, b.y, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = "white";
      ctx.fill();
    }

    // ── Bombs ─────────────────────────────────────────────────────────────────
    for (const bomb of s.bombs) {
      const bsx = bomb.x - s.cameraX;
      if (!bomb.exploded) {
        ctx.font = "18px Arial";
        ctx.textAlign = "center";
        ctx.fillText("💣", bsx, groundY - 10);
      } else if (bomb.explodeTime < 0.5) {
        const r = BOMB_RADIUS * (bomb.explodeTime / 0.5);
        const alpha = 1 - bomb.explodeTime / 0.5;
        const eg = ctx.createRadialGradient(
          bsx,
          groundY - 20,
          0,
          bsx,
          groundY - 20,
          r,
        );
        eg.addColorStop(0, `rgba(255,255,150,${alpha})`);
        eg.addColorStop(0.4, `rgba(255,100,0,${alpha * 0.8})`);
        eg.addColorStop(1, "rgba(255,0,0,0)");
        ctx.beginPath();
        ctx.arc(bsx, groundY - 20, r, 0, Math.PI * 2);
        ctx.fillStyle = eg;
        ctx.fill();
      }
    }

    // ── Particles ─────────────────────────────────────────────────────────────
    for (const p of s.particles) {
      const alpha = p.life / p.maxLife;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle =
        p.color +
        Math.floor(alpha * 255)
          .toString(16)
          .padStart(2, "0");
      ctx.fill();
    }

    ctx.restore(); // end shake

    // ── HUD ───────────────────────────────────────────────────────────────────
    drawHUD(ctx, vw, vh, s);
    drawMinimap(ctx, vw, vh, s);

    // Level splash
    if (s.levelSplash > 0) {
      const alpha = Math.min(s.levelSplash, 1);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillRect(0, vh / 2 - 70, vw, 140);
      ctx.fillStyle = "#ffd700";
      ctx.font = `bold ${Math.floor(vw * 0.08)}px serif`;
      ctx.textAlign = "center";
      ctx.shadowBlur = 30;
      ctx.shadowColor = "#ff8800";
      ctx.fillText(`LEVEL ${s.level}`, vw / 2, vh / 2 - 10);
      ctx.font = `bold ${Math.floor(vw * 0.04)}px serif`;
      ctx.fillStyle = "#ff9900";
      ctx.fillText(s.levelTitle, vw / 2, vh / 2 + 40);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }

    // Copyright watermark
    ctx.globalAlpha = 0.25;
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
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.fillRect(0, 0, vw, 54);
    const heroName = s.hero === "humza" ? "Humza Ali Mazari" : "Ajay Sanyal";
    ctx.fillStyle = "#ffd700";
    ctx.font = "bold 12px serif";
    ctx.textAlign = "left";
    ctx.fillText(heroName, 10, 18);
    const hpW = 150;
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
    ctx.fillStyle = "#ffd700";
    ctx.font = `bold ${Math.floor(vw * 0.038)}px serif`;
    ctx.textAlign = "center";
    ctx.shadowBlur = 8;
    ctx.shadowColor = "#ff8800";
    ctx.fillText("DHURANDHAR", vw / 2, 20);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#ff9900";
    ctx.font = "11px Arial";
    ctx.fillText(`LEVEL ${s.level} — ${s.levelTitle}`, vw / 2, 38);
    ctx.textAlign = "right";
    ctx.fillStyle = "white";
    ctx.font = "bold 11px Arial";
    const ag = s.enemies.filter((e) => !e.dead && !e.isBoss).length;
    const ab = s.enemies.filter((e) => !e.dead && e.isBoss).length;
    ctx.fillText(`Enemies: ${ag}  Bosses: ${ab}/4`, vw - 10, 20);
    ctx.fillStyle = "#ffd700";
    ctx.fillText(`💣 x${s.hBombs}  Score: ${s.score}`, vw - 10, 38);
    // Mute
    ctx.textAlign = "right";
    ctx.font = "18px Arial";
    ctx.fillText(s.muted ? "🔇" : "🔊", vw - 8, 56);
    // Boss dialog
    const groundY = vh * GROUND_RATIO;
    for (const e of s.enemies) {
      if (!e.isBoss || e.dead || e.alertTimer <= 0) continue;
      const esx = e.x - s.cameraX;
      const bossIdx = BOSS_DEFS.findIndex((b) => b.name === e.name);
      drawSpeechBubble(
        ctx,
        esx,
        groundY - BOSS_H - 16,
        BOSS_DIALOG[bossIdx] ?? "You won't beat me!",
      );
    }
    // Copyright bar
    ctx.fillStyle = "rgba(0,0,0,0.8)";
    ctx.fillRect(0, vh - 20, vw, 20);
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
    const mm = { x: vw - 158, y: vh - 178, w: 148, h: 130 };
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(mm.x, mm.y, mm.w, mm.h);
    ctx.strokeStyle = "#ffd700";
    ctx.lineWidth = 1;
    ctx.strokeRect(mm.x, mm.y, mm.w, mm.h);
    const toMM = (wx: number) => ({
      x: mm.x + (wx / WORLD_W) * mm.w,
      y: mm.y + mm.h / 2,
    });
    for (const e of s.enemies) {
      if (e.dead) continue;
      const p = toMM(e.x);
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
    const pp = toMM(s.hx);
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

  function drawV16City(
    ctx: CanvasRenderingContext2D,
    vw: number,
    _vh: number,
    groundY: number,
    camX: number,
    lr: number,
  ) {
    // Layer 1 - far (slowest)
    const farC = lr > 0.5 ? ["#5a2010", "#4a1808"] : ["#c8a060", "#b89050"];
    for (let i = 0; i < 14; i++) {
      const bx =
        ((((i * 170 - camX * 0.06) % (vw + 200)) + vw + 200) % (vw + 200)) -
        100;
      const bh = 90 + (i % 4) * 45;
      ctx.fillStyle = farC[i % farC.length];
      ctx.fillRect(bx, groundY - bh, 150, bh);
      ctx.fillStyle = "rgba(0,0,0,0.18)";
      ctx.fillRect(bx, groundY - bh, 150, 8);
      ctx.fillStyle =
        lr > 0.5 ? "rgba(255,80,0,0.35)" : "rgba(255,230,130,0.45)";
      for (let wy = groundY - bh + 14; wy < groundY - 14; wy += 20) {
        for (let wx = bx + 8; wx < bx + 140; wx += 22) {
          ctx.fillRect(wx, wy, 12, 12);
        }
      }
    }
    // Layer 2 - mid
    const midC = lr > 0.5 ? ["#7a3020", "#6a2010"] : ["#e8b870", "#d09858"];
    for (let i = 0; i < 10; i++) {
      const bx =
        ((((i * 220 + 80 - camX * 0.14) % (vw + 260)) + vw + 260) %
          (vw + 260)) -
        130;
      const bh = 120 + (i % 3) * 65;
      ctx.fillStyle = midC[i % midC.length];
      ctx.fillRect(bx, groundY - bh, 180, bh);
      ctx.fillStyle = "rgba(0,0,0,0.15)";
      ctx.fillRect(bx + 162, groundY - bh, 18, bh);
      ctx.fillStyle = midC[i % midC.length];
      ctx.fillRect(bx - 5, groundY - bh - 10, 190, 11);
      ctx.fillStyle =
        lr > 0.5 ? "rgba(255,70,0,0.5)" : "rgba(255,220,100,0.55)";
      for (let wy = groundY - bh + 16; wy < groundY - 16; wy += 24) {
        for (let wx = bx + 12; wx < bx + 168; wx += 26) {
          ctx.fillRect(wx, wy, 14, 14);
        }
      }
      if (i % 3 === 0) {
        ctx.fillStyle = "rgba(170,40,40,0.8)";
        ctx.fillRect(bx + 10, groundY - 34, 160, 26);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 10px Arial";
        ctx.textAlign = "center";
        const signs = ["दुकान", "HOTEL", "CHAI", "786", "MARKET"];
        ctx.fillText(signs[i % signs.length], bx + 90, groundY - 15);
      }
    }
    // Layer 3 - near edges
    const nearC = lr > 0.5 ? "#3a1008" : "#a07840";
    for (let i = 0; i < 5; i++) {
      const bx =
        ((((i * 320 + 160 - camX * 0.22) % (vw + 320)) + vw + 320) %
          (vw + 320)) -
        160;
      const bh = 150 + (i % 2) * 90;
      ctx.fillStyle = nearC;
      ctx.fillRect(bx, groundY - bh, 70, bh);
    }
    // Haze
    const haze = ctx.createLinearGradient(0, groundY - 50, 0, groundY);
    haze.addColorStop(0, "rgba(0,0,0,0)");
    haze.addColorStop(
      1,
      lr > 0.5 ? "rgba(60,10,0,0.35)" : "rgba(160,110,30,0.28)",
    );
    ctx.fillStyle = haze;
    ctx.fillRect(0, groundY - 50, vw, 50);
  }

  function drawFire(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
  ) {
    const t = performance.now() / 100;
    for (let i = 0; i < 5; i++) {
      const fx = x + Math.sin(t + i * 1.3) * width * 0.3;
      const fh = 20 + Math.sin(t * 0.7 + i) * 10;
      const fg = ctx.createRadialGradient(fx, y, 0, fx, y - fh, fh);
      fg.addColorStop(0, "rgba(255,240,0,0.9)");
      fg.addColorStop(0.5, "rgba(255,100,0,0.7)");
      fg.addColorStop(1, "rgba(255,0,0,0)");
      ctx.beginPath();
      ctx.ellipse(fx, y - fh / 2, width * 0.14, fh / 2, 0, 0, Math.PI * 2);
      ctx.fillStyle = fg;
      ctx.fill();
    }
  }

  function drawSmoke(ctx: CanvasRenderingContext2D, x: number, y: number) {
    const t = performance.now() / 1000;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(
        x + Math.sin(t + i) * 10,
        y - i * 38,
        14 + i * 11,
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = `rgba(80,80,80,${0.38 - i * 0.08})`;
      ctx.fill();
    }
  }

  function drawSpeechBubble(
    ctx: CanvasRenderingContext2D,
    sx: number,
    sy: number,
    text: string,
  ) {
    const maxW = 200;
    ctx.font = "11px Arial";
    const lines: string[] = [];
    const words = text.split(" ");
    let line = "";
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (ctx.measureText(test).width > maxW - 16) {
        lines.push(line);
        line = w;
      } else line = test;
    }
    if (line) lines.push(line);
    const lh = 14;
    const bh = lines.length * lh + 12;
    const bw = Math.min(
      maxW,
      Math.max(...lines.map((l) => ctx.measureText(l).width)) + 20,
    );
    const bx = sx - bw / 2;
    const by = sy - bh;
    ctx.fillStyle = "rgba(255,255,220,0.95)";
    ctx.strokeStyle = "#888";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 6);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(sx - 5, by + bh);
    ctx.lineTo(sx, by + bh + 8);
    ctx.lineTo(sx + 5, by + bh);
    ctx.fillStyle = "rgba(255,255,220,0.95)";
    ctx.fill();
    ctx.fillStyle = "#333";
    ctx.font = "11px Arial";
    ctx.textAlign = "left";
    for (let i = 0; i < lines.length; i++)
      ctx.fillText(lines[i], bx + 8, by + 14 + i * lh);
  }

  // ─── Touch Controls ─────────────────────────────────────────────────────────

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
    const len = Math.sqrt(dx * dx + dy * dy);
    const maxR = 40;
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
  function handleCanvasTap(e: React.MouseEvent<HTMLCanvasElement>) {
    if (e.clientX > window.innerWidth - 50 && e.clientY < 70) handleMuteBtn();
  }

  // ─── Menu Render ────────────────────────────────────────────────────────────

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
    // Background
    const bg = ctx.createLinearGradient(0, 0, 0, vh);
    bg.addColorStop(0, "#1a1050");
    bg.addColorStop(0.5, "#c87030");
    bg.addColorStop(1, "#3a2010");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, vw, vh);
    // Silhouette city
    ctx.fillStyle = "#2a1808";
    for (let i = 0; i < 16; i++) {
      const bx = i * (vw / 16);
      const bh = 80 + (i % 5) * 40;
      ctx.fillRect(bx, vh * 0.6 - bh, vw / 16 - 2, bh + vh * 0.4);
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
      ctx.font = `${Math.floor(vw * 0.025)}px serif`;
      ctx.fillText("Save the Country. Hunt the Villains.", vw / 2, vh * 0.36);
      ctx.fillStyle = "rgba(255,255,255,0.65)";
      ctx.font = "13px Arial";
      ctx.fillText(
        "© 2026 Priyanka Sharma | priyankadsharma11@gmail.com",
        vw / 2,
        vh * 0.42,
      );
    } else if (phase === "win") {
      ctx.fillStyle = "#ffd700";
      ctx.font = `bold ${Math.floor(vw * 0.08)}px serif`;
      ctx.textAlign = "center";
      ctx.shadowBlur = 30;
      ctx.shadowColor = "#ff8800";
      ctx.fillText("MISSION COMPLETE!", vw / 2, vh * 0.3);
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#00ff88";
      ctx.font = `${Math.floor(vw * 0.035)}px Arial`;
      ctx.fillText("You saved the country!", vw / 2, vh * 0.42);
      const ss = stateRef.current;
      if (ss) {
        ctx.fillStyle = "white";
        ctx.font = "17px Arial";
        ctx.fillText(
          `Final Score: ${ss.score}  |  Level: ${ss.level}`,
          vw / 2,
          vh * 0.52,
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
  }, [phase]);

  // ─── JSX ────────────────────────────────────────────────────────────────────

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      <canvas
        ref={canvasRef}
        className="block w-full h-full"
        onClick={handleCanvasTap}
        onKeyDown={() => {}}
        style={{ touchAction: "none" }}
      />

      {phase === "menu" && (
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-14 pointer-events-none">
          <div className="pointer-events-auto flex flex-col items-center gap-5">
            <div className="flex gap-5">
              <button
                type="button"
                onClick={() => setHero("humza")}
                className={`px-6 py-3 rounded-lg font-bold text-lg transition-all border-2 ${
                  hero === "humza"
                    ? "bg-yellow-500 text-black border-yellow-300 scale-105"
                    : "bg-black/60 text-yellow-400 border-yellow-600 hover:bg-black/80"
                }`}
              >
                Humza Ali Mazari
              </button>
              <button
                type="button"
                onClick={() => setHero("ajay")}
                className={`px-6 py-3 rounded-lg font-bold text-lg transition-all border-2 ${
                  hero === "ajay"
                    ? "bg-yellow-500 text-black border-yellow-300 scale-105"
                    : "bg-black/60 text-yellow-400 border-yellow-600 hover:bg-black/80"
                }`}
              >
                Ajay Sanyal
              </button>
            </div>
            <button
              type="button"
              data-ocid="game.start.primary_button"
              onClick={() => startGame(hero)}
              className="px-12 py-4 bg-gradient-to-b from-yellow-400 to-orange-600 text-black font-black text-2xl rounded-xl shadow-2xl hover:from-yellow-300 active:scale-95 transition-all uppercase tracking-widest"
            >
              START GAME
            </button>
            <p className="text-yellow-600 text-sm">
              A/D or Arrow Keys to move • Space to fire • B for bomb
            </p>
          </div>
        </div>
      )}

      {(phase === "win" || phase === "gameover") && (
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-20 pointer-events-none">
          <button
            type="button"
            data-ocid="game.restart.primary_button"
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
            className="absolute bottom-8 left-6 w-28 h-28 rounded-full border-2 border-yellow-500/40 bg-black/30 flex items-center justify-center"
            onTouchStart={handleJoystickStart}
            onTouchMove={handleJoystickMove}
            onTouchEnd={handleJoystickEnd}
            style={{ touchAction: "none" }}
          >
            <div className="w-12 h-12 rounded-full bg-yellow-500/30 border border-yellow-400/50" />
          </div>
          <div className="absolute bottom-8 right-4 flex flex-col gap-3">
            <button
              type="button"
              onTouchStart={(e) => {
                e.preventDefault();
                handleBombBtn();
              }}
              className="w-16 h-16 rounded-full bg-orange-700/80 border-2 border-orange-400 text-white font-bold text-2xl flex items-center justify-center active:scale-90"
            >
              💣
            </button>
            <button
              type="button"
              data-ocid="game.fire.primary_button"
              onTouchStart={(e) => {
                e.preventDefault();
                handleFireBtn();
              }}
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
