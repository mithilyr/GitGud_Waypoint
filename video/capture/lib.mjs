import { chromium } from "playwright-core";
import fs from "fs";
export const BASE = "http://localhost:3000";
export const PW = "waypoint2026";
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export async function launch() {
  return chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
}
// One recorded context per role/segment. Videos land in raw/<name>.webm
export async function session(browser, name, { phone = false } = {}) {
  fs.mkdirSync("raw", { recursive: true });
  const size = phone ? { width: 390, height: 844 } : { width: 1440, height: 900 };
  const ctx = await browser.newContext({
    viewport: size,
    deviceScaleFactor: phone ? 2 : 1,
    hasTouch: phone,
    recordVideo: { dir: `raw/_${name}`, size: phone ? { width: 780, height: 1688 } : size },
  });
  await ctx.addInitScript(() => {
    const mk = () => {
      const d = document.createElement("div");
      d.style.cssText = "position:fixed;z-index:2147483647;pointer-events:none;width:26px;height:26px;margin:-13px 0 0 -13px;border-radius:50%;background:rgba(193,90,45,.35);border:2px solid #c15a2d;transition:transform .12s,opacity .3s;left:-50px;top:-50px";
      document.documentElement.appendChild(d);
      const move = (x, y) => { d.style.left = x + "px"; d.style.top = y + "px"; };
      addEventListener("mousemove", (e) => move(e.clientX, e.clientY), true);
      addEventListener("mousedown", (e) => { move(e.clientX, e.clientY); d.style.transform = "scale(1.7)"; }, true);
      addEventListener("mouseup", () => { d.style.transform = "scale(1)"; }, true);
    };
    if (document.documentElement) mk(); else addEventListener("DOMContentLoaded", mk);
  });
  const page = await ctx.newPage();
  page.__name = name;
  page.__ctx = ctx;
  return page;
}
export async function finish(page) {
  const v = page.video();
  await page.__ctx.close();
  fs.renameSync(await v.path(), `raw/${page.__name}.webm`);
  fs.rmSync(`raw/_${page.__name}`, { recursive: true, force: true });
}
export async function login(page, email) {
  await page.goto(BASE + "/");
  await page.waitForSelector("input[type=email]");
  await sleep(800);
  await page.type("input[type=email]", email, { delay: 35 });
  await page.type("input[type=password]", PW, { delay: 35 });
  await sleep(300);
  await page.keyboard.press("Enter");
  await page.waitForURL((u) => !u.pathname.match(/^\/(login)?$/), { timeout: 20000 });
  await sleep(1500);
}
export async function reset() {
  const r = await fetch("http://localhost:8000/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "dispatcher@waypoint.demo", password: PW }) });
  const { token } = await r.json();
  const x = await fetch("http://localhost:8000/demo/reset", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
  console.log("reset", x.status);
}
