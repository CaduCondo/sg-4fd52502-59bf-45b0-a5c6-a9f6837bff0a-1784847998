# 🚀 Guia de Implementação: Sistema Multi-Tenant SaaS

**Data:** 08/07/2026  
**Sistema:** Gerenciador de Locações de Imóveis  
**Objetivo:** Transformar o sistema single-tenant em SaaS multi-tenant escalável

---

## 📋 Índice

- [Fase 0: Separação Dev/Prod](#fase-0-separação-devprod)
- [Fase 1: Implementação SaaS Base](#fase-1-implementação-saas-base)
- [Fase 2: Multi-Tenant Completo](#fase-2-multi-tenant-completo)
- [Fase 3: URLs Públicas por Organização](#fase-3-urls-públicas-por-organização)
- [Validação Final](#validação-final)

---

# FASE 0: Separação Dev/Prod

**Objetivo:** Criar ambientes isolados de desenvolvimento e produção, com chave fácil para alternar.

**Tempo estimado:** 3-5 dias  
**Custo:** R$ 0 (grátis)  
**Complexidade:** 🟢 Baixa

---

## 0.1 Criar Projeto Supabase de Desenvolvimento

### Passo 1: Acessar Supabase Dashboard
1. Acesse [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Clique em **"New Project"**
3. Preencha os dados:
   - **Name:** `gerenciador-locacoes-DEV`
   - **Database Password:** Anote em local seguro
   - **Region:** `South America (São Paulo)`
   - **Pricing Plan:** `Free`

### Passo 2: Copiar Credenciais do Projeto DEV
1. Após criação, vá em **Settings > API**
2. Copie:
   - **Project URL:** `https://XXXXXXXX.supabase.co`
   - **anon/public key:** `eyJhbGci...`
   - **service_role key:** `eyJhbGci...` (usado em migrations)

### Passo 3: Aplicar Schema no Banco DEV
1. No Softgen, use o terminal para aplicar as migrations:

```bash
# Conectar ao projeto DEV
npx supabase link --project-ref XXXXXXXX

# Aplicar todas as migrations
npx supabase db push
```

**Resultado esperado:** Banco DEV criado com schema idêntico ao PROD.

---

## 0.2 Configurar Variáveis de Ambiente

### Passo 1: Atualizar `.env.local`

**🎯 PROMPT PARA SOFTGEN:**
```
Atualizar o arquivo .env.local para suportar ambientes Dev e Prod com chave de alternância.

Adicionar as seguintes variáveis:

# 🔴 PRODUÇÃO (Atual - já existe)
NEXT_PUBLIC_SUPABASE_URL_PROD=https://ygqwacfyxcsycaegbnrp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY_PROD=[chave-anon-prod-atual]

# 🟢 DESENVOLVIMENTO (Novo)
NEXT_PUBLIC_SUPABASE_URL_DEV=https://[projeto-dev].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY_DEV=[chave-anon-dev-copiada]

# 🔥 CHAVE MÁGICA - Alternar entre Dev e Prod
# true = Usar banco PROD no ambiente DEV (para ver dados reais)
# false = Usar banco DEV no ambiente DEV (para testar sem medo)
NEXT_PUBLIC_USE_PROD_IN_DEV=false

Manter as variáveis antigas por compatibilidade:
NEXT_PUBLIC_SUPABASE_URL=[mesma-url-prod]
NEXT_PUBLIC_SUPABASE_ANON_KEY=[mesma-chave-prod]
```

### Passo 2: Atualizar Cliente Supabase

**🎯 PROMPT PARA SOFTGEN:**
```
Atualizar src/integrations/supabase/client.ts para detectar automaticamente qual banco usar.

Lógica:
1. Se NODE_ENV === "production" → SEMPRE usar PROD
2. Se NODE_ENV === "development":
   - Se USE_PROD_IN_DEV === "true" → usar PROD (ver dados reais)
   - Se USE_PROD_IN_DEV === "false" → usar DEV (testar seguro)

Adicionar logs no console indicando qual ambiente está ativo.

Código de referência:

const isDev = process.env.NODE_ENV === "development";
const useProdInDev = process.env.NEXT_PUBLIC_USE_PROD_IN_DEV === "true";

const supabaseUrl = (isDev && !useProdInDev)
  ? process.env.NEXT_PUBLIC_SUPABASE_URL_DEV!
  : process.env.NEXT_PUBLIC_SUPABASE_URL_PROD!;

const supabaseAnonKey = (isDev && !useProdInDev)
  ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_DEV!
  : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_PROD!;

console.log("🔌 Supabase Environment:", {
  nodeEnv: process.env.NODE_ENV,
  useProdInDev,
  activeDatabase: (isDev && !useProdInDev) ? "DEV 🟢" : "PROD 🔴",
  url: supabaseUrl
});
```

---

## 0.3 Criar Toggle Visual de Ambiente (Opcional mas Recomendado)

**🎯 PROMPT PARA SOFTGEN:**
```
Criar componente visual de indicador de ambiente no canto superior direito do Layout.

Componente: src/components/EnvironmentIndicator.tsx

Requisitos:
1. Mostrar badge pequeno no header com:
   - "🟢 DEV" quando usando banco DEV (fundo verde)
   - "🔴 PROD" quando usando banco PROD (fundo vermelho)
2. Só aparecer em development (NODE_ENV === "development")
3. Mostrar tooltip ao passar mouse: "Você está usando dados de [DEV/PROD]"
4. Badge fixo, sempre visível no topo direito

Integrar no Layout.tsx ao lado do menu de usuário.
```

---

## 0.4 Testar Alternância de Ambientes

### Teste 1: Ambiente DEV (padrão)
```bash
# No Softgen, verificar .env.local:
NEXT_PUBLIC_USE_PROD_IN_DEV=false

# Reiniciar servidor Next.js
# Verificar console do navegador: deve mostrar "🟢 DEV"
```

**Validação:**
- [ ] Badge mostra "🟢 DEV"
- [ ] Console mostra: `activeDatabase: "DEV 🟢"`
- [ ] Dados mostrados são do banco DEV (vazio ou com dados de teste)

### Teste 2: Ambiente PROD no DEV
```bash
# No Softgen, alterar .env.local:
NEXT_PUBLIC_USE_PROD_IN_DEV=true

# Reiniciar servidor Next.js
# Verificar console do navegador: deve mostrar "🔴 PROD"
```

**Validação:**
- [ ] Badge mostra "🔴 PROD"
- [ ] Console mostra: `activeDatabase: "PROD 🔴"`
- [ ] Dados mostrados são do banco PROD (seus 89 contratos reais)

### Teste 3: Ambiente PROD real (Vercel)
```bash
# No Vercel, as variáveis devem ser:
NEXT_PUBLIC_SUPABASE_URL=[url-prod]
NEXT_PUBLIC_SUPABASE_ANON_KEY=[key-prod]
NODE_ENV=production

# Badge NÃO deve aparecer em produção
```

**Validação:**
- [ ] Badge não aparece (componente oculto em produção)
- [ ] Sempre usa banco PROD
- [ ] Aplicação funciona normalmente

---

## ✅ Checklist Fase 0

- [ ] Projeto Supabase DEV criado
- [ ] Credenciais DEV copiadas
- [ ] Schema aplicado no banco DEV
- [ ] `.env.local` atualizado com variáveis Dev/Prod
- [ ] `client.ts` detecta ambiente automaticamente
- [ ] Badge de ambiente implementado
- [ ] Teste 1 passou (DEV padrão)
- [ ] Teste 2 passou (PROD no DEV)
- [ ] Teste 3 passou (PROD real no Vercel)

**Resultado:** Sistema com Dev/Prod separado + chave fácil de alternância ✅

---

# FASE 1: Implementação SaaS Base

**Objetivo:** Adicionar suporte a SaaS no sistema atual, com chave liga/desliga.

**Tempo estimado:** 1 semana  
**Custo:** R$ 0 (apenas configuração)  
**Complexidade:** 🟢 Baixa

---

## 1.1 Adicionar Campo `saas_enabled` na Tabela `configs`

### SQL para executar no Supabase SQL Editor (DEV primeiro)

**🎯 PROMPT PARA SOFTGEN:**
```
Criar migration SQL para adicionar suporte a SaaS na tabela configs.

Executar no banco DEV primeiro, depois PROD.

SQL:
-- Adicionar campo saas_enabled
ALTER TABLE configs ADD COLUMN IF NOT EXISTS saas_enabled BOOLEAN DEFAULT false;

-- Adicionar campos de configuração do Gateway de Pagamento
ALTER TABLE configs ADD COLUMN IF NOT EXISTS gateway_enabled BOOLEAN DEFAULT false;
ALTER TABLE configs ADD COLUMN IF NOT EXISTS gateway_provider TEXT DEFAULT 'asaas';
ALTER TABLE configs ADD COLUMN IF NOT EXISTS gateway_api_key TEXT;

-- Comentários para documentação
COMMENT ON COLUMN configs.saas_enabled IS 'Habilita funcionalidades SaaS (Gateway, Multi-tenant, etc)';
COMMENT ON COLUMN configs.gateway_enabled IS 'Habilita gateway de pagamento (Asaas, Stripe, etc)';
COMMENT ON COLUMN configs.gateway_provider IS 'Provedor do gateway: asaas, stripe, mercadopago';
COMMENT ON COLUMN configs.gateway_api_key IS 'API Key do gateway (criptografada)';

Após executar, atualizar o registro existente:
UPDATE configs SET saas_enabled = false, gateway_enabled = false WHERE id = (SELECT id FROM configs LIMIT 1);
```

**Validação:**
```sql
-- Verificar se campos foram criados
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'configs' 
  AND column_name IN ('saas_enabled', 'gateway_enabled', 'gateway_provider', 'gateway_api_key');
```

---

## 1.2 Atualizar Tipos TypeScript

**🎯 PROMPT PARA SOFTGEN:**
```
Atualizar src/types/index.ts para incluir novos campos de configuração SaaS.

Na interface CompanyConfig, adicionar:

saas_enabled?: boolean;
gateway_enabled?: boolean;
gateway_provider?: 'asaas' | 'stripe' | 'mercadopago';
gateway_api_key?: string;

Também atualizar src/services/configService.ts:
1. Adicionar campos no mapeamento mapConfigFromDb
2. Adicionar campos em updateConfig
3. Adicionar campos em createConfig
```

---

## 1.3 Criar Hook `useSaasFeatures`

**🎯 PROMPT PARA SOFTGEN:**
```
Criar hook src/hooks/useSaasFeatures.ts para controlar features SaaS.

Objetivo: Centralizar lógica de features habilitadas/desabilitadas.

Código de referência:

import { useState, useEffect } from "react";
import { getConfig } from "@/services/configService";

export function useSaasFeatures() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadConfig() {
      try {
        const data = await getConfig();
        setConfig(data);
      } catch (error) {
        console.error("Erro ao carregar config:", error);
      } finally {
        setLoading(false);
      }
    }
    loadConfig();
  }, []);

  return {
    // Features SaaS
    isSaasEnabled: config?.saas_enabled || false,
    isGatewayEnabled: config?.gateway_enabled || false,
    gatewayProvider: config?.gateway_provider || 'asaas',
    
    // Helpers
    canUseGateway: (config?.saas_enabled && config?.gateway_enabled) || false,
    canGenerateBoleto: (config?.saas_enabled && config?.gateway_enabled) || false,
    canProcessPayment: (config?.saas_enabled && config?.gateway_enabled) || false,
    
    loading,
  };
}

Usar em componentes:
const { isSaasEnabled, canUseGateway, loading } = useSaasFeatures();

if (loading) return <Spinner />;

if (!canUseGateway) {
  return <div>Gateway de pagamento não habilitado</div>;
}
```

---

## 1.4 Criar Toggle SaaS na Página de Configurações

**🎯 PROMPT PARA SOFTGEN:**
```
Adicionar toggle de SaaS na página src/pages/settings.tsx.

Localização: Aba "Configurações" (primeira aba).

Adicionar nova seção ANTES da seção de taxas:

## 🚀 Configurações SaaS (BETA)

Card com:
1. Switch: "Habilitar funcionalidades SaaS"
   - Estado: configs.saas_enabled
   - Ao mudar: atualizar banco de dados
   - Descrição: "Ativa gateway de pagamento, boletos e recursos avançados"

2. Switch: "Habilitar Gateway de Pagamento" 
   - Visível apenas se saas_enabled = true
   - Estado: configs.gateway_enabled
   - Descrição: "Permite gerar boletos e processar pagamentos automaticamente"

3. Select: "Provedor do Gateway"
   - Visível apenas se gateway_enabled = true
   - Opções: Asaas (recomendado), Stripe, Mercado Pago
   - Descrição: "Escolha o provedor de pagamentos"

4. Input: "API Key do Gateway"
   - Visível apenas se gateway_enabled = true
   - Tipo: password (ocultar valor)
   - Placeholder: "Cole aqui a API Key do provedor"
   - Descrição: "Chave de integração fornecida pelo provedor"

Incluir alertas:
- ⚠️ "ATENÇÃO: Estas são funcionalidades avançadas. Desabilitar pode afetar pagamentos em andamento."
- ℹ️ "Requer configuração no provedor escolhido. Veja documentação."

Validações:
- Não permitir desabilitar saas_enabled se houver pagamentos processados via gateway
- Validar formato da API Key (regex básico)
```

---

## 1.5 Adicionar Indicador Visual de SaaS Ativo

**🎯 PROMPT PARA SOFTGEN:**
```
Criar badge visual indicando quando SaaS está ativo.

Componente: src/components/SaasStatusBadge.tsx

Requisitos:
1. Badge pequeno no canto superior esquerdo do Layout
2. Cores:
   - 🟢 "SaaS ATIVO" (verde) quando saas_enabled = true
   - 🔴 "SaaS DESLIGADO" (cinza) quando saas_enabled = false
3. Tooltip ao passar mouse: "Funcionalidades SaaS: [Ativas/Desligadas]"
4. Só aparecer para admins (hasPermission('admin'))

Integrar no Layout.tsx ao lado do logo/nome da empresa.
```

---

## 1.6 Ocultar Features SaaS Quando Desabilitado

**🎯 PROMPT PARA SOFTGEN:**
```
Ocultar opções de gateway de pagamento quando SaaS está desabilitado.

Páginas afetadas:
1. src/pages/payments.tsx
   - Ocultar botão "Gerar Boleto" se !canUseGateway
   - Ocultar botão "Pagar com PIX" se !canUseGateway

2. src/components/payments/ManagePaymentForm.tsx
   - Ocultar opção "Gateway" em payment_method se !canUseGateway
   - Mostrar aviso: "Habilite o SaaS nas configurações para usar gateway"

3. src/pages/settings.tsx (aba Configurações)
   - Mostrar aviso na seção de Gateway se !saas_enabled
   - "Para usar gateway de pagamento, habilite o modo SaaS acima"

Usar hook useSaasFeatures() em todos os componentes afetados.
```

---

## ✅ Checklist Fase 1

- [ ] Campo `saas_enabled` adicionado no banco
- [ ] Campos de gateway adicionados no banco
- [ ] Tipos TypeScript atualizados
- [ ] Hook `useSaasFeatures` criado
- [ ] Toggle SaaS implementado em Configurações
- [ ] Badge "SaaS ATIVO/DESLIGADO" visível
- [ ] Features de gateway ocultas quando SaaS = false
- [ ] Testado: Desligar SaaS oculta opções de gateway
- [ ] Testado: Ligar SaaS mostra opções de gateway

**Resultado:** Sistema com controle SaaS liga/desliga ✅

---

# FASE 2: Multi-Tenant Completo

**Objetivo:** Transformar sistema em multi-tenant com RLS, permitindo múltiplas organizações.

**Tempo estimado:** 2 semanas  
**Custo:** R$ 8.000 - R$ 12.000  
**Complexidade:** 🟡 Média-Alta

---

## 2.1 Criar Tabela `organizations`

### SQL Migration

**🎯 PROMPT PARA SOFTGEN:**
```
Criar migration SQL para tabela organizations.

Executar no banco DEV primeiro, testar, depois PROD.

SQL completo:

-- Tabela de organizações (imobiliárias)
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled')),
  
  -- Planos e limites
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'pro', 'enterprise')),
  max_properties INTEGER DEFAULT 10,
  max_users INTEGER DEFAULT 3,
  max_rentals INTEGER DEFAULT 10,
  
  -- Dados de contato
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  contact_whatsapp TEXT,
  contact_address TEXT,
  
  -- Personalização visual
  logo_url TEXT,
  primary_color TEXT DEFAULT '#2563eb',
  secondary_color TEXT DEFAULT '#f97316',
  
  -- Configurações específicas
  settings JSONB DEFAULT '{}',
  
  -- Auditoria
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_status ON organizations(status);

-- Comentários para documentação
COMMENT ON TABLE organizations IS 'Organizações (imobiliárias) do sistema multi-tenant';
COMMENT ON COLUMN organizations.slug IS 'URL amigável: seusite.com.br/[slug]';
COMMENT ON COLUMN organizations.plan IS 'Plano de assinatura: free, starter, pro, enterprise';
COMMENT ON COLUMN organizations.max_properties IS 'Limite de imóveis cadastrados';

-- Habilitar RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Policy: Admin vê todas, usuários vêem apenas sua organização
CREATE POLICY "select_own_org" ON organizations FOR SELECT 
USING (
  id IN (
    SELECT organization_id 
    FROM organization_users 
    WHERE user_id = auth.uid()
  )
  OR 
  EXISTS (
    SELECT 1 FROM system_users 
    WHERE id = auth.uid() AND role = 'superadmin'
  )
);

-- Policy: Apenas superadmin cria organizações
CREATE POLICY "admin_insert" ON organizations FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM system_users 
    WHERE id = auth.uid() AND role = 'superadmin'
  )
);

-- Policy: Apenas superadmin edita organizações
CREATE POLICY "admin_update" ON organizations FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM system_users 
    WHERE id = auth.uid() AND role = 'superadmin'
  )
);
```

---

## 2.2 Criar Tabela `organization_users`

### SQL Migration

**🎯 PROMPT PARA SOFTGEN:**
```
Criar migration SQL para relacionamento usuários <-> organizações.

SQL completo:

-- Relacionamento N:N entre usuários e organizações
CREATE TABLE IF NOT EXISTS organization_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'viewer' CHECK (role IN ('owner', 'admin', 'manager', 'viewer')),
  
  -- Auditoria
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Garantir que um usuário não pode estar 2x na mesma organização
  UNIQUE(organization_id, user_id)
);

-- Índices para performance
CREATE INDEX idx_org_users_org ON organization_users(organization_id);
CREATE INDEX idx_org_users_user ON organization_users(user_id);

-- Comentários
COMMENT ON TABLE organization_users IS 'Relacionamento entre usuários e organizações';
COMMENT ON COLUMN organization_users.role IS 'Papel do usuário na organização: owner, admin, manager, viewer';

-- Habilitar RLS
ALTER TABLE organization_users ENABLE ROW LEVEL SECURITY;

-- Policy: Usuário vê seus próprios relacionamentos
CREATE POLICY "select_own" ON organization_users FOR SELECT 
USING (
  user_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM system_users 
    WHERE id = auth.uid() AND role = 'superadmin'
  )
);

-- Policy: Owner/Admin pode adicionar usuários na sua organização
CREATE POLICY "owner_insert" ON organization_users FOR INSERT 
WITH CHECK (
  organization_id IN (
    SELECT organization_id 
    FROM organization_users 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
  OR
  EXISTS (
    SELECT 1 FROM system_users 
    WHERE id = auth.uid() AND role = 'superadmin'
  )
);
```

---

## 2.3 Migrar Dados Existentes para Organização Principal

### SQL para Migração de Dados

**🎯 PROMPT PARA SOFTGEN:**
```
Criar script de migração para transformar sistema atual em multi-tenant.

Objetivo: Seus dados atuais viram "Organização Principal".

SQL completo:

-- 1. Criar organização principal (D'Uvo Enterprise)
INSERT INTO organizations (
  id,
  name,
  slug,
  status,
  plan,
  max_properties,
  max_users,
  contact_name,
  contact_email,
  contact_phone,
  contact_whatsapp,
  contact_address
) VALUES (
  gen_random_uuid(),
  'D''Uvo Enterprise Corporation',
  'duvo-enterprise',
  'active',
  'enterprise',
  999,
  999,
  'Carlos D''Uvo',
  'carlos.uva@terra.com.br',
  '(11) 99680-3386',
  '5511996803386',
  'São Paulo, SP'
) ON CONFLICT (slug) DO NOTHING
RETURNING id;

-- Anote o ID retornado: [ID-DA-ORG-PRINCIPAL]

-- 2. Adicionar organization_id em TODAS as tabelas principais
ALTER TABLE properties ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE locations ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- 3. Preencher organization_id com a organização principal
UPDATE properties SET organization_id = '[ID-DA-ORG-PRINCIPAL]' WHERE organization_id IS NULL;
UPDATE tenants SET organization_id = '[ID-DA-ORG-PRINCIPAL]' WHERE organization_id IS NULL;
UPDATE rentals SET organization_id = '[ID-DA-ORG-PRINCIPAL]' WHERE organization_id IS NULL;
UPDATE payments SET organization_id = '[ID-DA-ORG-PRINCIPAL]' WHERE organization_id IS NULL;
UPDATE locations SET organization_id = '[ID-DA-ORG-PRINCIPAL]' WHERE organization_id IS NULL;

-- 4. Tornar organization_id obrigatório (NOT NULL)
ALTER TABLE properties ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE tenants ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE rentals ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE payments ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE locations ALTER COLUMN organization_id SET NOT NULL;

-- 5. Criar índices
CREATE INDEX idx_properties_org ON properties(organization_id);
CREATE INDEX idx_tenants_org ON tenants(organization_id);
CREATE INDEX idx_rentals_org ON rentals(organization_id);
CREATE INDEX idx_payments_org ON payments(organization_id);
CREATE INDEX idx_locations_org ON locations(organization_id);

-- 6. Associar usuários existentes à organização principal
INSERT INTO organization_users (organization_id, user_id, role)
SELECT '[ID-DA-ORG-PRINCIPAL]', id, 'owner'
FROM system_users
WHERE role = 'admin'
ON CONFLICT (organization_id, user_id) DO NOTHING;

INSERT INTO organization_users (organization_id, user_id, role)
SELECT '[ID-DA-ORG-PRINCIPAL]', id, 'manager'
FROM system_users
WHERE role = 'manager'
ON CONFLICT (organization_id, user_id) DO NOTHING;

Após executar, validar:
SELECT 
  o.name as organizacao,
  COUNT(DISTINCT p.id) as imoveis,
  COUNT(DISTINCT r.id) as contratos,
  COUNT(DISTINCT pay.id) as pagamentos
FROM organizations o
LEFT JOIN properties p ON p.organization_id = o.id
LEFT JOIN rentals r ON r.organization_id = o.id
LEFT JOIN payments pay ON pay.organization_id = o.id
WHERE o.slug = 'duvo-enterprise'
GROUP BY o.id, o.name;

Resultado esperado:
- 89 contratos
- Seus imóveis
- Seus pagamentos
```

---

## 2.4 Atualizar TODAS as RLS Policies

**⚠️ CRÍTICO:** Esta é a parte mais importante! RLS garante isolamento entre organizações.

**🎯 PROMPT PARA SOFTGEN:**
```
Reescrever TODAS as RLS policies para filtrar por organization_id.

IMPORTANTE: Fazer BACKUP do banco antes de executar!

SQL para CADA tabela (properties, tenants, rentals, payments, locations):

-- 1. PROPERTIES
DROP POLICY IF EXISTS "select_own" ON properties;
DROP POLICY IF EXISTS "insert_own" ON properties;
DROP POLICY IF EXISTS "update_own" ON properties;
DROP POLICY IF EXISTS "delete_own" ON properties;

CREATE POLICY "select_org_properties" ON properties FOR SELECT 
USING (
  organization_id IN (
    SELECT organization_id 
    FROM organization_users 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "insert_org_properties" ON properties FOR INSERT 
WITH CHECK (
  organization_id IN (
    SELECT organization_id 
    FROM organization_users 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "update_org_properties" ON properties FOR UPDATE 
USING (
  organization_id IN (
    SELECT organization_id 
    FROM organization_users 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "delete_org_properties" ON properties FOR DELETE 
USING (
  organization_id IN (
    SELECT organization_id 
    FROM organization_users 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
);

-- 2. TENANTS (copiar estrutura acima, trocar table name)
-- 3. RENTALS (copiar estrutura acima, trocar table name)
-- 4. PAYMENTS (copiar estrutura acima, trocar table name)
-- 5. LOCATIONS (copiar estrutura acima, trocar table name)

Aplicar em TODAS as tabelas que tem organization_id!
```

---

## 2.5 Atualizar Services para Filtrar por Organização

**🎯 PROMPT PARA SOFTGEN:**
```
Atualizar TODOS os services para incluir organization_id nos queries.

Arquivos afetados:
- src/services/propertyService.ts
- src/services/tenantService.ts
- src/services/rentalService.ts
- src/services/paymentService.ts
- src/services/locationService.ts

Mudança necessária em TODOS os queries:

ANTES:
const { data } = await supabase
  .from("properties")
  .select("*");

DEPOIS:
const { data } = await supabase
  .from("properties")
  .select("*");
  // RLS já filtra por organization_id automaticamente!
  // Não precisa adicionar .eq('organization_id', ...)

⚠️ IMPORTANTE: 
- RLS policies JÁ filtram por organização
- Não adicionar manualmente organization_id nos queries
- RLS é transparente - código continua igual
- Apenas queries de INSERT precisam passar organization_id

Para INSERTs, obter organization_id do usuário:
const { data: orgUser } = await supabase
  .from("organization_users")
  .select("organization_id")
  .eq("user_id", userId)
  .single();

const { data } = await supabase
  .from("properties")
  .insert({
    ...propertyData,
    organization_id: orgUser.organization_id
  });
```

---

## 2.6 Criar Context de Organização Atual

**🎯 PROMPT PARA SOFTGEN:**
```
Criar src/contexts/OrganizationContext.tsx para gerenciar organização atual do usuário.

Objetivo: Centralizar lógica de qual organização está ativa.

Código de referência:

import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: string;
  max_properties: number;
  max_users: number;
  logo_url: string | null;
}

interface OrganizationContextType {
  currentOrganization: Organization | null;
  organizations: Organization[];
  loading: boolean;
  switchOrganization: (orgId: string) => void;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOrganizations() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Buscar organizações do usuário
        const { data: orgUsers } = await supabase
          .from("organization_users")
          .select(`
            organization_id,
            organizations (*)
          `)
          .eq("user_id", user.id);

        if (orgUsers && orgUsers.length > 0) {
          const orgs = orgUsers.map(ou => ou.organizations).filter(Boolean);
          setOrganizations(orgs);
          
          // Primeira organização é a padrão
          setCurrentOrganization(orgs[0]);
        }
      } catch (error) {
        console.error("Erro ao carregar organizações:", error);
      } finally {
        setLoading(false);
      }
    }

    loadOrganizations();
  }, []);

  const switchOrganization = (orgId: string) => {
    const org = organizations.find(o => o.id === orgId);
    if (org) {
      setCurrentOrganization(org);
      // Salvar preferência no localStorage
      localStorage.setItem("currentOrganizationId", orgId);
    }
  };

  return (
    <OrganizationContext.Provider value={{
      currentOrganization,
      organizations,
      loading,
      switchOrganization
    }}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (!context) throw new Error("useOrganization must be used within OrganizationProvider");
  return context;
}

Integrar em _app.tsx:
<OrganizationProvider>
  <AuthProvider>
    <Layout>
      {children}
    </Layout>
  </AuthProvider>
</OrganizationProvider>
```

---

## 2.7 Adicionar Seletor de Organização no Header (Multi-org)

**🎯 PROMPT PARA SOFTGEN:**
```
Adicionar dropdown de seleção de organização no Layout.tsx (header).

Requisitos:
1. Só aparecer se usuário tem mais de 1 organização
2. Mostrar nome da organização atual
3. Dropdown lista todas as organizações do usuário
4. Ao clicar em uma, chama switchOrganization()
5. Visual: ao lado do nome do usuário

Usar useOrganization() hook.

Exemplo visual:
[Logo] [D'Uvo Enterprise ▼] [Notificações] [User Menu]

Ao clicar no dropdown:
- D'Uvo Enterprise ✓
- Imobiliária ABC
- Imóveis XYZ
```

---

## ✅ Checklist Fase 2

- [ ] Tabela `organizations` criada
- [ ] Tabela `organization_users` criada
- [ ] Dados migrados para organização principal
- [ ] Campo `organization_id` em TODAS as tabelas
- [ ] RLS policies reescritas para multi-tenant
- [ ] Services atualizados (mas RLS já filtra!)
- [ ] OrganizationContext criado
- [ ] Seletor de organização no header
- [ ] Testado: Criar 2ª organização de teste
- [ ] Testado: Usuário 1 não vê dados do usuário 2

**Resultado:** Sistema multi-tenant completo com RLS ✅

---

# FASE 3: URLs Públicas por Organização

**Objetivo:** Cada organização ter sua própria página pública de anúncios.

**Tempo estimado:** 1 semana  
**Custo:** R$ 3.000 - R$ 5.000  
**Complexidade:** 🟢 Baixa-Média

---

## 3.1 Criar Hook `usePublicPropertiesByOrg`

**🎯 PROMPT PARA SOFTGEN:**
```
Criar src/hooks/usePublicPropertiesByOrg.ts para buscar imóveis de UMA organização.

Baseado no usePublicProperties.ts existente, mas filtrando por organization_id.

Código de referência:

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Property } from "@/types";

export function usePublicPropertiesByOrg(organizationId: string | undefined) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!organizationId) return;

    async function fetchProperties() {
      try {
        setLoading(true);
        
        // Buscar imóveis APENAS desta organização
        const { data, error: fetchError } = await supabase
          .from("properties")
          .select(`
            *,
            locations (*)
          `)
          .eq("organization_id", organizationId)
          .eq("status", "available");

        if (fetchError) throw fetchError;

        // Mapear dados...
        setProperties(mappedProperties);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchProperties();
  }, [organizationId]);

  return { properties, loading, error };
}
```

---

## 3.2 Criar Páginas `[slug]/index.tsx` e `[slug]/imovel/[id].tsx`

**🎯 PROMPT PARA SOFTGEN:**
```
Criar estrutura de rotas multi-tenant para páginas públicas.

Estrutura:
pages/
├─ [slug]/
│  ├─ index.tsx → Listagem de imóveis da organização
│  └─ imovel/
│     └─ [id].tsx → Detalhes do imóvel

Página 1: pages/[slug]/index.tsx
- Copiar pages/index.tsx
- Adicionar useOrganizationBySlug(slug) no topo
- Trocar usePublicProperties() por usePublicPropertiesByOrg(organization.id)
- Personalizar header, footer, textos com dados da organização
- Se organização não existe ou slug inválido → 404

Página 2: pages/[slug]/imovel/[id].tsx
- Copiar pages/imovel/[id].tsx
- Adicionar useOrganizationBySlug(slug)
- Buscar imóvel filtrando por organization_id:
  .eq("id", id)
  .eq("organization_id", organization.id) // 🔥 CRÍTICO
- Personalizar com dados da organização
- Se organização ou imóvel não existe → 404

⚠️ IMPORTANTE: 
- NÃO permitir acesso a imoveis/[id] diretamente (rota antiga)
- SEMPRE usar [slug]/imovel/[id] (nova rota)
- Garantir que imóvel pertence àquela organização
```

---

## 3.3 Adaptar `PublicHeader` para Multi-tenant

**🎯 PROMPT PARA SOFTGEN:**
```
Atualizar src/components/public/PublicHeader.tsx para receber organização.

Mudanças:
1. Adicionar prop opcional: organization?: Organization
2. Se organization existe:
   - Mostrar organization.name
   - Mostrar organization.logo_url (se existir)
   - Link "Gerenciador" aponta para /login
3. Se organization NÃO existe (página raiz):
   - Mostrar siteConfig padrão (D'Uvo Enterprise)
   - Comportamento atual

Código:
export function PublicHeader({ organization }: { organization?: Organization }) {
  const displayName = organization?.name || siteConfig.name;
  const displayLogo = organization?.logo_url || null;

  return (
    <header>
      {displayLogo ? (
        <img src={displayLogo} alt={displayName} />
      ) : (
        <Building2 />
      )}
      <h1>{displayName}</h1>
    </header>
  );
}
```

---

## 3.4 Atualizar Footer e Contatos

**🎯 PROMPT PARA SOFTGEN:**
```
Criar componente src/components/public/PublicFooter.tsx que recebe organização.

Similar ao footer em index.tsx, mas com dados dinâmicos:

export function PublicFooter({ organization }: { organization?: Organization }) {
  const displayName = organization?.name || siteConfig.name;
  const phone = organization?.contact_phone || siteConfig.contact.phone;
  const email = organization?.contact_email || siteConfig.contact.email;
  const address = organization?.contact_address || siteConfig.contact.address;

  return (
    <footer>
      {/* Usar dados dinâmicos */}
    </footer>
  );
}

Integrar nas páginas [slug]/index.tsx e [slug]/imovel/[id].tsx.
```

---

## 3.5 Criar Página de Admin: Gerenciar Organizações

**🎯 PROMPT PARA SOFTGEN:**
```
Criar src/pages/admin/organizations.tsx para superadmin gerenciar organizações.

Requisitos:
1. Só acessível por superadmin (hasPermission('superadmin'))
2. Lista todas as organizações
3. Criar nova organização (modal)
4. Editar organização existente
5. Ativar/suspender/cancelar organização
6. Ver estatísticas: nº de imóveis, usuários, contratos

Modal de criação:
- Nome da organização
- Slug (auto-gerar do nome, validar único)
- Plano (free, starter, pro, enterprise)
- Limites (properties, users, rentals)
- Contatos (nome, email, telefone, whatsapp)
- Logo (upload opcional)

Validações:
- Slug deve ser único
- Slug deve ser URL-friendly (a-z, 0-9, hífen)
- Email válido
- Telefone válido
```

---

## 3.6 Testar URLs Multi-Tenant

### Teste 1: Criar Organização de Teste
```sql
-- No Supabase SQL Editor (DEV)
INSERT INTO organizations (
  name,
  slug,
  status,
  plan,
  contact_email,
  contact_phone
) VALUES (
  'Imobiliária ABC Teste',
  'imobiliaria-abc-teste',
  'active',
  'free',
  'teste@abc.com.br',
  '(11) 98765-4321'
);

-- Criar um imóvel de teste para esta organização
-- (ajustar organization_id)
```

### Teste 2: Acessar URLs
```
http://localhost:3000/imobiliaria-abc-teste
→ Deve mostrar imóveis da ABC (vazio se não criou)

http://localhost:3000/duvo-enterprise
→ Deve mostrar seus 89 contratos

http://localhost:3000/slug-invalido
→ Deve mostrar 404
```

### Teste 3: Isolamento de Dados
```
1. Criar imóvel X na organização D'Uvo
2. Criar imóvel Y na organização ABC
3. Acessar /duvo-enterprise → Ver apenas imóvel X
4. Acessar /imobiliaria-abc-teste → Ver apenas imóvel Y
```

---

## ✅ Checklist Fase 3

- [ ] Hook `usePublicPropertiesByOrg` criado
- [ ] Páginas `[slug]/index.tsx` criadas
- [ ] Páginas `[slug]/imovel/[id].tsx` criadas
- [ ] `PublicHeader` adaptado para multi-tenant
- [ ] `PublicFooter` criado e integrado
- [ ] Página admin de organizações criada
- [ ] Testado: Criar organização de teste
- [ ] Testado: Acessar URLs diferentes
- [ ] Testado: Isolamento de dados entre organizações

**Resultado:** Cada organização tem sua URL pública exclusiva ✅

---

# VALIDAÇÃO FINAL

## Checklist Geral do Sistema

### Infraestrutura
- [ ] Projeto Supabase DEV existe e funciona
- [ ] Projeto Supabase PROD existe e funciona
- [ ] Variável `USE_PROD_IN_DEV` alterna corretamente
- [ ] Badge de ambiente funciona (DEV/PROD)

### SaaS
- [ ] Campo `saas_enabled` existe e funciona
- [ ] Toggle SaaS na página Configurações
- [ ] Badge "SaaS ATIVO/DESLIGADO" visível
- [ ] Features de gateway ocultas quando SaaS = false

### Multi-Tenant
- [ ] Tabela `organizations` criada
- [ ] Tabela `organization_users` criada
- [ ] RLS policies atualizadas para multi-tenant
- [ ] Dados migrados para organização principal
- [ ] Context de organização funciona
- [ ] Seletor de organização no header (se >1 org)

### URLs Públicas
- [ ] URLs `/[slug]` funcionam
- [ ] URLs `/[slug]/imovel/[id]` funcionam
- [ ] Isolamento entre organizações funciona
- [ ] 404 para slugs inválidos
- [ ] Personalização por organização funciona

### Testes de Integração
- [ ] Usuário 1 não vê dados do Usuário 2
- [ ] Criar nova organização funciona
- [ ] Adicionar usuário a organização funciona
- [ ] Trocar de organização funciona
- [ ] Cada org tem página pública exclusiva

---

## 🎉 Próximos Passos Após Implementação

1. **Beta Privado:** Convidar 3-5 imobiliárias amigas para testar
2. **Feedback:** Coletar sugestões e ajustar
3. **Documentação:** Criar guia de onboarding para novos clientes
4. **Marketing:** Preparar landing page do SaaS
5. **Precificação:** Definir preços finais dos planos
6. **Launch:** Lançamento público!

---

## 📞 Suporte

Dúvidas durante implementação? Use os prompts exatos fornecidos em cada seção.

Se encontrar erro, sempre:
1. Verificar console do navegador
2. Verificar logs do Supabase
3. Validar RLS policies
4. Testar em DEV antes de PROD

**Boa implementação! 🚀**