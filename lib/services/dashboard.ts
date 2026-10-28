// Painel de performance (P30), blocos 1 a 7. Só gestores e Comissão Executiva.
import type { Area, WorkLine } from "@/lib/domain/types";
import { assertCan, canViewBoardTopics, canViewDashboard } from "@/lib/permissions";
import { addBusinessDays, businessDaysBetween } from "@/lib/domain/workflow";
import type { Ctx } from "./context";

export interface DashboardFilters {
  from: string;
  to: string;
  area?: Area | "AMBAS";
  workLine?: WorkLine | "TODAS";
}

export async function getDashboard(ctx: Ctx, f: DashboardFilters) {
  assertCan(canViewDashboard(ctx.actor), "O painel é dos gestores e da Comissão Executiva.");
  const s = await ctx.repo.settings();
  const area = f.area && f.area !== "AMBAS" ? f.area : null;
  const line = f.workLine && f.workLine !== "TODAS" ? f.workLine : null;
  const inPeriod = (iso: string) => iso >= f.from && iso <= f.to;
  const allIdeas = await ctx.repo.all("ideas");
  const ideas = allIdeas.filter((i) => inPeriod(i.createdAt) && (!area || i.area === area) && (!line || i.workLine === line));
  const projects = (await ctx.repo.all("projects")).filter((p) => (!area || p.area === area) && (!line || p.workLine === line));
  const analyses = await ctx.repo.all("aiAnalyses");
  const history = await ctx.repo.all("statusHistory");
  const users = await ctx.repo.all("users");
  const challenges = await ctx.repo.all("challenges");
  const now = ctx.now();

  // Bloco 1 — números-chave
  const decided = ideas.filter((i) => i.status === "DECISAO");
  const selected = decided.filter((i) => i.decision === "SELECCIONADA");
  const responded = ideas.filter((i) => i.firstResponseAt);
  const avgFirstResponse = responded.length
    ? responded.reduce((n, i) => n + businessDaysBetween(new Date(i.createdAt), new Date(i.firstResponseAt!)), 0) / responded.length
    : 0;
  const kpis = {
    ideasByType: {
      EXTERNA: ideas.filter((i) => i.type === "EXTERNA").length,
      MELHORIA: ideas.filter((i) => i.type === "MELHORIA").length,
      NEGOCIO_COLABORADOR: ideas.filter((i) => i.type === "NEGOCIO_COLABORADOR").length,
    },
    ideasTotal: ideas.length,
    selectionRate: decided.length ? selected.length / decided.length : 0,
    avgFirstResponseDays: Math.round(avgFirstResponse * 10) / 10,
    deadlineDays: s.responseDeadlineDays,
    activeLab: projects.filter((p) => p.area === "LAB" && !p.exit).length,
    activeVentures: projects.filter((p) => p.area === "INCUBADORA" && !p.exit).length,
    inUse: projects.filter((p) => p.exit && ["DIRECCAO", "STANDARD", "SPIN_IN"].includes(p.exit.kind)).length,
  };

  // Bloco 2 — funil com taxas de passagem
  const reached = (status: string) => ideas.filter((i) => history.some((h) => h.entity === "IDEA" && h.entityId === i.id && h.to === status) || i.status === status).length;
  const labTransfers = projects.filter((p) => (p.history ?? []).some((h) => h.text.startsWith("Transferido do Lab"))).length;
  const funnelRaw = [
    { key: "submetidas", label: "Submetidas", value: ideas.length },
    { key: "triagem", label: "Em triagem", value: reached("EM_ANALISE") },
    { key: "avaliacao", label: "Em avaliação", value: reached("EM_AVALIACAO") },
    { key: "seleccionadas", label: "Seleccionadas", value: selected.length },
    { key: "projectos", label: "Projectos e ventures", value: projects.filter((p) => !area || p.area === area).length },
    { key: "saidas", label: "Com saída", value: projects.filter((p) => p.exit).length },
  ];
  // A taxa de passagem só compara populações iguais: ideias entre si; saídas face a projectos.
  const funnel = funnelRaw.map((st, i) => ({ ...st, rate: i === 0 || i === 4 || !funnelRaw[i - 1].value ? null : Math.round((st.value / funnelRaw[i - 1].value) * 100) }));

  // Bloco 3 — objectivos 2027 (planeado vs real por trimestre)
  const okrs = s.okrs;

  // Bloco 4 — IA: distribuição e concordância com a decisão da equipa
  const latest = new Map<string, (typeof analyses)[number]>();
  for (const a of analyses.filter((a) => a.status === "CONCLUIDA").sort((x, y) => x.createdAt.localeCompare(y.createdAt))) latest.set(a.ideaId, a);
  const scored = ideas.map((i) => ({ i, a: latest.get(i.id) })).filter((x) => x.a);
  const buckets = [0, 20, 40, 60, 80].map((lo) => ({ range: `${lo}–${lo + 20}`, count: scored.filter(({ a }) => a!.total >= lo && (lo === 80 ? a!.total <= 100 : a!.total < lo + 20)).length }));
  const withDecision = scored.filter(({ i }) => i.status === "DECISAO" && i.decision);
  const agree = withDecision.filter(({ i, a }) => (a!.total >= 60) === (i.decision === "SELECCIONADA")).length;
  const ai = {
    buckets,
    agreementRate: withDecision.length ? agree / withDecision.length : null,
    sample: withDecision.length,
    pending: ideas.filter((i) => !latest.has(i.id)).length,
    avgDiff: (() => {
      const pairs = scored.filter(({ i }) => typeof i.managerScore === "number");
      return pairs.length ? Math.round(pairs.reduce((n, { i, a }) => n + (i.managerScore! - a!.total), 0) / pairs.length) : null;
    })(),
  };

  // Bloco 5 — participação
  const byArea = new Map<string, number>();
  for (const i of ideas.filter((i) => i.affectedArea)) byArea.set(i.affectedArea!, (byArea.get(i.affectedArea!) ?? 0) + 1);
  const collaboratorIds = new Set(ideas.filter((i) => i.authorId && i.type !== "EXTERNA").map((i) => i.authorId));
  const anonCollab = ideas.filter((i) => i.origin === "ANONIMA_COLABORADOR").length;
  const extByType = new Map<string, number>();
  for (const i of ideas.filter((i) => i.type === "EXTERNA")) {
    const t = (i.answers as Record<string, string>).profileType ?? "OUTRA";
    extByType.set(t, (extByType.get(t) ?? 0) + 1);
  }
  const participation = {
    byTisArea: [...byArea.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
    collaborators: collaboratorIds.size,
    anonymousCollaboratorIdeas: anonCollab,
    externalsByType: [...extByType.entries()].map(([type, value]) => ({ type, value })),
    challenges: challenges.map((c) => ({ id: c.id, title: c.title, status: c.status, participations: allIdeas.filter((i) => i.challengeId === c.id).length })),
    totalUsers: users.length,
  };

  // Bloco 6 — decisões e alertas
  const overdue = allIdeas.filter((i) => !i.firstResponseAt && !["RETIRADA", "DUPLICADA"].includes(i.status) && addBusinessDays(new Date(i.createdAt), s.responseDeadlineDays) < now);
  const stalled = projects.filter((p) => !p.exit && (now.getTime() - new Date(p.stageSince).getTime()) / 86400000 > s.stalledProjectDays);
  const atRisk = projects.filter((p) => !p.exit && p.stage === "EXPERIMENTACAO" && (!p.killMetric || !p.architectureValidatedAt));
  const alerts = [
    ...overdue.map((i) => ({ kind: "PRAZO" as const, text: `${i.number} passou o prazo de retorno`, href: `/gestao/triagem?ideia=${i.id}` })),
    ...stalled.map((p) => ({ kind: "PARADO" as const, text: `${p.name} está parado há mais de ${s.stalledProjectDays} dias em ${p.stage}`, href: `/projectos/${p.slug}` })),
    ...atRisk.map((p) => ({ kind: "CONTINUIDADE" as const, text: `${p.name}: critérios de continuidade em risco (métrica de abandono ou arquitectura)`, href: `/projectos/${p.slug}` })),
  ];

  // Bloco 7 — Incubadora (temas do board, só gestores e CE)
  const ventures = projects.filter((p) => p.area === "INCUBADORA");
  const incubator = canViewBoardTopics(ctx.actor)
    ? {
        byTrack: ["INTERNA", "EXTERNA"].map((t) => ({ track: t, value: ventures.filter((v) => v.track === t).length })),
        byStage: ["INCUBACAO", "CRESCIMENTO", "PRONTA_SAIDA"].map((st) => ({ stage: st, value: ventures.filter((v) => v.stage === st && !v.exit).length })),
        exits: ["SPIN_IN", "SPIN_OFF", "ENCERRAMENTO"].map((k) => ({ kind: k, value: ventures.filter((v) => v.exit?.kind === k).length })),
        cohorts: (await ctx.repo.all("contents")).filter((c) => c.kind === "DESTAQUE" && c.meta?.cohort).map((c) => ({ name: c.meta!.cohort, title: c.title })),
        financials: s.incubationFinancials,
      }
    : null;

  return { kpis, funnel, labTransfers, okrs, ai, participation, pendingDecisions: s.pendingDecisions, alerts, incubator, generatedAt: now.toISOString(), filters: f };
}
