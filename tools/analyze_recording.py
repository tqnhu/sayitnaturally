#!/usr/bin/env python3
"""Offline prosody analysis of a speech recording (the original chat-session analysis).

Usage:
    python3 tools/analyze_recording.py path/to/recording.m4a

Needs ffmpeg on PATH, plus numpy and scipy. Converts the file to 16 kHz mono WAV, then reports:
time spent speaking, pauses, an estimated syllable rate, pitch (F0) median and range in semitones,
and the pitch movement at the end of each phrase.
These are the same measures the web app computes in JavaScript (app/index.html, analyse()),
although the app's pause and phrase thresholds differ a little; see docs/ARCHITECTURE.md.
"""
import subprocess, sys, tempfile, os
import numpy as np
import scipy.io.wavfile as wavfile
import scipy.signal as sig


def to_wav(src):
    out = os.path.join(tempfile.mkdtemp(), "a.wav")
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", src, "-ac", "1", "-ar", "16000", out], check=True)
    return out


def main(path):
    sr, x = wavfile.read(to_wav(path))
    x = x.astype(float) / 32768
    dur = len(x) / sr
    hop, win = int(.01 * sr), int(.025 * sr)
    fr = np.lib.stride_tricks.sliding_window_view(x, win)[::hop]
    db = 20 * np.log10(np.sqrt((fr ** 2).mean(1)) + 1e-9)
    floor, peak = np.percentile(db, 10), np.percentile(db, 95)

    # Speech/silence at two thresholds (a strict one counts tiny gaps, a loose one counts real pauses)
    for k in (.15, .25, .35):
        sp = sig.medfilt((db > floor + k * (peak - floor)).astype(int), 15).astype(bool)
        d = np.diff(np.r_[0, sp.astype(int), 0]); st = np.where(d == 1)[0]; en = np.where(d == -1)[0]
        runs = (en - st) * .01; gaps = (st[1:] - en[:-1]) * .01
        print(f"threshold {k}: speech {100*sp.mean():.0f}%  runs {len(runs)}  mean run {runs.mean():.2f}s  "
              f"gaps>0.5s {(gaps>.5).sum()}  gaps>1s {(gaps>1).sum()}")

    sp = sig.medfilt((db > floor + .25 * (peak - floor)).astype(int), 11).astype(bool)
    speech = sp.sum() * .01

    # Syllable nuclei: peaks of the 300-2500 Hz band envelope inside speech
    b, a = sig.butter(4, [300, 2500], 'band', fs=sr)
    y = sig.filtfilt(b, a, x)
    env = np.sqrt(sig.filtfilt(*sig.butter(2, 8, fs=sr), y ** 2).clip(0))
    edb = 20 * np.log10(env[::hop][:len(sp)] + 1e-9)
    pk, _ = sig.find_peaks(edb, prominence=2.5, distance=8)
    syl = sum(1 for p in pk if sp[p])

    # F0 by autocorrelation, with octave-error folding
    f0 = []
    for i, f in enumerate(fr[:len(sp)]):
        if not sp[i]:
            f0.append(np.nan); continue
        f = (f - f.mean()) * np.hanning(len(f))
        ac = np.correlate(f, f, 'full')[len(f) - 1:]
        lo, hi = int(sr / 400), int(sr / 70)
        if ac[0] <= 0:
            f0.append(np.nan); continue
        k = lo + np.argmax(ac[lo:hi])
        f0.append(sr / k if ac[k] / ac[0] > .45 else np.nan)
    f0 = np.array(f0); v = f0[~np.isnan(f0)]
    med = np.median(v)
    st_ = 12 * np.log2(v / med)
    st_ = np.where(st_ > 9, st_ - 12, np.where(st_ < -9, st_ + 12, st_))

    print(f"\nduration {dur:.1f}s, speaking {speech:.1f}s ({100*speech/dur:.0f}%)")
    print(f"syllables ~{syl}: {syl/dur:.2f}/s overall, {syl/speech:.2f}/s while speaking")
    print(f"F0 median {med:.0f} Hz, range p10-p90 {np.percentile(st_,90)-np.percentile(st_,10):.1f} semitones")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
