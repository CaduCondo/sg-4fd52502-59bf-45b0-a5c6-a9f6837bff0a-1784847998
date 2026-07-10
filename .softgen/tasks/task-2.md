---
title: Padronizar Tabela de Imóveis
status: todo
priority: high
type: feature
tags: [properties, table]
created_by: agent
created_at: 2026-07-10T13:45:47Z
position: 2
---

## Notes:
- Colunas ordenáveis: Local, Complemento (antigo Endereço), Valor, Quartos, Banheiros, Área Útil, Status e Foto.
- Remover combo de "Ordenação" da barra de busca.

## Checklist:
- [ ] Renomear coluna "Endereço" para "Complemento".
- [ ] Implementar ordenação clicando no cabeçalho das colunas especificadas.
- [ ] Remover combo de ordenação em `src/components/properties/PropertyFilters.tsx` ou onde estiver.