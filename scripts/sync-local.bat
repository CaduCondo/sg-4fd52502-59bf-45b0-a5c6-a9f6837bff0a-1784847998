@echo off
echo ====================================
echo Sincronizando Repositorio Local
echo ====================================
echo.

echo [1/6] Verificando branch atual...
git branch --show-current
echo.

echo [2/6] Buscando atualizacoes do remoto...
git fetch origin
echo.

echo [3/6] Verificando branches remotos disponiveis...
git branch -r
echo.

echo [4/6] Limpando alteracoes locais...
git reset --hard origin/main
echo.

echo [5/6] Removendo arquivos nao rastreados...
git clean -fd
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
echo Para iniciar o servidor, digite: npm run dev
echo.
pause