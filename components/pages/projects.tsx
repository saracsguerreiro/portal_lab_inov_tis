"use client";
import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { ArrowLeft, Check, CircleDot, ExternalLink, Flag, Lock, Search, ShieldCheck, SlidersHorizontal, X } from "lucide-react";
import type { ProjectCard as ProjectCardT } from "@/lib/services/projects";
import type { ResultOf } from "@/lib/services";
import { t, fmtDate } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { L } from "@/lib/domain/labels";
import { INC_STAGES, LAB_STAGES } from "@/lib/domain/workflow";
import { useQuery, useSession } from "@/lib/client/hooks";
import { Button, Card, CardGridSkeleton, EmptyState, ErrorState, Input, Select, Tag } from "@/components/ui";
import { Reveal } from "@/components/motion";
import { AreaTag, Breadcrumbs, PageHeader, ProjectCard, VisibilityTag } from "@/components/domain";
import { AppLink } from "@/components/layout/app-link";

// =============================================================== P05 Projectos (montra)

export function ProjectsView({ initial }: { initial: ProjectCardT[] }) {
  const params = useSearchParams();
  const { user } = useSession();
  const { data = initial, error, loading, reload } = useQuery("listProjects", undefined, { initialData: initial });
  const [q, setQ] = React.useState("");
  const [area, setArea] = React.useState(params?.get("area") ?? "");
  const [line, setLine] = React.useState("");
  const [stage, setStage] = React.useState("");
  const [theme, setTheme] = React.useState("");
  const themes = [...new Set(data.map((p) => p.theme).filter(Boolean))] as string[];
  const stages = area === "LAB" ? LAB_STAGES : area === "INCUBADORA" ? INC_STAGES : [...LAB_STAGES, ...INC_STAGES];
  const filtered = data.filter(
    (p) =>
      (!area || p.area === area) &&
      (!line || p.workLine === line) &&
      (!stage || p.stage === stage) &&
      (!theme || p.theme === theme) &&
      (!q || `${p.name} ${p.shortDescription}`.toLowerCase().includes(q.toLowerCase())),
  );
  const active = [area, line, stage, theme, q].filter(Boolean).length;
  const clear = () => { setArea(""); setLine(""); setStage(""); setTheme(""); setQ(""); };

  return (
    <>
      <PageHeader crumbs={[{ label: t("nav.projects") }]} eyebrow="P05 · Montra" title="Projectos e ventures" lead={user ? "Com login vê também os projectos internos. Cada cartão mostra a sua visibilidade." : "Projectos públicos do Laboratório e da Incubadora. Entre para ver também os internos."} />
      <div className="container-x py-10">
        <div className="sticky top-16 z-20 -mx-4 mb-8 grid gap-3 bg-bg/90 px-4 py-3 backdrop-blur-xl md:top-[72px] md:-mx-0 md:rounded-[var(--radius-lg)] md:border md:border-line md:px-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-60 flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar projectos" aria-label="Pesquisar projectos" className="pl-10" />
            </div>
            <div role="radiogroup" aria-label="Área" className="flex gap-1 rounded-[var(--radius-md)] bg-surface-2 p-1">
              {[["", "Todas"], ["LAB", "Laboratório"], ["INCUBADORA", "Incubadora"]].map(([v, l]) => (
                <button key={v} role="radio" aria-checked={area === v} onClick={() => { setArea(v); setStage(""); }} className={cn("relative min-h-9 rounded-[8px] px-3 text-sm font-medium transition-colors", area === v ? "text-fg" : "text-fg-muted hover:text-fg")}>
                  {area === v && <motion.span layoutId="area-pill" className="absolute inset-0 -z-0 rounded-[8px] bg-surface shadow-1" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
                  <span className="relative">{l}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SlidersHorizontal className="size-4 text-fg-subtle" aria-hidden />
            <Select aria-label="Linha de trabalho" value={line} onChange={(e) => setLine(e.target.value)} className="h-9 w-auto text-sm">
              <option value="">Todas as linhas</option>
              {["L1", "L2", "L3", "L4"].map((l) => <option key={l} value={l}>{L.line(l)}</option>)}
            </Select>
            <Select aria-label="Etapa" value={stage} onChange={(e) => setStage(e.target.value)} className="h-9 w-auto text-sm">
              <option value="">Todas as etapas</option>
              {stages.map((s) => <option key={s} value={s}>{L.stage(s)}</option>)}
            </Select>
            <Select aria-label="Tema" value={theme} onChange={(e) => setTheme(e.target.value)} className="h-9 w-auto text-sm">
              <option value="">Todos os temas</option>
              {themes.map((th) => <option key={th} value={th}>{th}</option>)}
            </Select>
            {active > 0 && <Button variant="ghost" size="sm" onClick={clear}><X /> {t("actions.clearFilters")}</Button>}
            <p className="ml-auto text-sm text-fg-subtle" aria-live="polite">{filtered.length} {filtered.length === 1 ? "projecto" : "projectos"}</p>
          </div>
        </div>

        {error ? <ErrorState message={error.message} onRetry={reload} /> : loading && !data.length ? <CardGridSkeleton /> : filtered.length === 0 ? (
          <EmptyState title={t("states.noResults")} hint="Experimente outra combinação de filtros." action={<Button variant="secondary" onClick={clear}>{t("actions.clearFilters")}</Button>} />
        ) : (
          <LayoutGroup>
            <h2 className="sr-only">Lista de projectos</h2>
            <motion.ul layout className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence mode="popLayout">
                {filtered.map((p) => (
                  <motion.li key={p.id} layout initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ type: "spring", stiffness: 350, damping: 32 }} className="h-full">
                    <ProjectCard p={p} />
                  </motion.li>
                ))}
              </AnimatePresence>
            </motion.ul>
          </LayoutGroup>
        )}
      </div>
    </>
  );
}

// =============================================================== P06 Ficha do projecto

type Detail = ResultOf<"getProject">;
type Internal = Extract<Detail, { hypothesis?: unknown }>;
type Management = Extract<Detail, { canManage: boolean }>;

export function ProjectDetailView({ id, initial }: { id: string; initial: Detail | null }) {
  const { user, ready } = useSession();
  const { data = initial ?? undefined, error, loading } = useQuery("getProject", { id }, { initialData: initial ?? undefined, enabled: !!user || !initial });
  if (!data) {
    if (loading || !ready) return <div className="container-x py-16"><CardGridSkeleton count={2} /></div>;
    return (
      <div className="container-x py-20">
        <EmptyState icon={<Lock className="size-6" />} title={error?.status === 404 ? "Projecto não encontrado" : "Este projecto não está visível para o seu perfil"} hint={user ? "Os projectos restritos só são vistos pelos gestores e pela Comissão Executiva." : "Entre com a sua conta para ver projectos internos."} action={!user ? <Button asChild><Link href="/entrar">{t("nav.signIn")}</Link></Button> : undefined} />
      </div>
    );
  }
  const p = data.card;
  const internal = data.level !== "public" ? (data as Internal) : null;
  const mgmt = data.level === "management" ? (data as Management) : null;
  const stages = internal?.stages ?? (p.area === "LAB" ? LAB_STAGES : INC_STAGES);
  return (
    <article>
      <div className="relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: p.cover, viewTransitionName: `cover-${p.slug}` }} aria-hidden />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10" aria-hidden />
        <div className="container-x relative grid gap-5 pb-12 pt-8 text-white md:pb-16">
          <div className="[&_a]:text-white/80 [&_li]:text-white/70 [&_span]:text-white"><Breadcrumbs items={[{ href: "/projectos", label: t("nav.projects") }, { label: p.name }]} /></div>
          <div className="flex flex-wrap gap-2">
            <AreaTag area={p.area} />
            <VisibilityTag v={p.visibility} />
            <Tag className="border-white/20 bg-white/15 text-white">{L.stage(p.stage)}</Tag>
            {p.workLine && <Tag className="border-white/20 bg-white/15 text-white">{L.line(p.workLine)}</Tag>}
            {p.exit && <Tag tone="ok">{L.exit(p.exit.kind)}</Tag>}
          </div>
          <h1 className="max-w-4xl text-balance font-display text-[length:var(--text-4xl)] font-bold">{p.name}</h1>
          <p className="max-w-2xl text-lg text-white/85">{p.shortDescription}</p>
        </div>
      </div>

      <div className="container-x grid gap-10 py-12 lg:grid-cols-[1fr_340px]">
        <div className="grid content-start gap-10">
          <StageTimeline stages={stages as string[]} current={p.stage} gates={internal?.gates ?? []} exit={p.exit?.kind} />
          <Block title="Problema">{data.problem}</Block>
          {internal?.hypothesis && <Block title="Hipótese">{internal.hypothesis}</Block>}
          {data.publicResults && <Block title="Resultados">{data.publicResults}</Block>}
          {internal?.decisions && <Block title="Decisões">{internal.decisions}</Block>}
          {internal && internal.learningCards.length > 0 && (
            <section className="grid gap-4">
              <h2 className="font-display text-2xl font-bold">Learning cards</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {internal.learningCards.map((l) => (
                  <Card key={l.title} className="grid gap-2 p-5"><p className="font-medium">{l.title}</p><p className="text-sm text-fg-muted">{l.learned}</p></Card>
                ))}
              </div>
            </section>
          )}
          {mgmt && (
            <section className="grid gap-4 rounded-[var(--radius-lg)] border border-dashed border-ai/40 bg-ai-soft/40 p-6" aria-labelledby="gestao-h">
              <h2 id="gestao-h" className="flex items-center gap-2 font-display text-xl font-bold"><Lock className="size-4" /> Versão de gestão</h2>
              {mgmt.metrics.length > 0 && (
                <dl className="grid gap-3 sm:grid-cols-3">
                  {mgmt.metrics.map((m) => <div key={m.label} className="rounded-[var(--radius-md)] bg-surface p-4"><dt className="text-xs text-fg-subtle">{m.label}</dt><dd className="font-display text-2xl font-bold">{m.value}</dd></div>)}
                </dl>
              )}
              {mgmt.mainMetric && <p className="text-sm"><span className="font-medium">Métrica principal:</span> {mgmt.mainMetric}</p>}
              {mgmt.killMetric && <p className="text-sm"><span className="font-medium">Métrica de abandono:</span> {mgmt.killMetric}</p>}
              {mgmt.internalNotes && <p className="text-sm"><span className="font-medium">Notas internas:</span> {mgmt.internalNotes}</p>}
              <div>
                <p className="mb-2 text-sm font-medium">Histórico de visibilidade</p>
                {mgmt.visibilityHistory.length === 0 ? <p className="text-sm text-fg-muted">Sem mudanças: nasceu Interno.</p> : (
                  <ul className="grid gap-1 text-sm text-fg-muted">
                    {mgmt.visibilityHistory.map((v) => <li key={v.id}>{fmtDate(v.at)} · {L.visibility(v.from)} → {L.visibility(v.to)} · {v.by}</li>)}
                  </ul>
                )}
              </div>
              {mgmt.canManage && <Button asChild variant="ai" size="sm" className="w-fit"><AppLink href={`/gestao/projectos?projecto=${p.id}`}>Gerir este projecto</AppLink></Button>}
            </section>
          )}
          {!internal && (
            <Card className="flex flex-wrap items-center gap-4 p-5">
              <Lock className="size-5 text-fg-subtle" />
              <p className="flex-1 text-sm text-fg-muted">A hipótese, a equipa, os gates e as ligações ao Jira e ao Confluence estão na versão com login.</p>
              <Button asChild variant="secondary" size="sm"><Link href="/entrar">{t("nav.signIn")}</Link></Button>
            </Card>
          )}
        </div>

        <aside className="grid content-start gap-5">
          {internal && (
            <Card className="grid gap-4 p-5">
              <h2 className="font-display text-lg font-bold">Equipa</h2>
              {internal.sponsor && <p className="text-sm"><span className="text-fg-subtle">Patrocinador:</span> {internal.sponsor}</p>}
              <ul className="grid gap-2">
                {internal.team.map((m) => <li key={m.name + m.role} className="flex items-center justify-between gap-2 text-sm"><span>{m.name}</span><Tag>{{ RESPONSAVEL: "Responsável", MEMBRO: "Membro", ROTATIVO: "Membro rotativo", CHAMPION: "Champion" }[m.role]}</Tag></li>)}
              </ul>
            </Card>
          )}
          {internal && (
            <Card className="grid gap-3 p-5 text-sm">
              <h2 className="font-display text-lg font-bold">Segurança e arquitectura</h2>
              <p className="flex items-center gap-2"><ShieldCheck className={cn("size-4", internal.architectureValidatedAt ? "text-ok" : "text-fg-subtle")} /> {internal.architectureValidatedAt ? `Arquitectura validada pelo Digital Office em ${fmtDate(internal.architectureValidatedAt)}` : "Arquitectura por validar"}</p>
              <p>Fase do Kit de segurança: <span className="font-medium">{["0 Conceito", "1 Experimento", "2 Piloto ou MVP", "3 Produção"][internal.securityKitPhase]}</span></p>
            </Card>
          )}
          {internal && Object.values(internal.links).some(Boolean) && <IntegrationsCard id={p.id} />}
          {data.partners.length > 0 && (
            <Card className="grid gap-3 p-5">
              <h2 className="font-display text-lg font-bold">Parceiros</h2>
              {data.partners.map((x) => <p key={x.id} className="flex items-center gap-2 text-sm"><span className="grid size-8 place-items-center rounded-lg bg-fg text-xs font-bold text-bg">{x.logo}</span>{x.name}</p>)}
            </Card>
          )}
          {data.news.length > 0 && (
            <Card className="grid gap-3 p-5">
              <h2 className="font-display text-lg font-bold">Notícias ligadas</h2>
              {data.news.map((n) => <AppLink key={n.id} href={`/noticias/${n.slug}`} className="text-sm font-medium text-brand-ink hover:underline">{n.title}</AppLink>)}
            </Card>
          )}
          <Button asChild variant="ghost" className="w-fit"><AppLink href="/projectos"><ArrowLeft /> Voltar aos projectos</AppLink></Button>
        </aside>
      </div>
    </article>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Reveal as="section" className="grid gap-3">
      <h2 className="font-display text-2xl font-bold">{title}</h2>
      <p className="whitespace-pre-line text-lg text-fg-muted">{children}</p>
    </Reveal>
  );
}

/** Linha do tempo das etapas com progresso animado; gates como marcos que se acendem. */
function StageTimeline({ stages, current, gates, exit }: { stages: string[]; current: string; gates: { stage: string; decision: string; at: string; evidence: string }[]; exit?: string }) {
  const idx = Math.max(0, stages.indexOf(current));
  const pct = exit ? 100 : (idx / Math.max(1, stages.length - 1)) * 100;
  return (
    <section aria-labelledby="etapas-h" className="grid gap-5">
      <h2 id="etapas-h" className="font-display text-2xl font-bold">Em que ponto está</h2>
      <div className="relative pt-2">
        <div className="absolute left-5 right-5 top-[26px] h-1 rounded-full bg-surface-3" aria-hidden />
        <motion.div className="absolute left-5 top-[26px] h-1 origin-left rounded-full bg-gradient-to-r from-lab to-brand" style={{ width: "calc(100% - 40px)" }} initial={{ scaleX: 0 }} whileInView={{ scaleX: pct / 100 }} viewport={{ once: true }} transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }} aria-hidden />
        <ol className="relative grid" style={{ gridTemplateColumns: `repeat(${stages.length}, minmax(0,1fr))` }}>
          {stages.map((s, i) => {
            const done = i < idx || !!exit;
            const isCur = i === idx && !exit;
            const gate = gates.find((g) => g.stage === s);
            return (
              <li key={s} className="grid justify-items-center gap-2 text-center" aria-current={isCur ? "step" : undefined}>
                <motion.span
                  className={cn("relative grid size-11 place-items-center rounded-full border-4 border-bg text-white", done ? "bg-brand" : isCur ? "bg-lab" : "bg-surface-3 text-fg-subtle")}
                  initial={{ scale: 0.6, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + i * 0.25, type: "spring", stiffness: 300, damping: 18 }}
                >
                  {isCur && <span className="pulse-ring absolute inset-0 rounded-full bg-lab/50" aria-hidden />}
                  {done ? <Check className="size-5" strokeWidth={3} /> : <CircleDot className="size-5" />}
                </motion.span>
                <span className={cn("text-sm font-medium", !done && !isCur && "text-fg-subtle")}>{L.stage(s)}</span>
                {gate && (
                  <span title={gate.evidence} className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium", gate.decision === "CONTINUAR" ? "bg-ok-soft text-ok" : gate.decision === "MUDAR" ? "bg-warn-soft text-warn" : "bg-danger-soft text-danger")}>
                    <Flag className="size-3" aria-hidden /> Gate {gate.decision.toLowerCase()} · {fmtDate(gate.at, { month: "short", year: "2-digit" })}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </div>
      {exit && <p className="rounded-[var(--radius-md)] bg-ok-soft p-3 text-sm text-ok">Saída: {L.exit(exit)}</p>}
    </section>
  );
}

/** Integrações (P13): estado do Jira e do Confluence (por API), ligação ao strateegia por URL. */
function IntegrationsCard({ id }: { id: string }) {
  const { data, loading } = useQuery("getProjectIntegrations", { id });
  const items = data ? (["jira", "confluence", "strateegia"] as const).filter((k) => data[k]).map((k) => ({ key: k, label: k === "jira" ? "Jira" : k === "confluence" ? "Confluence" : "strateegia", ...data[k]! })) : [];
  if (!loading && items.length === 0) return null;
  return (
    <Card className="grid gap-3 p-5">
      <h2 className="font-display text-lg font-bold">Ferramentas de trabalho</h2>
      {loading && <div className="skeleton h-14" />}
      {items.map((i) => (
        <a key={i.key} href={i.url} target="_blank" rel="noreferrer" className="group flex items-start justify-between gap-3 rounded-[var(--radius-md)] border border-line p-3 hover:border-line-strong">
          <span className="grid gap-0.5">
            <span className="text-sm font-medium">{i.label}</span>
            <span className="text-xs text-fg-subtle">{i.status}</span>
          </span>
          <ExternalLink className="size-4 text-fg-subtle group-hover:text-fg" aria-hidden />
        </a>
      ))}
    </Card>
  );
}
