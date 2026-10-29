"use client";
// Robô 3D do banner (three.js, só formas geométricas). Carregado só na Home, com import dinâmico.
// - A cabeça segue o cursor; os olhos mexem-se mais do que a cabeça; o corpo acompanha pouco.
// - Pisca sozinho, flutua, acena com o cursor por cima e salta de alegria ao clique.
// - «Reduzir movimento»: sem flutuar, piscar nem saltar.
// - Pausa fora do ecrã e com o separador escondido. Sem WebGL (ou com GPU por software) fica o robô em CSS.
// - As cores vêm dos tokens do DS TIS (lidos do CSS) e acompanham o modo claro/escuro.
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RobotCss, type HeroPointer } from "./robot-css";
import { cn } from "@/lib/utils";

interface Props {
  pointer: React.RefObject<HeroPointer>;
  className?: string;
}

// Visor: elipsóide (raios VX, VY, VZ) com o centro em z = VZ0, à frente da cabeça.
const VX = 0.84, VY = 0.6, VZ = 0.5, VZ0 = 0.53;
const EYE_X = 0.28, EYE_Y = 0.03;

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function readPalette() {
  const cs = getComputedStyle(document.documentElement);
  const col = (name: string) => {
    const c = new THREE.Color();
    const v = cs.getPropertyValue(name).trim();
    if (v) c.setStyle(v);
    return c;
  };
  return {
    shell: col("--ds-color-neutral-50"),
    joint: col("--ds-color-neutral-900"),
    visor: col("--ds-color-neutral-950"),
    disc: col("--ds-color-neutral-800"),
    metal: col("--ds-color-neutral-300"),
    eye: col("--ds-color-brand-400"),
    glow: col("--ds-color-brand-500"),
    rim: col("--ds-color-brand-200"),
    ground: col("--ds-color-neutral-300"),
    shadow: col("--ds-color-neutral-950"),
    dark: document.documentElement.dataset.mode === "dark",
  };
}
type Palette = ReturnType<typeof readPalette>;

function radialTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  // Máscara em escala de cinzentos; a cor vem do material (tokens).
  grd.addColorStop(0, "rgba(255,255,255,1)");
  grd.addColorStop(0.45, "rgba(255,255,255,0.45)");
  grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Superfície do visor: z do elipsóide em (x, y). */
const visorZ = (x: number, y: number) => VZ0 + VZ * Math.sqrt(Math.max(0, 1 - (x / VX) ** 2 - (y / VY) ** 2));

function buildRobot(p: Palette, glowTex: THREE.Texture) {
  const mats = {
    shell: new THREE.MeshPhysicalMaterial({ color: p.shell, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.1 }),
    joint: new THREE.MeshPhysicalMaterial({ color: p.joint, roughness: 0.38, metalness: 0.15, clearcoat: 0.6, clearcoatRoughness: 0.25 }),
    visor: new THREE.MeshPhysicalMaterial({ color: p.visor, roughness: 0.06, metalness: 0.35, clearcoat: 1, clearcoatRoughness: 0.03 }),
    disc: new THREE.MeshPhysicalMaterial({ color: p.disc, roughness: 0.3, metalness: 0.45, clearcoat: 0.8 }),
    metal: new THREE.MeshStandardMaterial({ color: p.metal, metalness: 1, roughness: 0.22 }),
    eye: new THREE.MeshBasicMaterial({ color: p.eye, toneMapped: false }),
    glow: new THREE.SpriteMaterial({ map: glowTex, color: p.glow, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.85, toneMapped: false }),
    shadow: new THREE.MeshBasicMaterial({ map: glowTex, color: p.shadow, transparent: true, depthWrite: false, opacity: p.dark ? 0.6 : 0.34 }),
  };
  const sphere = new THREE.SphereGeometry(1, 64, 48);
  const mesh = (g: THREE.BufferGeometry, m: THREE.Material, pos?: [number, number, number], scale?: [number, number, number]) => {
    const o = new THREE.Mesh(g, m);
    if (pos) o.position.set(...pos);
    if (scale) o.scale.set(...scale);
    return o;
  };

  const root = new THREE.Group();

  // Cabeça
  const head = new THREE.Group();
  head.add(mesh(sphere, mats.shell, [0, 0, 0], [1.06, 0.94, 0.98]));
  head.add(mesh(sphere, mats.visor, [0, 0, VZ0], [VX, VY, VZ]));
  for (const s of [-1, 1]) {
    const ear = new THREE.Group();
    ear.position.set(s * 1.0, -0.04, 0);
    const disc = mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.2, 48), mats.disc);
    disc.rotation.z = Math.PI / 2;
    const ring = mesh(new THREE.TorusGeometry(0.39, 0.05, 16, 64), mats.metal, [s * 0.1, 0, 0]);
    ring.rotation.y = Math.PI / 2;
    const cap = mesh(new THREE.CylinderGeometry(0.27, 0.3, 0.1, 40), mats.visor, [s * 0.12, 0, 0]);
    cap.rotation.z = Math.PI / 2;
    ear.add(disc, ring, cap);
    head.add(ear);
  }
  // Olhos: ovais luminosos, brilho e olhos «felizes» (arcos)
  const eyes: { oval: THREE.Mesh; glow: THREE.Sprite; happy: THREE.Mesh; side: number }[] = [];
  const arc = new THREE.TorusGeometry(0.12, 0.036, 12, 32, Math.PI);
  for (const s of [-1, 1]) {
    const oval = mesh(sphere, mats.eye);
    const glow = new THREE.Sprite(mats.glow);
    glow.scale.setScalar(0.62);
    const happy = mesh(arc, mats.eye);
    happy.scale.setScalar(0.001);
    head.add(oval, glow, happy);
    eyes.push({ oval, glow, happy, side: s });
  }

  // Corpo (pescoço, tronco, anca, braços e pernas)
  const body = new THREE.Group();
  body.add(mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.22, 32), mats.joint, [0, -0.98, 0]));
  body.add(mesh(sphere, mats.shell, [0, -1.46, 0], [0.6, 0.6, 0.52]));
  body.add(mesh(sphere, mats.joint, [0, -1.9, 0], [0.46, 0.22, 0.4]));
  const capsule = (r: number, l: number) => new THREE.CapsuleGeometry(r, l, 8, 24);

  const arms: { shoulder: THREE.Group; elbow: THREE.Group; side: number }[] = [];
  for (const s of [-1, 1]) {
    const shoulder = new THREE.Group();
    shoulder.position.set(s * 0.56, -1.22, 0);
    shoulder.add(mesh(sphere, mats.joint, [0, 0, 0], [0.16, 0.16, 0.16]));
    shoulder.add(mesh(capsule(0.12, 0.22), mats.shell, [0, -0.22, 0]));
    const elbow = new THREE.Group();
    elbow.position.y = -0.4;
    elbow.add(mesh(sphere, mats.joint, [0, 0, 0], [0.095, 0.095, 0.095]));
    elbow.add(mesh(capsule(0.115, 0.18), mats.shell, [0, -0.17, 0]));
    // Mão preta: palma e polegar
    elbow.add(mesh(sphere, mats.joint, [0, -0.38, 0.01], [0.14, 0.15, 0.11]));
    const thumb = mesh(capsule(0.04, 0.08), mats.joint, [-s * 0.12, -0.34, 0.05]);
    thumb.rotation.z = s * 0.6;
    elbow.add(thumb);
    shoulder.add(elbow);
    body.add(shoulder);
    arms.push({ shoulder, elbow, side: s });
  }

  const legs: { hip: THREE.Group; side: number }[] = [];
  for (const s of [-1, 1]) {
    const hip = new THREE.Group();
    hip.position.set(s * 0.22, -2.0, 0);
    hip.add(mesh(sphere, mats.joint, [0, 0, 0], [0.12, 0.12, 0.12]));
    hip.add(mesh(capsule(0.14, 0.06), mats.shell, [0, -0.16, 0]));
    const knee = mesh(new THREE.TorusGeometry(0.12, 0.045, 12, 32), mats.joint, [0, -0.3, 0]);
    knee.rotation.x = Math.PI / 2;
    hip.add(knee);
    hip.add(mesh(capsule(0.15, 0.12), mats.shell, [0, -0.47, 0]));
    hip.add(mesh(sphere, mats.joint, [0, -0.63, 0.02], [0.15, 0.06, 0.16]));
    hip.add(mesh(sphere, mats.shell, [0, -0.7, 0.05], [0.18, 0.1, 0.24]));
    body.add(hip);
    legs.push({ hip, side: s });
  }

  // Sombra suave no chão
  const shadow = mesh(new THREE.PlaneGeometry(2.6, 2.6), mats.shadow, [0, -2.55, 0]);
  // Plano virado para a câmara e achatado: lê-se como uma sombra elíptica no chão.
  shadow.scale.set(1, 0.22, 1);

  root.add(body, head);
  return { root, head, body, eyes, arms, legs, shadow, mats };
}

export default function HeroRobot({ pointer, className }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<"loading" | "3d" | "css">("loading");

  useEffect(() => {
    const el = wrap.current;
    const canvas = canvasRef.current;
    if (!el || !canvas) return;
    const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
    if (nav.connection?.saveData || (nav.deviceMemory ?? 8) < 2) return setMode("css");

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch {
      return setMode("css");
    }
    const gl = renderer.getContext();
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    const gpu = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : "";
    // GPU por software é demasiado lenta para o 3D: fica o robô em CSS.
    if (/swiftshader|llvmpipe|software/i.test(gpu) && !location.search.includes("robo3d")) {
      renderer.dispose();
      return setMode("css");
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 1.05;

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    scene.environment = pmrem.fromScene(room, 0.04).texture;
    scene.environmentIntensity = 0.85;
    room.dispose();

    let palette = readPalette();
    const glowTex = radialTexture();
    const bot = buildRobot(palette, glowTex);
    scene.add(bot.root, bot.shadow);
    const key = new THREE.DirectionalLight(palette.shell, 1.7);
    key.position.set(3, 5, 5);
    const rim = new THREE.DirectionalLight(palette.rim, 1.3);
    rim.position.set(-4, 2.5, -3);
    const hemi = new THREE.HemisphereLight(palette.shell, palette.ground, 0.55);
    scene.add(key, rim, hemi);

    const applyPalette = () => {
      palette = readPalette();
      bot.mats.shell.color.copy(palette.shell);
      bot.mats.joint.color.copy(palette.joint);
      bot.mats.visor.color.copy(palette.visor);
      bot.mats.disc.color.copy(palette.disc);
      bot.mats.metal.color.copy(palette.metal);
      bot.mats.eye.color.copy(palette.eye);
      bot.mats.glow.color.copy(palette.glow);
      bot.mats.shadow.color.copy(palette.shadow);
      bot.mats.shadow.opacity = palette.dark ? 0.6 : 0.34;
      rim.color.copy(palette.rim);
      hemi.groundColor.copy(palette.ground);
      if (!running) renderer.render(scene, camera);
    };
    const mo = new MutationObserver(applyPalette);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-mode"] });

    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    const BASE_Y = 0.8;
    const resize = () => {
      const w = el.clientWidth, h = el.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      // Enquadra o robô inteiro (com o braço levantado e a sombra) em qualquer proporção.
      const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const d = Math.max(4.5 / (2 * t), 3.5 / (2 * t * camera.aspect));
      camera.position.set(0, 0.15, d);
      camera.lookAt(0, -0.2, 0);
      camera.updateProjectionMatrix();
      if (!running) renderer.render(scene, camera);
    };

    // Estado da animação
    const st = {
      head: new THREE.Vector2(), eye: new THREE.Vector2(), body: new THREE.Vector2(),
      wave: 0, happy: 0, happyUntil: -1, jumpAt: -10, nextBlink: 2.5, blinkAt: -10, hover: false,
    };
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const pickTargets = [bot.root];
    const hit = (cx: number, cy: number) => {
      const r = canvas.getBoundingClientRect();
      if (cx < r.left || cx > r.right || cy < r.top || cy > r.bottom) return false;
      ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      return ray.intersectObjects(pickTargets, true).length > 0;
    };

    const clock = new THREE.Clock();
    let time = 0;
    const normal = new THREE.Vector3();
    const Z_AXIS = new THREE.Vector3(0, 0, 1);
    const tick = () => {
      const dt = Math.min(clock.getDelta(), 0.05);
      time += dt;
      const still = reduce.matches;
      const k = (rate: number) => 1 - Math.exp(-rate * dt);
      const p = pointer.current;
      const r = canvas.getBoundingClientRect();

      // Alvo do olhar: posição do cursor face ao centro da cabeça (normalizada pelo ecrã).
      let tx = 0, ty = 0;
      if (p?.active) {
        tx = clamp((p.x - (r.left + r.width / 2)) / (window.innerWidth * 0.45), -1, 1);
        ty = clamp((p.y - (r.top + r.height * 0.36)) / (window.innerHeight * 0.45), -1, 1);
      }
      st.head.x = lerp(st.head.x, tx, k(4.5));
      st.head.y = lerp(st.head.y, ty, k(4.5));
      st.eye.x = lerp(st.eye.x, tx, k(9));
      st.eye.y = lerp(st.eye.y, ty, k(9));
      st.body.x = lerp(st.body.x, tx, k(2.2));
      st.body.y = lerp(st.body.y, ty, k(2.2));

      // Cursor por cima do robô: acena.
      const over = !!p?.active && !p.touch && hit(p.x, p.y);
      if (over !== st.hover) {
        st.hover = over;
        canvas.style.cursor = over ? "pointer" : "";
      }
      st.wave = lerp(st.wave, over ? 1 : 0, k(6));
      st.happy = lerp(st.happy, time < st.happyUntil ? 1 : 0, k(12));

      // Flutuar, salto e inclinação de base
      const float = still ? 0 : Math.sin(time * 1.25) * 0.1;
      const jp = (time - st.jumpAt) / 0.62;
      const jump = !still && jp >= 0 && jp < 1 ? Math.sin(jp * Math.PI) * 0.5 : 0;
      bot.root.position.y = BASE_Y + float + jump;
      bot.root.rotation.z = -0.07 + (still ? 0 : Math.sin(time * 0.8) * 0.025);
      bot.root.rotation.y = -0.12;

      bot.head.rotation.y = st.head.x * 0.62;
      bot.head.rotation.x = st.head.y * 0.32;
      bot.body.rotation.y = st.body.x * 0.2;
      bot.body.rotation.x = st.body.y * 0.06;

      // Piscar sozinho a cada 3–5 s
      if (!still && time > st.nextBlink) {
        st.blinkAt = time;
        st.nextBlink = time + 3 + Math.random() * 2;
      }
      const bp = (time - st.blinkAt) / 0.18;
      const blink = bp >= 0 && bp < 1 ? 1 - Math.sin(bp * Math.PI) * 0.92 : 1;

      // Olhos: mexem-se mais do que a cabeça, sobre a superfície do visor
      const ex = st.eye.x * 0.12, ey = -st.eye.y * 0.09;
      for (const e of bot.eyes) {
        const x = e.side * EYE_X + ex, y = EYE_Y + ey;
        const z = visorZ(x, y);
        normal.set(x / VX ** 2, y / VY ** 2, (z - VZ0) / VZ ** 2).normalize();
        e.oval.position.set(x, y, z - 0.012);
        e.oval.quaternion.setFromUnitVectors(Z_AXIS, normal);
        const open = Math.max(0.001, blink * (1 - st.happy));
        e.oval.scale.set(0.125, 0.18 * open, 0.05);
        e.happy.position.set(x, y - 0.03, z + 0.005);
        e.happy.quaternion.copy(e.oval.quaternion);
        e.happy.scale.setScalar(Math.max(0.001, st.happy));
        e.glow.position.set(x, y, z + 0.06);
        e.glow.scale.set(0.62, 0.62 * Math.max(0.35, open + st.happy * 0.4), 1);
      }

      // Braços: pose de voo; o braço direito acena com o cursor por cima
      for (const a of bot.arms) {
        const sway = still ? 0 : Math.sin(time * 1.25 + a.side) * 0.05;
        const baseZ = a.side * (0.48 + sway);
        if (a.side > 0) {
          a.shoulder.rotation.z = lerp(baseZ, 2.55, st.wave);
          a.elbow.rotation.z = lerp(0.22, 0.45 + Math.sin(time * 9) * (still ? 0.2 : 0.5), st.wave);
        } else {
          a.shoulder.rotation.z = baseZ;
          a.elbow.rotation.z = -0.22;
        }
        a.shoulder.rotation.x = -0.18;
      }
      // Pernas penduradas, com ligeiro balanço
      for (const l of bot.legs) {
        l.hip.rotation.x = (l.side < 0 ? 0.28 : -0.06) + (still ? 0 : Math.sin(time * 1.25 + l.side) * 0.06);
        l.hip.rotation.z = l.side * 0.08;
      }

      // A sombra encolhe e esbate quando o robô sobe
      const lift = float + jump;
      bot.shadow.scale.set(1 - lift * 0.5, 0.22 * (1 - lift * 0.5), 1);
      bot.mats.shadow.opacity = (palette.dark ? 0.6 : 0.34) * (1 - lift * 0.9);

      renderer.render(scene, camera);
    };

    // Clique ou toque no robô: olhos felizes e um pequeno salto
    const onDown = (e: PointerEvent) => {
      if (!hit(e.clientX, e.clientY)) return;
      st.happyUntil = time + 1.4;
      if (!reduce.matches && time - st.jumpAt > 0.62) st.jumpAt = time;
      if (!running) tick();
    };
    canvas.addEventListener("pointerdown", onDown);

    // Só anima quando o banner está visível e o separador activo
    let running = false;
    let raf = 0;
    let visible = true;
    const loop = () => { tick(); raf = requestAnimationFrame(loop); };
    const update = () => {
      const should = visible && !document.hidden;
      if (should && !running) { running = true; clock.getDelta(); raf = requestAnimationFrame(loop); }
      else if (!should && running) { running = false; cancelAnimationFrame(raf); }
    };
    const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; update(); });
    io.observe(el);
    document.addEventListener("visibilitychange", update);
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();
    tick();
    setMode("3d");
    update();

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      mo.disconnect();
      document.removeEventListener("visibilitychange", update);
      canvas.removeEventListener("pointerdown", onDown);
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) o.geometry.dispose();
      });
      Object.values(bot.mats).forEach((m) => m.dispose());
      glowTex.dispose();
      scene.environment?.dispose();
      pmrem.dispose();
      renderer.dispose();
    };
  }, [pointer]);

  return (
    <div ref={wrap} className={cn("relative h-full w-full", className)}>
      {mode !== "3d" && <RobotCss className="absolute inset-0" />}
      <canvas
        ref={canvasRef}
        aria-hidden
        className={cn("absolute inset-0 size-full touch-manipulation transition-opacity duration-[var(--dur-enter)]", mode === "3d" ? "opacity-100" : "opacity-0")}
      />
    </div>
  );
}
