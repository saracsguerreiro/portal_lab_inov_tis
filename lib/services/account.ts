// Contas: registo externo (F4), confirmação de email, entrada com bloqueio, perfil (P23),
// notificações e apagamento de conta.
import bcrypt from "bcryptjs";
import type { User } from "@/lib/domain/types";
import { F4Schema, type F4Input } from "@/lib/validation/forms";
import { sha256Hex } from "@/lib/crypto";
import { audit, type Ctx, me, nowIso, outbox, requireUser, ServiceError, uid } from "./context";

export const MAX_FAILED_LOGINS = 5;
export const LOCK_MINUTES = 15;

export async function registerExternal(ctx: Ctx, input: F4Input & { captchaToken?: string }) {
  const v = F4Schema.parse(input);
  if (!ctx.rateLimit("register", 5)) throw new ServiceError("Demasiados pedidos. Espere um minuto.", 429);
  if (!(await ctx.verifyCaptcha(input.captchaToken))) throw new ServiceError("Confirme a verificação anti-robot.", 400, "CAPTCHA");
  const email = v.email.toLowerCase();
  if ((await ctx.repo.all("users")).some((u) => u.email.toLowerCase() === email)) throw new ServiceError("Já existe uma conta com este email.", 409);
  const s = await ctx.repo.settings();
  const user: User = {
    id: uid("usr_"),
    name: v.name,
    email,
    role: "EXTERNO",
    authProvider: "EMAIL",
    status: "ACTIVO",
    emailVerifiedAt: null,
    createdAt: nowIso(ctx),
    external: { type: v.profileType },
    notifyPrefs: { email: true, teams: false, challenges: true },
    passwordHash: bcrypt.hashSync(v.password, 10),
    failedLogins: 0,
  };
  await ctx.repo.insert("users", user);
  for (const doc of ["TERMOS", "PRIVACIDADE"] as const)
    await ctx.repo.insert("consents", { id: uid("cns_"), userId: user.id, document: doc, version: doc === "TERMOS" ? s.termsVersion : s.privacyVersion, at: nowIso(ctx) });
  const token = verificationToken(user);
  await outbox(ctx, { channel: "EMAIL", to: email, subject: "Confirme o seu email", body: `Abra esta ligação para confirmar: /entrar?confirmar=${user.id}.${token}` });
  return { userId: user.id, verifyToken: `${user.id}.${token}` };
}

const verificationToken = (u: Pick<User, "id" | "email" | "createdAt">) => sha256Hex(`verify:${u.id}:${u.email}:${u.createdAt}:${process.env.AUTH_SECRET ?? "demo"}`).slice(0, 32);

export async function verifyEmail(ctx: Ctx, { token }: { token: string }) {
  const [id, t] = token.split(".");
  const u = await ctx.repo.get("users", id);
  if (!u || verificationToken(u) !== t) throw new ServiceError("Ligação de confirmação inválida ou expirada.", 400);
  await ctx.repo.update("users", id, { emailVerifiedAt: nowIso(ctx) });
  return { ok: true };
}

/** Usado pelo Auth.js (modo completo) e pela demonstração. Bloqueia após 5 tentativas falhadas. */
export async function verifyCredentials(ctx: Ctx, { email, password }: { email: string; password: string }): Promise<User> {
  const u = (await ctx.repo.all("users")).find((x) => x.email.toLowerCase() === email.trim().toLowerCase() && x.authProvider === "EMAIL");
  if (!u || !u.passwordHash) throw new ServiceError("Email ou palavra-passe incorrectos.", 401, "INVALID");
  if (u.status !== "ACTIVO") throw new ServiceError("Esta conta está desactivada.", 403, "DISABLED");
  const now = ctx.now();
  if (u.lockedUntil && new Date(u.lockedUntil) > now) throw new ServiceError("Conta bloqueada temporariamente após 5 tentativas falhadas.", 423, "LOCKED");
  if (!bcrypt.compareSync(password, u.passwordHash)) {
    const failed = (u.failedLogins ?? 0) + 1;
    const lock = failed >= MAX_FAILED_LOGINS ? new Date(now.getTime() + LOCK_MINUTES * 60000).toISOString() : null;
    await ctx.repo.update("users", u.id, { failedLogins: lock ? 0 : failed, lockedUntil: lock });
    throw new ServiceError(lock ? "Conta bloqueada temporariamente após 5 tentativas falhadas." : "Email ou palavra-passe incorrectos.", lock ? 423 : 401, lock ? "LOCKED" : "INVALID");
  }
  const updated = await ctx.repo.update("users", u.id, { failedLogins: 0, lockedUntil: null, lastSeenAt: now.toISOString() });
  return updated;
}

export async function requestPasswordReset(ctx: Ctx, { email }: { email: string }) {
  if (!ctx.rateLimit("reset", 3)) throw new ServiceError("Demasiados pedidos.", 429);
  const u = (await ctx.repo.all("users")).find((x) => x.email.toLowerCase() === email.trim().toLowerCase() && x.authProvider === "EMAIL");
  // Resposta igual exista ou não a conta, para não revelar emails.
  if (u) await outbox(ctx, { channel: "EMAIL", to: u.email, subject: "Recuperar a palavra-passe", body: `Use esta ligação para definir uma nova palavra-passe: /entrar?recuperar=${u.id}.${sha256Hex(`reset:${u.id}:${u.passwordHash}`).slice(0, 24)}` });
  return { ok: true };
}

export async function changePassword(ctx: Ctx, { current, next }: { current: string; next: string }) {
  const user = requireUser(ctx);
  const u = await ctx.repo.get("users", user.id);
  if (!u?.passwordHash) throw new ServiceError("Esta conta entra com Microsoft.", 400);
  if (!bcrypt.compareSync(current, u.passwordHash)) throw new ServiceError("A palavra-passe actual está errada.", 400);
  if (next.length < 10) throw new ServiceError("A nova palavra-passe precisa de pelo menos 10 caracteres.", 400);
  await ctx.repo.update("users", u.id, { passwordHash: bcrypt.hashSync(next, 10) });
}

export async function getMe(ctx: Ctx) {
  const u = me(ctx);
  if (!u) return null;
  const { passwordHash: _p, ...safe } = (await ctx.repo.get("users", u.id)) ?? u;
  return safe;
}

export async function updateProfile(ctx: Ctx, patch: Partial<Pick<User, "name" | "interests" | "skills" | "notifyPrefs" | "external">>) {
  const user = requireUser(ctx);
  const allowed: Partial<User> = {};
  // Dados da Microsoft são só de leitura para colaboradores.
  if (user.authProvider === "EMAIL" && patch.name) allowed.name = patch.name.slice(0, 120);
  if (user.authProvider === "EMAIL" && patch.external) allowed.external = { ...user.external!, ...patch.external, type: patch.external.type ?? user.external!.type };
  if (patch.interests) allowed.interests = patch.interests.slice(0, 20);
  if (patch.skills) allowed.skills = patch.skills.slice(0, 20);
  if (patch.notifyPrefs) allowed.notifyPrefs = patch.notifyPrefs;
  return ctx.repo.update("users", user.id, allowed);
}

/** O externo pode apagar a conta. As ideias ficam, sem autor (anonimizadas). */
export async function deleteMyAccount(ctx: Ctx) {
  const user = requireUser(ctx);
  if (user.role !== "EXTERNO") throw new ServiceError("Contas de colaborador são geridas pela TIS.", 400);
  for (const i of (await ctx.repo.all("ideas")).filter((x) => x.authorId === user.id)) await ctx.repo.update("ideas", i.id, { authorId: null });
  await ctx.repo.update("users", user.id, { name: "Conta apagada", email: `apagado+${user.id}@invalid`, status: "DESACTIVADO", passwordHash: undefined, external: undefined });
  await audit(ctx, "user.delete_self", "user", user.id);
}

/** Exportação dos dados de um utilizador a pedido (Lei 22/11). */
export async function exportMyData(ctx: Ctx) {
  const user = requireUser(ctx);
  const { passwordHash: _p, ...profile } = (await ctx.repo.get("users", user.id))!;
  const ideas = (await ctx.repo.all("ideas")).filter((i) => i.authorId === user.id);
  const consents = (await ctx.repo.all("consents")).filter((c) => c.userId === user.id);
  return { profile, ideas, consents, exportedAt: nowIso(ctx) };
}

export async function listNotifications(ctx: Ctx) {
  const user = me(ctx);
  if (!user) return [];
  return (await ctx.repo.all("notifications")).filter((n) => n.userId === user.id).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 30);
}

export async function markNotificationsRead(ctx: Ctx) {
  const user = requireUser(ctx);
  for (const n of (await ctx.repo.all("notifications")).filter((n) => n.userId === user.id && !n.readAt)) await ctx.repo.update("notifications", n.id, { readAt: nowIso(ctx) });
}

/** Na demonstração, simula «Entrar com Microsoft»: o primeiro login cria a conta como Colaborador. */
export async function upsertMicrosoftUser(ctx: Ctx, profile: { email: string; name: string; department?: string; photoUrl?: string }, allowedDomain: string) {
  const email = profile.email.toLowerCase();
  if (!email.endsWith(`@${allowedDomain.toLowerCase()}`)) throw new ServiceError("Só contas do domínio TIS.", 403, "DOMAIN");
  const existing = (await ctx.repo.all("users")).find((u) => u.email.toLowerCase() === email);
  if (existing) return ctx.repo.update("users", existing.id, { lastSeenAt: nowIso(ctx), name: profile.name, department: profile.department ?? existing.department, photoUrl: profile.photoUrl ?? existing.photoUrl });
  const u: User = { id: uid("usr_"), name: profile.name, email, role: "COLABORADOR", authProvider: "MICROSOFT", department: profile.department, photoUrl: profile.photoUrl, status: "ACTIVO", createdAt: nowIso(ctx), lastSeenAt: nowIso(ctx), interests: [], skills: [], badges: [], notifyPrefs: { email: true, teams: true, challenges: true } };
  await ctx.repo.insert("users", u);
  return u;
}

