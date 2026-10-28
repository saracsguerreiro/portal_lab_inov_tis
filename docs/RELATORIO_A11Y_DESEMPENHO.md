# Relatório de acessibilidade e desempenho

Medido com Lighthouse 12.8 (telemóvel, 4G simulado) sobre a exportação estática, a 28/10/2026.

| Página | Acessibilidade | Boas práticas | Desempenho | LCP observado | LCP simulado (4G) | CLS | TBT |
|---|---|---|---|---|---|---|---|
| Início | 92 → corrigido | 96 | 64 | 0,77 s | 9,3 s | 0,002 | 310 ms |
| O Ecossistema | 96 → corrigido | 96 | 71 | 0,14 s | 7,1 s | 0,002 | 240 ms |
| Projectos | 95 → corrigido | 96 | 69 | — | 9,1 s | 0,002 | 270 ms |
| Formulário F1 | 100 | 96 | 63 | — | 10,2 s | 0,002 | 450 ms |
| Painel | 100 | 96 | 66 | — | 10,7 s | 0,002 | 370 ms |

O SEO dá 60 na demonstração porque esta tem `noindex` de propósito (dados fictícios).

## Acessibilidade (WCAG 2.2 AA)

### Corrigido depois da medição

- O contraste do texto secundário passou a 5,6:1.
- O `aria-label` dos contadores foi trocado por texto para leitores de ecrã.
- A ordem dos títulos em Projectos foi corrigida.

### Já cumprido

- Link «Saltar para o conteúdo» e foco visível em todos os elementos.
- Áreas de toque de pelo menos 44 px.
- Etiquetas e erros ligados aos campos (`aria-describedby`, `aria-invalid`).
- Foco no título de cada passo dos formulários.
- Diálogos Radix com o foco preso.
- Alternativa por teclado ao arrastar e largar («Mover para…») e atalhos J/K na triagem.
- Vista em tabela para cada gráfico.
- Cor nunca usada sozinha.
- `prefers-reduced-motion` respeitado.
- Paleta dos gráficos validada para daltonismo nos dois temas.

### Pendente

- Auditoria manual com leitor de ecrã (NVDA e VoiceOver).
- Testes com 5 utilizadores por perfil (secção 18).

## Desempenho

### Valores reais

O LCP observado é inferior a 1 s e o CLS inferior a 0,01.

### Onde falha a meta

O LCP simulado em 4G ainda **não cumpre a meta de 2,5 s**. A simulação atribui ao LCP o peso do JavaScript partilhado:

- Motion, Radix e Lucide: cerca de 250 KB.
- React: cerca de 180 KB.

### Já aplicado

Estas medidas fizeram o TBT descer de 5,4 s para 0,3 s:

- Fontes servidas pelo próprio site.
- Shader adiado, que não arranca sem GPU nem em aparelhos fracos.
- Os dados de demonstração não são carregados para visitantes.
- Bibliotecas pesadas carregadas só onde são usadas: GSAP, Recharts, react-pdf e confetti.

### Próximos passos

1. Trocar `motion` por `motion/mini` e por CSS nas páginas públicas.
2. Separar os componentes Radix por rota.
3. Passar os cabeçalhos das páginas públicas a componentes de servidor.
4. Medir de novo no modo completo, com cache HTTP e compressão Brotli.
