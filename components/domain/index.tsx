"use client";
import * as React from "react";
import Link from "next/link";
import { ArrowRight, Check, ChevronRight, Clock, FlaskConical, Globe2, Lock, LogIn, Rocket, ShieldAlert, Upload, Users, X } from "lucide-react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { t, fmtDate } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { areaTone, decisionTone, L, statusTone, visibilityTone } from "@/lib/domain/labels";
import type { Area, Decision, IdeaStatus, Visibility } from "@/lib/domain/types";
import { canAccessPage, type PageCode } from "@/lib/permissions";
import { useSession } from "@/lib/client/hooks";
import { IS_DEMO } from "@/lib/client/runtime";
import { ACCEPTED_MIME, MAX_FILE_BYTES, MAX_FILES } from "@/lib/validation/forms";
import type { Attachment } from "@/lib/domain/types";
import { Button, Card, EmptyState, ListSkeleton, Tag } from "@/components/ui";
import { TiltCard } from "@/components/motion";
import { AppLink } from "@/components/layout/app-link";

// ------------------------------------------------------------- Etiquetas

export const StatusTag = ({ status, decision }: { status: IdeaStatus; decision?: Decision | null }) =>
  status === "DECISAO" && decision ? <Tag tone={decisionTone[decision]} dot>{L.decision(decision)}</Tag> : <Tag tone={statusTone[status]} dot>{L.status(status)}</Tag>;
export const AreaTag = ({ area }: { area: Area }) => (
  <Tag tone={areaTone[area]}>
    {area === "LAB" ? <FlaskConical className="size-3" aria-hidden /> : <Rocket className="size-3" aria-hidden />}
    {L.area(area)}
  </Tag>
);
export const VisibilityTag = ({ v }: { v: Visibility }) => (
  <Tag tone={visibilityTone[v]}>
    {v === "PUBLICO" ? <Globe2 className="size-3" aria-hidden /> : v === "INTERNO" ? <Users className="size-3" aria-hidden /> : <Lock className="size-3" aria-hidden />}
    {L.visibility(v)}
  </Tag>
);

// ------------------------------------------------------------- Cabeçalho de página e migalhas

export function Breadcrumbs({ items }: { items: { href?: string; label: string }[] }) {
  return (
    <nav aria-label={t("nav.breadcrumb")} className="mb-6">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-fg-subtle">
        <li><Link href="/" className="hover:text-fg">{t("nav.home")}</Link></li>
        {items.map((i, n) => (
          <li key={n} className="flex items-center gap-1">
            <ChevronRight className="size-3.5" aria-hidden />
            {i.href ? <Link href={i.href} className="hover:text-fg">{i.label}</Link> : <span aria-current="page" className="text-fg-muted">{i.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function PageHeader({ eyebrow, title, lead, crumbs, actions, tone }: { eyebrow?: React.ReactNode; title: React.ReactNode; lead?: React.ReactNode; crumbs?: { href?: string; label: string }[]; actions?: React.ReactNode; tone?: "lab" | "inc" | "ai" }) {
  return (
    <div className="relative overflow-hidden border-b border-line">
      <div className={cn("pointer-events-none absolute inset-0 opacity-70", tone === "lab" && "bg-[radial-gradient(60%_100%_at_100%_0%,var(--lab-soft),transparent)]", tone === "inc" && "bg-[radial-gradient(60%_100%_at_100%_0%,var(--inc-soft),transparent)]", tone === "ai" && "bg-[radial-gradient(60%_100%_at_100%_0%,var(--ai-soft),transparent)]")} aria-hidden />
      <div className="container-x relative py-10 md:py-14">
        {crumbs && <Breadcrumbs items={crumbs} />}
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="grid max-w-3xl gap-3">
            {eyebrow && <p className="text-xs font-bold uppercase tracking-[var(--ds-letter-spacing-wider)] text-fg-subtle">{eyebrow}</p>}
            <h1 className="text-balance font-display text-[length:var(--text-4xl)] font-bold">{title}</h1>
            {lead && <p className="text-balance text-lg text-fg-muted">{lead}</p>}
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------- Sub-menu fixo por âncoras (P02–P04)

export function SubNav({ items, tone = "brand" }: { items: { id: string; label: string }[]; tone?: "brand" | "lab" | "inc" }) {
  const [active, setActive] = React.useState(items[0]?.id);
  React.useEffect(() => {
    const els = items.map((i) => document.getElementById(i.id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (vis[0]) setActive(vis[0].target.id);
      },
      { rootMargin: "-30% 0px -60% 0px" },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [items]);
  void tone; // DS: indicador activo sempre com a cor Brand
  const color = "bg-brand";
  return (
    <nav aria-label="Nesta página" className="sticky top-16 z-30 border-b border-line bg-bg/85 backdrop-blur-xl md:top-[72px]">
      <ul className="container-x flex gap-1 overflow-x-auto py-2 [scrollbar-width:none]">
        {items.map((i) => (
          <li key={i.id} className="shrink-0">
            <a
              href={`#${i.id}`}
              onClick={(e) => {
                const lenis = (window as unknown as { __lenis?: { scrollTo: (el: string, o: object) => void } }).__lenis;
                if (lenis) {
                  e.preventDefault();
                  lenis.scrollTo(`#${i.id}`, { offset: -120 });
                  history.replaceState(null, "", `#${i.id}`);
                }
              }}
              aria-current={active === i.id ? "location" : undefined}
              className={cn("relative block rounded-full px-3.5 py-2 text-sm transition-colors", active === i.id ? "font-bold text-on-brand" : "text-fg-muted hover:text-fg")}
            >
              {active === i.id && <motion.span layoutId="subnav-pill" className={cn("absolute inset-0 -z-10 rounded-full", color)} transition={{ type: "spring", stiffness: 380, damping: 30 }} />}
              {i.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

// ------------------------------------------------------------- Cartão de projecto

export interface ProjectCardData {
  id: string; slug: string; name: string; area: Area; workLine?: string | null; stage: string; visibility: Visibility; shortDescription: string; cover?: string; exit?: { kind: string } | null;
}
export function ProjectCard({ p, showVisibility = true }: { p: ProjectCardData; showVisibility?: boolean }) {
  return (
    <TiltCard className="h-full" glow={p.area === "LAB" ? "lab" : "inc"}>
      <AppLink
        href={`/projectos/${p.slug}`}
        className={cn("group flex h-full flex-col overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface shadow-1 transition-shadow duration-[var(--dur-base)]", p.area === "LAB" ? "hover:shadow-[var(--glow-lab)]" : "hover:shadow-[var(--glow-inc)]")}
      >
        <div className="relative h-40 overflow-hidden" style={{ viewTransitionName: `cover-${p.slug}` }}>
          <div className="absolute inset-0 transition-transform duration-[var(--dur-enter)] ease-[var(--ease-out)] group-hover:scale-105" style={{ background: p.cover ?? "var(--surface-3)" }} />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_120%,rgb(255_255_255/0.35),transparent_50%)] mix-blend-overlay" aria-hidden />
          <span className="absolute bottom-3 left-4 font-display text-4xl font-bold text-white/90 drop-shadow-sm" aria-hidden>{p.name.slice(0, 1)}</span>
          <div className="absolute right-3 top-3 flex gap-1.5">{showVisibility && <VisibilityTag v={p.visibility} />}</div>
        </div>
        <div className="flex flex-1 flex-col gap-3 p-5">
          <div className="flex flex-wrap gap-1.5">
            <AreaTag area={p.area} />
            <Tag>{L.stage(p.stage)}</Tag>
            {p.workLine && <Tag>{p.workLine}</Tag>}
            {p.exit && <Tag tone="ok">{L.exit(p.exit.kind)}</Tag>}
          </div>
          <h3 className="font-display text-xl font-bold leading-tight">{p.name}</h3>
          <p className="line-clamp-3 text-sm text-fg-muted">{p.shortDescription}</p>
          <span className="mt-auto flex items-center gap-1 pt-2 text-sm font-medium text-brand-ink">
            Ver projecto <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
          </span>
        </div>
      </AppLink>
    </TiltCard>
  );
}

// ------------------------------------------------------------- Linha do tempo da ideia (estado actual a pulsar)

export function IdeaTimeline({ steps, status, decision }: { steps: { status: string; at: string; current: boolean; done: boolean }[]; status: string; decision?: Decision | null }) {
  const ref = React.useRef<HTMLOListElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const endTone = decision ? decisionTone[decision] : "brand";
  const doneCount = steps.filter((s) => s.done || s.current).length;
  return (
    <ol ref={ref} className="relative grid gap-0" aria-label="Linha do tempo da ideia">
      <div className="absolute bottom-6 left-[15px] top-4 w-0.5 bg-surface-3" aria-hidden />
      <motion.div
        className="absolute left-[15px] top-4 w-0.5 origin-top bg-brand"
        style={{ height: `calc(${((Math.max(1, doneCount) - 1) / Math.max(1, steps.length - 1)) * 100}% - 40px)` }}
        initial={{ scaleY: 0 }}
        animate={inView ? { scaleY: 1 } : {}}
        transition={{ duration: reduce ? 0 : 1, ease: [0.22, 1, 0.36, 1] }}
        aria-hidden
      />
      {steps.map((s, i) => {
        const isEnd = s.status === "DECISAO" && decision;
        return (
          <motion.li
            key={s.status}
            className="relative flex gap-4 pb-6 last:pb-0"
            initial={{ opacity: 0, x: reduce ? 0 : -8 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: reduce ? 0 : 0.15 + i * 0.12, duration: 0.4 }}
            aria-current={s.current ? "step" : undefined}
          >
            <span className="relative z-10 grid size-8 shrink-0 place-items-center">
              {s.current && !["RETIRADA", "DUPLICADA"].includes(status) && <span className="pulse-ring absolute inset-0 rounded-full bg-brand/40" aria-hidden />}
              <span
                className={cn(
                  "relative grid size-8 place-items-center rounded-full border-2 text-xs font-bold transition-colors",
                  s.done && !s.current && "border-brand bg-brand text-on-brand",
                  s.current && (isEnd ? `border-transparent text-white ${{ ok: "bg-ok", warn: "bg-warn", info: "bg-info", danger: "bg-danger" }[endTone as "ok"] ?? "bg-brand"}` : "border-brand bg-surface text-brand-ink"),
                  !s.done && !s.current && "border-line-strong bg-surface text-fg-subtle",
                )}
              >
                {s.done && !s.current ? <Check className="size-4" strokeWidth={3} /> : i + 1}
              </span>
            </span>
            <div className="pt-1">
              <p className={cn("font-medium", !s.done && !s.current && "text-fg-subtle")}>
                {isEnd && s.current ? L.decision(decision!) : L.status(s.status as IdeaStatus)}
                {s.current && <span className="ml-2 rounded-full bg-brand-soft px-2 py-0.5 text-xs text-brand-ink">Agora</span>}
              </p>
              <p className="text-sm text-fg-subtle">{s.at ? fmtDate(s.at, { day: "numeric", month: "long", year: "numeric" }) : s.current ? t(`statusCreator.${s.status}`) : "—"}</p>
            </div>
          </motion.li>
        );
      })}
    </ol>
  );
}

// ------------------------------------------------------------- Medidor da pontuação da IA

export function ScoreGauge({ value, size = 140, label = t("ai.score") }: { value: number; size?: number; label?: string }) {
  const ref = React.useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const r = 52;
  const c = 2 * Math.PI * r;
  const color = value >= 70 ? "var(--ok)" : value >= 45 ? "var(--warn)" : "var(--danger)";
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg ref={ref} viewBox="0 0 120 120" className="-rotate-90" width={size} height={size} role="img" aria-label={`${label}: ${value} em 100`}>
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--surface-3)" strokeWidth="10" />
        <motion.circle
          cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={inView ? { strokeDashoffset: c * (1 - value / 100) } : {}}
          transition={{ duration: reduce ? 0 : 1.2, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute grid place-items-center text-center">
        <span className="font-display text-4xl font-bold tabular">{value}</span>
        <span className="text-xs text-fg-subtle">/ 100</span>
      </div>
    </div>
  );
}

export function CriterionBar({ name, score, weight, justification, delay = 0 }: { name: string; score: number; weight: number; justification: string; delay?: number }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  return (
    <div ref={ref} className="grid gap-1.5">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium">{name} <span className="text-fg-subtle">· {weight}%</span></span>
        <span className="font-mono tabular">{score}/5</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-3" role="meter" aria-valuemin={1} aria-valuemax={5} aria-valuenow={score} aria-label={name}>
        <motion.div className="h-full origin-left rounded-full bg-ai" initial={{ scaleX: 0 }} animate={inView ? { scaleX: score / 5 } : {}} transition={{ duration: reduce ? 0 : 0.8, delay: reduce ? 0 : delay, ease: [0.22, 1, 0.36, 1] }} />
      </div>
      <p className="text-sm text-fg-muted">{justification}</p>
    </div>
  );
}

/** Texto a aparecer em tempo real (efeito de escrita) — resumo da IA. */
export function Typewriter({ text, speed = 12 }: { text: string; speed?: number }) {
  const reduce = useReducedMotion();
  const [n, setN] = React.useState(0);
  React.useEffect(() => {
    if (reduce) return setN(text.length);
    setN(0);
    const id = setInterval(() => setN((x) => (x >= text.length ? (clearInterval(id), x) : x + 2)), speed);
    return () => clearInterval(id);
  }, [text, speed, reduce]);
  return (
    <p className={cn("whitespace-pre-line", n < text.length && "typing-caret")} aria-live="polite">
      <span className="sr-only">{text}</span>
      <span aria-hidden>{text.slice(0, n)}</span>
    </p>
  );
}

// ------------------------------------------------------------- Contagem decrescente e participações

export function Countdown({ to, compact }: { to: string; compact?: boolean }) {
  const [now, setNow] = React.useState<number | null>(null);
  React.useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = Math.max(0, new Date(to).getTime() - (now ?? new Date(to).getTime() - 86400000 * 30));
  const d = Math.floor(diff / 86400000), h = Math.floor((diff / 3600000) % 24), m = Math.floor((diff / 60000) % 60), s = Math.floor((diff / 1000) % 60);
  if (diff === 0 && now) return <span className="text-sm text-fg-subtle">Prazo terminado</span>;
  if (compact) return <span className="inline-flex items-center gap-1 text-sm font-medium tabular"><Clock className="size-3.5" aria-hidden />{now ? `${d} dias e ${h} h` : fmtDate(to)}</span>;
  return (
    <div className="flex gap-2" role="timer" aria-label={`Faltam ${d} dias e ${h} horas`}>
      {[[d, "dias"], [h, "horas"], [m, "min"], [s, "seg"]].map(([v, l]) => (
        <div key={l as string} className="grid min-w-16 place-items-center rounded-[var(--radius-md)] bg-surface-2 px-3 py-2">
          <motion.span key={String(v)} initial={{ y: -6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="font-display text-2xl font-bold tabular" aria-hidden>{String(v).padStart(2, "0")}</motion.span>
          <span className="text-xs text-fg-subtle" aria-hidden>{l}</span>
        </div>
      ))}
    </div>
  );
}

// ------------------------------------------------------------- Guarda de página (a verificação real é no servidor)

export function RequirePage({ page, children, title }: { page: PageCode; children: React.ReactNode; title?: string }) {
  const { actor, user, ready } = useSession();
  if (!ready) return <div className="container-x py-16"><ListSkeleton rows={4} /></div>;
  if (!canAccessPage(actor, page)) {
    return (
      <div className="container-x py-20">
        <EmptyState
          icon={user ? <ShieldAlert className="size-6" /> : <LogIn className="size-6" />}
          title={user ? t("states.forbidden") : `Entre para ver ${title ?? "esta página"}`}
          hint={user ? `O perfil «${L.role(user.role)}» não tem acesso a esta página.` : t("states.forbiddenHint")}
          action={!user ? <Button asChild><Link href="/entrar">{t("nav.signIn")}</Link></Button> : <Button asChild variant="secondary"><Link href="/">{t("nav.home")}</Link></Button>}
        />
      </div>
    );
  }
  return <>{children}</>;
}

// ------------------------------------------------------------- Captcha

/** Verificação anti-robot. Modo completo: Cloudflare Turnstile. Demonstração: caixa de verificação. */
export function Captcha({ onToken, error }: { onToken: (t: string) => void; error?: string }) {
  const [checked, setChecked] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (IS_DEMO || !siteKey || !ref.current) return;
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.onload = () => (window as unknown as { turnstile: { render: (el: HTMLElement, o: object) => void } }).turnstile.render(ref.current!, { sitekey: siteKey, callback: onToken, language: "pt" });
    document.head.appendChild(s);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteKey]);
  if (!IS_DEMO && siteKey) return <div ref={ref} />;
  return (
    <div className="grid gap-1.5">
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        aria-invalid={!!error || undefined}
        onClick={() => {
          if (checked) return;
          setBusy(true);
          setTimeout(() => {
            setBusy(false);
            setChecked(true);
            onToken("demo-ok");
          }, 700);
        }}
        className={cn("flex h-16 w-full max-w-sm items-center gap-3 rounded-[var(--radius-md)] border bg-surface px-4 text-left text-sm", error ? "border-danger" : "border-line")}
      >
        <span className={cn("grid size-7 place-items-center rounded-lg border-2 transition-colors", checked ? "border-ok bg-ok text-white" : "border-line-strong")}>
          {busy ? <span className="size-4 animate-spin rounded-full border-2 border-brand border-t-transparent" /> : checked ? <Check className="size-4" strokeWidth={3} /> : null}
        </span>
        <span className="flex-1">{checked ? "Verificado" : "Não sou um robot"}</span>
        <span className="text-[10px] text-fg-subtle">{t("forms.captcha")}</span>
      </button>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </div>
  );
}

// ------------------------------------------------------------- Anexos (10 MB, verificação de tipo)

const MAGIC: Record<string, number[]> = { "application/pdf": [0x25, 0x50, 0x44, 0x46], "image/png": [0x89, 0x50, 0x4e, 0x47], "image/jpeg": [0xff, 0xd8, 0xff] };
async function sniff(file: File): Promise<boolean> {
  const sig = MAGIC[file.type];
  if (!sig) return (ACCEPTED_MIME as readonly string[]).includes(file.type);
  const head = new Uint8Array(await file.slice(0, sig.length).arrayBuffer());
  return sig.every((b, i) => head[i] === b);
}

export function FileDrop({ value, onChange, max = MAX_FILES }: { value: Attachment[]; onChange: (v: Attachment[]) => void; max?: number }) {
  const [errors, setErrors] = React.useState<string[]>([]);
  const [drag, setDrag] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const add = async (files: FileList | null) => {
    if (!files) return;
    const errs: string[] = [];
    const next = [...value];
    for (const f of Array.from(files)) {
      if (next.length >= max) { errs.push(t("forms.fileTooMany")); break; }
      if (f.size > MAX_FILE_BYTES) { errs.push(t("forms.fileTooBig", { name: f.name })); continue; }
      if (!(ACCEPTED_MIME as readonly string[]).includes(f.type) || !(await sniff(f))) { errs.push(t("forms.fileType", { name: f.name })); continue; }
      // Modo completo: envia para /api/upload (armazenamento privado S3). Demonstração: só metadados.
      let key = `demo/${crypto.randomUUID()}`;
      if (!IS_DEMO) {
        const fd = new FormData();
        fd.append("file", f);
        const r = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/upload`, { method: "POST", body: fd });
        if (!r.ok) { errs.push((await r.json().catch(() => ({}))).error ?? t("states.error")); continue; }
        key = (await r.json()).key;
      }
      next.push({ id: crypto.randomUUID(), name: f.name, mime: f.type, size: f.size, key });
    }
    setErrors(errs);
    onChange(next);
  };
  return (
    <div className="grid gap-2">
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); add(e.dataTransfer.files); }}
        className={cn("grid place-items-center gap-2 rounded-[var(--radius-lg)] border-2 border-dashed px-6 py-8 text-center transition-colors", drag ? "border-brand bg-brand-soft" : "border-line-strong bg-surface")}
      >
        <Upload className="size-6 text-fg-subtle" aria-hidden />
        <p className="text-sm">Arraste os ficheiros para aqui ou{" "}
          <button type="button" onClick={() => inputRef.current?.click()} className="font-medium text-brand-ink underline underline-offset-4">escolha no computador</button>
        </p>
        <p className="text-xs text-fg-subtle">{t("forms.fileHint")}</p>
        <input ref={inputRef} type="file" multiple hidden accept={ACCEPTED_MIME.join(",")} onChange={(e) => add(e.target.files)} />
      </div>
      {errors.map((e) => <p key={e} role="alert" className="text-sm text-danger">{e}</p>)}
      {value.length > 0 && (
        <ul className="grid gap-2">
          {value.map((f) => (
            <motion.li key={f.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 rounded-[var(--radius-md)] border border-line bg-surface px-3 py-2 text-sm">
              <span className="grid size-8 place-items-center rounded bg-surface-2 font-mono text-[10px] uppercase">{f.name.split(".").pop()}</span>
              <span className="flex-1 truncate">{f.name}</span>
              <span className="text-xs text-fg-subtle">{(f.size / 1024 / 1024).toFixed(1)} MB</span>
              <button type="button" onClick={() => onChange(value.filter((x) => x.id !== f.id))} className="grid size-8 place-items-center rounded-full hover:bg-surface-2" aria-label={`Retirar ${f.name}`}>
                <X className="size-4" />
              </button>
            </motion.li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ------------------------------------------------------------- Faixa de chamada à acção

export function CtaBand({ title, lead, href, label, tone = "brand" }: { title: string; lead: string; href: string; label: string; tone?: "brand" | "lab" | "inc" }) {
  const bg = { brand: "from-brand to-ai", lab: "from-lab-ink to-brand", inc: "from-inc-ink to-ai" }[tone];
  return (
    <section className="container-x my-20">
      <Card className={cn("relative overflow-hidden border-0 bg-gradient-to-br p-8 text-white md:p-14", bg)}>
        <div className="pointer-events-none absolute -right-20 -top-20 size-80 rounded-full bg-white/10 blur-2xl" aria-hidden />
        <div className="relative grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
          <div className="grid gap-3">
            <h2 className="font-display text-[length:var(--text-3xl)] font-bold">{title}</h2>
            <p className="max-w-xl text-lg text-white/85">{lead}</p>
          </div>
          <Button asChild size="lg" variant="inverse" className="bg-white text-fg hover:bg-white/90">
            <AppLink href={href}>{label} <ArrowRight /></AppLink>
          </Button>
        </div>
      </Card>
    </section>
  );
}
