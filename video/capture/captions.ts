import fs from "fs";
import { TIMELINE } from "../src/Main";
import { CLIPS } from "../src/data";
import { SCENE_LINES } from "../src/narration";

const FPS = 30;
const tc = (s: number, srt = true) => {
  const ms = Math.round(s * 1000), h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), sec = Math.floor((ms % 60000) / 1000), r = ms % 1000;
  const p = (n: number, w = 2) => String(n).padStart(w, "0");
  return srt ? `${p(h)}:${p(m)}:${p(sec)},${p(r, 3)}` : `${m}:${p(sec)}`;
};
type Line = { at: number; end: number; text: string; scene: string };
const lines: Line[] = [];
let start = 0;
const starts: Record<string, number> = {};
for (const t of TIMELINE) {
  const s = start / FPS, dur = t.frames / FPS;
  starts[t.id] = s;
  const clip = CLIPS.find((c) => c.id === t.id);
  const raw: [number, string][] = clip
    ? clip.cues.map((c) => [(c.at - clip.from) / clip.rate, c.text] as [number, string])
    : SCENE_LINES[t.id] ?? [];
  raw.forEach(([rel, text], i) => {
    const nextRel = i + 1 < raw.length ? raw[i + 1][0] : dur - 0.3;
    lines.push({ at: s + rel, end: s + Math.max(rel + 1.5, nextRel - 0.1), text, scene: t.id });
  });
  start += t.frames;
}
fs.mkdirSync("out", { recursive: true });
fs.writeFileSync("out/waypoint-demo.srt", lines.map((l, i) => `${i + 1}\n${tc(l.at)} --> ${tc(l.end)}\n${l.text}\n`).join("\n"));

const TITLES: Record<string, string> = {
  title: "Waypoint", problem: "The problem", flow: "The answer", store: "Store manager orders", plan: "Dispatcher builds the plan", load: "Loader loads and flags", decide: "Dispatcher decides", release: "Loader releases", drive: "Driver delivers offline", receipt: "Store confirms receipt", resolve: "Two counts, nothing overwritten", demand: "Demand outlook", lang: "Languages and themes", arch: "Architecture", alloc: "The plan engine", offline: "Offline driver", fidelity: "Design fidelity", proof: "Tests and AI disclosure", outro: "Links",
};
let md = "# Waypoint demo video: timed script\n\nThe captions in the video carry this text. Record a voiceover from it, or paste the lines into an editor, if you want audio. Times are m:ss from the start.\n\n";
let cur = "";
for (const l of lines) {
  if (l.scene !== cur) { cur = l.scene; md += `\n## ${tc(starts[cur], false)} · ${TITLES[cur]}\n\n`; }
  md += `- **${tc(l.at, false)}** ${l.text}\n`;
}
fs.writeFileSync("out/narration.md", md);
const chapters = ["title", "problem", "store", "plan", "load", "release", "drive", "receipt", "demand", "arch", "alloc", "fidelity", "proof"];
const chapterTitle: Record<string, string> = { title: "Intro", problem: "The problem", store: "1. Store manager places the order", plan: "2. Dispatcher builds the plan", load: "3. Loader loads and flags a shortfall", release: "4. Release rules", drive: "5. Driver delivers with no signal", receipt: "6. Store confirms a different count", demand: "7. Demand outlook", arch: "Architecture", alloc: "The plan engine", fidelity: "Design fidelity", proof: "Tests and AI disclosure" };
const total = start / FPS;
fs.writeFileSync("out/youtube-description.md", `Waypoint: one system from the store's order to the signed receipt. Our Tech-Triathlon 2026 hackathon build (theme: The Intelligent Enterprise), team GitGud.

Four roles, one shared record: dispatcher, loader, driver (offline-first PWA) and store manager, in English, Sinhala and Tamil.

Live demo: https://waypoint-web-5ssl.onrender.com (first load can take a minute on the free tier; demo accounts are on the sign-in page)

Chapters
${chapters.map((c) => `${tc(starts[c], false).replace(/^0:/, "0:")} ${chapterTitle[c]}`).join("\n")}

Built with Claude Code under our direction. Every use is listed in docs/ai-disclosure.md.
Runtime: ${tc(total, false)}. Video made with Remotion from real screen recordings of the running app. Music is an original generated ambient track.
`);
console.log("captions", lines.length, "lines; total", total.toFixed(1) + "s");
