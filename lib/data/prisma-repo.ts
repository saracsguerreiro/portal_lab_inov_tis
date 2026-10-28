// Repositório Prisma (modo completo). Cada colecção corresponde a um modelo do schema.prisma
// com os mesmos nomes de campos; estruturas aninhadas ficam em colunas JSON.
import { PrismaClient } from "@prisma/client";
import type { Collection, Settings } from "@/lib/domain/types";
import type { Item, Repo } from "./repo";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

const MODEL: Record<Collection, string> = {
  users: "user",
  ideas: "idea",
  anonAuthorships: "anonAuthorship",
  statusHistory: "statusChange",
  aiAnalyses: "aiAnalysis",
  criteriaSets: "criteriaSet",
  assessments: "managerAssessment",
  messages: "message",
  projects: "project",
  gates: "gate",
  teamMembers: "teamMember",
  visibilityChanges: "visibilityChange",
  challenges: "challenge",
  contents: "content",
  partners: "partner",
  supportRequests: "supportRequest",
  reactions: "reaction",
  notifications: "notification",
  consents: "consent",
  auditLogs: "auditLog",
  outbox: "outboxItem",
  responseTemplates: "responseTemplate",
};
const KEY: Partial<Record<Collection, string>> = { responseTemplates: "key" };

type Delegate = {
  findMany(a?: unknown): Promise<unknown[]>;
  findUnique(a: unknown): Promise<unknown>;
  create(a: unknown): Promise<unknown>;
  update(a: unknown): Promise<unknown>;
  delete(a: unknown): Promise<unknown>;
};
const model = (c: Collection) => (prisma as unknown as Record<string, Delegate>)[MODEL[c]];
const where = (c: Collection, id: string) => ({ [KEY[c] ?? "id"]: id });

// Datas: o domínio usa ISO strings; o Prisma devolve Date.
const toDomain = <T,>(row: unknown): T =>
  JSON.parse(JSON.stringify(row, (_k, v) => (v === null ? undefined : v))) as T;
const toDb = (obj: Record<string, unknown>) => {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) out[k] = v;
  return out;
};

export function prismaRepo(): Repo {
  return {
    async all<C extends Collection>(c: C) {
      return (await model(c).findMany()).map((r) => toDomain<Item<C>>(r));
    },
    async get<C extends Collection>(c: C, id: string) {
      const r = await model(c).findUnique({ where: where(c, id) });
      return r ? toDomain<Item<C>>(r) : undefined;
    },
    async insert<C extends Collection>(c: C, item: Item<C>) {
      return toDomain<Item<C>>(await model(c).create({ data: toDb(item as Record<string, unknown>) }));
    },
    async update<C extends Collection>(c: C, id: string, patch: Partial<Item<C>>) {
      return toDomain<Item<C>>(await model(c).update({ where: where(c, id), data: toDb(patch as Record<string, unknown>) }));
    },
    async remove<C extends Collection>(c: C, id: string) {
      await model(c).delete({ where: where(c, id) });
    },
    async settings() {
      const row = (await prisma.setting.findUnique({ where: { id: "global" } })) as { value: Settings } | null;
      if (!row) throw new Error("Configurações em falta: corra `npm run db:seed`.");
      return row.value;
    },
    async saveSettings(patch: Partial<Settings>) {
      const current = await this.settings();
      const value = { ...current, ...patch };
      await prisma.setting.update({ where: { id: "global" }, data: { value: value as never } });
      return value;
    },
  };
}
