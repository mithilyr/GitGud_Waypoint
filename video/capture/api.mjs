const API = "http://localhost:8000";
export async function tok(email) {
  const r = await fetch(API + "/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password: "waypoint2026" }) });
  return (await r.json()).token;
}
export async function call(t, method, path, body) {
  const r = await fetch(API + path, { method, headers: { Authorization: `Bearer ${t}`, "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${method} ${path} ${r.status} ${JSON.stringify(j)}`);
  return j;
}
// Silently load and release a trip (used for trips that are not the one on screen).
export async function quickRelease(tripId) {
  const t = await tok("loader@waypoint.demo");
  const d = await call(t, "GET", `/loader/trips/${tripId}`);
  for (const s of d.stops) await call(t, "POST", `/loader/trips/${tripId}/stops/${s.stop_id}/load-all`);
  await call(t, "POST", `/loader/trips/${tripId}/release`, { reefer_temp: 3, zones_ok: true, seal_no: "KD-" + (40000 + tripId) });
}

const DAY = "2026-10-05";
export async function resetDemo() {
  const t = await tok("dispatcher@waypoint.demo");
  await call(t, "POST", "/demo/reset");
}
export async function prep(stage) {
  await resetDemo();
  const st = await tok("store@waypoint.demo");
  const lines = [{ sku: "MLK1", qty: 24 }, { sku: "DHL5", qty: 10 }];
  await call(st, "POST", "/store/orders", { lines });
  if (stage === "ordered") return;
  const dt = await tok("dispatcher@waypoint.demo");
  const board = await call(dt, "POST", "/dispatch/plan", { depot: "Kandy", date: DAY });
  await call(dt, "POST", `/dispatch/plan/${board.plan.id}/release`);
  if (stage === "released") return;
  await quickRelease(1); await quickRelease(2);
}
