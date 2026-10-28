// Alerta «ideia a 2 dias do prazo de retorno». Chamado diariamente por um cron com CRON_SECRET.
import { NextResponse } from "next/server";
import { serverCtx } from "@/lib/data/server";
import { runDeadlineAlerts } from "@/lib/services/jobs";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "Sem permissão." }, { status: 401 });
  await runDeadlineAlerts(await serverCtx());
  return NextResponse.json({ ok: true });
}
