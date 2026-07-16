# 🚀 SETUP SUPER SIMPLES - Testes no VSCode

## 📝 PASSO 1: Criar arquivo health.ts

O arquivo `src/pages/api/health.ts` precisa ser criado manualmente no seu VSCode.

### Como fazer:

1. **No VSCode, navegue até a pasta:** `src/pages/api/`

2. **Clique com botão direito** na pasta `api` → **New File**

3. **Nome do arquivo:** `health.ts`

4. **Cole este código dentro:**

```typescript
import type { NextApiRequest, NextApiResponse } from "next";

/**
 * Health Check Endpoint
 * Usado pelos testes e monitoramento para verificar se a aplicação está rodando
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Retorna status OK com timestamp
    return res.status(200).json({
      status: "ok",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Health check failed",
    });
  }
}
```

5. **Salve o arquivo** (Ctrl+S)

---

## ✅ PASSO 2: Rodar os testes

Agora os testes vão criar os usuários automaticamente! Basta rodar:

```bash
# Terminal 1 - Rodar o servidor Next.js
npm run dev

# Terminal 2 - Rodar os testes
npm run test:e2e:ui
```

---

## 🎯 O QUE FOI CONFIGURADO AUTOMATICAMENTE

Os testes agora criam 3 usuários automaticamente:

1. **Admin** 
   - Email: `admin@teste.com`
   - Senha: `Admin@123`
   - Acesso total ao sistema

2. **Financeiro**
   - Email: `financeiro@teste.com`
   - Senha: `Financeiro@123`
   - Acesso a pagamentos e relatórios

3. **Gestão**
   - Email: `gestao@teste.com`
   - Senha: `Gestao@123`
   - Acesso a imóveis e locações

---

## 🧹 LIMPEZA

Os usuários de teste são limpos automaticamente após os testes rodarem.

Se quiser limpar manualmente, você pode:

```bash
# Deletar usuários de teste manualmente no Supabase Dashboard
# Authentication → Users → Buscar por "@teste.com" → Delete
```

---

## 🆘 PROBLEMAS COMUNS

### Erro: "Cannot find module health.ts"
- **Solução:** Certifique-se de criar o arquivo `health.ts` exatamente em `src/pages/api/health.ts`

### Erro: "User already exists"
- **Solução:** Normal! Os usuários já existem no banco. Os testes vão continuar normalmente.

### Erro: "Database connection failed"
- **Solução:** Verifique se o `.env.local` está correto com as chaves do Supabase

### Testes falhando
- **Solução:** Certifique-se de que o servidor está rodando com `npm run dev` em um terminal separado

---

## 💡 DICA PROFISSIONAL

Salve este atalho no seu terminal:

```bash
# Criar alias para facilitar
alias test-ui="npm run dev & sleep 5 && npm run test:e2e:ui"
```

Depois basta rodar: `test-ui`

Isso vai:
1. Iniciar o servidor Next.js
2. Aguardar 5 segundos
3. Abrir a interface de testes do Playwright

---

**Pronto! Agora você pode rodar os testes sem preocupação.** ✅