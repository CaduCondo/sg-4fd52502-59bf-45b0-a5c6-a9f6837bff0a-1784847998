@echo off
echo ====================================
echo Sincronizando Repositorio Local
echo ====================================
echo.

echo [1/7] Verificando branch atual...
git branch --show-current
echo.

echo [2/7] Buscando atualizacoes do remoto...
git fetch origin
echo.

echo [3/7] Verificando branches remotos...
git branch -r
echo.

echo [4/7] Tentando sincronizar com origin/master...
git reset --hard origin/master 2>nul
if %errorlevel% neq 0 (
    echo Branch master nao encontrado, tentando main...
    git reset --hard origin/main
)
echo.

echo [5/7] Removendo arquivos nao rastreados...
git clean -fd
echo.

echo [6/7] Instalando dependencias...
call npm install
echo.

echo [7/7] Verificando versao final...
git log -1 --oneline
echo.

echo ====================================
echo Sincronizacao Concluida!
echo ====================================
echo.
echo Para iniciar o servidor, digite: npm run dev
echo.
pause