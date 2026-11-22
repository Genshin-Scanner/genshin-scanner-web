import {
  BlobSource,
  EncodedPacketSink,
  EncodedVideoPacketSource,
  Input,
  MATROSKA,
  WEBM,
  Mp4OutputFormat,
  Output,
  StreamTarget,
  WebMOutputFormat,
  type StreamTargetChunk,
} from "mediabunny";
import { ScanError } from "./error";

// Muxers write the payload sequentially, then seek back to patch metadata.
// Keep encoded chunks as Blobs so finalization needs no file-sized ArrayBuffer.
function blobOutput() {
  let parts: Blob[] = [];
  let length = 0;
  const target = new StreamTarget(
    new WritableStream<StreamTargetChunk>({
      write({ position, data }) {
        const chunk = new Blob([new Uint8Array(data)]);
        if (position >= length) {
          if (position > length)
            parts.push(new Blob([new Uint8Array(position - length)]));
          parts.push(chunk);
        } else {
          const previous = new Blob(parts);
          parts = [
            previous.slice(0, position),
            chunk,
            previous.slice(position + chunk.size),
          ];
        }
        length = Math.max(length, position + chunk.size);
      },
    }),
    { chunked: true, chunkSize: 4 * 1024 * 1024 },
  );

  return { target, finish: (type: string) => new Blob(parts, { type }) };
}

export async function remuxRecording(
  file: Blob,
  signal: AbortSignal,
): Promise<Blob> {
  signal.throwIfAborted();
  const input = new Input({
    formats: [MATROSKA, WEBM],
    source: new BlobSource(file),
  });
  const dispose = () => input.dispose();
  signal.addEventListener("abort", dispose, { once: true });
  let output: Output | undefined;

  try {
    const track = await input.getPrimaryVideoTrack();
    if (!track)
      throw new ScanError("track", "No video track in the recording.");
    const codec = await track.getCodec();
    if (
      codec !== "avc" &&
      codec !== "hevc" &&
      codec !== "av1" &&
      codec !== "vp8" &&
      codec !== "vp9"
    )
      throw new ScanError(
        "codec",
        "The video codec cannot be repackaged for playback.",
      );
    const config = await track.getDecoderConfig();
    if (!config)
      throw new ScanError("codec", "Missing video codec configuration.");

    const format =
      codec === "vp8" || codec === "vp9"
        ? new WebMOutputFormat()
        : new Mp4OutputFormat({ fastStart: false });
    const blob = blobOutput();
    output = new Output({ format, target: blob.target });
    const source = new EncodedVideoPacketSource(codec);
    output.addVideoTrack(source, { rotation: await track.getRotation() });
    await output.start();
    const sink = new EncodedPacketSink(track);
    let first = true;
    for await (const packet of sink.packets()) {
      signal.throwIfAborted();
      await source.add(packet, first ? { decoderConfig: config } : undefined);
      first = false;
    }
    if (first) throw new ScanError("track", "The video track is empty.");
    await output.finalize();
    signal.throwIfAborted();
    return blob.finish(format.mimeType);
  } catch (error) {
    signal.throwIfAborted();
    if (error instanceof ScanError) throw error;
    throw new ScanError("container", "Unable to read the recording container.");
  } finally {
    signal.removeEventListener("abort", dispose);
    input.dispose();
    if (output?.state === "started") await output.cancel();
  }
}
