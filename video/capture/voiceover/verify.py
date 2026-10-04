import json, os, subprocess, wave
from pocketsphinx import Decoder, get_model_path
mp = get_model_path()
cuts = json.load(open("cuts.json"))
NUM = {"zero","oh","one","two","three","four","five","six","seven","eight","nine","ten","eleven","twelve","thirteen","fourteen","fifteen","sixteen","seventeen","eighteen","nineteen","twenty","thirty","forty","fifty","all","want","for","or"}
for r in cuts:
    i = r["line"]
    subprocess.run(["ffmpeg","-loglevel","error","-y","-i",f"/home/user/GitGud_Waypoint/video/public/voice/L{i:02d}.mp3","-ar","16000","-ac","1","v.wav"],check=True)
    d = Decoder(hmm=os.path.join(mp,"en-us/en-us"), lm=os.path.join(mp,"en-us/en-us.lm.bin"), dict=os.path.join(mp,"en-us/cmudict-en-us.dict"), loglevel="FATAL")
    raw = wave.open("v.wav").readframes(10**9)
    d.start_utt(); d.process_raw(raw, False, True); d.end_utt()
    hyp = d.hyp().hypstr if d.hyp() else ""
    first = hyp.split()[:3]; sw = r["text"].lower().split()[:2]
    print(f'{i:2d} {r["cut_end"]-r["cut_start"]:5.1f}s | S: {" ".join(r["text"].split()[:5])}… | H: {" ".join(hyp.split()[:6])} … {" ".join(hyp.split()[-4:])}')
