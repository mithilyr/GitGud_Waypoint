import { launch, session, finish, login, sleep, BASE } from "./lib.mjs";
import { prep, quickRelease, resetDemo, tok, call } from "./api.mjs";
import { driverSegment, deliverPartial, finishDelivery, backOnline } from "./driver.mjs";
const only = process.argv.slice(2);
const want = (n) => !only.length || only.includes(n);
const b = await launch();
async function seg(name, opts, fn) {
  const p = await session(b, name, opts);
  try { await fn(p); } finally { await finish(p); }
  console.log("done", name);
}
const click = async (p, loc, wait = 1500) => { await loc.click(); await sleep(wait); };

if (want("a")) {
  await resetDemo();
  await seg("a_store", { phone: true }, async (p) => {
    await login(p, "store@waypoint.demo"); await sleep(2500);
    await p.mouse.move(200, 600); await p.mouse.wheel(0, 250); await sleep(1200); await p.mouse.wheel(0, -250); await sleep(800);
    await click(p, p.getByRole("button", { name: "Place order" }), 4500);
  });
}
if (want("b")) {
  await seg("b_disp", {}, async (p) => {
    await login(p, "dispatcher@waypoint.demo"); await sleep(2500);
    await p.mouse.move(700, 500); await p.mouse.wheel(0, 400); await sleep(1500); await p.mouse.wheel(0, -400); await sleep(800);
    await click(p, p.getByText(/View items/).first(), 2500);
    await p.keyboard.press("Escape"); await sleep(600);
    await click(p, p.getByRole("button", { name: /Build Monday/ }), 6000);
    await p.mouse.move(700, 400); await p.mouse.wheel(0, 300); await sleep(2500);
    await click(p, p.getByRole("button", { name: /Release plan/ }), 3500);
  });
  await quickRelease(1);
}
const openTrip2 = async (p) => {
  await login(p, "loader@waypoint.demo"); await sleep(1800);
  await click(p, p.locator("button", { hasText: "VEH041" }).filter({ hasText: "Kandy" }).first(), 2200);
};
if (want("c")) {
  await seg("c_load1", { phone: true }, async (p) => {
    await openTrip2(p);
    await click(p, p.getByRole("button", { name: "Load all" }).first(), 1500);
    await click(p, p.locator(`button[aria-label^="Flag "]:visible`).first(), 2000);
    await click(p, p.getByRole("button", { name: "Send flag" }), 2800);
    for (let i = 0; i < 12; i++) { const n = await p.getByRole("button", { name: "Load all" }).count(); if (!n) break; await click(p, p.getByRole("button", { name: "Load all" }).first(), 700); }
    await sleep(2500);
  });
}
if (want("d")) {
  await seg("d_flag", {}, async (p) => {
    await login(p, "dispatcher@waypoint.demo"); await sleep(1000);
    await click(p, p.getByRole("link", { name: "Live" }).or(p.getByText("Live", { exact: true })).first(), 4500);
    await click(p, p.getByRole("button", { name: /Send as is/ }).first(), 3000);
  });
}
if (want("e")) {
  await seg("e_release", { phone: true }, async (p) => {
    await openTrip2(p);
    await sleep(2000);
    await click(p, p.getByRole("button", { name: /^Release/ }), 3500);
    await click(p, p.getByRole("button", { name: /^Release VEH041/ }), 4000);
  });
}
if (want("f")) {
  const p = await session(b, "f_driver", { phone: true });
  // driverSegment creates its own session; close the unused one
  await p.__ctx.close();
  const { d, snap } = await driverSegment(b, "f_driver");
  try { await deliverPartial(d, snap); await finishDelivery(d, snap); await backOnline(d, snap); await sleep(2000); } finally { await finish(d); }
}
if (want("g")) {
  await seg("g_store", { phone: true }, async (p) => {
    await login(p, "store@waypoint.demo"); await sleep(1500);
    await click(p, p.locator("a:visible,button:visible").filter({ hasText: /^Track$/ }).first(), 3500);
    await sleep(1500);
    await click(p, p.getByRole("button", { name: "One more Dairy" }), 1500);
    await click(p, p.getByRole("button", { name: "Confirm receipt" }), 3500);
  });
}
if (want("h")) {
  await seg("h_resolve", {}, async (p) => {
    await login(p, "dispatcher@waypoint.demo"); await sleep(800);
    await click(p, p.getByRole("link", { name: "Live" }).or(p.getByText("Live", { exact: true })).first(), 5000);
    await p.screenshot({ path: "shots/h_live.png" });
    console.log(await p.locator("button").evaluateAll(e=>e.map(x=>x.innerText.trim().replace(/\n/g," ").slice(0,50)).filter(Boolean)));
    await click(p, p.getByRole("button", { name: /^Accept/ }).first(), 3500);
  });
}
if (want("i")) {
  await seg("i_demand", {}, async (p) => {
    await login(p, "dispatcher@waypoint.demo"); await sleep(800);
    await click(p, p.getByRole("link", { name: "Demand" }).or(p.getByText("Demand", { exact: true })).first(), 5000);
    await p.mouse.move(700, 500); await p.mouse.wheel(0, 300); await sleep(3000);
  });
}
if (want("j")) {
  await seg("j_lang", { phone: true }, async (p) => {
    await p.goto(BASE + "/"); await sleep(2000);
    await click(p, p.locator("button", { hasText: "ස" }).first(), 2200);
    await click(p, p.locator("button", { hasText: "த" }).first(), 2200);
    await click(p, p.locator("button", { hasText: /^E$/ }).first(), 1200);
    await login(p, "store@waypoint.demo"); await sleep(1500);
    await p.locator('a[href*="settings"]:visible, button[aria-label*="ettings"]:visible').first().click(); await sleep(2000);
    await click(p, p.getByRole("switch", { name: /Dark mode/ }), 2500);
    await p.screenshot({ path: "shots/j_dark.png" });
  });
}
await b.close();
