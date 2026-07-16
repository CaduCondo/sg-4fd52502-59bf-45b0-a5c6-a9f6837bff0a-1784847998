# 🚀 GUIA RÁPIDO - 3 Comandos para Funcionar

## 1️⃣ Sincronizar
```bash
git pull origin main
```

## 2️⃣ Setup (primeira vez)
```bash
npm install
npm run test:setup
```

## 3️⃣ Rodar
```bash
npm run test:e2e:ui
```

---

## ⚠️ IMPORTANTE

**Antes de rodar os testes, o servidor DEVE estar rodando:**

```bash
# Terminal 1
npm run dev

# Terminal 2  
npm run test:e2e:ui
```

---

## 📌 Comandos Salvos

Copie e cole no terminal (tudo de uma vez):

```bash
git pull origin main && npm install && npm run test:setup
```

Depois:

```bash
npm run dev
```

Em outro terminal:

```bash
npm run test:e2e:ui
```

---

**Pronto! ✅**