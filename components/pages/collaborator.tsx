"use client";
import * as React from "react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowRight, BookOpen, CalendarDays, Download, ExternalLink, Eye, EyeOff, FileText, Handshake, Heart, Info, Mail, MessageCircle, MonitorPlay, Search, Send, Sparkles, Trophy, Users, Zap } from "lucide-react";
import { F3Schema, type F3Input } from "@/lib/validation/forms";
import { t, fmtDate, fmtRelative } from "@/lib/i18n";
import { cn, initials } from "@/lib/utils";
import { L } from "@/lib/domain/labels";
import { formatAnswer } from "@/lib/domain/answer-labels";
import { useQuery, useSession } from "@/lib/client/hooks";
import { ApiError, mutate } from "@/lib/client/runtime";
import { Button, Card, Checkbox, ChoiceGroup, EmptyState, ErrorState, Field, Input, ListSkeleton, Progress, SectionHeading, Select, Tag, Textarea } from "@/components/ui";
import { Stagger, StaggerItem } from "@/components/motion";
import { FileDrop, PageHeader, RequirePage, StatusTag } from "@/components/domain";
import { AppLink } from "@/components/layout/app-link";
import type { Attachment } from "@/lib/domain/types";

// =============================================================== P25 Explorar ideias internas

export function InternalIdeasView() {
  return <RequirePage page="P25" title="as ideias internas"><InternalIdeas /></RequirePage>;
}

function InternalIdeas() {
  const { data, loading, error, reload } = useQuery("listInternalIdeas");
  const [q, setQ] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [area, setArea] = React.useState("");
  const [line, setLine] = React.useState("");
  const [sort, setSort] = React.useState<"recent" | "supports" | "comments">("recent");
  const list = (data ?? [])
    .filter((i) => (!status || i.status === status) && (!area || i.affectedArea === area) && (!line || i.workLine === line) && (!q || `${i.title} ${i.summary}`.toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => (sort === "supports" ? b.supports - a.supports : sort === "comments" ? b.comments - a.comments : b.createdAt.localeCompare(a.createdAt)));
  const areas = [...new Set((data ?? []).map((i) => i.affectedArea).filter(Boolean))] as string[];
  return (
    <>
      <PageHeader crumbs={[{ label: t("nav.ideas") }]} eyebrow="P25 · Ideias internas" title="Explorar ideias dos colegas" lead="Ideias de melhoria e de negócio de colaboradores, a partir do estado «Em avaliação». Apoie, comente e junte-se." />
      <div className="container-x grid gap-6 py-10">
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-60 flex-1"><Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" /><Input aria-label="Pesquisar ideias" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar" className="pl-10" /></div>
          <Select aria-label="Estado" value={status} onChange={(e) => setStatus(e.target.value)} className="w-auto"><option value="">Todos os estados</option><option value="EM_AVALIACAO">Em avaliação</option><option value="DECISAO">Com decisão</option></Select>
          <Select aria-label="Área afectada" value={area} onChange={(e) => setArea(e.target.value)} className="w-auto"><option value="">Todas as áreas</option>{areas.map((a) => <option key={a}>{a}</option>)}</Select>
          <Select aria-label="Linha de trabalho" value={line} onChange={(e) => setLine(e.target.value)} className="w-auto"><option value="">Todas as linhas</option>{["L1", "L2", "L3", "L4"].map((l) => <option key={l} value={l}>{L.line(l)}</option>)}</Select>
          <Select aria-label="Ordenar" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="w-auto"><option value="recent">Mais recentes</option><option value="supports">Mais apoiadas</option><option value="comments">Mais comentadas</option></Select>
        </div>
        {error ? <ErrorState message={error.message} onRetry={reload} /> : loading ? <ListSkeleton rows={4} /> : list.length === 0 ? <EmptyState title={t("states.noResults")} /> : (
          <LayoutGroup>
            <motion.ul layout className="grid gap-4 md:grid-cols-2">
              <AnimatePresence mode="popLayout">
                {list.map((i) => (
                  <motion.li key={i.id} layout initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ type: "spring", stiffness: 350, damping: 32 }}>
                    <AppLink href={`/ideias/${i.id}`} className="group grid h-full gap-3 rounded-[var(--radius-lg)] border border-line bg-surface p-6 shadow-1 transition-[transform,border-color] hover:-translate-y-0.5 hover:border-line-strong">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusTag status={i.status} decision={i.decision} />
                        {i.affectedArea && <Tag>{i.affectedArea}</Tag>}
                        {i.workLine && <Tag tone="lab">{i.workLine}</Tag>}
                      </div>
                      <h2 className="font-display text-xl font-bold">{i.title}</h2>
                      <p className="line-clamp-2 text-sm text-fg-muted">{i.summary}</p>
                      {i.similarTo.length > 0 && <p className="text-xs text-ai-ink"><Sparkles className="mr-1 inline size-3" />Ideia semelhante a {i.similarTo.map((s) => s.number).join(", ")}</p>}
                      <div className="mt-auto flex items-center gap-4 pt-2 text-sm text-fg-muted">
                        <span className="flex items-center gap-1.5">{i.authorName === "Anónimo" ? <EyeOff className="size-4" /> : <span className="grid size-6 place-items-center rounded-full bg-surface-2 text-[10px] font-bold">{initials(i.authorName)}</span>}{i.authorName}</span>
                        <span className="ml-auto flex items-center gap-1"><Heart className={cn("size-4", i.supportedByMe && "fill-inc text-inc")} />{i.supports}</span>
                        <span className="flex items-center gap-1"><MessageCircle className="size-4" />{i.comments}</span>
                      </div>
                    </AppLink>
                  </motion.li>
                ))}
              </AnimatePresence>
            </motion.ul>
          </LayoutGroup>
        )}
      </div>
    </>
  );
}

// =============================================================== P26 Ficha da ideia interna

export function InternalIdeaDetailView({ id }: { id: string }) {
  return <RequirePage page="P26" title="esta ideia"><InternalIdeaDetail id={id} /></RequirePage>;
}

function InternalIdeaDetail({ id }: { id: string }) {
  const { data: d, loading, error, reload } = useQuery("getInternalIdea", { id });
  const [comment, setComment] = React.useState("");
  const [replyTo, setReplyTo] = React.useState<string | null>(null);
  const [burst, setBurst] = React.useState(0);
  if (loading && !d) return <div className="container-x py-16"><ListSkeleton /></div>;
  if (error || !d) return <div className="container-x py-16"><ErrorState message={error?.message} onRetry={reload} /></div>;
  const toggle = async (kind: "APOIO" | "INTERESSE") => {
    try {
      const r = await mutate("toggleReaction", { ideaId: id, kind });
      if (kind === "APOIO" && r.active) setBurst((b) => b + 1);
      if (kind === "INTERESSE") toast.success(r.active ? "Está na lista de interessados." : "Saiu da lista de interessados.");
    } catch (e) { toast.error((e as ApiError).message); }
  };
  const roots = d.comments.filter((c) => !c.parentId);
  return (
    <>
      <PageHeader crumbs={[{ href: "/ideias", label: t("nav.ideas") }, { label: d.number }]} eyebrow={`P26 · ${d.number} · ${L.ideaType(d.type)}`} title={d.title} lead={d.summary} actions={<StatusTag status={d.status} decision={d.decision} />} />
      <div className="container-x grid gap-8 py-10 lg:grid-cols-[1fr_320px]">
        <div className="grid content-start gap-8">
          {[["Problema", d.problem], ["Proposta", d.proposal]].map(([h, p]) => p && <section key={h} className="grid gap-2"><h2 className="font-display text-2xl font-bold">{h}</h2><p className="whitespace-pre-line text-lg text-fg-muted">{p}</p></section>)}
          {d.impact.length > 0 && <section className="grid gap-2"><h2 className="font-display text-2xl font-bold">Impacto esperado</h2><div className="flex flex-wrap gap-2">{d.impact.map((x) => <Tag key={x} tone="lab">{formatAnswer("impact", x)}</Tag>)}</div>{d.impactEstimate && <p className="text-fg-muted">{d.impactEstimate}</p>}</section>}
          <section className="grid gap-4" aria-labelledby="com-h">
            <h2 id="com-h" className="font-display text-2xl font-bold">Comentários ({d.comments.filter((c) => !c.hidden).length})</h2>
            {roots.length === 0 && <p className="text-fg-muted">Seja a primeira pessoa a comentar.</p>}
            <ul className="grid gap-3">
              {roots.map((c) => (
                <li key={c.id} className="grid gap-2">
                  <Comment c={c} canModerate={d.canModerate} onReply={d.canReact ? () => setReplyTo(c.id) : undefined} />
                  <ul className="ml-8 grid gap-2 border-l-2 border-line pl-4">
                    {d.comments.filter((r) => r.parentId === c.id).map((r) => <li key={r.id}><Comment c={r} canModerate={d.canModerate} /></li>)}
                  </ul>
                </li>
              ))}
            </ul>
            {d.canReact && (
              <form className="grid gap-2" onSubmit={async (e) => { e.preventDefault(); try { await mutate("addComment", { ideaId: id, text: comment, parentId: replyTo }); setComment(""); setReplyTo(null); } catch (x) { toast.error((x as ApiError).message); } }}>
                {replyTo && <p className="text-sm text-fg-muted">A responder a um comentário · <button type="button" className="underline" onClick={() => setReplyTo(null)}>cancelar</button></p>}
                <label htmlFor="cmt" className="sr-only">Comentário</label>
                <Textarea id="cmt" value={comment} onChange={(e) => setComment(e.target.value)} rows={3} placeholder="Escreva um comentário construtivo" />
                <Button type="submit" disabled={!comment.trim()} className="w-fit"><Send /> Comentar</Button>
                <p className="text-xs text-fg-subtle">Os comentários são moderados pelos gestores.</p>
              </form>
            )}
          </section>
        </div>
        <aside className="grid content-start gap-4">
          <Card className="grid gap-4 p-5">
            <p className="flex items-center gap-2 text-sm">{d.authorName === "Anónimo" ? <EyeOff className="size-4" /> : <Users className="size-4" />} <span className="font-medium">{d.authorName}</span></p>
            {d.affectedArea && <p className="text-sm"><span className="text-fg-subtle">Área afectada:</span> {d.affectedArea}</p>}
            <div className="relative">
              <Button onClick={() => toggle("APOIO")} disabled={!d.canReact} variant={d.supportedByMe ? "inc" : "secondary"} className="w-full" aria-pressed={d.supportedByMe}>
                <motion.span key={String(d.supportedByMe)} initial={{ scale: 0.5 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 12 }}><Heart className={cn(d.supportedByMe && "fill-current")} /></motion.span>
                {d.supportedByMe ? "Apoia esta ideia" : "Apoiar esta ideia"} · {d.supports}
              </Button>
              <AnimatePresence>{burst > 0 && <HeartBurst key={burst} />}</AnimatePresence>
            </div>
            <Button onClick={() => toggle("INTERESSE")} disabled={!d.canReact} variant="secondary" aria-pressed={d.interestedByMe}><Handshake /> {d.interestedByMe ? "Está na lista de interessados" : "Quero colaborar"} · {d.interested}</Button>
            {!d.canReact && <p className="text-xs text-fg-subtle">Só colaboradores podem apoiar e comentar (um apoio por pessoa).</p>}
            {d.projectId && <Button asChild variant="lab"><AppLink href={`/projectos/${d.projectId}`}>Ver o projecto <ArrowRight /></AppLink></Button>}
          </Card>
        </aside>
      </div>
    </>
  );
}

function HeartBurst() {
  return (
    <span className="pointer-events-none absolute inset-0" aria-hidden>
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return (
          <motion.span key={i} className="absolute left-1/2 top-1/2 text-inc" initial={{ x: 0, y: 0, opacity: 1, scale: 0.6 }} animate={{ x: Math.cos(a) * 60, y: Math.sin(a) * 40, opacity: 0, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.7, ease: "easeOut" }}>
            <Heart className="size-3 fill-current" />
          </motion.span>
        );
      })}
    </span>
  );
}

function Comment({ c, canModerate, onReply }: { c: { id: string; text: string; at: string; author: string; hidden: boolean }; canModerate: boolean; onReply?: () => void }) {
  return (
    <div className={cn("grid gap-1 rounded-[var(--radius-md)] border border-line bg-surface p-4", c.hidden && "opacity-50")}>
      <p className="flex items-center gap-2 text-sm"><span className="grid size-6 place-items-center rounded-full bg-surface-2 text-[10px] font-bold">{initials(c.author)}</span><span className="font-medium">{c.author}</span><span className="text-fg-subtle">· {fmtRelative(c.at)}</span>{c.hidden && <Tag tone="warn">Escondido</Tag>}</p>
      <p className="text-sm">{c.text}</p>
      <div className="flex gap-3 text-xs">
        {onReply && <button onClick={onReply} className="font-medium text-brand-ink hover:underline">Responder</button>}
        {canModerate && <button onClick={() => mutate("moderateComment", { id: c.id, hidden: !c.hidden })} className="flex items-center gap-1 text-fg-muted hover:text-fg">{c.hidden ? <><Eye className="size-3" /> Mostrar</> : <><EyeOff className="size-3" /> Esconder</>}</button>}
      </div>
    </div>
  );
}

// =============================================================== P27 Pedidos de apoio ao Lab

export function SupportView() {
  return <RequirePage page="P27" title="os pedidos de apoio"><Support /></RequirePage>;
}

function Support() {
  const { data, loading, reload } = useQuery("supportOverview");
  const form = useForm<F3Input>({ resolver: zodResolver(F3Schema) as never, defaultValues: { type: "PROTOTIPO", proposal: "", costCenter: "", description: "", dueDate: "", urgent: false, attachments: [] } });
  const type = form.watch("type");
  const urgent = form.watch("urgent");
  const e = form.formState.errors;
  if (loading || !data) return <div className="container-x py-16"><ListSkeleton /></div>;
  const quotaPct = (data.acceptedThisWeek / Math.max(1, data.quota)) * 100;
  return (
    <>
      <PageHeader tone="lab" crumbs={[{ label: t("nav.support") }]} eyebrow="P27" title="Pedidos de apoio ao Lab" lead="Propostas comerciais, protótipos, demonstrações e formação. As horas são imputadas a quem pede." />
      <div className="container-x grid gap-8 py-10 lg:grid-cols-[1fr_380px]">
        <div className="grid content-start gap-6">
          {data.canSubmit && (
            <Card className="p-6 md:p-8">
              <h2 className="mb-5 font-display text-xl font-bold">Novo pedido (F3)</h2>
              <form noValidate className="grid gap-5" onSubmit={form.handleSubmit(async (v) => { try { await mutate("createSupportRequest", v); toast.success("Pedido enviado ao Lab."); form.reset(); } catch (x) { toast.error((x as ApiError).message); } })}>
                <div className="grid gap-2">
                  <p id="sup-type" className="text-sm font-medium">Tipo de apoio <span className="text-danger">*</span></p>
                  <ChoiceGroup labelledBy="sup-type" name="type" columns={3} value={type} onChange={(v) => form.setValue("type", v as F3Input["type"])} options={["PROPOSTA", "PROTOTIPO", "FORMACAO", "ARQUITECTURA", "OUTRO"].map((x) => ({ value: x as F3Input["type"], label: L.support(x) }))} />
                </div>
                <AnimatePresence>
                  {type === "ARQUITECTURA" && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex gap-3 overflow-hidden rounded-[var(--radius-md)] bg-info-soft p-4 text-sm text-info">
                      <Info className="size-5 shrink-0" />
                      <p>Arquitectura e assessoria técnica são do <strong>Digital Office</strong>. Contacto: digital.office@tis.example. Se enviar aqui, o gestor do Lab encaminha o pedido.</p>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field id="sup-prop" label="Proposta ou projecto" hint="Nome e código." required error={e.proposal?.message}><Input {...form.register("proposal")} /></Field>
                  <Field id="sup-cc" label="Centro de custo" required error={e.costCenter?.message}><Input {...form.register("costCenter")} /></Field>
                </div>
                <Field id="sup-desc" label="Descrição do pedido" required error={e.description?.message}><Textarea rows={4} {...form.register("description")} /></Field>
                <Field id="sup-due" label="Prazo" required error={e.dueDate?.message}><Input type="date" {...form.register("dueDate")} /></Field>
                <Checkbox id="sup-urg" checked={urgent} onCheckedChange={(v) => form.setValue("urgent", v)} label={<>Urgente (via rápida) <span className="text-fg-subtle">· {data.acceptedThisWeek} de {data.quota} usados esta semana</span></>} />
                <FileDrop value={form.watch("attachments") as Attachment[]} onChange={(v) => form.setValue("attachments", v as never)} />
                <Button type="submit" loading={form.formState.isSubmitting} className="w-fit"><Send /> Enviar pedido</Button>
              </form>
            </Card>
          )}
          {data.canManage || data.all.length > 0 ? <AllRequests rows={data.all} canManage={data.canManage} onChange={reload} /> : null}
        </div>
        <aside className="grid content-start gap-4">
          <Card className="grid gap-3 p-6">
            <p className="flex items-center gap-2 font-display text-lg font-bold"><Zap className="size-5 text-warn" /> Via rápida desta semana</p>
            <p className="font-display text-4xl font-bold tabular">{data.acceptedThisWeek}<span className="text-xl text-fg-subtle"> / {data.quota}</span></p>
            <Progress value={quotaPct} tone={quotaPct >= 100 ? "inc" : "lab"} label="Quota semanal da via rápida" />
            <p className="text-xs text-fg-subtle">Quota configurável em Utilizadores e configurações.</p>
          </Card>
          <Card className="grid gap-3 p-6">
            <p className="font-display text-lg font-bold">Os meus pedidos</p>
            {data.mine.length === 0 ? <p className="text-sm text-fg-muted">Ainda não fez pedidos.</p> : data.mine.map((r) => (
              <div key={r.id} className="grid gap-1 border-t border-line pt-3 text-sm">
                <p className="font-medium">{r.proposal}</p>
                <div className="flex flex-wrap gap-1.5"><Tag tone={r.status === "CONCLUIDO" ? "ok" : r.status === "RECUSADO" ? "danger" : r.status === "ENCAMINHADO" ? "info" : "brand"} dot>{L.supportStatus(r.status)}</Tag>{r.urgent && <Tag tone="warn">Via rápida</Tag>}</div>
                <p className="text-xs text-fg-subtle">{L.support(r.type)} · prazo {fmtDate(r.dueDate)}</p>
              </div>
            ))}
          </Card>
        </aside>
      </div>
    </>
  );
}

function AllRequests({ rows, canManage, onChange }: { rows: { id: string; proposal: string; type: string; status: string; urgent: boolean; dueDate: string; requester?: string; costCenter: string }[]; canManage: boolean; onChange: () => void }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-line p-5"><h2 className="font-display text-xl font-bold">Todos os pedidos</h2>{!canManage && <Tag>Leitura</Tag>}</div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-bg text-left text-fg-subtle"><tr><th className="p-3 font-medium">Pedido</th><th className="p-3 font-medium">Tipo</th><th className="p-3 font-medium">Quem pede</th><th className="p-3 font-medium">Prazo</th><th className="p-3 font-medium">Estado</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-line">
                <td className="p-3"><p className="font-medium">{r.proposal}</p><p className="text-xs text-fg-subtle">{r.costCenter}{r.urgent && " · via rápida"}</p></td>
                <td className="p-3">{L.support(r.type)}</td>
                <td className="p-3">{r.requester}</td>
                <td className="p-3">{fmtDate(r.dueDate)}</td>
                <td className="p-3">
                  {canManage ? (
                    <Select aria-label={`Estado de ${r.proposal}`} value={r.status} className="h-9 w-48 text-sm" onChange={async (e) => { try { await mutate("setSupportStatus", { id: r.id, status: e.target.value as never }); toast.success("Estado actualizado."); onChange(); } catch (x) { toast.error((x as ApiError).message); } }}>
                      {["RECEBIDO", "ACEITE", "EM_CURSO", "CONCLUIDO", "RECUSADO", "ENCAMINHADO"].map((s) => <option key={s} value={s}>{L.supportStatus(s)}</option>)}
                    </Select>
                  ) : <Tag>{L.supportStatus(r.status)}</Tag>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// =============================================================== P28 Aprender

const TEMPLATE_BODY: Record<string, string> = {
  "Cartão de oportunidade": "CARTÃO DE OPORTUNIDADE\n\nProblema:\nQuem o sente:\nCom que frequência:\nEvidência (entrevistas, dados):\nOportunidade para a TIS:\n",
  "Test card": "TEST CARD\n\nAcreditamos que:\nPara verificar, vamos:\nE medir:\nEstamos certos se:\n",
  "Learning card": "LEARNING CARD\n\nAcreditávamos que:\nObservámos:\nAprendemos que:\nPor isso, vamos:\n",
  "Pacote de handover": "PACOTE DE HANDOVER\n\n[ ] Documentação técnica\n[ ] Aceitação escrita da direcção\n[ ] Formação da equipa receptora\n[ ] Controlo aos 7 dias\n[ ] Controlo aos 21 dias\n",
};

export function LearnView() {
  return <RequirePage page="P28" title="Aprender"><Learn /></RequirePage>;
}

function Learn() {
  const { data: res = [], loading } = useQuery("listContents", { kinds: ["RECURSO", "FORMACAO"] });
  const { data: cards = [] } = useQuery("listLearningCards");
  const [q, setQ] = React.useState("");
  const [type, setType] = React.useState("");
  const [theme, setTheme] = React.useState("");
  const items = res.filter((r) => r.visibility === "INTERNO" || r.kind === "RECURSO");
  const match = (title: string, th?: string, ty?: string) => (!q || title.toLowerCase().includes(q.toLowerCase())) && (!theme || th === theme) && (!type || ty === type);
  const themes = [...new Set(items.map((r) => r.meta?.theme).filter(Boolean))] as string[];
  const templates = items.filter((r) => r.kind === "RECURSO" && ["TEMPLATE", "CHECKLIST"].includes(r.meta?.type ?? "") && match(r.title, r.meta?.theme, "TEMPLATE"));
  const pilots = items.filter((r) => r.meta?.type === "PILOTO" && match(r.title, r.meta?.theme, "PILOTO"));
  const demos = items.filter((r) => r.meta?.type === "DEMO" && match(r.title, r.meta?.theme, "DEMO"));
  const trainings = items.filter((r) => r.kind === "FORMACAO" && match(r.title, r.meta?.theme, "FORMACAO"));
  const lcs = cards.filter((c) => match(c.title, undefined, "LEARNING"));
  const download = (title: string) => {
    const body = TEMPLATE_BODY[title] ?? title;
    const url = URL.createObjectURL(new Blob([body], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = `${title.toLowerCase().replace(/\s+/g, "-")}.txt`; a.click(); URL.revokeObjectURL(url);
  };
  return (
    <>
      <PageHeader tone="lab" crumbs={[{ label: t("nav.learn") }]} eyebrow="P28" title="Aprender" lead="Templates do método, learning cards, formações e demonstrações reutilizáveis." />
      <div className="container-x grid gap-12 py-10">
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-60 flex-1"><Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" /><Input aria-label="Pesquisar recursos" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar" className="pl-10" /></div>
          <Select aria-label="Tipo" value={type} onChange={(e) => setType(e.target.value)} className="w-auto"><option value="">Todos os tipos</option><option value="TEMPLATE">Templates e checklists</option><option value="LEARNING">Learning cards</option><option value="FORMACAO">Formações</option><option value="PILOTO">Equipas-piloto</option><option value="DEMO">Demonstrações</option></Select>
          <Select aria-label="Tema" value={theme} onChange={(e) => setTheme(e.target.value)} className="w-auto"><option value="">Todos os temas</option>{themes.map((x) => <option key={x}>{x}</option>)}</Select>
        </div>
        {loading ? <ListSkeleton /> : (
          <>
            <ResourceSection title="Templates e checklists" icon={FileText} empty={!templates.length}>
              {templates.map((r) => (
                <Card key={r.id} className="grid gap-3 p-5">
                  <Tag tone="lab" className="w-fit">{r.meta?.type === "CHECKLIST" ? "Checklist" : "Template"}</Tag>
                  <h3 className="font-display text-lg font-bold">{r.title}</h3>
                  <p className="text-sm text-fg-muted">{r.summary}</p>
                  <Button variant="secondary" size="sm" className="mt-auto w-fit" onClick={() => download(r.title)}><Download /> Descarregar</Button>
                </Card>
              ))}
            </ResourceSection>
            <ResourceSection title="Learning cards dos projectos" icon={BookOpen} empty={!lcs.length}>
              {lcs.map((c) => (
                <Card key={c.title} className="grid gap-2 p-5">
                  <Tag tone={c.area === "LAB" ? "lab" : "inc"} className="w-fit">{c.projectName}</Tag>
                  <h3 className="font-medium">{c.title}</h3>
                  <p className="text-sm text-fg-muted">{c.learned}</p>
                </Card>
              ))}
            </ResourceSection>
            <ResourceSection title="Formações da Academia TIS e da School TIS Tech" icon={CalendarDays} empty={!trainings.length}>
              {trainings.map((r) => (
                <Card key={r.id} className="grid gap-2 p-5">
                  <p className="text-xs text-fg-subtle">{fmtDate(r.date)} · {r.place}</p>
                  <h3 className="font-medium">{r.title}</h3>
                  {r.signupUrl && <a href={r.signupUrl} target="_blank" rel="noreferrer" className="mt-auto flex items-center gap-1 text-sm font-medium text-brand-ink hover:underline">Inscrever-me <ExternalLink className="size-3.5" /></a>}
                </Card>
              ))}
            </ResourceSection>
            <ResourceSection title="Equipas-piloto e resultados" icon={Users} empty={!pilots.length}>
              {pilots.map((r) => <Card key={r.id} className="grid gap-2 p-5"><h3 className="font-medium">{r.title}</h3><p className="text-sm text-fg-muted">{r.summary}</p></Card>)}
            </ResourceSection>
            <ResourceSection title="Demonstrações reutilizáveis para propostas" icon={MonitorPlay} empty={!demos.length}>
              {demos.map((r) => <Card key={r.id} className="grid gap-2 p-5"><h3 className="font-medium">{r.title}</h3><p className="text-sm text-fg-muted">{r.summary}</p><Button variant="ghost" size="sm" className="w-fit" asChild><AppLink href="/apoio">Pedir esta demo <ArrowRight /></AppLink></Button></Card>)}
            </ResourceSection>
          </>
        )}
      </div>
    </>
  );
}

function ResourceSection({ title, icon: Icon, children, empty }: { title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode; empty: boolean }) {
  if (empty) return null;
  return (
    <section className="grid gap-4">
      <h2 className="flex items-center gap-2 font-display text-2xl font-bold"><Icon className="size-5 text-lab-ink" /> {title}</h2>
      <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{React.Children.map(children, (c) => <StaggerItem className="h-full [&>*]:h-full">{c}</StaggerItem>)}</Stagger>
    </section>
  );
}

// =============================================================== P29 Comunidade

export function CommunityView() {
  return <RequirePage page="P29" title="a Comunidade"><Community /></RequirePage>;
}

function Community() {
  const { data = [], loading } = useQuery("listContents", { kinds: ["NOTICIA", "CHAMPION", "DESTAQUE", "AGENDA"] });
  const news = data.filter((c) => c.kind === "NOTICIA" && c.visibility === "INTERNO");
  const champions = data.filter((c) => c.kind === "CHAMPION");
  const highlights = data.filter((c) => c.kind === "DESTAQUE" && c.meta?.month);
  const agenda = data.filter((c) => c.kind === "AGENDA").sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
  if (loading) return <div className="container-x py-16"><ListSkeleton /></div>;
  return (
    <>
      <PageHeader crumbs={[{ label: t("nav.community") }]} eyebrow="P29" title="Comunidade" lead="Pessoas, destaques e agenda interna do ecossistema." />
      <div className="container-x grid gap-14 py-10">
        <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
          <section className="grid content-start gap-4">
            <SectionHeading title="Destaques do mês" />
            <Stagger className="grid gap-4 sm:grid-cols-2">
              {highlights.map((h) => (
                <StaggerItem key={h.id}>
                  <Card className="relative grid h-full gap-2 overflow-hidden p-6">
                    <Trophy className="absolute -right-3 -top-3 size-20 text-ai/10" aria-hidden />
                    <Tag tone="ai" className="w-fit">{h.meta?.badge}</Tag>
                    <p className="font-display text-xl font-bold">{h.title}</p>
                    <p className="text-sm text-fg-muted">{h.summary}</p>
                  </Card>
                </StaggerItem>
              ))}
            </Stagger>
          </section>
          <section className="grid content-start gap-4">
            <SectionHeading title="Agenda interna" />
            <Card className="divide-y divide-line">
              {agenda.map((a) => (
                <div key={a.id} className="flex gap-4 p-4">
                  <div className="grid w-14 shrink-0 place-items-center rounded-[var(--radius-md)] bg-brand-soft py-2 text-brand-ink">
                    <span className="font-display text-xl font-bold leading-none">{a.date ? new Date(a.date).getDate() : "—"}</span>
                    <span className="text-[10px] uppercase">{fmtDate(a.date, { month: "short" })}</span>
                  </div>
                  <div><p className="font-medium">{a.title}</p><p className="text-sm text-fg-muted">{a.summary} · {a.place}</p></div>
                </div>
              ))}
            </Card>
          </section>
        </div>
        <section className="grid gap-4">
          <SectionHeading title="Champions de cada área" lead="Pessoas que ajudam a adoptar a inovação nas suas equipas." />
          <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {champions.map((c) => (
              <StaggerItem key={c.id}>
                <Card className="grid h-full justify-items-center gap-2 p-6 text-center">
                  <span className="grid size-16 place-items-center rounded-full bg-gradient-to-br from-lab to-brand font-display text-xl font-bold text-white">{initials(c.title)}</span>
                  <p className="font-display text-lg font-bold">{c.title}</p>
                  <p className="text-sm text-fg-muted">{c.summary} · {c.meta?.area}</p>
                  <a href={`mailto:${c.meta?.contact}`} className="flex items-center gap-1 text-sm font-medium text-brand-ink hover:underline"><Mail className="size-3.5" />{c.meta?.contact}</a>
                </Card>
              </StaggerItem>
            ))}
          </Stagger>
        </section>
        <section className="grid gap-4">
          <SectionHeading title="Notícias internas" />
          {news.length === 0 ? <EmptyState title="Sem notícias internas." /> : news.map((n) => (
            <AppLink key={n.id} href={`/noticias/${n.slug}`} className="grid gap-1 rounded-[var(--radius-lg)] border border-line bg-surface p-5 hover:border-line-strong">
              <p className="text-xs text-fg-subtle">{fmtDate(n.publishedAt)}</p>
              <p className="font-display text-lg font-bold">{n.title}</p>
              <p className="text-sm text-fg-muted">{n.summary}</p>
            </AppLink>
          ))}
        </section>
      </div>
    </>
  );
}

