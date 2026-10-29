"use client";
// P30 Painel de performance (blocos 1 a 7). Recharts carregado só nesta página.
import * as React from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { AlertTriangle, CalendarClock, Download, Filter, PauseCircle, ShieldAlert, Table2 } from "lucide-react";
import type { ResultOf } from "@/lib/services";
import { t, fmtDate, fmtNumber } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { L } from "@/lib/domain/labels";
import { useQuery } from "@/lib/client/hooks";
import { Button, Card, ErrorState, Field, Input, Select, Skeleton, Tag } from "@/components/ui";
import { Counter } from "@/components/motion";
import { PageHeader, RequirePage } from "@/components/domain";
import { AppLink } from "@/components/layout/app-link";

type Dash = ResultOf<"getDashboard">;
const C = { brand: "var(--chart-1)", lab: "var(--chart-2)", inc: "var(--chart-3)", ai: "var(--chart-4)", grid: "var(--line)", muted: "var(--fg-subtle)" };
const pct = (n: number | null | undefined) => (n == null ? "—" : `${Math.round(n * 100)} %`);

const PERIODS: Record<string, [string, string]> = {
  "2026": ["2026-01-01", "2026-12-31"],
  "2026-T1": ["2026-01-01", "2026-03-31"],
  "2026-T2": ["2026-04-01", "2026-06-30"],
  "2026-T3": ["2026-07-01", "2026-09-30"],
  "2026-T4": ["2026-10-01", "2026-12-31"],
};

export function DashboardView() {
  return <RequirePage page="P30" title="o painel"><Dashboard /></RequirePage>;
}

/** Frases de leitura por cima de cada gráfico, com a conclusão principal. */
function readings(d: Dash) {
  const ty = d.kpis.ideasByType;
  const top = Object.entries(ty).sort((a, b) => b[1] - a[1])[0];
  const bottleneck = d.funnel.slice(1).filter((f) => f.rate != null).sort((a, b) => (a.rate ?? 100) - (b.rate ?? 100))[0];
  const okBehind = d.okrs.filter((o) => { const q = o.actual.findLastIndex((x) => x > 0); return q >= 0 && o.actual[q] < o.planned[q]; });
  const topArea = d.participation.byTisArea[0];
  return {
    kpis: `${d.kpis.ideasTotal} ideias no período; a maioria é ${top ? L.ideaType(top[0] as never).toLowerCase() : "—"}. O primeiro retorno demora ${fmtNumber(d.kpis.avgFirstResponseDays)} dias úteis em média, face ao prazo de ${d.kpis.deadlineDays}.`,
    funnel: bottleneck ? `A maior quebra está na passagem para «${bottleneck.label}» (${bottleneck.rate} %). ${d.labTransfers} projecto(s) passaram do Lab para a Incubadora.` : "Ainda não há dados suficientes para ler o funil.",
    okrs: okBehind.length ? `${okBehind.length} de ${d.okrs.length} objectivos estão abaixo do planeado no último trimestre com dados: ${okBehind.map((o) => o.key).join(", ")}.` : "Todos os objectivos estão em linha com o planeado.",
    ai: d.ai.agreementRate == null ? "Ainda não há decisões suficientes para comparar com a IA." : `A IA e a equipa concordam em ${pct(d.ai.agreementRate)} das decisões (amostra de ${d.ai.sample}). ${d.ai.avgDiff != null ? `Em média, os gestores pontuam ${d.ai.avgDiff >= 0 ? "+" : ""}${d.ai.avgDiff} pontos face à IA.` : ""}`,
    participation: topArea ? `${topArea.name} é a área com mais ideias (${topArea.value}). ${d.participation.collaborators} colaboradores identificados participaram, mais ${d.participation.anonymousCollaboratorIdeas} ideia(s) anónima(s).` : "Sem participação no período.",
    incubator: d.incubator ? `${d.incubator.byStage.reduce((n, x) => n + x.value, 0)} ventures activas; ${d.incubator.exits.reduce((n, x) => n + x.value, 0)} saídas registadas.` : "",
  };
}

function Dashboard() {
  const [period, setPeriod] = React.useState("2026");
  const [custom, setCustom] = React.useState<[string, string]>(["2026-01-01", "2026-12-31"]);
  const [area, setArea] = React.useState<"AMBAS" | "LAB" | "INCUBADORA">("AMBAS");
  const [line, setLine] = React.useState<"TODAS" | "L1" | "L2" | "L3" | "L4">("TODAS");
  const [from, to] = period === "custom" ? custom : PERIODS[period];
  const filters = { from: `${from}T00:00:00.000Z`, to: `${to}T23:59:59.999Z`, area, workLine: line };
  const { data: d, loading, error, reload } = useQuery("getDashboard", filters);
  const [exporting, setExporting] = React.useState(false);
  const r = d ? readings(d) : null;
  const key = JSON.stringify(filters);

  return (
    <>
      <PageHeader tone="ai" crumbs={[{ label: t("nav.dashboard") }]} eyebrow="P30 · Gestores e Comissão Executiva" title="Painel de performance" lead="Cada gráfico tem por cima uma frase com a conclusão principal."
        actions={<Button variant="ai" loading={exporting} disabled={!d} onClick={async () => { if (!d || !r) return; setExporting(true); try { await (await import("@/lib/client/pdf")).downloadDashboard(d, r); toast.success("PDF exportado."); } finally { setExporting(false); } }}><Download /> {t("actions.exportPdf")}</Button>} />
      <div className="sticky top-[108px] z-20 border-b border-line bg-bg/90 backdrop-blur-xl md:top-[116px]">
        <div className="container-x flex flex-wrap items-end gap-3 py-3">
          <Filter className="mb-3 size-4 text-fg-subtle" aria-hidden />
          <Field id="f-period" label="Período" optionalLabel={false} className="w-40"><Select value={period} onChange={(e) => setPeriod(e.target.value)} className="h-10"><option value="2026">Ano 2026</option>{["T1", "T2", "T3", "T4"].map((q) => <option key={q} value={`2026-${q}`}>{q} 2026</option>)}<option value="custom">Personalizado</option></Select></Field>
          {period === "custom" && <>
            <Field id="f-from" label="De" optionalLabel={false}><Input type="date" value={custom[0]} onChange={(e) => setCustom([e.target.value, custom[1]])} className="h-10" /></Field>
            <Field id="f-to" label="Até" optionalLabel={false}><Input type="date" value={custom[1]} onChange={(e) => setCustom([custom[0], e.target.value])} className="h-10" /></Field>
          </>}
          <Field id="f-area" label="Área" optionalLabel={false} className="w-44"><Select value={area} onChange={(e) => setArea(e.target.value as typeof area)} className="h-10"><option value="AMBAS">Ambas</option><option value="LAB">Laboratório</option><option value="INCUBADORA">Incubadora</option></Select></Field>
          <Field id="f-line" label="Linha de trabalho" optionalLabel={false} className="w-52"><Select value={line} onChange={(e) => setLine(e.target.value as typeof line)} className="h-10"><option value="TODAS">Todas</option>{["L1", "L2", "L3", "L4"].map((l) => <option key={l} value={l}>{L.line(l)}</option>)}</Select></Field>
        </div>
      </div>
      <div className="container-x py-8">
        {error ? <ErrorState message={error.message} onRetry={reload} /> : !d || !r ? <DashSkeleton /> : (
          <AnimatePresence mode="wait">
            <motion.div key={key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: loading ? 0.6 : 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="grid gap-6 lg:grid-cols-6" aria-busy={loading}>
              <Kpis d={d} reading={r.kpis} />
              <Block title="2 · Funil" reading={r.funnel} className="lg:col-span-4" table={{ head: ["Etapa", "N.º", "Passagem"], rows: d.funnel.map((f) => [f.label, f.value, f.rate == null ? "—" : `${f.rate} %`]) }}>
                <FunnelChart d={d} />
              </Block>
              <Block title="4 · Análise da IA" reading={r.ai} className="lg:col-span-2" table={{ head: ["Pontuação", "Ideias"], rows: d.ai.buckets.map((b) => [b.range, b.count]) }}>
                <AiChart d={d} />
              </Block>
              <Block title="3 · Objectivos 2027 (Lab) · planeado face ao real" reading={r.okrs} className="lg:col-span-6" table={{ head: ["Objectivo", "T1", "T2", "T3", "T4"], rows: d.okrs.map((o) => [`${o.key} ${o.title}`, ...o.planned.map((p, i) => `${o.actual[i]} / ${p}`)]) }}>
                <OkrSmallMultiples d={d} />
              </Block>
              <Block title="5 · Participação" reading={r.participation} className="lg:col-span-3" table={{ head: ["Área da TIS", "Ideias"], rows: d.participation.byTisArea.map((a) => [a.name, a.value]) }}>
                <ParticipationChart d={d} />
              </Block>
              <Block title="6 · Decisões e alertas" reading={`${d.pendingDecisions.filter((p) => !p.done).length} decisões pendentes da Administração; ${d.alerts.length} alertas automáticos.`} className="lg:col-span-3">
                <DecisionsAlerts d={d} />
              </Block>
              {d.incubator && (
                <Block title="7 · Incubadora (gestores e Comissão Executiva)" reading={r.incubator} className="lg:col-span-6" table={{ head: ["Etapa", "Ventures"], rows: d.incubator.byStage.map((s) => [L.stage(s.stage), s.value]) }}>
                  <IncubatorBlock d={d} />
                </Block>
              )}
              <p className="text-xs text-fg-subtle lg:col-span-6">Gerado a {fmtDate(d.generatedAt, { dateStyle: "long", timeStyle: "short" } as Intl.DateTimeFormatOptions)}. Números agregados: nenhum dado por pessoa nem identidade de autores anónimos.</p>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </>
  );
}

function DashSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-6" role="status"><span className="sr-only">{t("states.loading")}</span>
      {[6, 4, 2, 6, 3, 3].map((s, i) => <Skeleton key={i} className={cn("h-72 rounded-[var(--radius-lg)]", { 6: "lg:col-span-6", 4: "lg:col-span-4", 3: "lg:col-span-3", 2: "lg:col-span-2" }[s])} />)}
    </div>
  );
}

/** Cartão de bloco: título, frase de leitura e vista em tabela (alternativa acessível). */
function Block({ title, reading, children, className, table }: { title: string; reading: string; children: React.ReactNode; className?: string; table?: { head: string[]; rows: (string | number)[][] } }) {
  const [showTable, setShowTable] = React.useState(false);
  return (
    <Card className={cn("grid content-start gap-4 p-5 md:p-6", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="grid gap-1">
          <h2 className="text-xs font-bold uppercase tracking-[var(--ds-letter-spacing-wider)] text-fg-subtle">{title}</h2>
          <p className="text-balance font-display text-base font-bold leading-snug md:text-lg">{reading}</p>
        </div>
        {table && <Button size="sm" variant="ghost" onClick={() => setShowTable((x) => !x)} aria-pressed={showTable}><Table2 /> {showTable ? "Gráfico" : "Tabela"}</Button>}
      </div>
      {showTable && table ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr>{table.head.map((h) => <th key={h} className="border-b border-line p-2 text-left font-medium text-fg-subtle">{h}</th>)}</tr></thead>
            <tbody>{table.rows.map((row, i) => <tr key={i} className="border-b border-line">{row.map((c, j) => <td key={j} className={cn("p-2", j > 0 && "tabular")}>{c}</td>)}</tr>)}</tbody>
          </table>
        </div>
      ) : children}
    </Card>
  );
}

/** Monta o gráfico só quando entra no ecrã, para ele «se desenhar» à frente de quem lê. */
function InView({ children, height }: { children: (animate: boolean) => React.ReactNode; height: number }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10%" });
  const reduce = useReducedMotion();
  return <div ref={ref} style={{ height }}>{inView ? children(!reduce) : null}</div>;
}

function ChartTooltip({ active, payload, label, unit = "" }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string; unit?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[var(--radius-md)] border border-line bg-surface px-3 py-2 text-sm shadow-2">
      <p className="mb-1 font-medium">{label}</p>
      {payload.map((p) => <p key={p.name} className="flex items-center gap-2 text-fg-muted"><span className="size-2.5 rounded-sm" style={{ background: p.color }} />{p.name}: <span className="font-mono text-fg">{p.value}{unit}</span></p>)}
    </div>
  );
}

const axis = { stroke: C.grid, tick: { fill: "var(--fg-subtle)", fontSize: 12 }, tickLine: false };

// ------------------------------------------------------------- Bloco 1

function Kpis({ d, reading }: { d: Dash; reading: string }) {
  const tiles: { label: string; value: number; fmt?: (n: number) => string; sub?: string; tone: string }[] = [
    { label: "Ideias recebidas", value: d.kpis.ideasTotal, sub: `${d.kpis.ideasByType.EXTERNA} externas · ${d.kpis.ideasByType.MELHORIA} melhoria · ${d.kpis.ideasByType.NEGOCIO_COLABORADOR} negócio`, tone: "text-brand-ink" },
    { label: "Taxa de selecção", value: Math.round(d.kpis.selectionRate * 100), fmt: (n) => `${n} %`, sub: "Seleccionadas ÷ ideias com decisão", tone: "text-ok" },
    { label: "Tempo até ao 1.º retorno", value: d.kpis.avgFirstResponseDays, fmt: (n) => `${fmtNumber(n)} d`, sub: `Prazo: ${d.kpis.deadlineDays} dias úteis`, tone: d.kpis.avgFirstResponseDays > d.kpis.deadlineDays ? "text-danger" : "text-ok" },
    { label: "Projectos activos no Lab", value: d.kpis.activeLab, tone: "text-lab-ink" },
    { label: "Ventures activas", value: d.kpis.activeVentures, tone: "text-inc-ink" },
    { label: "Resultados em uso no negócio", value: d.kpis.inUse, tone: "text-ai-ink" },
  ];
  return (
    <section className="grid gap-3 lg:col-span-6" aria-labelledby="kpi-h">
      <div className="grid gap-1"><h2 id="kpi-h" className="text-xs font-bold uppercase tracking-[var(--ds-letter-spacing-wider)] text-fg-subtle">1 · Números-chave</h2><p className="font-display text-lg font-bold">{reading}</p></div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {tiles.map((k) => (
          <Card key={k.label} className="grid gap-1 p-5">
            <span className="text-sm text-fg-muted">{k.label}</span>
            <Counter value={k.value} format={k.fmt} className={cn("text-4xl font-semibold tracking-tight", k.tone)} />
            {k.sub && <span className="text-xs text-fg-subtle">{k.sub}</span>}
          </Card>
        ))}
      </div>
    </section>
  );
}

// ------------------------------------------------------------- Bloco 2

function FunnelChart({ d }: { d: Dash }) {
  const data = d.funnel.map((f) => ({ ...f, label2: `${f.value}${f.rate != null ? ` · ${f.rate} %` : ""}` }));
  return (
    <InView height={300}>
      {(animate) => (
        <ResponsiveContainer>
          <BarChart data={data} layout="vertical" margin={{ left: 10, right: 70 }} barCategoryGap={6}>
            <CartesianGrid horizontal={false} stroke={C.grid} strokeDasharray="2 4" />
            <XAxis type="number" {...axis} allowDecimals={false} />
            <YAxis type="category" dataKey="label" {...axis} width={150} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--surface-2)" }} />
            <Bar dataKey="value" name="Ideias e projectos" radius={[0, 4, 4, 0]} isAnimationActive={animate} animationDuration={900}>
              {data.map((f, i) => <Cell key={f.key} fill={i < 4 ? C.brand : i === 4 ? C.lab : C.inc} />)}
              <LabelList dataKey="label2" position="right" className="fill-[var(--fg-muted)] text-xs" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </InView>
  );
}

// ------------------------------------------------------------- Bloco 3

function OkrSmallMultiples({ d }: { d: Dash }) {
  return (
    <div className="grid gap-4">
      <div className="flex gap-4 text-sm" aria-hidden><span className="flex items-center gap-2"><span className="h-0.5 w-5 border-t-2 border-dashed border-[var(--chart-1)]" />Planeado</span><span className="flex items-center gap-2"><span className="h-0.5 w-5 bg-[var(--chart-2)]" />Real</span></div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {d.okrs.map((o) => {
          const data = ["T1", "T2", "T3", "T4"].map((q, i) => ({ q, Planeado: o.planned[i], Real: o.actual[i] || null }));
          return (
            <div key={o.key} className="grid gap-1 rounded-[var(--radius-md)] border border-line p-3">
              <p className="text-sm"><span className="font-mono font-bold">{o.key}</span> {o.title} <span className="text-fg-subtle">({o.unit})</span></p>
              <InView height={130}>
                {(animate) => (
                  <ResponsiveContainer>
                    <LineChart data={data} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke={C.grid} strokeDasharray="2 4" />
                      <XAxis dataKey="q" {...axis} />
                      <YAxis {...axis} allowDecimals={false} />
                      <Tooltip content={<ChartTooltip unit={` ${o.unit}`} />} />
                      <Line type="monotone" dataKey="Planeado" stroke={C.brand} strokeWidth={2} strokeDasharray="5 4" dot={false} isAnimationActive={animate} />
                      <Line type="monotone" dataKey="Real" stroke={C.lab} strokeWidth={2} dot={{ r: 4, strokeWidth: 2, stroke: "var(--surface)" }} connectNulls={false} isAnimationActive={animate} animationDuration={1100} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </InView>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ------------------------------------------------------------- Bloco 4

function AiChart({ d }: { d: Dash }) {
  return (
    <div className="grid gap-4">
      <InView height={180}>
        {(animate) => (
          <ResponsiveContainer>
            <BarChart data={d.ai.buckets} margin={{ top: 16, right: 4, left: -24 }}>
              <CartesianGrid vertical={false} stroke={C.grid} strokeDasharray="2 4" />
              <XAxis dataKey="range" {...axis} />
              <YAxis {...axis} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--surface-2)" }} />
              <Bar dataKey="count" name="Ideias" fill={C.ai} radius={[4, 4, 0, 0]} isAnimationActive={animate} animationDuration={900} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </InView>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-[var(--radius-md)] bg-ai-soft p-3"><p className="text-ai-ink">Concordância</p><p className="font-display text-2xl font-bold">{pct(d.ai.agreementRate)}</p></div>
        <div className="rounded-[var(--radius-md)] bg-surface-2 p-3"><p className="text-fg-muted">Análise pendente</p><p className="font-display text-2xl font-bold">{d.ai.pending}</p></div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------- Bloco 5

function ParticipationChart({ d }: { d: Dash }) {
  const p = d.participation;
  return (
    <div className="grid gap-5">
      {p.byTisArea.length > 0 && (
        <InView height={Math.max(120, p.byTisArea.length * 34)}>
          {(animate) => (
            <ResponsiveContainer>
              <BarChart data={p.byTisArea} layout="vertical" margin={{ left: 0, right: 30 }} barCategoryGap={6}>
                <XAxis type="number" hide allowDecimals={false} />
                <YAxis type="category" dataKey="name" {...axis} width={150} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--surface-2)" }} />
                <Bar dataKey="value" name="Ideias de melhoria" fill={C.lab} radius={[0, 4, 4, 0]} isAnimationActive={animate}><LabelList dataKey="value" position="right" className="fill-[var(--fg-muted)] text-xs" /></Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </InView>
      )}
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-[var(--radius-md)] bg-surface-2 p-3"><dt className="text-fg-muted">Colaboradores que participaram</dt><dd className="font-display text-2xl font-bold">{p.collaborators}</dd></div>
        <div className="rounded-[var(--radius-md)] bg-surface-2 p-3"><dt className="text-fg-muted">Externos por tipo</dt><dd className="mt-1 flex flex-wrap gap-1">{p.externalsByType.map((x) => <Tag key={x.type}>{L.extType(x.type)} · {x.value}</Tag>)}</dd></div>
      </dl>
      <div className="grid gap-2">
        <p className="text-sm font-medium">Desafios e participações</p>
        {p.challenges.map((c) => (
          <div key={c.id} className="grid grid-cols-[1fr_auto] items-center gap-3 text-sm">
            <span className="truncate">{c.title} <span className="text-fg-subtle">· {L.challengeStatus(c.status)}</span></span>
            <span className="font-mono tabular">{c.participations}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ------------------------------------------------------------- Bloco 6

function DecisionsAlerts({ d }: { d: Dash }) {
  const pending = d.pendingDecisions.filter((p) => !p.done).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const icon = { PRAZO: CalendarClock, PARADO: PauseCircle, CONTINUIDADE: ShieldAlert } as const;
  return (
    <div className="grid gap-5">
      <div className="grid gap-2">
        <p className="text-sm font-medium">Decisões pendentes da Administração</p>
        <ul className="grid max-h-56 gap-1 overflow-y-auto text-sm">
          {pending.map((p) => {
            const days = Math.round((new Date(p.dueDate).getTime() - Date.now()) / 86400000);
            return <li key={p.key} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-surface-2"><span className="w-10 font-mono text-xs">{p.key}</span><span className="flex-1 truncate">{p.title}</span><Tag tone={days < 0 ? "danger" : days < 14 ? "warn" : "neutral"}>{fmtDate(p.dueDate, { day: "numeric", month: "short" })}</Tag></li>;
          })}
        </ul>
      </div>
      <div className="grid gap-2">
        <p className="flex items-center gap-2 text-sm font-medium"><AlertTriangle className="size-4 text-warn" /> Alertas automáticos</p>
        {d.alerts.length === 0 ? <p className="text-sm text-fg-muted">Sem alertas.</p> : (
          <ul className="grid max-h-56 gap-1 overflow-y-auto">
            {d.alerts.map((a, i) => { const I = icon[a.kind]; return (
              <motion.li key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                <AppLink href={a.href} className="flex items-start gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-surface-2"><I className={cn("mt-0.5 size-4 shrink-0", a.kind === "PRAZO" ? "text-danger" : "text-warn")} aria-label={a.kind === "PRAZO" ? "Prazo" : a.kind === "PARADO" ? "Parado" : "Continuidade"} />{a.text}</AppLink>
              </motion.li>
            ); })}
          </ul>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------- Bloco 7

function IncubatorBlock({ d }: { d: Dash }) {
  const inc = d.incubator!;
  const stageData = inc.byStage.map((s) => ({ name: L.stage(s.stage), value: s.value }));
  return (
    <div className="grid gap-6 md:grid-cols-[1.4fr_1fr_1fr]">
      <InView height={200}>
        {(animate) => (
          <ResponsiveContainer>
            <BarChart data={stageData} margin={{ top: 16, left: -24 }}>
              <CartesianGrid vertical={false} stroke={C.grid} strokeDasharray="2 4" />
              <XAxis dataKey="name" {...axis} />
              <YAxis {...axis} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--surface-2)" }} />
              <Bar dataKey="value" name="Ventures" fill={C.inc} radius={[4, 4, 0, 0]} isAnimationActive={animate}><LabelList dataKey="value" position="top" className="fill-[var(--fg-muted)] text-xs" /></Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </InView>
      <div className="grid content-start gap-3">
        <p className="text-sm font-medium">Por trilha</p>
        {inc.byTrack.map((x) => <div key={x.track} className="flex items-center justify-between rounded-[var(--radius-md)] bg-surface-2 p-3 text-sm"><span>{x.track === "INTERNA" ? "Interna (vinda do Lab)" : "Externa (startups)"}</span><span className="font-display text-xl font-bold">{x.value}</span></div>)}
        <p className="text-sm font-medium">Coortes</p>
        <div className="flex flex-wrap gap-1">{inc.cohorts.map((c) => <Tag key={c.name} tone="inc">{c.name}</Tag>)}</div>
      </div>
      <div className="grid content-start gap-3">
        <p className="text-sm font-medium">Saídas</p>
        {inc.exits.map((x) => <div key={x.kind} className="flex items-center justify-between rounded-[var(--radius-md)] border border-line p-3 text-sm"><span>{L.exit(x.kind)}</span><span className="font-display text-xl font-bold">{x.value}</span></div>)}
        <p className="text-xs text-fg-subtle">Valores financeiros: {inc.financials.cohortEnvelope}. Contrapartidas, M&A e TIS Capital só aparecem aqui, como informação.</p>
      </div>
    </div>
  );
}
