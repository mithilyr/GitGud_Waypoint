import { session, finish, sleep, BASE } from "./lib.mjs";
export async function driverSegment(b, name = "f_driver", shots = false) {
  const d = await session(b, name, { phone: true });
  const snap = async (n) => { if (shots) await d.screenshot({ path: `shots/${name}_${n}.png` }); };
  await d.goto(BASE + "/"); await sleep(1200);
  await d.type("input[type=email]", "driver@waypoint.demo", { delay: 35 });
  await d.type("input[type=password]", "waypoint2026", { delay: 35 });
  await sleep(300); await d.keyboard.press("Enter"); await sleep(3000);
  const pin = async () => { for (const c of "1234") { await d.getByRole("button", { name: c, exact: true }).click(); await sleep(260); } await sleep(1700); };
  await pin(); await pin(); await sleep(1500);
  await d.getByRole("button", { name: "Trip 2 · Kandy" }).click(); await sleep(1500);
  const chk = d.getByRole("button", { name: "Tyres, lights and doors" });
  if (await chk.count()) { await chk.click(); await sleep(1200); await d.getByRole("button", { name: /Start trip 2/ }).click(); await sleep(2200); }
  await snap("1_started");
  // offline
  await d.getByRole("button", { name: "Help", exact: true }).click(); await sleep(1500); await snap("2_help");
  await d.getByRole("button", { name: /^Settings/ }).first().click(); await sleep(1500);
  await d.getByRole("switch", { name: /Simulate no signal/ }).click(); await sleep(1800); await snap("3_offline");
  await d.getByRole("button", { name: "Stops", exact: true }).click(); await sleep(1500);
  await d.locator("button", { hasText: "Pilimathalawa" }).first().click(); await sleep(1500);
  await d.getByRole("button", { name: "I've arrived" }).click(); await sleep(1800); await snap("4_arrived");
  await d.getByRole("button", { name: /Mark delivered/ }).click(); await sleep(1800); await snap("5_deliver");
  return { d, snap };
}

export async function deliverPartial(d, snap) {
  await d.getByRole("button", { name: "Partial", exact: true }).click(); await sleep(1500); await snap("6_partial");
}

export async function finishDelivery(d, snap) {
  await d.getByRole("button", { name: "One fewer Dairy" }).click(); await sleep(900);
  const sig = d.locator("canvas").first();
  const box = await sig.boundingBox();
  if (box) {
    await d.mouse.move(box.x + 30, box.y + box.height / 2);
    await d.mouse.down();
    for (let i = 0; i < 14; i++) await d.mouse.move(box.x + 30 + i * 14, box.y + box.height / 2 + Math.sin(i) * 20, { steps: 3 });
    await d.mouse.up();
  }
  await d.type('input[placeholder="Received by (name)"]', "S. Perera", { delay: 45 }); await sleep(700);
  await snap("7_filled");
  await d.getByRole("button", { name: "Save stop" }).click(); await sleep(2500); await snap("8_saved");
  await d.getByRole("button", { name: /^Sync/ }).click(); await sleep(2500); await snap("9_sync_offline");
}
export async function backOnline(d, snap) {
  await d.getByRole("button", { name: "Help", exact: true }).click(); await sleep(1000);
  await d.getByRole("button", { name: /^Settings/ }).first().click(); await sleep(1200);
  await d.getByRole("switch", { name: /Simulate no signal/ }).click(); await sleep(1500);
  await d.getByRole("button", { name: /^Sync/ }).click(); await sleep(4500); await snap("10_sync_online");
}
