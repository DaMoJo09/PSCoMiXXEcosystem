import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Gamepad2, Loader2, Pause, Play, RotateCcw, X } from "lucide-react";
import type { MasterStreamingItem } from "@/lib/streamingMasterCatalog";

type UnknownRecord = Record<string, unknown>;

type GamePhysics = {
  moveSpeed: number;
  jumpVelocity: number;
  gravity: number;
  maxFallSpeed: number;
  groundY: number;
  minX: number;
  maxX: number;
};

type EnemyRules = {
  minX: number;
  maxX: number;
  speed: number;
  respawnCycle: number[];
};

type GameAssets = {
  attract: string | null;
  background: string | null;
  playerIdle: string | null;
  playerRun: string | null;
  playerJump: string | null;
  playerAttack: string | null;
  enemy: string | null;
  hitFx: string | null;
  collectible: string | null;
};

type GameManifest = {
  contentId: string;
  title: string;
  synopsis: string;
  creatorCredit: string | null;
  physics: GamePhysics;
  enemy: EnemyRules;
  assets: GameAssets;
};

type Snapshot = {
  playerX: number;
  playerY: number;
  playerVX: number;
  playerVY: number;
  grounded: boolean;
  facing: number;
  health: number;
  score: number;
  enemyX: number;
  enemyY: number;
  enemyAlive: boolean;
  coreX: number;
  coreY: number;
  attackFrames: number;
  invulnFrames: number;
  hitFxX: number;
  hitFxY: number;
  hitFxFrames: number;
  elapsedTicks: number;
};

type RuntimeMode = "landing" | "game" | "paused" | "gameover";

const CATALOG_FEED_URL =
  import.meta.env.VITE_PS_CATALOG_FEED_URL ||
  "https://upivslgwjtvqymonliib.supabase.co/functions/v1/catalog-feed";

const DEFAULT_SNAPSHOT: Snapshot = {
  playerX: 420,
  playerY: 900,
  playerVX: 0,
  playerVY: 0,
  grounded: true,
  facing: 1,
  health: 3,
  score: 0,
  enemyX: 1400,
  enemyY: 840,
  enemyAlive: true,
  coreX: 960,
  coreY: 805,
  attackFrames: 0,
  invulnFrames: 0,
  hitFxX: 0,
  hitFxY: 0,
  hitFxFrames: 0,
  elapsedTicks: 0,
};

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as UnknownRecord : null;
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function firstString(record: UnknownRecord | null, keys: string[]): string | null {
  if (!record) return null;
  for (const key of keys) {
    const value = asString(record[key]);
    if (value) return value;
  }
  return null;
}

function assetUrl(value: unknown): string | null {
  if (typeof value === "string") return asString(value);
  const record = asRecord(value);
  if (!record) return null;
  return firstString(record, ["url", "asset_url", "image_url", "uri", "src"]);
}

function arenaFallback(): GameManifest {
  const storage = "https://upivslgwjtvqymonliib.supabase.co/storage/v1/object/public/marketplace-previews/games/press-start-arena/";
  return {
    contentId: "press-start-arena",
    title: "PRESS START ARENA",
    synopsis: "Classic living-room arcade. Collect energy cores, survive the drone, and stack score.",
    creatorCredit: null,
    physics: {
      moveSpeed: 8,
      jumpVelocity: -22,
      gravity: 1.15,
      maxFallSpeed: 24,
      groundY: 900,
      minX: 100,
      maxX: 1820,
    },
    enemy: {
      minX: 880,
      maxX: 1740,
      speed: 4.5,
      respawnCycle: [1450, 1180, 1650],
    },
    assets: {
      attract: `${storage}attract_arena.jpg`,
      background: `${storage}bg_arena.jpg`,
      playerIdle: `${storage}player_idle.png`,
      playerRun: `${storage}player_run.png`,
      playerJump: `${storage}player_jump.png`,
      playerAttack: `${storage}player_attack.png`,
      enemy: `${storage}enemy_drone.png`,
      hitFx: `${storage}fx_hit.png`,
      collectible: `${storage}collectible_core.png`,
    },
  };
}

function normalizeManifest(root: UnknownRecord, fallbackId: string): GameManifest | null {
  let payload = root;
  for (const key of ["data", "manifest", "game_manifest"] as const) {
    const nested = asRecord(payload[key]);
    if (nested) payload = nested;
  }
  const item = asRecord(payload.item);
  if (item && !Array.isArray(payload.scenes)) payload = item;

  const physics = asRecord(payload.physics);
  if (!physics) return null;
  const bounds = asRecord(physics.bounds);

  let scene: UnknownRecord | null = null;
  if (Array.isArray(payload.scenes) && payload.scenes.length) scene = asRecord(payload.scenes[0]);
  if (!scene) scene = asRecord(payload.scene);
  if (!scene) return null;

  const enemyRaw = Array.isArray(scene.enemies) && scene.enemies.length ? asRecord(scene.enemies[0]) : null;
  const patrol = asRecord(enemyRaw?.patrol);
  const respawn = Array.isArray(enemyRaw?.respawn_x_cycle)
    ? enemyRaw!.respawn_x_cycle.filter((value): value is number => typeof value === "number" && Number.isFinite(value))
    : [1450, 1180, 1650];

  const assets = asRecord(payload.assets);
  const artwork = asRecord(payload.artwork);
  const creator = asRecord(payload.creator);

  return {
    contentId: firstString(payload, ["content_id", "game_id", "id"]) || fallbackId,
    title: firstString(payload, ["title", "name"]) || "PRESS START GAME",
    synopsis: firstString(payload, ["synopsis", "description"]) || "A Press Start playable release.",
    creatorCredit: firstString(creator, ["creator_credit", "creator_name"]) || firstString(payload, ["creator_credit", "creator_name"]),
    physics: {
      moveSpeed: asNumber(physics.move_speed_per_tick, 8),
      jumpVelocity: asNumber(physics.jump_velocity, -22),
      gravity: asNumber(physics.gravity_per_tick, 1.15),
      maxFallSpeed: asNumber(physics.max_fall_speed, 24),
      groundY: asNumber(physics.ground_y, 900),
      minX: asNumber(bounds?.min_x, 100),
      maxX: asNumber(bounds?.max_x, 1820),
    },
    enemy: {
      minX: asNumber(patrol?.min_x, 880),
      maxX: asNumber(patrol?.max_x, 1740),
      speed: asNumber(patrol?.speed_per_tick, 4.5),
      respawnCycle: respawn.length ? respawn : [1450, 1180, 1650],
    },
    assets: {
      attract: firstString(artwork, ["attract_url"]) || assetUrl(assets?.attract) || assetUrl(assets?.poster),
      background: assetUrl(assets?.background),
      playerIdle: assetUrl(assets?.player_idle),
      playerRun: assetUrl(assets?.player_run),
      playerJump: assetUrl(assets?.player_jump),
      playerAttack: assetUrl(assets?.player_attack),
      enemy: assetUrl(assets?.enemy) || assetUrl(assets?.enemy_drone),
      hitFx: assetUrl(assets?.fx_hit),
      collectible: assetUrl(assets?.collectible) || assetUrl(assets?.collectible_core),
    },
  };
}

function overlap(ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number): boolean {
  const aLeft = ax - aw / 2;
  const aRight = ax + aw / 2;
  const aTop = ay - ah / 2;
  const aBottom = ay + ah / 2;
  const bLeft = bx - bw / 2;
  const bRight = bx + bw / 2;
  const bTop = by - bh / 2;
  const bBottom = by + bh / 2;
  return aLeft < bRight && aRight > bLeft && aTop < bBottom && aBottom > bTop;
}

function pct(value: number, total: number): string {
  return `${(value / total) * 100}%`;
}

function playerArt(manifest: GameManifest, snapshot: Snapshot): string | null {
  if (snapshot.attackFrames > 0 && manifest.assets.playerAttack) return manifest.assets.playerAttack;
  if (!snapshot.grounded && manifest.assets.playerJump) return manifest.assets.playerJump;
  if (snapshot.playerVX !== 0 && manifest.assets.playerRun) return manifest.assets.playerRun;
  return manifest.assets.playerIdle;
}

export default function StreamingGameRuntime({ item }: { item: MasterStreamingItem }) {
  const [manifest, setManifest] = useState<GameManifest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<RuntimeMode>("landing");
  const [snapshot, setSnapshot] = useState<Snapshot>(DEFAULT_SNAPSHOT);

  const stateRef = useRef<Snapshot>({ ...DEFAULT_SNAPSHOT });
  const keysRef = useRef({ left: false, right: false });
  const enemyDirRef = useRef(1);
  const enemyRespawnRef = useRef(0);
  const respawnIndexRef = useRef(0);
  const coreIndexRef = useRef(0);
  const attackHitRef = useRef(false);
  const lastRenderRef = useRef(0);
  const modeRef = useRef<RuntimeMode>("landing");

  const setRuntimeMode = useCallback((next: RuntimeMode) => {
    modeRef.current = next;
    setMode(next);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const url = new URL(CATALOG_FEED_URL);
        url.searchParams.set("format", "game-manifest");
        url.searchParams.set("content_id", item.sourceId);
        const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
        if (!res.ok) throw new Error(`GAME manifest returned ${res.status}`);
        const raw = asRecord(await res.json());
        if (!raw) throw new Error("GAME manifest payload was not an object");
        const normalized = normalizeManifest(raw, item.sourceId);
        if (!normalized) throw new Error("GAME manifest did not contain physics and a playable scene");
        if (!cancelled) setManifest(normalized);
      } catch (err) {
        if (item.sourceId === "press-start-arena") {
          if (!cancelled) setManifest(arenaFallback());
        } else if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load game manifest");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [item.sourceId]);

  const saveProgress = useCallback((current: Snapshot) => {
    if (!manifest) return;
    try {
      window.localStorage.setItem(`ps-streaming-play:${manifest.contentId}`, JSON.stringify({
        content_id: manifest.contentId,
        checkpoint_id: "arena_01",
        score: current.score,
        elapsed_seconds: Math.floor(current.elapsedTicks / 60),
        last_played_at: new Date().toISOString(),
        completed: false,
      }));
    } catch {
      // Device-local progress is best effort.
    }
  }, [manifest]);

  const spawnCore = useCallback((state: Snapshot) => {
    const positions = [720, 1040, 1320, 1580, 520];
    coreIndexRef.current = (coreIndexRef.current + 1) % positions.length;
    state.coreX = positions[coreIndexRef.current];
    state.coreY = 805;
  }, []);

  const resetGame = useCallback(() => {
    const next = { ...DEFAULT_SNAPSHOT };
    enemyDirRef.current = 1;
    enemyRespawnRef.current = 0;
    respawnIndexRef.current = 0;
    coreIndexRef.current = 0;
    attackHitRef.current = false;
    keysRef.current.left = false;
    keysRef.current.right = false;
    spawnCore(next);
    stateRef.current = next;
    setSnapshot({ ...next });
  }, [spawnCore]);

  const startGame = useCallback(() => {
    if (!manifest) return;
    resetGame();
    setRuntimeMode("game");
  }, [manifest, resetGame, setRuntimeMode]);

  const jump = useCallback(() => {
    const state = stateRef.current;
    if (modeRef.current !== "game" || !manifest || !state.grounded) return;
    state.playerVY = manifest.physics.jumpVelocity;
    state.grounded = false;
  }, [manifest]);

  const attack = useCallback(() => {
    const state = stateRef.current;
    if (modeRef.current !== "game" || state.attackFrames > 0) return;
    state.attackFrames = 18;
    attackHitRef.current = false;
  }, []);

  useEffect(() => {
    if (!manifest) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (["ArrowLeft", "ArrowRight", "ArrowUp", " ", "Enter", "Escape"].includes(event.key)) event.preventDefault();
      if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") keysRef.current.left = true;
      if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") keysRef.current.right = true;
      if (event.repeat) return;
      if (event.key === "ArrowUp" || event.key.toLowerCase() === "w" || event.key === " ") jump();
      if (event.key === "Enter" || event.key.toLowerCase() === "x" || event.key.toLowerCase() === "j") attack();
      if (event.key === "Escape") {
        if (modeRef.current === "game") {
          saveProgress(stateRef.current);
          setRuntimeMode("paused");
        } else if (modeRef.current === "paused") setRuntimeMode("game");
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") keysRef.current.left = false;
      if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") keysRef.current.right = false;
    };
    window.addEventListener("keydown", onKeyDown, { passive: false });
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [manifest, jump, attack, saveProgress, setRuntimeMode]);

  useEffect(() => {
    if (!manifest || mode !== "game") return;
    let frame = 0;
    let last = performance.now();
    let accumulator = 0;
    const stepMs = 1000 / 60;

    const simulate = () => {
      const state = stateRef.current;
      const physics = manifest.physics;
      state.elapsedTicks += 1;
      if (state.invulnFrames > 0) state.invulnFrames -= 1;
      if (state.hitFxFrames > 0) state.hitFxFrames -= 1;

      if (keysRef.current.left && !keysRef.current.right) {
        state.playerVX = -physics.moveSpeed;
        state.facing = -1;
      } else if (keysRef.current.right && !keysRef.current.left) {
        state.playerVX = physics.moveSpeed;
        state.facing = 1;
      } else {
        state.playerVX = 0;
      }

      if (!state.grounded) {
        state.playerVY = Math.min(physics.maxFallSpeed, state.playerVY + physics.gravity);
      }
      state.playerX += state.playerVX;
      state.playerY += state.playerVY;
      state.playerX = Math.max(physics.minX, Math.min(physics.maxX, state.playerX));
      if (state.playerY >= physics.groundY) {
        state.playerY = physics.groundY;
        state.playerVY = 0;
        state.grounded = true;
      }

      if (overlap(state.playerX, state.playerY - 100, 105, 205, state.coreX, state.coreY - 45, 96, 96)) {
        state.score += 250;
        spawnCore(state);
      }

      if (state.enemyAlive) {
        state.enemyX += manifest.enemy.speed * enemyDirRef.current;
        if (state.enemyX <= manifest.enemy.minX) {
          state.enemyX = manifest.enemy.minX;
          enemyDirRef.current = 1;
        } else if (state.enemyX >= manifest.enemy.maxX) {
          state.enemyX = manifest.enemy.maxX;
          enemyDirRef.current = -1;
        }
      } else {
        enemyRespawnRef.current -= 1;
        if (enemyRespawnRef.current <= 0) {
          respawnIndexRef.current = (respawnIndexRef.current + 1) % manifest.enemy.respawnCycle.length;
          state.enemyX = manifest.enemy.respawnCycle[respawnIndexRef.current] ?? 1400;
          state.enemyY = 840;
          state.enemyAlive = true;
        }
      }

      if (state.attackFrames > 0) {
        const currentAttackFrame = 18 - state.attackFrames;
        if (currentAttackFrame >= 3 && currentAttackFrame <= 12 && !attackHitRef.current && state.enemyAlive) {
          const attackCenterX = state.playerX + 130 * state.facing;
          const attackCenterY = state.playerY - 150;
          if (overlap(attackCenterX, attackCenterY, 150, 120, state.enemyX, state.enemyY - 90, 140, 140)) {
            attackHitRef.current = true;
            state.score += 100;
            state.enemyAlive = false;
            state.hitFxX = state.enemyX;
            state.hitFxY = state.enemyY;
            state.hitFxFrames = 18;
            enemyRespawnRef.current = 90;
          }
        }
        state.attackFrames -= 1;
      }

      if (state.enemyAlive && state.invulnFrames === 0 && overlap(state.playerX, state.playerY - 120, 110, 240, state.enemyX, state.enemyY - 90, 140, 140)) {
        state.health -= 1;
        state.invulnFrames = 60;
        if (state.health <= 0) {
          saveProgress(state);
          setRuntimeMode("gameover");
        }
      }
    };

    const loop = (now: number) => {
      if (modeRef.current !== "game") return;
      const delta = Math.min(100, now - last);
      last = now;
      accumulator += delta;
      while (accumulator >= stepMs && modeRef.current === "game") {
        simulate();
        accumulator -= stepMs;
      }
      if (now - lastRenderRef.current >= 33) {
        setSnapshot({ ...stateRef.current });
        lastRenderRef.current = now;
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [manifest, mode, saveProgress, setRuntimeMode, spawnCore]);

  const activePlayerArt = useMemo(() => manifest ? playerArt(manifest, snapshot) : null, [manifest, snapshot]);

  if (loading) {
    return <div className="flex min-h-[480px] items-center justify-center rounded-2xl bg-black"><Loader2 className="h-8 w-8 animate-spin text-[#f0ae2e]" /></div>;
  }
  if (error || !manifest) {
    return (
      <div className="flex min-h-[480px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-black px-6 text-center">
        <Gamepad2 className="h-12 w-12 text-zinc-700" />
        <div className="mt-4 text-xs font-black tracking-[0.16em] text-zinc-500">GAME RUNTIME UNAVAILABLE</div>
        {error && <p className="mt-2 text-xs text-zinc-700">{error}</p>}
      </div>
    );
  }

  if (mode === "landing") {
    return (
      <div className="relative min-h-[560px] overflow-hidden rounded-2xl border border-white/10 bg-[#070707]">
        {manifest.assets.attract && <img src={manifest.assets.attract} alt="" className="absolute inset-0 h-full w-full object-cover opacity-45" />}
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/90 to-black/35" />
        <div className="relative flex min-h-[560px] max-w-3xl flex-col justify-center p-7 sm:p-12">
          <div className="text-[10px] font-black tracking-[0.2em] text-[#f0ae2e]">PLAY · CLASSIC ARCADE</div>
          <h3 className="mt-4 text-4xl font-black tracking-[-0.04em] text-white sm:text-6xl">{manifest.title}</h3>
          {manifest.creatorCredit && <p className="mt-3 text-sm font-bold text-zinc-400">{manifest.creatorCredit}</p>}
          <p className="mt-5 max-w-2xl text-sm leading-7 text-zinc-300 sm:text-base">{manifest.synopsis}</p>
          <div className="mt-6 text-[10px] font-black tracking-[0.14em] text-zinc-600">KEYBOARD READY · ON-SCREEN CONTROLS · SAME FROZEN GAME RULES</div>
          <button type="button" onClick={startGame} className="mt-8 inline-flex w-fit items-center gap-2 rounded-full bg-[#f0ae2e] px-7 py-3.5 text-sm font-black text-black transition hover:bg-white">
            <Play className="h-4 w-4" fill="currentColor" /> START GAME
          </button>
        </div>
      </div>
    );
  }

  const gameScaleStyle = { aspectRatio: "16 / 9" };
  const opacity = snapshot.invulnFrames > 0 && Math.floor(snapshot.invulnFrames / 4) % 2 === 0 ? 0.35 : 1;

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-black">
      <div className="relative w-full overflow-hidden bg-[#101010]" style={gameScaleStyle}>
        {manifest.assets.background && <img src={manifest.assets.background} alt="" className="absolute inset-0 h-full w-full object-cover" />}
        <div className="absolute inset-x-0 top-0 z-20 flex h-[11%] items-center justify-between bg-black/70 px-[3.6%] text-[clamp(10px,1.4vw,22px)] font-black text-white">
          <span>LIFE {Array.from({ length: 3 }, (_, i) => i < snapshot.health ? "●" : "○").join(" ")}</span>
          <span className="hidden text-[clamp(8px,1vw,16px)] text-zinc-400 sm:block">CORE +250 · DRONE +100 · DON'T GET TOUCHED</span>
          <span>SCORE {String(snapshot.score).padStart(6, "0")}</span>
        </div>

        <div className="absolute" style={{ left: pct(snapshot.coreX - 48, 1920), top: pct(snapshot.coreY - 96, 1080), width: pct(96, 1920), height: pct(96, 1080) }}>
          {manifest.assets.collectible ? <img src={manifest.assets.collectible} alt="Energy core" className="h-full w-full object-contain" /> : <div className="grid h-full w-full place-items-center rounded-full bg-[#f0ae2e] font-black text-black">+</div>}
        </div>

        {snapshot.enemyAlive && (
          <div className="absolute" style={{ left: pct(snapshot.enemyX - 85, 1920), top: pct(snapshot.enemyY - 170, 1080), width: pct(170, 1920), height: pct(170, 1080) }}>
            {manifest.assets.enemy ? <img src={manifest.assets.enemy} alt="Enemy drone" className="h-full w-full object-contain" /> : <div className="grid h-full w-full place-items-center rounded-xl bg-rose-500 font-black text-white">MOD</div>}
          </div>
        )}

        <div className="absolute" style={{ left: pct(snapshot.playerX - 90, 1920), top: pct(snapshot.playerY - 260, 1080), width: pct(180, 1920), height: pct(260, 1080), opacity, transform: snapshot.facing < 0 ? "scaleX(-1)" : undefined }}>
          {activePlayerArt ? <img src={activePlayerArt} alt="Player" className="h-full w-full object-contain" /> : <div className="grid h-full w-full place-items-center rounded-xl bg-[#f0ae2e] font-black text-black">P1</div>}
        </div>

        {snapshot.hitFxFrames > 0 && manifest.assets.hitFx && (
          <img src={manifest.assets.hitFx} alt="" className="absolute object-contain" style={{ left: pct(snapshot.hitFxX - 85, 1920), top: pct(snapshot.hitFxY - 170, 1080), width: pct(170, 1920), height: pct(170, 1080) }} />
        )}

        <div className="absolute inset-x-0 bottom-[2.5%] z-20 text-center text-[clamp(8px,1.1vw,18px)] font-bold text-zinc-300">A/D OR ←/→ MOVE · W/↑/SPACE JUMP · ENTER/X ATTACK · ESC PAUSE</div>

        {mode === "paused" && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/85 backdrop-blur-sm">
            <div className="w-full max-w-sm px-5 text-center">
              <h4 className="text-4xl font-black text-white">PAUSED</h4>
              <div className="mt-7 grid gap-3">
                <button type="button" onClick={() => setRuntimeMode("game")} className="rounded-full bg-[#f0ae2e] px-6 py-3 text-sm font-black text-black"><Play className="mr-2 inline h-4 w-4" /> RESUME</button>
                <button type="button" onClick={() => { resetGame(); setRuntimeMode("game"); }} className="rounded-full border border-white/15 px-6 py-3 text-sm font-black text-white"><RotateCcw className="mr-2 inline h-4 w-4" /> RESTART</button>
                <button type="button" onClick={() => { saveProgress(stateRef.current); setRuntimeMode("landing"); }} className="rounded-full border border-white/15 px-6 py-3 text-sm font-black text-zinc-400"><X className="mr-2 inline h-4 w-4" /> EXIT GAME</button>
              </div>
            </div>
          </div>
        )}

        {mode === "gameover" && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/90 backdrop-blur-sm">
            <div className="text-center">
              <div className="text-[10px] font-black tracking-[0.18em] text-[#f0ae2e]">PRESS START ARCADE</div>
              <h4 className="mt-3 text-5xl font-black text-white">GAME OVER</h4>
              <p className="mt-4 text-2xl font-black text-[#f0ae2e]">SCORE {snapshot.score}</p>
              <button type="button" onClick={startGame} className="mt-7 rounded-full bg-white px-7 py-3.5 text-sm font-black text-black hover:bg-[#f0ae2e]">RESTART</button>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 border-t border-white/[0.07] p-4 sm:grid-cols-5">
        <button type="button" onPointerDown={() => { keysRef.current.left = true; }} onPointerUp={() => { keysRef.current.left = false; }} onPointerCancel={() => { keysRef.current.left = false; }} className="rounded-xl border border-white/10 py-3 text-sm font-black text-zinc-300 active:bg-[#f0ae2e] active:text-black">← LEFT</button>
        <button type="button" onPointerDown={() => { keysRef.current.right = true; }} onPointerUp={() => { keysRef.current.right = false; }} onPointerCancel={() => { keysRef.current.right = false; }} className="rounded-xl border border-white/10 py-3 text-sm font-black text-zinc-300 active:bg-[#f0ae2e] active:text-black">RIGHT →</button>
        <button type="button" onClick={jump} className="rounded-xl border border-white/10 py-3 text-sm font-black text-zinc-300 active:bg-[#f0ae2e] active:text-black">↑ JUMP</button>
        <button type="button" onClick={attack} className="rounded-xl border border-white/10 py-3 text-sm font-black text-zinc-300 active:bg-[#f0ae2e] active:text-black">ATTACK</button>
        <button type="button" onClick={() => { if (modeRef.current === "game") { saveProgress(stateRef.current); setRuntimeMode("paused"); } else if (modeRef.current === "paused") setRuntimeMode("game"); }} className="col-span-2 rounded-xl border border-white/10 py-3 text-sm font-black text-zinc-500 sm:col-span-1"><Pause className="mr-2 inline h-4 w-4" /> PAUSE</button>
      </div>
    </div>
  );
}
