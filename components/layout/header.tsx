"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Popover from "@radix-ui/react-popover";
import * as Dropdown from "@radix-ui/react-dropdown-menu";
import { Bell, ChevronDown, LogOut, Menu, Moon, Search, Sparkles, Sun, UserRound, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { t, fmtRelative } from "@/lib/i18n";
import { cn, initials } from "@/lib/utils";
import { roleOf, PAGE_ACCESS } from "@/lib/permissions";
import { useQuery, useSession } from "@/lib/client/hooks";
import { mutate, session } from "@/lib/client/runtime";
import { toggleThemeAnimated } from "@/lib/client/view-transition";
import { L } from "@/lib/domain/labels";
import { Button } from "@/components/ui";
import { AppLink } from "./app-link";
import { ACCOUNT_NAV, COLLAB_NAV, MGMT_NAV, PUBLIC_NAV, visibleFor } from "./nav-config";
import { Logo } from "./logo";

export function Header({ onOpenCommand }: { onOpenCommand: () => void }) {
  const pathname = usePathname() ?? "/";
  const { user, actor, ready } = useSession();
  const role = roleOf(actor);
  const [open, setOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  React.useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  React.useEffect(() => setOpen(false), [pathname]);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`));
  const canSubmit = PAGE_ACCESS.P12.includes(role);
  const workspace = [...visibleFor(COLLAB_NAV, role), ...visibleFor(MGMT_NAV, role)];

  return (
    <header className={cn("sticky top-0 z-40 transition-[background-color,box-shadow,backdrop-filter] duration-[var(--dur-base)]", scrolled ? "bg-bg/85 shadow-1 backdrop-blur-xl" : "bg-bg/60 backdrop-blur-md")}>
      <div className="container-x flex h-16 items-center gap-3 md:h-[72px]">
        <Link href="/" className="mr-2 flex shrink-0 items-center gap-2.5 rounded-lg" aria-label={`${t("app.name")} — ${t("nav.home")}`}>
          <Logo />
          <span className="hidden font-display text-[15px] font-bold leading-tight sm:block">
            Ecossistema<br />
            <span className="text-fg-muted">de Inovação TIS</span>
          </span>
        </Link>

        <nav aria-label="Principal" className="hidden flex-1 xl:block">
          <ul className="flex items-center gap-0.5">
            {PUBLIC_NAV.map((i) => (
              <li key={i.href}>
                <AppLink
                  href={i.href}
                  aria-current={isActive(i.href) ? "page" : undefined}
                  className={cn(
                    "relative whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium text-fg-muted transition-colors hover:text-fg",
                    isActive(i.href) && "text-fg",
                  )}
                >
                  {isActive(i.href) && <motion.span layoutId="nav-pill" className="absolute inset-0 -z-10 rounded-full bg-surface-2" transition={{ type: "spring", stiffness: 380, damping: 30 }} />}
                  {t(`nav.${i.key}`)}
                </AppLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <button
            onClick={onOpenCommand}
            className="hidden h-10 items-center gap-2 rounded-full border border-line bg-surface px-3 text-sm text-fg-subtle transition-colors hover:border-line-strong hover:text-fg md:flex"
            aria-label={`${t("nav.search")} (Ctrl+K)`}
          >
            <Search className="size-4" aria-hidden />
            <span className="hidden 2xl:inline">{t("nav.search")}</span>
            <kbd className="hidden rounded border border-line px-1.5 font-mono text-[10px] 2xl:inline">⌘K</kbd>
          </button>
          <ThemeToggle />
          {user && <NotificationBell />}
          {canSubmit && (
            <Button asChild size="sm" className="hidden h-10 px-4 sm:inline-flex">
              <AppLink href="/submeter">
                <Sparkles aria-hidden /> {t("nav.submit")}
              </AppLink>
            </Button>
          )}
          {ready && (user ? <AccountMenu name={user.name} role={user.role} /> : (
            <Button asChild variant="secondary" size="sm" className="h-10 px-4">
              <AppLink href="/entrar">{t("nav.signIn")}</AppLink>
            </Button>
          ))}
          <button className="grid size-10 place-items-center rounded-full hover:bg-surface-2 xl:hidden" onClick={() => setOpen(true)} aria-label={t("nav.menu")} aria-expanded={open} aria-controls="mobile-menu">
            <Menu className="size-5" />
          </button>
        </div>
      </div>

      {workspace.length > 0 && (
        <div className="border-y border-line bg-surface/70 backdrop-blur">
          <nav aria-label="Área de trabalho" className="container-x flex h-11 items-center gap-1 overflow-x-auto [scrollbar-width:none]">
            <span className="mr-2 shrink-0 text-xs font-bold uppercase tracking-[var(--ds-letter-spacing-wider)] text-fg-subtle">{L.role(role)}</span>
            {workspace.map((i) => (
              <AppLink
                key={i.href}
                href={i.href}
                aria-current={isActive(i.href) ? "page" : undefined}
                className={cn("shrink-0 rounded-lg px-2.5 py-1.5 text-sm text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg", isActive(i.href) && "bg-surface-2 font-medium text-fg")}
              >
                {t(`nav.${i.key}`)}
              </AppLink>
            ))}
          </nav>
        </div>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label={t("nav.menu")}
            className="fixed inset-0 z-50 bg-bg xl:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="container-x flex h-16 items-center justify-between">
              <Logo />
              <button className="grid size-11 place-items-center rounded-full hover:bg-surface-2" onClick={() => setOpen(false)} aria-label={t("nav.closeMenu")} autoFocus>
                <X className="size-5" />
              </button>
            </div>
            <nav className="container-x grid max-h-[calc(100dvh-64px)] gap-6 overflow-y-auto pb-10 pt-4">
              <MobileGroup items={[{ href: "/", key: "home" }, ...PUBLIC_NAV]} isActive={isActive} big />
              {workspace.length > 0 && <MobileGroup title={L.role(role)} items={workspace} isActive={isActive} />}
              {user && <MobileGroup title={t("nav.profile")} items={ACCOUNT_NAV} isActive={isActive} />}
              <div className="grid gap-2">
                {canSubmit && <Button asChild size="lg"><Link href="/submeter"><Sparkles /> {t("nav.submit")}</Link></Button>}
                {!user && <Button asChild variant="secondary" size="lg"><Link href="/entrar">{t("nav.signIn")}</Link></Button>}
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

function MobileGroup({ title, items, isActive, big }: { title?: string; items: { href: string; key: string }[]; isActive: (h: string) => boolean; big?: boolean }) {
  return (
    <div>
      {title && <p className="mb-2 text-xs font-bold uppercase tracking-[var(--ds-letter-spacing-wider)] text-fg-subtle">{title}</p>}
      <ul className="grid">
        {items.map((i, n) => (
          <motion.li key={i.href} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: n * 0.03, duration: 0.3 }}>
            <Link href={i.href} aria-current={isActive(i.href) ? "page" : undefined} className={cn("flex min-h-12 items-center border-b border-line", big ? "font-display text-2xl font-bold" : "text-lg", isActive(i.href) && "text-brand-ink")}>
              {t(`nav.${i.key}`)}
            </Link>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

export function ThemeToggle() {
  const [theme, setTheme] = React.useState<"light" | "dark">("light");
  React.useEffect(() => setTheme((document.documentElement.dataset.mode as "light" | "dark") ?? "light"), []);
  return (
    <button
      className="relative grid size-10 place-items-center overflow-hidden rounded-full text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
      aria-label={t("nav.theme")}
      aria-pressed={theme === "dark"}
      onClick={(e) => {
        const next = theme === "dark" ? "light" : "dark";
        const r = e.currentTarget.getBoundingClientRect();
        toggleThemeAnimated(next, { x: r.left + r.width / 2, y: r.top + r.height / 2 });
        setTheme(next);
      }}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={theme} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
          {theme === "dark" ? <Moon className="size-[18px]" /> : <Sun className="size-[18px]" />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}

function NotificationBell() {
  const { data = [] } = useQuery("listNotifications");
  const unread = data.filter((n) => !n.readAt).length;
  const [ring, setRing] = React.useState(false);
  const prev = React.useRef(unread);
  React.useEffect(() => {
    if (unread > prev.current) {
      setRing(true);
      const t2 = setTimeout(() => setRing(false), 900);
      return () => clearTimeout(t2);
    }
    prev.current = unread;
  }, [unread]);
  return (
    <Popover.Root onOpenChange={(o) => !o && unread && mutate("markNotificationsRead")}>
      <Popover.Trigger className="relative grid size-10 place-items-center rounded-full text-fg-muted hover:bg-surface-2 hover:text-fg" aria-label={`${t("nav.notifications")}${unread ? ` (${unread} por ler)` : ""}`}>
        <Bell className={cn("size-[18px]", ring && "animate-[bell_0.8s_ease-in-out]")} />
        <AnimatePresence>
          {unread > 0 && (
            <motion.span
              key={unread}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 20 }}
              className="absolute right-1 top-1 grid min-w-[18px] place-items-center rounded-full bg-inc px-1 font-mono text-[10px] font-bold leading-[18px] text-white"
              aria-hidden
            >
              {unread}
            </motion.span>
          )}
        </AnimatePresence>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="end" sideOffset={8} className="z-50 w-[min(380px,calc(100vw-32px))] rounded-[var(--radius-lg)] border border-line bg-surface p-2 shadow-3 data-[state=open]:animate-[rise_var(--dur-base)_var(--ease-out)]">
          <p className="px-3 py-2 font-display font-bold">{t("nav.notifications")}</p>
          {data.length === 0 ? (
            <p className="px-3 pb-4 text-sm text-fg-muted">Sem notificações.</p>
          ) : (
            <ul className="max-h-96 overflow-y-auto">
              {data.map((n) => (
                <li key={n.id}>
                  <Link href={n.href ?? "#"} className="flex gap-3 rounded-[var(--radius-md)] px-3 py-2.5 hover:bg-surface-2">
                    <span className={cn("mt-2 size-2 shrink-0 rounded-full", n.readAt ? "bg-transparent" : "bg-inc")} aria-hidden />
                    <span className="grid gap-0.5">
                      <span className="text-sm font-medium">{n.title}</span>
                      <span className="line-clamp-2 text-sm text-fg-muted">{n.body}</span>
                      <span className="text-xs text-fg-subtle">{fmtRelative(n.at)} · {n.channels.join(" · ")}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function AccountMenu({ name, role }: { name: string; role: string }) {
  return (
    <Dropdown.Root>
      <Dropdown.Trigger className="flex h-10 items-center gap-2 rounded-full border border-line bg-surface pl-1 pr-2.5 text-sm hover:border-line-strong" aria-label={`Conta: ${name}`}>
        <span className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-lab to-brand font-mono text-xs font-bold text-white">{initials(name)}</span>
        <ChevronDown className="size-4 text-fg-subtle" aria-hidden />
      </Dropdown.Trigger>
      <Dropdown.Portal>
        <Dropdown.Content align="end" sideOffset={8} className="z-50 min-w-60 rounded-[var(--radius-lg)] border border-line bg-surface p-1.5 shadow-3 data-[state=open]:animate-[rise_var(--dur-base)_var(--ease-out)]">
          <div className="px-3 py-2">
            <p className="font-medium">{name}</p>
            <p className="text-xs text-fg-subtle">{L.role(role)}</p>
          </div>
          <Dropdown.Separator className="my-1 h-px bg-line" />
          {ACCOUNT_NAV.map((i) => (
            <Dropdown.Item key={i.href} asChild>
              <Link href={i.href} className="flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm outline-none data-[highlighted]:bg-surface-2">
                {i.key === "profile" ? <UserRound className="size-4" /> : null}
                {t(`nav.${i.key}`)}
              </Link>
            </Dropdown.Item>
          ))}
          <Dropdown.Separator className="my-1 h-px bg-line" />
          <Dropdown.Item onSelect={() => session.signOut()} className="flex min-h-10 cursor-pointer items-center gap-2 rounded-lg px-3 text-sm text-danger outline-none data-[highlighted]:bg-danger-soft">
            <LogOut className="size-4" /> {t("nav.signOut")}
          </Dropdown.Item>
        </Dropdown.Content>
      </Dropdown.Portal>
    </Dropdown.Root>
  );
}
