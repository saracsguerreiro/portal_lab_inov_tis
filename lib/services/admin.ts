// Gestão: critérios da IA (P34), comunicação (P35), utilizadores e configurações (P36),
// pedidos de apoio (P27).
import type { Criterion, CriteriaSet, Role, Settings, SupportRequest } from "@/lib/domain/types";
import { F3Schema, type F3Input } from "@/lib/validation/forms";
import {
  assertCan,
  canManageCriteria,
  canManageSupportRequests,
  canManageUsers,
  canSubmitSupportRequest,
  canViewAllSupportRequests,
  canViewTriage,
  managerArea,
  roleOf,
} from "@/lib/permissions";
import { analyze, buildAiInput, getProvider } from "@/lib/ai";
import { audit, type Ctx, me, notFound, notify, notifyAreaManagers, nowIso, requireUser, ServiceError, uid } from "./context";

// ------------------------------------------------------------- P34 Critérios da IA

export async function getCriteria(ctx: Ctx) {
  assertCan(canViewTriage(ctx.actor));
  const all = await ctx.repo.all("criteriaSets");
  const pick = (k: CriteriaSet["ideaKind"]) => ({
    active: all.find((c) => c.ideaKind === k && c.active)!,
    versions: all.filter((c) => c.ideaKind === k).sort((a, b) => b.version - a.version).map((c) => ({ id: c.id, version: c.version, createdAt: c.createdAt, active: c.active })),
    canEdit: canManageCriteria(ctx.actor, k),
  });
  return { EXTERNA_NEGOCIO: pick("EXTERNA_NEGOCIO"), MELHORIA: pick("MELHORIA") };
}

/** Guardar cria uma nova versão; cada análise guarda a versão usada. Os pesos têm de somar 100 %. */
export async function saveCriteria(ctx: Ctx, { kind, criteria, context }: { kind: CriteriaSet["ideaKind"]; criteria: Criterion[]; context: string }) {
  assertCan(canManageCriteria(ctx.actor, kind), "Este gestor não gere os critérios deste tipo de ideia.");
  if (!criteria.length) throw new ServiceError("Precisa de pelo menos um critério.", 400);
  const sum = criteria.reduce((n, c) => n + Number(c.weight || 0), 0);
  if (Math.round(sum) !== 100) throw new ServiceError(`Os pesos têm de somar 100 % (agora somam ${sum} %).`, 400);
  if (criteria.some((c) => !c.name.trim() || !c.key.trim())) throw new ServiceError("Todos os critérios precisam de nome.", 400);
  const all = await ctx.repo.all("criteriaSets");
  const current = all.filter((c) => c.ideaKind === kind);
  for (const c of current.filter((x) => x.active)) await ctx.repo.update("criteriaSets", c.id, { active: false });
  const set: CriteriaSet = {
    id: uid("crit_"),
    ideaKind: kind,
    version: Math.max(0, ...current.map((c) => c.version)) + 1,
    criteria,
    context,
    active: true,
    createdAt: nowIso(ctx),
    createdById: me(ctx)?.id,
  };
  await ctx.repo.insert("criteriaSets", set);
  await audit(ctx, "criteria.save", "criteriaSet", set.id, { version: set.version - 1 }, { version: set.version });
  return set;
}

/** «Testar com uma ideia»: corre a análise sem a gravar. */
export async function testCriteria(ctx: Ctx, { kind, criteria, context, ideaId }: { kind: CriteriaSet["ideaKind"]; criteria: Criterion[]; context: string; ideaId: string }) {
  assertCan(canManageCriteria(ctx.actor, kind));
  const idea = await ctx.repo.get("ideas", ideaId);
  if (!idea) throw notFound("Ideia");
  const set: CriteriaSet = { id: "teste", ideaKind: kind, version: 0, criteria, context, active: false, createdAt: nowIso(ctx) };
  const others = await ctx.repo.all("ideas");
  return analyze(buildAiInput(idea, set, others), idea.id, nowIso(ctx), getProvider());
}

// ------------------------------------------------------------- P35 Comunicação

export async function communicationInbox(ctx: Ctx) {
  assertCan(canViewTriage(ctx.actor));
  const area = managerArea(roleOf(ctx.actor));
  const ideas = (await ctx.repo.all("ideas")).filter((i) => i.area === area);
  const msgs = await ctx.repo.all("messages");
  const analyses = await ctx.repo.all("aiAnalyses");
  const users = new Map((await ctx.repo.all("users")).map((u) => [u.id, u.name]));
  const threads = ideas
    .map((i) => {
      const thread = msgs.filter((m) => m.ideaId === i.id).sort((a, b) => a.at.localeCompare(b.at));
      const ai = analyses.filter((a) => a.ideaId === i.id && a.status === "CONCLUIDA").sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
      return {
        ideaId: i.id,
        number: i.number,
        title: i.title,
        status: i.status,
        creator: i.authorId ? users.get(i.authorId) ?? "Criador" : "Anónimo",
        messages: thread.map((m) => ({ ...m, authorName: m.fromTeam ? users.get(m.authorId ?? "") ?? "Equipa" : "Criador" })),
        awaitingReply: thread.at(-1) ? !thread.at(-1)!.fromTeam : false,
        aiDraft: ai?.feedbackDraft ?? "",
      };
    })
    .filter((t) => t.messages.length || t.aiDraft)
    .sort((a, b) => (b.messages.at(-1)?.at ?? "").localeCompare(a.messages.at(-1)?.at ?? ""));
  const sent = msgs.filter((m) => m.fromTeam && ideas.some((i) => i.id === m.ideaId)).sort((a, b) => b.at.localeCompare(a.at));
  return { threads, templates: await ctx.repo.all("responseTemplates"), sent: sent.map((m) => ({ ...m, number: ideas.find((i) => i.id === m.ideaId)?.number, by: users.get(m.validatedById ?? "") })) };
}

export async function saveTemplate(ctx: Ctx, { key, title, body }: { key: string; title: string; body: string }) {
  assertCan(canViewTriage(ctx.actor));
  const existing = (await ctx.repo.all("responseTemplates")).find((t) => t.key === key);
  if (existing) await ctx.repo.update("responseTemplates", key, { title, body });
  else await ctx.repo.insert("responseTemplates", { key, title, body });
  await audit(ctx, "template.save", "template", key);
}

// ------------------------------------------------------------- P36 Utilizadores e configurações

export async function listUsers(ctx: Ctx) {
  assertCan(canManageUsers(ctx.actor));
  return (await ctx.repo.all("users")).map(({ passwordHash: _p, ...u }) => u);
}

export async function setUserRole(ctx: Ctx, { userId, role }: { userId: string; role: Role }) {
  assertCan(canManageUsers(ctx.actor));
  const u = await ctx.repo.get("users", userId);
  if (!u) throw notFound("Utilizador");
  if (u.authProvider !== "MICROSOFT" && role !== "EXTERNO") throw new ServiceError("Só colaboradores com conta Microsoft podem ter perfis internos.", 400);
  if (u.authProvider === "MICROSOFT" && role === "EXTERNO") throw new ServiceError("Um colaborador não pode ter perfil externo.", 400);
  if (u.id === me(ctx)?.id) throw new ServiceError("Não pode mudar o seu próprio perfil.", 400);
  await ctx.repo.update("users", userId, { role });
  await audit(ctx, "user.role", "user", userId, { role: u.role }, { role });
}

export async function setUserStatus(ctx: Ctx, { userId, status }: { userId: string; status: "ACTIVO" | "DESACTIVADO" }) {
  assertCan(canManageUsers(ctx.actor));
  const u = await ctx.repo.get("users", userId);
  if (!u) throw notFound("Utilizador");
  if (u.role !== "EXTERNO") throw new ServiceError("Só contas externas podem ser desactivadas aqui.", 400);
  await ctx.repo.update("users", userId, { status });
  await audit(ctx, "user.status", "user", userId, { status: u.status }, { status });
}

export async function getSettings(ctx: Ctx) {
  assertCan(canManageUsers(ctx.actor) || roleOf(ctx.actor) === "COMISSAO_EXECUTIVA");
  return ctx.repo.settings();
}

export async function getPublicSettings(ctx: Ctx) {
  const s = await ctx.repo.settings();
  return { responseDeadlineDays: s.responseDeadlineDays, fastTrackWeeklyQuota: s.fastTrackWeeklyQuota, sectors: s.sectors, tisAreas: s.tisAreas, themes: s.themes, termsVersion: s.termsVersion, privacyVersion: s.privacyVersion, retentionMonths: s.retentionMonths, anonymousRevealEnabled: s.anonymousRevealEnabled };
}

export async function saveSettings(ctx: Ctx, patch: Partial<Settings>) {
  assertCan(canManageUsers(ctx.actor));
  const before = await ctx.repo.settings();
  if (patch.responseDeadlineDays !== undefined && (patch.responseDeadlineDays < 1 || patch.responseDeadlineDays > 60)) throw new ServiceError("O prazo tem de estar entre 1 e 60 dias úteis.", 400);
  // Objectivos O1–O6 são do gestor do Lab; os valores financeiros, do gestor da Incubadora.
  if (patch.okrs && roleOf(ctx.actor) !== "GESTOR_LAB") throw new ServiceError("Os objectivos O1 a O6 são introduzidos pelo gestor do Lab.", 403);
  if (patch.incubationFinancials && roleOf(ctx.actor) !== "GESTOR_INCUBADORA") throw new ServiceError("Os valores financeiros são introduzidos pelo gestor da Incubadora.", 403);
  const after = await ctx.repo.saveSettings(patch);
  const changed = Object.keys(patch);
  await audit(ctx, "settings.save", "settings", undefined, Object.fromEntries(changed.map((k) => [k, before[k as keyof Settings]])), patch);
  return after;
}

export async function listAudit(ctx: Ctx) {
  assertCan(canManageUsers(ctx.actor));
  const users = new Map((await ctx.repo.all("users")).map((u) => [u.id, u.name]));
  return (await ctx.repo.all("auditLogs"))
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 300)
    .map((a) => ({ ...a, userName: a.userId ? users.get(a.userId) ?? "—" : "Sistema" }));
}

export async function listOutbox(ctx: Ctx) {
  assertCan(canManageUsers(ctx.actor));
  return (await ctx.repo.all("outbox")).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 100);
}

// ------------------------------------------------------------- P27 Pedidos de apoio

function weekStart(d: Date) {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}

export async function supportOverview(ctx: Ctx) {
  const r = roleOf(ctx.actor);
  assertCan(r === "COLABORADOR" || canViewAllSupportRequests(ctx.actor));
  const user = requireUser(ctx);
  const s = await ctx.repo.settings();
  const all = await ctx.repo.all("supportRequests");
  const ws = weekStart(ctx.now()).toISOString();
  const acceptedThisWeek = all.filter((x) => x.urgent && x.acceptedAt && x.acceptedAt >= ws).length;
  const users = new Map((await ctx.repo.all("users")).map((u) => [u.id, u.name]));
  return {
    quota: s.fastTrackWeeklyQuota,
    acceptedThisWeek,
    mine: all.filter((x) => x.requestedById === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    all: canViewAllSupportRequests(ctx.actor) ? all.map((x) => ({ ...x, requester: users.get(x.requestedById) })).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : [],
    canManage: canManageSupportRequests(ctx.actor),
    canSubmit: canSubmitSupportRequest(ctx.actor),
  };
}

export async function createSupportRequest(ctx: Ctx, input: F3Input) {
  assertCan(canSubmitSupportRequest(ctx.actor));
  const user = requireUser(ctx);
  const v = F3Schema.parse(input);
  const req: SupportRequest = {
    id: uid("sup_"),
    type: v.type,
    proposal: v.proposal,
    costCenter: v.costCenter,
    description: v.description,
    dueDate: v.dueDate,
    urgent: v.urgent,
    status: "RECEBIDO",
    requestedById: user.id,
    createdAt: nowIso(ctx),
  };
  await ctx.repo.insert("supportRequests", req);
  await notifyAreaManagers(ctx, "LAB", `Novo pedido de apoio: ${v.proposal}`, `${v.type}${v.urgent ? " · via rápida" : ""}`, "/apoio");
  return req;
}

export async function setSupportStatus(ctx: Ctx, { id, status }: { id: string; status: SupportRequest["status"] }) {
  assertCan(canManageSupportRequests(ctx.actor));
  const r = await ctx.repo.get("supportRequests", id);
  if (!r) throw notFound("Pedido");
  if (status === "ACEITE" && r.urgent) {
    const o = await supportOverview(ctx);
    if (o.acceptedThisWeek >= o.quota) throw new ServiceError(`A quota semanal da via rápida (${o.quota}) já foi atingida.`, 409);
  }
  await ctx.repo.update("supportRequests", id, { status, acceptedAt: status === "ACEITE" ? nowIso(ctx) : r.acceptedAt });
  await audit(ctx, "support.status", "supportRequest", id, { status: r.status }, { status });
  await notify(ctx, { userId: r.requestedById, title: "O seu pedido de apoio mudou de estado", body: `${r.proposal}: ${status}`, href: "/apoio" });
}
