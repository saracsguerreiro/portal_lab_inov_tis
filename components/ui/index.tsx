"use client";
// Componentes base ao estilo shadcn/ui, sobre Radix UI e os tokens do design system.
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cva, type VariantProps } from "class-variance-authority";
import { AlertTriangle, Check, Inbox, Loader2, RefreshCw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Tone } from "@/lib/domain/labels";
import { t } from "@/lib/i18n";

// ------------------------------------------------------------- Button

// Button do Design System TIS: Brand (um por secção), Toned, Outline, Ghost, Link, Danger.
// Alturas sm 32 · md 40 · lg 48; raio md (8 px); rótulo bold; transições só de cor (DS).
export const buttonVariants = cva(
  "relative inline-flex select-none items-center justify-center whitespace-nowrap rounded-[var(--radius-md)] border font-bold transition-[background-color,border-color,color,box-shadow] duration-[var(--dur-micro)] ease-[var(--ease-default)] disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "border-transparent bg-brand text-on-brand hover:bg-brand-hover active:bg-[var(--ds-brand-background-active)]",
        toned: "border-transparent bg-[var(--ds-toned-background-default)] text-[var(--ds-toned-content-default)] hover:bg-[var(--ds-toned-background-hover)] active:bg-[var(--ds-toned-background-active)]",
        secondary: "border-[var(--ds-outline-border-default)] bg-transparent text-[var(--ds-outline-content-default)] hover:border-[var(--ds-outline-border-hover)] hover:bg-[var(--ds-outline-background-hover)] active:bg-[var(--ds-outline-background-active)]",
        ghost: "border-transparent bg-transparent text-[var(--ds-ghost-content-default)] hover:bg-[var(--ds-ghost-background-hover)] active:bg-[var(--ds-ghost-background-active)]",
        // As variantes por área seguem a regra do DS: a acção principal é sempre Brand.
        lab: "border-transparent bg-brand text-on-brand hover:bg-brand-hover",
        inc: "border-transparent bg-brand text-on-brand hover:bg-brand-hover",
        ai: "border-transparent bg-brand text-on-brand hover:bg-brand-hover",
        danger: "border-transparent bg-danger-fill text-[var(--ds-feedback-error-content-contrast)] hover:bg-[var(--ds-feedback-error-background-hover)]",
        link: "h-auto border-transparent px-0 font-medium text-[var(--ds-link-content-default)] underline-offset-4 hover:text-[var(--ds-link-content-hover)] hover:underline",
        inverse: "border-transparent bg-[var(--ds-background-inverse)] text-[var(--ds-content-inverse)] hover:opacity-90",
      },
      size: {
        sm: "h-8 min-w-20 gap-0.5 px-2 text-sm [&_svg]:size-4",
        md: "h-10 min-w-[5.5rem] gap-1 px-3 text-sm [&_svg]:size-5",
        lg: "h-12 min-w-[6.375rem] gap-2 px-4 text-base [&_svg]:size-5",
        icon: "size-10 [&_svg]:size-5",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild, loading, children, disabled, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {asChild ? children : (
        <>
          {loading && <Loader2 className="animate-spin" aria-hidden />}
          {children}
        </>
      )}
    </Comp>
  );
});
Button.displayName = "Button";

// ------------------------------------------------------------- Tag / etiqueta

const toneClass: Record<Tone, string> = {
  neutral: "bg-surface-2 text-fg-muted border-line",
  info: "bg-info-soft text-info border-transparent",
  warn: "bg-warn-soft text-warn border-transparent",
  ok: "bg-ok-soft text-ok border-transparent",
  danger: "bg-danger-soft text-danger border-transparent",
  lab: "bg-lab-soft text-lab-ink border-transparent",
  inc: "bg-inc-soft text-inc-ink border-transparent",
  ai: "bg-ai-soft text-ai-ink border-transparent",
  brand: "bg-brand-soft text-brand-ink border-transparent",
};
export function Tag({ tone = "neutral", children, className, dot, ...rest }: { tone?: Tone; dot?: boolean } & React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-bold leading-[1.125rem]", toneClass[tone], className)} {...rest}>
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}

// ------------------------------------------------------------- Card

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-[var(--radius-lg)] border border-line-strong bg-surface shadow-1", className)} {...props} />;
}

// ------------------------------------------------------------- Campos

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "h-10 w-full rounded-[var(--radius-md)] border border-control bg-surface px-3 text-sm text-fg placeholder:text-fg-subtle transition-[border-color,box-shadow] duration-[var(--dur-micro)] hover:border-brand focus-visible:border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] disabled:border-[var(--ds-border-control-disabled)] disabled:bg-[var(--ds-background-disabled)] aria-[invalid=true]:border-danger-fill",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "min-h-24 w-full rounded-[var(--radius-md)] border border-control bg-surface px-3 py-2.5 text-sm text-fg placeholder:text-fg-subtle transition-[border-color,box-shadow] duration-[var(--dur-micro)] hover:border-brand focus-visible:border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] aria-[invalid=true]:border-danger-fill",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "h-10 w-full appearance-none rounded-[var(--radius-md)] border border-control bg-surface bg-[length:16px] bg-[right_12px_center] bg-no-repeat px-3 pr-10 text-sm text-fg hover:border-brand focus-visible:border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] aria-[invalid=true]:border-danger-fill",
      "bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%2364748B%22 stroke-width=%222%22><path d=%22m6 9 6 6 6-6%22/></svg>')]",
      className,
    )}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = "Select";

/** Campo com etiqueta, ajuda e erro junto do campo (WCAG: etiquetas em todos os campos). */
export function Field({
  id, label, hint, error, required, children, className, optionalLabel = true,
}: { id: string; label: React.ReactNode; hint?: React.ReactNode; error?: string; required?: boolean; children: React.ReactElement<Record<string, unknown>>; className?: string; optionalLabel?: boolean }) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-error` : undefined;
  const child = React.cloneElement(children, {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": [hintId, errId].filter(Boolean).join(" ") || undefined,
    "aria-required": required || undefined,
  });
  return (
    <div className={cn("grid gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium text-fg">
        {label}
        {required ? <span className="text-danger" aria-hidden> *</span> : optionalLabel ? <span className="ml-1 font-normal text-fg-subtle">({t("forms.optional")})</span> : null}
      </label>
      {hint && <p id={hintId} className="-mt-0.5 text-sm text-fg-subtle">{hint}</p>}
      {child}
      {error && (
        <p id={errId} role="alert" className="flex items-center gap-1.5 text-sm text-danger animate-[fadeIn_var(--dur-base)_var(--ease-out)]">
          <AlertTriangle className="size-3.5" aria-hidden /> {error}
        </p>
      )}
    </div>
  );
}

export function Checkbox({ id, checked, onCheckedChange, label, description, invalid }: { id: string; checked: boolean; onCheckedChange: (v: boolean) => void; label: React.ReactNode; description?: React.ReactNode; invalid?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <CheckboxPrimitive.Root
        id={id}
        checked={checked}
        onCheckedChange={(v) => onCheckedChange(v === true)}
        aria-invalid={invalid || undefined}
        className="peer mt-0.5 grid size-5 shrink-0 place-items-center rounded-[var(--radius-sm)] border border-control bg-surface transition-[background-color,border-color] duration-[var(--dur-micro)] hover:border-brand data-[state=checked]:border-brand data-[state=checked]:bg-brand aria-[invalid=true]:border-danger-fill"
      >
        <CheckboxPrimitive.Indicator className="text-on-brand data-[state=checked]:animate-[pop_var(--dur-base)_var(--ease-out)]">
          <Check className="size-3.5" strokeWidth={3} />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      <label htmlFor={id} className="cursor-pointer text-sm leading-6 text-fg">
        {label}
        {description && <span className="block text-fg-subtle">{description}</span>}
      </label>
    </div>
  );
}

export function Switch({ id, checked, onCheckedChange, label, description }: { id: string; checked: boolean; onCheckedChange: (v: boolean) => void; label: React.ReactNode; description?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <label htmlFor={id} className="text-sm leading-6 text-fg">
        <span className="font-medium">{label}</span>
        {description && <span className="block text-fg-subtle">{description}</span>}
      </label>
      <SwitchPrimitive.Root
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="relative h-6 w-11 shrink-0 rounded-full bg-[var(--ds-color-neutral-400)] transition-colors duration-[var(--dur-base)] data-[state=checked]:bg-brand"
      >
        <SwitchPrimitive.Thumb className="block size-5 translate-x-0.5 rounded-full bg-white shadow-1 transition-transform duration-[var(--dur-base)] ease-[var(--ease-default)] data-[state=checked]:translate-x-[22px]" />
      </SwitchPrimitive.Root>
    </div>
  );
}

/** Grupo de escolha (simples ou múltipla) em «chips» grandes, fáceis de tocar (44 px). */
export function ChoiceGroup<T extends string>({
  name, options, value, onChange, multiple, invalid, columns = 2, labelledBy,
}: { name: string; options: { value: T; label: string; hint?: string; icon?: React.ReactNode }[]; value: T | T[] | undefined; onChange: (v: T | T[]) => void; multiple?: boolean; invalid?: boolean; columns?: 1 | 2 | 3 | 4; labelledBy?: string }) {
  const selected = new Set(Array.isArray(value) ? value : value ? [value] : []);
  const toggle = (v: T) => {
    if (!multiple) return onChange(v);
    const next = new Set(selected);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    onChange([...next] as T[]);
  };
  return (
    <div role={multiple ? "group" : "radiogroup"} aria-labelledby={labelledBy} aria-invalid={invalid || undefined} className={cn("grid gap-2", { 1: "grid-cols-1", 2: "sm:grid-cols-2", 3: "sm:grid-cols-3", 4: "sm:grid-cols-2 lg:grid-cols-4" }[columns])}>
      {options.map((o) => {
        const on = selected.has(o.value);
        return (
          <button
            key={o.value}
            type="button"
            role={multiple ? "checkbox" : "radio"}
            aria-checked={on}
            name={name}
            onClick={() => toggle(o.value)}
            className={cn(
              "flex min-h-11 items-start gap-3 rounded-[var(--radius-md)] border px-3 py-2.5 text-left text-sm transition-[border-color,background-color] duration-[var(--dur-micro)] ease-[var(--ease-default)]",
              on ? "border-brand bg-brand-soft text-fg" : "border-control bg-surface hover:border-brand",
              invalid && !on && "border-danger/60",
            )}
          >
            <span className={cn("mt-0.5 grid size-4 shrink-0 place-items-center border transition-colors", multiple ? "rounded-[4px]" : "rounded-full", on ? "border-brand bg-brand text-on-brand" : "border-control")} aria-hidden>
              {on && (multiple ? <Check className="size-3" strokeWidth={3} /> : <span className="size-1.5 rounded-full bg-white" />)}
            </span>
            <span>
              <span className="flex items-center gap-2 font-medium">{o.icon}{o.label}</span>
              {o.hint && <span className="block text-fg-subtle">{o.hint}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ------------------------------------------------------------- Tabs, Dialog, Tooltip

export const Tabs = TabsPrimitive.Root;
export function TabsList({ className, ...p }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return <TabsPrimitive.List className={cn("inline-flex max-w-full gap-0 overflow-x-auto border-b border-line [scrollbar-width:none]", className)} {...p} />;
}
export function TabsTrigger({ className, ...p }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn("relative -mb-px inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 border-transparent px-4 pb-3 pt-3 text-sm font-bold text-fg-muted transition-colors duration-[var(--dur-micro)] hover:text-fg data-[state=active]:border-brand data-[state=active]:text-fg [&_svg]:size-4", className)}
      {...p}
    />
  );
}
export const TabsContent = TabsPrimitive.Content;

export function Dialog({ open, onOpenChange, title, description, children, wide }: { open: boolean; onOpenChange: (o: boolean) => void; title: React.ReactNode; description?: React.ReactNode; children: React.ReactNode; wide?: boolean }) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[var(--ds-background-overlay)] data-[state=open]:animate-[fadeIn_var(--dur-base)_var(--ease-out)]" />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 max-h-[90dvh] w-[calc(100%-32px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[var(--radius-lg)] border border-line bg-surface p-6 shadow-3 data-[state=open]:animate-[dialogIn_var(--dur-enter)_var(--ease-out)]",
            wide ? "max-w-3xl" : "max-w-lg",
          )}
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <DialogPrimitive.Title className="text-xl font-semibold">{title}</DialogPrimitive.Title>
              {description && <DialogPrimitive.Description className="mt-1 text-sm text-fg-muted">{description}</DialogPrimitive.Description>}
            </div>
            <DialogPrimitive.Close className="grid size-10 place-items-center rounded-full text-fg-muted hover:bg-surface-2 hover:text-fg" aria-label={t("actions.close")}>
              <X className="size-5" />
            </DialogPrimitive.Close>
          </div>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function Tip({ label, children }: { label: React.ReactNode; children: React.ReactElement }) {
  return (
    <TooltipPrimitive.Provider delayDuration={200}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content sideOffset={6} className="z-50 max-w-xs rounded-[var(--radius-sm)] bg-[var(--ds-background-inverse)] px-2 py-1 text-xs text-[var(--ds-content-inverse)] shadow-2 data-[state=delayed-open]:animate-[fadeIn_var(--dur-micro)_var(--ease-out)]">
            {label}
            <TooltipPrimitive.Arrow className="fill-fg" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}

/** Sigla com dica do glossário (heurística: linguagem do utilizador). */
export function Abbr({ term, children }: { term: string; children?: React.ReactNode }) {
  const def = GLOSSARY[term];
  if (!def) return <>{children ?? term}</>;
  return (
    <Tip label={def}>
      <abbr title={def} className="cursor-help underline decoration-dotted underline-offset-4" tabIndex={0}>
        {children ?? term}
      </abbr>
    </Tip>
  );
}
export const GLOSSARY: Record<string, string> = {
  MVK: "Minimum Viable Knowledge: o mínimo que precisamos de saber sobre o problema.",
  MVS: "Minimum Viable Strategy: a hipótese priorizada e como a vamos testar.",
  MVP: "Minimum Viable Product: a versão mais simples que permite aprender com utilizadores reais.",
  MVB: "Minimum Viable Business: o pacote para o negócio adoptar o resultado.",
  PoC: "Prova de conceito: mostra que a ideia é tecnicamente possível.",
  GUT: "Gravidade × Urgência × Tendência: matriz para priorizar problemas.",
  Gate: "Ponto de decisão entre etapas: continuar, mudar ou encerrar, com evidência.",
  "Spin-in": "A venture é incorporada numa direcção ou produto da TIS.",
  "Spin-off": "A venture torna-se uma empresa autónoma, com participação da TIS.",
  Champion: "Pessoa de uma área que defende e ajuda a adoptar a inovação.",
};

// ------------------------------------------------------------- Estados: vazio, carregamento, erro, sucesso

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} aria-hidden />;
}
export function ListSkeleton({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("grid gap-3", className)} role="status" aria-live="polite">
      <span className="sr-only">{t("states.loading")}</span>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-[var(--radius-lg)] border border-line bg-surface p-4">
          <Skeleton className="size-12 rounded-[var(--radius-md)]" />
          <div className="grid flex-1 gap-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" role="status">
      <span className="sr-only">{t("states.loading")}</span>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface">
          <Skeleton className="h-40 rounded-none" />
          <div className="grid gap-2 p-5"><Skeleton className="h-5 w-3/4" /><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-2/3" /></div>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ title, hint, action, icon }: { title: string; hint?: string; action?: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="grid place-items-center gap-3 rounded-[var(--radius-lg)] border border-dashed border-line-strong bg-surface/60 px-6 py-14 text-center">
      <div className="grid size-14 place-items-center rounded-full bg-surface-2 text-fg-subtle">{icon ?? <Inbox className="size-6" />}</div>
      <p className="text-lg font-semibold">{title}</p>
      {hint && <p className="max-w-md text-sm text-fg-muted">{hint}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="grid place-items-center gap-3 rounded-[var(--radius-lg)] border border-danger/30 bg-danger-soft px-6 py-10 text-center">
      <AlertTriangle className="size-7 text-danger" aria-hidden />
      <p className="font-medium text-fg">{message ?? t("states.error")}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          <RefreshCw /> {t("actions.retry")}
        </Button>
      )}
    </div>
  );
}

export function Progress({ value, className, tone = "brand", label }: { value: number; className?: string; tone?: "brand" | "lab" | "inc" | "ai"; label?: string }) {
  const color = { brand: "bg-brand", lab: "bg-lab", inc: "bg-inc", ai: "bg-ai" }[tone];
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-surface-3", className)} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value)} aria-label={label}>
      <div className={cn("h-full origin-left rounded-full transition-transform duration-[var(--dur-enter)] ease-[var(--ease-out)]", color)} style={{ transform: `scaleX(${Math.max(0, Math.min(100, value)) / 100})` }} />
    </div>
  );
}

export function SectionHeading({ eyebrow, title, lead, align = "left", id }: { eyebrow?: React.ReactNode; title: React.ReactNode; lead?: React.ReactNode; align?: "left" | "center"; id?: string }) {
  return (
    <div className={cn("grid gap-3", align === "center" && "mx-auto max-w-2xl text-center")}>
      {eyebrow && <p className="text-xs font-bold uppercase tracking-[var(--ds-letter-spacing-wider)] text-brand-ink">{eyebrow}</p>}
      <h2 id={id} className="text-balance text-[length:var(--text-3xl)] font-bold">{title}</h2>
      {lead && <p className="text-balance text-lg text-fg-muted">{lead}</p>}
    </div>
  );
}
