# Runbook

## 1. Подготовка окружения

- Скопировать `backend-nest/.env.example` в `backend-nest/.env`.
- Запустить `docker compose up -d postgres neo4j`.

## 2. Prisma

```bash
cd backend-nest
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run prisma:generate
npx prisma db seed
```

## 3. Запуск backend

```bash
npm run start:dev
```

## 4. Запуск frontend

```bash
cd ../frontend
npm install
npm run dev
```

## 5. Тестовые пользователи

- `admin@pharma.local` / `admin12345`
- `doctor@pharma.local` / `doctor12345`

## 6. Что проверять

- login/register
- protected search
- analogs/interactions/contra
- admin users / admin etl / admin audit
