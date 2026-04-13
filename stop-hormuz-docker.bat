@echo off
setlocal
cd /d %~dp0

echo Останавливаю стек Hormuz Map...
docker compose down
pause
