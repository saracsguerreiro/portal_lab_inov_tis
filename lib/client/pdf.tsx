"use client";
// Geração de PDF no browser (@react-pdf/renderer), carregada só quando se pede um PDF:
// comprovativo de submissão (P14) e exportação do painel (P30).
import { Document, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";
import type { ResultOf } from "@/lib/services";
import { L } from "@/lib/domain/labels";

const c = { ink: "#0c1220", muted: "#4a5468", line: "#dde2ea", brand: "#036ef2", lab: "#0b7a80", inc: "#c4004f", ai: "#7424d6", soft: "#f0f2f7" };
const s = StyleSheet.create({
  page: { padding: 40, fontSize: 10, color: c.ink, fontFamily: "Helvetica" },
  brand: { fontSize: 9, color: c.muted, marginBottom: 18, textTransform: "uppercase", letterSpacing: 1 },
  h1: { fontSize: 22, fontFamily: "Helvetica-Bold", marginBottom: 6 },
  h2: { fontSize: 13, fontFamily: "Helvetica-Bold", marginTop: 18, marginBottom: 6 },
  lead: { fontSize: 11, color: c.muted, marginBottom: 6 },
  muted: { color: c.muted },
  box: { borderWidth: 1, borderColor: c.line, borderRadius: 6, padding: 12, marginTop: 10 },
  code: { fontSize: 24, fontFamily: "Courier-Bold", letterSpacing: 3, color: c.brand, marginVertical: 8 },
  row: { flexDirection: "row", gap: 8 },
  kpi: { flex: 1, borderWidth: 1, borderColor: c.line, borderRadius: 6, padding: 10 },
  kpiV: { fontSize: 18, fontFamily: "Helvetica-Bold" },
  barTrack: { height: 8, backgroundColor: c.soft, borderRadius: 4, flex: 1 },
  footer: { position: "absolute", bottom: 24, left: 40, right: 40, fontSize: 8, color: c.muted, flexDirection: "row", justifyContent: "space-between" },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: c.line, paddingVertical: 4 },
});

async function save(doc: React.ReactElement, filename: string) {
  const blob = await pdf(doc as never).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

const date = (iso: string) => new Intl.DateTimeFormat("pt-PT", { dateStyle: "long", timeStyle: "short", timeZone: "Africa/Luanda" }).format(new Date(iso));

/** Comprovativo da submissão anónima (sem dados pessoais). */
export function downloadReceipt(r: { number: string; trackingCode?: string; title: string; at: string; deadline: number }) {
  return save(
    <Document title={`Comprovativo ${r.number}`}>
      <Page size="A4" style={s.page}>
        <Text style={s.brand}>Ecossistema de Inovação TIS · Comprovativo de submissão</Text>
        <Text style={s.h1}>A sua ideia foi submetida</Text>
        <Text style={s.lead}>«{r.title}»</Text>
        <View style={s.box}>
          <Text style={s.muted}>Número da ideia</Text>
          <Text style={{ fontSize: 14, fontFamily: "Helvetica-Bold" }}>{r.number}</Text>
          <Text style={[s.muted, { marginTop: 8 }]}>Data</Text>
          <Text>{date(r.at)}</Text>
        </View>
        {r.trackingCode && (
          <View style={[s.box, { borderColor: c.brand, borderWidth: 2 }]}>
            <Text style={s.muted}>Código de acompanhamento</Text>
            <Text style={s.code}>{r.trackingCode}</Text>
            <Text>Guarde este código. Sem ele não é possível consultar a ideia. Consulte o estado na página «Consultar estado».</Text>
          </View>
        )}
        <Text style={s.h2}>O que acontece a seguir</Text>
        <Text>Recebida → Em análise → (Informação pedida) → Em avaliação → Decisão.</Text>
        <Text style={{ marginTop: 6 }}>Primeiro retorno em até {r.deadline} dias úteis.</Text>
        <View style={s.footer}><Text>Documento sem dados pessoais.</Text><Text>Gerado a {date(new Date().toISOString())}</Text></View>
      </Page>
    </Document>,
    `comprovativo-${r.number}.pdf`,
  );
}

type Dash = ResultOf<"getDashboard">;
const pct = (n: number | null) => (n == null ? "—" : `${Math.round(n * 100)} %`);

function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <View style={[s.row, { alignItems: "center", marginBottom: 4 }]}>
      <Text style={{ width: 150 }}>{label}</Text>
      <View style={s.barTrack}><View style={{ height: 8, borderRadius: 4, backgroundColor: color, width: `${max ? (value / max) * 100 : 0}%` }} /></View>
      <Text style={{ width: 40, textAlign: "right" }}>{value}</Text>
    </View>
  );
}

/** Exportação do painel (P30, P16). Respeita o perfil: o bloco 7 só sai se o utilizador o vê. */
export function downloadDashboard(d: Dash, readings: Record<string, string>) {
  const maxFunnel = Math.max(1, ...d.funnel.map((f) => f.value));
  return save(
    <Document title="Painel de performance">
      <Page size="A4" style={s.page}>
        <Text style={s.brand}>Ecossistema de Inovação TIS · Painel de performance</Text>
        <Text style={s.h1}>Painel de performance</Text>
        <Text style={s.lead}>Período: {d.filters.from.slice(0, 10)} a {d.filters.to.slice(0, 10)} · Área: {d.filters.area ?? "Ambas"} · Linha: {d.filters.workLine ?? "Todas"}</Text>

        <Text style={s.h2}>1. Números-chave</Text>
        <Text style={s.muted}>{readings.kpis}</Text>
        <View style={[s.row, { marginTop: 6 }]}>
          {[
            ["Ideias recebidas", d.kpis.ideasTotal],
            ["Taxa de selecção", pct(d.kpis.selectionRate)],
            ["1.º retorno (dias úteis)", `${d.kpis.avgFirstResponseDays} / ${d.kpis.deadlineDays}`],
            ["Projectos Lab", d.kpis.activeLab],
            ["Ventures", d.kpis.activeVentures],
            ["Em uso no negócio", d.kpis.inUse],
          ].map(([l, v]) => <View key={String(l)} style={s.kpi}><Text style={s.muted}>{l}</Text><Text style={s.kpiV}>{String(v)}</Text></View>)}
        </View>
        <Text style={{ marginTop: 4 }}>Por tipo: externas {d.kpis.ideasByType.EXTERNA} · melhoria {d.kpis.ideasByType.MELHORIA} · negócio {d.kpis.ideasByType.NEGOCIO_COLABORADOR}</Text>

        <Text style={s.h2}>2. Funil</Text>
        <Text style={s.muted}>{readings.funnel}</Text>
        <View style={{ marginTop: 6 }}>{d.funnel.map((f) => <Bar key={f.key} label={`${f.label}${f.rate != null ? ` (${f.rate} %)` : ""}`} value={f.value} max={maxFunnel} color={c.brand} />)}</View>
        <Text>Passagens Lab → Incubadora: {d.labTransfers}</Text>

        <Text style={s.h2}>3. Objectivos 2027 (Lab)</Text>
        {d.okrs.map((o) => (
          <View key={o.key} style={s.tr}>
            <Text style={{ width: 200 }}>{o.key} · {o.title}</Text>
            <Text style={{ flex: 1 }}>Planeado: {o.planned.join(" / ")} {o.unit}</Text>
            <Text style={{ flex: 1 }}>Real: {o.actual.join(" / ")} {o.unit}</Text>
          </View>
        ))}

        <Text style={s.h2}>4. Análise da IA</Text>
        <Text style={s.muted}>{readings.ai}</Text>
        <View style={{ marginTop: 6 }}>{d.ai.buckets.map((b) => <Bar key={b.range} label={`Pontuação ${b.range}`} value={b.count} max={Math.max(1, ...d.ai.buckets.map((x) => x.count))} color={c.ai} />)}</View>
        <Text>Concordância IA / equipa: {pct(d.ai.agreementRate)} (amostra {d.ai.sample}) · Diferença média gestor − IA: {d.ai.avgDiff ?? "—"} pontos</Text>
        <View style={s.footer} fixed><Text>Confidencial · uso interno</Text><Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} /></View>
      </Page>
      <Page size="A4" style={s.page}>
        <Text style={s.h2}>5. Participação</Text>
        <Text style={s.muted}>{readings.participation}</Text>
        <View style={{ marginTop: 6 }}>{d.participation.byTisArea.map((a) => <Bar key={a.name} label={a.name} value={a.value} max={Math.max(1, ...d.participation.byTisArea.map((x) => x.value))} color={c.lab} />)}</View>
        <Text>Colaboradores que participaram: {d.participation.collaborators} · Ideias anónimas de colaboradores: {d.participation.anonymousCollaboratorIdeas}</Text>
        <Text>Externos por tipo: {d.participation.externalsByType.map((x) => `${L.extType(x.type)} ${x.value}`).join(" · ")}</Text>
        <Text>Desafios: {d.participation.challenges.map((ch) => `${ch.title} (${ch.participations})`).join(" · ")}</Text>

        <Text style={s.h2}>6. Decisões e alertas</Text>
        {d.pendingDecisions.filter((p) => !p.done).map((p) => <View key={p.key} style={s.tr}><Text style={{ width: 50 }}>{p.key}</Text><Text style={{ flex: 1 }}>{p.title}</Text><Text>{p.dueDate.slice(0, 10)}</Text></View>)}
        <Text style={{ marginTop: 8, fontFamily: "Helvetica-Bold" }}>Alertas ({d.alerts.length})</Text>
        {d.alerts.slice(0, 20).map((a, i) => <Text key={i}>• {a.text}</Text>)}

        {d.incubator && (
          <>
            <Text style={s.h2}>7. Incubadora</Text>
            <Text style={s.muted}>{readings.incubator}</Text>
            <Text>Por trilha: {d.incubator.byTrack.map((x) => `${x.track} ${x.value}`).join(" · ")}</Text>
            <Text>Por etapa: {d.incubator.byStage.map((x) => `${L.stage(x.stage)} ${x.value}`).join(" · ")}</Text>
            <Text>Saídas: {d.incubator.exits.map((x) => `${L.exit(x.kind)} ${x.value}`).join(" · ")}</Text>
            <Text>Coortes: {d.incubator.cohorts.map((x) => x.name).join(", ")}</Text>
            <Text>Valores financeiros: {d.incubator.financials.cohortEnvelope}</Text>
          </>
        )}
        <View style={s.footer} fixed><Text>Gerado a {date(d.generatedAt)}</Text><Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} /></View>
      </Page>
    </Document>,
    `painel-${d.filters.from.slice(0, 10)}-${d.filters.to.slice(0, 10)}.pdf`,
  );
}
