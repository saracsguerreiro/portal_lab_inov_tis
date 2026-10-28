// Esquemas Zod dos 7 formulários (secção 11), partilhados entre o browser e o servidor.
import { z } from "zod";

const req = "Este campo é obrigatório.";
const text = (max?: number, min = 1) => {
  let s = z.string({ required_error: req }).trim().min(min, min > 1 ? `Escreva pelo menos ${min} caracteres.` : req);
  if (max) s = s.max(max, `No máximo ${max} caracteres.`);
  return s;
};
const multi = (values: readonly [string, ...string[]]) => z.array(z.enum(values)).min(1, "Escolha pelo menos uma opção.");
const mustAccept = (msg: string) => z.literal(true, { errorMap: () => ({ message: msg }) });

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_FILES = 3;
export const ACCEPTED_MIME = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-powerpoint",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export const AttachmentSchema = z.object({
  id: z.string(),
  name: z.string().max(200),
  mime: z.enum(ACCEPTED_MIME, { errorMap: () => ({ message: "Tipo de ficheiro não aceite." }) }),
  size: z.number().max(MAX_FILE_BYTES, "O ficheiro tem mais de 10 MB."),
  key: z.string(),
});
const attachments = z.array(AttachmentSchema).max(MAX_FILES, "Pode anexar até 3 ficheiros.").default([]);

// ------------------------------------------------------------- F1 Ideia externa

export const EXTERNAL_TYPES = ["STARTUP", "UNIVERSIDADE", "INDIVIDUAL", "OUTRA"] as const;
export const AUDIENCES = ["EMPRESAS", "SECTOR_PUBLICO", "CIDADAOS", "OUTRO"] as const;
export const STAGES = ["IDEIA", "PROTOTIPO", "TESTE", "CLIENTES"] as const;
export const LOOKING_FOR = ["PARCERIA", "CLIENTES", "TECNOLOGIA", "INVESTIMENTO", "MENTORIA", "OUTRO"] as const;

export const F1Step1 = z
  .object({
    submitAs: z.enum(["CONTA", "ANONIMO"]),
    profileType: z.enum(EXTERNAL_TYPES, { errorMap: () => ({ message: "Escolha o tipo de perfil." }) }),
    organization: z.string().trim().max(120).optional(),
    notifyEmail: z.union([z.literal(""), z.string().trim().email("Escreva um email válido.")]).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.submitAs === "CONTA" && v.profileType !== "INDIVIDUAL" && !v.organization)
      ctx.addIssue({ code: "custom", path: ["organization"], message: "Indique o nome da organização ou startup." });
  });

export const F1Step2 = z.object({
  title: text(80),
  summary: text(200),
  challengeId: z.string().optional().nullable(),
  problem: text(4000, 30),
  solution: text(4000, 30),
  audience: multi(AUDIENCES),
  sector: text(60),
  differentiation: text(3000, 20),
});

export const F1Step3 = z
  .object({
    stage: z.enum(STAGES, { errorMap: () => ({ message: "Escolha a fase actual." }) }),
    customers: z.coerce.number().int().min(0).optional(),
    businessModel: z.string().trim().max(3000).optional(),
    team: z.string().trim().max(2000).optional(),
    lookingFor: multi(LOOKING_FOR),
  });

export const F1Step4 = z.object({
  attachments,
  links: z.union([z.literal(""), z.string().trim().url("Escreva um endereço válido (https://…).")]).optional(),
  acceptTerms: mustAccept("Tem de aceitar os termos de submissão."),
  acceptPrivacy: mustAccept("Tem de aceitar a política de privacidade."),
  confirmNoThirdParty: mustAccept("Tem de confirmar que não inclui dados de terceiros."),
  captchaToken: z.string().optional(),
});

export const F1Schema = z
  .object({ ...F1Step2.shape, ...F1Step3.shape, ...F1Step4.shape })
  .and(F1Step1)
  .superRefine((v, ctx) => {
    if (v.stage === "CLIENTES" && (v.customers === undefined || Number.isNaN(v.customers)))
      ctx.addIssue({ code: "custom", path: ["customers"], message: "Indique quantos clientes ou utilizadores tem." });
    if (v.profileType === "STARTUP" && !v.team?.trim())
      ctx.addIssue({ code: "custom", path: ["team"], message: "Para startups, descreva a equipa." });
  });
export type F1Input = z.infer<typeof F1Schema>;

// ------------------------------------------------------------- F2 Ideia de melhoria

export const CATEGORIES = ["PROCESSOS", "FERRAMENTAS", "SERVICO_CLIENTE", "FORMA_TRABALHAR", "PESSOAS_CULTURA", "OUTRO"] as const;
export const FREQUENCIES = ["DIARIAMENTE", "SEMANALMENTE", "MENSALMENTE", "RARAMENTE"] as const;
export const AFFECTED = ["MINHA_EQUIPA", "OUTRAS_AREAS", "CLIENTES", "TODA_TIS"] as const;
export const IMPACTS = ["TEMPO", "CUSTOS", "QUALIDADE", "EXPERIENCIA_CLIENTE", "RISCO"] as const;
export const LEVELS = ["BAIXA", "MEDIA", "ALTA"] as const;

export const F2Step1 = z.object({
  kind: z.enum(["MELHORIA", "NEGOCIO"]),
  anonymous: z.boolean().default(false),
});
export const F2Step2 = z.object({
  title: text(80),
  category: z.enum(CATEGORIES, { errorMap: () => ({ message: "Escolha a categoria." }) }),
  affectedArea: text(80),
  problem: text(4000, 30),
  frequency: z.enum(FREQUENCIES, { errorMap: () => ({ message: "Escolha a frequência." }) }),
  affected: multi(AFFECTED),
});
export const F2Step3 = z.object({
  proposal: text(4000, 30),
  impact: multi(IMPACTS),
  impactEstimate: z.string().trim().max(160).optional(),
  urgency: z.enum(LEVELS, { errorMap: () => ({ message: "Escolha a urgência." }) }),
  gravity: z.enum(LEVELS, { errorMap: () => ({ message: "Escolha a gravidade." }) }),
  wantsToParticipate: z.boolean().default(false),
});
export const F2Step4 = z.object({
  attachments,
  confirmNoClientData: mustAccept("Tem de confirmar que não inclui dados de clientes."),
});
export const F2Schema = F2Step1.merge(F2Step2).merge(F2Step3).merge(F2Step4);
export type F2Input = z.infer<typeof F2Schema>;

// ------------------------------------------------------------- F3 Pedido de apoio

export const F3Schema = z.object({
  type: z.enum(["PROPOSTA", "PROTOTIPO", "FORMACAO", "ARQUITECTURA", "OUTRO"]),
  proposal: text(120),
  costCenter: text(40),
  description: text(3000, 20),
  dueDate: z.string().min(1, req).refine((d) => !Number.isNaN(Date.parse(d)), "Data inválida."),
  urgent: z.boolean().default(false),
  attachments,
});
export type F3Input = z.infer<typeof F3Schema>;

// ------------------------------------------------------------- F4 Conta externa

export const F4Schema = z
  .object({
    name: text(120),
    email: z.string().trim().email("Escreva um email válido."),
    password: z.string().min(10, "A palavra-passe precisa de pelo menos 10 caracteres."),
    confirmPassword: z.string(),
    profileType: z.enum(EXTERNAL_TYPES, { errorMap: () => ({ message: "Escolha o tipo de perfil." }) }),
    acceptTerms: mustAccept("Tem de aceitar os termos."),
    acceptPrivacy: mustAccept("Tem de aceitar a política de privacidade."),
  })
  .refine((v) => v.password === v.confirmPassword, { path: ["confirmPassword"], message: "As palavras-passe não coincidem." });
export type F4Input = z.infer<typeof F4Schema>;

// ------------------------------------------------------------- F5 Projecto ou venture

export const F5Schema = z
  .object({
    name: text(120),
    area: z.enum(["LAB", "INCUBADORA"]),
    track: z.enum(["INTERNA", "EXTERNA"]).nullable().optional(),
    workLine: z.enum(["L1", "L2", "L3", "L4"]).nullable().optional(),
    originIdeaId: z.string().nullable().optional(),
    visibility: z.enum(["PUBLICO", "INTERNO", "RESTRITO"]).default("INTERNO"),
    featured: z.boolean().default(false),
    cover: z.string().optional(),
    shortDescription: text(300),
    problem: text(4000),
    hypothesis: z.string().trim().max(3000).optional(),
    stage: z.string().min(1, req),
    sponsorId: z.string().min(1, "Escolha o patrocinador."),
    team: z.array(z.object({ name: z.string().min(1), role: z.enum(["RESPONSAVEL", "MEMBRO", "ROTATIVO", "CHAMPION"]), userId: z.string().nullable().optional() })).min(1, "Indique pelo menos uma pessoa."),
    mainMetric: z.string().trim().max(300).optional(),
    killMetric: z.string().trim().max(300).optional(),
    architectureValidatedAt: z.string().nullable().optional(),
    securityKitPhase: z.coerce.number().int().min(0).max(3),
    partnerIds: z.array(z.string()).default([]),
    links: z.object({ jira: z.string().optional(), confluence: z.string().optional(), strateegia: z.string().optional() }).default({}),
  })
  .superRefine((v, ctx) => {
    if (v.area === "INCUBADORA" && !v.track) ctx.addIssue({ code: "custom", path: ["track"], message: "Escolha a trilha." });
    if (v.area === "LAB" && !v.workLine) ctx.addIssue({ code: "custom", path: ["workLine"], message: "Escolha a linha de trabalho." });
    if (v.area === "LAB" && !v.hypothesis) ctx.addIssue({ code: "custom", path: ["hypothesis"], message: "Escreva a hipótese." });
    if (v.stage === "EXPERIMENTACAO" && (!v.mainMetric || !v.killMetric))
      ctx.addIssue({ code: "custom", path: ["killMetric"], message: "Em Experimentação, indique a métrica principal e a de abandono." });
    if (v.featured && v.visibility !== "PUBLICO") ctx.addIssue({ code: "custom", path: ["featured"], message: "Só projectos públicos podem ter destaque." });
  });
export type F5Input = z.infer<typeof F5Schema>;

// ------------------------------------------------------------- F6 Desafio

export const F6Schema = z
  .object({
    title: text(120),
    area: z.enum(["LAB", "INCUBADORA"]),
    audience: z.enum(["EXTERNOS", "COLABORADORES", "AMBOS"]),
    problem: text(3000),
    context: text(3000),
    lookingFor: text(3000),
    criteria: z.array(z.string().min(1)).min(1, "Indique pelo menos um critério."),
    opensAt: z.string().min(1, req),
    closesAt: z.string().min(1, req),
    benefits: text(1000),
    faq: z.array(z.object({ q: z.string().min(1), a: z.string().min(1) })).default([]),
    cover: z.string().optional(),
    visibility: z.enum(["PUBLICO", "INTERNO"]),
    contentStatus: z.enum(["RASCUNHO", "PUBLICADO", "ARQUIVADO"]),
    status: z.enum(["ABERTO", "EM_AVALIACAO", "FECHADO"]),
  })
  .refine((v) => Date.parse(v.closesAt) > Date.parse(v.opensAt), { path: ["closesAt"], message: "A data de fecho tem de ser depois da abertura." });
export type F6Input = z.infer<typeof F6Schema>;

// ------------------------------------------------------------- F7 Notícia ou evento

export const F7Schema = z
  .object({
    kind: z.enum(["NOTICIA", "EVENTO", "DEMO_DAY", "FORMACAO"]),
    title: text(140),
    summary: text(300),
    body: text(20000),
    cover: z.string().optional(),
    date: z.string().optional(),
    place: z.string().optional(),
    signupUrl: z.union([z.literal(""), z.string().url("Endereço inválido.")]).optional(),
    projectIds: z.array(z.string()).default([]),
    visibility: z.enum(["PUBLICO", "INTERNO"]),
    status: z.enum(["RASCUNHO", "PUBLICADO", "ARQUIVADO"]),
  })
  .superRefine((v, ctx) => {
    if (v.kind !== "NOTICIA" && !v.date) ctx.addIssue({ code: "custom", path: ["date"], message: "Os eventos precisam de data." });
    if (v.kind !== "NOTICIA" && !v.place) ctx.addIssue({ code: "custom", path: ["place"], message: "Os eventos precisam de local." });
  });
export type F7Input = z.infer<typeof F7Schema>;

export const ContactSchema = z.object({
  name: text(120),
  email: z.string().trim().email("Escreva um email válido."),
  subject: text(140),
  message: text(4000, 10),
  captchaToken: z.string().optional(),
});

export const VISIBILITY_CHECKLIST = [
  { key: "noClientData", label: "Não contém dados de clientes." },
  { key: "partnerAuthorized", label: "O cliente ou parceiro autorizou a divulgação, quando existe." },
  { key: "noFinancial", label: "Não contém informação financeira nem confidencial do board." },
  { key: "reviewed", label: "A imagem e os textos públicos foram revistos." },
] as const;
