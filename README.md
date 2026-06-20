# 🎭 Мафія — Система ведучого

Веб-застосунок для ведення гри в спортивну мафію.

## Стек
- **Next.js 14** (React + API routes)
- **Neon PostgreSQL** (база даних)
- **Tailwind CSS** (стилі)
- **Vercel** (хостинг)

## Налаштування

### 1. Клонуй репозиторій
```bash
git clone https://github.com/YOUR_USERNAME/mafia-game.git
cd mafia-game
npm install
```

### 2. Налаштуй змінні середовища
Створи файл `.env.local`:
```
DATABASE_URL=postgresql://neondb_owner:PASSWORD@HOST/neondb?sslmode=require
```

### 3. Запусти локально
```bash
npm run dev
```
Відкрий http://localhost:3000

## Деплой на Vercel

1. Завантаж код на GitHub
2. Зайди на vercel.com → New Project → імпортуй репозиторій
3. В Settings → Environment Variables додай `DATABASE_URL`
4. Deploy!

## Як користуватись

### Початок гри
1. Введи імена гравців (місця 1-10)
2. Вибери роль кожному (Мирний / Шериф / Маф / Дон)
3. Натисни **▶ Розпочати гру** — гра отримає унікальний ID і збережеться в БД

### Під час гри
- **Фоли**: натискай на квадратики — 4-й фол автоматично виключає гравця
- **Виставлен (Вист.)**: чекбокс якщо гравця виставили на голосування
- **Голоси (Гол.)**: введи кількість голосів
- **Ніч**: чекбокс якщо гравця прибрали вночі
- **Статус**: змінюй вручну (Жив / Заголосований / Убран ночью / Убран за фоли)

### Кінець гри
1. Натисни **🏁 Кінець гри**
2. Вибери переможну команду
3. Результати збережуться в БД (гравці переможної команди отримають +1 бал)

## Структура БД

```sql
games        — id, created_at, winner_team, finished_at
game_players — id, game_id, seat, name, role, score
game_days    — id, game_id, day_number, seat, nominated, votes, killed_night
```
