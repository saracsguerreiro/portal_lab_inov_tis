"use client";
// Primitivas de movimento. Regras (secção 18): só transform e opacity, durações dos tokens,
// e com «reduzir movimento» ficam só fades curtos. As entradas são curtas para não atrasar o conteúdo.
import * as React from "react";
import { animate, motion, useInView, useMotionValue, useReducedMotion, useSpring, useTransform, type Variants } from "motion/react";
import { cn } from "@/lib/utils";

export const EASE_OUT = [0.22, 1, 0.36, 1] as const;
export const DUR = { micro: 0.18, base: 0.24, enter: 0.48, page: 0.6 } as const;
export const SPRING = { type: "spring", stiffness: 380, damping: 30 } as const;

/** Entrada suave quando o elemento entra no ecrã. */
export function Reveal({ children, delay = 0, y = 16, className, as = "div" }: { children: React.ReactNode; delay?: number; y?: number; className?: string; as?: "div" | "section" | "li" | "article" }) {
  const reduce = useReducedMotion();
  const Comp = motion[as];
  return (
    <Comp
      className={className}
      initial={{ opacity: 0, y: reduce ? 0 : y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      transition={{ duration: reduce ? 0.12 : DUR.enter, ease: EASE_OUT, delay: reduce ? 0 : delay }}
    >
      {children}
    </Comp>
  );
}

const staggerParent: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const staggerChild: Variants = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: DUR.enter, ease: EASE_OUT } } };

/** Entrada em cascata (cartões de projectos, listas). */
export function Stagger({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={staggerParent} initial="hidden" whileInView="show" viewport={{ once: true, margin: "0px 0px -10% 0px" }}>
      {children}
    </motion.div>
  );
}
export function StaggerItem({ children, className }: { children: React.ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div className={className} variants={reduce ? { hidden: { opacity: 0 }, show: { opacity: 1 } } : staggerChild}>
      {children}
    </motion.div>
  );
}

/**
 * Título revelado palavra a palavra. Usa animação CSS (corre na primeira pintura, sem
 * esperar pela hidratação), para não atrasar o LCP. O texto completo fica para leitores de ecrã.
 */
export function WordReveal({ text, className, delay = 0.05, highlight }: { text: string; className?: string; delay?: number; highlight?: string[] }) {
  const words = text.split(" ");
  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden>
        {words.map((w, i) => (
          <React.Fragment key={i}>
            <span className="inline-block overflow-hidden pb-[0.12em] align-bottom">
              <span
                className={cn("word-up inline-block", highlight?.includes(w.replace(/[.,]/g, "")) && "bg-gradient-to-r from-lab via-brand to-inc bg-clip-text text-transparent")}
                style={{ animationDelay: `${delay + i * 0.06}s` }}
              >
                {w}
              </span>
            </span>
            {i < words.length - 1 && " "}
          </React.Fragment>
        ))}
      </span>
    </span>
  );
}

/** Entrada CSS para o primeiro ecrã (sem depender de JavaScript). */
export function CssRise({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <div className={cn("animate-rise", className)} style={{ animationDelay: `${delay}s` }}>
      {children}
    </div>
  );
}

/** Contador animado que sobe quando entra no ecrã. */
export function Counter({ value, className, format = (n: number) => new Intl.NumberFormat("pt-PT").format(n), duration = 1.4 }: { value: number; className?: string; format?: (n: number) => string; duration?: number }) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });
  const reduce = useReducedMotion();
  const [display, setDisplay] = React.useState(value);
  const started = React.useRef(false);
  React.useEffect(() => {
    if (!inView || started.current) return;
    started.current = true;
    if (reduce) return setDisplay(value);
    const controls = animate(0, value, { duration, ease: EASE_OUT, onUpdate: (v) => setDisplay(Number.isInteger(value) ? Math.round(v) : Math.round(v * 10) / 10) });
    return () => controls.stop();
  }, [inView, value, reduce, duration]);
  React.useEffect(() => {
    if (started.current) setDisplay(value);
  }, [value]);
  return (
    <span ref={ref} className={cn("tabular", className)}>
      <span className="sr-only">{format(value)}</span>
      <span aria-hidden>{format(display)}</span>
    </span>
  );
}

/** Cartão com inclinação 3D subtil ao passar o rato (desligada em ecrãs tácteis e com reduzir movimento). */
export function TiltCard({ children, className, max = 6, glow }: { children: React.ReactNode; className?: string; max?: number; glow?: "lab" | "inc" }) {
  const reduce = useReducedMotion();
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rx = useSpring(useTransform(my, [0, 1], [max, -max]), { stiffness: 260, damping: 22 });
  const ry = useSpring(useTransform(mx, [0, 1], [-max, max]), { stiffness: 260, damping: 22 });
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (reduce || e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width);
    my.set((e.clientY - r.top) / r.height);
  };
  const reset = () => {
    mx.set(0.5);
    my.set(0.5);
  };
  return (
    <motion.div
      className={cn("group/tilt [transform-style:preserve-3d] [perspective:900px]", className)}
      style={reduce ? undefined : { rotateX: rx, rotateY: ry }}
      onPointerMove={onMove}
      onPointerLeave={reset}
      whileHover={reduce ? undefined : { y: -4 }}
      transition={SPRING}
      data-glow={glow}
    >
      {children}
    </motion.div>
  );
}

/** Pequeno «pop» para confirmações (copiado, guardado). */
export function PopIn({ show, children, className }: { show: boolean; children: React.ReactNode; className?: string }) {
  return (
    <motion.span
      className={className}
      initial={false}
      animate={show ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.6 }}
      transition={SPRING}
      aria-hidden={!show}
    >
      {children}
    </motion.span>
  );
}

export { motion, AnimatePresence, LayoutGroup, useReducedMotion } from "motion/react";
