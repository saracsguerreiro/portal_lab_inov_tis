"use client";
// Formulário em passos curtos (F1, F2): barra de progresso animada, transição lateral entre
// passos, indicador «Guardado» do rascunho automático e resumo antes de submeter.
import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, CloudCheck } from "lucide-react";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Button, Card } from "@/components/ui";

export interface WizardStep {
  key: string;
  title: string;
  hint?: string;
}

export function Wizard({
  steps, current, onBack, onNext, nextLabel, children, savedAt, busy, nextDisabled,
}: {
  steps: WizardStep[];
  current: number;
  onBack: () => void;
  onNext: () => void;
  nextLabel?: string;
  children: React.ReactNode;
  savedAt?: number | null;
  busy?: boolean;
  nextDisabled?: boolean;
}) {
  const reduce = useReducedMotion();
  const dir = React.useRef(1);
  const prev = React.useRef(current);
  if (prev.current !== current) {
    dir.current = current > prev.current ? 1 : -1;
    prev.current = current;
  }
  const headingRef = React.useRef<HTMLHeadingElement>(null);
  React.useEffect(() => {
    headingRef.current?.focus({ preventScroll: false });
  }, [current]);
  const pct = ((current + 1) / steps.length) * 100;
  const last = current === steps.length - 1;
  return (
    <div className="grid gap-6">
      <div className="grid gap-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">{t("forms.step", { n: current + 1, total: steps.length })}</span>
          <SavedIndicator savedAt={savedAt} />
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-3" role="progressbar" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={current + 1} aria-label="Progresso do formulário">
          <motion.div className="h-full origin-left rounded-full bg-gradient-to-r from-lab via-brand to-inc" animate={{ scaleX: pct / 100 }} initial={false} transition={{ type: "spring", stiffness: 160, damping: 26 }} />
        </div>
        <ol className="hidden gap-2 sm:flex" aria-hidden>
          {steps.map((s, i) => (
            <li key={s.key} className={cn("flex flex-1 items-center gap-2 text-xs", i <= current ? "text-fg" : "text-fg-subtle")}>
              <span className={cn("grid size-5 place-items-center rounded-full text-[10px] font-bold transition-colors", i < current ? "bg-brand text-on-brand" : i === current ? "border-2 border-brand text-brand-ink" : "border border-line-strong")}>
                {i < current ? <Check className="size-3" strokeWidth={3} /> : i + 1}
              </span>
              <span className="truncate">{s.title}</span>
            </li>
          ))}
        </ol>
      </div>
      <Card className="overflow-hidden">
        <AnimatePresence mode="wait" initial={false} custom={dir.current}>
          <motion.div
            key={current}
            custom={dir.current}
            initial={{ opacity: 0, x: reduce ? 0 : dir.current * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: reduce ? 0 : dir.current * -40 }}
            transition={{ duration: reduce ? 0.12 : 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="grid gap-6 p-6 md:p-8"
          >
            <div className="grid gap-1">
              <h2 ref={headingRef} tabIndex={-1} className="font-display text-2xl font-bold outline-none">{steps[current].title}</h2>
              {steps[current].hint && <p className="text-fg-muted">{steps[current].hint}</p>}
            </div>
            {children}
          </motion.div>
        </AnimatePresence>
        <div className="flex items-center justify-between gap-3 border-t border-line bg-surface-2/50 px-6 py-4 md:px-8">
          <Button type="button" variant="ghost" onClick={onBack} disabled={current === 0}><ArrowLeft /> {t("actions.back")}</Button>
          <Button type="button" onClick={onNext} loading={busy} disabled={nextDisabled} size="lg">
            {last ? nextLabel ?? t("actions.submit") : <>{t("actions.next")} <ArrowRight /></>}
          </Button>
        </div>
      </Card>
    </div>
  );
}

function SavedIndicator({ savedAt }: { savedAt?: number | null }) {
  return (
    <AnimatePresence mode="wait">
      {savedAt ? (
        <motion.span key={savedAt} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-1.5 text-xs text-ok" role="status">
          <CloudCheck className="size-4" aria-hidden /> {t("states.draftSaved")}
        </motion.span>
      ) : <span />}
    </AnimatePresence>
  );
}

/** Resumo antes de submeter. */
export function ReviewList({ items, onEdit }: { items: { step: number; label: string; value: React.ReactNode }[]; onEdit: (step: number) => void }) {
  return (
    <dl className="grid gap-0 divide-y divide-line rounded-[var(--radius-md)] border border-line">
      {items.map((i) => (
        <div key={i.label} className="grid gap-1 p-4 sm:grid-cols-[200px_1fr_auto] sm:gap-4">
          <dt className="text-sm text-fg-subtle">{i.label}</dt>
          <dd className="whitespace-pre-line text-sm">{i.value || <span className="text-fg-subtle">—</span>}</dd>
          <button type="button" onClick={() => onEdit(i.step)} className="w-fit text-sm font-medium text-brand-ink hover:underline">{t("actions.edit")}</button>
        </div>
      ))}
    </dl>
  );
}

/** Celebração discreta ao submeter (canvas-confetti carregado só aqui). */
export async function celebrate() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const confetti = (await import("canvas-confetti")).default;
  const colors = ["#0891B2", "#0065ED", "#9333EA", "#4F46E5"] // rampas do DS TIS: cyan, brand, purple, indigo;
  confetti({ particleCount: 70, spread: 70, startVelocity: 38, origin: { y: 0.35 }, colors, disableForReducedMotion: true, scalar: 0.9 });
}

export function CharCount({ value, max }: { value: string | undefined; max: number }) {
  const n = value?.length ?? 0;
  return <span className={cn("text-xs tabular", n > max ? "text-danger" : n > max * 0.9 ? "text-warn" : "text-fg-subtle")} aria-live="polite">{t("forms.chars", { n, max })}</span>;
}
