"""Synthesize the sound design and music bed for the BridgeAux explainer.

Everything here is generated procedurally (numpy + scipy + pedalboard), so the
audio is fully reproducible and free of third-party licensing. A fixed random
seed keeps every run identical.

Outputs:
    public/audio/sfx/*.wav     short UI and transition sounds
    public/audio/music/bed.wav 60 second ambient score following the story

Usage:
    python3 scripts/generate_audio.py
"""

from pathlib import Path

import numpy as np
import soundfile as sf
from pedalboard import Compressor, HighpassFilter, Limiter, LowpassFilter, Pedalboard, Reverb
from scipy.signal import butter, sosfilt

ROOT = Path(__file__).resolve().parent.parent
SFX_DIR = ROOT / "public" / "audio" / "sfx"
MUSIC_DIR = ROOT / "public" / "audio" / "music"
SR = 48000
rng = np.random.default_rng(20260930)


# ---------------------------------------------------------------- helpers

def t_axis(seconds: float) -> np.ndarray:
    return np.arange(int(SR * seconds)) / SR


def midi_hz(n: float) -> float:
    return 440.0 * 2 ** ((n - 69) / 12)


def bandpass(x: np.ndarray, lo: float, hi: float, order: int = 2) -> np.ndarray:
    sos = butter(order, [lo, hi], btype="bandpass", fs=SR, output="sos")
    return sosfilt(sos, x)


def lowpass(x: np.ndarray, cutoff: float, order: int = 2) -> np.ndarray:
    sos = butter(order, cutoff, btype="lowpass", fs=SR, output="sos")
    return sosfilt(sos, x)


def highpass(x: np.ndarray, cutoff: float, order: int = 2) -> np.ndarray:
    sos = butter(order, cutoff, btype="highpass", fs=SR, output="sos")
    return sosfilt(sos, x)


def exp_env(n: int, decay_s: float, attack_s: float = 0.002) -> np.ndarray:
    t = np.arange(n) / SR
    env = np.exp(-t / decay_s)
    a = max(1, int(attack_s * SR))
    env[:a] *= np.linspace(0, 1, a)
    return env


def stereo(x: np.ndarray, pan: float = 0.0, width: float = 0.0) -> np.ndarray:
    """Equal-power pan (-1..1) with an optional short Haas widening."""
    left = x * np.cos((pan + 1) * np.pi / 4)
    right = x * np.sin((pan + 1) * np.pi / 4)
    if width > 0:
        d = int(width * SR)
        right = np.concatenate([np.zeros(d), right[:-d]]) if d > 0 else right
    return np.stack([left, right], axis=0)


def place(buf: np.ndarray, sig: np.ndarray, at_s: float, gain: float = 1.0) -> None:
    """Mix a (2, n) signal into a (2, N) buffer at a time offset."""
    start = int(at_s * SR)
    if start >= buf.shape[1]:
        return
    end = min(buf.shape[1], start + sig.shape[1])
    buf[:, start:end] += sig[:, : end - start] * gain


def normalize_peak(x: np.ndarray, peak_db: float = -6.0) -> np.ndarray:
    peak = np.max(np.abs(x)) + 1e-12
    return x * (10 ** (peak_db / 20) / peak)


def fx(x: np.ndarray, board: Pedalboard) -> np.ndarray:
    return board(x.astype(np.float32), SR)


def pad_tail(x: np.ndarray, seconds: float) -> np.ndarray:
    return np.concatenate([x, np.zeros((x.shape[0], int(seconds * SR)))], axis=1)


def write(path: Path, x: np.ndarray, peak_db: float = -6.0) -> None:
    x = normalize_peak(x, peak_db)
    path.parent.mkdir(parents=True, exist_ok=True)
    sf.write(path, x.T.astype(np.float32), SR, subtype="PCM_16")
    print(f"  {path.relative_to(ROOT)}  {x.shape[1] / SR:5.2f}s")


def room(mix: float = 0.18, size: float = 0.35) -> Reverb:
    return Reverb(room_size=size, damping=0.6, wet_level=mix, dry_level=1.0 - mix * 0.5, width=0.9)


# ---------------------------------------------------------------- sfx

def sfx_click() -> np.ndarray:
    n = int(0.08 * SR)
    noise = bandpass(rng.standard_normal(n), 2200, 7000) * exp_env(n, 0.006)
    t = np.arange(n) / SR
    tick = np.sin(2 * np.pi * 1650 * t) * exp_env(n, 0.012) * 0.5
    body = np.sin(2 * np.pi * 420 * t) * exp_env(n, 0.01) * 0.35
    return fx(stereo(noise * 0.6 + tick + body), Pedalboard([room(0.08, 0.15)]))


def sfx_tap() -> np.ndarray:
    n = int(0.09 * SR)
    t = np.arange(n) / SR
    tone = np.sin(2 * np.pi * (900 + 300 * np.exp(-t / 0.01)) * t) * exp_env(n, 0.018)
    noise = bandpass(rng.standard_normal(n), 1500, 5000) * exp_env(n, 0.004) * 0.4
    return fx(stereo(tone + noise), Pedalboard([room(0.1, 0.2)]))


def sfx_typing(seconds: float = 6.0, cps: float = 13.0) -> np.ndarray:
    """Soft laptop keyboard typing with natural rhythm variation."""
    buf = np.zeros((2, int(seconds * SR) + SR // 2))
    time = 0.03
    while time < seconds:
        n = int(0.06 * SR)
        t = np.arange(n) / SR
        centre = rng.uniform(2200, 4200)
        click = bandpass(rng.standard_normal(n), centre * 0.6, centre * 1.4) * exp_env(n, rng.uniform(0.006, 0.011))
        thock = np.sin(2 * np.pi * rng.uniform(170, 240) * t) * exp_env(n, 0.014) * 0.5
        key = click * 0.55 + thock
        release_at = rng.uniform(0.05, 0.08)
        place(buf, stereo(key, pan=rng.uniform(-0.25, 0.25)), time, rng.uniform(0.55, 1.0))
        # key release, quieter
        rel = bandpass(rng.standard_normal(n // 2), 3000, 6000) * exp_env(n // 2, 0.004) * 0.18
        place(buf, stereo(rel, pan=rng.uniform(-0.2, 0.2)), time + release_at)
        gap = rng.normal(1 / cps, 0.022)
        if rng.random() < 0.07:
            gap += rng.uniform(0.12, 0.25)  # brief thinking pause
        time += max(0.045, gap)
    return fx(buf, Pedalboard([HighpassFilter(120), room(0.1, 0.2)]))


def bell_note(freq: float, seconds: float, decay: float, partials=((1, 1.0), (2.0, 0.25), (3.01, 0.08), (4.2, 0.04))) -> np.ndarray:
    t = t_axis(seconds)
    out = np.zeros_like(t)
    for ratio, amp in partials:
        out += amp * np.sin(2 * np.pi * freq * ratio * t) * np.exp(-t / (decay / (ratio ** 0.6)))
    a = int(0.003 * SR)
    out[:a] *= np.linspace(0, 1, a)
    return out


def sfx_confirm() -> np.ndarray:
    buf = np.zeros((2, int(1.4 * SR)))
    place(buf, stereo(bell_note(midi_hz(81), 1.2, 0.35), pan=-0.1), 0.0, 0.8)   # A5
    place(buf, stereo(bell_note(midi_hz(88), 1.2, 0.45), pan=0.1), 0.085, 0.7)  # E6
    return fx(buf, Pedalboard([LowpassFilter(9000), room(0.25, 0.4)]))


def sfx_pop() -> np.ndarray:
    n = int(0.12 * SR)
    t = np.arange(n) / SR
    f = 520 + 380 * (1 - np.exp(-t / 0.02))
    phase = 2 * np.pi * np.cumsum(f) / SR
    tone = np.sin(phase) * exp_env(n, 0.03, 0.003)
    return fx(stereo(tone * 0.9), Pedalboard([LowpassFilter(5000), room(0.15, 0.25)]))


def sfx_connect() -> np.ndarray:
    """Soft digital link: a gentle rising glassy tone with a sparkle tail."""
    seconds = 1.1
    t = t_axis(seconds)
    f = 520 * 2 ** (np.clip(t / 0.35, 0, 1) * 0.75)
    phase = 2 * np.pi * np.cumsum(f) / SR
    mod = np.sin(2 * np.pi * f * 2.0 * t) * 0.8
    tone = np.sin(phase + mod) * np.exp(-t / 0.28)
    a = int(0.02 * SR)
    tone[:a] *= np.linspace(0, 1, a)
    sparkle = np.zeros_like(t)
    for i, st in enumerate([0.12, 0.2, 0.29]):
        s = int(st * SR)
        note = bell_note(midi_hz(93 + i * 2), seconds, 0.18, ((1, 1), (2.7, 0.2)))
        sparkle[s:] += note[: len(t) - s] * 0.22
    x = stereo(tone * 0.6 + sparkle, width=0.006)
    return fx(x, Pedalboard([HighpassFilter(250), LowpassFilter(10000), room(0.3, 0.5)]))


def sfx_whoosh(seconds: float = 1.0, lo: float = 250, hi: float = 2600, gain: float = 1.0) -> np.ndarray:
    t = t_axis(seconds)
    noise = rng.standard_normal(len(t))
    # sweep a band-pass by processing in short overlapping blocks
    out = np.zeros_like(noise)
    block = 1024
    hop = 512
    window = np.hanning(block)
    for start in range(0, len(t) - block, hop):
        pos = start / len(t)
        centre = lo * (hi / lo) ** np.sin(np.pi * pos)
        seg = bandpass(noise[start:start + block], centre * 0.6, min(centre * 1.6, SR / 2 - 100))
        out[start:start + block] += seg * window
    env = np.sin(np.pi * np.clip(t / seconds, 0, 1)) ** 2.2
    x = out * env
    pan_curve = np.linspace(-0.5, 0.5, len(t))
    left = x * np.cos((pan_curve + 1) * np.pi / 4)
    right = x * np.sin((pan_curve + 1) * np.pi / 4)
    return fx(np.stack([left, right]) * gain, Pedalboard([room(0.2, 0.5)]))


def sfx_notify() -> np.ndarray:
    buf = np.zeros((2, int(1.2 * SR)))
    marimba = ((1, 1.0), (3.99, 0.18), (10.1, 0.03))
    place(buf, stereo(bell_note(midi_hz(86), 1.0, 0.22, marimba), pan=-0.08), 0.0, 0.85)  # D6
    place(buf, stereo(bell_note(midi_hz(93), 1.0, 0.3, marimba), pan=0.08), 0.11, 0.7)    # A6
    return fx(buf, Pedalboard([LowpassFilter(8000), room(0.22, 0.35)]))


def sfx_swell(seconds: float = 1.6) -> np.ndarray:
    t = t_axis(seconds)
    noise = lowpass(rng.standard_normal(len(t)), 5000)
    env = (t / seconds) ** 2.6
    tone = np.zeros_like(t)
    for n in (62, 69, 74, 78):  # D4 A4 D5 F#5
        tone += np.sin(2 * np.pi * midi_hz(n) * t + rng.uniform(0, 6.28)) * 0.2
    x = (noise * 0.35 + tone) * env
    fade_n = int(0.03 * SR)
    x[-fade_n:] *= np.linspace(1, 0, fade_n)
    return fx(stereo(x, width=0.008), Pedalboard([HighpassFilter(200), room(0.35, 0.6)]))


def sfx_bloom() -> np.ndarray:
    """Warm logo reveal: soft chord bloom with a gentle low body."""
    seconds = 3.2
    t = t_axis(seconds)
    x = np.zeros_like(t)
    for n, amp in ((50, 0.35), (62, 0.3), (66, 0.22), (69, 0.22), (73, 0.16), (76, 0.12)):
        f = midi_hz(n)
        for det in (-0.08, 0.08):
            x += amp * 0.5 * np.sin(2 * np.pi * f * (1 + det / 100) * t)
    env = np.minimum(t / 0.06, 1) * np.exp(-t / 1.1)
    x *= env
    shimmer = bell_note(midi_hz(86), seconds, 0.9) * 0.12 + bell_note(midi_hz(93), seconds, 0.7) * 0.06
    y = stereo(lowpass(x, 3200) + shimmer, width=0.01)
    return fx(y, Pedalboard([room(0.35, 0.7)]))


def sfx_shop_bell() -> np.ndarray:
    partials = ((1, 1.0), (2.76, 0.4), (5.4, 0.2), (8.93, 0.08))
    buf = np.zeros((2, int(1.6 * SR)))
    place(buf, stereo(bell_note(2093, 1.4, 0.45, partials), pan=0.3), 0.0, 0.6)
    place(buf, stereo(bell_note(2349, 1.4, 0.4, partials), pan=0.35), 0.07, 0.45)
    place(buf, stereo(bell_note(2093, 1.4, 0.35, partials), pan=0.3), 0.15, 0.3)
    return fx(buf, Pedalboard([LowpassFilter(9000), room(0.25, 0.3)]))


def sfx_street_ambience(seconds: float = 10.5) -> np.ndarray:
    """Quiet neighbourhood morning: distant traffic hum, murmur, birds, a passing scooter."""
    n = int(seconds * SR)
    t = np.arange(n) / SR
    brown = np.cumsum(rng.standard_normal(n))
    brown = highpass(brown, 30)
    brown = lowpass(brown, 700)
    brown /= np.max(np.abs(brown)) + 1e-9
    slow = 0.75 + 0.25 * np.sin(2 * np.pi * 0.13 * t + 1.0)
    murmur = bandpass(rng.standard_normal(n), 300, 1400)
    murmur_env = lowpass(np.abs(rng.standard_normal(n)), 3)
    murmur_env /= np.max(murmur_env) + 1e-9
    bed = brown * slow * 0.5 + murmur * murmur_env * 0.08
    x = stereo(bed, width=0.012)
    # birds
    for at, base in ((1.3, 3900), (1.52, 4300), (4.7, 3600), (7.9, 4100), (8.08, 4500)):
        dur = 0.11
        tt = t_axis(dur)
        f = base + 900 * np.sin(np.pi * tt / dur)
        chirp = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / dur) ** 2
        place(x, stereo(chirp * 0.05, pan=rng.uniform(-0.7, 0.7)), at)
    # scooter passing left to right
    dur = 3.4
    tt = t_axis(dur)
    pos = tt / dur
    f = 92 * (1 + 0.06 * np.cos(np.pi * pos))
    engine = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.5 + np.sin(2 * np.pi * np.cumsum(f * 2) / SR) * 0.3
    engine = lowpass(engine, 900) * np.sin(np.pi * pos) ** 2 * 0.22
    pan = np.linspace(-0.8, 0.8, len(tt))
    place(x, np.stack([engine * np.cos((pan + 1) * np.pi / 4), engine * np.sin((pan + 1) * np.pi / 4)]), 2.2)
    fade_n = int(0.6 * SR)
    x[:, :fade_n] *= np.linspace(0, 1, fade_n)
    x[:, -fade_n:] *= np.linspace(1, 0, fade_n)
    return fx(x, Pedalboard([room(0.15, 0.6)]))


# ---------------------------------------------------------------- music

BPM = 96
BEAT = 60 / BPM
BAR = BEAT * 4  # 2.5 s, so 24 bars = 60 s

# (bass midi, pad voicing midi) per chord name
CHORDS = {
    "Bm9": (47, [62, 66, 69, 73]),
    "Gmaj9": (43, [59, 62, 66, 69]),
    "Asus": (45, [62, 64, 69, 71]),
    "Dmaj9": (50, [66, 69, 73, 76]),
    "A/C#": (49, [64, 69, 71, 76]),
    "Bm7": (47, [62, 66, 69, 71]),
    "Em9": (52, [67, 71, 74, 78]),
    "A": (45, [64, 69, 73, 76]),
}

PROGRESSION = [
    # Scene 1: thoughtful, unresolved
    "Bm9", "Gmaj9", "Bm9", "Asus",
    # Scene 2: BridgeAux arrives, the lift
    "Dmaj9", "A/C#", "Bm7", "Gmaj9",
    # Scene 3: simple, steady
    "Dmaj9", "A/C#", "Bm7", "Gmaj9",
    # Scene 4: building the foundation
    "Em9", "Gmaj9", "Dmaj9", "A/C#",
    # Scene 5: operating and growing
    "Bm7", "Gmaj9", "Dmaj9", "A/C#",
    # Scene 6: everything connected, resolve
    "Gmaj9", "A", "Dmaj9", "Dmaj9",
]


def pad_voice(freq: float, seconds: float, attack: float = 0.9, release: float = 1.4) -> np.ndarray:
    t = t_axis(seconds + release)
    x = np.zeros_like(t)
    for det in (-0.11, 0.0, 0.12):
        f = freq * (1 + det / 100)
        # soft saw from a handful of harmonics (band-limited, warm)
        for h in range(1, 7):
            x += np.sin(2 * np.pi * f * h * t + h) / (h ** 1.35)
    env = np.minimum(t / attack, 1.0)
    rel_start = int(seconds * SR)
    env[rel_start:] *= np.exp(-(t[rel_start:] - seconds) / (release / 3))
    return x * env / 3


def pluck(freq: float, seconds: float = 0.9) -> np.ndarray:
    t = t_axis(seconds)
    x = (np.sin(2 * np.pi * freq * t) * np.exp(-t / 0.35)
         + 0.35 * np.sin(2 * np.pi * freq * 2 * t) * np.exp(-t / 0.18)
         + 0.12 * np.sin(2 * np.pi * freq * 3 * t) * np.exp(-t / 0.09))
    a = int(0.004 * SR)
    x[:a] *= np.linspace(0, 1, a)
    return x


def kick() -> np.ndarray:
    t = t_axis(0.45)
    f = 48 + 70 * np.exp(-t / 0.03)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.16)
    return lowpass(x, 400)


def shaker() -> np.ndarray:
    n = int(0.09 * SR)
    x = bandpass(rng.standard_normal(n), 5000, 11000) * exp_env(n, 0.02, 0.008)
    return x


def soft_piano(freq: float, seconds: float = 3.5) -> np.ndarray:
    t = t_axis(seconds)
    x = np.zeros_like(t)
    for h, amp, dec in ((1, 1.0, 1.4), (2, 0.4, 0.8), (3, 0.18, 0.5), (4, 0.08, 0.35), (5, 0.04, 0.25)):
        x += amp * np.sin(2 * np.pi * freq * h * (1 + 0.0004 * h * h) * t) * np.exp(-t / dec)
    hammer = bandpass(rng.standard_normal(len(t)), 1500, 4000) * np.exp(-t / 0.01) * 0.05
    a = int(0.005 * SR)
    x[:a] *= np.linspace(0, 1, a)
    return lowpass(x + hammer, 4500)


def make_music() -> np.ndarray:
    total = BAR * len(PROGRESSION) + 4.0
    n = int(total * SR)
    pads = np.zeros((2, n))
    bass = np.zeros((2, n))
    arps = np.zeros((2, n))
    drums = np.zeros((2, n))
    keys = np.zeros((2, n))

    for i, name in enumerate(PROGRESSION):
        start = i * BAR
        root, voicing = CHORDS[name]
        last = i == len(PROGRESSION) - 1
        hold = BAR + (3.0 if last else 0.25)
        # pads: every bar, voices spread across the stereo field
        for j, note in enumerate(voicing):
            v = pad_voice(midi_hz(note), hold, attack=1.2 if i == 0 else 0.7, release=2.2 if last else 1.2)
            place(pads, stereo(v, pan=(j - 1.5) * 0.35, width=0.004), start, 0.16)
        # bass from scene 2 up to the final hero frame
        if 4 <= i <= 22:
            t = t_axis(BAR + 0.2)
            f = midi_hz(root)
            b = (np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * f * 2 * t)) * np.minimum(t / 0.05, 1) * np.exp(-t / 3.5)
            b[-int(0.2 * SR):] *= np.linspace(1, 0, int(0.2 * SR))
            place(bass, stereo(b), start, 0.22 if i < 16 else 0.28)
        # plucked arpeggio (eighth notes) from scene 2 to the hero frame
        if 4 <= i <= 21:
            pattern = [0, 2, 1, 3, 2, 1, 3, 2]
            for k, idx in enumerate(pattern):
                note = voicing[idx] + 12
                vel = 0.55 + 0.25 * (k % 2 == 0) + rng.uniform(-0.05, 0.05)
                pan = 0.35 if k % 2 else -0.35
                place(arps, stereo(pluck(midi_hz(note)), pan=pan), start + k * BEAT / 2, 0.07 * vel)
        # restrained rhythm through scenes 3 to 5
        if 8 <= i <= 20:
            for beat in (0, 2):
                place(drums, stereo(kick()), start + beat * BEAT, 0.34 if i >= 12 else 0.26)
            for k in range(8):
                if k % 2 == 1:
                    place(drums, stereo(shaker(), pan=0.25), start + k * BEAT / 2, 0.05 if i >= 12 else 0.035)
        # piano accents at scene openings
        if i in (0, 4, 8, 12, 16, 20, 22):
            top = voicing[-1] + (12 if i in (4, 22) else 0)
            place(keys, stereo(soft_piano(midi_hz(top)), pan=0.1), start + 0.02, 0.12)
            place(keys, stereo(soft_piano(midi_hz(voicing[1] + 12)), pan=-0.1), start + BEAT * 1.5, 0.06)

    pads = fx(pads, Pedalboard([LowpassFilter(2600), room(0.4, 0.8)]))
    arps = fx(arps, Pedalboard([HighpassFilter(300), LowpassFilter(6000), room(0.35, 0.6)]))
    keys = fx(keys, Pedalboard([room(0.45, 0.8)]))
    drums = fx(drums, Pedalboard([room(0.12, 0.3)]))
    bass = fx(bass, Pedalboard([LowpassFilter(500)]))

    length = min(pads.shape[1], arps.shape[1], keys.shape[1], drums.shape[1], bass.shape[1])
    mix = pads[:, :length] + arps[:, :length] + keys[:, :length] + drums[:, :length] + bass[:, :length]
    mix = fx(mix, Pedalboard([HighpassFilter(35), Compressor(threshold_db=-18, ratio=2.0, attack_ms=20, release_ms=250), Limiter(threshold_db=-1.5)]))
    # final length: exactly 60 s with a gentle tail fade
    mix = mix[:, : int(60.0 * SR)]
    fade_n = int(2.5 * SR)
    mix[:, -fade_n:] *= np.linspace(1, 0, fade_n) ** 1.5
    return mix


def main() -> None:
    print("sfx:")
    write(SFX_DIR / "click.wav", pad_tail(sfx_click(), 0.1), -8)
    write(SFX_DIR / "tap.wav", pad_tail(sfx_tap(), 0.1), -9)
    write(SFX_DIR / "typing.wav", sfx_typing(6.0), -10)
    write(SFX_DIR / "confirm.wav", sfx_confirm(), -8)
    write(SFX_DIR / "pop.wav", pad_tail(sfx_pop(), 0.15), -12)
    write(SFX_DIR / "connect.wav", sfx_connect(), -10)
    write(SFX_DIR / "whoosh.wav", sfx_whoosh(1.0), -9)
    write(SFX_DIR / "whoosh-soft.wav", sfx_whoosh(1.4, 180, 1400, 0.8), -12)
    write(SFX_DIR / "notify.wav", sfx_notify(), -9)
    write(SFX_DIR / "swell.wav", sfx_swell(), -10)
    write(SFX_DIR / "bloom.wav", sfx_bloom(), -8)
    write(SFX_DIR / "shop-bell.wav", sfx_shop_bell(), -10)
    write(SFX_DIR / "street.wav", sfx_street_ambience(), -14)
    print("music:")
    write(MUSIC_DIR / "bed.wav", make_music(), -3)


if __name__ == "__main__":
    main()
