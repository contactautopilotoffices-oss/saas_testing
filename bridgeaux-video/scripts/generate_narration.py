"""Generate the BridgeAux explainer narration, one WAV per line.

Voice engine: Kokoro-82M (Apache-2.0) via kokoro-onnx, running locally.
Model files are downloaded by scripts/setup_tts.sh into .cache/tts/.

Each line is rendered separately so the Remotion timeline can place it on an
exact frame. Durations are written to src/data/narration.json, which the
scenes read to keep visuals in sync with the voice.

Usage:
    python3 scripts/generate_narration.py [--voice af_heart] [--speed 1.0]
"""

import argparse
import json
import re
from pathlib import Path

import numpy as np
import pyloudnorm as pyln
import soundfile as sf
from kokoro_onnx import Kokoro
from pedalboard import Compressor, HighpassFilter, Limiter, Pedalboard, LowShelfFilter, PeakFilter

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / ".cache" / "tts"
OUT_DIR = ROOT / "public" / "audio" / "vo"
DATA_FILE = ROOT / "src" / "data" / "narration.json"

# How the name BridgeAux is spoken: "Bridge" + "Aux" (as in auxiliary).
# Alternative ending that sounds like "oh": "bɹˈɪdʒˌoʊ"
BRAND_PHONEMES = "bɹˈɪdʒˌɔːks"

# (id, scene, text, speed multiplier)
LINES = [
    ("s1a", 1, "Your business exists in the real world.", 0.94),
    ("s1b", 1, "But online, your customers might not even find you.", 0.94),
    ("s1c", 1, "That's the problem.", 0.9),
    ("s2a", 2, "That's where BridgeAux comes in.", 0.94),
    ("s2b", 2, "Not just a website.", 0.9),
    ("s2c", 2, "Everything your business needs to exist and grow online.", 0.94),
    ("s3a", 3, "Getting started is simple.", 0.94),
    ("s3b", 3, "Just tell us about your business.", 0.94),
    ("s4a", 4, "From there, BridgeAux sets up the digital foundation your business needs.", 0.94),
    ("s5a", 5, "Once you're online, you can actually operate and grow.", 1.0),
    ("s5b", 5, "Customers can find you, contact you, enquire, and buy.", 1.0),
    ("s5c", 5, "And you can manage it all in one place.", 1.0),
    ("s6a", 6, "Your website, customers, sales and marketing, all connected in one place.", 1.04),
    ("s6b", 6, "BridgeAux.", 0.92),
    ("s6c", 6, "Everything your business needs to exist and grow online.", 0.98),
    # Optional CTA line. Not placed on the timeline by default (the on-screen
    # "Join the Waitlist" button carries the CTA inside the 60 second limit).
    ("s6d", 6, "Join the waitlist.", 0.95),
]

SAMPLE_RATE_OUT = 48000
TARGET_LUFS = -18.0


def phonemize(kokoro: Kokoro, text: str) -> str:
    """Phonemize text, forcing the brand pronunciation."""
    parts = re.split(r"(BridgeAux)", text)
    out = []
    for part in parts:
        if part == "BridgeAux":
            out.append(BRAND_PHONEMES)
        elif part:
            out.append(kokoro.tokenizer.phonemize(part, "en-us"))
    joined = " ".join(p.strip() for p in out if p.strip())
    # keep punctuation tight against the preceding phoneme
    return re.sub(r"\s+([.,!?])", r"\1", joined)


def trim_silence(audio: np.ndarray, sr: int, threshold_db: float = -45.0, pad_ms: int = 40) -> np.ndarray:
    frame = int(sr * 0.01)
    env = np.array([
        np.sqrt(np.mean(audio[i:i + frame] ** 2) + 1e-12)
        for i in range(0, len(audio), frame)
    ])
    db = 20 * np.log10(env + 1e-12)
    voiced = np.where(db > threshold_db)[0]
    if len(voiced) == 0:
        return audio
    pad = int(sr * pad_ms / 1000)
    start = max(0, voiced[0] * frame - pad)
    end = min(len(audio), (voiced[-1] + 1) * frame + pad)
    return audio[start:end]


def fade(audio: np.ndarray, sr: int, ms: int = 12) -> np.ndarray:
    n = int(sr * ms / 1000)
    ramp = np.linspace(0, 1, n)
    audio = audio.copy()
    audio[:n] *= ramp
    audio[-n:] *= ramp[::-1]
    return audio


def resample(audio: np.ndarray, sr_in: int, sr_out: int) -> np.ndarray:
    from scipy.signal import resample_poly
    from math import gcd
    g = gcd(sr_in, sr_out)
    return resample_poly(audio, sr_out // g, sr_in // g)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--voice", default="af_heart")
    parser.add_argument("--speed", type=float, default=1.0)
    args = parser.parse_args()

    kokoro = Kokoro(str(CACHE / "kokoro-v1.0.onnx"), str(CACHE / "voices-v1.0.bin"))
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    # Gentle broadcast-style voice chain: clean lows, a touch of warmth and
    # presence, light compression, safety limiter.
    chain = Pedalboard([
        HighpassFilter(cutoff_frequency_hz=85),
        LowShelfFilter(cutoff_frequency_hz=180, gain_db=1.2),
        PeakFilter(cutoff_frequency_hz=3200, gain_db=1.5, q=0.8),
        Compressor(threshold_db=-20, ratio=2.2, attack_ms=8, release_ms=120),
        Limiter(threshold_db=-2.0),
    ])
    meter = pyln.Meter(SAMPLE_RATE_OUT)
    limiter = Pedalboard([Limiter(threshold_db=-1.5, release_ms=80)])

    manifest = {"voice": args.voice, "engine": "kokoro-82m (onnx)", "sampleRate": SAMPLE_RATE_OUT, "lines": {}}
    for line_id, scene, text, speed in LINES:
        phonemes = phonemize(kokoro, text)
        samples, sr = kokoro.create(phonemes, voice=args.voice, speed=args.speed * speed, is_phonemes=True)
        audio = np.asarray(samples, dtype=np.float32)
        audio = trim_silence(audio, sr)
        audio = resample(audio, sr, SAMPLE_RATE_OUT).astype(np.float32)
        audio = chain(audio[np.newaxis, :], SAMPLE_RATE_OUT)[0]
        loudness = meter.integrated_loudness(audio) if len(audio) > SAMPLE_RATE_OUT * 0.4 else -20.0
        audio = pyln.normalize.loudness(audio, loudness, TARGET_LUFS)
        # JUCE's limiter adds make-up gain, so re-level to the target afterwards
        audio = limiter(audio[np.newaxis, :].astype(np.float32), SAMPLE_RATE_OUT)[0]
        audio = pyln.normalize.loudness(audio, meter.integrated_loudness(audio), TARGET_LUFS)
        audio = fade(audio, SAMPLE_RATE_OUT)
        path = OUT_DIR / f"{line_id}.wav"
        sf.write(path, audio, SAMPLE_RATE_OUT, subtype="PCM_16")
        duration = len(audio) / SAMPLE_RATE_OUT
        manifest["lines"][line_id] = {
            "scene": scene,
            "text": text,
            "file": f"audio/vo/{line_id}.wav",
            "durationSec": round(duration, 3),
        }
        print(f"{line_id}  {duration:5.2f}s  {text}   [{phonemes}]")

    DATA_FILE.write_text(json.dumps(manifest, indent=2) + "\n")
    print("wrote", DATA_FILE)


if __name__ == "__main__":
    main()
