import voice from "./voice.json";
import { CLIPS } from "./data";
import { SCENE_LINES } from "./narration";
import { FPS } from "./theme";

// The timeline is driven by the voiceover: every scene lasts as long as its spoken lines need.
export const ORDER = ["title", "problem", "flow", "store", "plan", "load", "decide", "release", "drive", "receipt", "resolve", "demand", "lang", "arch", "alloc", "offline", "fidelity", "proof", "outro"] as const;
export type SceneId = (typeof ORDER)[number];

// Frames the non-recording scenes were designed for; their animations are stretched by (actual / designed).
const DESIGNED: Record<string, number> = { title: 210, problem: 540, flow: 210, arch: 540, alloc: 570, offline: 420, fidelity: 480, proof: 510, outro: 300 };
const PRE: Record<string, number> = { title: 3.9, outro: 0.8 };
const POST: Record<string, number> = { outro: 3.2, proof: 1.4 };
const GAP = 0.5;

export type VoiceLine = { idx: number; text: string; at: number; dur: number }; // at: seconds from scene start
export type Scene = { id: SceneId; start: number; frames: number; lines: VoiceLine[]; scale: number };

const voiceDur = (i: number) => (voice as Record<string, number>)[String(i)];

export const SCENES: Scene[] = (() => {
  let g = 0, start = 0;
  return ORDER.map((id) => {
    const clip = CLIPS.find((c) => c.id === id);
    const texts: string[] = clip ? clip.cues.map((c) => c.text) : (SCENE_LINES[id] ?? []).map((l) => l[1]);
    const pre = PRE[id] ?? 0.6, post = POST[id] ?? 0.9;
    let t = pre;
    const lines = texts.map((text, k) => {
      const idx = g + k, dur = voiceDur(idx);
      const l = { idx, text, at: t, dur };
      t += dur + GAP;
      return l;
    });
    g += texts.length;
    let secs = t - GAP + post;
    if (clip) secs = Math.max(secs, (clip.to - clip.from) / 2.5);
    const frames = Math.ceil(secs * FPS);
    const s: Scene = { id, start, frames, lines, scale: DESIGNED[id] && id !== "title" ? frames / DESIGNED[id] : 1 };
    start += frames;
    return s;
  });
})();
export const TOTAL = SCENES.reduce((n, s) => n + s.frames, 0);
export const sceneOf = (id: string) => SCENES.find((s) => s.id === id)!;
