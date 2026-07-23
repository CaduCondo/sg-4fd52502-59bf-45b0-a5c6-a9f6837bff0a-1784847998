@echo off
echo ====================================
echo Sincronizando Repositorio Local
echo ====================================
echo.

:: Verifica se esta em um repositorio Git
if not exist ".git" (
    echo ERRO: Este diretorio nao e um repositorio Git
    pause
    exit /b 1
)

echo [1/6] Verificando branch atual...
git branch --show-current
echo.

echo [2/6] Buscando atualizacoes do remoto...
git fetch origin --all
echo.

echo [3/6] Verificando branches remotos disponiveis...
git branch -r
echo.

echo [4/6] Limpando alteracoes locais...
git reset --hard
git clean -fd
echo.

echo [5/6] Atualizando para a branch main/master...
:: Tenta main primeiro
git reset --hard origin/main 2>nul
if %errorlevel% neq 0 (
    echo Branch 'main' nao encontrada, tentando 'master'...
    git reset --hard origin/master
)
echo.

echo [6/6] Instalando dependencias...
call npm install
echo.

echo ====================================
echo Sincronizacao Concluida!
echo ====================================
echo.
echo Commit atual:
git log -1 --oneline
echo.
pause