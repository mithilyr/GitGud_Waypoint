import React from "react";
import { AbsoluteFill, Freeze, OffthreadVideo, Sequence, staticFile, useCurrentFrame, interpolate } from "remotion";
import type { Scene } from "../schedule";
import { C, FPS, mono, sans, serif } from "../theme";
import { Fade, useAppear } from "./Fade";

export type Cue = { at: number; text: string };
export type Clip = {
  id: string;
  src: string;
  from: number;
  to: number;
  rate: number;
  device: "phone" | "desktop";
  step: number; // 0..4 index into STEPS, -1 for none
  role: string;
  title: string;
  cues: Cue[];
};
export const STEPS = ["Order", "Plan", "Load", "Deliver", "Receipt"];

// Piecewise-linear time warp: the moment a caption's action happens on screen is lined up with the moment
// its sentence is spoken. Between anchors the recording plays at a constant (clamped) rate.
type Seg = { dstFrom: number; dstFrames: number; srcFrom: number; rate: number; lastFrame: number };
const MIN_RATE = 0.4, MAX_RATE = 3.5;
export const warp = (clip: Clip, scene: Scene): Seg[] => {
  const D = scene.frames / FPS;
  const anchors: [number, number][] = [[0, clip.from]];
  scene.lines.forEach((l, i) => {
    if (i === 0) return;
    const prev = anchors[anchors.length - 1][0];
    anchors.push([Math.max(prev + 0.6, l.at - 0.35), clip.cues[i].at]);
  });
  anchors.push([D, clip.to]);
  const segs: Seg[] = [];
  for (let k = 0; k < anchors.length - 1; k++) {
    const [d0, s0] = anchors[k], [d1, s1] = anchors[k + 1];
    const dst = Math.max(0.1, d1 - d0), src = Math.max(0.1, s1 - s0);
    const rate = Math.min(MAX_RATE, Math.max(MIN_RATE, src / dst));
    segs.push({ dstFrom: Math.round(d0 * FPS), dstFrames: Math.max(1, Math.round(dst * FPS)), srcFrom: Math.round(s0 * FPS), rate, lastFrame: Math.max(0, Math.floor((src * FPS) / rate) - 1) });
  }
  return segs;
};

const StepChips: React.FC<{ active: number }> = ({ active }) => (
  <div style={{ display: "flex", gap: 10, alignItems: "center", fontFamily: mono, fontSize: 20, letterSpacing: 1.2, textTransform: "uppercase" }}>
    {STEPS.map((s, i) => (
      <React.Fragment key={s}>
        <span style={{ padding: "8px 16px", borderRadius: 999, background: i === active ? C.ink : "transparent", color: i === active ? "#fff" : i < active ? C.ink : C.muted, border: `1.5px solid ${i <= active ? C.ink : C.line}` }}>{s}</span>
        {i < STEPS.length - 1 && <span style={{ width: 14, height: 2, background: C.line }} />}
      </React.Fragment>
    ))}
  </div>
);

const SegVideo: React.FC<{ src: string; seg: Seg }> = ({ src, seg }) => {
  const f = useCurrentFrame();
  return (
    <Freeze frame={Math.min(f, seg.lastFrame)}>
      <OffthreadVideo src={staticFile(`clips/${src}.mp4`)} startFrom={seg.srcFrom} playbackRate={seg.rate} muted style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
    </Freeze>
  );
};

export const ClipScene: React.FC<{ clip: Clip; scene: Scene }> = ({ clip, scene }) => {
  const frame = useCurrentFrame();
  const t = frame / FPS; // scene seconds; captions follow the narration
  const segs = warp(clip, scene);
  const phone = clip.device === "phone";
  const mediaH = phone ? 940 : 800;
  const mediaW = phone ? Math.round((mediaH * 390) / 844) : Math.round((mediaH * 1440) / 900);
  const shown = clip.cues.filter((_, i) => scene.lines[i].at <= t + 0.05);
  const visible = shown.slice(-3);
  const titleStyle = useAppear(2);
  return (
    <Fade>
      <AbsoluteFill style={{ background: C.bg }}>
        {/* media */}
        <div style={{ position: "absolute", left: phone ? 400 : 50, top: phone ? 70 : 140, width: mediaW, height: mediaH, borderRadius: phone ? 46 : 18, overflow: "hidden", boxShadow: "0 40px 90px rgba(20,35,31,.22), 0 0 0 " + (phone ? "12px #14231f" : "1.5px " + C.line), background: "#fff" }}>
          {segs.map((sg, i) => <Sequence key={i} from={sg.dstFrom} durationInFrames={sg.dstFrames}><SegVideo src={clip.src} seg={sg} /></Sequence>)}
        </div>
        {!phone && <div style={{ position: "absolute", left: 50, top: 86, fontFamily: mono, fontSize: 20, color: C.muted, letterSpacing: 1.4, textTransform: "uppercase" }}>{clip.role} · desktop</div>}
        {/* text column */}
        <div style={{ position: "absolute", left: phone ? 960 : 1370, right: phone ? 80 : 50, top: phone ? 120 : 140, bottom: 80, display: "flex", flexDirection: "column", gap: 28 }}>
          {phone ? <StepChips active={clip.step} /> : <div style={{ fontFamily: mono, fontSize: 16, letterSpacing: 1.2, textTransform: "uppercase", display: "flex", flexWrap: "wrap", gap: 8 }}>{STEPS.map((s, i) => <span key={s} style={{ padding: "6px 12px", borderRadius: 999, background: i === clip.step ? C.ink : "transparent", color: i === clip.step ? "#fff" : C.muted, border: `1.5px solid ${i <= clip.step ? C.ink : C.line}` }}>{s}</span>)}</div>}
          <div style={titleStyle}>
            {phone && <div style={{ fontFamily: mono, fontSize: 22, color: C.orange, letterSpacing: 1.6, textTransform: "uppercase", marginBottom: 14 }}>{clip.role} · phone</div>}
            <div style={{ fontFamily: serif, fontSize: phone ? 78 : 56, lineHeight: 1.05, color: C.ink, letterSpacing: -1 }}>{clip.title}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 20, marginTop: 8 }}>
            {visible.map((c, i) => {
              const isLast = i === visible.length - 1;
              const age = t - scene.lines[clip.cues.indexOf(c)].at;
              const o = interpolate(age, [0, 0.4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
              return (
                <div key={c.at} style={{ display: "flex", gap: 18, opacity: isLast ? o : 0.38, transform: `translateY(${isLast ? (1 - o) * 14 : 0}px)` }}>
                  <div style={{ width: 8, borderRadius: 4, background: isLast ? C.orange : C.line, flexShrink: 0 }} />
                  <div style={{ fontFamily: sans, fontSize: phone ? 36 : 30, lineHeight: 1.3, color: C.ink, fontWeight: 400 }}>{c.text}</div>
                </div>
              );
            })}
          </div>
        </div>
      </AbsoluteFill>
    </Fade>
  );
};
