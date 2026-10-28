// Tarefas em segundo plano (fila): análise da IA e alertas de prazo.
// No modo completo correm no worker pg-boss (lib/queue/worker.ts); na demonstração,
// num setTimeout no browser. A submissão nunca espera por elas.
import { analyze, buildAiInput, getProvider, type AiProvider } from "@/lib/ai";
import type { Repo } from "@/lib/data/repo";
import { addBusinessDays, businessDaysBetween } from "@/lib/domain/workflow";
import { type Ctx, notify, uid } from "./context";

export async function runAiAnalysis(repo: Repo, ideaId: string, now = new Date(), provider: AiProvider = getProvider()) {
  const idea = await repo.get("ideas", ideaId);
  if (!idea) return null;
  const kind = idea.type === "MELHORIA" ? "MELHORIA" : "EXTERNA_NEGOCIO";
  const criteria = (await repo.all("criteriaSets")).find((c) => c.ideaKind === kind && c.active);
  if (!criteria) return null;
  const input = buildAiInput(idea, criteria, await repo.all("ideas"));
  const result = await analyze(input, idea.id, now.toISOString(), provider);
  // Remove a análise «pendente» anterior e guarda a nova (as concluídas ficam no histórico).
  for (const a of (await repo.all("aiAnalyses")).filter((a) => a.ideaId === ideaId && a.status === "PENDENTE")) await repo.remove("aiAnalyses", a.id);
  const saved = { id: uid("ai_"), ...result };
  await repo.insert("aiAnalyses", saved);
  if (result.status === "CONCLUIDA" && result.classification) {
    await repo.update("ideas", ideaId, { workLine: idea.workLine ?? result.classification.workLine, theme: idea.theme ?? result.classification.theme });
  }
  return saved;
}

/** Ideia a 2 dias do prazo de retorno: avisa o gestor responsável. */
export async function runDeadlineAlerts(ctx: Ctx) {
  const s = await ctx.repo.settings();
  const now = ctx.now();
  for (const i of await ctx.repo.all("ideas")) {
    if (i.firstResponseAt || ["RETIRADA", "DUPLICADA", "DECISAO"].includes(i.status)) continue;
    const left = businessDaysBetween(now, addBusinessDays(new Date(i.createdAt), s.responseDeadlineDays));
    if (left === 2 && i.assigneeId) await notify(ctx, { userId: i.assigneeId, title: `${i.number} está a 2 dias do prazo`, body: i.title, href: `/gestao/triagem?ideia=${i.id}` });
  }
}
