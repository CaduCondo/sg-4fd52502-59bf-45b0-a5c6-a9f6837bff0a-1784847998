# 🎯 COMANDOS DEFINITIVOS - Testes E2E

## ⚡ SETUP RÁPIDO (1 minuto)

```bash
# 1. Sincronizar com Softgen
git pull origin main

# 2. Instalar dependências
npm install

# 3. Criar usuários de teste automaticamente
npm run test:setup

# 4. Rodar testes
npm run test:e2e:ui
```

**Pronto! ✅**

---

## 📋 COMANDOS POR SITUAÇÃO

### 🆕 Primeira vez configurando testes:
```bash
git pull origin main
npm install
npm run test:setup
```

### 🔄 Todo dia (sincronizar com Softgen):
```bash
git pull origin main
```

### 🧪 Rodar testes com interface visual:
```bash
npm run test:e2e:ui
```

### 🚀 Rodar testes simples (smoke tests):
```bash
npm run test:smoke
```

### 🐛 Rodar em modo debug:
```bash
npm run test:e2e:debug
```

---

## ⚠️ SE DER ERRO

### Erro: "Cannot find module"
```bash
npm install
```

### Erro: "env variables undefined"
```bash
# Verificar se .env.local existe
ls -la .env.local

# Se não existir, criar:
echo 'NEXT_PUBLIC_SUPABASE_URL=https://yrknfwe1lbuwrhzzwnrr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anon_aqui
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role_aqui
NEXT_PUBLIC_SITE_URL=http://localhost:3000' > .env.local
```

### Erro: "Port 3000 already in use"
```bash
# Matar processo na porta 3000
npx kill-port 3000

# Rodar servidor novamente
npm run dev
```

---

## 🎯 FLUXO IDEAL DIÁRIO

```bash
# 1. Sincronizar (início do dia)
git pull origin main

# 2. Rodar servidor (terminal 1)
npm run dev

# 3. Rodar testes (terminal 2)
npm run test:e2e:ui
```

---

## 📝 SCRIPTS DISPONÍVEIS

| Comando | O que faz |
|---------|-----------|
| `npm run test:setup` | Cria usuários de teste automaticamente |
| `npm run test:e2e:ui` | Interface visual (recomendado) |
| `npm run test:smoke` | Testes rápidos essenciais |
| `npm run test:e2e` | Todos os testes (headless) |
| `npm run test:e2e:headed` | Com navegador visível |
| `npm run test:e2e:debug` | Modo debug passo-a-passo |

---

## ✅ CHECKLIST ANTES DE RODAR TESTES

- [ ] Servidor rodando (`npm run dev`)
- [ ] Arquivo `.env.local` existe
- [ ] Usuários de teste criados (`npm run test:setup`)
- [ ] Dependências instaladas (`npm install`)

---

## 🆘 SUPORTE RÁPIDO

**Testes não funcionam?**
```bash
# Reset completo
git pull origin main
rm -rf node_modules package-lock.json
npm install
npm run test:setup
npm run test:e2e:ui
```

**Conflitos no git?**
```bash
git fetch origin
git reset --hard origin/main
git clean -fd
```

---

**Salve este arquivo nos favoritos!** 📌