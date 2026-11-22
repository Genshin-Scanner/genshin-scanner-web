export class ScanError extends Error {
  constructor(
    readonly code: "timeout" | "decode" | "canvas" | "track",
    message: string,
  ) {
    super(message);
    this.name = "ScanError";
  }
}
