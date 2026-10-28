# Ecossistema de Inovação TIS

Website e ecossistema digital do Innovation Lab e da Incubadora da TIS (Luanda, Angola).
A plataforma recolhe ideias internas e externas, analisa-as com IA, gere projectos e ventures,
e mostra um painel de performance à Comissão Executiva.

**Demonstração (dados fictícios):** https://saracsguerreiro.github.io/portal_lab_inov_tis/

Na demonstração, use a barra preta no topo, «Ver como», para trocar de perfil: Visitante,
Startup / Criador, Colaborador, Gestor do Lab, Gestor da Incubadora e Comissão Executiva.
«Repor dados» volta aos dados iniciais.

---

## Dois modos, o mesmo código

| Modo | Para quê | Como corre |
|---|---|---|
| **Completo** | Produção e testes internos | Next.js com servidor, PostgreSQL, Auth.js (Entra ID e email), S3, SMTP, fila pg-boss, IA, Teams, Jira e Confluence. As permissões são verificadas no servidor em `/api/rpc/*`. |
| **Demonstração** | GitHub Pages | Exportação estática. Os mesmos serviços correm no browser sobre os dados de demonstração (localStorage). |

Os serviços (`lib/services`) e a matriz de permissões (`lib/permissions`) são os mesmos nos dois modos.
Ver `DECISOES.md`, D-01.

## Começar

### Só a interface, sem infra-estrutura

```bash
npm install
npm run demo
```

Abre em http://localhost:3000 com os dados de demonstração.

### Ambiente completo com um só comando (Docker)

```bash
docker compose up
```

Arranca o PostgreSQL, o MinIO (S3), o Mailpit (SMTP), a aplicação e o worker, e carrega os dados de demonstração.

- Aplicação: http://localhost:3000
- Emails enviados: http://localhost:8025
- Ficheiros (MinIO): http://localhost:9001

### Ambiente completo sem Docker

```bash
cp .env.example .env    # preencha DATABASE_URL e AUTH_SECRET no mínimo
npm install
npm run setup           # prisma generate + db push + dados de demonstração
npm run dev             # aplicação
npm run worker          # noutro terminal: IA, emails, Teams e alertas
```

Sem `DATABASE_URL`, `npm run dev` usa os dados de demonstração em memória.

### Utilizadores de teste (um por perfil)

| Perfil | Conta | Como entrar |
|---|---|---|
| Colaborador | ana.domingos@tis.example | Microsoft (na demo: escolher a conta) |
| Gestor do Lab | bruno.mateus@tis.example | Microsoft |
| Gestor da Incubadora | carla.neto@tis.example | Microsoft |
| Comissão Executiva | domingos.sebastiao@tis.example | Microsoft |
| Startup / Criador | eva@kitanda.example | Email · palavra-passe `Demo-2026-tis` |
| Submissor anónimo | código `ECO-7F3K-92QD` ou `ECO-4HXP-8M2R` | Página «Consultar estado» |
| Visitante | — | Sem login |

Todos os dados são fictícios.

## Testes

```bash
npm test           # permissões, anonimato, estados, formulários e IA (Vitest)
npm run typecheck
```

## Configuração

Todas as variáveis estão em `.env.example`. Os valores marcados [a confirmar] na especificação
(prazo de retorno, quota da via rápida, retenção, números da Home, objectivos O1 a O6,
decisões pendentes, listas de áreas, sectores e temas, integrações) **não** estão no código:
são configurados em **Gestão → Utilizadores → Configurações (P36)**.

### Microsoft Entra ID (colaboradores)

1. No portal Azure: *Microsoft Entra ID → Registos de aplicações → Novo registo*.
2. Tipos de conta: «Apenas contas neste diretório organizacional» (inquilino da TIS).
3. URI de redireccionamento (Web): `https://<domínio>/api/auth/callback/microsoft-entra-id`.
4. Em *Certificados e segredos*, crie um segredo de cliente.
5. Em *Permissões de API*: `openid`, `profile`, `email`, `User.Read` (delegadas).
6. Preencha `AUTH_MICROSOFT_ENTRA_ID_ID`, `AUTH_MICROSOFT_ENTRA_ID_SECRET`, `AUTH_MICROSOFT_ENTRA_ID_TENANT_ID` e `TIS_EMAIL_DOMAIN`.

No primeiro login, a conta é criada com o perfil Colaborador. Um gestor muda o perfil em P36.
Logins fora do domínio TIS são recusados.

### Base de dados

PostgreSQL 14 ou superior. `npx prisma db push` cria as tabelas a partir de `prisma/schema.prisma`.
Em produção, use `prisma migrate deploy` e cópias de segurança diárias.

### Email

Qualquer SMTP (`SMTP_*`). Os emails saem pela caixa de saída (tabela `OutboxItem`), enviada pelo worker.

### Ficheiros

Armazenamento privado compatível com S3 (`S3_*`). Os anexos têm até 10 MB, e o tipo é verificado
pelos primeiros bytes. As ligações de download duram 5 minutos.

### IA

Qualquer endpoint compatível com a API da OpenAI (`AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`).
Por exemplo, a IA local do Lab com vLLM ou Ollama: `AI_BASE_URL=http://ia-local:11434/v1`.
Sem endpoint, corre o fornecedor de teste (mock).

- A resposta é pedida em JSON com esquema fixo e validada com Zod antes de ser guardada (`lib/ai/schema.ts`).
- Os pedidos nunca levam nome, email, organização nem contactos do autor.

### Microsoft Teams

Duas opções:

- **Webhook de entrada num canal:** defina `TEAMS_WEBHOOK_URL` ou preencha-o em P36.
- **Notificações pessoais por Microsoft Graph:** registo de aplicação com a permissão `TeamsActivity.Send` (aplicação), e as variáveis `GRAPH_CLIENT_ID`, `GRAPH_CLIENT_SECRET` e `GRAPH_TENANT_ID`.

### Jira e Confluence

1. Active cada integração e indique o endereço, o projecto e o espaço em P36 → Integrações.
2. Defina as credenciais no servidor: `JIRA_USER`, `JIRA_API_TOKEN`, `CONFLUENCE_USER` e `CONFLUENCE_API_TOKEN` (tokens de API da Atlassian).

A ficha do projecto mostra o estado das tarefas e a data da última actualização. O strateegia liga por URL.

### Captcha

Cloudflare Turnstile (`NEXT_PUBLIC_TURNSTILE_SITE_KEY` e `TURNSTILE_SECRET_KEY`). Sem chaves, em
desenvolvimento, aparece uma caixa de verificação local.

### Alertas de prazo

O worker agenda o alerta todos os dias às 07:00 (hora de Luanda). Em alternativa, um cron externo
pode chamar `POST /api/cron/prazos` com `Authorization: Bearer $CRON_SECRET`.

## Publicar

### Produção (modo completo)

Qualquer serviço que corra Node 22 e Docker, por exemplo Azure App Service ou Azure Container Apps (recomendado, na região mais próxima de Angola).

1. Crie a imagem a partir do `Dockerfile`.
2. Configure as variáveis de `.env.example`, com HTTPS obrigatório.
3. Corra `npx prisma migrate deploy` (ou `db push` na primeira vez).
4. Arranque dois processos a partir da mesma imagem:
   - `npm start` (a aplicação);
   - `npm run worker` (o worker).
5. Separe três ambientes: desenvolvimento, testes e produção, cada um com a sua base de dados e o seu bucket.

### Demonstração (GitHub Pages)

Cada envio para a `main` corre os testes, gera a exportação estática (`npm run build:demo`) e publica
no GitHub Pages (`.github/workflows/pages.yml`).

## Estrutura

```
app/                 páginas P01–P36 (App Router) e rotas de API (*.server.ts, só no modo completo)
components/ui        componentes base (shadcn/ui sobre Radix) com os tokens
components/motion    primitivas de movimento e o shader do banner
components/domain    etiquetas, linhas do tempo, medidor da IA, captcha, anexos…
components/pages     vistas de cada página
lib/permissions      matriz de permissões (secção 15)
lib/services         regras de negócio (ideias, projectos, conteúdos, gestão, painel)
lib/ai               camada de IA (OpenAI-compatível + mock), esquema fixo
lib/crypto           cifra da autoria anónima
lib/data             repositórios (memória e Prisma) e dados de demonstração
lib/queue            fila pg-boss e worker
messages/            textos em português e inglês
prisma/              esquema e seed
tests/               testes automáticos
docs/                design system e relatório de acessibilidade e desempenho
```

## Documentação

- `DECISOES.md`: decisões tomadas durante a construção.
- `docs/DESIGN_SYSTEM.md`: tokens, componentes e regras de movimento.
- `docs/RELATORIO_A11Y_DESEMPENHO.md`: relatório final de acessibilidade e desempenho.
