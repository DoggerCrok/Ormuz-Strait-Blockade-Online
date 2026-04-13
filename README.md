# Ormuz Strait Blockade Online

Интерактивная карта прохода судов через Ормузский пролив с AIS-данными, фильтрами по типам судов, онлайн-обновлениями, счётчиком пересечений после начала ограничений и backend-авторизацией на JWT.

## Что умеет проект

- карта судов в реальном времени через AISStream backend relay
- демо-режим при отсутствии AIS-ключа
- фильтры по типу судна, грузу, осадке и направлению
- счётчик пересечений пролива после момента ограничений
- JWT-аутентификация и подготовка к платным тарифам
- запуск через Docker Compose на Windows 10

## Быстрый старт на Windows 10

### Вариант одной кнопкой

- установите Docker Desktop
- запустите Docker Desktop
- скопируйте `.env.example` в `.env.production`
- заполните свои значения `AISSTREAM_API_KEY` и `JWT_SECRET`
- сделайте двойной клик по `Запустить карту.bat`

### Вариант через команду

```powershell
docker compose up --build -d
```

После запуска приложение будет доступно на `http://localhost:5000`.

## Основные файлы

- `Dockerfile`
- `docker-compose.yml`
- `start-hormuz-docker.bat`
- `START_HORMUZ.cmd`
- `Запустить карту.bat`
- `DOCKER-WINDOWS10.md`
- `ROLLBACK-AND-ONE-CLICK.md`

## Важно

Сейчас backend фактически использует SQLite для хранения данных приложения. Postgres и Redis уже входят в стек Docker как готовая инфраструктура для следующего этапа миграции.

## Переменные окружения

Создайте `.env.production` на основе `.env.example`.

Минимально нужны:

```env
AISSTREAM_API_KEY=your_key
JWT_SECRET=your_long_secret
REQUIRE_AUTH=true
AIS_SOURCE=auto
```

## Откат

Для сохранённой точки отката используйте архив из локального набора проекта или зафиксируйте отдельный Git tag после публикации.
