# 🎯 PROMPT COMPLETO: Fase 0 - Separação Dev/Prod

**Use este prompt exatamente como está abaixo. Copie e cole no Softgen.**

---

## 📝 ANTES DE COMEÇAR: Criar Projeto Supabase DEV (MANUAL)

**⚠️ ATENÇÃO:** Este passo você PRECISA fazer manualmente no navegador (não tem como automatizar).

### Passo a Passo Visual (5 minutos):

1. **Abra uma nova aba** no navegador
2. **Acesse:** https://supabase.com/dashboard
3. **Faça login** com sua conta Supabase
4. **Clique em "New Project"** (botão verde no canto superior direito)
5. **Preencha o formulário:**
   ```
   Name: gerenciador-locacoes-DEV
   Database Password: [crie uma senha forte e ANOTE]
   Region: South America (São Paulo)
   Pricing Plan: Free
   ```
6. **Clique em "Create new project"**
7. **Aguarde 2-3 minutos** (Supabase está criando o banco)

8. **Após criar, copie as credenciais:**
   - Na tela do projeto, vá em **Settings** (menu lateral esquerdo)
   - Clique em **API**
   - **COPIE E ANOTE** estes 3 valores:

   ```
   Project URL: https://XXXXXXXX.supabase.co
   anon/public key: eyJhbGci...
   service_role key: eyJhbGci...
   ```

**✅ Pronto!** Agora volte para o Softgen e execute o prompt abaixo.

---

## 🚀 PROMPT PARA EXECUTAR NO SOFTGEN

**Copie TUDO abaixo e cole no Softgen:**

```
FASE 0: SEPARAÇÃO DE AMBIENTES DEV/PROD

Objetivo: Configurar sistema para usar banco de desenvolvimento e produção separadamente, com chave fácil para alternar entre eles no ambiente de desenvolvimento do Softgen.

=== PARTE 1: ATUALIZAR VARIÁVEIS DE AMBIENTE ===

Atualizar o arquivo .env.local com a seguinte estrutura:

```env
# ============================================
# 🔴 PRODUÇÃO (Banco Atual - Manter)
# ============================================
NEXT_PUBLIC_SUPABASE_URL_PROD=https://ygqwacfyxcsycaegbnrp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY_PROD=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlncXdhY2Z5eGNzeWNhZWdibnJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY5NzU0OTIsImV4cCI6MjA1MjU1MTQ5Mn0.RFKOoIDqTTLFl_1oWfpSEDhEJ6dL9nTp3rvUIGnS7I8

# ============================================
# 🟢 DESENVOLVIMENTO (Novo - Preencher)
# ============================================
# Cole aqui os valores que você copiou do Supabase DEV:
NEXT_PUBLIC_SUPABASE_URL_DEV=https://XXXXXXXX.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY_DEV=eyJhbGci...

# ============================================
# 🔥 CHAVE MÁGICA - Alternar Bancos
# ============================================
# false = Usar banco DEV (padrão, seguro para testes)
# true = Usar banco PROD (ver dados reais no Softgen)
NEXT_PUBLIC_USE_PROD_IN_DEV=false

# ============================================
# Variáveis Antigas (Compatibilidade)
# ============================================
NEXT_PUBLIC_SUPABASE_URL=https://ygqwacfyxcsycaegbnrp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlncXdhY2Z5eGNzeWNhZWdibnJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY5NzU0OTIsImV4cCI6MjA1MjU1MTQ5Mn0.RFKOoIDqTTLFl_1oWfpSEDhEJ6dL9nTp3rvUIGnS7I8
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlncXdhY2Z5eGNzeWNhZWdibnJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjk3NTQ5MiwiZXhwIjoyMDUyNTUxNDkyfQ.bQG7Cc5TU5j7PGPd_cPg5CgqLj6pn5oHcpb2bJXpLVg
```

IMPORTANTE: Substituir os valores XXXXXXXX e eyJhbGci... pelos valores reais que você copiou do Supabase DEV.

=== PARTE 2: ATUALIZAR CLIENTE SUPABASE ===

Atualizar o arquivo src/integrations/supabase/client.ts para detectar automaticamente qual banco usar.

Substituir TODO o conteúdo do arquivo por:

```typescript
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// Detectar ambiente
const isDev = process.env.NODE_ENV === "development";
const useProdInDev = process.env.NEXT_PUBLIC_USE_PROD_IN_DEV === "true";

// Escolher credenciais baseado no ambiente
const supabaseUrl = (isDev && !useProdInDev)
  ? process.env.NEXT_PUBLIC_SUPABASE_URL_DEV!
  : process.env.NEXT_PUBLIC_SUPABASE_URL_PROD!;

const supabaseAnonKey = (isDev && !useProdInDev)
  ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_DEV!
  : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_PROD!;

// Log de qual banco está sendo usado
const activeDb = (isDev && !useProdInDev) ? "DEV 🟢" : "PROD 🔴";
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("🔌 Supabase Connection Info:");
console.log("   Environment:", process.env.NODE_ENV);
console.log("   Active Database:", activeDb);
console.log("   URL:", supabaseUrl);
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

// Validar que as variáveis existem
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ ERRO: Variáveis de ambiente Supabase não encontradas!");
  console.error("   Certifique-se de que .env.local está configurado corretamente.");
  throw new Error("Supabase credentials missing");
}

// Criar cliente Supabase
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
```

=== PARTE 3: CRIAR BADGE VISUAL DE AMBIENTE ===

Criar novo arquivo src/components/EnvironmentBadge.tsx:

```typescript
"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { AlertCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function EnvironmentBadge() {
  const [environment, setEnvironment] = useState<{
    isDev: boolean;
    useProdInDev: boolean;
    activeDb: string;
  } | null>(null);

  useEffect(() => {
    // Ler variáveis de ambiente no cliente
    const isDev = process.env.NODE_ENV === "development";
    const useProdInDev = process.env.NEXT_PUBLIC_USE_PROD_IN_DEV === "true";
    const activeDb = (isDev && !useProdInDev) ? "DEV" : "PROD";

    setEnvironment({ isDev, useProdInDev, activeDb });
  }, []);

  // Não mostrar em produção
  if (!environment?.isDev) return null;

  const isUsingProd = environment.useProdInDev;
  const badgeVariant = isUsingProd ? "destructive" : "default";
  const icon = isUsingProd ? "🔴" : "🟢";
  const label = `${icon} ${environment.activeDb}`;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant={badgeVariant}
            className="fixed top-4 right-4 z-50 cursor-help font-mono text-xs px-3 py-1.5"
          >
            {isUsingProd && <AlertCircle className="w-3 h-3 mr-1" />}
            {label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-sm space-y-1">
            <p className="font-semibold">
              Você está usando dados de {isUsingProd ? "PRODUÇÃO" : "DESENVOLVIMENTO"}
            </p>
            <p className="text-xs text-muted-foreground">
              {isUsingProd
                ? "⚠️ Cuidado: Mudanças afetam dados reais!"
                : "✅ Seguro: Mudanças afetam apenas dados de teste"}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Para trocar, altere NEXT_PUBLIC_USE_PROD_IN_DEV no .env.local
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
```

=== PARTE 4: INTEGRAR BADGE NO LAYOUT ===

Atualizar src/components/Layout.tsx para incluir o badge de ambiente.

Adicionar no início do arquivo (imports):
```typescript
import { EnvironmentBadge } from "@/components/EnvironmentBadge";
```

Adicionar no JSX do Layout, logo após a abertura do <div> principal:
```typescript
<div className="min-h-screen bg-background">
  <EnvironmentBadge />
  
  {/* Resto do Layout continua igual... */}
```

=== PARTE 5: APLICAR MIGRATIONS NO BANCO DEV ===

Executar no terminal do Softgen (send_terminal_command):

```bash
# Listar migrations existentes
ls -la supabase/migrations/

# Criar arquivo temporário com todas as migrations concatenadas
cat supabase/migrations/*.sql > /tmp/all_migrations.sql

# Exibir quantas migrations serão aplicadas
echo "Total de migrations a aplicar:" && ls supabase/migrations/*.sql | wc -l
```

IMPORTANTE: Após executar os comandos acima, você precisará aplicar as migrations manualmente no Supabase DEV:

1. Abra https://supabase.com/dashboard
2. Selecione o projeto DEV (gerenciador-locacoes-DEV)
3. Vá em "SQL Editor" no menu lateral
4. Clique em "New Query"
5. Cole o conteúdo do arquivo que foi gerado (todas as migrations)
6. Clique em "Run" para executar

Alternativa: Se preferir aplicar uma por vez, execute cada arquivo .sql separadamente no SQL Editor.

=== VALIDAÇÃO E TESTES ===

Após implementar tudo acima, fazer os seguintes testes:

TESTE 1: Verificar ambiente DEV
1. Garantir que .env.local tem: NEXT_PUBLIC_USE_PROD_IN_DEV=false
2. Reiniciar o servidor Next.js (botão "Restart Server")
3. Abrir o sistema no preview
4. Verificar:
   - Badge no canto superior direito mostra "🟢 DEV"
   - Console do navegador mostra: "Active Database: DEV 🟢"
   - Dados mostrados são do banco DEV (vazio ou poucos dados)

TESTE 2: Alternar para ambiente PROD
1. Alterar .env.local para: NEXT_PUBLIC_USE_PROD_IN_DEV=true
2. Reiniciar o servidor Next.js
3. Abrir o sistema no preview
4. Verificar:
   - Badge mostra "🔴 PROD" com ícone de alerta
   - Console mostra: "Active Database: PROD 🔴"
   - Dados mostrados são do banco PROD (seus 89 contratos reais)

TESTE 3: Voltar para DEV
1. Alterar .env.local para: NEXT_PUBLIC_USE_PROD_IN_DEV=false
2. Reiniciar o servidor
3. Confirmar que está usando DEV novamente

Executar check_for_errors após implementação completa.

RESULTADO ESPERADO:
✅ Sistema com dois bancos separados (DEV e PROD)
✅ Chave fácil para alternar entre eles (USE_PROD_IN_DEV)
✅ Badge visual mostrando qual banco está ativo
✅ Logs claros no console
✅ Segurança: DEV por padrão, PROD apenas quando explicitamente solicitado
```

---

## ✅ CHECKLIST FINAL

Após executar o prompt acima, verificar:

- [ ] Projeto Supabase DEV foi criado manualmente
- [ ] Credenciais DEV foram copiadas e coladas no .env.local
- [ ] Arquivo client.ts foi atualizado
- [ ] Componente EnvironmentBadge foi criado
- [ ] Badge foi integrado no Layout
- [ ] Migrations foram aplicadas no banco DEV
- [ ] TESTE 1 passou (mostra 🟢 DEV)
- [ ] TESTE 2 passou (mostra 🔴 PROD)
- [ ] TESTE 3 passou (volta para 🟢 DEV)
- [ ] Nenhum erro no console
- [ ] check_for_errors passou sem erros

**✅ Fase 0 concluída com sucesso!**

---

## 🆘 PROBLEMAS COMUNS

### Problema 1: "Supabase credentials missing"
**Solução:** Você não copiou corretamente as credenciais do Supabase DEV no .env.local. Verifique se os valores NEXT_PUBLIC_SUPABASE_URL_DEV e NEXT_PUBLIC_SUPABASE_ANON_KEY_DEV estão preenchidos.

### Problema 2: Badge não aparece
**Solução:** Badge só aparece em desenvolvimento (NODE_ENV=development). No Vercel (produção) ele fica oculto automaticamente.

### Problema 3: "Cannot read properties of undefined"
**Solução:** Reinicie o servidor Next.js após alterar .env.local. Variáveis de ambiente só são carregadas no início do servidor.

### Problema 4: Migrations não aplicadas no DEV
**Solução:** Você precisa aplicar manualmente no SQL Editor do Supabase. Não tem como automatizar esse passo inicial.

---

## 📞 PRÓXIMOS PASSOS

Após concluir esta Fase 0, você estará pronto para:

1. **Testar com segurança** - Use banco DEV para experimentos
2. **Ver dados reais quando necessário** - Alterne para PROD com 1 clique
3. **Implementar Fase 1** - Adicionar toggle SaaS (próximo prompt)

**Parabéns! Você criou um ambiente de desenvolvimento profissional! 🎉**