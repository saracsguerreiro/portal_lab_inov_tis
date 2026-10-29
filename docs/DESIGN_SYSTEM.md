# Design system — Ecossistema de Inovação TIS

O portal usa o **Design System TIS v1.0.0** (https://tis-experience.github.io/ds-tis/).

- Os tokens oficiais (DTCG, gerados pelo Style Dictionary) estão copiados sem alterações em `app/ds/`: `foundation.css`, `theme-light.css` e `theme-dark.css`.
- A única mudança é que a família da fonte aponta para as fontes servidas pelo próprio site, com `next/font`.
- `app/globals.css` dá nomes do portal aos tokens semânticos do DS (`--brand` → `--ds-brand-background-default`, `--fg` → `--ds-content-strong`…).
- O Tailwind lê esses nomes com `@theme inline`.
- **Modo escuro:** `<html data-mode="dark">`, como no DS.

Para actualizar o DS, substitua os três ficheiros em `app/ds/` pela nova versão.

## Regras do DS aplicadas

| Regra do DS | No portal |
|---|---|
| Inter para texto e títulos; DM Mono para código | `next/font`: Inter 400–700 e DM Mono 400–500 |
| Escala tipográfica (display e heading, Inter bold ou semibold, `letter-spacing` tight) | `--text-*` mapeados para `--ds-body-font-size-*` |
| Pesos até 700 | Sem pesos 800 |
| Cores: brand, neutral e feedback (success, warning, error, info) | Todas as cores vêm das rampas do DS |
| Laboratório = rampa cyan; Incubadora = rampa purple; IA = rampa indigo | Rampas do DS usadas como cores de área |
| Button: Brand, Toned, Outline, Ghost, Link e Danger | `components/ui` |
| Button: alturas 32/40/48 px, raio 8 px, rótulo bold, só transições de cor | `components/ui` |
| Um Button Brand por secção | As variantes lab, inc e ai passaram a Brand. Acções secundárias usam Outline ou Ghost |
| Rótulos de botão com verbo + substantivo | Rótulos dos botões |
| Input, Select e Textarea: 40 px, borda de controlo neutral-500, hover brand-600, raio 8 px | `components/ui` |
| Checkbox com borda de controlo | `components/ui` |
| Toggle: 44 × 24 px, polegar de 20 px | `Switch` |
| Badge: pill, 12 px bold, 1–2 palavras | `Tag` |
| Card: raio 12 px, borda default, `shadow.card` | `Card` |
| Modal: raio 12 px, overlay `background.overlay`, `shadow.modal` | `Dialog` |
| Tabs: lista com borda inferior, indicador Brand de 2 px, rótulo bold de 14 px | `Tabs` |
| Focus ring de 2 px com intervalo de 2 px (WCAG 2.4.11) | `:focus-visible` global |
| Ícones Lucide em stroke | `lucide-react` |
| Movimento: 150, 250, 400 e 600 ms; curvas `ease-default` e `ease-out` | `--dur-*`, `--ease-*` |
| Tamanho máximo de layout: 1280 px | `.container-x` |

## Mapeamento (histórico de nomes do portal)

As tabelas abaixo descrevem os nomes do portal; os valores efectivos são agora os do DS TIS.

## 1. Cor

| Token | Claro | Escuro | Uso |
|---|---|---|---|
| `--brand` / `--brand-ink` | #036EF2 / #0257C2 | #3D8FFA / #7FB4FF | Acções principais, ligações |
| `--lab` / `--lab-ink` / `--lab-soft` | #00CFCF / #0B7A80 / #E0F8F8 | #2BE3E3 / #5FF0F0 / #072D30 | Tudo o que é do Laboratório |
| `--inc` / `--inc-ink` / `--inc-soft` | #FF0066 / #C4004F / #FFE5EF | #FF3D85 / #FF7AAB / #3A0A1E | Tudo o que é da Incubadora |
| `--ai` / `--ai-ink` / `--ai-soft` | #9437FF / #7424D6 / #F1E7FF | #B07BFF / #C9A3FF / #24123F | Tudo o que vem da IA |
| `--do` | #64748B | #94A3B8 | Digital Office (parceiro transversal) |
| `--bg`, `--surface`, `--surface-2/3` | neutros frios | neutros profundos | Fundos e cartões |
| `--fg`, `--fg-muted`, `--fg-subtle` | #0C1220 / #4A5468 / #6B7486 | #EEF1F7 / #A9B2C4 / #8A94A8 | Texto (todos ≥ 4,5:1 sobre `--bg` e `--surface`) |
| `--ok`, `--warn`, `--danger`, `--info` (+ `-soft`) | | | Estados. Nunca usados como «série» de gráfico |
| `--chart-1…4` | #036EF2 #0B9AA0 #C4004F #7424D6 | #3D8FFA #14A3A6 #E8336F #9A64F0 | Gráficos, por esta ordem fixa (validada para daltonismo e contraste) |

**Regras de cor:**

- O texto usa sempre as variantes `-ink`; as cores «cheias» (`--lab`, `--inc`) ficam para preenchimentos, ícones e marcas gráficas.
- O mesmo significado usa sempre a mesma cor (estados da ideia em `lib/domain/labels.ts`).
- A cor nunca é a única pista: cada etiqueta tem texto e, quando há estado, um ponto ou um ícone.

## 2. Tipografia

| Papel | Família | Tamanhos |
|---|---|---|
| Títulos | Syne 600–800, `letter-spacing: -0.02em` | `--text-2xl` a `--text-5xl` (fluidos com `clamp()`) |
| Texto e interface | Geist 400–600 | 14 / 16 / 18 px, altura de linha 1,6 |
| Números grandes | Geist 600, algarismos tabulares (`.tabular`) | `--text-4xl` |
| Códigos e números de ideia | Geist Mono | 12–14 px; `ECO-XXXX-XXXX` com espaçamento largo |

## 3. Espaçamento, raio e sombra

- **Espaçamento:** base de 4 px (`--space-1` = 4 px até `--space-24` = 96 px). As secções públicas usam 80–112 px na vertical.
- **Raio:** `--radius-sm` 6 px, `md` 10 px (campos e botões), `lg` 16 px (cartões), `xl` 24 px (cartões grandes e diálogos), `full`.
- **Sombra:**
  - `--shadow-1`: repouso.
  - `--shadow-2`: hover ou menus.
  - `--shadow-3`: diálogos.
  - `--glow-lab` e `--glow-inc`: hover dos cartões de cada área.
- **Grelha:** contentor de 1240 px com margens de 16 px (telemóvel) e 32 px (computador). A Home e o painel usam grelha *bento*.

## 4. Componentes

### `components/ui`

Componentes base sobre Radix UI, ao estilo shadcn/ui:

- `Button`: variantes primary, secondary, ghost, lab, inc, ai, danger, link e inverse; estado `loading`; área de toque ≥ 44 px.
- `Field`: etiqueta, ajuda, erro junto do campo, `aria-describedby`, `aria-invalid` e marca de obrigatório.
- Campos: `Input`, `Textarea`, `Select`, `Checkbox`, `Switch`, `ChoiceGroup` (escolha simples ou múltipla em blocos grandes, com `role=radio`/`checkbox`).
- Estrutura: `Tabs`, `Dialog`, `Tip`, `Abbr` (sigla com definição do glossário).
- Estados: `Skeleton`, `ListSkeleton`, `CardGridSkeleton`, `EmptyState`, `ErrorState`, `Progress`.

### `components/domain`

- Etiquetas: `StatusTag`, `AreaTag`, `VisibilityTag`.
- Navegação: `PageHeader`, `Breadcrumbs`, `SubNav` (sub-menu fixo com scrollspy).
- Cartões e chamadas: `ProjectCard` (inclinação 3D e transição partilhada), `CtaBand`.
- Linhas do tempo e IA: `IdeaTimeline` (estado actual a pulsar), `ScoreGauge`, `CriterionBar`, `Typewriter`.
- Outros: `Countdown`, `Captcha`, `FileDrop` (10 MB, tipo verificado pelos primeiros bytes), `RequirePage`.

### `components/forms/wizard.tsx`

Formulário em passos com:

- barra de progresso;
- transição lateral entre passos;
- indicador «Guardado» do rascunho;
- foco no título de cada passo;
- resumo antes de submeter;
- celebração no fim (`celebrate()`).

### Estados obrigatórios

Cada lista tem estados de carregamento (esqueleto), vazio (com acção sugerida), erro (com «Tentar de novo») e sucesso (toast ou ecrã de confirmação).

## 5. Movimento

### Tokens

| Token | Valor | Uso |
|---|---|---|
| `--dur-micro` | 180 ms | Botões, interruptores, caixas, hover |
| `--dur-base` | 240 ms | Menus, toasts, mudanças de estado |
| `--dur-enter` | 480 ms | Entradas de secções e cartões |
| `--dur-page` | 600 ms | Transições entre páginas |
| `--ease-out` | cubic-bezier(.22, 1, .36, 1) | Curva por defeito |
| Spring | stiffness 380, damping 30 | Animações de layout (filtros, quadros, pílulas activas) |

Em JavaScript: `DUR`, `EASE_OUT` e `SPRING` em `components/motion`.

### Regras

1. As micro-interacções duram 150–300 ms; as entradas e transições, 400–700 ms.
2. Anima-se só `transform` e `opacity`. As barras e os medidores usam `scaleX`/`scaleY` ou `stroke-dashoffset`.
3. Com «reduzir movimento» (`prefers-reduced-motion`), as animações passam a fades de 120 ms. Não há shader, parallax, faixa contínua, pulso, scrollytelling, nem Lenis.
4. Nenhuma animação atrasa o conteúdo. O primeiro ecrã anima em CSS, sem esperar pela hidratação. Os gráficos montam quando entram no ecrã, e o texto de leitura aparece logo.
5. As bibliotecas pesadas são carregadas só onde são usadas:
   - shader: Home;
   - GSAP: O Ecossistema;
   - Lenis: páginas informativas;
   - Recharts: painel;
   - react-pdf: ao exportar;
   - canvas-confetti: ao submeter.

### Catálogo (secção 18)

| Onde | Dinâmica | Implementação |
|---|---|---|
| Início | Fundo animado | Shader WebGL em `hero-shader.tsx` |
| Início | Título palavra a palavra | `WordReveal` (CSS) |
| Início | Contadores, cartões 3D, cascata, faixa de parceiros | `Counter`, `TiltCard`, `Stagger`, `.marquee` |
| Ecossistema | Funil com scrollytelling e matriz que realça a linha e a coluna | GSAP ScrollTrigger; tabela interactiva |
| Laboratório | Linhas que expandem, método que se preenche com o scroll, cartões que viram | Motion `layout`; `useScroll`; `FlipCard` |
| Incubadora | Trilhas que convergem e ícones de saída animados | SVG `pathLength` e `animateMotion` |
| Projectos | Filtros com animação de layout e transição partilhada para a ficha | `LayoutGroup`, `AnimatePresence`, View Transitions |
| Ficha | Etapas com progresso e gates que se acendem | `StageTimeline` |
| Desafios | Contagem decrescente e barra de participações | `Countdown`, `Progress` |
| Entrar | Transição entre os 3 caminhos e carregamento no botão Microsoft | `AnimatePresence`, `loading` |
| Formulários | Passos laterais, progresso, «Guardado», validação suave, celebração e código revelado com «Copiar» | `Wizard`, `celebrate`, `PopIn` |
| Ideias | Linha do tempo com o estado a pulsar e aviso animado | `IdeaTimeline`, `.pulse-ring` |
| Triagem | Medidor e barras por critério | `ScoreGauge`, `CriterionBar` |
| Triagem | Resumo com efeito de escrita e quadro com arrastar e largar | `Typewriter`; arrastar e largar com alternativa «Mover para…» |
| Painel | Gráficos que se desenham ao entrar, contadores e transições ao filtrar | Recharts com `InView` |
| Todo o site | Transições, micro-interacções, esqueletos, toasts, sino animado, tema animado | View Transitions; `toggleThemeAnimated` |
