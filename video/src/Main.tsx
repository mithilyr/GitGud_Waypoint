import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { CLIPS } from "./data";
import { ClipScene } from "./components/ClipScene";
import { CodeMapView, CodeSceneView } from "./components/CodeScene";
import { CODE } from "./code";
import { ScaleContext } from "./components/Fade";
import { AllocScene, ArchScene, FidelityScene, FlowScene, OfflineScene, OutroScene, ProblemScene, ProofScene, TitleScene } from "./components/Scenes";
import { SCENES, TOTAL, type Scene } from "./schedule";

const CODE_SCENES = SCENES.filter((x) => x.id.startsWith("code"));
const CODE_START = CODE_SCENES[0].start, CODE_END = CODE_SCENES[CODE_SCENES.length - 1].start + CODE_SCENES[CODE_SCENES.length - 1].frames;
import { FPS } from "./theme";

export { TOTAL };
const VOICE_GAIN = 1.0;   // set from the measured loudness of public/voice (see README)
const MUSIC_GAIN = 0.28;  // music sits well under the voice

const body = (s: Scene): React.ReactNode => {
  const clip = CLIPS.find((c) => c.id === s.id);
  if (clip) return <ClipScene clip={clip} scene={s} />;
  const code = CODE.find((c) => c.id === s.id);
  if (code) return <CodeSceneView code={code} scene={s} />;
  if (s.id === "codemap") return <CodeMapView scene={s} />;
  switch (s.id) {
    case "title": return <TitleScene />;
    case "problem": return <ProblemScene />;
    case "flow": return <FlowScene />;
    case "arch": return <ArchScene />;
    case "alloc": return <AllocScene />;
    case "offline": return <OfflineScene />;
    case "fidelity": return <FidelityScene />;
    case "proof": return <ProofScene />;
    default: return <OutroScene />;
  }
};

export const Main: React.FC = () => (
  <AbsoluteFill style={{ background: "#f7f6f3" }}>
    <Audio src={staticFile("audio/music.m4a")} volume={(f) => {
      // No voice during the code walkthrough, so the music comes up a little there.
      const up = Math.min(1, Math.max(0, Math.min(f - CODE_START + 30, CODE_END - f + 30) / 30));
      return MUSIC_GAIN + (0.7 - MUSIC_GAIN) * up;
    }} />
    {SCENES.map((s) => (
      <Sequence key={s.id} from={s.start} durationInFrames={s.frames}>
        <ScaleContext.Provider value={s.scale}>{body(s)}</ScaleContext.Provider>
        {s.lines.filter((l) => l.voiced).map((l) => (
          <Sequence key={l.idx} from={Math.round(l.at * FPS)} durationInFrames={Math.ceil(l.dur * FPS) + 2}>
            <Audio src={staticFile(`voice/L${String(l.idx).padStart(2, "0")}.mp3`)} volume={VOICE_GAIN} />
          </Sequence>
        ))}
      </Sequence>
    ))}
  </AbsoluteFill>
);
