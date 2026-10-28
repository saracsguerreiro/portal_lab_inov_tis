import { describe, expect, it } from "vitest";
import { makeWorld, validF1, validF2 } from "./helpers";
import { call } from "@/lib/services";
import { buildAiInput, buildMessages } from "@/lib/ai";
import { DEMO_CODES } from "@/lib/data/seed";
import { open, seal } from "@/lib/crypto";

describe("Anonimato real (secções 5 e 14)", () => {
  it("externo anónimo recebe código; a ideia não guarda autor nem email em claro", async () => {
    const w = makeWorld();
    const res = await call(w.ctxFor(null), "submitExternalIdea", validF1({ notifyEmail: "pessoa.secreta@exemplo.example" }));
    expect(res.trackingCode).toMatch(/^ECO-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    expect(res.ideaId).toBeNull();
    const idea = w.db.ideas.find((i) => i.number === res.number)!;
    expect(idea.authorId).toBeNull();
    expect(idea.origin).toBe("ANONIMA_EXTERNA");
    const everything = JSON.stringify({ ideas: w.db.ideas, auth: w.db.anonAuthorships, messages: w.db.messages, notifications: w.db.notifications, audit: w.db.auditLogs });
    expect(everything).not.toContain("pessoa.secreta@exemplo.example");
    expect(everything).not.toContain(res.trackingCode!);
  });

  it("colaborador anónimo: gestores não vêem o nome; o próprio vê em «As minhas ideias»", async () => {
    const w = makeWorld();
    const res = await call(w.ctxFor("u_colab"), "submitImprovementIdea", validF2({ anonymous: true }));
    const idea = w.db.ideas.find((i) => i.id === res.ideaId)!;
    expect(idea.authorId).toBeNull();
    const t = await call(w.ctxFor("u_glab"), "triageIdea", { id: idea.id });
    expect(t.author).toBeNull();
    const dump = JSON.stringify(t);
    expect(dump).not.toContain("Ana Domingos");
    expect(dump).not.toContain("ana.domingos");
    expect(dump).not.toContain("u_colab");
    const mine = await call(w.ctxFor("u_colab"), "listMyIdeas", undefined);
    expect(mine.find((m) => m.id === idea.id)?.anonymous).toBe(true);
    // A Comissão Executiva também não vê o autor nas ideias internas.
    await call(w.ctxFor("u_glab"), "changeIdeaStatus", { id: idea.id, to: "EM_ANALISE" });
    await call(w.ctxFor("u_glab"), "changeIdeaStatus", { id: idea.id, to: "EM_AVALIACAO" });
    const internal = await call(w.ctxFor("u_ce"), "getInternalIdea", { id: idea.id });
    expect(internal.authorName).toBe("Anónimo");
  });

  it("pedidos à IA não levam o nome, o email nem a organização do autor", async () => {
    const w = makeWorld();
    const idea = w.db.ideas.find((i) => i.id === "idea_01")!;
    idea.answers = { ...idea.answers, problem: `${String(idea.answers.problem)} Contacto: eva@kitanda.example, 923 456 789.` };
    const set = w.db.criteriaSets.find((c) => c.ideaKind === "EXTERNA_NEGOCIO")!;
    const msgs = JSON.stringify(buildMessages(buildAiInput(idea, set, w.db.ideas)));
    expect(msgs).not.toContain("Eva Kiala");
    expect(msgs).not.toContain("eva@kitanda.example");
    expect(msgs).not.toContain("923 456 789");
    expect(msgs).not.toContain("Kitanda Digital");
    expect(msgs).not.toContain("u_ext");
  });

  it("notificações ao anónimo saem para o email cifrado sem revelar identidade à equipa", async () => {
    const w = makeWorld();
    await call(w.ctxFor(null), "submitExternalIdea", validF1({ notifyEmail: "alguem@exemplo.example" }));
    expect(w.db.outbox.some((o) => o.to === "alguem@exemplo.example")).toBe(true);
    const managerNotifs = w.db.notifications.filter((n) => n.userId === "u_ginc");
    expect(JSON.stringify(managerNotifs)).not.toContain("alguem@exemplo.example");
  });

  it("consultar estado com código mostra o estado sem dados pessoais nem IA", async () => {
    const w = makeWorld();
    const v = await call(w.ctxFor(null), "getStatusByCode", { code: DEMO_CODES.underReview.toLowerCase(), captchaToken: "ok" });
    expect(v.idea.status).toBe("EM_ANALISE");
    const dump = JSON.stringify(v);
    expect(dump).not.toMatch(/feedbackDraft|aiAnalys|managerScore|total/);
    await expect(call(w.ctxFor(null), "getStatusByCode", { code: "ECO-AAAA-BBBB", captchaToken: "ok" })).rejects.toThrow(/Não encontrámos/);
    await expect(call(w.ctxFor(null), "getStatusByCode", { code: DEMO_CODES.underReview, captchaToken: "nao" })).rejects.toThrow(/anti-robot/);
  });

  it("limite de pedidos na consulta por código", async () => {
    const w = makeWorld();
    const ctx = w.ctxFor(null, { rateLimit: () => false });
    await expect(call(ctx, "getStatusByCode", { code: DEMO_CODES.underReview, captchaToken: "ok" })).rejects.toThrow(/Demasiados/);
  });

  it("revelar a autoria mais tarde (P5)", async () => {
    const w = makeWorld();
    await call(w.ctxFor("u_colab"), "revealAuthorship", { id: "idea_11" });
    const t = await call(w.ctxFor("u_glab"), "triageIdea", { id: "idea_11" });
    expect(t.author?.name).toBe("Ana Domingos");
  });

  it("outra pessoa não consegue revelar nem ver uma ideia anónima alheia", async () => {
    const w = makeWorld();
    await expect(call(w.ctxFor("u_colab2"), "getMyIdea", { id: "idea_11" })).rejects.toThrow(/não é sua/);
    await expect(call(w.ctxFor("u_colab2"), "revealAuthorship", { id: "idea_11" })).rejects.toThrow();
  });

  it("cifra autenticada: abre o que selou e rejeita alterações", () => {
    const s = seal("u_colab");
    expect(open(s)).toBe("u_colab");
    const tampered = s.slice(0, -2) + (s.endsWith("00") ? "11" : "00");
    expect(open(tampered)).toBeNull();
  });
});
