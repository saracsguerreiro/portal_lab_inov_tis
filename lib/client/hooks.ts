"use client";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { ArgsOf, Method, ResultOf } from "@/lib/services";
import { api, ApiError, demoPristine, getVersion, session, subscribe, type SessionUser } from "./runtime";
import type { Actor } from "@/lib/domain/types";

export function useDataVersion() {
  return useSyncExternalStore(subscribe, getVersion, () => 0);
}

export interface QueryState<T> {
  data: T | undefined;
  error: ApiError | null;
  loading: boolean;
  reload: () => void;
}

/** Lê dados de uma acção. Recarrega quando os dados mudam (mutações, sessão, fila da IA). */
export function useQuery<M extends Method>(method: M, args?: ArgsOf<M>, opts: { initialData?: ResultOf<M>; enabled?: boolean } = {}): QueryState<ResultOf<M>> {
  const v = useDataVersion();
  const key = JSON.stringify(args ?? null);
  const [state, setState] = useState<{ data: ResultOf<M> | undefined; error: ApiError | null; loading: boolean }>({
    data: opts.initialData,
    error: null,
    loading: opts.initialData === undefined,
  });
  const [tick, setTick] = useState(0);
  const enabled = opts.enabled ?? true;
  useEffect(() => {
    if (!enabled) return;
    // Página gerada no build com os mesmos dados: não refaz o pedido (poupa o arranque).
    if (opts.initialData !== undefined && v === 0 && tick === 0 && demoPristine()) return;
    let alive = true;
    setState((s) => ({ ...s, loading: s.data === undefined }));
    api(method, args)
      .then((data) => alive && setState({ data, error: null, loading: false }))
      .catch((e: unknown) => alive && setState((s) => ({ data: s.data, error: e instanceof ApiError ? e : new ApiError(String(e)), loading: false })));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [method, key, v, tick, enabled]);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, reload };
}

/** Sessão actual. `ready` fica true depois da primeira leitura (evita piscar o menu). */
export function useSession(): { user: SessionUser | null; actor: Actor; ready: boolean } {
  const v = useDataVersion();
  const [state, setState] = useState<{ user: SessionUser | null; ready: boolean }>({ user: null, ready: false });
  useEffect(() => {
    let alive = true;
    session
      .me()
      .then((user) => alive && setState({ user, ready: true }))
      .catch(() => alive && setState({ user: null, ready: true }));
    return () => {
      alive = false;
    };
  }, [v]);
  const actor: Actor = state.user ? { kind: "user", user: state.user as never } : { kind: "visitor" };
  return { ...state, actor };
}

export function usePrefersReducedMotion() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

/** Rascunho automático em localStorage (formulários F1 e F2). */
export function useDraft<T>(key: string, value: T, enabled = true) {
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const first = useRef(true);
  useEffect(() => {
    if (!enabled) return;
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        setSavedAt(Date.now());
      } catch {
        /* sem armazenamento */
      }
    }, 600);
    return () => clearTimeout(t);
  }, [key, value, enabled]);
  return savedAt;
}
export function readDraft<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
export function clearDraft(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignora */
  }
}

export function useInView<T extends Element>(opts: IntersectionObserverInit = { threshold: 0.2 }) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setInView(true), opts);
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView]);
  return [ref, inView] as const;
}
