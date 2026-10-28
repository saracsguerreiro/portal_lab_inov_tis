// Acesso aos dados no servidor (componentes de servidor e rotas de API).
// Sem DATABASE_URL (ou na exportação estática) usa os dados de demonstração em memória,
// o que permite correr `npm run dev` sem infra-estrutura.
import type { Actor } from "@/lib/domain/types";
import { memoryRepo, type Repo } from "./repo";
import { buildSeed } from "./seed";
import { call, type ArgsOf, type Method, type ResultOf } from "@/lib/services";
import type { Ctx } from "@/lib/services/context";

const useMemory = () => process.env.NEXT_PUBLIC_MODE === "demo" || !process.env.DATABASE_URL;

let memory: Repo | null = null;
export async function serverRepo(): Promise<Repo> {
  if (useMemory()) return (memory ??= memoryRepo(buildSeed()));
  const { prismaRepo } = await import("./prisma-repo");
  return prismaRepo();
}

export async function serverCtx(actor: Actor = { kind: "visitor" }): Promise<Ctx> {
  const repo = await serverRepo();
  return {
    actor,
    repo,
    now: () => new Date(),
    jobs: { enqueue: async () => {} },
    verifyCaptcha: async () => false,
    rateLimit: () => true,
  };
}

/** Leitura como visitante (para gerar as páginas públicas com dados reais e bom LCP). */
export async function publicCall<M extends Method>(method: M, args?: ArgsOf<M>): Promise<ResultOf<M>> {
  return call(await serverCtx(), method, args as ArgsOf<M>);
}

/** IDs para pré-gerar páginas dinâmicas na exportação estática. No modo completo: tudo a pedido. */
export async function staticIds(kind: "projects" | "challenges" | "contents" | "ideas"): Promise<{ id: string }[]> {
  if (process.env.NEXT_PUBLIC_MODE !== "demo") return [];
  const db = buildSeed();
  if (kind === "projects") return db.projects.map((p) => ({ id: p.slug }));
  if (kind === "challenges") return db.challenges.map((c) => ({ id: c.slug }));
  if (kind === "contents") return db.contents.filter((c) => ["NOTICIA", "EVENTO", "DEMO_DAY", "FORMACAO"].includes(c.kind)).map((c) => ({ id: c.slug }));
  return db.ideas.map((i) => ({ id: i.id }));
}
