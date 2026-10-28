// Ligações de download temporárias (5 minutos), só para quem tem permissão:
// o próprio autor do envio, os gestores e a Comissão Executiva.
import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth/config.server";
import { signedDownloadUrl } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Precisa de entrar." }, { status: 401 });
  const key = (await params).key.join("/");
  const owner = key.split("/")[1];
  const manager = user.role === "GESTOR_LAB" || user.role === "GESTOR_INCUBADORA" || user.role === "COMISSAO_EXECUTIVA";
  if (!manager && owner !== user.id) return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  return NextResponse.redirect(await signedDownloadUrl(key, 300));
}
