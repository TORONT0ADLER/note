# Noteforge

Noteforge — приложение заметок на **Nuxt 4 + Nuxt UI**.

## Требования

- Node.js 20+
- pnpm 10+

Проверка версий:

```bash
node -v
pnpm -v
```

## Локальный запуск (dev)

1. Установить зависимости:

```bash
pnpm install
```

2. Запустить dev-сервер:

```bash
pnpm dev
```

3. Открыть в браузере:

`http://localhost:3000`

---

## Сборка и запуск в production

Собрать проект:

```bash
pnpm build
```

Запустить production-сервер Nuxt (Nitro):

```bash
node .output/server/index.mjs
```

По умолчанию сервер стартует на `3000` порту.

Можно задать порт и хост:

```bash
NITRO_PORT=3000 NITRO_HOST=127.0.0.1 node .output/server/index.mjs
```

---

## Деплой на VPS (Ubuntu) — рекомендуемый сценарий

Ниже базовый рабочий вариант: **Nuxt (Node) + PM2 + Nginx**.

### 1) Подготовить сервер

```bash
sudo apt update
sudo apt install -y nginx curl git
curl -fsSL https://get.pnpm.io/install.sh | sh -
```

Установить Node.js (например, через nvm или NodeSource).

### 2) Залить проект

```bash
git clone <URL_ВАШЕГО_РЕПОЗИТОРИЯ> noteforge
cd noteforge
pnpm install
pnpm build
```

### 3) Запуск через PM2

Установить PM2:

```bash
pnpm add -g pm2
```

Запустить Nuxt server:

```bash
pm2 start .output/server/index.mjs --name noteforge
```

Сохранить автозапуск:

```bash
pm2 save
pm2 startup
```

### 4) Nginx reverse proxy

Создать конфиг:

```bash
sudo nano /etc/nginx/sites-available/noteforge
```

Вставить:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Активировать сайт и перезапустить nginx:

```bash
sudo ln -s /etc/nginx/sites-available/noteforge /etc/nginx/sites-enabled/noteforge
sudo nginx -t
sudo systemctl reload nginx
```

---

## Обновление приложения на сервере

```bash
cd noteforge
git pull
pnpm install
pnpm build
pm2 restart noteforge
```

---

## Полезные команды

Проверка типов:

```bash
pnpm typecheck
```

Линт:

```bash
pnpm lint
```

Логи PM2:

```bash
pm2 logs noteforge
```
