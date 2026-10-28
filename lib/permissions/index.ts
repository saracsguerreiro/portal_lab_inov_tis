// Matriz de permissões (secção 15). Este módulo é a única fonte de verdade:
// o servidor chama assertCan() em cada acção e a interface usa as mesmas funções
// só para esconder o que não se pode fazer.
import type { Actor, Area, Challenge, Content, Idea, Project, Role, User } from "@/lib/domain/types";

export type EffectiveRole = Role | "VISITANTE";

export class PermissionError extends Error {
  status = 403;
  constructor(message = "Sem permissão para esta acção.") {
    super(message);
    this.name = "PermissionError";
  }
}

export const roleOf = (a: Actor): EffectiveRole =>
  a.kind === "user" && a.user.status === "ACTIVO" ? a.user.role : "VISITANTE";

export const userOf = (a: Actor): User | null => (a.kind === "user" && a.user.status === "ACTIVO" ? a.user : null);

export const isManagerRole = (r: EffectiveRole) => r === "GESTOR_LAB" || r === "GESTOR_INCUBADORA";
export const isInternalRole = (r: EffectiveRole) =>
  r === "COLABORADOR" || r === "GESTOR_LAB" || r === "GESTOR_INCUBADORA" || r === "COMISSAO_EXECUTIVA";
export const managerArea = (r: EffectiveRole): Area | null =>
  r === "GESTOR_LAB" ? "LAB" : r === "GESTOR_INCUBADORA" ? "INCUBADORA" : null;

export type PageCode =
  | "P01" | "P02" | "P03" | "P04" | "P05" | "P06" | "P07" | "P08" | "P09" | "P10" | "P11"
  | "P12" | "P13" | "P14" | "P15" | "P16" | "P17" | "P18" | "P19" | "P20" | "P21" | "P22"
  | "P23" | "P24" | "P25" | "P26" | "P27" | "P28" | "P29" | "P30" | "P31" | "P32" | "P33"
  | "P34" | "P35" | "P36";

const ALL: EffectiveRole[] = ["VISITANTE", "EXTERNO", "COLABORADOR", "GESTOR_LAB", "GESTOR_INCUBADORA", "COMISSAO_EXECUTIVA"];
const ACCOUNT: EffectiveRole[] = ["EXTERNO", "COLABORADOR", "GESTOR_LAB", "GESTOR_INCUBADORA", "COMISSAO_EXECUTIVA"];
const INTERNAL: EffectiveRole[] = ["COLABORADOR", "GESTOR_LAB", "GESTOR_INCUBADORA", "COMISSAO_EXECUTIVA"];
const MANAGERS: EffectiveRole[] = ["GESTOR_LAB", "GESTOR_INCUBADORA"];

/** Quem pode abrir cada página (linha «—» da matriz = sem acesso). */
export const PAGE_ACCESS: Record<PageCode, EffectiveRole[]> = {
  P01: ALL, P02: ALL, P03: ALL, P04: ALL, P05: ALL, P06: ALL, P07: ALL, P08: ALL, P09: ALL, P10: ALL, P11: ALL,
  // Submeter ideia externa: S para visitante, anónimo, externo e colaborador; «—» para gestores e CE.
  P12: ["VISITANTE", "EXTERNO", "COLABORADOR"],
  P13: ["VISITANTE", "EXTERNO", "COLABORADOR"],
  P14: ["VISITANTE", "EXTERNO", "COLABORADOR"],
  P15: ALL, // pública: a protecção é o código, o captcha e o limite de pedidos
  P16: ALL, P17: ALL, P18: ALL, P19: ALL,
  P20: ACCOUNT, P21: ACCOUNT, P22: ACCOUNT, P23: ACCOUNT,
  P24: ["COLABORADOR"],
  P25: INTERNAL, P26: INTERNAL,
  P27: ["COLABORADOR", "GESTOR_LAB", "COMISSAO_EXECUTIVA"],
  P28: INTERNAL, P29: INTERNAL,
  P30: [...MANAGERS, "COMISSAO_EXECUTIVA"],
  P31: MANAGERS, P32: MANAGERS, P33: MANAGERS, P34: MANAGERS, P35: MANAGERS, P36: MANAGERS,
};

export const canAccessPage = (a: Actor, page: PageCode) => PAGE_ACCESS[page].includes(roleOf(a));

// ---------------------------------------------------------------- Projectos

export function canViewProject(a: Actor, p: Project): boolean {
  const r = roleOf(a);
  if (p.visibility === "PUBLICO") return true;
  if (p.visibility === "INTERNO") return isInternalRole(r);
  return isManagerRole(r) || r === "COMISSAO_EXECUTIVA"; // RESTRITO
}

/** Nível de detalhe da ficha P06: pública, com login (interna) ou de gestão. */
export function projectDetailLevel(a: Actor, p: Project): "public" | "internal" | "management" | null {
  if (!canViewProject(a, p)) return null;
  const r = roleOf(a);
  if (isManagerRole(r) || r === "COMISSAO_EXECUTIVA") return "management";
  if (isInternalRole(r)) return "internal";
  return "public"; // visitante e externo só vêem a versão resumida
}

/** G (gerir) só na própria área; a outra área fica em leitura (P3, [a confirmar]). */
export function canManageProject(a: Actor, p: Pick<Project, "area">): boolean {
  return managerArea(roleOf(a)) === p.area;
}
export function canReadProjectManagement(a: Actor): boolean {
  return isManagerRole(roleOf(a));
}

// ---------------------------------------------------------------- Ideias

const COLLAB_VISIBLE_FROM = new Set(["EM_AVALIACAO", "DECISAO"]);
export const isCollaboratorIdea = (i: Pick<Idea, "type">) => i.type === "MELHORIA" || i.type === "NEGOCIO_COLABORADOR";

/**
 * Pode ver a ideia? `isOwner` é calculado pelo serviço (inclui a autoria anónima
 * cifrada do colaborador, que nunca chega à interface).
 */
export function canViewIdea(a: Actor, idea: Idea, isOwner: boolean): boolean {
  if (isOwner) return true;
  const r = roleOf(a);
  if (isManagerRole(r) || r === "COMISSAO_EXECUTIVA") return true;
  if (r === "COLABORADOR") return isCollaboratorIdea(idea) && COLLAB_VISIBLE_FROM.has(idea.status);
  return false; // externos e visitantes nunca vêem ideias de outros
}

/** Gerir uma ideia na triagem: o gestor da área responsável. */
export function canManageIdea(a: Actor, idea: Pick<Idea, "area">): boolean {
  return managerArea(roleOf(a)) === idea.area;
}

/** Ver a fila de triagem (G na própria área, L na outra). CE: «—». */
export function canViewTriage(a: Actor): boolean {
  return isManagerRole(roleOf(a));
}

/** Pontuação e análise da IA: gestores e Comissão Executiva. Nunca o criador. */
export function canViewAiScore(a: Actor, opts?: { isOwner?: boolean }): boolean {
  if (opts?.isOwner) return false;
  const r = roleOf(a);
  return isManagerRole(r) || r === "COMISSAO_EXECUTIVA";
}

export function canSubmitExternalIdea(a: Actor): boolean {
  return PAGE_ACCESS.P13.includes(roleOf(a));
}
export function canSubmitImprovementIdea(a: Actor): boolean {
  return roleOf(a) === "COLABORADOR";
}
export function canReactToIdea(a: Actor, idea: Idea): boolean {
  return roleOf(a) === "COLABORADOR" && canViewIdea(a, idea, false);
}
export function canModerateComments(a: Actor): boolean {
  return roleOf(a) === "GESTOR_LAB"; // P25/P26: G só para o gestor do Lab
}

// ---------------------------------------------------------------- Outros

export function canViewChallenge(a: Actor, c: Challenge): boolean {
  if (c.contentStatus !== "PUBLICADO") return isManagerRole(roleOf(a));
  return c.visibility === "PUBLICO" || isInternalRole(roleOf(a));
}
export function canParticipateChallenge(a: Actor, c: Challenge): boolean {
  const r = roleOf(a);
  if (c.status !== "ABERTO") return false;
  if (r === "EXTERNO" || r === "VISITANTE") return c.audience !== "COLABORADORES";
  if (r === "COLABORADOR") return true; // desafios internos ou, com ideia de negócio, o formulário externo (D13)
  return false;
}
export function canViewContent(a: Actor, c: Content): boolean {
  if (c.status !== "PUBLICADO") return isManagerRole(roleOf(a));
  return c.visibility === "PUBLICO" || isInternalRole(roleOf(a));
}
export const canManageContent = (a: Actor) => isManagerRole(roleOf(a));
export const canViewDashboard = (a: Actor) => canAccessPage(a, "P30");
export const canSubmitSupportRequest = (a: Actor) => roleOf(a) === "COLABORADOR";
export const canManageSupportRequests = (a: Actor) => roleOf(a) === "GESTOR_LAB";
export const canViewAllSupportRequests = (a: Actor) => roleOf(a) === "GESTOR_LAB" || roleOf(a) === "COMISSAO_EXECUTIVA";
export const canManageUsers = (a: Actor) => isManagerRole(roleOf(a));
/** P34: o gestor do Lab gere os critérios de melhoria; o da Incubadora, os de externa e negócio. */
export function canManageCriteria(a: Actor, kind: "MELHORIA" | "EXTERNA_NEGOCIO"): boolean {
  const r = roleOf(a);
  return (r === "GESTOR_LAB" && kind === "MELHORIA") || (r === "GESTOR_INCUBADORA" && kind === "EXTERNA_NEGOCIO");
}
export const canViewBoardTopics = (a: Actor) => canViewDashboard(a); // bloco 7

export function assertCan(ok: boolean, message?: string): asserts ok {
  if (!ok) throw new PermissionError(message);
}
