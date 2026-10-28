import type { EffectiveRole, PageCode } from "@/lib/permissions";
import { PAGE_ACCESS } from "@/lib/permissions";

export interface NavItem {
  href: string;
  key: string; // chave de tradução nav.*
  page: PageCode;
}

export const PUBLIC_NAV: NavItem[] = [
  { href: "/ecossistema", key: "ecosystem", page: "P02" },
  { href: "/laboratorio", key: "lab", page: "P03" },
  { href: "/incubadora", key: "incubator", page: "P04" },
  { href: "/projectos", key: "projects", page: "P05" },
  { href: "/desafios", key: "challenges", page: "P07" },
  { href: "/noticias", key: "news", page: "P10" },
];

export const COLLAB_NAV: NavItem[] = [
  { href: "/ideias", key: "ideas", page: "P25" },
  { href: "/apoio", key: "support", page: "P27" },
  { href: "/aprender", key: "learn", page: "P28" },
  { href: "/comunidade", key: "community", page: "P29" },
];

export const ACCOUNT_NAV: NavItem[] = [
  { href: "/conta/ideias", key: "myIdeas", page: "P20" },
  { href: "/conta/mensagens", key: "messages", page: "P22" },
  { href: "/conta/perfil", key: "profile", page: "P23" },
];

export const MGMT_NAV: NavItem[] = [
  { href: "/painel", key: "dashboard", page: "P30" },
  { href: "/gestao/triagem", key: "triage", page: "P31" },
  { href: "/gestao/projectos", key: "mgmtProjects", page: "P32" },
  { href: "/gestao/conteudos", key: "contents", page: "P33" },
  { href: "/gestao/criterios-ia", key: "aiCriteria", page: "P34" },
  { href: "/gestao/comunicacao", key: "communication", page: "P35" },
  { href: "/gestao/utilizadores", key: "users", page: "P36" },
];

export const FOOTER_NAV: NavItem[] = [
  { href: "/termos", key: "terms", page: "P16" },
  { href: "/privacidade", key: "privacy", page: "P17" },
  { href: "/contactos", key: "contacts", page: "P18" },
  { href: "/estado", key: "checkStatus", page: "P15" },
  { href: "/parcerias", key: "partners", page: "P09" },
];

export const visibleFor = (items: NavItem[], role: EffectiveRole) => items.filter((i) => PAGE_ACCESS[i.page].includes(role));
