import { buildSeed, SEED_NOW } from "@/lib/data/seed";
import { memoryRepo, type Repo } from "@/lib/data/repo";
import type { Actor, DB } from "@/lib/domain/types";
import type { Ctx } from "@/lib/services/context";
import { runAiAnalysis } from "@/lib/services/jobs";

export function makeWorld() {
  const db: DB = buildSeed();
  const repo = memoryRepo(db);
  const jobs: { name: string; payload: Record<string, unknown> }[] = [];
  const ctxFor = (who: string | null, extra: Partial<Ctx> = {}): Ctx => {
    const user = who ? db.users.find((u) => u.id === who)! : null;
    const actor: Actor = user ? { kind: "user", user } : { kind: "visitor" };
    return {
      actor,
      repo,
      now: () => SEED_NOW,
      jobs: { enqueue: (name, payload) => void jobs.push({ name, payload }) },
      verifyCaptcha: async (t) => t === "ok",
      rateLimit: () => true,
      ...extra,
    };
  };
  const runJobs = async (r: Repo = repo) => {
    while (jobs.length) {
      const j = jobs.shift()!;
      if (j.name === "ai.analyze") await runAiAnalysis(r, j.payload.ideaId as string, SEED_NOW);
    }
  };
  return { db, repo, jobs, ctxFor, runJobs };
}

export const validF1 = (o: Record<string, unknown> = {}) => ({
  submitAs: "ANONIMO" as const,
  profileType: "INDIVIDUAL" as const,
  organization: "",
  notifyEmail: "",
  title: "Sensores de qualidade do ar nas escolas",
  summary: "Rede barata de sensores para medir a qualidade do ar nas escolas de Luanda.",
  challengeId: null,
  problem: "As escolas não sabem quando o ar está poluído e as crianças ficam expostas.",
  solution: "Sensores de baixo custo com alertas por SMS para os directores das escolas.",
  audience: ["SECTOR_PUBLICO" as const],
  sector: "Educação",
  differentiation: "Custo muito baixo e manutenção feita por estudantes.",
  stage: "IDEIA" as const,
  lookingFor: ["PARCERIA" as const],
  attachments: [],
  links: "",
  acceptTerms: true as const,
  acceptPrivacy: true as const,
  confirmNoThirdParty: true as const,
  captchaToken: "ok",
  ...o,
});

export const validF2 = (o: Record<string, unknown> = {}) => ({
  kind: "MELHORIA" as const,
  anonymous: false,
  title: "Assinatura digital de contratos",
  category: "PROCESSOS" as const,
  affectedArea: "Jurídico e Compliance",
  problem: "Os contratos circulam em papel entre três edifícios e demoram duas semanas a ser assinados.",
  frequency: "SEMANALMENTE" as const,
  affected: ["OUTRAS_AREAS" as const],
  proposal: "Usar assinatura digital qualificada com fluxo de aprovação e arquivo automático.",
  impact: ["TEMPO" as const, "RISCO" as const],
  impactEstimate: "10 dias por contrato",
  urgency: "ALTA" as const,
  gravity: "MEDIA" as const,
  wantsToParticipate: true,
  attachments: [],
  confirmNoClientData: true as const,
  ...o,
});
