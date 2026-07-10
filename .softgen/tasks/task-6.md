---
title: Processo Simplificado de Aumento de Aluguel
status: done
priority: urgent
type: feature
tags: [rentals, payments]
created_by: agent
created_at: 2026-07-10T15:15:00Z
position: 6
---

## Notes:
Implementar processo simplificado para aumento de aluguel quando o usuário edita o valor do imóvel ocupado.

## Checklist:
- [x] Criar serviço `adjustRentalValue` em `src/services/rentalUpdateService.ts` para ajustar valores
- [x] Modificar `PropertyFormDialog` para detectar mudança de valor em imóvel ocupado
- [x] Criar `AlertDialog` de confirmação explicando o impacto da mudança
- [x] Implementar cálculo proporcional para o período atual
- [x] Atualizar recebimentos futuros com novo valor
- [x] Atualizar valor na tabela `rentals`
- [x] Melhorar lógica de alteração de data início para criar recebimentos faltantes
- [x] Converter recebimento proporcional para integral quando necessário

## Acceptance:
- Editar imóvel ocupado e mudar valor → AlertDialog explica o impacto → ao confirmar, todos recebimentos futuros são atualizados automaticamente com novo valor
- Recebimento do período atual tem valor proporcional correto
- Ao alterar data início para uma data anterior, recebimentos dos meses anteriores são criados automaticamente
- Recebimento atual que era proporcional é convertido para integral quando necessário