"use client";
import * as React from "react";
import { AnimatePresence, motion, Reorder } from "motion/react";
import { toast } from "sonner";
import { Bot, Check, CircleAlert, FlaskConical, GripVertical, History, Mail, MessageSquare, Pencil, Plug, Plus, Save, Search, Send, Settings2, Shield, Trash2, Users } from "lucide-react";
import type { Content, ContentStatus, Criterion, Partner, Role, Settings } from "@/lib/domain/types";
import { F6Schema, F7Schema, type F6Input, type F7Input } from "@/lib/validation/forms";
import { t, fmtDate, fmtDateTime } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { L } from "@/lib/domain/labels";
import { useQuery, useSession } from "@/lib/client/hooks";
import { ApiError, mutate } from "@/lib/client/runtime";
import { Button, Card, Checkbox, Dialog, EmptyState, Field, Input, ListSkeleton, Select, Switch, Tabs, TabsContent, TabsList, TabsTrigger, Tag, Textarea } from "@/components/ui";
import { CriterionBar, PageHeader, RequirePage, ScoreGauge } from "@/components/domain";

const run = async (fn: () => Promise<unknown>, ok: string) => { try { await fn(); toast.success(ok); return true; } catch (e) { toast.error((e as ApiError).message); return false; } };
const statusTone = (s: ContentStatus) => (s === "PUBLICADO" ? "ok" : s === "RASCUNHO" ? "warn" : "neutral");

// =============================================================== P33 Gestão de conteúdos

export function ContentsView() {
  return <RequirePage page="P33" title="a gestão de conteúdos"><Contents /></RequirePage>;
}

function Contents() {
  const { data, loading } = useQuery("listAllContent");
  const [edit, setEdit] = React.useState<{ kind: "news" | "challenge" | "partner" | "simple"; item?: unknown; simpleKind?: Content["kind"] } | null>(null);
  if (loading || !data) return <div className="container-x py-16"><ListSkeleton rows={5} /></div>;
  const news = data.contents.filter((c) => ["NOTICIA", "EVENTO", "DEMO_DAY", "FORMACAO"].includes(c.kind) && !c.meta?.theme);
  const simple = (k: Content["kind"]) => data.contents.filter((c) => c.kind === k);
  const statusMenu = (c: Content) => (
    <Select aria-label={`Estado de ${c.title}`} value={c.status} className="h-9 w-36 text-sm" onChange={(e) => run(() => mutate("setContentStatus", { id: c.id, status: e.target.value as ContentStatus }), "Estado actualizado.")}>
      {(["RASCUNHO", "PUBLICADO", "ARQUIVADO"] as ContentStatus[]).map((s) => <option key={s} value={s}>{L.contentStatus(s)}</option>)}
    </Select>
  );
  const ContentTable = ({ rows, onEdit }: { rows: Content[]; onEdit: (c: Content) => void }) => rows.length === 0 ? <EmptyState title="Sem conteúdos." /> : (
    <Card className="divide-y divide-line">
      {rows.map((c) => (
        <div key={c.id} className="flex flex-wrap items-center gap-3 p-4">
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{c.title}</p>
            <p className="flex flex-wrap gap-2 text-xs text-fg-subtle"><span>{L.contentKind(c.kind)}</span><span>· {c.visibility === "PUBLICO" ? "Pública" : "Interna"}</span>{c.date && <span>· {fmtDate(c.date)}</span>}</p>
          </div>
          <Tag tone={statusTone(c.status)} dot>{L.contentStatus(c.status)}</Tag>
          {statusMenu(c)}
          <Button size="sm" variant="ghost" onClick={() => onEdit(c)}><Pencil /> {t("actions.edit")}</Button>
        </div>
      ))}
    </Card>
  );
  return (
    <>
      <PageHeader crumbs={[{ label: t("nav.contents") }]} eyebrow="P33 · Gestão" title="Gestão de conteúdos" lead="Cada conteúdo tem estado: Rascunho, Publicado ou Arquivado." />
      <div className="container-x py-8">
        <Tabs defaultValue="news" className="grid gap-5">
          <TabsList className="flex-wrap">
            <TabsTrigger value="news">Notícias e eventos</TabsTrigger>
            <TabsTrigger value="challenges">Desafios</TabsTrigger>
            <TabsTrigger value="partners">Parceiros</TabsTrigger>
            <TabsTrigger value="pages">Textos das páginas</TabsTrigger>
            <TabsTrigger value="team">Equipa e champions</TabsTrigger>
            <TabsTrigger value="learn">Recursos de Aprender</TabsTrigger>
          </TabsList>
          <TabsContent value="news" className="grid gap-4">
            <Button className="w-fit" onClick={() => setEdit({ kind: "news" })}><Plus /> Nova notícia ou evento (F7)</Button>
            <ContentTable rows={news} onEdit={(c) => setEdit({ kind: "news", item: c })} />
          </TabsContent>
          <TabsContent value="challenges" className="grid gap-4">
            <Button className="w-fit" onClick={() => setEdit({ kind: "challenge" })}><Plus /> Novo desafio (F6)</Button>
            <Card className="divide-y divide-line">
              {data.challenges.map((c) => (
                <div key={c.id} className="flex flex-wrap items-center gap-3 p-4">
                  <div className="min-w-0 flex-1"><p className="font-medium">{c.title}</p><p className="text-xs text-fg-subtle">{L.audience(c.audience)} · fecha {fmtDate(c.closesAt)}</p></div>
                  <Tag tone={c.status === "ABERTO" ? "ok" : "neutral"}>{L.challengeStatus(c.status)}</Tag>
                  <Tag tone={statusTone(c.contentStatus)} dot>{L.contentStatus(c.contentStatus)}</Tag>
                  <Button size="sm" variant="ghost" onClick={() => setEdit({ kind: "challenge", item: c })}><Pencil /> {t("actions.edit")}</Button>
                </div>
              ))}
            </Card>
          </TabsContent>
          <TabsContent value="partners" className="grid gap-4">
            <Button className="w-fit" onClick={() => setEdit({ kind: "partner" })}><Plus /> Novo parceiro</Button>
            <div className="grid gap-3 md:grid-cols-2">
              {data.partners.map((p) => (
                <Card key={p.id} className="flex items-center gap-3 p-4">
                  <span className="grid size-11 place-items-center rounded-xl bg-fg font-bold text-bg">{p.logo}</span>
                  <div className="flex-1"><p className="font-medium">{p.name}</p><p className="text-xs text-fg-subtle">{p.kind}</p></div>
                  <Tag tone={p.disclosureAuthorized ? "ok" : "warn"}>{p.disclosureAuthorized ? "Divulgação autorizada" : "Sem autorização"}</Tag>
                  <Button size="sm" variant="ghost" onClick={() => setEdit({ kind: "partner", item: p })}><Pencil /></Button>
                </Card>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="pages" className="grid gap-4">
            <p className="text-sm text-fg-muted">Textos de P01 a P04, P09 e P16 a P18. Cada alteração fica registada na auditoria.</p>
            <Button className="w-fit" onClick={() => setEdit({ kind: "simple", simpleKind: "PAGINA" })}><Plus /> Novo bloco de texto</Button>
            <ContentTable rows={simple("PAGINA")} onEdit={(c) => setEdit({ kind: "simple", item: c, simpleKind: "PAGINA" })} />
            {simple("PAGINA").length === 0 && <p className="text-xs text-fg-subtle">Os textos das páginas usam os valores por defeito até criar um bloco com o código da página no título (ex.: «P03 · Missão»).</p>}
          </TabsContent>
          <TabsContent value="team" className="grid gap-4">
            <div className="flex gap-2"><Button onClick={() => setEdit({ kind: "simple", simpleKind: "EQUIPA" })}><Plus /> Pessoa da equipa</Button><Button variant="secondary" onClick={() => setEdit({ kind: "simple", simpleKind: "CHAMPION" })}><Plus /> Champion</Button></div>
            <ContentTable rows={[...simple("EQUIPA"), ...simple("CHAMPION")]} onEdit={(c) => setEdit({ kind: "simple", item: c, simpleKind: c.kind })} />
          </TabsContent>
          <TabsContent value="learn" className="grid gap-4">
            <Button className="w-fit" onClick={() => setEdit({ kind: "simple", simpleKind: "RECURSO" })}><Plus /> Novo recurso</Button>
            <ContentTable rows={simple("RECURSO")} onEdit={(c) => setEdit({ kind: "simple", item: c, simpleKind: "RECURSO" })} />
          </TabsContent>
        </Tabs>
      </div>
      <Dialog wide open={!!edit} onOpenChange={(o) => !o && setEdit(null)} title={edit?.kind === "news" ? "Notícia ou evento (F7)" : edit?.kind === "challenge" ? "Desafio (F6)" : edit?.kind === "partner" ? "Parceiro" : "Conteúdo"}>
        {edit?.kind === "news" && <NewsForm item={edit.item as Content | undefined} done={() => setEdit(null)} />}
        {edit?.kind === "challenge" && <ChallengeForm item={edit.item as (F6Input & { id: string }) | undefined} done={() => setEdit(null)} />}
        {edit?.kind === "partner" && <PartnerForm item={edit.item as Partner | undefined} done={() => setEdit(null)} />}
        {edit?.kind === "simple" && <SimpleForm kind={edit.simpleKind!} item={edit.item as Content | undefined} done={() => setEdit(null)} />}
      </Dialog>
    </>
  );
}

function useZodState<T extends Record<string, unknown>>(initial: T) {
  const [v, setV] = React.useState<T>(initial);
  const [err, setErr] = React.useState<Record<string, string>>({});
  const set = (k: keyof T, val: unknown) => setV((x) => ({ ...x, [k]: val }));
  return { v, set, err, setErr };
}

function NewsForm({ item, done }: { item?: Content; done: () => void }) {
  const { v, set, err, setErr } = useZodState<Record<string, unknown>>({ kind: item?.kind ?? "NOTICIA", title: item?.title ?? "", summary: item?.summary ?? "", body: item?.body ?? "", date: item?.date?.slice(0, 16) ?? "", place: item?.place ?? "", signupUrl: item?.signupUrl ?? "", visibility: item?.visibility ?? "PUBLICO", status: item?.status ?? "RASCUNHO", projectIds: item?.projectIds ?? [], cover: item?.cover ?? "linear-gradient(135deg,#036ef2,#9437ff)" });
  const { data: projects = [] } = useQuery("listProjects");
  const save = async () => {
    const r = F7Schema.safeParse({ ...v, date: v.date ? new Date(v.date as string).toISOString() : undefined });
    if (!r.success) return setErr(Object.fromEntries(r.error.issues.map((i) => [String(i.path[0]), i.message])));
    if (await run(() => mutate("saveNews", { id: item?.id, data: r.data as F7Input }), "Conteúdo guardado.")) done();
  };
  const isEvent = v.kind !== "NOTICIA";
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field id="n-kind" label="Tipo" required><Select value={v.kind as string} onChange={(e) => set("kind", e.target.value)}>{["NOTICIA", "EVENTO", "DEMO_DAY", "FORMACAO"].map((k) => <option key={k} value={k}>{L.contentKind(k)}</option>)}</Select></Field>
        <Field id="n-vis" label="Visibilidade" required><Select value={v.visibility as string} onChange={(e) => set("visibility", e.target.value)}><option value="PUBLICO">Pública</option><option value="INTERNO">Interna (só com login)</option></Select></Field>
        <Field id="n-st" label="Estado" required><Select value={v.status as string} onChange={(e) => set("status", e.target.value)}>{["RASCUNHO", "PUBLICADO", "ARQUIVADO"].map((k) => <option key={k} value={k}>{L.contentStatus(k)}</option>)}</Select></Field>
      </div>
      <Field id="n-t" label="Título" required error={err.title}><Input value={v.title as string} onChange={(e) => set("title", e.target.value)} /></Field>
      <Field id="n-s" label="Resumo" required error={err.summary}><Textarea rows={2} value={v.summary as string} onChange={(e) => set("summary", e.target.value)} /></Field>
      <Field id="n-b" label="Texto" hint="Parágrafos separados por uma linha em branco." required error={err.body}><Textarea rows={6} value={v.body as string} onChange={(e) => set("body", e.target.value)} /></Field>
      {isEvent && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Field id="n-d" label="Data e hora" required error={err.date}><Input type="datetime-local" value={v.date as string} onChange={(e) => set("date", e.target.value)} /></Field>
          <Field id="n-p" label="Local" required error={err.place}><Input value={v.place as string} onChange={(e) => set("place", e.target.value)} /></Field>
          <Field id="n-u" label="Ligação de inscrição" error={err.signupUrl}><Input type="url" value={v.signupUrl as string} onChange={(e) => set("signupUrl", e.target.value)} /></Field>
        </div>
      )}
      <fieldset className="grid gap-2"><legend className="text-sm font-medium">Projectos ligados</legend><div className="flex flex-wrap gap-2">{projects.map((p) => { const on = (v.projectIds as string[]).includes(p.id); return <button key={p.id} type="button" aria-pressed={on} onClick={() => set("projectIds", on ? (v.projectIds as string[]).filter((x) => x !== p.id) : [...(v.projectIds as string[]), p.id])} className={cn("rounded-full border px-3 py-1 text-sm", on ? "border-brand bg-brand-soft" : "border-line")}>{p.name}</button>; })}</div></fieldset>
      <Button className="w-fit" onClick={save}><Save /> {t("actions.save")}</Button>
    </div>
  );
}

function ChallengeForm({ item, done }: { item?: F6Input & { id: string }; done: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const { v, set, err, setErr } = useZodState<Record<string, unknown>>({ title: item?.title ?? "", area: item?.area ?? "INCUBADORA", audience: item?.audience ?? "AMBOS", problem: item?.problem ?? "", context: item?.context ?? "", lookingFor: item?.lookingFor ?? "", criteria: (item?.criteria ?? []).join("\n"), opensAt: item?.opensAt?.slice(0, 10) ?? today, closesAt: item?.closesAt?.slice(0, 10) ?? "", benefits: item?.benefits ?? "", faq: (item?.faq ?? []).map((f) => `${f.q} | ${f.a}`).join("\n"), visibility: item?.visibility ?? "PUBLICO", contentStatus: item?.contentStatus ?? "RASCUNHO", status: item?.status ?? "ABERTO", cover: item?.cover ?? "linear-gradient(135deg,#ff0066,#9437ff)" });
  const save = async () => {
    const data = { ...v, criteria: String(v.criteria).split("\n").map((s) => s.trim()).filter(Boolean), faq: String(v.faq).split("\n").filter((l) => l.includes("|")).map((l) => ({ q: l.split("|")[0].trim(), a: l.split("|").slice(1).join("|").trim() })), opensAt: new Date(String(v.opensAt)).toISOString(), closesAt: v.closesAt ? new Date(String(v.closesAt)).toISOString() : "" };
    const r = F6Schema.safeParse(data);
    if (!r.success) return setErr(Object.fromEntries(r.error.issues.map((i) => [String(i.path[0]), i.message])));
    if (await run(() => mutate("saveChallenge", { id: item?.id, data: r.data }), "Desafio guardado.")) done();
  };
  return (
    <div className="grid gap-4">
      <Field id="c-t" label="Título" required error={err.title}><Input value={v.title as string} onChange={(e) => set("title", e.target.value)} /></Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field id="c-a" label="Área responsável" required><Select value={v.area as string} onChange={(e) => set("area", e.target.value)}><option value="LAB">Laboratório</option><option value="INCUBADORA">Incubadora</option></Select></Field>
        <Field id="c-au" label="Para quem" required><Select value={v.audience as string} onChange={(e) => set("audience", e.target.value)}>{["EXTERNOS", "COLABORADORES", "AMBOS"].map((k) => <option key={k} value={k}>{L.audience(k)}</option>)}</Select></Field>
        <Field id="c-s" label="Estado do desafio" required><Select value={v.status as string} onChange={(e) => set("status", e.target.value)}>{["ABERTO", "EM_AVALIACAO", "FECHADO"].map((k) => <option key={k} value={k}>{L.challengeStatus(k)}</option>)}</Select></Field>
      </div>
      {(["problem", "context", "lookingFor", "benefits"] as const).map((k) => <Field key={k} id={`c-${k}`} label={{ problem: "Problema", context: "Contexto", lookingFor: "O que se procura", benefits: "Prémios ou benefícios" }[k]} required error={err[k]}><Textarea rows={2} value={v[k] as string} onChange={(e) => set(k, e.target.value)} /></Field>)}
      <Field id="c-cr" label="Critérios de avaliação" hint="Um por linha." required error={err.criteria}><Textarea rows={3} value={v.criteria as string} onChange={(e) => set("criteria", e.target.value)} /></Field>
      <Field id="c-faq" label="Perguntas frequentes" hint="Uma por linha: pergunta | resposta"><Textarea rows={3} value={v.faq as string} onChange={(e) => set("faq", e.target.value)} /></Field>
      <div className="grid gap-4 sm:grid-cols-4">
        <Field id="c-o" label="Abertura" required error={err.opensAt}><Input type="date" value={v.opensAt as string} onChange={(e) => set("opensAt", e.target.value)} /></Field>
        <Field id="c-c" label="Fecho" required error={err.closesAt}><Input type="date" value={v.closesAt as string} onChange={(e) => set("closesAt", e.target.value)} /></Field>
        <Field id="c-v" label="Visibilidade" required><Select value={v.visibility as string} onChange={(e) => set("visibility", e.target.value)}><option value="PUBLICO">Pública</option><option value="INTERNO">Interna</option></Select></Field>
        <Field id="c-cs" label="Publicação" required><Select value={v.contentStatus as string} onChange={(e) => set("contentStatus", e.target.value)}>{["RASCUNHO", "PUBLICADO", "ARQUIVADO"].map((k) => <option key={k} value={k}>{L.contentStatus(k)}</option>)}</Select></Field>
      </div>
      <Button className="w-fit" onClick={save}><Save /> {t("actions.save")}</Button>
    </div>
  );
}

function PartnerForm({ item, done }: { item?: Partner; done: () => void }) {
  const [v, setV] = React.useState<Omit<Partner, "id">>({ name: item?.name ?? "", kind: item?.kind ?? "UNIVERSIDADE", logo: item?.logo ?? "", description: item?.description ?? "", together: item?.together ?? "", disclosureAuthorized: item?.disclosureAuthorized ?? false });
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field id="pa-n" label="Nome" required><Input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></Field>
        <Field id="pa-k" label="Tipo" required><Select value={v.kind} onChange={(e) => setV({ ...v, kind: e.target.value as Partner["kind"] })}><option value="UNIVERSIDADE">Universidade</option><option value="PROGRAMA">Programa de incubação</option><option value="STARTUP">Startup</option><option value="EMPRESA">Empresa</option></Select></Field>
        <Field id="pa-l" label="Monograma do logótipo" hint="2 letras."><Input maxLength={3} value={v.logo} onChange={(e) => setV({ ...v, logo: e.target.value.toUpperCase() })} /></Field>
      </div>
      <Field id="pa-d" label="Descrição curta" required><Textarea rows={2} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} /></Field>
      <Field id="pa-t" label="O que fazemos juntos" required><Textarea rows={2} value={v.together} onChange={(e) => setV({ ...v, together: e.target.value })} /></Field>
      <Checkbox id="pa-auth" checked={v.disclosureAuthorized} onCheckedChange={(x) => setV({ ...v, disclosureAuthorized: x })} label="O parceiro autorizou a divulgação (só aparece no site com esta autorização)" />
      <Button className="w-fit" onClick={async () => (await run(() => mutate("savePartner", { id: item?.id, data: v }), "Parceiro guardado.")) && done()}><Save /> {t("actions.save")}</Button>
    </div>
  );
}

function SimpleForm({ kind, item, done }: { kind: Content["kind"]; item?: Content; done: () => void }) {
  const [v, setV] = React.useState({ kind, title: item?.title ?? "", summary: item?.summary ?? "", body: item?.body ?? "", visibility: item?.visibility ?? (kind === "EQUIPA" || kind === "PAGINA" ? "PUBLICO" : "INTERNO"), status: item?.status ?? "RASCUNHO" as ContentStatus, meta: item?.meta ?? {} });
  return (
    <div className="grid gap-4">
      <Field id="s-t" label={kind === "EQUIPA" || kind === "CHAMPION" ? "Nome" : "Título"} required><Input value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} /></Field>
      <Field id="s-s" label={kind === "EQUIPA" || kind === "CHAMPION" ? "Função" : "Resumo"} required><Input value={v.summary} onChange={(e) => setV({ ...v, summary: e.target.value })} /></Field>
      {(kind === "PAGINA" || kind === "RECURSO") && <Field id="s-b" label="Texto"><Textarea rows={5} value={v.body} onChange={(e) => setV({ ...v, body: e.target.value })} /></Field>}
      {kind === "RECURSO" && <Field id="s-ty" label="Tipo de recurso"><Select value={v.meta.type ?? "TEMPLATE"} onChange={(e) => setV({ ...v, meta: { ...v.meta, type: e.target.value } })}>{["TEMPLATE", "CHECKLIST", "PILOTO", "DEMO"].map((x) => <option key={x}>{x}</option>)}</Select></Field>}
      {kind === "EQUIPA" && <Checkbox id="s-photo" checked={v.meta.photoAuthorized === "true"} onCheckedChange={(x) => setV({ ...v, meta: { ...v.meta, photoAuthorized: String(x) } })} label="Fotografia autorizada" />}
      {kind === "CHAMPION" && <div className="grid gap-4 sm:grid-cols-2"><Field id="s-ar" label="Área"><Input value={v.meta.area ?? ""} onChange={(e) => setV({ ...v, meta: { ...v.meta, area: e.target.value } })} /></Field><Field id="s-ct" label="Contacto"><Input value={v.meta.contact ?? ""} onChange={(e) => setV({ ...v, meta: { ...v.meta, contact: e.target.value } })} /></Field></div>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="s-v" label="Visibilidade"><Select value={v.visibility} onChange={(e) => setV({ ...v, visibility: e.target.value as "PUBLICO" })}><option value="PUBLICO">Pública</option><option value="INTERNO">Interna</option></Select></Field>
        <Field id="s-st" label="Estado"><Select value={v.status} onChange={(e) => setV({ ...v, status: e.target.value as ContentStatus })}>{["RASCUNHO", "PUBLICADO", "ARQUIVADO"].map((k) => <option key={k} value={k}>{L.contentStatus(k)}</option>)}</Select></Field>
      </div>
      <Button className="w-fit" onClick={async () => (await run(() => mutate("saveSimpleContent", { id: item?.id, data: v }), "Guardado.")) && done()}><Save /> {t("actions.save")}</Button>
    </div>
  );
}

// =============================================================== P34 Critérios da IA

export function CriteriaView() {
  return <RequirePage page="P34" title="os critérios da IA"><CriteriaPage /></RequirePage>;
}

function CriteriaPage() {
  const { data, loading } = useQuery("getCriteria");
  const { user } = useSession();
  const [tab, setTab] = React.useState<"EXTERNA_NEGOCIO" | "MELHORIA">("MELHORIA");
  React.useEffect(() => { if (user?.role === "GESTOR_INCUBADORA") setTab("EXTERNA_NEGOCIO"); }, [user?.role]);
  if (loading || !data) return <div className="container-x py-16"><ListSkeleton /></div>;
  return (
    <>
      <PageHeader tone="ai" crumbs={[{ label: t("nav.aiCriteria") }]} eyebrow="P34 · Gestão" title="Critérios da IA" lead="Um separador por tipo de ideia. Os pesos têm de somar 100 %. Cada análise guarda a versão usada." />
      <div className="container-x py-8">
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="grid gap-6">
          <TabsList><TabsTrigger value="MELHORIA">Ideia de melhoria</TabsTrigger><TabsTrigger value="EXTERNA_NEGOCIO">Ideia externa e de negócio</TabsTrigger></TabsList>
          {(["MELHORIA", "EXTERNA_NEGOCIO"] as const).map((k) => <TabsContent key={k} value={k}><CriteriaEditor key={data[k].active.id} kind={k} set={data[k]} /></TabsContent>)}
        </Tabs>
      </div>
    </>
  );
}

function CriteriaEditor({ kind, set }: { kind: "MELHORIA" | "EXTERNA_NEGOCIO"; set: { active: { criteria: Criterion[]; context: string; version: number }; versions: { id: string; version: number; createdAt: string; active: boolean }[]; canEdit: boolean } }) {
  const [items, setItems] = React.useState<(Criterion & { _id: string })[]>(set.active.criteria.map((c) => ({ ...c, _id: c.key })));
  const [context, setContext] = React.useState(set.active.context);
  const [testIdea, setTestIdea] = React.useState("");
  const [test, setTest] = React.useState<Awaited<ReturnType<typeof import("@/lib/client/runtime").api<"testCriteria">>> | null>(null);
  const { data: rows = [] } = useQuery("triageList", { scope: "all" });
  const sum = items.reduce((n, c) => n + Number(c.weight || 0), 0);
  const ro = !set.canEdit;
  const upd = (i: number, patch: Partial<Criterion>) => setItems((xs) => xs.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const strip = () => items.map(({ _id, ...c }) => c);
  const candidates = rows.filter((r) => (kind === "MELHORIA" ? r.type === "MELHORIA" : r.type !== "MELHORIA"));
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="grid content-start gap-4">
        {ro && <p className="rounded-[var(--radius-md)] bg-info-soft p-3 text-sm text-info">Só leitura: estes critérios são geridos pelo gestor {kind === "MELHORIA" ? "do Lab" : "da Incubadora"}.</p>}
        <div className="sticky top-32 z-10 flex items-center gap-4 rounded-[var(--radius-md)] border border-line bg-surface/95 p-3 backdrop-blur">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-3"><motion.div className={cn("h-full rounded-full", sum === 100 ? "bg-ok" : "bg-warn")} animate={{ width: `${Math.min(100, sum)}%` }} /></div>
          <span className={cn("font-mono text-sm font-bold tabular", sum === 100 ? "text-ok" : "text-warn")} aria-live="polite">{sum}% {sum === 100 ? <Check className="inline size-4" /> : <CircleAlert className="inline size-4" />}</span>
          {!ro && <Button size="sm" disabled={sum !== 100} onClick={() => run(() => mutate("saveCriteria", { kind, criteria: strip(), context }), "Nova versão dos critérios guardada.")}><Save /> Guardar versão {set.active.version + 1}</Button>}
        </div>
        <Reorder.Group axis="y" values={items} onReorder={ro ? () => {} : setItems} className="grid gap-3">
          {items.map((c, i) => (
            <Reorder.Item key={c._id} value={c} dragListener={!ro} className="list-none">
              <Card className="grid gap-3 p-4">
                <div className="flex items-center gap-2">
                  {!ro && <GripVertical className="size-4 cursor-grab text-fg-subtle" aria-hidden />}
                  <label htmlFor={`cn-${c._id}`} className="sr-only">Nome</label>
                  <Input id={`cn-${c._id}`} disabled={ro} value={c.name} onChange={(e) => upd(i, { name: e.target.value, key: c.key || e.target.value.toLowerCase().replace(/\W+/g, "_") })} className="h-10 flex-1 font-medium" />
                  <label htmlFor={`cw-${c._id}`} className="sr-only">Peso</label>
                  <div className="flex items-center gap-1"><Input id={`cw-${c._id}`} disabled={ro} type="number" min={0} max={100} value={c.weight} onChange={(e) => upd(i, { weight: Number(e.target.value) })} className="h-10 w-20 text-right font-mono" /><span className="text-sm">%</span></div>
                  {!ro && <Button variant="ghost" size="icon" aria-label={`Retirar ${c.name}`} onClick={() => setItems((xs) => xs.filter((_, j) => j !== i))}><Trash2 /></Button>}
                </div>
                <Field id={`cd-${c._id}`} label="O que avalia"><Input disabled={ro} value={c.description} onChange={(e) => upd(i, { description: e.target.value })} /></Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field id={`c1-${c._id}`} label="O que vale 1"><Input disabled={ro} value={c.scale1} onChange={(e) => upd(i, { scale1: e.target.value })} /></Field>
                  <Field id={`c5-${c._id}`} label="O que vale 5"><Input disabled={ro} value={c.scale5} onChange={(e) => upd(i, { scale5: e.target.value })} /></Field>
                </div>
              </Card>
            </Reorder.Item>
          ))}
        </Reorder.Group>
        {!ro && <Button variant="secondary" className="w-fit" onClick={() => setItems((xs) => [...xs, { _id: crypto.randomUUID(), key: `criterio_${xs.length + 1}`, name: "Novo critério", description: "", scale1: "", scale5: "", weight: 0 }])}><Plus /> Acrescentar critério</Button>}
        <Field id="ctx" label="Instruções de contexto para a IA" hint="Estratégia da TIS, pilares, sectores prioritários, desafios abertos."><Textarea rows={5} disabled={ro} value={context} onChange={(e) => setContext(e.target.value)} /></Field>
      </div>
      <aside className="grid content-start gap-4">
        <Card className="grid gap-3 p-5">
          <p className="flex items-center gap-2 font-display text-lg font-bold"><FlaskConical className="size-5 text-ai-ink" /> Testar com uma ideia</p>
          <p className="text-sm text-fg-muted">Corre a análise com estes critérios, sem a gravar.</p>
          <Select aria-label="Ideia para testar" value={testIdea} onChange={(e) => setTestIdea(e.target.value)}><option value="">Escolha uma ideia…</option>{candidates.map((r) => <option key={r.id} value={r.id}>{r.number} · {r.title}</option>)}</Select>
          <Button variant="ai" disabled={!testIdea || ro || sum !== 100} onClick={async () => { try { setTest(await mutate("testCriteria", { kind, criteria: strip(), context, ideaId: testIdea })); } catch (e) { toast.error((e as ApiError).message); } }}><Bot /> Testar</Button>
          <AnimatePresence>{test && test.status === "CONCLUIDA" && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid gap-3 border-t border-line pt-3">
              <div className="flex justify-center"><ScoreGauge value={test.total} size={120} /></div>
              {test.scores.map((s, i) => <CriterionBar key={s.key} name={s.name} score={s.score} weight={s.weight} justification={s.justification} delay={i * 0.06} />)}
            </motion.div>
          )}</AnimatePresence>
        </Card>
        <Card className="grid gap-2 p-5">
          <p className="flex items-center gap-2 font-display text-lg font-bold"><History className="size-5" /> Histórico de versões</p>
          {set.versions.map((v) => <p key={v.id} className="flex items-center justify-between text-sm"><span>Versão {v.version}</span><span className="text-fg-subtle">{fmtDate(v.createdAt)}</span>{v.active && <Tag tone="ok">Activa</Tag>}</p>)}
        </Card>
      </aside>
    </div>
  );
}

// =============================================================== P35 Comunicação com criadores

export function CommunicationView() {
  return <RequirePage page="P35" title="a comunicação com criadores"><Communication /></RequirePage>;
}

function Communication() {
  const { data, loading } = useQuery("communicationInbox");
  const [sel, setSel] = React.useState<string | null>(null);
  const [text, setText] = React.useState("");
  const [tpl, setTpl] = React.useState<{ key: string; title: string; body: string } | null>(null);
  if (loading || !data) return <div className="container-x py-16"><ListSkeleton /></div>;
  const th = data.threads.find((x) => x.ideaId === (sel ?? data.threads[0]?.ideaId));
  return (
    <>
      <PageHeader crumbs={[{ label: t("nav.communication") }]} eyebrow="P35 · Gestão" title="Comunicação com criadores" lead="A IA pode propor um rascunho. O gestor revê, edita e valida antes de enviar." />
      <div className="container-x py-8">
        <Tabs defaultValue="inbox" className="grid gap-5">
          <TabsList><TabsTrigger value="inbox"><MessageSquare className="size-4" /> Caixa</TabsTrigger><TabsTrigger value="templates">Modelos</TabsTrigger><TabsTrigger value="sent">Histórico enviado</TabsTrigger></TabsList>
          <TabsContent value="inbox">
            {data.threads.length === 0 ? <EmptyState title="Sem conversas." /> : (
              <Card className="grid min-h-[60vh] overflow-hidden md:grid-cols-[320px_1fr]">
                <ul className="max-h-[70vh] overflow-y-auto border-b border-line md:border-b-0 md:border-r">
                  {data.threads.map((x) => (
                    <li key={x.ideaId}><button onClick={() => { setSel(x.ideaId); setText(""); }} className={cn("grid w-full gap-1 border-b border-line p-4 text-left hover:bg-surface-2", th?.ideaId === x.ideaId && "bg-brand-soft")}>
                      <span className="flex justify-between text-xs"><span className="font-mono text-fg-subtle">{x.number}</span>{x.awaitingReply && <Tag tone="warn">Por responder</Tag>}</span>
                      <span className="truncate font-medium">{x.title}</span><span className="text-xs text-fg-muted">{x.creator}</span>
                    </button></li>
                  ))}
                </ul>
                {th && (
                  <div className="flex flex-col">
                    <div className="flex-1 space-y-3 overflow-y-auto bg-bg p-4">
                      {th.messages.map((m) => <div key={m.id} className={cn("max-w-[80%] rounded-2xl px-4 py-3 text-sm", m.fromTeam ? "ml-auto bg-brand text-white" : "bg-surface shadow-1")}><p className="mb-1 text-[11px] opacity-70">{m.authorName} · {fmtDateTime(m.at)}</p><p className="whitespace-pre-line">{m.text}</p></div>)}
                    </div>
                    <div className="grid gap-2 border-t border-line p-3">
                      <div className="flex flex-wrap gap-2">
                        {th.aiDraft && <Button size="sm" variant="ghost" onClick={() => setText(th.aiDraft)}><Bot /> Rascunho da IA</Button>}
                        <Select aria-label="Usar modelo" value="" onChange={(e) => { const tp = data.templates.find((x) => x.key === e.target.value); if (tp) setText(tp.body.replaceAll("{titulo}", th.title).replaceAll("{prazo}", "10")); }} className="h-9 w-auto text-sm"><option value="">Usar modelo…</option>{data.templates.map((x) => <option key={x.key} value={x.key}>{x.title}</option>)}</Select>
                      </div>
                      <label htmlFor="team-msg" className="sr-only">Mensagem</label>
                      <Textarea id="team-msg" rows={5} value={text} onChange={(e) => setText(e.target.value)} placeholder="Escreva ou parta de um rascunho. Só é enviado depois de validar." />
                      <Button className="w-fit" disabled={!text.trim()} onClick={async () => (await run(() => mutate("sendTeamMessage", { ideaId: th.ideaId, text }), "Validado e enviado. O criador recebe aviso por email.")) && setText("")}><Send /> Validar e enviar</Button>
                    </div>
                  </div>
                )}
              </Card>
            )}
          </TabsContent>
          <TabsContent value="templates" className="grid gap-3 md:grid-cols-2">
            {data.templates.map((x) => (
              <Card key={x.key} className="grid gap-2 p-5"><p className="font-medium">{x.title}</p><p className="line-clamp-4 whitespace-pre-line text-sm text-fg-muted">{x.body}</p><Button size="sm" variant="ghost" className="w-fit" onClick={() => setTpl(x)}><Pencil /> {t("actions.edit")}</Button></Card>
            ))}
          </TabsContent>
          <TabsContent value="sent">
            <Card className="divide-y divide-line">{data.sent.map((m) => <div key={m.id} className="grid gap-1 p-4 text-sm"><p className="text-xs text-fg-subtle">{m.number} · {fmtDateTime(m.at)} · validado por {m.by ?? "—"} · {m.kind}</p><p className="line-clamp-2">{m.text}</p></div>)}</Card>
          </TabsContent>
        </Tabs>
      </div>
      <Dialog open={!!tpl} onOpenChange={(o) => !o && setTpl(null)} title="Editar modelo" description="Variáveis: {titulo}, {prazo}, {motivo}, {proximo}, {destino}.">
        {tpl && <div className="grid gap-4"><Field id="tp-t" label="Título"><Input value={tpl.title} onChange={(e) => setTpl({ ...tpl, title: e.target.value })} /></Field><Field id="tp-b" label="Texto"><Textarea rows={8} value={tpl.body} onChange={(e) => setTpl({ ...tpl, body: e.target.value })} /></Field><Button className="w-fit" onClick={async () => (await run(() => mutate("saveTemplate", tpl), "Modelo guardado.")) && setTpl(null)}>{t("actions.save")}</Button></div>}
      </Dialog>
    </>
  );
}

// =============================================================== P36 Utilizadores, perfis e configurações

export function UsersView() {
  return <RequirePage page="P36" title="utilizadores e configurações"><UsersPage /></RequirePage>;
}

function UsersPage() {
  return (
    <>
      <PageHeader crumbs={[{ label: t("nav.users") }]} eyebrow="P36 · Gestão" title="Utilizadores, perfis e configurações" lead="Os valores [a confirmar] da especificação são configurados aqui, nunca no código." />
      <div className="container-x py-8">
        <Tabs defaultValue="users" className="grid gap-5">
          <TabsList className="flex-wrap"><TabsTrigger value="users"><Users className="size-4" /> Utilizadores</TabsTrigger><TabsTrigger value="settings"><Settings2 className="size-4" /> Configurações</TabsTrigger><TabsTrigger value="integrations"><Plug className="size-4" /> Integrações</TabsTrigger><TabsTrigger value="audit"><Shield className="size-4" /> Auditoria</TabsTrigger><TabsTrigger value="outbox"><Mail className="size-4" /> Caixa de saída</TabsTrigger></TabsList>
          <TabsContent value="users"><UsersTable /></TabsContent>
          <TabsContent value="settings"><SettingsForm /></TabsContent>
          <TabsContent value="integrations"><IntegrationsForm /></TabsContent>
          <TabsContent value="audit"><AuditLog /></TabsContent>
          <TabsContent value="outbox"><Outbox /></TabsContent>
        </Tabs>
      </div>
    </>
  );
}

function UsersTable() {
  const { data = [], loading } = useQuery("listUsers");
  const { user: me } = useSession();
  const [q, setQ] = React.useState("");
  const [role, setRole] = React.useState("");
  if (loading) return <ListSkeleton />;
  const rows = data.filter((u) => (!role || u.role === role) && (!q || `${u.name} ${u.email}`.toLowerCase().includes(q.toLowerCase())));
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-60 flex-1"><Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" /><Input aria-label="Pesquisar utilizadores" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nome ou email" className="pl-10" /></div>
        <Select aria-label="Perfil" value={role} onChange={(e) => setRole(e.target.value)} className="w-auto"><option value="">Todos os perfis</option>{["COLABORADOR", "GESTOR_LAB", "GESTOR_INCUBADORA", "COMISSAO_EXECUTIVA", "EXTERNO"].map((r) => <option key={r} value={r}>{L.role(r)}</option>)}</Select>
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="bg-bg text-left text-xs uppercase tracking-wider text-fg-subtle"><tr>{["Nome", "Perfil", "Tipo", "Registo", "Último acesso", "Estado"].map((h) => <th key={h} className="px-3 py-3 font-medium">{h}</th>)}</tr></thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id} className="border-t border-line">
                <td className="px-3 py-3"><p className="font-medium">{u.name}</p><p className="text-xs text-fg-subtle">{u.email}</p></td>
                <td className="px-3 py-3">
                  {u.authProvider === "MICROSOFT" && u.id !== me?.id ? (
                    <Select aria-label={`Perfil de ${u.name}`} value={u.role} className="h-9 w-56 text-sm" onChange={(e) => run(() => mutate("setUserRole", { userId: u.id, role: e.target.value as Role }), "Perfil alterado e registado na auditoria.")}>{["COLABORADOR", "GESTOR_LAB", "GESTOR_INCUBADORA", "COMISSAO_EXECUTIVA"].map((r) => <option key={r} value={r}>{L.role(r)}</option>)}</Select>
                  ) : <Tag>{L.role(u.role)}</Tag>}
                </td>
                <td className="px-3 py-3">{u.authProvider === "MICROSOFT" ? "Microsoft" : u.external ? L.extType(u.external.type) : "Email"}</td>
                <td className="px-3 py-3 text-fg-muted">{fmtDate(u.createdAt)}</td>
                <td className="px-3 py-3 text-fg-muted">{fmtDate(u.lastSeenAt)}</td>
                <td className="px-3 py-3">{u.role === "EXTERNO" ? <Switch id={`st-${u.id}`} checked={u.status === "ACTIVO"} onCheckedChange={(x) => run(() => mutate("setUserStatus", { userId: u.id, status: x ? "ACTIVO" : "DESACTIVADO" }), x ? "Conta activada." : "Conta desactivada.")} label={<span className="sr-only">Activa</span>} /> : <Tag tone="ok">Activo</Tag>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function SettingsForm() {
  const { data } = useQuery("getSettings");
  const { user } = useSession();
  const [s, setS] = React.useState<Settings | null>(null);
  React.useEffect(() => { if (data) setS(data); }, [data]);
  if (!s) return <ListSkeleton />;
  const isLab = user?.role === "GESTOR_LAB";
  const isInc = user?.role === "GESTOR_INCUBADORA";
  const save = (patch: Partial<Settings>) => run(() => mutate("saveSettings", patch), "Configurações guardadas e registadas.");
  const num = (k: keyof Settings, label: string, hint?: string) => (
    <Field id={`set-${String(k)}`} label={label} hint={hint}><Input type="number" min={0} value={s[k] as number} onChange={(e) => setS({ ...s, [k]: Number(e.target.value) })} /></Field>
  );
  return (
    <div className="grid gap-6">
      <Card className="grid gap-5 p-6">
        <h3 className="font-display text-lg font-bold">Prazos e regras</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {num("responseDeadlineDays", "Prazo do primeiro retorno", "Dias úteis (P1).")}
          {num("fastTrackWeeklyQuota", "Quota semanal da via rápida")}
          {num("retentionMonths", "Retenção de ideias não seleccionadas", "Meses (P8).")}
          {num("stalledProjectDays", "Alerta de projecto parado", "Dias numa etapa.")}
        </div>
        <div className="grid gap-3">
          <Switch id="set-ro" checked={s.crossAreaReadOnly} onCheckedChange={(x) => setS({ ...s, crossAreaReadOnly: x })} label="Cada gestor vê a outra área em leitura (P3)" />
          <Switch id="set-res" checked={s.restrictedVisibilityEnabled} onCheckedChange={(x) => setS({ ...s, restrictedVisibilityEnabled: x })} label="Nível de visibilidade «Restrito» (P2)" />
          <Switch id="set-rev" checked={s.anonymousRevealEnabled} onCheckedChange={(x) => setS({ ...s, anonymousRevealEnabled: x })} label="Autor anónimo pode revelar a autoria (P5)" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="set-terms" label="Versão dos termos"><Input value={s.termsVersion} onChange={(e) => setS({ ...s, termsVersion: e.target.value })} /></Field>
          <Field id="set-priv" label="Versão da política de privacidade"><Input value={s.privacyVersion} onChange={(e) => setS({ ...s, privacyVersion: e.target.value })} /></Field>
        </div>
        <Button className="w-fit" onClick={() => save({ responseDeadlineDays: s.responseDeadlineDays, fastTrackWeeklyQuota: s.fastTrackWeeklyQuota, retentionMonths: s.retentionMonths, stalledProjectDays: s.stalledProjectDays, crossAreaReadOnly: s.crossAreaReadOnly, restrictedVisibilityEnabled: s.restrictedVisibilityEnabled, anonymousRevealEnabled: s.anonymousRevealEnabled, termsVersion: s.termsVersion, privacyVersion: s.privacyVersion })}><Save /> {t("actions.save")}</Button>
      </Card>
      <Card className="grid gap-5 p-6">
        <h3 className="font-display text-lg font-bold">Números da Home</h3>
        <p className="text-sm text-fg-muted">Deixe vazio para calcular automaticamente a partir dos dados (P17).</p>
        <div className="grid gap-4 sm:grid-cols-4">
          {(["ideas", "activeProjects", "startups", "partners"] as const).map((k) => <Field key={k} id={`hn-${k}`} label={{ ideas: "Ideias recebidas", activeProjects: "Projectos activos", startups: "Startups apoiadas", partners: "Parceiros" }[k]}><Input type="number" value={s.homeNumbers[k] ?? ""} onChange={(e) => setS({ ...s, homeNumbers: { ...s.homeNumbers, [k]: e.target.value === "" ? null : Number(e.target.value) } })} /></Field>)}
        </div>
        <Button className="w-fit" onClick={() => save({ homeNumbers: s.homeNumbers })}><Save /> {t("actions.save")}</Button>
      </Card>
      <Card className="grid gap-4 p-6">
        <h3 className="font-display text-lg font-bold">Objectivos 2027 (O1 a O6) {!isLab && <Tag className="ml-2">Só o gestor do Lab edita</Tag>}</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="text-left text-xs text-fg-subtle"><tr><th className="p-2">Objectivo</th>{["T1", "T2", "T3", "T4"].map((q) => <th key={q} className="p-2">{q} plan. / real</th>)}</tr></thead>
            <tbody>{s.okrs.map((o, i) => (
              <tr key={o.key} className="border-t border-line">
                <td className="p-2"><span className="font-mono">{o.key}</span> {o.title} <span className="text-fg-subtle">({o.unit})</span></td>
                {[0, 1, 2, 3].map((q) => (
                  <td key={q} className="p-2"><div className="flex gap-1">
                    {(["planned", "actual"] as const).map((k) => <Input key={k} aria-label={`${o.key} T${q + 1} ${k === "planned" ? "planeado" : "real"}`} disabled={!isLab} type="number" value={o[k][q]} onChange={(e) => { const okrs = structuredClone(s.okrs); okrs[i][k][q] = Number(e.target.value); setS({ ...s, okrs }); }} className="h-9 w-16 px-2 text-right font-mono" />)}
                  </div></td>
                ))}
              </tr>
            ))}</tbody>
          </table>
        </div>
        {isLab && <Button className="w-fit" onClick={() => save({ okrs: s.okrs })}><Save /> Guardar objectivos</Button>}
      </Card>
      <Card className="grid gap-4 p-6">
        <h3 className="font-display text-lg font-bold">Decisões pendentes (D-1 a D-11 e fronteiras)</h3>
        <ul className="grid gap-2">{s.pendingDecisions.map((d, i) => (
          <li key={d.key} className="flex flex-wrap items-center gap-2">
            <Checkbox id={`pd-${d.key}`} checked={d.done} onCheckedChange={(x) => { const pd = [...s.pendingDecisions]; pd[i] = { ...d, done: x }; setS({ ...s, pendingDecisions: pd }); }} label={<><span className="font-mono">{d.key}</span> {d.title}</>} />
            <Input aria-label={`Prazo de ${d.key}`} type="date" value={d.dueDate.slice(0, 10)} onChange={(e) => { const pd = [...s.pendingDecisions]; pd[i] = { ...d, dueDate: new Date(e.target.value).toISOString() }; setS({ ...s, pendingDecisions: pd }); }} className="ml-auto h-9 w-40" />
          </li>
        ))}</ul>
        <Button className="w-fit" onClick={() => save({ pendingDecisions: s.pendingDecisions })}><Save /> {t("actions.save")}</Button>
      </Card>
      <Card className="grid gap-4 p-6">
        <h3 className="font-display text-lg font-bold">Listas configuráveis</h3>
        {(["tisAreas", "sectors", "themes"] as const).map((k) => <Field key={k} id={`ls-${k}`} label={{ tisAreas: "Direcções e áreas da TIS", sectors: "Sectores", themes: "Temas" }[k]} hint="Um por linha."><Textarea rows={4} value={s[k].join("\n")} onChange={(e) => setS({ ...s, [k]: e.target.value.split("\n").map((x) => x.trim()).filter(Boolean) })} /></Field>)}
        <Button className="w-fit" onClick={() => save({ tisAreas: s.tisAreas, sectors: s.sectors, themes: s.themes })}><Save /> {t("actions.save")}</Button>
      </Card>
      <Card className="grid gap-4 p-6">
        <h3 className="font-display text-lg font-bold">Valores financeiros da Incubadora {!isInc && <Tag className="ml-2">Só o gestor da Incubadora edita</Tag>}</h3>
        <Field id="fin-env" label="Envelope das coortes"><Input disabled={!isInc} value={s.incubationFinancials.cohortEnvelope} onChange={(e) => setS({ ...s, incubationFinancials: { ...s.incubationFinancials, cohortEnvelope: e.target.value } })} /></Field>
        <Field id="fin-notes" label="Notas"><Textarea disabled={!isInc} value={s.incubationFinancials.notes} onChange={(e) => setS({ ...s, incubationFinancials: { ...s.incubationFinancials, notes: e.target.value } })} /></Field>
        {isInc && <Button className="w-fit" onClick={() => save({ incubationFinancials: s.incubationFinancials })}><Save /> {t("actions.save")}</Button>}
      </Card>
    </div>
  );
}

/** Integrações activáveis (P13): Microsoft Teams, Jira e Confluence. */
function IntegrationsForm() {
  const { data } = useQuery("getSettings");
  const [i, setI] = React.useState<Settings["integrations"] | null>(null);
  React.useEffect(() => { if (data) setI(data.integrations); }, [data]);
  if (!i) return <ListSkeleton />;
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="grid content-start gap-4 p-6">
        <Switch id="int-teams" checked={i.teams.enabled} onCheckedChange={(x) => setI({ ...i, teams: { ...i.teams, enabled: x } })} label="Microsoft Teams" description="Notificações a colaboradores e gestores (webhook ou Microsoft Graph)." />
        <Field id="int-teams-url" label="Webhook de entrada" hint="Em produção, guardado como variável de ambiente."><Input type="url" value={i.teams.webhookUrl} onChange={(e) => setI({ ...i, teams: { ...i.teams, webhookUrl: e.target.value } })} placeholder="https://…webhook.office.com/…" /></Field>
      </Card>
      <Card className="grid content-start gap-4 p-6">
        <Switch id="int-jira" checked={i.jira.enabled} onCheckedChange={(x) => setI({ ...i, jira: { ...i.jira, enabled: x } })} label="Jira" description="A ficha do projecto mostra o estado das tarefas." />
        <Field id="int-jira-url" label="Endereço"><Input value={i.jira.baseUrl} onChange={(e) => setI({ ...i, jira: { ...i.jira, baseUrl: e.target.value } })} /></Field>
        <Field id="int-jira-p" label="Projecto"><Input value={i.jira.project} onChange={(e) => setI({ ...i, jira: { ...i.jira, project: e.target.value } })} /></Field>
      </Card>
      <Card className="grid content-start gap-4 p-6">
        <Switch id="int-conf" checked={i.confluence.enabled} onCheckedChange={(x) => setI({ ...i, confluence: { ...i.confluence, enabled: x } })} label="Confluence" description="Ligação ao espaço e data da última actualização." />
        <Field id="int-conf-url" label="Endereço"><Input value={i.confluence.baseUrl} onChange={(e) => setI({ ...i, confluence: { ...i.confluence, baseUrl: e.target.value } })} /></Field>
        <Field id="int-conf-s" label="Espaço"><Input value={i.confluence.space} onChange={(e) => setI({ ...i, confluence: { ...i.confluence, space: e.target.value } })} /></Field>
      </Card>
      <p className="text-sm text-fg-muted md:col-span-3">As chaves de API (JIRA_API_TOKEN, CONFLUENCE_API_TOKEN, credenciais do Graph) vivem só em variáveis de ambiente do servidor. O strateegia liga por URL até haver API.</p>
      <Button className="w-fit" onClick={() => run(() => mutate("saveSettings", { integrations: i }), "Integrações guardadas.")}><Save /> {t("actions.save")}</Button>
    </div>
  );
}

function AuditLog() {
  const { data = [], loading } = useQuery("listAudit");
  if (loading) return <ListSkeleton />;
  return (
    <Card className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-sm">
        <thead className="bg-bg text-left text-xs uppercase tracking-wider text-fg-subtle"><tr>{["Quando", "Quem", "Acção", "Entidade", "Antes → depois"].map((h) => <th key={h} className="px-3 py-3 font-medium">{h}</th>)}</tr></thead>
        <tbody>{data.map((a) => (
          <tr key={a.id} className="border-t border-line align-top">
            <td className="whitespace-nowrap px-3 py-2 text-fg-muted">{fmtDateTime(a.at)}</td>
            <td className="px-3 py-2">{a.userName}</td>
            <td className="px-3 py-2 font-mono text-xs">{a.action}</td>
            <td className="px-3 py-2 font-mono text-xs">{a.entity}{a.entityId ? `/${a.entityId}` : ""}</td>
            <td className="max-w-md truncate px-3 py-2 font-mono text-[11px] text-fg-subtle" title={JSON.stringify({ before: a.before, after: a.after })}>{a.before ? JSON.stringify(a.before) : "—"} → {a.after ? JSON.stringify(a.after) : "—"}</td>
          </tr>
        ))}</tbody>
      </table>
    </Card>
  );
}

function Outbox() {
  const { data = [], loading } = useQuery("listOutbox");
  if (loading) return <ListSkeleton />;
  if (!data.length) return <EmptyState title="Caixa de saída vazia" hint="Emails e mensagens do Teams gerados nesta sessão aparecem aqui antes de o worker os enviar." />;
  return (
    <Card className="divide-y divide-line">
      {data.map((o) => <div key={o.id} className="grid gap-1 p-4 text-sm"><p className="flex flex-wrap items-center gap-2"><Tag tone={o.channel === "TEAMS" ? "ai" : "brand"}>{o.channel}</Tag><span className="text-fg-subtle">{o.to}</span><span className="ml-auto text-xs text-fg-subtle">{fmtDateTime(o.at)}</span><Tag tone={o.status === "ENVIADO" ? "ok" : o.status === "FALHOU" ? "danger" : "warn"}>{o.status}</Tag></p><p className="font-medium">{o.subject}</p><p className="line-clamp-2 text-fg-muted">{o.body}</p></div>)}
    </Card>
  );
}
