// Fila de tarefas em segundo plano (IA, emails e notificações).
// Com DATABASE_URL usa pg-boss (a própria base PostgreSQL, sem Redis); o worker
// (`npm run worker`) processa as tarefas. Sem base de dados, corre a tarefa logo a seguir
// à resposta, para o modo de desenvolvimento sem infra-estrutura.
import type { JobName } from "@/lib/services/context";

type Boss = { send: (name: string, data: object) => Promise<string | null>; start: () => Promise<unknown>; createQueue?: (n: string) => Promise<void> };
let bossPromise: Promise<Boss> | null = null;

export async function getBoss(): Promise<Boss> {
  if (!bossPromise) {
    bossPromise = (async () => {
      const { PgBoss } = (await import("pg-boss")) as unknown as { PgBoss: new (url: string) => Boss };
      const boss = new PgBoss(process.env.DATABASE_URL!);
      await boss.start();
      for (const q of ["ai.analyze", "notify.deadlines", "outbox.dispatch"]) await boss.createQueue?.(q).catch(() => {});
      return boss;
    })();
  }
  return bossPromise;
}

export async function enqueue(name: JobName, payload: Record<string, unknown>) {
  if (process.env.DATABASE_URL && process.env.QUEUE_INLINE !== "1") {
    await (await getBoss()).send(name, payload);
    return;
  }
  // Sem fila: corre depois de responder (a submissão nunca espera pela IA).
  setTimeout(async () => {
    const [{ serverRepo }, { runAiAnalysis }] = await Promise.all([import("@/lib/data/server"), import("@/lib/services/jobs")]);
    if (name === "ai.analyze") await runAiAnalysis(await serverRepo(), payload.ideaId as string).catch((e) => console.error("[ai]", e));
  }, 0);
}
