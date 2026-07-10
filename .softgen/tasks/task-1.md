---
title: Padronização UI das Tabelas
status: in_progress
priority: high
type: feature
tags: [ui, table]
created_by: agent
created_at: 2026-07-10T13:45:47Z
position: 1
---

## Notes:
- A primeira linha da tabela (cabeçalho) deve ter o mesmo tipo de letra, tamanho e cor em todas as tabelas.
- O efeito de hover ("mouse on") das linhas deve ser mais escuro para ficar mais visível.
- Criar/Ajustar componente para suportar ordenação ao clicar no cabeçalho.

## Checklist:
- [ ] Atualizar `src/components/ui/table.tsx` para padronizar cabeçalho (font, text, color).
- [ ] Atualizar `src/components/ui/table.tsx` para escurecer o hover das linhas (`TableRow`).
- [ ] Verificar e preparar componente de ordenação (ex: `sortable-table.tsx`).