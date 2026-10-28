// Jira e Confluence por API (activáveis em P36). A ficha do projecto mostra o estado e as ligações.
// Os tokens vivem só em variáveis de ambiente do servidor; sem tokens devolve um resumo de demonstração.
import type { Project, Settings } from "@/lib/domain/types";

export interface IntegrationSummary {
  jira?: { url: string; status: string; open?: number; done?: number };
  confluence?: { url: string; status: string; updatedAt?: string };
  strateegia?: { url: string; status: string };
}

const env = (k: string) => (typeof process !== "undefined" ? process.env[k] : undefined);
const basic = (user?: string, token?: string) => (user && token ? `Basic ${btoa(`${user}:${token}`)}` : undefined);

export async function projectIntegrations(p: Pick<Project, "links" | "slug">, s: Settings): Promise<IntegrationSummary> {
  const out: IntegrationSummary = {};
  if (p.links.jira && s.integrations.jira.enabled) {
    const auth = basic(env("JIRA_USER"), env("JIRA_API_TOKEN"));
    if (auth) {
      try {
        const key = p.links.jira.split("/browse/")[1]?.split(/[/?#]/)[0] ?? s.integrations.jira.project;
        const q = async (jql: string) => {
          const r = await fetch(`${s.integrations.jira.baseUrl}/rest/api/3/search?maxResults=0&jql=${encodeURIComponent(jql)}`, { headers: { Authorization: auth, Accept: "application/json" } });
          return ((await r.json()) as { total: number }).total;
        };
        const [open, done] = await Promise.all([q(`project = ${key} AND statusCategory != Done`), q(`project = ${key} AND statusCategory = Done`)]);
        out.jira = { url: p.links.jira, open, done, status: `${open} tarefas em curso · ${done} concluídas` };
      } catch {
        out.jira = { url: p.links.jira, status: "Jira indisponível de momento" };
      }
    } else out.jira = { url: p.links.jira, status: "3 tarefas em curso · 12 concluídas (demonstração)" };
  }
  if (p.links.confluence && s.integrations.confluence.enabled) {
    const auth = basic(env("CONFLUENCE_USER"), env("CONFLUENCE_API_TOKEN"));
    if (auth) {
      try {
        const r = await fetch(`${s.integrations.confluence.baseUrl}/rest/api/space/${s.integrations.confluence.space}/content?limit=1&orderby=lastmodified`, { headers: { Authorization: auth, Accept: "application/json" } });
        const data = (await r.json()) as { page?: { results?: { version?: { when?: string } }[] } };
        const when = data.page?.results?.[0]?.version?.when;
        out.confluence = { url: p.links.confluence, updatedAt: when, status: when ? `Actualizado a ${when.slice(0, 10)}` : "Sem páginas" };
      } catch {
        out.confluence = { url: p.links.confluence, status: "Confluence indisponível de momento" };
      }
    } else out.confluence = { url: p.links.confluence, status: `Espaço ${s.integrations.confluence.space} · actualizado há 2 dias (demonstração)` };
  }
  if (p.links.strateegia) out.strateegia = { url: p.links.strateegia, status: "Ligação por URL (sem API)" };
  return out;
}
