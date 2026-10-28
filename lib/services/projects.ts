// Projectos e ventures (P05, P06, P32) e visibilidade (secção 14).
import type { Gate, IncExit, LabExit, Project, Visibility } from "@/lib/domain/types";
import { F5Schema, VISIBILITY_CHECKLIST, type F5Input } from "@/lib/validation/forms";
import { assertCan, canManageProject, canReadProjectManagement, canViewProject, projectDetailLevel } from "@/lib/permissions";
import { INC_STAGES, LAB_STAGES } from "@/lib/domain/workflow";
import { audit, type Ctx, notFound, notifyAreaManagers, nowIso, recordStatus, requireUser, resolveCreator, notify, ServiceError, uid } from "./context";

export interface ProjectCard {
  id: string;
  slug: string;
  name: string;
  area: Project["area"];
  workLine?: Project["workLine"];
  track?: Project["track"];
  stage: string;
  visibility: Visibility;
  featured: boolean;
  shortDescription: string;
  cover?: string;
  theme?: string;
  exit?: Project["exit"];
}

const toCard = (p: Project): ProjectCard => ({
  id: p.id,
  slug: p.slug,
  name: p.name,
  area: p.area,
  workLine: p.workLine,
  track: p.track,
  stage: p.stage,
  visibility: p.visibility,
  featured: p.featured,
  shortDescription: p.shortDescription,
  cover: p.cover,
  theme: p.theme,
  exit: p.exit,
});

/** P05: sem login só Públicos; colaborador Públicos e Internos; gestores e CE também Restritos. */
export async function listProjects(ctx: Ctx): Promise<ProjectCard[]> {
  return (await ctx.repo.all("projects")).filter((p) => canViewProject(ctx.actor, p)).map(toCard);
}

export async function getProject(ctx: Ctx, { id }: { id: string }) {
  const p = (await ctx.repo.all("projects")).find((x) => x.id === id || x.slug === id);
  if (!p) throw notFound("Projecto");
  const level = projectDetailLevel(ctx.actor, p);
  assertCan(level !== null, "Este projecto não está visível para o seu perfil.");
  const partners = (await ctx.repo.all("partners")).filter((x) => p.partnerIds.includes(x.id) && x.disclosureAuthorized);
  const news = (await ctx.repo.all("contents")).filter((c) => c.projectIds?.includes(p.id) && c.status === "PUBLICADO" && (c.visibility === "PUBLICO" || level !== "public"));
  const base = {
    level,
    card: toCard(p),
    problem: p.problem,
    publicResults: p.publicResults,
    partners: partners.map((x) => ({ id: x.id, name: x.name, logo: x.logo })),
    news: news.map((n) => ({ id: n.id, slug: n.slug, title: n.title, kind: n.kind, date: n.date ?? n.publishedAt })),
  };
  if (level === "public") return base;
  const users = new Map((await ctx.repo.all("users")).map((u) => [u.id, u.name]));
  const gates = (await ctx.repo.all("gates")).filter((g) => g.projectId === p.id).sort((a, b) => a.at.localeCompare(b.at));
  const team = (await ctx.repo.all("teamMembers")).filter((t) => t.projectId === p.id);
  const internal = {
    ...base,
    hypothesis: p.hypothesis,
    decisions: p.decisions,
    sponsor: p.sponsorId ? users.get(p.sponsorId) : undefined,
    team: team.map((t) => ({ name: t.name, role: t.role })),
    architectureValidatedAt: p.architectureValidatedAt,
    securityKitPhase: p.securityKitPhase,
    links: p.links,
    learningCards: p.learningCards ?? [],
    gates,
    stages: p.area === "LAB" ? LAB_STAGES : INC_STAGES,
    history: p.history ?? [],
  };
  if (level === "internal") return internal;
  const vis = (await ctx.repo.all("visibilityChanges")).filter((v) => v.projectId === p.id).sort((a, b) => b.at.localeCompare(a.at));
  return {
    ...internal,
    metrics: p.metrics ?? [],
    mainMetric: p.mainMetric,
    killMetric: p.killMetric,
    internalNotes: p.internalNotes,
    visibilityHistory: vis.map((v) => ({ ...v, by: users.get(v.byId) ?? "—" })),
    canManage: canManageProject(ctx.actor, p),
  };
}

// ------------------------------------------------------------- Gestão (P32)

export async function listManagedProjects(ctx: Ctx) {
  assertCan(canReadProjectManagement(ctx.actor));
  const users = new Map((await ctx.repo.all("users")).map((u) => [u.id, u.name]));
  const now = ctx.now().getTime();
  return (await ctx.repo.all("projects")).map((p) => ({
    ...toCard(p),
    sponsor: p.sponsorId ? users.get(p.sponsorId) : undefined,
    canManage: canManageProject(ctx.actor, p),
    daysInStage: Math.floor((now - new Date(p.stageSince).getTime()) / 86400000),
    architectureValidatedAt: p.architectureValidatedAt,
    pendingTransfer: p.area === "INCUBADORA" && p.track === "INTERNA" && p.stage === "INCUBACAO" && (p.history ?? []).some((h) => h.text.startsWith("Transferido do Lab")) && !(p.history ?? []).some((h) => h.text.startsWith("Aceite pela Incubadora")),
  }));
}

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60);

/** Todo o projecto nasce «Interno» (regra 4). Passar a Público exige a checklist. */
export async function createProject(ctx: Ctx, input: F5Input & { checklist?: Record<string, boolean> }) {
  const user = requireUser(ctx);
  const data = F5Schema.parse(input);
  assertCan(canManageProject(ctx.actor, { area: data.area }), "Só o gestor desta área pode criar projectos aqui.");
  const at = nowIso(ctx);
  const p: Project = {
    id: uid("prj_"),
    slug: `${slugify(data.name)}-${Math.random().toString(36).slice(2, 6)}`,
    name: data.name,
    area: data.area,
    track: data.area === "INCUBADORA" ? data.track ?? null : null,
    workLine: data.area === "LAB" ? data.workLine ?? null : null,
    originIdeaId: data.originIdeaId ?? null,
    visibility: "INTERNO",
    featured: false,
    cover: data.cover,
    shortDescription: data.shortDescription,
    problem: data.problem,
    hypothesis: data.hypothesis,
    stage: data.stage as Project["stage"],
    sponsorId: data.sponsorId,
    mainMetric: data.mainMetric,
    killMetric: data.killMetric,
    architectureValidatedAt: data.architectureValidatedAt ?? null,
    securityKitPhase: data.securityKitPhase as Project["securityKitPhase"],
    partnerIds: data.partnerIds,
    links: data.links,
    exit: null,
    history: [{ at, text: "Projecto criado" }],
    stageSince: at,
    createdAt: at,
    updatedAt: at,
  };
  await ctx.repo.insert("projects", p);
  for (const m of data.team) await ctx.repo.insert("teamMembers", { id: uid("tm_"), projectId: p.id, userId: m.userId ?? null, name: m.name, role: m.role });
  await audit(ctx, "project.create", "project", p.id, undefined, { name: p.name, area: p.area });
  if (data.originIdeaId) {
    const idea = await ctx.repo.get("ideas", data.originIdeaId);
    if (idea) {
      await ctx.repo.update("ideas", idea.id, { projectId: p.id });
      const creator = await resolveCreator(ctx, idea);
      await notify(ctx, { ...creator, title: `A sua ideia ${idea.number} deu origem a um projecto`, body: `Projecto: ${p.name}.`, href: creator.userId ? `/conta/ideias/${idea.id}` : undefined });
    }
  }
  if (data.visibility !== "INTERNO") await changeVisibility(ctx, { id: p.id, to: data.visibility, checklist: input.checklist ?? {} });
  if (data.featured && data.visibility === "PUBLICO") await ctx.repo.update("projects", p.id, { featured: true });
  void user;
  return { id: p.id, slug: p.slug };
}

/** Converter uma ideia em projecto ou venture (P31): os dados passam para a ficha. */
export async function projectDraftFromIdea(ctx: Ctx, { ideaId }: { ideaId: string }) {
  const idea = await ctx.repo.get("ideas", ideaId);
  if (!idea) throw notFound("Ideia");
  assertCan(canManageProject(ctx.actor, { area: idea.area }));
  const a = idea.answers as Record<string, string>;
  return {
    name: idea.title,
    area: idea.area,
    originIdeaId: idea.id,
    shortDescription: idea.summary,
    problem: a.problem ?? "",
    hypothesis: a.proposal ?? a.solution ?? "",
    stage: idea.area === "LAB" ? "OPORTUNIDADE" : "INCUBACAO",
    track: idea.area === "INCUBADORA" ? (idea.type === "EXTERNA" ? "EXTERNA" : "INTERNA") : null,
    workLine: idea.workLine ?? null,
  };
}

async function managed(ctx: Ctx, id: string) {
  const p = await ctx.repo.get("projects", id);
  if (!p) throw notFound("Projecto");
  assertCan(canManageProject(ctx.actor, p), "Só o gestor desta área pode alterar o projecto. A outra área vê em leitura.");
  return p;
}

export async function updateProject(ctx: Ctx, { id, patch }: { id: string; patch: Partial<Pick<Project, "name" | "shortDescription" | "problem" | "hypothesis" | "mainMetric" | "killMetric" | "securityKitPhase" | "links" | "internalNotes" | "publicResults" | "decisions" | "architectureValidatedAt" | "sponsorId" | "cover">> }) {
  const p = await managed(ctx, id);
  const updated = await ctx.repo.update("projects", id, { ...patch, updatedAt: nowIso(ctx) });
  await audit(ctx, "project.update", "project", id, Object.fromEntries(Object.keys(patch).map((k) => [k, (p as unknown as Record<string, unknown>)[k]])), patch);
  return updated;
}

export async function changeStage(ctx: Ctx, { id, stage }: { id: string; stage: Project["stage"] }) {
  const p = await managed(ctx, id);
  const valid = (p.area === "LAB" ? LAB_STAGES : INC_STAGES) as string[];
  if (!valid.includes(stage)) throw new ServiceError("Etapa inválida para esta área.", 400);
  // Antes de sair de Experimentação, a arquitectura tem de estar validada pelo Digital Office.
  if (p.stage === "EXPERIMENTACAO" && stage === "PASSAGEM" && !p.architectureValidatedAt)
    throw new ServiceError("A arquitectura tem de ser validada pelo Digital Office antes de sair de Experimentação.", 409);
  const at = nowIso(ctx);
  await ctx.repo.update("projects", id, { stage, stageSince: at, updatedAt: at, history: [...(p.history ?? []), { at, text: `Etapa: ${stage}` }] });
  await recordStatus(ctx, "PROJECT", id, p.stage, stage);
  await audit(ctx, "project.stage", "project", id, { stage: p.stage }, { stage });
}

export async function recordGate(ctx: Ctx, input: Omit<Gate, "id" | "projectId" | "at"> & { projectId: string; at?: string }) {
  const p = await managed(ctx, input.projectId);
  if (!input.evidence.trim()) throw new ServiceError("Sem evidência mínima registada, o projecto não avança.", 400);
  const gate: Gate = { id: uid("gate_"), projectId: p.id, stage: input.stage, decision: input.decision, evidence: input.evidence.trim(), decidedBy: input.decidedBy, at: input.at ?? nowIso(ctx) };
  await ctx.repo.insert("gates", gate);
  await audit(ctx, "project.gate", "project", p.id, undefined, gate);
  if (input.decision === "CONTINUAR") {
    const order = (p.area === "LAB" ? LAB_STAGES : INC_STAGES) as string[];
    const next = order[order.indexOf(p.stage) + 1];
    if (next) await changeStage(ctx, { id: p.id, stage: next as Project["stage"] });
  }
  return gate;
}

/** Registar a saída. «INCUBADORA» passa o projecto do Lab para a trilha interna da Incubadora. */
export async function recordExit(ctx: Ctx, { id, kind, reason }: { id: string; kind: LabExit | IncExit; reason: string }) {
  const p = await managed(ctx, id);
  const labExits: string[] = ["DIRECCAO", "INCUBADORA", "STANDARD", "ENCERRADO"];
  const incExits: string[] = ["SPIN_IN", "SPIN_OFF", "ENCERRAMENTO"];
  if (!(p.area === "LAB" ? labExits : incExits).includes(kind)) throw new ServiceError("Saída inválida para esta área.", 400);
  if (!reason.trim()) throw new ServiceError("Indique o motivo da saída.", 400);
  const at = nowIso(ctx);
  if (kind === "INCUBADORA") {
    if (!p.architectureValidatedAt) throw new ServiceError("A arquitectura tem de estar validada antes da passagem.", 409);
    await ctx.repo.update("projects", id, {
      area: "INCUBADORA",
      track: "INTERNA",
      workLine: p.workLine,
      stage: "INCUBACAO",
      stageSince: at,
      updatedAt: at,
      history: [...(p.history ?? []), { at, text: `Transferido do Lab para a Incubadora: ${reason}` }],
    });
    await recordStatus(ctx, "PROJECT", id, `LAB:${p.stage}`, "INCUBADORA:INCUBACAO", reason);
    await audit(ctx, "project.transfer", "project", id, { area: "LAB" }, { area: "INCUBADORA" });
    await notifyAreaManagers(ctx, "INCUBADORA", `Projecto passado do Lab: ${p.name}`, "Aceite e defina a etapa inicial.", `/gestao/projectos?projecto=${id}`);
    return;
  }
  await ctx.repo.update("projects", id, { exit: { kind, at, reason: reason.trim() }, updatedAt: at, history: [...(p.history ?? []), { at, text: `Saída: ${kind}` }] });
  await audit(ctx, "project.exit", "project", id, undefined, { kind, reason });
}

export async function acceptTransfer(ctx: Ctx, { id, stage }: { id: string; stage: Project["stage"] }) {
  const p = await managed(ctx, id);
  if (p.area !== "INCUBADORA") throw new ServiceError("Só projectos da Incubadora.", 400);
  const at = nowIso(ctx);
  await ctx.repo.update("projects", id, { stage, stageSince: at, history: [...(p.history ?? []), { at, text: "Aceite pela Incubadora" }] });
  await audit(ctx, "project.accept_transfer", "project", id, undefined, { stage });
}

/** Mudar a visibilidade: «Público» exige a checklist completa; tudo fica registado. */
export async function changeVisibility(ctx: Ctx, { id, to, checklist }: { id: string; to: Visibility; checklist?: Record<string, boolean> }) {
  const user = requireUser(ctx);
  const p = await managed(ctx, id);
  if (to === p.visibility) return;
  if (to === "RESTRITO" && !(await ctx.repo.settings()).restrictedVisibilityEnabled) throw new ServiceError("O nível Restrito está desactivado nas configurações.", 400);
  if (to === "PUBLICO") {
    const missing = VISIBILITY_CHECKLIST.filter((c) => !checklist?.[c.key]);
    if (missing.length) throw new ServiceError(`Checklist incompleta: ${missing.map((m) => m.label).join(" ")}`, 400, "CHECKLIST");
  }
  await ctx.repo.update("projects", id, { visibility: to, featured: to === "PUBLICO" ? p.featured : false, updatedAt: nowIso(ctx) });
  await ctx.repo.insert("visibilityChanges", { id: uid("vis_"), projectId: id, from: p.visibility, to, byId: user.id, checklist: to === "PUBLICO" ? checklist : undefined, at: nowIso(ctx) });
  await audit(ctx, "project.visibility", "project", id, { visibility: p.visibility }, { visibility: to, checklist });
}

export async function setFeatured(ctx: Ctx, { id, featured }: { id: string; featured: boolean }) {
  const p = await managed(ctx, id);
  if (featured && p.visibility !== "PUBLICO") throw new ServiceError("Só projectos públicos podem ter destaque na Home.", 400);
  if (featured && (await ctx.repo.all("projects")).filter((x) => x.featured && x.id !== id).length >= 6)
    throw new ServiceError("A Home mostra até 6 projectos em destaque. Retire um primeiro.", 409);
  await ctx.repo.update("projects", id, { featured });
  await audit(ctx, "project.featured", "project", id, { featured: p.featured }, { featured });
}

/** Learning cards publicados pelos projectos visíveis (P28). */
export async function listLearningCards(ctx: Ctx) {
  return (await ctx.repo.all("projects"))
    .filter((p) => canViewProject(ctx.actor, p) && ctx.actor.kind === "user")
    .flatMap((p) => (p.learningCards ?? []).map((l) => ({ ...l, projectName: p.name, projectSlug: p.slug, area: p.area })));
}

/** Estado do Jira e do Confluence para a ficha com login (P13). */
export async function getProjectIntegrations(ctx: Ctx, { id }: { id: string }) {
  const p = (await ctx.repo.all("projects")).find((x) => x.id === id || x.slug === id);
  if (!p) throw notFound("Projecto");
  const level = projectDetailLevel(ctx.actor, p);
  assertCan(level === "internal" || level === "management");
  const { projectIntegrations } = await import("@/lib/integrations/atlassian");
  return projectIntegrations(p, await ctx.repo.settings());
}
