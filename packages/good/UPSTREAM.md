# GOOD sources

`src/upstream` contains the artifact schema, key tables, and Zod helpers from Genshin Optimizer. The adapter includes the dependencies used to read artifacts and resolves their imports locally. The export envelope covers artifacts in GOOD v3. The [upstream MIT license](src/upstream/LICENSE) is included alongside the sources.

The tables in `stat-values.json` come from `libs/gi/stats/Data/Artifacts` at the same revision. For 4★ and 5★ artifacts they preserve main stat values and the possible roll counts for each displayed substat value, including rounding corrections. [Pinned revision f24bcb8](https://github.com/frzyc/genshin-optimizer/tree/f24bcb82f650ff755af9ed47956a91809f142772/libs/gi) · [GOOD format schema](https://github.com/frzyc/genshin-optimizer/blob/f24bcb82f650ff755af9ed47956a91809f142772/libs/gi/good/src/schemas/good-format.ts)
