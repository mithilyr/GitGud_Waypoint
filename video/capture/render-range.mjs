import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "path";
// node capture/render-range.mjs name:from:to ...   (inclusive frames; writes out/seg_<name>.mp4)
const browserExecutable = process.env.REMOTION_BROWSER || undefined;
const chromiumOptions = { gl: "swangle" };
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const composition = await selectComposition({ serveUrl, id: "Main", browserExecutable, chromiumOptions });
for (const spec of process.argv.slice(2)) {
  const [name, a, b] = spec.split(":");
  await renderMedia({ composition, serveUrl, browserExecutable, chromiumOptions, codec: "h264", crf: 18, pixelFormat: "yuv420p", concurrency: 4, frameRange: [Number(a), Number(b)], outputLocation: `out/seg_${name}.mp4` });
  console.log("segment", name);
}
console.log("RANGES DONE");
