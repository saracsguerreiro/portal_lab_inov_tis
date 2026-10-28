"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Command } from "cmdk";
import { Toaster } from "sonner";
import { ArrowRight, FlaskConical, Eye, Lightbulb, RotateCcw, Rocket, Search } from "lucide-react";
import { t } from "@/lib/i18n";
import { roleOf } from "@/lib/permissions";
import { useQuery, useSession } from "@/lib/client/hooks";
import { IS_DEMO, session } from "@/lib/client/runtime";
import { notifyNavigated } from "@/lib/client/view-transition";
import { L } from "@/lib/domain/labels";
import { cn } from "@/lib/utils";
import { Header } from "./header";
import { Logo } from "./logo";
import { ACCOUNT_NAV, COLLAB_NAV, FOOTER_NAV, MGMT_NAV, PUBLIC_NAV, visibleFor } from "./nav-config";

export function Shell({ children }: { children: React.ReactNode }) {
  const [cmdOpen, setCmdOpen] = React.useState(false);
  const pathname = usePathname();
  React.useEffect(() => notifyNavigated(), [pathname]);
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <>
      <a href="#conteudo" className="skip-link">{t("app.skip")}</a>
      {IS_DEMO && <DemoBar />}
      <Header onOpenCommand={() => setCmdOpen(true)} />
      <main id="conteudo" tabIndex={-1} className="min-h-[70vh] outline-none">
        {children}
      </main>
      <Footer />
      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
      <SmoothScroll />
      <Toaster position="bottom-right" richColors closeButton toastOptions={{ className: "font-sans" }} />
    </>
  );
}

// ------------------------------------------------------------- «Ver como» (só na demonstração)

const DEMO_PROFILES: { id: string | null; role: string }[] = [
  { id: null, role: "VISITANTE" },
  { id: "u_ext", role: "EXTERNO" },
  { id: "u_colab", role: "COLABORADOR" },
  { id: "u_glab", role: "GESTOR_LAB" },
  { id: "u_ginc", role: "GESTOR_INCUBADORA" },
  { id: "u_ce", role: "COMISSAO_EXECUTIVA" },
];

function DemoBar() {
  const { user, ready } = useSession();
  const current = user?.id ?? null;
  return (
    <div className="relative z-50 bg-fg text-bg">
      <div className="container-x flex min-h-10 flex-wrap items-center gap-x-4 gap-y-1 py-1.5 text-xs">
        <span className="flex items-center gap-1.5 font-medium">
          <Eye className="size-3.5" aria-hidden /> {t("app.demoBanner")} · {t("app.viewAs")}:
        </span>
        <div role="radiogroup" aria-label={t("app.viewAs")} className="flex flex-wrap gap-1">
          {DEMO_PROFILES.map((p) => (
            <button
              key={p.role}
              role="radio"
              aria-checked={ready && current === p.id}
              onClick={() => session.viewAs(p.id)}
              className={cn("rounded-full px-2.5 py-1 transition-colors", ready && current === p.id ? "bg-bg text-fg" : "text-bg/75 hover:bg-bg/15 hover:text-bg")}
            >
              {L.role(p.role)}
            </button>
          ))}
        </div>
        <button onClick={() => session.resetDemo()} className="ml-auto flex items-center gap-1 text-bg/70 hover:text-bg" title="Repor os dados de demonstração">
          <RotateCcw className="size-3.5" aria-hidden /> Repor dados
        </button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------- Rodapé

function Footer() {
  return (
    <footer className="mt-24 border-t border-line bg-surface">
      <div className="container-x grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="grid content-start gap-4">
          <div className="flex items-center gap-3">
            <Logo />
            <p className="font-display font-bold">{t("app.name")}</p>
          </div>
          <p className="max-w-sm text-sm text-fg-muted">{t("app.tagline")}</p>
          <p className="text-xs text-fg-subtle">Luanda, Angola · Innovation Lab e Incubadora TIS</p>
        </div>
        <FooterCol title="Explorar" items={[{ href: "/", key: "home" }, ...PUBLIC_NAV]} />
        <FooterCol title="Participar" items={[{ href: "/submeter", key: "submit" }, { href: "/estado", key: "checkStatus" }, { href: "/entrar", key: "signIn" }, { href: "/parcerias", key: "partners" }]} />
        <FooterCol title="Informação" items={FOOTER_NAV.filter((i) => i.key !== "partners" && i.key !== "checkStatus")} />
      </div>
      <div className="border-t border-line">
        <div className="container-x flex flex-wrap items-center justify-between gap-3 py-5 text-xs text-fg-subtle">
          <p>© 2026 TIS. Nome e marca do ecossistema a definir.</p>
          <p>Protecção de dados: Lei n.º 22/11. Termos validados pelo Legal e Compliance.</p>
        </div>
      </div>
    </footer>
  );
}
function FooterCol({ title, items }: { title: string; items: { href: string; key: string }[] }) {
  return (
    <nav aria-label={title}>
      <p className="mb-3 font-mono text-xs uppercase tracking-widest text-fg-subtle">{title}</p>
      <ul className="grid gap-2">
        {items.map((i) => (
          <li key={i.href}>
            <Link href={i.href} className="text-sm text-fg-muted transition-colors hover:text-fg">{t(`nav.${i.key}`)}</Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

// ------------------------------------------------------------- Paleta de comandos (Ctrl/Cmd + K)

function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const router = useRouter();
  const { actor } = useSession();
  const role = roleOf(actor);
  const { data: projects = [] } = useQuery("listProjects", undefined, { enabled: open });
  const { data: triage = [] } = useQuery("triageList", { scope: "all" }, { enabled: open && (role === "GESTOR_LAB" || role === "GESTOR_INCUBADORA") });
  const go = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };
  const pages = [{ href: "/", key: "home" }, ...PUBLIC_NAV, { href: "/submeter", key: "submit" }, ...visibleFor(COLLAB_NAV, role), ...(role === "VISITANTE" ? [] : ACCOUNT_NAV), ...visibleFor(MGMT_NAV, role)];
  return (
    <Command.Dialog
      open={open}
      onOpenChange={onOpenChange}
      label={t("nav.commandHint")}
      className="fixed left-1/2 top-[12vh] z-[60] w-[min(640px,calc(100vw-32px))] -translate-x-1/2 overflow-hidden rounded-[var(--radius-xl)] border border-line bg-surface shadow-3 data-[state=open]:animate-[rise_var(--dur-base)_var(--ease-out)]"
      overlayClassName="fixed inset-0 z-[60] bg-black/40 backdrop-blur-[2px]"
    >
      <div className="flex items-center gap-3 border-b border-line px-4">
        <Search className="size-4 text-fg-subtle" aria-hidden />
        <Command.Input placeholder={t("nav.commandHint")} className="h-14 flex-1 bg-transparent text-base outline-none placeholder:text-fg-subtle" />
        <kbd className="rounded border border-line px-1.5 font-mono text-[10px] text-fg-subtle">ESC</kbd>
      </div>
      <Command.List className="max-h-[60vh] overflow-y-auto p-2">
        <Command.Empty className="p-6 text-center text-sm text-fg-muted">{t("states.noResults")}</Command.Empty>
        <Command.Group heading="Páginas" className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-fg-subtle">
          {pages.map((p) => (
            <CmdItem key={p.href} onSelect={() => go(p.href)} icon={<ArrowRight />}>{t(`nav.${p.key}`)}</CmdItem>
          ))}
        </Command.Group>
        {projects.length > 0 && (
          <Command.Group heading="Projectos e ventures" className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-fg-subtle">
            {projects.map((p) => (
              <CmdItem key={p.id} onSelect={() => go(`/projectos/${p.slug}`)} icon={p.area === "LAB" ? <FlaskConical className="text-lab-ink" /> : <Rocket className="text-inc-ink" />}>{p.name}</CmdItem>
            ))}
          </Command.Group>
        )}
        {triage.length > 0 && (
          <Command.Group heading="Ideias na triagem" className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-fg-subtle">
            {triage.map((i) => (
              <CmdItem key={i.id} onSelect={() => go(`/gestao/triagem?ideia=${i.id}`)} icon={<Lightbulb className="text-ai-ink" />}>
                <span className="font-mono text-xs text-fg-subtle">{i.number}</span> {i.title}
              </CmdItem>
            ))}
          </Command.Group>
        )}
      </Command.List>
    </Command.Dialog>
  );
}
function CmdItem({ children, onSelect, icon }: { children: React.ReactNode; onSelect: () => void; icon: React.ReactNode }) {
  return (
    <Command.Item onSelect={onSelect} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-[var(--radius-md)] px-3 text-sm data-[selected=true]:bg-surface-2 [&_svg]:size-4">
      {icon}
      <span className="flex-1 truncate">{children}</span>
    </Command.Item>
  );
}

// ------------------------------------------------------------- Lenis (scroll suave), só na zona pública

const LENIS_ROUTES = ["/", "/ecossistema", "/laboratorio", "/incubadora"];
function SmoothScroll() {
  const pathname = usePathname() ?? "/";
  const enabled = LENIS_ROUTES.includes(pathname.replace(/\/$/, "") || "/");
  React.useEffect(() => {
    if (!enabled || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let lenis: { raf: (t: number) => void; destroy: () => void } | null = null;
    let raf = 0;
    let cancelled = false;
    import("lenis").then(({ default: Lenis }) => {
      if (cancelled) return;
      lenis = new Lenis({ duration: 1.05, smoothWheel: true });
      (window as unknown as { __lenis?: unknown }).__lenis = lenis;
      const loop = (time: number) => {
        lenis!.raf(time);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      lenis?.destroy();
      (window as unknown as { __lenis?: unknown }).__lenis = undefined;
    };
  }, [enabled]);
  return null;
}
