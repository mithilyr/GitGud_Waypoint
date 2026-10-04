import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "path";
import fs from "fs";
const frames = process.argv.slice(2).map(Number);
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const browserExecutable = "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell";
const comp = await selectComposition({ serveUrl, id: "Main", browserExecutable, chromiumOptions: { gl: "swangle" } });
fs.mkdirSync("stills", { recursive: true });
for (const f of frames) { await renderStill({ composition: comp, serveUrl, browserExecutable, chromiumOptions: { gl: "swangle" }, frame: f, output: `stills/f${f}.png` }); console.log("still", f); }
