// Conteúdos públicos e internos (P01, P07–P11, P18, P28, P29) e a sua gestão (P33).
import type { Challenge, Content, Partner } from "@/lib/domain/types";
import { ContactSchema, F6Schema, F7Schema, type F6Input, type F7Input } from "@/lib/validation/forms";
import { assertCan, canManageContent, canViewChallenge, canViewContent, isInternalRole, roleOf } from "@/lib/permissions";
import { audit, type Ctx, notFound, notify, nowIso, outbox, ServiceError, uid } from "./context";

/** Os 4 números agregados da Home (P17). Sem dados por pessoa. Valor manual em P36 sobrepõe-se. */
export async function getPublicStats(ctx: Ctx) {
  const s = await ctx.repo.settings();
  const ideas = (await ctx.repo.all("ideas")).length;
  const projects = await ctx.repo.all("projects");
  const partners = (await ctx.repo.all("partners")).filter((p) => p.disclosureAuthorized).length;
  const active = projects.filter((p) => !p.exit).length;
  const startups = projects.filter((p) => p.area === "INCUBADORA").length;
  return {
    ideas: s.homeNumbers.ideas ?? ideas,
    activeProjects: s.homeNumbers.activeProjects ?? active,
    startups: s.homeNumbers.startups ?? startups,
    partners: s.homeNumbers.partners ?? partners,
  };
}

export async function listChallenges(ctx: Ctx) {
  const challenges = (await ctx.repo.all("challenges")).filter((c) => canViewChallenge(ctx.actor, c));
  const ideas = await ctx.repo.all("ideas");
  return challenges
    .map((c) => ({ ...c, participations: ideas.filter((i) => i.challengeId === c.id).length }))
    .sort((a, b) => a.closesAt.localeCompare(b.closesAt));
}

export async function getChallenge(ctx: Ctx, { id }: { id: string }) {
  const c = (await ctx.repo.all("challenges")).find((x) => x.id === id || x.slug === id);
  if (!c || !canViewChallenge(ctx.actor, c)) throw notFound("Desafio");
  const participations = (await ctx.repo.all("ideas")).filter((i) => i.challengeId === c.id).length;
  return { ...c, participations };
}

export async function listContents(ctx: Ctx, { kinds }: { kinds?: Content["kind"][] } = {}) {
  return (await ctx.repo.all("contents"))
    .filter((c) => (!kinds || kinds.includes(c.kind)) && canViewContent(ctx.actor, c))
    .sort((a, b) => (b.date ?? b.publishedAt ?? b.createdAt).localeCompare(a.date ?? a.publishedAt ?? a.createdAt));
}

export async function getContent(ctx: Ctx, { id }: { id: string }) {
  const c = (await ctx.repo.all("contents")).find((x) => x.id === id || x.slug === id);
  if (!c || !canViewContent(ctx.actor, c)) throw notFound("Conteúdo");
  const projects = (await ctx.repo.all("projects")).filter((p) => c.projectIds?.includes(p.id) && (p.visibility === "PUBLICO" || isInternalRole(roleOf(ctx.actor))));
  return { ...c, projects: projects.map((p) => ({ id: p.id, slug: p.slug, name: p.name, area: p.area })) };
}

export async function listPartners(ctx: Ctx) {
  const all = await ctx.repo.all("partners");
  return canManageContent(ctx.actor) ? all : all.filter((p) => p.disclosureAuthorized);
}

export async function sendContact(ctx: Ctx, input: { name: string; email: string; subject: string; message: string; captchaToken?: string }) {
  const data = ContactSchema.parse(input);
  if (!ctx.rateLimit("contact", 3)) throw new ServiceError("Demasiados pedidos. Espere um minuto.", 429);
  if (!(await ctx.verifyCaptcha(data.captchaToken))) throw new ServiceError("Confirme a verificação anti-robot.", 400, "CAPTCHA");
  await outbox(ctx, { channel: "EMAIL", to: "inovacao@tis.example", subject: `[Contacto] ${data.subject}`, body: `${data.name} <${data.email}>\n\n${data.message}` });
}

// ------------------------------------------------------------- Gestão de conteúdos (P33)

export async function listAllContent(ctx: Ctx) {
  assertCan(canManageContent(ctx.actor));
  return {
    contents: await ctx.repo.all("contents"),
    challenges: await ctx.repo.all("challenges"),
    partners: await ctx.repo.all("partners"),
  };
}

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60);

export async function saveNews(ctx: Ctx, { id, data }: { id?: string; data: F7Input }) {
  assertCan(canManageContent(ctx.actor));
  const v = F7Schema.parse(data);
  const at = nowIso(ctx);
  if (id) {
    const before = await ctx.repo.get("contents", id);
    if (!before) throw notFound("Conteúdo");
    const after = await ctx.repo.update("contents", id, { ...v, publishedAt: v.status === "PUBLICADO" ? before.publishedAt ?? at : before.publishedAt });
    await audit(ctx, "content.update", "content", id, { status: before.status }, { status: v.status });
    return after;
  }
  const c: Content = { id: uid("cnt_"), slug: `${slugify(v.title)}-${Math.random().toString(36).slice(2, 5)}`, ...v, createdAt: at, publishedAt: v.status === "PUBLICADO" ? at : undefined };
  await ctx.repo.insert("contents", c);
  await audit(ctx, "content.create", "content", c.id, undefined, { title: c.title, status: c.status });
  return c;
}

export async function saveSimpleContent(ctx: Ctx, { id, data }: { id?: string; data: Pick<Content, "kind" | "title" | "summary" | "body" | "visibility" | "status"> & { meta?: Record<string, string>; signupUrl?: string; date?: string } }) {
  assertCan(canManageContent(ctx.actor));
  if (!data.title?.trim()) throw new ServiceError("Escreva o título.", 400);
  const at = nowIso(ctx);
  if (id) return ctx.repo.update("contents", id, data);
  const c: Content = { id: uid("cnt_"), slug: `${slugify(data.title)}-${Math.random().toString(36).slice(2, 5)}`, ...data, createdAt: at, publishedAt: data.status === "PUBLICADO" ? at : undefined };
  await ctx.repo.insert("contents", c);
  await audit(ctx, "content.create", "content", c.id);
  return c;
}

export async function setContentStatus(ctx: Ctx, { id, status }: { id: string; status: Content["status"] }) {
  assertCan(canManageContent(ctx.actor));
  const before = await ctx.repo.get("contents", id);
  if (!before) throw notFound("Conteúdo");
  await ctx.repo.update("contents", id, { status, publishedAt: status === "PUBLICADO" ? before.publishedAt ?? nowIso(ctx) : before.publishedAt });
  await audit(ctx, "content.status", "content", id, { status: before.status }, { status });
}

export async function saveChallenge(ctx: Ctx, { id, data }: { id?: string; data: F6Input }) {
  assertCan(canManageContent(ctx.actor));
  const v = F6Schema.parse(data);
  if (id) {
    const before = await ctx.repo.get("challenges", id);
    const after = await ctx.repo.update("challenges", id, v);
    await audit(ctx, "challenge.update", "challenge", id, { status: before?.status }, { status: v.status });
    return after;
  }
  const c: Challenge = { id: uid("dsf_"), slug: `${slugify(v.title)}-${Math.random().toString(36).slice(2, 5)}`, ...v };
  await ctx.repo.insert("challenges", c);
  await audit(ctx, "challenge.create", "challenge", c.id);
  // Novo desafio aberto: colaboradores com interesses correspondentes (se activaram).
  if (c.contentStatus === "PUBLICADO" && c.status === "ABERTO" && c.audience !== "EXTERNOS") {
    const words = `${c.title} ${c.problem}`.toLowerCase();
    for (const u of await ctx.repo.all("users")) {
      if (u.role !== "COLABORADOR" || !u.notifyPrefs?.challenges) continue;
      if ((u.interests ?? []).some((i) => words.includes(i.toLowerCase())))
        await notify(ctx, { userId: u.id, title: `Novo desafio: ${c.title}`, body: "Há um desafio que combina com os seus interesses.", href: `/desafios/${c.slug}` });
    }
  }
  return c;
}

export async function savePartner(ctx: Ctx, { id, data }: { id?: string; data: Omit<Partner, "id"> }) {
  assertCan(canManageContent(ctx.actor));
  if (!data.name?.trim()) throw new ServiceError("Escreva o nome.", 400);
  if (id) return ctx.repo.update("partners", id, data);
  const p: Partner = { id: uid("prt_"), ...data };
  await ctx.repo.insert("partners", p);
  await audit(ctx, "partner.create", "partner", p.id);
  return p;
}
