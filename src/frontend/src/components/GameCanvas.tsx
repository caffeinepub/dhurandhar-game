import { useCallback, useEffect, useRef, useState } from "react";

// ── Preloaded character images ─────────────────────────────────────────────────
let _charImgs: Record<string, HTMLImageElement> = {};

// ── Constants ──────────────────────────────────────────────────────────────────
const MAP_W = 3000;
const MAP_H = 3000;
const PLAYER_SPEED = 3.5;
const BULLET_SPEED = 8;
const BULLET_RANGE = 450;
const ENEMY_FLEE_SPEED = 2.8;
const ENEMY_PATROL_SPEED = 1.8;
const ENEMY_FIGHT_SPEED = 1.6;
const FLEE_DIST = 350;
const FIGHT_DIST = 120;
const ENEMY_SHOOT_INTERVAL = 1200;
const BOSS_SHOOT_INTERVAL = 800;
const PLAYER_SHOOT_COOLDOWN = 300;
const BOMB_FUSE_TIME = 1800; // ms before explosion
const BOMB_RADIUS = 160;
const BOMB_REPLENISH_FRAMES = 1800; // 30s at 60fps

type EnemyState = "idle" | "flee" | "fight";
type GamePhase = "menu" | "select" | "playing" | "win" | "gameover";

interface Vec2 {
  x: number;
  y: number;
}
interface Building {
  x: number;
  y: number;
  w: number;
  h: number;
}
interface PalmTree {
  x: number;
  y: number;
}
interface Bullet {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  dist: number;
  fromPlayer: boolean;
  alive: boolean;
}
interface Enemy {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  state: EnemyState;
  isBoss: boolean;
  name: string;
  zone: string;
  colorAccent: string;
  uniform: string;
  shootTimer: number;
  stateTimer: number;
  patrolTarget: Vec2;
  alive: boolean;
  flashTimer: number;
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
interface DustParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  size: number;
}
interface Bomb {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  alive: boolean;
  landed: boolean;
  fuseTimer: number;
}
interface BurningBuilding {
  buildingIdx: number;
  fireTimer: number;
  maxFireTime: number;
}

interface NPC {
  id: number;
  x: number;
  y: number;
  type: "civilian_man" | "civilian_woman" | "ally_soldier";
  hint: string;
  facing: number;
  hintVisible: boolean;
}

interface GameState {
  player: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    hp: number;
    facing: number;
    shootTimer: number;
    animFrame: number;
    animTimer: number;
    isMoving: boolean;
  };
  enemies: Enemy[];
  bullets: Bullet[];
  particles: Particle[];
  dustParticles: DustParticle[];
  buildings: Building[];
  palmTrees: PalmTree[];
  bombs: Bomb[];
  burningBuildings: BurningBuilding[];
  bombCount: number;
  bombCooldown: number;
  bombId: number;
  shakeTimer: number;
  camera: Vec2;
  bulletId: number;
  particleId: number;
  frameCount: number;
  lastTime: number;
  bossesDefeated: number;
  currentLevel: number;
  levelTransition: boolean;
  levelTransitionTimer: number;
  allBossesDefeatedOnce: boolean;
  npcs: NPC[];
  keysDown: Set<string>;
  joystick: {
    active: boolean;
    baseX: number;
    baseY: number;
    dx: number;
    dy: number;
    touchId: number | null;
  };
  muted: boolean;
  audioCtx: AudioContext | null;
}

const HEROES = [
  {
    name: "Humza Ali Mazari",
    role: "Rebel Fighter",
    bodyColor: "#1565C0",
    legColor: "#0D47A1",
    accentColor: "#FFA000",
  },
  {
    name: "Ajay Sanyal",
    role: "Spy Agent",
    bodyColor: "#2E7D32",
    legColor: "#1B5E20",
    accentColor: "#FFEE58",
  },
];

const BOSS_DATA = [
  {
    name: "Rehman Dakait",
    zone: "south",
    colorAccent: "#C62828",
    uniform: "#8D6E63",
    spawnX: MAP_W / 2,
    spawnY: MAP_H * 0.85,
  },
  {
    name: "SP Aslam Choudhury",
    zone: "west",
    colorAccent: "#1565C0",
    uniform: "#37474F",
    spawnX: MAP_W * 0.12,
    spawnY: MAP_H / 2,
  },
  {
    name: "Major Iqbal",
    zone: "north",
    colorAccent: "#827717",
    uniform: "#558B2F",
    spawnX: MAP_W / 2,
    spawnY: MAP_H * 0.12,
  },
  {
    name: "Jameel Jamali",
    zone: "east",
    colorAccent: "#212121",
    uniform: "#4A148C",
    spawnX: MAP_W * 0.88,
    spawnY: MAP_H / 2,
  },
];

const GRUNT_ZONE_POSITIONS: Array<Vec2> = [
  { x: MAP_W * 0.25, y: MAP_H * 0.3 },
  { x: MAP_W * 0.75, y: MAP_H * 0.3 },
  { x: MAP_W * 0.5, y: MAP_H * 0.5 },
  { x: MAP_W * 0.2, y: MAP_H * 0.7 },
  { x: MAP_W * 0.8, y: MAP_H * 0.7 },
];

function seededRand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generateMap() {
  const rand = seededRand(42);
  const buildings: Building[] = [];
  const palmTrees: PalmTree[] = [];

  // City grid of buildings
  for (let i = 0; i < 80; i++) {
    const w = 60 + rand() * 120;
    const h = 60 + rand() * 120;
    const x = 100 + rand() * (MAP_W - 300);
    const y = 100 + rand() * (MAP_H - 300);
    buildings.push({ x, y, w, h });
  }

  // Palm trees
  for (let i = 0; i < 60; i++) {
    palmTrees.push({
      x: 50 + rand() * (MAP_W - 100),
      y: 50 + rand() * (MAP_H - 100),
    });
  }

  return { buildings, palmTrees };
}

function circleRect(
  cx: number,
  _cy: number,
  cr: number,
  rx: number,
  ry: number,
  rw: number,
  rh: number,
) {
  const nearX = Math.max(rx, Math.min(cx, rx + rw));
  const nearY = Math.max(ry, Math.min(_cy, ry + rh));
  const dx = cx - nearX;
  const dy = _cy - nearY;
  return dx * dx + dy * dy < cr * cr;
}

function dist(ax: number, ay: number, bx: number, by: number) {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

function normalize(dx: number, dy: number): Vec2 {
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return { x: 0, y: 0 };
  return { x: dx / len, y: dy / len };
}

function getLevelConfig(level: number) {
  return {
    gruntCount: Math.min(4 + level * 2, 20),
    health: 40 + level * 20,
    speed: Math.min(1.2 + level * 0.15, 3.0),
    aggressionDist: Math.min(180 + level * 30, 600),
    shootInterval: Math.max(1200 - level * 100, 250),
    bossLevel:
      [3, 5, 7, 9].indexOf(level) >= 0 ? [3, 5, 7, 9].indexOf(level) : -1,
  };
}

function playSound(ctx: AudioContext | null, muted: boolean, type: string) {
  if (!ctx || muted) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;

    if (type === "shoot") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === "hit") {
      osc.type = "square";
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (type === "death") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.4);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    } else if (type === "boss") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(110, now);
      osc.frequency.setValueAtTime(220, now + 0.1);
      osc.frequency.setValueAtTime(110, now + 0.2);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
    } else if (type === "playerhit") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.2);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === "bombthrow") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(900, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.3);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === "explosion") {
      // White noise burst via buffer
      try {
        const bufLen = ctx.sampleRate * 0.5;
        const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bufLen; i++)
          data[i] = (Math.random() * 2 - 1) * (1 - i / bufLen);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const g2 = ctx.createGain();
        g2.gain.setValueAtTime(0.6, now);
        g2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        src.connect(g2);
        g2.connect(ctx.destination);
        src.start(now);
      } catch (_) {}
      return;
    } else if (type === "beep") {
      osc.type = "square";
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      osc.start(now);
      osc.stop(now + 0.06);
    }
  } catch (_) {
    /* ignore audio errors */
  }
}

function startBgMusic(
  ctx: AudioContext | null,
  muted: boolean,
): (() => void) | null {
  if (!ctx || muted) return null;
  try {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);
    osc1.type = "sine";
    osc1.frequency.value = 80;
    osc2.type = "sine";
    osc2.frequency.value = 160.5;
    gain.gain.value = 0.04;
    osc1.start();
    osc2.start();
    return () => {
      try {
        osc1.stop();
        osc2.stop();
      } catch (_) {}
    };
  } catch (_) {
    return null;
  }
}

// ── Detailed character drawing helpers ────────────────────────────────────────

function drawCharacter(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  _bodyColor: string,
  _legColor: string,
  _accentColor: string,
  facing: number,
  _isMoving: boolean,
  _animFrame: number,
  scale = 1,
  heroIdx = 0,
) {
  const img = _charImgs[heroIdx === 0 ? "humza" : "ajay"];
  const w = 80 * scale;
  const h = 136 * scale;
  // Ground shadow
  ctx.save();
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.ellipse(x, y + 4, w * 0.4, 5 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  if (img?.complete && img.naturalWidth > 0) {
    ctx.save();
    if (facing < 0) {
      ctx.translate(x, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(img, -w / 2, y - h, w, h);
    } else {
      ctx.drawImage(img, x - w / 2, y - h, w, h);
    }
    ctx.restore();
  } else {
    ctx.fillStyle = heroIdx === 0 ? "#1565C0" : "#2E7D32";
    ctx.fillRect(x - w / 2, y - h, w, h);
  }
}

function drawEnemy(
  ctx: CanvasRenderingContext2D,
  enemy: Enemy,
  cx: number,
  _cy: number,
  screenX: number,
  screenY: number,
) {
  const dx = cx - enemy.x;
  const facingSign = dx > 0 ? 1 : -1;
  const scale = enemy.isBoss ? 1.4 : 1;
  const s = scale;
  const nameToKey: Record<string, string> = {
    "Rehman Dakait": "rehman",
    "SP Aslam Choudhury": "sp_aslam",
    "Major Iqbal": "major_iqbal",
    "Jameel Jamali": "jameel",
  };
  const imgKey = enemy.isBoss ? (nameToKey[enemy.name] ?? "grunt") : "grunt";
  const img = _charImgs[imgKey];
  const w = 40 * s;
  const h = 68 * s;
  const feetY = screenY + 34 * s;

  // Shadow
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.ellipse(screenX, feetY, w * 0.4, 4 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Draw character image
  ctx.save();
  if (enemy.flashTimer > 0) {
    ctx.filter = "brightness(3) saturate(0.5)";
  }
  if (img?.complete && img.naturalWidth > 0) {
    if (facingSign > 0) {
      ctx.translate(screenX, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(img, -w / 2, feetY - h, w, h);
    } else {
      ctx.drawImage(img, screenX - w / 2, feetY - h, w, h);
    }
  } else {
    ctx.fillStyle = enemy.isBoss ? "#B71C1C" : "#4CAF50";
    ctx.fillRect(screenX - w / 2, feetY - h, w, h);
  }
  ctx.restore();
  ctx.filter = "none";

  // HP bar above enemy
  const barW = enemy.isBoss ? 80 : 50;
  const barH = 6;
  const bx = screenX - barW / 2;
  const by = screenY - (enemy.isBoss ? 52 : 38);
  ctx.fillStyle = "rgba(0,0,0,0.65)";
  ctx.fillRect(bx - 1, by - 1, barW + 2, barH + 2);
  ctx.fillStyle = enemy.hp > enemy.maxHp * 0.5 ? "#4CAF50" : "#F44336";
  ctx.fillRect(bx, by, barW * (enemy.hp / enemy.maxHp), barH);

  // Boss name label
  if (enemy.isBoss) {
    ctx.save();
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    const tw = ctx.measureText(enemy.name).width;
    ctx.fillStyle = "rgba(0,0,0,0.75)";
    ctx.fillRect(screenX - tw / 2 - 5, by - 20, tw + 10, 16);
    ctx.fillStyle = enemy.colorAccent;
    ctx.fillText(enemy.name, screenX, by - 7);
    ctx.restore();
  }
}

function drawParkedCar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  scale = 1,
) {
  const w = 70 * scale;
  const h = 30 * scale;
  // Body
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y - h, w, h, 5);
  ctx.fill();
  // Roof
  ctx.beginPath();
  ctx.roundRect(x - w * 0.3, y - h - h * 0.5, w * 0.6, h * 0.5, 4);
  ctx.fill();
  // Windows
  ctx.fillStyle = "rgba(150,220,255,0.7)";
  ctx.beginPath();
  ctx.roundRect(x - w * 0.26, y - h - h * 0.45, w * 0.22, h * 0.4, 2);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(x + w * 0.04, y - h - h * 0.45, w * 0.22, h * 0.4, 2);
  ctx.fill();
  // Wheels
  ctx.fillStyle = "#111";
  ctx.beginPath();
  ctx.arc(x - w * 0.32, y, 7 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + w * 0.32, y, 7 * scale, 0, Math.PI * 2);
  ctx.fill();
}

function drawMap(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  camX: number,
  camY: number,
  vw: number,
  vh: number,
) {
  const now = Date.now();
  const warLevel = state.currentLevel;
  const VPX = vw / 2;
  const VPY = vh * 0.33;

  // === CITY BACKGROUND IMAGE ===
  const cityBgImg = _charImgs.cityBg;
  if (cityBgImg?.complete && cityBgImg.naturalWidth > 0) {
    // Parallax scroll: city BG scrolls slowly with player X
    const bgScrollX = (state.player.x * 0.2) % vw;
    ctx.drawImage(cityBgImg, -bgScrollX, 0, vw, vh * 0.72);
    if (bgScrollX > 0) {
      ctx.drawImage(cityBgImg, vw - bgScrollX, 0, vw, vh * 0.72);
    }
  } else {
    const skyGrad = ctx.createLinearGradient(0, 0, 0, vh * 0.72);
    if (warLevel <= 2) {
      skyGrad.addColorStop(0, "#1A6ED8");
      skyGrad.addColorStop(1, "#B8DFF5");
    } else if (warLevel <= 5) {
      skyGrad.addColorStop(0, "#7B2500");
      skyGrad.addColorStop(1, "#F0A030");
    } else {
      skyGrad.addColorStop(0, "#3A0000");
      skyGrad.addColorStop(1, "#FF2000");
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, vw, vh * 0.72);
  }

  // === MILITARY BASE / GROUND IMAGE ===
  const militaryBaseImg = _charImgs.militaryBase;
  if (militaryBaseImg?.complete && militaryBaseImg.naturalWidth > 0) {
    // Ground scrolls faster than bg (closer to viewer)
    const groundScrollX = (state.player.x * 0.55) % vw;
    ctx.drawImage(militaryBaseImg, -groundScrollX, vh * 0.7, vw, vh * 0.3);
    if (groundScrollX > 0) {
      ctx.drawImage(
        militaryBaseImg,
        vw - groundScrollX,
        vh * 0.7,
        vw,
        vh * 0.3,
      );
    }
  } else {
    const groundGrad = ctx.createLinearGradient(0, vh * 0.7, 0, vh);
    groundGrad.addColorStop(0, "#5A4028");
    groundGrad.addColorStop(1, "#A08060");
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, vh * 0.7, vw, vh * 0.3);
  }

  // === WAR TINT (level 5+) ===
  if (warLevel >= 5) {
    ctx.save();
    ctx.fillStyle = "rgba(150,0,0,0.35)";
    ctx.fillRect(0, 0, vw, vh);
    ctx.restore();
  }

  // === PARKED CARS ===
  drawParkedCar(ctx, vw * 0.08, vh * 0.76, "#C41010");
  drawParkedCar(ctx, vw * 0.18, vh * 0.78, "#1A237E");
  drawParkedCar(ctx, vw * 0.82, vh * 0.76, "#1B5E20");
  drawParkedCar(ctx, vw * 0.92, vh * 0.78, "#4A148C");

  // === ATMOSPHERE / HAZE near vanishing point ===
  const hazeGrad = ctx.createRadialGradient(VPX, VPY, 8, VPX, VPY, vw * 0.38);
  if (warLevel <= 3) {
    hazeGrad.addColorStop(0, "rgba(200, 180, 140, 0.55)");
    hazeGrad.addColorStop(0.5, "rgba(180, 155, 110, 0.2)");
    hazeGrad.addColorStop(1, "rgba(160, 130, 80, 0)");
  } else {
    hazeGrad.addColorStop(0, "rgba(220, 80, 10, 0.55)");
    hazeGrad.addColorStop(0.5, "rgba(200, 50, 5, 0.2)");
    hazeGrad.addColorStop(1, "rgba(180, 20, 0, 0)");
  }
  ctx.fillStyle = hazeGrad;
  ctx.fillRect(0, 0, vw, vh);

  // === WAR SMOKE COLUMNS (level 5+) ===
  if (warLevel >= 5) {
    const smokePositions = [vw * 0.08, vw * 0.5, vw * 0.92];
    for (let sci = 0; sci < smokePositions.length; sci++) {
      const scx = smokePositions[sci];
      for (let si = 0; si < 5; si++) {
        const rise = (now * 0.035 + si * 30 + sci * 100) % 100;
        const ssx = scx + Math.sin(now * 0.001 + si + sci) * 10;
        const ssy = VPY - 20 - rise;
        const sr = 10 + si * 4;
        ctx.save();
        ctx.globalAlpha =
          0.12 * (1 - rise / 100) * Math.min(1, (warLevel - 4) * 0.5);
        ctx.fillStyle = "#333";
        ctx.beginPath();
        ctx.arc(ssx, ssy, sr, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  // === BURNING BUILDING FIRE OVERLAY ===
  for (const bb of state.burningBuildings) {
    if (bb.fireTimer <= 0) continue;
    const b = state.buildings[bb.buildingIdx];
    if (!b) continue;
    const fireAlpha = (bb.fireTimer / bb.maxFireTime) * 0.7;
    const onLeft = b.x < MAP_W / 2;
    const fireCenterX = onLeft ? vw * 0.12 : vw * 0.84;
    const fireCenterY = vh * 0.42;
    ctx.save();
    for (let fi = 0; fi < 5; fi++) {
      const fx = fireCenterX + (fi - 2) * 22 + Math.sin(now * 0.007 + fi) * 8;
      const fy = fireCenterY + Math.sin(now * 0.005 + fi * 1.4) * 8;
      const fh = 38 + Math.sin(now * 0.009 + fi) * 12;
      const fg2 = ctx.createRadialGradient(fx, fy, 2, fx, fy - fh, fh * 1.3);
      fg2.addColorStop(0, "#FFFF00");
      fg2.addColorStop(0.4, "#FF5500");
      fg2.addColorStop(1, "rgba(200,0,0,0)");
      ctx.globalAlpha = fireAlpha * (0.6 + Math.sin(now * 0.01 + fi) * 0.3);
      ctx.fillStyle = fg2;
      ctx.beginPath();
      ctx.arc(fx, fy - fh * 0.3, fh * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // === BOSS ZONE INDICATORS ===
  for (const e of state.enemies) {
    if (!e.alive || !e.isBoss) continue;
    const bsx = e.x - camX;
    const bsy = e.y - camY;
    if (bsx < -400 || bsx > vw + 400 || bsy < -400 || bsy > vh + 400) continue;
    ctx.save();
    ctx.globalAlpha = 0.08 + 0.04 * Math.sin(now * 0.003);
    ctx.strokeStyle = e.colorAccent;
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.arc(bsx, bsy, 80, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }
}

function drawHUD(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  heroName: string,
  _heroBodyColor: string,
  vw: number,
  vh: number,
) {
  // Hero HP bar
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.roundRect(12, 12, 220, 56, 8);
  ctx.fill();
  ctx.font = "bold 12px sans-serif";
  ctx.fillStyle = "#FFF";
  ctx.textAlign = "left";
  ctx.fillText(heroName, 20, 30);
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.fillRect(20, 36, 200, 14);
  const hpPct = state.player.hp / 100;
  ctx.fillStyle =
    hpPct > 0.5 ? "#4CAF50" : hpPct > 0.25 ? "#FF9800" : "#F44336";
  ctx.fillRect(20, 36, 200 * hpPct, 14);
  ctx.fillStyle = "#FFF";
  ctx.font = "bold 10px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`${state.player.hp}/100`, 120, 47);
  ctx.restore();

  // Bomb count (below HP)
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.roundRect(12, 76, 100, 32, 8);
  ctx.fill();
  ctx.font = "bold 14px sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = state.bombCount > 0 ? "#FF9800" : "#888";
  ctx.fillText(`💣 x${state.bombCount}`, 62, 97);
  if (state.bombCooldown > 0) {
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "9px sans-serif";
    ctx.fillText("reload...", 62, 107);
  }
  ctx.restore();

  // Level indicator (top-center)
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.7)";
  ctx.roundRect(vw / 2 - 80, 12, 160, 50, 8);
  ctx.fill();
  ctx.font = "bold 11px sans-serif";
  ctx.fillStyle = "#FF9800";
  ctx.textAlign = "center";
  ctx.fillText("DHURANDHAR", vw / 2, 30);
  ctx.font = "bold 22px sans-serif";
  ctx.fillStyle = "#FFD700";
  ctx.fillText(`LEVEL ${state.currentLevel}`, vw / 2, 54);
  ctx.restore();

  // Enemies remaining (top-right)
  const _totalBosses = 4;
  const aliveCount = state.enemies.filter((e) => e.alive).length;
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.roundRect(vw - 190, 12, 178, 56, 8);
  ctx.fill();
  ctx.font = "bold 13px sans-serif";
  ctx.fillStyle = "#FFD54F";
  ctx.textAlign = "center";
  ctx.fillText("⚡ KARMA", vw - 100, 32);
  ctx.fillStyle = aliveCount > 0 ? "#EF9A9A" : "#69F0AE";
  ctx.font = "bold 18px sans-serif";
  ctx.fillText(
    aliveCount > 0 ? `${aliveCount} remaining` : "WAVE CLEAR!",
    vw - 100,
    54,
  );
  ctx.restore();

  // Minimap (bottom-right)
  const mmSize = 150;
  const mmPad = 12;
  const mmX = vw - mmSize - mmPad;
  const mmY = vh - mmSize - mmPad - 22;
  const scaleX = mmSize / MAP_W;
  const scaleY = mmSize / MAP_H;

  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.65)";
  ctx.strokeStyle = "rgba(255,200,50,0.6)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.rect(mmX, mmY, mmSize, mmSize);
  ctx.fill();
  ctx.stroke();

  // Buildings on minimap
  ctx.fillStyle = "rgba(140,120,100,0.5)";
  for (const b of state.buildings) {
    ctx.fillRect(
      mmX + b.x * scaleX,
      mmY + b.y * scaleY,
      Math.max(2, b.w * scaleX),
      Math.max(2, b.h * scaleY),
    );
  }

  // Burning buildings on minimap
  ctx.fillStyle = "rgba(255,100,0,0.8)";
  for (const bb of state.burningBuildings) {
    if (bb.fireTimer <= 0) continue;
    const b = state.buildings[bb.buildingIdx];
    if (!b) continue;
    ctx.fillRect(
      mmX + b.x * scaleX,
      mmY + b.y * scaleY,
      Math.max(3, b.w * scaleX),
      Math.max(3, b.h * scaleY),
    );
  }

  // Enemies on minimap
  for (const e of state.enemies) {
    if (!e.alive) continue;
    ctx.beginPath();
    ctx.arc(
      mmX + e.x * scaleX,
      mmY + e.y * scaleY,
      e.isBoss ? 4 : 2.5,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = e.isBoss ? "#FF8F00" : "#F44336";
    ctx.fill();
  }

  // Player on minimap
  ctx.beginPath();
  ctx.arc(
    mmX + state.player.x * scaleX,
    mmY + state.player.y * scaleY,
    4,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = "#2196F3";
  ctx.fill();
  ctx.strokeStyle = "#FFF";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.font = "9px sans-serif";
  ctx.fillStyle = "rgba(255,220,100,0.8)";
  ctx.textAlign = "center";
  ctx.fillText("MAP", mmX + mmSize / 2, mmY - 3);
  ctx.restore();

  // Copyright
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.7)";
  ctx.fillRect(0, vh - 22, vw, 22);
  ctx.font = "10px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.textAlign = "center";
  ctx.fillText(
    "© 2026 Dhurandhar | Priyanka Sharma | priyankadsharma11@gmail.com | All Rights Reserved",
    vw / 2,
    vh - 7,
  );
  ctx.restore();
}

function drawJoystick(
  ctx: CanvasRenderingContext2D,
  joy: GameState["joystick"],
  _vw: number,
  vh: number,
) {
  if (!joy.active) {
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.strokeStyle = "#FFF";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(80, vh - 100, 45, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(80, vh - 100, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
    return;
  }
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.strokeStyle = "#FFF";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(joy.baseX, joy.baseY, 45, 0, Math.PI * 2);
  ctx.stroke();
  const kx = joy.baseX + joy.dx;
  const ky = joy.baseY + joy.dy;
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.beginPath();
  ctx.arc(kx, ky, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawFireButton(
  ctx: CanvasRenderingContext2D,
  vw: number,
  vh: number,
  bombCount: number,
) {
  // FIRE button
  ctx.save();
  ctx.globalAlpha = 0.7;
  const bx = vw - 80;
  const by = vh - 110;
  const grad = ctx.createRadialGradient(bx, by, 5, bx, by, 42);
  grad.addColorStop(0, "#FF5252");
  grad.addColorStop(1, "#B71C1C");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(bx, by, 42, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#FF8A80";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#FFF";
  ctx.font = "bold 14px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("FIRE", bx, by);

  // BOMB button
  const bombBx = vw - 155;
  const bombBy = vh - 90;
  ctx.globalAlpha = bombCount > 0 ? 0.75 : 0.35;
  const bgrad = ctx.createRadialGradient(bombBx, bombBy, 4, bombBx, bombBy, 34);
  bgrad.addColorStop(0, bombCount > 0 ? "#FFB300" : "#666");
  bgrad.addColorStop(1, bombCount > 0 ? "#E65100" : "#333");
  ctx.fillStyle = bgrad;
  ctx.beginPath();
  ctx.arc(bombBx, bombBy, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = bombCount > 0 ? "#FFD54F" : "#888";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#FFF";
  ctx.font = "bold 13px sans-serif";
  ctx.fillText("💣", bombBx, bombBy - 4);
  ctx.font = "9px sans-serif";
  ctx.fillText(`x${bombCount}`, bombBx, bombBy + 12);

  ctx.textBaseline = "alphabetic";
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawNPC(
  ctx: CanvasRenderingContext2D,
  npc: NPC,
  screenX: number,
  screenY: number,
) {
  ctx.save();
  ctx.translate(screenX, screenY);
  if (npc.facing < 0) ctx.scale(-1, 1);

  // Ground shadow
  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.ellipse(0, 30, 12, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  if (npc.type === "ally_soldier") {
    // ═══════════════════════════════════════
    // INDIAN ARMY ALLIED SOLDIER
    // Olive green Indian Army cut uniform + INSAS rifle
    // ═══════════════════════════════════════
    // Boots
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(-5, 24, 5, 7);
    ctx.fillRect(2, 24, 5, 7);
    ctx.fillStyle = "#2a2a2a";
    ctx.fillRect(-4, 24, 3, 2);
    ctx.fillRect(3, 24, 3, 2);
    // Legs
    let slg = ctx.createLinearGradient(-6, 0, 0, 0);
    slg.addColorStop(0, "#4a5e30");
    slg.addColorStop(0.6, "#3A4A2E");
    slg.addColorStop(1, "#2a3a1e");
    ctx.fillStyle = slg;
    ctx.fillRect(-6, 10, 6, 15);
    let srg = ctx.createLinearGradient(2, 0, 8, 0);
    srg.addColorStop(0, "#4a5e30");
    srg.addColorStop(0.6, "#3A4A2E");
    srg.addColorStop(1, "#2a3a1e");
    ctx.fillStyle = srg;
    ctx.fillRect(2, 10, 6, 15);
    // Torso — olive green Indian Army uniform
    let stg = ctx.createLinearGradient(-10, 0, 10, 0);
    stg.addColorStop(0, "#5a7040");
    stg.addColorStop(0.5, "#4A5E3A");
    stg.addColorStop(1, "#2a3a1e");
    ctx.fillStyle = stg;
    ctx.beginPath();
    ctx.roundRect(-10, -5, 20, 17, 3);
    ctx.fill();
    // Collar & button line
    ctx.strokeStyle = "rgba(0,0,0,0.3)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(0, -5);
    ctx.lineTo(0, 10);
    ctx.stroke();
    // Camo pattern spots
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    for (const [cx2, cy2] of [
      [-6, 0],
      [3, 3],
      [-4, 7],
      [5, -2],
    ]) {
      ctx.beginPath();
      ctx.ellipse(cx2, cy2, 2.5, 1.5, 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    // Shoulder epaulettes
    ctx.fillStyle = "#3A4A2E";
    ctx.beginPath();
    ctx.roundRect(-13, -5, 5, 5, 2);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(8, -5, 5, 5, 2);
    ctx.fill();
    // Gold rank pip
    ctx.fillStyle = "#FFD700";
    ctx.beginPath();
    ctx.arc(-10, -2, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(11, -2, 1.5, 0, Math.PI * 2);
    ctx.fill();
    // Arms
    let salg = ctx.createLinearGradient(-15, 0, -8, 0);
    salg.addColorStop(0, "#5a7040");
    salg.addColorStop(1, "#2a3a1e");
    ctx.fillStyle = salg;
    ctx.beginPath();
    ctx.roundRect(-14, -4, 6, 15, 3);
    ctx.fill();
    let sarg = ctx.createLinearGradient(8, 0, 14, 0);
    sarg.addColorStop(0, "#5a7040");
    sarg.addColorStop(1, "#2a3a1e");
    ctx.fillStyle = sarg;
    ctx.beginPath();
    ctx.roundRect(8, -4, 6, 11, 3);
    ctx.fill();
    // INSAS rifle
    ctx.fillStyle = "#1a1a1a";
    ctx.beginPath();
    ctx.roundRect(9, 0, 22, 4, 1);
    ctx.fill();
    ctx.fillStyle = "#333";
    ctx.fillRect(11, 0, 16, 1.5);
    ctx.fillStyle = "#111";
    ctx.fillRect(29, 1, 6, 2);
    ctx.fillStyle = "#4a3010";
    ctx.beginPath();
    ctx.roundRect(9, 2, 4, 6, 1);
    ctx.fill();
    ctx.fillStyle = "#222";
    ctx.beginPath();
    ctx.roundRect(19, 4, 4, 7, 1);
    ctx.fill();
    // Helmet (olive peaked hat)
    ctx.fillStyle = "#4A5E3A";
    ctx.beginPath();
    ctx.ellipse(0, -17, 9, 4, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-9, -20, 18, 5);
    ctx.fillStyle = "#2a3a1e";
    ctx.fillRect(-10, -17, 20, 2);
    // Head
    let shg = ctx.createRadialGradient(-2, -12, 1.5, 0, -11, 9);
    shg.addColorStop(0, "#d4a870");
    shg.addColorStop(0.7, "#C08040");
    shg.addColorStop(1, "#8a5020");
    ctx.fillStyle = shg;
    ctx.beginPath();
    ctx.ellipse(0, -11, 7, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    // Eyes
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.ellipse(-3, -12, 2, 1.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(3, -12, 2, 1.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#333";
    ctx.beginPath();
    ctx.arc(-3, -12, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(3, -12, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#2a1a0a";
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(-5, -13);
    ctx.quadraticCurveTo(-3, -14.5, -1, -13);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(1, -13);
    ctx.quadraticCurveTo(3, -14.5, 5, -13);
    ctx.stroke();
    ctx.fillStyle = "#a06030";
    ctx.beginPath();
    ctx.arc(0, -9, 1.3, 0, Math.PI * 2);
    ctx.fill();
  } else if (npc.type === "civilian_woman") {
    // ═══════════════════════════════════════
    // INDIAN CIVILIAN WOMAN
    // Bright orange/red sari + bindi + hair bun + bangles
    // ═══════════════════════════════════════
    // Feet
    ctx.fillStyle = "#4a3020";
    ctx.fillRect(-4, 22, 4, 6);
    ctx.fillRect(1, 22, 4, 6);
    // Sari skirt (flowing from waist to feet)
    ctx.fillStyle = "#E8421A";
    ctx.beginPath();
    ctx.moveTo(-8, 8);
    ctx.lineTo(-9, 24);
    ctx.lineTo(9, 24);
    ctx.lineTo(8, 8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#C4340E";
    ctx.beginPath();
    ctx.moveTo(-2, 8);
    ctx.lineTo(-3, 24);
    ctx.lineTo(2, 24);
    ctx.lineTo(2, 8);
    ctx.closePath();
    ctx.fill();
    // Sari gold border
    ctx.strokeStyle = "#FFD700";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-9, 22);
    ctx.lineTo(9, 22);
    ctx.stroke();
    // Blouse/choli
    let wbg = ctx.createLinearGradient(-8, 0, 8, 0);
    wbg.addColorStop(0, "#FF7043");
    wbg.addColorStop(0.5, "#FF6B35");
    wbg.addColorStop(1, "#CC4010");
    ctx.fillStyle = wbg;
    ctx.beginPath();
    ctx.roundRect(-7, -4, 14, 14, 3);
    ctx.fill();
    // Sari pallu draped over left shoulder
    ctx.fillStyle = "rgba(232,66,26,0.8)";
    ctx.beginPath();
    ctx.moveTo(-7, -4);
    ctx.lineTo(-10, -4);
    ctx.lineTo(-12, 10);
    ctx.lineTo(-8, 8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#FFD700";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-10, -4);
    ctx.lineTo(-12, 8);
    ctx.stroke();
    // Arms
    ctx.fillStyle = "#E06030";
    ctx.beginPath();
    ctx.roundRect(-11, -3, 5, 12, 2);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(6, -3, 5, 12, 2);
    ctx.fill();
    // Bangles on wrists
    const bangColors = ["#FFD700", "#E8421A", "#FFD700"];
    for (let i = 0; i < bangColors.length; i++) {
      const c = bangColors[i];
      ctx.strokeStyle = c;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(-8, 7 + i, 2, 1.2, 0.3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(10, 7 + i, 2, 1.2, -0.3, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Head
    let whg = ctx.createRadialGradient(-1.5, -12, 1.5, 0, -11, 8);
    whg.addColorStop(0, "#e0a878");
    whg.addColorStop(0.7, "#C48050");
    whg.addColorStop(1, "#906030");
    ctx.fillStyle = whg;
    ctx.beginPath();
    ctx.ellipse(0, -11, 6, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    // Bindi (red dot on forehead)
    ctx.fillStyle = "#C62828";
    ctx.beginPath();
    ctx.arc(0, -14, 1.8, 0, Math.PI * 2);
    ctx.fill();
    // Hair bun (dark, on top/back of head)
    ctx.fillStyle = "#111";
    ctx.beginPath();
    ctx.ellipse(0, -20, 6, 3, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-6, -20, 12, 3);
    ctx.beginPath();
    ctx.ellipse(1, -21, 4, 3, 0.3, 0, Math.PI * 2);
    ctx.fill(); // bun
    // Eyes
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.ellipse(-2.5, -12, 2, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(2.5, -12, 2, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#333";
    ctx.beginPath();
    ctx.arc(-2.5, -12, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(2.5, -12, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.beginPath();
    ctx.arc(-2, -12.4, 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(3, -12.4, 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-4, -13);
    ctx.quadraticCurveTo(-2.5, -14.5, -1, -13);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(1, -13);
    ctx.quadraticCurveTo(2.5, -14.5, 4, -13);
    ctx.stroke();
    ctx.fillStyle = "#906030";
    ctx.beginPath();
    ctx.arc(0, -9.5, 1.2, 0, Math.PI * 2);
    ctx.fill();
    // Smile
    ctx.strokeStyle = "#804020";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-2.5, -7.5);
    ctx.quadraticCurveTo(0, -6, 2.5, -7.5);
    ctx.stroke();
  } else {
    // ═══════════════════════════════════════
    // INDIAN CIVILIAN MAN
    // Saffron kurta + white dhoti + Gandhi cap + mustache
    // ═══════════════════════════════════════
    // Sandals / feet
    ctx.fillStyle = "#6b4020";
    ctx.beginPath();
    ctx.roundRect(-5, 23, 5, 5, 1);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(1, 23, 5, 5, 1);
    ctx.fill();
    ctx.strokeStyle = "#8b5030";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-4, 25);
    ctx.lineTo(0, 25);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(2, 25);
    ctx.lineTo(5, 25);
    ctx.stroke();
    // Dhoti (white lower body)
    ctx.fillStyle = "#e8e8e0";
    ctx.fillRect(-5, 10, 5, 15);
    ctx.fillRect(1, 10, 5, 15);
    ctx.strokeStyle = "#ccc";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-5, 14);
    ctx.lineTo(0, 14);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(2, 14);
    ctx.lineTo(6, 14);
    ctx.stroke();
    // Kurta top (saffron orange)
    let mtg = ctx.createLinearGradient(-10, 0, 10, 0);
    mtg.addColorStop(0, "#FFB040");
    mtg.addColorStop(0.5, "#FF9933");
    mtg.addColorStop(1, "#CC7010");
    ctx.fillStyle = mtg;
    ctx.beginPath();
    ctx.roundRect(-9, -5, 18, 17, 3);
    ctx.fill();
    // Kurta collar / button line
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(0, -5);
    ctx.lineTo(0, 10);
    ctx.stroke();
    ctx.fillStyle = "#CC7010";
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(0, -3 + i * 5, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
    // Arms
    let malg = ctx.createLinearGradient(-14, 0, -8, 0);
    malg.addColorStop(0, "#FFB040");
    malg.addColorStop(1, "#CC7010");
    ctx.fillStyle = malg;
    ctx.beginPath();
    ctx.roundRect(-13, -4, 5, 14, 2);
    ctx.fill();
    let marg = ctx.createLinearGradient(8, 0, 14, 0);
    marg.addColorStop(0, "#FFB040");
    marg.addColorStop(1, "#CC7010");
    ctx.fillStyle = marg;
    ctx.beginPath();
    ctx.roundRect(8, -4, 5, 14, 2);
    ctx.fill();
    // Head
    let mhg = ctx.createRadialGradient(-1.5, -13, 1.5, 0, -12, 9);
    mhg.addColorStop(0, "#d4a870");
    mhg.addColorStop(0.7, "#B88050");
    mhg.addColorStop(1, "#8a5020");
    ctx.fillStyle = mhg;
    ctx.beginPath();
    ctx.ellipse(0, -12, 7, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    // Gandhi cap (white, flat)
    ctx.fillStyle = "#f0f0e8";
    ctx.beginPath();
    ctx.ellipse(0, -20, 7.5, 3, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-7.5, -20, 15, 3);
    ctx.fillStyle = "#e0e0d0";
    ctx.fillRect(-7.5, -20, 15, 1.5);
    // Indian tricolor motif on cap
    ctx.fillStyle = "#FF9933";
    ctx.fillRect(-3, -21, 6, 1);
    ctx.fillStyle = "#138808";
    ctx.fillRect(-3, -20, 6, 1);
    // Mustache (kind, full)
    ctx.fillStyle = "#2a1a0a";
    ctx.beginPath();
    ctx.ellipse(0, -9.5, 5, 2.5, 0, 0, Math.PI);
    ctx.fill();
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-5, -9.5);
    ctx.quadraticCurveTo(0, -7.5, 5, -9.5);
    ctx.stroke();
    // Eyes
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.ellipse(-3, -13, 2, 1.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(3, -13, 2, 1.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#333";
    ctx.beginPath();
    ctx.arc(-3, -13, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(3, -13, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.beginPath();
    ctx.arc(-2.5, -13.5, 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(3.5, -13.5, 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#2a1a0a";
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(-5, -14);
    ctx.quadraticCurveTo(-3, -15.5, -1, -14);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(1, -14);
    ctx.quadraticCurveTo(3, -15.5, 5, -14);
    ctx.stroke();
    ctx.fillStyle = "#906030";
    ctx.beginPath();
    ctx.arc(0, -10.5, 1.3, 0, Math.PI * 2);
    ctx.fill();
    // Kind smile
    ctx.strokeStyle = "#804020";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-3, -7.5);
    ctx.quadraticCurveTo(0, -6, 3, -7.5);
    ctx.stroke();
  }

  ctx.restore();

  if (npc.hintVisible) {
    const text = npc.hint;
    ctx.save();
    ctx.font = "bold 11px sans-serif";
    const tw = ctx.measureText(text).width;
    const bw = tw + 16;
    const bh = 28;
    const bx = screenX - bw / 2;
    const by = screenY - 70;
    ctx.fillStyle = "rgba(255,250,220,0.95)";
    ctx.strokeStyle = "#FF9933";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(255,250,220,0.95)";
    ctx.beginPath();
    ctx.moveTo(screenX - 6, by + bh);
    ctx.lineTo(screenX, by + bh + 8);
    ctx.lineTo(screenX + 6, by + bh);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#333";
    ctx.textAlign = "center";
    ctx.fillText(text, screenX, by + 18);
    ctx.restore();
  }
}

// Pure helper: project world-space position to alley perspective screen coords
function worldToAlleyScreen(
  worldX: number,
  worldY: number,
  playerX: number,
  playerY: number,
  vw: number,
  vh: number,
): { sx: number; sy: number; scale: number; visible: boolean } {
  const VPX = vw / 2;
  const VPY = vh * 0.33;
  const GROUND_Y = vh * 0.84;
  const FOCAL = 180;

  const relX = worldX - playerX;
  const relY = worldY - playerY;
  const depth = Math.sqrt(relX * relX + relY * relY);

  if (depth < 5) {
    return { sx: VPX, sy: GROUND_Y - 32, scale: 1.8, visible: true };
  }

  const perspDiv = Math.max(1, depth * 0.007);
  const sx = VPX + relX / perspDiv;

  const groundRange = GROUND_Y - (VPY + 28);
  const distFactor = Math.min(1, depth / 450);
  const sy = GROUND_Y - groundRange * (1 - distFactor) - 28;

  const scale = Math.max(0.1, Math.min(1.8, FOCAL / Math.max(30, depth)));
  const visible =
    sx > -160 && sx < vw + 160 && sy > VPY - 20 && sy < GROUND_Y + 50;

  return { sx, sy, scale, visible };
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gamePhase, setGamePhase] = useState<GamePhase>("menu");
  const [selectedHero, setSelectedHero] = useState(0);
  const [muted, setMuted] = useState(false);
  const stateRef = useRef<GameState | null>(null);
  const animFrameRef = useRef<number>(0);
  const phaseRef = useRef<GamePhase>("menu");
  const bgMusicStopRef = useRef<(() => void) | null>(null);
  const selectedHeroRef = useRef(0);
  const mobileFireRef = useRef(false);
  const mobileBombRef = useRef(false);

  // Preload character images
  useEffect(() => {
    const imageMap: Record<string, string> = {
      humza: "/assets/generated/humza-realistic-transparent.dim_200x340.png",
      ajay: "/assets/generated/ajay-realistic-transparent.dim_200x340.png",
      grunt: "/assets/generated/grunt-realistic-transparent.dim_200x340.png",
      rehman: "/assets/generated/rehman-realistic-transparent.dim_200x340.png",
      sp_aslam:
        "/assets/generated/sp-aslam-realistic-transparent.dim_200x340.png",
      major_iqbal:
        "/assets/generated/major-iqbal-realistic-transparent.dim_200x340.png",
      jameel: "/assets/generated/jameel-realistic-transparent.dim_200x340.png",
      cityBg: "/assets/generated/city-bg-realistic.dim_1920x600.jpg",
      militaryBase: "/assets/generated/military-base-bg.dim_1920x600.jpg",
    };
    for (const [key, src] of Object.entries(imageMap)) {
      const img = new Image();
      img.src = src;
      _charImgs[key] = img;
    }
  }, []);

  useEffect(() => {
    phaseRef.current = gamePhase;
  }, [gamePhase]);
  useEffect(() => {
    selectedHeroRef.current = selectedHero;
  }, [selectedHero]);

  const initGame = useCallback(
    (_heroIdx: number) => {
      const { buildings, palmTrees } = generateMap();
      const rand = seededRand(99);

      const enemies: Enemy[] = [];
      let eid = 0;

      // Grunts
      for (let i = 0; i < 5; i++) {
        const pos = GRUNT_ZONE_POSITIONS[i];
        enemies.push({
          id: eid++,
          x: pos.x + (rand() - 0.5) * 100,
          y: pos.y + (rand() - 0.5) * 100,
          vx: 0,
          vy: 0,
          hp: 50,
          maxHp: 50,
          state: "idle",
          isBoss: false,
          name: `Grunt ${i + 1}`,
          zone: "any",
          colorAccent: "#4CAF50",
          uniform: "#388E3C",
          shootTimer: ENEMY_SHOOT_INTERVAL,
          stateTimer: 0,
          patrolTarget: {
            x: pos.x + (rand() - 0.5) * 200,
            y: pos.y + (rand() - 0.5) * 200,
          },
          alive: true,
          flashTimer: 0,
        });
      }

      // Bosses
      for (const bd of BOSS_DATA) {
        enemies.push({
          id: eid++,
          x: bd.spawnX,
          y: bd.spawnY,
          vx: 0,
          vy: 0,
          hp: 150,
          maxHp: 150,
          state: "idle",
          isBoss: true,
          name: bd.name,
          zone: bd.zone,
          colorAccent: bd.colorAccent,
          uniform: bd.uniform,
          shootTimer: BOSS_SHOOT_INTERVAL,
          stateTimer: 0,
          patrolTarget: {
            x: bd.spawnX + (rand() - 0.5) * 150,
            y: bd.spawnY + (rand() - 0.5) * 150,
          },
          alive: true,
          flashTimer: 0,
        });
      }

      // Dust particles
      const dustParticles: DustParticle[] = [];
      for (let i = 0; i < 30; i++) {
        dustParticles.push({
          x: rand() * MAP_W,
          y: rand() * MAP_H,
          vx: (rand() - 0.5) * 0.4,
          vy: (rand() - 0.5) * 0.4,
          alpha: 0.05 + rand() * 0.1,
          size: 2 + rand() * 5,
        });
      }

      // NPCs
      const npcs: NPC[] = [
        {
          id: 0,
          x: MAP_W * 0.3,
          y: MAP_H * 0.4,
          type: "civilian_man",
          hint: "Rehman was spotted south near the market!",
          facing: 1,
          hintVisible: false,
        },
        {
          id: 1,
          x: MAP_W * 0.7,
          y: MAP_H * 0.35,
          type: "civilian_woman",
          hint: "Major Iqbal controls the northern checkpoint!",
          facing: -1,
          hintVisible: false,
        },
        {
          id: 2,
          x: MAP_W * 0.45,
          y: MAP_H * 0.55,
          type: "ally_soldier",
          hint: "SP Aslam hides in the western compound!",
          facing: 1,
          hintVisible: false,
        },
        {
          id: 3,
          x: MAP_W * 0.6,
          y: MAP_H * 0.7,
          type: "civilian_man",
          hint: "Jameel Jamali was seen east near the mosque!",
          facing: -1,
          hintVisible: false,
        },
      ];

      let audioCtx: AudioContext | null = null;
      try {
        audioCtx = new AudioContext();
      } catch (_) {}

      stateRef.current = {
        player: {
          x: MAP_W / 2,
          y: MAP_H / 2,
          vx: 0,
          vy: 0,
          hp: 100,
          facing: 1,
          shootTimer: 0,
          animFrame: 0,
          animTimer: 0,
          isMoving: false,
        },
        enemies,
        bullets: [],
        particles: [],
        dustParticles,
        buildings,
        palmTrees,
        bombs: [],
        burningBuildings: [],
        bombCount: 3,
        bombCooldown: 0,
        bombId: 0,
        shakeTimer: 0,
        camera: { x: MAP_W / 2 - 400, y: MAP_H / 2 - 300 },
        bulletId: 0,
        particleId: 0,
        frameCount: 0,
        lastTime: performance.now(),
        bossesDefeated: 0,
        currentLevel: 1,
        levelTransition: false,
        levelTransitionTimer: 0,
        allBossesDefeatedOnce: false,
        npcs,
        keysDown: new Set(),
        joystick: {
          active: false,
          baseX: 80,
          baseY: 0,
          dx: 0,
          dy: 0,
          touchId: null,
        },
        muted,
        audioCtx,
      };

      return stateRef.current;
    },
    [muted],
  );

  const updateGame = useCallback(
    (state: GameState, dt: number, canvas: HTMLCanvasElement) => {
      const vw = canvas.width;
      const vh = canvas.height;
      const p = state.player;
      const _hero = HEROES[selectedHeroRef.current];

      if (state.muted !== muted) state.muted = muted;

      // ── Player input ──
      let mvx = 0;
      let mvy = 0;
      if (
        state.keysDown.has("ArrowLeft") ||
        state.keysDown.has("a") ||
        state.keysDown.has("A")
      )
        mvx -= 1;
      if (
        state.keysDown.has("ArrowRight") ||
        state.keysDown.has("d") ||
        state.keysDown.has("D")
      )
        mvx += 1;
      if (
        state.keysDown.has("ArrowUp") ||
        state.keysDown.has("w") ||
        state.keysDown.has("W")
      )
        mvy -= 1;
      if (
        state.keysDown.has("ArrowDown") ||
        state.keysDown.has("s") ||
        state.keysDown.has("S")
      )
        mvy += 1;

      if (state.joystick.active) {
        mvx = state.joystick.dx / 45;
        mvy = state.joystick.dy / 45;
      }

      const len = Math.sqrt(mvx * mvx + mvy * mvy);
      if (len > 1) {
        mvx /= len;
        mvy /= len;
      }

      p.vx = mvx * PLAYER_SPEED;
      p.vy = mvy * PLAYER_SPEED;
      p.isMoving = len > 0.1;

      if (mvx > 0.1) p.facing = 1;
      else if (mvx < -0.1) p.facing = -1;

      // Move player with collision
      const newPx = p.x + p.vx;
      const newPy = p.y + p.vy;
      let blockedX = false;
      let blockedY = false;
      for (const b of state.buildings) {
        if (circleRect(newPx, p.y, 14, b.x, b.y, b.w, b.h)) blockedX = true;
        if (circleRect(p.x, newPy, 14, b.x, b.y, b.w, b.h)) blockedY = true;
      }
      if (!blockedX) p.x = Math.max(20, Math.min(MAP_W - 20, newPx));
      if (!blockedY) p.y = Math.max(20, Math.min(MAP_H - 20, newPy));

      // Update NPC hint visibility
      for (const npc of state.npcs) {
        const d = dist(p.x, p.y, npc.x, npc.y);
        npc.hintVisible = d < 150;
      }

      // Animation
      p.animTimer += dt;
      if (p.isMoving && p.animTimer > 50) {
        p.animFrame++;
        p.animTimer = 0;
      }

      // ── Player shoot ──
      p.shootTimer -= dt;
      const wantsShoot =
        state.keysDown.has(" ") ||
        state.keysDown.has("Enter") ||
        mobileFireRef.current;
      if (wantsShoot && p.shootTimer <= 0) {
        p.shootTimer = PLAYER_SHOOT_COOLDOWN;
        let nearestEnemy: Enemy | null = null;
        let nearestDist = 800;
        for (const e of state.enemies) {
          if (!e.alive) continue;
          const d = dist(p.x, p.y, e.x, e.y);
          if (d < nearestDist) {
            nearestDist = d;
            nearestEnemy = e;
          }
        }
        let bvx: number;
        let bvy: number;
        if (nearestEnemy) {
          const n = normalize(nearestEnemy.x - p.x, nearestEnemy.y - p.y);
          bvx = n.x * BULLET_SPEED;
          bvy = n.y * BULLET_SPEED;
          if (nearestEnemy.x > p.x) p.facing = 1;
          else p.facing = -1;
        } else {
          bvx = p.facing * BULLET_SPEED;
          bvy = 0;
        }
        state.bullets.push({
          id: state.bulletId++,
          x: p.x,
          y: p.y,
          vx: bvx,
          vy: bvy,
          dist: 0,
          fromPlayer: true,
          alive: true,
        });
        playSound(state.audioCtx, state.muted, "shoot");
      }

      // ── Bomb throw ──
      state.bombCooldown = Math.max(0, state.bombCooldown - dt);
      // Replenish bombs
      if (
        state.frameCount % BOMB_REPLENISH_FRAMES === 0 &&
        state.frameCount > 0
      ) {
        state.bombCount = Math.min(5, state.bombCount + 1);
      }
      const wantsBomb =
        state.keysDown.has("b") ||
        state.keysDown.has("B") ||
        mobileBombRef.current;
      if (wantsBomb && state.bombCount > 0 && state.bombCooldown <= 0) {
        state.bombCooldown = 600;
        state.bombCount--;
        mobileBombRef.current = false;
        // Aim toward nearest enemy
        let nearestEnemy: Enemy | null = null;
        let nearestDist2 = 1200;
        for (const e of state.enemies) {
          if (!e.alive) continue;
          const d = dist(p.x, p.y, e.x, e.y);
          if (d < nearestDist2) {
            nearestDist2 = d;
            nearestEnemy = e;
          }
        }
        let tvx: number;
        let tvy: number;
        if (nearestEnemy) {
          const n = normalize(nearestEnemy.x - p.x, nearestEnemy.y - p.y);
          tvx = n.x * 5;
          tvy = n.y * 5;
        } else {
          tvx = p.facing * 5;
          tvy = 0;
        }
        state.bombs.push({
          id: state.bombId++,
          x: p.x,
          y: p.y,
          vx: tvx,
          vy: tvy,
          alive: true,
          landed: false,
          fuseTimer: BOMB_FUSE_TIME,
        });
        playSound(state.audioCtx, state.muted, "bombthrow");
      }

      // ── Update bombs ──
      for (const bomb of state.bombs) {
        if (!bomb.alive) continue;
        if (!bomb.landed) {
          bomb.x += bomb.vx;
          bomb.y += bomb.vy;
          // Check if it hits a building or goes out of range from origin
          let hitBuilding = false;
          for (const b of state.buildings) {
            if (circleRect(bomb.x, bomb.y, 8, b.x, b.y, b.w, b.h)) {
              hitBuilding = true;
              break;
            }
          }
          if (
            hitBuilding ||
            bomb.x < 0 ||
            bomb.x > MAP_W ||
            bomb.y < 0 ||
            bomb.y > MAP_H
          ) {
            bomb.landed = true;
          }
          // Stop after travel distance
          const travelDist = dist(bomb.x, bomb.y, p.x, p.y);
          if (travelDist > 350) bomb.landed = true;
        } else {
          bomb.fuseTimer -= dt;
          // Beep near end
          if (
            bomb.fuseTimer < 600 &&
            bomb.fuseTimer > 0 &&
            state.frameCount % 12 === 0
          ) {
            playSound(state.audioCtx, state.muted, "beep");
          }
          if (bomb.fuseTimer <= 0) {
            // EXPLODE
            bomb.alive = false;
            playSound(state.audioCtx, state.muted, "explosion");
            state.shakeTimer = 350;

            // Explosion particles
            for (let i = 0; i < 50; i++) {
              const angle = Math.random() * Math.PI * 2;
              const speed = 3 + Math.random() * 8;
              state.particles.push({
                id: state.particleId++,
                x: bomb.x,
                y: bomb.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 600 + Math.random() * 400,
                maxLife: 1000,
                color: ["#FF6D00", "#FFD600", "#FF5252", "#FFFF00", "#FF8C00"][
                  Math.floor(Math.random() * 5)
                ],
                size: 5 + Math.random() * 8,
              });
            }
            // Smoke
            for (let i = 0; i < 12; i++) {
              const angle = Math.random() * Math.PI * 2;
              state.particles.push({
                id: state.particleId++,
                x: bomb.x + (Math.random() - 0.5) * 30,
                y: bomb.y + (Math.random() - 0.5) * 30,
                vx: Math.cos(angle) * 1.5,
                vy: Math.sin(angle) * 1.5 - 1,
                life: 1200,
                maxLife: 1200,
                color: "#555",
                size: 10 + Math.random() * 12,
              });
            }

            // Damage enemies in radius
            for (const e of state.enemies) {
              if (!e.alive) continue;
              const d = dist(bomb.x, bomb.y, e.x, e.y);
              if (d < BOMB_RADIUS) {
                const dmg = e.isBoss ? 50 : 80;
                e.hp -= dmg;
                e.flashTimer = 300;
                if (e.hp <= 0) {
                  e.alive = false;
                  if (e.isBoss) {
                    state.bossesDefeated++;
                    playSound(state.audioCtx, state.muted, "death");
                  } else {
                    playSound(state.audioCtx, state.muted, "death");
                  }
                }
              }
            }

            // Damage player if too close
            if (dist(bomb.x, bomb.y, p.x, p.y) < BOMB_RADIUS * 0.6) {
              p.hp = Math.max(0, p.hp - 20);
              state.shakeTimer = 500;
            }

            // Set buildings on fire
            for (let bi = 0; bi < state.buildings.length; bi++) {
              const b = state.buildings[bi];
              const bCx = b.x + b.w / 2;
              const bCy = b.y + b.h / 2;
              if (dist(bomb.x, bomb.y, bCx, bCy) < BOMB_RADIUS + b.w * 0.5) {
                const existing = state.burningBuildings.find(
                  (bb) => bb.buildingIdx === bi,
                );
                if (!existing) {
                  state.burningBuildings.push({
                    buildingIdx: bi,
                    fireTimer: 8000,
                    maxFireTime: 8000,
                  });
                  // Kill enemies inside burning building
                  for (const e of state.enemies) {
                    if (!e.alive) continue;
                    if (circleRect(e.x, e.y, 16, b.x, b.y, b.w, b.h)) {
                      e.hp = 0;
                      e.alive = false;
                      if (e.isBoss) state.bossesDefeated++;
                    }
                  }
                }
              }
            }
          }
        }
      }
      state.bombs = state.bombs.filter((b) => b.alive || b.landed);

      // ── Update burning buildings ──
      for (const bb of state.burningBuildings) {
        if (bb.fireTimer > 0) {
          bb.fireTimer -= dt;
          // Kill enemies that walk into burning buildings
          const b = state.buildings[bb.buildingIdx];
          if (b) {
            for (const e of state.enemies) {
              if (!e.alive) continue;
              if (circleRect(e.x, e.y, 14, b.x, b.y, b.w, b.h)) {
                e.hp = 0;
                e.alive = false;
                if (e.isBoss) state.bossesDefeated++;
              }
            }
          }
        }
      }

      // ── Screen shake ──
      state.shakeTimer = Math.max(0, state.shakeTimer - dt);

      // ── Enemy AI ──
      for (const e of state.enemies) {
        if (!e.alive) continue;

        e.flashTimer = Math.max(0, e.flashTimer - dt);
        e.stateTimer += dt;
        const d = dist(e.x, e.y, p.x, p.y);

        if (d < FIGHT_DIST) {
          if (e.state !== "fight") {
            e.state = "fight";
            if (e.isBoss && e.stateTimer > 2000) {
              playSound(state.audioCtx, state.muted, "boss");
              e.stateTimer = 0;
            }
          }
        } else if (d < FLEE_DIST) {
          e.state = "flee";
        } else {
          if (e.state !== "idle") e.stateTimer = 0;
          e.state = "idle";
        }

        let targetX = e.x;
        let targetY = e.y;

        if (e.state === "idle") {
          // Enemies hunt toward the hero — they search, hide behind buildings,
          // then approach. Update patrol target toward player with zig-zag offset.
          const pd = dist(e.x, e.y, e.patrolTarget.x, e.patrolTarget.y);
          if (pd < 25 || e.stateTimer > 1800) {
            const r = seededRand(
              e.id + Math.floor(e.stateTimer * 0.002 + state.frameCount * 0.01),
            );
            // Boss: chase directly; Grunts: approach from angles (flank)
            const angleOffset = e.isBoss ? 0 : (r() - 0.5) * Math.PI;
            const baseAngle = Math.atan2(p.y - e.y, p.x - e.x) + angleOffset;
            // Distance to close in — grunts stop just outside flee range to lurk
            const huntDist = e.isBoss ? 60 : 80 + r() * 140;
            e.patrolTarget = {
              x: Math.max(
                50,
                Math.min(
                  MAP_W - 50,
                  p.x + Math.cos(baseAngle + Math.PI) * huntDist,
                ),
              ),
              y: Math.max(
                50,
                Math.min(
                  MAP_H - 50,
                  p.y + Math.sin(baseAngle + Math.PI) * huntDist,
                ),
              ),
            };
            e.stateTimer = 0;
          }
          targetX = e.patrolTarget.x;
          targetY = e.patrolTarget.y;
        } else if (e.state === "flee") {
          const away = normalize(e.x - p.x, e.y - p.y);
          const rand2 = seededRand(e.id + Math.floor(state.frameCount / 30));
          targetX = e.x + away.x * 200 + (rand2() - 0.5) * 60;
          targetY = e.y + away.y * 200 + (rand2() - 0.5) * 60;
        } else {
          const perp = normalize(-(p.y - e.y), p.x - e.x);
          targetX = p.x + perp.x * 80;
          targetY = p.y + perp.y * 80;
        }

        const speed =
          e.state === "flee"
            ? ENEMY_FLEE_SPEED
            : e.state === "fight"
              ? ENEMY_FIGHT_SPEED
              : ENEMY_PATROL_SPEED;

        const toTarget = normalize(targetX - e.x, targetY - e.y);
        const evx = toTarget.x * speed;
        const evy = toTarget.y * speed;

        const nex = e.x + evx;
        const ney = e.y + evy;
        let ebX = false;
        let ebY = false;
        for (const b of state.buildings) {
          if (circleRect(nex, e.y, 12, b.x, b.y, b.w, b.h)) ebX = true;
          if (circleRect(e.x, ney, 12, b.x, b.y, b.w, b.h)) ebY = true;
        }
        if (!ebX) e.x = Math.max(20, Math.min(MAP_W - 20, nex));
        if (!ebY) e.y = Math.max(20, Math.min(MAP_H - 20, ney));
        e.vx = ebX ? 0 : evx;
        e.vy = ebY ? 0 : evy;

        e.shootTimer -= dt;
        if (e.state === "fight" && e.shootTimer <= 0) {
          e.shootTimer = e.isBoss ? BOSS_SHOOT_INTERVAL : ENEMY_SHOOT_INTERVAL;
          const n = normalize(p.x - e.x, p.y - e.y);
          state.bullets.push({
            id: state.bulletId++,
            x: e.x,
            y: e.y,
            vx: n.x * (BULLET_SPEED * 0.75),
            vy: n.y * (BULLET_SPEED * 0.75),
            dist: 0,
            fromPlayer: false,
            alive: true,
          });
          playSound(state.audioCtx, state.muted, "shoot");
        }
      }

      // ── Bullets ──
      for (const b of state.bullets) {
        if (!b.alive) continue;
        b.x += b.vx;
        b.y += b.vy;
        b.dist += Math.sqrt(b.vx * b.vx + b.vy * b.vy);

        if (
          b.dist > BULLET_RANGE ||
          b.x < 0 ||
          b.x > MAP_W ||
          b.y < 0 ||
          b.y > MAP_H
        ) {
          b.alive = false;
          continue;
        }

        for (const bld of state.buildings) {
          if (circleRect(b.x, b.y, 3, bld.x, bld.y, bld.w, bld.h)) {
            b.alive = false;
            for (let i = 0; i < 3; i++) {
              state.particles.push({
                id: state.particleId++,
                x: b.x,
                y: b.y,
                vx: (Math.random() - 0.5) * 3,
                vy: (Math.random() - 0.5) * 3,
                life: 300,
                maxLife: 300,
                color: "#C8B89A",
                size: 3,
              });
            }
            break;
          }
        }
        if (!b.alive) continue;

        if (b.fromPlayer) {
          for (const e of state.enemies) {
            if (!e.alive) continue;
            if (dist(b.x, b.y, e.x, e.y) < (e.isBoss ? 20 : 14)) {
              b.alive = false;
              e.hp -= 20;
              e.flashTimer = 150;
              playSound(state.audioCtx, state.muted, "hit");
              for (let i = 0; i < 6; i++) {
                state.particles.push({
                  id: state.particleId++,
                  x: e.x,
                  y: e.y,
                  vx: (Math.random() - 0.5) * 5,
                  vy: (Math.random() - 0.5) * 5,
                  life: 400,
                  maxLife: 400,
                  color: "#FF5252",
                  size: 4,
                });
              }
              if (e.hp <= 0) {
                e.alive = false;
                if (e.isBoss) {
                  state.bossesDefeated++;
                  playSound(state.audioCtx, state.muted, "death");
                  for (let i = 0; i < 20; i++) {
                    state.particles.push({
                      id: state.particleId++,
                      x: e.x,
                      y: e.y,
                      vx: (Math.random() - 0.5) * 10,
                      vy: (Math.random() - 0.5) * 10,
                      life: 800,
                      maxLife: 800,
                      color: ["#FFD700", "#FF6D00", "#FF5252", "#76FF03"][
                        Math.floor(Math.random() * 4)
                      ],
                      size: 6,
                    });
                  }
                } else {
                  playSound(state.audioCtx, state.muted, "death");
                }
              }
              break;
            }
          }
        } else {
          if (dist(b.x, b.y, p.x, p.y) < 14) {
            b.alive = false;
            p.hp = Math.max(0, p.hp - 10);
            playSound(state.audioCtx, state.muted, "playerhit");
            for (let i = 0; i < 4; i++) {
              state.particles.push({
                id: state.particleId++,
                x: p.x,
                y: p.y,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                life: 300,
                maxLife: 300,
                color: "#FF8A80",
                size: 3,
              });
            }
          }
        }
      }

      state.bullets = state.bullets.filter((b) => b.alive);

      // ── Particles ──
      for (const pt of state.particles) {
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.vx *= 0.92;
        pt.vy *= 0.92;
        pt.life -= dt;
      }
      state.particles = state.particles.filter((pt) => pt.life > 0);

      // ── Dust ──
      for (const dp of state.dustParticles) {
        dp.x += dp.vx;
        dp.y += dp.vy;
        if (dp.x < 0) dp.x = MAP_W;
        if (dp.x > MAP_W) dp.x = 0;
        if (dp.y < 0) dp.y = MAP_H;
        if (dp.y > MAP_H) dp.y = 0;
      }

      // ── Level transition check ──
      if (!state.levelTransition) {
        const aliveEnemies = state.enemies.filter((e) => e.alive);
        if (aliveEnemies.length === 0) {
          // All enemies in this wave defeated — advance level
          state.levelTransition = true;
          state.levelTransitionTimer = 2500;
          state.currentLevel += 1;
          playSound(state.audioCtx, state.muted, "boss");
        }
      } else {
        state.levelTransitionTimer -= dt;
        if (state.levelTransitionTimer <= 0) {
          state.levelTransition = false;
          // Spawn new wave
          const cfg = getLevelConfig(state.currentLevel);
          const rand2 = seededRand(state.currentLevel * 137 + 42);
          const newEnemies: Enemy[] = [];
          let eid2 = state.enemies.length;
          // Regular grunts
          for (let i = 0; i < cfg.gruntCount; i++) {
            const angle = (i / cfg.gruntCount) * Math.PI * 2;
            const r = 600 + rand2() * 400;
            newEnemies.push({
              id: eid2++,
              x: Math.max(
                50,
                Math.min(MAP_W - 50, state.player.x + Math.cos(angle) * r),
              ),
              y: Math.max(
                50,
                Math.min(MAP_H - 50, state.player.y + Math.sin(angle) * r),
              ),
              vx: 0,
              vy: 0,
              hp: cfg.health,
              maxHp: cfg.health,
              state: "idle",
              isBoss: false,
              name: `Soldier L${state.currentLevel}-${i + 1}`,
              zone: "any",
              colorAccent: "#4CAF50",
              uniform: "#388E3C",
              shootTimer: cfg.shootInterval,
              stateTimer: 0,
              patrolTarget: { x: rand2() * MAP_W, y: rand2() * MAP_H },
              alive: true,
              flashTimer: 0,
            });
          }
          // Add a boss if this is a boss level
          if (cfg.bossLevel >= 0 && !state.allBossesDefeatedOnce) {
            const bd = BOSS_DATA[cfg.bossLevel];
            newEnemies.push({
              id: eid2++,
              x: bd.spawnX + (rand2() - 0.5) * 200,
              y: bd.spawnY + (rand2() - 0.5) * 200,
              vx: 0,
              vy: 0,
              hp: 200 + state.currentLevel * 20,
              maxHp: 200 + state.currentLevel * 20,
              state: "idle",
              isBoss: true,
              name: bd.name,
              zone: bd.zone,
              colorAccent: bd.colorAccent,
              uniform: bd.uniform,
              shootTimer: BOSS_SHOOT_INTERVAL,
              stateTimer: 0,
              patrolTarget: { x: bd.spawnX, y: bd.spawnY },
              alive: true,
              flashTimer: 0,
            });
          }
          state.enemies = newEnemies;
        }
      }

      // Track if all 4 bosses ever defeated
      if (!state.allBossesDefeatedOnce && state.bossesDefeated >= 4) {
        state.allBossesDefeatedOnce = true;
      }

      // ── Camera ──
      const shakeX = state.shakeTimer > 0 ? (Math.random() - 0.5) * 8 : 0;
      const shakeY = state.shakeTimer > 0 ? (Math.random() - 0.5) * 8 : 0;
      const targetCamX = p.x - vw / 2 + shakeX;
      const targetCamY = p.y - vh / 2 + shakeY;
      state.camera.x += (targetCamX - state.camera.x) * 0.12;
      state.camera.y += (targetCamY - state.camera.y) * 0.12;
      state.camera.x = Math.max(0, Math.min(MAP_W - vw, state.camera.x));
      state.camera.y = Math.max(0, Math.min(MAP_H - vh, state.camera.y));

      state.frameCount++;
    },
    [muted],
  );

  const renderGame = useCallback(
    (state: GameState, canvas: HTMLCanvasElement) => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const vw = canvas.width;
      const vh = canvas.height;
      const camX = state.camera.x;
      const camY = state.camera.y;
      const _hero = HEROES[selectedHeroRef.current];

      ctx.clearRect(0, 0, vw, vh);

      // Map
      drawMap(ctx, state, camX, camY, vw, vh);

      // Dust particles
      for (const dp of state.dustParticles) {
        ctx.save();
        ctx.globalAlpha = dp.alpha;
        ctx.fillStyle = "#C8AA80";
        ctx.beginPath();
        ctx.arc(dp.x - camX, dp.y - camY, dp.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Particles
      for (const pt of state.particles) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x - camX, pt.y - camY, pt.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Bullets
      for (const b of state.bullets) {
        ctx.beginPath();
        ctx.arc(b.x - camX, b.y - camY, b.fromPlayer ? 4 : 3, 0, Math.PI * 2);
        ctx.fillStyle = b.fromPlayer ? "#FFD600" : "#FF1744";
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(b.x - camX, b.y - camY);
        ctx.lineTo(b.x - camX - b.vx * 3, b.y - camY - b.vy * 3);
        ctx.strokeStyle = b.fromPlayer
          ? "rgba(255,214,0,0.4)"
          : "rgba(255,23,68,0.4)";
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Bombs
      const now = Date.now();
      for (const bomb of state.bombs) {
        const bsx = bomb.x - camX;
        const bsy = bomb.y - camY;
        if (bsx < -20 || bsx > vw + 20 || bsy < -20 || bsy > vh + 20) continue;
        ctx.save();
        // Bomb body
        ctx.fillStyle = "#222";
        ctx.beginPath();
        ctx.arc(bsx, bsy, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#555";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        // Fuse
        ctx.strokeStyle = "#8B4513";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(bsx, bsy - 8);
        ctx.quadraticCurveTo(bsx + 6, bsy - 14, bsx + 4, bsy - 18);
        ctx.stroke();
        // Spark
        if (bomb.landed) {
          const sparkActive = Math.sin(now * 0.025) > 0;
          if (sparkActive) {
            ctx.fillStyle = "#FF8C00";
            ctx.beginPath();
            ctx.arc(
              bsx + 4 + (Math.random() - 0.5) * 3,
              bsy - 18 + (Math.random() - 0.5) * 3,
              3,
              0,
              Math.PI * 2,
            );
            ctx.fill();
            ctx.fillStyle = "#FFFF00";
            ctx.beginPath();
            ctx.arc(bsx + 4, bsy - 18, 1.5, 0, Math.PI * 2);
            ctx.fill();
          }
          // Fuse timer ring
          const fuseRatio = bomb.fuseTimer / BOMB_FUSE_TIME;
          ctx.strokeStyle =
            fuseRatio > 0.5
              ? "#4CAF50"
              : fuseRatio > 0.25
                ? "#FF9800"
                : "#FF1744";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(
            bsx,
            bsy,
            12,
            -Math.PI / 2,
            -Math.PI / 2 + fuseRatio * Math.PI * 2,
          );
          ctx.stroke();
        }
        ctx.restore();
      }

      // ── Perspective Rendering: sort by depth (farthest first) ──
      const sortedEnemies = [...state.enemies.filter((e) => e.alive)].sort(
        (a, b) => {
          const da = Math.hypot(a.x - state.player.x, a.y - state.player.y);
          const db = Math.hypot(b.x - state.player.x, b.y - state.player.y);
          return db - da;
        },
      );
      for (const e of sortedEnemies) {
        const proj = worldToAlleyScreen(
          e.x,
          e.y,
          state.player.x,
          state.player.y,
          vw,
          vh,
        );
        if (!proj.visible) continue;
        ctx.save();
        ctx.translate(proj.sx, proj.sy);
        ctx.scale(proj.scale, proj.scale);
        drawEnemy(ctx, e, state.player.x, state.player.y, 0, 0);
        ctx.restore();
      }

      // NPCs in perspective
      for (const npc of state.npcs) {
        const proj = worldToAlleyScreen(
          npc.x,
          npc.y,
          state.player.x,
          state.player.y,
          vw,
          vh,
        );
        if (!proj.visible) continue;
        ctx.save();
        ctx.translate(proj.sx, proj.sy);
        ctx.scale(proj.scale, proj.scale);
        drawNPC(ctx, npc, 0, 0);
        ctx.restore();
      }

      // ── Player Hero (standing on ground) ──
      drawCharacter(
        ctx,
        vw / 2,
        vh * 0.76,
        _hero.bodyColor,
        _hero.legColor,
        _hero.accentColor,
        state.player.facing,
        state.player.isMoving,
        state.player.animFrame,
        0.8,
        selectedHeroRef.current,
      );

      // HUD
      drawHUD(ctx, state, _hero.name, _hero.bodyColor, vw, vh);

      // Mobile controls
      drawJoystick(ctx, state.joystick, vw, vh);
      drawFireButton(ctx, vw, vh, state.bombCount);

      // Mute button
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.beginPath();
      ctx.arc(vw - 28, 28, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = "16px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#FFF";
      ctx.fillText(state.muted ? "🔇" : "🔊", vw - 28, 28);
      ctx.textBaseline = "alphabetic";
      ctx.restore();

      // Controls hint
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.roundRect(vw / 2 - 120, vh - 50, 240, 24, 6);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.font = "10px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("WASD: Move | SPACE: Fire | B: Throw Bomb", vw / 2, vh - 34);
      ctx.restore();

      // Level transition overlay
      if (state.levelTransition) {
        const elapsed = 2500 - state.levelTransitionTimer;
        const progress = elapsed / 2500;
        const alpha =
          progress < 0.15
            ? progress / 0.15
            : progress > 0.75
              ? (1 - progress) / 0.25
              : 1;
        ctx.save();
        ctx.globalAlpha = Math.min(0.95, alpha * 0.95);
        ctx.fillStyle = "#060200";
        ctx.fillRect(0, 0, vw, vh);
        ctx.globalAlpha = alpha;
        // Glow border
        ctx.strokeStyle = "#FF8C00";
        ctx.lineWidth = 4;
        ctx.strokeRect(10, 10, vw - 20, vh - 20);
        // Dhurandhar title
        ctx.font = "bold 26px sans-serif";
        ctx.fillStyle = "#FF8C00";
        ctx.textAlign = "center";
        ctx.letterSpacing = "6px";
        ctx.fillText("✦ DHURANDHAR ✦", vw / 2, vh / 2 - 70);
        // Level text
        ctx.font = `bold ${Math.min(90, vw / 6)}px sans-serif`;
        ctx.fillStyle = "#FFD700";
        ctx.shadowColor = "#FF6D00";
        ctx.shadowBlur = 30;
        ctx.fillText(`LEVEL ${state.currentLevel}`, vw / 2, vh / 2 + 25);
        ctx.shadowBlur = 0;
        // Subtitle
        const levelSubtitles: Record<number, string> = {
          1: "City Streets — Find the Enemy",
          2: "The Hunt Begins",
          3: "Border Tension Rising",
          4: "Reinforcements Deployed",
          5: "WAR BREAKS OUT",
          6: "No Mercy — Fight On",
          7: "TOTAL WARFARE",
          8: "The Final Push",
          9: "FINAL BATTLE",
        };
        const subtitle =
          levelSubtitles[state.currentLevel] ||
          `Wave ${state.currentLevel} — Eliminate All Threats`;
        ctx.font = "bold 16px sans-serif";
        ctx.fillStyle = "#FF6B6B";
        ctx.fillText(subtitle, vw / 2, vh / 2 + 68);
        // Boss warning
        const bossCfg = getLevelConfig(state.currentLevel);
        if (bossCfg.bossLevel >= 0 && !state.allBossesDefeatedOnce) {
          ctx.font = "bold 18px sans-serif";
          ctx.fillStyle = "#FF1744";
          ctx.shadowColor = "#FF1744";
          ctx.shadowBlur = 12;
          ctx.fillText(
            `!! BOSS INCOMING: ${BOSS_DATA[bossCfg.bossLevel].name} !!`,
            vw / 2,
            vh / 2 + 102,
          );
          ctx.shadowBlur = 0;
        }
        if (state.allBossesDefeatedOnce) {
          ctx.font = "bold 14px sans-serif";
          ctx.fillStyle = "#69F0AE";
          ctx.fillText(
            "ALL BOSSES DEFEATED — SURVIVE ENDLESS WAVES!",
            vw / 2,
            vh / 2 + 102,
          );
        }
        ctx.restore();
      }
    },
    [],
  );

  const gameLoop = useCallback(
    (timestamp: number) => {
      if (phaseRef.current !== "playing") return;
      const canvas = canvasRef.current;
      const state = stateRef.current;
      if (!canvas || !state) return;

      const dt = Math.min(50, timestamp - state.lastTime);
      state.lastTime = timestamp;

      updateGame(state, dt, canvas);
      renderGame(state, canvas);

      // No final win — game continues with endless waves after bosses defeated
      if (state.player.hp <= 0) {
        if (bgMusicStopRef.current) {
          bgMusicStopRef.current();
          bgMusicStopRef.current = null;
        }
        setGamePhase("gameover");
        return;
      }

      animFrameRef.current = requestAnimationFrame(gameLoop);
    },
    [updateGame, renderGame],
  );

  const startGame = useCallback(() => {
    const state = initGame(selectedHeroRef.current);
    setGamePhase("playing");
    phaseRef.current = "playing";
    if (!muted && state.audioCtx) {
      bgMusicStopRef.current = startBgMusic(state.audioCtx, muted);
    }
    animFrameRef.current = requestAnimationFrame(gameLoop);
  }, [initGame, gameLoop, muted]);

  // Resize canvas
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      if (stateRef.current) {
        stateRef.current.joystick.baseY = canvas.height - 100;
      }
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // Keyboard
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (phaseRef.current !== "playing") return;
      const state = stateRef.current;
      if (!state) return;
      state.keysDown.add(e.key);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const state = stateRef.current;
      if (!state) return;
      state.keysDown.delete(e.key);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  // Touch events
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const state = stateRef.current;
      if (!state) return;
      const vw = canvas.width;
      const vh = canvas.height;

      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        // Mute button area
        if (
          Math.abs(t.clientX - (vw - 28)) < 24 &&
          Math.abs(t.clientY - 28) < 24
        ) {
          setMuted((m) => {
            const nm = !m;
            if (state) state.muted = nm;
            return nm;
          });
          continue;
        }
        // Fire button area
        if (
          Math.abs(t.clientX - (vw - 80)) < 55 &&
          Math.abs(t.clientY - (vh - 110)) < 55
        ) {
          mobileFireRef.current = true;
          continue;
        }
        // Bomb button area
        if (
          Math.abs(t.clientX - (vw - 155)) < 45 &&
          Math.abs(t.clientY - (vh - 90)) < 45
        ) {
          mobileBombRef.current = true;
          continue;
        }
        // Joystick (left side)
        if (t.clientX < vw / 2 && !state.joystick.active) {
          state.joystick.active = true;
          state.joystick.baseX = t.clientX;
          state.joystick.baseY = t.clientY;
          state.joystick.dx = 0;
          state.joystick.dy = 0;
          state.joystick.touchId = t.identifier;
        }
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const state = stateRef.current;
      if (!state) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (state.joystick.active && t.identifier === state.joystick.touchId) {
          const dx = t.clientX - state.joystick.baseX;
          const dy = t.clientY - state.joystick.baseY;
          const l = Math.sqrt(dx * dx + dy * dy);
          const maxR = 45;
          const clamped = l > maxR ? maxR / l : 1;
          state.joystick.dx = dx * clamped;
          state.joystick.dy = dy * clamped;
        }
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      const state = stateRef.current;
      if (!state) return;
      const vw = canvas.width;
      const vh = canvas.height;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (state.joystick.active && t.identifier === state.joystick.touchId) {
          state.joystick.active = false;
          state.joystick.dx = 0;
          state.joystick.dy = 0;
          state.joystick.touchId = null;
        }
        if (
          Math.abs(t.clientX - (vw - 80)) < 55 &&
          Math.abs(t.clientY - (vh - 110)) < 55
        ) {
          mobileFireRef.current = false;
        }
        if (
          Math.abs(t.clientX - (vw - 155)) < 45 &&
          Math.abs(t.clientY - (vh - 90)) < 45
        ) {
          mobileBombRef.current = false;
        }
      }
      if (e.touches.length === 0) {
        mobileFireRef.current = false;
        mobileBombRef.current = false;
      }
    };

    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("touchend", onTouchEnd, { passive: false });
    canvas.addEventListener("touchcancel", onTouchEnd, { passive: false });
    return () => {
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onTouchEnd);
      canvas.removeEventListener("touchcancel", onTouchEnd);
    };
  }, []);

  // Canvas click (mute toggle on desktop)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onClick = (e: MouseEvent) => {
      const vw = canvas.width;
      if (
        Math.abs(e.clientX - (vw - 28)) < 24 &&
        Math.abs(e.clientY - 28) < 24
      ) {
        setMuted((m) => {
          const nm = !m;
          if (stateRef.current) stateRef.current.muted = nm;
          return nm;
        });
      }
    };
    canvas.addEventListener("click", onClick);
    return () => canvas.removeEventListener("click", onClick);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      if (bgMusicStopRef.current) bgMusicStopRef.current();
    };
  }, []);

  // Render win/gameover overlays on canvas
  useEffect(() => {
    if (gamePhase !== "win" && gamePhase !== "gameover") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const vw = canvas.width;
    const vh = canvas.height;

    const fireworkParticles: Particle[] = [];
    let pid = 0;
    if (gamePhase === "win") {
      for (let i = 0; i < 60; i++) {
        fireworkParticles.push({
          id: pid++,
          x: vw / 2 + (Math.random() - 0.5) * vw,
          y: vh / 2 + (Math.random() - 0.5) * vh,
          vx: (Math.random() - 0.5) * 8,
          vy: (Math.random() - 0.5) * 8 - 2,
          life: 1500 + Math.random() * 1000,
          maxLife: 2500,
          color: ["#FFD700", "#FF6D00", "#76FF03", "#FF5252", "#40C4FF"][
            Math.floor(Math.random() * 5)
          ],
          size: 5 + Math.random() * 5,
        });
      }
    }

    let startTs = 0;
    const animate = (ts: number) => {
      if (!startTs) startTs = ts;
      ctx.fillStyle = "rgba(0,0,0,0.75)";
      ctx.fillRect(0, 0, vw, vh);

      if (gamePhase === "win") {
        for (const p of fireworkParticles) {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.05;
          p.life -= 16;
          ctx.save();
          ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        ctx.save();
        ctx.textAlign = "center";
        ctx.fillStyle = "#FFD700";
        ctx.font = "bold 48px sans-serif";
        ctx.fillText("🏆 MISSION COMPLETE!", vw / 2, vh / 2 - 60);
        ctx.font = "bold 28px sans-serif";
        ctx.fillStyle = "#76FF03";
        ctx.fillText("Country Saved! All Enemies Eliminated!", vw / 2, vh / 2);
        ctx.font = "18px sans-serif";
        ctx.fillStyle = "#FFF";
        ctx.fillText(
          "Dhurandhar has saved the nation! 🇮🇳",
          vw / 2,
          vh / 2 + 40,
        );
        ctx.restore();
      } else {
        ctx.save();
        ctx.textAlign = "center";
        ctx.fillStyle = "#FF1744";
        ctx.font = "bold 56px sans-serif";
        ctx.fillText("💀 MISSION FAILED", vw / 2, vh / 2 - 50);
        ctx.font = "24px sans-serif";
        ctx.fillStyle = "#EEE";
        ctx.fillText(
          "You have fallen. The country needs you!",
          vw / 2,
          vh / 2 + 10,
        );
        ctx.restore();
      }

      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillRect(0, vh - 22, vw, 22);
      ctx.font = "10px sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.textAlign = "center";
      ctx.fillText(
        "© 2026 Dhurandhar | Priyanka Sharma | priyankadsharma11@gmail.com | All Rights Reserved",
        vw / 2,
        vh - 7,
      );

      if (ts - startTs < 3000) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }, [gamePhase]);

  return (
    <div
      className="fixed inset-0 bg-black overflow-hidden"
      data-ocid="game.canvas_target"
    >
      <canvas
        ref={canvasRef}
        className="block w-full h-full"
        style={{ touchAction: "none" }}
      />

      {/* MENU OVERLAY */}
      {gamePhase === "menu" && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={{
            background:
              "linear-gradient(180deg, #0D1B2A 0%, #1B2838 40%, #2D1B00 100%)",
          }}
        >
          <div className="text-center px-6 max-w-lg">
            <div className="text-6xl mb-3">🎯</div>
            <h1
              className="text-5xl font-black tracking-wider mb-2"
              style={{
                color: "#FFD600",
                textShadow: "0 0 30px rgba(255,214,0,0.6), 0 2px 0 #8B6000",
                fontFamily: "serif",
              }}
            >
              DHURANDHAR
            </h1>
            <p
              className="text-sm mb-1"
              style={{ color: "rgba(255,255,255,0.55)" }}
            >
              Hunt down the 4 bosses and save your country
            </p>
            <p
              className="text-xs mb-6"
              style={{ color: "rgba(255,150,50,0.7)" }}
            >
              💣 NEW: Throw bombs to destroy buildings with enemies inside!
            </p>
            <button
              type="button"
              onClick={() => setGamePhase("select")}
              className="px-10 py-4 text-xl font-black rounded-xl tracking-widest"
              style={{
                background: "linear-gradient(135deg, #FFD600, #FF6D00)",
                color: "#000",
                boxShadow: "0 0 30px rgba(255,200,0,0.5)",
                border: "2px solid #FFD600",
              }}
            >
              ▶ START GAME
            </button>
            <div
              className="mt-6 text-xs"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              WASD / Joystick to move · SPACE / FIRE to shoot · B / 💣 to bomb
            </div>
          </div>
        </div>
      )}

      {/* CHARACTER SELECT */}
      {gamePhase === "select" && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={{
            background: "linear-gradient(180deg, #0D1B2A 0%, #1B3050 100%)",
          }}
        >
          <h2
            className="text-3xl font-black mb-8 tracking-widest"
            style={{ color: "#FFD600" }}
          >
            CHOOSE YOUR HERO
          </h2>
          <div className="flex gap-8 flex-wrap justify-center px-4">
            {HEROES.map((hero, idx) => (
              <button
                key={hero.name}
                type="button"
                onClick={() => {
                  setSelectedHero(idx);
                  selectedHeroRef.current = idx;
                  startGame();
                }}
                className="flex flex-col items-center gap-3 p-6 rounded-2xl transition-all"
                style={{
                  background:
                    selectedHero === idx
                      ? "rgba(255,214,0,0.15)"
                      : "rgba(255,255,255,0.06)",
                  border:
                    selectedHero === idx
                      ? "2px solid #FFD600"
                      : "2px solid rgba(255,255,255,0.12)",
                  minWidth: 160,
                }}
              >
                <div
                  className="w-20 h-24 rounded-xl flex items-center justify-center"
                  style={{ background: hero.bodyColor }}
                >
                  <span className="text-4xl">{idx === 0 ? "🧔" : "🕵️"}</span>
                </div>
                <div
                  className="font-black text-sm tracking-wide"
                  style={{ color: "#FFF" }}
                >
                  {hero.name}
                </div>
                <div
                  className="text-xs"
                  style={{ color: "rgba(255,255,255,0.5)" }}
                >
                  {hero.role}
                </div>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setGamePhase("menu")}
            className="mt-8 px-6 py-2 rounded-lg text-sm"
            style={{
              background: "rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.6)",
              border: "1px solid rgba(255,255,255,0.2)",
            }}
          >
            ← Back
          </button>
        </div>
      )}

      {/* GAME OVER OVERLAY */}
      {(gamePhase === "win" || gamePhase === "gameover") && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={{ pointerEvents: "auto" }}
        >
          <button
            type="button"
            onClick={() => {
              cancelAnimationFrame(animFrameRef.current);
              setGamePhase("menu");
            }}
            className="mt-64 px-10 py-4 text-xl font-black rounded-xl"
            style={{
              background: "linear-gradient(135deg, #FFD600, #FF6D00)",
              color: "#000",
              boxShadow: "0 0 30px rgba(255,200,0,0.5)",
            }}
          >
            PLAY AGAIN
          </button>
        </div>
      )}
    </div>
  );
}
