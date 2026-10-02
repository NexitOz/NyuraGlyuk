# НЮРА ГЛЮК

Лендинг виртуальной исполнительницы: портрет, припевы и плеер трёх записей: «Приличная» (2:29), «Не лечи меня — включи» (2:02), «Я не сигма — я сигнал» (2:12).

## Развёртывание на Vercel

1. Add New → Project → импортировать `NexitOz/NyuraGlyuk`.
2. Root Directory: корень репозитория (`./`).
3. Framework Preset: Other.
4. Output Directory: `public`. Команды установки и сборки не нужны.
5. Deploy.

Настройки уже указаны в `vercel.json`. Переменные окружения и API-ключи не требуются.

## Локальный просмотр

```sh
python3 -m http.server 8000 --directory public
```

Откройте http://localhost:8000.

## Файлы

- `public/index.html` — содержание страницы.
- `public/styles.css` — оформление и адаптация под телефон.
- `public/app.js` — переключение припевов, копирование текста и управление плеером.
- `public/assets/nyura.webp` — портрет Нюры.
- `public/assets/prilichnaya.mp3` — «Приличная».
- `public/assets/ne-lechi-menya-vklyuchi.mp3` — «Не лечи меня — включи».
- `public/assets/ya-ne-sigma-ya-signal.mp3` — «Я не сигма — я сигнал».

Музыка запускается только по нажатию. Переключение записей доступно в плеере; кнопки на карточках сразу запускают соответствующий трек. TikTok Нюры: https://www.tiktok.com/@nyuraglyuk. В нативном плеере скрыта кнопка скачивания.
