"use client";
import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LayoutGroup, motion } from "motion/react";
import { toast } from "sonner";
import { ArrowRightLeft, Columns3, Eye, Flag, List, LogOut, Plus, Star, Trash2, X } from "lucide-react";
import { F5Schema, VISIBILITY_CHECKLIST, type F5Input } from "@/lib/validation/forms";
import type { Project, Visibility } from "@/lib/domain/types";
import { t, fmtDate } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { L } from "@/lib/domain/labels";
import { INC_STAGES, LAB_STAGES } from "@/lib/domain/workflow";
import { useQuery, useSession } from "@/lib/client/hooks";
import { ApiError, mutate } from "@/lib/client/runtime";
import { Button, Card, Checkbox, Dialog, EmptyState, Field, Input, ListSkeleton, Select, Switch, Tabs, TabsList, TabsTrigger, Tag, Textarea } from "@/components/ui";
import { AreaTag, PageHeader, RequirePage, VisibilityTag } from "@/components/domain";
import { AppLink } from "@/components/layout/app-link";

export function ManageProjectsView() {
  return <RequirePage page="P32" title="a gestão de projectos"><ManageProjects /></RequirePage>;
}

type Row = Awaited<ReturnType<typeof import("@/lib/client/runtime").api<"listManagedProjects">>>[number];

function ManageProjects() {
  const params = useSearchParams();
  const router = useRouter();
  const { user } = useSession();
  const myArea = user?.role === "GESTOR_LAB" ? "LAB" : "INCUBADORA";
  const [area, setArea] = React.useState<"LAB" | "INCUBADORA">(myArea);
  const [view, setView] = React.useState<"board" | "list">("board");
  const { data, loading, reload } = useQuery("listManagedProjects");
  const [createOpen, setCreateOpen] = React.useState(false);
  const [fromIdea, setFromIdea] = React.useState<string | null>(null);
  const selected = params?.get("projecto");
  React.useEffect(() => setArea(myArea), [myArea]);
  React.useEffect(() => {
    const id = params?.get("daIdeia");
    if (id) { setFromIdea(id); setCreateOpen(true); }
  }, [params]);
  const rows = (data ?? []).filter((p) => p.area === area);
  const stages = (area === "LAB" ? LAB_STAGES : INC_STAGES) as string[];
  const sel = (data ?? []).find((p) => p.id === selected);
  const openP = (id: string | null) => router.replace(id ? `/gestao/projectos?projecto=${id}` : "/gestao/projectos", { scroll: false });
  return (
    <>
      <PageHeader crumbs={[{ label: t("nav.mgmtProjects") }]} eyebrow="P32 · Gestão" title="Projectos e ventures" lead="Cada gestor gere a sua área e vê a outra em leitura. Todo o projecto nasce Interno."
        actions={<Button onClick={() => { setFromIdea(null); setCreateOpen(true); }}><Plus /> Novo {myArea === "LAB" ? "projecto" : "venture"}</Button>} />
      <div className="container-x grid gap-5 py-8">
        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={area} onValueChange={(v) => setArea(v as typeof area)}><TabsList><TabsTrigger value="LAB">Laboratório{myArea !== "LAB" && " (leitura)"}</TabsTrigger><TabsTrigger value="INCUBADORA">Incubadora{myArea !== "INCUBADORA" && " (leitura)"}</TabsTrigger></TabsList></Tabs>
          <div className="ml-auto flex gap-1 rounded-[var(--radius-md)] bg-surface-2 p-1" role="radiogroup" aria-label="Vista">
            <button role="radio" aria-checked={view === "board"} onClick={() => setView("board")} className={cn("flex min-h-9 items-center gap-1.5 rounded-[8px] px-3 text-sm", view === "board" && "bg-surface shadow-1")}><Columns3 className="size-4" /> Quadro</button>
            <button role="radio" aria-checked={view === "list"} onClick={() => setView("list")} className={cn("flex min-h-9 items-center gap-1.5 rounded-[8px] px-3 text-sm", view === "list" && "bg-surface shadow-1")}><List className="size-4" /> Lista</button>
          </div>
        </div>
        {loading && !data ? <ListSkeleton rows={5} /> : rows.length === 0 ? <EmptyState title="Sem projectos nesta área." /> : view === "board" ? (
          <LayoutGroup>
            <div className="grid gap-4 overflow-x-auto pb-3" style={{ gridTemplateColumns: `repeat(${stages.length + 1}, minmax(240px, 1fr))` }}>
              {[...stages, "SAIDA"].map((s) => {
                const items = rows.filter((p) => (s === "SAIDA" ? !!p.exit : !p.exit && p.stage === s));
                return (
                  <section key={s} aria-label={s === "SAIDA" ? "Com saída" : L.stage(s)} className="grid content-start gap-3 rounded-[var(--radius-lg)] bg-surface-2/60 p-3">
                    <h3 className="flex justify-between px-1 text-sm font-medium"><span>{s === "SAIDA" ? "Com saída" : L.stage(s)}</span><span className="rounded-full bg-surface px-2 font-mono text-xs">{items.length}</span></h3>
                    {items.map((p) => <ProjectTile key={p.id} p={p} onOpen={() => openP(p.id)} />)}
                  </section>
                );
              })}
            </div>
          </LayoutGroup>
        ) : (
          <Card className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-bg text-left text-xs uppercase tracking-wider text-fg-subtle"><tr>{["Nome", "Etapa", "Linha/Trilha", "Visibilidade", "Destaque", "Na etapa", "Patrocinador", ""].map((h) => <th key={h} className="px-3 py-3 font-medium">{h}</th>)}</tr></thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} className="border-t border-line hover:bg-surface-2">
                    <td className="px-3 py-3 font-medium">{p.name}</td>
                    <td className="px-3 py-3">{p.exit ? <Tag tone="ok">{L.exit(p.exit.kind)}</Tag> : L.stage(p.stage)}</td>
                    <td className="px-3 py-3">{p.workLine ?? (p.track === "INTERNA" ? "Interna" : p.track === "EXTERNA" ? "Externa" : "—")}</td>
                    <td className="px-3 py-3"><VisibilityTag v={p.visibility} /></td>
                    <td className="px-3 py-3">{p.featured ? <Star className="size-4 fill-warn text-warn" aria-label="Sim" /> : "—"}</td>
                    <td className={cn("px-3 py-3 font-mono", p.daysInStage > 30 && !p.exit && "font-bold text-warn")}>{p.daysInStage} d</td>
                    <td className="px-3 py-3">{p.sponsor}</td>
                    <td className="px-3 py-3"><Button size="sm" variant="ghost" onClick={() => openP(p.id)}>{p.canManage ? "Gerir" : "Ver"}</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
      <Dialog wide open={createOpen} onOpenChange={setCreateOpen} title={fromIdea ? "Converter ideia em projecto" : "Novo projecto ou venture (F5)"} description="Nasce Interno. Para ser Público, complete a checklist.">
        {createOpen && <ProjectForm ideaId={fromIdea} defaultArea={myArea} onDone={(slug) => { setCreateOpen(false); reload(); toast.success("Projecto criado."); router.replace("/gestao/projectos"); void slug; }} />}
      </Dialog>
      {sel && <ProjectDrawer p={sel} onClose={() => openP(null)} />}
    </>
  );
}

function ProjectTile({ p, onOpen }: { p: Row; onOpen: () => void }) {
  return (
    <motion.button layout layoutId={`p-${p.id}`} onClick={onOpen} className={cn("grid gap-2 rounded-[var(--radius-md)] border border-line bg-surface p-3 text-left shadow-1 transition-colors hover:border-line-strong", !p.canManage && "opacity-75")}>
      <div className="h-1.5 rounded-full" style={{ background: p.cover }} aria-hidden />
      <span className="text-sm font-medium">{p.name}</span>
      <span className="flex flex-wrap gap-1"><VisibilityTag v={p.visibility} />{p.featured && <Tag tone="warn"><Star className="size-3" /> Destaque</Tag>}{p.pendingTransfer && <Tag tone="inc">Passagem por aceitar</Tag>}</span>
      <span className={cn("text-xs", p.daysInStage > 30 && !p.exit ? "font-medium text-warn" : "text-fg-subtle")}>{p.daysInStage} dias nesta etapa</span>
    </motion.button>
  );
}

// ------------------------------------------------------------- F5

function ProjectForm({ ideaId, defaultArea, onDone }: { ideaId: string | null; defaultArea: "LAB" | "INCUBADORA"; onDone: (slug: string) => void }) {
  const { data: users = [] } = useQuery("listUsers");
  const { data: partners = [] } = useQuery("listPartners");
  const { data: draft } = useQuery("projectDraftFromIdea", { ideaId: ideaId ?? "" }, { enabled: !!ideaId });
  const [v, setV] = React.useState<Partial<F5Input>>({ area: defaultArea, visibility: "INTERNO", featured: false, securityKitPhase: 0, partnerIds: [], links: {}, team: [{ name: "", role: "RESPONSAVEL" }], stage: defaultArea === "LAB" ? "OPORTUNIDADE" : "INCUBACAO", track: defaultArea === "INCUBADORA" ? "EXTERNA" : null });
  const [checklist, setChecklist] = React.useState<Record<string, boolean>>({});
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => { if (draft) setV((x) => ({ ...x, ...(draft as Partial<F5Input>) })); }, [draft]);
  const set = <K extends keyof F5Input>(k: K, val: F5Input[K]) => setV((x) => ({ ...x, [k]: val }));
  const stages = (v.area === "LAB" ? LAB_STAGES : INC_STAGES) as string[];
  const submit = async () => {
    const r = F5Schema.safeParse(v);
    if (!r.success) {
      setErrors(Object.fromEntries(r.error.issues.map((i) => [String(i.path[0]), i.message])));
      return toast.error("Reveja os campos assinalados.");
    }
    setErrors({});
    setBusy(true);
    try { const res = await mutate("createProject", { ...r.data, checklist }); onDone(res.slug); } catch (e) { toast.error((e as ApiError).message); } finally { setBusy(false); }
  };
  const internalUsers = users.filter((u) => u.authProvider === "MICROSOFT");
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="pf-name" label="Nome" required error={errors.name}><Input value={v.name ?? ""} onChange={(e) => set("name", e.target.value)} /></Field>
        <Field id="pf-area" label="Área" required><Select value={v.area} onChange={(e) => { const a = e.target.value as "LAB" | "INCUBADORA"; setV((x) => ({ ...x, area: a, stage: a === "LAB" ? "OPORTUNIDADE" : "INCUBACAO", track: a === "INCUBADORA" ? "EXTERNA" : null, workLine: a === "LAB" ? x.workLine ?? "L1" : null })); }}><option value="LAB">Laboratório</option><option value="INCUBADORA">Incubadora</option></Select></Field>
        {v.area === "LAB" ? (
          <Field id="pf-line" label="Linha de trabalho" required error={errors.workLine}><Select value={v.workLine ?? ""} onChange={(e) => set("workLine", (e.target.value || null) as F5Input["workLine"])}><option value="">Escolha…</option>{["L1", "L2", "L3", "L4"].map((l) => <option key={l} value={l}>{L.line(l)}</option>)}</Select></Field>
        ) : (
          <Field id="pf-track" label="Trilha" required error={errors.track}><Select value={v.track ?? ""} onChange={(e) => set("track", e.target.value as F5Input["track"])}><option value="INTERNA">Interna</option><option value="EXTERNA">Externa</option></Select></Field>
        )}
        <Field id="pf-stage" label="Etapa actual" required><Select value={v.stage} onChange={(e) => set("stage", e.target.value)}>{stages.map((s) => <option key={s} value={s}>{L.stage(s)}</option>)}</Select></Field>
      </div>
      <Field id="pf-short" label="Descrição curta (pública)" hint="Até 300 caracteres." required error={errors.shortDescription}><Textarea rows={2} maxLength={300} value={v.shortDescription ?? ""} onChange={(e) => set("shortDescription", e.target.value)} /></Field>
      <Field id="pf-prob" label="Problema" required error={errors.problem}><Textarea rows={3} value={v.problem ?? ""} onChange={(e) => set("problem", e.target.value)} /></Field>
      {v.area === "LAB" && <Field id="pf-hyp" label="Hipótese" required error={errors.hypothesis}><Textarea rows={2} value={v.hypothesis ?? ""} onChange={(e) => set("hypothesis", e.target.value)} /></Field>}
      {v.stage === "EXPERIMENTACAO" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="pf-main" label="Métrica principal" hint="Com limiar e prazo." required error={errors.mainMetric}><Input value={v.mainMetric ?? ""} onChange={(e) => set("mainMetric", e.target.value)} /></Field>
          <Field id="pf-kill" label="Métrica de abandono" required error={errors.killMetric}><Input value={v.killMetric ?? ""} onChange={(e) => set("killMetric", e.target.value)} /></Field>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="pf-sponsor" label="Patrocinador" required error={errors.sponsorId}><Select value={v.sponsorId ?? ""} onChange={(e) => set("sponsorId", e.target.value)}><option value="">Escolha…</option>{internalUsers.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</Select></Field>
        <Field id="pf-kit" label="Fase do Kit de segurança" required><Select value={v.securityKitPhase} onChange={(e) => set("securityKitPhase", Number(e.target.value))}>{["0 Conceito", "1 Experimento", "2 Piloto ou MVP", "3 Produção"].map((x, i) => <option key={x} value={i}>{x}</option>)}</Select></Field>
      </div>
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-medium">Equipa <span className="text-danger">*</span></legend>
        {(v.team ?? []).map((m, i) => (
          <div key={i} className="flex gap-2">
            <label className="sr-only" htmlFor={`tm-${i}`}>Pessoa</label>
            <Input id={`tm-${i}`} list="internal-users" value={m.name} onChange={(e) => { const team = [...(v.team ?? [])]; team[i] = { ...m, name: e.target.value, userId: internalUsers.find((u) => u.name === e.target.value)?.id ?? null }; set("team", team); }} placeholder="Nome" />
            <Select aria-label="Papel" value={m.role} onChange={(e) => { const team = [...(v.team ?? [])]; team[i] = { ...m, role: e.target.value as typeof m.role }; set("team", team); }} className="w-48"><option value="RESPONSAVEL">Responsável</option><option value="MEMBRO">Membro</option><option value="ROTATIVO">Membro rotativo</option><option value="CHAMPION">Champion</option></Select>
            <Button type="button" variant="ghost" size="icon" aria-label="Retirar" onClick={() => set("team", (v.team ?? []).filter((_, j) => j !== i))}><Trash2 /></Button>
          </div>
        ))}
        <datalist id="internal-users">{internalUsers.map((u) => <option key={u.id} value={u.name} />)}</datalist>
        <Button type="button" variant="ghost" size="sm" className="w-fit" onClick={() => set("team", [...(v.team ?? []), { name: "", role: "MEMBRO" }])}><Plus /> Pessoa</Button>
        {errors.team && <p role="alert" className="text-sm text-danger">{errors.team}</p>}
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-3">
        {(["jira", "confluence", "strateegia"] as const).map((k) => <Field key={k} id={`pf-${k}`} label={k === "jira" ? "Jira" : k === "confluence" ? "Confluence" : "strateegia"}><Input type="url" value={v.links?.[k] ?? ""} onChange={(e) => set("links", { ...v.links, [k]: e.target.value })} placeholder="https://" /></Field>)}
      </div>
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-medium">Parceiros</legend>
        <div className="flex flex-wrap gap-2">{partners.map((p) => {
          const on = v.partnerIds?.includes(p.id);
          return <button type="button" key={p.id} aria-pressed={on} onClick={() => set("partnerIds", on ? v.partnerIds!.filter((x) => x !== p.id) : [...(v.partnerIds ?? []), p.id])} className={cn("rounded-full border px-3 py-1 text-sm", on ? "border-brand bg-brand-soft" : "border-line")}>{p.name}{!p.disclosureAuthorized && " (sem divulgação)"}</button>;
        })}</div>
      </fieldset>
      <Field id="pf-vis" label="Visibilidade" hint="Por defeito Interno. Público abre a checklist." required>
        <Select value={v.visibility} onChange={(e) => set("visibility", e.target.value as Visibility)}><option value="INTERNO">Interno</option><option value="PUBLICO">Público</option><option value="RESTRITO">Restrito</option></Select>
      </Field>
      {v.visibility === "PUBLICO" && <><VisibilityChecklist value={checklist} onChange={setChecklist} /><Switch id="pf-feat" checked={!!v.featured} onCheckedChange={(x) => set("featured", x)} label="Destaque na Home" /></>}
      {errors.featured && <p role="alert" className="text-sm text-danger">{errors.featured}</p>}
      <Button className="w-fit" loading={busy} onClick={submit}>{t("actions.create")}</Button>
    </div>
  );
}

function VisibilityChecklist({ value, onChange }: { value: Record<string, boolean>; onChange: (v: Record<string, boolean>) => void }) {
  const done = VISIBILITY_CHECKLIST.filter((c) => value[c.key]).length;
  return (
    <Card className="grid gap-3 border-warn/40 bg-warn-soft/50 p-4">
      <p className="text-sm font-medium">Checklist obrigatória para Público · {done}/{VISIBILITY_CHECKLIST.length}</p>
      {VISIBILITY_CHECKLIST.map((c) => <Checkbox key={c.key} id={`chk-${c.key}`} checked={!!value[c.key]} onCheckedChange={(x) => onChange({ ...value, [c.key]: x })} label={c.label} />)}
    </Card>
  );
}

// ------------------------------------------------------------- Ficha de gestão

function ProjectDrawer({ p, onClose }: { p: Row; onClose: () => void }) {
  const [vis, setVis] = React.useState<Visibility>(p.visibility);
  const [checklist, setChecklist] = React.useState<Record<string, boolean>>({});
  const [gate, setGate] = React.useState({ decision: "CONTINUAR", evidence: "", decidedBy: "Comité de Inovação" });
  const [exit, setExit] = React.useState({ kind: p.area === "LAB" ? "DIRECCAO" : "SPIN_IN", reason: "" });
  const run = async (fn: () => Promise<unknown>, ok: string) => { try { await fn(); toast.success(ok); } catch (e) { toast.error((e as ApiError).message); } };
  const stages = (p.area === "LAB" ? LAB_STAGES : INC_STAGES) as string[];
  const ro = !p.canManage;
  return (
    <motion.div className="fixed inset-0 z-50 flex justify-end bg-black/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose}>
      <motion.aside role="dialog" aria-modal="true" aria-label={`Gerir ${p.name}`} className="h-full w-full max-w-xl overflow-y-auto bg-bg shadow-3" initial={{ x: 60, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 320, damping: 34 }} onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-line bg-surface p-4">
          <button onClick={onClose} className="grid size-10 place-items-center rounded-full hover:bg-surface-2" aria-label={t("actions.close")} autoFocus><X className="size-5" /></button>
          <div className="min-w-0 flex-1"><p className="truncate font-display text-lg font-bold">{p.name}</p><div className="flex gap-1.5"><AreaTag area={p.area} /><VisibilityTag v={p.visibility} />{ro && <Tag>Leitura</Tag>}</div></div>
          <Button asChild size="sm" variant="ghost"><AppLink href={`/projectos/${p.slug}`}><Eye /> Ficha</AppLink></Button>
        </div>
        <div className="grid gap-6 p-5">
          {p.pendingTransfer && !ro && (
            <Card className="grid gap-3 border-inc/40 bg-inc-soft p-4">
              <p className="flex items-center gap-2 font-medium"><ArrowRightLeft className="size-4" /> Passagem do Lab por aceitar</p>
              <Select aria-label="Etapa inicial" id="acc-stage" defaultValue="INCUBACAO">{INC_STAGES.map((s) => <option key={s} value={s}>{L.stage(s)}</option>)}</Select>
              <Button size="sm" variant="inc" className="w-fit" onClick={() => run(() => mutate("acceptTransfer", { id: p.id, stage: (document.getElementById("acc-stage") as HTMLSelectElement).value as Project["stage"] }), "Passagem aceite.")}>Aceitar e definir etapa</Button>
            </Card>
          )}
          <section className="grid gap-3">
            <h3 className="font-display text-lg font-bold">Etapa</h3>
            <div className="flex flex-wrap gap-2">
              {stages.map((s) => <button key={s} disabled={ro || !!p.exit} onClick={() => run(() => mutate("changeStage", { id: p.id, stage: s as Project["stage"] }), `Etapa: ${L.stage(s)}`)} aria-pressed={p.stage === s} className={cn("min-h-10 rounded-full border px-3 text-sm disabled:cursor-not-allowed", p.stage === s ? "border-brand bg-brand text-white" : "border-line hover:border-line-strong")}>{L.stage(s)}</button>)}
            </div>
            {p.area === "LAB" && (
              <Switch id="arch" checked={!!p.architectureValidatedAt} onCheckedChange={(x) => !ro && run(() => mutate("updateProject", { id: p.id, patch: { architectureValidatedAt: x ? new Date().toISOString() : null } }), x ? "Arquitectura validada pelo Digital Office." : "Validação retirada.")} label="Arquitectura validada pelo Digital Office" description={p.architectureValidatedAt ? `Desde ${fmtDate(p.architectureValidatedAt)}` : "Obrigatória antes de sair de Experimentação."} />
            )}
          </section>
          {!ro && !p.exit && (
            <section className="grid gap-3">
              <h3 className="flex items-center gap-2 font-display text-lg font-bold"><Flag className="size-4" /> Registar gate</h3>
              <Select aria-label="Decisão do gate" value={gate.decision} onChange={(e) => setGate({ ...gate, decision: e.target.value })}><option value="CONTINUAR">Continuar</option><option value="MUDAR">Mudar</option><option value="ENCERRAR">Encerrar</option></Select>
              <Field id="g-ev" label="Evidências" required><Textarea value={gate.evidence} onChange={(e) => setGate({ ...gate, evidence: e.target.value })} placeholder="Cartão de oportunidade, matriz de scoring, test cards…" /></Field>
              <Field id="g-by" label="Quem decidiu"><Input value={gate.decidedBy} onChange={(e) => setGate({ ...gate, decidedBy: e.target.value })} /></Field>
              <Button size="sm" className="w-fit" onClick={() => run(() => mutate("recordGate", { projectId: p.id, stage: p.stage, decision: gate.decision as "CONTINUAR", evidence: gate.evidence, decidedBy: gate.decidedBy }), "Gate registado.")}>Registar gate</Button>
            </section>
          )}
          {!ro && !p.exit && (
            <section className="grid gap-3">
              <h3 className="flex items-center gap-2 font-display text-lg font-bold"><LogOut className="size-4" /> Registar saída</h3>
              <Select aria-label="Saída" value={exit.kind} onChange={(e) => setExit({ ...exit, kind: e.target.value })}>{(p.area === "LAB" ? ["DIRECCAO", "INCUBADORA", "STANDARD", "ENCERRADO"] : ["SPIN_IN", "SPIN_OFF", "ENCERRAMENTO"]).map((k) => <option key={k} value={k}>{L.exit(k)}</option>)}</Select>
              <Field id="x-r" label="Motivo" required><Textarea value={exit.reason} onChange={(e) => setExit({ ...exit, reason: e.target.value })} /></Field>
              <Button size="sm" variant={exit.kind === "INCUBADORA" ? "inc" : "secondary"} className="w-fit" onClick={() => run(() => mutate("recordExit", { id: p.id, kind: exit.kind as never, reason: exit.reason }), exit.kind === "INCUBADORA" ? "Projecto passado para a Incubadora. O gestor da Incubadora foi avisado." : "Saída registada.")}>{exit.kind === "INCUBADORA" ? "Passar para a Incubadora" : "Registar saída"}</Button>
            </section>
          )}
          <section className="grid gap-3">
            <h3 className="font-display text-lg font-bold">Visibilidade</h3>
            <Select aria-label="Visibilidade" value={vis} disabled={ro} onChange={(e) => setVis(e.target.value as Visibility)}><option value="INTERNO">Interno</option><option value="PUBLICO">Público</option><option value="RESTRITO">Restrito</option></Select>
            {vis === "PUBLICO" && p.visibility !== "PUBLICO" && <VisibilityChecklist value={checklist} onChange={setChecklist} />}
            {vis !== p.visibility && <Button size="sm" className="w-fit" onClick={() => run(() => mutate("changeVisibility", { id: p.id, to: vis, checklist }), "Visibilidade alterada e registada.")}>Guardar visibilidade</Button>}
            {p.visibility === "PUBLICO" && <Switch id="feat" checked={p.featured} onCheckedChange={(x) => !ro && run(() => mutate("setFeatured", { id: p.id, featured: x }), x ? "Em destaque na Home." : "Retirado do destaque.")} label="Destaque na Home" description="Até 6 projectos públicos." />}
          </section>
        </div>
      </motion.aside>
    </motion.div>
  );
}
