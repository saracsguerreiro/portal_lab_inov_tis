"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { toast } from "sonner";
import { AlertCircle, ArrowRight, BadgeCheck, Bell, Download, EyeOff, FlaskConical, KeyRound, Link2, MessageSquare, Paperclip, Plus, Send, Trash2, Undo2, UserRound } from "lucide-react";
import type { Attachment } from "@/lib/domain/types";
import { t, fmtDate, fmtDateTime, fmtRelative } from "@/lib/i18n";
import { cn, initials } from "@/lib/utils";
import { L } from "@/lib/domain/labels";
import { LAB_STAGES, INC_STAGES } from "@/lib/domain/workflow";
import { useQuery, useSession } from "@/lib/client/hooks";
import { api, ApiError, mutate } from "@/lib/client/runtime";
import { Button, Card, Dialog, EmptyState, ErrorState, Field, Input, ListSkeleton, Select, Switch, Tag, Textarea } from "@/components/ui";
import { FileDrop, PageHeader, RequirePage, StatusTag } from "@/components/domain";
import { AppLink } from "@/components/layout/app-link";
import { IdeaStatusPanel } from "./submit";

// =============================================================== P20 As minhas ideias

export function MyIdeasView() {
  return <RequirePage page="P20" title="as suas ideias"><MyIdeas /></RequirePage>;
}

function MyIdeas() {
  const { data, loading, error, reload } = useQuery("listMyIdeas");
  const { user } = useSession();
  const [status, setStatus] = React.useState("");
  const [type, setType] = React.useState("");
  const [linkOpen, setLinkOpen] = React.useState(false);
  const list = (data ?? []).filter((i) => (!status || i.status === status) && (!type || i.type === type));
  const actions = (data ?? []).filter((i) => i.actionNeeded).length;
  return (
    <>
      <PageHeader crumbs={[{ label: t("nav.myIdeas") }]} eyebrow="P20" title={t("nav.myIdeas")} lead={`Olá, ${user?.name.split(" ")[0]}. Aqui acompanha o estado e o feedback de cada ideia.`}
        actions={<>
          <Button asChild><AppLink href="/submeter"><Plus /> Submeter nova ideia</AppLink></Button>
          <Button variant="secondary" onClick={() => setLinkOpen(true)}><Link2 /> Associar ideia anónima</Button>
        </>} />
      <div className="container-x grid gap-6 py-10">
        <AnimatePresence>
          {actions > 0 && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-warn/40 bg-warn-soft p-4 text-warn" role="status">
              <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1.6, repeat: Infinity }}><AlertCircle className="size-5" /></motion.span>
              <p className="text-sm font-medium">{actions === 1 ? "Uma ideia precisa da sua resposta." : `${actions} ideias precisam da sua resposta.`}</p>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="flex flex-wrap gap-2">
          <Select aria-label="Estado" value={status} onChange={(e) => setStatus(e.target.value)} className="w-auto"><option value="">Todos os estados</option>{["RECEBIDA", "EM_ANALISE", "INFO_PEDIDA", "EM_AVALIACAO", "DECISAO", "RETIRADA", "DUPLICADA"].map((s) => <option key={s} value={s}>{L.status(s as never)}</option>)}</Select>
          <Select aria-label="Tipo" value={type} onChange={(e) => setType(e.target.value)} className="w-auto"><option value="">Todos os tipos</option>{["EXTERNA", "MELHORIA", "NEGOCIO_COLABORADOR"].map((s) => <option key={s} value={s}>{L.ideaType(s as never)}</option>)}</Select>
        </div>
        {error ? <ErrorState message={error.message} onRetry={reload} /> : loading ? <ListSkeleton rows={4} /> : list.length === 0 ? (
          <EmptyState title={data?.length ? t("states.noResults") : "Ainda não submeteu ideias"} hint="Tem uma ideia? Leva poucos minutos." action={<Button asChild><AppLink href="/submeter">{t("nav.submit")}</AppLink></Button>} />
        ) : (
          <LayoutGroup>
            <motion.ul layout className="grid gap-3">
              {list.map((i) => (
                <motion.li key={i.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  <AppLink href={`/conta/ideias/${i.id}`} className={cn("group flex flex-wrap items-center gap-4 rounded-[var(--radius-lg)] border bg-surface p-5 shadow-1 transition-[border-color,transform] hover:-translate-y-0.5", i.actionNeeded ? "border-warn/50" : "border-line hover:border-line-strong")}>
                    <div className="grid min-w-0 flex-1 gap-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs text-fg-subtle">{i.number}</span>
                        <Tag>{L.ideaType(i.type)}</Tag>
                        {i.anonymous && <Tag tone="ai"><EyeOff className="size-3" /> Anónima</Tag>}
                        {i.actionNeeded && <Tag tone="warn" dot>Acção necessária</Tag>}
                        {i.unread > 0 && <Tag tone="brand"><MessageSquare className="size-3" /> {i.unread} nova{i.unread > 1 ? "s" : ""}</Tag>}
                      </div>
                      <p className="truncate font-display text-lg font-bold">{i.title}</p>
                      <p className="text-xs text-fg-subtle">Submetida a {fmtDate(i.createdAt)} · actualizada {fmtRelative(i.updatedAt)}</p>
                    </div>
                    <StatusTag status={i.status} decision={i.decision} />
                    <ArrowRight className="size-5 text-fg-subtle transition-transform group-hover:translate-x-1" />
                  </AppLink>
                </motion.li>
              ))}
            </motion.ul>
          </LayoutGroup>
        )}
      </div>
      <LinkAnonDialog open={linkOpen} onOpenChange={setLinkOpen} />
    </>
  );
}

function LinkAnonDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [code, setCode] = React.useState("");
  const [err, setErr] = React.useState<string>();
  const [busy, setBusy] = React.useState(false);
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Associar ideia anónima" description="Introduza o código de acompanhamento para ver a ideia na sua conta.">
      <form className="grid gap-4" onSubmit={async (e) => {
        e.preventDefault(); setBusy(true); setErr(undefined);
        try { const r = await mutate("linkAnonymousIdea", { code }); toast.success(`Ideia ${r.number} associada.`); onOpenChange(false); setCode(""); }
        catch (x) { setErr((x as ApiError).message); } finally { setBusy(false); }
      }}>
        <Field id="link-code" label="Código" required error={err}><Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="ECO-XXXX-XXXX" className="font-mono tracking-widest" /></Field>
        <Button type="submit" loading={busy} className="w-fit">Associar</Button>
      </form>
    </Dialog>
  );
}

// =============================================================== P21 Detalhe da minha ideia

export function MyIdeaDetailView({ id }: { id: string }) {
  return <RequirePage page="P21" title="esta ideia"><MyIdeaDetail id={id} /></RequirePage>;
}

function MyIdeaDetail({ id }: { id: string }) {
  const router = useRouter();
  const { data: d, loading, error, reload } = useQuery("getMyIdea", { id });
  const [reply, setReply] = React.useState("");
  const [files, setFiles] = React.useState<Attachment[]>([]);
  const [confirm, setConfirm] = React.useState<null | "withdraw" | "delete" | "reveal">(null);
  const [edit, setEdit] = React.useState(false);
  const prevStatus = React.useRef<string | undefined>(undefined);
  React.useEffect(() => {
    if (d && prevStatus.current && prevStatus.current !== d.idea.status) toast.info(`Novo estado: ${L.status(d.idea.status)}`);
    prevStatus.current = d?.idea.status;
  }, [d]);
  if (loading && !d) return <div className="container-x py-16"><ListSkeleton rows={4} /></div>;
  if (error || !d) return <div className="container-x py-16"><ErrorState message={error?.message} onRetry={reload} /></div>;
  const i = d.idea;
  const a = i.answers as Record<string, unknown>;
  const act = async (fn: () => Promise<unknown>, ok: string) => {
    try { await fn(); toast.success(ok); setConfirm(null); } catch (e) { toast.error((e as ApiError).message); }
  };
  return (
    <>
      <PageHeader crumbs={[{ href: "/conta/ideias", label: t("nav.myIdeas") }, { label: i.number }]} eyebrow={`P21 · ${i.number} · ${L.ideaType(i.type)}`} title={i.title}
        actions={<div className="flex flex-wrap items-center gap-2"><StatusTag status={i.status} decision={i.decision} /><Tag tone={i.area === "LAB" ? "lab" : "inc"}>{L.area(i.area)}</Tag>{d.isAnonymous && <Tag tone="ai"><EyeOff className="size-3" /> Anónima</Tag>}</div>} />
      <div className="container-x grid gap-8 py-10 lg:grid-cols-[1fr_360px]">
        <div className="grid content-start gap-6">
          <AnimatePresence>
            {d.openInfoRequest && (
              <motion.div initial={{ opacity: 0, y: -10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }}>
                <Card className="grid gap-4 border-2 border-warn/50 bg-warn-soft p-6">
                  <p className="flex items-center gap-2 font-display text-lg font-bold text-warn"><motion.span animate={{ rotate: [0, 12, -10, 0] }} transition={{ duration: 1, repeat: 2 }}><Bell className="size-5" /></motion.span> A equipa pediu informação</p>
                  <p className="text-fg">{d.openInfoRequest.text}</p>
                  <Field id="reply" label="A sua resposta" required><Textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={4} /></Field>
                  <FileDrop value={files} onChange={setFiles} />
                  <Button className="w-fit" disabled={!reply.trim()} onClick={() => act(async () => { await mutate("sendCreatorMessage", { ideaId: id, text: reply, attachments: files }); setReply(""); setFiles([]); }, "Resposta enviada. A ideia voltou a «Em análise».")}><Send /> Responder</Button>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
          <IdeaStatusPanel d={d as never} />
          {d.project && (
            <Card className="grid gap-4 p-6">
              <p className="flex items-center gap-2 font-display text-lg font-bold"><FlaskConical className="size-5 text-lab-ink" /> A sua ideia é agora um projecto</p>
              <div className="flex flex-wrap gap-1.5">{(d.project.area === "LAB" ? LAB_STAGES : INC_STAGES).map((s) => <Tag key={s} tone={s === d.project!.stage ? (d.project!.area === "LAB" ? "lab" : "inc") : "neutral"}>{L.stage(s)}</Tag>)}</div>
              <Button asChild variant="secondary" className="w-fit"><AppLink href={`/projectos/${d.project.slug}`}>Ver o projecto {d.project.name} <ArrowRight /></AppLink></Button>
            </Card>
          )}
          <Card className="grid gap-4 p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-lg font-bold">A minha submissão</h2>
              {d.canEdit && <Button size="sm" variant="secondary" onClick={() => setEdit(true)}>{t("actions.edit")}</Button>}
            </div>
            <dl className="grid gap-3 text-sm">
              <div><dt className="text-fg-subtle">Resumo</dt><dd>{i.summary}</dd></div>
              {["problem", "solution", "proposal", "differentiation", "businessModel"].filter((k) => a[k]).map((k) => (
                <div key={k}><dt className="text-fg-subtle">{{ problem: "Problema", solution: "Solução", proposal: "Proposta", differentiation: "Diferenciação", businessModel: "Modelo de negócio" }[k]}</dt><dd className="whitespace-pre-line">{String(a[k])}</dd></div>
              ))}
            </dl>
            {!d.canEdit && <p className="text-xs text-fg-subtle">Só pode editar enquanto o estado for «Recebida».</p>}
          </Card>
        </div>
        <aside className="grid content-start gap-4">
          <Card className="grid gap-3 p-5 text-sm">
            <p><span className="text-fg-subtle">Submetida:</span> {fmtDateTime(i.createdAt)}</p>
            <p><span className="text-fg-subtle">Primeiro retorno até:</span> {fmtDate(d.deadline)}</p>
            <p className="text-xs text-fg-subtle">Só vê as mensagens validadas por um gestor. A análise automática é interna e não é mostrada.</p>
          </Card>
          <Card className="grid gap-2 p-5">
            <p className="font-display font-bold">Acções</p>
            <Button variant="secondary" asChild><AppLink href={`/conta/mensagens?ideia=${id}`}><MessageSquare /> Mensagens</AppLink></Button>
            {d.canReveal && <Button variant="secondary" onClick={() => setConfirm("reveal")}><BadgeCheck /> Revelar autoria</Button>}
            {d.canWithdraw && <Button variant="secondary" onClick={() => setConfirm("withdraw")}><Undo2 /> Retirar a ideia</Button>}
            {!i.deleteRequestedAt ? <Button variant="ghost" className="text-danger hover:bg-danger-soft hover:text-danger" onClick={() => setConfirm("delete")}><Trash2 /> Pedir para apagar</Button> : <p className="text-sm text-fg-subtle">Pedido para apagar registado a {fmtDate(i.deleteRequestedAt)}. Um gestor confirma.</p>}
          </Card>
        </aside>
      </div>
      <Dialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)} title={confirm === "withdraw" ? "Retirar a ideia?" : confirm === "delete" ? "Pedir para apagar?" : "Revelar a autoria?"}
        description={confirm === "withdraw" ? "A ideia deixa de ser analisada. Esta acção não se desfaz." : confirm === "delete" ? "O pedido fica registado e um gestor confirma. Depois, a ideia é anonimizada." : "Os gestores passam a ver o seu nome nesta ideia. Esta acção não se desfaz."}>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirm(null)}>{t("actions.cancel")}</Button>
          <Button variant={confirm === "reveal" ? "primary" : "danger"} onClick={() => act(() => confirm === "withdraw" ? mutate("withdrawMyIdea", { id }) : confirm === "delete" ? mutate("requestDeleteMyIdea", { id }) : mutate("revealAuthorship", { id }), "Feito.")}>{t("actions.confirm")}</Button>
        </div>
      </Dialog>
      <EditDialog open={edit} onOpenChange={setEdit} id={id} title={i.title} summary={i.summary} />
    </>
  );
}

function EditDialog({ open, onOpenChange, id, title, summary }: { open: boolean; onOpenChange: (o: boolean) => void; id: string; title: string; summary: string }) {
  const [tt, setT] = React.useState(title);
  const [ss, setS] = React.useState(summary);
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Editar a submissão">
      <div className="grid gap-4">
        <Field id="e-t" label="Título" required><Input value={tt} maxLength={80} onChange={(e) => setT(e.target.value)} /></Field>
        <Field id="e-s" label="Resumo" required><Textarea value={ss} maxLength={200} onChange={(e) => setS(e.target.value)} /></Field>
        <Button className="w-fit" onClick={async () => { try { await mutate("editMyIdea", { id, title: tt, summary: ss }); toast.success("Guardado. A análise é refeita."); onOpenChange(false); } catch (e) { toast.error((e as ApiError).message); } }}>{t("actions.save")}</Button>
      </div>
    </Dialog>
  );
}

// =============================================================== P22 Mensagens

export function MessagesView() {
  return <RequirePage page="P22" title="as suas mensagens"><Messages /></RequirePage>;
}

function Messages() {
  const { data, loading } = useQuery("listMyThreads");
  const [sel, setSel] = React.useState<string | null>(null);
  const [text, setText] = React.useState("");
  const [files, setFiles] = React.useState<Attachment[]>([]);
  const [showFiles, setShowFiles] = React.useState(false);
  const endRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const q = new URLSearchParams(location.search).get("ideia");
    if (q) setSel(q);
  }, []);
  const threads = data ?? [];
  const current = threads.find((x) => x.ideaId === (sel ?? threads[0]?.ideaId));
  React.useEffect(() => endRef.current?.scrollIntoView({ block: "nearest" }), [current?.messages.length]);
  return (
    <>
      <PageHeader crumbs={[{ label: t("nav.messages") }]} eyebrow="P22" title={t("nav.messages")} lead="Uma conversa por ideia. As mensagens da equipa são enviadas por um gestor." />
      <div className="container-x py-8">
        {loading ? <ListSkeleton /> : threads.length === 0 ? <EmptyState title="Sem conversas" hint="As conversas aparecem quando submete uma ideia." /> : (
          <Card className="grid min-h-[60vh] overflow-hidden md:grid-cols-[320px_1fr]">
            <ul className="max-h-[70vh] overflow-y-auto border-b border-line md:border-b-0 md:border-r" aria-label="Conversas">
              {threads.map((th) => (
                <li key={th.ideaId}>
                  <button onClick={() => setSel(th.ideaId)} aria-current={current?.ideaId === th.ideaId} className={cn("grid w-full gap-1 border-b border-line p-4 text-left transition-colors hover:bg-surface-2", current?.ideaId === th.ideaId && "bg-brand-soft")}>
                    <span className="flex items-center justify-between gap-2"><span className="font-mono text-xs text-fg-subtle">{th.number}</span>{th.unread > 0 && <span className="grid min-w-5 place-items-center rounded-full bg-inc px-1.5 text-[10px] font-bold text-white">{th.unread}</span>}</span>
                    <span className="truncate font-medium">{th.title}</span>
                    <span className="truncate text-xs text-fg-muted">{th.last ? th.last.text : "Sem mensagens"}</span>
                  </button>
                </li>
              ))}
            </ul>
            {current && (
              <div className="flex min-h-[60vh] flex-col">
                <div className="flex items-center justify-between gap-3 border-b border-line p-4">
                  <div><p className="font-medium">{current.title}</p><p className="text-xs text-fg-subtle">Equipa {current.area === "LAB" ? "do Laboratório" : "da Incubadora"}</p></div>
                  <StatusTag status={current.status} />
                </div>
                <div className="flex flex-1 flex-col gap-3 overflow-y-auto bg-bg p-4" aria-live="polite">
                  {current.messages.length === 0 && <p className="m-auto text-sm text-fg-subtle">Ainda não há mensagens.</p>}
                  {current.messages.map((m) => (
                    <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn("grid max-w-[80%] gap-1 rounded-2xl px-4 py-3", m.fromTeam ? "self-start rounded-tl-sm bg-surface shadow-1" : "self-end rounded-tr-sm bg-brand text-white")}>
                      {m.kind === "PEDIDO_INFO" && <span className="text-xs font-medium text-warn">Pedido de informação</span>}
                      <p className="whitespace-pre-line text-sm">{m.text}</p>
                      {m.attachments.map((f) => <span key={f.id} className="flex items-center gap-1 text-xs opacity-80"><Paperclip className="size-3" />{f.name}</span>)}
                      <span className={cn("text-[11px]", m.fromTeam ? "text-fg-subtle" : "text-white/70")}>{fmtDateTime(m.at)}</span>
                    </motion.div>
                  ))}
                  <div ref={endRef} />
                </div>
                <form className="grid gap-2 border-t border-line p-3" onSubmit={async (e) => {
                  e.preventDefault();
                  try { await mutate("sendCreatorMessage", { ideaId: current.ideaId, text, attachments: files }); setText(""); setFiles([]); setShowFiles(false); } catch (x) { toast.error((x as ApiError).message); }
                }}>
                  {showFiles && <FileDrop value={files} onChange={setFiles} />}
                  <div className="flex gap-2">
                    <Button type="button" variant="ghost" size="icon" onClick={() => setShowFiles((s) => !s)} aria-label="Anexar ficheiros" aria-pressed={showFiles}><Paperclip /></Button>
                    <label htmlFor="msg-text" className="sr-only">Mensagem</label>
                    <Input id="msg-text" value={text} onChange={(e) => setText(e.target.value)} placeholder="Escreva uma mensagem" />
                    <Button type="submit" size="icon" disabled={!text.trim()} aria-label={t("actions.send")}><Send /></Button>
                  </div>
                </form>
              </div>
            )}
          </Card>
        )}
      </div>
    </>
  );
}

// =============================================================== P23 O meu perfil

export function ProfileView() {
  return <RequirePage page="P23" title="o seu perfil"><Profile /></RequirePage>;
}

function Profile() {
  const { data: me, reload } = useQuery("getMe");
  const [busy, setBusy] = React.useState(false);
  const [pw, setPw] = React.useState({ current: "", next: "" });
  const [delOpen, setDelOpen] = React.useState(false);
  const [tagInput, setTagInput] = React.useState("");
  if (!me) return <div className="container-x py-16"><ListSkeleton /></div>;
  const ext = me.authProvider === "EMAIL";
  const prefs = me.notifyPrefs ?? { email: true, teams: true, challenges: true };
  const save = async (patch: Parameters<typeof api<"updateProfile">>[1]) => {
    setBusy(true);
    try { await mutate("updateProfile", patch); toast.success(t("states.saved")); reload(); } catch (e) { toast.error((e as ApiError).message); } finally { setBusy(false); }
  };
  const e = me.external;
  return (
    <>
      <PageHeader crumbs={[{ label: t("nav.profile") }]} eyebrow="P23" title={t("nav.profile")} />
      <div className="container-x grid gap-6 py-10 lg:grid-cols-[320px_1fr]">
        <Card className="grid content-start justify-items-center gap-3 p-6 text-center">
          <span className="grid size-24 place-items-center rounded-full bg-gradient-to-br from-lab via-brand to-inc font-display text-3xl font-bold text-white">{initials(me.name)}</span>
          <p className="font-display text-xl font-bold">{me.name}</p>
          <p className="text-sm text-fg-muted">{me.email}</p>
          <Tag tone="brand">{L.role(me.role)}</Tag>
          {!ext && me.department && <p className="text-sm text-fg-subtle">{me.department}</p>}
          {!ext && <p className="text-xs text-fg-subtle">Dados da Microsoft (só leitura).</p>}
          {(me.badges ?? []).length > 0 && (
            <div className="grid w-full gap-2 border-t border-line pt-4">
              <p className="text-sm font-medium">Selos de participação</p>
              <div className="flex flex-wrap justify-center gap-2">{me.badges!.map((b, i) => (
                <motion.span key={b} initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.2 + i * 0.1, type: "spring" }} className="inline-flex items-center gap-1 rounded-full bg-ai-soft px-3 py-1 text-xs font-medium text-ai-ink"><BadgeCheck className="size-3.5" />{b}</motion.span>
              ))}</div>
            </div>
          )}
        </Card>
        <div className="grid content-start gap-6">
          {ext ? (
            <Card className="grid gap-5 p-6">
              <h2 className="font-display text-lg font-bold">Dados</h2>
              <form className="grid gap-4 sm:grid-cols-2" onSubmit={(ev) => {
                ev.preventDefault();
                const f = new FormData(ev.currentTarget);
                const g = (k: string) => (f.get(k) as string) || undefined;
                save({ name: g("name"), external: { type: (g("type") as never) ?? e!.type, organization: g("organization"), website: g("website"), phone: g("phone"), country: g("country"), city: g("city"), foundedYear: g("foundedYear") ? Number(g("foundedYear")) : undefined, teamSize: g("teamSize") ? Number(g("teamSize")) : undefined, stage: g("stage"), institution: g("institution"), department: g("department"), position: g("position"), profession: g("profession") } });
              }}>
                <Field id="p-name" label="Nome" required><Input name="name" defaultValue={me.name} /></Field>
                <Field id="p-email" label="Email" hint="Só leitura depois de confirmado."><Input value={me.email} readOnly disabled /></Field>
                <Field id="p-phone" label="Telefone"><Input name="phone" defaultValue={e?.phone} /></Field>
                <Field id="p-type" label="Tipo de perfil" required><Select name="type" defaultValue={e?.type}>{["STARTUP", "UNIVERSIDADE", "INDIVIDUAL", "OUTRA"].map((x) => <option key={x} value={x}>{L.extType(x)}</option>)}</Select></Field>
                <Field id="p-country" label="País"><Input name="country" defaultValue={e?.country} /></Field>
                <Field id="p-city" label="Cidade"><Input name="city" defaultValue={e?.city} /></Field>
                {e?.type === "STARTUP" && <>
                  <Field id="p-org" label="Nome da startup"><Input name="organization" defaultValue={e?.organization} /></Field>
                  <Field id="p-site" label="Site"><Input name="website" defaultValue={e?.website} /></Field>
                  <Field id="p-year" label="Ano de fundação"><Input name="foundedYear" type="number" defaultValue={e?.foundedYear} /></Field>
                  <Field id="p-size" label="Número de pessoas"><Input name="teamSize" type="number" defaultValue={e?.teamSize} /></Field>
                  <Field id="p-stage" label="Fase"><Input name="stage" defaultValue={e?.stage} /></Field>
                </>}
                {e?.type === "UNIVERSIDADE" && <>
                  <Field id="p-inst" label="Instituição"><Input name="institution" defaultValue={e?.institution} /></Field>
                  <Field id="p-dep" label="Departamento"><Input name="department" defaultValue={e?.department} /></Field>
                  <Field id="p-pos" label="Cargo"><Input name="position" defaultValue={e?.position} /></Field>
                </>}
                {e?.type === "INDIVIDUAL" && <Field id="p-prof" label="Área de formação ou profissão"><Input name="profession" defaultValue={e?.profession} /></Field>}
                {e?.type === "OUTRA" && <Field id="p-org2" label="Organização"><Input name="organization" defaultValue={e?.organization} /></Field>}
                <Button type="submit" loading={busy} className="w-fit sm:col-span-2">{t("actions.save")}</Button>
              </form>
            </Card>
          ) : (
            <Card className="grid gap-4 p-6">
              <h2 className="font-display text-lg font-bold">Interesses e competências</h2>
              <p className="text-sm text-fg-muted">Usamos as etiquetas para o convidar para desafios.</p>
              <div className="flex flex-wrap gap-2">
                {(me.interests ?? []).map((x) => (
                  <button key={x} onClick={() => save({ interests: (me.interests ?? []).filter((i) => i !== x) })} className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-3 py-1 text-sm text-brand-ink hover:bg-danger-soft hover:text-danger" aria-label={`Retirar ${x}`}>{x} ×</button>
                ))}
                {(me.skills ?? []).map((x) => <Tag key={x}>{x}</Tag>)}
              </div>
              <form className="flex gap-2" onSubmit={(ev) => { ev.preventDefault(); if (tagInput.trim()) { save({ interests: [...(me.interests ?? []), tagInput.trim()] }); setTagInput(""); } }}>
                <label htmlFor="tag-in" className="sr-only">Novo interesse</label>
                <Input id="tag-in" value={tagInput} onChange={(ev) => setTagInput(ev.target.value)} placeholder="Acrescentar interesse (ex.: dados)" />
                <Button type="submit" variant="secondary">Acrescentar</Button>
              </form>
            </Card>
          )}
          <Card className="grid gap-4 p-6">
            <h2 className="font-display text-lg font-bold">Notificações</h2>
            <Switch id="n-email" checked={prefs.email} onCheckedChange={(v) => save({ notifyPrefs: { ...prefs, email: v } })} label="Por email" description="Mudanças de estado, pedidos de informação e mensagens." />
            {!ext && <Switch id="n-teams" checked={prefs.teams} onCheckedChange={(v) => save({ notifyPrefs: { ...prefs, teams: v } })} label="No Microsoft Teams" />}
            <Switch id="n-ch" checked={prefs.challenges} onCheckedChange={(v) => save({ notifyPrefs: { ...prefs, challenges: v } })} label="Novos desafios que combinam comigo" />
          </Card>
          {ext && (
            <Card className="grid gap-4 p-6">
              <h2 className="flex items-center gap-2 font-display text-lg font-bold"><KeyRound className="size-5" /> Alterar palavra-passe</h2>
              <form className="grid gap-4 sm:grid-cols-2" onSubmit={async (ev) => { ev.preventDefault(); try { await mutate("changePassword", pw); toast.success("Palavra-passe alterada."); setPw({ current: "", next: "" }); } catch (x) { toast.error((x as ApiError).message); } }}>
                <Field id="pw-c" label="Actual" required><Input type="password" autoComplete="current-password" value={pw.current} onChange={(ev) => setPw({ ...pw, current: ev.target.value })} /></Field>
                <Field id="pw-n" label="Nova" hint="Pelo menos 10 caracteres." required><Input type="password" autoComplete="new-password" value={pw.next} onChange={(ev) => setPw({ ...pw, next: ev.target.value })} /></Field>
                <Button type="submit" variant="secondary" className="w-fit">Alterar</Button>
              </form>
            </Card>
          )}
          <Card className="grid gap-3 p-6">
            <h2 className="font-display text-lg font-bold">Os meus dados</h2>
            <p className="text-sm text-fg-muted">Lei n.º 22/11: pode exportar os seus dados{ext ? " ou apagar a conta" : ""}.</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={async () => {
                const data = await api("exportMyData");
                const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
                const a = document.createElement("a"); a.href = url; a.download = "os-meus-dados.json"; a.click(); URL.revokeObjectURL(url);
              }}><Download /> Exportar os meus dados</Button>
              {ext && <Button variant="ghost" className="text-danger hover:bg-danger-soft" onClick={() => setDelOpen(true)}><Trash2 /> Apagar conta</Button>}
            </div>
          </Card>
        </div>
      </div>
      <Dialog open={delOpen} onOpenChange={setDelOpen} title="Apagar a conta?" description="As suas ideias ficam, sem autor. Esta acção não se desfaz.">
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setDelOpen(false)}>{t("actions.cancel")}</Button>
          <Button variant="danger" onClick={async () => { await mutate("deleteMyAccount"); const { session } = await import("@/lib/client/runtime"); await session.signOut(); }}>Apagar</Button>
        </div>
      </Dialog>
    </>
  );
}

