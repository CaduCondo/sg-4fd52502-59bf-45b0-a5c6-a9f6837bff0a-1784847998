@echo off
echo ====================================
echo Verificando Status de Sincronizacao
echo ====================================
echo.

echo [1] Seu commit atual:
git log -1 --oneline
echo.

echo [2] URL do remote:
git remote get-url origin
echo.

echo [3] Ultimos 5 commits do remote:
git log origin/main --oneline -5
echo.

echo [4] Diferenca entre local e remote:
git rev-list --left-right --count HEAD...origin/main
echo.

echo ====================================
echo Analise:
echo - Se seu commit for 43ffd563 = DESATUALIZADO
echo - Commits esperados devem comecar com f373532
echo - Se a URL do remote estiver errada, precisa corrigir
echo ====================================
echo.

pause