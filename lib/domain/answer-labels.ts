// Rótulos das opções dos formulários F1 e F2 (para mostrar respostas sem códigos internos).
export const ANSWER_OPTIONS: Record<string, Record<string, string>> = {
  audience: { EMPRESAS: "Empresas", SECTOR_PUBLICO: "Sector público", CIDADAOS: "Cidadãos", OUTRO: "Outro" },
  stage: { IDEIA: "Só ideia", PROTOTIPO: "Protótipo", TESTE: "Produto em teste", CLIENTES: "Já com clientes" },
  lookingFor: { PARCERIA: "Parceria", CLIENTES: "Clientes", TECNOLOGIA: "Tecnologia", INVESTIMENTO: "Investimento", MENTORIA: "Mentoria", OUTRO: "Outro" },
  category: { PROCESSOS: "Processos", FERRAMENTAS: "Ferramentas e sistemas", SERVICO_CLIENTE: "Serviço ao cliente", FORMA_TRABALHAR: "Forma de trabalhar", PESSOAS_CULTURA: "Pessoas e cultura", OUTRO: "Outro" },
  frequency: { DIARIAMENTE: "Diariamente", SEMANALMENTE: "Semanalmente", MENSALMENTE: "Mensalmente", RARAMENTE: "Raramente" },
  affected: { MINHA_EQUIPA: "A minha equipa", OUTRAS_AREAS: "Outras áreas", CLIENTES: "Clientes", TODA_TIS: "Toda a TIS" },
  impact: { TEMPO: "Poupa tempo", CUSTOS: "Reduz custos", QUALIDADE: "Melhora a qualidade", EXPERIENCIA_CLIENTE: "Melhora a experiência do cliente", RISCO: "Reduz risco" },
  urgency: { BAIXA: "Baixa", MEDIA: "Média", ALTA: "Alta" },
  gravity: { BAIXA: "Baixa", MEDIA: "Média", ALTA: "Alta" },
  profileType: { STARTUP: "Startup", UNIVERSIDADE: "Universidade ou centro de investigação", INDIVIDUAL: "Pessoa individual", OUTRA: "Outra organização" },
};

export function formatAnswer(key: string, v: unknown): string {
  const map = ANSWER_OPTIONS[key];
  if (Array.isArray(v)) return v.map((x) => map?.[x] ?? String(x)).join(", ");
  if (typeof v === "boolean") return v ? "Sim" : "Não";
  return map?.[String(v)] ?? String(v);
}
