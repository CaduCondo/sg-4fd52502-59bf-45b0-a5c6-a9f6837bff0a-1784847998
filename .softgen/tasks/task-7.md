---
title: Adicionar IDs em elementos HTML - Páginas Principais
status: in_progress
priority: high
type: chore
tags: [ids, testing, automation]
created_by: agent
created_at: 2026-07-14T21:31:51Z
position: 7
---

## Notes
Adicionar atributos `id` em todos os elementos interativos (inputs, selects, buttons, checkboxes, tabs, títulos) para facilitar automação de testes. Usar padrão consistente: `{page}-{section}-{element}`.

Remover logs de desenvolvimento/debug (console.log, console.warn) mantendo console.error() em try-catch críticos.

## Checklist
- [x] Login page - adicionar IDs e limpar logs
- [x] Dashboard page - adicionar IDs e limpar logs
- [x] Properties page - adicionar IDs e limpar logs
- [x] Tenants page - adicionar IDs e limpar logs
- [x] Layout component - adicionar IDs em navegação e menus
- [ ] Rentals page - adicionar IDs e limpar logs
- [ ] Payments page - adicionar IDs e limpar logs
- [ ] Financial page - adicionar IDs e limpar logs
- [ ] Settings page - adicionar IDs e limpar logs

## Acceptance
- Todos os campos de formulário têm IDs únicos
- Todos os botões de ação têm IDs
- Logs de debug removidos, console.error() mantidos em try-catch