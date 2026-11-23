# @scanner/good

Use this package to validate artifact, weapon, and character drafts and export GOOD v3. It also exports the game keys and metadata used by the parser and editor.

`validateArtifact(draft)` returns the fields that need review. It checks values that the upstream schema would otherwise default or clamp, as well as slot, rarity, and roll constraints. `exportGood(drafts, source?)` returns a typed object ready for `JSON.stringify` and throws if an artifact fails validation.

`exportInventoryGood({ artifacts, weapons, characters }, source?)` validates and exports an inventory. It omits empty sections. `validateWeapon` and `validateCharacter` return field paths for review before export.

## Updating the GOOD types

The source of truth for the artifact fields is the pinned Optimizer **Zod schema** in [src/upstream](src/upstream). The scanner defines its artifact-only GOOD v3 envelope in [src/index.ts](src/index.ts). TypeScript infers `GoodFile` from that envelope with `z.infer`, takes `Artifact` from `GoodFile["artifacts"][number]`, and derives `ArtifactDraft` as `Partial<Artifact>`. Builds use the checked-in snapshot. A new upstream release or a standalone JSON Schema file triggers no automatic download or code generation.

1. Compare the revision in [UPSTREAM.md](UPSTREAM.md) with the target Optimizer commit. Review changes to the GOOD envelope, artifact schema, helpers, and key tables. If the release provides a standalone JSON Schema, compare its artifact fields and constraints with the local Zod schema.
2. Update the affected files under `src/upstream/`, preserving local imports and license notices. Refresh the derived stat tables if the corresponding game data or rounding corrections changed. Record the new source revision in `UPSTREAM.md`.
3. Review the scanner's envelope and export version separately. A new artifact set can change the allowed keys while the file format remains v3. For a format change, update the envelope and exporter together. Check the parser and editor for newly required fields or changed defaults because partial drafts can still type-check with fields missing.
4. Add regression coverage for the changed fields and run `bun run check` from the root. Its build emits updated declarations in `packages/good/dist/`. Run `bun run check:frames` with the private fixtures, then import a representative export in the target Optimizer version and check the affected fields.
