// Ponto único de acesso às acções (modo completo). A sessão é resolvida no servidor
// e cada serviço verifica as permissões (matriz da secção 15) antes de mexer em dados.
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { call, services, type Method } from "@/lib/services";
import { serverRepo } from "@/lib/data/server";
import { currentUser } from "@/lib/auth/config.server";
import { clientIp, rateLimit, verifyCaptcha } from "@/lib/server/security";
import { enqueue } from "@/lib/queue";
import type { Ctx } from "@/lib/services/context";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ method: string }> }) {
  const { method } = await params;
  if (!(method in services)) return NextResponse.json({ error: "Acção desconhecida." }, { status: 404 });
  const ip = clientIp(req);
  if (!rateLimit(`rpc:${ip}`, 240)) return NextResponse.json({ error: "Demasiados pedidos." }, { status: 429 });
  const args = await req.json().catch(() => null);
  const user = await currentUser();
  const ctx: Ctx = {
    actor: user ? { kind: "user", user } : { kind: "visitor" },
    repo: await serverRepo(),
    now: () => new Date(),
    jobs: { enqueue },
    verifyCaptcha: (t) => verifyCaptcha(t, ip),
    rateLimit: (key, n) => rateLimit(`${key}:${ip}`, n),
  };
  try {
    const result = await call(ctx, method as Method, (args ?? undefined) as never);
    return NextResponse.json({ result: result ?? null });
  } catch (e) {
    if (e instanceof ZodError) return NextResponse.json({ error: e.issues[0]?.message ?? "Dados inválidos.", code: "VALIDATION" }, { status: 400 });
    const err = e as { message?: string; status?: number; code?: string };
    const status = err.status ?? 500;
    if (status >= 500) console.error(`[rpc:${method}]`, e);
    return NextResponse.json({ error: status >= 500 ? "Erro interno." : err.message, code: err.code }, { status });
  }
}
