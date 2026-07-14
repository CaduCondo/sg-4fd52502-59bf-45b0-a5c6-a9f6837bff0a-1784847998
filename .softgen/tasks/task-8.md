---
title: Adicionar IDs em Componentes
status: done
priority: medium
type: chore
tags: [ids, testing, components]
created_by: agent
created_at: 2026-07-14T21:32:15Z
position: 8
---

## Notes
Adicionar IDs nos componentes reutilizáveis para facilitar automação de testes. Focar em formulários, dialogs, cards e filtros.

## Checklist
- [x] ManagePaymentForm - adicionar IDs nos campos e botões
- [x] TenantFormDialog - adicionar IDs em todos os inputs
- [x] PropertyFormDialog - adicionar IDs em formulário
- [x] RentalFormDialog - adicionar IDs e limpar logs
- [x] Payment components (PaymentCard, PaymentFilters, PaymentBreakdownCard)
- [x] Rental components (RentalTerminationDialog)
- [x] Settings components (PermissionsTab, UsersTab)
- [x] Filter components (TenantFilters, PropertyFilters)

## Acceptance
- Formulários principais têm IDs consistentes
- Padrão de nomenclatura aplicado uniformemente
- Logs de debug removidos, console.error mantidos