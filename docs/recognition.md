# Checking recognition against recordings

Each annotated recording has a GOOD file containing the expected artifacts in selection order. Run the local Edge check from the root after `bun run build`.

```sh
bun run check:corpus test-assets/33-1/video.mp4
bun run check:corpus test-assets/120-1/120-obs.mp4
```

The default reference is `expected.json` beside the recording. Pass an alternative reference as the second argument when the sequence differs between recordings. Set `SCANNER_TRAVELER`, `SCANNER_WANDERER`, or `SCANNER_MANEKIN` in the environment if the game displays custom names. All test data, including the detailed JSON report in `test-assets/qa-tmp/corpus/`, stays local.

The check runs the browser scanner before any review edits. It compares all GOOD fields, order, count, and review flags. On a mismatch the report aligns detected items to the expected sequence and includes timestamps, differing fields, and missed or extra selections. Two physical artifacts can have identical GOOD fields, so inspect the timestamps when investigating repeats.

## Recognition details

The corpus check compares the fields and selection order of each array present in the GOOD reference. Other arrays still appear in the report. Pass `--unannotated` in place of the reference file to record the counts, field issues, and timestamps while annotations are being prepared. This mode collects observations and cannot measure recognition accuracy.

The detector samples a small frame ten times per second. It compares the icon, main value, substat lines, and grid movement. OCR runs on settled frames. When localizing a PC card, the paper edge provides its width even if the title wraps. A crafted artifact can have an elixir banner below the stars. The slot and main stat stay above that banner, while the level and substats move down with the paper.

The English profile reads the stat label and number separately when it can identify the plus sign and each following glyph. Compact templates describe aspect ratio and ink coverage of the digits and punctuation, aggregated from labeled stat lines. A low score margin, touching glyphs, or additional text triggers whole-line OCR. Game roll validation still applies. The public numeric fixture contains only three cropped stat lines.

## November 2026 private references

The 33-selection recording has a single matching reference. The two 120-item recordings share a reference for the intended inventory, with two verified timeline differences:

- In the ShadowPlay recording at 83.8 s (OBS at 77.4 s), selection 93 is Ineffa’s plume with Energy Recharge +6.5%, ATK +10.5%, CRIT DMG +13.2%, and CRIT Rate +8.6%. The shared reference repeats Arlecchino’s selection 94 at index 93.
- OBS opens with the Faithful Hourglass later seen in selection 120. Its panel is readable for several seconds before the intended pass begins. Both visits count as selections.

For a strict per-recording reference, copy the shared GOOD file and correct selection 93 as above. For OBS also prepend a copy of selection 120. Keep both references private. A run against the original shared file should continue to report the timeline differences. The scanner preserves repeat visits because separate artifacts can share every exported field.
