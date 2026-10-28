"use client";
import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { toast } from "sonner";
import { AlertTriangle, ArrowRightLeft, Bot, CheckSquare, Columns3, Copy, FolderPlus, Gavel, Keyboard, List, Mail, MessageSquareQuote, RefreshCw, ShieldAlert, Square, UserCheck, X } from "lucide-react";
import type { Decision, IdeaStatus } from "@/lib/domain/types";
import type { ResultOf } from "@/lib/services";
import type { TriageRow } from "@/lib/services/ideas";
import { t, fmtDate, fmtDateTime } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { L } from "@/lib/domain/labels";
import { canTransition } from "@/lib/domain/workflow";
import { formatAnswer } from "@/lib/domain/answer-labels";
import { useQuery, useSession } from "@/lib/client/hooks";
import { ApiError, mutate } from "@/lib/client/runtime";
import { Button, Card, Dialog, EmptyState, ErrorState, Field, Input, ListSkeleton, Select, Tag, Tabs, TabsContent, TabsList, TabsTrigger, Textarea } from "@/components/ui";
import { CriterionBar, PageHeader, RequirePage, ScoreGauge, StatusTag, Typewriter } from "@/components/domain";

export function TriageView() {
  return <RequirePage page="P31" title="a fila de triagem"><Triage /></RequirePage>;
}

const BOARD: IdeaStatus[] = ["RECEBIDA", "EM_ANALISE", "INFO_PEDIDA", "EM_AVALIACAO", "DECISAO"];

/** Acção com «Desfazer»: só é executada depois de 5 s, se não for anulada (heurística: prevenção de erros). */
function withUndo(label: string, run: () => Promise<unknown>) {
  let cancelled = false;
  const id = toast(label, {
    duration: 5000,
    action: { label: t("actions.undo"), onClick: () => { cancelled = true; toast.dismiss(id); toast.info("Acção anulada."); } },
    onAutoClose: () => { if (!cancelled) run().catch((e) => toast.error((e as ApiError).message)); },
    onDismiss: () => { if (!cancelled) { cancelled = true; run().catch((e) => toast.error((e as ApiError).message)); } },
  });
}

function Triage() {
  const router = useRouter();
  const params = useSearchParams();
  const openId = params?.get("ideia") ?? null;
  const [scope, setScope] = React.useState<"mine" | "all">("mine");
  const [view, setView] = React.useState<"list" | "board">("list");
  const { data, loading, error, reload } = useQuery("triageList", { scope });
  const [q, setQ] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [origin, setOrigin] = React.useState("");
  const [sel, setSel] = React.useState(0);
  const [checked, setChecked] = React.useState<Set<string>>(new Set());
  const [helpOpen, setHelpOpen] = React.useState(false);
  const { user } = useSession();
  const rows = (data ?? []).filter((r) => (!status || r.status === status) && (!origin || r.originLabel === origin) && (!q || `${r.number} ${r.title}`.toLowerCase().includes(q.toLowerCase())));
  const open = (id: string | null) => router.replace(id ? `/gestao/triagem?ideia=${id}` : "/gestao/triagem", { scroll: false });

  // Atalhos de teclado: J/K mover, Enter abrir, Esc fechar, X seleccionar, ? ajuda.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(tag) || e.metaKey || e.ctrlKey) return;
      if (e.key === "j") setSel((s) => Math.min(rows.length - 1, s + 1));
      else if (e.key === "k") setSel((s) => Math.max(0, s - 1));
      else if (e.key === "Enter" && rows[sel] && !openId) open(rows[sel].id);
      else if (e.key === "Escape" && openId) open(null);
      else if (e.key === "x" && rows[sel]) toggleCheck(rows[sel].id);
      else if (e.key === "?") setHelpOpen(true);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  const toggleCheck = (id: string) => setChecked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const bulk = async (kind: "assign" | "analyse") => {
    const ids = [...checked].filter((id) => rows.find((r) => r.id === id)?.canManage);
    if (!ids.length) return toast.error("Nenhuma das ideias seleccionadas é da sua área.");
    withUndo(kind === "assign" ? `Atribuir ${ids.length} ideias a si` : `Passar ${ids.length} ideias a «Em análise»`, async () => {
      for (const id of ids) {
        const r = rows.find((x) => x.id === id)!;
        if (kind === "assign") await mutate("assignIdea", { id, assigneeId: user!.id });
        else if (canTransition("manager", r.status, "EM_ANALISE")) await mutate("changeIdeaStatus", { id, to: "EM_ANALISE" });
      }
      setChecked(new Set());
      toast.success("Acção em lote concluída.");
    });
  };

  return (
    <>
      <PageHeader tone="ai" crumbs={[{ label: t("nav.triage") }]} eyebrow="P31 · Gestão" title="Fila de triagem" lead={!user ? undefined : user.role === "GESTOR_LAB" ? "Por defeito: ideias de melhoria e de negócio de colaboradores. As externas ficam em leitura." : "Por defeito: ideias externas. As de colaboradores ficam em leitura."}
        actions={<Button variant="ghost" onClick={() => setHelpOpen(true)}><Keyboard /> Atalhos</Button>} />
      <div className="container-x grid gap-5 py-8">
        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={scope} onValueChange={(v) => setScope(v as "mine" | "all")}><TabsList><TabsTrigger value="mine">A minha área</TabsTrigger><TabsTrigger value="all">Todas (outra em leitura)</TabsTrigger></TabsList></Tabs>
          <Input aria-label="Pesquisar" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar por número ou título" className="h-10 w-64" />
          <Select aria-label="Estado" value={status} onChange={(e) => setStatus(e.target.value)} className="h-10 w-auto"><option value="">Todos os estados</option>{[...BOARD, "RETIRADA", "DUPLICADA"].map((s) => <option key={s} value={s}>{L.status(s as IdeaStatus)}</option>)}</Select>
          <Select aria-label="Origem" value={origin} onChange={(e) => setOrigin(e.target.value)} className="h-10 w-auto"><option value="">Todas as origens</option><option value="EXTERNA">Externa</option><option value="COLABORADOR">Colaborador</option><option value="ANONIMA">Anónima</option></Select>
          <div className="ml-auto flex gap-1 rounded-[var(--radius-md)] bg-surface-2 p-1" role="radiogroup" aria-label="Vista">
            <button role="radio" aria-checked={view === "list"} onClick={() => setView("list")} className={cn("flex min-h-9 items-center gap-1.5 rounded-[8px] px-3 text-sm", view === "list" && "bg-surface shadow-1")}><List className="size-4" /> Lista</button>
            <button role="radio" aria-checked={view === "board"} onClick={() => setView("board")} className={cn("flex min-h-9 items-center gap-1.5 rounded-[8px] px-3 text-sm", view === "board" && "bg-surface shadow-1")}><Columns3 className="size-4" /> Quadro</button>
          </div>
        </div>
        <AnimatePresence>
          {checked.size > 0 && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-wrap items-center gap-2 rounded-[var(--radius-md)] bg-fg p-2 pl-4 text-sm text-bg">
              <span>{checked.size} seleccionadas</span>
              <Button size="sm" variant="inverse" className="bg-bg text-fg" onClick={() => bulk("assign")}><UserCheck /> Atribuir a mim</Button>
              <Button size="sm" variant="inverse" className="bg-bg text-fg" onClick={() => bulk("analyse")}>Passar a «Em análise»</Button>
              <button className="ml-auto grid size-8 place-items-center rounded-full hover:bg-bg/15" onClick={() => setChecked(new Set())} aria-label="Limpar selecção"><X className="size-4" /></button>
            </motion.div>
          )}
        </AnimatePresence>
        {error ? <ErrorState message={error.message} onRetry={reload} /> : loading && !data ? <ListSkeleton rows={6} /> : rows.length === 0 ? <EmptyState title="Fila vazia" hint="Não há ideias com estes filtros." /> : view === "list" ? (
          <TriageTable rows={rows} sel={sel} setSel={setSel} onOpen={open} checked={checked} toggle={toggleCheck} />
        ) : (
          <TriageBoard rows={rows} onOpen={open} />
        )}
      </div>
      <AnimatePresence>{openId && <SplitView key={openId} id={openId} onClose={() => open(null)} />}</AnimatePresence>
      <Dialog open={helpOpen} onOpenChange={setHelpOpen} title="Atalhos de teclado">
        <dl className="grid grid-cols-[80px_1fr] gap-2 text-sm">
          {[["J / K", "Ideia seguinte / anterior"], ["Enter", "Abrir a ideia"], ["Esc", "Fechar"], ["X", "Seleccionar para acção em lote"], ["Ctrl+K", "Paleta de comandos"], ["?", "Esta ajuda"]].map(([k, v]) => <React.Fragment key={k}><dt><kbd className="rounded border border-line px-1.5 font-mono text-xs">{k}</kbd></dt><dd>{v}</dd></React.Fragment>)}
        </dl>
      </Dialog>
    </>
  );
}

function DaysLeft({ d }: { d: number }) {
  if (d >= 999) return <span className="text-fg-subtle">Respondida</span>;
  return <span className={cn("font-mono tabular", d < 0 ? "font-bold text-danger" : d <= 2 ? "font-bold text-warn" : "text-fg-muted")}>{d < 0 ? `${-d} d atraso` : `${d} d`}</span>;
}
function AiCell({ r }: { r: TriageRow }) {
  if (r.aiStatus === "PENDENTE") return <Tag tone="ai"><RefreshCw className="size-3 animate-spin" /> {t("ai.pending")}</Tag>;
  if (r.aiStatus === "FALHOU") return <Tag tone="danger">Falhou</Tag>;
  if (r.aiScore == null) return <span>—</span>;
  return <span className="flex items-center gap-2"><span className="h-1.5 w-12 overflow-hidden rounded-full bg-surface-3"><span className="block h-full rounded-full bg-ai" style={{ width: `${r.aiScore}%` }} /></span><span className="font-mono tabular">{r.aiScore}</span></span>;
}

function TriageTable({ rows, sel, setSel, onOpen, checked, toggle }: { rows: TriageRow[]; sel: number; setSel: (n: number) => void; onOpen: (id: string) => void; checked: Set<string>; toggle: (id: string) => void }) {
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1080px] text-sm">
          <caption className="sr-only">Ideias na fila de triagem</caption>
          <thead className="bg-bg text-left text-xs uppercase tracking-wider text-fg-subtle">
            <tr>{["", "N.º", "Título", "Tipo", "Origem", "Data", "Prazo", "IA", "Sugestão", "Estado", "Responsável"].map((h) => <th key={h} scope="col" className="px-3 py-3 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} onClick={() => { setSel(i); onOpen(r.id); }} className={cn("cursor-pointer border-t border-line transition-colors hover:bg-surface-2", i === sel && "bg-brand-soft/60", !r.canManage && "opacity-75")} aria-selected={i === sel}>
                <td className="px-3 py-3" onClick={(e) => { e.stopPropagation(); toggle(r.id); }}>
                  <button aria-label={`Seleccionar ${r.number}`} aria-pressed={checked.has(r.id)} className="grid size-6 place-items-center">{checked.has(r.id) ? <CheckSquare className="size-4 text-brand" /> : <Square className="size-4 text-fg-subtle" />}</button>
                </td>
                <td className="px-3 py-3 font-mono text-xs">{r.number}</td>
                <td className="max-w-72 px-3 py-3"><p className="truncate font-medium">{r.title}</p><div className="mt-0.5 flex gap-1">{r.hasRisk && <Tag tone="danger"><ShieldAlert className="size-3" /> Rever</Tag>}{r.deleteRequested && <Tag tone="warn">Pedido para apagar</Tag>}{!r.canManage && <Tag>Leitura</Tag>}</div></td>
                <td className="px-3 py-3">{L.ideaType(r.type)}</td>
                <td className="px-3 py-3">{r.originLabel === "ANONIMA" ? <Tag tone="ai">Anónima</Tag> : r.originLabel === "COLABORADOR" ? "Colaborador" : "Externa"}</td>
                <td className="px-3 py-3 text-fg-muted">{fmtDate(r.createdAt, { day: "2-digit", month: "short" })}</td>
                <td className="px-3 py-3"><DaysLeft d={r.daysLeft} /></td>
                <td className="px-3 py-3"><AiCell r={r} /></td>
                <td className="px-3 py-3">{r.routing ? <Tag tone={r.routing === "LAB" ? "lab" : r.routing === "INCUBADORA" ? "inc" : "neutral"}>{L.routing(r.routing)}</Tag> : "—"}</td>
                <td className="px-3 py-3"><StatusTag status={r.status} decision={r.decision} /></td>
                <td className="px-3 py-3 text-fg-muted">{r.assigneeName ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/** Vista em quadro com arrastar e largar entre estados (alternativa por teclado: menu «Mover para»). */
function TriageBoard({ rows, onOpen }: { rows: TriageRow[]; onOpen: (id: string) => void }) {
  const [drag, setDrag] = React.useState<string | null>(null);
  const [over, setOver] = React.useState<IdeaStatus | null>(null);
  const [optimistic, setOptimistic] = React.useState<Record<string, IdeaStatus>>({});
  const statusOf = (r: TriageRow) => optimistic[r.id] ?? r.status;
  const move = (r: TriageRow, to: IdeaStatus) => {
    if (r.status === to) return;
    if (!r.canManage) return toast.error("Esta ideia é da outra área (só leitura).");
    if (to === "DECISAO" || to === "INFO_PEDIDA") { onOpen(r.id); return toast.info(to === "DECISAO" ? "Registe a decisão e o feedback na ficha." : "Escreva a pergunta na ficha."); }
    if (!canTransition("manager", r.status, to, r.decision)) return toast.error(`Não é possível passar de «${L.status(r.status)}» a «${L.status(to)}».`);
    setOptimistic((o) => ({ ...o, [r.id]: to }));
    withUndo(`${r.number} → ${L.status(to)}`, async () => {
      try { await mutate("changeIdeaStatus", { id: r.id, to }); } finally { setOptimistic((o) => { const n = { ...o }; delete n[r.id]; return n; }); }
    });
    // Se anulado, a vista volta ao estado real.
    setTimeout(() => setOptimistic((o) => { const n = { ...o }; delete n[r.id]; return n; }), 5600);
  };
  return (
    <LayoutGroup>
      <div className="grid gap-4 overflow-x-auto pb-4 lg:grid-cols-5">
        {BOARD.map((col) => {
          const items = rows.filter((r) => statusOf(r) === col);
          return (
            <section
              key={col}
              aria-label={L.status(col)}
              onDragOver={(e) => { e.preventDefault(); setOver(col); }}
              onDragLeave={() => setOver(null)}
              onDrop={() => { const r = rows.find((x) => x.id === drag); if (r) move(r, col); setDrag(null); setOver(null); }}
              className={cn("grid min-h-80 min-w-64 content-start gap-3 rounded-[var(--radius-lg)] border-2 border-dashed p-3 transition-colors", over === col ? "border-brand bg-brand-soft/50" : "border-transparent bg-surface-2/60")}
            >
              <h3 className="flex items-center justify-between px-1 text-sm font-medium"><span>{L.status(col)}</span><span className="rounded-full bg-surface px-2 font-mono text-xs">{items.length}</span></h3>
              {items.map((r) => (
                <motion.article
                  key={r.id}
                  layout
                  layoutId={`card-${r.id}`}
                  draggable={r.canManage}
                  onDragStart={() => setDrag(r.id)}
                  onDragEnd={() => setDrag(null)}
                  transition={{ type: "spring", stiffness: 400, damping: 34 }}
                  className={cn("grid cursor-grab gap-2 rounded-[var(--radius-md)] border border-line bg-surface p-3 shadow-1 active:cursor-grabbing", drag === r.id && "opacity-50", !r.canManage && "cursor-default opacity-70")}
                >
                  <button onClick={() => onOpen(r.id)} className="grid gap-1 text-left">
                    <span className="flex items-center justify-between font-mono text-[11px] text-fg-subtle">{r.number}<DaysLeft d={r.daysLeft} /></span>
                    <span className="line-clamp-2 text-sm font-medium">{r.title}</span>
                  </button>
                  <div className="flex items-center justify-between gap-2">
                    <AiCell r={r} />
                    {r.canManage && (
                      <Select aria-label={`Mover ${r.number} para`} value="" onChange={(e) => e.target.value && move(r, e.target.value as IdeaStatus)} className="h-8 w-auto py-0 text-xs">
                        <option value="">Mover…</option>
                        {BOARD.filter((s) => s !== statusOf(r)).map((s) => <option key={s} value={s}>{L.status(s)}</option>)}
                      </Select>
                    )}
                  </div>
                </motion.article>
              ))}
            </section>
          );
        })}
      </div>
    </LayoutGroup>
  );
}

// ------------------------------------------------------------- Ecrã dividido: submissão | análise da IA

type TriageDetail = ResultOf<"triageIdea">;

function SplitView({ id, onClose }: { id: string; onClose: () => void }) {
  const { data: d, loading, error } = useQuery("triageIdea", { id });
  const closeRef = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => closeRef.current?.focus(), []);
  return (
    <motion.div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div role="dialog" aria-modal="true" aria-label="Ficha da ideia" className="flex h-full w-full max-w-[1280px] flex-col bg-bg shadow-3" initial={{ x: "8%", opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: "8%", opacity: 0 }} transition={{ type: "spring", stiffness: 320, damping: 34 }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-line bg-surface px-5 py-3">
          <button ref={closeRef} onClick={onClose} className="grid size-10 place-items-center rounded-full hover:bg-surface-2" aria-label={t("actions.close")}><X className="size-5" /></button>
          {d && <><span className="font-mono text-sm text-fg-subtle">{d.idea.number}</span><StatusTag status={d.idea.status} decision={d.idea.decision} /><Tag>{L.origin(d.idea.origin)}</Tag><Tag tone={d.idea.area === "LAB" ? "lab" : "inc"}>{L.area(d.idea.area)}</Tag>{!d.canManage && <Tag>Só leitura</Tag>}</>}
        </div>
        {error ? <div className="p-8"><ErrorState message={error.message} /></div> : loading || !d ? <div className="p-8"><ListSkeleton rows={5} /></div> : (
          <div className="grid flex-1 overflow-hidden lg:grid-cols-2">
            <div className="overflow-y-auto border-line p-6 lg:border-r"><Submission d={d} /><ManagerActions d={d} /></div>
            <div className="overflow-y-auto bg-surface p-6"><AiPanel d={d} /></div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

const ANSWER_LABEL: Record<string, string> = {
  problem: "Problema", solution: "Solução proposta", proposal: "Proposta de solução", differentiation: "O que a torna diferente", businessModel: "Modelo de negócio", team: "Equipa", stage: "Fase actual", customers: "Clientes actuais",
  sector: "Sector", audience: "A quem serve", lookingFor: "O que procura", profileType: "Tipo de perfil", organization: "Organização", category: "Categoria", affectedArea: "Área afectada", frequency: "Frequência", affected: "Quem é afectado",
  impact: "Impacto", impactEstimate: "Estimativa", urgency: "Urgência", gravity: "Gravidade", wantsToParticipate: "Quer participar", links: "Ligações", challengeId: "Desafio",
};

function Submission({ d }: { d: TriageDetail }) {
  const a = d.idea.answers as Record<string, unknown>;
  return (
    <section className="grid gap-5" aria-labelledby="sub-h">
      <div className="grid gap-2">
        <p className="font-mono text-xs uppercase tracking-widest text-fg-subtle">Submissão</p>
        <h2 id="sub-h" className="font-display text-2xl font-bold">{d.idea.title}</h2>
        <p className="text-fg-muted">{d.idea.summary}</p>
        <p className="text-xs text-fg-subtle">Recebida a {fmtDateTime(d.idea.createdAt)} · prazo de retorno {fmtDate(d.deadline)}</p>
      </div>
      <Card className="grid gap-1 p-4 text-sm">
        {d.author ? (
          <><p className="font-medium">{d.author.name}</p><p className="text-fg-muted">{d.author.email}{d.author.department ? ` · ${d.author.department}` : ""}{d.author.external?.organization ? ` · ${d.author.external.organization}` : ""}</p></>
        ) : <p className="flex items-center gap-2 text-fg-muted"><ShieldAlert className="size-4" /> Autor anónimo. A identidade não é visível a ninguém.</p>}
      </Card>
      <dl className="grid gap-4">
        {Object.entries(a).filter(([k, v]) => ANSWER_LABEL[k] && v !== "" && v != null && !(Array.isArray(v) && !v.length) && k !== "attachments").map(([k, v]) => (
          <div key={k} className="grid gap-1"><dt className="text-xs font-medium uppercase tracking-wider text-fg-subtle">{ANSWER_LABEL[k]}</dt><dd className="whitespace-pre-line text-sm">{formatAnswer(k, v)}</dd></div>
        ))}
        {Array.isArray(a.attachments) && (a.attachments as { name: string }[]).length > 0 && <div><dt className="text-xs font-medium uppercase tracking-wider text-fg-subtle">Anexos</dt><dd className="text-sm">{(a.attachments as { name: string }[]).map((f) => f.name).join(", ")}</dd></div>}
      </dl>
      <div className="grid gap-2">
        <p className="text-xs font-medium uppercase tracking-wider text-fg-subtle">Histórico</p>
        <ol className="grid gap-1 text-sm">{d.history.map((h) => <li key={h.id} className="text-fg-muted">{fmtDateTime(h.at)} · {h.from ? `${L.status(h.from as IdeaStatus)} → ` : ""}{L.status(h.to as IdeaStatus)}{h.note ? ` · ${h.note}` : ""}</li>)}</ol>
      </div>
      {d.messages.length > 0 && (
        <div className="grid gap-2">
          <p className="text-xs font-medium uppercase tracking-wider text-fg-subtle">Mensagens</p>
          {d.messages.map((m) => <div key={m.id} className={cn("rounded-[var(--radius-md)] p-3 text-sm", m.fromTeam ? "bg-surface-2" : "bg-brand-soft")}><p className="text-xs text-fg-subtle">{m.fromTeam ? "Equipa" : "Criador"} · {fmtDateTime(m.at)}{m.kind === "PEDIDO_INFO" && " · pedido de informação"}</p><p className="whitespace-pre-line">{m.text}</p></div>)}
        </div>
      )}
    </section>
  );
}

function AiPanel({ d }: { d: TriageDetail }) {
  const ai = d.analysis;
  const [busy, setBusy] = React.useState(false);
  return (
    <section className="grid gap-6" aria-labelledby="ai-h">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-ai-ink"><Bot className="size-4" /> {t("ai.title")}</p>
          <h2 id="ai-h" className="font-display text-2xl font-bold">Recomendação</h2>
          <p className="text-sm text-fg-subtle">{t("ai.recommends")}</p>
        </div>
        {d.canManage && <Button size="sm" variant="secondary" loading={busy} onClick={async () => { setBusy(true); try { await mutate("reanalyzeIdea", { id: d.idea.id }); toast.success("Nova análise pedida. Fica pronta em segundos."); } catch (e) { toast.error((e as ApiError).message); } finally { setBusy(false); } }}><RefreshCw /> {t("ai.reanalyze")}</Button>}
      </div>
      {!ai || ai.status === "PENDENTE" ? (
        <Card className="grid place-items-center gap-3 bg-ai-soft/50 p-10 text-center"><RefreshCw className="size-8 animate-spin text-ai" /><p className="font-medium">{t("ai.pending")}</p><p className="text-sm text-fg-muted">A ideia já está na fila. A análise corre em segundo plano.</p></Card>
      ) : ai.status === "FALHOU" ? (
        <Card className="grid gap-2 border-danger/40 bg-danger-soft p-6"><p className="flex items-center gap-2 font-medium text-danger"><AlertTriangle className="size-5" /> {t("ai.failed")}</p><p className="text-sm text-fg-muted">{ai.error}</p></Card>
      ) : (
        <>
          <div className="grid items-center gap-6 sm:grid-cols-[auto_1fr]">
            <ScoreGauge value={ai.total} />
            <div className="grid gap-2">
              <p className="text-sm text-fg-subtle">{t("ai.routing")}</p>
              <Tag tone={ai.routing === "LAB" ? "lab" : ai.routing === "INCUBADORA" ? "inc" : "neutral"} className="w-fit text-sm">{L.routing(ai.routing!)}</Tag>
              <p className="text-sm">{ai.routingReason}</p>
              {ai.classification && <p className="text-xs text-fg-subtle">{ai.classification.theme} · {ai.classification.sector} · {ai.classification.category}{ai.classification.workLine ? ` · ${ai.classification.workLine}` : ""}</p>}
              <p className="text-xs text-fg-subtle">Critérios v{ai.criteriaVersion} · {ai.provider} · {fmtDateTime(ai.createdAt)}</p>
            </div>
          </div>
          <Card className="grid gap-2 bg-bg p-5">
            <p className="flex items-center gap-2 text-sm font-medium"><MessageSquareQuote className="size-4 text-ai-ink" /> {t("ai.summary")}</p>
            <div className="text-sm"><Typewriter text={ai.summary} /></div>
          </Card>
          <div className="grid gap-4">{ai.scores.map((s, i) => <CriterionBar key={s.key} name={s.name} score={s.score} weight={s.weight} justification={s.justification} delay={0.1 + i * 0.08} />)}</div>
          {ai.risks.length > 0 && (
            <Card className="grid gap-2 border-danger/30 bg-danger-soft p-4">
              <p className="flex items-center gap-2 text-sm font-medium text-danger"><ShieldAlert className="size-4" /> {t("ai.risks")} · marcada para revisão</p>
              {ai.risks.map((r, i) => <p key={i} className="text-sm">{r.detail}</p>)}
            </Card>
          )}
          {ai.similar.length > 0 && (
            <div className="grid gap-2">
              <p className="text-sm font-medium">{t("ai.similar")}</p>
              {ai.similar.map((s) => (
                <div key={s.ideaId} className="flex items-center gap-3 rounded-[var(--radius-md)] border border-line p-3 text-sm">
                  <span className="font-mono text-xs">{s.number}</span><span className="flex-1 truncate">{s.title}</span><span className="font-mono text-ai-ink">{s.similarity}%</span>
                  {d.canManage && (d.idea.similarConfirmed ?? []).includes(s.ideaId) ? <Tag tone="ok">Confirmada</Tag> : d.canManage && <Button size="sm" variant="ghost" onClick={() => mutate("confirmSimilar", { id: d.idea.id, similarId: s.ideaId }).then(() => toast.success("Semelhança confirmada."))}>Confirmar</Button>}
                </div>
              ))}
            </div>
          )}
          {ai.completeness.questions.length > 0 && (
            <div className="grid gap-2">
              <p className="text-sm font-medium">{t("ai.completeness")}: {ai.completeness.weakFields.join(", ")}</p>
              <ul className="grid gap-1 text-sm text-fg-muted">{ai.completeness.questions.map((q) => <li key={q}>• {q}</li>)}</ul>
            </div>
          )}
          {d.analysisHistory.length > 0 && <p className="text-xs text-fg-subtle">Análises anteriores: {d.analysisHistory.map((h) => `${h.total} (v${h.version}, ${fmtDate(h.at)})`).join(" · ")}</p>}
        </>
      )}
    </section>
  );
}

function ManagerActions({ d }: { d: TriageDetail }) {
  const router = useRouter();
  const [dlg, setDlg] = React.useState<null | "info" | "decide" | "route" | "dup" | "assess">(null);
  if (!d.canManage) return <Card className="mt-8 p-4 text-sm text-fg-muted">Só leitura: esta ideia é gerida pelo gestor da outra área.</Card>;
  const ai = d.analysis?.status === "CONCLUIDA" ? d.analysis : null;
  const run = async (fn: () => Promise<unknown>, ok: string) => { try { await fn(); toast.success(ok); setDlg(null); } catch (e) { toast.error((e as ApiError).message); } };
  return (
    <section className="mt-8 grid gap-4 border-t border-line pt-6" aria-labelledby="act-h">
      <h3 id="act-h" className="font-display text-lg font-bold">Acções do gestor</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="assignee" label="Responsável">
          <Select value={d.idea.assigneeId ?? ""} onChange={(e) => run(() => mutate("assignIdea", { id: d.idea.id, assigneeId: e.target.value || null }), "Responsável atribuído.")}>
            <option value="">Sem responsável</option>{d.managers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </Select>
        </Field>
        <Field id="status" label="Mudar estado">
          <Select value="" onChange={(e) => { const to = e.target.value as IdeaStatus; if (!to) return; if (to === "INFO_PEDIDA") return setDlg("info"); if (to === "DECISAO") return setDlg("decide"); if (to === "DUPLICADA") return setDlg("dup"); withUndo(`${d.idea.number} → ${L.status(to)}`, () => mutate("changeIdeaStatus", { id: d.idea.id, to })); }}>
            <option value="">{L.status(d.idea.status)}…</option>{d.allowed.map((s) => <option key={s} value={s}>{L.status(s)}</option>)}
          </Select>
        </Field>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={() => setDlg("info")}><Mail /> Pedir informação</Button>
        <Button size="sm" variant="secondary" onClick={() => setDlg("route")}><ArrowRightLeft /> Encaminhar</Button>
        <Button size="sm" variant="secondary" onClick={() => setDlg("dup")}><Copy /> Duplicada</Button>
        <Button size="sm" variant="secondary" onClick={() => setDlg("assess")}>Pontuação final</Button>
        <Button size="sm" onClick={() => setDlg("decide")}><Gavel /> Decidir</Button>
        {d.idea.decision === "SELECCIONADA" && !d.idea.projectId && <Button size="sm" variant={d.idea.area === "LAB" ? "lab" : "inc"} onClick={() => router.push(`/gestao/projectos?daIdeia=${d.idea.id}`)}><FolderPlus /> Converter em {d.idea.area === "LAB" ? "projecto" : "venture"}</Button>}
        {d.idea.deleteRequestedAt && <Button size="sm" variant="danger" onClick={() => run(() => mutate("confirmDeleteIdea", { id: d.idea.id }), "Ideia anonimizada a pedido do criador.")}>Confirmar pedido para apagar</Button>}
      </div>
      {d.assessments.length > 0 && <p className="text-sm text-fg-muted">Pontuação final do gestor: <strong>{d.assessments.at(-1)!.finalScore}</strong>{ai ? ` (IA: ${ai.total}, diferença ${d.assessments.at(-1)!.finalScore - ai.total})` : ""}</p>}

      <Dialog open={dlg === "info"} onOpenChange={(o) => !o && setDlg(null)} title="Pedir informação ao criador" description="A ideia passa a «Informação pedida» e volta a «Em análise» quando o criador responde.">
        <InfoForm suggestions={ai?.completeness.questions ?? []} onSubmit={(q) => run(() => mutate("requestInfo", { id: d.idea.id, question: q }), "Pedido enviado.")} />
      </Dialog>
      <Dialog wide open={dlg === "decide"} onOpenChange={(o) => !o && setDlg(null)} title="Registar a decisão" description="O criador vê o resultado, o motivo e o próximo passo. O feedback é validado por si antes de seguir.">
        <DecideForm d={d} onSubmit={(v) => run(() => mutate("decideIdea", { id: d.idea.id, ...v }), "Decisão registada e criador notificado.")} />
      </Dialog>
      <Dialog open={dlg === "route"} onOpenChange={(o) => !o && setDlg(null)} title="Encaminhar">
        <RouteForm current={d.idea.area} onSubmit={(to, reason) => run(() => mutate("routeIdea", { id: d.idea.id, to, reason }), "Encaminhada.")} />
      </Dialog>
      <Dialog open={dlg === "dup"} onOpenChange={(o) => !o && setDlg(null)} title="Marcar como duplicada" description="O criador é avisado e acompanha a ideia principal.">
        <DupForm options={ai?.similar ?? []} onSubmit={(ofId) => run(() => mutate("markDuplicate", { id: d.idea.id, ofId }), "Marcada como duplicada.")} />
      </Dialog>
      <Dialog open={dlg === "assess"} onOpenChange={(o) => !o && setDlg(null)} title="Pontuação final do gestor" description="Pode ser diferente da IA. A diferença fica registada.">
        <AssessForm ai={ai} onSubmit={(v) => run(() => mutate("saveAssessment", { id: d.idea.id, ...v }), "Pontuação guardada.")} />
      </Dialog>
    </section>
  );
}

function InfoForm({ suggestions, onSubmit }: { suggestions: string[]; onSubmit: (q: string) => void }) {
  const [q, setQ] = React.useState(suggestions.length ? `Para avançarmos, ajudava-nos saber:\n${suggestions.map((s) => `• ${s}`).join("\n")}` : "");
  return <div className="grid gap-4">{suggestions.length > 0 && <p className="flex items-center gap-1.5 text-xs text-ai-ink"><Bot className="size-3.5" /> Perguntas sugeridas pela IA (edite à vontade)</p>}<Field id="iq" label="Pergunta" required><Textarea rows={6} value={q} onChange={(e) => setQ(e.target.value)} /></Field><Button disabled={!q.trim()} className="w-fit" onClick={() => onSubmit(q)}>{t("actions.send")}</Button></div>;
}

function DecideForm({ d, onSubmit }: { d: TriageDetail; onSubmit: (v: { decision: Decision; reason: string; nextStep: string; feedback: string }) => void }) {
  const [decision, setDecision] = React.useState<Decision>("SELECCIONADA");
  const [reason, setReason] = React.useState("");
  const [next, setNext] = React.useState("");
  const [feedback, setFeedback] = React.useState(d.analysis?.feedbackDraft ?? "");
  const tplKey = { SELECCIONADA: "seleccionada", LISTA_ESPERA: "lista_espera", ENCAMINHADA: "encaminhada", NAO_SELECCIONADA: "nao_seleccionada" }[decision];
  const tpl = d.templates.find((x) => x.key === tplKey);
  const fill = (s: string) => s.replaceAll("{titulo}", d.idea.title).replaceAll("{motivo}", reason || "…").replaceAll("{proximo}", next || "…").replaceAll("{destino}", "a área indicada");
  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {(["SELECCIONADA", "LISTA_ESPERA", "ENCAMINHADA", "NAO_SELECCIONADA"] as Decision[]).map((x) => (
          <button key={x} onClick={() => setDecision(x)} aria-pressed={decision === x} className={cn("min-h-11 rounded-[var(--radius-md)] border px-3 text-sm font-medium transition-colors", decision === x ? "border-brand bg-brand-soft" : "border-line hover:border-line-strong")}>{L.decision(x)}</button>
        ))}
      </div>
      <Field id="dr" label="Motivo" required><Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
      <Field id="dn" label="Próximo passo" required><Input value={next} onChange={(e) => setNext(e.target.value)} /></Field>
      <div className="flex flex-wrap gap-2">
        {d.analysis?.feedbackDraft && <Button size="sm" variant="ghost" onClick={() => setFeedback(d.analysis!.feedbackDraft)}><Bot /> Usar rascunho da IA</Button>}
        {tpl && <Button size="sm" variant="ghost" onClick={() => setFeedback(fill(tpl.body))}>Usar modelo «{tpl.title}»</Button>}
      </div>
      <Field id="df" label="Feedback ao criador" hint="Revisto e validado por si. A IA nunca responde sozinha."><Textarea rows={7} value={feedback} onChange={(e) => setFeedback(e.target.value)} /></Field>
      <Button disabled={!reason.trim() || !next.trim()} className="w-fit" onClick={() => onSubmit({ decision, reason, nextStep: next, feedback })}><Gavel /> Validar e registar</Button>
    </div>
  );
}

function RouteForm({ current, onSubmit }: { current: string; onSubmit: (to: "LAB" | "INCUBADORA" | "DIGITAL_OFFICE", reason: string) => void }) {
  const [to, setTo] = React.useState<"LAB" | "INCUBADORA" | "DIGITAL_OFFICE">(current === "LAB" ? "INCUBADORA" : "LAB");
  const [reason, setReason] = React.useState("");
  return <div className="grid gap-4"><Field id="rt" label="Para"><Select value={to} onChange={(e) => setTo(e.target.value as typeof to)}>{current !== "LAB" && <option value="LAB">Laboratório</option>}{current !== "INCUBADORA" && <option value="INCUBADORA">Incubadora</option>}<option value="DIGITAL_OFFICE">Digital Office (decisão «Encaminhada»)</option></Select></Field><Field id="rr" label="Motivo" required><Textarea value={reason} onChange={(e) => setReason(e.target.value)} /></Field><Button disabled={!reason.trim()} className="w-fit" onClick={() => onSubmit(to, reason)}>Encaminhar</Button></div>;
}

function DupForm({ options, onSubmit }: { options: { ideaId: string; number: string; title: string; similarity: number }[]; onSubmit: (id: string) => void }) {
  const [id, setId] = React.useState(options[0]?.ideaId ?? "");
  const [manual, setManual] = React.useState("");
  return <div className="grid gap-4">{options.length > 0 && <Field id="dup" label="Ideia principal (sugeridas pela IA)"><Select value={id} onChange={(e) => setId(e.target.value)}>{options.map((o) => <option key={o.ideaId} value={o.ideaId}>{o.number} · {o.title} ({o.similarity}%)</option>)}</Select></Field>}<Field id="dupm" label="Ou indique o identificador interno"><Input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="idea_…" /></Field><Button className="w-fit" disabled={!id && !manual} onClick={() => onSubmit(manual || id)}>Marcar como duplicada</Button></div>;
}

function AssessForm({ ai, onSubmit }: { ai: TriageDetail["analysis"]; onSubmit: (v: { scores: Record<string, number>; finalScore: number; notes?: string }) => void }) {
  const [scores, setScores] = React.useState<Record<string, number>>(Object.fromEntries((ai?.scores ?? []).map((s) => [s.key, s.score])));
  const total = ai ? Math.round(ai.scores.reduce((n, s) => n + (((scores[s.key] ?? s.score) - 1) / 4) * s.weight, 0)) : 50;
  const [final, setFinal] = React.useState<number | null>(null);
  const [notes, setNotes] = React.useState("");
  const value = final ?? total;
  return (
    <div className="grid gap-4">
      {(ai?.scores ?? []).map((s) => (
        <div key={s.key} className="grid grid-cols-[1fr_auto] items-center gap-3 text-sm">
          <label htmlFor={`as-${s.key}`}>{s.name} <span className="text-fg-subtle">({s.weight}% · IA {s.score})</span></label>
          <Select id={`as-${s.key}`} value={scores[s.key]} onChange={(e) => setScores({ ...scores, [s.key]: Number(e.target.value) })} className="h-9 w-20">{[1, 2, 3, 4, 5].map((n) => <option key={n}>{n}</option>)}</Select>
        </div>
      ))}
      <Field id="as-final" label={`Pontuação final (0–100) · calculada ${total}${ai ? ` · IA ${ai.total}` : ""}`} required><Input type="number" min={0} max={100} value={value} onChange={(e) => setFinal(Number(e.target.value))} /></Field>
      <Field id="as-notes" label="Notas"><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
      <Button className="w-fit" onClick={() => onSubmit({ scores, finalScore: value, notes })}>{t("actions.save")}</Button>
    </div>
  );
}

