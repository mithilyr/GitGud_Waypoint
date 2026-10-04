"""Generates a calm, original ambient/lo-fi bed for the demo video (no samples, no downloads).
Usage: python capture/music.py <seconds> <out.wav>"""
import sys
import numpy as np
from scipy.signal import fftconvolve, butter, sosfilt

SR = 44100
dur = float(sys.argv[1]); out = sys.argv[2]
rng = np.random.default_rng(7)
bpm = 84; beat = 60 / bpm; bar = 4 * beat
N = int((dur + 4) * SR)
t = np.arange(N) / SR
hz = lambda m: 440.0 * 2 ** ((m - 69) / 12)

def env(n, a, d, s=0.0, curve=3.0):
    x = np.arange(n) / SR
    return np.minimum(1, x / max(a, 1e-4)) * (s + (1 - s) * np.exp(-x / d * curve))

def add(buf, start, sig, gain=1.0, pan=0.0):
    i = int(start * SR)
    if i >= buf.shape[0]: return
    j = min(buf.shape[0], i + len(sig)); sig = sig[: j - i]
    buf[i:j, 0] += sig * gain * (1 - max(0, pan)); buf[i:j, 1] += sig * gain * (1 + min(0, pan))

# Am - F - C - G, two bars each, repeating. MIDI chord tones (pad) + bass roots.
prog = [([57, 60, 64, 67], 45), ([53, 57, 60, 64], 41), ([60, 64, 67, 71], 48), ([55, 59, 62, 66], 43)]
pad = np.zeros((N, 2)); pluck = np.zeros((N, 2)); bass = np.zeros((N, 2)); perc = np.zeros((N, 2))
bars = int((dur + 4) / bar) + 2
for b in range(bars):
    chord, root = prog[(b // 2) % 4]
    t0 = b * bar
    if b % 2 == 0:  # pad: detuned sines with slow swell, re-struck every two bars
        L = int(2 * bar * SR); x = np.arange(L) / SR
        for k, m in enumerate(chord):
            for det in (-0.07, 0.0, 0.07):
                f = hz(m) * 2 ** (det / 12)
                sig = np.sin(2 * np.pi * f * x) + 0.25 * np.sin(2 * np.pi * 2 * f * x) + 0.08 * np.sin(2 * np.pi * 3 * f * x)
                e = np.minimum(1, x / 1.6) * np.minimum(1, (x[-1] - x) / 1.8)
                add(pad, t0, sig * e * 0.045, pan=(k - 1.5) * 0.25)
    # bass: root on beats 1 and 3, soft sine
    for bt in (0, 2):
        n = int(beat * 1.9 * SR); x = np.arange(n) / SR
        sig = np.sin(2 * np.pi * hz(root) * x) * env(n, 0.01, 0.9, curve=2.2)
        add(bass, t0 + bt * beat, sig, 0.16)
    # arpeggio plucks, eighth notes, gently varying
    pat = [0, 2, 1, 3, 2, 1, 3, 2]
    for i, p in enumerate(pat):
        if rng.random() < 0.15: continue
        m = chord[p] + 12
        n = int(0.9 * SR); x = np.arange(n) / SR
        f = hz(m)
        sig = (np.sin(2 * np.pi * f * x) + 0.35 * np.sin(2 * np.pi * 2 * f * x) * np.exp(-x * 6)) * env(n, 0.003, 0.35, curve=4)
        add(pluck, t0 + i * beat / 2, sig, 0.085, pan=0.35 if i % 2 else -0.35)
    # very soft shaker on offbeat eighths, kick-less
    for i in range(8):
        if i % 2 == 1:
            n = int(0.07 * SR); nz = rng.standard_normal(n) * env(n, 0.001, 0.025, curve=5)
            add(perc, t0 + i * beat / 2, nz, 0.018, pan=0.2)

def hp(x, fc): return sosfilt(butter(2, fc, "hp", fs=SR, output="sos"), x, axis=0)
def lp(x, fc): return sosfilt(butter(2, fc, "lp", fs=SR, output="sos"), x, axis=0)
dry = lp(pad, 2800) + lp(pluck, 5200) + bass + hp(perc, 5000)
# synthetic room reverb
ir_n = int(2.4 * SR); ir = rng.standard_normal((ir_n, 2)) * np.exp(-np.arange(ir_n) / SR * 2.6)[:, None]
ir = lp(ir, 3500) * 0.012
wet = np.stack([fftconvolve(pluck[:, c] + pad[:, c], ir[:, c])[:N] for c in range(2)], axis=1)
mix = dry + wet * 1.0
mix = hp(mix, 35)
# master fades: in over 3 s, out over the final 5 s, trimmed to duration
n_out = int(dur * SR)
mix = mix[:n_out]
x = np.arange(n_out) / SR
mix *= (np.minimum(1, x / 3.0) * np.minimum(1, (dur - x) / 5.0))[:, None]
peak = np.abs(mix).max(); mix = mix / peak * 0.5   # leave headroom; level is set again in the video
import wave
pcm = (np.clip(mix, -1, 1) * 32767).astype("<i2")
with wave.open(out, "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print("wrote", out, f"{dur:.1f}s peak-normalised to -6 dBFS")
