"use client";
import * as React from "react";
import { Building2, CircleCheck, FileText, FlaskConical, Landmark, Lightbulb, Rocket, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { Abbr, Card, GLOSSARY, SectionHeading } from "@/components/ui";
import { Reveal, Stagger, StaggerItem } from "@/components/motion";
import { CtaBand, PageHeader, SubNav } from "@/components/domain";
import { usePrefersReducedMotion } from "@/lib/client/hooks";

const SECTIONS = [
  { id: "o-que-e", label: "O que é" },
  { id: "funil", label: "Funil da ideia ao negócio" },
  { id: "areas", label: "As 3 áreas" },
  { id: "quem-faz", label: "Quem faz o quê" },
  { id: "governacao", label: "Governação" },
  { id: "glossario", label: "Glossário" },
];

const FUNNEL = [
  { key: "ideia", icon: Lightbulb, title: "A ideia entra", text: "Colaboradores, startups, universidades e pessoas submetem ideias. A IA faz uma primeira análise e um gestor faz a triagem.", tone: "brand" },
  { key: "lab", icon: FlaskConical, title: "O Lab prototipa", text: "«Funciona?» Oportunidade, Estratégia, Experimentação e Passagem ao negócio, com um gate entre cada etapa.", tone: "lab" },
  { key: "inc", icon: Rocket, title: "A Incubadora faz crescer", text: "«É um negócio?» Ventures internas e startups externas ganham clientes, receita e equipa.", tone: "inc" },
  { key: "negocio", icon: Building2, title: "Incorporação no negócio", text: "Spin-in numa direcção, spin-off com participação da TIS, ou standard do Digital Office.", tone: "ok" },
] as const;

export function EcosystemView() {
  return (
    <>
      <PageHeader
        crumbs={[{ label: t("nav.ecosystem") }]}
        eyebrow="P02 · O Ecossistema"
        title="Um funil, três áreas, uma só porta de entrada."
        lead="A ideia entra, o Laboratório valida e a Incubadora faz crescer. O Digital Office garante que tudo fica bem construído."
      />
      <SubNav items={SECTIONS} />

      <section id="o-que-e" className="container-x grid gap-10 py-20 md:grid-cols-[1fr_1.2fr]">
        <Reveal>
          <SectionHeading eyebrow="O que é" title="Porque existe o ecossistema" />
        </Reveal>
        <Reveal delay={0.1} className="grid gap-4 text-lg text-fg-muted">
          <p>As boas ideias nascem em todo o lado: nas equipas da TIS, nas universidades, nas startups e nos clientes. Sem um caminho claro, perdem-se em emails e reuniões.</p>
          <p>O ecossistema dá a todas o mesmo percurso: um repositório único, uma primeira análise com IA, uma decisão de pessoas e acompanhamento até ao negócio.</p>
        </Reveal>
      </section>

      <FunnelScrolly />
      <ThreeAreas />
      <RaciMatrix />
      <Governance />
      <Glossary />
      <CtaBand title="Tem uma ideia para este funil?" lead="Comece pela porta de entrada. Leva poucos minutos." href="/submeter" label={t("nav.submit")} />
    </>
  );
}

/** Funil interactivo com scrollytelling: a ideia «viaja» do formulário ao Lab, à Incubadora e ao negócio. */
function FunnelScrolly() {
  const reduce = usePrefersReducedMotion();
  const root = React.useRef<HTMLDivElement>(null);
  const dot = React.useRef<HTMLDivElement>(null);
  const [step, setStep] = React.useState(0);

  React.useEffect(() => {
    if (!root.current) return;
    let ctx: { revert: () => void } | undefined;
    let cancelled = false;
    // GSAP e ScrollTrigger carregados só nesta página.
    Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(([{ gsap }, { ScrollTrigger }]) => {
      if (cancelled || !root.current) return;
      gsap.registerPlugin(ScrollTrigger);
      ctx = gsap.context(() => {
        ScrollTrigger.create({
          trigger: root.current,
          start: "top top+=120",
          end: "bottom bottom",
          scrub: reduce ? false : 0.6,
          onUpdate: (self) => {
            const s = Math.min(FUNNEL.length - 1, Math.floor(self.progress * FUNNEL.length));
            setStep(s);
            if (!reduce && dot.current) gsap.set(dot.current, { yPercent: 0, y: self.progress * (dot.current.parentElement!.clientHeight - 56) });
          },
        });
      }, root);
    });
    return () => {
      cancelled = true;
      ctx?.revert();
    };
  }, [reduce]);

  return (
    <section id="funil" aria-labelledby="funil-h" className="relative border-y border-line bg-surface">
      <div className="container-x pt-20">
        <SectionHeading id="funil-h" eyebrow="Scroll para seguir a ideia" title="Funil da ideia ao negócio" />
      </div>
      <div ref={root} className="container-x relative grid gap-10 pb-20 md:grid-cols-[1fr_1fr]" style={{ minHeight: reduce ? undefined : "260vh" }}>
        {/* Coluna fixa com a visualização */}
        <div className="md:sticky md:top-36 md:h-[60vh]">
          <div className="relative flex h-full min-h-96 gap-6 rounded-[var(--radius-xl)] border border-line bg-bg p-6">
            <div className="relative w-14 shrink-0">
              <div className="absolute inset-x-6 bottom-7 top-7 w-0.5 rounded bg-gradient-to-b from-brand via-lab to-inc" aria-hidden />
              <div ref={dot} className="absolute left-0 top-0 grid size-14 place-items-center rounded-full bg-fg text-bg shadow-3 will-change-transform" aria-hidden>
                <Lightbulb className="size-6" />
              </div>
            </div>
            <ol className="grid flex-1 content-between gap-3">
              {FUNNEL.map((f, i) => (
                <li
                  key={f.key}
                  className={cn(
                    "flex items-center gap-3 rounded-[var(--radius-lg)] border p-4 transition-[transform,opacity,background-color,border-color] duration-[var(--dur-enter)] ease-[var(--ease-out)]",
                    i === step ? "scale-[1.02] border-transparent bg-surface shadow-2" : "border-line opacity-55",
                  )}
                  aria-current={i === step ? "step" : undefined}
                >
                  <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl", { brand: "bg-brand-soft text-brand-ink", lab: "bg-lab-soft text-lab-ink", inc: "bg-inc-soft text-inc-ink", ok: "bg-ok-soft text-ok" }[f.tone])}>
                    <f.icon className="size-5" aria-hidden />
                  </span>
                  <span className="font-display text-lg font-bold">{f.title}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
        {/* Texto que avança com o scroll */}
        <div className="grid gap-[30vh] md:py-[10vh]">
          {FUNNEL.map((f, i) => (
            <article key={f.key} className={cn("grid gap-3 transition-opacity duration-[var(--dur-enter)]", !reduce && i !== step && "md:opacity-40")}>
              <p className="font-mono text-sm text-fg-subtle">0{i + 1} / 0{FUNNEL.length}</p>
              <h3 className="font-display text-[length:var(--text-3xl)] font-bold">{f.title}</h3>
              <p className="text-lg text-fg-muted">{f.text}</p>
              {f.key === "lab" && (
                <p className="text-sm text-fg-subtle">
                  Etapas: <Abbr term="MVK" /> → <Abbr term="MVS" /> → <Abbr term="MVP" /> → <Abbr term="MVB" />.
                </p>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ThreeAreas() {
  const areas = [
    { icon: FlaskConical, name: "Innovation Lab", q: "«Funciona?»", role: "Investigação aplicada, PoC e MVP. Capacita as equipas da TIS.", tone: "lab", tag: "Área própria, com gestor" },
    { icon: Rocket, name: "Incubadora", q: "«É um negócio?»", role: "Faz crescer ventures internas (vindas do Lab) e startups externas.", tone: "inc", tag: "Área própria, com gestor" },
    { icon: ShieldCheck, name: "Digital Office", q: "«Está bem construído?»", role: "Arquitectura, standards e assessoria técnica.", tone: "do", tag: "Parceiro transversal" },
  ];
  return (
    <section id="areas" className="container-x grid gap-10 py-24" aria-labelledby="areas-h">
      <SectionHeading id="areas-h" eyebrow="Quem é quem" title="As 3 áreas" />
      <Stagger className="grid gap-5 md:grid-cols-3">
        {areas.map((a) => (
          <StaggerItem key={a.name}>
            <Card className="grid h-full gap-4 p-7">
              <span className={cn("grid size-12 place-items-center rounded-xl", a.tone === "lab" ? "bg-lab-soft text-lab-ink" : a.tone === "inc" ? "bg-inc-soft text-inc-ink" : "bg-surface-2 text-fg-muted")}>
                <a.icon className="size-6" aria-hidden />
              </span>
              <div>
                <p className="font-mono text-sm text-fg-subtle">{a.q}</p>
                <h3 className="font-display text-2xl font-bold">{a.name}</h3>
              </div>
              <p className="text-fg-muted">{a.role}</p>
              <p className="mt-auto text-sm font-medium">{a.tag}</p>
            </Card>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}

/** Matriz «quem faz o quê» que realça a linha e a coluna ao passar o rato (ou com o foco do teclado). */
function RaciMatrix() {
  const cols = ["Lab", "Incubadora", "Digital Office", "Direcções"];
  const rows: [string, string[]][] = [
    ["Recolher e triar ideias", ["R", "R", "—", "C"]],
    ["Prova de conceito e MVP", ["R", "—", "C", "C"]],
    ["Validar arquitectura", ["C", "C", "R", "—"]],
    ["Fazer crescer ventures", ["C", "R", "C", "C"]],
    ["Converter em standard", ["C", "—", "R", "I"]],
    ["Adoptar no negócio", ["C", "C", "I", "R"]],
    ["Capacitar equipas", ["R", "C", "C", "I"]],
  ];
  const [hover, setHover] = React.useState<{ r: number; c: number } | null>(null);
  const tone = (v: string) => (v === "R" ? "bg-brand text-on-brand" : v === "C" ? "bg-brand-soft text-brand-ink" : v === "I" ? "bg-surface-2 text-fg-muted" : "text-fg-subtle");
  return (
    <section id="quem-faz" className="border-y border-line bg-surface py-24" aria-labelledby="raci-h">
      <div className="container-x grid gap-10">
        <SectionHeading id="raci-h" eyebrow="Responsabilidades" title="Quem faz o quê" lead="R = responsável · C = contribui · I = é informado. Passe o rato ou use o teclado para realçar." />
        <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-line">
          <table className="w-full min-w-[640px] border-collapse text-sm" onMouseLeave={() => setHover(null)}>
            <caption className="sr-only">Matriz de responsabilidades por actividade</caption>
            <thead>
              <tr>
                <th scope="col" className="bg-bg p-4 text-left font-medium text-fg-subtle">Actividade</th>
                {cols.map((c, ci) => (
                  <th key={c} scope="col" className={cn("bg-bg p-4 text-center font-display font-bold transition-colors", hover?.c === ci && "bg-brand-soft")}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(([act, vals], ri) => (
                <tr key={act} className="border-t border-line">
                  <th scope="row" className={cn("p-4 text-left font-medium transition-colors", hover?.r === ri && "bg-brand-soft")}>{act}</th>
                  {vals.map((v, ci) => (
                    <td
                      key={ci}
                      tabIndex={0}
                      onMouseEnter={() => setHover({ r: ri, c: ci })}
                      onFocus={() => setHover({ r: ri, c: ci })}
                      onBlur={() => setHover(null)}
                      className={cn("p-3 text-center transition-colors duration-[var(--dur-micro)]", (hover?.r === ri || hover?.c === ci) && "bg-brand-soft/60")}
                      aria-label={`${act}, ${cols[ci]}: ${v === "R" ? "responsável" : v === "C" ? "contribui" : v === "I" ? "é informado" : "sem papel"}`}
                    >
                      <span className={cn("inline-grid size-9 place-items-center rounded-lg font-mono font-bold transition-transform duration-[var(--dur-micro)]", tone(v), hover?.r === ri && hover?.c === ci && "scale-110")}>{v}</span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function Governance() {
  const items = [
    { icon: Landmark, name: "Comité de Inovação", freq: "Trimestral", text: "Ratifica os gates e decide a passagem a produto." },
    { icon: CircleCheck, name: "Fórum de Portfólio e Competência", freq: "Mensal", text: "Valida prioridades e acompanha os gates." },
    { icon: Rocket, name: "Comité de incubação", freq: "Trimestral, com o CEO como sponsor", text: "Decide as saídas das ventures." },
  ];
  return (
    <section id="governacao" className="container-x grid gap-10 py-24" aria-labelledby="gov-h">
      <SectionHeading id="gov-h" eyebrow="Decisões" title="Governação" />
      <Stagger className="grid gap-5 md:grid-cols-3">
        {items.map((g) => (
          <StaggerItem key={g.name}>
            <Card className="grid h-full gap-3 p-7">
              <g.icon className="size-6 text-brand-ink" aria-hidden />
              <h3 className="font-display text-xl font-bold">{g.name}</h3>
              <p className="w-fit rounded-full bg-surface-2 px-3 py-1 font-mono text-xs">{g.freq}</p>
              <p className="text-fg-muted">{g.text}</p>
            </Card>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}

function Glossary() {
  return (
    <section id="glossario" className="container-x grid gap-10 py-24" aria-labelledby="glo-h">
      <SectionHeading id="glo-h" eyebrow="Sem siglas por explicar" title="Glossário" />
      <dl className="grid gap-x-10 gap-y-6 md:grid-cols-2">
        {Object.entries(GLOSSARY).map(([k, v]) => (
          <Reveal key={k} className="grid gap-1 border-t border-line pt-4">
            <dt className="flex items-center gap-2 font-display text-lg font-bold"><FileText className="size-4 text-fg-subtle" aria-hidden />{k}</dt>
            <dd className="text-fg-muted">{v}</dd>
          </Reveal>
        ))}
      </dl>
    </section>
  );
}
