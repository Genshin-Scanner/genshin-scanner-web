# Working on Genshin Scanner

Communicate with the user in Russian. Read the [project status](docs/PROJECT-STATE.md) and [v1 architecture](docs/v1-ARCHITECTURE.md) before changing the project.

## Development

- Use Bun for dependencies, workspaces, and project commands. Build with Vite and use React and TypeScript for the site. Target GitHub Pages. Keep video decoding, frame processing, and OCR local to the browser.
- Keep the core reusable in Genshin Optimizer. Its inputs are pixels, frame timestamps, and an injected OCR function. Keep DOM access, video decoding, workers, and React in the outer packages. Crop thumbnails from the recording.
- Derive GOOD types from the schemas at the pinned Optimizer revision. Record the source and license of borrowed code and models. Flag uncertain readings before applying schema defaults.
- Target the English PC inventory and 4★ and 5★ artifacts in v1. Keep language rules and screen layout profiles separate so new languages, mobile layouts, and aspect ratios can be added independently.
- Keep original recordings and screenshots in the Git-ignored `test-assets/` directory. For a public regression test, use a separate copy with an opaque mask over the UID and remove its metadata. Inspect the resulting image before staging it.

## Checks and commits

- Test changed behavior at the appropriate level. Cover pixel input, transitions, and recognized fields in the core. Cover decoding, cancellation, and resource cleanup in the browser adapter. Cover editing, exclusion, and export in the site. Add a regression test when fixing a defect.
- Check recognition against the three reference frames. Check detector changes against the local 33-item recording. Use the v1 acceptance criteria for expected results. Tests required in a clean clone must use synthetic or anonymized fixtures.
- Run tests and Prettier before each commit. For code changes, also run applicable type, build, and integration checks. Use the Bun project scripts and rerun checks after fixes. Where package scripts are unavailable, use `bun test` and `bunx prettier@3.6.2 --check` with an explicit list of changed files that Prettier supports.
- Inspect the staged changes with `git diff --cached --check` and the file list with `git diff --cached --name-only`. Fix issues before committing. Report an empty test suite or any check that requires a separate environment.
- Make small, verifiable commits and sign them with the SSH key configured for this repository (`id_ed25519_codex`). Checks may be delegated to a GPT-6.1 Sol subagent. The commit author remains responsible for the results.

## Documentation

- Maintain [the project status](docs/PROJECT-STATE.md) as the single account of implemented features, available commands, verification results, and the current milestone. Update it when the state of the project changes.
- Create a separate `docs/vN-ARCHITECTURE.md` document for each new version. Update these instructions when the development workflow changes.
