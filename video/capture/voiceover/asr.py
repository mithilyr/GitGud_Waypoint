from pocketsphinx import Decoder, get_model_path
import os, json, wave
mp = get_model_path()
d = Decoder(hmm=os.path.join(mp,"en-us/en-us"), lm=os.path.join(mp,"en-us/en-us.lm.bin"), dict=os.path.join(mp,"en-us/cmudict-en-us.dict"), loglevel="FATAL", bestpath=True)
w = wave.open("vo16.wav"); raw = w.readframes(w.getnframes())
words = []
CH = 16000 * 30 * 2  # 30 s chunks (bytes), cut where the audio is quiet would be better, but chunk edges are rare mid-word
# split on silence boundaries found earlier to avoid cutting words
import subprocess, re
sil = subprocess.run(["ffmpeg","-hide_banner","-nostats","-i","vo.mp3","-af","silencedetect=noise=-38dB:d=0.3","-f","null","-"],capture_output=True,text=True).stderr
mids = []
for m in re.finditer(r"silence_start: ([\d.]+)[\s\S]*?silence_end: ([\d.]+)", sil):
    mids.append((float(m.group(1)) + float(m.group(2))) / 2)
cuts = [0.0]
for t in mids:
    if t - cuts[-1] >= 20: cuts.append(t)
cuts.append(len(raw) / 2 / 16000)
for a, b in zip(cuts[:-1], cuts[1:]):
    seg = raw[int(a * 16000) * 2: int(b * 16000) * 2]
    d.start_utt(); d.process_raw(seg, False, True); d.end_utt()
    for s in d.seg():
        wd = s.word
        if wd.startswith("<") or wd.startswith("["): continue
        words.append([wd.split("(")[0], round(a + s.start_frame / 100, 3), round(a + s.end_frame / 100, 3)])
json.dump(words, open("words.json", "w"))
print(len(words), "words; chunks", len(cuts) - 1)
print(" ".join(w[0] for w in words[:60]))
