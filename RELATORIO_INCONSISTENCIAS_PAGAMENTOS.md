# 🚨 Relatório de Inconsistências em Pagamentos
**Data da análise:** 14/07/2026  
**Total de casos problemáticos:** 50 registros

---

## 🔴 CRÍTICOS - Status "Pago" mas valor pago < valor esperado (26 casos)

### Top 10 Maiores Déficits

| Imóvel | Inquilino | Período | Esperado | Pago | Déficit | Status |
|--------|-----------|---------|----------|------|---------|--------|
| DORA APTO 14 | Melissa Alves de Almeida | Mar/2026 | R$ 2.904,04 | **-R$ 2.880,45** | -R$ 5.784,49 | Pago ❌ |
| JD. COLOMBO APTO 07 | Raphael L. Dell'Aquila Gonçalves | Out/2026 | R$ 2.800,00 | **R$ 0,00** | -R$ 2.800,00 | Pago ❌ |
| JD. COLOMBO APTO 12 | Ciro de Paula Cipriano | Fev/2026 | R$ 3.050,00 | R$ 1.450,00 | -R$ 1.600,00 | Pago ❌ |
| JD. COLOMBO APTO 01 | Emanuelle Lengler Acosta | Jan/2026 | R$ 3.100,00 | R$ 1.550,00 | -R$ 1.550,00 | Pago ❌ |
| SIGNORE APTO 22 | Maria de Fatima da Silva | Mai/2025 | R$ 1.300,00 | **R$ 0,00** | -R$ 1.300,00 | Pago ❌ |
| LEMOS APTO 13 | Rafaela Isabel Dos Santos | Mar/2026 | R$ 569,48 | **-R$ 550,22** | -R$ 1.119,70 | Pago ❌ |
| SIGNORE APTO 20 | Alecsandro Coelho da Silva | Jul/2026 | R$ 547,21 | **-R$ 547,21** | -R$ 1.094,42 | Pago ❌ |
| SIGNORE APTO 29 | Manuela de Melo Silva | Jul/2026 | R$ 538,83 | **-R$ 538,83** | -R$ 1.077,66 | Pago ❌ |
| **LEMOS APTO 24** | **Lucas Rafael Giroto da Silva** | **Fev/2026** | **R$ 1.300,00** | **R$ 400,00** | **-R$ 900,00** | **Pago ❌** |
| LEMOS APTO 11 | Isabela Carvalho S. Cerqueira | Fev/2026 | R$ 1.550,00 | R$ 676,66 | -R$ 873,34 | Pago ❌ |

### ⚠️ Observações Críticas:
- **Valores NEGATIVOS**: Vários registros têm `paid_amount` negativo, o que é impossível
- **Pagamentos R$ 0,00**: Recebimentos marcados como "Pago" mas sem valor recebido
- **Déficits grandes**: Diferenças de R$ 900 a R$ 5.784

---

## 🟡 ATENÇÃO - Pagou MAIS que o esperado (24 casos)

### Top 10 Maiores Excessos

| Imóvel | Inquilino | Período | Esperado | Pago | Excesso | Status |
|--------|-----------|---------|----------|------|---------|--------|
| LEMOS APTO 26 | Kathia Silene da Silva | Mar/2026 | R$ 1.980,00 | **R$ 3.860,00** | +R$ 1.880,00 | Pago ⚠️ |
| SIGNORE APTO 27 | Kamila de Oliveira | Jan/2026 | R$ 150,00 | **R$ 1.650,00** | +R$ 1.500,00 | Pago ⚠️ |
| SIGNORE APTO 27 | Kamila de Oliveira | Fev/2026 | R$ 150,00 | **R$ 1.650,00** | +R$ 1.500,00 | Pago ⚠️ |
| SIGNORE APTO 28 | Marcos Rodrigues Lima | Fev/2026 | R$ 150,00 | **R$ 1.650,00** | +R$ 1.500,00 | Pago ⚠️ |
| SIGNORE APTO 28 | Marcos Rodrigues Lima | Mai/2026 | R$ 150,00 | **R$ 1.650,00** | +R$ 1.500,00 | Pago ⚠️ |
| SIGNORE APTO 28 | Marcos Rodrigues Lima | Jun/2026 | R$ 150,00 | **R$ 1.650,00** | +R$ 1.500,00 | Pago ⚠️ |
| SIGNORE APTO 28 | Marcos Rodrigues Lima | Abr/2026 | R$ 150,00 | **R$ 1.650,00** | +R$ 1.500,00 | Pago ⚠️ |
| SIGNORE APTO 28 | Marcos Rodrigues Lima | Jan/2026 | R$ 150,00 | **R$ 1.650,00** | +R$ 1.500,00 | Pago ⚠️ |
| SIGNORE APTO 17 | Edimilson dos Santos Nascimento | Fev/2026 | R$ 150,00 | **R$ 1.600,00** | +R$ 1.450,00 | Pago ⚠️ |
| SIGNORE APTO 04 | João N'bundé | Mai/2026 | R$ 291,67 | **R$ 1.250,00** | +R$ 958,33 | Pago ⚠️ |

### ⚠️ Observações:
- **Padrão suspeito**: SIGNORE APTOs 27 e 28 têm valor esperado de R$ 150 mas recebem R$ 1.650
- **Possível erro de cálculo**: Valor esperado muito baixo (R$ 150) para aluguéis residenciais
- **Excesso grande**: Kathia pagou R$ 1.880 a mais no LEMOS APTO 26

---

## 📊 Resumo Estatístico

### Distribuição por Gravidade
- 🔴 **Casos Críticos (pagou menos)**: 26 registros
- 🟡 **Casos de Atenção (pagou mais)**: 24 registros
- **Total**: 50 registros inconsistentes

### Valores em Déficit
- **Maior déficit**: -R$ 5.784,49 (DORA APTO 14)
- **Soma total de déficits**: -R$ 17.849,37

### Valores em Excesso
- **Maior excesso**: +R$ 1.880,00 (LEMOS APTO 26)
- **Soma total de excessos**: +R$ 14.431,48

---

## 🔧 Ações Recomendadas

### 1. Correção Imediata (Casos Críticos)
- [ ] Investigar valores NEGATIVOS no banco (ex: DORA APTO 14, LEMOS APTO 13)
- [ ] Corrigir status de pagamentos com valor R$ 0,00 (ex: JD. COLOMBO APTO 07)
- [ ] Verificar o caso **LEMOS APTO 24 - Fev/2026** (da imagem): Esperado R$ 1.300 / Pago R$ 400

### 2. Investigação (Casos de Atenção)
- [ ] Verificar imóveis com valor esperado R$ 150 (SIGNORE APTOs 27, 28, 17)
  - Possível erro no cálculo do `expected_amount`
  - Valores reais devem ser ~R$ 1.650
- [ ] Analisar caso LEMOS APTO 26 - Mar/2026 (pagou R$ 3.860 quando esperado era R$ 1.980)
  - Possível pagamento adiantado de múltiplos meses?

### 3. Correção do Algoritmo
- [ ] Revisar cálculo de `expected_amount` no código
- [ ] Validar aplicação de descontos
- [ ] Adicionar validação para impedir valores negativos
- [ ] Corrigir lógica de status (Pago/Parcial/Pendente)

---

## 🔍 Query SQL para Consulta

```sql
-- Para consultar novamente os casos problemáticos:
SELECT 
  p.id,
  l.name || ' ' || prop.complement as imovel,
  t.name as inquilino,
  p.reference_month || '/' || p.reference_year as periodo,
  p.expected_amount as valor_esperado,
  p.paid_amount as valor_pago,
  p.discount_amount as desconto,
  (p.paid_amount - p.expected_amount) as diferenca,
  p.status
FROM payments p
LEFT JOIN rentals r ON r.id = p.rental_id
LEFT JOIN properties prop ON prop.id = r.property_id
LEFT JOIN locations l ON l.id = prop.location_id
LEFT JOIN tenants t ON t.id = r.tenant_id
WHERE 
  (p.paid_amount < p.expected_amount AND p.status = 'paid')
  OR (p.paid_amount > p.expected_amount AND p.status = 'paid')
  OR (p.paid_amount = p.expected_amount AND p.status = 'partial')
ORDER BY ABS(p.paid_amount - p.expected_amount) DESC;
```

---

**Gerado em:** 14/07/2026 15:01 UTC  
**Sistema:** Gerenciador de Locações de Imóveis