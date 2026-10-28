"use client";
// Ponte entre a interface e os serviços.
//  - Modo completo: POST /api/rpc/<acção>; o servidor resolve a sessão e verifica permissões.
//  - Modo demonstração (GitHub Pages): os mesmos serviços correm no browser sobre os
//    dados de demonstração guardados em localStorage, com o perfil escolhido em «Ver como».
import type { Actor, DB, User } from "@/lib/domain/types";
import type { ArgsOf, Method, ResultOf } from "@/lib/services";

export const IS_DEMO = process.env.NEXT_PUBLIC_MODE === "demo";
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const STORE_KEY = "eco-tis-demo-db-v3";
const ACTOR_KEY = "eco-tis-demo-actor";

type Listener = () => void;
const listeners = new Set<Listener>();
let version = 0;
export const subscribe = (l: Listener) => (listeners.add(l), () => void listeners.delete(l));
export const getVersion = () => version;
export function emitChange() {
  version++;
  listeners.forEach((l) => l());
}

// ------------------------------------------------------------- Demonstração

let demo: Promise<{ db: DB; ctxFor: () => Promise<import("@/lib/services/context").Ctx> }> | null = null;

function safeGet(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function safeSet(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* modo privado: continua só em memória */
  }
}

const rateBuckets = new Map<string, number[]>();
function rateLimit(key: string, perMinute: number) {
  const now = Date.now();
  const arr = (rateBuckets.get(key) ?? []).filter((t) => now - t < 60_000);
  if (arr.length >= perMinute) return false;
  arr.push(now);
  rateBuckets.set(key, arr);
  return true;
}

async function loadDemo() {
  const [{ buildSeed }, { memoryRepo }, { runAiAnalysis }] = await Promise.all([
    import("@/lib/data/seed"),
    import("@/lib/data/repo"),
    import("@/lib/services/jobs"),
  ]);
  let db: DB;
  const saved = safeGet(STORE_KEY);
  try {
    db = saved ? (JSON.parse(saved) as DB) : buildSeed();
  } catch {
    db = buildSeed();
  }
  let timer: ReturnType<typeof setTimeout> | null = null;
  const persist = (d: DB) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => safeSet(STORE_KEY, JSON.stringify(d)), 150);
  };
  const repo = memoryRepo(db, persist);
  persist(db);
  const ctxFor = async () => {
    const id = safeGet(ACTOR_KEY);
    const user = id ? db.users.find((u) => u.id === id && u.status === "ACTIVO") : undefined;
    const actor: Actor = user ? { kind: "user", user } : { kind: "visitor" };
    return {
      actor,
      repo,
      now: () => new Date(),
      // A fila: a análise da IA corre depois da resposta, como no worker do modo completo.
      jobs: {
        enqueue: (name: string, payload: Record<string, unknown>) => {
          if (name !== "ai.analyze") return;
          setTimeout(async () => {
            await runAiAnalysis(repo, payload.ideaId as string, new Date());
            emitChange();
          }, 2500);
        },
      },
      verifyCaptcha: async (t: string | undefined) => t === "demo-ok",
      rateLimit,
    } as import("@/lib/services/context").Ctx;
  };
  return { db, ctxFor };
}

function getDemo() {
  if (!demo) demo = loadDemo();
  return demo;
}

/**
 * Demonstração ainda intacta (sem perfil escolhido nem dados alterados): os dados gerados no
 * build são iguais aos do browser, por isso não é preciso carregar a base local no arranque.
 */
export function demoPristine() {
  return IS_DEMO && typeof window !== "undefined" && !safeGet(STORE_KEY) && !safeGet(ACTOR_KEY);
}

// ------------------------------------------------------------- API

export class ApiError extends Error {
  constructor(message: string, public status = 500, public code?: string) {
    super(message);
  }
}

export async function api<M extends Method>(method: M, args?: ArgsOf<M>): Promise<ResultOf<M>> {
  if (IS_DEMO) {
    const [{ call }, d] = await Promise.all([import("@/lib/services"), getDemo()]);
    try {
      const res = await call(await d.ctxFor(), method, args as ArgsOf<M>);
      return structuredClone(res);
    } catch (e) {
      const err = e as { message: string; status?: number; code?: string; issues?: { message: string }[] };
      throw new ApiError(err.issues?.[0]?.message ?? err.message, err.status ?? 400, err.code);
    }
  }
  const res = await fetch(`${BASE_PATH}/api/rpc/${String(method)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args ?? null),
    credentials: "same-origin",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error ?? "Erro inesperado.", res.status, data.code);
  return data.result as ResultOf<M>;
}

/** Mutação: chama a acção e avisa a interface para recarregar os dados. */
export async function mutate<M extends Method>(method: M, args?: ArgsOf<M>): Promise<ResultOf<M>> {
  const r = await api(method, args);
  emitChange();
  return r;
}

// ------------------------------------------------------------- Sessão

export type SessionUser = Omit<User, "passwordHash">;

export const session = {
  async me(): Promise<SessionUser | null> {
    if (IS_DEMO && !safeGet(ACTOR_KEY)) return null; // visitante: não carrega a base de demonstração
    return (await api("getMe")) as SessionUser | null;
  },
  /** Demonstração: escolher o perfil («Ver como»). */
  async viewAs(userId: string | null) {
    safeSet(ACTOR_KEY, userId);
    emitChange();
  },
  async signInMicrosoft(demoUserId?: string) {
    if (IS_DEMO) return session.viewAs(demoUserId ?? "u_colab");
    const { signIn } = await import("next-auth/react");
    await signIn("microsoft-entra-id", { callbackUrl: `${BASE_PATH}/` });
  },
  async signInEmail(email: string, password: string) {
    if (IS_DEMO) {
      const [{ verifyCredentials }, d] = await Promise.all([import("@/lib/services/account"), getDemo()]);
      try {
        const u = await verifyCredentials(await d.ctxFor(), { email, password });
        return session.viewAs(u.id);
      } catch (e) {
        const err = e as { message: string; status?: number; code?: string };
        throw new ApiError(err.message, err.status, err.code);
      }
    }
    const { signIn } = await import("next-auth/react");
    const r = await signIn("credentials", { email, password, redirect: false });
    if (r?.error) throw new ApiError(r.code === "LOCKED" ? "Conta bloqueada temporariamente após 5 tentativas falhadas." : "Email ou palavra-passe incorrectos.", 401, r.code ?? undefined);
    emitChange();
  },
  async signOut() {
    if (IS_DEMO) return session.viewAs(null);
    const { signOut } = await import("next-auth/react");
    await signOut({ callbackUrl: `${BASE_PATH}/` });
  },
  async resetDemo() {
    safeSet(STORE_KEY, null);
    safeSet(ACTOR_KEY, null);
    location.reload();
  },
};

/** Token de captcha: Turnstile no modo completo; caixa de verificação na demonstração. */
export const CAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
