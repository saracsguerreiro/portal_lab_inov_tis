"use client";
// Banner principal da Home: texto à esquerda, robô 3D ao centro e cartão «Contacto visual» à direita.
// O cursor alimenta três coisas: o olhar do robô, o parallax do fundo (--px, --py)
// e a proximidade ao robô (--near), que faz subir as barras do cartão.
import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { ArrowRight, Sparkles } from "lucide-react";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui";
import { CssRise } from "@/components/motion";
import { RobotCss, type HeroPointer } from "@/components/motion/robot-css";
import { AppLink } from "@/components/layout/app-link";

// O three.js só é carregado nesta página, depois da hidratação. Até lá, fica o robô em CSS.
const HeroRobot = dynamic(() => import("@/components/motion/hero-robot"), {
  ssr: false,
  loading: () => <RobotCss className="absolute inset-0" />,
});

const ROBOT_LABEL =
  "Robô mascote do ecossistema: branco e redondo, com um visor preto e dois olhos azuis luminosos, a flutuar. A cabeça segue o cursor, acena quando o cursor passa por cima e dá um salto de alegria quando lhe tocam.";

// Pares de barras do cartão: altura máxima (%) e sensibilidade à proximidade.
const BARS: [number, number, number, number][] = [
  [46, 0.9, 30, 0.6],
  [64, 1, 40, 0.75],
  [100, 1, 56, 0.85],
  [74, 0.95, 44, 0.7],
];

// Esferas decorativas: posição (%), tamanho (px), profundidade do parallax e duração da flutuação (s).
// No telemóvel só ficam as das margens, para não passarem por cima do texto.
const PEARLS: [number, number, number, number, number][] = [
  [17, 14, 12, 18, 7],
  [27, 78, 18, 26, 9],
  [6, 52, 9, 12, 8],
  [64, 10, 10, 14, 6.5],
  [90, 30, 16, 22, 8.5],
  [72, 86, 11, 16, 7.5],
  [47, 92, 8, 10, 9.5],
];

export function HomeHero({ canSubmit, personal }: { canSubmit: boolean; personal?: React.ReactNode }) {
  const sectionRef = useRef<HTMLElement>(null);
  const robotRef = useRef<HTMLDivElement>(null);
  const pointer = useRef<HeroPointer>({ x: 0, y: 0, active: false, touch: false });

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let raf = 0;
    let touchTimer: ReturnType<typeof setTimeout> | undefined;

    const apply = () => {
      raf = 0;
      const p = pointer.current;
      let px = 0, py = 0, near = 0;
      if (p.active) {
        const r = el.getBoundingClientRect();
        if (!reduce.matches) {
          px = Math.max(-1, Math.min(1, ((p.x - r.left) / r.width - 0.5) * 2));
          py = Math.max(-1, Math.min(1, ((p.y - r.top) / r.height - 0.5) * 2));
        }
        const rr = robotRef.current?.getBoundingClientRect();
        if (rr) {
          const d = Math.hypot(p.x - (rr.left + rr.width / 2), p.y - (rr.top + rr.height * 0.42));
          near = Math.max(0, Math.min(1, 1 - (d - rr.width * 0.18) / Math.max(320, r.width * 0.42)));
        }
      }
      el.style.setProperty("--px", px.toFixed(3));
      el.style.setProperty("--py", py.toFixed(3));
      el.style.setProperty("--near", near.toFixed(3));
      el.dataset.near = near > 0.66 ? "3" : near > 0.33 ? "2" : "1";
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(apply); };
    const move = (e: PointerEvent) => {
      clearTimeout(touchTimer);
      pointer.current = { x: e.clientX, y: e.clientY, active: true, touch: e.pointerType !== "mouse" };
      schedule();
    };
    const leave = () => {
      pointer.current = { ...pointer.current, active: false };
      schedule();
    };
    // No telemóvel, depois de largar o dedo, o robô volta à posição inicial.
    const up = (e: PointerEvent) => {
      if (e.pointerType === "mouse") return;
      clearTimeout(touchTimer);
      touchTimer = setTimeout(leave, 2500);
    };
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerdown", move, { passive: true });
    window.addEventListener("pointerup", up, { passive: true });
    window.addEventListener("blur", leave);
    document.documentElement.addEventListener("mouseleave", leave);
    apply();
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(touchTimer);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("blur", leave);
      document.documentElement.removeEventListener("mouseleave", leave);
    };
  }, []);

  return (
    <section ref={sectionRef} aria-labelledby="hero-h" className="hero-orbit relative isolate overflow-hidden" data-near="1">
      <HexBackdrop />
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        {PEARLS.map(([x, y, size, depth, dur], i) => (
          <span key={i} className={`hero-parallax absolute ${x > 8 && x < 88 ? "max-lg:hidden" : ""}`} style={{ left: `${x}%`, top: `${y}%`, ["--depth" as string]: depth }}>
            <span className="hero-pearl block" style={{ width: size, height: size, animationDuration: `${dur}s`, animationDelay: `${-i * 1.3}s` }} />
          </span>
        ))}
      </div>

      <div className="container-x relative grid gap-4 pb-20 pt-10 md:pt-14 lg:min-h-[min(44rem,84vh)] lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)_minmax(0,3fr)] lg:items-center lg:gap-6 lg:pb-24 lg:pt-8">
        {personal && <div className="lg:col-span-3">{personal}</div>}

        <div className="relative z-10 grid content-center gap-6">
          <CssRise>
            <p className="inline-flex w-fit items-center gap-2 rounded-full border border-line bg-surface/70 px-3 py-1.5 text-sm text-fg-muted backdrop-blur">
              <span className="size-2 rounded-full bg-lab" aria-hidden /> Innovation Lab
              <span className="text-fg-subtle">+</span>
              <span className="size-2 rounded-full bg-inc" aria-hidden /> Incubadora
            </p>
          </CssRise>
          <h1 id="hero-h" className="font-display text-[length:clamp(2.25rem,3.5vw+0.5rem,3.25rem)] font-bold leading-[1.08] tracking-[-0.03em]">
            {["Da ideia ao negócio,", "inovamos juntos", "em Angola."].map((line, i) => (
              <span key={line} className="block overflow-hidden pb-[0.14em] -mb-[0.06em]">
                <span
                  className={i === 1 ? "word-up inline-block bg-[linear-gradient(90deg,var(--inc),var(--ai)_50%,var(--lab))] bg-clip-text text-transparent" : "word-up inline-block"}
                  style={{ animationDelay: `${0.05 + i * 0.1}s` }}
                >
                  {line}
                </span>
              </span>
            ))}
          </h1>
          <CssRise delay={0.35}>
            <p className="max-w-xl text-balance text-lg text-fg-muted">
              O ecossistema de inovação da TIS recolhe ideias de dentro e de fora da empresa, testa-as no Laboratório e fá-las crescer na Incubadora.
            </p>
          </CssRise>
          <CssRise delay={0.45} className="flex flex-wrap gap-3">
            {canSubmit && (
              <Button asChild size="lg" className="rounded-full px-6">
                <AppLink href="/submeter"><Sparkles /> {t("nav.submit")}</AppLink>
              </Button>
            )}
            <Button asChild size="lg" variant="secondary" className="rounded-full bg-surface/80 px-6 backdrop-blur">
              <AppLink href="/ecossistema">Conhecer o ecossistema <ArrowRight /></AppLink>
            </Button>
          </CssRise>
        </div>

        <div
          ref={robotRef}
          role="img"
          aria-label={ROBOT_LABEL}
          className="relative mx-auto aspect-[5/6] w-full max-w-[22rem] sm:max-w-md lg:max-w-none"
        >
          <HeroRobot pointer={pointer} />
        </div>

        <EyeContactCard />
      </div>
    </section>
  );
}

/** Padrão de hexágonos em relevo suave, esbatido nas margens, com parallax ligeiro. */
function HexBackdrop() {
  // Hexágonos «em pé» de raio R; o padrão repete-se a cada √3·R × 3R.
  const R = 76, W = Math.sqrt(3) * R, H = 3 * R, g = 0.9;
  const hex = (cx: number, cy: number) =>
    Array.from({ length: 6 }, (_, i) => {
      const a = (Math.PI / 3) * i - Math.PI / 2;
      return `${(cx + Math.cos(a) * R * g).toFixed(1)},${(cy + Math.sin(a) * R * g).toFixed(1)}`;
    }).join(" ");
  const cells: [number, number][] = [[W / 2, R], [0, 2.5 * R], [W, 2.5 * R], [W / 2, 4 * R], [0, -0.5 * R], [W, -0.5 * R]];
  return (
    <div className="hero-hex hero-parallax pointer-events-none absolute -inset-10 -z-20" style={{ ["--depth" as string]: 10 }} aria-hidden>
      <svg className="size-full">
        <defs>
          <pattern id="hero-hex" width={W} height={H} patternUnits="userSpaceOnUse" x="-20" y="-40">
            {cells.map(([x, y], i) => (
              <g key={i}>
                <polygon points={hex(x + 1.5, y + 2)} className="hero-hex__lo" />
                <polygon points={hex(x - 1, y - 1)} className="hero-hex__hi" />
                <polygon points={hex(x, y)} className="hero-hex__face" />
              </g>
            ))}
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hero-hex)" />
      </svg>
    </div>
  );
}

/** Cartão decorativo: as barras sobem quando o cursor se aproxima do robô. */
function EyeContactCard() {
  return (
    <div className="grid justify-items-center gap-3 self-end justify-self-center lg:mb-4 lg:justify-self-end">
      <div className="hero-card rounded-[var(--radius-xl)] border border-line bg-surface p-5 shadow-2">
        <div className="flex h-32 w-48 items-end justify-center gap-4" aria-hidden>
          {BARS.map(([a, ka, b, kb], i) => (
            <div key={i} className="flex h-full items-end gap-1.5">
              <span className="hero-bar hero-bar--a" style={{ height: `${a}%`, ["--k" as string]: ka }} />
              <span className="hero-bar hero-bar--b" style={{ height: `${b}%`, ["--k" as string]: kb }} />
            </div>
          ))}
        </div>
      </div>
      <p className="text-sm font-medium text-fg">Contacto visual</p>
      <div className="hero-dots flex items-center gap-1.5" aria-hidden>
        <span /><span /><span />
      </div>
    </div>
  );
}
