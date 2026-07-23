# 🔄 Como Atualizar Seu Projeto - Guia Super Simples

## Passo 1: Abrir o Terminal do Windows

1. Aperte as teclas `Windows + R` juntas
2. Digite: `cmd` 
3. Clique em OK

Ou simplesmente:
- Clique no menu Iniciar
- Digite: `cmd`
- Aperte Enter

## Passo 2: Ir até a pasta do seu projeto

No terminal preto que abriu, digite (ou copie e cole):

```
cd C:\Users\debor\Documents\sistema_locacao
```

Depois aperte Enter.

## Passo 3: Executar o Script de Atualização

Agora digite (ou copie e cole):

```
scripts\sync-local.bat
```

Depois aperte Enter.

**O que vai acontecer:**
- O script vai atualizar tudo automaticamente
- Vai aparecer várias mensagens na tela (é normal)
- No final vai pedir para apertar qualquer tecla
- Aperte qualquer tecla e pronto!

## Passo 4: Reiniciar o Servidor

Depois de atualizar, você precisa reiniciar o servidor:

1. Se o servidor estava rodando (npm run dev), feche ele (Ctrl+C)
2. Digite: `npm run dev`
3. Aperte Enter

Agora acesse: http://localhost:3000

---

## ⚠️ Se o script não funcionar

Faça manualmente (copie e cole um comando de cada vez, apertando Enter depois de cada um):

```
cd C:\Users\debor\Documents\sistema_locacao
```

```
git fetch origin
```

```
git reset --hard origin/main
```

```
git clean -fd
```

```
npm install
```

```
npm run dev
```

---

## 🆘 Precisa de Ajuda?

Se aparecer algum erro ou não funcionar:

1. Tire uma foto da tela com o erro
2. Mande para mim aqui no chat
3. Vou te ajudar a resolver!

---

## ✅ Como Saber se Deu Certo?

Depois de rodar o script, você deve ver:

- Mensagem mostrando que está no commit `3814c99` ou mais recente
- Data de julho de 2026 ou mais recente
- Ao abrir o sistema (localhost:3000), deve estar com a versão nova

Se ainda estiver mostrando commit `43ffd563`, algo deu errado e precisamos investigar.