// Spoken lines for the scenes that are not screen recordings: [seconds into the scene, text].
export const SCENE_LINES: Record<string, [number, string][]> = {
  title: [[1.5, "This is Waypoint, our hackathon build for Waypoint Group. It takes a delivery from the store's order to the signed receipt."]],
  problem: [
    [0.5, "Waypoint Group delivers across Sri Lanka, and one delivery day involves four roles: the dispatcher, the loader, the driver and the store manager."],
    [8, "The data covers a hundred and twenty outlets and sixty vehicles. On our seeded Monday, fifty-eight Kandy orders are queued, and the four Kandy reefer trucks are in the workshop."],
    [14.5, "Demand exceeds capacity. Something has to wait, and the store should hear why before the truck leaves."],
  ],
  flow: [[0.5, "So Waypoint keeps one shared record, from order, to plan, to load, to delivery, to receipt. Here is the real app, run end to end."]],
  arch: [
    [0.5, "Under the hood, a Next.js web app talks only to its own origin, which forwards to a FastAPI service backed by PostgreSQL."],
    [6, "One docker compose command starts the database, runs migrations, loads the reference data and queues a delivery day."],
    [12, "Passwords and PINs are hashed, every route checks the caller's role, and a store only ever sees its own outlet."],
  ],
  alloc: [
    [0.5, "The plan engine proposes; the dispatcher decides. It scores priority first, so an outlet skipped last run always goes first."],
    [6, "It places the biggest orders on the smallest legal vehicle, checking weight, volume, reefer needs, van-only outlets, mall windows, trip limits and fuel quota every time."],
    [14, "Anything left over is deferred with a reason the store can read, and the plan is re-validated on every edit."],
  ],
  offline: [
    [0.5, "The driver app is offline-first. Every action lands on the phone first, queued with its own ID and the time it happened."],
    [6, "Sync is safe to retry, conflicts are kept side by side, and a PIN opens the app with no signal at all."],
  ],
  fidelity: [
    [0.5, "We built from our Designathon file: the dispatcher, loader, driver and store screens, in the Daylight and Dark systems."],
    [7, "Every departure from the design is written down with its reason, and we say plainly what we left out and where the build falls short."],
  ],
  proof: [
    [0.5, "The allocation engine, the API and the web app have automated tests, and one test walks order, plan, load, deliver and receipt through the whole system."],
    [8, "We used Claude Code to write much of the code under our direction. We chose the scope and every departure, we review what we present, and every use is logged in our AI disclosure."],
  ],
  outro: [[0.5, "Waypoint: order, plan, load, deliver, receipt. Try the live demo or read the code, links on screen. Thank you."]],
};
