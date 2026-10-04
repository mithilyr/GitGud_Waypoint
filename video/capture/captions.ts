import fs from "fs";
import { SCENES, TOTAL } from "../src/schedule";

const FPS = 30;
const tc = (s: number, srt = true) => {
  const ms = Math.round(s * 1000), h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), sec = Math.floor((ms % 60000) / 1000), r = ms % 1000;
  const p = (n: number, w = 2) => String(n).padStart(w, "0");
  return srt ? `${p(h)}:${p(m)}:${p(sec)},${p(r, 3)}` : `${m}:${p(sec)}`;
};
// Captions follow the spoken lines exactly (see src/schedule.ts).
const lines = SCENES.flatMap((s) => s.lines.map((l) => ({ at: s.start / FPS + l.at, end: s.start / FPS + l.at + l.dur, text: l.text, scene: s.id })));
fs.mkdirSync("out", { recursive: true });
fs.writeFileSync("out/waypoint-demo.srt", lines.map((l, i) => `${i + 1}\n${tc(l.at)} --> ${tc(l.end)}\n${l.text}\n`).join("\n"));

const starts = Object.fromEntries(SCENES.map((s) => [s.id, s.start / FPS]));
const chapters = ["title", "problem", "store", "plan", "load", "release", "drive", "receipt", "demand", "arch", "alloc", "fidelity", "proof"];
const name: Record<string, string> = { title: "Intro", problem: "The problem", store: "1. Store manager places the order", plan: "2. Dispatcher builds the plan", load: "3. Loader loads and flags a shortfall", release: "4. Release rules", drive: "5. Driver delivers with no signal", receipt: "6. Store confirms a different count", demand: "7. Demand outlook", arch: "Architecture", alloc: "The plan engine", fidelity: "Design fidelity", proof: "Tests and AI disclosure" };
const total = TOTAL / FPS;
fs.writeFileSync("out/youtube-description.md", `Waypoint: one system from the store's order to the signed receipt. Our Tech-Triathlon 2026 hackathon build (theme: The Intelligent Enterprise), team GitGud.

Four roles, one shared record: dispatcher, loader, driver (offline-first PWA) and store manager, in English, Sinhala and Tamil.

Live demo: https://waypoint-web-5ssl.onrender.com (first load can take a minute on the free tier; demo accounts are on the sign-in page)

Chapters
${chapters.map((c) => `${tc(starts[c], false)} ${name[c]}`).join("\n")}

Built with Claude Code under our direction. Every use is listed in docs/ai-disclosure.md.
Runtime: ${tc(total, false)}. Made with Remotion from real screen recordings of the running app. Voiceover generated with ElevenLabs; music is an original generated ambient track.
`);
console.log("captions", lines.length, "lines; total", total.toFixed(1) + "s");
