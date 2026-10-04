import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { CLIPS } from "./data";
import { ClipScene, clipFrames } from "./components/ClipScene";
import { AllocScene, ArchScene, FidelityScene, FlowScene, OfflineScene, OutroScene, ProblemScene, ProofScene, TitleScene } from "./components/Scenes";

type Item = { id: string; frames: number; node: React.ReactNode };
const clip = (id: string): Item => {
  const c = CLIPS.find((x) => x.id === id)!;
  return { id, frames: clipFrames(c), node: <ClipScene clip={c} /> };
};
export const TIMELINE: Item[] = [
  { id: "title", frames: 210, node: <TitleScene /> },
  { id: "problem", frames: 540, node: <ProblemScene /> },
  { id: "flow", frames: 210, node: <FlowScene /> },
  clip("store"), clip("plan"), clip("load"), clip("decide"), clip("release"), clip("drive"), clip("receipt"), clip("resolve"), clip("demand"), clip("lang"),
  { id: "arch", frames: 540, node: <ArchScene /> },
  { id: "alloc", frames: 570, node: <AllocScene /> },
  { id: "offline", frames: 420, node: <OfflineScene /> },
  { id: "fidelity", frames: 480, node: <FidelityScene /> },
  { id: "proof", frames: 510, node: <ProofScene /> },
  { id: "outro", frames: 300, node: <OutroScene /> },
];
export const TOTAL = TIMELINE.reduce((n, t) => n + t.frames, 0);

export const Main: React.FC = () => {
  let at = 0;
  return (
    <AbsoluteFill style={{ background: "#f7f6f3" }}>
      <Audio src={staticFile("audio/music.m4a")} volume={0.79} />
      {TIMELINE.map((t) => {
        const from = at; at += t.frames;
        return <Sequence key={t.id} from={from} durationInFrames={t.frames}>{t.node}</Sequence>;
      })}
    </AbsoluteFill>
  );
};
