import React from "react";
import { AbsoluteFill, OffthreadVideo, staticFile, useCurrentFrame, interpolate } from "remotion";
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
export const clipFrames = (c: Clip) => Math.round(((c.to - c.from) / c.rate) * FPS);

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

export const ClipScene: React.FC<{ clip: Clip }> = ({ clip }) => {
  const frame = useCurrentFrame();
  const t = clip.from + (frame / FPS) * clip.rate; // source seconds
  const phone = clip.device === "phone";
  const mediaH = phone ? 940 : 800;
  const mediaW = phone ? Math.round((mediaH * 390) / 844) : Math.round((mediaH * 1440) / 900);
  const shown = clip.cues.filter((c) => c.at <= t + 0.05);
  const visible = shown.slice(-3);
  const titleStyle = useAppear(2);
  return (
    <Fade>
      <AbsoluteFill style={{ background: C.bg }}>
        {/* media */}
        <div style={{ position: "absolute", left: phone ? 400 : 50, top: phone ? 70 : 140, width: mediaW, height: mediaH, borderRadius: phone ? 46 : 18, overflow: "hidden", boxShadow: "0 40px 90px rgba(20,35,31,.22), 0 0 0 " + (phone ? "12px #14231f" : "1.5px " + C.line), background: "#fff" }}>
          <OffthreadVideo src={staticFile(`clips/${clip.src}.mp4`)} startFrom={Math.round(clip.from * FPS)} endAt={Math.round(clip.to * FPS)} playbackRate={clip.rate} muted style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
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
              const age = (t - c.at) * (1 / clip.rate);
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
