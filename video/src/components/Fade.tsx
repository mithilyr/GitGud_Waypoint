import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

// Fades a scene in and out so scenes cross without hard cuts.
export const Fade: React.FC<{ children: React.ReactNode; inF?: number; outF?: number }> = ({ children, inF = 12, outF = 12 }) => {
  const f = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const o = interpolate(f, [0, inF, durationInFrames - outF, durationInFrames], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
};

export const useAppear = (delay = 0, dur = 18) => {
  const f = useCurrentFrame();
  const p = interpolate(f, [delay, delay + dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const e = 1 - Math.pow(1 - p, 3);
  return { opacity: e, transform: `translateY(${(1 - e) * 18}px)` } as React.CSSProperties;
};
