#!/bin/bash

echo "===================================="
echo "Forçando Sync do Dev para Remote"
echo "===================================="
echo ""

echo "[1/5] Verificando commit atual..."
git log -1 --oneline
echo ""

echo "[2/5] Buscando todos os commits..."
git fetch --all --prune
echo ""

echo "[3/5] Forçando reset para o commit mais recente..."
git reset --hard eb0d17f
echo ""

echo "[4/5] Forçando push para o remote..."
git push origin main --force
echo ""

echo "[5/5] Verificando sincronização..."
git log -1 --oneline
echo ""

echo "===================================="
echo "Sincronização Concluída!"
echo "===================================="
echo ""
echo "Agora o usuário pode atualizar com:"
echo "git pull origin main"
echo ""