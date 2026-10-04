import json, re, subprocess, os, wave
from pocketsphinx import Decoder, get_model_path
OUT = "/home/user/GitGud_Waypoint/video/public/voice"
lines = json.load(open("lines.json")); words = json.load(open("words.json"))
sil = subprocess.run(["ffmpeg","-hide_banner","-nostats","-i","vo.mp3","-af","silencedetect=noise=-35dB:d=0.1","-f","null","-"],capture_output=True,text=True).stderr
starts = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", sil)]
ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", sil)]
sils = list(zip(starts, ends))
tok = lambda s: re.findall(r"[a-z']+", s.lower().replace("-", " "))
res = []
for k, L in enumerate(lines):
    n = L["total"]; matched = L["matched"]
    a, b = L["start"], L["end"]
    prev_end = lines[k-1]["end"] + 0.05 if k else 0.0
    next_start = lines[k+1]["start"] - 0.05 if k + 1 < len(lines) else 1e9
    missing = max(0, n - matched)
    # unmatched words are split between head and tail in proportion to nothing known: allow a modest extension on both
    ext_head = min(0.9, 0.12 * missing); ext_tail = min(1.0, 0.18 * missing)
    cand = max(prev_end, a - ext_head)
    # snap start to the latest pause end between cand and a (so we never begin mid-word)
    ss = [e for (s_, e) in sils if cand - 0.05 <= e <= a + 0.02]
    start = max(ss) if ss else max(cand, a - 0.06)
    cand_e = min(next_start, b + ext_tail)
    se = [s_ for (s_, e) in sils if b - 0.02 <= s_ <= cand_e + 0.05]
    end = min(se) if se else min(cand_e, b + 0.12)
    res.append(dict(L, cut_start=round(start, 3), cut_end=round(end + 0.04, 3)))
json.dump(res, open("cuts.json", "w"), indent=1)
# export
for r in res:
    i = r["line"]; dur = r["cut_end"] - r["cut_start"]
    cmd = ["ffmpeg","-loglevel","error","-y","-ss",f'{r["cut_start"]}',"-t",f"{dur}","-i","vo.mp3","-af",f"afade=t=in:d=0.02,afade=t=out:st={max(0,dur-0.06):.3f}:d=0.06","-ar","44100","-ac","1","-c:a","libmp3lame","-q:a","2",f"{OUT}/L{i:02d}.mp3"]
    subprocess.run(cmd, check=True)
print("exported", len(res))
