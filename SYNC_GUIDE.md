# Guia de Sincronização do Repositório Local

## Problema Identificado

Seu repositório local está desatualizado porque o comando está tentando usar `origin/main`, mas pode haver um problema com:
- O branch remoto correto
- A configuração do remote
- Cache local do Git

## Solução Rápida

### Opção 1: Usar o Script Automático (Windows)

```bash
# Execute o script de sincronização
.\scripts\sync-local.bat
```

### Opção 2: Comandos Manuais

```bash
# 1. Verifique qual branch você está
git branch --show-current

# 2. Liste todos os branches remotos disponíveis
git branch -r

# 3. Verifique se o remote está configurado corretamente
git remote -v

# 4. Busque todas as atualizações
git fetch origin --all

# 5. Limpe todas as alterações locais
git reset --hard
git clean -fd

# 6. Atualize para o branch correto
# Se o branch principal for 'main':
git reset --hard origin/main

# OU se for 'master':
git reset --hard origin/master

# 7. Instale as dependências
npm install

# 8. Verifique o commit atual
git log -1 --oneline
```

## Verificações Importantes

### 1. Confirmar o Branch Remoto

```bash
# Veja todos os branches remotos
git branch -r

# Deve mostrar algo como:
# origin/main
# OU
# origin/master
```

### 2. Verificar o Remote

```bash
git remote -v

# Deve mostrar:
# origin  <URL_DO_SEU_REPOSITORIO> (fetch)
# origin  <URL_DO_SEU_REPOSITORIO> (push)
```

### 3. Ver os Commits Mais Recentes no Remoto

```bash
# Para ver os últimos 5 commits da branch main
git log origin/main -5 --oneline

# Para ver os últimos 5 commits da branch master
git log origin/master -5 --oneline
```

## Sincronização Diária Recomendada

Crie um arquivo `sync.bat` na raiz do projeto:

```bash
@echo off
git fetch origin --all
git reset --hard origin/main
git clean -fd
npm install
echo Sincronizacao concluida!
git log -1 --oneline
pause
```

## Troubleshooting

### Problema: Branch 'main' não existe

**Solução:** Seu repositório usa 'master' ao invés de 'main'

```bash
git reset --hard origin/master
```

### Problema: Remote 'origin' não configurado

**Solução:** Configure o remote

```bash
git remote add origin <URL_DO_REPOSITORIO>
git fetch origin
```

### Problema: Alterações locais não são limpas

**Solução:** Force a limpeza

```bash
git reset --hard HEAD
git clean -fdx  # -x também remove arquivos ignorados
```

### Problema: npm install falha

**Solução:** Limpe o cache e reinstale

```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

## Verificar se Está Atualizado

Após sincronizar, compare com o Softgen:

```bash
# Veja o commit atual
git log -1 --oneline

# Compare com os commits recentes
git log -10 --oneline
```

O commit mais recente deve corresponder ao que você vê no histórico do Git no Softgen.

## Dica: Alias para Sincronização Rápida

Adicione ao seu `.gitconfig`:

```bash
git config --global alias.sync '!git fetch origin && git reset --hard origin/main && git clean -fd && npm install'
```

Depois use apenas:

```bash
git sync
```