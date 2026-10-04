import { describe, expect, it } from "vitest";
import { applyLocal, type Run } from "./engine";
import type { OutboxEvent } from "./idb";

const run: Run = {
  server_time: "2026-10-05T03:00:00+05:30",
  driver: { id: 1, name: "Nuwan Perera", code: "DRV-0142" },
  vehicle: { id: "VEH057", kind: "Reefer van", temp: "reefer" },
  dispatcher: null,
  date: "2026-10-05",
  depot: "Kandy",
  trips: [
    {
      trip_id: 7,
      trip_no: 1,
      brand: "Fresh",
      district: "Kandy",
      status: "released",
      depart: "03:30",
      checks: {
        load_released: true,
        released_by: "Kamal",
        released_at: null,
        dock: "Dock 3",
        reefer_temp: 3,
        seal_no: null,
        chilled: true,
      },
      stops: [
        {
          id: 70,
          seq: 1,
          name: "Kundasale",
          district: "Kandy",
          eta: "03:46",
          window_open: "05:00",
          window_close: "07:30",
          access: "street",
          mall_window: null,
          status: "pending",
          removed: false,
          late_risk: 0,
          items: [
            {
              group: "Dairy",
              unit: "crate",
              temp: "chilled",
              planned: 2,
              expected: 2,
              flag: null,
            },
          ],
          delivery: null,
          arrived_at: null,
          done_at: null,
        },
      ],
    },
  ],
  fuel: null,
  notices: [],
  conflicts: [],
};

const event = (
  kind: OutboxEvent["kind"],
  extra: Partial<OutboxEvent> = {},
): OutboxEvent =>
  ({
    client_uuid: "u",
    kind,
    trip_id: 7,
    stop_id: 70,
    device_ts: "2026-10-05T05:00:00+05:30",
    state: "waiting",
    payload: {},
    ...extra,
  }) as OutboxEvent;

describe("offline engine: applyLocal", () => {
  it("starting a released trip moves it out", () => {
    const next = applyLocal(run, event("trip_start"));
    expect(next.trips[0].status).toBe("out");
    expect(run.trips[0].status).toBe("released"); // the input is not mutated
  });

  it("arriving marks the stop arrived, and only once", () => {
    const once = applyLocal(run, event("arrive"));
    expect(once.trips[0].stops[0].status).toBe("arrived");
    const twice = applyLocal(once, event("arrive"));
    expect(twice.trips[0].stops[0].arrived_at).toBe(
      once.trips[0].stops[0].arrived_at,
    );
  });

  it("a short count makes the delivery partial and completes the trip when the last stop closes", () => {
    const delivered = applyLocal(
      run,
      event("deliver", {
        payload: {
          outcome: "delivered",
          items: [{ group: "Dairy", handed: 1 }],
        },
      }),
    );
    expect(delivered.trips[0].stops[0].status).toBe("partial");
    expect(delivered.trips[0].status).toBe("completed");
  });
});
