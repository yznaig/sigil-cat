# Video sources

Unit 10 sound update: `tools/audio/build-sounds.py` applies constant audio attenuation from the immutable
`27f3543` baseline, AAC 160k, with `-c:v copy`. Video images, timestamps and full duration are retained.
The exact gain is in `../audio/design-manifest.json` → `correctionsDb`; current measured peaks are in
`../../docs/sound-levels.json`. The original encoding record below is historical.

| File | Author / permission | Supplied | Source | Processing |
| --- | --- | --- | --- | --- |
| `noscope.mp4` | Made by Aaron; supplied as his own work, ours to publish | 2026-11-10 | `noscope-video.mov`, 28.0 s, 1280×720, 30 fps, H.264 + stereo AAC, 19,413,567 bytes | Entire clip retained. FFmpeg libx264 slow, 2400k target / 3000k max / 6000k buffer, yuv420p, keyframe interval 60 frames; stereo AAC 160k; MP4 `+faststart`. 9,395,716 bytes, 2.684 Mbps overall. No cropping, retiming, captions, gain change, or audio normalization. |

Command: `ffmpeg -i noscope-video.mov -map 0:v:0 -map 0:a:0 -c:v libx264 -preset slow -b:v 2400k -maxrate 3000k -bufsize 6000k -pix_fmt yuv420p -g 60 -c:a aac -b:a 160k -movflags +faststart noscope.mp4`.

Original supplied outside the worktree, not committed. MP4 is the single source: its size is already
52% smaller than the original, with broad H.264/AAC playback support. No speculative second WebM
encode is shipped. FFmpeg's full-clip SSIM against the source was 0.984072; a decoded frame was also
visually inspected. Provenance here records Aaron's supplied authorship/permission, not a CC licence.
