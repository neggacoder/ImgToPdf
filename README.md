# Фото в PDF

Статический сайт для сборки JPG, PNG и WEBP изображений в один PDF. Все преобразования выполняются локально в браузере: файлы не отправляются на сервер.

## Запуск локально

```bash
python3 -m http.server 8000
```

Откройте `http://localhost:8000`.

## Публикация на GitHub Pages

1. В репозитории откройте **Settings → Pages**.
2. В разделе **Build and deployment** выберите **GitHub Actions** в качестве источника.
3. Сделайте push в ветку `main`. Workflow автоматически опубликует сайт; адрес появится на странице Actions и в Settings → Pages.

Также публикацию можно запустить вручную: **Actions → Deploy to GitHub Pages → Run workflow**.

Для создания PDF на опубликованной странице нужен доступ к CDN `jsdelivr.net`, с которого загружается библиотека jsPDF.
