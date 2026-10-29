"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, CalendarDays, FlaskConical, Lightbulb, MapPin, Rocket, Sparkles } from "lucide-react";
import type { Challenge, Content, Partner } from "@/lib/domain/types";
import type { ProjectCard as ProjectCardT } from "@/lib/services/projects";
import { t, fmtDate } from "@/lib/i18n";
import { useQuery, useSession } from "@/lib/client/hooks";
import { PAGE_ACCESS, roleOf } from "@/lib/permissions";
import { L } from "@/lib/domain/labels";
import { Button, Card, Progress, SectionHeading, Tag } from "@/components/ui";
import { Counter, CssRise, Reveal, Stagger, StaggerItem, WordReveal, TiltCard } from "@/components/motion";
import { AreaTag, Countdown, CtaBand, ProjectCard, StatusTag } from "@/components/domain";
import { AppLink } from "@/components/layout/app-link";

// O shader WebGL só é carregado nesta página e depois da primeira pintura.
const HeroShader = dynamic(() => import("@/components/motion/hero-shader"), { ssr: false });

interface Props {
  stats: { ideas: number; activeProjects: number; startups: number; partners: number };
  featured: ProjectCardT[];
  challenges: (Challenge & { participations: number })[];
  news: Content[];
  partners: Partner[];
}

export function HomeView({ stats, featured, challenges, news, partners }: Props) {
  const { user, actor } = useSession();
  const canSubmit = PAGE_ACCESS.P12.includes(roleOf(actor));
  // Com login, a montra pode incluir mais destaques; os números são sempre agregados.
  const { data: liveStats = stats } = useQuery("getPublicStats", undefined, { initialData: stats });
  return (
    <>
      {/* Banner principal */}
      <section className="relative isolate overflow-hidden">
        <HeroShader className="absolute inset-0 -z-10" />
        <div className="bg-grid absolute inset-0 -z-10 opacity-60" aria-hidden />
        <div className="container-x grid min-h-[78vh] content-center gap-8 py-20 md:py-28">
          {user && <PersonalBlock />}
          <CssRise>
            <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/70 px-3 py-1.5 text-sm text-fg-muted backdrop-blur">
              <span className="size-2 rounded-full bg-lab" aria-hidden /> Innovation Lab
              <span className="text-fg-subtle">+</span>
              <span className="size-2 rounded-full bg-inc" aria-hidden /> Incubadora
            </p>
          </CssRise>
          <h1 className="max-w-5xl text-balance font-display text-[length:var(--text-5xl)] font-bold leading-[1.04] tracking-[-0.03em]">
            <WordReveal text="Da ideia ao negócio, inovamos juntos em Angola." highlight={["ideia", "negócio"]} />
          </h1>
          <CssRise delay={0.35}>
            <p className="max-w-2xl text-balance text-lg text-fg-muted md:text-xl">
              O ecossistema de inovação da TIS recolhe ideias de dentro e de fora da empresa, testa-as no Laboratório e fá-las crescer na Incubadora.
            </p>
          </CssRise>
          <CssRise delay={0.45} className="flex flex-wrap gap-3">
            {canSubmit && (
              <Button asChild size="lg">
                <AppLink href="/submeter"><Sparkles /> {t("nav.submit")}</AppLink>
              </Button>
            )}
            <Button asChild size="lg" variant="secondary" className="bg-surface/80 backdrop-blur">
              <AppLink href="/ecossistema">Conhecer o ecossistema <ArrowRight /></AppLink>
            </Button>
          </CssRise>
        </div>
      </section>

      {/* Números agregados */}
      <section aria-label="O ecossistema em números" className="container-x -mt-10 relative z-10">
        <Card className="grid grid-cols-2 divide-line overflow-hidden md:grid-cols-4 md:divide-x">
          {[
            ["Ideias recebidas", liveStats.ideas, "brand"],
            ["Projectos activos", liveStats.activeProjects, "lab"],
            ["Startups apoiadas", liveStats.startups, "inc"],
            ["Parceiros", liveStats.partners, "ai"],
          ].map(([label, value, tone], i) => (
            <div key={label as string} className="grid gap-1 border-line p-6 md:p-8 [&:nth-child(-n+2)]:border-b md:[&:nth-child(-n+2)]:border-b-0">
              <Counter value={value as number} className={`text-[length:var(--text-4xl)] font-semibold tracking-tight ${{ brand: "text-brand-ink", lab: "text-lab-ink", inc: "text-inc-ink", ai: "text-ai-ink" }[tone as "brand"]}`} duration={1.2 + i * 0.15} />
              <span className="text-sm text-fg-muted">{label}</span>
            </div>
          ))}
        </Card>
      </section>

      {/* Lab e Incubadora (bento) */}
      <section className="container-x mt-24 grid gap-5 md:grid-cols-2" aria-labelledby="areas-h">
        <h2 id="areas-h" className="sr-only">As duas áreas</h2>
        {[
          { href: "/laboratorio", tone: "lab", icon: FlaskConical, q: "«Funciona?»", title: "Innovation Lab", text: "Investigação aplicada, provas de conceito e MVP. Capacita as equipas da TIS e testa depressa, com evidência.", cta: "Conhecer o Laboratório" },
          { href: "/incubadora", tone: "inc", icon: Rocket, q: "«É um negócio?»", title: "Incubadora", text: "Faz crescer ventures internas vindas do Lab e startups angolanas, até ao spin-in, ao spin-off ou ao encerramento.", cta: "Conhecer a Incubadora" },
        ].map((a, i) => (
          <Reveal key={a.href} delay={i * 0.1}>
            <TiltCard max={4}>
              <AppLink href={a.href} className={`group relative flex min-h-80 flex-col justify-between overflow-hidden rounded-[var(--radius-xl)] border border-line bg-surface p-8 shadow-1 transition-shadow md:p-10 ${a.tone === "lab" ? "hover:shadow-[var(--glow-lab)]" : "hover:shadow-[var(--glow-inc)]"}`}>
                <div className={`pointer-events-none absolute -right-24 -top-24 size-72 rounded-full blur-3xl transition-transform duration-700 group-hover:scale-125 ${a.tone === "lab" ? "bg-lab/25" : "bg-inc/25"}`} aria-hidden />
                <div className="relative flex items-center justify-between">
                  <span className={`grid size-14 place-items-center rounded-2xl ${a.tone === "lab" ? "bg-lab-soft text-lab-ink" : "bg-inc-soft text-inc-ink"}`}><a.icon className="size-7" aria-hidden /></span>
                  <span className="font-mono text-sm text-fg-subtle">{a.q}</span>
                </div>
                <div className="relative grid gap-3">
                  <h3 className="font-display text-[length:var(--text-3xl)] font-bold">{a.title}</h3>
                  <p className="max-w-md text-fg-muted">{a.text}</p>
                  <span className={`flex items-center gap-1.5 font-medium ${a.tone === "lab" ? "text-lab-ink" : "text-inc-ink"}`}>{a.cta} <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></span>
                </div>
              </AppLink>
            </TiltCard>
          </Reveal>
        ))}
      </section>

      {/* Projectos em destaque */}
      {featured.length > 0 && (
        <section className="container-x mt-28 grid gap-10" aria-labelledby="destaques-h">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionHeading id="destaques-h" eyebrow="Montra" title="Projectos em destaque" lead="Resultados reais do Laboratório e da Incubadora." />
            <Button asChild variant="secondary"><AppLink href="/projectos">{t("actions.seeAll")} <ArrowRight /></AppLink></Button>
          </div>
          <Stagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((p) => (
              <StaggerItem key={p.id} className="h-full"><ProjectCard p={p} showVisibility={false} /></StaggerItem>
            ))}
          </Stagger>
        </section>
      )}

      {/* Desafios e notícias (bento) */}
      <section className="container-x mt-28 grid gap-5 lg:grid-cols-[1.15fr_1fr]">
        <div className="grid content-start gap-6">
          <SectionHeading eyebrow="Participe" title="Desafios abertos" />
          {challenges.length === 0 ? (
            <Card className="p-8 text-fg-muted">De momento não há desafios abertos. Volte em breve.</Card>
          ) : (
            <Stagger className="grid gap-4">
              {challenges.map((c) => (
                <StaggerItem key={c.id}>
                  <AppLink href={`/desafios/${c.slug}`} className="group grid gap-4 rounded-[var(--radius-lg)] border border-line bg-surface p-6 shadow-1 transition-[border-color,transform] hover:-translate-y-0.5 hover:border-line-strong">
                    <div className="flex flex-wrap items-center gap-2"><AreaTag area={c.area} /><Tag>{L.audience(c.audience)}</Tag></div>
                    <h3 className="font-display text-xl font-bold">{c.title}</h3>
                    <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                      <Countdown to={c.closesAt} compact />
                      <span className="text-fg-muted">{c.participations} participações</span>
                    </div>
                    <Progress value={(c.participations / (c.targetParticipations ?? 20)) * 100} tone={c.area === "LAB" ? "lab" : "inc"} label="Participações face ao objectivo" />
                  </AppLink>
                </StaggerItem>
              ))}
            </Stagger>
          )}
        </div>
        <div className="grid content-start gap-6">
          <SectionHeading eyebrow="Agenda" title="Notícias e eventos" />
          <Stagger className="grid gap-4">
            {news.map((n) => (
              <StaggerItem key={n.id}>
                <AppLink href={`/noticias/${n.slug}`} className="group flex gap-4 rounded-[var(--radius-lg)] border border-line bg-surface p-4 shadow-1 transition-colors hover:border-line-strong">
                  <div className="grid size-20 shrink-0 place-items-center rounded-[var(--radius-md)] text-white" style={{ background: n.cover }}>
                    {n.kind === "NOTICIA" ? <Lightbulb className="size-6" aria-hidden /> : <CalendarDays className="size-6" aria-hidden />}
                  </div>
                  <div className="grid content-center gap-1">
                    <Tag tone={n.kind === "NOTICIA" ? "neutral" : "brand"} className="w-fit">{L.contentKind(n.kind)}</Tag>
                    <h3 className="font-medium leading-snug group-hover:underline">{n.title}</h3>
                    <p className="flex items-center gap-2 text-xs text-fg-subtle">
                      {fmtDate(n.date ?? n.publishedAt)}
                      {n.place && <><MapPin className="size-3" aria-hidden /> {n.place}</>}
                    </p>
                  </div>
                </AppLink>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* Parceiros: faixa contínua */}
      {partners.length > 0 && (
        <section className="mt-28" aria-labelledby="parceiros-h">
          <div className="container-x mb-8 flex items-end justify-between">
            <SectionHeading id="parceiros-h" eyebrow="Rede" title="Parceiros" />
            <Link href="/parcerias" className="flex items-center gap-1 text-sm font-medium text-brand-ink hover:underline">Ver parcerias <ArrowUpRight className="size-4" /></Link>
          </div>
          <div className="relative overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_10%,black_90%,transparent)]">
            <ul className="marquee flex w-max gap-4">
              {[...partners, ...partners].map((p, i) => (
                <li key={`${p.id}-${i}`} aria-hidden={i >= partners.length || undefined} className="flex h-20 min-w-60 items-center gap-3 rounded-[var(--radius-lg)] border border-line bg-surface px-5">
                  <span className="grid size-11 place-items-center rounded-xl bg-fg font-display text-sm font-bold text-bg">{p.logo}</span>
                  <span className="text-sm font-medium">{p.name}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <CtaBand title="Tem uma ideia?" lead="Partilhe-a connosco. A nossa equipa responde em poucos dias úteis e acompanha cada passo." href="/submeter" label={t("nav.submit")} />
    </>
  );
}

/** Com login: bloco pessoal com o estado da última ideia. */
function PersonalBlock() {
  const { data, loading } = useQuery("listMyIdeas");
  const last = data?.[0];
  return (
    <Reveal>
      <Card className="flex max-w-xl flex-wrap items-center gap-4 bg-surface/85 p-4 backdrop-blur">
        <span className="grid size-11 place-items-center rounded-xl bg-brand-soft text-brand-ink"><Lightbulb className="size-5" aria-hidden /></span>
        <div className="grid flex-1 gap-0.5">
          <p className="text-xs font-medium uppercase tracking-wider text-fg-subtle">{t("nav.myIdeas")}</p>
          {loading ? <span className="skeleton h-4 w-48" /> : last ? (
            <p className="flex flex-wrap items-center gap-2 text-sm"><span className="font-medium">{last.title}</span><StatusTag status={last.status} decision={last.decision} /></p>
          ) : <p className="text-sm text-fg-muted">Ainda não submeteu ideias.</p>}
        </div>
        <Button asChild size="sm" variant="secondary"><AppLink href={last ? `/conta/ideias/${last.id}` : "/conta/ideias"}>Abrir</AppLink></Button>
      </Card>
    </Reveal>
  );
}
