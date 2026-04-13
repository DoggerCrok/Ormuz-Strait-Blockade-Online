@echo off
setlocal
cd /d %~dp0

echo ======================================
echo Hormuz Map - запуск Docker-версии
echo ======================================
echo.

where docker >nul 2>nul
if errorlevel 1 (
  echo Docker Desktop не найден в PATH.
  echo Установите и запустите Docker Desktop, затем повторите.
  pause
  exit /b 1
)

if not exist ".env.production" (
  echo Файл .env.production не найден.
  echo Поместите его рядом с этим bat-файлом и повторите запуск.
  pause
  exit /b 1
)

echo Запускаю стек...
docker compose up --build -d
if errorlevel 1 (
  echo.
  echo Не удалось запустить Docker Compose.
  echo Проверьте, что Docker Desktop запущен.
  pause
  exit /b 1
)

echo.
echo Приложение запускается. Открываю в браузере...
timeout /t 5 /nobreak >nul
start http://localhost:5000
echo.
echo Готово. Если карта еще не открылась полностью, подождите 10-20 секунд и обновите страницу.
pause
