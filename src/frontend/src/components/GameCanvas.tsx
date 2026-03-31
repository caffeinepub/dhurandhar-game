import { useCallback, useEffect, useRef, useState } from "react";

type Phase = "menu" | "playing" | "win" | "gameover";
type HeroName = "humza" | "ajay";
type BgTheme = "morning" | "dusk" | "night" | "desert" | "final";

interface Entity {
  id: number;
  x: number;
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
  hideX: number;
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
  tx: number;
  timer: number;
  exploded: boolean;
  explodeTime: number;
}
interface Building {
  x: number;
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
  hx: number;
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
  bossWarning: string;
  bossWarningTimer: number;
  muted: boolean;
  idCounter: number;
  invincTimer: number;
}

const MAX_LEVEL = 20;
const WORLD_W = 4000;
const HERO_H = 110;
const ENEMY_H = 88;
const BOSS_H = 110;
const FLEE_DIST = 280;
const FIGHT_DIST = 180;
const BOSS_FIGHT_DIST = 240;
const MOVE_SPEED = 240;
const BULLET_SPEED = 480;
const BULLET_LIFE = 1.4;
const BOMB_RADIUS = 160;
const GROUND_RATIO = 0.78;

function getBgTheme(level: number): BgTheme {
  if (level <= 4) return "morning";
  if (level <= 8) return "dusk";
  if (level <= 12) return "night";
  if (level <= 16) return "desert";
  return "final";
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
  15: "BOSS: MAJOR IQBAL",
  16: "DESERT STORM",
  17: "FINAL ASSAULT",
  18: "TOTAL WARFARE",
  19: "LAST STAND",
  20: "BOSS: JAMEEL JAMALI",
};
const BOSS_AT_LEVEL: Record<number, string> = {
  5: "Rehman Dakait",
  10: "SP Aslam Choudhury",
  15: "Major Iqbal",
  20: "Jameel Jamali",
};
const BOSS_DEFS = [
  { name: "Rehman Dakait", color: "#8B0000" },
  { name: "SP Aslam Choudhury", color: "#00008B" },
  { name: "Major Iqbal", color: "#2F4F2F" },
  { name: "Jameel Jamali", color: "#8B6914" },
];
const BOSS_DIALOG = [
  "You cannot stop me, fool!",
  "I have the law on my side!",
  "You dare challenge the Major?",
  "Allah will not save you now!",
];
const NPC_HINTS = [
  "Rehman Dakait is hiding ahead!",
  "SP Aslam lurks in the shadows!",
  "Major Iqbal is deep in the city!",
  "Jameel Jamali is at the far end!",
];

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
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  } catch {}
}
function playHit(muted: boolean) {
  if (muted) return;
  try {
    const ctx = getAudioCtx();
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.5;
    const src = ctx.createBufferSource();
    const gain = ctx.createGain();
    src.buffer = buf;
    src.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(1.0, ctx.currentTime);
    src.start();
  } catch {}
}
function playExplosion(muted: boolean) {
  if (muted) return;
  try {
    const ctx = getAudioCtx();
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.4, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++)
      d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.3));
    const src = ctx.createBufferSource();
    const gain = ctx.createGain();
    src.buffer = buf;
    src.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.value = 1.5;
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

function seededRand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function generateBuildings(theme: BgTheme): Building[] {
  const rand = seededRand(42);
  const colorMap: Record<BgTheme, string[]> = {
    morning: ["#c8a060", "#b08050", "#d4a870", "#a07040"],
    dusk: ["#9a6040", "#7a4020", "#b07040", "#8a5030"],
    night: ["#1a1a2a", "#2a2a3a", "#1a2a3a", "#0a1a2a"],
    desert: ["#c8a870", "#b09858", "#d4b880", "#a08848"],
    final: ["#3a1010", "#2a0808", "#4a1818", "#1a0808"],
  };
  const signs = [
    "\u0926\u0941\u0915\u093e\u0928",
    "HOTEL",
    "CHAI",
    "786",
    "SHOP",
    "BAKERY",
    "MARKET",
    "HALAL",
  ];
  const colors = colorMap[theme];
  const buildings: Building[] = [];
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

function spawnLevelEnemies(
  level: number,
  idStart: number,
): { enemies: Entity[]; nextId: number } {
  const rand = seededRand(level * 17 + 99);
  const gruntCount = Math.min(3 + Math.floor(level * 0.4), 8);
  const hpBase = 25 + level * 8;
  const grunts: Entity[] = [];
  for (let i = 0; i < gruntCount; i++) {
    grunts.push({
      id: idStart + i,
      x: 400 + rand() * (WORLD_W - 800),
      hp: hpBase,
      maxHp: hpBase,
      vx: 0,
      facingLeft: true,
      dead: false,
      isBoss: false,
      name: "Enemy",
      shootCooldown: 0,
      alertTimer: 0,
      state: "patrol",
      hideX: 400 + rand() * (WORLD_W - 800),
    });
  }
  let nextId = idStart + gruntCount;
  const bossName = BOSS_AT_LEVEL[level];
  if (bossName) {
    const bossHp = 200 + level * 30;
    grunts.push({
      id: nextId,
      x: WORLD_W * 0.7 + (Math.random() - 0.5) * 400,
      hp: bossHp,
      maxHp: bossHp,
      vx: 0,
      facingLeft: true,
      dead: false,
      isBoss: true,
      name: bossName,
      shootCooldown: 0,
      alertTimer: 0,
      state: "patrol",
      hideX: WORLD_W * 0.6,
    });
    nextId++;
  }
  return { enemies: grunts, nextId };
}

function initGameState(hero: HeroName): GameState {
  const theme = getBgTheme(1);
  const buildings = generateBuildings(theme);
  const npcs = generateNPCs();
  const { enemies, nextId } = spawnLevelEnemies(1, 200);
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
    levelTitle: LEVEL_TITLES[1] ?? "LEVEL 1",
    bossWarning: "",
    bossWarningTimer: 0,
    muted: false,
    idCounter: nextId,
    invincTimer: 0,
  };
}

function heroShoot(s: GameState) {
  if (s.hShootCooldown > 0) return;
  s.hShootCooldown = 0.18;
  const vy = window.innerHeight * GROUND_RATIO - HERO_H / 2;
  const vx = s.hFacingLeft ? -BULLET_SPEED : BULLET_SPEED;
  s.bullets.push({
    id: s.idCounter++,
    x: s.hx - s.cameraX,
    y: vy,
    vx,
    vy: 0,
    fromPlayer: true,
    life: BULLET_LIFE,
  });
  playShoot(s.muted);
}
function throwBomb(s: GameState) {
  if (s.hBombs <= 0) return;
  s.hBombs--;
  const alive = s.enemies.filter((e) => !e.dead);
  let tx = s.hx + (s.hFacingLeft ? -300 : 300);
  if (alive.length > 0) {
    const nearest = alive.reduce((best, e) =>
      Math.abs(e.x - s.hx) < Math.abs(best.x - s.hx) ? e : best,
    );
    tx = nearest.x;
  }
  s.bombs.push({
    id: s.idCounter++,
    x: s.hx,
    tx,
    timer: 1.2,
    exploded: false,
    explodeTime: 0,
  });
}
function enemyShoot(s: GameState, e: Entity) {
  const gy = window.innerHeight * GROUND_RATIO;
  const vy = gy - (e.isBoss ? BOSS_H : ENEMY_H) / 2;
  const dx = s.hx - e.x;
  const speed = BULLET_SPEED * 0.7;
  s.bullets.push({
    id: s.idCounter++,
    x: e.x - s.cameraX,
    y: vy,
    vx: dx > 0 ? speed : -speed,
    vy: 0,
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
    const speed = 50 + Math.random() * 200;
    s.particles.push({
      id: s.idCounter++,
      x: sx,
      y: sy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 100,
      life: 0.4 + Math.random() * 0.6,
      maxLife: 1,
      color,
      size: 2 + Math.random() * 5,
    });
  }
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

function drawBackground(
  ctx: CanvasRenderingContext2D,
  vw: number,
  vh: number,
  groundY: number,
  camX: number,
  theme: BgTheme,
  buildings: Building[],
) {
  const sky = ctx.createLinearGradient(0, 0, 0, groundY);
  if (theme === "morning") {
    sky.addColorStop(0, "#1a6090");
    sky.addColorStop(0.5, "#f0a030");
    sky.addColorStop(1, "#e87020");
  } else if (theme === "dusk") {
    sky.addColorStop(0, "#0a1a40");
    sky.addColorStop(0.4, "#c04010");
    sky.addColorStop(1, "#e06020");
  } else if (theme === "night") {
    sky.addColorStop(0, "#050510");
    sky.addColorStop(0.6, "#0a0a20");
    sky.addColorStop(1, "#1a0808");
  } else if (theme === "desert") {
    sky.addColorStop(0, "#5a8ab8");
    sky.addColorStop(0.5, "#d8b878");
    sky.addColorStop(1, "#c8a060");
  } else {
    sky.addColorStop(0, "#1a0000");
    sky.addColorStop(0.4, "#8a1010");
    sky.addColorStop(1, "#c02020");
  }
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, vw, groundY);
  if (theme === "night" || theme === "final") {
    const rand = seededRand(77);
    for (let i = 0; i < 80; i++) {
      const sx = rand() * vw;
      const sy = rand() * groundY * 0.7;
      ctx.beginPath();
      ctx.arc(sx, sy, 1, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${0.4 + rand() * 0.6})`;
      ctx.fill();
    }
    const t = performance.now() / 1000;
    for (let i = 0; i < 4; i++) {
      const sx = (vw * (i + 1)) / 5;
      for (let j = 0; j < 5; j++) {
        const sy = groundY - j * 50 - 20;
        const alpha = (0.3 - j * 0.05) * (0.7 + Math.sin(t + i) * 0.3);
        ctx.beginPath();
        ctx.arc(
          sx + Math.sin(t * 0.5 + i + j) * 12,
          sy,
          18 + j * 8,
          0,
          Math.PI * 2,
        );
        ctx.fillStyle = `rgba(40,40,40,${alpha})`;
        ctx.fill();
      }
    }
  }
  if (theme === "final") {
    const t = performance.now() / 1000;
    for (let i = 0; i < 3; i++) {
      const alpha = Math.max(0, Math.sin(t * 3 + i * 2.1) * 0.3);
      const bx = vw * (0.2 + i * 0.3);
      const by = groundY * 0.5;
      const grad = ctx.createRadialGradient(bx, by, 0, bx, by, 80);
      grad.addColorStop(0, `rgba(255,180,0,${alpha})`);
      grad.addColorStop(1, "rgba(255,0,0,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(bx - 80, by - 80, 160, 160);
    }
  }
  const farColors: Record<BgTheme, string[]> = {
    morning: ["#c8a060", "#b08050"],
    dusk: ["#5a2010", "#4a1808"],
    night: ["#0a0a18", "#080810"],
    desert: ["#c0a858", "#b09848"],
    final: ["#3a0808", "#2a0404"],
  };
  for (let i = 0; i < 14; i++) {
    const bx =
      ((((i * 170 - camX * 0.06) % (vw + 200)) + vw + 200) % (vw + 200)) - 100;
    const bh = 90 + (i % 4) * 45;
    ctx.fillStyle = farColors[theme][i % 2];
    ctx.fillRect(bx, groundY - bh, 150, bh);
    const winColor =
      theme === "night"
        ? "rgba(255,180,0,0.6)"
        : theme === "final"
          ? "rgba(255,60,0,0.5)"
          : "rgba(255,220,130,0.4)";
    ctx.fillStyle = winColor;
    for (let wy = groundY - bh + 14; wy < groundY - 14; wy += 20)
      for (let wx = bx + 8; wx < bx + 140; wx += 22)
        ctx.fillRect(wx, wy, 12, 12);
  }
  const midColors: Record<BgTheme, string[]> = {
    morning: ["#e8b870", "#d09858"],
    dusk: ["#7a3020", "#6a2010"],
    night: ["#141428", "#101020"],
    desert: ["#d4b870", "#c0a860"],
    final: ["#4a1010", "#380808"],
  };
  for (let i = 0; i < 10; i++) {
    const bx =
      ((((i * 220 + 80 - camX * 0.14) % (vw + 260)) + vw + 260) % (vw + 260)) -
      130;
    const bh = 120 + (i % 3) * 65;
    ctx.fillStyle = midColors[theme][i % 2];
    ctx.fillRect(bx, groundY - bh, 180, bh);
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.fillRect(bx + 162, groundY - bh, 18, bh);
    const winClr =
      theme === "night"
        ? "rgba(255,140,0,0.65)"
        : theme === "final"
          ? "rgba(255,40,0,0.6)"
          : "rgba(255,220,100,0.5)";
    ctx.fillStyle = winClr;
    for (let wy = groundY - bh + 16; wy < groundY - 16; wy += 24)
      for (let wx = bx + 12; wx < bx + 168; wx += 26)
        ctx.fillRect(wx, wy, 14, 14);
    if (i % 3 === 0) {
      ctx.fillStyle = "rgba(170,40,40,0.8)";
      ctx.fillRect(bx + 10, groundY - 34, 160, 26);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 10px Arial";
      ctx.textAlign = "center";
      const signs = [
        "\u0926\u0941\u0915\u093e\u0928",
        "HOTEL",
        "CHAI",
        "786",
        "MARKET",
      ];
      ctx.fillText(signs[i % signs.length], bx + 90, groundY - 15);
    }
  }
  const nearC: Record<BgTheme, string> = {
    morning: "#a07840",
    dusk: "#3a1008",
    night: "#080818",
    desert: "#a09050",
    final: "#280404",
  };
  for (let i = 0; i < 5; i++) {
    const bx =
      ((((i * 320 + 160 - camX * 0.22) % (vw + 320)) + vw + 320) % (vw + 320)) -
      160;
    const bh = 150 + (i % 2) * 90;
    ctx.fillStyle = nearC[theme];
    ctx.fillRect(bx, groundY - bh, 70, bh);
  }
  for (const b of buildings) {
    const sx = b.x - camX;
    if (sx < -b.w - 5 || sx > vw + 5) continue;
    ctx.fillStyle = b.color;
    ctx.fillRect(sx, groundY - b.h, b.w, b.h);
    if (b.sign) {
      ctx.fillStyle = "rgba(120,20,20,0.8)";
      ctx.fillRect(sx + 4, groundY - 32, b.w - 8, 22);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 9px Arial";
      ctx.textAlign = "center";
      ctx.fillText(b.sign, sx + b.w / 2, groundY - 16);
    }
    if (b.onFire) drawFire(ctx, sx + b.w / 2, groundY - b.h, b.w);
  }
  const groundGrad = ctx.createLinearGradient(0, groundY, 0, vh);
  if (theme === "night" || theme === "final") {
    groundGrad.addColorStop(0, "#1a1010");
    groundGrad.addColorStop(1, "#0a0808");
  } else if (theme === "desert") {
    groundGrad.addColorStop(0, "#c8a860");
    groundGrad.addColorStop(1, "#a08840");
  } else {
    groundGrad.addColorStop(0, "#6a5030");
    groundGrad.addColorStop(1, "#3a2810");
  }
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, groundY, vw, vh - groundY);
  ctx.strokeStyle =
    theme === "night" || theme === "final"
      ? "rgba(255,255,255,0.12)"
      : "rgba(255,255,255,0.18)";
  ctx.lineWidth = 3;
  ctx.setLineDash([40, 30]);
  ctx.beginPath();
  ctx.moveTo(0, groundY + (vh - groundY) * 0.4);
  ctx.lineTo(vw, groundY + (vh - groundY) * 0.4);
  ctx.stroke();
  ctx.setLineDash([]);
  const haze = ctx.createLinearGradient(0, groundY - 50, 0, groundY);
  haze.addColorStop(0, "rgba(0,0,0,0)");
  haze.addColorStop(
    1,
    theme === "night"
      ? "rgba(40,10,0,0.4)"
      : theme === "final"
        ? "rgba(60,0,0,0.5)"
        : "rgba(100,60,20,0.3)",
  );
  ctx.fillStyle = haze;
  ctx.fillRect(0, groundY - 50, vw, 50);
}

function drawCharFallback(
  ctx: CanvasRenderingContext2D,
  cx: number,
  gy: number,
  facingLeft: boolean,
  isHero: boolean,
  isBoss: boolean,
  alpha = 1,
) {
  ctx.save();
  ctx.globalAlpha = alpha;
  if (facingLeft) {
    ctx.scale(-1, 1);
    // biome-ignore lint/style/noParameterAssign: mirror
    cx = -cx;
  }
  const h = isHero || isBoss ? HERO_H : ENEMY_H;
  const s = h / 110;
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.ellipse(cx, gy, 24 * s, 6 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#2a1a0a";
  ctx.fillRect(cx - 14 * s, gy - 12 * s, 11 * s, 12 * s);
  ctx.fillRect(cx + 3 * s, gy - 12 * s, 11 * s, 12 * s);
  ctx.fillStyle = isHero ? "#1a3a8a" : isBoss ? "#5a1010" : "#2a2a2a";
  ctx.fillRect(cx - 16 * s, gy - 50 * s, 14 * s, 40 * s);
  ctx.fillRect(cx + 2 * s, gy - 50 * s, 14 * s, 40 * s);
  ctx.fillRect(cx - 18 * s, gy - 86 * s, 36 * s, 38 * s);
  ctx.fillRect(cx - 32 * s, gy - 86 * s, 14 * s, 26 * s);
  ctx.fillRect(cx + 18 * s, gy - 86 * s, 14 * s, 26 * s);
  ctx.fillStyle = "#b08060";
  ctx.beginPath();
  ctx.ellipse(cx - 25 * s, gy - 60 * s, 8 * s, 7 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + 25 * s, gy - 60 * s, 8 * s, 7 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#444";
  ctx.fillRect(cx + 18 * s, gy - 76 * s, 26 * s, 6 * s);
  ctx.fillStyle = "#b08060";
  ctx.fillRect(cx - 6 * s, gy - 96 * s, 12 * s, 10 * s);
  ctx.beginPath();
  ctx.ellipse(cx, gy - 108 * s, 16 * s, 18 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1a0a00";
  ctx.beginPath();
  ctx.ellipse(cx, gy - 118 * s, 16 * s, 9 * s, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(cx - 16 * s, gy - 118 * s, 32 * s, 7 * s);
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.ellipse(cx - 5 * s, gy - 110 * s, 4 * s, 3.5 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + 5 * s, gy - 110 * s, 4 * s, 3.5 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1a0800";
  ctx.beginPath();
  ctx.arc(cx - 5 * s, gy - 110 * s, 2.5 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + 5 * s, gy - 110 * s, 2.5 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawNPC(
  ctx: CanvasRenderingContext2D,
  cx: number,
  gy: number,
  type: NPC["type"],
) {
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.beginPath();
  ctx.ellipse(cx, gy, 16, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  if (type === "soldier") {
    ctx.fillStyle = "#3a3820";
    ctx.fillRect(cx - 7, gy - 10, 6, 10);
    ctx.fillRect(cx + 1, gy - 10, 6, 10);
    ctx.fillStyle = "#4a5e2a";
    ctx.fillRect(cx - 9, gy - 40, 18, 30);
    ctx.fillRect(cx - 16, gy - 40, 9, 22);
    ctx.fillRect(cx + 7, gy - 40, 9, 22);
    ctx.fillStyle = "#d4a56a";
    ctx.beginPath();
    ctx.arc(cx, gy - 50, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#3a4e1a";
    ctx.fillRect(cx - 10, gy - 60, 20, 10);
  } else if (type === "woman") {
    ctx.fillStyle = "#ff6020";
    ctx.fillRect(cx - 8, gy - 40, 16, 40);
    ctx.fillStyle = "#cc4010";
    ctx.fillRect(cx - 10, gy - 62, 20, 24);
    ctx.fillRect(cx - 16, gy - 62, 8, 18);
    ctx.fillRect(cx + 8, gy - 62, 8, 18);
    ctx.fillStyle = "#d4956a";
    ctx.beginPath();
    ctx.arc(cx, gy - 72, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#cc0000";
    ctx.beginPath();
    ctx.arc(cx, gy - 76, 2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = "#7a4010";
    ctx.fillRect(cx - 6, gy - 10, 5, 10);
    ctx.fillRect(cx + 1, gy - 10, 5, 10);
    ctx.fillStyle = "#e87020";
    ctx.fillRect(cx - 10, gy - 40, 20, 30);
    ctx.fillRect(cx - 15, gy - 40, 7, 20);
    ctx.fillRect(cx + 8, gy - 40, 7, 20);
    ctx.fillStyle = "#c4856a";
    ctx.beginPath();
    ctx.arc(cx, gy - 50, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "white";
    ctx.fillRect(cx - 9, gy - 60, 18, 8);
    ctx.beginPath();
    ctx.ellipse(cx, gy - 60, 9, 4, 0, Math.PI, 0);
    ctx.fill();
  }
  ctx.restore();
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

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState | null>(null);
  const [phase, setPhase] = useState<Phase>("menu");
  const [hero, setHero] = useState<HeroName>("humza");
  const [muted, setMuted] = useState(false);
  const [imgsLoaded, setImgsLoaded] = useState(false);
  const keysRef = useRef<Set<string>>(new Set());
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const joystickRef = useRef({ active: false, cx: 0, cy: 0, dx: 0, dy: 0 });
  const imgsRef = useRef<Record<string, HTMLImageElement | null>>({
    humza: null,
    ajay: null,
    rehman: null,
    sp_aslam: null,
    major_iqbal: null,
    jameel: null,
    grunt: null,
  });

  useEffect(() => {
    const sources: Record<string, string> = {
      humza: "/assets/generated/humza-realistic-transparent.dim_200x340.png",
      ajay: "/assets/generated/ajay-realistic-transparent.dim_200x340.png",
      rehman: "/assets/generated/rehman-realistic-transparent.dim_200x340.png",
      sp_aslam:
        "/assets/generated/sp-aslam-realistic-transparent.dim_200x340.png",
      major_iqbal:
        "/assets/generated/major-iqbal-realistic-transparent.dim_200x340.png",
      jameel: "/assets/generated/jameel-realistic-transparent.dim_200x340.png",
      grunt: "/assets/generated/grunt-realistic-transparent.dim_200x340.png",
    };
    let loaded = 0;
    const total = Object.keys(sources).length;
    for (const [key, src] of Object.entries(sources)) {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        imgsRef.current[key] = img;
        loaded++;
        if (loaded === total) setImgsLoaded(true);
      };
      img.onerror = () => {
        loaded++;
        if (loaded === total) setImgsLoaded(true);
      };
    }
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
    const joy = joystickRef.current;
    let mx = 0;
    if (keys.has("KeyA") || keys.has("ArrowLeft")) mx -= 1;
    if (keys.has("KeyD") || keys.has("ArrowRight")) mx += 1;
    if (joy.active) mx += joy.dx;
    mx = Math.max(-1, Math.min(1, mx));
    s.hvx = mx * MOVE_SPEED;
    if (mx < 0) s.hFacingLeft = true;
    if (mx > 0) s.hFacingLeft = false;
    s.hx = Math.max(0, Math.min(WORLD_W - 40, s.hx + s.hvx * dt));
    s.cameraX = Math.max(0, Math.min(WORLD_W - vw, s.hx - vw / 2));
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
    if ((keys.has("Space") || keys.has("Enter")) && s.hShootCooldown <= 0)
      heroShoot(s);
    if (keys.has("KeyB") && s.hBombs > 0) {
      keys.delete("KeyB");
      throwBomb(s);
    }
    const lsm = 1 + (s.level - 1) * 0.08;
    for (const e of s.enemies) {
      if (e.dead) continue;
      e.shootCooldown = Math.max(0, e.shootCooldown - dt);
      e.alertTimer = Math.max(0, e.alertTimer - dt);
      const dx = s.hx - e.x;
      const dist = Math.abs(dx);
      const fightDist = e.isBoss ? BOSS_FIGHT_DIST : FIGHT_DIST;
      const speed = (e.isBoss ? 110 : 150) * lsm;
      if (dist < fightDist) {
        e.state = "fight";
        e.vx = e.isBoss ? (dx > 0 ? speed * 0.3 : -speed * 0.3) : 0;
        if (e.shootCooldown <= 0) {
          enemyShoot(s, e);
          e.shootCooldown = e.isBoss ? 0.6 : 1.2 + Math.random();
        }
        e.alertTimer = 0.5;
      } else if (dist < FLEE_DIST) {
        e.state = "flee";
        const fleeDir = dx > 0 ? -1 : 1;
        e.hideX = Math.max(
          50,
          Math.min(WORLD_W - 50, e.x + fleeDir * (200 + Math.random() * 300)),
        );
        e.vx = fleeDir * speed * 1.2;
        e.alertTimer = 0.5;
      } else {
        e.state = "patrol";
        const dToHide = e.hideX - e.x;
        if (Math.abs(dToHide) > 20) {
          e.vx = dToHide > 0 ? speed * 0.4 : -speed * 0.4;
        } else {
          if (Math.random() < 0.008)
            e.hideX = 100 + Math.random() * (WORLD_W - 200);
          e.vx = 0;
        }
      }
      e.facingLeft = e.vx < 0 ? true : e.vx > 0 ? false : dx < 0;
      e.x = Math.max(50, Math.min(WORLD_W - 50, e.x + e.vx * dt));
    }
    for (const b of s.bullets) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
    }
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
        for (const bld of s.buildings) {
          if (Math.abs(bomb.tx - (bld.x + bld.w / 2)) < BOMB_RADIUS * 1.5) {
            bld.onFire = true;
            bld.fireTimer = 6;
          }
        }
      }
    }
    s.bombs = s.bombs.filter((b) => !(b.exploded && b.explodeTime > 2));
    for (const b of s.buildings) {
      if (b.onFire) {
        b.fireTimer -= dt;
        if (b.fireTimer <= 0) b.onFire = false;
      }
    }
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
    for (const p of s.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      p.vy += 200 * dt;
    }
    s.particles = s.particles.filter((p) => p.life > 0);
    const aliveEnemies = s.enemies.filter((e) => !e.dead);
    if (aliveEnemies.length === 0 && s.levelSplash <= 0) {
      if (s.level >= MAX_LEVEL) {
        s.phase = "win";
        return;
      }
      s.level++;
      s.levelTitle = LEVEL_TITLES[s.level] ?? `LEVEL ${s.level}`;
      s.levelSplash = 2.5;
      s.buildings = generateBuildings(getBgTheme(s.level));
      s.hx = 200;
      s.cameraX = 0;
      s.hhp = Math.min(s.maxHhp, s.hhp + 40);
      const { enemies, nextId } = spawnLevelEnemies(s.level, s.idCounter);
      s.enemies = enemies;
      s.idCounter = nextId;
      s.bullets = [];
      s.bombs = [];
      const bossName = BOSS_AT_LEVEL[s.level];
      if (bossName) {
        s.bossWarning = `\u26A0 BOSS INCOMING: ${bossName.toUpperCase()} \u26A0`;
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
        (Math.random() - 0.5) * s.screenShake * 14,
        (Math.random() - 0.5) * s.screenShake * 14,
      );
    }
    const groundY = vh * GROUND_RATIO;
    const theme = getBgTheme(s.level);
    drawBackground(ctx, vw, vh, groundY, s.cameraX, theme, s.buildings);
    for (const npc of s.npcs) {
      const nsx = npc.x - s.cameraX;
      if (nsx < -50 || nsx > vw + 50) continue;
      drawNPC(ctx, nsx, groundY, npc.type);
      if (npc.showBubble) drawSpeechBubble(ctx, nsx, groundY - 80, npc.hint);
    }
    for (const e of s.enemies) {
      if (e.dead) continue;
      const esx = e.x - s.cameraX;
      if (esx < -120 || esx > vw + 120) continue;
      if (e.isBoss) {
        const bossIdx = BOSS_DEFS.findIndex((b) => b.name === e.name);
        const imgKeys = ["rehman", "sp_aslam", "major_iqbal", "jameel"];
        const bossImg = imgsRef.current[imgKeys[bossIdx] ?? ""];
        const bw = 80;
        const bh = BOSS_H * 1.3;
        if (bossImg) {
          ctx.save();
          if (e.facingLeft) {
            ctx.scale(-1, 1);
            ctx.drawImage(bossImg, -(esx + bw / 2), groundY - bh, bw, bh);
          } else {
            ctx.drawImage(bossImg, esx - bw / 2, groundY - bh, bw, bh);
          }
          ctx.restore();
        } else {
          drawCharFallback(ctx, esx, groundY, e.facingLeft, false, true);
        }
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(esx - 40, groundY - bh - 14, 80, 8);
        ctx.fillStyle = "#ff2200";
        ctx.fillRect(esx - 40, groundY - bh - 14, 80 * (e.hp / e.maxHp), 8);
        ctx.strokeStyle = "#ffd700";
        ctx.lineWidth = 1;
        ctx.strokeRect(esx - 40, groundY - bh - 14, 80, 8);
        ctx.fillStyle = "white";
        ctx.font = "bold 9px Arial";
        ctx.textAlign = "center";
        ctx.fillText(e.name, esx, groundY - bh - 18);
        if (e.alertTimer > 0 && bossIdx >= 0)
          drawSpeechBubble(
            ctx,
            esx,
            groundY - bh - 22,
            BOSS_DIALOG[bossIdx] ?? "You won't beat me!",
          );
      } else {
        const gruntImg = imgsRef.current.grunt;
        const ew = 48;
        const eh = ENEMY_H;
        if (gruntImg) {
          ctx.save();
          if (e.facingLeft) {
            ctx.scale(-1, 1);
            ctx.drawImage(gruntImg, -(esx + ew / 2), groundY - eh, ew, eh);
          } else {
            ctx.drawImage(gruntImg, esx - ew / 2, groundY - eh, ew, eh);
          }
          ctx.restore();
        } else {
          drawCharFallback(ctx, esx, groundY, e.facingLeft, false, false);
        }
        if (e.alertTimer > 0) {
          ctx.fillStyle = "#ff0";
          ctx.font = "14px Arial";
          ctx.textAlign = "center";
          ctx.fillText("!", esx, groundY - ENEMY_H - 10);
        }
      }
    }
    const heroSx = s.hx - s.cameraX;
    const heroAlpha =
      s.invincTimer > 0 ? (Math.sin(s.invincTimer * 20) > 0 ? 0.4 : 1) : 1;
    const heroImg = imgsRef.current[s.hero === "humza" ? "humza" : "ajay"];
    const hw = 80;
    const hh = HERO_H * 1.2;
    if (heroImg) {
      ctx.save();
      ctx.globalAlpha = heroAlpha;
      if (s.hFacingLeft) {
        ctx.scale(-1, 1);
        ctx.drawImage(heroImg, -(heroSx + hw / 2), groundY - hh, hw, hh);
      } else {
        ctx.drawImage(heroImg, heroSx - hw / 2, groundY - hh, hw, hh);
      }
      ctx.restore();
    } else {
      drawCharFallback(
        ctx,
        heroSx,
        groundY,
        s.hFacingLeft,
        true,
        false,
        heroAlpha,
      );
    }
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
    for (const bomb of s.bombs) {
      const bsx = bomb.x - s.cameraX;
      if (!bomb.exploded) {
        ctx.font = "18px Arial";
        ctx.textAlign = "center";
        ctx.fillText("\uD83D\uDCA3", bsx, groundY - 10);
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
    ctx.restore();
    drawHUD(ctx, vw, vh, s);
    drawMinimap(ctx, vw, vh, s);
    if (s.levelSplash > 0) {
      const alpha = Math.min(s.levelSplash, 1);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "rgba(0,0,0,0.8)";
      ctx.fillRect(0, vh / 2 - 80, vw, 160);
      ctx.fillStyle = "#ffd700";
      ctx.font = `bold ${Math.floor(vw * 0.09)}px serif`;
      ctx.textAlign = "center";
      ctx.shadowBlur = 30;
      ctx.shadowColor = "#ff8800";
      ctx.fillText(`LEVEL ${s.level}`, vw / 2, vh / 2 - 10);
      ctx.font = `bold ${Math.floor(vw * 0.038)}px serif`;
      ctx.fillStyle = "#ff9900";
      ctx.shadowBlur = 0;
      ctx.fillText(s.levelTitle, vw / 2, vh / 2 + 40);
      ctx.globalAlpha = 1;
    }
    if (s.bossWarningTimer > 0) {
      const alpha = Math.min(s.bossWarningTimer, 1);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "rgba(100,0,0,0.88)";
      ctx.fillRect(0, vh * 0.15, vw, 60);
      ctx.fillStyle = "#ff5555";
      ctx.font = `bold ${Math.floor(vw * 0.048)}px serif`;
      ctx.textAlign = "center";
      ctx.shadowBlur = 20;
      ctx.shadowColor = "#ff0000";
      ctx.fillText(s.bossWarning, vw / 2, vh * 0.15 + 42);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = "white";
    ctx.font = "11px Arial";
    ctx.textAlign = "center";
    ctx.fillText(
      "\u00A9 Priyanka Sharma | priyankadsharma11@gmail.com",
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
    ctx.fillStyle = "rgba(0,0,0,0.72)";
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
    ctx.fillStyle = "#ffd700";
    ctx.font = `bold ${Math.floor(vw * 0.038)}px serif`;
    ctx.textAlign = "center";
    ctx.shadowBlur = 8;
    ctx.shadowColor = "#ff8800";
    ctx.fillText("DHURANDHAR", vw / 2, 20);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#ff9900";
    ctx.font = "11px Arial";
    ctx.fillText(
      `LEVEL ${s.level}/${MAX_LEVEL} \u2014 ${s.levelTitle}`,
      vw / 2,
      38,
    );
    ctx.textAlign = "right";
    ctx.fillStyle = "white";
    ctx.font = "bold 11px Arial";
    ctx.fillText(
      `Enemies: ${s.enemies.filter((e) => !e.dead && !e.isBoss).length}  Bosses: ${s.enemies.filter((e) => !e.dead && e.isBoss).length}`,
      vw - 10,
      20,
    );
    ctx.fillStyle = "#ffd700";
    ctx.fillText(`\uD83D\uDCA3 x${s.hBombs}  Score: ${s.score}`, vw - 10, 38);
    ctx.fillStyle = "rgba(0,0,0,0.85)";
    ctx.fillRect(0, vh - 22, vw, 22);
    ctx.fillStyle = "#ffd700";
    ctx.font = "9px Arial";
    ctx.textAlign = "center";
    ctx.fillText(
      "\u00A9 2026 Dhurandhar | Priyanka Sharma | priyankadsharma11@gmail.com | All Rights Reserved",
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
    const mm = { x: vw - 158, y: vh - 180, w: 148, h: 132 };
    ctx.fillStyle = "rgba(0,0,0,0.72)";
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
    const bg = ctx.createLinearGradient(0, 0, 0, vh);
    bg.addColorStop(0, "#1a1050");
    bg.addColorStop(0.5, "#c87030");
    bg.addColorStop(1, "#3a2010");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, vw, vh);
    ctx.fillStyle = "#2a1808";
    for (let i = 0; i < 16; i++) {
      const bx = i * (vw / 16);
      const bh = 80 + (i % 5) * 40;
      ctx.fillRect(bx, vh * 0.6 - bh, vw / 16 - 2, bh + vh * 0.4);
    }
    ctx.fillStyle = "rgba(0,0,0,0.45)";
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
      ctx.fillText(
        "Save the Country \u2014 20 Levels of Battle",
        vw / 2,
        vh * 0.36,
      );
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.font = "13px Arial";
      ctx.fillText(
        "\u00A9 2026 Priyanka Sharma | priyankadsharma11@gmail.com",
        vw / 2,
        vh * 0.42,
      );
    } else if (phase === "win") {
      ctx.fillStyle = "#ffd700";
      ctx.font = `bold ${Math.floor(vw * 0.07)}px serif`;
      ctx.textAlign = "center";
      ctx.shadowBlur = 30;
      ctx.shadowColor = "#ff8800";
      ctx.fillText("DHURANDHAR COMPLETE!", vw / 2, vh * 0.27);
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#00ff88";
      ctx.font = `${Math.floor(vw * 0.038)}px serif`;
      ctx.fillText(
        "Country Saved! All 4 Villains Defeated!",
        vw / 2,
        vh * 0.38,
      );
      const ss = stateRef.current;
      if (ss) {
        ctx.fillStyle = "white";
        ctx.font = "17px Arial";
        ctx.fillText(
          `Final Score: ${ss.score}  |  Bosses: ${ss.totalBossesKilled}`,
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
      "\u00A9 2026 Dhurandhar | Priyanka Sharma | priyankadsharma11@gmail.com | All Rights Reserved",
      vw / 2,
      vh - 6,
    );
  }, [phase]);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      <canvas
        ref={canvasRef}
        className="block w-full h-full"
        onClick={handleCanvasTap}
        onKeyDown={() => {}}
        style={{ touchAction: "none" }}
      />
      {!imgsLoaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-50">
          <div className="text-yellow-400 font-bold text-2xl animate-pulse">
            Loading Characters...
          </div>
          <div className="text-yellow-600 text-sm mt-2">
            Preparing Dhurandhar
          </div>
        </div>
      )}
      {phase === "menu" && imgsLoaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-14 pointer-events-none">
          <div className="pointer-events-auto flex flex-col items-center gap-5">
            <div className="flex gap-4">
              <button
                type="button"
                data-ocid="game.hero_humza.toggle"
                onClick={() => setHero("humza")}
                className={`px-5 py-3 rounded-lg font-bold text-base transition-all border-2 ${hero === "humza" ? "bg-yellow-500 text-black border-yellow-300 scale-105" : "bg-black/60 text-yellow-400 border-yellow-600 hover:bg-black/80"}`}
              >
                Humza Ali Mazari
              </button>
              <button
                type="button"
                data-ocid="game.hero_ajay.toggle"
                onClick={() => setHero("ajay")}
                className={`px-5 py-3 rounded-lg font-bold text-base transition-all border-2 ${hero === "ajay" ? "bg-yellow-500 text-black border-yellow-300 scale-105" : "bg-black/60 text-yellow-400 border-yellow-600 hover:bg-black/80"}`}
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
            <p className="text-yellow-600 text-sm text-center">
              A/D or Arrow Keys to move \u2022 Space to fire \u2022 B for bomb
              <br />
              <span className="text-yellow-500">
                20 Levels \u2022 4 Bosses \u2022 Save the Country!
              </span>
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
            className="absolute bottom-10 left-6 w-28 h-28 rounded-full border-2 border-yellow-500/40 bg-black/30 flex items-center justify-center"
            onTouchStart={handleJoystickStart}
            onTouchMove={handleJoystickMove}
            onTouchEnd={handleJoystickEnd}
            style={{ touchAction: "none" }}
          >
            <div className="w-12 h-12 rounded-full bg-yellow-500/30 border border-yellow-400/50" />
          </div>
          <div className="absolute bottom-10 right-4 flex flex-col gap-3">
            <button
              type="button"
              data-ocid="game.bomb.primary_button"
              onTouchStart={(e) => {
                e.preventDefault();
                handleBombBtn();
              }}
              className="w-16 h-16 rounded-full bg-orange-700/80 border-2 border-orange-400 text-white font-bold text-2xl flex items-center justify-center active:scale-90"
            >
              \uD83D\uDCA3
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
            data-ocid="game.mute.toggle"
            onClick={handleMuteBtn}
            className="absolute top-14 right-2 w-9 h-9 bg-black/50 rounded-full text-lg flex items-center justify-center"
          >
            {muted ? "\uD83D\uDD07" : "\uD83D\uDD0A"}
          </button>
        </>
      )}
    </div>
  );
}
