// Envio de anexos: até 10 MB, tipo verificado pelos primeiros bytes, armazenamento privado S3.
import { NextResponse } from "next/server";
import { ACCEPTED_MIME, MAX_FILE_BYTES } from "@/lib/validation/forms";
import { putPrivateObject, sniffMime } from "@/lib/storage";
import { clientIp, rateLimit } from "@/lib/server/security";
import { currentUser } from "@/lib/auth/config.server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!rateLimit(`upload:${clientIp(req)}`, 20)) return NextResponse.json({ error: "Demasiados envios. Espere um minuto." }, { status: 429 });
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Ficheiro em falta." }, { status: 400 });
  if (file.size > MAX_FILE_BYTES) return NextResponse.json({ error: `O ficheiro «${file.name}» tem mais de 10 MB.` }, { status: 413 });
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = sniffMime(bytes, file.type);
  if (!mime || !(ACCEPTED_MIME as readonly string[]).includes(mime)) return NextResponse.json({ error: `O tipo do ficheiro «${file.name}» não é aceite.` }, { status: 415 });
  const user = await currentUser();
  const key = await putPrivateObject(bytes, mime, user?.id ?? "anonimo");
  return NextResponse.json({ key, mime, size: file.size });
}
