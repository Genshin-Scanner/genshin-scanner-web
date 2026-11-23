# Recording formats

<!-- prettier-ignore -->
| Container | Video codecs targeted by the scanner |
|-----------|--------------------------------------|
| MP4 | H.264 (AVC), H.265 (HEVC), AV1 |
| WebM | VP8, VP9 |
| Matroska (MKV) | H.264, HEVC, AV1 |

The adapter opens the actual local file in an HTML video element, checks its dimensions and duration, seeks into the recording, and returns to the beginning before detecting cards. Browser, OS, hardware, and codec profile all affect decoding. H.264 in MP4 is a useful fallback when a device cannot decode the original track.

## Local repackaging

A failed opening or seek check on a file with an EBML header triggers a second path. The browser adapter loads Mediabunny from the site, reads the primary video track, and writes its compressed packets in decode order. H.264, HEVC, and AV1 go into MP4. VP8 and VP9 go into an indexed WebM. The browser then opens and seeks the new Blob through the same checks. This also handles streaming WebM files that lack a stored duration. Audio and subtitles are omitted from the temporary video. The original stays on the device and is never modified.

Preparation uses memory or browser-managed Blob storage roughly proportional to the compressed video size, plus muxer metadata and temporary chunks. The scanner releases the temporary URL when the scan finishes or is cancelled. Repackaging preserves compression quality and still requires a decoder for the underlying codec. The production site includes Mediabunny's license in `licenses.md`. [Mediabunny source and license](https://github.com/Vanilagy/mediabunny)

## Browser results on Windows

Each **33/33** entry means that the scanner found all 33 selections in order and every exported artifact matched the independent annotations after review. The matrix covers one 1920×1200 SDR recording and the listed browser builds. Other OS decoders, HDR or 10-bit profiles, and Safari on macOS need separate tests.

<!-- prettier-ignore -->
| Container | Video | Edge 158.0.4370.33 | Firefox 159.0 |
|-----------|-------|--------------------|---------------|
| MP4 | AV1 | 33/33 | 33/33 |
| MP4 | HEVC | 33/33 | Decoder error |
| WebM | VP8 | 33/33 | 33/33 |
| WebM | VP9 | 33/33 | 33/33 |
| MKV | H.264 | 33/33 | 33/33 |
| MKV | HEVC | 33/33 | Decoder error |
| MKV | AV1 | 33/33 | 33/33 |

Firefox on this machine rejected both HEVC tracks during actual playback. In both cases the app showed a localized decoding message and allowed a new file selection. In Edge, streaming variants without a stored duration also completed the full export after local repackaging: MKV with H.264, HEVC, or AV1 and WebM with VP9.

The VP8 fixture exposed seven duplicate detections before the detector fix. Checking the paper edge across three scanlines stabilized the card fingerprint. The corrected Edge run found 33 cards and flagged eight for review.

## Verification

The public tests use small generated color patterns. They check H.264 packet integrity, removal of the audio track, new seek cues for a streaming VP8 WebM, malformed input, and cancellation. The private browser check exercises the production UI, cancellation and reselection, item count, order, review, and field-by-field comparison of the downloaded GOOD file.

To reproduce a codec check, build the site with `bun run build` and pass a variant of the 33-item reference recording to the browser check. Keep all recording variants under the ignored `test-assets/` directory. For example, these commands produce an HEVC MP4 and an MKV with the same video stream.

```sh
ffmpeg -i test-assets/33-1/video.mp4 -map 0:v:0 -vf fps=15 -pix_fmt yuv420p -g 30 -c:v libx265 -crf 18 -tag:v hvc1 test-assets/reference-hevc.mp4
ffmpeg -i test-assets/reference-hevc.mp4 -map 0:v:0 -c copy test-assets/reference-hevc.mkv
bun run check:browser msedge test-assets/reference-hevc.mkv
```

For comparable fixtures, preserve the original 1920×1200 dimensions. The test encodes used `-vf fps=15 -pix_fmt yuv420p -g 30` and the following settings. The H.264 MKV was remuxed directly from the original recording at its original frame rate.

<!-- prettier-ignore -->
| Codec | FFmpeg encoding options |
|-------|-------------------------|
| AV1 | `-c:v libaom-av1 -cpu-used 6 -row-mt 1 -crf 20 -b:v 0` |
| HEVC | `-c:v libx265 -preset fast -crf 18 -tag:v hvc1` (MP4) |
| VP8 | `-c:v libvpx -deadline good -cpu-used 3 -crf 6 -b:v 12M` |
| VP9 | `-c:v libvpx-vp9 -deadline good -cpu-used 4 -row-mt 1 -crf 18 -b:v 0` |

For Matroska or WebM, FFmpeg's `-live 1` muxer option creates a streaming variant. Append `--expect-remux` to the browser command to verify the preparation stage on a browser that cannot seek the original. The standard command accepts either the native or repackaged path.
