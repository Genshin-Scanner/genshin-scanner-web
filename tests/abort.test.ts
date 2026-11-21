import { expect, test } from "bun:test";
import { abortable } from "../packages/browser/src/abort";
test("cancel releases a UI waiting on a pending worker operation", async () => {
  const controller = new AbortController();
  const pending = abortable(new Promise(() => {}), controller.signal);
  controller.abort(new Error("cancelled"));
  await expect(pending).rejects.toThrow("cancelled");
});
