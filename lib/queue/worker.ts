// Worker da fila (modo completo): `npm run worker`.
// - ai.analyze: análise da IA, validada pelo esquema fixo; em falha fica «Análise pendente/falhou».
// - outbox: envia emails (SMTP) e mensagens do Teams que os serviços deixaram na caixa de saída.
// - notify.deadlines: todos os dias às 07:00 (Luanda), avisa ideias a 2 dias do prazo.
import { serverRepo, serverCtx } from "@/lib/data/server";
import { runAiAnalysis, runDeadlineAlerts } from "@/lib/services/jobs";
import { sendMail } from "@/lib/mail";
import { sendTeams } from "@/lib/teams";

async function dispatchOutbox() {
  const repo = await serverRepo();
  const settings = await repo.settings();
  const pending = (await repo.all("outbox")).filter((o) => o.status === "PENDENTE").slice(0, 50);
  for (const o of pending) {
    try {
      if (o.channel === "EMAIL" && o.to) await sendMail({ to: o.to, subject: o.subject, text: o.body });
      else if (o.channel === "TEAMS") {
        if (!settings.integrations.teams.enabled) { await repo.update("outbox", o.id, { status: "FALHOU", body: `${o.body}\n[Teams desactivado em P36]` }); continue; }
        await sendTeams({ title: o.subject, text: o.body, to: o.to, webhookUrl: process.env.TEAMS_WEBHOOK_URL || settings.integrations.teams.webhookUrl });
      }
      await repo.update("outbox", o.id, { status: "ENVIADO" });
    } catch (e) {
      console.error("[outbox]", o.id, e);
      await repo.update("outbox", o.id, { status: "FALHOU" });
    }
  }
}

async function main() {
  const { getBoss } = await import("./index");
  const boss = (await getBoss()) as unknown as {
    work: (q: string, h: (jobs: { data: Record<string, unknown> }[]) => Promise<void>) => Promise<string>;
    schedule: (q: string, cron: string, data?: object, opts?: object) => Promise<void>;
  };
  await boss.work("ai.analyze", async (jobs) => {
    const repo = await serverRepo();
    for (const j of jobs) await runAiAnalysis(repo, j.data.ideaId as string);
  });
  await boss.work("notify.deadlines", async () => runDeadlineAlerts(await serverCtx()));
  await boss.schedule("notify.deadlines", "0 7 * * *", {}, { tz: "Africa/Luanda" });
  setInterval(() => dispatchOutbox().catch((e) => console.error("[outbox]", e)), 15_000);
  console.log("Worker activo: ai.analyze, notify.deadlines, outbox.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
