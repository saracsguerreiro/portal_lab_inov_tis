// Esquema fixo da resposta da IA (secção 12, regra 6). Tudo é validado antes de ser guardado.
import { z } from "zod";

export const AiResponseSchema = z.object({
  criteria: z
    .array(
      z.object({
        key: z.string().min(1),
        score: z.number().int().min(1).max(5),
        justification: z.string().min(1).max(400),
      }),
    )
    .min(1),
  total: z.number().min(0).max(100),
  routing: z.enum(["LAB", "INCUBADORA", "DIGITAL_OFFICE"]),
  routingReason: z.string().min(1).max(300),
  classification: z.object({
    theme: z.string().min(1).max(80),
    sector: z.string().min(1).max(80),
    workLine: z.enum(["L1", "L2", "L3", "L4"]).nullable(),
    category: z.string().min(1).max(80),
  }),
  similar: z
    .array(z.object({ ideaId: z.string(), similarity: z.number().min(0).max(100) }))
    .max(3),
  risks: z.array(
    z.object({ kind: z.enum(["DADOS_PESSOAIS", "DADOS_CLIENTES", "CONFIDENCIAL"]), detail: z.string().max(300) }),
  ),
  completeness: z.object({ weakFields: z.array(z.string()), questions: z.array(z.string()).max(5) }),
  summary: z.string().min(1).max(600),
  feedbackDraft: z.string().min(1).max(2000),
});

export type AiResponse = z.infer<typeof AiResponseSchema>;

/** Esquema JSON enviado ao modelo (response_format), espelho do esquema Zod. */
export const AI_JSON_SCHEMA_HINT = `{
  "criteria": [{ "key": string, "score": 1-5 (inteiro), "justification": string curta }],
  "total": número 0-100 (média ponderada pelos pesos),
  "routing": "LAB" | "INCUBADORA" | "DIGITAL_OFFICE",
  "routingReason": uma frase,
  "classification": { "theme": string, "sector": string, "workLine": "L1"|"L2"|"L3"|"L4"|null, "category": string },
  "similar": [{ "ideaId": string, "similarity": 0-100 }] (no máximo 3, só dos candidatos dados),
  "risks": [{ "kind": "DADOS_PESSOAIS"|"DADOS_CLIENTES"|"CONFIDENCIAL", "detail": string }],
  "completeness": { "weakFields": [string], "questions": [string] },
  "summary": resumo em 3 linhas,
  "feedbackDraft": rascunho de mensagem ao criador, cordial, em português
}`;
