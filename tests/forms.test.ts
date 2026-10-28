import { describe, expect, it } from "vitest";
import { F1Schema, F2Schema, F3Schema, F4Schema, F5Schema, F6Schema, F7Schema, AttachmentSchema, MAX_FILE_BYTES } from "@/lib/validation/forms";
import { makeWorld, validF1, validF2 } from "./helpers";
import { call } from "@/lib/services";
import { DEMO_PASSWORD } from "@/lib/data/seed";

describe("Formulários (secção 11)", () => {
  it("F1: válido; título até 80 e resumo até 200", () => {
    expect(F1Schema.safeParse(validF1()).success).toBe(true);
    expect(F1Schema.safeParse(validF1({ title: "x".repeat(81) })).success).toBe(false);
    expect(F1Schema.safeParse(validF1({ summary: "x".repeat(201) })).success).toBe(false);
  });
  it("F1: termos obrigatórios; clientes obrigatórios se «Já com clientes»; equipa obrigatória para startups", () => {
    expect(F1Schema.safeParse(validF1({ acceptTerms: false })).success).toBe(false);
    expect(F1Schema.safeParse(validF1({ stage: "CLIENTES" })).success).toBe(false);
    expect(F1Schema.safeParse(validF1({ stage: "CLIENTES", customers: 12 })).success).toBe(true);
    expect(F1Schema.safeParse(validF1({ submitAs: "CONTA", profileType: "STARTUP", organization: "X" })).success).toBe(false);
    expect(F1Schema.safeParse(validF1({ submitAs: "CONTA", profileType: "STARTUP", organization: "X", team: "2 pessoas" })).success).toBe(true);
  });
  it("F1: organização obrigatória se não for pessoa individual (com conta)", () => {
    expect(F1Schema.safeParse(validF1({ submitAs: "CONTA", profileType: "UNIVERSIDADE", organization: "" })).success).toBe(false);
  });
  it("Anexos: até 3, 10 MB, tipos aceites", () => {
    expect(AttachmentSchema.safeParse({ id: "a", name: "deck.pdf", mime: "application/pdf", size: MAX_FILE_BYTES, key: "k" }).success).toBe(true);
    expect(AttachmentSchema.safeParse({ id: "a", name: "big.pdf", mime: "application/pdf", size: MAX_FILE_BYTES + 1, key: "k" }).success).toBe(false);
    expect(AttachmentSchema.safeParse({ id: "a", name: "x.exe", mime: "application/x-msdownload", size: 10, key: "k" }).success).toBe(false);
    const f = { id: "a", name: "a.pdf", mime: "application/pdf", size: 1, key: "k" };
    expect(F1Schema.safeParse(validF1({ attachments: [f, f, f, f] })).success).toBe(false);
  });
  it("F2: válido; categoria e GUT obrigatórios", () => {
    expect(F2Schema.safeParse(validF2()).success).toBe(true);
    expect(F2Schema.safeParse(validF2({ urgency: undefined })).success).toBe(false);
    expect(F2Schema.safeParse(validF2({ confirmNoClientData: false })).success).toBe(false);
  });
  it("F3: data obrigatória", () => {
    expect(F3Schema.safeParse({ type: "FORMACAO", proposal: "P", costCenter: "CC", description: "Descrição com mais de vinte caracteres", dueDate: "", urgent: false, attachments: [] }).success).toBe(false);
  });
  it("F4: palavra-passe com 10 caracteres e confirmação igual", () => {
    const base = { name: "N", email: "a@b.example", password: "1234567890", confirmPassword: "1234567890", profileType: "STARTUP", acceptTerms: true, acceptPrivacy: true };
    expect(F4Schema.safeParse(base).success).toBe(true);
    expect(F4Schema.safeParse({ ...base, password: "123", confirmPassword: "123" }).success).toBe(false);
    expect(F4Schema.safeParse({ ...base, confirmPassword: "0987654321" }).success).toBe(false);
  });
  it("F5: Lab exige linha e hipótese; Experimentação exige métricas; destaque só se Público", () => {
    const base = { name: "P", area: "LAB", workLine: "L1", hypothesis: "h", visibility: "INTERNO", shortDescription: "s", problem: "p", stage: "OPORTUNIDADE", sponsorId: "u", team: [{ name: "A", role: "RESPONSAVEL" }], securityKitPhase: 0 };
    expect(F5Schema.safeParse(base).success).toBe(true);
    expect(F5Schema.safeParse({ ...base, workLine: null }).success).toBe(false);
    expect(F5Schema.safeParse({ ...base, stage: "EXPERIMENTACAO" }).success).toBe(false);
    expect(F5Schema.safeParse({ ...base, featured: true }).success).toBe(false);
    expect(F5Schema.safeParse({ ...base, area: "INCUBADORA", track: null }).success).toBe(false);
  });
  it("F6: data de fecho depois da abertura", () => {
    const base = { title: "D", area: "LAB", audience: "AMBOS", problem: "p", context: "c", lookingFor: "l", criteria: ["a"], opensAt: "2026-01-02", closesAt: "2026-01-01", benefits: "b", visibility: "PUBLICO", contentStatus: "PUBLICADO", status: "ABERTO" };
    expect(F6Schema.safeParse(base).success).toBe(false);
    expect(F6Schema.safeParse({ ...base, closesAt: "2026-02-01" }).success).toBe(true);
  });
  it("F7: eventos exigem data e local", () => {
    const base = { kind: "EVENTO", title: "T", summary: "S", body: "B", visibility: "PUBLICO", status: "PUBLICADO" };
    expect(F7Schema.safeParse(base).success).toBe(false);
    expect(F7Schema.safeParse({ ...base, date: "2026-12-01", place: "Luanda" }).success).toBe(true);
  });
});

describe("Contas externas (secção 5)", () => {
  it("sem confirmação de email não submete ideias", async () => {
    const w = makeWorld();
    const r = await call(w.ctxFor(null), "registerExternal", { name: "Nova", email: "nova@exemplo.example", password: "palavra-passe-1", confirmPassword: "palavra-passe-1", profileType: "INDIVIDUAL", acceptTerms: true, acceptPrivacy: true, captchaToken: "ok" });
    const ctx = w.ctxFor(r.userId);
    await expect(call(ctx, "submitExternalIdea", validF1({ submitAs: "CONTA" }))).rejects.toThrow(/Confirme o seu email/);
    await call(ctx, "verifyEmail", { token: r.verifyToken });
    const ctx2 = w.ctxFor(r.userId);
    await expect(call(ctx2, "submitExternalIdea", validF1({ submitAs: "CONTA" }))).resolves.toBeTruthy();
  });
  it("bloqueio temporário após 5 tentativas falhadas", async () => {
    const w = makeWorld();
    const { verifyCredentials } = await import("@/lib/services/account");
    const ctx = w.ctxFor(null);
    for (let i = 0; i < 4; i++) await expect(verifyCredentials(ctx, { email: "eva@kitanda.example", password: "errada" })).rejects.toThrow(/incorrectos/);
    await expect(verifyCredentials(ctx, { email: "eva@kitanda.example", password: "errada" })).rejects.toThrow(/bloqueada/);
    await expect(verifyCredentials(ctx, { email: "eva@kitanda.example", password: DEMO_PASSWORD })).rejects.toThrow(/bloqueada/);
  });
  it("captcha obrigatório para anónimos", async () => {
    const w = makeWorld();
    await expect(call(w.ctxFor(null), "submitExternalIdea", validF1({ captchaToken: "" }))).rejects.toThrow(/anti-robot/);
  });
});
