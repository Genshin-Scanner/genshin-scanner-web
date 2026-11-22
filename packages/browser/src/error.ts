export class ScanError extends Error {
  constructor(
    readonly code:
      | "timeout"
      | "decode"
      | "canvas"
      | "track"
      | "seek"
      | "container"
      | "codec",
    message: string,
  ) {
    super(message);
    this.name = "ScanError";
  }
}
