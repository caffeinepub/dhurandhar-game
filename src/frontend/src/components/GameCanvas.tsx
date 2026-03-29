import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSubmitScore } from "../hooks/useQueries";

// ── Constants ────────────────────────────────────────────────────────
const CW = 950;
const CH = 600;
const WW = 3000;
const WH = 3000;
const WCX = 1500;
const WCY = 1500;
const PLAYER_SPEED = 3.5;
const ZONE_SHRINK_INTERVAL = 30000;
const INITIAL_ZONE_RADIUS = 1450;

const WEAPONS = [
  {
    name: "SWORD",
    damage: 25,
    cooldown: 800,
    ranged: false,
    color: "#C9A35A",
    projSpeed: 0,
  },
  {
    name: "BOW & ARROW",
    damage: 20,
    cooldown: 1200,
    ranged: true,
    color: "#8B6914",
    projSpeed: 8,
  },
  {
    name: "SPEAR",
    damage: 35,
    cooldown: 2000,
    ranged: true,
    color: "#A0522D",
    projSpeed: 7,
  },
];

const HEROES = [
  {
    name: "Humza Ali Mazari",
    role: "Rebel Fighter",
    color: "#FF6D00",
    shadowColor: "#BF360C",
    weapon: 0,
  },
  {
    name: "Ajay Sanyal",
    role: "Spy Agent",
    color: "#3949AB",
    shadowColor: "#1A237E",
    weapon: 1,
  },
];

// ── Types ────────────────────────────────────────────────────────────
interface Vec2 {
  x: number;
  y: number;
}
interface Player {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  weapon: number;
  lastAttack: number;
  angle: number;
  alive: boolean;
}
interface Enemy {
  id: number;
  type: "soldier" | "boss1" | "boss2" | "boss3" | "boss4";
  name: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  damage: number;
  speed: number;
  lastAttack: number;
  waypointX: number;
  waypointY: number;
  alive: boolean;
  flashTimer: number;
  deathAlpha: number;
  lastProjectile: number;
  radius: number;
}
interface NPC {
  id: number;
  name: string;
  x: number;
  y: number;
  color: string;
  crownColor: string;
  dialogue: string;
  hasCrown: boolean;
}
interface Projectile {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: "arrow" | "spear" | "enemy";
  damage: number;
  distTraveled: number;
  maxDist: number;
  alive: boolean;
  fromPlayer: boolean;
}
interface Loot {
  id: number;
  x: number;
  y: number;
  type: "sword" | "bow" | "spear" | "health";
  alive: boolean;
}
interface Tree {
  x: number;
  y: number;
  r: number;
  color: string;
}
interface Building {
  x: number;
  y: number;
  w: number;
  h: number;
  type: "hut" | "wall";
}
interface GameStateRef {
  camX: number;
  camY: number;
  mouseX: number;
  mouseY: number;
  keys: Set<string>;
  kills: number;
  score: number;
  zoneRadius: number;
  zoneTargetRadius: number;
  zoneLastShrink: number;
  lastZoneDamage: number;
  startTime: number;
  lastFrame: number;
  lastSurviveCheck: number;
  dialogue: { name: string; text: string } | null;
  projCounter: number;
  blinkTimer: number;
  bossElimMsg: { text: string; until: number } | null;
}

type GamePhase =
  | "start"
  | "charSelect"
  | "playing"
  | "paused"
  | "gameover"
  | "victory";

// ── Helpers ───────────────────────────────────────────────────────────
function dist(ax: number, ay: number, bx: number, by: number) {
  return Math.hypot(ax - bx, ay - by);
}
function circleAABB(
  cx: number,
  cy: number,
  cr: number,
  rx: number,
  ry: number,
  rw: number,
  rh: number,
) {
  const nearX = Math.max(rx, Math.min(cx, rx + rw));
  const nearY = Math.max(ry, Math.min(cy, ry + rh));
  return dist(cx, cy, nearX, nearY) < cr;
}
function drawHealthBar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  w: number,
  hp: number,
  maxHp: number,
) {
  const pct = Math.max(0, hp / maxHp);
  ctx.fillStyle = "#222";
  ctx.fillRect(cx - w / 2, cy, w, 5);
  ctx.fillStyle = pct > 0.5 ? "#4CAF50" : pct > 0.25 ? "#FF9800" : "#F44336";
  ctx.fillRect(cx - w / 2, cy, w * pct, 5);
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 0.5;
  ctx.strokeRect(cx - w / 2, cy, w, 5);
}
function drawCrown(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  color: string,
) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx - size, cy);
  ctx.lineTo(cx - size, cy - size * 1.2);
  ctx.lineTo(cx - size * 0.3, cy - size * 0.6);
  ctx.lineTo(cx, cy - size * 1.5);
  ctx.lineTo(cx + size * 0.3, cy - size * 0.6);
  ctx.lineTo(cx + size, cy - size * 1.2);
  ctx.lineTo(cx + size, cy);
  ctx.closePath();
  ctx.fill();
}

// ── Seeded random ─────────────────────────────────────────────────────
function mkRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

// ── World generation ──────────────────────────────────────────────────
function genWorld(rng: () => number) {
  const trees: Tree[] = [];
  const buildings: Building[] = [];
  const loot: Loot[] = [];

  for (let i = 0; i < 160; i++) {
    const angle = rng() * Math.PI * 2;
    const radius = 1200 + rng() * 1200;
    const x = WCX + Math.cos(angle) * radius;
    const y = WCY + Math.sin(angle) * radius;
    if (x > 50 && x < WW - 50 && y > 50 && y < WH - 50) {
      trees.push({
        x,
        y,
        r: 12 + rng() * 10,
        color: rng() < 0.3 ? "#0D2B1A" : "#1A4D2E",
      });
    }
  }
  for (let i = 0; i < 40; i++) {
    const angle = rng() * Math.PI * 2;
    const radius = 800 + rng() * 400;
    const x = WCX + Math.cos(angle) * radius;
    const y = WCY + Math.sin(angle) * radius;
    if (x > 100 && x < WW - 100 && y > 100 && y < WH - 100)
      trees.push({ x, y, r: 10 + rng() * 6, color: "#2E7D32" });
  }
  for (let i = 0; i < 40; i++) {
    const angle = rng() * Math.PI * 2;
    const radius = 900 + rng() * 400;
    const x = WCX + Math.cos(angle) * radius;
    const y = WCY + Math.sin(angle) * radius;
    const w = 40 + rng() * 30;
    const h = 30 + rng() * 25;
    buildings.push({ x: x - w / 2, y: y - h / 2, w, h, type: "hut" });
  }
  for (let i = 0; i < 20; i++) {
    const angle = (i / 20) * Math.PI * 2;
    const radius = 400 + rng() * 300;
    const x = WCX + Math.cos(angle) * radius;
    const y = WCY + Math.sin(angle) * radius;
    const isVert = rng() < 0.5;
    const w = isVert ? 12 : 60 + rng() * 40;
    const h = isVert ? 60 + rng() * 40 : 12;
    buildings.push({ x: x - w / 2, y: y - h / 2, w, h, type: "wall" });
  }

  let lootId = 0;
  for (let i = 0; i < 6; i++) {
    const angle = rng() * Math.PI * 2;
    const r = 500 + rng() * 800;
    loot.push({
      id: lootId++,
      x: WCX + Math.cos(angle) * r,
      y: WCY + Math.sin(angle) * r,
      type: "sword",
      alive: true,
    });
  }
  for (let i = 0; i < 6; i++) {
    const angle = rng() * Math.PI * 2;
    const r = 500 + rng() * 800;
    loot.push({
      id: lootId++,
      x: WCX + Math.cos(angle) * r,
      y: WCY + Math.sin(angle) * r,
      type: "bow",
      alive: true,
    });
  }
  for (let i = 0; i < 4; i++) {
    const angle = rng() * Math.PI * 2;
    const r = 300 + rng() * 600;
    loot.push({
      id: lootId++,
      x: WCX + Math.cos(angle) * r,
      y: WCY + Math.sin(angle) * r,
      type: "spear",
      alive: true,
    });
  }
  for (let i = 0; i < 18; i++) {
    const angle = rng() * Math.PI * 2;
    const r = 200 + rng() * 1200;
    loot.push({
      id: lootId++,
      x: WCX + Math.cos(angle) * r,
      y: WCY + Math.sin(angle) * r,
      type: "health",
      alive: true,
    });
  }

  return { trees, buildings, loot };
}

function genEnemies(rng: () => number): Enemy[] {
  const enemies: Enemy[] = [];
  let id = 0;

  // 14 Dakait Goon soldiers scattered around center
  for (let i = 0; i < 14; i++) {
    const angle = rng() * Math.PI * 2;
    const radius = 500 + rng() * 700;
    const wx = Math.max(
      100,
      Math.min(WW - 100, WCX + Math.cos(angle) * radius),
    );
    const wy = Math.max(
      100,
      Math.min(WH - 100, WCY + Math.sin(angle) * radius),
    );
    enemies.push({
      id: id++,
      type: "soldier",
      name: "Dakait Goon",
      x: wx,
      y: wy,
      hp: 50,
      maxHp: 50,
      damage: 8,
      speed: 1.8,
      lastAttack: 0,
      waypointX: Math.max(100, Math.min(WW - 100, wx + (rng() - 0.5) * 300)),
      waypointY: Math.max(100, Math.min(WH - 100, wy + (rng() - 0.5) * 300)),
      alive: true,
      flashTimer: 0,
      deathAlpha: 1,
      lastProjectile: 0,
      radius: 14,
    });
  }

  // boss1 — Rehman Dakait: hides in SOUTH zone
  enemies.push({
    id: id++,
    type: "boss1",
    name: "Rehman Dakait",
    x: WCX + 100,
    y: WCY + 800,
    hp: 300,
    maxHp: 300,
    damage: 18,
    speed: 1.8,
    lastAttack: 0,
    waypointX: WCX,
    waypointY: WCY + 750,
    alive: true,
    flashTimer: 0,
    deathAlpha: 1,
    lastProjectile: 0,
    radius: 22,
  });

  // boss2 — SP Aslam Choudhury: hides in WEST zone
  enemies.push({
    id: id++,
    type: "boss2",
    name: "SP Aslam Choudhury",
    x: WCX - 800,
    y: WCY - 50,
    hp: 250,
    maxHp: 250,
    damage: 16,
    speed: 2.0,
    lastAttack: 0,
    waypointX: WCX - 750,
    waypointY: WCY,
    alive: true,
    flashTimer: 0,
    deathAlpha: 1,
    lastProjectile: 0,
    radius: 20,
  });

  // boss3 — Major Iqbal: hides in NORTH zone
  enemies.push({
    id: id++,
    type: "boss3",
    name: "Major Iqbal",
    x: WCX - 100,
    y: WCY - 800,
    hp: 350,
    maxHp: 350,
    damage: 22,
    speed: 1.5,
    lastAttack: 0,
    waypointX: WCX,
    waypointY: WCY - 750,
    alive: true,
    flashTimer: 0,
    deathAlpha: 1,
    lastProjectile: 0,
    radius: 24,
  });

  // boss4 — Jameel Jamali: hides in EAST zone
  enemies.push({
    id: id++,
    type: "boss4",
    name: "Jameel Jamali",
    x: WCX + 800,
    y: WCY + 50,
    hp: 200,
    maxHp: 200,
    damage: 14,
    speed: 2.2,
    lastAttack: 0,
    waypointX: WCX + 750,
    waypointY: WCY,
    alive: true,
    flashTimer: 0,
    deathAlpha: 1,
    lastProjectile: 0,
    radius: 18,
  });

  return enemies;
}

function genNPCs(): NPC[] {
  return [
    {
      id: 0,
      name: "INTEL OFFICER",
      x: WCX + 180,
      y: WCY - 120,
      color: "#00BCD4",
      crownColor: "",
      hasCrown: false,
      dialogue:
        "Rehman Dakait was spotted to the SOUTH! Head south past the river!",
    },
    {
      id: 1,
      name: "FIELD AGENT",
      x: WCX - 220,
      y: WCY + 140,
      color: "#E91E63",
      crownColor: "",
      hasCrown: false,
      dialogue:
        "SP Aslam Choudhury is hiding in the WEST. Be careful — he has a unit with him!",
    },
    {
      id: 2,
      name: "RESISTANCE FIGHTER",
      x: WCX + 300,
      y: WCY + 250,
      color: "#FFD600",
      crownColor: "",
      hasCrown: false,
      dialogue:
        "Major Iqbal is commanding from the NORTH. Take out his soldiers first!",
    },
    {
      id: 3,
      name: "INFORMANT",
      x: WCX - 180,
      y: WCY - 280,
      color: "#FFFFFF",
      crownColor: "#FFD700",
      hasCrown: true,
      dialogue:
        'Jameel Jamali is in the EAST — says "baccha hai tu mera" but he\'s dangerous!',
    },
  ];
}

// ── Audio ─────────────────────────────────────────────────────────────
function startBGM(ctx: AudioContext, masterGain: GainNode): () => void {
  const bgmGain = ctx.createGain();
  bgmGain.gain.setValueAtTime(0.06, ctx.currentTime);
  bgmGain.connect(masterGain);

  const notes = [147, 175, 196, 220, 175, 196, 147, 261, 220, 196];
  let noteIdx = 0;
  let running = true;

  const playNext = () => {
    if (!running || ctx.state === "closed") return;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = notes[noteIdx % notes.length];
    env.gain.setValueAtTime(0.08, ctx.currentTime);
    env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);
    osc.connect(env);
    env.connect(bgmGain);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.6);
    noteIdx++;
    setTimeout(playNext, 580);
  };

  const playBeat = () => {
    if (!running || ctx.state === "closed") return;
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++)
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.15, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    src.connect(g);
    g.connect(bgmGain);
    src.start();
    setTimeout(playBeat, 600);
  };

  playNext();
  playBeat();

  return () => {
    running = false;
  };
}

// ── Sound effects ─────────────────────────────────────────────────────
function playGunshot(ctx: AudioContext, masterGain: GainNode) {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.12, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++)
    d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (d.length * 0.15));
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.7, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
  src.connect(g);
  g.connect(masterGain);
  src.start();
}

function playHit(ctx: AudioContext, masterGain: GainNode) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(180, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.15);
  g.gain.setValueAtTime(0.5, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
  osc.connect(g);
  g.connect(masterGain);
  osc.start();
  osc.stop(ctx.currentTime + 0.2);
}

function playBossAlert(ctx: AudioContext, masterGain: GainNode) {
  const freqs = [220, 277, 330, 415];
  freqs.forEach((f, i) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = f;
    const t = ctx.currentTime + i * 0.12;
    g.gain.setValueAtTime(0.0, t);
    g.gain.linearRampToValueAtTime(0.25, t + 0.04);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    osc.connect(g);
    g.connect(masterGain);
    osc.start(t);
    osc.stop(t + 0.4);
  });
}

function playVictory(ctx: AudioContext, masterGain: GainNode) {
  const melody = [261, 329, 392, 523, 659, 784];
  melody.forEach((f, i) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = f;
    const t = ctx.currentTime + i * 0.2;
    g.gain.setValueAtTime(0.4, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    osc.connect(g);
    g.connect(masterGain);
    osc.start(t);
    osc.stop(t + 0.5);
  });
}

function playDeath(ctx: AudioContext, masterGain: GainNode) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(220, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(55, ctx.currentTime + 1.2);
  g.gain.setValueAtTime(0.45, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
  osc.connect(g);
  g.connect(masterGain);
  osc.start();
  osc.stop(ctx.currentTime + 1.2);
}

function playNPCInteraction(ctx: AudioContext, masterGain: GainNode) {
  [523, 659, 784].forEach((f, i) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = f;
    const t = ctx.currentTime + i * 0.1;
    g.gain.setValueAtTime(0.25, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    osc.connect(g);
    g.connect(masterGain);
    osc.start(t);
    osc.stop(t + 0.2);
  });
}

// ── Component ─────────────────────────────────────────────────────────
export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const stopMusicRef = useRef<(() => void) | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const isMutedRef = useRef(false);

  const playerRef = useRef<Player>({
    x: WCX + 600,
    y: WCY + 600,
    hp: 100,
    maxHp: 100,
    weapon: 0,
    lastAttack: 0,
    angle: 0,
    alive: true,
  });
  const enemiesRef = useRef<Enemy[]>([]);
  const npcsRef = useRef<NPC[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const lootRef = useRef<Loot[]>([]);
  const treesRef = useRef<Tree[]>([]);
  const buildingsRef = useRef<Building[]>([]);

  const gsRef = useRef<GameStateRef>({
    camX: 0,
    camY: 0,
    mouseX: CW / 2,
    mouseY: CH / 2,
    keys: new Set<string>(),
    kills: 0,
    score: 0,
    zoneRadius: INITIAL_ZONE_RADIUS,
    zoneTargetRadius: INITIAL_ZONE_RADIUS,
    zoneLastShrink: 0,
    lastZoneDamage: 0,
    startTime: 0,
    lastFrame: 0,
    lastSurviveCheck: 0,
    dialogue: null,
    projCounter: 0,
    blinkTimer: 0,
    bossElimMsg: null,
  });

  // Joystick refs (no re-renders)
  const joystickActive = useRef(false);
  const joystickDx = useRef(0);
  const joystickDy = useRef(0);
  const joystickKnobPos = useRef({ x: 0, y: 0 });
  const joystickOrigin = useRef({ x: 0, y: 0 });
  const [joystickKnob, setJoystickKnob] = useState({ x: 0, y: 0 });

  const [phase, setPhase] = useState<GamePhase>("start");
  const [_selectedCharIdx, setSelectedCharIdx] = useState(0);
  const selectedCharIdxRef = useRef(0);
  const [displayScore, setDisplayScore] = useState(0);
  const [displayKills, setDisplayKills] = useState(0);
  const [playerName, setPlayerName] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const phaseRef = useRef<GamePhase>("start");
  const charImagesRef = useRef<Record<string, HTMLImageElement>>({});
  const terrainImgsRef = useRef<Record<string, HTMLImageElement>>({});

  // Detect touch / mobile
  const isMobile =
    typeof window !== "undefined" &&
    ("ontouchstart" in window || window.innerWidth < 768);

  const submitScore = useSubmitScore();

  // Preload character images
  useEffect(() => {
    const imgs: Record<string, HTMLImageElement> = {};
    const charMap: Record<string, string> = {
      humza: "/assets/generated/char-humza-transparent.dim_120x180.png",
      ajay: "/assets/generated/char-ajay-transparent.dim_120x180.png",
      rehman: "/assets/generated/char-rehman-transparent.dim_120x180.png",
      sp: "/assets/generated/char-sp-transparent.dim_120x180.png",
      major: "/assets/generated/char-major-transparent.dim_120x180.png",
      jameel: "/assets/generated/char-jameel-transparent.dim_120x180.png",
    };
    for (const [key, src] of Object.entries(charMap)) {
      const img = new Image();
      img.src = src;
      imgs[key] = img;
    }
    charImagesRef.current = imgs;
    const terrainSrcs: Record<string, string> = {
      ground: "/assets/generated/terrain-ground.dim_512x512.jpg",
      mountain: "/assets/generated/terrain-mountain.dim_512x512.jpg",
      village: "/assets/generated/terrain-village.dim_512x512.jpg",
    };
    const terrainImgs: Record<string, HTMLImageElement> = {};
    for (const [key, src] of Object.entries(terrainSrcs)) {
      const timg = new Image();
      timg.src = src;
      terrainImgs[key] = timg;
    }
    terrainImgsRef.current = terrainImgs;
  }, []);

  const wts = useCallback((wx: number, wy: number): Vec2 => {
    const gs = gsRef.current;
    return { x: wx - gs.camX, y: wy - gs.camY };
  }, []);

  const startAudio = useCallback(() => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const ctx2 = new AudioCtx();
      audioCtxRef.current = ctx2;
      const mg = ctx2.createGain();
      mg.gain.setValueAtTime(isMutedRef.current ? 0 : 1, ctx2.currentTime);
      mg.connect(ctx2.destination);
      masterGainRef.current = mg;
      stopMusicRef.current = startBGM(ctx2, mg);
    } catch {
      /* audio not available */
    }
  }, []);

  const initGame = useCallback(() => {
    const rng = mkRng(42);
    const { trees, buildings, loot } = genWorld(rng);
    treesRef.current = trees;
    buildingsRef.current = buildings;
    lootRef.current = loot;
    enemiesRef.current = genEnemies(mkRng(99));
    npcsRef.current = genNPCs();
    projectilesRef.current = [];

    playerRef.current = {
      x: WCX + 600,
      y: WCY + 600,
      hp: 100,
      maxHp: 100,
      weapon: 0,
      lastAttack: 0,
      angle: 0,
      alive: true,
    };

    const gs = gsRef.current;
    gs.kills = 0;
    gs.score = 0;
    gs.zoneRadius = INITIAL_ZONE_RADIUS;
    gs.zoneTargetRadius = INITIAL_ZONE_RADIUS;
    gs.zoneLastShrink = Date.now();
    gs.lastZoneDamage = 0;
    gs.startTime = Date.now();
    gs.lastSurviveCheck = Date.now();
    gs.dialogue = null;
    gs.projCounter = 0;
    gs.blinkTimer = 0;
    gs.bossElimMsg = null;
  }, []);

  const resolveCollision = useCallback(
    (nx: number, ny: number, radius: number): Vec2 => {
      let rx = nx;
      let ry = ny;
      for (const b of buildingsRef.current) {
        if (circleAABB(rx, ry, radius, b.x, b.y, b.w, b.h)) {
          const bcx = b.x + b.w / 2;
          const bcy = b.y + b.h / 2;
          const dx = rx - bcx;
          const dy = ry - bcy;
          const overlapX = radius + b.w / 2 - Math.abs(dx);
          const overlapY = radius + b.h / 2 - Math.abs(dy);
          if (overlapX < overlapY) rx += Math.sign(dx) * overlapX;
          else ry += Math.sign(dy) * overlapY;
        }
      }
      for (const t of treesRef.current) {
        const d = dist(rx, ry, t.x, t.y);
        const minD = radius + t.r * 0.6;
        if (d < minD) {
          const ang = Math.atan2(ry - t.y, rx - t.x);
          rx = t.x + Math.cos(ang) * minD;
          ry = t.y + Math.sin(ang) * minD;
        }
      }
      rx = Math.max(radius, Math.min(WW - radius, rx));
      ry = Math.max(radius, Math.min(WH - radius, ry));
      return { x: rx, y: ry };
    },
    [],
  );

  const fireProjectile = useCallback(
    (
      fromPlayer: boolean,
      x: number,
      y: number,
      angle: number,
      type: Projectile["type"],
      damage: number,
      speed: number,
    ) => {
      const gs = gsRef.current;
      projectilesRef.current.push({
        id: gs.projCounter++,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        type,
        damage,
        distTraveled: 0,
        maxDist: fromPlayer ? 420 : 280,
        alive: true,
        fromPlayer,
      });
    },
    [],
  );

  const playerAttack = useCallback(() => {
    const p = playerRef.current;
    const gs = gsRef.current;
    const now = Date.now();
    const wep = WEAPONS[p.weapon];
    if (now - p.lastAttack < wep.cooldown) return;
    p.lastAttack = now;

    if (!wep.ranged) {
      for (const e of enemiesRef.current) {
        if (!e.alive) continue;
        const d = dist(p.x, p.y, e.x, e.y);
        if (d > 80) continue;
        const ang = Math.atan2(e.y - p.y, e.x - p.x);
        const diff = Math.abs(ang - p.angle);
        const angleDiff = diff > Math.PI ? Math.PI * 2 - diff : diff;
        if (angleDiff < Math.PI / 2.5) {
          e.hp -= wep.damage;
          e.flashTimer = 6;
          if (e.hp <= 0) {
            e.alive = false;
            e.deathAlpha = 1;
            gs.kills++;
            const isBoss = e.type !== "soldier";
            gs.score += isBoss ? 500 : 100;
            if (isBoss) {
              gs.bossElimMsg = {
                text: `${e.name} ELIMINATED!`,
                until: Date.now() + 2500,
              };
            }
            lootRef.current.push({
              id: gs.projCounter++,
              x: e.x + (Math.random() - 0.5) * 30,
              y: e.y + (Math.random() - 0.5) * 30,
              type: isBoss
                ? "health"
                : (["health", "sword", "bow", "spear"][
                    Math.floor(Math.random() * 4)
                  ] as Loot["type"]),
              alive: true,
            });
          }
        }
      }
    } else {
      const pType: Projectile["type"] = p.weapon === 2 ? "spear" : "arrow";
      fireProjectile(true, p.x, p.y, p.angle, pType, wep.damage, wep.projSpeed);
    }
    if (audioCtxRef.current && masterGainRef.current && !isMutedRef.current) {
      playGunshot(audioCtxRef.current, masterGainRef.current);
    }
  }, [fireProjectile]);

  // ── Draw helpers ──────────────────────────────────────────────────────
  const drawScene = useCallback(
    (ctx: CanvasRenderingContext2D, now: number) => {
      const gs = gsRef.current;
      const p = playerRef.current;

      gs.camX = Math.max(0, Math.min(WW - CW, p.x - CW / 2));
      gs.camY = Math.max(0, Math.min(WH - CH, p.y - CH / 2));

      // Background terrain
      const tileSize = 40;
      const tx0 = Math.floor(gs.camX / tileSize);
      const ty0 = Math.floor(gs.camY / tileSize);
      const tx1 = tx0 + Math.ceil(CW / tileSize) + 2;
      const ty1 = ty0 + Math.ceil(CH / tileSize) + 2;
      for (let tx = tx0; tx < tx1; tx++) {
        for (let ty = ty0; ty < ty1; ty++) {
          const wx = tx * tileSize;
          const wy = ty * tileSize;
          const screenX = tx * tileSize - gs.camX;
          const screenY = ty * tileSize - gs.camY;
          const d = dist(wx + tileSize / 2, wy + tileSize / 2, WCX, WCY);
          let terrainKey: string;
          let fallbackCol: string;
          if (d < 800) {
            terrainKey = "village";
            fallbackCol = tx % 4 === 0 || ty % 4 === 0 ? "#2E2E2E" : "#4A4A4A";
          } else if (d < 1400) {
            terrainKey = "ground";
            fallbackCol = (tx + ty) % 7 < 2 ? "#6B4C1A" : "#8B6914";
          } else {
            terrainKey = "mountain";
            fallbackCol = (tx * 3 + ty * 7) % 5 < 2 ? "#0A2214" : "#0D2B1A";
          }
          const terrainImg = terrainImgsRef.current[terrainKey];
          if (terrainImg?.complete && terrainImg.naturalWidth > 0) {
            const srcX = (tx * tileSize) % 512;
            const srcY = (ty * tileSize) % 512;
            if (srcX + tileSize <= 512 && srcY + tileSize <= 512) {
              ctx.drawImage(
                terrainImg,
                srcX,
                srcY,
                tileSize,
                tileSize,
                screenX,
                screenY,
                tileSize + 1,
                tileSize + 1,
              );
            } else {
              ctx.drawImage(
                terrainImg,
                0,
                0,
                tileSize,
                tileSize,
                screenX,
                screenY,
                tileSize + 1,
                tileSize + 1,
              );
            }
          } else {
            ctx.fillStyle = fallbackCol;
            ctx.fillRect(screenX, screenY, tileSize + 1, tileSize + 1);
          }
        }
      }

      // Safe zone overlay
      const zoneScreenX = WCX - gs.camX;
      const zoneScreenY = WCY - gs.camY;
      const zr = gs.zoneRadius;
      ctx.save();
      ctx.fillStyle = "rgba(0, 40, 180, 0.28)";
      ctx.beginPath();
      ctx.rect(0, 0, CW, CH);
      ctx.arc(zoneScreenX, zoneScreenY, zr, 0, Math.PI * 2, true);
      ctx.fill();
      ctx.restore();

      const pulse = 0.7 + 0.3 * Math.sin(now * 0.003);
      ctx.strokeStyle = `rgba(80, 140, 255, ${pulse})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(zoneScreenX, zoneScreenY, zr, 0, Math.PI * 2);
      ctx.stroke();

      // Buildings
      for (const b of buildingsRef.current) {
        const sx = b.x - gs.camX;
        const sy = b.y - gs.camY;
        if (sx > -b.w && sx < CW && sy > -b.h && sy < CH) {
          if (b.type === "hut") {
            ctx.fillStyle = "#5C3D1A";
            ctx.fillRect(sx, sy, b.w, b.h);
            ctx.fillStyle = "#7A4E2A";
            ctx.fillRect(sx, sy, b.w, 6);
            ctx.strokeStyle = "#3A2010";
            ctx.lineWidth = 1.5;
            ctx.strokeRect(sx, sy, b.w, b.h);
          } else {
            ctx.fillStyle = "#555";
            ctx.fillRect(sx, sy, b.w, b.h);
            ctx.strokeStyle = "#333";
            ctx.lineWidth = 1;
            ctx.strokeRect(sx, sy, b.w, b.h);
          }
        }
      }

      // Trees
      for (const t of treesRef.current) {
        const sp = wts(t.x, t.y);
        if (sp.x < -t.r || sp.x > CW + t.r || sp.y < -t.r || sp.y > CH + t.r)
          continue;
        ctx.save();
        ctx.shadowColor = t.color;
        ctx.shadowBlur = 6;
        ctx.fillStyle = t.color;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, t.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Loot
      for (const l of lootRef.current) {
        if (!l.alive) continue;
        const sp = wts(l.x, l.y);
        if (sp.x < -20 || sp.x > CW + 20 || sp.y < -20 || sp.y > CH + 20)
          continue;
        const bob = Math.sin(now * 0.004 + l.id) * 3;
        if (l.type === "health") {
          ctx.save();
          ctx.translate(sp.x, sp.y + bob);
          ctx.rotate(Math.PI / 4);
          ctx.fillStyle = "#4CAF50";
          ctx.fillRect(-8, -8, 16, 16);
          ctx.restore();
          ctx.fillStyle = "#80E080";
          ctx.font = "bold 9px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("+HP", sp.x, sp.y - 14 + bob);
        } else {
          const colors: Record<string, string> = {
            sword: "#C9A35A",
            bow: "#8B6914",
            spear: "#A0522D",
          };
          ctx.fillStyle = colors[l.type] || "#888";
          ctx.fillRect(sp.x - 6, sp.y - 3 + bob, 20, 5);
          ctx.fillStyle = "#fff";
          ctx.font = "8px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(l.type.toUpperCase(), sp.x + 4, sp.y - 8 + bob);
        }
        if (dist(p.x, p.y, l.x, l.y) < 50) {
          ctx.fillStyle = "rgba(255,255,255,0.9)";
          ctx.font = "bold 10px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("[R] PICK UP", sp.x, sp.y + 20);
        }
      }

      // NPCs
      for (const npc of npcsRef.current) {
        const sp = wts(npc.x, npc.y);
        if (sp.x < -40 || sp.x > CW + 40 || sp.y < -40 || sp.y > CH + 40)
          continue;
        ctx.save();
        ctx.shadowColor = npc.color;
        ctx.shadowBlur = 12;
        ctx.fillStyle = npc.color;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.8)";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
        if (npc.hasCrown) drawCrown(ctx, sp.x, sp.y - 14, 8, npc.crownColor);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 10px 'Cinzel', serif";
        ctx.textAlign = "center";
        ctx.fillText(npc.name, sp.x, sp.y - 22);
        if (dist(p.x, p.y, npc.x, npc.y) < 60) {
          ctx.fillStyle = "#C9A35A";
          ctx.font = "10px sans-serif";
          ctx.fillText("[E] TALK", sp.x, sp.y + 26);
        }
      }

      // Enemies
      const bossColors: Record<string, string> = {
        boss1: "#8B0000",
        boss2: "#9E9E9E",
        boss3: "#4E342E",
        boss4: "#37474F",
      };
      for (const e of enemiesRef.current) {
        const sp = wts(e.x, e.y);
        if (sp.x < -50 || sp.x > CW + 50 || sp.y < -50 || sp.y > CH + 50)
          continue;
        if (!e.alive) {
          if (e.deathAlpha > 0) {
            ctx.save();
            ctx.globalAlpha = e.deathAlpha;
            ctx.fillStyle = "#fff";
            ctx.beginPath();
            ctx.arc(sp.x, sp.y, e.radius + 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
          continue;
        }
        ctx.save();
        const bossImgMap: Record<string, string> = {
          boss1: "rehman",
          boss2: "sp",
          boss3: "major",
          boss4: "jameel",
        };
        const bossImgKey = bossImgMap[e.type];
        const bossImg = bossImgKey ? charImagesRef.current[bossImgKey] : null;
        if (bossImg?.complete && bossImg.naturalWidth > 0) {
          if (e.flashTimer > 0) ctx.globalAlpha = 0.4;
          ctx.drawImage(bossImg, sp.x - 20, sp.y - 40, 40, 60);
          ctx.globalAlpha = 1;
        } else {
          if (e.flashTimer > 0) {
            ctx.fillStyle = "#ffffff";
          } else if (e.type === "soldier") {
            ctx.fillStyle = "#D32F2F";
          } else {
            ctx.fillStyle = bossColors[e.type] ?? "#D32F2F";
          }
          ctx.shadowColor = ctx.fillStyle;
          ctx.shadowBlur = e.type === "soldier" ? 6 : 14;
          ctx.beginPath();
          ctx.arc(sp.x, sp.y, e.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "rgba(255,255,255,0.4)";
          ctx.lineWidth = e.type === "soldier" ? 1.5 : 2.5;
          ctx.stroke();
        }
        ctx.restore();

        if (e.type === "soldier") {
          ctx.strokeStyle = "#8B0000";
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(sp.x, sp.y - 10, e.radius * 0.7, Math.PI, 0);
          ctx.stroke();
        } else {
          // Boss crown / star
          drawCrown(ctx, sp.x, sp.y - e.radius, 9, "#FFD700");
        }

        // Boss name tag
        ctx.fillStyle = e.type === "soldier" ? "#FF8080" : "#FF4444";
        ctx.font =
          e.type === "soldier"
            ? "bold 8px sans-serif"
            : "bold 10px 'Cinzel', serif";
        ctx.textAlign = "center";
        ctx.fillText(e.name, sp.x, sp.y - e.radius - 6);
        drawHealthBar(
          ctx,
          sp.x,
          sp.y - e.radius - 14,
          e.type === "soldier" ? 34 : 50,
          e.hp,
          e.maxHp,
        );
      }

      // Projectiles
      for (const proj of projectilesRef.current) {
        if (!proj.alive) continue;
        const sp = wts(proj.x, proj.y);
        const ang = Math.atan2(proj.vy, proj.vx);
        const len = proj.type === "spear" ? 22 : 14;
        ctx.save();
        ctx.strokeStyle =
          proj.type === "enemy"
            ? "#9C27B0"
            : proj.type === "spear"
              ? "#A0522D"
              : "#8B6914";
        ctx.lineWidth = proj.type === "spear" ? 4 : 2;
        ctx.beginPath();
        ctx.moveTo(sp.x, sp.y);
        ctx.lineTo(sp.x - Math.cos(ang) * len, sp.y - Math.sin(ang) * len);
        ctx.stroke();
        ctx.restore();
      }

      // Player
      if (p.alive) {
        const sx = wts(p.x, p.y).x;
        const sy = wts(p.x, p.y).y;
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.beginPath();
        ctx.ellipse(sx + 3, sy + 6, 14, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.save();
        const pc = HEROES[selectedCharIdxRef.current];
        const heroKey = selectedCharIdxRef.current === 0 ? "humza" : "ajay";
        const heroImg = charImagesRef.current[heroKey];
        if (heroImg?.complete && heroImg.naturalWidth > 0) {
          ctx.drawImage(heroImg, sx - 20, sy - 40, 40, 60);
        } else {
          ctx.shadowColor = pc.shadowColor;
          ctx.shadowBlur = 16;
          ctx.fillStyle = pc.color;
          ctx.beginPath();
          ctx.arc(sx, sy, 16, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#FFAB40";
          ctx.lineWidth = 2.5;
          ctx.stroke();
        }
        ctx.restore();
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(p.angle);
        ctx.fillStyle = WEAPONS[p.weapon].color;
        if (p.weapon === 0) {
          ctx.fillRect(12, -3, 22, 5);
          ctx.fillStyle = "#888";
          ctx.fillRect(10, -5, 6, 9);
        } else if (p.weapon === 1) {
          ctx.strokeStyle = WEAPONS[1].color;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(0, 0, 18, -Math.PI / 3, Math.PI / 3);
          ctx.stroke();
          ctx.strokeStyle = "#ccc";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(18, -10);
          ctx.lineTo(18, 10);
          ctx.stroke();
        } else {
          ctx.fillRect(12, -2, 30, 4);
          ctx.fillStyle = "#CCC";
          ctx.beginPath();
          ctx.moveTo(42, 0);
          ctx.lineTo(35, -5);
          ctx.lineTo(35, 5);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
        ctx.fillStyle = "#C9A35A";
        ctx.font = "bold 11px 'Cinzel', serif";
        ctx.textAlign = "center";
        ctx.fillText(HEROES[selectedCharIdxRef.current].name, sx, sy - 24);
        drawHealthBar(ctx, sx, sy - 20, 50, p.hp, p.maxHp);
      }

      // Dialogue box
      if (gs.dialogue) {
        const bw = 500;
        const bh = 80;
        const bx = (CW - bw) / 2;
        const by = CH - 110;
        ctx.fillStyle = "rgba(0,0,0,0.88)";
        ctx.beginPath();
        ctx.roundRect(bx, by, bw, bh, 8);
        ctx.fill();
        ctx.strokeStyle = "#C9A35A";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = "#C9A35A";
        ctx.font = "bold 12px 'Cinzel', serif";
        ctx.textAlign = "left";
        ctx.fillText(gs.dialogue.name, bx + 16, by + 22);
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "12px sans-serif";
        ctx.fillText(gs.dialogue.text, bx + 16, by + 44);
        ctx.fillStyle = "#888";
        ctx.font = "10px sans-serif";
        ctx.fillText("[E] Close", bx + 16, by + 66);
      }

      // Boss elimination flash
      if (gs.bossElimMsg && Date.now() < gs.bossElimMsg.until) {
        const progress = (gs.bossElimMsg.until - Date.now()) / 2500;
        const alpha = Math.min(1, progress * 3);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.beginPath();
        ctx.roundRect(CW / 2 - 220, CH / 2 - 30, 440, 60, 10);
        ctx.fill();
        ctx.strokeStyle = "#FFD700";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = "#FFD700";
        ctx.font = "bold 22px 'Cinzel', serif";
        ctx.textAlign = "center";
        ctx.fillText(gs.bossElimMsg.text, CW / 2, CH / 2 + 8);
        ctx.restore();
      }

      // HUD — top-left
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.beginPath();
      ctx.roundRect(10, 10, 230, 60, 6);
      ctx.fill();
      const pc = HEROES[selectedCharIdxRef.current];
      ctx.fillStyle = pc.color;
      ctx.beginPath();
      ctx.arc(30, 30, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#C9A35A";
      ctx.font = "bold 11px 'Cinzel', serif";
      ctx.textAlign = "left";
      ctx.fillText("HP", 50, 28);
      const hpW = 160;
      ctx.fillStyle = "#333";
      ctx.fillRect(50, 32, hpW, 12);
      const hpPct = p.hp / p.maxHp;
      ctx.fillStyle =
        hpPct > 0.5 ? "#4CAF50" : hpPct > 0.25 ? "#FF9800" : "#F44336";
      ctx.fillRect(50, 32, hpW * Math.max(0, hpPct), 12);
      ctx.strokeStyle = "#555";
      ctx.lineWidth = 1;
      ctx.strokeRect(50, 32, hpW, 12);
      ctx.fillStyle = "#FFF";
      ctx.font = "10px sans-serif";
      ctx.fillText(`${p.hp}/${p.maxHp}`, 50, 58);
      ctx.fillStyle = "#C9A35A";
      ctx.fillText(WEAPONS[p.weapon].name, 110, 58);

      // HUD — top-right: kills/score + targets
      const bossesRemaining = enemiesRef.current.filter(
        (e) => e.type !== "soldier" && e.alive,
      ).length;
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.beginPath();
      ctx.roundRect(CW - 190, 10, 180, 72, 6);
      ctx.fill();
      ctx.fillStyle = "#FFF";
      ctx.font = "bold 12px 'Cinzel', serif";
      ctx.textAlign = "right";
      ctx.fillText(`KILLS: ${gs.kills}`, CW - 16, 30);
      ctx.fillStyle = "#C9A35A";
      ctx.fillText(`SCORE: ${gs.score}`, CW - 16, 50);
      ctx.fillStyle = bossesRemaining > 0 ? "#FF6060" : "#80FF80";
      ctx.font = "bold 11px 'Cinzel', serif";
      ctx.fillText(`TARGETS: ${bossesRemaining}/4`, CW - 16, 72);

      // Zone timer
      const timeSinceShrink = Date.now() - gs.zoneLastShrink;
      const countdown = Math.max(
        0,
        Math.ceil((ZONE_SHRINK_INTERVAL - timeSinceShrink) / 1000),
      );
      const dZone = Math.max(
        0,
        Math.round(dist(p.x, p.y, WCX, WCY) - gs.zoneRadius),
      );
      const inZone = dZone === 0;
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.beginPath();
      ctx.roundRect(10, CH - 70, 220, 60, 6);
      ctx.fill();
      ctx.textAlign = "left";
      ctx.fillStyle = inZone ? "#80BFFF" : "#FF4444";
      ctx.font = "bold 11px 'Cinzel', serif";
      ctx.fillText(
        inZone ? "IN SAFE ZONE" : `ZONE DANGER: ${dZone}m`,
        16,
        CH - 48,
      );
      ctx.fillStyle = "#C9A35A";
      ctx.font = "11px 'Cinzel', serif";
      ctx.fillText(`ZONE CLOSES IN: ${countdown}s`, 16, CH - 26);

      // Minimap
      const MM_SIZE = 120;
      const MM_X = CW - MM_SIZE - 12;
      const MM_Y = CH - MM_SIZE - 12;
      const MM_SCALE = MM_SIZE / WW;
      ctx.fillStyle = "rgba(0,0,0,0.8)";
      ctx.fillRect(MM_X, MM_Y, MM_SIZE, MM_SIZE);
      ctx.strokeStyle = "#C9A35A";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(MM_X, MM_Y, MM_SIZE, MM_SIZE);
      ctx.strokeStyle = "rgba(80,140,255,0.8)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(
        MM_X + WCX * MM_SCALE,
        MM_Y + WCY * MM_SCALE,
        gs.zoneRadius * MM_SCALE,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
      for (const npc of npcsRef.current) {
        ctx.fillStyle = "#00BCD4";
        ctx.beginPath();
        ctx.arc(
          MM_X + npc.x * MM_SCALE,
          MM_Y + npc.y * MM_SCALE,
          2.5,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      for (const e of enemiesRef.current) {
        if (!e.alive) continue;
        ctx.fillStyle = e.type === "soldier" ? "#F44336" : "#FF6D00";
        ctx.beginPath();
        ctx.arc(
          MM_X + e.x * MM_SCALE,
          MM_Y + e.y * MM_SCALE,
          e.type === "soldier" ? 2 : 3.5,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      ctx.fillStyle = pc.color;
      ctx.beginPath();
      ctx.arc(
        MM_X + p.x * MM_SCALE,
        MM_Y + p.y * MM_SCALE,
        3.5,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.font = "8px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("MAP", MM_X + MM_SIZE / 2, MM_Y - 3);
    },
    [wts],
  );

  const drawStartScreen = useCallback(
    (ctx: CanvasRenderingContext2D, now: number) => {
      const grad = ctx.createRadialGradient(
        CW / 2,
        CH / 2,
        0,
        CW / 2,
        CH / 2,
        500,
      );
      grad.addColorStop(0, "#1a0f00");
      grad.addColorStop(1, "#0B0C0E");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, CW, CH);
      ctx.strokeStyle = "rgba(201,163,90,0.15)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 20; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 50 + ((now * 0.02) % 50) - 50, 0);
        ctx.lineTo(i * 50 + ((now * 0.02) % 50) - 50 - 200, CH);
        ctx.stroke();
      }
      ctx.save();
      ctx.shadowColor = "#C9A35A";
      ctx.shadowBlur = 40;
      ctx.fillStyle = "#C9A35A";
      ctx.font = "bold 72px 'Cinzel', serif";
      ctx.textAlign = "center";
      ctx.fillText("DHURANDHAR", CW / 2, CH / 2 - 80);
      ctx.restore();
      ctx.fillStyle = "rgba(201,163,90,0.6)";
      ctx.font = "20px 'Cinzel', serif";
      ctx.textAlign = "center";
      ctx.fillText(
        "HUNT THE TRAITORS — SAVE YOUR COUNTRY",
        CW / 2,
        CH / 2 - 38,
      );

      // Hero silhouettes
      const chars = [
        { x: 300, color: "#FF6D00", label: "Humza Ali Mazari" },
        { x: 650, color: "#3949AB", label: "Ajay Sanyal" },
      ];
      for (const c of chars) {
        ctx.fillStyle = `${c.color}66`;
        ctx.beginPath();
        ctx.arc(c.x, CH / 2 + 20, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(c.x - 10, CH / 2 + 42, 20, 40);
        ctx.fillStyle = `${c.color}AA`;
        ctx.font = "12px 'Cinzel', serif";
        ctx.textAlign = "center";
        ctx.fillText(c.label, c.x, CH / 2 + 100);
      }

      const blink = Math.sin(now * 0.003) > 0;
      if (blink) {
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "18px 'Cinzel', serif";
        ctx.textAlign = "center";
        ctx.fillText("TAP TO BEGIN YOUR MISSION", CW / 2, CH / 2 + 130);
      }
      ctx.fillStyle = "rgba(201,163,90,0.5)";
      ctx.font = "12px 'Cinzel', serif";
      ctx.fillText(
        "WASD: Move  |  Mouse: Aim  |  Click/Space: Attack  |  E: Interact  |  R: Pick Up",
        CW / 2,
        CH - 20,
      );
    },
    [],
  );

  const drawCharSelectScreen = useCallback(
    (ctx: CanvasRenderingContext2D, selIdx: number) => {
      const grad = ctx.createRadialGradient(
        CW / 2,
        CH / 2,
        0,
        CW / 2,
        CH / 2,
        600,
      );
      grad.addColorStop(0, "#1a0f00");
      grad.addColorStop(1, "#0B0C0E");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, CW, CH);
      ctx.fillStyle = "#C9A35A";
      ctx.font = "bold 36px 'Cinzel', serif";
      ctx.textAlign = "center";
      ctx.fillText("CHOOSE YOUR HERO", CW / 2, 60);
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.font = "14px 'Cinzel', serif";
      ctx.fillText(
        "Humza Ali Mazari & Ajay Sanyal are hunting the 4 traitors",
        CW / 2,
        92,
      );
      ctx.fillStyle = "rgba(201,163,90,0.4)";
      ctx.font = "13px 'Cinzel', serif";
      ctx.fillText(
        "\u2190 \u2192 Arrow Keys / Tap Arrows  |  ENTER / Tap SELECT to Confirm",
        CW / 2,
        118,
      );

      const cardW = 300;
      const cardH = 280;
      for (let i = 0; i < HEROES.length; i++) {
        const ch = HEROES[i];
        const cx = CW / 2 + (i === 0 ? -190 : 190);
        const cy = CH / 2 + 20;
        const isSelected = i === selIdx;
        ctx.save();
        if (isSelected) {
          ctx.shadowColor = ch.color;
          ctx.shadowBlur = 30;
        }
        ctx.fillStyle = isSelected
          ? "rgba(201,163,90,0.2)"
          : "rgba(20,12,5,0.8)";
        ctx.strokeStyle = isSelected ? ch.color : "rgba(201,163,90,0.3)";
        ctx.lineWidth = isSelected ? 3 : 1;
        ctx.beginPath();
        ctx.roundRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 10);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.save();
        const heroImgKeys = ["humza", "ajay"];
        const heroPortrait = charImagesRef.current[heroImgKeys[i]];
        if (heroPortrait?.complete && heroPortrait.naturalWidth > 0) {
          if (isSelected) {
            ctx.shadowColor = ch.color;
            ctx.shadowBlur = 24;
          }
          ctx.drawImage(heroPortrait, cx - 45, cy - 110, 90, 110);
        } else {
          if (isSelected) {
            ctx.shadowColor = ch.color;
            ctx.shadowBlur = 24;
          }
          ctx.fillStyle = ch.color;
          ctx.beginPath();
          ctx.arc(cx, cy - 60, 40, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = isSelected ? "#FFD700" : "rgba(255,255,255,0.3)";
          ctx.lineWidth = isSelected ? 3 : 1.5;
          ctx.stroke();
        }
        ctx.restore();
        ctx.fillStyle = isSelected ? "#FFD700" : "#C9A35A";
        ctx.font = `bold ${isSelected ? 18 : 16}px 'Cinzel', serif`;
        ctx.textAlign = "center";
        ctx.fillText(ch.name, cx, cy + 10);
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.font = "13px 'Cinzel', serif";
        ctx.fillText(ch.role, cx, cy + 32);
        ctx.fillStyle = "rgba(201,163,90,0.6)";
        ctx.font = "11px sans-serif";
        const roleDesc =
          i === 0
            ? "Fearless rebel fighter saving the country"
            : "Undercover spy agent, master of stealth";
        ctx.fillText(roleDesc, cx, cy + 56);
        if (isSelected) {
          ctx.fillStyle = ch.color;
          ctx.font = "bold 13px 'Cinzel', serif";
          ctx.fillText("▶ SELECTED ◀", cx, cy + 80);
        }
      }
    },
    [],
  );

  const drawPauseScreen = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, 0, CW, CH);
    ctx.fillStyle = "#C9A35A";
    ctx.font = "bold 48px 'Cinzel', serif";
    ctx.textAlign = "center";
    ctx.fillText("PAUSED", CW / 2, CH / 2);
    ctx.font = "16px 'Cinzel', serif";
    ctx.fillText("Press ESC to resume", CW / 2, CH / 2 + 40);
  }, []);

  const drawGameOverScreen = useCallback((ctx: CanvasRenderingContext2D) => {
    const grad = ctx.createRadialGradient(
      CW / 2,
      CH / 2,
      0,
      CW / 2,
      CH / 2,
      500,
    );
    grad.addColorStop(0, "#3a0000");
    grad.addColorStop(1, "#0B0C0E");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CW, CH);
    ctx.save();
    ctx.shadowColor = "#FF2020";
    ctx.shadowBlur = 40;
    ctx.fillStyle = "#FF4444";
    ctx.font = "bold 56px 'Cinzel', serif";
    ctx.textAlign = "center";
    ctx.fillText("MISSION FAILED", CW / 2, CH / 2 - 60);
    ctx.restore();
    ctx.fillStyle = "#888";
    ctx.font = "22px 'Cinzel', serif";
    ctx.fillText("The traitors prevailed...", CW / 2, CH / 2 - 10);
    ctx.fillStyle = "#C9A35A";
    ctx.font = "20px 'Cinzel', serif";
    ctx.fillText(`FINAL SCORE: ${gsRef.current.score}`, CW / 2, CH / 2 + 30);
    ctx.fillStyle = "#fff";
    ctx.font = "16px 'Cinzel', serif";
    ctx.fillText(`KILLS: ${gsRef.current.kills}`, CW / 2, CH / 2 + 60);
  }, []);

  const drawVictoryScreen = useCallback((ctx: CanvasRenderingContext2D) => {
    const grad = ctx.createRadialGradient(
      CW / 2,
      CH / 2,
      0,
      CW / 2,
      CH / 2,
      500,
    );
    grad.addColorStop(0, "#1a1400");
    grad.addColorStop(1, "#0B0C0E");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CW, CH);
    ctx.save();
    ctx.shadowColor = "#C9A35A";
    ctx.shadowBlur = 40;
    ctx.fillStyle = "#C9A35A";
    ctx.font = "bold 50px 'Cinzel', serif";
    ctx.textAlign = "center";
    ctx.fillText("COUNTRY SAVED!", CW / 2, CH / 2 - 70);
    ctx.restore();
    ctx.fillStyle = "#FFD700";
    ctx.font = "22px 'Cinzel', serif";
    ctx.fillText("ALL TRAITORS ELIMINATED!", CW / 2, CH / 2 - 20);
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.font = "16px 'Cinzel', serif";
    ctx.fillText(
      "Humza Ali Mazari & Ajay Sanyal have saved the nation.",
      CW / 2,
      CH / 2 + 16,
    );
    ctx.fillStyle = "#C9A35A";
    ctx.font = "20px 'Cinzel', serif";
    ctx.fillText(`FINAL SCORE: ${gsRef.current.score}`, CW / 2, CH / 2 + 52);
    ctx.fillStyle = "#fff";
    ctx.font = "16px 'Cinzel', serif";
    ctx.fillText(`KILLS: ${gsRef.current.kills}`, CW / 2, CH / 2 + 80);
  }, []);

  // ── Game update ────────────────────────────────────────────────────────
  const updateGame = useCallback(
    (now: number) => {
      const gs = gsRef.current;
      const p = playerRef.current;
      if (!p.alive) return { playerDead: true, victory: false };

      // Movement — keyboard + joystick
      let dx = 0;
      let dy = 0;
      if (gs.keys.has("KeyW") || gs.keys.has("ArrowUp")) dy -= 1;
      if (gs.keys.has("KeyS") || gs.keys.has("ArrowDown")) dy += 1;
      if (gs.keys.has("KeyA") || gs.keys.has("ArrowLeft")) dx -= 1;
      if (gs.keys.has("KeyD") || gs.keys.has("ArrowRight")) dx += 1;

      // Joystick input
      if (joystickActive.current) {
        dx += joystickDx.current;
        dy += joystickDy.current;
      }

      const magnitude = Math.hypot(dx, dy);
      if (magnitude > 1) {
        dx /= magnitude;
        dy /= magnitude;
      } else if (magnitude > 0.01) {
        dx /= magnitude;
        dy /= magnitude;
      }

      if (magnitude > 0.01) {
        const nx = p.x + dx * PLAYER_SPEED;
        const ny = p.y + dy * PLAYER_SPEED;
        const resolved = resolveCollision(nx, ny, 16);
        p.x = resolved.x;
        p.y = resolved.y;
        // On mobile: aim in direction of movement
        if (joystickActive.current) {
          p.angle = Math.atan2(dy, dx);
        }
      }

      // Desktop: aim toward mouse
      if (!joystickActive.current) {
        const wx = gs.mouseX + gs.camX;
        const wy = gs.mouseY + gs.camY;
        p.angle = Math.atan2(wy - p.y, wx - p.x);
      }

      // Weapon switch
      if (gs.keys.has("Digit1")) p.weapon = 0;
      if (gs.keys.has("Digit2")) p.weapon = 1;
      if (gs.keys.has("Digit3")) p.weapon = 2;

      // Zone shrink
      if (now - gs.zoneLastShrink > ZONE_SHRINK_INTERVAL) {
        gs.zoneLastShrink = now;
        gs.zoneRadius = Math.max(200, gs.zoneRadius - 200);
      }
      const dFromCenter = dist(p.x, p.y, WCX, WCY);
      if (dFromCenter > gs.zoneRadius && now - gs.lastZoneDamage > 1000) {
        p.hp -= 2;
        gs.lastZoneDamage = now;
      }

      // Survive score
      if (now - gs.lastSurviveCheck > 60000) {
        gs.score += 200;
        gs.lastSurviveCheck = now;
      }

      // Loot pickup
      if (gs.keys.has("KeyR")) {
        for (const l of lootRef.current) {
          if (!l.alive) continue;
          if (dist(p.x, p.y, l.x, l.y) < 50) {
            l.alive = false;
            if (l.type === "health") p.hp = Math.min(p.maxHp, p.hp + 30);
            else {
              const wMap: Record<string, number> = {
                sword: 0,
                bow: 1,
                spear: 2,
              };
              p.weapon = wMap[l.type] ?? p.weapon;
            }
            gs.score += 10;
          }
        }
      }

      // NPC interaction
      if (gs.keys.has("KeyE")) {
        if (gs.dialogue) {
          gs.dialogue = null;
        } else {
          for (const npc of npcsRef.current) {
            if (dist(p.x, p.y, npc.x, npc.y) < 70) {
              gs.dialogue = { name: npc.name, text: npc.dialogue };
              if (
                audioCtxRef.current &&
                masterGainRef.current &&
                !isMutedRef.current
              )
                playNPCInteraction(audioCtxRef.current, masterGainRef.current);
              break;
            }
          }
        }
      }

      // Enemy AI
      for (const e of enemiesRef.current) {
        if (!e.alive) {
          e.deathAlpha = Math.max(0, e.deathAlpha - 0.03);
          continue;
        }
        if (e.flashTimer > 0) e.flashTimer--;
        const dToPlayer = dist(e.x, e.y, p.x, p.y);
        const chaseRange = e.type === "soldier" ? 250 : 500;
        const attackRange = e.radius + 20;
        if (dToPlayer < chaseRange) {
          const ang = Math.atan2(p.y - e.y, p.x - e.x);
          const ne = resolveCollision(
            e.x + Math.cos(ang) * e.speed,
            e.y + Math.sin(ang) * e.speed,
            e.radius,
          );
          e.x = ne.x;
          e.y = ne.y;
          if (
            dToPlayer < attackRange &&
            now - e.lastAttack > (e.type === "soldier" ? 1000 : 1400)
          ) {
            p.hp -= e.damage;
            e.lastAttack = now;
            if (
              audioCtxRef.current &&
              masterGainRef.current &&
              !isMutedRef.current
            )
              playHit(audioCtxRef.current, masterGainRef.current);
          }
          // Boss ranged attack
          if (
            e.type !== "soldier" &&
            dToPlayer < 400 &&
            now - e.lastProjectile > 2200
          ) {
            const ang2 = Math.atan2(p.y - e.y, p.x - e.x);
            fireProjectile(false, e.x, e.y, ang2, "enemy", e.damage * 0.8, 6);
            e.lastProjectile = now;
          }
        } else {
          // Patrol
          const dpx = e.waypointX - e.x;
          const dpy = e.waypointY - e.y;
          const dWay = Math.hypot(dpx, dpy);
          if (dWay < 10) {
            e.waypointX = Math.max(
              100,
              Math.min(WW - 100, e.x + (Math.random() - 0.5) * 300),
            );
            e.waypointY = Math.max(
              100,
              Math.min(WH - 100, e.y + (Math.random() - 0.5) * 300),
            );
          } else {
            const ne = resolveCollision(
              e.x + (dpx / dWay) * e.speed,
              e.y + (dpy / dWay) * e.speed,
              e.radius,
            );
            e.x = ne.x;
            e.y = ne.y;
          }
        }
      }

      // Projectiles
      for (const proj of projectilesRef.current) {
        if (!proj.alive) continue;
        proj.x += proj.vx;
        proj.y += proj.vy;
        proj.distTraveled += Math.hypot(proj.vx, proj.vy);
        if (
          proj.distTraveled > proj.maxDist ||
          proj.x < 0 ||
          proj.x > WW ||
          proj.y < 0 ||
          proj.y > WH
        ) {
          proj.alive = false;
          continue;
        }
        for (const b of buildingsRef.current) {
          if (
            proj.x > b.x &&
            proj.x < b.x + b.w &&
            proj.y > b.y &&
            proj.y < b.y + b.h
          ) {
            proj.alive = false;
            break;
          }
        }
        if (!proj.alive) continue;
        if (proj.fromPlayer) {
          for (const e of enemiesRef.current) {
            if (!e.alive) continue;
            if (dist(proj.x, proj.y, e.x, e.y) < e.radius + 4) {
              proj.alive = false;
              e.hp -= proj.damage;
              e.flashTimer = 6;
              if (e.hp <= 0) {
                e.alive = false;
                e.deathAlpha = 1;
                gs.kills++;
                const isBoss = e.type !== "soldier";
                gs.score += isBoss ? 500 : 100;
                if (isBoss)
                  gs.bossElimMsg = {
                    text: `${e.name} ELIMINATED!`,
                    until: Date.now() + 2500,
                  };
                if (
                  audioCtxRef.current &&
                  masterGainRef.current &&
                  !isMutedRef.current
                )
                  playBossAlert(audioCtxRef.current, masterGainRef.current);
                lootRef.current.push({
                  id: gs.projCounter++,
                  x: e.x,
                  y: e.y,
                  type: isBoss ? "health" : "health",
                  alive: true,
                });
              }
              break;
            }
          }
        } else {
          if (dist(proj.x, proj.y, p.x, p.y) < 20) {
            proj.alive = false;
            p.hp -= proj.damage;
            if (
              audioCtxRef.current &&
              masterGainRef.current &&
              !isMutedRef.current
            )
              playHit(audioCtxRef.current, masterGainRef.current);
          }
        }
      }
      if (projectilesRef.current.length > 200)
        projectilesRef.current = projectilesRef.current.filter(
          (pr) => pr.alive,
        );

      if (p.hp <= 0) {
        p.hp = 0;
        p.alive = false;
      }

      // Victory = all 4 bosses dead
      const allBossesDead = enemiesRef.current
        .filter((e) => e.type !== "soldier")
        .every((e) => !e.alive);

      return { playerDead: !p.alive, victory: allBossesDead };
    },
    [resolveCollision, fireProjectile],
  );

  // ── Main game loop ─────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let running = true;
    const loop = (now: number) => {
      if (!running) return;
      ctx.clearRect(0, 0, CW, CH);
      const currentPhase = phaseRef.current;
      if (currentPhase === "start") {
        drawStartScreen(ctx, now);
      } else if (currentPhase === "charSelect") {
        drawCharSelectScreen(ctx, selectedCharIdxRef.current);
      } else if (currentPhase === "playing") {
        const result = updateGame(now);
        drawScene(ctx, now);
        if (result?.playerDead) {
          phaseRef.current = "gameover";
          setPhase("gameover");
          setDisplayScore(gsRef.current.score);
          setDisplayKills(gsRef.current.kills);
          stopMusicRef.current?.();
          if (audioCtxRef.current && masterGainRef.current)
            setTimeout(() => {
              if (
                audioCtxRef.current &&
                masterGainRef.current &&
                !isMutedRef.current
              )
                playDeath(audioCtxRef.current, masterGainRef.current);
            }, 200);
        } else if (result?.victory) {
          phaseRef.current = "victory";
          setPhase("victory");
          setDisplayScore(gsRef.current.score + 1000);
          setDisplayKills(gsRef.current.kills);
          gsRef.current.score += 1000;
          stopMusicRef.current?.();
          if (audioCtxRef.current && masterGainRef.current)
            setTimeout(() => {
              if (
                audioCtxRef.current &&
                masterGainRef.current &&
                !isMutedRef.current
              )
                playVictory(audioCtxRef.current, masterGainRef.current);
            }, 200);
        }
      } else if (currentPhase === "paused") {
        drawScene(ctx, now);
        drawPauseScreen(ctx);
      } else if (currentPhase === "gameover") {
        drawGameOverScreen(ctx);
      } else if (currentPhase === "victory") {
        drawVictoryScreen(ctx);
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [
    drawStartScreen,
    drawCharSelectScreen,
    drawScene,
    drawPauseScreen,
    drawGameOverScreen,
    drawVictoryScreen,
    updateGame,
  ]);

  // ── Keyboard/Mouse input ────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onKeyDown = (e: KeyboardEvent) => {
      gsRef.current.keys.add(e.code);
      if (e.code === "Enter" && phaseRef.current === "start") {
        phaseRef.current = "charSelect";
        setPhase("charSelect");
      }
      if (e.code === "Enter" && phaseRef.current === "charSelect") {
        initGame();
        playerRef.current.weapon = HEROES[selectedCharIdxRef.current].weapon;
        startAudio();
        phaseRef.current = "playing";
        setPhase("playing");
      }
      if (e.code === "ArrowLeft" && phaseRef.current === "charSelect") {
        const ni =
          (selectedCharIdxRef.current - 1 + HEROES.length) % HEROES.length;
        selectedCharIdxRef.current = ni;
        setSelectedCharIdx(ni);
      }
      if (e.code === "ArrowRight" && phaseRef.current === "charSelect") {
        const ni = (selectedCharIdxRef.current + 1) % HEROES.length;
        selectedCharIdxRef.current = ni;
        setSelectedCharIdx(ni);
      }
      if (e.code === "Escape") {
        if (phaseRef.current === "playing") {
          phaseRef.current = "paused";
          setPhase("paused");
        } else if (phaseRef.current === "paused") {
          phaseRef.current = "playing";
          setPhase("playing");
        }
      }
      if (e.code === "Space") {
        e.preventDefault();
        if (phaseRef.current === "playing") playerAttack();
      }
      if (e.code === "KeyE")
        setTimeout(() => gsRef.current.keys.delete("KeyE"), 200);
      if (e.code === "KeyR")
        setTimeout(() => gsRef.current.keys.delete("KeyR"), 200);
    };
    const onKeyUp = (e: KeyboardEvent) => gsRef.current.keys.delete(e.code);
    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      gsRef.current.mouseX = e.clientX - rect.left;
      gsRef.current.mouseY = e.clientY - rect.top;
    };
    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 0 && phaseRef.current === "playing") playerAttack();
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mousedown", onMouseDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mousedown", onMouseDown);
    };
  }, [initGame, playerAttack, startAudio]);

  // Cleanup audio
  useEffect(() => {
    return () => {
      stopMusicRef.current?.();
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed")
        audioCtxRef.current.close();
    };
  }, []);

  // ── Joystick handlers ─────────────────────────────────────────────────
  const JOYSTICK_R = 60;
  const KNOB_R = 25;

  const handleJoyStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.changedTouches[0];
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const ox = rect.left + rect.width / 2;
    const oy = rect.top + rect.height / 2;
    joystickOrigin.current = { x: ox, y: oy };
    joystickActive.current = true;
    const dx = Math.max(-1, Math.min(1, (touch.clientX - ox) / JOYSTICK_R));
    const dy = Math.max(-1, Math.min(1, (touch.clientY - oy) / JOYSTICK_R));
    joystickDx.current = dx;
    joystickDy.current = dy;
    const kx = Math.max(
      -JOYSTICK_R + KNOB_R,
      Math.min(JOYSTICK_R - KNOB_R, dx * (JOYSTICK_R - KNOB_R)),
    );
    const ky = Math.max(
      -JOYSTICK_R + KNOB_R,
      Math.min(JOYSTICK_R - KNOB_R, dy * (JOYSTICK_R - KNOB_R)),
    );
    joystickKnobPos.current = { x: kx, y: ky };
    setJoystickKnob({ x: kx, y: ky });
  }, []);

  const handleJoyMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (!joystickActive.current) return;
    const touch = e.changedTouches[0];
    const ox = joystickOrigin.current.x;
    const oy = joystickOrigin.current.y;
    const rawDx = touch.clientX - ox;
    const rawDy = touch.clientY - oy;
    const mag = Math.hypot(rawDx, rawDy);
    const clampedMag = Math.min(mag, JOYSTICK_R - KNOB_R);
    const ndx = mag > 0 ? rawDx / mag : 0;
    const ndy = mag > 0 ? rawDy / mag : 0;
    joystickDx.current = ndx * (clampedMag / (JOYSTICK_R - KNOB_R));
    joystickDy.current = ndy * (clampedMag / (JOYSTICK_R - KNOB_R));
    joystickKnobPos.current = { x: ndx * clampedMag, y: ndy * clampedMag };
    setJoystickKnob({ x: ndx * clampedMag, y: ndy * clampedMag });
  }, []);

  const handleJoyEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    joystickActive.current = false;
    joystickDx.current = 0;
    joystickDy.current = 0;
    joystickKnobPos.current = { x: 0, y: 0 };
    setJoystickKnob({ x: 0, y: 0 });
  }, []);

  const handleSubmitScore = async () => {
    if (!playerName.trim()) return;
    await submitScore.mutateAsync({
      name: playerName.trim(),
      score: displayScore,
    });
    setSubmitted(true);
  };

  const handleRestart = () => {
    setSubmitted(false);
    setPlayerName("");
    phaseRef.current = "start";
    setPhase("start");
  };

  const startGameFromTouch = () => {
    phaseRef.current = "charSelect";
    setPhase("charSelect");
  };

  const confirmCharSelect = () => {
    initGame();
    playerRef.current.weapon = HEROES[selectedCharIdxRef.current].weapon;
    startAudio();
    phaseRef.current = "playing";
    setPhase("playing");
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {/* Canvas container */}
      <div
        className="relative canvas-gold-border rounded-sm overflow-hidden"
        style={{ width: "100%", maxWidth: CW, aspectRatio: `${CW}/${CH}` }}
        data-ocid="game.canvas_target"
      >
        <canvas
          ref={canvasRef}
          width={CW}
          height={CH}
          className="block cursor-crosshair w-full h-full"
          style={{ imageRendering: "pixelated" }}
        />

        {/* Mute button overlay */}
        {(phase === "playing" || phase === "paused") && (
          <button
            type="button"
            data-ocid="game.toggle"
            onClick={() => {
              const newMuted = !isMuted;
              setIsMuted(newMuted);
              isMutedRef.current = newMuted;
              if (masterGainRef.current && audioCtxRef.current) {
                masterGainRef.current.gain.setValueAtTime(
                  newMuted ? 0 : 1,
                  audioCtxRef.current.currentTime,
                );
              }
            }}
            style={{
              position: "absolute",
              top: 10,
              right: 10,
              zIndex: 20,
              background: "rgba(0,0,0,0.55)",
              border: "1.5px solid rgba(255,220,80,0.5)",
              borderRadius: "50%",
              width: 38,
              height: 38,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: 18,
              color: "#FFD600",
            }}
          >
            {isMuted ? "🔇" : "🔊"}
          </button>
        )}

        {/* START button overlay */}
        {phase === "start" && (
          <div className="absolute inset-0 flex items-end justify-center pb-10 pointer-events-none">
            <button
              type="button"
              className="pointer-events-auto font-cinzel text-xl font-bold px-10 py-4 rounded-lg"
              style={{
                background: "linear-gradient(135deg, #d4a017, #f5c842)",
                color: "#1a0a00",
                border: "2px solid #8b6914",
                boxShadow: "0 4px 24px rgba(212,160,23,0.7)",
                letterSpacing: "0.1em",
              }}
              data-ocid="game.primary_button"
              onClick={startGameFromTouch}
            >
              ▶ START GAME
            </button>
          </div>
        )}

        {/* CHAR SELECT overlay */}
        {phase === "charSelect" && (
          <>
            <div className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none">
              <button
                type="button"
                className="pointer-events-auto font-cinzel text-2xl font-bold px-4 py-6 rounded-lg"
                style={{
                  background: "rgba(0,0,0,0.6)",
                  color: "#f5c842",
                  border: "1px solid #8b6914",
                }}
                data-ocid="game.secondary_button"
                onClick={() => {
                  const ni =
                    (selectedCharIdxRef.current - 1 + HEROES.length) %
                    HEROES.length;
                  selectedCharIdxRef.current = ni;
                  setSelectedCharIdx(ni);
                }}
              >
                ◀
              </button>
            </div>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
              <button
                type="button"
                className="pointer-events-auto font-cinzel text-2xl font-bold px-4 py-6 rounded-lg"
                style={{
                  background: "rgba(0,0,0,0.6)",
                  color: "#f5c842",
                  border: "1px solid #8b6914",
                }}
                data-ocid="game.toggle"
                onClick={() => {
                  const ni = (selectedCharIdxRef.current + 1) % HEROES.length;
                  selectedCharIdxRef.current = ni;
                  setSelectedCharIdx(ni);
                }}
              >
                ▶
              </button>
            </div>
            <div className="absolute inset-x-0 bottom-8 flex justify-center pointer-events-none">
              <button
                type="button"
                className="pointer-events-auto font-cinzel text-lg font-bold px-10 py-3 rounded-lg"
                style={{
                  background: "linear-gradient(135deg, #d4a017, #f5c842)",
                  color: "#1a0a00",
                  border: "2px solid #8b6914",
                  boxShadow: "0 4px 20px rgba(212,160,23,0.6)",
                  letterSpacing: "0.1em",
                }}
                data-ocid="game.confirm_button"
                onClick={confirmCharSelect}
              >
                ✔ SELECT HERO
              </button>
            </div>
          </>
        )}

        {/* MOBILE TOUCH CONTROLS — shown during gameplay on touch devices */}
        {phase === "playing" && isMobile && (
          <>
            {/* Virtual Joystick — bottom-left */}
            <div
              className="absolute select-none"
              style={{
                left: 20,
                bottom: 20,
                width: JOYSTICK_R * 2,
                height: JOYSTICK_R * 2,
                borderRadius: "50%",
                border: "3px solid rgba(255,255,255,0.45)",
                background: "rgba(0,0,0,0.3)",
                touchAction: "none",
              }}
              onTouchStart={handleJoyStart}
              onTouchMove={handleJoyMove}
              onTouchEnd={handleJoyEnd}
              data-ocid="game.canvas_target"
            >
              {/* Knob */}
              <div
                style={{
                  position: "absolute",
                  left: JOYSTICK_R - KNOB_R + joystickKnob.x,
                  top: JOYSTICK_R - KNOB_R + joystickKnob.y,
                  width: KNOB_R * 2,
                  height: KNOB_R * 2,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.75)",
                  border: "2px solid rgba(255,255,255,0.9)",
                  pointerEvents: "none",
                }}
              />
            </div>

            {/* Right-side buttons */}
            <div
              className="absolute flex flex-col gap-3 items-center select-none"
              style={{ right: 20, bottom: 20 }}
            >
              {/* WPN button */}
              <button
                type="button"
                className="font-bold rounded-full flex items-center justify-center"
                style={{
                  width: 56,
                  height: 56,
                  fontSize: 13,
                  background: "rgba(25, 80, 180, 0.85)",
                  border: "2px solid rgba(100,160,255,0.8)",
                  color: "#fff",
                  touchAction: "none",
                }}
                data-ocid="game.toggle"
                onTouchStart={(e) => {
                  e.preventDefault();
                  const p = playerRef.current;
                  p.weapon = (p.weapon + 1) % WEAPONS.length;
                }}
              >
                WPN
              </button>

              {/* ACT button */}
              <button
                type="button"
                className="font-bold rounded-full flex items-center justify-center"
                style={{
                  width: 56,
                  height: 56,
                  fontSize: 13,
                  background: "rgba(60, 60, 60, 0.85)",
                  border: "2px solid rgba(200,200,200,0.6)",
                  color: "#fff",
                  touchAction: "none",
                }}
                data-ocid="game.secondary_button"
                onTouchStart={(e) => {
                  e.preventDefault();
                  const gs = gsRef.current;
                  const p = playerRef.current;
                  if (gs.dialogue) {
                    gs.dialogue = null;
                  } else {
                    // Try NPC interact
                    for (const npc of npcsRef.current) {
                      if (dist(p.x, p.y, npc.x, npc.y) < 80) {
                        gs.dialogue = { name: npc.name, text: npc.dialogue };
                        break;
                      }
                    }
                    // Try loot pickup
                    for (const l of lootRef.current) {
                      if (!l.alive) continue;
                      if (dist(p.x, p.y, l.x, l.y) < 55) {
                        l.alive = false;
                        if (l.type === "health")
                          p.hp = Math.min(p.maxHp, p.hp + 30);
                        else {
                          const wMap: Record<string, number> = {
                            sword: 0,
                            bow: 1,
                            spear: 2,
                          };
                          p.weapon = wMap[l.type] ?? p.weapon;
                        }
                        gs.score += 10;
                        break;
                      }
                    }
                  }
                }}
              >
                ACT
              </button>

              {/* FIRE button */}
              <button
                type="button"
                className="font-bold rounded-full flex items-center justify-center"
                style={{
                  width: 72,
                  height: 72,
                  fontSize: 16,
                  background: "rgba(200, 30, 30, 0.9)",
                  border: "3px solid rgba(255,80,80,0.9)",
                  color: "#fff",
                  touchAction: "none",
                  boxShadow: "0 0 18px rgba(255,40,40,0.6)",
                }}
                data-ocid="game.primary_button"
                onTouchStart={(e) => {
                  e.preventDefault();
                  if (phaseRef.current === "playing") playerAttack();
                }}
              >
                FIRE
              </button>
            </div>
          </>
        )}
      </div>

      {/* Score/end panel */}
      {(phase === "gameover" || phase === "victory") && (
        <div
          className="flex flex-col items-center gap-3 p-6 rounded-lg border border-border bg-card w-full max-w-md"
          data-ocid="game.panel"
        >
          <p className="font-cinzel text-lg text-gold">
            {phase === "victory" ? "🏆 Country Saved!" : "💀 Mission Failed"}
          </p>
          <p className="font-cinzel text-sm text-muted-foreground">
            Score: <span className="text-gold">{displayScore}</span> &nbsp;
            Kills: <span className="text-white">{displayKills}</span>
          </p>
          {!submitted ? (
            <div className="flex gap-2 w-full">
              <Input
                placeholder="Enter your warrior name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="bg-input border-border text-foreground font-cinzel"
                data-ocid="game.input"
                onKeyDown={(e) => e.key === "Enter" && handleSubmitScore()}
              />
              <Button
                onClick={handleSubmitScore}
                disabled={submitScore.isPending || !playerName.trim()}
                className="bg-primary text-primary-foreground font-cinzel"
                data-ocid="game.submit_button"
              >
                {submitScore.isPending ? "..." : "SUBMIT"}
              </Button>
            </div>
          ) : (
            <p
              className="text-green-400 font-cinzel text-sm"
              data-ocid="game.success_state"
            >
              Score submitted! Glory to your name!
            </p>
          )}
          <Button
            variant="outline"
            onClick={handleRestart}
            className="border-border font-cinzel w-full"
            data-ocid="game.secondary_button"
          >
            RETURN TO TITLE
          </Button>
        </div>
      )}
    </div>
  );
}
