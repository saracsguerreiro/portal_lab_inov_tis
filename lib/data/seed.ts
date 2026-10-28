// Dados de demonstração. Todos fictícios: nenhuma pessoa, empresa ou contacto real.
import bcrypt from "bcryptjs";
import type {
  AiAnalysis, Challenge, Content, CriteriaSet, DB, Gate, Idea, IdeaStatus, Message, Partner, Project,
  Reaction, Settings, StatusChange, SupportRequest, TeamMember, User,
} from "@/lib/domain/types";
import { buildAiInput, mockAnalyze, toAnalysis } from "@/lib/ai";
import { hashTrackingCode, lookupRef, seal } from "@/lib/crypto";

/** Data de referência dos dados de demonstração. */
export const SEED_NOW = new Date("2026-10-28T09:00:00Z");
const ago = (days: number, h = 9) => {
  const d = new Date(SEED_NOW);
  d.setUTCDate(d.getUTCDate() - days);
  d.setUTCHours(h, (days * 7) % 60, 0, 0);
  return d.toISOString();
};
const ahead = (days: number) => ago(-days, 18);

export const DEMO_PASSWORD = "Demo-2026-tis";
export const DEMO_DOMAIN = "tis.example";
export const DEMO_CODES = { underReview: "ECO-7F3K-92QD", decided: "ECO-4HXP-8M2R" };

// ------------------------------------------------------------- Utilizadores (1 por perfil + autores)

function users(): User[] {
  const hash = bcrypt.hashSync(DEMO_PASSWORD, 8);
  const ms = (id: string, name: string, role: User["role"], department: string, extra: Partial<User> = {}): User => ({
    id, name, role, department, email: `${name.split(" ")[0].toLowerCase()}.${name.split(" ").at(-1)!.toLowerCase()}@${DEMO_DOMAIN}`.normalize("NFD").replace(/[̀-ͯ]/g, ""),
    authProvider: "MICROSOFT", status: "ACTIVO", createdAt: ago(300), lastSeenAt: ago(1), emailVerifiedAt: ago(300),
    interests: [], skills: [], badges: [], notifyPrefs: { email: true, teams: true, challenges: true }, ...extra,
  });
  return [
    ms("u_colab", "Ana Domingos", "COLABORADOR", "Direcção Comercial", { interests: ["IA", "atendimento", "automação"], skills: ["Vendas consultivas", "Excel", "Power BI"], badges: ["Primeira ideia", "Ideia seleccionada", "Participou num desafio"] }),
    ms("u_glab", "Bruno Mateus", "GESTOR_LAB", "Innovation Lab"),
    ms("u_ginc", "Carla Neto", "GESTOR_INCUBADORA", "Incubadora"),
    ms("u_ce", "Domingos Sebastião", "COMISSAO_EXECUTIVA", "Comissão Executiva"),
    {
      id: "u_ext", name: "Eva Kiala", email: "eva@kitanda.example", role: "EXTERNO", authProvider: "EMAIL", status: "ACTIVO",
      emailVerifiedAt: ago(200), createdAt: ago(200), lastSeenAt: ago(2), passwordHash: hash, failedLogins: 0,
      external: { type: "STARTUP", organization: "Kitanda Digital", website: "https://kitanda.example", country: "Angola", city: "Luanda", foundedYear: 2024, teamSize: 6, stage: "Produto em teste" },
      notifyPrefs: { email: true, teams: false, challenges: true },
    },
    ms("u_colab2", "Feliciano Lopes", "COLABORADOR", "Operações e Suporte", { interests: ["dados", "processos"], skills: ["ITIL", "SQL"], badges: ["Primeira ideia"] }),
    ms("u_colab3", "Graça Manuel", "COLABORADOR", "Pessoas e Cultura", { interests: ["pessoas", "formação"], skills: ["Facilitação"], badges: [] }),
    {
      id: "u_ext2", name: "Hélder Costa", email: "helder.costa@unifuturo.example", role: "EXTERNO", authProvider: "EMAIL", status: "ACTIVO",
      emailVerifiedAt: ago(150), createdAt: ago(150), lastSeenAt: ago(9), passwordHash: hash,
      external: { type: "UNIVERSIDADE", institution: "Universidade do Futuro", department: "Engenharia Informática", position: "Professor auxiliar", country: "Angola", city: "Benguela" },
      notifyPrefs: { email: true, teams: false, challenges: false },
    },
    {
      id: "u_ext3", name: "Isabel Tchissola", email: "isabel.t@mail.example", role: "EXTERNO", authProvider: "EMAIL", status: "ACTIVO",
      emailVerifiedAt: ago(90), createdAt: ago(90), lastSeenAt: ago(20), passwordHash: hash,
      external: { type: "INDIVIDUAL", profession: "Engenheira de energias renováveis", country: "Angola", city: "Huambo" },
      notifyPrefs: { email: true, teams: false, challenges: true },
    },
  ];
}

// ------------------------------------------------------------- Critérios iniciais (secção 12)

function criteriaSets(): CriteriaSet[] {
  return [
    {
      id: "crit_ext_v1", ideaKind: "EXTERNA_NEGOCIO", version: 1, active: true, createdAt: ago(320), createdById: "u_ginc",
      context: "A TIS é uma empresa de tecnologia em Luanda. Pilar 2 (Tecnologia) e Pilar 3 (Mercados). Sectores prioritários: banca, telecomunicações, energia e sector público. Procuramos soluções que preencham lacunas do portfólio em dados, IA, pagamentos e serviços digitais.",
      criteria: [
        { key: "alinhamento_estrategico", name: "Alinhamento estratégico", description: "Encaixe nos Pilares 2 (Tecnologia) e 3 (Mercados) da TIS e nas lacunas do portfólio", scale1: "Sem relação com a estratégia", scale5: "Preenche uma lacuna clara do portfólio", weight: 25 },
        { key: "problema_mercado", name: "Problema e mercado", description: "Problema real, claro, e tamanho do mercado", scale1: "Problema vago ou de nicho mínimo", scale5: "Problema claro, frequente e com mercado grande", weight: 20 },
        { key: "maturidade", name: "Maturidade", description: "Ideia, protótipo, produto em teste ou já com clientes", scale1: "Só ideia", scale5: "Já com clientes", weight: 15 },
        { key: "equipa", name: "Equipa", description: "Competências e capacidade de execução", scale1: "Sem equipa ou competências", scale5: "Equipa completa e com histórico", weight: 15 },
        { key: "modelo_negocio", name: "Modelo de negócio", description: "Como gera receita e se é viável", scale1: "Sem modelo de receita", scale5: "Modelo validado com receita", weight: 15 },
        { key: "diferenciacao", name: "Diferenciação", description: "O que a torna diferente das alternativas", scale1: "Igual às alternativas", scale5: "Vantagem clara e difícil de copiar", weight: 10 },
      ],
    },
    {
      id: "crit_mel_v1", ideaKind: "MELHORIA", version: 1, active: true, createdAt: ago(320), createdById: "u_glab",
      context: "Matriz de scoring e GUT do Plano 2027. Priorizamos ideias que poupam tempo, reduzem custos ou risco e melhoram a experiência do cliente, praticáveis com os meios da TIS.",
      criteria: [
        { key: "alinhamento", name: "Alinhamento", description: "Ligação à estratégia da TIS", scale1: "Sem ligação", scale5: "Ligação directa a um objectivo do Plano 2027", weight: 20 },
        { key: "impacto", name: "Impacto", description: "Tempo, custo, qualidade ou experiência do cliente", scale1: "Impacto residual", scale5: "Impacto grande em várias dimensões", weight: 25 },
        { key: "viabilidade", name: "Viabilidade", description: "Facilidade de prática com os meios da TIS", scale1: "Exige meios que não temos", scale5: "Pode começar já", weight: 15 },
        { key: "inovacao", name: "Inovação", description: "Grau de novidade", scale1: "Já existe na TIS", scale5: "Nova na TIS e no mercado", weight: 10 },
        { key: "tempo_custo", name: "Tempo e custo", description: "Esforço para implementar (mais baixo = mais pontos)", scale1: "Muito caro e demorado", scale5: "Rápido e barato", weight: 10 },
        { key: "gut", name: "GUT", description: "Gravidade × Urgência × Tendência, a partir das respostas do formulário", scale1: "GUT baixo", scale5: "GUT máximo", weight: 20 },
      ],
    },
  ];
}

// ------------------------------------------------------------- Ideias (20, em todos os estados)

interface IdeaSeed {
  id: string; type: Idea["type"]; origin: Idea["origin"]; author?: string; title: string; summary: string;
  answers: Record<string, unknown>; status: IdeaStatus; decision?: Idea["decision"]; days: number;
  reason?: string; next?: string; challenge?: string; affected?: string; assignee?: string; code?: string; anonUser?: string;
  project?: string; dup?: string; ai?: "pending" | "failed"; managerScore?: number; notifyEmail?: string;
}

const ext = (o: Partial<Record<string, unknown>>) => ({
  profileType: "STARTUP", audience: ["EMPRESAS"], sector: "Banca", stage: "PROTOTIPO", lookingFor: ["PARCERIA", "CLIENTES"], ...o,
});
const mel = (o: Partial<Record<string, unknown>>) => ({ category: "PROCESSOS", frequency: "SEMANALMENTE", affected: ["MINHA_EQUIPA"], impact: ["TEMPO"], urgency: "MEDIA", gravity: "MEDIA", wantsToParticipate: true, ...o });

const IDEAS: IdeaSeed[] = [
  { id: "idea_01", type: "EXTERNA", origin: "EXTERNA", author: "u_ext", days: 190, status: "DECISAO", decision: "SELECCIONADA", project: "prj_v_kitanda", assignee: "u_ginc", managerScore: 82,
    title: "Pagamentos por QR para mercados informais", summary: "Carteira digital com pagamentos por QR para vendedoras dos mercados de Luanda, sem precisar de conta bancária.",
    reason: "Problema grande, equipa forte e tracção inicial no Mercado do Kikolo (fictício).", next: "Entrada na trilha externa da Incubadora, coorte 2026-B.",
    answers: ext({ organization: "Kitanda Digital", problem: "Mais de metade das vendedoras dos mercados não tem conta bancária e perde vendas por falta de troco e de meios de pagamento digitais. O dinheiro em numerário também traz risco de roubo.", solution: "Carteira digital simples, com QR impresso na banca, carregamento em agentes e liquidação diária. Funciona em telemóveis básicos por USSD.", differentiation: "Funciona offline com USSD, onboarding em 3 minutos e comissão abaixo das alternativas.", stage: "TESTE", customers: 340, businessModel: "Comissão de 0,8 % por transacção e serviço de microcrédito com parceiros.", team: "6 pessoas: 2 engenheiros de software, 1 designer, 2 agentes de campo, 1 gestora de produto com experiência em fintech.", lookingFor: ["PARCERIA", "TECNOLOGIA", "INVESTIMENTO"], challengeId: "dsf_inclusao" }), challenge: "dsf_inclusao" },
  { id: "idea_02", type: "EXTERNA", origin: "EXTERNA", author: "u_ext", days: 24, status: "INFO_PEDIDA", assignee: "u_ginc",
    title: "Marketplace de serviços técnicos ao domicílio", summary: "Liga técnicos certificados (electricistas, canalizadores) a famílias e PME, com pagamento seguro.",
    answers: ext({ organization: "Kitanda Digital", sector: "Outro", audience: ["CIDADAOS", "EMPRESAS"], problem: "É difícil encontrar técnicos de confiança e os preços variam muito.", solution: "Aplicação com perfis verificados, orçamento fechado e pagamento retido até ao fim do serviço.", differentiation: "Verificação presencial dos técnicos e garantia de 30 dias.", stage: "IDEIA", lookingFor: ["MENTORIA", "PARCERIA"] }) },
  { id: "idea_03", type: "EXTERNA", origin: "EXTERNA", author: "u_ext", days: 2, status: "RECEBIDA", ai: "failed",
    title: "Assistente de WhatsApp para pequenos negócios", summary: "Assistente que responde a clientes, regista encomendas e envia lembretes de pagamento pelo WhatsApp.",
    answers: ext({ organization: "Kitanda Digital", sector: "Telecomunicações", problem: "Os pequenos negócios perdem encomendas porque não conseguem responder a tempo às mensagens dos clientes.", solution: "Assistente com IA, treinado no catálogo do negócio, que responde 24 horas por dia.", differentiation: "Em português de Angola e com integração em pagamentos locais.", stage: "IDEIA" }) },
  { id: "idea_04", type: "EXTERNA", origin: "EXTERNA", author: "u_ext2", days: 45, status: "EM_AVALIACAO", assignee: "u_ginc",
    title: "Detecção de fraude em pagamentos com IA local", summary: "Modelo treinado em dados sintéticos para detectar padrões de fraude em tempo real, a correr nos servidores do banco.",
    answers: ext({ profileType: "UNIVERSIDADE", organization: "Universidade do Futuro", problem: "Os bancos angolanos dependem de regras fixas e detectam a fraude tarde. Os modelos na cloud levantam questões de soberania de dados.", solution: "Modelo de detecção de anomalias que corre localmente, com explicação de cada alerta para o analista.", differentiation: "Treinado com dados sintéticos realistas e explicável, sem enviar dados para fora do país.", stage: "PROTOTIPO", businessModel: "Licença anual por instituição e serviço de afinação.", team: "Grupo de investigação com 3 doutorados em aprendizagem automática e 4 mestrandos.", lookingFor: ["PARCERIA", "CLIENTES", "TECNOLOGIA"] }) },
  { id: "idea_05", type: "EXTERNA", origin: "ANONIMA_EXTERNA", days: 8, status: "EM_ANALISE", code: DEMO_CODES.underReview, assignee: "u_ginc", notifyEmail: "anon@exemplo.example",
    title: "Cartão de saúde digital para clínicas privadas", summary: "Registo clínico portátil, controlado pelo paciente, partilhado entre clínicas com o seu consentimento.",
    answers: ext({ profileType: "INDIVIDUAL", sector: "Saúde", audience: ["CIDADAOS", "EMPRESAS"], problem: "Os pacientes repetem exames porque as clínicas não partilham informação. Isto custa tempo e dinheiro.", solution: "Cartão com QR que dá acesso temporário ao historial, com consentimento do paciente.", differentiation: "O paciente controla o acesso; funciona com as clínicas sem trocar os seus sistemas.", stage: "IDEIA", lookingFor: ["PARCERIA", "MENTORIA"] }) },
  { id: "idea_06", type: "EXTERNA", origin: "ANONIMA_EXTERNA", days: 70, status: "DECISAO", decision: "NAO_SELECCIONADA", code: DEMO_CODES.decided, assignee: "u_ginc", managerScore: 38,
    reason: "A ideia ainda não tem modelo de negócio nem equipa para avançar agora.", next: "Pode voltar a submeter com um protótipo e uma equipa definida.",
    title: "Rede social para estudantes universitários", summary: "Plataforma para estudantes partilharem apontamentos e encontrarem explicadores.",
    answers: ext({ profileType: "INDIVIDUAL", sector: "Educação", audience: ["CIDADAOS"], problem: "Os estudantes têm dificuldade em encontrar materiais de estudo.", solution: "Rede social com partilha de apontamentos.", differentiation: "Focada em Angola.", stage: "IDEIA", lookingFor: ["INVESTIMENTO"] }) },
  { id: "idea_07", type: "EXTERNA", origin: "EXTERNA", author: "u_ext3", days: 110, status: "DECISAO", decision: "LISTA_ESPERA", assignee: "u_ginc", managerScore: 61,
    reason: "Ideia com potencial, mas o desafio de energia ainda está em avaliação.", next: "Reabrimos quando fecharmos o desafio «Energia limpa para PME».",
    title: "Gestão de energia solar para escolas rurais", summary: "Sensores e painel simples para gerir baterias e consumo em escolas com painéis solares.",
    answers: ext({ profileType: "INDIVIDUAL", sector: "Energia", audience: ["SECTOR_PUBLICO"], problem: "As escolas rurais com painéis solares ficam sem energia a meio do dia porque as baterias são mal geridas.", solution: "Kit de sensores de baixo custo e painel por SMS que avisa quando reduzir o consumo.", differentiation: "Custo abaixo de 200 dólares por escola e manutenção local.", stage: "PROTOTIPO", lookingFor: ["PARCERIA", "INVESTIMENTO"] }), challenge: "dsf_energia" },
  { id: "idea_08", type: "EXTERNA", origin: "EXTERNA", author: "u_ext2", days: 130, status: "DECISAO", decision: "ENCAMINHADA", assignee: "u_ginc",
    reason: "O pedido é sobretudo de arquitectura de integração, que é do Digital Office.", next: "O Digital Office entra em contacto para uma sessão de assessoria.",
    title: "Norma aberta de interoperabilidade para registos académicos", summary: "Proposta de standard para trocar certificados entre universidades e empregadores.",
    answers: ext({ profileType: "UNIVERSIDADE", organization: "Universidade do Futuro", sector: "Educação", audience: ["SECTOR_PUBLICO"], problem: "Validar certificados demora semanas e é feito em papel.", solution: "Standard aberto de arquitectura e integração com assinatura digital.", differentiation: "Aberto e neutro.", stage: "IDEIA", lookingFor: ["TECNOLOGIA"] }) },
  { id: "idea_09", type: "EXTERNA", origin: "EXTERNA", author: "u_ext3", days: 30, status: "DUPLICADA", dup: "idea_03", assignee: "u_ginc",
    title: "Chatbot de WhatsApp para lojas de bairro", summary: "Bot que responde a clientes e regista encomendas no WhatsApp.",
    answers: ext({ profileType: "INDIVIDUAL", sector: "Telecomunicações", problem: "As lojas de bairro não conseguem responder às mensagens.", solution: "Bot no WhatsApp.", differentiation: "Simples.", stage: "IDEIA" }) },
  { id: "idea_10", type: "MELHORIA", origin: "COLABORADOR", author: "u_colab", days: 40, status: "EM_AVALIACAO", affected: "Pessoas e Cultura", assignee: "u_glab",
    title: "Pedido de férias em 3 cliques", summary: "Substituir o formulário em papel e os emails por um pedido de férias no Teams, com aprovação do gestor no próprio Teams.",
    answers: mel({ category: "FERRAMENTAS", affectedArea: "Pessoas e Cultura", problem: "Hoje o pedido de férias é um formulário em papel que passa por três pessoas. Demora em média 6 dias e perdem-se pedidos.", proposal: "Aplicação no Teams com o saldo de dias, pedido em 3 cliques e aprovação no próprio Teams. Integra com o sistema de RH.", impact: ["TEMPO", "QUALIDADE"], impactEstimate: "2 horas por mês por gestor", frequency: "SEMANALMENTE", affected: ["TODA_TIS"], urgency: "MEDIA", gravity: "BAIXA" }) },
  { id: "idea_11", type: "MELHORIA", origin: "ANONIMA_COLABORADOR", anonUser: "u_colab", days: 35, status: "EM_AVALIACAO", affected: "Toda a TIS", assignee: "u_glab",
    title: "Menos reuniões de ponto de situação", summary: "Trocar metade das reuniões semanais de ponto de situação por actualizações escritas assíncronas.",
    answers: mel({ category: "FORMA_TRABALHAR", affectedArea: "Toda a TIS", problem: "Passamos em média 5 horas por semana em reuniões de ponto de situação onde a maior parte das pessoas só ouve.", proposal: "Modelo de actualização escrita às segundas, com reunião só para bloqueios. Piloto de 6 semanas em duas equipas.", impact: ["TEMPO", "QUALIDADE"], impactEstimate: "3 horas por semana por pessoa", frequency: "DIARIAMENTE", affected: ["TODA_TIS"], urgency: "ALTA", gravity: "MEDIA" }) },
  { id: "idea_12", type: "MELHORIA", origin: "COLABORADOR", author: "u_colab2", days: 150, status: "DECISAO", decision: "SELECCIONADA", affected: "Operações e Suporte", project: "prj_l_conhecimento", assignee: "u_glab", managerScore: 78,
    reason: "Impacto alto no tempo de resolução e muito viável com as ferramentas actuais.", next: "Entra no Lab como projecto, na etapa Oportunidade.",
    title: "Base de conhecimento de incidentes com pesquisa inteligente", summary: "Reunir as soluções de incidentes passados numa base pesquisável, para não resolver o mesmo problema duas vezes.",
    answers: mel({ category: "FERRAMENTAS", affectedArea: "Operações e Suporte", problem: "Os técnicos resolvem várias vezes o mesmo incidente porque as soluções ficam em emails e na cabeça das pessoas.", proposal: "Base de conhecimento ligada ao sistema de tickets, com pesquisa por linguagem natural (IA local).", impact: ["TEMPO", "QUALIDADE", "EXPERIENCIA_CLIENTE"], impactEstimate: "Reduzir 20 % do tempo de resolução", frequency: "DIARIAMENTE", affected: ["MINHA_EQUIPA", "CLIENTES"], urgency: "ALTA", gravity: "ALTA" }) },
  { id: "idea_13", type: "MELHORIA", origin: "COLABORADOR", author: "u_colab3", days: 1, status: "RECEBIDA", affected: "Pessoas e Cultura", ai: "pending",
    title: "Onboarding digital para novos colaboradores", summary: "Um percurso digital para a primeira semana, com tarefas, pessoas a conhecer e formações obrigatórias.",
    answers: mel({ category: "PESSOAS_CULTURA", affectedArea: "Pessoas e Cultura", problem: "Os novos colaboradores passam a primeira semana sem saber a quem pedir acessos e o que fazer.", proposal: "Percurso no Teams com checklist, vídeos curtos e um padrinho.", impact: ["TEMPO", "QUALIDADE"], frequency: "MENSALMENTE", affected: ["OUTRAS_AREAS"], urgency: "MEDIA", gravity: "MEDIA" }) },
  { id: "idea_14", type: "MELHORIA", origin: "COLABORADOR", author: "u_colab2", days: 9, status: "EM_ANALISE", affected: "Direcção Financeira", assignee: "u_glab",
    title: "Digitalizar a aprovação de despesas", summary: "Fluxo digital para aprovar despesas até um limite, com fotografia do recibo.",
    answers: mel({ category: "PROCESSOS", affectedArea: "Direcção Financeira", problem: "As despesas pequenas exigem quatro assinaturas em papel e demoram três semanas a ser pagas.", proposal: "Fluxo digital com regras por valor e fotografia do recibo pelo telemóvel.", impact: ["TEMPO", "CUSTOS"], frequency: "SEMANALMENTE", affected: ["TODA_TIS"], urgency: "MEDIA", gravity: "MEDIA" }) },
  { id: "idea_15", type: "MELHORIA", origin: "ANONIMA_COLABORADOR", anonUser: "u_colab3", days: 16, status: "INFO_PEDIDA", affected: "Direcção Comercial", assignee: "u_glab",
    title: "Painel único de propostas comerciais", summary: "Ver num só sítio o estado de todas as propostas comerciais, por cliente e por prazo.",
    answers: mel({ category: "FERRAMENTAS", affectedArea: "Direcção Comercial", problem: "Não sabemos que propostas estão atrasadas.", proposal: "Painel com o estado das propostas.", impact: ["QUALIDADE"], frequency: "SEMANALMENTE", affected: ["OUTRAS_AREAS"], urgency: "ALTA", gravity: "MEDIA" }) },
  { id: "idea_16", type: "MELHORIA", origin: "COLABORADOR", author: "u_colab", days: 60, status: "RETIRADA", affected: "Direcção Comercial",
    title: "Cartões de visita digitais", summary: "Cartões de visita com QR em vez de papel.",
    answers: mel({ category: "OUTRO", affectedArea: "Direcção Comercial", problem: "Os cartões em papel acabam e ficam desactualizados.", proposal: "Cartão digital com QR no telemóvel.", impact: ["CUSTOS"], frequency: "RARAMENTE", urgency: "BAIXA", gravity: "BAIXA" }) },
  { id: "idea_17", type: "NEGOCIO_COLABORADOR", origin: "COLABORADOR", author: "u_colab", days: 12, status: "EM_ANALISE", assignee: "u_glab",
    title: "IA local para bancos, como serviço gerido", summary: "Oferecer aos bancos clientes um modelo de linguagem a correr no centro de dados da TIS, para resumir processos e responder a clientes.",
    answers: ext({ profileType: "INDIVIDUAL", sector: "Banca", problem: "Os bancos querem usar IA generativa mas não podem enviar dados de clientes para fora do país.", solution: "Serviço gerido de IA local no centro de dados da TIS, com modelos abertos afinados em português.", differentiation: "Dados ficam em Angola; a TIS já tem a relação com os bancos.", stage: "IDEIA", businessModel: "Subscrição mensal por banco, por volume de pedidos.", team: "Proponho uma equipa com o Lab (linha L1) e a Direcção Comercial.", lookingFor: ["TECNOLOGIA", "CLIENTES"] }) },
  { id: "idea_18", type: "NEGOCIO_COLABORADOR", origin: "COLABORADOR", author: "u_colab2", days: 210, status: "DECISAO", decision: "SELECCIONADA", project: "prj_l_ocr", assignee: "u_glab", managerScore: 74,
    reason: "Há procura dos clientes e o Lab tem competências para um protótipo rápido.", next: "Projecto do Lab na linha L4, para validar com dois clientes.",
    title: "Leitura automática de facturas para clientes empresariais", summary: "Serviço que lê facturas em PDF ou fotografia e lança os dados no ERP do cliente.",
    answers: ext({ profileType: "INDIVIDUAL", sector: "Outro", problem: "Os clientes empresariais lançam facturas à mão no ERP, com erros e atrasos.", solution: "OCR com validação por IA e integração com os ERP mais usados.", differentiation: "Treinado em facturas angolanas e com integração local.", stage: "IDEIA", businessModel: "Preço por factura processada.", lookingFor: ["TECNOLOGIA"] }) },
  { id: "idea_19", type: "NEGOCIO_COLABORADOR", origin: "ANONIMA_COLABORADOR", anonUser: "u_colab3", days: 55, status: "EM_AVALIACAO", assignee: "u_glab",
    title: "Academia de competências digitais para PME", summary: "Programa de formação paga para PME clientes, dado por especialistas da TIS.",
    answers: ext({ profileType: "INDIVIDUAL", sector: "Educação", audience: ["EMPRESAS"], problem: "As PME clientes não têm competências para tirar partido das ferramentas que compram.", solution: "Academia com percursos curtos, presenciais e online, com certificado TIS.", differentiation: "Formadores que implementam os mesmos sistemas no dia a dia.", stage: "IDEIA", businessModel: "Inscrição por percurso e pacotes anuais.", lookingFor: ["PARCERIA"] }) },
  { id: "idea_20", type: "MELHORIA", origin: "COLABORADOR", author: "u_colab3", days: 95, status: "DECISAO", decision: "NAO_SELECCIONADA", affected: "Logística", assignee: "u_glab", managerScore: 42,
    reason: "Já está em curso um projecto da Direcção de Sistemas que resolve o mesmo problema.", next: "Partilhámos a sua ideia com essa equipa.",
    title: "Reserva de salas por QR", summary: "QR em cada sala para reservar ou libertar no momento.",
    answers: mel({ category: "FERRAMENTAS", affectedArea: "Logística", problem: "As salas ficam reservadas e vazias.", proposal: "QR em cada sala para libertar a reserva.", impact: ["TEMPO"], frequency: "DIARIAMENTE", affected: ["TODA_TIS"], urgency: "BAIXA", gravity: "BAIXA" }) },
];

const FLOW_TO: Record<IdeaStatus, IdeaStatus[]> = {
  RECEBIDA: ["RECEBIDA"],
  EM_ANALISE: ["RECEBIDA", "EM_ANALISE"],
  INFO_PEDIDA: ["RECEBIDA", "EM_ANALISE", "INFO_PEDIDA"],
  EM_AVALIACAO: ["RECEBIDA", "EM_ANALISE", "EM_AVALIACAO"],
  DECISAO: ["RECEBIDA", "EM_ANALISE", "EM_AVALIACAO", "DECISAO"],
  RETIRADA: ["RECEBIDA", "EM_ANALISE", "RETIRADA"],
  DUPLICADA: ["RECEBIDA", "EM_ANALISE", "DUPLICADA"],
};

// ------------------------------------------------------------- Projectos (10 do Lab + 5 ventures)

const covers = {
  lab: "linear-gradient(135deg,#00cfcf 0%,#036ef2 100%)",
  lab2: "linear-gradient(135deg,#0b7a80 0%,#00cfcf 60%,#e0f8f8 100%)",
  lab3: "linear-gradient(135deg,#036ef2 0%,#9437ff 100%)",
  inc: "linear-gradient(135deg,#ff0066 0%,#9437ff 100%)",
  inc2: "linear-gradient(135deg,#ff7a1a 0%,#ff0066 100%)",
  inc3: "linear-gradient(135deg,#c4004f 0%,#ff0066 50%,#ffb4cf 100%)",
};

function projects(): Project[] {
  const P = (p: Partial<Project> & Pick<Project, "id" | "slug" | "name" | "area" | "stage" | "visibility" | "shortDescription" | "problem">, days: number, stageDays: number): Project => ({
    featured: false, securityKitPhase: 1, partnerIds: [], links: {}, exit: null, createdAt: ago(days), updatedAt: ago(Math.min(days, 5)), stageSince: ago(stageDays),
    sponsorId: "u_ce", history: [{ at: ago(days), text: "Projecto criado" }], ...p,
  });
  const atl = { jira: "https://jira.tis.example/browse/LAB", confluence: "https://confluence.tis.example/display/LAB", strateegia: "https://app.strateegia.example/journey/lab" };
  return [
    P({ id: "prj_l_kimbo", slug: "kimbo-assistente-ia-local", name: "Kimbo — assistente de IA local", area: "LAB", workLine: "L1", stage: "EXPERIMENTACAO", visibility: "PUBLICO", featured: true, cover: covers.lab3, theme: "Inteligência artificial",
      shortDescription: "Assistente de IA generativa que corre no centro de dados da TIS, em português de Angola, sem enviar dados para fora.",
      problem: "As equipas querem usar IA generativa, mas os dados de clientes não podem sair do país.", hypothesis: "Se dermos um assistente local às equipas de suporte, o tempo de resposta a pedidos internos cai 30 % em 8 semanas.",
      mainMetric: "Tempo médio de resposta a pedidos internos (meta: −30 % em 8 semanas)", killMetric: "Menos de 40 % de utilizadores activos semanais à semana 6", securityKitPhase: 2, partnerIds: ["prt_unifuturo"], links: atl,
      publicResults: "Piloto com 45 pessoas de duas direcções. 68 % usam o assistente todas as semanas.", decisions: "Gate de Estratégia aprovado no Comité de Inovação de Julho.",
      metrics: [{ label: "Utilizadores activos semanais", value: "68 %" }, { label: "Tempo de resposta", value: "−22 %" }, { label: "Custo por pedido", value: "0,4 Kz" }],
      learningCards: [{ title: "Respostas com fonte geram mais confiança", learned: "Mostrar a fonte de cada resposta aumentou a utilização em 18 pontos." }],
      internalNotes: "Precisamos de GPU adicional antes de alargar a 200 pessoas." }, 260, 50),
    P({ id: "prj_l_tickets", slug: "triagem-inteligente-de-tickets", name: "Triagem inteligente de tickets", area: "LAB", workLine: "L1", stage: "ESTRATEGIA", visibility: "INTERNO", cover: covers.lab, theme: "Inteligência artificial",
      shortDescription: "Classificar e encaminhar automaticamente os tickets de suporte, com explicação para o técnico.",
      problem: "20 % dos tickets vão para a equipa errada e perdem um dia.", hypothesis: "A classificação automática reduz para metade os reencaminhamentos.", links: atl }, 120, 22),
    P({ id: "prj_l_playbook", slug: "squad-playbook", name: "Squad Playbook", area: "LAB", workLine: "L2", stage: "PASSAGEM", visibility: "PUBLICO", featured: true, cover: covers.lab2, theme: "Formas de trabalhar",
      shortDescription: "Guia prático para equipas multidisciplinares, testado com cinco equipas-piloto da TIS.",
      problem: "Cada equipa trabalha à sua maneira e as passagens entre áreas falham.", hypothesis: "Um playbook comum reduz o tempo de arranque de novas equipas.",
      publicResults: "Cinco equipas-piloto reduziram o tempo de arranque de 6 para 2 semanas.", architectureValidatedAt: ago(40), securityKitPhase: 2, links: atl }, 300, 18),
    P({ id: "prj_l_portal", slug: "portal-de-autoatendimento", name: "Portal de autoatendimento", area: "LAB", workLine: "L3", stage: "EXPERIMENTACAO", visibility: "PUBLICO", featured: true, cover: covers.lab, theme: "Plataformas digitais",
      shortDescription: "Portal onde os clientes empresariais abrem pedidos, acompanham o estado e descarregam documentos.",
      problem: "Os clientes ligam para saber o estado dos pedidos; o call center fica sobrecarregado.", hypothesis: "Um portal reduz 25 % das chamadas de acompanhamento.",
      mainMetric: "Chamadas de acompanhamento (meta: −25 %)", killMetric: "Menos de 15 % dos clientes piloto a usar o portal ao fim de 4 semanas", partnerIds: ["prt_politecnico"], links: atl, architectureValidatedAt: ago(12) }, 180, 35),
    P({ id: "prj_l_ds", slug: "design-system-tis", name: "Design system TIS", area: "LAB", workLine: "L3", stage: "PASSAGEM", visibility: "PUBLICO", cover: covers.lab3, theme: "Plataformas digitais",
      shortDescription: "Componentes e regras de interface comuns a todos os produtos digitais da TIS.", problem: "Cada produto tinha componentes diferentes.",
      exit: { kind: "STANDARD", at: ago(30), reason: "O Digital Office adoptou o design system como standard." }, architectureValidatedAt: ago(70), securityKitPhase: 3,
      publicResults: "Adoptado como standard pelo Digital Office. 4 produtos já o usam." }, 400, 60),
    P({ id: "prj_l_conhecimento", slug: "base-de-conhecimento-de-incidentes", name: "Base de conhecimento de incidentes", area: "LAB", workLine: "L1", stage: "OPORTUNIDADE", visibility: "INTERNO", originIdeaId: "idea_12", cover: covers.lab2, theme: "Operações",
      shortDescription: "Soluções de incidentes passados numa base pesquisável com IA local.", problem: "Os técnicos resolvem várias vezes o mesmo incidente.", sponsorId: "u_glab" }, 100, 100),
    P({ id: "prj_l_ar", slug: "onboarding-realidade-aumentada", name: "Onboarding em realidade aumentada", area: "LAB", workLine: "L4", stage: "OPORTUNIDADE", visibility: "RESTRITO", cover: covers.lab3, theme: "Protótipos",
      shortDescription: "Protótipo de visita guiada aos centros de dados em realidade aumentada para clientes.", problem: "As visitas presenciais aos centros de dados são caras e limitadas por segurança.", securityKitPhase: 0 }, 25, 25),
    P({ id: "prj_l_ocr", slug: "leitor-de-facturas", name: "Leitor de facturas", area: "LAB", workLine: "L4", stage: "EXPERIMENTACAO", visibility: "INTERNO", originIdeaId: "idea_18", cover: covers.lab, theme: "Automação",
      shortDescription: "Protótipo de leitura automática de facturas para clientes empresariais.", problem: "Os clientes lançam facturas à mão no ERP.",
      hypothesis: "Dois clientes piloto aceitam pagar por factura processada.", mainMetric: "Precisão de leitura (meta: 95 %)", securityKitPhase: 1 }, 190, 62),
    P({ id: "prj_l_kanban", slug: "kanban-de-propostas", name: "Kanban de propostas", area: "LAB", workLine: "L2", stage: "PASSAGEM", visibility: "PUBLICO", featured: true, cover: covers.lab2, theme: "Formas de trabalhar",
      shortDescription: "Quadro visual para gerir propostas comerciais, agora usado pela Direcção Comercial.", problem: "As propostas atrasavam sem ninguém saber.",
      exit: { kind: "DIRECCAO", at: ago(45), reason: "Transferido para a Direcção Comercial, que o usa no dia a dia." }, architectureValidatedAt: ago(80),
      publicResults: "Tempo médio de resposta a pedidos de proposta caiu 35 %." }, 350, 90),
    P({ id: "prj_l_compliance", slug: "chat-de-compliance", name: "Chat de compliance", area: "LAB", workLine: "L1", stage: "EXPERIMENTACAO", visibility: "INTERNO", cover: covers.lab3, theme: "Inteligência artificial",
      shortDescription: "Assistente para perguntas sobre políticas internas.", problem: "As perguntas de compliance demoram dias.",
      exit: { kind: "ENCERRADO", at: ago(20), reason: "Métrica de abandono atingida: utilização abaixo de 10 %." },
      learningCards: [{ title: "Perguntas raras não justificam um assistente", learned: "Com poucas perguntas por mês, uma FAQ bem escrita resolve." }] }, 220, 80),
    // Ventures
    P({ id: "prj_v_kitanda", slug: "kitanda-pay", name: "Kitanda Pay", area: "INCUBADORA", track: "EXTERNA", stage: "CRESCIMENTO", visibility: "PUBLICO", featured: true, originIdeaId: "idea_01", cover: covers.inc2, theme: "Pagamentos",
      shortDescription: "Pagamentos por QR e USSD para os mercados informais de Luanda.", problem: "As vendedoras perdem vendas por falta de meios de pagamento digitais.",
      partnerIds: ["prt_kitanda", "prt_acelera"], publicResults: "1 200 vendedoras activas em 4 mercados. Volume mensal a crescer 18 %.", securityKitPhase: 2, sponsorId: "u_ce",
      metrics: [{ label: "Vendedoras activas", value: "1 200" }, { label: "Crescimento mensal", value: "18 %" }] }, 160, 40),
    P({ id: "prj_v_agro", slug: "agrosense-angola", name: "AgroSense Angola", area: "INCUBADORA", track: "EXTERNA", stage: "INCUBACAO", visibility: "PUBLICO", featured: true, cover: covers.inc, theme: "Agricultura",
      shortDescription: "Sensores de solo e previsões por SMS para pequenos agricultores do planalto central.", problem: "Os agricultores regam e adubam sem informação, com perdas de colheita.",
      partnerIds: ["prt_agro"], publicResults: "Piloto com 80 agricultores no Huambo." }, 90, 60),
    P({ id: "prj_v_datavault", slug: "datavault", name: "DataVault", area: "INCUBADORA", track: "INTERNA", stage: "INCUBACAO", visibility: "RESTRITO", cover: covers.inc3, theme: "Dados",
      shortDescription: "Cofre de dados soberano para instituições financeiras, nascido no Lab.", problem: "Os bancos precisam de guardar e analisar dados sem sair do país.",
      architectureValidatedAt: ago(15), securityKitPhase: 2, workLine: "L1",
      history: [{ at: ago(200), text: "Projecto criado" }, { at: ago(6), text: "Transferido do Lab para a Incubadora: modelo de negócio próprio" }] }, 200, 6),
    P({ id: "prj_v_edulink", slug: "edulink", name: "EduLink", area: "INCUBADORA", track: "EXTERNA", stage: "PRONTA_SAIDA", visibility: "INTERNO", cover: covers.inc2, theme: "Educação",
      shortDescription: "Plataforma de pagamento de propinas e comunicação escola-família.", problem: "As famílias pagam propinas em filas e perdem comunicados.", partnerIds: ["prt_unifuturo"] }, 280, 30),
    P({ id: "prj_v_seguria", slug: "seguria", name: "SegurIA", area: "INCUBADORA", track: "INTERNA", stage: "PRONTA_SAIDA", visibility: "RESTRITO", cover: covers.inc, theme: "Cibersegurança",
      shortDescription: "Detecção de ameaças com IA para PME.", problem: "As PME não têm equipas de segurança.",
      exit: { kind: "SPIN_OFF", at: ago(15), reason: "Empresa autónoma com participação da TIS, decidida no Comité de incubação." } }, 420, 60),
  ];
}

function gates(): Gate[] {
  const g = (id: string, projectId: string, stage: string, decision: Gate["decision"], evidence: string, days: number, decidedBy = "Comité de Inovação"): Gate => ({ id, projectId, stage, decision, evidence, at: ago(days), decidedBy });
  return [
    g("gate_1", "prj_l_kimbo", "OPORTUNIDADE", "CONTINUAR", "Cartão de oportunidade com 12 entrevistas.", 200),
    g("gate_2", "prj_l_kimbo", "ESTRATEGIA", "CONTINUAR", "Matriz de scoring (81/100) e GUT 75.", 50),
    g("gate_3", "prj_l_playbook", "OPORTUNIDADE", "CONTINUAR", "Cartão de oportunidade.", 260),
    g("gate_4", "prj_l_playbook", "ESTRATEGIA", "CONTINUAR", "Matriz de scoring.", 180),
    g("gate_5", "prj_l_playbook", "EXPERIMENTACAO", "CONTINUAR", "Test cards de 5 equipas e learning card.", 18),
    g("gate_6", "prj_l_portal", "OPORTUNIDADE", "CONTINUAR", "Cartão de oportunidade.", 140),
    g("gate_7", "prj_l_portal", "ESTRATEGIA", "MUDAR", "Mudou de público: só clientes empresariais.", 35),
    g("gate_8", "prj_l_compliance", "EXPERIMENTACAO", "ENCERRAR", "Métrica de abandono: 8 % de utilização.", 20),
    g("gate_9", "prj_l_ocr", "OPORTUNIDADE", "CONTINUAR", "Duas cartas de interesse de clientes.", 120),
    g("gate_10", "prj_l_ocr", "ESTRATEGIA", "CONTINUAR", "GUT 64.", 62),
    g("gate_11", "prj_v_kitanda", "INCUBACAO", "CONTINUAR", "300 clientes e receita recorrente.", 40, "Comité de incubação"),
  ];
}

function team(): TeamMember[] {
  const t = (projectId: string, list: [string, TeamMember["role"], string?][]) => list.map(([name, role, userId], i) => ({ id: `tm_${projectId}_${i}`, projectId, name, role, userId: userId ?? null }));
  return [
    ...t("prj_l_kimbo", [["Bruno Mateus", "RESPONSAVEL", "u_glab"], ["Feliciano Lopes", "ROTATIVO", "u_colab2"], ["Joana Ferraz", "MEMBRO"], ["Ana Domingos", "CHAMPION", "u_colab"]]),
    ...t("prj_l_tickets", [["Joana Ferraz", "RESPONSAVEL"], ["Feliciano Lopes", "CHAMPION", "u_colab2"]]),
    ...t("prj_l_playbook", [["Bruno Mateus", "RESPONSAVEL", "u_glab"], ["Graça Manuel", "ROTATIVO", "u_colab3"]]),
    ...t("prj_l_portal", [["Kiala Bento", "RESPONSAVEL"], ["Ana Domingos", "CHAMPION", "u_colab"]]),
    ...t("prj_l_ds", [["Lúcia Vaz", "RESPONSAVEL"]]),
    ...t("prj_l_conhecimento", [["Feliciano Lopes", "RESPONSAVEL", "u_colab2"]]),
    ...t("prj_l_ar", [["Kiala Bento", "RESPONSAVEL"]]),
    ...t("prj_l_ocr", [["Joana Ferraz", "RESPONSAVEL"], ["Feliciano Lopes", "MEMBRO", "u_colab2"]]),
    ...t("prj_l_kanban", [["Lúcia Vaz", "RESPONSAVEL"], ["Ana Domingos", "CHAMPION", "u_colab"]]),
    ...t("prj_l_compliance", [["Joana Ferraz", "RESPONSAVEL"]]),
    ...t("prj_v_kitanda", [["Eva Kiala", "RESPONSAVEL", "u_ext"], ["Carla Neto", "MEMBRO", "u_ginc"]]),
    ...t("prj_v_agro", [["Mateus Chilala", "RESPONSAVEL"]]),
    ...t("prj_v_datavault", [["Carla Neto", "RESPONSAVEL", "u_ginc"]]),
    ...t("prj_v_edulink", [["Nádia Sousa", "RESPONSAVEL"]]),
    ...t("prj_v_seguria", [["Osvaldo Pinto", "RESPONSAVEL"]]),
  ];
}

// ------------------------------------------------------------- Desafios, conteúdos e parceiros

function challenges(): Challenge[] {
  return [
    { id: "dsf_inclusao", slug: "inclusao-financeira-nos-mercados", title: "Inclusão financeira nos mercados", area: "INCUBADORA", audience: "AMBOS", status: "ABERTO", visibility: "PUBLICO", contentStatus: "PUBLICADO",
      problem: "Milhões de angolanos fazem compras e vendas diárias sem acesso a serviços financeiros digitais.", context: "Os mercados informais movimentam grande parte do comércio do país. A TIS quer apoiar soluções que liguem vendedores e compradores a pagamentos, poupança e crédito.",
      lookingFor: "Soluções de pagamento, poupança ou microcrédito que funcionem em telemóveis básicos e com pouca rede.", criteria: ["Impacto no número de pessoas incluídas", "Funciona offline ou com pouca rede", "Modelo de negócio sustentável", "Equipa"],
      opensAt: ago(40), closesAt: ahead(48), benefits: "Mentoria da Incubadora, acesso a ambiente de testes e entrada directa na coorte 2027-A.", cover: covers.inc2, targetParticipations: 30,
      faq: [{ q: "Posso participar sem empresa constituída?", a: "Sim. Pessoas individuais e equipas informais podem participar." }, { q: "A TIS fica com a propriedade intelectual?", a: "Não. Os termos de propriedade intelectual estão na página Termos." }] },
    { id: "dsf_ia_atendimento", slug: "ia-para-o-atendimento", title: "IA para o atendimento ao cliente", area: "LAB", audience: "COLABORADORES", status: "ABERTO", visibility: "PUBLICO", contentStatus: "PUBLICADO",
      problem: "O call center recebe perguntas repetidas que podiam ser resolvidas por um assistente.", context: "O Lab tem um modelo de IA local (Kimbo) e procura casos de uso no atendimento.",
      lookingFor: "Ideias de colaboradores sobre onde a IA pode ajudar o atendimento, com dados que já temos.", criteria: ["Volume de pedidos afectados", "Dados disponíveis", "Risco para o cliente"],
      opensAt: ago(20), closesAt: ahead(33), benefits: "As ideias seleccionadas entram no Lab com uma equipa e o autor como champion.", cover: covers.lab3, targetParticipations: 25,
      faq: [{ q: "Preciso de saber programar?", a: "Não. Precisamos de quem conhece o problema." }] },
    { id: "dsf_energia", slug: "energia-limpa-para-pme", title: "Energia limpa para PME", area: "INCUBADORA", audience: "EXTERNOS", status: "EM_AVALIACAO", visibility: "PUBLICO", contentStatus: "PUBLICADO",
      problem: "As PME gastam muito em geradores a gasóleo.", context: "Procurámos soluções de energia solar e gestão de consumo.", lookingFor: "Soluções de energia limpa com modelo de pagamento acessível.",
      criteria: ["Poupança para a PME", "Escalabilidade", "Equipa"], opensAt: ago(120), closesAt: ago(15), benefits: "Piloto com clientes da TIS.", cover: covers.inc, targetParticipations: 20, faq: [] },
  ];
}

function contents(): Content[] {
  const c = (o: Partial<Content> & Pick<Content, "id" | "slug" | "kind" | "title" | "summary">, days: number): Content => ({ body: "", visibility: "PUBLICO", status: "PUBLICADO", createdAt: ago(days), publishedAt: ago(days), ...o });
  return [
    // 6 notícias e eventos
    c({ id: "cnt_n1", slug: "kimbo-chega-a-duas-direccoes", kind: "NOTICIA", title: "Kimbo chega a duas direcções", summary: "O assistente de IA local do Lab já é usado todas as semanas por 68 % das pessoas do piloto.", cover: covers.lab3, projectIds: ["prj_l_kimbo"],
      body: "O Kimbo, o assistente de IA generativa que corre no centro de dados da TIS, entrou na etapa de Experimentação.\n\nNo piloto com 45 pessoas de duas direcções, 68 % usam-no todas as semanas. O tempo de resposta a pedidos internos caiu 22 %.\n\nA próxima etapa é validar a arquitectura com o Digital Office e preparar a passagem ao negócio." }, 12),
    c({ id: "cnt_n2", slug: "kitanda-pay-chega-a-quatro-mercados", kind: "NOTICIA", title: "Kitanda Pay chega a quatro mercados", summary: "A venture da Incubadora já tem 1 200 vendedoras activas.", cover: covers.inc2, projectIds: ["prj_v_kitanda"],
      body: "A Kitanda Pay, startup da coorte 2026-B, chegou a quatro mercados de Luanda.\n\nCom pagamentos por QR e USSD, 1 200 vendedoras já recebem pagamentos digitais. O volume mensal cresce 18 %." }, 20),
    c({ id: "cnt_e1", slug: "demo-day-2026-b", kind: "DEMO_DAY", title: "Demo Day da coorte 2026-B", summary: "Cinco startups apresentam os resultados a clientes, parceiros e investidores.", date: ahead(30), place: "Auditório TIS, Talatona (fictício)", signupUrl: "https://eventos.example/demo-day-2026b", cover: covers.inc,
      body: "Venha conhecer as startups da coorte 2026-B. Cada equipa tem 7 minutos para mostrar o que construiu e os resultados com clientes." }, 6),
    c({ id: "cnt_e2", slug: "workshop-ia-local", kind: "EVENTO", title: "Workshop aberto: IA local em português", summary: "Sessão prática com a equipa do Lab sobre modelos de linguagem que correm em Angola.", date: ahead(12), place: "Innovation Lab, Luanda", signupUrl: "https://eventos.example/workshop-ia", cover: covers.lab,
      body: "Uma tarde para experimentar modelos abertos de linguagem, afinados em português, a correr em servidores locais. Traga o seu portátil." }, 4),
    c({ id: "cnt_f1", slug: "formacao-design-thinking", kind: "FORMACAO", title: "Formação aberta: design thinking para equipas", summary: "Dois dias para aprender a ouvir utilizadores e prototipar depressa.", date: ahead(21), place: "Online", signupUrl: "https://academia.example/design-thinking", cover: covers.lab2,
      body: "Formação da Academia TIS, aberta a universidades parceiras." }, 9),
    c({ id: "cnt_n3", slug: "resultados-do-forum-de-outubro", kind: "NOTICIA", title: "Resultados do Fórum de Portfólio de Outubro", summary: "Três projectos passaram o gate e um foi encerrado com lições.", visibility: "INTERNO", cover: covers.lab3,
      body: "No Fórum de Portfólio de Outubro validámos as prioridades do trimestre. Squad Playbook passou à etapa de Passagem ao negócio; Chat de compliance foi encerrado com as lições registadas." }, 3),
    // Aprender (P28)
    ...[
      ["cnt_r1", "Cartão de oportunidade", "Template para descrever o problema, quem o sente e a evidência.", "TEMPLATE", "Método"],
      ["cnt_r2", "Test card", "Hipótese, teste, métrica e critério de sucesso numa página.", "TEMPLATE", "Método"],
      ["cnt_r3", "Learning card", "O que aprendemos e o que vamos fazer a seguir.", "TEMPLATE", "Método"],
      ["cnt_r4", "Pacote de handover", "Checklist para passar um projecto ao negócio, com controlo aos 7 e aos 21 dias.", "CHECKLIST", "Método"],
      ["cnt_r5", "Equipa-piloto: Squad Playbook", "Cinco equipas reduziram o tempo de arranque de 6 para 2 semanas.", "PILOTO", "Formas de trabalhar"],
      ["cnt_r6", "Demonstração: Kimbo para propostas", "Demo reutilizável do assistente local para propostas a bancos.", "DEMO", "IA"],
      ["cnt_r7", "Demonstração: Portal de autoatendimento", "Vídeo e ambiente de demonstração para clientes empresariais.", "DEMO", "Plataformas"],
    ].map(([id, title, summary, type, theme], i) => c({ id, slug: id, kind: "RECURSO", title, summary, visibility: "INTERNO", meta: { type, theme, file: `${id}.pdf` } }, 30 + i)),
    ...[
      ["cnt_t1", "Academia TIS: fundamentos de IA generativa", "https://academia.example/ia", "IA"],
      ["cnt_t2", "School TIS Tech: desenvolvimento web moderno", "https://school.example/web", "Plataformas"],
      ["cnt_t3", "Academia TIS: gestão ágil de produto", "https://academia.example/produto", "Formas de trabalhar"],
    ].map(([id, title, url, theme], i) => c({ id, slug: id, kind: "FORMACAO", title, summary: "Formação interna com inscrição aberta.", signupUrl: url, visibility: "INTERNO", date: ahead(10 + i * 7), place: "Online", meta: { theme } }, 15 + i)),
    // Comunidade (P29)
    ...[
      ["cnt_c1", "Joana Ferraz", "Champion de IA", "Laboratório"],
      ["cnt_c2", "Ana Domingos", "Champion comercial", "Direcção Comercial"],
      ["cnt_c3", "Feliciano Lopes", "Champion de operações", "Operações e Suporte"],
      ["cnt_c4", "Graça Manuel", "Champion de pessoas", "Pessoas e Cultura"],
    ].map(([id, title, role, area]) => c({ id, slug: id, kind: "CHAMPION", title, summary: role, visibility: "INTERNO", meta: { area, contact: `${title.split(" ")[0].toLowerCase()}@${DEMO_DOMAIN}` } }, 60)),
    c({ id: "cnt_h1", slug: "destaque-outubro-1", kind: "DESTAQUE", title: "Feliciano Lopes", summary: "A ideia da base de conhecimento de incidentes passou a projecto do Lab.", visibility: "INTERNO", meta: { badge: "Ideia seleccionada", month: "Outubro" } }, 5),
    c({ id: "cnt_h2", slug: "destaque-outubro-2", kind: "DESTAQUE", title: "Pedido de férias em 3 cliques", summary: "A ideia mais apoiada do mês, com 14 apoios.", visibility: "INTERNO", meta: { badge: "Mais apoiada", month: "Outubro" } }, 5),
    c({ id: "cnt_h3", slug: "coorte-2026-b", kind: "DESTAQUE", title: "Coorte 2026-B", summary: "Cinco startups em incubação, uma em crescimento.", visibility: "PUBLICO", meta: { cohort: "2026-B" } }, 100),
    c({ id: "cnt_h4", slug: "coorte-2026-a", kind: "DESTAQUE", title: "Coorte 2026-A", summary: "Quatro startups; uma spin-off.", visibility: "PUBLICO", meta: { cohort: "2026-A" } }, 250),
    ...[
      ["cnt_a1", "Fórum de Portfólio e Competência", ahead(8), "Mensal"],
      ["cnt_a2", "Comité de Inovação (T4)", ahead(40), "Trimestral"],
      ["cnt_a3", "Comité de incubação (T4)", ahead(45), "Trimestral, com o CEO"],
      ["cnt_a4", "Sessão aberta do Lab: o que estamos a testar", ahead(5), "Aberta a todos"],
    ].map(([id, title, date, summary]) => c({ id, slug: id, kind: "AGENDA", title, summary, date, place: "Sala Kwanza / Teams", visibility: "INTERNO" }, 10)),
    // Equipa do Lab (P03)
    ...[
      ["cnt_q1", "Bruno Mateus", "Gestor do Innovation Lab"],
      ["cnt_q2", "Joana Ferraz", "Engenheira de IA"],
      ["cnt_q3", "Kiala Bento", "Designer de produto"],
      ["cnt_q4", "Lúcia Vaz", "Engenheira de software"],
    ].map(([id, title, summary]) => c({ id, slug: id, kind: "EQUIPA", title, summary, meta: { photoAuthorized: "false" } }, 200)),
  ];
}

function partners(): Partner[] {
  return [
    { id: "prt_unifuturo", name: "Universidade do Futuro", kind: "UNIVERSIDADE", logo: "UF", description: "Universidade pública com grupo de investigação em aprendizagem automática.", together: "Investigação aplicada em IA local e estágios no Lab.", disclosureAuthorized: true },
    { id: "prt_politecnico", name: "Instituto Politécnico Kalandula", kind: "UNIVERSIDADE", logo: "IK", description: "Instituto politécnico com cursos de engenharia de software.", together: "Estágios de verão e projectos finais de curso.", disclosureAuthorized: true },
    { id: "prt_acelera", name: "Acelera Angola", kind: "PROGRAMA", logo: "AA", description: "Programa de aceleração de startups de impacto.", together: "Co-organização das coortes e mentoria.", disclosureAuthorized: true },
    { id: "prt_kitanda", name: "Kitanda Digital", kind: "STARTUP", logo: "KD", description: "Startup de pagamentos para o comércio informal.", together: "Venture em crescimento na Incubadora.", disclosureAuthorized: true },
    { id: "prt_agro", name: "AgroSense", kind: "STARTUP", logo: "AS", description: "Agricultura de precisão para pequenos produtores.", together: "Venture em incubação.", disclosureAuthorized: true },
    { id: "prt_horizonte", name: "Banco Horizonte", kind: "EMPRESA", logo: "BH", description: "Cliente-âncora de projectos de IA.", together: "Piloto de detecção de fraude.", disclosureAuthorized: false },
    { id: "prt_energia", name: "Luz do Planalto", kind: "EMPRESA", logo: "LP", description: "Distribuidora de soluções solares.", together: "Parceira do desafio de energia.", disclosureAuthorized: true },
  ];
}

export function defaultSettings(): Settings {
  const q = (a: number, b: number, c: number, d: number) => [a, b, c, d] as [number, number, number, number];
  return {
    responseDeadlineDays: 10,
    fastTrackWeeklyQuota: 3,
    retentionMonths: 24,
    stalledProjectDays: 30,
    termsVersion: "2026.1",
    privacyVersion: "2026.1",
    homeNumbers: { ideas: null, activeProjects: null, startups: null, partners: null },
    okrs: [
      { key: "O1", title: "Ideias avaliadas no prazo", unit: "%", planned: q(70, 80, 85, 90), actual: q(62, 78, 84, 0) },
      { key: "O2", title: "Projectos do Lab em Experimentação", unit: "n.º", planned: q(2, 3, 4, 5), actual: q(2, 3, 3, 0) },
      { key: "O3", title: "Resultados em uso no negócio", unit: "n.º", planned: q(0, 1, 2, 3), actual: q(0, 1, 2, 0) },
      { key: "O4", title: "Colaboradores capacitados pelo Lab", unit: "pessoas", planned: q(50, 120, 200, 300), actual: q(48, 131, 190, 0) },
      { key: "O5", title: "Parcerias académicas activas", unit: "n.º", planned: q(1, 2, 2, 3), actual: q(1, 2, 2, 0) },
      { key: "O6", title: "Casos de IA local em produção", unit: "n.º", planned: q(0, 0, 1, 2), actual: q(0, 0, 1, 0) },
    ],
    pendingDecisions: [
      ...Array.from({ length: 11 }, (_, i) => ({
        key: `D-${i + 1}`,
        title: ["Orçamento anual do Lab", "Modelo de imputação de horas", "Política de propriedade intelectual", "Envelope da coorte 2027-A", "Infraestrutura GPU para IA local", "Regras de participação em startups", "Critérios de spin-off", "Quota da via rápida", "Integração com o strateegia", "Plano de capacitação 2027", "Indicadores do Comité de Inovação"][i],
        dueDate: ahead(10 + i * 9),
        done: i < 3,
      })),
      { key: "F-1", title: "Fronteira Lab / Digital Office: quem valida a arquitectura", dueDate: ahead(20), done: false },
      { key: "F-2", title: "Fronteira Lab / Incubadora: critérios de passagem", dueDate: ahead(25), done: false },
      { key: "F-3", title: "Fronteira Incubadora / TIS Capital", dueDate: ahead(60), done: false },
      { key: "F-4", title: "Fronteira ecossistema / direcções de negócio", dueDate: ahead(35), done: true },
    ],
    tisAreas: ["Direcção Comercial", "Direcção Financeira", "Operações e Suporte", "Pessoas e Cultura", "Logística", "Sistemas de Informação", "Jurídico e Compliance", "Marketing", "Toda a TIS"],
    sectors: ["Banca", "Telecomunicações", "Energia", "Saúde", "Educação", "Sector público", "Agricultura", "Outro"],
    themes: ["Inteligência artificial", "Plataformas digitais", "Pagamentos", "Dados", "Formas de trabalhar", "Automação", "Cibersegurança", "Sustentabilidade"],
    crossAreaReadOnly: true,
    restrictedVisibilityEnabled: true,
    anonymousRevealEnabled: true,
    integrations: {
      teams: { enabled: true, webhookUrl: "" },
      jira: { enabled: true, baseUrl: "https://jira.tis.example", project: "LAB" },
      confluence: { enabled: true, baseUrl: "https://confluence.tis.example", space: "LAB" },
    },
    incubationFinancials: { cohortEnvelope: "Introduzido manualmente pelo gestor da Incubadora", notes: "Valores de demonstração." },
  };
}

// ------------------------------------------------------------- Montagem

export function buildSeed(): DB {
  const us = users();
  const crit = criteriaSets();
  const prj = projects();
  const statusHistory: StatusChange[] = [];
  const messages: Message[] = [];
  const anonAuthorships: DB["anonAuthorships"] = [];
  const aiAnalyses: AiAnalysis[] = [];
  const consents: DB["consents"] = [];
  const ideas: Idea[] = IDEAS.map((s, n) => {
    const createdAt = ago(s.days, 10);
    const steps = FLOW_TO[s.status];
    const span = Math.max(1, s.days - 1);
    let prev: string | null = null;
    steps.forEach((st, i) => {
      statusHistory.push({ id: `st_${s.id}_${i}`, entity: "IDEA", entityId: s.id, from: prev, to: st, byId: i === 0 ? null : s.assignee ?? "u_glab", at: ago(Math.round(s.days - (span * i) / steps.length), 10 + i), note: st === "DUPLICADA" ? "Juntada a ID-2026-0003" : undefined });
      prev = st;
    });
    const firstResponseAt = steps.length > 1 ? ago(Math.round(s.days - span / steps.length), 11) : null;
    const isAnon = s.origin.startsWith("ANONIMA");
    const idea: Idea = {
      id: s.id,
      number: `ID-2026-${String(n + 1).padStart(4, "0")}`,
      type: s.type,
      origin: s.origin,
      authorId: isAnon ? null : s.author,
      title: s.title,
      summary: s.summary,
      answers: s.answers,
      area: s.type === "EXTERNA" ? "INCUBADORA" : "LAB",
      status: s.status,
      decision: s.decision ?? null,
      decisionReason: s.reason,
      nextStep: s.next,
      assigneeId: s.assignee ?? null,
      challengeId: s.challenge ?? null,
      duplicateOfId: s.dup ?? null,
      projectId: s.project ?? null,
      termsVersion: "2026.1",
      theme: (s.answers.sector as string) ?? (s.answers.category as string),
      affectedArea: s.affected,
      managerScore: s.managerScore ?? null,
      createdAt,
      updatedAt: ago(Math.max(0, Math.round(s.days / 4))),
      firstResponseAt,
      similarConfirmed: s.id === "idea_11" ? ["idea_10"] : s.id === "idea_10" ? ["idea_11"] : [],
    };
    if (isAnon) {
      anonAuthorships.push({
        id: `anon_${s.id}`,
        ideaId: s.id,
        userRefEnc: s.anonUser ? seal(s.anonUser) : null,
        userLookup: s.anonUser ? lookupRef(s.anonUser) : null,
        codeHash: s.code ? hashTrackingCode(s.code) : null,
        notifyEmailEnc: s.notifyEmail ? seal(s.notifyEmail) : null,
      });
    }
    consents.push({ id: `cns_${s.id}`, userId: isAnon ? null : s.author, ideaId: s.id, document: "TERMOS", version: "2026.1", at: createdAt });
    return idea;
  });
  // Análises da IA (mock determinístico), excepto «pendente» e «falhou»
  for (const idea of ideas) {
    const seed = IDEAS.find((s) => s.id === idea.id)!;
    const set = crit.find((c) => c.ideaKind === (idea.type === "MELHORIA" ? "MELHORIA" : "EXTERNA_NEGOCIO"))!;
    const at = ago(seed.days, 11);
    if (seed.ai === "pending") {
      aiAnalyses.push({ id: `ai_${idea.id}`, ideaId: idea.id, criteriaSetId: set.id, criteriaVersion: set.version, status: "PENDENTE", scores: [], total: 0, similar: [], risks: [], completeness: { weakFields: [], questions: [] }, summary: "", feedbackDraft: "", createdAt: at });
      continue;
    }
    if (seed.ai === "failed") {
      aiAnalyses.push({ id: `ai_${idea.id}`, ideaId: idea.id, criteriaSetId: set.id, criteriaVersion: set.version, status: "FALHOU", scores: [], total: 0, similar: [], risks: [], completeness: { weakFields: [], questions: [] }, summary: "", feedbackDraft: "", error: "Tempo limite excedido ao contactar o modelo (demonstração).", provider: "mock", createdAt: at });
      continue;
    }
    const input = buildAiInput(idea, set, ideas);
    aiAnalyses.push({ id: `ai_${idea.id}`, ...toAnalysis(mockAnalyze(input), input, idea.id, "mock", at) });
  }
  const workLines: Record<string, Idea["workLine"]> = { idea_10: "L3", idea_11: "L2", idea_12: "L1", idea_14: "L3", idea_15: "L3", idea_17: "L1", idea_18: "L4", idea_19: "L2", idea_04: "L1" };
  for (const i of ideas) i.workLine = workLines[i.id] ?? null;

  // Mensagens
  const msg = (id: string, ideaId: string, kind: Message["kind"], text: string, days: number, fromTeam = true, by = "u_ginc"): Message => ({ id, ideaId, authorId: fromTeam ? by : null, fromTeam, kind, text, attachments: [], validatedById: fromTeam ? by : null, at: ago(days, 14), readAt: days > 3 ? ago(days - 1) : null });
  messages.push(
    msg("msg_1", "idea_01", "MENSAGEM", "Olá Eva, obrigado pela submissão. Podemos marcar uma conversa para conhecer a equipa?", 180),
    msg("msg_2", "idea_01", "RESPOSTA", "Claro! Estamos disponíveis na próxima semana.", 179, false),
    msg("msg_3", "idea_01", "FEEDBACK", "Parabéns! A Kitanda Pay foi seleccionada para a coorte 2026-B. A Carla Neto vai acompanhar a equipa.", 160),
    msg("msg_4", "idea_02", "PEDIDO_INFO", "Para avançarmos, pode dizer-nos quantos técnicos já tem identificados e em que bairros quer começar?", 3),
    msg("msg_5", "idea_06", "FEEDBACK", "Obrigado pela ideia. Neste momento não a vamos seleccionar: falta um modelo de negócio e uma equipa. Pode voltar a submeter com um protótipo.", 50),
    msg("msg_6", "idea_07", "FEEDBACK", "A sua ideia ficou em lista de espera até fecharmos o desafio de energia. Voltamos a falar em Dezembro.", 80),
    msg("msg_7", "idea_12", "FEEDBACK", "A sua ideia foi seleccionada e vai ser um projecto do Lab. Gostaríamos que fosse o responsável.", 100, true, "u_glab"),
    msg("msg_8", "idea_15", "PEDIDO_INFO", "Que ferramenta usam hoje para as propostas? E quantas propostas fazem por mês?", 6, true, "u_glab"),
    msg("msg_9", "idea_20", "FEEDBACK", "Obrigado! Já existe um projecto da Direcção de Sistemas para isto; partilhámos a sua ideia com essa equipa.", 60, true, "u_glab"),
    msg("msg_10", "idea_05", "MENSAGEM", "Obrigado pela submissão. A equipa da Incubadora já está a analisar a sua ideia.", 5),
  );

  const reactions: Reaction[] = [];
  const rx = (id: string, ideaId: string, userId: string, kind: Reaction["kind"], text?: string, days = 10, parentId?: string) => reactions.push({ id, ideaId, userId, kind, text, at: ago(days, 15), parentId: parentId ?? null });
  ["u_colab2", "u_colab3", "u_glab", "u_ce"].forEach((u, i) => rx(`rx_s10_${i}`, "idea_10", u, "APOIO"));
  ["u_colab", "u_colab2"].forEach((u, i) => rx(`rx_s11_${i}`, "idea_11", u, "APOIO"));
  ["u_colab", "u_colab3"].forEach((u, i) => rx(`rx_s12_${i}`, "idea_12", u, "APOIO"));
  rx("rx_c1", "idea_10", "u_colab2", "COMENTARIO", "Na nossa equipa perdemos pedidos todos os meses. Apoio!", 30);
  rx("rx_c2", "idea_10", "u_colab3", "COMENTARIO", "Do lado de Pessoas e Cultura, ajudamos a definir as regras do saldo.", 28);
  rx("rx_c3", "idea_10", "u_colab", "COMENTARIO", "Obrigada! Vou juntar as regras ao protótipo.", 27, "rx_c2");
  rx("rx_c4", "idea_11", "u_colab3", "COMENTARIO", "Podíamos começar pelas equipas de projecto.", 20);
  rx("rx_i1", "idea_10", "u_colab3", "INTERESSE");

  const supportRequests: SupportRequest[] = [
    { id: "sup_1", type: "PROTOTIPO", proposal: "Banco Horizonte — demo de IA local (PROP-2026-118)", costCenter: "CC-COM-04", description: "Demonstração do Kimbo para uma proposta de IA local a um banco.", dueDate: ahead(6), urgent: true, status: "ACEITE", requestedById: "u_colab", createdAt: ago(3), acceptedAt: ago(2) },
    { id: "sup_2", type: "FORMACAO", proposal: "Formação em design thinking para a equipa comercial", costCenter: "CC-COM-04", description: "Sessão de meio dia para 12 pessoas.", dueDate: ahead(25), urgent: false, status: "RECEBIDO", requestedById: "u_colab", createdAt: ago(1) },
    { id: "sup_3", type: "ARQUITECTURA", proposal: "Integração ERP do cliente X", costCenter: "CC-OPS-02", description: "Precisamos de validar a arquitectura de integração.", dueDate: ahead(10), urgent: false, status: "ENCAMINHADO", requestedById: "u_colab2", createdAt: ago(8) },
    { id: "sup_4", type: "PROPOSTA", proposal: "Proposta de portal para cliente do sector público", costCenter: "CC-COM-01", description: "Apoio técnico na secção de solução.", dueDate: ago(5), urgent: false, status: "CONCLUIDO", requestedById: "u_colab2", createdAt: ago(30), acceptedAt: ago(29) },
    { id: "sup_5", type: "PROTOTIPO", proposal: "Demo do portal de autoatendimento", costCenter: "CC-COM-02", description: "Ambiente de demonstração para um cliente.", dueDate: ahead(3), urgent: true, status: "EM_CURSO", requestedById: "u_colab3", createdAt: ago(4), acceptedAt: ago(3) },
  ];

  return {
    users: us,
    ideas,
    anonAuthorships,
    statusHistory: [
      ...statusHistory,
      { id: "st_p1", entity: "PROJECT", entityId: "prj_v_datavault", from: "LAB:EXPERIMENTACAO", to: "INCUBADORA:INCUBACAO", byId: "u_glab", note: "Saída: Incubadora (trilha interna)", at: ago(6) },
    ],
    aiAnalyses,
    criteriaSets: crit,
    assessments: ideas.filter((i) => i.managerScore != null).map((i) => ({ id: `as_${i.id}`, ideaId: i.id, managerId: i.assigneeId ?? "u_glab", scores: {}, finalScore: i.managerScore!, aiScore: aiAnalyses.find((a) => a.ideaId === i.id)?.total, at: i.updatedAt })),
    messages,
    projects: prj,
    gates: gates(),
    teamMembers: team(),
    visibilityChanges: prj.filter((p) => p.visibility === "PUBLICO").map((p) => ({ id: `vis_${p.id}`, projectId: p.id, from: "INTERNO" as const, to: "PUBLICO" as const, byId: p.area === "LAB" ? "u_glab" : "u_ginc", checklist: { noClientData: true, partnerAuthorized: true, noFinancial: true, reviewed: true }, at: ago(30) })),
    challenges: challenges(),
    contents: contents(),
    partners: partners(),
    supportRequests,
    reactions,
    notifications: [
      { id: "ntf_1", userId: "u_ext", title: "Precisamos de mais informação", body: "A equipa da Incubadora fez uma pergunta sobre a ideia ID-2026-0002.", href: "/conta/ideias/idea_02", channels: ["APP", "EMAIL"], at: ago(3, 14) },
      { id: "ntf_2", userId: "u_colab", title: "A sua ideia está em avaliação", body: "Pedido de férias em 3 cliques passou a triagem.", href: "/conta/ideias/idea_10", channels: ["APP", "EMAIL", "TEAMS"], at: ago(20) },
      { id: "ntf_3", userId: "u_glab", title: "Nova ideia na fila: ID-2026-0013", body: "Onboarding digital para novos colaboradores", href: "/gestao/triagem?ideia=idea_13", channels: ["APP", "EMAIL", "TEAMS"], at: ago(1) },
      { id: "ntf_4", userId: "u_ginc", title: "Projecto passado do Lab: DataVault", body: "Aceite e defina a etapa inicial.", href: "/gestao/projectos?projecto=prj_v_datavault", channels: ["APP", "EMAIL", "TEAMS"], at: ago(6) },
    ],
    consents,
    auditLogs: [
      { id: "aud_1", userId: "u_glab", action: "user.role", entity: "user", entityId: "u_ce", before: { role: "COLABORADOR" }, after: { role: "COMISSAO_EXECUTIVA" }, at: ago(290) },
      { id: "aud_2", userId: "u_glab", action: "project.visibility", entity: "project", entityId: "prj_l_kimbo", before: { visibility: "INTERNO" }, after: { visibility: "PUBLICO" }, at: ago(30) },
    ],
    outbox: [],
    responseTemplates: [
      { key: "recebida", title: "Recebida", body: "Olá,\n\nRecebemos a sua ideia «{titulo}». O primeiro retorno chega em até {prazo} dias úteis.\n\nEquipa do Ecossistema de Inovação TIS" },
      { key: "pedido_info", title: "Pedido de informação", body: "Olá,\n\nPara avançarmos com a análise de «{titulo}», precisamos de saber:\n\n• \n\nObrigado!" },
      { key: "seleccionada", title: "Seleccionada", body: "Parabéns! A ideia «{titulo}» foi seleccionada. Próximo passo: {proximo}." },
      { key: "lista_espera", title: "Lista de espera", body: "A ideia «{titulo}» ficou em lista de espera. Motivo: {motivo}. Voltamos a contactar quando houver o momento certo." },
      { key: "encaminhada", title: "Encaminhada", body: "A ideia «{titulo}» foi encaminhada para {destino}, que vai entrar em contacto." },
      { key: "nao_seleccionada", title: "Não seleccionada", body: "Obrigado por partilhar «{titulo}». Desta vez não a vamos seleccionar. Motivo: {motivo}. Esperamos voltar a receber ideias suas." },
    ],
    settings: defaultSettings(),
  };
}
