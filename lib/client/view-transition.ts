"use client";
// Transições entre páginas com a View Transitions API (com alternativa normal).
// O cartão e a ficha partilham `view-transition-name` para a transição partilhada.
let pendingResolve: (() => void) | null = null;

/** Chamado pelo componente que observa a rota quando a nova página já está no DOM. */
export function notifyNavigated() {
  const r = pendingResolve;
  pendingResolve = null;
  if (r) requestAnimationFrame(() => r());
}

type Doc = Document & { startViewTransition?: (cb: () => Promise<void> | void) => { finished: Promise<void> } };

export function navigateWithTransition(push: (href: string) => void, href: string) {
  const doc = document as Doc;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!doc.startViewTransition || reduce) return push(href);
  doc.startViewTransition(
    () =>
      new Promise<void>((resolve) => {
        pendingResolve = resolve;
        push(href);
        setTimeout(() => notifyNavigated(), 800); // nunca bloqueia a navegação
      }),
  );
}

/** Mudança de tema animada: círculo a crescer a partir do botão. */
export function toggleThemeAnimated(next: "light" | "dark", origin?: { x: number; y: number }) {
  const apply = () => {
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("eco-theme", next);
    } catch {
      /* ignora */
    }
  };
  const doc = document as Doc;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!doc.startViewTransition || reduce) return apply();
  const x = origin?.x ?? innerWidth - 40;
  const y = origin?.y ?? 40;
  const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  document.documentElement.style.viewTransitionName = "theme";
  const vt = doc.startViewTransition(apply);
  (vt as unknown as { ready: Promise<void> }).ready
    .then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
        { duration: 520, easing: "cubic-bezier(0.22, 1, 0.36, 1)", pseudoElement: "::view-transition-new(theme)" },
      );
    })
    .catch(() => {});
  vt.finished.finally(() => (document.documentElement.style.viewTransitionName = ""));
}
