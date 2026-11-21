# Источники GOOD

Каталог `src/upstream` содержит схему артефакта, таблицы ключей и используемые функции Zod из Genshin Optimizer. Выбраны зависимости для чтения артефактов, импорты заменены локальными. Оболочка экспорта ограничена артефактами GOOD v3. Лицензия MIT включена рядом с исходниками.

[Ревизия f24bcb8](https://github.com/frzyc/genshin-optimizer/tree/f24bcb82f650ff755af9ed47956a91809f142772/libs/gi) · [Схема формата](https://github.com/frzyc/genshin-optimizer/blob/f24bcb82f650ff755af9ed47956a91809f142772/libs/gi/good/src/schemas/good-format.ts)
Таблицы в `stat-values.json` извлечены из `libs/gi/stats/Data/Artifacts` той же ревизии. Для 4★ и 5★ сохранены главные значения и возможные количества роллов для каждого отображаемого сабстата с поправками на округление.
