// Protecções dos formulários públicos (modo completo): limite de pedidos e captcha.

const buckets = new Map<string, number[]>();
/** Limite de pedidos por minuto, em memória por instância (com várias instâncias, usar um armazenamento partilhado). */
export function rateLimit(key: string, perMinute: number) {
  const now = Date.now();
  const arr = (buckets.get(key) ?? []).filter((t) => now - t < 60_000);
  if (arr.length >= perMinute) return false;
  arr.push(now);
  buckets.set(key, arr);
  return true;
}

/** Cloudflare Turnstile. Sem TURNSTILE_SECRET_KEY (desenvolvimento), aceita o token da caixa de verificação local. */
export async function verifyCaptcha(token: string | undefined, ip?: string) {
  if (!token) return false;
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return process.env.NODE_ENV !== "production" && token === "demo-ok";
  const body = new URLSearchParams({ secret, response: token, ...(ip ? { remoteip: ip } : {}) });
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
  const data = (await res.json()) as { success?: boolean };
  return !!data.success;
}

export const clientIp = (req: Request) => req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
