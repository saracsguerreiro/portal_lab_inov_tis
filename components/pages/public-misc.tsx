"use client";
import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { ArrowRight, CalendarDays, CheckCircle2, ChevronDown, ExternalLink, Mail, MapPin, Phone, Search } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Challenge, Content, Partner } from "@/lib/domain/types";
import type { ResultOf } from "@/lib/services";
import { ContactSchema } from "@/lib/validation/forms";
import { t, fmtDate } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { L } from "@/lib/domain/labels";
import { useQuery, useSession } from "@/lib/client/hooks";
import { api, ApiError } from "@/lib/client/runtime";
import { canParticipateChallenge } from "@/lib/permissions";
import { Button, Card, EmptyState, Field, Input, ListSkeleton, Progress, SectionHeading, Tag, Textarea } from "@/components/ui";
import { Reveal, Stagger, StaggerItem } from "@/components/motion";
import { AreaTag, Captcha, Countdown, CtaBand, PageHeader } from "@/components/domain";
import { AppLink } from "@/components/layout/app-link";

type ChallengeRow = Challenge & { participations: number };

// =============================================================== P07 Desafios

export function ChallengesView({ initial }: { initial: ChallengeRow[] }) {
  const { data = initial } = useQuery("listChallenges", undefined, { initialData: initial });
  const [status, setStatus] = React.useState<string>("");
  const list = data.filter((c) => !status || c.status === status);
  return (
    <>
      <PageHeader crumbs={[{ label: t("nav.challenges") }]} eyebrow="P07 · Desafios" title="Desafios abertos" lead="Problemas concretos para os quais procuramos soluções. Participe com a sua ideia." />
      <div className="container-x grid gap-8 py-10">
        <div role="radiogroup" aria-label="Estado" className="flex flex-wrap gap-2">
          {[["", "Todos"], ["ABERTO", "Abertos"], ["EM_AVALIACAO", "Em avaliação"], ["FECHADO", "Fechados"]].map(([v, l]) => (
            <button key={v} role="radio" aria-checked={status === v} onClick={() => setStatus(v)} className={cn("min-h-10 rounded-full border px-4 text-sm transition-colors", status === v ? "border-fg bg-fg text-bg" : "border-line bg-surface hover:border-line-strong")}>{l}</button>
          ))}
        </div>
        {list.length === 0 ? <EmptyState title="Sem desafios com este estado." /> : (
          <Stagger className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {list.map((c) => (
              <StaggerItem key={c.id} className="h-full">
                <AppLink href={`/desafios/${c.slug}`} className="group flex h-full flex-col overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface shadow-1 transition-transform hover:-translate-y-1">
                  <div className="h-28" style={{ background: c.cover }} aria-hidden />
                  <div className="flex flex-1 flex-col gap-3 p-6">
                    <div className="flex flex-wrap gap-1.5"><AreaTag area={c.area} /><Tag>{L.audience(c.audience)}</Tag><Tag tone={c.status === "ABERTO" ? "ok" : c.status === "EM_AVALIACAO" ? "warn" : "neutral"} dot>{L.challengeStatus(c.status)}</Tag></div>
                    <h2 className="font-display text-xl font-bold">{c.title}</h2>
                    <p className="line-clamp-3 text-sm text-fg-muted">{c.problem}</p>
                    <div className="mt-auto grid gap-2 pt-2">
                      <div className="flex justify-between text-sm">
                        {c.status === "ABERTO" ? <Countdown to={c.closesAt} compact /> : <span className="text-fg-subtle">Fechou a {fmtDate(c.closesAt)}</span>}
                        <span className="text-fg-muted">{c.participations} participações</span>
                      </div>
                      <Progress value={(c.participations / (c.targetParticipations ?? 20)) * 100} tone={c.area === "LAB" ? "lab" : "inc"} label="Participações" />
                    </div>
                  </div>
                </AppLink>
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </div>
    </>
  );
}

// =============================================================== P08 Ficha do desafio

export function ChallengeDetailView({ id, initial }: { id: string; initial: ChallengeRow | null }) {
  const { actor } = useSession();
  const { data = initial ?? undefined, loading } = useQuery("getChallenge", { id }, { initialData: initial ?? undefined });
  const [openFaq, setOpenFaq] = React.useState<number | null>(0);
  if (!data) return <div className="container-x py-16">{loading ? <ListSkeleton /> : <EmptyState title="Desafio não encontrado" />}</div>;
  const c = data;
  const canJoin = canParticipateChallenge(actor, c);
  const href = actor.kind === "user" && actor.user.role === "COLABORADOR" && c.audience === "COLABORADORES" ? `/submeter/melhoria?desafio=${c.id}` : `/submeter/externa?desafio=${c.id}`;
  return (
    <>
      <PageHeader tone={c.area === "LAB" ? "lab" : "inc"} crumbs={[{ href: "/desafios", label: t("nav.challenges") }, { label: c.title }]} eyebrow={`Desafio · ${L.audience(c.audience)}`} title={c.title} lead={c.problem}
        actions={canJoin ? <Button asChild size="lg" variant={c.area === "LAB" ? "lab" : "inc"}><AppLink href={href}>Participar <ArrowRight /></AppLink></Button> : <Tag tone="warn">{c.status === "ABERTO" ? "Este desafio não é para o seu perfil" : L.challengeStatus(c.status)}</Tag>} />
      <div className="container-x grid gap-10 py-12 lg:grid-cols-[1fr_360px]">
        <div className="grid content-start gap-10">
          {[["Contexto", c.context], ["O que procuramos", c.lookingFor], ["Benefícios", c.benefits]].map(([h, p]) => (
            <Reveal key={h} as="section" className="grid gap-3"><h2 className="font-display text-2xl font-bold">{h}</h2><p className="text-lg text-fg-muted">{p}</p></Reveal>
          ))}
          <section className="grid gap-3">
            <h2 className="font-display text-2xl font-bold">Critérios de avaliação</h2>
            <ul className="grid gap-2">{c.criteria.map((x) => <li key={x} className="flex items-center gap-2"><CheckCircle2 className="size-4 text-ok" aria-hidden />{x}</li>)}</ul>
          </section>
          {c.faq.length > 0 && (
            <section className="grid gap-3">
              <h2 className="font-display text-2xl font-bold">Perguntas frequentes</h2>
              {c.faq.map((f, i) => (
                <div key={i} className="rounded-[var(--radius-md)] border border-line bg-surface">
                  <button className="flex w-full items-center justify-between gap-3 p-4 text-left font-medium" aria-expanded={openFaq === i} onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                    {f.q}<ChevronDown className={cn("size-4 transition-transform", openFaq === i && "rotate-180")} />
                  </button>
                  <AnimatePresence initial={false}>
                    {openFaq === i && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-4 pb-4 text-fg-muted">{f.a}</motion.p>}
                  </AnimatePresence>
                </div>
              ))}
            </section>
          )}
        </div>
        <aside className="grid content-start gap-5">
          <Card className="grid gap-4 p-6">
            <h2 className="font-display text-lg font-bold">Calendário</h2>
            {c.status === "ABERTO" && <Countdown to={c.closesAt} />}
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-fg-subtle">Abertura</dt><dd className="font-medium">{fmtDate(c.opensAt)}</dd></div>
              <div><dt className="text-fg-subtle">Fecho</dt><dd className="font-medium">{fmtDate(c.closesAt)}</dd></div>
            </dl>
            <div className="grid gap-2">
              <p className="flex justify-between text-sm"><span>Participações</span><span className="font-mono">{c.participations} / {c.targetParticipations ?? "—"}</span></p>
              <Progress value={(c.participations / (c.targetParticipations ?? 20)) * 100} tone={c.area === "LAB" ? "lab" : "inc"} label="Participações" />
            </div>
            {canJoin && <Button asChild variant={c.area === "LAB" ? "lab" : "inc"}><AppLink href={href}>Participar</AppLink></Button>}
          </Card>
        </aside>
      </div>
      {canJoin && <CtaBand tone={c.area === "LAB" ? "lab" : "inc"} title="Pronto para participar?" lead="O formulário abre já com este desafio associado." href={href} label="Participar" />}
    </>
  );
}

// =============================================================== P09 Parcerias

export function PartnersView({ initial }: { initial: Partner[] }) {
  const kinds: [Partner["kind"], string][] = [["UNIVERSIDADE", "Universidades"], ["PROGRAMA", "Programas de incubação"], ["STARTUP", "Startups"], ["EMPRESA", "Empresas"]];
  const visible = initial.filter((p) => p.disclosureAuthorized);
  return (
    <>
      <PageHeader crumbs={[{ label: t("nav.partners") }]} eyebrow="P09 · Rede" title="Parcerias" lead="Só mostramos parceiros que autorizaram a divulgação." />
      <div className="container-x grid gap-14 py-12">
        {kinds.map(([k, label]) => {
          const list = visible.filter((p) => p.kind === k);
          if (!list.length) return null;
          return (
            <section key={k} className="grid gap-5" aria-labelledby={`pk-${k}`}>
              <h2 id={`pk-${k}`} className="font-display text-2xl font-bold">{label}</h2>
              <Stagger className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {list.map((p) => (
                  <StaggerItem key={p.id}>
                    <Card className="grid h-full gap-3 p-6">
                      <span className="grid size-14 place-items-center rounded-2xl bg-fg font-display text-lg font-bold text-bg">{p.logo}</span>
                      <h3 className="font-display text-lg font-bold">{p.name}</h3>
                      <p className="text-sm text-fg-muted">{p.description}</p>
                      <p className="mt-auto border-t border-line pt-3 text-sm"><span className="font-medium">O que fazemos juntos:</span> {p.together}</p>
                    </Card>
                  </StaggerItem>
                ))}
              </Stagger>
            </section>
          );
        })}
      </div>
      <CtaBand title="Quer ser parceiro?" lead="Universidades, programas e empresas: fale connosco." href="/contactos" label="Contactar" />
    </>
  );
}

// =============================================================== P10 Notícias e eventos

const NEWS_KINDS: [string, string][] = [["", "Tudo"], ["NOTICIA", "Notícias"], ["EVENTO", "Eventos"], ["DEMO_DAY", "Demo Days"], ["FORMACAO", "Formações abertas"]];

export function NewsView({ initial }: { initial: Content[] }) {
  const { data = initial } = useQuery("listContents", { kinds: ["NOTICIA", "EVENTO", "DEMO_DAY", "FORMACAO"] }, { initialData: initial });
  const [kind, setKind] = React.useState("");
  const [q, setQ] = React.useState("");
  const list = data.filter((c) => (!kind || c.kind === kind) && (!q || c.title.toLowerCase().includes(q.toLowerCase())));
  return (
    <>
      <PageHeader crumbs={[{ label: t("nav.news") }]} eyebrow="P10 · Agenda" title="Notícias e eventos" lead="Novidades, Demo Days e formações abertas do ecossistema." />
      <div className="container-x grid gap-8 py-10">
        <div className="flex flex-wrap items-center gap-2">
          {NEWS_KINDS.map(([v, l]) => (
            <button key={v} aria-pressed={kind === v} onClick={() => setKind(v)} className={cn("min-h-10 rounded-full border px-4 text-sm transition-colors", kind === v ? "border-fg bg-fg text-bg" : "border-line bg-surface hover:border-line-strong")}>{l}</button>
          ))}
          <div className="relative ml-auto w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar" aria-label="Pesquisar notícias" className="pl-10" />
          </div>
        </div>
        {list.length === 0 ? <EmptyState title={t("states.noResults")} /> : (
          <Stagger className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {list.map((n, i) => (
              <StaggerItem key={n.id} className={cn("h-full", i === 0 && !kind && "md:col-span-2 lg:row-span-2")}>
                <AppLink href={`/noticias/${n.slug}`} className="group flex h-full flex-col overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface shadow-1">
                  <div className={cn("relative overflow-hidden", i === 0 && !kind ? "h-64 lg:h-80" : "h-40")}>
                    <div className="absolute inset-0 transition-transform duration-[var(--dur-enter)] group-hover:scale-105" style={{ background: n.cover }} />
                    {n.visibility === "INTERNO" && <Tag tone="info" className="absolute left-3 top-3">Interna</Tag>}
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-6">
                    <div className="flex items-center gap-2"><Tag tone={n.kind === "NOTICIA" ? "neutral" : "brand"}>{L.contentKind(n.kind)}</Tag><span className="text-xs text-fg-subtle">{fmtDate(n.date ?? n.publishedAt)}</span></div>
                    <h2 className={cn("font-display font-bold group-hover:underline", i === 0 && !kind ? "text-3xl" : "text-xl")}>{n.title}</h2>
                    <p className="text-sm text-fg-muted">{n.summary}</p>
                    {n.place && <p className="mt-auto flex items-center gap-1.5 pt-2 text-sm text-fg-subtle"><MapPin className="size-3.5" />{n.place}</p>}
                  </div>
                </AppLink>
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </div>
    </>
  );
}

// =============================================================== P11 Notícia ou evento

export function NewsDetailView({ id, initial }: { id: string; initial: ResultOf<"getContent"> | null }) {
  const { data = initial ?? undefined, loading } = useQuery("getContent", { id }, { initialData: initial ?? undefined });
  if (!data) return <div className="container-x py-16">{loading ? <ListSkeleton /> : <EmptyState title="Conteúdo não encontrado ou só para colaboradores" action={<Button asChild><Link href="/entrar">{t("nav.signIn")}</Link></Button>} />}</div>;
  const isEvent = data.kind !== "NOTICIA";
  return (
    <article>
      <div className="h-56 md:h-80" style={{ background: data.cover }} aria-hidden />
      <div className="container-x -mt-24 grid gap-10 lg:grid-cols-[1fr_320px]">
        <Card className="grid gap-6 p-6 md:p-10">
          <div className="flex flex-wrap gap-2"><Tag tone="brand">{L.contentKind(data.kind)}</Tag>{data.visibility === "INTERNO" && <Tag tone="info">Interna</Tag>}</div>
          <h1 className="text-balance font-display text-[length:var(--text-4xl)] font-bold">{data.title}</h1>
          <p className="text-xl text-fg-muted">{data.summary}</p>
          <div className="grid gap-4 text-lg leading-relaxed">{data.body.split("\n\n").map((p, i) => <p key={i}>{p}</p>)}</div>
          {data.projects.length > 0 && (
            <div className="flex flex-wrap gap-2 border-t border-line pt-5">
              <span className="text-sm text-fg-subtle">Projectos ligados:</span>
              {data.projects.map((p) => <AppLink key={p.id} href={`/projectos/${p.slug}`} className="text-sm font-medium text-brand-ink hover:underline">{p.name}</AppLink>)}
            </div>
          )}
        </Card>
        <aside className="grid content-start gap-4 lg:pt-28">
          <Card className="grid gap-3 p-5 text-sm">
            <p className="flex items-center gap-2"><CalendarDays className="size-4 text-fg-subtle" />{fmtDate(data.date ?? data.publishedAt, { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: isEvent ? "2-digit" : undefined, minute: isEvent ? "2-digit" : undefined })}</p>
            {data.place && <p className="flex items-center gap-2"><MapPin className="size-4 text-fg-subtle" />{data.place}</p>}
            {data.signupUrl && <Button asChild><a href={data.signupUrl} target="_blank" rel="noreferrer">Inscrever-me <ExternalLink /></a></Button>}
          </Card>
          <Button asChild variant="ghost" className="w-fit"><AppLink href="/noticias">← Todas as notícias</AppLink></Button>
        </aside>
      </div>
    </article>
  );
}

// =============================================================== P16 / P17 Termos e privacidade

export function LegalView({ kind }: { kind: "TERMOS" | "PRIVACIDADE" }) {
  const { data: s } = useQuery("getPublicSettings");
  const isTerms = kind === "TERMOS";
  const sections = isTerms
    ? [
        ["1. Objecto", "Estes termos regulam a submissão de ideias ao Ecossistema de Inovação TIS, por colaboradores e por pessoas e organizações externas."],
        ["2. Propriedade intelectual", "O criador mantém a titularidade da sua ideia. A submissão dá à TIS o direito de a analisar, avaliar e discutir internamente para decidir a sua selecção. Qualquer uso comercial exige um acordo escrito com o criador."],
        ["3. Confidencialidade", "As ideias nunca são públicas. Ideias externas só são vistas pelo criador, pelos gestores e pela Comissão Executiva."],
        ["4. Análise com inteligência artificial", "Cada ideia tem uma primeira análise automática, sem dados pessoais do autor. A IA recomenda; a decisão é sempre de uma pessoa."],
        ["5. Dados de terceiros", "Não pode incluir dados de clientes, dados pessoais de terceiros nem informação confidencial."],
        ["6. Retenção", `As ideias não seleccionadas ficam guardadas ${s?.retentionMonths ?? 24} meses e depois são anonimizadas. Pode pedir para apagar a sua ideia.`],
      ]
    : [
        ["1. Responsável pelo tratamento", "TIS, Luanda, Angola. Contacto do encarregado de protecção de dados: privacidade@tis.example (fictício)."],
        ["2. Dados que recolhemos", "Nome, email, tipo de perfil, dados da organização e o conteúdo das ideias. Para colaboradores, os dados da conta Microsoft (nome, email, departamento, fotografia)."],
        ["3. Finalidade", "Gerir as ideias, dar feedback, comunicar consigo e medir a performance do ecossistema de forma agregada."],
        ["4. Submissão anónima", "A ligação entre a ideia e a pessoa é guardada cifrada e não aparece em nenhum ecrã, exportação, notificação nem pedido à IA."],
        ["5. Os seus direitos", "Pode pedir acesso, correcção, exportação e apagamento dos seus dados, de acordo com a Lei n.º 22/11 de Protecção de Dados Pessoais."],
        ["6. Conservação", `${s?.retentionMonths ?? 24} meses para ideias não seleccionadas; enquanto a conta estiver activa para os dados de perfil.`],
      ];
  return (
    <>
      <PageHeader crumbs={[{ label: isTerms ? t("nav.terms") : t("nav.privacy") }]} eyebrow={isTerms ? "P16" : "P17 · Lei n.º 22/11"} title={isTerms ? "Termos de submissão e propriedade intelectual" : "Política de privacidade"} lead={`Versão ${isTerms ? s?.termsVersion ?? "2026.1" : s?.privacyVersion ?? "2026.1"} · Texto de demonstração, a validar pelo Legal e Compliance.`} />
      <div className="container-x grid max-w-3xl gap-8 py-12">
        {sections.map(([h, p]) => (
          <section key={h} className="grid gap-2"><h2 className="font-display text-xl font-bold">{h}</h2><p className="text-fg-muted">{p}</p></section>
        ))}
      </div>
    </>
  );
}

// =============================================================== P18 Contactos

export function ContactView() {
  const [captcha, setCaptcha] = React.useState("");
  const [sent, setSent] = React.useState(false);
  const form = useForm({ resolver: zodResolver(ContactSchema), defaultValues: { name: "", email: "", subject: "", message: "" } });
  const { errors, isSubmitting } = form.formState;
  const onSubmit = form.handleSubmit(async (v) => {
    try {
      await api("sendContact", { ...v, captchaToken: captcha });
      setSent(true);
      toast.success("Mensagem enviada. Respondemos em breve.");
    } catch (e) {
      toast.error((e as ApiError).message);
    }
  });
  return (
    <>
      <PageHeader crumbs={[{ label: t("nav.contacts") }]} eyebrow="P18" title="Contactos" lead="Escreva-nos. Respondemos em poucos dias úteis." />
      <div className="container-x grid gap-10 py-12 lg:grid-cols-[1fr_380px]">
        <Card className="p-6 md:p-8">
          <AnimatePresence mode="wait">
            {sent ? (
              <motion.div key="ok" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="grid place-items-center gap-3 py-12 text-center">
                <CheckCircle2 className="size-12 text-ok" />
                <p className="font-display text-2xl font-bold">Mensagem enviada</p>
                <Button variant="secondary" onClick={() => { setSent(false); form.reset(); }}>Enviar outra</Button>
              </motion.div>
            ) : (
              <motion.form key="f" onSubmit={onSubmit} noValidate className="grid gap-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field id="c-name" label="Nome" required error={errors.name?.message}><Input autoComplete="name" {...form.register("name")} /></Field>
                  <Field id="c-email" label="Email" required error={errors.email?.message}><Input type="email" autoComplete="email" {...form.register("email")} /></Field>
                </div>
                <Field id="c-subject" label="Assunto" required error={errors.subject?.message}><Input {...form.register("subject")} /></Field>
                <Field id="c-msg" label="Mensagem" required error={errors.message?.message}><Textarea rows={6} {...form.register("message")} /></Field>
                <Captcha onToken={setCaptcha} />
                <Button type="submit" loading={isSubmitting} className="w-fit" disabled={!captcha}>{t("actions.send")}</Button>
              </motion.form>
            )}
          </AnimatePresence>
        </Card>
        <aside className="grid content-start gap-4">
          {[["Innovation Lab", "lab@tis.example", "+244 900 000 001"], ["Incubadora", "incubadora@tis.example", "+244 900 000 002"]].map(([n, e, ph]) => (
            <Card key={n} className="grid gap-2 p-5 text-sm">
              <p className="font-display text-lg font-bold">{n}</p>
              <p className="flex items-center gap-2"><Mail className="size-4 text-fg-subtle" />{e}</p>
              <p className="flex items-center gap-2"><Phone className="size-4 text-fg-subtle" />{ph}</p>
            </Card>
          ))}
          <p className="text-xs text-fg-subtle">Contactos fictícios de demonstração.</p>
        </aside>
      </div>
    </>
  );
}

export { SectionHeading };
