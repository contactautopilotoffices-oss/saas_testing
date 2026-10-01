"""Extract review material from a rendered film: per-scene contact sheets,
scene-boundary frame pairs, and a loudness/levels report.
usage: python3 scripts/review_assets.py out/film.mp4 out/review
"""
import json
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw

film, outdir = sys.argv[1], Path(sys.argv[2])
frames = outdir / "frames"
frames.mkdir(parents=True, exist_ok=True)

def grab(t: float, path: Path, width: int = 1920):
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-ss", f"{t:.3f}", "-i", film,
                    "-frames:v", "1", "-vf", f"scale={width}:-1", str(path)], check=True)

# every 0.5 s at full resolution
times = [round(i * 0.5, 2) for i in range(120)] + [59.95]
for t in times:
    grab(t, frames / f"t{t:05.2f}.png")

# scene boundaries: last frame of scene n and first of scene n+1
for n in range(1, 6):
    grab(n * 10 - 1 / 30 + 0.001, frames / f"boundary{n}-{n+1}_a.png")
    grab(n * 10 + 0.001, frames / f"boundary{n}-{n+1}_b.png")

# contact sheets: one per scene, 20 frames (every 0.5 s), 5x4 grid
for s in range(6):
    tiles = [Image.open(frames / f"t{(s * 10 + k * 0.5):05.2f}.png").convert("RGB").resize((576, 324)) for k in range(20)]
    sheet = Image.new("RGB", (576 * 5 + 8 * 4, 324 * 4 + 8 * 3), (30, 30, 30))
    for i, tile in enumerate(tiles):
        x, y = (i % 5) * 584, (i // 5) * 332
        sheet.paste(tile, (x, y))
        d = ImageDraw.Draw(sheet)
        label = f"{s * 10 + i * 0.5:.1f}s"
        d.rectangle([x, y, x + 60, y + 20], fill=(0, 0, 0))
        d.text((x + 5, y + 4), label, fill=(255, 255, 0))
    sheet.save(outdir / f"scene{s + 1:02d}-sheet.png")

# audio: integrated loudness, true peak, and short-term loudness per second
r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", film, "-af", "ebur128=peak=true", "-f", "null", "-"],
                   capture_output=True, text=True)
lines = [l for l in r.stderr.splitlines() if "M:" in l and "S:" in l]
per_second = {}
for l in lines:
    try:
        t = float(l.split("t:")[1].split()[0])
        st = float(l.split("S:")[1].split()[0])
        per_second.setdefault(int(t), st)
    except Exception:
        pass
summary = r.stderr[r.stderr.rfind("Summary:"):]
probe = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "stream=codec_name,width,height,r_frame_rate,sample_rate,channels:format=duration",
                        "-of", "json", film], capture_output=True, text=True)
(outdir / "audio-report.json").write_text(json.dumps({"short_term_lufs_by_second": per_second, "ebur128_summary": summary,
                                                       "probe": json.loads(probe.stdout)}, indent=2))
print("review assets in", outdir)
