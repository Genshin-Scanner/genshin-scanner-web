import { build } from "vite";
import { resolve } from "node:path";
for (const name of ["good", "core", "browser"]) {
  const root = resolve("packages", name);
  await build({
    configFile: false,
    root,
    build: {
      lib: {
        entry: resolve(root, "src/index.ts"),
        formats: ["es"],
        fileName: () => "index.js",
      },
      rollupOptions: {
        external: (id) =>
          id.startsWith("@scanner/") || id === "zod" || id === "tesseract.js",
      },
    },
  });
  const process = Bun.spawn(
    ["bun", "x", "tsc", "-p", root + "/tsconfig.build.json"],
    { stdout: "inherit", stderr: "inherit" },
  );
  if (await process.exited)
    throw new Error("Declaration build failed for " + name);
}
