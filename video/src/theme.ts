import { continueRender, delayRender, staticFile } from "remotion";
import fontIndex from "../public/fonts/index.json";

// Fonts are bundled in public/fonts (downloaded once from Google Fonts: Newsreader, Geist, Geist Mono, all OFL).
// Loading them locally keeps rendering independent of the network.
const FONTS: { family: string; style: string; weight: string; file: string }[] = fontIndex;
if (typeof document !== "undefined") {
  const handle = delayRender("fonts");
  Promise.all(
    FONTS.map((f) => {
      const face = new FontFace(f.family, `url(${staticFile("fonts/" + f.file)}) format("woff2")`, { style: f.style, weight: f.weight });
      return face.load().then((l) => document.fonts.add(l));
    }),
  ).then(() => continueRender(handle)).catch(() => continueRender(handle));
}

export const serif = "Newsreader, Georgia, serif";
export const sans = "Geist, system-ui, sans-serif";
export const mono = '"Geist Mono", ui-monospace, monospace';

// Taken from the app's Daylight / Dark tokens (apps/web/app/globals.css) and the logo.
export const C = {
  bg: "#f7f6f3",
  surface: "#ffffff",
  ink: "#111111",
  mark: "#14231f",
  muted: "#6a6864",
  line: "#e4e2dc",
  orange: "#b5562b",
  okBg: "#edf3ec",
  okFg: "#346538",
  warnBg: "#fbf3db",
  warnFg: "#956400",
  night: "#131211",
  nightSurface: "#1c1b19",
  nightText: "#f2f0eb",
  nightMuted: "#a3a19c",
};
export const FPS = 30;
export const W = 1920;
export const H = 1080;
