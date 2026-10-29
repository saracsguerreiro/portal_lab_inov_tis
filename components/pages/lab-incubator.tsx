"use client";
import * as React from "react";
import { ArrowRight, BrainCircuit, Building, Code2, FlaskConical, GraduationCap, Handshake, Layers, Network, Plus, Rocket, Shapes, Users, XCircle } from "lucide-react";
import { motion, useScroll, useTransform, useReducedMotion, AnimatePresence } from "motion/react";
import type { Content, Partner } from "@/lib/domain/types";
import type { ProjectCard as ProjectCardT } from "@/lib/services/projects";
import { t } from "@/lib/i18n";
import { cn, initials } from "@/lib/utils";
import { useQuery } from "@/lib/client/hooks";
import { Abbr, Button, Card, EmptyState, SectionHeading, Tag } from "@/components/ui";
import { Reveal, Stagger, StaggerItem } from "@/components/motion";
import { CtaBand, PageHeader, ProjectCard, SubNav } from "@/components/domain";
import { AppLink } from "@/components/layout/app-link";

// =============================================================== P03 Laboratório

const LINES = [
  { key: "L1", icon: BrainCircuit, title: "IA local", text: "Modelos de linguagem e visão a correr no centro de dados da TIS, em português de Angola. Os dados e a propriedade intelectual ficam dentro do país.", examples: ["Assistentes internos", "Leitura de documentos", "Detecção de anomalias"] },
  { key: "L2", icon: Users, title: "Formas de trabalhar", text: "Equipas multidisciplinares, playbooks e rituais que reduzem o tempo entre a ideia e o primeiro teste com utilizadores.", examples: ["Squad Playbook", "Kanban de propostas", "Facilitação"] },
  { key: "L3", icon: Code2, title: "Desenvolvimento web", text: "Portais, APIs e design system comuns, com acessibilidade e desempenho como regra.", examples: ["Portal de autoatendimento", "Design system TIS"] },
  { key: "L4", icon: Shapes, title: "Protótipos rápidos", text: "Protótipos em dias, não em meses, para testar com clientes antes de investir.", examples: ["Leitor de facturas", "Realidade aumentada"] },
];

const METHOD = [
  { key: "MVK", title: "Oportunidade", q: "Conhecer o problema", evidence: "Cartão de oportunidade" },
  { key: "MVS", title: "Estratégia", q: "Priorizar e formular a hipótese", evidence: "Matriz de scoring e GUT" },
  { key: "MVP", title: "Experimentação", q: "Prova de conceito, protótipo, MVP", evidence: "Test cards, métrica de abandono, learning card · arquitectura validada pelo Digital Office" },
  { key: "MVB", title: "Passagem ao negócio", q: "Pacote de handover", evidence: "Aceitação escrita, controlo aos 7 e aos 21 dias" },
];

export function LabView({ projects, team, partners }: { projects: ProjectCardT[]; team: Content[]; partners: Partner[] }) {
  const { data: live = projects } = useQuery("listProjects", undefined, { initialData: projects });
  const labProjects = live.filter((p) => p.area === "LAB");
  return (
    <>
      <PageHeader tone="lab" crumbs={[{ label: t("nav.lab") }]} eyebrow="P03 · Innovation Lab · «Funciona?»" title="Testamos depressa, com evidência." lead="O Laboratório faz investigação aplicada, provas de conceito e MVP, e capacita as equipas da TIS a inovar." actions={<Button asChild variant="lab" size="lg"><AppLink href="/submeter">{t("nav.submit")} <ArrowRight /></AppLink></Button>} />
      <SubNav tone="lab" items={[
        { id: "missao", label: "Missão e 2 motores" },
        { id: "linhas", label: "Linhas L1 a L4" },
        { id: "metodo", label: "Como trabalhamos" },
        { id: "projectos", label: "Projectos do Lab" },
        { id: "equipa", label: "Equipa" },
        { id: "parcerias", label: "Parcerias e estágios" },
      ]} />

      <section id="missao" className="container-x grid gap-10 py-20" aria-labelledby="mis-h">
        <SectionHeading id="mis-h" eyebrow="Missão" title="Dois motores, uma missão" lead="Transformar problemas reais em soluções testadas que o negócio adopta." />
        <Stagger className="grid gap-5 md:grid-cols-2">
          {[
            { icon: Building, title: "Motor interno", text: "Investigação aplicada para as direcções da TIS e capacitação das equipas em IA, produto e formas de trabalhar." },
            { icon: Network, title: "Motor externo", text: "Trabalho conjunto com universidades, startups e grandes clientes, para trazer conhecimento e mercado para dentro." },
          ].map((m) => (
            <StaggerItem key={m.title}>
              <Card className="grid h-full gap-3 p-8">
                <m.icon className="size-7 text-lab-ink" aria-hidden />
                <h3 className="font-display text-2xl font-bold">{m.title}</h3>
                <p className="text-fg-muted">{m.text}</p>
              </Card>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      <LinesSection projects={labProjects} />
      <MethodTimeline />

      <section id="projectos" className="container-x grid gap-10 py-24" aria-labelledby="lp-h">
        <SectionHeading id="lp-h" eyebrow="Montra" title="Projectos do Lab" />
        {labProjects.length === 0 ? <EmptyState title="Sem projectos públicos de momento." /> : (
          <Stagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {labProjects.slice(0, 6).map((p) => <StaggerItem key={p.id} className="h-full"><ProjectCard p={p} /></StaggerItem>)}
          </Stagger>
        )}
        <Button asChild variant="secondary" className="w-fit"><AppLink href="/projectos?area=LAB">Ver todos os projectos do Lab <ArrowRight /></AppLink></Button>
      </section>

      <section id="equipa" className="border-y border-line bg-surface py-24" aria-labelledby="eq-h">
        <div className="container-x grid gap-10">
          <SectionHeading id="eq-h" eyebrow="Pessoas" title="Equipa" lead="Toque num cartão para ver o que cada pessoa faz." />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {team.map((m, i) => <FlipCard key={m.id} name={m.title} role={m.summary} i={i} />)}
          </div>
          <p className="text-sm text-fg-subtle">Fotografias publicadas só com autorização. Sem autorização, mostramos as iniciais.</p>
        </div>
      </section>

      <section id="parcerias" className="container-x grid gap-10 py-24" aria-labelledby="pe-h">
        <SectionHeading id="pe-h" eyebrow="Rede académica" title="Parcerias e estágios" lead="Estágios de verão, projectos finais de curso e investigação conjunta." />
        <div className="grid gap-5 md:grid-cols-2">
          {partners.filter((p) => p.kind === "UNIVERSIDADE").map((p) => (
            <Card key={p.id} className="flex gap-4 p-6">
              <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-fg font-display font-bold text-bg">{p.logo}</span>
              <div className="grid gap-1">
                <h3 className="font-display text-lg font-bold">{p.name}</h3>
                <p className="text-sm text-fg-muted">{p.together}</p>
              </div>
            </Card>
          ))}
          <Card className="flex items-center gap-4 border-dashed p-6">
            <GraduationCap className="size-8 text-lab-ink" aria-hidden />
            <p className="text-sm text-fg-muted">É estudante ou investigador? <AppLink href="/contactos" className="font-medium text-lab-ink underline underline-offset-4">Fale connosco</AppLink> sobre estágios.</p>
          </Card>
        </div>
      </section>
      <CtaBand tone="lab" title="Tem um problema para testar?" lead="Submeta a sua ideia. Se for de melhoria para a TIS, entra directamente na triagem do Lab." href="/submeter" label={t("nav.submit")} />
    </>
  );
}

function LinesSection({ projects }: { projects: ProjectCardT[] }) {
  const [open, setOpen] = React.useState<string | null>("L1");
  return (
    <section id="linhas" className="border-y border-line bg-surface py-24" aria-labelledby="lin-h">
      <div className="container-x grid gap-10">
        <SectionHeading id="lin-h" eyebrow="Linhas de trabalho" title="L1 a L4" />
        <div className="grid gap-3 lg:grid-cols-4 lg:gap-4">
          {LINES.map((l) => {
            const on = open === l.key;
            const linked = projects.filter((p) => p.workLine === l.key);
            return (
              <motion.div key={l.key} layout className={cn("overflow-hidden rounded-[var(--radius-lg)] border bg-bg", on ? "border-lab lg:col-span-2" : "border-line")} transition={{ type: "spring", stiffness: 300, damping: 32 }}>
                <button className="flex w-full items-start gap-4 p-6 text-left" onClick={() => setOpen(on ? null : l.key)} aria-expanded={on} aria-controls={`line-${l.key}`}>
                  <span className={cn("grid size-12 shrink-0 place-items-center rounded-xl transition-colors", on ? "bg-lab text-white" : "bg-lab-soft text-lab-ink")}><l.icon className="size-6" aria-hidden /></span>
                  <span className="grid flex-1 gap-1">
                    <span className="font-mono text-xs text-fg-subtle">{l.key}</span>
                    <span className="font-display text-xl font-bold">{l.title}</span>
                  </span>
                  <Plus className={cn("size-5 shrink-0 transition-transform duration-[var(--dur-base)]", on && "rotate-45")} aria-hidden />
                </button>
                <AnimatePresence initial={false}>
                  {on && (
                    <motion.div id={`line-${l.key}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="grid gap-4 px-6 pb-6">
                      <p className="text-fg-muted">{l.text}</p>
                      <div className="flex flex-wrap gap-1.5">{l.examples.map((e) => <Tag key={e} tone="lab">{e}</Tag>)}</div>
                      {linked.length > 0 && (
                        <ul className="grid gap-1 text-sm">
                          {linked.map((p) => <li key={p.id}><AppLink href={`/projectos/${p.slug}`} className="font-medium text-lab-ink hover:underline">→ {p.name}</AppLink></li>)}
                        </ul>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/** As 4 etapas do método numa linha do tempo que se preenche com o scroll. */
function MethodTimeline() {
  const ref = React.useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 70%", "end 60%"] });
  const scaleY = useTransform(scrollYProgress, [0, 1], [0, 1]);
  return (
    <section id="metodo" className="container-x grid gap-12 py-24" aria-labelledby="met-h">
      <SectionHeading id="met-h" eyebrow="Playbook" title="Como trabalhamos" lead="Cada projecto passa por quatro etapas, com um gate entre elas. Sem evidência mínima registada, não avança." />
      <div ref={ref} className="relative grid gap-12 pl-14 md:pl-20">
        <div className="absolute bottom-0 left-5 top-0 w-1 rounded-full bg-surface-3 md:left-8" aria-hidden />
        <motion.div className="absolute bottom-0 left-5 top-0 w-1 origin-top rounded-full bg-gradient-to-b from-lab to-brand md:left-8" style={{ scaleY: reduce ? 1 : scaleY }} aria-hidden />
        {METHOD.map((m, i) => (
          <Reveal key={m.key} className="relative">
            <span className="absolute -left-14 top-0 grid size-11 place-items-center rounded-full border-4 border-bg bg-lab font-mono text-sm font-bold text-white md:-left-[4.6rem] md:size-12">{i + 1}</span>
            <Card className="grid gap-3 p-6 md:p-8">
              <div className="flex flex-wrap items-center gap-2">
                <Tag tone="lab"><Abbr term={m.key} /></Tag>
                {i < METHOD.length - 1 && <Tag><Abbr term="Gate">Gate</Abbr> a seguir</Tag>}
              </div>
              <h3 className="font-display text-2xl font-bold">{m.title}</h3>
              <p className="text-lg text-fg-muted">{m.q}</p>
              <p className="text-sm"><span className="font-medium">Evidência:</span> {m.evidence}</p>
            </Card>
          </Reveal>
        ))}
        <Reveal>
          <Card className="grid gap-3 bg-bg p-6 md:p-8">
            <h3 className="font-display text-xl font-bold">As 4 saídas de um projecto do Lab</h3>
            <ul className="grid gap-2 text-fg-muted md:grid-cols-2">
              <li>→ Cabe numa direcção existente: transfere para essa direcção.</li>
              <li>→ Precisa de modelo de negócio próprio: trilha interna da Incubadora.</li>
              <li>→ Deve tornar-se prática da casa: standard do Digital Office.</li>
              <li>→ Não passa o gate: encerra, com as lições registadas.</li>
            </ul>
          </Card>
        </Reveal>
      </div>
    </section>
  );
}

function FlipCard({ name, role, i }: { name: string; role: string; i: number }) {
  const [flipped, setFlipped] = React.useState(false);
  const reduce = useReducedMotion();
  const bg = ["from-lab to-brand", "from-brand to-ai", "from-lab-ink to-lab", "from-ai to-brand"][i % 4];
  return (
    <button onClick={() => setFlipped((f) => !f)} aria-pressed={flipped} aria-label={`${name}, ${role}`} className="group h-56 [perspective:1000px]">
      <motion.div className="relative size-full [transform-style:preserve-3d]" animate={{ rotateY: flipped && !reduce ? 180 : 0 }} transition={{ type: "spring", stiffness: 200, damping: 24 }}>
        <div className={cn("absolute inset-0 grid place-items-center rounded-[var(--radius-lg)] bg-gradient-to-br p-4 text-white [backface-visibility:hidden]", bg, flipped && reduce && "opacity-0")}>
          <span className="grid size-20 place-items-center rounded-full bg-white/20 font-display text-2xl font-bold backdrop-blur">{initials(name)}</span>
          <span className="font-display text-lg font-bold">{name}</span>
        </div>
        <div className={cn("absolute inset-0 grid place-content-center gap-2 rounded-[var(--radius-lg)] border border-line bg-bg p-5 text-center [backface-visibility:hidden]", !reduce && "[transform:rotateY(180deg)]", reduce && !flipped && "opacity-0")}>
          <p className="font-display text-lg font-bold">{name}</p>
          <p className="text-sm text-fg-muted">{role}</p>
        </div>
      </motion.div>
    </button>
  );
}

// =============================================================== P04 Incubadora

export function IncubatorView({ projects, cases }: { projects: ProjectCardT[]; cases: Content[] }) {
  const { data: live = projects } = useQuery("listProjects", undefined, { initialData: projects });
  const ventures = live.filter((p) => p.area === "INCUBADORA");
  return (
    <>
      <PageHeader tone="inc" crumbs={[{ label: t("nav.incubator") }]} eyebrow="P04 · Incubadora · «É um negócio?»" title="Fazemos crescer o que já provou funcionar." lead="Ventures internas vindas do Lab e startups angolanas curadas ganham clientes, receita e equipa." actions={<Button asChild variant="inc" size="lg"><AppLink href="/submeter/externa?tipo=STARTUP">Candidatar a minha startup <ArrowRight /></AppLink></Button>} />
      <SubNav tone="inc" items={[
        { id: "missao", label: "Missão" },
        { id: "trilhas", label: "Duas trilhas" },
        { id: "startups", label: "Para startups" },
        { id: "candidatar", label: "Como candidatar" },
        { id: "coortes", label: "Coortes e casos" },
        { id: "saidas", label: "Tipos de saída" },
      ]} />
      <section id="missao" className="container-x grid gap-6 py-20 md:grid-cols-[1fr_1.2fr]">
        <SectionHeading eyebrow="Missão" title="De projecto a negócio" />
        <Reveal className="grid gap-4 text-lg text-fg-muted">
          <p>A Incubadora transforma soluções validadas em negócios sustentáveis, dentro ou fora da TIS.</p>
          <p>Damos acesso a clientes da TIS, mentoria, tecnologia e um caminho claro até à decisão no Comité de incubação.</p>
        </Reveal>
      </section>
      <TracksSection />
      <section id="startups" className="container-x grid gap-10 py-24" aria-labelledby="st-h">
        <SectionHeading id="st-h" eyebrow="Para startups" title="O que procuramos" />
        <Stagger className="grid gap-5 md:grid-cols-3">
          {[
            ["Problema real", "Um problema claro em Angola, com quem pague para o resolver."],
            ["Equipa", "Pessoas com competências complementares e vontade de aprender depressa."],
            ["Encaixe com a TIS", "Tecnologia, dados, pagamentos ou serviços digitais nos sectores dos nossos clientes."],
          ].map(([h, p]) => (
            <StaggerItem key={h}><Card className="grid h-full gap-2 p-7"><h3 className="font-display text-xl font-bold">{h}</h3><p className="text-fg-muted">{p}</p></Card></StaggerItem>
          ))}
        </Stagger>
      </section>
      <section id="candidatar" className="border-y border-line bg-surface py-24" aria-labelledby="ca-h">
        <div className="container-x grid gap-10">
          <SectionHeading id="ca-h" eyebrow="Passo a passo" title="Como candidatar e o que acontece depois" />
          <ol className="grid gap-4 md:grid-cols-4">
            {["Submete a ideia no formulário externo (com conta ou anónimo).", "A IA faz uma primeira análise e a equipa faz a triagem.", "Recebe o resultado e o feedback em até 10 dias úteis (prazo configurável).", "Se for seleccionada, entra numa coorte com um plano de 6 meses."].map((s, i) => (
              <Reveal key={i} delay={i * 0.08} as="li">
                <Card className="grid h-full gap-3 bg-bg p-6">
                  <span className="font-display text-4xl font-bold text-inc-ink">0{i + 1}</span>
                  <p>{s}</p>
                </Card>
              </Reveal>
            ))}
          </ol>
          <Button asChild variant="inc" size="lg" className="w-fit"><AppLink href="/submeter/externa?tipo=STARTUP">Candidatar a minha startup <ArrowRight /></AppLink></Button>
        </div>
      </section>
      <section id="coortes" className="container-x grid gap-10 py-24" aria-labelledby="co-h">
        <SectionHeading id="co-h" eyebrow="Casos" title="Coortes e histórias de sucesso" lead="Só mostramos ventures com visibilidade pública." />
        <div className="flex flex-wrap gap-2">{cases.map((c) => <Tag key={c.id} tone="inc">{c.title} · {c.summary}</Tag>)}</div>
        {ventures.length === 0 ? <EmptyState title="Sem ventures públicas de momento." /> : (
          <Stagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {ventures.map((p) => <StaggerItem key={p.id} className="h-full"><ProjectCard p={p} /></StaggerItem>)}
          </Stagger>
        )}
      </section>
      <ExitsSection />
      <CtaBand tone="inc" title="A sua startup resolve um problema real?" lead="Candidate-se. Respondemos com feedback, seja qual for a decisão." href="/submeter/externa?tipo=STARTUP" label="Candidatar a minha startup" />
    </>
  );
}

/** As duas trilhas como dois caminhos animados que convergem. */
function TracksSection() {
  const reduce = useReducedMotion();
  const draw = { initial: { pathLength: reduce ? 1 : 0 }, whileInView: { pathLength: 1 }, viewport: { once: true, margin: "-20%" }, transition: { duration: reduce ? 0 : 1.6, ease: [0.22, 1, 0.36, 1] as const } };
  return (
    <section id="trilhas" className="border-y border-line bg-surface py-24" aria-labelledby="tr-h">
      <div className="container-x grid gap-10">
        <SectionHeading id="tr-h" eyebrow="Duas trilhas" title="Dois caminhos, o mesmo destino" />
        <div className="grid items-center gap-8 lg:grid-cols-[1fr_1.4fr_1fr]">
          <Card className="grid gap-2 bg-bg p-6">
            <Tag tone="lab" className="w-fit"><FlaskConical className="size-3" /> Trilha interna</Tag>
            <h3 className="font-display text-xl font-bold">Ventures vindas do Lab</h3>
            <p className="text-sm text-fg-muted">Projectos que passaram o gate de Experimentação e precisam de modelo de negócio próprio.</p>
          </Card>
          <svg viewBox="0 0 400 220" className="w-full" role="img" aria-label="Duas trilhas que convergem na Incubadora">
            <defs>
              <linearGradient id="gtr1" x1="0" x2="1"><stop offset="0" stopColor="var(--lab)" /><stop offset="1" stopColor="var(--inc)" /></linearGradient>
              <linearGradient id="gtr2" x1="0" x2="1"><stop offset="0" stopColor="var(--brand)" /><stop offset="1" stopColor="var(--inc)" /></linearGradient>
            </defs>
            <path d="M10 40 C 160 40, 180 110, 300 110 L 390 110" stroke="var(--surface-3)" strokeWidth="10" fill="none" strokeLinecap="round" />
            <path d="M10 180 C 160 180, 180 110, 300 110" stroke="var(--surface-3)" strokeWidth="10" fill="none" strokeLinecap="round" />
            <motion.path d="M10 40 C 160 40, 180 110, 300 110 L 390 110" stroke="url(#gtr1)" strokeWidth="10" fill="none" strokeLinecap="round" {...draw} />
            <motion.path d="M10 180 C 160 180, 180 110, 300 110" stroke="url(#gtr2)" strokeWidth="10" fill="none" strokeLinecap="round" {...draw} transition={{ ...draw.transition, delay: reduce ? 0 : 0.3 }} />
            <motion.circle cx="300" cy="110" r="18" fill="var(--inc)" initial={{ scale: reduce ? 1 : 0 }} whileInView={{ scale: 1 }} viewport={{ once: true }} transition={{ delay: reduce ? 0 : 1.3, type: "spring", stiffness: 300, damping: 15 }} />
            {!reduce && (
              <circle r="6" fill="white">
                <animateMotion dur="3s" repeatCount="indefinite" path="M10 40 C 160 40, 180 110, 300 110" />
              </circle>
            )}
            {!reduce && (
              <circle r="6" fill="white">
                <animateMotion dur="3s" begin="1.5s" repeatCount="indefinite" path="M10 180 C 160 180, 180 110, 300 110" />
              </circle>
            )}
          </svg>
          <Card className="grid gap-2 bg-bg p-6">
            <Tag tone="brand" className="w-fit"><Handshake className="size-3" /> Trilha externa</Tag>
            <h3 className="font-display text-xl font-bold">Startups angolanas</h3>
            <p className="text-sm text-fg-muted">Startups curadas, com problema real e equipa, que ganham acesso a clientes e tecnologia da TIS.</p>
          </Card>
        </div>
      </div>
    </section>
  );
}

/** Ícones animados para spin-in, spin-off e encerramento. */
function ExitsSection() {
  const reduce = useReducedMotion();
  const exits = [
    { key: "Spin-in", icon: Layers, text: "Incorporada numa direcção ou produto TIS.", anim: { y: [0, 6, 0] } },
    { key: "Spin-off", icon: Rocket, text: "Empresa autónoma, com participação da TIS.", anim: { y: [0, -8, 0], rotate: [0, -8, 0] } },
    { key: "Encerramento", icon: XCircle, text: "Pára no stage-gate e liberta o orçamento. As lições ficam.", anim: { scale: [1, 0.9, 1], opacity: [1, 0.7, 1] } },
  ];
  return (
    <section id="saidas" className="container-x grid gap-10 py-24" aria-labelledby="sa-h">
      <SectionHeading id="sa-h" eyebrow="Comité de incubação" title="As 3 saídas de uma venture" />
      <Stagger className="grid gap-5 md:grid-cols-3">
        {exits.map((e) => (
          <StaggerItem key={e.key}>
            <Card className="group grid h-full gap-4 p-8">
              <motion.span className="grid size-16 place-items-center rounded-2xl bg-inc-soft text-inc-ink" animate={reduce ? undefined : e.anim} transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}>
                <e.icon className="size-8" aria-hidden />
              </motion.span>
              <h3 className="font-display text-2xl font-bold"><Abbr term={e.key}>{e.key}</Abbr></h3>
              <p className="text-fg-muted">{e.text}</p>
            </Card>
          </StaggerItem>
        ))}
      </Stagger>
      <p className="text-sm text-fg-subtle">As vencedoras podem seguir para M&A e TIS Capital, decisões que não são geridas nesta plataforma.</p>
    </section>
  );
}
