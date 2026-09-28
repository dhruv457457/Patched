"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Environment, Float, Lightformer, Line, RoundedBox } from "@react-three/drei";

/**
 * The landing page's 3D hero: an outfit, a vehicle and a team hoodie take turns in the middle, and pastel patches
 * with prices fly in and stick to each one. Everything is drawn in code (no models or textures to download).
 * Pure illustration: the prices are examples, not data.
 */

export type SceneKind = "outfit" | "car" | "hoodie";

const INK = "#0B0B0C";
const FABRIC = "#F7F5EF";
const PASTEL = { p1: "#BDEBD3", p2: "#D9CCFF", p3: "#FFE58F", p4: "#BFE3FF", p5: "#FFC9DA" } as const;

interface SpotDef {
  x: number;
  y: number;
  w: number;
  h: number;
  r?: number;
  color: keyof typeof PASTEL;
  price: string;
}

interface SurfaceDef {
  shape: () => THREE.Shape;
  spots: SpotDef[];
  scale: number;
}

// Extrusion: the front face sits at DEPTH + BEVEL.
const DEPTH = 0.28;
const BEVEL = 0.1;
const FRONT = DEPTH + BEVEL;

function teeShape() {
  const s = new THREE.Shape();
  s.moveTo(-0.42, 1.52);
  s.quadraticCurveTo(0, 1.1, 0.42, 1.52);
  s.lineTo(1.08, 1.36);
  s.lineTo(1.96, 0.8);
  s.quadraticCurveTo(2.06, 0.7, 1.98, 0.6);
  s.lineTo(1.64, 0.14);
  s.quadraticCurveTo(1.56, 0.05, 1.47, 0.11);
  s.lineTo(1.14, 0.4);
  s.lineTo(1.14, -1.5);
  s.quadraticCurveTo(1.14, -1.64, 1.0, -1.64);
  s.lineTo(-1.0, -1.64);
  s.quadraticCurveTo(-1.14, -1.64, -1.14, -1.5);
  s.lineTo(-1.14, 0.4);
  s.lineTo(-1.47, 0.11);
  s.quadraticCurveTo(-1.56, 0.05, -1.64, 0.14);
  s.lineTo(-1.98, 0.6);
  s.quadraticCurveTo(-2.06, 0.7, -1.96, 0.8);
  s.lineTo(-1.08, 1.36);
  s.lineTo(-0.42, 1.52);
  return s;
}

function hoodieShape() {
  const s = new THREE.Shape();
  s.moveTo(-0.62, 1.4);
  s.bezierCurveTo(-0.72, 2.28, 0.72, 2.28, 0.62, 1.4);
  s.lineTo(1.12, 1.28);
  s.quadraticCurveTo(1.56, 1.16, 1.72, 0.68);
  s.lineTo(2.02, -0.9);
  s.quadraticCurveTo(2.05, -1.06, 1.9, -1.08);
  s.lineTo(1.6, -1.1);
  s.quadraticCurveTo(1.46, -1.1, 1.44, -0.96);
  s.lineTo(1.2, 0.18);
  s.lineTo(1.2, -1.45);
  s.quadraticCurveTo(1.2, -1.62, 1.03, -1.62);
  s.lineTo(-1.03, -1.62);
  s.quadraticCurveTo(-1.2, -1.62, -1.2, -1.45);
  s.lineTo(-1.2, 0.18);
  s.lineTo(-1.44, -0.96);
  s.quadraticCurveTo(-1.46, -1.1, -1.6, -1.1);
  s.lineTo(-1.9, -1.08);
  s.quadraticCurveTo(-2.05, -1.06, -2.02, -0.9);
  s.lineTo(-1.72, 0.68);
  s.quadraticCurveTo(-1.56, 1.16, -1.12, 1.28);
  s.lineTo(-0.62, 1.4);
  return s;
}

function carShape() {
  const s = new THREE.Shape();
  s.moveTo(-2.3, -0.35);
  s.lineTo(-2.3, 0.14);
  s.quadraticCurveTo(-2.3, 0.42, -2.0, 0.45);
  s.lineTo(-1.55, 0.5);
  s.quadraticCurveTo(-1.18, 1.06, -0.7, 1.1);
  s.lineTo(0.52, 1.1);
  s.quadraticCurveTo(0.95, 1.06, 1.36, 0.56);
  s.lineTo(2.05, 0.42);
  s.quadraticCurveTo(2.36, 0.36, 2.36, 0.05);
  s.lineTo(2.36, -0.35);
  s.quadraticCurveTo(2.36, -0.5, 2.2, -0.5);
  s.lineTo(1.86, -0.5);
  s.absarc(1.36, -0.5, 0.5, 0, Math.PI, false);
  s.lineTo(-0.86, -0.5);
  s.absarc(-1.36, -0.5, 0.5, 0, Math.PI, false);
  s.lineTo(-2.15, -0.5);
  s.quadraticCurveTo(-2.3, -0.5, -2.3, -0.35);
  return s;
}

const SURFACES: Record<SceneKind, SurfaceDef> = {
  outfit: {
    shape: teeShape,
    scale: 1,
    spots: [
      { x: -0.5, y: 0.78, w: 0.56, h: 0.4, color: "p2", price: "$120" },
      { x: 0.52, y: 0.78, w: 0.46, h: 0.34, color: "p3", price: "$80" },
      { x: 0, y: -0.42, w: 1.1, h: 0.66, color: "p1", price: "$240" },
      { x: 1.63, y: 0.5, w: 0.36, h: 0.26, r: -0.92, color: "p5", price: "$45" },
    ],
  },
  car: {
    shape: carShape,
    scale: 0.84,
    spots: [
      { x: 0.08, y: -0.05, w: 1.36, h: 0.52, color: "p2", price: "$300" },
      { x: -1.72, y: 0.02, w: 0.62, h: 0.34, color: "p3", price: "$90" },
      { x: 1.82, y: 0.08, w: 0.56, h: 0.3, color: "p4", price: "$110" },
    ],
  },
  hoodie: {
    shape: hoodieShape,
    scale: 0.96,
    spots: [
      { x: 0, y: 0.62, w: 0.96, h: 0.5, color: "p2", price: "$150" },
      { x: -1.62, y: -0.3, w: 0.3, h: 0.5, r: 0.2, color: "p3", price: "$60" },
      { x: 1.62, y: -0.3, w: 0.3, h: 0.5, r: -0.2, color: "p5", price: "$60" },
      { x: 0, y: -0.42, w: 0.72, h: 0.34, color: "p4", price: "$95" },
    ],
  },
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeOutBack = (t: number) => {
  const c1 = 1.9;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

/** Where the pointer is on the whole page, from -1 to 1, so the object turns even when the cursor is over the text. */
function usePagePointer() {
  const p = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const move = (e: PointerEvent) => {
      p.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      p.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, []);
  return p;
}

/**
 * A price tag drawn on a canvas and used as a texture, so it lives inside the scene (a DOM overlay per patch fights
 * React when the object swaps). Uses the page's Geist Mono.
 */
function useTag(text: string) {
  const tag = useMemo(() => {
    const c = document.createElement("canvas");
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    const family = getComputedStyle(document.body).getPropertyValue("--font-geist-mono").trim() || "ui-monospace, monospace";
    const font = `700 60px ${family}`;
    ctx.font = font;
    const h = 100;
    c.width = Math.ceil(ctx.measureText(text).width + 64);
    c.height = h;
    ctx.font = font;
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.roundRect(0, 0, c.width, h, h / 2);
    ctx.fill();
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, c.width / 2, h / 2 + 3);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return { tex, aspect: c.width / h };
  }, [text]);
  useEffect(() => () => tag?.tex.dispose(), [tag]);
  return tag;
}

/** One patch: an ink-edged pastel plate with a stitched inner line and a price tag. Flies in, then stamps down. */
function Spot({ spot, index, reduced }: { spot: SpotDef; index: number; reduced: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const born = useRef<number | null>(null);
  const from = useMemo(() => {
    const a = index * 2.3 + 0.7;
    return new THREE.Vector3(Math.cos(a) * 3.4, Math.sin(a) * 2.6, 3.2);
  }, [index]);
  const stitch = useMemo(() => {
    const w = spot.w / 2 - 0.06;
    const h = spot.h / 2 - 0.06;
    return [[-w, -h, 0.031], [w, -h, 0.031], [w, h, 0.031], [-w, h, 0.031], [-w, -h, 0.031]] as [number, number, number][];
  }, [spot.w, spot.h]);

  const tag = useTag(spot.price);

  useFrame((state) => {
    const g = ref.current;
    if (!g) return;
    if (born.current === null) born.current = state.clock.elapsedTime;
    const t = reduced ? 1 : clamp01((state.clock.elapsedTime - born.current - 0.45 - index * 0.17) / 0.6);
    const e = easeOutCubic(t);
    g.position.set(spot.x + from.x * (1 - e), spot.y + from.y * (1 - e), FRONT + 0.02 + from.z * (1 - e));
    g.rotation.z = (spot.r ?? 0) + (1 - e) * (index % 2 ? 1.1 : -1.1);
    g.scale.setScalar(Math.max(0.001, 0.3 + 0.7 * easeOutBack(t)));
  });

  return (
    <group ref={ref} position={[spot.x, spot.y, FRONT + 0.02]} rotation={[0, 0, spot.r ?? 0]}>
      <RoundedBox args={[spot.w + 0.06, spot.h + 0.06, 0.04]} radius={0.05} smoothness={4} position={[0, 0, -0.012]}>
        <meshStandardMaterial color={INK} roughness={0.6} />
      </RoundedBox>
      <RoundedBox args={[spot.w, spot.h, 0.05]} radius={0.045} smoothness={4}>
        <meshStandardMaterial color={PASTEL[spot.color]} roughness={0.55} />
      </RoundedBox>
      <Line points={stitch} color={INK} lineWidth={1} dashed dashSize={0.045} gapSize={0.035} transparent opacity={0.45} />
      {tag && (
        // Counter-rotated so the tag stays level on tilted patches.
        <mesh position={[spot.w / 2 - 0.04, spot.h / 2 + 0.02, 0.06]} rotation={[0, 0, -(spot.r ?? 0)]}>
          <planeGeometry args={[0.2 * tag.aspect, 0.2]} />
          <meshBasicMaterial map={tag.tex} transparent toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}

/** Details that make each object read as what it is: car windows and wheels, the hoodie's hood and pocket. */
function Extras({ kind }: { kind: SceneKind }) {
  const pocket = useMemo(
    () => [[-0.62, -1.28, FRONT + 0.005], [0.62, -1.28, FRONT + 0.005], [0.46, -0.66, FRONT + 0.005], [-0.46, -0.66, FRONT + 0.005], [-0.62, -1.28, FRONT + 0.005]] as [number, number, number][],
    [],
  );
  const windows = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-1.36, 0.56);
    s.quadraticCurveTo(-1.08, 0.98, -0.68, 1.0);
    s.lineTo(0.48, 1.0);
    s.quadraticCurveTo(0.86, 0.97, 1.16, 0.56);
    s.lineTo(-1.36, 0.56);
    return new THREE.ShapeGeometry(s, 24);
  }, []);

  if (kind === "car") {
    return (
      <>
        <mesh geometry={windows} position={[0, 0, FRONT + 0.004]}>
          <meshStandardMaterial color="#D5E2EC" roughness={0.25} metalness={0.1} />
        </mesh>
        <mesh position={[-0.12, 0.78, FRONT + 0.008]}>
          <boxGeometry args={[0.08, 0.46, 0.01]} />
          <meshStandardMaterial color={FABRIC} />
        </mesh>
        {[-1.36, 1.36].map((x) => (
          <group key={x} position={[x, -0.5, DEPTH / 2]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.42, 0.42, DEPTH + BEVEL * 2 + 0.06, 40]} />
              <meshStandardMaterial color="#1A1A1C" roughness={0.7} />
            </mesh>
            <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, (DEPTH + BEVEL * 2) / 2 + 0.035]}>
              <cylinderGeometry args={[0.2, 0.2, 0.02, 32]} />
              <meshStandardMaterial color="#D9D6CE" metalness={0.4} roughness={0.35} />
            </mesh>
          </group>
        ))}
      </>
    );
  }
  if (kind === "hoodie") {
    return (
      <>
        <mesh position={[0, 1.62, FRONT + 0.004]} scale={[1, 0.8, 1]}>
          <circleGeometry args={[0.36, 40]} />
          <meshStandardMaterial color="#E6E2D8" roughness={0.9} />
        </mesh>
        {[-0.2, 0.2].map((x) => (
          <mesh key={x} position={[x, 1.08, FRONT + 0.02]} rotation={[0, 0, x > 0 ? -0.06 : 0.06]}>
            <boxGeometry args={[0.035, 0.46, 0.03]} />
            <meshStandardMaterial color="#C9C4B8" />
          </mesh>
        ))}
        <Line points={pocket} color={INK} lineWidth={1} dashed dashSize={0.06} gapSize={0.045} transparent opacity={0.3} />
      </>
    );
  }
  return null;
}

/** The fabric (or car body): the shape extruded with a soft bevel, plus a sewn line just inside the edge. */
function Body({ kind, reduced }: { kind: SceneKind; reduced: boolean }) {
  const def = SURFACES[kind];
  const { geometry, stitch, center } = useMemo(() => {
    const shape = def.shape();
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: DEPTH,
      bevelEnabled: true,
      bevelThickness: BEVEL,
      bevelSize: 0.08,
      bevelSegments: 8,
      curveSegments: 36,
    });
    const pts = shape.getPoints(80);
    const box = new THREE.Box2().setFromPoints(pts);
    const c = box.getCenter(new THREE.Vector2());
    const sewn = pts.map((p) => [c.x + (p.x - c.x) * 0.94, c.y + (p.y - c.y) * 0.94, FRONT + 0.003] as [number, number, number]);
    return { geometry: geo, stitch: sewn, center: c };
  }, [def]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <group scale={def.scale} position={[-center.x * def.scale, -center.y * def.scale, 0]}>
      <mesh geometry={geometry}>
        <meshStandardMaterial color={FABRIC} roughness={0.78} />
      </mesh>
      <Line points={stitch} color={INK} lineWidth={1} dashed dashSize={0.07} gapSize={0.05} transparent opacity={0.22} />
      <Extras kind={kind} />
      {def.spots.map((s, i) => (
        <Spot key={`${kind}-${i}`} spot={s} index={i} reduced={reduced} />
      ))}
    </group>
  );
}

/** Swaps objects with a quick spin-and-shrink, and turns the object toward the pointer. */
function Stage({ kind, reduced }: { kind: SceneKind; reduced: boolean }) {
  const group = useRef<THREE.Group>(null);
  const [shown, setShown] = useState(kind);
  const phase = useRef<"in" | "out" | "idle">(reduced ? "idle" : "in");
  const grow = useRef(reduced ? 1 : 0);
  const pointer = usePagePointer();

  useEffect(() => {
    if (kind !== shown) phase.current = reduced ? "idle" : "out";
    if (reduced && kind !== shown) setShown(kind);
  }, [kind, shown, reduced]);

  useFrame((state, dt) => {
    const g = group.current;
    if (!g) return;
    if (phase.current === "out") {
      grow.current = Math.max(0, grow.current - dt * 3.4);
      if (grow.current === 0) {
        phase.current = "in";
        setShown(kind);
      }
    } else if (phase.current === "in") {
      grow.current = Math.min(1, grow.current + dt * 2.1);
      if (grow.current === 1) phase.current = "idle";
    }
    const k = reduced ? 1 : easeOutBack(grow.current);
    g.scale.setScalar(Math.max(0.001, k));
    const time = state.clock.elapsedTime;
    const targetY = reduced ? -0.22 : pointer.current.x * 0.5 + Math.sin(time * 0.45) * 0.14 - 0.18 + (1 - grow.current) * 1.6;
    const targetX = reduced ? 0.06 : -pointer.current.y * 0.18 + 0.05;
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, targetY, 4, dt);
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, targetX, 4, dt);
    g.position.y = reduced ? 0 : Math.sin(time * 0.8) * 0.06;
  });

  return (
    <group ref={group}>
      <Body key={shown} kind={shown} reduced={reduced} />
    </group>
  );
}

function Tile({ position, color, size, rotation = 0 }: { position: [number, number, number]; color: keyof typeof PASTEL; size: [number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0.25, -0.3, rotation]}>
      <RoundedBox args={[size[0] + 0.06, size[1] + 0.06, 0.05]} radius={0.06} smoothness={4} position={[0, 0, -0.015]}>
        <meshStandardMaterial color={INK} />
      </RoundedBox>
      <RoundedBox args={[size[0], size[1], 0.06]} radius={0.05} smoothness={4}>
        <meshStandardMaterial color={PASTEL[color]} roughness={0.5} />
      </RoundedBox>
    </group>
  );
}

function Coin({ position }: { position: [number, number, number] }) {
  return (
    <group position={position} rotation={[Math.PI / 2 - 0.35, 0, 0.3]}>
      <mesh>
        <cylinderGeometry args={[0.26, 0.26, 0.07, 48]} />
        <meshStandardMaterial color="#2775CA" metalness={0.35} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.037, 0]}>
        <torusGeometry args={[0.17, 0.018, 12, 40]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>
    </group>
  );
}

/** Loose patches and USDC coins drifting around the object. */
function Drift({ reduced }: { reduced: boolean }) {
  const speed = reduced ? 0 : 1.3;
  const items: { key: string; node: ReactNode }[] = [
    { key: "t1", node: <Tile position={[-1.95, 1.75, -1.2]} color="p3" size={[0.5, 0.34]} rotation={-0.3} /> },
    { key: "t2", node: <Tile position={[1.95, 1.6, -1.4]} color="p2" size={[0.4, 0.4]} rotation={0.2} /> },
    { key: "t3", node: <Tile position={[-1.95, -1.55, -0.4]} color="p1" size={[0.56, 0.32]} rotation={0.15} /> },
    { key: "c1", node: <Coin position={[1.9, -1.35, 0.2]} /> },
    { key: "c2", node: <Coin position={[-1.7, 0.25, -1.8]} /> },
  ];
  return (
    <>
      {items.map((it) => (
        <Float key={it.key} speed={speed} rotationIntensity={0.7} floatIntensity={0.9} floatingRange={[-0.12, 0.12]}>
          {it.node}
        </Float>
      ))}
    </>
  );
}

export default function PatchScene({ kind, reduced, active }: { kind: SceneKind; reduced: boolean; active: boolean }) {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 0.1, 8.6], fov: 32 }}
      gl={{ antialias: true, alpha: true }}
      frameloop={active ? "always" : "never"}
      style={{ touchAction: "pan-y" }}
      aria-hidden="true"
    >
      <ambientLight intensity={0.85} />
      <directionalLight position={[3, 5, 5]} intensity={1.5} />
      <directionalLight position={[-5, 1, 2]} intensity={0.45} color="#FFC9B0" />
      <Environment resolution={64} frames={1}>
        <Lightformer intensity={1.6} position={[0, 4, 6]} scale={[12, 5, 1]} />
        <Lightformer intensity={0.9} color="#FF5A1F" position={[-6, 0, 3]} rotation={[0, Math.PI / 2, 0]} scale={[4, 8, 1]} />
        <Lightformer intensity={0.6} color="#D9CCFF" position={[6, 1, 2]} rotation={[0, -Math.PI / 2, 0]} scale={[4, 8, 1]} />
      </Environment>
      <Stage kind={kind} reduced={reduced} />
      <Drift reduced={reduced} />
      <ContactShadows position={[0, -2.15, 0]} opacity={0.32} scale={9} blur={2.8} far={4} resolution={512} />
    </Canvas>
  );
}
