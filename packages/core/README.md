# @scanner/core

Use the core when your application already has decoded frames and an OCR engine. It accepts RGBA pixels and runs without browser APIs or React. For a local video file and a ready-made OCR worker, see [@scanner/browser](../browser/README.md).

## Recognize one artifact

`recognizeArtifact(frame, read)` accepts a `Pixels` object with `width`, `height`, and RGBA `data` in a `Uint8Array` or `Uint8ClampedArray`. The injected `read(image, field)` function receives a cropped region and returns a promise for its text. The field identifies the region so the OCR engine can use different settings for a level, stat list, or header. The exported `prepareText` helper can preprocess the crop before OCR.

An unrecognized layout returns `undefined`. A recognized card returns a partial artifact, validation issues, the OCR readings, and a thumbnail rectangle in the source frame. Keep the draft and issues together for review before [GOOD export](../good/README.md).

## Find selections in a recording

For each sampled frame in chronological order, pass `markFrame(frame)` and its timestamp in seconds to `detector.push(time, mark)` on a `SegmentDetector` instance. Collect each emitted segment, including the one returned by `detector.flush()` at the end. A segment provides a representative timestamp and an alternate timestamp for a second reading. The PC detector locates the paper edge across three scanlines so a small compression artifact on one line does not shift the sampled text. Video container handling belongs to the [browser adapter](../browser/README.md#recording-input).

The defaults target the English PC inventory. Supply a `LocaleProfile` to change text parsing and a `LayoutProfile` to locate fields in a different layout. A new inventory layout may also need its own frame marker for video selection detection.
