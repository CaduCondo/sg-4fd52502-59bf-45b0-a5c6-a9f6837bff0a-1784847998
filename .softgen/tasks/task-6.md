---
title: Processo Simplificado de Aumento de Aluguel
status: in_progress
priority: urgent
type: feature
tags: [properties, rentals, payments]
created_by: agent
created_at: 2026-07-10T15:00:00Z
position: 6
---

## Notes:
Simplificar o processo de aumento de aluguel através da edição do imóvel:
- Usuário edita imóvel ocupado e altera o valor do aluguel
- Sistema detecta a mudança e mostra alert explicativo
- Ao confirmar, atualiza automaticamente todos os recebimentos futuros
- Calcula valor proporcional para o período atual (dias com valor antigo + dias com valor novo)

## Checklist:
- [ ] Criar serviço `adjustRentalValue` em `src/services/rentalUpdateService.ts` para ajustar valores
- [ ] Modificar `PropertyFormDialog` para detectar mudança de valor em imóvel ocupado
- [ ] Criar `AlertDialog` de confirmação explicando o impacto da mudança
- [ ] Implementar cálculo proporcional para o período atual
- [ ] Atualizar recebimentos futuros com novo valor
- [ ] Atualizar valor na tabela `rentals`
- [ ] Testar com cenário real (imóvel Acácias)

## Acceptance:
- Ao mudar valor de imóvel ocupado, aparece alert explicativo antes de salvar
- Recebimentos futuros são atualizados automaticamente com novo valor
- Recebimento do período atual tem valor proporcional correto