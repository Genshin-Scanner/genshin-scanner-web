---
name: check-recognition
description: Compare raw Genshin Scanner results with a privately annotated inventory recording and investigate recognition or selection regressions.
---

# Check an annotated recording

Run the browser comparison from the repository root. The recording, reference format, custom-name environment variables, and known timeline differences are documented in [recognition checks](../../docs/recognition.md).

1. Run `bun run build`, then `bun run check:corpus <recording> [reference]`. For a detector change, also run `bun run check:video`. For changes to reading individual fields, run `bun run check:frames`.
2. Inspect the private comparison report. Record detected selections, exact field matches, review flags, missing or extra selections, and accepted mismatches. The browser UI exercise corrects items before export, so its final GOOD file measures a different outcome.
3. Inspect the actual panel at the reported timestamp for each unexplained difference. Compare adjacent selections when one missing item shifts the rest of the sequence. Record any discrepancy in the reference with its timestamp. Use a separate local reference for a verified timeline difference.
4. Keep recordings, private references, and full scan reports under the ignored `test-assets/` directory. Report aggregate counts and the relevant field or timestamp. Follow the fixture instructions in [AGENTS.md](../../AGENTS.md) for a public regression test.
