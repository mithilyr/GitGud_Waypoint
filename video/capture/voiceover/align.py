import json, re, difflib
words = json.load(open("words.json"))
H = [w[0] for w in words]
lines = []
src = open("/home/user/GitGud_Waypoint/video/out/narration.md").read()
scene = None
for ln in src.splitlines():
    m = re.match(r"## (\S+) · (.*)", ln)
    if m: scene = m.group(2); continue
    m = re.match(r"- \*\*([\d:]+)\*\* (.*)", ln)
    if m: lines.append((scene, m.group(2)))
tok = lambda s: re.findall(r"[a-z']+", s.lower().replace("-", " "))
S, owner = [], []
for i, (sc, t) in enumerate(lines):
    for w in tok(t): S.append(w); owner.append(i)
def sim(a, b):
    if a == b: return 1.0
    return difflib.SequenceMatcher(None, a, b).ratio()
n, m = len(S), len(H)
NEG = -10**9
GAP_H = -0.15   # extra hyp word (timecodes, headings, noise): cheap
GAP_S = -0.8    # script word the recognizer missed
import array
score = [[0.0]*(m+1) for _ in range(n+1)]
back = [[0]*(m+1) for _ in range(n+1)]
for i in range(1, n+1): score[i][0] = i*GAP_S; back[i][0] = 1
for j in range(1, m+1): score[0][j] = 0.0; back[0][j] = 2   # free leading hyp words
for i in range(1, n+1):
    si = S[i-1]; row = score[i]; prev = score[i-1]
    for j in range(1, m+1):
        r = sim(si, H[j-1])
        d = prev[j-1] + (2.0 if r >= 0.99 else (1.2 if r >= 0.7 else -1.0))
        u = prev[j] + GAP_S
        l = row[j-1] + GAP_H
        best = d; bk = 0
        if u > best: best, bk = u, 1
        if l > best: best, bk = l, 2
        row[j] = best; back[i][j] = bk
# free trailing hyp words
j = max(range(m+1), key=lambda jj: score[n][jj]); i = n
match = {}
while i > 0 and j > 0:
    b = back[i][j]
    if b == 0: match[i-1] = j-1; i -= 1; j -= 1
    elif b == 1: i -= 1
    else: j -= 1
out = []
for li, (sc, t) in enumerate(lines):
    idx = [match[k] for k in range(n) if owner[k] == li and k in match and sim(S[k], H[match[k]]) >= 0.7]
    if not idx: out.append(None); print(li, "NO MATCH", t[:40]); continue
    a, b = min(idx), max(idx)
    out.append(dict(line=li, scene=sc, text=t, start=words[a][1], end=words[b][2], matched=len(idx), total=len(tok(t))))
json.dump(out, open("lines.json", "w"), indent=1)
for o in out:
    if o: print(f'{o["line"]:2d} {o["start"]:6.1f}-{o["end"]:6.1f} {o["matched"]:2d}/{o["total"]:2d} {o["text"][:50]}')
