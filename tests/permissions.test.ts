import { describe, expect, it } from "vitest";
import { makeWorld } from "./helpers";
import { canAccessPage, canViewProject, PAGE_ACCESS, type PageCode } from "@/lib/permissions";
import { call } from "@/lib/services";
import type { Actor } from "@/lib/domain/types";

const ROLES = ["VISITANTE", "EXTERNO", "COLABORADOR", "GESTOR_LAB", "GESTOR_INCUBADORA", "COMISSAO_EXECUTIVA"] as const;
const USER_BY_ROLE: Record<(typeof ROLES)[number], string | null> = {
  VISITANTE: null, EXTERNO: "u_ext", COLABORADOR: "u_colab", GESTOR_LAB: "u_glab", GESTOR_INCUBADORA: "u_ginc", COMISSAO_EXECUTIVA: "u_ce",
};

describe("Matriz de páginas (secção 15)", () => {
  const w = makeWorld();
  const actor = (r: (typeof ROLES)[number]): Actor => (USER_BY_ROLE[r] ? { kind: "user", user: w.db.users.find((u) => u.id === USER_BY_ROLE[r])! } : { kind: "visitor" });
  const expected: Partial<Record<PageCode, (typeof ROLES)[number][]>> = {
    P24: ["COLABORADOR"],
    P25: ["COLABORADOR", "GESTOR_LAB", "GESTOR_INCUBADORA", "COMISSAO_EXECUTIVA"],
    P27: ["COLABORADOR", "GESTOR_LAB", "COMISSAO_EXECUTIVA"],
    P30: ["GESTOR_LAB", "GESTOR_INCUBADORA", "COMISSAO_EXECUTIVA"],
    P31: ["GESTOR_LAB", "GESTOR_INCUBADORA"],
    P36: ["GESTOR_LAB", "GESTOR_INCUBADORA"],
    P13: ["VISITANTE", "EXTERNO", "COLABORADOR"],
    P20: ["EXTERNO", "COLABORADOR", "GESTOR_LAB", "GESTOR_INCUBADORA", "COMISSAO_EXECUTIVA"],
  };
  for (const [page, allowed] of Object.entries(expected)) {
    it(`${page}: só ${allowed!.join(", ")}`, () => {
      for (const r of ROLES) expect(canAccessPage(actor(r), page as PageCode), `${r} em ${page}`).toBe(allowed!.includes(r));
    });
  }
  it("todas as 36 páginas estão na matriz", () => expect(Object.keys(PAGE_ACCESS)).toHaveLength(36));
  it("utilizador desactivado é tratado como visitante", () => {
    const u = { ...w.db.users.find((x) => x.id === "u_glab")!, status: "DESACTIVADO" as const };
    expect(canAccessPage({ kind: "user", user: u }, "P31")).toBe(false);
  });
});

describe("Visibilidade de projectos (secção 14)", () => {
  const w = makeWorld();
  it("visitante e externo só vêem Públicos; colaborador vê Internos; gestores e CE vêem Restritos", async () => {
    const counts: Record<string, Set<string>> = {};
    for (const who of [null, "u_ext", "u_colab", "u_glab", "u_ce"]) {
      const list = await call(w.ctxFor(who), "listProjects", undefined);
      counts[who ?? "visitor"] = new Set(list.map((p) => p.visibility));
    }
    expect([...counts.visitor]).toEqual(["PUBLICO"]);
    expect([...counts.u_ext]).toEqual(["PUBLICO"]);
    expect(counts.u_colab.has("RESTRITO")).toBe(false);
    expect(counts.u_colab.has("INTERNO")).toBe(true);
    expect(counts.u_glab.has("RESTRITO")).toBe(true);
    expect(counts.u_ce.has("RESTRITO")).toBe(true);
  });
  it("ficha restrita é recusada no servidor a um colaborador", async () => {
    await expect(call(w.ctxFor("u_colab"), "getProject", { id: "prj_l_ar" })).rejects.toThrow(/não está visível/);
  });
  it("ficha pública para visitantes não inclui hipótese nem notas internas", async () => {
    const p = await call(w.ctxFor(null), "getProject", { id: "kimbo-assistente-ia-local" });
    expect(p.level).toBe("public");
    expect(JSON.stringify(p)).not.toContain("GPU adicional");
    expect("hypothesis" in p).toBe(false);
  });
  it("gestor da Incubadora lê mas não altera projectos do Lab", async () => {
    const lab = w.db.projects.find((p) => p.area === "LAB")!;
    expect(canViewProject(w.ctxFor("u_ginc").actor, lab)).toBe(true);
    await expect(call(w.ctxFor("u_ginc"), "updateProject", { id: lab.id, patch: { name: "x" } })).rejects.toThrow(/Só o gestor/);
  });
  it("passar a Público exige a checklist completa e fica registado", async () => {
    const ctx = w.ctxFor("u_glab");
    await expect(call(ctx, "changeVisibility", { id: "prj_l_tickets", to: "PUBLICO", checklist: { noClientData: true } })).rejects.toThrow(/Checklist incompleta/);
    await call(ctx, "changeVisibility", { id: "prj_l_tickets", to: "PUBLICO", checklist: { noClientData: true, partnerAuthorized: true, noFinancial: true, reviewed: true } });
    expect(w.db.visibilityChanges.some((v) => v.projectId === "prj_l_tickets" && v.to === "PUBLICO" && v.byId === "u_glab")).toBe(true);
    expect(w.db.auditLogs.some((a) => a.action === "project.visibility" && a.entityId === "prj_l_tickets")).toBe(true);
  });
  it("todo o projecto nasce Interno, mesmo que o formulário peça Público sem checklist", async () => {
    const ctx = w.ctxFor("u_ginc");
    await expect(
      call(ctx, "createProject", {
        name: "Nova venture", area: "INCUBADORA", track: "EXTERNA", visibility: "PUBLICO", featured: false, shortDescription: "x", problem: "y",
        stage: "INCUBACAO", sponsorId: "u_ce", team: [{ name: "A", role: "RESPONSAVEL" }], securityKitPhase: 0, partnerIds: [], links: {},
      }),
    ).rejects.toThrow(/Checklist/);
    const created = w.db.projects.find((p) => p.name === "Nova venture")!;
    expect(created.visibility).toBe("INTERNO");
  });
});

describe("Ideias: quem vê o quê", () => {
  const w = makeWorld();
  it("externo não vê ideias de outros nem a triagem", async () => {
    await expect(call(w.ctxFor("u_ext"), "getMyIdea", { id: "idea_04" })).rejects.toThrow(/não é sua/);
    await expect(call(w.ctxFor("u_ext"), "triageList", {})).rejects.toThrow();
    await expect(call(w.ctxFor("u_ext"), "listInternalIdeas", undefined)).rejects.toThrow();
  });
  it("colaborador só vê ideias internas a partir de «Em avaliação» e nunca externas", async () => {
    const list = await call(w.ctxFor("u_colab"), "listInternalIdeas", undefined);
    expect(list.length).toBeGreaterThan(0);
    for (const i of list) expect(["EM_AVALIACAO", "DECISAO"]).toContain(i.status);
    expect(list.some((i) => w.db.ideas.find((x) => x.id === i.id)!.type === "EXTERNA")).toBe(false);
  });
  it("Comissão Executiva vê o painel mas não a triagem", async () => {
    await expect(call(w.ctxFor("u_ce"), "triageList", {})).rejects.toThrow();
    const d = await call(w.ctxFor("u_ce"), "getDashboard", { from: "2026-01-01", to: "2026-12-31T23:59:59Z" });
    expect(d.incubator).not.toBeNull();
  });
  it("colaborador não acede ao painel", async () => {
    await expect(call(w.ctxFor("u_colab"), "getDashboard", { from: "2026-01-01", to: "2026-12-31" })).rejects.toThrow(/painel/);
  });
  it("gestor do Lab não decide ideias externas (só leitura)", async () => {
    await expect(call(w.ctxFor("u_glab"), "decideIdea", { id: "idea_04", decision: "SELECCIONADA", reason: "x", nextStep: "y", feedback: "" })).rejects.toThrow(/área responsável/);
  });
  it("critérios: cada gestor só gere o seu tipo de ideia", async () => {
    const c = await call(w.ctxFor("u_glab"), "getCriteria", undefined);
    expect(c.MELHORIA.canEdit).toBe(true);
    expect(c.EXTERNA_NEGOCIO.canEdit).toBe(false);
    await expect(call(w.ctxFor("u_glab"), "saveCriteria", { kind: "EXTERNA_NEGOCIO", criteria: c.EXTERNA_NEGOCIO.active.criteria, context: "" })).rejects.toThrow();
  });
  it("pesos dos critérios têm de somar 100 %", async () => {
    const c = await call(w.ctxFor("u_glab"), "getCriteria", undefined);
    const bad = c.MELHORIA.active.criteria.map((x, i) => (i === 0 ? { ...x, weight: x.weight + 5 } : x));
    await expect(call(w.ctxFor("u_glab"), "saveCriteria", { kind: "MELHORIA", criteria: bad, context: "" })).rejects.toThrow(/100 %/);
    const ok = await call(w.ctxFor("u_glab"), "saveCriteria", { kind: "MELHORIA", criteria: c.MELHORIA.active.criteria, context: "novo" });
    expect(ok.version).toBe(2);
  });
  it("só os gestores mudam perfis, e isso fica registado", async () => {
    await expect(call(w.ctxFor("u_ce"), "setUserRole", { userId: "u_colab2", role: "GESTOR_LAB" })).rejects.toThrow();
    await call(w.ctxFor("u_glab"), "setUserRole", { userId: "u_colab2", role: "GESTOR_LAB" });
    expect(w.db.auditLogs.some((a) => a.action === "user.role" && a.entityId === "u_colab2")).toBe(true);
  });
});
