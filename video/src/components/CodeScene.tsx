import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { C, FPS, mono, sans, serif } from "../theme";
import { Fade, useAppear } from "./Fade";
import type { CodeScene as CodeSceneT } from "../code";
import type { Scene } from "../schedule";

// A tiny tokenizer, enough to colour the excerpts (comments, strings, keywords, numbers, decorators).
const KW = /^(def|return|if|not|in|is|None|for|from|import|class|const|let|await|async|and|or|else|raise|with|as|try|except|lambda|True|False)$/;
const TOK = /(#.*$|\/\/.*$|"""[^]*?"""|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|@[A-Za-z_.]+|\b\d+(?:\.\d+)?\b|[A-Za-z_][A-Za-z_0-9]*|\s+|.)/g;
const col = { kw: "#e7a07a", str: "#a9c89c", cmt: "#7d7a72", num: "#e9c46a", fn: "#9cc4e4", dec: "#c6a8e0", base: "#ece9e2" };
const Line: React.FC<{ text: string }> = ({ text }) => {
  const toks = text.match(TOK) ?? [];
  return (
    <>
      {toks.map((t, i) => {
        let c = col.base;
        if (t.startsWith("#") || t.startsWith("//")) c = col.cmt;
        else if (t.startsWith('"') || t.startsWith("'")) c = col.str;
        else if (t.startsWith("@")) c = col.dec;
        else if (/^\d/.test(t)) c = col.num;
        else if (KW.test(t)) c = col.kw;
        else if (/^[A-Za-z_]/.test(t) && toks[i - 1] === " " && toks[i - 2] === "def") c = col.fn;
        else if (/^[A-Za-z_]/.test(t) && toks[i - 1] === "def") c = col.fn;
        return <span key={i} style={{ color: c, whiteSpace: "pre" }}>{t}</span>;
      })}
    </>
  );
};

export const CodeSceneView: React.FC<{ code: CodeSceneT; scene: Scene }> = ({ code, scene }) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  let cur = 0;
  scene.lines.forEach((l, i) => { if (l.at <= t + 0.05) cur = i; });
  const [h0, h1] = code.cues[cur].hl;
  const title = useAppear(2);
  return (
    <Fade>
      <AbsoluteFill style={{ background: C.bg }}>
        <div style={{ position: "absolute", left: 50, top: 86, fontFamily: mono, fontSize: 20, color: C.muted, letterSpacing: 1.4, textTransform: "uppercase" }}>Code walkthrough · excerpt</div>
        <div style={{ position: "absolute", left: 50, top: 140, width: 1270, height: 800, borderRadius: 18, background: C.night, boxShadow: "0 40px 90px rgba(20,35,31,.25)", overflow: "hidden" }}>
          <div style={{ height: 52, display: "flex", alignItems: "center", gap: 10, padding: "0 22px", background: "#1c1b19", borderBottom: "1px solid #2c2a27" }}>
            {["#e5645a", "#e7b34a", "#6bbf6a"].map((c) => <span key={c} style={{ width: 13, height: 13, borderRadius: 7, background: c }} />)}
            <span style={{ marginLeft: 14, fontFamily: mono, fontSize: 19, color: "#a3a19c" }}>{code.file}</span>
          </div>
          <div style={{ padding: "26px 0", fontFamily: mono, fontSize: 21, lineHeight: "34px" }}>
            {code.lines.map((ln, i) => {
              const on = i >= h0 && i <= h1;
              return (
                <div key={i} style={{ display: "flex", background: on ? "rgba(181,86,43,.22)" : "transparent", borderLeft: `4px solid ${on ? C.orange : "transparent"}`, opacity: on ? 1 : 0.5, transition: "none" }}>
                  <span style={{ width: 64, textAlign: "right", paddingRight: 22, color: "#5f5d57", userSelect: "none" }}>{i + 1}</span>
                  <span><Line text={ln} /></span>
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ position: "absolute", left: 1370, right: 50, top: 150, display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={title}><div style={{ fontFamily: serif, fontSize: 56, lineHeight: 1.05, color: C.ink, letterSpacing: -1 }}>{TITLES[code.id]}</div></div>
          {code.cues.slice(0, cur + 1).slice(-2).map((c, k, arr) => {
            const isLast = k === arr.length - 1;
            const idx = cur - (arr.length - 1 - k);
            const age = t - scene.lines[idx].at;
            const o = interpolate(age, [0, 0.4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            return (
              <div key={idx} style={{ display: "flex", gap: 18, opacity: isLast ? o : 0.38 }}>
                <div style={{ width: 8, borderRadius: 4, background: isLast ? C.orange : C.line, flexShrink: 0 }} />
                <div style={{ fontFamily: sans, fontSize: 30, lineHeight: 1.3, color: C.ink }}>{c.text}</div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </Fade>
  );
};
const TITLES: Record<string, string> = {
  codepri: "Who goes first, and on what.",
  codefit: "Does it fit? If not, why.",
  codesync: "Offline sync, safely.",
  codeguard: "One line per role.",
};

// ---- repo map ----
const PARTS = [
  { path: "apps/web", head: "Web app", items: ["Next.js 15, TypeScript, Tailwind", "app/: dispatcher, loader, driver, store", "lib/driver/: IndexedDB outbox, PIN, sync", "lib/i18n/: English, Sinhala, Tamil"] },
  { path: "services/api", head: "API", items: ["FastAPI, SQLAlchemy, Alembic", "routers/: one per role", "services/: planning, live, demand", "seed/: reference CSVs and the demo day"] },
  { path: "packages/allocation", head: "Plan engine", items: ["Pure Python, no dependencies", "rules, allocator, trip_time, schedule", "Same code in the API and the tests", "Checked against check_allocation.py"] },
];
export const CODEMAP_CUES = [
  "Three parts, one repo: a Next.js web app, a FastAPI service, and a pure-Python plan engine.",
  "The web app holds the four role areas and the driver's offline engine. The API has one router per role.",
  "The plan engine has no dependencies, so the same code runs in the API, in the tests and in the data notebook.",
];
export const CodeMapView: React.FC<{ scene: Scene }> = ({ scene }) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  let cur = 0;
  scene.lines.forEach((l, i) => { if (l.at <= t + 0.05) cur = i; });
  const focus = [-1, 1, 2][cur] ?? -1; // which part the caption is about
  return (
    <Fade>
      <AbsoluteFill style={{ background: C.bg, padding: "70px 120px 110px", justifyContent: "center" }}>
        <div style={useAppear(0)}><div style={{ fontFamily: mono, fontSize: 24, letterSpacing: 2.4, textTransform: "uppercase", color: C.orange }}>Code walkthrough · the repo</div></div>
        <div style={{ ...useAppear(6), marginTop: 18, fontFamily: serif, fontSize: 84, lineHeight: 1.05, letterSpacing: -2, color: C.ink }}>Three parts, one repo.</div>
        <div style={{ display: "flex", gap: 28, marginTop: 56 }}>
          {PARTS.map((p, i) => (
            <div key={p.path} style={{ ...useAppear(20 + i * 14), flex: 1, background: C.surface, border: `2px solid ${focus === i ? C.orange : C.line}`, borderRadius: 20, padding: "28px 32px", opacity: focus === -1 || focus === i ? 1 : 0.55 }}>
              <div style={{ fontFamily: mono, fontSize: 22, color: C.orange }}>{p.path}</div>
              <div style={{ fontFamily: serif, fontSize: 56, color: C.ink, marginTop: 6 }}>{p.head}</div>
              {p.items.map((x) => <div key={x} style={{ fontFamily: sans, fontSize: 26, color: C.muted, marginTop: 12 }}>{x}</div>)}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 44, display: "flex", gap: 18, minHeight: 110 }}>
          <div style={{ width: 8, borderRadius: 4, background: C.orange }} />
          <div style={{ fontFamily: sans, fontSize: 34, lineHeight: 1.3, color: C.ink, maxWidth: 1500 }}>{CODEMAP_CUES[cur]}</div>
        </div>
      </AbsoluteFill>
    </Fade>
  );
};
