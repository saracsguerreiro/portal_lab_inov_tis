import { describe, expect, it } from "vitest";
import { makeWorld, validF1, validF2 } from "./helpers";
import { call } from "@/lib/services";
import { canTransition } from "@/lib/domain/workflow";
import { analyze, buildAiInput, toAnalysis, weightedTotal, mockAnalyze } from "@/lib/ai";

describe("Estados da ideia (secção 13)", () => {
  it("transições válidas e inválidas", () => {
    expect(canTransition("manager", "RECEBIDA", "EM_ANALISE")).toBe(true);
    expect(canTransition("manager", "RECEBIDA", "DECISAO")).toBe(false);
    expect(canTransition("manager", "DECISAO", "EM_AVALIACAO", "LISTA_ESPERA")).toBe(true);
    expect(canTransition("manager", "DECISAO", "EM_AVALIACAO", "NAO_SELECCIONADA")).toBe(false);
    expect(canTransition("creator", "EM_ANALISE", "RETIRADA")).toBe(true);
    expect(canTransition("creator", "DECISAO", "RETIRADA")).toBe(false);
    expect(canTransition("manager", "RETIRADA", "EM_ANALISE")).toBe(false);
  });

  it("percurso completo de uma ideia externa com conta até ao feedback", async () => {
    const w = makeWorld();
    const ext = w.ctxFor("u_ext");
    const res = await call(ext, "submitExternalIdea", validF1({ submitAs: "CONTA", profileType: "STARTUP", organization: "Kitanda Digital", team: "3 pessoas" }));
    expect(res.ideaId).toBeTruthy();
    const id = res.ideaId!;
    // A submissão não esperou pela IA: a análise está pendente e há um trabalho na fila.
    expect(w.db.aiAnalyses.find((a) => a.ideaId === id)?.status).toBe("PENDENTE");
    expect(w.jobs.some((j) => j.name === "ai.analyze")).toBe(true);
    await w.runJobs();
    expect(w.db.aiAnalyses.find((a) => a.ideaId === id)?.status).toBe("CONCLUIDA");
    // O criador nunca vê a análise nem a pontuação.
    const view = await call(ext, "getMyIdea", { id });
    expect(JSON.stringify(view)).not.toMatch(/feedbackDraft|"total"|managerScore|aiAnalysis/);

    const g = w.ctxFor("u_ginc");
    await call(g, "changeIdeaStatus", { id, to: "EM_ANALISE" });
    await call(g, "requestInfo", { id, question: "Quantos clientes têm?" });
    expect(w.db.ideas.find((i) => i.id === id)!.status).toBe("INFO_PEDIDA");
    const v2 = await call(ext, "getMyIdea", { id });
    expect(v2.openInfoRequest?.text).toContain("Quantos clientes");
    await call(ext, "sendCreatorMessage", { ideaId: id, text: "Temos 40 clientes." });
    expect(w.db.ideas.find((i) => i.id === id)!.status).toBe("EM_ANALISE");
    await call(g, "changeIdeaStatus", { id, to: "EM_AVALIACAO" });
    await call(g, "decideIdea", { id, decision: "SELECCIONADA", reason: "Equipa forte.", nextStep: "Coorte 2027-A", feedback: "Parabéns!" });
    const final = await call(ext, "getMyIdea", { id });
    expect(final.idea.status).toBe("DECISAO");
    expect(final.idea.decision).toBe("SELECCIONADA");
    expect(final.messages.some((m) => m.text === "Parabéns!")).toBe(true);
    expect(w.db.notifications.filter((n) => n.userId === "u_ext").length).toBeGreaterThan(3);
  });

  it("ideia de melhoria entra no Lab e, seleccionada, vira projecto na etapa Oportunidade", async () => {
    const w = makeWorld();
    const res = await call(w.ctxFor("u_colab"), "submitImprovementIdea", validF2());
    const idea = w.db.ideas.find((i) => i.id === res.ideaId)!;
    expect(idea.area).toBe("LAB");
    const g = w.ctxFor("u_glab");
    await call(g, "decideIdea", { id: idea.id, decision: "SELECCIONADA", reason: "Impacto alto", nextStep: "Projecto do Lab", feedback: "" });
    const draft = await call(g, "projectDraftFromIdea", { ideaId: idea.id });
    expect(draft.stage).toBe("OPORTUNIDADE");
    const p = await call(g, "createProject", { ...draft, workLine: "L2", hypothesis: "h", visibility: "INTERNO", featured: false, sponsorId: "u_ce", team: [{ name: "Ana", role: "CHAMPION" }], securityKitPhase: 0, partnerIds: [], links: {}, track: null } as never);
    expect(w.db.ideas.find((i) => i.id === idea.id)!.projectId).toBe(p.id);
  });

  it("ideia de negócio de colaborador usa F1 e entra primeiro no Lab (P6)", async () => {
    const w = makeWorld();
    const res = await call(w.ctxFor("u_colab"), "submitExternalIdea", validF1({ submitAs: "CONTA", profileType: "INDIVIDUAL" }));
    const idea = w.db.ideas.find((i) => i.id === res.ideaId)!;
    expect(idea.type).toBe("NEGOCIO_COLABORADOR");
    expect(idea.origin).toBe("COLABORADOR");
    expect(idea.area).toBe("LAB");
  });

  it("gestores e CE não podem submeter ideias externas", async () => {
    const w = makeWorld();
    await expect(call(w.ctxFor("u_glab"), "submitExternalIdea", validF1())).rejects.toThrow();
    await expect(call(w.ctxFor("u_ce"), "submitExternalIdea", validF1())).rejects.toThrow();
  });

  it("projecto do Lab passa à Incubadora e chega a uma saída", async () => {
    const w = makeWorld();
    const lab = w.ctxFor("u_glab");
    await expect(call(lab, "recordExit", { id: "prj_l_ocr", kind: "INCUBADORA", reason: "Modelo de negócio" })).rejects.toThrow(/arquitectura/);
    await call(lab, "updateProject", { id: "prj_l_ocr", patch: { architectureValidatedAt: "2026-10-20T00:00:00Z" } });
    await call(lab, "recordExit", { id: "prj_l_ocr", kind: "INCUBADORA", reason: "Precisa de modelo de negócio próprio" });
    const p = w.db.projects.find((x) => x.id === "prj_l_ocr")!;
    expect(p.area).toBe("INCUBADORA");
    expect(p.track).toBe("INTERNA");
    expect(p.history!.some((h) => h.text.startsWith("Transferido do Lab"))).toBe(true);
    await expect(call(lab, "acceptTransfer", { id: p.id, stage: "INCUBACAO" })).rejects.toThrow();
    const inc = w.ctxFor("u_ginc");
    await call(inc, "acceptTransfer", { id: p.id, stage: "INCUBACAO" });
    await call(inc, "recordExit", { id: p.id, kind: "SPIN_IN", reason: "Incorporada numa direcção" });
    expect(w.db.projects.find((x) => x.id === "prj_l_ocr")!.exit?.kind).toBe("SPIN_IN");
  });

  it("gate sem evidência não deixa avançar", async () => {
    const w = makeWorld();
    await expect(call(w.ctxFor("u_glab"), "recordGate", { projectId: "prj_l_tickets", stage: "ESTRATEGIA", decision: "CONTINUAR", evidence: " ", decidedBy: "Comité" })).rejects.toThrow(/evidência/);
    await call(w.ctxFor("u_glab"), "recordGate", { projectId: "prj_l_tickets", stage: "ESTRATEGIA", decision: "CONTINUAR", evidence: "Matriz de scoring", decidedBy: "Comité" });
    expect(w.db.projects.find((p) => p.id === "prj_l_tickets")!.stage).toBe("EXPERIMENTACAO");
  });

  it("criador pode editar só enquanto «Recebida» e retirar a ideia", async () => {
    const w = makeWorld();
    await call(w.ctxFor("u_ext"), "editMyIdea", { id: "idea_03", title: "Novo título", summary: "Novo resumo" });
    await expect(call(w.ctxFor("u_ext"), "editMyIdea", { id: "idea_02", title: "x", summary: "y" })).rejects.toThrow(/Recebida/);
    await call(w.ctxFor("u_ext"), "withdrawMyIdea", { id: "idea_02" });
    expect(w.db.ideas.find((i) => i.id === "idea_02")!.status).toBe("RETIRADA");
  });

  it("reabrir só a partir da lista de espera", async () => {
    const w = makeWorld();
    await call(w.ctxFor("u_ginc"), "changeIdeaStatus", { id: "idea_07", to: "EM_AVALIACAO" });
    await expect(call(w.ctxFor("u_ginc"), "changeIdeaStatus", { id: "idea_06", to: "EM_AVALIACAO" })).rejects.toThrow(/inválida/);
  });

  it("quota semanal da via rápida", async () => {
    const w = makeWorld();
    w.db.settings.fastTrackWeeklyQuota = 2; // já há 2 aceites esta semana nos dados
    await expect(call(w.ctxFor("u_glab"), "setSupportStatus", { id: "sup_2", status: "ACEITE" })).resolves.toBeUndefined();
    w.db.supportRequests.find((s) => s.id === "sup_2")!.urgent = true;
    w.db.supportRequests.push({ ...w.db.supportRequests[1], id: "sup_x", status: "RECEBIDO", urgent: true });
    await expect(call(w.ctxFor("u_glab"), "setSupportStatus", { id: "sup_x", status: "ACEITE" })).rejects.toThrow(/quota/);
  });
});

describe("IA (secção 12)", () => {
  it("resposta inválida → análise FALHOU; a ideia continua na fila", async () => {
    const w = makeWorld();
    const idea = w.db.ideas[0];
    const set = w.db.criteriaSets[0];
    const res = await analyze(buildAiInput(idea, set, w.db.ideas), idea.id, "2026-10-28T00:00:00Z", { name: "x", complete: async () => ({ total: 999 }) });
    expect(res.status).toBe("FALHOU");
  });
  it("pontuações 1–5 validadas e total recalculado com os pesos", () => {
    const w = makeWorld();
    const idea = w.db.ideas[3];
    const set = w.db.criteriaSets[0];
    const input = buildAiInput(idea, set, w.db.ideas);
    const raw = mockAnalyze(input);
    const a = toAnalysis({ ...raw, total: 1 }, input, idea.id, "mock", "2026-10-28T00:00:00Z");
    expect(a.total).toBe(weightedTotal(a.scores));
    expect(a.scores.every((s) => s.score >= 1 && s.score <= 5)).toBe(true);
    expect(() => toAnalysis({ ...raw, criteria: raw.criteria.map((c) => ({ ...c, score: 7 })) }, input, idea.id, "mock", "x")).toThrow();
  });
  it("semelhantes só entre os candidatos dados (nunca inventados)", () => {
    const w = makeWorld();
    const input = buildAiInput(w.db.ideas[2], w.db.criteriaSets[0], w.db.ideas);
    const raw = mockAnalyze(input);
    const a = toAnalysis({ ...raw, similar: [{ ideaId: "inventada", similarity: 99 }] }, input, "x", "mock", "x");
    expect(a.similar).toHaveLength(0);
  });
  it("detecta riscos de dados pessoais", () => {
    const w = makeWorld();
    const idea = { ...w.db.ideas[2], answers: { ...w.db.ideas[2].answers, problem: "Liguem para 923 111 222 ou x@y.example. Documento confidencial." } };
    const raw = mockAnalyze(buildAiInput(idea, w.db.criteriaSets[0], w.db.ideas));
    expect(raw.risks.map((r) => r.kind)).toEqual(expect.arrayContaining(["DADOS_PESSOAIS", "CONFIDENCIAL"]));
  });
});
