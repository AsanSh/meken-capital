# Meken Capital — City with Proof

Дата: 2026-09-03. Выбор пользователя: визуальный характер первого концепта + понятная логика второго. Визуальная цель — `selected-reference.png`, выбранный объединённый макет.

## Реализация

- Существующий статический проект сохранён: `site/index.html`, общий `site/styles.css`, дополнительный `site/experience.css`, `site/experience.js`.
- Палитра: graphite #080b0d, paper #111619, lime #c1f900, white #f4f5f5, muted #a6acae. Типографика Inter 400/500/600.
- Город состоит из двух WebP-слоёв. Нативный range раскрывает готовый слой справа налево поверх чертежа. Кнопки этапов и клавиатура управляют тем же состоянием. Входная анимация короткая, параллакс ограничен 36px, движение можно остановить; prefers-reduced-motion учитывается.
- Прогресс, количество этапов, отчётов, дата и описание поступают из единого неизменяемого `site/demo-data.js`. Доходности и привлечённого капитала в новой модели нет.
- График показывает только данные до выбранного месяца. Модальное окно и скачиваемый текстовый отчёт используют тот же выбранный период.
- Никаких backend, авторизации, отправки формы, реальных инвестиционных предложений или внешней публикации не добавлено.

## Ресурсы

Оба изображения созданы встроенным Image Gen по выбранному макету, преобразованы в WebP, 1672×941:

- `site/assets/city-built.webp` (~185 KB). Prompt: cinematic fully built Bishkek architectural district, white residential buildings on right/lower center, mountain horizon, graphite edges, upper-left negative space, same art direction as selected reference, no text/UI/wireframe.
- `site/assets/city-blueprint.webp` (~244 KB). Prompt: same camera, framing and geometry as city-built, replace architecture with fine chartreuse blueprint wireframe on same dark background, preserve mountain horizon and negative space, no text/UI.

Иллюстрации не изображают заявленный действующий проект и явно обозначены как концепция.

- Графики: [Chart.js](https://www.chartjs.org/docs/latest/getting-started/integration.html), локально сохранён UMD 4.4.8; лицензия `site/assets/vendor/CHARTJS-LICENSE.md`.
- Иконка: [Phosphor](https://phosphoricons.com/), официальный `arrow-up-right.svg`, лицензия `site/assets/PHOSPHOR-LICENSE`.
- Inter загружается через Google Fonts; sans-serif fallback сохраняет работоспособность без внешнего шрифта. Других сетевых зависимостей у новой главной нет.

## Ограничения

Корневой опубликованный `index.html` не обновлён. Английская страница и внутренние страницы получили общий стиль, но не отдельный кинематографический сценарий. Указанные в исходных страницах сведения о регистрации и результаты требуют проверки до публичного запуска. Тест скачивания в браузере проверял вызов загрузки; содержимое создаётся локально, доставка почты не тестировалась и не выполнялась.
