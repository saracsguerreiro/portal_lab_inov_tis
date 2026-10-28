// Modelo de domínio (secção 16). Os nomes estão em inglês no código; os rótulos
// em português vivem em messages/pt.json e em lib/domain/labels.ts.

export type ID = string;
export type ISODate = string;

export type Role =
  | "COLABORADOR"
  | "GESTOR_LAB"
  | "GESTOR_INCUBADORA"
  | "COMISSAO_EXECUTIVA"
  | "EXTERNO";

/** Perfil efectivo de quem faz o pedido. Visitante e anónimo não têm conta. */
export type Actor =
  | { kind: "visitor" }
  | { kind: "user"; user: User };

export type ExternalType = "STARTUP" | "UNIVERSIDADE" | "INDIVIDUAL" | "OUTRA";

export interface ExternalProfile {
  type: ExternalType;
  organization?: string;
  website?: string;
  phone?: string;
  country?: string;
  city?: string;
  foundedYear?: number;
  teamSize?: number;
  stage?: string;
  institution?: string;
  department?: string;
  position?: string;
  profession?: string;
}

export interface User {
  id: ID;
  name: string;
  email: string;
  role: Role;
  authProvider: "MICROSOFT" | "EMAIL";
  department?: string;
  photoUrl?: string;
  emailVerifiedAt?: ISODate | null;
  status: "ACTIVO" | "DESACTIVADO";
  createdAt: ISODate;
  lastSeenAt?: ISODate;
  external?: ExternalProfile;
  interests?: string[];
  skills?: string[];
  badges?: string[];
  notifyPrefs?: { email: boolean; teams: boolean; challenges: boolean };
  passwordHash?: string;
  failedLogins?: number;
  lockedUntil?: ISODate | null;
}

export type IdeaType = "EXTERNA" | "MELHORIA" | "NEGOCIO_COLABORADOR";
export type IdeaOrigin = "EXTERNA" | "ANONIMA_EXTERNA" | "COLABORADOR" | "ANONIMA_COLABORADOR";
export type Area = "LAB" | "INCUBADORA";
export type IdeaStatus =
  | "RECEBIDA"
  | "EM_ANALISE"
  | "INFO_PEDIDA"
  | "EM_AVALIACAO"
  | "DECISAO"
  | "RETIRADA"
  | "DUPLICADA";
export type Decision = "SELECCIONADA" | "LISTA_ESPERA" | "ENCAMINHADA" | "NAO_SELECCIONADA";

export interface Idea {
  id: ID;
  number: string; // ex.: ID-2026-0042
  type: IdeaType;
  origin: IdeaOrigin;
  /** Nunca preenchido em ideias anónimas: a ligação vive cifrada em AnonAuthorship. */
  authorId?: ID | null;
  title: string;
  summary: string;
  answers: Record<string, unknown>;
  area: Area;
  status: IdeaStatus;
  decision?: Decision | null;
  decisionReason?: string;
  nextStep?: string;
  assigneeId?: ID | null;
  challengeId?: ID | null;
  duplicateOfId?: ID | null;
  projectId?: ID | null;
  termsVersion?: string;
  theme?: string;
  affectedArea?: string;
  workLine?: WorkLine | null;
  similarConfirmed?: ID[];
  managerScore?: number | null;
  deleteRequestedAt?: ISODate | null;
  createdAt: ISODate;
  updatedAt: ISODate;
  firstResponseAt?: ISODate | null;
}

export interface AnonAuthorship {
  id: ID;
  ideaId: ID;
  /** Referência cifrada ao utilizador (colaborador anónimo). */
  userRefEnc?: string | null;
  /** HMAC não reversível do id do utilizador, para «As minhas ideias». */
  userLookup?: string | null;
  /** Hash do código de acompanhamento (externo anónimo). */
  codeHash?: string | null;
  notifyEmailEnc?: string | null;
  revealedAt?: ISODate | null;
}

export interface StatusChange {
  id: ID;
  entity: "IDEA" | "PROJECT";
  entityId: ID;
  from?: string | null;
  to: string;
  byId?: ID | null; // null = sistema
  note?: string;
  at: ISODate;
}

export type Routing = "LAB" | "INCUBADORA" | "DIGITAL_OFFICE";

export interface AiCriterionScore {
  key: string;
  name: string;
  score: number; // 1..5
  weight: number; // %
  justification: string;
}

export interface AiAnalysis {
  id: ID;
  ideaId: ID;
  criteriaSetId: ID;
  criteriaVersion: number;
  status: "PENDENTE" | "CONCLUIDA" | "FALHOU";
  scores: AiCriterionScore[];
  total: number; // 0..100
  routing?: Routing;
  routingReason?: string;
  classification?: { theme: string; sector: string; workLine: WorkLine | null; category: string };
  similar: { ideaId: ID; number: string; title: string; similarity: number }[];
  risks: { kind: "DADOS_PESSOAIS" | "DADOS_CLIENTES" | "CONFIDENCIAL"; detail: string }[];
  completeness: { weakFields: string[]; questions: string[] };
  summary: string;
  feedbackDraft: string;
  error?: string;
  provider?: string;
  createdAt: ISODate;
}

export interface Criterion {
  key: string;
  name: string;
  description: string;
  scale1: string;
  scale5: string;
  weight: number;
}

export interface CriteriaSet {
  id: ID;
  ideaKind: "EXTERNA_NEGOCIO" | "MELHORIA";
  version: number;
  criteria: Criterion[];
  context: string;
  active: boolean;
  createdAt: ISODate;
  createdById?: ID;
}

export interface ManagerAssessment {
  id: ID;
  ideaId: ID;
  managerId: ID;
  scores: Record<string, number>;
  finalScore: number;
  aiScore?: number;
  notes?: string;
  at: ISODate;
}

export interface Attachment {
  id: ID;
  name: string;
  mime: string;
  size: number;
  key: string;
}

export interface Message {
  id: ID;
  ideaId: ID;
  /** null = equipa (mostrado como «Equipa do Lab/Incubadora») */
  authorId?: ID | null;
  fromTeam: boolean;
  kind: "FEEDBACK" | "PEDIDO_INFO" | "RESPOSTA" | "MENSAGEM";
  text: string;
  attachments: Attachment[];
  validatedById?: ID | null;
  at: ISODate;
  readAt?: ISODate | null;
}

export type Visibility = "PUBLICO" | "INTERNO" | "RESTRITO";
export type WorkLine = "L1" | "L2" | "L3" | "L4";
export type LabStage = "OPORTUNIDADE" | "ESTRATEGIA" | "EXPERIMENTACAO" | "PASSAGEM";
export type IncStage = "INCUBACAO" | "CRESCIMENTO" | "PRONTA_SAIDA";
export type LabExit = "DIRECCAO" | "INCUBADORA" | "STANDARD" | "ENCERRADO";
export type IncExit = "SPIN_IN" | "SPIN_OFF" | "ENCERRAMENTO";

export interface Project {
  id: ID;
  slug: string;
  name: string;
  area: Area;
  track?: "INTERNA" | "EXTERNA" | null;
  workLine?: WorkLine | null;
  originIdeaId?: ID | null;
  visibility: Visibility;
  featured: boolean;
  cover?: string; // gradiente ou URL
  shortDescription: string;
  problem: string;
  hypothesis?: string;
  stage: LabStage | IncStage;
  sponsorId?: ID | null;
  mainMetric?: string;
  killMetric?: string;
  architectureValidatedAt?: ISODate | null;
  securityKitPhase: 0 | 1 | 2 | 3;
  partnerIds: ID[];
  links: { jira?: string; confluence?: string; strateegia?: string };
  exit?: { kind: LabExit | IncExit; at: ISODate; reason: string } | null;
  theme?: string;
  publicResults?: string;
  decisions?: string;
  internalNotes?: string;
  metrics?: { label: string; value: string }[];
  learningCards?: { title: string; learned: string }[];
  history?: { at: ISODate; text: string }[];
  stageSince: ISODate;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface Gate {
  id: ID;
  projectId: ID;
  stage: string;
  decision: "CONTINUAR" | "MUDAR" | "ENCERRAR";
  evidence: string;
  at: ISODate;
  decidedBy: string;
}

export interface TeamMember {
  id: ID;
  projectId: ID;
  userId?: ID | null;
  name: string;
  role: "RESPONSAVEL" | "MEMBRO" | "ROTATIVO" | "CHAMPION";
}

export interface VisibilityChange {
  id: ID;
  projectId: ID;
  from: Visibility;
  to: Visibility;
  byId: ID;
  checklist?: Record<string, boolean>;
  at: ISODate;
}

export interface Challenge {
  id: ID;
  slug: string;
  title: string;
  area: Area;
  audience: "EXTERNOS" | "COLABORADORES" | "AMBOS";
  problem: string;
  context: string;
  lookingFor: string;
  criteria: string[];
  opensAt: ISODate;
  closesAt: ISODate;
  benefits: string;
  faq: { q: string; a: string }[];
  status: "ABERTO" | "EM_AVALIACAO" | "FECHADO";
  visibility: "PUBLICO" | "INTERNO";
  contentStatus: ContentStatus;
  cover?: string;
  targetParticipations?: number;
}

export type ContentStatus = "RASCUNHO" | "PUBLICADO" | "ARQUIVADO";
export type ContentKind =
  | "NOTICIA"
  | "EVENTO"
  | "DEMO_DAY"
  | "FORMACAO"
  | "RECURSO"
  | "CHAMPION"
  | "EQUIPA"
  | "PAGINA"
  | "DESTAQUE"
  | "AGENDA";

export interface Content {
  id: ID;
  slug: string;
  kind: ContentKind;
  title: string;
  summary: string;
  body: string;
  cover?: string;
  date?: ISODate;
  place?: string;
  signupUrl?: string;
  projectIds?: ID[];
  visibility: "PUBLICO" | "INTERNO";
  status: ContentStatus;
  meta?: Record<string, string>;
  createdAt: ISODate;
  publishedAt?: ISODate;
}

export interface Partner {
  id: ID;
  name: string;
  kind: "UNIVERSIDADE" | "PROGRAMA" | "STARTUP" | "EMPRESA";
  logo: string; // monograma
  description: string;
  together: string;
  disclosureAuthorized: boolean;
}

export type SupportType = "PROPOSTA" | "PROTOTIPO" | "FORMACAO" | "ARQUITECTURA" | "OUTRO";
export type SupportStatus = "RECEBIDO" | "ACEITE" | "EM_CURSO" | "CONCLUIDO" | "RECUSADO" | "ENCAMINHADO";

export interface SupportRequest {
  id: ID;
  type: SupportType;
  proposal: string;
  costCenter: string;
  description: string;
  dueDate: ISODate;
  urgent: boolean;
  status: SupportStatus;
  requestedById: ID;
  createdAt: ISODate;
  acceptedAt?: ISODate | null;
}

export interface Reaction {
  id: ID;
  ideaId: ID;
  userId: ID;
  kind: "APOIO" | "COMENTARIO" | "INTERESSE";
  text?: string;
  parentId?: ID | null;
  hidden?: boolean;
  at: ISODate;
}

export interface Notification {
  id: ID;
  userId: ID;
  title: string;
  body: string;
  href?: string;
  readAt?: ISODate | null;
  channels: ("APP" | "EMAIL" | "TEAMS")[];
  at: ISODate;
}

export interface Consent {
  id: ID;
  userId?: ID | null;
  ideaId?: ID | null;
  document: "TERMOS" | "PRIVACIDADE";
  version: string;
  at: ISODate;
}

export interface AuditLog {
  id: ID;
  userId?: ID | null;
  action: string;
  entity: string;
  entityId?: ID;
  before?: unknown;
  after?: unknown;
  at: ISODate;
}

export interface OutboxItem {
  id: ID;
  channel: "EMAIL" | "TEAMS" | "JIRA" | "CONFLUENCE" | "AI";
  to?: string;
  subject: string;
  body: string;
  status: "PENDENTE" | "ENVIADO" | "FALHOU";
  at: ISODate;
}

export interface Okr {
  key: string; // O1..O6
  title: string;
  unit: string;
  planned: [number, number, number, number];
  actual: [number, number, number, number];
}

export interface PendingDecision {
  key: string; // D-1..D-11, F1..F4
  title: string;
  dueDate: ISODate;
  done: boolean;
}

/** Valores [a confirmar] da especificação — editáveis em P36, nunca escritos no código. */
export interface Settings {
  responseDeadlineDays: number;
  fastTrackWeeklyQuota: number;
  retentionMonths: number;
  stalledProjectDays: number;
  termsVersion: string;
  privacyVersion: string;
  homeNumbers: { ideas: number | null; activeProjects: number | null; startups: number | null; partners: number | null };
  okrs: Okr[];
  pendingDecisions: PendingDecision[];
  tisAreas: string[];
  sectors: string[];
  themes: string[];
  crossAreaReadOnly: boolean;
  restrictedVisibilityEnabled: boolean;
  anonymousRevealEnabled: boolean;
  integrations: {
    teams: { enabled: boolean; webhookUrl: string };
    jira: { enabled: boolean; baseUrl: string; project: string };
    confluence: { enabled: boolean; baseUrl: string; space: string };
  };
  incubationFinancials: { cohortEnvelope: string; notes: string };
}

export interface DB {
  users: User[];
  ideas: Idea[];
  anonAuthorships: AnonAuthorship[];
  statusHistory: StatusChange[];
  aiAnalyses: AiAnalysis[];
  criteriaSets: CriteriaSet[];
  assessments: ManagerAssessment[];
  messages: Message[];
  projects: Project[];
  gates: Gate[];
  teamMembers: TeamMember[];
  visibilityChanges: VisibilityChange[];
  challenges: Challenge[];
  contents: Content[];
  partners: Partner[];
  supportRequests: SupportRequest[];
  reactions: Reaction[];
  notifications: Notification[];
  consents: Consent[];
  auditLogs: AuditLog[];
  outbox: OutboxItem[];
  responseTemplates: { key: string; title: string; body: string }[];
  settings: Settings;
}

export type Collection = Exclude<keyof DB, "settings">;
