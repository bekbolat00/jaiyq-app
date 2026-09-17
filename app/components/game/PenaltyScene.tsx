"use client";

import { Line, PerspectiveCamera } from "@react-three/drei";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { forwardRef, Suspense, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import {
  AnimationAction,
  AnimationClip,
  AnimationMixer,
  MathUtils,
  CanvasTexture,
  Color,
  DoubleSide,
  Group,
  LoopOnce,
  Material,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Object3D,
  Plane,
  PlaneGeometry,
  Quaternion,
  Raycaster,
  RepeatWrapping,
  SRGBColorSpace,
  Vector2,
  Vector3,
} from "three";
import type { Line2, LineSegments2 } from "three-stdlib";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import {
  BALL_RADIUS,
  GOAL_HALF_WIDTH,
  GOAL_HEIGHT,
  PENALTY_SPOT,
  ballPosition,
  flightProgress,
  flightTimeAt,
  previewPath,
  wallFor,
  type GameMode,
  type KickSpot,
  type ShotInput,
  type ShotOutcome,
} from "@/lib/game/penalty";
import { playKickSound, playNetSound } from "@/lib/game/sfx";

/**
 * Реальный полёт мяча 0.33–1.2 с — повтор замедлен, чтобы было видно, что произошло.
 * Сильный удар замедляем меньше: он должен ощущаться резким. Вратарь — тем же множителем.
 */
const slowMoFor = (pace: number) => 1.9 - 0.55 * pace;
/** Какая часть траектории видна пунктиром при прицеливании. */
const AIM_PREVIEW_FRACTION = 0.7;
const AIM_LINE_INITIAL: [number, number, number][] = [
  [0, 0, 0],
  [0, 0, 0.01],
];
/** Плоскость линии ворот — на неё проецируется палец при прицеливании. */
const GOAL_PLANE = new Plane(new Vector3(0, 0, 1), 0);
/** Толчок камеры в момент удара, мс. */
const SHAKE_MS = 170;
/** Полупрозрачные «следы» мяча в полёте. */
const TRAIL_COUNT = 7;
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
  /** Пунктир прицела во время свайпа; null — спрятать. */
  setAimPreview: (input: ShotInput | null) => void;
  /** Точка на плоскости ворот под пальцем, в метрах (x — поперёк, y — высота). */
  goalPointAt: (clientX: number, clientY: number) => { x: number; y: number } | null;
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
  /** Мяч уже коснулся сетки (звук — один раз). */
  netHit: boolean;
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
/** Running, а не Run_03: Run_03 задирает ключицы на 31–54° и сутулит корпус. */
const CLIP_RUN = "Running";
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
 * Материалы моделей из Meshy экспортированы «засвеченными»: нет карты
 * metallic/roughness (по glTF это металл 1 / шероховатость 1), текстура стоит
 * ещё и свечением на полную, specularColorFactor = 2. Правим копию материала
 * при загрузке — текстура и UV остаются, GLB и кэш загрузчика не трогаем.
 * false — как в файле. В обоих *-final.glb уже вшита насыщенная baseColor (WebP).
 */
const FIX_MESHY_MATERIAL = true;

function matteMeshyMaterial(source: Material): Material {
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

/**
 * Риг Meshy: ключицы влияют на всю верхнюю часть груди и спины, а клипы Mixamo
 * поворачивают их на 20–50° от позы привязки — плечи выходят квадратными.
 * После анимации возвращаем ключицы к позе привязки на эту долю; 0 — как в клипах.
 * Настоящее исправление — перевесить риг в Blender.
 */
const CLAVICLE_RETURN = 0.55;
/** Плечо — дочерняя кость ключицы: возвращая ключицу, компенсируем плечо, иначе руки прижимаются к телу. */
const CLAVICLE_BONES: [string, string, number][] = [
  ["mixamorigLeftShoulder", "mixamorigLeftArm", 1],
  ["mixamorigRightShoulder", "mixamorigRightArm", -1],
];
/** Небольшое разведение рук от корпуса, градусы (вокруг локальной оси плеча). */
const ARM_SPREAD_DEG = 8;

type Clavicle = { bone: Object3D; arm: Object3D; rest: Quaternion; spread: Quaternion };
const scratchQ = new Quaternion();

function relaxClavicles(clavicles: Clavicle[]) {
  for (const c of clavicles) {
    scratchQ.copy(c.bone.quaternion);
    c.bone.quaternion.slerp(c.rest, CLAVICLE_RETURN);
    // Плечо в мире остаётся как в клипе: armLocal' = inv(clav') · clav · armLocal.
    c.arm.quaternion.premultiply(scratchQ.premultiply(c.bone.quaternion.clone().invert()));
    c.arm.quaternion.multiply(c.spread);
  }
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
        if (FIX_MESHY_MATERIAL) {
          mesh.material = Array.isArray(mesh.material) ? mesh.material.map(matteMeshyMaterial) : matteMeshyMaterial(mesh.material);
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
    // Поза привязки ключиц — до первого кадра анимации.
    const clavicles = CLAVICLE_BONES.flatMap(([name, armName, side]) => {
      const bone = model.getObjectByName(name);
      const arm = model.getObjectByName(armName);
      if (!bone || !arm) return [];
      const spread = new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), (-ARM_SPREAD_DEG * side * Math.PI) / 180);
      return [{ bone, arm, rest: bone.quaternion.clone(), spread }];
    });
    return { mixer, idle: action(CLIP_IDLE), run: action(CLIP_RUN), kick, clavicles };
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
      relaxClavicles(rig.clavicles);
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
    relaxClavicles(rig.clavicles);
  });

  return (
    <group ref={root} position={from.toArray()} rotation={[0, yaw, 0]}>
      <primitive object={model} />
    </group>
  );
}

/** 3D-вратарь (Бакытов) со скелетом Mixamo — та же связка, что у бьющего. */
const KEEPER_MODEL_URL = "/models/goalkeepers/bakytov/bakytov-final.glb";
const GK_CLIP_IDLE = "Idle_02";
const GK_CLIP_DIVE = "Leap_Right_and_Catch";
const GK_CLIP_PARRY = "Two_Handed_Parry";
/** Вратарь стоит чуть впереди линии ворот. */
const KEEPER_Z = 0.35;

/*
 * Тайминги сняты с клипов. В прыжке руки идут сверху вниз: 2.2 м на 0.90 с,
 * 0.79 м на 1.45 с — поэтому момент касания выбираем по высоте рук, которую
 * посчитал сервер, и клип сам даёт нужную позу. Вбок руки уходят на 0.8 м,
 * остальное расстояние до мяча проходит корень модели.
 */
const DIVE_FROM_S = 0.35;
const DIVE_HIGH = { t: 0.9, y: 2.2 };
const DIVE_LOW = { t: 1.45, y: 0.79 };
const DIVE_HAND_X = 0.8;
const PARRY_FROM_S = 0.1;
const PARRY_CONTACT_S = 0.5;
const PARRY_HAND_X = 0.2;
/** Прыжок ускоряем или замедляем, чтобы руки пришли к мячу вовремя. */
const DIVE_SPEED_RANGE = [0.7, 2.6] as const;

/** Зеркальный клип: прыжок вправо становится прыжком влево. */
function mirrorClip(clip: AnimationClip) {
  const swapSide = (name: string) => name.replace(/Left|Right/, (m) => (m === "Left" ? "Right" : "Left"));
  const tracks = clip.tracks.map((track) => {
    const mirrored = track.clone();
    const dot = mirrored.name.lastIndexOf(".");
    const prop = mirrored.name.slice(dot + 1);
    mirrored.name = swapSide(mirrored.name.slice(0, dot)) + "." + prop;
    const v = mirrored.values as Float32Array;
    // Отражение относительно плоскости YZ: у поворота меняют знак y и z, у смещения — x.
    if (prop === "quaternion") for (let i = 0; i < v.length; i += 4) { v[i + 1] = -v[i + 1]; v[i + 2] = -v[i + 2]; }
    else if (prop === "position") for (let i = 0; i < v.length; i += 3) v[i] = -v[i];
    return mirrored;
  });
  return new AnimationClip(clip.name + "_Mirrored", clip.duration, tracks);
}

type KeeperPlan = {
  action: AnimationAction;
  fromS: number;
  contactS: number;
  startMs: number;
  speed: number;
  fromX: number;
  targetX: number;
  clipT: number;
};

/**
 * Вратарь: Idle_02 на линии, по исходу удара — прыжок в сторону мяча
 * (клип «вправо» или его зеркало) либо отбитие двумя руками по центру.
 * Куда и когда прыгать, решает сервер — здесь только поза и движение корня.
 */
function KeeperModel({ timeline, keeperRef, home }: {
  timeline: React.RefObject<Timeline | null>;
  keeperRef: React.RefObject<Group | null>;
  home: number;
}) {
  const gltf = useLoader(GLTFLoader, KEEPER_MODEL_URL);
  const plan = useRef<KeeperPlan | null>(null);
  const model = useMemo(() => {
    const clone = cloneSkinned(gltf.scene);
    clone.traverse((o) => {
      if ((o as Mesh).isMesh) {
        o.castShadow = true;
        o.frustumCulled = false;
        const mesh = o as Mesh;
        if (FIX_MESHY_MATERIAL) {
          mesh.material = Array.isArray(mesh.material) ? mesh.material.map(matteMeshyMaterial) : matteMeshyMaterial(mesh.material);
        }
      }
    });
    return clone;
  }, [gltf]);

  const rig = useMemo(() => {
    const mixer = new AnimationMixer(model);
    const clip = (name: string) => {
      const found = AnimationClip.findByName(gltf.animations, name);
      if (!found) throw new Error(`В ${KEEPER_MODEL_URL} нет клипа ${name}`);
      return found;
    };
    const once = (c: AnimationClip) => {
      const action = mixer.clipAction(c);
      action.setLoop(LoopOnce, 1);
      action.clampWhenFinished = true;
      // Время прыжка ведём вручную — чтобы руки встретили мяч.
      action.timeScale = 0;
      return action;
    };
    const dive = clip(GK_CLIP_DIVE);
    return {
      mixer,
      idle: mixer.clipAction(clip(GK_CLIP_IDLE)),
      diveRight: once(dive),
      diveLeft: once(mirrorClip(dive)),
      parry: once(clip(GK_CLIP_PARRY)),
    };
  }, [gltf, model]);

  useEffect(() => {
    rig.idle.play();
    return () => {
      rig.mixer.stopAllAction();
    };
  }, [rig]);

  useFrame((state, delta) => {
    const g = keeperRef.current;
    if (!g) return;
    const { mixer, idle } = rig;
    const tl = timeline.current;
    const o = tl?.outcome ?? null;

    if (!o || !tl || tl.flightStart == null) {
      // Ожидание удара: переминается на линии.
      if (plan.current) {
        plan.current = null;
        mixer.stopAllAction();
        idle.reset().play();
      }
      const t = state.clock.getElapsedTime();
      g.position.set(home + Math.sin(t * 1.3) * 0.22, Math.abs(Math.sin(t * 2.6)) * 0.03, KEEPER_Z);
      mixer.update(delta);
      return;
    }

    const k = o.keeper;
    const slowMo = slowMoFor(o.ball.pace);
    if (!plan.current) {
      const dx = k.handX - k.startX;
      const side = dx >= 0 ? 1 : -1;
      // Мяч рядом и не низом — вратарь отбивает двумя руками, не прыгая.
      const parry = Math.abs(dx) < 0.7 && k.handY > 1.05 && k.handY < 2;
      const u = clamp01((DIVE_HIGH.y - k.handY) / (DIVE_HIGH.y - DIVE_LOW.y));
      const contactS = parry ? PARRY_CONTACT_S : DIVE_HIGH.t + u * (DIVE_LOW.t - DIVE_HIGH.t);
      const fromS = parry ? PARRY_FROM_S : DIVE_FROM_S;
      const startMs = k.startMs * slowMo;
      const available = Math.max(140, o.ball.flightMs * slowMo - startMs);
      const handX = parry ? PARRY_HAND_X : DIVE_HAND_X;
      plan.current = {
        action: parry ? rig.parry : side >= 0 ? rig.diveLeft : rig.diveRight,
        fromS,
        contactS,
        startMs,
        speed: MathUtils.clamp(((contactS - fromS) * 1000) / available, DIVE_SPEED_RANGE[0], DIVE_SPEED_RANGE[1]),
        fromX: g.position.x,
        targetX: k.handX - side * handX,
        clipT: fromS,
      };
      const action = plan.current.action;
      action.reset().play();
      seekAction(action, fromS);
      action.crossFadeFrom(idle, 0.12, false);
    }

    const p = plan.current;
    const elapsed = performance.now() - tl.flightStart;
    if (elapsed >= p.startMs) {
      // До касания прыжок подгоняем по времени, после — доигрывается как снят.
      p.clipT = Math.min(p.clipT + delta * (p.clipT < p.contactS ? p.speed : 1), p.action.getClip().duration);
      seekAction(p.action, p.clipT);
    }
    const progress = clamp01((p.clipT - p.fromS) / Math.max(0.01, p.contactS - p.fromS));
    g.position.set(MathUtils.lerp(p.fromX, p.targetX, easeOut(progress)), 0, KEEPER_Z);
    mixer.update(delta);
  });

  return (
    <group ref={keeperRef} position={[home, 0, KEEPER_Z]}>
      <primitive object={model} />
    </group>
  );
}

type SceneProps = {
  mode: GameMode;
  spot: KickSpot;
  /** Нога коснулась мяча: `pace` 0..1 — сила удара. Для вибрации. */
  onKickContact?: (pace: number) => void;
};

function SceneContent({ handleRef, mode, spot, onKickContact }: SceneProps & { handleRef: React.Ref<PenaltySceneHandle> }) {
  const ball = useRef<Mesh>(null);
  const keeper = useRef<Group>(null);
  const net = useRef<Mesh>(null);
  const wall = useRef<Group>(null);
  const timeline = useRef<Timeline | null>(null);
  const netBase = useRef<Float32Array | null>(null);
  const aim = useRef<{ input: ShotInput | null; dirty: boolean }>({ input: null, dirty: false });
  const aimLine = useRef<Line2 | LineSegments2>(null);
  const trail = useRef<(Mesh | null)[]>([]);
  const trailHistory = useRef<Vector3[]>([]);
  const shakeFrom = useRef<number | null>(null);
  const getState = useThree((s) => s.get);

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
    shakeFrom.current = null;
    trailHistory.current = [];
    for (const m of trail.current) if (m) m.visible = false;
    ball.current?.position.set(origin.x, BALL_RADIUS, origin.z);
    ball.current?.rotation.set(0, 0, 0);
    wall.current?.position.set(0, 0, 0);
    const geo = net.current?.geometry as PlaneGeometry | undefined;
    if (geo && netBase.current) {
      (geo.attributes.position.array as Float32Array).set(netBase.current);
      geo.attributes.position.needsUpdate = true;
    }
  };

  useImperativeHandle(handleRef, () => ({
    windUp() {
      timeline.current = { runStart: performance.now(), outcome: null, onDone: null, flightStart: null, netHit: false, done: false };
    },
    play(outcome, onDone) {
      if (!timeline.current) timeline.current = { runStart: performance.now() - CONTACT_MS, outcome: null, onDone: null, flightStart: null, netHit: false, done: false };
      timeline.current.outcome = outcome;
      timeline.current.onDone = onDone;
    },
    reset() {
      timeline.current = null;
      aim.current = { input: null, dirty: true };
      resetPose();
    },
    setAimPreview(input) {
      aim.current = { input, dirty: true };
    },
    goalPointAt(clientX, clientY) {
      const { camera, gl } = getState();
      const rect = gl.domElement.getBoundingClientRect();
      const ndc = new Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
      const ray = new Raycaster();
      ray.setFromCamera(ndc, camera);
      const hit = ray.ray.intersectPlane(GOAL_PLANE, new Vector3());
      return hit ? { x: hit.x, y: hit.y } : null;
    },
  }));

  useFrame((state) => {
    const now = performance.now();
    const t = state.clock.getElapsedTime();
    const b = ball.current;
    const cam = state.camera;
    if (!b) return;

    cam.position.set(cameraPos.x + Math.sin(t * 0.6) * 0.04, cameraPos.y + Math.sin(t * 0.9) * 0.02, cameraPos.z);
    cam.lookAt(CAMERA_TARGET);

    const tl = timeline.current;

    // Пунктир прицела: пересчитываем, только когда палец сдвинулся.
    const line = aimLine.current;
    if (line) {
      const a = aim.current;
      line.visible = !tl && a.input != null;
      if (a.dirty && a.input) {
        const pts = previewPath(a.input, mode, origin, AIM_PREVIEW_FRACTION);
        line.geometry.setPositions(pts.flatMap((p) => [p.x, p.y, p.z]));
        line.computeLineDistances();
      }
      a.dirty = false;
    }

    if (!tl) {
      b.position.set(origin.x, BALL_RADIUS, origin.z);
      return;
    }

    // Удар по мячу — через ту же паузу, что занимал разбег, чтобы темп игры не менялся.
    const since = now - tl.runStart;
    if (tl.outcome != null && tl.flightStart == null && since >= CONTACT_MS) {
      tl.flightStart = now;
      shakeFrom.current = now;
      playKickSound(tl.outcome.ball.pace);
      onKickContact?.(tl.outcome.ball.pace);
    }

    const o = tl.outcome;
    if (!o || tl.flightStart == null) return;
    const elapsed = now - tl.flightStart;
    const pace = o.ball.pace;
    const slowMo = slowMoFor(pace);
    const flight = o.ball.flightMs * slowMo;

    // Толчок камеры в момент касания: чем сильнее удар, тем резче.
    if (shakeFrom.current != null) {
      const e = (now - shakeFrom.current) / SHAKE_MS;
      if (e < 1) {
        const amp = (0.02 + 0.06 * pace) * (1 - e) * (1 - e);
        cam.position.x += Math.sin(now * 0.09) * amp;
        cam.position.y += Math.cos(now * 0.113) * amp * 0.7;
        cam.position.addScaledVector(f, amp * 0.8);
      }
    }

    // Стенка прыгает сразу после удара.
    if (wall.current) wall.current.position.y = Math.max(0, Math.sin(clamp01(elapsed / 520) * Math.PI) * 0.35);

    // Мяч: полёт; при попадании в стенку — отскок назад от неё.
    // Путь по времени идёт с «рывком»: быстрее всего сразу после касания.
    const wallT = o.wall ? (o.origin.z - o.wall.z) / o.origin.z : 1;
    const flightEnd = o.result === "wall" ? flight * flightTimeAt(wallT, pace) : flight;
    if (elapsed <= flightEnd) {
      const p = ballPosition(o, flightProgress(elapsed / flight, pace));
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

    // Шлейф: мяч в прошлых кадрах, пока летит к воротам.
    const flying = elapsed <= flightEnd + 120;
    const history = trailHistory.current;
    // Точку добавляем, только когда мяч сдвинулся: при просадке FPS шлейф не слипается.
    if (flying && (!history[0] || history[0].distanceToSquared(b.position) > 0.04)) {
      history.unshift(b.position.clone());
      if (history.length > TRAIL_COUNT * 2 + 1) history.length = TRAIL_COUNT * 2 + 1;
    }
    trail.current.forEach((m, i) => {
      if (!m) return;
      const at = history[(i + 1) * 2];
      m.visible = flying && at != null;
      if (!m.visible) return;
      m.position.copy(at);
      (m.material as MeshBasicMaterial).opacity = (0.3 - i * 0.038) * (0.45 + 0.55 * pace);
    });

    // Сетка прогибается там, куда прилетел мяч, и пару раз пружинит обратно.
    if (o.result === "goal" && elapsed > flight && net.current) {
      if (!tl.netHit) {
        tl.netHit = true;
        playNetSound();
      }
      const geo = net.current.geometry as PlaneGeometry;
      const arr = geo.attributes.position.array as Float32Array;
      if (!netBase.current) netBase.current = new Float32Array(arr);
      const u = clamp01((elapsed - flight) / 900);
      const strength = (0.6 + 0.7 * pace) * Math.exp(-3 * u) * Math.sin(Math.PI * 3 * u);
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
      <Suspense fallback={null}>
        <KeeperModel timeline={timeline} keeperRef={keeper} home={keeperHome} />
      </Suspense>
      {mode === "freekick" && <WallPlayers spot={origin} wallRef={wall} />}
      <Suspense fallback={null}>
        <ShooterModel timeline={timeline} from={runFrom} to={runTo} yaw={yaw} />
      </Suspense>
      <Ball ballRef={ball} spot={origin} />
      {Array.from({ length: TRAIL_COUNT }, (_, i) => (
        <mesh
          key={i}
          ref={(m) => {
            trail.current[i] = m;
          }}
          visible={false}
        >
          <sphereGeometry args={[BALL_RADIUS * (0.92 - i * 0.08), 12, 12]} />
          <meshBasicMaterial color="#e6fbff" transparent opacity={0.3} depthWrite={false} />
        </mesh>
      ))}
      <Line
        ref={aimLine}
        points={AIM_LINE_INITIAL}
        color="#00e8f0"
        lineWidth={3}
        dashed
        dashSize={0.32}
        gapSize={0.22}
        transparent
        opacity={0.9}
        depthTest={false}
      />
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
