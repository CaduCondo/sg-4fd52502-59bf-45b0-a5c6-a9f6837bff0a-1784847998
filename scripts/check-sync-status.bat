@echo off
echo ====================================
echo Verificando Status de Sincronizacao
echo ====================================
echo.

echo [1] Branch Atual:
git branch --show-current
echo.

echo [2] Branches Remotos Disponiveis:
git branch -r
echo.

echo [3] Status do Git:
git status
echo.

echo [4] Ultimos 5 Commits Locais:
git log -5 --oneline
echo.

echo [5] Ultimos 5 Commits Remotos (main):
git log origin/main -5 --oneline 2>nul
if %errorlevel% neq 0 (
    echo Branch 'main' nao encontrada, tentando 'master'...
    git log origin/master -5 --oneline
)
echo.

echo [6] Configuracao do Remote:
git remote -v
echo.

echo [7] Diferencas entre Local e Remoto:
git fetch origin --quiet
git rev-list --left-right --count HEAD...origin/main 2>nul
if %errorlevel% neq 0 (
    git rev-list --left-right --count HEAD...origin/master
)
echo.

pause