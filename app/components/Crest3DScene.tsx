"use client";

import { useTexture } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useRef } from "react";
import { DoubleSide, Group, SRGBColorSpace } from "three";

type Props = {
  src: string;
  /** Задержка появления, чтобы две монеты влетали по очереди. */
  delay?: number;
  /** Сторона, откуда монета влетает: слева (-1) или справа (1). */
  from?: -1 | 1;
  paused?: boolean;
};

const NAVY = "#0e1f73";
const ACCENT = "#00e8f0";

/** Плавный выход без отскока: быстро в начале, мягко в конце. */
function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

/** Лёгкий «перелёт» в конце: монета чуть проскакивает и возвращается. */
function easeOutBack(t: number) {
  const c1 = 1.4;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function Coin({ src, delay = 0, from = -1, paused = false }: Props) {
  const group = useRef<Group>(null);
  // Цветовое пространство задаём при загрузке — иначе логотипы выглядят блёклыми.
  const texture = useTexture(src, (t) => {
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = 4;
  });
  const born = useRef<number | null>(null);

  useFrame((state) => {
    const g = group.current;
    if (!g || paused) return;
    const t = state.clock.getElapsedTime();
    if (born.current == null) born.current = t;
    const age = t - born.current - delay;

    // Появление: монета вылетает из глубины, разворачиваясь лицом к зрителю.
    const intro = Math.min(1, Math.max(0, age / 1.1));
    const scale = age < 0 ? 0.001 : easeOutBack(intro);
    const spin = (1 - easeOutCubic(intro)) * Math.PI * 1.5 * from;

    // Покой: медленное покачивание и «дыхание», как у висящего значка.
    const idle = Math.max(0, age - 1.1);
    const swayY = Math.sin(idle * 0.9 + delay * 3) * 0.32;
    const swayX = Math.sin(idle * 0.7 + delay * 5) * 0.08;
    const bob = Math.sin(idle * 1.3 + delay * 2) * 0.05;

    // Наклон вслед за пальцем/курсором над карточкой.
    const px = state.pointer.x * 0.35;
    const py = state.pointer.y * 0.25;

    g.scale.setScalar(scale);
    g.rotation.y += (swayY + px + spin - g.rotation.y) * 0.12;
    g.rotation.x += (swayX - py - g.rotation.x) * 0.12;
    g.position.y = bob;
  });

  const depth = 0.22;

  return (
    <group ref={group} scale={0.001}>
      {/* Корпус монеты: фирменный синий с металлическим отблеском. */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[1, 1, depth, 64, 1, false]} />
        <meshStandardMaterial color={NAVY} metalness={0.85} roughness={0.28} />
      </mesh>
      {/* Голубой ободок по краю лицевой стороны — как контур на гербе. */}
      <mesh position={[0, 0, depth / 2 + 0.002]}>
        <ringGeometry args={[0.93, 1, 96]} />
        <meshStandardMaterial color={ACCENT} emissive={ACCENT} emissiveIntensity={0.35} metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0, -depth / 2 - 0.002]} rotation={[0, Math.PI, 0]}>
        <ringGeometry args={[0.93, 1, 96]} />
        <meshStandardMaterial color={ACCENT} emissive={ACCENT} emissiveIntensity={0.25} metalness={0.6} roughness={0.3} side={DoubleSide} />
      </mesh>
      {/* Логотип клуба на лицевой стороне; без освещения, чтобы цвета эмблемы не искажались. */}
      <mesh position={[0, 0, depth / 2 + 0.006]}>
        <planeGeometry args={[1.42, 1.42]} />
        <meshBasicMaterial map={texture} transparent toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, -depth / 2 - 0.006]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[1.42, 1.42]} />
        <meshBasicMaterial map={texture} transparent toneMapped={false} opacity={0.5} />
      </mesh>
    </group>
  );
}

/** Сцена одной 3D-монеты с логотипом. Грузится только на клиенте. */
export default function Crest3DScene(props: Props) {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 0, 4], fov: 38 }}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      frameloop={props.paused ? "never" : "always"}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={0.55} />
      <directionalLight position={[-2.5, 3, 4]} intensity={2.2} />
      <pointLight position={[2.5, -1.5, 2]} intensity={6} color={ACCENT} distance={8} />
      <Suspense fallback={null}>
        <Coin {...props} />
      </Suspense>
    </Canvas>
  );
}
