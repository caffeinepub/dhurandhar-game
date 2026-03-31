import { useCallback, useEffect, useRef, useState } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

type Phase = "menu" | "playing" | "win" | "gameover";
type HeroName = "humza" | "ajay";

interface Vec2 {
  x: number;
  y: number;
}

interface Entity {
  id: number;
  x: number; // world coords
  y: number;
  hp: number;
  maxHp: number;
  vx: number;
  vy: number;
  facingLeft: boolean;
  dead: boolean;
  isBoss: boolean;
  name: string;
  shootCooldown: number;
  alertTimer: number;
  fleeTimer: number;
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

interface Building {
  x: number;
  y: number;
  w: number;
  h: number;
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
  hy: number; // hero world pos
  hhp: number;
  maxHhp: number;
  hvx: number;
  hvy: number;
  hFacingLeft: boolean;
  hShootCooldown: number;
  hBombs: number;
  bombRechargeTimer: number;
  level: number;
  score: number;
  bossesKilled: number;
  enemies: Entity[];
  bullets: Bullet[];
  bombs: Bomb[];
  particles: Particle[];
  buildings: Building[];
  npcs: NPC[];
  cameraX: number;
  cameraY: number;
  screenShake: number;
  levelSplash: number;
  levelTitle: string;
  muted: boolean;
  idCounter: number;
  groundOffset: number;
  bgOffset: number;
  invincTimer: number;
  totalBossesKilled: number;
}

const WORLD_W = 3000;
const WORLD_H = 1800;
const HERO_W = 100;
const HERO_H = 170;
const ENEMY_W = 52;
const ENEMY_H = 88;
const BOSS_W = 72;
const BOSS_H = 122;
const FLEE_DIST = 300;
const FIGHT_DIST = 120;
const BOSS_FIGHT_DIST = 200;
const MOVE_SPEED = 220;
const ENEMY_SPEED = 160;
const BOSS_SPEED = 100;
const BULLET_SPEED = 500;
const BULLET_LIFE = 1.2;
const BOMB_RADIUS = 160;
const GROUND_Y_RATIO = 0.7; // top 70% is sky/buildings

const BOSS_DEFS: { name: string; zone: Vec2; color: string }[] = [
  {
    name: "Rehman Dakait",
    zone: { x: WORLD_W * 0.5, y: WORLD_H * 0.85 },
    color: "#8B0000",
  },
  {
    name: "SP Aslam Choudhury",
    zone: { x: WORLD_W * 0.1, y: WORLD_H * 0.5 },
    color: "#00008B",
  },
  {
    name: "Major Iqbal",
    zone: { x: WORLD_W * 0.5, y: WORLD_H * 0.1 },
    color: "#2F4F2F",
  },
  {
    name: "Jameel Jamali",
    zone: { x: WORLD_W * 0.9, y: WORLD_H * 0.5 },
    color: "#8B6914",
  },
];

const _BOSS_IMAGES = [
  "/assets/generated/rehman-realistic-transparent.dim_200x340.png",
  "/assets/generated/sp-aslam-realistic-transparent.dim_200x340.png",
  "/assets/generated/major-iqbal-realistic-transparent.dim_200x340.png",
  "/assets/generated/jameel-realistic-transparent.dim_200x340.png",
];

const BOSS_DIALOG = [
  "You cannot stop me, fool!",
  "I have the law on my side!",
  "You dare challenge the Major?",
  "Allah will not save you now!",
];

const NPC_HINTS = [
  "Rehman Dakait hides in the south!",
  "SP Aslam lurks in the western district!",
  "Major Iqbal is in the northern barracks!",
  "Jameel Jamali is hiding to the east!",
];

// ─── Audio Engine ────────────────────────────────────────────────────────────

let audioCtx: AudioContext | null = null;
let droneNode: OscillatorNode | null = null;
let droneGain: GainNode | null = null;

function getAudioCtx(): AudioContext {
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
  if (droneGain) {
    droneGain = null;
  }
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
  const roofColors = ["#8b6030", "#7a5028", "#906830", "#9a7040", "#805028"];
  for (let i = 0; i < 80; i++) {
    const w = 60 + rand() * 120;
    const h = 80 + rand() * 180;
    buildings.push({
      x: rand() * (WORLD_W - w),
      y: rand() * (WORLD_H * 0.55) + WORLD_H * 0.05,
      w,
      h,
      color: colors[Math.floor(rand() * colors.length)],
      roofColor: roofColors[Math.floor(rand() * roofColors.length)],
      onFire: false,
      fireTimer: 0,
    });
  }
  return buildings;
}

function generateNPCs(): NPC[] {
  const positions = [
    { x: 600, y: WORLD_H * 0.75 },
    { x: 500, y: WORLD_H * 0.45 },
    { x: 1500, y: WORLD_H * 0.15 },
    { x: 2400, y: WORLD_H * 0.5 },
  ];
  const types: NPC["type"][] = ["man", "soldier", "woman", "man"];
  return positions.map((p, i) => ({
    id: 1000 + i,
    x: p.x,
    y: p.y,
    type: types[i],
    hint: NPC_HINTS[i],
    showBubble: false,
    bubbleTimer: 0,
    vx: 0,
    vy: 0,
    walkTimer: Math.random() * 2,
  }));
}

function spawnEnemies(
  level: number,
  bosses: Entity[],
  idStart: number,
): { enemies: Entity[]; nextId: number } {
  const rand = seededRand(level * 17 + 99);
  const count = 6 + level * 3;
  const grunts: Entity[] = [];
  for (let i = 0; i < count; i++) {
    grunts.push({
      id: idStart + i,
      x: 200 + rand() * (WORLD_W - 400),
      y: WORLD_H * 0.4 + rand() * (WORLD_H * 0.5),
      hp: 30 + level * 5,
      maxHp: 30 + level * 5,
      vx: 0,
      vy: 0,
      facingLeft: false,
      dead: false,
      isBoss: false,
      name: "Enemy",
      shootCooldown: 0,
      alertTimer: 0,
      fleeTimer: 0,
    });
  }
  return { enemies: [...bosses, ...grunts], nextId: idStart + count };
}

function createBosses(idStart: number): Entity[] {
  return BOSS_DEFS.map((b, i) => ({
    id: idStart + i,
    x: b.zone.x + (Math.random() - 0.5) * 200,
    y: b.zone.y + (Math.random() - 0.5) * 100,
    hp: 150,
    maxHp: 150,
    vx: 0,
    vy: 0,
    facingLeft: false,
    dead: false,
    isBoss: true,
    name: b.name,
    shootCooldown: 0,
    alertTimer: 0,
    fleeTimer: 0,
  }));
}

function initGameState(hero: HeroName): GameState {
  const buildings = generateBuildings();
  const npcs = generateNPCs();
  const bosses = createBosses(100);
  const { enemies, nextId } = spawnEnemies(1, bosses, 200);
  return {
    phase: "playing",
    hero,
    hx: WORLD_W / 2,
    hy: WORLD_H * 0.7,
    hhp: 200,
    maxHhp: 200,
    hvx: 0,
    hvy: 0,
    hFacingLeft: false,
    hShootCooldown: 0,
    hBombs: 3,
    bombRechargeTimer: 0,
    level: 1,
    score: 0,
    bossesKilled: 0,
    enemies,
    bullets: [],
    bombs: [],
    particles: [],
    buildings,
    npcs,
    cameraX: WORLD_W / 2 - window.innerWidth / 2,
    cameraY: WORLD_H * 0.7 - window.innerHeight / 2,
    screenShake: 0,
    levelSplash: 0,
    levelTitle: "BORDER TENSION",
    muted: false,
    idCounter: nextId,
    groundOffset: 0,
    bgOffset: 0,
    invincTimer: 0,
    totalBossesKilled: 0,
  };
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState | null>(null);
  const [phase, setPhase] = useState<Phase>("menu");
  const [hero, setHero] = useState<HeroName>("humza");
  const [muted, setMuted] = useState(false);
  const keysRef = useRef<Set<string>>(new Set());
  const imagesRef = useRef<Record<string, HTMLImageElement>>({});
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  // Joystick
  const joystickRef = useRef<{
    active: boolean;
    cx: number;
    cy: number;
    dx: number;
    dy: number;
  }>({
    active: false,
    cx: 0,
    cy: 0,
    dx: 0,
    dy: 0,
  });

  // Load images
  useEffect(() => {
    const paths: Record<string, string> = {
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
    for (const [key, src] of Object.entries(paths)) {
      const img = new Image();
      img.src = src;
      imagesRef.current[key] = img;
    }
  }, []);

  // Keyboard
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keysRef.current.add(e.code);
      if (e.code === "Space" || e.code === "Enter") e.preventDefault();
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
      render(
        ctx,
        window.innerWidth,
        window.innerHeight,
        stateRef.current,
        imagesRef.current,
      );

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
    const vw = canvasRef.current?.width ?? window.innerWidth;
    const vh = canvasRef.current?.height ?? window.innerHeight;
    const joy = joystickRef.current;

    // Hero movement
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
    const mlen = Math.sqrt(mx * mx + my * my);
    if (mlen > 0) {
      mx /= mlen;
      my /= mlen;
    }
    s.hvx = mx * MOVE_SPEED;
    s.hvy = my * MOVE_SPEED;
    if (mx < 0) s.hFacingLeft = true;
    if (mx > 0) s.hFacingLeft = false;

    const newHx = s.hx + s.hvx * dt;
    const newHy = s.hy + s.hvy * dt;

    // Collision with buildings
    let colX = false;
    let colY = false;
    const hw = HERO_W / 2;
    const hh = HERO_H / 2;
    for (const b of s.buildings) {
      if (
        newHx - hw < b.x + b.w &&
        newHx + hw > b.x &&
        s.hy - hh < b.y + b.h &&
        s.hy + hh > b.y
      )
        colX = true;
      if (
        s.hx - hw < b.x + b.w &&
        s.hx + hw > b.x &&
        newHy - hh < b.y + b.h &&
        newHy + hh > b.y
      )
        colY = true;
    }
    if (!colX) s.hx = Math.max(hw, Math.min(WORLD_W - hw, newHx));
    if (!colY) s.hy = Math.max(hh, Math.min(WORLD_H - hh, newHy));

    // Camera
    s.cameraX = Math.max(0, Math.min(WORLD_W - vw, s.hx - vw / 2));
    s.cameraY = Math.max(0, Math.min(WORLD_H - vh, s.hy - vh / 2));

    if (s.screenShake > 0) s.screenShake = Math.max(0, s.screenShake - dt * 8);
    if (s.invincTimer > 0) s.invincTimer = Math.max(0, s.invincTimer - dt);
    if (s.levelSplash > 0) s.levelSplash = Math.max(0, s.levelSplash - dt);

    // Bomb recharge
    s.bombRechargeTimer += dt;
    if (s.bombRechargeTimer >= 30 && s.hBombs < 5) {
      s.hBombs++;
      s.bombRechargeTimer = 0;
    }

    // Hero shoot
    s.hShootCooldown = Math.max(0, s.hShootCooldown - dt);
    const wantsShoot = keys.has("Space") || keys.has("Enter");
    if (wantsShoot && s.hShootCooldown <= 0) {
      heroShoot(s);
    }

    // Hero bomb
    if (keys.has("KeyB") && s.hBombs > 0) {
      keys.delete("KeyB");
      throwBomb(s);
    }

    // Update enemies
    for (const e of s.enemies) {
      if (e.dead) continue;
      e.shootCooldown = Math.max(0, e.shootCooldown - dt);
      e.alertTimer = Math.max(0, e.alertTimer - dt);

      const dx = s.hx - e.x;
      const dy = s.hy - e.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const fightDist = e.isBoss ? BOSS_FIGHT_DIST : FIGHT_DIST;
      const speed = e.isBoss ? BOSS_SPEED : ENEMY_SPEED;

      if (dist < fightDist) {
        // Fight back
        const nx = dx / dist;
        const ny = dy / dist;
        if (e.isBoss) {
          // Boss moves toward player
          e.vx = nx * speed;
          e.vy = ny * speed;
        } else {
          e.vx = 0;
          e.vy = 0;
        }
        if (e.shootCooldown <= 0) {
          enemyShoot(s, e);
          e.shootCooldown = e.isBoss ? 0.8 : 1.5 + Math.random() * 1;
        }
      } else if (dist < FLEE_DIST) {
        // Flee
        const nx = dx / dist;
        const ny = dy / dist;
        e.vx = -nx * speed * 1.1;
        e.vy = -ny * speed * 1.1;
        e.fleeTimer = 0.5;
      } else {
        // Patrol / wander
        e.fleeTimer = Math.max(0, (e.fleeTimer ?? 0) - dt);
        if (e.fleeTimer <= 0) {
          if (Math.random() < 0.01) {
            e.vx = (Math.random() - 0.5) * speed * 0.5;
            e.vy = (Math.random() - 0.5) * speed * 0.5;
          }
        }
      }

      if (dx < 0) e.facingLeft = true;
      if (dx > 0) e.facingLeft = false;

      // Move enemy
      const newEx = e.x + e.vx * dt;
      const newEy = e.y + e.vy * dt;
      e.x = Math.max(20, Math.min(WORLD_W - 20, newEx));
      e.y = Math.max(20, Math.min(WORLD_H - 20, newEy));
    }

    // Update bullets
    for (const b of s.bullets) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
    }

    // Bullet collisions
    for (const b of s.bullets) {
      if (b.life <= 0) continue;
      if (b.fromPlayer) {
        for (const e of s.enemies) {
          if (e.dead) continue;
          if (Math.abs(b.x - e.x) < 30 && Math.abs(b.y - e.y) < 50) {
            e.hp -= 20;
            b.life = 0;
            spawnParticles(s, e.x, e.y, "#ff4400", 6);
            playHit(s.muted);
            if (e.hp <= 0) {
              e.dead = true;
              s.score += e.isBoss ? 500 : 50;
              if (e.isBoss) {
                s.bossesKilled++;
                s.totalBossesKilled++;
                playBossAlert(s.muted);
                spawnParticles(s, e.x, e.y, "#ff8800", 20);
              }
            }
            break;
          }
        }
      } else {
        // Enemy bullet hits player
        if (
          s.invincTimer <= 0 &&
          Math.abs(b.x - s.hx) < 30 &&
          Math.abs(b.y - s.hy) < 50
        ) {
          s.hhp -= 15;
          b.life = 0;
          s.invincTimer = 0.5;
          s.screenShake = 0.3;
          spawnParticles(s, s.hx, s.hy, "#ff0000", 5);
          playHit(s.muted);
          if (s.hhp <= 0) {
            s.phase = "gameover";
          }
        }
      }
    }

    s.bullets = s.bullets.filter((b) => b.life > 0);

    // Update bombs
    for (const bomb of s.bombs) {
      if (bomb.exploded) {
        bomb.explodeTime += dt;
        continue;
      }
      bomb.timer -= dt;
      // Animate toward target
      const prog = 1 - Math.max(0, bomb.timer) / 1.8;
      bomb.x = bomb.x + (bomb.tx - bomb.x) * dt * 3;
      bomb.y = bomb.y + (bomb.ty - bomb.y) * dt * 3;
      if (bomb.timer <= 0) {
        bomb.exploded = true;
        bomb.x = bomb.tx;
        bomb.y = bomb.ty;
        bomb.explodeTime = 0;
        s.screenShake = 0.8;
        playExplosion(s.muted);
        spawnParticles(s, bomb.x, bomb.y, "#ff6600", 30);
        // Damage enemies in radius
        for (const e of s.enemies) {
          if (e.dead) continue;
          const dx = bomb.x - e.x;
          const dy = bomb.y - e.y;
          if (Math.sqrt(dx * dx + dy * dy) < BOMB_RADIUS) {
            e.hp -= 100;
            if (e.hp <= 0) {
              e.dead = true;
              s.score += e.isBoss ? 500 : 50;
              if (e.isBoss) {
                s.bossesKilled++;
                s.totalBossesKilled++;
                playBossAlert(s.muted);
              }
            }
          }
        }
        // Ignite buildings
        for (const bld of s.buildings) {
          const cx = bld.x + bld.w / 2;
          const cy = bld.y + bld.h / 2;
          const dx = bomb.x - cx;
          const dy = bomb.y - cy;
          if (Math.sqrt(dx * dx + dy * dy) < BOMB_RADIUS * 1.5) {
            bld.onFire = true;
            bld.fireTimer = 5;
          }
        }
        const _ = prog; // silence unused
      }
    }
    s.bombs = s.bombs.filter((b) => !(b.exploded && b.explodeTime > 2));

    // Buildings on fire
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
        npc.vx = (Math.random() - 0.5) * 40;
        npc.vy = (Math.random() - 0.5) * 20;
        npc.walkTimer = 2 + Math.random() * 3;
      }
      npc.x = Math.max(50, Math.min(WORLD_W - 50, npc.x + npc.vx * dt));
      npc.y = Math.max(
        WORLD_H * 0.5,
        Math.min(WORLD_H * 0.9, npc.y + npc.vy * dt),
      );

      const dx = s.hx - npc.x;
      const dy = s.hy - npc.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 150) {
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
      p.vy += 200 * dt; // gravity
    }
    s.particles = s.particles.filter((p) => p.life > 0);

    // Level check: all grunts dead?
    const aliveGrunts = s.enemies.filter((e) => !e.dead && !e.isBoss);
    const aliveBosses = s.enemies.filter((e) => !e.dead && e.isBoss);
    if (aliveGrunts.length === 0) {
      // Next level
      s.level++;
      const titles = [
        "BORDER TENSION",
        "BORDER TENSION",
        "WAR BREAKS OUT",
        "WAR BREAKS OUT",
        "TOTAL WARFARE",
      ];
      s.levelTitle =
        titles[Math.min(s.level - 1, titles.length - 1)] ?? "TOTAL WARFARE";
      s.levelSplash = 3;
      const { enemies: newEnemies, nextId } = spawnEnemies(
        s.level,
        aliveBosses,
        s.idCounter,
      );
      s.enemies = newEnemies;
      s.idCounter = nextId;
    }

    // Win: all 4 bosses dead
    if (s.totalBossesKilled >= 4) {
      s.phase = "win";
    }
  }

  function heroShoot(s: GameState) {
    const alive = s.enemies.filter((e) => !e.dead);
    if (alive.length === 0) return;
    let nearest = alive[0];
    let minD = Number.POSITIVE_INFINITY;
    for (const e of alive) {
      const dx = e.x - s.hx;
      const dy = e.y - s.hy;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < minD) {
        minD = d;
        nearest = e;
      }
    }
    const dx = nearest.x - s.hx;
    const dy = nearest.y - s.hy;
    const len = Math.sqrt(dx * dx + dy * dy);
    s.bullets.push({
      id: s.idCounter++,
      x: s.hx,
      y: s.hy,
      vx: (dx / len) * BULLET_SPEED,
      vy: (dy / len) * BULLET_SPEED,
      fromPlayer: true,
      life: BULLET_LIFE,
    });
    s.hShootCooldown = 0.18;
    playShoot(s.muted);
  }

  function enemyShoot(s: GameState, e: Entity) {
    const dx = s.hx - e.x;
    const dy = s.hy - e.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    s.bullets.push({
      id: s.idCounter++,
      x: e.x,
      y: e.y,
      vx: (dx / len) * BULLET_SPEED * 0.7,
      vy: (dy / len) * BULLET_SPEED * 0.7,
      fromPlayer: false,
      life: BULLET_LIFE,
    });
  }

  function throwBomb(s: GameState) {
    if (s.hBombs <= 0) return;
    s.hBombs--;
    // Aim at nearest enemy
    const alive = s.enemies.filter((e) => !e.dead);
    let tx = s.hx + (s.hFacingLeft ? -200 : 200);
    let ty = s.hy;
    if (alive.length > 0) {
      let nearest = alive[0];
      let minD = Number.POSITIVE_INFINITY;
      for (const e of alive) {
        const dx = e.x - s.hx;
        const dy = e.y - s.hy;
        if (Math.sqrt(dx * dx + dy * dy) < minD) {
          minD = Math.sqrt(dx * dx + dy * dy);
          nearest = e;
        }
      }
      tx = nearest.x;
      ty = nearest.y;
    }
    s.bombs.push({
      id: s.idCounter++,
      x: s.hx,
      y: s.hy,
      tx,
      ty,
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
      const speed = 50 + Math.random() * 200;
      s.particles.push({
        id: s.idCounter++,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 100,
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
    imgs: Record<string, HTMLImageElement>,
  ) {
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    (
      ctx as CanvasRenderingContext2D & { imageSmoothingQuality: string }
    ).imageSmoothingQuality = "high";
    ctx.clearRect(0, 0, vw, vh);

    // Screen shake offset
    const shakeX =
      s.screenShake > 0 ? (Math.random() - 0.5) * s.screenShake * 12 : 0;
    const shakeY =
      s.screenShake > 0 ? (Math.random() - 0.5) * s.screenShake * 8 : 0;

    ctx.save();
    ctx.translate(shakeX, shakeY);

    // Sky gradient - Version 16 style warm amber/dusk city
    const levelRatio = Math.min((s.level - 1) / 6, 1);
    // Warm amber dusk sky transitioning to blood red at war levels
    const skyGrad = ctx.createLinearGradient(0, 0, 0, vh * GROUND_Y_RATIO);
    if (levelRatio < 0.5) {
      // Early levels: warm golden dusk
      skyGrad.addColorStop(
        0,
        `rgb(${Math.floor(60 + levelRatio * 100)},${Math.floor(80 - levelRatio * 40)},${Math.floor(140 - levelRatio * 120)})`,
      );
      skyGrad.addColorStop(
        0.6,
        `rgb(${Math.floor(220 + levelRatio * 20)},${Math.floor(140 - levelRatio * 60)},${Math.floor(60 - levelRatio * 40)})`,
      );
      skyGrad.addColorStop(
        1,
        `rgb(${Math.floor(255)},${Math.floor(180 - levelRatio * 80)},${Math.floor(80 - levelRatio * 60)})`,
      );
    } else {
      // War levels: blood red/crimson
      const w = (levelRatio - 0.5) * 2;
      skyGrad.addColorStop(
        0,
        `rgb(${Math.floor(160 + w * 60)},${Math.floor(40 - w * 30)},${Math.floor(20)})`,
      );
      skyGrad.addColorStop(
        1,
        `rgb(${Math.floor(230 + w * 25)},${Math.floor(80 - w * 50)},${Math.floor(20)})`,
      );
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, vw, vh * GROUND_Y_RATIO);

    // Draw Version 16 style parallax city buildings (3 layers)
    drawV16City(ctx, vw, vh, s.cameraX, levelRatio);

    // Ground - warm sandy city road
    const groundY = vh * GROUND_Y_RATIO;
    const groundH = vh * (1 - GROUND_Y_RATIO);
    const gGrad = ctx.createLinearGradient(0, groundY, 0, vh);
    gGrad.addColorStop(0, levelRatio > 0.5 ? "#4a3020" : "#b8965a");
    gGrad.addColorStop(1, levelRatio > 0.5 ? "#2a1808" : "#8a6830");
    ctx.fillStyle = gGrad;
    ctx.fillRect(0, groundY, vw, groundH);
    // Road markings
    ctx.strokeStyle = "rgba(255,220,100,0.25)";
    ctx.lineWidth = 3;
    ctx.setLineDash([40, 30]);
    ctx.beginPath();
    ctx.moveTo(0, groundY + groundH * 0.35);
    ctx.lineTo(vw, groundY + groundH * 0.35);
    ctx.stroke();
    ctx.setLineDash([]);

    // Buildings (world objects)
    for (const b of s.buildings) {
      const sx = b.x - s.cameraX;
      const sy = b.y - s.cameraY;
      if (sx + b.w < 0 || sx > vw || sy + b.h < 0 || sy > vh) continue;
      ctx.fillStyle = b.color;
      ctx.fillRect(sx, sy, b.w, b.h);
      // Roof
      ctx.fillStyle = b.roofColor;
      ctx.fillRect(sx, sy - 12, b.w, 12);
      // Windows
      ctx.fillStyle = "rgba(255,240,180,0.5)";
      for (let wx = sx + 10; wx < sx + b.w - 16; wx += 22) {
        for (let wy = sy + 15; wy < sy + b.h - 20; wy += 30) {
          ctx.fillRect(wx, wy, 14, 18);
        }
      }
      // Fire
      if (b.onFire) {
        drawFire(ctx, sx + b.w / 2, sy, b.w * 0.6);
      }
    }

    // Smoke columns (level 5+)
    if (s.level >= 5) {
      for (let i = 0; i < 3; i++) {
        const sx = ((i * 800 + 200 - s.cameraX * 0.3) % (vw + 200)) - 100;
        drawSmoke(ctx, sx, vh * GROUND_Y_RATIO - 20);
      }
    }

    // NPCs
    for (const npc of s.npcs) {
      const sx = npc.x - s.cameraX;
      const sy = npc.y - s.cameraY;
      if (sx < -60 || sx > vw + 60 || sy < -80 || sy > vh + 20) continue;
      drawNPC(ctx, sx, sy, npc.type);
      if (npc.showBubble) drawSpeechBubble(ctx, sx, sy - 60, npc.hint);
    }

    // Enemies
    for (const e of s.enemies) {
      if (e.dead) continue;
      const sx = e.x - s.cameraX;
      const sy = e.y - s.cameraY;
      if (sx < -80 || sx > vw + 80 || sy < -120 || sy > vh + 20) continue;
      const w = e.isBoss ? BOSS_W : ENEMY_W;
      const h = e.isBoss ? BOSS_H : ENEMY_H;
      const imgKey = e.isBoss ? getBossImgKey(e.name) : "grunt";
      drawCharacter(
        ctx,
        imgs,
        imgKey,
        sx,
        sy,
        w,
        h,
        e.facingLeft,
        e.isBoss ? "#ff4400" : "#666",
      );
      // HP bar for boss
      if (e.isBoss) {
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(sx - w / 2, sy - h - 10, w, 6);
        ctx.fillStyle = "#ff3300";
        ctx.fillRect(sx - w / 2, sy - h - 10, w * (e.hp / e.maxHp), 6);
        ctx.fillStyle = "white";
        ctx.font = "bold 9px Arial";
        ctx.textAlign = "center";
        ctx.fillText(e.name, sx, sy - h - 14);
      }
      // Alert indicator
      if (e.alertTimer > 0) {
        ctx.fillStyle = "#ff0";
        ctx.font = "16px Arial";
        ctx.fillText("!", sx, sy - h - 20);
      }
    }

    // Hero
    const heroSx = s.hx - s.cameraX;
    const heroSy = s.hy - s.cameraY;
    const heroAlpha =
      s.invincTimer > 0 ? (Math.sin(s.invincTimer * 20) > 0 ? 0.4 : 1) : 1;
    ctx.globalAlpha = heroAlpha;
    drawCharacter(
      ctx,
      imgs,
      s.hero,
      heroSx,
      heroSy,
      HERO_W,
      HERO_H,
      s.hFacingLeft,
      "#2244ff",
    );
    ctx.globalAlpha = 1;

    // Bullets
    for (const b of s.bullets) {
      const sx = b.x - s.cameraX;
      const sy = b.y - s.cameraY;
      ctx.beginPath();
      ctx.arc(sx, sy, 4, 0, Math.PI * 2);
      ctx.fillStyle = b.fromPlayer ? "#ffdd00" : "#ff4400";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(sx, sy, 2, 0, Math.PI * 2);
      ctx.fillStyle = "white";
      ctx.fill();
    }

    // Bombs
    for (const bomb of s.bombs) {
      const sx = bomb.x - s.cameraX;
      const sy = bomb.y - s.cameraY;
      if (!bomb.exploded) {
        ctx.beginPath();
        ctx.arc(sx, sy, 8, 0, Math.PI * 2);
        ctx.fillStyle = "#333";
        ctx.fill();
        ctx.fillStyle = "#ff0";
        ctx.font = "10px Arial";
        ctx.textAlign = "center";
        ctx.fillText("💣", sx, sy + 4);
      } else if (bomb.explodeTime < 0.5) {
        const r = BOMB_RADIUS * (bomb.explodeTime / 0.5);
        const alpha = 1 - bomb.explodeTime / 0.5;
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        const eg = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
        eg.addColorStop(0, `rgba(255,255,150,${alpha})`);
        eg.addColorStop(0.4, `rgba(255,100,0,${alpha * 0.8})`);
        eg.addColorStop(1, "rgba(255,0,0,0)");
        ctx.fillStyle = eg;
        ctx.fill();
      }
    }

    // Particles
    for (const p of s.particles) {
      const sx = p.x - s.cameraX;
      const sy = p.y - s.cameraY;
      const alpha = p.life / p.maxLife;
      ctx.beginPath();
      ctx.arc(sx, sy, p.size, 0, Math.PI * 2);
      ctx.fillStyle =
        p.color +
        Math.floor(alpha * 255)
          .toString(16)
          .padStart(2, "0");
      ctx.fill();
    }

    ctx.restore(); // end shake

    // HUD
    drawHUD(ctx, vw, vh, s, imgs);

    // Minimap
    drawMinimap(ctx, vw, vh, s);

    // Level splash
    if (s.levelSplash > 0) {
      const alpha = Math.min(s.levelSplash, 1);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillRect(0, vh / 2 - 70, vw, 140);
      ctx.fillStyle = "#ffd700";
      ctx.font = `bold ${Math.floor(vw * 0.08)}px 'Cinzel', serif`;
      ctx.textAlign = "center";
      ctx.shadowBlur = 30;
      ctx.shadowColor = "#ff8800";
      ctx.fillText(`LEVEL ${s.level}`, vw / 2, vh / 2 - 10);
      ctx.font = `bold ${Math.floor(vw * 0.04)}px 'Cinzel', serif`;
      ctx.fillStyle = "#ff9900";
      ctx.fillText(s.levelTitle, vw / 2, vh / 2 + 40);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }

    // Copyright watermark
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = "white";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.fillText(
      "© Priyanka Sharma | priyankadsharma11@gmail.com",
      vw / 2,
      vh / 2,
    );
    ctx.globalAlpha = 1;
  }

  function drawCharacter(
    ctx: CanvasRenderingContext2D,
    imgs: Record<string, HTMLImageElement>,
    key: string,
    sx: number,
    sy: number,
    w: number,
    h: number,
    facingLeft: boolean,
    fallbackColor: string,
  ) {
    const img = imgs[key];
    ctx.save();
    if (facingLeft) {
      ctx.scale(-1, 1);
      ctx.translate(-sx * 2, 0);
    }
    if (img?.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, sx - w / 2, sy - h, w, h);
    } else {
      // Fallback rectangle
      ctx.fillStyle = fallbackColor;
      ctx.fillRect(sx - w / 2, sy - h, w, h);
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.fillRect(sx - w / 4, sy - h + 4, w / 2, w / 2);
    }
    ctx.restore();
  }

  function getBossImgKey(name: string): string {
    if (name.includes("Rehman")) return "rehman";
    if (name.includes("SP") || name.includes("Aslam")) return "sp_aslam";
    if (name.includes("Major") || name.includes("Iqbal")) return "major_iqbal";
    if (name.includes("Jameel")) return "jameel";
    return "grunt";
  }

  function drawHUD(
    ctx: CanvasRenderingContext2D,
    vw: number,
    vh: number,
    s: GameState,
    _imgs: Record<string, HTMLImageElement>,
  ) {
    // Top bar background
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, 0, vw, 56);

    // Hero name & HP
    const heroName = s.hero === "humza" ? "Humza Ali Mazari" : "Ajay Sanyal";
    ctx.fillStyle = "#ffd700";
    ctx.font = "bold 13px 'Cinzel', serif";
    ctx.textAlign = "left";
    ctx.fillText(heroName, 10, 20);
    // HP bar
    const hpW = 160;
    ctx.fillStyle = "#333";
    ctx.fillRect(10, 26, hpW, 14);
    const hpRatio = s.hhp / s.maxHhp;
    ctx.fillStyle =
      hpRatio > 0.6 ? "#00e060" : hpRatio > 0.3 ? "#ffaa00" : "#ff2200";
    ctx.fillRect(10, 26, hpW * hpRatio, 14);
    ctx.strokeStyle = "#ffd700";
    ctx.lineWidth = 1;
    ctx.strokeRect(10, 26, hpW, 14);
    ctx.fillStyle = "white";
    ctx.font = "10px Arial";
    ctx.fillText(`${s.hhp}/${s.maxHhp}`, 14, 37);

    // Title center
    ctx.fillStyle = "#ffd700";
    ctx.font = `bold ${Math.floor(vw * 0.04)}px 'Cinzel', serif`;
    ctx.textAlign = "center";
    ctx.shadowBlur = 10;
    ctx.shadowColor = "#ff8800";
    ctx.fillText("DHURANDHAR", vw / 2, 22);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#ff9900";
    ctx.font = "12px Arial";
    ctx.fillText(`LEVEL ${s.level} — ${s.levelTitle}`, vw / 2, 42);

    // Right: enemies + bosses
    ctx.textAlign = "right";
    const aliveGrunts = s.enemies.filter((e) => !e.dead && !e.isBoss).length;
    const aliveBosses = s.enemies.filter((e) => !e.dead && e.isBoss).length;
    ctx.fillStyle = "white";
    ctx.font = "bold 12px Arial";
    ctx.fillText(
      `Enemies: ${aliveGrunts}  Bosses: ${aliveBosses}/4`,
      vw - 10,
      22,
    );
    ctx.fillStyle = "#ffd700";
    ctx.fillText(`💣 x${s.hBombs}  Score: ${s.score}`, vw - 10, 42);

    // Mute button
    ctx.textAlign = "right";
    ctx.font = "20px Arial";
    ctx.fillText(s.muted ? "🔇" : "🔊", vw - 10, 58);

    // Boss dialog bubbles
    for (const e of s.enemies) {
      if (!e.isBoss || e.dead || e.alertTimer <= 0) continue;
      const sx = e.x - s.cameraX;
      const sy = e.y - s.cameraY;
      const bossIdx = BOSS_DEFS.findIndex((b) => b.name === e.name);
      const dialog = BOSS_DIALOG[bossIdx] ?? "You won't beat me!";
      drawSpeechBubble(ctx, sx, sy - BOSS_H - 10, dialog);
    }

    // Bottom copyright bar
    ctx.fillStyle = "rgba(0,0,0,0.8)";
    ctx.fillRect(0, vh - 22, vw, 22);
    ctx.fillStyle = "#ffd700";
    ctx.font = "10px Arial";
    ctx.textAlign = "center";
    ctx.fillText(
      "© 2026 Dhurandhar | Priyanka Sharma | priyankadsharma11@gmail.com | All Rights Reserved",
      vw / 2,
      vh - 7,
    );
  }

  function drawMinimap(
    ctx: CanvasRenderingContext2D,
    vw: number,
    vh: number,
    s: GameState,
  ) {
    const mm = { x: vw - 160, y: vh - 180, w: 150, h: 150 };
    // Background
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(mm.x, mm.y, mm.w, mm.h);
    ctx.strokeStyle = "#ffd700";
    ctx.lineWidth = 1;
    ctx.strokeRect(mm.x, mm.y, mm.w, mm.h);

    const toMM = (wx: number, wy: number) => ({
      x: mm.x + (wx / WORLD_W) * mm.w,
      y: mm.y + (wy / WORLD_H) * mm.h,
    });

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

    // NPCs
    for (const npc of s.npcs) {
      const p = toMM(npc.x, npc.y);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = "#44ff44";
      ctx.fill();
    }

    // Player
    const pp = toMM(s.hx, s.hy);
    ctx.beginPath();
    ctx.arc(pp.x, pp.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#4488ff";
    ctx.fill();
    ctx.strokeStyle = "white";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Label
    ctx.fillStyle = "#ffd700";
    ctx.font = "9px Arial";
    ctx.textAlign = "center";
    ctx.fillText("MINIMAP", mm.x + mm.w / 2, mm.y - 4);
  }

  function drawNPC(
    ctx: CanvasRenderingContext2D,
    sx: number,
    sy: number,
    type: NPC["type"],
  ) {
    ctx.save();
    if (type === "soldier") {
      // Olive uniform
      ctx.fillStyle = "#4a5e2a";
      ctx.fillRect(sx - 12, sy - 50, 24, 32);
      ctx.fillStyle = "#3a4e1a";
      ctx.fillRect(sx - 8, sy - 18, 16, 20);
      ctx.fillStyle = "#d4a56a";
      ctx.beginPath();
      ctx.arc(sx, sy - 58, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#3a4e1a";
      ctx.fillRect(sx - 11, sy - 68, 22, 12);
    } else if (type === "woman") {
      // Sari
      ctx.fillStyle = "#ff6020";
      ctx.beginPath();
      ctx.moveTo(sx - 14, sy - 20);
      ctx.lineTo(sx + 14, sy - 20);
      ctx.lineTo(sx + 10, sy);
      ctx.lineTo(sx - 10, sy);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#cc4010";
      ctx.fillRect(sx - 10, sy - 52, 20, 32);
      ctx.fillStyle = "#d4956a";
      ctx.beginPath();
      ctx.arc(sx, sy - 60, 10, 0, Math.PI * 2);
      ctx.fill();
      // Bindi
      ctx.fillStyle = "#cc0000";
      ctx.beginPath();
      ctx.arc(sx, sy - 64, 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Saffron kurta
      ctx.fillStyle = "#e87020";
      ctx.fillRect(sx - 12, sy - 52, 24, 34);
      ctx.fillStyle = "#c85810";
      ctx.fillRect(sx - 8, sy - 18, 16, 20);
      ctx.fillStyle = "#c4856a";
      ctx.beginPath();
      ctx.arc(sx, sy - 60, 10, 0, Math.PI * 2);
      ctx.fill();
      // Gandhi cap
      ctx.fillStyle = "white";
      ctx.beginPath();
      ctx.ellipse(sx, sy - 70, 12, 5, 0, Math.PI, 0);
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
    // Tail
    ctx.beginPath();
    ctx.moveTo(sx - 6, by + bh);
    ctx.lineTo(sx, by + bh + 8);
    ctx.lineTo(sx + 6, by + bh);
    ctx.fillStyle = "rgba(255,255,220,0.95)";
    ctx.fill();
    ctx.fillStyle = "#333";
    ctx.font = "11px Arial";
    ctx.textAlign = "left";
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], bx + 8, by + 14 + i * lh);
    }
  }

  function drawV16City(
    ctx: CanvasRenderingContext2D,
    vw: number,
    vh: number,
    camX: number,
    levelRatio: number,
  ) {
    const groundY = vh * GROUND_Y_RATIO;
    // Layer 1 - Far background buildings (slowest parallax)
    const farColors =
      levelRatio > 0.5
        ? ["#5a2010", "#4a1808", "#6a2818"]
        : ["#c8a060", "#b89050", "#d4b870"];
    for (let i = 0; i < 14; i++) {
      const bx =
        ((((i * 170 - camX * 0.08) % (vw + 200)) + vw + 200) % (vw + 200)) -
        100;
      const bh = 100 + (i % 4) * 50;
      ctx.fillStyle = farColors[i % farColors.length];
      ctx.fillRect(bx, groundY - bh, 150, bh);
      // Roof detail
      ctx.fillStyle = "rgba(0,0,0,0.2)";
      ctx.fillRect(bx, groundY - bh, 150, 8);
      // Windows
      ctx.fillStyle =
        levelRatio > 0.5 ? "rgba(255,100,0,0.4)" : "rgba(255,240,180,0.5)";
      for (let wy = groundY - bh + 16; wy < groundY - 16; wy += 22) {
        for (let wx = bx + 10; wx < bx + 140; wx += 24) {
          ctx.fillRect(wx, wy, 14, 14);
        }
      }
    }
    // Layer 2 - Mid buildings (medium parallax)
    const midColors =
      levelRatio > 0.5
        ? ["#7a3020", "#6a2010", "#8a3828"]
        : ["#e8b870", "#d09858", "#f0c880"];
    for (let i = 0; i < 10; i++) {
      const bx =
        ((((i * 220 + 80 - camX * 0.15) % (vw + 250)) + vw + 250) %
          (vw + 250)) -
        125;
      const bh = 130 + (i % 3) * 70;
      ctx.fillStyle = midColors[i % midColors.length];
      ctx.fillRect(bx, groundY - bh, 180, bh);
      // Side wall shading
      ctx.fillStyle = "rgba(0,0,0,0.18)";
      ctx.fillRect(bx + 160, groundY - bh, 20, bh);
      // Roof parapet
      ctx.fillStyle = midColors[i % midColors.length];
      ctx.fillRect(bx - 5, groundY - bh - 10, 190, 12);
      // Windows with warm glow
      ctx.fillStyle =
        levelRatio > 0.5 ? "rgba(255,80,0,0.5)" : "rgba(255,230,120,0.6)";
      for (let wy = groundY - bh + 18; wy < groundY - 18; wy += 26) {
        for (let wx = bx + 14; wx < bx + 168; wx += 28) {
          ctx.fillRect(wx, wy, 16, 16);
        }
      }
      // Hindi shop sign on ground floor
      if (i % 3 === 0) {
        ctx.fillStyle = "rgba(180,50,50,0.8)";
        ctx.fillRect(bx + 10, groundY - 36, 160, 28);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 11px Arial";
        ctx.textAlign = "center";
        const signs = ["दुकान", "HOTEL", "CHAI", "786", "SHOP"];
        ctx.fillText(signs[i % signs.length], bx + 90, groundY - 17);
      }
    }
    // Layer 3 - Near foreground building edges (fastest parallax)
    const nearColors =
      levelRatio > 0.5 ? ["#3a1008", "#4a1810"] : ["#a07840", "#b88848"];
    for (let i = 0; i < 6; i++) {
      const bx =
        ((((i * 300 + 150 - camX * 0.25) % (vw + 300)) + vw + 300) %
          (vw + 300)) -
        150;
      const bh = 160 + (i % 2) * 80;
      ctx.fillStyle = nearColors[i % nearColors.length];
      ctx.fillRect(bx, groundY - bh, 80, bh);
      ctx.fillRect(bx + vw * 0.5, groundY - bh - 30, 80, bh + 30);
    }
    // Atmospheric dust/haze overlay
    const hazeGrad = ctx.createLinearGradient(0, groundY - 60, 0, groundY);
    hazeGrad.addColorStop(0, "rgba(0,0,0,0)");
    hazeGrad.addColorStop(
      1,
      levelRatio > 0.5 ? "rgba(60,10,0,0.4)" : "rgba(180,120,40,0.3)",
    );
    ctx.fillStyle = hazeGrad;
    ctx.fillRect(0, groundY - 60, vw, 60);
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
      ctx.ellipse(fx, y - fh / 2, width * 0.15, fh / 2, 0, 0, Math.PI * 2);
      ctx.fillStyle = fg;
      ctx.fill();
    }
  }

  function drawSmoke(ctx: CanvasRenderingContext2D, x: number, y: number) {
    const t = performance.now() / 1000;
    for (let i = 0; i < 4; i++) {
      const sy2 = y - i * 40;
      const r = 15 + i * 12;
      const alpha = 0.4 - i * 0.08;
      ctx.beginPath();
      ctx.arc(x + Math.sin(t + i) * 10, sy2, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(80,80,80,${alpha})`;
      ctx.fill();
    }
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
    if (!stateRef.current) return;
    heroShoot(stateRef.current);
  }
  function handleBombBtn() {
    if (!stateRef.current) return;
    throwBomb(stateRef.current);
  }
  function handleMuteBtn() {
    if (!stateRef.current) return;
    stateRef.current.muted = !stateRef.current.muted;
    setMuted(stateRef.current.muted);
    if (stateRef.current.muted) stopDrone();
    else startDrone(false);
  }

  function handleCanvasTap(e: React.MouseEvent<HTMLCanvasElement>) {
    const vw = canvasRef.current?.width ?? window.innerWidth;
    const _vh = canvasRef.current?.height ?? window.innerHeight;
    const x = e.clientX;
    const y = e.clientY;
    // Mute button area: top-right ~40x40
    if (x > vw - 50 && y < 70) {
      handleMuteBtn();
    }
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

    function drawMenu() {
      if (!ctx) return;
      const dpr = window.devicePixelRatio || 1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = true;
      (
        ctx as CanvasRenderingContext2D & { imageSmoothingQuality: string }
      ).imageSmoothingQuality = "high";
      ctx.clearRect(0, 0, vw, vh);
      // Background
      const cityImg = imagesRef.current.cityBg;
      if (cityImg?.complete && cityImg.naturalWidth > 0) {
        ctx.drawImage(cityImg, 0, 0, vw, vh * 0.7);
      } else {
        const bg = ctx.createLinearGradient(0, 0, 0, vh);
        bg.addColorStop(0, "#1a0a00");
        bg.addColorStop(1, "#3a1a00");
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, vw, vh);
      }
      const groundImg = imagesRef.current.militaryBase;
      if (groundImg?.complete && groundImg.naturalWidth > 0) {
        ctx.drawImage(groundImg, 0, vh * 0.7, vw, vh * 0.3);
      } else {
        ctx.fillStyle = "#3a2a18";
        ctx.fillRect(0, vh * 0.7, vw, vh * 0.3);
      }
      // Overlay
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(0, 0, vw, vh);

      if (phase === "menu") {
        // Title
        ctx.fillStyle = "#ffd700";
        ctx.font = `bold ${Math.floor(vw * 0.1)}px 'Cinzel', serif`;
        ctx.textAlign = "center";
        ctx.shadowBlur = 40;
        ctx.shadowColor = "#ff8800";
        ctx.fillText("DHURANDHAR", vw / 2, vh * 0.28);
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#ff9900";
        ctx.font = `${Math.floor(vw * 0.025)}px 'Cinzel', serif`;
        ctx.fillText("Save the Country. Hunt the Villains.", vw / 2, vh * 0.36);
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.font = "14px Arial";
        ctx.fillText(
          "© 2026 Priyanka Sharma | priyankadsharma11@gmail.com",
          vw / 2,
          vh * 0.42,
        );
      } else if (phase === "win") {
        ctx.fillStyle = "#ffd700";
        ctx.font = `bold ${Math.floor(vw * 0.08)}px 'Cinzel', serif`;
        ctx.textAlign = "center";
        ctx.shadowBlur = 30;
        ctx.shadowColor = "#ff8800";
        ctx.fillText("MISSION COMPLETE!", vw / 2, vh * 0.3);
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#00ff88";
        ctx.font = `${Math.floor(vw * 0.035)}px Arial`;
        ctx.fillText("You saved the country!", vw / 2, vh * 0.42);
        const s = stateRef.current;
        if (s) {
          ctx.fillStyle = "white";
          ctx.font = "18px Arial";
          ctx.fillText(
            `Final Score: ${s.score}  |  Level Reached: ${s.level}`,
            vw / 2,
            vh * 0.52,
          );
        }
      } else if (phase === "gameover") {
        ctx.fillStyle = "#ff2200";
        ctx.font = `bold ${Math.floor(vw * 0.09)}px 'Cinzel', serif`;
        ctx.textAlign = "center";
        ctx.shadowBlur = 30;
        ctx.shadowColor = "#ff0000";
        ctx.fillText("GAME OVER", vw / 2, vh * 0.35);
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#ff9900";
        ctx.font = "18px Arial";
        ctx.fillText("The country needs you. Try again!", vw / 2, vh * 0.46);
      }
    }

    const frame = requestAnimationFrame(drawMenu);
    return () => cancelAnimationFrame(frame);
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

      {/* Menu UI */}
      {phase === "menu" && (
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-16 pointer-events-none">
          <div className="pointer-events-auto flex flex-col items-center gap-6">
            {/* Character select */}
            <div className="flex gap-6">
              <button
                type="button"
                data-ocid="hero.humza.button"
                onClick={() => setHero("humza")}
                className={`px-6 py-3 rounded-lg font-bold text-lg transition-all border-2 ${
                  hero === "humza"
                    ? "bg-yellow-500 text-black border-yellow-300 scale-105"
                    : "bg-black/60 text-yellow-400 border-yellow-600 hover:bg-black/80"
                }`}
                style={{ fontFamily: "'Cinzel', serif" }}
              >
                Humza Ali Mazari
              </button>
              <button
                type="button"
                data-ocid="hero.ajay.button"
                onClick={() => setHero("ajay")}
                className={`px-6 py-3 rounded-lg font-bold text-lg transition-all border-2 ${
                  hero === "ajay"
                    ? "bg-yellow-500 text-black border-yellow-300 scale-105"
                    : "bg-black/60 text-yellow-400 border-yellow-600 hover:bg-black/80"
                }`}
                style={{ fontFamily: "'Cinzel', serif" }}
              >
                Ajay Sanyal
              </button>
            </div>
            <button
              type="button"
              data-ocid="game.start.primary_button"
              onClick={() => startGame(hero)}
              className="px-12 py-4 bg-gradient-to-b from-yellow-400 to-orange-600 text-black font-black text-2xl rounded-xl shadow-2xl hover:from-yellow-300 hover:to-orange-500 active:scale-95 transition-all uppercase tracking-widest"
              style={{
                fontFamily: "'Cinzel', serif",
                textShadow: "0 1px 2px rgba(255,200,0,0.5)",
              }}
            >
              START GAME
            </button>
            <p className="text-yellow-600 text-sm">
              WASD / Arrow Keys to move • Space to fire • B for bomb
            </p>
          </div>
        </div>
      )}

      {/* Win / Game Over UI */}
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
            style={{ fontFamily: "'Cinzel', serif" }}
          >
            {phase === "win" ? "PLAY AGAIN" : "TRY AGAIN"}
          </button>
        </div>
      )}

      {/* In-game mobile controls */}
      {phase === "playing" && (
        <>
          {/* Joystick */}
          <div
            data-ocid="game.joystick.canvas_target"
            className="absolute bottom-8 left-6 w-28 h-28 rounded-full border-2 border-yellow-500/40 bg-black/30 flex items-center justify-center"
            onTouchStart={handleJoystickStart}
            onTouchMove={handleJoystickMove}
            onTouchEnd={handleJoystickEnd}
            style={{ touchAction: "none" }}
          >
            <div className="w-12 h-12 rounded-full bg-yellow-500/30 border border-yellow-400/50" />
          </div>

          {/* Action buttons */}
          <div className="absolute bottom-8 right-4 flex flex-col gap-3">
            <button
              type="button"
              data-ocid="game.bomb.button"
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

          {/* Mute toggle */}
          <button
            type="button"
            data-ocid="game.mute.toggle"
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
