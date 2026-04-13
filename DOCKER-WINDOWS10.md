# Запуск Hormuz Map через Docker Compose на Windows 10

## Что входит в стек

- `app` — ваше приложение с реальным AIS-потоком через backend
- `postgres` — подготовленная PostgreSQL-инфраструктура для будущей миграции
- `redis` — подготовленная Redis-инфраструктура для кэша, rate limiting и очередей

## Важно

Сейчас приложение фактически хранит данные в SQLite, потому что backend в коде пока использует `better-sqlite3`.

Это значит:
- карта, авторизация, JWT и AIS-поток будут работать сразу
- данные приложения будут сохраняться в Docker volume `hormuz_sqlite_data`
- `postgres` и `redis` уже поднимаются вместе с приложением, но пока не используются кодом напрямую

## Что нужно установить

- Docker Desktop для Windows 10

Рекомендуемые шаги:
- Установите Docker Desktop
- Включите WSL 2, если Docker Desktop попросит
- Перезагрузите компьютер после установки
- Откройте Docker Desktop и дождитесь статуса Engine running

## Какие файлы нужны рядом с проектом

В корне проекта должны лежать:
- `Dockerfile`
- `docker-compose.yml`
- `.dockerignore`
- `.env.production`

## Что уже должно быть в `.env.production`

Минимально:

```env
AISSTREAM_API_KEY=ваш_ключ
JWT_SECRET=ваш_секрет
REQUIRE_AUTH=true
AIS_SOURCE=auto
```

Для вашего текущего проекта этот файл уже подготовлен.

## Запуск одной командой

Откройте PowerShell в папке проекта и выполните:

```powershell
docker compose up --build -d
```

После этого:
- приложение будет доступно на `http://localhost:5000`
- PostgreSQL будет доступен на `localhost:5432`
- Redis будет доступен на `localhost:6379`

## Как проверить, что всё работает

### 1. Проверить контейнеры

```powershell
docker compose ps
```

Ожидаемо должны быть `running`:
- `hormuz-map-app`
- `hormuz-map-postgres`
- `hormuz-map-redis`

### 2. Проверить API статуса

Откройте в браузере:

- `http://localhost:5000/api/status`

Ожидаемые признаки:
- `"hasKey": true`
- `"source": "auto"`
- `"demo": false` если AISStream подключился

### 3. Проверить карту

Откройте:

- `http://localhost:5000`

Проверьте:
- суда отображаются на карте
- нет демо-баннера, если ключ активен и поток подключён
- фильтры работают
- счётчик пересечений отображается
- интерфейс на русском, кроме географических названий

## Полезные команды

### Посмотреть логи

```powershell
docker compose logs -f app
```

### Остановить стек

```powershell
docker compose down
```

### Остановить стек и удалить контейнеры, но сохранить данные

```powershell
docker compose down
```

### Остановить стек и удалить контейнеры вместе с томами данных

```powershell
docker compose down -v
```

Внимание: команда с `-v` удалит SQLite, Postgres и Redis данные.

## Где хранятся данные

- SQLite приложения: volume `hormuz_sqlite_data`
- PostgreSQL: volume `hormuz_postgres_data`
- Redis: volume `hormuz_redis_data`

## Как обновить приложение после изменений

Если вы изменили код, в папке проекта выполните:

```powershell
docker compose up --build -d
```

## Что можно улучшить следующим шагом

Если хотите, следующим сообщением я могу сразу сделать второй этап:
- реально перевести backend с SQLite на PostgreSQL
- подключить Redis к rate limiting
- добавить отдельный compose-файл для production и dev
- подготовить `.env.docker` без секретов для безопасного шаблона
