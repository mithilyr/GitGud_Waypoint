import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "path";
import fs from "fs";
// Uses the Chromium headless shell that ships with Playwright (set REMOTION_BROWSER to override),
// because remotion.media may be unreachable from locked-down networks.
const browserExecutable = process.env.REMOTION_BROWSER || undefined;
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const chromiumOptions = { gl: "swangle" };
const composition = await selectComposition({ serveUrl, id: "Main", browserExecutable, chromiumOptions });
fs.mkdirSync("out", { recursive: true });
let last = -1;
await renderMedia({
  composition, serveUrl, browserExecutable, chromiumOptions,
  codec: "h264", crf: 18, pixelFormat: "yuv420p", concurrency: 4,
  outputLocation: "out/waypoint-demo-vo.mp4",
  onProgress: ({ progress }) => { const p = Math.floor(progress * 100); if (p !== last && p % 5 === 0) { last = p; console.log("render", p + "%"); } },
});
console.log("RENDER DONE");
