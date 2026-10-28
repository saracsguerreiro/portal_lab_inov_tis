// Camada própria de IA (secção 12). Fala com qualquer endpoint compatível com a API da
// OpenAI (AI_BASE_URL, AI_API_KEY, AI_MODEL) ou usa o fornecedor de teste (mock).
// Regras: a IA recomenda e nunca decide; pedidos sem qualquer dado pessoal do autor.
import type { AiAnalysis, AiCriterionScore, CriteriaSet, Idea, WorkLine } from "@/lib/domain/types";
import { AI_JSON_SCHEMA_HINT, AiResponseSchema, type AiResponse } from "./schema";

/** Campos do formulário que identificam a pessoa e nunca vão para a IA. */
const IDENTITY_FIELDS = new Set(["submitAs", "organization", "notifyEmail", "name", "email", "phone", "team"]);

export interface AiInput {
  ideaKind: CriteriaSet["ideaKind"];
  type: Idea["type"];
  title: string;
  summary: string;
  answers: Record<string, unknown>;
  criteria: CriteriaSet;
  candidates: { id: string; number: string; title: string; summary: string }[];
}

/** Constrói a entrada da IA a partir de uma ideia, retirando a identidade do autor. */
export function buildAiInput(idea: Idea, criteria: CriteriaSet, others: Idea[]): AiInput {
  const answers: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(idea.answers ?? {})) {
    if (IDENTITY_FIELDS.has(k)) {
      // A equipa (competências) é útil para avaliar, mas só sem nomes.
      if (k === "team" && typeof v === "string") answers.teamSkills = redactPersonalData(v);
      continue;
    }
    answers[k] = typeof v === "string" ? redactPersonalData(v) : v;
  }
  const candidates = others
    .filter((o) => o.id !== idea.id && o.status !== "RETIRADA")
    .map((o) => ({ o, s: textSimilarity(`${idea.title} ${idea.summary}`, `${o.title} ${o.summary}`) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, 8)
    .map(({ o }) => ({ id: o.id, number: o.number, title: o.title, summary: o.summary }));
  return { ideaKind: criteria.ideaKind, type: idea.type, title: idea.title, summary: idea.summary, answers, criteria, candidates };
}

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
const PHONE_RE = /(\+?244)?[\s-]?9\d{2}[\s-]?\d{3}[\s-]?\d{3}/g;
export function redactPersonalData(s: string) {
  return s.replace(EMAIL_RE, "[email]").replace(PHONE_RE, "[telefone]");
}

export function buildMessages(input: AiInput) {
  const crit = input.criteria.criteria
    .map((c) => `- ${c.key} «${c.name}» (peso ${c.weight}%): ${c.description}. 1 = ${c.scale1}; 5 = ${c.scale5}.`)
    .join("\n");
  const system = [
    "És o analista de ideias do Ecossistema de Inovação da TIS (Luanda, Angola).",
    "Recomendas, nunca decides. Não rejeitas nem aprovas ideias. Respondes só em JSON válido.",
    `Contexto da TIS: ${input.criteria.context}`,
    `Critérios (versão ${input.criteria.version}):\n${crit}`,
    `Responde exactamente com este formato:\n${AI_JSON_SCHEMA_HINT}`,
  ].join("\n\n");
  const user = JSON.stringify({
    tipo: input.type,
    titulo: input.title,
    resumo: input.summary,
    respostas: input.answers,
    candidatosSemelhantes: input.candidates,
  });
  return [
    { role: "system" as const, content: system },
    { role: "user" as const, content: user },
  ];
}

export interface AiProvider {
  name: string;
  complete(input: AiInput): Promise<unknown>;
}

export const openAiCompatibleProvider = (cfg: { baseUrl: string; apiKey?: string; model: string; timeoutMs?: number }): AiProvider => ({
  name: `openai-compatible:${cfg.model}`,
  async complete(input) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), cfg.timeoutMs ?? 60_000);
    try {
      const res = await fetch(`${cfg.baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        signal: ctrl.signal,
        headers: { "Content-Type": "application/json", ...(cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {}) },
        body: JSON.stringify({
          model: cfg.model,
          temperature: 0.2,
          response_format: { type: "json_object" },
          messages: buildMessages(input),
        }),
      });
      if (!res.ok) throw new Error(`IA respondeu ${res.status}`);
      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const content = data.choices?.[0]?.message?.content ?? "";
      return JSON.parse(content);
    } finally {
      clearTimeout(timer);
    }
  },
});

export function getProvider(): AiProvider {
  const env = typeof process !== "undefined" ? process.env : ({} as NodeJS.ProcessEnv);
  if (env.AI_BASE_URL && env.AI_MODEL) {
    return openAiCompatibleProvider({ baseUrl: env.AI_BASE_URL, apiKey: env.AI_API_KEY, model: env.AI_MODEL });
  }
  return mockProvider;
}

/** Valida a resposta e transforma-a numa AiAnalysis. A pontuação total é recalculada com os pesos. */
export function toAnalysis(raw: unknown, input: AiInput, ideaId: string, provider: string, now: string): Omit<AiAnalysis, "id"> {
  const parsed: AiResponse = AiResponseSchema.parse(raw);
  const byKey = new Map(parsed.criteria.map((c) => [c.key, c]));
  const scores: AiCriterionScore[] = input.criteria.criteria.map((c) => {
    const got = byKey.get(c.key);
    if (!got) throw new Error(`Critério em falta na resposta da IA: ${c.key}`);
    return { key: c.key, name: c.name, weight: c.weight, score: got.score, justification: got.justification };
  });
  const allowed = new Map(input.candidates.map((c) => [c.id, c]));
  return {
    ideaId,
    criteriaSetId: input.criteria.id,
    criteriaVersion: input.criteria.version,
    status: "CONCLUIDA",
    scores,
    total: weightedTotal(scores),
    routing: parsed.routing,
    routingReason: parsed.routingReason,
    classification: parsed.classification,
    similar: parsed.similar
      .filter((s) => allowed.has(s.ideaId))
      .map((s) => ({ ideaId: s.ideaId, number: allowed.get(s.ideaId)!.number, title: allowed.get(s.ideaId)!.title, similarity: Math.round(s.similarity) })),
    risks: parsed.risks,
    completeness: parsed.completeness,
    summary: parsed.summary,
    feedbackDraft: parsed.feedbackDraft,
    provider,
    createdAt: now,
  };
}

export const weightedTotal = (scores: { score: number; weight: number }[]) => {
  const w = scores.reduce((n, s) => n + s.weight, 0) || 1;
  return Math.round(scores.reduce((n, s) => n + ((s.score - 1) / 4) * s.weight, 0) * (100 / w));
};

/** Corre a análise. Nunca lança: em falha devolve uma análise com estado FALHOU. */
export async function analyze(input: AiInput, ideaId: string, now: string, provider = getProvider()): Promise<Omit<AiAnalysis, "id">> {
  try {
    const raw = await provider.complete(input);
    return toAnalysis(raw, input, ideaId, provider.name, now);
  } catch (e) {
    return {
      ideaId,
      criteriaSetId: input.criteria.id,
      criteriaVersion: input.criteria.version,
      status: "FALHOU",
      scores: [],
      total: 0,
      similar: [],
      risks: [],
      completeness: { weakFields: [], questions: [] },
      summary: "",
      feedbackDraft: "",
      error: e instanceof Error ? e.message : String(e),
      provider: provider.name,
      createdAt: now,
    };
  }
}

// ----------------------------------------------------------- Fornecedor de teste

const tokens = (s: string) =>
  new Set(
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 3),
  );
export function textSimilarity(a: string, b: string) {
  const A = tokens(a), B = tokens(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  A.forEach((w) => B.has(w) && inter++);
  return inter / Math.sqrt(A.size * B.size);
}

const str = (v: unknown) => (typeof v === "string" ? v : Array.isArray(v) ? v.join(", ") : v == null ? "" : String(v));
const lenScore = (s: string, good = 280) => Math.max(1, Math.min(5, Math.round((s.length / good) * 4) + 1));
const clamp = (n: number) => Math.max(1, Math.min(5, Math.round(n)));

function guessLine(text: string): WorkLine | null {
  const t = text.toLowerCase();
  if (/\b(ia|modelo|llm|intelig|chatbot|machine|dados)\b/.test(t)) return "L1";
  if (/\b(processo|agil|equipa|forma de trabalhar|reuni|cultura)\b/.test(t)) return "L2";
  if (/\b(portal|web|site|app|plataforma|api)\b/.test(t)) return "L3";
  if (/\b(prot[oó]tipo|piloto|mvp|demo)\b/.test(t)) return "L4";
  return null;
}

export const mockProvider: AiProvider = {
  name: "mock",
  async complete(input) {
    return mockAnalyze(input);
  },
};

export function mockAnalyze(input: AiInput): AiResponse {
  const a = input.answers;
  const all = [input.title, input.summary, ...Object.values(a).map(str)].join(" ");
  const risks: AiResponse["risks"] = [];
  if (/\[email\]|\[telefone\]/.test(all)) risks.push({ kind: "DADOS_PESSOAIS", detail: "O texto incluía contactos pessoais (foram ocultados antes da análise)." });
  if (/\bcliente[s]?\s+(?:[A-Z]|banco|da|do)\b|\bNIF\b|\bconta n\.?º/i.test(all)) risks.push({ kind: "DADOS_CLIENTES", detail: "Possível referência a um cliente identificado." });
  if (/confidencial|board|M&A|aquisi[cç][aã]o/i.test(all)) risks.push({ kind: "CONFIDENCIAL", detail: "Menciona informação possivelmente confidencial." });

  const scoreFor = (key: string): [number, string] => {
    switch (key) {
      case "alinhamento":
      case "alinhamento_estrategico": {
        const hit = /tecnolog|mercad|digital|ia|cloud|seguran|dados|cliente/i.test(all);
        return [hit ? 4 : 3, hit ? "Liga-se aos pilares de Tecnologia e Mercados da TIS." : "Ligação à estratégia pouco explícita."];
      }
      case "problema_mercado": {
        const s = lenScore(str(a.problem));
        return [s, s >= 4 ? "Problema claro, com destinatário identificado." : "O problema precisa de ser mais concreto e quantificado."];
      }
      case "maturidade": {
        const m: Record<string, number> = { IDEIA: 1, PROTOTIPO: 3, TESTE: 4, CLIENTES: 5 };
        const s = m[str(a.stage)] ?? 2;
        return [s, `Fase declarada: ${str(a.stage) || "não indicada"}.`];
      }
      case "equipa": {
        const s = a.teamSkills ? lenScore(str(a.teamSkills), 160) : 2;
        return [s, s >= 4 ? "Equipa com competências complementares." : "Pouca informação sobre a equipa."];
      }
      case "modelo_negocio": {
        const s = a.businessModel ? lenScore(str(a.businessModel), 200) : 1;
        return [s, s >= 3 ? "Modelo de receita descrito." : "Modelo de negócio em falta ou vago."];
      }
      case "diferenciacao": {
        const s = lenScore(str(a.differentiation), 200);
        return [s, s >= 4 ? "Diferenciação bem argumentada." : "Diferenciação face às alternativas pouco clara."];
      }
      case "impacto": {
        const n = Array.isArray(a.impact) ? a.impact.length : 1;
        return [clamp(n + 1), `Impacto esperado em ${n} dimensão(ões).`];
      }
      case "viabilidade":
        return [lenScore(str(a.proposal), 240) >= 3 ? 4 : 3, "Parece praticável com os meios da TIS."];
      case "inovacao":
        return [/autom|ia|digital|novo|inédit/i.test(all) ? 4 : 2, "Grau de novidade estimado pelo conteúdo da proposta."];
      case "tempo_custo":
        return [/simples|rápid|pequen|sem custo/i.test(all) ? 5 : 3, "Esforço estimado a partir da proposta (mais baixo = mais pontos)."];
      case "gut": {
        const g = { BAIXA: 1, MEDIA: 3, ALTA: 5 }[str(a.gravity)] ?? 3;
        const u = { BAIXA: 1, MEDIA: 3, ALTA: 5 }[str(a.urgency)] ?? 3;
        const t = { RARAMENTE: 1, MENSALMENTE: 2, SEMANALMENTE: 4, DIARIAMENTE: 5 }[str(a.frequency)] ?? 3;
        const gut = g * u * t;
        return [clamp((gut / 125) * 4 + 1), `G×U×T = ${g}×${u}×${t} = ${gut} (máx. 125).`];
      }
      default:
        return [3, "Avaliação neutra (critério sem regra no fornecedor de teste)."];
    }
  };

  const criteria = input.criteria.criteria.map((c) => {
    const [score, justification] = scoreFor(c.key);
    return { key: c.key, score, justification };
  });
  const scored = criteria.map((c) => ({ score: c.score, weight: input.criteria.criteria.find((x) => x.key === c.key)!.weight }));

  const isImprovement = input.ideaKind === "MELHORIA";
  const archHint = /arquitectura|standard|integra[cç][aã]o de sistemas/i.test(all);
  const routing = archHint ? "DIGITAL_OFFICE" : isImprovement ? "LAB" : str(a.stage) === "CLIENTES" || str(a.stage) === "TESTE" ? "INCUBADORA" : input.type === "NEGOCIO_COLABORADOR" ? "LAB" : "INCUBADORA";
  const routingReason =
    routing === "DIGITAL_OFFICE"
      ? "O pedido é sobretudo de arquitectura e standards, que são do Digital Office."
      : routing === "LAB"
        ? "Precisa de validação técnica (PoC ou MVP) antes de ser um negócio."
        : "Tem sinais de mercado; a pergunta agora é se é um negócio.";

  const similar = input.candidates
    .map((c) => ({ ideaId: c.id, similarity: Math.round(textSimilarity(`${input.title} ${input.summary}`, `${c.title} ${c.summary}`) * 100) }))
    .filter((s) => s.similarity >= 15)
    .sort((x, y) => y.similarity - x.similarity)
    .slice(0, 3);

  const weak: string[] = [];
  const questions: string[] = [];
  if (str(a.problem).length < 120) { weak.push("Problema"); questions.push("Quem sente este problema e com que frequência?"); }
  if (!isImprovement && !a.businessModel) { weak.push("Modelo de negócio"); questions.push("Como pensa gerar receita?"); }
  if (!isImprovement && !a.teamSkills) { weak.push("Equipa"); questions.push("Que competências tem a equipa hoje?"); }
  if (isImprovement && !a.impactEstimate) { weak.push("Estimativa do impacto"); questions.push("Consegue estimar o tempo ou custo poupado?"); }

  const total = Math.round(scored.reduce((n, s) => n + ((s.score - 1) / 4) * s.weight, 0));
  const line = guessLine(all);
  return {
    criteria,
    total,
    routing,
    routingReason,
    classification: {
      theme: line === "L1" ? "Inteligência artificial" : line === "L3" ? "Plataformas digitais" : isImprovement ? "Eficiência operacional" : "Novo negócio digital",
      sector: str(a.sector) || (isImprovement ? "Interno TIS" : "Outro"),
      workLine: line,
      category: str(a.category) || (isImprovement ? "Processos" : "Produto"),
    },
    similar,
    risks,
    completeness: { weakFields: weak, questions },
    summary: `${input.title}: ${input.summary} ${weak.length ? `Pontos fracos: ${weak.join(", ").toLowerCase()}.` : "Submissão completa."} Recomendação: ${routing === "LAB" ? "Laboratório" : routing === "INCUBADORA" ? "Incubadora" : "Digital Office"}.`,
    feedbackDraft: `Olá,\n\nObrigado por partilhar a ideia «${input.title}». A nossa equipa leu a submissão com atenção.${
      questions.length ? `\n\nPara avançarmos, ajudava-nos saber:\n${questions.map((q) => `• ${q}`).join("\n")}` : "\n\nA submissão está completa e segue para avaliação."
    }\n\nCom os melhores cumprimentos,\nEquipa do Ecossistema de Inovação TIS`,
  };
}
