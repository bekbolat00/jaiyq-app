"use client";

import { PerspectiveCamera } from "@react-three/drei";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { forwardRef, Suspense, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import {
  AnimationAction,
  AnimationClip,
  AnimationMixer,
  CanvasTexture,
  Color,
  DoubleSide,
  Group,
  LoopOnce,
  Material,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  RepeatWrapping,
  SRGBColorSpace,
  Vector3,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import {
  BALL_RADIUS,
  GOAL_HALF_WIDTH,
  GOAL_HEIGHT,
  PENALTY_SPOT,
  ballPosition,
  wallFor,
  type GameMode,
  type KickSpot,
  type ShotOutcome,
} from "@/lib/game/penalty";

/** Реальный полёт мяча длится 0.35–0.7 с — замедляем, чтобы было видно, что произошло. */
export const SLOW_MO = 1.7;
const NET_DEPTH = 2;
const CAMERA_TARGET = new Vector3(0, 1.25, 0);
/** Сколько метров поперёк должно помещаться на линии ворот: ворота 7.3 м + поля. */
const VISIBLE_HALF_WIDTH = 5.4;
/** Разбег до касания мяча, мс. */
const RUN_MS = 560;
const CONTACT_MS = RUN_MS + 70;

/** Форма соперника (стенка на штрафном). */
const RIVAL_KIT = { shirt: "#c0262d", trim: "#1f2937", shorts: "#f3f4f6", socks: "#c0262d" };

export type PenaltySceneHandle = {
  /** Разбег и замах, пока сервер считает исход. */
  windUp: () => void;
  /** Проиграть удар по исходу с сервера. Колбэк — когда мяч «остановился». */
  play: (outcome: ShotOutcome, onDone: () => void) => void;
  reset: () => void;
};

// ─── Текстуры, нарисованные на лету (без загрузки файлов) ────────────────────

/** Детерминированный генератор (mulberry32): узор газона и трибун одинаковый при каждом открытии. */
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeCanvasTexture(draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void, w: number, h: number) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext("2d")!, w, h);
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Газон с полосами покоса и разметкой штрафной. */
function Pitch() {
  const tex = useMemo(() => {
    const t = makeCanvasTexture(
      (ctx, w, h) => {
        const stripes = 12;
        for (let i = 0; i < stripes; i++) {
          ctx.fillStyle = i % 2 ? "#1f6b35" : "#237a3c";
          ctx.fillRect(0, (h / stripes) * i, w, h / stripes + 1);
        }
        const rnd = seeded(7);
        for (let i = 0; i < 9000; i++) {
          ctx.fillStyle = `rgba(0,0,0,${rnd() * 0.06})`;
          ctx.fillRect(rnd() * w, rnd() * h, 2, 2);
        }
      },
      512,
      512,
    );
    t.wrapS = t.wrapT = RepeatWrapping;
    return t;
  }, []);

  const line = "#e8f3ec";
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 6]} receiveShadow>
        <planeGeometry args={[70, 60]} />
        <meshStandardMaterial map={tex} roughness={0.95} />
      </mesh>
      {/* Линия ворот, вратарская и штрафная площадь, точка пенальти. */}
      {[
        { w: 40, z: 0 },
        { w: 18.32, z: 5.5 },
        { w: 40.32, z: 16.5 },
      ].map((l, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, l.z]}>
          <planeGeometry args={[l.w, 0.12]} />
          <meshBasicMaterial color={line} />
        </mesh>
      ))}
      {[-9.16, 9.16].map((x) => (
        <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.005, 2.75]}>
          <planeGeometry args={[0.12, 5.5]} />
          <meshBasicMaterial color={line} />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, PENALTY_SPOT.z]}>
        <circleGeometry args={[0.14, 24]} />
        <meshBasicMaterial color={line} />
      </mesh>
    </group>
  );
}

/** Трибуны за воротами: огни болельщиков и LED-борт в цветах клуба. */
function Stands() {
  const crowd = useMemo(
    () =>
      makeCanvasTexture(
        (ctx, w, h) => {
          ctx.fillStyle = "#050a1c";
          ctx.fillRect(0, 0, w, h);
          const palette = ["#0e1f73", "#1b2f8f", "#00c8d8", "#f3f6ff", "#0a7fa8", "#27367a"];
          const rnd = seeded(33);
          // Ряды трибун — тонкие полосы, на них мелкие «болельщики».
          for (let row = 0; row < 26; row++) {
            const y = (h / 26) * row;
            ctx.fillStyle = row % 2 ? "#070e26" : "#091230";
            ctx.fillRect(0, y, w, h / 26);
            for (let i = 0; i < 520; i++) {
              ctx.fillStyle = palette[Math.floor(rnd() * palette.length)];
              ctx.globalAlpha = 0.18 + rnd() * 0.5;
              ctx.fillRect(rnd() * w, y + 4 + rnd() * (h / 26 - 10), 3, 5);
            }
          }
          ctx.globalAlpha = 1;
        },
        2048,
        512,
      ),
    [],
  );
  const board = useMemo(
    () =>
      makeCanvasTexture(
        (ctx, w, h) => {
          const grad = ctx.createLinearGradient(0, 0, w, 0);
          grad.addColorStop(0, "#0e1f73");
          grad.addColorStop(0.5, "#13288f");
          grad.addColorStop(1, "#0e1f73");
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, w, h);
          ctx.fillStyle = "#00e8f0";
          ctx.font = "700 72px Geist, Arial, sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          for (let i = 0; i < 3; i++) ctx.fillText("ФК ЖАЙЫК", (w / 3) * (i + 0.5), h / 2 + 4);
        },
        1536,
        128,
      ),
    [],
  );

  return (
    <group>
      {/* Трибуна уходит вверх под углом — ярусы видны до самого козырька. */}
      <mesh position={[0, 9.5, -13]} rotation={[0.32, 0, 0]}>
        <planeGeometry args={[80, 21]} />
        <meshBasicMaterial map={crowd} />
      </mesh>
      <mesh position={[0, 20.2, -16.5]} rotation={[-0.25, 0, 0]}>
        <planeGeometry args={[80, 4]} />
        <meshBasicMaterial color="#030612" />
      </mesh>
      {/* Прожекторы на козырьке: яркое ядро и мягкое свечение вокруг. */}
      {[-24, -8, 8, 24].map((x) => (
        <group key={x} position={[x, 19.6, -15.5]}>
          <mesh>
            <planeGeometry args={[3.2, 0.9]} />
            <meshBasicMaterial color="#f4fbff" toneMapped={false} />
          </mesh>
          <mesh position={[0, 0, -0.1]}>
            <circleGeometry args={[4.2, 32]} />
            <meshBasicMaterial color="#9fdcff" transparent opacity={0.16} depthWrite={false} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.5, -4.2]}>
        <planeGeometry args={[36, 1]} />
        <meshBasicMaterial map={board} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Ворота: штанги, перекладина и сетка, которая прогибается от мяча. */
function Goal({ netRef }: { netRef: React.RefObject<Mesh | null> }) {
  const r = 0.06;
  return (
    <group>
      {[-GOAL_HALF_WIDTH, GOAL_HALF_WIDTH].map((x) => (
        <mesh key={x} position={[x, GOAL_HEIGHT / 2, 0]} castShadow>
          <cylinderGeometry args={[r, r, GOAL_HEIGHT + r, 16]} />
          <meshStandardMaterial color="#f5f7fb" roughness={0.3} metalness={0.1} />
        </mesh>
      ))}
      <mesh position={[0, GOAL_HEIGHT, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[r, r, GOAL_HALF_WIDTH * 2 + r * 2, 16]} />
        <meshStandardMaterial color="#f5f7fb" roughness={0.3} metalness={0.1} />
      </mesh>
      {/* Задняя сетка — сегментированная плоскость, её вершины двигаем при голе. */}
      <mesh ref={netRef} position={[0, GOAL_HEIGHT / 2, -NET_DEPTH]}>
        <planeGeometry args={[GOAL_HALF_WIDTH * 2, GOAL_HEIGHT, 36, 14]} />
        <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.35} />
      </mesh>
      {[-GOAL_HALF_WIDTH, GOAL_HALF_WIDTH].map((x) => (
        <mesh key={x} position={[x, GOAL_HEIGHT / 2, -NET_DEPTH / 2]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[NET_DEPTH, GOAL_HEIGHT, 8, 14]} />
          <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.22} side={DoubleSide} />
        </mesh>
      ))}
      <mesh position={[0, GOAL_HEIGHT, -NET_DEPTH / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[GOAL_HALF_WIDTH * 2, NET_DEPTH, 36, 8]} />
        <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.22} side={DoubleSide} />
      </mesh>
    </group>
  );
}

/** Мяч: белый с тёмно-синими пятиугольниками. */
function Ball({ ballRef, spot }: { ballRef: React.RefObject<Mesh | null>; spot: KickSpot }) {
  const tex = useMemo(
    () =>
      makeCanvasTexture(
        (ctx, w, h) => {
          ctx.fillStyle = "#f8fafc";
          ctx.fillRect(0, 0, w, h);
          ctx.fillStyle = "#0e1f73";
          const spots = [
            [0.12, 0.3], [0.37, 0.3], [0.62, 0.3], [0.87, 0.3],
            [0.25, 0.72], [0.5, 0.72], [0.75, 0.72], [1.0, 0.72], [0, 0.72],
            [0.5, 0.02], [0.5, 0.98],
          ];
          for (const [sx, sy] of spots) {
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
              const a = (Math.PI * 2 * i) / 5 - Math.PI / 2;
              ctx.lineTo(sx * w + Math.cos(a) * w * 0.055, sy * h + Math.sin(a) * h * 0.1);
            }
            ctx.closePath();
            ctx.fill();
          }
        },
        512,
        256,
      ),
    [],
  );
  return (
    <mesh ref={ballRef} position={[spot.x, BALL_RADIUS, spot.z]} castShadow>
      <sphereGeometry args={[BALL_RADIUS, 32, 32]} />
      <meshStandardMaterial map={tex} roughness={0.45} />
    </mesh>
  );
}


/** Направление «к воротам» и «вправо» от точки удара — для расстановки игроков и камеры. */
function frameFor(spot: KickSpot) {
  const f = new Vector3(-spot.x, 0, -spot.z).normalize();
  const r = new Vector3(-f.z, 0, f.x);
  return { f, r, yaw: Math.atan2(f.x, f.z) };
}

type Kit = typeof RIVAL_KIT;

/** Стилизованный футболист соперника для стенки. */
function Footballer({ kit, skin = "#c89a78", hair = "#1c1917" }: { kit: Kit; skin?: string; hair?: string }) {
  const leg = (x: number) => (
    <group position={[x, 0.92, 0]}>
      <mesh position={[0, -0.2, 0]} castShadow>
        <capsuleGeometry args={[0.085, 0.26, 6, 12]} />
        <meshStandardMaterial color={kit.shorts} roughness={0.7} />
      </mesh>
      <mesh position={[0, -0.58, 0]} castShadow>
        <capsuleGeometry args={[0.065, 0.36, 6, 12]} />
        <meshStandardMaterial color={kit.socks} roughness={0.7} />
      </mesh>
      <mesh position={[0, -0.86, 0.06]} castShadow>
        <boxGeometry args={[0.11, 0.08, 0.26]} />
        <meshStandardMaterial color="#111827" roughness={0.5} />
      </mesh>
    </group>
  );
  const arm = (x: number) => (
    <group position={[x, 1.42, 0]}>
      <mesh position={[0, -0.14, 0]} castShadow>
        <capsuleGeometry args={[0.058, 0.14, 6, 12]} />
        <meshStandardMaterial color={kit.shirt} roughness={0.65} />
      </mesh>
      <mesh position={[0, -0.4, 0]} castShadow>
        <capsuleGeometry args={[0.048, 0.26, 6, 12]} />
        <meshStandardMaterial color={skin} roughness={0.8} />
      </mesh>
    </group>
  );
  return (
    <group>
      {leg(-0.11)}
      {leg(0.11)}
      <group position={[0, 0.92, 0]}>
        <mesh position={[0, 0.3, 0]} castShadow>
          <capsuleGeometry args={[0.2, 0.32, 8, 16]} />
          <meshStandardMaterial color={kit.shirt} roughness={0.65} />
        </mesh>
        <mesh position={[0, 0.66, 0]} castShadow>
          <sphereGeometry args={[0.115, 20, 20]} />
          <meshStandardMaterial color={skin} roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.72, -0.01]}>
          <sphereGeometry args={[0.118, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={hair} roughness={0.9} />
        </mesh>
      </group>
      {arm(-0.27)}
      {arm(0.27)}
    </group>
  );
}

/** Вратарь соперника: руки в стороны, перчатки. */
function Keeper({ keeperRef, armsRef }: { keeperRef: React.RefObject<Group | null>; armsRef: React.RefObject<Group | null> }) {
  const kit = "#f97316";
  return (
    <group ref={keeperRef} position={[0, 0, 0.35]}>
      {[-0.16, 0.16].map((x) => (
        <group key={x} position={[x, 0, 0]} rotation={[0, 0, x > 0 ? -0.08 : 0.08]}>
          <mesh position={[0, 0.3, 0]} castShadow>
            <capsuleGeometry args={[0.075, 0.42, 6, 12]} />
            <meshStandardMaterial color={kit} roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.66, 0]} castShadow>
            <capsuleGeometry args={[0.1, 0.22, 6, 12]} />
            <meshStandardMaterial color="#1f2937" roughness={0.7} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 1.17, 0]} castShadow>
        <capsuleGeometry args={[0.22, 0.5, 8, 16]} />
        <meshStandardMaterial color={kit} roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.66, 0]} castShadow>
        <sphereGeometry args={[0.13, 20, 20]} />
        <meshStandardMaterial color="#d8a47f" roughness={0.8} />
      </mesh>
      <group ref={armsRef} position={[0, 1.38, 0]}>
        {[-1, 1].map((side) => (
          <group key={side} position={[side * 0.28, 0, 0]} rotation={[0, 0, side * 0.85]}>
            <mesh position={[0, -0.28, 0]} castShadow>
              <capsuleGeometry args={[0.06, 0.46, 6, 12]} />
              <meshStandardMaterial color={kit} roughness={0.6} />
            </mesh>
            <mesh position={[0, -0.6, 0]} castShadow>
              <sphereGeometry args={[0.12, 16, 16]} />
              <meshStandardMaterial color="#f8fafc" roughness={0.5} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}

/** Стенка соперника: игроки плечом к плечу, лицом к мячу. */
function WallPlayers({ spot, wallRef }: { spot: KickSpot; wallRef: React.RefObject<Group | null> }) {
  const wall = useMemo(() => wallFor(spot), [spot]);
  const toBall = new Vector3(spot.x - wall.x, 0, spot.z - wall.z).normalize();
  const side = new Vector3(-toBall.z, 0, toBall.x);
  const yaw = Math.atan2(toBall.x, toBall.z);
  const offsets = Array.from({ length: wall.count }, (_, i) => (i - (wall.count - 1) / 2) * 0.54);
  return (
    <group ref={wallRef}>
      {offsets.map((o, i) => (
        <group key={i} position={[wall.x + side.x * o, 0, wall.z + side.z * o]} rotation={[0, yaw, 0]}>
          <WallMan />
        </group>
      ))}
    </group>
  );
}

function WallMan() {
  return <Footballer kit={RIVAL_KIT} skin="#b98663" />;
}

// ─── Анимация удара ──────────────────────────────────────────────────────────

type Timeline = {
  /** Когда игрок начал разбег. */
  runStart: number;
  outcome: ShotOutcome | null;
  onDone: (() => void) | null;
  /** Момент касания мяча: не раньше разбега и не раньше ответа сервера. */
  flightStart: number | null;
  done: boolean;
};

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

function afterPoint(o: ShotOutcome): Vector3 {
  const { x, y } = o.ball;
  switch (o.result) {
    case "goal":
      return new Vector3(x * 0.95, Math.max(BALL_RADIUS, y * 0.7), -NET_DEPTH + 0.2);
    case "saved":
      return new Vector3(x + Math.sign(x || 1) * 2.2, y + 1.2, 3.5);
    case "post":
      return new Vector3(x * 0.6, Math.max(BALL_RADIUS, y * 0.5), 4.5);
    default:
      return new Vector3(x * 1.6, y + 0.8, -8);
  }
}

/** 3D-модель игрока Жайыка из Meshy (Умбетов, №8) со скелетом Mixamo и анимациями. */
const SHOOTER_MODEL_URL = "/models/players/umetov/umetov-final.glb";
const CLIP_IDLE = "Idle_9";
const CLIP_RUN = "Run_03";
const CLIP_KICK = "Kick_a_Soccer_Ball";

/*
 * Тайминги удара сняты с клипа Kick_a_Soccer_Ball (1.71 с): к 0.30 с опорная
 * левая нога уже у мяча, правая проходит мяч на 0.48 с. Клип подключается
 * с 0.30 с, поэтому касание приходится ровно на CONTACT_MS, как и раньше.
 */
const KICK_FROM_S = 0.3;
const KICK_CONTACT_S = 0.48;
/** Пока сервер не ответил, нога замирает в замахе чуть до касания. */
const KICK_HOLD_S = 0.46;
const KICK_START_MS = CONTACT_MS - (KICK_CONTACT_S - KICK_FROM_S) * 1000;
/** Правый носок в момент касания — на 0.47 м впереди корня модели. */
const KICK_BALL_OFFSET = 0.47;
const FADE_RUN_S = 0.12;
const FADE_KICK_S = 0.1;
const FADE_IDLE_S = 0.3;

/**
 * Материал модели экспортирован «засвеченным»: нет карты metallic/roughness
 * (по glTF это металл 1 / шероховатость 1), текстура стоит ещё и свечением
 * на полную, specularColorFactor = 2. Правим копию материала при загрузке —
 * текстура и UV остаются, GLB и кэш загрузчика не трогаем. false — как в файле.
 * В umetov-final.glb уже вшита насыщенная baseColor (WebP) из статичной модели.
 */
const FIX_UMETOV_MATERIAL = true;

function matteUmetovMaterial(source: Material): Material {
  if (!(source instanceof MeshStandardMaterial)) return source;
  const m = source.clone();
  m.metalness = 0;
  m.roughness = 0.75;
  m.metalnessMap = null;
  m.roughnessMap = null;
  m.emissive.setRGB(0, 0, 0);
  m.emissiveMap = null;
  m.emissiveIntensity = 0;
  if (m instanceof MeshPhysicalMaterial) m.specularColor.setRGB(1, 1, 1);
  m.needsUpdate = true;
  return m;
}

type ShooterPhase = "idle" | "run" | "kick" | "recover";

/** Ручная перемотка клипа (у AnimationAction нет сеттера времени). */
function seekAction(action: AnimationAction, seconds: number) {
  action.time = Math.min(seconds, action.getClip().duration);
}

/**
 * Бьющий: GLB как есть — оригинальные материал, текстура и геометрия.
 * Idle крутится по умолчанию; после свайпа Run → Kick → снова Idle.
 * Клипы «на месте» (корень возвращается в исходную точку), поэтому модель
 * двигает код: от точки ожидания к мячу по прежней траектории разбега.
 */
function ShooterModel({ timeline, from, to, yaw }: {
  timeline: React.RefObject<Timeline | null>;
  from: Vector3;
  to: Vector3;
  yaw: number;
}) {
  const gltf = useLoader(GLTFLoader, SHOOTER_MODEL_URL);
  const root = useRef<Group>(null);
  const phase = useRef<ShooterPhase>("idle");
  const model = useMemo(() => {
    const clone = cloneSkinned(gltf.scene);
    clone.traverse((o) => {
      if ((o as Mesh).isMesh) {
        o.castShadow = true;
        // Границы скиннед-меша считаются по позе привязки — в анимации его может «отсечь».
        o.frustumCulled = false;
        const mesh = o as Mesh;
        if (FIX_UMETOV_MATERIAL) {
          mesh.material = Array.isArray(mesh.material) ? mesh.material.map(matteUmetovMaterial) : matteUmetovMaterial(mesh.material);
        }
      }
    });
    return clone;
  }, [gltf]);

  const rig = useMemo(() => {
    const mixer = new AnimationMixer(model);
    const action = (name: string) => {
      const clip = AnimationClip.findByName(gltf.animations, name);
      if (!clip) throw new Error(`В ${SHOOTER_MODEL_URL} нет клипа ${name}`);
      return mixer.clipAction(clip);
    };
    const kick = action(CLIP_KICK);
    kick.setLoop(LoopOnce, 1);
    kick.clampWhenFinished = true;
    // Время удара ведём вручную — чтобы касание совпало с вылетом мяча.
    kick.timeScale = 0;
    return { mixer, idle: action(CLIP_IDLE), run: action(CLIP_RUN), kick };
  }, [gltf, model]);

  useEffect(() => {
    rig.idle.play();
    return () => {
      rig.mixer.stopAllAction();
    };
  }, [rig]);

  useFrame((_, delta) => {
    const g = root.current;
    if (!g) return;
    const { mixer, idle, run, kick } = rig;
    const current = { idle, run, kick, recover: idle }[phase.current];
    const go = (to: ShooterPhase, next: AnimationAction, fade: number) => {
      next.reset().play();
      if (next !== current) next.crossFadeFrom(current, fade, false);
      phase.current = to;
    };

    const tl = timeline.current;
    g.rotation.set(0, yaw, 0);
    if (!tl) {
      // Новый удар: сразу в позу ожидания у точки разбега.
      if (phase.current !== "idle") {
        mixer.stopAllAction();
        idle.reset().play();
        phase.current = "idle";
      }
      g.position.copy(from);
      mixer.update(delta);
      return;
    }

    const since = performance.now() - tl.runStart;
    if (since < KICK_START_MS) {
      if (phase.current === "idle") go("run", run, FADE_RUN_S);
      const u = since / KICK_START_MS;
      g.position.lerpVectors(from, to, 1 - (1 - u) * (1 - u));
    } else {
      if (phase.current === "idle" || phase.current === "run") go("kick", kick, FADE_KICK_S);
      g.position.copy(to);
      // В фазе recover клип продолжает идти, пока плавно уходит в Idle.
      if (phase.current === "kick" || phase.current === "recover") {
        const t =
          tl.flightStart != null
            ? KICK_CONTACT_S + (performance.now() - tl.flightStart) / 1000
            : Math.min(KICK_FROM_S + (since - KICK_START_MS) / 1000, tl.outcome ? KICK_CONTACT_S : KICK_HOLD_S);
        seekAction(kick, t);
        if (phase.current === "kick" && t >= kick.getClip().duration - FADE_IDLE_S) go("recover", idle, FADE_IDLE_S);
      }
    }
    mixer.update(delta);
  });

  return (
    <group ref={root} position={from.toArray()} rotation={[0, yaw, 0]}>
      <primitive object={model} />
    </group>
  );
}

type SceneProps = { mode: GameMode; spot: KickSpot };

function SceneContent({ handleRef, mode, spot }: SceneProps & { handleRef: React.Ref<PenaltySceneHandle> }) {
  const ball = useRef<Mesh>(null);
  const keeper = useRef<Group>(null);
  const arms = useRef<Group>(null);
  const net = useRef<Mesh>(null);
  const wall = useRef<Group>(null);
  const timeline = useRef<Timeline | null>(null);
  const netBase = useRef<Float32Array | null>(null);

  const origin = mode === "freekick" ? spot : PENALTY_SPOT;
  const { f, r, yaw } = useMemo(() => frameFor(origin), [origin]);
  const wallData = useMemo(() => (mode === "freekick" ? wallFor(origin) : null), [mode, origin]);
  const keeperHome = wallData ? -Math.sign(wallData.x || 1) * 0.9 : 0;

  // Камера за плечом бьющего, смотрит на ворота.
  const cameraPos = useMemo(
    () => new Vector3(origin.x, 0, origin.z).addScaledVector(f, -8.4).addScaledVector(r, 0.12).setY(2.45),
    [origin, f, r],
  );
  const runFrom = useMemo(() => new Vector3(origin.x, 0, origin.z).addScaledVector(f, -2.4).addScaledVector(r, -0.4), [origin, f, r]);
  // Конец разбега: правая нога проходит ровно через мяч.
  const runTo = useMemo(() => new Vector3(origin.x, 0, origin.z).addScaledVector(f, -KICK_BALL_OFFSET), [origin, f]);

  const aspect = useThree((s) => s.size.width / Math.max(1, s.size.height));
  const camDist = Math.hypot(cameraPos.x, cameraPos.z);
  // Поле зрения под пропорции экрана: на узком телефоне ворота целиком и с полями.
  const fov = Math.min(72, Math.max(38, (2 * Math.atan(VISIBLE_HALF_WIDTH / aspect / camDist) * 180) / Math.PI));

  const resetPose = () => {
    ball.current?.position.set(origin.x, BALL_RADIUS, origin.z);
    ball.current?.rotation.set(0, 0, 0);
    keeper.current?.position.set(keeperHome, 0, 0.35);
    keeper.current?.rotation.set(0, 0, 0);
    arms.current?.rotation.set(0, 0, 0);
    wall.current?.position.set(0, 0, 0);
    const geo = net.current?.geometry as PlaneGeometry | undefined;
    if (geo && netBase.current) {
      (geo.attributes.position.array as Float32Array).set(netBase.current);
      geo.attributes.position.needsUpdate = true;
    }
  };

  useImperativeHandle(handleRef, () => ({
    windUp() {
      timeline.current = { runStart: performance.now(), outcome: null, onDone: null, flightStart: null, done: false };
    },
    play(outcome, onDone) {
      if (!timeline.current) timeline.current = { runStart: performance.now() - CONTACT_MS, outcome: null, onDone: null, flightStart: null, done: false };
      timeline.current.outcome = outcome;
      timeline.current.onDone = onDone;
    },
    reset() {
      timeline.current = null;
      resetPose();
    },
  }));

  useFrame((state) => {
    const now = performance.now();
    const t = state.clock.getElapsedTime();
    const b = ball.current;
    const k = keeper.current;
    const cam = state.camera;
    if (!b || !k) return;

    cam.position.set(cameraPos.x + Math.sin(t * 0.6) * 0.04, cameraPos.y + Math.sin(t * 0.9) * 0.02, cameraPos.z);
    cam.lookAt(CAMERA_TARGET);

    const tl = timeline.current;

    if (!tl) {
      // Ожидание: вратарь пружинит на ногах.
      k.position.x = keeperHome + Math.sin(t * 1.4) * 0.25;
      k.position.y = Math.abs(Math.sin(t * 2.8)) * 0.04;
      b.position.set(origin.x, BALL_RADIUS, origin.z);
      return;
    }

    // Удар по мячу — через ту же паузу, что занимал разбег, чтобы темп игры не менялся.
    const since = now - tl.runStart;
    if (tl.outcome != null && tl.flightStart == null && since >= CONTACT_MS) tl.flightStart = now;

    const o = tl.outcome;
    if (!o || tl.flightStart == null) return;
    const elapsed = now - tl.flightStart;
    const flight = o.ball.flightMs * SLOW_MO;

    // Стенка прыгает сразу после удара.
    if (wall.current) wall.current.position.y = Math.max(0, Math.sin(clamp01(elapsed / 520) * Math.PI) * 0.35);

    // Мяч: полёт; при попадании в стенку — отскок назад от неё.
    const wallT = o.wall ? (o.origin.z - o.wall.z) / o.origin.z : 1;
    const flightEnd = o.result === "wall" ? flight * wallT : flight;
    if (elapsed <= flightEnd) {
      const p = ballPosition(o, elapsed / flight);
      b.position.set(p.x, p.y, p.z);
    } else {
      const u = clamp01((elapsed - flightEnd) / 550);
      const hit = o.result === "wall" ? ballPosition(o, wallT) : { x: o.ball.x, y: o.ball.y, z: 0 };
      const after =
        o.result === "wall"
          ? new Vector3(hit.x, BALL_RADIUS, hit.z).addScaledVector(f, -3.5).addScaledVector(r, (o.ball.curveM || 0.5) * 0.8)
          : afterPoint(o);
      const pos = new Vector3(hit.x, hit.y, hit.z).lerp(after, easeOut(u));
      if (o.result !== "goal") pos.y = Math.max(BALL_RADIUS, pos.y - u * u * 1.6);
      b.position.copy(pos);
    }
    b.rotation.x -= 0.35;
    b.rotation.z += o.ball.curveM * 0.08;

    // Вратарь: стартует в startMs и долетает до точки рук за diveMs.
    const d = easeOut(clamp01((elapsed - o.keeper.startMs * SLOW_MO) / (o.keeper.diveMs * SLOW_MO)));
    const rel = o.keeper.handX - o.keeper.startX;
    const lean = Math.max(-1.35, Math.min(1.35, -rel * 0.45));
    k.position.x = o.keeper.startX + rel * 0.72 * d;
    const jump = Math.max(0, (o.keeper.handY - 1.3) * 0.55) + (Math.abs(rel) > 1.4 ? 0.3 : 0);
    k.position.y = jump * Math.sin((Math.PI / 2) * d);
    k.rotation.z = lean * d;
    if (arms.current) arms.current.rotation.z = lean * 0.4 * d;

    // Сетка прогибается там, куда прилетел мяч.
    if (o.result === "goal" && elapsed > flight && net.current) {
      const geo = net.current.geometry as PlaneGeometry;
      const arr = geo.attributes.position.array as Float32Array;
      if (!netBase.current) netBase.current = new Float32Array(arr);
      const u = clamp01((elapsed - flight) / 700);
      const strength = Math.sin(Math.PI * u) * 0.9;
      for (let i = 0; i < arr.length; i += 3) {
        const vx = netBase.current[i];
        const vy = netBase.current[i + 1] + GOAL_HEIGHT / 2;
        const dist = Math.hypot(vx - o.ball.x, vy - o.ball.y);
        arr[i + 2] = netBase.current[i + 2] - Math.max(0, 1 - dist / 1.6) * strength;
      }
      geo.attributes.position.needsUpdate = true;
    }

    if (!tl.done && elapsed > flightEnd + 700) {
      tl.done = true;
      tl.onDone?.();
    }
  });

  return (
    <>
      <PerspectiveCamera makeDefault fov={fov} near={0.1} far={140} position={cameraPos.toArray()} />
      <color attach="background" args={[new Color("#050a1c")]} />
      <fog attach="fog" args={["#050a1c", 34, 70]} />
      <hemisphereLight args={["#bcd7ff", "#0b2a16", 0.9]} />
      <directionalLight position={[-8, 18, 14]} intensity={2.2} castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[10, 14, 6]} intensity={0.8} color="#bfe9ff" />
      <Stands />
      <Pitch />
      <Goal netRef={net} />
      <Keeper keeperRef={keeper} armsRef={arms} />
      {mode === "freekick" && <WallPlayers spot={origin} wallRef={wall} />}
      <Suspense fallback={null}>
        <ShooterModel timeline={timeline} from={runFrom} to={runTo} yaw={yaw} />
      </Suspense>
      <Ball ballRef={ball} spot={origin} />
    </>
  );
}

/** 3D-сцена удара: вид из-за спины игрока Жайыка на ворота. */
const PenaltyScene = forwardRef<PenaltySceneHandle, SceneProps>(function PenaltyScene(props, ref) {
  return (
    <Canvas shadows dpr={[1, 1.75]} gl={{ antialias: true, powerPreference: "high-performance" }}>
      <SceneContent handleRef={ref} {...props} />
    </Canvas>
  );
});

export default PenaltyScene;
