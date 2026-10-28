// Rótulos e tons visuais dos valores de domínio. Os textos vêm dos ficheiros de tradução.
import { t } from "@/lib/i18n";
import type { Area, Decision, IdeaStatus, IdeaType, Visibility } from "./types";

export type Tone = "neutral" | "info" | "warn" | "ok" | "danger" | "lab" | "inc" | "ai" | "brand";

export const statusTone: Record<IdeaStatus, Tone> = {
  RECEBIDA: "neutral",
  EM_ANALISE: "info",
  INFO_PEDIDA: "warn",
  EM_AVALIACAO: "brand",
  DECISAO: "ok",
  RETIRADA: "neutral",
  DUPLICADA: "neutral",
};

export const decisionTone: Record<Decision, Tone> = {
  SELECCIONADA: "ok",
  LISTA_ESPERA: "warn",
  ENCAMINHADA: "info",
  NAO_SELECCIONADA: "danger",
};

export const areaTone: Record<Area, Tone> = { LAB: "lab", INCUBADORA: "inc" };
export const visibilityTone: Record<Visibility, Tone> = { PUBLICO: "ok", INTERNO: "info", RESTRITO: "danger" };

export const L = {
  status: (s: IdeaStatus) => t(`status.${s}`),
  decision: (d: Decision) => t(`decision.${d}`),
  ideaType: (x: IdeaType) => t(`ideaType.${x}`),
  area: (a: Area) => t(`area.${a}`),
  visibility: (v: Visibility) => t(`visibility.${v}`),
  stage: (s: string) => t(`stage.${s}`),
  exit: (s: string) => t(`exit.${s}`),
  origin: (s: string) => t(`origin.${s}`),
  line: (s: string) => t(`line.${s}`),
  role: (s: string) => t(`role.${s}`),
  extType: (s: string) => t(`extType.${s}`),
  support: (s: string) => t(`support.${s}`),
  supportStatus: (s: string) => t(`supportStatus.${s}`),
  contentKind: (s: string) => t(`contentKind.${s}`),
  contentStatus: (s: string) => t(`contentStatus.${s}`),
  challengeStatus: (s: string) => t(`challengeStatus.${s}`),
  audience: (s: string) => t(`audience.${s}`),
  routing: (s: string) => t(`routing.${s}`),
};
