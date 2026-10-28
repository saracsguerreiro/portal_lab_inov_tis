// Ideias: submissão, conta do criador, consulta por código, ideias internas e triagem.
import type { AiAnalysis, Area, Decision, Idea, IdeaStatus, Message, Project, StatusChange } from "@/lib/domain/types";
import { F1Schema, F2Schema, type F1Input, type F2Input } from "@/lib/validation/forms";
import { generateTrackingCode, hashTrackingCode, lookupRef, normalizeCode, seal } from "@/lib/crypto";
import {
  assertCan,
  canManageIdea,
  canModerateComments,
  canReactToIdea,
  canSubmitExternalIdea,
  canSubmitImprovementIdea,
  canViewAiScore,
  canViewIdea,
  canViewTriage,
  isCollaboratorIdea,
  managerArea,
  roleOf,
} from "@/lib/permissions";
import { assertTransition, addBusinessDays, businessDaysBetween, canTransition, MAIN_FLOW } from "@/lib/domain/workflow";
import {
  audit,
  type Ctx,
  isIdeaOwner,
  me,
  notFound,
  notify,
  notifyAreaManagers,
  nowIso,
  recordStatus,
  requireUser,
  resolveCreator,
  ServiceError,
  uid,
} from "./context";

// ------------------------------------------------------------- Vistas seguras

/** Vista do criador: nunca inclui análise nem pontuação da IA, nem notas internas. */
export interface CreatorIdeaView {
  idea: Omit<Idea, "managerScore" | "assigneeId" | "similarConfirmed" | "authorId">;
  isAnonymous: boolean;
  timeline: { status: string; at: string; current: boolean; done: boolean }[];
  history: Pick<StatusChange, "from" | "to" | "at">[];
  messages: (Pick<Message, "id" | "kind" | "text" | "attachments" | "at" | "fromTeam">)[];
  openInfoRequest: Pick<Message, "id" | "text" | "at"> | null;
  project: Pick<Project, "id" | "slug" | "name" | "stage" | "area"> | null;
  canEdit: boolean;
  canWithdraw: boolean;
  canReveal: boolean;
  deadline: string;
}

function stripForCreator(idea: Idea): CreatorIdeaView["idea"] {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { managerScore, assigneeId, similarConfirmed, authorId, ...rest } = idea;
  return rest;
}

async function buildCreatorView(ctx: Ctx, idea: Idea, viaCode: boolean): Promise<CreatorIdeaView> {
  const settings = await ctx.repo.settings();
  const hist = (await ctx.repo.all("statusHistory"))
    .filter((h) => h.entity === "IDEA" && h.entityId === idea.id)
    .sort((a, b) => a.at.localeCompare(b.at));
  const msgs = (await ctx.repo.all("messages"))
    .filter((m) => m.ideaId === idea.id && (!m.fromTeam || m.validatedById))
    .sort((a, b) => a.at.localeCompare(b.at));
  const lastInfo = [...msgs].reverse().find((m) => m.kind === "PEDIDO_INFO");
  const answered = lastInfo && msgs.some((m) => m.kind === "RESPOSTA" && m.at > lastInfo.at);
  const project = idea.projectId ? await ctx.repo.get("projects", idea.projectId) : undefined;
  const reached = new Set(hist.map((h) => h.to));
  const currentIdx = MAIN_FLOW.indexOf(idea.status);
  const timeline = MAIN_FLOW.filter((s) => s !== "INFO_PEDIDA" || reached.has("INFO_PEDIDA") || idea.status === "INFO_PEDIDA").map((s) => ({
    status: s,
    at: [...hist].reverse().find((h) => h.to === s)?.at ?? "",
    current: s === idea.status,
    done: reached.has(s) || (currentIdx >= 0 && MAIN_FLOW.indexOf(s) < currentIdx),
  }));
  const isAnon = idea.origin === "ANONIMA_COLABORADOR" || idea.origin === "ANONIMA_EXTERNA";
  const auth = isAnon ? (await ctx.repo.all("anonAuthorships")).find((a) => a.ideaId === idea.id) : undefined;
  return {
    idea: stripForCreator(idea),
    isAnonymous: isAnon && !auth?.revealedAt,
    timeline,
    history: hist.map(({ from, to, at }) => ({ from, to, at })),
    messages: msgs.map(({ id, kind, text, attachments, at, fromTeam }) => ({ id, kind, text, attachments, at, fromTeam })),
    openInfoRequest: idea.status === "INFO_PEDIDA" && lastInfo && !answered ? { id: lastInfo.id, text: lastInfo.text, at: lastInfo.at } : null,
    project: project ? { id: project.id, slug: project.slug, name: project.name, stage: project.stage, area: project.area } : null,
    canEdit: !viaCode && idea.status === "RECEBIDA",
    canWithdraw: canTransition("creator", idea.status, "RETIRADA"),
    canReveal: !viaCode && idea.origin === "ANONIMA_COLABORADOR" && !auth?.revealedAt && settings.anonymousRevealEnabled,
    deadline: addBusinessDays(new Date(idea.createdAt), settings.responseDeadlineDays).toISOString(),
  };
}

// ------------------------------------------------------------- Submissão

async function nextNumber(ctx: Ctx) {
  const year = ctx.now().getFullYear();
  const n = (await ctx.repo.all("ideas")).filter((i) => i.number.includes(`-${year}-`)).length + 1;
  return `ID-${year}-${String(n).padStart(4, "0")}`;
}

async function createIdea(ctx: Ctx, base: Omit<Idea, "id" | "number" | "createdAt" | "updatedAt" | "status">) {
  const at = nowIso(ctx);
  const idea: Idea = { ...base, id: uid("idea_"), number: await nextNumber(ctx), status: "RECEBIDA", createdAt: at, updatedAt: at };
  await ctx.repo.insert("ideas", idea);
  await recordStatus(ctx, "IDEA", idea.id, null, "RECEBIDA", undefined, true);
  await ctx.repo.insert("aiAnalyses", {
    id: uid("ai_"),
    ideaId: idea.id,
    criteriaSetId: "",
    criteriaVersion: 0,
    status: "PENDENTE",
    scores: [],
    total: 0,
    similar: [],
    risks: [],
    completeness: { weakFields: [], questions: [] },
    summary: "",
    feedbackDraft: "",
    createdAt: at,
  });
  // A submissão nunca espera pela IA (regra 5): a análise vai para a fila.
  await ctx.jobs.enqueue("ai.analyze", { ideaId: idea.id });
  await notifyAreaManagers(ctx, idea.area, `Nova ideia na fila: ${idea.number}`, idea.title, `/gestao/triagem?ideia=${idea.id}`);
  return idea;
}

export interface SubmitResult {
  ideaId: string | null;
  number: string;
  trackingCode?: string;
}

/** F1 — ideia externa (P13). Funciona sem login (anónimo), com conta externa ou com login Microsoft. */
export async function submitExternalIdea(ctx: Ctx, input: F1Input): Promise<SubmitResult> {
  assertCan(canSubmitExternalIdea(ctx.actor), "Os gestores e a Comissão Executiva não submetem ideias.");
  const data = F1Schema.parse(input);
  const user = me(ctx);
  const anonymous = !user || data.submitAs === "ANONIMO";
  if (!user) {
    if (!ctx.rateLimit("submit:anon", 5)) throw new ServiceError("Demasiados pedidos. Espere um minuto.", 429);
    if (!(await ctx.verifyCaptcha(data.captchaToken))) throw new ServiceError("Confirme a verificação anti-robot.", 400, "CAPTCHA");
  }
  if (user?.role === "EXTERNO" && !user.emailVerifiedAt) throw new ServiceError("Confirme o seu email antes de submeter ideias.", 403);
  const isCollab = user?.role === "COLABORADOR";
  const settings = await ctx.repo.settings();
  const answers: Record<string, unknown> = { ...data };
  delete answers.captchaToken;
  delete answers.acceptTerms;
  delete answers.acceptPrivacy;
  delete answers.confirmNoThirdParty;
  delete answers.notifyEmail; // nunca fica nas respostas: vai cifrado para a autoria anónima
  if (anonymous) delete answers.organization;

  const origin: Idea["origin"] = anonymous ? (isCollab ? "ANONIMA_COLABORADOR" : "ANONIMA_EXTERNA") : isCollab ? "COLABORADOR" : "EXTERNA";
  const type: Idea["type"] = isCollab ? "NEGOCIO_COLABORADOR" : "EXTERNA";
  // P6: ideias de negócio de colaboradores entram primeiro na triagem do Lab.
  const area: Area = isCollab ? "LAB" : "INCUBADORA";
  const idea = await createIdea(ctx, {
    type,
    origin,
    authorId: anonymous ? null : user!.id,
    title: data.title,
    summary: data.summary,
    answers,
    area,
    challengeId: data.challengeId || null,
    termsVersion: settings.termsVersion,
    theme: data.sector,
  });

  let trackingCode: string | undefined;
  if (anonymous) {
    if (!user) trackingCode = generateTrackingCode();
    await ctx.repo.insert("anonAuthorships", {
      id: uid("anon_"),
      ideaId: idea.id,
      userRefEnc: user ? seal(user.id) : null,
      userLookup: user ? lookupRef(user.id) : null,
      codeHash: trackingCode ? hashTrackingCode(trackingCode) : null,
      notifyEmailEnc: !user && data.notifyEmail ? seal(data.notifyEmail) : null,
    });
  }
  for (const doc of ["TERMOS", "PRIVACIDADE"] as const) {
    await ctx.repo.insert("consents", {
      id: uid("cns_"),
      userId: anonymous ? null : user?.id ?? null,
      ideaId: idea.id,
      document: doc,
      version: doc === "TERMOS" ? settings.termsVersion : settings.privacyVersion,
      at: nowIso(ctx),
    });
  }
  const confirm = `A sua ideia ${idea.number} foi recebida. Primeiro retorno em até ${settings.responseDeadlineDays} dias úteis.${trackingCode ? ` Código de acompanhamento: ${trackingCode}` : ""}`;
  if (anonymous && !user && data.notifyEmail) await notify(ctx, { email: data.notifyEmail, title: "Recebemos a sua ideia", body: confirm });
  else if (user) await notify(ctx, { userId: user.id, title: "Recebemos a sua ideia", body: confirm, href: `/conta/ideias/${idea.id}` });
  return { ideaId: user ? idea.id : null, number: idea.number, trackingCode };
}

/** F2 — ideia de melhoria (P24). Só colaboradores. */
export async function submitImprovementIdea(ctx: Ctx, input: F2Input): Promise<SubmitResult> {
  assertCan(canSubmitImprovementIdea(ctx.actor), "Só colaboradores TIS podem submeter ideias de melhoria.");
  const user = requireUser(ctx);
  const data = F2Schema.parse(input);
  if (data.kind !== "MELHORIA") throw new ServiceError("Ideias de negócio usam o formulário externo.", 400);
  const settings = await ctx.repo.settings();
  const answers: Record<string, unknown> = { ...data };
  delete answers.confirmNoClientData;
  delete answers.anonymous;
  delete answers.kind;
  const idea = await createIdea(ctx, {
    type: "MELHORIA",
    origin: data.anonymous ? "ANONIMA_COLABORADOR" : "COLABORADOR",
    authorId: data.anonymous ? null : user.id,
    title: data.title,
    summary: data.proposal.slice(0, 200),
    answers,
    area: "LAB",
    affectedArea: data.affectedArea,
    theme: data.category,
    termsVersion: settings.termsVersion,
  });
  if (data.anonymous) {
    await ctx.repo.insert("anonAuthorships", {
      id: uid("anon_"),
      ideaId: idea.id,
      userRefEnc: seal(user.id),
      userLookup: lookupRef(user.id),
      codeHash: null,
      notifyEmailEnc: null,
    });
  }
  await notify(ctx, { userId: user.id, title: "Recebemos a sua ideia", body: `A ideia ${idea.number} foi recebida.`, href: `/conta/ideias/${idea.id}` });
  return { ideaId: idea.id, number: idea.number };
}

// ------------------------------------------------------------- Conta do criador (P20–P22)

export interface MyIdeaCard {
  id: string;
  number: string;
  title: string;
  type: Idea["type"];
  status: IdeaStatus;
  decision?: Decision | null;
  createdAt: string;
  updatedAt: string;
  anonymous: boolean;
  actionNeeded: boolean;
  unread: number;
}

async function myIdeasRaw(ctx: Ctx): Promise<Idea[]> {
  const user = requireUser(ctx);
  const ref = lookupRef(user.id);
  const anonIds = new Set((await ctx.repo.all("anonAuthorships")).filter((a) => a.userLookup === ref).map((a) => a.ideaId));
  return (await ctx.repo.all("ideas")).filter((i) => i.authorId === user.id || anonIds.has(i.id));
}

export async function listMyIdeas(ctx: Ctx): Promise<MyIdeaCard[]> {
  const ideas = await myIdeasRaw(ctx);
  const msgs = await ctx.repo.all("messages");
  return ideas
    .map((i) => ({
      id: i.id,
      number: i.number,
      title: i.title,
      type: i.type,
      status: i.status,
      decision: i.decision,
      createdAt: i.createdAt,
      updatedAt: i.updatedAt,
      anonymous: i.origin.startsWith("ANONIMA"),
      actionNeeded: i.status === "INFO_PEDIDA",
      unread: msgs.filter((m) => m.ideaId === i.id && m.fromTeam && m.validatedById && !m.readAt).length,
    }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

async function ownedIdea(ctx: Ctx, id: string) {
  const idea = await ctx.repo.get("ideas", id);
  if (!idea) throw notFound("Ideia");
  assertCan(await isIdeaOwner(ctx, idea), "Esta ideia não é sua.");
  return idea;
}

export async function getMyIdea(ctx: Ctx, { id }: { id: string }): Promise<CreatorIdeaView> {
  const idea = await ownedIdea(ctx, id);
  for (const m of (await ctx.repo.all("messages")).filter((m) => m.ideaId === id && m.fromTeam && !m.readAt && m.validatedById))
    await ctx.repo.update("messages", m.id, { readAt: nowIso(ctx) });
  return buildCreatorView(ctx, idea, false);
}

export async function editMyIdea(ctx: Ctx, { id, title, summary }: { id: string; title: string; summary: string }) {
  const idea = await ownedIdea(ctx, id);
  if (idea.status !== "RECEBIDA") throw new ServiceError("Só pode editar enquanto o estado for «Recebida».", 409);
  await ctx.repo.update("ideas", id, { title: title.slice(0, 80), summary: summary.slice(0, 200), updatedAt: nowIso(ctx) });
  await ctx.jobs.enqueue("ai.analyze", { ideaId: id });
}

export async function withdrawMyIdea(ctx: Ctx, { id }: { id: string }) {
  const idea = await ownedIdea(ctx, id);
  assertTransition("creator", idea.status, "RETIRADA");
  await ctx.repo.update("ideas", id, { status: "RETIRADA", updatedAt: nowIso(ctx) });
  await recordStatus(ctx, "IDEA", id, idea.status, "RETIRADA", "Retirada pelo criador");
}

export async function requestDeleteMyIdea(ctx: Ctx, { id }: { id: string }) {
  const idea = await ownedIdea(ctx, id);
  await ctx.repo.update("ideas", id, { deleteRequestedAt: nowIso(ctx) });
  await notifyAreaManagers(ctx, idea.area, `Pedido para apagar ${idea.number}`, "O criador pediu para apagar a ideia. Confirme em Triagem.");
}

/** P5 [a confirmar]: um colaborador anónimo pode revelar a autoria. */
export async function revealAuthorship(ctx: Ctx, { id }: { id: string }) {
  const user = requireUser(ctx);
  const idea = await ownedIdea(ctx, id);
  if (idea.origin !== "ANONIMA_COLABORADOR") throw new ServiceError("Só ideias anónimas de colaboradores.", 400);
  if (!(await ctx.repo.settings()).anonymousRevealEnabled) throw new ServiceError("A revelação de autoria está desactivada.", 403);
  const auth = (await ctx.repo.all("anonAuthorships")).find((a) => a.ideaId === id);
  if (auth) await ctx.repo.update("anonAuthorships", auth.id, { revealedAt: nowIso(ctx) });
  await ctx.repo.update("ideas", id, { authorId: user.id, origin: "COLABORADOR", updatedAt: nowIso(ctx) });
  await audit(ctx, "idea.reveal_authorship", "idea", id);
}

/** Associar uma ideia anónima externa a uma conta com o código de acompanhamento. */
export async function linkAnonymousIdea(ctx: Ctx, { code }: { code: string }) {
  const user = requireUser(ctx);
  if (!ctx.rateLimit(`link:${user.id}`, 5)) throw new ServiceError("Demasiados pedidos. Espere um minuto.", 429);
  const hash = hashTrackingCode(code);
  const auth = (await ctx.repo.all("anonAuthorships")).find((a) => a.codeHash === hash);
  if (!auth) throw new ServiceError("Código não encontrado.", 404);
  const idea = await ctx.repo.get("ideas", auth.ideaId);
  if (!idea) throw notFound("Ideia");
  await ctx.repo.update("anonAuthorships", auth.id, { userLookup: lookupRef(user.id), userRefEnc: seal(user.id) });
  return { id: idea.id, number: idea.number };
}

export async function sendCreatorMessage(ctx: Ctx, { ideaId, text, attachments = [] }: { ideaId: string; text: string; attachments?: Message["attachments"] }) {
  const idea = await ownedIdea(ctx, ideaId);
  if (!text.trim()) throw new ServiceError("Escreva uma mensagem.", 400);
  const answering = idea.status === "INFO_PEDIDA";
  await ctx.repo.insert("messages", {
    id: uid("msg_"),
    ideaId,
    authorId: null, // o autor do lado do criador nunca é exposto à equipa em ideias anónimas
    fromTeam: false,
    kind: answering ? "RESPOSTA" : "MENSAGEM",
    text: text.trim(),
    attachments,
    at: nowIso(ctx),
  });
  if (answering) await answerInfo(ctx, idea);
  else await notifyResponsible(ctx, idea, `Nova mensagem em ${idea.number}`, text.slice(0, 140));
}

async function answerInfo(ctx: Ctx, idea: Idea) {
  assertTransition("system", "INFO_PEDIDA", "EM_ANALISE");
  await ctx.repo.update("ideas", idea.id, { status: "EM_ANALISE", updatedAt: nowIso(ctx) });
  await recordStatus(ctx, "IDEA", idea.id, "INFO_PEDIDA", "EM_ANALISE", "O criador respondeu ao pedido de informação", true);
  await notifyResponsible(ctx, idea, `O criador respondeu: ${idea.number}`, "Há uma resposta ao pedido de informação.");
}

async function notifyResponsible(ctx: Ctx, idea: Idea, title: string, body: string) {
  if (idea.assigneeId) await notify(ctx, { userId: idea.assigneeId, title, body, href: `/gestao/triagem?ideia=${idea.id}` });
  else await notifyAreaManagers(ctx, idea.area, title, body, `/gestao/triagem?ideia=${idea.id}`);
}

export async function listMyThreads(ctx: Ctx) {
  const ideas = await myIdeasRaw(ctx);
  const msgs = await ctx.repo.all("messages");
  return ideas
    .map((i) => {
      const thread = msgs.filter((m) => m.ideaId === i.id && (!m.fromTeam || m.validatedById)).sort((a, b) => a.at.localeCompare(b.at));
      return {
        ideaId: i.id,
        number: i.number,
        title: i.title,
        area: i.area,
        status: i.status,
        last: thread.at(-1) ? { text: thread.at(-1)!.text, at: thread.at(-1)!.at, fromTeam: thread.at(-1)!.fromTeam } : null,
        unread: thread.filter((m) => m.fromTeam && !m.readAt).length,
        messages: thread.map(({ id, kind, text, attachments, at, fromTeam }) => ({ id, kind, text, attachments, at, fromTeam })),
      };
    })
    .sort((a, b) => (b.last?.at ?? "").localeCompare(a.last?.at ?? ""));
}

// ------------------------------------------------------------- P15 Consultar estado

export async function getStatusByCode(ctx: Ctx, { code, captchaToken }: { code: string; captchaToken?: string }): Promise<CreatorIdeaView> {
  if (!ctx.rateLimit("status:code", 10)) throw new ServiceError("Demasiados pedidos. Espere um minuto e tente de novo.", 429);
  if (!(await ctx.verifyCaptcha(captchaToken))) throw new ServiceError("Confirme a verificação anti-robot.", 400, "CAPTCHA");
  const norm = normalizeCode(code);
  if (!/^ECO-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(norm)) throw new ServiceError("O código tem o formato ECO-XXXX-XXXX.", 400);
  const auth = (await ctx.repo.all("anonAuthorships")).find((a) => a.codeHash === hashTrackingCode(norm));
  const idea = auth && (await ctx.repo.get("ideas", auth.ideaId));
  if (!idea) throw new ServiceError("Não encontrámos nenhuma ideia com este código.", 404);
  return buildCreatorView(ctx, idea, true);
}

export async function answerByCode(ctx: Ctx, { code, text }: { code: string; text: string }) {
  if (!ctx.rateLimit("status:answer", 5)) throw new ServiceError("Demasiados pedidos.", 429);
  const auth = (await ctx.repo.all("anonAuthorships")).find((a) => a.codeHash === hashTrackingCode(code));
  const idea = auth && (await ctx.repo.get("ideas", auth.ideaId));
  if (!idea) throw new ServiceError("Código inválido.", 404);
  if (idea.status !== "INFO_PEDIDA") throw new ServiceError("Não há nenhum pedido de informação em aberto.", 409);
  await ctx.repo.insert("messages", { id: uid("msg_"), ideaId: idea.id, authorId: null, fromTeam: false, kind: "RESPOSTA", text: text.trim(), attachments: [], at: nowIso(ctx) });
  await answerInfo(ctx, idea);
}

// ------------------------------------------------------------- P25/P26 Ideias internas

export interface InternalIdeaCard {
  id: string;
  number: string;
  title: string;
  summary: string;
  affectedArea?: string;
  theme?: string;
  workLine?: string | null;
  authorName: string; // nome ou «Anónimo»
  status: IdeaStatus;
  decision?: Decision | null;
  supports: number;
  comments: number;
  supportedByMe: boolean;
  similarTo: { id: string; number: string; title: string }[];
  createdAt: string;
  projectId?: string | null;
}

async function authorLabel(ctx: Ctx, idea: Idea, users?: Map<string, string>) {
  if (!idea.authorId) return "Anónimo";
  if (users) return users.get(idea.authorId) ?? "Colaborador TIS";
  return (await ctx.repo.get("users", idea.authorId))?.name ?? "Colaborador TIS";
}

export async function listInternalIdeas(ctx: Ctx): Promise<InternalIdeaCard[]> {
  const r = roleOf(ctx.actor);
  assertCan(r === "COLABORADOR" || r === "GESTOR_LAB" || r === "GESTOR_INCUBADORA" || r === "COMISSAO_EXECUTIVA");
  const all = await ctx.repo.all("ideas");
  const visible = all.filter((i) => isCollaboratorIdea(i) && ["EM_AVALIACAO", "DECISAO"].includes(i.status) && canViewIdea(ctx.actor, i, false));
  const reactions = await ctx.repo.all("reactions");
  const users = new Map((await ctx.repo.all("users")).map((u) => [u.id, u.name]));
  const uidMe = me(ctx)?.id;
  const out: InternalIdeaCard[] = [];
  for (const i of visible) {
    const rs = reactions.filter((x) => x.ideaId === i.id && !x.hidden);
    out.push({
      id: i.id,
      number: i.number,
      title: i.title,
      summary: i.summary,
      affectedArea: i.affectedArea,
      theme: i.theme,
      workLine: i.workLine,
      authorName: await authorLabel(ctx, i, users),
      status: i.status,
      decision: i.decision,
      supports: rs.filter((x) => x.kind === "APOIO").length,
      comments: rs.filter((x) => x.kind === "COMENTARIO").length,
      supportedByMe: rs.some((x) => x.kind === "APOIO" && x.userId === uidMe),
      // «Ideia semelhante a»: sugerido pela IA e confirmado por um gestor
      similarTo: (i.similarConfirmed ?? [])
        .map((id) => all.find((o) => o.id === id))
        .filter((o): o is Idea => !!o && visible.some((v) => v.id === o.id))
        .map((o) => ({ id: o.id, number: o.number, title: o.title })),
      createdAt: i.createdAt,
      projectId: i.projectId,
    });
  }
  return out;
}

export async function getInternalIdea(ctx: Ctx, { id }: { id: string }) {
  const idea = await ctx.repo.get("ideas", id);
  if (!idea || !isCollaboratorIdea(idea)) throw notFound("Ideia");
  assertCan(canViewIdea(ctx.actor, idea, false) && ["EM_AVALIACAO", "DECISAO"].includes(idea.status), "Esta ideia ainda não está visível.");
  const reactions = (await ctx.repo.all("reactions")).filter((x) => x.ideaId === id);
  const users = new Map((await ctx.repo.all("users")).map((u) => [u.id, u.name]));
  const uidMe = me(ctx)?.id;
  const moderator = canModerateComments(ctx.actor);
  const a = idea.answers as Record<string, unknown>;
  return {
    id: idea.id,
    number: idea.number,
    title: idea.title,
    summary: idea.summary,
    problem: String(a.problem ?? ""),
    proposal: String(a.proposal ?? a.solution ?? ""),
    impact: (a.impact as string[] | undefined) ?? [],
    impactEstimate: String(a.impactEstimate ?? ""),
    affectedArea: idea.affectedArea,
    type: idea.type,
    status: idea.status,
    decision: idea.decision,
    authorName: await authorLabel(ctx, idea, users),
    projectId: idea.projectId,
    supports: reactions.filter((x) => x.kind === "APOIO").length,
    supportedByMe: reactions.some((x) => x.kind === "APOIO" && x.userId === uidMe),
    interestedByMe: reactions.some((x) => x.kind === "INTERESSE" && x.userId === uidMe),
    interested: reactions.filter((x) => x.kind === "INTERESSE").length,
    canReact: canReactToIdea(ctx.actor, idea),
    canModerate: moderator,
    comments: reactions
      .filter((x) => x.kind === "COMENTARIO" && (!x.hidden || moderator))
      .sort((a, b) => a.at.localeCompare(b.at))
      .map((c) => ({ id: c.id, parentId: c.parentId ?? null, text: c.text ?? "", at: c.at, hidden: !!c.hidden, author: users.get(c.userId) ?? "Colaborador" })),
  };
}

export async function toggleReaction(ctx: Ctx, { ideaId, kind }: { ideaId: string; kind: "APOIO" | "INTERESSE" }) {
  const user = requireUser(ctx);
  const idea = await ctx.repo.get("ideas", ideaId);
  if (!idea) throw notFound("Ideia");
  assertCan(canReactToIdea(ctx.actor, idea));
  const existing = (await ctx.repo.all("reactions")).find((x) => x.ideaId === ideaId && x.userId === user.id && x.kind === kind);
  if (existing) await ctx.repo.remove("reactions", existing.id);
  else await ctx.repo.insert("reactions", { id: uid("rx_"), ideaId, userId: user.id, kind, at: nowIso(ctx) });
  return { active: !existing };
}

export async function addComment(ctx: Ctx, { ideaId, text, parentId }: { ideaId: string; text: string; parentId?: string | null }) {
  const user = requireUser(ctx);
  const idea = await ctx.repo.get("ideas", ideaId);
  if (!idea) throw notFound("Ideia");
  assertCan(canReactToIdea(ctx.actor, idea));
  if (!text.trim()) throw new ServiceError("Escreva um comentário.", 400);
  await ctx.repo.insert("reactions", { id: uid("rx_"), ideaId, userId: user.id, kind: "COMENTARIO", text: text.trim().slice(0, 2000), parentId: parentId ?? null, at: nowIso(ctx) });
}

export async function moderateComment(ctx: Ctx, { id, hidden }: { id: string; hidden: boolean }) {
  assertCan(canModerateComments(ctx.actor));
  await ctx.repo.update("reactions", id, { hidden });
  await audit(ctx, hidden ? "comment.hide" : "comment.show", "reaction", id);
}

// ------------------------------------------------------------- P31 Triagem

export interface TriageRow {
  id: string;
  number: string;
  title: string;
  type: Idea["type"];
  origin: Idea["origin"];
  originLabel: "EXTERNA" | "COLABORADOR" | "ANONIMA";
  area: Area;
  createdAt: string;
  daysLeft: number;
  aiScore: number | null;
  aiStatus: AiAnalysis["status"] | null;
  routing?: string;
  status: IdeaStatus;
  decision?: Decision | null;
  assigneeId?: string | null;
  assigneeName?: string;
  canManage: boolean;
  hasRisk: boolean;
  deleteRequested: boolean;
}

export async function triageList(ctx: Ctx, { scope = "mine" }: { scope?: "mine" | "all" } = {}): Promise<TriageRow[]> {
  assertCan(canViewTriage(ctx.actor));
  const area = managerArea(roleOf(ctx.actor));
  const settings = await ctx.repo.settings();
  const ideas = await ctx.repo.all("ideas");
  const analyses = await ctx.repo.all("aiAnalyses");
  const users = new Map((await ctx.repo.all("users")).map((u) => [u.id, u.name]));
  const now = ctx.now();
  return ideas
    .filter((i) => scope === "all" || i.area === area)
    .map((i) => {
      const ai = latestAnalysis(analyses, i.id);
      const deadline = addBusinessDays(new Date(i.createdAt), settings.responseDeadlineDays);
      return {
        id: i.id,
        number: i.number,
        title: i.title,
        type: i.type,
        origin: i.origin,
        originLabel: i.origin.startsWith("ANONIMA") ? "ANONIMA" : i.origin === "COLABORADOR" ? "COLABORADOR" : "EXTERNA",
        area: i.area,
        createdAt: i.createdAt,
        daysLeft: i.firstResponseAt ? 999 : businessDaysBetween(now, deadline),
        aiScore: ai?.status === "CONCLUIDA" ? ai.total : null,
        aiStatus: ai?.status ?? null,
        routing: ai?.routing,
        status: i.status,
        decision: i.decision,
        assigneeId: i.assigneeId,
        assigneeName: i.assigneeId ? users.get(i.assigneeId) : undefined,
        canManage: canManageIdea(ctx.actor, i),
        hasRisk: !!ai?.risks.length,
        deleteRequested: !!i.deleteRequestedAt,
      } satisfies TriageRow;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

const latestAnalysis = (all: AiAnalysis[], ideaId: string) =>
  all.filter((a) => a.ideaId === ideaId).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

/** Ficha de triagem: submissão à esquerda, análise da IA à direita. Sem identidade de anónimos. */
export async function triageIdea(ctx: Ctx, { id }: { id: string }) {
  assertCan(canViewTriage(ctx.actor));
  const idea = await ctx.repo.get("ideas", id);
  if (!idea) throw notFound("Ideia");
  const analyses = (await ctx.repo.all("aiAnalyses")).filter((a) => a.ideaId === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const author = idea.authorId ? await ctx.repo.get("users", idea.authorId) : undefined;
  const msgs = (await ctx.repo.all("messages")).filter((m) => m.ideaId === id).sort((a, b) => a.at.localeCompare(b.at));
  const history = (await ctx.repo.all("statusHistory")).filter((h) => h.entity === "IDEA" && h.entityId === id).sort((a, b) => a.at.localeCompare(b.at));
  const assessments = (await ctx.repo.all("assessments")).filter((a) => a.ideaId === id);
  const managers = (await ctx.repo.all("users")).filter((u) => u.role === "GESTOR_LAB" || u.role === "GESTOR_INCUBADORA");
  const settings = await ctx.repo.settings();
  return {
    idea: { ...idea, authorId: undefined },
    author: author
      ? { name: author.name, email: author.email, department: author.department, external: author.external, role: author.role }
      : null, // anónimo: nada
    analysis: canViewAiScore(ctx.actor) ? analyses[0] ?? null : null,
    analysisHistory: analyses.slice(1).map((a) => ({ id: a.id, total: a.total, at: a.createdAt, version: a.criteriaVersion, status: a.status })),
    messages: msgs,
    history,
    assessments,
    managers: managers.map((m) => ({ id: m.id, name: m.name, role: m.role })),
    canManage: canManageIdea(ctx.actor, idea),
    deadline: addBusinessDays(new Date(idea.createdAt), settings.responseDeadlineDays).toISOString(),
    allowed: MANAGER_ALLOWED(idea),
    templates: (await ctx.repo.all("responseTemplates")),
  };
}

const MANAGER_ALLOWED = (idea: Idea) =>
  (["EM_ANALISE", "INFO_PEDIDA", "EM_AVALIACAO", "DECISAO", "DUPLICADA"] as IdeaStatus[]).filter((s) =>
    canTransition("manager", idea.status, s, idea.decision),
  );

async function managedIdea(ctx: Ctx, id: string) {
  const idea = await ctx.repo.get("ideas", id);
  if (!idea) throw notFound("Ideia");
  assertCan(canManageIdea(ctx.actor, idea), "Só o gestor da área responsável pode alterar esta ideia.");
  return idea;
}

async function setStatus(ctx: Ctx, idea: Idea, to: IdeaStatus, note?: string, patch: Partial<Idea> = {}) {
  assertTransition("manager", idea.status, to, idea.decision);
  const at = nowIso(ctx);
  const firstResponseAt = idea.firstResponseAt ?? (to !== "RECEBIDA" ? at : null);
  const updated = await ctx.repo.update("ideas", idea.id, { status: to, updatedAt: at, firstResponseAt, ...patch });
  await recordStatus(ctx, "IDEA", idea.id, idea.status, to, note);
  await audit(ctx, "idea.status", "idea", idea.id, { status: idea.status }, { status: to, ...patch });
  const creator = await resolveCreator(ctx, idea);
  const label = to === "DECISAO" && patch.decision ? `Decisão: ${patch.decision}` : to;
  if (creator.userId || creator.email)
    await notify(ctx, { ...creator, title: `A sua ideia ${idea.number} mudou de estado`, body: `Novo estado: ${label}.`, href: creator.userId ? `/conta/ideias/${idea.id}` : undefined });
  return updated;
}

export async function changeIdeaStatus(ctx: Ctx, { id, to, note }: { id: string; to: IdeaStatus; note?: string }) {
  const idea = await managedIdea(ctx, id);
  if (to === "DECISAO") throw new ServiceError("Use «Decidir» para registar a decisão.", 400);
  if (to === "INFO_PEDIDA") throw new ServiceError("Use «Pedir informação».", 400);
  if (idea.status === "DECISAO" && to === "EM_AVALIACAO") return setStatus(ctx, idea, to, note ?? "Reaberta da lista de espera", { decision: null });
  return setStatus(ctx, idea, to, note);
}

export async function assignIdea(ctx: Ctx, { id, assigneeId }: { id: string; assigneeId: string | null }) {
  const idea = await managedIdea(ctx, id);
  await ctx.repo.update("ideas", id, { assigneeId, updatedAt: nowIso(ctx) });
  await audit(ctx, "idea.assign", "idea", id, { assigneeId: idea.assigneeId }, { assigneeId });
  if (assigneeId) await notify(ctx, { userId: assigneeId, title: `Ideia atribuída: ${idea.number}`, body: idea.title, href: `/gestao/triagem?ideia=${id}` });
}

/** Mensagem da equipa: só chega ao criador depois de validada por um gestor. */
export async function sendTeamMessage(ctx: Ctx, { ideaId, text, kind = "FEEDBACK" }: { ideaId: string; text: string; kind?: "FEEDBACK" | "MENSAGEM" }) {
  const user = requireUser(ctx);
  const idea = await managedIdea(ctx, ideaId);
  if (!text.trim()) throw new ServiceError("Escreva a mensagem.", 400);
  await ctx.repo.insert("messages", { id: uid("msg_"), ideaId, authorId: user.id, fromTeam: true, kind, text: text.trim(), attachments: [], validatedById: user.id, at: nowIso(ctx) });
  if (!idea.firstResponseAt) await ctx.repo.update("ideas", ideaId, { firstResponseAt: nowIso(ctx) });
  await audit(ctx, "message.send", "idea", ideaId);
  const creator = await resolveCreator(ctx, idea);
  await notify(ctx, { ...creator, title: `Nova mensagem da equipa sobre ${idea.number}`, body: text.slice(0, 200), href: creator.userId ? `/conta/ideias/${ideaId}` : undefined });
}

export async function requestInfo(ctx: Ctx, { id, question }: { id: string; question: string }) {
  const user = requireUser(ctx);
  const idea = await managedIdea(ctx, id);
  if (!question.trim()) throw new ServiceError("Escreva a pergunta.", 400);
  await ctx.repo.insert("messages", { id: uid("msg_"), ideaId: id, authorId: user.id, fromTeam: true, kind: "PEDIDO_INFO", text: question.trim(), attachments: [], validatedById: user.id, at: nowIso(ctx) });
  await setStatus(ctx, idea, "INFO_PEDIDA", "Pedido de informação ao criador");
}

export async function routeIdea(ctx: Ctx, { id, to, reason }: { id: string; to: Area | "DIGITAL_OFFICE"; reason: string }) {
  const idea = await managedIdea(ctx, id);
  if (to === "DIGITAL_OFFICE") {
    return decideIdea(ctx, { id, decision: "ENCAMINHADA", reason: reason || "Encaminhada para o Digital Office.", nextStep: "O Digital Office entra em contacto.", feedback: "" });
  }
  if (to === idea.area) throw new ServiceError("A ideia já está nesta área.", 400);
  await ctx.repo.update("ideas", id, { area: to, assigneeId: null, updatedAt: nowIso(ctx) });
  await recordStatus(ctx, "IDEA", id, idea.status, idea.status, `Encaminhada para ${to === "LAB" ? "o Laboratório" : "a Incubadora"}: ${reason}`);
  await audit(ctx, "idea.route", "idea", id, { area: idea.area }, { area: to });
  await notifyAreaManagers(ctx, to, `Ideia encaminhada: ${idea.number}`, reason, `/gestao/triagem?ideia=${id}`);
}

export async function markDuplicate(ctx: Ctx, { id, ofId }: { id: string; ofId: string }) {
  const idea = await managedIdea(ctx, id);
  const main = await ctx.repo.get("ideas", ofId);
  if (!main || main.id === id) throw new ServiceError("Escolha a ideia principal.", 400);
  await setStatus(ctx, idea, "DUPLICADA", `Juntada a ${main.number}`, { duplicateOfId: ofId });
}

export async function confirmSimilar(ctx: Ctx, { id, similarId }: { id: string; similarId: string }) {
  const idea = await managedIdea(ctx, id);
  const list = new Set(idea.similarConfirmed ?? []);
  list.add(similarId);
  await ctx.repo.update("ideas", id, { similarConfirmed: [...list] });
  await audit(ctx, "idea.confirm_similar", "idea", id, undefined, { similarId });
}

export async function decideIdea(
  ctx: Ctx,
  { id, decision, reason, nextStep, feedback }: { id: string; decision: Decision; reason: string; nextStep: string; feedback: string },
) {
  const idea = await managedIdea(ctx, id);
  if (!reason.trim()) throw new ServiceError("Escreva o motivo da decisão.", 400);
  if (idea.status === "RECEBIDA") await setStatus(ctx, idea, "EM_ANALISE", "Triagem iniciada");
  const fresh = (await ctx.repo.get("ideas", id))!;
  await setStatus(ctx, fresh, "DECISAO", `Decisão: ${decision}`, { decision, decisionReason: reason.trim(), nextStep: nextStep.trim() });
  if (feedback.trim()) await sendTeamMessage(ctx, { ideaId: id, text: feedback });
}

export async function saveAssessment(ctx: Ctx, { id, scores, finalScore, notes }: { id: string; scores: Record<string, number>; finalScore: number; notes?: string }) {
  const user = requireUser(ctx);
  const idea = await managedIdea(ctx, id);
  if (finalScore < 0 || finalScore > 100) throw new ServiceError("A pontuação final vai de 0 a 100.", 400);
  const ai = latestAnalysis(await ctx.repo.all("aiAnalyses"), id);
  await ctx.repo.insert("assessments", { id: uid("as_"), ideaId: id, managerId: user.id, scores, finalScore, aiScore: ai?.total, notes, at: nowIso(ctx) });
  await ctx.repo.update("ideas", id, { managerScore: finalScore });
  // Fica registada a diferença face à IA (P31).
  await audit(ctx, "idea.assessment", "idea", idea.id, { aiScore: ai?.total ?? null }, { finalScore, diff: ai ? finalScore - ai.total : null });
}

export async function reanalyzeIdea(ctx: Ctx, { id }: { id: string }) {
  await managedIdea(ctx, id);
  await ctx.jobs.enqueue("ai.analyze", { ideaId: id });
  await audit(ctx, "idea.reanalyze", "idea", id);
}

/** Pedido do criador para apagar: o gestor confirma e a ideia é anonimizada. */
export async function confirmDeleteIdea(ctx: Ctx, { id }: { id: string }) {
  const idea = await managedIdea(ctx, id);
  if (!idea.deleteRequestedAt) throw new ServiceError("Não há pedido para apagar.", 400);
  await ctx.repo.update("ideas", id, { title: "Ideia apagada a pedido do criador", summary: "", answers: {}, authorId: null, status: "RETIRADA", updatedAt: nowIso(ctx) });
  for (const a of (await ctx.repo.all("anonAuthorships")).filter((x) => x.ideaId === id)) await ctx.repo.remove("anonAuthorships", a.id);
  await audit(ctx, "idea.delete_confirmed", "idea", id);
}
