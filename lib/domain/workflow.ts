// Estados, transições e etapas (secção 13).
import type { Decision, IdeaStatus, IncStage, LabStage } from "./types";

/** Transições permitidas a um gestor. A ideia só volta atrás quando a equipa pede informação. */
export const MANAGER_TRANSITIONS: Record<IdeaStatus, IdeaStatus[]> = {
  RECEBIDA: ["EM_ANALISE", "DUPLICADA"],
  EM_ANALISE: ["INFO_PEDIDA", "EM_AVALIACAO", "DECISAO", "DUPLICADA"],
  INFO_PEDIDA: ["EM_ANALISE", "DUPLICADA"],
  EM_AVALIACAO: ["INFO_PEDIDA", "DECISAO", "DUPLICADA"],
  DECISAO: ["EM_AVALIACAO"], // reabrir (só «Em lista de espera»)
  RETIRADA: [],
  DUPLICADA: [],
};

/** O criador só pode retirar a ideia ou responder a um pedido de informação. */
export const CREATOR_TRANSITIONS: Partial<Record<IdeaStatus, IdeaStatus[]>> = {
  RECEBIDA: ["RETIRADA"],
  EM_ANALISE: ["RETIRADA"],
  INFO_PEDIDA: ["EM_ANALISE", "RETIRADA"],
  EM_AVALIACAO: ["RETIRADA"],
};

export class TransitionError extends Error {
  status = 409;
  constructor(from: string, to: string) {
    super(`Mudança de estado inválida: ${from} → ${to}.`);
    this.name = "TransitionError";
  }
}

export function canTransition(
  by: "manager" | "creator" | "system",
  from: IdeaStatus,
  to: IdeaStatus,
  decision?: Decision | null,
): boolean {
  if (by === "system") return from === "INFO_PEDIDA" && to === "EM_ANALISE";
  if (by === "creator") return (CREATOR_TRANSITIONS[from] ?? []).includes(to);
  if (from === "DECISAO" && to === "EM_AVALIACAO") return decision === "LISTA_ESPERA";
  return MANAGER_TRANSITIONS[from].includes(to);
}

export function assertTransition(by: "manager" | "creator" | "system", from: IdeaStatus, to: IdeaStatus, decision?: Decision | null) {
  if (!canTransition(by, from, to, decision)) throw new TransitionError(from, to);
}

/** Linha principal mostrada ao criador (5 estados). */
export const MAIN_FLOW: IdeaStatus[] = ["RECEBIDA", "EM_ANALISE", "INFO_PEDIDA", "EM_AVALIACAO", "DECISAO"];

export const LAB_STAGES: LabStage[] = ["OPORTUNIDADE", "ESTRATEGIA", "EXPERIMENTACAO", "PASSAGEM"];
export const INC_STAGES: IncStage[] = ["INCUBACAO", "CRESCIMENTO", "PRONTA_SAIDA"];

/** Dias úteis entre duas datas (para o prazo de primeiro retorno). */
export function businessDaysBetween(from: Date, to: Date): number {
  let days = 0;
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);
  const sign = d <= end ? 1 : -1;
  while (sign > 0 ? d < end : d > end) {
    d.setDate(d.getDate() + sign);
    const wd = d.getDay();
    if (wd !== 0 && wd !== 6) days += sign;
  }
  return days;
}

export function addBusinessDays(from: Date, n: number): Date {
  const d = new Date(from);
  let added = 0;
  while (added < n) {
    d.setDate(d.getDate() + 1);
    const wd = d.getDay();
    if (wd !== 0 && wd !== 6) added++;
  }
  return d;
}
