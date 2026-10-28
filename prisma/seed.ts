// Carrega os dados de demonstração na base PostgreSQL (`npm run db:seed`).
// Apaga os dados existentes: usar só em desenvolvimento e testes.
import { PrismaClient } from "@prisma/client";
import { buildSeed } from "../lib/data/seed";

const prisma = new PrismaClient();
const MODELS: [string, string][] = [
  ["users", "user"], ["ideas", "idea"], ["anonAuthorships", "anonAuthorship"], ["statusHistory", "statusChange"], ["aiAnalyses", "aiAnalysis"],
  ["criteriaSets", "criteriaSet"], ["assessments", "managerAssessment"], ["messages", "message"], ["projects", "project"], ["gates", "gate"],
  ["teamMembers", "teamMember"], ["visibilityChanges", "visibilityChange"], ["challenges", "challenge"], ["contents", "content"], ["partners", "partner"],
  ["supportRequests", "supportRequest"], ["reactions", "reaction"], ["notifications", "notification"], ["consents", "consent"], ["auditLogs", "auditLog"],
  ["outbox", "outboxItem"], ["responseTemplates", "responseTemplate"],
];

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_SEED !== "1") throw new Error("Seed bloqueado em produção (ALLOW_SEED=1 para forçar).");
  const db = buildSeed() as unknown as Record<string, Record<string, unknown>[]> & { settings: object };
  const p = prisma as unknown as Record<string, { deleteMany: () => Promise<unknown>; createMany: (a: { data: unknown[] }) => Promise<unknown> }>;
  for (const [, model] of [...MODELS].reverse()) await p[model].deleteMany();
  const clean = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));
  for (const [col, model] of MODELS) if (db[col].length) await p[model].createMany({ data: db[col].map(clean) });
  await prisma.setting.upsert({ where: { id: "global" }, update: { value: db.settings as never }, create: { id: "global", value: db.settings as never } });
  console.log("Dados de demonstração carregados.");
}

main().finally(() => prisma.$disconnect());
