import type { Actor, AuditLog, Idea, Notification, OutboxItem, StatusChange, User } from "@/lib/domain/types";
import type { Repo } from "@/lib/data/repo";
import { lookupRef, open } from "@/lib/crypto";
import { userOf } from "@/lib/permissions";

export type JobName = "ai.analyze" | "notify.deadlines";
export interface JobRunner {
  enqueue(name: JobName, payload: Record<string, unknown>): void | Promise<void>;
}

export interface Ctx {
  actor: Actor;
  repo: Repo;
  now: () => Date;
  jobs: JobRunner;
  /** Verificação do captcha (Turnstile no modo completo; na demonstração, a caixa de verificação). */
  verifyCaptcha: (token: string | undefined) => Promise<boolean>;
  /** Limite de pedidos por minuto (true = permitido). */
  rateLimit: (key: string, perMinute: number) => boolean;
}

export class ServiceError extends Error {
  constructor(message: string, public status = 400, public code?: string) {
    super(message);
    this.name = "ServiceError";
  }
}
export const notFound = (what = "Registo") => new ServiceError(`${what} não encontrado.`, 404, "NOT_FOUND");

let seq = 0;
export const uid = (prefix = "") =>
  `${prefix}${Date.now().toString(36)}${(seq++).toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export const nowIso = (ctx: Ctx) => ctx.now().toISOString();
export const me = (ctx: Ctx): User | null => userOf(ctx.actor);
export function requireUser(ctx: Ctx): User {
  const u = me(ctx);
  if (!u) throw new ServiceError("Precisa de entrar para continuar.", 401, "UNAUTHENTICATED");
  return u;
}

export async function audit(ctx: Ctx, action: string, entity: string, entityId?: string, before?: unknown, after?: unknown) {
  const entry: AuditLog = { id: uid("aud_"), userId: me(ctx)?.id ?? null, action, entity, entityId, before, after, at: nowIso(ctx) };
  await ctx.repo.insert("auditLogs", entry);
}

export async function recordStatus(ctx: Ctx, entity: StatusChange["entity"], entityId: string, from: string | null, to: string, note?: string, system = false) {
  await ctx.repo.insert("statusHistory", {
    id: uid("st_"),
    entity,
    entityId,
    from,
    to,
    byId: system ? null : me(ctx)?.id ?? null,
    note,
    at: nowIso(ctx),
  });
}

/**
 * Descobre quem é o criador de uma ideia, só para o sistema o notificar.
 * O resultado nunca é devolvido à interface nem escrito em registos.
 */
export async function resolveCreator(ctx: Ctx, idea: Idea): Promise<{ userId?: string; email?: string }> {
  if (idea.authorId) return { userId: idea.authorId };
  const auth = (await ctx.repo.all("anonAuthorships")).find((a) => a.ideaId === idea.id);
  if (!auth) return {};
  const userId = auth.userRefEnc ? open(auth.userRefEnc) ?? undefined : undefined;
  const email = auth.notifyEmailEnc ? open(auth.notifyEmailEnc) ?? undefined : undefined;
  return { userId, email };
}

/** É o autor (incluindo autoria anónima de colaborador, verificada por referência não reversível)? */
export async function isIdeaOwner(ctx: Ctx, idea: Idea): Promise<boolean> {
  const u = me(ctx);
  if (!u) return false;
  if (idea.authorId === u.id) return true;
  if (idea.origin !== "ANONIMA_COLABORADOR") return false;
  const ref = lookupRef(u.id);
  return (await ctx.repo.all("anonAuthorships")).some((a) => a.ideaId === idea.id && (a as { userLookup?: string }).userLookup === ref);
}

// ------------------------------------------------------------ Notificações

interface NotifyInput {
  userId?: string;
  email?: string;
  title: string;
  body: string;
  href?: string;
  teams?: boolean;
}

/** Notificação na plataforma, por email e no Teams (P12). Tudo sai pela caixa de saída (fila). */
export async function notify(ctx: Ctx, n: NotifyInput) {
  const at = nowIso(ctx);
  let user: User | undefined;
  if (n.userId) {
    user = await ctx.repo.get("users", n.userId);
    if (user) {
      const channels: Notification["channels"] = ["APP"];
      const wantsEmail = user.notifyPrefs?.email ?? true;
      if (wantsEmail) channels.push("EMAIL");
      const internal = user.authProvider === "MICROSOFT";
      if (internal && n.teams !== false && (user.notifyPrefs?.teams ?? true)) channels.push("TEAMS");
      await ctx.repo.insert("notifications", { id: uid("ntf_"), userId: user.id, title: n.title, body: n.body, href: n.href, channels, at });
      if (wantsEmail) await outbox(ctx, { channel: "EMAIL", to: user.email, subject: n.title, body: n.body });
      if (channels.includes("TEAMS")) await outbox(ctx, { channel: "TEAMS", to: user.email, subject: n.title, body: n.body });
    }
  }
  if (!user && n.email) await outbox(ctx, { channel: "EMAIL", to: n.email, subject: n.title, body: n.body });
}

export async function outbox(ctx: Ctx, item: Omit<OutboxItem, "id" | "status" | "at">) {
  await ctx.repo.insert("outbox", { id: uid("out_"), status: "PENDENTE", at: nowIso(ctx), ...item });
}

export async function notifyAreaManagers(ctx: Ctx, area: "LAB" | "INCUBADORA", title: string, body: string, href?: string) {
  const role = area === "LAB" ? "GESTOR_LAB" : "GESTOR_INCUBADORA";
  const managers = (await ctx.repo.all("users")).filter((u) => u.role === role && u.status === "ACTIVO");
  for (const m of managers) await notify(ctx, { userId: m.id, title, body, href });
}
